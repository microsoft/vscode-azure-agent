/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Information that should be available on the package.json of an extension which is compabitible with the Azure agent.
 * This information should be placed in an `agentMetdata` property.
 */
export type ExtensionAgentMetadata = {
    version: "2.0";

    /**
     * The VS Code command ID of a command that the extension implements which can be used to get the list
     * of {@link WizardBasedCommandConfig}s that the extension implements and wishes to expose via the agent.
     */
    getWizardCommandsCommandId: string;

    /**
     * The VS Code command ID of a command that the extension implements which can be used to run any of the
     * commands returned by the command with the ID {@link getWizardCommandsCommandId}, while only performing
     * prompting/without actually executing the intent of the command.
     *
     * The command should take two parameters:
     * - A {@link WizardBasedCommandConfig}: the command that should be run.
     * - A {@link IAzureAgentInput}: the input interface that the command should use.
     */
    runWizardCommandWithoutExecutionCommandId: string;

    /**
     * The VS Code command ID of a command that the extension implements which can be used to run any of the
     * commands returned by the command with the ID {@link getWizardCommandsCommandId} with a {@link AzureUserInputQueue}
     * of inputs,
     *
     * The command should take two parameters:
     * - A {@link WizardBasedCommandConfig}: the command that should be run.
     * - A {@link AzureUserInputQueue}: the inputs that the command should use when needing to present user input.
     */
    runWizardCommandWithInputsCommandId: string;

    /**
     * The VS Code command ID of a command that the extension implements which can be used to get the list of
     * {@link AgentBenchmarkConfig}s that the extension defines. These benchmarks should serve as a way to benchmark
     * the performance of the agent with regards to functionality that the subcommands associated with the extension
     * expose.
     */
    getAgentBenchmarkConfigsCommandId: string;
};
