/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { type IAzureUserInput, type PromptResult } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { type AgentRequest } from "../agent";
import { getResponseAsStringCopilotInteraction, getStringFieldFromCopilotResponseMaybeWithStrJson } from "../copilotInteractions";
import { type SlashCommand, type SlashCommandHandlerResult } from "../slashCommands";
import { type IWizardBasedExtension, type WizardBasedExtensionCommand } from "./wizardBasedExtensionSchema";

export function slashCommandFromWizardBasedExtensionCommand(command: WizardBasedExtensionCommand, extension: IWizardBasedExtension): SlashCommand {
    return [
        command.name,
        {
            shortDescription: command.displayName,
            longDescription: command.displayName,
            intentDescription: command.intentDescription || command.displayName,
            handler: async (request: AgentRequest): Promise<SlashCommandHandlerResult> => {
                const pickedParameters: { [parameterName: string]: string } = {};
                let lastUnfilfilledParameter: string | undefined = undefined;

                const onDidFinishPromptEventEmitter = new vscode.EventEmitter<PromptResult>();
                const azureUserInput: IAzureUserInput = {
                    showQuickPick: async <T extends vscode.QuickPickItem>(items: T[] | Thenable<T[]>, options: vscode.QuickPickOptions): Promise<T | T[]> => {
                        if (!options.title) {
                            throw new Error("Quick pick title is required.");
                        }
                        const pickedItem = await pickQuickPickItem(request, items, options);
                        if (pickedItem !== undefined) {
                            pickedParameters[options.title] = pickedItem.label;
                            onDidFinishPromptEventEmitter.fire({ value: pickedItem });
                            return pickedItem;
                        } else {
                            lastUnfilfilledParameter = options.title;
                            throw new Error("Could not complete quick pick.");
                        }
                    },
                    showInputBox: async (_options: vscode.InputBoxOptions): Promise<string> => {
                        throw new Error("Method not implemented.");
                    },
                    showWarningMessage: async <T extends vscode.MessageItem>(_message: string, ..._args: any[]): Promise<T> => {
                        throw new Error("Method not implemented.");
                    },
                    showOpenDialog: async (_options: vscode.OpenDialogOptions): Promise<vscode.Uri[]> => {
                        throw new Error("Method not implemented.");
                    },
                    onDidFinishPrompt: onDidFinishPromptEventEmitter.event
                };

                const result = await extension.runWizardForCommand(command, azureUserInput);

                const markdownResponseLines = [`Ok, I can help you with the '${command.displayName}' command from the '${extension.displayName}'.`];
                if (Object.keys(pickedParameters).length > 0) {
                    markdownResponseLines.push(`I have so far determined the following parameters based on our conversation:`);
                    markdownResponseLines.push(...Object.keys(pickedParameters).map((parameterName) => `- ${parameterName}: ${pickedParameters[parameterName]}`));
                    markdownResponseLines.push("\n");
                }

                if (result.type === "done") {
                    markdownResponseLines.push(`If you'd like to go with that, then click the '${command.displayName} button below.`);
                    return {
                        chatAgentResult: {},
                        followUp: [{
                            title: command.displayName,
                            commandId: command.commandId,
                        }]
                    };
                } else {
                    markdownResponseLines.push(`Before we can continue, I still need to know some more things. The next thing I need to know is: ${lastUnfilfilledParameter}.`);
                    return { chatAgentResult: {}, followUp: [] };
                }
            }
        }
    ]
}

async function pickQuickPickItem<T extends vscode.QuickPickItem>(request: AgentRequest, items: T[] | Thenable<T[]>, options: vscode.QuickPickOptions): Promise<T | undefined> {
    const resolvedNonSeparatorItems = (await Promise.resolve(items)).filter((i) => i.kind !== vscode.QuickPickItemKind.Separator);
    const systemPrompt = getPickQuickPickItemSystemPrompt1(resolvedNonSeparatorItems, options);
    const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(systemPrompt, request);
    const copilotPickedItemTitle = getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, ["value", "parameter", "parameterValue", options.title || "value"]);
    return copilotPickedItemTitle === undefined ? undefined : resolvedNonSeparatorItems.find((i) => i.label === copilotPickedItemTitle);
}

function getPickQuickPickItemSystemPrompt1(items: vscode.QuickPickItem[], options: vscode.QuickPickOptions): string {
    const itemToString = (item: vscode.QuickPickItem): string => `${item.label} ${item.description ? `(${item.description || ""})` : ""}`;
    return [
        `You are an expert in determining the value of ${options.title || `something`} based on user input.`,
        `The possible values for the parameter are: ${items.map(itemToString).join(", ")}.`,
        `Given the user's input, your job is to determine a value for ${options.title || `something`}.`,
        `Only repsond with a JSON summary (for example, '{value: "xyz"}') of the value you determine. Do not respond in a coverstaional tone, only JSON. If the users input does not infer or specify a value for this parameter, then do not respond.`,
    ].filter(s => !!s).join(" ");
}
