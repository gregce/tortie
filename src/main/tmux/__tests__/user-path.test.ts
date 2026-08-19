/**
 * Unit tests for src/main/tmux/user-path.ts (Phase 81).
 *
 * The module is four lines of code and one invariant, and the invariant is
 * what these tests are for: `process.env['PATH']` is assigned once per app
 * run, with the value of one cached capture, on exactly one line in src/main.
 * The last test in this file asserts that against the source, so a later
 * round that adds a second writer fails the build rather than the next
 * person's restore.
 *
 * Runner: vitest (`npm test`). Assertions on node:assert/strict.
 */

import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// resolve.ts only touches electron lazily; mock it so the module loads under
// plain node.
vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => process.cwd() }
}));

/** Every notice the module posted, in order. */
const posted: Array<Record<string, unknown>> = [];
/**
 * Set for the one test that needs the install to fail. The capture itself
 * never rejects, so the only reachable failure in this module is a throw
 * from the notice, and that is the arm the retry rule exists for.
 */
const failure = { next: false };
vi.mock('../../notice', () => ({
  postDurabilityNotice: (notice: Record<string, unknown>) => {
    if (failure.next) {
      failure.next = false;
      throw new Error('the notice could not be posted');
    }
    posted.push(notice);
    return true;
  }
}));

import { resetUserPathCache, userPathEpoch, userPathSource } from '../resolve';
import {
  installUserPath,
  resetUserPathInstallForTests,
  userPathInstalled
} from '../user-path';

let root: string;
let shellBefore: string | undefined;
let pathBefore: string | undefined;

/** A fake login shell asked exactly the way the real one is asked. */
function fakeShell(body: string): string {
  const shell = join(root, `shell-${String(Math.random()).slice(2)}`);
  writeFileSync(shell, `#!/bin/sh\n${body}\n`);
  chmodSync(shell, 0o755);
  return shell;
}

/** A shell that prints a PATH between the markers, so the capture settles. */
function answeringShell(pathValue: string): string {
  return fakeShell(
    `PATH="${pathValue}"\nexport PATH\nfor last; do :; done\neval "$last"`
  );
}

/** A shell that prints nothing and exits, which is the fallback branch. */
function silentShell(): string {
  return fakeShell('exit 0');
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-user-path-'));
  posted.length = 0;
  failure.next = false;
  shellBefore = process.env['SHELL'];
  pathBefore = process.env['PATH'];
  resetUserPathCache();
  resetUserPathInstallForTests();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  if (shellBefore === undefined) delete process.env['SHELL'];
  else process.env['SHELL'] = shellBefore;
  if (pathBefore === undefined) delete process.env['PATH'];
  else process.env['PATH'] = pathBefore;
  resetUserPathCache();
  resetUserPathInstallForTests();
});

describe('installUserPath — one writer, one value', () => {
  it('captures once and writes once across ten concurrent calls', async () => {
    process.env['SHELL'] = answeringShell('/fake/login/bin:/usr/bin');
    const epochBefore = userPathEpoch();
    const all = await Promise.all(
      Array.from({ length: 10 }, () => installUserPath())
    );
    // One capture, so one run of the body, so one assignment. The assignment
    // is on one line and the last test in this file proves there is only one.
    assert.equal(userPathEpoch(), epochBefore + 1);
    for (const value of all) assert.equal(value, all[0]);
    assert.equal(process.env['PATH'], all[0]);
    assert.ok((all[0] ?? '').startsWith('/fake/login/bin:'));
  });

  it('a second call after the first settled writes nothing and returns the same string', async () => {
    process.env['SHELL'] = answeringShell('/fake/login/bin:/usr/bin');
    const first = await installUserPath();
    assert.equal(userPathInstalled(), true);
    process.env['PATH'] = 'something-a-test-put-there';
    const second = await installUserPath();
    assert.equal(second, first);
    // Nothing overwrote what the test put there, which is the whole rule.
    assert.equal(process.env['PATH'], 'something-a-test-put-there');
  });
});

describe('installUserPath — the fallback is said once, and only when it happens', () => {
  it('a silent shell reads as fallback and posts one notice', async () => {
    const shell = silentShell();
    process.env['SHELL'] = shell;
    await installUserPath();
    assert.equal(userPathSource(), 'fallback');
    assert.equal(posted.length, 1);
    assert.equal(posted[0]?.['kind'], 'shell-path-fallback');
    assert.equal(posted[0]?.['shell'], shell);
  });

  it('a shell that answers reads as login shell and posts nothing', async () => {
    process.env['SHELL'] = answeringShell('/fake/login/bin:/usr/bin');
    await installUserPath();
    assert.equal(userPathSource(), 'login shell');
    assert.equal(posted.length, 0);
  });
});

describe('installUserPath — a rejected install is retried', () => {
  it('clears the memo so the next call is a fresh attempt', async () => {
    process.env['SHELL'] = silentShell();
    failure.next = true;
    await assert.rejects(installUserPath());
    assert.equal(userPathInstalled(), false);
    const second = await installUserPath();
    assert.ok(second.length > 0);
    assert.equal(userPathInstalled(), true);
    assert.equal(posted.length, 1);
  });
});

describe('the one writer rule, asserted against the source', () => {
  it('assigns the process PATH in exactly one production file', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(here, '..', '..', '..');
    // Composed rather than written out, so this file is not itself a hit for
    // the pattern it is looking for.
    const needle = `process.env['PATH']` + ' =';
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry === '__tests__' || entry === 'node_modules') continue;
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry)) continue;
        if (entry.endsWith('.test.ts')) continue;
        if (readFileSync(full, 'utf8').includes(needle)) hits.push(full);
      }
    };
    walk(srcRoot);
    assert.deepEqual(
      hits.map((p) => p.slice(srcRoot.length + 1)),
      ['main/tmux/user-path.ts']
    );
  });
});
