/**
 * RedlineDocument, the Redline view: the whole file as flowing prose with
 * every change marked in place (Phase 194).
 *
 * The operator asked for this on 2026-09-01 with a screenshot of Phase 191's
 * answer, which was a marked-up line hung under Pierre's own two rows, so his
 * one changed line drew three rows with a gutter beside them. He wanted the
 * redline "all by itself, like File or Preview". This is that: a fourth view
 * in the segmented control, beside Diff and File, that draws NO Pierre, no
 * line numbers and no gutter. The document is composed by ./redline-document
 * from the two versions the diff already holds, being `headContents` and the
 * live working text, and drawn through the same `<del>` and `<ins>` markup
 * and the same stylesheet Phase 191 proved, so one change looks the same in
 * both places.
 *
 * Three decisions the operator confirmed, each one a refusal here:
 *
 *   - A markdown file shows its redlined SOURCE. Rendering markdown with
 *     marks inside it is a different and much harder feature, and this view
 *     does not attempt it.
 *   - It is READ ONLY. Nothing here is editable and no caret is offered. The
 *     text selects and copies, and a copy yields the NEW text through
 *     ./redline-copy, which is what a person pastes somewhere else.
 *   - No accept and no reject. Accepting a change writes a file, which is a
 *     feature with different risks, and nothing here reaches a bridge.
 *
 * The two sides are the diff's own: HEAD on the left, and the working text
 * on the right, tracking the Monaco model when one exists so an edit made in
 * File mode shows up here the moment the view is opened again. A history tab
 * takes both sides from its commit and tracks nothing, exactly as PierreDiff
 * does.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { OpeningSkeleton } from './MonacoHost';
import { RedlineRuns } from './RedlineRow';
import { handleRedlineCopy } from './redline-copy';
import {
  composeRedlineDocument,
  redlineDocumentNote
} from './redline-document';
import { useLiveTabText } from './live-text';
import type { EditorTab } from './store';
import './redline.css';

export interface RedlineDocumentProps {
  tab: EditorTab;
}

export function RedlineDocument({
  tab
}: RedlineDocumentProps): React.JSX.Element {
  const historical = tab.commit !== null;
  const workingText = useLiveTabText(tab.id, tab.savedContents, !historical);
  const hostRef = useRef<HTMLDivElement | null>(null);

  // Opening the view is an attention switch, the same as opening the diff:
  // focus the scroller so the keyboard scrolls it and Esc can close the panel.
  useEffect(() => {
    hostRef.current?.focus({ preventScroll: true });
  }, [tab.id]);

  // Phase 197 item 21, the Cmd-A shape Phase 194 recorded as its limit.
  // Chromium dispatches `copy` to the element holding the START of the
  // selection, so a whole body selection from the Edit menu never reaches the
  // scroller's own onCopy below; measured in the app run, the handler was not
  // standing aside, it was never called. This listener on the document sees
  // every copy while the view is mounted, and handleRedlineCopy answers only a
  // selection that reaches this one document, clipped to it, and leaves
  // anything else untouched. An event the scroller already answered is
  // skipped, so a selection inside the document is handled exactly once.
  useEffect(() => {
    const onCopy = (event: ClipboardEvent): void => {
      const host = hostRef.current;
      if (host === null || event.defaultPrevented) return;
      handleRedlineCopy(host, event);
    };
    document.addEventListener('copy', onCopy);
    return () => {
      document.removeEventListener('copy', onCopy);
    };
  }, []);

  const contentsLoading = tab.loading || tab.headContents === null;
  const doc = useMemo(
    () =>
      contentsLoading
        ? null
        : composeRedlineDocument(tab.headContents ?? '', workingText),
    [contentsLoading, tab.headContents, workingText]
  );
  const note = doc === null ? null : redlineDocumentNote(doc);
  const against =
    tab.commit !== null ? `commit ${tab.commit.shortSha}` : 'HEAD';

  return (
    <div className="ed-redline-view">
      <div
        ref={hostRef}
        className="ed-redline-scroll"
        tabIndex={0}
        role="region"
        aria-label={`Redline vs ${against}, ${tab.name}`}
        onCopy={(event) => {
          const host = hostRef.current;
          if (host !== null) handleRedlineCopy(host, event.nativeEvent);
        }}
      >
        {doc === null ? (
          <OpeningSkeleton />
        ) : (
          // One `data-redline` element for the whole document, so the copy
          // handler's containment rule covers any selection inside it.
          <div className="ed-redline ed-redline-doc" data-redline="">
            <RedlineRuns runs={doc.runs} />
          </div>
        )}
      </div>
      {note !== null ? (
        <div className="banner ed-note" role="status">
          <span className="banner-text">{note}</span>
        </div>
      ) : null}
    </div>
  );
}
