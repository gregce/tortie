/**
 * The degraded-durability notices (Phase 19 item 9).
 *
 * Four items in Phase 19 discovered a state the user must hear about and had
 * nowhere to say it. The disk-full checkpoint became a `console.warn`, the
 * torn snapshot generation and the quarantined manifest had no line at all,
 * and a tmux server running at 2,000 lines instead of 25,000 said nothing.
 * This file is the one shape all of them travel in.
 *
 * THE RULE, from ZEN-OF-TORTIE and repeated here because it decides every
 * future addition: this is a notice, not a dashboard. A notice exists only
 * when a layer is degraded. There is no counterpart that reports a healthy
 * state, no counter, no score, and nothing that rises on its own. Each kind
 * speaks ONCE per app run (the latch lives in src/main/notice), names what it
 * is about, and offers an action only when the user can actually take one.
 *
 * WHERE THE WORDS LIVE: main sends the fact, the renderer writes the sentence
 * (src/renderer/state/store.ts). That is the same split ScrollbackNotice
 * already uses, and it exists because a toast is clamped to two lines of about
 * 29 characters each, which is a renderer fact main has no business knowing.
 *
 * WHY THIS RIDES THE SCROLLBACK EVENT: `scrollback:notice` is already the
 * channel for "a durability event with an irreversible consequence just
 * happened", it is already subscribed once in the renderer, and it already
 * carries the latch discipline. A second channel would have meant a second
 * preload extra, a second subscription and two toast policies that can drift.
 * The wire name stays `scrollback:notice` because renaming a live channel buys
 * nothing. `GmuxNotice` below is what actually travels on it.
 */

import type { ScrollbackNotice } from './scrollback';

/**
 * A capture pass could not write. Item 4.
 *
 * `sessions` is how many sessions were not saved by that pass, so the sentence
 * can be about the user's work rather than about a file. `outOfSpace` is true
 * only when the failure was ENOSPC, which is the one cause the user can
 * actually clear, and it is read from the durable-write module's own
 * `isOutOfSpace` rather than guessed from a message string.
 */
export interface SnapshotFailedNotice {
  kind: 'snapshot-failed';
  /** How many sessions that pass failed to save. At least 1. */
  sessions: number;
  /** True when the cause was a full disk. */
  outOfSpace: boolean;
  /**
   * APPENDED (Phase 26.3): set when the failed capture was about exactly one
   * session, so the sentence can name it. The quit pass keeps sending counts.
   */
  sessionName?: string;
  /**
   * APPENDED (Phase 26.3): true when the capture ran because the user ended
   * the session. The end confirm promises "saved first", so this failure gets
   * its own sentence: the scrollback was not saved, and a later Restore
   * brings back the conversation only. Absent on every other capture pass.
   */
  atSessionEnd?: boolean;
  /**
   * APPENDED (Phase 84): true when the session was on another machine.
   *
   * The end-time sentence for a session on this Mac says "Restore resumes it",
   * and that is false for a session on another machine, where the conversation
   * does not come back. Absent reads as false, so every notice written before
   * this field means exactly what it always did.
   */
  remote?: boolean;
}

/**
 * The newest snapshot generation did not verify, and an older one was used
 * instead. Item 3.
 *
 * This is a success with a caveat, not a failure: the session did come back,
 * and it came back one generation stale. The user is told because the last
 * few minutes of that transcript are gone and nothing else would ever say so.
 */
export interface SnapshotRepairedNotice {
  kind: 'snapshot-repaired';
  /** The session whose newest generation was rejected. */
  sessionName: string;
}

/**
 * The manifest failed its integrity check, the damaged file was set aside, and
 * Tortie is running on something else. Item 5.
 *
 * `quarantinePath` is the whole point of the notice: the user's own session
 * records are in that file and they must be told where it went, because a
 * quarantine the user cannot find is indistinguishable from a delete. The
 * renderer offers a Finder reveal on it.
 */
export interface ManifestQuarantinedNotice {
  kind: 'manifest-quarantined';
  /** Absolute path the damaged file was moved to. Never overwritten. */
  quarantinePath: string;
  /** Epoch ms of the copy now in use, or null when Tortie started empty. */
  recoveredAt: number | null;
}

/**
 * The tmux server is keeping less scrollback than Tortie asked for. Item 13.
 *
 * The measured cause is a config path inside the application bundle that an
 * update replaced: tmux starts, exits zero, says nothing, and runs at its own
 * default of 2,000 lines. Both numbers travel because "less than you asked
 * for" is not actionable and "2,000 instead of 25,000" is.
 */
export interface ScrollbackDepthDegradedNotice {
  kind: 'depth-degraded';
  /** Lines the running server actually has, read back from tmux. */
  actualLines: number;
  /** Lines Tortie asked for. */
  requestedLines: number;
}

/**
 * A restore was interrupted and could not be finished. Offered to item 7.
 *
 * The journal exists to detect exactly this, and detecting it silently would
 * repeat the defect the rest of this phase fixes. Post it ONLY when the
 * restore is left unfinished: a journal entry the next launch completes on its
 * own needs no human, and the Zen rule is that nothing is said when nothing
 * needs a human. DELETE THIS KIND if item 7 lands without an emitter for it,
 * rather than leaving a shape nobody sends.
 */
export interface RestoreIncompleteNotice {
  kind: 'restore-incomplete';
  /** The session whose restore was cut short and is still not back. */
  sessionName: string;
}

/**
 * A restore finished, and one of its two stages did not deliver. Item 6.
 *
 * ADDED IN THE FIX ROUND, and the reason is that item 6 had no surface at all.
 * The derived status and the `restore` column both landed and both were
 * correct, and a verifier measured that nothing a user can see reads either of
 * them. A restore that came back without its scrollback and without its resume
 * command showed a row reading "idle", then "working" a second later once the
 * activity oracle saw a fresh pane, and the only trace of the loss was a
 * database column with no reader. Honesty in the database is not honesty.
 *
 * `stage` is which half fell short, so the renderer can write one short
 * sentence for each. The rule for what counts as a shortfall is
 * `restoreCameBackWhole` in ./restore-status, not a check written here.
 */
export interface RestoreShortfallNotice {
  kind: 'restore-shortfall';
  /** The session that came back incomplete. */
  sessionName: string;
  /**
   * - `scrollback`: the saved output did not replay.
   * - `resume`: the agent's resume command could not be typed.
   * - `both`: neither came back.
   */
  stage: 'scrollback' | 'resume' | 'both';
}

/**
 * The session list could not be READ, so nothing is known about it. Item 5.
 *
 * Distinct from `manifest-quarantined` on purpose, because the two need
 * opposite reactions from the user. A quarantine means the data was damaged and
 * has been moved. This means the file is intact and Tortie could not get at it,
 * e.g. a directory whose permissions changed or a read only volume. Measured:
 * a pristine 46 session manifest in a directory at mode 500 was reported to the
 * user as damaged, which is false about their data and sends them looking for a
 * quarantine that does not exist.
 */
export interface ManifestUnreadableNotice {
  kind: 'manifest-unreadable';
  /** Where the file is. It has not been moved. */
  path: string;
}

/**
 * The verified copies of the session list are failing. Phase 20 item 2.
 *
 * Tortie keeps five verified generations of the session list beside it, and
 * takes a new one at launch, every few minutes, on sleep and on quit. When
 * those stop working the user still has the session list they always had, so
 * nothing is lost yet. What they have lost is the copy that would bring it
 * back, and that is a state only they can act on, e.g. by clearing a full disk.
 *
 * Said once per app run, on the FIRST failure of a run of them, because a disk
 * that is full fails every tick and a toast per tick is a toast people learn to
 * dismiss. `detail` is for the log, not for the toast.
 */
export interface BackupFailingNotice {
  kind: 'backup-failing';
  /** Why the take failed, in the ring's own words. */
  detail: string;
}

/**
 * The first boot after an update found the new bundle incomplete. Phase 24.
 *
 * APPENDED (Phase 24). The post update self check runs once when the stored
 * version differs from app.getVersion(), and verifies that the resources the
 * app cannot work without still resolve on disk. This notice is the single
 * thing the whole update flow is allowed to raise above the surface, and only
 * because it is a failure. A reinstall repairs it completely, because no user
 * data lives in the bundle.
 */
export interface UpdateIncompleteNotice {
  kind: 'update-incomplete';
  /** Short resource labels, e.g. "tmux config", "specstory", "ripgrep", "tree-sitter". */
  missing: string[];
  /** The version that just started. */
  version: string;
}

/**
 * The previous run did not exit cleanly. Phase 35.
 *
 * APPENDED (Phase 35). The run sentinel (`<userData>/logs/run.json`) survives
 * a crash and is found at the next boot, and the Crashpad readdir diff says
 * how many new dumps that death left. The boot.unclean_exit record in the
 * log carries the detail; this notice is the one quiet line above the
 * surface. It is info styled and never an error toast, because the crash
 * already happened and the sessions live in the tmux server.
 */
export interface UncleanExitNotice {
  kind: 'unclean-exit';
  /** New crash dumps found at this boot. 0 when the process died with no dump. */
  newDumps: number;
}

/**
 * An agent pane started without a variable its row promises. Phase 33.
 *
 * `launch.envPassthrough` names variables Tortie reads from the login shell
 * at each launch and each restore. A name that is unset or empty at probe
 * time injects nothing, and the probe itself can fail or time out. Either
 * way the pane is running without something its row said it would have, and
 * nothing else would ever say so. The agent inside the pane fails much
 * later, with a message about its provider rather than about the shell.
 *
 * `sessionId` is here because the LATCH for this kind is per session per app
 * run rather than per kind (src/main/notice). Two sessions missing a
 * variable are two facts, and the second must not be silenced by the first.
 */
export interface EnvUnresolvedNotice {
  kind: 'env-unresolved';
  sessionId: string;
  sessionName: string;
  /** The names that had no value in the login shell. Sorted. At least 1. */
  names: string[];
  /** True when the probe itself failed or timed out. */
  probeFailed: boolean;
}

/**
 * The login shell did not print its PATH, so every pane this run gets the
 * fallback. Phase 81.
 *
 * The fallback carries the install directories a Finder launched app misses,
 * and it carries no version managed node directory at all. So Tortie can
 * still find an agent whose shim sits in one of those directories and can no
 * longer find that shim's interpreter. The pane opens and dies at once with
 * exit 127, and until this phase nothing above the log said why.
 *
 * `shell` is the program that was asked, e.g. /bin/zsh, so the log and the
 * record name the thing the person would go and look at. The toast does not
 * carry it: two lines of about 26 characters have no room for a path.
 */
export interface ShellPathFallbackNotice {
  kind: 'shell-path-fallback';
  /** The program the capture asked, e.g. /bin/zsh. */
  shell: string;
}

/** Every degraded state Tortie can report. One kind per state, no free text. */
export type DurabilityNotice =
  | BackupFailingNotice
  | SnapshotFailedNotice
  | SnapshotRepairedNotice
  | ManifestQuarantinedNotice
  | ManifestUnreadableNotice
  | ScrollbackDepthDegradedNotice
  | RestoreIncompleteNotice
  | RestoreShortfallNotice
  | UpdateIncompleteNotice
  | UncleanExitNotice
  | EnvUnresolvedNotice
  | ShellPathFallbackNotice;

/**
 * Everything that travels on `scrollback:notice`: the three scrollback events
 * that were already there, plus the degraded states above.
 */
export type GmuxNotice = ScrollbackNotice | DurabilityNotice;

/** The degraded-state kinds, for the latch and for exhaustiveness tests. */
export const DURABILITY_NOTICE_KINDS = [
  'backup-failing',
  'snapshot-failed',
  'snapshot-repaired',
  'manifest-quarantined',
  'manifest-unreadable',
  'depth-degraded',
  'restore-incomplete',
  'restore-shortfall',
  'update-incomplete',
  'unclean-exit',
  'env-unresolved',
  'shell-path-fallback'
] as const;

/** Narrow a notice off the shared channel to a degraded state. */
export function isDurabilityNotice(
  notice: GmuxNotice
): notice is DurabilityNotice {
  return (DURABILITY_NOTICE_KINDS as readonly string[]).includes(notice.kind);
}
