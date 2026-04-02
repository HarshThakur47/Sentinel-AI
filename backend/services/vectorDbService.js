'use strict';

/**
 * Sentinel.AI — Vector DB Service
 *
 * Handles:
 *   1. Query embedding (via OpenAI text-embedding-3-small)
 *   2. Similarity search against Pinecone index
 *   3. Mock fallback when Pinecone is not configured
 *
 * The service auto-detects whether real Pinecone credentials are
 * present and switches between live and mock mode transparently.
 */

const axios  = require('axios');
const logger = require('../utils/logger');
const {
  PINECONE_API_KEY,
  PINECONE_INDEX_NAME,
  PINECONE_ENVIRONMENT,
  OPENAI_API_KEY,
  EMBEDDING_MODEL,
} = require('../config/config');

// ─── Embedding ────────────────────────────────────────────────────────────────

/**
 * Generate an embedding vector for the given text using OpenAI API.
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
  if (!OPENAI_API_KEY) {
    logger.warn('[VectorDB] OpenAI key not set — using zero-vector mock embedding.');
    return new Array(1536).fill(0); // text-embedding-3-small dimension
  }

  try {
    const { data } = await axios.post(
      'https://api.openai.com/v1/embeddings',
      { input: text, model: EMBEDDING_MODEL },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      }
    );
    return data.data[0].embedding;
  } catch (err) {
    logger.error('[VectorDB] Embedding generation failed', { error: err.message });
    throw new Error(`Embedding generation failed: ${err.message}`);
  }
}

// ─── Pinecone Search ──────────────────────────────────────────────────────────

/**
 * Query Pinecone with a vector and retrieve top-k results.
 *
 * @param {number[]} vector
 * @param {number}   topK
 * @returns {Promise<Object[]>}  – [{id, title, content, score}]
 */
async function searchPinecone(vector, topK = 5) {
  // Pinecone REST API v1 endpoint format
  const host = `https://${PINECONE_INDEX_NAME}-${PINECONE_ENVIRONMENT}.svc.pinecone.io`;

  try {
    const { data } = await axios.post(
      `${host}/query`,
      {
        vector,
        topK,
        includeMetadata: true,
        includeValues:   false,
      },
      {
        headers: {
          'Api-Key':      PINECONE_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 20_000,
      }
    );

    const matches = data.matches || [];
    return matches.map((m) => ({
      id:      m.id,
      title:   m.metadata?.title   || `Document ${m.id}`,
      content: m.metadata?.content || m.metadata?.text || '',
      score:   parseFloat(m.score?.toFixed(4) || '0'),
    }));
  } catch (err) {
    logger.error('[VectorDB] Pinecone query failed', { error: err.message });
    throw new Error(`Pinecone query failed: ${err.message}`);
  }
}

// ─── Mock Fallback ─────────────────────────────────────────────────────────────

const MOCK_DOCUMENTS = [
  // ── Medical ──────────────────────────────────────────────
  {
    id: 'mock-001', title: 'Medical Reference: Metformin Side Effects',
    content: 'Metformin is a first-line medication for type 2 diabetes. Common side effects include nausea, vomiting, diarrhea, and stomach pain. A rare but serious side effect is lactic acidosis. Patients with renal impairment should use with caution. Source: WHO Essential Medicines List 2023.',
  },
  {
    id: 'mock-002', title: 'Clinical Guidelines: Diabetes Management',
    content: 'The ADA 2024 guidelines recommend metformin as the preferred initial pharmacological agent for type 2 diabetes management in most patients due to its efficacy, safety profile, and low cost. Regular monitoring of kidney function (eGFR) is recommended.',
  },
  // ── DevOps & Containers ──────────────────────────────────
  {
    id: 'mock-003', title: 'Docker: Containerization Platform Overview',
    content: 'Docker is an open-source containerization platform that packages applications and their dependencies into lightweight, portable containers. Containers share the host OS kernel, making them faster and more efficient than virtual machines. Key components include Docker Engine, Docker Hub, Dockerfile, and Docker Compose. Docker enables consistent environments across development, testing, and production.',
  },
  {
    id: 'mock-004', title: 'Kubernetes: Container Orchestration at Scale',
    content: 'Kubernetes (K8s) is an open-source container orchestration system for automating deployment, scaling, and management of containerized applications. Originally designed by Google, it manages clusters of containers across multiple hosts. Key concepts include Pods, Services, Deployments, ReplicaSets, and Namespaces. Kubernetes works with Docker and other container runtimes.',
  },
  // ── Programming Languages ────────────────────────────────
  {
    id: 'mock-005', title: 'Python Programming Language Overview',
    content: 'Python is a high-level, interpreted programming language known for its readability and versatility. Created by Guido van Rossum in 1991, it supports multiple paradigms including procedural, object-oriented, and functional programming. Python is widely used in web development (Django, Flask), data science (pandas, NumPy), machine learning (TensorFlow, PyTorch), and automation.',
  },
  {
    id: 'mock-006', title: 'JavaScript: The Language of the Web',
    content: 'JavaScript is a dynamic, interpreted programming language primarily used for web development. It runs in browsers and on servers via Node.js. Key frameworks include React, Angular, and Vue.js for frontend, and Express.js for backend. ES6+ introduced modern features like arrow functions, promises, async/await, destructuring, and modules.',
  },
  // ── AI & Machine Learning ────────────────────────────────
  {
    id: 'mock-007', title: 'Machine Learning: Fundamentals and Applications',
    content: 'Machine learning is a subset of artificial intelligence where systems learn from data without being explicitly programmed. Three main types: supervised learning (classification, regression), unsupervised learning (clustering, dimensionality reduction), and reinforcement learning. Popular algorithms include neural networks, decision trees, SVMs, and random forests. Applications span image recognition, NLP, recommendation systems, and autonomous vehicles.',
  },
  {
    id: 'mock-008', title: 'RAG Architecture: Retrieval-Augmented Generation',
    content: 'Retrieval-Augmented Generation (RAG) combines information retrieval with language generation to produce grounded responses. The pipeline consists of: (1) query embedding, (2) vector similarity search in a knowledge base, (3) context injection into the LLM prompt, and (4) grounded response generation. RAG reduces hallucinations by anchoring answers in retrieved documents rather than relying solely on parametric knowledge.',
  },
  // ── Cloud & Infrastructure ───────────────────────────────
  {
    id: 'mock-009', title: 'Cloud Computing: AWS, Azure, and GCP',
    content: 'Cloud computing delivers on-demand computing resources over the internet. The three major providers are AWS (Amazon), Azure (Microsoft), and GCP (Google). Service models include IaaS (virtual machines), PaaS (managed platforms), and SaaS (software services). Key benefits include scalability, cost efficiency, global availability, and managed security. Common services include compute (EC2, VMs), storage (S3, Blob), and databases (RDS, Cloud SQL).',
  },
  // ── Cybersecurity ────────────────────────────────────────
  {
    id: 'mock-010', title: 'Cybersecurity: Threats and Best Practices',
    content: 'Cybersecurity protects systems, networks, and data from digital attacks. Common threats include phishing, ransomware, SQL injection, XSS, and DDoS attacks. Best practices include multi-factor authentication (MFA), encryption at rest and in transit, regular patching, principle of least privilege, and security auditing. Frameworks like NIST, ISO 27001, and OWASP guide security implementations.',
  },
  // ── Databases ────────────────────────────────────────────
  {
    id: 'mock-011', title: 'Database Systems: SQL vs NoSQL',
    content: 'Databases store and manage structured data. SQL databases (PostgreSQL, MySQL) use relational tables with ACID compliance, ideal for transactional systems. NoSQL databases include document stores (MongoDB), key-value stores (Redis), column-family (Cassandra), and graph databases (Neo4j). Choosing between SQL and NoSQL depends on data structure, scalability needs, and consistency requirements.',
  },
  // ── Web Development ──────────────────────────────────────
  {
    id: 'mock-012', title: 'REST API Design Principles',
    content: 'REST (Representational State Transfer) is an architectural style for designing networked applications. Key principles include statelessness, uniform interface, resource-based URLs, and standard HTTP methods (GET, POST, PUT, DELETE). Best practices include proper status codes, versioning (e.g., /api/v1/), pagination, rate limiting, and consistent error responses. Authentication is commonly handled via JWT or OAuth 2.0.',
  },
  // ── AI Safety ────────────────────────────────────────────
  {
    id: 'mock-013', title: 'AI Hallucination: Causes and Mitigation',
    content: 'AI hallucination occurs when language models generate plausible-sounding but factually incorrect information. Causes include training data gaps, overgeneralization, and lack of grounding. Mitigation strategies include RAG pipelines, multi-agent verification, confidence scoring, source citation requirements, and human-in-the-loop review. Studies show multi-agent systems reduce hallucination rates from 35% to under 10%.',
  },
  // ── Legal ────────────────────────────────────────────────
  {
    id: 'mock-014', title: 'Legal AI Research: Case Citation Errors',
    content: 'A 2023 study found that 78% of legal AI tools generated fictitious case citations. Retrieval-Augmented Generation (RAG) with source filtering significantly reduces hallucination rates. Multi-agent systems with independent evaluators further improve accuracy to above 90%.',
  },
  // ── Data Science ─────────────────────────────────────────
  {
    id: 'mock-015', title: 'Data Science Pipeline and Tools',
    content: 'Data science involves extracting insights from structured and unstructured data. A typical pipeline includes data collection, cleaning, exploratory data analysis (EDA), feature engineering, model training, evaluation, and deployment. Popular tools include Python (pandas, scikit-learn), R, SQL, Jupyter Notebooks, and visualization libraries like Matplotlib and Seaborn. MLOps practices ensure reproducibility and continuous model monitoring.',
  },
];

function getMockDocuments(userQuery) {
  const queryLower = userQuery.toLowerCase();
  const keywords   = queryLower.split(/\s+/).filter((w) => w.length > 2);

  const scored = MOCK_DOCUMENTS.map((doc) => {
    const combined = `${doc.title} ${doc.content}`.toLowerCase();
    const hits     = keywords.filter((k) => combined.includes(k)).length;
    const ratio    = keywords.length > 0 ? hits / keywords.length : 0;
    const score    = parseFloat(Math.min(0.98, 0.40 + ratio * 0.55).toFixed(4));
    return { ...doc, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ─── Public Interface ─────────────────────────────────────────────────────────

const isPineconeConfigured = Boolean(PINECONE_API_KEY && PINECONE_INDEX_NAME && OPENAI_API_KEY);

/**
 * Retrieve top-k relevant documents from the vector store.
 *
 * @param {string} userQuery
 * @param {number} [topK=5]
 * @returns {Promise<Object[]>} – [{id, title, content, score}]
 */
async function retrieveDocuments(userQuery, topK = 5) {
  if (!isPineconeConfigured) {
    logger.warn('[VectorDB] Running in MOCK mode — Pinecone/OpenAI keys not set.');
    const mockDocs = getMockDocuments(userQuery);
    logger.info(`[VectorDB] Mock retrieved ${mockDocs.length} documents.`);
    return mockDocs;
  }

  logger.info('[VectorDB] Generating embedding...');
  const vector = await generateEmbedding(userQuery);

  logger.info('[VectorDB] Querying Pinecone...');
  const docs = await searchPinecone(vector, topK);

  logger.info(`[VectorDB] Retrieved ${docs.length} documents from Pinecone.`);
  return docs;
}

module.exports = { retrieveDocuments, generateEmbedding };
