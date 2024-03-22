/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { type AgentRequest } from "./agent";
import { type AzureExtension } from "./extensions/AzureExtension";
import { type SlashCommandHandler } from "./slashCommands";

export type DefaultAzureExtensionCommandConfig = {
    associatedExtension: AzureExtension;
};

export function getDefaultAzureExtensionCommandHandler(config: DefaultAzureExtensionCommandConfig): SlashCommandHandler {
    return async (request: AgentRequest) => {
        const followUps: vscode.ChatFollowup[] = [];
        if (!config.associatedExtension.isInstalled()) {
            request.responseStream.markdown(`In order to help you I'd need to use the ${config.associatedExtension.extensionDisplayName} extension. However it is not currently installed.`);
            request.responseStream.button({ title: `Install the ${config.associatedExtension.extensionDisplayName} Extension`, command: "workbench.extensions.search", arguments: [config.associatedExtension.extensionId] });
        } else {
            request.responseStream.markdown(`It sounds like you are interested in the ${config.associatedExtension.extensionDisplayName} extension, however, I can't quite help with what you're asking about. Try asking something else.`);
        }
        return { chatAgentResult: {}, followUp: followUps, };
    }
}
