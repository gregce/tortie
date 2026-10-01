/**
 * Phase 306, fix round: the window draws the tab main opened for a create in a
 * folder whose tab a person closed.
 *
 * ## The regression this pins
 *
 * Since Phase 306 main keeps a folder on a machine without a tab once a person
 * closed it, until they open it again or create a session in it. The window
 * learns of a folder main opened by itself through `reconcileRemoteTabs` in
 * `../sessions-slice.ts`, which re-reads `projects.list()` once per folder on a
 * machine that has a session and no tab, and remembers each folder it asked
 * about. The first pass after a close asks once and finds nothing. When the
 * person then creates a session in that folder from a tab on the same machine,
 * main opens it and clears the record, and a memo keyed by folder alone never
 * asked again: the new session sat in no tab until a reload or a relaunch. Two
 * verifiers measured it in the app (row 10, "worse" than the parent, where the
 * defect had already put the tab back).
 *
 * The memo now remembers each folder BESIDE whether a session in it carried
 * the record of a closed tab, and asks again when that changes. What is pinned
 * here, over the SHIPPING store and a bridge that answers what main's manifest
 * would hold:
 *
 *   T1  a held folder is asked about once, and passes after it cost no read
 *   T2  the create's clear is asked about once more and draws the tab (row 10)
 *   T3  the create's own passes before the clear make no extra read
 *   T4  a second close and a second create in one run draw the tab again
 *   T5  a folder that never had a tab is asked about once and drawn (90.3)
 *   T6  a record in another folder does not ask about this one
 *   T7  a read that failed is not asked again on every pass
 *
 * Each title is a key `build/p306/ablation.mjs` looks up. `tabsAskedFor` is
 * module scope and survives between tests in this file, so every test uses
 * folders of its own.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Project, Session } from '@shared/types';

/** What main's `projects:list` answers right now. */
let mainProjects: Project[] = [];
let listCalls = 0;
let failNextList = false;

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  gmux: {
    projects: {
      list: () => {
        listCalls += 1;
        if (failNextList) {
          failNextList = false;
          return Promise.reject(new Error('main did not answer'));
        }
        return Promise.resolve(mainProjects.map((p) => ({ ...p })));
      }
    }
  }
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { useApp } = await import('../store');

const M = 'p306far';
const project = (id: string, path: string): Project =>
  ({ id, name: path.slice(path.lastIndexOf('/') + 1), path, machineId: M }) as Project;

/** A session on the machine in `path`, carrying the closed-tab record when `closed`. */
const onMachine = (id: string, path: string, closed = false): Session =>
  ({
    id,
    name: id,
    tmuxName: id,
    projectPath: path,
    cwd: path,
    agent: 'shell',
    status: 'running',
    createdAt: 1,
    machine: { id: M, label: 'far', color: 'blue', answering: true, canRestore: false, restoreReason: null },
    ...(closed
      ? { closedProject: { name: path.slice(path.lastIndexOf('/') + 1), path, closedAt: 1 } }
      : {})
  }) as Session;

/** Let the reconcile's awaited read land. */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0));
};

/** One broadcast from main, as the window receives it. */
const broadcast = async (sessions: Session[]): Promise<void> => {
  useApp.getState().applySessions(sessions);
  await flush();
};

const drawn = (path: string): boolean =>
  useApp.getState().projects.some((p) => p.path === path && p.machineId === M);

/** The window and main both hold `open`, and nothing else on the machine. */
const start = (open: Project[]): void => {
  mainProjects = [...open];
  useApp.setState({ projects: [...open] });
  listCalls = 0;
};

describe('the window asks again when main clears the record of a closed tab', () => {
  it('T1 a held folder is asked about once, and passes after it cost no read', async () => {
    const C = project('c1', '/far/t1/charlie');
    const D = '/far/t1/delta';
    start([C]);
    // The tab was closed: main holds D, and every pass lists d1 with its record.
    for (let pass = 0; pass < 4; pass += 1) await broadcast([onMachine('d1', D, true)]);
    expect(listCalls).toBe(1);
    expect(drawn(D)).toBe(false);
  });

  it('T2 a create that clears the record is asked about once more, and the tab is drawn', async () => {
    const C = project('c2', '/far/t2/charlie');
    const D = '/far/t2/delta';
    start([C]);
    await broadcast([onMachine('d1', D, true)]);
    expect(listCalls).toBe(1);
    // The create in D, from C's tab: main opens D and clears d1's record in the
    // same call, then broadcasts.
    mainProjects = [C, project('d2', D)];
    await broadcast([onMachine('d1', D), onMachine('dnew', D)]);
    expect(listCalls).toBe(2);
    expect(drawn(D)).toBe(true);
  });

  it("T3 the create's own passes before the clear make no extra read", async () => {
    const C = project('c3', '/far/t3/charlie');
    const D = '/far/t3/delta';
    start([C]);
    await broadcast([onMachine('d1', D, true)]);
    // The machine's feed lists the new session before main clears the record,
    // so d1 still carries it; the folder is still held and nothing is asked.
    await broadcast([onMachine('d1', D, true), onMachine('dnew', D)]);
    await broadcast([onMachine('d1', D, true), onMachine('dnew', D)]);
    expect(listCalls).toBe(1);
    mainProjects = [C, project('d3', D)];
    await broadcast([onMachine('d1', D), onMachine('dnew', D)]);
    expect(listCalls).toBe(2);
    expect(drawn(D)).toBe(true);
  });

  it('T4 a second close and a second create in one run draw the tab again', async () => {
    const C = project('c4', '/far/t4/charlie');
    const D = '/far/t4/delta';
    start([C]);
    // First close, held, then a create opens it.
    await broadcast([onMachine('d1', D, true)]);
    mainProjects = [C, project('d4a', D)];
    await broadcast([onMachine('d1', D), onMachine('dnew', D)]);
    expect(drawn(D)).toBe(true);
    // The second close: the tab goes from the window and from main.
    mainProjects = [C];
    useApp.setState({ projects: [C] });
    await broadcast([onMachine('d1', D, true), onMachine('dnew', D, true)]);
    expect(drawn(D)).toBe(false);
    // The second create in D.
    const before = listCalls;
    mainProjects = [C, project('d4b', D)];
    await broadcast([onMachine('d1', D), onMachine('dnew', D), onMachine('dnew2', D)]);
    expect(listCalls).toBe(before + 1);
    expect(drawn(D)).toBe(true);
  });

  it('T5 a folder that never had a tab is asked about once and drawn', async () => {
    const C = project('c5', '/far/t5/charlie');
    const W = '/far/t5/whiskey';
    start([C]);
    mainProjects = [C, project('w5', W)];
    await broadcast([onMachine('w1', W)]);
    await broadcast([onMachine('w1', W)]);
    expect(listCalls).toBe(1);
    expect(drawn(W)).toBe(true);
  });

  it('T6 a record in another folder does not ask about this one', async () => {
    const C = project('c6', '/far/t6/charlie');
    const D = '/far/t6/delta';
    const G = '/far/t6/golf';
    start([C]);
    await broadcast([onMachine('d1', D, true), onMachine('g1', G, true)]);
    expect(listCalls).toBe(1);
    // G is opened again by its own clear; D still carries its record.
    await broadcast([onMachine('d1', D, true), onMachine('g1', G)]);
    expect(listCalls).toBe(2);
    // Nothing about D changed, so a pass after it asks nothing.
    await broadcast([onMachine('d1', D, true), onMachine('g1', G)]);
    expect(listCalls).toBe(2);
  });

  it('T7 a read that failed is not asked again on every pass', async () => {
    const C = project('c7', '/far/t7/charlie');
    const D = '/far/t7/delta';
    start([C]);
    failNextList = true;
    await broadcast([onMachine('d1', D, true)]);
    await broadcast([onMachine('d1', D, true)]);
    await broadcast([onMachine('d1', D, true)]);
    expect(listCalls).toBe(1);
    expect(drawn(D)).toBe(false);
  });
});
