import { z } from "zod";
export declare const zodToJsonSchema: (schema: Record<string, z.ZodType<any>>) => import("zod-to-json-schema").JsonSchema7Type & {
    $schema?: string | undefined;
    definitions?: {
        [key: string]: import("zod-to-json-schema").JsonSchema7Type;
    } | undefined;
};
