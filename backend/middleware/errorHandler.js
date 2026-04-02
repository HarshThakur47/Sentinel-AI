'use strict';

/**
 * Sentinel.AI — Global Error Handler Middleware
 *
 * Must be registered LAST, after all routes.
 * Handles both operational AppErrors and unexpected programming errors.
 */

const logger   = require('../utils/logger');
const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Operational errors: safe to expose message to client
  if (err instanceof AppError && err.isOperational) {
    logger.warn(`[ErrorHandler] Operational error: ${err.message}`, {
      code:       err.code,
      statusCode: err.statusCode,
      path:       req.path,
    });

    return res.status(err.statusCode).json({
      status:  'error',
      code:    err.code,
      message: err.message,
    });
  }

  // Programming / unexpected errors: don't leak details in production
  logger.error('[ErrorHandler] Unexpected error', {
    message: err.message,
    stack:   err.stack,
    path:    req.path,
  });

  const isProd    = process.env.NODE_ENV === 'production';
  const message   = isProd ? 'An internal server error occurred.' : err.message;

  return res.status(500).json({
    status:  'error',
    code:    'INTERNAL_ERROR',
    message,
    ...(isProd ? {} : { stack: err.stack }),
  });
}

module.exports = errorHandler;
