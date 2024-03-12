/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type ResourceGraphModels } from "@azure/arm-resourcegraph";
import { type IActionContext } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";

/**
 * An interface for interacting with the Azure agent.
 */
export interface IAzureAgent {
    /**
     * Queries Azure Resource Graph based on the given natual language {@param prompt}.
     */
    queryAzureResourceGraph(context: IActionContext, prompt: string, request: AgentRequest): Promise<ResourceGraphModels.QueryResponse | undefined>;

    /**
     * Starts an interaction with the VS Code language model API, where the output from the language model is outputted verbatim to the user.
     */
    verbatimLanguageModelInteraction(systemPrompt: string, request: AgentRequest, options?: LanguageModelInteractionOptions): Promise<LanguageModelInteractionResult>;

    /**
     * Starts an interaction with the VS Code language model API, where the output from the language model is returned as a `string`.
     */
    getResponseAsStringLanguageModelInteraction(systemPrompt: string, request: AgentRequest, options?: LanguageModelInteractionOptions): Promise<string | undefined>;
}

export type LanguageModelInteractionOptions = {
    /**
     * What type of history (aka, users requests prior to the current one) to include in the context for the language model interaction.
     * - `"none"`: No history will be included (default)
     * - `"all"`: All history will be included
     * - `"requests"`: Only the user requests will be included
     */
    includeHistory?: "none" | "all" | "requests";

    /**
     * Whether or not to cache the result of the language model interaction. Default is `false`.
     *
     * This option is `false` by default as to make sure setting the cache is an intentional choice by the developer. Caching the result of a language model
     * interaction has the potential to cause a negative user experience. For example, the user may not be happy with the answer to a question and is quickly
     * retrying it. If the line of code that invokes the language model to produce that answer has `setCache` set to true, then the user will simply get the
     * same answer.
     *
     * Alternatively, if there's an interaction which is repeated many times, by the agent itself, in a short period of time; or if there is low risk to
     * the result of the interaction being "wrong", then setting `setCache` to `true` could be beneficial.
     */
    setCache?: boolean;

    /**
     * Whether or not to use the cached result of a previous language model interaction that matches this one. Default is `true`.
     *
     * Unlike {@link LanguageModelInteractionOptions.setCache}, this option is `true` by default as if an interaction does set the cache, there shouldn't be any
     * additional action requried by the developer to also use the cache.
     */
    useCache?: boolean;

    /**
     * A progress message to display to the user while waiting for a response from language model.
     *
     * Should not be used if this interaction is being done in parallel with other interactions.
     */
    progressMessage?: string;
};

export type LanguageModelInteractionResult = { languageModelResponded: true, languageModelResponse: string } | { languageModelResponded: false, languageModelResponse: undefined };

/**
 * An object which contains all information associated with the original request the Azure agent received from VS Code to handle a user prompt.
 */
export type AgentRequest = {
    command?: string;
    userPrompt: string;

    context: vscode.ChatContext;
    responseStream: vscode.ChatExtendedResponseStream;
    token: vscode.CancellationToken;
};
