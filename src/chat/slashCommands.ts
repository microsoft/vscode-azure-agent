/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { detectIntent } from "./intentDetection";

/**
 * A camel cased string that names the slash command. Will be used as the string that the user types to invoke the command.
 */
export type SlashCommandName = string;

/**
 * The result of a slash command handler.
 */
export type SlashCommandHandlerResult = {
    /**
     * The VsCode chat agent result.
     */
    chatAgentResult: vscode.ChatAgentResult2,
    /**
     * Any follow-up messages to be given for this result.
     */
    followUp?: vscode.ChatAgentFollowup[],
    /**
     * The chain of slash command handlers that were invoked to produce this result.
     */
    handlerChain?: string[]
} | undefined;

/**
 * A handler for a slash command.
 */
export type SlashCommandHandler = (userContent: string, ctx: vscode.ChatAgentContext, progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, token: vscode.CancellationToken) => Promise<SlashCommandHandlerResult>;

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

export type InvokeableSlashCommands = Map<string, SlashCommandConfig>;

export type FallbackSlashCommandHandlers = { noInput?: SlashCommandHandler, default?: SlashCommandHandler, }

export class SlashCommandOwner {
    private _invokeableSlashCommands: InvokeableSlashCommands;
    private _fallbackSlashCommands: FallbackSlashCommandHandlers;

    private _previousSlashCommandHandlerResult: SlashCommandHandlerResult;

    constructor(invokableSlashCommands: InvokeableSlashCommands, fallbackSlashCommands: FallbackSlashCommandHandlers) {
        this._invokeableSlashCommands = invokableSlashCommands;
        this._fallbackSlashCommands = fallbackSlashCommands;
    }

    public async handleRequestOrPrompt(request: vscode.ChatAgentRequest | string, context: vscode.ChatAgentContext, progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, token: vscode.CancellationToken, skipIntentDetection?: boolean): Promise<SlashCommandHandlerResult> {
        if (typeof request === "string") {
            request = {
                prompt: request,
                variables: {},
            };
        }

        const getHandlerResult = await this._getSlashCommandHandlerForRequest(request, context, progress, token, skipIntentDetection);
        if (getHandlerResult.handler !== undefined) {
            const handler = getHandlerResult.handler;
            const result = await handler(getHandlerResult.prompt, context, progress, token);
            this._previousSlashCommandHandlerResult = result;
            if (result !== undefined) {
                if (!result?.handlerChain) {
                    result.handlerChain = [getHandlerResult.name];
                } else {
                    result.handlerChain.unshift(getHandlerResult.name);
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

    private async _getSlashCommandHandlerForRequest(request: vscode.ChatAgentRequest, context: vscode.ChatAgentContext, progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, token: vscode.CancellationToken, skipIntentDetection?: boolean): Promise<{ name: string, prompt: string, handler: SlashCommandHandler | undefined }> {
        const { prompt: prompt, command: parsedCommand } = this._preProcessPrompt(request.prompt);

        // trust VS Code to parse the command out for us, but also look for a parsed command for any "hidden" commands that VS Code doesn't know to parse out.
        const command = request.slashCommand?.name || parsedCommand;

        let result: { name: string, prompt: string, handler: SlashCommandHandler | undefined } | undefined;

        if (!result && prompt === "" && !command) {
            result = { name: "noInput", prompt: prompt, handler: this._fallbackSlashCommands.noInput };
        }

        if (!result && !!command) {
            const slashCommand = this._invokeableSlashCommands.get(command);
            if (slashCommand !== undefined) {
                result = { name: command, prompt: prompt, handler: slashCommand.handler };
            }
        }

        if (!result && skipIntentDetection !== true) {
            const intentDetectionTargets = Array.from(this._invokeableSlashCommands.entries())
                .map(([name, config]) => ({ name: name, intentDetectionDescription: config.intentDescription || config.shortDescription }));
            const detectedTarget = await detectIntent(prompt, intentDetectionTargets, context, progress, token);
            if (detectedTarget !== undefined) {
                const command = detectedTarget.name;
                const slashCommand = this._invokeableSlashCommands.get(command);
                if (slashCommand !== undefined) {
                    result = { name: command, prompt: prompt, handler: slashCommand.handler };
                }
            }
        }

        if (!result) {
            result = { name: "default", prompt: prompt, handler: this._fallbackSlashCommands.default };
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
