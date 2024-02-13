/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type * as vscode from "vscode";
import { type AgentRequest, type IAgentRequestHandler } from "../agent";
import { agentName } from "../agentConsts";
import { type AzureExtension } from "../extensions/AzureExtension";
import { SlashCommandsOwner, type FallbackSlashCommandHandlers, type SlashCommand, type SlashCommandConfig, type SlashCommandHandlerResult } from "../slashCommands";
import { type AgentBenchmarkConfig, type AgentBenchmarkWithStepsConfig } from "./NewBenchmarkTypes";

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
    private _benchmarks: AgentBenchmarkWithStepsConfig[];
    private _extensionsToBenchmark: AzureExtension[];
    private _benchmarksRunsStats: AgentBenchmarkRunStats[][][];

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

    public addBenchmarkConfigs(...benchmarkConfigs: (AgentBenchmarkWithStepsConfig | AgentBenchmarkConfig)[]): void {
        const convertedBenchmarkConfigs = benchmarkConfigs.map((config) => ensureIsAgentBenchmarkWithStepsConfig(config));
        this._benchmarks.push(...convertedBenchmarkConfigs);
        this._benchmarksRunsStats.push(...convertedBenchmarkConfigs.map((config) => config.steps.map(() => [])));
    }

    public handleRequestOrPrompt(request: AgentRequest, handlerChain: string[]): Promise<SlashCommandHandlerResult> {
        return this._benchmarkerSlashCommandsOwner.handleRequestOrPrompt(request, handlerChain);
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
                debugBenchmarking(request.responseStream, `🎉 Done benchmarking!`);
                followUps.push({ prompt: `/${benchmarkStatsCommandName}` });
                this._continuationIndex = 0;
            }
            followUps.push({ prompt: `/${benchmarkCommandName}` });
        } else {
            await this._runBenchmark(requestedBenchmarkIndex, request);

            followUps.push({ prompt: `/${benchmarkCommandName}` });
            followUps.push({ prompt: `/${benchmarkCommandName} ${requestedBenchmarkIndex}` });
            followUps.push({ prompt: `/${benchmarkCommandName} ${requestedBenchmarkIndex === this._benchmarks.length - 1 ? 0 : requestedBenchmarkIndex + 1}` });
            followUps.push({ prompt: `/${benchmarkStatsCommandName}` });
        }

        return {
            chatAgentResult: {},
            followUp: followUps,
        };
    }

    private async _runBenchmark(benchmarkIdx: number, request: AgentRequest): Promise<void> {
        const benchmark = this._benchmarks[benchmarkIdx];

        debugBenchmarking(request.responseStream, `📋 Benchmark (${benchmarkIdx ?? this._continuationIndex}/${this._benchmarks.length}): ${benchmark.name}`);

        const history: (vscode.ChatAgentRequestTurn | vscode.ChatAgentResponseTurn)[] = [];

        for (const step of benchmark.steps) {
            debugBenchmarking(request.responseStream, `💭 User: '${step.prompt}'...`);

            // When running a step:
            // - Keep track of agent responses so we can add a new entry to history after the agent is done responding.
            const responses: (vscode.ChatAgentHistoryEntry["response"]) = [];
            // - Keep track of buttons returned so we can validate them after each step
            const returnedButtons: vscode.Command[] = [];
            // - Create an intermediate response stream that captures information needed to perform validation after the agent is done responding.
            const originalResponseStream = request.responseStream;
            const runBenchmarkResponseStream: vscode.ChatAgentResponseStream = getBenchmarkChatAgentResponseStream(originalResponseStream, {
                button: function (command: vscode.Command): void { returnedButtons.push(command); },
            });
            const agentRequestAtStep: AgentRequest = {
                context: { ...request.context, history2: history },
                userPrompt: step.prompt,
                responseStream: runBenchmarkResponseStream,
                token: request.token,
            };

            const startTime = Date.now();
            const handleResult = await this._agentSlashCommandsOwner.handleRequestOrPrompt(agentRequestAtStep, []);
            const endTime = Date.now();

            if (handleResult) {
                let validationString = "🔍 Automated Validation:\n";
                const handlerChain = handleResult.chatAgentResult.metadata?.handlerChain || [];
                const handlerChainIsOptional = this._validateHandlerChain(handlerChain || [], step.acceptableHandlerChains);
                validationString += handlerChainIsOptional ? `✅ Handler chain is valid (${JSON.stringify(handlerChain)}).\n` : `❌ Handler chain is invalid. Expected one of: ${JSON.stringify(step.acceptableHandlerChains)}, Actual: ${JSON.stringify(handlerChain)}\n`;

                const followUps = handleResult.followUp || [];
                if (followUps.length > 0) {
                    debugBenchmarking(request.responseStream, `⏭️ Follow Ups:\n${followUps.map((followUp) => JSON.stringify(followUp)).join("\n")}`);
                }

                const followUpValidation = step.followUps;
                const { allFollowUpsRequiredOrOptional, allRequiredFollowUpsFound } = !followUpValidation ? { allFollowUpsRequiredOrOptional: true, allRequiredFollowUpsFound: true } : this._validateFollowUps(followUps, followUpValidation);
                validationString += allRequiredFollowUpsFound ? `✅ All required follow ups found.\n` : `❌ Not all required follow ups found.\n`;
                validationString += allFollowUpsRequiredOrOptional ? `✅ All follow ups required or optional.\n` : `❌ Not all follow ups required or optional.\n`;

                const buttonValidation = step.buttons;
                const { allButtonsRequiredOrOptional, allRequiredButtonsFound } = !buttonValidation ? { allButtonsRequiredOrOptional: true, allRequiredButtonsFound: true } : this._validateButtons(returnedButtons, buttonValidation);
                validationString += allRequiredButtonsFound ? `✅ All required buttons found.\n` : `❌ Not all required buttons found.\n`;
                validationString += allButtonsRequiredOrOptional ? `✅ All buttons required or optional.\n` : `❌ Not all buttons required or optional.\n`;

                debugBenchmarking(request.responseStream, validationString);

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

                this._benchmarksRunsStats[benchmarkIdx][benchmark.steps.indexOf(step)].push(stats);

                // Push the request turn
                history.push({ agent: { extensionId: "ms-azuretools.vscode-azure-agent", agentId: agentName, }, agentId: agentName, prompt: step.prompt, command: request.command, variables: [] });
                // Push the response turn
                history.push({ agent: { extensionId: "ms-azuretools.vscode-azure-agent", agentId: agentName, }, agentId: agentName, response: responses, result: handleResult.chatAgentResult || {}, });

                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    }

    private async _benchmarkStats(request: AgentRequest): Promise<SlashCommandHandlerResult> {
        this._benchmarks.forEach((benchmark, benchmarkIdx) => {
            const numRuns = this._benchmarksRunsStats[benchmarkIdx][0]?.length;
            if (numRuns === 0) {
                const noStatsString = `📋 Benchmark (${benchmarkIdx}/${this._benchmarks.length}): ${benchmark.name}\n` +
                    `🔁 Number of runs: ${numRuns}\n`;
                debugBenchmarking(request.responseStream, noStatsString);
            } else if (numRuns > 0) {
                // Calculating average runtime may be bugged. Can look into it later.
                const getStepsCumulativeRuntime = (stepsRunStats: AgentBenchmarkRunStats[]) => stepsRunStats.reduce((acc, curr) => acc + curr.endTime - curr.startTime, 0);
                const runtimeOfAllRuns = this._benchmarksRunsStats[benchmarkIdx].reduce((acc, curr) => acc + getStepsCumulativeRuntime(curr), 0);
                const avgTime = runtimeOfAllRuns / numRuns;
                const statsString = `📋 Benchmark (${benchmarkIdx}/${this._benchmarks.length}): ${benchmark.name}\n` +
                    `🔁 Number of runs: ${numRuns}\n` +
                    `⏱️ Average time to complete benchmark: ${avgTime}ms\n`;
                debugBenchmarking(request.responseStream, statsString);

                benchmark.steps.forEach((_, stepIdx) => {
                    const stepRunStats = this._benchmarksRunsStats[benchmarkIdx][stepIdx];

                    const handlerChainValidCount = stepRunStats.filter((runStat) => runStat.handlerChainValid).length;
                    const allRequiredFollowUpsFoundCount = stepRunStats.filter((runStat) => runStat.followUps.allRequiredFollowUpsFound).length;
                    const allFollowUpsRequiredOrOptionalCount = stepRunStats.filter((runStat) => runStat.followUps.allFollowUpsRequiredOrOptional).length;

                    const handlerChainValidPercentage = numRuns === 0 ? 1 : handlerChainValidCount / numRuns;
                    const allRequiredFollowUpsFoundPercentage = numRuns === 0 ? 1 : allRequiredFollowUpsFoundCount / numRuns;
                    const allFollowUpsRequiredOrOptionalPercentage = numRuns === 0 ? 1 : allFollowUpsRequiredOrOptionalCount / numRuns;

                    const stepStatsString = `🪜 Step (${stepIdx}/${benchmark.steps.length}): ${benchmark.name}\n` +
                        `🔍 Handler chain valid: ${handlerChainValidCount} (${getColorEmojiForPercentage(handlerChainValidPercentage)} ${handlerChainValidPercentage * 100}%)\n` +
                        `🔍 All required follow ups found: ${allRequiredFollowUpsFoundCount} (${getColorEmojiForPercentage(allRequiredFollowUpsFoundPercentage)} ${allRequiredFollowUpsFoundPercentage * 100}%)\n` +
                        `🔍 All follow ups required or optional: ${allFollowUpsRequiredOrOptionalCount} (${getColorEmojiForPercentage(allFollowUpsRequiredOrOptionalPercentage)} ${allFollowUpsRequiredOrOptionalPercentage * 100}%)\n`;
                    debugBenchmarking(request.responseStream, stepStatsString);
                });
            }
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

        // When running all benchmarks, create a response stream that writes all benchmark and agent output to a file.
        const outFile = await getBenchmarkOutFilePath();
        const benchmarkAllResponseStream: vscode.ChatAgentResponseStream = getBenchmarkChatAgentResponseStream(undefined, {
            markdown: function (value: string | vscode.MarkdownString): void { fs.appendFileSync(outFile, typeof value === "string" ? value : value.value); },
            button: function (command: vscode.Command): void { fs.appendFileSync(outFile, JSON.stringify(command.toString())); },
            reference: function (value: vscode.Uri | vscode.Location): void { fs.appendFileSync(outFile, JSON.stringify(value.toString())); },
            progress: function (value: string): void { fs.appendFileSync(outFile, value.toString()); },
        });

        const benchmarkAllIntroString = `Running all ${this._benchmarks.length} benchmarks ${timesToRunAll} times.\n` +
            `Average delay between benchmarks: ${averageDelayBetweenBenchmarks / 1000} seconds\n` +
            `Estimated time to run all benchmarks: ${estimatedTimeToRunAll} seconds\n` +
            `Estimated completion time: ${estimatedCompletionTime}\n` +
            `Output will be saved to: ${outFile}`;
        debugBenchmarking(request.responseStream, benchmarkAllIntroString);

        for (let i = 0; i < timesToRunAll; i++) {
            for (let benchmarkIdx = 0; benchmarkIdx < this._benchmarks.length; benchmarkIdx++) {
                await this._runBenchmark(benchmarkIdx, { ...request, responseStream: benchmarkAllResponseStream });

                const randomDelay = Math.random() * (maxDelayBetweenBenchmarks - minDelayBetweenBenchmarks) + minDelayBetweenBenchmarks;
                debugBenchmarking(request.responseStream, `Delaying ${randomDelay / 1000} seconds before running the benchmark ${benchmarkIdx}/${this._benchmarks.length}...`);
                await new Promise((resolve) => setTimeout(resolve, randomDelay));
            }

            // Write a benchmark stats after each run through to benchmarkAllResponseStream (which should be to the out file).
            await this._benchmarkStats({ ...request, responseStream: benchmarkAllResponseStream });

            const estimatedTimeToRunRemaining = (this._benchmarks.length * averageDelayBetweenBenchmarks * (timesToRunAll - i)) / 1000;
            const estimatedFinishTime = new Date(Date.now() + estimatedTimeToRunRemaining * 1000).toLocaleTimeString();
            debugBenchmarking(request.responseStream, `New estimated completion time: ${estimatedFinishTime}`);
        }


        return { chatAgentResult: {}, followUp: [], };
    }

    private async _prepForBenchmarking(request: AgentRequest): Promise<void> {
        if (this._extensionsToBenchmark.length > 0) {
            for (const extension of this._extensionsToBenchmark.splice(0)) {
                if (extension.isInstalled()) {
                    request.responseStream.progress(`Activating the ${extension.extensionDisplayName} extension...`);
                    await extension.activate(request);
                    request.responseStream.progress(`Getting benchmark configs from the ${extension.extensionDisplayName} extension...`);
                    const benchmarkConfigs = await extension.getAgentBenchmarkConfigs();
                    this.addBenchmarkConfigs(...benchmarkConfigs);
                } else {
                    request.responseStream.progress(`Skipping getting benchmark configs from the ${extension.extensionDisplayName} extension as it is not installed...`);
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

    private _validateHandlerChain(handlerChain: string[], acceptableHandlerChains: string[][]): boolean {
        return acceptableHandlerChains.some((optionalHandlerChain) => optionalHandlerChain.every((optionalHandler, index) => optionalHandler === handlerChain[index]));
    }

    private _validateFollowUps(followUps: vscode.ChatAgentFollowup[], followUpValidation: NonNullable<AgentBenchmarkConfig["followUps"]>): { allFollowUpsRequiredOrOptional: boolean, allRequiredFollowUpsFound: boolean } {
        let allFollowUpsRequiredOrOptional = true;
        const foundRequiredFollowUps: boolean[] = new Array<boolean>(followUpValidation.required.length).fill(false);
        for (const followUp of followUps) {
            const requiredFollowUpIndex = followUpValidation.required.findIndex((requiredFollowUp) => followUp.prompt.includes(requiredFollowUp.messageContains));
            if (requiredFollowUpIndex !== -1) {
                foundRequiredFollowUps[requiredFollowUpIndex] = true;
            } else {
                const optionalFollowUpIndex = followUpValidation.optional.findIndex((optionalFollowUp) => followUp.prompt.includes(optionalFollowUp.messageContains));
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

type InAdditionToChatAgentResponseStream = { [P in keyof vscode.ChatAgentResponseStream]?: (...args: Parameters<vscode.ChatAgentResponseStream[P]>) => void; };
/**
 * @param originalResponseStream An original response stream that this stream should ultimately pass through to. If `undefined`, the stream will not do any pass through.
 * @param inAddition Anything you want this stream to do in addition to doing normal chat agent response stream things.
 */
function getBenchmarkChatAgentResponseStream(originalResponseStream: vscode.ChatAgentResponseStream | undefined, inAddition?: InAdditionToChatAgentResponseStream): vscode.ChatAgentResponseStream {
    const chatAgentResponseStream: vscode.ChatAgentResponseStream = {
        markdown: function (value: string | vscode.MarkdownString): vscode.ChatAgentResponseStream {
            if (inAddition?.markdown) { inAddition.markdown(value); }
            if (originalResponseStream) { return originalResponseStream.markdown(value); }
            return chatAgentResponseStream;
        },
        button: function (command: vscode.Command): vscode.ChatAgentResponseStream {
            if (inAddition?.button) { inAddition.button(command); }
            debugBenchmarking(chatAgentResponseStream, `🔘 ${JSON.stringify(command)}`);
            if (originalResponseStream) { return originalResponseStream; }
            return chatAgentResponseStream;
        },
        reference: function (value: vscode.Uri | vscode.Location): vscode.ChatAgentResponseStream {
            if (inAddition?.reference) { inAddition.reference(value); }
            debugBenchmarking(chatAgentResponseStream, `📕 ${value.toString()}`);
            if (originalResponseStream) { return originalResponseStream; }
            return chatAgentResponseStream;
        },
        progress: function (value: string): vscode.ChatAgentResponseStream {
            if (inAddition?.progress) { inAddition.progress(value); }
            debugBenchmarking(chatAgentResponseStream, `🔄 ${value.toString()}`);
            if (originalResponseStream) { return originalResponseStream; }
            return chatAgentResponseStream;
        },
        text: function (value: string): vscode.ChatAgentResponseStream {
            if (inAddition?.text) { inAddition.text(value); }
            if (originalResponseStream) { return originalResponseStream.text(value); }
            return chatAgentResponseStream;
        },
        anchor: function (value: vscode.Uri | vscode.Location, title?: string | undefined): vscode.ChatAgentResponseStream {
            if (inAddition?.anchor) { inAddition.anchor(value, title); }
            if (originalResponseStream) { return originalResponseStream.anchor(value, title); }
            return chatAgentResponseStream;
        },
        filetree: function (value: vscode.ChatResponseFileTree[], baseUri: vscode.Uri): vscode.ChatAgentResponseStream {
            if (inAddition?.filetree) { inAddition.filetree(value, baseUri); }
            if (originalResponseStream) { return originalResponseStream.filetree(value, baseUri); }
            return chatAgentResponseStream;
        },
        push: function (part: vscode.ChatResponsePart): vscode.ChatAgentResponseStream {
            if (inAddition?.push) { inAddition.push(part); }
            if (originalResponseStream) { return originalResponseStream.push(part); }
            return chatAgentResponseStream;
        },
        report: function (value: vscode.ChatAgentProgress): void {
            if (inAddition?.report) { inAddition.report(value); }
            if (originalResponseStream) { return originalResponseStream.report(value); }
        }
    };
    return chatAgentResponseStream;
}

function isAgentBenchmarkWithStepsConfig(config: AgentBenchmarkConfig | AgentBenchmarkWithStepsConfig): config is AgentBenchmarkWithStepsConfig {
    return (config as AgentBenchmarkWithStepsConfig).steps !== undefined;
}

function ensureIsAgentBenchmarkWithStepsConfig(config: AgentBenchmarkConfig | AgentBenchmarkWithStepsConfig): AgentBenchmarkWithStepsConfig {
    if (!isAgentBenchmarkWithStepsConfig(config)) {
        return {
            name: config.name,
            steps: [{
                prompt: config.prompt,
                acceptableHandlerChains: config.acceptableHandlerChains,
                followUps: config.followUps,
                buttons: config.buttons,
            }],
        };
    } else {
        return config as AgentBenchmarkWithStepsConfig;
    }
}

function debugBenchmarking(progress: vscode.ChatAgentResponseStream, msg: string) {
    const lines = msg.trim().split("\n");
    progress.markdown("\n```");
    for (const line of lines) {
        progress.markdown(`\n${line}`);
    }
    progress.markdown("\n```\n\n");
}
