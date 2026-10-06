/**
 * PHASE 340. The machine row's ⋯ menu (build/p340/SPEC.md D20, section 5.2,
 * conditions 132 and 134).
 *
 * What these tests hold:
 * - The menu's rows, per state, in D20's order and with its labels: Prepare
 *   this machine, Test the connection, What Tortie runs there…, a separator,
 *   Stop trusting this machine, Remove…. Prepare, Test and Stop trusting are
 *   enabled only for a confirmed row; What Tortie runs there… always; Remove…
 *   unless a call for the row is in flight. Stop trusting carries the sub-line
 *   `Also takes back version <v>` only while an acceptance stands, being a
 *   version Tortie has NOT measured (Phase 324).
 * - Each row runs exactly its store action, read off a fake bridge: Prepare
 *   calls `machines:prepare` for that id; Test starts the saved check; What
 *   Tortie runs there… and Remove… open a panel and call nothing; Stop
 *   trusting calls `machines:forget`. A disabled row, the separator and an id
 *   the menu does not draw run nothing at all.
 * - The probe hook, assigned when the module is imported with a window, runs
 *   the same runner a native pick runs and answers the same rows.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineRowView, MachineTestInput, MachinesResult } from '@shared/ipc';
import {
  acceptanceStands,
  machineMenuItems,
  p340MenuHook,
  runMachineMenuItem,
  type P340MenuHook
} from '../machine-menu';
import { useMachinesStore } from '../machines-store';

function row(over: Partial<MachineRowView> = {}): MachineRowView {
  return {
    id: 'studio',
    label: 'studio',
    color: 'blue',
    host: '127.0.0.1',
    user: null,
    port: null,
    remoteTmuxPath: '/opt/homebrew/bin/tmux',
    state: 'confirmed',
    usable: true,
    hash: 'a'.repeat(64),
    confirmedHash: 'a'.repeat(64),
    confirmedAt: 1,
    confirmedLines: [],
    lines: [],
    refusal: null,
    warning: 'w',
    ...over
  };
}

const IDLE = { preparing: false, testing: false, busy: false };

/** The rows as [id, label, enabled], the separator as [null, null, null]. */
function shape(r: MachineRowView, facts = IDLE): (string | boolean | null)[][] {
  return machineMenuItems(r, facts).map((item) =>
    item.type === 'separator'
      ? [null, null, null]
      : [item.id, item.label, item.enabled !== false]
  );
}

describe('the rows, per state', () => {
  it('draws D20’s five rows and a separator, in order, all on for a confirmed row', () => {
    expect(shape(row())).toEqual([
      ['prepare', 'Prepare this machine', true],
      ['test', 'Test the connection', true],
      ['what', 'What Tortie runs there…', true],
      [null, null, null],
      ['forget', 'Stop trusting this machine', true],
      ['remove', 'Remove…', true]
    ]);
  });

  it('turns Prepare, Test and Stop trusting off for a row nobody confirmed as it is', () => {
    for (const state of ['never', 'changed', 'unknown'] as const) {
      expect(shape(row({ state, usable: false }))).toEqual([
        ['prepare', 'Prepare this machine', false],
        ['test', 'Test the connection', false],
        ['what', 'What Tortie runs there…', true],
        [null, null, null],
        ['forget', 'Stop trusting this machine', false],
        ['remove', 'Remove…', true]
      ]);
    }
  });

  it('reads the state alone, so a row composed without `usable` still offers Prepare', () => {
    const { usable: _dropped, ...withoutUsable } = row();
    void _dropped;
    const prepare = machineMenuItems(withoutUsable as MachineRowView, IDLE)[0];
    expect(prepare?.id).toBe('prepare');
    expect(prepare?.enabled).toBe(true);
  });

  it('says every row’s enabled flag as a boolean, never leaving it to a default', () => {
    // An absent `enabled` reads as enabled in a native menu, so a flag computed
    // from a field that was not there would quietly turn a row on.
    for (const r of [row(), row({ state: 'never', usable: false })]) {
      for (const item of machineMenuItems(r, IDLE)) {
        if (item.type === 'separator') continue;
        expect({ id: item.id, type: typeof item.enabled }).toEqual({ id: item.id, type: 'boolean' });
      }
    }
  });

  it('turns a row off while its own call is in flight', () => {
    expect(shape(row(), { ...IDLE, preparing: true })[0]?.[2]).toBe(false);
    expect(shape(row(), { ...IDLE, testing: true })[1]?.[2]).toBe(false);
    const busy = shape(row(), { ...IDLE, busy: true });
    expect(busy.map((one) => one[2])).toEqual([false, false, true, null, false, false]);
  });

  it('carries the sub-line only while an acceptance of an unmeasured version stands', () => {
    const forget = (r: MachineRowView) =>
      machineMenuItems(r, IDLE).find((item) => item.id === 'forget');
    expect(forget(row({ acceptedTmuxVersion: '3.9z' }))?.sublabel).toBe(
      'Also takes back version 3.9z'
    );
    for (const measured of ['3.6', '3.6a', '3.6b', '3.7b', '3.7c']) {
      expect(forget(row({ acceptedTmuxVersion: measured }))?.sublabel).toBeUndefined();
    }
    expect(forget(row())?.sublabel).toBeUndefined();
    expect(acceptanceStands('3.9z')).toBe(true);
    expect(acceptanceStands('3.6a')).toBe(false);
    expect(acceptanceStands(null)).toBe(false);
    expect(acceptanceStands('')).toBe(false);
  });

  it('draws no icon, so the closed glyph set has nothing new', () => {
    for (const item of machineMenuItems(row(), IDLE)) expect(item.icon).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The runner, over a fake bridge
// ---------------------------------------------------------------------------

interface Calls {
  prepares: string[];
  tests: MachineTestInput[];
  forgets: string[];
  removes: string[];
}

let calls: Calls;
let forgetFails = false;

function result(rows: MachineRowView[]): MachinesResult {
  return {
    rows,
    errors: [],
    directory: '/x',
    path: '/x/machines.json',
    present: true,
    honesty: 'h',
    warning: 'w',
    ssh: { path: '/usr/bin/ssh', source: 'pinned' }
  };
}

function installBridge(rows: MachineRowView[]): void {
  calls = { prepares: [], tests: [], forgets: [], removes: [] };
  forgetFails = false;
  (globalThis as { window?: unknown }).window = {
    gmux: {
      machines: {
        rows: async () => result(rows),
        prepare: async (id: string) => {
          calls.prepares.push(id);
          return {
            id,
            class: 'prepared',
            alarm: false,
            headline: 'h',
            detail: 'd',
            version: '3.6a',
            supported: [],
            serverBorn: true,
            options: [],
            pathCaptured: true,
            durationMs: 1
          };
        },
        test: async (input: MachineTestInput) => {
          calls.tests.push(input);
          return { testId: 't-1', commandLine: 'c', sshPath: '/x' };
        },
        forget: async (id: string) => {
          calls.forgets.push(id);
          if (forgetFails) throw new Error('Tortie did not withdraw studio, because the record could not be read.');
          return row({ id });
        },
        remove: async (id: string) => {
          calls.removes.push(id);
          return result([]);
        }
      }
    }
  };
  useMachinesStore.setState({
    machines: result(rows),
    panels: {},
    rowErrors: {},
    preparing: null,
    busy: null,
    test: null,
    keyInstall: null
  });
}

describe('each row runs exactly its store action', () => {
  const one = row();

  beforeEach(() => installBridge([one]));

  it('prepare: opens the prepare panel and prepares that machine', async () => {
    expect(await runMachineMenuItem('prepare', one)).toBeNull();
    expect(calls.prepares).toEqual(['studio']);
    expect(useMachinesStore.getState().panels.studio).toBe('prepare');
    expect(calls.tests).toEqual([]);
  });

  it('test: opens the test panel and starts the saved check, which main gates', async () => {
    expect(await runMachineMenuItem('test', one)).toBeNull();
    expect(calls.tests).toEqual([{ mode: 'saved', id: 'studio' }]);
    expect(useMachinesStore.getState().panels.studio).toBe('test');
    expect(calls.prepares).toEqual([]);
  });

  it('what: opens the panel and calls nothing', async () => {
    expect(await runMachineMenuItem('what', one)).toBeNull();
    expect(useMachinesStore.getState().panels.studio).toBe('what');
    expect(calls).toEqual({ prepares: [], tests: [], forgets: [], removes: [] });
  });

  it('forget: calls the same machines:forget Withdraw always called', async () => {
    expect(await runMachineMenuItem('forget', one)).toBeNull();
    expect(calls.forgets).toEqual(['studio']);
  });

  it('remove: asks the question under the row, and removes nothing', async () => {
    expect(await runMachineMenuItem('remove', one)).toBeNull();
    expect(useMachinesStore.getState().panels.studio).toBe('remove');
    expect(calls.removes).toEqual([]);
  });

  it('writes main’s sentence under the row when the call was refused', async () => {
    forgetFails = true;
    const said = await runMachineMenuItem('forget', one);
    expect(said).toContain('could not be read');
    expect(useMachinesStore.getState().rowErrors.studio).toBe(said);
  });

  it('runs nothing for the separator, an id the menu does not draw, or a disabled row', async () => {
    expect(await runMachineMenuItem('separator', one)).toBeNull();
    expect(await runMachineMenuItem('delete-everything', one)).toBeNull();
    const unconfirmed = row({ state: 'changed', usable: false });
    installBridge([unconfirmed]);
    for (const id of ['prepare', 'test', 'forget']) {
      expect(await runMachineMenuItem(id, unconfirmed)).toBeNull();
    }
    useMachinesStore.setState({ preparing: 'studio' });
    expect(await runMachineMenuItem('prepare', one)).toBeNull();
    expect(calls).toEqual({ prepares: [], tests: [], forgets: [], removes: [] });
    expect(useMachinesStore.getState().panels).toEqual({});
  });
});

describe('the probe hook', () => {
  beforeEach(() => installBridge([row()]));

  it('answers the rows the menu would draw now, and null for no such machine', () => {
    expect(p340MenuHook.items('studio')).toEqual(machineMenuItems(row(), IDLE));
    expect(p340MenuHook.items('nobody')).toBeNull();
  });

  it('runs a row through the same runner a native pick runs', async () => {
    expect(await p340MenuHook.run('studio', 'prepare')).toBeNull();
    expect(calls.prepares).toEqual(['studio']);
    expect(await p340MenuHook.run('nobody', 'prepare')).toBeNull();
    expect(calls.prepares).toEqual(['studio']);
  });

  it('is assigned to window.__gmuxP340Menu when the module is imported with a window', async () => {
    vi.resetModules();
    const host: { __gmuxP340Menu?: P340MenuHook; gmux?: unknown } = {};
    (globalThis as { window?: unknown }).window = host;
    const fresh = await import('../machine-menu');
    expect(host.__gmuxP340Menu).toBe(fresh.p340MenuHook);
  });

  it('assigns nothing, and throws nothing, with no window', async () => {
    vi.resetModules();
    delete (globalThis as { window?: unknown }).window;
    await expect(import('../machine-menu')).resolves.toBeDefined();
    expect((globalThis as { window?: unknown }).window).toBeUndefined();
  });
});
