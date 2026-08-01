import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

const logDir = process.env.LOG_DIR || path.resolve(process.cwd(), 'logs');

const format = winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
  const rid = requestId ? ` [${requestId}]` : '';
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${level.toUpperCase().padEnd(5)}${rid} ${message}${metaStr}`;
});

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(winston.format.colorize(), format),
});

const transports: winston.transport[] = [consoleTransport];

try {
  fs.mkdirSync(logDir, { recursive: true });
  const file = (name: string, level?: string) =>
    new winston.transports.File({
      filename: path.join(logDir, name),
      level,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    });
  transports.push(file('error.log', 'error'));
  transports.push(file('combined.log'));
} catch {
  /* read-only filesystem (serverless): keep console-only logging */
}

export const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    format,
  ),
  transports,
});
