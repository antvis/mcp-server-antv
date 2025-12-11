import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import EventSource from 'eventsource';
import { logger } from './logger';
import { AntVLibrary } from '../types';

// ---------------------------------------------------------
// 1. 全局环境配置
// ---------------------------------------------------------
// Node.js 环境下 MCP SDK 依赖全局 EventSource
// 作为底层包，为了保证运行时安全，仅在未定义时赋值
if (!global.EventSource) {
  // @ts-ignore
  global.EventSource = EventSource;
}

// ---------------------------------------------------------
// 2. 单例状态管理
// ---------------------------------------------------------
let _client: Client | null = null;
let _transport: SSEClientTransport | null = null;
let _connectingPromise: Promise<Client> | null = null;

/**
 * 获取或初始化 MCP 客户端 (单例模式)
 * 包含防止并发重复连接的锁机制
 */
async function getMcpClient(): Promise<Client> {
  // 如果客户端已存在且传输层看似正常，直接返回
  // 注意：SSEClientTransport 目前没有直观的 isConnected 属性，
  // 这里的检查主要是防止对象为空。更严谨的做法是监听 transport 的 close 事件来重置 _client。
  if (_client && _transport) {
    return _client;
  }

  // 如果正在连接中，等待同一个 Promise 结果，防止并发请求导致多次 new Client
  if (_connectingPromise) {
    return _connectingPromise;
  }

  // 开始初始化连接
  _connectingPromise = (async () => {
    try {
      logger.info('DeepWiki MCP: 初始化连接...');

      const transport = new SSEClientTransport(
        new URL('https://mcp.deepwiki.com/sse'),
      );

      const client = new Client(
        {
          name: 'deepwiki-node-client',
          version: '1.0.0',
        },
        { capabilities: {} },
      );

      // 错误处理：监听传输层关闭或错误，以便下次重连
      transport.onerror = (err) => {
        logger.error('DeepWiki MCP Transport Error:', err);
        resetClient(); // 出错时重置，下次调用会触发重连
      };

      transport.onclose = () => {
        logger.info('DeepWiki MCP Connection Closed');
        resetClient();
      };

      await client.connect(transport);

      // 连接成功，赋值给模块级变量
      _client = client;
      _transport = transport;
      logger.info('DeepWiki MCP: 连接成功');

      return client;
    } catch (error) {
      logger.error('DeepWiki MCP: 连接失败', error);
      resetClient();
      throw error;
    } finally {
      _connectingPromise = null; // 释放锁
    }
  })();

  return _connectingPromise;
}

/**
 * 重置客户端状态，强制下一次请求重新连接
 */
function resetClient() {
  _client = null;
  _transport = null;
  // 注意：不需要手动 close transport，因为通常是在出错或断开时调用此方法
}

// ---------------------------------------------------------
// 3. 业务导出函数
// ---------------------------------------------------------

/**
 * 查询 DeepWiki
 * 外部调用就像调用普通函数一样，无需关心连接管理
 */
export async function queryDeepWiki(_params: {
  repoName: string;
  question: string;
}): Promise<string> {
  try {
    const params = {
      ..._params,
    };
    if (!params.repoName.includes('/')) {
      params.repoName = getRepoName(params.repoName as AntVLibrary);
    }

    // 获取单例客户端 (自动处理连接)
    const client = await getMcpClient();

    // 调用工具
    const result: any = await client.callTool({
      name: 'ask_question',
      arguments: params,
    });

    // ---------------------------------------------------------
    // 4. 结果处理逻辑
    // ---------------------------------------------------------
    // result.content 是一个数组，可能包含 text, image 等
    // 这里我们使用 reduce 提取所有 text 类型的内容并拼接
    let answer = result.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n'); // 如果有多段文本，用换行符拼接

    const regex =
      /Wiki pages you might want to explore:|View this search on DeepWiki:/i;
    const splitIndex = answer.search(regex);
    // 如果找到了标记 (splitIndex !== -1)
    if (splitIndex !== -1) {
      // 截取从开头到标记之前的部分，并清理末尾的空白
      answer = answer.slice(0, splitIndex).trimEnd();
    }

    if (!answer || answer.startsWith('Error')) {
      // 防御性编程：如果返回内容为空
      throw new Error('DeepWiki return Empty/Error Answer, Answer = ' + answer);
    }

    return answer;
  } catch (error) {
    logger.error('DeepWiki Query Error:', error);
    // 根据业务需求，这里可以选择抛出错误，或者返回空字符串/错误提示字符串
    // 如果是网络断开等错误，resetClient 会在下一次调用时触发重连
    if (_client) {
      // 如果调用过程中报错，为了保险起见，可以考虑重置连接状态
      // 视具体错误类型而定，这里简单处理：
      // resetClient();
    }
    throw error;
  }
}

export async function adaptedQueryDeepWiki(_params: {
  repoName: string;
  question: string;
}) {
  try {
    const answer = await queryDeepWiki(_params);
    return { documentation: answer };
  } catch (error) {
    return {
      documentation: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * (可选) 显式关闭连接
 * 供 EggJS 应用在 app.beforeClose 时调用
 */
export async function closeDeepWikiConnection() {
  if (_transport) {
    logger.info('DeepWiki MCP: 关闭连接...');
    // SDK 目前可能没有直接暴露 close 方法，通常关闭 transport 即可
    // SSEClientTransport 内部并没有显式的 close 方法暴露出来，
    // 但我们可以将引用置空，让 GC 回收，或者依赖进程退出
    // 如果 SSEClientTransport 实现了 close，则调用:
    // await _transport.close();

    // 目前 SDK 版本可以直接置空
    resetClient();
  }
}

/**
 * Get the DeepWiki repoName corresponding to the AntV organization.
 */
export function getRepoName(library: AntVLibrary): string {
  if (library === 'adc') return 'ant-design/ant-design-charts';
  return `antvis/${library.toUpperCase()}`;
}
