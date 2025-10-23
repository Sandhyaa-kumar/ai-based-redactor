"""
PDF redaction and overlay utilities (PyMuPDF)
"""

import fitz


def overlay_redactions(pdf_path, output_path, suggestions):
    pdf = fitz.open(pdf_path)
    for s in suggestions:
        page_idx = s["page"] - 1
        page = pdf[page_idx]
        rect = fitz.Rect(s["x"], s["y"], s["x"] + s["width"], s["y"] + s["height"])
        if s.get("suggested_redaction", "rectangle") == "rectangle":
            page.draw_rect(rect, color=(1, 0, 0), width=2, fill=None, overlay=True)
        elif s.get("suggested_redaction", "blur"):
            # For preview: just draw gray rectangle; true blur requires image ops
            page.draw_rect(rect, color=(0.8, 0.8, 0.8), width=2, fill=(0.8, 0.8, 0.8))
    pdf.save(output_path)
    pdf.close()


def finalize_redact(pdf_path, output_path, suggestions):
    pdf = fitz.open(pdf_path)
    for s in suggestions:
        page_idx = s["page"] - 1
        page = pdf[page_idx]
        rect = fitz.Rect(s["x"], s["y"], s["x"] + s["width"], s["y"] + s["height"])
        # Draw a filled black rectangle to "redact" the content
        page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))
    pdf.save(output_path)
    pdf.close()
