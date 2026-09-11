import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
      if (stack) return `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`;
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error', maxsize: 5 * 1024 * 1024 }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log'), maxsize: 5 * 1024 * 1024 }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}] ${message}`)
      )
    })
  ]
});

export default logger;
