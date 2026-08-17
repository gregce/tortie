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
 * WHICH TMUX RUNS (Phase 41). A packaged Tortie attaches with the pinned tmux
 * inside its own bundle; a development build attaches with the machine's own,
 * which is 3.6a here. Binary and conf resolution lives in
 * src/main/tmux/resolve.ts (growth guardrail 3), and AttachHostOptions.tmuxBin
 * normally overrides both.
 *
 * TWO KINDS OF CLIENT (Phase 70, M3). An AttachRequest that carries a machine
 * runs one ssh client on this Mac carrying one tmux client on that machine. The
 * argv for both kinds is composed in ./attach-plan.ts, which is pure and holds
 * no terminal binding, so this file is the only one under src/main/attach that
 * loads node-pty.
 *
 * WHAT AN UNEXPECTED EXIT MEANS IS DIFFERENT FOR THE TWO KINDS, and the onExit
 * hook now says which one it was. A local client dies when the session was
 * killed elsewhere or the server died. A remote client also dies when the LINK
 * went, and the tmux session on the other machine is untouched by that: its
 * agent is still running and its output is still being absorbed server-side,
 * which is this host's designed failure mode and is now true across a link as
 * well as across a quit. So an unexpected exit with kind 'remote' means the link
 * went rather than the session ended, and the session owner maps it to unknown
 * rather than to exited.
 */

import { ipcMain } from 'electron';
import type { IpcMainEvent, WebContents } from 'electron';
import { homedir } from 'node:os';
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
import { withUtf8Locale } from '../tmux/env';
import {
  resolveConfPath,
  resolveTmux,
  tmuxUnavailableError
} from '../tmux/resolve';
import { TMUX_SOCKET } from '../tmux/supervisor';
import type {
  MachineKind,
  RemoteMachineContext,
  SpawnPlan
} from '../machines/context';
import { attachPlan } from './attach-plan';
import { getLog } from '../log';

/**
 * Scope "attach" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const attachLog = getLog('attach');


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
   *
   * `kind` (Phase 70) says which sort of client died. An unexpected exit with
   * kind 'remote' is a link that went, not a session that ended: the session is
   * still running on the other machine. The session owner maps that to unknown
   * and never to exited.
   */
  onExit?: (
    sessionId: string,
    exitCode: number,
    expected: boolean,
    kind: MachineKind
  ) => void;
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
  /**
   * The machine this session runs on, when it is not this Mac (Phase 70).
   *
   * Absent means local, which is every caller before this release. The context
   * has already been through the confirm gate, because `buildRemoteMachineContext`
   * asks the gate before it composes anything, so there is no unconfirmed machine
   * an attach could be handed.
   */
  machine?: RemoteMachineContext;
}

interface AttachClient {
  sessionId: string;
  /** Which sort of client this is, for the exit hook. */
  kind: MachineKind;
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

  /**
   * Attach a renderer to a tmux session. Idempotent: an existing client for
   * the same sessionId is killed first (fresh attach → full tmux redraw).
   * Throws TMUX_NOT_FOUND / SPAWN_FAILED (GmuxErrorPayload JSON message).
   */
  attach(req: AttachRequest): void {
    // Replace any existing client (renderer reloaded, or re-attach).
    this.detach(req.sessionId);

    const kind: MachineKind = req.machine === undefined ? 'local' : 'remote';
    const plan = this.planFor(req);

    let pty: IPty;
    try {
      pty = nodePty.spawn(plan.file, [...plan.argv], {
        name: 'xterm-256color',
        cols: sanitizeCols(req.cols),
        rows: sanitizeRows(req.rows),
        // A remote client runs on THIS Mac and the session's directory is on
        // the other machine, so a remote attach starts in this Mac's home
        // directory. Handing node-pty a path that does not exist here fails
        // the spawn, and the far side chooses its own directory anyway.
        cwd: kind === 'remote' ? homedir() : (req.cwd ?? homedir()),
        env: {
          // Bug C: guarantee the client env advertises UTF-8 too (status
          // line, locale-sensitive client paths) — never overrides a
          // locale the user actually has.
          ...withUtf8Locale(process.env),
          // xterm.js renders truecolor; advertise it to the tmux client.
          COLORTERM: 'truecolor'
        }
      });
    } catch (err) {
      throw gmuxError(
        'SPAWN_FAILED',
        `could not start the terminal connection for "${req.tmuxName}"`,
        (err as Error).message
      );
    }

    const client: AttachClient = {
      sessionId: req.sessionId,
      kind,
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
      this.opts.onExit?.(req.sessionId, exitCode, expected, client.kind);
    });

    this.clients.set(req.sessionId, client);
  }

  /**
   * The program and the argv for one attach. The composition itself is in
   * ./attach-plan.ts, which is pure; what this method adds is the local
   * resolution, and it runs only for a local attach.
   *
   * A remote attach resolves nothing on this Mac. It needs no tmux binary here
   * and no configuration file here, and asking for either would refuse an attach
   * to another machine on a Mac whose own tmux is missing.
   */
  private planFor(req: AttachRequest): SpawnPlan {
    if (req.machine !== undefined) {
      return attachPlan({
        kind: 'remote',
        ctx: req.machine,
        tmuxName: req.tmuxName
      });
    }
    // Phase 41: one composer for both "there is no tmux" sentences, in
    // ../tmux/resolve. This host and the supervisor each wrote their own
    // before that, and the two had already drifted apart. A packaged Tortie
    // that cannot find its own bundled copy has a broken install, and telling
    // that user to run brew was never right.
    //
    // Resolution only runs when the caller named no binary, which is the
    // normal case in tests and harnesses. The supervisor passes the path it
    // already resolved, so an attach costs no extra filesystem probing.
    let tmuxBin = this.opts.tmuxBin ?? null;
    if (tmuxBin === null) {
      const resolution = resolveTmux();
      if (resolution.path === null) throw tmuxUnavailableError(resolution);
      tmuxBin = resolution.path;
    }
    return attachPlan({
      kind: 'local',
      bin: tmuxBin,
      // The socket name is the supervisor's constant, never a second literal:
      // an attach client on a different socket would attach to a DIFFERENT
      // tmux server — the user's own, in the worst case (research 25 §3,
      // Tier 3).
      socket: this.opts.socketName ?? TMUX_SOCKET,
      confPath: this.opts.confPath ?? resolveConfPath(),
      tmuxName: req.tmuxName
    });
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
          attachLog.warn(
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
