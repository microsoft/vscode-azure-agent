/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import * as vscode from "vscode";
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { type AzureUserInputQueue } from "@microsoft/vscode-azext-utils";
import { type AgentBenchmarkConfig, type AgentBenchmarkWithStepsConfig, type ExtensionAgentMetadata, type IAzureAgentInput, type SimpleCommandConfig, type SkillCommandArgs, type SkillCommandConfig, type WizardCommandConfig } from "../../../api";
import { ext } from "../../extensionVariables";
import { type AgentRequest } from "../agent";

export class AzureExtension {
    public readonly extensionId: string;
    public readonly extensionDisplayName: string;

    private _extensionAgentMetadata: ExtensionAgentMetadata | undefined;
    private _extension: vscode.Extension<object> | undefined;

    constructor(extensionId: string, extensionDisplayName: string) {
        this.extensionId = extensionId;
        this.extensionDisplayName = extensionDisplayName;
    }

    public isInstalled(): boolean {
        if (this.extensionId !== "") {
            this._extension = this._extension || vscode.extensions.getExtension(this.extensionId);
            this._extensionAgentMetadata = (this._extension?.packageJSON as { agentMetadata: ExtensionAgentMetadata } | undefined)?.agentMetadata;
            return !!this._extension;
        }
        return true;
    }

    public async activate(request: AgentRequest | undefined): Promise<void> {
        if (this.extensionId !== "") {
            this._extension = this._extension || vscode.extensions.getExtension(this.extensionId);
            if (this._extension !== undefined) {
                request?.responseStream.progress(`Activating the ${this.extensionDisplayName} extension...`);
                await this._extension.activate();
            }
        }
    }

    public async getWizardCommands(): Promise<WizardCommandConfig[]> {
        try {
            return (await this._getCommandConfigs())
                .filter((commandConfig): commandConfig is WizardCommandConfig => commandConfig.type === "wizard");
        } catch (error) {
            ext.outputChannel.debug(`Error getting wizard commands from ${this.extensionDisplayName} extension: ${JSON.stringify(error)}`);
            return [];
        }
    }

    public async getSimpleCommands(): Promise<SimpleCommandConfig[]> {
        try {
            return (await this._getCommandConfigs())
                .filter((commandConfig): commandConfig is SimpleCommandConfig => commandConfig.type === "simple");
        } catch (error) {
            ext.outputChannel.debug(`Error getting wizard commands from ${this.extensionDisplayName} extension: ${JSON.stringify(error)}`);
            return [];
        }
    }

    public async getSkillCommands(): Promise<SkillCommandConfig[]> {
        try {
            return (await this._getCommandConfigs())
                .filter((commandConfig): commandConfig is SkillCommandConfig => commandConfig.type === "skill");
        } catch (error) {
            ext.outputChannel.debug(`Error getting wizard commands from ${this.extensionDisplayName} extension: ${JSON.stringify(error)}`);
            return [];
        }
    }

    public async runWizardCommandWithoutExecutionId(command: WizardCommandConfig, agentAzureUserInput: IAzureAgentInput): Promise<void> {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.extensionDisplayName} does not yet have extension agent metadata initialized`);
        }

        if (this._extensionAgentMetadata.runWizardCommandWithoutExecutionCommandId === undefined) {
            throw new Error(`Extension ${this.extensionDisplayName} does not provide a runWizardCommandWithoutExecutionCommandId`);
        }
        await vscode.commands.executeCommand(this._extensionAgentMetadata.runWizardCommandWithoutExecutionCommandId, command, agentAzureUserInput);
    }

    public getRunWizardCommandWithInputsCommand(command: WizardCommandConfig, inputQueue: AzureUserInputQueue): vscode.Command {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.extensionDisplayName} does not yet have extension agent metadata initialized`);
        }

        if (this._extensionAgentMetadata.runWizardCommandWithInputsCommandId === undefined) {
            throw new Error(`Extension ${this.extensionDisplayName} does not provide a runWizardCommandWithInputsCommandId`);
        }
        return { title: command.displayName, command: this._extensionAgentMetadata.runWizardCommandWithInputsCommandId, arguments: [command, inputQueue] };
    }

    public getRunSimpleCommandCommand(command: SimpleCommandConfig): vscode.Command {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.extensionDisplayName} does not yet have extension agent metadata initialized`);
        }

        return { title: command.displayName, command: command.commandId };
    }

    public async runSkillCommand(command: SkillCommandConfig, args: SkillCommandArgs): Promise<void> {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.extensionDisplayName} does not yet have extension agent metadata initialized`);
        }

        await vscode.commands.executeCommand(command.commandId, args);
    }

    private _cachedAgentBenchmarkConfigs: (AgentBenchmarkConfig | AgentBenchmarkWithStepsConfig)[] | undefined;
    public async getAgentBenchmarkConfigs(): Promise<(AgentBenchmarkConfig | AgentBenchmarkWithStepsConfig)[]> {
        if (!this._extensionAgentMetadata) {
            return [];
        }

        try {
            if (this._cachedAgentBenchmarkConfigs === undefined) {
                if (this._extensionAgentMetadata.getAgentBenchmarkConfigsCommandId !== undefined) {
                    this._cachedAgentBenchmarkConfigs = await vscode.commands.executeCommand<(AgentBenchmarkConfig | AgentBenchmarkWithStepsConfig)[]>(this._extensionAgentMetadata.getAgentBenchmarkConfigsCommandId) || [];
                } else {
                    this._cachedAgentBenchmarkConfigs = [];
                }
            }
            return this._cachedAgentBenchmarkConfigs;
        } catch (error) {
            this._cachedAgentBenchmarkConfigs = [];
            ext.outputChannel.debug(`Error getting wizard commands from ${this.extensionDisplayName} extension: ${JSON.stringify(error)}`);
            return [];
        }
    }

    private _cachedCommandConfigs: (WizardCommandConfig | SimpleCommandConfig | SkillCommandConfig)[] | undefined;
    private async _getCommandConfigs(): Promise<(WizardCommandConfig | SimpleCommandConfig | SkillCommandConfig)[]> {
        if (!this._extensionAgentMetadata) {
            return [];
        }

        try {
            if (this._cachedCommandConfigs === undefined) {
                this._cachedCommandConfigs = await vscode.commands.executeCommand<(WizardCommandConfig | SimpleCommandConfig)[]>(this._extensionAgentMetadata.getCommandsCommandId) || [];
            }
            return this._cachedCommandConfigs;
        } catch (error) {
            this._cachedCommandConfigs = [];
            ext.outputChannel.debug(`Error getting wizard commands from ${this.extensionDisplayName} extension: ${JSON.stringify(error)}`);
            return [];
        }
    }
}
