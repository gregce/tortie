/**
 * Settings window entry (S13) — second renderer entry point, loaded by
 * src/main/settings/window.ts into the dedicated Settings BrowserWindow.
 * Shares the app's global stylesheet (tokens + control vocabulary).
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { installRendererErrorCapture } from '../errors/hooks';
import { SettingsApp } from './SettingsApp';
import '../styles/globals.css';

// Phase 35: the Settings window captures its own uncaught errors under the
// 'settings' scope. No boundary here; the one boundary wraps the main
// window's <App /> only.
installRendererErrorCapture('settings');

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Tortie settings renderer: #root element missing');
}

createRoot(rootEl).render(
  <React.StrictMode>
    <SettingsApp />
  </React.StrictMode>
);
