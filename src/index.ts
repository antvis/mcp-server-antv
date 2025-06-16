#!/usr/bin/env node

/**
 * AntV MCP Server
 *
 * 为 AntV 可视化库提供文档查询和问答服务的 MCP 服务器
 * 支持主题提取、意图识别和智能文档检索
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
 * 工具注册表
 */
interface ToolRegistry {
  [key: string]: {
    instance: AntVAssistantTool | TopicIntentExtractorTool;
    execute: (args: any) => Promise<any>;
  };
}

/**
 * AntV MCP 服务器
 */
class AntVMcpServer {
  private readonly server: Server;
  private readonly tools: ToolRegistry;
  private readonly logger: Logger;
  private transport?: StdioServerTransport;

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
   * 初始化工具注册表
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
   * 设置请求处理器
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
   * 处理工具调用
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
   * 格式化工具执行结果
   */
  private formatToolResult(result: any): CallToolResult {
    return {
      content: result.content || [],
      isError: result.isError || false,
      _meta: result.metadata,
    };
  }

  /**
   * 格式化错误结果
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
   * 启动服务器
   */
  async run(): Promise<void> {
    try {
      this.transport = new StdioServerTransport();
      await this.server.connect(this.transport);

      this.logger.info('AntV MCP Server started with stdio transport');
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  /**
   * 优雅关闭服务器
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down AntV MCP Server...');

    try {
      // 关闭 MCP 服务器连接
      if (this.transport) {
        await this.server.close();
        this.logger.debug('MCP server connection closed');
      }

      this.logger.info('AntV MCP Server shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      throw error;
    }
  }
}

/**
 * 设置进程错误处理器
 */
function setupProcessHandlers(server: AntVMcpServer): void {
  // 未捕获的异常
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    server.shutdown().finally(() => {
      process.exit(1);
    });
  });

  // 未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection:', promise, 'reason:', reason);
    server.shutdown().finally(() => {
      process.exit(1);
    });
  });
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const server = new AntVMcpServer();

  // 设置进程错误处理
  setupProcessHandlers(server);

  try {
    // 启动服务器
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  } finally {
    // 确保服务器关闭
    await server.shutdown();
  }
}

// 启动应用
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}
