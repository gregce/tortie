/**
 * The Context view's shot probe — the harness hook every other view in this
 * sidebar already has (`search/shot-probe.ts`, `quickopen/shot-probe.ts`,
 * `zoom/shot-probe.ts`).
 *
 * WHY IT EXISTS AT ALL, and it is not "for tests". Research 29 §5.9 makes three
 * responsive claims about the row — what it carries at 340px, at 260px and at
 * 220px — and every one of them is a claim about the SHIPPED stylesheet under a
 * live layout engine. A unit test cannot see them, and reading the CSS is not
 * seeing them either. This probe measures the rendered row and prints what each
 * tier actually dropped, so "the summary is dropped, never wrapped" is a number
 * rather than a sentence.
 *
 * IT INJECTS FIXTURES, AND THAT IS THE POINT OF THE SPLIT. The reader answers
 * `context:scan`; the responsive behaviour is a property of the view alone. A
 * probe that needed the reader could not run until the reader landed, and the
 * view's own claims would go unmeasured until then. Nothing here writes to a
 * file, spawns a process or touches the manifest — it puts rows in a store.
 *
 * The fixture set is deliberately the awkward one: a global skill that beats a
 * project skill of the same name, an MCP server in each of the two project
 * scopes, a broken hook, a vendor bundle, and (Phase 26.2) a long name beside
 * a long summary. Those are the six things the design has to get right, so
 * they are the six things the picture shows.
 */

import type { ContextEntry, ContextScanResult } from '@shared/context';
import { localTarget } from '@shared/workspace-target';
import { useApp } from '../state/store';
import { contextAvailable, skillsWriteAvailable } from './bridge';
import { openSessionContext } from './open-session';
import { useContext } from './store';

export interface ContextProbeSpec {
  /** Sidebar width to measure at, in CSS px. The tiers are 340 / 260 / 220. */
  width?: number;
  /** Type into the filter, so the scope chips are on screen for the capture. */
  filter?: string;
  /** Pin the view to one agent, which drops the agent chip (§6.5). */
  agent?: string;
  /** Skip the fixtures and measure whatever the real reader returned. */
  live?: boolean;
  /**
   * Activate a row by name and report the tab that opened.
   *
   * Added at integration, to make the `context:<id>` detail tab evidence rather
   * than a claim. The seam it exercises is the one nothing else can see: with no
   * host registered a row click opens the plain file, and the two outcomes are
   * the same file on screen. Only the tab's ID and the presence of the header
   * card tell them apart, and this reports both.
   */
  open?: string;
  /**
   * Open the SESSION READOUT for the first live session (§8.3).
   *
   * It exists because the readout's entry point is a native context menu item,
   * and a native menu can never appear in a capture. Phase 22 first shipped the
   * readout with no entry point at all, so the harness has to be able to reach
   * the same function the menu item reaches rather than a copy of it: this
   * calls `openSessionContext` itself.
   */
  sessionReadout?: boolean;
}

function log(line: string): void {
  console.log(`[context-probe] ${line}`);
}

const BASE = {
  realPath: '',
  verdicts: [],
  resolution: 'only' as const,
  model: 'broadest-wins' as const,
  evidence: 'verified' as const,
  shadows: [],
  hash: null,
  hashAlgorithm: null,
  executes: null,
  problem: null
};

function skill(
  name: string,
  scope: ContextEntry['scope'],
  summary: string,
  over: Partial<ContextEntry> = {}
): ContextEntry {
  return {
    ...BASE,
    id: `skill:${name}:${scope}`,
    category: 'skill',
    name,
    summary,
    scope,
    sourcePath: `/fixtures/${scope}/${name}/SKILL.md`,
    realPath: `/fixtures/${scope}/${name}/SKILL.md`,
    agents: ['claude', 'codex', 'gemini', 'cursor', 'qwen', 'droid'],
    state: 'active',
    payload: {
      kind: 'skill',
      description: summary,
      license: null,
      compatibility: null,
      allowedTools: [],
      argumentHint: null,
      userInvokable: null,
      disableModelInvocation: null,
      paths: [],
      trigger: 'The agent loads it when relevant.',
      bundles: { scripts: 0, references: 0, assets: 0 },
      declaresHooks: false,
      nameMatchesDirectory: true,
      startupBytes: summary.length,
      startupTokens: Math.round(summary.length / 4),
      lazy: false
    },
    ...over
  } as ContextEntry;
}

function mcp(
  name: string,
  scope: ContextEntry['scope'],
  command: string
): ContextEntry {
  return {
    ...BASE,
    id: `mcp:${name}:${scope}`,
    category: 'mcp',
    name,
    summary: command,
    scope,
    sourcePath: `/fixtures/${scope}/.mcp.json`,
    realPath: `/fixtures/${scope}/.mcp.json`,
    agents: ['claude'],
    state: 'active',
    payload: {
      kind: 'mcp',
      transport: 'stdio',
      command: command.split(' ')[0] ?? command,
      args: command.split(' ').slice(1),
      url: null,
      cwd: null,
      envKeys: [],
      hiddenValueCount: 0,
      enabled: null,
      approval: 'not-required'
    }
  } as ContextEntry;
}

/** The awkward set: an inversion, two project scopes, a break and a bundle. */
function fixtures(): ContextScanResult {
  const entries: ContextEntry[] = [
    // The inversion, drawn: the personal copy WINS and carries the mark.
    skill('code-review', 'global', 'Review a diff before it is pushed.', {
      state: 'shadowing',
      resolution: 'wins',
      shadows: [
        {
          scope: 'project',
          sourcePath: '/fixtures/project/.claude/skills/code-review/SKILL.md',
          losesFor: ['claude'],
          reason: 'Also defined in this project. The global one wins.'
        }
      ]
    }),
    skill(
      'impeccable',
      'global',
      'Use when the user wants to design, redesign, shape, critique or polish a frontend interface.'
    ),
    skill('agent-browser', 'project', 'Drive a headless browser to verify a page.'),
    // Phase 26.2 — the crush case the operator reported: a long name beside a
    // long summary. Under the old flex arithmetic the summary's natural width
    // took the shrink budget and this name landed at its 40px floor. The fix
    // says the name renders whole and the summary truncates first, and this
    // row is the one that proves it in every capture.
    skill(
      'antigravity-code-review-guide',
      'project',
      'Walks a reviewer through the antigravity conventions for diffs, commit shape, naming, and the boundaries an agent must not cross while editing.'
    ),
    skill('skills-cursor', 'bundled', 'Shipped with Cursor.'),
    mcp('everything', 'project', 'npx @modelcontextprotocol/server-everything'),
    mcp('playwright', 'project-local', 'npx @playwright/mcp'),
    {
      ...BASE,
      id: 'hook:security-guidance:global',
      category: 'hook',
      name: 'security-guidance',
      summary: 'sg-python.sh ensure_agent_sdk',
      scope: 'global',
      sourcePath: '/fixtures/global/settings.json',
      realPath: '/fixtures/global/settings.json',
      agents: ['claude'],
      state: 'broken',
      problem: {
        path: '/fixtures/global/sg-python.sh',
        line: null,
        message:
          'The script this hook runs is not on disk. The agent will log an error and keep going.',
        kind: 'missing',
        category: 'hook'
      },
      payload: {
        kind: 'hook',
        event: 'SessionStart',
        matcher: null,
        handlerType: 'command',
        command: 'sg-python.sh ensure_agent_sdk',
        commandLeaf: 'sg-python.sh',
        timeoutSeconds: null,
        statusMessage: null,
        scriptPath: '/fixtures/global/sg-python.sh',
        scriptMissing: true,
        trustedHash: null
      }
    } as ContextEntry
  ];
  return {
    entries,
    sections: [],
    problems: [
      {
        path: '/fixtures/project/.mcp.json',
        line: 12,
        message: '.mcp.json could not be read — line 12',
        kind: 'parse',
        category: 'mcp'
      }
    ],
    agents: [
      {
        agent: 'claude',
        displayName: 'Claude Code',
        skillsCliName: 'claude-code',
        supported: ['skill', 'mcp', 'hook', 'plugin', 'instruction'],
        unknown: [],
        roots: [
          {
            path: '/fixtures/global/skills',
            category: 'skill',
            scope: 'global',
            exists: true
          }
        ],
        reload: {},
        // Claude Code's two ladders, which run in opposite directions inside
        // one product. The fixture carries them because the drawn group order
        // and every group tooltip now come from this field.
        precedence: {
          skill: {
            model: 'broadest-wins',
            evidence: 'verified',
            note: 'Enterprise beats personal, and personal beats project. This is the opposite of settings, in the same product.',
            scopeOrder: ['global', 'project', 'plugin']
          },
          mcp: {
            model: 'narrowest-wins',
            evidence: 'verified',
            note: 'Local beats project, and project beats user.',
            scopeOrder: ['project-local', 'project', 'global', 'plugin']
          },
          hook: {
            model: 'merge-all',
            evidence: 'verified',
            note: 'Hooks do not override each other. Every one of them runs.',
            scopeOrder: ['global', 'project', 'project-local']
          }
        }
      }
    ],
    cwd: '/fixtures',
    scannedAt: Date.now(),
    durationMs: 0,
    truncated: false
  } as ContextScanResult;
}

/** What one rendered row is actually carrying, measured rather than assumed. */
function measureRow(): Record<string, unknown> | null {
  const row = document.querySelector<HTMLElement>('.ctx-row:not(.ctx-row-problem)');
  if (row === null) return null;
  const shown = (sel: string): boolean => {
    const el = row.querySelector<HTMLElement>(sel);
    return el !== null && el.getBoundingClientRect().width > 0;
  };
  const name = row.querySelector<HTMLElement>('.ctx-name');
  return {
    height: Math.round(row.getBoundingClientRect().height),
    name: name?.textContent ?? null,
    // The three claims §5.9 makes, each as a boolean about the shipped CSS.
    summary: shown('.ctx-summary'),
    agentChip: shown('.ctx-agents'),
    chipWord: shown('.ctx-chip-word'),
    chipGlyph: shown('.ctx-chip-glyph'),
    // "Never dropped at any width" (§6.6): the name and the state lane.
    nameVisible: shown('.ctx-name'),
    marks: row.querySelectorAll('.ctx-marks .codicon').length
  };
}

/**
 * Phase 26.2 — the name-first claim, measured per row.
 *
 * The claim is arithmetic, so the evidence has to be numbers: every name's
 * rendered width, whether the ellipsis actually fired on it, and what the
 * summary beside it kept. "NAME-CUT" appearing on a row whose name would fit
 * the pane alone is the regression this line exists to catch, and a wide
 * capture where no row says NAME-CUT is the fix demonstrated.
 */
function measureNames(): string {
  const w = (el: HTMLElement | null): number =>
    el === null ? 0 : Math.round(el.getBoundingClientRect().width);
  const cut = (el: HTMLElement | null): boolean =>
    el !== null && el.scrollWidth > el.clientWidth + 1;
  return [...document.querySelectorAll<HTMLElement>('.ctx-row:not(.ctx-row-problem)')]
    .map((row) => {
      const name = row.querySelector<HTMLElement>('.ctx-name');
      const summary = row.querySelector<HTMLElement>('.ctx-summary');
      const sum =
        w(summary) > 0
          ? ` sum:${String(w(summary))}px${cut(summary) ? ' cut' : ''}`
          : '';
      return `${name?.textContent ?? '?'}:${String(w(name))}px${
        cut(name) ? ' NAME-CUT' : ''
      }${sum}`;
    })
    .join(' | ');
}

/**
 * Drive the view and report what the layout engine did.
 *
 * The width is set through the store's own setter, which is what a drag does,
 * so the container query being measured is the one a user would produce.
 */
export async function driveContext(spec: ContextProbeSpec): Promise<void> {
  const store = useContext.getState();

  if (spec.live !== true) {
    // Straight into the store. There is no channel to stub: `bridge.ts` is
    // feature-detected and this build may have no reader at all, which is
    // exactly the build in which the responsive claims still have to hold.
    useContext.setState({
      target: localTarget('/fixtures'),
      status: 'ready',
      scan: fixtures(),
      error: null
    });
  }
  store.setFilter(spec.filter ?? '');
  store.setAgent(spec.agent ?? null);

  if (spec.sessionReadout === true) {
    const session = useApp.getState().projectSessions()[0];
    if (session === undefined) {
      log('readout: there is no session to pin to');
    } else {
      openSessionContext(session);
      log(`readout: pinned to ${session.name}`);
    }
  }

  await new Promise((r) => setTimeout(r, 400));

  if (spec.live === true) {
    // What the REAL channel came back with. Added at integration, because the
    // one thing no fixture can show is whether `context:scan` is wired: with a
    // fixture in the store the view renders identically whether the channel
    // exists or not, which is precisely the state this line has to tell apart.
    const now = useContext.getState();
    log(
      `bridge: scan=${String(contextAvailable())} ` +
        `skillsWrite=${String(skillsWriteAvailable())}`
    );
    log(
      `live scan: status=${now.status} entries=${String(now.scan?.entries.length ?? 0)} ` +
        `problems=${String(now.scan?.problems.length ?? 0)} ` +
        `agents=${String(now.scan?.agents.length ?? 0)} ` +
        `durationMs=${String(now.scan?.durationMs ?? -1)} ` +
        `error=${now.error ?? 'none'}`
    );
    for (const section of now.scan?.sections ?? []) {
      log(
        `  section ${section.category}: resolved=${String(section.resolved)} ` +
          `bundled=${String(section.bundled)} agentsCovered=${String(section.agentsCovered)}`
      );
    }
  }

  const pane = document.querySelector<HTMLElement>('.sidebar');
  const sections = document.querySelector<HTMLElement>('.ctx-sections');
  log(
    `pane ${String(Math.round(pane?.getBoundingClientRect().width ?? 0))}px · ` +
      `container ${String(Math.round(sections?.getBoundingClientRect().width ?? 0))}px`
  );

  const groups = [...document.querySelectorAll('.ctx-group-label')].map(
    (el) => el.textContent
  );
  log(`groups top to bottom: ${groups.join(' | ')}`);
  log(`row: ${JSON.stringify(measureRow())}`);
  log(`names: ${measureNames()}`);

  const counts = [...document.querySelectorAll('.section-header')].map((el) => {
    const label = el.querySelector('.section-toggle')?.textContent ?? '';
    return label.trim();
  });
  log(`section headers: ${counts.join(' | ')}`);

  if (spec.open !== undefined) {
    const target = [...document.querySelectorAll<HTMLElement>('.ctx-row')].find(
      (row) => row.querySelector('.ctx-name')?.textContent === spec.open
    );
    if (target === undefined) {
      log(`open ${spec.open}: SKIP (no row with that name on screen)`);
      return;
    }
    // The row's own handler, through a real click, so what is measured is the
    // shipped gesture rather than a call to a function the gesture happens to
    // reach.
    target.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })
    );
    await new Promise((r) => setTimeout(r, 1200));
    const tab = document.querySelector<HTMLElement>('.ed-tab.active, .ed-tab.on');
    const card = document.querySelector<HTMLElement>('.ctxd-detail');
    const header = document.querySelector<HTMLElement>('.ctxd-card');
    const rect = (el: Element | null): string => {
      if (el === null) return 'absent';
      const r = el.getBoundingClientRect();
      return `${String(Math.round(r.left))},${String(Math.round(r.top))} ` +
        `${String(Math.round(r.width))}x${String(Math.round(r.height))}`;
    };
    const bodyEl = document.querySelector('.ctxd-detail-body');
    log(
      `open ${spec.open}: tab=${tab?.textContent ?? 'none'} ` +
        `detail=[${rect(card)}] card=[${rect(header)}] body=[${rect(bodyEl)}] ` +
        `bodyChild=[${rect(bodyEl?.firstElementChild ?? null)}] ` +
        `bodyChildClass=${bodyEl?.firstElementChild?.className ?? 'none'}`
    );
  }
}
