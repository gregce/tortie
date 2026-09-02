/**
 * The File history section, driven in the running app and read back off the
 * DOM (Phase 198). Installed by ./shot-hook on a harness launch and on nothing
 * else; build/probe-p198-file-history.mjs is the script that reads it.
 *
 * The order is the JOURNEY the backlog names, and every step reads the DOM or
 * the editor store rather than asserting. The file's row in the Explorer is
 * right clicked, which raises the row's menu on the shipped path, and main
 * answers that menu with History under GMUX_SHOT_POPUP_PICK, so the item's
 * own closure runs. The section then appears under Source Control following
 * the tab that opened. Its rows are read. The rename boundary and every row
 * above it are clicked and the tab each opened is read back with both of its
 * sides, a row below the boundary opens under the path the file had then, a
 * single click previews and a double click pins, a second file with more
 * than one page of commits moves the section and Load 50 more grows it, the
 * header collapses and opens, and closing every tab lets the section go.
 */

import { requestOpenFile } from '../state/open-file';
import { useApp } from '../state/store';
import { useTreeHandle } from '../tree/tree-handle';
import { useEditor } from './store';

export interface FileHistoryProbeSpec {
  /** The file whose history is opened from the Explorer row's menu, repo relative. */
  rel: string;
  /**
   * A second file, opened for keeps, with more than one page of commits so
   * Load 50 more has work to do. It must be a file no earlier step opened.
   */
  secondRel: string;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function until(
  pred: () => boolean,
  tries = 80,
  ms = 250
): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    if (pred()) return true;
    await wait(ms);
  }
  return pred();
}

declare global {
  interface Window {
    /** `window.__gmuxP198FileHistory`: what the section drew, along the journey. */
    __gmuxP198FileHistory?: unknown;
  }
}

interface RowReading {
  sha: string;
  status: string;
  subject: string;
  thenPath: string | null;
  title: string;
  ariaLabel: string;
}

interface HeaderReading {
  present: boolean;
  label: string;
  dir: string | null;
  count: string;
  file: string | null;
  collapsed: boolean;
  disabled: boolean;
  title: string;
  expanded: string | null;
  rows: number;
  more: boolean;
  stub: string | null;
  gutter: boolean;
}

interface TabReading {
  found: boolean;
  relPath?: string;
  origRelPath?: string | null;
  sha?: string | null;
  status?: string | null;
  preview?: boolean;
  mode?: string;
  oldBytes?: number;
  newBytes?: number;
  error?: string | null;
  loading?: boolean;
  diffMounted?: boolean;
  stateTitle?: string | null;
  commitTabs?: number;
  tabs?: number;
}

function section(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-section-root="fileHistory"]');
}

function readRows(): RowReading[] {
  const root = section();
  if (root === null) return [];
  return Array.from(root.querySelectorAll<HTMLElement>('.scm-fhrow')).map((row) => ({
    sha: row.dataset['sha'] ?? '',
    status: row.dataset['status'] ?? '',
    subject: row.querySelector('.scm-hsubject')?.textContent ?? '',
    thenPath: row.querySelector('.scm-fhpath')?.textContent ?? null,
    title: row.title,
    ariaLabel: row.getAttribute('aria-label') ?? ''
  }));
}

function readHeader(): HeaderReading {
  const root = section();
  const toggle = root?.querySelector<HTMLButtonElement>('.section-toggle') ?? null;
  const label = Array.from(toggle?.childNodes ?? [])
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent ?? '')
    .join('')
    .trim();
  return {
    present: root !== null,
    label,
    dir: root?.querySelector('.scm-fhdir')?.textContent ?? null,
    count: toggle?.querySelector('.section-count')?.textContent ?? '',
    file: root?.dataset['file'] ?? null,
    collapsed: root?.classList.contains('collapsed') ?? true,
    disabled: toggle?.disabled ?? true,
    title: toggle?.title ?? '',
    expanded: toggle?.getAttribute('aria-expanded') ?? null,
    rows: readRows().length,
    more: root?.querySelector('.scm-fhmore') !== null,
    stub: root?.querySelector('.section-stub')?.textContent ?? null,
    // The History section draws its lanes as one svg per row; a row here
    // carries a badge and no svg at all.
    gutter: root?.querySelector('.scm-fhrow svg') !== null
  };
}

function skeletonGone(): boolean {
  return section()?.querySelector('.scm-skeleton') === null;
}

function readActiveTab(): TabReading {
  const s = useEditor.getState();
  const tab = s.tabs.find((t) => t.id === s.activeId);
  if (tab === undefined) return { found: false, tabs: s.tabs.length };
  return {
    found: true,
    relPath: tab.relPath,
    origRelPath: tab.origRelPath,
    sha: tab.commit?.sha ?? null,
    status: tab.commit?.status ?? null,
    preview: tab.preview,
    mode: tab.mode,
    oldBytes: (tab.headContents ?? '').length,
    newBytes: tab.savedContents.length,
    error: tab.error,
    loading: tab.loading,
    // Pierre draws rows only when something changed; an identical pair, which
    // is what a pure rename's boundary is, draws the "No changes" panel with
    // both sides loaded. Either is a mounted two sided surface.
    diffMounted:
      document.querySelector('diffs-container')?.shadowRoot?.querySelector('pre') != null ||
      document.querySelector('.ed-state-title')?.textContent === 'No changes',
    stateTitle: document.querySelector('.ed-state-title')?.textContent ?? null,
    commitTabs: s.tabs.filter((t) => t.commit !== null).length,
    tabs: s.tabs.length
  };
}

function activeSha(): string | null {
  const s = useEditor.getState();
  const tab = s.tabs.find((t) => t.id === s.activeId);
  return tab?.commit?.sha ?? null;
}

function activeRel(): string | null {
  const s = useEditor.getState();
  const tab = s.tabs.find((t) => t.id === s.activeId);
  return tab?.relPath ?? null;
}

/** A row of the Pierre tree by its repo relative path, folder or file. */
function treeRow(rel: string): HTMLElement | null {
  const root = document.querySelector('file-tree-container')?.shadowRoot;
  const rows = root?.querySelectorAll<HTMLElement>('[data-item-path]') ?? [];
  for (const row of Array.from(rows)) {
    const p = row.dataset['itemPath'] ?? '';
    if (p === rel || p === `${rel}/`) return row;
  }
  return null;
}

/** Click a row and wait until the tab it opened has loaded and mounted. */
async function openRow(row: HTMLElement, double: boolean): Promise<TabReading> {
  const sha = row.dataset['sha'] ?? '';
  if (double) {
    row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
  } else {
    row.click();
  }
  await until(() => activeSha() === sha, 40);
  await until(() => {
    const t = readActiveTab();
    return t.found && t.loading === false && (t.error !== null || t.diffMounted === true);
  }, 80);
  return readActiveTab();
}

export async function driveFileHistory(
  projectPath: string,
  spec: FileHistoryProbeSpec
): Promise<void> {
  const out: Record<string, unknown> = { rel: spec.rel, secondRel: spec.secondRel };
  const started = Date.now();
  const mark = (name: string): void => {
    console.log(`[shot-drive] filehistory ${name} at ${String(Date.now() - started)}ms`);
  };

  // 1. The Explorer, with the file's folders clicked open one by one, the
  //    way a person reaches a row: the tree is lazy, so each click is a
  //    directory read, and the tree's own filter cannot find a file in a
  //    folder nobody has opened yet.
  useApp.getState().setSidebarView('explorer');
  const parts = spec.rel.split('/');
  await until(
    () => useTreeHandle.getState().handle !== null && treeRow(parts[0] ?? '') !== null,
    60
  );
  const handle = useTreeHandle.getState().handle;
  const rowsOnScreen = (): number =>
    (
      document.querySelector('file-tree-container')?.shadowRoot?.querySelectorAll('[data-item-path]') ?? []
    ).length;
  const clicked: string[] = [];
  for (let i = 1; i < parts.length && treeRow(spec.rel) === null; i++) {
    const dir = parts.slice(0, i).join('/');
    const next = parts.slice(0, i + 1).join('/');
    const dirRow = treeRow(dir);
    if (dirRow === null || treeRow(next) !== null) continue;
    clicked.push(dir);
    dirRow.click();
    await until(() => treeRow(next) !== null, 32);
  }
  // The tree is virtualized, so a row below the viewport is not in the DOM
  // until the tree is scrolled to it, which is what a person's wheel does.
  const scroller =
    document
      .querySelector('file-tree-container')
      ?.shadowRoot?.querySelector<HTMLElement>('[data-file-tree-virtualized-scroll="true"]') ?? null;
  let scrolled = 0;
  if (scroller !== null) {
    for (let i = 0; i < 60 && treeRow(spec.rel) === null; i++) {
      const was = scroller.scrollTop;
      scroller.scrollTop = was + Math.max(120, Math.floor(scroller.clientHeight * 0.8));
      scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
      await wait(120);
      scrolled += 1;
      if (scroller.scrollTop === was) break;
    }
  }
  treeRow(spec.rel)?.scrollIntoView({ block: 'center' });
  await wait(250);
  // Read again after the scroll: the virtualized tree reuses a row's element
  // for whatever path lands in that slot, so an element held across a scroll
  // names a different file, which is exactly what the first run of this
  // drive right clicked.
  const fileRow = treeRow(spec.rel);
  out['tree'] = {
    handle: handle !== null,
    rowFound: fileRow !== null,
    scroller: scroller !== null,
    scrolled,
    clicked,
    rowsOnScreen: rowsOnScreen()
  };
  mark(`tree ready, row ${fileRow === null ? 'absent' : 'found'}`);

  // 2. The row's own menu, raised by a right click on the shipped path. Main
  //    answers it with History (GMUX_SHOT_POPUP_PICK), and the item's closure
  //    opens the file for keeps and shows Source Control.
  if (fileRow !== null) {
    const r = fileRow.getBoundingClientRect();
    fileRow.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        composed: true,
        cancelable: true,
        button: 2,
        clientX: Math.round(r.left + Math.min(24, r.width / 2)),
        clientY: Math.round(r.top + r.height / 2)
      })
    );
  }
  const opened = await until(
    () => activeRel() === spec.rel && section() !== null && readRows().length > 0 && skeletonGone(),
    60
  );
  out['menuOpened'] = {
    opened,
    activeRel: activeRel(),
    tab: readActiveTab(),
    section: readHeader(),
    ms: Date.now() - started
  };
  mark(`menu ${opened ? 'answered' : 'NOT answered'}`);
  if (!opened) {
    // Nothing below can be read without the section; the reading says why.
    out['ms'] = Date.now() - started;
    window.__gmuxP198FileHistory = out;
    return;
  }

  // 3. The header and the rows, as drawn.
  const header = readHeader();
  const rows = readRows();
  out['header'] = header;
  out['rows'] = rows;
  const boundaryIndex = rows.findIndex((r) => r.status === 'R');
  out['boundaryIndex'] = boundaryIndex;
  out['boundary'] = boundaryIndex === -1 ? null : rows[boundaryIndex];

  // 4. The boundary row, then every row above it, each read back with both
  //    sides, and the first row below it, which opens under the old path.
  const opens: Array<{ index: number; row: RowReading; tab: TabReading; after: HeaderReading }> = [];
  const rowEl = (sha: string): HTMLElement | null =>
    section()?.querySelector<HTMLElement>(`.scm-fhrow[data-sha="${sha}"]`) ?? null;
  const targets: number[] = [];
  if (boundaryIndex !== -1) {
    targets.push(boundaryIndex);
    for (let i = 0; i < boundaryIndex; i++) targets.push(i);
    if (boundaryIndex + 1 < rows.length) targets.push(boundaryIndex + 1);
  } else if (rows.length > 0) {
    targets.push(0);
  }
  for (const index of targets) {
    const row = rows[index];
    const el = row === undefined ? null : rowEl(row.sha);
    if (row === undefined || el === null) continue;
    const tab = await openRow(el, false);
    opens.push({ index, row, tab, after: readHeader() });
  }
  out['opens'] = opens;
  mark('rows opened');

  // 5. A single click previews, a double click pins.
  const first = rows[0];
  const firstEl = first === undefined ? null : rowEl(first.sha);
  if (first !== undefined && firstEl !== null) {
    const previewed = await openRow(firstEl, false);
    const pinned = await openRow(firstEl, true);
    await until(() => readActiveTab().preview === false, 20);
    out['preview'] = { previewed, pinned: readActiveTab(), pinnedRead: pinned };
  }
  mark('preview and pin');

  // 6. A second file, opened for keeps, moves the section; Load 50 more grows it.
  requestOpenFile({
    repoPath: projectPath,
    relPath: spec.secondRel,
    path: `${projectPath}/${spec.secondRel}`,
    mode: 'file',
    source: 'tree',
    preview: false
  });
  await until(
    () => readHeader().file === spec.secondRel && readRows().length > 0 && skeletonGone(),
    120
  );
  const secondHeader = readHeader();
  const secondFirstPage = readRows();
  const more = section()?.querySelector<HTMLButtonElement>('.scm-fhmore') ?? null;
  more?.click();
  await until(() => readRows().length > secondFirstPage.length && skeletonGone(), 120);
  const secondGrown = readHeader();
  const secondRows = readRows();
  let secondOpen: TabReading | null = null;
  let secondAfter: HeaderReading | null = null;
  const secondRow = secondRows[1];
  const secondRowEl = secondRow === undefined ? null : rowEl(secondRow.sha);
  if (secondRowEl !== null) {
    secondOpen = await openRow(secondRowEl, false);
    secondAfter = readHeader();
  }
  out['second'] = {
    header: secondHeader,
    firstPage: secondFirstPage.length,
    hadMore: more !== null,
    grown: secondGrown,
    shas: secondRows.map((r) => r.sha),
    open: secondOpen,
    after: secondAfter
  };
  mark('second file');

  // 7. The header collapses and opens again.
  const toggle = section()?.querySelector<HTMLButtonElement>('.section-toggle') ?? null;
  toggle?.click();
  await until(() => readHeader().collapsed, 20);
  const collapsedRead = readHeader();
  toggle?.click();
  await until(() => !readHeader().collapsed && readRows().length > 0, 40);
  out['collapse'] = { collapsed: collapsedRead, reopened: readHeader() };
  mark('collapse');

  // 8. Closing every tab lets the section go.
  useEditor.getState().closeAll();
  await until(() => useEditor.getState().tabs.length === 0, 40);
  await until(() => readHeader().file === null, 40);
  out['closed'] = { tabs: useEditor.getState().tabs.length, header: readHeader() };
  mark('closed');

  out['ms'] = Date.now() - started;
  window.__gmuxP198FileHistory = out;
}
