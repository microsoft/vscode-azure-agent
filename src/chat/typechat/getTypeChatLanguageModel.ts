import { error, success, type PromptSection, type Result, type TypeChatLanguageModel } from "typechat";
import * as vscode from "vscode";
import { type TypeChatTranslationOptions } from "../../../api";
import { type AgentRequest } from "../agent";
import { getResponseAsStringCopilotInteraction } from "../copilotInteractions";

/**
 * @param request Original user prompt and its context.
 */
export function getTypeChatLanguageModel(request: AgentRequest, options?: TypeChatTranslationOptions): TypeChatLanguageModel {
    // Leave properties that TypeChat doesn't use as blank to reduce noise.
    // TypeChat doesn't use the system prompt so leave it blank.
    const systemPrompt = "";
    const command = "";
    // @todo: Pull the name and the id of the extension
    const participant: string = "";
    return {
        // Before calling TypeChat, we have already summarized the conversation history including the latest user prompt.
        // TypeChat will call this function with a further augmented user prompt and optionally assistant prompts if it needs to repair the response.
        // If there are multiple prompts, the first prompt will be the oldest prompt and the prompts will be interleaving user prompts and assistance prompts.
        // e.g. [1st_user_prompt, 1st_assistance_prompt (aka. Response of the 1st_user_prompt), 2nd_user_prompt]
        async complete(typeChatPrompt: string | PromptSection[]): Promise<Result<string>> {
            let typeChatRequest: AgentRequest;
            if (typeof typeChatPrompt === "string") {
                typeChatRequest = {
                    ...request,
                    userPrompt: typeChatPrompt,
                    context: {
                        history: []
                    }
                };
            } else {
                const typeChatUserPrompt = typeChatPrompt.at(typeChatPrompt.length - 1);
                const typeChatHistoryPrompts = (typeChatPrompt.length > 1 ? typeChatPrompt.slice(0, typeChatPrompt.length - 1) : []);
                const typeChatHistoryTurns = typeChatHistoryPrompts.map((prompt) => {
                    if (prompt.role === "user") {
                        const requestTurn: vscode.ChatRequestTurn = { prompt: prompt.content, command, variables: [], participant };
                        return requestTurn;
                    } else if (prompt.role === "assistant") {
                        const response = [{
                            value: new vscode.MarkdownString(prompt.content)
                        }];
                        const responseTurn: vscode.ChatResponseTurn = {
                            response: response, result: {}, participant, command
                        };
                        return responseTurn;
                    } else {
                        return undefined;
                    }
                }).filter((turn): turn is (vscode.ChatRequestTurn | vscode.ChatResponseTurn) => !!turn);

                let history: (vscode.ChatRequestTurn | vscode.ChatResponseTurn)[];
                if (options?.includeHistory === "all") {
                    history = request.context.history.concat(typeChatHistoryTurns);
                } else {
                    history = typeChatHistoryTurns;
                }

                typeChatRequest = {
                    ...request,
                    // userPrompt.content should never be empty but handle it just in case
                    userPrompt: typeChatUserPrompt?.content ?? "",
                    context: { history: history }
                };
            }
            const result = await getResponseAsStringCopilotInteraction(systemPrompt, typeChatRequest, { includeHistory: "all" });
            if (result) {
                return success(result);
            } else {
                return error("Failed to complete prompt.");
            }
        }
    };
}
