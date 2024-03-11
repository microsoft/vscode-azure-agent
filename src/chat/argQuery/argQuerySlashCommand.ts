/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ResourceGraphClient, type ResourceGraphModels } from "@azure/arm-resourcegraph";
import { createHttpHeaders } from "@azure/core-rest-pipeline";
import { VSCodeAzureSubscriptionProvider, type AzureSubscription } from "@microsoft/vscode-azext-azureauth";
import { sendRequestWithTimeout, type AzExtRequestPrepareOptions } from "@microsoft/vscode-azext-azureutils";
import { callWithTelemetryAndErrorHandling, type IActionContext } from "@microsoft/vscode-azext-utils";
import { type AgentRequest } from "../agent";
import { verbatimCopilotInteraction } from "../copilotInteractions";
import { type SlashCommand, type SlashCommandHandlerResult } from "../slashCommands";

export const agentArgQueryCommandName = "argQuery";

const argGenerateQueryEndpoint = "https://management.azure.com/providers/Microsoft.ResourceGraph/generateQuery?api-version=2023-09-01-preview";

type ArgGenerateQueryRequestBody = {
    prompt: string;
    history: string[];
};

type ArgGenerateQueryResponseBody = { query?: string; };

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
        const desiredSubscriptionId = "5d17327f-ed05-4b65-bfd1-f498ac160d55";
        const subscriptionProvider = new VSCodeAzureSubscriptionProvider();
        await subscriptionProvider.signIn();
        const subscriptions = await subscriptionProvider.getSubscriptions(true);
        const matchingSubscription = subscriptions.find(sub => sub.subscriptionId === desiredSubscriptionId);

        if (matchingSubscription !== undefined) {
            const generateQueryResponse = await generateQuery(actionContext, matchingSubscription, request);
            if (generateQueryResponse?.query !== undefined) {
                const queryResponse = await queryArg(matchingSubscription, generateQueryResponse.query, request);
                if (queryResponse !== undefined) {
                    await summarizeQueryResponse(queryResponse, request);
                    await displayArgQuery(generateQueryResponse.query, request);
                }
            }
        }
        return { chatAgentResult: {}, followUp: [] };
    });
}

function getSummarizeQueryResponseSystemPrompt(queryResponse: ResourceGraphModels.ResourcesResponse) {
    return `You are an expert in Azure resources. The user has asked a question regarding their Azure resources. Answer their question using the information in this Azure Resource Graph query result:\n\n${JSON.stringify(queryResponse, null, 3)}\n\nDo not mention the query or query results in your response, simply answer the question.`;
}

async function summarizeQueryResponse(queryResponse: ResourceGraphModels.ResourcesResponse, request: AgentRequest): Promise<void> {
    const systemPrompt = getSummarizeQueryResponseSystemPrompt(queryResponse);
    await verbatimCopilotInteraction(systemPrompt, request, { includeHistory: "all", progressMessage: "Getting an answer..." });
}

async function displayArgQuery(query: string, request: AgentRequest): Promise<void> {
    request.responseStream.markdown(`\n\nThis information was retrieved by querying Azure Resource Graph with the following query:\n\n\`\`\`\n${query}\n\`\`\`\n`);
}

async function queryArg(subscription: AzureSubscription, query: string, request: AgentRequest): Promise<ResourceGraphModels.ResourcesResponse | undefined> {
    const tokenCredential = subscription.credential;
    if (tokenCredential !== undefined) {
        request.responseStream.progress("Querying Azure Resource graph...");

        const resourceGraphClient = new ResourceGraphClient(tokenCredential);
        const response = await resourceGraphClient.resources({ query: query });
        return response;
    }
    return undefined;
}

async function generateQuery(context: IActionContext, subscription: AzureSubscription, request: AgentRequest): Promise<ArgGenerateQueryResponseBody | undefined> {
    const tokenCredential = subscription.credential;
    if (tokenCredential !== undefined) {
        const bearerToken = await tokenCredential.getToken("");
        if (bearerToken !== null) {
            request.responseStream.progress("Generating Azure Resource graph query...");

            const requestTimeout = 30 * 1000;
            const requestHeaders = createHttpHeaders({ "Authorization": `Bearer ${bearerToken.token}`, "Content-Type": "application/json" });
            const requestBody: ArgGenerateQueryRequestBody = {
                "prompt": request.userPrompt,
                "history": [],
            };
            const requestOptions: AzExtRequestPrepareOptions = { method: "POST", url: argGenerateQueryEndpoint, headers: requestHeaders, body: JSON.stringify(requestBody) };
            const response = await sendRequestWithTimeout(context, requestOptions, requestTimeout, undefined);
            const responseBody = response.parsedBody as ArgGenerateQueryResponseBody;
            return responseBody;
        }
    }
    return undefined;
}
