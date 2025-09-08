# utils/ocr_utils.py
import pytesseract
from pdf2image import convert_from_path

def ocr_extract_text(pdf_path):
    """
    Extract text from scanned PDFs using OCR (Tesseract).
    """
    text = ""
    try:
        pages = convert_from_path(pdf_path)
        for page_num, page in enumerate(pages):
            text += pytesseract.image_to_string(page)
    except Exception as e:
        print(f"OCR error: {e}")
    return text
