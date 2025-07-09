import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { getEnvLoggerLevel } from '../../src/utils';

describe('env', () => {
  it('getEnvLoggerLevel', () => {
    expect(getEnvLoggerLevel()).toBe(1);
    process.env.LOGGER_LEVEL = '0';
    expect(getEnvLoggerLevel()).toBe(0);
    process.env.LOGGER_LEVEL = '2';
    expect(getEnvLoggerLevel()).toBe(2);
  });
});
