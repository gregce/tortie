/**
 * The Architecture view's read of one folder on another machine (Phase 234).
 *
 * ## What this module is, in one paragraph
 *
 * `src/main/arch/` already talks to the world through two seams: an
 * `ArchFileSystem` that reads `docs/arch/`, declared at
 * `src/main/arch/load.ts`, and an `ArchGitRunner` that runs the five fixed
 * argvs `src/main/arch/argv-guard.ts` composes, declared at
 * `src/main/arch/git-facts.ts`. This module is the SECOND implementation of
 * each, over the exec plane, so a folder on a machine is read by the same
 * checkers, the same reading, the same sentences and the same map as a folder
 * on this Mac. Nothing under `src/main/arch/checkers/`, `reading.ts`,
 * `sentence.ts`, `tree-facts.ts`, `scan.ts` or `map.ts` knows a machine
 * exists.
 *
 * ## Nothing runs on the machine, and the git argv is not composed here
 *
 * The two scripts this module sends are `arch-read` and `arch-git`, both
 * `mode: 'read'` in `./remote-scripts.ts`. `arch-git` carries the five git
 * command lines IN ITS OWN TEXT and picks one by a KIND word, so no value from
 * this module, and therefore no value from a contract file, can become part of
 * a git command line on either computer. The argv defense in
 * `src/main/arch/argv-guard.ts` is a fact about the far side too, because the
 * words over there are the same words compiled into the script. Condition 87
 * of `build/conformance-machines.mjs` reads each arm of that script against the
 * local composer and fails when one drifts.
 *
 * `git cat-file --batch` takes its requests on STDIN locally, and here it takes
 * them as `$3` of the script, which `printf` pipes into git. It is a parameter
 * of the SCRIPT and never an element of the git argv, which is the same
 * property the local call has.
 *
 * ## The mirror, which is this phase's one honest cost
 *
 * The contract read and the git reads are the whole story for the checkers.
 * The READING, being the boxes, the sentences and the hover facts, is built by
 * `scanArchImports` and `readArchTreeFacts`, and both of those read the bytes
 * of every tracked source file with `node:fs` and hand them to the parser
 * workers. Parsing on the machine would be a process on the machine, which
 * CLAUDE.md refuses, so the bytes come here instead: {@link syncRemoteArchMirror}
 * copies the tracked files into a directory of Tortie's own and the ordinary
 * local scan runs over that. The copy is incremental, keyed on the far side's
 * own mtime and size, so a warm read carries only what drifted.
 *
 * IT IS BOUNDED AND THE BOUND IS STATED. {@link ARCH_MIRROR_FILE_CEILING} files
 * and {@link ARCH_MIRROR_BYTES_CEILING} bytes, and a folder past either is
 * mirrored as far as the ceiling and reported through the same `overBudget`
 * sentence a repository past `ARCH_SCAN_FILE_CEILING` gets on this Mac. There
 * is no new sentence on the face for it.
 *
 * ## What is never sent
 *
 * A path holding a newline, a NUL, any other control character, or the marker
 * word itself is never put in a list. `arch-read` answers one record per line
 * with the path in it, so such a path would split into two bogus records; it is
 * pinned absent instead, which is the same rule `./remote-agent-context.ts`
 * keeps in `splitMisses`. A path that is absolute or holds `..` is refused by
 * the script itself as well.
 *
 * ## What may import this
 *
 * It reaches the far side only through `runRemoteRead`, so step 4 of that door
 * asks the LINK question for it and this module asks nothing of its own. That
 * is why it is deliberately absent from `MODULE_FACT` in `./liveness.ts`, the
 * same as `./remote-review.ts` and `./remote-entry.ts`.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { mkdir, utimes, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { ARCH_DIR, ARCH_FILES, ARCH_LIMITS } from '@shared/arch';
import { readyRemoteContext } from './ready-context';
import { runRemoteRead } from './remote-run';
import {
  ARCH_GIT_MAX_BYTES,
  ARCH_READ_FILE_MAX_BYTES,
  ARCH_READ_LIST_MAX_BYTES,
  REMOTE_SCRIPT_MARKER
} from './remote-scripts';

// ---------------------------------------------------------------------------
// The two seams, restated rather than imported
// ---------------------------------------------------------------------------

/**
 * `ArchFileSystem`, `ArchGitCall` and `ArchGitResult` are declared in
 * `src/main/arch/load.ts`, `argv-guard.ts` and `git-facts.ts`, and
 * `build/assert-import-boundaries.mjs` says the arch domain has ONE door for
 * the rest of main. This module is on the wrong side of that wall, so the
 * three shapes are RESTATED here and never imported, and the composition goes
 * the other way: `src/main/arch/remote-source.ts` imports this module and
 * proves, at its own call sites and under `tsc`, that what these functions
 * return really is an `ArchFileSystem` and an `ArchGitRunner`.
 *
 * `src/main/machines/__tests__/p234-remote-arch.test.ts` imports both sides
 * and assigns one to the other, so a field that drifts is a red test rather
 * than a silent second definition.
 */

/** The three fields one git call produced, being `ArchGitResult`'s own. */
export interface ArchGitAnswer {
  code: number;
  stdout: Buffer;
  stderr: string;
}

/** One composed git call, being `ArchGitCall` read structurally. */
export interface ArchGitAsk {
  /** One of the five kinds `ARCH_GIT_CALL_KINDS` lists. */
  kind: string;
  /** The argv the local composer proved. IT IS NEVER SENT. */
  argv: readonly string[];
  /** What the call writes to git's standard input, when it carries any. */
  stdin?: string;
}

/** The seam that reads bytes, being `ArchFileSystem` read structurally. */
export interface ArchFileReader {
  readFile(relativePath: string): Promise<string | null>;
  readDir(relativePath: string): Promise<string[]>;
}

/** The seam that runs one call, being `ArchGitRunner` read structurally. */
export interface ArchGitAsker {
  run(call: ArchGitAsk): Promise<ArchGitAnswer>;
}

/**
 * How long one `arch-read` or `arch-git` call gets, being 30,000 ms.
 *
 * CHOSEN rather than measured, and it is twice the door's own default because
 * the whole-history `git log` walk this view makes is the one call
 * `src/main/arch/run.ts` says is unbounded on purpose, and because one page of
 * the mirror carries up to {@link ARCH_MIRROR_PAGE_BYTES} of file bytes.
 */
export const ARCH_REMOTE_TIMEOUT_MS = 30_000;

/**
 * The most tracked files one folder's mirror holds, being 20,000.
 *
 * CHOSEN. It is under the 50,000 `ARCH_SCAN_FILE_CEILING` the local scan
 * allows, because every one of these files crosses a network first. A folder
 * with more is mirrored to the ceiling in `git ls-files` order and the rest are
 * reported as not checked, through the same sentence the local ceiling uses.
 */
export const ARCH_MIRROR_FILE_CEILING = 20_000;

/**
 * The most bytes one folder's mirror holds, being 64 MiB. CHOSEN, for the same
 * reason as the file ceiling, and applied to the far side's own reported sizes
 * before a byte is asked for.
 */
export const ARCH_MIRROR_BYTES_CEILING = 64 * 1024 * 1024;

/**
 * The most file bytes one `arch-read` call is asked for, being 2 MiB.
 *
 * The answer crosses base64, so one page is about 2.7 MiB on the wire, well
 * under the 8 MiB `arch-git` allows itself and far under what one ssh answer
 * can carry. It is a page size rather than a limit on anything.
 */
export const ARCH_MIRROR_PAGE_BYTES = 2 * 1024 * 1024;

/** How many `arch-read` pages are in flight at once. Chosen, and it is small. */
export const ARCH_MIRROR_CONCURRENCY = 3;

// ---------------------------------------------------------------------------
// What the far side said
// ---------------------------------------------------------------------------

/** One record of an `arch-read` answer. */
export interface ArchReadRecord {
  /** `S` a stamp, `F` a file's bytes, `D` a directory's entries, `X` refused. */
  kind: 'S' | 'F' | 'D' | 'X';
  path: string;
  /** Seconds since the epoch, from the far side's own `stat`. Zero for `D` and `X`. */
  mtimeSec: number;
  /** The far side's own size in bytes. Zero for `D` and `X`. */
  size: number;
  /** The bytes, for an `F` record, and null otherwise. */
  content: Buffer | null;
  /** The entries, for a `D` record, and null otherwise. */
  entries: readonly string[] | null;
}

/** Anything below 0x20, and 0x7f. A path holding one is never sent. */
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

/**
 * True when a path may be put in an `arch-read` list.
 *
 * The three refusals are the shape of the answer rather than a policy: a
 * newline splits one record into two, a control character is not something the
 * path rules in `src/main/arch/schema.ts` allow either, and the marker word
 * would end the payload early. An absolute path and a `..` are refused by the
 * script as well, and refusing them here means they are never sent at all.
 */
export function archPathIsSendable(path: string): boolean {
  if (path.length === 0 || path.length > 4096) return false;
  if (path.startsWith('/') || path.includes('..')) return false;
  if (path.includes(REMOTE_SCRIPT_MARKER)) return false;
  return !CONTROL_CHARACTER.test(path);
}

/**
 * Read an `arch-read` answer. PURE, and it never throws.
 *
 * A record it does not recognise is dropped whole, which is the rule every
 * parse in this product keeps: a half understood record is not a smaller
 * answer, it is a wrong one.
 */
export function parseArchReadAnswer(payload: string): ArchReadRecord[] {
  if (payload === 'none') return [];
  const lines = payload.split('\n');
  const out: ArchReadRecord[] = [];
  for (let at = 0; at < lines.length; at += 1) {
    const line = lines[at] ?? '';
    if (line.length < 3) continue;
    const kind = line.slice(0, 1);
    if (line.slice(1, 2) !== ' ') continue;
    if (kind === 'X') {
      out.push({
        kind: 'X',
        path: line.slice(2),
        mtimeSec: 0,
        size: 0,
        content: null,
        entries: null
      });
      continue;
    }
    if (kind === 'D') {
      const blob = lines[at + 1] ?? '';
      at += 1;
      const text = decodeBase64Text(blob);
      const entries = text === null ? [] : text.split('\n').filter((one) => one.length > 0);
      out.push({
        kind: 'D',
        path: line.slice(2),
        mtimeSec: 0,
        size: 0,
        content: null,
        entries
      });
      continue;
    }
    if (kind !== 'S' && kind !== 'F') continue;
    const rest = line.slice(2);
    const firstSpace = rest.indexOf(' ');
    const secondSpace = rest.indexOf(' ', firstSpace + 1);
    if (firstSpace <= 0 || secondSpace <= firstSpace) continue;
    const mtimeSec = Number.parseInt(rest.slice(0, firstSpace), 10);
    const size = Number.parseInt(rest.slice(firstSpace + 1, secondSpace), 10);
    const path = rest.slice(secondSpace + 1);
    if (!Number.isFinite(mtimeSec) || !Number.isFinite(size) || path.length === 0) continue;
    if (kind === 'S') {
      out.push({ kind: 'S', path, mtimeSec, size, content: null, entries: null });
      continue;
    }
    const blob = lines[at + 1] ?? '';
    at += 1;
    out.push({
      kind: 'F',
      path,
      mtimeSec,
      size,
      content: Buffer.from(blob, 'base64'),
      entries: null
    });
  }
  return out;
}

/** Base64 to text, or null when the word is not base64. */
function decodeBase64Text(word: string): string | null {
  if (word.length === 0) return '';
  try {
    return Buffer.from(word, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Read an `arch-git` answer into the SAME three fields the local runner
 * resolves with. PURE, and it never throws.
 *
 * A stream that lost its status line was cut at {@link ARCH_GIT_MAX_BYTES}, and
 * a cut stream is a FAILED call rather than a shorter answer: half a
 * `cat-file --batch` parses as the wrong file, and a cut `ls-files` is a claim
 * that files were deleted. The code is 1 and the stdout is empty, which is
 * exactly what `gatherFacts` reads as facts going missing.
 */
export function parseArchGitAnswer(payload: string): ArchGitAnswer {
  const failed = (why: string): ArchGitAnswer => ({
    code: 1,
    stdout: Buffer.alloc(0),
    stderr: why
  });
  if (payload === 'none') return failed('the machine printed nothing');
  const whole = Buffer.from(payload, 'base64');
  const text = whole.toString('latin1');
  const marker = '\n__TORTIE_GIT__';
  const at = text.lastIndexOf(marker);
  if (at < 0) {
    return failed(
      `the answer carried no status, so it was cut at ${String(ARCH_GIT_MAX_BYTES)} bytes`
    );
  }
  const codeText = text.slice(at + marker.length);
  if (!/^[0-9]+$/.test(codeText)) return failed('the status was not a number');
  return {
    code: Number.parseInt(codeText, 10),
    stdout: whole.subarray(0, at),
    stderr: ''
  };
}

// ---------------------------------------------------------------------------
// The runner
// ---------------------------------------------------------------------------

/** One call to one of this module's two scripts, answering the payload. */
export type RemoteArchRunner = (
  scriptId: 'arch-read' | 'arch-git',
  args: readonly string[]
) => Promise<string>;

/**
 * The real runner, over the second door.
 *
 * It asks `readyRemoteContext` once, so a machine with no registered connection
 * refuses with the sentence Settings carries rather than composing anything,
 * and every call after that goes through `runRemoteRead`, whose step 4 asks the
 * link and whose step 8 discards an answer whose connection moved.
 */
export function createRemoteArchRunner(machineId: string): RemoteArchRunner {
  const ctx = readyRemoteContext(machineId);
  return async (scriptId, args) => {
    const answer = await runRemoteRead(ctx, scriptId, args, {
      timeoutMs: ARCH_REMOTE_TIMEOUT_MS
    });
    return answer.payload;
  };
}

// ---------------------------------------------------------------------------
// Seam one: the contract read
// ---------------------------------------------------------------------------

/** The four compiled in names `src/main/arch/load.ts` opens, and no others. */
const CONTRACT_PATH = `${ARCH_DIR}/${ARCH_FILES.contract}`;
const EDGES_PATH = `${ARCH_DIR}/${ARCH_FILES.edges}`;
const BASELINE_PATH = `${ARCH_DIR}/${ARCH_FILES.baseline}`;
const COMPONENTS_DIR = `${ARCH_DIR}/${ARCH_FILES.components}`;

/** An {@link ArchFileReader} that can read a whole `docs/arch/` in two calls. */
export interface RemoteArchFileSystem extends ArchFileReader {
  /**
   * Fetch the whole of `docs/arch/` in TWO calls, so a load is two round trips
   * over the link rather than one per file. A load without it still works and
   * costs one call per read.
   */
  prime(): Promise<void>;
}

/**
 * An {@link ArchFileReader} over one folder on one machine.
 *
 * `loadArchDocument` reads the contract, lists the components directory, reads
 * every component file, then reads the edges and the baseline, in that order
 * and one await at a time. Over a link that is six or more round trips, so
 * {@link RemoteArchFileSystem.prime} does the whole thing in two and every read
 * after it is answered from the cache. A path the cache does not hold still
 * costs one call, which is what keeps this a faithful implementation of the
 * seam rather than a prefetch pretending to be one.
 */
export function createRemoteArchFileSystem(
  run: RemoteArchRunner,
  farPath: string
): RemoteArchFileSystem {
  const files = new Map<string, string | null>();
  const dirs = new Map<string, string[]>();

  const fold = (records: readonly ArchReadRecord[]): void => {
    for (const record of records) {
      if (record.kind === 'F') {
        files.set(record.path, (record.content ?? Buffer.alloc(0)).toString('utf8'));
      } else if (record.kind === 'D') {
        dirs.set(record.path, [...(record.entries ?? [])]);
      } else if (record.kind === 'X') {
        if (!files.has(record.path)) files.set(record.path, null);
        if (!dirs.has(record.path)) dirs.set(record.path, []);
      }
    }
  };

  const ask = async (read: readonly string[], dir: readonly string[]): Promise<void> => {
    const payload = await run('arch-read', [farPath, '', read.join('\n'), dir.join('\n')]);
    fold(parseArchReadAnswer(payload));
  };

  return {
    async prime(): Promise<void> {
      await ask([CONTRACT_PATH, EDGES_PATH, BASELINE_PATH], [COMPONENTS_DIR]);
      const paths = (dirs.get(COMPONENTS_DIR) ?? [])
        .filter((name) => name.endsWith('.json'))
        .sort()
        .slice(0, ARCH_LIMITS.maxComponents)
        .map((name) => `${COMPONENTS_DIR}/${name}`)
        .filter((path) => archPathIsSendable(path));
      for (let at = 0; at < paths.length; at += 64) {
        await ask(paths.slice(at, at + 64), []);
      }
    },
    async readFile(relativePath: string): Promise<string | null> {
      const held = files.get(relativePath);
      if (held !== undefined) return held;
      if (!archPathIsSendable(relativePath)) return null;
      await ask([relativePath], []);
      return files.get(relativePath) ?? null;
    },
    async readDir(relativePath: string): Promise<string[]> {
      const held = dirs.get(relativePath);
      if (held !== undefined) return held;
      if (!archPathIsSendable(relativePath)) return [];
      await ask([], [relativePath]);
      return dirs.get(relativePath) ?? [];
    }
  };
}

// ---------------------------------------------------------------------------
// Seam two: the git reads
// ---------------------------------------------------------------------------

/**
 * An {@link ArchGitAsker} over one folder on one machine.
 *
 * It sends the call's KIND and never its argv, which is why no value can reach
 * a git command line over there. `cat-file --batch`'s requests go as the
 * script's third parameter and are piped into git's standard input by the
 * script, exactly as `RunGitOptions.stdin` carries them here.
 */
export function createRemoteArchGitRunner(
  run: RemoteArchRunner,
  farPath: string
): ArchGitAsker {
  return {
    async run(call: ArchGitAsk): Promise<ArchGitAnswer> {
      const payload = await run('arch-git', [farPath, call.kind, call.stdin ?? '']);
      return parseArchGitAnswer(payload);
    }
  };
}

// ---------------------------------------------------------------------------
// The mirror
// ---------------------------------------------------------------------------

/** What one mirror pass did. */
export interface RemoteArchMirrorResult {
  /** Files whose bytes were carried across in this pass. */
  written: number;
  /** Files the mirror already held at the far side's own stamp. */
  reused: number;
  /** Files the mirror no longer holds, because the folder no longer tracks them. */
  forgotten: number;
  /** Files left out because a ceiling bit, or because the path could not be sent. */
  skipped: number;
  /** The sentence for the check result's `overBudget`, or null when nothing was cut. */
  overBudget: string | null;
}

/** Where one machine's folder is mirrored under Tortie's own directory. */
export function archMirrorPath(root: string, machineId: string, farPath: string): string {
  const digest = createHash('sha256').update(`${machineId} ${farPath}`).digest('hex');
  return join(root, 'arch-machines', digest.slice(0, 24));
}

/**
 * Bring the mirror up to what the machine holds, and answer with the counts.
 *
 * The pass is two phases. One `arch-read` call per page of paths asks for the
 * far side's own mtime and size of every tracked file, which is cheap because
 * no bytes come back. Whatever disagrees with the mirror's own stamp is then
 * asked for by content, in pages under {@link ARCH_MIRROR_PAGE_BYTES}, and
 * written. A file the mirror holds that the folder no longer tracks is removed,
 * the same way `scanArchImports` forgets a row for a file that is gone.
 *
 * IT NEVER THROWS FOR ANYTHING THE MACHINE SAID. A call that fails throws from
 * the door, which is the caller's to catch; a record that comes back refused
 * leaves that file out of the mirror and out of the counts.
 */
export async function syncRemoteArchMirror(input: {
  run: RemoteArchRunner;
  /** The folder on that machine. */
  farPath: string;
  /** The directory on this Mac the bytes are written into. */
  mirrorPath: string;
  /** Every tracked path, from this run's own `git ls-files -z` on that machine. */
  trackedFiles: readonly string[];
  signal?: AbortSignal;
}): Promise<RemoteArchMirrorResult> {
  const { run, farPath, mirrorPath } = input;
  mkdirSync(mirrorPath, { recursive: true });

  const wanted: string[] = [];
  let skipped = 0;
  let overBudget: string | null = null;
  for (const raw of input.trackedFiles) {
    const path = raw.trim();
    if (path.length === 0) continue;
    if (!archPathIsSendable(path)) {
      skipped += 1;
      continue;
    }
    if (wanted.length >= ARCH_MIRROR_FILE_CEILING) {
      skipped += 1;
      overBudget ??=
        `This folder has ${input.trackedFiles.length.toLocaleString()} tracked ` +
        `files, above the ${ARCH_MIRROR_FILE_CEILING.toLocaleString()} this ` +
        `build reads from another machine in one pass. The rest are reported ` +
        `as not checked rather than as holding.`;
      continue;
    }
    wanted.push(path);
  }

  // Phase one. The stamps, no bytes.
  const stamps = new Map<string, { mtimeSec: number; size: number }>();
  for (const page of pageByListBytes(wanted)) {
    if (input.signal?.aborted === true) break;
    const payload = await run('arch-read', [farPath, page.join('\n'), '', '']);
    for (const record of parseArchReadAnswer(payload)) {
      if (record.kind !== 'S') continue;
      stamps.set(record.path, { mtimeSec: record.mtimeSec, size: record.size });
    }
  }

  // What the mirror already holds, and what it must forget.
  const held = mirrorStamps(mirrorPath);
  const stale: string[] = [];
  let reused = 0;
  let bytesWanted = 0;
  for (const path of wanted) {
    const far = stamps.get(path);
    if (far === undefined) {
      // Tracked at HEAD and not a plain file in the working tree over there.
      skipped += 1;
      continue;
    }
    if (far.size > ARCH_READ_FILE_MAX_BYTES) {
      // The local read would not open it either, so it is not a miss.
      held.delete(path);
      continue;
    }
    if (bytesWanted + far.size > ARCH_MIRROR_BYTES_CEILING) {
      skipped += 1;
      overBudget ??=
        `This folder holds more than ` +
        `${String(Math.round(ARCH_MIRROR_BYTES_CEILING / (1024 * 1024)))} MB of ` +
        `tracked files, which is what this build reads from another machine in ` +
        `one pass. The rest are reported as not checked rather than as holding.`;
      continue;
    }
    bytesWanted += far.size;
    const mine = held.get(path);
    held.delete(path);
    if (mine !== undefined && mine.mtimeSec === far.mtimeSec && mine.size === far.size) {
      reused += 1;
      continue;
    }
    stale.push(path);
  }

  const forgotten = forgetMirrored(mirrorPath, [...held.keys()]);

  // Phase two. The bytes, in pages, a bounded number of pages at once.
  const pages = pageByExpectedBytes(stale, (path) => stamps.get(path)?.size ?? 0);
  let written = 0;
  for (let at = 0; at < pages.length; at += ARCH_MIRROR_CONCURRENCY) {
    if (input.signal?.aborted === true) break;
    const wave = pages.slice(at, at + ARCH_MIRROR_CONCURRENCY);
    const answers = await Promise.all(
      wave.map((page) => run('arch-read', [farPath, '', page.join('\n'), '']))
    );
    for (const payload of answers) {
      for (const record of parseArchReadAnswer(payload)) {
        if (record.kind !== 'F' || record.content === null) continue;
        await writeMirrored(mirrorPath, record.path, record.content, record.mtimeSec);
        written += 1;
      }
    }
  }

  return { written, reused, forgotten, skipped, overBudget };
}

/** Split a list of paths so no one call's list passes the script's list budget. */
export function pageByListBytes(paths: readonly string[]): string[][] {
  const out: string[][] = [];
  let page: string[] = [];
  let bytes = 0;
  for (const path of paths) {
    const cost = Buffer.byteLength(path, 'utf8') + 1;
    if (page.length > 0 && bytes + cost > ARCH_READ_LIST_MAX_BYTES) {
      out.push(page);
      page = [];
      bytes = 0;
    }
    page.push(path);
    bytes += cost;
  }
  if (page.length > 0) out.push(page);
  return out;
}

/** Split a list of paths so no one answer carries more than one page of bytes. */
export function pageByExpectedBytes(
  paths: readonly string[],
  sizeOf: (path: string) => number
): string[][] {
  const out: string[][] = [];
  let page: string[] = [];
  let bytes = 0;
  let listBytes = 0;
  for (const path of paths) {
    const cost = sizeOf(path);
    const listCost = Buffer.byteLength(path, 'utf8') + 1;
    if (
      page.length > 0 &&
      (bytes + cost > ARCH_MIRROR_PAGE_BYTES ||
        listBytes + listCost > ARCH_READ_LIST_MAX_BYTES)
    ) {
      out.push(page);
      page = [];
      bytes = 0;
      listBytes = 0;
    }
    page.push(path);
    bytes += cost;
    listBytes += listCost;
  }
  if (page.length > 0) out.push(page);
  return out;
}

/**
 * What the mirror holds, as the far side's own stamps.
 *
 * The stamp is written into the mirrored file's own modification time in whole
 * seconds, which is what the far side reports, so no side table is needed and a
 * mirror a person deletes half of simply re-fetches that half.
 */
function mirrorStamps(mirrorPath: string): Map<string, { mtimeSec: number; size: number }> {
  const out = new Map<string, { mtimeSec: number; size: number }>();
  const walk = (dir: string, prefix: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs, rel);
        continue;
      }
      if (!entry.isFile()) continue;
      try {
        const st = statSync(abs);
        out.set(rel, { mtimeSec: Math.floor(st.mtimeMs / 1000), size: st.size });
      } catch {
        // A file that went away between the listing and the stat is not held.
      }
    }
  };
  walk(mirrorPath, '');
  return out;
}

/** Remove what the folder no longer tracks. Answers how many went. */
function forgetMirrored(mirrorPath: string, paths: readonly string[]): number {
  let gone = 0;
  for (const path of paths) {
    if (!archPathIsSendable(path)) continue;
    try {
      rmSync(join(mirrorPath, path), { force: true });
      gone += 1;
    } catch {
      // A file that will not go is left, and the next pass tries again.
    }
  }
  return gone;
}

/** Write one mirrored file, stamped with the far side's own modification time. */
async function writeMirrored(
  mirrorPath: string,
  relPath: string,
  content: Buffer,
  mtimeSec: number
): Promise<void> {
  if (!archPathIsSendable(relPath)) return;
  const abs = join(mirrorPath, relPath);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content);
  try {
    await utimes(abs, mtimeSec, mtimeSec);
  } catch {
    // A stamp that will not set means the next pass carries this file again.
  }
}
