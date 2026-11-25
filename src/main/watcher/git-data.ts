/**
 * PHASE 371. What a flush may read of a git directory without asking git
 * (build/p371/SPEC.md D4 to D6).
 *
 * `RepoWatcher` says with each flush whether git's own data may have moved, and
 * "no" is only ever said when it is known. Its `.git` stream knows about the
 * refs, the index and HEAD, and this module answers the two questions no stream
 * can:
 *
 *   1. ARE ALL THE REFS UNDER THE DIRECTORY THE STREAM WATCHES? They are not in
 *      a linked worktree (its git directory holds a `commondir`), nor where one
 *      of the names the refs and the config live under is a symbolic link out
 *      of it, which is how `git-new-workdir` and Android's `repo` lay theirs.
 *   2. DID ONE OF THE OTHER FILES GIT'S ANSWERS DEPEND ON MOVE? `config`,
 *      `shallow`, the grafts and the alternates, the person's global and system
 *      files, and every file those configs include. Each is stat'ed, and the
 *      stats are joined into one stamp that is compared and never parsed.
 *
 * ANYTHING THIS CANNOT ANSWER IS `whole: false`, which is every change counting,
 * exactly as it was before this phase. That is the only safe direction: a wrong
 * `true` is a History panel that shows something old.
 *
 * IT RUNS ON MAIN'S THREAD, so nothing here may wait or read something that is
 * not a git file, and the files it is pointed at were not all written by a
 * friend: a `.git/config` can name any path on the disk.
 *
 *   - Only a REGULAR file of at most 1 MiB is opened, with `O_NONBLOCK` and
 *     asked again once it is open, so a FIFO or a terminal is never waited on.
 *   - Only its stat is read while that has not moved.
 *   - An included file is followed, and stat'ed, only inside HOME, the git
 *     directory or the project, and every component on the way is asked with
 *     `lstat` before it is walked, so a link inside the project cannot lead a
 *     stat to an automounted folder outside it.
 *   - At most 32 included files, at most 10 deep, which is git's own depth.
 *
 * The text is never kept, logged or sent: one list of include paths a file is
 * all that outlives a read. Nothing here writes, starts a process, folds case
 * or rewrites a path.
 */

import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  readlinkSync,
  statSync
} from 'node:fs';
import type { BigIntStats } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

/** What a flush may read of a git directory without asking git (build/p371/SPEC.md D4 to D6). */
export interface GitDataReading {
  /** True when every ref and every file git's answers depend on is either under the watched directory or in `stamp`. */
  readonly whole: boolean;
  /** The git directory's own identity: its path, device and inode; null when there is none. */
  readonly id: string | null;
  /** The named files' stats, joined. Compared, never parsed. */
  readonly stamp: string;
}

/**
 * Any of these being a symbolic link means a ref or the config may live outside
 * the watched directory (D4). A folder comes before what is in it, because the
 * first link found ends the walk and a name is only asked through real folders.
 */
const UNLINKED = [
  'config',
  'config.worktree',
  'packed-refs',
  'refs',
  'refs/heads',
  'refs/remotes',
  'refs/tags',
  'reftable',
  'reftable/tables.list',
  'FETCH_HEAD'
] as const;

/** The files in the git directory that are stamped and not read (D5). */
const NAMED = ['shallow', 'info/grafts', 'objects/info/alternates'] as const;

/** The files in the git directory that are stamped and whose includes are followed (D5). */
const CONFIGS = ['config', 'config.worktree'] as const;

/**
 * Any of these in the environment points git at something this does not read:
 * another git directory, another object store, a graft or shallow file somewhere
 * else, or config (an include among it) that is in no file. Tortie sets none of
 * them, and a git that Tortie starts inherits whatever it was started with.
 */
const ELSEWHERE = [
  'GIT_DIR',
  'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_GRAFT_FILE',
  'GIT_SHALLOW_FILE',
  'GIT_REFERENCE_BACKEND',
  'GIT_CONFIG_COUNT',
  'GIT_CONFIG_PARAMETERS'
] as const;

const FILE_BYTES_MAX = 1024 * 1024;
const INCLUDED_FILES_MAX = 32;
const INCLUDE_DEPTH_MAX = 10;
const LINKS_MAX = 32;

/** A reading that cannot be told. Its stamp equals no whole reading's, so becoming whole again counts once. */
const CANNOT_TELL = '!';

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

/** An absence is an answer and not a throw: most of the names asked are absent, at every flush. */
const ASKING = { bigint: true, throwIfNoEntry: false } as const;

/** Undefined when nothing is there. Any other failure throws. */
function present(ask: () => BigIntStats | undefined): BigIntStats | undefined {
  try {
    return ask();
  } catch (err) {
    // A folder on the way is a file, which is also nothing there.
    if ((err as NodeJS.ErrnoException).code === 'ENOTDIR') return undefined;
    throw err;
  }
}

const lstatOf = (path: string): BigIntStats | undefined => present(() => lstatSync(path, ASKING));
const statOf = (path: string): BigIntStats | undefined => present(() => statSync(path, ASKING));

function stampOf(st: BigIntStats | undefined): string {
  return st === undefined
    ? '-'
    : `${st.dev}:${st.ino}:${st.size}:${st.mtimeNs}:${st.ctimeNs}`;
}

// ---------------------------------------------------------------------------
// A path that is only walked inside the folders it may be in
// ---------------------------------------------------------------------------

function isAtOrUnder(path: string, folder: string): boolean {
  return path === folder || path.startsWith(`${folder}/`);
}

interface Found {
  /** The path with every link in it followed, which is never a link itself. */
  readonly path: string;
  /** What is there, or undefined when nothing is. */
  readonly st: BigIntStats | undefined;
}

/**
 * Follow `path` one component at a time and never leave `folders`. Null when it
 * leaves them, starts outside them, or goes through too many links. A component
 * is `lstat`ed before anything is asked through it, so a link is READ, and where
 * it points is checked, before any call follows it. A `..` is taken as the
 * kernel takes it, after the links before it.
 */
function findInside(path: string, folders: readonly string[], links = 0): Found | null {
  let base: string | null = null;
  for (const f of folders) {
    if (isAtOrUnder(path, f) && (base === null || f.length > base.length)) base = f;
  }
  if (base === null || links > LINKS_MAX) return null;
  const parts = path.slice(base.length).split('/');
  let at = base;
  let st: BigIntStats | undefined;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i] as string;
    if (part === '' || part === '.') continue;
    at = part === '..' ? dirname(at) : join(at, part);
    if (!folders.some((f) => isAtOrUnder(at, f))) return null;
    st = lstatOf(at);
    if (st === undefined) {
      const rest = parts.slice(i + 1);
      return { path: [at, ...rest].join('/'), st };
    }
    if (st.isSymbolicLink()) {
      const target = readlinkSync(at);
      const to = isAbsolute(target) ? target : `${dirname(at)}/${target}`;
      return findInside([to, ...parts.slice(i + 1)].join('/'), folders, links + 1);
    }
  }
  return { path: at, st: st ?? lstatOf(at) };
}

// ---------------------------------------------------------------------------
// The include paths one config file names
// ---------------------------------------------------------------------------

interface ConfigEntry {
  /** The section's name up to its first dot, in lower case. */
  readonly section: string;
  readonly key: string;
  /** Null for a key with no `=`. */
  readonly value: string | null;
  /** False when the value held an escape, a continuation, or quotes round a part of it. */
  readonly plain: boolean;
}

const isSpace = (c: string): boolean =>
  c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\v' || c === '\f';
const isAlpha = (c: string): boolean => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
const isKeyChar = (c: string): boolean => isAlpha(c) || (c >= '0' && c <= '9') || c === '-';

/** A section or key name in lower case, as git compares them. Config names are ASCII, and no path comes here. */
function asciiLower(name: string): string {
  let out = '';
  for (const c of name) {
    out += c >= 'A' && c <= 'Z' ? String.fromCharCode(c.charCodeAt(0) + 32) : c;
  }
  return out;
}

/**
 * Every `key = value` in a config file, read as git's own `config.c` reads it
 * (a character at a time: a line reader takes the continued line of an alias for
 * a section header and loses the include under it). Null when git itself would
 * refuse the file.
 */
function entriesIn(text: string): ConfigEntry[] | null {
  const src = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).split('\r\n').join('\n');
  const out: ConfigEntry[] = [];
  let section = '';
  let i = 0;
  const peek = (): string => src[i] ?? '\n';
  while (i < src.length) {
    const c = peek();
    if (isSpace(c)) {
      i += 1;
    } else if (c === '#' || c === ';') {
      while (i < src.length && peek() !== '\n') i += 1;
    } else if (c === '[') {
      i += 1;
      let name = '';
      while (isKeyChar(peek()) || peek() === '.') {
        name += peek();
        i += 1;
      }
      if (isSpace(peek())) {
        while (peek() !== '\n' && isSpace(peek())) i += 1;
        if (peek() !== '"') return null;
        i += 1;
        while (peek() !== '"') {
          if (peek() === '\\') i += 1;
          if (peek() === '\n') return null;
          i += 1;
        }
        i += 1;
      }
      if (peek() !== ']') return null;
      i += 1;
      section = asciiLower(name.split('.')[0] as string);
    } else if (isAlpha(c)) {
      let key = '';
      while (isKeyChar(peek())) {
        key += peek();
        i += 1;
      }
      while (peek() === ' ' || peek() === '\t') i += 1;
      if (peek() === '\n') {
        out.push({ section, key: asciiLower(key), value: null, plain: true });
        continue;
      }
      if (peek() !== '=') return null;
      i += 1;
      let value = '';
      let spaces = '';
      let quoted = false;
      let quotes = 0;
      let bare = false;
      let plain = true;
      for (;;) {
        const v = peek();
        if (v === '\n') {
          if (quoted) return null;
          break;
        }
        i += 1;
        if (!quoted && isSpace(v)) {
          if (value !== '') spaces += v;
        } else if (!quoted && (v === '#' || v === ';')) {
          while (i < src.length && peek() !== '\n') i += 1;
        } else if (v === '\\') {
          plain = false;
          if (i >= src.length) break;
          i += 1;
        } else if (v === '"') {
          quoted = !quoted;
          quotes += 1;
        } else {
          value += spaces + v;
          spaces = '';
          if (!quoted) bare = true;
        }
      }
      if (quotes > 2 || (quotes > 0 && bare)) plain = false;
      out.push({ section, key: asciiLower(key), value, plain });
    } else {
      return null;
    }
  }
  return out;
}

/**
 * The include paths `text` names, or null when one cannot be followed (D6). Pure.
 *
 * Every conditional include is named whatever its condition, because following
 * one git would not costs a stat and missing one git would shows something old.
 * A relative path is put after the folder of the file that names it and left
 * unreduced, because `a/../b` is only `b` when `a` is not a link.
 */
export function includePathsIn(
  text: string,
  file: string,
  home: string | undefined
): string[] | null {
  const entries = entriesIn(text);
  if (entries === null) return null;
  const out: string[] = [];
  for (const e of entries) {
    // A ref store named by an address is a ref store somewhere else.
    if (e.key === 'refstorage' && e.value !== null && e.value.includes('://')) return null;
    if (e.key !== 'path' || (e.section !== 'include' && e.section !== 'includeif')) continue;
    if (e.value === null || !e.plain || e.value.includes('\uFFFD')) return null;
    const v = e.value;
    if (v === '') continue;
    if (v.startsWith('%(') || v.startsWith(':(')) return null;
    if (v.startsWith('~')) {
      if (!v.startsWith('~/') || home === undefined || home === '') return null;
      out.push(`${home}/${v.slice(2)}`);
    } else {
      out.push(isAbsolute(v) ? v : `${dirname(file)}/${v}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The reader
// ---------------------------------------------------------------------------

/** The person's own config files: none, one or two global ones and the system one. */
function personFiles(projectRoot: string, env: NodeJS.ProcessEnv): string[] {
  const out: string[] = [];
  const home = env.HOME ?? '';
  if (env.GIT_CONFIG_GLOBAL !== undefined) {
    out.push(env.GIT_CONFIG_GLOBAL);
  } else {
    const xdg = env.XDG_CONFIG_HOME ?? '';
    if (home !== '') out.push(join(home, '.gitconfig'));
    if (xdg !== '') out.push(join(xdg, 'git', 'config'));
    else if (home !== '') out.push(join(home, '.config', 'git', 'config'));
  }
  // A value git reads as "no" leaves the system file in, so only the ones it
  // reads as "yes" take it out. A file too many costs a stat.
  const noSystem = env.GIT_CONFIG_NOSYSTEM ?? '';
  if (!/^([1-9][0-9]*|[Tt][Rr][Uu][Ee]|[Yy][Ee][Ss]|[Oo][Nn])$/.test(noSystem)) {
    out.push(env.GIT_CONFIG_SYSTEM ?? '/etc/gitconfig');
  }
  return out
    .filter((f) => f !== '' && f !== '/dev/null')
    .map((f) => resolve(projectRoot, f));
}

/** The text of a regular file of at most 1 MiB, or null. Never waits on what it opens. */
function textOf(path: string): string | null {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOCTTY);
  try {
    if (!fstatSync(fd).isFile()) return null;
    const bytes = Buffer.alloc(FILE_BYTES_MAX + 1);
    let held = 0;
    while (held < bytes.length) {
      const n = readSync(fd, bytes, held, bytes.length - held, null);
      if (n === 0) return bytes.toString('utf8', 0, held);
      held += n;
    }
    return null;
  } finally {
    closeSync(fd);
  }
}

/** One reader per watcher, so its small cache of include lists goes with it. Never throws; a throw inside is `whole: false`. */
export function createGitDataReader(
  projectRoot: string,
  env: NodeJS.ProcessEnv
): (gitDir: string | null) => GitDataReading {
  /** What each file named, under the stat it was read at. Only the last reading's files are kept. */
  let cache = new Map<string, { stamp: string; includes: string[] | null }>();

  /** The stamp of everything, or null when it cannot be told. */
  function read(gitDir: string): string | null {
    if (ELSEWHERE.some((name) => env[name] !== undefined)) return null;
    if (lstatOf(join(gitDir, 'commondir')) !== undefined) return null;
    for (const name of UNLINKED) {
      if (lstatOf(join(gitDir, name))?.isSymbolicLink() === true) return null;
    }

    const home = env.HOME;
    const folders = [home ?? '', gitDir, projectRoot]
      .map((f) => (f.length > 1 && f.endsWith('/') ? f.slice(0, -1) : f))
      // A HOME of `/` would put the whole disk inside it.
      .filter((f) => isAbsolute(f) && f !== '/');
    const kept = new Map<string, { stamp: string; includes: string[] | null }>();
    const stamps = new Map<string, string>();
    let included = 0;

    /** False when the file, or one it includes, cannot be followed. */
    const follow = (file: string, found: Found, depth: number): boolean => {
      if (stamps.has(found.path)) return true;
      const stamp = stampOf(found.st);
      stamps.set(found.path, stamp);
      if (found.st === undefined) return true;
      if (!found.st.isFile() || found.st.size > BigInt(FILE_BYTES_MAX)) return false;
      let known = cache.get(found.path);
      if (known === undefined || known.stamp !== stamp) {
        const text = textOf(found.path);
        if (text === null) return false;
        known = { stamp, includes: includePathsIn(text, file, home) };
      }
      kept.set(found.path, known);
      if (known.includes === null) return false;
      for (const path of known.includes) {
        const next = findInside(path, folders);
        if (next === null) return false;
        if (stamps.has(next.path)) continue;
        included += 1;
        if (included > INCLUDED_FILES_MAX || depth >= INCLUDE_DEPTH_MAX) return false;
        if (!follow(path, next, depth + 1)) return false;
      }
      return true;
    };

    let whole = true;
    for (const name of CONFIGS) {
      const path = join(gitDir, name);
      // Not a link, by the list above.
      whole &&= follow(path, { path, st: statOf(path) }, 0);
    }
    // The person's own files are followed wherever their links lead: nobody but
    // the person's own environment names them.
    for (const path of personFiles(projectRoot, env)) {
      whole &&= follow(path, { path, st: statOf(path) }, 0);
    }
    for (const name of NAMED) {
      const found = findInside(join(gitDir, name), folders);
      if (found === null) whole = false;
      else stamps.set(found.path, stampOf(found.st));
    }
    cache = kept;
    return whole ? [...stamps].map(([path, stamp]) => `${path}=${stamp}`).join('\n') : null;
  }

  return (gitDir) => {
    if (gitDir === null) return { whole: false, id: null, stamp: CANNOT_TELL };
    let id: string | null = null;
    try {
      const dir = statSync(gitDir, { bigint: true });
      id = `${gitDir}\0${dir.dev}:${dir.ino}`;
      const stamp = read(gitDir);
      if (stamp !== null) return { whole: true, id, stamp };
    } catch {
      /* not told, which is every change counting */
    }
    return { whole: false, id, stamp: CANNOT_TELL };
  };
}
