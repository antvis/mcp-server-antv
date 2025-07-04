#!/usr/bin/env node

/**
 * AntV MCP Server
 *
 * MCP server providing documentation query and Q&A services for AntV visualization libraries
 * Supports topic extraction, intent recognition, and intelligent document retrieval
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { AntVAssistantTool } from './tools/antv-assistant.js';
import { TopicIntentExtractorTool } from './tools/topic-intent-extractor.js';
import { Logger, LogLevel } from './utils/logger.js';
import { DEFAULT_CONFIG } from './config/index.js';
import type { AntVAssistantArgs } from './types/index.js';
import type { TopicIntentExtractorArgs } from './tools/topic-intent-extractor.js';

/**
 * Tool registry
 */
interface ToolRegistry {
  [key: string]: {
    instance: AntVAssistantTool | TopicIntentExtractorTool;
    execute: (args: any) => Promise<any>;
  };
}

/**
 * AntV MCP Server
 */
class AntVMcpServer {
  private readonly server: Server;
  private readonly tools: ToolRegistry;
  private readonly logger: Logger;

  constructor() {
    this.server = new Server({
      name: 'mcp-server-antv',
      version: '1.0.0',
    });

    this.tools = this.initializeTools();

    const logLevel = LogLevel[DEFAULT_CONFIG.logger.level] || LogLevel.INFO;
    this.logger = new Logger({
      level: logLevel,
      prefix: 'McpServerAntV',
    });

    this.setupRequestHandlers();
    this.logger.info('AntV MCP Server initialized successfully');
  }

  /**
   * Initialize tool registry
   */
  private initializeTools(): ToolRegistry {
    const assistantTool = new AntVAssistantTool();
    const extractorTool = new TopicIntentExtractorTool();

    return {
      antv_assistant: {
        instance: assistantTool,
        execute: (args: AntVAssistantArgs) => assistantTool.execute(args),
      },
      topic_intent_extractor: {
        instance: extractorTool,
        execute: (args: TopicIntentExtractorArgs) =>
          extractorTool.execute(args),
      },
    };
  }

  /**
   * Setup request handlers
   */
  private setupRequestHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug('Received list tools request');
      return {
        tools: Object.values(this.tools).map((tool) =>
          tool.instance.getToolDefinition(),
        ),
      };
    });

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request): Promise<CallToolResult> => {
        return this.handleToolCall(
          request.params.name,
          request.params.arguments,
        );
      },
    );
  }

  /**
   * Handle tool calls
   */
  private async handleToolCall(
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<CallToolResult> {
    this.logger.debug(`Tool call received: ${toolName}`);

    try {
      const tool = this.tools[toolName];
      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${toolName}`,
        );
      }

      const result = await tool.execute(args);

      this.logger.debug(`Tool execution completed: ${toolName}`);

      return this.formatToolResult(result);
    } catch (error) {
      this.logger.error(`Tool execution failed (${toolName}):`, error);
      return this.formatErrorResult(error);
    }
  }

  /**
   * Format tool execution result
   */
  private formatToolResult(result: any): CallToolResult {
    return {
      content: result.content || [],
      isError: result.isError || false,
      _meta: result.metadata,
    };
  }

  /**
   * Format error result
   */
  private formatErrorResult(error: unknown): CallToolResult {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: `❌ Tool execution failed: ${errorMessage}`,
        },
      ],
      isError: true,
      _meta: {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Start server
   */
  async run(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      this.logger.info('AntV MCP Server started with stdio transport');
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown server
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down AntV MCP Server...');

    try {
      this.logger.info('AntV MCP Server shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      throw error;
    }
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
 */
async function main(): Promise<void> {
  const server = new AntVMcpServer();

  // Setup process error handling
  setupProcessHandlers(server);

  try {
    // Start server
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  } finally {
    // Ensure server shutdown
    await server.shutdown();
  }
}

// Start application
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}
