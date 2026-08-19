/**
 * The per-agent hotkey, driven as a surface (Phase 94, item 2, fix round).
 *
 * ## Why this file exists
 *
 * The first build of this phase put the tab machine rule in the store's
 * `createSession` and recorded in the spec that every create surface already
 * called it. That sentence was false. `launchAgent` in `../integration.ts`
 * called `window.gmux.sessions.create` itself and composed its own payload.
 * The payload carried neither `machineId` nor `projectMachineId`, so the
 * store's rule never ran for it and main's own backstop had nothing to read.
 * Pressed inside a tab whose files are on another computer, the hotkey started
 * a process on THIS Mac, in a folder only that computer has.
 *
 * The store test beside this one is real and it fails under mutation, but it
 * drives the store. It cannot see a surface that does not call the store. So
 * this file drives the surface and reads the payload that crossed the bridge.
 *
 * ## What these three cases prove
 *
 *  1. A hotkey pressed in a tab on a usable machine sends that machine and
 *     sends the machine the folder belongs to. This is the case that failed.
 *  2. The same press against a machine that is not usable starts nothing and
 *     says one sentence. Nothing reaches the bridge at all.
 *  3. A hotkey pressed in a tab on this Mac still sends no machine, which is
 *     every build before this one.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineRowView, MachinesResult } from '@shared/ipc';

/** How the fake bridge answers `machines.rows()` for the case being run. */
type RowsMode = 'usable' | 'unusable';

let rowsMode: RowsMode = 'usable';
let created: Record<string, unknown>[] = [];

/** One row, as main composes it for the Settings list. */
function row(usable: boolean): MachineRowView {
  return {
    id: 'macpro',
    label: 'Mac Pro',
    color: 'blue',
    host: 'macpro',
    user: null,
    port: null,
    remoteTmuxPath: null,
    state: usable ? 'confirmed' : 'never',
    usable,
    hash: 'h',
    confirmedHash: usable ? 'h' : null,
    confirmedAt: null,
    confirmedLines: [],
    lines: [],
    refusal: usable ? null : 'not confirmed',
    warning: 'w'
  };
}

function rows(): Promise<MachinesResult> {
  return Promise.resolve({
    rows: [row(rowsMode === 'usable')],
    errors: [],
    directory: '/tmp/machines',
    path: '/tmp/machines/machines.json',
    present: true,
    honesty: 'h',
    warning: 'w',
    ssh: { path: '/usr/bin/ssh', source: 'pinned' }
  });
}

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  requestAnimationFrame() {},
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      create: (input: Record<string, unknown>) => {
        created.push(input);
        return Promise.resolve({
          id: `s-${created.length}`,
          name: String(input.name),
          projectPath: String(input.projectPath),
          cwd: String(input.projectPath),
          agent: 'claude',
          status: 'running',
          createdAt: 0
        });
      },
      list: () => Promise.resolve([]),
      onChanged() {},
      onStatusChanged() {}
    },
    machines: { rows },
    projects: { list: () => Promise.resolve([]) },
    notice: { pending: () => Promise.resolve([]) },
    setSessionsPosition: () => Promise.resolve()
  }
});
vi.stubGlobal('requestAnimationFrame', () => 0);
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { useApp } = await import('../../state/store');
const { launchAgent } = await import('../integration');

/** The sentence the person reads, word for word. */
const REFUSAL =
  'Tortie is not connected to Mac Pro, so it started nothing. The files in ' +
  'this tab are on that machine, so a session on this Mac would run in a ' +
  'folder this Mac does not have. Open Settings and then Machines to prepare ' +
  'it, then try again.';

/** Put the window in one tab, either on the machine or on this Mac. */
function seedTab(onMachine: boolean): void {
  useApp.setState({
    projects: [
      onMachine
        ? { id: 'p1', path: '/far/work', name: 'work', machineId: 'macpro' }
        : { id: 'p1', path: '/here/work', name: 'work' }
    ],
    activeProjectId: 'p1',
    sessions: [],
    toasts: [],
    bootBlock: null,
    machineStates: [
      {
        id: 'macpro',
        label: 'Mac Pro',
        color: 'blue',
        link: 'connected',
        detail: '',
        sessions: 0
      }
    ]
  } as never);
}

beforeEach(() => {
  created = [];
  rowsMode = 'usable';
});

describe('a per-agent hotkey pressed in a tab on a machine', () => {
  it('starts the session on that machine, in that tab’s folder', async () => {
    seedTab(true);
    await launchAgent('claude');
    expect(created).toHaveLength(1);
    expect(created[0]?.machineId).toBe('macpro');
    expect(created[0]?.projectMachineId).toBe('macpro');
    expect(created[0]?.projectPath).toBe('/far/work');
    expect(created[0]?.name).toBe('claude-1');
  });

  it('starts nothing and says one sentence when that machine is not usable', async () => {
    seedTab(true);
    rowsMode = 'unusable';
    await launchAgent('claude');
    expect(created).toHaveLength(0);
    const toasts = useApp.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.text).toBe(REFUSAL);
    expect(toasts[0]?.kind).toBe('error');
    expect(toasts[0]?.sticky).toBe(true);
  });
});

describe('a per-agent hotkey pressed in a tab on this Mac', () => {
  it('sends no machine at all, which is every build before this one', async () => {
    seedTab(false);
    await launchAgent('claude');
    expect(created).toHaveLength(1);
    expect(Object.keys(created[0] ?? {})).not.toContain('machineId');
    expect(Object.keys(created[0] ?? {})).not.toContain('projectMachineId');
    expect(created[0]?.projectPath).toBe('/here/work');
    expect(useApp.getState().toasts).toHaveLength(0);
  });
});
