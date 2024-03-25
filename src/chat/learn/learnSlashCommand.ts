/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { type QueryAzureResourceGraphResult } from "../../../api";
import { ext } from "../../extensionVariables";
import { type AgentRequest } from "../agent";
import { queryAzureResourceGraph } from "../argQuery/queryAzureResourceGraph";
import { getResponseAsStringCopilotInteraction } from "../copilotInteractions";
import { type AzureExtension } from "../extensions/AzureExtension";
import { generateExtensionCommandFollowUps, generateNextQuestionsFollowUps } from "../followUpGenerator";
import { getMicrosoftLearnRagContent } from "../rag";
import { type SlashCommand, type SlashCommandHandlerResult } from "../slashCommands";
import { summarizeHistoryThusFar } from "../summarizing";

export type LearnCommandConfig = {
    topic: string;
    noInputSuggestions?: string[];
    /**
     * @deprecated
     * @todo dynamically determine the associated extension based on the prompt/answer
     */
    associatedExtension?: AzureExtension;
}

export const learnCommandName = "learn";

export function getLearnCommand(config: LearnCommandConfig): SlashCommand {
    return [learnCommandName,
        {
            shortDescription: `Learn about how you can use ${config.topic}`,
            longDescription: `Learn more information about ${config.topic}`,
            intentDescription: `This is best when users ask a question, don't understand something, want you to show them something, ask how to do something, or anything like that; about or related to ${config.topic}. This is not a good option if the user asks you to explicitly do an action, like creating something, starting something, deploying something, etc.`,
            handler: (request: AgentRequest) => learnHandler(config, request)
        }];
}

function learnHandler(config: LearnCommandConfig, request: AgentRequest): Promise<SlashCommandHandlerResult> {
    return callWithTelemetryAndErrorHandling("learnHandler", async (actionContext) => {
        if (request.userPrompt.length === 0) {
            request.responseStream.markdown(`If you want to learn more about ${config.topic}, simply ask me what it is you'd like to learn.\n`);
            return { chatAgentResult: {}, followUp: config.noInputSuggestions?.map((suggestion) => ({ prompt: `${suggestion}` })), };
        } else {
            const questionForRagContent = await summarizeHistoryThusFar(request);
            const ragContent = await getMicrosoftLearnRagContent(actionContext, questionForRagContent, request);

            const systemPrompt = getLearnSystemPrompt(config, ragContent?.content);

            const learnResponse = await getResponseAsStringCopilotInteraction(systemPrompt, request, { includeHistory: "all", progressMessage: "Getting an answer..." });
            const learnResponded = learnResponse !== undefined;
            ext.outputChannel.debug("learnResponse", learnResponse);

            if (!learnResponded) {
                request.responseStream.markdown("Sorry, I can't help with that right now.\n");
                return { chatAgentResult: {}, followUp: [], };
            } else {
                let finalResponse = learnResponse;
                const resourceInfo = await summarizeAzureResourceInfo(request);
                ext.outputChannel.debug("resourceInfo", resourceInfo);

                const shouldQueryAzureResourceGraph = resourceInfo !== undefined && resourceInfo?.toLowerCase() !== "no";
                let argQueryResult: QueryAzureResourceGraphResult | undefined = undefined;
                if (shouldQueryAzureResourceGraph) {
                    argQueryResult = await queryAzureResourceGraph(actionContext, resourceInfo, request);
                    ext.outputChannel.debug("argQueryResult", argQueryResult);
                    if (argQueryResult) {
                        finalResponse = await augmentLearnResponse(learnResponse, JSON.stringify(argQueryResult.response), request);
                    }
                }
                ext.outputChannel.debug("finalResponse", finalResponse);
                request.responseStream.markdown(finalResponse + "\n");
                if (argQueryResult) {
                    request.responseStream.markdown(`The answer is generated based on the result of an Azure Resource Graph query.`);
                    request.responseStream.button({
                        title: "Show full query result",
                        command: "azureAgent.showArgQueryResult",
                        arguments: [{ queryResponse: argQueryResult.response }]
                    });
                }

                if (ragContent !== undefined) {
                    request.responseStream.reference(vscode.Uri.parse(ragContent.contentUrl));
                }
                const followUps: vscode.ChatFollowup[] = [];
                if (config.associatedExtension !== undefined && config.associatedExtension.isInstalled()) {
                    followUps.push(...(await generateExtensionCommandFollowUps(learnResponse, config.associatedExtension, request)));
                } else if (config.associatedExtension !== undefined && !config.associatedExtension.isInstalled()) {
                    request.responseStream.markdown(`\n\nFor additional help related to ${config.topic}, install the ${config.associatedExtension.extensionDisplayName} extension for VS Code.`);

                    request.responseStream.button({ title: `Install the ${config.associatedExtension.extensionDisplayName} Extension`, command: "workbench.extensions.search", arguments: [config.associatedExtension.extensionId] });
                }
                followUps.push(...(await generateNextQuestionsFollowUps(learnResponse, request)));

                return { chatAgentResult: {}, followUp: followUps, };
            }
        }
    });
}

function getLearnSystemPrompt(config: LearnCommandConfig, ragContent: string | undefined): string {
    const initialSection = `You are an expert in ${config.topic}. The user wants to use ${config.topic}. They ultimately want to use ${config.topic} to solve a problem or accomplish a task. Your job is to help the user learn about how they can use ${config.topic} to solve a problem or accomplish a task. Assume that the user has already downloaded and installed VS Code. Assume the the user is only interested in using cloud services from Microsoft Azure. If they ask to see how to do something that would involve writing code, consider giving code examples to help them. If you end up using different or more accurate terminology than the user, specifically highlight why you used different terminology. Most importantly, try to not overwhelm the user with too much information. Keep responses short and sweet.`;

    const ragSection = !ragContent ? "" : `\n\nHere is some up-to-date information about the topic the user is asking about:\n\n${ragContent}\n\nMake use of this information when coming up with a reply to the user.`;

    return initialSection + ragSection;
}

async function summarizeAzureResourceInfo(request: AgentRequest): Promise<string | undefined> {
    // Put the original user prompt in the system prompt and use our own user prompt to prevent it hijacking the language model
    // For example, if the original user prompt has a strong intention like "Write a program to blah blah", the language model will not only summarize the mentioned Azure resources
    // but also emit the code that the original user prompt is asking for.
    const systemPrompt = `You are an expert in Azure resources. The following text may reference some of the user's Azure resources by their names or ids. Here is the text: ${request.userPrompt}.`;
    const response = await getResponseAsStringCopilotInteraction(systemPrompt, {
        context: {
            history: []
        },
        userPrompt: "Summarize the Azure resources whose names or ids are mentioned in the text. Answer 'no' if the text doesn't mention any Azure resources.",
        responseStream: request.responseStream,
        token: request.token
    });
    return response;
}

async function augmentLearnResponse(learnResponse: string, queryResult: string, request: AgentRequest): Promise<string> {
    const systemPrompt = `You are an expert in code related to Azure resources. The user prompt refers to some Azure resource in the query result. If the text contains the placeholder of the url to a resource, replace the placeholder with the url to the corresponding resource. Here is the query result: ${queryResult}`;
    const response = await getResponseAsStringCopilotInteraction(systemPrompt, {
        context: {
            history: []
        },
        userPrompt: learnResponse,
        responseStream: request.responseStream,
        token: request.token
    });
    return response ?? learnResponse;
}
