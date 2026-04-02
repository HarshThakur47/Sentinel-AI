# 🛡️ Sentinel.AI — Backend

> Multi-Agent RAG Pipeline for reducing AI hallucinations in high-stakes environments.

Built at Chitkara University as a production-ready demonstration of a **3-tier verification architecture** where separate LLMs independently filter, generate, and evaluate responses.

---

## 📐 Architecture

```
User Query
    │
    ▼
┌───────────────────────┐
│  Vector Database       │  Pinecone (or mock)
│  Similarity Search     │  Embedding: text-embedding-3-small
└──────────┬────────────┘
           │  Top-K documents
           ▼
┌───────────────────────┐
│  🔍 Filter Agent       │  Model: Llama 3.1 8B (Tier 1)
│  Relevance & Safety    │  Removes irrelevant/dangerous docs
└──────────┬────────────┘
           │  Filtered documents
           ▼
┌───────────────────────┐
│  ✍️ Generator Agent     │  Model: Claude Sonnet (Tier 2)
│  Grounded synthesis    │  Answers ONLY from source docs
└──────────┬────────────┘
           │  Draft answer
           ▼
┌───────────────────────┐
│  ✅ Evaluator Agent     │  Model: Gemini 1.5 Pro (Tier 3)
│  Fact-check + score    │  Confidence 0–10, can refine
└──────────┬────────────┘
           │
           ▼
    Final Response
    { answer, confidenceScore, sources, status }
```

---

## 📁 Folder Structure

```
backend/
├── server.js                  # Entry point — HTTP listener
├── app.js                     # Express app assembly
├── package.json
├── .env                       # Environment variables (gitignored)
├── .env.example               # Template for .env
│
├── config/
│   └── config.js              # Central config from env
│
├── routes/
│   └── queryRoutes.js         # /api/v1/query, /stream, /health
│
├── controllers/
│   └── queryController.js     # Request handlers + SSE
│
├── services/
│   ├── ragPipelineService.js  # Orchestrates the 4-step pipeline
│   └── vectorDbService.js     # Pinecone + embeddings + mock
│
├── agents/
│   ├── filterAgent.js         # Tier 1 — Llama 3.1 8B
│   ├── generatorAgent.js      # Tier 2 — Claude Sonnet
│   └── evaluatorAgent.js      # Tier 3 — Gemini 1.5 Pro
│
├── middleware/
│   ├── errorHandler.js        # Global error handler
│   └── rateLimiter.js         # Per-IP rate limiting
│
├── utils/
│   ├── logger.js              # Winston logger
│   ├── llmClient.js           # OpenRouter API wrapper
│   └── AppError.js            # Custom error class
│
├── tests/
│   └── test-pipeline.js       # Integration tests
│
└── logs/                      # Auto-created log files
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
# Copy the example and fill in your keys
cp .env.example .env
```

**Minimum required**: Set `OPENROUTER_API_KEY` from [openrouter.ai/keys](https://openrouter.ai/keys)

Everything else has sensible defaults. Without Pinecone/OpenAI keys, the system automatically uses **mock documents** — perfect for development and demos.

### 3. Start the Server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

The server starts at `http://localhost:5000`.

### 4. Run Tests

```bash
npm test
```

Tests run in mock mode and require **no API keys**.

---

## 📡 API Reference

### `GET /api/v1/health`

Health check.

**Response:**

```json
{
  "status": "healthy",
  "service": "Sentinel.AI Backend",
  "version": "1.0.0",
  "timestamp": "2026-04-01T18:30:00.000Z",
  "uptime": "42s"
}
```

---

### `POST /api/v1/query`

Standard JSON request/response.

**Request:**

```json
{
  "userQuery": "What are the side effects of Metformin?"
}
```

**Response:**

```json
{
  "answer": "Based on the available sources, Metformin...",
  "confidenceScore": 8,
  "sources": [
    { "id": "mock-001", "title": "Medical Reference: Metformin Side Effects" },
    { "id": "mock-002", "title": "Clinical Guidelines: Diabetes Management" }
  ],
  "status": "success",
  "metadata": {
    "durationMs": 4200,
    "filterSummary": "Removed 1 irrelevant document.",
    "removedCount": 1,
    "evaluationSummary": "Answer is fully grounded in sources.",
    "isAccurate": true,
    "refinementNeeded": false,
    "rawDocCount": 5,
    "filteredDocCount": 4
  }
}
```

---

### `POST /api/v1/query/stream`

Server-Sent Events (SSE) streaming. Same request body.

**SSE Events:**

| Event    | Data                                  | Description              |
| -------- | ------------------------------------- | ------------------------ |
| `step`   | `{ step, message, timestamp }`        | Pipeline progress update |
| `result` | Full response object (same as /query) | Final answer             |
| `error`  | `{ message, code }`                   | If pipeline fails        |
| `done`   | `{}`                                  | Stream complete          |

**Step values:** `searching` → `filtering` → `generating` → `evaluating` → `complete`

---

## 🔑 Environment Variables

| Variable                  | Required | Default                                 | Description                      |
| ------------------------- | -------- | --------------------------------------- | -------------------------------- |
| `PORT`                    | No       | `5000`                                  | Server port                      |
| `NODE_ENV`                | No       | `development`                           | `development` or `production`    |
| `OPENROUTER_API_KEY`      | **Yes**  | —                                       | OpenRouter API key for LLM calls |
| `OPENROUTER_BASE_URL`     | No       | `https://openrouter.ai/api/v1`          | OpenRouter base URL              |
| `FILTER_AGENT_MODEL`      | No       | `meta-llama/llama-3.3-70b-instruct`   | Tier 1 model                     |
| `GENERATOR_AGENT_MODEL`   | No       | `anthropic/claude-3-haiku`            | Tier 2 model                     |
| `EVALUATOR_AGENT_MODEL`   | No       | `google/gemini-2.0-flash-001`         | Tier 3 model                     |
| `PINECONE_API_KEY`        | No       | —                                       | Pinecone key (mock if empty)     |
| `PINECONE_INDEX_NAME`     | No       | `sentinel-docs`                         | Pinecone index name              |
| `OPENAI_API_KEY`          | No       | —                                       | For embeddings (mock if empty)   |
| `FRONTEND_URL`            | No       | `http://localhost:5173`                 | CORS allowed origin              |
| `RATE_LIMIT_WINDOW_MS`    | No       | `60000`                                 | Rate limit window (ms)           |
| `RATE_LIMIT_MAX_REQUESTS` | No       | `30`                                    | Max requests per window          |

---

## 🧪 Mock Mode

When `PINECONE_API_KEY` or `OPENAI_API_KEY` are not set, the vector DB automatically falls back to **built-in mock documents** covering:

- Metformin side effects and drug interactions
- Diabetes management guidelines
- AI reliability in healthcare
- Legal AI citation errors

This lets you demo and develop the full pipeline without any external dependencies. Just set your `OPENROUTER_API_KEY` and the three LLM agents will work against the mock knowledge base.

---

## 🔒 Security Features

- **Helmet** — Secure HTTP headers
- **CORS** — Locked to frontend origin
- **Rate Limiting** — Protect expensive LLM endpoints
- **Input Validation** — Query length limits, type checks
- **Error Sanitization** — No stack traces in production
- **Request Logging** — Morgan + Winston with file output

---

## 📝 License

This project is part of academic research at Chitkara University.
