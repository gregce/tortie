/**
 * gmux attach host — owns the `tmux attach` client PTYs for VISIBLE panes.
 *
 * One node-pty per attached session, running:
 *
 *   tmux -L gmux -f resources/gmux-tmux.conf attach-session -t =<tmuxName>
 *
 * (exact-match `=` addressing per FINAL-REPORT §2.4 Step 0; the PRIVATE
 * socket only — never the user's default tmux server.)
 *
 * Responsibilities:
 *  - stream PTY output to the renderer over term:data:<sessionId>, batching
 *    small chunks per ~8 ms flush window;
 *  - watermark flow control: pause the PTY when > 256 KB are in flight
 *    unacked by the renderer, resume under 64 KB. tmux keeps absorbing agent
 *    output server-side while we're paused — that is the designed failure
 *    mode. If the renderer bridge never acks (preload method not wired yet),
 *    a grace-period valve disables flow control instead of deadlocking;
 *  - renderer keystrokes from term:input:<sessionId> → pty.write;
 *  - resize → pty.resize (tmux resizes the session to the client);
 *  - detach kills ONLY the attach-client PTY — the tmux session lives on;
 *  - unexpected PTY exit (session killed elsewhere, server died) → notify
 *    the renderer on term:exit:<sessionId> and the main-side onExit hook.
 *
 * NOTE: we run the SYSTEM tmux (3.6a at build time); bundling a pinned tmux
 * inside gmux.app is out of scope today (FINAL-REPORT §5 Stream A1 owns the
 * shipping plan). Binary resolution below should be superseded by the tmux
 * stream's supervisor via AttachHostOptions.tmuxBin.
 */

import { app, ipcMain } from 'electron';
import type { IpcMainEvent, WebContents } from 'electron';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import * as nodePty from 'node-pty';
import type { IPty } from 'node-pty';
import {
  termAckChannel,
  termDataChannel,
  termExitChannel,
  termInputChannel
} from '@shared/ipc';
import type { TermExitPayload } from '@shared/ipc';
import type { GmuxErrorPayload } from '@shared/types';

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/** Pause the PTY when this many bytes are in flight without renderer acks. */
const HIGH_WATERMARK_BYTES = 256 * 1024;
/** Resume the PTY once unacked bytes drop below this. */
const LOW_WATERMARK_BYTES = 64 * 1024;
/** Batch window for coalescing PTY chunks into one IPC send (~1 frame). */
const FLUSH_INTERVAL_MS = 8;
/** Flush immediately if a batch grows past this within one window. */
const FLUSH_NOW_BYTES = 512 * 1024;
/**
 * If we pause and NO ack has ever arrived for this client, assume the
 * preload ack bridge is not wired and disable flow control after this long
 * (liveness over backpressure — never deadlock the terminal).
 */
const ACK_GRACE_MS = 3000;

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;

// ---------------------------------------------------------------------------
// Errors (GmuxErrorPayload JSON in Error.message, per src/shared/types.ts)
// ---------------------------------------------------------------------------

function gmuxError(
  code: GmuxErrorPayload['code'],
  message: string,
  detail?: string
): Error {
  const payload: GmuxErrorPayload = { code, message, detail };
  return new Error(JSON.stringify(payload));
}

// ---------------------------------------------------------------------------
// tmux binary / conf resolution
// ---------------------------------------------------------------------------

/**
 * GUI-launched Electron apps inherit a minimal PATH (no /opt/homebrew/bin),
 * so probe known locations. The tmux stream's supervisor is the intended
 * owner of this decision — pass AttachHostOptions.tmuxBin to override.
 */
function findTmux(): string | null {
  const candidates = [
    '/opt/homebrew/bin/tmux',
    '/usr/local/bin/tmux',
    '/usr/bin/tmux'
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function defaultConfPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'gmux-tmux.conf')
    : join(app.getAppPath(), 'resources', 'gmux-tmux.conf');
}

// ---------------------------------------------------------------------------
// AttachHost
// ---------------------------------------------------------------------------

export interface AttachHostOptions {
  /** Absolute tmux binary path (from the tmux stream's supervisor). */
  tmuxBin?: string;
  /** gmux-tmux.conf path; defaults to the packaged/dev resources location. */
  confPath?: string;
  /** Private socket name; default 'gmux'. NEVER the default server. */
  socketName?: string;
  /**
   * Main-side hook fired whenever an attach-client PTY exits.
   * `expected` is true for exits we caused (detach/re-attach/shutdown);
   * false means the tmux session was killed elsewhere or the server died —
   * the session owner should re-reconcile status (e.g. flip to 'exited').
   */
  onExit?: (sessionId: string, exitCode: number, expected: boolean) => void;
  /**
   * Main-side diagnostic tap: fired with the byte length of every term:data
   * flush sent to the renderer. Used by the smoke harness to assert output
   * really flows through main; no production consumer.
   */
  onData?: (sessionId: string, byteLength: number) => void;
}

export interface AttachRequest {
  sessionId: string;
  /** Sanitized tmux-side session name (Session.tmuxName). */
  tmuxName: string;
  /** Renderer that receives term:data / term:exit for this session. */
  sender: WebContents;
  /** Initial client size; the renderer fits + resizes right after attach. */
  cols?: number;
  rows?: number;
  /** cwd for the attach client process (cosmetic; default: home). */
  cwd?: string;
}

interface AttachClient {
  sessionId: string;
  pty: IPty;
  sender: WebContents;
  dataChannel: string;
  // --- batching ---
  pending: Buffer[];
  pendingBytes: number;
  flushTimer: NodeJS.Timeout | null;
  // --- flow control ---
  unackedBytes: number;
  paused: boolean;
  ackEverReceived: boolean;
  flowControlDisabled: boolean;
  ackGraceTimer: NodeJS.Timeout | null;
  // --- lifecycle ---
  /** True once we intend/cause this PTY's death (detach, replace, quit). */
  expectedExit: boolean;
  /** True once listeners/timers were torn down (idempotent cleanup). */
  cleaned: boolean;
  removeIpcListeners: () => void;
  removeSenderListener: () => void;
}

export class AttachHost {
  private readonly clients = new Map<string, AttachClient>();
  private readonly opts: AttachHostOptions;

  constructor(options: AttachHostOptions = {}) {
    this.opts = options;
  }

  /** True when a live attach client exists for the session. */
  isAttached(sessionId: string): boolean {
    return this.clients.has(sessionId);
  }

  /**
   * Attach a renderer to a tmux session. Idempotent: an existing client for
   * the same sessionId is killed first (fresh attach → full tmux redraw).
   * Throws TMUX_NOT_FOUND / SPAWN_FAILED (GmuxErrorPayload JSON message).
   */
  attach(req: AttachRequest): void {
    // Replace any existing client (renderer reloaded, or re-attach).
    this.detach(req.sessionId);

    const tmuxBin = this.opts.tmuxBin ?? findTmux();
    if (!tmuxBin) {
      throw gmuxError(
        'TMUX_NOT_FOUND',
        'tmux is not installed (looked in /opt/homebrew/bin, /usr/local/bin, /usr/bin)',
        'brew install tmux'
      );
    }
    const confPath = this.opts.confPath ?? defaultConfPath();
    const socketName = this.opts.socketName ?? 'gmux';

    let pty: IPty;
    try {
      pty = nodePty.spawn(
        tmuxBin,
        [
          '-L',
          socketName,
          '-f',
          confPath,
          'attach-session',
          '-t',
          `=${req.tmuxName}` // exact match — never prefix-match another session
        ],
        {
          name: 'xterm-256color',
          cols: sanitizeCols(req.cols),
          rows: sanitizeRows(req.rows),
          cwd: req.cwd ?? homedir(),
          env: {
            ...(process.env as Record<string, string>),
            // xterm.js renders truecolor; advertise it to the tmux client.
            COLORTERM: 'truecolor'
          }
        }
      );
    } catch (err) {
      throw gmuxError(
        'SPAWN_FAILED',
        `could not start the terminal connection for "${req.tmuxName}"`,
        (err as Error).message
      );
    }

    const client: AttachClient = {
      sessionId: req.sessionId,
      pty,
      sender: req.sender,
      dataChannel: termDataChannel(req.sessionId),
      pending: [],
      pendingBytes: 0,
      flushTimer: null,
      unackedBytes: 0,
      paused: false,
      ackEverReceived: false,
      flowControlDisabled: false,
      ackGraceTimer: null,
      expectedExit: false,
      cleaned: false,
      removeIpcListeners: () => undefined,
      removeSenderListener: () => undefined
    };

    // ---- renderer → pty: keystrokes/paste --------------------------------
    const inputChannel = termInputChannel(req.sessionId);
    const onInput = (event: IpcMainEvent, data: unknown): void => {
      if (event.sender !== client.sender || client.cleaned) return;
      if (typeof data === 'string' && data.length > 0) {
        client.pty.write(data);
      }
    };
    ipcMain.on(inputChannel, onInput);

    // ---- renderer → host: flow-control acks ------------------------------
    const ackChannel = termAckChannel(req.sessionId);
    const onAck = (event: IpcMainEvent, bytes: unknown): void => {
      if (event.sender !== client.sender || client.cleaned) return;
      if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) {
        return;
      }
      client.ackEverReceived = true;
      if (client.ackGraceTimer) {
        clearTimeout(client.ackGraceTimer);
        client.ackGraceTimer = null;
      }
      client.unackedBytes = Math.max(0, client.unackedBytes - bytes);
      if (client.paused && client.unackedBytes < LOW_WATERMARK_BYTES) {
        client.paused = false;
        client.pty.resume();
      }
    };
    ipcMain.on(ackChannel, onAck);

    client.removeIpcListeners = () => {
      ipcMain.removeListener(inputChannel, onInput);
      ipcMain.removeListener(ackChannel, onAck);
    };

    // ---- renderer window closed → drop the attach client -----------------
    const onDestroyed = (): void => this.detach(req.sessionId);
    req.sender.once('destroyed', onDestroyed);
    client.removeSenderListener = () => {
      if (!req.sender.isDestroyed()) {
        req.sender.removeListener('destroyed', onDestroyed);
      }
    };

    // ---- pty → renderer: batched output stream ---------------------------
    pty.onData((data: string) => {
      if (client.cleaned) return;
      // node-pty decodes with a UTF-8 StringDecoder (multibyte-safe across
      // chunk boundaries); re-encoding restores the raw byte stream.
      const buf = Buffer.from(data, 'utf8');
      client.pending.push(buf);
      client.pendingBytes += buf.byteLength;
      if (client.pendingBytes >= FLUSH_NOW_BYTES) {
        this.flush(client);
      } else if (client.flushTimer === null) {
        client.flushTimer = setTimeout(
          () => this.flush(client),
          FLUSH_INTERVAL_MS
        );
      }
    });

    // ---- pty exit ---------------------------------------------------------
    pty.onExit(({ exitCode, signal }) => {
      const expected = client.expectedExit;
      const stillCurrent = this.clients.get(req.sessionId) === client;
      // Deliver whatever tmux printed on the way out (e.g. "no such session")
      // before announcing the exit.
      if (stillCurrent && !client.cleaned) this.flush(client);
      this.cleanupClient(client);
      if (stillCurrent) this.clients.delete(req.sessionId);
      if (!expected && !client.sender.isDestroyed()) {
        const payload: TermExitPayload = {
          sessionId: req.sessionId,
          exitCode,
          signal
        };
        client.sender.send(termExitChannel(req.sessionId), payload);
      }
      this.opts.onExit?.(req.sessionId, exitCode, expected);
    });

    this.clients.set(req.sessionId, client);
  }

  /**
   * Stop streaming: kill ONLY the attach-client PTY. The tmux-side session
   * (agent process, scrollback, name) lives on untouched. No-op when not
   * attached.
   */
  detach(sessionId: string): void {
    const client = this.clients.get(sessionId);
    if (!client) return;
    this.clients.delete(sessionId);
    client.expectedExit = true;
    this.cleanupClient(client);
    try {
      client.pty.kill(); // SIGHUP → tmux client detaches; server unaffected
    } catch {
      // Already dead — exit handler has run or will run; nothing to do.
    }
  }

  /** Resize the attach client; tmux follows the client size. */
  resize(sessionId: string, cols: number, rows: number): void {
    const client = this.clients.get(sessionId);
    if (!client) return; // hidden/unattached panes may still fire resizes
    try {
      client.pty.resize(sanitizeCols(cols), sanitizeRows(rows));
    } catch {
      // Racing a dying pty is fine; exit handling owns cleanup.
    }
  }

  /** Kill all attach clients (app quit). tmux sessions all survive. */
  disposeAll(): void {
    for (const sessionId of [...this.clients.keys()]) {
      this.detach(sessionId);
    }
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private flush(client: AttachClient): void {
    if (client.flushTimer !== null) {
      clearTimeout(client.flushTimer);
      client.flushTimer = null;
    }
    if (client.pendingBytes === 0) return;
    if (client.sender.isDestroyed()) {
      this.detach(client.sessionId);
      return;
    }

    const chunk =
      client.pending.length === 1
        ? client.pending[0]!
        : Buffer.concat(client.pending, client.pendingBytes);
    client.pending = [];
    client.pendingBytes = 0;

    // Buffers arrive in the renderer as Uint8Array (structured clone).
    client.sender.send(client.dataChannel, chunk);
    this.opts.onData?.(client.sessionId, chunk.byteLength);

    if (client.flowControlDisabled) return;
    client.unackedBytes += chunk.byteLength;
    if (!client.paused && client.unackedBytes > HIGH_WATERMARK_BYTES) {
      client.paused = true;
      client.pty.pause();
      if (!client.ackEverReceived && client.ackGraceTimer === null) {
        // Preload ack bridge may not be wired yet — never deadlock.
        client.ackGraceTimer = setTimeout(() => {
          client.ackGraceTimer = null;
          if (client.cleaned || client.ackEverReceived) return;
          console.warn(
            `[attach-host] no term:ack from renderer for session ` +
              `${client.sessionId} after ${ACK_GRACE_MS}ms — disabling ` +
              `flow control for this client (is the preload ack wired?)`
          );
          client.flowControlDisabled = true;
          client.unackedBytes = 0;
          if (client.paused) {
            client.paused = false;
            client.pty.resume();
          }
        }, ACK_GRACE_MS);
      }
    }
  }

  private cleanupClient(client: AttachClient): void {
    if (client.cleaned) return;
    client.cleaned = true;
    if (client.flushTimer !== null) {
      clearTimeout(client.flushTimer);
      client.flushTimer = null;
    }
    if (client.ackGraceTimer !== null) {
      clearTimeout(client.ackGraceTimer);
      client.ackGraceTimer = null;
    }
    client.pending = [];
    client.pendingBytes = 0;
    client.removeIpcListeners();
    client.removeSenderListener();
  }
}

function sanitizeCols(cols: number | undefined): number {
  return clampInt(cols, 2, 1000, DEFAULT_COLS);
}

function sanitizeRows(rows: number | undefined): number {
  return clampInt(rows, 1, 500, DEFAULT_ROWS);
}

function clampInt(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}
