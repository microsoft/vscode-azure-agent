/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


export type ExtensionCommandSchema = {
    /**
     * A camel cased string that names the command.
     */
    name: string;
    /**
     * The VS Code command that this command maps to.
     */
    command: string;
    userStrings: {
        /**
         * A title cased string that names the command. Ex:
         * - "Create a New Function Project"
         * - "Create a New Function App"
         * - etc.
         */
        title: string;
        /**
         * A blurb which actively describes the action of the command. Ex:
         * - "create a new function project"
         * - "create a new function app"
         * - "deploy your function app"
         * - etc.
         */
        actionBlurb: string;
        /**
         * A short sentence description of the command. Should give the user a good idea of what the command does.
         */
        shortDescription: string,
        /**
         * A longer sentence description of the command. Should make clear to the user when the command is appropriate to use.
         */
        longDescription: string,
    },
    copilotStrings: {

        /**
         * A sentence description that helps copilot understand when the command should be used.
         */
        intentDescription: string;
    }
    submitParametersFunction: string;
    initialParameters: ExtensionCommandParameterSchema[];
}

export type ExtensionCommandParameterSchema = {
    type: "string";
    /**
     * The literal name of the parameter. Ex:
     * - "language"
     * - "runtime"
     * - "location"
     * - "nodeRuntime"
     */
    name: string;
    userStrings: {
        /**
         * A title cased string that names the parameter. Ex:
         * - "Language"
         * - "Runtime"
         * - "Location"
         * - "Node.js Runtime"
         */
        title: string;
        /**
         * A noun that names the parameter. Ex:
         * - "language"
         * - "runtime"
         * - "location"
         * - "Node.js runtime"
         * - etc.
         */
        noun: string;
        /**
         * A descriptive sentence to give to the user that describes the purpose of the parameter within the scope of the
         * API. Ex:
         * - "The programming language for your function project."
         */
        description: string;
    }[]
    copilotStrings: {
        /**
         * A descriptive blurb to give to copilot that describes the purpose of the parameter within the scope of the
         * API. Ex:
         * - "the programming language for a function project"
         * - "the template for a TypeScript function project"
         */
        description: string;
    }
    values?: (string | number | boolean)[];
}

export type ExtensionCommandSubmitParametersResponse = {
    type: "nextParameters";
    validatedParameters: ExtensionCommandParameters;
    nextParameters: ExtensionCommandParameterSchema[];
} |
{
    type: "done";
    validatedParameters: ExtensionCommandParameters;
} |
{
    type: "needMoreParameters";
    validatedParameters: ExtensionCommandParameters;
    moreParameters: ExtensionCommandParameterSchema[];
};

export type ExtensionCommandParameters = { [parameterName: string]: string };

export interface IExtensionCommandSchemaProvider {
    getCommandSchemas(): Promise<ExtensionCommandSchema[]>;
    submitParameters(api: ExtensionCommandSchema, parameters: ExtensionCommandParameters): Promise<ExtensionCommandSubmitParametersResponse>;
}
