'use strict';

const { parsePdf, chunkText } = require('../services/documentProcessor');
const { upsertDocuments } = require('../services/vectorDbService');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

async function handleDocumentUpload(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded. Please upload a PDF.', 400, 'NO_FILE');
    }

    const file = req.file;
    if (file.mimetype !== 'application/pdf') {
      throw new AppError('Only PDF files are supported.', 400, 'INVALID_FILE_TYPE');
    }

    logger.info(`[DocumentController] Processing uploaded file: ${file.originalname}`);

    // 1. Parse PDF
    const text = await parsePdf(file.buffer);
    if (!text || text.trim() === '') {
      throw new AppError('Could not extract any text from the PDF.', 400, 'EMPTY_PDF');
    }

    // 2. Chunk Text
    const chunks = chunkText(text, 1000, 200);
    logger.info(`[DocumentController] Extracted ${chunks.length} chunks from ${file.originalname}`);

    // 3. Upsert to Pinecone
    await upsertDocuments(chunks, file.originalname);

    return res.status(200).json({
      status: 'success',
      message: `Successfully processed and ingested ${file.originalname}`,
      metadata: {
        filename: file.originalname,
        chunksGenerated: chunks.length,
      }
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleDocumentUpload,
};
