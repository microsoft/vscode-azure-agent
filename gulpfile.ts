/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { gulp_webpack } from '@microsoft/vscode-azext-dev';
import * as fse from 'fs-extra';
import * as gulp from 'gulp';
import * as path from 'path';

async function prepareForWebpack(): Promise<void> {
    const mainJsPath: string = path.join(__dirname, 'main.js');
    let contents: string = (await fse.readFile(mainJsPath)).toString();
    contents = contents
        .replace('out/src/extension', 'dist/extension.bundle')
        .replace(', true /* ignoreBundle */', '');
    await fse.writeFile(mainJsPath, contents);

    // TODO: Figure out how to get this working, webpack npm script is failing right now
    // const packageJsonPath = path.join(__dirname, 'package.json');
    // const packageJsonObj = require(packageJsonPath);
    // packageJsonObj.openAiConfigEndpoint = process.env.OPENAI_CONFIG_ENDPOINT?.toString();
    // packageJsonObj.extensionIdentity = process.env.VSCODE_AZURE_AGENT_IDENTITY?.toString();
    // await fse.writeFile(packageJsonPath, JSON.stringify(packageJsonObj, undefined, 4));
}

async function cleanReadme() {
    const readmePath: string = path.join(__dirname, 'README.md');
    let data: string = (await fse.readFile(readmePath)).toString();
    data = data.replace(/<!-- region exclude-from-marketplace -->.*?<!-- endregion exclude-from-marketplace -->/gis, '');
    await fse.writeFile(readmePath, data);
}

exports['webpack-dev'] = gulp.series(prepareForWebpack, () => gulp_webpack('development'));
exports['webpack-prod'] = gulp.series(prepareForWebpack, () => gulp_webpack('production'));
exports.cleanReadme = cleanReadme;
