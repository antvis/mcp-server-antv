import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { AntVLibrary } from '../types/index.js';
import { Logger, LogLevel } from '../utils/logger.js';
import { recommendLibrary } from '../utils/package-detector.js';
import {
  getLibraryConfig,
  isValidLibrary,
  LIBRARY_KEYWORDS_MAPPING,
} from '../config/index.js';

export interface TopicIntentExtractorArgs {
  query: string;
  library?: AntVLibrary;
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
 * User intent enumeration
 */
export const USER_INTENTS = {
  LEARN: 'learn', // Learning and understanding
  IMPLEMENT: 'implement', // Implementing functionality
  SOLVE: 'solve', // Solving problems
} as const;

/**
 * AntV Intelligent Assistant Preprocessing Tool
 *
 * Specifically designed to handle any user queries related to AntV visualization libraries. This tool is the first step
 * in processing AntV technology stack issues, responsible for intelligently identifying, parsing, and structuring
 * user visualization requirements. Supports automatic identification of AntV technology stack types, intelligent extraction
 * of technical topic keywords, accurate judgment of user intent, and preparation of structured information for subsequent antv_assistant tool calls.
 *
 * For any queries involving G2, G6, L7, X6, F2, S2, or visualization-related topics, this tool should be called first,
 * supporting full scenario coverage from simple concept learning to complex functionality implementation.
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
   * Get tool definition
   */
  getToolDefinition(): Tool {
    return {
      name: 'topic_intent_extractor',
      description: `AntV Intelligent Assistant Preprocessing Tool - Specifically designed to handle any user queries related to AntV visualization libraries.
This tool is the first step in processing AntV technology stack issues, responsible for intelligently identifying, parsing, and structuring user visualization requirements.

When to use this tool:
- User queries about any G2, G6, L7, X6, F2, S2 or AntV libraries
- Questions involving chart creation, data visualization, graph analysis, or geo-visualization
- Requests for implementing interactive features, style configurations, or animation effects
- Technical questions about graph editing, network analysis, or table analysis
- Users mention any AntV-related components, APIs, concepts, or terminology
- Need to solve AntV-related errors, performance, or compatibility issues
- Learning AntV concepts, seeking code examples, or implementation guidance
- Any queries containing visualization, charts, graphs, maps and possibly related to AntV
- User technical requirements described in Chinese or English related to AntV
- Handle any AntV-related questions during conversation flow

When NOT to use:
- Questions clearly unrelated to visualization or AntV
- General programming questions not specific to AntV ecosystem
- User is asking about non-AntV visualization libraries

Key features:
-  Smart Project Dependency Detection: Automatically scans installed AntV libraries in user projects, prioritizes installed technology stacks
-  Automatically identifies AntV technology stack types (G2 charts/G6 graph analysis/L7 geo/X6 editing/F2 mobile/S2 tables)
-  Intelligently extracts technical topic keywords, supports mixed Chinese-English queries
-  Accurately determines user intent: learning/implementing/solving problems
-  Automatically detects task complexity and performs intelligent decomposition
-  Prepares structured information for subsequent antv_assistant tool calls
-  Supports full scenario coverage from simple concept learning to complex functionality implementation
-  Capable of handling multi-step, multi-component complex visualization requirements
-  No need for users to explicitly specify AntV library type, tool intelligently infers based on project dependencies and query content

Parameters explained:
- query: User's original query content, supports Chinese and English, can be simple questions or complex requirement descriptions
- library: AntV library name (g2/g6/l7/x6/f2/s2), optional parameter! If not specified, tool will automatically detect project dependencies and intelligently recommend
- maxTopics: Maximum number of extracted topic keywords, default 5, can be increased appropriately for complex tasks

Smart Library Detection:
-  Prioritizes AntV libraries installed in the project (e.g., if project has F2 but not G2, will recommend F2 when asking about line charts)
-  Scans package.json dependencies and devDependencies
-  Detects @antv/ packages in node_modules
-  Selects the most suitable among installed libraries based on query content
-  If no AntV libraries are installed, intelligently recommends based on functional features
- ⚡ Caches detection results to improve subsequent query performance`,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'User query content',
          },
          library: {
            type: 'string',
            enum: ['g2', 'g6', 'l7', 'x6', 'f2', 's2'],
            description:
              'AntV library name (optional) - If not specified, tool will automatically detect project dependencies and intelligently recommend',
          },
          maxTopics: {
            type: 'number',
            minimum: 3,
            maximum: 8,
            default: 5,
            description: 'Maximum number of extracted topic phrases',
          },
        },
        required: ['query'], // Only query is required
      },
    };
  }

  /**
   * Execute tool
   */
  async execute(
    args: TopicIntentExtractorArgs,
  ): Promise<TopicIntentExtractorResult> {
    try {
      this.validateArgs(args);

      // Intelligently recommend library
      const recommendedLibrary = this.getRecommendedLibrary(args);
      const finalArgs = { ...args, library: recommendedLibrary };

      const extractionPrompt = this.generateExtractionPrompt(finalArgs);
      const maxTopics = args.maxTopics || 5;

      return {
        content: [
          {
            type: 'text',
            text: extractionPrompt,
          },
        ],
        metadata: {
          topic: '', // Will be filled by LLM
          intent: '', // Will be filled by LLM
          library: recommendedLibrary,
          maxTopics,
          promptGenerated: true,
          next_tools: ['antv_assistant'],
          isComplexTask: false, // Will be determined and filled by LLM
          subTasks: [], // If complex task, will be filled with subtasks by LLM
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate extraction prompt:', error);
      const fallbackLibrary = args.library || 'g2';
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
        metadata: {
          topic: '',
          intent: '',
          library: fallbackLibrary,
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
   * Get recommended library
   */
  private getRecommendedLibrary(args: TopicIntentExtractorArgs): AntVLibrary {
    // If user specified library, use it directly
    if (args.library) {
      return args.library;
    }

    // Use dependency detector for recommendation
    const recommended = recommendLibrary(args.query);
    if (recommended) {
      this.logger.info(
        `Recommended library for query "${args.query}": ${recommended}`,
      );
      return recommended;
    }

    // Fallback to G2
    this.logger.warn('No suitable library found, falling back to G2');
    return 'g2';
  }

  /**
   * Validate input arguments
   */
  private validateArgs(args: TopicIntentExtractorArgs): void {
    if (!args.query?.trim()) throw new Error('Query content cannot be empty');

    if (args.library && !isValidLibrary(args.library)) {
      throw new Error(`Unsupported library: ${args.library}`);
    }
  }

  /**
   * Generate extraction task prompt
   */
  private generateExtractionPrompt(
    args: TopicIntentExtractorArgs & { library: AntVLibrary },
  ): string {
    const maxTopics = args.maxTopics || 5;
    const libraryContext = getLibraryConfig(args.library);

    return `# AntV Topic and Intent Extraction Task

## Task Objective
Extract the most relevant technical topic phrases and user intent from user queries for ${
      libraryContext.name
    } documentation retrieval.

##  User Query
\`\`\`
${args.query}
\`\`\`

##  Extraction Rules

### 1. Complex Task Detection
Determine whether the user query is a complex task. Characteristics of complex tasks:
- Contains multiple technical concepts or functional points
- Requires multiple steps to complete
- Involves multiple chart types or multiple functions
- Has clear workflow or combination requirements

### 2. Topic Phrase Extraction
- **Source Limitation**: Extract only from user query content, do not add concepts not present in the query
- **Quantity Requirement**: Maximum ${maxTopics} items, can be fewer than this number
- **Format Requirements**:
  - Extract meaningful phrase combinations (1-4 words)
  - Avoid single words or overly long sentences
  - Ensure diversity between terms, avoid repetition
  - Translate to English, maintain technical accuracy
- **Components, Concepts, Terminology**: ${
      LIBRARY_KEYWORDS_MAPPING[libraryContext.id]
    }
- **Priority**:
  1. ${libraryContext.name} specific component concepts and APIs
  2. Chart types and visualization concepts
  3. Interaction, animation effects, data processing and configuration

### 3. User Intent Recognition
Based on the tone and content of the query, select the most matching intent:

- **learn**: Learning and understanding (e.g., what is, how to understand, introduce)
- **implement**: Implementing functionality (e.g., how to create, how to implement, code examples)
- **solve**: Solving problems (e.g., errors, not working, fixing issues)

### 4. Complex Task Decomposition
If determined to be a complex task, it needs to be decomposed into 2-4 subtasks, each subtask should:
- Focus on a specific technical point or functionality
- Be able to independently obtain answers through documentation queries
- Be arranged in logical order (basic → advanced)
- Subtask topics must be clear, concise, and strictly follow the format requirements of "### 2. Topic Phrase Extraction" (phrase combinations, English, technical accuracy, etc.), with 1-2 items

**Note**: For complex tasks, provide the decomposed subtask list to the antv_assistant tool for one-time processing, rather than multiple tool calls.

##  Output Format

### Simple Task Output Format:
\`\`\`json
{
  "topics": "actually extracted topic1, topic2, topic3",
  "intent": "learn|implement|solve",
  "isComplexTask": false
}
\`\`\`

### Complex Task Output Format:
\`\`\`json
{
  "topics": "summary of all related topics",
  "intent": "overall intent",
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
\`\`\`

##  Extraction Examples

**Example 1 - Simple Task**
Query: "What is G2?"
Output:
\`\`\`json
{
  "topics": "G2 introduction",
  "intent": "learn",
  "isComplexTask": false
}
\`\`\`

**Example 2 - Complex Task**
Query: "How to create an animated bar chart with hover interaction in G2?"
Output:
\`\`\`json
{
  "topics": "animated bar chart, chart animation, hover interaction, mouse events",
  "intent": "implement",
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
\`\`\`

Now please begin extraction:

## ⚠️ Important Notice
**After extraction is complete, you must immediately call the \`antv_assistant\` tool to handle the user's actual technical requirements.**
- Use the extracted library, topic, intent parameters
- If it's a complex task, pass the subTasks parameter
- Do not skip this step and answer user questions directly`;
  }
}
