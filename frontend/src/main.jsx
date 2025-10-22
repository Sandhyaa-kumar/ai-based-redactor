// React PDF configuration
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Standard React imports
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { pdfjs } from 'react-pdf';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import App from './App.jsx';
import './index.css';

// This is the correct line for the Public Folder method.
// It tells react-pdf to look for the file you copied into the public folder.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);