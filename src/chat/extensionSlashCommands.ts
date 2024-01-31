/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AgentRequest } from "./agent";
import { getBrainstormCommand, getLearnCommand, getMightBeInterestedHandler, type BrainstormCommandConfig, type LearnCommandConfig, type MightBeInterestedHandlerConfig } from "./commonCommandsAndHandlers";
import { SlashCommandsOwner, type SlashCommand, type SlashCommandHandlerResult, type SlashCommands } from "./slashCommands";
import { slashCommandFromWizardBasedExtensionCommand } from "./wizardBasedExtensionSchema/slashCommandFromWizardBaseExtensionCommand";
import { type WizardBasedExtension } from "./wizardBasedExtensionSchema/wizardBasedExtensionSchema";

export type CommonSlashCommandAndHandlerConfigs = {
    brainstorm: BrainstormCommandConfig;
    learn: LearnCommandConfig;
    mightBeInterested: MightBeInterestedHandlerConfig;
}

export class ExtensionSlashCommandsOwner {
    private _extension: WizardBasedExtension;
    private _commandName: string;
    private _extensionName: string;
    private _azureServiceName: string;
    private _commonSlashCommandConfigs: CommonSlashCommandAndHandlerConfigs;

    /**
     * Lazily loaded.
     */
    private _extensionSlashCommandsOwner: SlashCommandsOwner | undefined;

    constructor(extension: WizardBasedExtension, commandName: string, extensionName: string, azureServiceName: string, commonSlashCommandConfigs: CommonSlashCommandAndHandlerConfigs) {
        this._extension = extension;
        this._commandName = commandName;
        this._extensionName = extensionName;
        this._azureServiceName = azureServiceName;
        this._commonSlashCommandConfigs = commonSlashCommandConfigs;
    }

    public getTopLevelSlashCommand(): SlashCommand {
        return [
            this._commandName,
            {
                shortDescription: `Work with the ${this._extensionName} extension for VS Code and/or ${this._azureServiceName}`,
                longDescription: `Use the command when you want to learn about or work with ${this._azureServiceName} or the ${this._extensionName} extension for VS Code.`,
                intentDescription: `This is best when a user prompt could be related to the ${this._extensionName} extension for VS Code or ${this._azureServiceName}.`,
                handler: (...args) => this._handleExtensionSlashCommand(...args),
            }
        ]
    }

    private async _handleExtensionSlashCommand(request: AgentRequest): Promise<SlashCommandHandlerResult> {
        const extensionLevelSlashCommandsOwner = await this._getExtensionSlashCommandsOwner(request);
        return await extensionLevelSlashCommandsOwner.handleRequestOrPrompt(request);
    }

    private async _getExtensionSlashCommandsOwner(request: AgentRequest): Promise<SlashCommandsOwner> {
        if (!this._extensionSlashCommandsOwner) {
            await this._extension.activate(request);

            const extensionSlashCommands: SlashCommands = new Map([
                getBrainstormCommand(this._commonSlashCommandConfigs.brainstorm),
                getLearnCommand(this._commonSlashCommandConfigs.learn),
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

            const mightBeInterestedHandler = getMightBeInterestedHandler(this._commonSlashCommandConfigs.mightBeInterested);
            this._extensionSlashCommandsOwner = new SlashCommandsOwner({ noInput: mightBeInterestedHandler, default: mightBeInterestedHandler });
            this._extensionSlashCommandsOwner.addInvokeableSlashCommands(extensionSlashCommands);
        }
        return this._extensionSlashCommandsOwner;
    }
}
