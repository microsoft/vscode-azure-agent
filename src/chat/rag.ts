/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createHttpHeaders } from "@azure/core-rest-pipeline";
import { ClientSecretCredential } from "@azure/identity";
// See https://github.com/Azure/azure-sdk-for-js/issues/28877
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { AzureKeyCredential, OpenAIClient } from "@azure/openai";
import { sendRequestWithTimeout, type AzExtRequestPrepareOptions } from "@microsoft/vscode-azext-azureutils";
import { type IActionContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../extensionVariables";
import { type AgentRequest } from "./agent";
import { type SlashCommand, type SlashCommandHandlerResult } from "./slashCommands";

const microsoftLearnEndpoint = "https://learn.microsoft.com/api/knowledge/vector/document/relevantItems";
const microsoftLearnScopes = ["api://5405974b-a0ac-4de0-80e0-9efe337ea291/.default"];

const expectedOpenAiConfigVersion = "1.0";
type OpenAiConfig = {
    version: typeof expectedOpenAiConfigVersion;
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

const expectedExtensionIdentityConfigVersion = "1.0";
type ExtensionIdentityConfig = {
    version: typeof expectedExtensionIdentityConfigVersion;
    identity: ExtensionIdentity;
};

type PackageJsonWithRagConnectionInfo = {
    openAiConfigEndpoint?: string;
    extensionIdentityConfigEndpoint?: string;
};

type MicrosoftLearnKnowledgeServiceQueryResponse = {
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
            request.responseStream.markdown(`RAG is now ${newState ? "on" : "off"}.`);
            return { chatAgentResult: {}, followUp: [{ prompt: `/${getRagStatusCommand}` }] };
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
            const extensionIdentityConfigEndpoint = getExtensionIdentityConfigEndpoint();
            const openAiConfigEndpoint = getOpenAiConfigEndpoint();
            request.responseStream.markdown(`Status:\n`);
            request.responseStream.markdown(`- RAG is ${ragEnabled ? "on" : "off"}.\n`);
            request.responseStream.markdown(`- Extension identity config endpoint is: ${extensionIdentityConfigEndpoint ? extensionIdentityConfigEndpoint : "missing"}.\n`);
            request.responseStream.markdown(`- OpenAI config endpoint is: ${openAiConfigEndpoint ? openAiConfigEndpoint : "missing"}.\n`);
            return { chatAgentResult: {}, followUp: [{ prompt: `/${toggleRagCommand}` }] };
        },
    }
]

export async function getMicrosoftLearnRagContent(context: IActionContext, contentFor: string, request: AgentRequest): Promise<MicrosoftLearnKnowledgeServiceDocument | undefined> {
    if (!ragEnabled) {
        return undefined;
    }
    request.responseStream.progress(`Searching Microsoft Learn for related content...`);

    const openAiConfig = await getOpenAiConfig(context);
    if (!openAiConfig) {
        return undefined;
    }

    // Adding "Azure" to the input string to generally bias the search toward Azure docs. We can probably do better though.
    const inputEmbedding = await createAda002Embedding(openAiConfig, "Azure " + contentFor);
    if (!inputEmbedding) {
        return undefined;
    }

    const learnKnowledgeServiceResponse = await queryMicrosoftLearnKnowledgeService(context, inputEmbedding);
    return learnKnowledgeServiceResponse.at(0);
}

async function queryMicrosoftLearnKnowledgeService(context: IActionContext, inputEmbedding: number[]): Promise<MicrosoftLearnKnowledgeServiceDocument[]> {
    try {
        const extensionIdentityConfig = await getExtensionIdentityConfig(context);
        if (!extensionIdentityConfig) {
            return [];
        }

        const extensionIdentity = extensionIdentityConfig.identity;
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
        const config = response.parsedBody as OpenAiConfig | undefined;
        if (config?.version !== expectedOpenAiConfigVersion) {
            return undefined;
        } else {
            return config;
        }
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

function getOpenAiConfigEndpoint(): string | undefined {
    const envVar = process.env.VSCODE_AZURE_AGENT_OPENAI_CONFIG_ENDPOINT as string | undefined;
    const packageJson = getPackageJson();
    return packageJson.openAiConfigEndpoint as string || envVar;
}

async function getExtensionIdentityConfig(context: IActionContext): Promise<ExtensionIdentityConfig | undefined> {
    const extensionIdentityConfigEndpoint: string | undefined = getExtensionIdentityConfigEndpoint();
    if (!extensionIdentityConfigEndpoint) {
        return undefined;
    }

    try {
        const requestTimeout = 2 * 1000;
        const requestOptions: AzExtRequestPrepareOptions = { method: "GET", url: extensionIdentityConfigEndpoint };
        const response = await sendRequestWithTimeout(context, requestOptions, requestTimeout, undefined);
        const config = response.parsedBody as ExtensionIdentityConfig | undefined;
        if (config?.version !== expectedExtensionIdentityConfigVersion) {
            return undefined;
        } else {
            return config;
        }
    } catch (error) {
        console.error(error);
        return undefined;
    }
}


function getExtensionIdentityConfigEndpoint(): string | undefined {
    const envVar = process.env.VSCODE_AZURE_AGENT_EXTENSION_IDENTITY_CONFIG_ENDPOINT as string | undefined;
    const packageJson = getPackageJson();
    return packageJson.extensionIdentityConfigEndpoint as string || envVar;
}


function getPackageJson(): PackageJsonWithRagConnectionInfo {
    return ext.context.extension.packageJSON as PackageJsonWithRagConnectionInfo;
}
