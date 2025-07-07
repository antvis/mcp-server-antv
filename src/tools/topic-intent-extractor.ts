import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { AntVLibrary } from '../types/index.js';
import { Logger, LogLevel } from '../utils/logger.js';
import {
  getLibraryConfig,
  isValidLibrary,
  LIBRARY_KEYWORDS_MAPPING,
  LIBRARY_MAPPING,
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
- **AntV-related queries**: Questions about G2/G6/L7/X6/F2/S2 libraries.
- **Visualization tasks**: Creating charts, graphs, maps, or other visualizations.
- **Problem solving**: Debugging errors, performance issues, or compatibility problems.
- **Learning & implementation**: Understanding concepts or requesting code examples.

Key features:
- **Smart Library Detection**: Scans installed AntV libraries and recommends the best fit based on query and project dependencies.
- **Topic & Intent Extraction**: Intelligently extracts technical topics and determines user intent (learn/implement/solve).
- **Task Complexity Handling**: Detects complex tasks and decomposes them into manageable subtasks.
- **Seamless Integration**: Prepares structured data for the antv_assistant tool to provide precise solutions.
- **Full Scenario Support**: Covers everything from basic learning to advanced implementation.

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
            description: 'User specific question or requirement description',
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
            description: 'Maximum number of extracted topic keywords, default 5, can be increased appropriately for complex tasks',
          },
        },
        required: ['query'],
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
          topic: '', // Will be filled by LLM
          intent: '', // Will be filled by LLM
          library: args.library || 'g2',
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
  private generateExtractionPrompt(args: TopicIntentExtractorArgs): string {
    const maxTopics = args.maxTopics || 5;
    const libraryContext = args.library
      ? getLibraryConfig(args.library)
      : undefined;

    return this.generateUnifiedPrompt(args.query, maxTopics, libraryContext);
  }

  /**
   * Generate unified prompt for both specific library and dynamic detection scenarios
   */
  private generateUnifiedPrompt(
    query: string,
    maxTopics: number,
    libraryContext?: { id: AntVLibrary; name: string },
  ): string {
    const isLibrarySpecified = !!libraryContext;
    const allLibraries = Object.values(LIBRARY_MAPPING);

    // Phase 1: Library Determination Section
    const libraryDeterminationSection = isLibrarySpecified
      ? this.generateLibrarySpecifiedSection(libraryContext)
      : this.generateLibraryDetectionSection(allLibraries);

    // Phase 2: Unified Topic Extraction and Intent Recognition
    const extractionRulesSection =
      this.generateExtractionRulesSection(maxTopics, libraryContext);

    // Output format and examples
    const outputFormatSection = this.generateOutputFormatSection();
    const examplesSection = this.generateExamplesSection();

    return `# AntV ${isLibrarySpecified ? 'Topic and Intent Extraction' : 'Smart Library Detection and Topic Extraction'} Task

## Task Objective
${
  isLibrarySpecified
    ? `Extract the most relevant technical topic phrases and user intent from user queries for ${libraryContext.name} documentation retrieval.`
    : `1. **First**: Detect and recommend the most suitable AntV library based on query intent and installed dependencies
2. **Second**: Extract relevant technical topics and user intent for the determined library`
}

##  User Query
\`\`\`
${query}
\`\`\`

${libraryDeterminationSection}

${extractionRulesSection}

##  Output Format

${outputFormatSection}

##  Examples

${examplesSection}

Now please begin ${isLibrarySpecified ? 'extraction' : 'the detection and extraction process'}:

## ⚠️ Important Notice
**After completing this task, you must immediately call the \`antv_assistant\` tool to handle the user's actual technical requirements using the extracted parameters.**
${
  isLibrarySpecified
    ? `- Use the extracted library, topic, intent parameters
- If it's a complex task, pass the subTasks parameter
- Do not skip this step and answer user questions directly`
    : ''
}`;
  }

  /**
   * Generate library specified section
   */
  private generateLibrarySpecifiedSection(libraryContext: {
    id: AntVLibrary;
    name: string;
  }): string {
    return `## Library Context
**Target Library**: ${libraryContext.name} (${libraryContext.id})
**Components and Terminology**: ${LIBRARY_KEYWORDS_MAPPING[libraryContext.id]}`;
  }

  /**
   * Generate library detection section for dynamic recommendation
   */
  private generateLibraryDetectionSection(
    allLibraries: Array<{ id: AntVLibrary; name: string }>,
  ): string {
    return `## Phase 1: Library Detection and Recommendation

**Your first task is to determine the most suitable AntV library for this query.**

### Step 1.1: Project Dependency Scan
Scan the user's current project for installed AntV dependencies:
1. **Check package.json**: Look for AntV-related dependencies in both \`dependencies\` and \`devDependencies\`
2. **Look for patterns**:
   - \`@antv/g2\` → G2 (Statistical Charts)
   - \`@antv/g6\` → G6 (Graph Analysis)
   - \`@antv/l7\` → L7 (Geospatial Visualization)
   - \`@antv/x6\` → X6 (Graph Editing)
   - \`@antv/f2\` → F2 (Mobile Charts)
   - \`@antv/s2\` → S2 (Table Analysis)

### Step 1.2: Smart Library Recommendation
Based on query content and detected dependencies, recommend the most suitable library:

**Library Selection Rules (Priority Order):**
1. **Query Intent Match**: Select library that best matches the technical requirements:
   ${allLibraries
     .map(
       (lib: { id: AntVLibrary; name: string }) =>
         `- **${lib.name} (${lib.id})**: ${this.getLibraryDescription(lib.id)}`,
     )
     .join('\n   ')}

2. **Installed Dependency Priority**: If multiple libraries match the intent, prioritize installed ones
3. **Best Practice Guidance**: Consider the most commonly used library for the specific use case

**Output the recommended library and reason before proceeding to Phase 2.**`;
  }

  /**
   * Generate unified extraction rules section
   */
  private generateExtractionRulesSection(
    maxTopics: number,
    libraryContext?: { id: AntVLibrary; name: string },
  ): string {
    // Dynamic values based on whether library is specified or needs to be determined
    const libraryTerminology = libraryContext
      ? LIBRARY_KEYWORDS_MAPPING[libraryContext.id]
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
- **rules**:${
    libraryContext
      ? LIBRARY_KEYWORDS_MAPPING[libraryContext.id]
      : 'Use the terminology and components specific to the determined target library'
  }
- 翻译和提取时，务必优先使用上方列出的官方组件英文名称，保持与官方文档一致，避免自创或误译,保持技术准确性
- **Quantity Requirement**: Maximum ${maxTopics} items, can be fewer than this number
- **Format Requirements**:
  - Extract meaningful phrase combinations (1-4 words)
  - Avoid single words or overly long sentences
  - Ensure diversity between terms, avoid repetition
  - Translate to English, maintain technical accuracy
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

  /**
   * Generate output format section based on library specification
   */
  private generateOutputFormatSection(): string {
    return `### Simple Task Output Format:
\`\`\`json
{
  "topics": "actually extracted topic1, topic2, topic3",
  "intent": "learn|implement|solve",
  "library": "the target library (either specified or determined)",
  "isComplexTask": false
}
\`\`\`

### Complex Task Output Format:
\`\`\`json
{
  "topics": "summary of all related topics",
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

  /**
   * Generate examples section based on library specification
   */
  private generateExamplesSection(): string {
    return `**Example 1 - Simple Task**
Query: "What is G2?"
Output:
\`\`\`json
{
  "topics": "G2 introduction",
  "intent": "learn",
  "library": "g2",
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

  /**
   * Get library description for recommendation
   */
  private getLibraryDescription(libraryId: AntVLibrary): string {
    const descriptions = {
      g2: 'Statistical charts, data visualization, business intelligence charts',
      g6: 'Graph analysis, network diagrams, node-link relationships',
      l7: 'Geospatial visualization, maps, geographic data analysis',
      x6: 'Graph editing, flowcharts, diagram creation tools',
      f2: 'Mobile-optimized charts, lightweight visualization',
      s2: 'Table analysis, spreadsheet-like interactions, data grids',
    };
    return descriptions[libraryId] || 'AntV visualization library';
  }
}
