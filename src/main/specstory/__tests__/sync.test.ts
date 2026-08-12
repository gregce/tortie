/**
 * Unit tests for src/main/specstory/sync.ts — the session-end flush.
 *
 * Three things are pinned here, all of them things that were MEASURED against
 * specstory 2.8.0 before they were coded (2026-08-11, scratch HOME, scratch
 * project):
 *
 *  1. the argv shape, including that `-s` is dropped when gmux never captured
 *     an agent session id;
 *  2. the `-s` fallback: a precise sync that fails is retried cwd-wide,
 *     because `sync claude -s <unknown-uuid>` exits 1 ("no session found for
 *     UUID …") on a session the user opened and closed without typing, while
 *     the same folder synced without `-s` exits 0. Toasting the first would be
 *     a false alarm about a conversation that never existed;
 *  3. the queue: bounded concurrency, and an `idle()` the quit path can wait
 *     on with one deadline for the whole fleet.
 *
 * The CLI is mocked at the runGuarded seam — spawning a real one is
 * ./wrap.integration.test.ts's job.
 */

import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface FakeRun {
  code: number | null;
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
  spawnError?: string | null;
}

/** Every runGuarded call this test file provokes, in order. */
let calls: { bin: string; args: string[]; cwd?: string }[] = [];
let responses: FakeRun[] = [];

vi.mock('../../proc/guarded', () => ({
  runGuarded: (bin: string, args: string[], opts: { cwd?: string }) => {
    calls.push({ bin, args, ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}) });
    const next = responses.shift() ?? { code: 0 };
    return Promise.resolve({
      code: next.code,
      stdout: next.stdout ?? '',
      stderr: next.stderr ?? '',
      timedOut: next.timedOut ?? false,
      spawnError: next.spawnError ?? null
    });
  }
}));

// The account facts and the PATH probe are the two things sync.ts reaches
// outside itself for; neither is what these tests are about.
vi.mock('../status-ipc', () => ({
  readAuthFacts: () => ({ signedIn: false, email: null })
}));
vi.mock('../resolve', async (importActual) => {
  const actual = await importActual<typeof import('../resolve')>();
  return { ...actual, specstoryEnv: () => Promise.resolve({}) };
});

const { SyncQueue, syncArgv, syncSession, cloudDisabledByEnv } = await import('../sync');

const BIN = '/Applications/gmux.app/Contents/Resources/bin/specstory';
const UUID = '550e8400-e29b-41d4-a716-446655440000';
let cwd = '';

beforeEach(() => {
  calls = [];
  responses = [];
  cwd = mkdtempSync(join(tmpdir(), 'gmux-sssync-'));
});
afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
  delete process.env['GMUX_SPECSTORY_NO_CLOUD'];
});

describe('syncArgv', () => {
  it('is cwd-scoped, silent, and version-check free', () => {
    assert.deepEqual(syncArgv({ bin: BIN, provider: 'claude', cwd, agentSessionId: UUID }), [
      BIN,
      'sync',
      'claude',
      '-s',
      UUID,
      '--silent',
      '--no-version-check'
    ]);
  });

  it('drops -s when gmux never captured an id', () => {
    const argv = syncArgv({ bin: BIN, provider: 'codex', cwd });
    assert.equal(argv.includes('-s'), false);
    assert.deepEqual(argv.slice(0, 3), [BIN, 'sync', 'codex']);
  });

  it('honours the development opt-out that keeps scratch runs off the cloud', () => {
    assert.equal(cloudDisabledByEnv({ GMUX_SPECSTORY_NO_CLOUD: '1' }), true);
    assert.equal(cloudDisabledByEnv({}), false);
    const argv = syncArgv({ bin: BIN, provider: 'claude', cwd }, { noCloud: true });
    assert.equal(argv.includes('--no-cloud-sync'), true);
  });
});

describe('syncSession', () => {
  it('runs in the session’s own directory — the addressing scheme', async () => {
    const out = await syncSession({ bin: BIN, provider: 'claude', cwd });
    assert.equal(out.ok, true);
    assert.equal(calls[0]?.cwd, cwd);
    assert.equal(out.message, null);
  });

  it('carries the SESSION’s recorded no-cloud choice into an app run without the env', async () => {
    // The failure this pins: a session created under GMUX_SPECSTORY_NO_CLOUD=1
    // ends in a later run (a restore in the user's normal gmux) that no longer
    // has the variable. Re-reading only the ambient env there would upload a
    // scratch transcript to a signed-in user's SpecStory Cloud.
    delete process.env['GMUX_SPECSTORY_NO_CLOUD'];
    const out = await syncSession({
      bin: BIN,
      provider: 'claude',
      cwd,
      noCloud: true
    });
    assert.equal(out.ok, true);
    assert.equal(calls[0]?.args.includes('--no-cloud-sync'), true);
    assert.equal(out.cloud, false);
  });

  it('still honours the ambient opt-out for a session that never recorded one', async () => {
    process.env['GMUX_SPECSTORY_NO_CLOUD'] = '1';
    await syncSession({ bin: BIN, provider: 'claude', cwd });
    assert.equal(calls[0]?.args.includes('--no-cloud-sync'), true);
  });

  it('uploads normally when neither the session nor the environment opted out', async () => {
    await syncSession({ bin: BIN, provider: 'claude', cwd });
    assert.equal(calls[0]?.args.includes('--no-cloud-sync'), false);
  });

  it('never syncs from the wrong directory when the session’s is gone', async () => {
    rmSync(cwd, { recursive: true, force: true });
    const out = await syncSession({ bin: BIN, provider: 'claude', cwd });
    assert.equal(out.ok, false);
    assert.equal(calls.length, 0);
    assert.match(out.message ?? '', /no longer exists/);
  });

  it('falls back to a cwd-wide sync when the precise one fails, and stays silent if that works', async () => {
    responses = [
      { code: 1, stderr: `no session found for UUID ${UUID}` },
      { code: 0 }
    ];
    const out = await syncSession({ bin: BIN, provider: 'claude', cwd, agentSessionId: UUID });
    assert.equal(out.ok, true);
    assert.equal(out.message, null);
    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.args.includes('-s'), true);
    assert.equal(calls[1]?.args.includes('-s'), false);
  });

  it('speaks up only when the cwd-wide sync fails too, and quotes the CLI’s reason', async () => {
    responses = [
      { code: 1, stderr: 'no session found for UUID x' },
      { code: 1, stderr: 'permission denied writing .specstory/history' }
    ];
    const out = await syncSession({ bin: BIN, provider: 'claude', cwd, agentSessionId: UUID });
    assert.equal(out.ok, false);
    assert.match(out.message ?? '', /permission denied/);
  });

  it('does not retry a timeout (the CLI is still running; a second one is worse)', async () => {
    responses = [{ code: null, timedOut: true }];
    const out = await syncSession({ bin: BIN, provider: 'claude', cwd, agentSessionId: UUID });
    assert.equal(out.ok, false);
    assert.equal(out.timedOut, true);
    assert.equal(calls.length, 1);
    assert.match(out.message ?? '', /timed out/);
  });

  it('reports a spawn failure as one sentence, not a stack, and does not retry it', async () => {
    responses = [{ code: null, spawnError: 'ENOENT' }];
    const out = await syncSession({ bin: BIN, provider: 'claude', cwd, agentSessionId: UUID });
    assert.equal(out.ok, false);
    assert.match(out.message ?? '', /could not start \(ENOENT\)/);
    assert.equal(calls.length, 1); // dropping -s cannot conjure a binary
  });
});

describe('SyncQueue', () => {
  it('runs at most two at a time and resolves idle() when the fleet is drained', async () => {
    const seen: string[] = [];
    const q = new SyncQueue((outcome, req) => {
      seen.push(`${req.cwd}:${outcome.ok ? 'ok' : 'fail'}`);
    });
    for (let i = 0; i < 5; i += 1) {
      q.enqueue({ bin: BIN, provider: 'claude', cwd });
    }
    await q.idle();
    assert.equal(seen.length, 5);
    assert.equal(calls.length, 5);
  });

  it('a reporting failure does not stall the rest of the queue', async () => {
    let n = 0;
    const q = new SyncQueue(() => {
      n += 1;
      throw new Error('the toast blew up');
    });
    q.enqueue({ bin: BIN, provider: 'claude', cwd });
    q.enqueue({ bin: BIN, provider: 'claude', cwd });
    await q.idle();
    assert.equal(n, 2);
  });
});
