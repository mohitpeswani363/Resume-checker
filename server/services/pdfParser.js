const pdfParse = require('pdf-parse');

async function parsePdfBuffer(buffer) {
  const result = await pdfParse(buffer);
  const text = result.text?.trim() || '';

  if (!text) {
    const error = new Error('Could not extract text from PDF. Try a text-based PDF or paste manually.');
    error.status = 422;
    throw error;
  }

  return text;
}

module.exports = { parsePdfBuffer };
