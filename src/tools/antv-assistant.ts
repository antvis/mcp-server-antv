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
 * AntV Professional Documentation Assistant
 *
 * Provides accurate and detailed visualization solutions based on official AntV documentation.
 * Suitable for all AntV-related follow-up queries and supplementary questions.
 * After initial queries, if users propose any AntV-related corrections, optimizations, supplements, or new requirements, this tool should be called.
 * Supports both simple queries and complex task processing, providing code examples and best practice recommendations. Covers the entire AntV ecosystem.
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
   * Get tool definition
   */
  getToolDefinition(): Tool {
    const tokenConfig = DEFAULT_CONFIG.context7.tokens;

    return {
      name: 'antv_assistant',
      description: `AntV Professional Documentation Assistant - Provides accurate and detailed visualization solutions based on official AntV documentation.
This is the core tool for handling all AntV technical issues, capable of providing professional documentation queries, code examples, and practical guidance.

When to use this tool:
- Handle structured AntV queries output by the topic_intent_extractor tool
- Any follow-up requirements or supplementary questions after initial AntV queries
- Need to modify, optimize, or adjust existing AntV visualization solutions
- Users request to add new features, change styles, or fix issues
- Extend, refactor, or optimize existing AntV code for performance
- Solve specific technical difficulties encountered during AntV implementation
- Users need more detailed code examples or implementation steps
- Debug AntV-related errors, exceptions, or unexpected behaviors
- Learn AntV best practices, design patterns, or advanced features
- Any technical consultation involving G2, G6, L7, X6, F2, S2
- Iterative requirement refinement during AntV usage
- Anytime users propose new AntV-related questions or modification requests in conversation

When NOT to explicitly declare usage:
- Users are already in AntV-related conversation context
- Users propose modifications to existing AntV solutions
- Users ask follow-up questions like "how else can this be optimized", "how to add XX feature"
- Users describe AntV-related issues that need resolution
- Natural continuation in conversation flow without requiring users to declare MCP usage again

Key features:
- Provides accurate and authoritative technical answers based on official AntV documentation
- Supports one-stop processing for both simple queries and complex tasks
- Provides complete code examples and step-by-step implementation guidance
- Covers G2 charts, G6 graph analysis, L7 geo-visualization, X6 graph editing, F2 mobile, S2 table analysis ecosystem
- Intelligently adapts to user technical level, providing solutions of appropriate difficulty
- Supports troubleshooting, performance optimization, and best practice guidance
- Handles continuous technical requirements in multi-turn conversations
- Automatically identifies and processes complex task subsequences
- Provides specialized guidance for different intents (learn/implement/solve)
- Supports mixed Chinese-English technical documentation retrieval and answers

Parameters explained:
- library: Specified AntV library type, intelligently identified based on user query
- query: User's specific technical question or requirement description
- topic: Technical topic keywords extracted from query for precise documentation retrieval
- intent: User intent type (learn/implement/solve)
- tokens: Content detail level control, adjustable based on requirements
- subTasks: Decomposed subtask list for complex tasks, supports batch processing`,
      inputSchema: {
        type: 'object',
        properties: {
          library: {
            type: 'string',
            enum: ['g2', 'g6', 'l7', 'x6', 'f2', 's2'],
            description: 'AntV library name',
          },
          query: {
            type: 'string',
            description: 'User query',
          },
          tokens: {
            type: 'number',
            minimum: tokenConfig.min,
            maximum: tokenConfig.max,
            default: tokenConfig.default,
            description: 'Maximum number of tokens for returned content',
          },
          topic: {
            type: 'string',
            description:
              'Extracted topic phrases (comma-separated), provided by topic_intent_extractor tool',
          },
          intent: {
            type: 'string',
            description:
              'Extracted user intent, provided by topic_intent_extractor tool',
          },
          subTasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Subtask query',
                },
                topic: {
                  type: 'string',
                  description: 'Subtask topic',
                },
              },
            },
            description:
              'Decomposed subtask list (optional, if provided will process these subtasks directly instead of internal decomposition)',
          },
        },
        required: ['library', 'query', 'topic', 'intent'],
      },
    };
  }

  /**
   * Execute tool
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

      // If subtasks are provided, it's a complex task
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
        // Simple task: direct query
        const { documentation, error: docError } =
          await this.context7Service.fetchLibraryDocumentation(
            libraryId,
            args.topic,
            args.tokens || DEFAULT_CONFIG.context7.tokens.default,
          );
        hasDocumentation =
          documentation !== null && documentation.trim() !== '';
        response = this.generateResponse(args, documentation, docError);
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
            text: `❌ Processing failed: ${
              error instanceof Error ? error.message : 'Unknown error'
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
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Handle complex tasks and check documentation retrieval status
   */
  private async handleComplexTaskWithDocCheck(
    args: AntVAssistantArgs,
    libraryId: string,
    subTasks: Array<{ query: string; topic: string; intent: string }>,
  ): Promise<{ response: string; hasDocumentation: boolean }> {
    const libraryConfig = getLibraryConfig(args.library);
    const library = libraryConfig.name;

    let response = `# ${library} Complex Task Response\n\n`;
    response += `**User Question**: ${args.query}\n`;
    response += `**Task Type**: Complex task (decomposed into ${subTasks.length} subtasks)\n`;
    response += `\n---\n\n`;

    // Limit tokens per subtask to avoid overly long responses
    const tokenPerSubTask = Math.min(
      Math.floor(
        (args.tokens || DEFAULT_CONFIG.context7.tokens.default) /
          subTasks.length,
      ),
      1000, // Maximum 1000 tokens per subtask
    );

    const subTaskPromises = subTasks.map(async (subTask, index) => {
      try {
        this.logger.info(
          `Processing subtask ${index + 1}/${subTasks.length}: ${
            subTask.topic
          }`,
        );

        const { documentation, error: docError } =
          await this.context7Service.fetchLibraryDocumentation(
            libraryId,
            subTask.topic,
            tokenPerSubTask,
          );

        return { task: subTask, documentation, error: docError };
      } catch (error) {
        this.logger.error(`Failed to process subtask ${index + 1}:`, error);
        return {
          task: subTask,
          documentation: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    const subTaskResults = await Promise.all(subTaskPromises);

    // Check if there's valid documentation
    const hasValidDocumentation = subTaskResults.some(
      (result) =>
        result.documentation !== null && result.documentation.trim() !== '',
    );

    // Generate subtask results
    for (const [index, result] of subTaskResults.entries()) {
      response += `## 📋 Subtask ${index + 1}\n\n`;
      response += `**Subtask Query**: ${result.task.query}\n`;
      response += `**Subtask Topic**: ${result.task.topic}\n\n`;

      if (result.documentation) {
        response += `${result.documentation}\n\n`;
      } else {
        response += `⚠️ Could not retrieve relevant documentation content\n\n`;
        if (result.error) {
          response += `\nError: ${result.error}\n`;
        } else {
          response += `\n`;
        }
        response += `\n`;
      }

      response += `---\n\n`;
    }

    // Generate summary and recommendations
    response += `## 🎯 Task Integration Recommendations\n\n`;
    response += this.generateComplexTaskSummary(args, subTaskResults);
    response += this.generateIntentSpecificGuidance(args.intent, library);

    // Add follow-up query guidance
    response += this.generateFollowUpGuidance();

    return { response, hasDocumentation: hasValidDocumentation };
  }

  /**
   * Generate complex task summary
   */
  private generateComplexTaskSummary(
    args: AntVAssistantArgs,
    subTaskResults: Array<{
      task: any;
      documentation: string | null;
      error: string | undefined;
    }>,
  ): string {
    const successCount = subTaskResults.filter((r) => r.documentation).length;
    const totalCount = subTaskResults.length;

    let summary = `Based on ${successCount}/${totalCount} subtask documentation query results:\n\n`;

    if (successCount === totalCount) {
      summary += `✅ **Complete Answer**: All subtasks found relevant documentation`;
    } else if (successCount > totalCount / 2) {
      summary += `⚠️ **Partial Answer**: Most subtasks found relevant documentation. Recommendations:\n\n`;
      summary += `1. Implement features with documentation support first\n`;
      summary += `2. For parts lacking documentation, consult official resources or example code\n`;
      summary += `3. Gradually improve solutions through practice\n\n`;
    } else {
      summary += `❌ **Insufficient Documentation**: Most subtasks lack documentation support. Recommendations:\n\n`;
      summary += `1. Refine query keywords\n`;
      summary += `2. Consult official documentation and examples\n`;
      summary += `3. Look for community resources and best practices\n\n`;
    }

    return summary;
  }

  /**
   * Validate input arguments
   */
  private validateArgs(args: AntVAssistantArgs): void {
    if (!args.library || !args.query?.trim()) {
      throw new Error('Missing required parameters: library and query');
    }

    if (!isValidLibrary(args.library)) {
      throw new Error(`Unsupported library: ${args.library}`);
    }

    if (args.topic && !args.intent) {
      throw new Error('Both topic and intent parameters are required');
    }
  }

  /**
   * Generate response content (simple task)
   */
  private generateResponse(
    args: AntVAssistantArgs,
    context: string | null,
    errorMsg?: string | undefined,
  ): string {
    const libraryConfig = getLibraryConfig(args.library);
    const library = libraryConfig.name;

    let response = `# ${library} Q&A\n\n`;
    response += `**User Question**: ${args.query}\n`;
    response += `**Search Topic**: ${args.topic}\n`;
    response += `\n---\n\n`;

    if (context) {
      response += `## 📚 Related Documentation\n\n${context}\n\n`;
      response += this.generateIntentSpecificGuidance(args.intent, library);
    } else {
      response += `## ⚠️ Documentation Retrieval Failed\n\n`;
      response += `\nError: ${errorMsg}\n`;
      response += `Could not retrieve relevant documentation content. Recommendations:\n`;
      response += `1. Check if search topics are accurate\n`;
      response += `2. Try using more specific technical terms\n`;
      response += `3. Refer to ${library} official documentation\n`;
    }

    // Add follow-up query guidance
    response += this.generateFollowUpGuidance();

    return response;
  }

  /**
   * Generate specific guidance based on intent
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
    return `## 💡 Learning Recommendations

- First understand the core concepts and basic usage in the documentation
- Run example code to observe effects and parameter functions
- Start with simple examples, gradually try complex features
- Consult official documentation when encountering problems

`;
  }

  private generateImplementGuidance(library: string): string {
    return `## 🛠️ Implementation Recommendations

- Refer to example code in the documentation
- Pay attention to required and optional parameter configurations
- Implement basic features first, then add advanced features
- Don't over-optimize, focus on user requirements
- Merge multiple examples into one final solution with only core functionality
`;
  }

  private generateSolveGuidance(library: string): string {
    return `## 🔧 Troubleshooting

- Check error messages and parameter configurations
- Compare your code with documentation examples for differences
- Confirm ${library} version and dependency compatibility
- If problems persist, check official GitHub Issues

`;
  }

  private generateDefaultGuidance(library: string): string {
    return `## 📖 Usage Recommendations

- Carefully read the above documentation content
- Practice with reference to code examples
- Adjust relevant parameters according to requirements
- Consult ${library} official documentation for more information

`;
  }

  /**
   * Generate follow-up query guidance to ensure AI assistant calls tools for subsequent AntV-related queries
   */
  private generateFollowUpGuidance(): string {
    return `
---

## 🔄 Important Notice

**For subsequent AntV-related queries, please note:**
- If users propose any requests for modifications, optimizations, or adding features, please use \`antv_assistant\` tool to query latest documentation
- If users propose new AntV technical questions, please first use \`topic_intent_extractor\` tool for analysis, then use \`antv_assistant\` tool
- Don't modify code directly without querying documentation, ensure providing accurate solutions based on official documentation
- Maintain accuracy of AntV best practices and latest APIs

`;
  }
}
