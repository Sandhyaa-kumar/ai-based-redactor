import React, { useState, useRef } from 'react';
import { Upload, FileText, Zap, Settings, Hand } from 'lucide-react';
import AuthModal from './components/AuthModal';

function App() {
  const [appState, setAppState] = useState('initial');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [authModal, setAuthModal] = useState({ isOpen: false, type: null });
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setAppState('fileUploaded');
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRedactClick = () => {
    setAppState('redactModeSelection');
  };

  const handleModeSelect = (mode) => {
    console.log(`Selected redaction mode: ${mode}`);
    // Here you would typically make an API call or navigate to the next step
    alert(`${mode} redaction mode selected for ${selectedFile?.name}`);
  };

  const resetApp = () => {
    setAppState('initial');
    setSelectedFile(null);
  };

  const openAuthModal = (type) => {
    setAuthModal({ isOpen: true, type });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, type: null });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      {/* Login/Signup Buttons - Top Right */}
      {appState === 'initial' && (
        <div className="absolute top-6 right-6 flex gap-3">
          <button 
            onClick={() => openAuthModal('login')}
            className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 rounded-lg shadow-sm border border-slate-200 hover:border-slate-300 transition-all duration-200 cursor-pointer"
          >
            Login
          </button>
          <button 
            onClick={() => openAuthModal('signup')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-all duration-200 cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      )}
      
      <div className="w-full max-w-2xl mx-auto mt-16">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-800 mb-4">
            AI Redactor
          </h1>
          <p className="text-slate-600 text-lg">
            Intelligent document redaction powered by AI
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {appState === 'initial' && (
            <div className="text-center">
              {/* Upload Section */}
              <div
                className={`border-3 border-dashed rounded-xl p-12 cursor-pointer transition-all duration-300 ${
                  dragOver
                    ? 'border-blue-400 bg-blue-50 scale-105'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
                onClick={handleUploadClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-16 h-16 text-slate-400 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  Select your file or drag & drop
                </h3>
                <p className="text-slate-500">PDF files accepted</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}

          {appState === 'fileUploaded' && (
            <div className="text-center">
              {/* File Success State */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 mb-8">
                <FileText className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  File uploaded successfully
                </h3>
                <p className="text-green-600 mb-4">{selectedFile?.name}</p>
                <button
                  onClick={resetApp}
                  className="text-green-600 hover:text-green-800 underline text-sm"
                >
                  Upload a different file
                </button>
              </div>

              {/* Redact Button */}
              <button
                onClick={handleRedactClick}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Start Redaction
              </button>
            </div>
          )}

          {appState === 'redactModeSelection' && (
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-slate-800 mb-8">
                Choose Redaction Mode
              </h3>
              
              {/* Mode Selection Buttons */}
              <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch">
                <button
                  onClick={() => handleModeSelect('Manual')}
                  className="group bg-white border-2 border-slate-200 hover:border-orange-400 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:scale-105 flex-1 max-w-xs"
                >
                  <Hand className="w-12 h-12 text-orange-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold text-slate-800 mb-2">Manual</h4>
                  <p className="text-sm text-slate-600">
                    Full control over what gets redacted
                  </p>
                </button>

                <button
                  onClick={() => handleModeSelect('Semi-Automatic')}
                  className="group bg-white border-2 border-slate-200 hover:border-blue-400 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:scale-105 flex-1 max-w-xs"
                >
                  <Settings className="w-12 h-12 text-blue-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold text-slate-800 mb-2">Semi-Automatic</h4>
                  <p className="text-sm text-slate-600">
                    AI suggestions with manual approval
                  </p>
                </button>

                <button
                  onClick={() => handleModeSelect('Automatic')}
                  className="group bg-white border-2 border-slate-200 hover:border-purple-400 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:scale-105 flex-1 max-w-xs"
                >
                  <Zap className="w-12 h-12 text-purple-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold text-slate-800 mb-2">Automatic</h4>
                  <p className="text-sm text-slate-600">
                    Full AI-powered redaction
                  </p>
                </button>
              </div>

              {/* Back Button */}
              <button
                onClick={() => setAppState('fileUploaded')}
                className="mt-8 text-slate-500 hover:text-slate-700 underline transition-colors"
              >
                ← Back to file selection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        type={authModal.type}
      />
    </div>
  );
}

export default App;