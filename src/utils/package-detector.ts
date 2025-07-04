import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import type { AntVLibrary } from '../types/index.js';
import { Logger, LogLevel } from './logger.js';
import { LIBRARY_MAPPING } from '../config/index.js';

/**
 * List of AntV libraries
 */
const ANTV_LIBRARIES = Object.keys(LIBRARY_MAPPING) as AntVLibrary[];

/**
 * AntV package name mapping in package.json
 */
const PACKAGE_JSON_MAPPING: Record<string, AntVLibrary> = Object.fromEntries(
  ANTV_LIBRARIES.map((lib) => [`@antv/${lib}`, lib]),
) as Record<string, AntVLibrary>;

/**
 * AntV package name mapping in node_modules directory
 */
const NODE_MODULES_MAPPING: Record<string, AntVLibrary> = Object.fromEntries(
  ANTV_LIBRARIES.map((lib) => [lib, lib]),
) as Record<string, AntVLibrary>;

/**
 * Logger instance for package detection
 */
const logger = new Logger({
  level: LogLevel.INFO,
  prefix: 'PackageDetector',
});

/**
 * Cached dependencies to avoid repeated file system operations
 */
let cachedDependencies: Set<AntVLibrary> | null = null;

/**
 * Detect installed AntV libraries in the current working directory
 */
export function detectInstalledAntVLibraries(workingDir?: string): AntVLibrary[] {
  if (cachedDependencies) {
    return Array.from(cachedDependencies);
  }

  const baseDir = workingDir || process.cwd();
  const installedLibraries = new Set<AntVLibrary>();

  try {
    // Check dependencies in package.json
    checkPackageJsonDependencies(baseDir, installedLibraries);

    // Check node_modules directory
    checkNodeModules(baseDir, installedLibraries);

    cachedDependencies = installedLibraries;
    logDetectionResult(installedLibraries);

    return Array.from(installedLibraries);
  } catch (error) {
    logger.warn('Failed to detect installed AntV libraries:', error);
    return [];
  }
}

/**
 * Recommend the most suitable AntV library based on query content and installed libraries
 */
export function recommendLibrary(
  query: string,
  installedLibraries?: AntVLibrary[],
): AntVLibrary | null {
  const installed = installedLibraries || detectInstalledAntVLibraries();

  if (installed.length === 0) {
    // No AntV libraries installed, recommend based on query content
    return inferLibraryFromQuery(query);
  }

  // Choose the most suitable library from installed libraries based on query content
  const recommended = findBestMatch(query, installed);
  return recommended || installed[0];
}

/**
 * Infer the most suitable AntV library from query (without considering installed libraries)
 */
function inferLibraryFromQuery(query: string): AntVLibrary | null {
  const queryLower = query.toLowerCase();

  // Direct library name matching
  const libraryMatch = ANTV_LIBRARIES.find(
    (lib) => queryLower.includes(lib) || queryLower.includes(`@antv/${lib}`),
  );

  if (libraryMatch) {
    return libraryMatch;
  }

  // Return null when no explicit match is found, let the model infer
  return null;
}

/**
 * Find the best match among installed libraries
 */
function findBestMatch(
  query: string,
  installedLibraries: AntVLibrary[],
): AntVLibrary | null {
  const queryLower = query.toLowerCase();

  // Exact match: query explicitly mentions a specific library
  for (const lib of installedLibraries) {
    if (queryLower.includes(lib) || queryLower.includes(`@antv/${lib}`)) {
      return lib;
    }
  }

  return null;
}

/**
 * Check dependencies in package.json
 */
function checkPackageJsonDependencies(
  baseDir: string,
  installedLibraries: Set<AntVLibrary>,
): void {
  const packageJson = readPackageJson(join(baseDir, 'package.json'));
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
 * Read package.json file
 */
function readPackageJson(packageJsonPath: string): any {
  try {
    const content = readFileSync(packageJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.debug(`Failed to read ${packageJsonPath}:`, error);
    return null;
  }
}

/**
 * Check AntV libraries in node_modules directory
 */
function checkNodeModules(
  baseDir: string,
  installedLibraries: Set<AntVLibrary>,
): void {
  const nodeModulesPath = join(baseDir, 'node_modules');

  if (!existsSync(nodeModulesPath)) return;

  try {
    // Check @antv directory
    checkAntvDirectory(nodeModulesPath, installedLibraries);

    // Check direct package names
    checkDirectPackages(nodeModulesPath, installedLibraries);
  } catch (error) {
    logger.debug('Failed to check node_modules:', error);
  }
}

/**
 * Check @antv directory
 */
function checkAntvDirectory(
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
    logger.debug('Failed to read @antv directory:', error);
  }
}

/**
 * Check direct package names
 */
function checkDirectPackages(
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
 * Log detection results
 */
function logDetectionResult(installedLibraries: Set<AntVLibrary>): void {
  if (installedLibraries.size > 0) {
    logger.info(
      `Detected installed AntV libraries: ${Array.from(installedLibraries).join(', ')}`,
    );
  } else {
    logger.info('No AntV libraries detected in project');
  }
}

/**
 * Clear the cached dependencies
 */
export function clearCache(): void {
  cachedDependencies = null;
}
