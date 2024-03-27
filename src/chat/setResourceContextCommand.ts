/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AgentRequest } from "./agent";
import { getResponseAsStringCopilotInteraction } from "./copilotInteractions";
import { type SlashCommand, type SlashCommandHandlerResult, type SlashCommandsOwner } from "./slashCommands";

export const setResourceContextCommandName = "setResourceContext";

export function getSetResourceContextCommand(agentSlashCommandsOwner: SlashCommandsOwner): SlashCommand {
    return [
        setResourceContextCommandName,
        {
            shortDescription: `Establish the context that you wish to talk about a specific Azure resource.`,
            longDescription: `Establish the context that you wish to talk about a specific Azure resource.`,
            intentDescription: `This is best when the user says they want to talk about one of their Azure resources.`,
            handler: (request) => setResourceContextHandler(agentSlashCommandsOwner, request)
        }
    ];
}

async function setResourceContextHandler(agentSlashCommandsOwner: SlashCommandsOwner, request: AgentRequest): Promise<SlashCommandHandlerResult> {
    const respondToSetResourceContextSystemPrompt = `The user is asking to talk about a specific Azure resource. Given the resource they are saying they want to talk about, let them know: you understand their request, that they are free to ask questions about the resource, and that they can ask for help doing things with the resource.`
    const introParagraph = await getResponseAsStringCopilotInteraction(respondToSetResourceContextSystemPrompt, request);

    const slashCommands = await agentSlashCommandsOwner.getSlashCommands();
    const slashCommandsList = Array.from(slashCommands.entries()).map((entry) => `${entry[0]} (${entry[1].intentDescription || entry[1].shortDescription})`).join(", ");
    const suggestIdeasBasedOnResourceTypeSystemPrompt = `Here are a list of things you can do: ${slashCommandsList}. Given the type of resource the user is asking to talk about, suggest some things they can you ask for help with. Word the suggestions in natural language senteneces, where you tell the user what they can ask you to do. For example: "You can ask me to...". Do not use the name of things directly. Only suggest things specific to the type of resource. Do not suggest something that applies in a general sense. Format your response as a markdown list. Only respond with the markdown list. Do not include any other content in your response other than the list.`;
    const suggestionsList = await getResponseAsStringCopilotInteraction(suggestIdeasBasedOnResourceTypeSystemPrompt, request);

    request.responseStream.markdown(introParagraph || "Got it! Ask me whatever you'd like.");
    if (suggestionsList !== undefined) {
        request.responseStream.markdown("\n\nHere's some ideas for how I can help:\n");
        request.responseStream.markdown(suggestionsList);
    }

    return { chatAgentResult: {}, followUp: [] };
}
