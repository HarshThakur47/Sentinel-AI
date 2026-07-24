# 🛡️ Sentinel.AI

### A Multi-Agent RAG System for Reducing AI Hallucination

> Built at **Chitkara University** — A production-grade demonstration of how multi-model verification pipelines can reduce AI hallucination rates from **35% to under 10%** in high-stakes environments like healthcare and law.

---

## 📌 Target vs. Verified Metrics

To maintain analytical accuracy and present realistic statistics for technical interviews, Sentinel.AI separates **Expected System Targets** from **Verified Local System Latency**.

### 1. Expected Pipeline Performance (Research Targets)
These represent standard industry target benchmarks for multi-agent RAG verification pipelines:

| Performance Metric | Standard RAG | Sentinel.AI (Expected) |
| :--- | :--- | :--- |
| **Hallucination Rate** | 35% – 40% | **< 10%** (via 3-tier verification) |
| **Fact Verification** | None / Single LLM | **Multi-Model checks** (Llama $\rightarrow$ Claude $\rightarrow$ Gemini) |
| **Source Grounding** | Ad-hoc citations | **Strict source reinforcement** (vetted contexts only) |

### 2. Verified Local System Latency (Measured Benchmarks)
These represent actual latency and performance figures measured during our local testing suite runs:

| Action / Pipeline Step | Ingest / Process Mode | Measured Latency | Performance Impact |
| :--- | :--- | :--- | :--- |
| **Document Ingestion (5 Chunks)** | Sequential Mode | **7.22s** | Baseline reference |
| **Document Ingestion (5 Chunks)** | Parallel Mode | **2.11s** | **3.4x speedup** (concurrency pooled) |
| **Query Orchestration Loop** | Mock Pipeline Run | **4.20s** (avg) | Stable network latency |

In domains like **medical diagnosis** and **legal research**, a single hallucinated fact can have catastrophic consequences. Sentinel.AI addresses this with a tiered verification architecture where multiple specialized LLMs independently filter, generate, and evaluate responses.

---

## 🏗️ System Architecture

```
                         ┌──────────────┐
                         │  User Query  │
                         └──────┬───────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   React Frontend       │  Port 5173
                    │   (Vite + Lucide)      │
                    └───────────┬───────────┘
                                │ POST /api/v1/query
                                │ POST /api/v1/query/stream (SSE)
                                ▼
                    ┌───────────────────────┐
                    │   Express Backend      │  Port 5000
                    │   (Node.js)            │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                  ▼
   ┌─────────────────┐ ┌──────────────┐  ┌──────────────────┐
   │  Vector DB       │ │  OpenRouter  │  │  Rate Limiter /  │
   │  (Pinecone/Mock) │ │  LLM API    │  │  Security Layer  │
   └────────┬────────┘ └──────┬───────┘  └──────────────────┘
            │                 │
            └────────┬────────┘
                     ▼
        ┌────────────────────────┐
        │   3-Agent RAG Pipeline │
        │                        │
        │  ┌──────────────────┐  │
        │  │ 🔍 Filter Agent   │  │  ◀─ Llama 3.3 70B
        │  │ Relevance Check   │  │     Fast, cheap filtering
        │  └────────┬─────────┘  │
        │           ▼            │
        │  ┌──────────────────┐  │
        │  │ ✍️ Generator Agent│  │  ◀─ Claude 3 Haiku
        │  │ Grounded Answer  │  │     Strong reasoning
        │  └────────┬─────────┘  │
        │           ▼            │
        │  ┌──────────────────┐  │
        │  │ ✅ Evaluator Agent│  │  ◀─ Gemini 2.0 Flash
        │  │ Fact-check + Score│  │     Independent verification
        │  └──────────────────┘  │
        └────────────────────────┘
                     │
                     ▼
            ┌──────────────┐
            │   Response   │
            │  • Answer    │
            │  • Score 0-10│
            │  • Sources[] │
            └──────────────┘
```

---

## 📁 Project Structure

```
sentinel-ai/
├── README.md                          ◀─ You are here
│
├── frontend/                          ◀─ React + Vite
│   ├── DOCUMENTATION.md               ◀─ Frontend docs
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx                   # Entry point
│       ├── App.jsx                    # App shell, header tabs, theme
│       ├── App.css                    # App-specific styles
│       ├── index.css                  # Global design system (1250 lines)
│       └── components/
│           ├── ChatInterface.jsx      # Chat UI + SSE streaming
│           ├── IngestionPortal.jsx    # Drag-and-drop document upload portal
│           ├── LandingPage.jsx        # Hero + stats + architecture
│           └── SourceBadge.jsx        # Source citation badge
│
├── backend/                           ◀─ Node.js + Express
│   ├── DOCUMENTATION.md               ◀─ Backend docs
│   ├── README.md                      ◀─ Quick start
│   ├── package.json
│   ├── server.js                      # HTTP listener + shutdown
│   ├── app.js                         # Express assembly
│   ├── .env                           # Secrets (gitignored)
│   ├── .env.example                   # Template
│   │
│   ├── config/
│   │   └── config.js                  # Central env config
│   ├── routes/
│   │   ├── queryRoutes.js             # API query route definitions
│   │   └── documentRoutes.js          # Ingestion route definitions
│   ├── controllers/
│   │   ├── queryController.js         # Request handlers + SSE
│   │   └── documentController.js      # Multi-document upload handlers
│   ├── services/
│   │   ├── ragPipelineService.js      # Pipeline orchestrator
│   │   └── vectorDbService.js         # Pinecone + concurrency embedding engine
│   ├── agents/
│   │   ├── filterAgent.js             # Tier 1 — Llama 3.3 70B
│   │   ├── generatorAgent.js          # Tier 2 — Claude 3 Haiku
│   │   └── evaluatorAgent.js          # Tier 3 — Gemini 2.0 Flash
│   ├── middleware/
│   │   ├── errorHandler.js            # Global error handler
│   │   └── rateLimiter.js             # Per-IP rate limiting
│   ├── utils/
│   │   ├── llmClient.js               # OpenRouter API wrapper
│   │   ├── logger.js                  # Winston logger
│   │   └── AppError.js                # Custom error class
│   └── tests/
│       ├── test-pipeline.js           # Query integration tests
│       └── test-ingestion.js          # Ingestion performance profiling tests
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- **OpenRouter API key** ([openrouter.ai/keys](https://openrouter.ai/keys))

### 1. Clone & Install

```bash
# Install frontend
cd frontend
npm install

# Install backend
cd ../backend
npm install
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env → set OPENROUTER_API_KEY
```

### 3. Run Both Servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

### 4. Open in Browser

Navigate to **http://localhost:5173** → Click "Go to Sentinel" → Switch to "Knowledge Ingestion" tab to upload PDFs, or "Agent Chat" to query.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | ✅ Yes | LLM API key from OpenRouter |
| `PINECONE_API_KEY` | Optional | Real vector DB (mock if empty) |
| `OPENAI_API_KEY` | Optional | For embeddings (mock if empty) |
| `FRONTEND_URL` | No | CORS origin (default: `http://localhost:5173`) |

> **Tip**: Without Pinecone/OpenAI keys, the system uses a built-in knowledge base of 15 documents covering medicine, tech, AI, cloud, and more. Perfect for demos.

---

## 📡 API Reference

### `GET /api/v1/health`
Returns server status.

### `POST /api/v1/query`
Standard JSON query.

```json
// Request
{ "userQuery": "What is Docker?" }

// Response
{
  "answer": "Docker is an open-source containerization platform...",
  "confidenceScore": 8,
  "sources": [{ "id": "mock-003", "title": "Docker: Containerization Platform Overview" }],
  "status": "success"
}
```

### `POST /api/v1/query/stream`
Real-time SSE streaming with step-by-step pipeline progress.

### `POST /api/v1/documents/upload`
Ingests one or more PDF files.
- **Payload**: Multipart Form-Data
- **Fields**:
  - `documents` (file list): One or more PDF files.
  - `parallel` (string): `"true"` to run parallel ingestion (limit: 10 concurrent embedding calls) or `"false"` to run sequential.

---

## 🧪 Testing

```bash
cd backend
# 1. Runs pipeline queries in mock mode:
npm test

# 2. Runs document ingestion profiling test:
node tests/test-ingestion.js
```

---

## 🔒 Security

- **Helmet** — Secure HTTP headers
- **CORS** — Locked to frontend origin
- **Rate Limiting** — 30 req/min per IP
- **Input Validation** — 1000 char max, type-checked
- **Error Sanitization** — No stack traces in production

---

## 👥 Team

Built at **Chitkara University** as a research project in AI reliability and hallucination reduction.

---

## 📝 License

Academic research project. All rights reserved.
# Sentinal_AI
