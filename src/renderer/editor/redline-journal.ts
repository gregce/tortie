/**
 * The rewind undo journal (Phase 227), per tab and in memory only.
 *
 * Research 83 E.8 measured that after a rewind the rewound bytes exist in no
 * file, no baseline and no redline, and the view cannot undo itself; A3.4
 * measured that Monaco's own undo stack is cleared by the reload this feature
 * rides on. A8a made the journal a guard rather than a nicety: by the
 * operator's ruling a person's own uncommitted paragraph carries the same
 * rewind control as an agent's edit, so pressing it is an ordinary act, and
 * the journal is the only way back.
 *
 * It is a stack per tab of `(baseline offset, deleted, inserted, generation)`,
 * tens of bytes each. Undo pops the last and writes it back in the other
 * direction through the one call site (./redline-write), with the same
 * generation guard: the generation is stored so that an undo after a commit or
 * a branch switch, which moved the baseline, refuses rather than writing at a
 * stale offset. It names no bridge and writes nothing, so it is scanned by
 * `npm run conformance:redline` rule 9 with the other redline modules.
 *
 * It lives as long as the TAB, and no longer. It dies on reload, quit or
 * crash, and the face says so.
 *
 * ## PHASE 244, AND THE SENTENCE THIS PARAGRAPH REPLACES WAS WRONG
 *
 * This header used to say the journal is "keyed by tab id, which is unique per
 * open, so a closed and reopened file gets a fresh journal". The 8 September
 * 0.101.0 audit's finding F1 disproved it. `tab-identity.ts` keys an ordinary
 * local tab by its ABSOLUTE PATH, so the id of the second opening of a file is
 * the id of the first, and nothing anywhere called `forgetRewindJournal`: it
 * had zero production call sites and its own comment said "Exported for tests
 * and a future close."
 *
 * What that cost is bytes rather than tidiness, driven at the parent over a
 * scratch file through the shipping chain (docs/research/108): a file was
 * opened, an agent's phrase rewound, the tab CLOSED, the same file reopened,
 * and one press of undo in that new opening — in which nothing had ever been
 * rewound — wrote the previous opening's inserted text back into the person's
 * file, `brown` becoming `red` again, 44 bytes to 42. The face offered it,
 * because `undoableRewind` compares the entry's generation with the tab's and a
 * tab's baseline generation is a property of the TAB OBJECT: `NO_BASELINE` is
 * 0 and the first successful read seeds 1, so both openings read 1 and the
 * comparison passes. **That guard reads as protecting this and does not**, and
 * a later round must not lean on it.
 *
 * So ownership ends where the tab ends. `store.ts` calls
 * {@link forgetRewindJournal} at all three places a tab leaves `tabs`, beside
 * the `disposeModels` and `dropViewState` calls that were already there: real
 * close, preview replacement and LRU eviction. It is NOT cleared on React
 * unmount, because an ordinary switch between still-open tabs unmounts the view
 * and must keep the undo; that was the reason the old sentence gave for
 * sweeping nothing, and it is still the right reason not to sweep THERE.
 * Cancelling a dirty close keeps the tab, so it keeps the journal.
 *
 * Cross-close recovery is NOT offered. It would need an identity that survives
 * a close and a retention contract to go with it, and neither exists; a person
 * who closes a tab has ended that undo.
 *
 * ## THE RETENTION IS BOUNDED (Phase 244)
 *
 * The audit also recorded that an entry holds the deleted and the inserted
 * STRINGS with no entry or byte ceiling anywhere in this file. There is one
 * now, per tab: {@link JOURNAL_MAX_ENTRIES} and {@link JOURNAL_MAX_BYTES} over
 * the `del` and `ins` text. Past either, the OLDEST entries go, which is what
 * every bounded undo stack chooses: a full journal loses its deepest undo and
 * never the one the person is about to press.
 */

/** One rewind, enough to write its inverse and to guard the write. */
export interface RewindJournalEntry {
  /** The baseline offset the change sat at. */
  off: number;
  /** The text the rewind put back (the baseline's bytes there). */
  del: string;
  /** The text the rewind removed (what undo re-inserts). */
  ins: string;
  /** The baseline generation at the rewind, so undo refuses a moved baseline. */
  generation: number;
}

const journals = new Map<string, RewindJournalEntry[]>();

/**
 * The most rewinds one tab may hold. Deeper than any undo run measured, and
 * small enough that the map cannot grow without a bound.
 */
export const JOURNAL_MAX_ENTRIES = 200;

/**
 * The most `del` plus `ins` text one tab's journal may hold, in UTF-16 code
 * units. A single rewind is bounded by the file it came from, so without this
 * a tab's journal is bounded by nothing.
 */
export const JOURNAL_MAX_BYTES = 1_048_576;

/** The text one entry retains. */
function entryWeight(entry: RewindJournalEntry): number {
  return entry.del.length + entry.ins.length;
}

/**
 * Drop the OLDEST entries until the stack is inside both budgets. The newest
 * entry is never dropped, even alone over the byte budget: it is the one the
 * person is about to press, and refusing to record it would leave a rewind with
 * no way back at all, which is the loss this journal exists to prevent.
 */
function trim(stack: RewindJournalEntry[]): void {
  while (stack.length > JOURNAL_MAX_ENTRIES) stack.shift();
  let weight = stack.reduce((sum, entry) => sum + entryWeight(entry), 0);
  while (stack.length > 1 && weight > JOURNAL_MAX_BYTES) {
    const dropped = stack.shift();
    if (dropped === undefined) return;
    weight -= entryWeight(dropped);
  }
}

/** Remember one rewind for this tab, inside the two budgets above. */
export function recordRewind(tabId: string, entry: RewindJournalEntry): void {
  const stack = journals.get(tabId);
  if (stack === undefined) journals.set(tabId, [entry]);
  else {
    stack.push(entry);
    trim(stack);
  }
}

/** The last rewind of this tab, or undefined when there is nothing to undo. */
export function lastRewind(tabId: string): RewindJournalEntry | undefined {
  const stack = journals.get(tabId);
  return stack === undefined ? undefined : stack[stack.length - 1];
}

/**
 * Drop one rewind of this tab, after its undo has been written. Given the
 * entry, it is dropped BY REFERENCE wherever it sits, so an undo pops exactly
 * the entry it wrote back and never a rewind that landed while it was in
 * flight (./redline-press); with no entry, the last one goes.
 */
export function popRewind(tabId: string, entry?: RewindJournalEntry): void {
  const stack = journals.get(tabId);
  if (stack === undefined) return;
  if (entry === undefined) stack.pop();
  else {
    const at = stack.lastIndexOf(entry);
    if (at === -1) return;
    stack.splice(at, 1);
  }
  if (stack.length === 0) journals.delete(tabId);
}

/** How many rewinds this tab can still undo. */
export function rewindJournalDepth(tabId: string): number {
  return journals.get(tabId)?.length ?? 0;
}

/**
 * PHASE 238's FIX ROUND. The last rewind of this tab THAT CAN STILL BE UNDONE,
 * or undefined.
 *
 * An entry's `off` is an offset into the baseline the rewind was drawn
 * against, so an entry whose generation is not the tab's names a place in a
 * coordinate system that has moved (research 83 B.8a) and ./redline-write
 * refuses it before it reads a byte. That refusal is right and is not touched.
 * What was wrong is that the FACE did not know: the undo sentence and the
 * chip's Undo button were drawn from the depth alone, so after a baseline move
 * the view kept offering an undo that could only ever refuse.
 *
 * IT WAS ALREADY REACHABLE BEFORE THIS PHASE, through a commit or a branch
 * switch, which re-seed the baseline and move the generation exactly as an
 * accept does; this module's own header has said so since Phase 227. What
 * Phase 238 changed is that a person now moves the baseline deliberately,
 * several times an afternoon, so a rare lie became the ordinary case.
 *
 * The generation only ever increases and entries are pushed in order, so an
 * unusable top entry means every entry below it is unusable too and one
 * question answers the whole stack. Nothing is DELETED on a baseline move: an
 * entry is tens of bytes, `popRewind` matches by reference, and a stack that
 * emptied itself would be a second mechanism able to lose an undo.
 */
export function undoableRewind(
  tabId: string,
  generation: number
): RewindJournalEntry | undefined {
  const entry = lastRewind(tabId);
  return entry !== undefined && entry.generation === generation ? entry : undefined;
}

/**
 * Forget one tab's journal outright. Called from `store.ts` at all three places
 * a tab leaves `tabs`, which is where this journal's ownership ends; see the
 * Phase 244 section of this file's header.
 */
export function forgetRewindJournal(tabId: string): void {
  journals.delete(tabId);
}
