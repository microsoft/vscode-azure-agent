/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AgentBenchmarkWithStepsConfig } from "../../../api";
import { agentHelpCommandName } from "../agentHelpSlashCommand";
import { learnCommandName } from "../commonCommandsAndHandlers";
import { defaultSlashCommandName } from "../slashCommands";

function getNumbericallyLabeledBenchmarkConfig(config: AgentBenchmarkWithStepsConfig, numericalLabel: number) {
    return {
        ...config,
        name: `${config.name} ${numericalLabel}`
    }
}

const multiPromptBenchmarkName = "Multi Prompt Benchmark";
export const multiPromptBenchmarks: AgentBenchmarkWithStepsConfig[] = ([
    {
        name: multiPromptBenchmarkName,
        steps: [
            {
                prompt: "Show me how to upload to blob storage in Python?",
                acceptableHandlerChains: [[learnCommandName]]
            },
            {
                prompt: "Actually, show me how with JavaScript please.",
                acceptableHandlerChains: [[learnCommandName]]
            },
            {
                prompt: "Can you add some more comments to that?",
                acceptableHandlerChains: [[learnCommandName]]
            },
            {
                prompt: "Great! Can you also help me learn about any concept that the code requires knowing aobut?",
                acceptableHandlerChains: [[learnCommandName]]
            }
        ]
    },
    {
        name: multiPromptBenchmarkName,
        steps: [
            {
                prompt: "What is are the pros and cons of Azure functions?",
                acceptableHandlerChains: [[learnCommandName]]
            },
            {
                prompt: "Tell me more!",
                acceptableHandlerChains: [[learnCommandName]]
            },
            {
                prompt: "Hmmm ok. I think I'd rather get to know more about Azure app service before going any further.",
                acceptableHandlerChains: [[learnCommandName]]
            },
        ]
    },
    {
        name: multiPromptBenchmarkName,
        steps: [
            {
                prompt: "What is the max size of a block blob?",
                acceptableHandlerChains: [[learnCommandName]]
            },
            {
                prompt: "What if my blobs are video files?",
                acceptableHandlerChains: [[learnCommandName]]
            },
            {
                prompt: "How about if I use azure files instead?",
                acceptableHandlerChains: [[learnCommandName]]
            },
            {
                prompt: "For now let's assume I use blobs then. How can I save cost on storing my large video blobs?",
                acceptableHandlerChains: [[learnCommandName]]
            },
            {
                prompt: "Will they still be easily accessible even if I do that?",
                acceptableHandlerChains: [[learnCommandName]]
            },
        ]
    },
]).map((config, index) => getNumbericallyLabeledBenchmarkConfig(config, index + 1));

const helpBenchmarkName = "Agent Help Benchmark";
export const helpBenchmarks: AgentBenchmarkWithStepsConfig[] = ([
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "How do I use you?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "What can you do?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "How does this bot help me?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "Can this thing do anything useful?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "What is your purpose?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "I don't know if you can help me...",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "Are you a chatbot?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "I'd like you to tell me about yourself",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "Sell me on your usefulness",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "Name everything you can help me with",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "I want to know all about the azure agent",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "Tell me more about this agent",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "Give a list of things this bot is capable of",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    }, {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "Are you who I should talk to about azure?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "You have one chance to convince me you are worth talking to.",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "Talk to me please",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "I want you to tell me everything you can do for me",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "Give me a solid list of things that you're capable of",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "Are you yet another useless tool?",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "explain yourself",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "man page",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "Give me a tldr on this thing",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
    {
        name: helpBenchmarkName,
        steps: [
            {
                prompt: "halp",
                acceptableHandlerChains: [[agentHelpCommandName]]
            }
        ]
    },
]).map((config, index) => getNumbericallyLabeledBenchmarkConfig(config, index + 1));

const defaultBenchmarkName = "Default Benchmark";
export const defaultBenchmarks: AgentBenchmarkWithStepsConfig[] = ([
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "Teach me about Microsoft Genomics",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "I need to lookup my last billing statement",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "How do I create an Power BI Embedded project?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "What Azure services are currently in preview?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "Teach me about logic apps",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "When was Azure created?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "How many services does Azure support?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "How many languages does Azure speech services support?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "What types of notifications can notification hubs send?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "What other companies does Azure Orbital Ground Station partner with?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "Tell me about some interesting Azure services",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "I'm new to cloud computing, give me a rundown on all things Azure",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "Tell me a fun fact about Azure",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "Give me the equivalent Azure service for the most popular AWS services",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "Tell me about the advantages of using Azure over AWS or GCP",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "Can I use Azure to create a bot like you?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "Do I have to use VS Code to work with Azure resources?",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "I'd rather you help me with AWS instead of Azure",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
    {
        name: defaultBenchmarkName,
        steps: [
            {
                prompt: "Explain Azure in the style of a cooking show",
                acceptableHandlerChains: [[defaultSlashCommandName]]
            }
        ]
    },
]).map((config, index) => getNumbericallyLabeledBenchmarkConfig(config, index + 1));
