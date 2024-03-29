/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { registerAzureUtilsExtensionVariables } from '@microsoft/vscode-azext-azureutils';
import { callWithTelemetryAndErrorHandling, createAzExtLogOutputChannel, registerCommand, registerUIExtensionVariables, type IActionContext } from '@microsoft/vscode-azext-utils';
import type * as vscode from 'vscode';
import { registerChatParticipant } from './chat/agent';
import { showArgQueryResult } from './chat/argQuery/commands/showArgQueryResult';
import { ext } from './extensionVariables';

export async function activateInternal(context: vscode.ExtensionContext, perfStats: { loadStartTime: number; loadEndTime: number }, ignoreBundle?: boolean): Promise<void> {
    ext.context = context;
    ext.ignoreBundle = ignoreBundle;
    ext.outputChannel = createAzExtLogOutputChannel('Azure Agent');

    registerUIExtensionVariables(ext);
    registerAzureUtilsExtensionVariables(ext);

    registerCommand("azureAgent.showArgQueryResult", showArgQueryResult);

    await callWithTelemetryAndErrorHandling(`${ext.prefix}.activate`, async (activateContext: IActionContext) => {
        activateContext.telemetry.properties.isActivationEvent = 'true';
        activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

        registerChatParticipant();
    });
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivateInternal(): void {
}
