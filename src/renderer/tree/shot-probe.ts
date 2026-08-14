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
  /**
   * Phase 37: leave a New File editor OPEN at the project root with this
   * text typed (no Enter), so a capture can photograph the inline editor —
   * and, when the text is invalid (e.g. "a/b"), the reason under the box.
   */
  holdNewFile?: string;
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

/** The live inline rename input, if one is open. */
function renameInput(handle: TreeHandle): HTMLInputElement | null {
  const el = handle.shadowRoot()?.querySelector('[data-item-rename-input]');
  return el instanceof HTMLInputElement ? el : null;
}

/** Wait for the rename editor to mount, then hand it back. */
async function awaitRenameInput(
  handle: TreeHandle
): Promise<HTMLInputElement | null> {
  await until(() => renameInput(handle) !== null);
  return renameInput(handle);
}

/** Type into the editor the way a person does (composed input event). */
function typeInRenameInput(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}

/** Press one key in the editor (composed, cancelable — the real shape). */
function pressRenameKey(input: HTMLInputElement, key: string): void {
  input.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      composed: true
    })
  );
}

/** Type into the inline rename input the way a person does, then commit. */
async function commitRenameInput(
  handle: TreeHandle,
  value: string
): Promise<boolean> {
  const input = await awaitRenameInput(handle);
  if (input === null) return false;
  typeInRenameInput(input, value);
  await wait(30);
  pressRenameKey(input, 'Enter');
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

/** Fresh disk truth for one directory: relist it, read the cache back. */
async function entriesOnDisk(
  rootPath: string,
  relDir: string
): Promise<string[]> {
  await useFileTree.getState().relist([`${rootPath}/${relDir}`]);
  const entries = useFileTree.getState().entriesByDir[`${rootPath}/${relDir}`];
  return (entries ?? []).map((e) => e.path.slice(rootPath.length + 1));
}

/** The Phase 37 refusal note under the inline editor, if showing. */
function nameErrorEl(): HTMLElement | null {
  const el = document.querySelector('.tree-name-error');
  return el instanceof HTMLElement ? el : null;
}

/**
 * Phase 37, end to end: a new file is named BEFORE it exists. Every step
 * drives the real editor in the real tree and reads the DISK back through a
 * fresh listing, because the phase's whole claim is about what is and is not
 * on the disk while the editor is open.
 */
async function drivePhase37(
  handle: TreeHandle,
  scratchCanon: string,
  record: (name: string, ok: boolean, detail: string) => void
): Promise<void> {
  const { rootPath, ops } = handle;
  const p37 = `${scratchCanon}p37`;
  const p37Canon = `${p37}/`;

  // Scaffolding: a fresh empty folder, created through the gesture itself.
  ops.newEntry(scratchCanon, 'dir');
  await commitRenameInput(handle, 'p37');
  const scaffolded = await until(() => listed(rootPath, p37));
  if (!scaffolded) {
    record('P37: scaffold folder', false, 'could not create the p37 folder');
    return;
  }
  await useFileTree.getState().relist([`${rootPath}/${p37}`]);

  // ---- 1. the editor opens EMPTY, nothing exists anywhere ----------------
  ops.newEntry(p37Canon, 'file');
  const input1 = await awaitRenameInput(handle);
  const emptyBox = input1 !== null && input1.value === '';
  const placeholderNotFed = !handle
    .paths()
    .some((p) => p.startsWith(p37Canon) && p !== p37Canon);
  const disk1 = await entriesOnDisk(rootPath, p37);
  record(
    'P37: New File opens an empty editor, nothing on disk',
    emptyBox && placeholderNotFed && disk1.length === 0,
    `input=${String(input1 !== null)} value=${JSON.stringify(
      input1?.value ?? null
    )} placeholderInFed=${String(!placeholderNotFed)} disk=${JSON.stringify(disk1)}`
  );

  // ---- 2. Escape removes the editor, creates nothing ---------------------
  if (input1 !== null) pressRenameKey(input1, 'Escape');
  const escGone = await until(() => renameInput(handle) === null);
  const disk2 = await entriesOnDisk(rootPath, p37);
  record(
    'P37: Escape removes the editor and creates nothing',
    escGone && disk2.length === 0,
    `editorGone=${String(escGone)} disk=${JSON.stringify(disk2)}`
  );

  // ---- 3. an invalid name refuses INLINE, editor stays, nothing on disk --
  ops.newEntry(p37Canon, 'file');
  const input3 = await awaitRenameInput(handle);
  if (input3 !== null) typeInRenameInput(input3, 'a/b');
  await wait(80);
  if (input3 !== null) pressRenameKey(input3, 'Enter');
  await wait(150);
  const stillEditing = renameInput(handle) !== null;
  const reason3 = nameErrorEl();
  const saysSlash =
    reason3 !== null &&
    (reason3.textContent ?? '').includes('A name cannot contain "/".');
  const disk3 = await entriesOnDisk(rootPath, p37);
  record(
    'P37: an invalid name refuses inline with the reason under the box',
    stillEditing && saysSlash && disk3.length === 0,
    `editorOpen=${String(stillEditing)} reason=${JSON.stringify(
      reason3?.textContent ?? null
    )} disk=${JSON.stringify(disk3)}`
  );

  // ---- 4. retype a valid name: reason clears, Enter creates + selects ----
  const input4 = renameInput(handle);
  if (input4 !== null) typeInRenameInput(input4, 'note.md');
  const reasonCleared = await until(() => nameErrorEl() === null);
  if (input4 !== null) pressRenameKey(input4, 'Enter');
  const created4 = await until(() => listed(rootPath, `${p37}/note.md`));
  const selected4 = await until(
    () =>
      handle
        .shadowRoot()
        ?.querySelector(
          `[data-item-path="${p37}/note.md"][data-item-selected]`
      ) instanceof HTMLElement
  );
  const opened4 = await until(() =>
    useEditor.getState().tabs.some((t) => t.path === `${rootPath}/${p37}/note.md`)
  );
  record(
    'P37: a valid Enter clears the reason, creates, selects and opens',
    reasonCleared && created4 && selected4 && opened4,
    `reasonCleared=${String(reasonCleared)} created=${String(
      created4
    )} selected=${String(selected4)} tabOpen=${String(opened4)}`
  );

  // ---- 5. a duplicate name is refused with the exists message ------------
  ops.newEntry(p37Canon, 'file');
  const input5 = await awaitRenameInput(handle);
  if (input5 !== null) typeInRenameInput(input5, 'note.md');
  await wait(80);
  if (input5 !== null) pressRenameKey(input5, 'Enter');
  await wait(150);
  const reason5 = nameErrorEl();
  const saysExists =
    renameInput(handle) !== null &&
    reason5 !== null &&
    (reason5.textContent ?? '').includes('"note.md" already exists here.');
  const editEl5 = renameInput(handle);
  if (editEl5 !== null) pressRenameKey(editEl5, 'Escape');
  await until(() => renameInput(handle) === null);
  const disk5 = await entriesOnDisk(rootPath, p37);
  const oneNote = disk5.filter((p) => p === `${p37}/note.md`).length === 1;
  record(
    'P37: a duplicate name is refused with the exists message',
    saysExists && oneNote && disk5.length === 1,
    `reason=${JSON.stringify(reason5?.textContent ?? null)} disk=${JSON.stringify(disk5)}`
  );

  // ---- 6. typing the old seed name commits it FOR REAL -------------------
  // (the silent no-op hole: the library closes without firing anything when
  // the typed name equals the placeholder's seed)
  ops.newEntry(p37Canon, 'file');
  const input6 = await awaitRenameInput(handle);
  if (input6 !== null) typeInRenameInput(input6, 'untitled');
  await wait(50);
  if (input6 !== null) pressRenameKey(input6, 'Enter');
  const created6 = await until(() => listed(rootPath, `${p37}/untitled`));
  const selected6 = await until(
    () =>
      handle
        .shadowRoot()
        ?.querySelector(
          `[data-item-path="${p37}/untitled"][data-item-selected]`
      ) instanceof HTMLElement
  );
  record(
    'P37: typing the seed name creates it (the silent no-op hole)',
    created6 && selected6,
    created6
      ? `${p37}/untitled exists and is selected=${String(selected6)}`
      : 'the seed-named commit created nothing — the stranded-row defect'
  );

  // ---- 7. New Folder goes through the same empty editor ------------------
  ops.newEntry(p37Canon, 'dir');
  const input7 = await awaitRenameInput(handle);
  const empty7 = input7 !== null && input7.value === '';
  await commitRenameInput(handle, 'p37-dir');
  const created7 = await until(() => listed(rootPath, `${p37}/p37-dir`));
  record(
    'P37: New Folder opens empty and creates on Enter',
    empty7 && created7,
    `emptyBox=${String(empty7)} created=${String(created7)}`
  );

  // ---- 8. click-away (blur) with an empty box removes the editor ---------
  ops.newEntry(p37Canon, 'file');
  const input8 = await awaitRenameInput(handle);
  if (input8 !== null) input8.dispatchEvent(new FocusEvent('blur'));
  const blurGone = await until(() => renameInput(handle) === null);
  const disk8 = await entriesOnDisk(rootPath, p37);
  record(
    'P37: blur with an empty box removes the editor, nothing on disk',
    blurGone && disk8.length === 3,
    `editorGone=${String(blurGone)} disk=${JSON.stringify(disk8)}`
  );

  // ---- 9. while the editor is open the row is inert -----------------------
  // Three doors, three checks: the library renders the renaming row WITHOUT
  // the drag affordance (a div, draggable false); a dispatched dragstart is
  // refused by the host handler (default prevented) so the tree-drag ATTACH
  // contract never arms; and a click opens nothing.
  ops.newEntry(p37Canon, 'file');
  const input9 = await awaitRenameInput(handle);
  const row9 = input9?.closest('[data-item-path]');
  let notDraggable = false;
  let dragRefused = false;
  let noTabOpened = false;
  if (row9 instanceof HTMLElement) {
    notDraggable = !row9.draggable;
    const transfer = new DataTransfer();
    const dragEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      composed: true,
      dataTransfer: transfer
    });
    row9.dispatchEvent(dragEvent);
    dragRefused = dragEvent.defaultPrevented && treeDrag() === null;
    const tabsBefore = useEditor.getState().tabs.length;
    row9.click();
    await wait(200);
    noTabOpened = useEditor.getState().tabs.length === tabsBefore;
  }
  const editEl9 = renameInput(handle);
  if (editEl9 !== null) pressRenameKey(editEl9, 'Escape');
  await until(() => renameInput(handle) === null);
  record(
    'P37: the pending row cannot be dragged or opened',
    notDraggable && dragRefused && noTabOpened,
    `row=${String(row9 instanceof HTMLElement)} draggableAffordance=${String(
      !notDraggable
    )} dragRefusedAndUnarmed=${String(dragRefused)} clickOpenedNoTab=${String(
      noTabOpened
    )}`
  );
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

  // ---- Phase 37: a new file is named before it exists ---------------------
  await drivePhase37(handle, dirCanon, record);

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

  // Phase 37: leave a create editor open (with its refusal, if the text is
  // invalid) so the capture shows the inline box the way a person sees it.
  if (spec.holdNewFile !== undefined) {
    ops.newEntry('', 'file');
    const held = await awaitRenameInput(handle);
    if (held !== null && spec.holdNewFile.length > 0) {
      typeInRenameInput(held, spec.holdNewFile);
    }
    await wait(300);
  }

  const failed = steps.filter((s) => !s.ok).length;
  return { steps, passed: steps.length - failed, failed };
}
