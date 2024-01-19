/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { type IAzureUserInput } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { type AzureUserInputQueue, type IAgentUserInput } from "./AgentUserInput";

export type WizardBasedExtensionCommandConfig = {
    /**
     * A camel cased string that names the command.
     * @example "createNewFunctionProject"
     */
    name: string;

    /**
     * The VS Code command ID that this command maps to.
     * @example "azureFunctions.createNewFunctionProject"
     */
    commandId: string;

    /**
     * The display name of the command.
     * @example "Create New Function Project"
     */
    displayName: string;

    /**
     * A sentence description that helps a LLM understand when the command should be used.
     *
     * The description should give an understanding of what a user prompt which matches to this
     * command would look like. Give examples of terminology that the user might use, the type of
     * statements they might make, and the type of questions they might ask. Also consider giving
     * examples of what terminology or types of statements would not match to this command.
     *
     * For example:
     *
     * *This is best when users ask to create a Function App resource in Azure. They may refer
     * to a Function App as 'Function App', 'function', 'function resource', 'function app
     * resource', 'function app' etc. This command is not useful if the user is asking how to do something, or
     * if something is possible.*
     */
    intentDescription?: string;

    /**
     * If the command requires that a workspace is currently open.
     */
    requiresWorkspaceOpen: boolean;

    /**
     * If the command requires that the user is logged into Azure.
     */
    requiesAzureLogin: boolean;
};

export type WizardBasedExtensionConfig = {
    /**
     * The ID of the extension.
     */
    readonly extensionId: string;

    /**
     * The display name of the extension.
     * @example "Azure Functions Extension"
    */
    readonly displayName: string;

    /**
     * The VS Code command ID of a command that the extension implements which can be used to get the list
     * of {@link WizardBasedExtensionCommandConfig}s that the extension implements.
     *
     * Note: the function type is only for testing in the agent extension itself.
     */
    readonly getWizardCommandsCommandId: string;

    /**
     * The VS Code command ID of a command that the extension implements which can be used to silently run the wizard associated
     * with a {@link WizardBasedExtensionCommandConfig}. The wizard should not result in any actual changes being made.
     *
     * The command should take two parameters:
     * - A {@link WizardBasedExtensionCommandConfig}: the command that should be run.
     * - A {@link IAzureUserInput}: the user input that the command should use when needing to present user input.
     */
    readonly runWizardCommandId: string;

    /**
     * The VS Code command ID of a command that the extension implements which can be used to run a {@link WizardBasedExtensionCommandConfig} with
     * a predefined set of inputs.
     *
     * The command should take two parameters:
     * - A {@link WizardBasedExtensionCommandConfig}: the command that should be run.
     * - A {@link AzureUserInputQueue}: the inputs that the command should use when needing to present user input.
     */
    readonly runWizardCommandWithInputsCommandId: string;
}

export class WizardBasedExtension {
    public readonly displayName: string;
    public readonly runWizardCommandWithInputsCommandId: string;

    private _config: WizardBasedExtensionConfig;

    constructor(config: WizardBasedExtensionConfig) {
        this.displayName = config.displayName;
        this.runWizardCommandWithInputsCommandId = config.runWizardCommandWithInputsCommandId;
        this._config = config;
    }

    public async activate(): Promise<void> {
        if (this._config.extensionId !== "") {
            await vscode.extensions.getExtension(this._config.extensionId)?.activate();
        }
    }

    public async getWizardCommands(): Promise<WizardBasedExtensionCommandConfig[]> {
        if (this._config.getWizardCommandsCommandId === "") {
            return [];
        }
        return await vscode.commands.executeCommand<WizardBasedExtensionCommandConfig[]>(this._config.getWizardCommandsCommandId);
    }

    public async runWizardCommand(command: WizardBasedExtensionCommandConfig, agentAzureUserInput: IAgentUserInput): Promise<void> {
        if (this._config.runWizardCommandId !== "") {
            await vscode.commands.executeCommand(this._config.runWizardCommandId, command, agentAzureUserInput);
        }
    }
}
