/**
 * The filesystem port, and the one cache the whole scan shares.
 *
 * Two reasons this is a port rather than direct `node:fs` calls scattered
 * through the readers:
 *
 *  1. The precedence rules are the value of this phase and they have to be
 *     unit-testable without a disk. A test builds a `MemoryContextFs` with
 *     nine files in it and asserts that a personal skill beats a project one
 *     for Claude and loses to it for Gemini.
 *  2. `~/.agents/skills` is declared by nine of the twelve agents and
 *     `~/.claude.json` is 1.17 MB with 2,038 project entries in it. Reading
 *     either one once per agent would turn an 11 ms scan into a slow one for
 *     no new information. Every read goes through a cache keyed by path, and
 *     the cache lives exactly as long as one scan.
 *
 * `realpath` is a first-class operation here, not a convenience: one physical
 * `SKILL.md` is reachable from up to nine agent directories through symlinks,
 * so a reader that dedupes by path shows 107 rows where there are 33 things.
 */

import { createHash } from 'node:crypto';
import { open, readdir, readFile, realpath, stat } from 'node:fs/promises';
import { join } from 'node:path';

export interface ContextDirEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymbolicLink: boolean;
}

export interface ContextFileStat {
  size: number;
  isDirectory: boolean;
  isFile: boolean;
}

/** Everything the readers are allowed to ask the disk for. */
export interface ContextFs {
  readDir(path: string): Promise<ContextDirEntry[] | null>;
  readText(path: string, maxBytes?: number): Promise<string | null>;
  stat(path: string): Promise<ContextFileStat | null>;
  realPath(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  /** sha256 of a file's bytes; null when it cannot be read. */
  hashFile(path: string): Promise<string | null>;
}

/** Nothing this reader touches is legitimately larger than this. */
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;

/** `~/.claude.json` is 1.17 MB today, so the ceiling has to clear it comfortably. */
const BIG_JSON_MAX_BYTES = 32 * 1024 * 1024;

export const CONTEXT_READ_LIMITS = {
  defaultMaxBytes: DEFAULT_MAX_BYTES,
  bigJsonMaxBytes: BIG_JSON_MAX_BYTES
} as const;

/** The real filesystem, with one scan's worth of memoisation in front of it. */
export function createNodeContextFs(): ContextFs {
  const dirs = new Map<string, Promise<ContextDirEntry[] | null>>();
  const texts = new Map<string, Promise<string | null>>();
  const stats = new Map<string, Promise<ContextFileStat | null>>();
  const reals = new Map<string, Promise<string>>();
  const hashes = new Map<string, Promise<string | null>>();

  async function readDirUncached(path: string): Promise<ContextDirEntry[] | null> {
    try {
      const entries = await readdir(path, { withFileTypes: true });
      return entries.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        isSymbolicLink: entry.isSymbolicLink()
      }));
    } catch {
      return null;
    }
  }

  async function readTextUncached(path: string, maxBytes: number): Promise<string | null> {
    let handle;
    try {
      handle = await open(path, 'r');
      const info = await handle.stat();
      if (info.size > maxBytes) {
        const buffer = Buffer.alloc(maxBytes);
        const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
        return buffer.subarray(0, bytesRead).toString('utf8');
      }
      return (await handle.readFile()).toString('utf8');
    } catch {
      return null;
    } finally {
      await handle?.close().catch(() => undefined);
    }
  }

  return {
    readDir(path) {
      const hit = dirs.get(path);
      if (hit) return hit;
      const pending = readDirUncached(path);
      dirs.set(path, pending);
      return pending;
    },
    readText(path, maxBytes = DEFAULT_MAX_BYTES) {
      const key = `${maxBytes}:${path}`;
      const hit = texts.get(key);
      if (hit) return hit;
      const pending = readTextUncached(path, maxBytes);
      texts.set(key, pending);
      return pending;
    },
    stat(path) {
      const hit = stats.get(path);
      if (hit) return hit;
      const pending = stat(path)
        .then((info) => ({
          size: info.size,
          isDirectory: info.isDirectory(),
          isFile: info.isFile()
        }))
        .catch(() => null);
      stats.set(path, pending);
      return pending;
    },
    realPath(path) {
      const hit = reals.get(path);
      if (hit) return hit;
      const pending = realpath(path).catch(() => path);
      reals.set(path, pending);
      return pending;
    },
    async exists(path) {
      return (await this.stat(path)) !== null;
    },
    hashFile(path) {
      const hit = hashes.get(path);
      if (hit) return hit;
      const pending = readFile(path)
        .then((buffer) => createHash('sha256').update(buffer).digest('hex'))
        .catch(() => null);
      hashes.set(path, pending);
      return pending;
    }
  };
}

// ---------------------------------------------------------------------------
// In-memory implementation, for the precedence tests
// ---------------------------------------------------------------------------

export interface MemoryFsSpec {
  /** Absolute path to file contents. */
  files?: Record<string, string>;
  /** Absolute paths that exist as directories with no listable content of their own. */
  dirs?: string[];
  /** Absolute path to the absolute path it really is. Applied transitively. */
  links?: Record<string, string>;
}

/**
 * A filesystem in a record literal. Directory listings are derived from the
 * file paths, so a test writes only the files it cares about and gets the
 * directory structure for free.
 */
export function createMemoryContextFs(spec: MemoryFsSpec): ContextFs {
  const files = new Map(Object.entries(spec.files ?? {}));
  const links = new Map(Object.entries(spec.links ?? {}));
  const dirs = new Set(spec.dirs ?? []);
  for (const path of files.keys()) {
    let parent = path;
    for (;;) {
      const cut = parent.lastIndexOf('/');
      if (cut <= 0) break;
      parent = parent.slice(0, cut);
      dirs.add(parent);
    }
  }

  /** A link on the leaf OR on any ancestor moves the path, transitively. */
  function real(path: string): string {
    let current = path;
    for (let hop = 0; hop < 8; hop += 1) {
      const exact = links.get(current);
      if (exact) {
        current = exact;
        continue;
      }
      let moved = false;
      for (const [from, to] of links) {
        if (current.startsWith(`${from}/`)) {
          current = to + current.slice(from.length);
          moved = true;
          break;
        }
      }
      if (!moved) return current;
    }
    return current;
  }

  return {
    async readDir(path) {
      const dir = real(path);
      if (!dirs.has(dir)) return null;
      const seen = new Map<string, ContextDirEntry>();
      const prefix = `${dir}/`;
      for (const candidate of [...files.keys(), ...dirs]) {
        if (!candidate.startsWith(prefix)) continue;
        const rest = candidate.slice(prefix.length);
        const name = rest.split('/')[0];
        if (!name) continue;
        const child = prefix + name;
        seen.set(name, {
          name,
          isDirectory: dirs.has(child),
          isFile: files.has(child),
          isSymbolicLink: links.has(child)
        });
      }
      for (const [from] of links) {
        if (!from.startsWith(prefix)) continue;
        const name = from.slice(prefix.length);
        if (name.includes('/')) continue;
        const target = real(from);
        seen.set(name, {
          name,
          isDirectory: dirs.has(target),
          isFile: files.has(target),
          isSymbolicLink: true
        });
      }
      return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
    async readText(path) {
      return files.get(real(path)) ?? null;
    },
    async stat(path) {
      const target = real(path);
      const text = files.get(target);
      if (text !== undefined) {
        return { size: Buffer.byteLength(text), isDirectory: false, isFile: true };
      }
      if (dirs.has(target)) return { size: 0, isDirectory: true, isFile: false };
      return null;
    },
    async realPath(path) {
      return real(path);
    },
    async exists(path) {
      return (await this.stat(path)) !== null;
    },
    async hashFile(path) {
      const text = files.get(real(path));
      if (text === undefined) return null;
      return createHash('sha256').update(text).digest('hex');
    }
  };
}

/** `dir/name`, with the separator this module uses everywhere. */
export function child(dir: string, name: string): string {
  return join(dir, name);
}
