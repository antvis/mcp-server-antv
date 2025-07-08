import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AntVAssistantArgs } from '../types/index.js';
import { AntVAssistantTool } from './antv-assistant.js';
import { TopicIntentExtractorTool } from './topic-intent-extractor.js';

export default function registryTools(server: McpServer) {
  [TopicIntentExtractorTool, AntVAssistantTool].forEach((tool) => {
    const { name, description, inputSchema, run } = tool;
    server.tool(
      name,
      description,
      inputSchema.shape,
      async (args: { [x: string]: any }) => {
        return (await run(args as AntVAssistantArgs)) as any;
      },
    );
  });
}
