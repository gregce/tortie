/**
 * Phase 347, D11: `RepoWatcher.excludes(canonicalPath)` answers from the
 * exclusion plan the running worktree subscription was started with, which is
 * exactly the set the bus is blind to.
 *
 * Check type: contract test over an injected @parcel/watcher (the shape of
 * repo-watcher-contract.test.ts); no FSEvents stream is opened. The plan is
 * built by the SHIPPING `readIgnoredRoots`, so a real `git` runs, hermetic:
 * a scratch HOME and XDG_CONFIG_HOME (git's default excludes file lives under
 * them), no global or system config.
 *
 * E8 is the reverify's finding on D11: git on macOS reports an ignored folder's
 * name composed while the disk may store it decomposed, and the kernel still
 * excludes it. The kernel paths are respelled through `canonicalPathSync` once,
 * so the comparison is byte exact on the filesystem's own answer and nothing is
 * normalised. The test fails if that respelling is removed.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonicalPathSync } from '../../fs/folder-identity';

interface FakeSub {
  dir: string;
  ignore: (string | RegExp)[];
}

const subs: FakeSub[] = [];

vi.mock('@parcel/watcher', () => {
  const subscribe = (
    dir: string,
    _cb: unknown,
    opts?: { ignore?: (string | RegExp)[] }
  ): Promise<{ unsubscribe: () => Promise<void> }> => {
    subs.push({ dir, ignore: opts?.ignore ?? [] });
    return Promise.resolve({ unsubscribe: () => Promise.resolve() });
  };
  return { default: { subscribe }, subscribe };
});

const { RepoWatcher, excludedBy, exclusionViewOf } = await import('../repo-watcher');

const ENV_KEYS = ['HOME', 'XDG_CONFIG_HOME', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM'] as const;
const savedEnv = new Map<string, string | undefined>();
let scratch = '';
let home = '';
let dir = '';

function gitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env['TERM_SESSION_ID'];
  return env;
}

function git(args: string[], cwd: string): void {
  execFileSync('git', args, { cwd, env: gitEnv(), stdio: 'ignore' });
}

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), 'gmux-p347-excl-'));
  home = join(scratch, 'home');
  mkdirSync(home);
  for (const k of ENV_KEYS) savedEnv.set(k, process.env[k]);
  // `readIgnoredRoots` spawns git with this process's environment.
  process.env['HOME'] = home;
  process.env['XDG_CONFIG_HOME'] = join(home, '.config');
  process.env['GIT_CONFIG_GLOBAL'] = '/dev/null';
  process.env['GIT_CONFIG_NOSYSTEM'] = '1';
});

afterAll(() => {
  for (const [k, v] of savedEnv) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  rmSync(scratch, { recursive: true, force: true });
});

beforeEach(() => {
  subs.length = 0;
  dir = mkdtempSync(join(scratch, 'repo-'));
});

function file(rel: string, body = 'x'): string {
  const abs = join(dir, ...rel.split('/'));
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, body);
  return abs;
}

describe('Phase 347 D11: excludes() is the running watcher plan', () => {
  it('E1 to E7: kernel paths, .git, a prefix sibling, an overflow matcher, outside the root, no plan, and after dispose', async () => {
    git(['init', '-q', '-b', 'main'], dir);
    // Eight ignored roots: `.git` takes the first slot, so with `notes` and the
    // seven `ig*` roots exactly one falls to a userspace matcher.
    const igs = ['ig0', 'ig1', 'ig2', 'ig3', 'ig4', 'ig5', 'ig6'];
    writeFileSync(join(dir, '.gitignore'), ['notes/', ...igs.map((d) => `${d}/`)].join('\n') + '\n');
    // `notes` holds the most entries, so it ranks first and is a kernel path.
    for (let i = 0; i < 5; i++) file(`notes/n${i}.md`);
    for (const d of igs) file(`${d}/f.md`);
    file('notes2/x.md');
    file('src/x.md');
    const outsideDir = mkdtempSync(join(scratch, 'outside-'));
    writeFileSync(join(outsideDir, 'secret.txt'), 's');

    const rw = await RepoWatcher.watch(dir, { onChange: () => undefined });
    const root = canonicalPathSync(dir);
    try {
      const worktree = subs[0]!;
      const overflow = worktree.ignore.filter((e): e is RegExp => e instanceof RegExp);
      expect(overflow).toHaveLength(1);

      const c = (rel: string): string => canonicalPathSync(join(dir, ...rel.split('/')));
      // E1: a kernel path and a file under it.
      expect(rw.excludes(c('notes'))).toBe(true);
      expect(rw.excludes(c('notes/n0.md'))).toBe(true);
      // E2: `.git` is the first kernel path, so a file under it is excluded.
      expect(rw.excludes(join(root, '.git', 'COMMIT_EDITMSG'))).toBe(true);
      // E3: a prefix sibling is not under `notes`.
      expect(rw.excludes(c('notes2/x.md'))).toBe(false);
      expect(rw.excludes(c('src/x.md'))).toBe(false);
      // E4: the one root past the budget is matched in userspace.
      const overflowRoot = igs.find((d) => overflow[0]!.test(`${d}/f.md`));
      expect(overflowRoot).toBeDefined();
      expect(rw.excludes(c(`${overflowRoot!}/f.md`))).toBe(true);
      // E5: outside the root, and the root itself.
      expect(rw.excludes(canonicalPathSync(join(outsideDir, 'secret.txt')))).toBe(false);
      expect(rw.excludes(root)).toBe(false);
      // E5 again, where it matters: a kernel path that canonicalises OUTSIDE
      // the root (a `.git` that is a link elsewhere) and a matcher that would
      // read a `..` path still exclude nothing outside the root.
      const outsideFile = canonicalPathSync(join(outsideDir, 'secret.txt'));
      expect(excludedBy({ paths: [canonicalPathSync(outsideDir)], overflow: [] }, root, outsideFile)).toBe(false);
      expect(excludedBy({ paths: [], overflow: [/^\.\.(?:\/|$)/] }, root, outsideFile)).toBe(false);
      // E6: no plan answers false whatever the path.
      expect(excludedBy(null, root, c('notes/n0.md'))).toBe(false);
    } finally {
      await rw.dispose();
    }
    // E7: the same watcher after dispose answers false for what it answered true.
    expect(rw.excludes(canonicalPathSync(join(dir, 'notes', 'n0.md')))).toBe(false);
  });

  it('E8: a folder stored DECOMPOSED and ignored by a pattern written composed is excluded, by asking the filesystem', async () => {
    git(['init', '-q', '-b', 'main'], dir);
    // Escapes, never `.normalize()`: the two spellings are written as bytes.
    const stored = 'café-nfd'; // e + COMBINING ACUTE ACCENT, as Finder makes it
    const composed = 'café-nfd'; // the spelling git reports and the pattern uses
    const plain = 'café-nfc';
    writeFileSync(join(dir, '.gitignore'), `${composed}/\n${plain}/\n`);
    const inStored = file(`${stored}/a.md`);
    const inPlain = file(`${plain}/a.md`);

    const rw = await RepoWatcher.watch(dir, { onChange: () => undefined });
    const root = canonicalPathSync(dir);
    try {
      const raw = subs[0]!.ignore.filter((e): e is string => typeof e === 'string');
      const cStored = canonicalPathSync(inStored);
      // The disk keeps the decomposed bytes for the stored folder.
      expect(cStored).toBe(join(root, stored, 'a.md'));
      if (process.platform === 'darwin') {
        // The precondition the finding rests on: git handed the subscription
        // the COMPOSED spelling of a folder the disk stores decomposed.
        expect(raw).toContain(join(root, composed));
        expect(raw).not.toContain(join(root, stored));
        // Without the respelling, a byte compare against git's spelling misses it.
        expect(excludedBy({ paths: raw, overflow: [] }, root, cStored)).toBe(false);
      }
      expect(rw.excludes(cStored)).toBe(true);
      expect(rw.excludes(canonicalPathSync(inPlain))).toBe(true);
    } finally {
      await rw.dispose();
    }
  });

  it('exclusionViewOf respells each kernel path once and keeps one it cannot resolve as given', () => {
    const real = mkdtempSync(join(scratch, 'view-'));
    const missing = join(real, 'not-there');
    const view = exclusionViewOf({
      ignore: [real, missing, /^x(?:\/|$)/],
      paths: [real, missing],
      overflow: [/^x(?:\/|$)/]
    });
    expect(view.paths).toEqual([canonicalPathSync(real), missing]);
    expect(view.overflow.map((r) => r.source)).toEqual(['^x(?:\\/|$)']);
  });
});
