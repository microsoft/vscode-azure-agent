import { z } from "zod";
import { type IntentDetectionTarget } from "../intentDetection";

export type ZodIntentDetectionTarget = {
    name: z.ZodLiteral<string>;
    intentDetectionDescription: z.ZodLiteral<string>;
}

export type ZodIntentDetectionResult = {
    intent: z.ZodEnum<[string, ...string[]]>;
};

export type ZodIntentDetectionSchema = ZodIntentDetectionTarget | ZodIntentDetectionResult;

export function getZodIntentDetectionSchema(targets: IntentDetectionTarget[]): { [key: string]: z.ZodObject<ZodIntentDetectionSchema> } {
    const zodTargets = targets.map((target) => {
        return {
            // This assumes the target name can be the name of a valid JavaScript identifier and has no conflicts among all the targets.
            name: target.name,
            zodObject: z.object({
                name: z.literal(target.name),
                intentDetectionDescription: z.literal(target.intentDetectionDescription)
            })
        };
    });

    const schemaPartial: { [key: string]: z.ZodObject<ZodIntentDetectionSchema> } = {};
    zodTargets.forEach((zodTarget) => {
        schemaPartial[zodTarget.name] = zodTarget.zodObject;
    });

    // Add a target for intent that is not understood.
    schemaPartial["UnknownIntent"] = z.object({
        name: z.literal("UnknownIntent"),
        intentDetectionDescription: z.literal("This is best used when the intention is not understood.")
    });

    // Add the root target which will be picked from all the avaialble targets above.
    const targetNames = zodTargets.map((zodTarget) => zodTarget.name);

    return {
        Action: z.object({
            intent: z.enum(["UnknownIntent", ...targetNames])
        }),
        ...schemaPartial
    };
}
