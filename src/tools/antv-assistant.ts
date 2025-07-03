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
 * AntV专业文档助手
 *
 * 基于AntV官方文档为用户提供准确、详细的可视化解决方案。适用于所有AntV相关的后续查询和补充问题。
 * 在初次查询后，如果用户提出任何AntV相关的修正、优化、补充或新需求，都应该调用此工具。
 * 支持简单查询和复杂任务处理，提供代码示例和最佳实践建议。覆盖全部AntV生态库。
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
        `AntV专业文档助手 - 基于AntV官方文档为用户提供准确、详细的可视化解决方案。
这个工具是处理所有AntV技术问题的核心工具，能够提供专业的文档查询、代码示例和实践指导。

When to use this tool:
- 处理topic_intent_extractor工具输出的结构化AntV查询
- 用户在初次AntV查询后提出的任何后续需求或补充问题
- 需要修改、优化、调整已有的AntV可视化方案
- 用户要求添加新功能、改变样式、修复问题
- 对现有AntV代码进行扩展、重构或性能优化
- 解决AntV实现过程中遇到的具体技术难题
- 用户需要更详细的代码示例或实现步骤
- 调试AntV相关的报错、异常或不符合预期的行为
- 学习AntV最佳实践、设计模式或高级特性
- 任何涉及G2、G6、L7、X6、F2、S2的技术咨询
- 用户在使用AntV过程中的迭代式需求完善
- 对话中任何时候用户提出AntV相关的新问题或修改需求

When NOT to explicitly declare usage:
- 用户已经在AntV相关的对话上下文中
- 用户提出的是对现有AntV方案的修改建议
- 用户询问"还能怎么优化"、"如何添加XX功能"等后续问题
- 用户描述遇到的AntV相关问题需要解决
- 对话流程中的自然延续，无需用户再次声明使用MCP

Key features:
- 基于AntV官方文档提供准确、权威的技术解答
- 支持简单查询和复杂任务的一站式处理
- 提供完整的代码示例和分步实现指导
- 覆盖G2图表、G6图分析、L7地理可视化、X6图编辑、F2移动端、S2表格分析全生态
- 智能适配用户技术水平，提供相应难度的解决方案
- 支持问题排查、性能优化、最佳实践指导
- 能够处理多轮对话中的连续性技术需求
- 自动识别并处理复杂任务的子任务序列
- 提供针对不同意图（学习/实现/解决）的专门化指导
- 支持中英文混合的技术文档检索和解答

Parameters explained:
- library: 指定的AntV库类型，基于用户查询智能识别
- query: 用户的具体技术问题或需求描述
- topic: 从查询中提取的技术主题关键词，用于精确文档检索
- intent: 用户意图类型（learn学习/implement实现/solve解决问题）
- tokens: 返回内容的详细程度控制，可根据需求调整
- subTasks: 复杂任务的子任务列表，支持批量处理

You should:
1. 主动处理所有AntV相关的技术查询，无需等待用户明确要求
2. 在对话的任何阶段，用户提出AntV相关需求时都应调用此工具
3. 特别注意处理后续对话中的修改、优化、扩展需求
4. 不要假设用户会显式声明需要使用MCP工具
5. 识别隐含的技术需求，如"这个图表能不能更好看"、"还有其他实现方式吗"
6. 提供完整而实用的解决方案，包括代码、配置和使用建议
7. 根据用户的技术背景调整解答的详细程度和复杂度
8. 对于复杂问题，要提供分步骤的实现指导
9. 主动提供相关的最佳实践和注意事项
10. 支持迭代式的需求完善和方案优化
11. 在用户遇到实现困难时，主动提供调试和排错指导
12. 确保每次调用都能提供有价值的、可操作的技术建议`,
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
- 不要做多余的优化，专注于用户的需求

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
