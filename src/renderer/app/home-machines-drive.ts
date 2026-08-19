/**
 * The Phase 92 harness drive for the home screen's column.
 *
 * WHAT IT IS FOR. The phase changes two numbers on a screen whose height is
 * load bearing, being the column's `min-height` and the short-window row cap.
 * The claim that follows from those numbers is that the wordmark's top edge is
 * the SAME whether this person has no machine, one machine or two. That claim
 * cannot be read off the source, because the height comes from CSS and the row
 * count comes from a list that arrives one IPC round trip after the first
 * paint. So this module injects machine rows into the renderer's own store,
 * lets a frame pass, and reads the geometry back.
 *
 * WHAT IT DOES NOT PROVE, and the report has to say so. It does not prove that
 * a real machines file produces these rows, because it writes the store
 * directly. `build/probe-remote-recents.mjs` seeds real files for that half.
 * It also contacts no machine and starts nothing, so nothing here says whether
 * an injected machine would answer.
 *
 * HOW IT IS REACHED. It assigns exactly one function to `window` and changes no
 * product behaviour, exactly like the other shot probes in this tree. Outside
 * the harness it is one unused property.
 */

import type { MachineStateView } from '@shared/ipc';
import { useApp } from '../state/store';

export interface HomeMachinesProbeSpec {
  /** How many confirmed machines to inject. 0, 1 and 2 are the cells. */
  machines?: number;
  /** The labels those machines report. Defaults to `Mac Pro` and `Studio`. */
  labels?: string[];
  /** Milliseconds to let the render settle before reading. Defaults to 400. */
  settleMs?: number;
  /**
   * Leave the injected rows in the store when the call returns, so the
   * screenshot the harness takes next photographs this state. Default false,
   * which puts the store back exactly as it was found.
   */
  hold?: boolean;
}

/** Everything read at one moment, in CSS pixels. */
export interface HomeMachinesReading {
  /** The viewport the reading was taken at. */
  viewportHeight: number;
  viewportWidth: number;
  /** How many machine rows were in the store for this reading. */
  machines: number;
  /** The top edge of `.home-lockup`, which is the number that must not move. */
  lockupTop: number;
  /** The column box, whose height is the `min-height` under test. */
  colTop: number;
  colHeight: number;
  /** Action rows, and the title of each one in order. */
  actionCount: number;
  actionTitles: string[];
  /** Recent rows in the DOM, and how many of them the cap leaves visible. */
  recentRows: number;
  recentRowsVisible: number;
  /** True when the screen has to scroll to show its own content. */
  homeScrolls: boolean;
  /**
   * The two numbers behind {@link homeScrolls}, so a report can quote them
   * instead of a yes or a no. `homeScrollHeight` is what the content needs and
   * `homeClientHeight` is what the window gives it, both in CSS pixels.
   */
  homeScrollHeight: number;
  homeClientHeight: number;
  /**
   * Every computed `animation-name` inside `.home` that is not `none`. Research
   * 35 §1.12 says nothing on this screen animates, so this must be empty.
   */
  animations: string[];
  /** Every distinct computed `transition-property` on a `.home-row`. */
  rowTransitions: string[];
  /** The machine names drawn on recent rows, in row order. */
  recentMachineNames: string[];
  /**
   * The computed fill, border radius and colour of the first machine name.
   *
   * A machine name is identity and not status, so it must carry no fill, no
   * border radius and no colour of its own. Null when no such element is drawn.
   */
  recentMachineStyle: {
    backgroundColor: string;
    borderRadius: string;
    borderTopWidth: string;
    color: string;
    fontFamily: string;
  } | null;
}

export interface HomeMachinesProbeResult {
  ok: boolean;
  why?: string;
  reading?: HomeMachinesReading;
}

declare global {
  interface Window {
    __gmuxHomeMachinesProbe?: (
      spec?: HomeMachinesProbeSpec
    ) => Promise<HomeMachinesProbeResult>;
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

const DEFAULT_LABELS = ['Mac Pro', 'Studio'];

/** One confirmed machine, as main would report it while it is answering. */
function injectedMachine(index: number, label: string): MachineStateView {
  return {
    id: `p92m${index + 1}`,
    label,
    color: index === 0 ? 'magenta' : 'cyan',
    link: 'connected',
    everAnswered: true,
    lastAnsweredAt: Date.now(),
    detail: null
  };
}

/** Rounded to a whole pixel, because a top edge is compared at 0 tolerance. */
function topOf(selector: string): number {
  const el = document.querySelector(selector);
  if (el === null) return -1;
  return Math.round(el.getBoundingClientRect().top);
}

function readOnce(machines: number): HomeMachinesReading {
  const col = document.querySelector('.home-col');
  const home = document.querySelector('.home');
  const actions = Array.from(
    document.querySelectorAll<HTMLElement>('.home-action')
  );
  const recents = Array.from(
    document.querySelectorAll<HTMLElement>('.home-recent')
  );
  const names = Array.from(
    document.querySelectorAll<HTMLElement>('.home-recent-machine')
  );

  const animations: string[] = [];
  if (home !== null) {
    for (const el of Array.from(home.querySelectorAll('*'))) {
      const name = getComputedStyle(el).animationName;
      if (name !== 'none' && name !== '' && !animations.includes(name)) {
        animations.push(name);
      }
    }
  }
  const rowTransitions: string[] = [];
  for (const el of Array.from(
    document.querySelectorAll<HTMLElement>('.home-row')
  )) {
    const prop = getComputedStyle(el).transitionProperty;
    if (!rowTransitions.includes(prop)) rowTransitions.push(prop);
  }

  const first = names[0];
  const style = first === undefined ? null : getComputedStyle(first);

  return {
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
    machines,
    lockupTop: topOf('.home-lockup'),
    colTop: topOf('.home-col'),
    colHeight:
      col === null ? -1 : Math.round(col.getBoundingClientRect().height),
    actionCount: actions.length,
    actionTitles: actions.map(
      (el) => el.querySelector('.home-row-title')?.textContent ?? ''
    ),
    recentRows: recents.length,
    recentRowsVisible: recents.filter((el) => el.offsetParent !== null).length,
    homeScrolls:
      home === null ? false : home.scrollHeight > home.clientHeight + 1,
    homeScrollHeight: home === null ? -1 : home.scrollHeight,
    homeClientHeight: home === null ? -1 : home.clientHeight,
    animations,
    rowTransitions,
    recentMachineNames: names.map((el) => el.textContent ?? ''),
    recentMachineStyle:
      style === null
        ? null
        : {
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderTopLeftRadius,
            borderTopWidth: style.borderTopWidth,
            color: style.color,
            fontFamily: style.fontFamily
          }
  };
}

export function registerHomeMachinesDrive(): void {
  if (typeof window === 'undefined') return;
  window.__gmuxHomeMachinesProbe = async (
    spec?: HomeMachinesProbeSpec
  ): Promise<HomeMachinesProbeResult> => {
    const count = Math.max(0, Math.min(2, spec?.machines ?? 0));
    const labels = spec?.labels ?? DEFAULT_LABELS;
    const settleMs = spec?.settleMs ?? 400;

    if (document.querySelector('.home') === null) {
      return {
        ok: false,
        why: 'the home screen is not on screen, so there is nothing to measure'
      };
    }

    const before = useApp.getState().machineStates;
    const injected: MachineStateView[] = [];
    for (let i = 0; i < count; i += 1) {
      injected.push(injectedMachine(i, labels[i] ?? `Machine ${i + 1}`));
    }
    useApp.setState({ machineStates: injected });
    await wait(settleMs);

    const reading = readOnce(count);
    if (spec?.hold !== true) {
      useApp.setState({ machineStates: before });
      await wait(settleMs);
    }
    return { ok: true, reading };
  };
}
