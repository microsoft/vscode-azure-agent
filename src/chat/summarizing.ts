/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AgentRequest } from "./agent";
import { getResponseAsStringCopilotInteraction } from "./copilotInteractions";

export async function summarizeHistoryThusFar(request: AgentRequest): Promise<string> {
    if (request.context.history2.length === 0) {
        return request.userPrompt;
    } else {
        const systemPrompt = summarizeHistoryToSingleQuestionSystemPrompt1;
        const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(systemPrompt, request, { includeHistory: "requests", setCache: true, useCache: true });
        return maybeJsonCopilotResponse || request.userPrompt;
    }
}

const summarizeHistoryToSingleQuestionSystemPrompt1 = `You are an expert in summarizing the current state of a conversation between a user and a virtual assistant. Your job is to provide a summary of what the user currently is asking or wants. Do not try to answer any questions the user has asked, only summarize. If they are asking a question, then phrase the summary as a question. If they are making a statement, then phrase the summar as a statment. Make sure to phrase the summary in the voice of the user, so do not say phrases like "The user is asking..." or "The user wants...". Avoid statements longer than a few sentences.`;
