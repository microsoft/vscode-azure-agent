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
];
