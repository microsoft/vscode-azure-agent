/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const fse = require("fs-extra");
const path = require("path");

async function addConfigValuesToPackageJson() {
    if (!!process.env.VSCODE_AZURE_AGENT_OPENAI_CONFIG_ENDPOINT_CI && !!process.env.VSCODE_AZURE_AGENT_EXTENSION_IDENTITY_CONFIG_ENDPOINT_CI) {
        console.log("Writing extra package info to package.json");
        const packageJsonPath = path.join(__dirname, "package.json");
        const packageJsonObj = require(packageJsonPath);
        packageJsonObj.openAiConfigEndpoint = process.env.VSCODE_AZURE_AGENT_OPENAI_CONFIG_ENDPOINT_CI?.toString();
        packageJsonObj.extensionIdentityConfigEndpoint = process.env.VSCODE_AZURE_AGENT_EXTENSION_IDENTITY_CONFIG_ENDPOINT_CI?.toString();
        await fse.writeFile(packageJsonPath, JSON.stringify(packageJsonObj, undefined, 4).trim());
    } else {
        console.log("Skipping writing extra package info to package.json");
    }
}

addConfigValuesToPackageJson();
