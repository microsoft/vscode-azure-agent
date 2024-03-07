/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type CancellationToken, type ChatFollowup, type ChatResult } from "vscode";
import { type AgentRequest, type IAgentRequestHandler } from "../agent";
import { getDefaultAzureExtensionCommandHandler } from "../commonCommandsAndHandlers";
import { SlashCommandsOwner, type SlashCommand, type SlashCommandHandlerResult, type SlashCommands } from "../slashCommands";
import { AzureExtension } from "./AzureExtension";
import { slashCommandFromSimpleCommand } from "./slashCommandFromSimpleCommand";
import { slashCommandFromWizardCommand } from "./slashCommandFromWizardCommand";

export class ExtensionSlashCommandsOwner implements IAgentRequestHandler {
    private _extension: AzureExtension;
    private _commandName: string;
    private _extensionDisplayName: string;

    /**
     * Lazily loaded.
     */
    private _extensionSlashCommandsOwner: SlashCommandsOwner | undefined;

    constructor(extensionId: string, extensionDisplayName: string, _azureServiceName: string, commandName: string) {
        this._extension = new AzureExtension(extensionId, extensionDisplayName);
        this._extensionDisplayName = extensionDisplayName;
        this._commandName = commandName;
    }

    public async handleRequestOrPrompt(request: AgentRequest, handlerChain: string[]): Promise<SlashCommandHandlerResult> {
        return (await this._getExtensionSlashCommandsOwner(request)).handleRequestOrPrompt(request, handlerChain);
    }

    public getFollowUpForLastHandledSlashCommand(result: ChatResult, token: CancellationToken): ChatFollowup[] | undefined {
        // Should be ok to call the property directly, if the extension slash commands owner has
        // not been loaded then there shouldn't even be a follow up to get.
        return this._extensionSlashCommandsOwner?.getFollowUpForLastHandledSlashCommand(result, token);
    }

    public getTopLevelSlashCommand(): SlashCommand {
        return [
            this._commandName,
            {
                shortDescription: `Work with the ${this._extensionDisplayName} extension for VS Code.`,
                longDescription: `Use the command when you want to learn about or work with the ${this._extensionDisplayName} extension for VS Code.`,
                intentDescription: `This is best when a user prompt could be related to the ${this._extensionDisplayName} extension for VS Code.`,
                handler: (...args) => this.handleRequestOrPrompt(...args),
            }
        ]
    }

    public getExtension(): AzureExtension {
        return this._extension;
    }

    private async _getExtensionSlashCommandsOwner(request: AgentRequest): Promise<SlashCommandsOwner> {
        if (!this._extensionSlashCommandsOwner) {
            await this._extension.activate(request);

            const extensionSlashCommands: SlashCommands = new Map([
                // Having a /learn for each extension is currently off the table. We'll just have a /learn at the top level.
                // Uncomment this in the future if we decide to have a /learn for each extension/service.
                // getLearnCommand({ topic: `${this._azureServiceName} and/or the ${this._extensionDisplayName} extension for VS Code`, associatedExtension: this._extension }),
            ]);

            if (this._extension.isInstalled()) {
                const extensionWizardCommands = await this._extension.getWizardCommands();
                for (const commandConfig of extensionWizardCommands) {
                    const slashCommand = slashCommandFromWizardCommand(commandConfig, this._extension);
                    extensionSlashCommands.set(slashCommand[0], slashCommand[1]);
                }

                const extensionSimpleCommands = await this._extension.getSimpleCommands();
                for (const commandConfig of extensionSimpleCommands) {
                    const slashCommand = slashCommandFromSimpleCommand(commandConfig, this._extension);
                    extensionSlashCommands.set(slashCommand[0], slashCommand[1]);
                }
            }

            const schema = await this._extension.getTypechatSchema();

            const mightBeInterestedHandler = getDefaultAzureExtensionCommandHandler({ associatedExtension: this._extension });
            this._extensionSlashCommandsOwner = new SlashCommandsOwner({ noInput: mightBeInterestedHandler, default: mightBeInterestedHandler }, { schema });
            this._extensionSlashCommandsOwner.addInvokeableSlashCommands(extensionSlashCommands);
        }
        return this._extensionSlashCommandsOwner;
    }
}

