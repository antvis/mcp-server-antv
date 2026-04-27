import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import EventSource from 'eventsource';
import { logger } from './logger';
import { AntVLibrary } from '../types';

export type DeepWikiConnectionMode = 'keep-alive' | 'close-after-query';

type DeepWikiQueryParams = {
  repoName: string;
  question: string;
  connectionMode?: DeepWikiConnectionMode;
};

type McpConnection = {
  client: Client;
  transport: StreamableHTTPClientTransport;
};

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
let _transport: StreamableHTTPClientTransport | null = null;
let _connectingPromise: Promise<Client> | null = null;

function createMcpConnection(): McpConnection {
  const transport = new StreamableHTTPClientTransport(
    new URL('https://mcp.deepwiki.com/mcp'),
  );

  const client = new Client(
    {
      name: 'deepwiki-node-client',
      version: '1.0.0',
    },
    { capabilities: {} },
  );

  return { client, transport };
}

async function connectMcpConnection(params: {
  client: Client;
  transport: StreamableHTTPClientTransport;
  isShared?: boolean;
}) {
  const { client, transport, isShared = false } = params;

  transport.onerror = (err) => {
    logger.error('DeepWiki MCP Transport Error:', err);
    if (isShared) {
      resetClient();
    }
  };

  transport.onclose = () => {
    logger.info('DeepWiki MCP Connection Closed');
    if (isShared) {
      resetClient();
    }
  };

  await client.connect(transport);
}

async function closeMcpConnection(params: {
  client?: Client | null;
  transport?: StreamableHTTPClientTransport | null;
  isShared?: boolean;
}) {
  const { client, transport, isShared = false } = params;

  if (!client && !transport) {
    return;
  }

  try {
    if (client) {
      await client.close();
    } else {
      await transport?.close();
    }
  } catch (error) {
    logger.error('DeepWiki MCP Client Close Error:', error);
    try {
      await transport?.close();
    } catch (transportError) {
      logger.error('DeepWiki MCP Transport Close Error:', transportError);
    }
  } finally {
    if (isShared) {
      resetClient();
    }
  }
}

/**
 * 获取或初始化 MCP 客户端 (单例模式)
 * 包含防止并发重复连接的锁机制
 */
async function getMcpClient(): Promise<Client> {
  // 如果客户端已存在且传输层看似正常，直接返回
  // 注意：StreamableHTTPClientTransport 目前没有直观的 isConnected 属性，
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
    let connection: McpConnection | null = null;
    try {
      logger.info('DeepWiki MCP: 初始化连接...');
      connection = createMcpConnection();
      await connectMcpConnection({ ...connection, isShared: true });

      // 连接成功，赋值给模块级变量
      _client = connection.client;
      _transport = connection.transport;
      logger.info('DeepWiki MCP: 连接成功');

      return connection.client;
    } catch (error) {
      logger.error('DeepWiki MCP: 连接失败', error);
      await closeMcpConnection(connection ?? {});
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
  connectionMode?: DeepWikiConnectionMode;
}): Promise<string> {
  let localConnection: McpConnection | null = null;
  try {
    const params: DeepWikiQueryParams = {
      ..._params,
    };
    if (!params.repoName.includes('/')) {
      params.repoName = getRepoName(params.repoName as AntVLibrary);
    }

    let client: Client;
    if (params.connectionMode === 'close-after-query') {
      logger.info('DeepWiki MCP: 初始化一次性连接...');
      localConnection = createMcpConnection();
      await connectMcpConnection(localConnection);
      client = localConnection.client;
      logger.info('DeepWiki MCP: 一次性连接成功');
    } else {
      // 获取单例客户端 (自动处理连接)
      client = await getMcpClient();
    }

    // 调用工具
    const result: any = await client.callTool({
      name: 'ask_question',
      arguments: {
        repoName: params.repoName,
        question: params.question,
      },
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

    if (result.isError) {
      throw new Error('DeepWiki Tool Error, Answer = ' + answer);
    }

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
  } finally {
    if (localConnection) {
      logger.info('DeepWiki MCP: 关闭一次性连接...');
      await closeMcpConnection(localConnection);
    }
  }
}

export async function adaptedQueryDeepWiki(_params: {
  repoName: string;
  question: string;
  connectionMode?: DeepWikiConnectionMode;
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
  if (_connectingPromise) {
    await _connectingPromise.catch(() => {});
  }

  if (_client || _transport) {
    logger.info('DeepWiki MCP: 关闭连接...');
    await closeMcpConnection({
      client: _client,
      transport: _transport,
      isShared: true,
    });
  }
}

/**
 * Get the DeepWiki repoName corresponding to the AntV organization.
 */
export function getRepoName(library: AntVLibrary): string {
  if (library === 'adc') return 'ant-design/ant-design-charts';
  return `antvis/${library.toUpperCase()}`;
}
