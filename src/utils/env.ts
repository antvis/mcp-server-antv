import process from "node:process";

/**
 * Get the `LOGGER_LEVEL` from environment variables.
 */
export function getEnvLoggerLevel(): number {
  const loggerLevel = process.env.LOGGER_LEVEL;
  return Number.isNaN(Number(loggerLevel)) ? 1 : Number(loggerLevel);
}
