"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodToJsonSchema = void 0;
const zod_1 = require("zod");
const zod_to_json_schema_1 = require("zod-to-json-schema");
// TODO: use zod v4 JSON to schema to replace zod-to-json-schema when v4 is stable
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const zodToJsonSchema = (schema) => {
    return (0, zod_to_json_schema_1.zodToJsonSchema)(zod_1.z.object(schema), {
        rejectedAdditionalProperties: undefined,
    });
};
exports.zodToJsonSchema = zodToJsonSchema;
