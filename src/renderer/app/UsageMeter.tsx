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
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { UsageProviderSnapshot } from '@shared/usage';
import { usageHasNumbers } from '@shared/usage';
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
  usageResetIn,
  usageSeverity,
  usageStateLine
} from './usage-copy';
import './usage-meter.css';

export type UsageDensity = 'full' | 'compact' | 'mini';

/** Distance the hover card keeps from the top and bottom of the window. */
const VIEWPORT_MARGIN = 8;

/**
 * The bar draws the window that is FURTHEST ALONG, being whichever of the two
 * will stop you first, and the card names both. One bar per provider is the
 * shape the operator asked for, and picking the fuller window is the only rule
 * that never buries the number a person needs.
 */
function barPercent(p: UsageProviderSnapshot): number | null {
  const values = [p.fiveHour?.percent, p.sevenDay?.percent].filter(
    (v): v is number => typeof v === 'number'
  );
  if (values.length === 0) return null;
  return Math.max(...values);
}

/** The `2% 5h · 56% wk` line, with a window omitted when the vendor named none. */
export function usageLine(p: UsageProviderSnapshot): string {
  const parts: string[] = [];
  if (p.fiveHour !== null) {
    parts.push(usagePercentText(p.fiveHour.percent, USAGE_FIVE_HOUR));
  }
  if (p.sevenDay !== null) {
    parts.push(usagePercentText(p.sevenDay.percent, USAGE_SEVEN_DAY));
  }
  return parts.join(' · ');
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
  now
}: {
  p: UsageProviderSnapshot;
  now: number;
}): React.JSX.Element {
  const percent = barPercent(p);
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
  const windows: [string, typeof p.fiveHour][] = [
    [USAGE_FIVE_HOUR, p.fiveHour],
    [USAGE_SEVEN_DAY, p.sevenDay]
  ];
  for (const [label, win] of windows) {
    if (win === null) continue;
    const reset = win.resetsAt === null ? '' : `, ${usageResetIn(win.resetsAt, now)}`;
    out.push(`${usagePercentText(win.percent, label)}${reset}`);
  }
  if (p.scoped !== null) {
    out.push(`${p.scoped.label} ${Math.round(p.scoped.percent)}% ${USAGE_SEVEN_DAY}`);
  }
  if (p.state === 'stale') out.push(USAGE_STALE_MARK);
  const line = usageStateLine(p.provider, p.state);
  if (line !== '') out.push(line);
  return out;
}

/**
 * The hover card, portalled to the body and positioned in raw viewport pixels
 * for the reason ./SessionRail.tsx states: the dock is a CSS zoomable region
 * and a fixed position card inside a zoomed ancestor resolves in zoomed space.
 */
function UsageCard({
  anchorY,
  anchorX,
  groups
}: {
  anchorY: number;
  anchorX: number;
  groups: string[][];
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const h = el.getBoundingClientRect().height;
    const max = window.innerHeight - h - VIEWPORT_MARGIN;
    setTop(
      Math.round(
        Math.min(Math.max(anchorY - h / 2, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, max))
      )
    );
  }, [anchorY, groups]);

  return createPortal(
    <div
      ref={ref}
      className="usage-card"
      aria-hidden="true"
      style={
        top === null
          ? { top: 0, right: anchorX, visibility: 'hidden' }
          : { top, right: anchorX }
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
  const now = useNow(60_000);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [card, setCard] = useState<{ x: number; y: number } | null>(null);

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
      x: Math.max(VIEWPORT_MARGIN, window.innerWidth - r.left + 6),
      y: r.top + r.height / 2
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
            <UsageRow key={p.provider} p={p} now={now} />
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
          <Codicon name="refresh" size={12} />
        </button>
        {card !== null ? (
          <UsageCard anchorX={card.x} anchorY={card.y} groups={groups} />
        ) : null}
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
            <UsageRow key={p.provider} p={p} now={now} />
          ))}
        </button>
        {card !== null ? (
          <UsageCard anchorX={card.x} anchorY={card.y} groups={groups} />
        ) : null}
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
          const percent = barPercent(p);
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
      {card !== null ? (
        <UsageCard anchorX={card.x} anchorY={card.y} groups={groups} />
      ) : null}
    </div>
  );
}
