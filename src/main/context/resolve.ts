/**
 * Precedence. This is the value of the phase, and it is the part a panel gets
 * confidently wrong.
 *
 * There is one real standard and eleven bespoke filesystems. Agent Skills
 * standardises the FILE and says nothing about where skills live, what scopes
 * exist, or who wins a name collision, so every agent invented those
 * independently and they disagree. Research 29 §2.9 counted seven mutually
 * incompatible models across twelve agents, and two of them run in opposite
 * directions inside Claude Code alone: a project `settings.json` beats your
 * personal one, while your personal `~/.claude/skills/deploy` beats the repo's
 * `.claude/skills/deploy`. A view that draws one scope axis and orders it once
 * is wrong about half of what it shows.
 *
 * So the ordering lives in the DATA. Each declared location carries a `rank`
 * for its own agent and its own category, and this file has exactly one
 * comparison: lower rank wins. Claude Code's global skills are rank 2 and its
 * project skills are rank 3; Gemini's project skills are rank 1 and its global
 * ones are rank 3. The inversion is a pair of numbers in a table rather than a
 * branch in code, which is the only version of this that a person can check
 * against the research a year from now.
 *
 * Three of the seven models resolve nothing, and they are handled honestly
 * rather than forced into an order:
 *  - `no-override` — Codex keeps both and lets the user pick.
 *  - `cli-reported` — muse resolves it internally and a file read cannot.
 *  - `unknown` — Tortie found a collision and never established the rule.
 * All three produce two rows and a sentence, never a made-up winner.
 *
 * Pure functions over candidates. No disk, no clock, no Electron.
 */

import type {
  ContextAgentVerdict,
  ContextCategory,
  ContextEntry,
  ContextEvidence,
  ContextPayload,
  ContextPrecedenceModel,
  ContextResolution,
  ContextScope,
  ContextSectionCount,
  ContextShadow,
  ContextState
} from '@shared/context';
import { CONTEXT_CATEGORIES } from '@shared/context';
import type { AgentRegistryId } from '@shared/types';
import type { Candidate } from './candidate';
import type { ContextPrecedence } from './agent-context';

/** Models where nothing shadows anything, so every candidate stays a row. */
const COEXISTING: Partial<Record<ContextPrecedenceModel, ContextResolution>> = {
  'merge-all': 'merges',
  'no-override': 'coexists',
  'cli-reported': 'coexists',
  unknown: 'unknown'
};

/** Most specific first. Used only to pick one scope for a row seen by many agents. */
const SCOPE_ORDER: readonly ContextScope[] = [
  'managed',
  'project-local',
  'project',
  'global',
  'plugin',
  'bundled'
];

/** How a scope reads in a sentence about who beat whom. */
const SCOPE_WORDS: Readonly<Record<ContextScope, string>> = {
  managed: "your organisation's policy",
  'project-local': 'this project, for you only',
  project: 'this project',
  global: 'your home folder',
  plugin: 'a plugin',
  bundled: 'the bundled set'
};

const EVIDENCE_ORDER: readonly ContextEvidence[] = ['unverified', 'doc', 'verified'];

function weakestEvidence(values: readonly ContextEvidence[]): ContextEvidence {
  let worst: ContextEvidence = 'verified';
  for (const value of values) {
    if (EVIDENCE_ORDER.indexOf(value) < EVIDENCE_ORDER.indexOf(worst)) worst = value;
  }
  return worst;
}

/** "Also defined in this project. The global one wins." */
export function shadowSentence(winner: ContextScope, loser: ContextScope): string {
  if (winner === loser) {
    return `Also defined in ${SCOPE_WORDS[loser]}, in another file. The first one wins.`;
  }
  return `Also defined in ${SCOPE_WORDS[loser]}. The one in ${SCOPE_WORDS[winner]} wins.`;
}

/** One agent's answer for one category. */
export interface AgentResolution {
  agent: AgentRegistryId;
  category: ContextCategory;
  model: ContextPrecedenceModel;
  winners: { candidate: Candidate; resolution: ContextResolution; shadows: Candidate[] }[];
}

/**
 * Resolve one agent's candidates for one category.
 *
 * Two steps, and the first one is the realpath dedupe: a candidate reachable
 * from two of this agent's own roots is ONE thing, not a collision, because it
 * is the same file. Only after that does a name collision mean two different
 * definitions competing.
 */
export function resolveForAgent(
  agent: AgentRegistryId,
  category: ContextCategory,
  candidates: readonly Candidate[],
  precedence: ContextPrecedence
): AgentResolution {
  const byIdentity = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const existing = byIdentity.get(candidate.identity);
    if (!existing || candidate.rank < existing.rank) byIdentity.set(candidate.identity, candidate);
  }

  const byName = new Map<string, Candidate[]>();
  for (const candidate of byIdentity.values()) {
    const key = `${candidate.bundled ? 'bundled:' : ''}${candidate.name}`;
    const list = byName.get(key);
    if (list) list.push(candidate);
    else byName.set(key, [candidate]);
  }

  const coexisting = COEXISTING[precedence.model];
  const winners: AgentResolution['winners'] = [];
  for (const group of byName.values()) {
    if (group.length === 1) {
      const only = group[0];
      if (!only) continue;
      winners.push({
        candidate: only,
        resolution: precedence.model === 'merge-all' ? 'merges' : 'only',
        shadows: []
      });
      continue;
    }
    if (coexisting) {
      for (const candidate of group) {
        winners.push({ candidate, resolution: coexisting, shadows: [] });
      }
      continue;
    }
    const sorted = [...group].sort(
      (a, b) => a.rank - b.rank || a.sourcePath.localeCompare(b.sourcePath)
    );
    const winner = sorted[0];
    if (!winner) continue;
    winners.push({ candidate: winner, resolution: 'wins', shadows: sorted.slice(1) });
  }
  return { agent, category, model: precedence.model, winners };
}

// ---------------------------------------------------------------------------
// Cross-agent merge
// ---------------------------------------------------------------------------

function pickScope(scopes: readonly ContextScope[]): ContextScope {
  let best: ContextScope = 'bundled';
  for (const scope of scopes) {
    if (SCOPE_ORDER.indexOf(scope) < SCOPE_ORDER.indexOf(best)) best = scope;
  }
  return best;
}

function stateOf(input: {
  hasProblem: boolean;
  managed: boolean;
  allDisabled: boolean;
  hasShadows: boolean;
}): ContextState {
  if (input.hasProblem) return 'broken';
  if (input.managed) return 'managed';
  if (input.allDisabled) return 'disabled';
  if (input.hasShadows) return 'shadowing';
  return 'active';
}

/**
 * Fold every agent's answer into the rows the view shows.
 *
 * The list shows the RESOLVED set, never the union. One row per effective
 * thing, and a losing duplicate is a mark on the winner rather than a row of
 * its own. The count in a section header is therefore the number of things
 * that will happen, not the number of files on disk. On the operator's machine
 * that is 33 rows instead of 107, so the resolved list is also the shorter
 * one.
 *
 * `agentOrder` decides which agent's verdict a row leads with when several
 * reach the same thing and disagree. Every verdict is kept, so the detail view
 * can show the disagreement rather than hiding it behind one answer.
 */
export function mergeAcrossAgents(
  resolutions: readonly AgentResolution[],
  agentOrder: readonly AgentRegistryId[]
): ContextEntry[] {
  const rank = new Map(agentOrder.map((agent, index) => [agent, index]));
  interface Bucket {
    candidates: { candidate: Candidate; resolution: ContextResolution; model: ContextPrecedenceModel; shadows: Candidate[] }[];
    category: ContextCategory;
  }
  const buckets = new Map<string, Bucket>();

  for (const resolution of resolutions) {
    for (const winner of resolution.winners) {
      const key = `${resolution.category}|${winner.candidate.identity}`;
      const bucket = buckets.get(key) ?? { candidates: [], category: resolution.category };
      bucket.candidates.push({
        candidate: winner.candidate,
        resolution: winner.resolution,
        model: resolution.model,
        shadows: winner.shadows
      });
      buckets.set(key, bucket);
    }
  }

  const entries: ContextEntry[] = [];
  for (const [key, bucket] of buckets) {
    const ordered = [...bucket.candidates].sort(
      (a, b) =>
        (rank.get(a.candidate.agent) ?? 99) - (rank.get(b.candidate.agent) ?? 99) ||
        a.candidate.sourcePath.localeCompare(b.candidate.sourcePath)
    );
    const primary = ordered[0];
    if (!primary) continue;

    const verdicts: ContextAgentVerdict[] = ordered.map((item) => ({
      agent: item.candidate.agent,
      viaPath: item.candidate.sourcePath,
      scope: item.candidate.scope,
      resolution: item.resolution,
      model: item.model
    }));

    const shadowByPath = new Map<string, ContextShadow>();
    for (const item of ordered) {
      for (const loser of item.shadows) {
        const existing = shadowByPath.get(loser.sourcePath);
        if (existing) {
          if (!existing.losesFor.includes(item.candidate.agent)) {
            existing.losesFor.push(item.candidate.agent);
          }
          continue;
        }
        shadowByPath.set(loser.sourcePath, {
          scope: loser.scope,
          sourcePath: loser.sourcePath,
          losesFor: [item.candidate.agent],
          reason: shadowSentence(item.candidate.scope, loser.scope)
        });
      }
    }

    const agents = [...new Set(ordered.map((item) => item.candidate.agent))];
    const problem = ordered.map((item) => item.candidate.problem).find((value) => value) ?? null;
    const payload: ContextPayload = primary.candidate.payload;
    entries.push({
      id: key,
      category: bucket.category,
      name: primary.candidate.name,
      summary: primary.candidate.summary,
      scope: pickScope(ordered.map((item) => item.candidate.scope)),
      sourcePath: primary.candidate.sourcePath,
      realPath: primary.candidate.realPath,
      agents,
      verdicts,
      state: stateOf({
        hasProblem: problem !== null,
        managed: ordered.some((item) => item.candidate.managed),
        allDisabled: ordered.every((item) => item.candidate.disabled),
        hasShadows: shadowByPath.size > 0
      }),
      resolution: primary.resolution,
      model: primary.model,
      evidence: weakestEvidence(ordered.map((item) => item.candidate.evidence)),
      shadows: [...shadowByPath.values()],
      hash: null,
      hashAlgorithm: null,
      executes: ordered.map((item) => item.candidate.executes).find((value) => value) ?? null,
      problem,
      payload
    });
  }
  return sortEntries(entries);
}

/**
 * Rows in reading order: scope groups in the order the view draws them, then
 * merged categories by their load order, then by name. Hooks and instructions
 * keep the order they were read in, because for a merged category the order IS
 * the answer.
 */
export function sortEntries(entries: readonly ContextEntry[]): ContextEntry[] {
  return [...entries].sort((a, b) => {
    const byCategory =
      CONTEXT_CATEGORIES.indexOf(a.category) - CONTEXT_CATEGORIES.indexOf(b.category);
    if (byCategory !== 0) return byCategory;
    if (a.category === 'instruction') {
      const aOrder = a.payload.kind === 'instruction' ? a.payload.order : 0;
      const bOrder = b.payload.kind === 'instruction' ? b.payload.order : 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
    }
    if (a.category === 'hook') {
      const aEvent = a.payload.kind === 'hook' ? a.payload.event : '';
      const bEvent = b.payload.kind === 'hook' ? b.payload.event : '';
      if (aEvent !== bEvent) return aEvent.localeCompare(bEvent);
    }
    const byScope = SCOPE_ORDER.indexOf(a.scope) - SCOPE_ORDER.indexOf(b.scope);
    if (byScope !== 0) return byScope;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Section counts. Vendor-bundled entries are a separate class and never join
 * the user's count: Cursor's `skills-cursor` and Codex's `skills/.system` are
 * the product, not the user's configuration.
 */
export function countSections(entries: readonly ContextEntry[]): ContextSectionCount[] {
  return CONTEXT_CATEGORIES.map((category) => {
    const rows = entries.filter((entry) => entry.category === category);
    const bundled = rows.filter((entry) => entry.scope === 'bundled');
    const agents = new Set<AgentRegistryId>();
    for (const row of rows) for (const agent of row.agents) agents.add(agent);
    return {
      category,
      resolved: rows.length - bundled.length,
      bundled: bundled.length,
      agentsCovered: agents.size
    };
  });
}
