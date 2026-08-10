/**
 * gmux main-process wiring — the Phase 2 durable session core.
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
 */

import { BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import type {
  IpcMainInvokeEvent,
  MenuItemConstructorOptions,
  WebContents
} from 'electron';
import { randomUUID } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { basename, resolve as resolvePath } from 'node:path';
import type {
  EventChannel,
  EventPayloadMap,
  InvokeChannel,
  InvokeReq,
  InvokeRes,
  PopupMenuInput
} from '@shared/ipc';
import { EVT_SESSIONS_CHANGED, EVT_STATUS_CHANGED } from '@shared/ipc';
import type {
  CreateSessionInput,
  Project,
  RenameSessionInput,
  ResizeInput,
  Session,
  SessionStatus
} from '@shared/types';
import { AttachHost } from './attach';
import { unwatchGitRepo } from './git';
import {
  buildLaunchSpec,
  codexResumeArgv,
  ManifestStore,
  toSession,
  watchForRollout,
  type ManifestSessionRecord,
  type RolloutWatch
} from './manifest';
// LEAF restore modules only — ./restore/ipc imports this file (no cycles).
import { restoreSessionInTmux } from './restore/restore';
import { captureSessionSnapshot, deleteSnapshot } from './restore/snapshots';
import * as tmux from './tmux';
import { gmuxError, isGmuxError } from './tmux';

// ---------------------------------------------------------------------------
// Broadcast helper — every event goes to every window (single-window app,
// but reloads/devtools can briefly hold more than one).
// ---------------------------------------------------------------------------

function broadcast<C extends EventChannel>(
  channel: C,
  ...payload: EventPayloadMap[C]
): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...payload);
    }
  }
}

// ---------------------------------------------------------------------------
// GmuxCore — owns manifest + control client + attach host + id maps
// ---------------------------------------------------------------------------

const REFRESH_DEBOUNCE_MS = 150;

/** Cadence of the all-sessions status poll (bell / activity / dead panes). */
const STATUS_POLL_MS = 2_000;
/** No output for this long (and no bell) → the session reads as 'idle'. */
const MAIN_IDLE_AFTER_MS = 15_000;

export class GmuxCore {
  readonly manifest: ManifestStore;
  readonly control: tmux.TmuxControlClient;
  readonly attachHost: AttachHost;

  /** manifest session id → live tmux `$-id` (rebuilt on every reconcile). */
  private readonly liveIds = new Map<string, string>();
  /** live tmux `$-id` → manifest session id. */
  private readonly byTmuxId = new Map<string, string>();
  /** Pending Codex rollout watches, cancelled on kill/shutdown. */
  private readonly rolloutWatches = new Map<string, RolloutWatch>();
  /** Session ids with a restore in flight ("Restore all" double-clicks). */
  private readonly restoresInFlight = new Set<string>();

  private refreshTimer: NodeJS.Timeout | null = null;
  private statusTimer: NodeJS.Timeout | null = null;
  private statusPollBusy = false;
  private disposed = false;

  /**
   * Diagnostic tap: called with (sessionId, byteLength) for every term:data
   * flush the attach host sends. Used by the smoke harness to assert bytes
   * really flow through main; never wired in production.
   */
  onTermData: ((sessionId: string, byteLength: number) => void) | null = null;

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
    this.wireControlEvents();
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
    // Exit-code truth (§6.6): the conf sets `remain-on-exit failed`, but a
    // long-lived server started under an older conf never re-reads it —
    // assert it here so failed panes stay readable for the reaper below.
    await tmux
      .execTmux(['set-option', '-g', 'remain-on-exit', 'failed'])
      .catch((err: unknown) => {
        console.warn(
          `[gmux] could not set remain-on-exit: ${(err as Error).message}`
        );
      });
    await core.refresh();
    core.startStatusWatcher();
    return core;
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
    const target = this.liveIds.get(sessionId) ?? rec.tmuxName;
    try {
      if (await tmux.hasSession(target)) return; // server hiccup, session lives
    } catch {
      /* unreachable server → refresh below sorts out restorable-vs-exited */
    }
    this.scheduleRefresh();
  }

  // -------------------------------------------------------------------------
  // Codex rollout harvest (create time + boot resume)
  // -------------------------------------------------------------------------

  /**
   * Watch ~/.codex/sessions for the rollout file that identifies a codex
   * session's conversation id; record it (with the armed `codex resume`
   * argv) the moment it appears. Used at create time AND re-armed on boot
   * for codex sessions that were spawned but never harvested (e.g. gmux
   * quit within the harvest window).
   */
  private startRolloutWatch(
    id: string,
    cwd: string,
    sinceTs: number,
    extraArgs: readonly string[]
  ): void {
    if (this.rolloutWatches.has(id)) return;
    const watch = watchForRollout(cwd, sinceTs);
    this.rolloutWatches.set(id, watch);
    watch.promise
      .then((rollout) => {
        this.rolloutWatches.delete(id);
        // The session may have been killed/discarded while we watched.
        const rec = this.manifest.getSession(id);
        if (rec === undefined) return;
        // Resume with the session's recorded ABSOLUTE binary (Bug A).
        this.manifest.setAgentSessionId(
          id,
          rollout.sessionId,
          codexResumeArgv(rollout.sessionId, extraArgs, rec.argv[0] ?? 'codex')
        );
        const live = this.liveIds.get(id);
        if (live !== undefined) {
          void tmux
            .setSessionOption(live, '@gmux-session-id', rollout.sessionId)
            .catch(() => undefined);
        }
        this.broadcastSessions();
      })
      .catch((err: unknown) => {
        this.rolloutWatches.delete(id);
        console.warn(`[gmux] codex rollout harvest: ${(err as Error).message}`);
      });
  }

  /**
   * Boot-time finalization: any LIVE codex session still missing its
   * agentSessionId gets a fresh rollout watch keyed to its original spawn
   * time, so resume ids are recorded even across a gmux restart mid-harvest.
   * extraArgs are recovered from the recorded launch argv (["codex", ...]).
   */
  private resumeRolloutHarvests(): void {
    for (const rec of this.manifest.listSessions()) {
      if (rec.agent !== 'codex') continue;
      if (rec.agentSessionId !== undefined) continue;
      if (rec.status === 'exited' || rec.status === 'restorable') continue;
      if (!this.liveIds.has(rec.id)) continue;
      this.startRolloutWatch(rec.id, rec.cwd, rec.createdAt, rec.argv.slice(1));
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
      const target = this.liveIds.get(rec.id) ?? rec.tmuxName;
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
      const outcome = await restoreSessionInTmux(rec);
      const { info } = outcome;

      this.liveIds.set(sessionId, info.sessionId);
      this.byTmuxId.set(info.sessionId, sessionId);
      const updated = this.manifest.updateSession(sessionId, {
        tmuxName: info.tmuxName,
        status: 'running',
        lastSeen: Date.now()
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
    const result = this.manifest.reconcile(liveInfos.map((s) => s.tmuxName));

    this.liveIds.clear();
    this.byTmuxId.clear();
    for (const info of liveInfos) {
      const rec = this.manifest.getSessionByTmuxName(info.tmuxName);
      if (rec && rec.status !== 'exited') {
        this.liveIds.set(rec.id, info.sessionId);
        this.byTmuxId.set(info.sessionId, rec.id);
      }
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
      }
    }
    this.broadcastSessions();

    // Phase 6: codex sessions that outlived a gmux restart mid-harvest get
    // their rollout watch re-armed (no-op when the id is already recorded).
    this.resumeRolloutHarvests();
  }

  private statusSnapshot(): Map<string, SessionStatus> {
    const map = new Map<string, SessionStatus>();
    for (const rec of this.manifest.listSessions()) map.set(rec.id, rec.status);
    return map;
  }

  // -------------------------------------------------------------------------
  // All-sessions status watcher (Phase 8 — attention coverage, Principle 3)
  // -------------------------------------------------------------------------

  /**
   * Watch EVERY running session, not just the visible one. The renderer's
   * StatusDetector only sees bytes for the attached pane, so bell coverage
   * (⌘J, Dock badge, tab roll-ups) for hidden sessions comes from here: one
   * cheap `list-panes -a` poll reads, for all sessions at once,
   *   - #{window_bell_flag}   BEL rang and was not yet seen → needs_input
   *     (verified on tmux 3.6a: the flag sets for unattached sessions and
   *     clears when the user views the session through an attach client);
   *   - #{window_activity}    recent output → running; sustained quiet → idle;
   *   - #{pane_dead}/#{pane_dead_status}  the process exited non-zero
   *     (`remain-on-exit failed` keeps only failed panes) → reap: record the
   *     REAL exit code in the manifest (§6.6 exit-code truth), then kill.
   * The visible session is polled too — harmless, because the renderer's
   * finer per-byte detection overrides main's status for the session it
   * watches (see store.ts effectiveStatus).
   */
  startStatusWatcher(): void {
    if (this.statusTimer !== null || this.disposed) return;
    this.statusTimer = setInterval(() => {
      if (this.statusPollBusy) return;
      this.statusPollBusy = true;
      void this.pollSessionStatus()
        .catch(() => undefined) // unreachable server — next tick retries
        .finally(() => {
          this.statusPollBusy = false;
        });
    }, STATUS_POLL_MS);
    // Never hold the process open just for the poll (smoke harness exits).
    this.statusTimer.unref?.();
  }

  private async pollSessionStatus(): Promise<void> {
    const out = await tmux.execTmux([
      'list-panes',
      '-a',
      '-F',
      '#{session_id}\t#{window_bell_flag}\t#{window_activity}\t#{pane_dead}\t#{pane_dead_status}'
    ]);
    if (this.disposed) return;
    const now = Date.now();
    let changed = false;
    for (const line of out.split('\n')) {
      if (line.length === 0) continue;
      const [tmuxId, bell, activity, dead, deadStatus] = line.split('\t');
      if (tmuxId === undefined) continue;
      const sessionId = this.byTmuxId.get(tmuxId);
      if (sessionId === undefined) continue; // control session / unmanaged
      const rec = this.manifest.getSession(sessionId);
      if (!rec || rec.status === 'exited' || rec.status === 'restorable') {
        continue;
      }

      if (dead === '1') {
        const code =
          deadStatus !== undefined && /^\d+$/.test(deadStatus)
            ? parseInt(deadStatus, 10)
            : undefined;
        await this.reapDeadSession(sessionId, code);
        changed = true;
        continue;
      }

      const activityMs = Number(activity) * 1000;
      const next: SessionStatus =
        bell === '1'
          ? 'needs_input'
          : now - activityMs <= MAIN_IDLE_AFTER_MS
            ? 'running'
            : 'idle';
      if (next !== rec.status) {
        this.manifest.setStatus(sessionId, next);
        broadcast(EVT_STATUS_CHANGED, sessionId, next);
        changed = true;
      }
    }
    if (changed) this.broadcastSessions();
  }

  /**
   * A pane died with a non-zero exit and `remain-on-exit failed` kept it
   * readable: record the exit code, snapshot the scrollback, kill the shell
   * of the session, and flip the manifest to 'exited' — the renderer shows
   * "Session ended unexpectedly (exit N)" with [Restart][Remove].
   */
  private async reapDeadSession(
    sessionId: string,
    exitCode: number | undefined
  ): Promise<void> {
    const rec = this.manifest.getSession(sessionId);
    if (!rec) return;
    this.attachHost.detach(sessionId); // expected teardown, not a surprise
    const target = this.liveIds.get(sessionId) ?? rec.tmuxName;
    await captureSessionSnapshot(target, sessionId).catch(() => undefined);
    await tmux.killSession(target).catch(() => undefined);
    const live = this.liveIds.get(sessionId);
    if (live !== undefined) this.byTmuxId.delete(live);
    this.liveIds.delete(sessionId);
    this.manifest.updateSession(sessionId, {
      status: 'exited',
      lastSeen: Date.now(),
      ...(exitCode !== undefined ? { exitCode } : {})
    });
    broadcast(EVT_STATUS_CHANGED, sessionId, 'exited');
  }

  broadcastSessions(): void {
    broadcast(EVT_SESSIONS_CHANGED, this.listSessions());
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
    if (input.agent !== 'shell') {
      const bare = input.agent;
      const abs = await tmux.resolveBinary(bare);
      if (abs === null) {
        throw gmuxError(
          'AGENT_NOT_FOUND',
          `${bare} not found — install it, or make sure your shell PATH includes it.`,
          bare
        );
      }
      binPath = abs;
    }

    const spec = buildLaunchSpec(input.agent, input.extraArgs ?? [], binPath);
    const id = randomUUID();
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
      ...(spec.env !== undefined ? { env: spec.env } : {})
    };

    // §2.4 Step 0: durability record exists BEFORE the process does.
    this.manifest.insertSession(record);

    let info: tmux.TmuxSessionInfo;
    try {
      info = await tmux.createSession({
        displayName: input.name,
        cwd,
        argv: spec.argv,
        ...(spec.env !== undefined ? { env: spec.env } : {})
      });
    } catch (err) {
      // Spawn never happened — a lingering row would resurrect a session
      // the user never got.
      this.manifest.deleteSession(id);
      throw err;
    }

    this.liveIds.set(id, info.sessionId);
    this.byTmuxId.set(info.sessionId, id);
    if (info.tmuxName !== record.tmuxName) {
      this.manifest.updateSession(id, { tmuxName: info.tmuxName });
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

    // Codex has no --session-id equivalent: harvest the rollout uuid from
    // ~/.codex/sessions after spawn and record the armed resume argv.
    if (spec.idCapture === 'rollout-watch') {
      this.startRolloutWatch(id, cwd, now, input.extraArgs ?? []);
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
    const watch = this.rolloutWatches.get(sessionId);
    if (watch !== undefined) {
      watch.cancel();
      this.rolloutWatches.delete(sessionId);
    }
    this.attachHost.detach(sessionId);
    const target = this.liveIds.get(sessionId) ?? rec.tmuxName;
    // Session-close snapshot (§2.4 Step 2 capture point) — best-effort,
    // BEFORE the pane disappears.
    if (rec.status !== 'exited' && rec.status !== 'restorable') {
      await captureSessionSnapshot(target, sessionId).catch(() => undefined);
    }
    await tmux.killSession(target); // idempotent — already-gone is fine
    const live = this.liveIds.get(sessionId);
    if (live !== undefined) this.byTmuxId.delete(live);
    this.liveIds.delete(sessionId);
    this.manifest.setStatus(sessionId, 'exited');
    broadcast(EVT_STATUS_CHANGED, sessionId, 'exited');
    this.broadcastSessions();
  }

  /** Remove a session row entirely (discard a restorable / smoke cleanup). */
  discardSession(sessionId: string): void {
    this.manifest.deleteSession(sessionId);
    const live = this.liveIds.get(sessionId);
    if (live !== undefined) this.byTmuxId.delete(live);
    this.liveIds.delete(sessionId);
    // The row is gone — its snapshot is unreachable garbage now.
    void deleteSnapshot(sessionId).catch(() => undefined);
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
      // Maps can lag one reconcile behind — resolve directly before failing.
      const live = await tmux.listSessions();
      const info = live.find((s) => s.tmuxName === rec.tmuxName);
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
    this.attachHost.detach(sessionId);
  }

  resizeSession(input: ResizeInput): void {
    this.attachHost.resize(input.sessionId, input.cols, input.rows);
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
    for (const watch of this.rolloutWatches.values()) watch.cancel();
    this.rolloutWatches.clear();
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
    core.dispose();
  } catch {
    /* boot never finished — nothing to tear down */
  }
}

// ---------------------------------------------------------------------------
// IPC handler registration
// ---------------------------------------------------------------------------

/** Typed ipcMain.handle wrapper pinned to the frozen contract. */
function handle<C extends InvokeChannel>(
  channel: C,
  fn: (
    event: IpcMainInvokeEvent,
    ...args: InvokeReq<C>
  ) => Promise<InvokeRes<C>> | InvokeRes<C>
): void {
  ipcMain.handle(channel, (event, ...args) =>
    fn(event, ...(args as InvokeReq<C>))
  );
}

// ---------------------------------------------------------------------------
// ui:popupMenu — native macOS context menus (DESIGN.md §3: context menus are
// native Menu.popup, never DOM-drawn). The renderer's store translates its
// MenuSpec into PopupMenuInput; the resolved item id (null when dismissed)
// maps back to the item's run() callback renderer-side.
// ---------------------------------------------------------------------------

/**
 * Display-only shortcut hint → Electron accelerator (e.g. "F2", "⌘W" →
 * "Cmd+W"). Popup-menu accelerators are never registered globally — they
 * only render the keycap and fire while the menu is open, which matches the
 * native context-menu convention. Unmappable hints are simply dropped.
 */
function hintToAccelerator(hint: string | undefined): string | null {
  if (hint === undefined || hint.length === 0) return null;
  const acc = hint
    .replace(/⌘/g, 'Cmd+')
    .replace(/⇧/g, 'Shift+')
    .replace(/⌥/g, 'Alt+')
    .replace(/⌃/g, 'Ctrl+')
    .replace(/↩|⏎/g, 'Return');
  return /^([A-Za-z]+\+)*[A-Za-z0-9]+$/.test(acc) ? acc : null;
}

function registerPopupMenuHandler(): void {
  ipcMain.handle(
    'ui:popupMenu',
    (event: IpcMainInvokeEvent, input: PopupMenuInput): Promise<string | null> =>
      new Promise((resolve) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win || win.isDestroyed()) {
          resolve(null);
          return;
        }
        let clicked: string | null = null;
        const template: MenuItemConstructorOptions[] = input.items.map(
          (item) => {
            if (item.type === 'separator') {
              return { type: 'separator' as const };
            }
            const accelerator = hintToAccelerator(item.hint);
            return {
              label: item.label,
              enabled: item.enabled ?? true,
              // `destructive` has no native Electron menu treatment; the
              // confirm dialogs behind those items carry the red styling.
              ...(accelerator !== null ? { accelerator } : {}),
              click: (): void => {
                clicked = item.id;
              }
            };
          }
        );
        Menu.buildFromTemplate(template).popup({
          window: win,
          x: Math.round(input.x),
          y: Math.round(input.y),
          // close-callback can fire before a queued click handler — give the
          // click one macrotask to land before resolving.
          callback: () => {
            setImmediate(() => resolve(clicked));
          }
        });
      })
  );
}

/**
 * Register every sessions:* and projects:* handler. The git and fs channels
 * are owned by the Phase 3 streams (src/main/git/, src/main/fs/) and are NOT
 * registered here.
 */
export function registerIpcHandlers(): void {
  registerPopupMenuHandler();

  handle('sessions:create', async (_e, input) =>
    (await getGmuxCore()).createSession(input)
  );
  handle('sessions:list', async () => (await getGmuxCore()).listSessions());
  handle('sessions:rename', async (_e, input) =>
    (await getGmuxCore()).renameSession(input)
  );
  handle('sessions:kill', async (_e, sessionId) =>
    (await getGmuxCore()).killSession(sessionId)
  );
  handle('sessions:attach', async (e, sessionId) =>
    (await getGmuxCore()).attachSession(sessionId, e.sender)
  );
  handle('sessions:detach', async (_e, sessionId) =>
    (await getGmuxCore()).detachSession(sessionId)
  );
  handle('sessions:resize', async (_e, input) =>
    (await getGmuxCore()).resizeSession(input)
  );

  handle('projects:add', async (_e, path) =>
    (await getGmuxCore()).addProject(path)
  );
  handle('projects:list', async () => (await getGmuxCore()).listProjects());
  handle('projects:remove', async (_e, projectId) =>
    (await getGmuxCore()).removeProject(projectId)
  );
  handle('projects:pickDirectory', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const options = {
      properties: ['openDirectory', 'createDirectory'] as Array<
        'openDirectory' | 'createDirectory'
      >,
      message: 'Choose a project folder'
    };
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled) return null;
    return result.filePaths[0] ?? null;
  });
}
