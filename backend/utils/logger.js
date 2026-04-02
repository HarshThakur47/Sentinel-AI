'use strict';
const winston = require('winston');
const { NODE_ENV } = require('../config/config');

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${timestamp} [${level}] ${message}${metaStr}`;
});

const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: NODE_ENV === 'production'
    ? combine(timestamp(), json())
    : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

module.exports = logger;
