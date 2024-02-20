/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type BaseCommandConfig } from "@microsoft/vscode-azext-utils";
import type * as vscode from "vscode";
import { type AgentRequest } from "./agent";
import { getResponseAsStringCopilotInteraction, getStringFieldFromCopilotResponseMaybeWithStrJson } from "./copilotInteractions";
import { type AzureExtension } from "./extensions/AzureExtension";
import { detectIntent } from "./intentDetection";

export async function generateExtensionCommandFollowUpsOther(copilotContent: string, apiProvider: AzureExtension, request: AgentRequest): Promise<vscode.ChatFollowup[]> {
    const copilotContentAgentRequest: AgentRequest = { ...request, userPrompt: copilotContent, }
    const availableCommands = [
        ...await apiProvider.getWizardCommands(),
        ...await apiProvider.getSimpleCommands(),
    ];
    const intentDetectionTargets = availableCommands
        .map((command) => ({ name: command.name, intentDetectionDescription: command.intentDescription || command.displayName }));

    const detectedIntentionTarget = await detectIntent(intentDetectionTargets, copilotContentAgentRequest);
    const detectedCommand = availableCommands.find((command) => command.name === detectedIntentionTarget?.name);
    if (detectedCommand !== undefined) {
        return [{ prompt: `${detectedCommand.displayName}` }]
    }
    return [];
}

export async function generateExtensionCommandFollowUps(copilotContent: string, apiProvider: AzureExtension, request: AgentRequest): Promise<vscode.ChatFollowup[]> {
    const copilotContentAgentRequest: AgentRequest = { ...request, userPrompt: copilotContent, }
    const availableCommands = [
        ...await apiProvider.getWizardCommands(),
        ...await apiProvider.getSimpleCommands(),
    ];
    const systemPrompt = generateNextActionsFollowUpsSystemPrompt1(availableCommands);
    const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(systemPrompt, copilotContentAgentRequest);
    const action = getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "action");
    const actionPhrase = getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "actionPhrase");
    const matchingCommand = availableCommands.find((command) => command.displayName === action);

    if (action !== undefined && actionPhrase !== undefined && matchingCommand !== undefined) {
        return [{ prompt: `${actionPhrase}` }]
    }

    return [];
}

function generateNextActionsFollowUpsSystemPrompt1(actions: BaseCommandConfig[]): string {
    const actionDescriptions = actions.map((target) => `'${target.displayName}'`).join(", ")
    return `You are an expert in Azure development. Your job is to come up with a single action phrase that is associated with the next task a user would want to do after reading the given information. The action phrase should be worded as an instruction the user gives to you. The phrase should be simple. Do not mention VS Code, any tools, CLIs, or extensions. You are capabile of the following actions: ${actionDescriptions}.

    Only repsond with a JSON summary of the chosen action and action phrase. Do not respond in a coverstaional tone, only JSON.

    # Example Response 1 (able to choose a best option):
    Result: { "action": "<a name of one of the available actions>", "actionPhrase": "<an action phrase associated with the chosen availabile action>" }

    # Example Response 2 (unable to choose a best option):
    Result: { "action": "none", "actionPhrase": "" }`;
}

export async function generateNextQuestionsFollowUps(copilotContent: string, request: AgentRequest): Promise<vscode.ChatFollowup[]> {
    const copilotContentAgentRequest: AgentRequest = { ...request, userPrompt: copilotContent, }
    const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(generateNextQuestionsFollowUpsSystemPrompt1, copilotContentAgentRequest);
    const copilotGeneratedFollowUpQuestions = [
        getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "followUpOne")?.trim(),
        getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "followUpTwo")?.trim(),
        getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "followUpThree")?.trim(),
    ];
    return copilotGeneratedFollowUpQuestions
        .map((q) => {
            if (q !== undefined && q !== "") {
                return { prompt: `${q}` };
            } else {
                return undefined;
            }
        })
        .filter((q): q is vscode.ChatFollowup => q !== undefined);
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
`;

export async function generateSampleQuestionsFollowUps(topic: string, ragContent: string | undefined, request: AgentRequest): Promise<vscode.ChatFollowup[]> {
    const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(generateSampleQuestionsFollowUpsSystemPrompt(topic, ragContent), request);
    const copilotGeneratedFollowUpQuestions = [
        getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "sampleQuestionOne")?.trim(),
        getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "sampleQuestionTwo")?.trim(),
        getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "sampleQuestionThree")?.trim(),
    ];
    return copilotGeneratedFollowUpQuestions
        .map((q) => {
            if (q !== undefined && q !== "") {
                return { prompt: `${q}` };
            } else {
                return undefined;
            }
        })
        .filter((q): q is vscode.ChatFollowup => q !== undefined);
}

function generateSampleQuestionsFollowUpsSystemPrompt(topic: string, ragContent: string | undefined): string {
    const initialSection = `You are an expert in ${topic}. The user wants to use or learn about ${topic} to help them do things and solve problems. Your job is to come up with sample questions a user might have about ${topic}. Assume the the user is only interested in using cloud services from Microsoft Azure. Assume the user wants to use VS Code and/or the Azure Extensions for VS Code. Suggest up to three sample questions. Only repsond with a JSON summary of the sample questions. Do not respond in a coverstaional tone, only JSON.

    # Example Response 1
    Result: { "sampleQuestionOne": "Can a blob storage trigger template be configured to trigger if any blobs under a prefix are changed?", "sampleQuestionTwo": "Can an Azure Function be triggered by changes in an Azure file share?" }

    # Example Response 2
    Result: { "sampleQuestionOne": "What other Azure services can Azure Functions be triggered by?", "sampleQuestionTwo": "What Azure services integrate well with Azure Functions?", "sampleQuestionThree": "What types of event processing can Azure Functions help with?" }

    # Example Response 3
    Result: { "sampleQuestionOne": "How can I disable HTTP access for my storage account?", "sampleQuestionTwo": "How can I enable geo-redundancy for my storage accounts?", "sampleQuestionThree": "What is the largest size a blob can be?" }`;
    const ragSection = !ragContent ? "" : `\n\nHere is some up-to-date information about ${topic}t:\n\n${ragContent}`;
    return initialSection + ragSection;
}

