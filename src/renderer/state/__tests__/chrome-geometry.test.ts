/**
 * The window-layout limits (Phase 18 items 1, 2, 4).
 *
 * These run on the `node` environment, so every function is called with an
 * EXPLICIT window width — which is also the point of the signatures: the live
 * window is an argument, never a hidden read.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_BAR_W,
  APP_MIN_WINDOW_W,
  dockRenderedWidth,
  editorIsOverlay,
  SPLIT_MIN_WORK_AREA,
  terminalLayoutWidth,
  clampDockWidth,
  clampEditorWidth,
  clampSidebarWidth,
  DOCK_DEFAULT,
  DOCK_MAX,
  DOCK_MIN,
  DOCK_RAIL_W,
  dockMaxWidth,
  EDITOR_MIN,
  editorMaxWidth,
  sanitizeStoredWidth,
  SIDEBAR_DEFAULT,
  SIDEBAR_MIN,
  sidebarMaxWidth,
  TERMINAL_FLOOR,
  workAreaWidth
} from '../chrome-geometry';

describe('sidebarMaxWidth', () => {
  it('is half the LIVE window at every realistic size', () => {
    expect(sidebarMaxWidth(1280)).toBe(640);
    expect(sidebarMaxWidth(1440)).toBe(720);
    expect(sidebarMaxWidth(1920)).toBe(960);
    // The old hard cap. The whole complaint was that a 1440px window gave the
    // explorer 28% and never more.
    expect(sidebarMaxWidth(1440)).toBeGreaterThan(400);
  });

  it('moves with the window rather than sitting on a constant', () => {
    const widths = [1024, 1280, 1440, 1600, 1920, 2560];
    const maxes = widths.map((w) => sidebarMaxWidth(w));
    expect(new Set(maxes).size).toBe(widths.length);
    for (let i = 1; i < maxes.length; i += 1) {
      expect(maxes[i]!).toBeGreaterThan(maxes[i - 1]!);
    }
  });

  it("yields to the terminal's floor only in absurd windows", () => {
    // With NO dock reserved, the floor term overtakes the 50% term below
    // 2 × (ACTIVITY_BAR_W + TERMINAL_FLOOR) = 576px. Reserve a dock and the
    // crossover moves up to the ~976px the spec's prose named — which is the
    // case the shipped version was missing; see the fix-round block at the
    // bottom of this file.
    const crossover = 2 * (ACTIVITY_BAR_W + TERMINAL_FLOOR);
    expect(crossover).toBe(576);
    expect(sidebarMaxWidth(crossover)).toBe(crossover / 2);
    // Just under it, the floor term is what answers…
    expect(sidebarMaxWidth(560)).toBe(560 - ACTIVITY_BAR_W - TERMINAL_FLOOR);
    // …and the floor never wins so hard that the sidebar goes under its min.
    expect(sidebarMaxWidth(400)).toBe(SIDEBAR_MIN);
    expect(sidebarMaxWidth(0)).toBe(SIDEBAR_MIN);
  });

  it('always leaves the terminal room at realistic widths', () => {
    for (const w of [1024, 1280, 1440, 1920]) {
      expect(w - ACTIVITY_BAR_W - sidebarMaxWidth(w)).toBeGreaterThanOrEqual(
        TERMINAL_FLOOR
      );
    }
  });
});

describe('dockMaxWidth', () => {
  it('is still the constant 320 — the ask was collapse, not width', () => {
    expect(dockMaxWidth(1280)).toBe(DOCK_MAX);
    expect(dockMaxWidth(2560)).toBe(DOCK_MAX);
    expect(dockMaxWidth()).toBe(DOCK_MAX);
  });
});

describe('editorMaxWidth', () => {
  it('replaces the 0.65 cap with "everything but the terminal floor"', () => {
    // 1440px window, no sidebar, top orientation → work area 1392.
    const workArea = 1440 - ACTIVITY_BAR_W;
    expect(editorMaxWidth(workArea)).toBe(workArea - TERMINAL_FLOOR);
    // Strictly more than the cap it replaces, which is the feature.
    expect(editorMaxWidth(workArea)).toBeGreaterThan(
      Math.round(workArea * 0.65)
    );
  });

  /**
   * The fix round's central correction. This function used to floor at
   * EDITOR_MIN — "the editor is never allowed to be useless" — which sounds
   * protective and is the opposite: paired with a min-wins clamp it handed the
   * editor its 320px out of a 332px row and left the terminal 12px, i.e. a
   * live pane reflowed to two columns. The editor's minimum is a comfort; the
   * terminal's floor is a promise about work in flight.
   */
  it('yields to the terminal floor BEFORE the editor floor', () => {
    expect(editorMaxWidth(0)).toBe(0);
    expect(editorMaxWidth(300)).toBe(60);
    expect(editorMaxWidth(TERMINAL_FLOOR + 10)).toBe(10);
    // The row measured in the failing report: 1400px window, sidebar at 50%,
    // dock at 320. The editor may have 92px there — and because that is under
    // its own minimum, the row does not get a split at all (editorIsOverlay).
    expect(editorMaxWidth(332)).toBe(92);
    expect(editorIsOverlay(1400, 332)).toBe(true);
  });

  it('leaves the terminal at least its floor whenever the area allows', () => {
    for (const area of [800, 1000, 1392, 1872]) {
      expect(area - editorMaxWidth(area)).toBeGreaterThanOrEqual(
        TERMINAL_FLOOR
      );
    }
  });
});

describe('workAreaWidth', () => {
  const base = {
    windowWidth: 1440,
    sidebarVisible: true,
    sidebarWidth: SIDEBAR_DEFAULT,
    orientation: 'top' as const,
    dockCollapsed: false,
    dockWidth: DOCK_DEFAULT
  };

  it('subtracts the activity bar, the sidebar and the dock', () => {
    expect(workAreaWidth(base)).toBe(1440 - ACTIVITY_BAR_W - SIDEBAR_DEFAULT);
    expect(workAreaWidth({ ...base, sidebarVisible: false })).toBe(
      1440 - ACTIVITY_BAR_W
    );
    expect(workAreaWidth({ ...base, orientation: 'right' })).toBe(
      1440 - ACTIVITY_BAR_W - SIDEBAR_DEFAULT - DOCK_DEFAULT
    );
  });

  it('counts a collapsed dock as its rail, not as zero and not as its width', () => {
    expect(
      workAreaWidth({ ...base, orientation: 'right', dockCollapsed: true })
    ).toBe(1440 - ACTIVITY_BAR_W - SIDEBAR_DEFAULT - DOCK_RAIL_W);
  });

  it('ignores a collapsed dock entirely in top orientation', () => {
    expect(workAreaWidth({ ...base, dockCollapsed: true })).toBe(
      workAreaWidth(base)
    );
  });

  it('uses the RENDERED sidebar width, so stored over-intent cannot lie', () => {
    // 900px stored under a 1280px window renders at 640 (the live 50%).
    const area = workAreaWidth({
      ...base,
      windowWidth: 1280,
      sidebarWidth: 900
    });
    expect(area).toBe(1280 - ACTIVITY_BAR_W - sidebarMaxWidth(1280));
  });

  it('never goes negative', () => {
    expect(
      workAreaWidth({ ...base, windowWidth: 200, sidebarWidth: 400 })
    ).toBeGreaterThanOrEqual(0);
  });
});

describe('clampSidebarWidth', () => {
  it('holds the DESIGN floor and the live ceiling', () => {
    expect(clampSidebarWidth(10, 1440)).toBe(SIDEBAR_MIN);
    expect(clampSidebarWidth(5000, 1440)).toBe(720);
    expect(clampSidebarWidth(500, 1440)).toBe(500);
    expect(clampSidebarWidth(500.4, 1440)).toBe(500);
  });

  it('clamps PRESENTATION without the stored intent ever changing', () => {
    const chosen = 900; // chosen at 1920
    expect(clampSidebarWidth(chosen, 1920)).toBe(900);
    expect(clampSidebarWidth(chosen, 1280)).toBe(640); // squeezed…
    expect(clampSidebarWidth(chosen, 1920)).toBe(900); // …and back, exactly
  });

  it('falls back to the floor for nonsense', () => {
    expect(clampSidebarWidth(Number.NaN, 1440)).toBe(SIDEBAR_MIN);
  });
});

describe('clampDockWidth', () => {
  it('keeps the unchanged 160–320 band', () => {
    expect(clampDockWidth(10, 1440)).toBe(DOCK_MIN);
    expect(clampDockWidth(5000, 1440)).toBe(DOCK_MAX);
    expect(clampDockWidth(240, 1440)).toBe(240);
  });
});

describe('clampEditorWidth', () => {
  it('clamps into [EDITOR_MIN, editorMaxWidth(area)]', () => {
    const area = 1392;
    expect(clampEditorWidth(10, area)).toBe(EDITOR_MIN);
    expect(clampEditorWidth(5000, area)).toBe(area - TERMINAL_FLOOR);
    expect(clampEditorWidth(700, area)).toBe(700);
  });

  /**
   * Note the areas below 560: those are the ones the shipped version got
   * wrong, and the old test never asked about them (it started at 700).
   */
  it('never takes a single pixel out of the terminal floor, at ANY area', () => {
    // Stated as "the editor leaves whatever the floor could have had" rather
    // than "the terminal is ≥ 240", because a 100px work row cannot give the
    // terminal 240 no matter who yields — that case is the WINDOW's problem
    // and is covered by the grid below, which only drives windows the app can
    // actually be opened at.
    for (let area = 0; area <= 3000; area += 1) {
      for (const want of [0, 10, 320, 480, area, area + 500]) {
        const terminal = area - clampEditorWidth(want, area);
        expect(
          terminal >= Math.min(area, TERMINAL_FLOOR),
          `area ${area}, requested ${want} → terminal ${terminal}px`
        ).toBe(true);
      }
    }
  });
});

describe('sanitizeStoredWidth', () => {
  it('accepts every width an older build could have written', () => {
    // gmux.sidebarWidth used to live in [220, 400]; all of it survives.
    for (const v of [220, 280, 333, 400]) {
      expect(sanitizeStoredWidth(v, SIDEBAR_DEFAULT, SIDEBAR_MIN)).toBe(v);
    }
    // gmux.rightListWidth used to live in [160, 320].
    for (const v of [160, 200, 320]) {
      expect(sanitizeStoredWidth(v, DOCK_DEFAULT, DOCK_MIN)).toBe(v);
    }
  });

  it('rejects nonsense a hand-edited store could hold', () => {
    for (const v of [
      undefined,
      null,
      'wide',
      {},
      [],
      Number.NaN,
      Number.POSITIVE_INFINITY,
      0,
      -50,
      99999
    ]) {
      expect(sanitizeStoredWidth(v, SIDEBAR_DEFAULT, SIDEBAR_MIN)).toBe(
        SIDEBAR_DEFAULT
      );
    }
  });

  it('lifts an under-floor value to the floor rather than to the default', () => {
    expect(sanitizeStoredWidth(50, SIDEBAR_DEFAULT, SIDEBAR_MIN)).toBe(
      SIDEBAR_MIN
    );
    expect(sanitizeStoredWidth(12, DOCK_DEFAULT, DOCK_MIN)).toBe(DOCK_MIN);
  });

  it('rounds, so no fractional width is ever persisted', () => {
    expect(sanitizeStoredWidth(283.6, SIDEBAR_DEFAULT, SIDEBAR_MIN)).toBe(284);
  });

  it('does NOT clamp to a live maximum — intent outlives the window', () => {
    // 900 is above the 50% ceiling of a 1280px window but is kept verbatim;
    // clampSidebarWidth is what renders it small, and the value comes back.
    expect(sanitizeStoredWidth(900, SIDEBAR_DEFAULT, SIDEBAR_MIN)).toBe(900);
  });
});

// ---------------------------------------------------------------------------
// THE INVARIANT, DRIVEN
// ---------------------------------------------------------------------------

/**
 * The fix round's headline test, and the one the phase should have shipped
 * with. Everything above checks a single function against numbers a human
 * chose; this drives the WHOLE budget over every combination the user can
 * actually produce and asserts the one property that protects live work:
 *
 *   the terminal is laid out at 0 (display:none) or at ≥ TERMINAL_FLOOR,
 *   and never in between.
 *
 * It exists because a 72-cell drive of the real app found a 12px terminal —
 * `tmux display -p '#{pane_width}'` returned 2 columns and shredded a live
 * transcript into 2-character lines — while 1563 green tests said nothing.
 * The reason they said nothing is that every one of them tested a function in
 * isolation, and the defect was in how three of them composed.
 */
describe('the terminal never lands in the reflow band (Phase 18 fix round)', () => {
  it('agrees with the app about the minimum window', () => {
    // If someone lowers minWidth, this grid stops covering the real range.
    const main = readFileSync(
      resolve(__dirname, '..', '..', '..', 'main', 'index.ts'),
      'utf8'
    );
    expect(main).toContain(`minWidth: ${APP_MIN_WINDOW_W}`);
  });

  it('holds across every window / sidebar / dock / editor combination', () => {
    const windows = [960, 1000, 1100, 1216, 1280, 1400, 1440, 1500, 1600, 1920, 2560];
    const orientations = ['top', 'right'] as const;
    const editorWidths = [undefined, 320, 480, 800, 4096];
    let cells = 0;
    let overlays = 0;

    for (const windowWidth of windows) {
      for (const orientation of orientations) {
        for (const dockCollapsed of [false, true]) {
          for (const dockWidth of [DOCK_MIN, DOCK_DEFAULT, DOCK_MAX]) {
            const dockReserved = dockRenderedWidth(
              { orientation, dockCollapsed, dockWidth },
              windowWidth
            );
            // Every sidebar width the user can reach: hidden, the floor, the
            // live ceiling, and a stale stored value from a wider window.
            const sidebars = [
              SIDEBAR_MIN,
              SIDEBAR_DEFAULT,
              sidebarMaxWidth(windowWidth, dockReserved),
              4096
            ];
            for (const sidebarVisible of [true, false]) {
              for (const sidebarWidth of sidebars) {
                for (const editorOpen of [false, true]) {
                  for (const filling of [false, true]) {
                    for (const editorWidth of editorWidths) {
                      const w = {
                        windowWidth,
                        sidebarVisible,
                        sidebarWidth,
                        orientation,
                        dockCollapsed,
                        dockWidth,
                        editorOpen,
                        editorWidth,
                        filling: filling && editorOpen
                      };
                      const terminal = terminalLayoutWidth(w);
                      cells += 1;
                      if (
                        editorOpen &&
                        !w.filling &&
                        editorIsOverlay(windowWidth, workAreaWidth(w))
                      ) {
                        overlays += 1;
                      }
                      expect(
                        terminal === 0 || terminal >= TERMINAL_FLOOR,
                        `terminal ${terminal}px at window ${windowWidth} ` +
                          `${orientation} sidebar ${sidebarVisible ? sidebarWidth : 'hidden'} ` +
                          `dock ${dockCollapsed ? 'rail' : dockWidth} ` +
                          `editor ${editorOpen ? (editorWidth ?? 'default') : 'closed'}` +
                          `${w.filling ? ' filling' : ''}`
                      ).toBe(true);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // A grid that never exercises the branch it was written for proves
    // nothing, so it says out loud that it reached both sides.
    expect(cells).toBeGreaterThan(2000);
    expect(overlays).toBeGreaterThan(0);
  });

  /**
   * The exact four rows from the failure report, replayed. Before the fix
   * these laid the terminal out at 12 / 32 / 62 / 112 px; tmux answered 2, 2,
   * 4 and 11 columns.
   */
  it('replays the four measured squeeze rows', () => {
    const rows = [1400, 1440, 1500, 1600];
    for (const windowWidth of rows) {
      const dockReserved = dockRenderedWidth(
        { orientation: 'right', dockCollapsed: false, dockWidth: DOCK_MAX },
        windowWidth
      );
      const sidebarWidth = sidebarMaxWidth(windowWidth, dockReserved);
      const w = {
        windowWidth,
        sidebarVisible: true,
        sidebarWidth,
        orientation: 'right' as const,
        dockCollapsed: false,
        dockWidth: DOCK_MAX,
        editorOpen: true,
        editorWidth: EDITOR_MIN
      };
      const workArea = workAreaWidth(w);
      // The sidebar still reaches 50% at these sizes — item 1 is intact…
      expect(sidebarWidth).toBe(Math.round(windowWidth / 2));
      // …and the row simply cannot seat a split, so the editor overlays.
      expect(workArea).toBeLessThan(SPLIT_MIN_WORK_AREA);
      expect(editorIsOverlay(windowWidth, workArea)).toBe(true);
      // The terminal keeps the whole row underneath the overlay.
      expect(terminalLayoutWidth(w)).toBe(workArea);
      expect(terminalLayoutWidth(w)).toBeGreaterThanOrEqual(TERMINAL_FLOOR);
    }
  });

  it('keeps the sidebar at 50% wherever the row can still afford it', () => {
    // The dock term only bites below ~976px with the default 200px dock —
    // which is what the spec's prose said all along, and what the shipped
    // implementation had dropped.
    for (const windowWidth of [1000, 1100, 1280, 1440, 1920, 2560]) {
      expect(sidebarMaxWidth(windowWidth, DOCK_DEFAULT)).toBe(
        Math.round(windowWidth / 2)
      );
    }
    expect(sidebarMaxWidth(960, DOCK_DEFAULT)).toBe(472);
    expect(sidebarMaxWidth(960, DOCK_DEFAULT)).toBeLessThan(480);
  });

  /**
   * Item 3's guarantee, kept intact by item 1's fix. The new overlay trigger
   * could in principle cover the hoisted session strip — the exact bug item 3
   * exists to kill — so it must be unreachable in "top" orientation, where the
   * strip lives. It is, by arithmetic: with no dock, a sidebar at 50% leaves
   * the row `w/2 - 48`, which only falls under SPLIT_MIN_WORK_AREA below
   * 1216px, and everything under 1400px was already an overlay. The new
   * condition therefore only ever fires with the dock on the right, where
   * there is no strip to cover.
   */
  it('never introduces a NEW overlay in top orientation (item 3 is safe)', () => {
    for (let windowWidth = APP_MIN_WINDOW_W; windowWidth <= 4096; windowWidth += 1) {
      for (const sidebarWidth of [
        SIDEBAR_MIN,
        SIDEBAR_DEFAULT,
        sidebarMaxWidth(windowWidth, 0),
        4096
      ]) {
        const workArea = workAreaWidth({
          windowWidth,
          sidebarVisible: true,
          sidebarWidth,
          orientation: 'top',
          dockCollapsed: false,
          dockWidth: DOCK_MAX
        });
        const wasOverlay = windowWidth < 1400;
        expect(
          editorIsOverlay(windowWidth, workArea) === wasOverlay,
          `window ${windowWidth}, sidebar ${sidebarWidth} → row ${workArea}`
        ).toBe(true);
      }
    }
  });

  it('leaves the top orientation exactly as it was', () => {
    // No dock, no reservation: every number verifier A measured stands.
    for (const windowWidth of [1440, 1800, 2400]) {
      expect(sidebarMaxWidth(windowWidth, 0)).toBe(windowWidth / 2);
      expect(
        dockRenderedWidth(
          { orientation: 'top', dockCollapsed: false, dockWidth: DOCK_MAX },
          windowWidth
        )
      ).toBe(0);
    }
  });
});
