'use strict';

const express = require('express');
const multer = require('multer');
const { handleDocumentUpload } = require('../controllers/documentController');

const router = express.Router();

// Configure multer to store file in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// POST /api/v1/documents/upload
// Expects form-data with key "documents" (or any key) containing PDF files.
router.post('/upload', upload.any(), handleDocumentUpload);

module.exports = router;
