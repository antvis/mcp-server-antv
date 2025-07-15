/**
 * AntV Professional Documentation Assistant
 *
 * Provides accurate and detailed visualization solutions based on official AntV documentation.
 * Suitable for all AntV-related follow-up queries and supplementary questions.
 * After initial queries, if users propose any AntV-related corrections, optimizations, supplements, or new requirements, this tool should be called.
 * Supports both simple queries and complex task processing, providing code examples and best practice recommendations. Covers the entire AntV ecosystem.
 */

import { z } from 'zod';
import type { AntVConfig, AntVLibrary } from '../types';
import { logger, getLibraryId, fetchLibraryDocumentation } from '../utils';
import {
  getLibraryConfig,
  ANTV_LIBRARY_META,
  CONTEXT7_TOKENS,
} from '../constant';

type QueryAntVDocumentArgs = {
  library: AntVLibrary;
  query: string;
  tokens: number;
  topic: string;
  intent: string;
  subTasks?: Array<{
    query: string;
    topic: string;
  }>;
};

const QueryAntVDocumentInputSchema = z.object({
  library: z
    .enum(
      Object.keys(ANTV_LIBRARY_META) as [
        keyof typeof ANTV_LIBRARY_META,
        ...Array<keyof typeof ANTV_LIBRARY_META>,
      ],
      {
        errorMap: () => ({
          message: `Unsupported library. Must be one of: ${Object.keys(ANTV_LIBRARY_META).join(', ')}`,
        }),
      },
    )
    .describe(
      'Specified AntV library type, intelligently identified based on user query',
    ),
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .trim()
    .describe('User specific question or requirement description'),
  tokens: z
    .number()
    .int('Tokens must be an integer')
    .min(CONTEXT7_TOKENS.min, `Tokens must be at least ${CONTEXT7_TOKENS.min}`)
    .max(CONTEXT7_TOKENS.max, `Tokens cannot exceed ${CONTEXT7_TOKENS.max}`)
    .default(CONTEXT7_TOKENS.default)
    .describe('tokens for returned content'),
  topic: z
    .string()
    .min(1, 'Topic cannot be empty')
    .trim()
    .describe(
      'Technical topic keywords (comma-separated). Provided by `extract_antv_topic` or directly extracted from simple questions.',
    ),
  intent: z
    .string()
    .min(1, 'Intent cannot be empty')
    .trim()
    .describe(
      'Extracted user intent, provided by extract_antv_topic tool or directly extracted from simple questions.',
    ),
  subTasks: z
    .array(
      z.object({
        query: z
          .string()
          .min(1, 'Subtask query cannot be empty')
          .trim()
          .describe('Subtask query'),
        topic: z
          .string()
          .min(1, 'Subtask topic cannot be empty')
          .trim()
          .describe('Subtask topic'),
      }),
    )
    .describe(
      'Decomposed subtask list for complex tasks, supports batch processing',
    )
    .optional(),
});

async function handleComplexTaskWithDocCheck(
  args: QueryAntVDocumentArgs,
  libraryId: string,
  subTasks: Array<{ query: string; topic: string }>,
): Promise<{ response: string; hasDocumentation: boolean }> {
  const libraryConfig = getLibraryConfig(args.library);
  const library = libraryConfig.name;
  let response = `# ${library} Complex Task Response\n\n`;
  response += `**User Question**: ${args.query}\n`;
  response += `**Task Type**: Complex task (decomposed into ${subTasks.length} subtasks)\n`;
  response += `\n---\n\n`;
  const tokenPerSubTask = Math.min(
    Math.floor(args.tokens / subTasks.length),
    1000,
  );
  const subTaskPromises = subTasks.map(async (subTask, index) => {
    try {
      logger.info(
        `Processing subtask ${index + 1}/${subTasks.length}: ${subTask.topic}`,
      );
      const { documentation, error: docError } =
        await fetchLibraryDocumentation(
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
  response += generateComplexTaskSummary(subTaskResults);
  response += generateIntentSpecificGuidance(args.intent, libraryConfig);
  response += generateFollowUpGuidance();
  return { response, hasDocumentation: hasValidDocumentation };
}

function generateComplexTaskSummary(
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
  args: QueryAntVDocumentArgs,
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
    response += generateIntentSpecificGuidance(args.intent, libraryConfig);
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
  libraryConfig: AntVConfig,
): string {
  switch (intent) {
    case 'learn':
      return generateLearnGuidance();
    case 'implement':
      return generateImplementGuidance(libraryConfig);
    case 'solve':
      return generateSolveGuidance(libraryConfig);
    default:
      return generateDefaultGuidance(libraryConfig);
  }
}

function generateLearnGuidance(): string {
  return `## 💡 Learning Recommendations

- First understand the core concepts and basic usage in the documentation
- Run example code to observe effects and parameter functions
- Start with simple examples, gradually try complex features
- Consult official documentation when encountering problems

`;
}

function generateImplementGuidance(libraryConfig: AntVConfig): string {
  return `## 🛠️ Implementation Recommendations
- Follow the code style and best practices of the library: ${libraryConfig.codeStyle}
- Refer to example code in the documentation
- Pay attention to required and optional parameter configurations
- Implement basic features first, then add advanced features
- Don't over-optimize, focus on user requirements
- Merge multiple examples into one final solution with only core functionality
`;
}

function generateSolveGuidance(libraryConfig: AntVConfig): string {
  return `## 🔧 Troubleshooting

- Check error messages and parameter configurations
- Compare your code with documentation examples for differences
- Confirm ${libraryConfig.name} version and dependency compatibility
- If problems persist, check official GitHub Issues

`;
}

function generateDefaultGuidance(libraryConfig: AntVConfig): string {
  return `## 📖 Usage Recommendations

- Carefully read the above documentation content
- Practice with reference to code examples
- Adjust relevant parameters according to requirements
- Consult ${libraryConfig.name} official documentation for more information

`;
}

function generateFollowUpGuidance(): string {
  return `

---

## 🔄 Important Notice

**For subsequent AntV queries:**
- **MANDATORY**: Always use \`query_antv_document\` tool for ANY AntV-related query (including simple modifications)
- **For new questions**: Use \`extract_antv_topic\` first, then \`query_antv_document\`
- **Never** provide AntV solutions without querying official documentation through tools

`;
}

export const QueryAntVDocumentTool = {
  name: 'query_antv_document',
  description: `AntV Context Retrieval Assistant - Fetches relevant documentation, code examples, and best practices from official AntV resources. Supports ${Object.keys(ANTV_LIBRARY_META).join(', ')} libraries, and handles subtasks iterative queries.

**MANDATORY: Must be called for ANY AntV-related query (${Object.keys(ANTV_LIBRARY_META).join(', ')}), regardless of task complexity. No exceptions for simple tasks.**

When to use this tool:
- **Implementation & Optimization**: To implement new features, modify styles, refactor code, or optimize performance in AntV solutions.
- **Debugging & Problem Solving**: For troubleshooting errors, unexpected behaviors, or technical challenges in AntV projects.
- **Learning & Best Practices**: To explore official documentation, code examples, design patterns, or advanced features.
- **Complex Task Handling**: For multi-step tasks requiring subtask decomposition (e.g., "Build a dashboard with interactive charts").
- **Simple modifications**: Even basic changes like "Change the chart's color" or "Update legend position" in AntV context.`,
  inputSchema: QueryAntVDocumentInputSchema,
  async run(args: QueryAntVDocumentArgs) {
    const startTime = Date.now();
    try {
      const libraryId = getLibraryId(args.library);
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
          await fetchLibraryDocumentation(libraryId, args.topic, args.tokens);
        hasDocumentation =
          documentation !== null && documentation.trim() !== '';
        response = generateResponse(args, documentation, docError);
      }
      const processingTime = Date.now() - startTime;
      return {
        content: [{ type: 'text', text: response }],
        _meta: {
          topic: args.topic.split(',').map((t: string) => t.trim()),
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
          topic: args.topic ? args.topic.split(',').map((t) => t.trim()) : [],
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
