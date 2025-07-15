import type { AntVLibrary } from './types';

// AntV Libraries Metadata
export const ANTV_LIBRARY_META = {
  g2: {
    id: 'g2' as AntVLibrary,
    name: 'G2',
    description:
      'Statistical charts, data visualization, business intelligence charts',
    keywords: '',
    codeStyle: '',
  },
  g6: {
    id: 'g6' as AntVLibrary,
    name: 'G6',
    description: 'Graph analysis, network diagrams, node-link relationships',
    keywords: '',
    codeStyle: '',
  },
  l7: {
    id: 'l7' as AntVLibrary,
    name: 'L7',
    description: 'Geospatial visualization, maps, geographic data analysis',
    keywords: '',
    codeStyle: '',
  },
  x6: {
    id: 'x6' as AntVLibrary,
    name: 'X6',
    description: 'Graph editing, flowcharts, diagram creation tools',
    keywords: '',
    codeStyle: '',
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
  `,
    codeStyle: `
  <convention>
    - Use F2's components directly in JSX. If TypeScript errors occur, add @ts-ignore above the component
    - Code examples are for Node environment. For React framework, import ReactCanvas from '@antv/f2-react' and use <ReactCanvas/> component instead of <Canvas/> component
    - In F2's canvas coordinate system, Y coordinates increase from top to bottom, and X coordinates increase from left to right by default. Therefore, all values for offsetY, offsetX, x, y and similar properties are relative to the top-left corner of the canvas.
  </convention>
  `,
  },
  s2: {
    id: 's2' as AntVLibrary,
    name: 'S2',
    description: 'Table analysis, spreadsheet-like interactions, data grids',
    keywords: '',
    codeStyle: '',
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
  return ANTV_LIBRARY_META[library]?.keywords || '';
}
