#!/usr/bin/env node

/**
 * Context7 API 快速测试脚本
 * 用于快速检查 API 是否正常工作
 */

import { Context7Service } from '../dist/services/context7.js';
import { LogLevel } from '../dist/utils/logger.js';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function quickTest() {
  log('🚀 Context7 API 快速测试', colors.bold);

  const context7Service = new Context7Service({
    logLevel: LogLevel.ERROR
  });

  try {
    const startTime = Date.now();

    // 测试 G2 库
    const libraryId = context7Service.getLibraryId('g2');
    const result = await context7Service.fetchLibraryDocumentation(
      libraryId,
      'chart',
      1000
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (result) {
      log(`✅ 测试通过！`, colors.green);
      log(`📊 获取到 ${result.length} 字符的文档内容`, colors.blue);
      log(`⏱️  响应时间: ${duration}ms`, colors.blue);
      log(`🔗 API 端点: https://context7.com/api/v1/antvis/g2`, colors.blue);

      // 显示内容预览
      const preview = result.substring(0, 150).replace(/\n/g, ' ');
      log(`📝 内容预览: ${preview}...`, colors.yellow);

      return true;
    } else {
      log(`❌ 测试失败：未获取到内容`, colors.red);
      return false;
    }

  } catch (error) {
    log(`❌ 测试失败：${error.message}`, colors.red);
    return false;
  }
}

// 运行快速测试
quickTest().then(success => {
  if (success) {
    log('\n🎉 Context7 API 工作正常！', colors.green);
  } else {
    log('\n💥 Context7 API 存在问题，请检查网络连接', colors.red);
  }
}).catch(console.error);
