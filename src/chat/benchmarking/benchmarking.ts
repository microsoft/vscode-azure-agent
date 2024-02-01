/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AgentBenchmarkConfig } from "@microsoft/vscode-azext-utils";
import type * as vscode from "vscode";
import { type AgentRequest, type IAgentRequestHandler } from "../agent";
import { agentName } from "../agentConsts";
import { appServiceExtension, functionsExtension, storageExtension } from "../extensions/extensions";
import { type WizardBasedExtension } from "../extensions/wizardBasedExtension";
import { SlashCommandsOwner, type FallbackSlashCommandHandlers, type SlashCommand, type SlashCommandConfig, type SlashCommandHandlerResult } from "../slashCommands";

type AgentBenchmarkRunStats = {
    startTime: number,
    endTime: number,
    handlerChainValid: boolean;
    followUps: {
        allRequiredFollowUpsFound: boolean,
        allFollowUpsRequiredOrOptional: boolean,
    },
};

const benchmarkCommandName = "benchmark";
const benchmarkStatsCommandName = "benchmarkStats";

export class AgentBenchmarker implements IAgentRequestHandler {
    private _agentSlashCommandsOwner: SlashCommandsOwner;
    private _benchmarkerSlashCommandsOwner: SlashCommandsOwner;
    private _continuationIndex: number;
    private _benchmarks: AgentBenchmarkConfig[];
    private _extensionsToBenchmark: WizardBasedExtension[];
    private _benchmarksRunsStats: AgentBenchmarkRunStats[][];

    constructor(agentSlashCommandsOwner: SlashCommandsOwner) {
        this._agentSlashCommandsOwner = agentSlashCommandsOwner;
        this._benchmarks = [];
        this._extensionsToBenchmark = [
            functionsExtension,
            storageExtension,
            appServiceExtension,
        ];
        this._benchmarksRunsStats = [];

        const slashCommands = new Map([this._getBenchmarkSlashCommand(), this._getBenchmarkStatsSlashCommand()]);
        const fallbackSlashCommandHandlers: FallbackSlashCommandHandlers = { noInput: undefined, default: undefined };

        this._benchmarkerSlashCommandsOwner = new SlashCommandsOwner(fallbackSlashCommandHandlers, { disableIntentDetection: true });
        this._benchmarkerSlashCommandsOwner.addInvokeableSlashCommands(slashCommands);

        this._continuationIndex = 0;
    }

    public addExtensionsToBenchmark(extensions: WizardBasedExtension[]): void {
        this._extensionsToBenchmark.push(...extensions);
    }

    public handleRequestOrPrompt(request: AgentRequest): Promise<SlashCommandHandlerResult> {
        return this._benchmarkerSlashCommandsOwner.handleRequestOrPrompt(request);
    }

    public getFollowUpForLastHandledSlashCommand(result: vscode.ChatAgentResult2, token: vscode.CancellationToken): vscode.ChatAgentFollowup[] | undefined {
        return this._benchmarkerSlashCommandsOwner.getFollowUpForLastHandledSlashCommand(result, token);
    }

    private async _benchmarkAgent(request: AgentRequest): Promise<SlashCommandHandlerResult> {
        if (this._extensionsToBenchmark.length > 0) {
            for (const extension of this._extensionsToBenchmark.splice(0)) {
                if (extension.isInstalled() && extension.isCompatible()) {
                    request.progress.report({ message: `Activating the ${extension.displayName} extension...` });
                    await extension.activate(request);
                    request.progress.report({ message: `Getting benchmark configs from the ${extension.displayName} extension...` });
                    const benchmarkConfigs = await extension.getAgentBenchmarkConfigs();
                    this._benchmarks.push(...benchmarkConfigs);
                    this._benchmarksRunsStats.push(...benchmarkConfigs.map(() => []));
                } else {
                    request.progress.report({ message: `Skipping getting benchmark configs from the ${extension.displayName} extension as it is not ${extension.isInstalled() ? "compatible" : "installed"}...` });
                }
            }
        }

        if (this._benchmarks.length === 0) {
            request.progress.report({ content: "No benchmarks to run. 😭" });
            return { chatAgentResult: {}, followUp: [], };
        }

        const followUps: vscode.ChatAgentFollowup[] = [];
        const requestedBenchmarkIndex = parseInt(request.userPrompt);
        if (isNaN(requestedBenchmarkIndex) || requestedBenchmarkIndex >= this._benchmarks.length) {
            await this._runBenchmark(this._continuationIndex, request);
            this._continuationIndex++;

            if (this._continuationIndex === this._benchmarks.length) {
                this._debugBenchmarking(request.progress, `🎉 Done benchmarking!`);
                followUps.push({ message: `@${agentName} /${benchmarkStatsCommandName}` });
                this._continuationIndex = 0;
            }
            followUps.push({ message: `@${agentName} /${benchmarkCommandName}` });
        } else {
            await this._runBenchmark(requestedBenchmarkIndex, request);

            followUps.push({ message: `@${agentName} /${benchmarkCommandName}` });
            followUps.push({ message: `@${agentName} /${benchmarkCommandName} ${requestedBenchmarkIndex}` });
            followUps.push({ message: `@${agentName} /${benchmarkCommandName} ${requestedBenchmarkIndex === this._benchmarks.length - 1 ? 0 : requestedBenchmarkIndex + 1}` });
            followUps.push({ message: `@${agentName} /${benchmarkStatsCommandName}` });
        }

        return {
            chatAgentResult: {},
            followUp: followUps,
        };
    }

    private async _runBenchmark(benchmarkIdx: number, request: AgentRequest): Promise<void> {
        const benchmark = this._benchmarks[benchmarkIdx];

        this._debugBenchmarking(request.progress, `📋 Benchmark (${this._continuationIndex}/${this._benchmarks.length}): ${benchmark.name}\n💭 Prompt: '${benchmark.prompt}'...`);

        const startTime = Date.now();
        const benchmarkRequest: AgentRequest = { ...request, userPrompt: benchmark.prompt, };
        const handleResult = await this._agentSlashCommandsOwner.handleRequestOrPrompt(benchmarkRequest);
        const endTime = Date.now();

        if (handleResult) {
            let validationString = "🔍 Automated Validation:\n";
            const handlerChainIsOptional = this._validateHandlerChain(handleResult.handlerChain || [], benchmark.acceptableHandlerChains);
            validationString += handlerChainIsOptional ? `✅ Handler chain is valid (${JSON.stringify(handleResult.handlerChain)}).\n` : `❌ Handler chain is invalid. Expected one of: ${JSON.stringify(benchmark.acceptableHandlerChains)}, Actual: ${JSON.stringify(handleResult.handlerChain)}\n`;

            const followUps = handleResult.followUp || [];
            if (followUps.length > 0) {
                this._debugBenchmarking(request.progress, `⏭️ Follow Ups:\n${followUps.map((followUp) => JSON.stringify(followUp)).join("\n")}`);
            }

            const followUpValidation = benchmark.followUps;
            const { allFollowUpsRequiredOrOptional, allRequiredFollowUpsFound } = !followUpValidation ? { allFollowUpsRequiredOrOptional: true, allRequiredFollowUpsFound: true } : this._validateFollowUps(followUps, followUpValidation);
            validationString += allRequiredFollowUpsFound ? `✅ All required follow ups found.\n` : `❌ Not all required follow ups found.\n`;
            validationString += allFollowUpsRequiredOrOptional ? `✅ All follow ups required or optional.\n` : `❌ Not all follow ups required or optional.\n`;

            this._debugBenchmarking(request.progress, validationString);

            const stats: AgentBenchmarkRunStats = {
                startTime: startTime,
                endTime: endTime,
                handlerChainValid: handlerChainIsOptional,
                followUps: {
                    allRequiredFollowUpsFound: allRequiredFollowUpsFound,
                    allFollowUpsRequiredOrOptional: allFollowUpsRequiredOrOptional,
                }
            };
            this._benchmarksRunsStats[benchmarkIdx].push(stats);
        }
    }

    private async _benchmarkStats(request: AgentRequest): Promise<SlashCommandHandlerResult> {
        this._benchmarks.forEach((benchmark, benchmarkIdx) => {
            const benchmarkRunStats = this._benchmarksRunsStats[benchmarkIdx];

            const numRuns = benchmarkRunStats.length;
            const avgTime = benchmarkRunStats.reduce((acc, curr) => acc + curr.endTime - curr.startTime, 0) / numRuns;
            const handlerChainValidCount = benchmarkRunStats.filter((runStat) => runStat.handlerChainValid).length;
            const allRequiredFollowUpsFoundCount = benchmarkRunStats.filter((runStat) => runStat.followUps.allRequiredFollowUpsFound).length;
            const allFollowUpsRequiredOrOptionalCount = benchmarkRunStats.filter((runStat) => runStat.followUps.allFollowUpsRequiredOrOptional).length;

            const handlerChainValidPercentage = handlerChainValidCount / numRuns;
            const allRequiredFollowUpsFoundPercentage = allRequiredFollowUpsFoundCount / numRuns;
            const allFollowUpsRequiredOrOptionalPercentage = allFollowUpsRequiredOrOptionalCount / numRuns;
            const statsString = `📋 Benchmark (${benchmarkIdx}/${this._benchmarks.length}): ${benchmark.name}\n` +
                `🔁 Number of runs: ${numRuns}\n` +
                `⏱️ Average time to complete benchmark: ${avgTime}ms\n` +
                `🔍 Handler chain valid: ${handlerChainValidCount} (${getColorEmojiForPercentage(handlerChainValidPercentage)} ${handlerChainValidPercentage * 100}%)\n` +
                `🔍 All required follow ups found: ${allRequiredFollowUpsFoundCount} (${getColorEmojiForPercentage(allRequiredFollowUpsFoundPercentage)} ${allRequiredFollowUpsFoundPercentage * 100}%)\n` +
                `🔍 All follow ups required or optional: ${allFollowUpsRequiredOrOptionalCount} (${getColorEmojiForPercentage(allFollowUpsRequiredOrOptionalPercentage)} ${allFollowUpsRequiredOrOptionalPercentage * 100}%)\n`;

            this._debugBenchmarking(request.progress, statsString);
        });
        return {
            chatAgentResult: {},
            followUp: [],
        };
    }

    private _getBenchmarkSlashCommand(): SlashCommand {
        const config: SlashCommandConfig = {
            shortDescription: "",
            longDescription: "",
            intentDescription: "",
            handler: (request: AgentRequest) => this._benchmarkAgent(request),
        };
        return [benchmarkCommandName, config];
    }

    private _getBenchmarkStatsSlashCommand(): SlashCommand {
        const config: SlashCommandConfig = {
            shortDescription: "",
            longDescription: "",
            intentDescription: "",
            handler: (request: AgentRequest) => this._benchmarkStats(request),
        };
        return [benchmarkStatsCommandName, config];
    }

    private _debugBenchmarking(progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, msg: string) {
        const lines = msg.trim().split("\n");
        progress.report({ content: "\n```" });
        for (const line of lines) {
            progress.report({ content: `\n${line}` });
        }
        progress.report({ content: "\n```\n\n" });
    }

    private _validateHandlerChain(handlerChain: string[], acceptableHandlerChains: string[][]): boolean {
        return acceptableHandlerChains.some((optionalHandlerChain) => optionalHandlerChain.every((optionalHandler, index) => optionalHandler === handlerChain[index]));
    }

    private _validateFollowUps(followUps: vscode.ChatAgentFollowup[], followUpValidation: NonNullable<AgentBenchmarkConfig["followUps"]>): { allFollowUpsRequiredOrOptional: boolean, allRequiredFollowUpsFound: boolean } {
        let allFollowUpsRequiredOrOptional = true;
        const foundRequiredFollowUps: boolean[] = new Array<boolean>(followUpValidation.required.length).fill(false);
        for (const followUp of followUps) {
            if (followUpIsCommandFollowUp(followUp)) {
                const requiredFollowUpIndex = followUpValidation.required.findIndex((requiredFollowUp) => requiredFollowUp.type === "command" && requiredFollowUp.commandId === followUp.commandId);
                if (requiredFollowUpIndex !== -1) {
                    foundRequiredFollowUps[requiredFollowUpIndex] = true;
                } else {
                    const optionalFollowUpIndex = followUpValidation.optional.findIndex((optionalFollowUp) => optionalFollowUp.type === "command" && optionalFollowUp.commandId === followUp.commandId);
                    if (optionalFollowUpIndex === -1) {
                        allFollowUpsRequiredOrOptional = false;
                    }
                }
            } else {
                const requiredFollowUpIndex = followUpValidation.required.findIndex((requiredFollowUp) => requiredFollowUp.type === "reply" && followUp.message.includes(requiredFollowUp.message));
                if (requiredFollowUpIndex !== -1) {
                    foundRequiredFollowUps[requiredFollowUpIndex] = true;
                } else {
                    const optionalFollowUpIndex = followUpValidation.optional.findIndex((optionalFollowUp) => optionalFollowUp.type === "reply" && followUp.message.includes(optionalFollowUp.message));
                    if (optionalFollowUpIndex === -1) {
                        allFollowUpsRequiredOrOptional = false;
                    }
                }
            }
        }
        const allRequiredFollowUpsFound = foundRequiredFollowUps.every((foundRequiredFollowUp) => foundRequiredFollowUp);

        return {
            allFollowUpsRequiredOrOptional: allFollowUpsRequiredOrOptional,
            allRequiredFollowUpsFound: allRequiredFollowUpsFound
        };
    }
}

function followUpIsCommandFollowUp(followUp: vscode.ChatAgentFollowup): followUp is vscode.ChatAgentCommandFollowup {
    return !!(followUp as vscode.ChatAgentCommandFollowup).commandId;
}

function getColorEmojiForPercentage(percentage: number): string {
    if (percentage >= 0.9) {
        return "🟢";
    } else if (percentage >= 0.8) {
        return "🟡";
    } else {
        return "🔴";
    }
}
