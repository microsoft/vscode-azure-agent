/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from "vscode";
import { type AgentRequest } from "../agent";
import { getSignInCommand, isUserSignedInToAzure } from "../azureSignIn";
import { getResponseAsStringCopilotInteraction, getStringFieldFromCopilotResponseMaybeWithStrJson } from "../copilotInteractions";
import { type SlashCommand, type SlashCommandHandlerResult } from "../slashCommands";
import { type AzureExtension } from "./AzureExtension";
import { type SnippetCommandConfig } from "./SnippetBasedCommandConfig";

export function slashCommandFromSnippetCommand(command: SnippetCommandConfig, extension: AzureExtension): SlashCommand {
    return [
        command.name,
        {
            shortDescription: command.displayName,
            longDescription: command.displayName,
            intentDescription: command.intentDescription || command.displayName,
            handler: async (request: AgentRequest): Promise<SlashCommandHandlerResult> => {
                const followUps: vscode.ChatAgentFollowup[] = [];

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
                    const systemPrompt = getGenerateSnippetSystemPrompt1(command);
                    const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(systemPrompt, request);
                    const snippet = getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "snippet");
                    const snippetLanguage = getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "snippetLanguage") || "";
                    if (snippet !== undefined) {
                        request.responseStream.markdown(`\n\nHere is the ${command.snippetType || "code"} snippet that I generated for you:`);
                        request.responseStream.markdown(`\n\n\`\`\`${snippetLanguage}\n${snippet}\n\`\`\`\``);
                        request.responseStream.markdown(`\nIf this looks good to you, go ahead and click the **${command.displayName}** button to continue.`);

                        // @todo: switch to request.responseStream.button once chat extension supports it
                        // request.responseStream.button({ command: command.commandId, title: command.displayName, arguments: [snippet] });
                        followUps.push({ title: command.displayName, commandId: command.commandId, args: [snippet] } as unknown as vscode.ChatAgentFollowup);
                    } else {
                        request.responseStream.markdown(`I'm sorry, I was not able to generate a code snippet for you.`);
                    }
                }
                return { chatAgentResult: {}, followUp: followUps };
            }
        }
    ];
}

function getGenerateSnippetSystemPrompt1(command: SnippetCommandConfig): string {
    const snippetType = command.snippetType !== undefined ? command.snippetType : "code";
    return `You are an expert in generating ${command.snippetLanguage !== undefined ? command.snippetLanguage : ""} ${snippetType} snippets. Based on the user's prompt, generate a ${snippetType} snippet for them. This snippet will be used with a '${command.displayName}' command. Return both the ${snippetType} snippet and what language the ${snippetType} snippet is written with in a JSON object. Do not respond in a coverstaional tone, only JSON. Make sure to include new lines to maximize readability. For example: { "snippet": "<the ${snippetType} snippet>", "snippetLanguage": "<the language of the ${snippetType} snippet>" }.`;
}
