/**
 * WHICH SESSIONS THE PHONE MAY REPLY TO, BEFORE ANYTHING IS READ (Phase 318,
 * build/p318/SPEC.md §5.4.1, D21).
 *
 * A press needs a session waiting on a question; a message needs one that is
 * not. Both need Claude Code or Codex, on this Mac, with a live tmux id. These
 * are narrower than the shared gate's "live", which is End's, so they are
 * spelled once, here, and src/shared/session-gates.ts does not move.
 *
 * THE REMOTE AND AGENT ARM IS FIRST, so a row on another machine, a shell, and
 * every agent but the two measured are refused before any tmux call is composed
 * (`conformance:pocket` Y10). Nothing here reads a screen, a process or a file.
 *
 * PURE. It imports one type, logs nothing, and its one table is a frozen
 * literal no configuration reaches (refusal 5).
 */

import type { Session } from '@shared/types';

/** A press of a numbered option, or one message. */
export type ReplyKind = 'press' | 'say';

/** Why a session is not one the phone may reply to. */
export type ReplyGateRefusal = 'gone' | 'unpressable' | 'unsayable' | 'changed';

/** The only agents a press or a message reaches, each measured on its real screens (D11, D14). */
export const REPLY_AGENTS: readonly string[] = Object.freeze(['claude', 'codex']);

/** The agent of a session the reply may reach, or null. */
export function replyAgentOf(session: Session): 'claude' | 'codex' | null {
  return session.agent === 'claude' || session.agent === 'codex' ? session.agent : null;
}

/** Why a session is not one the phone may reply to, or null when it may (before any reading). */
export function replyGate(
  session: Session | undefined,
  kind: ReplyKind,
  tmuxId: string | null
): null | ReplyGateRefusal {
  if (session === undefined) return 'gone';
  if (session.machine !== undefined || !REPLY_AGENTS.includes(session.agent)) {
    return kind === 'press' ? 'unpressable' : 'unsayable';
  }
  if (kind === 'press') {
    if (session.status !== 'needs_input') return 'changed';
  } else if (session.status !== 'running' && session.status !== 'idle') {
    return 'unsayable';
  }
  if (tmuxId === null) return kind === 'press' ? 'changed' : 'unsayable';
  return null;
}
