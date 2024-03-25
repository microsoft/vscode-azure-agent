/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { type LanguageModelInteractionOptions, type LanguageModelInteractionResult } from "../../api";
import { ext } from "../extensionVariables";
import { type AgentRequest } from "./agent";
import { agentName } from "./agentConsts";

export type LanguageModel = {
    name: string;
    contextWindowTokenLimit: number;
};
const languageModelPreference: LanguageModel[] = [
    // not yet seen/available
    { name: "copilot-gpt-4-turbo", contextWindowTokenLimit: 128000 },
    { name: "copilot-gpt-4-turbo-preview", contextWindowTokenLimit: 128000 },
    // seen/available
    { name: "copilot-gpt-4", contextWindowTokenLimit: 8192 },
    { name: "copilot-gpt-3.5-turbo", contextWindowTokenLimit: 4096 },
    // previously seen/available
    { name: "copilot", contextWindowTokenLimit: 4096 }
];

export function getLanguageModelTokenLimit(): number {
    const languageModelPreferenceNames = languageModelPreference.map((m) => m.name);
    const mostPreferredAvailableLanguageModel = vscode.lm.languageModels
        .filter((model) => languageModelPreferenceNames.includes(model))
        .sort((a, b) => languageModelPreferenceNames.indexOf(a) - languageModelPreferenceNames.indexOf(b))
        .at(0) || vscode.lm.languageModels.at(0);

    const smallestContextWindowTokenLimit = languageModelPreference.reduce((smallest, m) => m.contextWindowTokenLimit < smallest ? m.contextWindowTokenLimit : smallest, Number.MAX_SAFE_INTEGER);

    return languageModelPreference.find((m) => m.name === mostPreferredAvailableLanguageModel)?.contextWindowTokenLimit ?? smallestContextWindowTokenLimit
}

const showDebugCopilotInteractionAsProgress = false;
function debugCopilotInteraction(responseStream: vscode.ChatResponseStream, msg: string) {
    const messageToLog = msg.replace(/\n/g, "").trim();
    if (showDebugCopilotInteractionAsProgress) {
        responseStream.markdown(new vscode.MarkdownString(`\n\n${new Date().toISOString()} >> \`${messageToLog}\`\n\n`));
    }
    ext.outputChannel.debug(messageToLog);
}

/**
 * Feeds {@link systemPrompt} and {@link userContent} to Copilot and redirects the response directly to ${@link progress}.
 */
export async function verbatimCopilotInteraction(systemPrompt: string, request: AgentRequest, options?: LanguageModelInteractionOptions): Promise<LanguageModelInteractionResult> {
    let joinedFragements = "";
    await queueCopilotInteraction((fragment) => {
        joinedFragements += fragment;
        request.responseStream.markdown(fragment);
    }, systemPrompt, request, { includeHistory: "none", setCache: false, useCache: true, progressMessage: "", ...options });
    if (joinedFragements === "") {
        return { languageModelResponded: false, languageModelResponse: undefined };
    } else {
        return { languageModelResponded: true, languageModelResponse: joinedFragements };
    }
}

/**
 * Feeds {@link systemPrompt} and {@link userContent} to Copilot and directly returns its response.
 */
export async function getResponseAsStringCopilotInteraction(systemPrompt: string, request: AgentRequest, options?: LanguageModelInteractionOptions): Promise<string | undefined> {
    let joinedFragements = "";
    await queueCopilotInteraction((fragment) => {
        joinedFragements += fragment;
    }, systemPrompt, request, { includeHistory: "none", setCache: false, useCache: true, progressMessage: "", ...options });
    debugCopilotInteraction(request.responseStream, `Copilot response:\n\n${joinedFragements}\n`);
    return joinedFragements;
}

export async function getConversationAsString(request: AgentRequest): Promise<string> {
    const conversation: string[] = [
        ...request.context.history.map((turn) => {
            return isRequestTurn(turn) ?
                `User: ${new vscode.LanguageModelChatUserMessage(turn.prompt).content}` :
                `Assistant: ${new vscode.LanguageModelChatAssistantMessage(getResponseTurnContent(turn))}`;
        }),
        `User: ${request.userPrompt}`
    ];
    return conversation.join("\n\n");
}

let copilotInteractionQueueRunning = false;
type CopilotInteractionQueueItem = { onResponseFragment: (fragment: string) => void, systemPrompt: string, request: AgentRequest, options: Required<LanguageModelInteractionOptions>, resolve: () => void };
const copilotInteractionQueue: CopilotInteractionQueueItem[] = [];

async function queueCopilotInteraction(onResponseFragment: (fragment: string) => void, systemPrompt: string, request: AgentRequest, options: Required<LanguageModelInteractionOptions>): Promise<void> {
    if (options.progressMessage.length > 0) {
        request.responseStream.progress(options.progressMessage);
    }

    return new Promise<void>((resolve) => {
        copilotInteractionQueue.push({ onResponseFragment: onResponseFragment, systemPrompt: systemPrompt, request: request, options: options, resolve: resolve });
        if (!copilotInteractionQueueRunning) {
            copilotInteractionQueueRunning = true;
            void runCopilotInteractionQueue();
        }
    });
}

let lastCopilotInteractionRunTime: number = 0;
const timeBetweenCopilotInteractions = 500;
async function runCopilotInteractionQueue() {
    while (copilotInteractionQueue.length > 0) {
        const queueItem = copilotInteractionQueue.shift();
        if (queueItem === undefined) {
            continue;
        }

        const timeSinceLastCopilotInteraction = Date.now() - lastCopilotInteractionRunTime;
        if (timeSinceLastCopilotInteraction < timeBetweenCopilotInteractions) {
            await new Promise((resolve) => setTimeout(resolve, timeBetweenCopilotInteractions - timeSinceLastCopilotInteraction));
        }

        lastCopilotInteractionRunTime = Date.now();

        await doCopilotInteraction(queueItem.onResponseFragment, queueItem.systemPrompt, queueItem.request, queueItem.options);
        queueItem.resolve();
        clearOldEntriesFromCopilotInteractionCache();
    }
    copilotInteractionQueueRunning = false;
}

const maxCachedInteractionAge = 1000 * 30;
const copilotInteractionCache: { [key: string]: { lastHit: number, joinedResponseFragments: string } } = {};

async function doCopilotInteraction(onResponseFragment: (fragment: string) => void, systemPrompt: string, agentRequest: AgentRequest, options: Required<LanguageModelInteractionOptions>): Promise<void> {
    let historyMessages: (vscode.LanguageModelChatUserMessage | vscode.LanguageModelChatAssistantMessage)[] = [];
    if (options.includeHistory === "all") {
        historyMessages = agentRequest.context.history.map((turn) => {
            return isRequestTurn(turn) ?
                new vscode.LanguageModelChatUserMessage(turn.prompt) :
                new vscode.LanguageModelChatAssistantMessage(getResponseTurnContent(turn));
        });
    } else if (options.includeHistory === "requests") {
        historyMessages = agentRequest.context.history
            .filter(isRequestTurn)
            .map((turn) => new vscode.LanguageModelChatUserMessage(turn.prompt));
    }

    try {
        const messages: vscode.LanguageModelChatMessage[] = [
            new vscode.LanguageModelChatSystemMessage(systemPrompt),
            ...historyMessages,
            new vscode.LanguageModelChatUserMessage(agentRequest.userPrompt)
        ];

        debugCopilotInteraction(agentRequest.responseStream, `System Prompt:\n\n${systemPrompt}\n`);
        debugCopilotInteraction(agentRequest.responseStream, `History:\n\n${historyMessages.map((m) => `(${m instanceof vscode.LanguageModelChatUserMessage ? "user" : "assistant"})>${m.content}`).join("\n")}\n`);
        debugCopilotInteraction(agentRequest.responseStream, `User Content:\n\n${agentRequest.userPrompt}\n`);

        const cacheKey = encodeCopilotInteractionToCacheKey(messages);
        if (options.useCache && copilotInteractionCache[cacheKey]) {
            debugCopilotInteraction(agentRequest.responseStream, `Using cached response...`);
            onResponseFragment(copilotInteractionCache[cacheKey].joinedResponseFragments);
            copilotInteractionCache[cacheKey].lastHit = Date.now();
        } else {
            const languageModelPreferenceNames = languageModelPreference.map((m) => m.name);
            const chatRequestModel = vscode.lm.languageModels
                .filter((model) => languageModelPreferenceNames.includes(model))
                .sort((a, b) => languageModelPreferenceNames.indexOf(a) - languageModelPreferenceNames.indexOf(b))
                .at(0) || vscode.lm.languageModels.at(0);
            const chatRequestOptions = { justification: `Access to Copilot for the @${agentName} agent.` };
            const request = await vscode.lm.sendChatRequest(chatRequestModel as string, messages, chatRequestOptions, agentRequest.token)

            for await (const fragment of request.stream) {
                if (options.setCache) {
                    if (!copilotInteractionCache[cacheKey]) {
                        copilotInteractionCache[cacheKey] = { lastHit: Date.now(), joinedResponseFragments: "" };
                    }
                    copilotInteractionCache[cacheKey].joinedResponseFragments += fragment;
                }
                onResponseFragment(fragment);
            }
        }
    } catch (e) {
        debugCopilotInteraction(agentRequest.responseStream, `Failed to do copilot interaction with system prompt '${systemPrompt}'. Error: ${JSON.stringify(e)}`);
    }
}

function clearOldEntriesFromCopilotInteractionCache() {
    for (const cacheKey in copilotInteractionCache) {
        if (copilotInteractionCache[cacheKey].lastHit < Date.now() - maxCachedInteractionAge) {
            delete copilotInteractionCache[cacheKey];
        }
    }
}

function encodeCopilotInteractionToCacheKey(messages: vscode.LanguageModelChatMessage[]): string {
    return Buffer.from(JSON.stringify(messages)).toString("base64");
}

/**
 * Gets a string field from a Copilot response that may contain a stringified JSON object.
 * @param copilotResponseMaybeWithStrJson The Copilot response that might contain a stringified JSON object.
 * @param fieldNameOrNames The name of the field to get from the stringified JSON object. Will first look for fields that are an exact match, then will look for fields that contain the {@link fieldName}.
 * @param filter An optional list of strings to filter contains-matches by if there are multiple fields that contain the {@link fieldName}.
 */
export function getStringFieldFromCopilotResponseMaybeWithStrJson(copilotResponseMaybeWithStrJson: string | undefined, fieldNameOrNames: string | string[], filter?: string[]): string | undefined {
    if (copilotResponseMaybeWithStrJson === undefined) {
        return undefined;
    }

    try {
        const parsedCopilotResponse = parseCopilotResponseMaybeWithStrJson(copilotResponseMaybeWithStrJson);
        return findPossibleValuesOfFieldFromParsedCopilotResponse(parsedCopilotResponse, fieldNameOrNames, filter)
            .find((value): value is string => value !== undefined && value !== "" && typeof value === "string");
    } catch (e) {
        ext.outputChannel.debug(`Failed to get string field from copilot response: ${JSON.stringify(e)}`);
        return undefined;
    }
}

/**
 * Gets a boolean field from a Copilot response that may contain a stringified JSON object.
 * @param copilotResponseMaybeWithStrJson The Copilot response that might contain a stringified JSON object.
 * @param fieldName The name of the field to get from the stringified JSON object. Will first look for fields that are an exact match, then will look for fields that contain the {@link fieldName}.
 * @param filter An optional list of strings to filter contains-matches by if there are multiple fields that contain the {@link fieldName}.
 */
export function getBooleanFieldFromCopilotResponseMaybeWithStrJson(copilotResponseMaybeWithStrJson: string | undefined, fieldName: string, filter?: string[]): boolean | undefined {
    if (copilotResponseMaybeWithStrJson === undefined) {
        return undefined;
    }

    try {
        const parsedCopilotResponse = parseCopilotResponseMaybeWithStrJson(copilotResponseMaybeWithStrJson);
        return findPossibleValuesOfFieldFromParsedCopilotResponse(parsedCopilotResponse, fieldName, filter)
            .filter((value): value is boolean | string => value !== undefined && (typeof value === "boolean" || typeof value === "string"))
            .map((value): string | boolean | undefined => typeof value === "boolean" ? value : value.toLowerCase() === "true" || value.toLowerCase() === "false" ? JSON.parse(value.toLowerCase()) as boolean : undefined)
            .find((value): value is boolean => value !== undefined && typeof value === "boolean");
    } catch (e) {
        ext.outputChannel.debug(`Failed to get boolean field from copilot response: ${JSON.stringify(e)}`);
        return undefined;
    }
}

function parseCopilotResponseMaybeWithStrJson(copilotResponseMaybeWithStrJson: string): { [key: string]: (string | boolean | number | object) } {
    try {
        copilotResponseMaybeWithStrJson = copilotResponseMaybeWithStrJson
            .trim()
            .replace(/\n/g, "");
        if (copilotResponseMaybeWithStrJson.indexOf("{") === -1) {
            copilotResponseMaybeWithStrJson = "{" + copilotResponseMaybeWithStrJson;
        }
        if (copilotResponseMaybeWithStrJson.endsWith(",")) {
            copilotResponseMaybeWithStrJson = copilotResponseMaybeWithStrJson.substring(0, copilotResponseMaybeWithStrJson.length - 1);
        }
        if (copilotResponseMaybeWithStrJson.indexOf("}") === -1) {
            copilotResponseMaybeWithStrJson = copilotResponseMaybeWithStrJson + "}";
        }
        const maybeJsonCopilotResponse = copilotResponseMaybeWithStrJson.substring(copilotResponseMaybeWithStrJson.indexOf("{"), copilotResponseMaybeWithStrJson.lastIndexOf("}") + 1);
        return JSON.parse(maybeJsonCopilotResponse) as { [key: string]: (string | boolean | number | object) };
    } catch (e) {
        ext.outputChannel.debug(`Failed to parse copilot response maybe with string JSON, response: '${copilotResponseMaybeWithStrJson}'. Error: ${JSON.stringify(e)}`);
        return {};
    }
}

function findPossibleValuesOfFieldFromParsedCopilotResponse(parsedCopilotResponse: { [key: string]: (string | boolean | number | object) }, fieldNameOrNames: string | string[], filter?: string[]): (string | boolean | number | object)[] {
    const filedNames = Array.isArray(fieldNameOrNames) ? fieldNameOrNames : [fieldNameOrNames];
    for (const fieldName of filedNames) {
        const exactMatches = Object.keys(parsedCopilotResponse)
            .filter((key) => key.toLowerCase() === fieldName.toLowerCase());
        const containsMatches = Object.keys(parsedCopilotResponse)
            .filter((key) => key.toLowerCase().includes(fieldName.toLowerCase()))
            .filter((key) => filter === undefined || filter.every((filterValue) => !key.toLowerCase().includes(filterValue.toLowerCase())));
        const matchValues = [...exactMatches, ...containsMatches].map((key) => parsedCopilotResponse[key]);
        if (matchValues.length > 0) {
            return matchValues;
        }
    }
    return [];
}

function isRequestTurn(turn: vscode.ChatRequestTurn | vscode.ChatResponseTurn): turn is vscode.ChatRequestTurn {
    return (turn as vscode.ChatRequestTurn).prompt !== undefined;
}

function getResponseTurnContent(turn: vscode.ChatResponseTurn): string {
    return turn.response.map((response) => {
        const responseContent = response.value;
        if (responseContent instanceof vscode.MarkdownString) {
            return responseContent.value;
        } else {
            return "";
        }
    }).join("\n");
}
