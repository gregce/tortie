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
 *  3. **PHASE 99. The machine is in the key** — with `remoteProject` set, the
 *     probe opens a folder on a real machine as a tab, drives the palette
 *     there, prints the sentence the panel drew, accepts a row for real, and
 *     prints the recents key beside the key the same relative path composed on
 *     this Mac. The two must be different strings, and the editor tab id must
 *     begin `machine:<id>:`. That is the one claim a screenshot cannot settle
 *     and the one whose failure would open the wrong file.
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
import { recentKeys } from './recents';
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
  /**
   * PHASE 99. Drive the palette on a tab whose folder is on a machine. The id
   * must be a machine the run really has, because the name list is read over
   * the link rather than injected.
   *
   * The tab is opened AFTER `openFirst`, so the files named there are opened
   * from the project on this Mac and the recents key they compose is the LOCAL
   * key. That key is printed beside the one the machine's own file composes,
   * and the two must be different strings.
   */
  remoteProject?: { machineId: string; path: string; name: string };
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

/**
 * The machine note the panel DREW, one line per element, or the empty string.
 *
 * Read off the DOM rather than composed from the store, because the claim being
 * settled is what a person sees. A store field is not a sentence.
 */
function machineNoteText(): string {
  const node = document.querySelector('[data-slot="quickopen-machine-note"]');
  if (node === null) return '';
  return [...node.children]
    .map((one) => (one.textContent ?? '').trim())
    .filter((one) => one.length > 0)
    .join(' | ');
}

export async function driveQuickOpen(spec: QuickOpenProbeSpec): Promise<void> {
  /** PHASE 99. The key the last open from THIS Mac composed. */
  let localRecentKey: string | null = null;

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

  // PHASE 99. After the local seeding and before the chord, so the key above
  // was composed on this Mac and the key below is composed on the machine.
  if (spec.remoteProject !== undefined) {
    const { machineId, path, name } = spec.remoteProject;
    localRecentKey = recentKeys()[0] ?? null;
    console.log(
      `[qo-probe] recents key from this Mac: "${localRecentKey ?? '(none)'}"`
    );
    const opened = await useApp
      .getState()
      .openTargetProject({ machineId, path });
    if (!opened.ok) {
      console.log(
        `[qo-probe] FAILED: could not open ${path} on ${machineId} as a tab`
      );
      return;
    }
    // The tab has to be the active one and its sidebars have to have settled
    // before the chord, or the palette would read the project it replaced.
    await wait(1200);
    const project = useApp.getState().activeProject();
    console.log(
      `[qo-probe] active project: name="${project?.name ?? '(none)'}" ` +
        `path="${project?.path ?? ''}" machine=${project?.machineId ?? 'local'} ` +
        `wanted="${name}"`
    );
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

  if (spec.remoteProject !== undefined) {
    const read = useQuickOpen.getState().elsewhereRead;
    console.log(
      `[qo-probe] machine read: mode=${read?.mode ?? 'none'} ` +
        `names=${String(read?.count ?? 0)} ` +
        `capped=${String(read?.capped ?? false)} ` +
        `truncated=${String(read?.truncated ?? false)}`
    );
    console.log(`[qo-probe] machine note: "${machineNoteText()}"`);
  }

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
    // PHASE 99. THE TRAP'S OWN PROOF, and it is why this probe accepts a row
    // for real instead of reading the store. The tab id and the recents key
    // both have to carry the machine, and the recents key must not be the
    // string the same relative path composes on this Mac.
    if (spec.remoteProject !== undefined) {
      const wanted = `machine:${spec.remoteProject.machineId}:`;
      const tabId = tab?.id ?? '(none)';
      console.log(
        tabId.startsWith(wanted)
          ? `[qo-probe] editor tab id OK: ${tabId}`
          : `[qo-probe] FAILED: tab id "${tabId}" does not begin "${wanted}"`
      );
      const machineKey = recentKeys()[0] ?? '(none)';
      console.log(`[qo-probe] recents key from the machine: "${machineKey}"`);
      console.log(
        machineKey.startsWith(wanted)
          ? '[qo-probe] the recents key carries the machine OK'
          : `[qo-probe] FAILED: recents key does not begin "${wanted}"`
      );
      console.log(
        machineKey !== localRecentKey
          ? '[qo-probe] the two recents keys are different strings OK'
          : '[qo-probe] FAILED: the machine key equals this Mac key'
      );
    }
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
