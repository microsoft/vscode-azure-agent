/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import  { type ExtensionCommandParameters, type ExtensionCommandSchema, type ExtensionCommandSubmitParametersResponse, type IExtensionCommandSchemaProvider } from "./commandSchema";

export class NoCommandsExtension implements IExtensionCommandSchemaProvider {
    public async getCommandSchemas(): Promise<ExtensionCommandSchema[]> {
        return []
    }

    public async submitParameters(api: ExtensionCommandSchema, _parameters: ExtensionCommandParameters): Promise<ExtensionCommandSubmitParametersResponse> {
        switch (api.command) {
            default:
                throw new Error(`Unknown command ${api.command}`);
        }
    }
}
