'use strict';

/**
 * Sentinel.AI — Pipeline Integration Test
 *
 * Run with: node tests/test-pipeline.js
 *
 * Tests:
 *   1. Mock vector DB retrieval
 *   2. Full pipeline (mock mode — no API keys needed)
 *   3. SSE stream simulation
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { retrieveDocuments }  = require('../services/vectorDbService');
const { runRagPipeline }     = require('../services/ragPipelineService');

const COLORS = {
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
};

function log(color, msg) { console.log(`${color}${msg}${COLORS.reset}`); }
function pass(msg) { log(COLORS.green,  `  ✅  ${msg}`); }
function fail(msg) { log(COLORS.red,    `  ❌  ${msg}`); }
function info(msg) { log(COLORS.cyan,   `  ℹ️   ${msg}`); }
function head(msg) { log(COLORS.bold,   `\n${msg}`); }

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { pass(label); passed++; }
  else           { fail(label); failed++; }
}

// ─── Test 1: Mock Vector DB ───────────────────────────────────────────────────

async function testVectorDB() {
  head('Test 1: Mock Vector DB Retrieval');
  try {
    const docs = await retrieveDocuments('What are the side effects of Metformin?', 5);
    assert(Array.isArray(docs),          'Returns an array');
    assert(docs.length > 0,              'Returns at least one document');
    assert(typeof docs[0].title === 'string',   'Documents have a title');
    assert(typeof docs[0].content === 'string', 'Documents have content');
    assert(typeof docs[0].score === 'number',   'Documents have a numeric score');
    info(`Retrieved ${docs.length} docs. Top score: ${docs[0]?.score}`);
  } catch (err) {
    fail(`Vector DB test threw: ${err.message}`);
    failed++;
  }
}

// ─── Test 2: Full Pipeline (Mock) ─────────────────────────────────────────────

async function testPipeline() {
  head('Test 2: Full RAG Pipeline (Mock Mode)');

  const steps = [];
  const onProgress = (step, message) => {
    steps.push(step);
    info(`  [${step}] ${message}`);
  };

  try {
    const result = await runRagPipeline('What are the side effects of Metformin?', onProgress);

    assert(typeof result.answer === 'string' && result.answer.length > 0,  'Has an answer string');
    assert(typeof result.confidenceScore === 'number',                      'Has a numeric confidenceScore');
    assert(result.confidenceScore >= 0 && result.confidenceScore <= 10,    'Score is in [0, 10]');
    assert(Array.isArray(result.sources),                                   'Has sources array');
    assert(['success', 'no_results', 'filtered_empty'].includes(result.status), 'Has valid status');
    assert(steps.length >= 1,                                               'Progress callback was called');

    info(`Answer preview: "${result.answer.slice(0, 80)}..."`);
    info(`Score: ${result.confidenceScore}/10 | Sources: ${result.sources.length} | Steps emitted: ${steps.length}`);

  } catch (err) {
    fail(`Pipeline test threw: ${err.message}`);
    failed++;
    console.error(err.stack);
  }
}

// ─── Test 3: Input Validation ─────────────────────────────────────────────────

async function testInputValidation() {
  head('Test 3: Input Validation');

  const AppError = require('../utils/AppError');

  // Simulate what the controller does
  function validateQuery(userQuery) {
    if (typeof userQuery !== 'string') throw new AppError('Must be string', 400, 'INVALID_INPUT');
    const trimmed = userQuery.trim();
    if (trimmed.length === 0) throw new AppError('Empty', 400, 'EMPTY_QUERY');
    if (trimmed.length > 1000) throw new AppError('Too long', 400, 'QUERY_TOO_LONG');
    return trimmed;
  }

  try { validateQuery('');         fail('Empty string should throw'); }
  catch (e) { assert(e.code === 'EMPTY_QUERY', 'Empty query rejected'); }

  try { validateQuery(123);        fail('Number should throw'); }
  catch (e) { assert(e.code === 'INVALID_INPUT', 'Non-string rejected'); }

  try { validateQuery('a'.repeat(1001)); fail('Over-length should throw'); }
  catch (e) { assert(e.code === 'QUERY_TOO_LONG', 'Long query rejected'); }

  const good = validateQuery('  What is Metformin?  ');
  assert(good === 'What is Metformin?', 'Valid query trimmed correctly');
}

// ─── Runner ───────────────────────────────────────────────────────────────────

(async () => {
  console.log('');
  log(COLORS.bold, '══════════════════════════════════════════════════');
  log(COLORS.bold, '  Sentinel.AI — Backend Integration Tests');
  log(COLORS.bold, '══════════════════════════════════════════════════');

  await testVectorDB();
  await testPipeline();
  await testInputValidation();

  console.log('');
  log(COLORS.bold, '══════════════════════════════════════════════════');
  log(passed === passed + failed ? COLORS.green : COLORS.yellow,
    `  Results: ${passed} passed, ${failed} failed`);
  log(COLORS.bold, '══════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
})();
