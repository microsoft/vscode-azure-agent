/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import * as vscode from "vscode";
import { ext } from '../extensionVariables';
import { agentDescription, agentFullName, agentName, maxFollowUps } from "./agentConsts";
import { agentHelpCommandName, getAgentHelpCommand } from "./agentHelpSlashCommand";
import { defaultBenchmarks, helpBenchmarks } from "./benchmarking/agentBenchmarks";
import { AgentBenchmarker } from "./benchmarking/benchmarking";
import { getLearnCommand } from "./commonCommandsAndHandlers";
import { appServiceExtensionSlashCommandsOwner, containerAppsExtensionSlashCommandsOwner, databasesExtensionCosmosDbSlashCommandsOwner, databasesExtensionPostgreSQLSlashCommandsOwner, functionsExtensionSlashCommandsOwner, staticWebAppsExtensionSlashCommandsOwner, storageExtensionSlashCommandsOwner, virtualMachinesExtensionSlashCommandsOwner } from "./extensions/extensions";
import { getRagStatusSlashCommand, toggleRagSlashCommand } from "./rag";
import { SlashCommandsOwner, type SlashCommandHandlerResult } from "./slashCommands";

export type AgentRequest = {
    slashCommand?: string;
    userPrompt: string;
    variables: Record<string, vscode.ChatVariableValue[]>;

    context: vscode.ChatAgentContext;
    responseStream: vscode.ChatAgentResponseStream;
    token: vscode.CancellationToken;
}

export interface IAgentRequestHandler {
    handleRequestOrPrompt(request: AgentRequest): Promise<SlashCommandHandlerResult>;
    getFollowUpForLastHandledSlashCommand(result: vscode.ChatAgentResult2, token: vscode.CancellationToken): vscode.ChatAgentFollowup[] | undefined;
}

/**
 * Owns slash commands that are knowingly exposed to the user.
 */
const agentSlashCommandsOwner = new SlashCommandsOwner({ noInput: agentHelpCommandName, default: getLearnCommand({ topic: "Azure" })[1].handler, });
agentSlashCommandsOwner.addInvokeableSlashCommands(new Map([
    appServiceExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    containerAppsExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    databasesExtensionCosmosDbSlashCommandsOwner.getTopLevelSlashCommand(),
    databasesExtensionPostgreSQLSlashCommandsOwner.getTopLevelSlashCommand(),
    functionsExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    staticWebAppsExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    storageExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    virtualMachinesExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    getAgentHelpCommand(agentSlashCommandsOwner),
]));

/**
 * Owns slash commands that are hidden from the user and related to benchmarking the agent.
 */
const agentBenchmarker = new AgentBenchmarker(agentSlashCommandsOwner);
agentBenchmarker.addBenchmarkConfigs(
    ...helpBenchmarks,
    ...defaultBenchmarks,
);
agentBenchmarker.addExtensionsToBenchmark(
    appServiceExtensionSlashCommandsOwner.getExtension(),
    containerAppsExtensionSlashCommandsOwner.getExtension(),
    databasesExtensionCosmosDbSlashCommandsOwner.getExtension(),
    databasesExtensionPostgreSQLSlashCommandsOwner.getExtension(),
    functionsExtensionSlashCommandsOwner.getExtension(),
    staticWebAppsExtensionSlashCommandsOwner.getExtension(),
    storageExtensionSlashCommandsOwner.getExtension(),
    virtualMachinesExtensionSlashCommandsOwner.getExtension(),
);

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

async function handler(request: vscode.ChatAgentRequest, context: vscode.ChatAgentContext, response: vscode.ChatAgentExtendedResponseStream, token: vscode.CancellationToken): Promise<vscode.ChatAgentResult2 | undefined> {
    const agentRequest: AgentRequest = {
        slashCommand: request.subCommand,
        userPrompt: request.prompt,
        variables: request.variables,
        context: context,
        responseStream: { ...response, button: (command) => response.markdown(`\n\n**[${command.title}]**\n\n`) },
        token: token,
    };
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
