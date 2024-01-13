/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAzureUserInput, PromptResult } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { type IWizardBasedExtension } from "./wizardBasedExtensionSchema";

/**
 * This class is used to expose an Agent as an IAzureUserInput to wizard based extensions. Or in other words, when
 * the agent asks an {@link IWizardBasedExtension} to {@link IWizardBasedExtension.runWizardForCommand} and the extension
 * needs to prompt the agent for input, an instance of this class will be called into.
 */
export class AgentWizardInput implements IAzureUserInput {

    constructor() {
        this._onDidFinishPromptEmitter = new vscode.EventEmitter<PromptResult>();
    }

    // #region IAzureUserInput

    private readonly _onDidFinishPromptEmitter: vscode.EventEmitter<PromptResult>;

    public get onDidFinishPrompt(): vscode.Event<PromptResult> {
        return this._onDidFinishPromptEmitter.event;
    }

    public async showQuickPick<T extends vscode.QuickPickItem>(items: T[] | Thenable<T[]>, options: vscode.QuickPickOptions): Promise<T | T[]> {
        const quickPickResult = await this._activeHandler?.showQuickPick(items, options);
        if (quickPickResult !== undefined) {
            return quickPickResult;
        } else {
            throw new Error("Could not complete quick pick.");
        }
    }

    public async showInputBox(_options: vscode.InputBoxOptions): Promise<string> {
        throw new Error("Method not implemented.");
    }

    public async showWarningMessage<T extends vscode.MessageItem>(_message: string, ..._args: any[]): Promise<T> {
        throw new Error("Method not implemented.");
    }

    public async showOpenDialog(_options: vscode.OpenDialogOptions): Promise<vscode.Uri[]> {
        throw new Error("Method not implemented.");
    }

    // #endregion IAzureUserInput

    private _activeHandler: IAzureUserInput | undefined;

    /**
     * Sets the {@link IAzureUserInput} which is currently handling wizard inputs for the agent, for example, a slash command. This is not
     * exposed to wizard based extensions.
     */
    public setActiveWizardInputHandler(handler: IAzureUserInput) {
        this._activeHandler = handler;
    }
}
