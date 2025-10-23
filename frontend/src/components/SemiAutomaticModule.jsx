import React, { useState, useEffect } from "react";
import PDFViewer from "./PDFViewer";
import RedactionSidebar from "./RedactionSidebar";

// file: uploaded PDF File object
export default function SemiAutomaticModule({ file }) {
  const [redactedPreview, setRedactedPreview] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(null);

  // Fetch extraction, suggestion list, preview PDF
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);

      // Step 1: Extract text
      const formData = new FormData();
      formData.append("file", file);
      const blocks = await fetch("/extract-text", { method: "POST", body: formData }).then(r => r.json());

      // Step 2: Get suggestion entities
      const suggestionRes = await fetch("/suggest-redactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blocks)
      }).then(r => r.json());

      setSuggestions(suggestionRes);

      // Step 3: Generate preview PDF with suggested overlays
      const previewForm = new FormData();
      previewForm.append("pdf", file);
      previewForm.append("suggestions", JSON.stringify(suggestionRes));
      const previewBlob = await fetch("/redact-preview", { method: "POST", body: previewForm }).then(res => res.blob());
      setRedactedPreview(URL.createObjectURL(previewBlob));

      setLoading(false);
    }
    if (file) fetchAll();
  }, [file]);

  // Actions for suggestions (accept/reject, etc)
  const handleUpdateSuggestions = async (updatedSuggestions) => {
    setSuggestions(updatedSuggestions);
    // Re-request preview
    const previewForm = new FormData();
    previewForm.append("pdf", file);
    previewForm.append("suggestions", JSON.stringify(updatedSuggestions));
    const previewBlob = await fetch("/redact-preview", { method: "POST", body: previewForm }).then(res => res.blob());
    setRedactedPreview(URL.createObjectURL(previewBlob));
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* PDF Preview */}
      <div style={{ flex: 2, padding: "16px" }}>
        <h2>Semi-Automatic Redacted PDF</h2>
        {loading && <div>Loading PDF and suggestions...</div>}
        {redactedPreview && (
          <PDFViewer file={redactedPreview} onLoadSuccess={({ numPages }) => setNumPages(numPages)} />
        )}
      </div>

      {/* Sidebar for suggestions */}
      <div style={{
        width: 350,
        background: "#f6f7fc",
        padding: "16px",
        borderLeft: "1px solid #ddd",
        overflowY: "auto"
      }}>
        <RedactionSidebar
          suggestions={suggestions}
          onUpdate={handleUpdateSuggestions}
        />
      </div>
    </div>
  );
}
