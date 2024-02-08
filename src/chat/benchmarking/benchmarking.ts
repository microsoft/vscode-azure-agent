/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AgentBenchmarkConfig } from "@microsoft/vscode-azext-utils";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type * as vscode from "vscode";
import { type AgentRequest, type IAgentRequestHandler } from "../agent";
import { agentName } from "../agentConsts";
import { type AzureExtension } from "../extensions/AzureExtension";
import { SlashCommandsOwner, type FallbackSlashCommandHandlers, type SlashCommand, type SlashCommandConfig, type SlashCommandHandlerResult } from "../slashCommands";

type AgentBenchmarkRunStats = {
    startTime: number,
    endTime: number,
    handlerChainValid: boolean;
    followUps: {
        allRequiredFollowUpsFound: boolean,
        allFollowUpsRequiredOrOptional: boolean,
        allRequiredButtonsFound: boolean,
        allButtonsRequiredOrOptional: boolean,
    },
};

const benchmarkCommandName = "benchmark";
const benchmarkStatsCommandName = "benchmarkStats";
const benchmarkAllCommandName = "benchmarkAll";

export class AgentBenchmarker implements IAgentRequestHandler {
    private _agentSlashCommandsOwner: SlashCommandsOwner;
    private _benchmarkerSlashCommandsOwner: SlashCommandsOwner;
    private _continuationIndex: number;
    private _benchmarks: AgentBenchmarkConfig[];
    private _extensionsToBenchmark: AzureExtension[];
    private _benchmarksRunsStats: AgentBenchmarkRunStats[][];

    constructor(agentSlashCommandsOwner: SlashCommandsOwner) {
        this._agentSlashCommandsOwner = agentSlashCommandsOwner;
        this._benchmarks = [];
        this._extensionsToBenchmark = [];
        this._benchmarksRunsStats = [];

        const slashCommands = new Map([this._getBenchmarkSlashCommand(), this._getBenchmarkStatsSlashCommand(), this._getBenchmarkAllSlashCommand()]);
        const fallbackSlashCommandHandlers: FallbackSlashCommandHandlers = { noInput: undefined, default: undefined };

        this._benchmarkerSlashCommandsOwner = new SlashCommandsOwner(fallbackSlashCommandHandlers, { disableIntentDetection: true });
        this._benchmarkerSlashCommandsOwner.addInvokeableSlashCommands(slashCommands);

        this._continuationIndex = 0;
    }

    public addExtensionsToBenchmark(...extensions: AzureExtension[]): void {
        this._extensionsToBenchmark.push(...extensions);
    }

    public addBenchmarkConfigs(...benchmarkConfigs: AgentBenchmarkConfig[]): void {
        this._benchmarks.push(...benchmarkConfigs);
        this._benchmarksRunsStats.push(...benchmarkConfigs.map(() => []));
    }

    public handleRequestOrPrompt(request: AgentRequest): Promise<SlashCommandHandlerResult> {
        return this._benchmarkerSlashCommandsOwner.handleRequestOrPrompt(request);
    }

    public getFollowUpForLastHandledSlashCommand(result: vscode.ChatAgentResult2, token: vscode.CancellationToken): vscode.ChatAgentFollowup[] | undefined {
        return this._benchmarkerSlashCommandsOwner.getFollowUpForLastHandledSlashCommand(result, token);
    }

    private async _benchmarkSingle(request: AgentRequest): Promise<SlashCommandHandlerResult> {
        await this._prepForBenchmarking(request);

        if (this._benchmarks.length === 0) {
            request.responseStream.markdown("No benchmarks to run. 😭");
            return { chatAgentResult: {}, followUp: [], };
        }

        const followUps: vscode.ChatAgentFollowup[] = [];
        const requestedBenchmarkIndex = parseInt(request.userPrompt);
        if (isNaN(requestedBenchmarkIndex) || requestedBenchmarkIndex >= this._benchmarks.length) {
            await this._runBenchmark(this._continuationIndex, request);
            this._continuationIndex++;

            if (this._continuationIndex === this._benchmarks.length) {
                this._debugBenchmarking(request.responseStream, `🎉 Done benchmarking!`);
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

        this._debugBenchmarking(request.responseStream, `📋 Benchmark (${benchmarkIdx ?? this._continuationIndex}/${this._benchmarks.length}): ${benchmark.name}\n💭 Prompt: '${benchmark.prompt}'...`);

        // When running a benchmark, create an intermediate response stream that captures information needed to perform validation after the agent is done responding.
        const returnedButtons: vscode.Command[] = [];
        const originalResponseStream = request.responseStream;
        const runBenchmarkResponseStream: vscode.ChatAgentResponseStream = {
            markdown: function (value: string | vscode.MarkdownString): vscode.ChatAgentResponseStream {
                return originalResponseStream.markdown(value);
            },
            button: function (command: vscode.Command): vscode.ChatAgentResponseStream {
                returnedButtons.push(command);
                return originalResponseStream.button(command);
            },
            reference: function (value: vscode.Uri | vscode.Location): vscode.ChatAgentResponseStream {
                return originalResponseStream.reference(value);
            },
            progress: function (value: string): vscode.ChatAgentResponseStream {
                return originalResponseStream.progress(value);
            },
            text: function (_value: string): vscode.ChatAgentResponseStream { throw new Error("Function not implemented."); },
            files: function (_value: vscode.ChatAgentFileTreeData): vscode.ChatAgentResponseStream { throw new Error("Function not implemented."); },
            anchor: function (_value: vscode.Uri | vscode.Location, _title?: string | undefined): vscode.ChatAgentResponseStream { throw new Error("Function not implemented."); },
            report: function (_value: vscode.ChatAgentProgress): void { throw new Error("Function not implemented."); }
        };
        const benchmarkRequest: AgentRequest = { ...request, userPrompt: benchmark.prompt, responseStream: runBenchmarkResponseStream };
        const startTime = Date.now();
        const handleResult = await this._agentSlashCommandsOwner.handleRequestOrPrompt(benchmarkRequest);
        const endTime = Date.now();

        if (handleResult) {
            let validationString = "🔍 Automated Validation:\n";
            const handlerChainIsOptional = this._validateHandlerChain(handleResult.handlerChain || [], benchmark.acceptableHandlerChains);
            validationString += handlerChainIsOptional ? `✅ Handler chain is valid (${JSON.stringify(handleResult.handlerChain)}).\n` : `❌ Handler chain is invalid. Expected one of: ${JSON.stringify(benchmark.acceptableHandlerChains)}, Actual: ${JSON.stringify(handleResult.handlerChain)}\n`;

            const followUps = handleResult.followUp || [];
            if (followUps.length > 0) {
                this._debugBenchmarking(request.responseStream, `⏭️ Follow Ups:\n${followUps.map((followUp) => JSON.stringify(followUp)).join("\n")}`);
            }

            const followUpValidation = benchmark.followUps;
            const { allFollowUpsRequiredOrOptional, allRequiredFollowUpsFound } = !followUpValidation ? { allFollowUpsRequiredOrOptional: true, allRequiredFollowUpsFound: true } : this._validateFollowUps(followUps, followUpValidation);
            validationString += allRequiredFollowUpsFound ? `✅ All required follow ups found.\n` : `❌ Not all required follow ups found.\n`;
            validationString += allFollowUpsRequiredOrOptional ? `✅ All follow ups required or optional.\n` : `❌ Not all follow ups required or optional.\n`;

            const buttonValidation = benchmark.buttons;
            const { allButtonsRequiredOrOptional, allRequiredButtonsFound } = !buttonValidation ? { allButtonsRequiredOrOptional: true, allRequiredButtonsFound: true } : this._validateButtons(returnedButtons, buttonValidation);
            validationString += allRequiredButtonsFound ? `✅ All required buttons found.\n` : `❌ Not all required buttons found.\n`;
            validationString += allButtonsRequiredOrOptional ? `✅ All buttons required or optional.\n` : `❌ Not all buttons required or optional.\n`;

            this._debugBenchmarking(request.responseStream, validationString);

            const stats: AgentBenchmarkRunStats = {
                startTime: startTime,
                endTime: endTime,
                handlerChainValid: handlerChainIsOptional,
                followUps: {
                    allRequiredFollowUpsFound: allRequiredFollowUpsFound,
                    allFollowUpsRequiredOrOptional: allFollowUpsRequiredOrOptional,
                    allRequiredButtonsFound: allRequiredButtonsFound,
                    allButtonsRequiredOrOptional: allButtonsRequiredOrOptional,
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

            const handlerChainValidPercentage = numRuns === 0 ? 1 : handlerChainValidCount / numRuns;
            const allRequiredFollowUpsFoundPercentage = numRuns === 0 ? 1 : allRequiredFollowUpsFoundCount / numRuns;
            const allFollowUpsRequiredOrOptionalPercentage = numRuns === 0 ? 1 : allFollowUpsRequiredOrOptionalCount / numRuns;
            const statsString = `📋 Benchmark (${benchmarkIdx}/${this._benchmarks.length}): ${benchmark.name}\n` +
                `🔁 Number of runs: ${numRuns}\n` +
                `⏱️ Average time to complete benchmark: ${avgTime}ms\n` +
                `🔍 Handler chain valid: ${handlerChainValidCount} (${getColorEmojiForPercentage(handlerChainValidPercentage)} ${handlerChainValidPercentage * 100}%)\n` +
                `🔍 All required follow ups found: ${allRequiredFollowUpsFoundCount} (${getColorEmojiForPercentage(allRequiredFollowUpsFoundPercentage)} ${allRequiredFollowUpsFoundPercentage * 100}%)\n` +
                `🔍 All follow ups required or optional: ${allFollowUpsRequiredOrOptionalCount} (${getColorEmojiForPercentage(allFollowUpsRequiredOrOptionalPercentage)} ${allFollowUpsRequiredOrOptionalPercentage * 100}%)\n`;

            this._debugBenchmarking(request.responseStream, statsString);
        });

        return { chatAgentResult: {}, followUp: [], };
    }

    private async _benchmarkAll(request: AgentRequest): Promise<SlashCommandHandlerResult> {
        if (this._benchmarks.length === 0) {
            request.responseStream.markdown("No benchmarks to run. 😭");
            return { chatAgentResult: {}, followUp: [], };
        }

        const args = request.userPrompt.split(" ");
        const timesToRunAll = parseInt(args[0]) || 1;
        const minDelayBetweenBenchmarks = parseInt(args[1]) || (5 * 1000);
        const maxDelayBetweenBenchmarks = parseInt(args[2]) || (10 * 1000);
        const averageDelayBetweenBenchmarks = (maxDelayBetweenBenchmarks + minDelayBetweenBenchmarks) / 2;
        const estimatedTimeToRunAll = (this._benchmarks.length * averageDelayBetweenBenchmarks * timesToRunAll) / 1000;
        const estimatedCompletionTime = new Date(Date.now() + estimatedTimeToRunAll * 1000).toLocaleTimeString();

        // When running all benchmarks, create an response stream that writes all benchmark and agent output to a file.
        const outFile = await getBenchmarkOutFilePath();
        const benchmarkAllResponseStream: vscode.ChatAgentResponseStream = {
            markdown: function (value: string | vscode.MarkdownString): vscode.ChatAgentResponseStream {
                fs.appendFileSync(outFile, typeof value === "string" ? value : value.value);
                return benchmarkAllResponseStream;
            },
            button: function (command: vscode.Command): vscode.ChatAgentResponseStream {
                fs.appendFileSync(outFile, JSON.stringify(command.toString()));
                return benchmarkAllResponseStream;
            },
            reference: function (value: vscode.Uri | vscode.Location): vscode.ChatAgentResponseStream {
                fs.appendFileSync(outFile, JSON.stringify(value.toString()));
                return benchmarkAllResponseStream;
            },
            progress: function (value: string): vscode.ChatAgentResponseStream {
                fs.appendFileSync(outFile, value.toString());
                return benchmarkAllResponseStream;
            },
            text: function (_value: string): vscode.ChatAgentResponseStream { throw new Error("Function not implemented."); },
            files: function (_value: vscode.ChatAgentFileTreeData): vscode.ChatAgentResponseStream { throw new Error("Function not implemented."); },
            anchor: function (_value: vscode.Uri | vscode.Location, _title?: string | undefined): vscode.ChatAgentResponseStream { throw new Error("Function not implemented."); },
            report: function (_value: vscode.ChatAgentProgress): void { throw new Error("Function not implemented."); }
        };

        const benchmarkAllIntroString = `Running all ${this._benchmarks.length} benchmarks ${timesToRunAll} times.\n` +
            `Average delay between benchmarks: ${averageDelayBetweenBenchmarks / 1000} seconds\n` +
            `Estimated time to run all benchmarks: ${estimatedTimeToRunAll} seconds\n` +
            `Estimated completion time: ${estimatedCompletionTime}\n` +
            `Output will be saved to: ${outFile}`;
        this._debugBenchmarking(request.responseStream, benchmarkAllIntroString);

        for (let i = 0; i < timesToRunAll; i++) {
            for (let benchmarkIdx = 0; benchmarkIdx < this._benchmarks.length; benchmarkIdx++) {
                await this._runBenchmark(benchmarkIdx, { ...request, responseStream: benchmarkAllResponseStream });

                const randomDelay = Math.random() * (maxDelayBetweenBenchmarks - minDelayBetweenBenchmarks) + minDelayBetweenBenchmarks;
                this._debugBenchmarking(request.responseStream, `Delaying ${randomDelay / 1000} seconds before running the next benchmark...`);
                await new Promise((resolve) => setTimeout(resolve, randomDelay));
            }

            // Write a benchmark stats after each run through to benchmarkAllResponseStream (which should be to the out file).
            await this._benchmarkStats({ ...request, responseStream: benchmarkAllResponseStream });

            const estimatedTimeToRunRemaining = (this._benchmarks.length * averageDelayBetweenBenchmarks * (timesToRunAll - i)) / 1000;
            const estimatedFinishTime = new Date(Date.now() + estimatedTimeToRunRemaining * 1000).toLocaleTimeString();
            this._debugBenchmarking(request.responseStream, `New estimated completion time: ${estimatedFinishTime}`);
        }


        return { chatAgentResult: {}, followUp: [], };
    }

    private async _prepForBenchmarking(request: AgentRequest): Promise<void> {
        if (this._extensionsToBenchmark.length > 0) {
            for (const extension of this._extensionsToBenchmark.splice(0)) {
                if (extension.isInstalled() && extension.isCompatible()) {
                    request.responseStream.progress(`Activating the ${extension.extensionDisplayName} extension...`);
                    await extension.activate(request);
                    request.responseStream.progress(`Getting benchmark configs from the ${extension.extensionDisplayName} extension...`);
                    const benchmarkConfigs = await extension.getAgentBenchmarkConfigs();
                    this.addBenchmarkConfigs(...benchmarkConfigs);
                } else {
                    request.responseStream.progress(`Skipping getting benchmark configs from the ${extension.extensionDisplayName} extension as it is not ${extension.isInstalled() ? "compatible" : "installed"}...`);
                }
            }
        }
    }

    private _getBenchmarkSlashCommand(): SlashCommand {
        const config: SlashCommandConfig = {
            shortDescription: "",
            longDescription: "",
            intentDescription: "",
            handler: (request: AgentRequest) => this._benchmarkSingle(request),
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

    private _getBenchmarkAllSlashCommand(): SlashCommand {
        const config: SlashCommandConfig = {
            shortDescription: "",
            longDescription: "",
            intentDescription: "",
            handler: (request: AgentRequest) => this._benchmarkAll(request),
        };
        return [benchmarkAllCommandName, config];
    }

    private _debugBenchmarking(progress: vscode.ChatAgentResponseStream, msg: string) {
        const lines = msg.trim().split("\n");
        progress.markdown("\n```");
        for (const line of lines) {
            progress.markdown(`\n${line}`);
        }
        progress.markdown("\n```\n\n");
    }

    private _validateHandlerChain(handlerChain: string[], acceptableHandlerChains: string[][]): boolean {
        return acceptableHandlerChains.some((optionalHandlerChain) => optionalHandlerChain.every((optionalHandler, index) => optionalHandler === handlerChain[index]));
    }

    private _validateFollowUps(followUps: vscode.ChatAgentFollowup[], followUpValidation: NonNullable<AgentBenchmarkConfig["followUps"]>): { allFollowUpsRequiredOrOptional: boolean, allRequiredFollowUpsFound: boolean } {
        let allFollowUpsRequiredOrOptional = true;
        const foundRequiredFollowUps: boolean[] = new Array<boolean>(followUpValidation.required.length).fill(false);
        for (const followUp of followUps) {
            const requiredFollowUpIndex = followUpValidation.required.findIndex((requiredFollowUp) => followUp.message.includes(requiredFollowUp.messageContains));
            if (requiredFollowUpIndex !== -1) {
                foundRequiredFollowUps[requiredFollowUpIndex] = true;
            } else {
                const optionalFollowUpIndex = followUpValidation.optional.findIndex((optionalFollowUp) => followUp.message.includes(optionalFollowUp.messageContains));
                if (optionalFollowUpIndex === -1) {
                    allFollowUpsRequiredOrOptional = false;
                }
            }
        }
        const allRequiredFollowUpsFound = foundRequiredFollowUps.every((foundRequiredFollowUp) => foundRequiredFollowUp);

        return {
            allFollowUpsRequiredOrOptional: allFollowUpsRequiredOrOptional,
            allRequiredFollowUpsFound: allRequiredFollowUpsFound
        };
    }

    private _validateButtons(buttons: vscode.Command[], buttonValidation: NonNullable<AgentBenchmarkConfig["buttons"]>): { allButtonsRequiredOrOptional: boolean, allRequiredButtonsFound: boolean } {
        let allButtonsRequiredOrOptional = true;
        const foundRequiredButtons: boolean[] = new Array<boolean>(buttonValidation.required.length).fill(false);
        for (const button of buttons) {
            const requiredButtonIndex = buttonValidation.required.findIndex((requiredButton) => button.command === requiredButton.commandId);
            if (requiredButtonIndex !== -1) {
                foundRequiredButtons[requiredButtonIndex] = true;
            } else {
                const optionalButtonIndex = buttonValidation.optional.findIndex((optionalButton) => button.command === optionalButton.commandId);
                if (optionalButtonIndex === -1) {
                    allButtonsRequiredOrOptional = false;
                }
            }
        }
        const allRequiredButtonsFound = foundRequiredButtons.every((foundRequiredButton) => foundRequiredButton);

        return {
            allButtonsRequiredOrOptional: allButtonsRequiredOrOptional,
            allRequiredButtonsFound: allRequiredButtonsFound
        };
    }
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

async function getBenchmarkOutFilePath(): Promise<string> {
    const fileName = `agent-${agentName}-benchmark-${generateRandomLetters(4)}-${Date.now()}.md`;
    const filePath = path.join(os.homedir(), fileName);

    if (fs.existsSync(filePath)) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return getBenchmarkOutFilePath();
    }

    return filePath;
}

function generateRandomLetters(length: number): string {
    const characters = "abcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }
    return result;
}
