/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type ResourceGraphModels } from "@azure/arm-resourcegraph";
import { callWithTelemetryAndErrorHandling } from "@microsoft/vscode-azext-utils";
import { type AgentRequest } from "../agent";
import { verbatimCopilotInteraction } from "../copilotInteractions";
import { type SlashCommand, type SlashCommandHandlerResult } from "../slashCommands";
import { queryAzureResourceGraph } from "./queryAzureResourceGraph";

export const agentArgQueryCommandName = "argQuery";

export const argQueryCommand: SlashCommand = [
    agentArgQueryCommandName,
    {
        shortDescription: `Perform an ARG query from a prompt`,
        longDescription: `Perform an ARG query from a prompt`,
        intentDescription: `This is never best`,
        handler: (request) => argQueryHandler(request)
    }
];

async function argQueryHandler(request: AgentRequest): Promise<SlashCommandHandlerResult> {
    return callWithTelemetryAndErrorHandling("argQueryHandler", async (actionContext) => {
        const result = await queryAzureResourceGraph(actionContext, request.userPrompt, request);
        if (result !== undefined) {
            await summarizeQueryResponse(result.response, request);
            await displayArgQuery(result.query, request);
        }

        return { chatAgentResult: {}, followUp: [] };
    });
}

function getSummarizeQueryResponseSystemPrompt(queryResponse: ResourceGraphModels.QueryResponse) {
    return `You are an expert in Azure resources. The user has asked a question regarding their Azure resources. Answer their question using the information in this Azure Resource Graph query result:\n\n${JSON.stringify(queryResponse, null, 3)}\n\nDo not mention the query or query results in your response, simply answer the question.`;
}

async function summarizeQueryResponse(queryResponse: ResourceGraphModels.QueryResponse, request: AgentRequest): Promise<void> {
    const systemPrompt = getSummarizeQueryResponseSystemPrompt(queryResponse);
    await verbatimCopilotInteraction(systemPrompt, request, { includeHistory: "all", progressMessage: "Getting an answer..." });
}

async function displayArgQuery(query: string, request: AgentRequest): Promise<void> {
    request.responseStream.markdown(`\n\nThis information was retrieved by querying Azure Resource Graph with the following query:\n\n\`\`\`\n${query}\n\`\`\`\n`);
}
