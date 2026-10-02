/**
 * PHASE 334. WHERE EACH REDLINE TAB WAS LEFT, so coming back to it opens there.
 *
 * ./RedlineDocument is mounted once for whichever tab is active, with no key
 * (EditorPanel.tsx), so two Redline tabs share one scroller element and a
 * return from another mode builds it again at the top. This map is the place
 * each tab had, as a pixel offset, keyed by tab id. The view saves on its own
 * scroll event and restores once the document is drawn; ./store forgets a tab
 * at the three sites its Monaco view state is dropped, and a rename in the
 * tree carries it to the new id (../tree/editor-follow.ts).
 *
 * In memory only: nothing survives a relaunch or a close, and nothing here is
 * stored anywhere. It is a redline file by name, so `conformance:redline` rule
 * 9 reads it, and it reaches no bridge and names no write.
 */

const places = new Map<string, number>();

/** Remember `top` for `tabId`. A non-finite offset is ignored; a negative one is 0. */
export function rememberRedlineScroll(tabId: string, top: number): void {
  if (!Number.isFinite(top)) return;
  places.set(tabId, Math.max(0, top));
}

/** The offset `tabId` was left at, or undefined when none is remembered. */
export function redlineScrollOf(tabId: string): number | undefined {
  return places.get(tabId);
}

/** The tab is gone: its place goes with it. */
export function forgetRedlineScroll(tabId: string): void {
  places.delete(tabId);
}

/** Carry a tab's place to its new id; an absent source clears the destination. */
export function rekeyRedlineScroll(fromId: string, toId: string): void {
  // The destination is written before the source is cleared, so onto itself
  // the second step would erase the first: the guard is what keeps it.
  if (fromId === toId) return;
  const top = places.get(fromId);
  if (top === undefined) places.delete(toId);
  else places.set(toId, top);
  places.delete(fromId);
}
