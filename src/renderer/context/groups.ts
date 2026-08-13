/**
 * The rules the Context view draws — sections, precedence, grouping, filtering
 * and the sentences that name a scope.
 *
 * PURE, and separate from the components on purpose. Research 29's whole
 * argument is that there is one real standard and eleven bespoke filesystems,
 * with at least seven mutually incompatible precedence models across twelve
 * agents (§2.9), and that a panel drawing one scope axis and ordering it once
 * will be wrong about half of what it shows (R4). That is exactly the kind of
 * rule that has to be unit-testable without a DOM.
 *
 * THE ONE PLACE THIS FILE DEPARTS FROM A WIREFRAME, stated so the integrator
 * does not "fix" it back. §6.4 is the rule: categories that RESOLVE are grouped
 * by scope "printed in precedence order for that category", and "the reading
 * order IS the resolution order". §5.7's illustration draws SKILLS with "This
 * project" above "All your projects", which is the opposite of §2.3's verified
 * skills ladder (enterprise, then personal, then project, then bundled). The
 * rule wins over the illustration, because the inversion is the single most
 * valuable thing this view carries and drawing it upside down would be the
 * confident misrepresentation R4 names.
 */

import { CONTEXT_SCOPE_LABEL, hookEvent, instructionOrder, isBundled } from './model';
import type {
  ContextAgentReadout,
  ContextCategory,
  ContextEntry,
  ContextPrecedenceModel,
  ContextReloadBehavior,
  ContextRootReadout,
  ContextScope
} from './model';

// ---------------------------------------------------------------------------
// Sections (§5.4)
// ---------------------------------------------------------------------------

export const CONTEXT_SECTION_IDS = [
  'skills',
  'mcp',
  'hooks',
  'plugins',
  'instructions'
] as const;

export type ContextSectionId = (typeof CONTEXT_SECTION_IDS)[number];

/** Section header label. Uppercase is the stylesheet's job, not the data's. */
export const CONTEXT_SECTION_LABELS: Readonly<
  Record<ContextSectionId, string>
> = {
  skills: 'Skills',
  mcp: 'MCP servers',
  hooks: 'Hooks',
  plugins: 'Plugins',
  instructions: 'Instructions'
};

/** Which category fills each section. */
export const CONTEXT_SECTION_CATEGORY: Readonly<
  Record<ContextSectionId, ContextCategory>
> = {
  skills: 'skill',
  mcp: 'mcp',
  hooks: 'hook',
  plugins: 'plugin',
  instructions: 'instruction'
};

/** §5.4 — Skills and MCP servers open; the other three cost their header. */
export const CONTEXT_SECTION_DEFAULT_OPEN: Readonly<
  Record<ContextSectionId, boolean>
> = {
  skills: true,
  mcp: true,
  hooks: false,
  plugins: false,
  instructions: false
};

/** §5.5 — one codicon per category, `--text-secondary` throughout. */
export const CONTEXT_CATEGORY_ICON: Readonly<
  Record<ContextCategory, string>
> = {
  skill: 'lightbulb',
  mcp: 'plug',
  hook: 'symbol-event',
  plugin: 'package',
  instruction: 'book'
};

// ---------------------------------------------------------------------------
// Resolution: "wins" versus "also runs" (§6.4)
// ---------------------------------------------------------------------------

/**
 * Two words, used consistently and never interchangeably (§6.4). `wins` means
 * one entry replaces the others outright. `all-run` means they merge, and a
 * precedence order would imply a resolution that does not happen.
 */
export type CategoryResolution = 'wins' | 'all-run';

export const CONTEXT_RESOLUTION: Readonly<
  Record<ContextCategory, CategoryResolution>
> = {
  skill: 'wins',
  mcp: 'wins',
  plugin: 'wins',
  hook: 'all-run',
  instruction: 'all-run'
};

/** How a section groups its rows (§6.4). */
export type ContextGroupKind = 'scope' | 'event' | 'chain';

export const CONTEXT_GROUP_KIND: Readonly<
  Record<ContextCategory, ContextGroupKind>
> = {
  skill: 'scope',
  mcp: 'scope',
  plugin: 'scope',
  hook: 'event',
  instruction: 'chain'
};

// ---------------------------------------------------------------------------
// Precedence, per category (§2.3) — the ladders, highest first
// ---------------------------------------------------------------------------

/**
 * CLAUDE CODE'S LADDERS, kept only as the fallback for a scan that arrived
 * without per-agent precedence — an older preload, or a category no selected
 * agent declares.
 *
 * THEY ARE NOT THE ANSWER FOR ANY OTHER AGENT, and treating them as one was the
 * defect this file carried until Phase 22's fix round. `scopeOrderFor` took a
 * category and nothing else, so the skills section drew "All your projects"
 * first and said "One of these beats a skill of the same name that this project
 * commits" whichever agent was selected. Measured with the selector pinned to
 * gemini: the project copy correctly won on screen, directly under a sentence
 * saying the personal copy wins. Gemini is narrowest-wins, Codex keeps both,
 * and Cursor's rule was never established.
 *
 * The order and the words now come from `PrecedenceView` below, which main
 * derives per agent from the declared location ranks.
 */
const SKILL_PRECEDENCE: readonly ContextScope[] = [
  'managed',
  'global',
  'project',
  'project-local',
  'plugin'
];

/** Claude Code's MCP ladder, which runs the other way from its skills ladder. */
const MCP_PRECEDENCE: readonly ContextScope[] = [
  'managed',
  'project-local',
  'project',
  'global',
  'plugin'
];

/** No verified plugin ladder anywhere, so this is a display order only. */
const PLUGIN_ORDER: readonly ContextScope[] = [
  'managed',
  'global',
  'project',
  'project-local',
  'plugin'
];

function fallbackOrder(category: ContextCategory): readonly ContextScope[] {
  if (category === 'skill') return SKILL_PRECEDENCE;
  if (category === 'mcp') return MCP_PRECEDENCE;
  return PLUGIN_ORDER;
}

// ---------------------------------------------------------------------------
// Precedence, per AGENT — the fix for R4
// ---------------------------------------------------------------------------

/** Models where one definition replaces another. The rest resolve nothing. */
const RESOLVING_MODELS: ReadonlySet<ContextPrecedenceModel> = new Set([
  'broadest-wins',
  'narrowest-wins',
  'search-path',
  'declared-priority'
]);

/**
 * What the view knows about ordering for ONE category and the CURRENT agent
 * selection.
 *
 * `agentId` null means "all agents", and then the agents genuinely can
 * disagree. There is no correct single order in that case, so the view draws a
 * merged reading order and every sentence says the agents disagree rather than
 * picking one agent's answer and presenting it as the rule.
 */
export interface PrecedenceView {
  /** Null when no agent is selected and the selected agents disagree. */
  model: ContextPrecedenceModel | null;
  /** The order the groups are drawn in. Never empty. */
  scopeOrder: readonly ContextScope[];
  /** The registry's own sentence, when exactly one agent's answer applies. */
  note: string | null;
  /** True when several agents apply and their orders or models differ. */
  disagree: boolean;
  /** Display names of the agents this view covers, for a sentence. */
  agentNames: readonly string[];
}

/** The honest default: no per-agent data, so claim nothing about resolution. */
export function unknownPrecedence(category: ContextCategory): PrecedenceView {
  return {
    model: null,
    scopeOrder: fallbackOrder(category),
    note: null,
    disagree: false,
    agentNames: []
  };
}

/**
 * Build the view's precedence answer for one category.
 *
 * @param readouts every agent the scan read.
 * @param category the section being drawn.
 * @param agentId  the selector's value; null is "all agents".
 */
export function precedenceView(
  readouts: readonly ContextAgentReadout[],
  category: ContextCategory,
  agentId: string | null
): PrecedenceView {
  const applicable = readouts
    .filter((r) => agentId === null || r.agent === agentId)
    .map((r) => ({ readout: r, precedence: r.precedence[category] }))
    .filter(
      (r): r is { readout: ContextAgentReadout; precedence: NonNullable<typeof r.precedence> } =>
        r.precedence !== undefined && r.precedence.scopeOrder.length > 0
    );

  if (applicable.length === 0) return unknownPrecedence(category);

  const agentNames = applicable.map((a) => a.readout.displayName);

  if (applicable.length === 1) {
    const only = applicable[0];
    if (only === undefined) return unknownPrecedence(category);
    return {
      model: only.precedence.model,
      scopeOrder: only.precedence.scopeOrder,
      note: only.precedence.note,
      disagree: false,
      agentNames
    };
  }

  const first = applicable[0];
  if (first === undefined) return unknownPrecedence(category);
  const sameModel = applicable.every(
    (a) => a.precedence.model === first.precedence.model
  );
  const sameOrder = applicable.every(
    (a) => a.precedence.scopeOrder.join('|') === first.precedence.scopeOrder.join('|')
  );

  if (sameModel && sameOrder) {
    return {
      model: first.precedence.model,
      scopeOrder: first.precedence.scopeOrder,
      // Several agents agree on the rule, and their sentences are still each
      // written about their own product. Naming one of them here would put one
      // agent's words on every other agent's rows.
      note: null,
      disagree: false,
      agentNames
    };
  }

  // They disagree. The drawn order is the average position each scope takes
  // across the agents that read it, which is a reading order and nothing more.
  // Every sentence below says so.
  const totals = new Map<ContextScope, { sum: number; n: number }>();
  for (const { precedence } of applicable) {
    precedence.scopeOrder.forEach((scope, index) => {
      const seen = totals.get(scope) ?? { sum: 0, n: 0 };
      totals.set(scope, { sum: seen.sum + index, n: seen.n + 1 });
    });
  }
  const merged = [...totals.entries()]
    .sort((a, b) => a[1].sum / a[1].n - b[1].sum / b[1].n || a[0].localeCompare(b[0]))
    .map(([scope]) => scope);

  return {
    model: null,
    scopeOrder: merged.length > 0 ? merged : fallbackOrder(category),
    note: null,
    disagree: true,
    agentNames
  };
}

/** The order the groups are drawn in, for one category and one selection. */
export function scopeOrderFor(
  category: ContextCategory,
  precedence?: PrecedenceView
): readonly ContextScope[] {
  return precedence?.scopeOrder ?? fallbackOrder(category);
}

// ---------------------------------------------------------------------------
// Scope vocabulary (§5.6, §6.2)
// ---------------------------------------------------------------------------

/**
 * §5.6 — the group row's label.
 *
 * Re-exported from the shared model rather than written again. The labels sit
 * next to the scope union there precisely so a scope cannot be added without a
 * word for it, and a second copy here is how the group row and the detail card
 * would start calling the same scope two different things.
 */
export { CONTEXT_SCOPE_LABEL as SCOPE_GROUP_LABEL } from './model';

/** §6.2 — the chip word, shown only while a filter is active, at T1 and T2. */
export const SCOPE_CHIP_WORD: Readonly<Record<ContextScope, string>> = {
  project: 'project',
  'project-local': 'yours',
  global: 'global',
  plugin: 'plugin',
  managed: 'managed',
  bundled: 'bundled'
};

/**
 * §6.2 — the chip's glyph at T3 (220px), where the word does not fit.
 *
 * Scope is never a colour. It is carried by position, then words, then shape,
 * in that order of preference, which is also the order in which the channels
 * survive narrowing.
 */
export const SCOPE_CHIP_ICON: Readonly<Record<ContextScope, string>> = {
  project: 'root-folder',
  'project-local': 'account',
  global: 'globe',
  plugin: 'package',
  managed: 'lock',
  bundled: 'circuit-board'
};

/** The group whose label is `Bundled` (§2.1). Never joins a section count. */
export const BUNDLED_GROUP_LABEL = 'Bundled';

/**
 * Where a scope's contents come from. One sentence per scope, and it is the
 * same fact whichever agent is selected, because it describes a directory
 * rather than a rule.
 */
const SCOPE_ORIGIN: Readonly<Record<ContextScope, string>> = {
  managed: 'Set by your organisation.',
  global: 'Yours, in every project.',
  project: 'Committed with this project.',
  'project-local': 'In this project, and only you can see these.',
  plugin: 'Provided by a plugin.',
  bundled: 'Shipped with the agent itself.'
};

/** The word a directional sentence uses for a scope. */
const SCOPE_PHRASE: Readonly<Record<ContextScope, string>> = {
  managed: 'managed',
  global: 'personal',
  project: 'project',
  'project-local': 'local',
  plugin: 'plugin',
  bundled: 'bundled'
};

/** The noun a sentence about this category uses for one of its rows. */
const CATEGORY_NOUN: Readonly<Record<ContextCategory, string>> = {
  skill: 'skill',
  mcp: 'server',
  hook: 'hook',
  plugin: 'plugin',
  instruction: 'file'
};

/**
 * What each group row's tooltip says.
 *
 * IT IS DERIVED, NOT WRITTEN PER CATEGORY. The direction comes from the
 * selected agent's own scope order, so gemini's "This project" group says these
 * beat everything else and Claude Code's says the opposite, out of one piece of
 * code reading two rows of the substrate table. Where the model resolves
 * nothing, the sentence says nothing was replaced instead of naming a winner.
 */
export function scopeGroupHint(
  category: ContextCategory,
  scope: ContextScope,
  precedence?: PrecedenceView
): string {
  if (scope === 'bundled') {
    return 'Shipped with the agent itself. Not counted, because it belongs to the agent rather than to you.';
  }

  const origin = SCOPE_ORIGIN[scope];
  const noun = CATEGORY_NOUN[category];

  if (precedence === undefined || precedence.model === null) {
    if (precedence?.disagree === true) {
      return `${origin} Your agents do not agree about which copy of a ${noun} wins. Pick one agent above to see its answer.`;
    }
    return `${origin} Tortie has not established which copy of a ${noun} wins when two share a name.`;
  }

  if (precedence.model === 'merge-all') {
    return `${origin} Every one of these runs. None of them replaces another.`;
  }
  if (precedence.model === 'no-override') {
    return `${origin} A ${noun} of the same name somewhere else is not replaced. Both stay, and you pick.`;
  }
  if (precedence.model === 'cli-reported') {
    return `${origin} This agent resolves a name collision itself, and reading the files cannot say which copy it picks.`;
  }
  if (precedence.model === 'unknown') {
    return `${origin} Tortie has not established which copy of a ${noun} wins when two share a name.`;
  }

  if (!RESOLVING_MODELS.has(precedence.model)) return origin;

  const order = precedence.scopeOrder;
  const at = order.indexOf(scope);
  if (at < 0 || order.length < 2) return origin;
  if (at === 0) {
    return `${origin} One of these beats a ${noun} of the same name anywhere else.`;
  }
  const above = order[at - 1];
  if (above === undefined) return origin;
  return `${origin} A ${SCOPE_PHRASE[above]} ${noun} of the same name beats one here.`;
}

/**
 * §6.3 — the sentence a `⧉` mark carries.
 *
 * The reader writes one per shadow and it is the better sentence, because only
 * the reader knows which precedence model produced the answer. This function is
 * the fallback for a shadow that arrived without one, so a mark is never a
 * glyph with no explanation. It names both ends and the direction, because with
 * skills the direction is the surprising half.
 */
export function shadowHint(entry: ContextEntry): string {
  const first = entry.shadows[0];
  if (first === undefined) return '';
  const more =
    entry.shadows.length > 1
      ? ` ${String(entry.shadows.length - 1)} more definition is also not used.`
      : '';
  if (first.reason !== '') return `${first.reason}${more}`;
  const where: Readonly<Record<ContextScope, string>> = {
    project: 'in this project',
    'project-local': 'in your own settings for this project',
    global: 'in all your projects',
    plugin: 'by a plugin',
    managed: 'by your organisation',
    bundled: 'by the agent itself'
  };
  const winner: Readonly<Record<ContextScope, string>> = {
    project: 'project',
    'project-local': 'local',
    global: 'global',
    plugin: 'plugin',
    managed: 'managed',
    bundled: 'bundled'
  };
  return `Also defined ${where[first.scope]}. The ${winner[entry.scope]} one wins.${more}`;
}

// ---------------------------------------------------------------------------
// Counting and filtering
// ---------------------------------------------------------------------------

/** §5.3 — one filter, name and summary, across every section at once. */
export function matchesFilter(entry: ContextEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  return (
    entry.name.toLowerCase().includes(q) ||
    entry.summary.toLowerCase().includes(q)
  );
}

/** True when this entry is loaded by the selected agent (`null` = all). */
export function matchesAgent(
  entry: ContextEntry,
  agentId: string | null
): boolean {
  // A plain string, not `AgentRegistryId`. The selection is persisted per
  // project in localStorage and comes back as whatever was written there, so a
  // registry that drops an agent must narrow the list rather than fail to
  // compile against a stored value it no longer knows.
  return (
    agentId === null || (entry.agents as readonly string[]).includes(agentId)
  );
}

/**
 * §2.1 / R5 — the count is the resolved set for the chosen agent, with vendor
 * bundles excluded. A bundled skill is real and is shown; it is not a thing the
 * section header should be counting, because it is the agent's own furniture.
 */
export function sectionCount(
  entries: readonly ContextEntry[],
  category: ContextCategory,
  agentId: string | null
): number {
  let n = 0;
  for (const e of entries) {
    if (e.category !== category) continue;
    if (isBundled(e)) continue;
    if (!matchesAgent(e, agentId)) continue;
    n += 1;
  }
  return n;
}

/**
 * §6.4 — hooks count a promise about behaviour, so the header says how many
 * will run rather than how many are configured. Everything else counts things.
 */
export function countLabel(category: ContextCategory, n: number): string {
  if (category !== 'hook') return String(n);
  return `${String(n)} will run`;
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

export interface ContextGroup {
  /** Stable within its section. */
  key: string;
  label: string;
  /** The group row's tooltip. Empty renders no tooltip. */
  hint: string;
  /** The scope every row in this group shares, when the group is a scope. */
  scope: ContextScope | null;
  entries: readonly ContextEntry[];
  /** §2.1 — a bundle group renders collapsed and is excluded from counts. */
  bundled: boolean;
}

function byName(a: ContextEntry, b: ContextEntry): number {
  return a.name.localeCompare(b.name);
}

/**
 * Group one section's rows, in the order they should be read.
 *
 * `scope` sections read down their category's ladder. `event` sections group by
 * the event that fires them, with the events themselves in first-seen order,
 * because a hook list has no resolution to imply and inventing an alphabetical
 * one would suggest a ranking. `chain` sections are a single run of rows in
 * load order, because for instructions the order IS the only fact.
 */
export function groupEntries(
  entries: readonly ContextEntry[],
  category: ContextCategory,
  agentId: string | null,
  filter: string,
  precedence?: PrecedenceView
): ContextGroup[] {
  const rows = entries.filter(
    (e) =>
      e.category === category &&
      matchesAgent(e, agentId) &&
      matchesFilter(e, filter)
  );
  if (rows.length === 0) return [];

  const kind = CONTEXT_GROUP_KIND[category];

  if (kind === 'chain') {
    return [
      {
        key: 'chain',
        label: 'Load order',
        hint: 'They all load, one after another. The order is the only fact that matters.',
        scope: null,
        entries: [...rows].sort(
          (a, b) => instructionOrder(a) - instructionOrder(b)
        ),
        bundled: false
      }
    ];
  }

  if (kind === 'event') {
    const order: string[] = [];
    const byEvent = new Map<string, ContextEntry[]>();
    for (const row of rows) {
      const event = hookEvent(row) ?? 'Other';
      let bucket = byEvent.get(event);
      if (bucket === undefined) {
        bucket = [];
        byEvent.set(event, bucket);
        order.push(event);
      }
      bucket.push(row);
    }
    return order.map((event) => ({
      key: `event:${event}`,
      label: event,
      hint: `Every handler under ${event} runs. There is no precedence between them.`,
      scope: null,
      entries: byEvent.get(event) ?? [],
      bundled: false
    }));
  }

  // §5.3 — GROUPING IS THE RESTING-STATE CHANNEL AND THE CHIP IS THE FILTERED
  // ONE, and never both. A filter usually leaves one or two rows per scope, so
  // keeping the headers would spend a 24px row to say what an 8px chip on the
  // row beside it already said, five times over. The rows flatten and each one
  // carries its scope itself. Event and chain groups are NOT scope groups, so
  // they are untouched above: a hook's event is not a claim about where it came
  // from, and dropping it would lose the only structure that list has.
  if (filter.trim() !== '') {
    const order = scopeOrderFor(category, precedence);
    const rank = (e: ContextEntry): number => {
      const at = order.indexOf(e.scope);
      return at === -1 ? order.length : at;
    };
    return [
      {
        key: 'filtered',
        label: '',
        hint: '',
        scope: null,
        entries: [...rows].sort((a, b) => rank(a) - rank(b) || byName(a, b)),
        bundled: false
      }
    ];
  }

  const groups: ContextGroup[] = [];
  const bundled = rows.filter(isBundled).sort(byName);
  const order = scopeOrderFor(category, precedence);
  // A scope a row actually sits in but the order does not name still has to be
  // drawn, or the row disappears from the panel. It goes after the ordered
  // groups, which is where an unranked thing honestly belongs.
  const extras = [
    ...new Set(
      rows
        .filter((e) => !isBundled(e) && !order.includes(e.scope))
        .map((e) => e.scope)
    )
  ].sort();
  for (const scope of [...order, ...extras]) {
    const inScope = rows
      .filter((e) => e.scope === scope && !isBundled(e))
      .sort(byName);
    if (inScope.length === 0) continue;
    groups.push({
      key: `scope:${scope}`,
      label: CONTEXT_SCOPE_LABEL[scope],
      hint: scopeGroupHint(category, scope, precedence),
      scope,
      entries: inScope,
      bundled: false
    });
  }
  if (bundled.length > 0) {
    groups.push({
      key: 'bundled',
      label: BUNDLED_GROUP_LABEL,
      hint: scopeGroupHint(category, 'bundled'),
      scope: 'bundled',
      entries: bundled,
      bundled: true
    });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Copy — §10 (live reload), §8.3 (drift), §11 (empty and error states)
// ---------------------------------------------------------------------------

/**
 * §10 — what a session already running does when this category changes.
 *
 * `unknown` is a first-class value with its own honest sentence. Guessing is
 * worse than admitting, because the user's next action depends on the answer.
 */
export function reloadSentence(
  kind: ContextReloadBehavior,
  agentLabel: string,
  category: ContextCategory
): string {
  const noun: Readonly<Record<ContextCategory, string>> = {
    skill: 'skills',
    mcp: 'MCP servers',
    hook: 'hooks',
    plugin: 'plugins',
    instruction: 'instruction files'
  };
  switch (kind) {
    case 'live':
      return `${agentLabel} picks up ${noun[category]} while a session is running.`;
    case 'next-session':
      return `${agentLabel} reads ${noun[category]} when a session starts, so a session already running does not have this one. Your next session will.`;
    case 'unknown':
    default:
      return `Tortie does not know whether ${agentLabel} picks up ${noun[category]} while it is running.`;
  }
}

/**
 * §8.3 — the three drift sentences, and the third is the one that bites.
 *
 * Re-exported from shared code rather than written again. The snapshot module
 * owns them because the comparison that produces the marks lives there, and two
 * copies of the same three sentences is how the row's tooltip and the readout's
 * header start disagreeing about what "removed" means.
 */
export { CONTEXT_DRIFT_SENTENCES as DRIFT_COPY } from '@shared/context-snapshot';

/** §11 — copy final, sentence case, no exclamation marks. */
export const CONTEXT_COPY = {
  emptyTitle: 'No skills, servers or hooks yet',
  emptyBody:
    'Skills, MCP servers and hooks change how your agents behave. Tortie reads them from this project and from your home folder.',
  noFilterMatch: (query: string): string => `Nothing matches "${query}".`,
  managedNote: 'Set by your organisation. Tortie can show these, not change them.',
  unavailable:
    'This build of Tortie cannot read agent configuration. Nothing is wrong with your files.',
  reading: 'Reading your agent configuration…'
} as const;

/**
 * The one sentence that says whether anything here replaces anything else.
 *
 * It used to be `CONTEXT_RESOLUTION[category]`, a per-category constant, which
 * stated Claude Code's answer for every agent. "One of these wins when two
 * share a name" is false for Codex, which keeps both, and false for Cursor,
 * DeepSeek and Droid, where Tortie's own registry says the rule is unknown, and
 * it was shown unchanged with the selector pinned to each of them.
 */
export function resolutionSentence(
  category: ContextCategory,
  precedence?: PrecedenceView
): string {
  const noun = CATEGORY_NOUN[category];
  if (precedence === undefined || precedence.model === null) {
    if (precedence?.disagree === true) {
      return `Your agents do not agree about which of these wins when two share a name. Pick one agent above to see its answer.`;
    }
    // No per-agent answer reached the view. Fall back to the category's own
    // shape, which is a claim about merging rather than about a ladder.
    return CONTEXT_RESOLUTION[category] === 'wins'
      ? `Tortie has not established which of these wins when two share a name.`
      : 'These all load. None of them replaces another.';
  }
  switch (precedence.model) {
    case 'merge-all':
      return 'These all load. None of them replaces another.';
    case 'no-override':
      return `Two ${noun}s with the same name both stay. Nothing is replaced, and you pick.`;
    case 'cli-reported':
      return `This agent resolves a name collision itself, and reading the files cannot say which copy it picks. Both are listed.`;
    case 'unknown':
      return `Tortie has not established which of these wins when two share a name. Both are listed.`;
    default:
      return 'One of these wins when two share a name. The list shows the winner.';
  }
}

/**
 * R5 — the section header's tooltip names which roots were read, because
 * Tortie's count will differ from what any single agent prints and the reason
 * is always which subset of roots that agent reads.
 */
export function sectionHint(
  category: ContextCategory,
  roots: readonly ContextRootReadout[],
  precedence?: PrecedenceView
): string {
  const how = resolutionSentence(category, precedence);
  // Only the roots that EXIST, and only for this category. A tooltip listing
  // paths that are not there would answer a question nobody asked and bury the
  // ones that are.
  const paths = [
    ...new Set(
      roots
        .filter((r) => r.category === category && r.exists)
        .map((r) => r.path)
    )
  ];
  if (paths.length === 0) return how;
  const shown = paths.slice(0, 8).join('\n');
  const more =
    paths.length > 8 ? `\n…and ${String(paths.length - 8)} more` : '';
  return `${how}\n\nRead from:\n${shown}${more}`;
}
