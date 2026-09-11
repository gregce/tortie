/**
 * The one hop wrapper pass, closed over the declarations the worker captured
 * (Phase 257, research 118 §6.3).
 *
 * The product writes `handle(ipc, 'arch:map', …)` through
 * `src/main/typed-ipc.ts`, which is this repository's own growth guardrail. A
 * rule table keyed on callee names sees `handle` and nothing else: 2 IPC
 * facts, 0 of 229 channels, measured 2026-09-10. One hop of wrapper
 * resolution closes it to 229 of 229 with zero false positives, and THREE
 * clauses had to be right, each measured and each an ablation of
 * `conformance:facts` rule 4:
 *
 *  1. key on a BARE call (`unwrapSite`), or a wrapper named `on` puts 41
 *     emitter events into the channel list;
 *  2. follow the IMPORT ALIAS (`import { handle as handleTyped }`), which the
 *     worker applies at extraction so a declaration arrives alias resolved;
 *  3. let a CALLER'S OWN declaration shadow the project wide one
 *     (`shadowWrappers`), because `handle` is declared twice here with two
 *     signatures, and that is exactly the 26 that were missing.
 *
 * It is a SETTING, off by default (`./wrapper-setting.ts`), because the pass
 * costs 1.57× to 3.81× the read and finds 735 facts on Tortie against 2 across
 * eight other repositories. The stated limits: one declared function to one
 * call on an anchor, closed to `WRAPPER_MAX_HOPS`; a wrapper reached through an
 * object property or a class method table is not found.
 */

import { ARCH_WRAPPER_ANCHORS, ARCH_WRAPPER_GRAMMARS } from '@shared/arch';
import type { ExtractedCall, ExtractedWrapper } from '../../symbols/extract';
import { GRAMMARS, type GrammarId } from '../../symbols/languages';
import { sha256Hex } from './oid';
import { splitCallee } from './predicates';

/**
 * The anchor table. Its home is `@shared/arch`, because the worker's
 * declaration walk on the far side of the arch directory wall reads it too;
 * this name is the one the fact base uses.
 */
export const ANCHORS: Readonly<Record<string, number>> = ARCH_WRAPPER_ANCHORS;

/**
 * The grammars the pass runs over. Every one of the three clauses above was
 * measured on this repository's TypeScript, and §6.3 counted 2 wrapper only
 * facts across the eight repositories in the other six families.
 */
export const WRAPPER_GRAMMARS: readonly GrammarId[] = ARCH_WRAPPER_GRAMMARS.filter((g): g is GrammarId =>
  (GRAMMARS as readonly string[]).includes(g)
);

/** The hop bound the 229 of 229 was measured with. */
export const WRAPPER_MAX_HOPS = 3;

/**
 * Close the wrapper graph, bounded at `maxHops`. A candidate whose inner
 * callee is itself a resolved wrapper, and whose forwarded argument lands in
 * that wrapper's own name position, becomes resolved with the anchor's callee.
 * `own` is the calling file's own declarations, and they shadow the project
 * wide answer (clause 3).
 */
export function closeWrappers(
  candidates: readonly ExtractedWrapper[],
  maxHops = WRAPPER_MAX_HOPS,
  own: readonly ExtractedWrapper[] = []
): Map<string, ExtractedWrapper> {
  const resolved = new Map<string, ExtractedWrapper>();
  // Hop 1: a declaration that forwards straight into an anchor api.
  for (const c of candidates) {
    if (c.hops === 1 && !resolved.has(c.name)) resolved.set(c.name, c);
  }
  // Hops 2..max: a declaration that forwards into a declaration resolved at
  // the PREVIOUS hop, with the forwarded argument landing in that one's name
  // position. Each pass reads the map as it stood when the pass began, so a
  // hop count is a hop count and the closure does not depend on the order
  // the candidates arrived in, which is what keeps `wrapperDigest` stable.
  const pending = candidates.filter((c) => c.hops !== 1);
  for (let hop = 2; hop <= maxHops; hop += 1) {
    const known = new Map(resolved);
    let grew = false;
    for (const c of pending) {
      if (resolved.has(c.name)) continue;
      const inner = known.get(c.innerLast);
      if (inner === undefined) continue;
      if (c.innerIndex !== inner.paramIndex) continue;
      resolved.set(c.name, {
        ...c,
        innerCallee: inner.innerCallee,
        innerLast: inner.innerLast,
        hops: hop
      });
      grew = true;
    }
    if (!grew) break;
  }
  return own.length === 0 ? resolved : shadowWrappers(resolved, own);
}

/**
 * A CALLER'S OWN declaration shadows whatever the project wide pass settled
 * on, whether or not that name was already resolved. This is what makes two
 * declarations of one name with two different signatures both answerable.
 * Idempotent: shadowing a map already shadowed with the same `own` changes
 * nothing, so a caller may hand `readWrapFacts` either shape.
 */
export function shadowWrappers(
  map: ReadonlyMap<string, ExtractedWrapper>,
  own: readonly ExtractedWrapper[]
): Map<string, ExtractedWrapper> {
  const out = new Map(map);
  for (const c of own) {
    if (c.hops === 1) {
      out.set(c.name, c);
      continue;
    }
    const inner = map.get(c.innerLast);
    if (inner === undefined) continue;
    if (c.innerIndex !== inner.paramIndex) continue;
    out.set(c.name, {
      ...c,
      innerCallee: inner.innerCallee,
      innerLast: inner.innerLast,
      hops: inner.hops + 1
    });
  }
  return out;
}

/**
 * Rewrite a call site that goes through a known wrapper into the site the
 * anchor api would have produced, so the SAME rule table answers it, or null
 * when the site is not a bare call of a wrapper with its name argument
 * present.
 */
export function unwrapSite(
  site: ExtractedCall,
  map: ReadonlyMap<string, ExtractedWrapper>
): ExtractedCall | null {
  // A BARE call only (clause 1), and bare means the callee IS the name.
  // Keying on the final segment alone made `sock.on('data')` resolve against
  // a wrapper declared as `on`, which put 41 emitter events into this
  // repository's IPC channel list; asking the receiver alone still let
  // `$(window).on('hashchange', f)` through, because `splitCallee` strips the
  // `$(window)` call before it splits and reads a receiver of '', and that
  // shape put a jQuery event into the list (alamofire/surface/0).
  if (site.callee !== site.last) return null;
  if (site.form !== 'call') return null;
  const w = map.get(site.last);
  if (w === undefined) return null;
  if (site.args.length <= w.paramIndex) return null;
  const name = site.args[w.paramIndex];
  if (name === undefined || name === '') return null;
  const shifted = site.args.slice(w.paramIndex);
  const { last, recv } = splitCallee(w.innerCallee);
  return { ...site, callee: w.innerCallee, last, recv, args: shifted, form: 'call' };
}

/**
 * The digest `arch_fact_file.wrap_digest` records: sha256 over the sorted
 * `name|innerCallee|paramIndex|innerIndex|hops` lines. A wrapper only fact is
 * a function of the whole map rather than of one file's bytes, and when this
 * moves every wrapper grammar file is re-read for its wrapper arm alone.
 * The empty map digests to `EMPTY_WRAPPER_DIGEST`, which the gate pins.
 */
export function wrapperDigest(map: ReadonlyMap<string, ExtractedWrapper>): string {
  const lines: string[] = [];
  for (const w of map.values()) {
    lines.push(`${w.name}|${w.innerCallee}|${w.paramIndex}|${w.innerIndex}|${w.hops}`);
  }
  lines.sort();
  return sha256Hex(lines.join('\n'));
}

/** sha256 of the empty string: what `wrapperDigest(new Map())` answers. */
export const EMPTY_WRAPPER_DIGEST = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
