/**
 * Phase 336: `savesInProjects`, the renderer's copy of "may a project opened on
 * this machine be saved in" (build/p336/SPEC.md D18 and D21, condition 121).
 *
 * THE RULE IS THE CONFIRMATION, AND NEVER A FIELD OF THE ROW. A project a
 * person opened on a confirmed machine is a folder Tortie may save under, with
 * nothing asked (research 138 section 9). A row nobody confirmed, and a row
 * whose details changed after it was confirmed, saves nothing until a person
 * confirms it again. So the view's field is true exactly when the gate says
 * `confirmed`, and nothing written into machines.json can turn it on.
 *
 * Two halves, because each can be broken without the other:
 *
 *  - THE PURE HALF drives `machineStateViewOf` over rows built by hand. It is
 *    what fails if the field is read off the row's `writeRoot` (the ablation
 *    the gate names, condition 121a) or set the same on both branches.
 *  - THE LIVE HALF drives `currentMachineStates` over a real machines.json and
 *    the real confirmation record in a scratch profile: confirmed reads true,
 *    a port edited on disk reads false with the gate's own `changed`, and the
 *    edit undone reads true again with NO new confirmation, which is D21's "a
 *    changed machine writes nothing until confirmed again" and its converse.
 *
 * Nothing here starts a process. The keychain is a stand in that seals with a
 * marker, the precedent of ./ipc.test.ts.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineLinkFacts } from '../control-plane';

let userData = '';
const MARKER = ' tortie-p336-key ';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  BrowserWindow: { getAllWindows: () => [] },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`${MARKER}${text}`, 'utf8'),
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

const { machineStateViewOf, currentMachineStates } = await import('../machine-state');
const { MACHINE_CONFIRM_ACKNOWLEDGEMENT, confirmMachine, describeMachine } =
  await import('../confirm');
const { loadMachines, machineFieldsOf, machinesPath, resetMachinesStoreForTests } =
  await import('../store');
const { ensureConfigDir } = await import('../../config/paths');

type Row = Parameters<typeof machineStateViewOf>[0];

const STUDIO: Row = {
  id: 'studio',
  label: 'Studio',
  color: 'orange',
  confirmed: true,
  refusal: null,
  changed: false,
  writeRoot: null
};

function facts(over: Partial<MachineLinkFacts> = {}): MachineLinkFacts {
  return {
    machineId: 'studio',
    link: 'connected',
    feed: 'listed',
    everAnswered: true,
    lastAnsweredAt: 1_700_000_000_000,
    reason: null,
    ...over
  };
}

describe('machineStateViewOf, the pure half', () => {
  it('is true for a confirmed row that carries NO write root', () => {
    // The case the phase exists for: no folder was ever typed, and the
    // projects opened there save anyway.
    expect(machineStateViewOf(STUDIO, facts()).savesInProjects).toBe(true);
  });

  it('is true for a confirmed row whatever its link is doing', () => {
    // Whether a save can REACH the machine is the write's own question, asked
    // when it is composed. This field answers whether one is allowed.
    for (const link of ['connected', 'polling', 'connecting', 'quiet'] as const) {
      expect(machineStateViewOf(STUDIO, facts({ link })).savesInProjects, link).toBe(true);
    }
    expect(machineStateViewOf(STUDIO, undefined).savesInProjects).toBe(true);
  });

  it('is false for a row nobody confirmed, even when the file holds a write root', () => {
    const never: Row = {
      ...STUDIO,
      confirmed: false,
      refusal: 'Tortie will not use Studio, because nobody has confirmed it.',
      writeRoot: '/Users/gdc/code'
    };
    const view = machineStateViewOf(never, facts());
    expect(view.savesInProjects).toBe(false);
    expect(view.writeRoot).toBeNull();
  });

  it('is false for a row whose details changed after it was confirmed', () => {
    const changed: Row = {
      ...STUDIO,
      confirmed: false,
      changed: true,
      refusal: 'Tortie will not use Studio, because its details changed.'
    };
    const view = machineStateViewOf(changed, facts({ link: 'connected' }));
    expect(view.savesInProjects).toBe(false);
    expect(view.confirmNeeded).toBe('changed');
  });

  it('does not come from the file: a write root neither turns it on nor off', () => {
    for (const writeRoot of [null, '', '/Users/gdc/code']) {
      expect(
        machineStateViewOf({ ...STUDIO, writeRoot }, facts()).savesInProjects,
        String(writeRoot)
      ).toBe(true);
      expect(
        machineStateViewOf(
          { ...STUDIO, writeRoot, confirmed: false, refusal: 'no' },
          facts()
        ).savesInProjects,
        String(writeRoot)
      ).toBe(false);
    }
  });
});

describe('currentMachineStates, the live half', () => {
  const POP = {
    id: 'pop-os',
    label: 'Pop OS',
    color: 'cyan' as const,
    host: '127.0.0.1',
    user: 'greg',
    port: 2222,
    remoteTmuxPath: '/usr/bin/tmux'
  };

  function writeRows(rows: unknown[]): void {
    ensureConfigDir();
    writeFileSync(machinesPath(), JSON.stringify({ schema: 1, machines: rows }, null, 2), 'utf8');
    loadMachines('reload');
  }

  function viewOfPop(): { savesInProjects?: boolean; link: string; confirmNeeded?: string } {
    const view = currentMachineStates().find((one) => one.id === 'pop-os');
    if (view === undefined) throw new Error('pop-os is not in the view');
    return view;
  }

  beforeEach(() => {
    userData = mkdtempSync(join(tmpdir(), 'tortie-p336-saves-'));
    mkdirSync(join(userData, 'gmux'), { recursive: true });
    resetMachinesStoreForTests();
  });

  afterEach(() => {
    resetMachinesStoreForTests();
    rmSync(userData, { recursive: true, force: true });
  });

  it('reads false before the confirmation and true after it, with no folder typed anywhere', () => {
    writeRows([POP]);
    expect(viewOfPop().savesInProjects).toBe(false);
    const summary = describeMachine('pop-os', machineFieldsOf(POP));
    confirmMachine('pop-os', machineFieldsOf(POP), {
      hashRead: summary.hash,
      linesRead: [...summary.lines],
      acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT
    });
    expect(viewOfPop().savesInProjects).toBe(true);
  });

  it('reads false the moment a confirmed row changes on disk, and true again once the change is undone', () => {
    writeRows([POP]);
    const summary = describeMachine('pop-os', machineFieldsOf(POP));
    confirmMachine('pop-os', machineFieldsOf(POP), {
      hashRead: summary.hash,
      linesRead: [...summary.lines],
      acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT
    });
    expect(viewOfPop().savesInProjects).toBe(true);

    // A changed machine writes nothing until confirmed again.
    writeRows([{ ...POP, port: 2223 }]);
    const changed = viewOfPop();
    expect(changed.savesInProjects).toBe(false);
    expect(changed.link).toBe('refused');
    expect(changed.confirmNeeded).toBe('changed');

    // Put back, the row hashes to what was confirmed, and it saves again with
    // no new confirmation, because nothing he agreed to moved.
    writeRows([POP]);
    expect(viewOfPop().savesInProjects).toBe(true);
  });
});
