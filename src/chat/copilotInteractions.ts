/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { type AgentRequest } from "./agent";
import { agentName } from "./agentConsts";

export type CopilotInteractionOptions = {
    /**
     * What type of history (aka, users requests prior to the current one) to include in the context for the Copilot interaction.
     * - `"none"`: No history will be included (default)
     * - `"all"`: All history will be included
     * - `"requests"`: Only the user requests will be included
     */
    includeHistory?: "none" | "all" | "requests";

    /**
     * Whether or not to cache the result of the Copilot interaction. Default is `false`.
     */
    setCache?: boolean;

    /**
     * Whether or not to use the cached result of a previous Copilot interaction that matches this one. Default is `true`.
     */
    useCache?: boolean;

    /**
     * A progress message to display to the user while waiting for a response from Copilot.
     *
     * Should not be used if this interaction is being done in parallel with other interactions.
     */
    progressMessage?: string;
};

export type CopilotInteractionResult = { copilotResponded: true, copilotResponse: string } | { copilotResponded: false, copilotResponse: undefined };

const languageModelPreference: string[] = ["copilot-gpt-4", "copilot"];
const maxCachedAccessAge = 1000 * 30;
let cachedAccess: { access: vscode.LanguageModelAccess, requestedAt: number } | undefined;
async function getLanguageModelAccess(): Promise<vscode.LanguageModelAccess> {
    if (cachedAccess === undefined || cachedAccess.access.isRevoked || cachedAccess.requestedAt < Date.now() - maxCachedAccessAge) {
        const model = vscode.lm.languageModels
            .filter((model) => languageModelPreference.includes(model))
            .sort((a, b) => languageModelPreference.indexOf(a) - languageModelPreference.indexOf(b))
            .at(0) || vscode.lm.languageModels.at(0);
        if (!model) {
            throw new Error(`No language model available.`);
        }

        const newAccess = await vscode.lm.requestLanguageModelAccess(model, { justification: `Access to Copilot for the @${agentName} agent.` });
        cachedAccess = { access: newAccess, requestedAt: Date.now() };
    }
    return cachedAccess.access;
}

const showDebugCopilotInteractionAsProgress = false;
function debugCopilotInteraction(responseStream: vscode.ChatResponseStream, msg: string) {
    if (showDebugCopilotInteractionAsProgress) {
        responseStream.markdown(new vscode.MarkdownString(`\n\n${new Date().toISOString()} >> \`${msg.replace(/\n/g, "").trim()}\`\n\n`));
    }
    console.log(`${new Date().toISOString()} >> \`${msg.replace(/\n/g, "").trim()}\``);
}

/**
 * Feeds {@link systemPrompt} and {@link userContent} to Copilot and redirects the response directly to ${@link progress}.
 */
export async function verbatimCopilotInteraction(systemPrompt: string, request: AgentRequest, options?: CopilotInteractionOptions): Promise<CopilotInteractionResult> {
    let joinedFragements = "";
    await queueCopilotInteraction((fragment) => {
        joinedFragements += fragment;
        request.responseStream.markdown(fragment);
    }, systemPrompt, request, { includeHistory: "none", setCache: false, useCache: true, progressMessage: "", ...options });
    if (joinedFragements === "") {
        return { copilotResponded: false, copilotResponse: undefined };
    } else {
        return { copilotResponded: true, copilotResponse: joinedFragements };
    }
}

/**
 * Feeds {@link systemPrompt} and {@link userContent} to Copilot and directly returns its response.
 */
export async function getResponseAsStringCopilotInteraction(systemPrompt: string, request: AgentRequest, options?: CopilotInteractionOptions): Promise<string | undefined> {
    let joinedFragements = "";
    await queueCopilotInteraction((fragment) => {
        joinedFragements += fragment;
    }, systemPrompt, request, { includeHistory: "none", setCache: false, useCache: true, progressMessage: "", ...options });
    debugCopilotInteraction(request.responseStream, `Copilot response:\n\n${joinedFragements}\n`);
    return joinedFragements;
}

let copilotInteractionQueueRunning = false;
type CopilotInteractionQueueItem = { onResponseFragment: (fragment: string) => void, systemPrompt: string, request: AgentRequest, options: Required<CopilotInteractionOptions>, resolve: () => void };
const copilotInteractionQueue: CopilotInteractionQueueItem[] = [];

export async function queueCopilotInteraction(onResponseFragment: (fragment: string) => void, systemPrompt: string, request: AgentRequest, options: Required<CopilotInteractionOptions>): Promise<void> {
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
const timeBetweenCopilotInteractions = 1500
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

async function doCopilotInteraction(onResponseFragment: (fragment: string) => void, systemPrompt: string, agentRequest: AgentRequest, options: Required<CopilotInteractionOptions>): Promise<void> {
    let historyMessages: (vscode.LanguageModelUserMessage | vscode.LanguageModelAssistantMessage)[] = [];
    if (options.includeHistory === "all") {
        historyMessages = agentRequest.context.history.map((turn) => {
            return isRequestTurn(turn) ?
                new vscode.LanguageModelUserMessage(turn.prompt) :
                new vscode.LanguageModelAssistantMessage(getResponseTurnContent(turn));
        });
    } else if (options.includeHistory === "requests") {
        historyMessages = agentRequest.context.history
            .filter(isRequestTurn)
            .map((turn) => new vscode.LanguageModelUserMessage(turn.prompt));
    }

    try {
        const messages: vscode.LanguageModelMessage[] = [
            new vscode.LanguageModelSystemMessage(systemPrompt),
            ...historyMessages,
            new vscode.LanguageModelUserMessage(agentRequest.userPrompt)
        ];

        debugCopilotInteraction(agentRequest.responseStream, `System Prompt:\n\n${systemPrompt}\n`);
        debugCopilotInteraction(agentRequest.responseStream, `User Content:\n\n${agentRequest.userPrompt}\n`);

        const cacheKey = encodeCopilotInteractionToCacheKey(messages);
        if (options.useCache && copilotInteractionCache[cacheKey]) {
            debugCopilotInteraction(agentRequest.responseStream, `Using cached response...`);
            onResponseFragment(copilotInteractionCache[cacheKey].joinedResponseFragments);
            copilotInteractionCache[cacheKey].lastHit = Date.now();
        } else {
            const access = await getLanguageModelAccess();
            const request = access.makeChatRequest(messages, {}, agentRequest.token);
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

function encodeCopilotInteractionToCacheKey(messages: vscode.LanguageModelMessage[]): string {
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
        console.log(e);
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
        console.log(e);
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
        console.log(`Failed to parse copilot response maybe with string JSON, response: '${copilotResponseMaybeWithStrJson}'. Error: ${JSON.stringify(e)}`);
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
