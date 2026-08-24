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

import type { Session, SessionStatus } from '@shared/types';
import { agentShortLabel } from './agents';

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
        return `Tortie has no verified way to resume ${label} yet`;
      }
      // Audit §4.4: name the repair, not just the shortfall. "gmux never
      // captured a conversation id" was true and useless — it is what the
      // user's own pi-1 and pi1 rows said, and it left them with no idea that
      // the fix is to start the session again. Every installed agent has a
      // working resume and gmux arms it at launch now, so the honest,
      // actionable version of this state is "this one is too old to repair".
      return (
        'Tortie never recorded a conversation id for this session and can no ' +
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
 *
 * PHASE 141 gives it a second argument, and the reason is that the sentence it
 * used to return without one was true and pointed a person at the wrong thing.
 * "Its conversation comes back after a restart" is correct for a session whose
 * agent has just left, and useless, because that conversation is one press
 * away in the session they are looking at rather than a restart away. When the
 * caller has a handback record for the row, its sentence wins.
 *
 * The argument is optional because four surfaces call this and only two of
 * them hold the record. A caller with no record reads exactly what it read
 * before this phase.
 *
 * THE RECORD ALONE DOES NOT WIN THE SLOT (fix round). markLeft publishes
 * 'left' on every witnessed drop of a non shell agent, including agents that
 * hand Tortie no conversation id, so a record can sit on a row with nothing
 * to resume. The judge is the same predicate that draws the verb,
 * `showsResumeVerb` below, so this sentence can never disagree with the word
 * on the row. The 'left' sentence names Resume, so it shows only while the
 * verb is actually offered. The other two claim a conversation is held, so
 * they need the row shape the verb needs, and they keep showing while
 * something runs because something running is exactly what they describe. A
 * refused row reads what it read before any handback existed.
 */
export function resumeNote(
  session: Pick<
    Session,
    | 'agent'
    | 'machine'
    | 'status'
    | 'agentSessionId'
    | 'resumeArgv'
    | 'resumeCapture'
  >,
  handback?: SessionHandback | undefined
): string | null {
  if (handback !== undefined) {
    const honest =
      handback.state === 'left'
        ? showsResumeVerb(session, handback, session.status)
        : holdsResumableConversation(session);
    if (honest) return handbackNote(handback);
  }
  const readiness = resumeReadiness(session);
  if (readiness === 'conversation') {
    return 'Its conversation comes back after a restart.';
  }
  const reason = resumeReason(session);
  if (reason === null) return null;
  // The consequence leads and the reason follows: the reason is a fragment,
  // not a sentence, and reads as one clause of the tooltip rather than a
  // second sentence starting mid-thought.
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
 * Phase 26.3, the material rule. An ended session offers Restore only when
 * something exists to bring back. Material means a saved scrollback capsule
 * (main projects `hasSavedScrollback` from the snapshot store) or an armed
 * resume command. An exited row with neither offers only Restart and Remove,
 * because restoring it would produce an empty shell and the verb would lie.
 * Main accepts a restore for any exited row without checking material, since
 * the restore machinery is already honest about missing pieces; this renderer
 * gate exists to keep the offered verb truthful.
 */
export function hasRestoreMaterial(session: Session): boolean {
  return (
    session.hasSavedScrollback === true ||
    (session.resumeArgv?.length ?? 0) > 0
  );
}

/**
 * The sentence a Restore control carries while Tortie is still waiting for
 * the login shell to say where the person's tools are installed. Phase 81.
 *
 * Two sentences. The first says what Tortie is doing, in words with no jargon
 * in them. The second says when the control comes back. It does not say
 * "PATH", because a tooltip is not the place to teach a term, and the log
 * line and the fallback notice both name it properly for anyone who needs it.
 *
 * One string, read by four controls, so the four cannot drift. The native
 * session menu's Restore item takes no tooltip at all: a native menu carries
 * none, and a greyed item for about one second is better than an item that
 * does nothing.
 */
export const SHELL_PATH_PENDING_TITLE =
  'Tortie is still asking your shell where your tools are installed. ' +
  'Restore turns on as soon as the answer arrives.';

/**
 * Body copy for an exited session that offers Restore (Phase 26.3). The verb
 * copy says what comes back and names what does not: the process that was
 * killed stays gone, so nobody expects a stopped build to resume mid-compile.
 * The full-window ended surface renders this as body text; splits are too
 * narrow for body copy and carry the sentence in the Restore tooltip instead.
 */
export function restoreExitedCopy(session: Session): string {
  if ((session.resumeArgv?.length ?? 0) > 0) {
    return (
      'Restore brings back the saved scrollback and arms the resume ' +
      'command. It does not bring back what was running when the session ' +
      'ended. Restart opens a fresh session with the same name and directory.'
    );
  }
  return (
    'Restore reopens the saved scrollback in the same directory. Restart ' +
    'opens a fresh session with the same name and directory.'
  );
}

/**
 * Phase 29 (research 39 section 10). The Past Sessions promise line, decided
 * BEFORE the click from the row's own fields: both an agent conversation id
 * and an armed resume argv means the restore continues the conversation,
 * anything less starts fresh. Deliberately not resumeReadiness: 'capturing'
 * cannot exist on a removed row (the watch is cancelled at remove), and the
 * research fixed this two field predicate as the honest disclosure.
 */
export function pastSessionPromise(
  session: Pick<Session, 'agentSessionId' | 'resumeArgv'>
): 'continues' | 'fresh' {
  return session.agentSessionId !== undefined &&
    (session.resumeArgv?.length ?? 0) > 0
    ? 'continues'
    : 'fresh';
}

/**
 * Phase 60. Whether restoring this past session must ask first. It must ask
 * exactly when its project is not one of the open project tabs. Pure so the
 * test can hold it; the store passes the live projects list.
 */
export function pastRestoreNeedsAsk(
  session: Pick<Session, 'projectPath'>,
  openProjectPaths: readonly string[]
): boolean {
  return !openProjectPaths.includes(session.projectPath);
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

// ---------------------------------------------------------------------------
// Phase 119 — decline capture on restore, the insurance verb.
//
// A captured session is launched under SpecStory, so its recorded resume
// command names the SpecStory binary first and the agent after it. When that
// wrapper cannot run, the session's conversation is locked behind a program
// that is not the agent. Phase 115 fixed the wrapper that was broken, and the
// binary on disk works today. This verb is what a person reaches for the NEXT
// time a wrapper breaks: bring the session back with SpecStory turned off.
//
// Everything a person reads about that choice is written here, in one place,
// because two surfaces offer it. The full-window ended card offers the restore
// half as a button. The native session context menu offers both halves as
// rows. A drifted sentence between the two would be a second answer to the
// same question.
//
// Tone follows the rest of this module. Nothing below says or implies that
// something is broken right now, and nothing is coloured as an error. The
// choice is durable and Tortie offers no way back, so the confirm says that
// plainly before the person presses the button.
// ---------------------------------------------------------------------------

/**
 * Whether this session may be brought back without SpecStory.
 *
 * Three facts, all read from the row itself.
 *
 *  - It runs on this Mac. A session on another machine is never captured,
 *    because Phase 91 refuses capture on a machine, so the verb would have
 *    nothing to decline.
 *  - It is captured. `session.capture` is set by main's projection only while
 *    the row's capture record is enabled, so the verb disappears by itself the
 *    moment the choice is made. That disappearance is the feedback that the
 *    choice took, and it needs no extra state in the renderer.
 *  - It has ended. There is nothing to restore or restart while it runs.
 *
 * One predicate, exported once, read by both surfaces so they cannot drift.
 */
export function offersBareRecovery(session: Session): boolean {
  return (
    session.machine === undefined &&
    session.capture !== undefined &&
    (session.status === 'exited' || session.status === 'restorable')
  );
}

/**
 * The card note, drawn under the ended card's body copy when the bare verb is
 * offered. Three sentences and one thing in each of them. It states no urgency
 * and it names no failure, because nothing has failed.
 */
export const BARE_RECOVERY_NOTE =
  'This session saves its history with SpecStory. You can bring it back ' +
  'without that. The conversation still comes back and Tortie stops saving ' +
  "this session's history.";

/** The label both surfaces use for the declined restore. */
export const BARE_RESTORE_LABEL = 'Restore without saving history';

/**
 * The grey second line under the native menu row. A native menu carries no
 * tooltip, so this slot is the only room the menu has for prose.
 */
export const BARE_RESTORE_SUBLABEL =
  'The conversation comes back. SpecStory stops saving this session.';

/** The label the native menu uses for the declined restart. */
export const BARE_RESTART_LABEL = 'Restart without saving history';

/** The grey second line under that row. */
export const BARE_RESTART_SUBLABEL =
  'A fresh session with the same name and directory, and no saving.';

/** What a confirm dialog needs. Shaped for the store's `setConfirm`. */
export interface BareRecoveryConfirm {
  title: string;
  body: string;
  confirmLabel: string;
}

/**
 * The confirm shown before a declined restore.
 *
 * It is confirmed because the choice is durable and Tortie offers no way to
 * turn saving back on for this session. It is NOT marked destructive: nothing
 * on disk is deleted, and a red button would say otherwise.
 *
 * The body has two forms. A row with an armed resume command is told that the
 * command is armed and that pressing Enter runs it. A row without one is told
 * that nothing is armed, in its own sentence, rather than reading a hedge
 * inside a sentence about something else.
 */
export function bareRestoreConfirm(session: Session): BareRecoveryConfirm {
  const armed = (session.resumeArgv?.length ?? 0) > 0;
  const middle = armed
    ? 'It arms the command that continues the conversation, and you press ' +
      'Enter to run it.'
    : 'This session has no recorded command to continue its conversation, ' +
      'so nothing is armed for you to press Enter on.';
  return {
    title: `Restore '${session.name}' without saving history?`,
    confirmLabel: 'Restore',
    body:
      'Tortie brings back the saved output and the directory. ' +
      middle +
      " SpecStory stops saving this session's history to the project " +
      'folder. The history it already saved stays where it is. Tortie does ' +
      'not offer a way to turn saving back on for this session.'
  };
}

/**
 * The confirm shown before a declined restart. One body, because a restart
 * never brings a conversation back and there is no branch to draw.
 */
export function bareRestartConfirm(session: Session): BareRecoveryConfirm {
  return {
    title: `Restart '${session.name}' without saving history?`,
    confirmLabel: 'Restart',
    body:
      'Tortie starts a fresh session with the same name, the same directory ' +
      'and the same launch options. The conversation does not come back, ' +
      'which is what Restart always does. SpecStory does not save the new ' +
      "session's history. The history it already saved stays where it is."
  };
}

// ---------------------------------------------------------------------------
// PHASE 141 — the agent that left, and the one press back into it.
//
// A person starts an agent in a session, then ends the agent while the shell
// lives on, with Control C or the agent's own quit verb. The session is still
// there and its conversation is still on disk, so Tortie offers one word on
// that row, and choosing it puts the resume command on the prompt. The person
// presses Enter. Nothing starts on Tortie's initiative.
//
// EVERY SENTENCE BELOW IS BOUND BY ONE REFUSAL: none of them ever claims that
// an agent is running. Research 64 section 7.3 fixed that, because a card that
// says an agent is there when it is not is worse than a card that says nothing.
//
// This is copy and a small amount of reading, and it is deliberately NOT a
// status. Nothing here reaches `statusVisual`, nothing here reaches the dot,
// and no value below is ever a `SessionStatus`. Phase 23 refusal 5 says no
// mechanism outside session behaviour may set a status, and the way this phase
// keeps that promise is by travelling on its own field the whole way.
// ---------------------------------------------------------------------------

/**
 * What Tortie can currently say about a session whose agent left.
 *
 * - `left`        — the witnessed process went away and nothing has run in the
 *                   session since. This is the only state that offers the verb.
 * - `returning`   — something is running in the session again and Tortie has
 *                   not yet been told which conversation it is in.
 * - `unconfirmed` — something ran and named a conversation that is not the one
 *                   this row holds, so Tortie did not adopt it.
 *
 * Main reports `none` for a session in none of those states, and the renderer
 * holds no record at all for one, so `none` has no member here.
 */
export type HandbackState = 'left' | 'returning' | 'unconfirmed';

/** One session's handback record, as the renderer holds it. */
export interface SessionHandback {
  state: HandbackState;
  /**
   * Epoch ms of the moment the witnessed process went away, or 0 when Tortie
   * did not see the clock. The card names the time only when it has one.
   */
  leftAt: number;
}

/**
 * The four landings of a press, which are the four answers `decideArmLanding`
 * in src/main/machines/remote-arm.ts already produces. The union is re-typed
 * here rather than imported because a renderer file cannot import main.
 */
export type ResumeInPlaceLanding = 'armed' | 'twice' | 'absent' | 'unknown';

/** The word itself. One string, drawn by both row surfaces. */
export const RESUME_VERB = 'Resume';

/** The label the native menus use, on the row and in the menu bar. */
export const RESUME_IN_PLACE_LABEL = 'Resume conversation';

/**
 * The grey second line under the native menu row. A native menu carries no
 * tooltip, so this slot is the only room the menu has for prose, and it is the
 * slot `BARE_RESTORE_SUBLABEL` above already uses.
 *
 * It says where the command goes and who presses Enter, because those are the
 * two things a person needs to know before choosing it.
 */
export const RESUME_IN_PLACE_SUBLABEL =
  'The command goes on your prompt. You press Enter.';

/**
 * Whether this row holds a conversation Tortie could put back: it runs on
 * this Mac, a conversation id was harvested, and a resume command is
 * recorded. These are the three row refusals inside `showsResumeVerb`, split
 * out because `resumeNote` above asks the same question before it lets a
 * handback sentence claim a conversation is held. One reading, two surfaces,
 * so the tooltip and the word on the row can never disagree.
 */
function holdsResumableConversation(
  session: Pick<Session, 'machine' | 'agentSessionId' | 'resumeArgv'>
): boolean {
  if (session.machine !== undefined) return false;
  if (session.agentSessionId === undefined) return false;
  return (session.resumeArgv?.length ?? 0) > 0;
}

/**
 * Whether the verb is offered for this session, on the row and in both menus.
 *
 * ONE PREDICATE, READ BY EVERY SURFACE AND BY THE STORE'S OWN VERB, so the word
 * on the row, the row in the native menu and the row in the menu bar can never
 * disagree about whether the verb exists. It lives in this module rather than
 * beside the component because the sessions slice reads it too, and a state
 * module cannot import an app one.
 *
 * Five conditions, and each one is a refusal that matters.
 *
 *  - The row has a conversation to put back AND a command that carries it.
 *    Main refuses the press with `no-conversation` when the row records no
 *    conversation id, and with `not-composed` when there is no recorded resume
 *    command to type, so a row in either shape used to be offered a word that
 *    could only ever answer a refusal. Research 64 section 6 says droid's verb
 *    is not offered for exactly this reason, and every row whose id was never
 *    harvested is the same shape.
 *
 *  - The session runs on this Mac. A session on another machine has no local
 *    process table, so Tortie never witnessed a process for it and can never
 *    hold a record for one. `resumeMarkLabel` above already says nothing for
 *    every remote row for the same family of reasons.
 *  - Main says the agent left AND nothing has run since. `returning` and
 *    `unconfirmed` both mean something is running in that session, and typing
 *    into a session a program owns is how armed text reaches a program in raw
 *    mode. The word goes away for the length of whatever is running and comes
 *    back after, and Tortie says nothing about it either way.
 *  - The session is still alive. A session that has ended offers Restore, and
 *    the two can never appear together: Restore needs the session to be over
 *    and this needs it to be alive.
 *  - Tortie can currently see the session. An `unknown` row is one the session
 *    server did not answer for, and every verb that acts on the tmux side is
 *    withheld from it.
 *
 * NOTHING HERE READS THE SHAPE OF THE SESSION, and that is the whole design. A
 * session Tortie has just restored, sitting with its command armed and
 * unpressed, has an agent on its row, an armed resume command, a running
 * status and a login shell as its own program, which is byte for byte the shape
 * of a session whose agent left. The only thing that separates them is the
 * record, and main holds one only for a process it actually watched.
 */
export function showsResumeVerb(
  session: Pick<Session, 'machine' | 'agentSessionId' | 'resumeArgv'>,
  handback: SessionHandback | undefined,
  status: SessionStatus
): boolean {
  if (!holdsResumableConversation(session)) return false;
  if (handback?.state !== 'left') return false;
  return status !== 'exited' && status !== 'restorable' && status !== 'unknown';
}

/** The hover sentence on the word itself, for the pointer and the reader. */
export const RESUME_VERB_TITLE =
  'Put the command that continues this conversation on your prompt. ' +
  'You press Enter.';

/** A clock time in the person's own locale, or null when there is no time. */
function clockTime(epochMs: number): string | null {
  if (!Number.isFinite(epochMs) || epochMs <= 0) return null;
  try {
    return new Date(epochMs).toLocaleTimeString(undefined, {
      timeStyle: 'short'
    });
  } catch {
    // A build with no Intl data still gets the sentence, without the time.
    return null;
  }
}

/**
 * The card sentence for a session whose agent left, one of three.
 *
 * Research 64 section 7.3 wrote these three and the rule that binds them: only
 * ever one of them, and none of them ever says an agent is running.
 */
export function handbackNote(handback: SessionHandback): string {
  switch (handback.state) {
    case 'left': {
      const at = clockTime(handback.leftAt);
      const opened = at === null ? 'The agent left.' : `The agent left at ${at}.`;
      return (
        `${opened} Its conversation is still here, and Resume puts the ` +
        'command back on your prompt.'
      );
    }
    case 'returning':
      return (
        'Something is running here. Tortie is waiting to see which ' +
        'conversation it is.'
      );
    case 'unconfirmed':
      return (
        'A different conversation is open here. Tortie is still holding the ' +
        'one it saved.'
      );
  }
}

/**
 * What a person reads after choosing Resume, one sentence per landing.
 *
 * THESE ARE NEW SENTENCES AND NOT THE FOUR IN src/main/machines/remote-copy.ts,
 * and that is a refusal rather than duplication. Every one of those four says
 * "on that machine", because they were written for a session on another
 * computer. This session is on this Mac and in front of the person, so the
 * sentences say "this session" and name no machine at all.
 *
 * The split between `absent` and `unknown` is kept exactly as the remote ones
 * keep it: a screen Tortie READ and found nothing on is a different claim from
 * a screen Tortie could not read, and saying "it is not there" when nobody
 * looked is the shape of dishonesty the restore gate already took apart.
 */
export function resumeInPlaceNote(landing: ResumeInPlaceLanding): string {
  switch (landing) {
    case 'armed':
      return (
        'The command is on your prompt. Press Enter to bring the ' +
        'conversation back.'
      );
    case 'twice':
      return (
        'There are two copies of the command on the line. Nothing ran, ' +
        'because Tortie never presses Enter. Clear the line and choose ' +
        'Resume again.'
      );
    case 'absent':
      return (
        'Tortie typed the command and it is not on the screen. Nothing ran.'
      );
    case 'unknown':
      return (
        'Tortie typed the command and could not read the screen to check, ' +
        'so it cannot say whether the command is there. Nothing ran, because ' +
        'Tortie never presses Enter.'
      );
  }
}

/**
 * Whether a landing is good news. The store picks the toast kind from this
 * rather than re-deciding it beside each sentence.
 */
export function resumeInPlaceLanded(landing: ResumeInPlaceLanding): boolean {
  return landing === 'armed';
}

/**
 * Why Tortie typed nothing at all. The six tokens are the ones main answers
 * with, and they are re-typed here rather than imported because a renderer file
 * cannot import main. `npm run conformance:handback` reads this copy, the one
 * in src/shared/ipc/sessions.ts and the one in
 * src/main/sessions/resume-in-place.ts, and fails when any of the three drift.
 */
export type ResumeInPlaceRefusal =
  | 'not-dropped'
  | 'not-here'
  | 'no-conversation'
  | 'running'
  | 'agent-back'
  | 'not-composed';

/** The six tokens, as a list, so an answer can be checked against them. */
export const RESUME_IN_PLACE_REFUSALS: readonly ResumeInPlaceRefusal[] = [
  'not-dropped',
  'not-here',
  'no-conversation',
  'running',
  'agent-back',
  'not-composed'
];

/**
 * What a person reads when the press typed nothing, one sentence per reason.
 *
 * A REFUSAL IS NOT A FAILURE AND IT IS NOT A LANDING. Main re-reads that one
 * session at the moment of the press, because a poll answer up to two seconds
 * old is not good enough to type into a live session with. When what it reads
 * is not what the row said, it types nothing and answers with one of these,
 * and every one of them says plainly that nothing was typed.
 *
 * The integrator added these at the end of the phase. The store called
 * `resumeInPlaceNote` for every answer, which covers the four landings and has
 * no word for a refusal, so a refused press showed a toast with no text in it.
 */
export function resumeInPlaceRefusalNote(
  refusal: ResumeInPlaceRefusal
): string {
  switch (refusal) {
    case 'not-dropped':
      return (
        'Tortie has no record of an agent leaving this session, so it typed ' +
        'nothing.'
      );
    case 'not-here':
      return (
        'Tortie could not find this session running on this Mac, so it typed ' +
        'nothing.'
      );
    case 'no-conversation':
      return (
        'Tortie has not saved a conversation for this session, so there is ' +
        'nothing to put back on your prompt.'
      );
    case 'running':
      return 'Something is running in this session now, so Tortie typed nothing.';
    case 'agent-back':
      // IT SAYS WHAT TORTIE FOUND, not what is true. Main read the command
      // line of the one process under this session and it names this row's
      // agent, which is evidence and not a certainty, and the rest of this
      // module never claims an agent is running for the same reason.
      return (
        "Tortie found this session's agent running here, so there is nothing " +
        'to put back.'
      );
    case 'not-composed':
      return (
        'Tortie could not build the command that continues this ' +
        'conversation, so it typed nothing.'
      );
  }
}

/**
 * The sentence for one whole answer, whichever half of it is set.
 *
 * ONE DOOR, so the store never has to decide which of the two sentence
 * functions to call. Exactly one of the two fields is set, and an answer from a
 * build of main this window does not understand falls through to the honest
 * sentence rather than to an empty toast.
 */
export function resumeInPlaceAnswerNote(answer: {
  landing: ResumeInPlaceLanding | null;
  refusal?: ResumeInPlaceRefusal | null;
}): string {
  if (answer.landing !== null) return resumeInPlaceNote(answer.landing);
  const refusal = answer.refusal;
  if (refusal != null && RESUME_IN_PLACE_REFUSALS.includes(refusal)) {
    return resumeInPlaceRefusalNote(refusal);
  }
  return 'Tortie typed nothing and did not say why.';
}
