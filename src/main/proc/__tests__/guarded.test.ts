/**
 * Unit tests for src/main/proc/guarded.ts (Phase 13.8).
 *
 * The bar these tests hold: a guarded child ALWAYS settles its caller and
 * ALWAYS dies — including the fork it left behind, and including the case
 * where the app quits while the probe is still in flight, which is how five
 * `zsh -lic` orphans (oldest 19 h 41 m) got onto the reporting machine.
 *
 * Runner: vitest (`npm test`). Assertions on node:assert/strict.
 */

import { afterEach, beforeEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  guardedChildPids,
  reapGuardedChildren,
  runGuarded
} from '../guarded';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-guarded-'));
});

afterEach(() => {
  reapGuardedChildren();
  rmSync(root, { recursive: true, force: true });
});

/** Wait for `pidFile` to exist, then return the pid it holds. */
async function forkedPid(pidFile: string): Promise<number> {
  for (let i = 0; i < 100 && !existsSync(pidFile); i += 1) {
    await new Promise((r) => setTimeout(r, 20));
  }
  const pid = Number(readFileSync(pidFile, 'utf8').trim());
  assert.ok(Number.isFinite(pid) && pid > 0, `no pid in ${pidFile}`);
  return pid;
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

describe('runGuarded — the happy path', () => {
  it('captures stdout and the exit code', async () => {
    const r = await runGuarded('/bin/sh', ['-c', 'printf hello; exit 3'], {
      timeoutMs: 5_000
    });
    assert.equal(r.stdout, 'hello');
    assert.equal(r.code, 3);
    assert.equal(r.timedOut, false);
    assert.equal(r.spawnError, null);
  });

  it('separates stderr from stdout', async () => {
    const r = await runGuarded(
      '/bin/sh',
      ['-c', 'printf out; printf err 1>&2'],
      { timeoutMs: 5_000 }
    );
    assert.equal(r.stdout, 'out');
    assert.equal(r.stderr, 'err');
  });

  it('a missing binary is a result, not a rejection', async () => {
    const r = await runGuarded(join(root, 'nope'), [], { timeoutMs: 1_000 });
    assert.ok(r.spawnError !== null, 'expected a spawnError');
    assert.equal(r.timedOut, false);
  });
});

describe('runGuarded — the deadline', () => {
  it('a hung child settles the caller and dies', async () => {
    const started = Date.now();
    const r = await runGuarded('/bin/sh', ['-c', 'sleep 30'], {
      timeoutMs: 200
    });
    const elapsed = Date.now() - started;
    assert.equal(r.timedOut, true);
    assert.ok(elapsed < 3_000, `did not settle: waited ${elapsed} ms`);
  });

  /**
   * The whole reason this module exists. `execFile`'s timeout signals the
   * DIRECT child only, and its callback fires on stdio close — so a child
   * that forks a stdout-holder both hangs the caller and orphans the fork.
   */
  it('kills the FORK too, not just the direct child', async () => {
    const script = join(root, 'forker');
    const pidFile = join(root, 'fork.pid');
    writeFileSync(
      script,
      '#!/bin/sh\n' +
        'sleep 30 &\n' + // inherits stdout — this is what wedges execFile
        `echo $! > ${pidFile}\n` +
        'sleep 30\n'
    );
    chmodSync(script, 0o755);

    const r = await runGuarded(script, [], { timeoutMs: 300 });
    assert.equal(r.timedOut, true);
    const fork = await forkedPid(pidFile);
    await new Promise((res) => setTimeout(res, 1_200)); // SIGTERM→SIGKILL room
    assert.equal(isAlive(fork), false, `fork ${fork} survived the deadline`);
  });
});

describe('reapGuardedChildren — quit while a probe is in flight', () => {
  it('kills the child the deadline had not reached yet', async () => {
    const script = join(root, 'slow');
    const pidFile = join(root, 'slow.pid');
    writeFileSync(script, '#!/bin/sh\n' + `echo $$ > ${pidFile}\n` + 'sleep 30\n');
    chmodSync(script, 0o755);

    // A 60 s deadline that will never fire — quit has to be what reaps this.
    const pending = runGuarded(script, [], { timeoutMs: 60_000 });
    const pid = await forkedPid(pidFile);
    assert.ok(guardedChildPids().length > 0, 'child was not tracked');

    const killed = reapGuardedChildren();
    assert.ok(killed >= 1, 'reap reported nothing killed');
    const r = await pending; // and the caller is released, not left hanging
    assert.equal(r.timedOut, false);
    await new Promise((res) => setTimeout(res, 300));
    assert.equal(isAlive(pid), false, `pid ${pid} survived the reap`);
    assert.equal(guardedChildPids().length, 0);
  });
});
