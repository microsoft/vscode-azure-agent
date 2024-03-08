// All these code should live in the shared dev utils packages.

import { CommandParameter, SimpleCommandConfig, WizardCommandConfig } from "@microsoft/vscode-azext-utils";

/**
 * The common schema that matches the content in commonSchema.ts
 */
const commonSchemaText = `export type ActionSchema<TypeT, IntentT, ParametersT> = {
    actionType: TypeT;
    actionIntent: IntentT;
    parameters: ParametersT;
};
`;

function generateParametersTypeText(parameters: { [key: string]: CommandParameter }): string {
    let text = "{";
    for (const key in parameters) {
        const parameter = parameters[key];
        let typeValue: string | undefined;
        if (parameter.type === "string" || parameter.type === "boolean" || parameter.type === "number") {
            typeValue = parameter.type;
        } else if (parameter.type === "string-enum") {
            typeValue = parameter.stringEnums?.map((value) => `"${value}"`).join(" | ");
        } else if (parameter.type === "object" && !!parameter.subParameters) {
            typeValue = parameter.subParameters ? generateParametersTypeText(parameter.subParameters) : undefined;
        } else if (parameter.type === "object" && !parameters.subParameters) {
            typeValue = parameter.type;
        }
        text += `${key}${parameter.isOptional ? "?" : ""}: ${typeValue};`;
    }
    text += "}";
    return text;
}

/**
 * Generate the schema text that combines the common schema and an action schema file that uses it.
 * @param schemaPath The paths to the action schema files.
 */
export function generateSchemaText(commands: (WizardCommandConfig | SimpleCommandConfig)[]): string {
    const actionTypeNames: string[] = [];
    const commandsSchemaText = commands.map((command) => {
        const actionType = command.name;
        actionTypeNames.push(actionType);
        const actionIntent = command.intentDescription ?? "";
        const parametersText = generateParametersTypeText(command.parameters);

        const parametersTypeName = `${actionType}Parameters`;
        return `export type ${parametersTypeName} = ${parametersText};\nexport type ${actionType} = ActionSchema<"${actionType}", "${actionIntent}", ${parametersTypeName}>;\n`;
    });
    const mainExportText = `export type Action = ${actionTypeNames.join(" | ")};`;

    return commonSchemaText + mainExportText + "\n" + commandsSchemaText.join("\n");
}

// const commandConfigs: (WizardCommandConfig | SimpleCommandConfig)[] = [
//     {
//         type: "wizard",
//         name: "createFunctionApp",
//         commandId: "azureFunctions.createFunctionApp",
//         displayName: "Create Function App",
//         requiresAzureLogin: true,
//         intentDescription: "This is best when the user ask to create a Function App resource in Azure.",
//         parameters: {
//             functionAppInfo: {
//                 type: "object",
//                 isOptional: false,
//                 subParameters: {
//                     name: {
//                         type: "string",
//                         isOptional: true,
//                     },
//                     runTime: {
//                         type: "string-enum",
//                         isOptional: true,
//                         stringEnums: ["Node", "Python", "Java", ".Net", "PowerShell", "Custom"]
//                     }
//                 }
//             }
//         }
//     },
//     {
//         type: "simple",
//         name: "createFunctionProject",
//         commandId: "azureFunctions.createNewProject",
//         displayName: "Create Function Project",
//         requiresAzureLogin: true,
//         intentDescription: "A function project is a local project that can be deployed to an Azure Functions App. This is best when the user wants to start developing an Azure Functions App.",
//         parameters: {
//             projectInfo: {
//                 type: "object",
//                 isOptional: false,
//                 subParameters: {
//                     name: {
//                         type: "string",
//                         isOptional: true,
//                     },
//                     language: {
//                         type: "string-enum",
//                         isOptional: true,
//                         stringEnums: ["JavaScript", "Typescript", "C#", "Java", "Python", "Ballerina"]
//                     }
//                 }
//             }
//         }
//     },
//     {
//         type: "simple",
//         name: "deployFunctionApp",
//         commandId: "azureFunctions.deploy",
//         displayName: "Deploy to Function App",
//         requiresAzureLogin: true,
//         intentDescription: "This is best when the user has a function project and wants to deploy it to an Azure Function App.",
//         parameters: {
//             functionAppInfo: {
//                 type: "object",
//                 isOptional: false,
//                 subParameters: {
//                     name: {
//                         type: "string",
//                         isOptional: true,
//                     },
//                     slot: {
//                         type: "string-enum",
//                         isOptional: true,
//                         stringEnums: ["production", "other"]
//                     }
//                 }
//             }
//         }
//     },
// ];
// console.log(generateSchemaText(commandConfigs));
