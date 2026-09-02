/**
 * The History section's search field, driven in the running app and read
 * back off the DOM and the store (Phase 199). Installed by ./shot-hook on a
 * harness launch and on nothing else; build/probe-p199-search.mjs is the
 * script that reads it.
 *
 * The order is the JOURNEY the backlog names: type, narrow, expand a row,
 * open a file from it, Load 50 more, press the changes button, Escape. Every
 * step reads the DOM or the store rather than asserting, and the script
 * holds every row set against git's own answer for the same query.
 *
 * Two things are measured rather than driven. Each keystroke's walk time is
 * read off the store, which records how long the bridge call took, so the
 * debounce the field chose can be held against the number in the running
 * app. And a burst typed faster than the debounce, plus two walks started
 * back to back on purpose, prove that only the last query draws.
 */

import { gmuxBridge } from '../bridge';
import { useGit } from '../state/git';
import { useApp } from '../state/store';
import { depthRepoState, useGitDepth } from '../scm/depth';
import { SEARCH_DEBOUNCE_MS, parseHistoryQuery } from '../scm/history-search';
import { useEditor } from './store';

export interface HistorySearchProbeSpec {
  /** A message word typed one character at a time. */
  word: string;
  /** An author typed the same way, after `author:`. */
  author: string;
  /** A repo relative folder typed component by component, after `file:`. */
  path: string;
  /** The change search's term, run from the button. */
  change: string;
  /** A phrase typed faster than the debounce. */
  burst: string;
  /**
   * A tracked file, repo relative, written through the bridge while the
   * change search's rows are on screen and then put back. Fix round: a
   * repository change must not run the change search again.
   */
  touch: string;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function until(pred: () => boolean, tries = 80, ms = 100): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    if (pred()) return true;
    await wait(ms);
  }
  return pred();
}

declare global {
  interface Window {
    /** `window.__gmuxP199HistorySearch`: what the section drew, along the journey. */
    __gmuxP199HistorySearch?: unknown;
  }
}

interface ListReading {
  rows: string[];
  count: string;
  gutter: boolean;
  more: boolean;
  stub: string | null;
  fieldText: string;
  button: string | null;
  msText: string | null;
  toasts: string[];
}

function section(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-section-root="history"]');
}

function field(): HTMLInputElement | null {
  return section()?.querySelector<HTMLInputElement>('.scm-history-search input') ?? null;
}

function readRows(): string[] {
  const root = section();
  if (root === null) return [];
  return Array.from(root.querySelectorAll<HTMLElement>('.scm-hrow')).map(
    (row) => (row.dataset['hist'] ?? '').replace(/^c:/, '')
  );
}

function readList(): ListReading {
  const root = section();
  return {
    rows: readRows(),
    count: root?.querySelector('.section-count')?.textContent ?? '',
    gutter: root?.querySelector('.scm-hrow svg') !== null,
    more: root?.querySelector('.scm-load-more') !== null,
    stub: root?.querySelector('.section-stub')?.textContent ?? null,
    fieldText: field()?.value ?? '',
    button: root?.querySelector('.scm-history-search-run')?.textContent?.trim() ?? null,
    msText: root?.querySelector('.scm-history-search-ms')?.textContent ?? null,
    toasts: Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent ?? '')
  };
}

function repoState(repoPath: string) {
  return depthRepoState(useGitDepth.getState().repos, repoPath);
}

/** The Changes section's own answer: the file is in the repo's status. */
function fileInStatus(repoPath: string, relPath: string): boolean {
  const files = useGit.getState().repos[repoPath]?.status?.files ?? [];
  return files.some((f) => f.path === relPath);
}

function skeletonGone(): boolean {
  return section()?.querySelector('.scm-skeleton') === null;
}

/** Type into the controlled input the way React hears it. */
function setText(text: string): void {
  const input = field();
  if (input === null) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function pressEscape(): void {
  field()?.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  );
}

/**
 * The applied query equals what this text parses to, and the walk drew, or
 * was refused with a sentence, which is an answer too.
 */
function applied(repoPath: string, text: string): boolean {
  const r = repoState(repoPath);
  const q = parseHistoryQuery(text);
  if (r.logLoading || (r.walkMs === null && r.searchError === null)) return false;
  if (r.query === null) return text.trim() === '' || (q.author === '' && q.message === '' && q.commit === '' && q.file === '' && q.change === '');
  return (
    r.query.message === q.message &&
    r.query.author === q.author &&
    r.query.commit === q.commit &&
    r.query.file === q.file
  );
}

export async function driveHistorySearch(
  projectPath: string,
  spec: HistorySearchProbeSpec
): Promise<void> {
  const out: Record<string, unknown> = { spec };
  const started = Date.now();
  const mark = (name: string): void => {
    console.log(`[shot-drive] historysearch ${name} at ${String(Date.now() - started)}ms`);
  };
  const repoPath = projectPath;
  const depth = useGitDepth.getState();

  // How many walks drew: every patch of walkMs from null to a number.
  let walks = 0;
  let lastMs: number | null = null;
  const unsubscribe = useGitDepth.subscribe((s) => {
    const ms = depthRepoState(s.repos, repoPath).walkMs;
    if (ms !== null && ms !== lastMs) walks++;
    lastMs = ms;
  });

  // 1. Source Control, the History section, the plain walk.
  useApp.getState().setSidebarView('scm');
  const ready = await until(
    () => section() !== null && readRows().length > 0 && skeletonGone() && !repoState(repoPath).logLoading && field() !== null,
    120
  );
  const plain = readList();
  out['plain'] = { ready, ...plain, refs: repoState(repoPath).logRefs, walkMs: repoState(repoPath).walkMs };
  mark(`plain walk ${ready ? 'drawn' : 'NOT drawn'} with ${String(plain.rows.length)} rows`);
  if (!ready) {
    out['ms'] = Date.now() - started;
    unsubscribe();
    window.__gmuxP199HistorySearch = out;
    return;
  }

  /** Type `text`, wait for its walk, read the list and the walk's cost. */
  const typeAndRead = async (text: string): Promise<Record<string, unknown>> => {
    const t0 = performance.now();
    setText(text);
    const drew = await until(() => applied(repoPath, text) && skeletonGone(), 150, 50);
    const r = repoState(repoPath);
    return {
      text,
      drew,
      wallMs: Math.round(performance.now() - t0),
      walkMs: r.walkMs,
      query: r.query,
      hasMore: r.hasMore,
      searchError: r.searchError,
      ...readList()
    };
  };

  // 2. A word, one character at a time, then an author, a path and a commit.
  const keystrokes: Record<string, unknown>[] = [];
  for (let i = 1; i <= spec.word.length; i++) keystrokes.push(await typeAndRead(spec.word.slice(0, i)));
  out['word'] = keystrokes;
  mark('word typed');

  const authors: Record<string, unknown>[] = [];
  for (let i = 1; i <= spec.author.length; i++) authors.push(await typeAndRead(`author:${spec.author.slice(0, i)}`));
  out['author'] = authors;
  mark('author typed');

  const paths: Record<string, unknown>[] = [];
  const parts = spec.path.split('/');
  paths.push(await typeAndRead(`file:${(parts[0] ?? '').slice(0, 1)}`));
  for (let i = 1; i <= parts.length; i++) paths.push(await typeAndRead(`file:${parts.slice(0, i).join('/')}`));
  out['path'] = paths;
  mark('path typed');

  const target = plain.rows[1] ?? plain.rows[0] ?? '';
  out['commit'] = await typeAndRead(`commit:${target}`);
  out['bareSha'] = await typeAndRead(target.slice(0, 7));
  mark('commit typed');

  // 3. Back to the word, expand a row, open a file from it.
  const word = await typeAndRead(spec.word);
  out['wordAgain'] = word;
  const firstSha = (word.rows as string[])[0] ?? '';
  const rowEl = section()?.querySelector<HTMLElement>(`[data-hist="c:${firstSha}"]`) ?? null;
  rowEl?.click();
  await until(() => (section()?.querySelectorAll('.scm-hfile:not(.scm-hfile-loading)').length ?? 0) > 0, 60);
  const fileRows = Array.from(section()?.querySelectorAll<HTMLElement>('.scm-hfile:not(.scm-hfile-loading):not(.scm-hfile-empty)') ?? []);
  const fileEl = fileRows[0] ?? null;
  fileEl?.click();
  await until(() => {
    const s = useEditor.getState();
    const tab = s.tabs.find((t) => t.id === s.activeId);
    return tab !== undefined && tab.commit?.sha === firstSha && tab.loading === false;
  }, 80);
  const s = useEditor.getState();
  const tab = s.tabs.find((t) => t.id === s.activeId);
  out['expand'] = {
    sha: firstSha,
    expanded: rowEl?.getAttribute('aria-expanded'),
    fileRows: fileRows.length,
    fileTitle: fileEl?.title ?? null,
    spacerSvgs: section()?.querySelectorAll('.scm-hfile svg').length ?? -1,
    tab: tab === undefined ? null : { relPath: tab.relPath, sha: tab.commit?.sha ?? null, mode: tab.mode, error: tab.error, preview: tab.preview },
    after: readList()
  };
  mark('expanded and opened');

  // 4. Load 50 more, the query kept.
  const before = readRows().length;
  section()?.querySelector<HTMLButtonElement>('.scm-load-more')?.click();
  await until(() => readRows().length > before && !repoState(repoPath).logLoading, 120);
  const grown = repoState(repoPath);
  out['more'] = {
    before,
    ...readList(),
    query: grown.query,
    limit: grown.limit,
    hasMore: grown.hasMore,
    walkMs: grown.walkMs
  };
  mark('loaded more');

  // 5. The changes button. Typing the term first returns the pane to the
  //    plain walk, and the button is disabled until that walk draws, which
  //    on git's own repository is the 400 ms topo ordered read, so the
  //    click waits for an enabled button rather than a fixed instant.
  //    The keystroke's own debounce is let fire first, so what this step
  //    measures is the button and not the race the field settles itself.
  const changeText = `change:${spec.change}`;
  setText(changeText);
  await wait(SEARCH_DEBOUNCE_MS + 50);
  const runButton = (): HTMLButtonElement | null =>
    section()?.querySelector<HTMLButtonElement>('.scm-history-search-run') ?? null;
  await until(() => {
    const b = runButton();
    return b !== null && !b.disabled && applied(repoPath, changeText);
  }, 100, 50);
  const offered = readList();
  const runBtn = runButton();
  const t0 = performance.now();
  runBtn?.click();
  const running = await until(() => repoState(repoPath).logLoading && repoState(repoPath).query?.change === spec.change, 40, 25);
  const whileRunning = readList();
  const finished = await until(() => {
    const r = repoState(repoPath);
    return !r.logLoading && r.query?.change === spec.change && (r.walkMs !== null || r.searchError !== null);
  }, 300, 100);
  const done = repoState(repoPath);
  out['change'] = {
    offered,
    running,
    whileRunning,
    finished,
    wallMs: Math.round(performance.now() - t0),
    walkMs: done.walkMs,
    query: done.query,
    ...readList()
  };
  mark('change searched');

  // 5b. A repository change while those rows are on screen: nothing may
  //     run. The file is written through the bridge, so the watcher sees a
  //     real change, and the Changes section's own status proves the
  //     renderer heard it. Read every 15 ms for the button, the spinner,
  //     the loading flag and the printed time, then the file is put back.
  const gmux = gmuxBridge();
  const touchedPath = `${projectPath}/${spec.touch}`;
  const original = gmux === undefined ? null : (await gmux.fs.readFile(touchedPath)).contents;
  const heardBefore = fileInStatus(repoPath, spec.touch);
  const walksBeforeTouch = walks;
  const beforeTouch = readList();
  let sawStop = false;
  let sawLoading = false;
  let heard = false;
  const seen: string[] = [];
  const watchFor = async (ms: number): Promise<void> => {
    const t = performance.now();
    while (performance.now() - t < ms) {
      const list = readList();
      const r = repoState(repoPath);
      if (list.button === 'Stop') sawStop = true;
      if (r.logLoading) sawLoading = true;
      if (fileInStatus(repoPath, spec.touch)) heard = true;
      const key = `${String(list.button)}|${String(list.msText)}|${String(list.rows.length)}|${String(r.logLoading)}`;
      if (seen[seen.length - 1] !== key) seen.push(key);
      await wait(15);
    }
  };
  if (gmux !== undefined && original !== null) {
    await gmux.fs.writeFile(touchedPath, `${original}
probe touch
`);
    await watchFor(3500);
    await gmux.fs.writeFile(touchedPath, original);
    await watchFor(2000);
  }
  const afterTouch = readList();
  out['reread'] = {
    written: original !== null,
    heardBefore,
    heard,
    sawStop,
    sawLoading,
    walks: walks - walksBeforeTouch,
    seen,
    msBefore: beforeTouch.msText,
    msAfter: afterTouch.msText,
    rowsBefore: beforeTouch.rows,
    rowsAfter: afterTouch.rows,
    buttonAfter: afterTouch.button,
    query: repoState(repoPath).query
  };
  mark(`touched ${spec.touch}, ${String(walks - walksBeforeTouch)} walk(s) drew`);

  // 6. A burst typed faster than the debounce: one walk, the last query.
  const walksBefore = walks;
  const burstStart = performance.now();
  for (let i = 1; i <= spec.burst.length; i++) {
    setText(spec.burst.slice(0, i));
    await wait(15);
  }
  const burstSettled = await until(() => applied(repoPath, spec.burst) && skeletonGone(), 150, 50);
  const burstRows = readRows();
  await wait(1500);
  out['burst'] = {
    settled: burstSettled,
    keystrokes: spec.burst.length,
    walks: walks - walksBefore,
    wallMs: Math.round(performance.now() - burstStart),
    rows: burstRows,
    rowsLater: readRows(),
    query: repoState(repoPath).query,
    walkMs: repoState(repoPath).walkMs
  };
  mark('burst typed');

  // 7. Two walks started back to back on purpose: the first must never draw.
  const raceBefore = walks;
  const rare = parseHistoryQuery('zzqxv');
  const last = parseHistoryQuery(spec.word);
  void depth.setQuery(repoPath, rare);
  void depth.setQuery(repoPath, last);
  const raceSettled = await until(() => applied(repoPath, spec.word) && skeletonGone(), 150, 50);
  const raceRows = readRows();
  await wait(1000);
  out['race'] = {
    settled: raceSettled,
    walks: walks - raceBefore,
    rows: raceRows,
    rowsLater: readRows(),
    query: repoState(repoPath).query
  };
  setText(spec.word);
  await until(() => applied(repoPath, spec.word), 60, 50);
  mark('race run');

  // 8. The attacks: a regex metacharacter, a commit that is not one, an
  //    operator alone, a path that globs.
  out['attacks'] = {
    bracket: await typeAndRead(`author:"${spec.author} ["`),
    bracketBare: await typeAndRead(`author:${spec.author}[`),
    notACommit: await typeAndRead('commit:zzzz'),
    operatorAlone: await typeAndRead('author:'),
    glob: await typeAndRead(`file:${spec.path}/*`)
  };
  mark('attacks typed');

  // 8b. A path that leaves the repository: the service refuses it, and the
  //     section must draw that refusal and nothing else. Fix round: at the
  //     parent the flat walk drew the plain first page here.
  out['escapes'] = {
    parent: await typeAndRead('file:../src'),
    absolute: await typeAndRead('file:/etc/passwd')
  };
  mark('escapes typed');

  // 9. Escape: the field clears and the plain walk returns with its gutter.
  setText(spec.word);
  await until(() => applied(repoPath, spec.word), 60, 50);
  pressEscape();
  const escaped = await until(
    () => repoState(repoPath).query === null && !repoState(repoPath).logLoading && readRows().length === plain.rows.length && skeletonGone(),
    120,
    50
  );
  out['escape'] = { escaped, ...readList(), query: repoState(repoPath).query, walkMs: repoState(repoPath).walkMs };
  mark('escaped');

  out['walks'] = walks;
  out['ms'] = Date.now() - started;
  unsubscribe();
  window.__gmuxP199HistorySearch = out;
}
