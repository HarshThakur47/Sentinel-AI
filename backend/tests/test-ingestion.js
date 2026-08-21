'use strict';

const fs = require('fs');
const path = require('path');
const { parsePdf, chunkText } = require('../services/documentProcessor');
const { upsertDocuments } = require('../services/vectorDbService');

const pdfPath = path.join(__dirname, '../../pharmaceuticals-16-01283.pdf');

async function runIngestionTest() {
  console.log('--- STARTING INGESTION TEST ---');
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ Test PDF not found at: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`Reading PDF file: ${pdfPath}...`);
  const buffer = fs.readFileSync(pdfPath);

  console.log('Extracting text from PDF (parsePdf)...');
  const text = await parsePdf(buffer);
  console.log(`✅ Text extracted successfully. Length: ${text.length} characters.`);

  console.log('Chunking text (chunkText)...');
  const chunks = chunkText(text, 1000, 200);
  console.log(`✅ Chunks generated. Count: ${chunks.length} chunks.`);

  // Test 1: Sequential Upsert Mode
  console.log('\n--- Test 1: Sequential Upsert Mode ---');
  try {
    const startSeq = Date.now();
    await upsertDocuments(chunks.slice(0, 5), 'pharmaceuticals-16-01283.pdf', false);
    const durationSeq = Date.now() - startSeq;
    console.log(`✅ Sequential upsert completed in ${durationSec(durationSeq)}.`);
  } catch (err) {
    console.error(`❌ Sequential upsert failed: ${err.message}`);
  }

  // Test 2: Parallel Upsert Mode
  console.log('\n--- Test 2: Parallel Upsert Mode ---');
  try {
    const startPar = Date.now();
    await upsertDocuments(chunks.slice(0, 5), 'pharmaceuticals-16-01283.pdf', true);
    const durationPar = Date.now() - startPar;
    console.log(`✅ Parallel upsert completed in ${durationSec(durationPar)}.`);
  } catch (err) {
    console.error(`❌ Parallel upsert failed: ${err.message}`);
  }

  console.log('\n--- INGESTION TEST FINISHED ---');
}

function durationSec(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

runIngestionTest().catch((err) => {
  console.error('❌ Test crashed:', err);
  process.exit(1);
});
