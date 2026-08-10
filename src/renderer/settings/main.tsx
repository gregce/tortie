/**
 * Settings window entry (S13) — second renderer entry point, loaded by
 * src/main/settings/window.ts into the dedicated Settings BrowserWindow.
 * Shares the app's global stylesheet (tokens + control vocabulary).
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsApp } from './SettingsApp';
import '../styles/globals.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('gmux settings renderer: #root element missing');
}

createRoot(rootEl).render(
  <React.StrictMode>
    <SettingsApp />
  </React.StrictMode>
);
