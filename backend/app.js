'use strict';

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');

const { FRONTEND_URL, NODE_ENV } = require('./config/config');
const queryRoutes                = require('./routes/queryRoutes');
const documentRoutes             = require('./routes/documentRoutes');
const rateLimiter                = require('./middleware/rateLimiter');
const errorHandler               = require('./middleware/errorHandler');
const logger                     = require('./utils/logger');

const app = express();

// ── Security Headers ────────────────────────────────────────────────────────
app.use(helmet());

const corsOptions = {
  origin:      FRONTEND_URL,
  credentials: true,
  methods:     ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));


app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false }));

const httpLogFormat = NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(httpLogFormat, {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));


app.use(rateLimiter);


app.use('/api/v1', queryRoutes);
app.use('/api/v1/documents', documentRoutes);


app.get('/', (req, res) => {
  res.json({
    service:  'Sentinel.AI Backend',
    version:  '1.0.0',
    status:   'running',
    docsHint: 'POST /api/v1/query  |  POST /api/v1/query/stream  |  GET /api/v1/health',
  });
});


app.use((req, res) => {
  res.status(404).json({
    status:  'error',
    code:    'NOT_FOUND',
    message: `Route ${req.method} ${req.path} does not exist.`,
  });
});


app.use(errorHandler);

module.exports = app;
