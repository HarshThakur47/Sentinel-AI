'use strict';

/**
 * Sentinel.AI — Server Entry Point
 *
 * Orchestrates startup, wraps the Express app, and handles
 * graceful shutdown on SIGINT / SIGTERM.
 */

const app    = require('./app');
const logger = require('./utils/logger');
const { PORT, NODE_ENV } = require('./config/config');

// ── Validate critical environment ─────────────────────────────────────────────
(function validateEnv() {
  const { OPENROUTER_API_KEY } = require('./config/config');
  if (!OPENROUTER_API_KEY) {
    logger.warn('⚠️  OPENROUTER_API_KEY is not set. LLM calls will fail against real models.');
  }
  logger.info(`🚀  Sentinel.AI starting in [${NODE_ENV}] mode on port ${PORT}`);
})();

// ── Start HTTP Server ─────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info('─'.repeat(55));
  logger.info(`  🛡️  Sentinel.AI Backend`);
  logger.info(`  ✅  Server        : http://localhost:${PORT}`);
  logger.info(`  📡  Query API     : POST http://localhost:${PORT}/api/v1/query`);
  logger.info(`  📺  SSE Stream    : POST http://localhost:${PORT}/api/v1/query/stream`);
  logger.info(`  💓  Health check  : GET  http://localhost:${PORT}/api/v1/health`);
  logger.info('─'.repeat(55));
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
function gracefulShutdown(signal) {
  logger.info(`[Server] ${signal} received — shutting down gracefully...`);
  server.close(() => {
    logger.info('[Server] HTTP server closed. Goodbye.');
    process.exit(0);
  });

  // Force-quit after 10 seconds if connections linger
  setTimeout(() => {
    logger.error('[Server] Could not close connections in time — forcing exit.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ── Unhandled Rejections & Exceptions ────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('[Process] Unhandled Rejection', { reason: reason?.message || reason });
});

process.on('uncaughtException', (err) => {
  logger.error('[Process] Uncaught Exception — shutting down', { error: err.message, stack: err.stack });
  process.exit(1);
});

module.exports = server;
