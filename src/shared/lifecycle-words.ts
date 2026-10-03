/**
 * The words a person reads before and after a session is ended, said once for
 * every process that says them (Phase 317, moved here from
 * src/renderer/state/resume.ts and src/renderer/session-manager/copy.ts).
 *
 * WHY THEY MOVED. The phone draws the Mac's own confirmation for a session,
 * word for word, and the door composes it in main over main's own row
 * (`endConfirm`, build/p317/SPEC.md D9 and D10). Main cannot import the
 * renderer, so the one definition of each sentence moves below both. Every
 * line below is the one those two files carried at 551312f7, byte for byte.
 * The renderer's two words modules re-export what they exported, so the sheet,
 * the menus and their tests read these through the doors their domains have
 * always read, and nothing a person sees on the Mac changes.
 *
 * Two sentences are new, both for the door: `SESSION_NOT_FOUND`, the verb's
 * own words spelled once more for an id nothing holds, and `END_FAILED`, for an
 * End that threw something none of these sentences describe. A test holds the
 * first equal to the three places main throws it, read as text, and holds
 * `LIFECYCLE_SESSION_CHANGED` equal to the session manager's `SESSION_CHANGED`,
 * which is a second spelling of the same sentence that stays where it is.
 *
 * Pure: it reads the row it is handed and nothing else, and imports `./types`
 * alone.
 */

import type { Session } from './types';

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
 * What an End or a Remove confirmation needs. The shape of `BareRecoveryConfirm`
 * in src/renderer/state/resume.ts.
 */
export interface LifecycleConfirm {
  title: string;
  body: string;
  confirmLabel: string;
}

/**
 * The words a person reads before a session ends. MOVED in Phase 293 from
 * `endSession` in src/renderer/state/sessions-slice.ts to resume.ts, and in
 * Phase 317 from there to here, byte for byte both times, so the stacked
 * confirm every other surface raises, the panel the sheet draws under a row
 * and the phone's confirm cannot say three things. `end-remote-copy.test.ts`
 * pins the sentences through the store and was touched by neither move.
 *
 * Phase 26.3 — the old body promised "its scrollback will be discarded. This
 * cannot be undone", and both halves stopped being true once manual end writes
 * a snapshot capsule and keeps the manifest row, so the session can be
 * restored. The first sentence keeps the one fact that IS irreversible in front
 * of the user: the running process dies and does not resume mid-task. "First"
 * is the Phase 19 ordering promise (main captures before it kills); main's
 * capture-failure notice is what keeps that word honest on a full disk.
 *
 * PHASE 84, item 2. A session on another machine gets its own body, and it is
 * read from `session.machine`, which the projection already carries. The old
 * body was false twice for such a session. It promised a copy that main never
 * took, and it promised a restore that brings the conversation back, which no
 * remote restore did. Main now takes the copy before it kills anything, so
 * "first" is true.
 *
 * PHASE 89 CHANGED THE LAST SENTENCE, because it said flatly that the
 * conversation does not come back and that is no longer true for every row. A
 * remote restore now types the command that continues the conversation for a
 * row two answers prove, being the arming gate in main's
 * `machines/resume-arming.ts` and the composer in `machines/remote-arm.ts`. THE
 * RENDERER CANNOT KNOW WHICH ROW THAT IS. Both answers are read at restore
 * time, one of them against the machine itself, and the projection for a remote
 * session carries neither `resumeCapture` nor `resumeArgv`. So the sentence
 * says what is true of every row and promises nothing about this one.
 */
export function endSessionConfirm(session: Session): LifecycleConfirm {
  const machine = session.machine;
  const resumable = resumeReadiness(session) === 'conversation';
  return {
    title: `End '${session.name}'?`,
    body:
      machine !== undefined
        ? `This stops what is running in it on ${machine.label}. Tortie saves a copy of what it printed first, so you can read that copy here afterwards. Bringing it back always returns the folder, and it returns the conversation only when Tortie recorded one for this agent.`
        : resumable
          ? 'This stops what is running in it. The scrollback and the conversation are saved first, so you can restore this session later.'
          : 'This stops what is running in it. The scrollback is saved first, so you can restore this session later.',
    confirmLabel: 'End session'
  };
}

/**
 * The words a person reads before a session is removed. Moved the same way.
 *
 * Phase 29. Remove is reversible now (main writes a tombstone behind the same
 * sessions:discard channel), so the body names the way back instead of
 * promising a loss that no longer happens.
 */
export function removeSessionConfirm(session: Session): LifecycleConfirm {
  return {
    title: `Remove '${session.name}'?`,
    body: 'It moves to Past Sessions and you can restore it from there.',
    confirmLabel: 'Remove'
  };
}

/**
 * What a `*Now` verb answers when the row it was handed an id for is gone, or
 * no longer offers the verb.
 *
 * Every `*Now` verb re-reads its row by id and asks the verb's own gate before
 * it reaches the bridge. The sheet asks the same question a moment earlier and
 * says these same words in a toast, so this is the answer of the second lock
 * rather than a second sentence: whichever of the two refuses, a person reads
 * one thing.
 */
export const LIFECYCLE_SESSION_CHANGED =
  'This session changed. Nothing was done.';

/**
 * Why `End session…` is off on a row Tortie cannot see. The study says the
 * MACHINE is unreachable, which is false for a session on this Mac whose
 * session host stopped answering, so the sentence names the session.
 */
export const END_UNREACHABLE_TITLE =
  'Tortie cannot see whether this session is running, so it cannot end it.';

/** The verb's own words for an id nothing holds (`core.ts:3794`), spelled once more here for the door. */
export const SESSION_NOT_FOUND = 'Session not found.';
/** The End that was asked for and threw something that is not one of the sentences above. */
export const END_FAILED = 'Tortie could not end this session.';
