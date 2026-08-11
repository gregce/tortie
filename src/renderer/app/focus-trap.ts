/**
 * Minimal Tab-cycle focus trap for the modal layers (Phase 8 hardening).
 *
 * aria-modal="true" promises assistive tech that content behind the dialog
 * is inert — this makes the keyboard honor it: Tab from the last focusable
 * wraps to the first, Shift+Tab from the first wraps to the last, and a
 * dialog with no focusables swallows Tab entirely. Call from the modal
 * container's onKeyDown with the container element.
 */

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

export function trapTabKey(
  e: { key: string; shiftKey: boolean; preventDefault(): void },
  container: HTMLElement
): void {
  if (e.key !== 'Tab') return;
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((el) => el.offsetParent !== null); // skip display:none subtrees
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (first === undefined || last === undefined) {
    e.preventDefault(); // nothing to move to — never escape the layer
    return;
  }
  const active = document.activeElement;
  const inside = active instanceof HTMLElement && container.contains(active);
  if (e.shiftKey) {
    if (!inside || active === first) {
      e.preventDefault();
      last.focus();
    }
  } else if (!inside || active === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * The whole keyboard contract of a gmux form modal, in one call: Tab cycles
 * inside the dialog, Return submits, Escape closes.
 *
 * Extracted at the Phase 12.9/12.10 integration, because "New project"
 * arrived as a verbatim copy of "New session" (CLAUDE.md's dup-scan
 * guardrail). Two of these four lines are the kind that go missing in the
 * NEXT copy and are never noticed until someone hits a key:
 *  - Return on a focused BUTTON must run that button's own activation, or
 *    [Cancel] / [Choose…] silently submit the form instead of doing their job;
 *  - `isComposing` guards the IME — Return committing a Japanese candidate is
 *    not Return submitting the dialog;
 *  - Escape is stopped from propagating so it closes the dialog and nothing
 *    behind it.
 */
export function modalKeyDown(
  e: {
    key: string;
    shiftKey: boolean;
    target: EventTarget | null;
    nativeEvent: { isComposing: boolean };
    preventDefault(): void;
    stopPropagation(): void;
  },
  container: HTMLElement,
  handlers: { submit: () => void; close: () => void }
): void {
  trapTabKey(e, container);
  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
    if (e.target instanceof HTMLElement && e.target.tagName === 'BUTTON') {
      return;
    }
    e.preventDefault();
    handlers.submit();
  }
  if (e.key === 'Escape') {
    e.stopPropagation();
    handlers.close();
  }
}
