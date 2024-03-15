/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type SkillCommandArgs, type SkillCommandConfig } from "../../../api";
import { type AgentRequest } from "../agent";
import { queryAzureResourceGraph } from "../argQuery/queryAzureResourceGraph";
import { getResponseAsStringCopilotInteraction, verbatimCopilotInteraction } from "../copilotInteractions";
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
                        getResponseAsStringLanguageModelInteraction: getResponseAsStringCopilotInteraction,
                        queryAzureResourceGraph: queryAzureResourceGraph,
                        getTypeChatTranslation: getTypeChatTranslation,
                    }
                }
                await extension.runSkillCommand(command, args)

                // @todo: consider letting skill commands return results/followups
                return { chatAgentResult: {}, followUp: [] };
            }
        }
    ]
}
