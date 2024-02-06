/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AgentRequest } from "./agent";
import { agentName } from "./agentConsts";
import { type SlashCommand, type SlashCommandHandlerResult, type SlashCommandsOwner } from "./slashCommands";

export const agentHelpCommandName = "help";

export function getAgentHelpCommand(agentSlashCommandsOwner: SlashCommandsOwner): SlashCommand {
    return [agentHelpCommandName,
        {
            shortDescription: `Get help with using the @${agentName} agent.`,
            longDescription: `Get help with using the @${agentName} agent.`,
            intentDescription: `This is not a valid option if the user asks you do to something, or if the user mentions a particular Azure service, topic, or feature. Do not pick this option unless users are asking about how to interact with you. This is best when users want to know what you can do for them or need help understanding how to interact with you. You may be referred to as "you", "this", "bot", "agent", or other similar langauge.`,
            handler: (request) => agentHelpHandler(agentSlashCommandsOwner, request)
        }];
}

async function agentHelpHandler(agentSlashCommandsOwner: SlashCommandsOwner, request: AgentRequest): Promise<SlashCommandHandlerResult> {
    const slashCommandsMarkdown = agentSlashCommandsOwner.getSlashCommands().map(([name, config]) => `- \`/${name}\` - ${config.longDescription || config.shortDescription}`).join("\n");
    request.responseStream.markdown(`Hi! I can help you learn about and develop code for Azure. Feel free to ask or tell me anything and I'll do my best to help. Or, if you know what you'd like to do, you can use the following commands:\n\n${slashCommandsMarkdown}`);
    return { chatAgentResult: {}, followUp: [] };
}
