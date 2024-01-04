/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionCommandParameterSchema, ExtensionCommandParameters, ExtensionCommandSchema, ExtensionCommandSubmitParametersResponse } from "../commandSchema/commandSchema";
import { WellKnownFunctionAppRuntime, isWellKnownFunctionAppRuntime } from "./wellKnownThings";

const subscriptionParameter: ExtensionCommandParameterSchema = {
    type: "string",
    name: "subscription",
    userStrings: {
        title: "Subscription",
        noun: "subscription",
        description: "The subscription to use for your function app."
    },
    copilotStrings: {
        description: "the subscription to use for a function app"
    },
    values: [
        "Prod Global Subscription (52942f45-54fd-4fd9-b730-03d518fedf35)",
        "Int Testing (North America) (583d46e7-c13d-4838-ad65-bd1c48a83061)",
        "Int Testing (Europe) (b74d5345-100f-408a-a7ca-47abb52ba60d)",
        "MyPersonalDevSub (df969b00-37ba-4874-bb86-1f60b9cea9fc)",
    ]
};

const regionParameter: ExtensionCommandParameterSchema = {
    type: "string",
    name: "region",
    userStrings: {
        title: "Region",
        noun: "region",
        description: "The region to use for your function app."
    },
    copilotStrings: {
        description: "the region to use for a function app"
    },
    values: [
        "Australia East",
        "Australia Southeast",
        "Australia Central",
        "Brazil South",
        "Canada Central",
        "Canada East",
        "Central India",
        "Central US",
        "Central US EUAP",
        "East Asia",
        "East US",
        "East US 2",
        "East US 2 EUAP",
        "France Central",
        "Germany West Central",
        "Israel Central",
        "Italy North",
        "Japan East",
        "Japan West",
        "Jio India West",
        "Korea Central",
        "Korea South",
        "North Central US",
        "North Europe",
        "Norway East",
        "Poland Central",
        "Qatar Central",
        "South Africa North",
        "South Central US",
        "South India",
        "Southeast Asia",
        "Sweden Central",
        "Switzerland North",
        "UAE North",
        "UK South",
        "UK West",
        "West Central US",
        "West Europe",
        "West India",
        "West US",
        "West US 2",
        "West US 3"
    ],
};

const runtimeParameter: ExtensionCommandParameterSchema = {
    type: "string",
    name: "runtime",
    userStrings: {
        title: "Runtime",
        noun: "runtime",
        description: "The runtime to use for your function app."
    },
    copilotStrings: {
        description: "the runtime to use for a function app"
    },
    values: [
        "Node.js",
        ".NET",
    ],
};

export const createFunctionAppSchemaCommand = "azureFunctions.createNewFunctionApp";

export const createFunctionAppSchema: ExtensionCommandSchema = {
    name: "createFunctionApp",
    command: createFunctionAppSchemaCommand,
    userStrings: {
        title: "Create a New Function App",
        actionBlurb: "create a new function app",
        shortDescription: "Create a new function app.",
        longDescription: "Use this command to create a new function app in Azure. Try giving additional context such as what subscription or region you want the function app to be in, what runtime the function should use, etc.",
    },
    copilotStrings: {
        intentDescription: "This is best when users explicitly want to create a new function app. They may refer to a function app as 'function app', 'func app', 'azure functions app', etc.",
    },
    initialParameters: [
        subscriptionParameter,
        regionParameter,
        runtimeParameter,
    ]
};

export async function createFunctionAppSubmitParameters(parameters: ExtensionCommandParameters): Promise<ExtensionCommandSubmitParametersResponse> {
    const wellKnownRuntime: WellKnownFunctionAppRuntime | undefined = isWellKnownFunctionAppRuntime(parameters["runtime"]) ? parameters["runtime"] : undefined;
    const region: string | undefined = parameters["region"];
    const subscription: string | undefined = parameters["subscription"];

    if (!!wellKnownRuntime && !!region && !!subscription) {
        return {
            type: "done",
            validatedParameters: { runtime: wellKnownRuntime, region: region, subscription: subscription }
        };
    } else if (!!wellKnownRuntime || !!region || !!subscription) {
        return {
            type: "needMoreParameters",
            validatedParameters: {
                ...(!!wellKnownRuntime ? { runtime: wellKnownRuntime } : {}),
                ...(!!region ? { region: region } : {}),
                ...(!!subscription ? { subscription: subscription } : {}),
            },
            moreParameters: [
                ...(!!wellKnownRuntime ? [] : [runtimeParameter]),
                ...(!!region ? [] : [regionParameter]),
                ...(!!subscription ? [] : [subscriptionParameter]),
            ]
        };
    } else {
        return {
            type: "needMoreParameters",
            validatedParameters: {},
            moreParameters: [
                runtimeParameter,
                regionParameter,
                subscriptionParameter,
            ]
        };
    }
}
