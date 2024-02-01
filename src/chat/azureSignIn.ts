/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';
import type * as vscode from "vscode";

export function isUserSignedInToAzure(): Promise<boolean> {
    const subscriptionProvider = new VSCodeAzureSubscriptionProvider();
    return subscriptionProvider.isSignedIn();
}

export function getSignInFollowUp(): vscode.ChatAgentFollowup {
    return { title: "Sign in to Azure", commandId: "azureResourceGroups.logIn" };
}
