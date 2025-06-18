import type { AntVLibrary } from '../types/index.js';
import { LogLevel } from '../utils/logger.js';

export const LIBRARY_MAPPING = {
  g2: { id: 'g2', name: 'G2' },
  s2: { id: 's2', name: 'S2' },
  f2: { id: 'f2', name: 'F2' },
  g6: { id: 'g6', name: 'G6' },
  x6: { id: 'x6', name: 'X6' },
  l7: { id: 'l7', name: 'L7' },
} as const;

/**
 * 不同AntV技术栈的代码模板
 */
export const CODE_TEMPLATES: Record<string, string> = {
  [LIBRARY_MAPPING['g2'].name]: `\`\`\`js
import { Chart } from '@antv/g2';
// 有必要的话，请在需要注意的地方加上注释

const chart = new Chart({ container: 'container' });

// ========== spec 风格模板 ==========
// chart.options({
//   type: 'interval',
//   autoFit: true,
//   data: [
//     { letter: 'A', frequency: 0.08167 },
//     { letter: 'B', frequency: 0.01492 },
//     { letter: 'C', frequency: 0.02782 },
//     { letter: 'D', frequency: 0.04253 },
//     { letter: 'E', frequency: 0.12702 },
//     { letter: 'F', frequency: 0.02288 },
//     { letter: 'G', frequency: 0.02015 },
//   ],
//   encode: { x: 'letter', y: 'frequency' },
// });

// // ========== api 风格模板 ==========
const data = [
  { letter: 'A', frequency: 0.08167 },
  { letter: 'B', frequency: 0.01492 },
  { letter: 'C', frequency: 0.02782 },
  { letter: 'D', frequency: 0.04253 },
  { letter: 'E', frequency: 0.12702 },
  { letter: 'F', frequency: 0.02288 },
  { letter: 'G', frequency: 0.02015 },
];
chart
  .interval()
  .data(data)
  .encode('x', 'letter')
  .encode('y', 'frequency')
  .scale('y', {
    nice: 1,
    tickMethod: (a, b, c, d) => {
      console.log({ a, b, c, d });
      return [0, 0.04, 0.08, 0.12, 0.14, 0.16];
    },
  });

chart.render();
\`\`\``,
  g6: '',
  l7: '',
  x6: '',
  f2: '',
  s2: '',
};

export const DEFAULT_CONFIG = {
  // Context7 服务配置
  context7: {
    baseUrl: process.env.CONTEXT7_BASE_URL || 'https://context7.com/api',
    timeout: parseInt(process.env.CONTEXT7_TIMEOUT || '30000'),
    tokens: {
      default: 5000,
      max: 20000,
      min: 1000,
    },
  },

  // 日志配置
  logger: {
    level: (process.env.LOG_LEVEL as keyof typeof LogLevel) || 'INFO',
  },
} as const;

export function isValidLibrary(library: string): library is AntVLibrary {
  return library in LIBRARY_MAPPING;
}

export function getLibraryConfig(library: AntVLibrary) {
  return LIBRARY_MAPPING[library];
}
