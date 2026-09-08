/**
 * PHASE 233. Drag on a tree whose folder is on another machine.
 *
 * WHAT WAS TRUE AT THE PARENT. Research 85 gap 8 and research 92 section 4.3:
 * a `dragstart` on a remote row came back `defaultPrevented: true` with no type
 * on the transfer, and the far side's tree was unchanged, so a remote tree had
 * no move gesture at all while `entry-rename` on that machine had moved a path
 * since Phase 102.
 *
 * WHAT THIS FILE PINS, and each of these is a way the gesture can be wrong
 * rather than absent.
 *
 * 1. THE CAPABILITY, over the three answers a mounted tree can have: this Mac,
 *    a machine with a confirmed folder, and a machine without one. The old
 *    refusal was `isRemote`, so replacing it with anything weaker than the
 *    predicate the menu's Rename already asks would offer a gesture whose write
 *    main refuses at the row.
 * 2. THE FOURTH DOOR. Every refusal before this phase was at the gesture, so a
 *    drop that reached `drop` on a remote tree handed a path from another
 *    machine to THIS Mac's `fs:move`, which is the file of that name here or
 *    nothing at all. `fs:move` is counted and must be zero.
 * 3. THE FOUR REFUSALS the far side can answer, being exists, gone, writes off
 *    and outside root, each surfaced by the same sentence the menu's Rename
 *    surfaces, with the model put back. `denied` is deliberately absent: it is
 *    a `makeDir` word and `MachineRenameOutcome` does not carry it.
 * 4. THE ATTACH CONTRACT stays unarmed on a remote tree. `beginTreeDrag` hands
 *    the terminal pane ABSOLUTE paths, and an absolute path from another
 *    machine names a file on this Mac or nothing. That one is read off the
 *    source, because Pierre's controller and a real drag session are not
 *    reachable in a node environment; the app run is what drives it.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  createFile: vi.fn(),
  createFolder: vi.fn(),
  rename: vi.fn(),
  move: vi.fn(),
  toast: vi.fn(),
  setConfirm: vi.fn(),
  relist: vi.fn(),
  forgetUnder: vi.fn(),
  requestOpenFile: vi.fn(),
  followMoves: vi.fn()
}));

vi.mock('../fs-ops-bridge', () => ({
  createFile: h.createFile,
  createFolder: h.createFolder,
  rename: h.rename,
  duplicate: vi.fn(),
  move: h.move,
  trash: vi.fn(),
  canMutate: () => true,
  canDuplicate: () => true
}));

vi.mock('../../state/store', () => ({
  useApp: {
    getState: () => ({
      toast: h.toast,
      setConfirm: h.setConfirm,
      machineStates: [{ id: 'm1', label: 'Studio' }]
    })
  },
  errorPayload: () => null,
  errorText: (err: unknown) => String(err)
}));

vi.mock('../store', () => ({
  useFileTree: {
    getState: () => ({ relist: h.relist, forgetUnder: h.forgetUnder })
  }
}));

vi.mock('../open-file', () => ({ requestOpenFile: h.requestOpenFile }));
vi.mock('../editor-follow', () => ({ followMoves: h.followMoves }));
vi.mock('../tree-menu', () => ({
  describeConflicts: () => '',
  describeEntries: () => ''
}));

import { ROOT, flush, makeRig, renamedAnswer } from './remote-tree-rig';
import { createTreeOps } from '../tree-ops';
import { makeModel, makeView } from './remote-tree-rig';
import { mayWriteEntriesHere } from '../remote-bridge';
import * as copy from '../../machines/explorer';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (name: string): string =>
  readFileSync(join(HERE, '..', name), 'utf8');

const toasts = (): { level: string; text: string }[] =>
  h.toast.mock.calls.map((call) => ({
    level: String(call[0]),
    text: String(call[1])
  }));

beforeEach(() => {
  vi.clearAllMocks();
  h.relist.mockResolvedValue(undefined);
  vi.stubGlobal('window', { gmux: { machines: {} } });
});

// ---------------------------------------------------------------------------
// 1. The capability, over every answer a mounted tree can give
// ---------------------------------------------------------------------------

describe('which trees offer a write gesture at all', () => {
  const withBridge = (): void => {
    vi.stubGlobal('window', {
      gmux: { machines: { makeDir: () => undefined, renameEntry: () => undefined } }
    });
  };

  it('a tree on this Mac always does, whatever a machine would have said', () => {
    withBridge();
    expect(mayWriteEntriesHere(false, null)).toBe(true);
    vi.stubGlobal('window', { gmux: { machines: {} } });
    expect(mayWriteEntriesHere(false, null)).toBe(true);
    expect(mayWriteEntriesHere(false, '/home/greg')).toBe(true);
  });

  it('a machine with a confirmed folder does', () => {
    withBridge();
    expect(mayWriteEntriesHere(true, '/home/greg')).toBe(true);
  });

  it('a machine WITHOUT one does not, so no drag ever starts', () => {
    withBridge();
    expect(mayWriteEntriesHere(true, null)).toBe(false);
  });

  it('a build whose preload predates the writes does not either', () => {
    // Both calls ship together; half a bridge has never existed, and the
    // predicate refuses on either half being absent.
    vi.stubGlobal('window', {
      gmux: { machines: { makeDir: () => undefined } }
    });
    expect(mayWriteEntriesHere(true, '/home/greg')).toBe(false);
    vi.stubGlobal('window', {
      gmux: { machines: { renameEntry: () => undefined } }
    });
    expect(mayWriteEntriesHere(true, '/home/greg')).toBe(false);
  });

  it('is the predicate BOTH drag doors and the rename ask, read off the source', () => {
    // Four call sites and one composition. A second spelling anywhere is how
    // the two answers drift apart, which is the defect Phase 102 fixed for
    // Rename and this phase must not reintroduce for the drag.
    const model = read('use-tree-model.ts');
    // The WHOLE statement, semicolon included, so a clause bolted onto the
    // end of it turns this red rather than sliding past a substring.
    expect(model).toContain(
      'const canRenameHere = mayWriteEntriesHere(isRemote, remoteWriteRoot);\n'
    );
    // `isRemote` is no longer a drag refusal anywhere in the model.
    expect(model).not.toContain('if (isRemote) return false;');
    const canDrag = model.slice(
      model.indexOf('const canDrag = useCallback('),
      model.indexOf('const canDropInto = useCallback(')
    );
    expect(canDrag).toContain('if (!canRenameHereRef.current) return false;');
    const canDrop = model.slice(
      model.indexOf('const canDropInto = useCallback('),
      model.indexOf('const onDropComplete = useCallback(')
    );
    expect(canDrop).toContain('if (!canRenameHereRef.current) return false;');
  });
});

// ---------------------------------------------------------------------------
// 2. The fourth door: which computer the write lands on
// ---------------------------------------------------------------------------

describe('a drop on a remote tree reaches the machine and not this Mac', () => {
  it('sends one entry-rename per dragged path, with both absolute paths', async () => {
    const rig = makeRig();
    rig.rows.add('docs/notes.md');
    rig.rows.add('docs/plan.md');
    rig.renameAnswer.value = Promise.resolve(renamedAnswer('moved'));
    rig.ops.drop(['docs/notes.md', 'docs/plan.md'], 'lib/', true);
    await flush();
    expect(rig.renameCalls).toEqual([
      { from: `${ROOT}/docs/notes.md`, to: `${ROOT}/lib/notes.md`, kind: 'file' },
      { from: `${ROOT}/docs/plan.md`, to: `${ROOT}/lib/plan.md`, kind: 'file' }
    ]);
    // THE DEFECT THIS PHASE CLOSES. `fs:move` runs on this Mac.
    expect(h.move).not.toHaveBeenCalled();
    expect(toasts()).toEqual([]);
  });

  it('carries dir as the kind for a folder, which is what the tab follower needs', async () => {
    const rig = makeRig();
    rig.rows.add('docs/');
    rig.renameAnswer.value = Promise.resolve(renamedAnswer('moved', 'dir'));
    rig.ops.drop(['docs/'], 'lib/', true);
    await flush();
    expect(rig.renameCalls).toEqual([
      { from: `${ROOT}/docs`, to: `${ROOT}/lib/docs`, kind: 'dir' }
    ]);
    // A folder that moved takes its cached children's keys with it.
    expect(h.forgetUnder).toHaveBeenCalledWith([`${ROOT}/docs`]);
  });

  it('carries the machine to the tab follower, so open tabs follow', async () => {
    const rig = makeRig();
    rig.rows.add('docs/notes.md');
    rig.renameAnswer.value = Promise.resolve(renamedAnswer('moved'));
    rig.ops.drop(['docs/notes.md'], 'lib/', true);
    await flush();
    expect(h.followMoves).toHaveBeenCalledWith([
      {
        from: `${ROOT}/docs/notes.md`,
        to: `${ROOT}/lib/notes.md`,
        kind: 'file',
        machine: { machineId: 'm1', repoPath: ROOT }
      }
    ]);
  });

  it('re-reads the folder once per path that landed and releases every hold', async () => {
    const rig = makeRig();
    rig.rows.add('docs/notes.md');
    rig.rows.add('docs/plan.md');
    rig.renameAnswer.value = Promise.resolve(renamedAnswer('moved'));
    rig.ops.drop(['docs/notes.md', 'docs/plan.md'], 'lib/', true);
    await flush();
    expect(rig.refreshes()).toBe(2);
    expect(rig.holds()).toBe(2);
    expect(rig.releases()).toBe(2);
  });

  it('sends nothing for a path already in the destination, and nothing for .git', async () => {
    const rig = makeRig();
    rig.renameAnswer.value = Promise.resolve(renamedAnswer('moved'));
    rig.ops.drop(['lib/a.ts'], 'lib/', true);
    rig.ops.drop(['.git/config'], 'lib/', true);
    rig.ops.drop(['lib/a.ts'], '.git/', true);
    await flush();
    expect(rig.renameCalls).toEqual([]);
    expect(h.move).not.toHaveBeenCalled();
  });

  it('owns the model when Pierre refused the gesture in its own store', async () => {
    // `modelAlreadyMoved` false is `onDropError`, which is what fires when the
    // destination already holds the name in Pierre's store.
    const rig = makeRig();
    rig.rows.add('docs/notes.md');
    rig.renameAnswer.value = Promise.resolve(renamedAnswer('moved'));
    rig.ops.drop(['docs/notes.md'], 'lib/', false);
    await flush();
    expect([...rig.rows]).toEqual(['lib/notes.md']);
  });

  it('leaves a tree on this Mac going through fs:move exactly as before', async () => {
    const view = makeView();
    const { rows, model } = makeModel(view);
    rows.add('docs/notes.md');
    let fed = new Set<string>();
    h.move.mockResolvedValue({
      status: 'moved',
      moved: [
        {
          from: { relPath: 'docs/notes.md', kind: 'file', path: '/repo/docs/notes.md' },
          to: { relPath: 'lib/notes.md', kind: 'file', path: '/repo/lib/notes.md' }
        }
      ],
      conflicts: []
    });
    const ops = createTreeOps({
      rootPath: '/repo',
      model,
      readFed: () => fed,
      writeFed: (next) => {
        fed = next;
      },
      hold: () => () => undefined,
      renameView: () => view,
      selectOnly: () => undefined
    });
    ops.drop(['docs/notes.md'], 'lib/', true);
    await flush();
    expect(h.move).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 3. Every answer the far side can give a drop
// ---------------------------------------------------------------------------

describe('every answer a remote drop can meet', () => {
  const REFUSALS = [
    {
      outcome: 'exists' as const,
      // Names the DESTINATION, which is the entry the word is about.
      says: () => copy.remoteEntryExists('notes.md', 'Studio')
    },
    {
      outcome: 'gone' as const,
      says: () => copy.remoteEntryGone('notes.md', 'Studio')
    },
    {
      outcome: 'writesOff' as const,
      says: () => copy.remoteEntryWritesOff('Studio')
    },
    {
      outcome: 'outsideRoot' as const,
      says: () => copy.remoteEntryOutsideRoot('/home/greg', 'Studio')
    }
  ];

  for (const one of REFUSALS) {
    it(`puts the row back and says why on ${one.outcome}`, async () => {
      const rig = makeRig();
      // Pierre moved the row optimistically, which is what a refusal undoes.
      rig.rows.add('lib/notes.md');
      rig.renameAnswer.value = Promise.resolve(renamedAnswer(one.outcome));
      rig.ops.drop(['docs/notes.md'], 'lib/', true);
      await flush();
      expect([...rig.rows]).toEqual(['docs/notes.md']);
      expect(toasts()).toEqual([{ level: 'error', text: one.says() }]);
      expect(rig.releases()).toBe(1);
    });
  }

  it('says saving is off when a refusal came back with no folder at all', async () => {
    const rig = makeRig();
    rig.rows.add('lib/notes.md');
    rig.renameAnswer.value = Promise.resolve({
      ...renamedAnswer('outsideRoot'),
      writeRoot: null
    });
    rig.ops.drop(['docs/notes.md'], 'lib/', true);
    await flush();
    expect(toasts()).toEqual([
      { level: 'error', text: copy.remoteEntryWritesOff('Studio') }
    ]);
  });

  it('follows the move on done and says at info that it was not this call', async () => {
    const rig = makeRig();
    rig.rows.add('lib/notes.md');
    rig.renameAnswer.value = Promise.resolve(renamedAnswer('done'));
    rig.ops.drop(['docs/notes.md'], 'lib/', true);
    await flush();
    expect([...rig.rows]).toEqual(['lib/notes.md']);
    expect(toasts()).toEqual([
      { level: 'info', text: copy.remoteRenameAlreadyDone('Studio') }
    ]);
  });

  it('never says nothing was changed when the machine did not answer', async () => {
    const rig = makeRig();
    rig.rows.add('lib/notes.md');
    rig.renameAnswer.value = Promise.reject(new Error('no answer'));
    rig.ops.drop(['docs/notes.md'], 'lib/', true);
    await flush();
    expect([...rig.rows]).toEqual(['docs/notes.md']);
    expect(toasts()).toEqual([
      { level: 'error', text: copy.remoteEntryLostAnswer('Studio') }
    ]);
    // The sentence for a lost answer must not claim the machine is unchanged.
    expect(toasts()[0]?.text).not.toContain('Nothing was changed');
  });

  it('is per path and never all or nothing, and names the one that did not go', async () => {
    // A refused path leaves the others where they landed, which is the rule a
    // delete already follows: one write per entry, one sentence per refusal.
    const rig = makeRig();
    rig.rows.add('lib/notes.md');
    rig.rows.add('lib/plan.md');
    rig.renameAnswerFor.value = (fromAbs: string) =>
      Promise.resolve(
        renamedAnswer(fromAbs.endsWith('plan.md') ? 'exists' : 'moved')
      );
    rig.ops.drop(['docs/notes.md', 'docs/plan.md'], 'lib/', true);
    await flush();
    expect([...rig.rows].sort()).toEqual(['docs/plan.md', 'lib/notes.md']);
    expect(toasts()).toEqual([
      { level: 'error', text: copy.remoteEntryExists('plan.md', 'Studio') }
    ]);
  });

  it('asks no Replace question, because the far verb refuses a taken name', async () => {
    // `fs:move` answers `would-overwrite` and this Mac asks once. There is no
    // such answer over there: `entry-rename` refuses, which is what the menu's
    // Rename has done on a machine since Phase 102.
    const rig = makeRig();
    rig.rows.add('lib/notes.md');
    rig.renameAnswer.value = Promise.resolve(renamedAnswer('exists'));
    rig.ops.drop(['docs/notes.md'], 'lib/', true);
    await flush();
    expect(h.setConfirm).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. The two contracts a remote drag must not arm
// ---------------------------------------------------------------------------

describe('what a remote drag still refuses to arm', () => {
  const drag = read('use-tree-drag.ts');

  it('returns before the drag out and before beginTreeDrag', () => {
    const start = drag.slice(
      drag.indexOf('const onDragStart = useCallback('),
      drag.indexOf('const onDragOver = useCallback(')
    );
    const remoteGate = start.indexOf('if (isRemote) {');
    expect(remoteGate).toBeGreaterThan(-1);
    // Both contracts are composed BELOW the gate, so a remote drag reaches
    // neither. An absolute path from another machine names a file on this Mac
    // or nothing at all, which is what both of them would be handed.
    expect(start.indexOf('startNativeDragOut(e, dragged)')).toBeGreaterThan(
      remoteGate
    );
    expect(start.indexOf('beginTreeDrag(')).toBeGreaterThan(remoteGate);
    // And it holds the dragged set, so the host's own empty space drop still
    // means "move to the root of this folder".
    expect(start.slice(remoteGate)).toContain('dragPathsRef.current = dragged;');
  });

  it('no longer cancels the gesture, which is what Pierre moves the rows on', () => {
    expect(drag).not.toContain('if (e.defaultPrevented || isRemote) {');
    expect(drag).toContain('if (e.defaultPrevented) {');
  });

  it('still refuses a drop from OUTSIDE onto a machine, with its own sentence', () => {
    // Phase 154's import is untouched by this phase: a file from Finder has no
    // path on that machine and nothing copies it there.
    expect(drag).toContain('remoteTreeNoImport(');
  });
});
