# AI-Based PDF Redactor

An AI-powered web application that detects and redacts sensitive information from PDF documents using a hybrid approach of **Regular Expressions (Regex)** and **Natural Language Processing (NLP)**.

## Features

- Upload PDF documents
- Manual redaction
- Semi-automatic redaction
- Automatic redaction
- Detect sensitive information using Regex and NLP
- Named Entity Recognition (NER)
- Redact Personally Identifiable Information (PII)
- Download the redacted PDF

## How It Works

1. Upload a PDF document.
2. Extract text from the PDF.
3. Detect sensitive information using Regex and NLP.
4. Identify entities such as names, locations, organizations, emails, phone numbers, and other sensitive information.
5. Allow the user to review and select the detected information.
6. Apply redaction to the selected content.
7. Download the redacted PDF.

## Redaction Modes

### Manual Redaction

The user manually selects the content that needs to be redacted.

### Semi-Automatic Redaction

The system automatically detects sensitive information and allows the user to review and confirm the detected information before applying redaction.

### Automatic Redaction

The system automatically detects and redacts sensitive information without requiring manual selection.

## Technologies Used

- Python
- PyMuPDF
- PyPDF
- PDFPlumber
- spaCy
- Natural Language Processing (NLP)
- Named Entity Recognition (NER)
- Regular Expressions (Regex)
- HTML
- CSS
- JavaScript

## Installation

```bash
git clone <repository-url>
cd AI-PDF-Redactor
pip install -r requirements.txt
python -m spacy download en_core_web_sm
