// This type file should live in the shared dev utils package.

/**
 * The type of an extension's schema to be used for intent detection.
 * @param TypeT The type of the action. Usually a concise string that summarizes the action.
 * @param IntentT The intent of the action. Usually a verbose sentence that describes situations where the action is suitable or give more context information of the action.
 * @param ParametersT The parameters of the action.
 */
export type ActionSchema<TypeT, IntentT, ParametersT> = {
    actionType: TypeT;
    actionIntent: IntentT;
    parameters: ParametersT;
};
