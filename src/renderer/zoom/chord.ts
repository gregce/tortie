/**
 * Reading a zoom chord off a keystroke.
 *
 * `event.code`, not `event.key`: on a US layout ⌘+ is physically ⌘⇧= and the
 * character it produces changes with the keyboard layout, so `Equal` /
 * `Minus` / `Digit0` are the only stable identities. The numeric keypad has
 * its own codes and is accepted too — an external keyboard's ⌘- is a real
 * gesture. Phase 12.10's image viewer learned the same lesson; this is the
 * shared version of that rule.
 *
 * Split out from keys.ts so the decision table is testable in a plain Node
 * environment: keys.ts reaches the app store, which needs a window.
 */

export type ZoomVerb = 'in' | 'out' | 'reset' | 'reset-all';

/** The chord, or null when this keystroke is not a zoom gesture. */
export function zoomVerbFor(event: KeyboardEvent): ZoomVerb | null {
  if (!event.metaKey || event.ctrlKey || event.altKey) return null;
  switch (event.code) {
    case 'Equal':
    case 'NumpadAdd':
      return 'in';
    case 'Minus':
    case 'NumpadSubtract':
      return 'out';
    case 'Digit0':
    case 'Numpad0':
      return event.shiftKey ? 'reset-all' : 'reset';
    default:
      // Layouts where '+' / '-' are not on Equal/Minus still work: the
      // produced character is a fallback, never the primary identity.
      if (event.key === '+' || event.key === '=') return 'in';
      if (event.key === '-' || event.key === '_') return 'out';
      return null;
  }
}
