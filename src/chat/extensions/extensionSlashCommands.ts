/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AgentRequest } from "../agent";
import { getLearnCommand, getMightBeInterestedHandler } from "../commonCommandsAndHandlers";
import { SlashCommandsOwner, type SlashCommand, type SlashCommandHandlerResult, type SlashCommands } from "../slashCommands";
import { slashCommandFromWizardBasedExtensionCommand } from "./slashCommandFromWizardBasedExtensionCommand";
import { WizardBasedExtension } from "./wizardBasedExtension";

export class ExtensionSlashCommandsOwner {
    private _extension: WizardBasedExtension;
    private _commandName: string;
    private _extensionDisplayName: string;
    private _azureServiceName: string;

    /**
     * Lazily loaded.
     */
    private _extensionSlashCommandsOwner: SlashCommandsOwner | undefined;

    constructor(extensionId: string, extensionDisplayName: string, azureServiceName: string, commandName: string) {
        this._extension = new WizardBasedExtension(extensionId, extensionDisplayName);
        this._extensionDisplayName = extensionDisplayName;
        this._azureServiceName = azureServiceName;
        this._commandName = commandName;
    }

    public getTopLevelSlashCommand(): SlashCommand {
        return [
            this._commandName,
            {
                shortDescription: `Work with ${this._azureServiceName} and/or the ${this._extensionDisplayName} extension for VS Code.`,
                longDescription: `Use the command when you want to learn about or work with ${this._azureServiceName} and/or the ${this._extensionDisplayName} extension for VS Code.`,
                intentDescription: `This is best when a user prompt could be related to ${this._azureServiceName} and/or the ${this._extensionDisplayName} extension for VS Code.`,
                handler: (...args) => this._handleExtensionSlashCommand(...args),
            }
        ]
    }

    public getExtension(): WizardBasedExtension {
        return this._extension;
    }

    private async _handleExtensionSlashCommand(request: AgentRequest): Promise<SlashCommandHandlerResult> {
        const extensionLevelSlashCommandsOwner = await this._getExtensionSlashCommandsOwner(request);
        return await extensionLevelSlashCommandsOwner.handleRequestOrPrompt(request);
    }

    private async _getExtensionSlashCommandsOwner(request: AgentRequest): Promise<SlashCommandsOwner> {
        if (!this._extensionSlashCommandsOwner) {
            await this._extension.activate(request);

            const extensionSlashCommands: SlashCommands = new Map([
                getLearnCommand({ topic: `${this._azureServiceName} and/or the ${this._extensionDisplayName} extension for VS Code`, associatedExtension: this._extension }),
            ]);

            if (this._extension.isInstalled()) {
                if (this._extension.isCompatible()) {
                    const extensionWizardCommands = await this._extension.getWizardCommands();
                    for (const commandSchema of extensionWizardCommands) {
                        const slashCommand = slashCommandFromWizardBasedExtensionCommand(commandSchema, this._extension);
                        extensionSlashCommands.set(slashCommand[0], slashCommand[1]);
                    }
                } else {
                    console.log(`Extension ${this._extension.extensionId} is installed but not compatible`);
                }
            }

            const mightBeInterestedHandler = getMightBeInterestedHandler({ topic: `${this._azureServiceName} and/or the ${this._extensionDisplayName} extension for VS Code`, associatedExtension: this._extension });
            this._extensionSlashCommandsOwner = new SlashCommandsOwner({ noInput: mightBeInterestedHandler, default: mightBeInterestedHandler });
            this._extensionSlashCommandsOwner.addInvokeableSlashCommands(extensionSlashCommands);
        }
        return this._extensionSlashCommandsOwner;
    }
}
