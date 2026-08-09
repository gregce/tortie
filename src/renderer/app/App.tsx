/**
 * App shell PLACEHOLDER — scaffold only.
 *
 * Later streams replace the placeholder panes:
 *   - project tab spine        → src/renderer/app/
 *   - SCM sidebar + file tree  → src/renderer/scm/, src/renderer/tree/
 *   - Monaco editor + diff     → src/renderer/editor/
 *   - terminal stack           → src/renderer/terminal/
 *
 * The named mount regions below (data-slot attributes) are the frozen UI
 * slots from the contract packet; keep them when replacing this file.
 */

import React from 'react';

export function App(): React.JSX.Element {
  const gmux = window.gmux;

  return (
    <div className="app-shell">
      <header className="tab-spine" data-slot="project-tabs">
        <span className="wordmark">gmux</span>
        <span className="tab placeholder-tab">+ new project</span>
      </header>

      <div className="app-body">
        <aside className="sidebar" data-slot="sidebar">
          <div className="pane-placeholder">
            <h2>Source control</h2>
            <p>Git sidebar and file tree land here.</p>
          </div>
        </aside>

        <main className="center" data-slot="editor">
          <div className="pane-placeholder">
            <h2>Editor</h2>
            <p>Monaco (diff-vs-HEAD on file click) lands here.</p>
          </div>
        </main>

        <section className="terminals" data-slot="terminal-stack">
          <div className="pane-placeholder">
            <h2>Sessions</h2>
            <p>Durable named terminals land here (⌘T to create).</p>
            <p className="meta">
              {gmux
                ? `bridge ok — electron ${gmux.meta.versions.electron} · ` +
                  `chrome ${gmux.meta.versions.chrome} · node ${gmux.meta.versions.node}`
                : 'window.gmux bridge NOT available'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
