'use strict';

/**
 * Sentinel.AI — Rate Limiter Middleware
 *
 * Uses express-rate-limit to prevent abuse of the costly LLM pipeline.
 * Config is read from environment variables set in config.js.
 */

const rateLimit    = require('express-rate-limit');
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } = require('../config/config');

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS, // default 60 seconds
  max:      RATE_LIMIT_MAX,       // default 30 requests per window
  standardHeaders: true,          // Return rate limit info in `RateLimit-*` headers
  legacyHeaders:   false,
  message: {
    status:  'error',
    code:    'RATE_LIMIT_EXCEEDED',
    message: `Too many requests. You may submit up to ${RATE_LIMIT_MAX} queries per minute.`,
  },
});

module.exports = limiter;
