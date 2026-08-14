/**
 * The command shapes are exact, and this file is why that claim is checkable.
 *
 * Two flags are greedy and one flag form is discarded, and BOTH mistakes exit 0
 * while doing the wrong thing. A passing exit code is therefore not evidence,
 * so every row of the command table in docs/BACKLOG.md is asserted here as a
 * full argv, position by position, rather than by running anything.
 */

import { describe, expect, it } from 'vitest';
import {
  LIST_JSON_FIELDS,
  OPERATION_TRAITS,
  SKILLS_CLI_AGENTS,
  SkillsCommandError,
  assertNoEqualsForm,
  commandFor,
  enumerateCommand,
  installCommand,
  isKnownSkillsAgent,
  listProbeCommand,
  parseSkillsListJson,
  removeCommand,
  restoreProjectCommand,
  updateCommand,
  versionCommand
} from '../commands';

describe('the command table, row by row', () => {
  it('probes a copy of the CLI with a bare --version', () => {
    expect(versionCommand()).toEqual(['--version']);
  });

  it('enumerates a source with -l, and the source comes straight after add', () => {
    expect(enumerateCommand('vercel-labs/skills')).toEqual([
      'add',
      'vercel-labs/skills',
      '-l'
    ]);
  });

  it('installs globally with the source at index 1 and -s before -a', () => {
    expect(
      installCommand({
        scope: 'global',
        source: 'vercel-labs/skills',
        skills: ['govuk-style'],
        agents: ['claude-code', 'codex']
      })
    ).toEqual([
      'add',
      'vercel-labs/skills',
      '-g',
      '-y',
      '-s',
      'govuk-style',
      '-a',
      'claude-code',
      'codex'
    ]);
  });

  it('installs into a project with the same shape and no -g', () => {
    expect(
      installCommand({
        scope: 'project',
        source: 'vercel-labs/skills',
        skills: ['govuk-style', 'simple-english'],
        agents: ['claude-code', 'codex']
      })
    ).toEqual([
      'add',
      'vercel-labs/skills',
      '-y',
      '-s',
      'govuk-style',
      'simple-english',
      '-a',
      'claude-code',
      'codex'
    ]);
  });

  it('removes a global skill fully, with -g and no agent list', () => {
    expect(removeCommand('govuk-style')).toEqual(['remove', '-g', '-y', '-s', 'govuk-style']);
    expect(removeCommand('govuk-style', undefined, 'global')).toEqual([
      'remove',
      '-g',
      '-y',
      '-s',
      'govuk-style'
    ]);
  });

  it('removes a project skill with no -g, because scope is the flag plus the cwd', () => {
    expect(removeCommand('govuk-style', undefined, 'project')).toEqual([
      'remove',
      '-y',
      '-s',
      'govuk-style'
    ]);
  });

  it('removes a skill from one agent that uses symlinks', () => {
    expect(removeCommand('govuk-style', 'claude-code')).toEqual([
      'remove',
      '-g',
      '-y',
      '-s',
      'govuk-style',
      '-a',
      'claude-code'
    ]);
  });

  it('updates one skill, and every global skill', () => {
    expect(updateCommand('govuk-style')).toEqual(['update', '-g', '-y', 'govuk-style']);
    expect(updateCommand(null)).toEqual(['update', '-g', '-y']);
  });

  it('restores a project from its lock file', () => {
    expect(restoreProjectCommand()).toEqual(['experimental_install']);
  });

  it('routes every operation kind through one switch', () => {
    expect(commandFor({ kind: 'version' })).toEqual(versionCommand());
    expect(commandFor({ kind: 'listProbe' })).toEqual(listProbeCommand());
    expect(commandFor({ kind: 'enumerate', source: 'a/b' })).toEqual(enumerateCommand('a/b'));
    expect(commandFor({ kind: 'remove', skill: 'x' })).toEqual(removeCommand('x'));
    expect(commandFor({ kind: 'remove', skill: 'x', scope: 'global' })).toEqual(removeCommand('x'));
    expect(commandFor({ kind: 'remove', skill: 'x', scope: 'project' })).toEqual(
      removeCommand('x', undefined, 'project')
    );
    expect(commandFor({ kind: 'update', skill: null })).toEqual(updateCommand(null));
    expect(commandFor({ kind: 'restoreProject' })).toEqual(restoreProjectCommand());
  });
});

describe('trap 1: the source must come immediately after add', () => {
  it('never places the source after -s, where it would be read as a skill name', () => {
    const argv = installCommand({
      scope: 'global',
      source: 'vercel-labs/skills',
      skills: ['a'],
      agents: ['claude-code', 'codex']
    });
    expect(argv[0]).toBe('add');
    expect(argv[1]).toBe('vercel-labs/skills');
    expect(argv.indexOf('vercel-labs/skills')).toBeLessThan(argv.indexOf('-s'));
    expect(argv.indexOf('vercel-labs/skills')).toBeLessThan(argv.indexOf('-a'));
  });

  it('places -s before -a, so the greedy skill list is closed by a flag token', () => {
    const argv = installCommand({
      scope: 'global',
      source: 'a/b',
      skills: ['one', 'two'],
      agents: ['claude-code', 'codex']
    });
    const s = argv.indexOf('-s');
    const a = argv.indexOf('-a');
    expect(s).toBeLessThan(a);
    // Everything between -s and -a is a skill name, and nothing else is.
    expect(argv.slice(s + 1, a)).toEqual(['one', 'two']);
    expect(argv.slice(a + 1)).toEqual(['claude-code', 'codex']);
  });

  it('refuses a value that begins with a dash, which the parser would eat as a flag', () => {
    expect(() => enumerateCommand('-g')).toThrow(SkillsCommandError);
    expect(() =>
      installCommand({ scope: 'global', source: 'a/b', skills: ['-y'], agents: ['x', 'y'] })
    ).toThrow(/begins with a dash/);
    expect(() => removeCommand('--all')).toThrow(/begins with a dash/);
  });

  it('refuses a value carrying a line break, so the shown command line is the whole one', () => {
    expect(() => removeCommand('good\nbad')).toThrow(/line break/);
  });
});

describe('trap 2: the --flag=value form is discarded silently', () => {
  it('is rejected wherever it appears', () => {
    expect(() => assertNoEqualsForm(['add', 'a/b', '--skill=foo'])).toThrow(
      /--flag=value form/
    );
    expect(() => assertNoEqualsForm(['add', 'a/b', '-s', 'foo'])).not.toThrow();
  });

  it('never appears in any command this module builds', () => {
    const built = [
      versionCommand(),
      listProbeCommand(),
      enumerateCommand('a/b'),
      installCommand({ scope: 'global', source: 'a/b', skills: ['s'], agents: ['x', 'y'] }),
      installCommand({ scope: 'project', source: 'a/b', skills: ['s'], agents: ['x', 'y'] }),
      removeCommand('s'),
      removeCommand('s', 'claude-code'),
      removeCommand('s', undefined, 'project'),
      updateCommand('s'),
      updateCommand(null),
      restoreProjectCommand()
    ];
    for (const argv of built) expect(() => assertNoEqualsForm(argv)).not.toThrow();
  });
});

describe('trap 3: the wildcard works for add and fails for remove', () => {
  it('accepts the wildcard as the only agent on an install', () => {
    expect(
      installCommand({ scope: 'global', source: 'a/b', skills: ['s'], agents: ['*'] })
    ).toEqual(['add', 'a/b', '-g', '-y', '-s', 's', '-a', '*']);
  });

  it('refuses the wildcard mixed with named agents', () => {
    expect(() =>
      installCommand({ scope: 'global', source: 'a/b', skills: ['s'], agents: ['*', 'codex'] })
    ).toThrow(/wildcard/);
  });

  it('refuses the wildcard on remove, which has no wildcard branch', () => {
    expect(() => removeCommand('s', '*')).toThrow(/Invalid agents/);
  });
});

describe('the single-agent install is refused, not merely discouraged', () => {
  it('throws for exactly one named agent', () => {
    expect(() =>
      installCommand({ scope: 'global', source: 'a/b', skills: ['s'], agents: ['claude-code'] })
    ).toThrow(/full copy instead of a symlink/);
  });

  it('allows two', () => {
    expect(() =>
      installCommand({
        scope: 'global',
        source: 'a/b',
        skills: ['s'],
        agents: ['claude-code', 'codex']
      })
    ).not.toThrow();
  });

  it('needs at least one skill and at least one agent', () => {
    expect(() =>
      installCommand({ scope: 'global', source: 'a/b', skills: [], agents: ['x', 'y'] })
    ).toThrow(/at least one skill/);
    expect(() =>
      installCommand({ scope: 'global', source: 'a/b', skills: ['s'], agents: [] })
    ).toThrow(/at least one agent/);
  });
});

describe('per-operation traits', () => {
  it('gives add and update 120 seconds and the probes 15', () => {
    expect(OPERATION_TRAITS.install.timeoutMs).toBe(120_000);
    expect(OPERATION_TRAITS.update.timeoutMs).toBe(120_000);
    expect(OPERATION_TRAITS.version.timeoutMs).toBe(15_000);
    expect(OPERATION_TRAITS.enumerate.timeoutMs).toBe(15_000);
  });

  it('marks exactly the operations that write', () => {
    const writes = Object.entries(OPERATION_TRAITS)
      .filter(([, traits]) => traits.writes)
      .map(([kind]) => kind)
      .sort();
    expect(writes).toEqual(['install', 'remove', 'restoreProject', 'update']);
  });

  it('marks the operations that cannot work offline', () => {
    expect(OPERATION_TRAITS.version.requiresNetwork).toBe(false);
    expect(OPERATION_TRAITS.remove.requiresNetwork).toBe(false);
    expect(OPERATION_TRAITS.install.requiresNetwork).toBe(true);
    expect(OPERATION_TRAITS.enumerate.requiresNetwork).toBe(true);
  });
});

describe('list --json is a failed probe, never an empty list', () => {
  it('parses the real shape and reports which of the seven fields are present', () => {
    const stdout = JSON.stringify([
      {
        name: 'govuk-style',
        path: '/Users/x/.agents/skills/govuk-style',
        scope: 'global',
        agents: ['claude-code'],
        source: 'vercel-labs/skills',
        sourceUrl: 'https://github.com/vercel-labs/skills',
        sourceType: 'github'
      }
    ]);
    const probe = parseSkillsListJson(stdout);
    expect(probe.parsed).toBe(true);
    expect(probe.entries).toBe(1);
    expect(probe.fields).toEqual([...LIST_JSON_FIELDS]);
  });

  it('treats every unexpected shape as a failure rather than zero skills', () => {
    for (const bad of ['', 'not json', '{}', '[1,2]', '[{"name":"x"}]', 'null']) {
      const probe = parseSkillsListJson(bad);
      expect(probe.parsed).toBe(false);
      expect(probe.entries).toBe(0);
      expect(probe.problem).not.toBeNull();
    }
  });

  it('an empty array is a real answer, because the user may have no skills', () => {
    const probe = parseSkillsListJson('[]');
    expect(probe.parsed).toBe(true);
    expect(probe.entries).toBe(0);
  });
});

describe('the agent names are the CLI’s, not Tortie’s', () => {
  it('knows claude-code and does not know claude', () => {
    expect(isKnownSkillsAgent('claude-code')).toBe(true);
    expect(isKnownSkillsAgent('claude')).toBe(false);
    expect(isKnownSkillsAgent('gemini-cli')).toBe(true);
    expect(isKnownSkillsAgent('gemini')).toBe(false);
    expect(isKnownSkillsAgent('qwen-code')).toBe(true);
    expect(isKnownSkillsAgent('qwen')).toBe(false);
  });

  it('carries the whole set the pinned CLI printed', () => {
    expect(SKILLS_CLI_AGENTS.length).toBe(76);
    expect(new Set(SKILLS_CLI_AGENTS).size).toBe(SKILLS_CLI_AGENTS.length);
  });
});
