'use strict';

/**
 * Sentinel.AI — OpenRouter LLM Client
 */

const axios = require('axios');
const logger = require('./logger');
const { OPENROUTER_API_KEY, OPENROUTER_BASE_URL } = require('../config/config');

async function callLLM({ model, systemPrompt, userPrompt, temperature = 0.2, maxTokens = 4096, jsonMode = false }) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables.');
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userPrompt   },
  ];

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  };

  logger.debug(`[LLMClient] Calling model: ${model}`, {
    temperature,
    maxTokens,
    jsonMode,
    promptPreview: userPrompt.slice(0, 120),
  });

  try {
    const { data } = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      requestBody,
      {
        headers: {
          Authorization:  `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://sentinel-ai.local',
          'X-Title':      'Sentinel.AI',
        },
        timeout: 120_000, // increased to 120s for longer answers
      }
    );

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from LLM');

    logger.debug(`[LLMClient] Response received (${content.length} chars)`);
    return content;
  } catch (err) {
    const status = err?.response?.status;
    const detail = err?.response?.data?.error?.message || err.message;

    logger.error(`[LLMClient] Error calling ${model}`, { status, detail });

    if (status === 401) throw new Error('Invalid OpenRouter API key.');
    if (status === 429) throw new Error('OpenRouter rate limit exceeded. Please wait.');
    if (status === 402) throw new Error('OpenRouter: Insufficient credits.');
    throw new Error(`LLM call failed: ${detail}`);
  }
}

module.exports = { callLLM };