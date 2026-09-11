/**
 * The in-process fact read (Phase 257): `build/p256/det/run.mts`'s shape over
 * the SHIPPING modules, with no store, no worker pool and no git.
 *
 * Two callers share it so there is one implementation of "read a tree the way
 * the product reads it": `build/facts-conformance-probe.mts`, which runs it
 * over the committed fixtures and over this checkout's `src/` for the gate,
 * and `build/p257/facts-corpus.mts`, which runs it over the research 118
 * corpus for the app run. The modules are INJECTED rather than imported, so a
 * caller can hand it an ablated copy of `src/main/arch/facts` or of
 * `src/main/symbols` and read what moved.
 *
 * It mirrors the second pass `src/main/arch/tree-facts.ts` runs in the
 * product: lstat, a symlink skipped, the bytes read, the vendor filter first,
 * then the manifest rules for a manifest path, the path rules alone for a
 * file with no grammar, and the worker's call sites for the rest; then, with
 * the pass on, the wrapper map closed over every wrapper grammar file and the
 * wrapper arm read per parsed file against its own base. Nothing here writes
 * a row; the store's half is `src/main/arch/db.ts` and rule 16 drives it.
 *
 * IT SPAWNS NOTHING. The file list is handed in; `walkFiles` below is a plain
 * `node:fs` walk for callers that have no `git ls-files` to hand.
 */

import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ArchFactDraft } from '../../src/shared/arch';

/** The worker's call site, structurally (the real type is `src/main/symbols/calls.ts`). */
export interface DriverCall {
  callee: string;
  last: string;
  recv: string;
  args: string[];
  argc: number;
  line: number;
  form: string;
}

export interface DriverWrapper {
  name: string;
  innerCallee: string;
  innerLast: string;
  paramIndex: number;
  innerIndex: number;
  hops: number;
  line: number;
}

/** What `src/main/arch/facts/index.ts` exports, as the driver needs it. */
export interface FactsModule {
  readFacts(input: {
    relPath: string;
    lang: string | null;
    text: string | null;
    calls: readonly DriverCall[];
  }): ArchFactDraft[];
  readWrapFacts(
    input: { relPath: string; lang: string | null; text: string | null; calls: readonly DriverCall[] },
    map: ReadonlyMap<string, DriverWrapper>,
    own: readonly DriverWrapper[],
    base: readonly ArchFactDraft[]
  ): ArchFactDraft[];
  closeWrappers(
    candidates: readonly DriverWrapper[],
    maxHops?: number,
    own?: readonly DriverWrapper[]
  ): Map<string, DriverWrapper>;
  wrapperDigest(map: ReadonlyMap<string, DriverWrapper>): string;
  blobOid(buf: Buffer): string;
  vendoredReason(relPath: string, buf: Buffer): string | null;
  isManifestPath(relPath: string): boolean;
  WRAPPER_GRAMMARS: readonly string[];
  WRAPPER_MAX_HOPS: number;
}

/** What `SymbolExtractor` answers when asked for calls and wrappers. */
export interface DriverExtractor {
  extractAll(
    relPath: string,
    source: string,
    ask?: { calls?: boolean; wrappers?: boolean }
  ): Promise<{ calls: DriverCall[]; wrappers: DriverWrapper[]; callsTruncated: boolean }>;
}

export interface DriverFact extends ArchFactDraft {
  file: string;
  viaWrapper: boolean;
}

/** One file as the product would link it. */
export interface DriverLink {
  relPath: string;
  oid: string;
  size: number;
  /** The grammar id, `manifest`, `path`, or null for a file no rule read. */
  lang: string | null;
  vendored: string | null;
  truncated: boolean;
  wrapDigest: string | null;
}

export interface DriverInput {
  root: string;
  /** Repository relative paths, forward slashed. */
  files: readonly string[];
  facts: FactsModule;
  extractor: DriverExtractor;
  grammarFor(relPath: string): string | null;
  wrapperPass: boolean;
}

export interface DriverResult {
  facts: DriverFact[];
  links: DriverLink[];
  /** Files parsed by a grammar. */
  parsed: number;
  manifests: number;
  pathOnly: number;
  vendored: number;
  truncated: number;
  unread: number;
  bytes: number;
  ms: number;
  wrapperMs: number;
  /** Wrapper declarations gathered across the tree (pass on), and the closed map's size. */
  wrapperCandidates: number;
  wrapperMap: number;
  wrapFacts: number;
  wrapDigest: string | null;
}

/** The same ceiling `src/main/arch/tree-facts.ts` reads at. */
const MAX_READ_BYTES = 4_000_000;

/** A plain walk of a directory, `.git` and `node_modules` skipped, sorted, forward slashed. */
export function walkFiles(root: string, rel = ''): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(join(root, rel)).sort();
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e === '.git' || e === 'node_modules') continue;
    const r = rel === '' ? e : `${rel}/${e}`;
    let st;
    try {
      st = lstatSync(join(root, r));
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...walkFiles(root, r));
    else out.push(r);
  }
  return out;
}

function compareFacts(a: DriverFact, b: DriverFact): number {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  if (a.line !== b.line) return a.line - b.line;
  if (a.rule !== b.rule) return a.rule < b.rule ? -1 : 1;
  if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1;
  return 0;
}

interface Parsed {
  relPath: string;
  lang: string;
  text: string;
  calls: DriverCall[];
  wrappers: DriverWrapper[];
  base: ArchFactDraft[];
}

/** Read one tree the way the product does, in process. */
export async function readTree(input: DriverInput): Promise<DriverResult> {
  const t0 = Date.now();
  const { facts: F, extractor } = input;
  const out: DriverFact[] = [];
  const links: DriverLink[] = [];
  const parsedFiles: Parsed[] = [];
  let parsed = 0;
  let manifests = 0;
  let pathOnly = 0;
  let vendored = 0;
  let truncated = 0;
  let unread = 0;
  let bytes = 0;
  const push = (relPath: string, drafts: readonly ArchFactDraft[], viaWrapper: boolean): void => {
    for (const d of drafts) out.push({ ...d, file: relPath, viaWrapper });
  };
  for (const relPath of [...input.files].sort()) {
    const abs = join(input.root, relPath);
    let st;
    try {
      st = lstatSync(abs);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    let buf: Buffer;
    try {
      buf = readFileSync(abs);
    } catch {
      continue;
    }
    bytes += buf.length;
    const oid = F.blobOid(buf);
    const link: DriverLink = {
      relPath,
      oid,
      size: buf.length,
      lang: null,
      vendored: null,
      truncated: false,
      wrapDigest: null
    };
    // The product reads no file at or past its cap, so for one of those only
    // the PATH half of the vendor test can answer, exactly as in tree-facts.ts.
    const reason = F.vendoredReason(relPath, buf.length >= MAX_READ_BYTES ? Buffer.alloc(0) : buf);
    if (reason !== null) {
      link.vendored = reason;
      vendored += 1;
      links.push(link);
      continue;
    }
    const binary = buf.length >= MAX_READ_BYTES || buf.subarray(0, 8192).includes(0);
    const text = binary ? null : buf.toString('utf8');
    const lang = input.grammarFor(relPath);
    if (F.isManifestPath(relPath)) {
      push(relPath, F.readFacts({ relPath, lang: null, text, calls: [] }), false);
      link.lang = text === null ? null : 'manifest';
      manifests += 1;
      if (text === null) unread += 1;
    } else if (lang === null || text === null) {
      push(relPath, F.readFacts({ relPath, lang: null, text: null, calls: [] }), false);
      link.lang = 'path';
      pathOnly += 1;
      if (lang !== null && text === null) unread += 1;
    } else {
      const wrappers = input.wrapperPass && F.WRAPPER_GRAMMARS.includes(lang);
      const read = await extractor.extractAll(relPath, text, { calls: true, wrappers });
      const base = F.readFacts({ relPath, lang, text, calls: read.calls });
      push(relPath, base, false);
      link.lang = lang;
      link.truncated = read.callsTruncated;
      if (read.callsTruncated) truncated += 1;
      parsed += 1;
      parsedFiles.push({ relPath, lang, text, calls: read.calls, wrappers: read.wrappers, base });
    }
    links.push(link);
  }

  let wrapperMs = 0;
  let wrapperCandidates = 0;
  let wrapperMap = 0;
  let wrapFacts = 0;
  let wrapDigest: string | null = null;
  if (input.wrapperPass) {
    const w0 = Date.now();
    const all: DriverWrapper[] = [];
    for (const p of parsedFiles) all.push(...p.wrappers);
    wrapperCandidates = all.length;
    const map = F.closeWrappers(all, F.WRAPPER_MAX_HOPS);
    wrapperMap = map.size;
    wrapDigest = F.wrapperDigest(map);
    for (const p of parsedFiles) {
      if (!F.WRAPPER_GRAMMARS.includes(p.lang)) continue;
      const local = p.wrappers.length === 0 ? map : F.closeWrappers(all, F.WRAPPER_MAX_HOPS, p.wrappers);
      const extra = F.readWrapFacts(
        { relPath: p.relPath, lang: p.lang, text: p.text, calls: p.calls },
        local,
        p.wrappers,
        p.base
      );
      wrapFacts += extra.length;
      push(p.relPath, extra, true);
      const link = links.find((l) => l.relPath === p.relPath);
      if (link !== undefined) link.wrapDigest = wrapDigest;
    }
    wrapperMs = Date.now() - w0;
  }
  out.sort(compareFacts);
  return {
    facts: out,
    links,
    parsed,
    manifests,
    pathOnly,
    vendored,
    truncated,
    unread,
    bytes,
    ms: Date.now() - t0,
    wrapperMs,
    wrapperCandidates,
    wrapperMap,
    wrapFacts,
    wrapDigest
  };
}

/** Per category counts over a fact list, every category present. */
export function countByCategory(facts: readonly DriverFact[]): Record<string, number> {
  const out: Record<string, number> = {
    entrypoint: 0,
    boundary: 0,
    surface: 0,
    store: 0,
    effect: 0,
    network: 0,
    gate: 0,
    test: 0
  };
  for (const f of facts) out[f.category] = (out[f.category] ?? 0) + 1;
  return out;
}

/** Per rule counts. */
export function countByRule(facts: readonly DriverFact[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of facts) out[f.rule] = (out[f.rule] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
}
