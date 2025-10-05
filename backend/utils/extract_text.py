import fitz
from PIL import Image
import pytesseract
import io
import os
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
def extract_text(pdf_path):
    results = []

    # Check if the file is a PDF or a direct image
    file_lower = pdf_path.lower()
    if file_lower.endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif')):
        # It's an image file
        with open(pdf_path, "rb") as f:
            img = Image.open(io.BytesIO(f.read()))
            text = pytesseract.image_to_string(img)
            results.append({
                "page": 1,
                "text": text,
                "blocks": []  # Optionally, use pytesseract.image_to_data for block info
            })
        return results

    # It's a PDF
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
        # If no text found, run OCR on the page
        if not text.strip():
            pix = page.get_pixmap()
            img = Image.open(io.BytesIO(pix.tobytes()))
            ocr_text = pytesseract.image_to_string(img)
            text = ocr_text
            # Optionally replace blocks with better bounding boxes using pytesseract.image_to_data
            # Uncomment below for detailed OCR bounding boxes:
            """
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
            block_data = []
            n = len(data['text'])
            for i in range(n):
                if int(data['conf'][i]) > 0 and data['text'][i].strip():
                    block_data.append({
                        "text": data['text'][i],
                        "x": data['left'][i],
                        "y": data['top'][i],
                        "width": data['width'][i],
                        "height": data['height'][i],
                        "page": page_num + 1
                    })
            """
        results.append({
            "page": page_num + 1,
            "text": text,
            "blocks": block_data
        })
    pdf.close()
    return results
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python extract_text.py [pdf_or_image_path]")
    else:
        results = extract_text(sys.argv[1])
        for page in results:
            print(f"--- Page {page['page']} ---")
            print(page['text'])
            print()
