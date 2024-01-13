/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AgentWizardInput } from "./agentWizardInput";

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
     * @example "??????"
     */
    intentDescription?: string;
};

export type RunWizardForCommandResult =
    { type: "done"; } |
    { type: "moreWizardStepsExist"; };

export interface IWizardBasedExtension {
    /**
     * The display name of the extension.
     * @example "Azure Functions Extension"
     */
    readonly displayName: string;

    activate(agentWizardInput: AgentWizardInput): Promise<void>;
    getCommands(): Promise<WizardBasedExtensionCommand[]>;
    runWizardForCommand(command: WizardBasedExtensionCommand): Promise<RunWizardForCommandResult>;
}
