/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from "../extensionVariables";
import { type AgentRequest } from "./agent";
import { getResponseAsStringCopilotInteraction, getStringFieldFromCopilotResponseMaybeWithStrJson } from "./copilotInteractions";
import { summarizeHistoryThusFar } from "./summarizing";
import { getTypeChatTranslation } from "./typechat/getTypeChatTranslation";
import { UnknownIntentName, getZodIntentDetectionSchema } from "./typechat/zodIntentDetectionHelper";

export type IntentDetectionTarget = {
    name: string,
    intentDetectionDescription: string,
}

/**
 * Detect user intent using Type Chat.
 * @todo Change the return type so unknown intent can be distinguished from errors thrown by the language model.
 */
async function detectIntentTypeChat(targets: IntentDetectionTarget[], request: AgentRequest): Promise<IntentDetectionTarget | undefined> {
    const schema = getZodIntentDetectionSchema(targets);
    const userPromptWithSummarizedHistory = await summarizeHistoryThusFar(request);
    const translation = await getTypeChatTranslation(schema, "Action", userPromptWithSummarizedHistory, request);
    if (translation !== undefined) {
        const intent: string | undefined =
            (translation as { intent?: string | undefined; }).intent ||
            (translation as { name?: string | undefined; }).name;
        if (intent === UnknownIntentName) {
            return undefined;
        } else {
            for (const target of targets) {
                if (target.name === intent) {
                    return target;
                }
            }
            return undefined;
        }
    } else {
        return undefined;
    }
}

/**
 * Detect user intent using a augmented natural language prompt.
 * @todo Change the return type so unknown intent can be distinguished from errors thrown by the language model.
 */
async function detectIntentNaturalLanguage(targets: IntentDetectionTarget[], request: AgentRequest): Promise<IntentDetectionTarget | undefined> {
    const systemPrompt = getDetectIntentSystemPrompt1(targets.concat([{ name: "none", intentDetectionDescription: "None of the options are the best option or are applicable." }]));
    const statementForIntentDetection = await summarizeHistoryThusFar(request);
    const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(systemPrompt, { ...request, userPrompt: statementForIntentDetection });
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

export async function detectIntent(targets: IntentDetectionTarget[], request: AgentRequest): Promise<IntentDetectionTarget | undefined> {
    const naturalLanguageResult = await detectIntentNaturalLanguage(targets, request);
    const typeChatResult = await detectIntentTypeChat(targets, request);

    // Log both natural language results and typeChat results for comarison.
    ext.outputChannel.debug("Natural Language intent detection result: ", naturalLanguageResult);
    ext.outputChannel.debug("TypeChat intent detection result: ", typeChatResult);
    ext.outputChannel.debug("Result match:", naturalLanguageResult?.name === typeChatResult?.name);

    return naturalLanguageResult;
}
