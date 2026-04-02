# 🖥️ Sentinel.AI — Frontend Documentation

## Overview

The frontend is a **React 19 + Vite 8** single-page application that provides the user interface for Sentinel.AI. It features a landing page explaining the system's architecture, and a chat interface that communicates with the backend via REST/SSE.

**Tech Stack**: React 19, Vite 8, Lucide Icons, Vanilla CSS

---

## 📁 File Structure

```
frontend/
├── index.html                  # HTML entry point
├── package.json                # Dependencies & scripts
├── vite.config.js              # Vite configuration
└── src/
    ├── main.jsx                # React DOM root mount
    ├── App.jsx                 # App shell — header, routing, theme, info modal
    ├── App.css                 # App-specific overrides
    ├── index.css               # Global design system (759 lines)
    └── components/
        ├── ChatInterface.jsx   # Chat UI + SSE streaming + pipeline tracker
        ├── LandingPage.jsx     # Landing page — hero, stats, architecture
        └── SourceBadge.jsx     # Source citation badge component
```

---

## 🧩 Components

### `App.jsx` — Application Shell

**State:**
| State | Type | Description |
|-------|------|-------------|
| `isDarkMode` | `boolean` | Light/dark theme toggle |
| `currentView` | `'landing' \| 'chat'` | Active page |
| `showInfoModal` | `boolean` | Privacy/about modal visibility |

**Features:**
- Sticky header with logo, info button, nav, and theme toggle
- Conditional rendering: `LandingPage` ↔ `ChatInterface`
- Dark mode via `body.dark` CSS class
- Info/Privacy modal with contact link

---

### `ChatInterface.jsx` — Chat + RAG Pipeline

This is the **core component** — handles user queries, backend communication, and real-time pipeline visualization.

**State:**
| State | Type | Description |
|-------|------|-------------|
| `messages` | `Array<Message>` | Chat history |
| `input` | `string` | Current input field value |
| `isLoading` | `boolean` | Whether pipeline is running |
| `pipelineStep` | `string \| null` | Active step: `searching`, `filtering`, `generating`, `evaluating` |
| `stepMessage` | `string` | Current step description from backend |

**Message Shape:**
```javascript
{
  role: 'user' | 'bot',
  content: string,           // Message text
  score: number,             // Evaluator confidence (0–10) — bot only
  sources: Array<Source>,    // Verified source documents — bot only
  status: 'success' | 'error' | 'filtered_empty' | 'no_results'
}
```

**API Communication Flow:**

```
handleSubmit()
    │
    ├─► queryWithSSE()              ◀─ Primary (real-time steps)
    │   POST /api/v1/query/stream
    │   Reads SSE events:
    │     event: step    → updates pipelineStep + stepMessage
    │     event: result  → resolves with final data
    │     event: error   → rejects
    │
    └─► queryWithFetch()            ◀─ Fallback (if SSE fails)
        POST /api/v1/query
        Standard JSON response
```

**SSE Stream Reader Implementation:**
- Uses `fetch()` + `ReadableStream` (not `EventSource`, since POST is needed)
- Manually parses `event:` and `data:` lines from the stream buffer
- Handles partial chunks by buffering incomplete lines

**Pipeline Step Tracker UI:**
4 animated step indicators shown during loading:

| Step | Icon | Label |
|------|------|-------|
| `searching` | `Search` | Searching Documents |
| `filtering` | `Filter` | Filtering Sources |
| `generating` | `Sparkles` | Generating Answer |
| `evaluating` | `ShieldCheck` | Evaluating Response |

Each step has 3 visual states:
- **Pending** — Dimmed, grey icon
- **Active** — Red with pulse animation
- **Complete** — Green with checkmark

---

### `LandingPage.jsx` — Hero & Architecture

A scrollable landing page with 4 sections:

1. **Hero Section** — Title, subtitle, CTA button
2. **Problem Section** — Statistics on AI unreliability (78% legal errors, 40% medical mistakes, 35-40% RAG hallucination)
3. **Architecture Section** — 3 agent cards (Filter → Generator → Evaluator) with model names
4. **Results Section** — Comparison table (Standard RAG vs Sentinel.AI)

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `onEnter` | `() => void` | Callback to switch to chat view |

---

### `SourceBadge.jsx` — Citation Badge

A small badge displaying a source document reference.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `source` | `{ title: string }` | Source document data |
| `index` | `number` | Position index for staggered animation delay |

---

## 🎨 Design System

### CSS Architecture

All styles are in `index.css` using **CSS custom properties** (design tokens). No CSS framework is used — everything is vanilla CSS.

### Color Tokens

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--primary-color` | `#ef4444` | `#ef4444` | Buttons, accents, active states |
| `--primary-hover` | `#dc2626` | `#f87171` | Hover states |
| `--bg-color` | `#f8fafc` | `#0f172a` | Page background |
| `--surface-color` | `#ffffff` | `#1e293b` | Cards, chat bubbles |
| `--text-primary` | `#1e293b` | `#f8fafc` | Headings, body text |
| `--text-secondary` | `#64748b` | `#94a3b8` | Labels, hints |
| `--border-color` | `#e2e8f0` | `#334155` | Dividers, borders |
| `--success-color` | `#10b981` | `#34d399` | Confidence scores, positive |
| `--warning-color` | `#f59e0b` | `#fbbf24` | Warning stats |
| `--danger-color` | `#ef4444` | `#f87171` | Error stats |

### Dark Mode

Toggled via `body.dark` class. All components transition smoothly with `transition: 0.3s ease`.

### Animations

| Class | Type | Duration |
|-------|------|----------|
| `animate-fade-in` | Opacity 0→1 | 0.4s |
| `animate-fade-in-scale` | Opacity + scale 0.95→1 | 0.5s |
| `animate-slide-up` | Opacity + translateY 20→0 | 0.4s |
| `bounce` | Typing indicator dots | 1.4s infinite |
| `pulse-step` | Active pipeline step glow | 1.5s infinite |

### Responsive Layout

- `max-width: 1000px` centered container
- `grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))` for card grids
- Chat messages: `max-width: 85%` of container
- Stat cards and agent cards have hover lift effects

---

## 🔌 Backend API Contract

### Endpoint

```
Base URL: http://localhost:5000/api/v1
```

### POST `/query`

**Request:**
```json
{
  "userQuery": "string (max 1000 chars)"
}
```

**Response:**
```json
{
  "answer": "string",
  "confidenceScore": 8,
  "sources": [
    { "id": "mock-003", "title": "Docker: Containerization Platform Overview" }
  ],
  "status": "success",
  "metadata": {
    "durationMs": 4200,
    "filterSummary": "...",
    "rawDocCount": 5,
    "filteredDocCount": 3
  }
}
```

### POST `/query/stream`

Same request body. Returns SSE events:

```
event: step
data: {"step":"searching","message":"Searching knowledge base...","timestamp":"..."}

event: step
data: {"step":"filtering","message":"Filtering 5 documents...","timestamp":"..."}

event: step
data: {"step":"generating","message":"Generating verified answer...","timestamp":"..."}

event: step
data: {"step":"evaluating","message":"Evaluating response quality...","timestamp":"..."}

event: result
data: { ...full response object... }

event: done
data: {}
```

---

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm 9+

### Commands

```bash
npm install      # Install dependencies
npm run dev      # Start dev server (port 5173)
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # ESLint check
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 19.2.x | UI framework |
| `react-dom` | 19.2.x | DOM rendering |
| `lucide-react` | 1.7.x | Icon library |
| `vite` | 8.x | Build tool & dev server |
| `@vitejs/plugin-react` | 6.x | React HMR for Vite |
