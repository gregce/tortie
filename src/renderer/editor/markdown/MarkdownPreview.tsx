/**
 * MarkdownPreview — the rendered-markdown surface (BACKLOG item 6).
 *
 * The light half: owns the scroll region, the heading ruler, the loading and
 * empty states, and the live-buffer subscription. The renderer itself lives
 * in the lazily-imported markdown-impl chunk, so opening a .ts file never
 * pays for react-markdown.
 *
 * MONACO INDEPENDENCE (the BACKLOG note about deleting Monaco later): Preview
 * mode reads `tab.savedContents` and imports nothing from the Monaco stack.
 * Only SPLIT mode wants the unsaved buffer, and it takes it through the one
 * `useLiveTabText()` hook the diff surface also uses — so the dependency runs
 * one way and dies with Monaco rather than with this file.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requestOpenFile } from '../../state/open-file';
import { useLiveTabText } from '../live-text';
import { OpeningSkeleton } from '../MonacoHost';
import type { EditorTab } from '../store';
import { HeadingRuler } from './HeadingRuler';
import { getLoadedMarkdown, loadMarkdown } from './markdown-loader';
import type { MarkdownModule } from './markdown-loader';
import type { MarkdownHighlighter, RenderProgress } from './markdown-impl';
import './markdown.css';

export interface MarkdownPreviewProps {
  tab: EditorTab;
  /**
   * Track the unsaved buffer (Split mode). Preview mode alone renders the
   * file as saved — the whole point is reading it.
   */
  live: boolean;
  /** Show the heading ruler (the minimap toggle drives both surfaces). */
  ruler: boolean;
}

export function MarkdownPreview({
  tab,
  live,
  ruler
}: MarkdownPreviewProps): React.JSX.Element {
  const [impl, setImpl] = useState<MarkdownModule | null>(getLoadedMarkdown);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (impl !== null) return;
    let cancelled = false;
    loadMarkdown().then(
      (m) => {
        if (!cancelled) {
          setImpl(m);
          setLoadError(null);
        }
      },
      (err: unknown) => {
        if (!cancelled) setLoadError((err as Error).message);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [impl]);

  // -- source ----------------------------------------------------------------
  // Only Split tracks the unsaved buffer; a standalone Preview renders what
  // is on disk and has no reason to hold a subscription open.
  const source = useLiveTabText(tab.id, tab.savedContents, live);

  // -- highlighter -----------------------------------------------------------
  // Re-attach languages only when the SET of fences changes, not on every
  // keystroke in Split mode.
  const langKey = useMemo(
    () => (impl === null ? '' : impl.fenceLanguages(source).sort().join(',')),
    [impl, source]
  );
  const [highlighter, setHighlighter] = useState<MarkdownHighlighter | null>(
    null
  );
  const [highlightReady, setHighlightReady] = useState(false);
  useEffect(() => {
    if (impl === null) return;
    let cancelled = false;
    setHighlightReady(false);
    void impl.prepareHighlighter(source).then((h) => {
      if (cancelled) return;
      setHighlighter(h);
      setHighlightReady(true);
    });
    return () => {
      cancelled = true;
    };
    // `source` is intentionally absent: the highlighter only cares which
    // languages appear, and re-running it per keystroke would blank the pane.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impl, langKey]);

  // -- streaming -------------------------------------------------------------
  // PHASE 255. The preview draws a first window and streams the rest, and it
  // reports how far it has got. Every read below compares the report's
  // SOURCE with the source being rendered, at render time and never in an
  // effect, so a report that lands after the source changed reads as nothing
  // drawn rather than as the previous document's completion (research 117 §8).
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const onRenderProgress = useCallback((next: RenderProgress): void => {
    setProgress((prev) =>
      prev !== null &&
      prev.source === next.source &&
      prev.drawn === next.drawn &&
      prev.total === next.total
        ? prev
        : next
    );
  }, []);
  const current = progress !== null && progress.source === source ? progress : null;
  const drawn = current?.drawn ?? 0;
  const streamDone = current !== null && current.drawn >= current.total;

  // Stable across renders ON PURPOSE: the components map is memoized on this
  // callback, and every drawn chunk is memoized on the renderer built from
  // that map, so a new function here each render would re-render the whole
  // drawn page on every streamed batch.
  const repoPath = tab.repoPath;
  const onOpenFile = useCallback(
    (absPath: string): void => {
      // A relative link inside a document is a deliberate navigation, so it
      // opens for keeps rather than recycling the preview tab the reader
      // arrived in.
      requestOpenFile({
        repoPath,
        relPath: absPath.startsWith(`${repoPath}/`)
          ? absPath.slice(repoPath.length + 1)
          : absPath,
        path: absPath,
        mode: 'file',
        source: 'tree',
        preview: false
      });
    },
    [repoPath]
  );

  // -- scroll region ---------------------------------------------------------
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const regionId = `md-scroll-${tab.id.replace(/[^\w-]/g, '_')}`;

  // Opening a document is an attention switch — arrows/PageDown should work
  // without a click first (Esc hands focus back to the terminal).
  useEffect(() => {
    if (!live) scrollerRef.current?.focus({ preventScroll: true });
  }, [tab.id, live]);

  const ready = impl !== null && highlightReady;
  // `drawn` is in the revision so the heading ruler re-reads its ticks and
  // re-arms its image decodes as chunks land, not only at first paint.
  const revision = ready ? source.length + langKey.length + drawn : 0;

  return (
    <div className="md-preview">
      <div
        id={regionId}
        ref={scrollerRef}
        className="md-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${tab.name} — preview`}
      >
        <div
          ref={contentRef}
          className="md-content"
          data-md-stream={
            !ready || loadError !== null || source.trim() === ''
              ? undefined
              : streamDone
                ? 'done'
                : 'streaming'
          }
        >
          {loadError !== null ? (
            <div className="ed-state">
              <div className="ed-state-title">
                The markdown preview failed to load
              </div>
              <div className="ed-state-body">{loadError}</div>
            </div>
          ) : !ready ? (
            <OpeningSkeleton />
          ) : source.trim() === '' ? (
            <div className="ed-state">
              <div className="ed-state-title">This file is empty</div>
              <div className="ed-state-body">
                Switch to Source to start writing.
              </div>
            </div>
          ) : (
            <impl.MarkdownDocument
              source={source}
              filePath={tab.path}
              rootPath={tab.repoPath}
              highlighter={highlighter}
              onOpenFile={onOpenFile}
              onRenderProgress={onRenderProgress}
            />
          )}
        </div>
      </div>
      {ruler && ready ? (
        <HeadingRuler
          scrollerRef={scrollerRef}
          contentRef={contentRef}
          revision={revision}
          controls={regionId}
        />
      ) : null}
    </div>
  );
}
