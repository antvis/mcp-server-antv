import { z } from 'zod';
import type { AntVAssistantArgs } from '../types';
import { Logger, LogLevel, Context7Service } from '../utils';
import {
  getLibraryConfig,
  isValidLibrary,
  DEFAULT_CONFIG,
} from '../constant';

/**
 * AntV Professional Documentation Assistant
 *
 * Provides accurate and detailed visualization solutions based on official AntV documentation.
 * Suitable for all AntV-related follow-up queries and supplementary questions.
 * After initial queries, if users propose any AntV-related corrections, optimizations, supplements, or new requirements, this tool should be called.
 * Supports both simple queries and complex task processing, providing code examples and best practice recommendations. Covers the entire AntV ecosystem.
 */
const context7Service = new Context7Service({
  logLevel: LogLevel.WARN,
});
const logger = new Logger({
  level: LogLevel.INFO,
  prefix: 'AntVAssistant',
});

const tokenConfig = DEFAULT_CONFIG.context7.tokens;

function validateArgs(args: { [x: string]: any }): void {
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

async function handleComplexTaskWithDocCheck(
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
  const tokenPerSubTask = Math.min(
    Math.floor(
      (args.tokens || DEFAULT_CONFIG.context7.tokens.default) / subTasks.length,
    ),
    1000,
  );
  const subTaskPromises = subTasks.map(async (subTask, index) => {
    try {
      logger.info(
        `Processing subtask ${index + 1}/${subTasks.length}: ${subTask.topic}`,
      );
      const { documentation, error: docError } =
        await context7Service.fetchLibraryDocumentation(
          libraryId,
          subTask.topic,
          tokenPerSubTask,
        );
      return { task: subTask, documentation, error: docError };
    } catch (error) {
      logger.error(`Failed to process subtask ${index + 1}:`, error);
      return {
        task: subTask,
        documentation: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  const subTaskResults = await Promise.all(subTaskPromises);
  const hasValidDocumentation = subTaskResults.some(
    (result) =>
      result.documentation !== null && result.documentation.trim() !== '',
  );
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
  response += `## 🎯 Task Integration Recommendations\n\n`;
  response += generateComplexTaskSummary(args, subTaskResults);
  response += generateIntentSpecificGuidance(args.intent, library);
  response += generateFollowUpGuidance();
  return { response, hasDocumentation: hasValidDocumentation };
}

function generateComplexTaskSummary(
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

function generateResponse(
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
    response += generateIntentSpecificGuidance(args.intent, library);
  } else {
    response += `## ⚠️ Documentation Retrieval Failed\n\n`;
    response += `\nError: ${errorMsg}\n`;
    response += `Could not retrieve relevant documentation content. Recommendations:\n`;
    response += `1. Check if search topics are accurate\n`;
    response += `2. Try using more specific technical terms\n`;
    response += `3. Refer to ${library} official documentation\n`;
  }
  response += generateFollowUpGuidance();
  return response;
}

function generateIntentSpecificGuidance(
  intent: string,
  library: string,
): string {
  switch (intent) {
    case 'learn':
      return generateLearnGuidance(library);
    case 'implement':
      return generateImplementGuidance(library);
    case 'solve':
      return generateSolveGuidance(library);
    default:
      return generateDefaultGuidance(library);
  }
}

function generateLearnGuidance(library: string): string {
  return `## 💡 Learning Recommendations

- First understand the core concepts and basic usage in the documentation
- Run example code to observe effects and parameter functions
- Start with simple examples, gradually try complex features
- Consult official documentation when encountering problems

`;
}
function generateImplementGuidance(library: string): string {
  return `## 🛠️ Implementation Recommendations

- Refer to example code in the documentation
- Pay attention to required and optional parameter configurations
- Implement basic features first, then add advanced features
- Don't over-optimize, focus on user requirements
- Merge multiple examples into one final solution with only core functionality
`;
}
function generateSolveGuidance(library: string): string {
  return `## 🔧 Troubleshooting

- Check error messages and parameter configurations
- Compare your code with documentation examples for differences
- Confirm ${library} version and dependency compatibility
- If problems persist, check official GitHub Issues

`;
}
function generateDefaultGuidance(library: string): string {
  return `## 📖 Usage Recommendations

- Carefully read the above documentation content
- Practice with reference to code examples
- Adjust relevant parameters according to requirements
- Consult ${library} official documentation for more information

`;
}
function generateFollowUpGuidance(): string {
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

export const AntVAssistantTool = {
  name: 'antv_assistant',
  description: `AntV Context Retrieval Assistant - Fetches relevant documentation, code examples, and best practices from official AntV resources. Supports G2, G6, L7, X6, F2, and S2 libraries, and handles subtasks iterative queries.
  When to use this tool:
  - **Initial Queries**: For structured AntV questions (e.g., API usage, configuration) or output from topic_intent_extractor.
  - **Implementation & Optimization**: To implement new features, modify styles, refactor code, or optimize performance in AntV solutions.
  - **Debugging & Problem Solving**: For troubleshooting errors, unexpected behaviors, or technical challenges in AntV projects.
  - **Learning & Best Practices**: To explore official documentation, code examples, design patterns, or advanced features.
  - **Complex Task Handling**: For multi-step tasks requiring subtask decomposition (e.g., "Build a dashboard with interactive charts").
  When NOT to explicitly declare usage:
  - **Existing Context & Simple Tasks**:
    - Already in AntV-related conversation (e.g., continuing from a previous query).
    - Direct modifications to existing solutions (e.g., "Change the chart's color").
    - Simple queries requiring no decomposition (e.g., "How to update the legend position?").
  - **Follow-up Actions**: Users ask optimization or feature-related follow-ups (e.g., "How to add animations?").
  - **Natural Continuation**: Issues or conversations extending naturally without explicit tool calls.`,
  inputSchema: z.object({
    library: z
      .enum(['g2', 'g6', 'l7', 'x6', 'f2', 's2'])
      .describe(
        'Specified AntV library type, intelligently identified based on user query',
      ),
    query: z
      .string()
      .describe('User specific question or requirement description'),
    tokens: z
      .number()
      .min(tokenConfig.min)
      .max(tokenConfig.max)
      .default(tokenConfig.default)
      .describe('tokens for returned content'),
    topic: z
      .string()
      .describe(
        'Technical topic keywords (comma-separated). Provided by `topic_intent_extractor` or directly extracted from simple questions.',
      ),
    intent: z
      .string()
      .describe(
        'Extracted user intent, provided by topic_intent_extractor tool or directly extracted from simple questions.',
      ),
    subTasks: z
      .array(
        z.object({
          query: z.string().describe('Subtask query'),
          topic: z.string().describe('Subtask topic'),
        }),
      )
      .describe(
        'Decomposed subtask list for complex tasks, supports batch processing',
      )
      .optional(),
  }),
  async run(args: AntVAssistantArgs) {
    const startTime = Date.now();
    try {
      validateArgs(args);
      const libraryId = context7Service.getLibraryId(args.library);
      let response: string;
      let subTaskResults: any[] = [];
      let isComplexTask = false;
      let hasDocumentation = false;
      if (args.subTasks && args.subTasks.length > 0) {
        isComplexTask = true;
        const { response: taskResponse, hasDocumentation: taskHasDoc } =
          await handleComplexTaskWithDocCheck(args, libraryId, args.subTasks);
        response = taskResponse;
        hasDocumentation = taskHasDoc;
        subTaskResults = args.subTasks;
      } else {
        const { documentation, error: docError } =
          await context7Service.fetchLibraryDocumentation(
            libraryId,
            args.topic,
            args.tokens || DEFAULT_CONFIG.context7.tokens.default,
          );
        hasDocumentation =
          documentation !== null && documentation.trim() !== '';
        response = generateResponse(args, documentation, docError);
      }
      const processingTime = Date.now() - startTime;
      return {
        content: [{ type: 'text', text: response }],
        _meta: {
          topics: args.topic.split(',').map((t) => t.trim()),
          intent: args.intent,
          library: args.library,
          hasDocumentation,
          processingTime,
        },
      };
    } catch (error) {
      logger.error('Failed to execute assistant tool:', error);
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
        _meta: {
          topics: args.topic ? args.topic.split(',').map((t) => t.trim()) : [],
          intent: args.intent,
          library: args.library,
          hasDocumentation: false,
          processingTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },
};
