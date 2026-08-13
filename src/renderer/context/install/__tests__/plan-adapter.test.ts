/**
 * The seam that was missing, and the guard that keeps it honest.
 *
 * `InstallPlan`'s own comment said "Main builds this", and main built
 * `SkillsPlan` instead: different field names, different argv slicing, no
 * `agents`, no `addedEnv`. Nothing in the tree converted one to the other, so
 * the confirm had no producer.
 *
 * Two renderings of one command line now exist, and the second half of this
 * file is the rule that they can never disagree. A confirm that shows one thing
 * while another runs is worse than no confirm.
 */

import { describe, expect, it } from 'vitest';
import type { SkillsPlan } from '@shared/skills';
import { formatCommandLine, formatShortCommand } from '../../surface/command-line';
import { commandMismatch, planTokens, toInstallPlan } from '../plan-adapter';

const BUNDLED = '/Applications/Tortie.app/Contents/Resources/skills-cli/node_modules/skills/bin/cli.mjs';
const ELECTRON = '/Applications/Tortie.app/Contents/MacOS/Tortie';

function bundledPlan(commandArgs: string[], operation: SkillsPlan['operation']): SkillsPlan {
  const argv = [ELECTRON, BUNDLED, ...commandArgs];
  return {
    operation,
    kind: operation.kind as SkillsPlan['kind'],
    label: 'Install',
    copy: {
      source: 'bundled',
      path: BUNDLED,
      version: '1.5.22',
      eligible: true,
      refusedBecause: null,
      invocation: {
        bin: ELECTRON,
        prefixArgs: [BUNDLED],
        env: { ELECTRON_RUN_AS_NODE: '1' }
      }
    },
    argv,
    commandArgs,
    cwd: '/Users/x',
    commandLine: argv.join(' '),
    displayCommand: `skills ${commandArgs.join(' ')}`,
    timeoutMs: 120_000,
    requiresNetwork: true,
    writes: true,
    lockGuard: null
  };
}

const INSTALL_ARGS = [
  'add',
  'vercel-labs/skills',
  '-g',
  '-y',
  '-s',
  'find-skills',
  '-a',
  'claude-code',
  'codex'
];

describe('adapting a bundled install', () => {
  const { plan, mismatch } = toInstallPlan(
    bundledPlan(INSTALL_ARGS, {
      kind: 'install',
      scope: 'global',
      source: 'vercel-labs/skills',
      skills: ['find-skills'],
      agents: ['claude-code', 'codex']
    }),
    { displayName: 'find-skills' }
  );

  it('splits the executable, the entry point and the arguments', () => {
    expect(plan.executable).toBe(ELECTRON);
    expect(plan.cliPath).toBe(BUNDLED);
    expect(plan.argv).toEqual(INSTALL_ARGS);
  });

  it('carries the fields the gate reasons about', () => {
    expect(plan.operation).toBe('install');
    expect(plan.source).toBe('vercel-labs/skills');
    expect(plan.scope).toBe('global');
    expect(plan.agents).toEqual(['claude-code', 'codex']);
    expect(plan.addedEnv).toEqual({ ELECTRON_RUN_AS_NODE: '1' });
  });

  it('agrees with the command line main would run', () => {
    expect(mismatch).toBeNull();
  });

  it('renders a line that carries every token that will be spawned', () => {
    const line = formatCommandLine(plan);
    for (const token of planTokens(plan)) expect(line).toContain(token);
    expect(line).toContain('ELECTRON_RUN_AS_NODE=1');
    expect(formatShortCommand(plan)).toBe(`skills ${INSTALL_ARGS.join(' ')}`);
  });
});

describe('adapting a copy found on PATH', () => {
  const onPath: SkillsPlan = {
    ...bundledPlan(INSTALL_ARGS, {
      kind: 'install',
      scope: 'global',
      source: 'vercel-labs/skills',
      skills: ['find-skills'],
      agents: ['claude-code', 'codex']
    }),
    copy: {
      source: 'installed',
      path: '/usr/local/bin/skills',
      version: '1.6.0',
      eligible: true,
      refusedBecause: null,
      invocation: { bin: '/usr/local/bin/skills', prefixArgs: [], env: {} }
    },
    argv: ['/usr/local/bin/skills', ...INSTALL_ARGS],
    commandLine: ['/usr/local/bin/skills', ...INSTALL_ARGS].join(' ')
  };

  const { plan, mismatch } = toInstallPlan(onPath, { displayName: 'find-skills' });

  it('has no entry point, and agrees anyway', () => {
    expect(plan.cliPath).toBe('');
    expect(mismatch).toBeNull();
  });

  it('does not print an empty argument in the command line', () => {
    const line = formatCommandLine(plan);
    expect(line).not.toContain("''");
    expect(line).toContain('/usr/local/bin/skills');
  });
});

describe('the two renderings can never disagree', () => {
  const base = bundledPlan(INSTALL_ARGS, {
    kind: 'install',
    scope: 'global',
    source: 'vercel-labs/skills',
    skills: ['find-skills'],
    agents: ['claude-code', 'codex']
  });
  const { plan } = toInstallPlan(base, {});

  it('reports a mismatch when a token is added to what would be shown', () => {
    const tampered = { ...plan, argv: [...plan.argv, '--copy'] };
    const problem = commandMismatch(base, tampered);
    expect(problem).not.toBeNull();
    expect(problem).toContain('--copy');
    expect(problem).toContain('Nothing ran.');
  });

  it('reports a mismatch when the entry point is dropped', () => {
    const problem = commandMismatch(base, { ...plan, cliPath: '' });
    expect(problem).not.toBeNull();
  });

  it('reports a mismatch when the executable is swapped', () => {
    const problem = commandMismatch(base, { ...plan, executable: '/bin/sh' });
    expect(problem).not.toBeNull();
  });
});

describe('remove and update', () => {
  it('carries the skill as the source and no agents for a global remove', () => {
    const { plan, mismatch } = toInstallPlan(
      bundledPlan(['remove', '-g', '-y', '-s', 'find-skills'], {
        kind: 'remove',
        skill: 'find-skills'
      })
    );
    expect(plan.operation).toBe('remove');
    expect(plan.source).toBe('find-skills');
    expect(plan.agents).toEqual([]);
    expect(mismatch).toBeNull();
  });

  it('carries one agent for a per-agent remove', () => {
    const { plan } = toInstallPlan(
      bundledPlan(['remove', '-g', '-y', '-s', 'find-skills', '-a', 'claude-code'], {
        kind: 'remove',
        skill: 'find-skills',
        agent: 'claude-code'
      })
    );
    expect(plan.agents).toEqual(['claude-code']);
  });

  it('adapts an update', () => {
    const { plan, mismatch } = toInstallPlan(
      bundledPlan(['update', '-g', '-y', 'find-skills'], {
        kind: 'update',
        skill: 'find-skills'
      })
    );
    expect(plan.operation).toBe('update');
    expect(mismatch).toBeNull();
  });
});
