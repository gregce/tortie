/**
 * The Phase 181.2 harness drive, being the renderer half of
 * `build/probe-p1812-bar-and-card.mjs`.
 *
 * ## What the probe is proving with it
 *
 * Two things the operator reported and nothing in the suite could see. That
 * the bar a person LOOKS AT is filled to the window the line beside it names,
 * at each of the three choices and at both orientations. And that the hover
 * card is drawn ON TOP of the project tabs rather than behind them. Both are
 * questions about drawn pixels, so the probe reads rectangles out of the
 * running window and this file only puts the numbers there and opens the card.
 *
 * The fix round of 2026-08-31 wrote it because neither fix had an executable
 * guard at the level it broke: `.usage-card`'s z-index could go back to a bare
 * 60, and the drawn geometry could stop agreeing with the drawn text, and the
 * whole battery would stay green either way.
 *
 * ## NO CREDENTIAL IS READ, and that is the point of staging
 *
 * Both usage switches stay OFF for the whole run, so main opens no keychain
 * item, opens no credentials file and makes no request to any vendor. The
 * numbers come from {@link P1812Drive.stage}, they are written into the same
 * store field main's own read writes, and they are invented: a two window
 * provider and a one window provider, chosen to be the SHAPE of the operator's
 * screenshot and none of its values. Nothing about a real account is read,
 * drawn or recorded by this drive.
 *
 * Staging has to HOLD, in the same way ./p93-attention-drive.ts holds a row.
 * The store reconciles what is drawn against the switches on every
 * `settings:changed`, and the probe changes a setting on purpose, so a bare
 * one shot write would be wiped by the next broadcast and the reconciling read
 * behind it. So stage subscribes and re-applies until unstaged, and compares
 * before it writes so it cannot loop.
 *
 * ## Everything below the store is the shipped path
 *
 * `barPercent`, the bar's width, the card's placement, its stacking and every
 * word in it are the product's. The card is opened with a real `pointerover`
 * carrying `pointerType: 'mouse'`, which is the event React's enter and leave
 * plugin listens for at the root, so the card opens the way it opens for a
 * pointer rather than through a state setter.
 *
 * It assigns exactly one object to `window` and changes nothing else, in the
 * shape ./p93-attention-drive.ts beside it set. Outside the harness it is one
 * unused property, and `./probe-loader.ts` means a person's launch never loads
 * this file at all.
 */

import type { UsageProviderSnapshot } from '@shared/usage';
import { useUsage } from '../state/usage';

/** One bar as it was actually drawn, in raw viewport pixels. */
export interface P1812Bar {
  provider: string;
  /** The line beside the bar, e.g. `3% 5h · 64% wk`. Read off the face. */
  line: string;
  /** The track's own width. Null when this row drew no bar at all. */
  trackWidth: number | null;
  /** The filled part's width. Null when this row drew no bar at all. */
  fillWidth: number | null;
}

/** What one reading of the meter and its card holds. */
export interface P1812Reading {
  /** How many meters are mounted and drawn right now. */
  meters: number;
  bars: P1812Bar[];
  /** True while the hover card is in the document. */
  cardOpen: boolean;
  /** The card's box, or null when it is not open. */
  card: { top: number; bottom: number; left: number; right: number } | null;
  /** The card's computed `z-index`, as the string the browser resolved. */
  cardZ: string | null;
  /** Every line the card drew, in order, grouped by provider. */
  cardText: string[];
  /** The band that carries the project tabs, or null when it is not drawn. */
  titlebar: { top: number; bottom: number; left: number; right: number } | null;
  titlebarZ: string | null;
  viewportHeight: number;
}

declare global {
  interface Window {
    __gmuxP1812?: P1812Drive;
  }
}

export interface P1812Drive {
  /** Put numbers on the face without reading anything. Holds until unstaged. */
  stage(providers: UsageProviderSnapshot[]): Promise<void>;
  /** Stop holding. The next read from main is drawn again. */
  unstage(): Promise<void>;
  /** Open the card with a real pointer event. False when no meter is drawn. */
  hover(): Promise<boolean>;
  /** Close it the same way. */
  leave(): Promise<void>;
  /** What is on screen right now. */
  read(): Promise<P1812Reading>;
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** The one meter that is actually drawn. Three are mounted; one has a box. */
function drawnMeter(): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(
    '[data-slot="usage-meter"]'
  )) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function boxOf(el: Element | null): P1812Reading['card'] {
  if (el === null) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
}

function zOf(el: Element | null): string | null {
  return el === null ? null : getComputedStyle(el).zIndex;
}

function readNow(): P1812Reading {
  const meter = drawnMeter();
  const rows = meter === null ? [] : [...meter.querySelectorAll('.usage-row, .usage-mini-row')];
  const card = document.querySelector('.usage-card');
  const titlebar = document.querySelector('.titlebar');
  return {
    meters: document.querySelectorAll('[data-slot="usage-meter"]').length,
    bars: rows.map((row, i) => {
      const track = row.querySelector('.usage-bar');
      const fill = row.querySelector('.usage-bar-fill');
      // The vendor's own name, read off the accessible text the row already
      // carries, which is the card's first line. The mark beside it is an
      // inline SVG naming nothing, so this is the honest reading.
      const hidden = (row.querySelector('.usage-hidden')?.textContent ?? '').trim();
      return {
        provider: hidden === '' ? `row-${String(i)}` : (hidden.split('.')[0] ?? '').trim(),
        line: (row.querySelector('.usage-text')?.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim(),
        trackWidth: track === null ? null : track.getBoundingClientRect().width,
        fillWidth: fill === null ? null : fill.getBoundingClientRect().width
      };
    }),
    cardOpen: card !== null,
    card: boxOf(card),
    cardZ: zOf(card),
    cardText:
      card === null
        ? []
        : [...card.querySelectorAll('.usage-card-name, .usage-card-line')].map(
            (el) => (el.textContent ?? '').trim()
          ),
    titlebar: boxOf(titlebar),
    titlebarZ: zOf(titlebar),
    viewportHeight: window.innerHeight
  };
}

/** The subscription {@link P1812Drive.stage} owns, so unstage can end it. */
let held: (() => void) | null = null;

export function registerP1812UsageDrive(): void {
  const drive: P1812Drive = {
    async stage(providers) {
      held?.();
      const want = JSON.stringify(providers);
      const apply = (): void => {
        const snapshot = useUsage.getState().snapshot;
        // Compare before writing. The subscription sees its own write, so
        // this is what stops it looping, and it is also what lets a settings
        // broadcast wipe the face and be answered rather than fought.
        if (JSON.stringify(snapshot.providers) === want) return;
        useUsage.setState({
          snapshot: { at: Date.now(), providers: JSON.parse(want) as UsageProviderSnapshot[] }
        });
      };
      apply();
      held = useUsage.subscribe(apply);
      await wait(200);
    },

    async unstage() {
      held?.();
      held = null;
      await wait(100);
    },

    /**
     * A real pointer, entering from outside the meter.
     *
     * React synthesises `onPointerEnter` from `pointerover` at the root, so a
     * bare `pointerenter` dispatched on the element reaches nothing. This
     * sends what the plugin listens for, with `relatedTarget` null, which is
     * what a pointer arriving from outside the window looks like.
     */
    async hover() {
      const meter = drawnMeter();
      if (meter === null) return false;
      meter.dispatchEvent(
        new PointerEvent('pointerover', {
          pointerType: 'mouse',
          bubbles: true,
          cancelable: true,
          relatedTarget: null
        })
      );
      await wait(200);
      return document.querySelector('.usage-card') !== null;
    },

    async leave() {
      const meter = drawnMeter();
      if (meter === null) return;
      meter.dispatchEvent(
        new PointerEvent('pointerout', {
          pointerType: 'mouse',
          bubbles: true,
          cancelable: true,
          relatedTarget: document.body
        })
      );
      await wait(200);
    },

    async read() {
      // Two frames before the reading, because the fill carries a 160ms width
      // transition and a reading taken in the same tick as the write is a
      // photograph of the old width. The probe polls this until it settles.
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );
      return readNow();
    }
  };

  window.__gmuxP1812 = drive;
}
