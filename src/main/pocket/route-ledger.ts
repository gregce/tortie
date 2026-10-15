/**
 * THE ROUTE LEDGER (Phase 333.12, build/p33312/SPEC.md D12): one row for every
 * route id that was ever in a committed build of the door, and what that id
 * MEANS.
 *
 * ## Why it exists
 *
 * Since Phase 333.12 a person's agreement names the routes they ALLOWED
 * (`allowedRoutes` in the sealed store, `./allowed-routes.ts`), and an update
 * keeps answering them without asking again. That is only honest while an id
 * keeps the meaning it had when it was allowed. So an id's row here IS its
 * meaning: the method, the path, whether it reads, whether it is signed,
 * whether it is alive only inside a pairing window, its body cap, and the
 * clause the Allow line says for it.
 *
 * ## The rules, and they are the whole of the file
 *
 *   - One row per id ever in a committed build. NEVER EDITED, NEVER REMOVED,
 *     ONLY APPENDED. A route whose method, path, signing, window, cap or clause
 *     must change takes a NEW id, which waits for its own Allow.
 *   - Every value is a literal: no import, no computed value, no spread. A row
 *     that read the live table would move with it, which is what this file
 *     exists to stop.
 *   - It imports nothing.
 *
 * `conformance:pocket` AR9 holds the live table (`./door/table.ts`), the door's
 * caps (`./door/limits.ts`, `./door/wire.ts`) and the Allow clauses
 * (`./pairing.ts`'s `WRITE_CLAUSES`) to it; `gate:onlyadd` R8 holds it add only
 * against every committed copy of itself and every frozen route set. An id
 * listed here that a later build no longer has stays allowed and hashed and is
 * simply not served: a removed route needs no prompt.
 *
 * ## Before a phase removes one of the first eleven
 *
 * Stated by Phase 333.12's fix round (lens 2), because nothing in this phase
 * reaches it: `allowedRoutesOf` reads a stored list as whole only while it
 * holds every `LEGACY_ALLOWED_ROUTES` id, and a FIRST Allow (no record) agrees
 * to this build's table alone (`proposedRoutes`). While the table holds all
 * eleven the two agree. On a build whose table has dropped one of them, a
 * first Allow would store a list without it, the store would read that back
 * as not whole (the eleven), the record would no longer match, and the door
 * would read `changed` until a second Allow: never wider, but switched off.
 * That phase makes the no-record proposal the legacy ids with the build's, or
 * drops the legacy clause from `allowedRoutesOf`, and drives it in a test.
 */

/** What one route id means, for as long as there is a Tortie that knows it. */
export interface PocketLedgerRow {
  readonly id: string;
  readonly method: 'GET' | 'POST';
  readonly path: string;
  /** True when answering it changes nothing on the Mac. */
  readonly reads: boolean;
  readonly signed: boolean;
  readonly windowOnly: boolean;
  /** The most bytes of body the door reads for it. */
  readonly bodyCap: number;
  /** What the Allow line says it lets a phone do, or null for a read. */
  readonly clause: string | null;
}

/** Every route id ever in a committed build, in the table's order. Append only. */
export const POCKET_ROUTE_LEDGER: readonly PocketLedgerRow[] = Object.freeze([
  { id: 'pair', method: 'POST', path: '/pair', reads: true, signed: false, windowOnly: true, bodyCap: 4096, clause: null },
  { id: 'blocked', method: 'GET', path: '/v1/blocked', reads: true, signed: true, windowOnly: false, bodyCap: 1024, clause: null },
  { id: 'session', method: 'GET', path: '/v1/session', reads: true, signed: true, windowOnly: false, bodyCap: 1024, clause: null },
  { id: 'turns', method: 'GET', path: '/v1/turns', reads: true, signed: true, windowOnly: false, bodyCap: 1024, clause: null },
  { id: 'sessions', method: 'GET', path: '/v1/sessions', reads: true, signed: true, windowOnly: false, bodyCap: 1024, clause: null },
  { id: 'screen', method: 'GET', path: '/v1/screen', reads: true, signed: true, windowOnly: false, bodyCap: 1024, clause: null },
  { id: 'scrollback', method: 'GET', path: '/v1/scrollback', reads: true, signed: true, windowOnly: false, bodyCap: 1024, clause: null },
  { id: 'end', method: 'POST', path: '/v1/end', reads: false, signed: true, windowOnly: false, bodyCap: 512, clause: 'end a session' },
  { id: 'choose', method: 'POST', path: '/v1/choose', reads: false, signed: true, windowOnly: false, bodyCap: 512, clause: 'answer a numbered question' },
  { id: 'say', method: 'POST', path: '/v1/say', reads: false, signed: true, windowOnly: false, bodyCap: 32768, clause: 'send a session one message' },
  { id: 'keys', method: 'POST', path: '/v1/keys', reads: false, signed: true, windowOnly: false, bodyCap: 16384, clause: 'type into any session as you would at this Mac' }
]);

/** The ledger's ids: every id an allowed set may name. */
export const POCKET_LEDGER_IDS: ReadonlySet<string> = new Set(POCKET_ROUTE_LEDGER.map((r) => r.id));
