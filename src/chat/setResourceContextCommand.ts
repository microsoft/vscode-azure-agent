/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AgentRequest } from "./agent";
import { verbatimCopilotInteraction } from "./copilotInteractions";
import { SlashCommand, SlashCommandHandlerResult } from "./slashCommands";

export const setResourceContextCommandName = "setResourceContext";

export const setResourceContextCommand: SlashCommand = [
    setResourceContextCommandName,
    {
        shortDescription: `Establish the context that you wish to talk about a specific Azure resource.`,
        longDescription: `Establish the context that you wish to talk about a specific Azure resource.`,
        intentDescription: `This is best when the user says they want to talk about one of their Azure resources.`,
        handler: (request) => setResourceContextHandler(request)
    }
];

async function setResourceContextHandler(request: AgentRequest): Promise<SlashCommandHandlerResult> {
    // @todo idea: have the agent give examples of things it can do with/for the resource?
    const respondToSetResourceContextSystemPrompt = `The user is asking to talk about a specific Azure resource. Given the resource they are saying they want to talk about, let them know: you understand their request, that they are free to ask questions about the resource, and that they can ask for help doing things with the resource.`
    await verbatimCopilotInteraction(respondToSetResourceContextSystemPrompt, request);

    return { chatAgentResult: {}, followUp: [] };
};
