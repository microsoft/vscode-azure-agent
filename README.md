# Azure Agent for VS Code

<!-- region exclude-from-marketplace -->

[![Build Status](https://dev.azure.com/ms-azuretools/AzCode/_apis/build/status%2Fmicrosoft.vscode-azure-agent?branchName=main)](https://dev.azure.com/ms-azuretools/AzCode/_build/latest?definitionId=45&branchName=main)

<!-- endregion exclude-from-marketplace -->

The Azure Agent for VS Code is your assistant for helping you use the [Azure Extensions for VS Code](https://code.visualstudio.com/docs/azure/extensions), and learn about and write code for Azure. Talk to the Azure Agent by typing `@azure` in the GitHub Copilot Chat sash in VS Code.

> Sign up today for your free Azure account and receive 12 months of free popular services, $200 free credit and 25+ always free services 👉 [Start Free](https://azure.microsoft.com/free/open-source).

## Installation

1. Sign-up for [GitHub Copilot](https://github.com/features/copilot)
1. Download [VS Code (Insiders)](https://code.visualstudio.com/insiders/) and install:
   - One or more of the [Azure Extensions for VS Code](https://code.visualstudio.com/docs/azure/extensions) (not all extensions are currently supported by the Azure Agent)
   - The [GitHub Copilot extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
   - The [GitHub Copilot Chat extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat)
1. Install the [latest build](https://dev.azure.com/ms-azuretools/AzCode/_build/latest?definitionId=45&branchName=main) of the Azure Agent for VS Code
1. [Authorize the extension to use proposed APIs](https://code.visualstudio.com/api/advanced-topics/using-proposed-api#sharing-extensions-using-the-proposed-api) (extension ID `ms-azuretools.vscode-azure-agent`)
1. Restart VS Code (Insiders)

## Last-Tested-With Versions of Dependencies

- VS Code (Insiders):
   - 1.88.0-insider
   - Commit: 61187a0b6547df5911a0ee259f7afda46bac7ec3
   - Date: 2024-03-04T05:55:03.585Z
- GitHub Copilot extension: v1.171.750 (pre-release)
- GitHub Copilot Chat extension: v0.14.2024030401 (pre-release)

<!-- region exclude-from-marketplace -->

## Contributing

There are several ways you can contribute to our [repo](https://github.com/microsoft/vscode-azure-agent):

* **Ideas, feature requests and bugs**: We are open to all ideas and we want to get rid of bugs! Use the [Issues](https://github.com/microsoft/vscode-azure-agent/issues) section to report a new issue, provide your ideas or contribute to existing threads.
* **Documentation**: Found a typo or strangely worded sentences? Submit a PR!
* **Code**: Contribute bug fixes, features or design changes:
  * Clone the repository locally and open in VS Code.
  * Run "Extensions: Show Recommended Extensions" from the [command palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and install all extensions listed under "Workspace Recommendations"
  * Open the terminal (press <kbd>CTRL</kbd>+ <kbd>\`</kbd>) and run `npm install`.
  * To build, press <kbd>F1</kbd> and type in `Tasks: Run Build Task`.
  * Debug: press <kbd>F5</kbd> to start debugging the extension.

## Legal

Before we can accept your pull request you will need to sign a **Contribution License Agreement**. All you need to do is to submit a pull request, then the PR will get appropriately labelled (e.g. `cla-required`, `cla-norequired`, `cla-signed`, `cla-already-signed`). If you already signed the agreement we will continue with reviewing the PR, otherwise system will tell you how you can sign the CLA. Once you sign the CLA all future PR's will be labeled as `cla-signed`.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

<!-- endregion exclude-from-marketplace -->

## Telemetry

VS Code collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](https://go.microsoft.com/fwlink/?LinkID=528096&clcid=0x409) to learn more. If you don't wish to send usage data to Microsoft you can set the `telemetry.enableTelemetry` setting to `false`. Learn more in our [FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## License

[MIT](LICENSE.md)
