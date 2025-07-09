import { getEnvLoggerLevel } from './env';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Logger class for logging messages with different severity levels.
 * Supports colorized output in the console and customizable log levels.
 */
export class Logger {
  private level: LogLevel;
  private prefix: string;
  private enableColors: boolean;

  constructor(level = LogLevel.INFO, prefix = '', enableColors = true) {
    this.level = level;
    this.prefix = prefix;
    this.enableColors = enableColors;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    const prefixStr = this.prefix ? `[${this.prefix}] ` : '';
    return `${timestamp} ${prefixStr}[${level}] ${message}`;
  }

  private colorize(text: string, color: string): string {
    if (!this.enableColors) return text;

    const colors: Record<string, string> = {
      reset: '\x1b[0m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      gray: '\x1b[90m',
    };

    return `${colors[color] || ''}${text}${colors.reset}`;
  }

  /**
   * Logs a debug message.
   * @param message The message to log.
   * @param args Additional arguments to include in the log.
   */
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      const formatted = this.formatMessage('DEBUG', message);
      console.debug(this.colorize(formatted, 'gray'), ...args);
    }
  }

  /**
   * Logs an info message.
   * @param message The message to log.
   * @param args Additional arguments to include in the log.
   */
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      const formatted = this.formatMessage('INFO', message);
      console.info(this.colorize(formatted, 'blue'), ...args);
    }
  }

  /**
   * Logs a warning message.
   * @param message The message to log.
   * @param args Additional arguments to include in the log.
   */
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      const formatted = this.formatMessage('WARN', message);
      console.warn(this.colorize(formatted, 'yellow'), ...args);
    }
  }

  /**
   * Logs an error message.
   * @param message The message to log.
   * @param args Additional arguments to include in the log.
   */
  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      const formatted = this.formatMessage('ERROR', message);
      console.error(this.colorize(formatted, 'red'), ...args);
    }
  }
}

/**
 * Logger instance for the MCP Server AntV.
 * Uses the environment variable `LOGGER_LEVEL` to set the log level.
 */
export const logger = new Logger(
  getEnvLoggerLevel() as unknown as LogLevel,
  'MCPServerAntV',
  true,
);
