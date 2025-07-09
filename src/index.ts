#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger, validateSchema } from './utils';
import { QueryAntVDocumentTool, ExtractAntVTopicTool } from './tools';

class AntVMCPServer {
  private readonly server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'mcp-server-antv',
      version: '0.1.0',
    });

    // Register tools with validation
    [ExtractAntVTopicTool, QueryAntVDocumentTool].forEach((tool) => {
      const { name, description, inputSchema, run } = tool;
      this.server.tool(name, description, inputSchema.shape, (async (
        args: any,
      ) => {
        const { success, errorMessage } = validateSchema(inputSchema, args);
        if (success) {
          return await run(args);
        } else {
          throw new Error(errorMessage);
        }
      }) as any);
    });

    logger.info('AntV MCP Server initialized successfully!');
  }

  async runWithStdio(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info('AntV MCP Server started with stdio transport!');
    } catch (error) {
      logger.error('Failed to start server with stdio transport:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down AntV MCP Server...');
    logger.info('AntV MCP Server shutdown complete');
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
