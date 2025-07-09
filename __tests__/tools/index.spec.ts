import { describe, expect, it } from 'vitest';
import { default as QueryAntVDocument } from './query_antv_document.json';
import { default as ExtractAntVTopic } from './extract_antv_topic.json';
import { QueryAntVDocumentTool, ExtractAntVTopicTool } from '../../src/tools';
import { zodToJsonSchema } from '../schema';

describe('Check tool schema', () => {
  it('QueryAntVDocument should match the expected schema', () => {
    const { run, inputSchema, ...rest } = QueryAntVDocumentTool;
    expect({
      ...rest,
      inputSchema: zodToJsonSchema(inputSchema.shape),
    }).toEqual(QueryAntVDocument);
  });

  it('ExtractAntVTopic should match the expected schema', () => {
    const { run, inputSchema, ...rest } = ExtractAntVTopicTool;
    expect({
      ...rest,
      inputSchema: zodToJsonSchema(inputSchema.shape),
    }).toEqual(ExtractAntVTopic);
  });
});
