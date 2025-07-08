import { describe, expect, it } from "vitest";
import { default as AntVAssistant } from './antv-assistant.json';
import { default as TopicIntentExtractor } from './topic-intent-extractor.json';
import { AntVAssistantTool, TopicIntentExtractorTool } from '../../src/tools';
import { zodToJsonSchema } from "../schema";

describe("Check tool schema", () => {
  it("AntVAssistant should match the expected schema", () => {
    const { run, inputSchema, ...rest } = AntVAssistantTool;
    expect({
      ...rest,
      inputSchema: zodToJsonSchema(inputSchema.shape),
    }).toEqual(AntVAssistant);
  });
  it("TopicIntentExtractor should match the expected schema", () => {
    const { run, inputSchema, ...rest } = TopicIntentExtractorTool;
    expect({
      ...rest,
      inputSchema: zodToJsonSchema(inputSchema.shape),
    }).toEqual(TopicIntentExtractor);
  });
});
