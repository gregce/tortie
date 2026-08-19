/**
 * Phase 94 — a session started in a remote tab runs on that machine, in that
 * tab's folder.
 *
 * ## The two defects these cases pin
 *
 * ITEM 1, THE FOLDER. A create started from a tab that is already on another
 * machine sent no working directory. The sheet drops a Directory value that
 * equals the project path, so nothing arrived, that machine's own tmux fell
 * back to the home directory, the session really was in the home directory,
 * and the re-home then opened a second tab named after the home folder.
 *
 * ITEM 2, THE MACHINE. A create that named no machine, started in a tab whose
 * files are on a machine, ran on THIS Mac at a path only that machine has.
 *
 * ## What this file proves
 *
 *  1. The pure folder rule over every row of the case table, both returned
 *     fields.
 *  2. That a create with no folder at all still returns NO `cwd` key, which is
 *     Phase 84 item 5 and is a different thing from a `cwd` that is undefined.
 *  3. Two shapes a later sheet could compose, so neither can send one machine's
 *     path to a different machine or invent a folder out of an empty string.
 *  4. That the create rule and the re-home rule agree, which is why
 *     `remote-rehome.ts` is not changed in this phase.
 *  5. The machine rule over its four inputs, including the local create every
 *     build so far makes.
 *  6. That both rules are read inside `createSession`, the machine rule above
 *     the capture refusal read and the folder rule inside the remote branch, so
 *     every create on this Mac still reaches the local path below them.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createMachineIdFor,
  remoteCreateFolders,
  type RemoteCreateFolders
} from '../launch-plan';

vi.mock('electron', () => ({
  app: { getPath: () => '', getVersion: () => '0.48.1' }
}));

const { remoteProjectPathFor } = await import('../../machines/remote-rehome');

const M = 'macpro';

/** The one read of core.ts, shared by the two wiring cases at the end. */
const coreSource = (): string =>
  readFileSync(resolve(import.meta.dirname, '../core.ts'), 'utf8');

describe('remoteCreateFolders, one row per case of the table', () => {
  it('A. a remote tab with the Directory field untouched runs in that tab', () => {
    // THIS IS THE FIX. Before it, `cwd` was absent here and the machine put the
    // session in its own home directory.
    const folders = remoteCreateFolders({
      machineId: M,
      projectMachineId: M,
      projectPath: '/far/proj'
    });
    expect(folders.projectPath).toBe('/far/proj');
    expect(folders.cwd).toBe('/far/proj');
  });

  it('B. a remote tab with a subfolder typed runs in the subfolder', () => {
    const folders = remoteCreateFolders({
      machineId: M,
      projectMachineId: M,
      projectPath: '/far/proj',
      cwd: '/far/proj/sub'
    });
    expect(folders.projectPath).toBe('/far/proj');
    expect(folders.cwd).toBe('/far/proj/sub');
  });

  it('C. a remote tab whose field a person cleared runs in that tab', () => {
    // The sheet cannot tell a cleared field from an untouched one, so this
    // arrives at main exactly as case A does. It is written out on its own
    // because a person who clears the field used to get that machine's home
    // directory. The tab's folder is a real folder over there and it is the
    // folder the person is looking at, so it is the answer.
    const folders = remoteCreateFolders({
      machineId: M,
      projectMachineId: M,
      projectPath: '/far/proj',
      cwd: ''
    });
    expect(folders.projectPath).toBe('/far/proj');
    expect(folders.cwd).toBe('/far/proj');
  });

  it('D. a local tab with a machine chosen and a folder typed sends it', () => {
    const folders = remoteCreateFolders({
      machineId: M,
      projectPath: '/here/proj',
      cwd: '/far/typed'
    });
    expect(folders.projectPath).toBe('/far/typed');
    expect(folders.cwd).toBe('/far/typed');
  });

  it('E. a local tab with the field cleared sends NO working directory', () => {
    // PHASE 84 ITEM 5, AND IT IS THE ROW TO CHECK FIRST. `'cwd' in folders` is
    // asserted rather than `folders.cwd === undefined`, because absent and
    // present-and-undefined are two different things at the `remoteCreate`
    // boundary: one sends no `-c` and the other would send `-c ''`.
    const folders = remoteCreateFolders({
      machineId: M,
      projectPath: '/here/proj'
    });
    expect(folders.projectPath).toBe('');
    expect('cwd' in folders).toBe(false);
  });

  it('E. the same create never reads the project path of this Mac', () => {
    // The fallback Phase 84 deleted is not restored. Every path this Mac holds
    // is spelled with the same marker string, and none of it comes back.
    const folders = remoteCreateFolders({
      machineId: M,
      projectPath: '/on-this-mac/only'
    });
    expect(JSON.stringify(folders)).not.toContain('on-this-mac');
  });

  it('F. a tab on machine A bound for machine B sends nothing of A', () => {
    // The Machine field is disabled in a remote tab today, so this cannot be
    // composed. It is asserted so that a sheet which allows it later cannot
    // silently send machine A's path to machine B.
    const folders = remoteCreateFolders({
      machineId: 'beta',
      projectMachineId: 'alpha',
      projectPath: '/on/alpha',
      cwd: '/on/beta/typed'
    });
    expect(folders.projectPath).toBe('/on/beta/typed');
    expect(folders.cwd).toBe('/on/beta/typed');
  });

  it('G. a tab on machine A bound for machine B with no folder sends none', () => {
    const folders = remoteCreateFolders({
      machineId: 'beta',
      projectMachineId: 'alpha',
      projectPath: '/on/alpha'
    });
    expect(folders.projectPath).toBe('');
    expect('cwd' in folders).toBe(false);
  });
});

describe('remoteCreateFolders, the shapes that are not rows of the table', () => {
  it('a relative string typed in a local tab is sent as it stands', () => {
    // A typed folder wins whatever it looks like. The machine answers for its
    // own paths and this Mac does not guess on its behalf.
    const folders = remoteCreateFolders({
      machineId: M,
      projectPath: '/here/proj',
      cwd: 'rel/path'
    });
    expect(folders.projectPath).toBe('rel/path');
    expect(folders.cwd).toBe('rel/path');
  });

  it('an empty project path on the matching machine invents nothing', () => {
    const folders = remoteCreateFolders({
      machineId: M,
      projectMachineId: M,
      projectPath: ''
    });
    expect(folders.projectPath).toBe('');
    expect('cwd' in folders).toBe(false);
  });

  it('a relative project path on the matching machine sends no folder', () => {
    const folders = remoteCreateFolders({
      machineId: M,
      projectMachineId: M,
      projectPath: 'not/absolute'
    });
    expect(folders.projectPath).toBe('not/absolute');
    expect('cwd' in folders).toBe(false);
  });
});

describe('createMachineIdFor, the machine a create runs on', () => {
  it('a create that names a machine runs on it', () => {
    expect(createMachineIdFor({ machineId: M })).toBe(M);
  });

  it('a named machine wins over the tab, which is what the sheet sends', () => {
    expect(
      createMachineIdFor({ machineId: 'beta', projectMachineId: 'alpha' })
    ).toBe('beta');
  });

  it('a create with no machine in a remote tab runs on the tab machine', () => {
    // ITEM 2. This is the agent board and the per-agent hotkeys. Before the
    // fix this answered undefined and the session started on this Mac.
    expect(createMachineIdFor({ projectMachineId: M })).toBe(M);
  });

  it('a create that says local in a remote tab runs on the tab machine', () => {
    // A caller asking for this Mac in a tab whose folder is on another computer
    // is asking for a session in a folder this Mac does not have. No surface in
    // this build means to ask for that.
    expect(createMachineIdFor({ machineId: 'local', projectMachineId: M })).toBe(
      M
    );
  });

  it('a create in a tab on this Mac stays on this Mac', () => {
    // The regression guard. Every local create in every build so far is this
    // row, and it must answer undefined.
    expect(createMachineIdFor({})).toBeUndefined();
    expect(createMachineIdFor({ machineId: 'local' })).toBeUndefined();
    expect(
      createMachineIdFor({ machineId: 'local', projectMachineId: 'local' })
    ).toBeUndefined();
    expect(createMachineIdFor({ projectMachineId: 'local' })).toBeUndefined();
  });
});

describe('the create rule and the re-home rule agree', () => {
  /**
   * What that machine reports for a session, given what Tortie sent it.
   *
   * tmux puts the pane in the folder `-c` names, and falls back to the home
   * directory of the account the connection signed in as when no `-c` is
   * composed. `remote-smoke.ts` step 17a measures exactly that against the
   * machine's own `machine-facts` answer, and this is the same rule in one
   * line so the two rules can be joined here without a machine.
   */
  const asReportedBy = (home: string, folders: RemoteCreateFolders): string =>
    folders.cwd !== undefined && folders.cwd.length > 0 ? folders.cwd : home;

  it('the folder the create sends is the folder the re-home keeps', () => {
    // This is the executable form of the reason `remote-rehome.ts` is not
    // changed in this phase, and it is the operator's whole report in four
    // lines. The create decides the folders, the machine reports where the
    // session really is, and the re-home reads that report. After the fix the
    // three agree and no second tab is written. Before it, the machine reported
    // its own home, the re-home moved the row there, and he got a tab named
    // after his home folder.
    const folders = remoteCreateFolders({
      machineId: M,
      projectMachineId: M,
      projectPath: '/far/proj'
    });
    const reported = asReportedBy('/Users/gdc', folders);
    expect(reported).toBe('/far/proj');
    expect(remoteProjectPathFor(folders.projectPath, reported)).toBe(
      '/far/proj'
    );
  });

  it('a subfolder create still leaves the row on its own project', () => {
    const folders = remoteCreateFolders({
      machineId: M,
      projectMachineId: M,
      projectPath: '/far/proj',
      cwd: '/far/proj/sub'
    });
    expect(remoteProjectPathFor(folders.projectPath, folders.cwd ?? '')).toBe(
      '/far/proj'
    );
  });

  it('the parent case the defect produced still moves the row', () => {
    // The rule is not changed. A reported parent is a measurement from that
    // machine and the recorded path is Tortie's claim, so the machine wins.
    // This is the row the defect wrote, and it stays right so that the next
    // occurrence of a wrong folder is visible instead of hidden.
    expect(remoteProjectPathFor('/Users/gdc/dev/test-tortie', '/Users/gdc')).toBe(
      '/Users/gdc'
    );
  });
});

describe('both rules are read in createSession, in the right order', () => {
  it('the machine rule is read above the capture refusal and the branch', () => {
    // There is no way to observe "this line is above that one" by calling the
    // function, so the source is read as text, which is the shape
    // `capture-refusal-wiring.test.ts` already uses.
    const source = coreSource();
    expect(source.split('createMachineIdFor(input)').length - 1).toBe(1);
    const decide = source.indexOf('const machineId = createMachineIdFor(input);');
    const refusal = source.indexOf(
      'const captureRefused = captureRefusedOnMachine(input.agent, machineId);'
    );
    const branch = source.indexOf('if (machineId !== undefined) {');
    expect(decide).toBeGreaterThan(-1);
    expect(refusal).toBeGreaterThan(decide);
    expect(branch).toBeGreaterThan(refusal);
  });

  it('the folder rule is read inside the remote branch and nowhere else', () => {
    const source = coreSource();
    expect(source.split('remoteCreateFolders({').length - 1).toBe(1);
    const branch = source.indexOf('if (machineId !== undefined) {');
    const call = source.indexOf('const folders = remoteCreateFolders({');
    expect(branch).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(branch);
  });

  it('createSession reads the machine from one value and not from the input', () => {
    // Every read inside the method is the decided value. `input.machineId` may
    // still appear in other methods of this file, so the slice read here is the
    // method itself, from its own signature to the local branch below it.
    const source = coreSource();
    const start = source.indexOf(
      'async createSession(input: CreateSessionInput): Promise<Session> {'
    );
    const end = source.indexOf('await tmux.installUserPath();', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);
    const reads = body
      .split('\n')
      .filter((line) => line.includes('input.machineId'))
      .filter((line) => !line.trimStart().startsWith('//'));
    expect(reads).toEqual([]);
  });
});
