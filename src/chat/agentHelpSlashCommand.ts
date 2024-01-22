/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AgentRequest } from "./agent";
import { agentName } from "./agentConsts";
import { SlashCommand, SlashCommandHandlerResult, SlashCommandsOwner } from "./slashCommands";

export const agentHelpCommandName = "help";

export function getAgentHelpCommand(agentSlashCommandsOwner: SlashCommandsOwner): SlashCommand {
    return [agentHelpCommandName,
        {
            shortDescription: `Get help with using the @${agentName} agent.`,
            longDescription: `Get help with using the @${agentName} agent.`,
            intentDescription: `This is best when users want to know what you can do for them, how you can help them, or how to best use you as an agent. You may be referred to as "you", "this", "bot" or other similar langauge. This is not the best if the user asks about or mentions a particular Azure service, topic, feature, or question.`,
            handler: (request) => agentHelpHandler(agentSlashCommandsOwner, request)
        }];
}

async function agentHelpHandler(agentSlashCommandsOwner: SlashCommandsOwner, request: AgentRequest): Promise<SlashCommandHandlerResult> {
    const slashCommandsMarkdown = agentSlashCommandsOwner.getSlashCommands().map(([name, config]) => `- \`/${name}\` - ${config.longDescription || config.shortDescription}`).join("\n");
    request.progress.report({ content: `Hi! I can help you with learn about, and develop code for Azure. Feel free to ask or tell me anything and I'll do my best to help. Or, if you know what you'd like to do, you can use the following commands to ask me for help:\n\n${slashCommandsMarkdown}` });
    return { chatAgentResult: {}, followUp: [] };
}
