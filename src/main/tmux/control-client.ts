/**
 * Long-lived tmux control-mode client — gmux's event bus.
 *
 * One `tmux -C` client stays attached to a dedicated `gmux-control` session
 * and streams `%`-notifications (session created/killed/renamed, server
 * exit). Rendering does NOT flow through here: per-pane plain `tmux attach`
 * clients handle output (research 01 §3.2 "pragmatic hybrid"), so this
 * client immediately sets `refresh-client -f no-output` to suppress the
 * `%output` firehose.
 *
 * Spawn command (verified against tmux 3.6a): the client must ATTACH to stay
 * alive, so we run `-C new-session -A -s gmux-control` WITHOUT `-d` —
 * with `-d` tmux creates the session detached, prints one guard block, and
 * exits immediately (observed empirically; see module report).
 *
 * Reconnect: on child exit or `%exit`, pending commands are rejected and a
 * backoff loop (500 ms → 10 s) re-runs ensureServer() + respawn, so a killed
 * server (T2) heals automatically while the app layer gets a 'server-exit'
 * event to offer manifest-based restore.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import {
  LineBuffer,
  parseControlLine,
  type ControlEvent
} from './control-parser';
import { gmuxError } from './errors';
import { ensureServer, tmuxArgs } from './supervisor';

/** Name of the pinned control session (never shown in the UI). */
export const CONTROL_SESSION_NAME = 'gmux-control';

// ---------------------------------------------------------------------------
// Typed events
// ---------------------------------------------------------------------------

export interface ControlClientEvents {
  /** A session was created or destroyed — re-list and reconcile. */
  'sessions-changed': [];
  /** A session was renamed (tmux-side name). Sync manifest + UI. */
  'session-renamed': [sessionId: string, tmuxName: string];
  /** A session's current window changed. */
  'session-window-changed': [sessionId: string, windowId: string];
  /** Control client saw %exit / died — server may be gone (T2 path). */
  'server-exit': [reason: string | undefined];
  /** Connected and ready (greeting block consumed, no-output flag set). */
  connected: [];
  /** Lost the connection; true when a reconnect attempt is scheduled. */
  disconnected: [willReconnect: boolean];
  /** Every parsed notification, for future consumers (status detector…). */
  notification: [event: ControlEvent];
  /** Non-fatal internal errors (reconnect keeps running). */
  error: [error: Error];
}

interface PendingCommand {
  resolve: (lines: string[]) => void;
  reject: (err: Error) => void;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const RECONNECT_MIN_MS = 500;
const RECONNECT_MAX_MS = 10_000;

export class TmuxControlClient extends EventEmitter<ControlClientEvents> {
  private child: ChildProcessWithoutNullStreams | null = null;
  private readonly lineBuffer = new LineBuffer();
  private readonly pending: PendingCommand[] = [];
  /** Commands queued until the greeting block is consumed. */
  private readonly outbox: string[] = [];
  private greetingConsumed = false;
  /** Lines collected for the currently open %begin block (null = no block). */
  private blockLines: string[] | null = null;
  private stopped = false;
  private reconnectDelayMs = RECONNECT_MIN_MS;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private starting = false;

  constructor() {
    super();
    // 'error' on an EventEmitter throws when nobody listens; the event bus
    // must never take the app down over a stderr line. Default no-op —
    // real subscribers still receive every event.
    this.on('error', () => undefined);
  }

  /** True when attached and past the greeting block. */
  get connected(): boolean {
    return this.child !== null && this.greetingConsumed;
  }

  /**
   * Start (or restart) the control client. Ensures the private server is up
   * first. Resolves once the child is spawned; 'connected' fires when the
   * protocol is ready.
   */
  async start(): Promise<void> {
    if (this.starting || this.child !== null) return;
    this.starting = true;
    this.stopped = false;
    try {
      const ctx = await ensureServer();
      const argv = tmuxArgs(ctx, [
        '-C',
        'new-session',
        '-A',
        '-s',
        CONTROL_SESSION_NAME
      ]);
      const child = spawn(ctx.bin, argv, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env
      });
      this.child = child;
      this.greetingConsumed = false;
      this.blockLines = null;
      this.lineBuffer.reset();

      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        for (const line of this.lineBuffer.push(chunk)) this.handleLine(line);
      });
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk: string) => {
        const text = chunk.trim();
        if (text.length > 0) {
          this.emit('error', new Error(`tmux control client stderr: ${text}`));
        }
      });
      child.on('error', (err) => {
        this.emit('error', err);
        this.handleDisconnect(undefined);
      });
      child.on('exit', () => {
        this.handleDisconnect(undefined);
      });
      // A write into a dying tmux must not crash the process: EPIPE surfaces
      // here, and the child 'exit' handler drives the reconnect.
      child.stdin.on('error', (err) => {
        this.emit('error', err);
      });

      // First command after the greeting: suppress %output — rendering goes
      // through per-pane attach clients, not the event bus.
      this.enqueue('refresh-client -f no-output');
    } catch (err) {
      this.starting = false;
      this.scheduleReconnect();
      throw err;
    }
    this.starting = false;
  }

  /** Stop for good (app quit). No reconnect after this. */
  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const child = this.child;
    this.child = null;
    if (child !== null) {
      child.removeAllListeners();
      child.stdout.removeAllListeners();
      child.stderr.removeAllListeners();
      child.kill();
    }
    this.failPending(new Error('control client stopped'));
  }

  /**
   * Send one tmux command over the control channel; resolves with the lines
   * of its %begin/%end block (rejects on %error). Prefer execTmux() for
   * one-shots — this exists for commands that must run on THIS client, e.g.
   * `refresh-client` flags and format subscriptions.
   */
  sendCommand(command: string): Promise<string[]> {
    if (command.includes('\n')) {
      return Promise.reject(
        gmuxError('INVALID_INPUT', 'control command must be a single line')
      );
    }
    if (this.child === null) {
      return Promise.reject(
        gmuxError('TMUX_UNREACHABLE', 'control client is not connected')
      );
    }
    return new Promise<string[]>((resolve, reject) => {
      this.pending.push({ resolve, reject });
      this.enqueue(command);
    });
  }

  // -- internals ------------------------------------------------------------

  private enqueue(command: string): void {
    if (this.greetingConsumed && this.child !== null) {
      this.child.stdin.write(command + '\n');
    } else {
      this.outbox.push(command);
    }
  }

  private flushOutbox(): void {
    if (this.child === null) return;
    while (this.outbox.length > 0) {
      const cmd = this.outbox.shift();
      if (cmd !== undefined) this.child.stdin.write(cmd + '\n');
    }
  }

  private handleLine(line: string): void {
    const event = parseControlLine(line);

    // Inside a %begin block, everything except the closing guard is body.
    if (this.blockLines !== null) {
      if (event.kind === 'end' || event.kind === 'command-error') {
        const lines = this.blockLines;
        this.blockLines = null;
        this.closeBlock(event.kind === 'end', lines);
        return;
      }
      this.blockLines.push(line);
      return;
    }

    switch (event.kind) {
      case 'begin':
        this.blockLines = [];
        return;
      case 'end':
      case 'command-error':
        // Guard without a %begin — protocol skew; surface and carry on.
        this.emit('error', new Error(`unmatched ${line}`));
        return;
      case 'sessions-changed':
        this.emit('notification', event);
        this.emit('sessions-changed');
        return;
      case 'session-renamed':
        this.emit('notification', event);
        this.emit('session-renamed', event.sessionId, event.name);
        return;
      case 'session-window-changed':
        this.emit('notification', event);
        this.emit('session-window-changed', event.sessionId, event.windowId);
        return;
      case 'exit':
        this.emit('notification', event);
        this.handleDisconnect(event.reason);
        return;
      case 'session-changed':
      case 'output':
      case 'other-notification':
        this.emit('notification', event);
        return;
      case 'body':
        // Body text outside a block: ignore (blank keepalives, noise).
        return;
    }
  }

  private closeBlock(ok: boolean, lines: string[]): void {
    if (!this.greetingConsumed) {
      // The attach itself emits one guard block before any of our commands.
      this.greetingConsumed = true;
      this.reconnectDelayMs = RECONNECT_MIN_MS;
      this.flushOutbox();
      this.emit('connected');
      return;
    }
    const pending = this.pending.shift();
    if (pending === undefined) return; // block we never asked for — ignore
    if (ok) pending.resolve(lines);
    else pending.reject(new Error(lines.join('\n') || 'tmux command failed'));
  }

  private handleDisconnect(reason: string | undefined): void {
    const hadChild = this.child !== null;
    if (this.child !== null) {
      const child = this.child;
      this.child = null;
      child.removeAllListeners();
      child.stdout.removeAllListeners();
      child.stderr.removeAllListeners();
      child.kill();
    }
    if (!hadChild) return; // already handled (exit after %exit, etc.)
    this.greetingConsumed = false;
    this.blockLines = null;
    this.lineBuffer.reset();
    this.failPending(
      gmuxError('TMUX_UNREACHABLE', 'control client disconnected')
    );
    this.emit('server-exit', reason);
    const willReconnect = !this.stopped;
    this.emit('disconnected', willReconnect);
    if (willReconnect) this.scheduleReconnect();
  }

  private failPending(err: Error): void {
    while (this.pending.length > 0) {
      const p = this.pending.shift();
      if (p !== undefined) p.reject(err);
    }
    this.outbox.length = 0;
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer !== null) return;
    const delay = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, RECONNECT_MAX_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      // start() failures reschedule themselves; swallow here.
      this.start().catch(() => undefined);
    }, delay);
    // Never hold the process open just for a reconnect timer.
    this.reconnectTimer.unref();
  }
}

/**
 * True for the pinned control session — session listings must filter it out
 * so it never appears in the UI (sessions.ts uses this).
 */
export function isControlSession(tmuxName: string): boolean {
  return tmuxName === CONTROL_SESSION_NAME;
}
