/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ResourceGraphClient, type ResourceGraphModels } from "@azure/arm-resourcegraph";
import { createHttpHeaders } from "@azure/core-rest-pipeline";
import { VSCodeAzureSubscriptionProvider, type AzureSubscription } from "@microsoft/vscode-azext-azureauth";
import { sendRequestWithTimeout, type AzExtRequestPrepareOptions } from "@microsoft/vscode-azext-azureutils";
import { type IActionContext } from "@microsoft/vscode-azext-utils";
import { type QueryAzureResourceGraphResult } from "../../../api";
import { type AgentRequest } from "../agent";

export const agentArgQueryCommandName = "argQuery";

const argGenerateQueryEndpoint = "https://management.azure.com/providers/Microsoft.ResourceGraph/generateQuery?api-version=2023-09-01-preview";

type ArgGenerateQueryRequestBody = {
    prompt: string;
    history: string[];
};

type ArgGenerateQueryResponseBody = { query?: string; };

export async function queryAzureResourceGraph(actionContext: IActionContext, prompt: string, request: AgentRequest): Promise<QueryAzureResourceGraphResult | undefined> {
    const subscriptionProvider = new VSCodeAzureSubscriptionProvider();
    const tenants = await subscriptionProvider.getTenants();
    const homeTenant = tenants.filter((t) => t.tenantCategory === "Home").at(0);
    const desiredTenantId = homeTenant?.tenantId || tenants.at(0)?.tenantId;

    if (desiredTenantId !== undefined) {
        const isSignedIn = await subscriptionProvider.isSignedIn(desiredTenantId);
        if (!isSignedIn) {
            await subscriptionProvider.signIn();
        }

        const subscriptions = await subscriptionProvider.getSubscriptions(true);
        const subscriptionForTenant = subscriptions.find(sub => sub.tenantId === desiredTenantId);
        if (subscriptionForTenant !== undefined) {
            const generateQueryResponse = await generateQuery(actionContext, prompt, subscriptionForTenant, request);
            if (generateQueryResponse?.query !== undefined) {
                const queryResponse = await queryArg(subscriptionForTenant, generateQueryResponse.query, request);
                if (queryResponse !== undefined) {
                    return { query: generateQueryResponse.query, response: queryResponse._response.parsedBody };
                }
            }
        }
    }
    return undefined;
}

async function queryArg(subscription: AzureSubscription, query: string, request: AgentRequest): Promise<ResourceGraphModels.ResourcesResponse | undefined> {
    const tokenCredential = subscription.credential;
    if (tokenCredential !== undefined) {
        request.responseStream.progress("Querying Azure Resource graph...");

        const resourceGraphClient = new ResourceGraphClient(tokenCredential);
        const response = await resourceGraphClient.resources({
            query: query,
            options: { resultFormat: "objectArray" }
        });
        return response;
    }
    return undefined;
}

async function generateQuery(context: IActionContext, prompt: string, subscription: AzureSubscription, request: AgentRequest): Promise<ArgGenerateQueryResponseBody | undefined> {
    const tokenCredential = subscription.credential;
    if (tokenCredential !== undefined) {
        const bearerToken = await tokenCredential.getToken("");
        if (bearerToken !== null) {
            request.responseStream.progress("Generating Azure Resource graph query...");

            const requestTimeout = 30 * 1000;
            const requestHeaders = createHttpHeaders({ "Authorization": `Bearer ${bearerToken.token}`, "Content-Type": "application/json" });
            const requestBody: ArgGenerateQueryRequestBody = {
                "prompt": prompt,
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
