/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { agentName } from "./agentConsts";
import { IExtensionCommandSchemaProvider } from "./commandSchema/commandSchema";
import { getResponseAsStringCopilotInteraction, getStringFieldFromCopilotResponseMaybeWithStrJson } from "./copilotInteractions";
import { detectIntent } from "./intentDetection";

export async function generateExtensionCommandFollowUps(apiProvider: IExtensionCommandSchemaProvider, _userContent: string, copilotContent: string, _ctx: vscode.ChatAgentContext, progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, token: vscode.CancellationToken): Promise<vscode.InteractiveSessionReplyFollowup[]> {
    const availableCommands = await apiProvider.getCommandSchemas();
    const intentDetectionTargets = availableCommands.map((command) => ({ name: command.name, intentDetectionDescription: command.copilotStrings.intentDescription }));
    const detectedIntentionTarget = await detectIntent(copilotContent, intentDetectionTargets, _ctx, progress, token);
    const detectedCommand = availableCommands.find((command) => command.name === detectedIntentionTarget?.name);
    if (!!detectedCommand) {
        return [{ message: `@${agentName} ${detectedCommand.userStrings.actionBlurb}` }]
    }
    return [];
}

export async function generateNextQuestionsFollowUps(_userContent: string, copilotContent: string, _ctx: vscode.ChatAgentContext, progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, token: vscode.CancellationToken): Promise<vscode.InteractiveSessionReplyFollowup[]> {
    const maybeJsonCopilotResponseLanguage = await getResponseAsStringCopilotInteraction(generateNextQuestionsFollowUpsSystemPrompt1, copilotContent, progress, token);
    const copilotGeneratedFollowUpQuestions = [
        getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponseLanguage, "followUpOne")?.trim(),
        getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponseLanguage, "followUpTwo")?.trim(),
        getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponseLanguage, "followUpThree")?.trim(),
    ];
    return copilotGeneratedFollowUpQuestions
        .map((q) => {
            if (q !== undefined && q !== "") {
                return { message: `@${agentName} ${q}` };
            } else {
                return undefined;
            }
        })
        .filter((q): q is vscode.InteractiveSessionReplyFollowup => q !== undefined);
}

const generateNextQuestionsFollowUpsSystemPrompt1 = `You are an expert in Azure development. Your job is to come up with follow up questions a user might have given the following information. Think about what the user might want to do next, or what they might want to know more about. Only focus on topics related to Azure. Suggest a up to three follow up questions. Only repsond with a JSON summary of the follow up questions. Do not respond in a coverstaional tone, only JSON.

# Example 1
Text: You can create an Azure Function using the Blob Storage Trigger template in the VS Code Azure Functions extension to process files as soon as they are uploaded. You can write code to process the files, and deploy your Azure Function to your Azure subscription.
Result: { "followUpOne": "Can a blob storage trigger template be configured to trigger if any blobs under a prefix are changed?", "followUpTwo": "Can an Azure Function be triggered by changes in an Azure file share?" }

# Example 2

Text: You can create an Azure Function using the Event Grid Trigger template in the VS Code Azure Functions extension to process events from Azure Event Grid.
Result: { "followUpOne": "What other Azure services can Azure Functions be triggered by?", "followUpTwo": "What Azure services integrate well with Azure Functions?", "followUpThree": "What types of event processing can Azure Functions help with?" }

# Example 3

Text: A storage account allows you to store data remotely in Azure as blobs. The data can be accessed from anywhere in the world via HTTP or HTTPS.
Result: { "followUpOne": "How can I disable HTTP access for my storage account?", "followUpTwo": "How can I enable geo-redundancy for my storage accounts?", "followUpThree": "What is the largest size a blob can be?" }
`
