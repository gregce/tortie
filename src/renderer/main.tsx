import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { loadProbes } from './app/probe-loader';
import { installAppShellOps } from './app/shell-ops-install';
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

// Phase 127: fill the store's shell seam. The store calls four operations it
// does not own, being the native context menu, the pointer-drag revoke, the
// fleet focus handoff and the editor's open-bus subscription. It reaches all
// four through ./state/shell-ops.ts, which starts out as four silent no-ops.
// This is the one place that knows both halves, and it runs before createRoot
// so the seam is filled before the first render and before any store action.
installAppShellOps();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Tortie renderer: #root element missing from index.html');
}

// Phase 127. The harness drives, and ONLY on a launch that was told to load
// them, then the app.
//
// THIS IS AN ASYNC FUNCTION AND NOT A TOP LEVEL AWAIT, and the reason is a
// deadlock that a top level await produced on every harness launch. Measured
// on 2026-08-22 with build/probe-p127-probes.mjs: the window rendered nothing
// at all, `document.getElementById('root')` stayed empty, and a raw
// `import()` of the probe chunk evaluated from the page never settled either.
//
// The mechanism. A module with a top level await is an ASYNC module, and a
// module that imports an async module waits for it to finish evaluating.
// `probe-registry.ts` imports the store, the layout store and the shell's own
// modules, all of which are in this entry chunk. So the entry chunk waited for
// the probe chunk and the probe chunk waited for the entry chunk. Neither ever
// finished.
//
// Wrapping the same two steps in an async function makes this module
// synchronous again. It finishes evaluating, the probe chunk's import can then
// resolve, the drives install, and only then does the first render happen. The
// order the probes need is unchanged and `loadProbes()` still resolves at once
// when this renderer was not told to load anything.
void (async (): Promise<void> => {
  await loadProbes();
  createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
})();
