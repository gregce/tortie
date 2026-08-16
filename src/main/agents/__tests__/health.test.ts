/**
 * The structural preflight, against real files (Phase 48).
 *
 * Every case here writes a real file into a `mkdtemp` directory and asks the
 * real check about it. No tmux, no Electron, no manifest and no process.
 *
 * The one thing that is faked is the login shell PATH. `getUserPath` runs the
 * user's own shell, which takes seconds and answers differently on every
 * machine, so it is replaced with a string this file controls. Everything
 * else in ../../tmux/resolve stays real, including `resolveBinaryAgainst`,
 * which is the function whose answer the whole check turns on.
 */

import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  closeSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  openSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/** The PATH the fake `getUserPath` answers with. Set per test. */
let userPath = '';
/** What the fake `userPathEpoch` answers with. Set per test. */
let epoch = 1;

vi.mock('../../tmux/resolve', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux/resolve')>();
  return {
    ...actual,
    getUserPath: () => Promise.resolve(userPath),
    userPathEpoch: () => epoch
  };
});

const {
  AGENT_HEALTH_TIMEOUT_MS,
  agentHealthCacheSize,
  agentHealthStrandedCount,
  checkAgentBinary,
  interpreterOf,
  resetAgentHealthCache
} = await import('../health');

const root = mkdtempSync(join(tmpdir(), 'p48-health-'));
/** A directory with an executable `node` in it. */
const withNode = join(root, 'bin-with-node');
/** A directory with nothing in it. */
const withoutNode = join(root, 'bin-empty');

mkdirSync(withNode, { recursive: true });
mkdirSync(withoutNode, { recursive: true });
writeFileSync(join(withNode, 'node'), '#!/bin/sh\nexit 0\n');
chmodSync(join(withNode, 'node'), 0o755);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

let seq = 0;

/** Write one executable file and return its absolute path. */
function shim(body: string): string {
  const path = join(root, `shim-${++seq}`);
  writeFileSync(path, body);
  chmodSync(path, 0o755);
  return path;
}

beforeEach(() => {
  resetAgentHealthCache();
  userPath = withNode;
  epoch = 1;
});

describe('interpreterOf', () => {
  it('reads a plain interpreter and expands the three env forms', () => {
    expect(interpreterOf('#!/bin/sh')).toBe('/bin/sh');
    expect(interpreterOf('#!/usr/bin/env node')).toBe('node');
    expect(interpreterOf('#!/usr/bin/env -S node --enable-source-maps')).toBe(
      'node'
    );
    expect(interpreterOf('#!/usr/bin/env FOO=1 node')).toBe('node');
  });

  it('has no answer for env with no program', () => {
    expect(interpreterOf('#!/usr/bin/env')).toBeNull();
    expect(interpreterOf('#!')).toBeNull();
  });

  /**
   * PHASE 48 FIX ROUND. `-S` and `--split-string` are the same option and the
   * long form puts the program INSIDE the token, so the old loop skipped it as
   * a flag and reported no program at all.
   */
  it('reads the program out of the long split-string form', () => {
    expect(interpreterOf('#!/usr/bin/env --split-string=node')).toBe('node');
    expect(
      interpreterOf('#!/usr/bin/env --split-string=node --enable-source-maps')
    ).toBe('node');
    // The attached short form, which is the same thing written shorter.
    expect(interpreterOf('#!/usr/bin/env -Snode --enable-source-maps')).toBe(
      'node'
    );
  });
});

describe('checkAgentBinary, the files that are not scripts', () => {
  it('answers ok on the first two bytes of a binary', async () => {
    // The first four bytes of a 64 bit Mach-O executable.
    const path = join(root, 'macho');
    writeFileSync(path, Buffer.from([0xcf, 0xfa, 0xed, 0xfe, 0x0c, 0x00]));
    chmodSync(path, 0o755);
    expect((await checkAgentBinary(path)).answer).toBe('ok');
  });

  it('answers ok for a zero byte file', async () => {
    expect((await checkAgentBinary(shim(''))).answer).toBe('ok');
  });

  it('answers ok for a one byte file', async () => {
    expect((await checkAgentBinary(shim('#'))).answer).toBe('ok');
  });
});

describe('the runtime detail on an ok answer (Phase 49)', () => {
  it('reports a non-script as a binary', async () => {
    const path = join(root, 'macho-runtime');
    writeFileSync(path, Buffer.from([0xcf, 0xfa, 0xed, 0xfe, 0x0c, 0x00]));
    chmodSync(path, 0o755);
    const health = await checkAgentBinary(path);
    expect(health.answer).toBe('ok');
    if (health.answer !== 'ok') return;
    expect(health.runtime).toEqual({ kind: 'binary' });
  });

  it('reports a script with its interpreter and the resolved path', async () => {
    const health = await checkAgentBinary(shim('#!/usr/bin/env node\n'));
    expect(health.answer).toBe('ok');
    if (health.answer !== 'ok') return;
    expect(health.runtime).toEqual({
      kind: 'script',
      interpreter: 'node',
      interpreterPath: join(withNode, 'node')
    });
  });

  it('carries the runtime through a cache hit', async () => {
    const path = shim('#!/usr/bin/env node\n');
    await checkAgentBinary(path);
    const second = await checkAgentBinary(path);
    expect(second.answer).toBe('ok');
    if (second.answer !== 'ok') return;
    expect(second.runtime.kind).toBe('script');
  });
});

describe('checkAgentBinary, the scripts', () => {
  it('answers ok for #!/bin/sh', async () => {
    expect((await checkAgentBinary(shim('#!/bin/sh\necho hi\n'))).answer).toBe(
      'ok'
    );
  });

  it('answers ok when env node resolves on the supplied PATH', async () => {
    const health = await checkAgentBinary(shim('#!/usr/bin/env node\n'));
    expect(health.answer).toBe('ok');
  });

  it('answers interpreter-missing when node is not on the PATH', async () => {
    userPath = withoutNode;
    const health = await checkAgentBinary(shim('#!/usr/bin/env node\n'));
    expect(health.answer).toBe('interpreter-missing');
    if (health.answer !== 'interpreter-missing') return;
    expect(health.interpreter).toBe('node');
    expect(health.shebang).toBe('#!/usr/bin/env node');
  });

  it('names node under env -S and under an env assignment', async () => {
    userPath = withoutNode;
    const dashS = await checkAgentBinary(
      shim('#!/usr/bin/env -S node --enable-source-maps\n')
    );
    const assigned = await checkAgentBinary(shim('#!/usr/bin/env FOO=1 node\n'));
    expect(dashS.answer === 'interpreter-missing' && dashS.interpreter).toBe(
      'node'
    );
    expect(
      assigned.answer === 'interpreter-missing' && assigned.interpreter
    ).toBe('node');
  });

  it('answers unknown for env with no program', async () => {
    const health = await checkAgentBinary(shim('#!/usr/bin/env\n'));
    expect(health.answer).toBe('unknown');
  });

  it('answers interpreter-missing for an absolute interpreter that is gone', async () => {
    // An absolute path INSIDE the scratch root, so the case does not depend
    // on whether this machine happens to have /usr/local/bin/node.
    const gone = join(root, 'no-such-dir', 'node');
    const health = await checkAgentBinary(shim(`#!${gone}\n`));
    expect(health.answer).toBe('interpreter-missing');
    if (health.answer !== 'interpreter-missing') return;
    expect(health.interpreter).toBe(gone);
  });

  it('does not produce an interpreter named node\\r', async () => {
    userPath = withoutNode;
    const health = await checkAgentBinary(shim('#!/usr/bin/env node\r\n'));
    expect(health.answer).toBe('interpreter-missing');
    if (health.answer !== 'interpreter-missing') return;
    expect(health.interpreter).toBe('node');
    expect(health.shebang.endsWith('node')).toBe(true);
  });

  it('answers unknown for a first line over 1024 bytes with no newline', async () => {
    const health = await checkAgentBinary(shim(`#!${'a'.repeat(2000)}`));
    expect(health.answer).toBe('unknown');
    if (health.answer !== 'unknown') return;
    expect(health.reason).toBe('first line over 1024 bytes');
  });

  it('caps the shebang it reports at 200 characters', async () => {
    userPath = withoutNode;
    const health = await checkAgentBinary(
      shim(`#!/usr/bin/env ${'n'.repeat(400)}\n`)
    );
    expect(health.answer).toBe('interpreter-missing');
    if (health.answer !== 'interpreter-missing') return;
    expect(health.shebang.length).toBe(200);
  });

  /**
   * PHASE 48 FIX ROUND. Two shapes that used to BLOCK a launch and had no
   * business doing so. Both now answer `unknown`, which launches.
   */
  it('answers unknown for a first line that is not printable ASCII', async () => {
    userPath = withoutNode;
    // Nine bytes: the two shebang bytes, six unprintable ones and a newline.
    // Not a script, and the old parser read the six bytes as a program name
    // and refused the launch while showing the person mojibake.
    const path = join(root, 'accidental-shebang');
    writeFileSync(
      path,
      Buffer.from([0x23, 0x21, 0x01, 0x02, 0x03, 0xfe, 0xff, 0x7f, 0x0a])
    );
    chmodSync(path, 0o755);
    const health = await checkAgentBinary(path);
    expect(health.answer).toBe('unknown');
    if (health.answer !== 'unknown') return;
    expect(health.reason).toBe('first line is not printable ASCII');
  });

  it('answers unknown for a relative interpreter path', async () => {
    userPath = withoutNode;
    for (const line of ['#!./node\n', '#!bin/node\n']) {
      const health = await checkAgentBinary(shim(line));
      expect(health.answer).toBe('unknown');
      if (health.answer !== 'unknown') continue;
      expect(health.reason).toBe('relative interpreter path');
    }
  });
});

/**
 * PHASE 48 FIX ROUND. The cached answer used to carry the FIRST caller's
 * `binPath`, because the key is the real path and two names share one entry.
 * The state B sheet prints that path, so the person was sent to a file they
 * had not asked about.
 */
describe('a cached answer names the file the caller asked about', () => {
  it('reports the symlink the second caller passed, not its target', async () => {
    userPath = withoutNode;
    const target = shim('#!/usr/bin/env node\n');
    const link = join(root, `link-${++seq}`);
    symlinkSync(target, link);

    const first = await checkAgentBinary(target);
    expect(first.answer).toBe('interpreter-missing');
    if (first.answer !== 'interpreter-missing') return;
    expect(first.binPath).toBe(target);

    const second = await checkAgentBinary(link);
    expect(second.answer).toBe('interpreter-missing');
    if (second.answer !== 'interpreter-missing') return;
    expect(second.binPath).toBe(link);
    // One entry, so the second answer really did come off the map.
    expect(agentHealthCacheSize()).toBe(1);
  });
});

describe('checkAgentBinary fails open', () => {
  it('answers unknown for a path that does not exist, and does not throw', async () => {
    const health = await checkAgentBinary(join(root, 'nothing-here'));
    expect(health.answer).toBe('unknown');
  });

  it('answers unknown for a directory', async () => {
    const health = await checkAgentBinary(withNode);
    expect(health.answer).toBe('unknown');
  });

  it('never blocks: only interpreter-missing is the blocking answer', async () => {
    const answers = await Promise.all([
      checkAgentBinary(join(root, 'nothing-here')),
      checkAgentBinary(shim('#!/usr/bin/env\n')),
      checkAgentBinary(shim(`#!${'a'.repeat(2000)}`))
    ]);
    for (const health of answers) {
      expect(health.answer).toBe('unknown');
      expect(health.elapsedMs).toBeLessThan(AGENT_HEALTH_TIMEOUT_MS);
    }
  });
});

/**
 * PHASE 48 FIX ROUND. The hang this module introduced, and the gate.
 *
 * The 250 ms timer releases the caller. It cannot cancel the `open` the caller
 * left behind, so a file whose open blocks costs one libuv threadpool thread
 * for the life of the process. Four threads is the default, and a verifier
 * measured the pool running out: at `UV_THREADPOOL_SIZE=2` one of four creates
 * came back, at the default four three of four came back, and after that every
 * filesystem operation in main stopped and the app could not quit.
 *
 * A FIFO is a real file whose `open` for reading blocks until somebody opens
 * the write end, which is the same shape as the unresponsive network mount the
 * module's own comment names. The writer at the end of the test releases the
 * stranded thread, which is also how the count is proved to come back down.
 */
describe('the stranded inspection gate', () => {
  it('opens nothing while an earlier check has not returned', async () => {
    const fifo = join(root, `fifo-${++seq}`);
    execFileSync('mkfifo', [fifo]);
    let writer: number | undefined;
    try {
      expect(agentHealthStrandedCount()).toBe(0);

      // The open blocks. The timer answers instead, and the read is stranded.
      const first = await checkAgentBinary(fifo);
      expect(first.answer).toBe('unknown');
      expect(agentHealthStrandedCount()).toBe(1);

      // The gate is now closed. A second check against the same file opens
      // NOTHING, so it answers immediately rather than after another 250 ms,
      // and no second thread is taken.
      const startedAt = performance.now();
      const second = await checkAgentBinary(fifo);
      const waited = performance.now() - startedAt;
      expect(second.answer).toBe('unknown');
      if (second.answer !== 'unknown') return;
      expect(second.reason).toBe('an earlier check has not returned');
      expect(waited).toBeLessThan(AGENT_HEALTH_TIMEOUT_MS / 2);
      expect(agentHealthStrandedCount()).toBe(1);

      // A healthy file is refused the same way while the gate is closed. That
      // is the cost of the gate and it is the fail-open answer, so nothing is
      // blocked by it.
      const healthy = await checkAgentBinary(shim('#!/usr/bin/env node\n'));
      expect(healthy.answer).toBe('unknown');
    } finally {
      // Release the blocked read. openSync for writing unblocks the reader.
      writer = openSync(fifo, 'w');
    }

    // The thread comes back, and the count comes back with it.
    await vi.waitFor(() => {
      expect(agentHealthStrandedCount()).toBe(0);
    });
    closeSync(writer);

    // The gate is open again, and a real file is answered again.
    const after = await checkAgentBinary(shim('#!/usr/bin/env node\n'));
    expect(after.answer).toBe('ok');
  });
});

describe('the cache', () => {
  /**
   * The proof that the second call did not read the file is not a stopwatch.
   * The PATH the check judges against is swapped between the two calls without
   * moving the epoch, so a second call that resolved the interpreter again
   * would answer differently. One that reads the map cannot.
   */
  it('answers from the map while the file and the epoch hold', async () => {
    const path = shim('#!/usr/bin/env node\n');

    const first = await checkAgentBinary(path);
    expect(first.answer).toBe('ok');
    expect(agentHealthCacheSize()).toBe(1);

    // node is no longer reachable, and the epoch has NOT moved, so the key is
    // unchanged and the entry must still answer.
    userPath = withoutNode;

    const second = await checkAgentBinary(path);
    expect(second.answer).toBe('ok');
    expect(second.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(agentHealthCacheSize()).toBe(1);
  });

  /**
   * PHASE 48 FIX ROUND. The upgrade that used to be invisible.
   *
   * The key was the real path, the mtime, the size and the epoch. `cp -p`,
   * `rsync --times` and `tar -p` all replace a file in place and put its mtime
   * back, and a shim that is replaced by another shim of the same length moves
   * none of those four. The first answer was then served for the life of the
   * process, so a fixed install stayed blocked. `ctimeMs` is what catches it,
   * because macOS updates the change time on any write to the file.
   */
  it('re-answers after an in place upgrade that preserves size and mtime', async () => {
    // A whole millisecond, set explicitly both times, so the two stats agree
    // exactly. Restoring a mtime read back off the disk does not round trip:
    // the filesystem keeps nanoseconds and `mtimeMs` is a float.
    const pinned = new Date(1_700_000_000_000);
    const path = shim('#!/usr/bin/env zzzz\n');
    utimesSync(path, pinned, pinned);

    const first = await checkAgentBinary(path);
    expect(first.answer).toBe('interpreter-missing');

    const swapped = '#!/usr/bin/env node\n';
    expect(swapped.length).toBe(readFileSync(path, 'utf8').length);
    writeFileSync(path, swapped);
    utimesSync(path, pinned, pinned);
    expect(statSync(path).mtimeMs).toBe(pinned.getTime());

    const second = await checkAgentBinary(path);
    expect(second.answer).toBe('ok');
  });

  it('re-answers once the file has been touched', async () => {
    const path = shim('#!/usr/bin/env node\n');
    expect((await checkAgentBinary(path)).answer).toBe('ok');

    writeFileSync(path, '#!/usr/bin/env zzzz\n');
    const later = new Date(Date.now() + 5000);
    utimesSync(path, later, later);

    const health = await checkAgentBinary(path);
    expect(health.answer).toBe('interpreter-missing');
    if (health.answer !== 'interpreter-missing') return;
    expect(health.interpreter).toBe('zzzz');
  });

  it('re-answers when the PATH epoch moves', async () => {
    const path = shim('#!/usr/bin/env node\n');
    expect((await checkAgentBinary(path)).answer).toBe('ok');
    // The file is untouched. The PATH it was judged against is not.
    userPath = withoutNode;
    epoch = 2;
    expect((await checkAgentBinary(path)).answer).toBe('interpreter-missing');
  });

  it('does not cache unknown', async () => {
    await checkAgentBinary(shim('#!/usr/bin/env\n'));
    expect(agentHealthCacheSize()).toBe(0);
  });

  it('clears whole on the 65th entry', async () => {
    for (let i = 0; i < 64; i++) {
      await checkAgentBinary(shim(`#!/bin/sh\n# ${i}\n`));
    }
    expect(agentHealthCacheSize()).toBe(64);
    await checkAgentBinary(shim('#!/bin/sh\n# one more\n'));
    expect(agentHealthCacheSize()).toBe(1);
  });
});

describe('the module spawns nothing', () => {
  it('imports no process API at all', () => {
    const src = readFileSync(
      new URL('../health.ts', import.meta.url),
      'utf8'
    );
    expect(src).not.toMatch(/child_process/);
    expect(src).not.toMatch(/\bspawn\b/);
    expect(src).not.toMatch(/\bexecFile\b/);
  });
});
