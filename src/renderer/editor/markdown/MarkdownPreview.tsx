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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { requestOpenFile } from '../../state/open-file';
import { useLiveTabText } from '../live-text';
import { OpeningSkeleton } from '../MonacoHost';
import type { EditorTab } from '../store';
import { HeadingRuler } from './HeadingRuler';
import { getLoadedMarkdown, loadMarkdown } from './markdown-loader';
import type { MarkdownModule } from './markdown-loader';
import type { MarkdownHighlighter } from './markdown-impl';
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
  const revision = ready ? source.length + langKey.length : 0;

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
        <div ref={contentRef} className="md-content">
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
              onOpenFile={(absPath) => {
                // A relative link inside a document is a deliberate
                // navigation, so it opens for keeps rather than recycling
                // the preview tab the reader arrived in.
                requestOpenFile({
                  repoPath: tab.repoPath,
                  relPath: absPath.startsWith(`${tab.repoPath}/`)
                    ? absPath.slice(tab.repoPath.length + 1)
                    : absPath,
                  path: absPath,
                  mode: 'file',
                  source: 'tree',
                  preview: false
                });
              }}
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
