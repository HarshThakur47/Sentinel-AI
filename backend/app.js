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

// Provide an array of all acceptable origins
const allowedOrigins = [
  FRONTEND_URL,                               // The exact string from your config
  'https://sentinel-ai-fawn-nine.vercel.app', // Your live Vercel frontend (no slash)
  'https://sentinel-ai-fawn-nine.vercel.app/',// Your live Vercel frontend (with slash)
  'http://localhost:5173',                    // Vite local development
  'http://localhost:3000'                     // CRA local development
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or your Render health pings)
    if (!origin) return callback(null, true);
    
    // Check if the incoming origin is in our allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
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
