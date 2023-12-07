/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { agentName } from "./agentConsts";
import { verbatimCopilotInteraction } from "./copilotInteractions";
import { SlashCommand, SlashCommandHandler, SlashCommandHandlerResult } from "./slashCommands";

export type BrainstormCommandConfig = {
    shortTopic: string;
    longTopic: string;
    noInputSuggestions: string[]
}

export function getBrainstormCommand(config: BrainstormCommandConfig): SlashCommand {
    return ["brainstorm",
        {
            shortDescription: `Brainstorm about how you can use ${config.shortTopic}`,
            longDescription: `Brainstorm about how you can use ${config.longTopic} to help you solve a problem or accomplish a task.`,
            intentDescription: `This command is best when users have a question about, or want to know if or how ${config.longTopic}, can help them solve a problem or accomplish a task. For example, if they are saying phrases like 'how do I', 'is it possible', or 'how can it', this command is probably the best choice.`,
            handler: (userContent, ctx, progress, token) => brainstormHandler(config, userContent, ctx, progress, token)
        }];
}

async function brainstormHandler(config: BrainstormCommandConfig, userContent: string, _ctx: vscode.ChatAgentContext, progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, token: vscode.CancellationToken): Promise<SlashCommandHandlerResult> {
    if (userContent.length === 0) {
        progress.report({ content: `If you'd like to brainstorm about how you can use ${config.longTopic} to help you solve a problem or accomplish a task, let me know what it is you would like to do.\n` });
        return { chatAgentResult: {}, followUp: config.noInputSuggestions.map((suggestion) => ({ message: `@${agentName} ${suggestion}` })), };
    } else {
        const { copilotResponded, /** copilotResponse */ } = await verbatimCopilotInteraction(getBrainstormSystemPrompt(config), userContent, progress, token);
        if (!copilotResponded) {
            progress.report({ content: "Sorry, I can't help with that right now.\n" });
            return { chatAgentResult: {}, followUp: [], };
        } else {
            // const followUps = await generateGeneralInteractionFollowUps(userContent, copilotResponse, ctx, progress, token);
            // return { chatAgentResult: {}, followUp: followUps, };
            return { chatAgentResult: {}, followUp: [], };
        }
    }
}

function getBrainstormSystemPrompt(config: BrainstormCommandConfig): string {
    return `You are an expert in ${config.longTopic}. The user wants to use ${config.longTopic}. They want to use them to solve a problem or accomplish a task. Your job is to help the user brainstorm about how they can use ${config.longTopic} to solve a problem or accomplish a task. Do not suggest using any other tools other than what has been previously mentioned. Assume the the user is only interested in using cloud services from Microsoft Azure. Finally, do not overwhelm the user with too much information. Keep responses short and sweet.`;
}

export type LearnCommandConfig = {
    shortTopic: string;
    longTopic: string;
    noInputSuggestions: string[]
}

export function getLearnCommand(config: LearnCommandConfig): SlashCommand {
    return ["learn",
        {
            shortDescription: `Learn about how you can use ${config.shortTopic}`,
            longDescription: `Learn more information about ${config.longTopic}`,
            intentDescription: `This command is best when users want to know general information, or have basic questions, about ${config.longTopic}`,
            handler: (userContent, ctx, progress, token) => learnHandler(config, userContent, ctx, progress, token)
        }];
}

async function learnHandler(config: LearnCommandConfig, userContent: string, _ctx: vscode.ChatAgentContext, progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, token: vscode.CancellationToken): Promise<SlashCommandHandlerResult> {
    if (userContent.length === 0) {
        progress.report({ content: `If you want to learn more about ${config.longTopic}, simply ask me what it is you'd like to learn.\n` });
        return { chatAgentResult: {}, followUp: config.noInputSuggestions.map((suggestion) => ({ message: `@${agentName} ${suggestion}` })), };
    } else {
        const { copilotResponded, /** copilotResponse */ } = await verbatimCopilotInteraction(getLearnSystemPrompt(config), userContent, progress, token);
        if (!copilotResponded) {
            progress.report({ content: "Sorry, I can't help with that right now.\n" });
            return { chatAgentResult: {}, followUp: [], };
        } else {
            // const followUps = await generateGeneralInteractionFollowUps(userContent, copilotResponse, ctx, progress, token);
            // return { chatAgentResult: {}, followUp: followUps, };
            return { chatAgentResult: {}, followUp: [], };
        }
    }
}

function getLearnSystemPrompt(config: LearnCommandConfig): string {
    return `You are an expert in ${config.longTopic}. The user wants to use ${config.longTopic}. They want to use them to solve a problem or accomplish a task. Your job is to help the user learn about how they can use ${config.longTopic} to solve a problem or accomplish a task. Do not suggest using any other tools other than what has been previously mentioned. Assume the the user is only interested in using cloud services from Microsoft Azure. Finally, do not overwhelm the user with too much information. Keep responses short and sweet.`;
}

export type MightBeInterestedHandlerConfig = {
    topic: string;
    suggestions: string[];
}

export function getMightBeInterestedHandler(config: MightBeInterestedHandlerConfig): SlashCommandHandler {
    return async (_userContent: string, _ctx: vscode.ChatAgentContext, progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, _token: vscode.CancellationToken) => {
        progress.report({ content: `Hi! It sounds like you might be interested in the ${config.topic}, however, I can't quite help with what you're asking about. Try asking something else.` });
        return {
            chatAgentResult: {},
            followUp: config.suggestions.map((suggestion) => ({ message: `@${agentName} ${suggestion}` }))
        };
    }
}
