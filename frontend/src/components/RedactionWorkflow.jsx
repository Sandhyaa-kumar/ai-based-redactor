// src/components/RedactionWorkflow.jsx
// Main workflow for document upload, extraction, and redaction suggestions
// Usage: <RedactionWorkflow />

import React, { useEffect, useState, useRef } from "react";
import { extractText, suggestRedactions } from "../api/redactorApi";
import { Document, Page } from "react-pdf";
// Helper for overlay positioning
function getOverlayStyle(block) {
  // block: {x, y, width, height} in PDF units, need to scale to rendered size
  // For demo, use absolute positioning with some scaling
  return {
    position: "absolute",
    left: block.x * 1.2,
    top: block.y * 1.2,
    width: block.width * 1.2,
    height: block.height * 1.2,
    background: "rgba(255,0,0,0.2)",
    border: "2px solid red",
    zIndex: 10,
    cursor: "pointer",
  };
}

export default function RedactionWorkflow({ file }) {
  // file is passed from App.jsx, no upload UI here
  const [loading, setLoading] = useState(true);
  const [extracted, setExtracted] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");
  // Track status for each suggestion: accepted, rejected, or modified
  const [suggestionStatus, setSuggestionStatus] = useState({});
  // For live preview, store accepted redactions
  const [acceptedRedactions, setAcceptedRedactions] = useState([]);
  // For sidebar
  const [showSidebar, setShowSidebar] = useState(true);

  // Fetch extraction and suggestions on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const extractedText = await extractText(file);
        setExtracted(extractedText);
        const redactionSuggestions = await suggestRedactions(extractedText);
        setSuggestions(redactionSuggestions);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }
    if (file) fetchData();
  }, [file]);

  // Accept suggestion
  const handleAccept = (idx) => {
    setSuggestionStatus((prev) => ({ ...prev, [idx]: "accepted" }));
    setAcceptedRedactions((prev) => [...prev, suggestions[idx]]);
  };
  // Reject suggestion
  const handleReject = (idx) => {
    setSuggestionStatus((prev) => ({ ...prev, [idx]: "rejected" }));
    setAcceptedRedactions((prev) => prev.filter((r) => r !== suggestions[idx]));
  };
  // Modify suggestion (drag/resize not implemented, but entity text can be changed)
  const handleModify = (idx) => {
    const newEntity = prompt("Modify entity:", suggestions[idx].entity);
    if (newEntity !== null && newEntity.trim() !== "") {
      setSuggestions((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, entity: newEntity } : s))
      );
      setSuggestionStatus((prev) => ({ ...prev, [idx]: "modified" }));
    }
  };

  // Overlay rendering for PDF
  const renderOverlays = (pageNum) => {
    // Only show overlays for suggestions on this page and not rejected
    return suggestions
      .map((s, idx) => ({ ...s, idx }))
      .filter(
        (s) => s.page === pageNum && suggestionStatus[s.idx] !== "rejected"
      )
      .map((s) => {
        // Use block coordinates if available, else skip overlay
        if (s.x == null || s.y == null || s.width == null || s.height == null)
          return null;
        return (
          <div key={s.idx} style={getOverlayStyle(s)}>
            <div className="flex flex-col items-center">
              <span className="text-xs bg-white px-1 rounded mb-1">
                {s.type}
              </span>
              <button
                className="bg-green-500 text-white px-1 py-0.5 rounded text-xs mb-1"
                onClick={() => handleAccept(s.idx)}
                disabled={suggestionStatus[s.idx] === "accepted"}
              >
                Accept
              </button>
              <button
                className="bg-red-500 text-white px-1 py-0.5 rounded text-xs mb-1"
                onClick={() => handleReject(s.idx)}
                disabled={suggestionStatus[s.idx] === "rejected"}
              >
                Reject
              </button>
              <button
                className="bg-yellow-500 text-white px-1 py-0.5 rounded text-xs"
                onClick={() => handleModify(s.idx)}
              >
                Modify
              </button>
            </div>
          </div>
        );
      });
  };

  // Sidebar for overview
  const renderSidebar = () => (
    <div className="fixed right-0 top-0 h-full w-64 bg-gray-100 shadow-lg p-4 overflow-y-auto z-20">
      <h3 className="font-bold mb-2">Suggestions Overview</h3>
      <ul>
        {suggestions.map((s, idx) => (
          <li key={idx} className="mb-2">
            <span className="font-semibold">{s.type}</span>: {s.entity} (Page{" "}
            {s.page})
            {suggestionStatus[idx] && (
              <span className="ml-2 text-xs text-green-600">
                [{suggestionStatus[idx]}]
              </span>
            )}
            <div className="space-x-1 mt-1">
              <button
                className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                onClick={() => handleAccept(idx)}
                disabled={suggestionStatus[idx] === "accepted"}
              >
                Accept
              </button>
              <button
                className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                onClick={() => handleReject(idx)}
                disabled={suggestionStatus[idx] === "rejected"}
              >
                Reject
              </button>
              <button
                className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                onClick={() => handleModify(idx)}
              >
                Modify
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        className="mt-4 bg-gray-300 px-2 py-1 rounded"
        onClick={() => setShowSidebar(false)}
      >
        Hide Sidebar
      </button>
    </div>
  );

  // Main UI
  return (
    <div className="relative min-h-screen bg-white">
      {loading && (
        <div className="text-center py-8">
          Loading PDF and AI suggestions...
        </div>
      )}
      {error && <div className="text-red-500 mt-2">{error}</div>}
      {/* PDF Preview with overlays */}
      {!loading && file && file.type === "application/pdf" && (
        <div className="flex">
          <div className="relative" style={{ width: "70vw" }}>
            <Document file={file}>
              {Array.from(new Array(extracted.length || 1), (x, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <Page pageNumber={i + 1} />
                  {/* Overlays for this page */}
                  {renderOverlays(i + 1)}
                </div>
              ))}
            </Document>
          </div>
          {/* Sidebar */}
          {showSidebar && renderSidebar()}
          {!showSidebar && (
            <button
              className="fixed right-2 top-2 bg-gray-300 px-2 py-1 rounded z-30"
              onClick={() => setShowSidebar(true)}
            >
              Show Sidebar
            </button>
          )}
        </div>
      )}
      {/* Live Redacted Preview (simple: highlight accepted) */}
      {!loading && acceptedRedactions.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-green-100 p-2 text-center z-10">
          <span className="font-bold">Live Redacted Preview:</span>{" "}
          {acceptedRedactions.length} redactions applied
        </div>
      )}
    </div>
  );
}
