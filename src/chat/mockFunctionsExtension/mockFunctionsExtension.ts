/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import  { type ExtensionCommandParameters, type ExtensionCommandSchema, type ExtensionCommandSubmitParametersResponse, type IExtensionCommandSchemaProvider } from "../commandSchema/commandSchema";
import { createFunctionAppSchema, createFunctionAppSchemaCommand, createFunctionAppSubmitParameters } from "./createFunctionAppSchema";
import { createFunctionProjectSchema, createFunctionProjectSchemaCommand, createFunctionProjectSubmitParameters } from "./createFunctionProjectSchema";

export class MockFunctionsExtension implements IExtensionCommandSchemaProvider {
    public async getCommandSchemas(): Promise<ExtensionCommandSchema[]> {
        return [
            createFunctionProjectSchema,
            createFunctionAppSchema,
        ]
    }

    public async submitParameters(api: ExtensionCommandSchema, parameters: ExtensionCommandParameters): Promise<ExtensionCommandSubmitParametersResponse> {
        switch (api.command) {
            case createFunctionProjectSchemaCommand:
                return await createFunctionProjectSubmitParameters(parameters);
            case createFunctionAppSchemaCommand:
                return await createFunctionAppSubmitParameters(parameters);
            default:
                throw new Error(`Unknown command ${api.command}`);
        }
    }
}
