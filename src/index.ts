#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Logger, LogLevel } from './utils';
import { AntVAssistantTool, TopicIntentExtractorTool } from './tools';
import { type AntVAssistantArgs } from './types'

/**
 * AntV MCP Server:
 *
 * MCP server providing documentation query and Q&A services for AntV visualization libraries.
 * Supports topic extraction, intent recognition, and intelligent document retrieval.
 * Integrates with AntV Assistant for enhanced user interaction.
 */
class AntVMCPServer {
  private readonly server: McpServer;
  private readonly logger: Logger;

  constructor() {
    this.server = new McpServer({
      name: 'mcp-server-antv',
      version: '0.1.0',
    });

    [TopicIntentExtractorTool, AntVAssistantTool].forEach((tool) => {
      const { name, description, inputSchema, run } = tool;
      this.server.tool(
        name,
        description,
        inputSchema.shape,
        async (args: { [x: string]: any }) => {
          return (await run(args as AntVAssistantArgs)) as any;
        },
      );
    });

    this.logger = new Logger({
      level: LogLevel.INFO,
      prefix: 'MCPServerAntV',
    });

    this.logger.info('AntV MCP Server initialized successfully!');
  }

  async runWithStdio(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.logger.info('AntV MCP Server started with stdio transport!');
    } catch (error) {
      this.logger.error('Failed to start server with stdio transport:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down AntV MCP Server...');
    this.logger.info('AntV MCP Server shutdown complete');
  }
}

/**
 * Main function
 * Initializes and starts the AntV MCP server based on the transport type.
 */
async function main(): Promise<void> {
  const server = new AntVMCPServer();

  // Setup process error handling
  // Uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    server.shutdown().finally(() => {
      process.exit(1);
    });
  });
  // Unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection:', promise, 'reason:', reason);
    server.shutdown().finally(() => {
      process.exit(1);
    });
  });

  try {
    await server.runWithStdio();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start application

main().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
