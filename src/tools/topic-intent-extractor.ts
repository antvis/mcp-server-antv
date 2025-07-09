/**
 * AntV Intelligent Assistant Preprocessing Tool
 *
 * 处理所有与 AntV 可视化库相关的用户查询，智能识别、解析并结构化用户需求。
 * 支持自动识别库类型、提取技术主题关键词、判断用户意图，并为后续 antv_assistant 工具准备结构化信息。
 */

import { z } from 'zod';
import type { AntVLibrary } from '../types';
import { logger } from '../utils';
import {
  getLibraryConfig,
  getLibraryKeywords,
  ANTV_LIBRARY_META,
} from '../constant';

const TopicIntentExtractorInputSchema = z.object({
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

interface TopicIntentExtractorArgs {
  query: string;
  library?: AntVLibrary;
  maxTopics: number;
}

function generateExtractionPrompt(
  args: TopicIntentExtractorArgs,
): string {
  const libraryContext = args.library
    ? getLibraryConfig(args.library)
    : undefined;
  return generateUnifiedPrompt(args.query, args.maxTopics, libraryContext);
}

function generateUnifiedPrompt(
  query: string,
  maxTopics: number,
  libraryContext?: { id: AntVLibrary; name: string },
): string {
  const isLibrarySpecified = !!libraryContext;
  const allLibraries = Object.values(ANTV_LIBRARY_META);
  const libraryDeterminationSection = isLibrarySpecified
    ? generateLibrarySpecifiedSection(libraryContext)
    : generateLibraryDetectionSection(allLibraries);
  const extractionRulesSection = generateExtractionRulesSection(
    maxTopics,
    libraryContext,
  );
  const outputFormatSection = generateOutputFormatSection();
  const examplesSection = generateExamplesSection();
  return `# AntV ${isLibrarySpecified ? 'Topic and Intent Extraction' : 'Smart Library Detection and Topic Extraction'} Task

## Task Objective
${
  isLibrarySpecified
    ? `Extract the most relevant technical topic phrases and user intent from user queries for ${libraryContext.name} documentation retrieval.`
    : `1. First: Detect and recommend the most suitable AntV library based on query intent and installed dependencies
    2. Second: Extract relevant technical topics and user intent for the determined library`
}

## User Query
\`\`\`
${query}
\`\`\`

${libraryDeterminationSection}

${extractionRulesSection}

## Output Format

${outputFormatSection}

## Examples

${examplesSection}

Now please begin ${isLibrarySpecified ? 'extraction' : 'the detection and extraction process'}:

## Important Notice
**MANDATORY NEXT STEP**: After completing this task, immediately call the \`antv_assistant\` tool with the extracted parameters.

**Requirements:**
- Always use extracted library, topic, intent parameters with \`antv_assistant\` tool
- Never skip \`antv_assistant\` tool call and answer directly
- For complex tasks: pass subTasks parameter; for simple tasks: use basic parameters`;
}

function generateLibrarySpecifiedSection(libraryContext: {
  id: AntVLibrary;
  name: string;
}): string {
  return `## Phase 1: Library Context
  **Target Library**: ${libraryContext.name} (${libraryContext.id})`;
}

function generateLibraryDetectionSection(
  allLibraries: Array<{ id: AntVLibrary; name: string; description: string }>,
): string {
  // 动态生成库映射列表
  const libraryMappings = Object.values(ANTV_LIBRARY_META)
    .map((lib) => `   - \`@antv/${lib.id}\` → ${lib.name}`)
    .join('\n');

  return `## Phase 1: Library Detection and Recommendation

**Your first task is to determine the most suitable AntV library for this query.**

### Step 1.1: Project Dependency Scan
Scan the user's current project for installed AntV dependencies:
1. **Check package.json**: Look for AntV-related dependencies in both \`dependencies\` and \`devDependencies\`
2. **Look for patterns**:
${libraryMappings}

### Step 1.2: Smart Library Recommendation
Based on query content and detected dependencies, recommend the most suitable library:

**Library Selection Rules (Priority Order):**
1. **Query Intent Match**: Select library that best matches the technical requirements:
   ${allLibraries
     .map((lib) => `- **${lib.name} (${lib.id})**: ${lib.description}`)
     .join('\n   ')}

2. **Installed Dependency Priority**: If multiple libraries match the intent, prioritize installed ones
3. **Best Practice Guidance**: Consider the most commonly used library for the specific use case

**Output the recommended library and reason before proceeding to Phase 2.**`;
}

function generateExtractionRulesSection(
  maxTopics: number,
  libraryContext?: { id: AntVLibrary; name: string },
): string {
  const libraryTerminology = libraryContext
    ? getLibraryKeywords(libraryContext.id)
    : 'Use the terminology and components specific to the determined target library';
  const librarySpecificPriority = libraryContext
    ? `${libraryContext.name} specific component concepts and APIs`
    : 'Target library specific component concepts and APIs';
  return `## Phase 2: Topic Extraction and Intent Recognition

Once you have the target library (either specified or determined), proceed with:

### 2.1: Complex Task Detection
Determine whether the user query is a complex task. Characteristics of complex tasks:
- Contains multiple technical concepts or functional points
- Requires multiple steps to complete
- Involves multiple chart types or multiple functions
- Has clear workflow or combination requirements

### 2.2: Topic Phrase Extraction
- **Source Limitation**: Extract only from user query content, do not add concepts not present in the query
- **CRITICAL: All topics MUST be in English** - Use official AntV English terminology from: ${
    libraryContext
      ? getLibraryKeywords(libraryContext.id)
      : 'Use the terminology and components specific to the determined target library'
  }
- 翻译和提取时，务必优先使用上方列出的官方组件英文名称，保持与官方文档一致，避免自创或误译,保持技术准确性
- **Quantity Requirement**: Maximum ${maxTopics} items, can be fewer than this number
- **Format Requirements**:
  - Extract meaningful phrase combinations (1-4 words)
  - Avoid single words or overly long sentences
  - Ensure diversity between terms, avoid repetition
  - **MANDATORY**: Output only English technical terms for documentation search
- **Components, Concepts, Terminology**: ${libraryTerminology}
- **Priority**:
  1. ${librarySpecificPriority}
  2. Chart types and visualization concepts
  3. Interaction, animation effects, data processing and configuration

### 2.3: User Intent Recognition
Based on the tone and content of the query, select the most matching intent:
- **learn**: Learning and understanding (e.g., what is, how to understand, introduce)
- **implement**: Implementing functionality (e.g., how to create, how to implement, code examples)
- **solve**: Solving problems (e.g., errors, not working, fixing issues)

### 2.4: Complex Task Decomposition
If determined to be a complex task, decompose into 2-4 subtasks, each subtask should:
- Focus on a specific technical point or functionality
- Be able to independently obtain answers through documentation queries
- Be arranged in logical order (basic → advanced)
- Subtask topics must be clear, concise, and follow the format requirements above

**Note**: For complex tasks, provide the decomposed subtask list to the antv_assistant tool for one-time processing.`;
}

function generateOutputFormatSection(): string {
  return `### Simple Task Output Format:
\`\`\`json
{
  "topic": "actually extracted topic1, topic2, topic3",
  "intent": "learn|implement|solve",
  "library": "the target library (either specified or determined)",
  "isComplexTask": false
}
\`\`\`

### Complex Task Output Format:
\`\`\`json
{
  "topic": "summary of all related topics",
  "intent": "overall intent",
  "library": "the target library (either specified or determined)",
  "isComplexTask": true,
  "subTasks": [
    {
      "query": "specific question for subtask 1",
      "topic": "topic for subtask 1",
      "intent": "intent for subtask 1"
    },
    {
      "query": "specific question for subtask 2",
      "topic": "topic for subtask 2",
      "intent": "intent for subtask 2"
    }
  ]
}
\`\`\``;
}

function generateExamplesSection(): string {
  return `**Example 1 - Simple Task (English Query)**
Query: "What is G2?"
Output:
\`\`\`json
{
  "topic": "G2 introduction",
  "intent": "learn",
  "library": "g2",
  "isComplexTask": false
}
\`\`\`

**Example 2 - Simple Task (Chinese Query)**
Query: "如何修改G2图表的颜色？"
Output:
\`\`\`json
{
  "topic": "chart color, styling",
  "intent": "implement",
  "library": "g2",
  "isComplexTask": false
}
\`\`\`

**Example 3 - Complex Task**
Query: "How to create an animated bar chart with hover interaction in G2?"
Output:
\`\`\`json
{
  "topic": "animated bar chart, chart animation, hover interaction, mouse events",
  "intent": "implement",
  "library": "g2",
  "isComplexTask": true,
  "subTasks": [
    {
      "query": "How to create a basic bar chart in G2?",
      "topic": "bar chart, chart creation",
      "intent": "implement"
    },
    {
      "query": "How to add animation effects to G2 charts?",
      "topic": "chart animation, animation effects",
      "intent": "implement"
    },
    {
      "query": "How to add hover interaction to G2 charts?",
      "topic": "hover interaction, mouse events",
      "intent": "implement"
    }
  ]
}
\`\`\``;
}

export const TopicIntentExtractorTool = {
  name: 'topic_intent_extractor',
  description: `AntV Intelligent Assistant Preprocessing Tool - Specifically designed to handle any user queries related to AntV visualization libraries.
  This tool is the first step in processing AntV technology stack issues, responsible for intelligently identifying, parsing, and structuring user visualization requirements.

**MANDATORY: Must be called for ANY new AntV-related queries, including simple questions. Always precedes antv_assistant tool.**

When to use this tool:
- **AntV-related queries**: Questions about ${Object.keys(ANTV_LIBRARY_META).join('/')} libraries.
- **Visualization tasks**: Creating charts, graphs, maps, or other visualizations.
- **Problem solving**: Debugging errors, performance issues, or compatibility problems.
- **Learning & implementation**: Understanding concepts or requesting code examples.

Key features:
- **Smart Library Detection**: Scans installed AntV libraries and recommends the best fit based on query and project dependencies.
- **Topic & Intent Extraction**: Intelligently extracts technical topics and determines user intent (learn/implement/solve).
- **Task Complexity Handling**: Detects complex tasks and decomposes them into manageable subtasks.
- **Seamless Integration**: Prepares structured data for the antv_assistant tool to provide precise solutions.`,
  inputSchema: TopicIntentExtractorInputSchema,
  async run(args: TopicIntentExtractorArgs) {
    const startTime = Date.now();
    try {
      const extractionPrompt = generateExtractionPrompt(args);
      const maxTopics = args.maxTopics;
      const processingTime = Date.now() - startTime;
      return {
        content: [
          {
            type: 'text',
            text: extractionPrompt,
          },
        ],
        _meta: {
          topic: '', // Will be filled by LLM
          intent: '', // Will be filled by LLM
          library: args.library || 'g2',
          maxTopics,
          promptGenerated: true,
          next_tools: ['antv_assistant'],
          isComplexTask: false, // Will be determined and filled by LLM
          subTasks: [], // If complex task, will be filled with subtasks by LLM
          processingTime,
        },
      };
    } catch (error) {
      logger.error('Failed to generate extraction prompt:', error);
      // Use safe fallbacks since validation might have failed
      const fallbackLibrary =
        args.library && Object.keys(ANTV_LIBRARY_META).includes(args.library)
          ? args.library
          : 'g2';
      const fallbackMaxTopics =
        typeof args.maxTopics === 'number' &&
        args.maxTopics >= 3 &&
        args.maxTopics <= 8
          ? args.maxTopics
          : 5;
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
          topic: '',
          intent: '',
          library: fallbackLibrary,
          maxTopics: fallbackMaxTopics,
          promptGenerated: false,
          next_tools: ['antv_assistant'],
          isComplexTask: false,
          subTasks: [],
          processingTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },
};
