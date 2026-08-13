/**
 * The lock guard, in both directions, plus the local content hash.
 *
 * The guard's direction is the opposite of what it looks like: a NEWER lock is
 * safe and is preserved whole, and an OLDER lock is the destructive one because
 * the CLI replaces it with an empty file and every update pin in it is gone.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  GLOBAL_LOCK_VERSION,
  PROJECT_LOCK_VERSION,
  checkLockGuard,
  checkLocksBeforeWrite,
  computeSkillFolderHash,
  globalLockPath,
  projectLockPath,
  readSkillLockFile
} from '../lock';

let scratch: string;

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'gmux-skills-lock-'));
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

function writeLock(path: string, body: unknown): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, typeof body === 'string' ? body : JSON.stringify(body, null, 2));
}

describe('the versions this guard defends, and the pin file, agree', () => {
  it('matches build/skills-release.json', () => {
    const pin = JSON.parse(
      readFileSync(join(__dirname, '..', '..', '..', '..', 'build', 'skills-release.json'), 'utf8')
    ) as { lockVersions: { global: number; project: number } };
    expect(pin.lockVersions.global).toBe(GLOBAL_LOCK_VERSION);
    expect(pin.lockVersions.project).toBe(PROJECT_LOCK_VERSION);
  });
});

describe('lock paths mirror the CLI exactly', () => {
  it('honours XDG_STATE_HOME, which moves the global lock', () => {
    expect(globalLockPath({ XDG_STATE_HOME: '/x/state', HOME: '/home/u' })).toBe(
      '/x/state/skills/.skill-lock.json'
    );
  });

  it('falls back to ~/.agents/.skill-lock.json', () => {
    expect(globalLockPath({ HOME: '/home/u' })).toBe('/home/u/.agents/.skill-lock.json');
  });

  it('puts the project lock at the project root', () => {
    expect(projectLockPath('/repo')).toBe('/repo/skills-lock.json');
  });
});

describe('reading a lock reports what the CLI would DO with it', () => {
  it('an absent lock is usable, because the CLI creates one', () => {
    const read = readSkillLockFile(join(scratch, 'nope.json'));
    expect(read.present).toBe(false);
    expect(read.usable).toBe(true);
    expect(read.problem).toBeNull();
  });

  it('a well formed lock yields its entries', () => {
    const path = join(scratch, '.skill-lock.json');
    writeLock(path, {
      version: 3,
      skills: { 'govuk-style': { source: 'a/b', skillFolderHash: 'abc' } }
    });
    const read = readSkillLockFile(path);
    expect(read.usable).toBe(true);
    expect(read.version).toBe(3);
    expect(read.skills['govuk-style']?.skillFolderHash).toBe('abc');
  });

  it('a lock the CLI would discard is unusable, and says why', () => {
    const cases: [unknown, RegExp][] = [
      ['{ not json', /not valid JSON/],
      [[1, 2], /not an object/],
      [{ skills: {} }, /no numeric version/],
      [{ version: 3 }, /no skills object/]
    ];
    for (const [body, reason] of cases) {
      const path = join(scratch, `case-${Math.random()}.json`);
      writeLock(path, body);
      const read = readSkillLockFile(path);
      expect(read.usable).toBe(false);
      expect(read.problem).toMatch(reason);
    }
  });
});

describe('the guard blocks only the destructive direction', () => {
  it('allows a write when there is no lock yet', () => {
    const verdict = checkLockGuard({ scope: 'global', env: { XDG_STATE_HOME: scratch } });
    expect(verdict.safe).toBe(true);
    expect(verdict.message).toBeNull();
  });

  it('allows a write against a lock at the version the CLI writes', () => {
    writeLock(join(scratch, 'skills', '.skill-lock.json'), { version: 3, skills: {} });
    const verdict = checkLockGuard({ scope: 'global', env: { XDG_STATE_HOME: scratch } });
    expect(verdict.safe).toBe(true);
  });

  it('allows a write against a NEWER lock, which the CLI preserves whole', () => {
    writeLock(join(scratch, 'skills', '.skill-lock.json'), {
      version: 99,
      skills: { a: { source: 'x/y', somethingNew: 1 } },
      futureTopLevelKey: true
    });
    const verdict = checkLockGuard({ scope: 'global', env: { XDG_STATE_HOME: scratch } });
    expect(verdict.safe).toBe(true);
    expect(verdict.foundVersion).toBe(99);
  });

  it('blocks a write against an OLDER lock and counts what would be lost', () => {
    writeLock(join(scratch, 'skills', '.skill-lock.json'), {
      version: 2,
      skills: { a: { source: 'x/y' }, b: { source: 'x/z' }, c: {} }
    });
    const verdict = checkLockGuard({ scope: 'global', env: { XDG_STATE_HOME: scratch } });
    expect(verdict.safe).toBe(false);
    expect(verdict.foundVersion).toBe(2);
    expect(verdict.writesVersion).toBe(3);
    expect(verdict.entriesAtRisk).toBe(3);
    expect(verdict.message).toMatch(/drop the update pins for 3 skills/);
    expect(verdict.message).toMatch(/never be checked for an update again/);
  });

  it('blocks a write against a lock it cannot parse, because that is discarded too', () => {
    writeLock(join(scratch, 'skills', '.skill-lock.json'), '{ broken');
    const verdict = checkLockGuard({ scope: 'global', env: { XDG_STATE_HOME: scratch } });
    expect(verdict.safe).toBe(false);
    expect(verdict.message).toMatch(/could not be read as a skills lock file/);
  });

  it('guards the project lock on its own counter', () => {
    writeLock(join(scratch, 'skills-lock.json'), { version: 0, skills: { a: {} } });
    const verdict = checkLockGuard({ scope: 'project', projectRoot: scratch });
    expect(verdict.safe).toBe(false);
    expect(verdict.writesVersion).toBe(PROJECT_LOCK_VERSION);
  });

  it('a project write is blocked by an old GLOBAL lock too', () => {
    // The CLI's prompt-dismissal path writes the global lock whatever the scope
    // of the operation is, so the global file is at risk during a project add.
    const state = join(scratch, 'state');
    writeLock(join(state, 'skills', '.skill-lock.json'), { version: 2, skills: { a: {} } });
    const project = join(scratch, 'repo');
    mkdirSync(project, { recursive: true });
    const verdict = checkLocksBeforeWrite({
      scope: 'project',
      projectRoot: project,
      env: { XDG_STATE_HOME: state }
    });
    expect(verdict.safe).toBe(false);
    expect(verdict.path).toBe(join(state, 'skills', '.skill-lock.json'));
  });

  it('a project write is allowed when both locks are fine', () => {
    const state = join(scratch, 'state-ok');
    writeLock(join(state, 'skills', '.skill-lock.json'), { version: 3, skills: {} });
    const project = join(scratch, 'repo-ok');
    mkdirSync(project, { recursive: true });
    writeLock(join(project, 'skills-lock.json'), { version: 1, skills: {} });
    expect(
      checkLocksBeforeWrite({
        scope: 'project',
        projectRoot: project,
        env: { XDG_STATE_HOME: state }
      }).safe
    ).toBe(true);
  });

  it('names the exact file in every blocking message', () => {
    const path = join(scratch, 'skills', '.skill-lock.json');
    writeLock(path, { version: 1, skills: {} });
    const verdict = checkLockGuard({ scope: 'global', env: { XDG_STATE_HOME: scratch } });
    expect(verdict.safe).toBe(false);
    expect(verdict.message).toContain(path);
  });
});

describe('the local content hash mirrors the CLI’s own function', () => {
  function makeSkill(dir: string): void {
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), '---\nname: demo\n---\nbody\n');
    writeFileSync(join(dir, 'scripts', 'run.py'), 'print("hi")\n');
  }

  it('is stable across two reads of the same folder', async () => {
    const dir = join(scratch, 'demo');
    makeSkill(dir);
    const first = await computeSkillFolderHash(dir);
    const second = await computeSkillFolderHash(dir);
    expect(first).not.toBeNull();
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when any byte of any file changes', async () => {
    const dir = join(scratch, 'demo');
    makeSkill(dir);
    const before = await computeSkillFolderHash(dir);
    writeFileSync(join(dir, 'scripts', 'run.py'), 'print("bye")\n');
    expect(await computeSkillFolderHash(dir)).not.toBe(before);
  });

  it('changes when a file is added, which is how a script sneaks in', async () => {
    const dir = join(scratch, 'demo');
    makeSkill(dir);
    const before = await computeSkillFolderHash(dir);
    writeFileSync(join(dir, 'scripts', 'extra.sh'), 'echo hi\n');
    expect(await computeSkillFolderHash(dir)).not.toBe(before);
  });

  it('ignores .git and node_modules, exactly as the CLI does', async () => {
    const dir = join(scratch, 'demo');
    makeSkill(dir);
    const before = await computeSkillFolderHash(dir);
    mkdirSync(join(dir, '.git'), { recursive: true });
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    mkdirSync(join(dir, 'node_modules', 'x'), { recursive: true });
    writeFileSync(join(dir, 'node_modules', 'x', 'index.js'), 'module.exports=1\n');
    expect(await computeSkillFolderHash(dir)).toBe(before);
  });

  it('is the documented algorithm: sha256 over sorted path then bytes', async () => {
    const dir = join(scratch, 'demo');
    makeSkill(dir);
    // Recomputed here the long way, so a future edit to the walk or the sort
    // order fails this test instead of silently changing every recorded hash.
    const { createHash } = await import('node:crypto');
    const expected = createHash('sha256');
    for (const relative of ['SKILL.md', 'scripts/run.py'].sort((a, b) => a.localeCompare(b))) {
      expected.update(relative);
      expected.update(readFileSync(join(dir, relative)));
    }
    expect(await computeSkillFolderHash(dir)).toBe(expected.digest('hex'));
  });

  it('is null for a folder that cannot be read, which is never "unchanged"', async () => {
    expect(await computeSkillFolderHash(join(scratch, 'missing'))).toBeNull();
  });
});
