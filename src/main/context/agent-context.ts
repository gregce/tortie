/**
 * Where each agent keeps each kind of configuration, and which one wins.
 *
 * This is research 29 §2.4, §2.9 and §2.10 as DATA. It is the same move
 * research 11 made for resume mechanics: per-agent behaviour becomes a table
 * so the reader has no per-agent branch anywhere. The reader branches on
 * `reader`, which is a property of the FILE FORMAT, not of the agent. A `?`
 * cell in the research becomes an absent key here, an absent key becomes an
 * absent section in the view, and that is neither a crash nor a lie.
 *
 * The precedence column is the value of this phase. There is one real standard
 * (Agent Skills, which standardises the file and says nothing about where
 * skills live or who wins a collision) sitting on top of eleven bespoke
 * filesystems. Research 29 §2.9 counted seven incompatible models. Two run in
 * opposite directions inside Claude Code alone: a project `settings.json`
 * beats your personal one, while your personal `~/.claude/skills/deploy` beats
 * the repo's `.claude/skills/deploy`. So `precedence` is keyed by agent AND
 * category, never by agent alone, and where the research never established an
 * order the model is `'unknown'` and the resolver refuses to name a winner.
 *
 * INTEGRATION SEAM. Research 29 §12 puts this block inside
 * `src/main/agents/registry.ts`, next to the resume templates. It lives here
 * for the duration of the parallel build so four builders are not editing one
 * file. Moving it is mechanical: the table is keyed by `AgentRegistryId`,
 * imports nothing from this directory, and `conformance:context` should read
 * it from wherever it ends up.
 */

import type { AgentRegistryId } from '@shared/types';
import type {
  ContextCategory,
  ContextEvidence,
  ContextPrecedenceModel,
  ContextPrecedenceReadout,
  ContextReloadBehavior,
  ContextReloadCell,
  ContextScope
} from '@shared/context';
import { AGENT_REGISTRY } from '../agents/registry';

/**
 * How to read one location. Named after the FORMAT, so adding an agent that
 * uses an existing format costs a row here and no code anywhere.
 */
export type ContextReader =
  /** A directory whose children are skill folders holding `SKILL.md`. */
  | 'skill-dir'
  /** JSON or JSONC holding `{ [name]: serverDefinition }` under `key`. */
  | 'mcp-json'
  /** TOML holding `[mcp_servers.<name>]` tables. */
  | 'mcp-toml'
  /** `~/.claude.json` top-level `mcpServers` — Claude Code's user scope. */
  | 'mcp-claude-user'
  /** `~/.claude.json` → `projects[cwd]` — Claude Code's local scope + approvals. */
  | 'mcp-claude-local'
  /** JSON with a `hooks` key: `{ Event: [{ matcher, hooks: [...] }] }`. */
  | 'hooks-json'
  /** Codex's `[hooks.state."<plugin>@<mkt>:<file>:<event>:<i>:<j>"]` tables. */
  | 'hooks-codex'
  /** `installed_plugins.json` plus `enabledPlugins` in the settings files. */
  | 'plugins-claude'
  /** Codex's `[plugins."<name>@<marketplace>"]` and `[marketplaces.*]`. */
  | 'plugins-codex'
  /** A directory of plugin or extension folders carrying a manifest. */
  | 'plugin-dir'
  /** One named instruction file. */
  | 'instruction-file'
  /** The same file name, collected walking cwd up to the home directory. */
  | 'instruction-walk'
  /** Every `*.md` / `*.mdc` in a rules directory. */
  | 'instruction-glob';

export interface ContextLocation {
  /**
   * A location template. `~/…`, `<claude>/…`, `<codex>/…`, `<agents>/…`,
   * `<xdgConfig>/…`, `<project>/…`, or an absolute path. A `*` segment is
   * expanded by listing the directory, bounded.
   */
  at: string;
  scope: ContextScope;
  /** Lower wins, within this agent and this category. */
  rank: number;
  reader: ContextReader;
  /** Key inside the file, for the JSON and TOML readers. */
  key?: string;
  /** File name, for the walking and globbing instruction readers. */
  file?: string;
  evidence: ContextEvidence;
  /**
   * Members of a group are the SAME file in two possible places. The first one
   * that exists is read and the rest are ignored.
   */
  group?: string;
  /** Vendor-shipped. Rendered in a collapsed group, never counted (§2.1). */
  bundled?: boolean;
  /**
   * Also look for this directory BELOW the project root. Claude Code loads
   * `.claude/skills` in a subdirectory lazily, the first time it touches a
   * file in that subtree, and addresses it as `apps/web:deploy`. The walk is
   * bounded to three levels.
   */
  nested?: boolean;
  note?: string;
}

export interface ContextPrecedence {
  model: ContextPrecedenceModel;
  evidence: ContextEvidence;
  /** One plain sentence, shown where the view explains an ordering. */
  note: string;
}

export interface AgentContextBlock {
  locations: Partial<Record<ContextCategory, ContextLocation[]>>;
  precedence: Partial<Record<ContextCategory, ContextPrecedence>>;
  reload: Partial<Record<ContextCategory, ContextReloadCell>>;
  /**
   * This agent runs hooks declared in a skill's own frontmatter. Verified in
   * `~/.agents/skills/lore/SKILL.md`, which carries a `PreToolUse` entry. It
   * is a capability flag rather than a branch in the reader, so adding a
   * second agent that grows the feature costs one line here.
   */
  skillFrontmatterHooks?: boolean;
}

// ---------------------------------------------------------------------------
// Reload cells (§10) — three values, and `unknown` is first class
// ---------------------------------------------------------------------------

function live(note: string, evidence: ContextEvidence = 'doc'): ContextReloadCell {
  return { behavior: 'live', note, reloadCommand: null, evidence };
}

function nextSession(
  note: string,
  reloadCommand: string | null = null,
  evidence: ContextEvidence = 'doc'
): ContextReloadCell {
  return { behavior: 'next-session', note, reloadCommand, evidence };
}

const UNKNOWN_RELOAD: ContextReloadCell = {
  behavior: 'unknown',
  note: 'Tortie does not know whether a session that is already running picks this up.',
  reloadCommand: null,
  evidence: 'unverified'
};

/**
 * The sentence for one cell. Prose lives here, next to the data it describes,
 * so a component never hard-codes "you will need a new session" — that claim
 * moved once already during the research, when hooks went from needing a
 * restart to reloading live.
 */
export function reloadSentence(
  agent: AgentRegistryId,
  cell: ContextReloadCell | undefined
): string {
  if (!cell) return UNKNOWN_RELOAD.note;
  if (cell.behavior === 'unknown') {
    return `Tortie does not know whether ${displayName(agent)} picks this up while it is running.`;
  }
  return cell.note;
}

/** The registry's own display name, so this table never restates one. */
export function displayName(agent: AgentRegistryId): string {
  return AGENT_REGISTRY.find((entry) => entry.id === agent)?.displayName ?? agent;
}

// ---------------------------------------------------------------------------
// Shared location fragments
// ---------------------------------------------------------------------------

/** `~/.agents/skills`: the only path more than half the agents agree on. */
const NEUTRAL_GLOBAL_SKILLS = '<agents>/skills';
const NEUTRAL_PROJECT_SKILLS = '<project>/.agents/skills';

const MANAGED_CLAUDE_SETTINGS =
  '/Library/Application Support/ClaudeCode/managed-settings.json';

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

const BLOCKS: Partial<Record<AgentRegistryId, AgentContextBlock>> = {
  // -------------------------------------------------------------------------
  claude: {
    locations: {
      skill: [
        { at: '<claude>/skills', scope: 'global', rank: 2, reader: 'skill-dir', evidence: 'verified' },
        {
          at: '<project>/.claude/skills',
          scope: 'project',
          rank: 3,
          reader: 'skill-dir',
          evidence: 'verified',
          nested: true
        },
        {
          at: '<pluginInstall>/skills',
          scope: 'plugin',
          rank: 4,
          reader: 'skill-dir',
          evidence: 'verified',
          note: 'Plugin skills are namespaced plugin:name and cannot collide.'
        }
      ],
      mcp: [
        {
          at: '<claude>/.claude.json',
          scope: 'project-local',
          rank: 1,
          reader: 'mcp-claude-local',
          group: 'claude-json',
          evidence: 'verified'
        },
        {
          at: '~/.claude.json',
          scope: 'project-local',
          rank: 1,
          reader: 'mcp-claude-local',
          group: 'claude-json',
          evidence: 'verified'
        },
        {
          at: '<project>/.mcp.json',
          scope: 'project',
          rank: 2,
          reader: 'mcp-json',
          key: 'mcpServers',
          evidence: 'verified'
        },
        {
          at: '<claude>/.claude.json',
          scope: 'global',
          rank: 3,
          reader: 'mcp-claude-user',
          group: 'claude-json-user',
          evidence: 'verified'
        },
        {
          at: '~/.claude.json',
          scope: 'global',
          rank: 3,
          reader: 'mcp-claude-user',
          group: 'claude-json-user',
          evidence: 'verified'
        },
        {
          at: '<pluginInstall>/.mcp.json',
          scope: 'plugin',
          rank: 4,
          reader: 'mcp-json',
          key: 'mcpServers',
          evidence: 'doc'
        }
      ],
      hook: [
        {
          at: MANAGED_CLAUDE_SETTINGS,
          scope: 'managed',
          rank: 1,
          reader: 'hooks-json',
          key: 'hooks',
          evidence: 'doc'
        },
        {
          at: '<project>/.claude/settings.local.json',
          scope: 'project-local',
          rank: 2,
          reader: 'hooks-json',
          key: 'hooks',
          evidence: 'verified'
        },
        {
          at: '<project>/.claude/settings.json',
          scope: 'project',
          rank: 3,
          reader: 'hooks-json',
          key: 'hooks',
          evidence: 'verified'
        },
        {
          at: '<claude>/settings.json',
          scope: 'global',
          rank: 4,
          reader: 'hooks-json',
          key: 'hooks',
          evidence: 'verified'
        }
      ],
      plugin: [
        {
          at: '<claude>/plugins/installed_plugins.json',
          scope: 'global',
          rank: 1,
          reader: 'plugins-claude',
          evidence: 'verified'
        }
      ],
      instruction: [
        {
          at: '<claude>/CLAUDE.md',
          scope: 'global',
          rank: 1,
          reader: 'instruction-file',
          evidence: 'verified'
        },
        {
          at: '<project>',
          scope: 'project',
          rank: 2,
          reader: 'instruction-walk',
          file: 'CLAUDE.md',
          evidence: 'verified'
        },
        {
          at: '<project>/.claude/CLAUDE.md',
          scope: 'project',
          rank: 3,
          reader: 'instruction-file',
          evidence: 'doc'
        },
        {
          at: '<project>/CLAUDE.local.md',
          scope: 'project-local',
          rank: 4,
          reader: 'instruction-file',
          evidence: 'doc'
        },
        {
          at: '<project>/.claude.local.md',
          scope: 'project-local',
          rank: 5,
          reader: 'instruction-file',
          evidence: 'doc'
        }
      ]
    },
    precedence: {
      skill: {
        model: 'broadest-wins',
        evidence: 'verified',
        note: 'Enterprise beats personal, and personal beats project. This is the opposite of settings, in the same product.'
      },
      mcp: {
        model: 'narrowest-wins',
        evidence: 'verified',
        note: 'Local beats project, and project beats user. The whole entry from the winning file is used, and fields are never merged across scopes.'
      },
      hook: {
        model: 'merge-all',
        evidence: 'verified',
        note: 'Hooks do not override each other. Every one of them runs.'
      },
      plugin: {
        model: 'narrowest-wins',
        evidence: 'doc',
        note: 'A plugin is switched on or off by a settings key, and settings keys resolve project over user.'
      },
      instruction: {
        model: 'merge-all',
        evidence: 'verified',
        note: 'Every file in the chain loads, one after another, in this order.'
      }
    },
    reload: {
      skill: live('Claude Code watches skill directories, so a running session picks this up. A skills directory that did not exist when the session started is not watched.'),
      mcp: nextSession(
        'Claude Code reads MCP servers when a session starts, so a session that is already running will not have this one. Your next session will.'
      ),
      hook: live(
        'Claude Code watches the settings files, so a running session picks this up. This changed recently: it used to need a new session.'
      ),
      plugin: nextSession(
        'A running session keeps the plugins it started with. /reload-plugins reloads plugins, skills, agents, hooks and plugin MCP servers in place.',
        '/reload-plugins'
      ),
      instruction: nextSession(
        'Instruction files are read when a session starts. Editing one now does not change the context that was already sent.'
      )
    },
    skillFrontmatterHooks: true
  },

  // -------------------------------------------------------------------------
  codex: {
    locations: {
      skill: [
        { at: '<codex>/skills', scope: 'global', rank: 1, reader: 'skill-dir', evidence: 'verified' },
        {
          at: NEUTRAL_GLOBAL_SKILLS,
          scope: 'global',
          rank: 1,
          reader: 'skill-dir',
          evidence: 'verified'
        },
        {
          at: NEUTRAL_PROJECT_SKILLS,
          scope: 'project',
          rank: 1,
          reader: 'skill-dir',
          evidence: 'verified'
        },
        {
          at: '<codex>/skills/.system',
          scope: 'bundled',
          rank: 9,
          reader: 'skill-dir',
          evidence: 'verified',
          bundled: true
        }
      ],
      mcp: [
        {
          at: '<codex>/config.toml',
          scope: 'global',
          rank: 1,
          reader: 'mcp-toml',
          key: 'mcp_servers',
          evidence: 'verified'
        }
      ],
      hook: [
        {
          at: '<codex>/config.toml',
          scope: 'global',
          rank: 1,
          reader: 'hooks-codex',
          key: 'hooks.state',
          evidence: 'verified'
        }
      ],
      plugin: [
        {
          at: '<codex>/config.toml',
          scope: 'global',
          rank: 1,
          reader: 'plugins-codex',
          key: 'plugins',
          evidence: 'verified'
        }
      ],
      instruction: [
        {
          at: '<codex>/AGENTS.md',
          scope: 'global',
          rank: 1,
          reader: 'instruction-file',
          evidence: 'verified'
        },
        {
          at: '<codex>/rules',
          scope: 'global',
          rank: 2,
          reader: 'instruction-glob',
          file: '.rules',
          evidence: 'verified'
        },
        {
          at: '<project>',
          scope: 'project',
          rank: 3,
          reader: 'instruction-walk',
          file: 'AGENTS.md',
          evidence: 'verified'
        }
      ]
    },
    precedence: {
      skill: {
        model: 'no-override',
        evidence: 'verified',
        note: 'Codex does not merge two skills that share a name. Both stay available and you pick.'
      },
      mcp: {
        model: 'narrowest-wins',
        evidence: 'verified',
        note: 'One file holds every server, so two entries cannot collide.'
      },
      hook: {
        model: 'merge-all',
        evidence: 'verified',
        note: 'Every enabled hook runs. Codex also pins each one to a hash and refuses to run it if the file changed.'
      },
      plugin: {
        model: 'narrowest-wins',
        evidence: 'verified',
        note: 'One file holds every plugin, so two entries cannot collide.'
      },
      instruction: {
        model: 'merge-all',
        evidence: 'doc',
        note: 'Every file in the chain loads, one after another, in this order.'
      }
    },
    reload: {
      skill: UNKNOWN_RELOAD,
      mcp: nextSession(
        'Codex reads MCP servers when a session starts, so a session that is already running will not have this one. Your next session will.'
      ),
      hook: UNKNOWN_RELOAD,
      plugin: UNKNOWN_RELOAD,
      instruction: UNKNOWN_RELOAD
    }
  },

  // -------------------------------------------------------------------------
  gemini: {
    locations: {
      skill: [
        {
          at: NEUTRAL_PROJECT_SKILLS,
          scope: 'project',
          rank: 1,
          reader: 'skill-dir',
          evidence: 'verified'
        },
        {
          at: '<project>/.gemini/skills',
          scope: 'project',
          rank: 2,
          reader: 'skill-dir',
          evidence: 'verified'
        },
        {
          at: NEUTRAL_GLOBAL_SKILLS,
          scope: 'global',
          rank: 3,
          reader: 'skill-dir',
          evidence: 'verified'
        },
        { at: '~/.gemini/skills', scope: 'global', rank: 4, reader: 'skill-dir', evidence: 'verified' }
      ],
      mcp: [
        {
          at: '<project>/.gemini/settings.json',
          scope: 'project',
          rank: 1,
          reader: 'mcp-json',
          key: 'mcpServers',
          evidence: 'doc'
        },
        {
          at: '~/.gemini/settings.json',
          scope: 'global',
          rank: 2,
          reader: 'mcp-json',
          key: 'mcpServers',
          evidence: 'verified'
        }
      ],
      hook: [
        {
          at: '<project>/.gemini/settings.json',
          scope: 'project',
          rank: 1,
          reader: 'hooks-json',
          key: 'hooks',
          evidence: 'doc'
        },
        {
          at: '~/.gemini/settings.json',
          scope: 'global',
          rank: 2,
          reader: 'hooks-json',
          key: 'hooks',
          evidence: 'verified'
        }
      ],
      plugin: [
        { at: '~/.gemini/extensions', scope: 'global', rank: 1, reader: 'plugin-dir', evidence: 'verified' }
      ],
      instruction: [
        {
          at: '~/.gemini/GEMINI.md',
          scope: 'global',
          rank: 1,
          reader: 'instruction-file',
          evidence: 'doc'
        },
        {
          at: '<project>',
          scope: 'project',
          rank: 2,
          reader: 'instruction-walk',
          file: 'GEMINI.md',
          evidence: 'verified'
        },
        {
          at: '<project>',
          scope: 'project',
          rank: 3,
          reader: 'instruction-walk',
          file: 'AGENTS.md',
          evidence: 'verified'
        },
        {
          at: '<project>/.agents/rules',
          scope: 'project',
          rank: 4,
          reader: 'instruction-glob',
          file: '.md',
          evidence: 'doc'
        }
      ]
    },
    precedence: {
      skill: {
        model: 'narrowest-wins',
        evidence: 'verified',
        note: 'The project beats your home folder, and inside each of those .agents/skills beats .gemini/skills. This is the opposite of Claude Code.'
      },
      mcp: {
        model: 'narrowest-wins',
        evidence: 'doc',
        note: 'Project settings beat user settings.'
      },
      hook: {
        model: 'merge-all',
        evidence: 'doc',
        note: 'Hooks do not override each other. Every one of them runs.'
      },
      plugin: {
        model: 'narrowest-wins',
        evidence: 'doc',
        note: 'Extensions are installed once per user.'
      },
      instruction: {
        model: 'merge-all',
        evidence: 'doc',
        note: 'Every file in the chain loads, one after another, in this order.'
      }
    },
    reload: {
      skill: UNKNOWN_RELOAD,
      mcp: nextSession(
        'Gemini CLI reads MCP servers when a session starts, so a session that is already running will not have this one. Your next session will.'
      ),
      hook: UNKNOWN_RELOAD,
      plugin: UNKNOWN_RELOAD,
      instruction: UNKNOWN_RELOAD
    }
  },

  // -------------------------------------------------------------------------
  cursor: {
    locations: {
      skill: [
        { at: '~/.cursor/skills', scope: 'global', rank: 1, reader: 'skill-dir', evidence: 'verified' },
        {
          at: NEUTRAL_GLOBAL_SKILLS,
          scope: 'global',
          rank: 2,
          reader: 'skill-dir',
          evidence: 'doc'
        },
        {
          at: '<project>/.cursor/skills',
          scope: 'project',
          rank: 3,
          reader: 'skill-dir',
          evidence: 'doc'
        },
        {
          at: NEUTRAL_PROJECT_SKILLS,
          scope: 'project',
          rank: 4,
          reader: 'skill-dir',
          evidence: 'doc'
        },
        {
          at: '<claude>/skills',
          scope: 'global',
          rank: 5,
          reader: 'skill-dir',
          evidence: 'doc',
          note: 'Cursor reads Claude Code directories for compatibility.'
        },
        {
          at: '<project>/.claude/skills',
          scope: 'project',
          rank: 6,
          reader: 'skill-dir',
          evidence: 'doc'
        },
        {
          at: '~/.cursor/skills-cursor',
          scope: 'bundled',
          rank: 9,
          reader: 'skill-dir',
          evidence: 'verified',
          bundled: true
        }
      ],
      mcp: [
        {
          at: '<project>/.cursor/mcp.json',
          scope: 'project',
          rank: 1,
          reader: 'mcp-json',
          key: 'mcpServers',
          evidence: 'doc'
        },
        {
          at: '~/.cursor/mcp.json',
          scope: 'global',
          rank: 2,
          reader: 'mcp-json',
          key: 'mcpServers',
          evidence: 'verified'
        }
      ],
      hook: [
        {
          at: '~/.cursor/hooks.json',
          scope: 'global',
          rank: 1,
          reader: 'hooks-json',
          key: 'hooks',
          evidence: 'doc'
        }
      ],
      plugin: [
        {
          at: '~/.cursor/plugins/local',
          scope: 'global',
          rank: 1,
          reader: 'plugin-dir',
          evidence: 'doc'
        }
      ],
      instruction: [
        {
          at: '~/.cursor/rules',
          scope: 'global',
          rank: 1,
          reader: 'instruction-glob',
          file: '.mdc',
          evidence: 'verified'
        },
        {
          at: '<project>/.cursor/rules',
          scope: 'project',
          rank: 2,
          reader: 'instruction-glob',
          file: '.mdc',
          evidence: 'verified'
        }
      ]
    },
    precedence: {
      skill: {
        model: 'unknown',
        evidence: 'unverified',
        note: 'Cursor reads six skill directories and Tortie has not established which one it prefers when two carry the same name.'
      },
      mcp: {
        model: 'unknown',
        evidence: 'unverified',
        note: 'Cursor reads a project file and a global file, and Tortie has not established which one wins.'
      },
      hook: {
        model: 'merge-all',
        evidence: 'doc',
        note: 'Hooks do not override each other. Every one of them runs.'
      },
      plugin: { model: 'unknown', evidence: 'unverified', note: 'Not established.' },
      instruction: {
        model: 'merge-all',
        evidence: 'doc',
        note: 'Every rule file that applies loads, one after another.'
      }
    },
    reload: {
      mcp: nextSession(
        'Cursor reads MCP servers when a session starts, so a session that is already running will not have this one. Your next session will.'
      )
    }
  },

  // -------------------------------------------------------------------------
  qwen: {
    locations: {
      skill: [
        {
          at: '<project>/.qwen/skills',
          scope: 'project',
          rank: 1,
          reader: 'skill-dir',
          evidence: 'unverified',
          note: 'By symmetry with Gemini CLI, whose code base Qwen shares. Not exercised here.'
        },
        { at: '~/.qwen/skills', scope: 'global', rank: 2, reader: 'skill-dir', evidence: 'verified' }
      ],
      mcp: [
        {
          at: '<project>/.qwen/settings.json',
          scope: 'project',
          rank: 1,
          reader: 'mcp-json',
          key: 'mcpServers',
          evidence: 'doc'
        },
        {
          at: '~/.qwen/settings.json',
          scope: 'global',
          rank: 2,
          reader: 'mcp-json',
          key: 'mcpServers',
          evidence: 'verified'
        }
      ],
      plugin: [
        { at: '~/.qwen/extensions', scope: 'global', rank: 1, reader: 'plugin-dir', evidence: 'verified' }
      ],
      instruction: [
        {
          at: '<project>',
          scope: 'project',
          rank: 1,
          reader: 'instruction-walk',
          file: 'AGENTS.md',
          evidence: 'doc'
        }
      ]
    },
    precedence: {
      skill: {
        model: 'narrowest-wins',
        evidence: 'doc',
        note: 'Qwen shares the Gemini CLI code base, where the project beats your home folder.'
      },
      mcp: { model: 'narrowest-wins', evidence: 'doc', note: 'Project settings beat user settings.' },
      plugin: { model: 'narrowest-wins', evidence: 'doc', note: 'Extensions are installed once per user.' },
      instruction: {
        model: 'merge-all',
        evidence: 'doc',
        note: 'Every file in the chain loads, one after another, in this order.'
      }
    },
    reload: {
      mcp: nextSession(
        'Qwen reads MCP servers when a session starts, so a session that is already running will not have this one. Your next session will.'
      )
    }
  },

  // -------------------------------------------------------------------------
  antigravity: {
    locations: {
      skill: [
        {
          at: NEUTRAL_PROJECT_SKILLS,
          scope: 'project',
          rank: 1,
          reader: 'skill-dir',
          evidence: 'doc'
        },
        {
          at: '~/.gemini/config/skills',
          scope: 'global',
          rank: 3,
          reader: 'skill-dir',
          evidence: 'doc'
        },
        {
          at: '~/.gemini/antigravity-cli/builtin/skills',
          scope: 'bundled',
          rank: 9,
          reader: 'skill-dir',
          evidence: 'verified',
          bundled: true
        }
      ],
      mcp: [
        {
          at: '~/.gemini/config/mcp_config.json',
          scope: 'global',
          rank: 1,
          reader: 'mcp-json',
          key: 'mcpServers',
          evidence: 'verified'
        }
      ],
      hook: [
        {
          at: '<project>/.agents/hooks.json',
          scope: 'project',
          rank: 1,
          reader: 'hooks-json',
          evidence: 'doc'
        }
      ],
      plugin: [
        {
          at: '~/.gemini/config/plugins',
          scope: 'global',
          rank: 1,
          reader: 'plugin-dir',
          evidence: 'doc'
        }
      ]
    },
    precedence: {
      skill: {
        model: 'declared-priority',
        evidence: 'doc',
        note: 'The workspace comes first, then roots the workspace declares, then your home folder, then the built-in ones.'
      },
      mcp: { model: 'declared-priority', evidence: 'doc', note: 'Global first, then plugin-provided.' },
      hook: {
        model: 'merge-all',
        evidence: 'doc',
        note: 'Hooks do not override each other. Every one of them runs.'
      },
      plugin: { model: 'unknown', evidence: 'unverified', note: 'Not established.' }
    },
    reload: {}
  },

  // -------------------------------------------------------------------------
  muse: {
    locations: {
      skill: [
        {
          at: NEUTRAL_GLOBAL_SKILLS,
          scope: 'global',
          rank: 1,
          reader: 'skill-dir',
          evidence: 'verified',
          note: "Verified as muse's own user scope."
        }
      ],
      plugin: [
        {
          at: '~/.local/share/muse/plugins/cache/builtin/muse-core',
          scope: 'bundled',
          rank: 9,
          reader: 'plugin-dir',
          evidence: 'verified',
          bundled: true
        }
      ]
    },
    precedence: {
      skill: {
        model: 'cli-reported',
        evidence: 'verified',
        note: 'muse reports its own resolution, and it is the only agent here that does. Reading the files cannot reproduce it, so Tortie shows both.'
      },
      plugin: { model: 'unknown', evidence: 'unverified', note: 'Not established.' }
    },
    reload: {}
  },

  // -------------------------------------------------------------------------
  pi: {
    locations: {
      skill: [
        { at: '~/.pi/agent/skills', scope: 'global', rank: 1, reader: 'skill-dir', evidence: 'verified' },
        { at: NEUTRAL_GLOBAL_SKILLS, scope: 'global', rank: 2, reader: 'skill-dir', evidence: 'doc' },
        { at: '<project>/.pi/skills', scope: 'project', rank: 3, reader: 'skill-dir', evidence: 'doc' },
        { at: NEUTRAL_PROJECT_SKILLS, scope: 'project', rank: 4, reader: 'skill-dir', evidence: 'doc' }
      ],
      instruction: [
        {
          at: '<project>',
          scope: 'project',
          rank: 1,
          reader: 'instruction-walk',
          file: 'AGENTS.md',
          evidence: 'doc'
        }
      ]
    },
    precedence: {
      skill: {
        model: 'search-path',
        evidence: 'doc',
        note: 'pi searches a list of directories and takes the first match. The list is editable in its settings, so this order is the default one.'
      },
      instruction: {
        model: 'merge-all',
        evidence: 'doc',
        note: 'Every file in the chain loads, one after another, in this order.'
      }
    },
    reload: {}
  },

  // -------------------------------------------------------------------------
  // Instruction files only (Phase 59, research 50 §2.5). The recognized
  // file list comes from grok's own compat table: AGENTS.md, AGENT.md and
  // the CLAUDE.md family (claude compatibility is on by default). There is
  // NO GROK.md anywhere in grok's source, so this table must not invent one.
  // Rules directories are read per directory, plus rules/ under the home
  // root. Config (~/.grok/config.toml and its overlay chain) is recorded in
  // the registry row's notes; the Context substrate has no cell for it.
  grok: {
    locations: {
      instruction: [
        {
          at: '~/.grok/rules',
          scope: 'global',
          rank: 1,
          reader: 'instruction-glob',
          file: '.md',
          evidence: 'doc'
        },
        {
          at: '<project>',
          scope: 'project',
          rank: 2,
          reader: 'instruction-walk',
          file: 'AGENTS.md',
          evidence: 'doc'
        },
        {
          at: '<project>',
          scope: 'project',
          rank: 3,
          reader: 'instruction-walk',
          file: 'AGENT.md',
          evidence: 'doc'
        },
        {
          at: '<project>',
          scope: 'project',
          rank: 4,
          reader: 'instruction-walk',
          file: 'CLAUDE.md',
          evidence: 'doc',
          note: 'Claude compatibility is on by default, so CLAUDE.md files load too.'
        },
        {
          at: '<project>/.grok/rules',
          scope: 'project',
          rank: 5,
          reader: 'instruction-glob',
          file: '.md',
          evidence: 'doc'
        },
        {
          at: '<project>/.claude/rules',
          scope: 'project',
          rank: 6,
          reader: 'instruction-glob',
          file: '.md',
          evidence: 'doc'
        },
        {
          at: '<project>/.cursor/rules',
          scope: 'project',
          rank: 7,
          reader: 'instruction-glob',
          file: '.mdc',
          evidence: 'doc'
        }
      ]
    },
    precedence: {
      instruction: {
        model: 'merge-all',
        evidence: 'doc',
        note: 'Every recognized file loads. Home files load first, then project files from the repository root down to the working directory.'
      }
    },
    reload: {
      instruction: live(
        'Grok reads instruction files again for every prompt, so an edit lands on the next message.',
        'doc'
      )
    }
  },

  // -------------------------------------------------------------------------
  deepseek: {
    locations: {
      skill: [
        { at: '~/.deepseek/skills', scope: 'global', rank: 1, reader: 'skill-dir', evidence: 'verified' },
        { at: NEUTRAL_PROJECT_SKILLS, scope: 'project', rank: 2, reader: 'skill-dir', evidence: 'doc' }
      ],
      mcp: [
        {
          at: '~/.deepseek/mcp.json',
          scope: 'global',
          rank: 1,
          reader: 'mcp-json',
          key: 'mcpServers',
          evidence: 'doc'
        }
      ],
      instruction: [
        {
          at: '<project>',
          scope: 'project',
          rank: 1,
          reader: 'instruction-walk',
          file: 'AGENTS.md',
          evidence: 'doc'
        }
      ]
    },
    precedence: {
      skill: {
        model: 'unknown',
        evidence: 'unverified',
        note: 'DeepSeek reads two skill directories and Tortie has not established which one it prefers.'
      },
      mcp: { model: 'narrowest-wins', evidence: 'doc', note: 'One file holds every server.' },
      instruction: {
        model: 'merge-all',
        evidence: 'doc',
        note: 'Every file in the chain loads, one after another, in this order.'
      }
    },
    reload: {}
  },

  // -------------------------------------------------------------------------
  droid: {
    locations: {
      skill: [
        { at: '~/.factory/skills', scope: 'global', rank: 1, reader: 'skill-dir', evidence: 'verified' },
        {
          at: '<project>/.factory/skills',
          scope: 'project',
          rank: 2,
          reader: 'skill-dir',
          evidence: 'doc'
        }
      ],
      mcp: [
        {
          at: '<project>/.factory/mcp.json',
          scope: 'project',
          rank: 1,
          reader: 'mcp-json',
          key: 'mcpServers',
          evidence: 'doc'
        },
        {
          at: '~/.factory/mcp.json',
          scope: 'global',
          rank: 2,
          reader: 'mcp-json',
          key: 'mcpServers',
          evidence: 'doc'
        }
      ],
      instruction: [
        {
          at: '<project>',
          scope: 'project',
          rank: 1,
          reader: 'instruction-walk',
          file: 'AGENTS.md',
          evidence: 'doc'
        }
      ]
    },
    precedence: {
      skill: {
        model: 'unknown',
        evidence: 'unverified',
        note: 'droid is not installed on this machine, so nothing about it has been exercised here.'
      },
      mcp: { model: 'narrowest-wins', evidence: 'doc', note: 'Project beats folder, and folder beats user.' },
      instruction: {
        model: 'merge-all',
        evidence: 'doc',
        note: 'Every file in the chain loads, one after another, in this order.'
      }
    },
    reload: {}
  }
};

// ---------------------------------------------------------------------------
// The skills CLI's own agent names
// ---------------------------------------------------------------------------

/**
 * Tortie's registry id, mapped to the name the bundled skills CLI accepts.
 *
 * **The two vocabularies are not the same and the difference bites on the first
 * command.** Tortie's registry calls Anthropic's agent `claude`; the CLI calls it
 * `claude-code` and rejects `claude` outright. Same for `gemini` against
 * `gemini-cli` and `qwen` against `qwen-code`.
 *
 * It lives here, in the per-agent context block, rather than in
 * `src/main/skills/commands.ts`, because it is one more per-agent fact beside
 * the roots, the precedence and the reload answers. `SKILLS_CLI_AGENTS` in that
 * file is the list the CLI printed when it was fed a name it did not know, and
 * `skillsCliNameFor` is checked against it by a test rather than assumed.
 *
 * A `null` is a real answer and not a gap. `cursoride` and `copilotide` are
 * capture-only, so no skill is ever installed FOR them. `deepseek`, `muse` and
 * `antigravity` are launchable agents the CLI has no name for, and the honest
 * result is that they cannot be a target of an install rather than that they get
 * somebody else's directory.
 */
const SKILLS_CLI_NAMES: Record<AgentRegistryId, string | null> = {
  claude: 'claude-code',
  cursor: 'cursor',
  codex: 'codex',
  gemini: 'gemini-cli',
  droid: 'droid',
  qwen: 'qwen-code',
  pi: 'pi',
  // The bundled skills CLI (src/main/skills/commands.ts) knows 'pi' but has
  // no 'omp' name, so omp cannot be an install target — the honest null.
  omp: null,
  // The bundled skills CLI already lists 'grok' by that exact name
  // (src/main/skills/commands.ts), verified in the Phase 59 spec stage.
  grok: 'grok',
  antigravity: 'antigravity-cli',
  deepseek: null,
  muse: null,
  cursoride: null,
  copilotide: null
};

/**
 * The CLI's name for one Tortie agent, or null when it has none.
 *
 * Callers must treat null as "this agent cannot be an install target" and drop
 * it from the target list. Passing the registry id through instead would build a
 * command the CLI exits 1 on, and passing a guess would install into another
 * agent's directory.
 */
export function skillsCliNameFor(agent: AgentRegistryId): string | null {
  return SKILLS_CLI_NAMES[agent] ?? null;
}

/** Every Tortie agent a skill can be installed for, in the CLI's vocabulary. */
export function skillsCliTargets(
  agents: readonly AgentRegistryId[]
): string[] {
  const out: string[] = [];
  for (const agent of agents) {
    const name = skillsCliNameFor(agent);
    if (name !== null && !out.includes(name)) out.push(name);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

/** Every registry agent that declares at least one location. */
export const CONTEXT_AGENT_IDS: readonly AgentRegistryId[] = Object.keys(BLOCKS).filter(
  (id): id is AgentRegistryId => Object.keys(BLOCKS[id as AgentRegistryId]?.locations ?? {}).length > 0
);

export function contextBlock(agent: AgentRegistryId): AgentContextBlock | null {
  return BLOCKS[agent] ?? null;
}

export function locationsFor(
  agent: AgentRegistryId,
  category: ContextCategory
): readonly ContextLocation[] {
  return BLOCKS[agent]?.locations[category] ?? [];
}

/**
 * The precedence for one agent and one category. An agent that declares
 * locations but no precedence gets `unknown`, which is the honest default:
 * a missing row must never quietly become "project wins".
 */
export function precedenceFor(
  agent: AgentRegistryId,
  category: ContextCategory
): ContextPrecedence {
  return (
    BLOCKS[agent]?.precedence[category] ?? {
      model: 'unknown',
      evidence: 'unverified',
      note: 'Tortie has not established how this agent resolves two definitions with the same name.'
    }
  );
}

/**
 * The scopes one agent reads for one category, HIGHEST PRECEDENCE FIRST.
 *
 * Derived from the declared locations rather than written twice: `rank` is
 * already the ordering fact, and a second hand-written ladder is how the
 * renderer ended up drawing Claude Code's order for gemini. Claude Code's
 * skills are global at rank 2 and project at rank 3; gemini's are project at
 * rank 1 and global at rank 3, and this function returns those two lists in
 * opposite orders because the table says so.
 *
 * `bundled` is never in the result. It is a display group of its own and it
 * competes with nothing.
 */
export function scopeOrderFor(
  agent: AgentRegistryId,
  category: ContextCategory
): ContextScope[] {
  const best = new Map<ContextScope, number>();
  for (const location of locationsFor(agent, category)) {
    if (location.bundled === true) continue;
    const seen = best.get(location.scope);
    if (seen === undefined || location.rank < seen) best.set(location.scope, location.rank);
  }
  return [...best.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([scope]) => scope);
}

/** Everything the view needs to order and explain one agent's category. */
export function precedenceReadoutFor(
  agent: AgentRegistryId,
  category: ContextCategory
): ContextPrecedenceReadout {
  const precedence = precedenceFor(agent, category);
  return {
    model: precedence.model,
    evidence: precedence.evidence,
    note: precedence.note,
    scopeOrder: scopeOrderFor(agent, category)
  };
}

export function reloadFor(
  agent: AgentRegistryId,
  category: ContextCategory
): ContextReloadCell {
  return BLOCKS[agent]?.reload[category] ?? UNKNOWN_RELOAD;
}

/** True when this agent runs hooks declared inside a skill's frontmatter. */
export function readsSkillFrontmatterHooks(agent: AgentRegistryId): boolean {
  return BLOCKS[agent]?.skillFrontmatterHooks === true;
}

/** Categories this agent declares any location for. */
export function supportedCategories(agent: AgentRegistryId): ContextCategory[] {
  const block = BLOCKS[agent];
  if (!block) return [];
  return (Object.keys(block.locations) as ContextCategory[]).filter(
    (category) => (block.locations[category] ?? []).length > 0
  );
}

/** The three behaviours, exported so a caller can exhaustively switch. */
export const RELOAD_BEHAVIORS: readonly ContextReloadBehavior[] = ['live', 'next-session', 'unknown'];
