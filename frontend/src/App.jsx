import React, { useState } from "react";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal";
import FileUpload from "./components/FileUpload";
import RedactionModeSelector from "./components/RedactionModeSelector";
import RedactionWorkflow from "./components/RedactionWorkflow";
import FullyAutomatic from "./components/FullyAutomatic";
import PDFViewer from "./components/PDFViewer";
import SemiAutomatic from "./components/SemiAutomatic";
function App() {
  const [authModal, setAuthModal] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [appState, setAppState] = useState("upload");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    if (file) {
      setAppState("mode-selection");
    } else {
      setAppState("upload");
    }
  };

  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
    setAppState("redaction");
  };

  const handleBackToUpload = () => {
    setAppState("upload");
    setSelectedFile(null);
    setSelectedMode(null);
  };

  const handleBackToModeSelection = () => {
    setAppState("mode-selection");
    setSelectedMode(null);
  };

  const handleAuthSuccess = (name) => {
    setIsLoggedIn(true);
    setUserName(name);
    setAuthModal(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onLoginClick={() => setAuthModal("login")}
        onSignUpClick={() => setAuthModal("signup")}
        isLoggedIn={isLoggedIn}
        userName={userName}
      />

      <main className="container mx-auto px-6 py-12">
        {/* Step 1: Upload */}
        {appState === "upload" && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                AI Redactor
              </h1>
              <p className="text-xl text-gray-600">
                Intelligent document redaction powered by AI
              </p>
            </div>

            <FileUpload
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
            />

            {selectedFile && (
              <div className="text-center mt-6">
                <button
                  onClick={() => setAppState("mode-selection")}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                >
                  Redact Document
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Mode Selection */}
        {appState === "mode-selection" && selectedFile && (
          <RedactionModeSelector
            onModeSelect={handleModeSelect}
            onBack={handleBackToUpload}
          />
        )}

        {/* Step 3: Redaction */}
        {appState === "redaction" && selectedFile && selectedMode && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToModeSelection}
                className="text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                ← Back to mode selection
              </button>

              <div className="text-sm text-gray-500">
                File: {selectedFile.name}
              </div>
            </div>

            {/* Show Fully Automated or Viewer depending on mode */}
            {selectedMode === "automatic" ? (
              <FullyAutomatic file={selectedFile} />
            ) : selectedMode === "manual" ? (
              <PDFViewer file={selectedFile} mode="manual" />
            ) : selectedMode === "semi-automatic" ? (
              <SemiAutomatic file={selectedFile} />
            ) : null}
          </div>
        )}
      </main>

      {/* Login/Signup Modal */}
      <AuthModal
        isOpen={authModal !== null}
        onClose={() => setAuthModal(null)}
        mode={authModal || "login"}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;
