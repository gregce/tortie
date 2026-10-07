/**
 * Phase 343 — what a link in a listing points at, and the bound on asking.
 *
 * The four answers are read over a REAL scratch tree with the real `stat`
 * (a FIFO made with `/usr/bin/mkfifo`, a link whose target is gone, a link to
 * itself, a link into a folder the account cannot enter, a path through a
 * file). The bound (build/p343/SPEC.md D3, `health.ts`'s answer) is driven
 * with an injected `stat` that answers when the test says so, and, where the
 * rule is "at once", with a clock the test holds still, so a listing that
 * waited for the clock instead of returning never returns and the case reads
 * red rather than slow.
 *
 * Nothing here starts a shell. The one program it runs is `mkfifo`, with an
 * environment built from nothing (a scratch HOME and ZDOTDIR,
 * `HISTFILE=/dev/null`, a fixed PATH, no `TERM_SESSION_ID`). The scratch tree
 * is removed in `afterAll`.
 */

import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FsDirEntry, FsLinkTarget } from '@shared/types';
import {
  LINK_STAT_LANES,
  LINK_STAT_WAIT_MS,
  createLinkTargets,
  entriesOf,
  linkTargetsOf,
  targetOf,
  type LinkStat,
  type LinkTimer
} from '../link-target';

let scratch = '';
let tree = '';

beforeAll(() => {
  scratch = realpathSync(mkdtempSync(join(tmpdir(), 'p343-link-')));
  const home = join(scratch, 'home');
  mkdirSync(home);
  tree = join(scratch, 'tree');
  mkdirSync(join(tree, 'real', 'inner'), { recursive: true });
  mkdirSync(join(tree, 'locked', 'inner'), { recursive: true });
  writeFileSync(join(tree, 'plain.txt'), 'plain\n');
  execFileSync('/usr/bin/mkfifo', [join(tree, 'pipe')], {
    env: { PATH: '/usr/bin:/bin', HOME: home, ZDOTDIR: home, HISTFILE: '/dev/null' }
  });
  symlinkSync('real', join(tree, 'toDir'));
  symlinkSync('plain.txt', join(tree, 'toFile'));
  symlinkSync('pipe', join(tree, 'toPipe'));
  symlinkSync('nothing-here', join(tree, 'dangling'));
  symlinkSync('self', join(tree, 'self'));
  symlinkSync('locked/inner', join(tree, 'toLocked'));
  symlinkSync('plain.txt/x', join(tree, 'throughFile'));
  chmodSync(join(tree, 'locked'), 0o000);
});

afterAll(() => {
  if (scratch.length === 0) return;
  try {
    chmodSync(join(tree, 'locked'), 0o700);
  } catch {
    // Already gone or never made.
  }
  rmSync(scratch, { recursive: true, force: true });
});

/** The kind `fs:readDir`'s `entryKind` gives, in its own order. */
function kindOf(d: {
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
  isFile(): boolean;
}): FsDirEntry['kind'] {
  if (d.isDirectory()) return 'dir';
  if (d.isSymbolicLink()) return 'symlink';
  if (d.isFile()) return 'file';
  return 'other';
}

function kindsIn(dir: string): { name: string; kind: FsDirEntry['kind'] }[] {
  return readdirSync(dir, { withFileTypes: true }).map((d) => ({
    name: d.name,
    kind: kindOf(d)
  }));
}

/** A clock that never fires until the test fires it. */
function heldClock(): { timer: LinkTimer; fire(): void; pending(): number } {
  const waiting: Array<() => void> = [];
  return {
    timer: {
      set: (fire) => {
        waiting.push(fire);
        return waiting.length;
      },
      clear: () => undefined
    },
    fire: () => {
      for (const fire of waiting.splice(0)) fire();
    },
    pending: () => waiting.length
  };
}

const AS_DIR: LinkStat = { isDirectory: () => true, isFile: () => false };
const AS_FILE: LinkStat = { isDirectory: () => false, isFile: () => true };

/**
 * A stat the test answers by hand. Records every path asked, and the most
 * asks outstanding at once.
 */
function handStat(): {
  stat(path: string): Promise<LinkStat>;
  asked: string[];
  most(): number;
  answer(path: string, value?: LinkStat): void;
} {
  const asked: string[] = [];
  const open = new Map<string, (value: LinkStat) => void>();
  let now = 0;
  let most = 0;
  return {
    stat(path) {
      asked.push(path);
      now += 1;
      most = Math.max(most, now);
      return new Promise<LinkStat>((resolveStat) => {
        open.set(path, resolveStat);
      }).finally(() => {
        now -= 1;
      });
    },
    asked,
    most: () => most,
    answer(path, value = AS_DIR) {
      const resolveStat = open.get(path);
      if (resolveStat === undefined) throw new Error(`nothing asked ${path}`);
      open.delete(path);
      resolveStat(value);
    }
  };
}

/** Let every queued promise callback and one turn of the loop run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await new Promise<void>((done) => setImmediate(done));
  }
}

/** Whether a promise has settled after the loop has had a few turns. */
async function settledYet(promise: Promise<unknown>): Promise<boolean> {
  let yes = false;
  void promise.then(
    () => {
      yes = true;
    },
    () => {
      yes = true;
    }
  );
  await settle();
  return yes;
}

describe('the four answers, over a real tree with the real stat', () => {
  it('reads a folder, a file, a FIFO and every kind of failure', async () => {
    const answers = await createLinkTargets({ stat })(tree, [
      'toDir',
      'toFile',
      'toPipe',
      'dangling',
      'self',
      'toLocked',
      'throughFile'
    ]);
    expect(Object.fromEntries(answers)).toEqual({
      toDir: 'dir',
      toFile: 'file',
      toPipe: 'other',
      dangling: 'none',
      self: 'none',
      toLocked: 'none',
      throughFile: 'none'
    });
  });

  it('the production lane is the real stat', async () => {
    const answers = await linkTargetsOf(tree, ['toDir', 'toFile', 'toPipe', 'dangling']);
    expect(Object.fromEntries(answers)).toEqual({
      toDir: 'dir',
      toFile: 'file',
      toPipe: 'other',
      dangling: 'none'
    });
  });

  it('reads a stat that is neither a folder nor a file as other', () => {
    expect(targetOf(AS_DIR)).toBe('dir');
    expect(targetOf(AS_FILE)).toBe('file');
    expect(targetOf({ isDirectory: () => false, isFile: () => false })).toBe('other');
  });
});

describe('entriesOf: the field is added and kind never moves', () => {
  it('keeps every link a symlink and adds what it points at', async () => {
    const kinds = kindsIn(tree);
    const links = await createLinkTargets({ stat })(
      tree,
      kinds.filter((k) => k.kind === 'symlink').map((k) => k.name)
    );
    const entries = entriesOf(tree, kinds, links);
    const byName = new Map(entries.map((e) => [e.name, e]));
    expect(byName.get('toDir')).toStrictEqual({
      name: 'toDir',
      path: `${tree}/toDir`,
      kind: 'symlink',
      link: 'dir'
    });
    expect(byName.get('toFile')).toStrictEqual({
      name: 'toFile',
      path: `${tree}/toFile`,
      kind: 'symlink',
      link: 'file'
    });
    expect(byName.get('toPipe')?.kind).toBe('symlink');
    expect(byName.get('toPipe')?.link).toBe('other');
    expect(byName.get('self')?.link).toBe('none');
    // What is not a link is exactly what it was, with no field at all.
    expect(byName.get('real')).toStrictEqual({
      name: 'real',
      path: `${tree}/real`,
      kind: 'dir'
    });
    expect(byName.get('plain.txt')).toStrictEqual({
      name: 'plain.txt',
      path: `${tree}/plain.txt`,
      kind: 'file'
    });
    expect(byName.get('pipe')).toStrictEqual({
      name: 'pipe',
      path: `${tree}/pipe`,
      kind: 'other'
    });
    for (const entry of entries) {
      if (entry.kind === 'symlink') expect(entry.link).toBeDefined();
    }
  });

  it('never puts the field on an entry that is not a link, whatever the map says', () => {
    const answered = new Map<string, FsLinkTarget>([
      ['real', 'dir'],
      ['plain.txt', 'file'],
      ['toDir', 'dir']
    ]);
    const entries = entriesOf(
      '/p',
      [
        { name: 'real', kind: 'dir' },
        { name: 'plain.txt', kind: 'file' },
        { name: 'toDir', kind: 'symlink' }
      ],
      answered
    );
    expect(entries).toStrictEqual([
      { name: 'real', path: '/p/real', kind: 'dir' },
      { name: 'plain.txt', path: '/p/plain.txt', kind: 'file' },
      { name: 'toDir', path: '/p/toDir', kind: 'symlink', link: 'dir' }
    ]);
  });

  it('leaves a link that did not answer with NO field, which is today', () => {
    const entries = entriesOf('/p', [{ name: 'slow', kind: 'symlink' }], new Map());
    expect(entries).toStrictEqual([{ name: 'slow', path: '/p/slow', kind: 'symlink' }]);
    expect('link' in (entries[0] ?? {})).toBe(false);
  });
});

describe('the bound: one lane, a wait, and one stranded stat closes the gate', () => {
  it('waits health.ts\'s 250 ms on one lane', () => {
    expect(LINK_STAT_WAIT_MS).toBe(250);
    expect(LINK_STAT_LANES).toBe(1);
  });

  it(
    'a stat that never answers: the listing returns within the wait plus 100 ms, ' +
      'a second listing with a different link stats nothing and returns at once, ' +
      'and once the stat answers a third listing stats again',
    async () => {
      const hand = handStat();
      const ask = createLinkTargets({ stat: hand.stat });

      const began = performance.now();
      const first = await ask('/a', ['hung']);
      const took = performance.now() - began;
      expect(first.size).toBe(0);
      expect(took).toBeLessThan(LINK_STAT_WAIT_MS + 100);
      expect(hand.asked).toEqual(['/a/hung']);

      const second = ask('/b', ['other']);
      expect(await settledYet(second)).toBe(true);
      expect((await second).size).toBe(0);
      expect(hand.asked).toEqual(['/a/hung']);

      hand.answer('/a/hung');
      await settle();
      const third = ask('/c', ['again']);
      await settle();
      expect(hand.asked).toEqual(['/a/hung', '/c/again']);
      hand.answer('/c/again', AS_FILE);
      expect(Object.fromEntries(await third)).toEqual({ again: 'file' });
    },
    2_000
  );

  it('with the clock held still, a closed gate answers at once and asks nothing', async () => {
    const hand = handStat();
    const clock = heldClock();
    const ask = createLinkTargets({ stat: hand.stat, timer: clock.timer });

    const first = ask('/a', ['hung']);
    await settle();
    expect(await settledYet(first)).toBe(false);
    clock.fire();
    expect(await settledYet(first)).toBe(true);
    expect((await first).size).toBe(0);

    // The gate is closed: no clock is needed for this listing to return.
    const second = ask('/b', ['x', 'y']);
    expect(await settledYet(second)).toBe(true);
    expect((await second).size).toBe(0);
    expect(clock.pending()).toBe(0);
    expect(hand.asked).toEqual(['/a/hung']);
  });

  it('never has more than one stat in flight, over a folder of 50 links', async () => {
    const asked: string[] = [];
    let now = 0;
    let most = 0;
    const ask = createLinkTargets({
      waitMs: 60_000,
      stat: (path) => {
        asked.push(path);
        now += 1;
        most = Math.max(most, now);
        return new Promise<LinkStat>((done) => {
          setImmediate(() => done(path.endsWith('7') ? AS_FILE : AS_DIR));
        }).finally(() => {
          now -= 1;
        });
      }
    });
    const names = Array.from({ length: 50 }, (_, i) => `l${String(i)}`);
    const answers = await ask('/pnpm', names);
    expect(most).toBe(1);
    expect(asked).toHaveLength(50);
    expect(answers.size).toBe(50);
    expect(answers.get('l7')).toBe('file');
    expect(answers.get('l0')).toBe('dir');
  });

  it('the same link asked by two listings at once is statted once', async () => {
    const hand = handStat();
    const clock = heldClock();
    const ask = createLinkTargets({ stat: hand.stat, timer: clock.timer });
    const one = ask('/p', ['skills']);
    const two = ask('/p', ['skills']);
    await settle();
    hand.answer('/p/skills');
    await settle();
    expect(hand.asked).toEqual(['/p/skills']);
    expect(await settledYet(two)).toBe(true);
    expect(Object.fromEntries(await one)).toEqual({ skills: 'dir' });
    expect(Object.fromEntries(await two)).toEqual({ skills: 'dir' });
    expect(hand.asked).toEqual(['/p/skills']);
  });

  it('a folder with no links stats nothing', async () => {
    const hand = handStat();
    const clock = heldClock();
    const ask = createLinkTargets({ stat: hand.stat, timer: clock.timer });
    const answers = ask('/p', []);
    expect(await settledYet(answers)).toBe(true);
    expect((await answers).size).toBe(0);
    expect(hand.asked).toEqual([]);
    expect(clock.pending()).toBe(0);
  });

  it('a stat a listing gave up on before it started is never started', async () => {
    const hand = handStat();
    const clock = heldClock();
    const ask = createLinkTargets({ stat: hand.stat, timer: clock.timer });
    const listing = ask('/p', ['first', 'second']);
    await settle();
    expect(hand.asked).toEqual(['/p/first']);
    clock.fire();
    expect(await settledYet(listing)).toBe(true);
    expect((await listing).size).toBe(0);

    // The lane frees when `first` comes back, and `second` must not run then.
    hand.answer('/p/first');
    await settle();
    expect(hand.asked).toEqual(['/p/first']);

    // The gate is open again and the lane is empty.
    const later = ask('/p', ['third']);
    await settle();
    expect(hand.asked).toEqual(['/p/first', '/p/third']);
    hand.answer('/p/third', AS_FILE);
    expect(Object.fromEntries(await later)).toEqual({ third: 'file' });
  });

  it('a queued stat another listing still waits for is kept and answered', async () => {
    const hand = handStat();
    const clocks = [heldClock(), heldClock()];
    let which = 0;
    const ask = createLinkTargets({
      stat: hand.stat,
      timer: {
        set: (fire, ms) => clocks[which]!.timer.set(fire, ms),
        clear: () => undefined
      }
    });
    which = 0;
    const early = ask('/p', ['first', 'shared']);
    await settle();
    which = 1;
    const late = ask('/p', ['shared']);
    await settle();
    // The early listing gives up while `first` runs and `shared` waits.
    clocks[0]!.fire();
    expect(await settledYet(early)).toBe(true);
    expect((await early).size).toBe(0);
    hand.answer('/p/first');
    await settle();
    expect(hand.asked).toEqual(['/p/first', '/p/shared']);
    hand.answer('/p/shared');
    expect(Object.fromEntries(await late)).toEqual({ shared: 'dir' });
  });
});

describe('the wiring, read as text', () => {
  const read = (rel: string): string =>
    readFileSync(resolve(__dirname, '..', rel), 'utf8');

  it('fs:readDir stats the symlink entries through the lane and maps with entriesOf', () => {
    const ipc = read('ipc.ts');
    const at = ipc.indexOf("handle(ipc, 'fs:readDir'");
    expect(at).toBeGreaterThan(0);
    const next = ipc.indexOf('handle(ipc,', at + 1);
    const block = ipc.slice(at, next);
    expect(block).toContain('linkTargetsOf(');
    expect(block).toContain(".filter((k) => k.kind === 'symlink')");
    expect(block).toContain('entriesOf(abs, kinds, links)');
    expect(ipc).toContain("import { entriesOf, linkTargetsOf } from './link-target';");
  });

  it('the lane names no realpath, no lstat and nothing from paths.ts', () => {
    const code = read('link-target.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/realpath/i);
    expect(code).not.toMatch(/lstat/i);
    expect(code).not.toMatch(/from '\.\/paths'/);
    expect(code).not.toMatch(/from 'electron'/);
  });
});
