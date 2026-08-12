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
import { readdir, rm } from 'node:fs/promises';
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
import { agentBinaryName, registryResumeArgv } from '../agents';
import { unwatchGitRepo } from '../git';
import {
  agentRescuesId,
  agentRescuesIdAfterExit,
  ManifestStore,
  resolveLaunchSpec,
  toSession,
  watchForSessionId,
  type AgentLaunchSpec,
  type LiveTmuxSession,
  type ManifestSessionRecord,
  type SessionIdWatch
} from '../manifest';
// LEAF restore modules only — ../restore/ipc imports this file (no cycles).
import { restoreSessionInTmux } from '../restore/restore';
import {
  captureSessionSnapshot,
  deleteSnapshot,
  snapshotsDir
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
 *  - history-limit (Phase 13.7) is the one entry sourced from SETTINGS rather
 *    than a literal, and it is the one where drift is invisible: the conf's
 *    number wins on a server that outlived a settings change, and the user
 *    would see their new depth ignored for days with nothing to look at.
 */
const BOOT_SERVER_OPTIONS: readonly (readonly [string, string])[] = [
  ['remain-on-exit', 'failed'],
  ['mouse', 'off'],
  ['copy-mode-position-format', ''],
  ['mode-style', 'noattr,bg=default,fg=default']
];

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
      socketName: tmux.TMUX_SOCKET,
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

  /** Boot the whole durable core. Throws structured GmuxErrors on failure. */
  static async boot(): Promise<GmuxCore> {
    await tmux.ensureServer();
    const core = new GmuxCore(new ManifestStore());
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
    await core.refresh();
    core.startStatusWatcher();
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
      void this.snapshotAllSessions().finally(() => this.scheduleRefresh());
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
    options: { timeoutMs?: number; markUnavailableOnFailure?: boolean } = {}
  ): void {
    if (agent === 'shell' || !agentRescuesId(agent)) return;
    if (this.idCaptureWatches.has(id)) return;
    const watch = watchForSessionId(
      agent,
      ctx,
      options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}
    );
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
        this.manifest.setAgentSessionId(id, harvested.sessionId, resumeArgv);
        if (harvested.viaGraceTimer || harvested.confidence === 'weak') {
          // Armed, but not PROVEN to be this pane's conversation. Said out
          // loud in the log because the alternative is a confident restore
          // into somebody else's session.
          console.warn(
            `[gmux] ${agent} resume id ${harvested.sessionId} matched on ` +
              `'${harvested.key}'${harvested.viaGraceTimer ? ' via the grace timer' : ''} ` +
              `(${harvested.confidence}) — ${harvested.storePath}`
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
              markUnavailableOnFailure: true
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
        agentExtrasOf(rec)
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
   */
  async snapshotAllSessions(): Promise<void> {
    const jobs: Promise<unknown>[] = [];
    for (const rec of this.manifest.listSessions()) {
      if (rec.status === 'exited' || rec.status === 'restorable') continue;
      // F1: only capture panes we can prove are ours — a name-resolved
      // capture would file a STRANGER's scrollback as this session's
      // history and replay it on restore.
      const target = this.liveIds.get(rec.id);
      if (target === undefined) continue;
      jobs.push(
        captureSessionSnapshot(target, rec.id).catch((err: unknown) => {
          console.warn(
            `[gmux] snapshot failed for "${rec.name}": ${(err as Error).message}`
          );
        })
      );
    }
    await Promise.allSettled(jobs);
  }

  /**
   * Restore a 'restorable' session (§2.4 Step 3): recreate it in tmux with
   * $SHELL, replay the scrollback snapshot as inert history, and TYPE the
   * recorded resume command without Enter (armed). Idempotent for sessions
   * that are already live again.
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
    try {
      // The armed resume command may carry `--settings <path>`, and claude
      // refuses to start when that file is gone. Re-write it (recovering the
      // session's existing token) before the command is typed into the pane.
      if (rec.agent === 'claude') {
        ensureClaudeHookSettings(this.hookServer, sessionId);
      }
      const outcome = await restoreSessionInTmux(rec);
      const { info } = outcome;

      this.liveIds.set(sessionId, info.sessionId);
      this.byTmuxId.set(info.sessionId, sessionId);
      const updated = this.manifest.updateSession(sessionId, {
        tmuxName: info.tmuxName,
        status: 'running',
        lastSeen: Date.now(),
        ...(info.panePid !== undefined ? { panePid: info.panePid } : {})
      });

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

      broadcast(EVT_STATUS_CHANGED, sessionId, 'running');
      this.broadcastSessions();
      return toSession(updated);
    } finally {
      this.restoresInFlight.delete(sessionId);
    }
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
    const result = this.manifest.reconcile(await this.identify(liveInfos));

    this.liveIds.clear();
    this.byTmuxId.clear();
    for (const [sessionId, tmuxId] of result.bindings) {
      this.liveIds.set(sessionId, tmuxId);
      this.byTmuxId.set(tmuxId, sessionId);
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
      await captureSessionSnapshot(target, sessionId).catch(() => undefined);
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
      ...(capture !== undefined ? { specstory: capture } : {})
    };

    // §2.4 Step 0: durability record exists BEFORE the process does.
    this.manifest.insertSession(record);

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
      this.manifest.deleteSession(id);
      throw err;
    }

    this.liveIds.set(id, info.sessionId);
    this.byTmuxId.set(info.sessionId, id);
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

    // Mirror metadata into tmux user options so the durable server is
    // self-describing even if the manifest is lost (§2.4 Step 0.2).
    // Best-effort: a failed mirror must not fail the create.
    try {
      await tmux.setSessionOption(info.sessionId, '@gmux-id', id);
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
        input.extraArgs ?? []
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
        await captureSessionSnapshot(target, sessionId).catch(() => undefined);
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
    await Promise.race([
      core.snapshotAllSessions(),
      new Promise<void>((resolve) => setTimeout(resolve, 8_000))
    ]).catch(() => undefined);
    await Promise.race([
      core.captureSyncsIdle(),
      new Promise<void>((resolve) => setTimeout(resolve, SYNC_QUIT_TIMEOUT_MS))
    ]).catch(() => undefined);
    core.dispose();
  } catch {
    /* boot never finished — nothing to tear down */
  }
}
