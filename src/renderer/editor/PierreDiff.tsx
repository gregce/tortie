/**
 * PierreDiff — the Diff-mode surface (Phase 11: @pierre/diffs replaces the
 * Monaco diff editor; Monaco stays for File-mode editing only).
 *
 * Read-only by design, and it renders BOTH kinds of tab the store produces:
 *   worktree — old side = HEAD contents (git:showHead), new side = the
 *     working buffer. When a Monaco working model exists (the file was
 *     edited in File mode) the diff subscribes to it so unsaved edits show
 *     live; otherwise the last on-disk contents are shown.
 *   history  — old and new both come from `git:commitFileDiff` and are
 *     already in the tab (`headContents` / `savedContents`). The working
 *     model is deliberately NOT consulted: a commit's contents cannot drift.
 * A rename shows the old side under its OLD name, which is the only place
 * the rename is visible once the two blobs are on screen.
 *
 * Theming flows exclusively through the shadow-DOM theme bridge
 * (src/renderer/pierre/theme-bridge.ts) — page CSS cannot reach in.
 *
 * Layout (one column or two) is decided by EditorPanel and arrives as a prop
 * — the panel is the only thing that knows its own width, and the user-facing
 * control lives up there beside the minimap toggle. Hunk context expansion is
 * on (Pierre's line-info separators, default).
 *
 * HOW A CHANGE IS DRAWN is the reader's choice (Phase 185): the inline
 * highlighting mode and whether the full-width row wash is painted, both from
 * the store, both persisted app-wide, both driven from ./DiffControls at the
 * head of this surface. The backgrounds answer rides the options prop, which
 * is enough. The inline mode does NOT: renderers/DiffHunksRenderer.js
 * getRenderOptions returns the WORKER POOL's options whole whenever a working
 * pool is attached, and this surface always attaches one, so a `lineDiffType`
 * on the options prop alone would be accepted and silently ignored. It is
 * passed on the prop for the no-pool path AND pushed to the pool by
 * `applyInlineDiffMode`, whose setRenderOptions clears the caches and
 * re-highlights whatever is already on screen.
 *
 * VIRTUALIZATION (research 12 §2.1): @pierre/diffs only virtualizes when a
 * Virtualizer instance is in context; without one it materializes every line.
 * We drive the virtualizer ourselves instead of using the `<Virtualizer>`
 * component so the scroll container stays THIS component's host element —
 * the one that carries the focus ring, role and aria-label, and the one the
 * arrow/PageDown keys act on. Pierre needs only two things from it: it must
 * be the scroller (`overflow: auto` + a definite height, editor.css) and it
 * must have a stable content wrapper to observe for size changes.
 *
 * OPENING FAST (Phase 12.0 — a 20k-line diff took ~23 s). Three costs, each
 * with its own owner:
 *   1. the diff itself (jsdiff Myers, 7.1 s measured) → a worker, with an
 *      approximate comparison painted in the meantime — pierre/diff-metadata.
 *   2. highlighting the whole file (9.7 s measured) → @pierre/diffs' own
 *      worker pool, which also switches the renderer to a windowed plain-text
 *      first paint — pierre/highlight-pool. The pool must be in context when
 *      the diff instance is created, so the surface waits for it.
 *   3. word-level decorations past the point of affordability → the library's
 *      `tokenizeMaxLength`, degrading to unhighlighted text with a note.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Virtualizer } from '@pierre/diffs';
import { FileDiff, VirtualizerContext, WorkerPoolContext } from '@pierre/diffs/react';
import type { FileContents, FileDiffProps } from '@pierre/diffs/react';
import type { WorkerPoolManager } from '@pierre/diffs/worker';
import { fileCacheKey, useDiffMetadata } from '../pierre/diff-metadata';
import {
  DIFF_RENDER_OPTIONS,
  PLAIN_TEXT_LINE_LIMIT,
  applyInlineDiffMode,
  isPlainTextDiff,
  loadHighlightPool
} from '../pierre/highlight-pool';
import { DiffControls } from './DiffControls';
import { useLiveTabText } from './live-text';
import { loadMonaco, rememberLoaded } from './monaco-loader';
import { OpeningSkeleton } from './MonacoHost';
import { baseName } from './paths';
import { useEditor } from './store';
import type { EditorTab } from './store';

type DiffOptions = NonNullable<FileDiffProps<undefined>['options']>;

export interface PierreDiffProps {
  tab: EditorTab;
  /**
   * Two columns or one. Decided by the PANEL, which owns every width rule in
   * this stack and already knows its own — one threshold, in one place,
   * agreeing with the control the user flips (EditorPanel.DIFF_SPLIT_MIN_PX).
   */
  sideBySide: boolean;
}

export function PierreDiff({
  tab,
  sideBySide
}: PierreDiffProps): React.JSX.Element {
  // Diff mode no longer needs Monaco, but the dominant gesture is "glance at
  // diff → maybe tweak" — warm the File-mode chunk in the background so the
  // toggle stays instant. Failures stay silent here; MonacoHost owns retry
  // and error reporting when File mode actually mounts.
  useEffect(() => {
    loadMonaco()
      .then(rememberLoaded)
      .catch(() => undefined);
  }, []);

  // The RIGHT side. A history tab has no live buffer to track (and must not
  // adopt one) — its contents came from the commit and cannot change.
  const historical = tab.commit !== null;
  const workingText = useLiveTabText(tab.id, tab.savedContents, !historical);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Opening a diff is an attention switch — focus the (scrollable) region so
  // arrows/PageDown work immediately and Esc can close the panel.
  useEffect(() => {
    hostRef.current?.focus({ preventScroll: true });
  }, [tab.id]);

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

  // -- highlight pool --------------------------------------------------------
  // undefined = still loading (hold the diff back: the renderer picks its
  // synchronous, whole-file path if no pool is in context when the instance
  // is created). null = unavailable, render without one.
  const [pool, setPool] = useState<WorkerPoolManager | null | undefined>(
    undefined
  );
  useEffect(() => {
    let live = true;
    void loadHighlightPool().then((p) => {
      if (live) setPool(p);
    });
    return () => {
      live = false;
    };
  }, []);

  // Stable FileContents identities — the diff is re-parsed when these object
  // references change, and Pierre treats two diffs with the same cacheKey as
  // the same diff, so the key has to follow the contents.
  const oldName = tab.origRelPath !== null ? baseName(tab.origRelPath) : tab.name;
  const oldFile = useMemo<FileContents>(() => {
    const contents = tab.headContents ?? '';
    return {
      name: oldName,
      contents,
      cacheKey: fileCacheKey('head', tab.id, contents)
    };
  }, [oldName, tab.id, tab.headContents]);
  const newFile = useMemo<FileContents>(
    () => ({
      name: tab.name,
      contents: workingText,
      cacheKey: fileCacheKey('work', tab.id, workingText)
    }),
    [tab.name, tab.id, workingText]
  );

  const { meta, exact } = useDiffMetadata(oldFile, newFile);

  // -- how the change is drawn (Phase 185) -----------------------------------
  const inlineMode = useEditor((s) => s.diffInlineMode);
  const backgrounds = useEditor((s) => s.diffBackgrounds);

  // The pool's copy of lineDiffType is the one the renderer reads, so the
  // choice has to reach the pool as well as the instance. Idempotent, and it
  // runs on mount too, so a pool that somehow drifted is corrected by opening
  // a diff.
  useEffect(() => {
    applyInlineDiffMode(inlineMode);
  }, [inlineMode]);

  const options = useMemo<DiffOptions>(
    () => ({
      ...DIFF_RENDER_OPTIONS,
      lineDiffType: inlineMode,
      // Pierre's own gate on the full-width row wash: it removes the
      // `data-background` attribute from the wrapper, and every rule that
      // paints a changed row sits inside a `:where([data-background])` block.
      disableBackground: !backgrounds,
      diffStyle: sideBySide ? 'split' : 'unified',
      tokenizeMaxLength: PLAIN_TEXT_LINE_LIMIT,
      // The tab row already names the file (DESIGN.md editor anatomy) — a
      // second in-diff header would duplicate it and eat split-panel height.
      disableFileHeader: true
    }),
    [sideBySide, inlineMode, backgrounds]
  );

  // The old side is still in flight (loadHead / loadCommitDiff).
  const contentsLoading = tab.loading || tab.headContents === null;
  /** What the two sides are, in one phrase — used by the label and states. */
  const against =
    tab.commit !== null ? `commit ${tab.commit.shortSha}` : 'HEAD';
  const unchanged = !contentsLoading && meta === null && exact;
  // Diff still being computed, or the pool has not resolved yet — the diff
  // instance must not be created before the pool is in context.
  const waiting =
    !contentsLoading && !unchanged && (meta === null || pool === undefined);

  // Only ever alongside a rendered diff — a note about what is on screen is
  // noise while the skeleton is still up.
  const note =
    meta === null || contentsLoading || waiting
      ? null
      : !exact
        ? `Comparing ${meta.additionLines.length.toLocaleString()} lines — showing an approximate diff until it finishes.`
        : isPlainTextDiff(meta)
          ? `This diff is too large to highlight — showing ${meta.additionLines.length.toLocaleString()} lines as plain text.`
          : null;

  return (
    <div className="ed-diff">
      {/* Exactly when there is a diff underneath, which is the complement of
          the three states below: an "identical either side" panel is a
          full-height empty state and a row of inert controls above it would be
          furniture, and the same is true over the opening skeleton. Testing
          `unchanged` on its own is not enough and drew the row and then took
          it away, because `unchanged` cannot be true until the old side has
          arrived: on an identical file the row appeared during the load and
          vanished when "No changes" resolved. Sharing the skeleton's own
          condition makes that unreachable rather than merely unlikely. */}
      {contentsLoading || waiting || unchanged ? null : <DiffControls />}
      <div
        ref={hostRef}
        className="ed-pierre"
        tabIndex={0}
        role="region"
        aria-label={
          tab.commit !== null
            ? `Changes in commit ${tab.commit.shortSha} — ${tab.name}`
            : `Changes vs HEAD — ${tab.name}`
        }
      >
        <div className="ed-pierre-content" ref={contentRef}>
          {contentsLoading || waiting ? (
            <OpeningSkeleton />
          ) : unchanged ? (
            <div className="ed-state">
              <div className="ed-state-title">No changes</div>
              <div className="ed-state-body">
                {tab.commit !== null
                  ? tab.origRelPath !== null
                    ? `${tab.name} was renamed from ${tab.origRelPath} in ${against} — its contents did not change.`
                    : `${tab.name} is identical either side of ${against}.`
                  : `${tab.name} matches HEAD. Edits made in File mode will show up here.`}
              </div>
            </div>
          ) : meta !== null ? (
            <WorkerPoolContext.Provider value={pool ?? undefined}>
              <VirtualizerContext.Provider value={virtualizer}>
                <FileDiff fileDiff={meta} options={options} />
              </VirtualizerContext.Provider>
            </WorkerPoolContext.Provider>
          ) : null}
        </div>
      </div>
      {note !== null ? (
        <div className="banner ed-note" role="status">
          <span className="banner-text">{note}</span>
        </div>
      ) : null}
    </div>
  );
}
