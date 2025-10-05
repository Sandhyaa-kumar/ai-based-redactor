import React, { useState, useRef, useCallback, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.js?url";
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

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PDFViewer({ file, mode }) {
  // Default tool is 'select' for text selection
  const [activeTool, setActiveTool] = useState("select");
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapes, setShapes] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [currentShape, setCurrentShape] = useState(null);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [blurIntensity, setBlurIntensity] = useState(5);
  const [showPreview, setShowPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  // --- Text selection for blur ---
  const [textSelection, setTextSelection] = useState(null); // {x, y, width, height, page}

  // Listen for text selection events
  const handleTextSelection = useCallback(
    (pageNumber) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const pageElement = pageRefs.current[pageNumber];
      if (!pageElement) return;
      const pageRect = pageElement.getBoundingClientRect();
      // Convert to PDF coordinates
      const x = (rect.left - pageRect.left) / (zoomLevel / 100);
      const y = (rect.top - pageRect.top) / (zoomLevel / 100);
      const width = rect.width / (zoomLevel / 100);
      const height = rect.height / (zoomLevel / 100);
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
        id: Date.now().toString(),
        type: "text-blur",
        x: textSelection.x,
        y: textSelection.y,
        width: textSelection.width,
        height: textSelection.height,
        color: selectedColor,
        blurIntensity: blurIntensity,
        page: textSelection.page,
      },
    ]);
    setTextSelection(null);
    window.getSelection().removeAllRanges();
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);

  const svgRef = useRef(null);
  const viewerRef = useRef(null);
  const pageRefs = useRef({});

  const tools = [
    { id: "select", icon: MousePointer, label: "Select" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "text-blur", icon: Type, label: "Text Blur" },
  ];

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
    setCurrentPage(1);
  };

  const onPageLoadSuccess = (page) => {
    const { width, height } = page;
    setPageWidth(width);
    setPageHeight(height);
  };

  const handleMouseDown = useCallback(
    (e, pageNumber) => {
      if (mode !== "manual" || activeTool === "select") return;
      const pageElement = pageRefs.current[pageNumber];
      if (!pageElement) return;
      const rect = pageElement.getBoundingClientRect();

      const x = (e.clientX - rect.left) / (zoomLevel / 100);
      const y = (e.clientY - rect.top) / (zoomLevel / 100);

      setIsDrawing(true);
      setCurrentShape({
        id: Date.now().toString(),
        type: activeTool,
        x,
        y,
        width: 0,
        height: 0,
        color: selectedColor,
        blurIntensity: blurIntensity, // include blurStrength for blur tool
        page: pageNumber,
      });
    },
    [mode, activeTool, selectedColor, zoomLevel, blurIntensity]
  );

  const handleMouseMove = useCallback(
    (e, pageNumber) => {
      if (!isDrawing || !currentShape || currentShape.page !== pageNumber)
        return;
      const pageElement = pageRefs.current[pageNumber];
      if (!pageElement) return;
      const rect = pageElement.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / (zoomLevel / 100);
      const currentY = (e.clientY - rect.top) / (zoomLevel / 100);
      setCurrentShape((prev) => ({
        ...prev,
        width: Math.abs(currentX - (prev?.x || 0)),
        height: Math.abs(currentY - (prev?.y || 0)),
        x: Math.min(currentX, prev?.x || 0),
        y: Math.min(currentY, prev?.y || 0),
      }));
    },
    [isDrawing, currentShape, zoomLevel]
  );

  const handleMouseUp = useCallback(() => {
    if (currentShape && currentShape.width && currentShape.height) {
      setShapes((prev) => [...prev, currentShape]);
      setRedoStack([]);
    }
    setIsDrawing(false);
    setCurrentShape(null);
  }, [currentShape]);

  const handleUndo = () => {
    if (shapes.length === 0) return;
    const lastShape = shapes[shapes.length - 1];
    setRedoStack((prev) => [...prev, [lastShape]]);
    setShapes((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const shapesToRestore = redoStack[redoStack.length - 1];
    setShapes((prev) => [...prev, ...shapesToRestore]);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handlePreviousPage = () =>
    setCurrentPage((prev) => Math.max(1, prev - 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(numPages, prev + 1));
  const handleSave = () => console.log("Save redaction data", shapes);
  const handleDownload = () => console.log("Download redacted PDF");

  const renderPageOverlay = (pageNumber) => (
    <div
      key={`overlay-${pageNumber}`}
      ref={(el) => {
        if (el) pageRefs.current[pageNumber] = el;
      }}
      className={`absolute inset-0 ${
        activeTool === "select"
          ? "cursor-text"
          : activeTool === "rectangle"
          ? "cursor-crosshair"
          : "cursor-text"
      }`}
      onMouseDown={(e) => handleMouseDown(e, pageNumber)}
      onMouseMove={(e) => handleMouseMove(e, pageNumber)}
      onMouseUp={handleMouseUp}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      >
        {shapes
          .filter((s) => s.page === pageNumber)
          .map((shape) => (
            <g key={shape.id}>
              <rect
                x={shape.x * (zoomLevel / 100)}
                y={shape.y * (zoomLevel / 100)}
                width={shape.width * (zoomLevel / 100)}
                height={shape.height * (zoomLevel / 100)}
                fill={shape.color}
                opacity={showPreview ? 0.9 : 0.6}
                style={
                  shape.type === "text-blur"
                    ? { filter: `blur(${shape.blurIntensity}px)` }
                    : {}
                }
              />
            </g>
          ))}
        {currentShape &&
          currentShape.width &&
          currentShape.height &&
          currentShape.page === pageNumber && (
            <rect
              x={currentShape.x * (zoomLevel / 100)}
              y={currentShape.y * (zoomLevel / 100)}
              width={currentShape.width * (zoomLevel / 100)}
              height={currentShape.height * (zoomLevel / 100)}
              fill={currentShape.color}
              opacity={0.5}
              style={
                currentShape.type === "text-blur"
                  ? { filter: `blur(${currentShape.blurIntensity}px)` }
                  : {}
              }
            />
          )}
      </svg>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h3 className="font-semibold text-gray-900">Manual Redaction</h3>
            {/* Tools */}
            <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border border-gray-200">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    if (tool.id === "text-blur") {
                      handleTextBlur();
                    } else {
                      setActiveTool(tool.id);
                    }
                  }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                    activeTool === tool.id
                      ? "bg-blue-100 text-blue-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                  title={tool.label}
                >
                  <tool.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{tool.label}</span>
                </button>
              ))}
            </div>
            {/* Color picker with label and tooltip */}
            <label
              className="flex items-center space-x-2 cursor-pointer"
              title="Pick redaction color"
            >
              <span className="text-sm">Color:</span>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-8 h-8 border-0 p-0 bg-transparent"
                style={{ cursor: "pointer" }}
              />
            </label>
            {/* Blur slider only for Text Blur */}
            {activeTool === "text-blur" && (
              <div
                className="flex items-center space-x-2 ml-4 px-2 border border-gray-300 rounded select-none"
                title="Adjust blur strength"
              >
                <label className="text-sm text-gray-700">Blur:</label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={blurIntensity}
                  onChange={(e) => setBlurIntensity(Number(e.target.value))}
                  className="cursor-pointer"
                  title="Adjust blur strength"
                />
                <span className="text-xs text-gray-600">{blurIntensity}px</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Undo/Redo */}
            <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border border-gray-200">
              <button
                onClick={handleUndo}
                disabled={shapes.length === 0}
                className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md hover:bg-gray-50 transition-colors duration-200"
                title="Undo"
              >
                <Undo className="h-4 w-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md hover:bg-gray-50 transition-colors duration-200"
                title="Redo"
              >
                <Redo className="h-4 w-4" />
              </button>
            </div>
            {/* Zoom */}
            <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border border-gray-200">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md hover:bg-gray-50 transition-colors duration-200"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700 min-w-[60px] text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 200}
                className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md hover:bg-gray-50 transition-colors duration-200"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
            {/* Preview toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                showPreview
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-gray-200 bg-white"
              }`}
            >
              <Eye className="h-4 w-4" />
              <span className="font-medium">
                {showPreview ? "Hide Preview" : "Preview"}
              </span>
            </button>
            {/* Save & Download */}
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors duration-200 font-medium"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200 font-medium"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* PDF Display */}
      <div
        ref={viewerRef}
        className="bg-gray-100 min-h-[600px] max-h-[800px] overflow-auto p-6"
      >
        <div className="max-w-4xl mx-auto">
          {file && (
            <Document
              key={file}
              file={file}
              options={pdfOptions}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) =>
                console.error("Error loading PDF:", error)
              }
              loading={
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">Loading PDF...</div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-64">
                  <div className="text-red-500">
                    Error loading PDF. Please try again.
                  </div>
                </div>
              }
              renderMode="canvas"
              renderTextLayer={false}
              renderAnnotationLayer={false}
            >
              <div className="relative mb-6 mx-auto shadow-lg">
                <Page
                  pageNumber={currentPage}
                  scale={zoomLevel / 100}
                  onLoadSuccess={onPageLoadSuccess}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="mx-auto"
                />
                {mode === "manual" && renderPageOverlay(currentPage)}
                {/* Listen for text selection on page click */}
                {mode === "manual" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 20,
                      pointerEvents: activeTool === "select" ? "auto" : "none",
                    }}
                    onMouseUp={() => handleTextSelection(currentPage)}
                  />
                )}
                {mode === "manual" && renderPageOverlay(currentPage)}
              </div>
            </Document>
          )}
        </div>
      </div>

      {/* Page Navigation */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Page</span>
            <input
              type="number"
              min="1"
              max={numPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= numPages) {
                  setCurrentPage(page);
                }
              }}
              className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">of {numPages}</span>
          </div>
          <button
            onClick={handleNextPage}
            disabled={currentPage === numPages}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="text-sm text-gray-600 text-center space-y-1">
          <p>
            <strong>Rectangle Tool:</strong> Click and drag to create redaction
            rectangles.
            <strong className="ml-4">Text Blur:</strong> Select text areas to
            apply blur effects.
          </p>
          <p>
            Use the color picker to customize redaction colors. Zoom in/out for
            precision. Preview changes before saving.
          </p>
        </div>
      </div>
    </div>
  );
}
