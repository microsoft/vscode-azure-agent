/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { agentHelpCommandName } from "../agentHelpSlashCommand";
import { SlashCommandsOwner, type SlashCommand } from "../slashCommands";
import { ExtensionSlashCommandsOwner } from "./ExtensionSlashCommandsOwner";

export const appServiceExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner("ms-azuretools.vscode-azureappservice", "Azure App Service", "Azure App Service", "appservice");
export const azdExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner("ms-azuretools.azure-dev", "Azure Developer CLI", "Azure Developer CLI", "azd");
export const containerAppsExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner("ms-azuretools.vscode-azurecontainerapps", "Azure Container Apps", "Azure Container Apps", "containerApps");
export const databasesExtensionCosmosDbSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner("ms-azuretools.vscode-cosmosdb", "Azure Databases", "Azure Cosmos DB", "cosmosDB");
export const databasesExtensionPostgreSQLSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner("ms-azuretools.vscode-cosmosdb", "Azure Databases", "Azure Database for PostgreSQL", "postgreSQL");
export const functionsExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner("ms-azuretools.vscode-azurefunctions", "Azure Functions", "Azure Functions", "functions");
export const staticWebAppsExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner("ms-azuretools.vscode-azurestaticwebapps", "Azure Static Web Apps", "Azure Static Web Apps", "staticWebApps");
export const storageExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner("ms-azuretools.vscode-azurestorage", "Azure Storage", "Azure Storage", "storage");
export const virtualMachinesExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner("ms-azuretools.vscode-azurevirtualmachines", "Azure Virtual Machines", "Azure Virtual Machines", "virtualMachines");

export const azureExtensionsCommandName = "azureExtensions";

/**
 * Owns slash commands for the Azure Extensions for VS Code.
 */
const agentSlashCommandsOwner = new SlashCommandsOwner({ noInput: agentHelpCommandName, default: agentHelpCommandName, });
agentSlashCommandsOwner.addInvokeableSlashCommands(new Map([
    appServiceExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    azdExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    containerAppsExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    databasesExtensionCosmosDbSlashCommandsOwner.getTopLevelSlashCommand(),
    databasesExtensionPostgreSQLSlashCommandsOwner.getTopLevelSlashCommand(),
    functionsExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    staticWebAppsExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    storageExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
    virtualMachinesExtensionSlashCommandsOwner.getTopLevelSlashCommand(),
]));

export const azureExtensionsCommand: SlashCommand = [
    azureExtensionsCommandName,
    {
        shortDescription: `Work with the Azure Extensions for VS Code.`,
        longDescription: `Use the command when you want to accomplish things by using the Azure extensions for VS Code.`,
        intentDescription: `This is best when a user is explicitly asking to do something via one of the Azure extensions for VS Code. If they are asking a question, even if the question is about any of the
        Azure extensions for VS Code, this is not the best command to use.`,
        handler: (...args) => agentSlashCommandsOwner.handleRequestOrPrompt(...args),
    }
];
