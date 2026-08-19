/**
 * Phase 90.1. The pair, and the rules that make it safe.
 *
 * The one line that is the whole phase is the third case below. Two targets
 * with an identical path and a different machine are NOT the same target.
 * Every earlier build compared the path alone and answered that they were.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isLocalTarget,
  localPathOf,
  localTarget,
  LOCAL_MACHINE_ID,
  sameTarget,
  targetKey,
  targetOfProject,
  workspaceTarget
} from '../workspace-target';

const P = '/Users/gdc/gmux';

describe('sameTarget', () => {
  it('is by value, so a fresh but equal object is the same target', () => {
    expect(sameTarget(localTarget(P), { machineId: 'local', path: P })).toBe(
      true
    );
  });

  it('treats two nulls as equal and a null and a target as different', () => {
    expect(sameTarget(null, null)).toBe(true);
    expect(sameTarget(undefined, null)).toBe(true);
    expect(sameTarget(null, localTarget(P))).toBe(false);
    expect(sameTarget(localTarget(P), null)).toBe(false);
  });

  it('separates the same path on two machines. This is the phase', () => {
    expect(sameTarget(localTarget(P), workspaceTarget(P, 'p901'))).toBe(false);
    expect(
      sameTarget(workspaceTarget(P, 'p901'), workspaceTarget(P, 'p902'))
    ).toBe(false);
  });

  it('separates two paths on one machine, which already worked', () => {
    expect(sameTarget(localTarget(P), localTarget('/Users/gdc/other'))).toBe(
      false
    );
  });
});

describe('localPathOf', () => {
  it('gives the path for this Mac, however the id was written', () => {
    expect(localPathOf(localTarget(P))).toBe(P);
    expect(localPathOf(workspaceTarget(P))).toBe(P);
    expect(localPathOf(workspaceTarget(P, null))).toBe(P);
    expect(localPathOf(workspaceTarget(P, 'local'))).toBe(P);
  });

  it('gives null for any other machine, so no local read can be built', () => {
    expect(localPathOf(workspaceTarget(P, 'p901'))).toBeNull();
    expect(localPathOf(workspaceTarget(P, 'studio'))).toBeNull();
  });

  it('gives null for no target at all', () => {
    expect(localPathOf(null)).toBeNull();
    expect(localPathOf(undefined)).toBeNull();
  });
});

describe('isLocalTarget', () => {
  it('answers for the three shapes a caller can hold', () => {
    expect(isLocalTarget(localTarget(P))).toBe(true);
    expect(isLocalTarget(workspaceTarget(P, 'p901'))).toBe(false);
    expect(isLocalTarget(null)).toBe(false);
  });
});

describe('targetKey', () => {
  it('is the BARE path for this Mac, byte for byte', () => {
    // Every key a person already has in storage is a bare path. This is what
    // keeps a remembered choice findable after the upgrade.
    expect(targetKey(localTarget(P))).toBe(P);
    expect(targetKey(workspaceTarget(P))).toBe(P);
  });

  it('puts the machine in front for any other machine', () => {
    expect(targetKey(workspaceTarget(P, 'p901'))).toBe(`p901:${P}`);
  });

  it('cannot collide, because an absolute path starts with a slash', () => {
    const ids = ['p901', 'p902', 'studio', 'mac-pro', 'a'];
    for (const id of ids) {
      expect(/^[a-z][a-z0-9-]{0,31}$/.test(id)).toBe(true);
      expect(targetKey(workspaceTarget(P, id)).startsWith('/')).toBe(false);
    }
    expect(targetKey(localTarget(P)).startsWith('/')).toBe(true);
  });
});

describe('targetOfProject', () => {
  it('maps a project with no machineId to this Mac', () => {
    expect(targetOfProject({ path: P })).toEqual({
      machineId: 'local',
      path: P
    });
  });

  it('carries a machineId when the project has one', () => {
    expect(targetOfProject({ path: P, machineId: 'p901' })).toEqual({
      machineId: 'p901',
      path: P
    });
  });

  it('answers null for no project', () => {
    expect(targetOfProject(null)).toBeNull();
    expect(targetOfProject(undefined)).toBeNull();
  });
});

describe('the local machine id has one definition', () => {
  /**
   * Main's `machines/context.ts` used to declare the string itself. It now
   * imports it from here and re-exports it, so there is one definition.
   *
   * This is asserted by READING that file rather than by importing it. A
   * shared test that imported main would pull main's whole module graph into
   * the shared TypeScript project, and `tsc -b` refuses that, which is exactly
   * the boundary the project references exist to hold.
   */
  const source = readFileSync(
    resolve(import.meta.dirname, '../../main/machines/context.ts'),
    'utf8'
  );

  it('is declared here and nowhere else', () => {
    expect(LOCAL_MACHINE_ID).toBe('local');
    expect(source).toContain(
      "import { LOCAL_MACHINE_ID } from '@shared/workspace-target';"
    );
    expect(source).toContain('export { LOCAL_MACHINE_ID };');
    expect(source).not.toMatch(/const LOCAL_MACHINE_ID\s*=/);
  });
});
