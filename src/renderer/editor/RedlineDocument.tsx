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
 *
 * PHASE 227 GAVE EVERY CHANGE ONE ELEMENT. Research 83 D.1 measured the flat
 * DOM Phase 194 drew, one element per run and no element that means "this
 * change": a `del` and its `ins` were siblings, adjacent by convention. The
 * document now wraps each change, being research 83 B.2's unit, in one
 * `span.ed-redline-change` carrying the change's identity as data attributes,
 * so a change is a thing that can take focus. The wrapper carries neither
 * `data-redline` nor `data-redline-del`, so ./redline-copy's containment rule
 * and its clone still answer exactly what they answered, and the projection
 * property is unchanged: read at the LEAVES, the non-INS text is still the
 * baseline byte for byte and the non-DEL text the working text.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { OpeningSkeleton } from './MonacoHost';
import { RedlineRuns } from './RedlineRow';
import { handleRedlineCopy } from './redline-copy';
import {
  composeRedlineDocument,
  redlineDocumentNote
} from './redline-document';
import { useLiveTabText } from './live-text';
import { changesOf } from './rewind';
import type { RedlineChange } from './rewind';
import { installRedlineCommands } from './redline-commands';
import type { RedlineCommand } from './redline-commands';
import type { RedlineRun } from './redline';
import {
  baselineName,
  baselineSentence,
  redlineBaseSide
} from './baseline';
import type { EditorTab } from './store';
import './redline.css';

export interface RedlineDocumentProps {
  tab: EditorTab;
}

/**
 * The document's runs with every change wrapped (Phase 227).
 *
 * A plain run is the bare `<span>` Phase 194 drew. A change is one wrapper
 * around exactly its own runs, drawn by the same `RedlineRuns` the row uses,
 * so the marks inside it are byte for byte what they were. The wrapper's
 * attributes are the change's identity, being the baseline offset, the
 * deleted text, the inserted text and the baseline generation the picture was
 * drawn against, which is what a press carries and never a run index.
 *
 * The attribute names begin `data-change` and NOT `data-redline`: the copy
 * handler removes every `[data-redline-del]` from a clone, and a wrapper
 * named that way would take the inserted words off the clipboard with it.
 */
function DocumentRuns({
  runs,
  changes,
  generation
}: {
  runs: readonly RedlineRun[];
  changes: readonly RedlineChange[];
  generation: number;
}): React.JSX.Element {
  const out: React.ReactNode[] = [];
  let i = 0;
  let c = 0;
  while (i < runs.length) {
    const change = changes[c];
    if (change !== undefined && change.runs[0] === i) {
      out.push(
        <span
          key={`c${String(c)}`}
          className="ed-redline-change"
          tabIndex={-1}
          role="group"
          aria-label={`Change ${String(c + 1)} of ${String(changes.length)}`}
          data-change={String(c)}
          data-change-off={String(change.off)}
          data-change-del={change.del}
          data-change-ins={change.ins}
          data-change-gen={String(generation)}
        >
          <RedlineRuns runs={change.runs.map((k) => runs[k] as RedlineRun)} />
        </span>
      );
      i += change.runs.length;
      c += 1;
      continue;
    }
    out.push(<span key={i}>{runs[i]?.text}</span>);
    i += 1;
  }
  return <>{out}</>;
}

/**
 * What a press carries, read off the focused wrapper's own attributes rather
 * than off any list in memory, so a press is bound to exactly the picture
 * the person is looking at, generation included (research 83 B.8a).
 */
export interface PressedChange {
  off: number;
  del: string;
  ins: string;
  generation: number;
}

/** The change under focus inside `host`, or null when none holds it. */
export function focusedChange(host: HTMLElement): PressedChange | null {
  const active = host.ownerDocument.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  const el = active.closest<HTMLElement>('.ed-redline-change');
  if (el === null || !host.contains(el)) return null;
  const off = Number(el.dataset['changeOff']);
  const generation = Number(el.dataset['changeGen']);
  if (!Number.isInteger(off) || !Number.isInteger(generation)) return null;
  return {
    off,
    del: el.dataset['changeDel'] ?? '',
    ins: el.dataset['changeIns'] ?? '',
    generation
  };
}

/**
 * The command a key event names, or null. The four chords are the keymap's
 * `redline.*` entries (src/shared/keymap.ts), answered here and nowhere else:
 * ⌥↓ next, ⌥↑ previous, ⌥⌫ rewind, ⌥⇧⌫ undo. Anything with ⌘ or ⌃ is not
 * ours, so the editor panel's and the shell's chords pass untouched.
 */
export function redlineCommandOf(event: {
  key: string;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): RedlineCommand | null {
  if (!event.altKey || event.metaKey || event.ctrlKey) return null;
  if (event.key === 'ArrowDown' && !event.shiftKey) return 'next';
  if (event.key === 'ArrowUp' && !event.shiftKey) return 'prev';
  if (event.key === 'Backspace') return event.shiftKey ? 'undo' : 'rewind';
  return null;
}

/**
 * Move the keyboard to the next or previous change and answer which one, or
 * null when the document holds none. From nowhere, next is the first change
 * and previous the last; at either end the focus stays where it is. `focus()`
 * alone: research 83 D.3 measured it scrolling a change into view on a
 * 3,670px document with no `scrollIntoView` call.
 */
export function moveFocus(host: HTMLElement, delta: 1 | -1): number | null {
  const items = Array.from(
    host.querySelectorAll<HTMLElement>('.ed-redline-change')
  );
  if (items.length === 0) return null;
  const active = host.ownerDocument.activeElement;
  const current =
    active instanceof HTMLElement
      ? items.indexOf(active.closest<HTMLElement>('.ed-redline-change') ?? active)
      : -1;
  const next =
    current === -1
      ? delta === 1
        ? 0
        : items.length - 1
      : Math.min(items.length - 1, Math.max(0, current + delta));
  items[next]?.focus();
  return next;
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

  // PHASE 227. The four commands, from the scroller's own keys and from the
  // Edit menu through ./redline-commands. Rewind and undo read the change
  // under focus and hand it to the one press function; until item 4 of the
  // phase installs it, a press resolves the identity and does nothing more.
  const press = useCallback((kind: 'rewind' | 'undo', host: HTMLElement) => {
    const pressed = kind === 'rewind' ? focusedChange(host) : null;
    void pressed;
  }, []);
  const runCommand = useCallback(
    (command: RedlineCommand): void => {
      const host = hostRef.current;
      if (host === null) return;
      if (command === 'next') moveFocus(host, 1);
      else if (command === 'prev') moveFocus(host, -1);
      else press(command, host);
    },
    [press]
  );
  useEffect(() => installRedlineCommands(runCommand), [runCommand]);

  // The skeleton still waits for git's first answer, baseline or not: a
  // baseline seeded from the read is overtaken by a HEAD version the moment
  // one lands, and drawing an empty redline for that moment would be a flash.
  // Every way into this view for a worktree tab asks git first (the store's
  // setMode loads HEAD when it is null), so the wait always ends.
  const contentsLoading = tab.loading || tab.headContents === null;
  // PHASE 225. The left side is the tab's shadow baseline (./baseline) when
  // it holds one, and the diff's HEAD side when it does not, so a tab with no
  // baseline draws exactly what Phase 194 shipped. The composer takes two
  // strings and never knew where its left side came from.
  const baseSide = redlineBaseSide(tab.baseline, tab.headContents);
  // PHASE 227. The changes are grouped in the same memo as the compose, so
  // the wrappers and the runs they hold can never come from two pictures.
  const composed = useMemo(() => {
    if (contentsLoading) return null;
    const doc = composeRedlineDocument(baseSide, workingText);
    return { doc, changes: changesOf(doc.runs) };
  }, [contentsLoading, baseSide, workingText]);
  const doc = composed === null ? null : composed.doc;
  const generation = tab.baseline?.generation ?? 0;
  const note = doc === null ? null : redlineDocumentNote(doc);
  // PHASE 225. The face names the baseline. A history tab names its commit;
  // a worktree tab names the last commit or the moment the file was opened;
  // a tab with no baseline still says HEAD, which is what it draws against.
  const name = tab.commit === null ? baselineName(tab.baseline) : null;
  const label =
    tab.commit !== null
      ? `Redline vs commit ${tab.commit.shortSha}`
      : name !== null
        ? `Redline since ${name}`
        : 'Redline vs HEAD';
  // A dirty tab is not re-read by the watcher, so the right side is the
  // person's buffer and not the disk for as long as it stays dirty; the
  // sentence states that limit rather than hiding it.
  const since = doc === null ? null : baselineSentence(tab.baseline, tab.dirty);

  return (
    <div className="ed-redline-view">
      <div
        ref={hostRef}
        className="ed-redline-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${label}, ${tab.name}`}
        onCopy={(event) => {
          const host = hostRef.current;
          if (host !== null) handleRedlineCopy(host, event.nativeEvent);
        }}
        onKeyDown={(event) => {
          const command = redlineCommandOf(event);
          if (command === null) return;
          event.preventDefault();
          runCommand(command);
        }}
      >
        {doc === null ? (
          <OpeningSkeleton />
        ) : (
          // One `data-redline` element for the whole document, so the copy
          // handler's containment rule covers any selection inside it.
          <div className="ed-redline ed-redline-doc" data-redline="">
            <DocumentRuns
              runs={doc.runs}
              changes={composed?.changes ?? []}
              generation={generation}
            />
          </div>
        )}
      </div>
      {note !== null ? (
        <div className="banner ed-note" role="status">
          <span className="banner-text">{note}</span>
        </div>
      ) : null}
      {since !== null ? (
        // PHASE 225. The baseline's name and its lifetime, in the same slot
        // and the same tokens as the caps note above, and NOT a live region:
        // this sentence changes only when the baseline is re-seeded, and a
        // banner that announced itself would be the notification research 83
        // C.6 refuses. The caps note keeps its role, because a cap firing is
        // about the picture in front of the person.
        <div className="banner ed-note ed-redline-since">
          <span className="banner-text">{since}</span>
        </div>
      ) : null}
    </div>
  );
}
