/**
 * The routes a person ALLOWED, and the three sets the door reads from them
 * (Phase 333.12, build/p33312/SPEC.md §4.1, D1, D2, D5, D6).
 *
 * ## Three sets, never confused
 *
 *   - ALLOWED: the routes a person agreed to. The sealed store's
 *     `allowedRoutes` when it reads back whole, else the eleven every 0.111.x
 *     Mac answered (`LEGACY_ALLOWED_ROUTES`). It is the `routes` of the door's
 *     hashed fields, so the record a person confirmed is checked against what
 *     they allowed and never against what this build happens to answer: the
 *     update that adds a route moves no hash and switches no phone off.
 *   - PROPOSAL: what the next door Allow agrees to. With no record, this
 *     build's whole table (a first Allow allows every route); otherwise the
 *     allowed set with this build's routes added. The sheet draws its lines.
 *   - SERVED: this build's routes that are allowed, in the table's order. The
 *     door answers exactly these; a route of this build that is not allowed
 *     WAITS, answered `404 route` as an older Mac answers it.
 *
 * PURE: no `fs`, no `electron`, no clock. The store's reader hands
 * {@link allowedRoutesOf} what it opened; `./ipc.ts` composes the rest.
 */

import { LEGACY_ALLOWED_ROUTES, type PocketRouteId } from '@shared/ipc/pocket';
import { POCKET_LEDGER_IDS, POCKET_ROUTE_LEDGER } from './route-ledger';

/**
 * D2: the stored list, WHOLE, sorted and frozen, or null.
 *
 * Whole means an array of one to the ledger's length of distinct strings, each
 * an id of the route ledger, holding every legacy id. Anything else reads as
 * null, never partly: CLAUDE.md's rule that an invalid row is dropped whole,
 * and a partly kept list would hash to a set nobody confirmed. An id the ledger
 * lists that this build's table no longer has IS whole: it stays allowed and
 * hashed, and is not served.
 */
export function allowedRoutesOf(raw: unknown): readonly string[] | null {
  if (!Array.isArray(raw)) return null;
  const list: readonly unknown[] = raw;
  if (list.length === 0) return null;
  if (list.length > POCKET_ROUTE_LEDGER.length) return null;
  const seen = new Set<string>();
  for (const id of list) {
    if (typeof id !== 'string') return null;
    if (seen.has(id)) return null;
    if (!POCKET_LEDGER_IDS.has(id)) return null;
    seen.add(id);
  }
  for (const id of LEGACY_ALLOWED_ROUTES) {
    if (!seen.has(id)) return null;
  }
  return Object.freeze([...seen].sort());
}

/** D1: the allowed set: the stored list, or the eleven. */
export function allowedRoutesFor(stored: readonly string[] | null): readonly string[] {
  return stored ?? LEGACY_ALLOWED_ROUTES;
}

/** D5: with no record the build's table; otherwise allowed ∪ build; sorted. */
export function proposedRoutes(
  allowed: readonly string[],
  build: readonly PocketRouteId[],
  onRecord: boolean
): readonly string[] {
  if (!onRecord) return Object.freeze([...build].sort());
  return Object.freeze([...new Set<string>([...allowed, ...build])].sort());
}

/** D6: the build's ids that are allowed, in the build's order. */
export function servedRoutesOf(allowed: readonly string[], build: readonly PocketRouteId[]): readonly PocketRouteId[] {
  return Object.freeze(build.filter((id) => allowed.includes(id)));
}

/** D6: the build's ids that are not, only on record; else []. */
export function waitingRoutesOf(
  allowed: readonly string[],
  build: readonly PocketRouteId[],
  onRecord: boolean
): readonly PocketRouteId[] {
  if (!onRecord) return Object.freeze([]);
  return Object.freeze(build.filter((id) => !allowed.includes(id)));
}
