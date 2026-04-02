'use strict';

/**
 * Sentinel.AI — AppError
 *
 * Operational errors that should produce structured HTTP responses.
 * Programming errors (unexpected) are left to crash-handler middleware.
 */
class AppError extends Error {
  /**
   * @param {string} message   – Human-readable message
   * @param {number} statusCode – HTTP status code
   * @param {string} [code]    – Machine-readable error code
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name       = 'AppError';
    this.statusCode = statusCode;
    this.code       = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
