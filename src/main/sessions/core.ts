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
import { readdir, rm } from 'node:fs/promises';
import { join, resolve as resolvePath } from 'node:path';
import type {
  AddRemoteProjectInput,
  AddRemoteProjectResult,
  CaptureChoice,
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
  Project,
  RenameSessionInput,
  ResizeInput,
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
  readProcSnapshot,
  SessionActivityMonitor,
  writePreferredHookPort,
  type ActivityMonitorDeps,
  type ActivitySession
} from '../activity';
import { AttachHost } from '../attach';
import { listDetectedAgents } from '../agents';
// The durable writer's own failure type and its own out-of-space test
// (Phase 19 item 2). Do not write a second copy of either.
import { DurableWriteError, isOutOfSpace } from '../durable';
// Named crash points for the fault harness. A no-op on every launch that is
// not a harness launch — see fault/inject.ts.
import { faultPoint } from '../fault/inject';
import { unwatchGitRepo } from '../git';
import {
  claimConversationId,
  conversationClaimant,
  ManifestStore,
  onConversationReclaimed,
  releaseConversationClaims,
  defaultManifestDbPath,
  prepareManifestForBoot,
  startManifestRing,
  toSession,
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
  FoldScheduler,
  foldSchedulerDepsFor,
  setLiveFoldScheduler
} from './fold-wiring';
// PHASE 152. Where the agent keeps this conversation's record, derived by the
// one resolver that answers that question. See ./record-path.ts.
import { stampRecordLocations } from './record-path';
import {
  SYNC_QUIT_TIMEOUT_MS,
  SyncQueue,
  cloudDisabledByEnv,
  unwrapArgv,
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
  machineHostKeysPath,
  machineLabelOf,
  machineRow
} from '../machines/store';
import {
  forgetRemoteRow,
  isRemoteSessionId,
  markMachineQuiet,
  onRemoteSessionsChanged,
  projectRemoteRecord,
  readyRemoteContext,
  refuseRemoteRestore,
  remoteKill,
  remoteRename,
  remoteSessionRow,
  remoteSessions,
  setRemotePollFocused,
  stopRemotePolls
} from '../machines/remote-sessions';
// PHASE 72. The manifest handle the machine layer writes remote rows through,
// and the verb behind the restore gate. Both are direct rather than through
// `../machines`, for the same reason the three imports above are.
import {
  isRemoteRecord,
  remoteRecordOf,
  setRemoteManifest
} from '../machines/remote-record';
// PHASE 84, item 2. The end confirm for a session on a machine now promises a
// copy of the screen, and this is the function that keeps the promise. It is a
// direct import for the same reason the machines imports above are.
import { captureRemoteSessionNow } from '../machines/remote-capsule';
// PHASE 90.3. A session on another machine belongs to a folder ON THAT MACHINE.
// One pure rule decides which folder that is, and one pass puts every live
// session in the right tab. Direct imports, for the same reason the machines
// imports above are.
import {
  rehomeRemoteSessions,
  remoteProjectPathFor
} from '../machines/remote-rehome';
// PHASE 90.3. The one check a folder on another machine gets before it becomes
// a tab. It reads that folder once and writes nothing.
import { listRemoteDir } from '../machines/dir-list';
import {
  restoreRemoteSession,
  type RemoteRestoreOutcome
} from '../machines/remote-restore';
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

/**
 * PHASE 90.3. One session on another machine, drawn against the folder it is
 * really in ON THAT MACHINE. PURE.
 *
 * Every row an earlier build wrote carries this Mac's project folder in
 * `projectPath`, and the window groups sessions into tabs by comparing that
 * field with a project's path. Left alone, one of those rows appears under a tab
 * whose sidebars are showing a folder on a different computer.
 *
 * The rule is `remoteProjectPathFor` in `../machines/remote-rehome.ts`, which is
 * the same rule the manifest correction uses, so what a person sees and what the
 * manifest records cannot disagree. A row that already names a folder on that
 * machine is returned unchanged, object identity included.
 */
function atHomeOnItsMachine(session: Session): Session {
  if (session.machine === undefined) return session;
  const home = remoteProjectPathFor(session.projectPath, session.cwd);
  return home === session.projectPath ? session : { ...session, projectPath: home };
}

// The pure launch and reconcile decisions (Phase 42 stage 5). This class is
// the orchestrator: it runs the execs and the writes, and asks these two
// modules what the launch or the judgement should be.
// PHASE 48. The last words of a dead pane, as one pure function beside this
// file. The reaper is its only caller.
import { exitDetailFrom } from './exit-detail';
// PHASE 125. The fail closed durability gate, as its own leaf. It imports
// nothing from this file: it learns whether the core is disposed and how to
// build the refusal through the object the constructor hands it.
import {
  MUTATION_JOIN_DEADLINE_MS,
  MutationLedger
} from './mutation-ledger';
// PHASE 125. The local create, 520 lines, behind the same gate it always had.
// `isDirectory` lives there because the create path is two of its three
// readers; addProject below is the third.
import {
  createLocalSession,
  isDirectory,
  type CreateLocalDeps
} from './create-local';
// PHASE 125. The conversation id feed: the create-time harvest, the boot
// rescue and the Phase 32 reclaim correction. It imports nothing from this
// file and takes the three maps it shares with this class by reference.
import {
  cachedAgentVersion,
  handleConversationReclaim,
  resumeIdHarvests,
  startIdCapture,
  type IdHarvestDeps
} from './id-harvest';
// PHASE 125. The snapshot pass and the manifest generation the quit and sleep
// paths take. The ORDER shutdownGmuxCore runs them in stays in this file.
import {
  snapshotAllSessions,
  takeManifestGenerationOnQuit,
  takeManifestGenerationOnSuspend,
  type QuitGenerationDeps
} from './quit-generation';
// PHASE 141. The verb for a session whose agent left its shell running, the
// guard that runs at the moment of the press, and the one function that may
// bind a conversation to a row on that path. It imports nothing from this
// file: it reads the core through the harvest feed's own dependency object,
// which this class already builds.
import {
  ResumeInPlaceService,
  type ResumeInPlaceResult
} from './resume-in-place';
import { snapshotRecipeOf } from './launch-plan';
import {
  claimStrengthOf,
  identityProbeNeeded,
  identityProbeVerdict,
  listAttemptOutcome,
  LOCAL_MACHINE,
  restoredStatus,
  retainedBindings,
  staleCreateIds,
  statusFlipActions,
  unreachableFlips,
  type MachineId
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

/** How long a create may claim to still be in flight — see createsInFlight. */
const CREATE_IN_FLIGHT_MAX_MS = 60_000;

/**
 * The answer for a session with no pane of its own on this Mac (Phase 95).
 *
 * It is a fact rather than a failure, so it is a value rather than a throw.
 * Every number is 0 and every flag is false, which is what the scrollbar
 * already draws nothing for.
 */
const NO_PANE_HERE: TerminalScrollState = {
  hasPane: false,
  position: 0,
  history: 0,
  rows: 0,
  inMode: false,
  innerAlt: false,
  innerMouse: false
};

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
  /**
   * Phase 141. The one verb for a session whose agent left its shell running.
   *
   * It holds a FACT per session and never a status, so it has no path to
   * `applyDetectedStatus` and none to a dot. The activity poll hands it the
   * two edges and it decides everything after them.
   */
  readonly resumeInPlace: ResumeInPlaceService;
  /**
   * Phase 138. Turns a turn boundary into at most one fold per session per
   * minute. It holds no timer of its own beyond a settle timer armed by a
   * boundary, so a fleet that is idle costs nothing.
   */
  readonly fold: FoldScheduler;
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
   * Phase 116, refusal site B, moved to ./mutation-ledger.ts by Phase 125.
   *
   * The ledger holds the shutdown flag and the set of admitted mutations.
   * Every mutator still reads and writes through this class, and the three
   * verbs below delegate in one line each.
   */
  private ledgerSlot: MutationLedger | null = null;

  /**
   * The ledger, built on first use rather than in a field initializer.
   *
   * It is lazy on purpose. Several seam tests in this tree borrow the real
   * methods off `GmuxCore.prototype` and run them against a plain object made
   * with `Object.create`, which runs no field initializer at all. A getter is
   * reached the same way on both, so the refusal proof in
   * `__tests__/core-singleton.test.ts` drives the real gate rather than a
   * stand-in. `this.disposed` is undefined on such an object, which reads as
   * false, exactly as it did when the guard was written inline.
   */
  private get ledger(): MutationLedger {
    this.ledgerSlot ??= new MutationLedger({
      isDisposed: () => this.disposed === true,
      refusalFor: (entry) => shutdownRefusal(entry)
    });
    return this.ledgerSlot;
  }

  /**
   * True from the moment `shutdownGmuxCore()` has settled the boot. Main
   * process code that already holds a core reference, e.g. the tray or a
   * timer, reaches the mutators without passing `getGmuxCore()`, so the
   * instance carries its own answer rather than trusting the module gate
   * alone. The four synchronous mutators read it inline, as they always did.
   */
  private get shuttingDown(): boolean {
    return this.ledger.shuttingDown;
  }

  /**
   * PHASE 125. What ./id-harvest.ts reads this class through. Built once in
   * the constructor, because two of its five members are assigned there.
   */
  private readonly harvestDeps: IdHarvestDeps;

  /**
   * PHASE 125. What ./create-local.ts reads this class through. Built once in
   * the constructor, because three of its eight members are assigned there.
   */
  private readonly createDeps: CreateLocalDeps;

  /**
   * PHASE 125. What ./quit-generation.ts reads this class through. Built once
   * in the constructor. `ringSchedule` is a getter because the field is null
   * until boot reaches it.
   */
  private readonly quitDeps: QuitGenerationDeps;

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
    // PHASE 125. The maps are handed over BY REFERENCE, so the feed and this
    // class read and write the same entries. Copying them here would change
    // the behaviour, which is the one thing this move must not do.
    this.harvestDeps = {
      manifest,
      liveIds: this.liveIds,
      idCaptureWatches: this.idCaptureWatches,
      isDisposed: () => this.disposed,
      broadcastSessions: () => {
        this.broadcastSessions();
      }
    };
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
    // PHASE 141. Built before the monitor, because the monitor's own
    // dependency object hands it the drop and return edges.
    this.resumeInPlace = new ResumeInPlaceService({
      harvest: this.harvestDeps,
      exec: (args) => tmux.execTmux(args),
      // The fact rides the activity facts event beside the excerpt and the
      // age, which is the channel that already exists for things that are NOT
      // a status. Nothing here touches the manifest projection, so there is no
      // code path from this value to a session's dot.
      publish: (updates) => {
        broadcast(EVT_ACTIVITY_CHANGED, [...updates]);
      },
      // PHASE 141, wired at integration. The poll holds a handback state of its
      // own and it has to be told when a return has been decided, or a session
      // it watched come back stays `returning` in the poll for the rest of the
      // run while the window was told the answer seconds after it happened.
      onResolved: (sessionId, outcome) => {
        this.activity.noteHandbackResolved(sessionId, outcome);
      }
    });
    this.hookServer = new GmuxHookServer({
      onEvent: (sessionId, state) => {
        this.activity.noteHookEvent(sessionId, state);
      },
      onSessionEnd: (sessionId) => {
        // PHASE 141. THE FREE ACCELERATOR, and it runs BEFORE the state that
        // holds the witness is dropped. Claude's own hook reaches this line the
        // instant a claude session ends, which removes the poll wait for the
        // agent the operator uses most. It is never a dependency: every other
        // agent, and claude with no hook installed, takes the ordinary tick.
        //
        // TWO READINGS, WIRED AT INTEGRATION, and they answer different
        // questions. `checkWitness` asks the poll whether the process it
        // watched being the agent is still there, which is the phase's own rule
        // and costs one process read. `noteAgentEnded` asks the session itself
        // whether anything is running in it, which is what answers for a claude
        // session the poll never managed to take a witness for. Whichever
        // decides first wins and the second is a no operation, because a record
        // that already says the agent left is never written twice.
        //
        // FORGETTING WAITS FOR THE FIRST OF THEM, because forgetting drops the
        // witness along with everything else, and a check that ran afterwards
        // could never see anything.
        this.resumeInPlace.noteAgentEnded(sessionId);
        void this.activity.checkWitness(sessionId).finally(() => {
          // KEEP THE DROP. This session is still there and the person may type
          // their resume into it at any moment, which only the poll can see.
          // Forgetting it whole meant the monitor began the next tick knowing
          // nothing, so the return was never noticed and the row went on
          // offering the verb with the agent already back.
          this.activity.forget(sessionId, true);
        });
      }
    });
    // PHASE 141 named this literal rather than passing it inline, so the one
    // new callback below reads beside the others rather than at the end of a
    // constructor argument. Nothing else about it changed.
    const activityDeps: ActivityMonitorDeps = {
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
      },
      // Phase 138. The ONE call site of the fold. It is fired from the
      // monitor's single commit point, it is not awaited, and it cannot set a
      // status: noteTurnBoundary returns void.
      onTurnBoundary: (sessionId) => {
        this.fold.noteTurnBoundary(sessionId);
      },
      // PHASE 141. The drop edge and the return edge, and nothing else. The
      // poll is the only thing that watches processes every second, so it
      // detects the edge; every decision after the edge is made in
      // ./resume-in-place.ts. It may never set a status and it does not.
      onHandback: (sessionId, observation) => {
        this.resumeInPlace.noteHandback(sessionId, observation);
      },
      // PHASE 141, wired at integration, and it closes the codex hole the
      // builder left open on purpose because it is a cost decision.
      //
      // The witness is free for an agent whose own oracle cannot answer,
      // because such a session is already ambiguous and the tick already holds
      // the process table. It is NOT free for codex: its title oracle answers
      // `idle` whenever the pane title is the working directory's name, so an
      // idle codex session never joins the ambiguous set, the table is never
      // read for it, and it would run its whole life with no witness and never
      // offer the verb. The phase's own coverage table names codex in the row
      // that says the drop is seen, so leaving it out would have made that
      // table untrue.
      //
      // WHAT IT COSTS, and why it is bounded. One process table, at most once
      // every five seconds, and only on a tick where some agent session still
      // has no witness. As soon as every agent session has one, this stops
      // being called at all, so it is a start up cost rather than a running
      // one. The snapshot goes ONLY to the witness recorder and never into a
      // verdict's inputs, so no session's dot moves because of it.
      readProcForWitness: () => readProcSnapshot()
    };
    this.activity = new SessionActivityMonitor(activityDeps);
    this.fold = new FoldScheduler(
      foldSchedulerDepsFor({
        manifest,
        openProjectPaths: () =>
          new Set(this.manifest.listProjects().map((project) => project.path))
      })
    );
    setLiveFoldScheduler(this.fold);
    // PHASE 125. Built here rather than as a field initializer, because
    // `hookServer` is assigned above in this same body. The three maps go over
    // by reference, for the reason the harvest deps give.
    this.createDeps = {
      manifest,
      hookServer: this.hookServer,
      liveIds: this.liveIds,
      byTmuxId: this.byTmuxId,
      createsInFlight: this.createsInFlight,
      broadcastSessions: () => {
        this.broadcastSessions();
      },
      startIdCapture: (id, agent, ctx, extraArgs, options) => {
        startIdCapture(this.harvestDeps, id, agent, ctx, extraArgs, options);
      },
      cachedAgentVersion: (agent) => cachedAgentVersion(agent)
    };
    this.quitDeps = {
      manifest,
      liveIds: this.liveIds,
      ringSchedule: () => this.ringSchedule
    };
    this.wireControlEvents();
    // Phase 32. When a session PROVES a conversation another session had
    // only guessed, the loser's row is corrected here: id withdrawn, watch
    // re-armed. Fired synchronously inside the winner's accept, before the
    // winner's own settle resolves, so at no observable moment do two rows
    // carry the same conversation id.
    this.unsubscribeReclaims = onConversationReclaimed((ev) => {
      handleConversationReclaim(this.harvestDeps, ev);
    });
    // Phase 70. A poll of a machine, a remote create, a rename and a kill all
    // change what the list holds, and none of them touches the manifest, so the
    // ordinary reconcile would never notice. One subscription, and the same
    // coalescing broadcast every local flip already uses.
    this.unsubscribeRemote = onRemoteSessionsChanged(() => {
      // PHASE 90.3. Before the broadcast, so the list the window is about to
      // draw already has every session in the right tab. It reads what the poll
      // already fetched and sends nothing to any machine.
      try {
        rehomeRemoteSessions(remoteSessions());
      } catch (err) {
        sessionsLog.warn(
          `could not place a session on its machine's folder: ${
            (err as Error).message
          }`
        );
      }
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
   * (Phase 20 item 2). The body is in ./quit-generation.ts.
   */
  async takeManifestGenerationOnSuspend(): Promise<RingTakeResult | null> {
    return takeManifestGenerationOnSuspend(this.quitDeps);
  }

  /** The same, on the way out. Stops the poll first. */
  async takeManifestGenerationOnQuit(): Promise<RingTakeResult | null> {
    return takeManifestGenerationOnQuit(this.quitDeps);
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
        // Phase 109 fix round. The label rides along here the way it does on
        // the ipc door, so a refusal composed after a boot sign-in names the
        // machine the way the person named it, not by its id.
        const result = await prepareMachine({
          machineId: row.id,
          fields,
          tortieHostKeys: machineHostKeysPath(),
          label: machineLabelOf(row)
        });
        if (result.class !== 'prepared') {
          sessionsLog.warn(
            `${row.id} answered ${result.class} at launch: ${result.detail}`
          );
          markMachineQuiet(row.id);
          continue;
        }
        // PHASE 84, item 4. The `await startRemotePoll(row.id)` that used to
        // stand here is gone. `prepareMachine` starts the feed itself now, in
        // its success arm, so that a machine prepared from Settings gets a feed
        // too. Two callers starting it was one caller too many, and the one
        // that was missing it was the button a person presses when a machine
        // is asleep. `startMachineFeed` is a no-op for a machine that already
        // has one, so nothing here depends on which of them ran first.
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
  // Scrollback snapshots + restore (Phase 6 — §2.4 Steps 2–3)
  // -------------------------------------------------------------------------

  /**
   * Snapshot every live manifested session's scrollback (§2.4 Step 2). The
   * pass itself is in ./quit-generation.ts; this is the door the quit path,
   * the sleep path, the %exit handler and the fault harness already call.
   */
  async snapshotAllSessions(reason: SnapshotReason = 'app-quit'): Promise<void> {
    await snapshotAllSessions(this.quitDeps, reason);
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
  restoreSession(
    sessionId: string,
    options: CaptureChoice = {}
  ): Promise<Session> {
    // Phase 116: refused once shutdown starts, joined by the quit path when
    // admitted before it. A restore spawns locally or execs remotely, and
    // neither may begin against a core that is being disposed.
    return this.ledger.admit('restoreSession', () =>
      this.restoreSessionAdmitted(sessionId, options)
    );
  }

  private async restoreSessionAdmitted(
    sessionId: string,
    options: CaptureChoice = {}
  ): Promise<Session> {
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
        this.reportRemoteResume(outcome);
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
        },
        // PHASE 119. Passed through unchanged. Omitted, which is every caller
        // before this phase, the restore composes exactly what it always did.
        ...(options.withoutCapture === true ? { withoutCapture: true } : {})
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

      // PHASE 119. THE DURABLE FLIP, and it is written only here.
      //
      // `captureDeclined` is set by the restore only when a person asked for it
      // AND the bare command was actually armed, so a decline that could not be
      // honoured never turns a person's history saving off. The failed arm
      // threw above this line, so a restore that never happened cannot reach
      // it either.
      //
      // WHY IT IS DURABLE rather than one shot. The harvest re-wraps the resume
      // argv from `rec.specstory` on every id it lands, so a one shot decline
      // would be undone by the next harvest and the person would have to
      // decline again on every restore. That is not insurance.
      //
      // WHY THE RECORD IS KEPT WITH `enabled: false` rather than deleted. It
      // still holds `agentArgv`, which `recoverLaunchExtras` reads to give a
      // later Restart this session's launch flags back, and it keeps the fact
      // that this session was once captured.
      //
      // It is a second write, before the one durable restore commit below. A
      // crash between them leaves the row bare with no restore result, which is
      // the direction the person asked for.
      if (outcome.captureDeclined === true && rec.specstory !== undefined) {
        this.manifest.updateSession(sessionId, {
          specstory: { ...rec.specstory, enabled: false },
          resumeArgv: unwrapArgv(rec.resumeArgv ?? [])
        });
      }
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

  /**
   * Say what happened to the resume command on a session that came back on
   * another machine (Phase 89).
   *
   * Phase 89 gave a remote restore the local restore's shape. The session comes
   * back running that machine's own shell, Tortie types the command that
   * continues the conversation into it, and Tortie stops. It never presses
   * Enter. It then reads that session's screen and counts the copies of what it
   * sent, and `resumeLanding` is what that count said.
   *
   * NOTHING IS SAID FOR THE GOOD ANSWER, and that is the rule rather than an
   * omission. A command that landed exactly once is sitting on the screen of
   * that session where the person can read it. Nothing is degraded, so there is
   * nothing to say, which is the same answer the local restore gives.
   *
   * NOTHING IS SAID FOR A ROW THE ARMING GATE REFUSED either. Such a row never
   * had a send, its `resumeLanding` is null, and the refusal already carries its
   * own sentence on the outcome for the surface that asked for the restore.
   *
   * The latch is the ordinary one, being once per kind per app run. A restore
   * of every session on a machine that has gone strange should not put nine
   * toasts on the screen, and the per session detail is in the log line
   * `../machines/remote-restore.ts` writes for every arm.
   */
  private reportRemoteResume(outcome: RemoteRestoreOutcome): void {
    const landing = outcome.resumeLanding;
    if (landing === null || landing === 'armed') return;
    sessionsLog.warn(
      `the resume command for "${outcome.session.name}" on another machine ` +
        `landed as ${landing}`
    );
    postDurabilityNotice({
      kind: 'remote-resume',
      sessionName: outcome.session.name,
      landing
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
    resumeIdHarvests(this.harvestDeps);
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
          // PHASE 141, added at integration. The handback publish is otherwise
          // an edge, and an edge is lost on a window that reloaded after it
          // went out. This repeats the whole map at its own slower cadence and
          // returns on its second line while nothing has dropped, which is the
          // ordinary case. It reads no screen and no process table.
          this.resumeInPlace.heartbeat();
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
    //
    // Phase 115. For a captured session the wrapper field names the process
    // this death actually describes. tmux execs argv[0], and wrapArgv puts
    // the specstory binary there, so the reaped process was specstory and
    // the agent ran inside it. Without this field a killed capture wrapper
    // reads in the log as a killed agent.
    sessionsLog.warn(
      `session death: id=${sessionId} name="${rec.name}" ` +
        `agent=${rec.agent} tmux=${target ?? '(unbound)'} ` +
        `pane_pid=${rec.panePid ?? '?'} exit=${exitCode ?? ''} ` +
        `signal=${deadSignal ?? ''}` +
        (rec.specstory?.enabled === true
          ? ` wrapper=specstory@${rec.specstory.binVersion ?? '?'}`
          : '')
    );
    this.activity.forget(sessionId);
    // PHASE 141, added at integration. A session that has ended holds no
    // handback, and this is what tells every window to drop the record rather
    // than leaving it for the next sweep.
    this.resumeInPlace.forget(sessionId);
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
   *
   * Phase 95: no binding is a fact rather than a failure, so this returns
   * null instead of throwing. Two ordinary states have no binding, being a
   * session that runs on another machine and a session on this Mac that is
   * not running. The throw made the renderer's 1 Hz poll print a stack trace
   * once a second for as long as such a session was on screen.
   */
  private scrollTarget(sessionId: string): string | null {
    return this.liveIds.get(sessionId) ?? null;
  }

  async scrollState(
    input: TerminalScrollPollInput
  ): Promise<TerminalScrollState> {
    const target = this.scrollTarget(input.sessionId);
    if (target === null) return NO_PANE_HERE;
    const state =
      input.anchorFrom === undefined
        ? await tmux.readPaneScroll(this.runScrollCommand, target)
        : await tmux.anchorPaneScroll(
            this.runScrollCommand,
            target,
            input.anchorFrom
          );
    return { ...state, hasPane: true };
  }

  async scrollBy(input: TerminalScrollByInput): Promise<TerminalScrollState> {
    const target = this.scrollTarget(input.sessionId);
    if (target === null) return NO_PANE_HERE;
    const state = await tmux.scrollPaneBy(
      this.runScrollCommand,
      target,
      input.lines
    );
    return { ...state, hasPane: true };
  }

  async scrollTo(input: TerminalScrollToInput): Promise<TerminalScrollState> {
    const target = this.scrollTarget(input.sessionId);
    if (target === null) return NO_PANE_HERE;
    const state = await tmux.scrollPaneTo(
      this.runScrollCommand,
      target,
      input.position
    );
    return { ...state, hasPane: true };
  }

  async scrollLive(sessionId: string): Promise<TerminalScrollState> {
    const target = this.scrollTarget(sessionId);
    if (target === null) return NO_PANE_HERE;
    const state = await tmux.exitPaneScroll(this.runScrollCommand, target);
    return { ...state, hasPane: true };
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
      const remote = atHomeOnItsMachine(projectRemoteRecord(rec));
      const remoteSavedAt = savedOutputAt(remote.id);
      // PHASE 93, FIX ROUND, and it was found by driving a real machine rather
      // than by reading the code. `projectRemoteRecord` builds a session from
      // eight named fields and the record's tab stamp is not one of them, so a
      // remote row reached the window with no record of the tab a person had
      // closed. `jumpToSession` reads exactly that field to decide whether a
      // tab coming back needs a sentence, so every remote session was told it
      // never had a tab. It is stamped HERE for the same reason
      // `savedOutputAt` is: this is the one place the two lists are merged, and
      // the machines layer is not allowed to reach into the manifest's codecs.
      const withTab =
        rec.projectTombstone === undefined
          ? remote
          : {
              ...remote,
              closedProject: {
                name: rec.projectTombstone.projectName,
                path: rec.projectTombstone.path,
                closedAt: rec.projectTombstone.closedAt
              }
            };
      out.push(
        remoteSavedAt === null
          ? withTab
          : { ...withTab, savedOutputAt: remoteSavedAt }
      );
    }
    for (const session of remoteSessions()) {
      if (covered.has(session.id)) continue;
      // PHASE 90.3. The folder the machine reports, so a feed row lands in the
      // tab for a folder on that machine rather than under a tab on this Mac.
      const shown = atHomeOnItsMachine(session);
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
      out.push(savedAt === null ? shown : { ...shown, savedOutputAt: savedAt });
    }
    // PHASE 152. Where the agent keeps this conversation's record, stamped in
    // the one place the two lists are merged, for exactly the reason
    // `savedOutputAt` is stamped here: it is a fact from a third place, it is
    // the same fact for a local row and a remote one, and one surface drawing
    // it from a second reading is how two answers to one question begin.
    //
    // It is derived rather than stored, and ../overview/reader is the one
    // resolver that derives it. The cost per row is one stat for a session
    // whose record is already known, and the whole list is handed over in one
    // call so that the re-asking about rows whose record is NOT known yet has a
    // budget for the pass rather than a cost per row. See ./record-path.ts.
    return stampRecordLocations(out);
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
   *
   * Phase 116: the whole body runs inside the ledger. The guard therefore
   * sits above `createMachineIdFor` and above the capture refusal read, which
   * Phase 94 placed first for exactly this reason: a path composed later
   * cannot sit above it. A refused remote create never reaches the exec plane.
   *
   * Phase 125 moved the body to ./create-local.ts. The gate, the entry name
   * and the returned promise are unchanged, and the two load bearing positions
   * above are now the first two statements of that file.
   */
  createSession(input: CreateSessionInput): Promise<Session> {
    return this.ledger.admit('createSession', () =>
      createLocalSession(input, this.createDeps)
    );
  }

  /**
   * F2 rename: tmux first (when live), manifest always, event loop confirms.
   *
   * Phase 116: admitted, because it writes the manifest and can exec remotely.
   */
  renameSession(input: RenameSessionInput): Promise<Session> {
    return this.ledger.admit('renameSession', () =>
      this.renameSessionAdmitted(input)
    );
  }

  private async renameSessionAdmitted(
    input: RenameSessionInput
  ): Promise<Session> {
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
  killSession(sessionId: string): Promise<void> {
    // Phase 116: admitted, because it destroys a session and can exec
    // remotely. A kill admitted before shutdown is joined so its capture and
    // its status write land before the final snapshot.
    return this.ledger.admit('killSession', () =>
      this.killSessionAdmitted(sessionId)
    );
  }

  private async killSessionAdmitted(sessionId: string): Promise<void> {
    // PHASE 84, ITEM 2. THE ORDER HERE IS THE PROMISE, exactly as it is on the
    // local branch below.
    //
    // Phase 70 wrote this branch with no capture in it, and the comment said
    // the release saved no scrollback for a session on another machine. Phase
    // 72 made that false. Copies of a remote screen are taken on a two minute
    // cadence and kept on this Mac. So the newest copy at the moment a person
    // pressed End was up to two minutes old, and the last two minutes of the
    // agent's work, including its final answer, were not in it. The end confirm
    // for a remote session now says a copy is saved first, and this is what
    // makes that word true.
    //
    // A capture that fails NEVER cancels the kill. The person asked for the
    // session to end and it ends. What changes is that the promise is withdrawn
    // in words, through the same notice channel the local branch uses, with
    // `remote: true` so the sentence does not offer a conversation that is not
    // coming back.
    if (isRemoteSessionId(sessionId)) {
      const remoteRow = remoteSessionRow(sessionId);
      const saved = await captureRemoteSessionNow(sessionId);
      if (!saved) {
        sessionsLog.warn(
          `the end-time copy of "${remoteRow?.name ?? sessionId}" on ` +
            `${remoteRow?.machineId ?? 'that machine'} was not written`
        );
        postDurabilityNotice({
          kind: 'snapshot-failed',
          sessions: 1,
          // A remote copy is written to this Mac's disk like any other, so a
          // full disk is possible. It is not distinguished here, because
          // `captureRemoteSessionNow` answers with one boolean and a guess at
          // the cause would be a guess.
          outOfSpace: false,
          ...(remoteRow !== null ? { sessionName: remoteRow.name } : {}),
          atSessionEnd: true,
          remote: true
        });
      }
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
    // PHASE 141, added at integration. A session that has ended holds no
    // handback, and this is what tells every window to drop the record rather
    // than leaving it for the next sweep.
    this.resumeInPlace.forget(sessionId);
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
    // Phase 116: a durable delete, refused once shutdown starts.
    if (this.shuttingDown || this.disposed) {
      throw shutdownRefusal('discardSession');
    }
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
    // Phase 116: a durable tombstone write, refused once shutdown starts.
    if (this.shuttingDown || this.disposed) {
      throw shutdownRefusal('removeSession');
    }
    // PHASE 84, ITEM 3. THE DURABLE HALF FIRST, THEN THE MEMORY HALF.
    //
    // The old order returned as soon as `forgetRemoteRow` found the id in
    // memory, which is true for every remote row this run created, saw or
    // ended. `markSessionRemoved` never ran, nothing durable was written, and
    // the next broadcast redrew the row reading "not running". A Remove stuck
    // only after a relaunch, which is not what a person pressing Remove is
    // asking for.
    //
    // A row created by 0.34 or 0.35 has no manifest record at all. It skips the
    // block below and the memory half alone is still the whole of what can be
    // done for it, which is why the two halves are separate rather than one
    // branch.
    //
    // The record is asked whether it names ANOTHER machine rather than merely
    // whether it exists. Every local row is in this manifest too, and a guard
    // that only asked "is there a record" would tombstone a local row here and
    // then tombstone it a second time on the path below.
    const record = remoteRecordOf(sessionId);
    const hasRemoteRecord = record !== null && isRemoteRecord(record);
    if (hasRemoteRecord || isRemoteSessionId(sessionId)) {
      if (hasRemoteRecord) {
        releaseConversationClaims(sessionId);
        this.manifest.markSessionRemoved(sessionId);
        this.releaseSessionResources(sessionId);
      }
      // Phase 70. The memory half. NOTHING IS SENT TO ANY MACHINE. It returns
      // false for a row this run never saw, and that is not a failure. The
      // durable half above is the whole of what such a row needed.
      forgetRemoteRow(sessionId);
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
    // PHASE 141, added at integration. A session that has ended holds no
    // handback, and this is what tells every window to drop the record rather
    // than leaving it for the next sweep.
    this.resumeInPlace.forget(sessionId);
    this.hookServer.revoke(sessionId);
    void deleteSnapshot(sessionId).catch(() => undefined);
    rm(claudeHookSettingsPath(sessionId), { force: true }).catch(
      () => undefined
    );
  }

  /**
   * Start streaming a session into `sender` (visible pane mount).
   *
   * Phase 116: admitted, because an attach spawns an attach host process.
   * Detach stays unguarded on purpose: the teardown itself detaches.
   */
  attachSession(sessionId: string, sender: WebContents): Promise<void> {
    return this.ledger.admit('attachSession', () =>
      this.attachSessionAdmitted(sessionId, sender)
    );
  }

  private async attachSessionAdmitted(
    sessionId: string,
    sender: WebContents
  ): Promise<void> {
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
    // Phase 116: a durable write, refused once shutdown starts. It completes
    // inside one tick, so it needs refusal but not admission.
    if (this.shuttingDown || this.disposed) throw shutdownRefusal('addProject');
    const abs = resolvePath(path);
    if (!isDirectory(abs)) {
      throw gmuxError(
        'INVALID_INPUT',
        'That folder does not exist.',
        abs
      );
    }
    const project = this.manifest.upsertProject({
      id: randomUUID(),
      path: abs,
      // Phase 74: basename is empty for the root of a volume. See
      // ../projects/name for what a nameless folder is called and why.
      name: projectNameForPath(abs)
    });
    // PHASE 93. The folder has a tab again, so the record of the last close is
    // no longer true and is cleared. Leaving it would let a surface tell a
    // person they had closed a tab that is open in front of them.
    this.manifest.clearProjectTabClosed({ path: abs });
    return project;
  }

  /**
   * PHASE 90.3. One folder on one machine, opened as a project tab.
   *
   * IT ANSWERS A REASON WORD AND NEVER A SENTENCE. The renderer draws every
   * sentence a person reads about a machine, which keeps them all in one file
   * and keeps the vocabulary audit reading one file.
   *
   * ONE ROUND TRIP, AND IT IS A READ. `listRemoteDir` asks that machine what is
   * inside the folder, through the frozen `dir-list` script Phase 84 shipped. It
   * writes nothing on either computer. It is asked HERE, once per project add,
   * rather than once per session create, which is where research 56 section 4.5
   * moved it.
   *
   * IT DOES NOT FAIL OPEN. A machine that did not answer refuses the add. That
   * is the opposite of `assertRemoteDirUsable`, which fails open on purpose
   * because a create is about to talk to the same machine anyway. Nothing talks
   * to the machine after this, so a tab made on no answer at all would be a tab
   * whose folder nobody ever checked.
   */
  addRemoteProject(
    input: AddRemoteProjectInput
  ): Promise<AddRemoteProjectResult> {
    // Phase 116: admitted, because it writes a durable project row and reads
    // the folder through the exec plane.
    return this.ledger.admit('addRemoteProject', () =>
      this.addRemoteProjectAdmitted(input)
    );
  }

  private async addRemoteProjectAdmitted(
    input: AddRemoteProjectInput
  ): Promise<AddRemoteProjectResult> {
    const path = input.path.trim();
    if (!path.startsWith('/')) return { ok: false, reason: 'notAbsolute' };
    if (machineRow(input.machineId) === null) {
      return { ok: false, reason: 'noSuchMachine' };
    }
    try {
      readyRemoteContext(input.machineId);
    } catch {
      return { ok: false, reason: 'notConnected' };
    }
    const listing = await listRemoteDir({ machineId: input.machineId, path });
    if (listing.refusal !== null) return { ok: false, reason: listing.refusal };
    // The machine's OWN resolution of the path, not the string that was typed.
    // A person who typed a trailing slash gets the tab the machine named.
    const stored = listing.path.length > 0 ? listing.path : path;
    const alreadyOpen =
      this.manifest.getRemoteProject(input.machineId, stored) !== undefined;
    const project = this.manifest.upsertRemoteProject({
      machineId: input.machineId,
      path: stored,
      name: projectNameForPath(stored)
    });
    // PHASE 93, the same clear the local add runs, matched on this machine so a
    // folder with the same path on this Mac keeps its own record.
    this.manifest.clearProjectTabClosed({
      path: stored,
      machineId: input.machineId
    });
    return { ok: true, project, alreadyOpen };
  }

  listProjects(): Project[] {
    return this.manifest.listProjects();
  }

  removeProject(projectId: string): void {
    // Phase 116: it deletes the project row and stamps sessions, refused once
    // shutdown starts.
    if (this.shuttingDown || this.disposed) {
      throw shutdownRefusal('removeProject');
    }
    // Closing the tab also stops the repo watcher (Phase 4) — best-effort,
    // and BEFORE the row disappears so we still know the path.
    const project = this.manifest
      .listProjects()
      .find((p) => p.id === projectId);
    // PHASE 90.3. The watcher watches a folder on THIS Mac. A tab for a folder
    // on another machine never armed one, and asking to stop watching a path
    // that names nothing here would be a local read done in a machine's name.
    if (project !== undefined && (project.machineId ?? 'local') === 'local') {
      void unwatchGitRepo(project.path).catch(() => undefined);
    }
    // PHASE 93. The sessions this tab leaves behind are stamped with what Tortie
    // knew about the tab, in ONE DURABLE WRITE, BEFORE the project row is
    // deleted.
    //
    // WHY THIS ORDER AND NOT THE OTHER. The project row has never been durable.
    // A crash between these two writes can therefore only lose the tab, which
    // costs a tab and nothing else. Deleting first and stamping second could
    // lose the record of a tab that is already gone, which is the exact state
    // this item exists to remove.
    //
    // NO STATUS MOVES AND NOTHING IS ENDED. Every session in the folder keeps
    // running, keeps its `project_path` and its `machine_id`, and stays in the
    // attention list where it can be reached and cleared.
    let stampedCount = 0;
    if (project !== undefined) {
      const machineId = project.machineId ?? 'local';
      stampedCount = this.manifest.markProjectTabClosed(
        machineId === 'local'
          ? { path: project.path }
          : { path: project.path, machineId },
        {
          v: 1,
          projectId: project.id,
          projectName: project.name,
          ...(machineId === 'local' ? {} : { machineId }),
          path: project.path,
          closedAt: Date.now()
        }
      );
      if (stampedCount > 0) {
        sessionsLog.info('project tab closed, sessions stamped', {
          projectId: project.id,
          sessions: stampedCount
        });
      }
    }
    this.manifest.deleteProject(projectId); // sessions keep their history
    // PHASE 93, FIX ROUND. The stamp above is a fact about a SESSION, and the
    // window holds its own copy of the session list. Closing a tab pushes the
    // project list and nothing else, so without this the rows in the window
    // still read as sessions whose folder never had a tab.
    //
    // MEASURED on 2026-08-19 in build/probe-p93-attention.mjs: 700 ms after the
    // close was confirmed, the window's row for a session in that folder still
    // carried no record of the tab, and it carried one after a quit and a
    // start. `jumpToSession` reads exactly that field to decide whether a tab
    // coming back needs a sentence, so a person who closed a tab themselves
    // could be told the folder had never had one. It is pushed here, once,
    // rather than waiting for the next poll.
    if (stampedCount > 0) this.broadcastSessions();
  }

  // -------------------------------------------------------------------------
  // Shutdown — attach clients die, tmux sessions all SURVIVE (T1 by design)
  // -------------------------------------------------------------------------

  /**
   * Phase 116. Called once by `shutdownGmuxCore()` as soon as the boot has
   * settled. From this line on, every guarded mutator answers with the typed
   * `SHUTTING_DOWN` refusal instead of running against a core that is about
   * to be disposed.
   */
  beginShutdown(): void {
    this.ledger.beginShutdown();
  }

  /**
   * Phase 116. Wait for every admitted mutation to settle, bounded.
   *
   * The bound keeps the promise the quit path has always made: a sick call
   * can never wedge quit. The common quit pays nothing here, because the set
   * is empty unless a mutation is actually in flight.
   */
  async joinAdmitted(deadlineMs: number): Promise<void> {
    await this.ledger.join(deadlineMs);
  }

  /**
   * PHASE 141. Put the command that continues this session's conversation back
   * on the person's prompt, and say what the screen showed afterwards.
   *
   * IT NEVER PRESSES ENTER. The person presses Enter, at the end of the line
   * Tortie typed, in the session he is already looking at. That is the only
   * press that starts anything, and it is the same promise the armed restore
   * has made since the first release.
   *
   * A SESSION ON ANOTHER MACHINE IS NOT SERVED AND SAYS SO. There is no local
   * process table over there, so no witness can ever exist for such a row, and
   * `resumeMark` in the renderer already returns nothing for every remote row
   * for the same family of reasons. A remote version of this would be its own
   * phase.
   */
  async resumeSessionInPlace(sessionId: string): Promise<ResumeInPlaceResult> {
    if (isRemoteSessionId(sessionId)) {
      return { landing: null, refusal: 'not-here', before: 0, after: 0 };
    }
    return this.resumeInPlace.resumeInPlace(sessionId);
  }

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
    // PHASE 141. Its confirmation timers are unref'd, so this is about a
    // settle landing after teardown rather than about holding the process
    // open: a confirmation that fired later would touch a closed manifest.
    this.resumeInPlace.dispose();
    this.fold.dispose();
    setLiveFoldScheduler(null);
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

// ---------------------------------------------------------------------------
// Core lifecycle — boot once, retry on demand after a failed boot
// ---------------------------------------------------------------------------

/**
 * Phase 116. The one refusal sentence, used by every refusal site. It is the
 * phase's only user facing string. A person almost never reads it, because it
 * fires only after they chose to quit, while the windows are closing, and
 * every renderer call site already catches invoke rejections. It exists so
 * that any surface that does render the error, e.g. a log line, shows a true
 * and simple sentence.
 */
const SHUTDOWN_REFUSAL = 'Tortie is quitting, so this action was not started.';

/**
 * Phase 116. The one place the typed refusal is built. The guards read the
 * two instance flags inline, on purpose: several seam tests in this tree
 * borrow the real methods off `GmuxCore.prototype` and run them against a
 * plain object holding only the fields the body touches, and an inline read
 * of a missing flag is simply false, exactly as it is for a live core that
 * is not shutting down.
 */
function shutdownRefusal(entry: string): Error {
  return gmuxError('SHUTTING_DOWN', SHUTDOWN_REFUSAL, entry);
}

/**
 * Phase 116. Where the module singleton is in its life. `shuttingDown` is the
 * state every refusal reads, and it is entered synchronously on the first
 * line of `shutdownGmuxCore()` so the gate closes in the same tick the quit
 * flow starts.
 */
export type CoreLifecycleState = 'empty' | 'booting' | 'ready' | 'shuttingDown';

let lifecycle: CoreLifecycleState = 'empty';

/**
 * Phase 116. Read by the tests and the shutdown-refusal harness. No IPC
 * channel exposes it, on purpose: the renderer has no business steering by
 * the main process's internal lifecycle.
 */
export function coreLifecycleState(): CoreLifecycleState {
  return lifecycle;
}

let corePromise: Promise<GmuxCore> | null = null;

/**
 * The teardown in flight, so a second caller joins it rather than starting a
 * second one (Phase 77).
 *
 * It is cleared once the teardown settles, and that is what keeps a second
 * boot-and-shutdown cycle in the same process real work. A promise that was
 * never reset would make cycle two join a settled promise, return at once, and
 * skip the snapshot pass, the capture drain, the quit generation and dispose.
 * Every durability harness in the tree is built from those cycles.
 */
let shutdownPromise: Promise<void> | null = null;

/**
 * Boot (or return) the singleton core. A failed boot clears the cache so the
 * next call retries — e.g. after the user installs tmux and hits "Try again".
 *
 * Phase 77 made the slot survive the shutdown window, so this used to hand
 * back the core being torn down. Phase 116 replaces that with a typed
 * refusal: during a shutdown the caller gets `SHUTTING_DOWN`, never the
 * dying instance and never a second boot. Every mutating IPC handler
 * acquires through this function, so this one check closes the whole IPC
 * surface, reads included. That is deliberate. Fail closed means the gate
 * does not sort calls into safe and unsafe while the core underneath it is
 * being disposed. The refusal never touches `corePromise`, so the teardown
 * in flight keeps the instance it captured.
 *
 * The boot callbacks are guarded on the `booting` state: a shutdown can
 * start while boot is still in flight, and the boot resolving later must not
 * overwrite `shuttingDown` with `ready`.
 */
export function getGmuxCore(): Promise<GmuxCore> {
  if (lifecycle === 'shuttingDown') {
    return Promise.reject(shutdownRefusal('getGmuxCore'));
  }
  if (corePromise === null) {
    lifecycle = 'booting';
    corePromise = GmuxCore.boot();
    corePromise.then(
      () => {
        if (lifecycle === 'booting') lifecycle = 'ready';
      },
      () => {
        if (lifecycle === 'booting') lifecycle = 'empty';
        corePromise = null;
      }
    );
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
  if (shutdownPromise !== null) return shutdownPromise;
  if (corePromise === null) return;
  // Phase 116. Set synchronously, before any await, so the acquisition gate
  // closes in the same tick the quit flow starts. The instance flag flips as
  // soon as the boot has settled, below. Between those two moments no
  // mutation can slip through, because every path to a mutator runs either
  // through getGmuxCore(), which is already refusing, or through a reference
  // whose calls land after beginShutdown() in the same awaited sequence.
  lifecycle = 'shuttingDown';
  const pending = corePromise;
  shutdownPromise = (async () => {
    try {
      const core = await pending;
      // Phase 116. Refusals on from here, then the join, BEFORE the snapshot
      // pass, so the final snapshot and the quit manifest generation see the
      // admitted work's result, e.g. the session a create just declared. The
      // join is bounded, so quit cannot wedge on a sick call.
      core.beginShutdown();
      await core.joinAdmitted(MUTATION_JOIN_DEADLINE_MS).catch(() => undefined);
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
      /* boot never finished, so there is nothing to tear down */
    } finally {
      // Phase 77. The slot is cleared HERE, after dispose has returned, and not
      // before the snapshot race above. It used to be cleared on the third line
      // of this function, so for the whole 8,000 ms window getGmuxCore() saw an
      // empty slot and called GmuxCore.boot() again. Measured before the fix,
      // with the snapshot pass held open: two boots, and the second core was
      // then left in the slot after the shutdown finished, because this
      // function had already captured the first promise.
      corePromise = null;
      shutdownPromise = null;
      // Phase 116. The circle closes: a later boot in the same process, e.g.
      // the second cycle every durability harness runs, starts from `empty`.
      lifecycle = 'empty';
    }
  })();
  return shutdownPromise;
}
