/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type ResourceGraphModels } from "@azure/arm-resourcegraph";
import { type AzureSubscriptionProvider } from "@microsoft/vscode-azext-azureauth";
import { type IActionContext, type IAzExtLogOutputChannel } from "@microsoft/vscode-azext-utils";
import type * as vscode from "vscode";
import { type z } from "zod";

export type AgentId = "ms-azuretools.azure-agent";

export type AgentName = "azure";

export type QueryAzureResourceGraphResult = {
    /**
     * The query that was used to query Azure Resource Graph.
     */
    query: string;
    /**
     * The response from the query to Azure Resource Graph.
     */
    response: ResourceGraphModels.QueryResponse;
};

export interface IAzureAgent {
    /**
     * Queries Azure Resource Graph based on the given natual language {@param prompt}.
     */
    queryAzureResourceGraph(context: IActionContext, prompt: string, request: AgentRequest): Promise<QueryAzureResourceGraphResult | undefined>;

    /**
     * Gets the maximum number of tokens that can be used in a single language model interaction. The limit is based on what lanuage models are currently available from {@link vscode.lm.languageModels}.
     */
    getLanguageModelTokenLimit(): number;

    /**
     * Starts an interaction with the VS Code language model API, where the output from the language model is outputted verbatim to the user.
     */
    verbatimLanguageModelInteraction(systemPrompt: string, request: AgentRequest, options?: LanguageModelInteractionOptions): Promise<LanguageModelInteractionResult>;

    /**
     * Starts an interaction with the VS Code language model API, where the output from the language model is returned as a `string`.
     */
    getResponseAsStringLanguageModelInteraction(systemPrompt: string, request: AgentRequest, options?: LanguageModelInteractionOptions): Promise<string | undefined>;

    /**
     * Translates the current {@param request}'s user prompt into an object whose type matches the given {@param zodSchema}.
     */
    getTypeChatTranslation<TZodSchema extends Record<string, z.ZodType>, TTypeName extends keyof TZodSchema & string>(zodSchema: TZodSchema, typeName: TTypeName, request: AgentRequest, options?: TypeChatTranslationOptions): Promise<z.TypeOf<TZodSchema[TTypeName]> | undefined>;

    /**
     * Takes the conversation history (including the current user prompt) from {@param request} and returns it as a `string` which represents a conversation between a user and an assistant.
     */
    getConversationAsString(request: AgentRequest): Promise<string>;

    /**
     * An output channel to use for logging if performing actions on behalf of the agent.
     */
    readonly outputChannel: IAzExtLogOutputChannel;

    /**
     * A subscription provider to use if authenticating with Azure if performing actions on behalf of the agent.
     */
    readonly subscriptionProvider: AzureSubscriptionProvider;
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

export type TypeChatTranslationOptions = {
    /**
     * What type of history (aka, users requests prior to the current one) to include in the context for the TypeChat translation.
     * - `"none"`: No history will be included (default)
     * - `"all"`: All history will be included
     */
    includeHistory?: "none" | "all";
}

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

/**
 * Metadata that the Azure agent attaches to the result of a chat command. When looking at Azure agent response turns in a {@link vscode.ChatContext.history}, it should
 * be expected that this metadata will be present in the {@link vscode.ChatResponseTurn.result}'s metadata. A handler of a command neither needs to nor should create this metadata.
 */
export type AzureAgentChatResultMetadata = {
    /**
     * The chain of slash command handlers that were invoked to produce this result.
     */
    handlerChain: string[];

    /**
     * A unique identifier for the result.
     */
    resultId: string;

    /**
     * Any additional metadata that was added by some other code.
     */
    [key: string]: unknown;
};

