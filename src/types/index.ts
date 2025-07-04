/**
 * AntV MCP Server Type Definitions
 */

// AntV library types
export type AntVLibrary = 'g2' | 'g6' | 'l7' | 'x6' | 'f2' | 's2';

// Tool parameter interface
export interface AntVAssistantArgs {
  library: AntVLibrary;
  query: string;
  tokens?: number;
  topic: string;
  intent: string;
  subTasks?: Array<{
    query: string;
    topic: string;
    intent: string;
  }>;
}

// Tool result interface
export interface AntVAssistantResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  metadata?: {
    topics: string[];
    intent: string;
    library: AntVLibrary;
    hasDocumentation: boolean;
    processingTime: number;
    error?: string;
  };
  isError?: boolean;
}
