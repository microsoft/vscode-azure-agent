/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { ext } from '../extensionVariables';
import { agentDescription, agentFullName, agentName, maxFollowUps } from "./agentConsts";
import { AgentBenchmarker } from "./benchmarking/benchmarking";
import { verbatimCopilotInteraction } from "./copilotInteractions";
import { functionsExtensionSlashCommandsOwner, storageExtensionSlashCommandsOwner } from "./extensionSlashCommands";
import { toggleRagSlashCommand } from "./rag";
import {
    FallbackSlashCommandHandlers,
    InvokeableSlashCommands,
    SlashCommandHandlerResult,
    SlashCommandsOwner
} from "./slashCommands";

export type AgentRequest = {
    slashCommand?: string;
    userPrompt: string;
    variables: Record<string, vscode.ChatVariableValue[]>;

    context: vscode.ChatAgentContext;
    progress: vscode.Progress<vscode.ChatAgentExtendedProgress>;
    token: vscode.CancellationToken;
}

const agentSlashCommands: InvokeableSlashCommands = new Map([
    functionsExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    storageExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    toggleRagSlashCommand,
]);
const agentFallbackSlashCommandHandlers: FallbackSlashCommandHandlers = {
    noInput: noInputHandler,
    default: defaultHandler,
};
const agentSlashCommandsOwner = new SlashCommandsOwner(agentSlashCommands, agentFallbackSlashCommandHandlers);

const agentBenchmarker = new AgentBenchmarker(agentSlashCommandsOwner);

export function registerChatAgent() {
    try {
        const agent2 = vscode.chat.createChatAgent(agentName, handler);
        agent2.description = agentDescription;
        agent2.fullName = agentFullName;
        agent2.iconPath = vscode.Uri.joinPath(ext.context.extensionUri, "resources", "azure-functions.svg");
        agent2.slashCommandProvider = { provideSlashCommands: getSlashCommands };
        agent2.followupProvider = { provideFollowups: followUpProvider };
    } catch (e) {
        console.log(e);
    }
}

async function handler(request: vscode.ChatAgentRequest, context: vscode.ChatAgentContext, progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, token: vscode.CancellationToken): Promise<vscode.ChatAgentResult2 | undefined> {
    const agentRequest: AgentRequest = { slashCommand: request.slashCommand?.name, userPrompt: request.prompt, variables: request.variables, context: context, progress: progress, token: token, };
    const handleResult = await agentBenchmarker.handleRequestOrPrompt(agentRequest) ||
        await agentSlashCommandsOwner.handleRequestOrPrompt(agentRequest);

    if (handleResult !== undefined) {
        handleResult.followUp = handleResult.followUp?.slice(0, maxFollowUps);
        return handleResult.chatAgentResult;
    } else {
        return undefined;
    }
}

function followUpProvider(result: vscode.ChatAgentResult2, token: vscode.CancellationToken): vscode.ProviderResult<vscode.ChatAgentFollowup[]> {
    return agentBenchmarker.getFollowUpForLastHandledSlashCommand(result, token) || agentSlashCommandsOwner.getFollowUpForLastHandledSlashCommand(result, token) || [];
}

function getSlashCommands(_token: vscode.CancellationToken): vscode.ProviderResult<vscode.ChatAgentSlashCommand[]> {
    return Array
        .from(agentSlashCommands.entries())
        .map(([name, config]) => ({ name: name, description: config.shortDescription }))
}

async function defaultHandler(request: AgentRequest): Promise<SlashCommandHandlerResult> {
    const defaultSystemPrompt1 = `You are an expert in using the Azure Extensions for VS Code. The user needs your help with something related to either Azure, VS Code, and/or the Azure Extensions for VS Code. Do your best to answer their question. The user is currently using VS Code and has one or more Azure Extensions for VS Code installed. Do not overwhelm the user with too much information. Keep responses short and sweet.`;

    const { copilotResponded } = await verbatimCopilotInteraction(defaultSystemPrompt1, request);
    if (!copilotResponded) {
        request.progress.report({ content: vscode.l10n.t("Sorry, I can't help with that right now.\n") });
        return { chatAgentResult: {}, followUp: [], };
    } else {
        return { chatAgentResult: {}, followUp: [], };
    }
}

async function noInputHandler(request: AgentRequest): Promise<SlashCommandHandlerResult> {
    const slashCommandsMarkdown = Array.from(agentSlashCommands).map(([name, config]) => `- \`/${name}\` - ${config.longDescription || config.shortDescription}`).join("\n");
    request.progress.report({ content: `Hi! I can help you with tasks related to Azure Functions development. If you know what you'd like to do, you can use the following commands to ask me for help:\n\n${slashCommandsMarkdown}\n\nOtherwise feel free to ask or tell me anything and I'll do my best to help.` });
    return { chatAgentResult: {}, followUp: [] };
}
