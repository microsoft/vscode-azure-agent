/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling, type BaseCommandConfig } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { type AgentRequest } from "./agent";
import { verbatimCopilotInteraction } from "./copilotInteractions";
import { type AzureExtension } from "./extensions/AzureExtension";
import { generateExtensionCommandFollowUps, generateNextQuestionsFollowUps } from "./followUpGenerator";
import { getMicrosoftLearnRagContent } from "./rag";
import { type SlashCommand, type SlashCommandHandler, type SlashCommandHandlerResult } from "./slashCommands";
import { summarizeHistoryThusFar } from "./summarizing";

export type LearnCommandConfig = {
    topic: string;
    noInputSuggestions?: string[];
    /**
     * @deprecated
     * @todo dynamically determine the associated extension based on the prompt/answer
     */
    associatedExtension?: AzureExtension;
}

export const learnCommandName = "learn";

export function getLearnCommand(config: LearnCommandConfig): SlashCommand {
    return [learnCommandName,
        {
            shortDescription: `Learn about how you can use ${config.topic}`,
            longDescription: `Learn more information about ${config.topic}`,
            intentDescription: `This is best when users ask a question, don't understand something, want you to show them something, ask how to do something, or anything like that; about or related to ${config.topic}. This is not a good option if the user asks you to explicitly do an action, like creating something, starting something, deploying something, etc.`,
            handler: (request: AgentRequest) => learnHandler(config, request)
        }];
}

function learnHandler(config: LearnCommandConfig, request: AgentRequest): Promise<SlashCommandHandlerResult> {
    return callWithTelemetryAndErrorHandling("learnHandler", async (actionContext) => {
        if (request.userPrompt.length === 0) {
            request.responseStream.markdown(`If you want to learn more about ${config.topic}, simply ask me what it is you'd like to learn.\n`);
            return { chatAgentResult: {}, followUp: config.noInputSuggestions?.map((suggestion) => ({ prompt: `${suggestion}` })), };
        } else {
            const questionForRagContent = await summarizeHistoryThusFar(request);
            const ragContent = await getMicrosoftLearnRagContent(actionContext, questionForRagContent, request);
            const availableCommands: BaseCommandConfig[] = config.associatedExtension !== undefined ? [
                ...await config.associatedExtension.getWizardCommands(),
                ...await config.associatedExtension.getSimpleCommands(),
            ] : [];
            const systemPrompt = getLearnSystemPrompt(config, ragContent?.content, availableCommands);

            const { copilotResponded, copilotResponse } = await verbatimCopilotInteraction(systemPrompt, request, { includeHistory: "all", progressMessage: "Getting an answer..." });
            if (!copilotResponded) {
                request.responseStream.markdown("Sorry, I can't help with that right now.\n");
                return { chatAgentResult: {}, followUp: [], };
            } else {
                if (ragContent !== undefined) {
                    request.responseStream.reference(vscode.Uri.parse(ragContent.contentUrl));
                }
                const followUps: vscode.ChatFollowup[] = [];
                if (config.associatedExtension !== undefined && config.associatedExtension.isInstalled()) {
                    followUps.push(...(await generateExtensionCommandFollowUps(copilotResponse, config.associatedExtension, request)));
                } else if (config.associatedExtension !== undefined && !config.associatedExtension.isInstalled()) {
                    request.responseStream.markdown(`\n\nFor additional help related to ${config.topic}, install the ${config.associatedExtension.extensionDisplayName} extension for VS Code.`);

                    request.responseStream.button({ title: `Install the ${config.associatedExtension.extensionDisplayName} Extension`, command: "workbench.extensions.search", arguments: [config.associatedExtension.extensionId] });
                }
                followUps.push(...(await generateNextQuestionsFollowUps(copilotResponse, request)));

                return { chatAgentResult: {}, followUp: followUps, };
            }
        }
    });
}

function getLearnSystemPrompt(config: LearnCommandConfig, ragContent: string | undefined, _availableCommands: BaseCommandConfig[]): string {
    const initialSection = `You are an expert in ${config.topic}. The user wants to use ${config.topic}. They ultimately want to use ${config.topic} to solve a problem or accomplish a task. Your job is to help the user learn about how they can use ${config.topic} to solve a problem or accomplish a task. Assume that the user has already downloaded and installed VS Code. Assume the the user is only interested in using cloud services from Microsoft Azure. If they ask to see how to do something that would involve writing code, consider giving code examples to help them. If you end up using different or more accurate terminology than the user, specifically highlight why you used different terminology. Most importantly, try to not overwhelm the user with too much information. Keep responses short and sweet.`;

    const ragSection = !ragContent ? "" : `\n\nHere is some up-to-date information about the topic the user is asking about:\n\n${ragContent}\n\nMake use of this information when coming up with a reply to the user.`;

    // const availableCommandsDescription = availableCommands
    //     .map((command) => `- ${command.displayName}`)
    //     .join("\n");
    // const availableCommandsSection = availableCommandsDescription.length === 0 ? "" : `\n\nHere are some actions you can offer to the user to help them solve their problem or accomplish their goal:\n\n${availableCommandsDescription}\n\nA user can make use of these actions by asking you to perform them. Instead of, or in addition to, telling a user to use a different tool to perform one of these actions, consider telling them to ask you to do the action instead.`;

    return initialSection + ragSection;
}

export type DefaultAzureExtensionCommandConfig = {
    associatedExtension: AzureExtension;
};

export function getDefaultAzureExtensionCommandHandler(config: DefaultAzureExtensionCommandConfig): SlashCommandHandler {
    return async (request: AgentRequest) => {
        const followUps: vscode.ChatFollowup[] = [];
        if (!config.associatedExtension.isInstalled()) {
            request.responseStream.markdown(`In order to help you I'd need to use the ${config.associatedExtension.extensionDisplayName} extension. However it is not currently installed.`);
            request.responseStream.button({ title: `Install the ${config.associatedExtension.extensionDisplayName} Extension`, command: "workbench.extensions.search", arguments: [config.associatedExtension.extensionId] });
        } else {
            request.responseStream.markdown(`It sounds like you are interested in the ${config.associatedExtension.extensionDisplayName} extension, however, I can't quite help with what you're asking about. Try asking something else.`);
        }
        return { chatAgentResult: {}, followUp: followUps, };
    }
}
