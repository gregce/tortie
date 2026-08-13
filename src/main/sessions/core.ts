/**
 * gmux session orchestration — the Phase 2 durable session core.
 *
 * Composes the three modules built by the parallel streams:
 *   - src/main/tmux/      private-server supervisor + control-mode event bus
 *   - src/main/manifest/  SQLite durability record (rows written BEFORE spawn)
 *   - src/main/attach/    per-visible-pane `tmux attach` PTY streaming
 *
 * Boot sequence (FINAL-REPORT §2.4): ensureServer → open manifest → start
 * control client → reconcile manifest against live tmux sessions → register
 * every sessions:* / projects:* IPC handler → broadcast sessions:changed on
 * every control-client event and mutation.
 *
 * Phase 16 moved this class out of `src/main/ipc.ts` VERBATIM — that file is
 * the IPC registrar it is named for, and this is the domain it was hiding.
 * The only edits are the import paths and this paragraph.
 */

import type { WebContents } from 'electron';
import { randomUUID } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { readdir, realpath, rm } from 'node:fs/promises';
import { basename, join, resolve as resolvePath } from 'node:path';
import type {
  TerminalScrollByInput,
  TerminalScrollPollInput,
  TerminalScrollState,
  TerminalScrollToInput
} from '@shared/ipc';
import {
  EVT_ACTIVITY_CHANGED,
  EVT_CAPTURE_NOTICE,
  EVT_SCROLLBACK_NOTICE,
  EVT_SESSIONS_CHANGED,
  EVT_STATUS_CHANGED
} from '@shared/ipc';
import type { SnapshotFailedNotice } from '@shared/notice';
import { restoreShortfall } from '@shared/restore-status';
import type {
  ScrollbackStats,
  SessionScrollbackFacts
} from '@shared/scrollback';
import type {
  AgentsScanResult,
  CreateSessionInput,
  LaunchableAgentKind,
  Project,
  RenameSessionInput,
  ResizeInput,
  ResumeCapture,
  Session,
  SessionRestore,
  SessionStatus
} from '@shared/types';
import {
  claudeHookDir,
  claudeHookSettingsPath,
  ensureClaudeHookSettings,
  GmuxHookServer,
  hooksEnabled,
  readPreferredHookPort,
  SessionActivityMonitor,
  withClaudeSettingsFlag,
  writePreferredHookPort,
  type ActivitySession
} from '../activity';
import { AttachHost } from '../attach';
import {
  agentBinaryName,
  listDetectedAgents,
  registryResumeArgv
} from '../agents';
// The durable writer's own failure type and its own out-of-space test
// (Phase 19 item 2). Do not write a second copy of either.
import { DurableWriteError, isOutOfSpace } from '../durable';
// Named crash points for the fault harness. A no-op on every launch that is
// not a harness launch — see fault/inject.ts.
import { faultPoint } from '../fault/inject';
import { unwatchGitRepo } from '../git';
import {
  agentRescuesId,
  agentRescuesIdAfterExit,
  buildRecoveryContract,
  claimConversationId,
  conversationClaimant,
  harvestProvenance,
  launchProvenance,
  ManifestStore,
  releaseConversationClaims,
  defaultManifestDbPath,
  prepareManifestForBoot,
  resolveLaunchSpec,
  startManifestRing,
  toSession,
  watchForSessionId,
  type AgentLaunchSpec,
  type LiveTmuxSession,
  type ManifestRingSchedule,
  type ManifestSessionRecord,
  type RestoreAttemptRecord,
  type RingTakeResult,
  type SessionIdWatch
} from '../manifest';
// The one channel main uses to say a durability layer is degraded, and the
// owner of the once-per-run latch (Phase 19 item 9). Never broadcast a
// DurabilityNotice directly — the latch is the point of the module.
import { postDurabilityNotice } from '../notice';
// LEAF restore modules only — ../restore/ipc imports this file (no cycles).
import { restoreRecordOf, restoreSessionInTmux } from '../restore/restore';
import {
  resolveRestoreJournal,
  type LiveIdentity
} from '../restore/journal';
import {
  captureSessionSnapshot,
  deleteSnapshot,
  snapshotsDir,
  type SnapshotReason,
  type SnapshotSessionRecipe
} from '../restore/snapshots';
import {
  buildScrollbackReport,
  readScrollbackStats,
  readSessionScrollback,
  ScrollbackWatch,
  type ScrollbackServiceDeps
} from '../scrollback';
// DIRECT, not through ../settings — that barrel re-exports ../settings/ipc,
// which imports ../menu, and the registrar that owns this core already does.
import { getSettings, onSettingsUpdated } from '../settings/store';
import {
  SYNC_QUIT_TIMEOUT_MS,
  SyncQueue,
  cloudDisabledByEnv,
  wrapForCapture,
  wrapWithRecord,
  type SpecstoryCaptureRecord,
  type SyncRequest
} from '../specstory';
import * as tmux from '../tmux';
import { gmuxError, isGmuxError } from '../errors';
import { broadcastEvent } from '../typed-events';

// ---------------------------------------------------------------------------
// Broadcast helper — every event goes to every window (single-window app,
// but reloads/devtools can briefly hold more than one).
// ---------------------------------------------------------------------------

// Phase 16 (G1, event half): this was the fourth hand-written copy of the
// "send to every live window" loop. It is now the one in ../typed-events —
// same channels, same payloads, same isDestroyed() guard.
const broadcast = broadcastEvent;

// ---------------------------------------------------------------------------
// GmuxCore — owns manifest + control client + attach host + id maps
// ---------------------------------------------------------------------------

const REFRESH_DEBOUNCE_MS = 150;

/**
 * Cadence of the all-sessions activity poll. 1 Hz while a window has focus —
 * measured at 2.75 ms CPU for 16 panes, i.e. 0.28 % of one core — and half
 * that when nothing is focused, because nobody is looking at the dots.
 */
const STATUS_POLL_MS = 1_000;
const STATUS_POLL_IDLE_MS = 2_000;

/**
 * How long a boot rescue looks for the record of a session whose process is
 * already gone. The store scan runs immediately and nothing will be written
 * afterwards, so this only has to outlast a slow disk — not the hours a LIVE
 * harvest waits for a trust prompt to be answered.
 */
const DEAD_ROW_RESCUE_TIMEOUT_MS = 20_000;

/** How long a create may claim to still be in flight — see createsInFlight. */
const CREATE_IN_FLIGHT_MAX_MS = 60_000;

/**
 * Server options resources/gmux-tmux.conf sets that gmux cannot afford to
 * have wrong — a tmux server left running from an OLDER conf never re-reads
 * the file, so every boot re-asserts them on the private socket.
 *
 *  - remain-on-exit failed (§6.6): keeps a failed pane alive long enough for
 *    the reaper to read #{pane_dead_status} and record the real exit code.
 *  - mouse off: tmux must not own the mouse. `on` turns xterm mouse reporting
 *    on, which hands every click to the tmux server — a right-click then
 *    opens tmux's pane menu on top of gmux's native one, and a plain drag
 *    becomes a tmux copy-mode selection instead of an xterm one.
 *  - copy-mode-position-format '' and a neutral mode-style (Phase 12.3):
 *    gmux scrolls a session by driving copy-mode, and tmux would otherwise
 *    paint its own amber "[38/261]" box over the transcript's top-right
 *    corner — tmux chrome and tmux vocabulary, in a UI that shows neither.
 *  - exit-empty off: the private server must outlive its last session. tmux's
 *    own default is `on`, so a server that came up without our conf ends the
 *    moment the user closes their last session, and with it the socket every
 *    later launch expects to find. This was measured and then left unhandled
 *    until the Phase 19 fix round: a server started without the conf runs
 *    `exit-empty on`, and setting `history-limit` on it afterwards left
 *    `exit-empty` on. It is re-asserted here, warm server or cold, because
 *    unlike history-limit it is never a user preference and there is no value
 *    other than `off` that Tortie can work with.
 *  - history-limit (Phase 13.7) is the one entry sourced from SETTINGS rather
 *    than a literal, and it is the one where drift is invisible: the conf's
 *    number wins on a server that outlived a settings change, and the user
 *    would see their new depth ignored for days with nothing to look at.
 */
const BOOT_SERVER_OPTIONS: readonly (readonly [string, string])[] = [
  ['remain-on-exit', 'failed'],
  ['exit-empty', 'off'],
  ['mouse', 'off'],
  ['copy-mode-position-format', ''],
  ['mode-style', 'noattr,bg=default,fg=default']
];

/**
 * The manifest row as a snapshot capsule carries it.
 *
 * Phase 20 rebuilds a lost manifest from the capsules, so it cannot read the
 * manifest to learn whose scrollback a body is. Everything it needs to launch
 * the session again travels in the capsule at capture time or it is not
 * recoverable at all. See SnapshotSessionRecipe in ../restore/snapshots.
 *
 * `argv` is the manifest's own form, with the ABSOLUTE binary path, which is
 * the form the manifest is the source of truth for. The bare-name launch rule
 * (Phase 12.7 F3) is applied at spawn, not stored.
 *
 * The two versions are two different binaries and each goes under its own
 * name. Until Phase 21 the capsule's `agentVersion` was fed from the SpecStory
 * wrapper's version, because that was the only version the manifest had. The
 * manifest now has an `agent_version` column, so the agent's version goes in
 * the field named for it and the wrapper keeps its own.
 */
function snapshotRecipeOf(rec: ManifestSessionRecord): SnapshotSessionRecipe {
  return {
    name: rec.name,
    tmuxName: rec.tmuxName,
    projectPath: rec.projectPath,
    cwd: rec.cwd,
    agent: rec.agent,
    agentSessionId: rec.agentSessionId ?? null,
    argv: rec.argv,
    resumeArgv: rec.resumeArgv ?? null,
    agentVersion: rec.agentVersion ?? null,
    specstoryVersion: rec.specstory?.binVersion ?? null
  };
}

/**
 * Push the configured scrollback depth onto the private server.
 *
 * `set-option -g` is the ONLY lever that works. Measured on 3.6a:
 *   - it takes effect immediately for panes created afterwards, with no
 *     server restart and no reattach — including every session brought back
 *     by Restore, because `restoreSession` runs `tmux new-session -d`;
 *   - `set -p history-limit` on a live pane exits 0 AND echoes back from
 *     `show -p`, and is completely inert. The boundary is PANE CREATION, so
 *     nothing here can deepen or shrink a session that is already running.
 */
async function applyHistoryLimit(lines: number): Promise<void> {
  await tmux
    .execTmux(['set-option', '-g', 'history-limit', String(lines)])
    .catch((err: unknown) => {
      console.warn(
        `[gmux] could not set history-limit: ${(err as Error).message}`
      );
    });
}

/**
 * The launch spec's capture mode, as the ONE thing the user actually cares
 * about: does this session come back with its conversation? Pre-assigned
 * agents are armed before the process exists; harvesters start 'capturing'
 * and flip to 'armed' when their watcher lands; anything gmux has no verified
 * route for says 'unavailable' rather than leaving the question open.
 */
function resumeCaptureFor(spec: AgentLaunchSpec): ResumeCapture {
  switch (spec.idCapture) {
    case 'preassigned':
      return 'armed';
    case 'preassigned-cmd':
      // The side command either produced an id or it did not; no watcher
      // follows, so there is nothing left to wait for either way.
      return spec.resumeArgv !== undefined ? 'armed' : 'unavailable';
    case 'store-harvest':
      return 'capturing';
    case 'unsupported':
      return 'unavailable';
    case 'none':
      return 'none';
  }
}

/**
 * The launch flags this row's AGENT was started with, recovered from the
 * manifest so a rescued harvest re-appends them to the resume argv.
 *
 * Under capture `argv` is the wrapper's — `run <provider> --no-version-check
 * --silent -c "…"` — and re-appending THOSE to a resume would build nonsense.
 * The unwrapped agent argv is recorded for exactly this reason.
 */
function agentExtrasOf(rec: ManifestSessionRecord): string[] {
  const inner = rec.specstory?.agentArgv;
  return (inner !== undefined && inner.length > 0 ? inner : rec.argv).slice(1);
}

/**
 * The wrapped argv to actually SPAWN, with the agent's bare name inside the
 * `-c` string (Phase 12.7 F3).
 *
 * F3's rule is "the manifest keeps the absolute path, the launch uses the bare
 * name", and it exists because an absolute argv[0] made every durable gmux
 * agent the one process on the machine that `pkill -f "$(command -v claude)"`
 * matched while every ephemeral one walked away. Under capture the agent's
 * path is no longer argv[0] — it is a substring of the wrapper's `-c`
 * argument, which is exactly what `pkill -f` greps. Substituting it there is
 * what keeps the protection.
 *
 * The specstory binary itself stays ABSOLUTE in both places: it is not on
 * PATH when it is the bundled copy, and no pkill pattern is aimed at it.
 */
function relaunchWrapped(
  wrapped: string[],
  capture: SpecstoryCaptureRecord,
  bareName: string
): string[] {
  const inner = [bareName, ...capture.agentArgv.slice(1)];
  return wrapWithRecord(capture, inner) ?? wrapped;
}

async function assertServerOptions(): Promise<void> {
  for (const [name, value] of BOOT_SERVER_OPTIONS) {
    await tmux
      .execTmux(['set-option', '-g', name, value])
      .catch((err: unknown) => {
        console.warn(
          `[gmux] could not set ${name}: ${(err as Error).message}`
        );
      });
  }
  await applyHistoryLimit(getSettings().scrollbackLines);
}

// ---------------------------------------------------------------------------
// Phase 19 item 4 — a capture pass that could not write says so once
// ---------------------------------------------------------------------------

/** One session a capture pass could not write, and why. */
export interface UnwrittenSnapshot {
  /** The session's display name. For the log line, never for the notice. */
  name: string;
  /** True when the durable writer reported the volume was full. */
  outOfSpace: boolean;
}

/**
 * The notice one capture pass owes the user, or null when it owes none.
 *
 * Exported and pure because the decision is the part worth pinning: how many
 * failures become how many notices, and when the notice may claim the volume
 * is full. The posting and the logging are the caller's.
 *
 * ONE notice for the whole pass. A full volume fails every session in the pass
 * with the same error, and forty three copies of one sentence is a dashboard.
 * `outOfSpace` is true when ANY failure in the pass was out of space, because
 * that is the one cause the user can clear, and a pass that hit it has hit the
 * end of the disk whatever else also failed.
 */
export function snapshotFailureNotice(
  unwritten: readonly UnwrittenSnapshot[]
): SnapshotFailedNotice | null {
  if (unwritten.length === 0) return null;
  return {
    kind: 'snapshot-failed',
    sessions: unwritten.length,
    outOfSpace: unwritten.some((one) => one.outOfSpace)
  };
}

// ---------------------------------------------------------------------------
// Phase 19 item 6 — what a restore achieved, and what it may therefore claim
//
// `restoreSessionInTmux` runs three stages that fail independently: create the
// tmux session, replay the saved scrollback, and arm the resume command. Two of
// them only warn when they throw. This file used to destructure `info` out of
// the result, drop the other two fields on that line, and write
// `status: 'running'`. A restore whose replay and arming had both thrown was
// stored and broadcast as a healthy working session.
//
// The result now arrives as the discriminated union in restore.ts, whose failed
// arm carries no `info`, so dropping the stage results is a compile error. The
// record stored on the row is `SessionRestore` from src/shared/types.ts, which
// is the same shape the renderer reads. There is one description of a restore
// rather than three.
// ---------------------------------------------------------------------------

/**
 * The status a restored session is allowed to claim, derived from the stage it
 * reached rather than assigned.
 *
 * `running` is not in the range of this function, and that is the point of it.
 * A restored pane holds a fresh interactive shell sitting at a prompt. Nothing
 * is executing. The resume command is TYPED and deliberately not sent, so even
 * the best case has not started the conversation. `running` was a claim about
 * work in progress, and it was made just as loudly when every stage had
 * thrown.
 *
 * `idle` is what the pane is: alive and quiet. The activity oracles move the
 * row to `running` a tick later if the session starts behaving like it, and
 * that observation is the only evidence the word is allowed to rest on. How
 * much of the session came back is a different fact and rides on
 * `Session.restore`, which is why it does not multiply this alphabet.
 *
 * `failed` and `interrupted` never reach here. Nothing was created for them,
 * so the row keeps the `restorable` it already had. The switch has no
 * `default`, so a new member of `RestoreResultKind` is a compile error here
 * rather than a silent fall through to a status nobody chose.
 */
export function restoredStatus(result: SessionRestore): SessionStatus {
  switch (result.kind) {
    // Nothing was created. The caller throws before this is asked.
    case 'failed':
    case 'interrupted':
      return 'restorable';
    // Alive with no scrollback replayed. The user got their folder back.
    case 'shell_only':
      return 'idle';
    // The scrollback replayed as inert text above a fresh prompt.
    case 'transcript':
      return 'idle';
    // The scrollback replayed and the resume command is typed, waiting on
    // Enter. Still not running: the user has not pressed it.
    case 'armed':
      return 'idle';
  }
}

export class GmuxCore {
  readonly manifest: ManifestStore;
  readonly control: tmux.TmuxControlClient;
  readonly attachHost: AttachHost;

  /** manifest session id → live tmux `$-id` (rebuilt on every reconcile). */
  private readonly liveIds = new Map<string, string>();
  /** live tmux `$-id` → manifest session id. */
  private readonly byTmuxId = new Map<string, string>();
  /** Pending session-id harvests (Phase 13.5), cancelled on kill/shutdown. */
  private readonly idCaptureWatches = new Map<string, SessionIdWatch>();
  /** Session ids with a restore in flight ("Restore all" double-clicks). */
  private readonly restoresInFlight = new Set<string>();
  /**
   * Whether the restore journal has been resolved this launch (item 7). Once,
   * on the first refresh: after that the journal only holds attempts this
   * process made, and this process closes its own.
   */
  private journalResolved = false;
  /**
   * Session id → the instant its create started, for creates whose manifest
   * row exists but whose tmux session does not yet (§2.4 Step 0 writes the
   * row FIRST). A reconcile running in that window finds no live session for
   * the row and would mark it 'restorable' — the just-created session then
   * refuses to attach. Timestamped rather than a bare set so a create that
   * dies between the row and the spawn cannot exempt its row FOREVER; see
   * pruneStaleCreates().
   */
  private readonly createsInFlight = new Map<string, number>();
  /**
   * The manifest backup ring's timer (Phase 20 item 2), or null when boot has
   * not reached it yet.
   *
   * The core owns it because the core owns the two things it needs: the open
   * manifest connection the change test reads, and the knowledge of whether a
   * create or a restore is in flight. Its poll is unref'd, so it can never hold
   * the process open.
   */
  private ringSchedule: ManifestRingSchedule | null = null;
  /** Live tmux `$-id`s proven NOT to be ours — see identify(). */
  private readonly foreignTmuxIds = new Set<string>();
  /** Last cols×rows pushed per session — see resizeSession (Phase 12.11). */
  private readonly lastGeometry = new Map<string, string>();

  /**
   * The last agent detection scan, kept so the create path can stamp the
   * agent's version on the row (Phase 21, A8).
   *
   * `listDetectedAgents()` memoises its scan for the life of the process, so
   * awaiting it on the create path runs no new subprocess. This field exists
   * for the second reason: Settings' Re-scan replaces that memoised promise,
   * and holding the resolved value here means a create always has an answer
   * even while a re-scan is in flight.
   */
  private agentScan: AgentsScanResult | null = null;

  /** Phase 13: per-agent activity detection (src/main/activity). */
  readonly activity: SessionActivityMonitor;
  /** Loopback channel for injected agent hooks (claude only, §3). */
  readonly hookServer: GmuxHookServer;

  /** Depth last pushed to the server — see the settings subscription. */
  private appliedScrollbackLines = getSettings().scrollbackLines;
  private unwatchSettings: (() => void) | null = null;

  /**
   * Phase 13.7. Latches the one notice scrollback is allowed to volunteer:
   * a session has started DISCARDING output. Fed by the 1 Hz poll it already
   * runs — no timer, no extra tmux call.
   */
  private readonly scrollbackWatch = new ScrollbackWatch({
    nameOf: (sessionId) =>
      this.manifest.getSession(sessionId)?.name ?? null,
    emit: (notice) => broadcast(EVT_SCROLLBACK_NOTICE, notice)
  });

  /**
   * Phase 15. The session-end SpecStory flush (research 13 §1.2), queued so a
   * quit with a dozen captured sessions runs two CLIs at a time instead of
   * twelve, and so the quit path has ONE thing to wait on.
   *
   * Only failures speak. A successful sync is the normal case and produces
   * nothing at all — no toast, no log line, no badge.
   */
  private readonly syncQueue = new SyncQueue((outcome, req) => {
    const sessionId = this.syncOwners.get(req) ?? null;
    this.syncOwners.delete(req);
    if (outcome.ok) return;
    const rec = sessionId !== null ? this.manifest.getSession(sessionId) : undefined;
    console.warn(
      `[gmux] specstory sync failed for ${rec?.name ?? sessionId ?? req.cwd}: ` +
        `${outcome.message ?? 'no reason given'} (${outcome.argv.join(' ')})`
    );
    if (rec === undefined || outcome.message === null) return;
    broadcast(EVT_CAPTURE_NOTICE, {
      kind: 'sync-failed',
      sessionId: rec.id,
      sessionName: rec.name,
      message: outcome.message
    });
  });
  /** Which session each queued sync belongs to (the queue stays generic). */
  private readonly syncOwners = new Map<SyncRequest, string>();

  private refreshTimer: NodeJS.Timeout | null = null;
  private statusTimer: NodeJS.Timeout | null = null;
  private sessionsBroadcastTimer: NodeJS.Timeout | null = null;
  private statusPollMs = STATUS_POLL_MS;
  private statusPollBusy = false;
  private disposed = false;

  /**
   * Diagnostic tap: called with (sessionId, byteLength) for every term:data
   * flush the attach host sends. Used by the smoke harness to assert bytes
   * really flow through main; never wired in production.
   */
  onTermData: ((sessionId: string, byteLength: number) => void) | null = null;

  /**
   * Tap for the ONE surface outside the renderer that needs session truth:
   * the menu-bar status item (Phase 12.85, src/main/tray). It sees exactly
   * what sessions:changed carries, because broadcastSessions() is the single
   * choke point every mutation and every activity flip funnels through.
   */
  onSessionsBroadcast: ((sessions: Session[]) => void) | null = null;

  private constructor(manifest: ManifestStore) {
    this.manifest = manifest;
    this.attachHost = new AttachHost({
      tmuxBin: tmux.getTmuxContext().bin,
      confPath: tmux.resolveConfPath(),
      // The socket the supervisor RESOLVED, not the constant. They are the
      // same string for every launch a user makes, and the fault harness moves
      // it on purpose so it can crash the app against a server that holds none
      // of the user's work. An attach client left on the constant would then be
      // talking to a different tmux server than the rest of the app.
      socketName: tmux.getTmuxContext().socket,
      onData: (sessionId, byteLength) => {
        this.onTermData?.(sessionId, byteLength);
      },
      onExit: (sessionId, _exitCode, expected) => {
        if (!expected) void this.handleUnexpectedAttachExit(sessionId);
      }
    });
    this.control = new tmux.TmuxControlClient();
    this.hookServer = new GmuxHookServer({
      onEvent: (sessionId, state) => {
        this.activity.noteHookEvent(sessionId, state);
      },
      onSessionEnd: (sessionId) => {
        this.activity.forget(sessionId);
      }
    });
    this.activity = new SessionActivityMonitor({
      sessions: () => this.activitySessions(),
      exec: tmux.execTmux,
      run: this.runScrollCommand,
      onStatus: (sessionId, status) => {
        this.applyDetectedStatus(sessionId, status);
      },
      onActivity: (updates) => {
        broadcast(EVT_ACTIVITY_CHANGED, updates);
      },
      onDead: (sessionId, exitCode, deadSignal) => {
        void this.reapDeadSession(sessionId, exitCode, deadSignal).then(() => {
          this.scheduleSessionsBroadcast();
        });
      },
      onScrollback: (samples) => {
        this.scrollbackWatch.observe(samples);
      }
    });
    this.wireControlEvents();
    // Phase 13.7: a depth change has to reach the live server the moment it
    // is made. Without this the user edits the setting and observes nothing
    // until the next app launch — for a value that only affects sessions
    // started from now on, that reads as a broken control.
    this.unwatchSettings = onSettingsUpdated((settings) => {
      if (settings.scrollbackLines === this.appliedScrollbackLines) return;
      this.appliedScrollbackLines = settings.scrollbackLines;
      void applyHistoryLimit(settings.scrollbackLines);
    });
  }

  /**
   * The live sessions the activity monitor evaluates: manifest rows that are
   * neither exited nor restorable AND currently mapped to a live tmux id.
   */
  private activitySessions(): ActivitySession[] {
    const out: ActivitySession[] = [];
    for (const rec of this.manifest.listSessions()) {
      if (rec.status === 'exited' || rec.status === 'restorable') continue;
      const tmuxId = this.liveIds.get(rec.id);
      if (tmuxId === undefined) continue;
      out.push({ id: rec.id, tmuxId, agent: rec.agent, cwd: rec.cwd });
    }
    return out;
  }

  /**
   * One verdict from the monitor. The manifest is the record of truth, so it
   * is written first and the cheap per-session event follows — and only when
   * something actually changed (the poll runs every second).
   */
  private applyDetectedStatus(sessionId: string, status: SessionStatus): void {
    const rec = this.manifest.getSession(sessionId);
    if (!rec || rec.status === 'exited' || rec.status === 'restorable') return;
    if (rec.status === status) return;
    this.manifest.setStatus(sessionId, status);
    broadcast(EVT_STATUS_CHANGED, sessionId, status);
    this.scheduleSessionsBroadcast();
  }

  /**
   * Coalesce full-list broadcasts. A 1 Hz poll can flip several sessions in
   * the same tick and each flip already sent its own cheap status:changed —
   * the list only needs to go out once.
   */
  private scheduleSessionsBroadcast(): void {
    if (this.disposed || this.sessionsBroadcastTimer !== null) return;
    this.sessionsBroadcastTimer = setTimeout(() => {
      this.sessionsBroadcastTimer = null;
      if (!this.disposed) this.broadcastSessions();
    }, 0);
    this.sessionsBroadcastTimer.unref?.();
  }

  /**
   * Take a generation of the manifest because the machine is going to sleep
   * (Phase 20 item 2).
   *
   * Sleep and quit are the two moments with no next tick, so both skip the five
   * minute floor and keep the change test. Null means the manifest has not
   * changed since the last generation, which is the common case and is not a
   * failure.
   */
  async takeManifestGenerationOnSuspend(): Promise<RingTakeResult | null> {
    return (await this.ringSchedule?.onSuspend()) ?? null;
  }

  /** The same, on the way out. Stops the poll first. */
  async takeManifestGenerationOnQuit(): Promise<RingTakeResult | null> {
    return (await this.ringSchedule?.onQuit()) ?? null;
  }

  /** Boot the whole durable core. Throws structured GmuxErrors on failure. */
  static async boot(): Promise<GmuxCore> {
    await tmux.ensureServer();
    // Phase 20. Two things happen to the manifest before it is opened: a
    // verified generation is put back when the file is missing or damaged, and
    // a generation of the OLD schema is taken when a migration is pending. Both
    // have to be here rather than inside the store, because writing a file is
    // async and the store's constructor is not. See manifest/boot.ts for the
    // order and for why the ring is asked before `.recover`.
    const dbPath = defaultManifestDbPath();
    await prepareManifestForBoot(dbPath).catch((err: unknown) => {
      // It already swallows its own failures. This catch is for the one thing
      // it cannot answer for, which is a bug in it: a backup step must never be
      // the reason a user cannot open their sessions.
      console.warn(
        `[gmux] preparing the manifest failed: ${(err as Error).message}`
      );
    });
    const core = new GmuxCore(new ManifestStore(dbPath));
    try {
      await core.control.start();
    } catch (err) {
      // Control client reconnects on its own; boot proceeds — the manifest
      // and one-shot tmux commands still work without the event bus.
      console.warn(
        `[gmux] control client failed to start (will retry): ${(err as Error).message}`
      );
    }
    await assertServerOptions();
    await core.startHookChannel();
    // Same catch-and-warn every OTHER reconcile caller gets via
    // scheduleRefresh(). Unguarded, a transient manifest lock at launch does
    // not degrade to a stale first paint — it rejects boot(), which rejects
    // getGmuxCore(), and the window that asked for the core comes up empty.
    // A first paint from the last known manifest rows is strictly better, and
    // the next tmux control event (or any caller's scheduleRefresh) reconciles
    // again. refresh() itself already treats an unreachable tmux this way —
    // warn and carry on; this makes a locked manifest match.
    await core.refresh().catch((err: unknown) => {
      console.warn(
        `[gmux] initial refresh failed (showing last known sessions): ${(err as Error).message}`
      );
    });
    core.startStatusWatcher();
    // Phase 20 item 2. The poll starts and the launch generation is taken here,
    // after reconcile, so the copy holds statuses that agree with tmux rather
    // than the ones the last run left behind. It is awaited because 21 ms is
    // invisible beside the tmux work above and a take that has definitely
    // happened is one a harness can assert on. Nothing in it can throw.
    core.ringSchedule = await startManifestRing({
      store: core.manifest,
      busy: () => core.createsInFlight.size > 0 || core.restoresInFlight.size > 0,
      dbPath
    });
    // Phase 21 (A8). Warm the agent detection scan so the create path can
    // record the agent's version without waiting for one. It is the same
    // memoised scan the renderer asks for at startup, so this adds no probes
    // to a normal launch; it removes the create path's dependence on the
    // renderer having got there first. Unawaited, and a failure is nothing:
    // the version is then recorded as unknown, which is what it is.
    core.refreshAgentScan();
    // Phase 13.7 — one disk check, off the boot path. Boot is the moment
    // "sessions may not be saved when you quit" can still be acted on, and
    // this is deliberately the ONLY unprompted sample: the alternative was an
    // hourly timer, which is a dashboard's heartbeat with no dashboard.
    setTimeout(() => {
      void core.scrollbackStats().catch(() => undefined);
    }, 5_000).unref?.();
    return core;
  }

  /**
   * Bring up the loopback hook channel and re-arm every claude session that
   * outlived the last gmux run.
   *
   * The port is persisted and re-bound so a claude started by a PREVIOUS gmux
   * keeps posting to the same place; its token is recovered from the settings
   * file gmux wrote for it. Rewriting those files here is also the durability
   * guarantee — `claude --settings <path>` refuses to start when the file is
   * missing, and that path rides the armed resumeArgv.
   *
   * Every failure here is silent by design: no hook channel simply means
   * claude falls back to its pid file, which is what actually carries the
   * feature (research 18 §3).
   */
  private async startHookChannel(): Promise<void> {
    if (!hooksEnabled()) return;
    const preferred = readPreferredHookPort();
    const port = await this.hookServer.start(preferred).catch(() => 0);
    if (port === 0) return;
    // Only claim the preference when we actually got it. Falling back to an
    // ephemeral port means something else (a second gmux, a smoke run) owns
    // the persisted one — overwriting it would point every existing session's
    // baked-in hook URL at a port that dies with this process.
    if (preferred === 0 || port === preferred) writePreferredHookPort(port);
    const known = new Set<string>();
    for (const rec of this.manifest.listSessions()) {
      known.add(rec.id);
      if (rec.agent !== 'claude' || rec.status === 'exited') continue;
      ensureClaudeHookSettings(this.hookServer, rec.id);
    }
    // Sweep settings files whose session row is gone (killed and removed in a
    // previous run). Nothing reads them and nothing can resume them.
    void readdir(claudeHookDir())
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.endsWith('.json') && !known.has(n.slice(0, -5)))
            .map((n) => rm(join(claudeHookDir(), n), { force: true }))
        )
      )
      .catch(() => undefined);
  }

  // -------------------------------------------------------------------------
  // Control-client event wiring
  // -------------------------------------------------------------------------

  private wireControlEvents(): void {
    this.control.on('sessions-changed', () => this.scheduleRefresh());
    this.control.on('connected', () => this.scheduleRefresh());
    this.control.on('session-renamed', (tmuxId, tmuxName) => {
      this.handleExternalRename(tmuxId, tmuxName);
    });
    this.control.on('server-exit', () => {
      // A plain client detach also produces %exit — only a truly dead server
      // is the T2 path. refresh() classifies: TMUX_UNREACHABLE ⇒ every
      // non-exited row flips to 'restorable'. Snapshot first, best-effort:
      // if the server still lives (clean detach) the captures succeed; if it
      // is truly dead they fail harmlessly (research 09 §B.4 capture point).
      void this.snapshotAllSessions('server-exit').finally(() =>
        this.scheduleRefresh()
      );
    });
    this.control.on('error', (err) => {
      console.warn(`[gmux] control client: ${err.message}`);
    });
  }

  private handleExternalRename(tmuxId: string, tmuxName: string): void {
    if (tmux.isControlSession(tmuxName)) return;
    const sessionId = this.byTmuxId.get(tmuxId);
    if (sessionId === undefined) return;
    const rec = this.manifest.getSession(sessionId);
    if (!rec || rec.tmuxName === tmuxName) return; // our own rename, synced
    // Renamed outside gmux (or race): tmux-side name is truth for both.
    this.manifest.renameSession(sessionId, tmuxName, tmuxName);
    this.broadcastSessions();
  }

  private async handleUnexpectedAttachExit(sessionId: string): Promise<void> {
    const rec = this.manifest.getSession(sessionId);
    if (!rec || rec.status === 'exited' || rec.status === 'restorable') return;
    // F1: no live binding ⇒ this session is not ours to ask about. Let the
    // refresh below flip the row to 'restorable'.
    const target = this.liveIds.get(sessionId);
    if (target !== undefined) {
      try {
        if (await tmux.hasSession(target)) return; // hiccup, session lives
      } catch {
        /* unreachable server → refresh sorts out restorable-vs-exited */
      }
    }
    this.scheduleRefresh();
  }

  // -------------------------------------------------------------------------
  // The agent version at launch — Phase 21 (A8, research 30 §2.4 D1)
  // -------------------------------------------------------------------------

  /** Pull the memoised detection scan into `agentScan`. Never throws. */
  private refreshAgentScan(): void {
    void listDetectedAgents()
      .then((scan) => {
        this.agentScan = scan;
      })
      .catch(() => undefined);
  }

  /**
   * The installed version of `agent`, or null when nothing can say.
   *
   * NO NEW SUBPROCESS RUNS HERE. `listDetectedAgents()` returns the scan the
   * process already ran, memoised for its whole life. The await is for the one
   * launch where a create arrives before the boot warm has resolved, and it
   * waits on that same in-flight scan rather than starting another.
   *
   * The manifest records the SpecStory wrapper's version already, explicitly
   * so a restore after a mid-flight upgrade replays the same binary. The agent
   * is the thing whose resume semantics actually change, and five of nine
   * installed agents drifted in the three days between research 30 being
   * written and being re-measured, so this is the version that matters more.
   */
  private async detectedAgentVersion(
    agent: LaunchableAgentKind
  ): Promise<string | null> {
    if (agent === 'shell') return null;
    await listDetectedAgents()
      .then((scan) => {
        this.agentScan = scan;
      })
      .catch(() => undefined);
    return this.cachedAgentVersion(agent);
  }

  /**
   * The same answer without waiting, for the harvest callback. A harvest can
   * land hours after the create, and blocking a settle on a scan would be the
   * wrong trade there: the id is what matters and the version is a note
   * beside it.
   */
  private cachedAgentVersion(agent: LaunchableAgentKind): string | null {
    if (agent === 'shell') return null;
    return this.agentScan?.agents.find((a) => a.id === agent)?.version ?? null;
  }

  // -------------------------------------------------------------------------
  // Session-id harvest (create time + boot resume) — Phase 13.5
  // -------------------------------------------------------------------------

  /**
   * Watch a harvesting agent's session store for the record that identifies
   * this pane's conversation, and arm the resume argv the moment it appears.
   * Used at create time AND re-armed on boot for sessions that were spawned
   * but never harvested (e.g. gmux quit within the harvest window).
   *
   * Was codex-only until Phase 13.5; the per-agent store paths, filename
   * patterns and correlation keys are now data in src/main/manifest/harvest.
   */
  private startIdCapture(
    id: string,
    agent: LaunchableAgentKind,
    ctx: { cwd: string; sinceTs: number; panePid?: number; tmuxSessionId?: string },
    extraArgs: readonly string[],
    options: {
      timeoutMs?: number;
      markUnavailableOnFailure?: boolean;
      /**
       * TRUE when the watch was started with the pane (Phase 21, G6). FALSE
       * means a later launch started it against a REMEMBERED spawn time, with
       * no live process to correlate against, and the provenance records that
       * difference permanently rather than letting the two look alike.
       */
      atCreate?: boolean;
    } = {}
  ): void {
    if (agent === 'shell' || !agentRescuesId(agent)) return;
    if (this.idCaptureWatches.has(id)) return;
    const watch = watchForSessionId(agent, ctx, {
      // PHASE 21 fix round. The session this watch is FOR. Two panes started
      // seconds apart in one folder can both see the first record, and the
      // freshness window is two seconds wide on purpose, so without this the
      // second pane could arm the first pane's conversation and record the
      // answer as proven. A record another session already has is not a
      // candidate here, and the same session may retake its own id when the
      // watch is started again.
      claimant: id,
      ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {})
    });
    this.idCaptureWatches.set(id, watch);
    watch.promise
      .then((harvested) => {
        this.idCaptureWatches.delete(id);
        // dispose() cancels every watch and then closes the manifest, so a
        // settle that lands after teardown must touch nothing.
        if (this.disposed) return;
        // The session may have been killed/discarded while we watched.
        const rec = this.manifest.getSession(id);
        if (rec === undefined) return;
        // Resume with the session's recorded ABSOLUTE binary (Bug A), and
        // re-append the original extras — resume restores no launch flags.
        //
        // Phase 15: on a CAPTURED session, `rec.argv[0]` is the specstory
        // wrapper, not the agent — the agent's own argv lives in the capture
        // record, which is why it is stored verbatim. Compose the inner
        // resume from THAT, then put the wrapper back around it, so a
        // harvested session restores captured exactly like a pre-assigned one.
        const capture = rec.specstory;
        const innerBin =
          capture?.agentArgv[0] ?? rec.argv[0] ?? agentBinaryName(agent);
        const innerResume = registryResumeArgv(
          agent,
          harvested.sessionId,
          extraArgs,
          innerBin
        );
        if (innerResume.length === 0) return; // never persist an id-less argv
        let resumeArgv = innerResume;
        if (capture?.enabled === true) {
          const rewrapped = wrapWithRecord(capture, innerResume);
          if (rewrapped !== null) resumeArgv = rewrapped;
          else {
            // The wrap could not be rebuilt (an argument SpecStory cannot
            // pass through). Arming the BARE resume is right — the
            // conversation is what matters — but the user's capture would
            // silently stop at the restore, so it is said out loud.
            console.warn(
              `[gmux] ${agent} resume for "${rec.name}" could not keep ` +
                'SpecStory capture; the armed command runs the agent directly.'
            );
          }
        }
        // PHASE 21 (G6) — persist how good the evidence was, not just the id.
        //
        // The watcher knows which key proved the record, whether a timer
        // accepted it, and how many candidates were still in play. All of it
        // used to end at the console line below, so an exact correlation and
        // a timing guess reached the manifest as the same armed session.
        const provenance = harvestProvenance(harvested, {
          cwd: ctx.cwd,
          agentVersion: this.cachedAgentVersion(agent),
          atCreate: options.atCreate !== false
        });
        // ONE durable write, not two. The id and the claim about the id go
        // into the same transaction, so no power cut can leave a row that is
        // armed and silent about where the id came from.
        this.manifest.setAgentSessionId(
          id,
          harvested.sessionId,
          resumeArgv,
          provenance
        );
        if (provenance.confidence !== 'exact') {
          // Armed, but not PROVEN to be this pane's conversation. Said out
          // loud in the log because the alternative is a confident restore
          // into somebody else's session.
          console.warn(
            `[gmux] ${agent} resume id ${harvested.sessionId} matched on ` +
              `'${harvested.key}'${harvested.viaGraceTimer ? ' via the grace timer' : ''} ` +
              `with ${harvested.rivals} candidate(s) in play ` +
              `(${provenance.confidence}) — ${harvested.storePath}`
          );
        }
        const live = this.liveIds.get(id);
        if (live !== undefined) {
          void tmux
            .setSessionOption(live, '@gmux-session-id', harvested.sessionId)
            .catch(() => undefined);
        }
        this.broadcastSessions();
      })
      .catch((err: unknown) => {
        this.idCaptureWatches.delete(id);
        if (this.disposed) return; // teardown cancelled us; the DB is closed
        // A TIMEOUT IS NOT A SUCCESS. It is not terminal either, and that is
        // a deliberate change from research 22 §4.1 point 2, which assumed a
        // harvest "resolves within seconds for every Tier-2 agent". MEASURED
        // 2026-08-11: codex and muse sit behind a first-run trust prompt and
        // write nothing until it is answered, and codex writes no rollout at
        // all until the first turn. Flipping to "directory only" while gmux
        // is still watching — and will arm the moment the user types — would
        // be a worse lie than the one this phase is fixing. The state goes
        // terminal where the answer really is final: refresh() re-arms live
        // sessions, and resumeIdHarvests() withdraws the promise once the
        // session is gone without an id.
        console.warn(`[gmux] ${agent} session-id harvest: ${(err as Error).message}`);
        // …EXCEPT for a rescue of a session that has already exited, where
        // the answer really is final: no process will ever write that record
        // now, so the row stops saying 'capturing' and says what a restore
        // would actually give the user.
        if (options.markUnavailableOnFailure === true) {
          const rec = this.manifest.getSession(id);
          if (rec?.resumeCapture === 'capturing') {
            this.manifest.setResumeCapture(id, 'unavailable');
          }
        }
        this.broadcastSessions();
      });
  }

  /**
   * Boot-time finalization: any session still missing its agentSessionId gets
   * a fresh watch keyed to its original spawn time, so resume ids are
   * recorded even across a gmux restart mid-harvest. extraArgs are recovered
   * from the recorded launch argv.
   *
   * Phase 13.5.1 widened this past the harvesting agents, because the rows the
   * user reported were being skipped by the very code written to rescue them:
   * muse-1 and qwen-1 were re-armed here, and pi-1 and pi1 were not, since pi
   * PRE-ASSIGNS and so never had a harvester — leaving two sessions with a
   * NULL resume argv and their transcripts sitting on disk the whole time. A
   * row with no id is a row the launch path already failed for, whatever its
   * agent's normal strategy is, so the question is only whether the store can
   * still answer (see agentRescuesId / agentRescuesIdAfterExit).
   */
  private resumeIdHarvests(): void {
    // PHASE 21 fix round, and it has to happen before the first watch starts.
    // The in-process record of who owns which conversation is empty at boot,
    // so a rescue watch would be free to hand session A's conversation to
    // session B. The manifest already knows. Every id it holds is claimed by
    // the row that holds it, and the rescues below then look for a record
    // nobody has.
    for (const rec of this.manifest.listSessions()) {
      if (rec.agentSessionId === undefined) continue;
      if (claimConversationId(rec.agentSessionId, rec.id)) continue;
      // Two rows already record one conversation. This build cannot make that
      // happen any more, and it cannot undo one that a previous build wrote:
      // there is no way to know which row is right. It is said out loud
      // because restoring both resumes the same conversation twice, and that
      // is worth knowing before it surprises someone. MEASURED in the T1 smoke
      // profile the moment this landed: codex-1 and codex-2 both carry
      // 019febf5-e7fa-7e32-8fd5-c4a56e10a859.
      console.warn(
        `[gmux] sessions ${String(conversationClaimant(rec.agentSessionId))} ` +
          `and ${rec.id} both record ${rec.agent} conversation ` +
          `${rec.agentSessionId}. Restoring both resumes the same conversation.`
      );
    }
    for (const rec of this.manifest.listSessions()) {
      if (rec.agent === 'shell' || !agentRescuesId(rec.agent)) continue;
      if (rec.agentSessionId !== undefined) continue;
      const live = this.liveIds.get(rec.id);
      if (
        rec.status === 'exited' ||
        rec.status === 'restorable' ||
        live === undefined
      ) {
        // The process is gone. For most agents that ends it — their stores are
        // keyed on a pid or a tmux pane that no longer exists — so leaving the
        // row 'capturing' would spin forever over a session that comes back as
        // a bare directory. A cwd+start-time store (pi) outlives its pane,
        // though, and this is exactly the post-reboot case the phase is for:
        // give it one bounded look, then say 'unavailable' if it finds nothing.
        if (agentRescuesIdAfterExit(rec.agent)) {
          this.startIdCapture(
            rec.id,
            rec.agent,
            { cwd: rec.cwd, sinceTs: rec.createdAt },
            agentExtrasOf(rec),
            {
              // The record either exists now or never will: no process is
              // going to write one. One scan, not a six-hour vigil.
              timeoutMs: DEAD_ROW_RESCUE_TIMEOUT_MS,
              markUnavailableOnFailure: true,
              // No live pane to correlate against — this is time alone.
              atCreate: false
            }
          );
          continue;
        }
        if (rec.resumeCapture === 'capturing') {
          this.manifest.setResumeCapture(rec.id, 'unavailable');
        }
        continue;
      }
      this.startIdCapture(
        rec.id,
        rec.agent,
        {
          cwd: rec.cwd,
          sinceTs: rec.createdAt,
          tmuxSessionId: live,
          ...(rec.panePid !== undefined ? { panePid: rec.panePid } : {})
        },
        agentExtrasOf(rec),
        // The pane is still alive, so the pane and pid keys still work, but
        // the watch was started by a LATER launch against a remembered spawn
        // time. That is weaker than a watch started with the pane, and the
        // record says so.
        { atCreate: false }
      );
    }
  }

  // -------------------------------------------------------------------------
  // Scrollback snapshots + restore (Phase 6 — §2.4 Steps 2–3)
  // -------------------------------------------------------------------------

  /**
   * Snapshot every live manifested session's scrollback to
   * <userData>/gmux/snapshots/<id>.txt. Best-effort and parallel — quit
   * paths call this and must never hang on a sick server.
   *
   * Best-effort is not the same as silent (Phase 19 item 4). A pass whose
   * WRITES failed has stopped protecting the user's work, and the pass says so
   * once. See {@link reportUnwrittenSnapshots}.
   *
   * `reason` is recorded in each snapshot's capsule (Phase 19 item 3), because
   * Phase 20 reconstruction cannot tell a capture taken on the way to sleep
   * from one taken as the tmux server died, and the two are worth different
   * amounts. It defaults to 'app-quit' because that is what an unqualified
   * "snapshot everything" has always meant here.
   */
  async snapshotAllSessions(reason: SnapshotReason = 'app-quit'): Promise<void> {
    const jobs: Promise<unknown>[] = [];
    /** Sessions whose scrollback this pass could not write. */
    const unwritten: UnwrittenSnapshot[] = [];
    for (const rec of this.manifest.listSessions()) {
      if (rec.status === 'exited' || rec.status === 'restorable') continue;
      // F1: only capture panes we can prove are ours — a name-resolved
      // capture would file a STRANGER's scrollback as this session's
      // history and replay it on restore.
      const target = this.liveIds.get(rec.id);
      if (target === undefined) continue;
      jobs.push(
        captureSessionSnapshot(target, rec.id, {
          reason,
          session: snapshotRecipeOf(rec)
        }).catch((err: unknown) => {
          // A failed WRITE is the failure that means protection stopped, and
          // the durable writer's own error type is what identifies one. Every
          // other failure here is a pane that went away, and the %exit path
          // calls this with a dying tmux server, which produces a whole pass
          // of those. Announcing on those would be a false alarm on the one
          // channel that must never cry wolf.
          if (err instanceof DurableWriteError) {
            unwritten.push({ name: rec.name, outOfSpace: isOutOfSpace(err) });
            return;
          }
          console.warn(
            `[gmux] snapshot failed for "${rec.name}": ${(err as Error).message}`
          );
        })
      );
    }
    await Promise.allSettled(jobs);
    this.reportUnwrittenSnapshots(unwritten);
  }

  /**
   * Say once that scrollback is no longer being saved (Phase 19 item 4).
   *
   * The whole pass produces at most one notice. A full volume fails every
   * session in the pass with the same error, and forty three copies of one
   * sentence is a dashboard. `postDurabilityNotice` owns the latch that also
   * silences the next pass, so the count below is this pass's own.
   *
   * The names stay in the log, because that is where a person debugging wants
   * them and it is not a surface the user reads. The log line is written even
   * when the notice is swallowed as a repeat, which is what the returned
   * boolean is for.
   */
  private reportUnwrittenSnapshots(
    unwritten: readonly UnwrittenSnapshot[]
  ): void {
    const notice = snapshotFailureNotice(unwritten);
    if (notice === null) return;
    console.warn(
      `[gmux] ${notice.sessions} session(s) were not saved` +
        `${notice.outOfSpace ? ' because the volume is full' : ''}: ` +
        unwritten.map((one) => one.name).join(', ')
    );
    postDurabilityNotice(notice);
  }

  /**
   * Restore a 'restorable' session (§2.4 Step 3): recreate it in tmux with
   * $SHELL, replay the scrollback snapshot as inert history, and TYPE the
   * recorded resume command without Enter (armed). Idempotent for sessions
   * that are already live again.
   *
   * The status it stores is DERIVED from the stage the restore reached, never
   * assigned (Phase 19 item 6). See {@link restoredStatus} for why `running`
   * is not one of the answers.
   */
  async restoreSession(sessionId: string): Promise<Session> {
    const rec = this.mustGetSession(sessionId);
    if (rec.status === 'exited') {
      throw gmuxError(
        'INVALID_INPUT',
        'This session ended — restart it instead of restoring.',
        sessionId
      );
    }
    if (rec.status !== 'restorable') {
      return toSession(rec); // already live — nothing to do (Restore-all race)
    }
    if (this.restoresInFlight.has(sessionId)) {
      return toSession(rec); // double-click guard; caller re-renders on event
    }
    this.restoresInFlight.add(sessionId);
    /** The open journal entry, or null once it has been closed (item 7). */
    let attemptId: number | null = null;
    try {
      // The armed resume command may carry `--settings <path>`, and claude
      // refuses to start when that file is gone. Re-write it (recovering the
      // session's existing token) before the command is typed into the pane.
      if (rec.agent === 'claude') {
        ensureClaudeHookSettings(this.hookServer, sessionId);
      }
      // Item 7: the intent is on disk, in a durable commit, before any side
      // effect. `attemptId` is what closes it again on every path out.
      attemptId = this.manifest.beginRestoreAttempt(sessionId);
      const attempt = attemptId;
      const outcome = await restoreSessionInTmux(rec, {
        // The instant new-session returns, and before anything is typed into
        // the pane. This is the window where a crash used to leave Tortie
        // holding a session it had no record of creating.
        onCreated: (created) => {
          this.manifest.noteRestoreTmuxId(attempt, created.sessionId);
        }
      });
      const result = restoreRecordOf(outcome);
      if (outcome.kind === 'failed') {
        // No session was created, so the row keeps the status it already has,
        // which is 'restorable'. Writing a live status here would be this
        // item's own defect pointed the other way. The commit is durable
        // (Phase 20 item 4) and deliberately does not touch `lastSeen`,
        // because nothing was confirmed alive.
        this.manifest.recordRestoreOutcome(sessionId, result);
        this.reportRestoreStages(rec, result);
        this.manifest.finishRestoreAttempt(attempt, result.kind);
        attemptId = null;
        // The original error, not a rebuilt one: the renderer already knows
        // how to show it, and the preflight refusal's wording is the same
        // sentence it has always been.
        throw outcome.error;
      }
      // `info` is unreachable on the failed arm, which is what makes dropping
      // the stage results a compile error rather than a silent regression.
      const { info } = outcome;
      // DERIVED, never assigned. See restoredStatus: 'running' is not one of
      // the answers, and the record of what came back is stored beside it so
      // the renderer never has to infer it from the presence of resumeArgv.
      const status = restoredStatus(result);
      this.reportRestoreStages(rec, result);

      this.liveIds.set(sessionId, info.sessionId);
      this.byTmuxId.set(info.sessionId, sessionId);
      // ONE DURABLE COMMIT (Phase 20 item 4). The restore record, the status
      // it implies and the two facts tmux only reports once the session
      // exists go to the drive together, between the journal's durable intent
      // row and its durable resolution. 0.056 ms before, 4.87 ms after,
      // against a restore that costs hundreds of milliseconds in tmux.
      const updated = this.manifest.setRestoreResult(sessionId, result, status, {
        tmuxName: info.tmuxName,
        ...(info.panePid !== undefined ? { panePid: info.panePid } : {})
      });
      faultPoint('restore.after-status-write');

      // Re-mirror metadata into tmux user options (best-effort, §2.4 0.2).
      try {
        await tmux.setSessionOption(info.sessionId, '@gmux-id', sessionId);
        await tmux.setSessionOption(info.sessionId, '@gmux-agent', rec.agent);
        if (rec.agentSessionId !== undefined) {
          await tmux.setSessionOption(
            info.sessionId,
            '@gmux-session-id',
            rec.agentSessionId
          );
        }
      } catch (err) {
        console.warn(
          `[gmux] could not mirror metadata after restore: ${(err as Error).message}`
        );
      }

      this.manifest.finishRestoreAttempt(attempt, result.kind);
      attemptId = null;

      broadcast(EVT_STATUS_CHANGED, sessionId, status);
      this.broadcastSessions();
      return toSession(updated);
    } finally {
      this.restoresInFlight.delete(sessionId);
      // An attempt still open here means something threw between the two
      // durable commits. Close it as interrupted rather than leaving a row
      // that makes the next launch believe the app died mid-restore, which
      // would be a second, invented disagreement.
      if (attemptId !== null) {
        try {
          this.manifest.finishRestoreAttempt(attemptId, 'interrupted');
        } catch (err) {
          console.warn(
            `[gmux] could not close the restore journal entry: ${(err as Error).message}`
          );
        }
      }
    }
  }

  /**
   * Tell the user what a restore did not get back, and write the same thing to
   * the log.
   *
   * THE NOTICE IS THE POINT, and the log line is the copy a person debugging
   * can find. Until the Phase 19 fix round this method wrote the log line only,
   * so a restore that came back with neither its scrollback nor its resume
   * command showed a row reading "idle" and then "working", and the loss lived
   * in a database column with no reader. A record the user cannot see is not
   * honesty.
   *
   * `restoreShortfall` decides what counts as a shortfall, because a plain
   * shell with no conversation and a session with no saved snapshot are both
   * COMPLETE restores and must not be reported as losses. That rule lives in
   * one place for main, the notice channel and the renderer.
   *
   * The notice speaks once per app run, which is the right bound here. A
   * restore-all after a reboot can bring back forty three sessions, and forty
   * three toasts saying the same thing is not a notice, it is a dashboard.
   */
  private reportRestoreStages(
    rec: ManifestSessionRecord,
    result: SessionRestore
  ): void {
    const shortfall = restoreShortfall(result);
    if (shortfall === null) return;
    console.warn(`[gmux] restore of "${rec.name}" (${result.kind}): ${shortfall}`);
    // 'failed' and 'interrupted' are not this notice. The first is a restore
    // that did not happen and the caller already reports it, and the second is
    // the journal's own state with its own notice kind.
    if (result.kind === 'failed' || result.kind === 'interrupted') return;
    const lostScrollback = result.replayFailure !== undefined;
    const lostResume = result.armFailure !== undefined;
    postDurabilityNotice({
      kind: 'restore-shortfall',
      sessionName: rec.name,
      stage:
        lostScrollback && lostResume
          ? 'both'
          : lostScrollback
            ? 'scrollback'
            : 'resume'
    });
  }

  // -------------------------------------------------------------------------
  // Reconcile
  // -------------------------------------------------------------------------

  scheduleRefresh(): void {
    if (this.disposed || this.refreshTimer !== null) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh().catch((err: unknown) => {
        console.warn(`[gmux] refresh failed: ${(err as Error).message}`);
      });
    }, REFRESH_DEBOUNCE_MS);
  }

  /**
   * Attach an IDENTITY to every live session before reconcile sees it.
   *
   * `@gmux-id` rides along in the one `list-sessions` the refresh already
   * runs (no extra exec). The `GMUX_SESSION_ID` pane-env stamp is the second
   * source, read ONLY for a session that has no option and whose id we would
   * otherwise never learn — one exec each, and only for the handful of
   * sessions gmux does not already recognize.
   *
   * Two stamps because both are best-effort at create; a session carrying
   * NEITHER is not ours, and gmux leaves it strictly alone.
   */
  private async identify(
    liveInfos: readonly tmux.TmuxSessionInfo[]
  ): Promise<LiveTmuxSession[]> {
    const known = new Set(this.manifest.listSessions().map((r) => r.id));
    const out: LiveTmuxSession[] = [];
    for (const info of liveInfos) {
      let gmuxId = info.gmuxId;
      if (
        (gmuxId === undefined || !known.has(gmuxId)) &&
        !this.foreignTmuxIds.has(info.sessionId)
      ) {
        const fromEnv = await tmux.getSessionEnv(
          info.sessionId,
          'GMUX_SESSION_ID'
        );
        if (fromEnv !== null && known.has(fromEnv)) {
          gmuxId = fromEnv;
          // Re-stamp the option so the next refresh needs no extra exec.
          void tmux
            .setSessionOption(info.sessionId, '@gmux-id', fromEnv)
            .catch(() => undefined);
        } else {
          // A pane's env is fixed at create, and `$-id`s are never reused, so
          // one probe settles this session forever. Without the memo every
          // refresh would re-probe every foreign session on the socket.
          this.foreignTmuxIds.add(info.sessionId);
        }
      }
      out.push({
        tmuxId: info.sessionId,
        tmuxName: info.tmuxName,
        ...(gmuxId !== undefined ? { gmuxId } : {})
      });
    }
    return out;
  }

  /**
   * Reconcile the manifest against live tmux sessions, rebuild the id maps,
   * and broadcast the refreshed list. TMUX_UNREACHABLE (server dead — T2)
   * reconciles against an empty list so rows flip to 'restorable'; any other
   * failure (transient timeout) skips reconciling rather than lie.
   */
  async refresh(): Promise<void> {
    if (this.disposed) return;
    let liveInfos: tmux.TmuxSessionInfo[] = [];
    // Phase 16.5.1: the instant the snapshot below is taken. Everything after
    // this line is asynchronous — the list exec, then one `show-environment`
    // per unrecognized session on the socket (44 of them on the author's
    // machine) — so by the time reconcile runs, the list can be hundreds of
    // milliseconds stale and a session created in between is missing from it
    // for a reason that has nothing to do with being unreachable. reconcile()
    // needs this instant to tell "gone" apart from "not born yet".
    const snapshotAt = Date.now();
    try {
      liveInfos = await tmux.listSessions();
    } catch (err) {
      if (!isGmuxError(err, 'TMUX_UNREACHABLE')) {
        console.warn(
          `[gmux] list-sessions failed, skipping reconcile: ${(err as Error).message}`
        );
        return;
      }
      liveInfos = []; // server is really gone — the T2 path
    }

    const before = this.statusSnapshot();
    const identified = await this.identify(liveInfos);
    // Item 7. Once per launch, and before reconcile, so both are judging the
    // same list of live sessions.
    this.resolveRestoreJournalOnce(identified);
    this.pruneStaleCreates();
    const result = this.manifest.reconcile(identified, {
      snapshotAt,
      inFlightIds: new Set([
        ...this.createsInFlight.keys(),
        ...this.restoresInFlight
      ])
    });

    const previousLive = new Map(this.liveIds);
    this.liveIds.clear();
    this.byTmuxId.clear();
    for (const [sessionId, tmuxId] of result.bindings) {
      this.liveIds.set(sessionId, tmuxId);
      this.byTmuxId.set(tmuxId, sessionId);
    }
    // A row reconcile refused to judge keeps the binding createSession /
    // restoreSession already recorded for it: this map is the one thing that
    // answers "which tmux session do I attach to", and dropping it would fail
    // the attach just as surely as the 'restorable' flip did.
    for (const { record } of result.skipped) {
      const tmuxId = previousLive.get(record.id);
      if (tmuxId === undefined || this.byTmuxId.has(tmuxId)) continue;
      this.liveIds.set(record.id, tmuxId);
      this.byTmuxId.set(tmuxId, record.id);
    }

    if (result.unknownTmuxNames.length > 0) {
      console.log(
        `[gmux] live tmux sessions with no manifest row (ignored): ` +
          result.unknownTmuxNames.join(', ')
      );
    }

    // Cheap per-session status events for flips the reconcile produced.
    for (const rec of this.manifest.listSessions()) {
      const prev = before.get(rec.id);
      if (prev !== undefined && prev !== rec.status) {
        broadcast(EVT_STATUS_CHANGED, rec.id, rec.status);
        // Phase 15: a captured session that was RUNNING and is now only
        // restorable died while gmux was not watching — a reboot, a tmux
        // server death, a `kill-pane` from outside. Nothing ran its flush, so
        // this is the reconciliation-time backstop research 13 §3.3 asks for.
        // Runs once per transition, not once per reconcile, because the flip
        // itself is the trigger.
        if (rec.status === 'restorable' && prev !== 'exited') {
          this.queueCaptureSync(rec);
        }
      }
    }
    this.broadcastSessions();

    // Phase 6/13.5: harvesting sessions that outlived a gmux restart
    // mid-capture get their watch re-armed (no-op once the id is recorded).
    this.resumeIdHarvests();
  }

  /**
   * Close every restore attempt the last run of Tortie never finished
   * (Phase 19 item 7).
   *
   * Runs once per launch, on the first refresh, because that is the first
   * moment there is a list of live tmux sessions to compare the journal
   * against. Comparing the two is the whole point: the journal says what was
   * attempted and tmux says what is actually there, and the three situations
   * that used to be indistinguishable are exactly the ones where those two
   * disagree. `resolveRestoreJournal` holds the policy and is a pure function,
   * so every cell of the matrix is tested without a tmux server.
   *
   * It writes a restore RECORD and never a status. Claiming a live session is
   * reconcile's job, by identity, and a second adoption path would give Tortie
   * two answers to "is this session mine".
   */
  private resolveRestoreJournalOnce(live: readonly LiveTmuxSession[]): void {
    if (this.journalResolved) return;
    this.journalResolved = true;

    let open: RestoreAttemptRecord[];
    try {
      open = this.manifest.listUnfinishedRestoreAttempts();
    } catch (err) {
      console.warn(
        `[gmux] could not read the restore journal: ${(err as Error).message}`
      );
      return;
    }
    if (open.length === 0) return;

    const identities: LiveIdentity[] = [];
    for (const s of live) {
      if (s.gmuxId !== undefined) {
        identities.push({ gmuxId: s.gmuxId, tmuxId: s.tmuxId });
      }
    }

    // What each row already says about its last restore. A crash after the
    // record was written and before the attempt was closed must keep the
    // accurate record, not have "not known" written over it.
    const existing = new Map<string, SessionRestore>();
    for (const rec of this.manifest.listSessions()) {
      if (rec.restore !== undefined) existing.set(rec.id, rec.restore);
    }

    for (const r of resolveRestoreJournal(open, identities, existing)) {
      console.warn(`[gmux] ${r.note}`);
      try {
        // The row may be gone: a session discarded between the crash and this
        // launch has no row to annotate, and the attempt still has to close.
        const row = this.manifest.getSession(r.sessionId);
        if (r.write && row !== undefined) {
          // Durable (Phase 20 item 4), and it must not touch `lastSeen`: this
          // is annotating a row about a restore that ran in a process which is
          // gone. It was an ordinary commit immediately followed by the
          // durable `finishRestoreAttempt`, so a power loss between the two
          // left the journal closed and the row's record lost.
          this.manifest.recordRestoreOutcome(r.sessionId, r.record);
        }
        this.manifest.finishRestoreAttempt(r.attemptId, r.record.kind);
        // Items 7 and 9. Two of the five outcomes leave the session still not
        // back, and those are the only two a person has to act on. The other
        // three end with a live session or with a row that already reported
        // itself, and the Zen rule is that nothing is said when nothing needs
        // a human.
        //
        // The notice latch speaks once per app run, so with several
        // unfinished attempts the user hears about the first one and reads
        // the rest off the session list, which already shows them as
        // restorable.
        if (
          row !== undefined &&
          (r.kind === 'nothing-came-back' || r.kind === 'session-lost')
        ) {
          postDurabilityNotice({
            kind: 'restore-incomplete',
            sessionName: row.name
          });
        }
      } catch (err) {
        console.warn(
          `[gmux] could not close restore attempt ${r.attemptId}: ${(err as Error).message}`
        );
      }
    }
  }

  /**
   * Forget creates that can no longer be in progress. `tmux new-session`
   * answers in milliseconds, so a minute is generous by orders of magnitude —
   * this exists only so a create that threw between writing the row and
   * spawning the process cannot exempt that row from reconcile for the rest
   * of the app's life, which would leave a dead session reading 'running' and
   * never offer it for restore.
   */
  private pruneStaleCreates(): void {
    const cutoff = Date.now() - CREATE_IN_FLIGHT_MAX_MS;
    for (const [id, startedAt] of this.createsInFlight) {
      if (startedAt < cutoff) this.createsInFlight.delete(id);
    }
  }

  private statusSnapshot(): Map<string, SessionStatus> {
    const map = new Map<string, SessionStatus>();
    for (const rec of this.manifest.listSessions()) map.set(rec.id, rec.status);
    return map;
  }

  // -------------------------------------------------------------------------
  // All-sessions activity watcher (Phase 13 — research 18)
  // -------------------------------------------------------------------------

  /**
   * Watch EVERY session, attached or not. This file owns the TIMER and the
   * BROADCAST; src/main/activity owns the tiers and the state machine.
   *
   * What changed in Phase 13, and why the old body is gone rather than
   * tuned: the poll used to read `#{window_bell_flag}` as `needs_input` (a
   * BEL is an OSC string terminator in practice — 133/133 captured, and
   * codex fires one ~10 times a second WHILE WORKING) and a flat 15 s
   * output-silence rule as `idle`, and then conceded priority to a renderer
   * byte detector that could only see the VISIBLE pane and never released
   * its verdict. Detection now lives entirely here, reads each agent's own
   * state where one exists, and works identically for hidden sessions.
   */
  startStatusWatcher(): void {
    if (this.statusTimer !== null || this.disposed) return;
    this.activity.start();
    this.armStatusTimer(this.statusPollMs);
  }

  private armStatusTimer(intervalMs: number): void {
    if (this.statusTimer !== null) clearInterval(this.statusTimer);
    this.statusPollMs = intervalMs;
    this.statusTimer = setInterval(() => {
      if (this.statusPollBusy) return;
      this.statusPollBusy = true;
      void this.activity
        .tick()
        .catch(() => undefined) // unreachable server — next tick retries
        .finally(() => {
          this.statusPollBusy = false;
        });
    }, intervalMs);
    // Never hold the process open just for the poll (smoke harness exits).
    this.statusTimer.unref?.();
  }

  /**
   * Drop to a 2 s cadence when no window has focus — nobody is watching the
   * status dots, and the floor is already only 0.28 % of one core.
   */
  setPollFocused(focused: boolean): void {
    if (this.disposed || this.statusTimer === null) return;
    const next = focused ? STATUS_POLL_MS : STATUS_POLL_IDLE_MS;
    if (next !== this.statusPollMs) this.armStatusTimer(next);
  }

  /**
   * A pane died and `remain-on-exit failed` kept it readable: record HOW it
   * died, snapshot the scrollback, kill the husk of the session, and flip the
   * manifest to 'exited' — the renderer names the cause with [Restart][Remove].
   *
   * Both halves of the cause are recorded (F2): `exitCode` for a real exit,
   * `exitSignal` for a death BY a signal, which reports an empty exit status
   * and used to leave the UI saying nothing at all.
   */
  private async reapDeadSession(
    sessionId: string,
    exitCode: number | undefined,
    deadSignal: string | undefined
  ): Promise<void> {
    const rec = this.manifest.getSession(sessionId);
    if (!rec || rec.status === 'exited') return; // gmux's own kill got here first
    this.attachHost.detach(sessionId); // expected teardown, not a surprise
    // F1: a session we cannot bind to a live tmux id is not ours. Record the
    // death, kill NOTHING.
    const target = this.liveIds.get(sessionId);
    if (target !== undefined) {
      await captureSessionSnapshot(target, sessionId, {
        reason: 'session-death',
        session: snapshotRecipeOf(rec)
      }).catch(() => undefined);
      await tmux.killSession(target).catch(() => undefined);
      this.byTmuxId.delete(target);
    }
    this.liveIds.delete(sessionId);
    this.manifest.updateSession(sessionId, {
      status: 'exited',
      lastSeen: Date.now(),
      ...(exitCode !== undefined ? { exitCode } : {}),
      ...(deadSignal !== undefined ? { exitSignal: deadSignal } : {})
    });
    // The wrapper's own flush is the one that did NOT happen here (a
    // non-zero exit takes the CLI's os.Exit mirror path), so this is the
    // sync that keeps the last turn of the conversation.
    this.queueCaptureSync(rec);
    // The manifest row is the record of truth but it dies with a discard —
    // this line is the copy that survives in the app log (research 21 §10).
    console.warn(
      `[gmux] session death: id=${sessionId} name="${rec.name}" ` +
        `agent=${rec.agent} tmux=${target ?? '(unbound)'} ` +
        `pane_pid=${rec.panePid ?? '?'} exit=${exitCode ?? ''} ` +
        `signal=${deadSignal ?? ''}`
    );
    this.activity.forget(sessionId);
    this.hookServer.revoke(sessionId);
    broadcast(EVT_STATUS_CHANGED, sessionId, 'exited');
  }

  /**
   * Queue the end-of-session SpecStory flush for a captured session; a no-op
   * for every other session.
   *
   * WHERE THIS IS CALLED FROM IS THE WHOLE DESIGN. `specstory run` flushes on
   * its own way out, but not on the two exits gmux actually produces: a
   * non-zero agent exit takes the CLI's `os.Exit(code)` mirror path, and
   * gmux's own end-session sends SIGHUP via `kill-session`, which `run` does
   * not handle. Both leave the tail of the conversation in the agent's native
   * store and out of the markdown. A cwd-scoped `sync` puts it back.
   *
   * Fire-and-forget by construction: the caller is a UI action or a death
   * report, and neither may wait on a CLI.
   */
  private queueCaptureSync(
    rec: ManifestSessionRecord,
    timeoutMs?: number
  ): void {
    const capture = rec.specstory;
    if (capture?.enabled !== true) return;
    const req: SyncRequest = {
      bin: capture.bin,
      provider: capture.provider,
      cwd: rec.cwd,
      agentSessionId: rec.agentSessionId,
      // The session's RECORDED opt-out, not just this run's environment: a
      // session created under GMUX_SPECSTORY_NO_CLOUD=1 can end in an app run
      // that no longer has the variable (a restore in the user's normal gmux),
      // and re-reading only the ambient env there would upload that scratch
      // conversation to their SpecStory Cloud.
      noCloud: capture.noCloud === true || cloudDisabledByEnv(),
      ...(timeoutMs !== undefined ? { timeoutMs } : {})
    };
    this.syncOwners.set(req, rec.id);
    this.syncQueue.enqueue(req);
  }

  /** Resolves when every queued capture sync has finished (tests, quit). */
  captureSyncsIdle(): Promise<void> {
    return this.syncQueue.idle();
  }

  broadcastSessions(): void {
    const sessions = this.listSessions();
    broadcast(EVT_SESSIONS_CHANGED, sessions);
    this.onSessionsBroadcast?.(sessions);
  }

  // -------------------------------------------------------------------------
  // Scrollback (Phase 12.3) — tmux copy-mode over the session's real history
  // -------------------------------------------------------------------------

  /**
   * Run one tmux command for the scroll controller.
   *
   * Over the CONTROL CLIENT while it is up: a wheel notch then costs ~1 ms
   * round trip, where spawning a `tmux` process costs ~20 ms — the difference
   * between scrolling and dragging a slideshow. One command per call: a
   * `;`-joined sequence emits one %begin/%end block per command and would
   * desync the control client's pending queue (measured on 3.6a).
   */
  private readonly runScrollCommand: tmux.TmuxScrollRunner = async (args) => {
    if (this.control.connected) {
      const lines = await this.control.sendCommand(
        args.map(tmux.quoteTmuxArg).join(' ')
      );
      return lines.join('\n');
    }
    return tmux.execTmux([...args]);
  };

  /**
   * Pane-addressable tmux target for a session: its live `$-id`, which is
   * also pane-addressable (`=name` is honored for target-SESSION resolution
   * but NOT for target-PANE resolution — see tmux/sessions.ts).
   *
   * F1: no binding means no target. Driving copy-mode through a name would
   * scroll whatever session happens to hold it.
   */
  private scrollTarget(sessionId: string): string {
    const live = this.liveIds.get(sessionId);
    if (live === undefined) {
      throw gmuxError(
        'SESSION_NOT_FOUND',
        'This session is not running right now.',
        sessionId
      );
    }
    return live;
  }

  async scrollState(
    input: TerminalScrollPollInput
  ): Promise<TerminalScrollState> {
    const target = this.scrollTarget(input.sessionId);
    return input.anchorFrom === undefined
      ? tmux.readPaneScroll(this.runScrollCommand, target)
      : tmux.anchorPaneScroll(this.runScrollCommand, target, input.anchorFrom);
  }

  async scrollBy(input: TerminalScrollByInput): Promise<TerminalScrollState> {
    return tmux.scrollPaneBy(
      this.runScrollCommand,
      this.scrollTarget(input.sessionId),
      input.lines
    );
  }

  async scrollTo(input: TerminalScrollToInput): Promise<TerminalScrollState> {
    return tmux.scrollPaneTo(
      this.runScrollCommand,
      this.scrollTarget(input.sessionId),
      input.position
    );
  }

  async scrollLive(sessionId: string): Promise<TerminalScrollState> {
    return tmux.exitPaneScroll(
      this.runScrollCommand,
      this.scrollTarget(sessionId)
    );
  }

  // -------------------------------------------------------------------------
  // Scrollback facts (Phase 13.7) — pull only, over the control client
  // -------------------------------------------------------------------------

  /**
   * What src/main/scrollback needs to answer a question, and nothing more.
   * `nameOf` doubles as the ownership test: a session on the private socket
   * that the manifest does not know is not the user's scrollback bill.
   */
  private scrollbackDeps(): ScrollbackServiceDeps {
    return {
      run: this.runScrollCommand,
      tmuxIdOf: (sessionId) => this.liveIds.get(sessionId) ?? null,
      nameOf: (tmuxId) => {
        const sessionId = this.byTmuxId.get(tmuxId);
        if (sessionId === undefined) return null;
        return this.manifest.getSession(sessionId)?.name ?? null;
      },
      snapshotsDir,
      settings: getSettings
    };
  }

  async scrollbackStats(): Promise<ScrollbackStats> {
    const stats = await readScrollbackStats(this.scrollbackDeps());
    // The disk thresholds ride the samples Settings just paid for, rather
    // than an hourly timer nobody asked for.
    this.scrollbackWatch.checkDisk(stats.saved.bytes, stats.diskFreeBytes);
    return stats;
  }

  async sessionScrollback(
    sessionId: string
  ): Promise<SessionScrollbackFacts | null> {
    return readSessionScrollback(this.scrollbackDeps(), sessionId);
  }

  async scrollbackReport(): Promise<string> {
    return buildScrollbackReport(this.scrollbackDeps());
  }

  // -------------------------------------------------------------------------
  // Sessions API (used by IPC handlers AND the smoke harness)
  // -------------------------------------------------------------------------

  listSessions(): Session[] {
    return this.manifest.listSessions().map(toSession);
  }

  listSessionRecords(): ManifestSessionRecord[] {
    return this.manifest.listSessions();
  }

  /**
   * ⌘T create. Manifest row is written BEFORE the tmux spawn (§2.4 Step 0);
   * on spawn failure the row is removed and the error surfaces to the UI.
   */
  async createSession(input: CreateSessionInput): Promise<Session> {
    if (input.name.trim().length === 0) {
      throw gmuxError('INVALID_INPUT', 'Session name cannot be empty.');
    }
    if (!isDirectory(input.projectPath)) {
      throw gmuxError(
        'PROJECT_NOT_FOUND',
        'The project folder for this session does not exist.',
        input.projectPath
      );
    }
    const cwd = input.cwd ?? input.projectPath;
    if (!isDirectory(cwd)) {
      throw gmuxError(
        'INVALID_INPUT',
        'The working directory for this session does not exist.',
        cwd
      );
    }

    // Bug A (Phase 9.2): resolve the agent binary to an ABSOLUTE path against
    // the captured login-shell PATH + known install dirs BEFORE anything is
    // written or spawned. Not found → typed error → friendly modal message —
    // never a dead pane. The manifest then stores only absolute paths (argv
    // AND resume_argv), so restores survive PATH drift too.
    let binPath: string | undefined;
    let bareName: string | undefined;
    if (input.agent !== 'shell') {
      // Phase 10 (settings+hotkeys stream): the binary name comes from the
      // agent REGISTRY, not the agent id — cursor's binary is `cursor-agent`,
      // antigravity's is `agy`. Unknown ids (never in the registry) keep the
      // id-as-binary behavior so nothing regresses.
      let bare: string = input.agent;
      try {
        bare = agentBinaryName(input.agent);
      } catch {
        /* not a registry id — legacy behavior */
      }
      const abs = await tmux.resolveBinary(bare);
      if (abs === null) {
        throw gmuxError(
          'AGENT_NOT_FOUND',
          `${bare} not found — install it, or make sure your shell PATH includes it.`,
          bare
        );
      }
      binPath = abs;
      bareName = bare;
    }

    const id = randomUUID();
    // resolveLaunchSpec (not buildLaunchSpec): cursor's id comes from a side
    // command that has to run BEFORE the pane exists.
    const spec = await resolveLaunchSpec(
      input.agent,
      input.extraArgs ?? [],
      binPath
    );
    // Phase 13: claude's deterministic hook channel. Purely a latency
    // upgrade over its pid file, so a failure to write the settings file
    // just means no flag — never a failed create (and never a `claude
    // --settings <missing>` that would refuse to start).
    if (input.agent === 'claude') {
      const settingsPath = ensureClaudeHookSettings(this.hookServer, id);
      if (settingsPath !== null) {
        spec.argv = withClaudeSettingsFlag(spec.argv, settingsPath);
        if (spec.resumeArgv !== undefined) {
          spec.resumeArgv = withClaudeSettingsFlag(spec.resumeArgv, settingsPath);
        }
      }
    }
    // Phase 15 — SpecStory capture. The wrap is applied to BOTH argvs and to
    // nothing else: `spec.argv` becomes `specstory run <provider> … -c "<the
    // same argv>"`, and an already-armed `resumeArgv` gets the identical
    // treatment, so a pre-assigned session (claude/gemini/pi) is armed
    // WRAPPED from the moment the row is written and a restore keeps
    // capturing without anyone having to remember to re-wrap it.
    //
    // A decline is never fatal and never silent: the session launches bare
    // and the sentence reaches the user (toast) and the log.
    let capture: SpecstoryCaptureRecord | undefined;
    let captureDeclined: string | null = null;
    if (input.capture === true && input.agent !== 'shell') {
      const wrapped = await wrapForCapture(input.agent, spec.argv);
      if (wrapped.argv !== null && wrapped.record !== null) {
        capture = wrapped.record;
        spec.argv = wrapped.argv;
        if (spec.resumeArgv !== undefined) {
          const resumeWrapped = wrapWithRecord(wrapped.record, spec.resumeArgv);
          if (resumeWrapped !== null) spec.resumeArgv = resumeWrapped;
        }
      } else {
        captureDeclined = wrapped.declined;
      }
    }

    // PHASE 21 (A8 + G6) — record the contract, not a pointer to the registry.
    //
    // Restore used to ask the LIVE registry whether this agent's resume needs
    // its original directory, and the registry answers for the agent Tortie
    // launches today. For an id it no longer launches the answer was `false`,
    // and for a pi shaped agent `false` means restore opens an empty session
    // that looks resumed. Everything restore reads for correctness is written
    // here instead, while it is still true.
    //
    // Three awaits, none of which spawns anything: the detection scan is
    // memoised for the life of the process and warmed at boot, and the two
    // realpath calls are one fs lookup each. The resolved cwd is recorded
    // because it is the store key for five of the eleven agents, so a moved
    // or re-cloned checkout is the difference between finding the
    // conversation and not.
    const agentVersion = await this.detectedAgentVersion(input.agent);
    const cwdReal = await realpath(cwd).catch(() => cwd);
    const projectReal = await realpath(input.projectPath).catch(
      () => input.projectPath
    );

    const now = Date.now();
    const record: ManifestSessionRecord = {
      id,
      name: input.name,
      // Predicted; replaced below with the name tmux actually applied
      // (dedupe may append “-2”).
      tmuxName: tmux.sanitizeSessionName(input.name),
      projectPath: input.projectPath,
      cwd,
      agent: input.agent,
      status: 'running',
      createdAt: now,
      argv: spec.argv,
      lastSeen: now,
      ...(spec.agentSessionId !== undefined
        ? { agentSessionId: spec.agentSessionId }
        : {}),
      ...(spec.resumeArgv !== undefined ? { resumeArgv: spec.resumeArgv } : {}),
      // Phase 13.5: say NOW whether this session will come back with its
      // conversation. Written with the row, before the process exists.
      resumeCapture: resumeCaptureFor(spec),
      ...(spec.env !== undefined ? { env: spec.env } : {}),
      ...(capture !== undefined ? { specstory: capture } : {}),
      // Phase 21 (A8 + G6). The three fields migration 008 adds, written with
      // the row, before the process exists — same moment and same transaction
      // as everything else a restore depends on.
      ...(agentVersion !== null ? { agentVersion } : {}),
      agentContract: buildRecoveryContract(
        input.agent,
        {
          // The AGENT's binary, never the SpecStory wrapper's. `binPath` is
          // set for every non-shell agent above or the create has already
          // thrown, so `spec.argv[0]` is only reached for a plain shell, and
          // a shell is never wrapped.
          bin: binPath ?? spec.argv[0] ?? input.agent,
          cwdReal,
          projectReal,
          agentVersion,
          at: now
        },
        spec
      ),
      // The launch half of the provenance chain. A harvesting agent has no id
      // yet, so this records the route and makes no claim; the watcher
      // replaces it with the evidence it actually had. See startIdCapture.
      resumeProvenance: launchProvenance(spec, {
        cwd: cwdReal,
        at: now,
        agentVersion
      })
    };

    // §2.4 Step 0: durability record exists BEFORE the process does — which
    // is exactly the window a concurrent reconcile must not judge (16.5.1).
    // Held until the row is bound to a live tmux id below.
    this.createsInFlight.set(id, now);
    faultPoint('create.before-declaration');
    this.manifest.insertSession(record);
    faultPoint('create.after-declaration');

    // F3 (Phase 12.7, research 21 §8) — LAUNCH BY BARE NAME. The manifest
    // keeps the absolute path (restores must survive PATH drift, Bug A), but
    // the absolute path in argv[0] is also what made a durable gmux agent the
    // ONE process on the machine that `pkill -f "$(command -v claude)"` hits,
    // while every ephemeral `claude` walked away. Bug A's real fix is the
    // login-shell PATH injected into the tmux server env (supervisor.ts), so
    // tmux's execvp resolves the bare name just as the user's own shell does.
    //
    // A CAPTURED session gets the same treatment ONE LEVEL IN: argv[0] is the
    // specstory binary (absolute — it is not on PATH when it is the bundled
    // copy), and the agent's own name lives inside the `-c` string, which is
    // exactly what `pkill -f` reads. So the bare name is substituted there
    // instead, and F3's protection survives the wrap.
    const launchArgv =
      bareName === undefined
        ? spec.argv
        : capture !== undefined
          ? relaunchWrapped(spec.argv, capture, bareName)
          : [bareName, ...spec.argv.slice(1)];

    let info: tmux.TmuxSessionInfo;
    try {
      info = await tmux.createSession({
        displayName: input.name,
        cwd,
        argv: launchArgv,
        env: { ...spec.env, ...tmux.managedPaneEnv(id) }
      });
    } catch (err) {
      // Spawn never happened — a lingering row would resurrect a session
      // the user never got.
      this.createsInFlight.delete(id);
      this.manifest.deleteSession(id);
      throw err;
    }

    faultPoint('create.after-spawn');

    this.liveIds.set(id, info.sessionId);
    this.byTmuxId.set(info.sessionId, id);
    this.createsInFlight.delete(id);
    // tmux may have deduped the name ("foo-2"), and `new-session -P -F`
    // hands back the pane pid — the F2 forensic anchor, recorded once here
    // because tmux forgets it the moment the dead pane is reaped.
    if (info.tmuxName !== record.tmuxName || info.panePid !== undefined) {
      this.manifest.updateSession(id, {
        ...(info.tmuxName !== record.tmuxName
          ? { tmuxName: info.tmuxName }
          : {}),
        ...(info.panePid !== undefined ? { panePid: info.panePid } : {})
      });
    }

    faultPoint('create.after-launch-record');

    // Mirror metadata into tmux user options so the durable server is
    // self-describing even if the manifest is lost (§2.4 Step 0.2).
    // Best-effort: a failed mirror must not fail the create.
    try {
      await tmux.setSessionOption(info.sessionId, '@gmux-id', id);
      faultPoint('create.after-identity-stamp');
      await tmux.setSessionOption(info.sessionId, '@gmux-agent', input.agent);
      if (spec.agentSessionId !== undefined) {
        await tmux.setSessionOption(
          info.sessionId,
          '@gmux-session-id',
          spec.agentSessionId
        );
      }
    } catch (err) {
      console.warn(
        `[gmux] could not mirror metadata into tmux options: ${(err as Error).message}`
      );
    }

    // Agents with no pre-assignment (codex, muse, qwen, deepseek,
    // antigravity): read the id back out of their store after spawn and
    // record the armed resume argv. The pane pid and tmux session id are the
    // correlation keys — qwen writes a descendant pid, muse writes the pane.
    if (spec.idCapture === 'store-harvest') {
      this.startIdCapture(
        id,
        input.agent,
        {
          cwd,
          sinceTs: now,
          tmuxSessionId: info.sessionId,
          ...(info.panePid !== undefined ? { panePid: info.panePid } : {})
        },
        input.extraArgs ?? [],
        { atCreate: true }
      );
    }

    // A capture the user asked for and did not get is said NOW, next to the
    // session it is about — the alternative is discovering an empty
    // .specstory/history days later and blaming SpecStory for it.
    if (captureDeclined !== null) {
      console.warn(`[gmux] ${captureDeclined} (session "${input.name}")`);
      broadcast(EVT_CAPTURE_NOTICE, {
        kind: 'declined',
        sessionId: id,
        sessionName: input.name,
        message: captureDeclined
      });
    }

    this.broadcastSessions();
    const stored = this.manifest.getSession(id);
    return toSession(stored ?? record);
  }

  /** F2 rename: tmux first (when live), manifest always, event loop confirms. */
  async renameSession(input: RenameSessionInput): Promise<Session> {
    if (input.name.trim().length === 0) {
      throw gmuxError('INVALID_INPUT', 'Session name cannot be empty.');
    }
    const rec = this.mustGetSession(input.sessionId);
    const target = this.liveIds.get(rec.id);
    let updated: ManifestSessionRecord;
    if (target !== undefined) {
      try {
        const applied = await tmux.renameSession(target, input.name);
        updated = this.manifest.renameSession(
          rec.id,
          input.name,
          applied.tmuxName
        );
      } catch (err) {
        if (!isGmuxError(err, 'SESSION_NOT_FOUND')) throw err;
        // Died between reconciles — rename the durable record anyway.
        updated = this.manifest.renameSession(
          rec.id,
          input.name,
          tmux.sanitizeSessionName(input.name)
        );
        this.scheduleRefresh();
      }
    } else {
      // Restorable/exited: manifest-only; the restore path re-dedupes.
      updated = this.manifest.renameSession(
        rec.id,
        input.name,
        tmux.sanitizeSessionName(input.name)
      );
    }
    this.broadcastSessions();
    return toSession(updated);
  }

  /** Kill: attach client, tmux session, then manifest status → 'exited'. */
  async killSession(sessionId: string): Promise<void> {
    const rec = this.mustGetSession(sessionId);
    const watch = this.idCaptureWatches.get(sessionId);
    if (watch !== undefined) {
      watch.cancel();
      this.idCaptureWatches.delete(sessionId);
    }
    this.attachHost.detach(sessionId);
    // F1 (research 21 §6): kill the session we can PROVE is this row's — the
    // `?? rec.tmuxName` that used to stand in here aimed kill-session at a
    // mutable, reusable NAME, and was reproduced destroying a live session
    // gmux never created. No live binding ⇒ nothing to kill; the row still
    // ends, because ending it is what the user asked for.
    const target = this.liveIds.get(sessionId);
    if (target !== undefined) {
      // Session-close snapshot (§2.4 Step 2 capture point) — best-effort,
      // BEFORE the pane disappears.
      if (rec.status !== 'exited' && rec.status !== 'restorable') {
        await captureSessionSnapshot(target, sessionId, {
          reason: 'session-close',
          session: snapshotRecipeOf(rec)
        }).catch(() => undefined);
      }
      await tmux.killSession(target); // idempotent — already-gone is fine
      this.byTmuxId.delete(target);
    }
    this.liveIds.delete(sessionId);
    this.manifest.setStatus(sessionId, 'exited');
    // kill-session is a SIGHUP, which `specstory run` does not handle at all —
    // without this the debounced tail of the conversation is simply lost.
    this.queueCaptureSync(rec);
    this.activity.forget(sessionId);
    this.hookServer.revoke(sessionId);
    broadcast(EVT_STATUS_CHANGED, sessionId, 'exited');
    this.broadcastSessions();
  }

  /** Remove a session row entirely (discard a restorable / smoke cleanup). */
  discardSession(sessionId: string): void {
    // The row is going, so its hold on its conversation goes with it. Anything
    // else would keep a discarded session's claim alive for the rest of the
    // run and stop a new session in that folder from recording an id. A row
    // that still exists keeps its claim, including an exited one, because a
    // restore of it resumes that conversation.
    releaseConversationClaims(sessionId);
    this.manifest.deleteSession(sessionId);
    const live = this.liveIds.get(sessionId);
    if (live !== undefined) this.byTmuxId.delete(live);
    this.liveIds.delete(sessionId);
    this.activity.forget(sessionId);
    this.hookServer.revoke(sessionId);
    // The row is gone — its snapshot and its hook settings are unreachable
    // garbage now.
    void deleteSnapshot(sessionId).catch(() => undefined);
    rm(claudeHookSettingsPath(sessionId), { force: true }).catch(
      () => undefined
    );
  }

  /** Start streaming a session into `sender` (visible pane mount). */
  async attachSession(sessionId: string, sender: WebContents): Promise<void> {
    const rec = this.mustGetSession(sessionId);
    if (rec.status === 'restorable' || rec.status === 'exited') {
      throw gmuxError(
        'SESSION_NOT_FOUND',
        'This session is not running right now.',
        `status: ${rec.status}`
      );
    }
    let target = this.liveIds.get(sessionId);
    if (target === undefined) {
      // Maps can lag one reconcile behind — resolve directly before failing,
      // BY IDENTITY (F1). Matching on the name here would stream a stranger's
      // session into this tab and let the user type into it.
      const live = await tmux.listSessions();
      const info = live.find((s) => s.gmuxId === sessionId);
      if (info === undefined) {
        this.scheduleRefresh();
        throw gmuxError(
          'SESSION_NOT_FOUND',
          'This session is no longer running.',
          rec.tmuxName
        );
      }
      target = info.sessionId;
      this.liveIds.set(sessionId, target);
      this.byTmuxId.set(target, sessionId);
    }
    // AttachHost prefixes '='; '=$n' strips to the immutable $-id (verified
    // against tmux 3.6a) — rename-proof addressing.
    this.attachHost.attach({
      sessionId,
      tmuxName: target,
      sender,
      cwd: rec.cwd
    });
  }

  detachSession(sessionId: string): void {
    this.lastGeometry.delete(sessionId);
    this.attachHost.detach(sessionId);
  }

  /**
   * The renderer re-fit a pane. Two things happen: the attach client is
   * resized (tmux follows its client), and — when the geometry ACTUALLY
   * changed — the activity monitor is told, so the repaint that follows is
   * scored as reflow rather than as the agent working (Phase 12.11; the rule
   * and its window live in activity/state-machine.ts).
   *
   * The change test is not an optimization: FitAddon fires on every observed
   * container resize, and a re-fit that lands on the same cols/rows repaints
   * nothing. Spending the grace window on it would blind the detector for no
   * reason.
   */
  resizeSession(input: ResizeInput): void {
    const geometry = `${String(input.cols)}x${String(input.rows)}`;
    const changed = this.lastGeometry.get(input.sessionId) !== geometry;
    this.lastGeometry.set(input.sessionId, geometry);
    this.attachHost.resize(input.sessionId, input.cols, input.rows);
    if (changed) this.activity.noteGeometryChange(input.sessionId);
  }

  // -------------------------------------------------------------------------
  // Projects API
  // -------------------------------------------------------------------------

  addProject(path: string): Project {
    const abs = resolvePath(path);
    if (!isDirectory(abs)) {
      throw gmuxError(
        'INVALID_INPUT',
        'That folder does not exist.',
        abs
      );
    }
    return this.manifest.upsertProject({
      id: randomUUID(),
      path: abs,
      name: basename(abs)
    });
  }

  listProjects(): Project[] {
    return this.manifest.listProjects();
  }

  removeProject(projectId: string): void {
    // Closing the tab also stops the repo watcher (Phase 4) — best-effort,
    // and BEFORE the row disappears so we still know the path.
    const project = this.manifest
      .listProjects()
      .find((p) => p.id === projectId);
    if (project !== undefined) {
      void unwatchGitRepo(project.path).catch(() => undefined);
    }
    this.manifest.deleteProject(projectId); // sessions keep their history
  }

  // -------------------------------------------------------------------------
  // Shutdown — attach clients die, tmux sessions all SURVIVE (T1 by design)
  // -------------------------------------------------------------------------

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.statusTimer !== null) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
    if (this.sessionsBroadcastTimer !== null) {
      clearTimeout(this.sessionsBroadcastTimer);
      this.sessionsBroadcastTimer = null;
    }
    // Stop the backup poll before the connection it fingerprints is closed.
    this.ringSchedule?.stop();
    for (const watch of this.idCaptureWatches.values()) watch.cancel();
    this.idCaptureWatches.clear();
    this.unwatchSettings?.();
    this.unwatchSettings = null;
    this.activity.dispose();
    this.hookServer.stop();
    this.attachHost.disposeAll();
    this.control.stop();
    try {
      this.manifest.close();
    } catch {
      /* double-close on quit is harmless */
    }
  }

  // -------------------------------------------------------------------------

  private mustGetSession(sessionId: string): ManifestSessionRecord {
    const rec = this.manifest.getSession(sessionId);
    if (!rec) {
      throw gmuxError('SESSION_NOT_FOUND', 'Session not found.', sessionId);
    }
    return rec;
  }
}

function isDirectory(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Core lifecycle — boot once, retry on demand after a failed boot
// ---------------------------------------------------------------------------

let corePromise: Promise<GmuxCore> | null = null;

/**
 * Boot (or return) the singleton core. A failed boot clears the cache so the
 * next call retries — e.g. after the user installs tmux and hits "Try again".
 */
export function getGmuxCore(): Promise<GmuxCore> {
  if (corePromise === null) {
    corePromise = GmuxCore.boot();
    corePromise.catch(() => {
      corePromise = null;
    });
  }
  return corePromise;
}

/**
 * Quit-time teardown. tmux sessions survive — that is the whole point.
 * Phase 6: scrollback snapshots are captured FIRST (app-quit capture point,
 * §2.4 Step 2), bounded so a sick tmux can never wedge quit.
 *
 * Phase 15 adds one more bounded wait: any SpecStory flush already queued —
 * from a session the user closed seconds before quitting — gets a few seconds
 * to finish. RUNNING captured sessions need nothing here: they are still
 * running, inside tmux, with their own `specstory run` alive. The deadline is
 * short on purpose (research 13 §3.3): losing the tail of one conversation is
 * a smaller failure than a Dock icon that will not go away.
 */
export async function shutdownGmuxCore(): Promise<void> {
  if (corePromise === null) return;
  const pending = corePromise;
  corePromise = null;
  try {
    const core = await pending;
    faultPoint('quit.before-snapshots');
    await Promise.race([
      core.snapshotAllSessions(),
      new Promise<void>((resolve) => setTimeout(resolve, 8_000))
    ]).catch(() => undefined);
    faultPoint('quit.after-snapshots');
    await Promise.race([
      core.captureSyncsIdle(),
      new Promise<void>((resolve) => setTimeout(resolve, SYNC_QUIT_TIMEOUT_MS))
    ]).catch(() => undefined);
    // Phase 20 item 2. Last, and before dispose closes the connection, so the
    // generation holds everything the quit itself wrote. It costs 21 ms, it
    // skips the five minute floor because there is no next tick, and it takes
    // nothing at all when the manifest has not changed.
    await core.takeManifestGenerationOnQuit().catch(() => null);
    core.dispose();
  } catch {
    /* boot never finished — nothing to tear down */
  }
}
