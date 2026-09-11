/**
 * The CLOSED call rule table, and the cross rule dedupe (Phase 257).
 *
 * `CALL_RULES` is the whole set of call shaped rules the fact base asks, in
 * the charter's category order. It is a constant and never a setting: the
 * boundary sentence of CLAUDE.md is that configuration selects from choices
 * the compiled world already contains, and here the compiled world is this
 * array. `conformance:facts` rule 2 asserts that no dropped rule id is in it.
 *
 * THE DEDUPE IS ACROSS RULES, NOT ACROSS SITES, and research 118 §6.2 item 3
 * is why: on a python route two rules legitimately fire, the decorator rule
 * on `(decorator …)` and the method call rule on the `(call …)` inside it,
 * and counting both halved the measured precision on fastapi-app, 41 facts
 * for 23 routes, before the key dropped the rule id.
 */

import type { ArchFactDraft } from '@shared/arch';
import type { ExtractedCall } from '../../symbols/extract';
import { FACT_LIMITS } from './limits';
import { BOUNDARY_RULES } from './rules-boundary';
import { EFFECT_RULES } from './rules-effect';
import { ENTRYPOINT_RULES } from './rules-entrypoint';
import { GATE_RULES } from './rules-gate';
import { NETWORK_RULES } from './rules-network';
import { STORE_RULES } from './rules-store';
import { SURFACE_RULES } from './rules-surface';
import { TEST_RULES } from './rules-test';
import { ruleReads, type FactRule, type RuleContext } from './types';

export const CALL_RULES: readonly FactRule[] = [
  ...ENTRYPOINT_RULES,
  ...BOUNDARY_RULES,
  ...SURFACE_RULES,
  ...STORE_RULES,
  ...EFFECT_RULES,
  ...NETWORK_RULES,
  ...GATE_RULES,
  ...TEST_RULES
];

/** The dedupe key every family of the reader shares. */
export function factKey(f: Pick<ArchFactDraft, 'category' | 'kind' | 'subject' | 'line'>): string {
  return `${f.category}|${f.kind}|${f.subject}|${f.line}`;
}

/** The cited line, trimmed and cut. */
export function evidenceAt(lines: readonly string[], line: number): string {
  return (lines[line - 1] ?? '').trim().slice(0, FACT_LIMITS.maxEvidence);
}

/** Every fact the call rules yield for one file's call sites. */
export function applyCallRules(
  sites: readonly ExtractedCall[],
  ctx: RuleContext,
  lines: readonly string[]
): ArchFactDraft[] {
  const out: ArchFactDraft[] = [];
  const seen = new Set<string>();
  for (const s of sites) {
    for (const r of CALL_RULES) {
      if (!ruleReads(r.langs, ctx.lang)) continue;
      let subject: string | null = null;
      try {
        subject = r.match(s, ctx);
      } catch {
        subject = null;
      }
      if (subject === null) continue;
      subject = subject.slice(0, FACT_LIMITS.maxSubject);
      const draft: ArchFactDraft = {
        category: r.category,
        kind: r.kind,
        subject,
        line: s.line,
        rule: r.id,
        evidence: evidenceAt(lines, s.line)
      };
      const key = factKey(draft);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(draft);
    }
  }
  return out;
}
