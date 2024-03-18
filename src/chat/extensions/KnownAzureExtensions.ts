/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

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
