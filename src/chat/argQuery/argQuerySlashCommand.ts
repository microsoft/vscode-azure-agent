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

type ArgQueryResult = {
    totalRecords: number;
    count: number;
    data: any;
};

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
            const trimmedQueryResult = getTrimmedQueryResult(result.response);
            const isResultTrimmed = trimmedQueryResult.count < result.response.count;
            await summarizeQueryResponse(trimmedQueryResult, request);
            if (isResultTrimmed) {
                await displayTrimWarning(request);
            }
            await displayArgQuery(result.query, result.response, request);
        }

        return { chatAgentResult: {}, followUp: [] };
    });
}

function getSummarizeQueryResponseSystemPrompt(queryResult: ArgQueryResult) {
    return `You are an expert in Azure resources. The user has asked a question regarding their Azure resources. Answer their question using the information in this Azure Resource Graph query result:\n\n${JSON.stringify(queryResult, null, 3)}\n\nDo not mention the query or query results in your response, simply answer the question.`;
}

async function summarizeQueryResponse(queryResult: ArgQueryResult, request: AgentRequest): Promise<void> {
    const systemPrompt = getSummarizeQueryResponseSystemPrompt(queryResult);
    await verbatimCopilotInteraction(systemPrompt, request, { includeHistory: "all", progressMessage: "Getting an answer..." });
}

async function displayArgQuery(query: string, queryResponse: ResourceGraphModels.QueryResponse, request: AgentRequest): Promise<void> {
    request.responseStream.markdown(`\n\nThis information was retrieved by querying Azure Resource Graph with the following query:\n\n\`\`\`\n${query}\n\`\`\`\n`);
    request.responseStream.markdown(`\n\nYou can use the button to view the full query result.\n`);
    request.responseStream.button({
        title: "Show full query result",
        command: "azureAgent.showArgQueryResult",
        arguments: [{ queryResponse }]
    });
}

async function displayTrimWarning(request: AgentRequest) {
    request.responseStream.markdown(`\n\n> ⚠️ This answer is based on a trimmed result to prevent exceeding the language model's token limit.\n`);
}

/**
 * @todo: Find a library to handle the LLM token size limit for all interactions.
 */
const tokenLimit = 4000;

/**
 * Trims the response from an Azure Resource Graph query to avoid the summarized system prompt from being too long.
 */
function getTrimmedQueryResult(queryResponse: ResourceGraphModels.QueryResponse): ArgQueryResult {
    let count = queryResponse.count;
    let data: any = queryResponse.data;
    if (Array.isArray(data)) {
        const dataToPreserve: any = [];
        let numTokens = 0;
        // Estimate the number of tokens until it exceeds our limit
        for (let entry of data) {
            const entryTokenCount = JSON.stringify(entry).length;
            // Make sure there is at least one entry in the data
            if (numTokens > 0 && numTokens + entryTokenCount > tokenLimit) {
                break;
            } else {
                numTokens += entryTokenCount;
                dataToPreserve.push(entry);
            }
        }
        count = dataToPreserve.length;
        data = dataToPreserve;
    } else {
        // This shouldn't happen because we have specified the resultFormat to be "objectArray".
        // In case this happens, log a warning and return the query result as is.
        console.log("Unexpecte query result data format.", data);
    }
    return {
        totalRecords: queryResponse.totalRecords,
        count,
        data
    };
}
