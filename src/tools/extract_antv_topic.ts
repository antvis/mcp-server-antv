/**
 * AntV Topic Extraction Tool - Preprocesses user queries for AntV libraries
 */
import { z } from 'zod';
import type { AntVLibrary } from '../types';
import { logger } from '../utils';
import {
  getLibraryConfig,
  getLibraryKeywords,
  ANTV_LIBRARY_META,
} from '../constant';

const ExtractAntVTopicInputSchema = z.object({
  query: z
    .string()
    .min(1, 'Query content cannot be empty')
    .trim()
    .refine((val) => val.length > 0, {
      message: 'Query content cannot be empty after trimming',
    })
    .describe('User specific question or requirement description'),
  library: z
    .enum(Object.keys(ANTV_LIBRARY_META) as [AntVLibrary, ...AntVLibrary[]], {
      errorMap: () => ({
        message: `Unsupported library. Must be one of: ${Object.keys(ANTV_LIBRARY_META).join(', ')}`,
      }),
    })
    .optional()
    .describe(
      'AntV library name (optional) - If not specified, tool will automatically detect project dependencies and intelligently recommend',
    ),
  maxTopics: z
    .number()
    .int('MaxTopics must be an integer')
    .min(3, 'MaxTopics must be at least 3')
    .max(8, 'MaxTopics cannot exceed 8')
    .default(5)
    .describe(
      'Maximum number of extracted topic keywords, default 5, can be increased appropriately for complex tasks',
    ),
});

interface ExtractAntVTopicArgs {
  query: string;
  library?: AntVLibrary;
  maxTopics: number;
}

function generateExtractionPrompt(args: ExtractAntVTopicArgs): string {
  const { query, library, maxTopics } = args;

  // Generate library mappings
  const libraryMappings = Object.values(ANTV_LIBRARY_META)
    .map((lib) => `   - **${lib.name} (${lib.id})**: ${lib.description}`)
    .join('\n');

  // Get library-specific context if specified
  const libraryContext = library
    ? {
        name: getLibraryConfig(library).name,
        keywords: getLibraryKeywords(library),
      }
    : null;

  const libraryTerminology = libraryContext
    ? libraryContext.keywords
    : 'Use the terminology and components specific to the determined target library';

  return `# AntV Query Analysis & Topic Extraction

## User Query
**Query**: ${query}
**Max Topics**: ${maxTopics}
${library ? `**Specified Library**: ${getLibraryConfig(library).name} (${library})` : '**Library**: Auto-detect'}

## Task Instructions

### Phase 1: Library Detection ${library ? '(Skipped - Library Specified)' : ''}
${
  library
    ? `Using specified library: **${getLibraryConfig(library).name} (${library})**`
    : `**Determine the most suitable AntV library:**

Available Libraries:
${libraryMappings}

**Selection Priority:**
1. Match query intent with library purpose
2. Check for existing project dependencies
3. Consider common use cases for the query type`
}

### Phase 2: Topic Extraction & Analysis

**Extract up to ${maxTopics} key technical topics covering ALL aspects mentioned:**
- Extract only from user query content, no additional concepts
- Use official AntV English terminology${libraryContext ? `: ${libraryContext.keywords}` : ''}
- Format as meaningful phrases (1-4 words), output in English only
- **Cover these technical aspects in priority order**:
  1. Chart types and core components
  2. Visual styling (colors, thickness, backgrounds, opacity)
  3. Interactions (hover, click, tooltip, zoom)
  4. Configurations (data processing, scales, axis, animations)

**Determine User Intent:**
Based on the tone and content of the query, select the most matching intent:
- **implement**: Creating new functionality, implementing features, code examples, configuration setup
- **solve**: Fixing problems, troubleshooting errors, resolving styling issues, debugging functionality（If uncertain, default to solve.）

**Critical Identification Rules:**
- **solve** intent: Query asks "how to configure/set/modify/change" existing features, styling properties, or visual attributes (colors, borders, fonts, sizes, positions)
  - Examples: "怎么配置堆叠面积图的描边为不同的颜色", "坐标轴文本样式怎么修改", "怎么设置折线图的颜色"
  - Key patterns: "怎么/如何/为什么"
- **implement** intent: Query asks "create/build/implement" new charts, components, or functionality
  - Examples: "创建一个柱状图", "写一个", "实现"
  - Key patterns: "创建/实现/添加/构建/改成/修改"

**Additional Classification Examples:**
- **solve**: "tooltip不显示怎么办", "图表渲染不出来", "颜色显示不正确", "数据格式错误", "点击事件没反应"
- **implement**: "帮我写一个饼图", "实现拖拽功能", "添加一个图例", "创建一个仪表盘"

**Assess Task Complexity:**
Determine if the query is complex based on:
- Extracted topics exceed 5
- Involves more than 2 components or features
- Other cases where the query appears complex based on overall assessment (e.g., multi-step processes, combinations of features)


If complex, decompose into 2-4 subtasks, each subtask should:
- Focus on a specific technical point or functionality
- Be able to independently obtain answers through documentation queries
- Be arranged in logical order (basic → advanced)
- Subtask topics must be clear, concise, and follow the format requirements above

### Phase 3: Output Format

**For Simple Tasks:**
\`\`\`json
{
  "library": "detected_or_specified_library",
  "topic": "topic1, topic2, topic3",
  "intent": "implement|solve",
  "isComplexTask": false
}
\`\`\`

**For Complex Tasks:**
\`\`\`json
{
  "library": "detected_or_specified_library",
  "topic": "overall_topic_summary",
  "intent": "overall_intent",
  "isComplexTask": true,
  "subTasks": [
    {
      "query": "specific_subtask_question_1",
      "topic": "subtask_topic_1"
    },
    {
      "query": "specific_subtask_question_2",
      "topic": "subtask_topic_2"
    }
  ]
}
\`\`\`

**Analyze the query and provide the structured output above.**

## Important Notice
**MANDATORY NEXT STEP**: After completing this task, immediately call the \`query_antv_document\` tool with the extracted parameters.
`;
}

export const ExtractAntVTopicTool = {
  name: 'extract_antv_topic',
  description: `AntV Intelligent Assistant Preprocessing Tool - Specifically designed to handle any user queries related to AntV visualization libraries.
  This tool is the first step in processing AntV technology stack issues, responsible for intelligently identifying, parsing, and structuring user visualization requirements.

**MANDATORY: Must be called for ANY new AntV-related queries, including simple questions. Always precedes query_antv_document tool.**

When to use this tool:
- **AntV-related queries**: Questions about ${Object.keys(ANTV_LIBRARY_META).join('/')} libraries.
- **Visualization tasks**: Creating charts, graphs, maps, or other visualizations.
- **Problem solving**: Debugging errors, performance issues, or compatibility problems.
- **Learning & implementation**: Understanding concepts or requesting code examples.

Key features:
- **Smart Library Detection**: Scans installed AntV libraries and recommends the best fit based on query and project dependencies.
- **Topic & Intent Extraction**: Intelligently extracts technical topics and determines user intent (implement/solve).
- **Task Complexity Handling**: Detects complex tasks and decomposes them into manageable subtasks.
- **Seamless Integration**: Prepares structured data for the query_antv_document tool to provide precise solutions.`,
  inputSchema: ExtractAntVTopicInputSchema,
  async run(args: ExtractAntVTopicArgs) {
    const startTime = Date.now();
    try {
      const extractionPrompt = generateExtractionPrompt(args);
      const processingTime = Date.now() - startTime;

      return {
        content: [
          {
            type: 'text',
            text: extractionPrompt,
          },
        ],
        _meta: {
          query: args.query, // Original user query for next tool
          topic: '', // Will be filled by LLM
          intent: '', // Will be filled by LLM
          library: args.library || 'auto-detect',
          maxTopics: args.maxTopics,
          promptGenerated: true,
          next_tools: ['query_antv_document'],
          isComplexTask: false, // Will be determined and filled by LLM
          subTasks: [], // If complex task, will be filled with subtasks by LLM
          processingTime,
        },
      };
    } catch (error) {
      logger.error('Failed to generate extraction prompt:', error);
      const processingTime = Date.now() - startTime;

      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to generate extraction task: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          },
        ],
        isError: true,
        _meta: {
          query: args.query, // Original user query for next tool
          topic: '',
          intent: '',
          library: args.library || 'auto-detect',
          maxTopics: args.maxTopics,
          promptGenerated: false,
          next_tools: ['query_antv_document'],
          isComplexTask: false,
          subTasks: [],
          processingTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },
};
