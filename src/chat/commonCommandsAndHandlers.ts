/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { type AgentRequest } from "./agent";
import { agentName } from "./agentConsts";
import { verbatimCopilotInteraction } from "./copilotInteractions";
import { generateExtensionCommandFollowUps, generateNextQuestionsFollowUps } from "./followUpGenerator";
import { getMicrosoftLearnRagContent } from "./rag";
import { type SlashCommand, type SlashCommandHandler, type SlashCommandHandlerResult } from "./slashCommands";
import { type WizardBasedExtension } from "./wizardBasedExtensionSchema/wizardBasedExtension";

export type BrainstormCommandConfig = {
    shortTopic: string;
    longTopic: string;
    noInputSuggestions: string[];
    associatedExtension?: WizardBasedExtension;
}

export function getBrainstormCommand(config: BrainstormCommandConfig): SlashCommand {
    return ["brainstorm",
        {
            shortDescription: `Brainstorm about how you can use ${config.shortTopic}`,
            longDescription: `Brainstorm about how you can use ${config.longTopic} to help you solve a problem or accomplish a task.`,
            intentDescription: `This is best when users have a question about, or want to know if or how ${config.longTopic}, can help them solve a problem or accomplish a task. For example, if they are saying phrases like 'how do I', 'is it possible', or 'how can it', this is probably the best choice.`,
            handler: (request) => brainstormHandler(config, request)
        }];
}

function brainstormHandler(config: BrainstormCommandConfig, request: AgentRequest): Promise<SlashCommandHandlerResult> {
    return callWithTelemetryAndErrorHandling("brainstormHandler", async (actionContext) => {
        if (request.userPrompt.length === 0) {
            request.progress.report({ content: `If you'd like to brainstorm about how you can use ${config.longTopic} to help you solve a problem or accomplish a task, let me know what it is you would like to do.\n` });
            return { chatAgentResult: {}, followUp: config.noInputSuggestions.map((suggestion) => ({ message: `@${agentName} ${suggestion}` })), };
        } else {
            const ragContent = await getMicrosoftLearnRagContent(actionContext, request.userPrompt);
            const { copilotResponded, copilotResponse } = await verbatimCopilotInteraction(getBrainstormSystemPrompt(config, ragContent?.content), request);
            if (!copilotResponded) {
                request.progress.report({ content: "Sorry, I can't help with that right now.\n" });
                return { chatAgentResult: {}, followUp: [], };
            } else {
                if (ragContent !== undefined) {
                    request.progress.report({ reference: vscode.Uri.parse(ragContent.contentUrl) });
                }
                const followUps: vscode.ChatAgentFollowup[] = [];
                if (config.associatedExtension !== undefined && config.associatedExtension.isInstalled()) {
                    followUps.push(...(await generateExtensionCommandFollowUps(copilotResponse, config.associatedExtension, request)));
                } else if (config.associatedExtension !== undefined && !config.associatedExtension.isInstalled()) {
                    request.progress.report({ content: `\n\nFor additional help related to ${config.longTopic}, install the ${config.associatedExtension.displayName} extension for VS Code.` });
                    followUps.push({ commandId: "workbench.extensions.search", args: [config.associatedExtension.extensionId], title: `Install ${config.associatedExtension.displayName}` });
                }
                followUps.push(...(await generateNextQuestionsFollowUps(copilotResponse, request)));

                return { chatAgentResult: {}, followUp: followUps, };
            }
        }
    });
}

function getBrainstormSystemPrompt(config: BrainstormCommandConfig, ragContent: string | undefined): string {
    const initialSection = `You are an expert in ${config.longTopic}. The user wants to use ${config.longTopic}. They want to use them to solve a problem or accomplish a task. Your job is to help the user brainstorm about how they can use ${config.longTopic} to solve a problem or accomplish a task. Do not suggest using any other tools other than what has been previously mentioned. Assume the the user is only interested in using cloud services from Microsoft Azure. Finally, do not overwhelm the user with too much information. Keep responses short and sweet.`;
    const ragSection = !ragContent ? "" : `\n\nHere is some up-to-date information about the topic the user is asking about:\n\n${ragContent}`;
    return initialSection + ragSection;
}

export type LearnCommandConfig = {
    shortTopic: string;
    longTopic: string;
    noInputSuggestions: string[];
    associatedExtension?: WizardBasedExtension;
}

export function getLearnCommand(config: LearnCommandConfig): SlashCommand {
    return ["learn",
        {
            shortDescription: `Learn about how you can use ${config.shortTopic}`,
            longDescription: `Learn more information about ${config.longTopic}`,
            intentDescription: `This is best when users want to know general information, or have basic questions, about ${config.longTopic}`,
            handler: (request: AgentRequest) => learnHandler(config, request)
        }];
}

function learnHandler(config: LearnCommandConfig, request: AgentRequest): Promise<SlashCommandHandlerResult> {
    return callWithTelemetryAndErrorHandling("learnHandler", async (actionContext) => {
        if (request.userPrompt.length === 0) {
            request.progress.report({ content: `If you want to learn more about ${config.longTopic}, simply ask me what it is you'd like to learn.\n` });
            return { chatAgentResult: {}, followUp: config.noInputSuggestions.map((suggestion) => ({ message: `@${agentName} ${suggestion}` })), };
        } else {
            const ragContent = await getMicrosoftLearnRagContent(actionContext, request.userPrompt);
            const { copilotResponded, copilotResponse } = await verbatimCopilotInteraction(getLearnSystemPrompt(config, ragContent?.content), request);
            if (!copilotResponded) {
                request.progress.report({ content: "Sorry, I can't help with that right now.\n" });
                return { chatAgentResult: {}, followUp: [], };
            } else {
                if (ragContent !== undefined) {
                    request.progress.report({ reference: vscode.Uri.parse(ragContent.contentUrl) });
                }
                const followUps: vscode.ChatAgentFollowup[] = [];
                if (config.associatedExtension !== undefined && config.associatedExtension.isInstalled()) {
                    followUps.push(...(await generateExtensionCommandFollowUps(copilotResponse, config.associatedExtension, request)));
                } else if (config.associatedExtension !== undefined && !config.associatedExtension.isInstalled()) {
                    request.progress.report({ content: `\n\nFor additional help related to ${config.longTopic}, install the ${config.associatedExtension.displayName} extension for VS Code.` });
                    followUps.push({ commandId: "workbench.extensions.search", args: [config.associatedExtension.extensionId], title: `Install the ${config.associatedExtension.displayName} Extension` });
                }
                followUps.push(...(await generateNextQuestionsFollowUps(copilotResponse, request)));

                return { chatAgentResult: {}, followUp: followUps, };
            }
        }
    });
}

function getLearnSystemPrompt(config: LearnCommandConfig, ragContent: string | undefined): string {
    const initialSection = `You are an expert in ${config.longTopic}. The user wants to use ${config.longTopic}. They want to use them to solve a problem or accomplish a task. Your job is to help the user learn about how they can use ${config.longTopic} to solve a problem or accomplish a task. Do not suggest using any other tools other than what has been previously mentioned. Assume the the user is only interested in using cloud services from Microsoft Azure. Finally, do not overwhelm the user with too much information. Keep responses short and sweet.`;
    const ragSection = !ragContent ? "" : `\n\nHere is some up-to-date information about the topic the user is asking about:\n\n${ragContent}`;
    return initialSection + ragSection;
}

export type MightBeInterestedHandlerConfig = {
    topic: string;
    suggestions: string[];
    associatedExtension?: WizardBasedExtension;
}

export function getMightBeInterestedHandler(config: MightBeInterestedHandlerConfig): SlashCommandHandler {
    return async (request: AgentRequest) => {
        request.progress.report({ content: `Hi! It sounds like you might be interested in the ${config.topic}, however, I can't quite help with what you're asking about. Try asking something else.` });

        const followUps: vscode.ChatAgentFollowup[] = [];
        if (config.associatedExtension !== undefined && !config.associatedExtension.isInstalled()) {
            request.progress.report({ content: `\n\nFor additional help related to ${config.topic}, install the ${config.associatedExtension.displayName} extension for VS Code.` });
            followUps.push({ commandId: "workbench.extensions.search", args: [config.associatedExtension.extensionId], title: `Install ${config.associatedExtension.displayName}` });
        }

        return {
            chatAgentResult: {},
            followUp: config.suggestions.map((suggestion) => ({ message: `@${agentName} ${suggestion}` }))
        };
    }
}
