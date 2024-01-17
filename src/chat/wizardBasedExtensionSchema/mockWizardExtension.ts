/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { type IWizardBasedExtension, type RunWizardForCommandResult } from "./wizardBasedExtensionSchema";

export const azureFunctionsWizardExtension: IWizardBasedExtension = {
    displayName: "Azure Functions",
    activate: async () => {
        // handle later
    },
    getCommands: async () => [
        {
            commandId: 'azureFunctions.createFunctionApp',
            displayName: 'Create Function App with Wizard',
            name: 'createFunctionAppWithWizard',
            intentDescription: "Create a new Azure Function App"
        }
    ],
    runWizardForCommand: async (command, ui) => {
        return await (vscode.commands.executeCommand('azureFunctions.runWizardForCommand', command, ui) as Promise<RunWizardForCommandResult>);
    },
};
