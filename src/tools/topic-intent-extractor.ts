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
    isComplexTask?: boolean;
    subTasks?: Array<{
      query: string;
      topic: string;
      intent: string;
    }>;
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
 * 从用户查询中提取主题关键词和意图，智能检测复杂任务并提供检索信息。智能检测并拆解复杂任务，为后续的antv_assistant工具调用提供结构化的任务信息
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
        '从用户查询中提取主题关键词和意图，智能检测复杂任务并提供检索信息。智能检测并拆解复杂任务，为后续的antv_assistant工具调用提供结构化的任务信息',
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
          isComplexTask: false, // 将由 LLM 判断并填充
          subTasks: [], // 如果是复杂任务，将由 LLM 填充子任务
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
          isComplexTask: false,
          subTasks: [],
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

### 1. 复杂任务检测
判断用户查询是否为复杂任务。复杂任务的特征：
- 包含多个技术概念或功能点
- 需要多个步骤才能完成
- 涉及多种图表类型或多种功能
- 有明确的流程或组合需求

### 2. 主题短语提取
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

### 3. 用户意图识别
根据查询的语气和内容，选择最匹配的意图：

- **learn**: 学习了解（如：什么是、如何理解、介绍一下）
- **implement**: 实现功能（如：如何创建、怎么实现、代码示例）
- **solve**: 解决问题（如：报错、不工作、修复问题）

### 4. 复杂任务拆解
如果判断为复杂任务，需要将其拆解成2-4个子任务，每个子任务应该：
- 专注于一个具体的技术点或功能
- 能独立通过文档查询获得答案
- 按逻辑顺序排列（基础 → 高级）

**注意**: 对于复杂任务，将提供拆解后的子任务列表给antv_assistant工具一次性处理，而不是多次调用工具。

## 📤 输出格式

### 简单任务输出格式：
\`\`\`json
{
  "topics": "实际提取的主题1, 主题2, 主题3",
  "intent": "learn|implement|solve",
  "isComplexTask": false
}
\`\`\`

### 复杂任务输出格式：
\`\`\`json
{
  "topics": "所有相关主题的汇总",
  "intent": "总体意图",
  "isComplexTask": true,
  "subTasks": [
    {
      "query": "子任务1的具体问题",
      "topic": "子任务1的主题",
      "intent": "子任务1的意图"
    },
    {
      "query": "子任务2的具体问题", 
      "topic": "子任务2的主题",
      "intent": "子任务2的意图"
    }
  ]
}
\`\`\`

## 💡 提取示例

**示例1 - 简单任务**
查询: "G2是什么？"
输出:
\`\`\`json
{
  "topics": "G2 introduction",
  "intent": "learn",
  "isComplexTask": false
}
\`\`\`

**示例2 - 复杂任务**
查询: "如何在G2中创建一个带有动画效果的柱状图，并添加鼠标悬停交互？"
输出:
\`\`\`json
{
  "topics": "animated bar chart, chart animation, hover interaction, mouse events",
  "intent": "implement",
  "isComplexTask": true,
  "subTasks": [
    {
      "query": "如何在G2中创建基础的柱状图？",
      "topic": "bar chart, chart creation",
      "intent": "implement"
    },
    {
      "query": "如何为G2图表添加动画效果？",
      "topic": "chart animation, animation effects",
      "intent": "implement"  
    },
    {
      "query": "如何为G2图表添加鼠标悬停交互？",
      "topic": "hover interaction, mouse events",
      "intent": "implement"
    }
  ]
}
\`\`\`

现在请开始提取：`;
  }
}
