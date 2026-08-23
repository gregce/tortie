/**
 * The session level's keyboard, and the ask rail's share of it (Phase 137.2).
 *
 * OverviewLayer calls handleSessionLevelKey FIRST when the page is at the
 * session level. True means the key was consumed here and the layer's own
 * branches must not run. False means the layer proceeds exactly as it did
 * before this phase, so the arrows keep moving the selection and Return
 * keeps jumping to the session.
 *
 * The rail's activation is a module flag rather than DOM focus on purpose.
 * The keyboard stays on the layer div the whole time, no element inside the
 * rail is focusable, and nothing here ever calls focus(). Those are the
 * hover and focus rules ProjectRail.tsx states, applied to keys.
 *
 * Escape is special. The window's capture phase ladder in
 * ../app/keyboard.ts runs before any handler on the layer, so the ladder
 * asks askRailTookEscape() first. True means the rail was active and this
 * press only deactivated it, so the ladder must not tear the page down for
 * the same press.
 */

export interface RailSnapshot {
  /** True while the keyboard is in the rail. */
  active: boolean;
  /** The rail row the keyboard is on, by position in the turns list. */
  cursor: number;
}

/**
 * What the rail needs from the mounted conversation. SessionConversation
 * registers this while it is on screen and clears it on unmount, so a key
 * that arrives with no conversation mounted falls through untouched.
 */
export interface ConversationHooks {
  /** The conversation's own scroller, the element with .overview-scroll. */
  scroller: HTMLElement | null;
  /** How many turns the rail and the conversation draw. */
  turnCount: number;
  /** The selection the store holds right now. */
  selected(): number;
  /** The one writer of the selection, the layer's own setter. */
  select(index: number): void;
}

let hooks: ConversationHooks | null = null;
let snapshot: RailSnapshot = { active: false, cursor: 0 };
const listeners = new Set<() => void>();

function publish(active: boolean, cursor: number): void {
  snapshot = { active, cursor };
  for (const listener of listeners) listener();
}

/** For useSyncExternalStore in AskRail.tsx. */
export function subscribeRail(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The stable snapshot useSyncExternalStore reads. */
export function railSnapshot(): RailSnapshot {
  return snapshot;
}

/**
 * SessionConversation's registration. Null on unmount. Registering a
 * different session, or losing the conversation, puts the keyboard back in
 * the conversation so a stale rail cursor cannot outlive its rows.
 */
export function registerConversation(next: ConversationHooks | null): void {
  hooks = next;
  const count = next?.turnCount ?? 0;
  if (snapshot.active === false && snapshot.cursor === 0) return;
  if (next === null || count === 0 || snapshot.cursor >= count) {
    publish(false, 0);
  }
}

function clamp(index: number, count: number): number {
  return Math.min(count - 1, Math.max(0, index));
}

/**
 * True when the rail is in the tree but not on screen, which is the narrow
 * window where the stylesheet collapses it. Tab must fall through then,
 * because activating a rail the person cannot see would swallow the
 * keyboard. No rail element at all answers false and leaves the decision to
 * the turn count, which also covers the unit tests' bare Node environment.
 */
function railHidden(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.querySelector('.overview-ask-rail');
  return el !== null && el.getClientRects().length === 0;
}

/**
 * The ONE landing function. Both callers, a press on a rail row and Return
 * inside the rail, come through jumpToAsk below, and the tracking scroll in
 * SessionConversation uses this same function, so the pointer and the
 * keyboard cannot land differently.
 */
export function scrollTurnIntoView(
  container: HTMLElement,
  index: number
): void {
  const rows = container.querySelectorAll('.overview-turn');
  rows[index]?.scrollIntoView({ block: 'nearest' });
}

/**
 * Land on one exchange. Selects the turn and scrolls the conversation so
 * that exchange is on screen. The page stays open, and the rail cursor
 * follows so a jump and the next arrow press agree on where the keyboard is.
 */
export function jumpToAsk(index: number): void {
  const h = hooks;
  if (h === null || h.turnCount === 0) return;
  const target = clamp(index, h.turnCount);
  h.select(target);
  if (h.scroller !== null) scrollTurnIntoView(h.scroller, target);
  if (snapshot.active || snapshot.cursor !== target) {
    publish(snapshot.active, target);
  }
}

/**
 * The session level's keys, called by OverviewLayer before its own
 * branches. Tab moves the keyboard into the rail and back. Inside the rail
 * the arrows move the rail cursor, Return jumps through jumpToAsk, and
 * Escape returns the keyboard to the conversation. Outside the rail nothing
 * is consumed, so the layer's existing arrows and Return keep their
 * meaning.
 */
export function handleSessionLevelKey(e: {
  key: string;
  preventDefault(): void;
  stopPropagation(): void;
}): boolean {
  const h = hooks;
  if (h === null || h.turnCount === 0) return false;

  if (!snapshot.active) {
    if (e.key === 'Tab' && !railHidden()) {
      e.preventDefault();
      e.stopPropagation();
      publish(true, clamp(h.selected(), h.turnCount));
      return true;
    }
    return false;
  }

  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.key === 'ArrowDown' ? 1 : -1;
    publish(true, clamp(snapshot.cursor + delta, h.turnCount));
    return true;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    jumpToAsk(snapshot.cursor);
    return true;
  }
  if (e.key === 'Tab' || e.key === 'Escape') {
    // Escape normally arrives through the window ladder and lands in
    // askRailTookEscape below. This branch keeps the answer right if a
    // build ever lets the key reach the layer directly.
    e.preventDefault();
    e.stopPropagation();
    publish(false, snapshot.cursor);
    return true;
  }
  return false;
}

/**
 * Asked by the Escape ladder in ../app/keyboard.ts before it closes or
 * steps the page back. True exactly when the rail was active and this press
 * deactivated it.
 */
export function askRailTookEscape(): boolean {
  if (!snapshot.active) return false;
  publish(false, snapshot.cursor);
  return true;
}
