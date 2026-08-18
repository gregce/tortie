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
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { delimiter, join } from 'node:path';

// resolve.ts only touches electron lazily (resolveConfPath); mock it so the
// module loads under plain node.
vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => process.cwd() }
}));

import {
  ENV_CAPTURE_MAX_VALUE_BYTES,
  PATH_CAPTURE_TIMEOUT_MS,
  captureLoginShellEnv,
  captureLoginShellPath,
  extraBinDirs,
  extraBinDirsFor,
  SYSTEM_PATH_DIRS,
  fallbackPath,
  getUserPath,
  mergePathDirs,
  resetUserPathCache,
  resolveBinary,
  resolveBinaryAgainst,
  resolveBinaryAllAgainst,
  userPathEpoch
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

describe('resolveBinaryAllAgainst — every hit across the same walk (Phase 49)', () => {
  it('returns every executable hit in walk order, first equal to the sibling', () => {
    const a = join(root, 'all-a');
    const b = join(root, 'all-b');
    const c = join(root, 'all-c');
    const first = makeBin(a, 'codex');
    const second = makeBin(b, 'codex');
    makeBin(c, 'other');
    const pathValue = [a, b, c].join(delimiter);
    const hits = resolveBinaryAllAgainst('codex', pathValue, []);
    assert.deepEqual(hits, [first, second]);
    assert.equal(hits[0], resolveBinaryAgainst('codex', pathValue, []));
  });

  it('dedupes a directory that appears twice on the PATH', () => {
    const a = join(root, 'all-dup');
    const winner = makeBin(a, 'gemini');
    const hits = resolveBinaryAllAgainst('gemini', [a, a].join(delimiter), []);
    assert.deepEqual(hits, [winner]);
  });

  it('walks extraDirs after every PATH dir, like the sibling', () => {
    const onPath = join(root, 'all-onpath');
    const extra = join(root, 'all-extra');
    const first = makeBin(onPath, 'claude');
    const second = makeBin(extra, 'claude');
    assert.deepEqual(resolveBinaryAllAgainst('claude', onPath, [extra]), [
      first,
      second
    ]);
  });

  it('skips non-executable files', () => {
    const a = join(root, 'all-noexec');
    const b = join(root, 'all-exec');
    makeBin(a, 'droid', false);
    const winner = makeBin(b, 'droid');
    assert.deepEqual(
      resolveBinaryAllAgainst('droid', [a, b].join(delimiter), []),
      [winner]
    );
  });

  it('answers a zero-or-one element list for a path-shaped input', () => {
    const abs = makeBin(join(root, 'all-abs'), 'pi');
    assert.deepEqual(resolveBinaryAllAgainst(abs, '', []), [abs]);
    assert.deepEqual(
      resolveBinaryAllAgainst(join(root, 'all-abs', 'missing'), '', []),
      []
    );
    // A ~/ path that does not exist is validated as a path, never PATH-walked.
    assert.deepEqual(
      resolveBinaryAllAgainst('~/definitely-not-a-real-bin-xyz', '', [root]),
      []
    );
  });

  it('rejects empty input', () => {
    assert.deepEqual(resolveBinaryAllAgainst('', root, []), []);
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

  /**
   * The regression that deadlocked Phase 13.5's conformance harness for 9
   * minutes. `sleep 30` alone was never the hard case — execFile's own
   * timeout SIGTERMs a direct child just fine. The killer is a shell that
   * FORKS (this machine's `zsh -lic` forks a copy of itself): the fork
   * inherits the stdout write end, so the pipe never closes, so execFile's
   * callback — the only path to settlement — never fires, and every
   * resolveBinary() caller blocks forever. Two assertions, because settling
   * while leaking is only half a fix: the promise resolves, AND the fork is
   * gone rather than orphaned for 11 hours.
   */
  it('shell that forks a stdout-holding child → still settles, and kills the fork', async () => {
    const shell = join(root, 'forking-shell');
    const pidFile = join(root, 'grandchild.pid');
    writeFileSync(
      shell,
      '#!/bin/sh\n' +
        '# The fork inherits stdout — this is what wedges execFile.\n' +
        'sleep 30 &\n' +
        `echo $! > ${pidFile}\n` +
        'sleep 30\n'
    );
    chmodSync(shell, 0o755);
    const started = Date.now();
    const captured = await captureLoginShellPath({ shell, timeoutMs: 300 });
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 5_000, `did not settle: waited ${elapsed} ms`);
    assert.ok(captured.split(delimiter).includes('/usr/bin'));

    const grandchild = Number(readFileSync(pidFile, 'utf8').trim());
    assert.ok(Number.isFinite(grandchild) && grandchild > 0, 'no grandchild pid');
    // Give SIGTERM→SIGKILL escalation (500 ms) room, then prove it landed.
    await new Promise((r) => setTimeout(r, 1_200));
    assert.throws(
      () => process.kill(grandchild, 0),
      /ESRCH/,
      `grandchild ${grandchild} survived the probe timeout`
    );
  });

  /**
   * The variant 13.5.1 left open and Phase 13.8 closed. The 13.5.1 deadline
   * was cancelled on the child's 'exit', which is the WRONG event: a shell
   * that forks a stdout-holder and then exits itself (rc file runs `foo &`
   * and the printf never happens) cancels the deadline, never reaches
   * 'close', and so settles never and reaps nothing. Same two assertions as
   * above, but the leader is gone before the deadline would have fired.
   */
  it('shell that forks then EXITS without markers → still settles, and kills the fork', async () => {
    const shell = join(root, 'fork-and-exit-shell');
    const pidFile = join(root, 'orphan.pid');
    writeFileSync(
      shell,
      '#!/bin/sh\n' +
        '# Fork a child that inherits stdout, then leave. The pipe stays open\n' +
        "# because of the fork, so 'close' never fires — only 'exit' does.\n" +
        'sleep 30 &\n' +
        `echo $! > ${pidFile}\n` +
        'exit 0\n'
    );
    chmodSync(shell, 0o755);
    const started = Date.now();
    const captured = await captureLoginShellPath({ shell, timeoutMs: 300 });
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 5_000, `did not settle: waited ${elapsed} ms`);
    assert.ok(captured.split(delimiter).includes('/usr/bin'));

    const orphan = Number(readFileSync(pidFile, 'utf8').trim());
    assert.ok(Number.isFinite(orphan) && orphan > 0, 'no forked pid');
    await new Promise((r) => setTimeout(r, 1_200));
    assert.throws(
      () => process.kill(orphan, 0),
      /ESRCH/,
      `fork ${orphan} outlived the probe deadline`
    );
  });

  it('shell that prints garbage (no markers) → fallback', async () => {
    const shell = join(root, 'garbage-shell');
    writeFileSync(shell, '#!/bin/sh\necho "not a path in sight"\n');
    chmodSync(shell, 0o755);
    const captured = await captureLoginShellPath({ shell, timeoutMs: 2000 });
    assert.ok(captured.split(delimiter).includes('/opt/homebrew/bin'));
  });
});

/**
 * captureLoginShellEnv (Phase 33).
 *
 * The failure modes are the PATH probe's, because the shape is the PATH
 * probe's. What is new here is the answer: a map of names to values, a list of
 * names that had none, and one flag saying whether the shell answered at all.
 * The fake shells below evaluate their last argument, which is the `-c`
 * string, so the real printf script runs.
 */
describe('captureLoginShellEnv', () => {
  /** A shell that exports what the test asks for, then runs the -c command. */
  function fakeShell(name: string, body: string): string {
    const shell = join(root, name);
    writeFileSync(
      shell,
      '#!/bin/sh\n' +
        `${body}\n` +
        '# the last argument is the -c command\n' +
        'for last; do :; done\n' +
        'eval "$last"\n'
    );
    chmodSync(shell, 0o755);
    return shell;
  }

  it('reads the named variables and nothing else', async () => {
    const shell = fakeShell(
      'env-shell',
      'export P33_A=alpha\nexport P33_B=beta\nexport P33_SECRET=never\n' +
        'echo "rc noise from a chatty startup file"'
    );
    const out = await captureLoginShellEnv(['P33_A', 'P33_B'], {
      shell,
      timeoutMs: 3000
    });
    assert.deepEqual(out.values, { P33_A: 'alpha', P33_B: 'beta' });
    assert.deepEqual(out.missing, []);
    assert.equal(out.probeFailed, false);
    // The probe asked for two names, so the third cannot appear anywhere.
    assert.ok(!JSON.stringify(out).includes('never'));
  });

  it('treats an unset name and an empty one the same, and names both', async () => {
    const shell = fakeShell('empty-shell', 'export P33_SET=yes\nexport P33_EMPTY=');
    const out = await captureLoginShellEnv(
      ['P33_SET', 'P33_EMPTY', 'P33_UNSET'],
      { shell, timeoutMs: 3000 }
    );
    assert.deepEqual(out.values, { P33_SET: 'yes' });
    assert.deepEqual(out.missing, ['P33_EMPTY', 'P33_UNSET']);
    assert.equal(out.probeFailed, false);
  });

  it('refuses a value over the cap whole, rather than truncating it', async () => {
    const long = 'x'.repeat(ENV_CAPTURE_MAX_VALUE_BYTES + 1);
    const shell = fakeShell('long-shell', `export P33_LONG=${long}`);
    const out = await captureLoginShellEnv(['P33_LONG'], { shell, timeoutMs: 3000 });
    assert.deepEqual(out.values, {});
    assert.deepEqual(out.missing, ['P33_LONG']);
  });

  it('spawns nothing at all when no names are asked for', async () => {
    const out = await captureLoginShellEnv([], {
      shell: join(root, 'this-shell-does-not-exist'),
      timeoutMs: 3000
    });
    assert.deepEqual(out, { values: {}, missing: [], probeFailed: false });
  });

  it('missing shell → probeFailed, every name reported, never a reject', async () => {
    const out = await captureLoginShellEnv(['P33_A'], {
      shell: join(root, 'no-such-shell'),
      timeoutMs: 500
    });
    assert.equal(out.probeFailed, true);
    assert.deepEqual(out.missing, ['P33_A']);
  });

  it('a shell that prints no markers is a failed probe, not a set of unset names', async () => {
    const shell = join(root, 'silent-shell');
    writeFileSync(shell, '#!/bin/sh\necho "not a record in sight"\n');
    chmodSync(shell, 0o755);
    const out = await captureLoginShellEnv(['P33_A'], { shell, timeoutMs: 2000 });
    assert.equal(out.probeFailed, true);
    assert.deepEqual(out.missing, ['P33_A']);
  });

  /**
   * The Phase 13.5.1 case, in this probe. A shell that forks a child holding
   * stdout never closes the pipe, so settling on `close` alone would hang the
   * launch. The deadline settles it and the GROUP kill reaches the fork. Two
   * assertions, because settling while leaking is half a fix.
   */
  it('hung shell that forks → settles on the deadline and kills the group', async () => {
    const shell = join(root, 'env-fork-shell');
    const pidFile = join(root, 'env-grandchild.pid');
    writeFileSync(
      shell,
      '#!/bin/sh\n' + 'sleep 30 &\n' + `echo $! > ${pidFile}\n` + 'sleep 30\n'
    );
    chmodSync(shell, 0o755);
    const started = Date.now();
    const out = await captureLoginShellEnv(['P33_A'], { shell, timeoutMs: 300 });
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 5_000, `did not settle: waited ${elapsed} ms`);
    assert.equal(out.probeFailed, true);
    assert.deepEqual(out.missing, ['P33_A']);

    const grandchild = Number(readFileSync(pidFile, 'utf8').trim());
    assert.ok(Number.isFinite(grandchild) && grandchild > 0, 'no grandchild pid');
    await new Promise((r) => setTimeout(r, 1_200));
    assert.throws(
      () => process.kill(grandchild, 0),
      /ESRCH/,
      `grandchild ${grandchild} survived the probe deadline`
    );
  });

  /**
   * The nonce. Two probes in the same process must not share a marker, or rc
   * output that copied one probe's framing could forge the next probe's
   * records. The marker is unpredictable, so the check is that a value which
   * TRIES to look like a record does not become one.
   */
  it('rc output cannot forge a record, because the marker is per probe', async () => {
    const shell = fakeShell(
      'forge-shell',
      'export P33_A=real\n' + 'echo "__GMUX_ENVP_00000000__P33_A=forged__GMUX_ENVP_00000000__"'
    );
    const out = await captureLoginShellEnv(['P33_A'], { shell, timeoutMs: 3000 });
    assert.equal(out.values['P33_A'], 'real');
  });

  it('drops a name that is not a usable variable name rather than running it', async () => {
    const shell = fakeShell('inject-shell', 'export P33_A=alpha');
    const out = await captureLoginShellEnv(['P33_A', 'oops; rm -rf /'], {
      shell,
      timeoutMs: 3000
    });
    assert.deepEqual(out.values, { P33_A: 'alpha' });
    assert.deepEqual(out.missing, ['oops; rm -rf /']);
  });
});

/**
 * PHASE 48. The budget and the epoch.
 *
 * The budget is a number the create path waits on, so it is pinned here rather
 * than left to a comment. A miss falls back to a PATH with no version managed
 * node directory in it, the agent is then found and its interpreter is not,
 * and the pane opens and dies at once. The Phase 48 fix round could not
 * reproduce the five slow captures the raise was justified with, so the reason
 * recorded on PATH_CAPTURE_TIMEOUT_MS in ../resolve.ts is the cost of a miss
 * rather than a measured miss.
 *
 * The epoch exists so that a cache of answers computed AGAINST the captured
 * PATH can drop them when the PATH is replaced. src/main/agents/health.ts is
 * the caller, and what it needs is exactly this: a number that moves on a
 * recapture and does not move on a cached call.
 */
describe('PATH_CAPTURE_TIMEOUT_MS', () => {
  it('is 10,000 ms', () => {
    assert.equal(PATH_CAPTURE_TIMEOUT_MS, 10_000);
  });
});

describe('userPathEpoch', () => {
  it('is 0 in a process that has not captured yet', async () => {
    // A fresh copy of the module, so the count is this import's own. Nothing
    // is spawned: the counter moves at the first getUserPath() and this test
    // never makes one.
    vi.resetModules();
    const fresh = await import('../resolve');
    assert.equal(fresh.userPathEpoch(), 0);
  });

  it('moves on a capture, stays put on a cached call, moves again after a reset', async () => {
    const before = userPathEpoch();
    // The counter moves where the promise is assigned, which is synchronous,
    // so the assertions do not have to wait for a login shell to answer.
    const first = getUserPath();
    assert.equal(userPathEpoch(), before + 1);

    const second = getUserPath();
    assert.equal(userPathEpoch(), before + 1, 'a cached call re-captured');
    assert.equal(second, first, 'a cached call returned a different promise');

    resetUserPathCache();
    const third = getUserPath();
    assert.equal(userPathEpoch(), before + 2);
    assert.notEqual(third, first);

    // Both probes are settled before the test ends, so neither outlives it.
    // captureLoginShellPath never rejects.
    await Promise.all([first, third]);
  }, 30_000);
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

// PHASE 84 EXTRACTED THE HOME ARGUMENT, and nothing about the list moved.
// `src/main/machines/remote-argv.ts` asks the same question about ANOTHER
// computer, and the only honest way to compose those paths is with that
// machine's own $HOME, which it states for itself. Copying the eight leaves
// into the machines layer would be two lists that drift, so there is one list
// and it takes the home as an argument.
describe('extraBinDirsFor, the same eight folders against any home', () => {
  it('answers exactly what extraBinDirs answers for this Mac', () => {
    assert.deepEqual(extraBinDirsFor(homedir()), extraBinDirs());
  });

  it('composes every home folder against the home it was given', () => {
    const dirs = extraBinDirsFor('/home/gdc');
    assert.ok(dirs.includes('/home/gdc/.local/bin'));
    assert.ok(dirs.includes('/home/gdc/.claude/local'));
    assert.ok(dirs.includes('/home/gdc/.cursor/bin'));
    for (const dir of dirs) {
      assert.ok(dir.startsWith('/home/gdc/') || dir.startsWith('/opt/') || dir.startsWith('/usr/'));
    }
  });

  it('keeps the two folders that do not depend on a home', () => {
    const dirs = extraBinDirsFor('/home/gdc');
    assert.ok(dirs.includes('/opt/homebrew/bin'));
    assert.ok(dirs.includes('/usr/local/bin'));
  });

  it('keeps the order, because it is the order a search walks', () => {
    assert.equal(extraBinDirsFor('/h')[0], '/h/.local/bin');
    assert.equal(extraBinDirsFor('/h').length, 8);
  });
});

describe('SYSTEM_PATH_DIRS', () => {
  /**
   * PHASE 84 EXPORTED IT, so a reader and a test can name the four directories
   * rather than infer them from a composed string.
   */
  it('is the four directories every PATH keeps', () => {
    assert.deepEqual(SYSTEM_PATH_DIRS, ['/usr/bin', '/bin', '/usr/sbin', '/sbin']);
  });
});

// PHASE 23 FIX ROUND. `resolveBinary` is what session create calls, and it used
// to know nothing about an agent's own `extraProbeDirs`. Detection did, and
// resolved against them, so an agent installed outside the login-shell PATH was
// reported installed and then threw AGENT_NOT_FOUND on the next create. The
// second argument is the fix, and these two tests are the before and the after.
describe('resolveBinary — an agent\'s own probe dirs', () => {
  it('finds a binary that is ONLY in a dir the entry named', async () => {
    const dir = join(root, 'agentbin');
    const bin = makeBin(dir, 'tortiever');
    // Nothing seeds this name into the login-shell PATH, so without the second
    // argument there is nothing to find.
    assert.equal(await resolveBinary('tortiever'), null);
    assert.equal(await resolveBinary('tortiever', [dir]), bin);
  });

  it('leaves every other caller alone: no dirs means the old behaviour', async () => {
    assert.equal(await resolveBinary('definitely-not-a-real-binary-xyz'), null);
    assert.equal(
      await resolveBinary('definitely-not-a-real-binary-xyz', []),
      null
    );
  });
});
