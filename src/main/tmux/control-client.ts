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
 * backoff loop (500 ms → 10 s) re-runs the transport's precheck + respawn, so a
 * killed server (T2) heals automatically while the app layer gets a
 * 'server-exit' event to offer manifest-based restore.
 *
 * ## Phase 71: the transport is injected, and that is the whole change
 *
 * This class used to name two local things inside `start()`, being
 * `ensureServer()` and `tmuxArgs()`. Both moved behind {@link ControlTransport},
 * so the same line protocol now runs over a local pipe and over a connection to
 * another machine. Nothing else in this class moved: the outbox, the greeting
 * block, the pending queue, the `%begin`/`%end` handling and the 500 ms to 10 s
 * backoff are what they were at `ce51b0d`, and the local transport composes the
 * same argv the local client composed there.
 *
 * THE ONE RULE THAT MADE THE SEAM NECESSARY. Research 51 section 3 says a remote
 * reconnect must never call a local `ensureServer()`. Without the seam, a
 * connection to another machine that dropped would have started a tmux server on
 * THIS Mac on every retry, forever.
 *
 * ## What the far side actually sends, MEASURED 2026-08-17
 *
 * `build/probe-control-dialect.mjs` opened this exact command over a real
 * connection and compared the bytes against a local child of the same tmux, for
 * 3.6a and for 3.7b. Both matched on all eight comparable steps. Two of the
 * findings change what this file may assume, and both are recorded here because
 * the comment above them used to say something narrower:
 *
 *  - The greeting is FIVE lines, not the guard pair alone. It is
 *    `%begin`, `%end`, `%window-add @0`, `%sessions-changed` and
 *    `%session-changed $0 gmux-control`. The three notifications arrive AFTER
 *    the block closes, so `closeBlock` still sees the guard pair first and
 *    `connected` still fires at the right moment.
 *  - `-u` changes not one byte of the control stream, so it is NOT on the
 *    control carriage. That is the opposite of the attach carriage, where `-u`
 *    is load bearing (Bug C, Phase 9.2), and the difference is measured rather
 *    than assumed. The full table is docs/research/52-control-mode-dialect.md.
 *
 * ## Phase 83: the greeting has a deadline, and it lives here
 *
 * A server that prints `%exit` and then holds the pipe open leaves this child
 * alive with nothing arriving on it. Before Phase 83 nothing waited for the
 * greeting and nothing gave up on it, so that child stayed for the life of the
 * process and the person was told nothing.
 *
 * The deadline is inside this class rather than in its caller, and the reason
 * is {@link TmuxControlClient.scheduleReconnect}. Every retry spawns a child, so
 * a deadline outside the client would cover the first spawn and none of the
 * others. One timer here covers every spawn there will ever be, local and
 * remote.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import {
  LineBuffer,
  parseControlLine,
  type ControlEvent
} from './control-parser';
import { gmuxError } from '../errors';
import type { SpawnPlan } from '../machines/context';
import { ensureServer, tmuxArgs } from './supervisor';

/** Name of the pinned control session (never shown in the UI). */
export const CONTROL_SESSION_NAME = 'gmux-control';

/**
 * How long a control client gets to finish its greeting after its child is
 * spawned, before Tortie calls it a hang and takes the child away.
 *
 * 10,000 ms. For a remote client the precheck completed over this same link a
 * moment earlier, inside its own 5,000 ms cap, so the greeting gets twice what
 * a one line read already took. MEASURED on this Mac on 2026-08-18 and printed
 * by `node build/probe-control-deadline.mjs`, over four runs: the local
 * greeting completes in 22 ms to 26 ms and the loopback remote greeting in
 * 9 ms to 10 ms, so the budget is about 385 times the slowest of them.
 *
 * The remote number is a floor rather than a typical figure. The far side there
 * is this same Mac, and the connection the precheck opened is still open, so
 * that greeting crossed no network at all. A machine on the other side of a
 * house is slower than this and a machine on the other side of a country is
 * slower again, which is why the budget is set against the local number.
 */
export const CONTROL_GREETING_DEADLINE_MS = 10_000;

/**
 * The tmux arguments that open the event bus, on either kind of machine.
 *
 * One list, so the local child and the remote child cannot drift. It is a
 * `readonly` tuple because a caller that mutated it would move the local bytes,
 * and `build/conformance-machines.mjs` compares those bytes against `ab94847`.
 */
export const CONTROL_ATTACH_ARGS: readonly string[] = [
  '-C',
  'new-session',
  '-A',
  '-s',
  CONTROL_SESSION_NAME
];

/**
 * What the client needs to open one connection. Nothing else.
 *
 * It is deliberately narrow. A transport cannot read the client's state, cannot
 * see its events and cannot cancel a reconnect. It answers three questions and
 * the client decides what to do with the answers.
 */
export interface ControlTransport {
  /** Names the machine in every log line. 'local' for this Mac. */
  readonly machineId: string;
  /**
   * Run before every spawn, including every reconnect.
   *
   * Local: `ensureServer()`. Remote: ONE cheap command over the exec plane, and
   * never `ensureServer()`, because a local `ensureServer` on a remote reconnect
   * would start a server on THIS Mac's socket. Research 51 section 3.
   *
   * A rejection stops the spawn and schedules another attempt, so a machine that
   * is asleep costs one refused command per backoff step and nothing else.
   */
  precheck(): Promise<void>;
  /** The program and its arguments. Composed fresh on every reconnect. */
  plan(): Promise<SpawnPlan>;
  /** The environment the child gets. */
  env(): NodeJS.ProcessEnv;
}

/**
 * The transport for the server on this Mac.
 *
 * `precheck` is `ensureServer()` and `plan` is what `start()` composed at
 * `ce51b0d`, so the local child's program and argv do not move by one byte. The
 * context is kept between the two calls rather than resolved twice, which is
 * also what the old code did: it called `ensureServer()` once per spawn.
 */
export function localControlTransport(): ControlTransport {
  let ctx: Awaited<ReturnType<typeof ensureServer>> | null = null;
  return {
    machineId: 'local',
    async precheck(): Promise<void> {
      ctx = await ensureServer();
    },
    async plan(): Promise<SpawnPlan> {
      const resolved = ctx ?? (await ensureServer());
      return {
        file: resolved.bin,
        argv: tmuxArgs(resolved, CONTROL_ATTACH_ARGS)
      };
    },
    env(): NodeJS.ProcessEnv {
      return process.env;
    }
  };
}

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
  /**
   * The child was spawned and the greeting did not arrive inside the deadline.
   *
   * PHASE 83. It fires BEFORE `disconnected`, and the child is already dead by
   * the time it fires. A listener is optional: an EventEmitter only throws for
   * an unlistened `'error'`, so the local client, which has no listener for
   * this, is unchanged.
   */
  'greeting-timeout': [];
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
  /**
   * Armed on every spawn, cleared the moment the greeting block closes.
   *
   * PHASE 83. It is one field rather than one per spawn because there is at
   * most one child at a time, and `handleDisconnect` clears it before any
   * reconnect arms a new one.
   */
  private greetingTimer: NodeJS.Timeout | null = null;

  /**
   * @param transport How this client reaches its server. Defaults to the server
   *   on this Mac, so every caller written before Phase 71 keeps the bytes it
   *   had.
   */
  constructor(
    private readonly transport: ControlTransport = localControlTransport()
  ) {
    super();
    // 'error' on an EventEmitter throws when nobody listens; the event bus
    // must never take the app down over a stderr line. Default no-op —
    // real subscribers still receive every event.
    this.on('error', () => undefined);
  }

  /** Which machine this client's server is on. 'local' for this Mac. */
  get machineId(): string {
    return this.transport.machineId;
  }

  /** True when attached and past the greeting block. */
  get connected(): boolean {
    return this.child !== null && this.greetingConsumed;
  }

  /**
   * Start (or restart) the control client. The transport's precheck runs
   * first. Resolves once the child is spawned; 'connected' fires when the
   * protocol is ready.
   */
  async start(): Promise<void> {
    if (this.starting || this.child !== null) return;
    this.starting = true;
    this.stopped = false;
    try {
      await this.transport.precheck();
      const plan = await this.transport.plan();
      const child = spawn(plan.file, [...plan.argv], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: this.transport.env()
      });
      this.child = child;
      this.greetingConsumed = false;
      this.blockLines = null;
      this.lineBuffer.reset();
      // PHASE 83. Armed immediately after spawn and before any listener, so a
      // child that answers nothing at all is still covered.
      this.armGreetingTimer(child);

      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        for (const line of this.lineBuffer.push(chunk)) this.handleLine(line);
      });
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk: string) => {
        const text = chunk.trim();
        if (text.length > 0) {
          this.emit('error', new Error(`control client for ${this.transport.machineId}: ${text}`));
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
    this.clearGreetingTimer();
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
    this.failPending(new Error(`the control client for ${this.transport.machineId} stopped`));
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
        gmuxError(
          'TMUX_UNREACHABLE',
          `the control client for ${this.transport.machineId} is not connected`
        )
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
      // PHASE 83. This is the ONE place the greeting completes, so it is the
      // one place the deadline is cleared on success.
      this.clearGreetingTimer();
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
    this.clearGreetingTimer();
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
      gmuxError(
        'TMUX_UNREACHABLE',
        `the control client for ${this.transport.machineId} disconnected`
      )
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

  /**
   * Start the greeting deadline for one spawned child.
   *
   * On fire the child is killed EXPLICITLY and first, because the whole failure
   * this exists for is a child that will not exit on its own. `stop()`'s kill is
   * deliberately not reused: `stop()` also sets `stopped`, which would suppress
   * the reconnect the local path relies on.
   */
  private armGreetingTimer(child: ChildProcessWithoutNullStreams): void {
    this.clearGreetingTimer();
    this.greetingTimer = setTimeout(() => {
      this.greetingTimer = null;
      if (this.child !== child) return;
      child.kill('SIGKILL');
      this.emit('greeting-timeout');
      this.handleDisconnect(
        `the greeting did not arrive within ${String(
          CONTROL_GREETING_DEADLINE_MS
        )} ms`
      );
    }, CONTROL_GREETING_DEADLINE_MS);
    // Never hold the process open just for this timer.
    this.greetingTimer.unref();
  }

  private clearGreetingTimer(): void {
    if (this.greetingTimer === null) return;
    clearTimeout(this.greetingTimer);
    this.greetingTimer = null;
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
 * Render one argv element for a control-mode command line.
 *
 * `sendCommand` speaks tmux's own line syntax, not argv — and MEASURED on
 * 3.6a, a `;`-joined sequence emits ONE %begin/%end block PER COMMAND, which
 * would desync the single-pending-per-command queue above. So callers send
 * one command at a time and quote their arguments through here: tmux's lexer
 * takes single-quoted strings literally, which is exactly right for format
 * strings full of `#{…}`.
 */
export function quoteTmuxArg(arg: string): string {
  if (/^[A-Za-z0-9_%$@=:.,/-]+$/.test(arg)) return arg;
  if (arg.includes("'")) {
    throw gmuxError(
      'INVALID_INPUT',
      'control-mode arguments cannot contain a single quote'
    );
  }
  return `'${arg}'`;
}

/**
 * True for the pinned control session — session listings must filter it out
 * so it never appears in the UI (sessions.ts uses this).
 */
export function isControlSession(tmuxName: string): boolean {
  return tmuxName === CONTROL_SESSION_NAME;
}
