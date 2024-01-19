/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { WizardBasedExtension } from "./wizardBasedExtensionSchema";

export function getNoCommandsWizardExtensionConfig(displayName: string): WizardBasedExtension {
    return new WizardBasedExtension({
        extensionId: "",
        displayName: displayName,
        getWizardCommandsCommandId: "",
        runWizardCommandId: "",
        runWizardCommandWithInputsCommandId: "",
    });
}
