import React, { useState } from "react";

function FullyAutomatedModule({ file }) {
  const [status, setStatus] = useState("Waiting to process...");

  const handleProcess = async () => {
    setStatus("Processing...");

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const response = await fetch("http://127.0.0.1:5000/redact", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to process");

      // Blob (downloadable file)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = "redacted.pdf";
      a.click();

      setStatus("Processing completed ✅");
    } catch (error) {
      console.error(error);
      setStatus("❌ Error processing file");
    }
  };

  return (
    <div className="text-center space-y-4">
      <p className="text-lg text-gray-700">{status}</p>
      <button
        onClick={handleProcess}
        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
      >
        Run Fully Automated Redaction
      </button>
    </div>
  );
}

export default FullyAutomatedModule;
