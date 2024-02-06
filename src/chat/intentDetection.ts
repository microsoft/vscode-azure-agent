/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AgentRequest } from "./agent";
import { getResponseAsStringCopilotInteraction, getStringFieldFromCopilotResponseMaybeWithStrJson } from "./copilotInteractions";

export type IntentDetectionTarget = {
    name: string,
    intentDetectionDescription: string,
}

export async function detectIntent(targets: IntentDetectionTarget[], request: AgentRequest): Promise<IntentDetectionTarget | undefined> {
    const systemPrompt = getDetectIntentSystemPrompt1(targets.concat([{ name: "none", intentDetectionDescription: "None of the options are the best option or are applicable." }]));
    const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(systemPrompt, request);
    const determinedOption =
        getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "option") ||
        getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "intent");
    if (determinedOption === undefined) {
        return undefined;
    } else {
        const target = targets.find((target) => target.name === determinedOption);
        if (target === undefined) {
            return undefined;
        } else {
            return target;
        }
    }
}

function getDetectIntentSystemPrompt1(targets: IntentDetectionTarget[]) {
    const targetDescriptions = targets.map((target) => `'${target.name}' (${target.intentDetectionDescription})`).join(", ")
    return `You are an expert in determining which of the following options the user is interested, if any. Your job is to determine which option, if any, would most help the user based on their query. If none of the options are relevant pick the "none" option.

    The options are: ${targetDescriptions}.

    Only repsond with a JSON object containing the option you choose. Do not respond in a coverstaional tone, only JSON.

    # Example Response 1 (unable to choose a best option):
    Result: { "option": "none" }

    # Example Response 2 (able to choose a best option):
    Result: { "option": "<one of the non-none provided options>" }
    `;
}
