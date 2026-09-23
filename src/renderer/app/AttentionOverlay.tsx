/**
 * S7 — Attention overlay (⌘J / 🔔): every NEEDS_INPUT session across all
 * projects, newest-blocked first. Non-modal: click-away closes, no scrim.
 * ↑↓ + ↩ jumps to project tab + session + terminal focus.
 *
 * PHASE 93 changed two things about a row, and both exist because a session
 * whose folder has no open tab used to be a row a person could not read and
 * could not act on.
 *
 * The row used to draw the name of the project tab the session belongs to, and
 * it drew an empty string when no tab matched. A session with no tab is exactly
 * the session a person most needs named, so the row now draws the session's own
 * facts instead, being the folder it runs in and, when it is not on this Mac,
 * the machine it runs on. Those two facts are on the session row itself and are
 * there whether or not a tab is open.
 *
 * The row used to offer one gesture, being jump. It now also offers End, by
 * right click and by ⌘⌫, so a session a person can see is a session a person
 * can clear. Both verbs are the ones every other session surface already uses,
 * so nothing about ending a session is written twice.
 *
 * PHASE 311 changed one thing about a row, being which line it draws beside the
 * session's name.
 *
 * The row drew the excerpt, which is the last inked line of the session's
 * screen. For every committed Claude dialog that line is the hint row — `Esc to
 * cancel · Tab to amend` — while the question the agent actually asked sits
 * five lines above it. Main now composes the question from the hook body it
 * already receives, and the row draws THAT when there is one, falling back to
 * the excerpt for every session main has no question for. The span is the same
 * span and the stylesheet does not move; `data-question` says which of the two
 * is on screen so a probe can read it.
 *
 * THE CHORD IS NOT SPELLED HERE. It is the keymap row `session.endFromAttention`
 * in src/shared/keymap.ts, and this file reads its glyphs back with
 * `keyDisplay`. That row is what puts the chord in the ⌘/ overlay, in Settings
 * and in the recorder's reserved list, so the footer below and those three
 * surfaces cannot drift apart.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@shared/types';
import { accelerator, keyDisplay } from '@shared/keymap';
import { effectiveStatusOf, useApp } from '../state/store';
import { formatAge } from '@shared/age';
import { displayPath, truncateMiddle, useNow } from '../format';
import { jumpToSession } from './session-focus';
import { closeSession, sessionMenuItems } from './session-actions';
import { AgentIcon } from '../icons';

/** Longest path drawn before the middle is elided. The panel is 560px wide. */
const PATH_CHARS = 34;

/**
 * The keycap the footer draws for End, read from the keymap rather than typed.
 */
const END_CHORD = keyDisplay('session.endFromAttention');

/**
 * Whether this key press is the keymap's End chord.
 *
 * It is compared against the accelerator the keymap holds rather than against
 * a hand written pair of conditions, so moving the chord in `keymap.ts` moves
 * it here too. Only the four modifiers and the key name are compared, which is
 * every part an accelerator has.
 */
export function matchesEndChord(e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): boolean {
  const want = accelerator('session.endFromAttention').split('+');
  const key = want[want.length - 1] ?? '';
  const mods = new Set(want.slice(0, -1));
  return (
    e.key === key &&
    e.metaKey === mods.has('Cmd') &&
    e.ctrlKey === mods.has('Ctrl') &&
    e.altKey === mods.has('Alt') &&
    e.shiftKey === mods.has('Shift')
  );
}

/**
 * The folder this session runs in, as a person reads it.
 *
 * `displayPath` folds this Mac's home folder to `~` and leaves a path on
 * another machine exactly as that machine states it, which is the rule Phase
 * 90.3 set. The middle is elided rather than the tail, because the tail is the
 * folder's own name and it is the half that tells two rows apart.
 */
export function attentionPathText(session: Session): string {
  return truncateMiddle(
    displayPath(session.projectPath, session.machine?.id),
    PATH_CHARS
  );
}

/**
 * The row's accessible name, and its pointer tooltip.
 *
 * The path is NOT elided here. The drawn path can lose its middle to the
 * panel's width, and this sentence is where the whole of it stays readable.
 *
 * PHASE 311's FIX ROUND put the question here for the same reason. The verifier
 * measured the drawn span at the shipped width: the panel is a fixed 560px, the
 * row spends it on the name and the whole untruncated folder path, and the line
 * beside them gets about 152px — roughly twenty characters of a question that
 * may be two hundred. The span tail-truncates with an ellipsis, which is the
 * right shape for a row and the wrong place to read a sentence, so the WHOLE of
 * it is reachable here, on hover and to a screen reader, exactly as the whole
 * path already is. The separator is Tortie's own ` · ` and no new word is
 * introduced.
 *
 * The other repair — letting the path elide so the question could have its
 * space — was NOT taken: `attentionPathText` elides the path's MIDDLE on
 * purpose, because "the tail is the folder's own name and it is the half that
 * tells two rows apart", and a CSS ellipsis would take that tail from every row
 * drawn today, question or no question.
 */
export function attentionRowLabel(session: Session, question = ''): string {
  const where = displayPath(session.projectPath, session.machine?.id);
  const machine = session.machine;
  const base =
    machine === undefined
      ? `${session.name} in ${where}`
      : `${session.name} in ${where} on ${machine.label}`;
  return question === '' ? base : `${base} · ${question}`;
}

/**
 * One row's drawn contents.
 *
 * Separated from the panel so a test can read it. The vitest environment is
 * node and zustand answers a server render from its INITIAL state, so a
 * rendered panel draws the closed shape whatever a test puts in the store.
 * This takes everything it draws as a prop, exactly as the home screen's
 * recent row does, so the markup a test reads is the markup a person sees.
 */
export function AttentionRowBody({
  session,
  excerpt,
  question = '',
  age
}: {
  session: Session;
  excerpt: string;
  /**
   * PHASE 312. What the agent is asking, as main composed it out of the hook's
   * own words and the screen's reading (`src/main/activity/question.ts`), or
   * nothing.
   *
   * IT IS DRAWN IN THE EXCERPT'S OWN CELL, not beside it, and that is a trade
   * rather than an oversight. The row has exactly one cell for what the session
   * is saying; the panel is 560px wide and a seventh cell would take width from
   * the folder and the name, which Phase 93 put there because a session with no
   * tab is the one a person most needs named. The two strings come off the SAME
   * channel, redacted and capped the same way, and where both exist the question
   * is the better one: a blocked session's last screen line is usually the hint
   * row drawn UNDER the question. Absent, the cell draws what it has always
   * drawn.
   */
  question?: string;
  age: string;
}): React.JSX.Element {
  const line = question === '' ? excerpt : question;
  return (
    <>
      <span className="dot dot-attention" />
      <AgentIcon agent={session.agent} size={16} className="attention-agent" />
      <span className="attention-session">{session.name}</span>
      {session.machine === undefined ? null : (
        <span className="attention-machine">{session.machine.label}</span>
      )}
      <span className="attention-path">{attentionPathText(session)}</span>
      <span
        className="attention-excerpt"
        data-question={question === '' ? undefined : true}
      >
        {line}
      </span>
      <span className="attention-age num">{age}</span>
    </>
  );
}

export function AttentionOverlay(): React.JSX.Element | null {
  const open = useApp((s) => s.attentionOpen);
  const setOpen = useApp((s) => s.setAttentionOpen);
  const sessions = useApp((s) => s.sessions);
  const attentionSince = useApp((s) => s.attentionSince);
  const excerpts = useApp((s) => s.excerpts);
  // PHASE 312. The one composed question per session, for the cell below.
  const questions = useApp((s) => s.questions);
  const setMenu = useApp((s) => s.setMenu);
  // PHASE 93. Ending a session from a row is confirm gated, and the panel stays
  // open behind that confirm so the person can see which row they are acting
  // on. Reading the confirm here is what pays for that promise; see the two
  // effects and the `under-confirm` class below.
  const confirming = useApp((s) => s.confirm !== null);
  const now = useNow(10_000);

  const rows = useMemo<Session[]>(
    () =>
      sessions
        .filter((x) => effectiveStatusOf(x) === 'needs_input')
        .sort(
          (a, b) =>
            (attentionSince[b.id] ?? b.createdAt) -
            (attentionSince[a.id] ?? a.createdAt)
        ),
    [sessions, attentionSince]
  );

  const [selected, setSelected] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (open) setSelected(0);
  }, [open]);

  // PHASE 93. Ending the last row in the list removes it while the panel is
  // still open, and a selection past the end selects nothing at all.
  useEffect(() => {
    setSelected((i) => Math.min(i, Math.max(0, rows.length - 1)));
  }, [rows.length]);

  // PHASE 93. The confirm takes the keyboard and does not give it back, so
  // after it closes the panel is on screen with focus on nothing and ↑↓, ↩ and
  // Esc all do nothing. Put the keyboard back on the row the person was on.
  useEffect(() => {
    if (confirming) {
      wasConfirming.current = true;
      return;
    }
    if (!wasConfirming.current) return;
    wasConfirming.current = false;
    const frame = requestAnimationFrame(() => {
      const list =
        panelRef.current?.querySelectorAll<HTMLElement>('.attention-row');
      if (list === undefined || list.length === 0) return;
      list[Math.min(selected, list.length - 1)]?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [confirming, selected]);

  if (!open) return null;

  /**
   * PHASE 93. The panel closes only when the jump landed. A jump that could not
   * reach the folder says so in a toast and leaves the row on screen, still
   * selected, so ⌘⌫ can end the session that could not be reached.
   */
  const jump = (session: Session): void => {
    void jumpToSession(session.id).then((result) => {
      if (result.ok) setOpen(false);
    });
  };

  const under = confirming ? ' under-confirm' : '';

  return (
    <>
      <div
        className={`attention-backdrop${under}`}
        onMouseDown={() => {
          if (!confirming) setOpen(false);
        }}
      />
      <div
        ref={panelRef}
        className={`attention-panel${under}`}
        role="dialog"
        aria-label="Sessions that need input"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelected((i) => Math.min(i + 1, rows.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelected((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const row = rows[selected];
            if (row) jump(row);
          } else if (matchesEndChord(e)) {
            // PHASE 93. The same verb the × on every other session surface
            // runs: a confirmed End for a live session, a confirmed Remove for
            // an ended one. Nothing about ending a session is written here.
            e.preventDefault();
            const row = rows[selected];
            if (row) closeSession(row);
          } else if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      >
        {rows.length === 0 ? (
          <div className="attention-empty">
            Nothing needs you — all agents are working or idle.
          </div>
        ) : (
          <>
            <div className="attention-header">
              Needs your input ({rows.length})
            </div>
            <div role="listbox" aria-label="Sessions">
              {rows.map((session, i) => (
                <button
                  key={session.id}
                  type="button"
                  role="option"
                  aria-selected={i === selected}
                  aria-label={attentionRowLabel(
                    session,
                    questions[session.id] ?? ''
                  )}
                  title={attentionRowLabel(
                    session,
                    questions[session.id] ?? ''
                  )}
                  className={`attention-row${i === selected ? ' selected' : ''}`}
                  autoFocus={i === 0}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => jump(session)}
                  onContextMenu={(e) => {
                    // PHASE 93. The session menu every other surface opens,
                    // through the store's one choke point, so this row can
                    // never grow a menu of its own.
                    e.preventDefault();
                    setSelected(i);
                    setMenu({
                      x: e.clientX,
                      y: e.clientY,
                      items: sessionMenuItems(session, session.id)
                    });
                  }}
                >
                  <AttentionRowBody
                    session={session}
                    excerpt={excerpts[session.id] ?? ''}
                    question={questions[session.id] ?? ''}
                    age={formatAge(
                      attentionSince[session.id] ?? session.createdAt,
                      now
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="attention-footer">
              <span className="key">↩</span> jump to session
              <span className="key">{END_CHORD}</span> end session
              <span className="key">Esc</span> close
            </div>
          </>
        )}
      </div>
    </>
  );
}
