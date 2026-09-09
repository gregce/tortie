/**
 * The baseline store — `<userData>/gmux/baselines/` (Phase 243).
 *
 * Where the redline's shadow baseline goes so that it outlives the tab. Read
 * `src/shared/baselines.ts` first: it says what a baseline is, and it says the
 * one thing this module must never let a person believe, which is that this is
 * a backup. It is not. Losing everything in this directory loses the
 * NARROWING and nothing on disk.
 *
 * ## The layout, and why it is this one
 *
 *     <dir>/<key>.json          the record: what the newest bodies are and
 *                               what the face should say about them
 *     <dir>/<key>.body.000001   one generation of the body
 *
 * `<key>` is `<16 hex of sha256(repoPath)>-<16 hex of sha256(relPath)>`, so no
 * byte of a person's path ever becomes a path inside their data directory.
 * The record carries the two plain strings, and a record whose strings do not
 * hash to the name it was found under is dropped WHOLE with the field and the
 * reason named, which is this codebase's standing rule for a bad row.
 *
 * ## The order of operations, which is the part that is easy to get backwards
 *
 * It is `src/main/durable`'s, step for step, and `src/main/restore/snapshots.ts`
 * is the sibling that already does it:
 *
 *   1. Write the new generation of the body and flush its directory.
 *   2. Write the record naming it. The record may never become durable before
 *      step 1 returned, and `writeDurable` returns only after the directory
 *      flush, so this line running at all is the proof of that ordering.
 *   3. Only then prune. Pruning before the record commits puts back the single
 *      point of failure generations exist to remove.
 *
 * A crash anywhere in that sequence leaves the OLD record and the OLD body, or
 * the new pair, and never neither and never half: the record is published by a
 * rename, so a reader sees one whole record or the other, and the body is
 * written under a generation of its own and never over the one in use.
 *
 * ## The ring is TWO, and the reason is that the ladder is never walked
 *
 * `SNAPSHOT_GENERATIONS = 3` next door has a third rung because for a snapshot
 * the body is the ONLY copy of a scrollback. For a baseline the body is a
 * previous state of a file whose current state is on disk, so the fallback is
 * not older bytes, it is today's behaviour — the redline against HEAD, which
 * is what shipped before any of this and costs nothing. Generation `g-1` of a
 * baseline is a baseline the rule has already moved past, usually because the
 * person accepted, so offering it would re-mark text they accepted. So: keep
 * two, so a crash inside a write never leaves a key with nothing, and hand the
 * reader ONE record, the newest (research 106 §3.2). Two is the product's own
 * floor for a ring already: `writeManifestBackup` clamps with
 * `Math.max(2, ...)`.
 *
 * ## The ceiling, and why the ring is not it
 *
 * The ring bounds ONE key. Nothing in the mechanism bounds the NUMBER of keys,
 * and the number of keys is where the disk goes: the operator's eleven local
 * projects hold 2,098 redline-eligible prose files at 165.8 MB, while his real
 * seven-day working set is 67 files and 5.19 MB. So the store takes the shape
 * `src/main/drop/store.ts` already ships next door — an age bound, a directory
 * ceiling, oldest first — with two of its numbers changed. See the constants.
 */

import { createHash } from 'node:crypto';
import { readFile, readdir, rm, stat } from 'node:fs/promises';
import { isAbsolute, join, sep } from 'node:path';
import {
  READ_CAP_BYTES
} from '@shared/fs-ops';
import type {
  BaselineKey,
  BaselineLoadResult,
  BaselineRefusal,
  BaselineStoreInput,
  BaselineStoreResult,
  StoredBaselineOrigin
} from '@shared/baselines';
import { isProsePath } from '@shared/prose-paths';
import {
  generationPath,
  listGenerations,
  pruneGenerations,
  readVerified,
  writeDurable,
  type DurableFs,
  type DurableRecord
} from '../durable';

/**
 * Bodies kept per key. TWO, and never the three next door — see the header.
 */
export const BASELINE_GENERATIONS = 2;

/**
 * How long a record is offered before it is swept.
 *
 * SEVEN DAYS, the drop store's number, and read against research 106 §2.2: by
 * seven days the file's own committed version has moved for 77.7% of active
 * files, so the age bound almost never binds a TRACKED file. What it binds is
 * the untracked file, which has no HEAD version and therefore no credibility
 * check at all, and that is the case it exists for.
 */
export const BASELINE_MAX_AGE_MS = 7 * 24 * 3600_000;

/**
 * Directory ceiling; the oldest records go first once it is exceeded.
 *
 * 32 MB, against the drop store's 200. It is SMALLER than the operator's
 * `snapshots/` is today (33.8 MB), it is 3x what his real seven-day working
 * set costs at ring 2 (10.4 MB), and it holds about a thousand of his ordinary
 * prose files. If it is ever raised, it is raised in the same commit as the
 * measurement that justifies it.
 */
export const BASELINE_MAX_DIR_BYTES = 32 * 1024 * 1024;

/**
 * The largest baseline generation a record or a request may carry.
 *
 * PHASE 243'S FIX ROUND. Every other field here had a bound and this one had
 * only "a whole number, not negative", which is the field Phase 227's press
 * guard is bound to: `redline-write.ts` refuses a rewind when the drawn
 * generation is not the tab's, and `nextBaseline` moves the tab's by adding
 * one. In float64 addition has a FIXED POINT — `2 ** 53 + 1 === 2 ** 53` — so
 * a planted record at `Number.MAX_SAFE_INTEGER` gave a tab a generation that
 * stops moving after one step, and from then on a rewind drawn against stale
 * bytes passes a guard that can no longer see the baseline move.
 *
 * A BILLION rather than 2^53, because it is a number this product can reach
 * and 2^53 is not: a generation moves on an agent's write, a read seed or an
 * accept, so a billion is more moves than a tab could take if one landed every
 * millisecond for eleven days. Above it is a planted number, and a planted
 * number is dropped whole with the field named, like every other bad row.
 */
export const BASELINE_MAX_GENERATION = 1_000_000_000;

/** Sweep cadence for a long-running app, the drop store's, unchanged. */
export const BASELINE_PRUNE_INTERVAL_MS = 24 * 3600_000;

/**
 * The shortest gap between two sweeps a write may trigger.
 *
 * The per-key ring is pruned after every record commits, which is one stem and
 * costs a readdir. The DIRECTORY sweep stats every file, so a write triggers it
 * at most this often and the 24 hour timer does the rest.
 */
export const BASELINE_SWEEP_MIN_MS = 5 * 60_000;

/** Suffix of the record file. */
const RECORD_SUFFIX = '.json';
/** Suffix of the body stem, so a body reads `<key>.body.000001`. */
const BODY_STEM_SUFFIX = '.body';
/** The record format. A row of another version is dropped whole. */
const RECORD_VERSION = 1;

const ORIGINS: readonly StoredBaselineOrigin[] = ['commit', 'read', 'accept'];

/** One generation of one key, as the record names it. */
interface BaselineEntry {
  generation: number;
  path: string;
  bytes: number;
  sha256: string;
  origin: StoredBaselineOrigin;
  /** The TAB's baseline generation, which every press is bound to. */
  baselineGeneration: number;
  takenAt: number | null;
  acceptedAt: number | null;
  storedAt: number;
}

/** The record file for one key, newest entry first. */
interface BaselineRecordFile {
  version: number;
  repoPath: string;
  relPath: string;
  entries: BaselineEntry[];
}

/** What a body file holds. The record's sha256 covers the whole of it. */
interface BaselineBody {
  text: string;
  /**
   * The HEAD bytes, or null. Omitted when it is the same string as `text`,
   * which is the common case (an origin of `commit` is HEAD), so the ordinary
   * record is not written twice.
   */
  headSeen?: string | null;
  /** True when `headSeen` was omitted because it equals `text`. */
  headSeenIsText?: boolean;
}

/** Sixteen hex of the sha256 of one string. */
function digest16(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 16);
}

/** The file-name key for one `(repoPath, relPath)` pair. */
export function baselineKeyName(repoPath: string, relPath: string): string {
  return `${digest16(repoPath)}-${digest16(relPath)}`;
}

function refusedLoad(refused: BaselineRefusal, reason: string): BaselineLoadResult {
  return { found: false, refused, reason };
}

function refusedStore(refused: BaselineRefusal, reason: string): BaselineStoreResult {
  return { stored: false, refused, reason };
}

/** What the store needs from the rest of main, injected so it can be driven. */
export interface BaselineStoreDeps {
  /** The directory the store owns. */
  dir: string;
  /**
   * The open project folders, real paths. The store refuses any repository
   * that is not one of them, which is the same gate every file mutation asks
   * and is what keeps a renderer bug from making a key for the whole disk.
   */
  listProjectRoots(): Promise<readonly string[]>;
  /** Resolve a caller's spelling of a root to its real path, or throw. */
  realRootOf(root: string): Promise<string>;
  now?(): number;
  /**
   * The three seams below are INJECTED FOR THE GATE and production leaves them
   * out, exactly as `DurableWriteOptions.fs` is. `conformance:redline` drives
   * this module over a real directory on a real disk with a filesystem that
   * fails at one named step, and over a ceiling small enough to reach without
   * writing 32 MB; the shipped constants are pinned by the same rule, so a
   * number that moves is a number the gate names.
   */
  fs?: DurableFs;
  maxDirBytes?: number;
  maxAgeMs?: number;
}

/**
 * The shape of the key, checked before anything is opened.
 *
 * A relative path is refused when it is absolute, when any segment is `..`, or
 * when it holds a NUL — the three shapes that would make a key for a file the
 * caller did not name. The path is never used to compose a file name, so this
 * is a check on the KEY's honesty rather than a containment; the containment
 * is `realRootOf` plus the open-project list below.
 */
function keyProblem(key: Partial<BaselineKey> | null | undefined): string | null {
  if (key === null || typeof key !== 'object') return 'the request was not a request';
  if (typeof key.repoPath !== 'string' || key.repoPath.length === 0) {
    return 'repoPath: a project folder is required';
  }
  if (!isAbsolute(key.repoPath)) return 'repoPath: must be an absolute path';
  if (typeof key.relPath !== 'string' || key.relPath.length === 0) {
    return 'relPath: a file inside the project is required';
  }
  if (isAbsolute(key.relPath)) return 'relPath: must be relative to the project';
  if (key.relPath.includes('\0') || key.repoPath.includes('\0')) {
    return 'relPath: a path may not hold a NUL';
  }
  const segments = key.relPath.split(/[/\\]/);
  if (segments.some((s) => s === '..')) return 'relPath: may not leave the project';
  if (key.machineId !== null && key.machineId !== undefined) {
    return 'machineId: a baseline belongs to this Mac';
  }
  return null;
}

/** The record file's path for one key. */
function recordPathOf(dir: string, keyName: string): string {
  return join(dir, `${keyName}${RECORD_SUFFIX}`);
}

/** The body stem for one key. */
function bodyStemOf(keyName: string): string {
  return `${keyName}${BODY_STEM_SUFFIX}`;
}

/**
 * The record at this path, or the reason it was dropped.
 *
 * DROPPED WHOLE, NEVER PARTIALLY MERGED. Every field is checked, the two
 * plain strings must hash back to the name the file was found under, and any
 * one failure answers a reason naming the field. A half-read record would put
 * a baseline in front of a person that belongs to a different file.
 */
function parseRecord(
  raw: string,
  keyName: string,
  dir: string
): { record: BaselineRecordFile } | { dropped: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { dropped: 'the record is not JSON' };
  }
  const file = parsed as Partial<BaselineRecordFile> | null;
  if (file === null || typeof file !== 'object') return { dropped: 'the record is not an object' };
  if (file.version !== RECORD_VERSION) {
    return { dropped: `version: ${String(file.version)} is not ${String(RECORD_VERSION)}` };
  }
  if (typeof file.repoPath !== 'string' || typeof file.relPath !== 'string') {
    return { dropped: 'repoPath/relPath: the record does not say which file it is' };
  }
  if (baselineKeyName(file.repoPath, file.relPath) !== keyName) {
    return { dropped: 'repoPath/relPath: the record names a different file than its own name' };
  }
  if (!Array.isArray(file.entries)) return { dropped: 'entries: not a list' };
  const entries: BaselineEntry[] = [];
  for (const candidate of file.entries) {
    const entry = candidate as Partial<BaselineEntry> | null;
    if (entry === null || typeof entry !== 'object') return { dropped: 'entries: a row is not an object' };
    if (!Number.isInteger(entry.generation) || (entry.generation as number) < 1) {
      return { dropped: 'entries.generation: not a whole number above zero' };
    }
    // THE PATH IS DERIVED AND NEVER TRUSTED. A record is a file in a
    // directory, and a row naming a path of its own would make the reader open
    // whatever it named — a hostile record could point at any file on the disk
    // and be answered about it. The only path a row may carry is the one this
    // key's own generation would have.
    if (
      typeof entry.path !== 'string' ||
      entry.path !== generationPath(dir, bodyStemOf(keyName), entry.generation as number)
    ) {
      return { dropped: 'entries.path: not this key\'s own generation' };
    }
    if (!Number.isInteger(entry.bytes) || (entry.bytes as number) < 0) {
      return { dropped: 'entries.bytes: not a byte count' };
    }
    if (typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(entry.sha256)) {
      return { dropped: 'entries.sha256: not a sha256' };
    }
    if (!ORIGINS.includes(entry.origin as StoredBaselineOrigin)) {
      return { dropped: `entries.origin: ${String(entry.origin)} is not one of the three` };
    }
    if (
      !Number.isInteger(entry.baselineGeneration) ||
      (entry.baselineGeneration as number) < 0 ||
      (entry.baselineGeneration as number) > BASELINE_MAX_GENERATION
    ) {
      return { dropped: 'entries.baselineGeneration: not a generation' };
    }
    if (!Number.isFinite(entry.storedAt) || (entry.storedAt as number) <= 0) {
      return { dropped: 'entries.storedAt: not a moment' };
    }
    if (entry.takenAt !== null && !Number.isFinite(entry.takenAt)) {
      return { dropped: 'entries.takenAt: not a moment' };
    }
    if (entry.acceptedAt !== null && !Number.isFinite(entry.acceptedAt)) {
      return { dropped: 'entries.acceptedAt: not a moment' };
    }
    entries.push(entry as BaselineEntry);
  }
  entries.sort((a, b) => b.generation - a.generation);
  return {
    record: {
      version: RECORD_VERSION,
      repoPath: file.repoPath,
      relPath: file.relPath,
      entries
    }
  };
}

/** The body a verified read returned, or null when it is not a body. */
function parseBody(data: Buffer): BaselineBody | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data.toString('utf8'));
  } catch {
    return null;
  }
  const body = parsed as Partial<BaselineBody> | null;
  if (body === null || typeof body !== 'object') return null;
  if (typeof body.text !== 'string') return null;
  if (body.headSeenIsText === true) return { text: body.text, headSeen: body.text };
  if (body.headSeen !== null && typeof body.headSeen !== 'string') return null;
  return { text: body.text, headSeen: body.headSeen ?? null };
}

export interface BaselineStore {
  load(key: BaselineKey): Promise<BaselineLoadResult>;
  store(input: BaselineStoreInput): Promise<BaselineStoreResult>;
  /** The age bound and the directory ceiling, oldest `storedAt` first. */
  sweep(now?: number): Promise<{ removed: string[]; bytes: number }>;
  /** The directory this store owns. */
  dir: string;
}

export function createBaselineStore(deps: BaselineStoreDeps): BaselineStore {
  const dir = deps.dir;
  const clock = deps.now ?? Date.now;
  // A store does not sweep on its first write. The boot sweep and the daily
  // timer own the cadence (./ipc startBaselineStorePruning); this throttle is
  // what stops a busy session going a whole day without one.
  let lastSweepAt = clock();
  let sweeping: Promise<unknown> | null = null;

  /**
   * The containment, asked of every call before anything is opened.
   *
   * It is the gate every other mutation asks (`resolveOpenProjectRoot`'s
   * rule, spelled here through the injected pair so this module can be driven
   * under node): the repository must be one Tortie has OPEN, compared as real
   * paths on both sides, and the file must be prose the redline would draw.
   */
  const admit = async (
    key: BaselineKey
  ): Promise<
    | { keyName: string; repoPath: string; relPath: string }
    | { refused: BaselineRefusal; reason: string }
  > => {
    const problem = keyProblem(key);
    if (problem !== null) {
      return {
        refused: key?.machineId != null ? 'remote' : 'input',
        reason: problem
      };
    }
    if (!isProsePath(key.relPath)) {
      return { refused: 'prose', reason: `relPath: ${key.relPath} is not a file the redline draws` };
    }
    let realRoot: string;
    try {
      realRoot = await deps.realRootOf(key.repoPath);
    } catch {
      return { refused: 'outside', reason: 'repoPath: that folder could not be resolved' };
    }
    const roots = await deps.listProjectRoots();
    let open = false;
    for (const candidate of roots) {
      try {
        if ((await deps.realRootOf(candidate)) === realRoot) {
          open = true;
          break;
        }
      } catch {
        // A project folder that has since gone away is not a match.
      }
    }
    if (!open) {
      return { refused: 'outside', reason: 'repoPath: that folder is not an open project' };
    }
    // The key is composed from the REAL root, so two spellings of one project
    // share one record rather than making two, and the record carries THESE
    // two strings so it hashes back to its own name.
    const relPath = key.relPath.split(sep).join('/');
    return {
      keyName: baselineKeyName(realRoot, relPath),
      repoPath: realRoot,
      relPath
    };
  };

  const readRecord = async (
    keyName: string
  ): Promise<{ record: BaselineRecordFile } | { dropped: string } | null> => {
    let raw: string;
    try {
      raw = await readFile(recordPathOf(dir, keyName), 'utf8');
    } catch {
      return null;
    }
    return parseRecord(raw, keyName, dir);
  };

  const load = async (key: BaselineKey): Promise<BaselineLoadResult> => {
    const admitted = await admit(key);
    if ('refused' in admitted) return refusedLoad(admitted.refused, admitted.reason);
    const found = await readRecord(admitted.keyName);
    if (found === null) return refusedLoad('missing', 'nothing is stored for this file');
    if ('dropped' in found) return refusedLoad('record', found.dropped);
    // ONE RECORD, THE NEWEST, AND NEVER THE LADDER. See the header: an older
    // generation is a baseline the rule has already moved past, and the real
    // fallback is today's redline against the last commit.
    const newest = found.record.entries[0];
    if (newest === undefined) return refusedLoad('missing', 'the record names no generation');
    const record: DurableRecord = {
      path: newest.path,
      bytes: newest.bytes,
      sha256: newest.sha256
    };
    const verified = await readVerified([record], deps.fs);
    if (verified === null) {
      return refusedLoad('io', 'the stored bytes did not prove out against the record');
    }
    const body = parseBody(verified.data);
    if (body === null) return refusedLoad('record', 'the stored bytes are not a baseline');
    return {
      found: true,
      baseline: {
        text: body.text,
        headSeen: body.headSeen ?? null,
        origin: newest.origin,
        generation: newest.baselineGeneration,
        takenAt: newest.takenAt,
        acceptedAt: newest.acceptedAt,
        storedAt: newest.storedAt
      }
    };
  };

  const store = async (input: BaselineStoreInput): Promise<BaselineStoreResult> => {
    if (input === null || typeof input !== 'object') {
      return refusedStore('input', 'the request was not a request');
    }
    if (typeof input.text !== 'string') {
      return refusedStore('input', 'text: a baseline is text');
    }
    if (input.headSeen !== null && typeof input.headSeen !== 'string') {
      return refusedStore('input', 'headSeen: the HEAD bytes or null');
    }
    if (!ORIGINS.includes(input.origin)) {
      return refusedStore('input', `origin: ${String(input.origin)} is not one of the three`);
    }
    if (
      !Number.isInteger(input.generation) ||
      input.generation < 0 ||
      input.generation > BASELINE_MAX_GENERATION
    ) {
      return refusedStore('input', 'generation: not a generation');
    }
    // THE TRUNCATED READ, WHICH RESEARCH 106 §3.3 NAMED AND WHICH IS A REAL
    // FILE OF HIS. `loadContents` seeds a baseline from `result.contents` and
    // records `result.truncated` in the same patch without letting the second
    // reach the first, so a file over the read cap would put 5 MB in the store
    // per key for bytes the guarded write already refuses to act on and for a
    // tab Monaco holds read-only.
    if (input.truncated === true) {
      return refusedStore('truncated', 'truncated: the read stopped at the cap, so these are not the file');
    }
    if (Buffer.byteLength(input.text, 'utf8') > READ_CAP_BYTES) {
      return refusedStore('tooLarge', 'text: over the read cap');
    }
    const admitted = await admit(input);
    if ('refused' in admitted) return refusedStore(admitted.refused, admitted.reason);
    const keyName = admitted.keyName;
    const stem = bodyStemOf(keyName);

    const sameAsText = input.headSeen !== null && input.headSeen === input.text;
    const bodyDoc: BaselineBody = sameAsText
      ? { text: input.text, headSeenIsText: true }
      : { text: input.text, headSeen: input.headSeen };
    const payload = Buffer.from(JSON.stringify(bodyDoc), 'utf8');

    const existing = await readRecord(keyName);
    const previous =
      existing !== null && 'record' in existing ? existing.record.entries : [];
    const onDisk = await listGenerations(dir, stem, deps.fs);
    // The number comes off the DISK, so it cannot collide with a body a crash
    // left behind; the survivors come off the RECORD, so the ring never keeps
    // a body nothing vouches for.
    const generation = (onDisk[0]?.generation ?? 0) + 1;
    const path = generationPath(dir, stem, generation);

    let receipt;
    try {
      // Steps 1 to 8. Throws rather than publishing bytes it cannot prove.
      receipt = await writeDurable({ path, data: payload }, { fs: deps.fs });
    } catch (err) {
      return refusedStore('io', sentenceOf(err));
    }
    const now = clock();
    const entry: BaselineEntry = {
      generation,
      path: receipt.path,
      bytes: receipt.bytes,
      sha256: receipt.sha256,
      origin: input.origin,
      baselineGeneration: input.generation,
      takenAt: input.takenAt ?? null,
      acceptedAt: input.acceptedAt ?? null,
      storedAt: now
    };
    const entries = [entry, ...previous].slice(0, BASELINE_GENERATIONS);
    // THE RECORD IS COMPOSED FROM THE ADMITTED KEY'S OWN STRINGS, so it hashes
    // back to its own name: `admit` composed the name from the REAL root, so
    // the record carries that spelling and not the caller's.
    const record: BaselineRecordFile = {
      version: RECORD_VERSION,
      repoPath: admitted.repoPath,
      relPath: admitted.relPath,
      entries
    };
    try {
      // Step 9. It may not become durable before step 8 returned, and
      // `writeDurable` returns only after the body's directory flush, so this
      // line running at all is the proof of that ordering.
      await writeDurable(
        {
          path: recordPathOf(dir, keyName),
          data: Buffer.from(JSON.stringify(record), 'utf8')
        },
        { fs: deps.fs }
      );
    } catch (err) {
      // An unrecorded body is unreadable by design, and leaving it would let
      // it crowd a recorded generation out of the ring. Take it back out.
      await rm(path, { force: true }).catch(() => undefined);
      return refusedStore('io', sentenceOf(err));
    }
    // Step 10, and only now.
    await pruneGenerations(dir, stem, BASELINE_GENERATIONS, {
      recorded: entries.map((e) => e.generation),
      ...(deps.fs === undefined ? {} : { fs: deps.fs })
    }).catch(() => undefined);
    maybeSweep(now);
    return { stored: true, bytes: receipt.bytes };
  };

  /**
   * The directory sweep, at most once every `BASELINE_SWEEP_MIN_MS` on the
   * back of a write. Never awaited by the write: a person's accept does not
   * wait on a stat of every record.
   */
  function maybeSweep(now: number): void {
    if (sweeping !== null) return;
    if (now - lastSweepAt < BASELINE_SWEEP_MIN_MS) return;
    lastSweepAt = now;
    sweeping = sweep(now)
      .catch(() => undefined)
      .finally(() => {
        sweeping = null;
      });
  }

  /**
   * The age bound and the directory ceiling, oldest first.
   *
   * A key is one record plus its bodies, and they are evicted TOGETHER: a body
   * with no record is unreadable by design and a record with no body is a
   * refusal in front of a person. The age and the order come from the
   * RECORD's own `storedAt` rather than from an mtime, so a sweep is not moved
   * by anything that touches a file without writing one.
   */
  async function sweep(now = clock()): Promise<{ removed: string[]; bytes: number }> {
    let names: string[];
    try {
      names = await readdir(dir);
    } catch {
      return { removed: [], bytes: 0 };
    }
    interface Key {
      keyName: string;
      storedAt: number;
      bytes: number;
      paths: string[];
    }
    const keys = new Map<string, Key>();
    const orphans: string[] = [];
    for (const name of names) {
      if (name.startsWith('.')) continue; // a staged file; the ring sweeps those
      const path = join(dir, name);
      let size = 0;
      try {
        const st = await stat(path);
        if (!st.isFile()) continue;
        size = st.size;
      } catch {
        continue;
      }
      const keyName = name.endsWith(RECORD_SUFFIX)
        ? name.slice(0, -RECORD_SUFFIX.length)
        : name.slice(0, name.indexOf(BODY_STEM_SUFFIX) === -1 ? 0 : name.indexOf(BODY_STEM_SUFFIX));
      if (keyName.length === 0) {
        orphans.push(path);
        continue;
      }
      const held = keys.get(keyName) ?? { keyName, storedAt: 0, bytes: 0, paths: [] };
      held.bytes += size;
      held.paths.push(path);
      keys.set(keyName, held);
    }
    for (const key of keys.values()) {
      const found = await readRecord(key.keyName);
      key.storedAt =
        found !== null && 'record' in found ? (found.record.entries[0]?.storedAt ?? 0) : 0;
    }
    const removed: string[] = [];
    const removeKey = async (key: Key): Promise<void> => {
      for (const path of key.paths) {
        await rm(path, { force: true }).catch(() => undefined);
        removed.push(path);
      }
    };
    // A file that is neither a record nor a body of one is not ours to keep.
    for (const path of orphans) {
      await rm(path, { force: true }).catch(() => undefined);
      removed.push(path);
    }
    const survivors: Key[] = [];
    for (const key of keys.values()) {
      // storedAt 0 is a key whose record is gone or was dropped whole; its
      // bodies are unreadable by design, so they go.
      if (key.storedAt === 0 || now - key.storedAt > (deps.maxAgeMs ?? BASELINE_MAX_AGE_MS)) {
        await removeKey(key);
      } else {
        survivors.push(key);
      }
    }
    const ceiling = deps.maxDirBytes ?? BASELINE_MAX_DIR_BYTES;
    let total = survivors.reduce((sum, k) => sum + k.bytes, 0);
    if (total > ceiling) {
      survivors.sort((a, b) => a.storedAt - b.storedAt);
      for (const key of survivors) {
        if (total <= ceiling) break;
        await removeKey(key);
        total -= key.bytes;
      }
    }
    return { removed, bytes: total };
  }

  return { load, store, sweep, dir };
}

function sentenceOf(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.length > 0 ? message : 'the write did not complete';
}
