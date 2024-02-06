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
        name: "Agent Help Benchmark 5",
        prompt: "What is your purpose?",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 6",
        prompt: "I don't know if you can help me...",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 7",
        prompt: "Are you a chatbot?",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 8",
        prompt: "I'd like you to tell me about yourself",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 9",
        prompt: "Sell me on your usefulness",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 10",
        prompt: "Name everything you can help me with",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 11",
        prompt: "I want to know all about the azure agent",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 12",
        prompt: "Tell me more about this agent",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 13",
        prompt: "Give a list of things this bot is capable of",
        acceptableHandlerChains: [[agentHelpCommandName]]
    }, {
        name: "Agent Help Benchmark 14",
        prompt: "Are you who I should talk to about azure?",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 15",
        prompt: "You have one chance to convince me you are worth talking to.",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 16",
        prompt: "Talk to me please",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 17",
        prompt: "I want you to tell me everything you can do for me",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 18",
        prompt: "Give me a solid list of things that you're capable of",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 19",
        prompt: "Are you yet another useless tool?",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 20",
        prompt: "explain yourself",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 21",
        prompt: "man page",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 22",
        prompt: "Give me a tldr on this thing",
        acceptableHandlerChains: [[agentHelpCommandName]]
    },
    {
        name: "Agent Help Benchmark 23",
        prompt: "halp",
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
        name: "Default Benchmark 5",
        prompt: "Teach me about logic apps",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 6",
        prompt: "When was Azure created?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 7",
        prompt: "How many services does Azure support?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 4",
        prompt: "How many languages does Azure speech services support?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 8",
        prompt: "What types of notifications can notification hubs send?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 9",
        prompt: "What other companies does Azure Orbital Ground Station partner with?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 10",
        prompt: "Tell me about some interesting Azure services",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 11",
        prompt: "I'm new to cloud computing, give me a rundown on all things Azure",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 12",
        prompt: "Tell me a fun fact about Azure",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 13",
        prompt: "Give me the equivalent Azure service for the most popular AWS services",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 14",
        prompt: "Tell me about the advantages of using Azure over AWS or GCP",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 15",
        prompt: "Can I use Azure to create a bot like you?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 16",
        prompt: "Do I have to use VS Code to work with Azure resources?",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 17",
        prompt: "I'd rather you help me with AWS instead of Azure",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
    {
        name: "Default Benchmark 18",
        prompt: "Explain Azure in the style of a cooking show",
        acceptableHandlerChains: [[defaultSlashCommandName]]
    },
];
