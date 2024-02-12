/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type AgentBenchmarkStepConfig = {
    /**
     * The simulated user input to be given to the agent when running the step.
     */
    prompt: string;

    /**
     * Acceptable handler chains for the `prompt`. Each entry in a handler chain is a string that represents a handler, in the
     * order that the handlers are called. For {@link WizardCommandConfig} related subcommands, the {@link WizardCommandConfig.name}
     * is the handler name.
     */
    acceptableHandlerChains: string[][];

    /**
     * Follow ups that are required/optional to be returned by the agent given the {@link AgentBenchmarkStepConfig.prompt}.
     */
    followUps?: {
        required: { type: "message", messageContains: string }[],
        optional: { type: "message", messageContains: string }[],
    };

    /**
     * Buttons that are required/optional to be returned by the agent given the {@link AgentBenchmarkStepConfig.prompt}.
     */
    buttons?: {
        required: { type: "command", commandId: string }[],
        optional: { type: "command", commandId: string }[],
    }
};

export type AgentBenchmarkWithStepsConfig = {
    name: string;
    steps: AgentBenchmarkStepConfig[];
};

/**
 * @deprecated Use {@link AgentBenchmarkWithStepsConfig} instead.
 *
 * A config that describes a benchmark to be run against the agent.
 */
export type AgentBenchmarkConfig = AgentBenchmarkStepConfig & {
    /**
     * The name of the benchmark. Does not need to be unique, but is useful if it can be.
     */
    name: string;
};
