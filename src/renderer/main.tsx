import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Tortie renderer: #root element missing from index.html');
}

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
