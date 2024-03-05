/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

"use strict";

// This is the extension entrypoint module, which imports extension.bundle.js, the actual extension code.
//
// This is in a separate file so we can properly measure extension.bundle.js load time.

let perfStats = {
    loadStartTime: Date.now(),
    loadEndTime: undefined
};

Object.defineProperty(exports, "__esModule", { value: true });

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, import/no-internal-modules
const extension = require('./dist/extension.bundle');

async function activate(ctx) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await extension.activateInternal(ctx, perfStats);
}

async function deactivate(ctx) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await extension.deactivateInternal(ctx);
}

// Export as entrypoints for vscode
exports.activate = activate;
exports.deactivate = deactivate;

perfStats.loadEndTime = Date.now();
