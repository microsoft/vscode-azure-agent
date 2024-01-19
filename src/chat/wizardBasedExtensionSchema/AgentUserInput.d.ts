/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from "vscode";
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { type AzExtInputBoxOptions, type IAzureQuickPickOptions, type IAzureUserInput, type PromptResult } from "@microsoft/vscode-azext-utils";

/**
 * A queue of inputs that should be used by an IAzureUserInput implementation to answer prompts instead of showing prompts to the user.
 * If the head of the queue is undefined or null, then the IAzureUserInput implementation should show a prompt to the user.
 *
 * @todo Move to vscode-azext-utils, or somewhere that both vscode-azureagent and service extensions have access to.
 *
 * @todo Should the standard implementation of IAzureUserInput that vscode-azext-utils provides support
 * taking in this queue, or should there be a new implementation of IAzureUserInput that supports it?
 */
export type AzureUserInputQueue = (vscode.QuickPickItem | string | vscode.MessageItem | vscode.Uri[] | undefined | null)[];

/**
 * @todo Move to vscode-azext-utils, or somewhere that both vscode-azureagent and service extensions have access to.
 */
export type AgentQuickPickItem = {
    agentMetadata: {
        /**
         * If the quick pick item should not be picked by the agent.
         */
        notApplicableToAgentPick?: boolean;
    }
} & vscode.QuickPickItem;

/**
 * @todo Move to vscode-azext-utils, or somewhere that both vscode-azureagent and service extensions have access to.
 */
export type AgentQuickPickOptions = {
    agentMetadata: {
        /**
         * A title cased string for the parameter this quick pick is for. Will be shown to the user.
         *
         * For example:
         * - "Subscription"
         * - "Resource Group"
         * - "Runtime"
         * - "Name"
         */
        paramterNameTitle: string;

        /**
         * A camel cased string that names the parameter this quick pick is for. Will be given to a LLM to identify the
         * parameter that it needs to pick a value for.
         *
         * For example:
         * - "subscription"
         * - "resourceGroup"
         * - "runtime"
         * - "name"
         */
        parameterName: string;

        /**
         * A description of the parameter this quick pick is for. Will be shown to the user.
         *
         * For example:
         * - "The subscription that the Storage Account should be created in."
         * - "The resource group that the Container App should be created in."
         * - "The function runtime for the Function App."
         * - "The name of the Static Web App."
         */
        parameterDescription: string;
    }
} & IAzureQuickPickOptions;

/**
 * @todo Move to vscode-azext-utils, or somewhere that both vscode-azureagent and service extensions have access to.
 */
export type AgentInputBoxOptions = {
    agentMetadata: {
        /**
         * A title cased string for the parameter that this input box is for. Will be shown to the user.
         *
         * For example:
         * - "Subscription"
         * - "Resource Group"
         * - "Runtime"
         */
        paramterNameTitle: string;

        /**
         * A camel cased string that names the parameter this input box is for. Will be given to a LLM to identify the
         * parameter that it needs to pick a value for.
         *
         * For example:
         * - "subscription"
         * - "resourceGroup"
         * - "runtime"
         */
        parameterName: string;

        /**
         * A description of the parameter this input box is for. Will be shown to the user.
         *
         * For example:
         * - "The subscription that the Storage Account should be created in."
         * - "The resource group that the Container App should be created in."
         * - "The function runtime for the Function App."
         */
        parameterDescription: string;
    }
} & AzExtInputBoxOptions;

/**
 * @todo Move to vscode-azext-utils, or somewhere that both vscode-azureagent and service extensions have access to.
 */
export interface IAgentUserInput extends IAzureUserInput {
    readonly onDidFinishPrompt: vscode.Event<PromptResult>;

    /**
    * Shows a multi-selection list.
    *
    * @param items An array of items, or a promise that resolves to an array of items.
    * @param options Configures the behavior of the selection list.
    * @throws `UserCancelledError` if the user cancels.
    * @return A promise that resolves to an array of items the user picked.
    */
    showQuickPick<T extends AgentQuickPickItem>(items: T[] | Thenable<T[]>, options: AgentQuickPickOptions & { canPickMany: true }): Promise<T[]>;

    /**
      * Shows a selection list.
      * Automatically persists the 'recently used' item and displays that at the top of the list
      *
      * @param items An array of items, or a promise that resolves to an array of items.
      * @param options Configures the behavior of the selection list.
      * @throws `UserCancelledError` if the user cancels.
      * @return A promise that resolves to the item the user picked.
      */
    showQuickPick<T extends AgentQuickPickItem>(items: T[] | Thenable<T[]>, options: AgentQuickPickOptions): Promise<T>;

    /**
     * Opens an input box to ask the user for input.
     *
     * @param options Configures the behavior of the input box.
     * @throws `UserCancelledError` if the user cancels.
     * @return A promise that resolves to a string the user provided.
     */
    showInputBox(options: AgentInputBoxOptions): Promise<string>;
}
