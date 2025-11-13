import type { AntVLibrary } from './types';

// AntV Libraries Metadata
export const ANTV_LIBRARY_META = {
  g2: {
    id: 'g2' as AntVLibrary,
    name: 'G2',
    description:
      'Statistical charts, data visualization, business intelligence charts',
    keywords: `
- 图表 (Chart)
- 标记 (Mark)
- 比例尺 (Scale)
- 转换 (Transform)
- 坐标系 (Coordinate)
- 动画 (Animate)
- 交互 (Interaction)
- 复合 (Composition)
- 组件 (Component)
- 编码 (Encode)
- 通道 (Channel)
- 提示信息 (Tooltip)
- 坐标轴 (Axis)
- 数据标签 (Label)
- 标注（Annotation）
- 配置项 (Options)
    `,
    codeStyle: `
    <convention>
    - Prioritize using options() method to configure charts
    </convention>
  `,
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
    - Use F2's components directly in JSX. If TypeScript errors occur, add @ts-ignore above the component.
    - Code examples are for Node environment. For React framework, import ReactCanvas from '@antv/f2-react' and use <ReactCanvas/> component instead of <Canvas/> component.
    - In F2's canvas coordinate system, Y coordinates increase from top to bottom, and X coordinates increase from left to right by default. Therefore, all values for offsetY, offsetX, x, y and similar properties are relative to the top-left corner of the canvas.
    - **CRITICAL: The top-level scope does not support \`await\`. You MUST handle asynchronous operations like \`canvas.render()\` according to the following logic:**
      - **If \`canvas.render()\` is the final action and nothing follows it, you MUST remove the \`await\` keyword.**
        - **WRONG:** \`await canvas.render();\`
        - **CORRECT:** \`canvas.render();\`
      - **If there is any code that must run *after* \`canvas.render()\` completes, you MUST wrap the \`await\` and all subsequent code in an \`async\` IIFE (Immediately Invoked Function Expression).**
        - **WRONG:**
          \`\`\`javascript
          await canvas.render();
          console.log('Render complete.');
          \`\`\`
        - **CORRECT:**
          \`\`\`javascript
          (async () => {
            await canvas.render();
            console.log('Render complete.');
          })();
          \`\`\`
  </convention>
  `,
  },
  s2: {
    id: 's2' as AntVLibrary,
    name: 'S2',
    description: 'Table analysis, spreadsheet-like interactions, data grids',
    keywords: `
<components>
  - 基础透视表 (Basic Pivot Table)
  - 自定义单元格 (Custom Cell)
  - 表组件 (Sheet Component)
  - 字段标记 (Field Marking)
  - 多行文本 (Multi-line Text)
  - 分页 (Pagination)
  - 排序 (Sorting)
  - 透视表模式 (Pivot Mode)
  - 明细表模式 (Table Mode)
  - 下钻功能 (Drill Down)
  - 导出功能 (Export)
  - 分页组件 (Pagination Component)
  - 表格组件 (Sheet Component)
  - 合并单元格 (Merged Cell)
  - 迷你图表 (Mini Chart)
  - 冻结 (Frozen)
  - 头部操作图标 (Header Action Icon)
  - 复制导出 (Copy Export)
  - 单元格对齐 (Cell Alignment)
  - 获取单元格数据 (Get Cell Data)
  - 获取实例 (Get Instance)
  - 编辑表 (Editable Table)
  - 趋势分析表 (Strategy Table)
  - 趋势分析 (Strategy Analysis)
  - 透视表 (Pivot Table)
  - 明细表 (Table)
  - 树状结构 (Tree Structure)
  - 展开/折叠 (Expand/Collapse)
  - 刷选 (Brush Selection)
  - 单选 (Single Selection)
  - 多选 (Multiple Selection)
  - 行选/列选 (Row/Column Selection)
  - 区间选择 (Range Selection)
  - 悬停高亮 (Hover Highlight)
  - 复制功能 (Copy Function)
  - 隐藏列头 (Hide Column Header)
  - 链接跳转 (Link Jump)
  - 事件处理 (Event Handling)
  - 单元格渲染 (Cell Rendering)
  - 透视图表 (Pivot Chart)
</components>
    `,
    codeStyle: `
      <convention>
    - **Default to using the core \`@antv/s2\` package** for simple pivot tables or tables without complex interactions. If the user's request can be fulfilled with a basic \`PivotSheet\` or \`TableSheet\` instance, do not use a framework-specific wrapper.
    - **You MUST use the \`@antv/s2-react\` package and its \`SheetComponent\`** if the user's request involves advanced features such as building a trend analysis table (e.g., with in-cell mini charts), an editable table, or requires pre-built analysis components like \`Switch\` or \`Export\`.
    - **The \`@antv/s2-vue\` library is unmaintained and MUST NOT be used.** For Vue.js implementations, you MUST generate code that manually wraps the core \`@antv/s2\` package within a standard Vue component.
  </convention>
    `,
  },
  g: {
    id: 'g' as AntVLibrary,
    name: 'G',
    description: 'AntV Grammar of Graphics runtime and specification',
    keywords: '',
    codeStyle: '',
  },
  ava: {
    id: 'ava' as AntVLibrary,
    name: 'AVA',
    description:
      'Automated Visual Analytics: chart advisor, insight, narrative',
    keywords: '',
    codeStyle: '',
  },
  adc: {
    id: 'adc' as AntVLibrary,
    name: 'ADC',
    description:
      'Ant Design Charts built on G2 for React and modern frameworks',
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
