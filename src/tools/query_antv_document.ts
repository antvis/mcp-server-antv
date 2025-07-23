/**
 * AntV Documentation Query Tool - Provides visualization solutions from official docs
 */
import { z } from 'zod';
import type { AntVLibrary } from '../types';
import { logger, getLibraryId, fetchLibraryDocumentation } from '../utils';
import {
  getLibraryConfig,
  ANTV_LIBRARY_META,
  CONTEXT7_TOKENS,
} from '../constant';

const QueryAntVDocumentInputSchema = z.object({
  library: z
    .enum(Object.keys(ANTV_LIBRARY_META) as [AntVLibrary, ...AntVLibrary[]])
    .describe(
      'Specified AntV library type, intelligently identified based on user query',
    ),
  query: z
    .string()
    .min(1)
    .describe('User specific question or requirement description'),
  topic: z
    .string()
    .min(1)
    .describe(
      'Technical topic keywords (comma-separated). Provided by `extract_antv_topic` or directly extracted from simple questions.',
    ),
  intent: z
    .string()
    .min(1)
    .describe(
      'Extracted user intent, provided by extract_antv_topic tool or directly extracted from simple questions.',
    ),
  tokens: z
    .number()
    .int()
    .min(CONTEXT7_TOKENS.min)
    .max(CONTEXT7_TOKENS.max)
    .default(CONTEXT7_TOKENS.default)
    .describe('tokens for returned content'),
  subTasks: z
    .array(
      z.object({
        query: z.string().min(1).describe('Subtask query'),
        topic: z.string().min(1).describe('Subtask topic'),
      }),
    )
    .optional()
    .describe(
      'Decomposed subtask list for complex tasks, supports batch processing',
    ),
});

type QueryAntVDocumentArgs = z.infer<typeof QueryAntVDocumentInputSchema>;

async function handleComplexTask(
  args: QueryAntVDocumentArgs,
  libraryId: string,
  subTasks: Array<{ query: string; topic: string }>,
): Promise<{ response: string; hasDocumentation: boolean }> {
  const libraryConfig = getLibraryConfig(args.library);
  const tokenPerSubTask = Math.min(
    Math.floor(args.tokens / subTasks.length),
    1000,
  );

  let response = `# ${libraryConfig.name} Complex Task Solution\n\n`;
  response += `**Question**: ${args.query}\n`;
  response += `**Complexity**: Decomposed into ${subTasks.length} subtasks\n\n---\n\n`;

  const subTaskPromises = subTasks.map(async (subTask, index) => {
    try {
      logger.info(
        `Processing subtask ${index + 1}/${subTasks.length}: ${subTask.topic}`,
      );
      const { documentation, error } = await fetchLibraryDocumentation(
        libraryId,
        subTask.topic,
        tokenPerSubTask,
      );
      return { task: subTask, documentation, error };
    } catch (error) {
      logger.error(`Failed to process subtask ${index + 1}:`, error);
      return {
        task: subTask,
        documentation: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const results = await Promise.all(subTaskPromises);
  const hasDocumentation = results.some(
    (r) => r.documentation !== null && r.documentation.trim() !== '',
  );

  // Generate subtask responses
  for (const [index, result] of results.entries()) {
    response += `## 📋 Subtask ${index + 1}: ${result.task.query}\n\n`;
    response += `**Subtask Topic**: ${result.task.topic}\n\n`;
    if (result.documentation) {
      response += `${result.documentation}\n\n`;
    } else {
      response += `⚠️ No relevant documentation found for this subtask.\n`;
      if (result.error) {
        response += `Error: ${result.error}\n`;
      }
    }
    response += `---\n\n`;
  }

  // Add integration summary
  const successCount = results.filter((r) => r.documentation).length;
  response += `## 🎯 Integration Summary\n\n`;

  if (successCount === results.length) {
    response += `✅ **Complete Solution**: Found documentation for all ${successCount} subtasks.\n\n`;
    response += `**Next Steps**: Combine the solutions above into your implementation.\n\n`;
  } else if (successCount > 0) {
    response += `⚠️ **Partial Solution**: Found documentation for ${successCount}/${results.length} subtasks.\n\n`;
    response += `**Recommendations**:\n`;
    response += `- Implement features with available documentation first\n`;
    response += `- For missing parts, check official examples or community resources\n\n`;
  } else {
    response += `❌ **Limited Results**: No documentation found for the subtasks.\n\n`;
    response += `**Suggestions**:\n`;
    response += `- Try refining the query with more specific keywords\n`;
    response += `- Check the official ${libraryConfig.name} documentation directly\n\n`;
  }

  response += generateImplementationGuidance(args.intent, args.library);
  response += generateFollowUpNotice();

  return { response, hasDocumentation };
}

function generateSimpleResponse(
  args: QueryAntVDocumentArgs,
  documentation: string | null,
  error?: string,
): string {
  const libraryConfig = getLibraryConfig(args.library);

  if (!documentation) {
    return (
      `# ${libraryConfig.name} Query Result\n\n` +
      `**Question**: ${args.query}\n\n` +
      `❌ **No Documentation Found**\n\n` +
      `${error ? `Error: ${error}\n\n` : ''}` +
      `**Suggestions**:\n` +
      `- Try refining your search terms\n` +
      `- Check the official ${libraryConfig.name} documentation\n` +
      `- Ensure you're using the correct library for your use case\n\n` +
      generateFollowUpNotice()
    );
  }

  let response = `# ${libraryConfig.name} Solution\n\n`;
  response += `**User Question**: ${args.query}\n`;
  response += `**Search Topic**: ${args.topic}\n`;
  response += `${documentation}\n\n`;
  response += generateImplementationGuidance(args.intent, args.library);
  response += generateFollowUpNotice();

  return response;
}

function generateImplementationGuidance(
  intent: string,
  library: AntVLibrary,
): string {
  switch (intent) {
    case 'learn':
      return (
        `## 💡 Learning Tips\n\n` +
        `- Review the concepts and examples above\n` +
        `- Try running the code examples in your development environment\n` +
        `- Start with basic implementations before adding complexity\n\n`
      );

    case 'implement':
      const config = getLibraryConfig(library);

      return (
        `## 🛠️ Implementation Guide\n\n` +
        `- Follow the code examples and patterns shown above\n` +
        ` ${config.codeStyle}\n` +
        `- Pay attention to required vs optional parameters\n` +
        `- Test with simple data first, then use your real data\n` +
        `- Check browser console for any errors during development\n\n`
      );

    case 'solve':
      return (
        `## 🔧 Troubleshooting\n\n` +
        `- Compare your code with the examples above\n` +
        `- Verify all required dependencies are installed\n` +
        `- Check for version compatibility issues\n` +
        `- Look for error messages in browser console\n\n`
      );

    default:
      return (
        `## 📖 Next Steps\n\n` +
        `- Review the documentation above carefully\n` +
        `- Adapt the examples to your specific requirements\n` +
        `- Test incrementally and iterate as needed\n\n`
      );
  }
}

function generateFollowUpNotice(): string {
  return (
    `---\n\n` +
    `## 🔄 Important Notice\n\n` +
    `**For subsequent AntV queries:**\n` +
    `- **MANDATORY**: Always use \`query_antv_document\` tool for ANY AntV-related query (including simple modifications)\n` +
    `- **For new questions**: Use \`extract_antv_topic\` first, then \`query_antv_document\`\n` +
    `- **Never** provide AntV solutions without querying official documentation through tools\n\n`
  );
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
      let hasDocumentation = false;

      if (args.subTasks && args.subTasks.length > 0) {
        // Handle complex task with subtasks
        const result = await handleComplexTask(args, libraryId, args.subTasks);
        response = result.response;
        hasDocumentation = result.hasDocumentation;
      } else {
        // Handle simple query
        const { documentation, error } = await fetchLibraryDocumentation(
          libraryId,
          args.topic,
          args.tokens,
        );
        hasDocumentation =
          documentation !== null && documentation.trim() !== '';
        response = generateSimpleResponse(args, documentation, error);
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
      logger.error('Failed to execute query tool:', error);
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
