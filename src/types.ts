/**
 * AntV MCP Server Type Definitions
 */

/**
 * AntV Library Types.
 * Defines the available libraries in the AntV ecosystem.
 * These libraries are used to fetch documentation and provide context for the AntV Assistant tool.
 */
export type AntVLibrary = 'g2' | 'g6' | 'l7' | 'x6' | 'f2' | 's2';

export type AntVConfig = {
  id: AntVLibrary;
  name: string;
  description: string;
  keywords: string;
  codeStyle: string;
};
