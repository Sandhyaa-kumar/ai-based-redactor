from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
from utils.extract_text import extract_text
from utils.entity_detection import get_redaction_suggestions
from utils.redact_pdf import overlay_redactions, finalize_redact

app = Flask(__name__)
CORS(app)
OUTPUT_DIR = "output_pdfs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.route("/extract-text", methods=["POST"])
def extract_text_api():
    # DEBUG PRINTS
    print("FILES =>", request.files)
    print("FORM =>", request.form)
    print("DATA =>", request.data)
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    print("RECEIVED FILE:", file.filename)  # further debug
    temp_pdf = os.path.join(OUTPUT_DIR, "temp_extract.pdf")
    file.save(temp_pdf)
    print("File saved to:", temp_pdf)
    result = extract_text(temp_pdf)
    print("Extraction result (truncated):", str(result)[:500])
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
    suggestions = request.form['suggestions']
    import json
    suggestions = json.loads(suggestions)
    temp_pdf = os.path.join(OUTPUT_DIR, "temp_preview.pdf")
    file.save(temp_pdf)
    preview_pdf = os.path.join(OUTPUT_DIR, "preview_redacted.pdf")
    overlay_redactions(temp_pdf, preview_pdf, suggestions)
    return send_file(preview_pdf, as_attachment=True, download_name="preview_redacted.pdf")

@app.route("/redact", methods=["POST"])
def redact_api():
    if 'pdf' not in request.files or 'suggestions' not in request.form:
        return jsonify({"error": "Missing PDF or suggestions"}), 400
    file = request.files['pdf']
    suggestions = request.form['suggestions']
    import json
    suggestions = json.loads(suggestions)
    temp_pdf = os.path.join(OUTPUT_DIR, "temp_final.pdf")
    file.save(temp_pdf)
    final_pdf = os.path.join(OUTPUT_DIR, "final_redacted.pdf")
    finalize_redact(temp_pdf, final_pdf, suggestions)
    return send_file(final_pdf, as_attachment=True, download_name="final_redacted.pdf")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
