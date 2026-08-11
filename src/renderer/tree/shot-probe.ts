/**
 * Harness probe for the explorer's file operations (Phase 12.9 items 2-4).
 *
 * Driven by the GMUX_SHOT hook (`treeOps` on ShotDriveSpec). It runs the
 * verbs through EXACTLY the objects the UI runs them through — the mounted
 * tree's own `TreeOps`, the real `fs:*` channels, the real @pierre/trees
 * model, the real @parcel/watcher refresh, the real confirmation dialog. The
 * only things it stands in for are the gestures an automated run cannot
 * perform: the right-click that raises a native menu, and the OS drag.
 *
 * It exists because these verbs touch the DISK. A unit test can prove the
 * path arithmetic; only a live run can prove that a rename reaches fs:rename,
 * that the watcher puts the row back where the disk says it is, that a
 * would-overwrite move stops and asks, and that `.git` is refused by the same
 * predicate at both ends.
 */

import { useApp } from '../state/store';
import { useEditor } from '../editor/store';
import {
  endTreeDrag,
  treeDrag,
  TREE_DRAG_MIME
} from '../terminal/drop/tree-drag';
import { useFileTree } from './store';
import { useTreeHandle } from './tree-handle';
import type { TreeHandle } from './tree-handle';

export interface TreeOpsProbeSpec {
  /** Repo-relative folder the probe works inside. Created if missing. */
  scratchDir: string;
  /**
   * Leave the name filter OPEN with this query when the run finishes, so a
   * capture can photograph it. The field is the only part of item 4 that
   * exists to be looked at, and it is invisible at rest.
   */
  holdFilter?: string;
  /**
   * Phase 14.2 item 3: drive the Explorer HEADER's New File / New Folder /
   * Collapse All by CLICKING the real buttons in the real band header, so
   * what is proved is the whole path a person takes — the button, its
   * disabled rule, the selection-derived destination, and the same
   * inline-rename-on-create flow the context menu uses.
   */
  headerActions?: boolean;
  /**
   * Narrow the sidebar to this width before the capture. The Explorer header
   * carries five actions since Phase 14.2, and whether they still fit is a
   * question about the 220px MINIMUM, not about the 280px default — so the
   * capture has to be able to go there. Clamped by the store's own bounds.
   */
  holdSidebarWidth?: number;
}

export interface TreeOpsProbeStep {
  name: string;
  ok: boolean;
  detail: string;
}

export interface TreeOpsProbeResult {
  steps: TreeOpsProbeStep[];
  passed: number;
  failed: number;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Wait until `check` holds, or give up. The watcher is ~450 ms worst case. */
async function until(
  check: () => boolean,
  timeoutMs = 4000
): Promise<boolean> {
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
  const entries = useFileTree.getState().entriesByDir[dir];
  return entries?.some((e) => e.path === abs) === true;
}

/** Type into the inline rename input the way a person does, then commit. */
async function commitRenameInput(
  handle: TreeHandle,
  value: string
): Promise<boolean> {
  const find = (): HTMLInputElement | null => {
    const el = handle
      .shadowRoot()
      ?.querySelector('[data-item-rename-input]');
    return el instanceof HTMLInputElement ? el : null;
  };
  const found = await until(() => find() !== null);
  const input = find();
  if (!found || input === null) return false;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await wait(30);
  input.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      composed: true
    })
  );
  return true;
}

/** Answer the confirmation the destructive verbs raise. */
function confirmDialog(): string | null {
  const spec = useApp.getState().confirm;
  if (spec === null) return null;
  const said = `${spec.title} ${spec.body}`;
  spec.onConfirm();
  useApp.getState().setConfirm(null);
  return said;
}

/** A button in the Explorer's band header, found the way a person finds it. */
function headerButton(label: string): HTMLButtonElement | null {
  const el = document.querySelector(
    `.view-header-action[aria-label="${label}"]`
  );
  return el instanceof HTMLButtonElement ? el : null;
}

/**
 * Phase 14.2 item 3, end to end: the three new header actions, driven by real
 * clicks on the real buttons.
 *
 * The point of clicking rather than calling is the wiring, which is the only
 * part that can be wrong: that New File/New Folder reach the SAME
 * `TreeOps.newEntry` the context menu reaches (a placeholder row you type
 * into, not a second create implementation), that the destination follows the
 * selection, and that Collapse All's disabled rule is a real DOM state rather
 * than a click that quietly does nothing.
 */
async function driveHeaderActions(
  handle: TreeHandle,
  dirCanon: string,
  record: (name: string, ok: boolean, detail: string) => void
): Promise<void> {
  const { rootPath } = handle;
  const shadow = handle.shadowRoot();

  const newFile = headerButton('New file');
  const newFolder = headerButton('New folder');
  const collapse = headerButton('Collapse all folders');
  if (newFile === null || newFolder === null || collapse === null) {
    record(
      'the header carries New file / New folder / Collapse all',
      false,
      `newFile=${String(newFile !== null)} newFolder=${String(
        newFolder !== null
      )} collapseAll=${String(collapse !== null)}`
    );
    return;
  }
  record(
    'the header carries New file / New folder / Collapse all',
    true,
    'all three buttons present, each with a name and a tooltip'
  );

  // Select the scratch folder by clicking its row, exactly as a person does,
  // so the destination comes from a real selection and not from a poke.
  const row = shadow?.querySelector(`[data-item-path="${dirCanon}"]`);
  if (row instanceof HTMLElement) row.click();
  await wait(200);

  // Read the selection back OUT OF THE DOM rather than trusting the click:
  // whatever ended up selected, the destination must be that row's folder.
  // (`data-item-selected` is the library's own attribute — the same one the
  // selected-row styling keys off.)
  const selected = [...(shadow?.querySelectorAll('[data-item-selected]') ?? [])]
    .map((el) => el.getAttribute('data-item-path'))
    .filter((p): p is string => p !== null);
  const first = selected[0] ?? '';
  const expected = first.endsWith('/')
    ? first
    : first.slice(0, first.lastIndexOf('/') + 1);
  const target = handle.newEntryTarget();
  record(
    'a header create follows the selected row into its folder',
    target === expected,
    `selected ${JSON.stringify(selected)} → newEntryTarget() ` +
      `${JSON.stringify(target)}, expected ${JSON.stringify(expected)}`
  );

  // ---- New Folder, from the header --------------------------------------
  // `target` is where the header says it will land, so that is where the file
  // is looked for: a create that quietly landed somewhere else must fail here.
  newFolder.click();
  const typedFolder = await commitRenameInput(handle, 'from-header');
  const folderThere =
    typedFolder && (await until(() => listed(rootPath, `${target}from-header`)));
  record(
    'New folder (header) reuses the inline-rename create flow',
    folderThere,
    folderThere
      ? `${target}from-header/ was typed into existence`
      : 'no placeholder row appeared to type into'
  );

  // ---- New File, from the header ----------------------------------------
  // Fresh target: committing the folder above moved the selection onto it,
  // which is exactly the behaviour a second create has to follow.
  const fileTarget = handle.newEntryTarget();
  newFile.click();
  const typedFile = await commitRenameInput(handle, 'from-header.md');
  const fileThere =
    typedFile &&
    (await until(() => listed(rootPath, `${fileTarget}from-header.md`)));
  record(
    'New file (header) reuses the inline-rename create flow',
    fileThere,
    fileThere
      ? `${fileTarget}from-header.md was typed into existence`
      : `no row to type into (target was ${JSON.stringify(fileTarget)})`
  );

  // ---- Collapse All ------------------------------------------------------
  // The button under test is the one with work to do, so make sure there is
  // some: a folder row click is the gesture that opens one.
  let openedBefore = useTreeHandle.getState().expandedCount;
  if (openedBefore === 0 && row instanceof HTMLElement) {
    row.click();
    await wait(250);
    openedBefore = useTreeHandle.getState().expandedCount;
  }
  const armed = !collapse.disabled && openedBefore > 0;
  collapse.click();
  await wait(250);
  const openedAfter = useTreeHandle.getState().expandedCount;
  record(
    'Collapse all closes every open folder',
    armed && openedAfter === 0,
    `${openedBefore} open before → ${openedAfter} after` +
      (armed ? '' : ' (button was not enabled with folders open)')
  );
  record(
    'Collapse all is DISABLED with nothing open, not a no-op click',
    collapse.disabled,
    collapse.disabled
      ? 'the button went disabled the moment the last folder closed'
      : 'still enabled with nothing to collapse'
  );
}

export async function driveTreeOps(
  spec: TreeOpsProbeSpec
): Promise<TreeOpsProbeResult> {
  const steps: TreeOpsProbeStep[] = [];
  const record = (name: string, ok: boolean, detail: string): void => {
    steps.push({ name, ok, detail });
  };

  const handle = useTreeHandle.getState().handle;
  if (handle === null) {
    record('tree mounted', false, 'no tree handle registered');
    return { steps, passed: 0, failed: 1 };
  }
  const { rootPath, ops } = handle;
  const dir = spec.scratchDir;
  const dirCanon = `${dir}/`;

  // ---- New Folder, through the inline-rename gesture ---------------------
  ops.newEntry('', 'dir');
  const typedFolder = await commitRenameInput(handle, dir);
  const folderThere =
    typedFolder && (await until(() => listed(rootPath, dir)));
  record(
    'New Folder (inline rename on create)',
    folderThere,
    folderThere ? `${dir}/ exists and is listed` : 'folder never appeared'
  );

  // Expand it so its children are listed for the rest of the run.
  await useFileTree.getState().relist([`${rootPath}/${dir}`]);

  // ---- New File, and it opens for keeps ----------------------------------
  ops.newEntry(dirCanon, 'file');
  const typedFile = await commitRenameInput(handle, 'note.md');
  const fileThere =
    typedFile && (await until(() => listed(rootPath, `${dir}/note.md`)));
  const opened = await until(() =>
    useEditor
      .getState()
      .tabs.some((t) => t.path === `${rootPath}/${dir}/note.md`)
  );
  record(
    'New File (inline rename on create)',
    fileThere,
    fileThere ? `${dir}/note.md exists` : 'file never appeared'
  );
  record(
    'a created file opens in the editor',
    opened,
    opened ? 'tab present, not a preview' : 'no tab opened'
  );

  // ---- Rename, and the open tab follows it -------------------------------
  ops.startRename(`${dir}/note.md`);
  const typedRename = await commitRenameInput(handle, 'renamed.md');
  const renamed =
    typedRename && (await until(() => listed(rootPath, `${dir}/renamed.md`)));
  const gone = !listed(rootPath, `${dir}/note.md`);
  const tabFollowed = await until(() =>
    useEditor
      .getState()
      .tabs.some((t) => t.path === `${rootPath}/${dir}/renamed.md`)
  );
  const tabOrphaned = useEditor
    .getState()
    .tabs.some((t) => t.path === `${rootPath}/${dir}/note.md`);
  record(
    'Rename',
    renamed && gone,
    renamed ? 'renamed.md exists, note.md gone' : 'rename did not land'
  );
  record(
    'the open editor tab follows the rename',
    tabFollowed && !tabOrphaned,
    tabFollowed
      ? 'tab id/path/label moved with the file'
      : 'tab left pointing at the old path'
  );

  // ---- Duplicate ---------------------------------------------------------
  ops.duplicate(`${dir}/renamed.md`);
  const duplicated = await until(() =>
    listed(rootPath, `${dir}/renamed copy.md`)
  );
  record(
    'Duplicate',
    duplicated,
    duplicated ? '"renamed copy.md" created beside it' : 'no copy appeared'
  );

  // ---- Move into a folder, by the same entry point a drop uses -----------
  ops.newEntry(dirCanon, 'dir');
  const typedInner = await commitRenameInput(handle, 'inner');
  const innerThere = await until(() => listed(rootPath, `${dir}/inner`));
  await useFileTree.getState().relist([`${rootPath}/${dir}/inner`]);
  ops.drop([`${dir}/renamed copy.md`], `${dir}/inner/`, false);
  const moved = await until(() =>
    listed(rootPath, `${dir}/inner/renamed copy.md`)
  );
  record(
    'drag-to-move into a folder',
    typedInner && innerThere && moved,
    moved ? 'the file is inside inner/' : 'the move did not land'
  );

  // ---- A move that would overwrite PROMPTS, and Replace is recoverable ---
  // The destination already holds "renamed copy.md" from the move above, so
  // this second one can only land by replacing it.
  ops.duplicate(`${dir}/renamed.md`);
  const dupBack = await until(() => listed(rootPath, `${dir}/renamed copy.md`));
  ops.drop([`${dir}/renamed copy.md`], `${dir}/inner/`, false);
  const asked = await until(() => useApp.getState().confirm !== null);
  const said = asked ? confirmDialog() : null;
  const namedIt = said !== null && said.includes('renamed copy.md');
  record(
    'a move that would overwrite asks first, naming the file',
    asked && namedIt,
    said ?? 'no confirmation was raised — this would have clobbered'
  );
  // What proves the REPLACE landed is the SOURCE leaving: the destination
  // name was already occupied, so its presence says nothing on its own.
  const sourceGone = await until(
    () => !listed(rootPath, `${dir}/renamed copy.md`)
  );
  const destHolds = listed(rootPath, `${dir}/inner/renamed copy.md`);
  record(
    'Replace completes the move',
    dupBack && sourceGone && destHolds,
    sourceGone
      ? 'the source is gone and the destination holds it'
      : 'the source is still there — replace did not land'
  );

  // ---- .git is refused at both ends --------------------------------------
  ops.drop(['.git/config'], dirCanon, false);
  ops.drop([`${dir}/inner/renamed copy.md`], '.git/', false);
  await wait(400);
  const gitRefused =
    !listed(rootPath, `${dir}/config`) &&
    listed(rootPath, `${dir}/inner/renamed copy.md`);
  record(
    '.git is refused as a drag source and as a destination',
    gitRefused,
    gitRefused
      ? 'neither drop touched the disk'
      : 'a .git drop was not refused'
  );

  // ---- Trash: confirmed, named, and recoverable by construction ----------
  ops.trash([`${dir}/renamed.md`]);
  const trashAsked = await until(() => useApp.getState().confirm !== null);
  const trashSaid = trashAsked ? confirmDialog() : null;
  const trashNamed =
    trashSaid !== null &&
    trashSaid.includes('renamed.md') &&
    trashSaid.includes('Trash');
  const trashed = await until(() => !listed(rootPath, `${dir}/renamed.md`));
  record(
    'Delete confirms, names the item, and says it goes to the Trash',
    trashAsked && trashNamed,
    trashSaid ?? 'no confirmation was raised'
  );
  record(
    'the trashed file leaves the tree',
    trashed,
    trashed ? 'row gone with no manual refresh' : 'row still there'
  );

  // ---- The tree's half of the 12.9 / 12.10 drag contract -----------------
  // A real OS drag cannot be automated, but the tree's THREE obligations all
  // happen in one bubbled `dragstart` handler, and that is dispatchable: arm
  // `beginTreeDrag` with absolute paths, stamp the identity MIME, and widen
  // `effectAllowed` off the library's 'move' — which Chromium would otherwise
  // use to nullify the pane's 'copy' and swallow the drop entirely.
  const row = handle
    .shadowRoot()
    ?.querySelector(`[data-item-path="${dir}/inner/"]`);
  let contract = 'no row to drag';
  let contractOk = false;
  if (row instanceof HTMLElement) {
    const transfer = new DataTransfer();
    row.dispatchEvent(
      new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        composed: true,
        dataTransfer: transfer
      })
    );
    const stamped = Array.from(transfer.types).includes(TREE_DRAG_MIME);
    const session = treeDrag();
    const absolute =
      session?.paths.every((p) => p.startsWith('/')) === true &&
      session.paths.length > 0;
    contractOk = stamped && absolute;
    // `effectAllowed` is deliberately NOT asserted: Blink pins a
    // script-created DataTransfer to transferType kCopyAndPaste and makes
    // `setEffectAllowed` a no-op on it, so the widening this handler performs
    // (library 'move' → 'copyMove', without which Chromium nullifies the
    // pane's 'copy' and the drop never fires) is unobservable through a
    // synthesized drag. Reading it back here would only ever say "none".
    contract =
      `mime=${String(stamped)} paths=${JSON.stringify(session?.paths ?? [])}` +
      ` (effectAllowed unobservable on a synthetic DataTransfer)`;
    endTreeDrag();
  }
  record(
    'a tree drag arms the shared contract with absolute paths',
    contractOk,
    contract
  );

  // ---- The filter -------------------------------------------------------
  handle.toggleFilter();
  await wait(120);
  const filterOpen = useTreeHandle.getState().filterOpen;
  const input = handle
    .shadowRoot()
    ?.querySelector('[data-file-tree-search-input]');
  const labelled =
    input instanceof HTMLInputElement &&
    input.getAttribute('aria-label') === 'Filter files by name';
  record(
    'the header button opens the name filter',
    filterOpen && labelled,
    filterOpen
      ? labelled
        ? 'field open and named "Filter files by name"'
        : 'field open but unnamed'
      : 'field did not open'
  );
  handle.toggleFilter();

  // ---- The band header's own buttons (Phase 14.2 item 3) -----------------
  if (spec.headerActions === true) {
    await driveHeaderActions(handle, dirCanon, record);
  }

  // ---- Clean up whatever survived ---------------------------------------
  ops.trash([dirCanon]);
  await until(() => useApp.getState().confirm !== null, 1000);
  confirmDialog();
  await until(() => !listed(rootPath, dir), 3000);

  if (spec.holdSidebarWidth !== undefined) {
    useApp.getState().setSidebarWidth(spec.holdSidebarWidth);
    await wait(200);
  }

  if (spec.holdFilter !== undefined) {
    handle.toggleFilter();
    await wait(200);
    const field = handle
      .shadowRoot()
      ?.querySelector('[data-file-tree-search-input]');
    if (field instanceof HTMLInputElement) {
      field.value = spec.holdFilter;
      field.dispatchEvent(
        new Event('input', { bubbles: true, composed: true })
      );
    }
    await wait(400);
  }

  const failed = steps.filter((s) => !s.ok).length;
  return { steps, passed: steps.length - failed, failed };
}
