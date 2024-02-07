/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from "vscode";

export async function isUserSignedInToAzure(): Promise<boolean> {
    // Not working...
    // const subscriptionProvider = new VSCodeAzureSubscriptionProvider();
    // return subscriptionProvider.isSignedIn();
    return true;
}

export function getSignInCommand(): vscode.Command {
    return { title: "Sign in to Azure", command: "azureResourceGroups.logIn" };
}
