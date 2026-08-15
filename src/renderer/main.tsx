import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary } from './errors/ErrorBoundary';
import { installRendererErrorCapture } from './errors/hooks';
import './styles/globals.css';

// Phase 35: window.onerror and unhandledrejection write one error record
// each over log:append, bounded in ./errors/hooks. Installed before render
// so a throw during the first mount is already captured.
installRendererErrorCapture('renderer');

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Tortie renderer: #root element missing from index.html');
}

createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
