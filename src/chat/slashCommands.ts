/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from "vscode";
import { type AgentRequest, type IAgentRequestHandler } from "./agent";
import { detectIntent } from "./intentDetection";

/**
 * A camel cased string that names the slash command. Will be used as the string that the user types to invoke the command.
 */
export type SlashCommandName = string;

export type ChatAgentResultMetadata = {
    /**
     * The chain of slash command handlers that were invoked to produce this result.
     */
    handlerChain: string[]
}

/**
 * The result of a slash command handler.
 */
export type SlashCommandHandlerResult = {
    /**
     * The VsCode chat agent result.
     */
    chatAgentResult: Omit<vscode.ChatAgentResult2, "metadata"> & { metadata?: ChatAgentResultMetadata },

    /**
     * Any follow-up messages to be given for this result.
     */
    followUp?: vscode.ChatAgentFollowup[],
} | undefined;

/**
 * A handler for a slash command.
 */
export type SlashCommandHandler = (request: AgentRequest) => Promise<SlashCommandHandlerResult>;

/**
 * The configuration for a slash command.
 */
export type SlashCommandConfig = {
    /**
     * A short sentence description of the slash command. Should give the user a good idea of what the command does.
     */
    shortDescription: string,
    /**
     * A longer sentence description of the slash command. Should make clear to the user when the command is appropriate to use.
     */
    longDescription: string,
    /**
     * A sentence description that helps copilot understand when the command should be used.
     */
    intentDescription?: string,

    handler: SlashCommandHandler
};

export type SlashCommand = [SlashCommandName, SlashCommandConfig];

export type SlashCommands = Map<string, SlashCommandConfig>;

export type FallbackSlashCommandHandlers = {
    /**
     * The slash command to use when the user doesn't provide any input. If a string, then
     * it is the name of the slash command to use. If a function, then it is the handler to use.
     */
    noInput?: SlashCommandHandler | string;

    /**
     * The slash command to use when the user provides input without a slash command specified and
     * intent detection cannot find a slash command to use. If a string, then it is the name of the
     * slash command to use. If a function, then it is the handler to use.
     */
    default?: SlashCommandHandler | string;
};

export type SlashCommmandOwnerOptions = {
    /**
     * If true, then intent detection will not be used to find a slash command to use in the case that
     * the user provides input without a slash command specified.
     */
    disableIntentDetection?: boolean;
};

export const defaultSlashCommandName = "default";

/**
 * A class that owns a set of slash commands and can handle requests for them.
 */
export class SlashCommandsOwner implements IAgentRequestHandler {
    private _invokeableSlashCommands: SlashCommands;
    private _fallbackHandlers: FallbackSlashCommandHandlers;
    private _disableIntentDetection: boolean;

    private _previousSlashCommandHandlerResult: SlashCommandHandlerResult;

    constructor(fallbackHandlers: FallbackSlashCommandHandlers, options?: SlashCommmandOwnerOptions) {
        this._invokeableSlashCommands = new Map();
        this._fallbackHandlers = fallbackHandlers;
        this._disableIntentDetection = options?.disableIntentDetection || false;
    }

    public addInvokeableSlashCommands(slashCommands: SlashCommands): void {
        for (const slashCommand of slashCommands.entries()) {
            this._invokeableSlashCommands.set(slashCommand[0], slashCommand[1]);
        }
    }

    /**
     * Handles an agent request.
     *
     * Will only handle the request if:
     * - There is a command and it is in the list of invokeable commands OR
     * - Intent detection is not disabled and there is a prompt from which intent can be detected.
     */
    public async handleRequestOrPrompt(request: AgentRequest): Promise<SlashCommandHandlerResult> {
        const getHandlerResult = await this._getSlashCommandHandlerForRequest(request);
        if (getHandlerResult?.handler !== undefined) {
            const handler = getHandlerResult.handler;
            const refinedRequest = getHandlerResult.refinedRequest;

            const result = await handler(refinedRequest);

            this._previousSlashCommandHandlerResult = result;
            if (result !== undefined) {
                result.chatAgentResult.metadata = result?.chatAgentResult.metadata || { handlerChain: [] };

                if (result.chatAgentResult.metadata.handlerChain.length === 0) {
                    result.chatAgentResult.metadata.handlerChain = [refinedRequest.command || "unknown"];
                } else {
                    result.chatAgentResult.metadata.handlerChain.unshift(refinedRequest.command || "unknown");
                }
            }
            return result;
        } else {
            return undefined;
        }
    }

    public getFollowUpForLastHandledSlashCommand(result: vscode.ChatAgentResult2, _token: vscode.CancellationToken): vscode.ChatAgentFollowup[] | undefined {
        if (result === this._previousSlashCommandHandlerResult?.chatAgentResult) {
            const followUpForLastHandledSlashCommand = this._previousSlashCommandHandlerResult?.followUp;
            this._previousSlashCommandHandlerResult = undefined;
            return followUpForLastHandledSlashCommand;
        } else {
            return undefined;
        }
    }

    public getSlashCommands(): ([string, SlashCommandConfig])[] {
        return Array.from(this._invokeableSlashCommands.entries());
    }

    private async _getSlashCommandHandlerForRequest(request: AgentRequest): Promise<{ refinedRequest: AgentRequest, handler: SlashCommandHandler | undefined } | undefined> {
        const { prompt: prompt, command: parsedCommand } = this._preProcessPrompt(request.userPrompt);

        // Trust VS Code to parse the command out for us, but also look for a parsed command for any "hidden" commands that VS Code doesn't know to parse out.
        const command = request.command || parsedCommand;

        let result: { refinedRequest: AgentRequest, handler: SlashCommandHandler | undefined } | undefined;

        // Only try to get a handler if:
        // - There is a command and it is in the list of invokeable commands OR
        // - Intent detection is not disabled and there is a prompt from which intent can be detected.
        if ((command !== undefined && this._invokeableSlashCommands.has(command)) || !this._disableIntentDetection) {
            // If there is no prompt and no command, then use the noInput fallback handler (or no handler if there is no noInput fallback handler).
            if (!result && prompt === "" && !command) {
                result = {
                    refinedRequest: { ...request, command: "noInput", userPrompt: prompt, },
                    handler: typeof this._fallbackHandlers.noInput === "string" ?
                        this._invokeableSlashCommands.get(this._fallbackHandlers.noInput)?.handler :
                        this._fallbackHandlers.noInput
                };
            }

            // If there is a command, then use the command's handler.
            if (!result && !!command) {
                const slashCommand = this._invokeableSlashCommands.get(command);
                if (slashCommand !== undefined) {
                    result = {
                        refinedRequest: { ...request, command: command, userPrompt: prompt, },
                        handler: slashCommand.handler
                    };
                }
            }

            // If intent detection is not disabled and there is a prompt from which intent can be detected, then use intent detection to find a command.
            if (!result && prompt !== "" && this._disableIntentDetection !== true) {
                const intentDetectionTargets = Array.from(this._invokeableSlashCommands.entries())
                    .map(([name, config]) => ({ name: name, intentDetectionDescription: config.intentDescription || config.shortDescription }));
                const detectedTarget = await detectIntent(intentDetectionTargets, request);
                if (detectedTarget !== undefined) {
                    const command = detectedTarget.name;
                    const slashCommand = this._invokeableSlashCommands.get(command);
                    if (slashCommand !== undefined) {
                        result = {
                            refinedRequest: { ...request, command: command, userPrompt: prompt, },
                            handler: slashCommand.handler
                        };
                    }
                }
            }

            // If after all of that, there is still no result, then use the default fallback handler (or no handler if there is no default fallback handler).
            if (!result) {
                result = {
                    refinedRequest: { ...request, command: defaultSlashCommandName, userPrompt: prompt, },
                    handler: typeof this._fallbackHandlers.default === "string" ?
                        this._invokeableSlashCommands.get(this._fallbackHandlers.default)?.handler :
                        this._fallbackHandlers.default
                };
            }
        }

        return result;
    }

    /**
     * Takes `prompt` and:
     * 1. Trims it
     * 2. If it starts with a `/<command>`, then it returns the command and the prompt without the command
     * 3. Otherwise, it returns the prompt as is
     */
    private _preProcessPrompt(prompt: string): { command?: string, prompt: string } {
        const trimmedPrompt = prompt.trim();
        const commandMatch = trimmedPrompt.match(/^\/(\w+)\s*(.*)$/);
        if (commandMatch) {
            return { command: commandMatch[1], prompt: commandMatch[2] };
        } else {
            return { prompt: trimmedPrompt };
        }
    }
}
