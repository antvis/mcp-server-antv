import { describe, expect, it } from 'vitest';
import {
  getLibraryConfig,
  ANTV_LIBRARY_META,
  CONTEXT7_TOKENS,
} from '../src/constant';

// Helper function to check if a library is valid
function isValidLibrary(library: string): boolean {
  return Object.keys(ANTV_LIBRARY_META).includes(library);
}

describe('context7', () => {
  it('isValidLibrary', () => {
    expect(isValidLibrary('g2')).toBe(true);
    expect(isValidLibrary('s2')).toBe(true);
    expect(isValidLibrary('f2')).toBe(true);
    expect(isValidLibrary('g6')).toBe(true);
    expect(isValidLibrary('x6')).toBe(true);
    expect(isValidLibrary('l7')).toBe(true);
    expect(isValidLibrary('unknown')).toBe(false);
  });

  it('getLibraryConfig', () => {
    expect(getLibraryConfig('g2')).toEqual({
      id: 'g2',
      name: 'G2',
      description:
        'Statistical charts, data visualization, business intelligence charts',
      keywords: '',
      codeStyle: '',
    });
  });

  it('ANTV_LIBRARY_META', () => {
    expect(Object.values(ANTV_LIBRARY_META).length).toBe(6);
  });

  it('CONTEXT7_TOKENS', () => {
    expect(CONTEXT7_TOKENS).toEqual({
      default: 5000,
      max: 20000,
      min: 1000,
    });
  });
});
