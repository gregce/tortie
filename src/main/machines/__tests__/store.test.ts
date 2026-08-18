/**
 * When `machines.json` is read, and what a broken one costs.
 *
 * The headline is the read count. The file is read at boot, on an explicit
 * reload and on a watcher debounce, and nowhere else. A rule like that is worth
 * nothing unless something counts, so the store counts its own disk reads and
 * the first block below asserts that reading the machines from memory never
 * moves the count.
 *
 * The second property is the write. Tortie writes this file, unlike
 * `agents.json`, so a row Tortie writes must be a row Tortie can read back. The
 * write path reads the file again straight afterwards, and the tests assert the
 * round trip rather than the bytes.
 *
 * Everything here runs against real files in a temporary directory. The only
 * thing mocked is Electron's userData path.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: () => Buffer.from(''),
    decryptString: () => ''
  }
}));

const {
  addMachineRow,
  currentMachines,
  loadMachines,
  machineColorOf,
  machineFieldsOf,
  machineLabelOf,
  machineRow,
  machinesDiskReads,
  machinesPath,
  onMachinesChanged,
  reloadMachines,
  removeMachineRow,
  resetMachinesStoreForTests
} = await import('../store');
const { ensureConfigDir } = await import('../../config/paths');

const POP = {
  id: 'pop-os',
  label: 'Pop OS',
  color: 'cyan' as const,
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 22,
  remoteTmuxPath: '/usr/bin/tmux'
};

function writeFile(value: unknown): void {
  ensureConfigDir();
  writeFileSync(
    machinesPath(),
    typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    'utf8'
  );
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-machines-store-'));
  mkdirSync(join(userData, 'gmux'), { recursive: true });
  resetMachinesStoreForTests();
});

afterEach(() => {
  resetMachinesStoreForTests();
  rmSync(userData, { recursive: true, force: true });
});

describe('the read count', () => {
  it('does not move when the machines are read from memory', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const after = machinesDiskReads();
    currentMachines();
    machineRow('pop-os');
    currentMachines().rows.map(machineFieldsOf);
    expect(machinesDiskReads()).toBe(after);
  });

  it('moves once per explicit reload', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const after = machinesDiskReads();
    reloadMachines();
    expect(machinesDiskReads()).toBe(after + 1);
  });
});

describe('the failure direction', () => {
  it('reports no problem at all when there is no file', () => {
    const snap = loadMachines('boot');
    expect(snap.present).toBe(false);
    expect(snap.rows).toEqual([]);
    expect(snap.problems).toEqual([]);
  });

  it('reports one problem for a file that is not JSON', () => {
    writeFile('{ not json');
    const snap = loadMachines('boot');
    expect(snap.rows).toEqual([]);
    expect(snap.problems).toHaveLength(1);
    expect(snap.problems[0]?.field).toBe('file');
  });

  it('reports one problem for a file over the size limit', () => {
    writeFile(
      JSON.stringify({
        schema: 1,
        machines: [{ ...POP, label: 'x'.repeat(70 * 1024) }]
      })
    );
    const snap = loadMachines('boot');
    expect(snap.rows).toEqual([]);
    expect(snap.problems[0]?.message).toContain('None of it was used');
  });

  it('keeps the good rows and reports the dropped one', () => {
    writeFile({
      schema: 1,
      machines: [POP, { id: 'broken', host: '-oProxyCommand=x' }]
    });
    const snap = loadMachines('boot');
    expect(snap.rows.map((r) => r.id)).toEqual(['pop-os']);
    expect(snap.problems).toHaveLength(1);
    expect(snap.problems[0]?.field).toContain('host');
  });
});

describe('the row helpers', () => {
  it('reads the five execution bearing fields, with null for the absent ones', () => {
    expect(machineFieldsOf({ id: 'bare', host: 'a.example' })).toEqual({
      host: 'a.example',
      user: null,
      port: null,
      remoteTmuxPath: null,
      // Phase 83. A row nobody accepted a version for reads null, which is
      // every row in every file this product has written so far.
      acceptedTmuxVersion: null
    });
  });

  it('reads the version a person accepted when the row carries one', () => {
    expect(
      machineFieldsOf({
        id: 'bare',
        host: 'a.example',
        acceptedTmuxVersion: '3.9a'
      }).acceptedTmuxVersion
    ).toBe('3.9a');
  });

  it('shows the label when there is one, and the address when there is not', () => {
    expect(machineLabelOf(POP)).toBe('Pop OS');
    expect(machineLabelOf({ id: 'bare', host: 'a.example' })).toBe('a.example');
  });

  it('defaults the colour to blue', () => {
    expect(machineColorOf(POP)).toBe('cyan');
    expect(machineColorOf({ id: 'bare', host: 'a.example' })).toBe('blue');
  });
});

describe('the two writes', () => {
  it('adds a machine and reads it back with no problems', () => {
    loadMachines('boot');
    const snap = addMachineRow(POP);
    expect(snap.problems).toEqual([]);
    expect(snap.rows).toEqual([POP]);
    expect(snap.present).toBe(true);
    expect(loadMachines('reload').rows).toEqual([POP]);
  });

  it('keeps the machines that were already there', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const snap = addMachineRow({ id: 'attic', host: 'attic.example' });
    expect(snap.rows.map((r) => r.id)).toEqual(['pop-os', 'attic']);
  });

  it('removes one machine and leaves the rest', () => {
    writeFile({
      schema: 1,
      machines: [POP, { id: 'attic', host: 'attic.example' }]
    });
    loadMachines('boot');
    const snap = removeMachineRow('pop-os');
    expect(snap.rows.map((r) => r.id)).toEqual(['attic']);
  });

  it('writes a file with no key for an absent field', () => {
    loadMachines('boot');
    addMachineRow({ id: 'bare', host: 'a.example' });
    const snap = loadMachines('reload');
    expect(snap.rows[0]).toEqual({ id: 'bare', host: 'a.example' });
  });
});

describe('the change listener', () => {
  it('fires when the result changes and not when it does not', () => {
    writeFile({ schema: 1, machines: [POP] });
    let calls = 0;
    const off = onMachinesChanged(() => {
      calls += 1;
    });
    loadMachines('boot');
    expect(calls).toBe(1);
    loadMachines('reload');
    expect(calls).toBe(1);
    writeFile({ schema: 1, machines: [{ ...POP, host: 'moved.example' }] });
    loadMachines('reload');
    expect(calls).toBe(2);
    off();
    writeFile({ schema: 1, machines: [] });
    loadMachines('reload');
    expect(calls).toBe(2);
  });
});
