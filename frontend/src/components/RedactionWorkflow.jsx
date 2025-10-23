import React, { useEffect, useState } from "react";
import { Document, Page } from "react-pdf";
import RedactionSidebar from "./RedactionSidebar";

export default function RedactionWorkflow({ file }) {
  const [blocks, setBlocks] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [confirmed, setConfirmed] = useState([]);
  const [manualBoxes, setManualBoxes] = useState([]);
  const [drawingBox, setDrawingBox] = useState(null);
  const [loading, setLoading] = useState(false);
  const [redactedPdfUrl, setRedactedPdfUrl] = useState(null);

  // Fetch AI suggestions
  useEffect(() => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    fetch("http://localhost:5000/extract-text", { method: "POST", body: formData })
      .then(res => res.json())
      .then(blocksData => {
        setBlocks(blocksData);
        return fetch("http://localhost:5000/suggest-redactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(blocksData)
        });
      })
      .then(res => res.json())
      .then(sugg => {
        setSuggestions(sugg);
        setConfirmed(sugg);
      })
      .finally(() => setLoading(false));
  }, [file]);

  // Toggle confirm state for suggestions
  const toggleKeep = (index) => {
    setConfirmed(prev =>
      prev.find(sg => sg.entity === suggestions[index].entity && sg.page === suggestions[index].page && sg.x === suggestions[index].x)
      ? prev.filter(sg => !(sg.entity === suggestions[index].entity && sg.page === suggestions[index].page && sg.x === suggestions[index].x))
      : [...prev, suggestions[index]]
    );
  };

  // Manual rectangle drawing events
  const handleMouseDown = (e) => {
    const bb = e.target.getBoundingClientRect();
    setDrawingBox({ startX: e.clientX - bb.left, startY: e.clientY - bb.top });
  };
  const handleMouseUp = (e) => {
    if (!drawingBox) return;
    const bb = e.target.getBoundingClientRect();
    const endX = e.clientX - bb.left;
    const endY = e.clientY - bb.top;
    setManualBoxes([...manualBoxes, {
      x: Math.min(drawingBox.startX, endX),
      y: Math.min(drawingBox.startY, endY),
      width: Math.abs(drawingBox.startX - endX),
      height: Math.abs(drawingBox.startY - endY),
      page: 1, // Or dynamically based on page
      type: "manual"
    }]);
    setDrawingBox(null);
  };

  // Finalize for backend
  const handleRedact = async () => {
    setLoading(true);
    const allOverlays = [...confirmed, ...manualBoxes];
    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("suggestions", JSON.stringify(allOverlays));
    const res = await fetch("http://localhost:5000/redact", { method: "POST", body: formData });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setRedactedPdfUrl(url);
    setLoading(false);
  };

  return (
    <div className="flex w-full" style={{ minHeight: 900 }}>
      {/* Sidebar */}
      <RedactionSidebar
        suggestions={suggestions}
        confirmed={confirmed}
        onToggle={toggleKeep}
        onStartManual={() => setDrawingBox({})}
        manualBoxes={manualBoxes}
        setManualBoxes={setManualBoxes}
        handleRedact={handleRedact}
        loading={loading}
      />
      {/* PDF area */}
      <div className="flex-1 relative bg-gray-50 p-8" style={{ minHeight: 900 }}>
        <Document file={file}>
          <Page pageNumber={1} width={900}
            onMouseDown={drawingBox ? handleMouseDown : undefined}
            onMouseUp={drawingBox ? handleMouseUp : undefined}
          />
        </Document>
        {/* Overlay AI suggestions */}
        {confirmed.map((s, i) =>
          <div key={i}
            style={{
              position: "absolute",
              border: "2px solid #3b82f6",
              background: "#60a5fa22",
              left: s.x,
              top: s.y,
              width: s.width,
              height: s.height,
              pointerEvents: "none"
            }} />
        )}
        {/* Overlay manual boxes */}
        {manualBoxes.map((m, i) =>
          <div key={i}
            style={{
              position: "absolute",
              border: "2px solid #f59e42",
              background: "#f59e4222",
              left: m.x,
              top: m.y,
              width: m.width,
              height: m.height,
              pointerEvents: "none"
            }} />
        )}
        {redactedPdfUrl &&
          <iframe src={redactedPdfUrl} width="900" height="900" title="Redacted PDF" className="absolute inset-0 rounded bg-white shadow-lg" />
        }
      </div>
    </div>
  );
}
