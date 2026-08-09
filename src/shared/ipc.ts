/**
 * gmux IPC contract — FROZEN.
 *
 * Channel names, payload shapes, and the `window.gmux` bridge surface.
 * Existing declarations must not be changed; new channels/types may be
 * APPENDED. Note conflicts for the integrator instead of editing.
 */

import type {
  CreateSessionInput,
  GitCommitInput,
  GitLogEntry,
  GitLogInput,
  GitPathsInput,
  GitShowHeadInput,
  GitStatusResult,
  Project,
  ReadFileResult,
  RenameSessionInput,
  ResizeInput,
  Session,
  SessionStatus
} from './types';

// ---------------------------------------------------------------------------
// Invoke channels (renderer → main, request/response via ipcRenderer.invoke)
// ---------------------------------------------------------------------------

/**
 * Channel → { req: argument tuple, res: resolved value }.
 * Main registers with `ipcMain.handle(channel, ...)`; the preload bridge is
 * the only caller.
 */
export interface InvokeChannelMap {
  'sessions:create': { req: [input: CreateSessionInput]; res: Session };
  'sessions:list': { req: []; res: Session[] };
  'sessions:rename': { req: [input: RenameSessionInput]; res: Session };
  'sessions:kill': { req: [sessionId: string]; res: void };
  /** Start streaming term:data:<id> for this session (visible pane). */
  'sessions:attach': { req: [sessionId: string]; res: void };
  /** Stop streaming; the tmux-side session keeps running. */
  'sessions:detach': { req: [sessionId: string]; res: void };
  'sessions:resize': { req: [input: ResizeInput]; res: void };

  'projects:add': { req: [path: string]; res: Project };
  'projects:list': { req: []; res: Project[] };
  'projects:remove': { req: [projectId: string]; res: void };
  /** Native directory picker; null when the user cancels. */
  'projects:pickDirectory': { req: []; res: string | null };

  'git:status': { req: [repoPath: string]; res: GitStatusResult };
  'git:stage': { req: [input: GitPathsInput]; res: void };
  'git:unstage': { req: [input: GitPathsInput]; res: void };
  /** Resolves to the new commit hash. */
  'git:commit': { req: [input: GitCommitInput]; res: string };
  'git:discard': { req: [input: GitPathsInput]; res: void };
  'git:log': { req: [input: GitLogInput]; res: GitLogEntry[] };
  /** Contents of the file at HEAD (empty string for files new since HEAD). */
  'git:showHead': { req: [input: GitShowHeadInput]; res: string };

  'fs:readFile': { req: [path: string]; res: ReadFileResult };
  'fs:writeFile': { req: [path: string, contents: string]; res: void };
}

export type InvokeChannel = keyof InvokeChannelMap;

export type InvokeReq<C extends InvokeChannel> = InvokeChannelMap[C]['req'];
export type InvokeRes<C extends InvokeChannel> = InvokeChannelMap[C]['res'];

// ---------------------------------------------------------------------------
// Event channels (main → renderer, via webContents.send)
// ---------------------------------------------------------------------------

export const EVT_SESSIONS_CHANGED = 'sessions:changed' as const;
export const EVT_GIT_CHANGED = 'git:changed' as const;
export const EVT_STATUS_CHANGED = 'status:changed' as const;

/** Static event channel → payload tuple delivered to listeners. */
export interface EventPayloadMap {
  /** Full refreshed session list after any add/rename/kill/status change. */
  'sessions:changed': [sessions: Session[]];
  /** A repo's working tree / index / HEAD changed; re-pull git:status. */
  'git:changed': [repoPath: string];
  /** One session's status flipped (cheap, no full list). */
  'status:changed': [sessionId: string, status: SessionStatus];
}

export type EventChannel = keyof EventPayloadMap;

/**
 * Per-session terminal output stream (main → renderer).
 * Payload: a single Uint8Array chunk of raw PTY bytes.
 */
export const termDataChannel = (sessionId: string): string =>
  `term:data:${sessionId}`;

/**
 * Per-session terminal input (renderer → main, fire-and-forget send).
 * Payload: string (keystrokes/paste) — main writes it to the attach PTY.
 */
export const termInputChannel = (sessionId: string): string =>
  `term:input:${sessionId}`;

// ---------------------------------------------------------------------------
// The window.gmux bridge surface (implemented in src/preload/index.ts)
// ---------------------------------------------------------------------------

/** Returned by every subscription; call to unsubscribe. */
export type Unsubscribe = () => void;

export interface GmuxApi {
  sessions: {
    create(input: CreateSessionInput): Promise<Session>;
    list(): Promise<Session[]>;
    rename(input: RenameSessionInput): Promise<Session>;
    kill(sessionId: string): Promise<void>;
    attach(sessionId: string): Promise<void>;
    detach(sessionId: string): Promise<void>;
    resize(input: ResizeInput): Promise<void>;
    onChanged(cb: (sessions: Session[]) => void): Unsubscribe;
    onStatusChanged(
      cb: (sessionId: string, status: SessionStatus) => void
    ): Unsubscribe;
  };
  projects: {
    add(path: string): Promise<Project>;
    list(): Promise<Project[]>;
    remove(projectId: string): Promise<void>;
    pickDirectory(): Promise<string | null>;
  };
  git: {
    status(repoPath: string): Promise<GitStatusResult>;
    stage(input: GitPathsInput): Promise<void>;
    unstage(input: GitPathsInput): Promise<void>;
    commit(input: GitCommitInput): Promise<string>;
    discard(input: GitPathsInput): Promise<void>;
    log(input: GitLogInput): Promise<GitLogEntry[]>;
    showHead(input: GitShowHeadInput): Promise<string>;
    onChanged(cb: (repoPath: string) => void): Unsubscribe;
  };
  fs: {
    readFile(path: string): Promise<ReadFileResult>;
    writeFile(path: string, contents: string): Promise<void>;
  };
  term: {
    /** Subscribe to raw output bytes for a session (after sessions.attach). */
    onData(sessionId: string, cb: (data: Uint8Array) => void): Unsubscribe;
    /** Send keystrokes/paste to the session's PTY. */
    sendInput(sessionId: string, data: string): void;
  };
  /** App/platform facts safe to expose to the renderer. */
  meta: {
    platform: NodeJS.Platform;
    versions: { electron: string; chrome: string; node: string };
  };
}

// ---------------------------------------------------------------------------
// APPENDED by the attach/terminal stream (new channels/types only — nothing
// above this line was modified).
// ---------------------------------------------------------------------------

/**
 * Per-session flow-control ack (renderer → main, fire-and-forget send).
 * Payload: number — bytes of term:data the renderer has finished writing
 * into xterm. The attach host pauses the PTY when > 256 KB are in flight
 * unacked and resumes once acks bring the window back under 64 KB. If no
 * ack ever arrives (bridge method not wired), the attach host disables flow
 * control for that client after a grace period rather than deadlock.
 */
export const termAckChannel = (sessionId: string): string =>
  `term:ack:${sessionId}`;

/**
 * Per-session attach-client exit notice (main → renderer).
 * Sent ONLY for unexpected exits — the tmux session was killed elsewhere or
 * the tmux server went away. A clean sessions:detach never fires this.
 */
export const termExitChannel = (sessionId: string): string =>
  `term:exit:${sessionId}`;

/** Payload of termExitChannel. */
export interface TermExitPayload {
  sessionId: string;
  /** Exit code of the `tmux attach` client process. */
  exitCode: number;
  /** Signal number when the client died from a signal. */
  signal?: number;
}

/**
 * OPTIONAL extensions to GmuxApi['term'], feature-detected by the terminal
 * renderer (`typeof window.gmux.term.ack === 'function'`). INTEGRATOR: add
 * these two methods to the `term` object in src/preload/index.ts:
 *
 *   ack: (sessionId, bytes) =>
 *     ipcRenderer.send(termAckChannel(sessionId), bytes),
 *   onExit: (sessionId, cb) => {
 *     const ch = termExitChannel(sessionId);
 *     const l = (_e: IpcRendererEvent, p: TermExitPayload) => cb(p);
 *     ipcRenderer.on(ch, l);
 *     return () => ipcRenderer.removeListener(ch, l);
 *   }
 *
 * The renderer degrades gracefully when they are absent (no backpressure
 * acks → attach host's grace-period valve; exit notices → falls back to
 * sessions.onStatusChanged('exited')).
 */
export interface GmuxTermStreamExtras {
  /** Ack `bytes` of received term:data as consumed (flow control). */
  ack?(sessionId: string, bytes: number): void;
  /** Subscribe to unexpected attach-client exits for a session. */
  onExit?(
    sessionId: string,
    cb: (payload: TermExitPayload) => void
  ): Unsubscribe;
}
