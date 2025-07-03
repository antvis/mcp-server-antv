import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import type { AntVLibrary } from '../types/index.js';
import { Logger, LogLevel } from './logger.js';
import { LIBRARY_MAPPING } from '../config/index.js';

/**
 * AntV库列表
 */
const ANTV_LIBRARIES = Object.keys(LIBRARY_MAPPING) as AntVLibrary[];

/**
 * package.json中的AntV包名映射
 */
const PACKAGE_JSON_MAPPING: Record<string, AntVLibrary> = Object.fromEntries(
  ANTV_LIBRARIES.map((lib) => [`@antv/${lib}`, lib]),
) as Record<string, AntVLibrary>;

/**
 * node_modules目录中的AntV包名映射
 */
const NODE_MODULES_MAPPING: Record<string, AntVLibrary> = Object.fromEntries(
  ANTV_LIBRARIES.map((lib) => [lib, lib]),
) as Record<string, AntVLibrary>;

/**
 * 功能特征匹配规则，待优化
 */
const FEATURE_PATTERNS: Record<AntVLibrary, RegExp> = {
  g2: /图表|chart|柱状图|折线图|饼图|散点图|条形图|bar|line|pie|scatter|area|histogram/i,
  g6: /网络图|关系图|流程图|组织架构|图分析|节点|边|graph|network|node|edge|关系/i,
  l7: /地图|地理|gis|经纬度|坐标|位置|区域|地理可视化|map|geo/i,
  x6: /流程图|编辑|拖拽|连线|画布|diagram|editor|flowchart|拖拽编辑/i,
  f2: /移动端|手机|mobile|touch|触摸|小程序|app/i,
  s2: /表格|透视表|table|pivot|行列|单元格|排序|筛选/i,
};

/**
 * 项目依赖检测器
 */
export class PackageDetector {
  private readonly logger: Logger;
  private cachedDependencies: Set<AntVLibrary> | null = null;

  constructor() {
    this.logger = new Logger({
      level: LogLevel.INFO,
      prefix: 'PackageDetector',
    });
  }

  /**
   * 检测当前工作目录中已安装的AntV库
   */
  detectInstalledAntVLibraries(workingDir?: string): AntVLibrary[] {
    if (this.cachedDependencies) {
      return Array.from(this.cachedDependencies);
    }

    const baseDir = workingDir || process.cwd();
    const installedLibraries = new Set<AntVLibrary>();

    try {
      // 检查package.json中的依赖
      this.checkPackageJsonDependencies(baseDir, installedLibraries);

      // 检查node_modules目录
      this.checkNodeModules(baseDir, installedLibraries);

      this.cachedDependencies = installedLibraries;
      this.logDetectionResult(installedLibraries);

      return Array.from(installedLibraries);
    } catch (error) {
      this.logger.warn('Failed to detect installed AntV libraries:', error);
      return [];
    }
  }

  /**
   * 根据查询内容和已安装库推荐最合适的AntV库
   */
  recommendLibrary(
    query: string,
    installedLibraries?: AntVLibrary[],
  ): AntVLibrary | null {
    const installed = installedLibraries || this.detectInstalledAntVLibraries();

    if (installed.length === 0) {
      // 没有安装任何AntV库，根据查询内容推荐
      return this.inferLibraryFromQuery(query);
    }

    // 根据查询内容在已安装的库中选择最合适的
    const recommended = this.findBestMatch(query, installed);
    return recommended || installed[0];
  }

  /**
   * 从查询中推断最适合的AntV库（不考虑已安装库）
   */
  private inferLibraryFromQuery(query: string): AntVLibrary | null {
    const queryLower = query.toLowerCase();

    // 直接库名匹配
    const libraryMatch = ANTV_LIBRARIES.find(
      (lib) => queryLower.includes(lib) || queryLower.includes(`@antv/${lib}`),
    );

    if (libraryMatch) {
      return libraryMatch;
    }

    // 功能特征匹配
    const featureMatches = this.matchFeaturesToLibraries(query);
    return featureMatches[0] || 'g2'; // 默认推荐G2
  }

  /**
   * 在已安装库中找到最佳匹配
   */
  private findBestMatch(
    query: string,
    installedLibraries: AntVLibrary[],
  ): AntVLibrary | null {
    const queryLower = query.toLowerCase();

    // 精确匹配：查询中明确提到某个库
    for (const lib of installedLibraries) {
      if (queryLower.includes(lib) || queryLower.includes(`@antv/${lib}`)) {
        return lib;
      }
    }

    // 根据功能特征匹配
    const featureMatches = this.matchFeaturesToLibraries(query);
    for (const lib of featureMatches) {
      if (installedLibraries.includes(lib)) {
        return lib;
      }
    }

    return null;
  }

  /**
   * 根据功能特征匹配对应的AntV库
   */
  private matchFeaturesToLibraries(query: string): AntVLibrary[] {
    return ANTV_LIBRARIES.filter((lib) => FEATURE_PATTERNS[lib].test(query));
  }

  /**
   * 检查package.json中的依赖
   */
  private checkPackageJsonDependencies(
    baseDir: string,
    installedLibraries: Set<AntVLibrary>,
  ): void {
    const packageJson = this.readPackageJson(join(baseDir, 'package.json'));
    if (!packageJson) return;

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const packageName of Object.keys(allDeps)) {
      if (packageName in PACKAGE_JSON_MAPPING) {
        installedLibraries.add(PACKAGE_JSON_MAPPING[packageName]);
      }
    }
  }

  /**
   * 读取package.json文件
   */
  private readPackageJson(packageJsonPath: string): any {
    try {
      const content = readFileSync(packageJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      this.logger.debug(`Failed to read ${packageJsonPath}:`, error);
      return null;
    }
  }

  /**
   * 检查node_modules目录中的AntV库
   */
  private checkNodeModules(
    baseDir: string,
    installedLibraries: Set<AntVLibrary>,
  ): void {
    const nodeModulesPath = join(baseDir, 'node_modules');

    if (!existsSync(nodeModulesPath)) return;

    try {
      // 检查@antv目录
      this.checkAntvDirectory(nodeModulesPath, installedLibraries);

      // 检查直接的包名
      this.checkDirectPackages(nodeModulesPath, installedLibraries);
    } catch (error) {
      this.logger.debug('Failed to check node_modules:', error);
    }
  }

  /**
   * 检查@antv目录
   */
  private checkAntvDirectory(
    nodeModulesPath: string,
    installedLibraries: Set<AntVLibrary>,
  ): void {
    const antvPath = join(nodeModulesPath, '@antv');

    if (!existsSync(antvPath)) return;

    try {
      const antvDirs = readdirSync(antvPath);
      for (const dir of antvDirs) {
        if (dir in NODE_MODULES_MAPPING) {
          installedLibraries.add(NODE_MODULES_MAPPING[dir]);
        }
      }
    } catch (error) {
      this.logger.debug('Failed to read @antv directory:', error);
    }
  }

  /**
   * 检查直接的包名
   */
  private checkDirectPackages(
    nodeModulesPath: string,
    installedLibraries: Set<AntVLibrary>,
  ): void {
    for (const packageName of Object.keys(NODE_MODULES_MAPPING)) {
      const packagePath = join(nodeModulesPath, packageName);
      if (existsSync(packagePath)) {
        installedLibraries.add(NODE_MODULES_MAPPING[packageName]);
      }
    }
  }

  /**
   * 记录检测结果
   */
  private logDetectionResult(installedLibraries: Set<AntVLibrary>): void {
    if (installedLibraries.size > 0) {
      this.logger.info(
        `Detected installed AntV libraries: ${Array.from(installedLibraries).join(', ')}`,
      );
    } else {
      this.logger.info('No AntV libraries detected in project');
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cachedDependencies = null;
  }
}

/**
 * 全局单例实例
 */
export const packageDetector = new PackageDetector();
