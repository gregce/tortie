/**
 * Phase 256 prototype — the driver.
 *
 * RESEARCH PROTOTYPE. Nothing here ships and nothing under src/ was touched.
 *
 *   tsx build/p256/det/run.mts <repo> [--out facts.json] [--limit N]
 *
 * Reads the repository's TRACKED files with the same fixed argv Tortie's own
 * Architecture scan uses (`git ls-files --cached --others --exclude-standard`,
 * `src/main/arch/git-facts.ts`), parses every file a shipped grammar reads,
 * and prints the fact base plus a per-category and per-rule census.
 *
 * It SPAWNS exactly one program, `git`, with a fixed argv and no field of the
 * repository on it. It writes only the file named by `--out`.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CallReader, closeWrappers, unwrap, type WrapperDecl } from './parse.mts';
import { applyRules, declarationSurfaces, type Ctx, type Fact } from './rules.mts';
import { applyTextRules, pathFacts } from './textrules.mts';
import { isManifest, readManifest } from './manifests.mts';
import { grammarFor } from '../../../src/main/symbols/languages';
import { SymbolExtractor } from '../../../src/main/symbols/extract';
import { grammarPath, runtimeWasmPath } from '../../../src/main/symbols/paths';

export interface RunResult {
  repo: string;
  head: string;
  trackedFiles: number;
  parsedFiles: number;
  manifestFiles: number;
  unparsedFiles: number;
  bytesRead: number;
  ms: number;
  /** Milliseconds spent in the wrapper pass alone. */
  wrapperMs: number;
  /** Wrappers of an anchor api resolved across the repository. */
  wrappers: number;
  /** Resolved wrappers by hop count. */
  wrapperHops: Record<string, number>;
  /** Facts that exist only because of the wrapper pass. */
  wrapperFacts: number;
  facts: Fact[];
  byCategory: Record<string, number>;
  byRule: Record<string, number>;
  byLang: Record<string, number>;
}

function tracked(repo: string): string[] {
  const out = execFileSync('git', ['-C', repo, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }
  });
  return out.toString('utf8').split('\0').filter((p) => p.length > 0);
}

function head(repo: string): string {
  try {
    return execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
      .toString()
      .trim();
  } catch {
    return '(no head)';
  }
}

const MAX_FILE = 4 * 1024 * 1024;

/**
 * `local name -> exported name` for the aliasing import forms of the three
 * language families that have one. Measured on this corpus; a language whose
 * imports cannot rename answers an empty map and costs nothing.
 */
export function importAliases(text: string): Map<string, string> {
  const out = new Map<string, string>();
  // ES: import { a as b } / import { a as b, c as d }
  for (const m of text.matchAll(/\bimport\s*(?:type\s*)?\{([^}]{0,2000})\}/g)) {
    for (const part of m[1].split(',')) {
      const a = /^\s*(?:type\s+)?([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)\s*$/.exec(part);
      if (a) out.set(a[2], a[1]);
    }
  }
  // Python: from x import a as b
  for (const m of text.matchAll(/^\s*from\s+[.\w]+\s+import\s+(.+)$/gm)) {
    for (const part of m[1].split(',')) {
      const a = /^\s*([A-Za-z_][\w]*)\s+as\s+([A-Za-z_][\w]*)\s*$/.exec(part);
      if (a) out.set(a[2], a[1]);
    }
  }
  // Rust: use path::{a as b};
  for (const m of text.matchAll(/\buse\s+[^;]{0,400};/g)) {
    for (const a of m[0].matchAll(/([A-Za-z_][\w]*)\s+as\s+([A-Za-z_][\w]*)/g)) out.set(a[2], a[1]);
  }
  return out;
}

export async function runOver(
  repo: string,
  limit = Infinity,
  useWrappers = true,
  declarations = true
): Promise<RunResult> {
  const t0 = Date.now();
  const files = tracked(repo);
  const reader = await CallReader.create();
  // DECLARATIONS come from Tortie's OWN shipped reader rather than a second
  // one: `src/main/symbols/extract.ts` is the module the product's quick-open
  // and Architecture scan already use, and its nine hand-authored queries
  // answer definitions by kind. The Phase 256 checker measured that a hand
  // written semantic claim cites a DECLARATION far more often than a call —
  // `export async function writeGuarded(` is the evidence for "the one door
  // that rewrites your file" — and a fact base of call sites alone can never
  // back one.
  const symbols = await SymbolExtractor.create({ runtimeWasm: runtimeWasmPath(), grammarPath });
  const facts: Fact[] = [];
  // PASS 1 — the wrapper map, project wide. A wrapper declared in one file is
  // called from another, so the map has to be whole before any rule is asked.
  let wrapperMap = new Map<string, WrapperDecl>();
  const candidates: WrapperDecl[] = [];
  // A file's OWN declaration shadows the project-wide one. `handle` is
  // declared twice in this repository with two different signatures —
  // `src/main/typed-ipc.ts` takes (ipc, channel, fn) and `src/main/ipc.ts`
  // takes (channel, fn) — and a single global map answered the second with
  // the first's argument index, which is 26 of 229 channels, measured
  // 2026-09-10.
  const localCandidates = new Map<string, WrapperDecl[]>();
  let wrapperMs = 0;
  const maxHops = Number(process.env.P256_WRAPPER_HOPS ?? '3');
  if (useWrappers) {
    const w0 = Date.now();
    let m = 0;
    for (const rel of files) {
      if (m >= limit) break;
      m += 1;
      if (grammarFor(rel) === null) continue;
      const abs = join(repo, rel);
      let buf: Buffer;
      try {
        const st = statSync(abs);
        if (!st.isFile() || st.size > MAX_FILE) continue;
        buf = readFileSync(abs);
      } catch {
        continue;
      }
      if (buf.subarray(0, 8192).includes(0)) continue;
      const read = await reader.read(rel, buf.toString('utf8'));
      if (read === null) continue;
      // An import ALIAS is the second hop's obstacle rather than the hop
      // itself: `src/main/ipc.ts` does `import { handle as handleTyped }` and
      // then forwards into `handleTyped`, so the closure looks for a wrapper
      // called `handleTyped` and finds none. Rewriting the inner name through
      // the file's own alias table is what makes a second hop reachable.
      const aliases = importAliases(buf.toString('utf8'));
      const mine: WrapperDecl[] = [];
      for (const w of read.wrappers) {
        const real = aliases.get(w.innerLast);
        const fixed = real === undefined ? w : { ...w, innerLast: real };
        candidates.push(fixed);
        mine.push(fixed);
      }
      if (mine.length > 0) localCandidates.set(rel, mine);
    }
    wrapperMap = closeWrappers(candidates, maxHops);
    wrapperMs = Date.now() - w0;
  }
  let wrapperFacts = 0;
  let parsed = 0;
  let manifests = 0;
  let unparsed = 0;
  let bytes = 0;
  try {
    let n = 0;
    for (const rel of files) {
      if (n >= limit) break;
      n += 1;
      const abs = join(repo, rel);
      let size = 0;
      try {
        const st = statSync(abs);
        if (!st.isFile()) continue;
        size = st.size;
      } catch {
        continue;
      }
      facts.push(...pathFacts(rel));
      if (isManifest(rel)) {
        manifests += 1;
        bytes += Math.min(size, MAX_FILE);
        facts.push(...readManifest(rel, abs));
      }
      const g = grammarFor(rel);
      if (g === null) {
        if (!isManifest(rel)) unparsed += 1;
        continue;
      }
      if (size > MAX_FILE) {
        unparsed += 1;
        continue;
      }
      let buf: Buffer;
      try {
        buf = readFileSync(abs);
      } catch {
        unparsed += 1;
        continue;
      }
      if (buf.subarray(0, 8192).includes(0)) {
        unparsed += 1;
        continue;
      }
      const text = buf.toString('utf8');
      bytes += buf.length;
      const lines = text.split('\n');
      const read = await reader.read(rel, text);
      if (read === null) {
        unparsed += 1;
        continue;
      }
      parsed += 1;
      const parts = rel.split('/');
      const ctx: Ctx = {
        file: rel,
        lang: read.lang,
        base: parts[parts.length - 1].toLowerCase(),
        dir: parts.slice(0, -1).join('/').toLowerCase()
      };
      facts.push(...applyRules(read.sites, ctx, lines));
      let localMap = wrapperMap;
      const mine = localCandidates.get(rel);
      if (useWrappers && mine !== undefined) {
        localMap = closeWrappers(candidates, maxHops, mine);
      }
      if (useWrappers) {
        const unwrapped = read.sites
          .map((st) => unwrap(st, localMap))
          .filter((st): st is NonNullable<typeof st> => st !== null);
        const extra = applyRules(unwrapped, ctx, lines).map((f) => ({ ...f, rule: `${f.rule}+wrap` }));
        // A fact the wrapper pass already produced without it is dropped, so
        // `+wrap` really means "only reachable through a wrapper".
        const already = new Set(facts.map((f) => `${f.category}|${f.kind}|${f.subject}|${f.line}`));
        const fresh = extra.filter((f) => !already.has(`${f.category}|${f.kind}|${f.subject}|${f.line}`));
        wrapperFacts += fresh.length;
        facts.push(...fresh);
      }
      facts.push(...applyTextRules(rel, read.lang, lines));
      facts.push(...declarationSurfaces(rel, lines));
      if (declarations) {
        const found = await symbols.extract(rel, text);
        for (const d of found) {
          // Only EXPORTED-shaped, top-level-ish definitions: a semantic claim
          // never cites a local helper, and every definition in a 30,000 file
          // repository would drown the base (measured below).
          if (!/^(function|class|interface|type|constant|method|struct|enum|module)$/.test(d.kind)) continue;
          facts.push({
            category: 'decl',
            kind: d.kind,
            subject: `${d.kind} ${d.container ? `${d.container}.` : ''}${d.name}`,
            file: rel,
            line: d.line,
            rule: 'decl.symbol',
            lang: read.lang,
            evidence: (lines[d.line - 1] ?? '').trim().slice(0, 200)
          });
        }
      }
    }
  } finally {
    reader.dispose();
    symbols.dispose();
  }
  const byCategory: Record<string, number> = {};
  const byRule: Record<string, number> = {};
  const byLang: Record<string, number> = {};
  for (const f of facts) {
    byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
    byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
    byLang[f.lang] = (byLang[f.lang] ?? 0) + 1;
  }
  return {
    repo,
    head: head(repo),
    trackedFiles: files.length,
    parsedFiles: parsed,
    manifestFiles: manifests,
    unparsedFiles: unparsed,
    bytesRead: bytes,
    ms: Date.now() - t0,
    wrapperMs,
    wrappers: wrapperMap.size,
    wrapperHops: [...wrapperMap.values()].reduce<Record<string, number>>((a, w) => {
      a[String(w.hops)] = (a[String(w.hops)] ?? 0) + 1;
      return a;
    }, {}),
    wrapperFacts,
    facts,
    byCategory,
    byRule,
    byLang
  };
}

if (process.argv[1]?.endsWith('run.mts')) {
  const repo = process.argv[2];
  if (!repo) {
    console.error('usage: tsx build/p256/det/run.mts <repo> [--out facts.json] [--limit N]');
    process.exit(2);
  }
  const outIdx = process.argv.indexOf('--out');
  const limIdx = process.argv.indexOf('--limit');
  const limit = limIdx > 0 ? Number(process.argv[limIdx + 1]) : Infinity;
  const res = await runOver(
    repo,
    limit,
    !process.argv.includes('--no-wrappers'),
    !process.argv.includes('--no-decls')
  );
  const summary = {
    repo: res.repo,
    head: res.head,
    trackedFiles: res.trackedFiles,
    parsedFiles: res.parsedFiles,
    manifestFiles: res.manifestFiles,
    unparsedFiles: res.unparsedFiles,
    mbRead: +(res.bytesRead / 1048576).toFixed(2),
    ms: res.ms,
    wrapperMs: res.wrapperMs,
    wrappers: res.wrappers,
    wrapperHops: res.wrapperHops,
    wrapperFacts: res.wrapperFacts,
    facts: res.facts.length,
    byCategory: res.byCategory,
    byLang: res.byLang,
    topRules: Object.entries(res.byRule)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
  };
  console.log(JSON.stringify(summary, null, 2));
  if (outIdx > 0) {
    writeFileSync(process.argv[outIdx + 1], JSON.stringify(res, null, 1));
    console.error(`wrote ${process.argv[outIdx + 1]}`);
  }
}
