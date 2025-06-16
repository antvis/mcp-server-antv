/**
 * Context7 服务，用于获取 AntV 最新文档上下文
 */

import type { AntVLibrary } from '../types/index.js';
import { DEFAULT_CONFIG } from '../config/index.js';
import { Logger, LogLevel } from '../utils/logger.js';

export class Context7Service {
  private logger: Logger;
  private baseUrl: string;
  private timeout: number;

  constructor(options: { logLevel?: LogLevel } = {}) {
    this.baseUrl = DEFAULT_CONFIG.context7.baseUrl;
    this.timeout = DEFAULT_CONFIG.context7.timeout;

    this.logger = new Logger({
      level: options.logLevel || LogLevel.INFO,
      prefix: 'Context7Service',
    });
  }

  /**
   * 获取 AntV 组织下对应的 Context7 库 ID
   */
  public getLibraryId(library: AntVLibrary): string {
    return `/antvis/${library}`;
  }

  /**
   * 获取指定库与主题关联的文档上下文
   */
  public async fetchLibraryDocumentation(
    libraryId: string,
    topic: string,
    tokens?: number,
  ): Promise<string | null> {
    try {
      const url = this.getContext7Url(libraryId, topic, tokens);
      const response = await this.makeContext7Request(url);

      if (response) {
        this.logger.info(
          `Documentation fetched successfully, length: ${response.length} chars`,
        );
        return response;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to fetch documentation:', error);
      return null;
    }
  }

  /**
   * 构建 Context7 API 请求 URL
   */
  private getContext7Url(
    libraryId: string,
    topic?: string,
    tokens?: number,
  ): string {
    const libId = libraryId.startsWith('/') ? libraryId.slice(1) : libraryId;
    const url = new URL(`${this.baseUrl}/v1/${libId}`);

    if (tokens) {
      url.searchParams.set('tokens', tokens.toString());
    }
    if (topic) {
      url.searchParams.set('topic', topic);
    }
    url.searchParams.set('type', 'txt');

    return url.toString();
  }

  /**
   * 发送 Context7 API 请求
   */
  private async makeContext7Request(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'X-Context7-Source': 'mcp-server' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();

      if (
        !text ||
        text === 'No content available' ||
        text === 'No context data available' ||
        text.trim().length === 0
      ) {
        return null;
      }

      return text;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout error');
      }

      throw error;
    }
  }
}
