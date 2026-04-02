'use strict';

const express = require('express');
const { handleQuery, handleQueryStream, handleHealth } = require('../controllers/queryController');

const router = express.Router();

// ── Health ──────────────────────────────────────────────────────────────────
// GET /api/v1/health
router.get('/health', handleHealth);

// ── Standard Query ──────────────────────────────────────────────────────────
// POST /api/v1/query
// Body: { userQuery: string }
// Returns: { answer, confidenceScore, sources, status, metadata }
router.post('/query', handleQuery);

// ── SSE Streaming Query ─────────────────────────────────────────────────────
// POST /api/v1/query/stream
// Body: { userQuery: string }
// Returns: SSE stream with step/result/error/done events
router.post('/query/stream', handleQueryStream);

module.exports = router;
