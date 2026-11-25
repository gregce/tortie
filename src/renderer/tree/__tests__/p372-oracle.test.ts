/**
 * Phase 372 (build/p372/SPEC.md §7.2). THE INDEPENDENT ORACLE for the tree
 * store, written by the builder who did not write the store.
 *
 * WHAT IT ASKS. Thousands of seeded programs drive the store through its
 * PUBLIC verbs only (`setRoot`, `loadDir`, `refreshLoaded`, `relist`,
 * `forgetUnder`, the state and `subscribe`) over a fake file system of its
 * own, and six clauses are asked at every store notification (a "frame") and
 * at the end of every program:
 *
 *  1. NEVER A ROW THE DISK NEVER HELD. Every key is a folder that existed, and
 *     every entry of every listing was in that folder, with that kind and that
 *     link, at some instant since the program began.
 *  2. NEVER OLDER. A folder's listing never changes to one whose read started
 *     before the read of the listing it replaces, and a listing is never
 *     removed except by a read that started after it (or by a forget).
 *  3. NEVER BROUGHT BACK. A key forgotten is never present again unless a read
 *     that started after the forget answered it.
 *  4. NOTHING OF THE OTHER PROJECT. Every key is at or under the root shown.
 *  5. THE END EQUALS A FRESH READ. After the program, every timer run and two
 *     more clean refreshes with no mutation, the state is a fresh read of
 *     every cached folder that still exists, keys and listings, in order.
 *  6. ONE WRITE A REFRESH. A refresh with no mutation since the last one
 *     landed, and no read held or failed, notifies NOTHING; and a refresh of
 *     several changed folders whose reads all answer in one burst writes the
 *     cache exactly ONCE.
 *
 * THE FAKE FILE SYSTEM answers each read with the folder AS IT WAS WHEN THE
 * READ STARTED (a snapshot at the call), after a seeded delay, or fails (the
 * folder was gone at the call, or a seeded failure). Every folder holds one
 * file, `.p372`, which no mutation removes: its entry object is tagged with the
 * read that made it, so the oracle knows which read any listing in the state
 * came from without asking the store. A link's `link` field is sometimes left
 * out of an answer, as main does when a link's stat is late (Phase 343 D4).
 *
 * The clauses are the oracle's own: its equality, its sort and its history are
 * written here, and the store's `sameListing` is only cross-checked against
 * the oracle's own equality, never used to grade a frame.
 *
 * ENVIRONMENT (all optional): `P372_ORACLE_STORE` an absolute path to a
 * scratch copy of a store to judge instead of ../store (the parent's, or an
 * ablated HEAD), whose relative imports were rewritten to this tree's
 * absolute paths; `P372_ORACLE_SEEDS` (default 3000) and `P372_ORACLE_STEPS`
 * (default 40); `P372_ORACLE_REPORT` a file the per-clause counts and the
 * first failing program of each clause are written to.
 */

import { writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FsDirEntry } from '@shared/types';
import { localTarget } from '@shared/workspace-target';

// ---------------------------------------------------------------------------
// The fake file system
// ---------------------------------------------------------------------------

type Kind = 'file' | 'dir' | 'symlink';
type LinkTo = 'dir' | 'file' | 'none';
interface DiskNode {
  kind: Kind;
  link?: LinkTo;
}

const ROOT = '/r';
const OTHER = '/s';
const SENTINEL = '.p372';

/** folder → name → node. A folder exists exactly when it is a key here. */
let disk = new Map<string, Map<string, DiskNode>>();
/** Every folder that has ever existed. */
let folderEver = new Set<string>();
/** folder → every `name|kind|link` it has ever held. */
let sigEver = new Map<string, Set<string>>();
/** One logical clock: every read start and every forget takes a tick. */
let tick = 0;
/** Entry object → the tick its read started at. */
let tagOf = new WeakMap<object, number>();
/** folder → ticks of reads of it that answered with a failure. */
let failedReads = new Map<string, number[]>();

interface Faults {
  on: boolean;
  /** 'burst': every read answers at delay 0. */
  burst: boolean;
  holdNext: { count: number; ms: number; dir: string | null } | null;
  failNext: { dir: string | null; count: number } | null;
}
let faults: Faults = { on: true, burst: false, holdNext: null, failNext: null };
let rng: () => number = Math.random;
const rand = (n: number): number => Math.floor(rng() * n);
const pick = <T>(xs: readonly T[]): T | undefined =>
  xs.length === 0 ? undefined : xs[rand(xs.length)];

const sig = (name: string, kind: string, link: string | undefined): string =>
  `${name}|${kind}|${link ?? '-'}`;

/** Write a folder's whole present into its history. */
function remember(folder: string): void {
  const entries = disk.get(folder);
  if (entries === undefined) return;
  folderEver.add(folder);
  let set = sigEver.get(folder);
  if (set === undefined) {
    set = new Set();
    sigEver.set(folder, set);
  }
  for (const [name, node] of entries) {
    set.add(sig(name, node.kind, node.link));
    // A link whose stat main did not answer in time arrives with no field.
    if (node.kind === 'symlink') set.add(sig(name, 'symlink', undefined));
  }
}

function makeFolder(path: string): void {
  disk.set(path, new Map([[SENTINEL, { kind: 'file' }]]));
  const parent = path.slice(0, path.lastIndexOf('/'));
  const name = path.slice(path.lastIndexOf('/') + 1);
  const up = disk.get(parent);
  if (up !== undefined) {
    up.set(name, { kind: 'dir' });
    remember(parent);
  }
  remember(path);
}

/** Remove a folder and everything under it. */
function removeFolder(path: string): void {
  for (const key of [...disk.keys()]) {
    if (key === path || key.startsWith(path + '/')) disk.delete(key);
  }
  const parent = path.slice(0, path.lastIndexOf('/'));
  disk.get(parent)?.delete(path.slice(path.lastIndexOf('/') + 1));
}

/** Move a folder and its subtree to a new name in the same parent. */
function renameFolder(path: string, to: string): void {
  const moved: Array<[string, Map<string, DiskNode>]> = [];
  for (const [key, entries] of disk) {
    if (key === path || key.startsWith(path + '/')) {
      moved.push([to + key.slice(path.length), new Map(entries)]);
    }
  }
  removeFolder(path);
  for (const [key, entries] of moved) {
    disk.set(key, entries);
    remember(key);
  }
  const parent = to.slice(0, to.lastIndexOf('/'));
  disk.get(parent)?.set(to.slice(to.lastIndexOf('/') + 1), { kind: 'dir' });
  remember(parent);
}

let nameSeq = 0;
const fresh = (prefix: string): string => {
  nameSeq += 1;
  return `${prefix}${String(nameSeq)}`;
};

function initialDisk(): void {
  disk = new Map();
  folderEver = new Set();
  sigEver = new Map();
  for (const top of [ROOT, OTHER]) {
    disk.set(top, new Map([[SENTINEL, { kind: 'file' }]]));
    remember(top);
    if (rand(2) === 0) {
      makeFolder(`${top}/.git`);
    }
    const kids = 2 + rand(3);
    for (let i = 0; i < kids; i += 1) {
      const d = `${top}/${fresh('d')}`;
      makeFolder(d);
      const grand = rand(3);
      for (let j = 0; j < grand; j += 1) makeFolder(`${d}/${fresh('g')}`);
    }
    for (const folder of [...disk.keys()].filter(
      (k) => k === top || k.startsWith(top + '/')
    )) {
      if (folder.endsWith('/.git')) continue;
      const files = 1 + rand(3);
      const entries = disk.get(folder);
      if (entries === undefined) continue;
      for (let i = 0; i < files; i += 1) entries.set(`${fresh('f')}.txt`, { kind: 'file' });
      if (rand(3) === 0) {
        entries.set(fresh('l'), { kind: 'symlink', link: pick(['dir', 'file', 'none'] as const) });
      }
      remember(folder);
    }
  }
}

/** The fake `fs:readDir`. A snapshot at the call, answered later. */
async function readDir(dirPath: string): Promise<{ path: string; entries: FsDirEntry[] }> {
  tick += 1;
  const at = tick;
  const now = disk.get(dirPath);
  let fail = now === undefined;
  let delay: number;
  if (faults.burst) delay = 0;
  else {
    const r = rng();
    delay = r < 0.55 ? rand(4) : r < 0.9 ? 4 + rand(17) : 21 + rand(60);
  }
  let dropLinks = false;
  if (faults.on) {
    const hold = faults.holdNext;
    if (hold !== null && (hold.dir === null || hold.dir === dirPath)) {
      delay = hold.ms;
      hold.count -= 1;
      if (hold.count <= 0) faults.holdNext = null;
    }
    const f = faults.failNext;
    if (f !== null && (f.dir === null || f.dir === dirPath)) {
      fail = true;
      f.count -= 1;
      if (f.count <= 0) faults.failNext = null;
    }
    dropLinks = rng() < 0.15;
  }
  const entries: FsDirEntry[] = [];
  if (!fail && now !== undefined) {
    for (const [name, node] of now) {
      const e: FsDirEntry = { name, path: `${dirPath}/${name}`, kind: node.kind };
      if (node.kind === 'symlink' && node.link !== undefined && !(dropLinks && rng() < 0.6)) {
        e.link = node.link;
      }
      tagOf.set(e, at);
      entries.push(e);
    }
    // Unsorted, as main answers.
    for (let i = entries.length - 1; i > 0; i -= 1) {
      const j = rand(i + 1);
      const t = entries[i] as FsDirEntry;
      entries[i] = entries[j] as FsDirEntry;
      entries[j] = t;
    }
  }
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
  if (fail) {
    const list = failedReads.get(dirPath) ?? [];
    list.push(at);
    failedReads.set(dirPath, list);
    throw new Error(`ENOENT: ${dirPath}`);
  }
  return { path: dirPath, entries };
}

vi.stubGlobal('window', { gmux: { fs: { readDir: (p: string) => readDir(p) } } });
vi.mock('../../state/store', () => ({
  errorText: (err: unknown) => String(err)
}));

type StoreModule = {
  useFileTree: typeof import('../store').useFileTree;
  sameListing?: (a: readonly FsDirEntry[] | undefined, b: readonly FsDirEntry[] | undefined) => boolean;
  REFRESH_QUIET_MS?: number;
  REFRESH_CAP_MS?: number;
};
const STORE_PATH = process.env.P372_ORACLE_STORE;
const mod = (
  STORE_PATH !== undefined && STORE_PATH !== ''
    ? await import(/* @vite-ignore */ STORE_PATH)
    : await import('../store')
) as StoreModule;
const { useFileTree } = mod;
const QUIET = typeof mod.REFRESH_QUIET_MS === 'number' ? mod.REFRESH_QUIET_MS : 8;
const CAP = typeof mod.REFRESH_CAP_MS === 'number' ? mod.REFRESH_CAP_MS : 100;
const SEEDS = Number(process.env.P372_ORACLE_SEEDS ?? '3000');
/** The first seed, so one failing program can be run again alone. */
const FIRST = Number(process.env.P372_ORACLE_FIRST ?? '0');
const STEPS = Number(process.env.P372_ORACLE_STEPS ?? '40');
const store = (): ReturnType<typeof useFileTree.getState> => useFileTree.getState();

// ---------------------------------------------------------------------------
// The oracle's own equality and sort
// ---------------------------------------------------------------------------

function ownEqual(a: object, b: object): boolean {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!Object.is(ra[k], rb[k])) return false;
  }
  return true;
}
function oracleSame(a: readonly FsDirEntry[] | undefined, b: readonly FsDirEntry[] | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!ownEqual(a[i] as FsDirEntry, b[i] as FsDirEntry)) return false;
  }
  return true;
}
const folderFirst = (e: { kind: string; link?: string }): number =>
  e.kind === 'dir' || (e.kind === 'symlink' && e.link === 'dir') ? 0 : 1;

/** What a fresh read of a folder shows, as the oracle reads the disk. */
function freshListing(folder: string): FsDirEntry[] | undefined {
  const now = disk.get(folder);
  if (now === undefined) return undefined;
  const out: FsDirEntry[] = [];
  for (const [name, node] of now) {
    if (name === '.git') continue;
    const e: FsDirEntry = { name, path: `${folder}/${name}`, kind: node.kind };
    if (node.kind === 'symlink' && node.link !== undefined) e.link = node.link;
    out.push(e);
  }
  out.sort((a, b) => {
    const d = folderFirst(a) - folderFirst(b);
    return d !== 0 ? d : a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  return out;
}

const under = (key: string, dir: string): boolean => key === dir || key.startsWith(dir + '/');
const parentOf = (p: string): string => p.slice(0, p.lastIndexOf('/'));

// ---------------------------------------------------------------------------
// One program's bookkeeping and the frame check
// ---------------------------------------------------------------------------

type Clause = 1 | 2 | 3 | 4 | 5 | 6 | 'settle';
interface Violation {
  clause: Clause;
  detail: string;
}

let violations: Violation[] = [];
let forgets: Array<{ dir: string; tick: number }> = [];
let lastTag = new Map<string, number>();
let lastArr = new Map<string, FsDirEntry[]>();
let inForget = false;
let notifications = 0;
let cacheWrites = 0;
let watching = false;

/** At most five details a clause a program, so one loud clause never hides another. */
function violate(clause: Clause, detail: string): void {
  if (violations.filter((v) => v.clause === clause).length < 5) violations.push({ clause, detail });
}

function listingTag(arr: readonly FsDirEntry[]): number | undefined {
  for (const e of arr) if (e.name === SENTINEL) return tagOf.get(e);
  return undefined;
}

function checkFrame(
  s: ReturnType<typeof useFileTree.getState>,
  prev: ReturnType<typeof useFileTree.getState>
): void {
  notifications += 1;
  if (s.entriesByDir !== prev.entriesByDir) cacheWrites += 1;
  const rootPath = s.root === null ? null : s.root.path;
  const switched = s.root !== prev.root;
  for (const [key, arr] of Object.entries(s.entriesByDir)) {
    // 4. Nothing of the other project.
    if (rootPath === null || !under(key, rootPath)) {
      violate(4, `key ${key} while the root is ${String(rootPath)}`);
    }
    // 1. Never a row the disk never held.
    if (!folderEver.has(key)) violate(1, `key ${key} was never a folder`);
    const ever = sigEver.get(key);
    for (const e of arr) {
      if (e.path !== `${key}/${e.name}`) violate(1, `${key}: entry ${e.name} has path ${e.path}`);
      if (ever === undefined || !ever.has(sig(e.name, e.kind, e.link))) {
        violate(1, `${key}: ${sig(e.name, e.kind, e.link)} was never on disk`);
      }
      if (e.name === '.git') violate(1, `${key}: .git drawn`);
    }
    const tag = listingTag(arr);
    if (tag === undefined) {
      violate(1, `${key}: a listing no read of the disk answered (no ${SENTINEL})`);
      continue;
    }
    if (lastArr.get(key) !== arr) {
      // 2. Never older.
      const was = lastTag.get(key);
      if (was !== undefined && tag < was) {
        violate(2, `${key}: listing from read ${String(tag)} replaced one from read ${String(was)}`);
      }
      lastTag.set(key, tag);
      lastArr.set(key, arr);
    }
    // 3. Never brought back.
    for (const f of forgets) {
      if (under(key, f.dir) && f.tick > tag) {
        violate(3, `${key}: present from read ${String(tag)} after forget of ${f.dir} at ${String(f.tick)}`);
      }
    }
  }
  // 2, the other half: a listing removed by a read that started before it.
  if (!switched && !inForget) {
    for (const key of Object.keys(prev.entriesByDir)) {
      if (s.entriesByDir[key] !== undefined) continue;
      const was = lastTag.get(key) ?? -1;
      const failed = failedReads.get(key) ?? [];
      if (!failed.some((t) => t > was)) {
        violate(2, `${key}: listing from read ${String(was)} removed with no failed read after it`);
      }
    }
  }
  if (switched || inForget) {
    for (const key of Object.keys(prev.entriesByDir)) {
      if (s.entriesByDir[key] === undefined) lastArr.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Driving the store
// ---------------------------------------------------------------------------

let pending: Array<{ what: string; settled: boolean }> = [];
function track(what: string, p: Promise<unknown>): Promise<unknown> {
  const one = { what, settled: false };
  pending.push(one);
  void p.then(
    () => {
      one.settled = true;
    },
    () => {
      one.settled = true;
    }
  );
  return p;
}

async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

/** Run every timer until every verb this program called has settled. */
async function drain(): Promise<boolean> {
  for (let i = 0; i < 60; i += 1) {
    await vi.runAllTimersAsync();
    if (pending.every((p) => p.settled)) {
      pending = pending.filter((p) => !p.settled);
      return true;
    }
  }
  return false;
}

const cachedUnderRoot = (): string[] => {
  const root = store().root?.path ?? null;
  if (root === null) return [];
  return Object.keys(store().entriesByDir).filter((k) => under(k, root));
};
const diskUnderRoot = (): string[] => {
  const root = store().root?.path ?? null;
  if (root === null) return [];
  return [...disk.keys()].filter((k) => under(k, root) && !k.includes('/.git'));
};

function forgetNow(dirs: string[]): void {
  tick += 1;
  for (const dir of dirs) forgets.push({ dir, tick });
  inForget = true;
  try {
    store().forgetUnder(dirs);
  } finally {
    inForget = false;
  }
}

function mutate(log: string[]): void {
  const root = store().root?.path ?? ROOT;
  const home = rng() < 0.9 ? root : root === ROOT ? OTHER : ROOT;
  const cached = Object.keys(store().entriesByDir).filter((k) => under(k, home) && disk.has(k));
  const all = [...disk.keys()].filter((k) => under(k, home) && !k.includes('/.git'));
  const folder = (rng() < 0.7 ? pick(cached) : undefined) ?? pick(all);
  if (folder === undefined) return;
  const entries = disk.get(folder);
  if (entries === undefined) return;
  const names = [...entries.keys()].filter((n) => n !== SENTINEL && n !== '.git');
  const files = names.filter((n) => entries.get(n)?.kind !== 'dir');
  const dirs = names.filter((n) => entries.get(n)?.kind === 'dir');
  const links = names.filter((n) => entries.get(n)?.kind === 'symlink');
  const what = rand(9);
  if (what === 0 || what === 1) {
    const n = `${fresh('f')}.txt`;
    entries.set(n, { kind: 'file' });
    log.push(`addFile ${folder}/${n}`);
  } else if (what === 2 && files.length > 0) {
    const n = pick(files) as string;
    entries.delete(n);
    log.push(`removeFile ${folder}/${n}`);
  } else if (what === 3 && files.length > 0) {
    const n = pick(files) as string;
    const node = entries.get(n) as DiskNode;
    entries.delete(n);
    const m = node.kind === 'symlink' ? fresh('l') : `${fresh('f')}.txt`;
    entries.set(m, node);
    log.push(`renameFile ${folder}/${n} -> ${m}`);
  } else if (what === 4) {
    const d = `${folder}/${fresh('d')}`;
    makeFolder(d);
    log.push(`addDir ${d}`);
  } else if (what === 5 && dirs.length > 0) {
    const d = `${folder}/${pick(dirs) as string}`;
    removeFolder(d);
    log.push(`removeDir ${d}`);
  } else if (what === 6 && dirs.length > 0) {
    const d = `${folder}/${pick(dirs) as string}`;
    const to = `${folder}/${fresh('d')}`;
    renameFolder(d, to);
    log.push(`renameDir ${d} -> ${to}`);
  } else if (what === 7 && links.length > 0) {
    const n = pick(links) as string;
    const node = entries.get(n) as DiskNode;
    const to = pick((['dir', 'file', 'none'] as const).filter((x) => x !== node.link)) as LinkTo;
    entries.set(n, { kind: 'symlink', link: to });
    log.push(`retarget ${folder}/${n} -> ${to}`);
  } else {
    const n = fresh('l');
    entries.set(n, { kind: 'symlink', link: pick(['dir', 'file', 'none'] as const) });
    log.push(`addLink ${folder}/${n}`);
  }
  remember(folder);
}

/** A clean pair or a burst: the clause 6 questions, asked deterministically. */
async function quietPair(log: string[], burst: boolean): Promise<void> {
  const was = faults;
  faults = { on: false, burst: false, holdNext: null, failNext: null };
  try {
    if (!(await drain())) {
      violate('settle', 'a verb never settled before a quiet refresh');
      return;
    }
    track('refresh(pre)', store().refreshLoaded());
    if (!(await drain())) {
      violate('settle', 'refreshLoaded never settled');
      return;
    }
    let changed = 0;
    if (burst) {
      const cached = cachedUnderRoot().filter((k) => disk.has(k));
      const many = 2 + rand(3);
      for (let i = 0; i < many; i += 1) {
        const folder = pick(cached);
        const entries = folder === undefined ? undefined : disk.get(folder);
        if (folder === undefined || entries === undefined) continue;
        const n = `${fresh('f')}.txt`;
        entries.set(n, { kind: 'file' });
        remember(folder);
        changed += 1;
      }
      faults = { on: false, burst: true, holdNext: null, failNext: null };
    }
    const n0 = notifications;
    const w0 = cacheWrites;
    track('refresh(quiet)', store().refreshLoaded());
    if (!(await drain())) {
      violate('settle', 'refreshLoaded never settled');
      return;
    }
    const n = notifications - n0;
    const w = cacheWrites - w0;
    log.push(`${burst ? 'burst' : 'quiet'} refresh: ${String(n)} notifications, ${String(w)} cache writes, ${String(changed)} folders changed`);
    if (!burst && n !== 0) violate(6, `a quiet refresh notified ${String(n)} times (${String(w)} cache writes)`);
    if (burst && changed > 0 && w !== 1) violate(6, `a burst refresh of ${String(changed)} changed folders wrote the cache ${String(w)} times`);
  } finally {
    faults = was;
  }
}

async function runProgram(seed: number): Promise<{ violations: Violation[]; log: string[] }> {
  let state = (seed * 2654435761) >>> 0 || 1;
  rng = () => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const log: string[] = [];
  watching = false;
  faults = { on: false, burst: false, holdNext: null, failNext: null };
  if (!(await drain())) throw new Error('the last program left a verb unsettled');
  await store().setRoot(null);
  await drain();
  violations = [];
  forgets = [];
  lastTag = new Map();
  lastArr = new Map();
  failedReads = new Map();
  tagOf = new WeakMap();
  pending = [];
  initialDisk();
  watching = true;

  // The project shown with some folders open, as a mount restores them.
  track('setRoot', store().setRoot(localTarget(ROOT)));
  await drain();
  for (const d of diskUnderRoot().filter((k) => k !== ROOT)) {
    if (rng() < 0.6) track('loadDir', store().loadDir(d));
  }
  await drain();
  faults = { on: true, burst: false, holdNext: null, failNext: null };
  log.push(`seed ${String(seed)}: open ${cachedUnderRoot().join(' ')}`);

  for (let step = 0; step < STEPS; step += 1) {
    const r = rng();
    if (r < 0.2) {
      mutate(log);
    } else if (r < 0.33) {
      log.push('refresh');
      track('refresh', store().refreshLoaded());
    } else if (r < 0.38) {
      log.push('refresh twice');
      track('refresh', store().refreshLoaded());
      await advance(rand(6));
      track('refresh', store().refreshLoaded());
    } else if (r < 0.46) {
      const cached = new Set(cachedUnderRoot());
      const candidates = diskUnderRoot().filter((k) => !cached.has(k));
      const near = candidates.filter((k) => cached.has(parentOf(k)));
      const d = pick(near.length > 0 ? near : candidates);
      if (d !== undefined) {
        log.push(`expand ${d}`);
        track('loadDir', store().loadDir(d));
      }
    } else if (r < 0.48) {
      log.push('collapse (nothing)');
    } else if (r < 0.56) {
      const cached = cachedUnderRoot();
      const many = 1 + rand(3);
      const dirs: string[] = [];
      for (let i = 0; i < many; i += 1) {
        const d = rng() < 0.8 ? pick(cached) : pick(diskUnderRoot());
        if (d !== undefined) dirs.push(d);
      }
      log.push(`relist ${dirs.join(' ')}`);
      track('relist', store().relist(dirs));
    } else if (r < 0.63) {
      // As tree-ops does: the folder renamed or trashed, its keys forgotten,
      // its parent re-listed.
      const root = store().root?.path ?? null;
      const d = pick(cachedUnderRoot().filter((k) => k !== root && disk.has(k)));
      if (d !== undefined) {
        if (rng() < 0.6) {
          const to = `${parentOf(d)}/${fresh('d')}`;
          renameFolder(d, to);
          log.push(`rename+forget ${d} -> ${to}`);
        } else {
          removeFolder(d);
          log.push(`trash+forget ${d}`);
        }
        remember(parentOf(d));
        forgetNow([d]);
        if (rng() < 0.85) track('relist', store().relist([parentOf(d)]));
      }
    } else if (r < 0.67) {
      const away = store().root?.path === ROOT ? OTHER : ROOT;
      log.push(`switch to ${away}`);
      track('setRoot', store().setRoot(localTarget(away)));
      if (rng() < 0.6) {
        await advance(rand(30));
        const back = away === ROOT ? OTHER : ROOT;
        log.push(`switch back to ${back}`);
        track('setRoot', store().setRoot(localTarget(back)));
      }
    } else if (r < 0.74) {
      const d = rng() < 0.5 ? null : (pick(cachedUnderRoot()) ?? null);
      const ms = 150 + rand(2_800);
      faults.holdNext = { count: 1 + rand(2), ms, dir: d };
      log.push(`hold the next read of ${d ?? 'any folder'} ${String(ms)} ms`);
    } else if (r < 0.79) {
      const d = rng() < 0.3 ? null : (pick(cachedUnderRoot()) ?? null);
      faults.failNext = { dir: d, count: 1 };
      log.push(`fail the next read of ${d ?? 'any folder'}`);
    } else if (r < 0.93) {
      const ms = pick([0, 1, QUIET - 1, QUIET, QUIET + 1, CAP - 1, CAP, CAP + 1, rand(300), rand(40)]) ?? 0;
      log.push(`advance ${String(ms)}`);
      await advance(ms);
    } else if (r < 0.97) {
      await quietPair(log, false);
    } else {
      await quietPair(log, true);
    }
    await advance(rand(7));
  }

  // The end: every timer run, then two clean refreshes with no mutation.
  faults = { on: false, burst: false, holdNext: null, failNext: null };
  if (!(await drain())) {
    violate('settle', `unsettled: ${pending.filter((p) => !p.settled).map((p) => p.what).join(', ')}`);
    watching = false;
    return { violations, log };
  }
  await quietPair(log, false);
  const rootPath = store().root?.path ?? null;
  const keys = Object.keys(store().entriesByDir);
  if (rootPath !== null) {
    const want = new Set(keys.filter((k) => disk.has(k)));
    if (disk.has(rootPath)) want.add(rootPath);
    for (const k of want) {
      const expected = freshListing(k);
      const got = store().entriesByDir[k];
      if (got === undefined) violate(5, `${k} missing at the end`);
      else if (!oracleSame(got, expected)) {
        violate(5, `${k}: holds ${got.map((e) => sig(e.name, e.kind, e.link)).join(',')} but the disk ${String(expected?.map((e) => sig(e.name, e.kind, e.link)).join(','))}`);
      }
    }
    for (const k of keys) if (!want.has(k)) violate(5, `${k} cached at the end but gone from disk`);
    if (store().rootError !== null) violate(5, `rootError ${String(store().rootError)} after a clean refresh`);
  }
  watching = false;
  return { violations, log };
}

// ---------------------------------------------------------------------------
// The runs
// ---------------------------------------------------------------------------

const tally: Record<string, number> = {};
const firstFail: Record<string, { seed: number; detail: string; log: string[] }> = {};
/** The first 100 seeds that broke no clause, so a run that fails almost everywhere can say where it did not. */
const cleanSeeds: number[] = [];
/** Every failing seed, by clause, for the report. */
const seedsByClause: Record<string, number[]> = {};
let programsRun = 0;

beforeAll(() => {
  vi.useFakeTimers();
  useFileTree.subscribe((s, prev) => {
    if (watching) checkFrame(s, prev);
  });
});
afterAll(() => {
  vi.useRealTimers();
  const report = process.env.P372_ORACLE_REPORT;
  if (report !== undefined && report !== '') {
    writeFileSync(
      report,
      `${JSON.stringify({ store: STORE_PATH ?? '../store', first: FIRST, seeds: SEEDS, steps: STEPS, programsRun, quietMs: QUIET, capMs: CAP, failingSeedsByClause: tally, cleanSeeds, seedsByClause, firstFail }, null, 1)}\n`
    );
  }
});

const BATCH = 250;
describe('the tree store under seeded interleavings (§7.2)', () => {
  if (STORE_PATH === undefined || STORE_PATH === '') {
    it('exports the three names the oracle and the probe meet it at', () => {
      expect(typeof mod.sameListing).toBe('function');
      expect(mod.REFRESH_QUIET_MS).toBe(8);
      expect(mod.REFRESH_CAP_MS).toBe(100);
    });
  }

  for (let from = FIRST; from < FIRST + SEEDS; from += BATCH) {
    const to = Math.min(FIRST + SEEDS, from + BATCH);
    it(`seeds ${String(from)} to ${String(to - 1)}: every frame and the end hold all six clauses`, async () => {
      const failed: string[] = [];
      for (let seed = from; seed < to; seed += 1) {
        const { violations: v, log } = await runProgram(seed);
        programsRun += 1;
        const clauses = new Set(v.map((x) => String(x.clause)));
        if (clauses.size === 0 && cleanSeeds.length < 100) cleanSeeds.push(seed);
        for (const c of clauses) {
          tally[c] = (tally[c] ?? 0) + 1;
          (seedsByClause[c] ??= []).push(seed);
          if (firstFail[c] === undefined) {
            const one = v.find((x) => String(x.clause) === c) as Violation;
            firstFail[c] = { seed, detail: one.detail, log };
            console.log(`[p372 oracle] seed ${String(seed)} fails clause ${c}: ${one.detail}\n  ${log.join('\n  ')}`);
          }
          failed.push(`seed ${String(seed)} clause ${c}`);
        }
      }
      expect(failed.slice(0, 10)).toEqual([]);
    }, 300_000);
  }

  it('the store\'s sameListing agrees with the oracle\'s own equality', () => {
    if (typeof mod.sameListing !== 'function') return;
    const same = mod.sameListing;
    let s = 7;
    const r = (n: number): number => {
      s = (s * 1103515245 + 12345) >>> 0;
      return s % n;
    };
    const mk = (n: number): FsDirEntry[] =>
      Array.from({ length: n }, (_, i) => {
        const kind = (['file', 'dir', 'symlink'] as const)[r(3)] as FsDirEntry['kind'];
        const e: FsDirEntry = { name: `n${String(i)}`, path: `/r/n${String(i)}`, kind };
        if (kind === 'symlink' && r(2) === 0) e.link = (['dir', 'file', 'none'] as const)[r(3)];
        return e;
      });
    let disagree = 0;
    for (let i = 0; i < 4_000; i += 1) {
      const a = mk(r(6));
      const b: FsDirEntry[] = a.map((e) => ({ ...e }));
      const how = r(11);
      const at = b.length === 0 ? -1 : r(b.length);
      const e = at >= 0 ? (b[at] as FsDirEntry) : undefined;
      if (how === 1 && e) e.name = `${e.name}x`;
      if (how === 2 && e) e.path = `${e.path}x`;
      if (how === 3 && e) e.kind = e.kind === 'file' ? 'dir' : 'file';
      if (how === 4 && e) e.link = 'dir';
      if (how === 5 && e) delete e.link;
      if (how === 6 && e) e.link = e.link === 'none' ? 'file' : 'none';
      if (how === 7 && b.length > 1) b.reverse();
      if (how === 8) b.push({ name: 'z', path: '/r/z', kind: 'file' });
      if (how === 9 && b.length > 0) b.pop();
      if (how === 10 && e) (e as unknown as Record<string, unknown>).extra = 1;
      if (same(a, b) !== oracleSame(a, b)) disagree += 1;
      if (same(b, a) !== oracleSame(b, a)) disagree += 1;
    }
    expect(same([], undefined)).toBe(false);
    expect(disagree).toBe(0);
  });
});
