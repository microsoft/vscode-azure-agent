import { PromptSection, Result, error, success } from "typechat";
import * as vscode from "vscode";

export type CopilotInteractionResult = { copilotResponded: true, copilotResponse: string } | { copilotResponded: false, copilotResponse: undefined };

export const typechatLanguageModel = {
    async complete(prompt: PromptSection[]): Promise<Result<string>> {
        // @todo: Experiement with more advanced usage of prompts
        // such as: including history, using both system and user prompts, etc.
        const promptText = prompt[0].content;
        const messages = [
            new vscode.LanguageModelChatUserMessage(promptText)
        ];
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
