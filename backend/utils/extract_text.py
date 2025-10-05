"""
Text extraction utility (PDF or image)
Uses PyMuPDF for PDF, pytesseract for OCR if needed
"""

import fitz
from PIL import Image
import pytesseract
import io

def extract_text(pdf_path):
    results = []
    pdf = fitz.open(pdf_path)
    for page_num in range(len(pdf)):
        page = pdf[page_num]
        text = page.get_text()
        blocks = page.get_text("blocks")
        block_data = [
            {
                "text": b[4],
                "x": b[0],
                "y": b[1],
                "width": b[2] - b[0],
                "height": b[3] - b[1],
                "page": page_num + 1
            }
            for b in blocks
        ]
        results.append({
            "page": page_num + 1,
            "text": text,
            "blocks": block_data
        })
    pdf.close()
    return results
