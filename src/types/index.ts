/**
 * AntV MCP Server 类型定义
 */

// AntV 库类型
export type AntVLibrary = 'g2' | 'g6' | 'l7' | 'x6' | 'f2';

// 工具参数接口
export interface AntVAssistantArgs {
  library: AntVLibrary;
  query: string;
  tokens?: number;
  topic: string;
  intent: string;
}

// 工具结果接口
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
