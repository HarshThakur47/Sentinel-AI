'use strict';

/**
 * Sentinel.AI — Query Controller
 *
 * Handles two routes:
 *   POST /api/v1/query        → standard JSON response
 *   POST /api/v1/query/stream → SSE streaming response
 */

const { runRagPipeline } = require('../services/ragPipelineService');
const AppError           = require('../utils/AppError');
const logger             = require('../utils/logger');

// ─── Input Validation ─────────────────────────────────────────────────────────

function validateQuery(userQuery) {
  if (typeof userQuery !== 'string') {
    throw new AppError('Field "userQuery" must be a string.', 400, 'INVALID_INPUT');
  }
  const trimmed = userQuery.trim();
  if (trimmed.length === 0) {
    throw new AppError('Query cannot be empty.', 400, 'EMPTY_QUERY');
  }
  if (trimmed.length > 1000) {
    throw new AppError('Query must be 1000 characters or fewer.', 400, 'QUERY_TOO_LONG');
  }
  return trimmed;
}

// ─── Standard JSON Handler ────────────────────────────────────────────────────

/**
 * POST /api/v1/query
 *
 * Request body : { userQuery: string }
 * Response     : { answer, confidenceScore, sources, status, metadata }
 */
async function handleQuery(req, res, next) {
  try {
    const query = validateQuery(req.body?.userQuery);
    logger.info(`[QueryController] New query: "${query.slice(0, 80)}..."`);

    const result = await runRagPipeline(query);

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// ─── SSE Streaming Handler ────────────────────────────────────────────────────

/**
 * POST /api/v1/query/stream
 *
 * Opens an SSE connection and emits step-by-step progress events,
 * then sends the final result and closes the stream.
 *
 * SSE event format:
 *   event: step
 *   data: { step, message }
 *
 *   event: result
 *   data: { answer, confidenceScore, sources, status, metadata }
 *
 *   event: error
 *   data: { message, code }
 */
async function handleQueryStream(req, res, next) {
  try {
    const query = validateQuery(req.body?.userQuery);
    logger.info(`[QueryController][SSE] Streaming query: "${query.slice(0, 80)}..."`);

    // ── Configure SSE headers ────────────────────────────────
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    res.flushHeaders();

    // Helper to send an SSE event
    const sendEvent = (eventName, payload) => {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      // Flush if supported (compression middleware)
      if (typeof res.flush === 'function') res.flush();
    };

    // Progress callback → SSE step events
    const onProgress = (step, message) => {
      sendEvent('step', { step, message, timestamp: new Date().toISOString() });
    };

    // Handle client disconnect
    req.on('close', () => {
      logger.debug('[QueryController][SSE] Client disconnected early.');
    });

    // ── Run pipeline ─────────────────────────────────────────
    const result = await runRagPipeline(query, onProgress);

    // ── Send final result ────────────────────────────────────
    sendEvent('result', result);
    res.write('event: done\ndata: {}\n\n');
    res.end();
  } catch (err) {
    logger.error('[QueryController][SSE] Pipeline error', { error: err.message });

    // If headers already sent, use SSE error event
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message, code: err.code || 'PIPELINE_ERROR' })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
}

// ─── Health / Status ──────────────────────────────────────────────────────────

/**
 * GET /api/v1/health
 */
function handleHealth(req, res) {
  res.status(200).json({
    status:    'healthy',
    service:   'Sentinel.AI Backend',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  });
}

module.exports = { handleQuery, handleQueryStream, handleHealth };
