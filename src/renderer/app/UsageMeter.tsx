/**
 * The subscription usage meter (Phase 181): ONE component, three densities.
 *
 * The operator's placement, from his own screenshots of 2026-08-30: the meters
 * live at the FOOT of the sessions pane, they stay present when the dock is
 * collapsed to the right rail, and they are present when sessions are
 * organized on top. So this is mounted three times and written once.
 *
 *   full     the foot of the expanded dock. Icon, bar, `2% 5h · 56% wk`, and
 *            a refresh control.
 *   compact  the control end of the top tab strip. The same row without the
 *            separate control, because clicking the meter refreshes it.
 *   mini     the collapsed 48px rail. Bars only, and the numbers move to the
 *            hover card, because at 48px there is no room for a number that
 *            can read 100.
 *
 * EVERY NUMBER HERE IS SERVED. Nothing is estimated, no token is counted and
 * no log is parsed. The percentages come from the vendor's own answer and this
 * file clamps, rounds once and draws a width.
 *
 * WHAT IT DRAWS WHEN NOTHING IS ON: nothing at all. Both providers default to
 * off, and an off provider is absent from the snapshot's numbers, so a default
 * install has no meter and no empty frame where one would be.
 *
 * PHASE 181.2 ANSWERED TWO THINGS THE OPERATOR REPORTED. The bar now fills to
 * the window a person chose in Settings, shipping as the five hour one so the
 * bar agrees with the number the line beside it leads with, and the hover
 * card names the plan each login is on so a person can tell whose quota is on
 * screen. The card names a PLAN and never an identifier, and a provider that
 * named no plan gets no line rather than a guess.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { UsageProviderSnapshot } from '@shared/usage';
import { clampUsagePercent, usageHasNumbers } from '@shared/usage';
import type { UsageBarWindow } from '@shared/settings';
import { AgentIcon, Codicon } from '../icons';
import { useNow } from '../format';
import { useUsage } from '../state/usage';
import {
  USAGE_FIVE_HOUR,
  USAGE_PROVIDER_LABEL,
  USAGE_REFRESH,
  USAGE_SEVEN_DAY,
  USAGE_STALE_MARK,
  usagePercentText,
  usagePlanLine,
  usageResetIn,
  usageSeverity,
  usageStateLine
} from './usage-copy';
import './usage-meter.css';

export type UsageDensity = 'full' | 'compact' | 'mini';

/** Distance the hover card keeps from the top and bottom of the window. */
const VIEWPORT_MARGIN = 8;

/**
 * How full the one bar per provider is drawn, and the window it means.
 *
 * PHASE 181 FILLED IT TO THE MAXIMUM OF THE TWO WINDOWS and put no label on
 * the bar, so a person read the bar against the first number in the line
 * beside it and the two disagreed. The operator's screenshot of 2026-08-31
 * reads 32 percent 5h next to a bar filled to 62. So the window is now the
 * person's choice, the shipped answer is the five hour one, and the maximum
 * is still available and now says what it is on the page that offers it.
 *
 * A CHOSEN WINDOW THE VENDOR DID NOT NAME FALLS BACK TO THE ONE IT DID, which
 * keeps the promise the setting is for rather than breaking it: on the
 * operator's own machine Codex names the weekly window and no five hour one,
 * so the line reads one number and the bar is filled to that same number.
 * Drawing nothing there would take a bar off the face, and drawing zero would
 * be a number no vendor served.
 *
 * The value is clamped here, so what leaves this function is always a length
 * a browser will accept. The fix round of 2026-08-31 found that it was not:
 * a width of `NaN%` is not a length, so React leaves the element at the width
 * it already had, and one hostile snapshot kept the bar from the one before
 * it. Exported for the test that holds that.
 */
export function barPercent(
  p: UsageProviderSnapshot,
  bar: UsageBarWindow
): number | null {
  const five = clampUsagePercent(p.fiveHour?.percent);
  const week = clampUsagePercent(p.sevenDay?.percent);
  if (bar === 'five-hour') return five ?? week;
  if (bar === 'seven-day') return week ?? five;
  const values = [five, week].filter((v): v is number => v !== null);
  return values.length === 0 ? null : Math.max(...values);
}

/** The `2% 5h · 56% wk` line, with a window omitted when the vendor named none. */
export function usageLine(p: UsageProviderSnapshot): string {
  const parts = [
    p.fiveHour === null ? '' : usagePercentText(p.fiveHour.percent, USAGE_FIVE_HOUR),
    p.sevenDay === null ? '' : usagePercentText(p.sevenDay.percent, USAGE_SEVEN_DAY)
  ];
  return parts.filter((part) => part !== '').join(' · ');
}

function UsageBar({ percent }: { percent: number }): React.JSX.Element {
  return (
    <span className={`usage-bar sev-${usageSeverity(percent)}`}>
      <span className="usage-bar-fill" style={{ width: `${percent}%` }} />
    </span>
  );
}

/** One provider's row at the two wider densities. */
function UsageRow({
  p,
  now,
  bar
}: {
  p: UsageProviderSnapshot;
  now: number;
  bar: UsageBarWindow;
}): React.JSX.Element {
  const percent = barPercent(p, bar);
  const line = usageLine(p);
  return (
    <span className="usage-row">
      <AgentIcon agent={p.provider} size={14} className="usage-icon" />
      {percent === null ? null : <UsageBar percent={percent} />}
      {line === '' ? (
        <span className="usage-none">{USAGE_PROVIDER_LABEL[p.provider]}</span>
      ) : (
        <span className="usage-text num">{line}</span>
      )}
      {p.state === 'stale' ? (
        <Codicon name="warning" size={11} className="usage-stale" />
      ) : null}
      <span className="usage-hidden">{cardLines(p, now).join('. ')}</span>
    </span>
  );
}

/** The lines the hover card shows, and the accessible text the row carries. */
export function cardLines(p: UsageProviderSnapshot, now: number): string[] {
  const out: string[] = [USAGE_PROVIDER_LABEL[p.provider]];
  // WHOSE NUMBERS THESE ARE, in one short line under the vendor's name
  // (Phase 181.2). It is the plan word the vendor itself names and nothing
  // else, and a provider that named no plan gets no line rather than a guess.
  const plan = usagePlanLine(p.plan);
  if (plan !== '') out.push(plan);
  const windows: [string, typeof p.fiveHour][] = [
    [USAGE_FIVE_HOUR, p.fiveHour],
    [USAGE_SEVEN_DAY, p.sevenDay]
  ];
  for (const [label, win] of windows) {
    if (win === null) continue;
    const text = usagePercentText(win.percent, label);
    if (text === '') continue;
    const reset = win.resetsAt === null ? '' : usageResetIn(win.resetsAt, now);
    out.push(reset === '' ? text : `${text}, ${reset}`);
  }
  const scoped = p.scoped === null ? null : clampUsagePercent(p.scoped.percent);
  if (p.scoped !== null && scoped !== null) {
    out.push(`${p.scoped.label} ${Math.round(scoped)}% ${USAGE_SEVEN_DAY}`);
  }
  if (p.state === 'stale') out.push(USAGE_STALE_MARK);
  const line = usageStateLine(p.provider, p.state);
  if (line !== '') out.push(line);
  return out;
}

/** The gap the card keeps from the meter when it sits beside it. */
const ANCHOR_GAP = 6;

/** The meter's own box, in raw viewport pixels. */
export interface UsageAnchor {
  /** Distance from the right edge of the window to the meter's left edge. */
  x: number;
  top: number;
  bottom: number;
}

/**
 * Where the card's top edge goes (Phase 181.2), and it is a pure function so
 * the test can drive both orientations without a window.
 *
 * CENTRED ON THE METER when there is room, which is what Phase 181 did and
 * what the dock's foot gets. When there is not, the card goes to the side of
 * the meter that has room instead of sliding along the window edge across the
 * band the meter sits in. That is the second half of the operator's defect:
 * raising the card above the tab strip stops the strip covering the card, and
 * this stops the card covering the tabs. With sessions organized on top the
 * meter sits in a 36px band under the project tabs, centring would put the
 * card's top at a negative number, and the old clamp parked it over the
 * project tabs and the traffic lights. Now it hangs under the band.
 *
 * The clamp is still the last answer, for a window too short to hold the card
 * anywhere, and it is what keeps the card inside both window edges.
 */
export function usageCardTop(
  anchor: { top: number; bottom: number },
  height: number,
  viewportHeight: number
): number {
  const maxTop = viewportHeight - height - VIEWPORT_MARGIN;
  const centred = anchor.top + (anchor.bottom - anchor.top) / 2 - height / 2;
  if (centred >= VIEWPORT_MARGIN && centred <= maxTop) return Math.round(centred);
  const below = anchor.bottom + ANCHOR_GAP;
  if (below >= VIEWPORT_MARGIN && below <= maxTop) return Math.round(below);
  const above = anchor.top - ANCHOR_GAP - height;
  if (above >= VIEWPORT_MARGIN && above <= maxTop) return Math.round(above);
  return Math.round(
    Math.min(Math.max(centred, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, maxTop))
  );
}

/**
 * The hover card, portalled to the body and positioned in raw viewport pixels
 * for the reason ./SessionRail.tsx states: the dock is a CSS zoomable region
 * and a fixed position card inside a zoomed ancestor resolves in zoomed space.
 */
function UsageCard({
  anchor,
  groups
}: {
  anchor: UsageAnchor;
  groups: string[][];
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const h = el.getBoundingClientRect().height;
    setTop(usageCardTop(anchor, h, window.innerHeight));
  }, [anchor, groups]);

  return createPortal(
    <div
      ref={ref}
      className="usage-card"
      aria-hidden="true"
      style={
        top === null
          ? { top: 0, right: anchor.x, visibility: 'hidden' }
          : { top, right: anchor.x }
      }
    >
      {groups.map((lines, i) => (
        <div className="usage-card-group" key={lines[0] ?? String(i)}>
          {lines.map((text, j) => (
            <div
              className={j === 0 ? 'usage-card-name' : 'usage-card-line'}
              key={text}
            >
              {text}
            </div>
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
}

export function UsageMeter({
  density
}: {
  density: UsageDensity;
}): React.JSX.Element | null {
  const snapshot = useUsage((s) => s.snapshot);
  const refreshing = useUsage((s) => s.refreshing);
  const refresh = useUsage((s) => s.refresh);
  const ensurePolling = useUsage((s) => s.ensurePolling);
  // The window the bar means (Phase 181.2). It is one setting for every meter
  // and every provider, and it arrives on the settings broadcast, so a change
  // made in Settings moves the bar in the meter that is already on screen and
  // in a card that is already open, rather than at the next poll or mount.
  const bar = useUsage((s) => s.barWindow);
  const now = useNow(60_000);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [card, setCard] = useState<UsageAnchor | null>(null);

  useEffect(() => {
    ensurePolling();
  }, [ensurePolling]);

  const shown = snapshot.providers.filter((p) => p.state !== 'off');
  if (shown.length === 0) return null;

  const groups = shown.map((p) => cardLines(p, now));

  const showCard = (): void => {
    const el = hostRef.current;
    if (el === null) return;
    const r = el.getBoundingClientRect();
    setCard({
      x: Math.max(VIEWPORT_MARGIN, window.innerWidth - r.left + ANCHOR_GAP),
      top: r.top,
      bottom: r.bottom
    });
  };

  const hover = {
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      showCard();
    },
    onPointerLeave: () => setCard(null)
  };

  if (density === 'full') {
    return (
      <div
        ref={hostRef}
        className="usage-meter usage-full"
        data-slot="usage-meter"
        {...hover}
      >
        <div className="usage-rows">
          {shown.map((p) => (
            <UsageRow key={p.provider} p={p} now={now} bar={bar} />
          ))}
        </div>
        <button
          type="button"
          className="icon-btn usage-refresh"
          aria-label={USAGE_REFRESH}
          title={USAGE_REFRESH}
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          <Codicon name="refresh" size="sm" />
        </button>
        {card !== null ? <UsageCard anchor={card} groups={groups} /> : null}
      </div>
    );
  }

  if (density === 'compact') {
    return (
      <div
        ref={hostRef}
        className="usage-meter usage-compact"
        data-slot="usage-meter"
        {...hover}
      >
        <button
          type="button"
          className="usage-press"
          aria-label={USAGE_REFRESH}
          title={USAGE_REFRESH}
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          {shown.map((p) => (
            <UsageRow key={p.provider} p={p} now={now} bar={bar} />
          ))}
        </button>
        {card !== null ? <UsageCard anchor={card} groups={groups} /> : null}
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className="usage-meter usage-mini"
      data-slot="usage-meter"
      {...hover}
    >
      <button
        type="button"
        className="usage-press"
        aria-label={USAGE_REFRESH}
        title={USAGE_REFRESH}
        disabled={refreshing}
        onClick={() => void refresh()}
      >
        {shown.map((p) => {
          const percent = barPercent(p, bar);
          return (
            <span className="usage-mini-row" key={p.provider}>
              <AgentIcon agent={p.provider} size={11} className="usage-icon" />
              {percent === null ? (
                <span className="usage-bar sev-none" />
              ) : (
                <UsageBar percent={percent} />
              )}
              <span className="usage-hidden">
                {usageHasNumbers(p)
                  ? cardLines(p, now).join('. ')
                  : usageStateLine(p.provider, p.state)}
              </span>
            </span>
          );
        })}
      </button>
      {card !== null ? <UsageCard anchor={card} groups={groups} /> : null}
    </div>
  );
}
