import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary } from './errors/ErrorBoundary';
import { installRendererErrorCapture } from './errors/hooks';
import { initAppearance } from './theme/apply';
import './styles/globals.css';

// Phase 35: window.onerror and unhandledrejection write one error record
// each over log:append, bounded in ./errors/hooks. Installed before render
// so a throw during the first mount is already captured.
installRendererErrorCapture('renderer');

// Phase 62: apply the persisted appearance (highlight scheme and contrast)
// as soon as the settings bridge answers, and again on every broadcast.
// Called before createRoot so theming never waits on React or the store.
initAppearance();

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
