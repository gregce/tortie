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
  rootKeyOf,
  sameTarget,
  targetKey,
  targetOfProject,
  targetOfRootKey,
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

// ---------------------------------------------------------------------------
// Phase 99. The root key the quick open palette and the ranking worker share
// ---------------------------------------------------------------------------
//
// THE TRAP THIS PAIR EXISTS FOR. A file at `/Users/gdc/gmux/README.md` on this
// Mac and a file at the same path on another machine are DIFFERENT files.
// Before Phase 99 the palette held one index and one recents entry for both, so
// a name typed on one tab could rank, and then open, the other computer's file.

describe('rootKeyOf', () => {
  it('leaves a folder on this Mac as its own path, byte for byte', () => {
    // This is what makes every key a build before Phase 99 wrote still the key
    // this build composes. Nothing is migrated because nothing moved.
    expect(rootKeyOf(localTarget(P))).toBe(P);
    expect(rootKeyOf(workspaceTarget(P))).toBe(P);
    expect(rootKeyOf(workspaceTarget(P, null))).toBe(P);
    expect(rootKeyOf(workspaceTarget(P, LOCAL_MACHINE_ID))).toBe(P);
  });

  it('puts the machine in front of a folder on another machine', () => {
    expect(rootKeyOf(workspaceTarget(P, 'studio'))).toBe(`machine:studio:${P}`);
  });

  it('gives the same path on two computers two different keys', () => {
    const here = rootKeyOf(localTarget(P));
    const there = rootKeyOf(workspaceTarget(P, 'studio'));
    expect(here).not.toBe(there);
  });

  it('cannot be confused with a path, because a path begins with a slash', () => {
    expect(rootKeyOf(localTarget(P)).startsWith('machine:')).toBe(false);
    expect(rootKeyOf(workspaceTarget(P, 'studio')).startsWith('/')).toBe(false);
  });
});

describe('targetOfRootKey', () => {
  it('reads a bare path as a folder on this Mac', () => {
    expect(targetOfRootKey(P)).toEqual({ machineId: LOCAL_MACHINE_ID, path: P });
  });

  it('round trips both kinds of target', () => {
    for (const target of [
      localTarget(P),
      workspaceTarget(P, 'studio'),
      workspaceTarget('/home/greg/api', 'a-b-1')
    ]) {
      expect(targetOfRootKey(rootKeyOf(target))).toEqual(target);
    }
  });

  it('round trips a path holding a colon', () => {
    // The machine id is the text up to the FIRST colon after the prefix and the
    // path is all of the rest, so a folder called `a:b` survives. A machine id
    // cannot hold a colon: MACHINE_ID_PATTERN is ^[a-z][a-z0-9-]{0,31}$.
    const target = workspaceTarget('/home/greg/a:b/c', 'studio');
    expect(rootKeyOf(target)).toBe('machine:studio:/home/greg/a:b/c');
    expect(targetOfRootKey(rootKeyOf(target))).toEqual(target);
  });

  it('reads a prefixed key with no path as a folder on this Mac', () => {
    // Nothing in this product composes such a string. Reading it as a machine
    // with an empty path would hand a caller a folder that is nowhere, so it is
    // read as a local path under its whole text instead.
    expect(targetOfRootKey('machine:studio')).toEqual({
      machineId: LOCAL_MACHINE_ID,
      path: 'machine:studio'
    });
    expect(targetOfRootKey('machine::/x')).toEqual({
      machineId: LOCAL_MACHINE_ID,
      path: 'machine::/x'
    });
  });
});

describe('the recents key both ends compose', () => {
  /**
   * The key is `${rootKey} ${relPath}`, and the whole point of Phase 99 is that
   * the two below are different strings. The renderer writes them and the
   * ranking worker in main reads them, and neither may compose its own shape.
   */
  const recentKey = (target: { machineId: string; path: string }, rel: string) =>
    `${rootKeyOf(target)} ${rel}`;

  it('separates one relative path under one absolute path on two computers', () => {
    const here = recentKey(localTarget(P), 'README.md');
    const there = recentKey(workspaceTarget(P, 'studio'), 'README.md');
    expect(here).toBe('/Users/gdc/gmux README.md');
    expect(there).toBe('machine:studio:/Users/gdc/gmux README.md');
    expect(here).not.toBe(there);
  });

  it('splits at the first space, so a relative path may hold spaces', () => {
    const key = recentKey(workspaceTarget(P, 'studio'), 'src/a b.ts');
    const at = key.indexOf(' ');
    expect(key.slice(0, at)).toBe(`machine:studio:${P}`);
    expect(key.slice(at + 1)).toBe('src/a b.ts');
  });
});
