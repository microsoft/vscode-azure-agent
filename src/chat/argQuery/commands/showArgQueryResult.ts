/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ResourceGraphModels } from "@azure/arm-resourcegraph";
import { IActionContext, openReadOnlyContent } from "@microsoft/vscode-azext-utils";
import { randomUUID } from "crypto";

export async function showArgQueryResult(_actionContext: IActionContext, queryResponse: ResourceGraphModels.QueryResponse): Promise<void> {
    await openReadOnlyContent({
        label: "azure-resource-graph-query-result",
        fullId: `arg-query-result-${randomUUID()}`
    },
        JSON.stringify(queryResponse, null, 2),
        ".json"
    );
}
