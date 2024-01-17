/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { type IWizardBasedExtension } from "./wizardBasedExtensionSchema";

export function getNoCommandsWizardExtension(displayName: string): IWizardBasedExtension {
    return {
        displayName: displayName,
        activate: async () => {
            // handle later
        },
        getCommands: async () => [],
        runWizardForCommand: async () => {
            throw new Error("No commands");
        }
    }
}
