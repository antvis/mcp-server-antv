import { describe, it, expect, afterAll } from 'vitest';
import {
  queryDeepWiki,
  adaptedQueryDeepWiki,
  closeDeepWikiConnection,
  getRepoName,
} from '../../src/utils/deepwiki';

afterAll(async () => {
  await closeDeepWikiConnection();
});

describe('getRepoName', () => {
  it('should map adc to ant-design/ant-design-charts', () => {
    expect(getRepoName('adc')).toBe('ant-design/ant-design-charts');
  });

  it('should map normal library to antvis/<UPPER>', () => {
    expect(getRepoName('g2')).toBe('antvis/G2');
    expect(getRepoName('s2')).toBe('antvis/S2');
    expect(getRepoName('l7')).toBe('antvis/L7');
  });
});

describe('DeepWiki Integration Test', () => {
  it('should get real response from DeepWiki for G2 question', async () => {
    const result = await queryDeepWiki({
      repoName: 'antvis/G2',
      question: '如何调整折线图两端的间隔',
    });

    console.log('DeepWiki Answer (keep-alive):', result.slice(0, 200));

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(10);
    expect(result).not.toMatch(/^Error/);
    // 确保尾部 wiki 推荐链接已被清理
    expect(result).not.toMatch(/Wiki pages you might want to explore/i);
    expect(result).not.toMatch(/View this search on DeepWiki/i);
  }, 120000);

  it('should work with close-after-query mode', async () => {
    const result = await queryDeepWiki({
      repoName: 'antvis/G2',
      question: 'What is G2?',
      connectionMode: 'close-after-query',
    });

    console.log('DeepWiki Answer (close-after-query):', result.slice(0, 200));

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(10);
  }, 120000);

  it('should auto-resolve short repoName via getRepoName', async () => {
    const result = await queryDeepWiki({
      repoName: 'g2',
      question: 'What charts does G2 support?',
    });

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(10);
  }, 120000);
});

describe('adaptedQueryDeepWiki', () => {
  it('should return { documentation } on success', async () => {
    const result = await adaptedQueryDeepWiki({
      repoName: 'antvis/G2',
      question: 'What is G2?',
    });

    expect(result.documentation).toBeDefined();
    expect(typeof result.documentation).toBe('string');
    expect(result).not.toHaveProperty('error');
  }, 120000);

  it('should return { documentation: null, error } on failure', async () => {
    const result = await adaptedQueryDeepWiki({
      repoName: 'nonexistent/repo-that-does-not-exist-12345',
      question: 'anything',
    });

    // DeepWiki 对不存在的仓库可能返回空或报错
    // adaptedQueryDeepWiki 应该把异常吞掉，返回 error 字段
    expect(result.documentation).toBeNull();
    expect(typeof result.error).toBe('string');
  }, 120000);
});
