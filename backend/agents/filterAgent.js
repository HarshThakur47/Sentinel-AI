'use strict';

/**
 * Sentinel.AI — Filter Agent (Tier 1)
 *
 * Model : Llama 3.1 8B (fast & cheap)
 * Task  : Filter retrieved documents for relevance and safety.
 *         Returns empty array cleanly if no docs provided.
 */

const { callLLM }            = require('../utils/llmClient');
const logger                 = require('../utils/logger');
const { FILTER_AGENT_MODEL } = require('../config/config');

const SYSTEM_PROMPT = `You are a precision document filter for a RAG system called Sentinel.AI.
Your job is to review a set of retrieved documents and a user query, then select ONLY the documents that are:
1. Directly relevant to answering the user's query.
2. Factually safe (no misleading, outdated, or harmful content).
3. Non-redundant — remove near-duplicate passages.

You MUST respond in valid JSON with this exact structure:
{
  "filteredDocuments": [
    {
      "id": "<original doc id>",
      "title": "<original doc title>",
      "content": "<original doc content>",
      "relevanceReason": "<one sentence why this doc matters>"
    }
  ],
  "removedCount": <integer>,
  "filterSummary": "<brief summary of what you filtered and why>"
}

Do NOT include irrelevant, duplicate, or dangerous documents. Be strict.`;

async function runFilterAgent(userQuery, documents) {
  logger.info(`[FilterAgent] Starting. Input docs: ${documents.length}`);

  // Clean pass-through if no documents
  if (!documents || documents.length === 0) {
    logger.info('[FilterAgent] No documents to filter — clean pass-through.');
    return { filteredDocuments: [], filterSummary: 'No documents retrieved.', removedCount: 0 };
  }

  const userPrompt = `User Query: "${userQuery}"

Retrieved Documents:
${documents.map((d, i) => `[Doc ${i + 1}]
ID: ${d.id}
Title: ${d.title}
Content: ${d.content}
Similarity Score: ${d.score ?? 'N/A'}
---`).join('\n')}

Filter these documents. Return only the relevant ones in the required JSON format.`;

  const rawResponse = await callLLM({
    model:        FILTER_AGENT_MODEL,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature:  0.1,
    maxTokens:    2048,
    jsonMode:     true,
  });

  let parsed;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    logger.error('[FilterAgent] Failed to parse JSON response', { rawResponse });
    return {
      filteredDocuments: documents,
      filterSummary:     'Filter agent returned malformed JSON — returning all docs.',
      removedCount:      0,
    };
  }

  const result = {
    filteredDocuments: parsed.filteredDocuments || [],
    filterSummary:     parsed.filterSummary     || '',
    removedCount:      parsed.removedCount       ?? (documents.length - (parsed.filteredDocuments?.length || 0)),
  };

  // Safety net: never return zero documents — always keep at least the top 2
  if (result.filteredDocuments.length === 0) {
    logger.warn('[FilterAgent] All docs filtered out — falling back to top 2 by score.');
    const fallback = [...documents]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 2);
    result.filteredDocuments = fallback;
    result.filterSummary    += ' (Fallback: kept top 2 documents by similarity score.)';
    result.removedCount      = documents.length - fallback.length;
  }

  logger.info(`[FilterAgent] Done. ${result.filteredDocuments.length} docs kept, ${result.removedCount} removed.`);
  return result;
}

module.exports = { runFilterAgent };