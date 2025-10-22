from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
import uuid # Import the uuid module
import json # Import json at the top
from werkzeug.utils import secure_filename # For safer filenames

# Assuming these imports are correct based on your project structure
from utils.extract_text import extract_text
from utils.entity_detection import get_redaction_suggestions
from utils.redact_pdf import overlay_redactions, finalize_redact

app = Flask(__name__)
CORS(app) # Enable CORS for all routes
OUTPUT_DIR = "output_pdfs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Helper function to clean up files safely
def safe_remove(filepath):
    if filepath and os.path.exists(filepath):
        try:
            os.remove(filepath)
            print(f"Cleaned up temp file: {filepath}")
        except OSError as e:
            print(f"Error removing temp file {filepath}: {e}")

@app.route("/extract-text", methods=["POST"])
def extract_text_api():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filename = secure_filename(file.filename) # Sanitize filename
    unique_id = uuid.uuid4().hex
    temp_pdf = os.path.join(OUTPUT_DIR, f"temp_extract_{unique_id}_{filename}")

    try:
        file.save(temp_pdf)
        print("File saved for extraction:", temp_pdf)
        result = extract_text(temp_pdf)
        # print("Extraction result (truncated):", str(result)[:500]) # Keep if needed
        return jsonify(result)
    except Exception as e:
        print(f"Error during text extraction: {e}")
        # Log the full traceback for debugging if needed
        # import traceback
        # traceback.print_exc()
        return jsonify({"error": "Failed to extract text from PDF"}), 500
    finally:
        safe_remove(temp_pdf) # Use helper for cleanup


@app.route("/suggest-redactions", methods=["POST"])
def suggest_redactions_api():
    try:
        blocks = request.get_json()
        if not blocks:
             return jsonify({"error": "No text blocks provided"}), 400
        suggestions = get_redaction_suggestions(blocks)
        return jsonify(suggestions)
    except Exception as e:
        print(f"Error suggesting redactions: {e}")
        return jsonify({"error": "Failed to suggest redactions"}), 500


@app.route("/redact-preview", methods=["POST"])
def redact_preview_api():
    if 'pdf' not in request.files or 'suggestions' not in request.form:
        return jsonify({"error": "Missing PDF or suggestions"}), 400
    file = request.files['pdf']
    suggestions_json = request.form['suggestions']
    if not file or file.filename == '':
        return jsonify({"error": "No selected file for preview"}), 400

    filename = secure_filename(file.filename)
    unique_id = uuid.uuid4().hex
    temp_pdf = os.path.join(OUTPUT_DIR, f"temp_preview_{unique_id}_{filename}")
    preview_pdf = os.path.join(OUTPUT_DIR, f"preview_redacted_{unique_id}.pdf")

    try:
        suggestions = json.loads(suggestions_json)
        file.save(temp_pdf)
        print("File saved for preview:", temp_pdf)
        overlay_redactions(temp_pdf, preview_pdf, suggestions)
        print("Preview generated:", preview_pdf)
        # Use try...finally specifically around send_file if cleanup needed after sending
        # However, deleting the preview file immediately is often problematic.
        # Consider a background cleanup task for generated preview/final files later.
        return send_file(preview_pdf, as_attachment=True, download_name=f"preview_{filename}")
    except json.JSONDecodeError:
         return jsonify({"error": "Invalid suggestions format"}), 400
    except Exception as e:
        print(f"Error during preview generation: {e}")
        return jsonify({"error": "Failed to generate preview PDF"}), 500
    finally:
         safe_remove(temp_pdf) # Clean up the input temp file


@app.route("/redact", methods=["POST"])
def redact_api():
    temp_pdf = None # Initialize to None
    final_pdf = None # Initialize to None
    try:
        if 'pdf' not in request.files or 'suggestions' not in request.form:
            return jsonify({"error": "Missing PDF or suggestions"}), 400
        file = request.files['pdf']
        suggestions_json = request.form['suggestions']
        if not file or file.filename == '':
            return jsonify({"error": "No selected file for redaction"}), 400

        filename = secure_filename(file.filename)
        unique_id = uuid.uuid4().hex
        temp_pdf = os.path.join(OUTPUT_DIR, f"temp_final_{unique_id}_{filename}")
        final_pdf = os.path.join(OUTPUT_DIR, f"final_redacted_{unique_id}.pdf")

        suggestions = json.loads(suggestions_json)
        file.save(temp_pdf)
        print("File saved for final redaction:", temp_pdf)

        finalize_redact(temp_pdf, final_pdf, suggestions) # Perform redaction
        print("Final PDF generated:", final_pdf)

        # Send the final PDF for download
        return send_file(final_pdf, as_attachment=True, download_name=f"redacted_{filename}")

    except json.JSONDecodeError:
         print(f"Error decoding suggestions JSON: {suggestions_json[:100]}") # Log part of the bad JSON
         return jsonify({"error": "Invalid suggestions format"}), 400
    except Exception as e:
        print(f"Error during final redaction: {e}")
        # Log the full traceback for detailed debugging
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to finalize redacted PDF"}), 500
    finally:
        # Clean up the temporary input file only
        safe_remove(temp_pdf)
        # Note: final_pdf should ideally be cleaned up later by a separate process
        # or TTL mechanism, as deleting it here might happen before download completes.


if __name__ == "__main__":
    # Ensure debug=True is only used for development
    app.run(host="0.0.0.0", port=5000, debug=True)