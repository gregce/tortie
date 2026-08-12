/**
 * The SpecStory device sign-in's CHILD LIFETIME (Phase 15).
 *
 * What is under test here is not the auth exchange — that belongs to
 * specstory-cli and is verified by using it — but the four rules gmux is
 * responsible for, each of which was a real hazard before it was a test:
 *
 *  1. ONE process for the whole flow. The CLI opens the browser itself on
 *     every `login` run, so a design that spawns it again to deliver the code
 *     opens a second tab at the worst possible moment. The stub records every
 *     browser open, and the test asserts there is exactly one.
 *  2. A rejected code is not the end. The CLI loops rather than exiting, so
 *     the child must still be alive and at its prompt afterwards, and the
 *     message shown must be its diagnosis.
 *  3. Success is read from the FILE, not from an exit code.
 *  4. Nothing is left behind: cancelling kills the process group.
 *
 * The stub (fake-specstory-login.cjs) reproduces the real CLI's observed
 * behaviour; no network, no browser, no real account.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { guardedChildPids } from '../../proc/guarded';
import {
  cancelLoginSession,
  loginSessionActive,
  startLoginSession,
  submitLoginCode
} from '../login';

const STUB = join(__dirname, 'fake-specstory-login.cjs');

let home: string;
let marker: string;

/** The success oracle the real caller uses: does auth.json say signed in? */
function signedIn(): boolean {
  try {
    const raw = readFileSync(join(home, '.specstory', 'cli', 'auth.json'), 'utf8');
    return typeof (JSON.parse(raw) as { cloud_refresh?: { token?: string } })
      .cloud_refresh?.token === 'string';
  } catch {
    return false;
  }
}

function browserOpens(): number {
  try {
    return readFileSync(marker, 'utf8').trim().split('\n').filter(Boolean).length;
  } catch {
    return 0;
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function env(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    HOME: home,
    FAKE_BROWSER_MARKER: marker,
    FAKE_GOOD_CODE: 'GOOD01'
  };
}

/** Wait for the child to reach its prompt before writing to it. */
const settle = (ms = 400): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'gmux-sslogin-'));
  marker = join(home, 'browser-opens.log');
  writeFileSync(marker, '');
});

afterEach(() => {
  cancelLoginSession();
  rmSync(home, { recursive: true, force: true });
});

describe('specstory device sign-in', () => {
  it('opens the browser once for a sign-in that takes two attempts', async () => {
    // node is the interpreter, so the stub is the "binary" — same shape as a
    // real one from the caller's point of view.
    expect(startLoginSession(STUB, env()).started).toBe(true);
    await settle();
    expect(browserOpens()).toBe(1);

    const bad = await submitLoginCode('BAD001', signedIn);
    expect(bad.ok).toBe(false);
    expect(bad.expired).toBe(false);
    expect(bad.message).toBe(
      'Authentication failed: Invalid or expired device code'
    );
    // Rule 2: still up, still at its prompt — the retry costs no new tab.
    expect(loginSessionActive()).toBe(true);

    const good = await submitLoginCode('GOOD01', signedIn);
    expect(good.ok).toBe(true);
    expect(good.message).toBeNull();
    expect(signedIn()).toBe(true);
    // Rule 1, the whole point: one process, one browser open, two attempts.
    expect(browserOpens()).toBe(1);
  }, 15_000);

  it('kills the waiting CLI when the user cancels', async () => {
    expect(startLoginSession(STUB, env()).started).toBe(true);
    await settle();
    const pids = guardedChildPids();
    expect(pids.length).toBeGreaterThan(0);

    cancelLoginSession();
    expect(loginSessionActive()).toBe(false);
    await settle(900); // SIGTERM, then the escalation grace
    expect(pids.filter(alive)).toEqual([]);
  }, 15_000);

  it('says the sign-in closed rather than pretending to submit', async () => {
    const outcome = await submitLoginCode('GOOD01', signedIn);
    expect(outcome).toEqual({ ok: false, message: null, expired: true });
  });

  it('replaces an earlier sign-in instead of racing it', async () => {
    expect(startLoginSession(STUB, env()).started).toBe(true);
    await settle();
    const first = guardedChildPids();
    expect(startLoginSession(STUB, env()).started).toBe(true);
    await settle(900);
    expect(first.filter(alive)).toEqual([]);
    expect(browserOpens()).toBe(2); // one per sign-in the user started
  }, 15_000);

  it('turns a binary that will not spawn into a closed sign-in', async () => {
    // spawn() reports ENOENT asynchronously, so the failure surfaces the same
    // way a walked-away sign-in does: there is nothing alive to submit to.
    startLoginSession(join(home, 'no-such-binary'), env());
    await settle(300);
    expect(loginSessionActive()).toBe(false);
    expect((await submitLoginCode('GOOD01', signedIn)).expired).toBe(true);
  });
});
