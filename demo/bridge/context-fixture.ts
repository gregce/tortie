/**
 * The Context view's fixture data: what `window.gmux.context.*` answers in the
 * browser demo.
 *
 * The rule is the bridge's rule — answer the way an idle, healthy, local
 * Tortie would. The scan describes the fixture project ("rookery") the way a
 * real machine might look after a few weeks of use: two project skills, one
 * personal skill that shadows a project copy (Claude Code's inverted skills
 * ladder, the single most valuable fact the view carries), a GitHub MCP
 * server from `.mcp.json`, and a CLAUDE.md that imports AGENTS.md. Zero
 * problems, because the demo machine is a healthy one.
 *
 * Everything that would WRITE — install, remove, update — answers with the
 * typed refusal shape: the demo runs in a browser and has no skills CLI, and
 * the confirm surfaces say exactly that instead of pretending. Reads that
 * would need the network (skills.sh search, audit, preview) answer empty with
 * a one-sentence problem, which the panels render as their own calm state.
 */
import type {
  ContextAgentReadout,
  ContextEntry,
  ContextScanInput,
  ContextScanResult
} from '@shared/context';
import type {
  ContextSkillHash,
  ContextSkillPinCheck,
  GmuxContextExtras
} from '@shared/ipc/context';
import type {
  SkillsCapability,
  SkillsRefusal,
  SkillsRunResult
} from '@shared/skills';
import { DEMO_PROJECT_PATH } from './world';

const HOME = '/Users/you';

/** Where a packaged Tortie would hold the skills CLI. Named in refusals. */
const BUNDLED_CLI_PATH =
  '/Applications/Tortie.app/Contents/Resources/skills-cli/index.js';

const NO_CLI_SENTENCE =
  'The demo runs in a browser, so the skills CLI is not available here.';

// ---------------------------------------------------------------------------
// The entries — one believable resolved set for /Users/you/rookery
// ---------------------------------------------------------------------------

const reviewChecklist: ContextEntry = {
  id: 'skill:review-checklist:project',
  category: 'skill',
  name: 'review-checklist',
  summary: 'Walk the PR checklist before calling a change done.',
  scope: 'project',
  sourcePath: `${DEMO_PROJECT_PATH}/.claude/skills/review-checklist/SKILL.md`,
  realPath: `${DEMO_PROJECT_PATH}/.claude/skills/review-checklist/SKILL.md`,
  agents: ['claude'],
  verdicts: [
    {
      agent: 'claude',
      viaPath: `${DEMO_PROJECT_PATH}/.claude/skills/review-checklist/SKILL.md`,
      scope: 'project',
      resolution: 'only',
      model: 'broadest-wins'
    }
  ],
  state: 'active',
  resolution: 'only',
  model: 'broadest-wins',
  evidence: 'verified',
  shadows: [],
  hash: '4b1d2c8e9f03a716',
  hashAlgorithm: 'sha256',
  executes: null,
  problem: null,
  payload: {
    kind: 'skill',
    description:
      'Walk the PR checklist before calling a change done: tests, docs, changelog, and a self-review pass.',
    license: null,
    compatibility: null,
    allowedTools: [],
    argumentHint: null,
    userInvokable: true,
    disableModelInvocation: null,
    paths: [],
    trigger:
      'The agent loads it when a review is asked for, or you type /review-checklist.',
    bundles: { scripts: 0, references: 1, assets: 0 },
    declaresHooks: false,
    nameMatchesDirectory: true,
    startupBytes: 412,
    startupTokens: 103,
    lazy: false
  }
};

const flakyTestTriage: ContextEntry = {
  id: 'skill:flaky-test-triage:project',
  category: 'skill',
  name: 'flaky-test-triage',
  summary: 'Rerun a flaky test in isolation and bisect the shared state.',
  scope: 'project',
  sourcePath: `${DEMO_PROJECT_PATH}/.claude/skills/flaky-test-triage/SKILL.md`,
  realPath: `${DEMO_PROJECT_PATH}/.claude/skills/flaky-test-triage/SKILL.md`,
  agents: ['claude'],
  verdicts: [
    {
      agent: 'claude',
      viaPath: `${DEMO_PROJECT_PATH}/.claude/skills/flaky-test-triage/SKILL.md`,
      scope: 'project',
      resolution: 'only',
      model: 'broadest-wins'
    }
  ],
  state: 'active',
  resolution: 'only',
  model: 'broadest-wins',
  evidence: 'verified',
  shadows: [],
  hash: 'a97c30d5e2b8461f',
  hashAlgorithm: 'sha256',
  executes: null,
  problem: null,
  payload: {
    kind: 'skill',
    description:
      'Rerun a flaky test in isolation, then bisect for shared state: leaked timers, retained sockets, and order-dependent fixtures.',
    license: null,
    compatibility: null,
    allowedTools: ['Bash', 'Read', 'Grep'],
    argumentHint: '<test name>',
    userInvokable: true,
    disableModelInvocation: null,
    paths: [],
    trigger:
      'The agent loads it when a test fails intermittently, or you type /flaky-test-triage.',
    bundles: { scripts: 1, references: 0, assets: 0 },
    declaresHooks: false,
    nameMatchesDirectory: true,
    startupBytes: 486,
    startupTokens: 121,
    lazy: false
  }
};

/**
 * The personal copy WINS over the project copy for Claude Code — skills run
 * broadest-first, the opposite of the settings intuition. The shadow mark on
 * this row is the demo's one chance to show that inversion.
 */
const commitStyle: ContextEntry = {
  id: 'skill:commit-style:global',
  category: 'skill',
  name: 'commit-style',
  summary: 'Write commits as one imperative subject plus a why paragraph.',
  scope: 'global',
  sourcePath: `${HOME}/.claude/skills/commit-style/SKILL.md`,
  realPath: `${HOME}/.agents/skills/commit-style/SKILL.md`,
  agents: ['claude', 'codex'],
  verdicts: [
    {
      agent: 'claude',
      viaPath: `${HOME}/.claude/skills/commit-style/SKILL.md`,
      scope: 'global',
      resolution: 'wins',
      model: 'broadest-wins'
    },
    {
      agent: 'codex',
      viaPath: `${HOME}/.codex/skills/commit-style/SKILL.md`,
      scope: 'global',
      resolution: 'coexists',
      model: 'no-override'
    }
  ],
  state: 'shadowing',
  resolution: 'wins',
  model: 'broadest-wins',
  evidence: 'verified',
  shadows: [
    {
      scope: 'project',
      sourcePath: `${DEMO_PROJECT_PATH}/.claude/skills/commit-style/SKILL.md`,
      losesFor: ['claude'],
      reason:
        'Also defined in this project. For Claude Code your personal one wins, because skills resolve broadest first.'
    }
  ],
  hash: 'c3f7e1a04d92b856',
  hashAlgorithm: 'sha256',
  executes: null,
  problem: null,
  payload: {
    kind: 'skill',
    description:
      'Write commits as one imperative subject line plus a paragraph that says why, never a bullet list of what.',
    license: 'MIT',
    compatibility: null,
    allowedTools: [],
    argumentHint: null,
    userInvokable: true,
    disableModelInvocation: null,
    paths: [],
    trigger:
      'The agent loads it when writing a commit message, or you type /commit-style.',
    bundles: { scripts: 0, references: 0, assets: 0 },
    declaresHooks: false,
    nameMatchesDirectory: true,
    startupBytes: 355,
    startupTokens: 88,
    lazy: false
  }
};

const githubMcp: ContextEntry = {
  id: 'mcp:github:project',
  category: 'mcp',
  name: 'github',
  summary: 'npx -y @modelcontextprotocol/server-github',
  scope: 'project',
  sourcePath: `${DEMO_PROJECT_PATH}/.mcp.json`,
  realPath: `${DEMO_PROJECT_PATH}/.mcp.json`,
  agents: ['claude'],
  verdicts: [
    {
      agent: 'claude',
      viaPath: `${DEMO_PROJECT_PATH}/.mcp.json`,
      scope: 'project',
      resolution: 'only',
      model: 'narrowest-wins'
    }
  ],
  state: 'active',
  resolution: 'only',
  model: 'narrowest-wins',
  evidence: 'verified',
  shadows: [],
  hash: 'e58a2f6c1d40b937',
  hashAlgorithm: 'sha256',
  executes: null,
  problem: null,
  payload: {
    kind: 'mcp',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    url: null,
    cwd: null,
    envKeys: ['GITHUB_TOKEN'],
    hiddenValueCount: 1,
    enabled: null,
    approval: 'approved'
  }
};

const claudeMd: ContextEntry = {
  id: 'instruction:CLAUDE.md:project',
  category: 'instruction',
  name: 'CLAUDE.md',
  summary: 'Queue workers must stay idempotent; retries are the norm.',
  scope: 'project',
  sourcePath: `${DEMO_PROJECT_PATH}/CLAUDE.md`,
  realPath: `${DEMO_PROJECT_PATH}/CLAUDE.md`,
  agents: ['claude'],
  verdicts: [
    {
      agent: 'claude',
      viaPath: `${DEMO_PROJECT_PATH}/CLAUDE.md`,
      scope: 'project',
      resolution: 'merges',
      model: 'merge-all'
    }
  ],
  state: 'active',
  resolution: 'merges',
  model: 'merge-all',
  evidence: 'verified',
  shadows: [],
  hash: '7d94b0c2f65e18a3',
  hashAlgorithm: 'sha256',
  executes: null,
  problem: null,
  payload: {
    kind: 'instruction',
    bytes: 1184,
    firstLine: 'Queue workers must stay idempotent; retries are the norm.',
    importedBy: null,
    importDepth: 0,
    order: 0
  }
};

const agentsMd: ContextEntry = {
  id: 'instruction:AGENTS.md:project',
  category: 'instruction',
  name: 'AGENTS.md',
  summary: 'Run the queue tests with a single worker before pushing.',
  scope: 'project',
  sourcePath: `${DEMO_PROJECT_PATH}/AGENTS.md`,
  realPath: `${DEMO_PROJECT_PATH}/AGENTS.md`,
  agents: ['claude', 'codex'],
  verdicts: [
    {
      agent: 'claude',
      viaPath: `${DEMO_PROJECT_PATH}/CLAUDE.md`,
      scope: 'project',
      resolution: 'merges',
      model: 'merge-all'
    },
    {
      agent: 'codex',
      viaPath: `${DEMO_PROJECT_PATH}/AGENTS.md`,
      scope: 'project',
      resolution: 'merges',
      model: 'merge-all'
    }
  ],
  state: 'active',
  resolution: 'merges',
  model: 'merge-all',
  evidence: 'verified',
  shadows: [],
  hash: '18c5d9e7a2f0463b',
  hashAlgorithm: 'sha256',
  executes: null,
  problem: null,
  payload: {
    kind: 'instruction',
    bytes: 642,
    firstLine: 'Run the queue tests with a single worker before pushing.',
    importedBy: `${DEMO_PROJECT_PATH}/CLAUDE.md`,
    importDepth: 1,
    order: 1
  }
};

const ENTRIES: readonly ContextEntry[] = [
  reviewChecklist,
  flakyTestTriage,
  commitStyle,
  githubMcp,
  claudeMd,
  agentsMd
];

// ---------------------------------------------------------------------------
// The agent readouts — what the reader looked at, per agent
// ---------------------------------------------------------------------------

const claudeReadout: ContextAgentReadout = {
  agent: 'claude',
  displayName: 'Claude Code',
  skillsCliName: 'claude-code',
  supported: ['skill', 'mcp', 'hook', 'plugin', 'instruction'],
  unknown: [],
  roots: [
    {
      path: `${DEMO_PROJECT_PATH}/.claude/skills`,
      category: 'skill',
      scope: 'project',
      exists: true
    },
    {
      path: `${HOME}/.claude/skills`,
      category: 'skill',
      scope: 'global',
      exists: true
    },
    {
      path: `${DEMO_PROJECT_PATH}/.mcp.json`,
      category: 'mcp',
      scope: 'project',
      exists: true
    },
    {
      path: `${HOME}/.claude.json`,
      category: 'mcp',
      scope: 'global',
      exists: false
    },
    {
      path: `${DEMO_PROJECT_PATH}/.claude/settings.json`,
      category: 'hook',
      scope: 'project',
      exists: false
    },
    {
      path: `${HOME}/.claude/settings.json`,
      category: 'hook',
      scope: 'global',
      exists: false
    },
    {
      path: `${HOME}/.claude/plugins`,
      category: 'plugin',
      scope: 'global',
      exists: false
    },
    {
      path: `${DEMO_PROJECT_PATH}/CLAUDE.md`,
      category: 'instruction',
      scope: 'project',
      exists: true
    }
  ],
  reload: {
    skill: {
      behavior: 'next-session',
      note: 'Claude Code reads skills when a session starts, so a session already running does not have a new one.',
      reloadCommand: null,
      evidence: 'verified'
    },
    mcp: {
      behavior: 'next-session',
      note: 'Claude Code connects MCP servers when a session starts.',
      reloadCommand: null,
      evidence: 'verified'
    },
    hook: {
      behavior: 'live',
      note: 'Claude Code picks up hook changes while a session is running.',
      reloadCommand: null,
      evidence: 'doc'
    },
    plugin: {
      behavior: 'next-session',
      note: 'Claude Code loads plugins when a session starts.',
      reloadCommand: null,
      evidence: 'doc'
    },
    instruction: {
      behavior: 'next-session',
      note: 'Claude Code reads instruction files when a session starts.',
      reloadCommand: null,
      evidence: 'verified'
    }
  },
  precedence: {
    skill: {
      model: 'broadest-wins',
      evidence: 'verified',
      note: 'A personal skill beats one of the same name that this project commits. Skills resolve broadest first.',
      scopeOrder: ['managed', 'global', 'project', 'project-local', 'plugin']
    },
    mcp: {
      model: 'narrowest-wins',
      evidence: 'verified',
      note: 'A server defined nearer the project beats one of the same name defined for every project.',
      scopeOrder: ['managed', 'project-local', 'project', 'global', 'plugin']
    },
    hook: {
      model: 'merge-all',
      evidence: 'verified',
      note: 'Every hook runs. Two hooks with the same matcher both fire.',
      scopeOrder: ['managed', 'project', 'project-local', 'global', 'plugin']
    },
    instruction: {
      model: 'merge-all',
      evidence: 'verified',
      note: 'Instruction files all load, in order. None replaces another.',
      scopeOrder: ['managed', 'project', 'global']
    }
  }
};

const codexReadout: ContextAgentReadout = {
  agent: 'codex',
  displayName: 'Codex',
  skillsCliName: 'codex',
  supported: ['skill', 'mcp', 'instruction'],
  unknown: ['plugin'],
  roots: [
    {
      path: `${HOME}/.codex/skills`,
      category: 'skill',
      scope: 'global',
      exists: true
    },
    {
      path: `${HOME}/.codex/config.toml`,
      category: 'mcp',
      scope: 'global',
      exists: false
    },
    {
      path: `${DEMO_PROJECT_PATH}/AGENTS.md`,
      category: 'instruction',
      scope: 'project',
      exists: true
    }
  ],
  reload: {
    skill: {
      behavior: 'next-session',
      note: 'Codex reads skills when a session starts.',
      reloadCommand: null,
      evidence: 'doc'
    },
    mcp: {
      behavior: 'next-session',
      note: 'Codex connects MCP servers when a session starts.',
      reloadCommand: null,
      evidence: 'doc'
    },
    instruction: {
      behavior: 'next-session',
      note: 'Codex reads AGENTS.md when a session starts.',
      reloadCommand: null,
      evidence: 'verified'
    }
  },
  precedence: {
    skill: {
      model: 'no-override',
      evidence: 'verified',
      note: 'Codex resolves nothing on purpose. Two skills with the same name both stay, and you pick.',
      scopeOrder: ['project', 'global', 'bundled']
    },
    mcp: {
      model: 'search-path',
      evidence: 'doc',
      note: 'Codex reads its config files in a fixed order and the first definition of a name wins.',
      scopeOrder: ['project', 'global']
    },
    instruction: {
      model: 'merge-all',
      evidence: 'verified',
      note: 'Instruction files all load, in order. None replaces another.',
      scopeOrder: ['project', 'global']
    }
  }
};

// ---------------------------------------------------------------------------
// The scan result
// ---------------------------------------------------------------------------

function demoScan(input: ContextScanInput): ContextScanResult {
  return {
    entries: [...ENTRIES],
    sections: [
      { category: 'skill', resolved: 3, bundled: 0, agentsCovered: 2 },
      { category: 'mcp', resolved: 1, bundled: 0, agentsCovered: 1 },
      { category: 'hook', resolved: 0, bundled: 0, agentsCovered: 0 },
      { category: 'plugin', resolved: 0, bundled: 0, agentsCovered: 0 },
      { category: 'instruction', resolved: 2, bundled: 0, agentsCovered: 2 }
    ],
    problems: [],
    agents: [claudeReadout, codexReadout],
    cwd: input.cwd,
    scannedAt: Date.now(),
    durationMs: 12,
    truncated: false
  };
}

// ---------------------------------------------------------------------------
// The write half — every answer the typed refusal, naming the demo
// ---------------------------------------------------------------------------

const capability: SkillsCapability = {
  available: false,
  copy: null,
  bundledEntryPath: BUNDLED_CLI_PATH,
  copies: [],
  unavailableMessage: NO_CLI_SENTENCE
};

const planRefusal: SkillsRefusal = {
  refused: true,
  reason: 'no-usable-cli',
  message: NO_CLI_SENTENCE,
  triedPath: BUNDLED_CLI_PATH
};

function refusedRun(): SkillsRunResult {
  return {
    ok: false,
    commandLine: '',
    displayCommand: '',
    cwd: DEMO_PROJECT_PATH,
    exitCode: null,
    timedOut: false,
    spawnError: NO_CLI_SENTENCE,
    stderrTail: '',
    stdout: '',
    durationMs: 0,
    failure: NO_CLI_SENTENCE
  };
}

/**
 * The pin re-check re-hashes a skill directory. For the fixture skills the
 * answer is their own recorded hash, so anything comparing stays "unchanged";
 * anything else on this browser's "disk" honestly cannot be read.
 */
function demoHashSkill(path: string): ContextSkillHash {
  const entry = ENTRIES.find(
    (e) =>
      e.category === 'skill' &&
      (e.realPath.replace(/\/SKILL\.md$/, '') === path ||
        e.sourcePath.replace(/\/SKILL\.md$/, '') === path)
  );
  return {
    path,
    hash: entry?.hash ?? null,
    algorithm: 'sha256',
    problem: entry === undefined ? 'The demo cannot read this directory.' : null
  };
}

/** The whole `window.gmux.context` surface, as the demo answers it. */
export const demoContext: GmuxContextExtras['context'] = {
  scan: async (input) => demoScan(input),
  skillsCapability: async () => capability,
  skillsPlan: async () => planRefusal,
  skillsRun: async () => refusedRun(),
  hashSkill: async (path) => demoHashSkill(path),
  skillsSearch: async (input) => ({
    query: input.query,
    hits: [],
    problem:
      'Searching skills.sh needs a network connection the demo does not make.'
  }),
  skillsAudit: async () => ({ records: {}, problem: null }),
  skillsPreview: async (input) => ({
    source: input.source,
    name: input.skill,
    body: null,
    path: null,
    commit: null,
    scriptCount: 0,
    files: [],
    problem: 'The demo does not read from skills.sh.'
  }),
  // No pins: nothing here was installed through Tortie, so every skill row
  // renders plainly rather than wearing an approval it never got.
  skillPins: async (_paths: string[]): Promise<ContextSkillPinCheck[]> => [],
  skillPinRecord: async () => null,
  skillPinForget: async () => undefined
};
