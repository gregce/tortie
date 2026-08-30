/**
 * The live instrument (Phase 170 fix round): one `top` held open for exactly
 * as long as a live subscription stands, instead of a fresh `top` per tick.
 *
 * WHY. The one shot read in ./power.ts is right for a manual capture, and it
 * is the wrong shape for a two second tick. Measured on 2026-08-30 over 985
 * processes: `top -l 1` costs 2.2 s of system time and `top -l 2 -s 0`
 * costs 2.4 s, so the startup walk is nearly the whole bill and the second
 * sample is about 0.2 s. A fresh `top -l 2` every two seconds is therefore
 * close to one whole core for as long as the tab is visible, and the
 * verifier read exactly that off the face: the probe row at 97 to 100
 * percent and Tortie itself at 27 percent on a quiet scratch profile. Six
 * samples at one second cost 3.45 s all told, being the same 2.2 s walk
 * once and about 0.2 s a sample after it. So the stream pays the walk once
 * per subscription and about a tenth of a core after, and the numbers it
 * hands the report are the same columns parsed by the same function.
 *
 * WHAT IT IS NOT. It is not a background sampler. Nothing in this module
 * runs at import or at app start; `openTopStream` is called by the
 * `diagnostics:liveStart` handler alone, and `close` is called from live's
 * own stop, which the renderer drives on hide, pause and unmount and main
 * drives when the subscribing window is destroyed. Close sends SIGKILL to
 * the child's group synchronously, so the instant the tab is hidden the
 * child is gone rather than finishing a sample. Three belts hold it there:
 * the child is tracked with the guarded children so an app quit reaps it,
 * `-l` is finite so a child nobody closed still ends on its own, and top
 * writes to a pipe, so a child whose parent died takes SIGPIPE on its next
 * sample.
 *
 * HOW A SAMPLE IS READ. top flushes each sample into the pipe as one write
 * that begins with the `Processes:` header and ends with a newline
 * (measured the same day: three samples, three chunks, 24 KB each). A block
 * is complete when the next header arrives or when the pipe has been quiet
 * for {@link TOP_STREAM_QUIET_MS}. The first block of every child counts
 * since boot and is thrown away, the same rule ./power.ts keeps. A block is
 * handed out once: `take` answers a sample no earlier take has seen, or
 * waits for the next one up to a deadline, or answers null, never a throw.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { killProcessGroup, trackGuardedChild } from '../proc/guarded';
import { parseTopSample, TOP_BIN, type PowerSample } from './power';

/**
 * Samples per child before it ends on its own and the stream opens the
 * next: five minutes at the two second interval. The respawn pays the
 * startup walk once more, which is one 2 s walk per five minutes.
 */
export const TOP_STREAM_SAMPLES = 150;

/** Quiet on the pipe that marks the buffered block complete. */
export const TOP_STREAM_QUIET_MS = 250;

/** The argv for one child. Pure, so a test can pin it. */
export function topStreamArgs(
  intervalMs: number,
  samples: number = TOP_STREAM_SAMPLES
): string[] {
  const seconds = Math.max(1, Math.round(intervalMs / 1000));
  return [
    '-l',
    String(samples),
    '-s',
    String(seconds),
    '-stats',
    'pid,cpu,power,mem'
  ];
}

export interface TopStreamDeps {
  /** Start the child. Default: the real tool, detached, stdout piped. */
  spawn?(args: readonly string[]): ChildProcess;
  /** End the child now. Default: SIGKILL to its group, no grace. */
  kill?(child: ChildProcess): void;
  /** Register the child for the quit reap. Default: the guarded registry. */
  track?(child: ChildProcess): () => void;
  intervalMs: number;
  samples?: number;
  quietMs?: number;
}

export interface TopStream {
  /**
   * The next sample no earlier take has seen. Waits up to `maxWaitMs` for
   * one to arrive; null when the deadline passes, when the stream is closed
   * or when the child could not be started.
   */
  take(maxWaitMs: number): Promise<PowerSample | null>;
  /** End the child and answer every waiting take with null. Idempotent. */
  close(): void;
  /** True between open and close. */
  readonly open: boolean;
  /** The child's pid, so a report can name its own instrument. */
  readonly pid: number | null;
}

interface Waiter {
  resolve(sample: PowerSample | null): void;
  timer: ReturnType<typeof setTimeout>;
}

export function openTopStream(deps: TopStreamDeps): TopStream {
  const samples = deps.samples ?? TOP_STREAM_SAMPLES;
  const quietMs = deps.quietMs ?? TOP_STREAM_QUIET_MS;
  const doSpawn =
    deps.spawn ??
    ((args: readonly string[]): ChildProcess =>
      spawn(TOP_BIN, [...args], {
        detached: true,
        stdio: ['ignore', 'pipe', 'ignore']
      }));
  const doKill = deps.kill ?? ((child: ChildProcess) => killProcessGroup(child, 0));
  const doTrack = deps.track ?? trackGuardedChild;

  let isOpen = true;
  let child: ChildProcess | null = null;
  let untrack: (() => void) | null = null;
  let buffer = '';
  let quiet: ReturnType<typeof setTimeout> | null = null;
  /** The child's first block counts since boot; it is dropped. */
  let primed = false;
  /** Whether the current child delivered one valid sample, which earns a respawn. */
  let delivered = false;
  let pending: PowerSample | null = null;
  const waiters: Waiter[] = [];

  const clearQuiet = (): void => {
    if (quiet !== null) {
      clearTimeout(quiet);
      quiet = null;
    }
  };

  const hand = (sample: PowerSample): void => {
    const waiter = waiters.shift();
    if (waiter === undefined) {
      pending = sample;
      return;
    }
    clearTimeout(waiter.timer);
    waiter.resolve(sample);
  };

  const emit = (block: string): void => {
    const sample = parseTopSample(block);
    if (sample === null) return;
    if (!primed) {
      primed = true;
      return;
    }
    delivered = true;
    hand(sample);
  };

  const onQuiet = (): void => {
    quiet = null;
    if (buffer === '') return;
    const block = buffer;
    buffer = '';
    emit(block);
  };

  const onData = (chunk: string): void => {
    buffer += chunk;
    // A new header behind buffered text closes the block before it.
    for (;;) {
      const at = buffer.indexOf('\nProcesses:');
      if (at === -1) break;
      const block = buffer.slice(0, at + 1);
      buffer = buffer.slice(at + 1);
      emit(block);
    }
    clearQuiet();
    quiet = setTimeout(onQuiet, quietMs);
    quiet.unref?.();
  };

  const start = (): void => {
    if (!isOpen) return;
    buffer = '';
    primed = false;
    delivered = false;
    let next: ChildProcess;
    try {
      next = doSpawn(topStreamArgs(deps.intervalMs, samples));
    } catch {
      child = null;
      return;
    }
    child = next;
    untrack = doTrack(next);
    next.stdout?.setEncoding('utf8');
    next.stdout?.on('data', onData);
    next.stdout?.on('error', () => undefined);
    next.once('error', () => {
      if (child !== next) return;
      untrack?.();
      untrack = null;
      child = null;
    });
    next.once('exit', () => {
      if (child !== next) return;
      untrack = null;
      child = null;
      clearQuiet();
      // A child that ran its full count is replaced; one that died without
      // ever answering is not, so a broken tool cannot become a spawn loop.
      if (isOpen && delivered) start();
    });
  };

  start();

  return {
    get open(): boolean {
      return isOpen;
    },
    get pid(): number | null {
      return child?.pid ?? null;
    },
    take(maxWaitMs: number): Promise<PowerSample | null> {
      if (!isOpen || child === null) return Promise.resolve(null);
      if (pending !== null) {
        const sample = pending;
        pending = null;
        return Promise.resolve(sample);
      }
      return new Promise<PowerSample | null>((resolve) => {
        const waiter: Waiter = {
          resolve,
          timer: setTimeout(() => {
            const at = waiters.indexOf(waiter);
            if (at !== -1) waiters.splice(at, 1);
            resolve(null);
          }, maxWaitMs)
        };
        waiter.timer.unref?.();
        waiters.push(waiter);
      });
    },
    close(): void {
      if (!isOpen) return;
      isOpen = false;
      clearQuiet();
      buffer = '';
      pending = null;
      const current = child;
      child = null;
      if (current !== null) {
        doKill(current);
        untrack?.();
        untrack = null;
      }
      for (const waiter of waiters.splice(0)) {
        clearTimeout(waiter.timer);
        waiter.resolve(null);
      }
    }
  };
}
