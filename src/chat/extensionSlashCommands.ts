/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AgentRequest } from "./agent";
import { getBrainstormCommand, getLearnCommand, getMightBeInterestedHandler, type BrainstormCommandConfig, type LearnCommandConfig, type MightBeInterestedHandlerConfig } from "./commonCommandsAndHandlers";
import { SlashCommandsOwner, type InvokeableSlashCommands, type SlashCommand, type SlashCommandHandlerResult } from "./slashCommands";
import { slashCommandFromWizardBasedExtensionCommand } from "./wizardBasedExtensionSchema/slashCommandFromWizardBaseExtensionCommand";
import { type WizardBasedExtension } from "./wizardBasedExtensionSchema/wizardBasedExtensionSchema";
import { getNoCommandsWizardExtensionConfig } from "./wizardBasedExtensionSchema/wizardExtensions";

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
                longDescription: `Use this command when you want to work with the ${this._extensionName} extension for VS Code and ${this._azureServiceName}.`,
                intentDescription: `This is best when a user prompt could be related to the ${this._extensionName} extension for VS Code or ${this._azureServiceName}.`,
                handler: (...args) => this._handleExtensionSlashCommand(...args),
            }
        ]
    }

    private async _handleExtensionSlashCommand(request: AgentRequest): Promise<SlashCommandHandlerResult> {
        const extensionLevelSlashCommandsOwner = await this._getExtensionSlashCommandsOwner();
        return await extensionLevelSlashCommandsOwner.handleRequestOrPrompt(request);
    }

    private async _getExtensionSlashCommandsOwner(): Promise<SlashCommandsOwner> {
        if (!this._extensionSlashCommandsOwner) {
            const extensionSlashCommands: InvokeableSlashCommands = new Map([
                getBrainstormCommand(this._commonSlashCommandConfigs.brainstorm),
                getLearnCommand(this._commonSlashCommandConfigs.learn),
            ]);

            await this._extension.activate();

            const extensionWizardCommands = await this._extension.getWizardCommands();
            for (const commandSchema of extensionWizardCommands) {
                const slashCommand = slashCommandFromWizardBasedExtensionCommand(commandSchema, this._extension);
                extensionSlashCommands.set(slashCommand[0], slashCommand[1]);
            }
            const mightBeInterestedHandler = getMightBeInterestedHandler(this._commonSlashCommandConfigs.mightBeInterested);
            this._extensionSlashCommandsOwner = new SlashCommandsOwner(extensionSlashCommands, { noInput: mightBeInterestedHandler, default: mightBeInterestedHandler });
        }
        return this._extensionSlashCommandsOwner;
    }
}

const functionsExtension = getNoCommandsWizardExtensionConfig("Azure Functions");
const functionsCommonSlashCommandConfigs: CommonSlashCommandAndHandlerConfigs = {
    brainstorm: {
        shortTopic: "Azure Functions",
        longTopic: "Azure Functions and/or the Azure Functions extension for VS Code",
        noInputSuggestions: [
            "How can I use Azure Functions to serve dynamic content and APIs?",
            "How can I use Azure Functions to run background jobs or scheduled tasks?",
            "How can I use Azure Functions to process files as soon as they are uploaded?",
        ],
        followUpApiProvider: functionsExtension,
    },
    learn: {
        shortTopic: "Azure Functions",
        longTopic: "Azure Functions and/or the Azure Functions extension for VS Code",
        noInputSuggestions: [
            "What is the difference between Azure functions and Azure web apps?",
            "How scalable is Azure functions?",
            "Is Azure functions serverless?",
        ],
        followUpApiProvider: functionsExtension,
    },
    mightBeInterested: {
        topic: "Azure Functions extension for VS Code",
        suggestions: [
            "I want to use Azure Functions to serve dynamic content and APIs.",
            "I want to use Azure Functions to run background jobs or scheduled tasks.",
            "I want to use Azure Functions to process files as soon as they are uploaded.",
        ]
    }
}
export const functionsExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner(
    functionsExtension,
    "functions",
    "Azure Functions",
    "Azure Functions",
    functionsCommonSlashCommandConfigs
);

const storageExtension = getNoCommandsWizardExtensionConfig("Azure Storage");
const storageCommonSlashCommandConfigs: CommonSlashCommandAndHandlerConfigs = {
    brainstorm: {
        shortTopic: "Azure Storage",
        longTopic: "Azure Storage and/or the Azure Storage extension for VS Code",
        noInputSuggestions: [
            "How can I use Azure Storage to store files?",
            "How can I use Azure Storage to communicate tasks between services?",
            "How can I use Azure Storage to store tabular data?",
        ]
    },
    learn: {
        shortTopic: "Azure Storage",
        longTopic: "Azure Storage and/or the Azure Storage extension for VS Code",
        noInputSuggestions: [
            "What is the difference between Azure Storage and Azure CosmosDB?",
            "How scalable is Azure Storage?",
            "What developer tooling exists for Azure Storage?",
        ]
    },
    mightBeInterested: {
        topic: "Azure Storage extension for VS Code",
        suggestions: [
            "I want to use Azure Storage to to store files.",
            "I want to use Azure Storage to communicate tasks between services.",
            "I want to use Azure Storage to store tabular data.",
        ]
    }
}
export const storageExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner(
    storageExtension,
    "storage",
    "Azure Storage",
    "Azure Storage",
    storageCommonSlashCommandConfigs
);

const appServiceExtension = getNoCommandsWizardExtensionConfig("Azure App Service");
const appServiceCommonSlashCommandConfigs: CommonSlashCommandAndHandlerConfigs = {
    brainstorm: {
        shortTopic: "Azure App Service",
        longTopic: "Azure App Service and/or the Azure App Service extension for VS Code",
        noInputSuggestions: [
            "How can I use Azure App Service to host a website?",
            "How can I use Azure App Service to host an API?",
            "How can I use Azure App Service to host a web app?",
        ]
    },
    learn: {
        shortTopic: "Azure App Service",
        longTopic: "Azure App Service and/or the Azure App Service extension for VS Code",
        noInputSuggestions: [
            "What is the difference between Azure App Service and Azure Functions?",
            "How scalable is Azure App Service?",
            "What programming languages can I use to create an Azure App Service?",
        ]
    },
    mightBeInterested: {
        topic: "Azure App Service extension for VS Code",
        suggestions: [
            "I want to use Azure App Service to host a website.",
            "I want to use Azure App Service to host an API.",
            "I want to use Azure App Service to host a web app.",
        ]
    }
};
export const appServiceExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner(
    appServiceExtension,
    "appservice",
    "Azure App Service",
    "Azure App Service",
    appServiceCommonSlashCommandConfigs
);
