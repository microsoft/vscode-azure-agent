import { AgentRequest } from "../agent";
import { getResponseAsStringCopilotInteraction } from "../copilotInteractions";

/**
 * @returns Whether we should query Azure Resource Graph to grab context to better complete the prompt.
 */
export async function shouldPerformArgQuery(request: AgentRequest): Promise<boolean> {
    const systemPrompt = "You are an expert in Azure resources. The user has asked a question which may require context of his Azure resources from Azure Resource Graph. Determine if you need to query Azure Resource Graph to better answer the user's question.\nRespond with 'yes' or 'no'.";
    const response = await getResponseAsStringCopilotInteraction(systemPrompt, request);
    return response?.toLowerCase() === "yes";
}
