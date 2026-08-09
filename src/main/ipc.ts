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

import { BrowserWindow, dialog, ipcMain } from 'electron';
import type { IpcMainInvokeEvent, WebContents } from 'electron';
import { randomUUID } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { basename, resolve as resolvePath } from 'node:path';
import type {
  EventChannel,
  EventPayloadMap,
  InvokeChannel,
  InvokeReq,
  InvokeRes
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
import {
  buildLaunchSpec,
  codexResumeArgv,
  ManifestStore,
  toSession,
  watchForRollout,
  type ManifestSessionRecord,
  type RolloutWatch
} from './manifest';
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

  private refreshTimer: NodeJS.Timeout | null = null;
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
    await core.refresh();
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
      // non-exited row flips to 'restorable'.
      this.scheduleRefresh();
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
  }

  private statusSnapshot(): Map<string, SessionStatus> {
    const map = new Map<string, SessionStatus>();
    for (const rec of this.manifest.listSessions()) map.set(rec.id, rec.status);
    return map;
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

    const spec = buildLaunchSpec(input.agent, input.extraArgs ?? []);
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
      const watch = watchForRollout(cwd, now);
      this.rolloutWatches.set(id, watch);
      watch.promise
        .then((rollout) => {
          this.rolloutWatches.delete(id);
          this.manifest.setAgentSessionId(
            id,
            rollout.sessionId,
            codexResumeArgv(rollout.sessionId, input.extraArgs ?? [])
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

/** Quit-time teardown. tmux sessions survive — that is the whole point. */
export async function shutdownGmuxCore(): Promise<void> {
  if (corePromise === null) return;
  const pending = corePromise;
  corePromise = null;
  try {
    (await pending).dispose();
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

/**
 * Register every sessions:* and projects:* handler. The git and fs channels
 * are owned by the Phase 3 streams (src/main/git/, src/main/fs/) and are NOT
 * registered here.
 */
export function registerIpcHandlers(): void {
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
