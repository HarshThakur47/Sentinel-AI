'use strict';

/**
 * Sentinel.AI — Generator Agent (Tier 2)
 *
 * Model : Claude Sonnet (via OpenRouter)
 * Task  : Generate a complete, helpful answer using documents if available,
 *         or general knowledge as fallback.
 */

const { callLLM }               = require('../utils/llmClient');
const logger                    = require('../utils/logger');
const { GENERATOR_AGENT_MODEL } = require('../config/config');

const SYSTEM_PROMPT = `You are Sentinel.AI — an intelligent and helpful AI assistant.

Your rules:
1. If relevant documents are provided, prioritize them and cite inline using [Doc N] notation.
2. If documents are insufficient or not provided, use your own knowledge to give a complete answer.
3. Always provide thorough, accurate, and helpful answers — never refuse unnecessarily.
4. Clearly label answers not backed by documents with: "[General Knowledge]" at the start.
5. Be professional, clear, and detailed. Never truncate your answer.
6. Never fabricate citations — only use [Doc N] if that document was actually provided.`;

/**
 * @param {string}   userQuery
 * @param {Object[]} filteredDocuments – [{id, title, content, relevanceReason}]
 * @returns {Promise<string>} – Generated answer text
 */
async function runGeneratorAgent(userQuery, filteredDocuments) {
  logger.info(`[GeneratorAgent] Starting. Using ${filteredDocuments?.length ?? 0} documents.`);

  const hasDocuments = filteredDocuments && filteredDocuments.length > 0;

  const contextBlock = hasDocuments
    ? filteredDocuments.map((d, i) => `[Doc ${i + 1}] — ${d.title}\n${d.content}`).join('\n\n---\n\n')
    : null;

  const userPrompt = hasDocuments
    ? `Context Documents:\n${contextBlock}\n\n---\n\nUser Query: "${userQuery}"\n\nUsing the above documents as your primary source, provide a comprehensive and accurate answer. Cite documents inline where relevant.`
    : `User Query: "${userQuery}"\n\nNo documents were found in the knowledge base for this query. Answer using your general knowledge. Be thorough and helpful.`;

  const answer = await callLLM({
    model:        GENERATOR_AGENT_MODEL,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature:  0.4,
    maxTokens:    4096,
    jsonMode:     false,
  });

  logger.info(`[GeneratorAgent] Done. Answer length: ${answer.length} chars.`);
  return answer;
}

module.exports = { runGeneratorAgent };