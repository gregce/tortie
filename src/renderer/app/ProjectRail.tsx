/**
 * The project tabs as a rail down the left side of the window (Phase 129).
 *
 * The operator asked for the project tabs to be able to leave the title band,
 * because a row of tabs across a 38px band runs out of room at about eight
 * projects and the traffic lights own its first 76px. The rail is the same
 * list at a different density, and it is the window's OUTERMOST left column,
 * before the activity bar, so a collapsed rail and the activity bar are not
 * two 48px strips sitting against each other in the middle of the window.
 *
 * Everything here reads the same data the strip reads
 * (./project-tabs-data.ts) and the same order it draws in, so ⌘1 to ⌘9 and
 * ⌃Tab keep meaning what they meant. Nothing here writes a session's status.
 *
 * TWO WIDTHS AND NOTHING ELSE. 200px expanded, 48px collapsed, and no drag
 * handle. The width is not a stored number, so there is nothing to clamp and
 * nothing to persist. A window too narrow to seat the expanded rail draws the
 * collapsed one instead, and the arithmetic for that lives in
 * src/renderer/state/chrome-geometry.ts, which is the one place a layout limit
 * may be defined.
 *
 * The hover card copies SessionRail.tsx's rules exactly, and they are rules
 * rather than choices:
 *  - the card never steals focus (`pointer-events: none`, `aria-hidden`, no
 *    `.focus()` anywhere), because hovering a project must never take the
 *    keyboard away from the terminal a person is typing into;
 *  - it is PORTALLED to `document.body` and positioned in raw viewport pixels,
 *    because a fixed-position card inside a CSS-zoomed ancestor resolves in
 *    zoomed space.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../state/store';
import {
  projectRailForcedNarrow,
  projectsRenderedWidth,
  PROJECT_RAIL_COLLAPSED_W,
  useWindowWidth
} from '../state/chrome-geometry';
import { useProjectTabs } from './project-tabs-data';
import type { TabData } from './project-tabs-data';
import {
  collapseIcon,
  collapseLabel,
  PROJECTS_LABEL,
  RAIL_TOO_NARROW
} from './projects-position';
import { ProjectsPositionButton } from './ProjectsPositionButton';
import { NewProjectButton } from './NewProjectButton';
import { useCommandHeld } from './modifier-held';
import { tabDigit, tabShortcutLabel } from './project-shortcuts';
import { MachineBadge } from './MachineBadge';
import { truncateMiddle } from './format';
import { Codicon } from '../icons';
import './project-rail.css';

/** Distance the hover card keeps from the top and bottom of the window. */
const VIEWPORT_MARGIN = 8;
/** Cold reveal delay, and the window in which the next card is instant. */
const REVEAL_DELAY_MS = 400;
const WARM_WINDOW_MS = 400;

let lastHiddenAt = 0;

/**
 * The one sentence the card gives under the name. It counts sessions and says
 * whether any of them is waiting, and it says nothing else, because the rail
 * is navigation rather than a status board.
 */
export function projectStatusLine(data: TabData): string {
  if (data.attentionCount > 0) {
    return data.attentionCount === 1
      ? '1 session needs input'
      : `${data.attentionCount} sessions need input`;
  }
  if (data.sessionCount === 0) return 'No sessions yet';
  return data.sessionCount === 1 ? '1 session' : `${data.sessionCount} sessions`;
}

// ---------------------------------------------------------------------------
// The hover card
// ---------------------------------------------------------------------------

interface CardSpec {
  /** Viewport y of the anchoring row's centre. */
  anchorY: number;
  title: string;
  detail: string;
  /** The folder this project is, spelled out. Quiet, and last. */
  note: string;
}

function RailCard({ spec }: { spec: CardSpec }): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const h = el.getBoundingClientRect().height;
    const desired = spec.anchorY - h / 2;
    const max = window.innerHeight - h - VIEWPORT_MARGIN;
    setTop(
      Math.round(
        Math.min(
          Math.max(desired, VIEWPORT_MARGIN),
          Math.max(VIEWPORT_MARGIN, max)
        )
      )
    );
  }, [spec.anchorY, spec.title, spec.detail, spec.note]);

  return createPortal(
    <div
      ref={ref}
      className="prail-card"
      aria-hidden="true"
      style={top === null ? { top: 0, visibility: 'hidden' } : { top }}
    >
      <div className="prail-card-name">{spec.title}</div>
      <div className="prail-card-detail">{spec.detail}</div>
      {spec.note === '' ? null : (
        <div className="prail-card-note">{spec.note}</div>
      )}
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// One row
// ---------------------------------------------------------------------------

function RailRow({
  data,
  selected,
  collapsed,
  hintDigit,
  hinting,
  onReveal
}: {
  data: TabData;
  selected: boolean;
  collapsed: boolean;
  hintDigit: number | null;
  hinting: boolean;
  onReveal: (spec: CardSpec | null) => void;
}): React.JSX.Element {
  const setActiveProject = useApp((s) => s.setActiveProject);
  const closeProject = useApp((s) => s.closeProject);
  const setMenu = useApp((s) => s.setMenu);
  const ref = useRef<HTMLLIElement | null>(null);
  const timer = useRef<number | null>(null);
  /** This row's card is the one on screen, so unmounting must take it away. */
  const showing = useRef(false);

  const { project, dot, attentionCount, machine, title } = data;
  const detail = projectStatusLine(data);

  const cancel = (): void => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const reveal = (spec: CardSpec | null): void => {
    showing.current = spec !== null;
    onReveal(spec);
  };

  // A project can be closed while the pointer is on its row, and then no
  // pointerleave ever arrives — the card would outlive the thing it describes.
  React.useEffect(
    () => () => {
      cancel();
      if (showing.current) onReveal(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const ariaLabel = `${project.name}${
    attentionCount > 0
      ? `, ${attentionCount} ${
          attentionCount === 1 ? 'session needs' : 'sessions need'
        } input`
      : ''
  }`;

  return (
    <li
      ref={ref}
      className={`prail-row${selected ? ' selected' : ''}${
        hinting && hintDigit !== null ? ' hinting' : ''
      }`}
      data-project-id={project.id}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({
          x: e.clientX,
          y: e.clientY,
          items: [{ label: 'Close project', run: () => closeProject(project.id) }]
        });
      }}
      onPointerEnter={(e) => {
        // Only the expanded rail has room for the names, so only the collapsed
        // one needs a card. Touch and pen "hover" is a press about to happen.
        if (!collapsed || e.pointerType !== 'mouse') return;
        cancel();
        const warm = Date.now() - lastHiddenAt < WARM_WINDOW_MS;
        const show = (): void => {
          const el = ref.current;
          if (el === null) return;
          const r = el.getBoundingClientRect();
          reveal({
            anchorY: r.top + r.height / 2,
            title: project.name,
            detail,
            note: project.path
          });
        };
        if (warm) show();
        else timer.current = window.setTimeout(show, REVEAL_DELAY_MS);
      }}
      onPointerLeave={() => {
        cancel();
        lastHiddenAt = Date.now();
        reveal(null);
      }}
    >
      <button
        type="button"
        className="prail-open"
        title={
          collapsed
            ? undefined
            : hintDigit !== null
              ? `${title}\n${tabShortcutLabel(hintDigit)}`
              : title
        }
        aria-label={ariaLabel}
        aria-current={selected ? 'true' : undefined}
        onClick={() => {
          cancel();
          reveal(null);
          setActiveProject(project.id);
        }}
      >
        <span className={`dot dot-${dot === 'none' ? 'none' : dot}`} />
        {collapsed ? (
          <span className="prail-glyph">
            <Codicon name="folder" size={16} />
          </span>
        ) : (
          <>
            <span className="prail-name">
              {truncateMiddle(project.name, 22)}
            </span>
            {machine !== null ? (
              <MachineBadge machine={machine} className="prail-machine" />
            ) : null}
            {attentionCount > 0 ? (
              <span className="badge-attention num">{attentionCount}</span>
            ) : null}
          </>
        )}
      </button>
      {collapsed ? null : (
        <button
          type="button"
          className="prail-close"
          aria-label={`Close ${project.name}`}
          title="Close project"
          onClick={() => closeProject(project.id)}
        >
          <Codicon name="close" size={12} />
        </button>
      )}
      {/* Overlaid in the slot the close × already reserves, so revealing it
          cannot reflow the rail. Decorative: the same fact reaches assistive
          tech through the tooltip, the ⌘/ overlay and the Settings map. */}
      {!collapsed && hintDigit !== null ? (
        <span className="prail-hint num" aria-hidden="true">
          {hintDigit}
        </span>
      ) : null}
    </li>
  );
}

// ---------------------------------------------------------------------------
// The rail
// ---------------------------------------------------------------------------

export function ProjectRail(): React.JSX.Element | null {
  const position = useApp((s) => s.projectsPosition);
  const storedCollapsed = useApp((s) => s.projectsCollapsed);
  const setProjectsCollapsed = useApp((s) => s.setProjectsCollapsed);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const windowWidth = useWindowWidth();
  const tabs = useProjectTabs();
  const [card, setCard] = useState<CardSpec | null>(null);
  const hinting = useCommandHeld();

  if (position !== 'left') return null;

  const presence = {
    projectsPosition: position,
    projectsCollapsed: storedCollapsed
  };
  const width = projectsRenderedWidth(presence, windowWidth);
  const collapsed = width === PROJECT_RAIL_COLLAPSED_W;
  // The window is too narrow to seat the expanded rail, so the person's own
  // choice is not what is on screen. The chevron says so instead of offering
  // a press that would change nothing.
  const forced = projectRailForcedNarrow(presence, windowWidth);

  const chevron = (
    <button
      type="button"
      className="icon-btn prail-collapse"
      aria-label={forced ? RAIL_TOO_NARROW : collapseLabel(position, collapsed)}
      title={forced ? RAIL_TOO_NARROW : collapseLabel(position, collapsed)}
      disabled={forced}
      onClick={() => setProjectsCollapsed(!collapsed)}
    >
      <Codicon name={collapseIcon(position, collapsed)} size={14} />
    </button>
  );

  // The same button is drawn in two places, being the expanded band's tail and
  // the collapsed rail's footer, so it is written once here and placed twice
  // below. A second hand written copy would be two buttons to keep in step.
  //
  // Its body lives in NewProjectButton.tsx, which the title band renders as
  // well, so the label, the accessible name and the menu call exist once for
  // the whole window. The class is the only thing this region states, being
  // `icon-btn prail-add`, which project-rail.css sizes at 24px beside the
  // chevron and the position button.
  const add = <NewProjectButton className="icon-btn prail-add" />;

  return (
    <>
      <aside
        className={`project-rail${collapsed ? ' collapsed' : ''}`}
        data-slot="project-rail"
        style={{ width, flexBasis: width, minWidth: width, maxWidth: width }}
      >
        <div className="prail-band">
          {collapsed ? (
            chevron
          ) : (
            <>
              {/* The controls sit at the HEAD of the band. The position button
                  is first because it is the control nearest the traffic
                  lights, which sit in the title band directly above the rail's
                  first 76px. The chevron is second, beside it. The label and
                  the count follow, and the spacer then holds the ＋ at the
                  band's tail. */}
              <ProjectsPositionButton />
              {chevron}
              <span className="prail-title">{PROJECTS_LABEL}</span>
              {tabs.length > 0 ? (
                <span className="prail-count num">{tabs.length}</span>
              ) : null}
              <span className="prail-spacer" />
              {add}
            </>
          )}
        </div>
        <ul className="prail-list" aria-label={PROJECTS_LABEL}>
          {tabs.map((t, i) => (
            <RailRow
              key={t.project.id}
              data={t}
              selected={t.project.id === activeProjectId}
              collapsed={collapsed}
              hintDigit={tabDigit(i, tabs.length)}
              hinting={hinting}
              onReveal={setCard}
            />
          ))}
        </ul>
        {/* Pinned at the rail's foot when it is collapsed, exactly where the
            collapsed session dock pins its own position button and where the
            activity bar pins its gear. A 48px rail has no right, so the two
            controls STACK rather than sitting side by side. The ＋ is on the
            upper row and the position button is on the lower one, so the way
            back to the top stays the last thing at the foot, which is where
            the activity bar's gear and the session dock's own position button
            sit. The footer is 72px tall and the two 24px buttons with a 4px
            gap between them are 52px of it, so 10px of slack sits above the
            pair and 10px below. The footer is drawn whenever the rail is
            collapsed, including when no projects are open, because the ＋ must
            never leave the window. */}
        {collapsed ? (
          <div className="prail-footer">
            {add}
            <ProjectsPositionButton />
          </div>
        ) : null}
        {/* The band's own ＋ is the way in, and it is right above this line,
            so the sentence names no verb of its own. The collapsed rail has no
            room for a sentence, so it says nothing rather than clipping one. */}
        {tabs.length === 0 && !collapsed ? (
          <div className="prail-stub">No projects are open.</div>
        ) : null}
      </aside>
      {card !== null ? <RailCard spec={card} /> : null}
    </>
  );
}
