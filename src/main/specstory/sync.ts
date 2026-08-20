/**
 * `specstory sync` at session end — the flush backstop, not a nicety
 * (Phase 15, research 13 §1.2 / §3.3).
 *
 * WHY A CAPTURED SESSION STILL NEEDS THIS. `specstory run` debounces its
 * writes and flushes on the way out, but two of gmux's three ways a session
 * ends skip that flush:
 *
 *  - a non-zero agent exit takes the `os.Exit(code)` mirror path, which
 *    bypasses main's deferred cloud flush (main.go:1617-1626);
 *  - tmux `kill-pane` delivers SIGHUP, which `run` does not handle at all.
 *
 * Both leave the tail of the conversation in the agent's own store and out of
 * the markdown/cloud copy. A later `sync` in the same directory recovers it,
 * because the native store is intact and cwd is the addressing scheme.
 *
 * THREE RULES THIS MODULE KEEPS.
 *
 *  1. **cwd is the addressing scheme.** Output dir, project identity and
 *     provider store mapping are all derived from the working directory
 *     (main.go:392-401), so the sync runs in the SESSION's cwd or not at all.
 *     A sync from the wrong directory does not fail loudly — it files the
 *     conversation under the wrong project, which is worse.
 *  2. **Never silent on failure.** The user opted into capture; if the last
 *     slice of a conversation did not make it, they hear about it once, in a
 *     sentence that says what to do. Success stays silent.
 *  3. **Never blocks a quit.** Every call is time-boxed and reaped through
 *     runGuarded; the app-quit path passes a short deadline and accepts
 *     losing the tail over hanging the Dock icon.
 */

import { existsSync } from 'node:fs';
import { runGuarded } from '../proc/guarded';
import type { SpecstoryProviderId } from '../agents/registry';
// One reader for auth.json, in the domain that owns SpecStory's state (./auth.ts
// — it used to live under settings/, which made this import a cycle).
import { readAuthFacts } from './auth';
import { NO_VERSION_CHECK, cloudDisabledByEnv, specstoryEnv } from './resolve';

/** A normal end-of-session sync: local write plus, when authed, an upload. */
export const SYNC_TIMEOUT_MS = 60_000;
/** The quit path's budget — best-effort, because the Dock is watching. */
export const SYNC_QUIT_TIMEOUT_MS = 4_000;

/**
 * The local-only opt-out, re-exported so a reader of this file sees the flag
 * that shapes its argv. It is DEFINED in ./resolve.ts because the wrap obeys
 * it too, and one definition is the only way those two can never disagree.
 */
export { cloudDisabledByEnv };

export interface SyncRequest {
  /** Absolute path recorded in the manifest — the binary this session used. */
  bin: string;
  provider: SpecstoryProviderId;
  /** The session's own working directory. */
  cwd: string;
  /** The agent conversation id, when gmux captured one. */
  agentSessionId?: string | undefined;
  /**
   * This SESSION captures locally and never uploads — the recorded
   * `specstory.noCloud` from the manifest row, not today's environment.
   *
   * It has to travel with the request because the two ends of a session's
   * life happen in different app runs: a session created under
   * `GMUX_SPECSTORY_NO_CLOUD=1` can END in a run without it (a restore in the
   * user's normal gmux, the next dev launch), and re-reading only the ambient
   * env there would sync that scratch conversation to a signed-in user's
   * SpecStory Cloud — the one side effect this feature may not have. The
   * ambient opt-out is still honoured, on top of this one, never instead.
   */
  noCloud?: boolean;
  /** Deadline; defaults to {@link SYNC_TIMEOUT_MS}. */
  timeoutMs?: number;
}

export interface SyncOutcome {
  readonly ok: boolean;
  /** Exit status (0/1; sync has no other codes), null when it never ran. */
  readonly code: number | null;
  readonly timedOut: boolean;
  /** True when this sync could have reached the cloud (signed in, not opted out). */
  readonly cloud: boolean;
  /** One sentence for a toast, or null on success. */
  readonly message: string | null;
  /** The argv that ran, for the log and for tests. */
  readonly argv: readonly string[];
}

/**
 * Compose the sync argv. Pure, so the shape is unit-testable without a CLI.
 *
 * `-s <id>` is a precision upgrade, never a requirement: without it the sync
 * is cwd-wide, which is exactly what the agents whose id gmux never captured
 * (a harvest that timed out behind a trust prompt) need.
 */
export function syncArgv(
  req: SyncRequest,
  options: { noCloud?: boolean } = {}
): string[] {
  return [
    req.bin,
    'sync',
    req.provider,
    ...(req.agentSessionId !== undefined && req.agentSessionId.length > 0
      ? ['-s', req.agentSessionId]
      : []),
    '--silent',
    NO_VERSION_CHECK,
    ...(options.noCloud === true ? ['--no-cloud-sync'] : [])
  ];
}

/**
 * Run one session-end sync. Never throws; the caller decides what to do with
 * an unhappy outcome (toast now, or fold into a quit-time summary).
 *
 * THE `-s` FALLBACK, AND WHY IT IS NOT OPTIONAL (measured 2026-08-11 against
 * specstory 2.8.0 and re-measured 2026-08-20 against 2.10.0, scratch HOME).
 * `sync <provider> -s <id>` exits **1** with a session-not-found message on
 * stderr (the wording varies by CLI version, so only the exit code is keyed
 * on) when the agent never wrote a conversation for that id. That is the
 * NORMAL end of a gmux session the user opened and closed without typing
 * anything, and of every session whose agent died during warmup. The same
 * directory synced WITHOUT `-s` exits 0 (measured: RC_unknown_id=1,
 * RC_cwdwide=0). Reporting the first as a failure would toast
 * "SpecStory could not save the end of this session" at a user whose session
 * had nothing in it — the exact false alarm that teaches people to ignore
 * toasts. So a precise sync that fails falls back to the cwd-wide one, and
 * only a cwd-wide failure is worth the user's attention.
 */
export async function syncSession(req: SyncRequest): Promise<SyncOutcome> {
  const first = await runSync(req, req.agentSessionId);
  // `code === null` is "it never ran a sync at all" — a spawn failure, a
  // timeout, or a folder that is gone. None of those get better by dropping
  // `-s`, and a second CLI on top of a timed-out one is the wrong move.
  if (first.ok || req.agentSessionId === undefined || first.code === null) {
    return first;
  }
  const wide = await runSync(req, undefined);
  // The wide run is the authoritative answer either way: if it saved the
  // folder's conversations, nothing was lost; if it too failed, its reason is
  // the one that describes the folder rather than one absent id.
  return wide;
}

async function runSync(
  req: SyncRequest,
  agentSessionId: string | undefined
): Promise<SyncOutcome> {
  // Either source disables the upload, and neither can re-enable it: the
  // session's own recorded opt-out (it launched with `--no-cloud-sync` and
  // must die the same way) OR the ambient dev opt-out in this app run.
  const noCloud = req.noCloud === true || cloudDisabledByEnv();
  const cloud = !noCloud && readAuthFacts().signedIn;
  const argv = syncArgv({ ...req, agentSessionId }, { noCloud });

  if (!existsSync(req.cwd)) {
    // The folder is gone (worktree removed, temp dir cleaned). There is no
    // right directory to sync from, and syncing from the wrong one would file
    // the conversation under another project.
    return {
      ok: false,
      code: null,
      timedOut: false,
      cloud,
      message:
        `SpecStory could not save the end of this session: its folder ` +
        `(${req.cwd}) no longer exists.`,
      argv
    };
  }

  const [, ...args] = argv;
  const run = await runGuarded(req.bin, args, {
    timeoutMs: req.timeoutMs ?? SYNC_TIMEOUT_MS,
    cwd: req.cwd,
    // specstoryEnv() is the ONE spawn env (./resolve.ts): the user's real
    // login-shell PATH, the real HOME so one login serves both copies, and the
    // GMUX_SPECSTORY_HOME redirect when a verifier is running against a
    // scratch config. This module does not get to have an opinion about any
    // of that — a sync that ignored the override would defeat it.
    env: await specstoryEnv()
  });

  if (run.spawnError !== null) {
    return {
      ok: false,
      code: null,
      timedOut: false,
      cloud,
      message: `SpecStory sync could not start (${run.spawnError}).`,
      argv
    };
  }
  if (run.timedOut) {
    return {
      ok: false,
      code: null,
      timedOut: true,
      cloud,
      message:
        'SpecStory sync timed out saving this session — it will run again ' +
        'the next time a session in this folder ends.',
      argv
    };
  }
  if (run.code !== 0) {
    const detail = firstLine(run.stderr) ?? firstLine(run.stdout);
    return {
      ok: false,
      code: run.code,
      timedOut: false,
      cloud,
      message:
        'SpecStory could not save the end of this session' +
        (detail !== null ? ` — ${detail}` : '.'),
      argv
    };
  }
  return { ok: true, code: 0, timedOut: false, cloud, message: null, argv };
}

function firstLine(text: string): string | null {
  const line = text.split('\n').find((l) => l.trim().length > 0);
  return line === undefined ? null : line.trim().slice(0, 200);
}

// ---------------------------------------------------------------------------
// The queue
// ---------------------------------------------------------------------------

/**
 * Serialised, bounded sync runner.
 *
 * A quit with sixteen captured sessions must not fork sixteen CLIs at once:
 * each one opens the same `~/.specstory/sessions.db` and, when authed, its
 * own upload. Two at a time keeps the flush prompt without turning quit into
 * a thundering herd — and the queue is what lets the quit path drain with one
 * deadline for the whole fleet instead of one per session.
 */
export class SyncQueue {
  private readonly pending: (() => Promise<void>)[] = [];
  private running = 0;
  private drained: Promise<void> = Promise.resolve();
  private resolveDrained: (() => void) | null = null;

  constructor(
    private readonly onOutcome: (outcome: SyncOutcome, req: SyncRequest) => void,
    private readonly concurrency = 2
  ) {}

  /** Queue one sync. Returns immediately — this is a fire-and-forget path. */
  enqueue(req: SyncRequest): void {
    if (this.resolveDrained === null) {
      this.drained = new Promise<void>((resolve) => {
        this.resolveDrained = resolve;
      });
    }
    this.pending.push(async () => {
      const outcome = await syncSession(req);
      try {
        this.onOutcome(outcome, req);
      } catch {
        /* a reporting failure must not stall the queue */
      }
    });
    this.pump();
  }

  /** Resolves when everything queued so far has finished. */
  idle(): Promise<void> {
    return this.drained;
  }

  private pump(): void {
    while (this.running < this.concurrency && this.pending.length > 0) {
      const job = this.pending.shift();
      if (job === undefined) break;
      this.running += 1;
      void job().finally(() => {
        this.running -= 1;
        if (this.pending.length > 0) this.pump();
        else if (this.running === 0) {
          this.resolveDrained?.();
          this.resolveDrained = null;
        }
      });
    }
  }
}
