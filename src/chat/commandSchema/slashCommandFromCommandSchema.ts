/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import  { type AgentRequest } from "../agent";
import { getResponseAsStringCopilotInteraction, getStringFieldFromCopilotResponseMaybeWithStrJson } from "../copilotInteractions";
import  { type SlashCommand, type SlashCommandHandlerResult } from "../slashCommands";
import  { type ExtensionCommandParameterSchema, type ExtensionCommandParameters, type ExtensionCommandSchema, type IExtensionCommandSchemaProvider } from "./commandSchema";

export function slashCommandFromCommandSchema(api: ExtensionCommandSchema, apiProvider: IExtensionCommandSchemaProvider): SlashCommand {
    return [
        api.name,
        {
            shortDescription: api.userStrings.shortDescription,
            longDescription: api.userStrings.longDescription,
            intentDescription: api.copilotStrings.intentDescription,
            handler: async (request: AgentRequest): Promise<SlashCommandHandlerResult> => {
                let validatedParameters: ExtensionCommandParameters = {};
                let nextParametersToDetermine: ExtensionCommandParameterSchema[] = api.initialParameters;
                let parametersToSubmit: ExtensionCommandParameters = {};
                let moreParameters: ExtensionCommandParameterSchema[] = [];
                do {
                    parametersToSubmit = await determineParameterValues(request, nextParametersToDetermine);
                    const response = await apiProvider.submitParameters(api, { ...validatedParameters, ...parametersToSubmit });
                    if (response.type === "done") {
                        nextParametersToDetermine = [];
                    } else if (response.type === "needMoreParameters") {
                        nextParametersToDetermine = [];
                        moreParameters = response.moreParameters;
                    } else {
                        nextParametersToDetermine = response.nextParameters;
                        parametersToSubmit = {};
                    }
                    validatedParameters = { ...validatedParameters, ...response.validatedParameters };

                } while (nextParametersToDetermine.length > 0)

                const markdownResponseLines = [`Ok, I can help you ${api.userStrings.actionBlurb}.`];

                if (Object.keys(validatedParameters).length > 0) {
                    markdownResponseLines.push(`I have determined the following parameters:`);
                    markdownResponseLines.push(...Object.keys(validatedParameters).map((parameterName) => `- ${parameterName}: ${validatedParameters[parameterName]}`));
                    markdownResponseLines.push("\n");
                }

                if (moreParameters.length > 0) {
                    markdownResponseLines.push(`If you tell me more about what you want to do though, I may be able to help you more.`);
                    markdownResponseLines.push(`For now, I need to know more about:`);
                    markdownResponseLines.push(...moreParameters.map((parameter) => `- **${parameter.userStrings.title}**: ${parameter.userStrings.description}`));
                }
                request.progress.report({ content: markdownResponseLines.join("\n") });

                return {
                    chatAgentResult: {},
                    followUp: []
                };
            }
        }
    ]
}

async function determineParameterValues(request: AgentRequest, parameters: ExtensionCommandParameterSchema[]): Promise<ExtensionCommandParameters> {
    const copilotDeterminedParameterValues = await Promise.all(parameters.map<Promise<ExtensionCommandParameters>>(async (parameter) => {
        const systemPrompt = getParameterSystemPrompt1(parameter);
        const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(systemPrompt, request);
        const copilotDeterminedParameterValue = getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, [parameter.name, "parameterValue", "value", "parameter"]);

        if (copilotDeterminedParameterValue !== undefined) {
            return { [parameter.name]: copilotDeterminedParameterValue };
        } else {
            return {};
        }
    }));
    return copilotDeterminedParameterValues.reduce((prev, curr) => ({ ...prev, ...curr }), {});
}

function getParameterSystemPrompt1(parameter: ExtensionCommandParameterSchema): string {
    return [
        `You are an expert in determining the value of a '${parameter.name}' parameter based on user input.`,
        `This parameter is ${parameter.copilotStrings.description}.`,
        parameter.values !== undefined ? `The possible values for the parameter are: ${parameter.values.map((p) => `'${p}'`).join(", ")}.` : "",
        `Given the user's input, your job is to determine a value for the parameter. Only repsond with a JSON summary of the value you determine. Do not respond in a coverstaional tone, only JSON. If the users input does not infer or specify a value for this parameter, then do not respond.`,
    ].filter(s => !!s).join(" ");

}
