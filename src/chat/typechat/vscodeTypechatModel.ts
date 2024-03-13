import { PromptSection, Result, TypeChatLanguageModel, error, success } from "typechat";
import * as vscode from "vscode";

export type CopilotInteractionResult = { copilotResponded: true, copilotResponse: string } | { copilotResponded: false, copilotResponse: undefined };

export const typeChatLanguageModel: TypeChatLanguageModel = {
    async complete(prompt: string | PromptSection[]): Promise<Result<string>> {
        let messages;
        if (typeof prompt === "string") {
            messages = [
                new vscode.LanguageModelChatUserMessage(prompt)
            ];
        } else {
            messages = prompt.map((section) => {
                if (section.role === "user") {
                    return new vscode.LanguageModelChatUserMessage(section.content);
                } else if (section.role === "system") {
                    return new vscode.LanguageModelChatSystemMessage(section.content);
                } else {
                    return new vscode.LanguageModelChatAssistantMessage(section.content);
                }
            });
        }
        const cancellationTokenSource = new vscode.CancellationTokenSource();
        try {
            const response = await vscode.lm.sendChatRequest(
                "copilot-gpt-4",
                messages,
                {},
                cancellationTokenSource.token
            );
            let responseText = "";
            for await (const fragment of response.stream) {
                responseText += fragment;
            }
            return success(responseText);
        } catch (errorThrown: unknown) {
            return error("Failed to complete prompt.");
        }
    }
}
