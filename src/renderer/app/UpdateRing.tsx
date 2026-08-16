/**
 * The update ring (Phase 58). One small circular indicator in the activity
 * bar, mounted directly above the Settings gear. It carries the whole manual
 * update journey and it is hidden almost all of the time.
 *
 * The renderer holds NO visibility policy. Main decides what the ring shows
 * through `ring` on UpdateUiState (src/main/updates/journey.ts), and this
 * component draws exactly that. The rule "the ring never animates for a
 * check the user did not start" lives in main, where it is unit tested.
 *
 * The click goes through the ui:popupMenu bridge only. No DOM menu exists on
 * any path, not even as a fallback. An older preload without popupMenu, or
 * without the updates extras, simply has no ring. The ring carries no badge,
 * no count and no notification of any kind.
 */

import React, { useEffect, useState } from 'react';
import type {
  GmuxPopupMenuExtras,
  GmuxUpdatesExtras,
  PopupMenuInput,
  PopupMenuItem,
  UpdateRingStage,
  UpdateUiState
} from '@shared/ipc';
import './update-ring.css';

/** The four fields the ring reads. The full UpdateUiState satisfies this. */
export type UpdateRingSnapshot = Pick<
  UpdateUiState,
  'ring' | 'ringVersion' | 'ringPercent' | 'failedDuring'
>;

/* ---------------------------------------------------------------------------
   Geometry. One inline SVG, 18 by 18, stroke width 2, radius 7. The arc
   starts at 12 o'clock through a CSS rotation, so the markup keeps plain
   circle elements and the numbers below stay testable.
--------------------------------------------------------------------------- */

export const RING_RADIUS = 7;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Two decimal places, with trailing zeros dropped ("11", not "11.00"). */
function fixed2(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/**
 * The stroke-dasharray for an arc covering `percent` of the circle. The
 * input is clamped to 0 to 100, so a wild number can never overdraw.
 */
export function ringArcDasharray(percent: number): string {
  const clamped = Math.min(100, Math.max(0, percent));
  const filled = (RING_CIRCUMFERENCE * clamped) / 100;
  return `${fixed2(filled)} ${fixed2(RING_CIRCUMFERENCE)}`;
}

/** The checking and staging arc is about a quarter turn. */
const QUARTER_TURN_PERCENT = 25;

/* ---------------------------------------------------------------------------
   Words. The hover names the stage in words with the real percent, and it is
   also the button's aria-label. The percent is the floor of the real number,
   never rounded up, so 100 appears only when the download is done.
--------------------------------------------------------------------------- */

export function ringHover(state: UpdateRingSnapshot): string {
  const version = state.ringVersion ?? '';
  switch (state.ring) {
    case 'checking':
      return 'Checking for updates';
    case 'downloading':
      return `Downloading ${version}, ${Math.floor(state.ringPercent ?? 0)} percent`;
    case 'staging':
      return `Preparing ${version}`;
    case 'ready':
      // The quit promise moved here from the removed ready dialog.
      // build/assert-bundle-refusals.mjs pins the fragment
      // " is ready. It installs when you quit." against the renderer bundle.
      return `Tortie ${version} is ready. It installs when you quit. Click to choose when.`;
    case 'failed':
      switch (state.failedDuring) {
        case 'checking':
          return 'The update check failed. Click to see why.';
        case 'downloading':
          return `The download of ${version} did not finish. Click to see why.`;
        case 'staging':
          return `Tortie could not prepare ${version}. Click to see why.`;
        case null:
          // The state changed under the hover. Stay truthful and generic.
          return 'The update did not finish. Click to see why.';
      }
      break;
    case 'hidden':
      return '';
  }
  return '';
}

/* ---------------------------------------------------------------------------
   The menu. Native only, through ui:popupMenu. During checking, downloading
   and staging the menu does not open, because a menu whose only line would
   be disabled answers a question nobody asked. The hover already names the
   stage.
--------------------------------------------------------------------------- */

/** The items per stage, or null when the click does nothing. */
export function ringMenuItems(stage: UpdateRingStage): PopupMenuItem[] | null {
  if (stage === 'ready') {
    return [
      { id: 'restart-now', label: 'Restart and update now' },
      { id: 'install-on-quit', label: 'Install when you quit' }
    ];
  }
  if (stage === 'failed') {
    return [
      { id: 'why-failed', label: 'Why it failed' },
      { id: 'repair', label: 'Repair updates' }
    ];
  }
  return null;
}

/** What the component needs from window.gmux, feature detected on mount. */
export interface RingBridge {
  state(): Promise<UpdateUiState>;
  onChanged(cb: (state: UpdateUiState) => void): () => void;
  restartNow(): Promise<void>;
  whyFailed(): Promise<void>;
  repair(): Promise<void>;
  popupMenu(input: PopupMenuInput): Promise<string | null>;
}

/**
 * Feature detection. The component needs updates.state, updates.onChanged
 * and popupMenu. When any is missing there is no ring at all. The three
 * action members are optional in the contract, so a missing one becomes a
 * no-op rather than a throw.
 */
export function ringBridge(): RingBridge | null {
  if (typeof window === 'undefined') return null;
  const g = (window.gmux ?? {}) as unknown as GmuxUpdatesExtras &
    GmuxPopupMenuExtras;
  const u = g.updates;
  const popup = g.popupMenu;
  if (u === undefined || typeof u.state !== 'function') return null;
  const onChanged = u.onChanged;
  if (typeof onChanged !== 'function') return null;
  if (typeof popup !== 'function') return null;
  const call = (fn: (() => Promise<void>) | undefined): Promise<void> =>
    typeof fn === 'function' ? fn.call(u) : Promise.resolve();
  return {
    state: () => u.state(),
    onChanged: (cb) => onChanged.call(u, cb),
    restartNow: () => call(u.restartNow),
    whyFailed: () => call(u.whyFailed),
    repair: () => call(u.repair),
    popupMenu: (input) => popup.call(g, input)
  };
}

/**
 * The click. Opens the native menu for ready and failed, and runs the picked
 * action. A dismissal, a popup failure and "Install when you quit" all
 * change nothing, and the ring stays as it is. Main logs its own failures,
 * so a failed action draws no error here.
 */
export async function openRingMenu(
  stage: UpdateRingStage,
  bridge: RingBridge,
  anchor: { x: number; y: number }
): Promise<void> {
  const items = ringMenuItems(stage);
  if (items === null) return;
  let picked: string | null = null;
  try {
    picked = await bridge.popupMenu({
      x: Math.round(anchor.x),
      y: Math.round(anchor.y),
      items
    });
  } catch {
    return;
  }
  try {
    if (picked === 'restart-now') await bridge.restartNow();
    else if (picked === 'why-failed') await bridge.whyFailed();
    else if (picked === 'repair') await bridge.repair();
  } catch {
    /* logged by main */
  }
}

/* ---------------------------------------------------------------------------
   The drawing. Colors live in update-ring.css and are tokens only. The CSS
   also owns the 12 o'clock rotation, the spin, the arc transition and the
   prefers-reduced-motion stop.
--------------------------------------------------------------------------- */

function ringMarks(state: UpdateRingSnapshot): React.JSX.Element | null {
  const circle = { cx: 9, cy: 9, r: RING_RADIUS, strokeWidth: 2 };
  switch (state.ring) {
    case 'checking':
    case 'staging':
      return (
        <>
          <circle className="update-ring-track" fill="none" {...circle} />
          <circle
            className="update-ring-arc update-ring-spin"
            fill="none"
            strokeDasharray={ringArcDasharray(QUARTER_TURN_PERCENT)}
            {...circle}
          />
        </>
      );
    case 'downloading':
      return (
        <>
          <circle className="update-ring-track" fill="none" {...circle} />
          <circle
            className="update-ring-arc"
            fill="none"
            strokeDasharray={ringArcDasharray(state.ringPercent ?? 0)}
            {...circle}
          />
        </>
      );
    case 'ready':
      return (
        <>
          <circle className="update-ring-full" fill="none" {...circle} />
          <circle className="update-ring-dot" cx={9} cy={9} r={2.5} />
        </>
      );
    case 'failed':
      return <circle className="update-ring-full" fill="none" {...circle} />;
    case 'hidden':
      return null;
  }
}

/**
 * The presentational half, pure on its props so a test can render every
 * stage without a bridge. A hidden ring renders nothing at all. Nothing
 * reserves space either, because the activity bar spacer absorbs the
 * difference and the gear does not move.
 */
export function UpdateRingView({
  state,
  onActivate
}: {
  state: UpdateRingSnapshot;
  onActivate?: (anchor: { x: number; y: number }) => void;
}): React.JSX.Element | null {
  if (state.ring === 'hidden') return null;
  const label = ringHover(state);
  return (
    <button
      type="button"
      className={`update-ring update-ring-${state.ring}`}
      title={label}
      aria-label={label}
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        onActivate?.({ x: rect.right + 4, y: rect.top });
      }}
    >
      <svg
        width={18}
        height={18}
        viewBox="0 0 18 18"
        aria-hidden="true"
        focusable="false"
      >
        {ringMarks(state)}
      </svg>
    </button>
  );
}

/**
 * The mounted half. One state() read on mount, then onChanged keeps it
 * live. A push always wins over the mount read, so a stale first answer can
 * never overwrite a fresher event. The component is mounted exactly once,
 * in the activity bar, so no duplicate handler can accumulate.
 */
export function UpdateRing(): React.JSX.Element | null {
  const [bridge] = useState(() => ringBridge());
  const [state, setState] = useState<UpdateUiState | null>(null);

  useEffect(() => {
    if (bridge === null) return;
    let alive = true;
    void bridge.state().then(
      (s) => {
        if (alive) setState((current) => current ?? s);
      },
      () => {
        /* an unanswerable read draws no ring rather than a wrong one */
      }
    );
    const off = bridge.onChanged((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
      off();
    };
  }, [bridge]);

  if (bridge === null || state === null || state.ring === 'hidden') {
    return null;
  }

  return (
    <UpdateRingView
      state={state}
      onActivate={(anchor) => {
        void openRingMenu(state.ring, bridge, anchor);
      }}
    />
  );
}
