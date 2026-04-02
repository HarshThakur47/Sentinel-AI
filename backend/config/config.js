'use strict';
require('dotenv').config();

module.exports = {
  // ── Server ──────────────────────────────────────────────
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ── CORS ─────────────────────────────────────────────────
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // ── Rate Limiting ────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000,
  RATE_LIMIT_MAX:       parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 30,

  // ── OpenRouter LLM API ───────────────────────────────────
  OPENROUTER_API_KEY:  process.env.OPENROUTER_API_KEY  || '',
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',

  // ── Agent Models ─────────────────────────────────────────
  FILTER_AGENT_MODEL:    process.env.FILTER_AGENT_MODEL    || 'meta-llama/llama-3.3-70b-instruct',
  GENERATOR_AGENT_MODEL: process.env.GENERATOR_AGENT_MODEL || 'anthropic/claude-3-haiku',
  EVALUATOR_AGENT_MODEL: process.env.EVALUATOR_AGENT_MODEL || 'google/gemini-2.0-flash-001',

  // ── Pinecone Vector DB ───────────────────────────────────
  PINECONE_API_KEY:     process.env.PINECONE_API_KEY     || '',
  PINECONE_INDEX_NAME:  process.env.PINECONE_INDEX_NAME  || 'sentinel-docs',
  PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT || 'us-east-1',

  // ── Embeddings ───────────────────────────────────────────
  OPENAI_API_KEY:   process.env.OPENAI_API_KEY   || '',
  EMBEDDING_MODEL:  process.env.EMBEDDING_MODEL  || 'text-embedding-3-small',
};
