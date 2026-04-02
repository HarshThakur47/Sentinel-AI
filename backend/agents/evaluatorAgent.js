'use strict';

/**
 * Sentinel.AI — Evaluator Agent (Tier 3)
 *
 * Model : Gemini 1.5 Pro (via OpenRouter) — strong factual reasoning
 * Task  : Independently verify the generated answer against the source
 *         documents and assign a confidence score 0–10.
 *
 * Returns: { confidenceScore, evaluation, isAccurate, refinementNeeded }
 */

const { callLLM }               = require('../utils/llmClient');
const logger                    = require('../utils/logger');
const { EVALUATOR_AGENT_MODEL } = require('../config/config');

const SYSTEM_PROMPT = `You are the Evaluator Agent in Sentinel.AI — an independent fact-checker and quality assurance system.

Your job is to evaluate a generated answer against its source documents.

Scoring rubric for confidenceScore (integer 0–10):
- 10 : Perfectly grounded, every claim is directly supported by sources.
- 8–9: Mostly grounded with minor interpretation gaps.
- 6–7: Generally accurate but with some unsupported claims.
- 4–5: Mixed accuracy — significant unsupported claims.
- 2–3: Mostly hallucinated or unsupported.
- 0–1: Completely hallucinated or dangerous misinformation.

Evaluation criteria:
1. Factual accuracy vs. source documents
2. Completeness — does it fully answer the query?
3. Citation integrity — are inline citations correct?
4. Potential for harm or misinformation

You MUST respond in valid JSON with this exact structure:
{
  "confidenceScore": <integer 0-10>,
  "isAccurate": <true | false>,
  "refinementNeeded": <true | false>,
  "evaluationSummary": "<2-3 sentence assessment>",
  "refinedAnswer": "<if refinementNeeded is true, provide a corrected answer; otherwise null>"
}`;

/**
 * @param {string}   userQuery
 * @param {string}   generatedAnswer
 * @param {Object[]} sourceDocuments
 * @returns {Promise<{confidenceScore: number, isAccurate: boolean, refinementNeeded: boolean, evaluationSummary: string, finalAnswer: string}>}
 */
async function runEvaluatorAgent(userQuery, generatedAnswer, sourceDocuments) {
  logger.info('[EvaluatorAgent] Starting evaluation...');

  const contextBlock = sourceDocuments
    .map((d, i) => `[Doc ${i + 1}] ${d.title}: ${d.content}`)
    .join('\n---\n');

  const userPrompt = `Original User Query: "${userQuery}"

Source Documents Used:
${contextBlock}

Generated Answer to Evaluate:
"""
${generatedAnswer}
"""

Evaluate the generated answer against the source documents. Return the required JSON.`;

  const rawResponse = await callLLM({
    model:        EVALUATOR_AGENT_MODEL,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature:  0.1,
    maxTokens:    1024,
    jsonMode:     true,
  });

  let parsed;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    logger.error('[EvaluatorAgent] Failed to parse JSON', { rawResponse });
    // Safe fallback
    return {
      confidenceScore:   5,
      isAccurate:        true,
      refinementNeeded:  false,
      evaluationSummary: 'Evaluator returned malformed response. Using generator output as-is.',
      finalAnswer:       generatedAnswer,
    };
  }

  // If evaluator says the answer needs refinement and provides a corrected version, use it
  const finalAnswer = (parsed.refinementNeeded && parsed.refinedAnswer)
    ? parsed.refinedAnswer
    : generatedAnswer;

  const result = {
    confidenceScore:   Math.max(0, Math.min(10, parseInt(parsed.confidenceScore, 10) || 5)),
    isAccurate:        parsed.isAccurate        ?? true,
    refinementNeeded:  parsed.refinementNeeded  ?? false,
    evaluationSummary: parsed.evaluationSummary || '',
    finalAnswer,
  };

  logger.info(`[EvaluatorAgent] Done. Score: ${result.confidenceScore}/10. Accurate: ${result.isAccurate}. Refined: ${result.refinementNeeded}`);
  return result;
}

module.exports = { runEvaluatorAgent };
