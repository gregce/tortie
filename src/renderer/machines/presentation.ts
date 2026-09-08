/**
 * The doctrine every sentence in this directory follows, and the four fragments
 * that every one of them composes with (Phase 70, M3).
 *
 * WHY ONE DIRECTORY. Nineteen surfaces draw these words, being the session dock
 * row, the tab, the identity strip, the create sheet, the folder picker, the
 * Explorer, Source Control, the editor, Quick Open, Search and the rest. A
 * vocabulary audit (../app/__tests__/machine-vocabulary.test.ts) reads every
 * file in this directory and the surfaces that use them, and fails on any word
 * from the transport layer. Phase 142 split the one file into twenty, one per
 * subject, because thirty one phases had written into it and that is thirty one
 * reasons to change one file. A reviewer who wants to know what Tortie claims
 * about a machine it cannot see reads this file first, then follows it out to
 * the nineteen subjects beside it.
 *
 * WHAT THE WORDS ARE ALLOWED TO CLAIM. PHASE 72 changed this paragraph, and the
 * change is the phase. A remote session now HAS a row in Tortie's own records
 * and it has saved output on this Mac, so Tortie can start it again on that
 * machine. Two things it still does not have, and every sentence in this
 * directory has to keep saying so: there is no conversation id for it, so the
 * conversation does not come back, and the saved output is not put back into
 * the recreated session on the other machine. There is also no launch snapshot
 * for it, which is what `NO_SNAPSHOT` in ./session-restore.ts says.
 *
 * Machines have labels and sessions have names. No sentence in this directory
 * names the transport, the program Tortie runs on the far side, or any of its
 * verbs.
 *
 * WHY THESE TWO MEMBERS STAY HERE. They are fragments rather than sentences.
 * `readClockTime` returns "14:32" and `commitCount` returns "3 commits".
 * Every subject beside this file composes with them and none of them belongs
 * to one surface. They change when the way Tortie states a moment changes,
 * which is one reason and it is not any of the other nineteen.
 *
 * PHASE 230 TOOK THE CLOCK OFF. `remoteReadAt`, "Read at 14:32. Press Refresh
 * to read it again.", and `machineReadAt`, "Tortie read this from X at
 * 14:32.", were the two names for one sentence about which moment the reader
 * was looking at, drawn under the Explorer, the Changes group, the branch
 * header and the three Source control groups. Phase 228 left them as the one
 * short clock, because nothing re-read a machine and a person needed to know
 * which moment they were looking at. Every remote view reads again by itself
 * now, when the machine starts answering, when the view is looked at, when
 * the window regains focus and after Tortie's own writes
 * (./use-remote-reread.ts), and a view that reads when looked at needs no
 * clock; a local view carries none. `../machines/__tests__/p228-off-the-face.test.ts`
 * pins that neither comes back. `readClockTime` stays for Quick Open.
 */

/**
 * One instant on this Mac's own clock, as "14:32".
 *
 * The time of day rather than the full date, because every one of these reads
 * happens while the person is looking at the screen. The clock is this Mac's,
 * never the other machine's, so it can be read against the reader's own watch.
 */
export function readClockTime(at: number): string {
  const d = new Date(at);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * How many commits, written out, and singular at one.
 *
 * IT IS EXPORTED AND IT IS NOT COPIED. The Branch group and the history both
 * count commits, and Phase 142 put the one fragment here rather than writing a
 * second copy in ./history.ts. Two copies of one rule is how two sentences go
 * out of step.
 */
export function commitCount(n: number): string {
  return `${n.toLocaleString()} commit${n === 1 ? '' : 's'}`;
}
