from flask import Flask, request, send_file, jsonify, Response
from flask_cors import CORS
import os
import base64
import json
from utils.extract_text import extract_text
from utils.entity_detection import get_redaction_suggestions
from utils.redact_pdf import overlay_redactions, finalize_redact

app = Flask(__name__)
CORS(app)
OUTPUT_DIR = "output_pdfs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.route("/extract-text", methods=["POST"])
def extract_text_api():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    temp_pdf = os.path.join(OUTPUT_DIR, "temp_extract.pdf")
    file.save(temp_pdf)
    result = extract_text(temp_pdf)
    return jsonify(result)

@app.route("/suggest-redactions", methods=["POST"])
def suggest_redactions_api():
    blocks = request.get_json()
    suggestions = get_redaction_suggestions(blocks)
    return jsonify(suggestions)

@app.route("/redact-preview", methods=["POST"])
def redact_preview_api():
    if 'pdf' not in request.files or 'suggestions' not in request.form:
        return jsonify({"error": "Missing PDF or suggestions"}), 400
    file = request.files['pdf']
    suggestions = json.loads(request.form['suggestions'])
    temp_pdf = os.path.join(OUTPUT_DIR, "temp_preview.pdf")
    file.save(temp_pdf)
    preview_pdf = os.path.join(OUTPUT_DIR, "preview_redacted.pdf")
    overlay_redactions(temp_pdf, preview_pdf, suggestions)
    return send_file(preview_pdf, mimetype='application/pdf')

@app.route("/redact", methods=["POST"])
def redact_api():
    if 'pdf' not in request.files or 'suggestions' not in request.form:
        return jsonify({"error": "Missing PDF or suggestions"}), 400
    file = request.files['pdf']
    suggestions = json.loads(request.form['suggestions'])
    temp_pdf = os.path.join(OUTPUT_DIR, "temp_final.pdf")
    file.save(temp_pdf)
    final_pdf = os.path.join(OUTPUT_DIR, "final_redacted.pdf")
    finalize_redact(temp_pdf, final_pdf, suggestions)
    return send_file(final_pdf, as_attachment=True, download_name="final_redacted.pdf")

@app.route("/fully-auto-redact", methods=["POST"])
def fully_auto_redact():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    temp_pdf = os.path.join(OUTPUT_DIR, "temp_fully_auto.pdf")
    output_pdf = os.path.join(OUTPUT_DIR, "fully_auto_redacted.pdf")

    try:
        file.save(temp_pdf)
        # 1. Extract text and get redaction suggestions
        blocks = extract_text(temp_pdf)
        suggestions = get_redaction_suggestions(blocks)
        # 2. Finalize redaction
        finalize_redact(temp_pdf, output_pdf, suggestions)
        # 3. Integrity Check and Base64 Encoding
        if not os.path.exists(output_pdf) or os.path.getsize(output_pdf) == 0:
            file_size = os.path.getsize(output_pdf) if os.path.exists(output_pdf) else 0
            return jsonify({"error": f"Output PDF invalid (size: {file_size})."}), 500
        # Read file, encode, and return as JSON
        with open(output_pdf, 'rb') as f:
            pdf_bytes = f.read()
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        return jsonify({
            "status": "success",
            "pdf_base64": pdf_base64,
            "mimetype": "application/pdf",
            "suggestions": suggestions
        })
    except Exception as e:
        print(f"CRITICAL ERROR during fully-auto-redact flow: {e}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
