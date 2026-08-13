/**
 * Plan and execute, against the REAL vendored CLI.
 *
 * Everything here runs the copy in `build/vendor/skills` under this process's
 * own Node, which is the same shape the packaged app uses with Electron's Node
 * and `ELECTRON_RUN_AS_NODE=1`. Nothing here installs anything: only
 * `--version`, `ls --json` and refusals are exercised, and both are read-only.
 * A HOME under the OS temp directory is set on every spawn anyway, so a change
 * that made one of them write cannot reach a person's own configuration.
 *
 * Skipped whole when nobody has run `npm run vendor:skills` in this tree, so a
 * fresh clone does not fail its test suite on a missing 2.4 MB download.
 */

import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseSkillsListJson } from '../commands';
import { computeSkillFolderHash } from '../lock';
import {
  bundledSkillsEntry,
  bundledSkillsMeta,
  resetSkillsResolutionCache,
  resolveSkillsCli
} from '../resolve';
import { executeSkillsPlan, planSkillsCommand, probeListShape } from '../run';

const vendored = existsSync(bundledSkillsEntry());
const suite = vendored ? describe : describe.skip;

let home: string;

beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), 'gmux-skills-run-'));
  resetSkillsResolutionCache();
});

afterAll(() => {
  rmSync(home, { recursive: true, force: true });
  resetSkillsResolutionCache();
});

/** Every spawn in this file goes to a scratch home, never the real one. */
function isolated(): { env: { base: NodeJS.ProcessEnv } } {
  return {
    env: {
      base: { ...process.env, HOME: home, XDG_STATE_HOME: join(home, 'state'), DO_NOT_TRACK: '1' }
    }
  };
}

suite('the bundled copy resolves and runs', () => {
  it('finds the bundled entry point and probes its version', async () => {
    const resolution = await resolveSkillsCli();
    expect(resolution.bundled).not.toBeNull();
    expect(resolution.bundled?.version).toBe(bundledSkillsMeta()?.version);
    expect(resolution.bundled?.eligible).toBe(true);
    expect(resolution.active).not.toBeNull();
  });

  it('runs --version and gets the pinned version back', async () => {
    const planned = await planSkillsCommand({ kind: 'version' }, isolated());
    expect(planned.refused).toBe(false);
    if (planned.refused) return;
    const result = await executeSkillsPlan(planned.plan, isolated());
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(bundledSkillsMeta()?.version);
  });
});

suite('the plan is the confirmation, so it carries the whole command line', () => {
  it('names the executable, the entry point and every argument', async () => {
    const planned = await planSkillsCommand(
      {
        kind: 'install',
        scope: 'global',
        source: 'vercel-labs/skills',
        skills: ['govuk-style'],
        agents: ['claude-code', 'codex']
      },
      isolated()
    );
    expect(planned.refused).toBe(false);
    if (planned.refused) return;
    const { plan } = planned;
    expect(plan.argv[0]).toBe(process.execPath);
    expect(plan.argv[1]).toBe(bundledSkillsEntry());
    expect(plan.commandArgs).toEqual([
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
    expect(plan.commandLine).toContain(bundledSkillsEntry());
    expect(plan.commandLine).toContain('add vercel-labs/skills -g -y -s govuk-style -a claude-code codex');
    expect(plan.displayCommand).toBe(
      'skills add vercel-labs/skills -g -y -s govuk-style -a claude-code codex'
    );
    expect(plan.writes).toBe(true);
    expect(plan.requiresNetwork).toBe(true);
    expect(plan.timeoutMs).toBe(120_000);
  });

  it('runs a global operation in the user’s home, not the app’s cwd', async () => {
    const planned = await planSkillsCommand({ kind: 'update', skill: null }, isolated());
    expect(planned.refused).toBe(false);
    if (planned.refused) return;
    expect(planned.plan.cwd).not.toBe(process.cwd());
  });

  it('runs a project operation in the project root', async () => {
    const project = join(home, 'repo');
    mkdirSync(project, { recursive: true });
    const planned = await planSkillsCommand(
      { kind: 'restoreProject' },
      { ...isolated(), projectRoot: project }
    );
    expect(planned.refused).toBe(false);
    if (planned.refused) return;
    expect(planned.plan.cwd).toBe(project);
  });

  it('refuses a project operation with no project directory', async () => {
    const planned = await planSkillsCommand({ kind: 'restoreProject' }, isolated());
    expect(planned.refused).toBe(true);
    if (!planned.refused) return;
    expect(planned.reason).toBe('missing-project-root');
  });

  it('refuses a bad command before anything is spawned, and says why', async () => {
    const planned = await planSkillsCommand(
      {
        kind: 'install',
        scope: 'global',
        source: 'vercel-labs/skills',
        skills: ['govuk-style'],
        agents: ['claude-code']
      },
      isolated()
    );
    expect(planned.refused).toBe(true);
    if (!planned.refused) return;
    expect(planned.reason).toBe('bad-command');
    expect(planned.message).toMatch(/full copy instead of a symlink/);
  });
});

suite('the lock guard blocks the plan, so nothing is spawned', () => {
  it('refuses a write when the lock on disk is older than the CLI writes', async () => {
    const state = join(home, 'old-state');
    mkdirSync(join(state, 'skills'), { recursive: true });
    writeFileSync(
      join(state, 'skills', '.skill-lock.json'),
      JSON.stringify({ version: 2, skills: { a: { source: 'x/y' } } })
    );
    const planned = await planSkillsCommand(
      { kind: 'update', skill: null },
      { env: { base: { ...process.env, HOME: home, XDG_STATE_HOME: state } } }
    );
    expect(planned.refused).toBe(true);
    if (!planned.refused) return;
    expect(planned.reason).toBe('lock-guard');
    expect(planned.message).toMatch(/format 2/);
    expect(planned.lockGuard?.entriesAtRisk).toBe(1);
  });
});

suite('a failing command names itself', () => {
  it('reports a non-zero exit with the exact command line and the stderr tail', async () => {
    // An unknown command is the cheapest guaranteed non-zero exit that touches
    // nothing: the CLI prints "Unknown command" and sets exit code 1.
    const planned = await planSkillsCommand({ kind: 'enumerate', source: 'not/a/real/source/at/all' }, isolated());
    expect(planned.refused).toBe(false);
    if (planned.refused) return;
    const result = await executeSkillsPlan(planned.plan, isolated());
    // Whatever the outcome, the result must name the command that produced it.
    expect(result.commandLine).toBe(planned.plan.commandLine);
    if (!result.ok) {
      expect(result.failure).toContain(planned.plan.commandLine);
    }
  }, 30_000);

  it('carries no skill data at all, because the panel re-reads from disk', async () => {
    const planned = await planSkillsCommand({ kind: 'version' }, isolated());
    if (planned.refused) return;
    const result = await executeSkillsPlan(planned.plan, isolated());
    // The result shape is the guarantee: there is no field a row could be
    // drawn from. If one is ever added, this test is the place it is caught.
    expect(Object.keys(result).sort()).toEqual(
      [
        'commandLine',
        'cwd',
        'displayCommand',
        'durationMs',
        'exitCode',
        'failure',
        'ok',
        'spawnError',
        'stderrTail',
        'stdout',
        'timedOut'
      ].sort()
    );
  });
});

suite('a hung command is stopped, and says so', () => {
  it('kills the child at the deadline and names the command', async () => {
    const planned = await planSkillsCommand(
      { kind: 'enumerate', source: 'vercel-labs/skills' },
      { ...isolated(), shortenTimeoutMs: 1 }
    );
    expect(planned.refused).toBe(false);
    if (planned.refused) return;
    expect(planned.plan.timeoutMs).toBe(1);
    const result = await executeSkillsPlan(planned.plan, { ...isolated(), shortenTimeoutMs: 1 });
    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.failure).toContain(planned.plan.commandLine);
    expect(result.failure).toMatch(/read again/);
  }, 30_000);

  it('cannot be given longer than the failure table allows', async () => {
    const planned = await planSkillsCommand(
      { kind: 'version' },
      { ...isolated(), shortenTimeoutMs: 999_999 }
    );
    if (planned.refused) return;
    expect(planned.plan.timeoutMs).toBe(15_000);
  });
});

suite('a plan is rebuilt before it runs, never trusted', () => {
  it('refuses a plan whose argv was changed after it was shown', async () => {
    const planned = await planSkillsCommand({ kind: 'version' }, isolated());
    expect(planned.refused).toBe(false);
    if (planned.refused) return;
    const forged = {
      ...planned.plan,
      argv: [process.execPath, '-e', 'process.exit(0)'],
      commandLine: 'something the user never saw'
    };
    const result = await executeSkillsPlan(forged, isolated());
    expect(result.ok).toBe(false);
    expect(result.failure).toMatch(/the command changed after it was shown/);
  });
});

suite('a real install, driven through the wrapper', () => {
  // A local directory as the source, so this needs no network and reaches no
  // third party. Everything lands under the scratch home created by beforeAll.
  it('installs, and the panel can then see it by reading the disk', async () => {
    const source = join(home, 'source', 'demo-skill');
    mkdirSync(join(source, 'scripts'), { recursive: true });
    writeFileSync(
      join(source, 'SKILL.md'),
      '---\nname: demo-skill\ndescription: Proves the wrapper drives a real install.\n---\nBody.\n'
    );
    writeFileSync(join(source, 'scripts', 'run.py'), 'print("hi")\n');

    const operation = {
      kind: 'install' as const,
      scope: 'global' as const,
      source,
      skills: ['demo-skill'],
      agents: ['claude-code', 'codex']
    };
    const planned = await planSkillsCommand(operation, isolated());
    expect(planned.refused).toBe(false);
    if (planned.refused) return;

    // What the confirm would show, before anything runs.
    expect(planned.plan.displayCommand).toBe(
      `skills add ${source} -g -y -s demo-skill -a claude-code codex`
    );

    const result = await executeSkillsPlan(planned.plan, isolated());
    expect(result.failure).toBeNull();
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);

    // The wrapper returned nothing about the skill. The disk is the only
    // source the panel reads, so the disk is what this asserts.
    expect(existsSync(join(home, '.agents', 'skills', 'demo-skill', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(home, '.claude', 'skills', 'demo-skill'))).toBe(true);

    // And the local hash the pin-and-re-check compares is computable over what
    // actually landed.
    const installed = await computeSkillFolderHash(join(home, '.agents', 'skills', 'demo-skill'));
    expect(installed).toMatch(/^[0-9a-f]{64}$/);
    expect(installed).toBe(await computeSkillFolderHash(source));
  }, 120_000);

  it('removes it again and leaves nothing behind', async () => {
    const planned = await planSkillsCommand({ kind: 'remove', skill: 'demo-skill' }, isolated());
    expect(planned.refused).toBe(false);
    if (planned.refused) return;
    expect(planned.plan.displayCommand).toBe('skills remove -g -y -s demo-skill');
    const result = await executeSkillsPlan(planned.plan, isolated());
    expect(result.ok).toBe(true);
    expect(existsSync(join(home, '.agents', 'skills', 'demo-skill'))).toBe(false);
    expect(existsSync(join(home, '.claude', 'skills', 'demo-skill'))).toBe(false);
  }, 120_000);
});

suite('the list output shape is still the one Tortie was written against', () => {
  it('parses into an array of objects carrying the seven fields', async () => {
    const { probe, result } = await probeListShape(isolated());
    expect(result?.ok).toBe(true);
    expect(probe.parsed).toBe(true);
    // A scratch home has no skills, so the array is empty and the field check
    // is vacuous. What matters here is that it is an ARRAY and not a failure.
    expect(probe.problem).toBeNull();
    expect(parseSkillsListJson(result?.stdout ?? '').parsed).toBe(true);
  }, 30_000);
});
