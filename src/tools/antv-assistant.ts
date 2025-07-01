import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { AntVAssistantArgs, AntVAssistantResult } from '../types/index.js';
import { Context7Service } from '../services/context7.js';
import { Logger, LogLevel } from '../utils/logger.js';
import {
  getLibraryConfig,
  isValidLibrary,
  DEFAULT_CONFIG,
} from '../config/index.js';

/**
 * AntV 文档问答助手工具
 *
 * 基于用户查询的主题和意图，获取相关文档并生成结构化回答。为复杂的AntV可视化问题提供结构化的思考和任务拆解过程
 */
export class AntVAssistantTool {
  private readonly context7Service: Context7Service;
  private readonly logger: Logger;

  constructor() {
    this.context7Service = new Context7Service({
      logLevel: LogLevel.WARN,
    });

    this.logger = new Logger({
      level: LogLevel.INFO,
      prefix: 'AntVAssistant',
    });
  }

  /**
   * 获取工具定义
   */
  getToolDefinition(): Tool {
    const tokenConfig = DEFAULT_CONFIG.context7.tokens;

    return {
      name: 'antv_assistant',
      description:
        '基于 AntV 文档的问答助手。可以处理简单查询，也可以接收预拆解的复杂任务子任务列表并一次性处理所有子任务。在对话的后续轮次中，如果栈和主题已经明确，任务简单，可以直接调用此工具进行修正或补充查询。',
      inputSchema: {
        type: 'object',
        properties: {
          library: {
            type: 'string',
            enum: ['g2', 'g6', 'l7', 'x6', 'f2', 's2'],
            description: 'AntV 库名称',
          },
          query: {
            type: 'string',
            description: '用户查询',
          },
          tokens: {
            type: 'number',
            minimum: tokenConfig.min,
            maximum: tokenConfig.max,
            default: tokenConfig.default,
            description: '返回内容的最大 token 数量',
          },
          topic: {
            type: 'string',
            description:
              '提取的主题短语（逗号分隔），由 topic_intent_extractor 工具提供',
          },
          intent: {
            type: 'string',
            description: '提取的用户意图，由 topic_intent_extractor 工具提供',
          },
          subTasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: '子任务查询',
                },
                topic: {
                  type: 'string',
                  description: '子任务主题',
                },
              },
            },
            description:
              '已拆解的子任务列表（可选，如果提供则直接处理这些子任务而不是内部拆解）',
          },
        },
        required: ['library', 'query', 'topic', 'intent'],
      },
    };
  }

  /**
   * 执行工具
   */
  async execute(args: AntVAssistantArgs): Promise<AntVAssistantResult> {
    const startTime = Date.now();

    try {
      this.validateArgs(args);

      const libraryId = this.context7Service.getLibraryId(args.library);

      let response: string;
      let subTaskResults: any[] = [];
      let isComplexTask = false;
      let hasDocumentation = false;

      // 如果提供了子任务，是复杂任务
      if (args.subTasks && args.subTasks.length > 0) {
        isComplexTask = true;
        const { response: taskResponse, hasDocumentation: taskHasDoc } =
          await this.handleComplexTaskWithDocCheck(
            args,
            libraryId,
            args.subTasks,
          );
        response = taskResponse;
        hasDocumentation = taskHasDoc;
        subTaskResults = args.subTasks;
      } else {
        // 简单任务：直接查询
        const documentation =
          await this.context7Service.fetchLibraryDocumentation(
            libraryId,
            args.topic,
            args.tokens || DEFAULT_CONFIG.context7.tokens.default,
          );
        hasDocumentation =
          documentation !== null && documentation.trim() !== '';
        response = this.generateResponse(args, documentation);
      }

      const processingTime = Date.now() - startTime;

      return {
        content: [{ type: 'text', text: response }],
        metadata: {
          topics: args.topic.split(',').map((t) => t.trim()),
          intent: args.intent,
          library: args.library,
          hasDocumentation,
          processingTime,
        },
      };
    } catch (error) {
      this.logger.error('Failed to execute assistant tool:', error);
      const processingTime = Date.now() - startTime;

      return {
        content: [
          {
            type: 'text',
            text: `❌ 处理失败: ${
              error instanceof Error ? error.message : '未知错误'
            }`,
          },
        ],
        isError: true,
        metadata: {
          topics: args.topic ? args.topic.split(',').map((t) => t.trim()) : [],
          intent: args.intent,
          library: args.library,
          hasDocumentation: false,
          processingTime,
          error: error instanceof Error ? error.message : '未知错误',
        },
      };
    }
  }

  /**
   * 处理复杂任务并检查文档获取状态
   */
  private async handleComplexTaskWithDocCheck(
    args: AntVAssistantArgs,
    libraryId: string,
    subTasks: Array<{ query: string; topic: string; intent: string }>,
  ): Promise<{ response: string; hasDocumentation: boolean }> {
    const libraryConfig = getLibraryConfig(args.library);
    const library = libraryConfig.name;

    let response = `# ${library} 复杂任务解答\n\n`;
    response += `**用户问题**: ${args.query}\n`;
    response += `**任务类型**: 复杂任务（已拆解为 ${subTasks.length} 个子任务）\n`;
    response += `\n---\n\n`;

    // 限制每个子任务的token数量，避免返回内容过长
    const tokenPerSubTask = Math.min(
      Math.floor(
        (args.tokens || DEFAULT_CONFIG.context7.tokens.default) /
          subTasks.length,
      ),
      1000, // 每个子任务最多1000 tokens
    );

    const subTaskPromises = subTasks.map(async (subTask, index) => {
      try {
        this.logger.info(
          `Processing subtask ${index + 1}/${subTasks.length}: ${
            subTask.topic
          }`,
        );

        const documentation =
          await this.context7Service.fetchLibraryDocumentation(
            libraryId,
            subTask.topic,
            tokenPerSubTask,
          );

        return { task: subTask, documentation };
      } catch (error) {
        this.logger.error(`Failed to process subtask ${index + 1}:`, error);
        return { task: subTask, documentation: null };
      }
    });

    const subTaskResults = await Promise.all(subTaskPromises);

    // 检查是否有有效的文档
    const hasValidDocumentation = subTaskResults.some(
      (result) =>
        result.documentation !== null && result.documentation.trim() !== '',
    );

    // 生成子任务结果
    for (const [index, result] of subTaskResults.entries()) {
      response += `## 📋 子任务 ${index + 1}\n\n`;
      response += `**子任务查询**: ${result.task.query}\n`;
      response += `**子任务主题**: ${result.task.topic}\n\n`;

      if (result.documentation) {
        response += `${result.documentation}\n\n`;
      } else {
        response += `⚠️ 未能获取到相关文档内容\n\n`;
      }

      response += `---\n\n`;
    }

    // 生成总结和建议
    response += `## 🎯 任务整合建议\n\n`;
    response += this.generateComplexTaskSummary(args, subTaskResults);
    response += this.generateIntentSpecificGuidance(args.intent, library);

    return { response, hasDocumentation: hasValidDocumentation };
  }

  /**
   * 生成复杂任务总结
   */
  private generateComplexTaskSummary(
    args: AntVAssistantArgs,
    subTaskResults: Array<{ task: any; documentation: string | null }>,
  ): string {
    const successCount = subTaskResults.filter((r) => r.documentation).length;
    const totalCount = subTaskResults.length;

    let summary = `基于 ${successCount}/${totalCount} 个子任务的文档查询结果：\n\n`;

    if (successCount === totalCount) {
      summary += `✅ **完整解答**: 所有子任务都找到了相关文档`;
    } else if (successCount > totalCount / 2) {
      summary += `⚠️ **部分解答**: 大部分子任务找到了相关文档，建议：\n\n`;
      summary += `1. 先实现有文档支持的功能\n`;
      summary += `2. 对于缺失文档的部分，查阅官方资源或示例代码\n`;
      summary += `3. 在实践中逐步完善解决方案\n\n`;
    } else {
      summary += `❌ **文档不足**: 多数子任务缺少文档支持，建议：\n\n`;
      summary += `1. 重新细化查询关键词\n`;
      summary += `2. 查阅官方文档和示例\n`;
      summary += `3. 寻找社区资源和最佳实践\n\n`;
    }

    return summary;
  }

  /**
   * 验证输入参数
   */
  private validateArgs(args: AntVAssistantArgs): void {
    if (!args.library || !args.query?.trim()) {
      throw new Error('缺少必需参数: library 和 query');
    }

    if (!isValidLibrary(args.library)) {
      throw new Error(`不支持的库: ${args.library}`);
    }

    if (args.topic && !args.intent) {
      throw new Error('需要同时提供 topic 和 intent 参数');
    }
  }

  /**
   * 生成回答内容（简单任务）
   */
  private generateResponse(
    args: AntVAssistantArgs,
    context: string | null,
  ): string {
    const libraryConfig = getLibraryConfig(args.library);
    const library = libraryConfig.name;

    let response = `# ${library} 问答\n\n`;
    response += `**用户问题**: ${args.query}\n`;
    response += `**搜索主题**: ${args.topic}\n`;
    response += `\n---\n\n`;

    if (context) {
      response += `## 📚 相关文档\n\n${context}\n\n`;
      response += this.generateIntentSpecificGuidance(args.intent, library);
    } else {
      response += `## ⚠️ 文档获取失败\n\n`;
      response += `未能获取到相关文档内容。建议：\n`;
      response += `1. 检查搜索主题是否准确\n`;
      response += `2. 尝试使用更具体的技术术语\n`;
      response += `3. 查看 ${library} 官方文档\n`;
    }

    return response;
  }

  /**
   * 根据意图生成特定指导
   */
  private generateIntentSpecificGuidance(
    intent: string,
    library: string,
  ): string {
    switch (intent) {
      case 'learn':
        return this.generateLearnGuidance(library);
      case 'implement':
        return this.generateImplementGuidance(library);
      case 'solve':
        return this.generateSolveGuidance(library);
      default:
        return this.generateDefaultGuidance(library);
    }
  }

  private generateLearnGuidance(library: string): string {
    return `## 💡 学习建议

- 先了解文档中的核心概念和基础用法
- 运行示例代码，观察效果和参数作用
- 从简单示例开始，逐步尝试复杂功能
- 遇到问题时查阅官方文档

`;
  }

  private generateImplementGuidance(library: string): string {
    return `## 🛠️ 实现建议

- 参考文档中的示例代码
- 注意必需参数和可选参数的配置
- 先实现基础功能，再添加高级特性

`;
  }

  private generateSolveGuidance(library: string): string {
    return `## 🔧 问题排查

- 检查错误信息和参数配置
- 对比你的代码与文档示例的差异
- 确认 ${library} 版本和依赖兼容性
- 如果问题持续，可查阅官方 GitHub Issues

`;
  }

  private generateDefaultGuidance(library: string): string {
    return `## 📖 使用建议

- 仔细阅读上述文档内容
- 参考代码示例进行实践
- 根据需求调整相关参数
- 查阅 ${library} 官方文档获取更多信息

`;
  }
}
