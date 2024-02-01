/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import * as vscode from "vscode";
import { ext } from '../extensionVariables';
import { agentDescription, agentFullName, agentName, maxFollowUps } from "./agentConsts";
import { agentHelpCommandName, getAgentHelpCommand } from "./agentHelpSlashCommand";
import { AgentBenchmarker } from "./benchmarking/benchmarking";
import { verbatimCopilotInteraction } from "./copilotInteractions";
import { appServiceExtensionSlashCommandsOwner, functionsExtensionSlashCommandsOwner, storageExtensionSlashCommandsOwner } from "./extensions/extensions";
import { getRagStatusSlashCommand, toggleRagSlashCommand } from "./rag";
import { SlashCommandsOwner, type SlashCommandHandlerResult } from "./slashCommands";

export type AgentRequest = {
    slashCommand?: string;
    userPrompt: string;
    variables: Record<string, vscode.ChatVariableValue[]>;

    context: vscode.ChatAgentContext;
    progress: vscode.Progress<vscode.ChatAgentExtendedProgress>;
    token: vscode.CancellationToken;
}

export interface IAgentRequestHandler {
    handleRequestOrPrompt(request: AgentRequest): Promise<SlashCommandHandlerResult>;
    getFollowUpForLastHandledSlashCommand(result: vscode.ChatAgentResult2, token: vscode.CancellationToken): vscode.ChatAgentFollowup[] | undefined;
}

/**
 * Owns slash commands that are knowingly exposed to the user.
 */
const agentSlashCommandsOwner = new SlashCommandsOwner({ noInput: agentHelpCommandName, default: defaultHandler, });
agentSlashCommandsOwner.addInvokeableSlashCommands(new Map([
    functionsExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    storageExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    appServiceExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    getAgentHelpCommand(agentSlashCommandsOwner),
]));

/**
 * Owns slash commands that are hidden from the user and related to benchmarking the agent.
 */
const agentBenchmarker = new AgentBenchmarker(agentSlashCommandsOwner);

/**
 * Owns slash commands that are hidden from the user.
 */
const agentHiddenSlashCommandsOwner = new SlashCommandsOwner(
    { noInput: undefined, default: undefined },
    { disableIntentDetection: true }
);
agentHiddenSlashCommandsOwner.addInvokeableSlashCommands(new Map([toggleRagSlashCommand, getRagStatusSlashCommand]));

export function registerChatAgent() {
    try {
        const agent2 = vscode.chat.createChatAgent(agentName, handler);
        agent2.description = agentDescription;
        agent2.fullName = agentFullName;
        agent2.iconPath = vscode.Uri.joinPath(ext.context.extensionUri, "resources", "azure-color.svg");
        agent2.subCommandProvider = { provideSubCommands: getSubCommands };
        agent2.followupProvider = { provideFollowups: followUpProvider };
    } catch (e) {
        console.log(e);
    }
}

async function handler(request: vscode.ChatAgentRequest, context: vscode.ChatAgentContext, progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, token: vscode.CancellationToken): Promise<vscode.ChatAgentResult2 | undefined> {
    const agentRequest: AgentRequest = { slashCommand: request.subCommand, userPrompt: request.prompt, variables: request.variables, context: context, progress: progress, token: token, };
    const handlers = [agentHiddenSlashCommandsOwner, agentBenchmarker, agentSlashCommandsOwner];

    let handleResult: SlashCommandHandlerResult | undefined;
    for (const handler of handlers) {
        handleResult = await handler.handleRequestOrPrompt(agentRequest);
        if (handleResult !== undefined) {
            break;
        }
    }

    if (handleResult !== undefined) {
        handleResult.followUp = handleResult.followUp?.slice(0, maxFollowUps);
        return handleResult.chatAgentResult;
    } else {
        return undefined;
    }
}

function followUpProvider(result: vscode.ChatAgentResult2, token: vscode.CancellationToken): vscode.ProviderResult<vscode.ChatAgentFollowup[]> {
    const providers = [agentHiddenSlashCommandsOwner, agentBenchmarker, agentSlashCommandsOwner];

    let followUp: vscode.ChatAgentFollowup[] | undefined;
    for (const provider of providers) {
        followUp = provider.getFollowUpForLastHandledSlashCommand(result, token);
        if (followUp !== undefined) {
            break;
        }
    }
    return followUp || [];
}

function getSubCommands(_token: vscode.CancellationToken): vscode.ProviderResult<vscode.ChatAgentSubCommand[]> {
    return agentSlashCommandsOwner.getSlashCommands().map(([name, config]) => ({ name: name, description: config.shortDescription }))
}

async function defaultHandler(request: AgentRequest): Promise<SlashCommandHandlerResult> {
    const defaultSystemPrompt1 = `You are an expert in all things Azure. The user needs your help with something related to either Azure and/or the Azure Extensions for VS Code. Do your best to answer their question. The user is currently using VS Code and has one or more Azure Extensions for VS Code installed. Do not overwhelm the user with too much information. Keep responses short and sweet.`;

    const { copilotResponded } = await verbatimCopilotInteraction(defaultSystemPrompt1, request);
    if (!copilotResponded) {
        request.progress.report({ content: vscode.l10n.t("Sorry, I can't help with that right now.\n") });
        return { chatAgentResult: {}, followUp: [], };
    } else {
        return { chatAgentResult: {}, followUp: [], };
    }
}
