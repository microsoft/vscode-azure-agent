/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { UserCancelledError, type PromptResult } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { type AgentRequest } from "../agent";
import { getResponseAsStringCopilotInteraction, getStringFieldFromCopilotResponseMaybeWithStrJson } from "../copilotInteractions";
import { type SlashCommand, type SlashCommandHandlerResult } from "../slashCommands";
import { AgentInputBoxOptions, AgentQuickPickItem, AgentQuickPickOptions, IAgentUserInput } from "./AgentUserInput";
import { type IWizardBasedExtension, type WizardBasedExtensionCommand } from "./wizardBasedExtensionSchema";

export function slashCommandFromWizardBasedExtensionCommand(command: WizardBasedExtensionCommand, extension: IWizardBasedExtension): SlashCommand {
    return [
        command.name,
        {
            shortDescription: command.displayName,
            longDescription: command.displayName,
            intentDescription: command.intentDescription || command.displayName,
            handler: async (request: AgentRequest): Promise<SlashCommandHandlerResult> => {
                request.progress.report({ message: "Analyzing conversation..." });

                const agentAzureUserInput = new AgentAzureUserInput(request);
                await vscode.commands.executeCommand(extension.runWizardCommandId, command, agentAzureUserInput);

                const { pickedParameters, unfilfilledParameters, inputQueue } = agentAzureUserInput.getInteractionResults();

                const markdownResponseLines = [`Ok, I can help you by using the the **${command.displayName}** command from the **${extension.displayName}** extension.`];

                if (Object.keys(pickedParameters).length > 0) {
                    markdownResponseLines.push(`I have determined the following information needed for **${command.displayName}** based on our conversation:`);
                    markdownResponseLines.push(...Object.keys(pickedParameters).map((parameterName) => `- ${parameterName}: ${pickedParameters[parameterName]}`));
                    markdownResponseLines.push(`\nIf any of that information is incorrect, feel free to ask me to change it or start over.`);
                    markdownResponseLines.push(`\nOtherwise, you can go ahead and start with that by clicking the **${command.displayName}** button below.`);
                    if (unfilfilledParameters.length > 0) {
                        markdownResponseLines.push(`\nYou can also provide me more information. I am at least interested in knowing:`);
                        markdownResponseLines.push(...unfilfilledParameters.map((parameterName) => `- ${parameterName}`));
                    }
                } else {
                    markdownResponseLines.push(`\nI was not able to determine any of the information needed for **${command.displayName}** based on our conversation.`);
                    markdownResponseLines.push(`\nYou can go ahead and click the **${command.displayName}** button below to get started, or provide me with more information.`);
                    if (unfilfilledParameters.length > 0) {
                        markdownResponseLines.push(`\nIf you'd like to provide me with more information. I am at least interested in knowing:`);
                        markdownResponseLines.push(...unfilfilledParameters.map((parameterName) => `- ${parameterName}`));
                    }
                }

                request.progress.report({ content: markdownResponseLines.join("\n") });

                return {
                    chatAgentResult: {},
                    followUp: [{
                        title: command.displayName,
                        commandId: extension.runWizardWithInputsCommandId,
                        args: [command, inputQueue]
                    }]
                };
            }
        }
    ]
}

async function pickQuickPickItem<T extends AgentQuickPickItem>(request: AgentRequest, items: T[] | Thenable<T[]>, options: AgentQuickPickOptions): Promise<T | undefined> {
    const optionTitle = options.title || options.placeHolder;
    const resolvedItems = await Promise.resolve(items);
    const systemPrompt = getPickQuickPickItemSystemPrompt1(resolvedItems, options);
    const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(systemPrompt, request);
    const copilotPickedItemTitle = getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, ["value", "parameter", "parameterValue", optionTitle || "value"]);
    return copilotPickedItemTitle === undefined ? undefined : resolvedItems.find((i) => i.label === copilotPickedItemTitle);
}

function getPickQuickPickItemSystemPrompt1(items: AgentQuickPickItem[], options: AgentQuickPickOptions): string {
    const itemToString = (item: AgentQuickPickItem): string => `'${item.label}'${item.description ? ` (${item.description || ""})` : ""}`;
    // join all the items into a string separted by commas
    const itemsString = items
        .filter((item) => item.kind !== vscode.QuickPickItemKind.Separator)
        .filter((item) => item.agentMetadata.notApplicableToAgentPick !== true)
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
        `You are an expert in determining the value of a '${options.agentMetadata.paramterNameTitle}' parameter based on user input.`,
        `The possible values for the parameter are: ${itemsString}.`,
        `Given the user's input, your job is to determine a value for '${options.agentMetadata.paramterNameTitle}'.`,
        `Only repsond with a JSON summary (for example, '{value: "xyz"}') of the value you determine. Do not respond in a coverstaional tone, only JSON. If the users input does not infer or specify a value for this parameter, then do not respond.`,
    ].filter(s => !!s).join(" ");
}

export type InputQueue = (vscode.QuickPickItem | string | vscode.MessageItem | vscode.Uri[] | undefined)[];

type AzureAgentUserInputPickedParameters = { [parameterName: string]: string };
type AzureAgentUserInputUnfilfilledParameters = string[];
type AzureAgentUserInputResults = {
    pickedParameters: AzureAgentUserInputPickedParameters;
    unfilfilledParameters: AzureAgentUserInputUnfilfilledParameters;
    inputQueue: InputQueue;
};

class AgentAzureUserInput implements IAgentUserInput {
    private _request: AgentRequest;
    private _pickedParameters: AzureAgentUserInputPickedParameters;
    private _unfilfilledParameters: AzureAgentUserInputUnfilfilledParameters;
    private _userInputReturnValueQueue: InputQueue;
    private _onDidFinishPromptEventEmitter: vscode.EventEmitter<PromptResult>;

    constructor(request: AgentRequest) {
        this._request = request;
        this._pickedParameters = {};
        this._unfilfilledParameters = [];
        this._userInputReturnValueQueue = [];
        this._onDidFinishPromptEventEmitter = new vscode.EventEmitter<PromptResult>();
    }

    public async showQuickPick<T extends AgentQuickPickItem>(items: T[] | Thenable<T[]>, options: (AgentQuickPickOptions & { canPickMany: true }) | AgentQuickPickOptions): Promise<T | T[]> {
        if (options.canPickMany) {
            throw new Error("canPickMany is not supported.");
        }

        const parameterName = options.agentMetadata.parameterName;
        const pickedItem = await pickQuickPickItem(this._request, items, options);
        if (pickedItem !== undefined) {
            this._pickedParameters[parameterName] = pickedItem.label;
            this._userInputReturnValueQueue.push(pickedItem);
            this._onDidFinishPromptEventEmitter.fire({ value: pickedItem });
            return pickedItem;
        } else {
            this._unfilfilledParameters.push(parameterName);
            throw new UserCancelledError(parameterName);
        }
    }

    public async showInputBox(options: AgentInputBoxOptions): Promise<string> {
        this._unfilfilledParameters.push(options.agentMetadata.paramterNameTitle);
        this._userInputReturnValueQueue.push(undefined);
        return "AGENTSKIPPING";
    }

    public async showWarningMessage<T extends vscode.MessageItem>(_message: string, ..._items: T[]): Promise<T> {
        throw new Error("Method not implemented.");
    }

    public async showOpenDialog(_options: vscode.OpenDialogOptions): Promise<vscode.Uri[]> {
        throw new Error("Method not implemented.");
    }

    public get onDidFinishPrompt() {
        return this._onDidFinishPromptEventEmitter.event;
    }

    public getInteractionResults(): AzureAgentUserInputResults {
        return {
            pickedParameters: this._pickedParameters,
            unfilfilledParameters: this._unfilfilledParameters,
            inputQueue: this._userInputReturnValueQueue,
        };
    }
}
