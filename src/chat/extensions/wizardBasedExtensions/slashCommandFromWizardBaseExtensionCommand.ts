/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { UserCancelledError, type AgentInputBoxOptions, type AgentQuickPickItem, type AgentQuickPickOptions, type AzureUserInputQueue, type IAzureAgentInput, type ParameterAgentMetadata, type PromptResult, type WizardBasedCommandConfig } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { type AgentRequest } from "../../agent";
import { getResponseAsStringCopilotInteraction, getStringFieldFromCopilotResponseMaybeWithStrJson } from "../../copilotInteractions";
import { type SlashCommand, type SlashCommandHandlerResult } from "../../slashCommands";
import { type WizardBasedExtension } from "./wizardBasedExtension";

export function slashCommandFromWizardBasedExtensionCommand(command: WizardBasedCommandConfig, extension: WizardBasedExtension): SlashCommand {
    return [
        command.name,
        {
            shortDescription: command.displayName,
            longDescription: command.displayName,
            intentDescription: command.intentDescription || command.displayName,
            handler: async (request: AgentRequest): Promise<SlashCommandHandlerResult> => {
                request.progress.report({ message: "Analyzing conversation..." });

                // @todo: handle these cases
                // if (command.requiesAzureLogin === true) {
                //     // todo
                // }
                // if (command.requiresWorkspaceOpen === true) {
                //     // todo
                // }

                const agentAzureUserInput = new AgentAzureUserInput(request);
                await extension.runWizardCommandWithoutExecutionId(command, agentAzureUserInput);

                const { pickedParameters, unfulfilledParameters, inputQueue } = agentAzureUserInput.getInteractionResults();

                const markdownResponseLines = [`Ok, I can help you by using the the **${command.displayName}** command from the **${extension.displayName}** extension.`];

                if (Object.keys(pickedParameters).length > 0) {
                    markdownResponseLines.push(`I have determined the following information needed for **${command.displayName}** based on our conversation:`);
                    markdownResponseLines.push(...Object.keys(pickedParameters).map((parameterName) => `- ${pickedParameters[parameterName].parameterDisplayTitle}: ${pickedParameters[parameterName].pickedValueLabel}`));
                    markdownResponseLines.push(`\nIf any of that information is incorrect, feel free to ask me to change it or start over.`);
                    markdownResponseLines.push(`\nOtherwise, you can go ahead and start with that by clicking the **${command.displayName}** button below.`);
                    if (Object.keys(unfulfilledParameters).length > 0) {
                        markdownResponseLines.push(`\nYou can also provide me more information. I am at least interested in knowing:`);
                        markdownResponseLines.push(...Object.keys(unfulfilledParameters).map((parameterName) => `- ${unfulfilledParameters[parameterName].parameterDisplayTitle}: ${unfulfilledParameters[parameterName].parameterDisplayDescription}`));
                    }
                } else {
                    markdownResponseLines.push(`\nI was not able to determine any of the information needed for **${command.displayName}** based on our conversation.`);
                    markdownResponseLines.push(`\nYou can go ahead and click the **${command.displayName}** button below to get started, or provide me with more information.`);
                    if (Object.keys(unfulfilledParameters).length > 0) {
                        markdownResponseLines.push(`\nIf you'd like to provide me with more information. I am at least interested in knowing:`);
                        markdownResponseLines.push(...Object.keys(unfulfilledParameters).map((parameterName) => `- ${unfulfilledParameters[parameterName].parameterDisplayTitle}: ${unfulfilledParameters[parameterName].parameterDisplayDescription}`));
                    }
                }

                request.progress.report({ content: markdownResponseLines.join("\n") });

                return { chatAgentResult: {}, followUp: [extension.getRunWizardCommandWithInputsFollowUp(command, inputQueue)] };
            }
        }
    ]
}

type PickedParameters = { [parameterName: string]: ParameterAgentMetadata & { pickedValueLabel: string } };
type UnfulfilledParameters = { [parameterName: string]: ParameterAgentMetadata };
type AzureAgentUserInputResults = { pickedParameters: PickedParameters; unfulfilledParameters: UnfulfilledParameters; inputQueue: AzureUserInputQueue; };

class AgentAzureUserInput implements IAzureAgentInput {
    private _request: AgentRequest;
    private _pickedParameters: PickedParameters;
    private _unfulfilledParameters: UnfulfilledParameters;
    private _userInputReturnValueQueue: AzureUserInputQueue;
    private _onDidFinishPromptEventEmitter: vscode.EventEmitter<PromptResult>;

    constructor(request: AgentRequest) {
        this._request = request;
        this._pickedParameters = {};
        this._unfulfilledParameters = {};
        this._userInputReturnValueQueue = [];
        this._onDidFinishPromptEventEmitter = new vscode.EventEmitter<PromptResult>();
    }

    public async showQuickPick<T extends AgentQuickPickItem>(items: T[] | Promise<T[]>, options: (AgentQuickPickOptions & { canPickMany: true }) | AgentQuickPickOptions): Promise<T | T[]> {
        // Hack until someone else goes and adds agentMetadata to wherever the heck subscription picks are defined
        if (options.placeHolder?.indexOf("subscription") !== -1) {
            options.agentMetadata = options.agentMetadata || {
                parameterName: "subscription",
                parameterDisplayTitle: "Subscription",
                parameterDisplayDescription: "The subscription that the resource should be created in.",
            }
        }

        const parameterName = options.agentMetadata.parameterName;
        const pickedItem = options.canPickMany ? undefined : await this._pickQuickPickItem(this._request, items, options);
        if (pickedItem !== undefined) {
            this._pickedParameters[parameterName] = { ...options.agentMetadata, pickedValueLabel: pickedItem.label };
            this._userInputReturnValueQueue.push(pickedItem);
            this._onDidFinishPromptEventEmitter.fire({ value: pickedItem });
            return pickedItem;
        } else {
            this._unfulfilledParameters[parameterName] = { ...options.agentMetadata };
            throw new UserCancelledError(parameterName);
        }
    }

    public async showInputBox(options: AgentInputBoxOptions): Promise<string> {
        const parameterName = options.agentMetadata.parameterName;
        const providedInput = await this._provideInput(this._request, options);
        if (providedInput !== undefined) {
            this._pickedParameters[parameterName] = { ...options.agentMetadata, pickedValueLabel: providedInput };
            this._userInputReturnValueQueue.push(providedInput);
            this._onDidFinishPromptEventEmitter.fire({ value: providedInput });
            return providedInput;
        } else {
            this._unfulfilledParameters[parameterName] = { ...options.agentMetadata };
            throw new UserCancelledError(parameterName);
        }
    }

    public async showWarningMessage<T extends vscode.MessageItem>(_message: string, ..._items: T[]): Promise<T> {
        throw new UserCancelledError();
    }

    public async showOpenDialog(_options: vscode.OpenDialogOptions): Promise<vscode.Uri[]> {
        throw new UserCancelledError();
    }

    public get onDidFinishPrompt() {
        return this._onDidFinishPromptEventEmitter.event;
    }

    public getInteractionResults(): AzureAgentUserInputResults {
        return {
            pickedParameters: this._pickedParameters,
            unfulfilledParameters: this._unfulfilledParameters,
            inputQueue: this._userInputReturnValueQueue,
        };
    }

    private async _pickQuickPickItem<T extends AgentQuickPickItem>(request: AgentRequest, items: T[] | Promise<T[]>, options: AgentQuickPickOptions): Promise<T | undefined> {
        const resolvedApplicableItems = (await Promise.resolve(items))
            .map((item) => ({ ...item, agentMetadata: options.agentMetadata || {} }))
            .filter((item) => item.kind !== vscode.QuickPickItemKind.Separator)
            .filter((item) => item.agentMetadata.notApplicableToAgentPick !== true);
        if (resolvedApplicableItems.length === 0) {
            return undefined;
        } else if (resolvedApplicableItems.length === 1) {
            return resolvedApplicableItems[0];
        } else {
            const systemPrompt = this._getPickQuickPickItemSystemPrompt1(resolvedApplicableItems, options);
            const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(systemPrompt, request);
            const copilotPickedItemTitle = getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, ["value", "parameter", "parameterValue", options.agentMetadata.parameterName || "value"]);
            return copilotPickedItemTitle === undefined ? undefined : resolvedApplicableItems.find((i) => i.label === copilotPickedItemTitle);
        }
    }

    private _getPickQuickPickItemSystemPrompt1(items: AgentQuickPickItem[], options: AgentQuickPickOptions): string {
        const itemToString = (item: AgentQuickPickItem): string => `'${item.label}'${item.description ? ` (${item.description || ""})` : ""}`;
        const itemsString = items
            .map(itemToString).join(", ")
            // remove all theme-icons (anything like $(<name>)) from the itemString
            .replace(/\$\([^)]*\)/g, "")
            // after removing theme icons, there may be empty parens, remove those
            .replace(/\(\)/g, "")
            // some item descriptions may already have parens, so we need to remove double open-parens
            .replace(/\(\(/g, "(")
            // some item descriptions may already have parens, so we need to remove double close-parens
            .replace(/\)\)/g, ")");

        return [
            `You are an expert in determining the value of a '${options.agentMetadata.parameterName}' parameter based on user input.`,
            `The possible values for the parameter are: ${itemsString}.`,
            `Given the user's input, your job is to determine a value for '${options.agentMetadata.parameterName}'.`,
            `Only repsond with a JSON summary (for example, '{value: "xyz"}') of the value you determine. Do not respond in a coverstaional tone, only JSON. If the users input does not infer or specify a value for this parameter, then do not respond.`,
        ].filter(s => !!s).join(" ");
    }

    private async _provideInput(request: AgentRequest, options: AgentInputBoxOptions): Promise<string | undefined> {
        const systemPrompt = this._getProvideInputSystemPrompt1(options);
        const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(systemPrompt, request);
        const copilotProvidedInput = getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, ["value", "parameter", "parameterValue", options.agentMetadata.parameterName || "value"]);
        return copilotProvidedInput;
    }

    private _getProvideInputSystemPrompt1(options: AgentInputBoxOptions): string {
        return [
            `You are an expert in determining the value of a '${options.agentMetadata.parameterName}' parameter based on user input.`,
            `This parameter is a string input, for which you must come up with a value for.`,
            `Given the user's input, your job is to determine a string value for '${options.agentMetadata.parameterName}'.`,
            `Only repsond with a JSON summary (for example, '{value: "xyz"}') of the value you determine. Do not respond in a coverstaional tone, only JSON.`,
        ].filter(s => !!s).join(" ");
    }
}
