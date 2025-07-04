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

export const LIBRARY_KEYWORDS_MAPPING = {
  g2: [],
  s2: [],
  f2: `
    - 文本/图片/点/标签/矩形标注 (textGuide、ImageGuide、PointGuide、TagGuide、RectGuide)
    - 自定义标注/图例 (withGuide、withLegend)
    - 时间轴 (Timeline)
    - 坐标轴 (Axis)
    - 组件 (Component)
    - 提示信息/交互 (Tooltip)
    - 饼图标签 (PieLabel)
    - 象形柱图 (PictorialBar)
  `,
  g6: [],
  x6: [],
  l7: [],
};

export const DEFAULT_CONFIG = {
  // Context7 service configuration
  context7: {
    baseUrl: 'https://context7.com/api',
    timeout: 30000,
    tokens: {
      default: 5000,
      max: 20000,
      min: 1000,
    },
  },

  // Logger configuration
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
