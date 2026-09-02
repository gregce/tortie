/**
 * The inline control's one line, driven in the running app and read back off
 * the DOM (Phase 190). Installed by ./shot-hook on a harness launch and on
 * nothing else; build/probe-p190-agreement.mjs is the script that reads it.
 *
 * For each fixture: open it as a diff, wait until the diff on screen is that
 * file's, then click Off, Words, Phrases and Characters through the real
 * buttons and after each read what Pierre drew, being the `data-diff-span`
 * count, the highlighted text, and a hash of the rendered markup so two modes
 * that draw the same thing are seen to draw the SAME BYTES rather than the
 * same count, together with the line under the control and the comparison's
 * own reading, cost included. A second list of fixtures is opened only to read
 * that cost, which is what a large diff is for.
 */

import { requestOpenFile } from '../state/open-file';
import { readLastInlineDiffAgreement } from '../pierre/inline-diff-agreement';

export interface InlineAgreementProbeSpec {
  /** Files opened as diffs and driven through all four modes. */
  rels: string[];
  /** Files opened as diffs only to read what the comparison cost. */
  costRels?: string[];
}

declare global {
  interface Window {
    /** `window.__gmuxP190Agreement`: per fixture, per mode, what was drawn and what the row said. */
    __gmuxP190Agreement?: unknown;
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const shadow = (): ShadowRoot | null =>
  document.querySelector('diffs-container')?.shadowRoot ?? null;

/** Every intra-line highlight Pierre drew, in document order. */
const spanTexts = (): string[] =>
  Array.from(shadow()?.querySelectorAll('[data-diff-span]') ?? []).map(
    (el) => el.textContent ?? ''
  );

/** FNV-1a over the rendered markup, so sameness is a byte claim. */
function markupHash(): { hash: string; bytes: number } {
  const html = shadow()?.querySelector('pre')?.innerHTML ?? '';
  let hash = 0x811c9dc5;
  for (let i = 0; i < html.length; i++) {
    hash ^= html.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return { hash: (hash >>> 0).toString(16).padStart(8, '0'), bytes: html.length };
}

const noteText = (): string | null =>
  document.querySelector('.ed-diff-bar-note')?.textContent ?? null;

const buttons = (): HTMLButtonElement[] =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>('.ed-diff-bar .ed-mode-opt')
  );

/**
 * Open `rel` as a diff and hold until the diff on screen is that file's: the
 * region names the file, the skeleton is gone, Pierre has rows, and the span
 * count has stopped moving. The name check is what keeps a reading from
 * belonging to the diff still leaving the screen.
 */
interface Mounted {
  opened: boolean;
  /** What the document looked like when the wait gave up, for the report. */
  why?: Record<string, unknown>;
  /** Milliseconds from the request to the diff being steady. */
  openMs: number;
}

const started = performance.now();
const log = (line: string): void => {
  console.log(`[shot-drive] p190 +${(performance.now() - started).toFixed(0)}ms ${line}`);
};

async function openDiff(projectPath: string, rel: string): Promise<Mounted> {
  const t0 = performance.now();
  requestOpenFile({
    repoPath: projectPath,
    relPath: rel,
    path: `${projectPath}/${rel}`,
    mode: 'diff',
    source: 'tree',
    preview: false
  });
  const name = rel.split('/').pop() ?? rel;
  const look = (): Record<string, unknown> => ({
    label: document.querySelector('.ed-pierre')?.getAttribute('aria-label') ?? null,
    skeleton: document.querySelector('.ed-skeleton') !== null,
    pre: shadow()?.querySelector('pre') != null,
    bar: document.querySelector('.ed-diff-bar') !== null,
    state: document.querySelector('.ed-state-title')?.textContent ?? null,
    tabs: Array.from(document.querySelectorAll('.ed-tab')).map((t) => t.textContent ?? '')
  });
  let mounted = false;
  // Capped at eight seconds: the harness gives the whole drive sixty, and a
  // fixture that never mounts is reported rather than waited for.
  for (let i = 0; i < 32; i++) {
    const now = look();
    mounted =
      String(now['label'] ?? '').endsWith(name) &&
      now['skeleton'] === false &&
      now['pre'] === true &&
      now['bar'] === true;
    if (mounted) break;
    await wait(250);
  }
  if (!mounted) {
    const why = look();
    log(`${rel} never mounted: ${JSON.stringify(why)}`);
    return { opened: false, why, openMs: performance.now() - t0 };
  }
  // Shiki streams tokens in after the first paint, and the highlight pool
  // re-renders as they land. Hold until the count is steady.
  let last = -1;
  let steady = 0;
  for (let i = 0; i < 30; i++) {
    const now = spanTexts().length;
    if (now === last) {
      steady += 1;
      if (steady >= 4) break;
    } else {
      steady = 0;
      last = now;
    }
    await wait(200);
  }
  const openMs = performance.now() - t0;
  log(`${rel} mounted and steady in ${openMs.toFixed(0)}ms with ${String(last)} spans`);
  return { opened: true, openMs };
}

/**
 * Hold until the new highlight has landed, then until it stops moving. The
 * count leaving its previous value is the signal that the pool re-rendered;
 * when two modes draw the same bytes it never leaves, which is the case this
 * probe exists for, so the wait for a move is capped at two seconds of wall
 * time and the reading comes back with `settled` false. Phase 185 measured
 * an honest click landing in about 0.9s, so the cap is over twice that. The
 * caps are wall time rather than turns, because a turn is only as short as
 * the renderer lets a timer be, and every turn's real length is recorded.
 */
async function settle(
  from: number
): Promise<{ texts: string[]; settled: boolean; turns: number[] }> {
  const t0 = performance.now();
  const turns: number[] = [];
  let moved = false;
  let last = -1;
  let steady = 0;
  for (;;) {
    const now = spanTexts();
    const elapsed = performance.now() - t0;
    if (!moved) {
      if (now.length !== from) moved = true;
      else if (elapsed >= 2000) break;
    } else if (now.length === last) {
      steady += 1;
      if (steady >= 3) return { texts: now, settled: true, turns };
    } else {
      steady = 0;
      last = now.length;
    }
    if (elapsed >= 4000) break;
    const before = performance.now();
    await wait(200);
    turns.push(Math.round(performance.now() - before));
  }
  return { texts: spanTexts(), settled: moved, turns };
}

export async function driveInlineAgreement(
  projectPath: string,
  spec: InlineAgreementProbeSpec
): Promise<void> {
  const fixtures: Record<string, unknown> = {};
  let giveUp = false;
  for (const rel of spec.rels) {
    if (giveUp) break;
    const mount = await openDiff(projectPath, rel);
    if (!mount.opened) {
      fixtures[rel] = mount;
      giveUp = true;
      break;
    }
    const modes: Record<string, unknown> = {};
    for (const label of ['Off', 'Words', 'Phrases', 'Characters']) {
      const btn = buttons().find((b) => (b.textContent ?? '') === label);
      const from = spanTexts().length;
      btn?.click();
      const { texts, settled, turns } = await settle(from);
      log(`${rel} ${label}: ${String(texts.length)} spans, settled ${String(settled)}, line ${JSON.stringify(noteText())}, turns ${turns.join('/')}`);
      // The line is React state and lands on the click; the markup is
      // Pierre's and lands when the pool answers. Both are read after the
      // wait so they belong to the same moment.
      modes[label] = {
        clicked: btn !== undefined,
        pressed: btn?.getAttribute('aria-pressed') ?? null,
        settled,
        turns,
        spans: texts.length,
        chars: texts.reduce((n, t) => n + t.length, 0),
        sample: texts.slice(0, 8),
        markup: markupHash(),
        note: noteText()
      };
    }
    const bar = document.querySelector<HTMLElement>('.ed-diff-bar');
    const note = document.querySelector<HTMLElement>('.ed-diff-bar-note');
    fixtures[rel] = {
      opened: true,
      openMs: mount.openMs,
      agreement: readLastInlineDiffAgreement(),
      modes,
      // The row must still fit and the line must not have wrapped it: one
      // control height, the row's own floor, and no overflow.
      barHeight: bar?.getBoundingClientRect().height ?? null,
      barFits: bar === null ? null : bar.scrollWidth <= bar.clientWidth,
      noteBox:
        note === null
          ? null
          : {
              width: Math.round(note.getBoundingClientRect().width),
              truncated: note.scrollWidth > note.clientWidth,
              color: getComputedStyle(note).color,
              fontSize: getComputedStyle(note).fontSize
            },
      labelColor: (() => {
        const label = document.querySelector<HTMLElement>('.ed-diff-bar-label');
        return label === null ? null : getComputedStyle(label).color;
      })()
    };
  }
  const costs: Record<string, unknown> = {};
  for (const rel of spec.costRels ?? []) {
    if (giveUp) break;
    const mount = await openDiff(projectPath, rel);
    costs[rel] = {
      ...mount,
      agreement: readLastInlineDiffAgreement(),
      note: noteText(),
      spans: spanTexts().length
    };
  }
  // End on the first fixture in Words, so the photograph the harness takes
  // after the drive shows the line beside the control rather than the last
  // cost diff.
  const first = spec.rels[0];
  if (!giveUp && first !== undefined) {
    await openDiff(projectPath, first);
    buttons().find((b) => (b.textContent ?? '') === 'Words')?.click();
    await wait(600);
  }
  window.__gmuxP190Agreement = {
    fixtures,
    costs,
    driveMs: performance.now() - started
  };
}
