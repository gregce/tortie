/**
 * A session started in a tab whose files are on a machine runs on that machine
 * (Phase 94, item 2).
 *
 * ## What was wrong
 *
 * The ⌘T sheet sends a `machineId`. Every other create surface does not, being
 * the agent board, the per-agent hotkeys, the terminal menu's new session verb
 * and the empty state. All four reach the store's own `createSession`, and that
 * function sent the caller's `machineId` and nothing else. So a create started
 * in a tab on another machine ran on this Mac, in a folder this Mac does not
 * have, and the person saw a session appear with no sign that it had gone
 * somewhere else.
 *
 * ## What these four cases prove
 *
 *  1. A create that names no machine, started in a tab on a usable machine,
 *     sends that machine.
 *  2. The same create against a machine that is not usable starts nothing, says
 *     one sentence, and answers false.
 *  3. A rows read that fails is treated the same way, because it cannot say the
 *     machine is usable.
 *  4. A create in a tab on this Mac still sends no machine at all. That is the
 *     regression guard, and it is the case that fails if the rule is written to
 *     fire on a local tab.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineRowView, MachinesResult } from '@shared/ipc';

/** How the fake bridge answers `machines.rows()` for the case being run. */
type RowsMode = 'usable' | 'unusable' | 'throws';

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
  if (rowsMode === 'throws') return Promise.reject(new Error('read failed'));
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

const { useApp } = await import('../store');

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

describe('a create that names no machine, in a tab on a machine', () => {
  it('runs on the machine the tab is on', async () => {
    seedTab(true);
    await useApp.getState().quickCreate('claude');
    expect(created).toHaveLength(1);
    expect(created[0]?.machineId).toBe('macpro');
    expect(created[0]?.projectMachineId).toBe('macpro');
    expect(created[0]?.projectPath).toBe('/far/work');
  });

  it('starts nothing and says one sentence when that machine is not usable', async () => {
    seedTab(true);
    rowsMode = 'unusable';
    await useApp.getState().quickCreate('claude');
    expect(created).toHaveLength(0);
    const ok = await useApp
      .getState()
      .createSession({ name: 'two', agent: 'claude' });
    expect(ok).toBe(false);
    expect(created).toHaveLength(0);
    const toasts = useApp.getState().toasts;
    expect(toasts).toHaveLength(2);
    expect(toasts[0]?.text).toBe(REFUSAL);
    expect(toasts[0]?.kind).toBe('error');
    expect(toasts[0]?.sticky).toBe(true);
  });

  it('starts nothing when the rows read fails', async () => {
    seedTab(true);
    rowsMode = 'throws';
    const ok = await useApp
      .getState()
      .createSession({ name: 'three', agent: 'claude' });
    expect(ok).toBe(false);
    expect(created).toHaveLength(0);
    expect(useApp.getState().toasts[0]?.text).toBe(REFUSAL);
  });
});

describe('a create in a tab on this Mac', () => {
  it('sends no machine at all, which is every build before this one', async () => {
    seedTab(false);
    await useApp.getState().quickCreate('claude');
    expect(created).toHaveLength(1);
    expect(Object.keys(created[0] ?? {})).not.toContain('machineId');
    expect(Object.keys(created[0] ?? {})).not.toContain('projectMachineId');
    expect(useApp.getState().toasts).toHaveLength(0);
  });
});
