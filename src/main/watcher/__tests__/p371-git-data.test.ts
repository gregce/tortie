/**
 * PHASE 371: the reader that tells, by file stats alone, whether a git
 * directory holds all of its own data and whether the files no stream carries
 * have moved (build/p371/SPEC.md D4 to D6, rows G1 to G13).
 *
 * Check type: contract test over real files in a scratch folder. `node:fs` is
 * wrapped so a test can count what was opened, read and asked, and can hold a
 * stat apart from what is really there, which is the only way to reach a file
 * that is replaced between the two.
 *
 * Half of what is here is hostile on purpose. The reader runs on main's thread
 * and follows paths a `.git/config` names, and Tortie opens repositories a
 * person was handed.
 */

import { execFileSync } from 'node:child_process';
import type { PathLike } from 'node:fs';
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  truncateSync,
  utimesSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// node:fs, counted
// ---------------------------------------------------------------------------

const seen = { opened: [] as string[], asked: [] as string[], bytes: 0 };
/** Paths an `lstat` answers for as if this other path were there. */
const saysItIs = new Map<string, string>();

vi.mock('node:fs', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs')>();
  const wrapped = {
    ...real,
    openSync: ((path: PathLike, ...rest: [number]) => {
      seen.opened.push(String(path));
      return real.openSync(path, ...rest);
    }) as typeof real.openSync,
    readSync: ((...args: Parameters<typeof real.readSync>) => {
      const got = real.readSync(...args);
      seen.bytes += got;
      return got;
    }) as typeof real.readSync,
    statSync: ((path: PathLike, ...rest: [{ bigint: true }]) => {
      seen.asked.push(String(path));
      return real.statSync(path, ...rest);
    }) as unknown as typeof real.statSync,
    lstatSync: ((path: PathLike, ...rest: [{ bigint: true }]) => {
      seen.asked.push(String(path));
      return real.lstatSync(saysItIs.get(String(path)) ?? path, ...rest);
    }) as unknown as typeof real.lstatSync
  };
  return { ...wrapped, default: wrapped };
});

const { createGitDataReader, includePathsIn } = await import('../git-data');

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------

let base = '';
let root = '';
let home = '';
let out = '';
let gitDir = '';
let env: NodeJS.ProcessEnv = {};
let n = 0;

beforeAll(() => {
  base = realpathSync.native(mkdtempSync(join(tmpdir(), 'gmux-p371-data-')));
  home = base;
  git(base, 'init', '-q', '-b', 'main', join(base, 'template'));
});
afterAll(() => {
  rmSync(base, { recursive: true, force: true });
});

const GIT_ENV = (): NodeJS.ProcessEnv => ({
  PATH: '/usr/bin:/bin',
  HOME: home,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'a',
  GIT_AUTHOR_EMAIL: 'a@x',
  GIT_COMMITTER_NAME: 'a',
  GIT_COMMITTER_EMAIL: 'a@x',
  GIT_ALLOW_PROTOCOL: 'file'
});
const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, env: GIT_ENV(), stdio: ['ignore', 'pipe', 'ignore'] }).toString();

beforeEach(() => {
  n += 1;
  const w = join(base, `w${n}`);
  root = join(w, 'proj');
  home = join(w, 'home');
  out = join(w, 'out');
  for (const d of [root, home, out]) mkdirSync(d, { recursive: true });
  gitDir = join(root, '.git');
  cpSync(join(base, 'template', '.git'), gitDir, { recursive: true });
  env = { HOME: home, GIT_CONFIG_NOSYSTEM: '1' };
  saysItIs.clear();
  forget();
});

const forget = (): void => {
  seen.opened.length = 0;
  seen.asked.length = 0;
  seen.bytes = 0;
};
const reader = (): ((g: string | null) => { whole: boolean; id: string | null; stamp: string }) =>
  createGitDataReader(root, env);
const read = (): { whole: boolean; id: string | null; stamp: string } => reader()(gitDir);
/** The repository's own config, holding this and nothing else. */
const config = (text: string): void => writeFileSync(join(gitDir, 'config'), text);
const include = (path: string): void => config(`[include]\n\tpath = ${path}\n`);

/** Does writing `file` move the stamp, the reading being whole before and after? */
function movesTheStamp(file: string): boolean {
  const r = reader();
  const before = r(gitDir);
  expect(before.whole).toBe(true);
  mkdirSync(resolve(file, '..'), { recursive: true });
  writeFileSync(file, `# ${file}\n`);
  const after = r(gitDir);
  expect(after.whole).toBe(true);
  return before.stamp !== after.stamp;
}

/** `whole: false`, answered at once: the quickest of three, because a busy machine can hold any one. */
function cannotTell(): void {
  const took = [1, 2, 3].map(() => {
    const r = reader();
    const from = process.hrtime.bigint();
    const got = r(gitDir);
    const ms = Number(process.hrtime.bigint() - from) / 1e6;
    expect(got.whole).toBe(false);
    expect(got.id).not.toBeNull();
    return ms;
  });
  expect(Math.min(...took)).toBeLessThan(50);
}

// ---------------------------------------------------------------------------

describe('G1: whole, and stamped', () => {
  const shapes: Record<string, () => void> = {
    ordinary: () => undefined,
    sha256: () => {
      rmSync(gitDir, { recursive: true });
      git(root, 'init', '-q', '--object-format=sha256');
    },
    separate: () => {
      rmSync(gitDir, { recursive: true });
      gitDir = join(out, 'elsewhere.git');
      git(root, 'init', '-q', `--separate-git-dir=${gitDir}`);
    },
    submodule: () => {
      git(root, 'commit', '-q', '--allow-empty', '-m', 'c');
      const sup = join(out, 'super');
      git(out, 'init', '-q', '-b', 'main', sup);
      git(sup, '-c', 'protocol.file.allow=always', 'submodule', '--quiet', 'add', root, 'sub');
      root = join(sup, 'sub');
      gitDir = join(sup, '.git', 'modules', 'sub');
    }
  };
  it.each(Object.keys(shapes))('%s', (name) => {
    shapes[name]!();
    const r = reader();
    const first = r(gitDir);
    expect(first.whole).toBe(true);
    const st = statSync(gitDir);
    expect(first.id).toBe(`${gitDir}\0${st.dev}:${st.ino}`);
    expect(r(gitDir)).toEqual(first);
    for (const f of ['config', 'config.worktree', 'shallow', 'info/grafts', 'objects/info/alternates']) {
      const before = r(gitDir);
      mkdirSync(resolve(gitDir, f, '..'), { recursive: true });
      // Appended, because a config git wrote names the work tree.
      writeFileSync(join(gitDir, f), '# x\n', { flag: 'a' });
      const after = r(gitDir);
      expect([f, after.whole, after.stamp !== before.stamp]).toEqual([f, true, true]);
      expect(r(gitDir)).toEqual(after);
    }
  });

  it('with no git directory, or one that is gone, nothing can be told', () => {
    expect(reader()(null)).toMatchObject({ whole: false, id: null });
    expect(reader()(join(root, 'gone'))).toMatchObject({ whole: false, id: null });
  });

  it('a reading that cannot be told never has the stamp of one that can', () => {
    const r = reader();
    const whole = r(gitDir);
    include('/nowhere');
    const not = r(gitDir);
    expect(not.whole).toBe(false);
    expect(not.stamp).not.toBe(whole.stamp);
  });
});

describe('G2: the person\'s own files', () => {
  it('~/.gitconfig and ~/.config/git/config', () => {
    expect(movesTheStamp(join(home, '.gitconfig'))).toBe(true);
    expect(movesTheStamp(join(home, '.config', 'git', 'config'))).toBe(true);
  });
  it('XDG_CONFIG_HOME in place of ~/.config, beside ~/.gitconfig', () => {
    env.XDG_CONFIG_HOME = join(out, 'xdg');
    expect(movesTheStamp(join(out, 'xdg', 'git', 'config'))).toBe(true);
    expect(movesTheStamp(join(home, '.gitconfig'))).toBe(true);
    expect(movesTheStamp(join(home, '.config', 'git', 'config'))).toBe(false);
  });
  it('an empty XDG_CONFIG_HOME is none', () => {
    env.XDG_CONFIG_HOME = '';
    expect(movesTheStamp(join(home, '.config', 'git', 'config'))).toBe(true);
  });
  it('GIT_CONFIG_GLOBAL in place of both', () => {
    env.GIT_CONFIG_GLOBAL = join(out, 'global');
    expect(movesTheStamp(join(out, 'global'))).toBe(true);
    expect(movesTheStamp(join(home, '.gitconfig'))).toBe(false);
  });
  it.each(['', '/dev/null'])('GIT_CONFIG_GLOBAL of "%s" is none', (value) => {
    env.GIT_CONFIG_GLOBAL = value;
    expect(read().whole).toBe(true);
    expect(movesTheStamp(join(home, '.gitconfig'))).toBe(false);
    expect(seen.asked).not.toContain('/dev/null');
  });
  it('GIT_CONFIG_SYSTEM, and /etc/gitconfig without it', () => {
    delete env.GIT_CONFIG_NOSYSTEM;
    env.GIT_CONFIG_SYSTEM = join(out, 'system');
    expect(movesTheStamp(join(out, 'system'))).toBe(true);
    expect(seen.asked).not.toContain('/etc/gitconfig');
    delete env.GIT_CONFIG_SYSTEM;
    read();
    expect(seen.asked).toContain('/etc/gitconfig');
  });
  it.each(['1', 'true', 'Yes', 'ON'])('GIT_CONFIG_NOSYSTEM of "%s" is neither', (value) => {
    env.GIT_CONFIG_NOSYSTEM = value;
    env.GIT_CONFIG_SYSTEM = join(out, 'system');
    expect(movesTheStamp(join(out, 'system'))).toBe(false);
  });
  it.each(['0', 'false', ''])('GIT_CONFIG_NOSYSTEM of "%s" leaves it in, as git does', (value) => {
    env.GIT_CONFIG_NOSYSTEM = value;
    env.GIT_CONFIG_SYSTEM = join(out, 'system');
    expect(movesTheStamp(join(out, 'system'))).toBe(true);
  });
  it('a ~/.gitconfig that is a link is followed wherever it goes, and its includes are read', () => {
    writeFileSync(join(out, 'dotfile'), '[include]\n\tpath = more\n');
    symlinkSync(join(out, 'dotfile'), join(home, '.gitconfig'));
    expect(movesTheStamp(join(home, 'more'))).toBe(true);
    expect(movesTheStamp(join(out, 'dotfile'))).toBe(true);
  });
  it('a global file that is too big, or not a file, cannot be told', () => {
    mkdirSync(join(home, '.gitconfig'));
    cannotTell();
  });
});

describe('G3: an include is followed', () => {
  it('relative to the file that names it, and from there', () => {
    include('../one');
    mkdirSync(join(root, 'deep'));
    writeFileSync(join(root, 'one'), '[include]\npath = deep/two\n');
    writeFileSync(join(root, 'deep', 'two'), '[include]\npath = three\n');
    expect(movesTheStamp(join(root, 'deep', 'three'))).toBe(true);
    expect(movesTheStamp(join(root, 'one'))).toBe(true);
  });
  it('from config.worktree too', () => {
    writeFileSync(join(gitDir, 'config.worktree'), '[include]\n\tpath = ../wt\n');
    expect(movesTheStamp(join(root, 'wt'))).toBe(true);
  });
  it('~/ is HOME', () => {
    include('~/inc');
    expect(movesTheStamp(join(home, 'inc'))).toBe(true);
  });
  it('a missing one is noticed when it appears', () => {
    include('../later/on');
    expect(movesTheStamp(join(root, 'later', 'on'))).toBe(true);
  });
  it('through a link that stays inside, the link\'s own target stamped', () => {
    mkdirSync(join(root, 'real'));
    symlinkSync('real', join(root, 'link'));
    include('../link/inc');
    expect(movesTheStamp(join(root, 'real', 'inc'))).toBe(true);
  });
  it('a .. is taken after the link before it, as the kernel takes it', () => {
    mkdirSync(join(root, 'a', 'b'), { recursive: true });
    symlinkSync(join('a', 'b'), join(root, 'link'));
    include('../link/../inc');
    expect(movesTheStamp(join(root, 'a', 'inc'))).toBe(true);
    expect(movesTheStamp(join(root, 'inc'))).toBe(false);
  });

  const F = '/r/.git/config';
  const paths: [string, string, string[]][] = [
    ['plain', '[include]\n\tpath = /a/b\n', ['/a/b']],
    ['no spaces', '[include]\npath=/a\n', ['/a']],
    ['no last newline', '[include]\npath = /a', ['/a']],
    ['several', '[include]\npath = /a\npath = /b\n[core]\nbare = false\n[include]\npath = /c\n', ['/a', '/b', '/c']],
    ['any case', '[InClude]\n\tPATH = /a\n', ['/a']],
    ['on the header line', '[include] path = /a\n', ['/a']],
    ['includeIf, whatever its condition', '[includeIf "gitdir:~/x/"]\npath = /a\n[INCLUDEIF "onbranch:b]["]\npath = /b\n', ['/a', '/b']],
    ['an escaped quote in a condition', '[includeIf "gitdir:a\\"b"]\npath = /a\n', ['/a']],
    ['a dotted condition', '[includeIf.hasconfig] path = /a\n', ['/a']],
    ['CRLF', '[include]\r\n\tpath = /a b\r\n[core]\r\nx = 1\r\n', ['/a b']],
    ['a byte order mark', '\uFEFF[include]\npath = /a\n', ['/a']],
    ['quoted whole', '[include]\npath = "/a # b"\n', ['/a # b']],
    ['a comment after it', '[include]\npath = /a # b\n path = /c ; d\n', ['/a', '/c']],
    ['comments and blanks', '# [include]\n; path = /no\n\n[include]\n # x \\\n\tpath = /a\n', ['/a']],
    ['a relative one, left unreduced', '[include]\npath = ../inc\n', ['/r/.git/../inc']],
    ['an empty one is nothing', '[include]\npath =\npath = ""\n', []],
    ['path in another section is not one', '[core]\npath = /a\n[alias]\npath = /b\n', []],
    ['another key in include is not one', '[include]\npaths = /a\n', []],
    // A line reader takes the second line for a header, and loses /b.
    ['a continued line holding a header', '[include]\nx = y \\\n[core]\npath = /b\n', ['/b']],
    ['a continued line under CRLF', '[include]\r\nx = y \\\r\n[core]\r\npath = /b\r\n', ['/b']],
    ['a continued line holding an include', '[alias]\nx = "!f() { \\\n[include]\\\npath = /no; }"\n', []],
    ['a key with no value', '[core]\n\tbare\n[include]\npath = /a\n', ['/a']]
  ];
  it.each(paths)('reads it as git does: %s', (_name, text, want) => {
    expect(includePathsIn(text, F, '/home/x')).toEqual(want);
  });

  // The same texts through git's own reader, where git lists what it was given.
  it('agrees with git about what every text above says', () => {
    for (const [name, text, want] of paths) {
      const file = join(out, 'probe');
      writeFileSync(file, text);
      const listed = git(out, 'config', '--file', file, '--no-includes', '--list', '-z')
        .split('\0')
        .map((e) => /^include(?:\.|if\..*\.)path\n(.*)$/s.exec(e)?.[1])
        .filter((v): v is string => v !== undefined && v !== '')
        .map((v) => (v.startsWith('/') ? v : `/r/.git/${v}`));
      expect([name, listed]).toEqual([name, want]);
    }
  });
});

describe('G4: a cycle ends', () => {
  it('between files, and of one with itself', () => {
    include('../one');
    writeFileSync(join(root, 'one'), '[include]\npath = two\npath = ./one\n');
    writeFileSync(join(root, 'two'), '[include]\npath = .git/config\npath = ./././one\n');
    expect(read().whole).toBe(true);
    expect(seen.opened).toHaveLength(3);
  });
  it('a link that leads to itself', () => {
    symlinkSync('loop', join(root, 'loop'));
    include('../loop');
    cannotTell();
  });
});

describe('G5: a file is read once for each stamp', () => {
  it('not again while it has not moved, and again when it has', () => {
    include('../one');
    writeFileSync(join(root, 'one'), '# x\n');
    const r = reader();
    r(gitDir);
    expect(seen.opened).toEqual([join(gitDir, 'config'), join(root, 'one')]);
    forget();
    for (let i = 0; i < 5; i += 1) r(gitDir);
    expect(seen.opened).toEqual([]);
    writeFileSync(join(root, 'one'), '# longer\n');
    r(gitDir);
    expect(seen.opened).toEqual([join(root, 'one')]);
  });
  it('two readers share nothing', () => {
    reader()(gitDir);
    forget();
    reader()(gitDir);
    expect(seen.opened).toEqual([join(gitDir, 'config')]);
  });
});

describe('G6: what a stamp is made of', () => {
  it('ctime alone moves it', () => {
    const file = join(gitDir, 'shallow');
    writeFileSync(file, 'x');
    utimesSync(file, 1000, 1000);
    const r = reader();
    const before = r(gitDir).stamp;
    chmodSync(file, 0o600);
    utimesSync(file, 1000, 1000);
    expect(r(gitDir).stamp).not.toBe(before);
  });
  it('a file put in its place with the same size and time moves it', () => {
    const file = join(gitDir, 'shallow');
    writeFileSync(file, 'x');
    writeFileSync(join(gitDir, 'other'), 'y');
    for (const f of [file, join(gitDir, 'other')]) utimesSync(f, 1000, 1000);
    const r = reader();
    const before = r(gitDir).stamp;
    renameSync(join(gitDir, 'other'), file);
    expect(r(gitDir).stamp).not.toBe(before);
  });
});

describe('G7: nothing that is not a small regular file is read or waited on', () => {
  it('a FIFO', () => {
    execFileSync('/usr/bin/mkfifo', [join(root, 'fifo')]);
    include('../fifo');
    cannotTell();
    expect(seen.opened).not.toContain(join(root, 'fifo'));
  });
  it('a FIFO that was a file when it was asked', () => {
    execFileSync('/usr/bin/mkfifo', [join(root, 'fifo')]);
    writeFileSync(join(root, 'file'), '');
    saysItIs.set(join(root, 'fifo'), join(root, 'file'));
    include('../fifo');
    cannotTell();
    expect(seen.opened).toContain(join(root, 'fifo'));
  });
  it('a directory', () => {
    mkdirSync(join(root, 'folder'));
    include('../folder');
    cannotTell();
    expect(seen.opened).not.toContain(join(root, 'folder'));
  });
  it('/dev/tty, by name and through a link in the project', () => {
    include('/dev/tty');
    cannotTell();
    symlinkSync('/dev/tty', join(root, 'tty'));
    include('../tty');
    cannotTell();
    expect([...seen.opened, ...seen.asked].filter((p) => p.startsWith('/dev/'))).toEqual([]);
  });
  it('a 2 MiB file, and a config of 2 MiB', () => {
    writeFileSync(join(root, 'big'), '');
    truncateSync(join(root, 'big'), 2 * 1024 * 1024);
    include('../big');
    cannotTell();
    expect(seen.opened).not.toContain(join(root, 'big'));
    truncateSync(join(gitDir, 'config'), 2 * 1024 * 1024);
    cannotTell();
  });
  it('a file that was small when it was asked is read no further than 1 MiB', () => {
    writeFileSync(join(root, 'big'), '');
    writeFileSync(join(root, 'small'), '');
    truncateSync(join(root, 'big'), 8 * 1024 * 1024);
    saysItIs.set(join(root, 'big'), join(root, 'small'));
    include('../big');
    forget();
    cannotTell();
    expect(seen.bytes).toBeLessThan(3 * (1024 * 1024 + 4096));
  });
  it('a file of exactly 1 MiB is read', () => {
    writeFileSync(join(root, 'full'), '#'.repeat(1024 * 1024));
    include('../full');
    expect(read().whole).toBe(true);
  });
});

describe('G8: nothing outside HOME, the git directory and the project is asked about', () => {
  it('by name', () => {
    include(join(out, 'inc'));
    cannotTell();
    expect(seen.asked.filter((p) => p.startsWith(out))).toEqual([]);
  });
  it('by a .. that climbs out', () => {
    include('../../out/inc');
    cannotTell();
    expect(seen.asked.filter((p) => p.startsWith(out) || p.includes('out/inc'))).toEqual([]);
  });
  it('through a link in the project, a link to it, and a link in the git directory', () => {
    symlinkSync(out, join(root, 'away'));
    symlinkSync('away', join(root, 'again'));
    for (const path of ['../away/inc', '../again/inc']) {
      include(path);
      forget();
      cannotTell();
      expect([...seen.asked, ...seen.opened].filter((p) => p.includes('/inc'))).toEqual([]);
    }
    config('');
    symlinkSync(join(out, 'grafts'), join(gitDir, 'shallow'));
    forget();
    cannotTell();
    expect(seen.asked.filter((p) => p.startsWith(out))).toEqual([]);
  });
  it('a folder whose name only begins like one of them', () => {
    mkdirSync(`${root}2`);
    include(`${root}2/inc`);
    cannotTell();
  });
  it('a HOME of / puts nothing inside it, and the rest still reads', () => {
    env.HOME = '/';
    expect(read().whole).toBe(true);
    include(join(out, 'inc'));
    cannotTell();
  });
  it('each of the three is inside', () => {
    for (const path of [join(home, 'i'), join(gitDir, 'i'), join(root, 'i')]) {
      include(path);
      expect([path, read().whole]).toEqual([path, true]);
    }
  });
  it('the git directory is inside when it is neither under HOME nor the project', () => {
    rmSync(gitDir, { recursive: true });
    gitDir = join(out, 'elsewhere.git');
    git(root, 'init', '-q', `--separate-git-dir=${gitDir}`);
    include('inc');
    expect(read().whole).toBe(true);
  });
});

describe('G9: a value this reader does not take cannot be told', () => {
  const refused: [string, string][] = [
    ['another person\'s home', '~root/inc'],
    ['a home alone', '~'],
    ['git\'s own prefix', '%(prefix)/inc'],
    ['an optional path', ':(optional)/inc'],
    ['an escape', 'a\\\\b'],
    ['a continuation', 'a\\\nb'],
    ['quotes round a part', '"a"b'],
    ['two quoted parts', '"a""b"'],
    ['an escaped quote', '"a\\"b"'],
    ['bytes that are not text', 'a\uFFFDb']
  ];
  it.each(refused)('%s', (_name, value) => {
    expect(includePathsIn(`[include]\n\tpath = ${value}\n`, '/r/.git/config', '/h')).toBeNull();
    include(value);
    cannotTell();
  });
  it('~/ with no HOME', () => {
    for (const h of [undefined, '']) {
      expect(includePathsIn('[include]\npath = ~/x\n', '/r/c', h)).toBeNull();
    }
  });
  it('a path with no value', () => {
    expect(includePathsIn('[include]\n\tpath\n', '/r/c', '/h')).toBeNull();
  });
  const broken = ['[core\n', '[core=\nx = 1\n', '[core "x]\n', '[core "x" y]\n', '[co re]\n', '[co re"]\n', '=x\n', '[a]\nkey # x\n', '[a]\nk = "open\n', '\0\n', '[a "b\\\n"]\n'];
  it.each(broken)('a file git refuses: %j', (text) => {
    const file = join(out, 'broken');
    writeFileSync(file, text);
    expect(() => git(out, 'config', '--file', file, '--list')).toThrow();
    expect(includePathsIn(text, '/r/c', '/h')).toBeNull();
  });
  it('the same marks in a value that is not a path are nothing', () => {
    expect(includePathsIn('[alias]\n\tx = "!f() { \\"a\\" | b; }"\n\ty = ~root\n', '/r/c', '/h')).toEqual([]);
  });
});

describe('G10: so many files, so deep', () => {
  it('32 included files are followed and 33 are not', () => {
    for (const [count, whole] of [[32, true], [33, false]] as const) {
      config(`[include]\n${Array.from({ length: count }, (_, i) => `path = ../i${i}\n`).join('')}`);
      expect([count, read().whole]).toEqual([count, whole]);
    }
  });
  it('10 deep is followed and 11 is not', () => {
    include('../d1');
    for (let i = 1; i < 10; i += 1) writeFileSync(join(root, `d${i}`), `[include]\npath = d${i + 1}\n`);
    writeFileSync(join(root, 'd10'), '');
    expect(read().whole).toBe(true);
    writeFileSync(join(root, 'd10'), '[include]\npath = d11\n');
    expect(read().whole).toBe(false);
  });
});

describe('G11: an unreadable file cannot be told, until it can', () => {
  it('reads it again when it may', () => {
    include('../one');
    writeFileSync(join(root, 'one'), '');
    chmodSync(join(root, 'one'), 0);
    const r = reader();
    expect(r(gitDir).whole).toBe(false);
    chmodSync(join(root, 'one'), 0o644);
    expect(r(gitDir).whole).toBe(true);
  });
  it('a name behind a file that is not a folder is an absence', () => {
    writeFileSync(join(root, 'file'), '');
    include('../file/inc');
    writeFileSync(join(home, '.config'), '');
    expect(read().whole).toBe(true);
  });
  it('a folder that may not be looked in', () => {
    mkdirSync(join(root, 'shut'));
    writeFileSync(join(root, 'shut', 'one'), '');
    include('../shut/one');
    chmodSync(join(root, 'shut'), 0);
    try {
      cannotTell();
    } finally {
      chmodSync(join(root, 'shut'), 0o755);
    }
  });
});

describe('G12: refs kept somewhere else cannot be told', () => {
  it('by an address, and not by a name', () => {
    config('[extensions]\n\trefStorage = reftable:///x\n');
    cannotTell();
    config('[extensions]\n\trefStorage = reftable\n');
    expect(read().whole).toBe(true);
  });
  it.each([
    'GIT_DIR',
    'GIT_COMMON_DIR',
    'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_GRAFT_FILE',
    'GIT_SHALLOW_FILE',
    'GIT_REFERENCE_BACKEND',
    'GIT_CONFIG_COUNT',
    'GIT_CONFIG_PARAMETERS'
  ])('%s in the environment', (name) => {
    env[name] = '/x';
    cannotTell();
  });
  it('a commondir', () => {
    writeFileSync(join(gitDir, 'commondir'), '../..\n');
    cannotTell();
  });
});

describe('G13: what the module may do', () => {
  const FILE = resolve(__dirname, '..', 'git-data.ts');
  /** What it imports, from where, and every call it names. */
  function shapeOf(text: string): { from: string[]; names: string[]; calls: string[] } {
    const source = ts.createSourceFile('git-data.ts', text, ts.ScriptTarget.Latest, true);
    const from: string[] = [];
    const names: string[] = [];
    const calls: string[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) {
        from.push((node.moduleSpecifier as ts.StringLiteral).text);
        const bound = node.importClause?.namedBindings;
        if (bound !== undefined && ts.isNamedImports(bound) && node.importClause?.name === undefined) {
          for (const e of bound.elements) names.push((e.propertyName ?? e.name).text);
        } else {
          names.push('*');
        }
      }
      if (ts.isCallExpression(node)) {
        calls.push(
          ts.isPropertyAccessExpression(node.expression)
            ? `.${node.expression.name.text}`
            : node.expression.getText(source)
        );
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return { from, names, calls };
  }
  const MAY_IMPORT = new Set(['node:fs', 'node:path']);
  const MAY_NAME = new Set([
    'BigIntStats', 'closeSync', 'constants', 'dirname', 'fstatSync', 'isAbsolute', 'join',
    'lstatSync', 'openSync', 'readSync', 'readlinkSync', 'resolve', 'statSync'
  ]);
  const MAY_NOT_CALL = /^(\.(normalize|toLowerCase|toUpperCase|localeCompare)|import|require|fetch|eval|console\..*|\.(log|warn|error|info))$/;
  function wrongs(text: string): string[] {
    const s = shapeOf(text);
    return [
      ...s.from.filter((f) => !MAY_IMPORT.has(f)),
      ...s.names.filter((x) => !MAY_NAME.has(x)),
      ...s.calls.filter((c) => MAY_NOT_CALL.test(c)),
      ...(text.includes('process.env') ? ['process.env'] : [])
    ];
  }
  const text = readFileSync(FILE, 'utf8');

  it('imports node:fs and node:path alone, and names no write, no process and no log', () => {
    expect(wrongs(text)).toEqual([]);
    expect(new Set(shapeOf(text).from)).toEqual(MAY_IMPORT);
  });
  it.each([
    "import { spawn } from 'node:child_process';",
    "import { writeFileSync } from 'node:fs';",
    "import * as fs from 'node:fs';",
    "import fs from 'node:fs';",
    "import { realpathSync } from 'node:fs';",
    "import { getLog } from '../log';",
    "void import('node:net');",
    "console.warn('x');",
    "'a'.normalize();",
    "'a'.toLowerCase();",
    'void process.env;'
  ])('and would say so of: %s', (planted) => {
    expect(wrongs(`${text}\n${planted}\n`)).not.toEqual([]);
  });
  it('reads the world it is handed and not its own', () => {
    expect(text.includes('process.')).toBe(false);
  });
});
