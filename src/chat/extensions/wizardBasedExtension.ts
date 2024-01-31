/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import * as vscode from "vscode";
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import  { type AgentBenchmarkConfig} from "@microsoft/vscode-azext-utils";
import { type AzureUserInputQueue, type ExtensionAgentMetadata, type IAzureAgentInput, type WizardBasedCommandConfig } from "@microsoft/vscode-azext-utils";
import { type AgentRequest } from "../agent";

export class WizardBasedExtension {
    public readonly extensionId: string;
    public readonly displayName: string;

    private _extensionAgentMetadata: ExtensionAgentMetadata | undefined;
    private _extension: vscode.Extension<object> | undefined;

    constructor(extensionId: string, displayName: string) {
        this.extensionId = extensionId;
        this.displayName = displayName;
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
                request.progress.report({ message: `Activating the ${this.displayName} extension...` })
                await this._extension.activate();
            }
        }
    }

    public async getWizardCommands(): Promise<WizardBasedCommandConfig[]> {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.displayName} does not yet have extension agent metadata initialized`);
        }

        try {
            return await vscode.commands.executeCommand<WizardBasedCommandConfig[]>(this._extensionAgentMetadata.getWizardCommandsCommandId);
        } catch (error) {
            console.log(`Error getting wizard commands from ${this.displayName} extension: ${JSON.stringify(error)}`);
            return [];
        }
    }

    public async runWizardCommandWithoutExecutionId(command: WizardBasedCommandConfig, agentAzureUserInput: IAzureAgentInput): Promise<void> {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.displayName} does not yet have extension agent metadata initialized`);
        }

        if (this._extensionAgentMetadata.runWizardCommandWithoutExecutionId !== "") {
            await vscode.commands.executeCommand(this._extensionAgentMetadata.runWizardCommandWithoutExecutionId, command, agentAzureUserInput);
        }
    }

    public getRunWizardCommandWithInputsFollowUp(command: WizardBasedCommandConfig, inputQueue: AzureUserInputQueue): vscode.ChatAgentFollowup {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.displayName} does not yet have extension agent metadata initialized`);
        }

        return { title: command.displayName, commandId: this._extensionAgentMetadata.runWizardCommandWithInputsCommandId, args: [command, inputQueue] };
    }

    public async getAgentBenchmarkConfigs(): Promise<AgentBenchmarkConfig[]> {
        if (!this._extensionAgentMetadata) {
            throw new Error(`Extension ${this.displayName} does not yet have extension agent metadata initialized`);
        }

        try {
            return await vscode.commands.executeCommand<AgentBenchmarkConfig[]>(this._extensionAgentMetadata.getAgentBenchmarkConfigsCommandId);
        } catch (error) {
            console.log(`Error getting wizard commands from ${this.displayName} extension: ${JSON.stringify(error)}`);
            return [];
        }
    }
}
