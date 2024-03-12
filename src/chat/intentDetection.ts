/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createJsonTranslator } from "typechat";
import { createZodJsonValidator } from "typechat/zod";
import { ext } from "../extensionVariables";
import { type AgentRequest } from "./agent";
import { getResponseAsStringCopilotInteraction, getStringFieldFromCopilotResponseMaybeWithStrJson } from "./copilotInteractions";
import { summarizeHistoryThusFar } from "./summarizing";
import { typechatLanguageModel } from "./typechat/vscodeTypechatModel";
import { getZodSchema } from "./typechat/zodSchemaHelper";

export type IntentDetectionTarget = {
    name: string,
    intentDetectionDescription: string,
}

/**
 * Detect user intent using Type Chat.
 */
export async function detectIntentTypeChat(targets: IntentDetectionTarget[], request: AgentRequest): Promise<IntentDetectionTarget | undefined> {
    const schema = getZodSchema(targets);
    const validator = createZodJsonValidator(schema, "Action");
    const translator = createJsonTranslator(typechatLanguageModel, validator);
    const response = await translator.translate(request.userPrompt);
    if (response.success) {
        const data = response.data;
        const intent = (data as any).intent;
        // Note: Eventually the Zod schema will be translated to Typescript. We cannot use Typescript keywords such as "unknown", "undefinef", etc.
        if (intent === "UnknownIntent") {
            ext.outputChannel.appendLog(`Failed to detect user intent using typechat. The intent is unknown give the available targets.`);
            return undefined;
        } else {
            for (const target of targets) {
                if (target.name === intent) {
                    return target;
                }
            }
            ext.outputChannel.appendLog(`Failed to detect user intent using typechat. The intent ${intent} was not one of the expected targets.`);
            return undefined;
        }
    } else {
        ext.outputChannel.appendLog(`Failed to detect user intent using typechat. Error: ${response.message}`);
        return undefined;
    }
}

/**
 * Detect user intent using a augmented natural language prompt.
 */
export async function detectIntentNaturalLanguage(targets: IntentDetectionTarget[], request: AgentRequest): Promise<IntentDetectionTarget | undefined> {
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
