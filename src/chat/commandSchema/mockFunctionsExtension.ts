/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getWellKnownCSharpTemplate, getWellKnownTypeScriptTemplate, wellKnownCSharpTemplateDisplayNames, wellKnownTypeScriptTemplateDisplayNames } from "../wellKnownThings";
import { ExtensionCommandParameterSchema, ExtensionCommandParameters, ExtensionCommandSchema, ExtensionCommandSubmitParametersResponse, IExtensionCommandProvider } from "./commandSchema";

export class MockFunctionsExtension implements IExtensionCommandProvider {
    public async getApis(): Promise<ExtensionCommandSchema[]> {
        return [
            {
                name: "createFunctionProject",
                command: "azureFunctions.createNewProject",
                userStrings: {
                    title: "Create a New Function Project",
                    actionBlurb: "create a new function project",
                    shortDescription: "Create a new function project.",
                    longDescription: "Use this command to create a new function project. Try giving additional context such as what you want the project to do, languages you are familiar with, etc.",
                },
                copilotStrings: {
                    intentDescription: "This command is best when users explicitly want to create a new project. They may refer to a project as 'project', 'func project', 'functions project', 'azure functions project', etc.",
                },
                submitParametersFunction: "azureFunctions.createNewProject.submitParameters",
                initialParameters: [
                    createFunctionProjectLanguageParameter
                ]
            }
        ]
    }

    public async submitParameters(api: ExtensionCommandSchema, parameters: ExtensionCommandParameters): Promise<ExtensionCommandSubmitParametersResponse> {
        switch (api.command) {
            case "azureFunctions.createNewProject":
                return await this.createFunctionProjectSubmitParameters(parameters);
            default:
                throw new Error(`Unknown command ${api.command}`);
        }
    }

    private async createFunctionProjectSubmitParameters(parameters: ExtensionCommandParameters): Promise<ExtensionCommandSubmitParametersResponse> {
        const language = parameters["language"];
        if (language === undefined || (language !== "C#" && language !== "TypeScript")) {
            return {
                type: "needMoreParameters",
                validatedParameters: {},
                moreParameters: [createFunctionProjectLanguageParameter]
            };
        }

        const template = parameters["template"];
        if (template === undefined) {
            switch (language) {
                case "C#":
                    return {
                        type: "nextParameters",
                        validatedParameters: { language: language },
                        nextParameters: [createFunctionProjectCSharpTemplateParameter]
                    };
                case "TypeScript":
                    return {
                        type: "nextParameters",
                        validatedParameters: { language: language },
                        nextParameters: [createFunctionProjectTypeScriptTemplateParameter]
                    };
                default:
                    throw new Error(`Unknown language ${language}`);
            }
        } else {
            const wellKnownTemplate = language === "C#" ? getWellKnownCSharpTemplate(template) : getWellKnownTypeScriptTemplate(template);
            if (wellKnownTemplate === undefined) {
                return {
                    type: "needMoreParameters",
                    validatedParameters: { language: language },
                    moreParameters: [createFunctionProjectCSharpTemplateParameter]
                };
            }
        }

        return { type: "done", validatedParameters: { language: language, template: template } };
    }
}

const createFunctionProjectLanguageParameter: ExtensionCommandParameterSchema = {
    type: "string",
    name: "language",
    userStrings: {
        title: "Language",
        noun: "language",
        description: "The programming language for your function project."
    },
    copilotStrings: {
        description: "the programming language for a function project"
    },
    values: ["C#", "TypeScript"],
};

const createFunctionProjectCSharpTemplateParameter: ExtensionCommandParameterSchema = {
    type: "string",
    name: "template",
    userStrings: {
        title: "C# Template",
        noun: "C# template",
        description: "The C# template for your function project."
    },
    copilotStrings: {
        description: "the template used for a C# function project"
    },
    values: wellKnownCSharpTemplateDisplayNames.slice(0),
};

const createFunctionProjectTypeScriptTemplateParameter: ExtensionCommandParameterSchema = {
    type: "string",
    name: "template",
    userStrings: {
        title: "TypeScript Template",
        noun: "TypeScript template",
        description: "The TypeScript template for your function project."
    },
    copilotStrings: {
        description: "the template for a TypeScript function project"
    },
    values: wellKnownTypeScriptTemplateDisplayNames.slice(0),
};
