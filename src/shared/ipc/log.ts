/**
 * The logging contract (Phase 35).
 *
 * Five channels. Four are Settings affordances (read the level, switch it,
 * open the folder, build the Copy Diagnostics text). One, `log:append`, is
 * the renderer error capture path: window.onerror, unhandledrejection and
 * the error boundary each write one line over it, and main is the only
 * process that touches the file. electron-log's own renderer transport,
 * preload injection and `__ELECTRON_LOG__` channel are never enabled; this
 * typed channel is the one renderer path into the log.
 *
 * The bounds (main-side, src/main/log/ipc.ts): an invalid line is dropped
 * whole and counted, msg is truncated at 2048 characters, serialized fields
 * are capped at 8 KiB, and each sender WebContents gets 200 accepted lines
 * per run. A renderer error loop must not be able to eat the log budget.
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/** Scopes a renderer may write. Anything else is dropped whole. */
export const RENDERER_LOG_SCOPES = ['renderer', 'settings'] as const;
export type RendererLogScope = (typeof RENDERER_LOG_SCOPES)[number];

export interface RendererLogLine {
  level: LogLevel;
  scope: RendererLogScope;
  msg: string;                        // truncated by main at 2048 chars
  fields?: Record<string, unknown>;   // serialized form capped by main at 8 KiB
}

export interface LogInvokeChannelMap {
  /** One renderer log line. Written with proctype "renderer". */
  'log:append': { req: [line: RendererLogLine]; res: void };
  /** The file transport level right now. */
  'log:level': { req: []; res: LogLevel };
  /** Runtime switch. Not persisted; a fresh run is back at info. */
  'log:setLevel': { req: [level: LogLevel]; res: void };
  /** Reveal <userData>/logs in Finder. */
  'log:openFolder': { req: []; res: void };
  /** The Copy diagnostics plain-text bundle. Never dump bytes. */
  'log:diagnostics': { req: []; res: string };
}

/** The `window.gmux.log` surface the preload assembles (src/preload/log.ts). */
export interface GmuxLogExtras {
  log?: {
    append(line: RendererLogLine): Promise<void>;
    level(): Promise<LogLevel>;
    setLevel(level: LogLevel): Promise<void>;
    openFolder(): Promise<void>;
    diagnostics(): Promise<string>;
  };
}
