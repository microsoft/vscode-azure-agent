/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createHttpHeaders } from "@azure/core-rest-pipeline";
import { ClientSecretCredential } from "@azure/identity";
import { AzureKeyCredential, OpenAIClient } from "@azure/openai";
import { AzExtRequestPrepareOptions, sendRequestWithTimeout } from "@microsoft/vscode-azext-azureutils";
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../extensionVariables";
import { AgentRequest } from "./agent";
import { agentName } from "./agentConsts";
import { SlashCommand, SlashCommandHandlerResult } from "./slashCommands";

const microsoftLearnEndpoint = "https://learn.microsoft.com/api/knowledge/vector/document/relevantItems";
const microsoftLearnScopes = ["api://5405974b-a0ac-4de0-80e0-9efe337ea291/.default"];

type OpenAiConfig = {
    version: "1.0";
    endpoint: string;
    embeddingModel: {
        name: string;
        version: string;
    };
    key: string;
    deploymentName: string;
};

type ExtensionIdentity = {
    clientId: string;
    secret: string;
    tenant: string;
};

export type MicrosoftLearnKnowledgeServiceQueryResponse = {
    count: number;
    items: MicrosoftLearnKnowledgeServiceDocument[];
};

export type MicrosoftLearnKnowledgeServiceDocument = {
    content: string;
    contentUrl: string;
    depotName: string;
    id: string;
    lastModifiedDateTime: string;
    pageType: string;
    score: number;
    title: string;
};

let ragEnabled = true;
async function toggleRag(): Promise<boolean> {
    ragEnabled = !ragEnabled;
    return ragEnabled;
}

const toggleRagCommand = "toggleRag";
const getRagStatusCommand = "getRagStatus";

export const toggleRagSlashCommand: SlashCommand = [
    toggleRagCommand,
    {
        shortDescription: "Toggle RAG on or off",
        longDescription: "Toggle RAG on or off",
        intentDescription: "Toggle RAG on or off",
        handler: async (request: AgentRequest): Promise<SlashCommandHandlerResult> => {
            const newState = await toggleRag();
            request.progress.report({ content: `RAG is now ${newState ? "on" : "off"}.` });
            return { chatAgentResult: {}, followUp: [{ message: `@${agentName} /${getRagStatusCommand}` }] };
        },
    }
]

export const getRagStatusSlashCommand: SlashCommand = [
    getRagStatusCommand,
    {
        shortDescription: "Get RAG status",
        longDescription: "Get RAG status",
        intentDescription: "Get RAG status",
        handler: async (request: AgentRequest): Promise<SlashCommandHandlerResult> => {
            const extensionIdentity = getExtensionIdentity();
            const openAiConfigEndpoint = getOpenAiConfigEndpoint();
            request.progress.report({ content: `Status:\n` });
            request.progress.report({ content: `- RAG is ${ragEnabled ? "on" : "off"}.\n` });
            request.progress.report({ content: `- Extension identity is ${extensionIdentity ? "present" : "missing"}.\n` });
            request.progress.report({ content: `- OpenAI config endpoint is ${openAiConfigEndpoint ? "present" : "missing"}.\n` });
            return { chatAgentResult: {}, followUp: [{ message: `@${agentName} /${toggleRagCommand}` }] };
        },
    }
]

export async function getMicrosoftLearnRagContent(context: IActionContext, input: string): Promise<MicrosoftLearnKnowledgeServiceDocument | undefined> {
    if (!ragEnabled) {
        return undefined;
    }

    const openAiConfig = await getOpenAiConfig(context);
    if (!openAiConfig) {
        return undefined;
    }

    // Adding "Azure" to the input string to generall bias the search toward Azure docs. We can probably do better though.
    const inputEmbedding = await createAda002Embedding(openAiConfig, "Azure " + input);
    if (!inputEmbedding) {
        return undefined;
    }

    const learnKnowledgeServiceResponse = await queryMicrosoftLearnKnowledgeService(context, inputEmbedding);
    return learnKnowledgeServiceResponse.at(0);
}

async function queryMicrosoftLearnKnowledgeService(context: IActionContext, inputEmbedding: number[]): Promise<MicrosoftLearnKnowledgeServiceDocument[]> {
    try {
        const extensionIdentity = getExtensionIdentity();
        if (!extensionIdentity) {
            return [];
        }

        const credential = new ClientSecretCredential(extensionIdentity.tenant, extensionIdentity.clientId, extensionIdentity.secret);
        const bearerToken = await credential.getToken(microsoftLearnScopes);
        const requestTimeout = 2 * 1000;
        const requestHeaders = createHttpHeaders({ "Authorization": `Bearer ${bearerToken.token}`, "Content-Type": "application/json" });
        const requestBody = JSON.stringify({ "vector": { "values": inputEmbedding }, "top": 1 });
        const requestOptions: AzExtRequestPrepareOptions = { method: "POST", url: microsoftLearnEndpoint, headers: requestHeaders, body: requestBody };
        const response = await sendRequestWithTimeout(context, requestOptions, requestTimeout, undefined);
        const responseBody = response.parsedBody as MicrosoftLearnKnowledgeServiceQueryResponse;
        return responseBody.items;
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function createAda002Embedding(config: OpenAiConfig, input: string): Promise<number[] | undefined> {
    try {
        const client = await getOpenAiClient(config);
        const getEmbeddingsResponse = await client.getEmbeddings(config.deploymentName, [input]);
        const embedding = getEmbeddingsResponse.data.at(0)?.embedding;
        return embedding;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

async function getOpenAiClient(config: OpenAiConfig): Promise<OpenAIClient> {
    return new OpenAIClient(config.endpoint, new AzureKeyCredential(config.key));
}

async function getOpenAiConfig(context: IActionContext): Promise<OpenAiConfig | undefined> {
    const openAiConfigEndpoint: string | undefined = getOpenAiConfigEndpoint();
    if (!openAiConfigEndpoint) {
        return undefined;
    }

    try {
        const requestTimeout = 2 * 1000;
        const requestOptions: AzExtRequestPrepareOptions = { method: "GET", url: openAiConfigEndpoint };
        const response = await sendRequestWithTimeout(context, requestOptions, requestTimeout, undefined);
        return response.parsedBody as OpenAiConfig | undefined;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

function getOpenAiConfigEndpoint(): string | undefined {
    return ext.context.extension.packageJSON.openAiConfigEndpoint || process.env.OPENAI_CONFIG_ENDPOINT || undefined;
}

function getExtensionIdentity(): ExtensionIdentity | undefined {
    const envVar = process.env.VSCODE_AZURE_AGENT_IDENTITY;
    if (!!ext.context.extension.packageJSON.extensionIdentity) {
        return ext.context.extension.packageJSON.extensionIdentity;
    } else if (!!envVar) {
        return JSON.parse(envVar);
    } else {
        return undefined;
    }
}
