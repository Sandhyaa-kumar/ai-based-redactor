import React, { useEffect, useState } from "react";

export default function FullyAutomatic({ file }) {
  const [redactedPdfUrl, setRedactedPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setRedactedPdfUrl(null);

    const formData = new FormData();
    formData.append("file", file);

    fetch("http://localhost:5000/fully-auto-redact", {
      method: "POST",
      body: formData,
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Redaction failed");
        }
        const data = await res.json();
        if (data.status === "success" && data.pdf_base64) {
          const url = `data:${data.mimetype};base64,${data.pdf_base64}`;
          setRedactedPdfUrl(url);
        } else {
          throw new Error("Invalid response from server");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [file]);

  if (!file) return <div>No PDF file selected.</div>;

  return (
    <div>
      <div style={{
        marginBottom: "1rem",
        fontWeight: "bold",
        fontSize: "1.1rem",
      }}>
        File: {file.name} - Fully Automatic Redact
      </div>
      {loading && <div style={{padding:"1rem"}}>Processing...</div>}
      {error && <div style={{ color: "red", padding:"1rem" }}>{error}</div>}
      {redactedPdfUrl && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          <div style={{width: "100%", maxWidth: "1200px"}}>
            <div style={{fontWeight: "bold", marginBottom:"1rem"}}>Redacted PDF Preview:</div>
            <iframe
              src={redactedPdfUrl}
              width="100%"
              height="900px"
              style={{
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                border: "none",
                background: "#fff"
              }}
              title="Redacted PDF"
            />
          </div>
          <a
            href={redactedPdfUrl}
            download="redacted.pdf"
            style={{
              marginTop: "2rem",
              padding: "16px 32px",
              background: "#16a34a",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "1.15rem",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(22,163,74,0.10)",
              textDecoration: "none",
              transition: "background 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "#15803d"}
            onMouseOut={e => e.currentTarget.style.background = "#16a34a"}
          >
            Download Redacted PDF
          </a>
        </div>
      )}
    </div>
  );
}
