/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type BaseCommandConfig } from "@microsoft/vscode-azext-utils";

export type SnippetCommandConfig = BaseCommandConfig & {
    type: "snippet";

    /**
    * The type of snippet that is being generated. If `undefined`, then the snippet type will default to `"code"`.
    *
    * @examples
    * - "code"
    * - "query"
    * - "template"
    */
    snippetType?: string;

    /**
     * The programming language that the snippet should be written in. If for this command the langauge is
     * dependent on the user's prompt then leave this field `undefined`.
     */
    snippetLanguage?: string;
};
