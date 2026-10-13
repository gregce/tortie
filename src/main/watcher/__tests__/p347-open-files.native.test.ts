/**
 * Phase 347 (issue 33), the native lane: the SHIPPING open file watch over a
 * scratch repository, the SHIPPING `RepoWatcher` (real FSEvents through
 * @parcel/watcher) for the plan, and the real descriptor arm, identity read and
 * two-phase wait. N1 to N8 of build/p347/SPEC.md §5.3.
 *
 * Check type: adapter integration test, native watcher lane (Phase 145 stage
 * 5). Environment requirement: macOS's kqueue file watch through node:fs,
 * FSEvents through the installed binding, `git`, `/usr/bin/mkfifo` and `node`.
 * Git runs hermetic (a scratch HOME and XDG_CONFIG_HOME, no global or system
 * config); the one child process, N8's writer, is `node -e` with a scratch HOME
 * and ZDOTDIR, HISTFILE=/dev/null and no TERM_SESSION_ID, and it is killed in a
 * `finally`. Every scratch directory is removed in `afterAll`. Skip rule: none.
 */

import { execFileSync, spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import {
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { canonicalPathSync } from '../../fs/folder-identity';
import { RepoWatcher } from '../repo-watcher';
import {
  OPEN_FILE_WATCH_CAP,
  afterKernelSees,
  armFileByDescriptor,
  createOpenFileWatches,
  fileIdentity,
  type OpenFileWatchDeps,
  type OpenFileWatches
} from '../open-files';

const ENV_KEYS = ['HOME', 'XDG_CONFIG_HOME', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM'] as const;
const savedEnv = new Map<string, string | undefined>();
let scratch = '';
let home = '';
let repo = '';
let outside = '';
let rw: RepoWatcher | null = null;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function waitFor(pred: () => boolean, ms = 2_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (pred()) return true;
    await sleep(10);
  }
  return pred();
}

function scratchEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, ZDOTDIR: home, HISTFILE: '/dev/null' };
  delete env['TERM_SESSION_ID'];
  return env;
}

const inRepo = (rel: string): string => join(repo, ...rel.split('/'));

function write(rel: string, body: string): string {
  const abs = inRepo(rel);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, body);
  return abs;
}

/** Replace a file the way the guarded write does: a sibling written, then renamed over it. */
function renameOver(abs: string, body: string): void {
  const tmp = `${abs}.p347-tmp-${String(Math.random()).slice(2)}`;
  writeFileSync(tmp, body);
  renameSync(tmp, abs);
}

/** The `dev:ino` of every descriptor this process holds. */
function heldIdentities(): Set<string> {
  const out = new Set<string>();
  for (const name of readdirSync('/dev/fd')) {
    try {
      const st = fstatSync(Number(name), { bigint: true });
      out.add(`${String(st.dev)}:${String(st.ino)}`);
    } catch {
      // The directory handle the listing itself used is gone by now.
    }
  }
  return out;
}

function identityKey(abs: string): string {
  const st = lstatSync(abs, { bigint: true });
  return `${String(st.dev)}:${String(st.ino)}`;
}

const fdCount = (): number => readdirSync('/dev/fd').length;

interface Rig {
  watches: OpenFileWatches;
  sent: Array<{ repo: string; at: number }>;
  armed: string[];
  live: Map<string, { ino: bigint; closed: boolean }>;
}

/** The production seams, recorded. `over` swaps one of them for a test. */
function rig(over: Partial<OpenFileWatchDeps> = {}): Rig {
  const sent: Rig['sent'] = [];
  const armed: string[] = [];
  const live: Rig['live'] = new Map();
  const deps: OpenFileWatchDeps = {
    planFor: () => Promise.resolve(rw),
    canonical: (p) => {
      try {
        return canonicalPathSync(p);
      } catch {
        return null;
      }
    },
    armFile: (c, onEvent) => {
      const h = armFileByDescriptor(c, onEvent);
      if (h === null) return null;
      armed.push(c);
      const rec = { ino: h.ino, closed: false };
      live.set(c, rec);
      return {
        dev: h.dev,
        ino: h.ino,
        close: () => {
          rec.closed = true;
          h.close();
        }
      };
    },
    identity: fileIdentity,
    afterKernelSees,
    setTimeout: (fn, ms) => {
      const t = setTimeout(fn, ms);
      return { clear: () => clearTimeout(t) };
    },
    send: (_id, r) => sent.push({ repo: r, at: Date.now() }),
    env: () => ({}),
    log: () => undefined,
    ...over
  };
  return { watches: createOpenFileWatches(deps), sent, armed, live };
}

/** The live watch on `abs` is on the inode the path names now. */
function onPathsInode(r: Rig, abs: string): boolean {
  const c = canonicalPathSync(abs);
  const rec = r.live.get(c);
  if (rec === undefined || rec.closed) return false;
  return rec.ino === lstatSync(c, { bigint: true }).ino;
}

const entryFor = (abs: string) => ({ repoPath: repo, path: abs });

beforeAll(async () => {
  scratch = mkdtempSync(join(tmpdir(), 'gmux-p347-native-'));
  home = join(scratch, 'home');
  mkdirSync(home);
  for (const k of ENV_KEYS) savedEnv.set(k, process.env[k]);
  process.env['HOME'] = home;
  process.env['XDG_CONFIG_HOME'] = join(home, '.config');
  process.env['GIT_CONFIG_GLOBAL'] = '/dev/null';
  process.env['GIT_CONFIG_NOSYSTEM'] = '1';

  repo = join(scratch, 'repo');
  mkdirSync(repo);
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: repo, env: scratchEnv(), stdio: 'ignore' });
  writeFileSync(join(repo, '.gitignore'), 'notes/\n*.log\n');
  write('notes/a.md', 'a0');
  write('src/x.md', 'x0');
  write('debug.log', 'l0');
  outside = join(scratch, 'outside');
  mkdirSync(outside);
  writeFileSync(join(outside, 'secret.txt'), 's0');
  rw = await RepoWatcher.watch(repo, { onChange: () => undefined });
  // Ignored only AFTER the watcher started: the bus still sees it (§2.3).
  writeFileSync(join(repo, '.gitignore'), 'notes/\n*.log\nlater/\n');
  write('later/b.md', 'b0');
});

afterAll(async () => {
  await rw?.dispose();
  for (const [k, v] of savedEnv) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  rmSync(scratch, { recursive: true, force: true });
});

describe('Phase 347 open file watch over real files (native lane)', () => {
  it('N1: only the file the running plan excludes is armed', async () => {
    const r = rig();
    try {
      const res = await r.watches.declare(1, [
        entryFor(inRepo('notes/a.md')),
        entryFor(inRepo('src/x.md')),
        entryFor(inRepo('debug.log')),
        entryFor(inRepo('later/b.md'))
      ]);
      expect(res).toEqual({ watched: 1 });
      expect(r.armed).toEqual([canonicalPathSync(inRepo('notes/a.md'))]);
    } finally {
      r.watches.dispose();
    }
  });

  it('N2: an in-place write, a rename-over and an unlink then recreate each end in a notice, and the watch survives the rename-over', { timeout: 30_000 }, async () => {
    const abs = write('notes/n2.md', 'start');
    const r = rig();
    try {
      await r.watches.declare(1, [entryFor(abs)]);
      await sleep(400);
      const notice = async (act: () => void): Promise<boolean> => {
        const before = r.sent.length;
        act();
        const ok = await waitFor(() => r.sent.length > before);
        await sleep(400);
        return ok;
      };
      expect(await notice(() => writeFileSync(abs, 'in place 1'))).toBe(true);
      expect(await notice(() => renameOver(abs, 'renamed over'))).toBe(true);
      expect(onPathsInode(r, abs)).toBe(true);
      expect(await notice(() => writeFileSync(abs, 'in place after the rename-over'))).toBe(true);
      expect(
        await notice(() => {
          unlinkSync(abs);
          writeFileSync(abs, 'recreated');
        })
      ).toBe(true);
      expect(await notice(() => writeFileSync(abs, 'in place after the recreate'))).toBe(true);
      expect(r.sent.every((s) => s.repo === repo)).toBe(true);
    } finally {
      r.watches.dispose();
    }
  });

  it('N3: 800 files written beside the armed file send no notice', { timeout: 30_000 }, async () => {
    const abs = write('notes/n3.md', 'n3');
    const r = rig();
    try {
      await r.watches.declare(1, [entryFor(abs)]);
      await sleep(400);
      const before = r.sent.length;
      for (let i = 0; i < 800; i++) writeFileSync(inRepo(`notes/churn-${String(i)}.txt`), String(i));
      await sleep(1_000);
      expect(r.sent.length).toBe(before);
    } finally {
      r.watches.dispose();
    }
  });

  it('N4: a FIFO declared as a tab path is refused at once and holds no descriptor', async () => {
    const fifo = inRepo('notes/pipe');
    execFileSync('/usr/bin/mkfifo', [fifo], { env: scratchEnv() });
    const r = rig();
    try {
      const started = Date.now();
      const res = await r.watches.declare(1, [entryFor(fifo)]);
      expect(Date.now() - started).toBeLessThan(1_000);
      expect(res).toEqual({ watched: 0 });
      expect(heldIdentities().has(identityKey(fifo))).toBe(false);
    } finally {
      r.watches.dispose();
    }
  });

  it('N5: a link in the ignored folder to a file outside the repository is not armed', async () => {
    const link = inRepo('notes/to-outside.md');
    symlinkSync(join(outside, 'secret.txt'), link);
    const r = rig();
    try {
      expect(await r.watches.declare(1, [entryFor(link)])).toEqual({ watched: 0 });
      expect(r.armed).toEqual([]);
      expect(heldIdentities().has(identityKey(join(outside, 'secret.txt')))).toBe(false);
    } finally {
      r.watches.dispose();
    }
  });

  it('N5b: THE LINK SWAP: a watched file replaced by a link to outside sends one notice, goes dormant, holds nothing outside', { timeout: 30_000 }, async () => {
    const abs = write('notes/c.md', 'c0');
    const secret = join(outside, 'secret.txt');
    const r = rig();
    try {
      expect(await r.watches.declare(1, [entryFor(abs)])).toEqual({ watched: 1 });
      await sleep(400);
      const before = r.sent.length;
      const swap = inRepo('notes/.swap-link');
      symlinkSync(secret, swap);
      renameSync(swap, abs);
      expect(await waitFor(() => r.sent.length > before)).toBe(true);
      await sleep(400);
      expect(r.sent.length).toBe(before + 1);
      expect(r.watches.counts()).toEqual({ armed: 0, dormant: 1, capped: 0 });
      expect(r.armed).not.toContain(canonicalPathSync(secret));
      expect(heldIdentities().has(identityKey(secret))).toBe(false);
      writeFileSync(secret, 's1');
      await sleep(400);
      writeFileSync(secret, 's2');
      await sleep(800);
      expect(r.sent.length).toBe(before + 1);
    } finally {
      r.watches.dispose();
    }
  });

  it('N5c: a folder of the path swapped for a link to an outside copy between G1 and G3 is refused at G4 and holds nothing', async () => {
    const abs = write('notes/sub/d.md', 'd0');
    const copy = join(scratch, 'outside-sub');
    mkdirSync(copy);
    writeFileSync(join(copy, 'd.md'), 'outside copy');
    let swapped = false;
    const r = rig({
      canonical: (p) => {
        let c: string | null;
        try {
          c = canonicalPathSync(p);
        } catch {
          c = null;
        }
        if (!swapped && p === abs) {
          // After G1 read the path, before G3 opens it.
          swapped = true;
          renameSync(inRepo('notes/sub'), inRepo('notes/sub-old'));
          symlinkSync(copy, inRepo('notes/sub'));
        }
        return c;
      }
    });
    try {
      expect(await r.watches.declare(1, [entryFor(abs)])).toEqual({ watched: 0 });
      expect(swapped).toBe(true);
      expect(r.watches.counts()).toEqual({ armed: 0, dormant: 1, capped: 0 });
      // G3 opened it for that moment; G4 closed it unwatched.
      expect([...r.live.values()].every((h) => h.closed)).toBe(true);
      expect(heldIdentities().has(identityKey(join(copy, 'd.md')))).toBe(false);
    } finally {
      r.watches.dispose();
    }
  });

  it('N7a: a rename-over in the same synchronous turn as the first arm is caught by the check', { timeout: 30_000 }, async () => {
    const abs = write('notes/n7a.md', 'first');
    let inject = true;
    const r = rig({
      afterKernelSees: (fn) => {
        if (inject) {
          inject = false;
          renameOver(abs, 'replaced before the kernel held the watch');
        }
        afterKernelSees(fn);
      }
    });
    try {
      await r.watches.declare(1, [entryFor(abs)]);
      await sleep(100);
      expect(onPathsInode(r, abs)).toBe(true);
      await sleep(400);
      const before = r.sent.length;
      writeFileSync(abs, 'a later in-place write');
      expect(await waitFor(() => r.sent.length > before)).toBe(true);
    } finally {
      r.watches.dispose();
    }
  });

  /**
   * N7b: a rename-over, whose callback re-arms, followed by a second
   * rename-over queued in the first check phase AFTER the check's own first
   * `setImmediate`. Returns whether the watch ended on the path's inode and
   * whether a later in-place write was noticed.
   */
  async function reArmGap(wait: (fn: () => void) => void, name: string): Promise<{ onInode: boolean; noticed: boolean }> {
    const abs = write(`notes/${name}.md`, 'first');
    let injectNext = false;
    const r = rig({
      afterKernelSees: (fn) => {
        wait(fn);
        if (injectNext) {
          injectNext = false;
          setImmediate(() => renameOver(abs, 'replaced in the first check phase'));
        }
      }
    });
    try {
      await r.watches.declare(1, [entryFor(abs)]);
      await sleep(400);
      injectNext = true;
      renameOver(abs, 'replaced, so the callback re-arms');
      await waitFor(() => !injectNext);
      await sleep(100);
      const onInode = onPathsInode(r, abs);
      await sleep(400);
      const before = r.sent.length;
      writeFileSync(abs, 'a later in-place write');
      const noticed = await waitFor(() => r.sent.length > before, 800);
      return { onInode, noticed };
    } finally {
      r.watches.dispose();
    }
  }

  it('N7b: a re-arm inside a rename callback survives a rename-over in the first check phase after it; ONE check phase does not', { timeout: 30_000 }, async () => {
    expect(await reArmGap(afterKernelSees, 'n7b')).toEqual({ onInode: true, noticed: true });
    const one = await reArmGap((fn) => setImmediate(fn), 'n7b-one');
    expect(one).toEqual({ onInode: false, noticed: false });
  });

  it('N8: a separate writer renaming over the file twice, 0 and 1 ms apart, never leaves the watch off the file', { timeout: 90_000 }, async () => {
    const abs = write('notes/n8.md', 'start');
    const r = rig();
    let child: ChildProcessWithoutNullStreams | null = null;
    try {
      await r.watches.declare(1, [entryFor(abs)]);
      await sleep(400);
      const writer = [
        "const fs = require('node:fs');",
        'const target = process.argv[1];',
        "let buf = '';",
        "process.stdin.on('data', (d) => {",
        '  buf += d;',
        "  let nl;",
        "  while ((nl = buf.indexOf('\\n')) !== -1) {",
        '    const [gap, n] = buf.slice(0, nl).split(\' \').map(Number);',
        '    buf = buf.slice(nl + 1);',
        "    fs.writeFileSync(target + '.w1', 'pair ' + n + ' a');",
        "    fs.writeFileSync(target + '.w2', 'pair ' + n + ' b');",
        "    fs.renameSync(target + '.w1', target);",
        '    const end = performance.now() + gap;',
        '    while (performance.now() < end) {}',
        "    fs.renameSync(target + '.w2', target);",
        "    process.stdout.write('done ' + n + '\\n');",
        '  }',
        '});'
      ].join('\n');
      const proc = spawn(process.execPath, ['-e', writer, abs], { env: scratchEnv(), stdio: 'pipe' });
      child = proc;
      let out = '';
      proc.stdout.on('data', (d: Buffer) => {
        out += d.toString('utf8');
      });
      const offFile: string[] = [];
      let lastDone = 0;
      let n = 0;
      for (const gap of [0, 1]) {
        for (let i = 0; i < 100; i++, n++) {
          proc.stdin.write(`${String(gap)} ${String(n)}\n`);
          expect(await waitFor(() => out.includes(`done ${String(n)}\n`), 5_000)).toBe(true);
          lastDone = Date.now();
          await sleep(40);
          if (!onPathsInode(r, abs)) offFile.push(`${String(gap)}ms #${String(i)}`);
        }
      }
      expect(offFile).toEqual([]);
      // The last pair's second bytes are followed by a notice.
      expect(await waitFor(() => r.sent.some((s) => s.at >= lastDone))).toBe(true);
    } finally {
      // The writer is ended whatever happened: its stdin closed, then a
      // SIGTERM, then a SIGKILL, each only while it is still running.
      const c: ChildProcessWithoutNullStreams | null = child;
      if (c !== null) {
        const running = (): boolean => c.exitCode === null && c.signalCode === null;
        c.stdin.end();
        await waitFor(() => !running(), 1_000);
        if (running()) c.kill('SIGTERM');
        await waitFor(() => !running(), 2_000);
        if (running()) c.kill('SIGKILL');
      }
      r.watches.dispose();
    }
  });

  it('N6: 1,000 declared files raise the descriptor count by exactly the cap, and dispose gives every one back', { timeout: 60_000 }, async () => {
    const files: string[] = [];
    for (let i = 0; i < 1_000; i++) files.push(write(`notes/many/f${String(i)}.md`, String(i)));
    const r = rig();
    const before = fdCount();
    try {
      await r.watches.declare(1, files.slice(0, 500).map(entryFor));
      await r.watches.declare(2, files.slice(500).map(entryFor));
      expect(r.watches.counts()).toEqual({ armed: OPEN_FILE_WATCH_CAP, dormant: 0, capped: 1_000 - OPEN_FILE_WATCH_CAP });
      expect(fdCount() - before).toBe(OPEN_FILE_WATCH_CAP);
    } finally {
      r.watches.dispose();
    }
    await sleep(50);
    expect(fdCount()).toBe(before);
  });
});
