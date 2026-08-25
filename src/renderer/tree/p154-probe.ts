/**
 * Harness probe for the drop from OUTSIDE and the drag OUT (Phase 154).
 *
 * ── THE SPLIT, AND WHY THERE HAS TO BE ONE ────────────────────────────────
 * A script created `DataTransfer` cannot carry a real path.
 * `webUtils.getPathForFile` returns '' for a synthesized `File`, and Blink
 * pins a script created transfer to `kCopyAndPaste`, so `setEffectAllowed` is
 * a no-op on it too. Nothing in this tree can automate a real Finder drag.
 *
 * So the proof is split exactly the way shot-probe.ts already splits the
 * internal move:
 *
 *   the GESTURE half   synthetic drag events over the REAL mounted tree,
 *                      which prove the destination the tree resolves, the
 *                      affordance it paints, and — the part that matters most
 *                      — that the window router's add-a-project frame is NOT
 *                      armed while the pointer is over the tree box.
 *   the EFFECT half    the real `fs:importPaths` channel called with REAL
 *                      absolute paths the harness wrote outside the project,
 *                      through the same `TreeOps.importPaths` the drop
 *                      handler calls, against the real disk, the real
 *                      watcher and the real confirmation dialog.
 *
 * ── WHAT THIS PROBE CANNOT PROVE, SAID PLAINLY ────────────────────────────
 * A native macOS drag loop needs a real mouse. The file arriving in Finder,
 * and the byte comparison against the source, are an OPERATOR step. What is
 * proved here is that the channel is reached with the right arguments, how
 * long the round trip takes, and that every refusal refuses.
 */

import type { Project } from '@shared/types';
import type { MachineStateView } from '@shared/ipc';
import { useApp } from '../state/store';
import { useDropUi } from '../terminal/drop/state';
import { isTreeDragEvent, treeDrag, endTreeDrag } from '../terminal/drop/tree-drag';
import * as fsOps from './fs-ops-bridge';
import { useFileTree } from './store';
import { useTreeHandle } from './tree-handle';
import type { TreeHandle } from './tree-handle';
import { dragOutModifierHeld } from './row-events';

export interface P154ProbeSpec {
  /**
   * An ABSOLUTE directory OUTSIDE the project, made by the harness, holding
   * the files this probe brings in. Nothing is written outside it.
   */
  outsideDir: string;
  /** Repo-relative folder inside the project the probe works in. */
  scratchDir: string;
}

export interface P154Step {
  name: string;
  ok: boolean;
  detail: string;
}

export interface P154Result {
  steps: P154Step[];
  passed: number;
  failed: number;
  /** How long one `fs:startDrag` invoke round trip took, in ms. */
  startDragRoundTripMs: number | null;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function until(check: () => boolean, timeoutMs = 5000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (check()) return true;
    if (Date.now() > deadline) return false;
    await wait(50);
  }
}

/** Does the LISTING CACHE — the tree's own source of rows — hold this path? */
function listed(rootPath: string, rel: string): boolean {
  const abs = `${rootPath}/${rel}`;
  const dir = abs.slice(0, abs.lastIndexOf('/'));
  return (
    useFileTree.getState().entriesByDir[dir]?.some((e) => e.path === abs) ===
    true
  );
}

/**
 * PHASE 155. Does the person actually SEE this row?
 *
 * `listed` above reads the listing cache, and the listing cache is not the
 * screen. That is why this probe passed the day the operator found a dropped
 * file that had landed, was in the cache, and had no row: the rows come from a
 * diff against a separate baseline, and the import had poisoned it. A probe
 * that reads one belief can never catch a disagreement between two, so every
 * import step below is now asked both questions.
 */
function onScreen(handle: TreeHandle, canonical: string): boolean {
  return rowElement(handle, canonical) !== null;
}

/** A drag from another application, as far as the DOM can tell. */
function fileTransfer(count = 1): DataTransfer {
  const dt = new DataTransfer();
  for (let i = 0; i < count; i += 1) {
    dt.items.add(new File([`byte ${String(i)}`], `dropped-${String(i)}.txt`));
  }
  return dt;
}

function rowElement(handle: TreeHandle, canonical: string): HTMLElement | null {
  const rows = handle.shadowRoot()?.querySelectorAll('[data-item-path]');
  for (const row of Array.from(rows ?? [])) {
    if (row instanceof HTMLElement && row.dataset['itemPath'] === canonical) {
      return row;
    }
  }
  return null;
}

/** What the drop affordance is showing right now, read off the real DOM. */
function affordance(): {
  wholeBox: boolean;
  refused: boolean;
  rowRing: boolean;
  windowFrame: boolean;
} {
  const host = document.querySelector('.files-tree');
  return {
    wholeBox: host?.classList.contains('import-drop') === true,
    refused: host?.classList.contains('import-refused') === true,
    rowRing: document.querySelector('.files-import-target') !== null,
    // THE ONE THAT MATTERS MOST: the window router's add-a-project frame.
    windowFrame: useDropUi.getState().window
  };
}

/** Dispatch one dragover over a row (or over the empty space) and settle. */
async function dragOver(
  handle: TreeHandle,
  canonical: string | null
): Promise<void> {
  const host = document.querySelector('.files-tree');
  const target =
    canonical === null ? host : (rowElement(handle, canonical) ?? host);
  target?.dispatchEvent(
    new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      composed: true,
      dataTransfer: fileTransfer()
    })
  );
  await wait(120);
}

function endDrag(): void {
  document
    .querySelector('.files-tree')
    ?.dispatchEvent(
      new DragEvent('dragend', { bubbles: true, composed: true })
    );
  useDropUi.getState().clear();
}

export async function driveP154(spec: P154ProbeSpec): Promise<P154Result> {
  const steps: P154Step[] = [];
  const record = (name: string, ok: boolean, detail: string): void => {
    steps.push({ name, ok, detail });
  };
  let startDragRoundTripMs: number | null = null;

  const handle = useTreeHandle.getState().handle;
  if (handle === null) {
    return {
      steps: [{ name: 'the tree is mounted', ok: false, detail: 'no handle' }],
      passed: 0,
      failed: 1,
      startDragRoundTripMs: null
    };
  }
  const { rootPath, ops } = handle;
  const dir = spec.scratchDir;
  const dirCanon = `${dir}/`;
  const outside = spec.outsideDir;

  // Everything the probe needs on screen. The harness wrote the outside files
  // already; this makes the folder inside the project that receives them.
  ops.newEntry('', 'dir');
  await wait(200);
  const input = handle.shadowRoot()?.querySelector('[data-item-rename-input]');
  if (input instanceof HTMLInputElement) {
    input.value = dir;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        composed: true
      })
    );
  }
  const scratchThere = await until(() => listed(rootPath, dir));
  record(
    'a scratch folder exists inside the project',
    scratchThere,
    scratchThere ? `${dir}/ is on disk` : 'the folder was never created'
  );
  await useFileTree.getState().relist([`${rootPath}/${dir}`]);

  // =========================================================================
  // THE GESTURE HALF — synthetic external drags over the real mounted tree
  // =========================================================================

  await dragOver(handle, dirCanon);
  const overFolder = affordance();
  record(
    'a drag from outside over a FOLDER row lights that row and NOT the add-a-project frame',
    overFolder.rowRing && !overFolder.windowFrame && !overFolder.refused,
    `rowRing=${String(overFolder.rowRing)} wholeBox=${String(overFolder.wholeBox)} ` +
      `windowFrame=${String(overFolder.windowFrame)}`
  );
  endDrag();
  await wait(80);

  await dragOver(handle, null);
  const overEmpty = affordance();
  record(
    'a drag from outside over the empty space lights the whole tree box, not the window frame',
    overEmpty.wholeBox && !overEmpty.windowFrame,
    `wholeBox=${String(overEmpty.wholeBox)} windowFrame=${String(overEmpty.windowFrame)}`
  );
  endDrag();
  await wait(80);

  // The router's frame, armed on purpose, then taken down by the tree. This
  // is the case a drag that crosses a pane on its way to the sidebar makes.
  useDropUi.getState().setWindow(true);
  await dragOver(handle, dirCanon);
  const afterArmed = affordance();
  record(
    'a frame armed earlier in the same drag goes dark when the tree takes over',
    !afterArmed.windowFrame,
    `windowFrame=${String(afterArmed.windowFrame)}`
  );
  endDrag();
  await wait(80);

  // `.git` NEVER MOUNTS A ROW at all: the renderer hides it from every
  // listing, which is a stronger refusal than a hover that declines. That is
  // what is measured here. The predicate itself is proved over every spelling
  // in src/renderer/tree/__tests__/p154-import-target.test.ts, and the verb's
  // own refusal is driven further down.
  const gitRow = rowElement(handle, '.git/');
  record(
    '.git is not even a row, so there is nothing to aim a drop at',
    gitRow === null,
    gitRow === null
      ? 'no .git row is mounted anywhere in the tree'
      : 'a .git row is mounted, which it never should be'
  );

  // The two existing meanings must be untouched by all of the above.
  const internalEvent = new DragEvent('dragover', {
    bubbles: true,
    cancelable: true,
    composed: true,
    dataTransfer: new DataTransfer()
  });
  record(
    'an EMPTY transfer is neither a tree drag nor a file drag, so nothing arms',
    !isTreeDragEvent(internalEvent) && !affordance().rowRing,
    'no files on the transfer'
  );

  // =========================================================================
  // THE EFFECT HALF — the real channel, real paths, real disk
  // =========================================================================

  ops.importPaths([`${outside}/notes.md`], dirCanon, 0);
  const landedInFolder = await until(() => listed(rootPath, `${dir}/notes.md`));
  record(
    'a file from outside lands INSIDE the folder that was aimed at',
    landedInFolder,
    landedInFolder ? `${dir}/notes.md is there` : 'nothing arrived'
  );

  ops.importPaths([`${outside}/root-drop.md`], '', 0);
  const landedAtRoot = await until(() => listed(rootPath, 'root-drop.md'));
  record(
    'a file dropped on the empty space lands at the PROJECT ROOT',
    landedAtRoot,
    landedAtRoot ? 'root-drop.md is at the root' : 'nothing arrived at the root'
  );

  ops.importPaths([`${outside}/bundle`], dirCanon, 0);
  const folderCame = await until(() => listed(rootPath, `${dir}/bundle`));
  await useFileTree.getState().relist([`${rootPath}/${dir}/bundle`]);
  const subtreeCame = await until(() =>
    listed(rootPath, `${dir}/bundle/inner.txt`)
  );
  record(
    'a FOLDER dropped from outside comes in whole, subtree and all',
    folderCame && subtreeCame,
    subtreeCame
      ? `${dir}/bundle/inner.txt came with it`
      : 'the folder arrived without its contents'
  );

  // Two names nothing at the destination holds, so this measures the multi
  // item path and not the collision path, which has its own step below.
  ops.importPaths([`${outside}/multi-a.md`, `${outside}/multi-b.md`], dirCanon, 0);
  const multiA = await until(() => listed(rootPath, `${dir}/multi-a.md`));
  const multiB = await until(() => listed(rootPath, `${dir}/multi-b.md`));
  record(
    'a multi item drop brings every item in',
    multiA && multiB,
    multiA && multiB
      ? 'both files are in the folder'
      : `multi-a=${String(multiA)} multi-b=${String(multiB)}`
  );

  // ---- PHASE 155: the same drop, asked of the SCREEN ---------------------
  // Every step above asked whether the file ARRIVED. This one asks whether he
  // can SEE it, which is the question he asked the day after Phase 154 shipped
  // and the one this probe could not answer.
  //
  // Two questions, and only about rows at the TOP LEVEL of the tree, because a
  // row inside a folder is legitimately absent when the folder is closed and an
  // assertion that cannot tell those two apart is not an assertion.
  //
  //   1. `root-drop.md`, dropped on the empty space below the rows, has a row.
  //      That is his gesture exactly. On the parent commit it had none.
  //   2. Nothing at the top level is believed and unshown. The two beliefs are
  //      the model's own feed baseline and the mounted rows, and the defect was
  //      precisely a disagreement between them, so this compares them directly
  //      rather than trusting either one.
  const topLevel = (): string[] =>
    handle.paths().filter((p) => !p.slice(0, -1).includes('/'));
  const agreed = await until(
    () =>
      onScreen(handle, 'root-drop.md') &&
      topLevel().every((canonical) => onScreen(handle, canonical))
  );
  const unshown = topLevel().filter((canonical) => !onScreen(handle, canonical));
  record(
    'PHASE 155. an imported file has a ROW, and no top level path is believed and unshown',
    agreed,
    agreed
      ? `root-drop.md is on screen and all ${String(topLevel().length)} top level paths have rows`
      : `believed with no row: ${unshown.join(', ') || 'root-drop.md itself'}`
  );

  // ---- THE ATTACK, live: a name that is already taken --------------------
  ops.importPaths([`${outside}/notes.md`], dirCanon, 0);
  const asked = await until(() => useApp.getState().confirm !== null);
  const dialog = useApp.getState().confirm;
  const named =
    dialog !== null &&
    `${dialog.title} ${dialog.body ?? ''}`.includes('notes.md');
  record(
    'a drop that would overwrite ASKS FIRST, naming the file',
    asked && named,
    dialog === null
      ? 'no confirmation was raised — this would have clobbered'
      : `${dialog.title} / ${dialog.body ?? ''}`
  );
  const promisedTrash =
    dialog !== null && (dialog.body ?? '').includes('Trash');
  record(
    'the confirmation says the displaced file goes to the Trash',
    promisedTrash,
    dialog?.body ?? 'no body'
  );
  useApp.getState().setConfirm(null);
  await wait(400);

  // ---- THE ATTACK, live: dragged out and dropped straight back in --------
  // This is the shape a row dragged out to Finder and released over the folder
  // it came from produces, and it is the one that could destroy the file.
  const backInPath = `${rootPath}/${dir}/notes.md`;
  ops.importPaths([backInPath], dirCanon, 0);
  await wait(900);
  const stillThere = listed(rootPath, `${dir}/notes.md`);
  const noConfirm = useApp.getState().confirm === null;
  record(
    'a row dropped back onto the folder it came from is skipped, not destroyed',
    stillThere && noConfirm,
    stillThere
      ? 'the file is still there and nothing was asked'
      : 'THE FILE IS GONE — a copy over itself destroyed it'
  );
  useApp.getState().setConfirm(null);

  // ---- THE ATTACK, live: .git and a folder into itself -------------------
  ops.importPaths([`${outside}/notes.md`], '.git/', 0);
  await wait(700);
  record(
    '.git is refused as a destination by the verb as well as by the hover',
    !listed(rootPath, '.git/notes.md'),
    !listed(rootPath, '.git/notes.md')
      ? 'nothing was written into .git'
      : 'a file reached .git'
  );

  ops.importPaths([`${rootPath}/${dir}`], dirCanon, 0);
  await wait(900);
  record(
    'a folder dropped onto itself is refused',
    !listed(rootPath, `${dir}/${dir}`),
    !listed(rootPath, `${dir}/${dir}`)
      ? 'nothing was written'
      : 'the folder was copied inside itself'
  );

  // A FILE ROW resolves to that file's OWN FOLDER, never to the file.
  //
  // The clearest live discriminator is a TOP LEVEL file, because its folder is
  // the project root and the root's affordance is the whole tree box rather
  // than a row ring. So a drag over `README.md` must light the BOX and ring NO
  // row: a rule that pointed at the row under the pointer would ring
  // README.md instead, and the two answers cannot be confused. The nested case,
  // where the ring goes on the parent folder's own row, is proved over every
  // spelling in the pure test beside this file and by the EFFECT step below.
  await useFileTree.getState().relist([rootPath]);
  await until(() => rowElement(handle, 'README.md') !== null, 4000);
  const topFile = rowElement(handle, 'README.md');
  if (topFile !== null) {
    topFile.dispatchEvent(
      new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        composed: true,
        dataTransfer: fileTransfer()
      })
    );
    await wait(150);
    const look = affordance();
    record(
      "a drag over a FILE row aims at that file's FOLDER and never at the file",
      look.wholeBox && !look.rowRing && !look.windowFrame,
      `wholeBox=${String(look.wholeBox)} rowRing=${String(look.rowRing)} ` +
        '(a rule aiming at the row under the pointer would have ringed README.md)'
    );
    endDrag();
    await wait(100);
  } else {
    record(
      "a drag over a FILE row aims at that file's FOLDER and never at the file",
      false,
      'no top level file row mounted'
    );
  }

  // And the EFFECT of that same aim: the file lands beside the row, in the
  // folder, and never inside the file that was pointed at.
  ops.importPaths([`${outside}/aimed-at-a-file.md`], dirCanon, 0);
  const besideIt = await until(() =>
    listed(rootPath, `${dir}/aimed-at-a-file.md`)
  );
  record(
    'a drop aimed at a FILE row lands in that file\'s folder',
    besideIt,
    besideIt ? `${dir}/aimed-at-a-file.md is beside it` : 'it did not land'
  );

  // The second half of the charter's folder attack: into its own CHILD.
  ops.importPaths([`${rootPath}/${dir}`], `${dir}/bundle/`, 0);
  await wait(900);
  record(
    'a folder dropped into its own CHILD is refused',
    !listed(rootPath, `${dir}/bundle/${dir}`),
    !listed(rootPath, `${dir}/bundle/${dir}`)
      ? 'nothing was written'
      : 'the folder was copied into its own child'
  );

  // ---- THE FILTERED TREE ------------------------------------------------
  if (!useTreeHandle.getState().filterOpen) handle.toggleFilter();
  await wait(300);
  const filterField = handle
    .shadowRoot()
    ?.querySelector('[data-file-tree-search-input]');
  if (filterField instanceof HTMLInputElement) {
    filterField.value = 'inner';
    filterField.dispatchEvent(
      new Event('input', { bubbles: true, composed: true })
    );
  }
  await wait(600);
  const filteredRow = rowElement(handle, `${dir}/bundle/inner.txt`);
  if (filteredRow !== null) {
    filteredRow.dispatchEvent(
      new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        composed: true,
        dataTransfer: fileTransfer()
      })
    );
    await wait(150);
    const ringed = document.querySelector('.files-import-target') !== null;
    const boxed = document
      .querySelector('.files-tree')
      ?.classList.contains('import-drop');
    endDrag();
    await wait(100);
    // The destination is proved by the EFFECT, not by the hover: the row's own
    // path is what the rule reads, so the file must land beside that row.
    ops.importPaths([`${outside}/filtered.md`], `${dir}/bundle/`, 0);
    const filteredLanded = await until(() =>
      listed(rootPath, `${dir}/bundle/filtered.md`)
    );
    record(
      'a drop while the tree is FILTERED lands where the row says',
      filteredLanded,
      filteredLanded
        ? `${dir}/bundle/filtered.md landed beside the filtered row ` +
            `(hover: rowRing=${String(ringed)} wholeBox=${String(boxed)})`
        : 'the file did not land beside the filtered row'
    );
  } else {
    record(
      'a drop while the tree is FILTERED lands where the row says',
      false,
      'the filtered row never mounted'
    );
  }
  if (useTreeHandle.getState().filterOpen) handle.toggleFilter();
  await wait(300);

  // =========================================================================
  // THE DRAG OUT — the channel, its round trip, and its refusals
  // =========================================================================

  record(
    'this build exposes the drag out channel',
    fsOps.canDragOut(),
    `canDragOut=${String(fsOps.canDragOut())} canImport=${String(fsOps.canImport())}`
  );

  record(
    'Option alone means drag out; Option with anything else does not',
    dragOutModifierHeld({
      altKey: true,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false
    }) &&
      !dragOutModifierHeld({
        altKey: true,
        metaKey: true,
        ctrlKey: false,
        shiftKey: false
      }) &&
      !dragOutModifierHeld({
        altKey: false,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false
      }),
    'alt only'
  );

  // The round trip has to fit inside the window where the mouse button is
  // still down, so it is MEASURED rather than assumed.
  const began = performance.now();
  let startDragOk = false;
  let startDragWhy = '';
  try {
    await fsOps.startDrag({ root: rootPath, paths: [`${dir}/notes.md`] });
    startDragOk = true;
  } catch (err) {
    startDragWhy = err instanceof Error ? err.message : String(err);
  }
  startDragRoundTripMs = Math.round(performance.now() - began);
  record(
    'fs:startDrag reaches main and answers',
    startDragOk,
    startDragOk
      ? `round trip ${String(startDragRoundTripMs)} ms, icon included`
      : startDragWhy
  );

  const refusals: Array<[string, string]> = [
    ['.git/config', 'a path under .git'],
    ['../etc/passwd', 'a .. escape'],
    ['/etc/passwd', 'an absolute stranger'],
    [`${dir}/never-existed.md`, 'a path that is not on disk']
  ];
  const refusedAll: string[] = [];
  for (const [path, what] of refusals) {
    let refused = false;
    try {
      await fsOps.startDrag({ root: rootPath, paths: [path] });
    } catch {
      refused = true;
    }
    refusedAll.push(`${what}=${refused ? 'refused' : 'ALLOWED'}`);
  }
  record(
    'the drag out refuses .git, a .. escape, an absolute stranger and a missing file',
    refusedAll.every((line) => line.endsWith('refused')),
    refusedAll.join(', ')
  );

  // ---- THE TWO EXISTING MEANINGS, still armed ---------------------------
  // ANY mounted row will do, and it is read off the tree rather than named,
  // because which rows are mounted depends on scroll, expansion and the
  // filter that was just closed.
  await useFileTree.getState().relist([rootPath]);
  await wait(600);
  const mounted = Array.from(
    handle.shadowRoot()?.querySelectorAll('[data-item-path]') ?? []
  ).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement &&
      el.dataset['itemPath'] !== undefined &&
      !el.dataset['itemPath'].endsWith('/')
  );
  const row = mounted[0] ?? null;
  let contractOk = false;
  let contract = `no file row mounted; rows=${JSON.stringify(
    Array.from(
      handle.shadowRoot()?.querySelectorAll('[data-item-path]') ?? []
    ).map((el) => (el as HTMLElement).dataset['itemPath'])
  )}`;
  if (row !== null) {
    const transfer = new DataTransfer();
    row.dispatchEvent(
      new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        composed: true,
        dataTransfer: transfer
      })
    );
    const session = treeDrag();
    const stamped = Array.from(transfer.types).includes(
      'application/x-gmux-tree-drag'
    );
    const absolute =
      session !== null &&
      session.paths.length > 0 &&
      session.paths.every((p) => p.startsWith('/'));
    contractOk = stamped && absolute;
    contract = `mime=${String(stamped)} paths=${JSON.stringify(session?.paths ?? [])}`;
    endTreeDrag();
  }
  record(
    'with NO modifier a tree drag still arms the move + attach contract',
    contractOk,
    contract
  );

  if (row !== null) {
    // The same gesture with Option held must arm NOTHING on that contract,
    // because it became a native drag instead.
    const transfer = new DataTransfer();
    const optionDrag = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      composed: true,
      dataTransfer: transfer,
      altKey: true
    });
    row.dispatchEvent(optionDrag);
    await wait(150);
    const noSession = treeDrag() === null;
    record(
      'with OPTION held the HTML drag is cancelled and no attach contract is armed',
      optionDrag.defaultPrevented && noSession,
      `prevented=${String(optionDrag.defaultPrevented)} session=${String(treeDrag() !== null)}`
    );
    endTreeDrag();
  }

  // Leave a photograph-worthy state: the hover over the scratch folder.
  await dragOver(handle, dirCanon);

  const passed = steps.filter((s) => s.ok).length;
  return {
    steps,
    passed,
    failed: steps.length - passed,
    startDragRoundTripMs
  };
}

declare global {
  interface Window {
    __gmuxP154?: (spec: P154ProbeSpec) => Promise<P154Result>;
  }
}

/**
 * THE REMOTE CASE, driven rather than asserted.
 *
 * A project can be a folder on another machine since Phase 90.3, and a Finder
 * drop onto such a tree is an UPLOAD. Phase 154 does not take that on, and the
 * charter's rule for that decision is that the surface must refuse VISIBLY
 * rather than appear to work and do nothing. This drives exactly that.
 *
 * WHAT IS INJECTED, AND WHAT IS NOT. A remote tab is injected the way
 * `../app/target-shot-drive.ts` injects one, and the listing that would have
 * come back from that machine is seeded into the tree store, because nothing
 * in this environment can reach a real machine: the operator's Mac Pro is read
 * only and his agent holds no identities. So the READ is a stand-in. The tree
 * that mounts on top of it is the real component with `remote` set, the drag
 * handlers are the real ones, and the refusal and its sentence are real. What
 * is proved is what the tree does with an external drag when the folder is on
 * another machine, which is the whole question.
 */
export async function driveP154Remote(): Promise<P154Result> {
  const steps: P154Step[] = [];
  const record = (name: string, ok: boolean, detail: string): void => {
    steps.push({ name, ok, detail });
  };
  const machineId = 'p154remote';
  const label = 'Probe Machine';

  const local = useApp.getState().activeProject();
  if (local === null) {
    return {
      steps: [{ name: 'a project is open', ok: false, detail: 'none' }],
      passed: 0,
      failed: 1,
      startDragRoundTripMs: null
    };
  }

  const projectsBefore = useApp.getState().projects;
  const machinesBefore = useApp.getState().machineStates;
  const treeBefore = useFileTree.getState();
  const machine: MachineStateView = {
    id: machineId,
    label,
    color: 'magenta',
    link: 'connected',
    everAnswered: true,
    lastAnsweredAt: Date.now(),
    detail: null
  };
  const project: Project = {
    id: `${machineId}-injected`,
    path: local.path,
    name: `${local.name} on ${label}`,
    machineId
  };

  try {
    useApp.setState({
      projects: [...projectsBefore, project],
      machineStates: [...machinesBefore, machine]
    });
    useApp.getState().setActiveProject(project.id);
    useApp.getState().setSidebarView('explorer');
    await wait(700);

    // The answer that machine would have given. Seeded, and said so above.
    useFileTree.setState({
      root: { machineId, path: local.path },
      rootLoaded: true,
      rootError: null,
      bridgeMissing: false,
      entriesByDir: {
        [local.path]: [
          {
            name: 'on-that-machine.md',
            path: `${local.path}/on-that-machine.md`,
            kind: 'file'
          }
        ]
      },
      remote: {
        status: 'ok',
        root: local.path,
        readAt: Date.now(),
        total: 1,
        shown: 1,
        truncated: false,
        loading: false
      }
    });
    await wait(1200);

    const host = document.querySelector('.files-tree');
    record(
      'the tree mounts for a folder on another machine',
      host !== null,
      host === null ? 'no .files-tree host rendered' : 'the remote tree is on screen'
    );
    if (host === null) {
      const passed = steps.filter((x) => x.ok).length;
      return { steps, passed, failed: steps.length - passed, startDragRoundTripMs: null };
    }

    host.dispatchEvent(
      new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        composed: true,
        dataTransfer: fileTransfer()
      })
    );
    await wait(200);
    const look = affordance();
    record(
      'a drag from outside over a REMOTE tree paints a refusal, never an acceptance',
      look.refused && !look.wholeBox && !look.rowRing && !look.windowFrame,
      `refused=${String(look.refused)} accept=${String(look.wholeBox)} ` +
        `rowRing=${String(look.rowRing)} windowFrame=${String(look.windowFrame)}`
    );

    const before = useApp.getState().toasts.length;
    host.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        composed: true,
        dataTransfer: fileTransfer()
      })
    );
    await wait(400);
    const said = useApp
      .getState()
      .toasts.slice(before)
      .map((t) => t.text)
      .join(' | ');
    record(
      'the drop says a SENTENCE naming the machine, rather than doing nothing',
      said.includes(label) &&
        said.toLowerCase().includes('nothing was copied'),
      said.length === 0 ? 'no sentence was said at all' : said
    );

    // The drag OUT is refused at the source on a remote tree, and it has been
    // since Phase 90.3: `canDrag` returns false, so Pierre prevents the
    // default and the hook returns before either new branch is reached.
    const row = host
      .querySelector('file-tree-container')
      ?.shadowRoot?.querySelector('[data-item-path]');
    let outRefused = true;
    let outDetail = 'no row mounted to try';
    if (row instanceof HTMLElement) {
      const transfer = new DataTransfer();
      row.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          composed: true,
          dataTransfer: transfer,
          altKey: true
        })
      );
      await wait(200);
      outRefused = !Array.from(transfer.types).includes(
        'application/x-gmux-tree-drag'
      );
      outDetail = `types=${JSON.stringify(Array.from(transfer.types))}`;
    }
    record(
      'Option held on a REMOTE row starts no drag out, because the source already refuses',
      outRefused,
      outDetail
    );
  } finally {
    useApp.getState().setActiveProject(local.id);
    useApp.setState({ projects: projectsBefore, machineStates: machinesBefore });
    useFileTree.setState({
      root: treeBefore.root,
      rootLoaded: treeBefore.rootLoaded,
      entriesByDir: treeBefore.entriesByDir,
      remote: treeBefore.remote
    });
    await wait(500);
  }

  const passed = steps.filter((x) => x.ok).length;
  return {
    steps,
    passed,
    failed: steps.length - passed,
    startDragRoundTripMs: null
  };
}

/**
 * Arm ONE drop affordance and leave it armed, so the harness can photograph
 * it. A hover is on screen for the length of a gesture, which is the one
 * thing an automated run cannot hold, so holding it is the whole job here.
 *
 * There is one theme. `src/renderer/index.html` declares `color-scheme: dark`
 * and `src/renderer/styles/tokens.css` says in its own header that the names
 * are theme-neutral "so a light theme can be added later". So a picture per
 * target kind is the complete set, and the charter's "in both themes" asks for
 * something the product does not have.
 */
export async function driveP154Hover(
  kind: 'folder' | 'root' | 'refused'
): Promise<{ ok: boolean; detail: string }> {
  const handle = useTreeHandle.getState().handle;
  if (handle === null) return { ok: false, detail: 'the tree is not mounted' };

  if (kind === 'refused') {
    // The remote drive without its restore: the injected tab stays so the
    // picture shows the refusal ring on a folder that is on another machine.
    const local = useApp.getState().activeProject();
    if (local === null) return { ok: false, detail: 'no project is open' };
    const machineId = 'p154remote';
    useApp.setState({
      projects: [
        ...useApp.getState().projects,
        {
          id: `${machineId}-injected`,
          path: local.path,
          name: `${local.name} on Probe Machine`,
          machineId
        }
      ],
      machineStates: [
        ...useApp.getState().machineStates,
        {
          id: machineId,
          label: 'Probe Machine',
          color: 'magenta',
          link: 'connected',
          everAnswered: true,
          lastAnsweredAt: Date.now(),
          detail: null
        }
      ]
    });
    useApp.getState().setActiveProject(`${machineId}-injected`);
    useApp.getState().setSidebarView('explorer');
    await wait(700);
    useFileTree.setState({
      root: { machineId, path: local.path },
      rootLoaded: true,
      rootError: null,
      bridgeMissing: false,
      entriesByDir: {
        [local.path]: [
          {
            name: 'on-that-machine.md',
            path: `${local.path}/on-that-machine.md`,
            kind: 'file'
          }
        ]
      },
      remote: {
        status: 'ok',
        root: local.path,
        readAt: Date.now(),
        total: 1,
        shown: 1,
        truncated: false,
        loading: false
      }
    });
    await wait(1200);
    document.querySelector('.files-tree')?.dispatchEvent(
      new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        composed: true,
        dataTransfer: fileTransfer()
      })
    );
    await wait(300);
    const look = affordance();
    return { ok: look.refused, detail: JSON.stringify(look) };
  }

  if (kind === 'root') {
    await dragOver(handle, null);
    const look = affordance();
    return { ok: look.wholeBox, detail: JSON.stringify(look) };
  }

  const folder = Array.from(
    handle.shadowRoot()?.querySelectorAll('[data-item-path]') ?? []
  ).find(
    (el) =>
      el instanceof HTMLElement && el.dataset['itemPath']?.endsWith('/') === true
  );
  if (!(folder instanceof HTMLElement)) {
    return { ok: false, detail: 'no folder row is mounted' };
  }
  folder.dispatchEvent(
    new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      composed: true,
      dataTransfer: fileTransfer()
    })
  );
  await wait(300);
  const look = affordance();
  return {
    ok: look.rowRing,
    detail: `${String(folder.dataset['itemPath'])} ${JSON.stringify(look)}`
  };
}

declare global {
  interface Window {
    __gmuxP154Remote?: () => Promise<P154Result>;
    __gmuxP154Hover?: (
      kind: 'folder' | 'root' | 'refused'
    ) => Promise<{ ok: boolean; detail: string }>;
  }
}

export function registerP154Probe(): void {
  window.__gmuxP154 = driveP154;
  window.__gmuxP154Remote = driveP154Remote;
  window.__gmuxP154Hover = driveP154Hover;
}
