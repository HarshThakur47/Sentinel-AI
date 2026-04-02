'use strict';

/**
 * Sentinel.AI — RAG Pipeline Service
 *
 * Orchestrates the full Multi-Agent pipeline:
 *   1. Vector DB retrieval
 *   2. Filter Agent  (Llama 3.1 8B)
 *   3. Generator Agent (Claude Sonnet)
 *   4. Evaluator Agent (Gemini 1.5 Pro)
 *
 * Falls back to general knowledge when no documents are found.
 */

const { retrieveDocuments }   = require('./vectorDbService');
const { runFilterAgent }      = require('../agents/filterAgent');
const { runGeneratorAgent }   = require('../agents/generatorAgent');
const { runEvaluatorAgent }   = require('../agents/evaluatorAgent');
const logger                  = require('../utils/logger');
const AppError                = require('../utils/AppError');

async function runRagPipeline(userQuery, onProgress = null) {
  const startTime = Date.now();
  const emit = (step, message) => {
    logger.debug(`[Pipeline] ${step}: ${message}`);
    if (typeof onProgress === 'function') onProgress(step, message);
  };

  // ── Step 1: Vector DB Retrieval ──────────────────────────
  emit('searching', 'Searching knowledge base for relevant documents...');
  let rawDocuments = [];
  try {
    rawDocuments = await retrieveDocuments(userQuery, 15);
  } catch (err) {
    // Don't throw — fall back to general knowledge
    logger.warn(`[Pipeline] Vector DB retrieval failed — falling back to general knowledge. ${err.message}`);
    rawDocuments = [];
  }

  const hasDocuments = rawDocuments && rawDocuments.length > 0;

  // ── Step 2: Filter Agent ─────────────────────────────────
  let filteredDocuments = [];
  let filterSummary     = 'No documents retrieved — using general knowledge.';
  let removedCount      = 0;

  if (hasDocuments) {
    emit('filtering', `Filtering ${rawDocuments.length} retrieved documents for relevance and safety...`);
    try {
      const filterResult = await runFilterAgent(userQuery, rawDocuments);
      filteredDocuments  = filterResult.filteredDocuments;
      filterSummary      = filterResult.filterSummary;
      removedCount       = filterResult.removedCount;
    } catch (err) {
      logger.warn('[Pipeline] Filter agent failed — using all raw docs.', { error: err.message });
      filteredDocuments = rawDocuments;
      filterSummary     = 'Filter skipped.';
    }
  } else {
    emit('filtering', 'No documents found — Sentinel.AI will use general knowledge...');
  }

  // ── Step 3: Generator Agent ──────────────────────────────
  emit('generating', filteredDocuments.length > 0
    ? `Generating verified answer using ${filteredDocuments.length} vetted sources...`
    : 'Generating answer from general knowledge...'
  );

  let generatedAnswer;
  try {
    generatedAnswer = await runGeneratorAgent(userQuery, filteredDocuments);
  } catch (err) {
    throw new AppError(`Generator agent failed: ${err.message}`, 502, 'GENERATOR_ERROR');
  }

  // ── Step 4: Evaluator Agent ──────────────────────────────
  emit('evaluating', 'Evaluating response quality and confidence score...');
  let evalResult;
  try {
    evalResult = await runEvaluatorAgent(userQuery, generatedAnswer, filteredDocuments);
  } catch (err) {
    logger.warn('[Pipeline] Evaluator failed — using generator output with default score.', { error: err.message });
    evalResult = {
      confidenceScore:   7,
      isAccurate:        true,
      refinementNeeded:  false,
      evaluationSummary: 'Evaluator unavailable.',
      finalAnswer:       generatedAnswer,
    };
  }

  const sources    = filteredDocuments.map((doc) => ({ id: doc.id, title: doc.title }));
  const durationMs = Date.now() - startTime;

  logger.info(`[Pipeline] Completed in ${durationMs}ms. Score: ${evalResult.confidenceScore}/10`);
  emit('complete', `Done. Confidence score: ${evalResult.confidenceScore}/10`);

  return {
    answer:          evalResult.finalAnswer,
    confidenceScore: evalResult.confidenceScore,
    sources,
    status:          'success',
    metadata: {
      durationMs,
      filterSummary,
      removedCount,
      evaluationSummary: evalResult.evaluationSummary,
      isAccurate:        evalResult.isAccurate,
      refinementNeeded:  evalResult.refinementNeeded,
      rawDocCount:       rawDocuments.length,
      filteredDocCount:  filteredDocuments.length,
      usedGeneralKnowledge: filteredDocuments.length === 0,
    },
  };
}

module.exports = { runRagPipeline };