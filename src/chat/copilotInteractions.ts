/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { type AgentRequest } from "./agent";
import { agentName } from "./agentConsts";

export type CopilotInteractionOptions = {
    /**
     * What type of history to include in the context for the Copilot interaction.
     * - `"none"`: No history will be included (default)
     * - `"all"`: All history will be included
     */
    includeHistory?: "none" | "all";
};

export type CopilotInteractionResult = { copilotResponded: true, copilotResponse: string } | { copilotResponded: false, copilotResponse: undefined };

const maxCachedAccessAge = 1000 * 30;
let cachedAccess: { access: vscode.LanguageModelAccess, requestedAt: number } | undefined;
async function getLanguageModelAccess(): Promise<vscode.LanguageModelAccess> {
    if (cachedAccess === undefined || cachedAccess.access.isRevoked || cachedAccess.requestedAt < Date.now() - maxCachedAccessAge) {
        const newAccess = await vscode.chat.requestLanguageModelAccess("copilot-gpt-4", { justification: `Access to Copilot for the @${agentName} agent.` });
        cachedAccess = { access: newAccess, requestedAt: Date.now() };
    }
    return cachedAccess.access;
}

const showDebugCopilotInteractionAsProgress = false;
function debugCopilotInteraction(progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, msg: string) {
    if (showDebugCopilotInteractionAsProgress) {
        progress.report({ content: `\n\n${new Date().toISOString()} >> \`${msg.replace(/\n/g, "").trim()}\`\n\n` });
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
    }, systemPrompt, request, { includeHistory: "none", ...options });
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
    }, systemPrompt, request, { includeHistory: "none", ...options });
    debugCopilotInteraction(request.responseStream, `Copilot response:\n\n${joinedFragements}\n`);
    return joinedFragements;
}

let copilotInteractionQueueRunning = false;
type CopilotInteractionQueueItem = { onResponseFragment: (fragment: string) => void, systemPrompt: string, request: AgentRequest, options: Required<CopilotInteractionOptions>, resolve: () => void };
const copilotInteractionQueue: CopilotInteractionQueueItem[] = [];

export async function queueCopilotInteraction(onResponseFragment: (fragment: string) => void, systemPrompt: string, request: AgentRequest, options: Required<CopilotInteractionOptions>): Promise<void> {
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
    }
    copilotInteractionQueueRunning = false;
}

async function doCopilotInteraction(onResponseFragment: (fragment: string) => void, systemPrompt: string, agentRequest: AgentRequest, options: Required<CopilotInteractionOptions>): Promise<void> {
    try {
        const access = await getLanguageModelAccess();
        const messages = [
            {
                role: vscode.ChatMessageRole.System,
                content: systemPrompt
            },
            ...(options.includeHistory === "none" ? [] : agentRequest.context.history2.map((turn) => {
                return {
                    role: isRequestTurn(turn) ? vscode.ChatMessageRole.User : vscode.ChatMessageRole.Assistant,
                    content: isRequestTurn(turn) ? turn.prompt : getResponseTurnContent(turn),
                }
            })),
            {
                role: vscode.ChatMessageRole.User,
                content: agentRequest.userPrompt
            },
        ];

        debugCopilotInteraction(agentRequest.responseStream, `System Prompt:\n\n${systemPrompt}\n`);
        debugCopilotInteraction(agentRequest.responseStream, `User Content:\n\n${agentRequest.userPrompt}\n`);

        const request = access.makeChatRequest(messages, {}, agentRequest.token);
        for await (const fragment of request.stream) {
            onResponseFragment(fragment);
        }
    } catch (e) {
        debugCopilotInteraction(agentRequest.responseStream, `Failed to do copilot interaction with system prompt '${systemPrompt}'. Error: ${JSON.stringify(e)}`);
    }
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

function isRequestTurn(turn: vscode.ChatAgentRequestTurn | vscode.ChatAgentResponseTurn): turn is vscode.ChatAgentRequestTurn {
    return (turn as vscode.ChatAgentRequestTurn).prompt !== undefined;
}

function getResponseTurnContent(turn: vscode.ChatAgentResponseTurn): string {
    return turn.response.map((response) => {
        const responseContent = response.value;
        if (responseContent instanceof vscode.MarkdownString) {
            return responseContent.value;
        } else {
            return "";
        }
    }).join("\n");
}
