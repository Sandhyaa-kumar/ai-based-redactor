import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Loader2, Download, CheckCircle, XCircle } from 'lucide-react';

const API_BASE_URL = "http://localhost:5000";

const useRedactionPreview = (file, acceptedSuggestions, initialPdfUrl, showMessage) => {
    const [previewPdfUrl, setPreviewPdfUrl] = useState(initialPdfUrl);
    const [isProcessingPreview, setIsProcessingPreview] = useState(false);

    const generatePreview = useCallback(async (suggestionsToRedact) => {
        if (!file) return;
        if (suggestionsToRedact.length === 0) {
            setPreviewPdfUrl(initialPdfUrl);
            return;
        }
        setIsProcessingPreview(true);
        const formData = new FormData();
        formData.append('pdf', file);
        formData.append('suggestions', JSON.stringify(suggestionsToRedact));
        try {
            const response = await fetch(`${API_BASE_URL}/redact-preview`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error('Failed to get preview PDF.');
            const pdfBlob = await response.blob();
            const url = URL.createObjectURL(pdfBlob);
            setPreviewPdfUrl(url);
        } catch (error) {
            console.error('Preview redaction failed:', error);
            if (showMessage) showMessage('error', `Preview failed: ${error.message}`);
            setPreviewPdfUrl(initialPdfUrl);
        } finally {
            setIsProcessingPreview(false);
        }
    }, [file, initialPdfUrl, showMessage]);

    useEffect(() => {
        generatePreview(acceptedSuggestions);
    }, [JSON.stringify(acceptedSuggestions)]);

    return { previewPdfUrl, isProcessingPreview };
};

export default function SemiAutomatic({ file }) {
    const [suggestions, setSuggestions] = useState([]);
    const [accepted, setAccepted] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const initialPdfUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);
    const acceptedRedactionObjects = useMemo(() => {
        return suggestions.filter(s => accepted.includes(s.id));
    }, [suggestions, accepted]);

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const { previewPdfUrl, isProcessingPreview } = useRedactionPreview(
        file, 
        acceptedRedactionObjects,
        initialPdfUrl,
        showMessage
    );

    const handleInitialSetup = useCallback(async () => {
        if (!file) return;
        setIsLoading(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const extractResponse = await fetch(`${API_BASE_URL}/extract-text`, {
                method: 'POST',
                body: formData,
            });
            const extractedData = await extractResponse.json();
            const suggestResponse = await fetch(`${API_BASE_URL}/suggest-redactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(extractedData),
            });
            let initialSuggestions = await suggestResponse.json();
            initialSuggestions = initialSuggestions.map((s, index) => ({ ...s, id: s.id || `ai-${index}` }));
            setSuggestions(initialSuggestions);
            setAccepted(initialSuggestions.map(s => s.id));
        } catch (error) {
            console.error('Initial setup failed:', error);
            showMessage('error', 'Failed to load redaction suggestions. Check backend.');
        } finally {
            setIsLoading(false);
        }
    }, [file]);

    useEffect(() => {
        handleInitialSetup();
    }, [handleInitialSetup]);

    const toggleAccept = useCallback((suggestionId) => {
        setAccepted(prev =>
            prev.includes(suggestionId)
                ? prev.filter(id => id !== suggestionId)
                : [...prev, suggestionId]
        );
    }, []);

    const finalizeRedact = async () => {
        setIsLoading(true);
        showMessage('info', 'Finalizing redaction and preparing download...');
        const finalRedactionData = acceptedRedactionObjects;
        const formData = new FormData();
        formData.append("pdf", file);
        formData.append("suggestions", JSON.stringify(finalRedactionData));
        try {
            const res = await fetch(`${API_BASE_URL}/redact`, { method: "POST", body: formData });
            if (!res.ok) throw new Error("Failed to finalize redaction on server.");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'redacted_document_final.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showMessage('success', 'Redacted document downloaded successfully!');
        } catch (error) {
            console.error('Finalize failed:', error);
            showMessage('error', `Download failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    const totalRedactionCount = accepted.length;

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar (scrollable) */}
            <aside className="w-[380px] flex flex-col border-r shadow bg-white h-full overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-2 text-indigo-700">Review & Edit Redactions</h2>
                    {message && (
                        <div className={`p-2 my-2 text-sm rounded ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} flex items-center`}>
                            {message.text}
                        </div>
                    )}
                    {isLoading && (
                        <div className="flex items-center justify-center p-2 mb-2 bg-indigo-50 rounded-lg">
                            <Loader2 className="w-4 h-4 mr-2 text-indigo-600 animate-spin" />
                            <span className="text-indigo-700 text-sm">Loading suggestions...</span>
                        </div>
                    )}
                    {isProcessingPreview && (
                        <div className="flex items-center justify-center p-2 mb-2 bg-yellow-50 rounded-lg">
                            <Loader2 className="w-4 h-4 mr-2 text-yellow-600 animate-spin" />
                            <span className="text-yellow-700 text-sm">Updating PDF Preview...</span>
                        </div>
                    )}
                </div>
                {/* Suggestions List */}
                <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-3">
                    {suggestions.length === 0 && !isLoading ? (
                        <p className="text-gray-500 italic">No redaction suggestions found.</p>
                    ) : (
                        <>
                            {/* AI Suggestions List */}
                            <h3 className="text-lg font-semibold pt-2 text-gray-700">AI Suggestions ({suggestions.length})</h3>
                            {suggestions.map((s) => {
                                const isAccepted = accepted.includes(s.id);
                                const displayText = s.text || s.entity || s.type || 'Unknown Entity';
                                return (
                                    <div key={s.id} className={`flex items-start px-4 py-3 rounded shadow-md border transition ${isAccepted ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                                        <div className="flex-1 min-w-0">
                                            <span className="font-semibold text-gray-800 truncate block">{displayText}</span>
                                            <div className="mt-1 flex space-x-2">
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{s.type}</span>
                                            </div>
                                        </div>
                                        <button
                                            className={`ml-3 px-3 py-1 rounded text-xs font-bold transition flex items-center ${isAccepted ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                                            onClick={() => toggleAccept(s.id)}
                                            disabled={isLoading || isProcessingPreview}
                                        >
                                            {isAccepted ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                            {isAccepted ? "Accepted" : "Reject"}
                                        </button>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
                {/* Fixed Footer Buttons */}
                <div className="p-6 border-t bg-white shadow-inner">
                    <p className="text-center text-sm mb-3 text-gray-600 font-medium">Total Redactions: {totalRedactionCount}</p>
                    <button
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition flex items-center justify-center disabled:opacity-50"
                        onClick={finalizeRedact}
                        disabled={isLoading || isProcessingPreview || totalRedactionCount === 0}
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
                        Save & Download
                    </button>
                </div>
            </aside>
            {/* PDF Preview Area */}
            <div className="flex-1 flex items-start justify-center p-10 bg-gray-100 relative overflow-y-auto">
                {previewPdfUrl ? (
                    <iframe
                        src={previewPdfUrl}
                        style={{ width: "900px", height: "90vh", border: "none" }}
                        title="Redacted PDF"
                        className="rounded-xl shadow-2xl border bg-white"
                    />
                ) : (
                    <div className="text-center text-gray-400 p-20 mt-20 bg-white rounded-lg shadow-inner">
                        {isLoading ? "Loading document and generating initial suggestions..." : "PDF preview will appear here once a file is uploaded."}
                    </div>
                )}
            </div>
        </div>
    );
}
