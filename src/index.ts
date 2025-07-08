#!/usr/bin/env node

/**
 * AntV MCP Server
 *
 * MCP server providing documentation query and Q&A services for AntV visualization libraries
 * Supports topic extraction, intent recognition, and intelligent document retrieval
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from 'http';
import { Command } from 'commander';
import { Logger, LogLevel } from './utils';
import { DEFAULT_CONFIG } from './constant';
import { AntVAssistantTool, TopicIntentExtractorTool } from './tools';
import { type AntVAssistantArgs } from './types'

const program = new Command()
  .option('--transport <stdio|http>', 'transport type', 'stdio')
  .option('--port <number>', 'port for HTTP transport', '3000')
  .allowUnknownOption()
  .parse(process.argv);

const cliOptions = program.opts<{ transport: string; port: string }>();
const TRANSPORT_TYPE = (cliOptions.transport || 'stdio') as 'stdio' | 'http';
const CLI_PORT = (() => {
  const parsed = parseInt(cliOptions.port, 10);
  return isNaN(parsed) ? undefined : parsed;
})();

class AntVMcpServer {
  private readonly server: McpServer;
  private readonly logger: Logger;

  constructor() {
    this.server = new McpServer({
      name: 'mcp-server-antv',
      version: '1.0.0',
      // 不要传 tools 字段
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

    const logLevel = LogLevel[DEFAULT_CONFIG.logger.level] || LogLevel.INFO;
    this.logger = new Logger({
      level: logLevel,
      prefix: 'McpServerAntV',
    });

    this.logger.info('AntV MCP Server initialized successfully');
  }

  async runWithStdio(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.logger.info('AntV MCP Server started with stdio transport');
    } catch (error) {
      this.logger.error('Failed to start server with stdio transport:', error);
      throw error;
    }
  }

  async runWithHttp(): Promise<void> {
    try {
      const port = CLI_PORT ?? 3000;
      const httpServer = createServer(async (req, res) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`)
          .pathname;

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET,POST,OPTIONS,DELETE',
        );
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, MCP-Session-Id, mcp-session-id',
        );

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        try {
          if (url === '/mcp') {
            const transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: undefined,
            });
            await transport.handleRequest(req, res);
          } else {
            res.writeHead(404);
            res.end('Not found');
          }
        } catch (error) {
          this.logger.error('Error handling request:', error);
          if (!res.headersSent) {
            res.writeHead(500);
            res.end('Internal Server Error');
          }
        }
      });

      httpServer.listen(port, () => {
        this.logger.info(
          `AntV MCP Server running on HTTP at http://localhost:${port}/mcp`,
        );
      });
    } catch (error) {
      this.logger.error('Failed to start server with HTTP transport:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down AntV MCP Server...');
    this.logger.info('AntV MCP Server shutdown complete');
  }
}

/**
 * Setup process error handlers
 */
function setupProcessHandlers(server: AntVMcpServer): void {
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
}
/**
 * Main function
 * Initializes and starts the AntV MCP server based on the transport type.
 */
async function main(): Promise<void> {
  const server = new AntVMcpServer();

  // Setup process error handling
  setupProcessHandlers(server);

  try {
    // Start server based on transport type
    if (TRANSPORT_TYPE === 'http') {
      await server.runWithHttp();
    } else {
      await server.runWithStdio();
    }
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
