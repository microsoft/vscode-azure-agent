/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AzExtInputBoxOptions, type AzExtOpenDialogOptions, type IAzureMessageOptions, type IAzureQuickPickOptions, type PromptResult } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";

export type ParameterAgentMetadata = {
    /**
     * A title cased string for the parameter this quick pick is for. Will be displayed to the user.
     *
     * For example:
     * - "Subscription"
     * - "Resource Group"
     * - "Runtime"
     * - "Name"
     */
    parameterDisplayTitle: string;

    /**
     * A description of the parameter this quick pick is for. Will be displayed to the user.
     *
     * For example:
     * - "The subscription that the Storage Account should be created in."
     * - "The resource group that the Container App should be created in."
     * - "The function runtime for the Function App."
     * - "The name of the Static Web App."
     */
    parameterDisplayDescription: string;
};

export type AgentQuickPickItem<T extends vscode.QuickPickItem = vscode.QuickPickItem> = {
    agentMetadata: {
        /**
         * If this quick pick item should not be picked by the agent.
         *
         * @example If an item is a web link which is provided so a user can read some information about the quick pick/items in the quick pick, this
         * is not something the agent would pick.
         */
        notApplicableToAgentPick?: boolean;

        /**
         * If this quick pick item can be used by the agent as a sort of "default" value in order to skip answering the pick quick
         * pick prompt this item is associated with. This is useful for quick picks that don't have any dependents, as the
         * agent can avoid getting stuck trying to answer them. Once the user chooses to go with the parameters that the agent
         * has picked, they will be asked to pick an item for the pick quick pick prompt this item is associated with.
         *
         * For quick picks, the "skip" decision is on an item, unlike how there is {@link AgentInputBoxOptions.skipValue}, because ultimately
         * to "skip" a quick pick, the agent still has to pick an item.
         *
         * @example If what subscription is picked when creating a storage account doesn't matter, then the "create storage account" wizard
         * can choose an arbitrary subscription for the agent to use as a default value for the "pick a subscription" prompt. This allows
         * the agent to move onto more important prompts like the "choose a storage account type" prompt.
         */
        useAsSkipValue?: boolean;
    };
} & T;

export type AgentQuickPickOptions<T extends IAzureQuickPickOptions = IAzureQuickPickOptions> = { agentMetadata: ParameterAgentMetadata; } & T;

export type AgentInputBoxOptions<T extends AzExtInputBoxOptions = AzExtInputBoxOptions> = {
    agentMetadata: ParameterAgentMetadata & {
        /**
         * A value that the agent can use as a sort of "default" value in order to skip answering the input box prompt this options object is
         * associated with. This is useful for input boxes that don't have any dependents, as the agent can avoid getting stuck trying to answer
         * them. Once the user chooses to go with the parameters that the agent has picked, they will be asked to input a value for the input box
         * prompt this options object is associated with.
         */
        skipValue?: string;
    }
} & T;

/**
 * An interface compatible with {@link IAzureUserInput} that allows for the use of an agent to answer prompts instead of showing prompts to the user. Wizards/wizard steps
 * for commands that are exposed to an agent should use this interface to make sure that in the case of an agent being the one to answer prompts, that all necessary
 * information is provided to the agent in order to answer the prompts.
 */
export interface IAzureAgentInput {
    readonly onDidFinishPrompt: vscode.Event<PromptResult>;
    showQuickPick<ItemsBaseT extends vscode.QuickPickItem, OptionsBaseT extends IAzureQuickPickOptions>(items: AgentQuickPickItem<ItemsBaseT>[] | Promise<AgentQuickPickItem<ItemsBaseT>[]>, options: AgentQuickPickOptions<OptionsBaseT> & { canPickMany: true }): Promise<AgentQuickPickItem<ItemsBaseT>[]>;
    showQuickPick<ItemsBaseT extends vscode.QuickPickItem, OptionsBaseT extends IAzureQuickPickOptions>(items: AgentQuickPickItem<ItemsBaseT>[] | Promise<AgentQuickPickItem<ItemsBaseT>[]>, options: AgentQuickPickOptions<OptionsBaseT>): Promise<AgentQuickPickItem<ItemsBaseT>>;
    showInputBox<OptionsBaseT extends IAzureQuickPickOptions>(options: AgentInputBoxOptions<OptionsBaseT>): Promise<string>;

    showWarningMessage<T extends vscode.MessageItem>(message: string, ...items: T[]): Promise<T>;
    showWarningMessage<T extends vscode.MessageItem>(message: string, options: IAzureMessageOptions, ...items: T[]): Promise<T>;
    showOpenDialog(options: AzExtOpenDialogOptions): Promise<vscode.Uri[]>;
}
