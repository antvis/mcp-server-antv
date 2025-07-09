import type { AntVLibrary } from './types';

// AntV Libraries Metadata
export const ANTV_LIBRARY_META = {
  g2: {
    id: 'g2' as AntVLibrary,
    name: 'G2',
    description:
      'Statistical charts, data visualization, business intelligence charts',
    keywords: [],
  },
  g6: {
    id: 'g6' as AntVLibrary,
    name: 'G6',
    description: 'Graph analysis, network diagrams, node-link relationships',
    keywords: [],
  },
  l7: {
    id: 'l7' as AntVLibrary,
    name: 'L7',
    description: 'Geospatial visualization, maps, geographic data analysis',
    keywords: [],
  },
  x6: {
    id: 'x6' as AntVLibrary,
    name: 'X6',
    description: 'Graph editing, flowcharts, diagram creation tools',
    keywords: [],
  },
  f2: {
    id: 'f2' as AntVLibrary,
    name: 'F2',
    description: 'Mobile-optimized charts, lightweight visualization',
    keywords: `
  <components>
    - 文本/图片/点/标签/矩形标注 (TextGuide、ImageGuide、PointGuide、TagGuide、RectGuide)
    - 自定义标注/图例 (withGuide、withLegend)
    - 时间轴 (Timeline)
    - 坐标轴 (Axis)
    - 组件 (Component)
    - 提示信息/交互 (Tooltip)
    - 饼图标签 (PieLabel)
    - 象形柱图 (PictorialBar)
  <components>
  <convention>
    - JSX 语法
    - Guides, Legend, Timeline, Axis 组件必须在 Chart 组件内使用
  </convention>
  `,
  },
  s2: {
    id: 's2' as AntVLibrary,
    name: 'S2',
    description: 'Table analysis, spreadsheet-like interactions, data grids',
    keywords: [],
  },
};

export const CONTEXT7_TOKENS = {
  default: 5000,
  max: 20000,
  min: 1000,
};

// Convenience functions
export function getLibraryConfig(library: AntVLibrary) {
  return ANTV_LIBRARY_META[library];
}

export function getLibraryDescription(library: AntVLibrary): string {
  return (
    ANTV_LIBRARY_META[library]?.description || 'AntV visualization library'
  );
}

export function getLibraryKeywords(library: AntVLibrary) {
  return ANTV_LIBRARY_META[library]?.keywords || [];
}
