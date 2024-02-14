/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { agentHelpCommandName } from "../agentHelpSlashCommand";
import { defaultSlashCommandName } from "../slashCommands";
import { type AgentBenchmarkWithStepsConfig } from "./NewBenchmarkTypes";

export const multiPromptBenchmarks: AgentBenchmarkWithStepsConfig[] = [
    {
        name: "Multi Prompt Benchmark 1",
        steps: [
            {
                prompt: "Show me how to upload to blob storage in Python?",
                acceptableHandlerChains: [["storage", "learn"]]
            },
            {
                prompt: "Actually, show me how with JavaScript please.",
                acceptableHandlerChains: [["storage", "learn"]]
            },
            {
                prompt: "Can you add some more comments to that?",
                acceptableHandlerChains: [["storage", "learn"]]
            },
            {
                prompt: "Great! Can you also help me learn about any concept that the code requires knowing aobut?",
                acceptableHandlerChains: [["storage", "learn"]]
            }
        ]
    },
    {
        name: "Multi Prompt Benchmark 2",
        steps: [
            {
                prompt: "What is are the pros and cons of Azure functions?",
                acceptableHandlerChains: [["functions", "learn"]]
            },
            {
                prompt: "Tell me more!",
                acceptableHandlerChains: [["functions", "learn"]]
            },
            {
                prompt: "Hmmm ok. I think I'd rather get to know more about Azure app service before going any further.",
                acceptableHandlerChains: [["appservice", "learn"]]
            },
        ]
    },
    {
        name: "Multi Prompt Benchmark 2",
        steps: [
            {
                prompt: "What is the max size of a block blob?",
                acceptableHandlerChains: [["storage", "learn"]]
            },
            {
                prompt: "What if my blobs are video files?",
                acceptableHandlerChains: [["storage", "learn"]]
            },
            {
                prompt: "How about if I use azure files instead?",
                acceptableHandlerChains: [["storage", "learn"]]
            },
            {
                prompt: "For now let's assume I use blobs then. How can I save cost on storing my large video blobs?",
                acceptableHandlerChains: [["storage", "learn"]]
            },
            {
                prompt: "Will they still be easily accessible even if I do that?",
                acceptableHandlerChains: [["storage", "learn"]]
            },
        ]
    },
];

export const helpBenchmarks: AgentBenchmarkWithStepsConfig[] = [
    {
        name: "Agent Help Benchmark 1",
        steps: [
            {
                prompt: "How do I use you?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 2",
        steps: [
            {
                prompt: "What can you do?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 3",
        steps: [
            {
                prompt: "How does this bot help me?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 4",
        steps: [
            {
                prompt: "Can this thing do anything useful?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 5",
        steps: [
            {
                prompt: "What is your purpose?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 6",
        steps: [
            {
                prompt: "I don't know if you can help me...",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 7",
        steps: [
            {
                prompt: "Are you a chatbot?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 8",
        steps: [
            {
                prompt: "I'd like you to tell me about yourself",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 9",
        steps: [
            {
                prompt: "Sell me on your usefulness",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 10",
        steps: [
            {
                prompt: "Name everything you can help me with",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 11",
        steps: [
            {
                prompt: "I want to know all about the azure agent",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 12",
        steps: [
            {
                prompt: "Tell me more about this agent",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 13",
        steps: [
            {
                prompt: "Give a list of things this bot is capable of",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    }, {
        name: "Agent Help Benchmark 14",
        steps: [
            {
                prompt: "Are you who I should talk to about azure?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 15",
        steps: [
            {
                prompt: "You have one chance to convince me you are worth talking to.",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 16",
        steps: [
            {
                prompt: "Talk to me please",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 17",
        steps: [
            {
                prompt: "I want you to tell me everything you can do for me",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 18",
        steps: [
            {
                prompt: "Give me a solid list of things that you're capable of",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 19",
        steps: [
            {
                prompt: "Are you yet another useless tool?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 20",
        steps: [
            {
                prompt: "explain yourself",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 21",
        steps: [
            {
                prompt: "man page",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 22",
        steps: [
            {
                prompt: "Give me a tldr on this thing",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: "Agent Help Benchmark 23",
        steps: [
            {
                prompt: "halp",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
];

export const defaultBenchmarks: AgentBenchmarkWithStepsConfig[] = [
    {
        name: "Default Benchmark 1",
        steps: [
            {
                prompt: "Teach me about Microsoft Genomics",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 2",
        steps: [
            {
                prompt: "I need to lookup my last billing statement",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 3",
        steps: [
            {
                prompt: "How do I create an Power BI Embedded project?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 4",
        steps: [
            {
                prompt: "What Azure services are currently in preview?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 5",
        steps: [
            {
                prompt: "Teach me about logic apps",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 6",
        steps: [
            {
                prompt: "When was Azure created?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 7",
        steps: [
            {
                prompt: "How many services does Azure support?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 4",
        steps: [
            {
                prompt: "How many languages does Azure speech services support?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 8",
        steps: [
            {
                prompt: "What types of notifications can notification hubs send?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 9",
        steps: [
            {
                prompt: "What other companies does Azure Orbital Ground Station partner with?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 10",
        steps: [
            {
                prompt: "Tell me about some interesting Azure services",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 11",
        steps: [
            {
                prompt: "I'm new to cloud computing, give me a rundown on all things Azure",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 12",
        steps: [
            {
                prompt: "Tell me a fun fact about Azure",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 13",
        steps: [
            {
                prompt: "Give me the equivalent Azure service for the most popular AWS services",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 14",
        steps: [
            {
                prompt: "Tell me about the advantages of using Azure over AWS or GCP",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 15",
        steps: [
            {
                prompt: "Can I use Azure to create a bot like you?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 16",
        steps: [
            {
                prompt: "Do I have to use VS Code to work with Azure resources?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 17",
        steps: [
            {
                prompt: "I'd rather you help me with AWS instead of Azure",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: "Default Benchmark 18",
        steps: [
            {
                prompt: "Explain Azure in the style of a cooking show",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
];
