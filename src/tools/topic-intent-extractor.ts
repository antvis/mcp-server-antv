import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { AntVLibrary } from '../types/index.js';
import { Logger, LogLevel } from '../utils/logger.js';
import { getLibraryConfig, isValidLibrary } from '../config/index.js';

export interface TopicIntentExtractorArgs {
  query: string;
  library: AntVLibrary;
  maxTopics?: number;
}

export interface TopicIntentExtractorResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  metadata?: {
    topic: string;
    intent: string;
    library: AntVLibrary;
    maxTopics: number;
    promptGenerated: boolean;
    next_tools?: string[];
  };
  isError?: boolean;
}

/**
 * 用户意图枚举
 */
export const USER_INTENTS = {
  LEARN: 'learn', // 学习了解
  IMPLEMENT: 'implement', // 实现功能
  SOLVE: 'solve', // 解决问题
} as const;

/**
 * 主题意图提取工具
 *
 * 从用户查询中提取技术主题和用户意图，为后续文档检索提供精确的搜索关键词
 */
export class TopicIntentExtractorTool {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger({
      level: LogLevel.INFO,
      prefix: 'TopicIntentExtractor',
    });
  }

  /**
   * 获取工具定义
   */
  getToolDefinition(): Tool {
    return {
      name: 'topic_intent_extractor',
      description:
        '从用户查询中提取主题关键词和意图，为 antv_assistant 工具提供检索信息',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '用户查询内容',
          },
          library: {
            type: 'string',
            enum: ['g2', 'g6', 'l7', 'x6', 'f2', 's2'],
            description: 'AntV 库名称',
          },
          maxTopics: {
            type: 'number',
            minimum: 3,
            maximum: 8,
            default: 5,
            description: '最多提取的主题短语数量',
          },
        },
        required: ['query', 'library'],
      },
    };
  }

  /**
   * 执行工具
   */
  async execute(
    args: TopicIntentExtractorArgs,
  ): Promise<TopicIntentExtractorResult> {
    try {
      this.validateArgs(args);

      const extractionPrompt = this.generateExtractionPrompt(args);
      const maxTopics = args.maxTopics || 5;

      return {
        content: [
          {
            type: 'text',
            text: extractionPrompt,
          },
        ],
        metadata: {
          topic: '', // 将由 LLM 填充
          intent: '', // 将由 LLM 填充
          library: args.library,
          maxTopics,
          promptGenerated: true,
          next_tools: ['antv_assistant'],
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate extraction prompt:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ 生成提取任务失败: ${
              error instanceof Error ? error.message : '未知错误'
            }`,
          },
        ],
        isError: true,
        metadata: {
          topic: '',
          intent: '',
          library: args.library,
          maxTopics: args.maxTopics || 5,
          promptGenerated: false,
          next_tools: ['antv_assistant'],
        },
      };
    }
  }

  /**
   * 验证输入参数
   */
  private validateArgs(args: TopicIntentExtractorArgs): void {
    if (!args.query?.trim()) throw new Error('查询内容不能为空');
    if (!args.library) throw new Error('必须指定 AntV 库名称');

    if (!isValidLibrary(args.library)) {
      throw new Error(`不支持的库: ${args.library}`);
    }
  }

  /**
   * 生成提取任务的 Prompt
   */
  private generateExtractionPrompt(args: TopicIntentExtractorArgs): string {
    const maxTopics = args.maxTopics || 5;
    const libraryContext = getLibraryConfig(args.library);

    return `# 🔍 AntV 主题和意图提取任务

## 📋 任务目标
从用户查询中提取最相关的技术主题短语和用户意图，用于 ${libraryContext.name} 文档检索。

## 🎯 用户查询
\`\`\`
${args.query}
\`\`\`

## 📝 提取规则

### 1. 主题短语提取
- **来源限制**: 只从用户查询内容中提取，不要添加查询中没有的概念
- **数量要求**: 最多 ${maxTopics} 个，如果查询简单可以少于这个数量
- **格式要求**:
  - 提取有意义的短语组合（2-4个词）
  - 避免单个词汇或过长的句子
  - 翻译成英文，保持技术准确性
- **优先级**:
  1. ${libraryContext.name} 特有的概念和API
  2. 图表类型和可视化概念
  3. 交互、动画效果、数据处理和配置

### 2. 用户意图识别
根据查询的语气和内容，选择最匹配的意图：

- **learn**: 学习了解（如：什么是、如何理解、介绍一下）
- **implement**: 实现功能（如：如何创建、怎么实现、代码示例）
- **solve**: 解决问题（如：报错、不工作、修复问题）

## 📤 输出格式
严格按照以下JSON格式输出，不要添加其他内容：

\`\`\`json
{
  "topics": "实际提取的主题1, 主题2, 主题3",
  "intent": "learn|implement|solve"
}
\`\`\`

## 💡 提取示例

**示例1 - 复杂查询**
查询: "如何在G2中创建一个带有动画效果的柱状图，并添加鼠标悬停交互？"
输出:
\`\`\`json
{
  "topics": "animated bar chart, chart animation, hover interaction, mouse events",
  "intent": "implement"
}
\`\`\`

**示例2 - 简单查询**
查询: "G2是什么？"
输出:
\`\`\`json
{
  "topics": "G2 introduction",
  "intent": "learn"
}
\`\`\`

**示例3 - 问题查询**
查询: "我的饼图不显示标签，怎么办？"
输出:
\`\`\`json
{
  "topics": "pie chart, chart labels, label display",
  "intent": "solve"
}
\`\`\`

现在请开始提取：`;
  }
}
