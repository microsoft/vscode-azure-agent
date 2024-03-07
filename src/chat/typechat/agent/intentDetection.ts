import { createTypeScriptJsonValidator } from "../ts/validate";
import { createJsonTranslator } from "../typechat";
import { typechatLanguageModel } from "./typechatModel";

const model = typechatLanguageModel;

// Act as if only functions extension work with the agent
export async function detectIntent(request: string, schema: { content: string, export: string }): Promise<any | undefined> {
    const schemaValidator = createTypeScriptJsonValidator(schema.content, schema.export);
    const schemaTranslator = createJsonTranslator(model, schemaValidator);
    const response = await schemaTranslator.translate(request);
    if (!response.success) {
        return undefined;
    } else {
        return response.data;
    }
}
