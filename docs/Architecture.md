# Azure Agent for VS Code Architecture

The Azure Agent for VS Code (later referred to as "the agent") is an agent exposed via the VS Code GitHub Copilot chat. It is currently has two goals for how it should help users:

1. Help users learn about and understand Azure - respond to informational prompts
1. Help users do things with Azure - respond to actionable prompts

This document will help explain how those goals are accomplished.

# Agent Subcommands

Agents for VS Code GitHub Copilot chat are invoked by using `@<agent name>` syntax followed by a prompt. Once the user submits their prompt the invoked agent's code handles it. Agents can also expose subcommands. These exist as an option to help guide users in what capabilities and agent has, and as an option for the user to be more explicit as to what the want the invoked agent to do when handling their prompt. Subcommands are exposed to the user by using `/<subcommand>` syntax after the `@<agent name>` syntax.

The Azure Agent for VS Code currently exposes subcommands which roughly map to each Azure service supported by the Azure Extensions for VS Code. There is an additional `/help` subcommand which gives the user help information about the agent. Whenever the user enters a promp without a subcommand, the agent will attempt to use intent detection to determine which Azure service the user is wanting to learn about or do something with.

If an Azure service subcommand has been determined (either explicitly by the user or implicitly by the agent), the agent can then determine what to do next.

## Service Subcommands

Behind each Azure service subcommand is another set of subcommands. These subcommands are effectively hidden from the user. Since the subcommands are hidden from the user, the agent will always be making use of intent detection to determine which subcommand to use. These subcommands provide the realization of the agent's goals, informational and actionable.

### Informational Prompt Subcommands

The agent provides common implementations of various informational subcommands. At this time, these subcommands are `/learn` and `/brainstorm`. For a service to support these subcommands, a config must be filled out which gives context on how to "learn" or "brainstorm" for the service in question. These configs are internal to the agent extension so that even if the user has not installed the associated Azure Extension for VS Code, the agent can still handle informational prompts about the service.

### Actionable Prompt Subcommands

For the handling of actionable prompts, the agent relies on existing functionality provided by the Azure Extensions for VS Code. When an associated Azure Extension for VS Code is installed, the agent will query it to determine what actions the extension exposes to the agent. From these exposed actions, the agent will dynamically create the actionable prompt subcommands for the associated service.

#### Wizard Based Command Actionable Prompt Subcommands

Wizard based commands are currently the only types of commands that extensions expose to the agent. The goal of exposing "wizard based commands" is to limit the amount of code changes that need to be made in the associated Azure Extension for VS Code to expose the command to the agent. This is possible because nearly all existing Azure Extension for VS Code commands are wizard based.

Unfortunately, this technique:
- Involves frequent back and forth between the agent extension and the associated Azure Extension for VS Code
- Requires numerous calls to the GitHub Copilot LLM
- Includes the potential for the agent to get stuck early on despite the user providing a non-trivial amount of information.

Therefore, in the future, exposing commands as "wizard based" may not be the only way to expose commands to the agent.

When a wizard based command's subcommand is executed, the following will essentially happen:

1. The agent tells the associated Azure Extension for VS Code to execute the command, passing along an `IAzureAgentInput` object. This object will be used by the command's wizard instead of the typical `IAzureUserInput` object.
1. The associated Azure Extension for VS Code will eventually run the wizard for the command. Anytime a wizard step calls a UI prompt method (e.g. `showQuickPick`), the provided `IAzureAgentInput` object will be used and result in a callback to the agent extension.
1. The agent extension will receive the request for a UI prompt, and given the information associated with the request, will invoke the GitHub Copilot LLM to determine how best to respond to the prompt.
   1. If the agent can determine the best response, it will cache that value and use it to respond to the prompt, thus allowing the wizard to continue, thus returning to the earlier step.
   1. If the agent cannot determine the best response, it will cache that it could not do so.
      1. If the request gives information on a value which can be used to skip past the prompt, the agent will cache the fact that the prompt was not answered and use that value to respond to the prompt.
      1. If the request does not give information on a value which can be used to skip past the prompt, the agent will cache that fact and terminate the wizard/command.
1. If the wizard is able to reach completion, the command should terminate without doing any execution.

Once the wizard/command terminates, the agent will present all the information it has gathered and present it to the user in a single message. This includes:
- What command was chosen as the best command used to fulfill the user's prompt
- What "parameters" for the command the agent was able to determine.
- What "parameters" for the command the agent was unable to determine.

Additionally, the agent will provide a button which the user can click on to executing the command, using the determined parameters as an initial starting point. If the user clicks on the button, the associated Azure Extension for VS Code will be told to execute the command, passing along the determined parameters. The command will now run its wizard, now with an `IAzureUserInput` object, using the provided parameters where possible, and asking the user for input where not possible.

If the user does not want to click the button, they can provide a new prompt which specifies information to help the agent determine the missing parameters.
