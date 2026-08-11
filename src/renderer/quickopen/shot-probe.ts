/**
 * Harness-only ⌘P probe (Phase 14 verification). Driven from the
 * GMUX_SHOT_DRIVE spec (`quickOpen: {…}`) and inert otherwise.
 *
 * It exists because the two claims that matter about quick open are not
 * things a screenshot can settle on its own:
 *
 *  1. **It opens on the REAL chord, and it opens instantly** — the probe
 *     dispatches ⌘P as a capture-phase keyboard event on window, exactly what
 *     the shipped handler listens for, and reports the milliseconds from
 *     keystroke to a painted panel.
 *  2. **The ranking is the shipped ranking** — the probe types the query one
 *     character at a time through the real input's change handler, waits for
 *     the answer, and logs the top rows AND the per-keystroke round trip. A
 *     unit test proves the scorer; only this proves the whole path —
 *     renderer → preload → main → worker → ripgrep → back.
 *
 * Findings go to console.log, which GMUX_SHOT_VERBOSE=1 tees into the harness
 * output — measured numbers rather than assurance. The screenshot is then
 * evidence of the LOOK; these lines are evidence of the BEHAVIOUR.
 *
 * Example (from the repo root, isolated user-data dir):
 *
 *   GMUX_SHOT=/tmp/qo.png GMUX_SHOT_VERBOSE=1 GMUX_SHOT_DELAY_MS=12000 \
 *   GMUX_SHOT_DRIVE='{"projectPath":"/Users/gdc/gmux",
 *     "quickOpen":{"type":"openfil","expectTop":"src/renderer/state/open-file.ts"}}' \
 *   npx electron . --user-data-dir=/tmp/gmux-qo-probe
 */

import { requestOpenFile } from '../state/open-file';
import { useApp } from '../state/store';
import { useEditor } from '../editor/store';
import { useQuickOpen } from './store';

export interface QuickOpenProbeSpec {
  /** Text to type, one character at a time, through the real handler. */
  type?: string;
  /** Fail loudly unless this relative path is the first row. */
  expectTop?: string;
  /** Also press ⌘P a second time to widen the scope, and report the rows. */
  widen?: boolean;
  /**
   * Open these repo-relative files first, through the REAL open-file bus, so
   * the recently-opened tiebreaker has something in it. This is how the
   * "three files with the same name" case is exercised: with no history the
   * shortest path wins (VS Code's own tiebreak); with history, the one you
   * were just in does.
   */
  openFirst?: string[];
  /**
   * Press ↩ (or ⌘↩) on the selected row for real, then report which editor
   * tab it produced and whether that tab is the reusable PREVIEW slot. This
   * is the only way to prove the Phase 12.4 bargain end to end: ↩ recycles
   * one italic tab, ⌘↩ keeps it.
   */
  accept?: 'preview' | 'pinned';
  /** Leave the palette OPEN for the capture. Default true. */
  leaveOpen?: boolean;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait until the store stops having an answer in flight, or give up.
 *
 * The poll interval is the measurement floor for the keystroke numbers below,
 * so it is deliberately tight: at 20 ms every keystroke would "cost" 21 ms and
 * the report would be measuring this loop rather than the feature.
 *
 * READ THE NUMBERS WITH THIS IN MIND: Chromium clamps `setTimeout` to ~1 s in
 * a renderer it considers backgrounded, so a run whose window never came to
 * the front reports ~1,000 ms for every keystroke. That is this loop being
 * throttled, not the palette being slow — a foreground run of the same build
 * reports 4-6 ms. If every number is ~1,000, re-run with the window focused
 * before believing any of them.
 */
async function settle(timeoutMs = 4000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = useQuickOpen.getState();
    if (!s.pending && s.ready) return;
    await wait(1);
  }
}

function pressCmdP(): void {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'p',
      code: 'KeyP',
      metaKey: true,
      bubbles: true,
      cancelable: true
    })
  );
}

function report(): void {
  const s = useQuickOpen.getState();
  console.log(
    `[qo-probe] query="${s.query}" hits=${String(s.hits.length)} indexed=${String(s.indexed)} ready=${String(s.ready)} scope=${s.allProjects ? 'all-projects' : 'active-project'} selected=${String(s.selected)} domSelected=${String(document.querySelectorAll('.qo-row.selected').length)} domRows=${String(document.querySelectorAll('.qo-row').length)}`
  );
  for (const [i, hit] of s.hits.slice(0, 5).entries()) {
    const marked = [...hit.relPath]
      .map((c, ci) => (hit.positions.includes(ci) ? `[${c}]` : c))
      .join('');
    console.log(`[qo-probe]   ${String(i)}. ${marked}  score=${String(hit.score)}`);
  }
}

export async function driveQuickOpen(spec: QuickOpenProbeSpec): Promise<void> {
  for (const rel of spec.openFirst ?? []) {
    const repoPath = useApp.getState().activeProject()?.path ?? '';
    requestOpenFile({
      repoPath,
      relPath: rel,
      path: `${repoPath}/${rel}`,
      mode: 'file',
      source: 'quickopen',
      preview: false
    });
    // Long enough for the editor panel to finish mounting Monaco. Without
    // it every number below measures a 26 MB lazy import instead of the
    // palette: the first ⌘P after an editor open appeared to take 1,006 ms,
    // all of it Monaco blocking the renderer's main thread.
    await wait(3000);
    console.log(`[qo-probe] seeded recents with ${rel}`);
  }

  const t0 = performance.now();
  pressCmdP();
  // One frame is all a palette gets: the whole point is that it never waits
  // on the index. Measure when the panel is actually in the DOM.
  let painted = -1;
  for (let i = 0; i < 60; i++) {
    await wait(8);
    if (document.querySelector('.qo-panel') !== null) {
      painted = performance.now() - t0;
      break;
    }
  }
  console.log(
    painted < 0
      ? '[qo-probe] FAILED: Cmd+P did not open the palette'
      : `[qo-probe] Cmd+P -> panel painted in ${painted.toFixed(0)} ms`
  );
  if (painted < 0) return;

  const beforeWarm = useQuickOpen.getState();
  console.log(
    `[qo-probe] at open: ready=${String(beforeWarm.ready)} indexed=${String(beforeWarm.indexed)} (the palette does not wait for either)`
  );

  const text = spec.type ?? '';
  const latencies: number[] = [];
  for (let i = 1; i <= text.length; i++) {
    const t = performance.now();
    useQuickOpen.getState().setQuery(text.slice(0, i));
    await settle();
    latencies.push(performance.now() - t);
  }
  if (latencies.length > 0) {
    const sorted = [...latencies].sort((a, b) => a - b);
    console.log(
      `[qo-probe] ${String(latencies.length)} keystrokes: median ${(sorted[Math.floor(sorted.length / 2)] ?? 0).toFixed(1)} ms, worst ${(sorted[sorted.length - 1] ?? 0).toFixed(1)} ms (renderer → main → worker → rg → back)`
    );
  }
  await settle();
  report();

  if (spec.expectTop !== undefined) {
    const top = useQuickOpen.getState().hits[0]?.relPath ?? '(none)';
    console.log(
      top === spec.expectTop
        ? `[qo-probe] top hit OK: ${top}`
        : `[qo-probe] FAILED: expected "${spec.expectTop}" first, got "${top}"`
    );
  }

  if (spec.widen === true) {
    pressCmdP();
    await settle();
    report();
  }

  if (spec.accept !== undefined) {
    const before = useEditor.getState().tabs.length;
    const input = document.querySelector<HTMLInputElement>('.qo-input');
    input?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        metaKey: spec.accept === 'pinned',
        bubbles: true,
        cancelable: true
      })
    );
    await wait(400);
    const ed = useEditor.getState();
    const tab = ed.activeTab();
    console.log(
      `[qo-probe] ${spec.accept === 'pinned' ? 'Cmd+Enter' : 'Enter'} -> tab="${tab?.relPath ?? '(none)'}" preview=${String(tab?.preview ?? 'n/a')} selection=${JSON.stringify(ed.lastRequest?.selection ?? null)} tabs ${String(before)}->${String(ed.tabs.length)} paletteOpen=${String(useQuickOpen.getState().open)}`
    );
  }

  if (spec.leaveOpen === false) useQuickOpen.getState().close();

  // Let the compositor produce a frame of the FINISHED state before the
  // harness is told it can capture. capturePage() resolves with whatever the
  // renderer next paints, and this probe keeps the main thread busy — without
  // this the PNG can be a frame from after the harness's own cleanup, which
  // is how one run captured "No project open" over correct console output.
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r()))
  );
  await wait(300);
  // What the PNG will actually contain, stated in numbers. Reading a
  // selection fill off a screenshot by eye is exactly the kind of check that
  // passes when it should fail.
  const el = document.querySelector('.qo-row.selected');
  console.log(
    `[qo-probe] at capture: rows=${String(document.querySelectorAll('.qo-row').length)} selectedFill=${el === null ? 'NONE' : getComputedStyle(el).backgroundColor} pending=${String(useQuickOpen.getState().pending)}`
  );
}
