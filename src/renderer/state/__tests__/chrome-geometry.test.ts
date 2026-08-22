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
  activityBarIsRow,
  activityBarRenderedWidth,
  APP_MIN_WINDOW_W,
  dockRenderedWidth,
  editorIsOverlay,
  projectRailForcedNarrow,
  projectsRenderedWidth,
  PROJECT_RAIL_COLLAPSED_W,
  PROJECT_RAIL_MIN_WINDOW_W,
  PROJECT_RAIL_W,
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

  it('holds across every window / sidebar / dock / projects / editor combination', () => {
    // PHASE 129 widened this grid by the two project-tab dimensions. Every
    // window below is now driven with the tabs on top (0px), with the rail
    // collapsed (48px) and with the rail expanded (200px or, under
    // PROJECT_RAIL_MIN_WINDOW_W, the 48px it is actually drawn at).
    const windows = [
      960, 1000, 1027, 1028, 1029, 1100, 1216, 1280, 1400, 1440, 1500, 1600,
      1920, 2560
    ];
    const orientations = ['top', 'right'] as const;
    const projectPositions = ['top', 'left'] as const;
    const editorWidths = [undefined, 320, 480, 800, 4096];
    let cells = 0;
    let overlays = 0;
    let railsDrawn = 0;

    for (const windowWidth of windows) {
      for (const orientation of orientations) {
        for (const dockCollapsed of [false, true]) {
          for (const dockWidth of [DOCK_MIN, DOCK_DEFAULT, DOCK_MAX]) {
            const dockReserved = dockRenderedWidth(
              { orientation, dockCollapsed, dockWidth },
              windowWidth
            );
            for (const projectsPosition of projectPositions) {
              for (const projectsCollapsed of [false, true]) {
                const projectsReserved = projectsRenderedWidth(
                  { projectsPosition, projectsCollapsed },
                  windowWidth
                );
                if (projectsReserved === PROJECT_RAIL_W) railsDrawn += 1;
                // Every sidebar width the user can reach: hidden, the floor,
                // the live ceiling, and a stale stored value from a wider
                // window.
                const sidebars = [
                  SIDEBAR_MIN,
                  SIDEBAR_DEFAULT,
                  sidebarMaxWidth(windowWidth, dockReserved, projectsReserved),
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
                            projectsPosition,
                            projectsCollapsed,
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
                              `projects ${projectsPosition}` +
                              `${projectsCollapsed ? ' collapsed' : ''} ` +
                              `(${projectsReserved}px) ` +
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
      }
    }

    // A grid that never exercises the branch it was written for proves
    // nothing, so it says out loud that it reached both sides.
    expect(cells).toBeGreaterThan(2000);
    expect(overlays).toBeGreaterThan(0);
    expect(railsDrawn).toBeGreaterThan(0);
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

// ---------------------------------------------------------------------------
// PHASE 129 — the project rail enters the budget
// ---------------------------------------------------------------------------

/**
 * The rail is the third region that can take width from the terminal, and the
 * first one added since the Phase 18 fix round wrote the budget down. These
 * cases pin the arithmetic that keeps rule 2 true, with the numbers spelled
 * out rather than described.
 */
describe('the project rail (Phase 129)', () => {
  it('is 0 while the tabs are on top, whatever the collapsed flag says', () => {
    for (const projectsCollapsed of [false, true]) {
      expect(
        projectsRenderedWidth(
          { projectsPosition: 'top', projectsCollapsed },
          1920
        )
      ).toBe(0);
    }
  });

  it('is 200 expanded and 48 collapsed in a window that can seat it', () => {
    expect(
      projectsRenderedWidth(
        { projectsPosition: 'left', projectsCollapsed: false },
        1920
      )
    ).toBe(PROJECT_RAIL_W);
    expect(
      projectsRenderedWidth(
        { projectsPosition: 'left', projectsCollapsed: true },
        1920
      )
    ).toBe(PROJECT_RAIL_COLLAPSED_W);
  });

  it('derives its minimum window from the regions it has to share with', () => {
    // 48 + 200 + 220 + 320 + 240. Written out so a later change to any of the
    // five constants has to come past this line.
    expect(PROJECT_RAIL_MIN_WINDOW_W).toBe(
      ACTIVITY_BAR_W + PROJECT_RAIL_W + SIDEBAR_MIN + DOCK_MAX + TERMINAL_FLOOR
    );
    expect(PROJECT_RAIL_MIN_WINDOW_W).toBe(1028);
    // And it is above the app's own minimum window, which is the whole reason
    // the narrow branch below has to exist at all.
    expect(PROJECT_RAIL_MIN_WINDOW_W).toBeGreaterThan(APP_MIN_WINDOW_W);
  });

  it('renders collapsed in a window too narrow to seat it expanded', () => {
    const asked = { projectsPosition: 'left' as const, projectsCollapsed: false };
    expect(projectsRenderedWidth(asked, 1027)).toBe(PROJECT_RAIL_COLLAPSED_W);
    expect(projectsRenderedWidth(asked, 1028)).toBe(PROJECT_RAIL_W);
    // Presentation clamps, intent persists: the caller's own value never moved.
    expect(asked.projectsCollapsed).toBe(false);
    expect(projectRailForcedNarrow(asked, 1027)).toBe(true);
    expect(projectRailForcedNarrow(asked, 1028)).toBe(false);
    // A rail the person collapsed themselves is not "forced" — the control
    // that expands it again still works.
    expect(
      projectRailForcedNarrow(
        { projectsPosition: 'left', projectsCollapsed: true },
        960
      )
    ).toBe(false);
  });

  it('does not move when the window does not, which is what keeps live panes still', () => {
    // The rendered width reads ONE input. A dock drag, a ⌘B, a sidebar drag
    // and a stale stored sidebar width all leave it alone, so none of them can
    // resize the work area a second time through the rail.
    const at = (w: number): number =>
      projectsRenderedWidth(
        { projectsPosition: 'left', projectsCollapsed: false },
        w
      );
    expect(at(1440)).toBe(PROJECT_RAIL_W);
    expect(at(1440)).toBe(at(1440));
  });

  it('takes its width out of the SIDEBAR ceiling, not out of the terminal', () => {
    // 1440px window, dock at its ceiling, rail expanded. The floor term now
    // answers, because 1440 - 48 - 200 - 320 - 240 = 632 is under half.
    const dock = DOCK_MAX;
    const rail = PROJECT_RAIL_W;
    expect(sidebarMaxWidth(1440, dock, rail)).toBe(632);
    expect(sidebarMaxWidth(1440, dock, rail)).toBe(
      1440 - ACTIVITY_BAR_W - rail - dock - TERMINAL_FLOOR
    );
    // …and the same window with the tabs on top keeps the 720 it had, because
    // there the 50% term is still the smaller of the two.
    expect(sidebarMaxWidth(1440, dock, 0)).toBe(720);
    expect(sidebarMaxWidth(1440, dock, 0)).toBe(sidebarMaxWidth(1440, dock));
    // 200.0 px, from 0: that is the whole difference the rail makes here.
    expect(sidebarMaxWidth(1440, dock, 0) - sidebarMaxWidth(1440, dock, rail)).toBe(
      88
    );
  });

  it('leaves the work row exactly the floor at the tightest legal window', () => {
    // The case the phase spec named: the minimum window that seats the rail,
    // with the dock at 320 and the sidebar asking for half the window.
    const w = {
      windowWidth: PROJECT_RAIL_MIN_WINDOW_W,
      sidebarVisible: true,
      sidebarWidth: 4096,
      orientation: 'right' as const,
      dockCollapsed: false,
      dockWidth: DOCK_MAX,
      projectsPosition: 'left' as const,
      projectsCollapsed: false
    };
    expect(clampSidebarWidth(4096, w.windowWidth, DOCK_MAX, PROJECT_RAIL_W)).toBe(
      SIDEBAR_MIN
    );
    expect(workAreaWidth(w)).toBe(TERMINAL_FLOOR);
    expect(terminalLayoutWidth({ ...w, editorOpen: false })).toBe(
      TERMINAL_FLOOR
    );
    // With a file open the row cannot seat a split, so the panel overlays and
    // the terminal keeps the whole row underneath it.
    expect(editorIsOverlay(w.windowWidth, workAreaWidth(w))).toBe(true);
    expect(terminalLayoutWidth({ ...w, editorOpen: true })).toBe(
      TERMINAL_FLOOR
    );
  });

  it('holds at the app minimum window, where the rail is drawn collapsed', () => {
    const w = {
      windowWidth: APP_MIN_WINDOW_W,
      sidebarVisible: true,
      sidebarWidth: 4096,
      orientation: 'right' as const,
      dockCollapsed: false,
      dockWidth: DOCK_MAX,
      projectsPosition: 'left' as const,
      projectsCollapsed: false
    };
    expect(
      projectsRenderedWidth(w, APP_MIN_WINDOW_W)
    ).toBe(PROJECT_RAIL_COLLAPSED_W);
    // The sidebar's ceiling is 960 - 48 - 48 - 320 - 240 = 304, so a sidebar
    // asking for half the window renders at 304 and the row is left exactly
    // the floor. Nothing is under it, which is the property that matters.
    expect(clampSidebarWidth(4096, 960, DOCK_MAX, PROJECT_RAIL_COLLAPSED_W)).toBe(
      304
    );
    expect(workAreaWidth(w)).toBe(TERMINAL_FLOOR);
    expect(workAreaWidth(w)).toBeGreaterThanOrEqual(TERMINAL_FLOOR);
  });

  it('leaves every number the app had before it exactly where it was', () => {
    // Absent fields mean "tabs on top", so every pre-Phase-129 caller reads
    // the same answer it always read.
    const base = {
      windowWidth: 1440,
      sidebarVisible: true,
      sidebarWidth: SIDEBAR_DEFAULT,
      orientation: 'right' as const,
      dockCollapsed: false,
      dockWidth: DOCK_DEFAULT
    };
    expect(workAreaWidth(base)).toBe(
      workAreaWidth({
        ...base,
        projectsPosition: 'top',
        projectsCollapsed: false
      })
    );
    expect(workAreaWidth(base)).toBe(
      1440 - ACTIVITY_BAR_W - SIDEBAR_DEFAULT - DOCK_DEFAULT
    );
    expect(sidebarMaxWidth(1440, DOCK_DEFAULT)).toBe(
      sidebarMaxWidth(1440, DOCK_DEFAULT, 0)
    );
  });
});

// ---------------------------------------------------------------------------
// PHASE 135 — the activity bar's two shapes
// ---------------------------------------------------------------------------

describe('activityBarIsRow', () => {
  it('is true only with the projects on the left AND the sidebar showing', () => {
    expect(
      activityBarIsRow({ projectsPosition: 'left', sidebarVisible: true })
    ).toBe(true);
    expect(
      activityBarIsRow({ projectsPosition: 'left', sidebarVisible: false })
    ).toBe(false);
    expect(
      activityBarIsRow({ projectsPosition: 'top', sidebarVisible: true })
    ).toBe(false);
    expect(
      activityBarIsRow({ projectsPosition: 'top', sidebarVisible: false })
    ).toBe(false);
  });
});

describe('activityBarRenderedWidth', () => {
  it('gives back exactly 48px, and only as the row', () => {
    const asRow = activityBarRenderedWidth({
      projectsPosition: 'left',
      sidebarVisible: true
    });
    const asColumn = activityBarRenderedWidth({
      projectsPosition: 'left',
      sidebarVisible: false
    });
    expect(asRow).toBe(0);
    expect(asColumn).toBe(ACTIVITY_BAR_W);
    expect(asColumn - asRow).toBe(48);
  });

  it('never changes anything while the projects are on top', () => {
    // The operator asked for this one by name. Both booleans are tried and
    // the answer is the same 48px column in both.
    for (const sidebarVisible of [true, false]) {
      expect(
        activityBarRenderedWidth({ projectsPosition: 'top', sidebarVisible })
      ).toBe(ACTIVITY_BAR_W);
    }
  });
});

describe('Phase 135: the 48px the row hands back', () => {
  const base = {
    windowWidth: 1440,
    sidebarVisible: true,
    sidebarWidth: SIDEBAR_DEFAULT,
    orientation: 'right' as const,
    dockCollapsed: false,
    dockWidth: DOCK_DEFAULT,
    projectsPosition: 'left' as const,
    projectsCollapsed: false
  };

  it('goes to the work area, at every window width', () => {
    // The work area subtracts the activity bar unconditionally, so the row
    // hands it the whole 48px whatever else the window is doing. The number a
    // pre-135 build drew is written out by hand rather than produced by
    // hiding the sidebar, because hiding the sidebar changes a second term.
    for (const windowWidth of [1028, 1200, 1440, 1920, 2560]) {
      const w = { ...base, windowWidth };
      const sidebar = clampSidebarWidth(
        SIDEBAR_DEFAULT,
        windowWidth,
        DOCK_DEFAULT,
        PROJECT_RAIL_W,
        0
      );
      const beforeThisPhase =
        windowWidth - ACTIVITY_BAR_W - PROJECT_RAIL_W - sidebar - DOCK_DEFAULT;
      expect(workAreaWidth(w)).toBe(beforeThisPhase + 48);
    }
    expect(workAreaWidth(base)).toBe(
      1440 - 0 - PROJECT_RAIL_W - SIDEBAR_DEFAULT - DOCK_DEFAULT
    );
  });

  it('goes to the sidebar ceiling ONLY where the room term binds', () => {
    // Stated precisely, because "the ceiling gains 48px" is not true at every
    // width. The ceiling is `min(half the window, the room left over)`. The
    // activity bar is a term in the second one and not in the first, so the
    // 48px arrives only while the room term is the smaller of the two.
    //
    // With a 200px dock and a 200px rail the room term is
    // `w - 48 - 200 - 200 - 240 = w - 688`, and half is `w / 2`. The room
    // term binds while `w - 688 < w / 2`, which is `w < 1376`.
    const ceiling = (w: number, activityBar: number): number =>
      sidebarMaxWidth(w, DOCK_DEFAULT, PROJECT_RAIL_W, activityBar);

    // 1280 is under 1376, so the room term binds and the whole 48px arrives.
    expect(ceiling(1280, ACTIVITY_BAR_W)).toBe(1280 - 48 - 200 - 200 - 240);
    expect(ceiling(1280, 0)).toBe(1280 - 0 - 200 - 200 - 240);
    expect(ceiling(1280, 0) - ceiling(1280, ACTIVITY_BAR_W)).toBe(48);

    // 1440 is over 1376, so half the window binds and the ceiling does not
    // move at all. This is the honest half of the claim.
    expect(ceiling(1440, ACTIVITY_BAR_W)).toBe(720);
    expect(ceiling(1440, 0)).toBe(720);
    expect(ceiling(1440, 0) - ceiling(1440, ACTIVITY_BAR_W)).toBe(0);

    // Across the range the ceiling never LOSES width to this phase, and never
    // gains more than the 48px the row gave up.
    for (let w = APP_MIN_WINDOW_W; w <= 3200; w += 16) {
      const gain = ceiling(w, 0) - ceiling(w, ACTIVITY_BAR_W);
      expect(gain).toBeGreaterThanOrEqual(0);
      expect(gain).toBeLessThanOrEqual(48);
    }
  });

  it('leaves the terminal floor intact across the whole grid', () => {
    // The row hands 48px to the work area AND to the sidebar's ceiling, so
    // the budget could double-count it. It does not, because the same term is
    // subtracted in both places. Drive it and prove the floor still holds.
    for (const windowWidth of [960, 1028, 1200, 1440, 1920, 2560]) {
      for (const projectsCollapsed of [true, false]) {
        for (const dockCollapsed of [true, false]) {
          for (const sidebarVisible of [true, false]) {
            for (const orientation of ['top', 'right'] as const) {
              const w = {
                ...base,
                windowWidth,
                orientation,
                projectsCollapsed,
                dockCollapsed,
                sidebarVisible,
                // The widest a hand-edited store could ask for.
                sidebarWidth: 4096
              };
              expect(workAreaWidth(w)).toBeGreaterThanOrEqual(TERMINAL_FLOOR);
            }
          }
        }
      }
    }
  });

  it('does not move the project rail when the sidebar is toggled', () => {
    // PROJECT_RAIL_MIN_WINDOW_W keeps the activity bar's 48px in it on
    // purpose. Taking it out would let the rail expand at 980px while the
    // sidebar is showing and collapse again on Command B, and every width
    // change of the rail resizes live sessions.
    expect(PROJECT_RAIL_MIN_WINDOW_W).toBe(
      ACTIVITY_BAR_W + PROJECT_RAIL_W + SIDEBAR_MIN + DOCK_MAX + TERMINAL_FLOOR
    );
    expect(PROJECT_RAIL_MIN_WINDOW_W).toBe(1028);
    // The rail's width is a function of the window alone. There is no
    // sidebar field in its input, so no press of Command B can reach it.
    expect(
      projectsRenderedWidth(
        { projectsPosition: 'left', projectsCollapsed: false },
        1027
      )
    ).toBe(PROJECT_RAIL_COLLAPSED_W);
    expect(
      projectsRenderedWidth(
        { projectsPosition: 'left', projectsCollapsed: false },
        1028
      )
    ).toBe(PROJECT_RAIL_W);
  });

  it('changes no answer any pre-135 call site reads', () => {
    // Every existing call passes three arguments or fewer, and the fourth
    // defaults to the column's width.
    expect(sidebarMaxWidth(1280, DOCK_DEFAULT, PROJECT_RAIL_W)).toBe(
      sidebarMaxWidth(1280, DOCK_DEFAULT, PROJECT_RAIL_W, ACTIVITY_BAR_W)
    );
    expect(sidebarMaxWidth(1280)).toBe(sidebarMaxWidth(1280, 0, 0));
    expect(clampSidebarWidth(4096, 1280, DOCK_DEFAULT, PROJECT_RAIL_W)).toBe(
      clampSidebarWidth(
        4096,
        1280,
        DOCK_DEFAULT,
        PROJECT_RAIL_W,
        ACTIVITY_BAR_W
      )
    );
    // And with the projects on top, the work area arithmetic is untouched.
    const top = {
      windowWidth: 1440,
      sidebarVisible: true,
      sidebarWidth: SIDEBAR_DEFAULT,
      orientation: 'right' as const,
      dockCollapsed: false,
      dockWidth: DOCK_DEFAULT
    };
    expect(workAreaWidth(top)).toBe(
      1440 - ACTIVITY_BAR_W - SIDEBAR_DEFAULT - DOCK_DEFAULT
    );
    expect(workAreaWidth({ ...top, sidebarVisible: false })).toBe(
      1440 - ACTIVITY_BAR_W - DOCK_DEFAULT
    );
  });
});
