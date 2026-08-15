/**
 * Session lifecycle contract beyond the frozen base: restore (plus the
 * login item that shipped with it), activity facts, the durability
 * channels (queued notices, restart), and Past Sessions. Moved verbatim
 * from src/shared/ipc.ts (Phase 42 stage 2).
 */

import type { Unsubscribe } from './base';
import type { DurabilityNotice } from '../notice';

// ---------------------------------------------------------------------------
// APPENDED by the restore stream (Phase 6) — new channels/types only, nothing
// above was modified. All OPTIONAL bridge extensions, feature-detected by the
// renderer (`typeof window.gmux.sessions.restore === 'function'`), so the app
// still works against older preloads.
//
// Wiring (done by this phase): main registers the channels in
// src/main/restore/ipc.ts; preload adds the methods per the GmuxApi pattern.
// ---------------------------------------------------------------------------

import type { Session as RestoreSession } from '../types';

/** New invoke channels appended by the restore stream. */
export interface RestoreInvokeChannelMap {
  /**
   * Recreate a 'restorable' session (FINAL-REPORT §2.4 Step 3): fresh tmux
   * session in the recorded cwd running $SHELL, prior scrollback snapshot
   * cat-ed as inert history, and the recorded resume command TYPED but not
   * executed (armed). Resolves to the refreshed Session (status 'running').
   * Idempotent for already-live sessions.
   */
  'sessions:restore': { req: [sessionId: string]; res: RestoreSession };
  /** Read the 'Launch gmux at login' state (app.getLoginItemSettings). */
  'app:getLoginItem': { req: []; res: { openAtLogin: boolean } };
  /**
   * Toggle 'Launch gmux at login' (app.setLoginItemSettings) and return the
   * OS-read-back state — the UI must render the readback, not the request.
   */
  'app:setLoginItem': { req: [openAtLogin: boolean]; res: { openAtLogin: boolean } };
}

/**
 * OPTIONAL extension to GmuxApi['sessions'], feature-detected by the shell
 * (`typeof window.gmux.sessions.restore === 'function'`).
 */
export interface GmuxSessionRestoreExtras {
  /** Restore a 'restorable' session with an armed resume command. */
  restore?(sessionId: string): Promise<RestoreSession>;
}

/** OPTIONAL top-level extras on window.gmux (login item), feature-detected. */
export interface GmuxLoginItemExtras {
  getLoginItem?(): Promise<{ openAtLogin: boolean }>;
  setLoginItem?(openAtLogin: boolean): Promise<{ openAtLogin: boolean }>;
}

// ---------------------------------------------------------------------------
// APPENDED by the activity stream (Phase 13, research 18) — new channels and
// types only, plus the one existing line the GmuxInvokeChannelMap comment
// invites streams to intersect into.
//
// Activity detection moved ENTIRELY into the main process. The renderer used
// to derive working / needs-input / idle from the `term:data:<id>` byte
// stream, which only exists for the VISIBLE pane, and then pinned that value
// through a sticky override that outranked main — a session could read
// "working" for hours after going quiet. Main now reads agent-native oracles
// and tmux formats for EVERY session, attached or not, and these two channels
// carry the two things the byte stream used to supply on the side:
//
//   activity:changed  (main → renderer)  ⌘J excerpt + last-output timestamp,
//     batched to at most one message per poll tick. Status itself still
//     travels on the existing EVT_STATUS_CHANGED.
//   activity:noteInput (renderer → main) the user typed into a session, so
//     whatever it was blocked on has an answer — clears needs_input without
//     waiting for echo (the Phase 9.2 self-inflicted-input rule).
// ---------------------------------------------------------------------------

/** Main → renderer: per-session activity facts that are not the status. */
export const EVT_ACTIVITY_CHANGED = 'activity:changed' as const;

export interface SessionActivityInfo {
  sessionId: string;
  /** Last non-empty line of the session's screen (⌘J excerpt). */
  excerpt?: string;
  /** Epoch ms of the last output tmux saw in that pane. */
  lastActivityAt?: number;
}

/** New event channel appended by the activity stream. */
export interface ActivityEventPayloadMap {
  'activity:changed': [updates: SessionActivityInfo[]];
}

/** New invoke channel appended by the activity stream. */
export interface ActivityInvokeChannelMap {
  /** The user sent input to this session (clears needs_input immediately). */
  'activity:noteInput': { req: [sessionId: string]; res: void };
}

/**
 * OPTIONAL top-level extras on window.gmux, feature-detected by the renderer
 * (`typeof window.gmux.onActivityChanged === 'function'`). Without them the
 * shell simply shows no excerpts and no ages — status is unaffected.
 */
export interface GmuxActivityExtras {
  onActivityChanged?(cb: (updates: SessionActivityInfo[]) => void): Unsubscribe;
  noteTerminalInput?(sessionId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 19 items 8 and 9 (durability) — two new channels and their
// preload extras. The existing lines touched above are the
// GmuxInvokeChannelMap intersection, the `scrollback:notice` payload and the
// `onNotice` callback signature, and each is annotated where it sits.
//
// WHY A PULL CHANNEL FOR NOTICES AT ALL: the loudest notice of the five fires
// while the manifest is being opened, which is BEFORE any window exists, so a
// broadcast at that instant reaches nobody. Main queues those and the renderer
// drains the queue once, immediately after it subscribes. Everything posted
// after that point is broadcast normally and is never queued, so a notice can
// never be shown twice.
// ---------------------------------------------------------------------------

/** New invoke channels appended by the durability stream. */
export interface DurabilityInvokeChannelMap {
  /**
   * Degraded-state notices that were posted before any renderer could hear
   * them. Called ONCE per renderer boot, right after `scrollback.onNotice` is
   * subscribed. Draining is destructive: the queue is empty afterwards.
   */
  'notice:pending': { req: []; res: DurabilityNotice[] };
  /**
   * Restart an ended session: create the replacement FIRST, and only then
   * remove the old row. Phase 19 item 8.
   *
   * This is one main-side call rather than the renderer's old
   * discard-then-create pair because the ordering is a durability invariant
   * and the renderer cannot hold it across a reload. It is also the only side
   * that can read the original launch flags, which live in the manifest row's
   * argv and are dropped by any caller that rebuilds the session from the
   * Session projection.
   *
   * Resolves to the replacement. Rejects with the create's own typed error and
   * nothing removed, which is the whole point.
   */
  'sessions:restart': { req: [sessionId: string]; res: RestoreSession };
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by the renderer
 * (`typeof window.gmux.notice?.pending === 'function'`). Without it the app
 * simply never hears a notice that was posted before the window existed, which
 * is the behaviour every build before Phase 19 had.
 */
export interface GmuxNoticeExtras {
  notice?: {
    pending(): Promise<DurabilityNotice[]>;
  };
}

/**
 * OPTIONAL extension to GmuxApi['sessions'], feature-detected by the shell
 * (`typeof window.gmux.sessions.restart === 'function'`). Without it the
 * renderer falls back to its own create-then-discard sequence, which keeps the
 * ordering right but cannot carry the launch flags.
 */
export interface GmuxSessionRestartExtras {
  restart?(sessionId: string): Promise<RestoreSession>;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 29 (session history) — new channel/types only. The two
// existing lines touched above are the GmuxInvokeChannelMap intersection and
// the AnyMenuActionWithProjects alias, exactly the one-line folds their own
// comments prescribe.
//
// sessions:listRemoved — the Past Sessions panel's data: discarded rows from
//   every project, newest removal first by removedAt. Sorted in MAIN, so
//   there is one opinion about the order. There is deliberately no push event
//   for this list: the panel fetches on open and after its own restore verb,
//   and a removal cannot happen while the panel is open (the panel is a modal
//   and Remove lives behind it), so a stale list is not reachable.
//
// Restore from the panel reuses the existing `sessions:restore` channel — the
// Phase 26.3 machinery — and Remove keeps its shipped `sessions:discard`
// channel name while the handler behind it writes a tombstone instead of a
// DELETE. No new verb channels exist.
//
// MAIN: src/main/restore/ipc.ts, beside restore and discard.
// ---------------------------------------------------------------------------

/** Past Sessions data: discarded rows, newest removal first. */
export interface GmuxPastSessionsChannelMap {
  'sessions:listRemoved': { req: []; res: RestoreSession[] };
}

/**
 * OPTIONAL sessions extra, feature-detected by the renderer
 * (`typeof window.gmux.sessions.listRemoved === 'function'`). Without it the
 * Past Sessions panel opens in its empty state with no error, the same
 * posture every extras consumer takes.
 */
export interface GmuxPastSessionsExtras {
  listRemoved?(): Promise<RestoreSession[]>;
}

/**
 * The Session menu gained "Past Sessions…". Appended as its own id union,
 * the same one-line shape ProjectMenuActionId used. Deliberately
 * unaccelerated: restoring starts a process, so the user reads a name first.
 */
export type PastSessionsMenuActionId = 'past-sessions';
