import { error, success, type PromptSection, type Result, type TypeChatLanguageModel } from "typechat";
import * as vscode from "vscode";
import { type AgentRequest } from "../agent";
import { getResponseAsStringCopilotInteraction } from "../copilotInteractions";

/**
 * @param request Original user prompt and its context.
 */
export function getTypeChatLanguageModel(request: AgentRequest): TypeChatLanguageModel {
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
        async complete(prompt: string | PromptSection[]): Promise<Result<string>> {
            let typeChatRequest: AgentRequest;
            if (typeof prompt === "string") {
                typeChatRequest = {
                    ...request,
                    userPrompt: prompt,
                    context: {
                        history: []
                    }
                };
            } else {
                const userPrompt = prompt.at(prompt.length - 1);
                const historyPrompts = (prompt.length > 1 ? prompt.slice(0, prompt.length - 1) : []);
                const historyTurns = historyPrompts.map((prompt) => {
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
                typeChatRequest = {
                    ...request,
                    // userPrompt.content should never be empty but handle it just in case
                    userPrompt: userPrompt?.content ?? "",
                    context: {
                        history: historyTurns
                    }
                };
            }
            const result = await getResponseAsStringCopilotInteraction(systemPrompt, typeChatRequest);
            if (result) {
                return success(result);
            } else {
                return error("Failed to complete prompt.");
            }
        }
    };
}
