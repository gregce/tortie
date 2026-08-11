/**
 * Harness-only ⌘⇧F / ⌘⇧O probe (Phase 14 verification). Driven from the
 * GMUX_SHOT_DRIVE spec (`search: {…}` / `symbols: {…}`) and inert otherwise.
 *
 * It exists because the claims that matter here are ones a screenshot cannot
 * settle:
 *
 *  1. **The real chord opens the real view.** The probe dispatches ⌘⇧F as a
 *     capture-phase keyboard event on `window`, which is exactly where
 *     useKeyboardMap listens — not a call into the store.
 *  2. **Results stream, and the first ones arrive fast.** It types the query
 *     one character at a time through the input's real change handler, then
 *     reports milliseconds from the last keystroke to the FIRST painted row
 *     and to the final frame. Research 19 measured ~3 ms to first result out
 *     of ripgrep; only this measures it with React and virtualization in the
 *     loop, which §7.3 lists as the one thing that was never measured.
 *  3. **Cancel-on-retype really cancels.** Typing a broad query and then
 *     narrowing it must never leave a row from the abandoned search on
 *     screen. The probe checks the painted rows against the final query.
 *  4. **A result opens WITH its selection.** It presses ↩ on a row for real
 *     and reports which tab appeared, whether it is the reusable preview
 *     slot, and what line the editor landed on.
 *  5. **The symbol index is honest while cold.** It opens ⌘⇧O on a project
 *     that has never been indexed and reports what the palette said in the
 *     first 200 ms — the state that must read as "still reading your code",
 *     never as "no symbols here".
 *
 * Findings go to console.log, which GMUX_SHOT_VERBOSE=1 tees into the harness
 * output. Example:
 *
 *   GMUX_SHOT=/tmp/search.png GMUX_SHOT_VERBOSE=1 GMUX_SHOT_DELAY_MS=20000 \
 *   GMUX_SHOT_DRIVE='{"projectPath":"/Users/gdc/gmux",
 *     "search":{"type":"MAX_TABS","accept":"preview"}}' \
 *   npx electron . --user-data-dir=/tmp/gmux-search-probe
 */

import { useEditor } from '../editor/store';
import { useSearch } from './store';
import { useSymbols } from './symbols-store';

export interface SearchProbeSpec {
  /** Text to type into the query box, one character at a time. */
  type?: string;
  /**
   * Type this FIRST, let it start, then replace it with `type`. Proves
   * cancel-on-retype: no row from the abandoned query may survive.
   */
  typeFirst?: string;
  /** Turn the regex toggle on before typing (through the real handler). */
  regex?: boolean;
  /** Fail loudly unless this repo-relative path is among the result files. */
  expectFile?: string;
  /** Press ↩ on the first match and report the tab it produced. */
  accept?: 'preview' | 'pinned';
  /** Expand the first match's context rows before capture. */
  context?: boolean;
  /**
   * Exercise the in-view chords for real: ⌥⌘C / ⌥⌘W / ⌥⌘R must flip their
   * toggle while focus is inside the view, and the Esc ladder must clear the
   * query, then move focus to the results, then leave.
   */
  keys?: boolean;
}

export interface SymbolProbeSpec {
  /** What to type after the mode prefix. */
  type?: string;
  /** '@' current file, '#' project. Default: whatever ⌘⇧O picks. */
  mode?: '@' | '#';
  /** Fail loudly unless every one of these names is in the list. */
  expect?: string[];
  /** Open this repo-relative file first, so `@` mode has a subject. */
  openFirst?: string;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolve the moment a selector appears, in milliseconds.
 *
 * A `setTimeout` polling loop CANNOT measure this: Chromium clamps timers to
 * ~1 Hz in a window that is not frontmost, and the harness window often is
 * not — every paint measured that way came back as 992-1001 ms, which is the
 * clamp, not the app. MutationObserver callbacks are microtask-scheduled off
 * the DOM change itself, so they carry no timer at all.
 */
function timeToAppear(selector: string, timeoutMs = 4000): Promise<number> {
  const started = performance.now();
  return new Promise<number>((resolve) => {
    if (document.querySelector(selector) !== null) {
      resolve(performance.now() - started);
      return;
    }
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(-1);
    }, timeoutMs);
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector) === null) return;
      const elapsed = performance.now() - started;
      clearTimeout(timer);
      observer.disconnect();
      resolve(elapsed);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

function press(key: string, code: string, mods: Partial<KeyboardEventInit> = {}): void {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      code,
      bubbles: true,
      cancelable: true,
      ...mods
    })
  );
}

/** Type into the real input, character by character, via its React handler. */
async function typeInto(selector: string, text: string): Promise<void> {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (input === null) {
    console.log(`[search-probe] FAILED: no input matching ${selector}`);
    return;
  }
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  for (let i = 0; i < text.length; i++) {
    setter?.call(input, text.slice(0, i + 1));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(12);
  }
}

/** Rows actually in the DOM — the paint, not the store. */
function paintedRows(): number {
  return document.querySelectorAll('.search-row-wrap').length;
}

function reportSearch(label: string): void {
  const s = useSearch.getState();
  console.log(
    `[search-probe] ${label}: query="${s.query}" status=${s.status} ` +
      `matches=${String(s.totalMatches)} files=${String(s.totalFiles)} ` +
      `painted=${String(paintedRows())} capped=${String(s.capped)} ` +
      `error=${s.error ?? 'none'}`
  );
  for (const file of s.files.slice(0, 3)) {
    const first = file.matches[0];
    console.log(
      `[search-probe]   ${file.relPath} (${String(file.matchCount)})` +
        (first !== undefined
          ? ` — ${String(first.line)}: ${markRanges(first.text, first.ranges)}`
          : '')
    );
  }
}

function markRanges(text: string, ranges: readonly [number, number][]): string {
  let out = '';
  let at = 0;
  for (const [start, end] of ranges) {
    out += text.slice(at, start) + '[' + text.slice(start, end) + ']';
    at = end;
  }
  return (out + text.slice(at)).slice(0, 100);
}

export async function driveSearch(spec: SearchProbeSpec): Promise<void> {
  const appearing = timeToAppear('[data-slot="search-input"]');
  press('f', 'KeyF', { metaKey: true, shiftKey: true });
  const painted = await appearing;
  console.log(
    painted < 0
      ? '[search-probe] FAILED: Cmd+Shift+F did not open the Search view'
      : `[search-probe] Cmd+Shift+F → view painted in ${painted.toFixed(0)} ms, ` +
          `focus=${document.activeElement?.getAttribute('data-slot') ?? 'elsewhere'}`
  );
  if (painted < 0) return;

  if (spec.regex === true) {
    useSearch.getState().toggleRegex();
    console.log('[search-probe] regex toggle ON');
  }

  // (3) cancel-on-retype: start a broad query, then narrow it mid-flight.
  if (spec.typeFirst !== undefined) {
    await typeInto('[data-slot="search-input"]', spec.typeFirst);
    await wait(120);
    const abandoned = useSearch.getState().totalMatches;
    console.log(
      `[search-probe] abandoned query "${spec.typeFirst}" had ${String(abandoned)} matches in flight`
    );
    const input = document.querySelector<HTMLInputElement>(
      '[data-slot="search-input"]'
    );
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    setter?.call(input, '');
    input?.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(30);
  }

  if (spec.type !== undefined) {
    const typedAt = performance.now();
    await typeInto('[data-slot="search-input"]', spec.type);

    // (2) first painted row, then the final frame. The row measurement rides
    // the MutationObserver for the reason above; the settle poll can use a
    // timer because it is bounded by the search, not by the clamp.
    const firstRow = await timeToAppear('.search-row-wrap');
    // Store subscription, not a poll: zustand notifies synchronously inside
    // set(), so this carries no timer and cannot be clamped either.
    const done = await new Promise<number>((resolve) => {
      if (useSearch.getState().status !== 'searching') {
        resolve(performance.now() - typedAt);
        return;
      }
      const timer = setTimeout(() => {
        unsubscribe();
        resolve(-1);
      }, 60_000);
      const unsubscribe = useSearch.subscribe((state) => {
        if (state.status === 'searching') return;
        clearTimeout(timer);
        unsubscribe();
        resolve(performance.now() - typedAt);
      });
    });
    console.log(
      `[search-probe] "${spec.type}" → first row at ${firstRow.toFixed(0)} ms, ` +
        `settled at ${done.toFixed(0)} ms (includes the 150 ms debounce)`
    );
    reportSearch('after typing');

    // Every painted row must belong to the FINAL query, not the abandoned one.
    const stale = useSearch
      .getState()
      .files.filter((f) =>
        f.matches.some(
          (m) =>
            !m.text.toLowerCase().includes(spec.type?.toLowerCase() ?? '') &&
            useSearch.getState().isRegex === false
        )
      );
    console.log(
      stale.length === 0
        ? '[search-probe] cancel-on-retype OK: every painted row matches the final query'
        : `[search-probe] FAILED: ${String(stale.length)} files carry rows from an abandoned query`
    );
  }

  if (spec.keys === true) {
    const before = {
      caseSensitive: useSearch.getState().isCaseSensitive,
      wholeWord: useSearch.getState().matchWholeWord,
      regex: useSearch.getState().isRegex
    };
    document.querySelector<HTMLInputElement>('[data-slot="search-input"]')?.focus();
    press('ç', 'KeyC', { metaKey: true, altKey: true });
    await wait(40);
    press('∑', 'KeyW', { metaKey: true, altKey: true });
    await wait(40);
    press('®', 'KeyR', { metaKey: true, altKey: true });
    await wait(40);
    const after = useSearch.getState();
    console.log(
      `[search-probe] in-view chords: case ${String(before.caseSensitive)}→${String(after.isCaseSensitive)} ` +
        `word ${String(before.wholeWord)}→${String(after.matchWholeWord)} ` +
        `regex ${String(before.regex)}→${String(after.isRegex)} ` +
        `(the key values are what Option ACTUALLY produces on macOS)`
    );
    // Put them all back so the capture shows the default state.
    useSearch.getState().toggleCaseSensitive();
    useSearch.getState().toggleWholeWord();
    useSearch.getState().toggleRegex();
    await wait(300);

    // ↓ from the box is the keyboard bridge into the results.
    const box = document.querySelector<HTMLInputElement>(
      '[data-slot="search-input"]'
    );
    box?.focus();
    box?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        code: 'ArrowDown',
        bubbles: true,
        cancelable: true
      })
    );
    await wait(80);
    console.log(
      `[search-probe] Down from the box → focus=${
        document.activeElement?.getAttribute('data-slot') ?? 'elsewhere'
      } selected=${useSearch.getState().selectedKey ?? '(none)'}`
    );

    // The Esc ladder, from inside the box.
    document.querySelector<HTMLInputElement>('[data-slot="search-input"]')?.focus();
    press('Escape', 'Escape');
    await wait(60);
    const clearedTo = useSearch.getState().query;
    press('Escape', 'Escape');
    await wait(60);
    const focusAfter =
      document.activeElement?.getAttribute('data-slot') ?? 'elsewhere';
    console.log(
      `[search-probe] Esc ladder: query="${clearedTo}" then focus=${focusAfter}`
    );
    // Restore the query for the capture.
    if (spec.type !== undefined) {
      await typeInto('[data-slot="search-input"]', spec.type);
      await wait(500);
    }
  }

  if (spec.expectFile !== undefined) {
    const found = useSearch
      .getState()
      .files.some((f) => f.relPath === spec.expectFile);
    console.log(
      found
        ? `[search-probe] expectFile OK: ${spec.expectFile} is in the results`
        : `[search-probe] FAILED: ${spec.expectFile} is NOT in the results`
    );
  }

  if (spec.context === true) {
    const first = useSearch.getState().files[0];
    const line = first?.matches[0]?.line;
    if (first !== undefined && line !== undefined) {
      useSearch.getState().toggleContext(first.relPath, line);
      await wait(400);
      console.log(
        `[search-probe] context for ${first.relPath}:${String(line)} → ` +
          `${String(useSearch.getState().context.get(`${first.relPath}:${String(line)}`)?.length ?? 0)} lines`
      );
    }
  }

  // (4) open a result for real and prove the selection landed.
  if (spec.accept !== undefined) {
    const before = useEditor.getState().tabs.length;
    const file = useSearch.getState().files[0];
    const match = file?.matches[0];
    if (file === undefined || match === undefined) {
      console.log('[search-probe] FAILED: nothing to accept');
      return;
    }
    useSearch.getState().setSelectedKey(`m:${file.relPath}:${String(match.line)}`);
    const list = document.querySelector<HTMLElement>(
      '[data-slot="search-results"]'
    );
    list?.focus();
    list?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
        metaKey: spec.accept === 'pinned'
      })
    );
    await wait(2500);
    const ed = useEditor.getState();
    const tab = ed.activeTab();
    console.log(
      `[search-probe] Enter → tab="${tab?.relPath ?? '(none)'}" ` +
        `preview=${String(tab?.preview ?? 'n/a')} tabs ${String(before)}→${String(ed.tabs.length)} ` +
        `wanted ${file.relPath}:${String(match.line)} ` +
        `focusStayedInList=${String(
          document.activeElement?.getAttribute('data-slot') === 'search-results'
        )}`
    );
  }
}

export async function driveSymbols(spec: SymbolProbeSpec): Promise<void> {
  if (spec.openFirst !== undefined) {
    const { requestOpenFile } = await import('../state/open-file');
    const repoPath =
      (await import('../state/store')).useApp.getState().activeProject()?.path ?? '';
    requestOpenFile({
      repoPath,
      relPath: spec.openFirst,
      path: `${repoPath}/${spec.openFirst}`,
      mode: 'file',
      source: 'quickopen',
      preview: false
    });
    // Monaco's first mount is a 26 MB lazy import; without this every number
    // below would be measuring that instead of the palette.
    await wait(3500);
  }

  const appearing = timeToAppear('.symbol-palette');
  press('o', 'KeyO', { metaKey: true, shiftKey: true });
  const painted = await appearing;
  console.log(
    painted < 0
      ? '[symbol-probe] FAILED: Cmd+Shift+O did not open the palette'
      : `[symbol-probe] Cmd+Shift+O → palette painted in ${painted.toFixed(0)} ms`
  );
  if (painted < 0) return;

  // (5) The cold state, sampled EARLY: what did the palette say while it had
  // nothing yet? Sampled at 30 ms as well as 200, because on these repos the
  // build finishes in ~200 ms and the honest-while-cold copy would otherwise
  // never be observed at all.
  for (const at of [30, 200]) {
    await wait(at === 30 ? 30 : 170);
    const cold = useSymbols.getState();
    console.log(
      `[symbol-probe] at ${String(at)} ms: indexing=${String(cold.indexing)} ` +
        `indexed=${String(cold.indexed)}/${String(cold.total)} cold=${String(cold.cold)} ` +
        `rows=${String(document.querySelectorAll('.symbol-row').length)} ` +
        `statusLine="${document.querySelector('.symbol-status')?.textContent?.trim() ?? '(none)'}"`
    );
  }

  // Paint time again, WARM. The first press of anything in this app also pays
  // for whatever the renderer was still doing at boot; the number that
  // describes the palette is the second one.
  useSymbols.getState().close();
  await wait(120);
  const warming = timeToAppear('.symbol-palette');
  press('o', 'KeyO', { metaKey: true, shiftKey: true });
  const warm = await warming;
  console.log(`[symbol-probe] warm Cmd+Shift+O → palette painted in ${warm.toFixed(0)} ms`);

  if (spec.mode !== undefined) {
    useSymbols.getState().setQuery(spec.mode);
    await wait(60);
  }

  // Wait out the build, then type.
  const buildStart = performance.now();
  for (let i = 0; i < 600; i++) {
    if (!useSymbols.getState().indexing && useSymbols.getState().total > 0) break;
    await wait(25);
  }
  const state = useSymbols.getState();
  console.log(
    `[symbol-probe] index ready in ${(performance.now() - buildStart).toFixed(0)} ms ` +
      `(${String(state.indexed)} files)`
  );

  if (spec.type !== undefined) {
    const prefix = useSymbols.getState().mode;
    await typeInto('.symbol-input', `${prefix}${spec.type}`);
    await wait(200);
  }

  const after = useSymbols.getState();
  console.log(
    `[symbol-probe] query="${after.query}" mode=${after.mode} hits=${String(after.hits.length)}`
  );
  for (const [i, hit] of after.hits.slice(0, 8).entries()) {
    console.log(
      `[symbol-probe]   ${String(i)}. ${hit.name} (${hit.kind}` +
        `${hit.container !== null ? ` in ${hit.container}` : ''}) ` +
        `${hit.relPath}:${String(hit.line)}`
    );
  }

  for (const name of spec.expect ?? []) {
    const hit = after.hits.find((h) => h.name === name);
    console.log(
      hit === undefined
        ? `[symbol-probe] FAILED: "${name}" not in the list`
        : `[symbol-probe] OK: ${name} → ${hit.kind} at ${hit.relPath}:${String(hit.line)}`
    );
  }
}
