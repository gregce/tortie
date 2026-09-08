/**
 * The first-run line (Phase 236), per session and in memory only.
 *
 * Phase 227 shipped four chords and nothing on the face said them. Phase 236's
 * chip answers that for a person who moves the pointer onto a change — but a
 * person has to know there is something to point at. So the first time a
 * redline with at least one change is drawn in a session, the view says one
 * short sentence in the note slot it already has, and it does not come back.
 *
 * IT IS ONE SENTENCE, per the operator's *just enough words* rule of
 * 2026-08-28: a surface explains itself with short labels and visual
 * indication, never paragraphs. The chord in it is `keyDisplay`'s, so it can
 * never drift from src/shared/keymap.ts.
 *
 * IT IS REMEMBERED THE WAY THE JOURNAL IS REMEMBERED (./redline-journal): a
 * module-level flag that lives as long as the session and dies on reload, quit
 * or crash. NOTHING IS WRITTEN TO DISK. A settings key would be a durable
 * record of a person having read a sentence, which is more than this is worth,
 * and it would need a channel, a migration and a gate line; the cost of the
 * cheap answer is that the line comes back once after a reload, which is a
 * cost a person pays at most once per launch.
 *
 * It names no bridge and writes nothing, so it is scanned by
 * `npm run conformance:redline` rule 9 with the other redline modules.
 */

import { keyDisplay } from '@shared/keymap';

let shown = false;

/** Has this session already drawn the first-run line? */
export function redlineHintSeen(): boolean {
  return shown;
}

/** Remember that it has been drawn. It does not come back. */
export function markRedlineHintSeen(): void {
  shown = true;
}

/** Forget it, so the next redline shows it again. Exported for tests. */
export function forgetRedlineHint(): void {
  shown = false;
}

/**
 * The sentence. It names the chip rather than listing the four chords, because
 * the chip carries all four itself the moment a person reaches it, and a
 * paragraph on the resting face is what the rule above refuses.
 */
export function redlineHintSentence(): string {
  return `Hover a change to see its controls, or step through them with ${keyDisplay('redline.next')}.`;
}
