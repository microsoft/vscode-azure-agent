/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureUserInputQueue, UserCancelledError, type PromptResult } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { type AgentInputBoxOptions, type AgentQuickPickItem, type AgentQuickPickOptions, type IAzureAgentInput, type ParameterAgentMetadata, type WizardCommandConfig } from "../../../api";
import { type AgentRequest } from "../agent";
import { getSignInCommand, isUserSignedInToAzure } from "../azureSignIn";
import { getResponseAsStringCopilotInteraction, getStringFieldFromCopilotResponseMaybeWithStrJson } from "../copilotInteractions";
import { type SlashCommand, type SlashCommandHandlerResult } from "../slashCommands";
import { type AzureExtension } from "./AzureExtension";

export type WizardContinuation = {
    handlerChainStr: string;
    inputQueue: AzureUserInputQueue;
};

export function slashCommandFromWizardCommand(command: WizardCommandConfig, extension: AzureExtension): SlashCommand {
    return [
        command.name,
        {
            shortDescription: command.displayName,
            longDescription: command.displayName,
            intentDescription: command.intentDescription || command.displayName,
            handler: async (request: AgentRequest, handlerChain: string[]): Promise<SlashCommandHandlerResult> => {
                const followUps: vscode.ChatFollowup[] = [];
                let wizardContinuation: WizardContinuation | undefined = checkForWizardContinuation(request, handlerChain);

                request.responseStream.markdown(`Ok, I can help you by using the the **${command.displayName}** command from the **${extension.extensionDisplayName}** extension.`);

                // @todo: handle this case
                // if (command.requiresWorkspaceOpen === true) {
                //     // todo
                // } else {
                const isSignedIn = await isUserSignedInToAzure();
                if (command.requiresAzureLogin === true && !isSignedIn) {
                    request.responseStream.markdown(`Before I can help you though, you need to be signed in to Azure.\n\nPlease sign in and then try again.`);
                    request.responseStream.button(getSignInCommand());
                } else {
                    request.responseStream.progress("Analyzing conversation...");

                    const agentAzureUserInput = new AgentAzureUserInput(request, wizardContinuation);
                    await extension.runWizardCommandWithoutExecutionId(command, agentAzureUserInput);

                    const { pickedParameters, unfulfilledParameters, inputQueue } = agentAzureUserInput.getInteractionResults();
                    wizardContinuation = { inputQueue: inputQueue, handlerChainStr: JSON.stringify(handlerChain), };

                    if (Object.keys(pickedParameters).length > 0) {
                        request.responseStream.markdown(`I have determined the following information needed for **${command.displayName}** based on our conversation:\n`);
                        request.responseStream.markdown(Object.keys(pickedParameters).map((parameterName) => `- ${pickedParameters[parameterName].parameterDisplayTitle}: ${pickedParameters[parameterName].pickedValueLabel}`).join("\n"));
                        request.responseStream.markdown(`\n\nIf any of that information is incorrect, feel free to ask me to change it or start over.`);
                        request.responseStream.markdown(`\n\nOtherwise, you can go ahead and start with that by clicking the **${command.displayName}** button below.`);
                        if (Object.keys(unfulfilledParameters).length > 0) {
                            request.responseStream.markdown(`\nYou can also provide me more information. I am at least interested in knowing:\n`);
                            request.responseStream.markdown(Object.keys(unfulfilledParameters).map((parameterName) => `- ${unfulfilledParameters[parameterName].parameterDisplayTitle}: ${unfulfilledParameters[parameterName].parameterDisplayDescription}`).join("\n"));
                        }
                    } else {
                        request.responseStream.markdown(`\n\nI was not able to determine any of the information needed for **${command.displayName}** based on our conversation.`);
                        request.responseStream.markdown(`\n\nYou can go ahead and click the **${command.displayName}** button below to get started, or provide me with more information.`);
                        if (Object.keys(unfulfilledParameters).length > 0) {
                            request.responseStream.markdown(`\nIf you'd like to provide me with more information. I am at least interested in knowing:\n`);
                            request.responseStream.markdown(Object.keys(unfulfilledParameters).map((parameterName) => `- ${unfulfilledParameters[parameterName].parameterDisplayTitle}: ${unfulfilledParameters[parameterName].parameterDisplayDescription}`).join("\n"));
                        }
                    }
                    request.responseStream.button(extension.getRunWizardCommandWithInputsCommand(command, inputQueue));
                }

                return {
                    chatAgentResult: {
                        metadata: {
                            wizardContinuation: wizardContinuation
                        }
                    }, followUp: followUps
                };
            }
        }
    ]
}

function checkForWizardContinuation(request: AgentRequest, handlerChain: string[]): WizardContinuation | undefined {
    const handlerChainStr = JSON.stringify(handlerChain);
    const lastResponseWithWizardContinuation = request.context.history
        .slice(0)
        .reverse()
        .find((entry) => ((entry as vscode.ChatResponseTurn)?.result?.metadata?.wizardContinuation as WizardContinuation) !== undefined) as vscode.ChatResponseTurn | undefined;
    const lastWizardContinuation = lastResponseWithWizardContinuation?.result?.metadata?.wizardContinuation as WizardContinuation;
    if (lastWizardContinuation !== undefined && lastWizardContinuation.handlerChainStr === handlerChainStr) {
        return lastWizardContinuation;
    } else {
        return undefined;
    }
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
    private _wizardContinuation: WizardContinuation | undefined;

    constructor(request: AgentRequest, wizardContinuation: WizardContinuation | undefined) {
        this._request = request;
        this._pickedParameters = {};
        this._unfulfilledParameters = {};
        this._userInputReturnValueQueue = [];
        this._onDidFinishPromptEventEmitter = new vscode.EventEmitter<PromptResult>();
        this._wizardContinuation = wizardContinuation;
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

        const parameterName = options.agentMetadata.parameterDisplayTitle;
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
        const parameterName = options.agentMetadata.parameterDisplayTitle;
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
            const copilotPickedItemTitle = getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, ["value", "parameter", "parameterValue", options.agentMetadata.parameterDisplayTitle || "value"]);
            const itemMatchingCopilotItem = copilotPickedItemTitle === undefined ? undefined : resolvedApplicableItems.find((i) => i.label === copilotPickedItemTitle);

            const itemFromWizardContinuation = this._getItemFromWizardContinuation() as T | null | undefined;
            const itemFromWizardContinuationTitle = itemFromWizardContinuation?.label;
            const itemMatchingWizardContinuationItem = itemFromWizardContinuationTitle === undefined ? undefined : resolvedApplicableItems.find((i) => i.label === itemFromWizardContinuationTitle);

            return itemMatchingCopilotItem || itemMatchingWizardContinuationItem;
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
            `You are an expert in determining the value of a '${options.agentMetadata.parameterDisplayTitle}' parameter based on user input.`,
            `The possible values for the parameter are: ${itemsString}.`,
            `Given the user's input, your job is to determine a value for '${options.agentMetadata.parameterDisplayTitle}'.`,
            `Only repsond with a JSON summary (for example, '{value: "xyz"}') of the value you determine. Do not respond in a coverstaional tone, only JSON. If the users input does not infer or specify a value for this parameter, then do not respond.`,
        ].filter(s => !!s).join(" ");
    }

    private async _provideInput(request: AgentRequest, options: AgentInputBoxOptions): Promise<string | undefined> {
        const systemPrompt = this._getProvideInputSystemPrompt1(options);
        const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(systemPrompt, request);
        const copilotProvidedInput = getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, ["value", "parameter", "parameterValue", options.agentMetadata.parameterDisplayTitle || "value"]);

        const itemFromWizardContinuation = this._getItemFromWizardContinuation();
        const inputFromWizardContinuation = typeof itemFromWizardContinuation === "string" ? itemFromWizardContinuation : undefined;

        return copilotProvidedInput || inputFromWizardContinuation;
    }

    private _getProvideInputSystemPrompt1(options: AgentInputBoxOptions): string {
        return [
            `You are an expert in determining the value of a '${options.agentMetadata.parameterDisplayTitle}' parameter based on user input.`,
            `This parameter is a string input, for which you must come up with a value for.`,
            `Given the user's input, your job is to determine a string value for '${options.agentMetadata.parameterDisplayTitle}'.`,
            `Only repsond with a JSON summary (for example, '{value: "xyz"}') of the value you determine. Do not respond in a coverstaional tone, only JSON.`,
        ].filter(s => !!s).join(" ");
    }

    private _getItemFromWizardContinuation(): string | vscode.QuickPickItem | vscode.MessageItem | vscode.Uri[] | null | undefined {
        return this._wizardContinuation?.inputQueue.shift();
    }
}
