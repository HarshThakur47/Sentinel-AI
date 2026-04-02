# ⚙️ Sentinel.AI — Backend Documentation

## Overview

The backend is a **Node.js + Express** REST API server that implements the Multi-Agent RAG (Retrieval-Augmented Generation) pipeline. It receives user queries from the frontend, orchestrates three independent AI agents through a verification pipeline, and returns grounded responses from either the knowledge base or general AI knowledge, along with confidence scores.

**Tech Stack**: Node.js, Express 4, OpenRouter API, Pinecone (optional), Winston, Helmet, CORS

---

## 📁 File Structure & Module Responsibilities

```
backend/
├── server.js                    # Entry point — HTTP listener, shutdown
├── app.js                       # Express middleware assembly
├── .env / .env.example          # Environment configuration
│
├── config/
│   └── config.js                # Central env reader — single source of truth
│
├── routes/
│   └── queryRoutes.js           # Route definitions → controller mapping
│
├── controllers/
│   └── queryController.js       # Request validation, handlers, SSE
│
├── services/
│   ├── ragPipelineService.js    # Pipeline orchestrator (4 steps)
│   └── vectorDbService.js       # Vector search + mock knowledge base
│
├── agents/
│   ├── filterAgent.js           # Tier 1 — Document relevance filter
│   ├── generatorAgent.js        # Tier 2 — Grounded answer generator
│   └── evaluatorAgent.js        # Tier 3 — Independent fact-checker
│
├── middleware/
│   ├── errorHandler.js          # Global error handler (operational + crash)
│   └── rateLimiter.js           # express-rate-limit config
│
├── utils/
│   ├── llmClient.js             # OpenRouter HTTP wrapper
│   ├── logger.js                # Winston multi-transport logger
│   └── AppError.js              # Custom operational error class
│
├── tests/
│   └── test-pipeline.js         # Integration tests (mock mode)
│
└── logs/                        # Auto-created — combined.log + error.log
```

---

## 🏛️ Architecture

### Clean Architecture Layers

```
  HTTP Request
       │
       ▼
  ┌─────────┐
  │  Routes  │   queryRoutes.js — URL → handler mapping
  └────┬─────┘
       │
       ▼
  ┌──────────────┐
  │  Controllers │   queryController.js — validation, response formatting
  └──────┬───────┘
         │
         ▼
  ┌──────────┐
  │ Services │   ragPipelineService.js — orchestration logic
  └────┬─────┘
       │
       ├──────────────────────────────┐
       ▼                              ▼
  ┌──────────┐                   ┌──────────┐
  │  Agents  │                   │ VectorDB │
  │ (3 LLMs) │                   │ Service  │
  └──────────┘                   └──────────┘
       │                              │
       ▼                              ▼
  ┌──────────┐                   ┌──────────┐
  │  Utils   │                   │ Pinecone │
  │ llmClient│                   │ or Mock  │
  └──────────┘                   └──────────┘
```

### Dependency Flow

- **Routes** depend on **Controllers**
- **Controllers** depend on **Services**
- **Services** depend on **Agents** and **VectorDB**
- **Agents** depend on **Utils** (llmClient)
- No circular dependencies. No layer skipping.

---

## 📡 API Endpoints

### `GET /api/v1/health`

**Purpose**: Health check for load balancers and monitoring.

**Response** `200`:
```json
{
  "status": "healthy",
  "service": "Sentinel.AI Backend",
  "version": "1.0.0",
  "timestamp": "2026-04-01T19:00:00.000Z",
  "uptime": "120s"
}
```

---

### `POST /api/v1/query`

**Purpose**: Execute the full RAG pipeline and return the result as JSON.

**Request**:
```json
{
  "userQuery": "What are the side effects of Metformin?"
}
```

**Validation Rules**:
| Rule | Constraint | Error Code |
|------|-----------|------------|
| Type | Must be `string` | `INVALID_INPUT` |
| Empty | Cannot be blank | `EMPTY_QUERY` |
| Length | Max 1000 characters | `QUERY_TOO_LONG` |

**Success Response** `200`:
```json
{
  "answer": "Metformin is a first-line medication for type 2 diabetes...",
  "confidenceScore": 8,
  "sources": [
    { "id": "mock-001", "title": "Medical Reference: Metformin Side Effects" },
    { "id": "mock-002", "title": "Clinical Guidelines: Diabetes Management" }
  ],
  "status": "success",
  "metadata": {
    "durationMs": 5200,
    "filterSummary": "Kept 3 of 5 documents. Removed 2 irrelevant docs.",
    "removedCount": 2,
    "evaluationSummary": "Answer is well-grounded in source material.",
    "isAccurate": true,
    "refinementNeeded": false,
    "filteredDocCount": 3,
    "usedGeneralKnowledge": false
  }
}
```

**General Knowledge Fallback**:
If no relevant documents are found in the knowledge base, the system will respond using the Generator's general knowledge. These responses are labeled with `[General Knowledge]` and have `usedGeneralKnowledge: true` in the metadata.

**Error Response** `400/500/502/503`:
```json
{
  "status": "error",
  "code": "EMPTY_QUERY",
  "message": "Query cannot be empty."
}
```

**Possible Status Values**:
| Status | Meaning |
|--------|---------|
| `success` | Full pipeline completed |
| `no_results` | Vector DB returned zero documents (triggers fallback) |
| `filtered_empty` | Filter removed all docs (triggers fallback) |
| `error` | Pipeline or system failure |

---

### `POST /api/v1/query/stream`

**Purpose**: Same pipeline, but returns real-time progress via Server-Sent Events.

**Request**: Same as `/query`.

**SSE Event Sequence**:

```
event: step
data: {"step":"searching","message":"Searching knowledge base for relevant documents...","timestamp":"2026-04-01T19:00:01.000Z"}

event: step
data: {"step":"filtering","message":"Filtering 5 retrieved documents for relevance and safety...","timestamp":"2026-04-01T19:00:02.500Z"}

event: step
data: {"step":"generating","message":"Generating verified answer using 3 vetted sources...","timestamp":"2026-04-01T19:00:04.000Z"}

event: step
data: {"step":"evaluating","message":"Evaluating response quality and confidence score...","timestamp":"2026-04-01T19:00:06.000Z"}

event: result
data: { ...full response JSON (same shape as /query response)... }

event: done
data: {}
```

**Error Event** (if pipeline fails mid-stream):
```
event: error
data: {"message":"Generator agent failed: LLM call failed","code":"PIPELINE_ERROR"}
```

**SSE Headers Set**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

---

## 🤖 Agent System

### Tier 1: Filter Agent (`agents/filterAgent.js`)

| Property | Value |
|----------|-------|
| **Model** | `meta-llama/llama-3.3-70b-instruct` |
| **Role** | Document relevance filter |
| **Temperature** | 0.1 (deterministic) |
| **JSON Mode** | Yes |
| **Max Tokens** | 2048 |

**Input**: User query + array of retrieved documents (id, title, content, score)

**Output**:
```json
{
  "filteredDocuments": [...],
  "removedCount": 2,
  "filterSummary": "Removed 2 documents: one was about an unrelated topic, one was a near-duplicate."
}
```

**No Documents Handling**: If no documents are provided (due to search failure or no results), the Filter Agent performs a clean pass-through, allowing the Generator to proceed with general knowledge.

**Safety Net**: If the LLM filters out ALL documents when some were provided, the agent automatically falls back to keeping the **top 2 documents by similarity score**. This prevents pipeline dead-ends.

**Selection Criteria**:
1. Direct relevance to the user's query
2. Factual safety (no misleading/harmful content)
3. Non-redundancy (removes near-duplicates)

---

### Tier 2: Generator Agent (`agents/generatorAgent.js`)

| Property | Value |
|----------|-------|
| **Model** | `anthropic/claude-3-haiku` / `claude-3.5-sonnet` |
| **Role** | Grounded answer synthesis + fallback knowledge |
| **Temperature** | 0.4 |
| **JSON Mode** | No (free-text output) |
| **Max Tokens** | 4096 |

**Strict Rules Enforced via System Prompt**:
1. If relevant documents are provided, prioritize them and cite inline using `[Doc N]` notation.
2. If documents are insufficient, use general knowledge and label with `[General Knowledge]`.
3. Be professional, clear, and detailed. Never truncate answers.
4. Never fabricate facts or citations.

**Input**: User query + filtered documents (can be empty)

**Output**: Plain text answer with citations or general knowledge label.

**Empty Docs Handling**: If `filteredDocuments` is empty, the agent is instructed to provide a thorough answer based on its internal parametric knowledge.

---

### Tier 3: Evaluator Agent (`agents/evaluatorAgent.js`)

| Property | Value |
|----------|-------|
| **Model** | `google/gemini-2.0-flash-001` |
| **Role** | Independent fact-checker + scorer |
| **Temperature** | 0.1 (deterministic) |
| **JSON Mode** | Yes |
| **Max Tokens** | 1024 |

**Scoring Rubric**:
| Score | Meaning |
|-------|---------|
| 10 | Perfectly grounded — every claim supported |
| 8–9 | Mostly grounded with minor gaps |
| 6–7 | Generally accurate, some unsupported claims |
| 4–5 | Mixed — significant unsupported claims |
| 2–3 | Mostly hallucinated |
| 0–1 | Completely hallucinated or dangerous |

**Output**:
```json
{
  "confidenceScore": 8,
  "isAccurate": true,
  "refinementNeeded": false,
  "evaluationSummary": "Answer is well-grounded in source material.",
  "refinedAnswer": null
}
```

**Self-Correction**: If `refinementNeeded: true`, the evaluator provides a `refinedAnswer` which replaces the generator's draft. This implements a feedback loop without re-running the full pipeline.

---

## 🗄️ Vector Database Service

### `services/vectorDbService.js`

**Dual Mode Operation**:

| Mode | Condition | Data Source |
|------|-----------|-------------|
| **Mock** | `PINECONE_API_KEY` or `OPENAI_API_KEY` empty | Built-in 15-document knowledge base |
| **Live** | Both keys set | Pinecone cloud + OpenAI embeddings |

### Mock Knowledge Base

15 documents across 9 domains:

| Domain | Doc IDs | Topics |
|--------|---------|--------|
| Medical | mock-001, mock-002 | Metformin, diabetes |
| DevOps | mock-003, mock-004 | Docker, Kubernetes |
| Programming | mock-005, mock-006 | Python, JavaScript |
| AI/ML | mock-007, mock-008 | Machine learning, RAG |
| Cloud | mock-009 | AWS, Azure, GCP |
| Security | mock-010 | Cybersecurity |
| Databases | mock-011 | SQL vs NoSQL |
| Web Dev | mock-012 | REST API design |
| AI Safety | mock-013, mock-014 | Hallucination, legal AI |
| Data Science | mock-015 | Pipelines and tools |

**Mock Scoring Algorithm**:
- Splits query into keywords (3+ characters)
- Counts keyword hits in each doc's `title + content`
- Score = `0.40 + (hitRatio × 0.55)`, capped at 0.98
- Returns top 5 by score (Retrieval topK increased to 15 in pipeline)

### Live Mode

1. **Embedding**: Calls OpenAI `text-embedding-3-small` (1536 dimensions)
2. **Search**: Queries Pinecone with vector, retrieves top-k with metadata
3. **Result**: Returns `[{id, title, content, score}]`

---

## 🔄 Pipeline Orchestration

### `services/ragPipelineService.js`

**`runRagPipeline(userQuery, onProgress)`**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userQuery` | `string` | Validated user input |
| `onProgress` | `(step, message) => void` | Optional SSE callback |

**Execution Flow**:

```
Step 1: retrieveDocuments(query, 15)     → rawDocuments[]
                │
                ├── Search Failure? → [] (Proceed to General Knowledge fallback)
                │
Step 2: runFilterAgent(query, rawDocs)   → filteredDocuments[]
                │
                ├── Empty? → [] (Generator will use General Knowledge)
                │
Step 3: runGeneratorAgent(query, filtered) → generatedAnswer (Cites docs OR labels General Knowledge)
                │
Step 4: runEvaluatorAgent(query, answer, filtered) → evaluation
                │
                ├── refinementNeeded? → use refinedAnswer
                │
                ▼
        Return { answer, confidenceScore, sources, status, metadata }
```

**Error Handling Per Step**:
| Step | On Failure | Behavior |
|------|-----------|----------|
| Vector DB | Throws `AppError(503)` | Returns error to client |
| Filter | Caught | Falls back to unfiltered docs |
| Generator | Throws `AppError(502)` | Returns error to client |
| Evaluator | Caught | Uses generator answer with score 7 |

---

## 🛡️ Security & Middleware

### Middleware Stack (in order)

```
Helmet          → Security headers (XSS, clickjacking, etc.)
CORS            → Locked to FRONTEND_URL origin
JSON Parser     → 50KB body limit
Morgan          → HTTP request logging
Rate Limiter    → 30 req/min per IP
Routes          → /api/v1/*
404 Handler     → Structured JSON
Error Handler   → Operational vs crash errors
```

### Error Handling Strategy

**Operational Errors** (`AppError`):
- Known, expected failures (bad input, API down)
- Safe to expose message to client
- Logged at `warn` level

**Programming Errors** (unexpected):
- Stack traces logged at `error` level
- Generic message sent to client in production
- Full details sent in development mode

### Rate Limiter

```javascript
{
  windowMs: 60_000,    // 1 minute window
  max: 30,             // 30 requests per window
  standardHeaders: true // RateLimit-* headers
}
```

---

## 🔧 LLM Client

### `utils/llmClient.js`

**`callLLM(opts)`** — Reusable function for any OpenRouter model.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model` | `string` | — | OpenRouter model ID |
| `systemPrompt` | `string` | — | System message |
| `userPrompt` | `string` | — | User message |
| `temperature` | `number` | 0.2 | Randomness (0 = deterministic) |
| `maxTokens` | `number` | 4096 | Max response length |
| `jsonMode` | `boolean` | false | Request JSON output format |

**Error Code Mapping**:
| HTTP Status | Thrown Error |
|-------------|-------------|
| 401 | Invalid API key |
| 402 | Insufficient credits |
| 429 | Rate limit exceeded |
| Other | Generic LLM call failed |

**Timeout**: 120 seconds per call.

**Headers Sent**:
```
Authorization: Bearer <key>
HTTP-Referer: https://sentinel-ai.local
X-Title: Sentinel.AI
```

---

## 📊 Logging

### Winston Configuration

**Transports**:
| Transport | Level | Format |
|-----------|-------|--------|
| Console | `debug` (dev) / `info` (prod) | Colorized timestamp (dev) / JSON (prod) |
| `logs/error.log` | `error` | JSON |
| `logs/combined.log` | All | JSON |

**HTTP Logging**: Morgan streams to Winston at `http` level.

---

## 🧪 Testing

### `tests/test-pipeline.js`

Run with `npm test` — requires **no API keys** (uses mock mode).

**Test Suite**:

| Test | What It Verifies |
|------|-----------------|
| Mock Vector DB | Returns array with correct shape (id, title, content, score) |
| Full Pipeline | End-to-end pipeline returns answer, score 0–10, sources, valid status |
| Input Validation | Empty queries, non-strings, and over-length queries are rejected |

---

## 🔑 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | HTTP server port |
| `NODE_ENV` | No | `development` | `development` / `production` |
| `OPENROUTER_API_KEY` | **Yes** | — | OpenRouter API key |
| `OPENROUTER_BASE_URL` | No | `https://openrouter.ai/api/v1` | API base URL |
| `FILTER_AGENT_MODEL` | No | `meta-llama/llama-3.3-70b-instruct` | Tier 1 model |
| `GENERATOR_AGENT_MODEL` | No | `anthropic/claude-3-haiku` | Tier 2 model |
| `EVALUATOR_AGENT_MODEL` | No | `google/gemini-2.0-flash-001` | Tier 3 model |
| `PINECONE_API_KEY` | No | — | Pinecone key (mock if empty) |
| `PINECONE_INDEX_NAME` | No | `sentinel-docs` | Pinecone index |
| `PINECONE_ENVIRONMENT` | No | `us-east-1` | Pinecone region |
| `OPENAI_API_KEY` | No | — | For embeddings (mock if empty) |
| `EMBEDDING_MODEL` | No | `text-embedding-3-small` | Embedding model |
| `FRONTEND_URL` | No | `http://localhost:5173` | CORS origin |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | No | `30` | Max requests/window |

---

## 🚀 Deployment Considerations

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use real Pinecone index with populated embeddings
- [ ] Set strong rate limits
- [ ] Configure CORS to production frontend URL
- [ ] Use a process manager (PM2, systemd)
- [ ] Set up log rotation for `logs/` directory
- [ ] Add HTTPS termination (Nginx/Cloudflare)
- [ ] Monitor OpenRouter credit balance
