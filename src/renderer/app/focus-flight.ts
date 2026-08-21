/**
 * Session focus mode, the flight (Phase 80.1).
 *
 * One chord gives the session surface the whole window. The project tabs, the
 * activity bar, the sidebar, the session strip or dock and the editor stop
 * being drawn, and the surface grows into the space they leave. The same
 * chord puts every region back.
 *
 * THE SENTENCE THAT IS THE WHOLE DESIGN. Nothing animates the live terminal's
 * layout box while it is attached. The flight runs on a still copy
 * (./focus-copy.ts) and swaps to the live hosts once, at the end. Two rules
 * follow, and they bind every line below.
 *
 *  1. Only `transform` and `opacity` are animated, and only on the copy and
 *     on the chrome. No keyframe here may name a layout property.
 *  2. The live surface's border box does not change size between the moment
 *     the chord is pressed and the moment the flight finishes. That is why
 *     the chrome is FADED during the flight rather than removed, and why the
 *     destination is measured in one unpainted layout pass.
 *
 * WHY THERE IS NO MEMENTO. Editor fill needs one because it writes
 * `sidebarVisible` and `dockCollapsed` on the way in. Focus writes neither.
 * Every region it hides is hidden by one CSS class on the shell root, so the
 * sidebar's width, the dock's width, the editor's width and the strip's
 * orientation are never touched and come back byte for byte because they
 * never left. The state is one boolean in the chrome slice.
 *
 * THE NAME. `./session-focus.ts` already means "land the person IN a session"
 * for the attention overlay and the menu bar sentinel. This module is the
 * mode, not the jump, so it is named for what it does.
 *
 * WHO CALLS `toggleSessionFocus` SINCE PHASE 129. The chord no longer arrives
 * here directly. `./fill-chord.ts` reads the region the keyboard is in and
 * sends the chord either here or to the editor's own fill. Escape and the
 * native View row still call this module directly, because both of them mean
 * the session and nothing else. Nothing in this file changed for that.
 */

import type { SessionStatus } from '@shared/types';
import { effectiveStatusOf, useApp } from '../state/store';
import { buildStillCopy, type FlightRect, type StillCopy } from './focus-copy';

export type { FlightRect };

/** The class React puts on the shell root while the mode is on. */
export const FOCUS_CLASS = 'session-focus';
/**
 * The class the measurement borrows for one unpainted layout pass. It hides
 * exactly the set `.session-focus` hides, declared as one grouped selector in
 * focus-mode.css, so what is measured is what React will render.
 */
export const MEASURE_CLASS = 'gmux-focus-measure';
/** The class that is on the shell root while the copy is in the air. */
export const FLIGHT_CLASS = 'gmux-focusing';
/**
 * The ATTRIBUTE that fades the chrome back in after a LEAVE has swapped.
 *
 * TWO THINGS ARE DELIBERATE HERE AND BOTH WERE MEASURED.
 *
 * It runs AFTER the swap rather than during the flight, for the reason that
 * governs this whole module. A region that is `display: none` cannot fade,
 * and drawing it during the flight would give the sidebar and the dock their
 * widths back, which would change the live surface's border box and send a
 * resize to every leaf mid gesture. So the chrome comes back at the swap,
 * laid out, and only its opacity is animated from there. Opacity moves no
 * box, so nothing is resized twice.
 *
 * It is an attribute and not a class because React owns this element's class
 * attribute. `App.tsx` renders `className={'shell' + (sessionFocus ? ' ...`,
 * so the swap makes that string change and React writes the whole attribute,
 * which erases anything added to `classList` by hand. Measured on 2026-08-18:
 * the first version of this used a class, and a frame by frame reading of the
 * sidebar over a leave went from `shell session-focus gmux-focusing` at
 * opacity 0 straight to `shell` at opacity 1, with the class gone and no fade.
 * React never wrote `data-focus-arriving`, so React never takes it away.
 * FLIGHT_CLASS survives its own 200 ms for the opposite reason. Nothing
 * re-renders during a flight, and the swap is where it is meant to end.
 */
export const ARRIVE_ATTR = 'data-focus-arriving';

/** The surface, and the gate. Absent means there is nothing to focus. */
const SURFACE_SELECTOR = '[data-surface-leaves]';
const SHELL_SELECTOR = '.shell';

/** Fallbacks for the two motion tokens, used only when they cannot be read. */
const FALLBACK_MS = 200;
const FALLBACK_EASING = 'cubic-bezier(0.2, 0, 0, 1)';

/** The two refusals, in the words DESIGN.md section 6 asks for. */
export const NOTHING_TO_FOCUS = 'There is no session to focus.';
export const RESTORE_FIRST = 'Restore this session before you focus it.';

/** Which way the flight is going. */
export type FlightDestination = 'focused' | 'ordinary';

/**
 * One flight at a time. A second chord arriving mid flight is dropped rather
 * than queued, because the person pressing twice in 200 ms wants the gesture
 * they can already see, not two of them.
 */
let flying = false;

/**
 * The pending removal of ARRIVE_ATTR. It is held so a second gesture can
 * cancel it: a finished animation with `both` fill pins opacity at 1, and a
 * left-behind attribute would stop the chrome fading OUT on the next enter.
 */
let arriveTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Pure decisions
// ---------------------------------------------------------------------------

/** Four decimal places, with no trailing zeroes. */
function round(value: number): string {
  return String(Number(value.toFixed(4)));
}

/**
 * The ordinary First Last Invert Play transform. Applied to an element laid
 * out at `last`, it puts that element exactly where `first` is.
 *
 * A zero sized destination cannot be divided by, and a scale of 1 is the
 * honest answer there. The copy simply does not grow.
 */
export function invertTransform(first: FlightRect, last: FlightRect): string {
  const sx = last.width === 0 ? 1 : first.width / last.width;
  const sy = last.height === 0 ? 1 : first.height / last.height;
  const tx = first.left - last.left;
  const ty = first.top - last.top;
  return `translate(${round(tx)}px, ${round(ty)}px) scale(${round(sx)}, ${round(sy)})`;
}

/** A leaf in this state has no live output, so there is nothing to grow. */
function needsRestore(status: SessionStatus): boolean {
  return status === 'restorable' || status === 'exited';
}

/**
 * True when every leaf on screen is one the person must restore first.
 *
 * An empty list is not an answer and returns false, because "I could not see
 * the leaves" must never become "I refuse". A group with one live leaf and
 * five restorable ones is still worth focusing, and this says so.
 */
export function everyLeafNeedsRestore(statuses: SessionStatus[]): boolean {
  return statuses.length > 0 && statuses.every(needsRestore);
}

/** The statuses of the leaves TerminalRegion says it drew, in leaf order. */
function visibleLeafStatuses(): SessionStatus[] {
  const app = useApp.getState();
  const byId = new Map(app.sessions.map((session) => [session.id, session]));
  return app.visibleSessionIds.flatMap((id) => {
    const session = byId.get(id);
    return session === undefined ? [] : [effectiveStatusOf(session)];
  });
}

/**
 * Why the mode will not open, or null when it will.
 *
 * TWO GATES, and the second one exists because the first one was not enough.
 *
 * The first gate is the DOM query the flight itself uses to find its subject.
 * No `[data-surface-leaves]` node means there is nothing to photograph, which
 * is the single-session case: a restorable or ended session renders the quiet
 * Restore state instead, and a project with no sessions renders the empty
 * board, so neither carries the attribute.
 *
 * The second gate reads the store. A SPLIT GROUP writes the attribute from
 * TerminalRegion whatever its leaves are doing, and each ended leaf draws its
 * own Restore card inside the surface. Resting on the DOM alone therefore let
 * a group of four restorable sessions fill the window with four Restore cards
 * under an empty title band. Measured on 2026-08-18 before this gate existed.
 * So the leaves are read as well, and the mode refuses when every one of them
 * is waiting to be restored.
 *
 * Refusing in silence from a menu row is the one thing a menu row must never
 * do, so both answers are sentences the caller can put in a toast.
 */
export function focusRefusal(): string | null {
  if (document.querySelector(SURFACE_SELECTOR) === null) {
    const active = useApp.getState().activeSession();
    const status = active === null ? null : effectiveStatusOf(active);
    return status !== null && needsRestore(status)
      ? RESTORE_FIRST
      : NOTHING_TO_FOCUS;
  }
  return everyLeafNeedsRestore(visibleLeafStatuses()) ? RESTORE_FIRST : null;
}

// ---------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------

function rectOf(el: Element): FlightRect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/**
 * Where the surface will be once the swap has happened.
 *
 * The class is added and removed inside ONE task, so the browser never paints
 * the intermediate layout and the ResizeObserver in TerminalPane is never
 * notified. An observer compares the box at delivery time, and by then it is
 * back to the value it started at. `getBoundingClientRect` is what forces the
 * synchronous layout in between.
 *
 * Both directions share these three lines with the add and the remove
 * swapped, which is the reason the mode hides its chrome with a class rather
 * than with a memento.
 */
export function measureFocusRect(
  shell: HTMLElement,
  surface: Element,
  to: FlightDestination
): FlightRect {
  const wasFocused = shell.classList.contains(FOCUS_CLASS);
  if (to === 'focused') shell.classList.add(MEASURE_CLASS);
  else shell.classList.remove(FOCUS_CLASS);
  const rect = rectOf(surface);
  if (to === 'focused') shell.classList.remove(MEASURE_CLASS);
  else if (wasFocused) shell.classList.add(FOCUS_CLASS);
  return rect;
}

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

/**
 * Read at the moment the chord fires, never cached, because a person can turn
 * the setting on while the app is open.
 */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * The duration and curve, read from the tokens the chrome's own fade uses, so
 * the copy and the chrome cannot drift apart. The fallbacks are only reached
 * where there is no computed style to read, which is unit tests.
 */
export function flightTiming(): { ms: number; easing: string } {
  try {
    const styles = getComputedStyle(document.documentElement);
    const rawMs = styles.getPropertyValue('--dur-panel').trim();
    const parsed = Number.parseFloat(rawMs);
    const easing = styles.getPropertyValue('--ease-out').trim();
    return {
      ms: Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_MS,
      easing: easing.length > 0 ? easing : FALLBACK_EASING
    };
  } catch {
    return { ms: FALLBACK_MS, easing: FALLBACK_EASING };
  }
}

/** Drop the arrival attribute now, and cancel any removal already scheduled. */
function clearArrival(shell: HTMLElement | null): void {
  if (arriveTimer !== null) {
    clearTimeout(arriveTimer);
    arriveTimer = null;
  }
  if (shell !== null) shell.removeAttribute(ARRIVE_ATTR);
}

/**
 * Start the chrome's fade in, and schedule the class off again.
 *
 * The fade is a CSS animation rather than a transition on purpose. A
 * transition needs the browser to have already computed opacity 0 on a drawn
 * element, and the swap is a store write that React's scheduler flushes on
 * its own clock, so there is no frame this code can name where that is
 * guaranteed to be true. An animation starts when the element is first drawn,
 * whenever that is.
 */
function beginArrival(shell: HTMLElement, ms: number): void {
  clearArrival(shell);
  shell.setAttribute(ARRIVE_ATTR, '');
  arriveTimer = setTimeout(() => {
    arriveTimer = null;
    shell.removeAttribute(ARRIVE_ATTR);
  }, ms + 60);
}

function nextFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      setTimeout(() => {
        resolve();
      }, 16);
      return;
    }
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// The gesture
// ---------------------------------------------------------------------------

/**
 * Enter or leave, whichever the store says is next.
 *
 * Leaving never refuses. A mode you cannot get out of is the failure this
 * whole phase is built to avoid, so the only guard on the way out is the one
 * that stops two flights overlapping.
 */
export async function toggleSessionFocus(): Promise<void> {
  if (flying) return;
  if (useApp.getState().sessionFocus) {
    await leaveSessionFocus();
    return;
  }
  await enterSessionFocus();
}

/** Grow the session surface until it fills the window. */
export async function enterSessionFocus(): Promise<void> {
  if (flying) return;
  if (useApp.getState().sessionFocus) return;
  const refusal = focusRefusal();
  if (refusal !== null) {
    useApp.getState().toast('info', refusal);
    return;
  }
  await fly('focused');
}

/** Put every region back. */
export async function leaveSessionFocus(): Promise<void> {
  if (flying) return;
  if (!useApp.getState().sessionFocus) return;
  await fly('ordinary');
}

async function fly(to: FlightDestination): Promise<void> {
  const commit = (): void => {
    useApp.getState().setSessionFocus(to === 'focused');
  };
  const shell = document.querySelector<HTMLElement>(SHELL_SELECTOR);
  const surface = document.querySelector<HTMLElement>(SURFACE_SELECTOR);
  // A gesture arriving while the last one's fade in is still running takes
  // the attribute off first, so the two never fight over the chrome's
  // opacity.
  clearArrival(shell);
  // No shell and no surface means there is nothing to photograph. On the way
  // out that is still a state the person must be able to reach, so the mode
  // flips with no motion rather than refusing.
  if (shell === null || surface === null || prefersReducedMotion()) {
    commit();
    return;
  }

  flying = true;
  /** The photograph, once it is in the document. The tidy up is its guard. */
  let node: HTMLElement | null = null;
  try {
    const first = rectOf(surface);
    const last = measureFocusRect(shell, surface, to);

    let copy: StillCopy | null = null;
    try {
      copy = await buildStillCopy(surface, first, last);
    } catch {
      copy = null;
    }
    if (copy === null || typeof copy.node.animate !== 'function') {
      commit();
      return;
    }

    node = copy.node;
    document.body.appendChild(node);
    // `visibility` changes no border box, so this fires no ResizeObserver and
    // sends no resize. `display: none` here would send one per leaf.
    surface.style.visibility = 'hidden';
    shell.classList.add(FLIGHT_CLASS);

    const timing = flightTiming();
    const animation = node.animate(
      [{ transform: invertTransform(first, last) }, { transform: 'none' }],
      { duration: timing.ms, easing: timing.easing, fill: 'both' }
    );
    await animation.finished.catch(() => undefined);

    // THIS IS THE SWAP. React puts the class on the shell root, the chrome
    // regions become display:none, the surface reflows to `last`, and each
    // visible leaf gets exactly one ResizeObserver notification, one fit and
    // one sessions.resize.
    commit();

    // Leaving only. On the way in the chrome is already fading out under the
    // photograph. On the way out this is its only chance, because until this
    // line every region it names was not drawn at all.
    if (to === 'ordinary') beginArrival(shell, timing.ms);

    // The spec drops the flight class in the same task as the swap. It is
    // dropped one frame later here, because a store write outside a React
    // event is flushed by React's scheduler and is not guaranteed to reach
    // the DOM before the next paint. Waiting one frame means the chrome can
    // never be caught drawn at full opacity in the frame between the two.
    await nextFrame();
    shell.classList.remove(FLIGHT_CLASS);

    // A second frame, because the fit lands on the frame after the observer
    // fires. Holding the photograph across both is what stops the person
    // seeing the old column count stretched into the new box.
    await nextFrame();
  } finally {
    flying = false;
    // The tidy up lives here and nowhere else, so a throw anywhere above
    // cannot leave a photograph pinned over the app with the live surface
    // invisible underneath it. That state has no way out from the keyboard.
    if (node !== null) {
      shell.classList.remove(FLIGHT_CLASS);
      surface.style.visibility = '';
      node.remove();
    }
  }
}
