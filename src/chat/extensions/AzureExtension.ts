/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import * as vscode from "vscode";
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { type AgentBenchmarkConfig, type AzureUserInputQueue, type ExtensionAgentMetadata, type IAzureAgentInput, type SimpleCommandConfig, type WizardCommandConfig } from "@microsoft/vscode-azext-utils";
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

    public isCompatible(): boolean {
        return this.isInstalled() && this._extensionAgentMetadata !== undefined;
    }

    public async activate(request: AgentRequest): Promise<void> {
        if (this.extensionId !== "") {
            this._extension = this._extension || vscode.extensions.getExtension(this.extensionId);
            if (this._extension !== undefined) {
                request.responseStream.progress(`Activating the ${this.extensionDisplayName} extension...`);
                await this._extension.activate();
            }
        }
    }

    public async getWizardCommands(): Promise<WizardCommandConfig[]> {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.extensionDisplayName} does not yet have extension agent metadata initialized`);
        }

        try {
            return (await this._getCommandConfigs()).filter((commandConfig): commandConfig is WizardCommandConfig => commandConfig.type === "wizard");
        } catch (error) {
            console.log(`Error getting wizard commands from ${this.extensionDisplayName} extension: ${JSON.stringify(error)}`);
            return [];
        }
    }

    public async getSimpleCommands(): Promise<SimpleCommandConfig[]> {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.extensionDisplayName} does not yet have extension agent metadata initialized`);
        }

        try {
            return (await this._getCommandConfigs()).filter((commandConfig): commandConfig is SimpleCommandConfig => commandConfig.type === "simple");
        } catch (error) {
            console.log(`Error getting wizard commands from ${this.extensionDisplayName} extension: ${JSON.stringify(error)}`);
            return [];
        }
    }

    public async runWizardCommandWithoutExecutionId(command: WizardCommandConfig, agentAzureUserInput: IAzureAgentInput): Promise<void> {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.extensionDisplayName} does not yet have extension agent metadata initialized`);
        }

        await vscode.commands.executeCommand(this._extensionAgentMetadata.runWizardCommandWithoutExecutionCommandId, command, agentAzureUserInput);
    }

    public getRunWizardCommandWithInputsCommand(command: WizardCommandConfig, inputQueue: AzureUserInputQueue): vscode.Command {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.extensionDisplayName} does not yet have extension agent metadata initialized`);
        }

        return { title: command.displayName, command: this._extensionAgentMetadata.runWizardCommandWithInputsCommandId, arguments: [command, inputQueue] };
    }

    public getRunSimpleCommandCommand(command: SimpleCommandConfig): vscode.Command {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.extensionDisplayName} does not yet have extension agent metadata initialized`);
        }

        return { title: command.displayName, command: command.commandId };
    }

    public async getAgentBenchmarkConfigs(): Promise<AgentBenchmarkConfig[]> {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.extensionDisplayName} does not yet have extension agent metadata initialized`);
        }

        try {
            return await vscode.commands.executeCommand<AgentBenchmarkConfig[]>(this._extensionAgentMetadata.getAgentBenchmarkConfigsCommandId);
        } catch (error) {
            console.log(`Error getting wizard commands from ${this.extensionDisplayName} extension: ${JSON.stringify(error)}`);
            return [];
        }
    }

    private async _getCommandConfigs(): Promise<(WizardCommandConfig | SimpleCommandConfig)[]> {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.extensionDisplayName} does not yet have extension agent metadata initialized`);
        }

        try {
            return await vscode.commands.executeCommand<(WizardCommandConfig | SimpleCommandConfig)[]>(this._extensionAgentMetadata.getCommandsCommandId);
        } catch (error) {
            console.log(`Error getting wizard commands from ${this.extensionDisplayName} extension: ${JSON.stringify(error)}`);
            return [];
        }
    }
}
