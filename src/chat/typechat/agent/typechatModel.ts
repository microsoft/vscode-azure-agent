import * as vscode from "vscode";
import { Result, success } from "../result";

export type CopilotInteractionResult = { copilotResponded: true, copilotResponse: string } | { copilotResponded: false, copilotResponse: undefined };

export const typechatLanguageModel = {
    async complete(prompt: string): Promise<Result<string>> {
        const messages = [
            new vscode.LanguageModelChatUserMessage(prompt)
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
        } catch (error) {
            console.log("Failed to complete prompt", error);
            return error("Failed to complete prompt.");
        }
    }
}
