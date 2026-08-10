/**
 * PierreDiff — the Diff-mode surface (Phase 11: @pierre/diffs replaces the
 * Monaco diff editor; Monaco stays for File-mode editing only).
 *
 * Read-only by design: old side = HEAD contents (git:showHead, IPC
 * unchanged), new side = the working buffer. When a Monaco working model
 * exists (the file was edited in File mode) the diff subscribes to it, so
 * unsaved edits show live; otherwise the last on-disk contents are shown.
 * Theming flows exclusively through the shadow-DOM theme bridge
 * (src/renderer/pierre/theme-bridge.ts) — page CSS cannot reach in.
 *
 * Layout keeps the Monaco-era rule: side-by-side ≥900px, stacked below.
 * Hunk context expansion is on (Pierre's line-info separators, default),
 * inline diffs are word-level.
 *
 * VIRTUALIZATION (the reason for the swap — research 12 §2.1): @pierre/diffs
 * only virtualizes when a Virtualizer instance is in context; without one it
 * materializes every line (a 10k-line diff = 40k line elements, ~9s to open).
 * We drive the virtualizer ourselves instead of using the `<Virtualizer>`
 * component so the scroll container stays THIS component's host element —
 * the one that carries the focus ring, role and aria-label, and the one the
 * arrow/PageDown keys act on. Pierre needs only two things from it: it must
 * be the scroller (`overflow: auto` + a definite height, editor.css) and it
 * must have a stable content wrapper to observe for size changes.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Virtualizer } from '@pierre/diffs';
import { MultiFileDiff, VirtualizerContext } from '@pierre/diffs/react';
import type { FileContents, MultiFileDiffProps } from '@pierre/diffs/react';
import { diffTheme } from '../pierre/theme-bridge';
import { getWorkingModel, loadMonaco, rememberLoaded } from './monaco-loader';
import { OpeningSkeleton } from './MonacoHost';
import type { EditorTab } from './store';

/** Below this width the diff renders stacked instead of side-by-side. */
const SIDE_BY_SIDE_MIN_PX = 900;
/** Model → diff re-render debounce while an agent (or the user) types. */
const MODEL_SYNC_DEBOUNCE_MS = 150;

type DiffOptions = NonNullable<MultiFileDiffProps<undefined>['options']>;

export interface PierreDiffProps {
  tab: EditorTab;
}

export function PierreDiff({ tab }: PierreDiffProps): React.JSX.Element {
  // Diff mode no longer needs Monaco, but the dominant gesture is "glance at
  // diff → maybe tweak" — warm the File-mode chunk in the background so the
  // toggle stays instant. Failures stay silent here; MonacoHost owns retry
  // and error reporting when File mode actually mounts.
  useEffect(() => {
    loadMonaco()
      .then(rememberLoaded)
      .catch(() => undefined);
  }, []);

  // Live working text: the Monaco model is truth while it exists (unsaved
  // edits, external reloads via resetWorkingModel); before File mode ever
  // mounted there is no model and savedContents is already current.
  const [modelText, setModelText] = useState<string | null>(
    () => getWorkingModel(tab.path)?.getValue() ?? null
  );

  useEffect(() => {
    const model = getWorkingModel(tab.path);
    setModelText(model?.getValue() ?? null);
    if (model === null) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sub = model.onDidChangeContent(() => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        setModelText(model.getValue());
      }, MODEL_SYNC_DEBOUNCE_MS);
    });
    return () => {
      if (timer !== null) clearTimeout(timer);
      sub.dispose();
    };
  }, [tab.path]);

  const workingText = modelText ?? tab.savedContents;

  // -- responsive layout: side-by-side ≥900px, stacked below -----------------
  const hostRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [sideBySide, setSideBySide] = useState(true);
  useEffect(() => {
    const el = hostRef.current;
    if (el === null) return;
    const update = (): void =>
      setSideBySide(el.clientWidth >= SIDE_BY_SIDE_MIN_PX);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Opening a diff is an attention switch — focus the (scrollable) region so
  // arrows/PageDown work immediately and Esc can close the panel.
  useEffect(() => {
    hostRef.current?.focus({ preventScroll: true });
  }, [tab.path]);

  // -- virtualization --------------------------------------------------------
  // One virtualizer per mounted diff, bound to the host as scroll root. The
  // diff's line elements attach during the child's ref callback, which runs
  // BEFORE this effect — Pierre queues those connections until setup(), so
  // the order is safe. cleanUp() detaches the scroll/resize/intersection
  // observers when the panel closes or the tab switches away.
  const [virtualizer] = useState(() => new Virtualizer());
  useEffect(() => {
    const host = hostRef.current;
    const content = contentRef.current;
    if (host === null || content === null) return;
    virtualizer.setup(host, content);
    return () => virtualizer.cleanUp();
  }, [virtualizer]);

  // Stable FileContents identities — MultiFileDiff re-parses when these
  // object references change.
  const oldFile = useMemo<FileContents>(
    () => ({
      name: tab.name,
      contents: tab.headContents ?? '',
      cacheKey: `head:${tab.path}`
    }),
    [tab.name, tab.path, tab.headContents]
  );
  const newFile = useMemo<FileContents>(
    () => ({
      name: tab.name,
      contents: workingText,
      cacheKey: `work:${tab.path}`
    }),
    [tab.name, tab.path, workingText]
  );

  const options = useMemo<DiffOptions>(
    () => ({
      theme: diffTheme,
      diffStyle: sideBySide ? 'split' : 'unified',
      lineDiffType: 'word',
      // The tab row already names the file (DESIGN.md editor anatomy) — a
      // second in-diff header would duplicate it and eat split-panel height.
      disableFileHeader: true
    }),
    [sideBySide]
  );

  // HEAD still in flight (store kicks loadHead on open/mode switch).
  const loading = tab.loading || tab.headContents === null;

  return (
    <div
      ref={hostRef}
      className="ed-pierre"
      tabIndex={0}
      role="region"
      aria-label={`Changes vs HEAD — ${tab.name}`}
    >
      <div className="ed-pierre-content" ref={contentRef}>
        {loading ? (
          <OpeningSkeleton />
        ) : tab.headContents === workingText ? (
          <div className="ed-state">
            <div className="ed-state-title">No changes</div>
            <div className="ed-state-body">
              {tab.name} matches HEAD. Edits made in File mode will show up
              here.
            </div>
          </div>
        ) : (
          <VirtualizerContext.Provider value={virtualizer}>
            <MultiFileDiff
              oldFile={oldFile}
              newFile={newFile}
              options={options}
            />
          </VirtualizerContext.Provider>
        )}
      </div>
    </div>
  );
}
