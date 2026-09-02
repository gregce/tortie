/**
 * S2 — Titlebar & project tabs. 38px drag region; tabs/buttons no-drag.
 * Tab anatomy: roll-up dot · name · amber needs-input badge. Branch/dirty
 * data stays in the sidebar header — tabs stay scannable.
 *
 * Round 2: tabs reorder by POINTER drag (the shared drag engine, not HTML5
 * dnd): press + 4px travel lifts a ghost that follows the pointer on x only
 * (y clamped to the bar); neighbors never reflow mid-drag — a 2px accent
 * insertion indicator marks the landing gap; Esc cancels with zero motion.
 * Order persists app-wide; ⌘1…⌘9 and ⌃Tab follow the visual order.
 *
 * Phase 12.12 item 4: hold ⌘ and each tab reveals the digit that reaches it
 * (⌘1-⌘8 by position, ⌘9 the last tab — src/renderer/app/project-shortcuts.ts).
 * The glyph is overlaid in the slot the close × already reserves, so nothing
 * moves; the gesture itself, including every way it has to be cancelled, is
 * src/renderer/app/modifier-held.ts.
 *
 * PHASE 129. The band draws three shapes now, and the store decides which.
 *
 *   projects on top, expanded    the row of tabs, as it has always been
 *   projects on top, collapsed   one chip naming the active project, opening
 *                                a native menu that lists every open project
 *   projects on the left         no tabs at all here; ./ProjectRail.tsx draws
 *                                them down the window's left side
 *
 * What each tab holds is derived in ./project-tabs-data.ts, which the rail
 * reads too, so the two surfaces cannot come to disagree about which sessions
 * roll up into a project's dot.
 *
 * SAY WHAT IS NOT TRUE. Collapsing on top does not make the window taller.
 * The band stays 38px because the traffic lights live in it. What comes back
 * is the row of tabs.
 *
 * PHASE 135. The + never leaves. Both top branches draw it, and both draw the
 * SAME element, which is the `addControl` const built inside `Titlebar()`.
 * Expanded, it sits after the tabs, which is where it has always been.
 * Collapsed, it sits after the chip. The chip is where the projects are drawn
 * in that state, so the + is to the right of the projects either way and it
 * stays in the same place in the reading order when the row collapses.
 *
 * SAY WHAT IS NOT TRUE HERE TOO. Nothing moved leftward into the traffic
 * lights. `.titlebar` carries `padding-left: 76px` and the whole `<nav>`
 * starts after that inset.
 *
 * PHASE 148. The band's controls moved to its HEAD, reversed. The position
 * control now sits first, nearest the traffic lights, then the collapse
 * chevron, and then the projects begin, whether they are the row of tabs or
 * the collapsed chip. That mirrors Phase 135's call for the left rail's
 * band, where the same two controls in the same order open the band. The +
 * did not move: it stays at the END of the tabs in both top branches, and
 * the vertical orientations are untouched because ProjectRail.tsx draws
 * those and this file draws none of them.
 *
 * PHASE 189. THE ROW OF TABS IS ITS OWN SCROLLING LIST, `.ptab-list`, and the
 * three pinned controls stay outside it. That is the shape ./SessionStrip.tsx
 * has had since S4: `.stab-list` scrolls, the pinned cells do not, and a
 * chevron appears at the list's end only while it overflows. This row was the
 * same tab with the floor, the scroll and the chevron missing, so twelve
 * projects at his own window width drew `g…`, `roo…`, `runs…` and, for the one
 * remote tab, a bare ellipsis with no letter at all.
 *
 * THREE THINGS CHANGED AND EACH ONE HAS A REASON:
 *
 *  - the NAME carries a measured floor (styles/app.css `.ptab-name`), so the
 *    tab grows to hold its badge instead of the badge eating the name;
 *  - the row SCROLLS past that floor rather than clipping, which is what makes
 *    a floor safe to state at all at a 960px window;
 *  - the JS pre-truncation is gone. `truncateMiddle(name, 24)` cut at a
 *    character count that knows nothing about the tab's width, and the CSS
 *    ellipsis then clipped that result a second time, which is why the ACTIVE
 *    tab drew `extract-agen…en…` with two ellipses. One truncation, and it is
 *    the one that can see the box.
 *
 * NO TAB IS EVER REMOVED FROM THE ROW. The chevron lists every open project,
 * including the ones on screen, exactly as the session strip's does; ⌘1…⌘9 and
 * ⌃Tab reach a scrolled-out tab and the selection effect below scrolls it into
 * view.
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { keyDisplay } from '@shared/keymap';
import { activeLocalRepoPath } from './active-repo';
import { effectiveStatusOf, useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { MachineBadge } from './MachineBadge';
import { useGit } from '../state/git';
import { truncateMiddle } from '../format';
import { Codicon, menuGlyph } from '../icons';
import {
  armPointerDrag,
  createGhost,
  edgeAutoScroll,
  insertionIndex,
  isSecondaryPress
} from './split/pointer-drag';
import { NewProjectButton } from './NewProjectButton';
import { useCommandHeld } from './modifier-held';
import { tabDigit, tabShortcutLabel } from './project-shortcuts';
// Phase 129. One derivation of the project list, shared with ./ProjectRail.
import { useProjectTabs } from './project-tabs-data';
import type { TabData } from './project-tabs-data';
import {
  collapseIcon,
  collapseLabel,
  SWITCH_PROJECT
} from './projects-position';
import { ProjectsPositionButton } from './ProjectsPositionButton';
import './project-rail.css';

function ProjectTab({
  data,
  selected,
  hintDigit,
  hinting,
  onDragIndicate,
  onDragState
}: {
  data: TabData;
  selected: boolean;
  /** This tab's ⌘ digit, or null when it has none (project-shortcuts.ts). */
  hintDigit: number | null;
  /** ⌘ is being held right now — reveal the digit. */
  hinting: boolean;
  /** Report the live insertion index (null = drag ended/canceled). */
  onDragIndicate: (index: number | null) => void;
  /** A tab drag started/ended (suppresses the ⌘ hint). */
  onDragState: (dragging: boolean) => void;
}): React.JSX.Element {
  const { project, dot, attentionCount, machine, title } = data;
  const setActiveProject = useApp((s) => s.setActiveProject);
  const closeProject = useApp((s) => s.closeProject);
  const moveProjectToIndex = useApp((s) => s.moveProjectToIndex);
  const setMenu = useApp((s) => s.setMenu);

  // Nested-interactive fix (Phase 8): the close × is a REAL sibling button
  // positioned over the tab's right edge — a button inside a button is
  // invalid and unreachable by keyboard. Drag lives on the wrapper so both
  // children stay plain interactives.
  return (
    <div
      className={`ptab-wrap${selected ? ' selected' : ''}${
        hinting && hintDigit !== null ? ' hinting' : ''
      }`}
      data-project-id={project.id}
      onPointerDown={(e) => {
        // Phase 12.2 audit: project tabs had the defect too — a secondary
        // click armed a tab drag that the "Close project" menu then left
        // tracking the pointer.
        if (isSecondaryPress(e)) return;
        if ((e.target as HTMLElement).closest('.ptab-close') !== null) return;
        const wrap = e.currentTarget;
        // PHASE 189. The drag host is the scrolling list, not the whole band.
        // The three pinned controls live outside it now, and hit-testing the
        // band would have offered their gaps as landing places.
        const list = wrap.closest<HTMLElement>('.ptab-list');
        let ghost: ReturnType<typeof createGhost> | null = null;
        let lastIndex: number | null = null;
        armPointerDrag(e.nativeEvent, {
          onStart() {
            ghost = createGhost(wrap, { lockAxis: 'x' });
            onDragState(true);
          },
          onMove(ev) {
            ghost?.move(ev.clientX, ev.clientY);
            if (!list) return;
            // DESIGN-SPEC §S2: "Dragging past either end auto-scrolls the
            // strip". The session strip has done it since S4; this is the same
            // helper, so a tab can be carried to a landing gap that was off
            // screen when the press started.
            edgeAutoScroll(list, ev.clientX);
            const items = Array.from(
              list.querySelectorAll<HTMLElement>('[data-project-id]')
            ).map((el) => ({ rect: el.getBoundingClientRect() }));
            lastIndex = insertionIndex(
              items,
              { x: ev.clientX, y: ev.clientY },
              'x'
            );
            onDragIndicate(lastIndex);
          },
          onDrop() {
            if (lastIndex !== null) {
              moveProjectToIndex(project.id, lastIndex);
            }
          },
          onEnd() {
            ghost?.destroy();
            ghost = null;
            onDragIndicate(null);
            onDragState(false);
          }
        });
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            {
              label: 'Close project',
              ...menuGlyph('close'),
              run: () => closeProject(project.id)
            }
          ]
        });
      }}
    >
      <button
        type="button"
        className={`ptab${selected ? ' selected' : ''}`}
        // The tooltip is the fallback path to the same fact for anyone who
        // never holds ⌘ (Phase 12.12 item 4).
        title={
          hintDigit !== null
            ? `${title}\n${tabShortcutLabel(hintDigit)}`
            : title
        }
        onClick={() => setActiveProject(project.id)}
        aria-label={`${project.name}${
          attentionCount > 0
            ? `, ${attentionCount} ${attentionCount === 1 ? 'session needs' : 'sessions need'} input`
            : ''
        }`}
        aria-current={selected ? 'true' : undefined}
      >
        {/* Tab anatomy stays dot · name · badge (DESIGN.md §2.3): branch and
            dirty count live in the sidebar header, never on the tab. */}
        <span className={`dot dot-${dot === 'none' ? 'none' : dot}`} />
        {/* PHASE 189. No JS pre-truncation. A cut at 24 characters knows
            nothing about this tab's width, and the CSS ellipsis then clipped
            its result again, measured at the parent as `extract-agen…en…`,
            two ellipses in one label. `.ptab-name` carries the measured floor
            and does the one truncation that can see the box. */}
        <span className="ptab-name">{project.name}</span>
        {machine !== null ? (
          <MachineBadge machine={machine} className="ptab-machine" />
        ) : null}
        {attentionCount > 0 ? (
          <span className="badge-attention num">{attentionCount}</span>
        ) : null}
      </button>
      <button
        type="button"
        className="ptab-close"
        aria-label={`Close ${project.name}`}
        title="Close project"
        onClick={() => closeProject(project.id)}
      >
        <Codicon name="close" size="sm" />
      </button>
      {/* Overlaid in the slot the close × already reserves, so revealing it
          cannot reflow the strip. Decorative: the same fact reaches assistive
          tech through the tooltip, the ⌘/ overlay and the Settings map. */}
      {hintDigit !== null ? (
        <span className="ptab-hint num" aria-hidden="true">
          {hintDigit}
        </span>
      ) : null}
    </div>
  );
}

/**
 * 2px accent insertion indicator in the tab gap (S2 drag spec).
 *
 * PHASE 189. It renders INSIDE `.ptab-list` and its `left` is read from
 * `offsetLeft`, which resolves against the nearest positioned ancestor. That
 * ancestor is now the scrolling list, so the indicator sits in the list's
 * content coordinates and scrolls with the tabs it points between. Left in the
 * band it would have pointed at a gap the row had scrolled away from.
 */
function TabIndicator({
  index,
  listRef
}: {
  index: number;
  listRef: React.RefObject<HTMLElement | null>;
}): React.JSX.Element | null {
  const [left, setLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      setLeft(null);
      return;
    }
    const items = Array.from(
      list.querySelectorAll<HTMLElement>('[data-project-id]')
    );
    if (items.length === 0) {
      setLeft(null);
      return;
    }
    const at = items[index];
    const last = items[items.length - 1];
    setLeft(
      at !== undefined
        ? at.offsetLeft - 3
        : (last?.offsetLeft ?? 0) + (last?.offsetWidth ?? 0) + 1
    );
  }, [index, listRef]);

  if (left === null) return null;
  return <div className="drop-indicator-v tab-indicator" style={{ left }} />;
}

// The Settings gear moved to the activity bar's bottom slot (round 1, S3) —
// see src/renderer/app/ActivityBar.tsx.

/**
 * Every open project as native menu rows, each carrying its own ⌘ digit.
 *
 * PHASE 189 lifted this out of `CollapsedProjectChip` below so the overflow
 * chevron composes the SAME list rather than a second one that agrees today.
 * The digits come from ./project-shortcuts.ts, which is the one place the
 * keystroke and the claim are written, so a row can never offer a chord the
 * keystroke would not honour.
 *
 * There is no ✓ on the active row, and that is deliberate rather than an
 * omission: the row's own selected tab says which project is active, and the
 * selection effect in `Titlebar` keeps that tab on screen, so a second answer
 * in the menu would be one answer too many.
 */
function projectMenuItems(
  tabs: TabData[],
  setActiveProject: (id: string) => void
): MenuItemSpec[] {
  return tabs.map((t, i) => {
    const digit = tabDigit(i, tabs.length);
    return {
      label: t.project.name,
      ...(digit !== null ? { hint: tabShortcutLabel(digit) } : {}),
      run: () => setActiveProject(t.project.id)
    };
  });
}

/**
 * PHASE 129. The chip that stands in for the whole row when the tabs are
 * collapsed on top.
 *
 * It carries the active project's dot, its name and its attention count, and
 * clicking it opens a NATIVE menu listing every open project with its own ⌘
 * digit, so collapsing the row never costs a person the ability to switch.
 * ⌘1 to ⌘9 and ⌃Tab are untouched by the collapse.
 */
function CollapsedProjectChip({
  tabs,
  activeProjectId
}: {
  tabs: TabData[];
  activeProjectId: string | null;
}): React.JSX.Element | null {
  const setActiveProject = useApp((s) => s.setActiveProject);
  const setMenu = useApp((s) => s.setMenu);
  const active = tabs.find((t) => t.project.id === activeProjectId) ?? tabs[0];
  if (active === undefined) return null;

  return (
    <button
      type="button"
      className="ptab-chip"
      aria-label={SWITCH_PROJECT}
      title={SWITCH_PROJECT}
      aria-haspopup="menu"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setMenu({
          x: r.left,
          y: r.bottom,
          items: projectMenuItems(tabs, setActiveProject)
        });
      }}
    >
      <span
        className={`dot dot-${active.dot === 'none' ? 'none' : active.dot}`}
      />
      <span className="prail-name">
        {truncateMiddle(active.project.name, 24)}
      </span>
      {active.machine !== null ? (
        <MachineBadge machine={active.machine} className="ptab-machine" />
      ) : null}
      {active.attentionCount > 0 ? (
        <span className="badge-attention num">{active.attentionCount}</span>
      ) : null}
      {/* Its own caret, so the chip says it opens a menu without leaning on
          the control beside it to say it. */}
      <Codicon name="chevron-down" size="sm" className="ptab-chip-caret" />
    </button>
  );
}

export function Titlebar(): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const gitInit = useGit((s) => s.init);
  const ensureStatus = useGit((s) => s.ensureStatus);

  // PHASE 164. One status request, for the ACTIVE project, and the others
  // wait until they are selected. This effect used to loop every open project
  // so a status was ready the moment a tab was switched to, and nothing on
  // screen read those hidden answers: the rail and the sidebar read the git
  // store by the active project's path. Each hidden request was three git
  // processes and a file watcher at boot, and then a re-run on every change in
  // that folder for the whole run. `activeProjectId` changes through
  // `setActiveProject`, which every way of switching routes through, so the
  // switch itself is what asks. `ensureStatus` is idempotent once a status
  // exists, so switching back costs nothing. See ./active-repo.ts.
  //
  // PHASE 90.3 FIX ROUND. ONLY A FOLDER ON THIS MAC. A project tab can be a
  // folder on another machine, and `git:status` reads this Mac's own disk. The
  // loop used to pass `p.path`, which is a bare path used as an identity, and
  // that is the thing this phase exists to remove. Two outcomes were measured
  // on 2026-08-19: when the path does not exist here, every boot logged one
  // `git:status` failure reading "That project folder does not exist"; when a
  // folder of the same name does exist here, the call succeeded and filed THIS
  // Mac's git status under the other machine's project key. No surface drew the
  // second one, because ActivityBar and Sidebar both read through
  // `localPathOf`, but a wrong number sitting in the store waiting for a reader
  // is not a state to leave behind. `activeLocalRepoPath` keeps that rule.
  useEffect(() => {
    gitInit();
    const local = activeLocalRepoPath(projects, activeProjectId);
    if (local !== null) ensureStatus(local);
  }, [projects, activeProjectId, gitInit, ensureStatus]);
  const sessions = useApp((s) => s.sessions);
  const setAttentionOpen = useApp((s) => s.setAttentionOpen);
  const attentionOpen = useApp((s) => s.attentionOpen);
  // Phase 129. Where the tabs are, and whether their names are on screen.
  const projectsPosition = useApp((s) => s.projectsPosition);
  const projectsCollapsed = useApp((s) => s.projectsCollapsed);
  const setProjectsCollapsed = useApp((s) => s.setProjectsCollapsed);

  const setMenu = useApp((s) => s.setMenu);
  const setActiveProject = useApp((s) => s.setActiveProject);

  // PHASE 189. The scrolling list of tabs, and whether it has more than it can
  // show. `listRef` replaces the old `navRef`: the drag hit-test, the insertion
  // indicator and the reveal below all read the list, because the band around
  // it also holds three pinned controls that are not tabs.
  const listRef = useRef<HTMLDivElement | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  // Phase 12.12 item 4: hold ⌘ and every tab says which digit reaches it.
  // Suppressed mid-drag — a number appearing under a tab the pointer is
  // carrying is noise, and the ghost is what the eye should be following.
  // (Project tabs have no rename affordance today; if they gain one, it ORs
  // into this same flag rather than growing a second reveal condition.)
  const [draggingTab, setDraggingTab] = useState(false);
  const hinting = useCommandHeld({ suppressed: draggingTab });

  const tabs = useProjectTabs();

  // PHASE 189. Does the row hold more than it can show? Measured, in the shape
  // ./SessionStrip.tsx already uses: a layout effect after every render, a
  // ResizeObserver on the list, and a passive scroll listener. It is one
  // boolean, and it decides one thing, being whether the chevron is drawn.
  //
  // The list is absent in the two branches that draw no tabs (collapsed on
  // top, and the left rail), which is why the null case answers `false` rather
  // than returning: a chevron left standing after the row collapsed would open
  // a menu beside a chip that already opens the same one.
  const measureOverflow = useCallback((): void => {
    const list = listRef.current;
    const has = list !== null && list.scrollWidth > list.clientWidth + 1;
    setOverflowing((prev) => (prev === has ? prev : has));
  }, []);

  useLayoutEffect(() => {
    measureOverflow();
  });

  useEffect(() => {
    const list = listRef.current;
    if (list === null) return;
    const observer = new ResizeObserver(() => measureOverflow());
    observer.observe(list);
    list.addEventListener('scroll', measureOverflow, { passive: true });
    return () => {
      observer.disconnect();
      list.removeEventListener('scroll', measureOverflow);
    };
  }, [measureOverflow, tabs.length]);

  // PHASE 189. The selected tab is the one a person needs to read, so it is
  // the one tab guaranteed to be on screen. This is what makes ⌘1…⌘9 and ⌃Tab
  // still reach a tab the row has scrolled away from: the chord selects it and
  // this brings it back into view. `tabs.length` is in the dependencies because
  // opening or closing a project moves the selection without changing its id in
  // the case where the closed tab was not the active one.
  const activeTabId = activeProjectId;
  useEffect(() => {
    if (activeTabId === null) return;
    listRef.current
      ?.querySelector<HTMLElement>(
        `[data-project-id="${CSS.escape(activeTabId)}"]`
      )
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTabId, tabs.length]);

  const attentionTotal = useMemo(
    () =>
      sessions.filter((x) => effectiveStatusOf(x) === 'needs_input')
        .length,
    [sessions]
  );

  // Phase 129. The band's own collapse control. It is drawn only while the
  // tabs are on top, because on the left the rail's band carries its own.
  const collapseControl = (
    <button
      type="button"
      className="icon-btn prail-collapse"
      aria-label={collapseLabel('top', projectsCollapsed)}
      title={collapseLabel('top', projectsCollapsed)}
      onClick={() => setProjectsCollapsed(!projectsCollapsed)}
    >
      <Codicon name={collapseIcon('top', projectsCollapsed)} size="md" />
    </button>
  );

  // PHASE 135. The + is drawn in BOTH top branches, and it is one element
  // rather than two copies of one.
  //
  // The button's body lives in NewProjectButton.tsx, which the project rail
  // renders as well, so the label, the accessible name and the menu call
  // exist once for the whole window. The class is the only thing this region
  // states, being `ptab-add`, which styles/app.css sizes at 24px and takes
  // out of the window's drag region.
  //
  // Before Phase 135 the collapsed branch drew no +, so collapsing the row
  // took away the only way to open a project with the mouse. It now sits
  // directly after the chip, which is where the projects are drawn in that
  // state, so the + is to the right of the projects in both branches and it
  // does not move when the row collapses.
  const addControl = <NewProjectButton className="ptab-add" />;

  // PHASE 189. The chevron, and it is option one's own affordance saying there
  // is more rather than option two's place to hide things. It appears only
  // while the list overflows, it sits at the end of the row before the +, and
  // it lists EVERY open project including the ones on screen, which is the rule
  // the session strip's chevron follows. No tab is ever taken out of the row to
  // put it here.
  //
  // It carries no attention badge, unlike the strip's. The bell at the other
  // end of this same band already counts every project's needs-input sessions,
  // and a second count of the same thing in one row is two answers to one
  // question.
  const overflowControl = overflowing ? (
    <button
      type="button"
      className="icon-btn ptab-overflow"
      aria-label={SWITCH_PROJECT}
      title={SWITCH_PROJECT}
      aria-haspopup="menu"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setMenu({
          x: r.left,
          y: r.bottom,
          items: projectMenuItems(tabs, setActiveProject)
        });
      }}
    >
      <Codicon name="chevron-right" size="md" />
    </button>
  ) : null;

  return (
    <header className="titlebar" data-slot="project-tabs">
      {/* PHASE 129. With the tabs on the left the band draws none of them: the
          rail does, and drawing both would be two answers to one question.
          The band itself stays, at its 38px, because the traffic lights live
          in its first 76px. */}
      {/* PHASE 148. The band's own controls sit at its HEAD, reversed, so the
          position control is the one nearest the traffic lights and the
          chevron sits beside it, then the projects begin. This mirrors Phase
          135's call for the left rail's band, and the operator asked for the
          two bands to agree. The + is not part of the move: it stays at the
          END of the tabs, where it has always been. */}
      {projectsPosition === 'left' ? null : projectsCollapsed ? (
        <nav className="titlebar-tabs" aria-label="Projects">
          <ProjectsPositionButton />
          {collapseControl}
          <CollapsedProjectChip tabs={tabs} activeProjectId={activeProjectId} />
          {addControl}
        </nav>
      ) : (
        <nav className="titlebar-tabs" aria-label="Projects">
          <ProjectsPositionButton />
          {collapseControl}
          {/* PHASE 189. The tabs are their own scrolling list and the three
              pinned controls stay outside it, which is how SessionStrip.tsx
              separates `.stab-list` from its own pinned cells. */}
          <div className="ptab-list" ref={listRef}>
            {tabs.map((t, i) => (
              <ProjectTab
                key={t.project.id}
                data={t}
                selected={t.project.id === activeProjectId}
                hintDigit={tabDigit(i, tabs.length)}
                hinting={hinting}
                onDragIndicate={setDropIndex}
                onDragState={setDraggingTab}
              />
            ))}
            {dropIndex !== null ? (
              <TabIndicator index={dropIndex} listRef={listRef} />
            ) : null}
          </div>
          {overflowControl}
          {/* The + sits after the tabs, which is where it has always been.
              Phase 148 moved the chevron and the position control to the
              band's head and left the + alone. Phase 189 put the overflow
              chevron between the list and the +, so the + is still the last
              thing in the row. */}
          {addControl}
        </nav>
      )}
      <div className="titlebar-spacer" />
      <button
        type="button"
        className={`bell${attentionTotal > 0 ? ' has-attention' : ''}`}
        title={`Needs your input (${keyDisplay('session.attention')})`}
        aria-label={
          attentionTotal > 0
            ? `${attentionTotal} ${attentionTotal === 1 ? 'session needs' : 'sessions need'} input`
            : 'Nothing needs you'
        }
        onClick={() => setAttentionOpen(!attentionOpen)}
      >
        <Codicon name="bell" size="lg" />
        {attentionTotal > 0 ? (
          <span className="badge-attention num">{attentionTotal}</span>
        ) : null}
      </button>
    </header>
  );
}
