/**
 * The collapsed session dock — a 48px rail of agent icons with a hover card
 * (Phase 18 item 4).
 *
 * The complaint was that the right-docked list has no way to get out of the
 * way. The obvious fix — let it drag to nothing — would have cost the app its
 * third product principle ("the glance answers who needs me"): a hidden list
 * hides the amber dot too. So the dock collapses to a RAIL instead, exactly
 * the activity bar's 48px, which gives the window symmetric bookends and
 * keeps every session's status on screen. What you lose is the names, and the
 * names come back on hover, on keyboard focus, and on expand.
 *
 * Everything here is the expanded list at a different density: same
 * `role="listbox"`, same accessible names, same statuses, same selection
 * behaviour, same tokens. No new signal is invented and nothing about "needs
 * input" changes — the rail only READS status.
 *
 * Two rules this file exists to keep:
 *  - the card never steals focus (`pointer-events: none`, `aria-hidden`, no
 *    `.focus()` anywhere): hovering a session must never take the keyboard
 *    away from the terminal the user is typing into;
 *  - the card is PORTALLED to `document.body` and positioned in raw viewport
 *    pixels, because the dock is a CSS-zoomable region (Phase 12.11) and a
 *    fixed-position card inside a zoomed ancestor resolves in zoomed space.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session, SessionMachine } from '@shared/types';
import { effectiveStatusOf, useApp } from '../state/store';
import { useLayout } from '../state/layout';
import type { Surface } from '../state/layout';
import { rollupDot, statusVisual } from './status';
import { useNow } from './format';
import { sessionAriaLabel, sessionTooltip } from './session-actions';
import { groupTooltip } from './split/split-menu';
import { pressBlocksSurfaceDrag, startSurfaceDrag } from './split/surface-dnd';
import { DockIndicator } from './DockIndicator';
import { MachineBadge } from './MachineBadge';
import { AgentIcon, Codicon } from '../icons';
import './session-rail.css';

/**
 * Cold reveal delay, and the window after a card hides in which the NEXT one
 * appears at once. Scrubbing down ten sessions must not feel like ten separate
 * waits; arriving at the rail for the first time must not flash a card at a
 * cursor that is only passing through.
 */
const REVEAL_DELAY_MS = 400;
const WARM_WINDOW_MS = 400;
/** Distance the card keeps from the top and bottom edges of the window. */
const VIEWPORT_MARGIN = 8;

let lastHiddenAt = 0;

// ---------------------------------------------------------------------------
// The hover card
// ---------------------------------------------------------------------------

interface CardSpec {
  /** Viewport y of the anchoring rail item's centre. */
  anchorY: number;
  title: string;
  /** "claude · working · 42m" — the line the glance is actually after. */
  detail: string;
  /** The resume sentence, when this session has one. Quiet, and last. */
  note: string;
  /**
   * The machine this session runs on, when it is not this Mac (Phase 70).
   *
   * The rail is 48px wide and shows no names at all, so the card is the only
   * place a collapsed dock can say where a session runs. Undefined for every
   * session on this Mac, and the card then draws exactly what it drew before.
   */
  machine?: SessionMachine;
}

function RailCard({ spec }: { spec: CardSpec }): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [top, setTop] = useState<number | null>(null);

  // Centre on the item, then keep the whole card inside the window — the
  // standing rule for every hover card in the app. Measured after mount
  // because the card's height depends on how much the status line wraps.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const h = el.getBoundingClientRect().height;
    const desired = spec.anchorY - h / 2;
    const max = window.innerHeight - h - VIEWPORT_MARGIN;
    setTop(Math.round(Math.min(Math.max(desired, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, max))));
    // The badge is a fourth line, so its arrival changes the height the
    // centring is computed from.
  }, [spec.anchorY, spec.title, spec.detail, spec.note, spec.machine?.label]);

  return createPortal(
    <div
      ref={ref}
      className="rail-card"
      aria-hidden="true"
      // Hidden until measured, so the card never appears at the wrong y for
      // one frame and then jumps.
      style={top === null ? { top: 0, visibility: 'hidden' } : { top }}
    >
      <div className="rail-card-name">{spec.title}</div>
      <div className="rail-card-detail">{spec.detail}</div>
      {/* The resume sentence is a paragraph, and the glance is after the line
          above it — so it sits apart and quiet rather than burying the status
          it explains. Never truncated: it is a promise about the user's work,
          and half of that sentence is worse than none of it. */}
      {spec.note === '' ? null : <div className="rail-card-note">{spec.note}</div>}
      {/* Phase 70. Its own line, because the detail line above is the status
          glance and the machine is not a status. */}
      {spec.machine === undefined ? null : (
        <div>
          <MachineBadge machine={spec.machine} className="rail-card-machine" />
        </div>
      )}
    </div>,
    document.body
  );
}

/**
 * The card's body, taken apart from `sessionTooltip()` rather than recomposed
 * — which is what stops the rail from growing its own status vocabulary.
 * The tooltip is `"<name> — <agent> · <status> · <age>"` plus, when the
 * session has one, the resume sentence on a second line.
 */
function bodyOf(name: string, tooltip: string): { detail: string; note: string } {
  const prefix = `${name} — `;
  const rest = tooltip.startsWith(prefix) ? tooltip.slice(prefix.length) : tooltip;
  const br = rest.indexOf('\n');
  return br === -1
    ? { detail: rest, note: '' }
    : { detail: rest.slice(0, br), note: rest.slice(br + 1) };
}

// ---------------------------------------------------------------------------
// Rail items
// ---------------------------------------------------------------------------

interface ItemProps {
  /** The surface this icon stands for — the drag path needs the whole thing. */
  surface: Surface;
  projectPath: string;
  /** Session id the item acts on (a group's focused leaf). */
  leafId: string;
  selected: boolean;
  label: string;
  card: Omit<CardSpec, 'anchorY'>;
  attention: boolean;
  glyph: React.JSX.Element;
  dot: string;
  onActivate: () => void;
  onReveal: (spec: CardSpec | null) => void;
  /** Reveal without the delay (keyboard selection follows the arrows). */
  revealNow: boolean;
}

function RailItem(props: ItemProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);
  /** This item's card is the one on screen — so unmounting must take it away. */
  const showing = useRef(false);

  const cancel = (): void => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const specNow = (): CardSpec | null => {
    const el = ref.current;
    if (el === null) return null;
    const r = el.getBoundingClientRect();
    return { ...props.card, anchorY: r.top + r.height / 2 };
  };

  const reveal = (spec: CardSpec | null): void => {
    showing.current = spec !== null;
    props.onReveal(spec);
  };

  const { revealNow, onReveal, selected } = props;
  // The keyboard path: the card follows the SELECTION while the list has the
  // keyboard, with no delay — the arrows are already a deliberate act.
  useEffect(() => {
    if (!revealNow || !selected) return;
    const spec = specNow();
    if (spec !== null) onReveal(spec);
    return () => onReveal(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealNow, selected, props.card.title, props.card.detail, props.card.note]);

  // A session can end while the pointer is on its row, and then no
  // pointerleave ever arrives — the card would outlive the thing it describes.
  useEffect(
    () => () => {
      cancel();
      if (showing.current) onReveal(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <li>
      <div
        ref={ref}
        role="option"
        aria-selected={props.selected}
        aria-label={props.label}
        data-session-id={props.leafId}
        data-surface-id={props.surface.id}
        className={[
          'rail-item',
          props.selected ? 'selected' : '',
          props.attention ? 'attention' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={props.onActivate}
        onPointerDown={(e) => {
          // Phase 60: the collapsed icon drags exactly like the expanded row —
          // same refusals (pressBlocksSurfaceDrag), same gesture, same 'dock'
          // home. `armPointerDrag` only takes over past its threshold, so a
          // plain click still activates. The card is dismissed up front: a
          // press is intent to act, not to read.
          const anyRename = useApp.getState().renamingSessionId !== null;
          if (pressBlocksSurfaceDrag(e, anyRename)) return;
          cancel();
          reveal(null);
          startSurfaceDrag(
            e.nativeEvent,
            e.currentTarget,
            props.surface,
            props.projectPath,
            'dock'
          );
        }}
        onPointerEnter={(e) => {
          // Touch/pen "hover" is a press about to happen; only a real pointer
          // gets the timed reveal.
          if (e.pointerType !== 'mouse') return;
          cancel();
          const warm = Date.now() - lastHiddenAt < WARM_WINDOW_MS;
          const show = (): void => {
            const spec = specNow();
            if (spec !== null) reveal(spec);
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
        <span className="rail-glyph">
          {props.glyph}
          <span className={`dot dot-${props.dot} rail-dot`} />
        </span>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// The rail
// ---------------------------------------------------------------------------

export function SessionRail({
  surfaces,
  sessionsById,
  projectPath,
  activeSurfaceId,
  activeLeafId,
  onListKeyDown
}: {
  surfaces: Surface[];
  sessionsById: Map<string, Session>;
  projectPath: string;
  activeSurfaceId: string | null;
  activeLeafId: string;
  /** The dock's own list-key handler — one implementation, two densities. */
  onListKeyDown: (e: React.KeyboardEvent) => void;
}): React.JSX.Element | null {
  const setActiveSession = useApp((s) => s.setActiveSession);
  const lastActivity = useApp((s) => s.lastActivity);
  const selectLeaf = useLayout((s) => s.selectLeaf);
  // Phase 60: the rail is a 'dock' drag home, so it renders the dock's own
  // insertion indicator when a drag hovers it.
  const dockDrop = useLayout((s) => s.dockDrop);
  const now = useNow();

  const [card, setCard] = useState<CardSpec | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);

  if (surfaces.length === 0) return null;

  return (
    <>
      <ul
        ref={listRef}
        className="rail-list"
        role="listbox"
        aria-label="Sessions"
        tabIndex={0}
        onKeyDown={onListKeyDown}
        onFocus={(e) => {
          // Only a keyboard arrival reveals: clicking into the list already
          // has a pointer on the item, and would otherwise show two cards'
          // worth of intent at once.
          setKeyboard(e.currentTarget.matches(':focus-visible'));
        }}
        onBlur={() => {
          setKeyboard(false);
          setCard(null);
        }}
      >
        {surfaces.map((surf) => {
          const selected = surf.id === activeSurfaceId;
          if (surf.isGroup) {
            const members = surf.leafIds
              .map((id) => sessionsById.get(id))
              .filter((x): x is Session => x !== undefined);
            const statuses = members.map((m) => effectiveStatusOf(m));
            const dot = rollupDot(statuses);
            const focusedId = surf.leafIds.includes(activeLeafId)
              ? activeLeafId
              : (surf.leafIds[0] ?? '');
            const focused =
              members.find((m) => m.id === focusedId) ?? members[0];
            const title = focused?.name ?? 'splits';
            return (
              <RailItem
                key={surf.id}
                surface={surf}
                projectPath={projectPath}
                leafId={focusedId}
                selected={selected}
                attention={statuses.includes('needs_input')}
                label={`${title} and ${members.length - 1} more`}
                card={{
                  title,
                  detail: groupTooltip(
                    members.map((m, i) => ({
                      name: m.name,
                      label: statusVisual(statuses[i] ?? 'idle', m).label
                    }))
                  ),
                  note: ''
                }}
                glyph={<Codicon name="split-horizontal" size={16} />}
                dot={dot === 'none' ? 'idle' : dot}
                onActivate={() => selectLeaf(projectPath, focusedId)}
                onReveal={setCard}
                revealNow={keyboard}
              />
            );
          }
          const session = sessionsById.get(surf.id);
          if (!session) return null;
          const status = effectiveStatusOf(session);
          const visual = statusVisual(status, session);
          const tooltip = sessionTooltip(
            session,
            visual,
            lastActivity[session.id],
            now
          );
          return (
            <RailItem
              key={surf.id}
              surface={surf}
              projectPath={projectPath}
              leafId={session.id}
              selected={selected}
              attention={status === 'needs_input'}
              label={sessionAriaLabel(session, visual)}
              card={{
                title: session.name,
                ...bodyOf(session.name, tooltip),
                ...(session.machine !== undefined
                  ? { machine: session.machine }
                  : {})
              }}
              glyph={<AgentIcon agent={session.agent} size={16} />}
              dot={visual.dot}
              onActivate={() => setActiveSession(session.id)}
              onReveal={setCard}
              revealNow={keyboard}
            />
          );
        })}
        {dockDrop !== null ? (
          <DockIndicator index={dockDrop} listRef={listRef} />
        ) : null}
      </ul>
      {card !== null ? <RailCard spec={card} /> : null}
    </>
  );
}
