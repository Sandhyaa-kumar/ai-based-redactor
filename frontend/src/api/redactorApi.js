// src/api/redactorApi.js
// API utility for backend calls (text extraction, redaction suggestions)
// Usage: import { extractText, suggestRedactions } from './api/redactorApi';

const BASE_URL = 'http://localhost:8000'; // Change if backend runs elsewhere

/**
 * Calls /extract-text API with a PDF or image file
 * @param {File} file - PDF or image file
 * @returns {Promise<Array>} - [{page, text, blocks}]
 */
export async function extractText(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/extract-text`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Text extraction failed');
  return await res.json();
}

/**
 * Calls /suggest-redactions API with extracted text
 * @param {Array} extractedText - [{page, text, blocks}]
 * @returns {Promise<Array>} - [{type, entity, page, x, y, width, height}]
 */
export async function suggestRedactions(extractedText) {
  const res = await fetch(`${BASE_URL}/suggest-redactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(extractedText),
  });
  if (!res.ok) throw new Error('Redaction suggestion failed');
  return await res.json();
}
