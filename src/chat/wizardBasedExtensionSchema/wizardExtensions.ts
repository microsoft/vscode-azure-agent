/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ExtensionSlashCommandsOwner, type CommonSlashCommandAndHandlerConfigs } from "../extensionSlashCommands";
import { WizardBasedExtension } from "./wizardBasedExtension";

const functionsExtension = new WizardBasedExtension("ms-azuretools.vscode-azurefunctions", "Azure Functions");
const functionsCommonSlashCommandConfigs: CommonSlashCommandAndHandlerConfigs = {
    brainstorm: {
        shortTopic: "Azure Functions",
        longTopic: "Azure Functions and/or the Azure Functions extension for VS Code",
        noInputSuggestions: [
            "How can I use Azure Functions to serve dynamic content and APIs?",
            "How can I use Azure Functions to run background jobs or scheduled tasks?",
            "How can I use Azure Functions to process files as soon as they are uploaded?",
        ],
        associatedExtension: functionsExtension,
    },
    learn: {
        shortTopic: "Azure Functions",
        longTopic: "Azure Functions and/or the Azure Functions extension for VS Code",
        noInputSuggestions: [
            "What is the difference between Azure functions and Azure web apps?",
            "How scalable is Azure functions?",
            "Is Azure functions serverless?",
        ],
        associatedExtension: functionsExtension,
    },
    mightBeInterested: {
        topic: "Azure Functions and/or the Azure Functions extension for VS Code",
        suggestions: [
            "I want to use Azure Functions to serve dynamic content and APIs.",
            "I want to use Azure Functions to run background jobs or scheduled tasks.",
            "I want to use Azure Functions to process files as soon as they are uploaded.",
        ],
        associatedExtension: functionsExtension,
    }
}
export const functionsExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner(
    functionsExtension,
    "functions",
    "Azure Functions",
    "Azure Functions",
    functionsCommonSlashCommandConfigs
);

const storageExtension = new WizardBasedExtension("ms-azuretools.vscode-azurestorage", "Azure Storage");
const storageCommonSlashCommandConfigs: CommonSlashCommandAndHandlerConfigs = {
    brainstorm: {
        shortTopic: "Azure Storage",
        longTopic: "Azure Storage and/or the Azure Storage extension for VS Code",
        noInputSuggestions: [
            "How can I use Azure Storage to store files?",
            "How can I use Azure Storage to communicate tasks between services?",
            "How can I use Azure Storage to store tabular data?",
        ],
        associatedExtension: storageExtension,
    },
    learn: {
        shortTopic: "Azure Storage",
        longTopic: "Azure Storage and/or the Azure Storage extension for VS Code",
        noInputSuggestions: [
            "What is the difference between Azure Storage and Azure CosmosDB?",
            "How scalable is Azure Storage?",
            "What developer tooling exists for Azure Storage?",
        ],
        associatedExtension: storageExtension,
    },
    mightBeInterested: {
        topic: "Azure Storage and/or the Azure Storage extension for VS Code",
        suggestions: [
            "I want to use Azure Storage to to store files.",
            "I want to use Azure Storage to communicate tasks between services.",
            "I want to use Azure Storage to store tabular data.",
        ],
        associatedExtension: storageExtension,
    }
}
export const storageExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner(
    storageExtension,
    "storage",
    "Azure Storage",
    "Azure Storage",
    storageCommonSlashCommandConfigs
);

const appServiceExtension = new WizardBasedExtension("ms-azuretools.vscode-azureappservice", "Azure App Service");
const appServiceCommonSlashCommandConfigs: CommonSlashCommandAndHandlerConfigs = {
    brainstorm: {
        shortTopic: "Azure App Service",
        longTopic: "Azure App Service and/or the Azure App Service extension for VS Code",
        noInputSuggestions: [
            "How can I use Azure App Service to host a website?",
            "How can I use Azure App Service to host an API?",
            "How can I use Azure App Service to host a web app?",
        ],
        associatedExtension: appServiceExtension,
    },
    learn: {
        shortTopic: "Azure App Service",
        longTopic: "Azure App Service and/or the Azure App Service extension for VS Code",
        noInputSuggestions: [
            "What is the difference between Azure App Service and Azure Functions?",
            "How scalable is Azure App Service?",
            "What programming languages can I use to create an Azure App Service?",
        ],
        associatedExtension: appServiceExtension,
    },
    mightBeInterested: {
        topic: "Azure App Service and/or the Azure App Service extension for VS Code",
        suggestions: [
            "I want to use Azure App Service to host a website.",
            "I want to use Azure App Service to host an API.",
            "I want to use Azure App Service to host a web app.",
        ],
        associatedExtension: appServiceExtension,
    }
};
export const appServiceExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner(
    appServiceExtension,
    "appservice",
    "Azure App Service",
    "Azure App Service",
    appServiceCommonSlashCommandConfigs
);
