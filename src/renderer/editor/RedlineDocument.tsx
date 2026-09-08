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

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from 'react';
import { OpeningSkeleton } from './MonacoHost';
import { RedlineRuns } from './RedlineRow';
import { handleRedlineCopy } from './redline-copy';
import {
  composeRedlineDocument,
  redlineDocumentNote
} from './redline-document';
import { useLiveTabText } from './live-text';
import { changeAtCaret } from './redline-caret';
import { useRedlineTyping } from './redline-edits';
import { changesOf } from './rewind';
import type { RedlineChange } from './rewind';
import { RedlineChip } from './redline-chip';
import { installRedlineCommands } from './redline-commands';
import type { RedlineCommand } from './redline-commands';
import { applyRewind } from './redline-write';
import { pressRedline } from './redline-press';
import type { PressedChange } from './redline-press';
import { rewindJournalDepth } from './redline-journal';
import {
  markRedlineHintSeen,
  redlineHintSeen,
  redlineHintSentence
} from './redline-hint';
import {
  redlineRefusalSentence,
  redlineUndoNote
} from './redline-sentences';
import { redlineBaseSide as _baseSideForPress } from './baseline';
import { useEditor } from './store';
import { useApp } from '../state/store';
import { pushRedlineMountedToMenu } from '../app/menu-redline';
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

export type { PressedChange } from './redline-press';

/**
 * The change under focus inside `host`, or null when none holds it. Read off
 * the wrapper's own attributes rather than off any list in memory, so a press
 * is bound to exactly the picture the person is looking at, generation
 * included (research 83 B.8a).
 */
export function focusedChange(host: HTMLElement): PressedChange | null {
  const active = host.ownerDocument.activeElement;
  // PHASE 237. With the document editable a person's attention is where the
  // CARET is, and a caret inside a change is the same claim a focused wrapper
  // makes: ./redline-caret's `changeAtCaret` answers it, and it is asked only
  // when no wrapper holds the focus itself, so a keyboard walk with ⌥↓ reads
  // exactly what it read before.
  const el =
    (active instanceof HTMLElement
      ? active.closest<HTMLElement>('.ed-redline-change')
      : null) ?? changeAtCaret(host);
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

/**
 * Which change the chip is drawn for (Phase 236). FOCUS WINS OVER THE POINTER,
 * and that is a truthfulness rule rather than a taste: ⌥⌫ acts on
 * `document.activeElement`, because ./redline-press reads the identity off the
 * focused wrapper, so a chip drawn on a change under the pointer while a
 * DIFFERENT change held focus would name a change the keys do not act on. With
 * nothing focused the pointer is the whole affordance, and with neither there
 * is no chip at all, which is the resting face.
 */
export function chipAnchorFor(
  focused: HTMLElement | null,
  hovered: HTMLElement | null
): HTMLElement | null {
  return focused ?? hovered;
}

export function RedlineDocument({
  tab
}: RedlineDocumentProps): React.JSX.Element {
  const historical = tab.commit !== null;
  const workingText = useLiveTabText(tab.id, tab.savedContents, !historical);
  // PHASE 237. Typing. The hook owns the caret, the buffer and every default
  // behaviour of a contenteditable; `typing.text` is the current side the
  // person has, which is the live text until they type into it.
  const typing = useRedlineTyping({ tab, liveText: workingText });
  const shownText = typing.text ?? workingText;
  const hostRef = useRef<HTMLDivElement | null>(null);
  // PHASE 236. The chip's own boxes. The view is held as STATE rather than a
  // ref, because the chip is placed against it and so has to be re-rendered
  // once the element exists; it is the only positioned box in the view
  // (research 96 §1.4) and therefore the containing block. `chipRef` is held
  // here so the pointer handler below can tell "the pointer moved onto the
  // chip" from "the pointer left the change".
  const [viewEl, setViewEl] = useState<HTMLDivElement | null>(null);
  const chipRef = useRef<HTMLDivElement | null>(null);

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
  // Edit menu through ./redline-commands. Rewind and undo hand the live tab,
  // the focus reader and the one call site to ./redline-press, which owns the
  // order and moves the journal with the identity the write was made from. A
  // local bump so a rewind or an undo re-renders the journal note at once
  // rather than waiting for the watcher's recompose.
  const [, bumpJournal] = useReducer((n: number) => n + 1, 0);
  const press = useCallback(
    async (kind: 'rewind' | 'undo', host: HTMLElement) => {
      // The LIVE tab, read fresh at the press: savedContents and the drawn
      // prop both trail disk, and the generation guard needs the value now.
      const live = useEditor.getState().tabs.find((t) => t.id === tab.id);
      if (live === undefined) return;
      await pressRedline(
        kind,
        {
          id: live.id,
          root: live.repoPath,
          path: live.path,
          baseline: _baseSideForPress(live.baseline, live.headContents),
          generation: live.baseline?.generation ?? 0,
          dirty: live.dirty
        },
        {
          focused: () => focusedChange(host),
          apply: applyRewind,
          // A refusal is never silent. A success shows nothing on the face:
          // the watcher recomposes the view, exactly as an outside write does.
          refuse: (why) => {
            useApp.getState().toast('info', redlineRefusalSentence(why, live.name));
          }
        }
      );
      bumpJournal();
    },
    [tab.id]
  );
  const runCommand = useCallback(
    (command: RedlineCommand): void => {
      const host = hostRef.current;
      if (host === null) return;
      if (command === 'next') moveFocus(host, 1);
      else if (command === 'prev') moveFocus(host, -1);
      else void press(command, host);
    },
    [press]
  );
  useEffect(() => installRedlineCommands(runCommand), [runCommand]);
  // PHASE 236. The Edit menu's four rows are enabled only while a view is
  // mounted for them to reach. Its own effect with no dependencies, so a
  // change of tab re-installs the handler above without pushing a false and a
  // true at main for nothing.
  useEffect(() => {
    pushRedlineMountedToMenu(true);
    return () => {
      pushRedlineMountedToMenu(false);
    };
  }, []);

  // PHASE 236 item 4. Whether this mount may draw the first-run line, decided
  // ONCE at mount: the flag is marked in an effect below, and reading it again
  // on a later render would make the line vanish under the person mid-session.
  const [hintAllowed] = useState(() => !redlineHintSeen());
  const [hovered, setHovered] = useState<HTMLElement | null>(null);
  const [focusedEl, setFocusedEl] = useState<HTMLElement | null>(null);
  // PHASE 236. Which change the chip is drawn for; the rule is
  // `chipAnchorFor` above, and focus wins over the pointer.
  const anchor = chipAnchorFor(focusedEl ?? typing.caretChange, hovered);
  const forgetAnchor = useCallback((): void => {
    setHovered(null);
    setFocusedEl(null);
  }, []);
  // A chip button focuses the change it is drawn for and then runs the SAME
  // command the chord and the Edit menu run. Research 96 §1.2 is why the
  // focus comes first: with the focus anywhere else, `focusedChange` answers
  // null and the press does nothing, and `moveFocus` jumps to the first
  // change instead of the neighbour. `preventScroll` because the change the
  // person is pointing at is on screen by definition.
  const runFromChip = useCallback(
    (command: RedlineCommand, el: HTMLElement): void => {
      el.focus({ preventScroll: true });
      runCommand(command);
    },
    [runCommand]
  );

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
    const doc = composeRedlineDocument(baseSide, shownText);
    return { doc, changes: changesOf(doc.runs) };
  }, [contentsLoading, baseSide, shownText]);
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
  // PHASE 227. One short sentence, shown only when this tab has a rewind to
  // undo, saying the chord and that it lasts for the session (research 83
  // E.8). It is not a live region: it appears the moment a rewind lands and
  // says nothing on its own.
  // PHASE 236 item 4. The first redline WITH A CHANGE in this session says
  // where the controls are, once. A clean file draws no line, because there is
  // nothing there to point at; the flag is marked only when the line is really
  // drawn, so the first thing a person sees is never spent on an empty
  // document.
  const hasChanges = composed !== null && composed.changes.length > 0;
  const hintNote = hintAllowed && hasChanges ? redlineHintSentence() : null;
  useEffect(() => {
    if (hintNote !== null) markRedlineHintSeen();
  }, [hintNote]);
  const canUndo = rewindJournalDepth(tab.id) > 0;
  // PHASE 237 item 4. Two undos, kept apart and said so in one line while both
  // are available. ./redline-sentences owns the words with every other sentence
  // this view says.
  const undoNote =
    doc === null ? null : redlineUndoNote(canUndo, typing.canUndoTyping);

  return (
    <div
      className="ed-redline-view"
      ref={setViewEl}
      // PHASE 236. One handler for the whole view, because `pointerover`
      // bubbles from every element the pointer enters: a move onto the chip
      // KEEPS the chip (the chip is not inside the scroller, so leaving the
      // change would otherwise unmount it before it could be clicked), a move
      // onto a change draws it there, and a move onto anything else clears it.
      onPointerOver={(event) => {
        const target = event.target as HTMLElement | null;
        if (target === null) return;
        if (chipRef.current?.contains(target) === true) return;
        setHovered(target.closest<HTMLElement>('.ed-redline-change'));
      }}
      onPointerLeave={() => {
        setHovered(null);
      }}
    >
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
        // PHASE 236. React's onFocus and onBlur are focusin and focusout, so
        // they see a change taking the keyboard from the chords, from a click
        // or from the chip's own buttons. The scroller taking focus on mount
        // answers null here, which is the resting face.
        onFocus={(event) => {
          setFocusedEl(
            (event.target as HTMLElement).closest<HTMLElement>(
              '.ed-redline-change'
            )
          );
        }}
        onBlur={() => {
          setFocusedEl(null);
        }}
      >
        {doc === null ? (
          <OpeningSkeleton />
        ) : (
          // One `data-redline` element for the whole document, so the copy
          // handler's containment rule covers any selection inside it.
          <div className="ed-redline ed-redline-doc"
            data-redline=""
            {...typing.docProps}
          >
            <DocumentRuns
              runs={doc.runs}
              changes={composed?.changes ?? []}
              generation={generation}
            />
          </div>
        )}
      </div>
      {/* PHASE 236. OUTSIDE `.ed-redline-doc`, and after the scroller: the
          four readers of the document walk that element's own children, and
          `p225-redline-projection.test.tsx`'s aria() reads the FIRST
          aria-label in the markup, which must stay the scroller's. */}
      <RedlineChip
        anchor={anchor}
        view={viewEl}
        canUndo={canUndo}
        onCommand={runFromChip}
        chipRef={chipRef}
        onDetached={forgetAnchor}
      />
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
      {undoNote !== null ? (
        // PHASE 227. The undo sentence, in the same slot and the same tokens,
        // shown only while there is a rewind to undo.
        <div className="banner ed-note ed-redline-undo">
          <span className="banner-text">{undoNote}</span>
        </div>
      ) : null}
      {hintNote !== null ? (
        // PHASE 236. The first-run line, in the same slot and the same tokens,
        // LAST so the two sentences above it keep their place, and NOT a live
        // region for the reason Phase 225 gives above: a banner that announced
        // itself would be the notification research 83 C.6 refuses. The caps
        // note is the one `role="status"` in this view and it stays the one.
        <div className="banner ed-note ed-redline-hint">
          <span className="banner-text">{hintNote}</span>
        </div>
      ) : null}
    </div>
  );
}
