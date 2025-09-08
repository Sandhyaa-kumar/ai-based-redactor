from flask import Flask, request, send_file, jsonify
from utils.extract_text import extract_text
from utils.detect_sensitive import detect_sensitive
from utils.redact_pdf import redact_pdf
from utils.ocr_utils import ocr_extract_text
import os

app = Flask(__name__)

# Ensure output folder exists
OUTPUT_DIR = "output_pdfs"
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

@app.route("/redact", methods=["POST"])
def redact():
    """
    Fully Automated Redaction Module:
    1. Accepts a PDF file
    2. Extracts text + OCR
    3. Detects sensitive info
    4. Redacts PDF
    5. Returns redacted PDF
    """
    if 'pdf' not in request.files:
        return jsonify({"error": "No PDF file uploaded"}), 400

    file = request.files['pdf']
    temp_pdf = os.path.join(OUTPUT_DIR, "temp.pdf")
    file.save(temp_pdf)

    # Step 1: Extract text from PDF
    text = extract_text(temp_pdf)

    # Step 2: OCR (in case of scanned images)
    ocr_text = ocr_extract_text(temp_pdf)
    if ocr_text.strip():
        text += "\n" + ocr_text

    # Step 3: Detect sensitive information
    sensitive_words = detect_sensitive(text)

    # Step 4: Redact PDF
    output_path = os.path.join(OUTPUT_DIR, "redacted.pdf")
    redact_pdf(temp_pdf, output_path, sensitive_words)

    # Step 5: Send back file
    return send_file(output_path, as_attachment=True, download_name="redacted.pdf")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
