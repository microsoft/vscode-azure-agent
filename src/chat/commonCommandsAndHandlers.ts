/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { type AgentRequest } from "./agent";
import { agentName } from "./agentConsts";
import { verbatimCopilotInteraction } from "./copilotInteractions";
import { type WizardBasedExtension } from "./extensions/wizardBasedExtension";
import { generateExtensionCommandFollowUps, generateNextQuestionsFollowUps, generateSampleQuestionsFollowUps } from "./followUpGenerator";
import { getMicrosoftLearnRagContent } from "./rag";
import { type SlashCommand, type SlashCommandHandler, type SlashCommandHandlerResult } from "./slashCommands";

export type LearnCommandConfig = {
    topic: string;
    noInputSuggestions?: string[];
    associatedExtension?: WizardBasedExtension;
}

export function getLearnCommand(config: LearnCommandConfig): SlashCommand {
    return ["learn",
        {
            shortDescription: `Learn about how you can use ${config.topic}`,
            longDescription: `Learn more information about ${config.topic}`,
            intentDescription: `This is best when users want to know general information, or have basic questions, about ${config.topic}. This is not a good option if the user asks you to do some sort of action which you do not know how to do.`,
            handler: (request: AgentRequest) => learnHandler(config, request)
        }];
}

function learnHandler(config: LearnCommandConfig, request: AgentRequest): Promise<SlashCommandHandlerResult> {
    return callWithTelemetryAndErrorHandling("learnHandler", async (actionContext) => {
        if (request.userPrompt.length === 0) {
            request.responseStream.markdown(`If you want to learn more about ${config.topic}, simply ask me what it is you'd like to learn.\n`);
            return { chatAgentResult: {}, followUp: config.noInputSuggestions?.map((suggestion) => ({ message: `@${agentName} ${suggestion}` })), };
        } else {
            const ragContent = await getMicrosoftLearnRagContent(actionContext, request.userPrompt);
            const { copilotResponded, copilotResponse } = await verbatimCopilotInteraction(getLearnSystemPrompt(config, ragContent?.content), request);
            if (!copilotResponded) {
                request.responseStream.markdown("Sorry, I can't help with that right now.\n");
                return { chatAgentResult: {}, followUp: [], };
            } else {
                if (ragContent !== undefined) {
                    request.responseStream.reference(vscode.Uri.parse(ragContent.contentUrl));
                }
                const followUps: vscode.ChatAgentFollowup[] = [];
                if (config.associatedExtension !== undefined && config.associatedExtension.isInstalled()) {
                    followUps.push(...(await generateExtensionCommandFollowUps(copilotResponse, config.associatedExtension, request)));
                } else if (config.associatedExtension !== undefined && !config.associatedExtension.isInstalled()) {
                    request.responseStream.markdown(`\n\nFor additional help related to ${config.topic}, install the ${config.associatedExtension.extensionDisplayName} extension for VS Code.`);
                    request.responseStream.button({ title: `Install the ${config.associatedExtension.extensionDisplayName} Extension`, command: "workbench.extensions.search" });
                }
                followUps.push(...(await generateNextQuestionsFollowUps(copilotResponse, request)));

                return { chatAgentResult: {}, followUp: followUps, };
            }
        }
    });
}

function getLearnSystemPrompt(config: LearnCommandConfig, ragContent: string | undefined): string {
    const initialSection = `You are an expert in ${config.topic}. The user wants to use ${config.topic}. They want to use them to solve a problem or accomplish a task. Your job is to help the user learn about how they can use ${config.topic} to solve a problem or accomplish a task. Do not suggest using any other tools other than what has been previously mentioned. Assume the the user is only interested in using cloud services from Microsoft Azure. Finally, do not overwhelm the user with too much information. Keep responses short and sweet.`;
    const ragSection = !ragContent ? "" : `\n\nHere is some up-to-date information about the topic the user is asking about:\n\n${ragContent}`;
    return initialSection + ragSection;
}

export type MightBeInterestedHandlerConfig = {
    topic: string;
    associatedExtension?: WizardBasedExtension;
};

export function getMightBeInterestedHandler(config: MightBeInterestedHandlerConfig): SlashCommandHandler {
    return async (request: AgentRequest) => {
        return callWithTelemetryAndErrorHandling("mightBeInterested", async (actionContext) => {
            const followUps: vscode.ChatAgentFollowup[] = [];
            if (config.associatedExtension !== undefined && !config.associatedExtension.isInstalled()) {
                request.responseStream.markdown(`\n\nAlso consider installing the ${config.associatedExtension.extensionDisplayName} extension for VS Code.`);
                request.responseStream.button({ title: `Install the ${config.associatedExtension.extensionDisplayName} Extension`, command: "workbench.extensions.search" });
            }
            const ragContent = await getMicrosoftLearnRagContent(actionContext, `Getting started or learning about ${config.topic}`);
            followUps.push(...await generateSampleQuestionsFollowUps(config.topic, ragContent?.content, request));
            request.responseStream.markdown(`Hi! It sounds like you are interested in ${config.topic}, however, I can't quite help with what you're asking about. Try asking something else.`);
            return { chatAgentResult: {}, followUp: followUps, };
        });
    }
}
