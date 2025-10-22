import React, { useState, useRef, useCallback, useMemo } from "react";
// Ensure react-pdf is correctly imported. If this fails, it needs to be installed via npm/yarn.
import { Document, Page, pdfjs } from "react-pdf";
import {
  Download,
  Save,
  Eye,
  Square,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Type,
  MousePointer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";


export default function PDFViewer({ file, mode }) {
  // Default tool is 'select' for text selection
  const [activeTool, setActiveTool] = useState("select");
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapes, setShapes] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [currentShape, setCurrentShape] = useState(null);
  const [selectedColor, setSelectedColor] = useState("#000000"); // Default to black
  const [blurIntensity, setBlurIntensity] = useState(5);
  const [showPreview, setShowPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isDownloading, setIsDownloading] = useState(false); // --- NEW: Loading state for download ---
  // --- Text selection for blur ---
  const [textSelection, setTextSelection] = useState(null); // {x, y, width, height, page}

  // Listen for text selection events
  const handleTextSelection = useCallback(
    (pageNumber) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      // Use the ref for the specific page container where Page is rendered
      const pageContainerElement = pageRefs.current[pageNumber]?.closest('.pdf-page-container'); // Find closest container with this class
      if (!pageContainerElement) return;
      const pageContainerRect = pageContainerElement.getBoundingClientRect();

      // Calculate relative coordinates based on the container, accounting for scale
      const scale = zoomLevel / 100;
      const x = (rect.left - pageContainerRect.left) / scale;
      const y = (rect.top - pageContainerRect.top) / scale;
      const width = rect.width / scale;
      const height = rect.height / scale;

      setTextSelection({ x, y, width, height, page: pageNumber });
    },
    [zoomLevel]
  );

  // --- Blur selected text when clicking Text Blur tool ---
  const handleTextBlur = () => {
    if (!textSelection) return;
    setShapes((prev) => [
      ...prev,
      {
        id: `${Date.now()}-blur-${Math.random()}`, // Slightly more unique ID
        type: "text-blur",
        x: textSelection.x,
        y: textSelection.y,
        width: textSelection.width,
        height: textSelection.height,
        color: selectedColor, // Keep color for potential future use or consistency
        blurIntensity: blurIntensity,
        page: textSelection.page,
      },
    ]);
    setTextSelection(null); // Clear selection after applying
    window.getSelection()?.removeAllRanges(); // Deselect text in browser
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(0); // Original width from PDF
  const [pageHeight, setPageHeight] = useState(0); // Original height from PDF

  const svgRef = useRef(null);
  const viewerRef = useRef(null);
  const pageRefs = useRef({}); // Refs for the interactive overlay divs

  const tools = [
    { id: "select", icon: MousePointer, label: "Select" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "text-blur", icon: Type, label: "Text Blur" },
  ];

  // Note: pdfOptions might not be necessary if workerSrc is set globally/correctly
  const pdfOptions = useMemo(
    () => ({
      cMapUrl: "https://unpkg.com/pdfjs-dist@3.11.174/cmaps/",
      cMapPacked: true,
      standardFontDataUrl:
        "https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/",
    }),
    []
  );

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1); // Reset to first page on new document load
    setShapes([]); // Clear shapes from previous document
    setRedoStack([]); // Clear redo stack
  };

  // Get original page dimensions on load
  const onPageLoadSuccess = (page) => {
     // Use originalWidth/Height if available, fallback to calculated width/height
    setPageWidth(page.originalWidth || page.width);
    setPageHeight(page.originalHeight || page.height);
  };

  const handleMouseDown = useCallback(
    (e, pageNumber) => {
      if (mode !== "manual" || activeTool === "select") return;
      // Get the bounding box of the interactive overlay div
      const pageElement = pageRefs.current[pageNumber];
      if (!pageElement) return;
      const rect = pageElement.getBoundingClientRect();
      const scale = zoomLevel / 100;

      // Calculate coordinates relative to the overlay, then unscale
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      setIsDrawing(true);
      setCurrentShape({
        id: `${Date.now()}-${Math.random()}`,
        type: activeTool, // Use activeTool state directly
        x,
        y,
        width: 0,
        height: 0,
        color: selectedColor,
        blurIntensity: blurIntensity,
        page: pageNumber,
      });
    },
    [mode, activeTool, selectedColor, zoomLevel, blurIntensity]
  );

  const handleMouseMove = useCallback(
    (e, pageNumber) => {
      if (!isDrawing || !currentShape || currentShape.page !== pageNumber) return;
      const pageElement = pageRefs.current[pageNumber];
      if (!pageElement) return;
      const rect = pageElement.getBoundingClientRect();
      const scale = zoomLevel / 100;

      // Calculate current coordinates relative to the overlay, then unscale
      const currentX = (e.clientX - rect.left) / scale;
      const currentY = (e.clientY - rect.top) / scale;

      // Update shape dimensions based on drag direction
      setCurrentShape((prev) => ({
        ...prev,
        // Start from initial click point (prev.x, prev.y)
        width: Math.abs(currentX - prev.x),
        height: Math.abs(currentY - prev.y),
        // Adjust x/y only if dragging left/up from the start point
        x: Math.min(currentX, prev.x),
        y: Math.min(currentY, prev.y),
      }));
    },
    [isDrawing, currentShape, zoomLevel]
  );

  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentShape && currentShape.width > 0 && currentShape.height > 0) {
      setShapes((prev) => [...prev, currentShape]);
      setRedoStack([]); // Clear redo stack on new action
    }
    setIsDrawing(false);
    setCurrentShape(null);
  }, [isDrawing, currentShape]); // Depend on isDrawing

  const handleUndo = () => {
    if (shapes.length === 0) return;
    const lastShape = shapes[shapes.length - 1];
    setRedoStack((prev) => [...prev, lastShape]);
    setShapes((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const shapeToRestore = redoStack[redoStack.length - 1];
    setShapes((prev) => [...prev, shapeToRestore]);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 300)); // Allow more zoom
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 25)); // Allow more zoom out
  const handlePreviousPage = () =>
    setCurrentPage((prev) => Math.max(1, prev - 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(numPages, prev + 1));
  const handleSave = () => {
    // This function can be used to save the state to local storage or a server
    // For now, it finalizes the state for the download button.
    console.log("Save redaction data", shapes);
  };

  // --- handleDownload function (remains the same) ---
  const handleDownload = async () => {
    if (!file || shapes.length === 0) {
      // Use a custom message box instead of alert
      console.warn("Please upload a file and add at least one redaction.");
      return;
    }

    setIsDownloading(true);

    try {
      const formData = new FormData();
      formData.append('pdf', file); // The original PDF file object
      formData.append('suggestions', JSON.stringify(shapes)); // The array of redaction shapes

      const response = await fetch("http://127.0.0.1:5000/redact", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "redacted_document.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error("Download failed:", error);
       // Use a custom message box instead of alert
      console.error("Failed to download the redacted PDF. Please check the console for details.");
    } finally {
      setIsDownloading(false);
    }
  };


  // Function to render the SVG overlay for shapes
  const renderShapesOverlay = (pageNumber) => (
    <svg
      // Ensure SVG covers the exact scaled page dimensions
      // Use original page dimensions if available, otherwise use loaded dimensions
      width={(pageWidth || 0) * (zoomLevel / 100)}
      height={(pageHeight || 0) * (zoomLevel / 100)}
      className="absolute top-0 left-0 pointer-events-none" // Position relative to parent div
      style={{ zIndex: 10 }}
    >
      {/* Render saved shapes */}
      {shapes
        .filter((s) => s.page === pageNumber)
        .map((shape) => (
          <g key={shape.id}>
            <rect
              // Coordinates are already unscaled, just apply scale for rendering size
              x={shape.x * (zoomLevel / 100)}
              y={shape.y * (zoomLevel / 100)}
              width={shape.width * (zoomLevel / 100)}
              height={shape.height * (zoomLevel / 100)}
              fill={shape.color}
              opacity={showPreview ? 1 : 0.5} // Make preview fully opaque
              style={
                shape.type === "text-blur"
                  ? { filter: `blur(${shape.blurIntensity}px)` }
                  : {}
              }
            />
          </g>
        ))}
      {/* Render the shape currently being drawn */}
      {currentShape &&
        currentShape.width > 0 &&
        currentShape.height > 0 &&
        currentShape.page === pageNumber && (
          <rect
            x={currentShape.x * (zoomLevel / 100)}
            y={currentShape.y * (zoomLevel / 100)}
            width={currentShape.width * (zoomLevel / 100)}
            height={currentShape.height * (zoomLevel / 100)}
            fill={currentShape.color}
            opacity={0.4} // Slightly less opaque while drawing
            style={
              currentShape.type === "text-blur"
                ? { filter: `blur(${currentShape.blurIntensity}px)` }
                : {}
            }
          />
        )}
    </svg>
  );

   // Function to render the interactive overlay for drawing/selecting
   const renderInteractiveOverlay = (pageNumber) => (
    <div
      key={`interactive-overlay-${pageNumber}`}
      ref={(el) => { if (el) pageRefs.current[pageNumber] = el; }}
       // Set explicit size matching the scaled page for accurate coordinates
      style={{
          position: "absolute",
          top: 0,
          left: 0,
          // Use original page dimensions if available
          width: `${(pageWidth || 0) * (zoomLevel / 100)}px`,
          height: `${(pageHeight || 0) * (zoomLevel / 100)}px`,
          zIndex: 30, // Topmost layer
          cursor: activeTool === "select" ? "text" :
                  (activeTool === "rectangle" || activeTool === "text-blur") ? "crosshair" :
                  "default",
        }}
      onMouseDown={(e) => handleMouseDown(e, pageNumber)}
      onMouseMove={(e) => handleMouseMove(e, pageNumber)}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} // Stop drawing if mouse leaves
    />
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full"> {/* Flex column */}
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 sm:p-4 bg-gray-50 flex-shrink-0"> {/* Adjusted padding */}
        <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4"> {/* Adjusted gaps */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-wrap gap-y-2"> {/* Adjusted gaps */}
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Manual Redaction</h3> {/* Adjusted text size */}
            {/* Tools */}
            <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border border-gray-200">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    if (tool.id === "text-blur") {
                      if (textSelection) {
                         handleTextBlur();
                         setActiveTool("select");
                      } else {
                         setActiveTool(tool.id);
                      }
                    } else {
                      setActiveTool(tool.id);
                    }
                  }}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md transition-all duration-200 text-xs sm:text-sm ${
                    activeTool === tool.id
                      ? "bg-blue-100 text-blue-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                  title={tool.label}
                >
                  <tool.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{tool.label}</span> {/* Hide on smaller than md */}
                </button>
              ))}
            </div>
            {/* Color picker */}
            <label
              className="flex items-center space-x-1 cursor-pointer"
              title="Pick redaction color"
            >
              <span className="text-sm hidden sm:inline">Color:</span>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-6 h-6 sm:w-8 sm:h-8 border-0 p-0 bg-transparent cursor-pointer rounded"
              />
            </label>
            {/* Blur slider */}
             {(activeTool === "text-blur" || shapes.some(s => s.type === 'text-blur')) && (
              <div
                className="flex items-center space-x-1 ml-2 px-1 sm:px-2 border border-gray-300 rounded select-none bg-white py-1"
                title="Adjust blur strength"
              >
                <label className="text-xs sm:text-sm text-gray-700">Blur:</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={blurIntensity}
                  onChange={(e) => setBlurIntensity(Number(e.target.value))}
                  className="cursor-pointer w-16 sm:w-20"
                />
                <span className="text-xs text-gray-600">{blurIntensity}px</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2"> {/* Adjust spacing */}
            {/* Undo/Redo */}
            <div className="flex items-center space-x-0.5 sm:space-x-1 bg-white rounded-lg p-0.5 sm:p-1 border border-gray-200">
              <button
                onClick={handleUndo}
                disabled={shapes.length === 0}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md hover:bg-gray-50 transition-colors duration-200"
                title="Undo"
              >
                <Undo className="h-4 w-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md hover:bg-gray-50 transition-colors duration-200"
                title="Redo"
              >
                <Redo className="h-4 w-4" />
              </button>
            </div>
            {/* Zoom */}
            <div className="flex items-center space-x-0.5 sm:space-x-1 bg-white rounded-lg p-0.5 sm:p-1 border border-gray-200">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 25} // Match min zoom
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md hover:bg-gray-50 transition-colors duration-200"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="px-1.5 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 min-w-[40px] sm:min-w-[60px] text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 300} // Match max zoom
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md hover:bg-gray-50 transition-colors duration-200"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
            {/* Preview toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors duration-200 text-xs sm:text-sm ${
                showPreview
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-gray-200 bg-white"
              }`}
            >
              <Eye className="h-4 w-4" />
              <span className="font-medium">
                {showPreview ? "Hide" : "Preview"} {/* Shorter text */}
              </span>
            </button>
            {/* Save & Download */}
            <button
              onClick={handleSave}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors duration-200 font-medium text-xs sm:text-sm"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200 font-medium text-xs sm:text-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>{isDownloading ? "..." : "Download"}</span> {/* Shorter loading text */}
            </button>
          </div>
        </div>
      </div>

      {/* PDF Display Area - Allow this to grow and scroll */}
      <div
        ref={viewerRef}
        className="bg-gray-100 flex-grow overflow-auto p-4 sm:p-6" // Use flex-grow and padding
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }} // Center content horizontally, align top vertically
      >
        {/* Container that determines the PDF's render width, centered */}
        <div className="max-w-full relative mx-auto my-0" style={{ width: 'fit-content' }}> {/* Center horizontally, fit content */}
          {file ? (
            <Document
              key={file instanceof File ? file.name : String(file)}
              file={file}
              options={pdfOptions}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) =>
                console.error("Error loading PDF:", error.message)
              }
              loading={
                <div className="flex items-center justify-center h-64 text-gray-500">
                  Loading PDF...
                </div>
              }
              error={
                <div className="flex items-center justify-center h-64 text-red-500">
                  Error loading PDF. Please try again.
                </div>
              }
              renderMode="canvas"
            >
              {/* Container for the Page and its overlays - THIS maintains aspect ratio */}
              <div
                className="relative mb-4 sm:mb-6 shadow-lg pdf-page-container" // Add class for targeting
                style={{
                  // Let width be determined by Page scale, height will follow aspect ratio
                  width: `${(pageWidth || 0) * (zoomLevel / 100)}px`,
                  // Remove explicit height or set to auto if needed
                  // height: `${(pageHeight || 0) * (zoomLevel / 100)}px`, // Removed/Commented out
                  margin: '0 auto', // Center the block
                  lineHeight: 0 // Prevent extra space
                 }}
              >
                <Page
                  key={`page_${currentPage}`}
                  pageNumber={currentPage}
                  // Let scale determine the size, don't set width/height here
                  scale={zoomLevel / 100}
                  onLoadSuccess={onPageLoadSuccess}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                  // Removed className="mx-auto" as parent handles centering
                />

                {/* Overlays absolutely positioned relative to this container */}
                {mode === "manual" && renderShapesOverlay(currentPage)}
                {mode === "manual" && renderInteractiveOverlay(currentPage)}

              </div>
            </Document>
          ) : (
             <div className="flex items-center justify-center h-64 text-gray-500">
               Please upload a PDF file.
             </div>
          )}
        </div>
      </div>

      {/* Page Navigation - Prevent shrinking */}
      {numPages > 0 && (
         <div className="border-t border-gray-200 p-2 sm:p-4 bg-gray-50 flex-shrink-0">
           <div className="flex items-center justify-center space-x-2 sm:space-x-4">
             <button
               onClick={handlePreviousPage}
               disabled={currentPage <= 1}
               className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-colors duration-200 text-xs sm:text-sm"
             >
               <ChevronLeft className="h-4 w-4" />
               <span>Prev</span>
             </button>
             <div className="flex items-center space-x-1 sm:space-x-2">
               <span className="text-xs sm:text-sm text-gray-600">Page</span>
               <input
                 type="number"
                 min="1"
                 max={numPages}
                 value={currentPage}
                 onChange={(e) => {
                   const page = parseInt(e.target.value, 10);
                   if (!isNaN(page) && page >= 1 && page <= numPages) {
                     setCurrentPage(page);
                   } else if (e.target.value === '') {
                     // Can leave input empty temporarily
                   }
                 }}
                 // Validate on blur to prevent staying on invalid page number
                 onBlur={(e) => {
                   let page = parseInt(e.target.value, 10);
                   if (isNaN(page) || page < 1) page = 1;
                   if (page > numPages) page = numPages;
                   setCurrentPage(page);
                 }}
                 className="w-12 sm:w-16 px-1 sm:px-2 py-1 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
               />
               <span className="text-xs sm:text-sm text-gray-600">of {numPages}</span>
             </div>
             <button
               onClick={handleNextPage}
               disabled={currentPage >= numPages}
               className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-colors duration-200 text-xs sm:text-sm"
             >
               <span>Next</span>
               <ChevronRight className="h-4 w-4" />
             </button>
           </div>
         </div>
      )}

      {/* Instructions - Only show if in manual mode? Prevent shrinking */}
      {mode === "manual" && (
         <div className="border-t border-gray-200 p-2 sm:p-4 bg-gray-50 flex-shrink-0">
           <div className="text-xs sm:text-sm text-gray-600 text-center space-y-1">
             <p>
               <strong>Rectangle:</strong> Click & drag.
               <strong className="ml-2 sm:ml-4">Text Blur:</strong> Select text, then click tool.
             </p>
             <p>
               Use color picker, zoom, and preview before saving/downloading.
             </p>
           </div>
         </div>
      )}
    </div>
  );
}