/**
 * The pin, and the re-check. Requirement 2 of this phase, and the control that
 * makes shipping install at all defensible.
 *
 * ## What a pin is, and what it is not
 *
 * A pin is **Tortie's own sha256 of the installed skill directory, taken the
 * moment the install exited 0**. It is stored here, and on every refresh the
 * directory is hashed again and the two are compared. A difference disables the
 * item and asks again.
 *
 * It is NOT the skills CLI's `skillFolderHash`, and wiring it to that field was
 * the obvious mistake waiting to be made. For a GitHub-sourced skill the lock
 * records a 40-character git tree id, e.g.
 * `76a98a285cb0434f3d39e1a873823556330e398b`, while Tortie's hash of the same
 * folder is 64 hex characters of sha256, e.g. `913b9d37d0d5…`. They can never
 * be equal, so a re-check wired to the lock would report "changed" for every
 * GitHub skill forever, the control would be noise, and a user would learn to
 * ignore it. The two answer different questions over different inputs and this
 * module never compares them.
 *
 * ## Where it lives, and why not the manifest
 *
 * `<userData>/gmux/skill-pins.json`, plain JSON with an atomic write-rename,
 * the same posture `settings/store.ts` takes. The manifest is durability-
 * critical state for sessions, and a pin is not: losing this file loses no
 * work. What it loses is the approval record, and the failure mode of a lost
 * pin is that the item has no pin, which reads as "never approved here" rather
 * than as "approved and unchanged". That is the safe direction.
 *
 * ## Three rules
 *
 * 1. **A pin is only ever written after an exit code of 0.** The caller records
 *    it from the install's success path, never from the plan.
 * 2. **A hash that cannot be taken is `null`, and null is treated as CHANGED**
 *    by the gate, never as agreement. The alternative reads an unreadable
 *    directory as consent.
 * 3. **Nothing here writes to an agent's configuration.** It writes one file
 *    inside Tortie's own userData directory and nothing else.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';
import { resolveHomes } from '../context/env';
import { HASH_ALGORITHM, hashDirectory } from '../context/hash';
import { createNodeContextFs, type ContextFs } from '../context/port';

/**
 * Where the CLI puts a skill, resolved ONCE, here.
 *
 * The CLI installs one canonical copy into `~/.agents/skills/<name>` for a
 * global install and `<project>/.agents/skills/<name>` for a project one, then
 * symlinks it into each selected agent's directory. `resolveHomes` is the same
 * function the reader uses, so this is not a second opinion about the layout:
 * `XDG`-style relocation and a moved home are honoured in both places or in
 * neither.
 */
export function canonicalSkillDir(
  name: string,
  scope: 'global' | 'project' = 'global',
  projectRoot?: string
): string | null {
  if (name.length === 0 || name.includes('/') || name.includes('..')) return null;
  if (scope === 'project') {
    if (projectRoot === undefined || projectRoot.length === 0) return null;
    return join(projectRoot, '.agents', 'skills', name);
  }
  return join(resolveHomes(process.env).agents, 'skills', name);
}

/** What Tortie recorded when a human approved one install. */
export interface SkillPin {
  /** Absolute path of the installed skill directory. The key. */
  path: string;
  name: string;
  /** `owner/repo`, or whatever the source was. */
  source: string;
  /** Tortie's own hash of the directory at the moment of approval. */
  hash: string;
  /** Names the algorithm, so a later change invalidates loudly. */
  algorithm: string;
  /** Epoch ms. */
  at: number;
  /** The agents the approved install targeted. */
  agents: string[];
}

/** One pin, re-checked against the bytes on disk right now. */
export interface SkillPinCheck {
  path: string;
  name: string;
  source: string;
  /** What was approved. */
  pinnedHash: string;
  /** What is there now. Null when the directory could not be read. */
  currentHash: string | null;
  pinnedAt: number;
  /** Set when the re-hash failed. One sentence, never a stack trace. */
  problem: string | null;
}

interface PinFile {
  version: 1;
  pins: Record<string, SkillPin>;
}

const EMPTY: PinFile = { version: 1, pins: {} };

function pinPath(): string {
  // The inner `gmux/` directory is one of the identifiers live data is bound
  // to (CLAUDE.md, Phase 16.5). It stays `gmux` and is not "finished off".
  return join(app.getPath('userData'), 'gmux', 'skill-pins.json');
}

function read(): PinFile {
  let raw: string;
  try {
    raw = readFileSync(pinPath(), 'utf8');
  } catch {
    return { version: 1, pins: {} };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return { ...EMPTY };
    const pins = (parsed as { pins?: unknown }).pins;
    if (typeof pins !== 'object' || pins === null || Array.isArray(pins)) return { ...EMPTY };
    const out: Record<string, SkillPin> = {};
    for (const [key, value] of Object.entries(pins as Record<string, unknown>)) {
      if (typeof value !== 'object' || value === null) continue;
      const row = value as Record<string, unknown>;
      if (typeof row['hash'] !== 'string' || row['hash'].length === 0) continue;
      out[key] = {
        path: typeof row['path'] === 'string' ? row['path'] : key,
        name: typeof row['name'] === 'string' ? row['name'] : key,
        source: typeof row['source'] === 'string' ? row['source'] : '',
        hash: row['hash'],
        algorithm:
          typeof row['algorithm'] === 'string' ? row['algorithm'] : HASH_ALGORITHM.full,
        at: typeof row['at'] === 'number' ? row['at'] : 0,
        agents: Array.isArray(row['agents'])
          ? row['agents'].filter((a): a is string => typeof a === 'string')
          : []
      };
    }
    return { version: 1, pins: out };
  } catch {
    // A pin file that will not parse is treated as no pins, which disables
    // nothing and approves nothing. It is never repaired in place.
    return { ...EMPTY };
  }
}

function write(file: PinFile): void {
  const path = pinPath();
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

/**
 * Record the pin for one installed skill. Called ONLY from the success path of
 * an install that exited 0.
 *
 * Returns null when the directory could not be hashed, because a pin with no
 * hash is not a pin. The caller says so rather than storing a placeholder that
 * would later compare equal to nothing.
 */
export async function recordSkillPin(
  input: { path: string; name: string; source: string; agents: readonly string[] },
  deps: { fs?: ContextFs } = {}
): Promise<SkillPin | null> {
  const fs = deps.fs ?? createNodeContextFs();
  const hash = await hashDirectory(fs, input.path);
  if (hash === null) return null;
  const pin: SkillPin = {
    path: input.path,
    name: input.name,
    source: input.source,
    hash,
    algorithm: HASH_ALGORITHM.full,
    at: Date.now(),
    agents: [...input.agents]
  };
  const file = read();
  file.pins[input.path] = pin;
  write(file);
  return pin;
}

/** Drop a pin. Called after a remove, so a reinstall is approved afresh. */
export function forgetSkillPin(path: string): void {
  const file = read();
  if (file.pins[path] === undefined) return;
  delete file.pins[path];
  write(file);
}

/**
 * Re-hash every pinned path the caller asks about and report both hashes.
 *
 * Paths with no pin are simply absent from the result: the panel has nothing to
 * say about a skill nobody approved through Tortie, and inventing a pin for one
 * would disable rows the user installed with their own terminal.
 */
export async function checkSkillPins(
  paths: readonly string[],
  deps: { fs?: ContextFs } = {}
): Promise<SkillPinCheck[]> {
  const fs = deps.fs ?? createNodeContextFs();
  const file = read();
  const out: SkillPinCheck[] = [];
  for (const path of paths) {
    const pin = file.pins[path];
    if (pin === undefined) continue;
    let currentHash: string | null = null;
    let problem: string | null = null;
    try {
      currentHash = await hashDirectory(fs, path);
    } catch (err) {
      currentHash = null;
      problem = err instanceof Error ? err.message : String(err);
    }
    out.push({
      path,
      name: pin.name,
      source: pin.source,
      pinnedHash: pin.hash,
      currentHash,
      pinnedAt: pin.at,
      problem:
        currentHash === null
          ? `Tortie could not re-read ${path} to check it against what you approved.${
              problem === null ? '' : ` ${problem}`
            }`
          : null
    });
  }
  return out;
}

/** Every pin on record. For diagnostics and for the tests. */
export function allSkillPins(): SkillPin[] {
  return Object.values(read().pins);
}
