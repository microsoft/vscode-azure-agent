/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AgentBenchmarkConfig } from "@microsoft/vscode-azext-utils";
import { agentHelpCommandName } from "../agentHelpSlashCommand";
import { defaultSlashCommandName } from "../slashCommands";

export const helpBenchmarks: AgentBenchmarkConfig[] = [
    {
        name: "Agent Help Benchmark 1",
        prompt: "How do I use you?",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 2",
        prompt: "What can you do?",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 3",
        prompt: "How does this bot help me?",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 4",
        prompt: "Can this thing do anything useful?",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 4",
        prompt: "What is your purpose?",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 4",
        prompt: "I don't know if you can help me...",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 4",
        prompt: "Are you a chatbot?",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 4",
        prompt: "I'd like you to tell me about yourself",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 4",
        prompt: "Sell me on your usefulness",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 4",
        prompt: "Name everything you can help me with",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 4",
        prompt: "I want to know all about the azure agent",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 4",
        prompt: "Tell me more about this agent",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
];

export const defaultBenchmarks: AgentBenchmarkConfig[] = [
    {
        name: "Default Benchmark 1",
        prompt: "Teach me about Microsoft Genomics",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 2",
        prompt: "I need to lookup my last billing statement",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 3",
        prompt: "How do I create an Power BI Embedded project?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 4",
        prompt: "What Azure services are currently in preview?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 4",
        prompt: "Teach me about logic apps",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 4",
        prompt: "When was Azure created?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 4",
        prompt: "How many services does Azure support?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 4",
        prompt: "How many languages does Azure speech services support?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 4",
        prompt: "What types of notifications can notification hubs send?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 4",
        prompt: "What other companies does Azure Orbital Ground Station partner with?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
];
