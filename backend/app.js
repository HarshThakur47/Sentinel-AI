'use strict';

/**
 * Sentinel.AI — Express Application
 *
 * Registers all middleware, routes, and the global error handler.
 * Kept separate from server.js so it's easily testable.
 */

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');

const { FRONTEND_URL, NODE_ENV } = require('./config/config');
const queryRoutes                = require('./routes/queryRoutes');
const rateLimiter                = require('./middleware/rateLimiter');
const errorHandler               = require('./middleware/errorHandler');
const logger                     = require('./utils/logger');

const app = express();

// ── Security Headers ────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin:      FRONTEND_URL,
  credentials: true,
  methods:     ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Pre-flight

// ── Body Parser ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false }));

// ── HTTP Request Logging ────────────────────────────────────────────────────
const httpLogFormat = NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(httpLogFormat, {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ── Rate Limiting (applies to all routes) ───────────────────────────────────
app.use(rateLimiter);

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', queryRoutes);

// ── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service:  'Sentinel.AI Backend',
    version:  '1.0.0',
    status:   'running',
    docsHint: 'POST /api/v1/query  |  POST /api/v1/query/stream  |  GET /api/v1/health',
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    status:  'error',
    code:    'NOT_FOUND',
    message: `Route ${req.method} ${req.path} does not exist.`,
  });
});

// ── Global Error Handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
