/**
 * One read of the tree (Phase 201, research 77 section 4), and since Phase
 * 257 the fact pass over the same read (research 118 §6 and §10 Phase 1).
 *
 * The reading needs two facts the import scan cannot give, because the scan
 * reads only the files this build parses: how many lines every tracked file
 * holds, and what name a manifest at a box root declares. Both come from one
 * read of every tracked file, measured at 379 ms cold on gmux's 2,490 files
 * and tens of milliseconds warm, and both are written into `arch.db` under
 * the SAME mtime and size stamp the import rows use, so a warm pass reads
 * only what drifted and a file the tree no longer tracks is forgotten whole.
 *
 * It runs after the import scan inside both legs of the check coordinator,
 * before the scanned stamp is recorded, and it never runs on the map read,
 * which composes over whatever the store holds and waits for nothing.
 *
 * Nothing here is evaluated. A manifest is read as text and a name is taken
 * out of it by a pattern; no value read from any file reaches an argv.
 *
 * ## The second pass: the fact base (Phase 257)
 *
 * The same loop that reads a file for its line count now hands its bytes to
 * `./facts`, the closed rule table, and what comes back is stored keyed on the
 * bytes' own git blob name plus the path (spec D2: a fact is a function of
 * bytes AND path, because the test path refusal, the path conventions and the
 * manifest rules all read the path). Freshness is a second stamp beside the
 * tree one, so a file fresh for lines and stale for facts, which is every file
 * on the first run after the migration, goes to the facts side only; and a
 * file whose stamp moved but whose bytes did not, being a branch switch, a
 * `touch` or a fresh clone, is hashed and LINKED without a parse.
 *
 * Source files go to the shared worker pool for their call sites, through
 * the `parser` seam the caller hands in (`./fact-parser.ts` says why it is a
 * seam). THAT IS A SECOND PARSE of every changed source file per check, once
 * by the import scan and once here, both in the same pool and never on main's
 * thread, and it is the stated cost of this phase (spec D1): the alternative
 * couples `scan.ts` to the rule table. The prototype's single process bound
 * is 5.6 s on this repository without the wrapper pass and 17.6 s with it.
 *
 * The WRAPPER PASS is a setting (`wrapperPass`, off by default). When it is
 * on, wrapper declarations are cached by oid, the map is closed over the
 * declarations of every wrapper grammar file, and the facts reachable only
 * through a wrapper are written under a DIGEST of that map (spec D3), because
 * they are a function of other files' bytes: a moved digest re-reads every
 * wrapper grammar file for its wrapper arm alone. When it is off, every
 * wrapper only row of the repository is deleted once, so a setting turned off
 * leaves no stale `+wrap` fact behind.
 *
 * Stated limits, so a later round reads them here rather than finding them:
 * a link written without a parse, being a stamp move over unchanged bytes or
 * the pass turned off, carries the vendor reason and the truncation flag the
 * store's own stamp of that path already held, and reads `truncated` false
 * only when the bytes changed under a path this repository never linked,
 * which is then parsed anyway; a file the worker refuses (over its 2 MiB cap) keeps its
 * line and path facts and is linked `truncated`, because its call list is the
 * thing that is missing; and a file over this module's own 4 MB read cap is
 * linked under a streamed hash of its bytes with no rule read at all. And
 * the key carries NO rule table version: a fact is a function of (bytes,
 * path) under the table as it stands, so the first commit that changes a
 * rule leaves every cached row stale until that file's bytes change, and
 * that commit ships a migration that empties `arch_fact` (or a table digest
 * on the link) in the same change. Phase 258 is the first that may edit a rule.
 */

import { readFile } from 'node:fs/promises';
import { createReadStream, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { ArchFactDraft } from '@shared/arch';
import type { ArchFactFileLink, ArchFactStamp, ArchStore } from './db';
import type { ArchFactParser } from './fact-parser';
import {
  blobOid,
  closeWrappers,
  FACT_LIMITS,
  isManifestPath,
  readFacts,
  readWrapFacts,
  vendoredReason,
  wrapperDigest,
  WRAPPER_GRAMMARS,
  WRAPPER_MAX_HOPS,
  type FactReadInput
} from './facts/index';
import { bareName, MANIFEST_NAMES } from './reading';
// From ./resolver/paths rather than the manifest reader's facade, so this
// module pulls in no language arm and no parser: the conformance gate imports
// it from a bare copy of this directory.
import { normalizeRel } from './resolver/paths';
import { ARCH_SCAN_FILE_CEILING } from './scan-ceiling';
import type { ExtractedCall, ExtractedWrapper } from '../symbols/extract';
import { grammarFor, type GrammarId } from '../symbols/languages';
import type { IndexedFile } from '../symbols/worker';

export type { ArchTreeFileFact } from './db';

/**
 * Files past this size are not read; they are binaries or generated blobs.
 * The number is the fact table's, so the reference driver reads the same one.
 */
const MAX_READ_BYTES = FACT_LIMITS.maxReadBytes;
/** The no-bytes buffer the vendor test's path half is asked over for a file that was not read. */
const EMPTY = Buffer.alloc(0);
/** How many files one round of reads holds open at once. */
const CHUNK = 64;

export interface ArchTreeFactsInput {
  repoPath: string;
  repoKey: string;
  store: ArchStore;
  /** Every tracked path at HEAD, from the caller's one `git ls-files -z`. */
  trackedFiles: readonly string[];
  /** Ends the read between chunks. A cancelled read keeps what it wrote. */
  signal?: AbortSignal;
  /** The wrapper pass setting, read once by the caller through `wrapperPassOn`. */
  wrapperPass: boolean;
  /** Where source files go for their call sites: the shared pool, or an in process extractor in the tests. */
  parser: ArchFactParser;
}

/** What the fact pass did, beside the tree read's own counts. */
export interface ArchFactPassResult {
  /** Files whose facts were produced in this pass, parsed or read. */
  read: number;
  /** Files answered from the stored facts without a parse: a fresh stamp, or the same bytes at the same path. */
  reused: number;
  /** Wrapper only facts written in this pass. */
  wrapFacts: number;
  /** The wrapper map digest the pass ran under, or null with the pass off. */
  wrapDigest: string | null;
  /** One sentence when the pass stopped early, or null. Never a silent pass. */
  overBudget: string | null;
}

export interface ArchTreeFactsResult {
  /** Files read in this pass. */
  read: number;
  /** Files answered from the stored rows without a read. */
  reused: number;
  durationMs: number;
  facts: ArchFactPassResult;
}

/**
 * The name one manifest declares, read from its text, or null.
 *
 * Exported pure so the unit suite and the conformance gate can prove it on
 * fixtures without a file. `package.json` is parsed as JSON, and the four
 * text formats are read by one pattern each; a manifest with no name, or one
 * that does not parse, answers null rather than throwing.
 */
export function declaredNameOf(fileName: string, text: string): string | null {
  let name: string | null = null;
  if (fileName === 'package.json') {
    try {
      const parsed = JSON.parse(text) as { name?: unknown };
      name = typeof parsed.name === 'string' ? parsed.name : null;
    } catch {
      name = null;
    }
  } else if (fileName === 'Cargo.toml' || fileName === 'pyproject.toml') {
    name = /^\s*name\s*=\s*"([^"]+)"/m.exec(text)?.[1] ?? null;
  } else if (fileName === 'go.mod') {
    name = /^module\s+(\S+)/m.exec(text)?.[1]?.replace(/^"|"$/g, '') ?? null;
  } else if (fileName === 'Package.swift') {
    name = /name:\s*"([^"]+)"/.exec(text)?.[1] ?? null;
  }
  if (name === null) return null;
  const trimmed = name.trim();
  return trimmed.length === 0 || trimmed.length > 214 ? null : trimmed;
}

/** Newlines in a buffer, or zero when it is a binary. Exported for the tests. */
export function countLines(buf: Buffer): number {
  if (buf.length >= MAX_READ_BYTES || isBinary(buf)) return 0;
  let n = 0;
  for (let i = 0; i < buf.length; i += 1) if (buf[i] === 10) n += 1;
  return n;
}

/**
 * A NUL inside the window the extractor sniffs. ONE window: the Phase 257 fix
 * round found this at git's 8,000 while the extractor and the reference driver
 * read 8,192, so a NUL at byte 8,100 was text here and binary there, and a
 * fact was stored from a file the reference called unreadable.
 */
function isBinary(buf: Buffer): boolean {
  return buf.subarray(0, FACT_LIMITS.binarySniffBytes).includes(0);
}

/**
 * Git's blob name of a file this module will not buffer, streamed. The header
 * is the one `./facts/oid.ts` writes; it is spelled again here because that
 * function takes the bytes and this one deliberately never has them all.
 */
async function streamedBlobOid(absPath: string, size: number): Promise<string> {
  const h = createHash('sha1');
  h.update(`blob ${size}\0`);
  for await (const chunk of createReadStream(absPath)) h.update(chunk as Buffer);
  return h.digest('hex');
}

/** The `lang` a link records for a file the rules read. */
function langOf(relPath: string, grammar: GrammarId | null): string {
  if (grammar !== null) return grammar;
  return isManifestPath(relPath) ? 'manifest' : 'path';
}

function isWrapperGrammar(lang: string | null): lang is GrammarId {
  return lang !== null && (WRAPPER_GRAMMARS as readonly string[]).includes(lang);
}

/** One tracked file the loop found stale on one side or both. */
interface StaleFile {
  relPath: string;
  absPath: string;
  mtimeMs: number;
  size: number;
  /** The tree stamp moved: lines and declared name are re-read. */
  tree: boolean;
  /** The fact stamp moved: the bytes are hashed and, if new, rule read. */
  facts: boolean;
}

/** A source file waiting for the pool, with what the pool does not give back. */
interface Queued {
  relPath: string;
  absPath: string;
  oid: string;
  grammar: GrammarId;
  link: ArchFactFileLink;
}

/** A wrapper grammar file whose wrapper only facts must be (re)computed under the run's digest. */
interface WrapWork {
  relPath: string;
  absPath: string;
  oid: string;
  grammar: GrammarId;
  calls: readonly ExtractedCall[];
  own: readonly ExtractedWrapper[];
  link: ArchFactFileLink;
}

/** Read what drifted, forget what is gone, and answer with the counts. */
export async function readArchTreeFacts(input: ArchTreeFactsInput): Promise<ArchTreeFactsResult> {
  const started = Date.now();
  const { repoPath, repoKey, store, parser } = input;
  const treeStamps = store.treeStamps(repoKey);
  const factStamps = store.factStamps(repoKey);
  const stale: StaleFile[] = [];
  const seen = new Set<string>();
  let reused = 0;
  let factsReused = 0;
  for (const raw of input.trackedFiles) {
    const relPath = normalizeRel(raw);
    if (relPath === '') continue;
    seen.add(relPath);
    const absPath = join(repoPath, relPath);
    let mtimeMs: number;
    let size: number;
    try {
      // lstat rather than stat: a tracked symlink is not read. Following it
      // would read wherever it points, outside the repository included, for
      // a line count nobody needs (the Phase 201 fix round).
      const st = lstatSync(absPath);
      if (!st.isFile()) {
        seen.delete(relPath);
        continue;
      }
      mtimeMs = st.mtimeMs;
      size = st.size;
    } catch {
      // Tracked at HEAD and absent from the working tree. Forgotten below.
      seen.delete(relPath);
      continue;
    }
    const treeStamp = treeStamps.get(relPath);
    const treeFresh = treeStamp !== undefined && treeStamp.mtimeMs === mtimeMs && treeStamp.size === size;
    const factStamp = factStamps.get(relPath);
    const factsFresh = factStamp !== undefined && factStamp.mtimeMs === mtimeMs && factStamp.size === size;
    if (treeFresh) reused += 1;
    if (factsFresh) factsReused += 1;
    if (treeFresh && factsFresh) continue;
    stale.push({ relPath, absPath, mtimeMs, size, tree: !treeFresh, facts: !factsFresh });
  }
  store.forgetTreeFiles(
    repoKey,
    [...treeStamps.keys()].filter((relPath) => !seen.has(relPath))
  );
  const goneFacts = [...factStamps.keys()].filter((relPath) => !seen.has(relPath));

  // The fact side's own state for this run.
  const links = new Map<string, ArchFactFileLink>();
  const queued: Queued[] = [];
  const wrapWork: WrapWork[] = [];
  let factsRead = 0;
  let overBudget: string | null = null;

  let read = 0;
  for (let at = 0; at < stale.length; at += CHUNK) {
    if (input.signal?.aborted === true) {
      overBudget = 'The check was cancelled by a newer one.';
      break;
    }
    const chunk = stale.slice(at, at + CHUNK);
    const treeRows: { relPath: string; mtimeMs: number; size: number; lines: number; declares: string | null }[] = [];
    await Promise.all(
      chunk.map(async (file) => {
        let buf: Buffer | null = null;
        let readable = file.size < MAX_READ_BYTES;
        try {
          if (readable) buf = await readFile(file.absPath);
        } catch {
          // Unreadable. Counted as zero lines, which is the honest answer, and
          // hashed as nothing so the fact side links it as unread.
          readable = false;
          buf = null;
        }
        if (file.tree) {
          let lines = 0;
          let declares: string | null = null;
          if (buf !== null) {
            lines = countLines(buf);
            const name = bareName(file.relPath);
            if (MANIFEST_NAMES.includes(name) && buf.length > 0) {
              declares = declaredNameOf(name, buf.toString('utf8'));
            }
          }
          treeRows.push({ relPath: file.relPath, mtimeMs: file.mtimeMs, size: file.size, lines, declares });
        }
        if (!file.facts) return;
        const carried = factStamps.get(file.relPath);
        if (buf === null) {
          // Over the read cap, or unreadable: linked under the bytes' own name
          // with no rule read, so the denominator counts it and nothing claims
          // to have read it.
          let oid: string;
          try {
            oid = readable ? blobOid(Buffer.alloc(0)) : await streamedBlobOid(file.absPath, file.size);
          } catch {
            return;
          }
          // No bytes were read, so only the PATH half of the vendor test can
          // answer; a 5 MB minified file under `vendor/` is still vendored,
          // and a large first-party file is unread rather than vendored.
          links.set(file.relPath, unreadLink(file, oid, vendoredReason(file.relPath, EMPTY)));
          return;
        }
        const oid = blobOid(buf);
        const vendored = vendoredReason(file.relPath, buf);
        if (vendored !== null) {
          links.set(file.relPath, unreadLink(file, oid, vendored));
          return;
        }
        if (isBinary(buf)) {
          links.set(file.relPath, unreadLink(file, oid, null));
          return;
        }
        // A manifest is a manifest first: `setup.py`, `Rakefile`, `Package.swift`
        // and a `.go` under `migrations/` all carry a grammar, and the rules read
        // them as manifests whatever the worker answers, so the parse is not
        // asked for and the link says `manifest`. The fix round's probe read
        // the product linking four of this repository's manifests as python,
        // ruby and swift where the reference driver linked them as manifests.
        const grammar = isManifestPath(file.relPath) ? null : grammarFor(file.relPath);
        const lang = langOf(file.relPath, grammar);
        const link: ArchFactFileLink = {
          relPath: file.relPath,
          oid,
          mtimeMs: file.mtimeMs,
          size: file.size,
          lang,
          vendored: null,
          truncated: false,
          wrapDigest: null
        };
        if (store.hasFactsFor(oid, file.relPath)) {
          // The same bytes at the same path: the facts are already there.
          // The wrapper digest and the truncation flag are carried from this
          // repository's own last link of these bytes, and the pass below
          // decides whether the digest still holds.
          factsReused += 1;
          link.wrapDigest = input.wrapperPass ? (carried?.wrapDigest ?? null) : null;
          link.truncated = carried !== undefined && carried.oid === oid ? carried.truncated : false;
          links.set(file.relPath, link);
          return;
        }
        if (grammar === null) {
          const text = isManifestPath(file.relPath) ? buf.toString('utf8') : null;
          store.saveFacts(oid, file.relPath, readFacts({ relPath: file.relPath, lang: null, text, calls: [] }));
          factsRead += 1;
          links.set(file.relPath, link);
          return;
        }
        links.set(file.relPath, link);
        queued.push({ relPath: file.relPath, absPath: file.absPath, oid, grammar, link });
      })
    );
    if (treeRows.length > 0) store.saveTreeFacts(repoKey, treeRows);
    read += treeRows.length;
  }

  // The source files, in batches, through the one pool.
  const ceiling = Math.min(queued.length, ARCH_SCAN_FILE_CEILING);
  if (queued.length > ARCH_SCAN_FILE_CEILING) {
    overBudget =
      `This repository has ${queued.length.toLocaleString()} changed source files, ` +
      `above the ${ARCH_SCAN_FILE_CEILING.toLocaleString()} this build reads ` +
      `in one pass. The rest are reported as not checked rather than as ` +
      `holding.`;
  }
  const answeredFiles = new Set<string>();
  for (let at = 0; at < ceiling; at += parser.batchSize) {
    if (input.signal?.aborted === true) {
      overBudget = 'The check was cancelled by a newer one.';
      break;
    }
    const batch = queued.slice(at, at + parser.batchSize);
    const answered = await askParser(parser, batch, input.wrapperPass);
    for (const q of batch) {
      const file = answered.get(q.relPath);
      const calls = file?.calls ?? [];
      // A file the worker did not answer (over its own cap, or half written)
      // keeps its line and path facts; what is missing is the call list.
      q.link.truncated = file === undefined || file.callsTruncated === true;
      let buf: Buffer;
      try {
        buf = await readFile(q.absPath);
      } catch {
        continue;
      }
      // The bytes are read a second time here, after the worker's own read,
      // and a file rewritten in between would store facts under the FIRST
      // read's oid with evidence from the second: the Phase 257 fix round
      // drove exactly that through the parser seam and read `IPC serves
      // race:before` cited at a line holding `race:after`. So the second read
      // must hash to the oid the first one did, or the file is left unlinked
      // for the next run, which is the wrapper pass's own guard at step 4.
      if (blobOid(buf) !== q.oid) continue;
      store.saveFacts(q.oid, q.relPath, readFacts({ relPath: q.relPath, lang: q.grammar, text: buf.toString('utf8'), calls }));
      factsRead += 1;
      answeredFiles.add(q.relPath);
      if (input.wrapperPass && isWrapperGrammar(q.grammar)) {
        const own = file?.wrappers ?? [];
        store.saveWrapperDecls(q.oid, q.relPath, own);
        wrapWork.push({ ...q, calls, own });
      }
    }
  }
  // A queued file the pass did not reach, being past the ceiling, past a
  // cancellation, unreadable at the second read or rewritten between the two
  // reads, is left UNLINKED so the next run reads it; the ones answered keep
  // their facts and their link. Without this a file past the ceiling would be
  // linked with a fresh stamp and never parsed again.
  for (const q of queued) if (!answeredFiles.has(q.relPath)) links.delete(q.relPath);

  let wrapFacts = 0;
  let wrapDigest: string | null = null;
  if (input.wrapperPass) {
    if (input.signal?.aborted !== true) {
      wrapDigest = await wrapperPass({
        store,
        repoKey,
        repoPath,
        parser,
        factStamps,
        seen,
        links,
        wrapWork,
        onWrapFacts: (n) => {
          wrapFacts += n;
        }
      });
    }
  } else {
    // The pass is off: no link carries a digest, and no wrapper only row
    // stays. A link rewritten here for a file this run did not read carries
    // the vendor reason and the truncation flag its stamp already held.
    let hadAny = false;
    for (const [relPath, stamp] of factStamps) {
      if (!seen.has(relPath) || stamp.wrapDigest === null) continue;
      hadAny = true;
      const held = links.get(relPath);
      if (held !== undefined) {
        held.wrapDigest = null;
        continue;
      }
      links.set(relPath, {
        relPath,
        oid: stamp.oid,
        mtimeMs: stamp.mtimeMs,
        size: stamp.size,
        lang: stamp.lang,
        vendored: stamp.vendored,
        truncated: stamp.truncated,
        wrapDigest: null
      });
    }
    if (hadAny) store.clearWrapFacts(repoKey);
  }

  store.linkFactFiles(repoKey, [...links.values()]);
  store.forgetFactFiles(repoKey, goneFacts);
  store.pruneUnlinkedFacts();

  return {
    read,
    reused,
    durationMs: Date.now() - started,
    facts: { read: factsRead, reused: factsReused, wrapFacts, wrapDigest, overBudget }
  };
}

/** The link row for a file no rule reads: vendored, binary, over the cap or unreadable. */
function unreadLink(file: StaleFile, oid: string, vendored: string | null): ArchFactFileLink {
  return {
    relPath: file.relPath,
    oid,
    mtimeMs: file.mtimeMs,
    size: file.size,
    lang: null,
    vendored,
    truncated: false,
    wrapDigest: null
  };
}

/** One ask of the parser, answered by path. A batch that fails answers nothing, and its files are linked truncated. */
async function askParser(
  parser: ArchFactParser,
  batch: readonly { relPath: string; absPath: string }[],
  wrappers: boolean
): Promise<Map<string, IndexedFile>> {
  const out = new Map<string, IndexedFile>();
  let answered: IndexedFile[];
  try {
    answered = await parser.run(
      batch.map((q) => ({ relPath: q.relPath, absPath: q.absPath })),
      { calls: true, wrappers }
    );
  } catch {
    return out;
  }
  for (const file of answered) out.set(file.relPath, file);
  return out;
}

interface WrapperPassInput {
  store: ArchStore;
  repoKey: string;
  repoPath: string;
  parser: ArchFactParser;
  factStamps: ReadonlyMap<string, ArchFactStamp>;
  seen: ReadonlySet<string>;
  links: Map<string, ArchFactFileLink>;
  wrapWork: WrapWork[];
  onWrapFacts: (n: number) => void;
}

/** A wrapper grammar file the run did not parse, with the digest its link carries. */
interface Held {
  relPath: string;
  absPath: string;
  oid: string;
  grammar: GrammarId;
  stamp: ArchFactStamp;
  digest: string | null;
}

/**
 * The wrapper pass, once the base facts of every changed file are in.
 *
 * 1. Every wrapper grammar file the tree tracks that this run did not parse
 *    and that carries NO digest, being one linked under the pass off or one
 *    whose last wrapper read never finished, is parsed for its declarations
 *    and its calls. A declaration that was never read cannot be in the map,
 *    so this comes before the map is closed.
 * 2. The map is closed over the declarations of EVERY wrapper grammar file
 *    the tree tracks, fresh ones from this run and cached ones from the
 *    store, and digested.
 * 3. Every remaining wrapper grammar file whose digest is not this one is
 *    re-asked for its calls: its wrapper only facts were computed under a map
 *    that no longer holds. This is the re-read a moved digest costs, and it
 *    is bounded by the wrapper grammar files alone.
 * 4. Each file in hand gets its wrapper only facts recomputed against the
 *    map, with its own declarations shadowing it, and its link stamped with
 *    the digest. A file whose bytes moved between the read and now is left
 *    unstamped, so the next run reads it again.
 *
 * Answers the digest.
 */
async function wrapperPass(p: WrapperPassInput): Promise<string> {
  const { store, repoKey, parser, links, wrapWork } = p;
  const inHand = new Set(wrapWork.map((w) => w.relPath));
  const held: Held[] = [];
  for (const [relPath, stamp] of p.factStamps) {
    if (!p.seen.has(relPath) || inHand.has(relPath) || !isWrapperGrammar(stamp.lang)) continue;
    const link = links.get(relPath);
    held.push({
      relPath,
      absPath: join(p.repoPath, relPath),
      oid: link?.oid ?? stamp.oid,
      grammar: stamp.lang,
      stamp,
      digest: link === undefined ? stamp.wrapDigest : link.wrapDigest
    });
  }
  const linkFor = (h: Held): ArchFactFileLink =>
    links.get(h.relPath) ?? {
      relPath: h.relPath,
      oid: h.oid,
      mtimeMs: h.stamp.mtimeMs,
      size: h.stamp.size,
      lang: h.grammar,
      vendored: h.stamp.vendored,
      truncated: h.stamp.truncated,
      wrapDigest: null
    };
  // 1.
  const unread = held.filter((h) => h.digest === null);
  for (let at = 0; at < unread.length; at += parser.batchSize) {
    const batch = unread.slice(at, at + parser.batchSize);
    const answered = await askParser(parser, batch, true);
    for (const h of batch) {
      const file = answered.get(h.relPath);
      const own = file?.wrappers ?? [];
      store.saveWrapperDecls(h.oid, h.relPath, own);
      const link = linkFor(h);
      link.truncated = file === undefined || file.callsTruncated === true;
      links.set(h.relPath, link);
      wrapWork.push({ relPath: h.relPath, absPath: h.absPath, oid: h.oid, grammar: h.grammar, calls: file?.calls ?? [], own, link });
    }
  }
  // 2.
  const cached = held.filter((h) => h.digest !== null);
  const cachedDecls = store.wrapperDecls(cached);
  const all: ExtractedWrapper[] = [];
  for (const w of wrapWork) all.push(...w.own);
  for (const decls of cachedDecls.values()) all.push(...decls);
  const map = closeWrappers(all, WRAPPER_MAX_HOPS);
  const digest = wrapperDigest(map);
  // 3.
  const stale = cached.filter((h) => h.digest !== digest);
  for (let at = 0; at < stale.length; at += parser.batchSize) {
    const batch = stale.slice(at, at + parser.batchSize);
    const answered = await askParser(parser, batch, false);
    for (const h of batch) {
      const file = answered.get(h.relPath);
      const link = linkFor(h);
      link.truncated = file === undefined || file.callsTruncated === true;
      links.set(h.relPath, link);
      wrapWork.push({
        relPath: h.relPath,
        absPath: h.absPath,
        oid: h.oid,
        grammar: h.grammar,
        calls: file?.calls ?? [],
        own: cachedDecls.get(h.relPath) ?? [],
        link
      });
    }
  }
  // 4.
  for (let at = 0; at < wrapWork.length; at += CHUNK) {
    const chunk = wrapWork.slice(at, at + CHUNK);
    await Promise.all(
      chunk.map(async (w) => {
        let buf: Buffer;
        try {
          buf = await readFile(w.absPath);
        } catch {
          return;
        }
        if (blobOid(buf) !== w.oid) return;
        const fi: FactReadInput = { relPath: w.relPath, lang: w.grammar, text: buf.toString('utf8'), calls: w.calls };
        const base: ArchFactDraft[] = readFacts(fi);
        const wrap = readWrapFacts(fi, map, w.own, base);
        store.saveWrapFacts(repoKey, w.relPath, wrap);
        p.onWrapFacts(wrap.length);
        w.link.wrapDigest = digest;
        links.set(w.relPath, w.link);
      })
    );
  }
  return digest;
}
