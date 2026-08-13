/**
 * A real install and a real remove, driven through the chain in the order the
 * product uses it.
 *
 * WHAT THIS ADDS over the wrapper's own integration test, which never installs.
 * It proves the two ends meet. A typed operation becomes argv, the CLI spawns,
 * the filesystem changes, and the SUBSTRATE READER then sees the change at the
 * path the CLI wrote to. Every link there has its own passing unit test and can
 * still be wired to the wrong neighbour: the CLI writes to `~/.agents/skills`
 * and symlinks into `~/.claude/skills`, and a reader looking anywhere else
 * would show an empty panel after a successful install.
 *
 * It also asserts the agent-name mapping against the running CLI rather than
 * against the list. `claude` is rejected outright and `claude-code` is not, so
 * this is the one place that difference is executable.
 *
 * SAFETY. HOME and XDG_STATE_HOME are set to a fresh temp directory before the
 * modules are imported, so nothing can capture the real ones first, and the
 * first case fails if HOME is not that directory. Skipped whole when nobody has
 * run `npm run vendor:skills` in this tree.
 */

import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SKILL = 'zz-tortie-roundtrip-probe';

let home: string;
let source: string;

beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), 'gmux-ctx-home-'));
  source = mkdtempSync(join(tmpdir(), 'gmux-ctx-src-'));
  process.env['HOME'] = home;
  process.env['XDG_STATE_HOME'] = join(home, 'state');
  process.env['DO_NOT_TRACK'] = '1';

  // A local directory is the one source shape that needs no network and no
  // registry, so this case runs offline and contacts nobody.
  const skill = join(source, SKILL);
  mkdirSync(skill, { recursive: true });
  writeFileSync(
    join(skill, 'SKILL.md'),
    ['---', `name: ${SKILL}`, 'description: Tortie test probe. Safe to delete.', '---', '', 'Body.', ''].join('\n')
  );
});

afterAll(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(source, { recursive: true, force: true });
});

const { bundledSkillsEntry, resetSkillsResolutionCache } = await import('../../skills/resolve');
const { executeSkillsPlan, planSkillsCommand } = await import('../../skills/run');
const { skillsCliTargets } = await import('../agent-context');
const { scanContext } = await import('../scan');

const suite = existsSync(bundledSkillsEntry()) ? describe : describe.skip;

function installOperation(): Parameters<typeof planSkillsCommand>[0] {
  return {
    kind: 'install',
    scope: 'global',
    source: join(source, SKILL),
    skills: [SKILL],
    // Three agents, never one. The CLI switches from a symlink to a full copy
    // when an add has exactly one target directory, so the length of this list
    // changes what lands on disk.
    agents: skillsCliTargets(['claude', 'codex', 'gemini'])
  };
}

suite('a skill install, end to end, against an isolated HOME', () => {
  it('is running against the scratch home, not the real one', () => {
    expect(process.env['HOME']).toBe(home);
    expect(home.startsWith(tmpdir())).toBe(true);
  });

  it('builds an argv that clears all three parser traps', async () => {
    resetSkillsResolutionCache();
    const planned = await planSkillsCommand(installOperation());
    expect(planned.refused).toBe(false);
    if (planned.refused) return;

    const args = planned.plan.commandArgs;
    // Trap 1, asserted as SHAPE rather than by exit code. A source placed after
    // `-s` or `-a` is swallowed as a name and the command still exits 0.
    expect(args[0]).toBe('add');
    expect(args[1]).toBe(join(source, SKILL));
    // Trap 2. `--skill=foo` matches nothing and is discarded, and the command
    // then runs with a wider meaning than intended.
    expect(args.some((arg) => /^--[^=]+=/.test(arg))).toBe(false);
    // The registry's vocabulary never reaches the CLI.
    expect(args).toContain('claude-code');
    expect(args).not.toContain('claude');
  });

  it('installs, and the reader sees it where the CLI actually put it', async () => {
    resetSkillsResolutionCache();
    const planned = await planSkillsCommand(installOperation());
    expect(planned.refused).toBe(false);
    if (planned.refused) return;

    const run = await executeSkillsPlan(planned.plan);
    expect(run.failure).toBeNull();
    expect(run.exitCode).toBe(0);

    const scan = await scanContext({ cwd: source, hash: 'full', env: process.env });
    const row = scan.entries.find((entry) => entry.name === SKILL);
    expect(row, 'the reader did not see the skill the CLI just installed').toBeDefined();
    expect(row?.category).toBe('skill');
    expect(row?.scope).toBe('global');
    expect(row?.summary).toContain('Tortie test probe');
    expect(row?.sourcePath.startsWith(home)).toBe(true);
    // A pin needs a hash, and `full` is the mode the re-check reads back.
    expect(row?.hash).toMatch(/^[0-9a-f]{16,}$/);
    // Three targets asked for, and the reader reports every agent that will
    // load the result. It is a superset, because a universal install lands in
    // a directory more than three agents read.
    expect(row?.agents).toEqual(expect.arrayContaining(['claude', 'codex', 'gemini']));
  }, 180_000);

  it('removes it, and the reader stops seeing it', async () => {
    resetSkillsResolutionCache();
    const planned = await planSkillsCommand({ kind: 'remove', skill: SKILL });
    expect(planned.refused).toBe(false);
    if (planned.refused) return;

    const run = await executeSkillsPlan(planned.plan);
    expect(run.failure).toBeNull();
    expect(run.exitCode).toBe(0);

    const scan = await scanContext({ cwd: source, env: process.env });
    expect(scan.entries.find((entry) => entry.name === SKILL)).toBeUndefined();
  }, 180_000);
});
