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
import { join, resolve as resolvePath } from 'node:path';
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
import { restoreShortfall } from '@shared/restore-status';
import type {
  ScrollbackStats,
  SessionScrollbackFacts
} from '@shared/scrollback';
import type {
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
  // PHASE 48. The structural preflight. It reads the first line of the file
  // the resolve just found and asks whether the interpreter that line names
  // is on the PATH the pane will get. It spawns nothing.
  checkAgentBinary,
  expandDirs,
  listDetectedAgents,
  // PHASE 49. The last RESOLVED scan, never a new one. The create path reads
  // this synchronously, so a create can never start a version probe and can
  // never wait on one.
  peekDetectedAgents,
  registryResumeArgv
} from '../agents';
// PHASE 23. One lookup, into the merged agent table, in memory. It is used to
// find a configured agent's binary NAME when the compiled registry has never
// heard of the id. It grants nothing: the confirm gate lives in
// src/main/manifest/agents.ts and is asked on the same create path.
import { agentEntry, launchableAgentEntry } from '../config/store';
// The durable writer's own failure type and its own out-of-space test
// (Phase 19 item 2). Do not write a second copy of either.
import { DurableWriteError, isOutOfSpace } from '../durable';
// Named crash points for the fault harness. A no-op on every launch that is
// not a harness launch — see fault/inject.ts.
import { faultPoint } from '../fault/inject';
import { unwatchGitRepo } from '../git';
import {
  agentHarvestsId,
  agentRescuesId,
  agentRescuesIdAfterExit,
  claimConversationId,
  conversationClaimant,
  conversationClaimStrength,
  harvestProvenance,
  ManifestStore,
  onConversationReclaimed,
  releaseConversationClaims,
  resolveClaimCwd,
  defaultManifestDbPath,
  prepareManifestForBoot,
  resolveLaunchSpec,
  SESSION_CONTRACT_VERSION,
  startManifestRing,
  toSession,
  watchForSessionId,
  type ConversationReclaim,
  type LiveTmuxSession,
  type ManifestRingSchedule,
  type ManifestSessionRecord,
  type RestoreAttemptRecord,
  type ResumeProvenance,
  type RingTakeResult,
  type SessionIdWatch
} from '../manifest';
// The one channel main uses to say a durability layer is degraded, and the
// owner of the once-per-run latch (Phase 19 item 9). Never broadcast a
// DurabilityNotice directly — the latch is the point of the module.
import { postDurabilityNotice } from '../notice';
// Phase 22 (research 29 §8.2). ADVISORY, and the import is one function that
// returns void so that nothing on either launch path can await it, fail on it
// or branch on it. See the module header for the four rules.
import { recordLaunchContext } from '../context/snapshot';
// LEAF restore modules only — ../restore/ipc imports this file (no cycles).
import { restoreRecordOf, restoreSessionInTmux } from '../restore/restore';
import {
  resolveRestoreJournal,
  type LiveIdentity
} from '../restore/journal';
import {
  captureSessionSnapshot,
  deleteSnapshot,
  savedOutputAt,
  snapshotsDir,
  type SnapshotReason
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
// Phase 69: the five options this boot re-asserts, selected by field from the one
// list the remote boot reads too, so the two cannot drift.
import { localReassertOptions } from '../tmux/server-options';
// PHASE 70. Sessions that live on another machine. This class ROUTES to them and
// owns none of their state: every remote row lives in src/main/machines, in that
// machine's own tmux server, and never in the manifest. The verbs below branch on
// which of the two a session id names, and nothing else in this file changed
// shape.
//
// The three imports are direct rather than through `../machines`, so this file's
// graph gains the exec plane and not the visible connection test, which is the
// one module there that spawns a pty.
import { isMachineConfirmed } from '../machines/confirm';
import { prepareMachine } from '../machines/prepare';
import {
  currentMachines,
  machineFieldsOf,
  machineHostKeysPath
} from '../machines/store';
import {
  forgetRemoteRow,
  isRemoteSessionId,
  markMachineQuiet,
  onRemoteSessionsChanged,
  projectRemoteRecord,
  readyRemoteContext,
  refuseRemoteRestore,
  remoteCreate,
  remoteKill,
  remoteRename,
  remoteSessionRow,
  remoteSessions,
  setRemotePollFocused,
  startRemotePoll,
  stopRemotePolls
} from '../machines/remote-sessions';
// PHASE 72. The manifest handle the machine layer writes remote rows through,
// and the verb behind the restore gate. Both are direct rather than through
// `../machines`, for the same reason the three imports above are.
import { setRemoteManifest } from '../machines/remote-record';
import { restoreRemoteSession } from '../machines/remote-restore';
import type { RemoteMachineContext } from '../machines/context';
import { gmuxError, isGmuxError } from '../errors';
import { broadcastEvent } from '../typed-events';
import { getLog } from '../log';
// LEAF import: the ../projects barrel re-exports the clone spawner and the
// folder creator, and addProject below needs one pure name rule.
import { projectNameForPath } from '../projects/name';

/**
 * Scope "sessions" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const sessionsLog = getLog('sessions');

// The pure launch and reconcile decisions (Phase 42 stage 5). This class is
// the orchestrator: it runs the execs and the writes, and asks these two
// modules what the launch or the judgement should be.
// PHASE 48. The last words of a dead pane, as one pure function beside this
// file. The reaper is its only caller.
import { exitDetailFrom } from './exit-detail';
import {
  agentExtrasOf,
  agentNotFoundMessage,
  bareNameFor,
  binaryCandidatesOf,
  interpreterMissingMessage,
  newSessionRecord,
  paneEnvFor,
  snapshotRecipeOf,
  spawnArgvFor
} from './launch-plan';
import {
  claimStrengthOf,
  identityProbeNeeded,
  identityProbeVerdict,
  listAttemptOutcome,
  LOCAL_MACHINE,
  restoredStatus,
  retainedBindings,
  snapshotFailureNotice,
  staleCreateIds,
  statusFlipActions,
  unreachableFlips,
  type MachineId,
  type UnwrittenSnapshot
} from './reconcile-plan';

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
 * Retry cadence while the local server is unreachable (Phase 67). Each retry
 * IS a fresh probe: the first one that completes flips the rows out of
 * 'unknown' through the ordinary reconcile, so recovery needs no extra path.
 * A fast-failing socket therefore probes at 0.5 Hz, and a hung one
 * serializes behind the 10 s exec timeout.
 */
const UNREACHABLE_RETRY_MS = 2_000;

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
 *
 * PHASE 69 moved the list itself to ../tmux/server-options.ts, where the remote
 * boot reads the same rows. `localReassertOptions()` returns these five, in this
 * order, selected by field rather than copied, so the two lists cannot drift. The
 * names, the values, the order and the `-g` flag below are what they were at
 * `ab94847`, and the local sequence is byte for byte unchanged.
 */

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
      sessionsLog.warn(
        `could not set history-limit: ${(err as Error).message}`
      );
    });
}

async function assertServerOptions(): Promise<void> {
  for (const row of localReassertOptions()) {
    await tmux
      .execTmux(['set-option', '-g', row.name, row.value])
      .catch((err: unknown) => {
        sessionsLog.warn(
          `could not set ${row.name}: ${(err as Error).message}`
        );
      });
  }
  await applyHistoryLimit(getSettings().scrollbackLines);
}

// ---------------------------------------------------------------------------
// The pure decisions (Phase 42 stage 5) — moved, not changed
//
// The launch and reconcile judgements this class used to hold inline live in
// ./launch-plan.ts and ./reconcile-plan.ts, where each has a direct unit
// test. The three that were already public API (Phases 19 and 29) are
// re-exported here so every existing import path keeps working.
// ---------------------------------------------------------------------------

export {
  claimStrengthOf,
  restoredStatus,
  snapshotFailureNotice,
  type UnwrittenSnapshot
} from './reconcile-plan';

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

  /** Phase 13: per-agent activity detection (src/main/activity). */
  readonly activity: SessionActivityMonitor;
  /** Loopback channel for injected agent hooks (claude only, §3). */
  readonly hookServer: GmuxHookServer;

  /** Depth last pushed to the server — see the settings subscription. */
  private appliedScrollbackLines = getSettings().scrollbackLines;
  private unwatchSettings: (() => void) | null = null;
  /**
   * Phase 32. Unsubscribes the reclaim handler registered in the
   * constructor; called in dispose() so a settle landing after teardown
   * cannot touch a closed manifest.
   */
  private unsubscribeReclaims: (() => void) | null = null;

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
    sessionsLog.warn(
      `specstory sync failed for ${rec?.name ?? sessionId ?? req.cwd}: ` +
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

  /**
   * Phase 70. Unsubscribes the remote-row listener registered in the
   * constructor, so a poll landing after teardown cannot broadcast.
   */
  private unsubscribeRemote: (() => void) | null = null;

  private refreshTimer: NodeJS.Timeout | null = null;
  /**
   * True while the local machine is unreachable (Phase 67). It exists for the
   * LOG only, so that a retry running every 2 s writes one line when the link
   * drops and one when it comes back, instead of a line every 2 s for as long
   * as the outage lasts. No status is ever read from it.
   */
  private localUnreachable = false;
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
    // PHASE 72. The machine layer writes remote session rows through this one
    // handle rather than opening a second connection to a database this process
    // already holds open for writing. It is taken away again in dispose(), so a
    // poll landing after teardown cannot write to a closed manifest.
    setRemoteManifest(manifest);
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
    // Phase 32. When a session PROVES a conversation another session had
    // only guessed, the loser's row is corrected here: id withdrawn, watch
    // re-armed. Fired synchronously inside the winner's accept, before the
    // winner's own settle resolves, so at no observable moment do two rows
    // carry the same conversation id.
    this.unsubscribeReclaims = onConversationReclaimed((ev) => {
      this.handleConversationReclaim(ev);
    });
    // Phase 70. A poll of a machine, a remote create, a rename and a kill all
    // change what the list holds, and none of them touches the manifest, so the
    // ordinary reconcile would never notice. One subscription, and the same
    // coalescing broadcast every local flip already uses.
    this.unsubscribeRemote = onRemoteSessionsChanged(() => {
      this.scheduleSessionsBroadcast();
    });
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
   * neither exited, restorable nor unknown AND currently mapped to a live
   * tmux id. 'unknown' is skipped (Phase 67) because the binding is kept
   * through an unreachable spell on purpose, and polling a server Tortie
   * cannot see would only produce noise.
   */
  private activitySessions(): ActivitySession[] {
    const out: ActivitySession[] = [];
    for (const rec of this.manifest.listSessions()) {
      if (
        rec.status === 'exited' ||
        rec.status === 'restorable' ||
        rec.status === 'unknown'
      ) {
        continue;
      }
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
   *
   * 'unknown' is in the skip set (Phase 67): only a completed list may move
   * a row out of 'unknown'. An activity verdict computed while the server was
   * unreachable can arrive late, and writing it over 'unknown' would claim a
   * liveness the boundary just said it cannot back.
   */
  private applyDetectedStatus(sessionId: string, status: SessionStatus): void {
    const rec = this.manifest.getSession(sessionId);
    if (
      !rec ||
      rec.status === 'exited' ||
      rec.status === 'restorable' ||
      rec.status === 'unknown'
    ) {
      return;
    }
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
      sessionsLog.warn(
        `preparing the manifest failed: ${(err as Error).message}`
      );
    });
    const core = new GmuxCore(new ManifestStore(dbPath));
    try {
      await core.control.start();
    } catch (err) {
      // Control client reconnects on its own; boot proceeds — the manifest
      // and one-shot tmux commands still work without the event bus.
      sessionsLog.warn(
        `control client failed to start (will retry): ${(err as Error).message}`
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
      sessionsLog.warn(
        `initial refresh failed (showing last known sessions): ${(err as Error).message}`
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
    // Phase 21 (A8), rewired in Phase 49. Warm the agent detection scan so
    // the create path can record the agent's version without waiting for one.
    // It is the same memoised scan the renderer asks for at startup, so this
    // adds no probes to a normal launch. Unawaited, and a failure is nothing:
    // the version is then recorded as unknown, which is what it is. The
    // create path reads `peekDetectedAgents()` synchronously and never awaits
    // a scan, so this warm is what makes the answer almost always present
    // before a human can press Create.
    void listDetectedAgents().catch(() => undefined);
    // Phase 13.7 — one disk check, off the boot path. Boot is the moment
    // "sessions may not be saved when you quit" can still be acted on, and
    // this is deliberately the ONLY unprompted sample: the alternative was an
    // hourly timer, which is a dashboard's heartbeat with no dashboard.
    setTimeout(() => {
      void core.scrollbackStats().catch(() => undefined);
    }, 5_000).unref?.();
    // PHASE 70. The first of the three moments Tortie signs in to a machine,
    // being the app launching. The other two are the Mac waking and a person
    // pressing a control that needs that machine. A file changing is never one
    // of them, which is the line refusal 8 draws, and `machines:reload` starts
    // zero processes.
    //
    // Unawaited, because a machine that is asleep must not hold up the window,
    // and every failure inside it is one log line.
    void core.signInToConfirmedMachines();
    return core;
  }

  /**
   * Sign in to every confirmed machine and start its poll (Phase 70).
   *
   * An unconfirmed row, a row whose execution bearing fields moved since the
   * confirmation and a row whose seal cannot be read all refuse inside
   * `prepareMachine`, before any process exists. A machine running a tmux
   * version nobody measured refuses there too, and nothing is started on it.
   *
   * Sequential rather than parallel. A person with a fleet would otherwise open
   * every connection at once at launch, and the first poll of the first machine
   * is what they are waiting to see.
   */
  private async signInToConfirmedMachines(): Promise<void> {
    for (const row of currentMachines().rows) {
      const fields = machineFieldsOf(row);
      if (!isMachineConfirmed(row.id, fields)) continue;
      try {
        const result = await prepareMachine({
          machineId: row.id,
          fields,
          tortieHostKeys: machineHostKeysPath()
        });
        if (result.class !== 'prepared') {
          sessionsLog.warn(
            `${row.id} answered ${result.class} at launch: ${result.detail}`
          );
          markMachineQuiet(row.id);
          continue;
        }
        await startRemotePoll(row.id);
      } catch (err) {
        sessionsLog.warn(
          `signing in to ${row.id} failed: ${(err as Error).message}`
        );
        markMachineQuiet(row.id);
      }
    }
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
      // 'discarded' skips too (Phase 29): remove deleted this session's
      // settings file on purpose, and boot must not recreate it. The id stays
      // in `known`, so the sweep below leaves nothing to re-delete either.
      if (
        rec.agent !== 'claude' ||
        rec.status === 'exited' ||
        rec.status === 'discarded'
      ) {
        continue;
      }
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
      sessionsLog.warn(`control client: ${err.message}`);
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
    // PHASE 70. AN UNEXPECTED EXIT ON A REMOTE CLIENT MEANS THE LINK WENT, NOT
    // THAT THE SESSION ENDED. The keepalive pair on every connection ends the
    // sign in program about 19 s to 20 s after a far side stops answering, which
    // ends the pty. The session on that machine is untouched, its agent is still
    // running, and its output is still being absorbed there. So the row goes to
    // 'unknown' through the machine's own answering flag, and the next poll that
    // completes moves it back. Marking it ended here would offer Restore over an
    // agent that is still working, which is the Phase 67 defect in a new place.
    if (isRemoteSessionId(sessionId)) {
      const row = remoteSessionRow(sessionId);
      if (row !== null) markMachineQuiet(row.machineId);
      return;
    }
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

  /**
   * The installed version of `agent`, or null when nothing can say yet.
   *
   * SYNCHRONOUS SINCE PHASE 49, and that is the point. `peekDetectedAgents()`
   * returns the last RESOLVED scan and never starts one, so a create can
   * never start a version probe and can never wait on one. The boot warm
   * above starts the scan early; the one create that races it records
   * agent_version NULL on its row, exactly as the harvest path has always
   * tolerated. The column is nullable and nothing on the restore path reads
   * it for correctness (Phase 21 recorded the contract on the row instead).
   *
   * The manifest records the SpecStory wrapper's version already, explicitly
   * so a restore after a mid-flight upgrade replays the same binary. The agent
   * is the thing whose resume semantics actually change, and five of nine
   * installed agents drifted in the three days between research 30 being
   * written and being re-measured, so this is the version that matters more.
   */
  private cachedAgentVersion(agent: LaunchableAgentKind): string | null {
    if (agent === 'shell') return null;
    return (
      peekDetectedAgents()?.agents.find((a) => a.id === agent)?.version ?? null
    );
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
            sessionsLog.warn(
              `${agent} resume for "${rec.name}" could not keep ` +
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
          sessionsLog.warn(
            `${agent} resume id ${harvested.sessionId} matched on ` +
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
        sessionsLog.warn(`${agent} session-id harvest: ${(err as Error).message}`);
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
      // Phase 29: a tombstone claims nothing. Remove released the claim on
      // purpose, and a tombstone re-claiming its conversation at the next
      // boot would block a new session in that folder from recording the id.
      if (rec.status === 'discarded') continue;
      if (rec.agentSessionId === undefined) continue;
      // Phase 32 (strength extracted to claimStrengthOf in Phase 29): a row
      // armed by a grace GUESS must stay reclaimable across restarts. Phase
      // 34 added the middle rung, so a folder match is takeable here too, and
      // the row's cwd travels with the claim because that is what decides
      // whether another session's folder match may take it.
      if (
        claimConversationId(
          rec.agentSessionId,
          rec.id,
          claimStrengthOf(rec),
          rec.cwd
        )
      ) {
        continue;
      }
      // Two rows already record one conversation. This build cannot make that
      // happen any more, and it cannot undo one that a previous build wrote:
      // there is no way to know which row is right. It is said out loud
      // because restoring both resumes the same conversation twice, and that
      // is worth knowing before it surprises someone. MEASURED in the T1 smoke
      // profile the moment this landed: codex-1 and codex-2 both carry
      // 019febf5-e7fa-7e32-8fd5-c4a56e10a859.
      sessionsLog.warn(
        `sessions ${String(conversationClaimant(rec.agentSessionId))} ` +
          `and ${rec.id} both record ${rec.agent} conversation ` +
          `${rec.agentSessionId}. Restoring both resumes the same conversation.`
      );
    }
    for (const rec of this.manifest.listSessions()) {
      // Phase 29: never rescue an id for a tombstone. A rescue watch would
      // write a conversation id onto a row the user removed.
      if (rec.status === 'discarded') continue;
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
            // Resolved, because `HarvestContext.cwd` is the store key for pi
            // and qwen and the folder every ownership rule compares. The row
            // keeps the folder the user chose, which can be a symlink to the
            // folder another row spells directly.
            { cwd: resolveClaimCwd(rec.cwd), sinceTs: rec.createdAt },
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
          cwd: resolveClaimCwd(rec.cwd),
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

  /**
   * Correct the loser of a conversation reclaim (Phase 32).
   *
   * Another session PROVED, by its own agy process holding the record open,
   * that a conversation id this row carries was a wrong grace guess. The map
   * in the watcher was already corrected before this fired; what is left is
   * the durable side: withdraw the id from the row, record why, and give the
   * loser a fresh watch so it finds its OWN conversation on its own first
   * turn.
   *
   * ORDERING GUARANTEE. This runs synchronously inside the winner's accept,
   * before the winner's settle resolves, and better-sqlite3 writes are
   * synchronous. The winner's own `setAgentSessionId` happens in its watch's
   * `.then()` AFTER this returns, so at no observable moment do two manifest
   * rows carry the same conversation id.
   */
  private handleConversationReclaim(ev: ConversationReclaim): void {
    try {
      if (this.disposed) return;
      const rec = this.manifest.getSession(ev.from);
      // The row is gone, or it no longer carries the reclaimed id (a test
      // claimant, or a row corrected already). The claim map was fixed in
      // the watcher; there is nothing durable to correct.
      if (rec === undefined || rec.agentSessionId !== ev.conversationId) return;
      const prior = rec.resumeProvenance;
      // The correction keeps the withdrawn guess's own evidence: those
      // fields describe the guess being taken back, and losing them would
      // erase the only record of how the wrong id got there.
      const provenance: ResumeProvenance = {
        v: SESSION_CONTRACT_VERSION,
        source: prior?.source === 'boot-rescue' ? 'boot-rescue' : 'store-harvest',
        confidence: 'none',
        at: ev.at,
        cwd: prior?.cwd ?? rec.cwd,
        ...(prior?.key !== undefined ? { key: prior.key } : {}),
        ...(prior?.keyConfidence !== undefined
          ? { keyConfidence: prior.keyConfidence }
          : {}),
        ...(prior?.viaGraceTimer !== undefined
          ? { viaGraceTimer: prior.viaGraceTimer }
          : {}),
        ...(prior?.rivals !== undefined ? { rivals: prior.rivals } : {}),
        ...(prior?.contestedByWatches !== undefined
          ? { contestedByWatches: prior.contestedByWatches }
          : {}),
        ...(prior?.sameCwdWatches !== undefined
          ? { sameCwdWatches: prior.sameCwdWatches }
          : {}),
        ...(prior?.storePath !== undefined ? { storePath: prior.storePath } : {}),
        reclaimedBy: ev.to,
        reclaimedAt: ev.at
      };
      const live = this.liveIds.get(ev.from);
      const state: ResumeCapture =
        live !== undefined &&
        rec.agent !== 'shell' &&
        agentHarvestsId(rec.agent)
          ? 'capturing'
          : 'unavailable';
      this.manifest.clearAgentSessionId(ev.from, state, provenance);
      if (live !== undefined) {
        // Best effort: the tmux marker carried the wrong id too.
        void tmux
          .setSessionOption(live, '@gmux-session-id', '')
          .catch(() => undefined);
      }
      if (live !== undefined && rec.agent !== 'shell') {
        // The watch guard passes: the loser's old watch settled when its
        // grace timer accepted, and a settled watch deletes its entry. The
        // re-armed watch confirms the loser's OWN record the moment its agy
        // takes a turn, because its agy holds those descriptors.
        this.startIdCapture(
          ev.from,
          rec.agent,
          {
            cwd: resolveClaimCwd(rec.cwd),
            sinceTs: rec.createdAt,
            tmuxSessionId: live,
            ...(rec.panePid !== undefined ? { panePid: rec.panePid } : {})
          },
          agentExtrasOf(rec),
          { atCreate: false }
        );
      }
      this.broadcastSessions();
      // Phase 34: the line names the winner's evidence, because the ladder
      // now has three rungs and "reclaimed" alone does not say which one
      // took it. The operator reads this through Copy Diagnostics.
      const winner = conversationClaimStrength(ev.conversationId);
      const evidence =
        winner === 'confirmed'
          ? 'The winner proved ownership with an identity key.'
          : 'The winner matched the folder the record names.';
      sessionsLog.warn(
        `${rec.agent} conversation ${ev.conversationId} moved from session ` +
          `${ev.from} to ${ev.to}. ${evidence} The losing row was cleared and ` +
          `its watch was ${
            live !== undefined
              ? 'restarted'
              : 'not restarted, because the session has no live pane'
          }.`
      );
    } catch (err) {
      sessionsLog.warn(
        `conversation reclaim correction failed for ${ev.from}: ` +
          `${(err as Error).message}`
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
      // 'unknown' is skipped with the two dead statuses (Phase 67): capturing
      // a pane on a server Tortie cannot reach only produces noise, and the
      // session may still be alive to capture itself later.
      if (
        rec.status === 'exited' ||
        rec.status === 'restorable' ||
        rec.status === 'unknown'
      ) {
        continue;
      }
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
          sessionsLog.warn(
            `snapshot failed for "${rec.name}": ${(err as Error).message}`
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
    sessionsLog.warn(
      `${notice.sessions} session(s) were not saved` +
        `${notice.outOfSpace ? ' because the volume is full' : ''}: ` +
        unwritten.map((one) => one.name).join(', ')
    );
    postDurabilityNotice(notice);
  }

  /**
   * One remote row as it currently reads, for a caller that is not going to act
   * (Phase 72 fix round).
   *
   * The answer a second press of Restore gets while the first is still running.
   * It is the same shape the local path returns in the same situation, being
   * the row as it stands, so the surface re-renders and nothing is started.
   */
  private remoteSessionOrRecord(sessionId: string): Session {
    const drawn = this.listSessions().find((one) => one.id === sessionId);
    if (drawn !== undefined) return drawn;
    return toSession(this.mustGetSession(sessionId));
  }

  /**
   * Restore a 'restorable' or 'exited' session (§2.4 Step 3): recreate it in
   * tmux with $SHELL, replay the scrollback snapshot as inert history, and
   * TYPE the recorded resume command without Enter (armed). Idempotent for
   * sessions that are already live again.
   *
   * 'exited' is accepted since Phase 26.3. An ended session's row survives
   * with its resume argv, and both the manual end and the reaper capture a
   * snapshot before anything is killed, so the same machinery that brings a
   * session back after a reboot brings one back after an end. Main does not
   * check that material exists: the restore path is already honest about
   * missing pieces (shell_only / transcript / armed, with recorded
   * failures), and the renderer's material rule is what keeps the OFFERED
   * verb truthful. A failed restore leaves the row exactly the status it
   * had, so an exited row that fails to come back still reads 'exited' and
   * never claims running.
   *
   * 'discarded' is accepted since Phase 29 (Past Sessions). Remove deleted
   * the snapshot generations, so the replay finds no capsule and the outcome
   * records that honestly; the claude hook settings rewrite below recreates
   * the file remove deleted; and the conversation claim remove released is
   * re-acquired above the journal write. A failed restore leaves the row
   * 'discarded', still in the panel.
   *
   * The status it stores is DERIVED from the stage the restore reached, never
   * assigned (Phase 19 item 6). See {@link restoredStatus} for why `running`
   * is not one of the answers.
   */
  async restoreSession(sessionId: string): Promise<Session> {
    // PHASE 72, and it is the first branch on purpose. A session on another
    // machine takes a different path entirely: a different composer, a
    // different transport, a different set of conditions in front of it, and
    // none of the local machinery below it.
    //
    // Phase 70 refused every remote row on this line. The gate is asked now
    // instead of answering no, so a row it refuses gets its own sentence with
    // nothing composed and nothing sent, and a row it offers goes somewhere.
    // The local path is unchanged and is asked the same question below.
    const remoteRow = this.manifest.getSession(sessionId);
    if (
      isRemoteSessionId(sessionId) ||
      (remoteRow?.machineId !== undefined && remoteRow.machineId !== LOCAL_MACHINE)
    ) {
      // PHASE 72 FIX ROUND. THE DOUBLE PRESS GUARD COMES FIRST, before the gate
      // and before anything is composed.
      //
      // It used to sit below this branch, so two presses on one remote row both
      // passed the gate and both went on to compose a create. The window
      // between them is several seconds wide, because the restore re-asserts
      // the machine's own session server before it creates anything, and the
      // only thing refusing the second create was that machine's own rule about
      // duplicate session names. A rule on the far side is not a decision
      // Tortie made, and a rename between the two presses would have removed it.
      if (this.restoresInFlight.has(sessionId)) {
        return this.remoteSessionOrRecord(sessionId);
      }
      this.restoresInFlight.add(sessionId);
      try {
        refuseRemoteRestore(sessionId);
        const outcome = await restoreRemoteSession(sessionId);
        this.broadcastSessions();
        return outcome.session;
      } finally {
        this.restoresInFlight.delete(sessionId);
      }
    }
    refuseRemoteRestore(sessionId);
    const rec = this.mustGetSession(sessionId);
    // 'discarded' is accepted since Phase 29: a Past Sessions restore is the
    // undo of a Remove, and everything below the gate already works for it.
    if (
      rec.status !== 'restorable' &&
      rec.status !== 'exited' &&
      rec.status !== 'discarded'
    ) {
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
      // Phase 29: re-acquire the conversation claim a Remove released. For a
      // row that never lost its claim this is a no-op (the holder asking
      // again is true). The refusal warns and proceeds, exactly as the boot
      // claim loop does: refusing the restore would make a removal
      // permanently blocking, which is a second loss.
      if (
        rec.agentSessionId !== undefined &&
        !claimConversationId(
          rec.agentSessionId,
          rec.id,
          claimStrengthOf(rec),
          rec.cwd
        )
      ) {
        sessionsLog.warn(
          `sessions ${String(conversationClaimant(rec.agentSessionId))} ` +
            `and ${rec.id} both record ${rec.agent} conversation ` +
            `${rec.agentSessionId}. Restoring both resumes the same conversation.`
        );
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
        // No session was created, so the row keeps the status it already has:
        // 'restorable', or 'exited' for an ended session (Phase 26.3), which
        // honestly keeps offering the same verbs it offered before the
        // attempt. Writing a live status here would be this item's own defect
        // pointed the other way. The commit is durable (Phase 20 item 4) and
        // deliberately does not touch `lastSeen`, because nothing was
        // confirmed alive.
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
        sessionsLog.warn(
          `could not mirror metadata after restore: ${(err as Error).message}`
        );
      }

      this.manifest.finishRestoreAttempt(attempt, result.kind);
      attemptId = null;

      // Phase 22 (research 29 §8.2 rule 3): a restore RE-SNAPSHOTS. The
      // session that just came back genuinely re-read its configuration, so
      // carrying the record from its first launch forward would be a lie with
      // a timestamp on it. This overwrites the old record, which is the one
      // case where the snapshot is not write once.
      //
      // Placed after the journal is closed, and not awaited, for the same
      // reason as the create path: everything that decides whether the
      // conversation came back has already been committed above it.
      recordLaunchContext(this.manifest, {
        sessionId,
        reason: 'restore',
        agent: rec.agent,
        cwd: rec.cwd
      });

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
          sessionsLog.warn(
            `could not close the restore journal entry: ${(err as Error).message}`
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
    sessionsLog.warn(`restore of "${rec.name}" (${result.kind}): ${shortfall}`);
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

  /**
   * `delayMs` defaults to the debounce every caller has always had. The one
   * caller that passes anything else is the unreachable boundary, which
   * retries at {@link UNREACHABLE_RETRY_MS}. A refresh already scheduled is
   * left alone whichever delay it carries.
   */
  scheduleRefresh(delayMs: number = REFRESH_DEBOUNCE_MS): void {
    if (this.disposed || this.refreshTimer !== null) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh().catch((err: unknown) => {
        sessionsLog.warn(`refresh failed: ${(err as Error).message}`);
      });
    }, delayMs);
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
      if (identityProbeNeeded(info, known, this.foreignTmuxIds)) {
        const fromEnv = await tmux.getSessionEnv(
          info.sessionId,
          'GMUX_SESSION_ID'
        );
        const verdict = identityProbeVerdict(fromEnv, known);
        if (verdict.kind === 'adopted') {
          gmuxId = verdict.gmuxId;
          // Re-stamp the option so the next refresh needs no extra exec.
          void tmux
            .setSessionOption(info.sessionId, '@gmux-id', verdict.gmuxId)
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
   * and broadcast the refreshed list.
   *
   * A failed list is judged by {@link tmux.serverProbeVerdict} (Phase 67,
   * research 51 §4.3). Only a COMPLETED probe that confirmed death, meaning
   * the client itself ran to completion and reported that nothing owns the
   * socket, reconciles against the empty list and flips rows to 'restorable'
   * (the T2 path). Every other failure, e.g. a timeout, a permission error
   * or a missing socket file, proves nothing about the server, so the rows
   * are marked 'unknown' instead and a retry is scheduled. The old behavior
   * read both cases as death, and one hiccup offered Restore on every
   * session while the agents were still running.
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
      const outcome = listAttemptOutcome(tmux.serverProbeVerdict(err));
      if (outcome.kind === 'unreachable') {
        this.markMachineUnreachable(LOCAL_MACHINE, snapshotAt, err);
        return;
      }
      liveInfos = []; // a completed probe confirmed death — the T2 path
    }
    // Past the boundary, so this list COMPLETED, whichever answer it gave.
    if (this.localUnreachable) {
      this.localUnreachable = false;
      sessionsLog.warn(
        `${LOCAL_MACHINE} session server reachable again. ` +
          `The reconcile below is what moves the rows out of unknown`
      );
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
    for (const [sessionId, tmuxId] of retainedBindings(
      result.skipped.map(({ record }) => record.id),
      previousLive,
      new Set(this.byTmuxId.keys())
    )) {
      this.liveIds.set(sessionId, tmuxId);
      this.byTmuxId.set(tmuxId, sessionId);
    }

    if (result.unknownTmuxNames.length > 0) {
      console.log(
        `[gmux] live tmux sessions with no manifest row (ignored): ` +
          result.unknownTmuxNames.join(', ')
      );
    }

    // Cheap per-session status events for flips the reconcile produced. The
    // capture-sync backstop rides the same judgement — see statusFlipActions
    // for the Phase 15 rule and why a flip FROM 'exited' is not a death.
    for (const rec of this.manifest.listSessions()) {
      const actions = statusFlipActions(before.get(rec.id), rec.status);
      if (actions.broadcast) {
        broadcast(EVT_STATUS_CHANGED, rec.id, rec.status);
        if (actions.captureSync) this.queueCaptureSync(rec);
      }
    }
    this.broadcastSessions();

    // Phase 6/13.5: harvesting sessions that outlived a gmux restart
    // mid-capture get their watch re-armed (no-op once the id is recorded).
    this.resumeIdHarvests();
  }

  /**
   * One machine could not be reached and its death was NOT confirmed
   * (Phase 67, research 51 §4.3 and §4.4; the machine argument is Phase 71).
   *
   * PER MACHINE, AND THAT IS THE PHASE 71 CHANGE. It moves the rows whose own
   * `machine_id` names `machine` and no other row at all. A link that dropped to
   * one machine says nothing about the sessions on another, and before this the
   * judgement was taken over every row in the manifest because there was only
   * ever one machine for them to be on. This release still writes only `local`
   * into that column, so today the filter selects everything it used to select.
   * It is here now, with a test, because the rung that starts writing other
   * values must not also be the rung that discovers the boundary was missing.
   *
   * Every row that still CLAIMS liveness is written 'unknown'. That is the
   * one honest answer available, because the sessions may be running and
   * Tortie cannot currently see them. The rules this method holds to, and the
   * reason for each:
   *
   *  - `lastSeen` is not touched. Nothing was seen. `manifest.setStatus`
   *    stamps `lastSeen` with the current time, so this writes the status
   *    through `updateSession` instead. A bumped `lastSeen` would also make
   *    the next reconcile treat the row as newer than its own evidence and
   *    skip judging it.
   *  - `liveIds` and `byTmuxId` are left intact. They answer "which tmux
   *    session do I attach to", and during a lost link that answer is still
   *    correct. The next completed reconcile rebuilds them from identity.
   *  - No capture sync runs. A capture sync is the death backstop, and this
   *    is not a death. The later flip from 'unknown' to 'restorable' happens
   *    on the reconcile path, where `statusFlipActions` fires the backstop
   *    exactly once, at the moment death is confirmed.
   *  - No notice and no notification. The dimmed rows and the condition bar
   *    in the renderer are the whole signal.
   *
   * A retry is scheduled at {@link UNREACHABLE_RETRY_MS}. Each retry IS a
   * fresh probe, so recovery needs no separate path: the first list that
   * completes flips these rows out of 'unknown' through the ordinary
   * reconcile, to 'running' if they are alive and to 'restorable' if the
   * completed probe reports no server.
   *
   * ONE FAILURE SHAPE DOES NOT HEAL ON THIS TIMER, and it is worth naming.
   * MEASURED 2026-08-17 with tmux 3.6a: a socket file that does not exist
   * prints "error connecting to <path> (No such file or directory)", which is
   * byte-identical to what a LIVE server whose socket file was deleted
   * prints, so neither can confirm death and both stay 'unknown' however many
   * times they are retried. The control client heals that one instead. Its
   * reconnect loop (500 ms to 10 s) re-runs `ensureServer`, a new server comes
   * up on the socket, and the next list then COMPLETES with zero sessions,
   * which is a listed empty result rather than a failed probe.
   */
  private markMachineUnreachable(
    machine: MachineId,
    snapshotAt: number,
    err: unknown
  ): void {
    const flips = unreachableFlips(
      this.manifest.listSessions(),
      machine,
      snapshotAt,
      new Set([...this.createsInFlight.keys(), ...this.restoresInFlight])
    );
    for (const id of flips) {
      try {
        this.manifest.updateSession(id, { status: 'unknown' });
      } catch (writeErr) {
        sessionsLog.warn(
          `could not mark ${id} unreachable: ${(writeErr as Error).message}`
        );
        continue;
      }
      broadcast(EVT_STATUS_CHANGED, id, 'unknown');
    }
    // Once when the link drops, and again only if a later retry finds more
    // rows to mark. A retry that changes nothing says nothing.
    if (!this.localUnreachable || flips.length > 0) {
      sessionsLog.warn(
        `${machine} session server unreachable and its death is not ` +
          `confirmed. ${flips.length} sessions marked unknown. ` +
          `The list failed with "${(err as Error).message}"`
      );
    }
    this.localUnreachable = true;
    if (flips.length > 0) this.broadcastSessions();
    this.scheduleRefresh(UNREACHABLE_RETRY_MS);
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
      sessionsLog.warn(
        `could not read the restore journal: ${(err as Error).message}`
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
      sessionsLog.warn(r.note);
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
        sessionsLog.warn(
          `could not close restore attempt ${r.attemptId}: ${(err as Error).message}`
        );
      }
    }
  }

  /**
   * Forget creates that can no longer be in progress. See staleCreateIds in
   * ./reconcile-plan for the rule and the reason the map is timestamped.
   */
  private pruneStaleCreates(): void {
    const stale = staleCreateIds(
      this.createsInFlight,
      Date.now(),
      CREATE_IN_FLIGHT_MAX_MS
    );
    for (const id of stale) this.createsInFlight.delete(id);
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
    // Phase 70: the remote cadence moves with the local one, 5 s in front and
    // 30 s behind. Those two numbers are CHOSEN rather than measured, and the
    // create sheet says so, because nobody has measured what they cost over a
    // tailnet with real packet loss.
    setRemotePollFocused(focused);
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
   *
   * Phase 48 records a third thing: the last five non-empty lines the pane
   * printed. An agent that starts and then exits says why on its way out, and
   * this method used to destroy that text about one second later and leave
   * the user with a number. The text comes from the snapshot capture below,
   * which already reads it, so nothing new is spawned and the pane is not
   * read twice.
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
    // A holder rather than a bare `let`, because a value assigned inside a
    // callback is not something the compiler can follow through the await
    // below.
    const captured: { text: string | null } = { text: null };
    if (target !== undefined) {
      await captureSessionSnapshot(target, sessionId, {
        reason: 'session-death',
        session: snapshotRecipeOf(rec),
        // Phase 48. The capture is already holding the pane's text and is
        // about to keep only the parts a replay needs. This sink is where the
        // reaper takes its copy.
        onPaneText: (text) => {
          captured.text = text;
        }
      }).catch(() => undefined);
      await tmux.killSession(target).catch(() => undefined);
      this.byTmuxId.delete(target);
    }
    this.liveIds.delete(sessionId);
    // One write, not two: the detail goes into the same patch that already
    // carries the status and both halves of the cause.
    //
    // THE DETAIL IS ALWAYS STATED, and `null` is how "nothing" is stated
    // (Phase 48 fix round). Omitting the field left the previous death's
    // sentence on a row that reconcile had flipped back to 'running' and that
    // then died a second time in silence, so the user read the first death's
    // words under the second death's exit code.
    const exitDetail =
      captured.text === null ? null : (exitDetailFrom(captured.text) ?? null);
    this.manifest.updateSession(sessionId, {
      status: 'exited',
      lastSeen: Date.now(),
      exitDetail,
      ...(exitCode !== undefined ? { exitCode } : {}),
      ...(deadSignal !== undefined ? { exitSignal: deadSignal } : {})
    });
    // The wrapper's own flush is the one that did NOT happen here (a
    // non-zero exit takes the CLI's os.Exit mirror path), so this is the
    // sync that keeps the last turn of the conversation.
    this.queueCaptureSync(rec);
    // The manifest row is the record of truth but it dies with a discard —
    // this line is the copy that survives in the app log (research 21 §10).
    sessionsLog.warn(
      `session death: id=${sessionId} name="${rec.name}" ` +
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

  /**
   * The session list every surface draws from. Tombstones stay out (Phase
   * 29): this one filter covers `sessions:list`, `broadcastSessions`, and
   * therefore the session rail, search over sessions, Context and the
   * project tab rollup. The Past Sessions panel reads
   * {@link listRemovedSessions} instead.
   */
  listSessions(): Session[] {
    // PHASE 72. ONE ROW PER ID, and this merge is the part of the rung most
    // likely to go wrong, so the rule is written out rather than left in the
    // shape of the code.
    //
    // Before this, a remote session had no manifest row and the two lists could
    // simply be concatenated. Now a session Tortie created on a machine is in
    // BOTH: a manifest row written at create time, and a feed row read from that
    // machine every pass. Concatenating would draw it twice.
    //
    //   a manifest row on this Mac        toSession, unchanged
    //   a manifest row on a machine       projected by that machine's own truth
    //   a feed row with no manifest row   projected as it was in Phase 70
    //
    // The third case is not a leftover to clean up. It is every remote session
    // created by 0.34 or 0.35, which wrote no row, and it is a session the pane
    // environment rescue re-bound after a create lost its answer. Both are real
    // sessions running right now, and dropping them from the list would hide
    // work a person can see on the other machine.
    const out: Session[] = [];
    const covered = new Set<string>();
    for (const rec of this.manifest.listSessions()) {
      if (rec.status === 'discarded') continue;
      covered.add(rec.id);
      if (rec.machineId === undefined || rec.machineId === LOCAL_MACHINE) {
        out.push(toSession(rec));
        continue;
      }
      // PHASE 72, SECOND FIX ROUND. `toSession` stamps the instant of the copy
      // for a local row. `projectRemoteRecord` cannot, because the machines
      // layer is not allowed to reach into the restore layer and its own test
      // holds that rule. So the stamp happens here, which is the one place the
      // two lists are merged, exactly as it does in the feed loop below.
      //
      // Without it the saved output panel was unreachable for every remote
      // session that HAS a manifest row, which is every remote session this
      // build creates. The copies were on disk the whole time. The menu item
      // stayed disabled and the kept-here line never drew, because both read
      // this field.
      const remote = projectRemoteRecord(rec);
      const remoteSavedAt = savedOutputAt(remote.id);
      out.push(
        remoteSavedAt === null ? remote : { ...remote, savedOutputAt: remoteSavedAt }
      );
    }
    for (const session of remoteSessions()) {
      if (covered.has(session.id)) continue;
      // PHASE 72 FIX ROUND. A feed row has no manifest row, so `toSession` never
      // saw it and nothing stamped the instant of the copy Tortie keeps of its
      // output. The menu item that opens the saved output panel is offered only
      // for a row that carries one, so without this the panel was unreachable
      // for exactly the rows an older Tortie created.
      //
      // It is stamped HERE rather than in the machines layer because that layer
      // is not allowed to reach into the restore layer, which is a rule its own
      // test holds. This is the one place the two lists are merged, so it is the
      // one place a field that comes from a third place belongs.
      const savedAt = savedOutputAt(session.id);
      out.push(savedAt === null ? session : { ...session, savedOutputAt: savedAt });
    }
    return out;
  }

  /**
   * RAW, tombstones included, on purpose: smoke and conformance cleanups use
   * this to see and hard delete leftover rows of any status.
   */
  listSessionRecords(): ManifestSessionRecord[] {
    return this.manifest.listSessions();
  }

  /** Past Sessions data (Phase 29): discarded rows only, newest removal first. */
  listRemovedSessions(): Session[] {
    return this.manifest
      .listSessions()
      .filter((rec) => rec.status === 'discarded')
      .map(toSession)
      // A discarded row with NULL removed_at cannot be produced by this
      // build. If one exists anyway (a hand edited file), it sorts last and
      // is never pruned.
      .sort((a, b) => (b.removedAt ?? 0) - (a.removedAt ?? 0));
  }

  /**
   * ⌘T create. Manifest row is written BEFORE the tmux spawn (§2.4 Step 0);
   * on spawn failure the row is removed and the error surfaces to the UI.
   */
  async createSession(input: CreateSessionInput): Promise<Session> {
    if (input.name.trim().length === 0) {
      throw gmuxError('INVALID_INPUT', 'Session name cannot be empty.');
    }
    // PHASE 70. A create on another machine leaves this method here, before any
    // local check runs. Every check below asks about this Mac: whether a folder
    // exists here, which binary is here, what this Mac's login shell PATH holds.
    // None of them can answer for a different computer, and running them anyway
    // is how a create would refuse a folder that is perfectly there.
    if (input.machineId !== undefined && input.machineId !== 'local') {
      const session = await remoteCreate({
        machineId: input.machineId,
        name: input.name,
        projectPath: input.projectPath,
        cwd: input.cwd ?? input.projectPath,
        agent: input.agent,
        ...(input.extraArgs !== undefined ? { extraArgs: input.extraArgs } : {})
      });
      this.broadcastSessions();
      return session;
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
    // PHASE 23 FIX ROUND. Where to LOOK for the binary, which is as load
    // bearing as its name and is on the confirm sheet as "Looks for it in".
    // Declared out here because two readers need it: the resolve below, and
    // the bare-name decision after the health check. (Phase 49 corrected
    // this comment. It used to say the pane env at the spawn also read it;
    // nothing on the spawn path has read it since the Phase 48 rework.)
    let probeDirs: string[] = [];
    if (input.agent !== 'shell') {
      // Phase 10 (settings+hotkeys stream): the binary name comes from the
      // agent REGISTRY, not the agent id — cursor's binary is `cursor-agent`,
      // antigravity's is `agy`. See binaryCandidatesOf in ./launch-plan for
      // the Phase 25.5 whole-list rule and the merged-table sourcing. The
      // confirm gate is still asked below, inside resolveLaunchSpec — a name
      // is not a permission.
      probeDirs = expandDirs(agentEntry(input.agent)?.extraProbeDirs ?? []);
      const candidates = binaryCandidatesOf(
        input.agent,
        launchableAgentEntry(input.agent)
      );
      let abs: string | null = null;
      let bare: string = candidates[0] ?? input.agent;
      for (const candidate of candidates) {
        const hit = await tmux.resolveBinary(candidate, probeDirs);
        if (hit !== null) {
          abs = hit;
          bare = candidate;
          break;
        }
      }
      if (abs === null) {
        throw gmuxError(
          'AGENT_NOT_FOUND',
          agentNotFoundMessage(candidates),
          candidates[0] ?? input.agent
        );
      }
      binPath = abs;
      // PHASE 48. The structural preflight (../agents/health). It opens the
      // resolved file, reads its first line if it has a shebang, and asks
      // whether the interpreter that line names resolves against the same
      // PATH this pane will get. It never spawns anything and it never runs
      // the agent. `interpreter-missing` is the only answer that stops a
      // launch, and `Start it anyway` sends the same argv back with the check
      // skipped, because the check can be wrong about a wrapper that re-execs
      // through something Tortie cannot see.
      if (input.startAnyway !== true) {
        const health = await checkAgentBinary(abs);
        if (health.answer === 'interpreter-missing') {
          sessionsLog.warn(
            `launch refused: ${bare} at ${abs} needs ${health.interpreter}, ` +
              `which is not on the PATH this pane would get ` +
              `(${health.elapsedMs} ms, shebang ${health.shebang})`
          );
          // `detail` is TWO LINES for this code. The first is the absolute
          // path, which is what every other AGENT_* code puts there. The
          // second is the interpreter's name, because the create sheet's two
          // ways forward have to name the program the person is being asked
          // to install or to reveal, and a renderer must never read a fact
          // out of a prose sentence. See readInterpreterDetail in
          // src/renderer/app/CreateSessionModal.tsx.
          throw gmuxError(
            'AGENT_INTERPRETER_MISSING',
            interpreterMissingMessage(health.binPath, health.interpreter),
            `${health.binPath}\n${health.interpreter}`
          );
        }
      }
      // PHASE 23 FIX ROUND, the second half of the `extraProbeDirs` fix, and
      // this is the half a driver run found rather than a reading.
      //
      // The pane is spawned by BARE NAME (F3 above). tmux resolves that name
      // against the PATH of the tmux CLIENT that asked for the session, which
      // is this process, and it ignores the per-pane `-e PATH=` entirely.
      // Phase 48 corrected this comment. It used to name the SERVER
      // environment, and that reading was measured wrong twice,
      // independently, on tmux 3.6a. What WAS measured: the same session
      // created with an absolute argv[0] runs, and created with the bare name
      // plus `-e PATH=<dir>` dies at once with "Pane is dead (status 1)". The
      // client's PATH is set in supervisor.ts ensureServer, at the
      // `process.env['PATH'] = userPath` line. See
      // docs/research/47-agent-installs.md section 2.
      //
      // So an agent whose binary exists ONLY in a directory its own entry names
      // cannot be launched by its bare name at all. Detection found it, the
      // resolve above found it, the manifest recorded the absolute path, and
      // the pane still died. For exactly that case, and nothing else, argv[0]
      // stays absolute.
      //
      // It costs F3 nothing, and the reason is F3's own. F3 protects an agent a
      // user might end with `pkill -f "$(command -v claude)"`, and `command -v`
      // reads the same login-shell PATH the tmux server was given. A binary
      // that PATH cannot find is one that command substitution cannot name
      // either, so there is no pattern for that pkill to match and nothing for
      // the bare name to protect.
      // PHASE 49, research 47 §9 and §11. The decision itself lives in
      // ./launch-plan (bareNameFor): the bare name is used only when it is
      // really a bare name AND the file the pane's PATH would pick is
      // byte-for-byte the file the manifest records. The old code tested
      // `onLoginPath` for null where it must compare it with `abs`, and it
      // passed a path-shaped Phase 23 override to tmux as argv[0], where no
      // tilde is expanded and the pane died. The shortcut below is the same
      // one as before, now refused for a path-shaped candidate so the rule
      // in bareNameFor sees it.
      const onLoginPath =
        probeDirs.length === 0 && !bare.includes('/')
          ? abs
          : await tmux.resolveBinary(bare);
      bareName = bareNameFor(bare, abs, onLoginPath);
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
    // Two awaits, neither of which spawns anything: the two realpath calls
    // are one fs lookup each. The version read is SYNCHRONOUS since Phase 49
    // (peekDetectedAgents never starts a scan and never waits on one), so a
    // create can never stall behind a version probe. The resolved cwd is
    // recorded because it is the store key for five of the eleven agents, so
    // a moved or re-cloned checkout is the difference between finding the
    // conversation and not.
    const agentVersion = this.cachedAgentVersion(input.agent);
    const cwdReal = await realpath(cwd).catch(() => cwd);
    const projectReal = await realpath(input.projectPath).catch(
      () => input.projectPath
    );

    const now = Date.now();
    // The whole row is composed in ./launch-plan (Phase 42 stage 5): every
    // field restore depends on is decided there, while it is still true
    // (Phase 21, A8 + G6), and the composition has a direct unit test. The
    // predicted tmuxName is replaced below with the name tmux actually
    // applied (dedupe may append “-2”).
    const record: ManifestSessionRecord = {
      ...newSessionRecord({
        id,
        input,
        cwd,
        spec,
        capture,
        agentVersion,
        binPath,
        cwdReal,
        projectReal,
        now
      }),
      // PHASE 71, migration 013. Where a session runs is decided once, at
      // create, and stated on the row rather than assumed by every later
      // reader. This method is the local create, so the answer is this Mac. A
      // session on another machine takes a different path entirely and gets no
      // manifest row at all in this release, which is what the refusal in
      // ../manifest/sessions-repository.ts holds true.
      machineId: LOCAL_MACHINE
    };

    // §2.4 Step 0: durability record exists BEFORE the process does — which
    // is exactly the window a concurrent reconcile must not judge (16.5.1).
    // Held until the row is bound to a live tmux id below.
    this.createsInFlight.set(id, now);
    faultPoint('create.before-declaration');
    this.manifest.insertSession(record);
    faultPoint('create.after-declaration');

    // F3 (Phase 12.7, research 21 §8) — LAUNCH BY BARE NAME. See
    // spawnArgvFor in ./launch-plan for the whole rule: why the manifest
    // keeps the absolute path while the spawn uses the bare name, and how a
    // captured session gets the same protection one level in.
    const launchArgv = spawnArgvFor(spec.argv, bareName, capture);

    // PHASE 33. The variables this row asks Tortie to read from the login
    // shell. One probe, 3 second deadline, group killed, and nothing is
    // spawned at all when the row names none, which is every compiled agent.
    //
    // The resolved pairs live in this local and in the tmux `-e` set, and
    // nowhere else. They are deliberately NOT put on `spec.env`, because that
    // is written into the manifest row verbatim and replayed at restore, which
    // is how option B in research 41 put provider keys into SQLite in plain
    // text. Restore reads the NAMES off the row and probes again.
    let resolvedEnv: Record<string, string> = {};
    let envProbe: tmux.CaptureEnvResult | null = null;
    if (spec.envPassthrough !== undefined && spec.envPassthrough.length > 0) {
      envProbe = await tmux.captureLoginShellEnv(spec.envPassthrough);
      resolvedEnv = envProbe.values;
    }

    let info: tmux.TmuxSessionInfo;
    try {
      info = await tmux.createSession({
        displayName: input.name,
        cwd,
        argv: launchArgv,
        env: paneEnvFor(spec.env, resolvedEnv, id)
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

    // PHASE 33. The pane is running and it is bound to its live tmux id, so
    // the notice can name a session that exists. It says one thing: this pane
    // started without a variable its row promises. Nothing else on the machine
    // would ever say so, and the agent inside it fails much later with a
    // message about its provider rather than about the shell.
    if (envProbe !== null && (envProbe.missing.length > 0 || envProbe.probeFailed)) {
      postDurabilityNotice({
        kind: 'env-unresolved',
        sessionId: id,
        sessionName: input.name,
        names: envProbe.missing,
        probeFailed: envProbe.probeFailed
      });
    }

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
      sessionsLog.warn(
        `could not mirror metadata into tmux options: ${(err as Error).message}`
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
          // `cwdReal`, not `cwd`. The row keeps the folder the user chose and
          // the harvest needs the folder itself: pi and qwen build their
          // store directory from it, and every ownership rule in
          // ./claim-strength.ts compares it as a string. Two panes in one
          // physical folder can spell it two ways, e.g. /tmp and /private/tmp.
          cwd: cwdReal,
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
      sessionsLog.warn(`${captureDeclined} (session "${input.name}")`);
      broadcast(EVT_CAPTURE_NOTICE, {
        kind: 'declined',
        sessionId: id,
        sessionName: input.name,
        message: captureDeclined
      });
    }

    // Phase 22 (research 29 §8.2): record what this agent's configuration was
    // at this moment, so that "why did that agent not use the skill I just
    // wrote" has an answer later. No agent writes this down for itself, and
    // Tortie owns the launch, so this is the only place it can be recorded.
    //
    // NOT AWAITED, AND THAT IS THE DESIGN RATHER THAN AN OMISSION. It returns
    // void so nobody can await it. The scan walks configuration directories,
    // which is about 15 ms warm and was measured at 7.1 s on a cold page cache
    // for the equivalent walk, and a launch must never wait on either. It is
    // last in this method for the same reason: every durability-critical
    // effect above it has already happened, so nothing it does or fails to do
    // can reach them.
    recordLaunchContext(this.manifest, {
      sessionId: id,
      reason: 'create',
      agent: input.agent,
      cwd: cwdReal
    });

    this.broadcastSessions();
    const stored = this.manifest.getSession(id);
    return toSession(stored ?? record);
  }

  /** F2 rename: tmux first (when live), manifest always, event loop confirms. */
  async renameSession(input: RenameSessionInput): Promise<Session> {
    if (input.name.trim().length === 0) {
      throw gmuxError('INVALID_INPUT', 'Session name cannot be empty.');
    }
    // Phase 70: a remote row has no manifest record, so the rename lands on the
    // far side and on its `@gmux-name` stamp, which is what makes the new name
    // survive a Tortie quit.
    if (isRemoteSessionId(input.sessionId)) {
      const renamed = await remoteRename(input.sessionId, input.name);
      this.broadcastSessions();
      return renamed;
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

  /**
   * Kill: attach client, tmux session, then manifest status → 'exited'.
   *
   * THE ORDER IS THE PROMISE (Phase 19 rule, restated for Phase 26.3). The
   * end confirm now tells the user "the scrollback is saved first, so you
   * can restore this session later", and the sentence is true only because
   * the capture below runs — and its durable write RETURNS — before
   * `tmux.killSession` is issued. The row itself is preserved ('exited',
   * never deleted), with its resume argv, so Restore stays possible after a
   * manual end. Nothing here may be reordered to kill first.
   */
  async killSession(sessionId: string): Promise<void> {
    // PHASE 70. A remote end has no snapshot to take first, because this
    // release saves no scrollback for a session on another machine, and the
    // create sheet says so before the session exists. What it does have is the
    // binding rule: the command is composed only against an identifier a
    // completed list from that machine reported.
    if (isRemoteSessionId(sessionId)) {
      this.attachHost.detach(sessionId);
      await remoteKill(sessionId);
      broadcast(EVT_STATUS_CHANGED, sessionId, 'exited');
      this.broadcastSessions();
      return;
    }
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
      // BEFORE the pane disappears. Best-effort means a full disk can never
      // block ending a session; it no longer means silent (Phase 26.3). The
      // confirm the user just accepted promised the save, so a capture that
      // could not write is reported through the notice channel: the
      // scrollback was not saved, and Restore will bring back the
      // conversation only. The renderer writes the sentence; `sessionName`
      // and `atSessionEnd` are the facts it needs.
      if (rec.status !== 'exited' && rec.status !== 'restorable') {
        await captureSessionSnapshot(target, sessionId, {
          reason: 'session-close',
          session: snapshotRecipeOf(rec)
        }).catch((err: unknown) => {
          sessionsLog.warn(
            `end-time snapshot failed for "${rec.name}": ` +
              `${(err as Error).message}`
          );
          postDurabilityNotice({
            kind: 'snapshot-failed',
            sessions: 1,
            outOfSpace: err instanceof DurableWriteError && isOutOfSpace(err),
            sessionName: rec.name,
            atSessionEnd: true
          });
        });
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

  /**
   * The HARD delete: the row is gone and nothing brings it back. Since Phase
   * 29 the user's Remove goes through {@link removeSession} instead; the
   * callers that stay here are the ones whose rows must never appear in Past
   * Sessions — restart's old-row cleanup (a tombstoned leftover would carry
   * the same name as its live replacement and hazard two live sessions on
   * one conversation id), and smoke and conformance cleanups, which must
   * remove tombstones too.
   */
  discardSession(sessionId: string): void {
    // The row is going, so its hold on its conversation goes with it. Anything
    // else would keep a discarded session's claim alive for the rest of the
    // run and stop a new session in that folder from recording an id. A row
    // that still exists keeps its claim, including an exited one, because a
    // restore of it resumes that conversation.
    releaseConversationClaims(sessionId);
    this.manifest.deleteSession(sessionId);
    // The row is gone, so its snapshot and its hook settings are unreachable
    // garbage now.
    this.releaseSessionResources(sessionId);
  }

  /**
   * The user's Remove (Phase 29): tombstone, not delete. The row moves to
   * Past Sessions and Restore can bring the conversation back. Disk hygiene
   * is unchanged from the old remove, and that is deliberate: the claim is
   * released so a new session in that folder can record an id, the snapshot
   * generations go because a restore from here returns the conversation and
   * not the screen (the panel says so), and the hook settings file goes
   * because restoreSession rewrites it on the way back.
   */
  removeSession(sessionId: string): void {
    // Phase 70. A remote row is forgotten rather than tombstoned, because this
    // release writes no manifest row for one and there is nothing to bring back.
    if (forgetRemoteRow(sessionId)) {
      this.broadcastSessions();
      return;
    }
    this.mustGetSession(sessionId);
    // A live harvest watch must not write a conversation id onto a tombstone.
    const watch = this.idCaptureWatches.get(sessionId);
    if (watch !== undefined) {
      watch.cancel();
      this.idCaptureWatches.delete(sessionId);
    }
    releaseConversationClaims(sessionId);
    this.manifest.markSessionRemoved(sessionId);
    this.releaseSessionResources(sessionId);
  }

  /**
   * The cleanup the hard delete and the tombstone share (extracted at Phase
   * 29 integration): the live-id maps, the activity tracker, the hook token,
   * the snapshot generations and the hook settings file. The two exits
   * differ ONLY in what happens to the manifest row, and one body here keeps
   * the disk hygiene from drifting between them.
   */
  private releaseSessionResources(sessionId: string): void {
    const live = this.liveIds.get(sessionId);
    if (live !== undefined) this.byTmuxId.delete(live);
    this.liveIds.delete(sessionId);
    this.activity.forget(sessionId);
    this.hookServer.revoke(sessionId);
    void deleteSnapshot(sessionId).catch(() => undefined);
    rm(claudeHookSettingsPath(sessionId), { force: true }).catch(
      () => undefined
    );
  }

  /** Start streaming a session into `sender` (visible pane mount). */
  async attachSession(sessionId: string, sender: WebContents): Promise<void> {
    // PHASE 70. A remote attach is a pty running the sign in program, carrying
    // that machine's own tmux on the far end. The composition is in
    // src/main/attach/attach-plan.ts and the target is the immutable identifier
    // the last completed list from that machine reported, never a name: a name
    // prefix-matches, and a prefix match on another machine would stream a
    // stranger's session into this tab.
    const remote = remoteSessionRow(sessionId);
    if (remote !== null) {
      if (remote.status === 'exited') {
        throw gmuxError(
          'SESSION_NOT_FOUND',
          'This session is not running right now.',
          `status: ${remote.status}`
        );
      }
      const machine: RemoteMachineContext = readyRemoteContext(remote.machineId);
      this.attachHost.attach({
        sessionId,
        tmuxName: remote.tmuxId,
        sender,
        machine
      });
      return;
    }
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
      // Phase 74: basename is empty for the root of a volume. See
      // ../projects/name for what a nameless folder is called and why.
      name: projectNameForPath(abs)
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
    this.unsubscribeReclaims?.();
    this.unsubscribeReclaims = null;
    // Phase 70: every machine's poll timer, and the wake hook behind them. The
    // sessions on those machines keep running, which is the whole point of them.
    stopRemotePolls();
    this.unsubscribeRemote?.();
    this.unsubscribeRemote = null;
    // Phase 72. BEFORE the manifest is closed below, so nothing in the machine
    // layer holds a handle to a connection that is about to go away.
    setRemoteManifest(null);
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
