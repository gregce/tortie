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
 *   - It WAS read only, and PHASE 237 REVERSED THAT AT THE OPERATOR'S WORD of
 *     2026-09-08, *"allows for edits in redline mode so you don't need to keep
 *     switching to source"*, which reverses his own ruling of the day before.
 *     The document is `contenteditable` for a worktree tab and ./redline-edits
 *     owns every default behaviour of one; a commit tab, a tab on another
 *     machine and a truncated tab are still read only. The copy answer did not
 *     move: the text still selects and a copy still yields the NEW text
 *     through ./redline-copy.
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

import { keyDisplay } from '@shared/keymap';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
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
import {
  CURRENT_ATTRIBUTE,
  currentElement,
  identityOf,
  sameChange,
  stepChange
} from './redline-current';
import type { ChangeIdentity } from './redline-current';
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
  baselineDetail,
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
  generation,
  current
}: {
  runs: readonly RedlineRun[];
  changes: readonly RedlineChange[];
  generation: number;
  /** PHASE 239. The change the controls belong to, marked in the document. */
  current: ChangeIdentity | null;
}): React.JSX.Element {
  const out: React.ReactNode[] = [];
  let i = 0;
  let c = 0;
  while (i < runs.length) {
    const change = changes[c];
    if (change !== undefined && change.runs[0] === i) {
      // PHASE 239 shape 4. The mark is put on by the RENDER and never by a
      // mutation, so it comes back on its own after the recompose an agent's
      // write causes — which is the whole of research 99 section 2.3's
      // finding. It is an attribute rather than a class so the stylesheet's
      // one selector cannot drift from the anchor's one query.
      const isCurrent =
        current !== null &&
        sameChange(current, { off: change.off, del: change.del, ins: change.ins, generation });
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
          {...(isCurrent ? { [CURRENT_ATTRIBUTE]: '' } : {})}
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
 * Which change the chip is drawn for. THE CURRENT CHANGE WINS OVER THE
 * POINTER, and that is a truthfulness rule rather than a taste: ⌥⌫ acts on the
 * change the view holds as current, so a chip drawn on a change under the
 * pointer while a DIFFERENT one was current would name a change the keys do
 * not act on. With no current change the pointer is the whole affordance, and
 * with neither there is no chip at all, which is the resting face.
 *
 * PHASE 239 changed what the first argument IS and not what this rule says.
 * Phase 236 passed `document.activeElement`'s wrapper, which research 99
 * section 2.3 measured being destroyed by every recompose; it is now the
 * element wearing the current mark, which the render puts back.
 */
export function chipAnchorFor(
  current: HTMLElement | null,
  hovered: HTMLElement | null
): HTMLElement | null {
  return current ?? hovered;
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
  const [hovered, setHovered] = useState<HTMLElement | null>(null);
  // PHASE 239 shape 1. THE CURRENT CHANGE IS STATE, KEYED ON ITS IDENTITY, and
  // it is the whole of what the operator asked for. Phase 236 held
  // `document.activeElement`'s wrapper, and research 99 section 2.3 measured
  // an outside write taking the person's place away: the wrapper is replaced
  // by the recompose, focus goes with it, the chip goes with the focus — while
  // the change itself was still drawn with the same identity, the same offset
  // and the same generation. Held as an identity it survives, because the
  // render puts the mark back on whichever wrapper is that change now.
  const [current, setCurrent] = useState<ChangeIdentity | null>(null);
  const currentRef = useRef<ChangeIdentity | null>(null);
  currentRef.current = current;
  const [currentEl, setCurrentEl] = useState<HTMLElement | null>(null);
  // A new tab is a new document and a new place in it: the resting face draws
  // no control (Phase 236's rule, which this phase keeps).
  useEffect(() => {
    setCurrent(null);
  }, [tab.id]);
  // PHASE 236. Which change the chip is drawn for; the rule is
  // `chipAnchorFor` above, and the current change wins over the pointer.
  const anchor = chipAnchorFor(currentEl, hovered);
  const forgetAnchor = useCallback((): void => {
    setHovered(null);
    setCurrent(null);
  }, []);
  /** Make one drawn wrapper the current change. */
  const makeCurrent = useCallback((el: HTMLElement | null): void => {
    if (el === null) return;
    const id = identityOf(el);
    if (id !== null) setCurrent(id);
  }, []);

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
          // PHASE 239. The press acts on the change the person SEES marked.
          // The identity is read off that wrapper's own attributes, generation
          // included, so a moved baseline is still refused by the guard in
          // ./redline-write (research 83 B.8a); the held state is a place and
          // never a stale generation. With nothing current — a hover with no
          // step yet — the DOM answer stands, exactly as Phase 236 left it.
          focused: () => {
            const marked = currentElement(host);
            return marked === null ? focusedChange(host) : identityOf(marked);
          },
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
  /**
   * PHASE 239. Step to the next or previous change and MAKE IT CURRENT.
   *
   * The position is computed from the held identity through
   * ./redline-current's pure `stepIndex` and never from
   * `document.activeElement`, which is the fix for research 99 section 2.2's
   * swallowed first press: the first ⌥↓ of a fresh view left the focus on the
   * editing host and drew nothing at all, reproduced in two runs. The wrapper
   * is still focused, for the ring and for the scroll-into-view research 83
   * D.3 measured on a 3,670px document, but the state moves whatever the focus
   * does.
   */
  const step = useCallback(
    (delta: 1 | -1): void => {
      const host = hostRef.current;
      if (host === null) return;
      const el = stepChange(host, currentRef.current, delta);
      if (el === null) return;
      makeCurrent(el);
      el.focus();
    },
    [makeCurrent]
  );
  const runCommand = useCallback(
    (command: RedlineCommand): void => {
      const host = hostRef.current;
      if (host === null) return;
      if (command === 'next') step(1);
      else if (command === 'prev') step(-1);
      else void press(command, host);
    },
    [press, step]
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
  // A chip button focuses the change it is drawn for and then runs the SAME
  // command the chord and the Edit menu run. Research 96 §1.2 is why the
  // focus comes first: with the focus anywhere else, `focusedChange` answers
  // null and the press does nothing, and `moveFocus` jumps to the first
  // change instead of the neighbour. `preventScroll` because the change the
  // person is pointing at is on screen by definition.
  const runFromChip = useCallback(
    (command: RedlineCommand, el: HTMLElement): void => {
      // PHASE 239. The chip's own change becomes the current one BEFORE the
      // command runs, so a button pressed on a hovered change acts on that
      // change and a step walks from it. Phase 236 did this with `focus()`
      // alone, which a `contenteditable` host can swallow (research 99
      // section 2.2); the focus is still moved, for the ring and the
      // scroll-into-view, but nothing depends on it landing.
      makeCurrent(el);
      el.focus({ preventScroll: true });
      runCommand(command);
    },
    [makeCurrent, runCommand]
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
  // A dirty tab is not re-read by the watcher, so the right side is the
  // person's buffer and not the disk for as long as it stays dirty; the
  // sentence states that limit rather than hiding it.
  //
  // PHASE 239 item 5. An EMPTY picture gets its own sentence, which says that
  // nothing has changed and, for a file with no committed version, the clock
  // time the comparison starts from. Research 99 section 6.2 read the three
  // opening faces off the running app and found one sentence on all three,
  // with the untracked and the agent-created faces byte for byte identical.
  // The longer explanation goes on the hover and never on the resting face
  // ("TONS of words, bad", 2026-08-28).
  const face = { empty: !hasChanges };
  const since =
    doc === null ? null : baselineSentence(tab.baseline, tab.dirty, face);
  const sinceDetail = doc === null ? null : baselineDetail(tab.baseline, face);
  const hintNote = hintAllowed && hasChanges ? redlineHintSentence() : null;
  useEffect(() => {
    if (hintNote !== null) markRedlineHintSeen();
  }, [hintNote]);
  // PHASE 239. The mark and the chip's anchor are THE SAME ELEMENT, found
  // after every render rather than remembered across one: a recompose replaces
  // the wrapper, and the render puts `data-current` back on whichever wrapper
  // is that change now. It answers null when the picture no longer holds the
  // change at all, which is the ordinary answer after a rewind.
  useLayoutEffect(() => {
    const host = hostRef.current;
    setCurrentEl(host === null ? null : currentElement(host));
  }, [current, composed]);
  // PHASE 237 gave the document a caret, and a caret is the same claim a
  // focused wrapper makes (./redline-caret changeAtCaret). Moving it INTO a
  // change makes that change current; moving it anywhere else leaves the
  // current one alone, which is the persistence this phase is for.
  useEffect(() => {
    makeCurrent(typing.caretChange);
  }, [makeCurrent, typing.caretChange]);
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
        // PHASE 236. React's onFocus is focusin, so it sees a change taking
        // the keyboard from the chords, from a click or from the chip's own
        // buttons. The scroller taking focus on mount names no change, which
        // is the resting face.
        //
        // PHASE 239 REMOVED THE onBlur THAT CLEARED IT, and that removal is
        // the operator's ask: "today the they sort of just hover". The
        // controls now belong to the change the person went to and stay there
        // until they go somewhere else, rather than being surrendered the
        // moment the keyboard leaves the document.
        onFocus={(event) => {
          makeCurrent(
            (event.target as HTMLElement).closest<HTMLElement>(
              '.ed-redline-change'
            )
          );
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
              current={current}
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
        <div
          className="banner ed-note ed-redline-since"
          // PHASE 239 item 5. The one line is on the face; the explanation a
          // person might want is behind the hover, which is where the
          // operator's rule of 2026-08-28 puts it.
          {...(sinceDetail === null ? {} : { title: sinceDetail })}
        >
          <span className="banner-text">{since}</span>
        </div>
      ) : null}
      {undoNote !== null ? (
        // PHASE 227. The undo sentence, in the same slot and the same tokens,
        // shown only while there is a rewind to undo.
        //
        // PHASE 239 item 5 MADE THIS ROW'S WORDS A CONTROL, which is Phase
        // 236's own recorded finding closed. The chip's Undo meant the last
        // rewind in the TAB and could be drawn beside a phrase it would not
        // act on; research 99 section 7.1 drove exactly that and the file came
        // back to the agent's version with the phrase the person was pointing
        // at untouched. Here the sentence beside the button already says what
        // the button does, so the label is true for the first time, and the
        // chip keeps the 171.60px that fits the pane he works in.
        <div className="banner ed-note ed-redline-undo">
          <span className="banner-text">{undoNote}</span>
          <button
            type="button"
            className="ed-redline-note-button"
            // Tortie's own control and never the person's text, the same
            // refusal the chip and the spacing tag record.
            data-redline-tag=""
            aria-label="Undo the last rewind"
            title="Undo the last rewind"
            // It runs the SAME command the chord and the Edit menu run, so
            // there is still exactly one road to the one call site.
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              runCommand('undo');
            }}
          >
            Undo
            <span className="key">{keyDisplay('redline.undo')}</span>
          </button>
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
