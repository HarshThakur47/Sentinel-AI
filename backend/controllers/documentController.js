'use strict';

const { parsePdf, chunkText } = require('../services/documentProcessor');
const { upsertDocuments } = require('../services/vectorDbService');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

async function handleDocumentUpload(req, res, next) {
  try {
    // Multer upload.any() populates req.files. Fallback to req.file inside an array if present.
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) {
      throw new AppError('No files uploaded. Please upload at least one PDF.', 400, 'NO_FILES');
    }

    // Extract parallel flag from form body (form-data fields are strings)
    const parallelMode = req.body.parallel === 'true';
    logger.info(`[DocumentController] Ingesting ${files.length} document(s) in ${parallelMode ? 'PARALLEL' : 'SEQUENTIAL'} mode`);

    const results = [];

    // Inner helper to parse and upsert a single PDF file
    const processFile = async (file) => {
      if (file.mimetype !== 'application/pdf') {
        throw new AppError(`File ${file.originalname} is not a PDF. Only PDF files are supported.`, 400, 'INVALID_FILE_TYPE');
      }

      logger.info(`[DocumentController] Processing file: ${file.originalname}`);

      // 1. Parse PDF
      const text = await parsePdf(file.buffer);
      if (!text || text.trim() === '') {
        throw new AppError(`Could not extract any text from the PDF: ${file.originalname}`, 400, 'EMPTY_PDF');
      }

      // 2. Chunk Text
      const chunks = chunkText(text, 1000, 200);
      logger.info(`[DocumentController] Extracted ${chunks.length} chunks from ${file.originalname}`);

      // 3. Upsert to Pinecone (passing parallelMode to handle chunks concurrently)
      await upsertDocuments(chunks, file.originalname, parallelMode);

      return {
        filename: file.originalname,
        chunksGenerated: chunks.length,
        status: 'success'
      };
    };

    if (parallelMode) {
      // Process files concurrently
      const filePromises = files.map(file => processFile(file));
      const fileResults = await Promise.all(filePromises);
      results.push(...fileResults);
    } else {
      // Process files sequentially
      for (const file of files) {
        const res = await processFile(file);
        results.push(res);
      }
    }

    return res.status(200).json({
      status: 'success',
      message: `Successfully processed and ingested ${files.length} document(s).`,
      results
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleDocumentUpload,
};
