/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ExtensionSlashCommandsOwner } from "./extensionSlashCommands";

export const functionsExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner("ms-azuretools.vscode-azurefunctions", "Azure Functions", "Azure Functions", "functions");
export const storageExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner("ms-azuretools.vscode-azurestorage", "Azure Storage", "Azure Storage", "storage");
export const appServiceExtensionSlashCommandsOwner: ExtensionSlashCommandsOwner = new ExtensionSlashCommandsOwner("ms-azuretools.vscode-azureappservice", "Azure App Service", "Azure App Service", "appservice");
