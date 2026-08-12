/**
 * Harness-only zoom probe (Phase 12.11 verification).
 *
 * Driven from the GMUX_SHOT_DRIVE spec (`zoom: {…}`) and inert otherwise. It
 * exists because almost nothing this phase claims is visible in a screenshot:
 *
 *  1. the terminal zooms for REAL — xterm's font changes, the pane re-fits,
 *     and the new cols/rows reach tmux;
 *  2. a scrolled pane keeps its place across that resize, and 12.3's
 *     scrollbar re-measures instead of drifting;
 *  3. CSS `zoom` did not break pointer mapping — a rect taken from a zoomed
 *     element still hit-tests back to that element, which is the property
 *     every drag, drop zone and insertion indicator in the app relies on;
 *  4. the two coordinate spaces `zoom` creates are measured, not assumed —
 *     including the `position: fixed` answer, which the spec does not give
 *     you — and the one real consumer (the dock's insertion line) is checked
 *     against the row it is supposed to sit on;
 *  5. ⌘0 resets one region and ⌘⇧0 resets all five.
 *
 * Everything is driven by the REAL gesture: chords are dispatched as keyboard
 * events on the region's own focused element, and the pane is scrolled with a
 * wheel event rather than through the scroll bridge — see the note at that
 * call site for the bug the shortcut version invented.
 *
 * Findings go to `console.log`, which GMUX_SHOT_VERBOSE=1 tees into the
 * harness output — measured numbers rather than assurance.
 *
 * Example (from the repo root, against an isolated user-data dir so the
 * probe's scratch session cannot touch a live manifest):
 *
 *   GMUX_SHOT=/tmp/zoom.png GMUX_SHOT_VERBOSE=1 GMUX_SHOT_DELAY_MS=9000 \
 *   GMUX_SHOT_DRIVE='{"projectPath":"…","session":{"agent":"shell","name":"zz-zoom"},
 *     "orientation":"right","sidebarView":"explorer",
 *     "zoom":{"levels":{"terminal":1.5,"explorer":1.5,"sessions":1.5},
 *             "seed":"seq 1 400","scrollBack":40}}' \
 *   npx electron . --user-data-dir=/tmp/gmux-zoom-probe
 */

import { getTerminal } from '../terminal/drop';
import { cssZoomOf } from './coords';
import { scrollBridge } from '../terminal/scroll/surface';
import type { ZoomRegionId } from './regions';
import { isSidebarViewId } from '../state/sidebar-views';
import { useLayout } from '../state/layout';
import { useZoom } from './store';

export interface ZoomProbeSpec {
  /** Target level per region, reached by pressing the real chord. */
  levels?: Partial<Record<ZoomRegionId, number>>;
  /** Session to use for the terminal-geometry and scroll checks. */
  sessionId?: string;
  /** Scroll the pane back this many lines before zooming it. */
  scrollBack?: number;
  /**
   * Shell command to run first, so the pane HAS history to be scrolled away
   * from. A fresh prompt has none, and "scroll position preserved" is only a
   * claim worth testing on a pane that is actually scrolled.
   */
  seed?: string;
  /**
   * After measuring, press ⌘0 on this region (or ⌘⇧0 with 'all') and report
   * what came back to 100% — the other half of the spec's verify list.
   */
  reset?: ZoomRegionId | 'all';
  /**
   * Press ⌘+ on this region as the very LAST thing, so the capture lands
   * inside the readout's ~1.1 s window. The readout is the only part of this
   * phase that is purely visual, so it is the only part a PNG has to prove.
   */
  hud?: ZoomRegionId;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function log(line: string): void {
  console.log(`[zoom-probe] ${line}`);
}

/**
 * The sidebar view a region belongs to, or null. Asking by ATTRIBUTE rather
 * than taking the first `.sidebar-view` on the page is what lets the probe
 * prove the Phase 18.55 claim: press the chord over Search and read Source
 * Control, which is exactly what the old rule did.
 */
function sidebarViewEl(region: ZoomRegionId): HTMLElement | null {
  if (!isSidebarViewId(region)) return null;
  return document.querySelector<HTMLElement>(
    `.sidebar-view[data-view="${region}"]`
  );
}

/** Where a region's keyboard focus lives, for dispatching the real chord. */
function focusTargetFor(region: ZoomRegionId): HTMLElement | null {
  const view = sidebarViewEl(region);
  if (view !== null) return view;
  switch (region) {
    case 'terminal':
      return document.querySelector<HTMLElement>(
        '.gmux-terminal-mount textarea'
      );
    case 'sessions':
      return document.querySelector<HTMLElement>('.session-dock .dock-list');
    case 'editor':
      return document.querySelector<HTMLElement>('.ed-panel');
    default:
      // A sidebar view that is not the one on screen: nothing to press on.
      return null;
  }
}

/** The element a region's CSS zoom actually lands on. */
function zoomedElementFor(region: ZoomRegionId): HTMLElement | null {
  const view = sidebarViewEl(region);
  if (view !== null) {
    // Search has no `.sidebar-rest` — zoom lands on the results scroller, or
    // on the query block while the list is empty (zoom.css says why).
    return (
      view.querySelector<HTMLElement>('.sidebar-rest') ??
      view.querySelector<HTMLElement>('.search-results') ??
      view.querySelector<HTMLElement>('.search-body')
    );
  }
  switch (region) {
    case 'sessions':
      return document.querySelector<HTMLElement>('.session-dock .dock-list');
    case 'editor':
      return document.querySelector<HTMLElement>('.md-content');
    case 'terminal':
      return null; // by design — the terminal changes its font, not its box
    default:
      return null; // a sidebar view that is not the one on screen
  }
}

/**
 * Press the real chord until the level lands. Dispatched on the region's own
 * focused element so the event's target — which is what the keymap resolves
 * the region from — is the real one; setting the store directly would test
 * nothing but the store.
 */
async function pressTo(region: ZoomRegionId, level: number): Promise<void> {
  const el = focusTargetFor(region);
  if (el === null) {
    log(`region=${region} SKIP (no focus target on screen)`);
    return;
  }
  el.focus();
  for (let i = 0; i < 12; i++) {
    const current = useZoom.getState().levels[region];
    if (Math.abs(current - level) < 1e-6) break;
    el.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: current < level ? 'Equal' : 'Minus',
        key: current < level ? '=' : '-',
        metaKey: true,
        bubbles: true,
        cancelable: true
      })
    );
    await wait(60);
  }
  const landed = useZoom.getState().levels[region];
  log(
    `region=${region} asked=${String(level)} landed=${String(landed)} ` +
      (Math.abs(landed - level) < 1e-6 ? 'OK' : 'MISS')
  );
}

/**
 * Hit-test round trip: take an element's rect, aim at its centre, and ask the
 * document what is there. Under CSS `zoom` this is the property that either
 * holds or silently breaks every pointer gesture in the region.
 */
function hitTest(label: string, el: Element | null): void {
  if (el === null) {
    log(`hit ${label}: SKIP (not on screen)`);
    return;
  }
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) {
    log(`hit ${label}: SKIP (zero-sized)`);
    return;
  }
  const x = Math.round(r.left + r.width / 2);
  const y = Math.round(r.top + r.height / 2);
  const found = document.elementFromPoint(x, y);
  const ok = found !== null && (found === el || el.contains(found));
  log(
    `hit ${label}: ${ok ? 'PASS' : 'FAIL'} ` +
      `rect=(${String(Math.round(r.left))},${String(Math.round(r.top))} ` +
      `${String(Math.round(r.width))}x${String(Math.round(r.height))}) ` +
      `at(${String(x)},${String(y)})→${found?.className ?? 'null'}`
  );
}

/**
 * Aim at a point inside a container (fractions of its box) and assert the
 * document resolves it to something INSIDE that container.
 */
function hitContains(
  label: string,
  selector: string,
  fx: number,
  fy: number
): void {
  const host = document.querySelector(selector);
  if (host === null) {
    log(`hit ${label}: SKIP (not on screen)`);
    return;
  }
  const r = host.getBoundingClientRect();
  const x = Math.round(r.left + r.width * fx);
  const y = Math.round(r.top + r.height * fy);
  const found = document.elementFromPoint(x, y);
  const ok = found !== null && host.contains(found);
  log(
    `hit ${label}: ${ok ? 'PASS' : 'FAIL'} at(${String(x)},${String(y)})→` +
      `${found?.tagName.toLowerCase() ?? 'null'}.${found?.className ?? ''}`
  );
}

/**
 * Plant a 100px-offset probe child inside a container and report where the
 * viewport says it landed. Under `zoom: z` a LOCAL 100px must measure z×100
 * viewport px from the container's origin — and the answer for `position:
 * fixed` is the one that cannot be reasoned out from the spec alone.
 */
function reportCoordinateSpaces(selector: string): void {
  const host = document.querySelector<HTMLElement>(selector);
  if (host === null) {
    log(`coords ${selector}: SKIP (not on screen)`);
    return;
  }
  const zoom = cssZoomOf(host);
  const hostRect = host.getBoundingClientRect();
  for (const position of ['absolute', 'fixed'] as const) {
    const probe = document.createElement('div');
    probe.style.cssText = `position:${position};left:100px;top:100px;width:50px;height:10px;pointer-events:none;opacity:0`;
    host.appendChild(probe);
    const r = probe.getBoundingClientRect();
    const originX = position === 'absolute' ? hostRect.left : 0;
    log(
      `coords ${selector} ${position}: zoom=${String(zoom)} ` +
        `local(100,100,w50) → viewport Δx=${String(Math.round(r.left - originX))} ` +
        `w=${String(Math.round(r.width))} (expected ${String(Math.round(100 * zoom))}/${String(Math.round(50 * zoom))})`
    );
    probe.remove();
  }
}

/**
 * Arm the dock's reorder insertion line at index 0 and check it actually
 * lands on the first row's top edge. This is the conversion above with a real
 * consumer attached: the indicator's `top` is written INTO the zoomed list
 * while every rect it was computed from is in viewport pixels.
 */
async function reportDockIndicator(): Promise<void> {
  const list = document.querySelector<HTMLElement>('.session-dock .dock-list');
  const row = list?.querySelector<HTMLElement>('[data-surface-id]') ?? null;
  if (list === null || row === null) {
    log('dock indicator: SKIP (no dock on screen)');
    return;
  }
  useLayout.getState().setDockDrop(0);
  await wait(120);
  const line = list.querySelector<HTMLElement>('.drop-indicator-h');
  if (line === null) {
    log('dock indicator: FAIL (never rendered)');
  } else {
    const delta = line.getBoundingClientRect().top - row.getBoundingClientRect().top;
    log(
      `dock indicator: ${Math.abs(delta) <= 3 ? 'PASS' : 'FAIL'} ` +
        `zoom=${String(cssZoomOf(list))} offset from row top = ${delta.toFixed(1)}px`
    );
  }
  useLayout.getState().setDockDrop(null);
}

function reportRegion(region: ZoomRegionId): void {
  const level = useZoom.getState().levels[region];
  const el = zoomedElementFor(region);
  if (el === null) return;
  const applied = (el as { currentCSSZoom?: number }).currentCSSZoom ?? 1;
  log(
    `css region=${region} level=${String(level)} ` +
      `currentCSSZoom=${String(applied)} ` +
      (Math.abs(applied - level) < 1e-6 ? 'OK' : 'MISMATCH')
  );
}

export async function driveZoom(spec: ZoomProbeSpec): Promise<void> {
  const sessionId = spec.sessionId ?? null;
  const bridge = scrollBridge();

  // The readout capture is its own short run: everything below takes seconds,
  // and the readout is gone in 1.1.
  if (spec.hud !== undefined) {
    const el = focusTargetFor(spec.hud);
    el?.focus();
    el?.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'Equal',
        key: '=',
        metaKey: true,
        bubbles: true,
        cancelable: true
      })
    );
    await wait(120);
    return;
  }

  // ---- before -------------------------------------------------------------
  const term = sessionId === null ? null : getTerminal(sessionId);
  const before = {
    fontSize: term?.options.fontSize ?? 0,
    cols: term?.cols ?? 0,
    rows: term?.rows ?? 0
  };

  if (sessionId !== null && spec.seed !== undefined) {
    window.gmux?.term.sendInput(sessionId, `${spec.seed}\r`);
    await wait(2000);
  }

  let scrolledTo = 0;
  if (sessionId !== null && bridge !== null && (spec.scrollBack ?? 0) > 0) {
    // Scroll with a REAL wheel event, not `bridge.by`. The bridge would move
    // tmux behind the ScrollSurface's back, leaving the surface believing the
    // pane is live — and then the hold this probe exists to test would find
    // nothing to hold. (Learned the hard way: the first version of this probe
    // reported the hold making drift WORSE, which was the probe's own fault.)
    const screen = document.querySelector<HTMLElement>(
      `.gmux-terminal-pane[data-session-id="${CSS.escape(sessionId)}"] .xterm-screen`
    );
    const term0 = getTerminal(sessionId);
    const cell =
      screen !== null && term0 !== null && term0.rows > 0
        ? screen.getBoundingClientRect().height / term0.rows
        : 18;
    screen?.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -(spec.scrollBack ?? 0) * cell,
        deltaMode: 0,
        bubbles: true,
        cancelable: true
      })
    );
    await wait(600);
    const st = await bridge.state({ sessionId });
    scrolledTo = st.position;
    log(
      `scrolled by wheel: position=${String(st.position)} ` +
        `history=${String(st.history)} rows=${String(st.rows)}`
    );
  }

  // ---- apply --------------------------------------------------------------
  for (const [region, level] of Object.entries(spec.levels ?? {})) {
    await pressTo(region as ZoomRegionId, level);
  }
  // xterm re-measures, tmux resizes, the scroll surface re-polls. Sample the
  // trajectory rather than only the endpoint: "where did it end up" cannot
  // tell a resize that moved the reader from a poll that moved them back.
  for (let i = 0; i < 8; i++) {
    await wait(200);
    if (sessionId !== null && bridge !== null) {
      const st = await bridge.state({ sessionId });
      log(
        `t+${String((i + 1) * 200)}ms position=${String(st.position)} ` +
          `history=${String(st.history)} rows=${String(st.rows)} ` +
          `inMode=${String(st.inMode)}`
      );
    }
  }

  // ---- after --------------------------------------------------------------
  if (term !== null) {
    log(
      `terminal font ${String(before.fontSize)}→${String(term.options.fontSize)} ` +
        `geometry ${String(before.cols)}x${String(before.rows)}→` +
        `${String(term.cols)}x${String(term.rows)} ` +
        (term.options.fontSize !== before.fontSize ? 'CHANGED' : 'UNCHANGED')
    );
  }
  if (sessionId !== null && bridge !== null) {
    const st = await bridge.state({ sessionId });
    log(
      `tmux after zoom: rows=${String(st.rows)} position=${String(st.position)} ` +
        `history=${String(st.history)} ` +
        `(rows match xterm: ${String(st.rows === (term?.rows ?? -1))})`
    );
    if (scrolledTo > 0) {
      const drift = Math.abs(st.position - scrolledTo);
      log(
        `scroll kept: was=${String(scrolledTo)} now=${String(st.position)} ` +
          `drift=${String(drift)} lines`
      );
    }
  }

  // Is the primitive itself still good after the reflow? (Isolates a broken
  // `scrollPaneTo` from a hold that captured the wrong number.)
  if (sessionId !== null && bridge !== null && scrolledTo > 0) {
    const st = await bridge.to({ sessionId, position: scrolledTo });
    log(
      `direct scrollTo(${String(scrolledTo)}) → position=${String(st.position)} ` +
        `history=${String(st.history)} inMode=${String(st.inMode)}`
    );
  }

  for (const region of Object.keys(spec.levels ?? {})) {
    reportRegion(region as ZoomRegionId);
  }

  // ---- ⌘0 / ⌘⇧0 -----------------------------------------------------------
  if (spec.reset !== undefined) {
    const all = spec.reset === 'all';
    const region: ZoomRegionId = spec.reset === 'all' ? 'terminal' : spec.reset;
    const el = focusTargetFor(region);
    el?.focus();
    el?.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'Digit0',
        key: '0',
        metaKey: true,
        shiftKey: all,
        bubbles: true,
        cancelable: true
      })
    );
    await wait(900);
    const levels = useZoom.getState().levels;
    log(
      `${all ? '⌘⇧0' : '⌘0'} on ${region} → ` +
        Object.entries(levels)
          .map(([k, v]) => `${k}=${String(v)}`)
          .join(' ') +
        ` fontSize=${String(term?.options.fontSize ?? 0)}`
    );
  }

  // ---- the two coordinate spaces ------------------------------------------
  // Anything that MEASURES a client rect and then writes the number back as a
  // style inside a zoomed subtree (drop lines, insertion indicators, lifted
  // ghosts) has to convert. This proves the conversion factor rather than
  // assuming it, for both `absolute` and `fixed` children.
  reportCoordinateSpaces('.sidebar-view .sidebar-rest');
  reportCoordinateSpaces('.session-dock .dock-list');
  await reportDockIndicator();

  // ---- pointer mapping ----------------------------------------------------
  // One target per surface a drag or a click has to land on, chosen to cover
  // both zoomed subtrees and the unzoomed ones a drag crosses into.
  hitTest('dock row', document.querySelector('.session-dock [data-surface-id]'));
  hitTest('strip tab', document.querySelector('[data-slot="session-strip"] [data-surface-id]'));
  hitTest('split leaf', document.querySelector('[data-surface-leaves] [data-split-leaf]'));
  hitTest('scrollbar track', document.querySelector('.gmux-terminal-scrollbar'));
  hitTest('sidebar rest', document.querySelector('.sidebar-view .sidebar-rest'));
  // The tree and the diff render inside shadow roots, so `elementFromPoint`
  // answers with the host rather than the row. Containment is the claim that
  // matters anyway: a point inside a ZOOMED subtree must resolve to something
  // inside it, which is exactly what a drag hit-test needs.
  hitContains('sidebar content (row band)', '.sidebar-view .sidebar-rest', 0.5, 0.08);
}
