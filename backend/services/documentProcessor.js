'use strict';

const pdfParse = require('pdf-parse');
const logger = require('../utils/logger');

/**
 * Parses a PDF buffer and extracts text.
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
async function parsePdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (err) {
    logger.error('[DocumentProcessor] Failed to parse PDF', { error: err });
    throw new Error(`Failed to extract text from PDF: ${err.message}`);
  }
}

/**
 * Chunks text into smaller pieces with overlap.
 * @param {string} text 
 * @param {number} maxChunkSize 
 * @param {number} overlap 
 * @returns {string[]}
 */
function chunkText(text, maxChunkSize = 1000, overlap = 200) {
  const chunks = [];
  if (!text) return chunks;

  // Clean up excessive whitespace
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  let i = 0;
  while (i < cleanText.length) {
    let end = i + maxChunkSize;
    if (end >= cleanText.length) {
      chunks.push(cleanText.slice(i).trim());
      break;
    }
    
    // Find a good breaking point (space) to avoid cutting words in half
    let breakPoint = end;
    while (breakPoint > i + maxChunkSize - 150 && cleanText[breakPoint] !== ' ') {
      breakPoint--;
    }
    
    // If we didn't find a space, just cut it at maxChunkSize
    if (breakPoint === i + maxChunkSize - 150) {
      breakPoint = end;
    }
    
    chunks.push(cleanText.slice(i, breakPoint).trim());
    
    // Move forward, but backtrack by 'overlap' amount from the breakPoint
    i = breakPoint - overlap;
    
    // Ensure we don't get stuck in an infinite loop if overlap >= chunk size
    if (i <= 0 || (breakPoint - overlap) <= i - (maxChunkSize - overlap)) {
       i += (maxChunkSize - overlap); // force moving forward
    }
  }
  
  return chunks.filter(c => c.length > 0);
}

module.exports = {
  parsePdf,
  chunkText,
};
