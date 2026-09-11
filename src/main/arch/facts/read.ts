/**
 * The per file reader (Phase 257): one file's bytes and path in, its sorted
 * fact list out.
 *
 * The order inside is fixed and the output is sorted `(line, rule, subject)`
 * before it is returned, so `seq` in the store is deterministic and
 * `conformance:facts` rule 9's "composed twice, same bytes" arm holds. Path
 * rules first; then, when there is text, the manifest rules if the path is a
 * manifest, else when the file has a grammar, the call rules over the
 * worker's sites, the line rules and the declaration surfaces. Every family
 * is deduped on one key, `category|kind|subject|line`.
 *
 * `readWrapFacts` is the wrapper arm: the same table over the sites the
 * wrapper map unwraps, with the rule id suffixed `+wrap` and every key already
 * in the base list dropped, so `+wrap` means "only reachable through a
 * wrapper" and nothing else. The caller owns the map and its bytes; nothing
 * here reads a file.
 */

import type { ArchFactDraft } from '@shared/arch';
import type { ExtractedCall, ExtractedWrapper } from '../../symbols/extract';
import type { GrammarId } from '../../symbols/languages';
import { FACT_LIMITS } from './limits';
import { applyLineRules } from './line-rules';
import { isManifestPath, readManifestFacts } from './manifests';
import { declarationSurfaces, pathFacts } from './path-rules';
import { applyCallRules, factKey } from './rules';
import type { RuleContext } from './types';
import { shadowWrappers, unwrapSite } from './wrappers';

export interface FactReadInput {
  relPath: string;
  /** The grammar the file parses with, or null for a non-source file. */
  lang: GrammarId | null;
  /** The file's text, or null when it was not read (binary, over cap, vendored, symlink). */
  text: string | null;
  /** Call sites the worker captured for this file. Empty for a non-grammar file. */
  calls: readonly ExtractedCall[];
}

function contextOf(relPath: string, lang: GrammarId, text: string): RuleContext {
  const slash = relPath.lastIndexOf('/');
  return {
    file: relPath,
    lang,
    base: relPath.slice(slash + 1).toLowerCase(),
    dir: slash < 0 ? '' : relPath.slice(0, slash).toLowerCase(),
    text
  };
}

function capped(f: ArchFactDraft): ArchFactDraft {
  return {
    ...f,
    subject: f.subject.slice(0, FACT_LIMITS.maxSubject),
    evidence: f.evidence.slice(0, FACT_LIMITS.maxEvidence)
  };
}

function byLineRuleSubject(a: ArchFactDraft, b: ArchFactDraft): number {
  if (a.line !== b.line) return a.line - b.line;
  if (a.rule !== b.rule) return a.rule < b.rule ? -1 : 1;
  if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1;
  return 0;
}

/** Dedupe on the shared key, cap, and sort. */
function settle(drafts: readonly ArchFactDraft[], exclude?: ReadonlySet<string>): ArchFactDraft[] {
  const seen = new Set<string>();
  const out: ArchFactDraft[] = [];
  for (const d of drafts) {
    const f = capped(d);
    const key = factKey(f);
    if (seen.has(key)) continue;
    if (exclude !== undefined && exclude.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  out.sort(byLineRuleSubject);
  return out;
}

/** Every fact of one file, sorted and deduped. */
export function readFacts(input: FactReadInput): ArchFactDraft[] {
  const drafts: ArchFactDraft[] = pathFacts(input.relPath);
  if (input.text !== null) {
    if (isManifestPath(input.relPath)) {
      drafts.push(...readManifestFacts(input.relPath, input.text));
    } else if (input.lang !== null) {
      const lines = input.text.split('\n');
      const ctx = contextOf(input.relPath, input.lang, input.text);
      drafts.push(...applyCallRules(input.calls, ctx, lines));
      drafts.push(...applyLineRules(ctx, lines));
      drafts.push(...declarationSurfaces(input.relPath, lines));
    }
  }
  return settle(drafts);
}

/**
 * The facts of one file reachable ONLY through a wrapper.
 *
 * `map` is the project wide wrapper map; `own` is this file's own
 * declarations, which shadow it (`shadowWrappers` is idempotent, so a map
 * the caller already shadowed reads the same). `base` is what `readFacts`
 * answered for the same input, and every key in it is dropped here.
 */
export function readWrapFacts(
  input: FactReadInput,
  map: ReadonlyMap<string, ExtractedWrapper>,
  own: readonly ExtractedWrapper[],
  base: readonly ArchFactDraft[]
): ArchFactDraft[] {
  if (input.text === null || input.lang === null || input.calls.length === 0) return [];
  if (isManifestPath(input.relPath)) return [];
  const local = own.length === 0 ? map : shadowWrappers(map, own);
  const unwrapped: ExtractedCall[] = [];
  for (const site of input.calls) {
    const u = unwrapSite(site, local);
    if (u !== null) unwrapped.push(u);
  }
  if (unwrapped.length === 0) return [];
  const lines = input.text.split('\n');
  const ctx = contextOf(input.relPath, input.lang, input.text);
  const extra = applyCallRules(unwrapped, ctx, lines).map((f) => ({ ...f, rule: `${f.rule}+wrap` }));
  const already = new Set(base.map((f) => factKey(capped(f))));
  return settle(extra, already);
}
