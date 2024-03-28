/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSCodeAzureSubscriptionProvider } from "@microsoft/vscode-azext-azureauth";
import { type AzureAgentChatResultMetadata, type SkillCommandArgs, type SkillCommandConfig } from "../../../api";
import { ext } from "../../extensionVariables";
import { type AgentRequest } from "../agent";
import { queryAzureResourceGraph } from "../argQuery/queryAzureResourceGraph";
import { getConversationAsString, getLanguageModelTokenLimit, getResponseAsStringCopilotInteraction, verbatimCopilotInteraction } from "../copilotInteractions";
import { type SlashCommand, type SlashCommandHandlerResult } from "../slashCommands";
import { getTypeChatTranslation } from "../typechat/getTypeChatTranslation";
import { type AzureExtension } from "./AzureExtension";

export function slashCommandFromSkillCommand(command: SkillCommandConfig, extension: AzureExtension): SlashCommand {
    return [
        command.name,
        {
            shortDescription: command.displayName,
            longDescription: command.displayName,
            intentDescription: command.intentDescription || command.displayName,
            handler: async (request: AgentRequest): Promise<SlashCommandHandlerResult> => {
                const args: SkillCommandArgs = {
                    agentRequest: request,
                    agent: {
                        verbatimLanguageModelInteraction: verbatimCopilotInteraction,
                        getLanguageModelTokenLimit: getLanguageModelTokenLimit,
                        getResponseAsStringLanguageModelInteraction: getResponseAsStringCopilotInteraction,
                        queryAzureResourceGraph: queryAzureResourceGraph,
                        getTypeChatTranslation: getTypeChatTranslation,
                        getConversationAsString: getConversationAsString,
                        outputChannel: ext.outputChannel,
                        subscriptionProvider: new VSCodeAzureSubscriptionProvider()
                    }
                }

                // Make sure skill commands are not be setting anything that would be in AzureAgentChatResultMetadata
                const result = await extension.runSkillCommand(command, args);
                const resultMetadata = result.chatAgentResult.metadata;
                if (resultMetadata !== undefined) {
                    // Set the handler chain to an empty array and the resultId to an empty string, they'll be set to real values later
                    const newMetadata: AzureAgentChatResultMetadata = { ...resultMetadata, handlerChain: [], resultId: "" };
                    result.chatAgentResult = { ...result.chatAgentResult, metadata: newMetadata };
                }

                return result;
            }
        }
    ]
}
