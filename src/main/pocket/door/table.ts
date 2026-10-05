/**
 * The closed route table (Phase 313), MOVED HERE BYTE FOR BYTE by Phase 330
 * (build/p330/SPEC.md §4.6) so the door process can refuse a path that is not
 * a route before main is told anything. `../routes.ts` re-exports all three
 * names, so no importer moved, and `conformance:pocket` R1 and R4 read the
 * table here. R4's membership sha256 did not move then; Phase 317 moved it on
 * purpose by the `end` row below, Phase 318 by its `choose` and `say` rows, and
 * Phase 316.7 by the read row `sessions` (build/p3167/SPEC.md §3 row 1).
 *
 * ## Closed means closed
 *
 * {@link POCKET_ROUTES} is every route this door has. There is no default, no
 * wildcard, no prefix match and no fall-through: {@link matchPocketRoute}
 * compares a method and a path for EQUALITY against this list and answers null
 * for everything else. A path that is not in the list does not exist, and the
 * door refuses it before it reads a byte of body.
 *
 * It imports one TYPE from the contract and nothing else, because the door
 * process may import nothing but Node's `net`, `tls`, `http` and `crypto`,
 * `src/shared/` and `./` (`conformance:pocket` W2).
 */

import type { PocketRouteId } from '@shared/ipc/pocket';

export interface PocketRoute {
  readonly id: PocketRouteId;
  readonly method: 'GET' | 'POST';
  /** The exact path. No parameter, no prefix, no wildcard. */
  readonly path: string;
  /**
   * True when answering this route changes nothing on this Mac.
   *
   * A ROW WITH `reads: false` IS A WRITE, AND THE SET OF WRITES IS CLOSED
   * (Phase 317, build/p317/SPEC.md §5.3.1; Phase 318, build/p318/SPEC.md
   * §5.1.1): exactly `end`, `choose` and `say`, each a `POST` that is signed,
   * alive outside any window, takes no query string and has its own body cap
   * (`./limits.ts`). `build/conformance-pocket.mjs` R2 and X1 read it. The field is what makes adding a write a visible edit to this
   * table rather than a quiet change inside a handler, and a write's body is
   * parsed in main by `../writes.ts` alone, never here.
   */
  readonly reads: boolean;
  /** Alive only inside a pairing window a person opened. */
  readonly windowOnly: boolean;
  /** Whether the request must carry a signature from an allowed phone. */
  readonly signed: boolean;
}

/**
 * Every route this door has.
 *
 * IT IS FROZEN, and that is not decoration. A closed table a later round can
 * `push` onto at run time is not a closed table, and "the route table is closed"
 * is one of this phase's promises rather than one of its comments. The freeze is
 * what makes the promise hold against code nobody has written yet.
 *
 * `pair` is the one route that is not signed, because a phone that has not
 * paired yet has no key to sign with. It is sealed instead, under a key derived
 * from the one-shot secret in the QR, and it is dead outside the window — so
 * for almost all of the door's life it is not a route at all.
 *
 * `sessions` is the Sessions tab's read (Phase 316.7, build/p3167/SPEC.md
 * §6.2): a signed `GET` whose query names what to show and how, and nothing a
 * person typed (D3, D14).
 *
 * `end` is the first write (Phase 317, build/p317/SPEC.md §5.3.1): a signed
 * `POST` alive outside any window. The session id rides in the signed BODY,
 * never in the path or a query, so the table stays a set of exact strings and
 * the signature covers everything the write says.
 *
 * `choose` and `say` are the reply's two writes (Phase 318, build/p318/SPEC.md
 * §5.1.1, D1), in the same shape and to the same one write path in main
 * (`../writes.ts`) and its ledger: a press on a numbered question main
 * offered, and one message. Their bodies, the question id and the words
 * included, ride in the signed body too.
 */
export const POCKET_ROUTES: readonly PocketRoute[] = Object.freeze([
  { id: 'pair', method: 'POST', path: '/pair', reads: true, windowOnly: true, signed: false },
  { id: 'blocked', method: 'GET', path: '/v1/blocked', reads: true, windowOnly: false, signed: true },
  { id: 'session', method: 'GET', path: '/v1/session', reads: true, windowOnly: false, signed: true },
  { id: 'turns', method: 'GET', path: '/v1/turns', reads: true, windowOnly: false, signed: true },
  { id: 'sessions', method: 'GET', path: '/v1/sessions', reads: true, windowOnly: false, signed: true },
  { id: 'end', method: 'POST', path: '/v1/end', reads: false, windowOnly: false, signed: true },
  { id: 'choose', method: 'POST', path: '/v1/choose', reads: false, windowOnly: false, signed: true },
  { id: 'say', method: 'POST', path: '/v1/say', reads: false, windowOnly: false, signed: true }
]);

/**
 * The route for this method and path, or null.
 *
 * Equality on both, and nothing else. A trailing slash, a different case, a
 * path that merely starts with one of these, or any method the table does not
 * name for that path, all answer null.
 */
export function matchPocketRoute(method: string, pathname: string): PocketRoute | null {
  for (const route of POCKET_ROUTES) {
    if (route.method === method && route.path === pathname) return route;
  }
  return null;
}
