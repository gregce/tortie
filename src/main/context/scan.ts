/**
 * One scan: read every declared location, resolve each agent's own
 * precedence, and fold the answers into the rows the view shows.
 *
 * **The reader reads FILES.** It never shells out. That is not a performance
 * preference, it is the anti-dashboard rule expressed as a data layer: the
 * full cross-agent skill resolve is 11.1 ms on the operator's machine, while
 * `claude mcp list` is 2.5 seconds because it health-checks every server over
 * the network. A sidebar that refreshed by asking the CLIs would be slow, would
 * emit network traffic on a passive UI refresh, and would spawn other people's
 * processes to draw a list. Health and tool discovery are explicit on-demand
 * verbs somewhere else, and mutation goes through each agent's own command.
 *
 * Everything it touches is read-only. Nothing in this directory writes to an
 * agent's configuration, ever.
 */

import { resolve as resolvePath } from 'node:path';
import type {
  ContextAgentReadout,
  ContextCategory,
  ContextEntry,
  ContextProblem,
  ContextRootReadout,
  ContextScanInput,
  ContextScanResult
} from '@shared/context';
import { CONTEXT_CATEGORIES } from '@shared/context';
import type { AgentRegistryId } from '@shared/types';
import {
  CONTEXT_AGENT_IDS,
  displayName,
  locationsFor,
  precedenceFor,
  precedenceReadoutFor,
  readsSkillFrontmatterHooks,
  reloadFor,
  skillsCliNameFor,
  supportedCategories
} from './agent-context';
import type { Candidate, ReadContext } from './candidate';
import { resolveHomes } from './env';
import { attachHashes } from './hash';
import { countSections, mergeAcrossAgents, resolveForAgent, type AgentResolution } from './resolve';
import { createNodeContextFs, type ContextFs } from './port';
import { readHooks, readSkillFrontmatterHooks } from './read/hooks';
import { readInstructions } from './read/instructions';
import { readMcp } from './read/mcp';
import { readPlugins } from './read/plugins';
import { readSkills } from './read/skills';
import { expandLocation } from './env';

/**
 * The order a row leads with when several agents reach the same thing. Claude
 * Code first because it is the reference implementation the others read as a
 * compatibility target, then the rest in registry order.
 */
/**
 * Categories are READ in this order and DISPLAYED in another. Plugins go
 * first because a plugin's install directory is where its skills, hooks and
 * MCP servers live, and skills go before hooks because a skill can declare a
 * hook in its own frontmatter.
 */
const READ_ORDER: readonly ContextCategory[] = [
  'plugin',
  'skill',
  'mcp',
  'hook',
  'instruction'
];

const AGENT_LEAD_ORDER: readonly AgentRegistryId[] = [
  'claude',
  'codex',
  'gemini',
  'cursor',
  'qwen',
  'antigravity',
  'muse',
  'pi',
  'deepseek',
  'droid'
];

async function readCategory(
  ctx: ReadContext,
  category: ContextCategory,
  wantExecutableScan: boolean
): Promise<Candidate[]> {
  const locations = locationsFor(ctx.agent, category);
  if (locations.length === 0) return [];
  switch (category) {
    case 'skill':
      return readSkills(ctx, locations, wantExecutableScan);
    case 'mcp':
      return readMcp(ctx, locations);
    case 'hook':
      return readHooks(ctx, locations);
    case 'plugin':
      return readPlugins(ctx, locations);
    case 'instruction':
      return readInstructions(ctx, locations);
    default:
      return [];
  }
}

/** Which roots were looked at and whether they were there, for §11's honesty. */
async function rootReadout(
  ctx: ReadContext,
  categories: readonly ContextCategory[]
): Promise<ContextRootReadout[]> {
  const out: ContextRootReadout[] = [];
  for (const category of categories) {
    for (const location of locationsFor(ctx.agent, category)) {
      const path = expandLocation(location.at, ctx.homes, ctx.projectRoot);
      if (!path || path.includes('*')) continue;
      out.push({
        path,
        category,
        scope: location.scope,
        exists: await ctx.fs.exists(path)
      });
    }
  }
  return out;
}

export interface ScanDeps {
  /** Injected by the tests; production uses the real filesystem. */
  fs?: ContextFs;
}

/**
 * Read the configuration every selected agent will load, and resolve it.
 *
 * Nothing here can fail the caller: an unreadable file becomes a problem in
 * the result and the rest of the view still renders, because one bad file must
 * never blank the panel.
 */
export async function scanContext(
  input: ContextScanInput,
  deps: ScanDeps = {}
): Promise<ContextScanResult> {
  const startedAt = Date.now();
  const started = process.hrtime.bigint();
  const fs = deps.fs ?? createNodeContextFs();
  const env = input.env ?? process.env;
  const homes = resolveHomes(env);
  const projectRoot = input.cwd ? resolvePath(input.cwd) : null;
  const categories = input.categories ?? CONTEXT_CATEGORIES;
  const agents = input.agent ? [input.agent] : CONTEXT_AGENT_IDS;
  const wantExecutableScan = input.scanExecutable === true;

  const problems: ContextProblem[] = [];
  const seenProblems = new Set<string>();
  let truncated = false;

  const resolutions: AgentResolution[] = [];
  const readouts: ContextAgentReadout[] = [];
  const hashTargets = new Map<string, { kind: 'file' | 'dir'; path: string }>();

  async function readAgent(agent: AgentRegistryId): Promise<void> {
    const ctx: ReadContext = {
      fs,
      homes,
      env,
      projectRoot,
      agent,
      includeNested: input.includeNested !== false,
      pluginRoots: [],
      addProblem(problem) {
        const key = `${problem.path}:${problem.line ?? 0}:${problem.message}`;
        if (seenProblems.has(key)) return;
        seenProblems.add(key);
        problems.push(problem);
      },
      markTruncated() {
        truncated = true;
      }
    };

    let skillCandidates: Candidate[] = [];
    for (const category of READ_ORDER) {
      if (!categories.includes(category)) continue;
      const candidates = await readCategory(ctx, category, wantExecutableScan);
      if (category === 'plugin') {
        ctx.pluginRoots = candidates
          .filter((candidate) => !candidate.disabled)
          .map((candidate) =>
            candidate.payload.kind === 'plugin' && candidate.payload.installPath
              ? { name: candidate.name, path: candidate.payload.installPath }
              : null
          )
          .filter((root): root is { name: string; path: string } => root !== null);
      }
      if (category === 'skill') skillCandidates = candidates;
      const extra =
        category === 'hook' && readsSkillFrontmatterHooks(agent)
          ? readSkillFrontmatterHooks(skillCandidates)
          : [];
      const all = [...candidates, ...extra];
      for (const candidate of all) hashTargets.set(candidate.identity, candidate.hashTarget);
      resolutions.push(resolveForAgent(agent, category, all, precedenceFor(agent, category)));
    }

    const supported = supportedCategories(agent);
    readouts.push({
      agent,
      displayName: displayName(agent),
      skillsCliName: skillsCliNameFor(agent),
      supported: supported.filter((category) => categories.includes(category)),
      unknown: CONTEXT_CATEGORIES.filter((category) => !supported.includes(category)),
      roots: await rootReadout(ctx, categories),
      reload: Object.fromEntries(
        CONTEXT_CATEGORIES.map((category) => [category, reloadFor(agent, category)])
      ),
      // Only for the categories this agent actually declares a location for.
      // An absent key is an absent claim, which is the same rule §2.4 applies
      // to a `?` cell: the view then says nothing rather than saying Claude
      // Code's answer on another agent's behalf.
      precedence: Object.fromEntries(
        supported
          .filter((category) => categories.includes(category))
          .map((category) => [category, precedenceReadoutFor(agent, category)])
      )
    });
  }

  // Agents run together, categories within an agent run in order. Nine of the
  // twelve agents declare `~/.agents/skills`, and the port memoises a read the
  // moment it starts rather than when it finishes, so the overlap costs one
  // listing rather than nine.
  await Promise.all(agents.map((agent) => readAgent(agent)));
  readouts.sort(
    (a, b) => AGENT_LEAD_ORDER.indexOf(a.agent) - AGENT_LEAD_ORDER.indexOf(b.agent)
  );

  const merged = mergeAcrossAgents(resolutions, AGENT_LEAD_ORDER, displayName);
  // Phase 26.2 — a user-owned naming problem takes its section row only now,
  // because its message names the agents that load the skill and those come
  // from the verdicts the merge just produced. Vendor-owned mismatches never
  // reach this list: they are a quiet note on the payload instead.
  for (const entry of merged) {
    if (entry.problem !== null && entry.problem.revealDir !== undefined) {
      problems.push(entry.problem);
    }
  }
  const targetsById = new Map<string, { kind: 'file' | 'dir'; path: string }>();
  for (const entry of merged) {
    const identity = entry.id.slice(entry.id.indexOf('|') + 1);
    const target = hashTargets.get(identity);
    if (target) targetsById.set(entry.id, target);
  }
  const entries: ContextEntry[] = await attachHashes(
    fs,
    merged,
    input.hash ?? 'none',
    targetsById
  );

  return {
    entries,
    sections: countSections(entries),
    problems,
    agents: readouts,
    cwd: projectRoot,
    scannedAt: startedAt,
    durationMs: Number(process.hrtime.bigint() - started) / 1e6,
    truncated
  };
}
