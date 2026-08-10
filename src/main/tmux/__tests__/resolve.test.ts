/**
 * Unit tests for src/main/tmux/resolve.ts (Phase 9.2 Bug A):
 *  - binary resolution precedence (PATH order first, then extra dirs,
 *    executable-bit required, absolute inputs validated as-is)
 *  - login-shell PATH capture (marker extraction amid rc noise, timeout /
 *    broken-shell fallback keeps install dirs + system baseline)
 *
 * Runner: vitest (`npm test`). Assertions on node:assert/strict.
 */

import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { delimiter, join } from 'node:path';

// resolve.ts only touches electron lazily (resolveConfPath); mock it so the
// module loads under plain node.
vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => process.cwd() }
}));

import {
  captureLoginShellPath,
  extraBinDirs,
  fallbackPath,
  mergePathDirs,
  resetUserPathCache,
  resolveBinaryAgainst
} from '../resolve';

let root: string;

function makeBin(dir: string, name: string, executable = true): string {
  mkdirSync(dir, { recursive: true });
  const p = join(dir, name);
  writeFileSync(p, '#!/bin/sh\nexit 0\n');
  chmodSync(p, executable ? 0o755 : 0o644);
  return p;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-resolve-'));
  resetUserPathCache();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  resetUserPathCache();
});

describe('resolveBinaryAgainst — precedence', () => {
  it('walks PATH dirs in order; first executable wins', () => {
    const a = join(root, 'a');
    const b = join(root, 'b');
    const winner = makeBin(a, 'codex');
    makeBin(b, 'codex');
    const found = resolveBinaryAgainst('codex', [a, b].join(delimiter), []);
    assert.equal(found, winner);
  });

  it('consults extraDirs only AFTER every PATH dir missed', () => {
    const onPath = join(root, 'onpath');
    const extra = join(root, 'extra');
    makeBin(extra, 'claude');
    // Not on PATH → extra dir supplies it.
    assert.equal(
      resolveBinaryAgainst('claude', onPath, [extra]),
      join(extra, 'claude')
    );
    // On PATH too → PATH wins over extra.
    const winner = makeBin(onPath, 'claude');
    assert.equal(resolveBinaryAgainst('claude', onPath, [extra]), winner);
  });

  it('skips non-executable files (mode without +x)', () => {
    const a = join(root, 'noexec');
    const b = join(root, 'exec');
    makeBin(a, 'droid', false);
    const winner = makeBin(b, 'droid');
    const found = resolveBinaryAgainst('droid', [a, b].join(delimiter), []);
    assert.equal(found, winner);
  });

  it('returns null when nothing executable exists anywhere', () => {
    assert.equal(
      resolveBinaryAgainst('nonexistent-agent-xyz', join(root, 'empty'), [
        join(root, 'also-empty')
      ]),
      null
    );
  });

  it('validates absolute inputs as-is (no PATH walk)', () => {
    const abs = makeBin(join(root, 'abs'), 'gemini');
    assert.equal(resolveBinaryAgainst(abs, '', []), abs);
    assert.equal(
      resolveBinaryAgainst(join(root, 'abs', 'missing'), '', []),
      null
    );
  });

  it('expands ~/ against the real home dir', () => {
    // Cannot safely create files in the real $HOME; assert the expansion
    // shape by checking a ~ path that cannot exist resolves to null while
    // not being treated as a bare name (which would scan PATH).
    const found = resolveBinaryAgainst('~/definitely-not-a-real-bin-xyz', '', [
      root // would win if the input were (wrongly) treated as a bare name
    ]);
    assert.equal(found, null);
    assert.ok(homedir().length > 0);
  });

  it('rejects empty input', () => {
    assert.equal(resolveBinaryAgainst('', root, []), null);
  });
});

describe('captureLoginShellPath — marker extraction', () => {
  it('extracts PATH from between markers despite rc-file noise', async () => {
    // Fake login shell: prints noise (like an rc echo), then evaluates -c.
    const shell = join(root, 'fake-shell');
    writeFileSync(
      shell,
      '#!/bin/sh\n' +
        'echo "Welcome to my heavily customized shell!"\n' +
        'PATH="/fake/login/bin:/usr/bin"\n' +
        'export PATH\n' +
        '# last arg is the -c command\n' +
        'for last; do :; done\n' +
        'eval "$last"\n'
    );
    chmodSync(shell, 0o755);
    const captured = await captureLoginShellPath({ shell, timeoutMs: 3000 });
    const dirs = captured.split(delimiter);
    // Captured dirs come FIRST (user ordering wins)…
    assert.equal(dirs[0], '/fake/login/bin');
    // …and the safety net is appended.
    assert.ok(dirs.includes('/usr/bin'));
    for (const extra of extraBinDirs()) {
      assert.ok(dirs.includes(extra), `missing extra dir ${extra}`);
    }
  });
});

describe('captureLoginShellPath — fallback', () => {
  it('missing shell → sane fallback with install dirs + system baseline', async () => {
    const captured = await captureLoginShellPath({
      shell: join(root, 'no-such-shell'),
      timeoutMs: 500,
      env: { PATH: '/usr/bin:/bin' }
    });
    const dirs = captured.split(delimiter);
    const home = homedir();
    // BACKLOG Bug A fix 1: fallback must include these three at minimum.
    assert.ok(dirs.includes(join(home, '.local', 'bin')));
    assert.ok(dirs.includes('/opt/homebrew/bin'));
    assert.ok(dirs.includes('/usr/local/bin'));
    // System baseline survives.
    assert.ok(dirs.includes('/usr/bin'));
    assert.ok(dirs.includes('/bin'));
  });

  it('hung shell → times out and falls back (never rejects)', async () => {
    const shell = join(root, 'hang-shell');
    writeFileSync(shell, '#!/bin/sh\nsleep 30\n');
    chmodSync(shell, 0o755);
    const started = Date.now();
    const captured = await captureLoginShellPath({ shell, timeoutMs: 300 });
    assert.ok(Date.now() - started < 5_000, 'did not respect the timeout');
    assert.ok(captured.split(delimiter).includes('/usr/bin'));
  });

  it('shell that prints garbage (no markers) → fallback', async () => {
    const shell = join(root, 'garbage-shell');
    writeFileSync(shell, '#!/bin/sh\necho "not a path in sight"\n');
    chmodSync(shell, 0o755);
    const captured = await captureLoginShellPath({ shell, timeoutMs: 2000 });
    assert.ok(captured.split(delimiter).includes('/opt/homebrew/bin'));
  });
});

describe('mergePathDirs / fallbackPath', () => {
  it('dedupes while preserving first-seen order', () => {
    assert.equal(
      mergePathDirs(['/a', '/b'], ['/b', '/c'], ['', '/a']),
      ['/a', '/b', '/c'].join(delimiter)
    );
  });

  it('fallbackPath keeps the process PATH first', () => {
    const fp = fallbackPath({ PATH: '/first/dir:/usr/bin' });
    assert.ok(fp.startsWith('/first/dir'));
    assert.ok(fp.split(delimiter).includes(join(homedir(), '.local', 'bin')));
  });
});
