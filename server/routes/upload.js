const express = require('express');
const multer = require('multer');
const { parsePdfBuffer } = require('../services/pdfParser');
const { MIN_RESUME_LENGTH } = require('../services/resumeAnalyzer');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed.'));
    }
  },
});

router.post('/', upload.single('resume'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'PDF file is required.' });
  }

  try {
    const text = await parsePdfBuffer(req.file.buffer);

    if (text.length < MIN_RESUME_LENGTH) {
      return res.status(400).json({
        error: `Extracted text is too short (${text.length} chars). Minimum ${MIN_RESUME_LENGTH} required.`,
        text,
        minLength: MIN_RESUME_LENGTH,
      });
    }

    return res.json({ text, charCount: text.length });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Unable to parse PDF.' });
  }
});

router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'PDF must be under 5 MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

module.exports = router;
