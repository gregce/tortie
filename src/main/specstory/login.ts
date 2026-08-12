/**
 * The SpecStory Cloud device sign-in, as ONE child process (Phase 15).
 *
 * WHY THIS MODULE EXISTS — a defect found by running the real CLI, not by
 * reading it. The obvious two-step design is: gmux opens the login page with
 * `shell.openExternal`, the user types the 6-character code into the Settings
 * row, and gmux then runs `specstory login` with that code on its stdin. It
 * works. It also opens the browser TWICE, because `specstory login` calls
 * `openBrowser(loginURL)` unconditionally on every run (pkg/cmd/login.go:86)
 * and has no flag to stop it — `--silent` suppresses output, not the browser.
 * The second tab arrives at the exact moment the user finishes signing in,
 * which reads as "it didn't work".
 *
 * So the flow is inverted: pressing "Sign in" starts ONE `specstory login` and
 * leaves its stdin OPEN. The CLI opens the browser (once), prints its prompt,
 * and blocks on `bufio.NewReader(os.Stdin).ReadString('\n')` (login.go:105) —
 * a pipe satisfies that read exactly as a terminal does. When the user submits
 * the code, gmux writes one line into the child that is already waiting, and
 * the CLI does the rest: the private `/api/v1/device-login` exchange and the
 * 0600 write of `auth.json` stay entirely inside the tool that owns them.
 *
 * A REJECTED CODE IS NOT THE END. The CLI loops (five attempts) rather than
 * exiting, so the child is kept alive after a failure and the next submit is
 * the next attempt — same browser tab, same page, same code prompt. That is
 * only possible because the process outlives the IPC call.
 *
 * NOTHING IS LEFT BEHIND. The child is spawned detached and registered with
 * the guarded-child registry, so app quit reaps it (src/main/proc/guarded.ts —
 * written after 19-hour orphans were found on the user's machine). On top of
 * that: an idle deadline kills a sign-in the user walked away from, starting a
 * second one replaces the first, and Cancel kills it immediately.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { distillCliMessage } from '@shared/specstory-status';
import { killProcessGroup, trackGuardedChild } from '../proc/guarded';
// Non-negotiable on EVERY specstory invocation (see its declaration): without
// it each run blocks ~2.5 s on a GitHub HEAD and prints an update banner —
// here, that banner would land on top of the device-code prompt.
import { NO_VERSION_CHECK } from './resolve';

/** A sign-in nobody finished. Long enough to find the email, then read it. */
export const LOGIN_IDLE_TIMEOUT_MS = 10 * 60_000;
/** How long one submitted code gets before we stop waiting for a verdict. */
export const LOGIN_SUBMIT_TIMEOUT_MS = 30_000;
/** Poll step while waiting: auth.json appearing is the success signal. */
const POLL_MS = 200;
/** Plenty for the CLI's chatty prompts; a runaway must not grow unbounded. */
const MAX_OUTPUT = 64 * 1024;

interface LoginSession {
  child: ChildProcess;
  /** Everything the child has said, both streams, in arrival order. */
  out: string;
  err: string;
  exited: boolean;
  idle: NodeJS.Timeout;
}

let session: LoginSession | null = null;

function endSession(): void {
  if (session === null) return;
  clearTimeout(session.idle);
  if (!session.exited) killProcessGroup(session.child);
  session = null;
}

/** Cancel: the user closed the row, or is starting over. Idempotent. */
export function cancelLoginSession(): void {
  endSession();
}

/** True while a `specstory login` is up and waiting for a code. */
export function loginSessionActive(): boolean {
  return session !== null && !session.exited;
}

export interface LoginSessionStart {
  /** False only when the binary could not be spawned at all. */
  started: boolean;
  /** Why not, when it could not. */
  error: string | null;
}

/**
 * Start the device flow. Any sign-in already in flight is cancelled first, so
 * pressing "Sign in" twice can never leave two CLIs racing for one auth.json.
 */
export function startLoginSession(
  bin: string,
  env: NodeJS.ProcessEnv
): LoginSessionStart {
  endSession();
  let child: ChildProcess;
  try {
    child = spawn(bin, ['login', NO_VERSION_CHECK], {
      detached: true, // its own process group, so the reaper can reach it
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });
  } catch (err) {
    return { started: false, error: (err as Error).message };
  }

  const live: LoginSession = {
    child,
    out: '',
    err: '',
    exited: false,
    idle: setTimeout(() => {
      if (session === live) endSession();
    }, LOGIN_IDLE_TIMEOUT_MS)
  };
  live.idle.unref?.();
  session = live;

  trackGuardedChild(child);
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (c: string) => {
    if (live.out.length < MAX_OUTPUT) live.out += c;
  });
  child.stderr?.on('data', (c: string) => {
    if (live.err.length < MAX_OUTPUT) live.err += c;
  });
  // A pipe destroyed by the group kill must not become an unhandled error, and
  // stdin gives EPIPE the instant the CLI stops reading.
  child.stdout?.on('error', () => undefined);
  child.stderr?.on('error', () => undefined);
  child.stdin?.on('error', () => undefined);
  child.once('error', () => {
    live.exited = true;
  });
  child.once('exit', () => {
    live.exited = true;
  });

  return { started: true, error: null };
}

export interface LoginSubmitOutcome {
  ok: boolean;
  /** Plain-language failure in the CLI's own words; null on success. */
  message: string | null;
  /** True when there is no live sign-in to submit to — the row must restart. */
  expired: boolean;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * Hand the code to the waiting CLI and wait for a verdict.
 *
 * `isSignedIn` is the success oracle rather than the child's exit code,
 * because the truth is the file: the CLI writes `auth.json` and then prints
 * its farewell, so waiting for exit would add a second of nothing to every
 * successful sign-in. On failure the child is deliberately LEFT RUNNING at its
 * next prompt so the user's retry costs no new browser tab.
 */
export async function submitLoginCode(
  code: string,
  isSignedIn: () => boolean
): Promise<LoginSubmitOutcome> {
  const live = session;
  if (live === null || live.exited) {
    return { ok: false, message: null, expired: true };
  }
  // Only output produced from here on can be about THIS code.
  const outMark = live.out.length;
  const errMark = live.err.length;
  live.child.stdin?.write(`${code}\n`);

  const deadline = Date.now() + LOGIN_SUBMIT_TIMEOUT_MS;
  for (;;) {
    await sleep(POLL_MS);
    if (isSignedIn()) {
      // The CLI exits by itself once it has written the file; the reaper and
      // the idle timer cover the case where it does not.
      endSession();
      return { ok: true, message: null, expired: false };
    }
    const said = distillCliMessage(
      live.out.slice(outMark),
      live.err.slice(errMark)
    );
    if (live.exited) {
      endSession();
      return {
        ok: false,
        message: said ?? 'SpecStory stopped before it could sign you in.',
        expired: false
      };
    }
    // Still running AND it has already blamed the code: it is back at its
    // prompt, so answer now instead of holding the button for 30 seconds.
    if (said !== null && /(fail|invalid|expired|denied|unauthor)/i.test(said)) {
      return { ok: false, message: said, expired: false };
    }
    if (Date.now() >= deadline) {
      return {
        ok: false,
        message: 'SpecStory did not answer in time.',
        expired: false
      };
    }
  }
}
