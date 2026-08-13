/**
 * lock.ts — the skills lock files: where they are, what they hold, and the one
 * guard that has to run before any write.
 *
 * ## The guard, and its direction, which is the opposite of what it looks like
 *
 * A NEWER lock is safe. A CLI at schema 3 reading a lock at schema 99 preserves
 * the version, preserves unknown top-level keys and preserves unknown fields
 * inside each skill entry. Measured in an isolated home on 2026-08-12.
 *
 * **An OLDER lock is the destructive one.** `readSkillLock` at dist/cli.mjs
 * line 3484 is:
 *
 *     if (typeof parsed.version !== "number" || !parsed.skills) return createEmptyLockFile();
 *     if (parsed.version < CURRENT_VERSION) return createEmptyLockFile();
 *
 * with `CURRENT_VERSION = 3`. One `skills add` against a lock at version 2
 * destroyed three tracked entries and left one. The skill folders survive on
 * disk, but every `source` and `skillFolderHash` in the discarded entries is
 * gone, and a skill with no hash can never be checked for an update again.
 *
 * So: before any write, read the lock at the path the CLI would use. If its
 * version is BELOW what the bundled CLI writes, or if it exists and does not
 * parse into `{version: number, skills: object}` — which the first line above
 * discards just as readily — do not run the write. Tell the user their file was
 * last written by an older tool and that continuing would drop the update pins.
 *
 * The project lock, `skills-lock.json` at the project root, has its own counter
 * at 1 today and the same discard behaviour at line 911.
 *
 * The operator's lock is at version 3 with 15 tracked skills, which is the
 * version the pinned CLI writes, so nothing is at risk right now. **The guard
 * is for the next pin bump, which is when it fires.**
 *
 * ## The two hashes, which are different things
 *
 * `skillFolderHash` in the lock is the hash of the skill AT ITS SOURCE, and for
 * a GitHub source it is a git tree object id taken from the repository listing.
 * It is what `skills update` compares to decide whether an update exists. It is
 * NOT a hash of what is on disk, so it cannot answer "has this file changed
 * under me".
 *
 * **A local-directory install writes no lock entry at all.** Verified on
 * 2026-08-12 by installing a skill from a directory into an isolated home: the
 * skill folder and the agent symlinks appeared and no lock file was created.
 * The reason is at dist/cli.mjs line 4867, where the whole lock-writing block
 * is guarded by `normalizedSource`, which a local path does not produce. So a
 * skill installed from a directory has no pin, `skills update` can never check
 * it, and Tortie's own local hash below is the only thing that can tell the
 * user it changed. That is not an edge case: 10 of 25 skills on the operator's
 * machine already have no lock entry.
 *
 * {@link computeSkillFolderHash} is the local one, and it is a deliberate
 * byte-for-byte mirror of the CLI's own function at dist/cli.mjs line 944: a
 * sha256 over every file in the folder, sorted by relative path, updating the
 * path and then the bytes, skipping `.git` and `node_modules`. It is mirrored
 * rather than invented so that the value Tortie records at install and the
 * value the CLI writes for a local source are the same number. That is what
 * makes the pin-and-re-check requirement checkable: record it at install,
 * re-hash on refresh, and a changed hash disables the item and asks again.
 */

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';

/**
 * What the bundled CLI writes. Read out of dist/cli.mjs on 2026-08-12:
 * `CURRENT_VERSION = 3` at line 3478, `CURRENT_VERSION$1 = 1` at line 900.
 * build/skills-release.json carries the same two numbers, and
 * `__tests__/lock.test.ts` asserts the two files agree, so a pin bump that
 * changes the schema cannot land with a stale guard.
 */
export const GLOBAL_LOCK_VERSION = 3;
export const PROJECT_LOCK_VERSION = 1;

/** The directory every agent shares. `.agents` at dist/cli.mjs line 3476. */
const AGENTS_DIR = '.agents';
const GLOBAL_LOCK_FILE = '.skill-lock.json';
const PROJECT_LOCK_FILE = 'skills-lock.json';

/** Directory names the CLI's own file walk skips. Mirrored exactly. */
const HASH_SKIP_DIRS = new Set(['.git', 'node_modules']);

/**
 * `SkillsScope` and `LockGuardVerdict` are DECLARED IN `src/shared/skills.ts`
 * and re-exported here. The verdict is shown to a person in the confirm, so it
 * crosses IPC and cannot be declared twice.
 */
export type { LockGuardVerdict, SkillsScope } from '@shared/skills';

import type { LockGuardVerdict, SkillsScope } from '@shared/skills';

/** One tracked skill, as the CLI writes it. Unknown fields are preserved. */
export interface SkillLockEntry {
  readonly source?: string;
  readonly sourceType?: string;
  readonly sourceUrl?: string;
  readonly ref?: string;
  readonly skillPath?: string;
  /** The hash AT THE SOURCE. See the header: not a hash of the local folder. */
  readonly skillFolderHash?: string;
  readonly pluginName?: string;
  readonly installedAt?: string;
  readonly updatedAt?: string;
}

export interface SkillLockRead {
  readonly path: string;
  readonly present: boolean;
  /** False when the file exists but the CLI would discard it. */
  readonly usable: boolean;
  readonly version: number | null;
  readonly skills: Readonly<Record<string, SkillLockEntry>>;
  /** Why it is unusable. Null when it is fine or simply absent. */
  readonly problem: string | null;
}

/**
 * `$XDG_STATE_HOME/skills/.skill-lock.json`, else `~/.agents/.skill-lock.json`.
 * Mirrors `getSkillLockPath` at dist/cli.mjs line 3479 exactly, including the
 * env variable, because a guard that reads a different file than the CLI writes
 * is worse than no guard.
 */
export function globalLockPath(env: NodeJS.ProcessEnv = process.env): string {
  const xdg = env['XDG_STATE_HOME'];
  if (xdg !== undefined && xdg.length > 0) return join(xdg, 'skills', GLOBAL_LOCK_FILE);
  const home = env['HOME'];
  return join(home !== undefined && home.length > 0 ? home : homedir(), AGENTS_DIR, GLOBAL_LOCK_FILE);
}

/** `<projectRoot>/skills-lock.json`. */
export function projectLockPath(projectRoot: string): string {
  return join(projectRoot, PROJECT_LOCK_FILE);
}

/**
 * Read a lock the way the CLI reads it, and report what the CLI would DO with
 * it. Never throws: an unreadable lock is a verdict, not an exception.
 */
export function readSkillLockFile(path: string): SkillLockRead {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { path, present: false, usable: true, version: null, skills: {}, problem: null };
    }
    return {
      path,
      present: true,
      usable: false,
      version: null,
      skills: {},
      problem: `it could not be read (${(err as Error).message})`
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      path,
      present: true,
      usable: false,
      version: null,
      skills: {},
      problem: `it is not valid JSON (${(err as Error).message})`
    };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { path, present: true, usable: false, version: null, skills: {}, problem: 'it is not an object' };
  }
  const record = parsed as Record<string, unknown>;
  const version = record['version'];
  const skills = record['skills'];
  if (typeof version !== 'number') {
    return {
      path,
      present: true,
      usable: false,
      version: null,
      skills: {},
      problem: 'it carries no numeric version, so the CLI would discard everything in it'
    };
  }
  if (typeof skills !== 'object' || skills === null || Array.isArray(skills)) {
    return {
      path,
      present: true,
      usable: false,
      version,
      skills: {},
      problem: 'it carries no skills object, so the CLI would discard everything in it'
    };
  }
  return {
    path,
    present: true,
    usable: true,
    version,
    skills: skills as Record<string, SkillLockEntry>,
    problem: null
  };
}

export interface LockGuardOptions {
  readonly scope: SkillsScope;
  /** Required for project scope. Ignored for global scope. */
  readonly projectRoot?: string;
  /** The same env object the spawn will get. */
  readonly env?: NodeJS.ProcessEnv;
  /** Overrides for a test, or for a future pin whose schema moved. */
  readonly writesVersion?: number;
}

/**
 * Decide whether a write may run. The only thing that blocks is a lock the CLI
 * would DISCARD, which is a lock older than the one it writes, or one it cannot
 * parse. A newer lock is left alone and reported as safe, because the CLI
 * preserves it whole.
 */
export function checkLockGuard(options: LockGuardOptions): LockGuardVerdict {
  const path =
    options.scope === 'global'
      ? globalLockPath(options.env ?? process.env)
      : projectLockPath(options.projectRoot ?? '.');
  const writesVersion =
    options.writesVersion ??
    (options.scope === 'global' ? GLOBAL_LOCK_VERSION : PROJECT_LOCK_VERSION);

  const read = readSkillLockFile(path);
  if (!read.present) {
    return { safe: true, path, foundVersion: null, writesVersion, entriesAtRisk: 0, message: null };
  }
  if (!read.usable) {
    return {
      safe: false,
      path,
      foundVersion: read.version,
      writesVersion,
      entriesAtRisk: 0,
      message:
        `Tortie did not run this, because ${path} could not be read as a skills lock file: ` +
        `${read.problem ?? 'the reason is unknown'}. The skills CLI would replace it with an ` +
        `empty one, and every update pin in it would be gone. Fix or move that file first.`
    };
  }
  if (read.version !== null && read.version < writesVersion) {
    const entries = Object.keys(read.skills).length;
    return {
      safe: false,
      path,
      foundVersion: read.version,
      writesVersion,
      entriesAtRisk: entries,
      message:
        `Tortie did not run this. The skills CLI it carries writes lock format ${writesVersion}, ` +
        `and ${path} is at format ${read.version}, which an older tool wrote. Running the ` +
        `command would replace that file with an empty one and drop the update pins for ` +
        `${entries} skill${entries === 1 ? '' : 's'}. The skill folders would stay on disk, but ` +
        `a skill with no pin can never be checked for an update again.`
    };
  }
  return {
    safe: true,
    path,
    foundVersion: read.version,
    writesVersion,
    entriesAtRisk: 0,
    message: null
  };
}

/**
 * The guard that actually runs before a write, and it checks BOTH locks.
 *
 * A project-scope `add` writes the project lock, not the global one. It can
 * still write the GLOBAL lock, because the CLI's prompt-dismissal path
 * (`dismissPrompt` at dist/cli.mjs line 3557) calls `writeSkillLock`
 * unconditionally, and `writeSkillLock` writes back whatever `readSkillLock`
 * returned. If that read discarded an old file, the write persists the empty
 * one. So an old global lock is at risk during a project operation too, and the
 * cheap answer is to read both files and block on either.
 *
 * Blocking a project install because the global lock is old is deliberate. It
 * is reversible, it names the file, and the alternative is losing every update
 * pin the user has.
 */
export function checkLocksBeforeWrite(options: LockGuardOptions): LockGuardVerdict {
  const global = checkLockGuard({ ...options, scope: 'global' });
  if (!global.safe) return global;
  if (options.scope !== 'project') return global;
  return checkLockGuard({ ...options, scope: 'project' });
}

/**
 * Every skill in the global lock and its recorded source pin. This is the "Read
 * the pin for a skill" row of the command table, and it is a direct file read
 * rather than a CLI call on purpose.
 *
 * A skill missing from this map has no pin, which means `skills update` can
 * never check it. That is the common case rather than an edge: 10 of 25 skills
 * on the operator's machine have no lock entry at all.
 */
export function readSkillPins(env: NodeJS.ProcessEnv = process.env): SkillLockRead {
  return readSkillLockFile(globalLockPath(env));
}

/** The same, for a project's own lock. Absent for most projects. */
export function readProjectSkillPins(projectRoot: string): SkillLockRead {
  return readSkillLockFile(projectLockPath(projectRoot));
}

// ---------------------------------------------------------------------------
// The local content hash
// ---------------------------------------------------------------------------

interface HashedFile {
  readonly relativePath: string;
  readonly content: Buffer;
}

async function collectFiles(baseDir: string, currentDir: string, out: HashedFile[]): Promise<void> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const full = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (HASH_SKIP_DIRS.has(entry.name)) return;
        await collectFiles(baseDir, full, out);
      } else if (entry.isFile()) {
        out.push({
          relativePath: relative(baseDir, full).split('\\').join('/'),
          content: await readFile(full)
        });
      }
    })
  );
}

/**
 * The hash of a skill folder AS IT IS ON DISK. A byte-for-byte mirror of the
 * CLI's `computeSkillFolderHash` (dist/cli.mjs line 944) — sha256, files sorted
 * by relative path with `localeCompare`, updating the path then the bytes,
 * skipping `.git` and `node_modules`, and following no symlinks because
 * `isFile()` and `isDirectory()` are both false for a link.
 *
 * Mirrored rather than invented so the number Tortie records at install equals
 * the number the CLI writes for a local source. Null when the folder cannot be
 * read, which the caller must treat as "unknown", never as "unchanged".
 */
export async function computeSkillFolderHash(skillDir: string): Promise<string | null> {
  const files: HashedFile[] = [];
  try {
    await collectFiles(skillDir, skillDir, files);
  } catch {
    return null;
  }
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file.relativePath);
    hash.update(file.content);
  }
  return hash.digest('hex');
}
