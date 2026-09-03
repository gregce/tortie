/**
 * Whether a number is an instant a `Date` can hold (Phase 188.1, extracted in
 * Phase 206).
 *
 * ## THE DEFECT THIS ANSWERS
 *
 * A manifest row's `createdAt` and `lastSeen` are declared `INTEGER NOT NULL`
 * and SQLite still hands back whatever text a hand edit put there, so the
 * declared `number` is a promise the file cannot keep. Past either end of the
 * range `new Date(...).toISOString()` throws a `RangeError` rather than
 * answering, and a throw inside a read that draws a whole surface takes the
 * surface down rather than one row.
 *
 * ## WHY IT IS A FUNCTION AT EVERY EXPOSED CALL AND NOT A REPAIR AT THE SOURCE
 *
 * Phase 188.1 considered putting the check in `rowToRecord` and refused,
 * because that would make `createdAt` and `lastSeen` stop being numbers across
 * the shared session projection, restore, reconstruct, remote harvest and
 * every renderer that sorts on them. That reasoning still holds and Phase 206
 * did not reverse it. So each caller that hands one of these numbers to `Date`
 * asks this first, and each one answers in the way its own surface should.
 *
 * IT IS NOT A CLAMP AND IT IS NOT A REPAIR. Nothing is guessed and nothing is
 * written back.
 *
 * THE TWO TERMS CANNOT BE REORDERED. `Math.abs` of a BigInt throws a
 * TypeError, and a driver can hand one back for an INTEGER column too wide for
 * a double, so `Number.isFinite` must stay first: it answers false for a
 * BigInt and the `&&` never reaches the call that would throw. It is the type
 * check as well as the range check, because it answers false for anything that
 * is not a number at all.
 */

/**
 * The largest instant a `Date` can hold, and its negative is the smallest.
 * ECMA-262's own number, not a guess.
 */
export const MAX_TIME_MS = 8.64e15;

/** True when `new Date(value)` will answer rather than throw. */
export function isRenderableInstant(value: unknown): value is number {
  return Number.isFinite(value) && Math.abs(value as number) <= MAX_TIME_MS;
}
