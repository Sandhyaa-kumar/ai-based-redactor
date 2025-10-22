"""
PDF redaction and overlay utilities (PyMuPDF) - Using Draw Rect Workaround
"""
print(">>> DEBUG: redact_pdf.py WAS IMPORTED <<<")
import fitz # PyMuPDF
import re   # Import the regular expression module
# Print statements to confirm library details upon import
try:
    print(f">>> DEBUG: Using fitz module from: {fitz.__file__}")
    print(f">>> DEBUG: fitz version: {fitz.__version__}")
except Exception as e:
    print(f">>> DEBUG: Error getting fitz details: {e}")


def hex_to_rgb_tuple(hex_color):
    """Converts a hex color string (e.g., '#FF0000') to an RGB tuple (e.g., (1, 0, 0))."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 3:
        hex_color = "".join([c*2 for c in hex_color])
    if len(hex_color) != 6:
        return (0, 0, 0) # Default to black
    try:
        r = int(hex_color[0:2], 16) / 255.0
        g = int(hex_color[2:4], 16) / 255.0
        b = int(hex_color[4:6], 16) / 255.0
        return (r, g, b)
    except ValueError:
        return (0, 0, 0) # Default to black

def overlay_redactions(pdf_path, output_path, suggestions):
    """Generates a preview PDF with semi-transparent overlays."""
    pdf = None
    try:
        pdf = fitz.open(pdf_path)
        for s in suggestions:
            page_idx = s.get("page", 1) - 1
            if page_idx < 0 or page_idx >= len(pdf):
                print(f"Warning: Invalid page index {page_idx+1} skipped in overlay.")
                continue
            page = pdf[page_idx]
            try:
                x = float(s["x"])
                y = float(s["y"])
                w = float(s["width"])
                h = float(s["height"])
                rect = fitz.Rect(x, y, x + w, y + h)
            except (ValueError, KeyError) as e:
                print(f"Warning: Invalid coordinates for shape {s.get('id', 'N/A')} in overlay: {e}. Skipping.")
                continue

            color_tuple = hex_to_rgb_tuple(s.get("color", "#000000"))
            opacity = 0.5 # Semi-transparent for preview

            if s.get("type") == "text-blur":
                # Preview blur as semi-transparent gray
                page.draw_rect(rect, color=(0.5, 0.5, 0.5), fill=(0.5, 0.5, 0.5), overlay=True, fill_opacity=opacity)
            else: # Rectangle
                page.draw_rect(rect, color=color_tuple, fill=color_tuple, overlay=True, fill_opacity=opacity)

        pdf.save(output_path)
        print(f">>> DEBUG: Saved preview PDF to {output_path}")
    except Exception as e:
        print(f"Error saving preview PDF: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if pdf:
            pdf.close()

def finalize_redact(pdf_path, output_path, suggestions):
    """Generates the final PDF by drawing opaque shapes (WORKAROUND)."""
    pdf = None
    try:
        pdf = fitz.open(pdf_path)
        print(f">>> DEBUG: (finalize_redact - WORKAROUND) Object type: {type(pdf)}")

        for s in suggestions:
            page_idx = s.get("page", 1) - 1
            if page_idx < 0 or page_idx >= len(pdf):
                print(f"Warning: Invalid page index {page_idx+1} skipped in finalize.")
                continue
            page = pdf[page_idx]
            try:
                x = float(s["x"])
                y = float(s["y"])
                w = float(s["width"])
                h = float(s["height"])
                if w <= 0 or h <= 0: # Skip zero-dimension rectangles
                    print(f"Warning: Skipping zero-dimension shape {s.get('id', 'N/A')}.")
                    continue
                rect = fitz.Rect(x, y, x + w, y + h)
            except (ValueError, KeyError) as e:
                print(f"Warning: Invalid coordinates for shape {s.get('id', 'N/A')} in finalize: {e}. Skipping.")
                continue

            color_tuple = hex_to_rgb_tuple(s.get("color", "#000000"))
            opacity = 1.0 # Fully opaque for final output

            # --- WORKAROUND ---
            # Draw fully opaque rectangles instead of using apply_redactions
            print(f">>> DEBUG: (finalize_redact - WORKAROUND) Drawing rect on page {page_idx+1} at {rect} with color {color_tuple}")
            if s.get("type") == "text-blur":
                # Apply blur effect by pixelating the area - More complex,
                # for now, just draw an opaque box like regular redaction.
                # You could replace this with image processing later if needed.
                page.draw_rect(rect, color=color_tuple, fill=color_tuple, overlay=True, fill_opacity=opacity)
            else: # Rectangle
                page.draw_rect(rect, color=color_tuple, fill=color_tuple, overlay=True, fill_opacity=opacity)
            # --- END WORKAROUND ---

        # Save the modified document
        pdf.save(output_path, garbage=3, deflate=True) # garbage=3 is often sufficient
        print(f">>> DEBUG: (finalize_redact - WORKAROUND) Saved final PDF to {output_path}")

    except Exception as e:
        print(f"Error during final drawing/saving PDF (WORKAROUND): {e}")
        import traceback
        traceback.print_exc()
        raise # Re-raise exception for Flask
    finally:
        if pdf:
            pdf.close()