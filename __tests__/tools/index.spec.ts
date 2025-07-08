import { describe, expect, it } from "vitest";
import { default as AntVAssistant } from './antv-assistant.json';
import { default as TopicIntentExtractor } from './topic-intent-extractor.json';
import { AntVAssistantTool, TopicIntentExtractorTool } from '../../src/tools';

describe("Check tool schema", () => {
  it("AntVAssistant should match the expected schema", () => {
    const { run, ...rest } = AntVAssistantTool;
    expect(rest).toEqual(AntVAssistant);
  });
  it("TopicIntentExtractor should match the expected schema", () => {
    const { run, ...rest } = TopicIntentExtractorTool;
    expect(rest).toEqual(TopicIntentExtractor);
  });
});
