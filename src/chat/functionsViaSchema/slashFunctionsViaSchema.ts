/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { MockFunctionsExtension } from "../commandSchema/mockFunctionsExtension";
import { slashCommandFromCommandSchema } from "../commandSchema/slashCommandFromCommandSchema";
import { getBrainstormCommand, getLearnCommand } from "../commonCommands";
import { InvokeableSlashCommands, SlashCommand, SlashCommandHandlerResult, SlashCommandOwner } from "../slashCommands";

const mockFunctionsExtension = new MockFunctionsExtension();

async function getFunctionsViaSchemaSlashCommands(): Promise<InvokeableSlashCommands> {
    const functionsViaSchemaSlashCommands: InvokeableSlashCommands = new Map([
        getBrainstormCommand({
            shortTopic: "Azure Functions",
            longTopic: "Azure Functions and/or the Azure Functions extension for VS Code",
            noInputSuggestions: [
                "How can I use Azure Functions to serve dynamic content and APIs?",
                "How can I use Azure Functions to run background jobs or scheduled tasks?",
                "How can I use Azure Functions to process files as soon as they are uploaded?",
            ]
        }),
        getLearnCommand({
            shortTopic: "Azure Functions",
            longTopic: "Azure Functions and/or the Azure Functions extension for VS Code",
            noInputSuggestions: [
                "What is the difference between Azure functions and Azure web apps?",
                "How scalable is Azure functions?",
                "Is Azure functions serverless??",
            ]
        })
    ]);

    const functionsViaSchemaApis = await mockFunctionsExtension.getCommandSchemas();
    for (const api of functionsViaSchemaApis) {
        const slashCommand = slashCommandFromCommandSchema(api, mockFunctionsExtension);
        functionsViaSchemaSlashCommands.set(slashCommand[0], slashCommand[1]);
    }

    return functionsViaSchemaSlashCommands;
}

export const functionsViaSchemaSlashCommand: SlashCommand = [
    "functions",
    {
        shortDescription: "Do something with the Azure Functions extension for VS Code",
        longDescription: "Use this command when you want to do something with the Azure Functions extension for VS Code.",
        intentDescription: "This command is best when a users prompt could be related to Azure Functions or the Azure Functions extension for VS Code.",
        handler: functionsHandler,
    }
];

async function functionsHandler(userContent: string, _ctx: vscode.ChatAgentContext, progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, token: vscode.CancellationToken): Promise<SlashCommandHandlerResult> {
    const functionsViaSchemaSlashCommands = await getFunctionsViaSchemaSlashCommands();
    const functionsViaSchemaSlashCommandOwner = new SlashCommandOwner(functionsViaSchemaSlashCommands, { noInput: giveNoInputResponse, default: giveNoInputResponse });
    return await functionsViaSchemaSlashCommandOwner.handleRequestOrPrompt(userContent, _ctx, progress, token);
}

async function giveNoInputResponse(_userContent: string, _ctx: vscode.ChatAgentContext, progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, _token: vscode.CancellationToken): Promise<SlashCommandHandlerResult> {
    progress.report({ content: `Hi! It sounds like you might be interested in using the Azure Functions Extension for VS Code, however, I can't quite help with what you're asking about. Try asking something else.` });
    return {
        chatAgentResult: {},
        followUp: [
            { message: `@azure-extensions I want to use Azure Functions to serve dynamic content and APIs.` },
            { message: `@azure-extensions I want to use Azure Functions to run background jobs or scheduled tasks.` },
            { message: `@azure-extensions I want to use Azure Functions to process files as soon as they are uploaded.` },
        ]
    };
}
