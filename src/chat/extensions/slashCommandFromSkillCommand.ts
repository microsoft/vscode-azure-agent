/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSCodeAzureSubscriptionProvider } from "@microsoft/vscode-azext-azureauth";
import { type SkillCommandArgs, type SkillCommandConfig } from "../../../api";
import { ext } from "../../extensionVariables";
import { type AgentRequest } from "../agent";
import { queryAzureResourceGraph } from "../argQuery/queryAzureResourceGraph";
import { getLanguageModelTokenLimit, getResponseAsStringCopilotInteraction, verbatimCopilotInteraction } from "../copilotInteractions";
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
                        outputChannel: ext.outputChannel,
                        subscriptionProvider: new VSCodeAzureSubscriptionProvider()
                    }
                }

                return await extension.runSkillCommand(command, args);
            }
        }
    ]
}
