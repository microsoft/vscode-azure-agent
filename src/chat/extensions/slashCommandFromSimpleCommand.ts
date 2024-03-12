/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from "vscode";
import { type SimpleCommandConfig } from "../../../api";
import { type AgentRequest } from "../agent";
import { getSignInCommand, isUserSignedInToAzure } from "../azureSignIn";
import { type SlashCommand, type SlashCommandHandlerResult } from "../slashCommands";
import { type AzureExtension } from "./AzureExtension";

export function slashCommandFromSimpleCommand(command: SimpleCommandConfig, extension: AzureExtension): SlashCommand {
    return [
        command.name,
        {
            shortDescription: command.displayName,
            longDescription: command.displayName,
            intentDescription: command.intentDescription || command.displayName,
            handler: async (request: AgentRequest): Promise<SlashCommandHandlerResult> => {
                const followUps: vscode.ChatFollowup[] = [];

                request.responseStream.markdown(`Ok, I can help you by using the the **${command.displayName}** command from the **${extension.extensionDisplayName}** extension.`);

                // @todo: handle this case
                // if (command.requiresWorkspaceOpen === true) {
                //     // todo
                // } else {
                const isSignedIn = await isUserSignedInToAzure();
                if (command.requiresAzureLogin === true && !isSignedIn) {
                    request.responseStream.markdown(`Before I can help you though, you need to be signed in to Azure.\n\nPlease sign in and then try again.`);

                    request.responseStream.button(getSignInCommand());
                } else {
                    request.responseStream.markdown(`\n\You can go ahead and start with that by clicking the **${command.displayName}** button below.`);
                    request.responseStream.button(extension.getRunSimpleCommandCommand(command));
                }

                return { chatAgentResult: {}, followUp: followUps };
            }
        }
    ]
}
