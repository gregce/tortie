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
 * It lives as long as the session: it dies on reload, quit or crash, and the
 * face says so. It is keyed by tab id, which is unique per open, so a closed
 * and reopened file gets a fresh journal; the entries of a closed tab linger
 * as a few bytes until the next reload rather than being swept, because
 * sweeping on unmount would also clear it on an ordinary tab switch.
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

/** Remember one rewind for this tab. */
export function recordRewind(tabId: string, entry: RewindJournalEntry): void {
  const stack = journals.get(tabId);
  if (stack === undefined) journals.set(tabId, [entry]);
  else stack.push(entry);
}

/** The last rewind of this tab, or undefined when there is nothing to undo. */
export function lastRewind(tabId: string): RewindJournalEntry | undefined {
  const stack = journals.get(tabId);
  return stack === undefined ? undefined : stack[stack.length - 1];
}

/** Drop the last rewind of this tab, after its undo has been written. */
export function popRewind(tabId: string): void {
  const stack = journals.get(tabId);
  if (stack === undefined) return;
  stack.pop();
  if (stack.length === 0) journals.delete(tabId);
}

/** How many rewinds this tab can still undo. */
export function rewindJournalDepth(tabId: string): number {
  return journals.get(tabId)?.length ?? 0;
}

/** Forget one tab's journal outright. Exported for tests and a future close. */
export function forgetRewindJournal(tabId: string): void {
  journals.delete(tabId);
}
