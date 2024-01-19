/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { type IAzureUserInput } from "@microsoft/vscode-azext-utils";

export type WizardBasedExtensionCommand = {
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

export interface IWizardBasedExtension {
    /**
     * The ID of the extension.
     */
    extensionId: string;

    /**
     * The VS Code command ID of a command that the extension implements which can be used to get the list
     * of{@link WizardBasedExtensionCommand}s that the extension implements.
     *
     * Note: the function type is only for testing in the agent extension itself.
     */
    readonly getWizardCommandsCommandId: string | (() => Promise<WizardBasedExtensionCommand[]>);

    /**
     * The display name of the extension.
     * @example "Azure Functions Extension"
     */
    readonly displayName: string;

    /**
     * The VS Code command ID of a command that the extension implements which can be used to silently run the wizard associated
     * with a {@link WizardBasedExtensionCommand}. The wizard should not result in any actual changes being made.
     *
     * The command should take two parameters:
     * - A {@link WizardBasedExtensionCommand}: the command that should be run.
     * - A {@link IAzureUserInput}: the user input that the command should use when needing to present user input.
     */
    readonly runWizardCommandId: string;

    /**
     * The VS Code command ID of a command that the extension implements which can be used to run a {@link WizardBasedExtensionCommand} with
     * a predefined set of inputs.
     *
     * The command should take two parameters:
     * - A {@link WizardBasedExtensionCommand}: the command that should be run.
     * - A {@link AzureUserInputQueue}: the inputs that the command should use when needing to present user input.
     */
    readonly runWizardWithInputsCommandId: string;
}
