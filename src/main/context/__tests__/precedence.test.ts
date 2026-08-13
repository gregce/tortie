/**
 * Precedence, which is the value of Phase 22 and the part a panel gets
 * confidently wrong.
 *
 * Every case here is built from ONE filesystem layout and asserted against
 * several agents, because the finding these tests exist to protect is that the
 * same two files resolve in OPPOSITE directions depending on which agent is
 * reading them. A test that only exercised Claude Code would pass on a reader
 * that hard-coded "global wins" and would be silently wrong for Gemini, Qwen
 * and Antigravity.
 *
 * The layout below is the shape of the operator's own machine: a canonical
 * copy in the vendor-neutral `~/.agents/skills`, symlinked into each agent's
 * directory, plus a couple of genuinely separate files that collide by name.
 */

import { describe, expect, it } from 'vitest';
import { scanContext } from '../scan';
import { createMemoryContextFs } from '../port';

const HOME = '/home/t';
const PROJECT = '/repo';
const ENV = { HOME } as Record<string, string>;

function skill(name: string, description: string, extra = ''): string {
  return `---\nname: ${name}\ndescription: ${description}\n${extra}---\n\nBody of ${name}.\n`;
}

/**
 * One skill named `deploy` in the user's home folder and another named
 * `deploy` committed to the repository. This is the collision the whole
 * feature exists to explain.
 */
function collidingLayout() {
  return createMemoryContextFs({
    files: {
      [`${HOME}/.claude/skills/deploy/SKILL.md`]: skill('deploy', 'Personal deploy'),
      [`${PROJECT}/.claude/skills/deploy/SKILL.md`]: skill('deploy', 'Team deploy'),
      [`${HOME}/.gemini/skills/deploy/SKILL.md`]: skill('deploy', 'Personal deploy'),
      [`${PROJECT}/.gemini/skills/deploy/SKILL.md`]: skill('deploy', 'Team deploy'),
      [`${HOME}/.codex/skills/deploy/SKILL.md`]: skill('deploy', 'Personal deploy'),
      [`${PROJECT}/.agents/skills/deploy/SKILL.md`]: skill('deploy', 'Team deploy')
    }
  });
}

describe('skills resolve in opposite directions in two products', () => {
  it('Claude Code: your personal skill beats the one the team committed', async () => {
    const result = await scanContext(
      { cwd: PROJECT, agent: 'claude', categories: ['skill'], env: ENV },
      { fs: collidingLayout() }
    );
    expect(result.entries).toHaveLength(1);
    const [entry] = result.entries;
    expect(entry?.sourcePath).toBe(`${HOME}/.claude/skills/deploy/SKILL.md`);
    expect(entry?.scope).toBe('global');
    expect(entry?.resolution).toBe('wins');
    expect(entry?.model).toBe('broadest-wins');
    expect(entry?.state).toBe('shadowing');
    expect(entry?.shadows).toHaveLength(1);
    expect(entry?.shadows[0]?.sourcePath).toBe(`${PROJECT}/.claude/skills/deploy/SKILL.md`);
    expect(entry?.shadows[0]?.reason).toBe(
      'Also defined in this project. The one in your home folder wins.'
    );
  });

  it('Gemini CLI: the same two files resolve the other way round', async () => {
    const result = await scanContext(
      { cwd: PROJECT, agent: 'gemini', categories: ['skill'], env: ENV },
      { fs: collidingLayout() }
    );
    expect(result.entries).toHaveLength(1);
    const [entry] = result.entries;
    expect(entry?.sourcePath).toBe(`${PROJECT}/.agents/skills/deploy/SKILL.md`);
    expect(entry?.scope).toBe('project');
    expect(entry?.model).toBe('narrowest-wins');
    expect(entry?.shadows.map((shadow) => shadow.sourcePath)).toContain(
      `${HOME}/.gemini/skills/deploy/SKILL.md`
    );
  });

  it('Gemini CLI: inside one tier, .agents/skills beats .gemini/skills', async () => {
    const result = await scanContext(
      { cwd: PROJECT, agent: 'gemini', categories: ['skill'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${HOME}/.agents/skills/impeccable/SKILL.md`]: skill('impeccable', 'Neutral copy'),
            [`${HOME}/.gemini/skills/impeccable/SKILL.md`]: skill('impeccable', 'Gemini copy')
          }
        })
      }
    );
    // This is the one Gemini CLI itself reports eleven times on the operator's
    // machine: "Skill conflict detected: impeccable from ~/.agents/skills is
    // overriding the same skill from ~/.gemini/skills".
    expect(result.entries[0]?.sourcePath).toBe(`${HOME}/.agents/skills/impeccable/SKILL.md`);
    expect(result.entries[0]?.shadows[0]?.sourcePath).toBe(
      `${HOME}/.gemini/skills/impeccable/SKILL.md`
    );
  });

  it('Codex: nothing shadows anything, and both stay available', async () => {
    const result = await scanContext(
      { cwd: PROJECT, agent: 'codex', categories: ['skill'], env: ENV },
      { fs: collidingLayout() }
    );
    expect(result.entries).toHaveLength(2);
    for (const entry of result.entries) {
      expect(entry.resolution).toBe('coexists');
      expect(entry.model).toBe('no-override');
      expect(entry.shadows).toHaveLength(0);
    }
  });

  it('Cursor: a collision Tortie never established a rule for says so', async () => {
    const result = await scanContext(
      { cwd: PROJECT, agent: 'cursor', categories: ['skill'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${HOME}/.cursor/skills/deploy/SKILL.md`]: skill('deploy', 'Cursor copy'),
            [`${HOME}/.agents/skills/deploy/SKILL.md`]: skill('deploy', 'Neutral copy')
          }
        })
      }
    );
    expect(result.entries).toHaveLength(2);
    for (const entry of result.entries) {
      expect(entry.resolution).toBe('unknown');
      expect(entry.evidence === 'doc' || entry.evidence === 'verified').toBe(true);
    }
  });
});

describe('one file, many agents, one row', () => {
  it('dedupes by real path and reports every agent that reaches it', async () => {
    const canonical = `${HOME}/.agents/skills/govuk-style`;
    const result = await scanContext(
      { cwd: PROJECT, categories: ['skill'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: { [`${canonical}/SKILL.md`]: skill('govuk-style', 'Write in GOV.UK style') },
          dirs: [
            `${HOME}/.claude/skills`,
            `${HOME}/.gemini/skills`,
            `${HOME}/.qwen/skills`,
            `${HOME}/.codex/skills`
          ],
          links: {
            [`${HOME}/.claude/skills/govuk-style`]: canonical,
            [`${HOME}/.gemini/skills/govuk-style`]: canonical,
            [`${HOME}/.qwen/skills/govuk-style`]: canonical,
            [`${HOME}/.codex/skills/govuk-style`]: canonical
          }
        })
      }
    );
    expect(result.entries).toHaveLength(1);
    const [entry] = result.entries;
    expect(entry?.realPath).toBe(`${canonical}/SKILL.md`);
    // claude, gemini, qwen reach it through their own symlink; codex, muse and
    // pi reach the canonical copy directly because they read ~/.agents/skills.
    expect(entry?.agents).toEqual(
      expect.arrayContaining(['claude', 'codex', 'gemini', 'qwen', 'muse', 'pi'])
    );
    expect(entry?.shadows).toHaveLength(0);
    expect(result.sections[0]?.resolved).toBe(1);
  });

  it('two agents reaching two different files with one name stay two rows', async () => {
    const result = await scanContext(
      { cwd: PROJECT, categories: ['skill'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${HOME}/.agents/skills/lore/SKILL.md`]: skill('lore', 'The shared one'),
            [`${HOME}/.claude/skills/lore/SKILL.md`]: skill('lore', 'A different file')
          }
        })
      }
    );
    expect(result.entries).toHaveLength(2);
    const paths = result.entries.map((entry) => entry.realPath).sort();
    expect(paths).toEqual([
      `${HOME}/.agents/skills/lore/SKILL.md`,
      `${HOME}/.claude/skills/lore/SKILL.md`
    ]);
  });
});

describe('bundled skills are a separate class', () => {
  it('renders them and keeps them out of the section count', async () => {
    const result = await scanContext(
      { cwd: PROJECT, agent: 'cursor', categories: ['skill'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${HOME}/.cursor/skills/mine/SKILL.md`]: skill('mine', 'A skill I installed'),
            [`${HOME}/.cursor/skills-cursor/babysit/SKILL.md`]: skill('babysit', 'Shipped by Cursor')
          }
        })
      }
    );
    expect(result.sections[0]?.resolved).toBe(1);
    expect(result.sections[0]?.bundled).toBe(1);
    expect(result.entries.find((entry) => entry.name === 'babysit')?.scope).toBe('bundled');
  });
});

describe('hooks merge and never resolve', () => {
  const settings = (command: string) =>
    JSON.stringify({
      hooks: {
        PostToolUse: [{ matcher: 'Write|Edit', hooks: [{ type: 'command', command }] }]
      }
    });

  it('a user hook and a project hook both run', async () => {
    const result = await scanContext(
      { cwd: PROJECT, agent: 'claude', categories: ['hook'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${HOME}/.claude/settings.json`]: settings('/bin/user-hook.sh'),
            [`${PROJECT}/.claude/settings.json`]: settings('/bin/project-hook.sh')
          }
        })
      }
    );
    expect(result.entries).toHaveLength(2);
    for (const entry of result.entries) {
      expect(entry.resolution).toBe('merges');
      expect(entry.shadows).toHaveLength(0);
    }
    expect(result.sections.find((section) => section.category === 'hook')?.resolved).toBe(2);
  });

  it('the same handler in two files fires once, so it is one row', async () => {
    const result = await scanContext(
      { cwd: PROJECT, agent: 'claude', categories: ['hook'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${HOME}/.claude/settings.json`]: settings('/bin/same.sh'),
            [`${PROJECT}/.claude/settings.json`]: settings('/bin/same.sh')
          }
        })
      }
    );
    expect(result.entries).toHaveLength(1);
  });

  it('a hook whose script is missing is broken, not a warning', async () => {
    const result = await scanContext(
      { cwd: PROJECT, agent: 'claude', categories: ['hook'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: { [`${HOME}/.claude/settings.json`]: settings('/bin/gone.sh') }
        })
      }
    );
    expect(result.entries[0]?.state).toBe('broken');
    expect(result.entries[0]?.payload).toMatchObject({ scriptMissing: true });
    expect(result.problems[0]?.message).toBe(
      'The script this hook runs is not on disk. The agent will log an error and keep going.'
    );
  });
});

describe('MCP servers: whole entry wins, and the approval gate is real', () => {
  it('local scope beats the project file, and the fields are not merged', async () => {
    const result = await scanContext(
      { cwd: PROJECT, agent: 'claude', categories: ['mcp'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${HOME}/.claude.json`]: JSON.stringify({
              mcpServers: { docs: { command: 'user-docs' } },
              projects: {
                [PROJECT]: {
                  mcpServers: { docs: { command: 'local-docs', args: ['--fast'] } },
                  enabledMcpjsonServers: ['other']
                }
              }
            }),
            [`${PROJECT}/.mcp.json`]: JSON.stringify({
              mcpServers: { docs: { command: 'project-docs', args: ['--slow'] } }
            })
          }
        })
      }
    );
    const docs = result.entries.filter((entry) => entry.name === 'docs');
    expect(docs).toHaveLength(1);
    expect(docs[0]?.scope).toBe('project-local');
    expect(docs[0]?.payload).toMatchObject({ command: 'local-docs', args: ['--fast'] });
    expect(docs[0]?.shadows).toHaveLength(2);
  });

  it('a project server nobody approved is listed as pending, not as running', async () => {
    const result = await scanContext(
      { cwd: PROJECT, agent: 'claude', categories: ['mcp'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${HOME}/.claude.json`]: JSON.stringify({
              projects: { [PROJECT]: { enabledMcpjsonServers: ['approved'] } }
            }),
            [`${PROJECT}/.mcp.json`]: JSON.stringify({
              mcpServers: {
                approved: { command: 'yes' },
                waiting: { command: 'maybe' }
              }
            })
          }
        })
      }
    );
    const byName = new Map(result.entries.map((entry) => [entry.name, entry]));
    expect(byName.get('approved')?.payload).toMatchObject({ approval: 'approved' });
    expect(byName.get('waiting')?.payload).toMatchObject({ approval: 'pending' });
  });

  it('CLAUDE_CONFIG_DIR moves the file, and the reader follows it', async () => {
    const moved = '/elsewhere/claude';
    const result = await scanContext(
      {
        cwd: PROJECT,
        agent: 'claude',
        categories: ['mcp'],
        env: { HOME, CLAUDE_CONFIG_DIR: moved }
      },
      {
        fs: createMemoryContextFs({
          files: {
            [`${moved}/.claude.json`]: JSON.stringify({ mcpServers: { moved: { command: 'x' } } }),
            [`${HOME}/.claude.json`]: JSON.stringify({ mcpServers: { home: { command: 'y' } } })
          }
        })
      }
    );
    expect(result.entries.map((entry) => entry.name)).toEqual(['moved']);
  });
});

describe('one bad file never blanks the panel', () => {
  it('reports the file and the line, and still renders everything else', async () => {
    const result = await scanContext(
      { cwd: PROJECT, agent: 'claude', categories: ['mcp', 'skill'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${PROJECT}/.mcp.json`]: '{\n  "mcpServers": {\n    "broken": \n  }\n}',
            [`${HOME}/.claude/skills/fine/SKILL.md`]: skill('fine', 'This one is readable')
          }
        })
      }
    );
    expect(result.entries.map((entry) => entry.name)).toEqual(['fine']);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.message).toContain('could not be read');
    expect(result.problems[0]?.line).toBeGreaterThan(1);
  });
});

describe('instructions carry the chain that no file tree can show', () => {
  // The chain on the operator's own machine: `~/CLAUDE.md` imports
  // `@AGENTS.md`, which imports `@.tessl/RULES.md`, and then the repository
  // adds its own on top. Four files, three hops, and the Explorer can only
  // ever show one of them.
  const NESTED_PROJECT = `${HOME}/gmux`;

  it('follows @imports and names the file that pulled each one in', async () => {
    const result = await scanContext(
      { cwd: NESTED_PROJECT, agent: 'claude', categories: ['instruction'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${HOME}/CLAUDE.md`]: '# Root\n\n@AGENTS.md\n',
            [`${HOME}/AGENTS.md`]: '@.tessl/RULES.md follow them\n',
            [`${HOME}/.tessl/RULES.md`]: 'The rules themselves.\n',
            [`${NESTED_PROJECT}/CLAUDE.md`]: 'Project conventions.\n'
          }
        })
      }
    );
    expect(result.entries.map((entry) => entry.sourcePath)).toEqual([
      `${HOME}/CLAUDE.md`,
      `${HOME}/AGENTS.md`,
      `${HOME}/.tessl/RULES.md`,
      `${NESTED_PROJECT}/CLAUDE.md`
    ]);
    expect(result.entries[1]?.payload).toMatchObject({
      importedBy: `${HOME}/CLAUDE.md`,
      importDepth: 1
    });
    expect(result.entries[2]?.payload).toMatchObject({ importDepth: 2 });
  });

  it('an import loop terminates', async () => {
    const result = await scanContext(
      { cwd: PROJECT, agent: 'claude', categories: ['instruction'], env: ENV },
      {
        fs: createMemoryContextFs({
          files: {
            [`${PROJECT}/CLAUDE.md`]: '@A.md\n',
            [`${PROJECT}/A.md`]: '@B.md\n',
            [`${PROJECT}/B.md`]: '@CLAUDE.md\n'
          }
        })
      }
    );
    expect(result.entries).toHaveLength(3);
  });
});

describe('the agent readout is honest about what it does not know', () => {
  it('names the categories an agent has no location for', async () => {
    const result = await scanContext(
      { cwd: PROJECT, env: ENV },
      { fs: createMemoryContextFs({ files: {} }) }
    );
    const qwen = result.agents.find((agent) => agent.agent === 'qwen');
    expect(qwen?.unknown).toContain('hook');
    expect(qwen?.supported).toContain('skill');
    const muse = result.agents.find((agent) => agent.agent === 'muse');
    expect(muse?.unknown).toEqual(expect.arrayContaining(['mcp', 'hook', 'instruction']));
  });
});
