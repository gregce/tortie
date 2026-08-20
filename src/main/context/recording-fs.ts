/**
 * A `ContextFs` over a bundle of answers, recording what it could not answer
 * (Phase 108).
 *
 * ## What it is for
 *
 * The Context reader in `./scan.ts` is a pure function over the `ContextFs`
 * port. On a tab whose project lives on another machine, the reader runs
 * UNCHANGED on this Mac against this implementation. It answers from a bundle
 * of listings, file bytes and stat lines that the driver in
 * `src/main/machines/remote-agent-context.ts` fetched, and a question the
 * bundle cannot answer is RECORDED as a miss together with the method that
 * asked, and answered null, false or the path unchanged so the pass completes.
 * The driver fetches the missed paths and runs the reader again, and the loop
 * converges because every asked path becomes either an answer or a pinned
 * absence.
 *
 * ## Why this module is pure
 *
 * It imports nothing from the machines domain and it opens no disk. That is
 * what makes condition 58d of `build/conformance-machines.mjs` checkable:
 * there is no second precedence table and no remote override, because nothing
 * on the remote path knows an agent from a hook. The one table stays in
 * `./agent-context.ts` and this file never reads it.
 *
 * ## Absence is an answer
 *
 * A path the far side answered `X` for, and a path an enumeration covered and
 * did not contain, are both pinned absent so they are never asked twice. That
 * pinning is what makes the driver's loop converge rather than re-asking the
 * same missing root on every pass.
 */

import { createHash } from 'node:crypto';
import type { ContextDirEntry, ContextFileStat, ContextFs } from './port';
import { CONTEXT_READ_LIMITS } from './port';

/**
 * What one enumerated entry is. The two `l` kinds are symlinks whose target is
 * a directory or a file, and `o` is a symlink whose target is neither, e.g. a
 * broken one. Plain sockets and pipes are never enumerated at all.
 */
export type RemoteEntryKind = 'd' | 'f' | 'ld' | 'lf' | 'o';

/** One entry the far side described. Size and mtime are the TARGET's. */
export interface RemoteFsEntry {
  readonly kind: RemoteEntryKind;
  readonly mtime: number;
  readonly size: number;
}

/** One file the far side read back. `size` is the whole file, `data` is capped. */
export interface RemoteFsText {
  readonly data: Buffer;
  readonly size: number;
}

/**
 * Everything one machine has answered so far. The driver owns one of these per
 * read and folds every `context-read` answer into it.
 */
export interface RemoteFsBundle {
  /** Path to what is there. Keyed by the path with link ANCESTORS resolved. */
  readonly entries: Map<string, RemoteFsEntry>;
  /** Symlink path to its absolute resolved target, applied transitively. */
  readonly links: Map<string, string>;
  /** Directories whose children are completely known. */
  readonly listed: Set<string>;
  /** File bytes read back, keyed like {@link RemoteFsBundle.entries}. */
  readonly texts: Map<string, RemoteFsText>;
  /** Paths the machine answered `X` for, or that were asked and not answered. */
  readonly absent: Set<string>;
}

/** A bundle with nothing in it, for the driver's first pass. */
export function createEmptyRemoteBundle(): RemoteFsBundle {
  return {
    entries: new Map(),
    links: new Map(),
    listed: new Set(),
    texts: new Map(),
    absent: new Set()
  };
}

/** The port methods a miss can be recorded for. `realPath` never misses. */
export type RemoteFsMethod =
  | 'readDir'
  | 'readText'
  | 'stat'
  | 'exists'
  | 'hashFile';

/** One question the bundle could not answer, with the method that asked. */
export interface RemoteFsMiss {
  readonly path: string;
  readonly method: RemoteFsMethod;
}

/** The `ContextFs` plus the recorder the driver drains after each pass. */
export interface RecordingContextFs extends ContextFs {
  /** Every distinct miss since creation. Draining does not clear the bundle. */
  takeMisses(): RemoteFsMiss[];
}

const MAX_LINK_HOPS = 8;

/**
 * Rewrite a path through the recorded links, transitively, leaf included.
 *
 * This is the same rule `createMemoryContextFs.real` implements: an exact hit
 * moves the whole path, an ancestor hit moves the prefix, and the loop stops
 * after {@link MAX_LINK_HOPS} hops so a link cycle on the far side cannot spin
 * this Mac.
 */
export function resolveRemotePath(bundle: RemoteFsBundle, path: string): string {
  let current = path;
  for (let hop = 0; hop < MAX_LINK_HOPS; hop += 1) {
    const exact = bundle.links.get(current);
    if (exact !== undefined && exact !== current) {
      current = exact;
      continue;
    }
    let moved = false;
    for (const [from, to] of bundle.links) {
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

/**
 * Rewrite only the ANCESTORS of a path through the recorded links, keeping the
 * leaf name. An `E ld` entry is stored under this form, because it has to stay
 * a child of the directory listing it came from while `resolveRemotePath`
 * follows it to its target.
 */
export function resolveRemoteParent(
  bundle: RemoteFsBundle,
  path: string
): string {
  let current = path;
  for (let hop = 0; hop < MAX_LINK_HOPS; hop += 1) {
    let moved = false;
    for (const [from, to] of bundle.links) {
      if (current !== from && current.startsWith(`${from}/`)) {
        current = to + current.slice(from.length);
        moved = true;
        break;
      }
    }
    if (!moved) return current;
  }
  return current;
}

/** `dirname` for the absolute slash paths this bundle holds. */
function parentOf(path: string): string | null {
  const cut = path.lastIndexOf('/');
  if (cut < 0) return null;
  if (cut === 0) return path.length > 1 ? '/' : null;
  return path.slice(0, cut);
}

/** What one looked-up path is, or that the bundle cannot say. */
interface Looked {
  /** True when the bundle can answer, even when the answer is "not there". */
  known: boolean;
  stat: ContextFileStat | null;
  kind: RemoteEntryKind | null;
}

/**
 * The recording implementation. One per reader pass; the bundle outlives it
 * and the misses belong to it.
 */
export function createRecordingContextFs(
  bundle: RemoteFsBundle
): RecordingContextFs {
  const misses = new Map<string, RemoteFsMiss>();

  function miss(method: RemoteFsMethod, path: string): void {
    const key = `${method}:${path}`;
    if (!misses.has(key)) misses.set(key, { path, method });
  }

  /** The two spellings a path can be stored under, most specific first. */
  function keysOf(path: string): [string, string] {
    const literal = resolveRemoteParent(bundle, path);
    const full = resolveRemotePath(bundle, path);
    return [literal, full];
  }

  function look(path: string): Looked {
    const [literal, full] = keysOf(path);
    for (const key of literal === full ? [literal] : [literal, full]) {
      const text = bundle.texts.get(key);
      if (text !== undefined) {
        return {
          known: true,
          stat: { size: text.size, isDirectory: false, isFile: true },
          kind: 'f'
        };
      }
      const entry = bundle.entries.get(key);
      if (entry !== undefined) {
        if (entry.kind === 'd' || entry.kind === 'ld') {
          return {
            known: true,
            stat: { size: entry.size, isDirectory: true, isFile: false },
            kind: entry.kind
          };
        }
        if (entry.kind === 'f' || entry.kind === 'lf') {
          return {
            known: true,
            stat: { size: entry.size, isDirectory: false, isFile: true },
            kind: entry.kind
          };
        }
        // `o` follows to nothing statable, which is what the local fs answers
        // for a broken link: stat follows, fails, and the port says null.
        return { known: true, stat: null, kind: 'o' };
      }
      if (bundle.absent.has(key)) return { known: true, stat: null, kind: null };
      const parent = parentOf(key);
      if (parent !== null && bundle.listed.has(parent)) {
        // The enumeration covered this directory and did not contain the
        // name, so the answer is "not there" without another question.
        return { known: true, stat: null, kind: null };
      }
    }
    return { known: false, stat: null, kind: null };
  }

  /** The node `Dirent` shape for one child, from its recorded kind. */
  function entryOf(name: string, kind: RemoteEntryKind): ContextDirEntry {
    return {
      name,
      isDirectory: kind === 'd',
      isFile: kind === 'f',
      // The local port reads `withFileTypes` entries, where a symlink is a
      // symlink and neither a directory nor a file. The readers already
      // handle that, e.g. `readRoot` takes `isDirectory || isSymbolicLink`.
      isSymbolicLink: kind === 'ld' || kind === 'lf' || kind === 'o'
    };
  }

  return {
    async readDir(path) {
      const [literal, full] = keysOf(path);
      const found = look(path);
      if (found.known && found.stat === null) return null;
      if (found.known && found.stat !== null && !found.stat.isDirectory) {
        return null;
      }
      // The directory the listing lives under: a link's own children are the
      // target's children, which is what the local readdir answers too.
      const dir = found.kind === 'ld' ? resolveRemotePath(bundle, literal) : literal;
      const home = bundle.listed.has(dir)
        ? dir
        : bundle.listed.has(full)
          ? full
          : null;
      if (home === null) {
        miss('readDir', found.kind === 'ld' ? dir : full);
        return null;
      }
      const out: ContextDirEntry[] = [];
      const prefix = `${home}/`;
      for (const [candidate, entry] of bundle.entries) {
        if (!candidate.startsWith(prefix)) continue;
        const name = candidate.slice(prefix.length);
        if (name.length === 0 || name.includes('/')) continue;
        out.push(entryOf(name, entry.kind));
      }
      return out.sort((a, b) => a.name.localeCompare(b.name));
    },

    async readText(path, maxBytes = CONTEXT_READ_LIMITS.defaultMaxBytes) {
      const [literal, full] = keysOf(path);
      const text = bundle.texts.get(literal) ?? bundle.texts.get(full);
      if (text !== undefined) {
        // The local port reads at most `maxBytes` BYTES and decodes what it
        // read, so the cut here is on the buffer rather than on the string.
        const cut =
          text.data.length > maxBytes ? text.data.subarray(0, maxBytes) : text.data;
        return cut.toString('utf8');
      }
      const found = look(path);
      if (found.known) {
        // A directory, a known absence and an `o` link all read as null on
        // the local fs as well. A known plain entry with no bytes fetched is
        // still a miss, because the bytes are the answer.
        if (found.stat === null || found.stat.isDirectory) return null;
        miss('readText', full);
        return null;
      }
      miss('readText', full);
      return null;
    },

    async stat(path) {
      const found = look(path);
      if (found.known) return found.stat;
      miss('stat', resolveRemotePath(bundle, path));
      return null;
    },

    async realPath(path) {
      // Links are learned from enumeration, so this never asks the machine:
      // it rewrites through what is known and answers the path unchanged
      // otherwise, which is the local port's own fallback for a failed
      // realpath.
      return resolveRemotePath(bundle, path);
    },

    async exists(path) {
      const found = look(path);
      if (found.known) return found.stat !== null;
      miss('exists', resolveRemotePath(bundle, path));
      return false;
    },

    async hashFile(path) {
      const [literal, full] = keysOf(path);
      const text = bundle.texts.get(literal) ?? bundle.texts.get(full);
      if (text !== undefined) {
        // A truncated fetch must not hash as if it were the whole file.
        if (text.size > text.data.length) return null;
        return createHash('sha256').update(text.data).digest('hex');
      }
      const found = look(path);
      if (found.known && (found.stat === null || found.stat.isDirectory)) {
        return null;
      }
      miss('hashFile', full);
      return null;
    },

    takeMisses() {
      return [...misses.values()];
    }
  };
}

// ---------------------------------------------------------------------------
// The answer records, parsed and folded. Pure, and owned here so the driver
// stays a driver.
// ---------------------------------------------------------------------------

/** One line-record out of a `context-read` payload. */
export type ContextReadRecord =
  | {
      readonly type: 'entry';
      readonly kind: RemoteEntryKind;
      readonly mtime: number;
      readonly size: number;
      readonly path: string;
      readonly link: string | null;
    }
  | {
      readonly type: 'file';
      readonly size: number;
      readonly path: string;
      readonly data: Buffer;
    }
  | { readonly type: 'absent'; readonly path: string };

const KINDS = new Set<string>(['d', 'f', 'ld', 'lf', 'o']);
const DIGITS = /^\d+$/;
const BASE64_ONLY = /^[A-Za-z0-9+/=]*$/;

/**
 * The records in one `context-read` payload. PURE.
 *
 * The path is the REST of its line in every record, so a path holding a space
 * parses. A path holding a newline broke its record on the far side, and the
 * broken line parses as nothing here and is dropped rather than guessed at,
 * which is the `STORE_LIST` rule. A base64 line holding a character base64
 * does not use drops its whole record, for the reason
 * `src/main/machines/remote-history.ts` gives about its own fields: a decoder
 * that guesses hands back plausible nonsense.
 */
export function parseContextReadPayload(payload: string): ContextReadRecord[] {
  const out: ContextReadRecord[] = [];
  if (payload.trim() === 'none') return out;
  const lines = payload.split('\n');
  for (let at = 0; at < lines.length; at += 1) {
    const line = lines[at] ?? '';
    if (line.startsWith('E ')) {
      const rest = line.slice(2);
      const one = rest.indexOf(' ');
      const two = rest.indexOf(' ', one + 1);
      const three = rest.indexOf(' ', two + 1);
      if (one < 0 || two < 0 || three < 0) continue;
      const kind = rest.slice(0, one);
      const mtime = rest.slice(one + 1, two);
      const size = rest.slice(two + 1, three);
      const path = rest.slice(three + 1);
      if (!KINDS.has(kind) || !DIGITS.test(mtime) || !DIGITS.test(size)) {
        continue;
      }
      if (!path.startsWith('/')) continue;
      let link: string | null = null;
      if (kind.startsWith('l')) {
        const next = lines[at + 1] ?? '';
        if (next.startsWith('R ')) {
          const target = next.slice(2);
          if (target.startsWith('/')) link = target;
          at += 1;
        }
      }
      out.push({
        type: 'entry',
        kind: kind as RemoteEntryKind,
        mtime: Number(mtime),
        size: Number(size),
        path,
        link
      });
      continue;
    }
    if (line.startsWith('F ')) {
      const rest = line.slice(2);
      const one = rest.indexOf(' ');
      if (one < 0) continue;
      const size = rest.slice(0, one);
      const path = rest.slice(one + 1);
      const body = lines[at + 1];
      if (!DIGITS.test(size) || !path.startsWith('/') || body === undefined) {
        continue;
      }
      at += 1;
      if (!BASE64_ONLY.test(body)) continue;
      out.push({
        type: 'file',
        size: Number(size),
        path,
        data: Buffer.from(body, 'base64')
      });
      continue;
    }
    if (line.startsWith('X ')) {
      const path = line.slice(2);
      if (path.startsWith('/')) out.push({ type: 'absent', path });
    }
    // Any other line is a shape this parser does not know, e.g. the stdout a
    // GNU `stat -f` fallback prints on a race. It is dropped whole.
  }
  return out;
}

/** What one call sent, so the fold can pin what came back unanswered. */
export interface ContextReadRequest {
  readonly enumerate: readonly string[];
  readonly depth: number;
  readonly read: readonly string[];
}

/** How many `/`-separated steps `path` sits below `base`. */
function depthBelow(base: string, path: string): number {
  if (path === base) return 0;
  const rest = path.slice(base.length + (base.endsWith('/') ? 0 : 1));
  let steps = 1;
  for (const ch of rest) if (ch === '/') steps += 1;
  return steps;
}

/**
 * Fold one answer into the bundle. PURE over its arguments.
 *
 * Order inside one answer does not matter, and neither does the order of the
 * calls, because of three rules:
 *
 *  - a link-kind entry wins over a plain one for the same path, which is how
 *    an enumerated root that is itself a symlink keeps its `R` line while
 *    `find -H` also reports it as a directory
 *  - an `X` is folded only for a path nothing else answered, so a path that is
 *    a directory in the enumerate list and `X` in the read list stays a
 *    directory
 *  - every sent path that came back unanswered is pinned absent, which is what
 *    stops a machine that answered strangely from being asked forever
 */
export function foldContextReadAnswer(
  bundle: RemoteFsBundle,
  sent: ContextReadRequest,
  records: readonly ContextReadRecord[]
): void {
  // Pass 1: links, so every later key can be rewritten through them.
  for (const record of records) {
    if (record.type === 'entry' && record.link !== null) {
      const key = resolveRemoteParent(bundle, record.path);
      if (key !== record.link) bundle.links.set(key, record.link);
    }
  }
  // Pass 2: entries and texts.
  for (const record of records) {
    if (record.type === 'absent') continue;
    const key = resolveRemoteParent(bundle, record.path);
    if (record.type === 'file') {
      bundle.texts.set(key, { data: record.data, size: record.size });
      if (!bundle.entries.has(key)) {
        bundle.entries.set(key, { kind: 'f', mtime: 0, size: record.size });
      }
      bundle.absent.delete(key);
      continue;
    }
    const held = bundle.entries.get(key);
    const heldIsLink = held !== undefined && held.kind.startsWith('l');
    const recordIsLink = record.kind.startsWith('l');
    if (heldIsLink && !recordIsLink) {
      // A link kind wins over a plain one for the same path: `find -H`
      // reports an enumerated symlink root as a plain directory, and the
      // `E ld` record beside it is the one that carries the resolve. The
      // plain record still describes the TARGET, which `find -H` walked, so
      // it is folded there rather than dropped.
      const target = resolveRemotePath(bundle, key);
      if (target !== key && !bundle.entries.has(target)) {
        bundle.entries.set(target, {
          kind: record.kind,
          mtime: record.mtime,
          size: record.size
        });
        bundle.absent.delete(target);
      }
    } else {
      bundle.entries.set(key, {
        kind: record.kind,
        mtime: record.mtime,
        size: record.size
      });
    }
    bundle.absent.delete(key);
  }
  // Pass 3: absences, for paths nothing else answered.
  for (const record of records) {
    if (record.type !== 'absent') continue;
    const key = resolveRemoteParent(bundle, record.path);
    if (!bundle.entries.has(key) && !bundle.texts.has(key)) {
      bundle.absent.add(key);
    }
  }
  // Pass 4: which directories are now completely listed. A directory below an
  // enumerated root is fully known while its own children were still in the
  // walk's depth, so everything shallower than the sent depth is listed. Only
  // plain directories qualify: `find` does not descend a symlink, so an `ld`
  // stays unlisted and the reader's next pass asks for its target.
  for (const root of sent.enumerate) {
    const base = resolveRemotePath(bundle, root);
    let answered = false;
    for (const [key, entry] of bundle.entries) {
      if (key !== base && !key.startsWith(`${base}/`)) continue;
      answered = true;
      if (entry.kind !== 'd') continue;
      if (depthBelow(base, key) < sent.depth) bundle.listed.add(key);
    }
    if (bundle.absent.has(base)) answered = true;
    // A root that produced no record at all is pinned, so a machine whose
    // stat has neither spelling cannot be asked the same question forever.
    if (!answered) bundle.absent.add(base);
  }
  // Pass 5: sent reads that came back with nothing are pinned the same way.
  for (const path of sent.read) {
    const key = resolveRemoteParent(bundle, path);
    const full = resolveRemotePath(bundle, path);
    if (
      !bundle.entries.has(key) &&
      !bundle.entries.has(full) &&
      !bundle.texts.has(key) &&
      !bundle.texts.has(full) &&
      !bundle.absent.has(key)
    ) {
      bundle.absent.add(full);
    }
  }
}
