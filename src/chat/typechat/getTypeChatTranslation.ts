/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createJsonTranslator } from "typechat";
import { createZodJsonValidator } from "typechat/zod";
import { type z } from "zod";
import { type AgentRequest } from "../agent";
import { getTypeChatLanguageModel } from "./getTypeChatLanguageModel";

export async function getTypeChatTranslation<TZodSchema extends Record<string, z.ZodType>, TTypeName extends keyof TZodSchema & string>(schema: TZodSchema, typeName: TTypeName, message: string, request: AgentRequest): Promise<z.TypeOf<TZodSchema[TTypeName]> | undefined> {
    const validator = createZodJsonValidator(schema, typeName);
    const typeChatLanguageModel = getTypeChatLanguageModel(request);
    const translator = createJsonTranslator(typeChatLanguageModel, validator);
    const response = await translator.translate(message);
    if (response.success) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return response.data;
    } else {
        return undefined;
    }
}
