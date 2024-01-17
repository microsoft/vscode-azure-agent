/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { WizardBasedExtension, type WizardBasedExtensionCommandConfig } from "./wizardBasedExtensionSchema";

const azureFunctionsWizardCommandConfigs: WizardBasedExtensionCommandConfig[] = [
    {
        name: "createFunctionAppWithWizard",
        commandId: "azureFunctions.createFunctionApp",
        displayName: "Create Function App",
        intentDescription: "This is best when users ask to create a Function App resource in Azure. They may refer to a Function App as 'Function App', 'function', 'function resource', 'function app resource', 'function app' etc. This command is not useful if the user is asking how to do something, or if something is possible."
    }
];

export const azureFunctionsWizardExtension: WizardBasedExtension = new WizardBasedExtension({
    extensionId: "ms-azuretools.vscode-azurefunctions",
    displayName: "Azure Functions",
    getWizardCommandsCommandId: () => azureFunctionsWizardCommandConfigs,
    runWizardCommandId: "azureFunctions.runWizardForCommand",
    runWizardCommandWithInputsCommandId: "azureFunctions.runWizardForCommandWithInputs"
})

export function getNoCommandsWizardExtensionConfig(displayName: string, extensionId: string): WizardBasedExtension {
    return new WizardBasedExtension({
        extensionId: extensionId,
        displayName: displayName,
        getWizardCommandsCommandId: "",
        runWizardCommandId: "",
        runWizardCommandWithInputsCommandId: "",
    });
}
