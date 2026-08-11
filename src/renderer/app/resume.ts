/**
 * Resume honesty (Phase 13.5, docs/research/22-resume-audit.md §4).
 *
 * gmux's promise is that a session comes back WITH ITS CONVERSATION. Until
 * this phase only claude delivered it, and the user could not find that out
 * until AFTER a reboot had already thrown the conversation away — the two
 * places that knew (the restore panel's body copy and the post-restore toast)
 * both spoke too late.
 *
 * This module is the renderer's single reading of "what comes back". It does
 * not guess: the answer is `Session.resumeCapture`, the strategy main records
 * on the manifest row at spawn (src/main/ipc.ts resumeCaptureFor). The one
 * inference here is the documented fallback for rows written before that
 * field existed, which the field's own contract in src/shared/types.ts names:
 * derive it from `resumeArgv`.
 *
 * Tone is set by ZEN-OF-TORTIE: this is information, not an alarm. Coming
 * back to a directory is a legitimate outcome — it is the whole of what a
 * plain shell has — so nothing here is colored like an error, and §4.5 of the
 * audit binds the copy: no installed agent genuinely lacks resume, so a
 * "directory only" session is gmux's missing capture work and must never be
 * written as the agent's fault.
 */

import type { Session } from '@shared/types';
import { agentShortLabel } from '../state/agents';

/**
 * What this session brings back, as of now.
 *
 * - `conversation` — a validated id is recorded; the agent resumes the thread.
 * - `capturing`    — the agent only reveals its id after the fact and gmux is
 *                    watching its store. Reads as "directory only" to the
 *                    user, because that is what a reboot RIGHT NOW would
 *                    give them; it differs only in being fixable by sending
 *                    the session a message.
 * - `directory`    — gmux has no id: no capture route, or the harvest gave
 *                    up. Directory and scrollback come back; the thread does
 *                    not.
 * - `none`         — nothing to resume (a plain shell). Not a shortfall, and
 *                    deliberately unmarked in the UI.
 */
export type ResumeReadiness = 'conversation' | 'capturing' | 'directory' | 'none';

/** Sessions carry more agent ids at runtime than the frozen AgentKind union. */
function agentId(session: Pick<Session, 'agent'>): string {
  return session.agent;
}

export function resumeReadiness(
  session: Pick<Session, 'agent' | 'resumeArgv' | 'resumeCapture'>
): ResumeReadiness {
  const armed = (session.resumeArgv?.length ?? 0) > 0;
  switch (session.resumeCapture) {
    case 'armed':
      // Trust main's strategy, but an "armed" row with no argv has nothing to
      // type into the pane — say what the user would actually get.
      return armed ? 'conversation' : 'directory';
    case 'capturing':
      return 'capturing';
    case 'unavailable':
      return 'directory';
    case 'none':
      return 'none';
    default:
      break;
  }
  // Pre-13.5 rows carry no strategy; the recorded argv is the only evidence.
  if (armed) return 'conversation';
  return agentId(session) === 'shell' ? 'none' : 'directory';
}

/**
 * The one-word mark shown beside a session's status dot, or null when there
 * is nothing worth saying. Only the EXCEPTION is marked: an armed session is
 * the promise being kept and needs no decoration, and a shell has no
 * conversation to lose. That keeps the mark rare enough to mean something.
 */
export function resumeMarkLabel(readiness: ResumeReadiness): string | null {
  switch (readiness) {
    case 'capturing':
      return 'no conversation id yet';
    case 'directory':
      return 'directory only';
    case 'conversation':
    case 'none':
      return null;
  }
}

/**
 * WHY this session has no conversation to come back to, as a clause that
 * completes "…, so a restart brings back the directory". Audit §4.4: name
 * the agent and the reason, because "no resume available" teaches nothing —
 * "pi writes its id on the first message" is something the user can act on.
 * Null for the two states that need no excuse.
 */
function resumeReason(
  session: Pick<Session, 'agent' | 'resumeArgv' | 'resumeCapture'>
): string | null {
  const id = agentId(session);
  const label = agentShortLabel(id);
  switch (resumeReadiness(session)) {
    case 'capturing':
      return (
        `${label} only writes a conversation id once the session has had ` +
        'its first message'
      );
    case 'directory':
      if (id === 'antigravity') {
        return `nothing on disk ties an ${label} conversation to a directory`;
      }
      if (id === 'droid') {
        return `gmux has no verified way to resume ${label} yet`;
      }
      // Audit §4.4: name the repair, not just the shortfall. "gmux never
      // captured a conversation id" was true and useless — it is what the
      // user's own pi-1 and pi1 rows said, and it left them with no idea that
      // the fix is to start the session again. Every installed agent has a
      // working resume and gmux arms it at launch now, so the honest,
      // actionable version of this state is "this one is too old to repair".
      return (
        'gmux never recorded a conversation id for this session and can no ' +
        `longer find one; a new ${label} session in this folder is armed ` +
        'from the moment it starts'
      );
    case 'conversation':
    case 'none':
      return null;
  }
}

/**
 * The sentence appended to a session's tooltip on every surface — the layer
 * where the user reads the detail behind the mark.
 */
export function resumeNote(
  session: Pick<Session, 'agent' | 'resumeArgv' | 'resumeCapture'>
): string | null {
  const readiness = resumeReadiness(session);
  if (readiness === 'conversation') {
    return 'Its conversation comes back after a restart.';
  }
  const reason = resumeReason(session);
  if (reason === null) return null;
  // The consequence leads and the reason follows, so the sentence never has
  // to capitalize its first word — "gmux" is lowercase always (PRODUCT.md
  // brand commitments), and a sentence starting with it would break that.
  return (
    'A restart brings back the directory and its scrollback, not the ' +
    `conversation — ${reason}.`
  );
}

/**
 * The restore bar's line (audit §4.3): state the split BEFORE the user acts,
 * not in the toast after each one lands.
 */
export function restoreSummary(sessions: readonly Session[]): string {
  const total = sessions.length;
  const armed = sessions.filter(
    (x) => resumeReadiness(x) === 'conversation'
  ).length;
  const rest = total - armed;
  const head = `${total} saved sessions`;
  if (armed === 0) return `${head} — none has a conversation to resume`;
  if (rest === 0) return `${head} — all will resume their conversation`;
  return (
    `${head} — ${armed} will resume ${armed === 1 ? 'its' : 'their'} ` +
    `conversation, ${rest} ${rest === 1 ? 'returns to its' : 'return to their'} ` +
    'directory'
  );
}

/**
 * Body copy for the "Ready to restore" state — the honest version of the
 * armed/not-armed branch that used to be the ONLY place this was said.
 */
export function restoreActionCopy(session: Session): string {
  if (resumeReadiness(session) === 'conversation') {
    return (
      'Restore brings back its saved scrollback and types the resume ' +
      'command for you — nothing runs until you press Enter.'
    );
  }
  const folder =
    'Restore reopens it in the same directory with its saved scrollback ' +
    'above a fresh prompt.';
  const reason = resumeReason(session);
  // A plain shell had no conversation to lose, so it gets no apology.
  if (reason === null) return folder;
  return `${folder} The conversation itself will not come back — ${reason}.`;
}
