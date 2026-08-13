/**
 * The three parser traps, asserted as SHAPE rather than as an exit code.
 *
 * Every command in this file exits 0 on the real CLI. Two of them do the wrong
 * thing while doing it. That is the whole reason the guard exists: a passing
 * exit code is not evidence here, so the check has to run before a human is
 * ever asked to approve the command.
 */

import { describe, expect, it } from 'vitest';
import {
  checkPlanShape,
  formatCommandLine,
  formatShortCommand,
  quote
} from '../command-line';
import type { InstallPlan } from '../model';

function plan(argv: string[], over: Partial<InstallPlan> = {}): InstallPlan {
  return {
    id: 'p1',
    operation: 'install',
    category: 'skill',
    displayName: 'govuk-style',
    source: 'alphagov/skills',
    scope: 'global',
    executable: '/Applications/Tortie.app/Contents/MacOS/Tortie',
    cliPath:
      '/Applications/Tortie.app/Contents/Resources/skills-cli/node_modules/skills/bin/cli.mjs',
    argv,
    cwd: '/Users/gdc',
    agents: ['claude', 'codex'],
    addedEnv: {},
    ...over
  };
}

const GOOD = [
  'add',
  'alphagov/skills',
  '-g',
  '-y',
  '-s',
  'govuk-style',
  '-a',
  'claude',
  'codex'
];

describe('checkPlanShape', () => {
  it('passes the command shape the backlog table specifies', () => {
    expect(checkPlanShape(plan(GOOD))).toEqual([]);
  });

  it('trap 1: catches a source swallowed by a variadic flag', () => {
    // The source lands inside the -s group, where the parser reads it as a
    // second skill name. Nothing about the group looks wrong, so the detection
    // is the empty slot at position 1 rather than the swallowed token.
    const bad = [
      'add',
      '-g',
      '-y',
      '-s',
      'govuk-style',
      'alphagov/skills',
      '-a',
      'claude'
    ];
    expect(checkPlanShape(plan(bad)).map((p) => p.code)).toContain(
      'missing-source'
    );
  });

  it('trap 1: catches a bare word that is not inside a variadic group either', () => {
    const bad = [
      'add',
      '-g',
      'alphagov/skills',
      '-y',
      '-s',
      'govuk-style',
      '-a',
      'claude'
    ];
    const codes = checkPlanShape(plan(bad)).map((p) => p.code);
    expect(codes).toContain('missing-source');
    expect(codes).toContain('source-after-variadic');
  });

  it('trap 2: catches the --flag=value form, which the parser discards silently', () => {
    const bad = [
      'add',
      'alphagov/skills',
      '-g',
      '-y',
      '--skill=govuk-style',
      '-a',
      'claude'
    ];
    const problems = checkPlanShape(plan(bad));
    expect(problems.map((p) => p.code)).toContain('equals-form');
    expect(
      problems.some((p) => p.message.includes('--skill=govuk-style'))
    ).toBe(true);
  });

  it('trap 3: catches -a * on remove, which exits 1 rather than removing everything', () => {
    const bad = ['remove', '-g', '-y', '-s', 'govuk-style', '-a', '*'];
    expect(
      checkPlanShape(plan(bad, { operation: 'remove' })).map((p) => p.code)
    ).toContain('wildcard-remove');
  });

  it('allows -a * on add, where the CLI does have a wildcard branch', () => {
    const argv = [
      'add',
      'alphagov/skills',
      '-g',
      '-y',
      '-s',
      'govuk-style',
      '-a',
      '*'
    ];
    expect(checkPlanShape(plan(argv)).map((p) => p.code)).not.toContain(
      'wildcard-remove'
    );
  });

  it('refuses a write with no -y, which would wait on a stream that is never allocated', () => {
    const bad = [
      'add',
      'alphagov/skills',
      '-g',
      '-s',
      'govuk-style',
      '-a',
      'claude'
    ];
    expect(checkPlanShape(plan(bad)).map((p) => p.code)).toContain(
      'missing-yes'
    );
  });

  it('refuses a variadic flag with nothing after it', () => {
    const bad = ['add', 'alphagov/skills', '-g', '-y', '-s', '-a', 'claude'];
    expect(checkPlanShape(plan(bad)).map((p) => p.code)).toContain(
      'empty-variadic'
    );
  });

  it('refuses an install with no agent chosen', () => {
    expect(
      checkPlanShape(plan(GOOD, { agents: [] })).map((p) => p.code)
    ).toContain('no-agents');
  });
});

describe('formatCommandLine', () => {
  it('names the environment, the binary, the entry point and every argument', () => {
    const text = formatCommandLine(plan(GOOD));
    expect(text).toContain('ELECTRON_RUN_AS_NODE=1');
    expect(text).toContain('/Contents/MacOS/Tortie');
    expect(text).toContain('skills/bin/cli.mjs');
    expect(text).toContain('add alphagov/skills');
    // Every argument survives, in order.
    for (const token of GOOD) expect(text).toContain(token);
  });

  it('never prints a value whose variable name says it is a credential', () => {
    const text = formatCommandLine(
      plan(GOOD, {
        addedEnv: { GH_TOKEN: 'ghp_realsecret', DO_NOT_TRACK: '1' }
      })
    );
    expect(text).not.toContain('ghp_realsecret');
    expect(text).toContain('GH_TOKEN=••••');
    expect(text).toContain('DO_NOT_TRACK=1');
  });

  it('shell-quotes anything that would not survive a paste', () => {
    expect(quote('a b')).toBe("'a b'");
    expect(quote("it's")).toBe(`'it'\\''s'`);
    expect(quote('owner/repo')).toBe('owner/repo');
  });

  it('the short form is the same tokens as the full form', () => {
    const short = formatShortCommand(plan(GOOD));
    expect(short.startsWith('skills add alphagov/skills')).toBe(true);
    for (const token of GOOD) expect(short).toContain(token);
  });
});
