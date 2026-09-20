/**
 * S10 — Toasts: bottom-right, max 3 visible (older collapse to "+n"),
 * info/success auto-dismiss 5s, errors sticky with ×.
 *
 * PHASE 93 gave a sticky toast its own class, and the reason is measured. The
 * text is clamped to two lines. The refusals this phase writes are two
 * sentences, because the second sentence is the one saying the session is
 * still running and was not ended. MEASURED live on 2026-08-19 at the panel's
 * 360 px width: a 197 character refusal filled 5 lines of 20 px and the box
 * showed 40 px of them, so the half that matters was not on screen at all.
 * A toast that goes away by itself is still clamped to two lines, because a
 * person cannot scroll something that leaves in five seconds. A sticky one
 * stays until it is dismissed, so it is allowed six.
 *
 * PHASE 298, rough edge 1 — THE ONE PLACE A TOAST IS DOCKED RATHER THAN
 * FLOATED. `.toasts` is fixed bottom-right at `--z-toast` 700, and the session
 * manager sheet draws at `--z-modal` 500 with only 24px of bottom gutter under
 * it, so a toast lands ON the sheet. Measured: one toast overlaps the sheet's
 * bottom 36px, two overlap 88px, three overlap 140px, and at 1512 logical px
 * the stack covers the sheet's rightmost 210px while the End/Restore column is
 * 190px plus its cell padding. So with TWO toasts up the last row's End button
 * is under a toast and the click lands on the toast, which `SessionManagerSheet`
 * already admitted in a comment. DESIGN-SPEC S15 says nothing is ever stacked
 * on the sheet, and this was the one thing that still was.
 *
 * So while the sheet is open the stack is PORTALLED into a strip the sheet
 * renders itself, `[data-sm="toast-outlet"]`, which sits between the scroller
 * and the footer as a `flex: 0 0 auto` row. The strip takes its height from the
 * scroller rather than from the rows, so a docked toast covers nothing. With no
 * outlet in the document — every other surface in the app, the boot-block mount,
 * and the frames before the sheet's lazy chunk lands — this draws EXACTLY where
 * it drew before: same element, same `toasts` class, same `role`/`aria-live`,
 * same three-visible and `+n more` rule, same order.
 *
 * `pointer-events: none` WAS REFUSED as the fix, and the second reason is the
 * load-bearing one. It would break the pause-on-hover promise DESIGN-SPEC S10
 * makes; and a sticky toast's only two exits are the × and the action button
 * below, while the store's auto-dismiss (`state/notices-slice.ts`) never fires
 * for a sticky one, so with pointer events off an error toast would be
 * undismissable for the life of the window.
 *
 * WHY THE SEAM IS A DOM ATTRIBUTE AND NOT A SHARED REF. A ref would need a
 * module that both this file and the session-manager domain import, and an
 * eager import from `app` into that domain pulls the lazily loaded sheet
 * (`session-manager/lazy.tsx`) into the entry chunk, which is the whole point
 * of that door. The store bit `sessionSheet !== null` is already there, so this
 * adds no state, no prop and no channel.
 *
 * WHY A MutationObserver AND NOT ONE QUERY. The sheet is behind a lazy door, so
 * on the FIRST open `sessionSheet` is non-null for at least one commit in which
 * the sheet still renders null and the outlet is not in the document yet. When
 * the chunk lands the door bumps ITS OWN render, which never re-renders this
 * component, so a single query keyed on the store bit would miss the outlet on
 * every first open and dock nothing. The observer is armed only while the sheet
 * is open AND the outlet is still absent, and disconnects the moment it finds
 * it — one short window per launch, and it is disconnected in the effect's
 * cleanup whatever happened.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../state/store';
import { Codicon } from '../icons';

/* Codicon ids per toast kind (round 1 — codicons carry all UI chrome). */
const ICONS = {
  info: 'info',
  success: 'pass',
  error: 'error'
} as const;

/**
 * The session sheet's docking strip. The sheet renders it unconditionally while
 * it is drawn, so this host never races the sheet's own mount — it either finds
 * the strip or watches for it.
 */
const OUTLET = '[data-sm="toast-outlet"]';

export function Toasts(): React.JSX.Element | null {
  const toasts = useApp((s) => s.toasts);
  const dismissToast = useApp((s) => s.dismissToast);
  /* The store's own bit, spelled `!== null` exactly as the lazy door, the layer
     predicate and the Escape rung spell it. */
  const sheetOpen = useApp((s) => s.sessionSheet !== null);
  const [outlet, setOutlet] = React.useState<Element | null>(null);

  /* EVERY HOOK IS ABOVE THE EARLY RETURN BELOW. A hook after it would make the
     render that has toasts have one more hook than the render that has none,
     which is React #310. */
  React.useLayoutEffect(() => {
    if (!sheetOpen) {
      setOutlet((prev) => (prev === null ? prev : null));
      return undefined;
    }
    const here = document.querySelector(OUTLET);
    if (here !== null) {
      setOutlet((prev) => (prev === here ? prev : here));
      return undefined;
    }
    /* The sheet is open but its chunk has not drawn yet. Draw floated for now
       and adopt the strip the moment it appears. */
    setOutlet((prev) => (prev === null ? prev : null));
    const watch = new MutationObserver(() => {
      const late = document.querySelector(OUTLET);
      if (late === null) return;
      watch.disconnect();
      setOutlet(late);
    });
    watch.observe(document.body, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, [sheetOpen]);

  if (toasts.length === 0) return null;

  const visible = toasts.slice(-3);
  const hidden = toasts.length - visible.length;
  /* ONE value answers both questions, so the class and the portal can never
     disagree: non-null means docked AND names the node to draw into. Both halves
     of it matter. `sheetOpen` alone would portal into a strip the closing sheet
     has already taken out of the document; the resolved `outlet` alone would
     keep portalling into a detached node for the one render after the sheet
     closed, because the effect that clears it runs after that render. */
  const dock = sheetOpen ? outlet : null;

  const stack = (
    <div
      className={`toasts${dock === null ? '' : ' toasts-docked'}`}
      role="status"
      aria-live="polite"
    >
      {hidden > 0 ? (
        <div className="toast-overflow num">+{hidden} more</div>
      ) : null}
      {visible.map((toast) => {
        const sticky = toast.sticky ?? toast.kind === 'error';
        return (
          <div key={toast.id} className={`toast${sticky ? ' toast-sticky' : ''}`}>
            <span className={`toast-icon ${toast.kind}`}>
              <Codicon name={ICONS[toast.kind]} size="lg" />
            </span>
            <span className="toast-text">{toast.text}</span>
            {toast.action ? (
              <button
                type="button"
                className="btn-text"
                onClick={() => {
                  toast.action?.run();
                  dismissToast(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
            {sticky ? (
              <button
                type="button"
                className="icon-btn"
                aria-label="Dismiss"
                onClick={() => dismissToast(toast.id)}
              >
                <Codicon name="close" size="md" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  return dock === null ? stack : createPortal(stack, dock);
}
