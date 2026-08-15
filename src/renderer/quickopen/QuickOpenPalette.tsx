/**
 * ⌘P — the file picker.
 *
 * Chrome is the ⌘J overlay family (floating panel under the titlebar, click
 * away to dismiss, ↑↓/↩/Esc, footer key hints), not a new invention.
 *
 * Three things it refuses to do:
 *
 *  - **Wait.** It opens on the keystroke, warm or not. While the first
 *    `rg --files` streams in it ranks the partial list and says how far it
 *    got — "Indexing 33,171 files…" with a live count — instead of showing a
 *    spinner you have to wait out. At 60,000 files that state lasts ~150 ms.
 *  - **Blank between keystrokes.** The previous rows stay, dimmed, until the
 *    new answer lands. A list that empties and refills reads as slow at any
 *    speed.
 *  - **Guess at your intent.** ↩ (or a click) takes the reusable preview
 *    tab; ⌘↩ (or ⌘-click) keeps it — the same bargain the tree and SCM
 *    already offer, so walking six candidates does not leave six tabs
 *    behind.
 */

import React, { useEffect, useMemo, useRef } from 'react';
// Chords are DATA (src/shared/keymap.ts). Nothing in this file spells one:
// every keycap below is read back from the keymap, so the palette's footer
// can never drift from what the handler and the native Find menu do.
import { keyDisplay } from '@shared/keymap';
import { FileIcon } from '../icons';
import { useApp } from '../state/store';
import { useEditor } from '../editor/store';
import { parseQuickOpen } from './parse';
import { highlightRuns, splitRelPath } from './highlight';
import { startRecordingRecents } from './recents';
import { useQuickOpen } from './store';
import './quickopen.css';

/** Warm the index at first idle, not during boot — see the store's `warm`. */
const WARM_IDLE_TIMEOUT_MS = 3_000;

function formatCount(n: number): string {
  return n.toLocaleString();
}

function Runs({
  text,
  positions,
  offset,
  className
}: {
  text: string;
  positions: readonly number[];
  offset: number;
  className: string;
}): React.JSX.Element {
  const runs = useMemo(
    () => highlightRuns(text, positions, offset),
    [text, positions, offset]
  );
  return (
    <span className={className}>
      {runs.map((run, i) =>
        run.hit ? (
          // <mark>, not a styled span: the highlight has to survive
          // high-contrast mode and be announced as emphasis.
          <mark key={i} className="qo-mark">
            {run.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{run.text}</React.Fragment>
        )
      )}
    </span>
  );
}

export function QuickOpenPalette(): React.JSX.Element | null {
  const open = useQuickOpen((s) => s.open);
  const query = useQuickOpen((s) => s.query);
  const hits = useQuickOpen((s) => s.hits);
  const selected = useQuickOpen((s) => s.selected);
  const allProjects = useQuickOpen((s) => s.allProjects);
  const ready = useQuickOpen((s) => s.ready);
  const indexed = useQuickOpen((s) => s.indexed);
  const pending = useQuickOpen((s) => s.pending);
  const capped = useQuickOpen((s) => s.capped);
  const unavailable = useQuickOpen((s) => s.unavailable);
  const error = useQuickOpen((s) => s.error);

  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const listRef = useRef<HTMLDivElement | null>(null);

  // Recording starts with the app, not with the palette: "recent" means every
  // file you opened, from any surface, not the ones you found through ⌘P.
  useEffect(() => startRecordingRecents(), []);

  // Prewarm is mandatory rather than an optimisation (research 19 §3.2):
  // fuzzysort's per-path cost is lazy and otherwise lands on the FIRST
  // keystroke. Doing it at first idle keeps it off the cold-start path.
  useEffect(() => {
    if (activeProjectId === null) return;
    const warm = (): void => useQuickOpen.getState().warm();
    const ric = (
      window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number }
        ) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === 'function') {
      ric(warm, { timeout: WARM_IDLE_TIMEOUT_MS });
      return;
    }
    const t = window.setTimeout(warm, 200);
    return () => window.clearTimeout(t);
  }, [activeProjectId]);

  // Keep the keyboard selection on screen without stealing the scrollbar.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('.qo-row.selected')
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, selected, hits]);

  if (!open) return null;

  const store = useQuickOpen.getState();
  const parsed = parseQuickOpen(query);
  const activeTab = useEditor.getState().activeTab();
  const projectNameFor = (repoPath: string): string =>
    projects.find((p) => p.path === repoPath)?.name ?? '';

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      store.close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      store.move(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      store.move(-1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      store.accept(e.metaKey);
      return;
    }
    // ⌘P is deliberately NOT handled here. The app's capture-phase map sees
    // it first even inside a text field (its `inEditable` guard covers ⌘B,
    // not ⌘P) and routes it to toggleOrOpen; handling it again on the way
    // back up would toggle the scope twice and look like the key did nothing.
  };

  const scopeLabel = allProjects
    ? `All projects (${String(projects.length)})`
    : (activeProject?.name ?? 'This project');

  return (
    <>
      <div className="qo-backdrop" onMouseDown={() => store.close()} />
      <div
        className="qo-panel"
        role="dialog"
        aria-label="Go to file"
        onKeyDown={onKeyDown}
      >
        <div className="qo-field">
          <input
            className="qo-input"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            aria-label="Go to file"
            aria-controls="qo-list"
            aria-expanded
            role="combobox"
            placeholder="Go to file — type part of a name or path"
            value={query}
            onChange={(e) => store.setQuery(e.target.value)}
          />
          {projects.length > 1 ? (
            <button
              type="button"
              className={`qo-scope${allProjects ? ' on' : ''}`}
              onClick={() => store.toggleScope()}
              title={`Search every open project (${keyDisplay('view.quickOpen')})`}
            >
              {scopeLabel}
            </button>
          ) : null}
        </div>

        {/* Honest progress: a determinate-feeling hairline only while there
            genuinely is work in flight. No spinner on a warm index. */}
        <div className={`qo-progress${ready && !pending ? '' : ' busy'}`} />

        <div
          className="qo-list"
          id="qo-list"
          role="listbox"
          aria-label="Files"
          ref={listRef}
        >
          {unavailable ? (
            <div className="qo-note">
              Quick open is unavailable in this build.
            </div>
          ) : error !== null ? (
            <div className="qo-note">{error}</div>
          ) : parsed.mode === 'reserved' ? (
            <div className="qo-note">
              Commands are not available yet — {keyDisplay('view.quickOpen')}{' '}
              finds files.
            </div>
          ) : parsed.mode === 'goto-line' ? (
            activeTab === null ? (
              <div className="qo-note">
                Open a file first: <span className="qo-kbd">:412</span> jumps
                inside the file you are looking at.
              </div>
            ) : (
              <button
                type="button"
                role="option"
                aria-selected
                className="qo-row selected"
                onClick={() => store.accept(false)}
              >
                <FileIcon path={activeTab.path} size={16} />
                <span className="qo-name">{activeTab.name}</span>
                <span className="qo-dir">
                  {parsed.line === undefined
                    ? 'type a line number'
                    : `line ${String(parsed.line)}`}
                </span>
              </button>
            )
          ) : hits.length === 0 ? (
            <div className="qo-note">
              {query.length === 0
                ? `Type to find a file in ${activeProject?.name ?? 'this project'}.`
                : `No file matches “${query}”.`}
              {query.length > 0 && !allProjects && projects.length > 1 ? (
                <>
                  {' '}
                  <button
                    type="button"
                    className="qo-link"
                    onClick={() => store.toggleScope()}
                  >
                    Search all {projects.length} projects
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <>
              {query.length === 0 ? (
                <div className="qo-group">Recently opened</div>
              ) : null}
              {hits.map((hit, i) => {
                const { name, dir, nameOffset } = splitRelPath(hit.relPath);
                return (
                  <button
                    key={`${hit.repoPath}\u0000${hit.relPath}`}
                    type="button"
                    role="option"
                    aria-selected={i === selected}
                    className={`qo-row${i === selected ? ' selected' : ''}${
                      pending ? ' stale' : ''
                    }`}
                    onMouseMove={() => {
                      if (i !== selected) store.setSelected(i);
                    }}
                    // No double-click handler, deliberately: the FIRST click
                    // already opens and closes the palette, so the second
                    // would land on whatever is underneath. A picker
                    // disappears when you pick — ⌘-click is the mouse
                    // equivalent of ⌘↩, the same as everywhere else.
                    onClick={(e) => store.accept(e.metaKey)}
                  >
                    <FileIcon path={hit.relPath} size={16} />
                    <Runs
                      className="qo-name"
                      text={name}
                      positions={hit.positions}
                      offset={nameOffset}
                    />
                    <Runs
                      className="qo-dir"
                      text={dir}
                      positions={hit.positions}
                      offset={0}
                    />
                    {allProjects ? (
                      <span className="qo-project">
                        {projectNameFor(hit.repoPath)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="qo-footer">
          <span className="qo-status" aria-live="polite">
            {error !== null
              ? ''
              : !ready
                ? `Indexing ${formatCount(indexed)} files…`
                : capped
                  ? 'Showing the first 200,000 files in this project'
                  : hits.length > 0 && query.length > 0
                    ? `${formatCount(hits.length)} of ${formatCount(indexed)} files`
                    : ''}
          </span>
          <span className="qo-keys">
            <span className="key">{keyDisplay('quickOpen.open')}</span> open
            <span className="key">{keyDisplay('quickOpen.keep')}</span> new tab
            {projects.length > 1 ? (
              <>
                <span className="key">{keyDisplay('view.quickOpen')}</span> all
                projects
              </>
            ) : null}
            <span className="key">Esc</span> close
          </span>
        </div>
      </div>
    </>
  );
}
