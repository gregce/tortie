/**
 * Putting references into a session's prompt.
 *
 * Preferred path: the live xterm instance.
 *  - `term.paste()` wraps in ESC[200~ … ESC[201~ only when the remote side
 *    enabled DECSET 2004, which tmux's attach client always does; tmux then
 *    strips the markers for a plain shell and forwards them to an agent in
 *    paste mode. So one call is correct for both kinds of pane, and nobody
 *    ever sees a literal `[200~` (research 16 §1.1–1.3).
 *  - both `paste()` and `input()` fire onData, which is where TerminalPane
 *    notes the input for main's activity monitor, so the drop answers a
 *    pending prompt instead of leaving it flagged (§1.5, and CLAUDE.md's rule
 *    that the user's own input may never raise that status).
 *  - onData is ALSO where TerminalPane hands the bytes to
 *    `ScrollSurface.sendInput` — the 12.3 cancel-copy-mode-then-write helper.
 *    So a drop onto a SCROLLED pane returns it to live output first and
 *    queues the write behind that, for free and through the one shared path;
 *    there is deliberately no copy-mode logic in this module to go stale.
 *    (TerminalPane.tsx: `term.onData(d => { noteTerminalInput(); scroll.sendInput(d) })`.)
 *
 * Fallback path, for a pane whose terminal has not registered itself: write
 * the same bytes through the term bridge and call `noteTerminalInput` by
 * hand, so the self-inflicted-input guarantee still holds. tmux's attach client
 * enables DECSET 2004 unconditionally (VERIFIED), so the markers we write are
 * byte-identical to xterm's — but xterm's version tracks the pane's real mode,
 * which is why it stays the preferred path. A DROP can never reach it: every
 * `[data-split-leaf]` the router can hit-test mounts a TerminalPane
 * (TerminalHost mounts panes only for visible sessions, and SplitSurface
 * mounts one per leaf), and a leaf whose session has ended is refused by
 * `paneAccepts` before this module is reached. The fallback exists for
 * programmatic callers, and it is the one write in the drop feature that does
 * not pass through the scroll surface.
 *
 * ONE PASTE PER FILE, always: Codex matches at most one path per paste, and
 * Claude reorders prose that shares a paste with a path. Multiple files are
 * separated by a typed space with a small gap between pastes so two bracketed
 * runs cannot arrive in one read.
 *
 * The caret is never repositioned — the agent's own line editor places the
 * text, which is what makes "insert at the cursor" work mid-sentence.
 */

import type { AgentImageDrop } from '@shared/types';
import { useApp } from '../../state/store';
import { getTerminal } from './registry';

/** Gap between consecutive pastes (research 16 §3; two files verified). */
const INTER_PASTE_MS = 80;

/** References beyond this are dropped rather than typed into someone's prompt. */
export const MAX_REFERENCES = 8;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

/** Bytes → pty, without xterm. Keeps the status detector's suppression window. */
function sendDirect(sessionId: string, data: string): boolean {
  const bridge = window.gmux?.term;
  if (!bridge) return false;
  useApp.getState().noteTerminalInput(sessionId);
  bridge.sendInput(sessionId, data);
  return true;
}

/** Send one chunk as a bracketed paste (or as plain typed text). */
function send(sessionId: string, data: string, asPaste: boolean): boolean {
  const term = getTerminal(sessionId);
  if (term) {
    if (asPaste) term.paste(data);
    else term.input(data);
    return true;
  }
  return sendDirect(sessionId, asPaste ? `\x1b[200~${data}\x1b[201~` : data);
}

/** True when this session can currently receive input at all. */
export function canInsert(sessionId: string): boolean {
  return getTerminal(sessionId) !== null || window.gmux?.term !== undefined;
}

/**
 * ONE bracketed paste of one block, for a programmatic caller (Phase 64).
 *
 * The one-paste-per-file rule above governs REFERENCES, being paths that an
 * agent turns into attachment chips, and it is why `insertReferences` loops.
 * A composed block is not that. It is prose that happens to contain paths and
 * it is meant to read as literal text, so codex degrading prose-plus-path to
 * literal text is the outcome that is wanted here rather than a defect.
 * Chunking it would put the block into the prompt in pieces that an agent's
 * line editor is free to reorder, so it goes in one call and neither
 * INTER_PASTE_MS nor MAX_REFERENCES applies to it.
 *
 * IT REFUSES A PANE WITH NO LIVE TERMINAL rather than falling back to
 * `sendDirect`. The fallback exists for programmatic callers and this is one,
 * so the refusal is a decision rather than an inheritance: `sendDirect` writes
 * through the bridge and therefore around the Phase 67 guard that drops
 * everything while a session reads `unknown`, and a block of text that reaches
 * an agent Tortie could not see the state of is exactly what this phase must
 * not do. A pane with no registered terminal is also a pane that is not on
 * screen, because TerminalHost mounts one only for a visible session, so the
 * refusal costs a person nothing they can see.
 *
 * Newlines: xterm replaces every `\r?\n` with a CR before it wraps the text
 * in the brackets (verified in this tree at node_modules/@xterm/xterm/lib/
 * xterm.js module 7861, `i(e){return e.replace(/\r?\n/g,"\r")}`). An agent
 * that honours bracketed paste treats that CR as a line break. An agent that
 * does not honour it submits, which is why the caller measures per agent.
 *
 * IT DELIBERATELY DOES NOT READ `AgentImageDrop.insert`, and the fix round
 * settled this rather than leaving it to look like an oversight. That field
 * has one non default value in the whole registry, `type` for antigravity,
 * because a bracketed PATH opens a completion popup there that swallows the
 * next keystroke. `insertReferences` below honours it and is right to.
 *
 * A composed block is the opposite case on both counts. Phase 64's charter
 * refuses typed keystrokes for the payload outright, and the measurement says
 * the same thing: typing a block means writing its embedded carriage returns
 * as keystrokes, and a bare CR submits the prompt on six of the ten agents
 * `src/shared/agent-defaults.ts` measured. Typing a fourteen line block at an
 * agent would start fourteen turns nobody asked for. So the one paste is the
 * only shape this may take, and an agent that mishandles it is a ROW IN THE
 * MATRIX rather than a branch here. deepseek is that row: measured 2026-08-27,
 * it takes every line, once and in order, and drops every line break, so a
 * payload arrives there as one paragraph. Typing would not have fixed that and
 * would have submitted it.
 */
export function insertBlock(sessionId: string, text: string): boolean {
  if (text.length === 0) return false;
  const term = getTerminal(sessionId);
  if (term === null) return false;
  term.focus();
  term.paste(text);
  return true;
}

/** Insert already-escaped reference text, one paste per reference. */
export async function insertReferences(
  sessionId: string,
  refs: string[],
  drop: AgentImageDrop
): Promise<boolean> {
  if (refs.length === 0) return false;
  getTerminal(sessionId)?.focus();
  let sent = false;
  for (const [i, ref] of refs.entries()) {
    if (i > 0) send(sessionId, ' ', false);
    // 'type' exists for antigravity alone: a bracketed paste opens a
    // completion popup there that swallows the next keystroke.
    sent = send(sessionId, ref, drop.insert !== 'type') || sent;
    if (i < refs.length - 1) await delay(INTER_PASTE_MS);
  }
  return sent;
}

/**
 * Forward ⌘V (0x16) to the pane so the AGENT reads the system pasteboard
 * itself. Used only for `clipboard-attach` agents on a real ⌘V, where the
 * image is already on the pasteboard: no Electron clipboard write, no temp
 * file, nothing of the user's clipboard clobbered. tmux does not bind C-v,
 * so the byte reaches the agent intact.
 */
export function forwardClipboardPaste(sessionId: string): boolean {
  getTerminal(sessionId)?.focus();
  return send(sessionId, '\x16', false);
}
