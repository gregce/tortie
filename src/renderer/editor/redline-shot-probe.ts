/**
 * The Redline VIEW, driven in the running app and read back off the DOM
 * (Phase 194). Installed by ./shot-hook on a harness launch and on nothing
 * else; build/probe-p194-redline-view.mjs is the script that reads it.
 *
 * Everything here is read off the RUNNING app rather than asserted, and the
 * order is a JOURNEY rather than a resting state. For each fixture: open it
 * as a diff, confirm the diff is what opened, switch to Redline through the
 * real segmented control, and read the composed document as the runs it is
 * made of, so the probe can hold the two projections against the files it
 * wrote. Then the journey the backlog names: Diff to Redline to File to
 * Redline, a scroll, a squeeze to the panel's floor and back, a second file,
 * an edit in Source and a return. The copies are last and are not run from
 * here: main runs the window's own Copy command over the selection this
 * module sets up, and reads the SYSTEM clipboard, which is the only honest
 * proof of a copy handler.
 */

import { requestOpenFile } from '../state/open-file';
import { getWorkingModel } from './monaco-loader';
import { useEditor } from './store';

export interface RedlineViewProbeSpec {
  /** Prose files with changes, each opened as a diff and switched to Redline. */
  rels: string[];
  /** A file that is NOT prose: the control must not offer Redline for it. */
  codeRel?: string;
  /** A markdown file: Redline sits beside Preview and draws the SOURCE. */
  markdownRel?: string;
  /** A prose file with NO changes against HEAD: the plain document. */
  sameRel?: string;
  /**
   * A second prose file opened during the journey, which must open as Diff.
   * It must be a file NO earlier step opened: an already open tab is only
   * raised and keeps whatever mode it was left in, so a file the fixture
   * loop left on Redline would say nothing about how a file opens.
   */
  secondRel?: string;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** One run of the document, exactly as the DOM holds it. */
interface DrawnRun {
  kind: 'same' | 'del' | 'ins';
  text: string;
}

declare global {
  interface Window {
    /** `window.__gmuxP194Redline`: what the view drew, per fixture and along the journey. */
    __gmuxP194Redline?: unknown;
    /**
     * Phase 194. Set up ONE selection in the document and answer what it
     * covers, so main can then run the window's own Copy command over it
     * and read the system clipboard. GMUX_SHOT_CLIPBOARD carries the calls.
     */
    __gmuxRedlineSelect?: (which: string) => Promise<unknown>;
  }
}

export async function driveRedlineView(
  projectPath: string,
  openRel: string,
  spec: RedlineViewProbeSpec
): Promise<void> {
  const out: Record<string, unknown> = {};
  const journey: string[] = [];
  // Main gives the whole drive one ceiling and prints nothing inside it, so
  // a drive that dies there names the phase it reached and the time it took
  // to get there. Every renderer console line reaches the harness log.
  const t0 = performance.now();
  const mark = (what: string): void => {
    // The visibility matters: a hidden window has its timers aligned to one
    // second by Chromium, which turns every short wait below into a second.
    console.log(
      `[shot-drive] redline ${what} at ${String(Math.round(performance.now() - t0))} ms, ${document.visibilityState}`
    );
  };

  const shadowOf = (): ShadowRoot | null =>
    document.querySelector('diffs-container')?.shadowRoot ?? null;
  const doc = (): HTMLElement | null =>
    document.querySelector<HTMLElement>('.ed-redline-doc');
  const modeButton = (label: string): HTMLButtonElement | null =>
    document.querySelector<HTMLButtonElement>(
      `.ed-tabs-actions .ed-mode [aria-label="${label}"]`
    );
  const panelWidth = (): number =>
    Math.round(document.querySelector<HTMLElement>('.ed-panel')?.clientWidth ?? 0);

  /** The segmented control as the person sees it. */
  const modeState = (): Record<string, unknown> => {
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ed-tabs-actions .ed-mode [role="radio"]')
    );
    return {
      options: buttons.map((b) => b.getAttribute('aria-label')),
      checked: buttons.find((b) => b.getAttribute('aria-checked') === 'true')?.getAttribute('aria-label') ?? null,
      redline: ((): Record<string, unknown> | null => {
        const b = modeButton('Redline');
        return b === null
          ? null
          : {
              title: b.getAttribute('title'),
              disabled: b.disabled,
              text: b.textContent,
              checked: b.getAttribute('aria-checked')
            };
      })()
    };
  };

  /** Open one file as a diff and wait until the diff surface has settled. */
  const openAsDiff = async (rel: string): Promise<void> => {
    requestOpenFile({
      repoPath: projectPath,
      relPath: rel,
      path: `${projectPath}/${rel}`,
      mode: 'diff',
      source: 'tree',
      preview: false
    });
    // An already open tab is only raised and keeps the mode a person left it
    // in (store.ts, the `existing` path), so a tab an earlier step left on
    // Redline is put back on Diff the way a person would, through the
    // control. A fresh tab opens on Diff and the click never happens.
    const path = `${projectPath}/${rel}`;
    for (let i = 0; i < 40; i++) {
      const state = useEditor.getState();
      if (state.tabs.find((t) => t.id === state.activeId)?.path === path) break;
      await wait(50);
    }
    if (modeState().checked !== 'Diff') modeButton('Diff')?.click();
    for (let i = 0; i < 120; i++) {
      const drawn = shadowOf()?.querySelector('[data-line]') != null;
      const same = document.querySelector('.ed-state-title')?.textContent === 'No changes';
      if ((drawn || same) && document.querySelector('.ed-skeleton') === null) break;
      await wait(150);
    }
    await wait(600);
  };

  const waitForDoc = async (): Promise<void> => {
    for (let i = 0; i < 80; i++) {
      if (doc() !== null && document.querySelector('.ed-skeleton') === null) return;
      await wait(100);
    }
  };

  const waitForMonaco = async (): Promise<void> => {
    for (let i = 0; i < 120; i++) {
      if (document.querySelector('.monaco-editor .view-lines') !== null) return;
      await wait(150);
    }
  };

  const runsOf = (el: HTMLElement): DrawnRun[] =>
    Array.from(el.childNodes).map((node) => {
      const tag = node.nodeType === Node.ELEMENT_NODE ? (node as Element).tagName.toLowerCase() : '#text';
      return {
        kind: tag === 'del' ? 'del' : tag === 'ins' ? 'ins' : 'same',
        text: node.textContent ?? ''
      };
    });

  /**
   * Every adjacent deletion and insertion, in either order, with whether the
   * first one's LAST line box and the second one's FIRST line box sit on the
   * same line. A change to the last word of a line used to carry the line
   * break in the deletion, so the insertion dropped to the next line.
   */
  const pairsOf = (el: HTMLElement): Record<string, unknown>[] => {
    const nodes = Array.from(el.childNodes);
    const out: Record<string, unknown>[] = [];
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1];
      const b = nodes[i];
      if (!(a instanceof HTMLElement) || !(b instanceof HTMLElement)) continue;
      const ta = a.tagName.toLowerCase();
      const tb = b.tagName.toLowerCase();
      if (!((ta === 'del' && tb === 'ins') || (ta === 'ins' && tb === 'del'))) continue;
      const ra = Array.from(a.getClientRects());
      const rb = Array.from(b.getClientRects());
      const lastA = ra[ra.length - 1];
      const firstB = rb[0];
      out.push({
        first: { kind: ta, text: a.textContent ?? '' },
        second: { kind: tb, text: b.textContent ?? '' },
        sameLine:
          lastA !== undefined && firstB !== undefined
            ? Math.abs(lastA.top - firstB.top) < 1
            : null
      });
    }
    return out;
  };

  /** Distinct line boxes a set of elements occupies, bucketed by top. */
  const lineTops = (els: Element[]): number =>
    new Set(
      els.flatMap((el) =>
        Array.from(el.getClientRects()).map((r) => Math.round(r.top / 4))
      )
    ).size;

  /** Everything the probe judges about a drawn document. */
  const readDoc = (): Record<string, unknown> => {
    const el = doc();
    if (el === null) return { present: false };
    const dels = Array.from(el.querySelectorAll<HTMLElement>('del'));
    const inses = Array.from(el.querySelectorAll<HTMLElement>('ins'));
    const d0 = dels[0];
    const i0 = inses[0];
    const rect = el.getBoundingClientRect();
    const scroller = document.querySelector<HTMLElement>('.ed-redline-scroll');
    return {
      present: true,
      runs: runsOf(el),
      pairs: pairsOf(el),
      note: document.querySelector('.ed-redline-view .ed-note .banner-text')?.textContent ?? null,
      // What must NOT be in the tree of this view.
      pierre: document.querySelectorAll('diffs-container').length,
      monaco: document.querySelectorAll('.monaco-editor').length,
      renderedMarkdown: document.querySelectorAll('.md-content').length,
      lineNumbers: shadowOf()?.querySelectorAll('[data-column-number]').length ?? 0,
      // Read only: nothing editable, no caret host.
      contentEditable: el.isContentEditable,
      editableInside: el.querySelectorAll('[contenteditable], textarea, input').length,
      focused: document.activeElement?.className ?? null,
      // Layout and colour, from computed style and rectangles.
      whiteSpace: getComputedStyle(el).whiteSpace,
      fontFamily: getComputedStyle(el).fontFamily,
      delColor: d0 === undefined ? null : getComputedStyle(d0).color,
      delDecoration: d0 === undefined ? null : getComputedStyle(d0).textDecorationLine,
      insColor: i0 === undefined ? null : getComputedStyle(i0).color,
      insDecoration: i0 === undefined ? null : getComputedStyle(i0).textDecorationLine,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      // The parent measurement's other half: how many line boxes the FIRST
      // change occupies. One changed word on one line is one row here.
      firstChangeRows:
        d0 === undefined && i0 === undefined
          ? 0
          : lineTops([d0, i0].filter((x): x is HTMLElement => x !== undefined)),
      firstPairSameTop:
        d0 !== undefined && i0 !== undefined
          ? Math.abs(d0.getBoundingClientRect().top - i0.getBoundingClientRect().top) < 1
          : null,
      scrollHeight: scroller?.scrollHeight ?? null,
      clientHeight: scroller?.clientHeight ?? null
    };
  };

  const root = getComputedStyle(document.documentElement);
  out['tokens'] = {
    error: root.getPropertyValue('--error').trim(),
    success: root.getPropertyValue('--success').trim()
  };

  // 1. EVERY FIXTURE: open as a diff, confirm Diff opened, switch to Redline
  //    through the real control, read the document.
  const fixtures: Record<string, unknown> = {};
  for (const rel of spec.rels) {
    await openAsDiff(rel);
    const opened = modeState();
    const pierreBefore = document.querySelectorAll('diffs-container').length;
    modeButton('Redline')?.click();
    await waitForDoc();
    await wait(400);
    fixtures[rel] = {
      opened,
      pierreBefore,
      afterClick: modeState(),
      doc: readDoc()
    };
    journey.push(`opened ${rel} as a diff and switched to Redline`);
    mark(`read ${rel}`);
  }
  out['fixtures'] = fixtures;

  // 2. A FILE THAT IS NOT PROSE: no Redline in the control at all.
  if (spec.codeRel !== undefined) {
    await openAsDiff(spec.codeRel);
    out['onCode'] = { rel: spec.codeRel, ...modeState(), doc: doc() !== null };
    journey.push('opened a file that is not prose');
    mark('read the file that is not prose');
  }

  // 3. MARKDOWN: Redline beside Preview, Source and Split, drawing the SOURCE.
  if (spec.markdownRel !== undefined) {
    await openAsDiff(spec.markdownRel);
    const opened = modeState();
    modeButton('Redline')?.click();
    await waitForDoc();
    await wait(400);
    out['onMarkdown'] = { rel: spec.markdownRel, opened, afterClick: modeState(), doc: readDoc() };
    journey.push('opened a markdown file and switched to Redline');
    mark('read the markdown file');
  }

  // 4. NO CHANGES: the plain document, not an error.
  if (spec.sameRel !== undefined) {
    await openAsDiff(spec.sameRel);
    const opened = modeState();
    const state = document.querySelector('.ed-state-title')?.textContent ?? null;
    modeButton('Redline')?.click();
    await waitForDoc();
    await wait(400);
    out['onSame'] = {
      rel: spec.sameRel,
      opened,
      diffState: state,
      afterClick: modeState(),
      doc: readDoc(),
      errorState: document.querySelector('.ed-redline-view .ed-state') !== null
    };
    journey.push('opened a file with no changes and switched to Redline');
    mark('read the file with no changes');
  }

  // 5. THE JOURNEY on the file this run is about.
  await openAsDiff(openRel);
  const journeyOut: Record<string, unknown> = {};
  journeyOut['diffFirst'] = modeState();
  modeButton('Redline')?.click();
  await waitForDoc();
  await wait(400);
  const first = readDoc();
  journeyOut['redline'] = first;
  modeButton('File')?.click();
  await waitForMonaco();
  await wait(600);
  journeyOut['file'] = {
    ...modeState(),
    monaco: document.querySelectorAll('.monaco-editor').length,
    doc: doc() !== null
  };
  modeButton('Redline')?.click();
  await waitForDoc();
  await wait(400);
  journeyOut['redlineAgain'] = readDoc();
  journey.push('went Diff, Redline, File, Redline with the file open');
  mark('went Diff, Redline, File, Redline');

  // Scroll, on the view's own scroller.
  const scroller = document.querySelector<HTMLElement>('.ed-redline-scroll');
  if (scroller !== null) {
    scroller.scrollTop = scroller.scrollHeight;
    await wait(500);
    journeyOut['scrolled'] = {
      scrollTop: Math.round(scroller.scrollTop),
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
      runs: (readDoc() as { runs?: unknown }).runs
    };
    scroller.scrollTop = 0;
    await wait(300);
    journey.push('scrolled to the end and back');
    mark('scrolled');
  }

  // Resize, through the divider's own keyboard: Home to the floor, End back.
  const wideWidth = panelWidth();
  const wide = readDoc();
  const divider = document.querySelector<HTMLElement>('.ed-divider');
  divider?.focus();
  divider?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  await wait(900);
  const narrowWidth = panelWidth();
  const narrow = readDoc();
  divider?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  await wait(900);
  journeyOut['reflow'] = {
    wideWidth,
    narrowWidth,
    backWidth: panelWidth(),
    wide,
    narrow,
    back: readDoc()
  };
  journey.push('squeezed the panel to its floor and back');
  mark('squeezed the panel');

  // A second file: it must open as DIFF, with Redline offered and unchosen.
  if (spec.secondRel !== undefined) {
    await openAsDiff(spec.secondRel);
    journeyOut['second'] = { rel: spec.secondRel, ...modeState(), doc: doc() !== null };
    journey.push('opened a second file, which opened as a diff');
    mark('opened the second file');
  }

  // Back, edit in Source, and come back to the redline.
  await openAsDiff(openRel);
  modeButton('File')?.click();
  await waitForMonaco();
  await wait(600);
  const tabId = useEditor.getState().activeId;
  const model = tabId === null ? null : getWorkingModel(tabId);
  const EDIT = 'Edited in Source. ';
  if (model !== null) {
    model.applyEdits([
      {
        range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
        text: EDIT
      }
    ]);
  }
  await wait(300);
  modeButton('Redline')?.click();
  await waitForDoc();
  await wait(700);
  const edited = readDoc();
  const modelText = model?.getValue() ?? null;
  // And take the edit back through the same model, so the tab is clean.
  if (model !== null) {
    model.applyEdits([
      {
        range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 + EDIT.length },
        text: ''
      }
    ]);
  }
  // The document follows the model through a debounce and a render, so it
  // is read once it has caught up rather than after a guess at how long that
  // takes, and the time it took is recorded rather than assumed.
  const revertedAt = performance.now();
  let caughtUp = false;
  for (let i = 0; i < 40; i++) {
    const runs = (readDoc() as { runs?: DrawnRun[] }).runs ?? [];
    if (runs.every((r) => r.kind !== 'ins' || !r.text.startsWith(EDIT))) {
      caughtUp = true;
      break;
    }
    await wait(100);
  }
  const revertMs = Math.round(performance.now() - revertedAt);
  mark(`the document caught up with the revert in ${String(revertMs)} ms, caught up ${String(caughtUp)}`);
  journeyOut['edited'] = {
    edit: EDIT,
    modelPresent: model !== null,
    modelText,
    doc: edited,
    revertMs,
    caughtUp,
    modelAfterRevert: model?.getValue() ?? null,
    reverted: readDoc(),
    dirtyAfterRevert: useEditor.getState().tabs.find((t) => t.id === tabId)?.dirty ?? null
  };
  journey.push('edited the file in Source and came back to the redline');
  mark('edited in Source and came back');
  out['journey'] = journeyOut;

  // 6. THE COPIES, set up here and run by main.
  const setups: unknown[] = [];
  out['copySetups'] = setups;
  window.__gmuxRedlineSelect = async (which: string): Promise<unknown> => {
    const selection = window.getSelection();
    const el = doc();
    if (el === null || selection === null) {
      const missing = { which, ok: false };
      setups.push(missing);
      return missing;
    }
    const runs = runsOf(el);
    selection.removeAllRanges();
    let covers: [number, number] | null = null;
    if (which === 'doc') {
      selection.selectAllChildren(el);
      covers = [0, runs.length - 1];
    } else if (which === 'all') {
      // The Cmd-A shape (Phase 197 item 21): the Edit menu's selectAll role
      // selects the whole body, so the selection reaches past the document
      // on both sides and the rest of the app's selectable text rides along.
      selection.selectAllChildren(document.body);
      covers = [0, runs.length - 1];
    } else if (which === 'pair') {
      // From the first deletion to the first insertion after it, whatever
      // sits between them.
      const kids = Array.from(el.childNodes);
      const d = kids.findIndex((k) => (k as Element).tagName?.toLowerCase() === 'del');
      const i = kids.findIndex(
        (k, at) => at > d && (k as Element).tagName?.toLowerCase() === 'ins'
      );
      if (d !== -1 && i !== -1) {
        const range = document.createRange();
        range.setStartBefore(kids[d] as Node);
        range.setEndAfter(kids[i] as Node);
        selection.addRange(range);
        covers = [d, i];
      }
    } else if (which === 'del') {
      // Wholly inside one deleted run: the clone holds its text and no
      // `del` element, so the deleted words are what a person deliberately
      // selecting them gets (./redline-copy).
      const first = el.querySelector('del');
      const textNode = first?.firstChild ?? null;
      const kids = Array.from(el.childNodes);
      if (first !== null && textNode !== null) {
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(textNode, (textNode.textContent ?? '').length);
        selection.addRange(range);
        const at = kids.indexOf(first);
        covers = [at, at];
      }
    }
    const answer = {
      which,
      ok: covers !== null,
      covers,
      runs,
      drawn: selection.toString()
    };
    setups.push(answer);
    return answer;
  };
  journey.push('installed the selector main copies from');

  out['atRest'] = { ...modeState(), doc: readDoc() };
  out['journeyLog'] = journey;
  window.__gmuxP194Redline = out;
  mark('finished');
}
