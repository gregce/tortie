/**
 * Phase 225. The shadow baseline: the LEFT side the redline draws against,
 * held in memory on the tab and written nowhere.
 *
 * The rule, from research 83 A1.2 and A4.2, in one sentence:
 *
 *   baseline = the newest of { the HEAD version of the file, the last version
 *   the person accepted, the last version the person committed }; for a file
 *   with no HEAD version, the first bytes Tortie successfully read. A HEAD
 *   version Tortie has not seen before wins outright, whatever its date.
 *
 * In THIS phase there is no accept, so the baseline is seeded at the first
 * successful read, re-seeded when HEAD moves, and otherwise immutable. What
 * advances it is never the file changing (research 83 policy Z: a baseline
 * that follows the file always equals it and draws nothing, ever), never the
 * person typing or saving, never a look at the view, never a tab switch.
 *
 * This module is pure on purpose. It takes the state a tab holds and one
 * event, and answers the next state, so the rule can be pinned clause by
 * clause under node and ablated one clause at a time. It names no bridge, no
 * write and no accept, and `npm run conformance:redline` rule 9 scans it to
 * keep that true.
 *
 * THE EMPTY ANSWER. `git:showHead` answers `''` both for a committed empty
 * file and for a path that is not in HEAD at all (research 85 section 0
 * finding 1: `src/main/git/ipc.ts` freezes `null` to `''`). Read as "a HEAD
 * version not seen before", that `''` would re-seed an untracked file's
 * baseline to nothing on the first watcher tick and draw the whole file as
 * inserted, which is the picture this phase exists to stop. So an empty HEAD
 * answer never seeds a baseline. The stated limit is a committed EMPTY file,
 * whose baseline is then its first read rather than its (empty) HEAD version.
 */

/** Where the baseline's bytes came from, which is what the face names. */
export type BaselineOrigin = 'commit' | 'read';

export interface BaselineState {
  /** The bytes the redline draws against, or null while nothing has seeded it. */
  text: string | null;
  /** The committed version, or the first bytes Tortie read. Null with `text`. */
  from: BaselineOrigin | null;
  /**
   * Moves on every seed and re-seed, and never otherwise. A later phase binds
   * a press to the generation the picture was drawn against (research 83
   * B.8a); in this phase it is the proof that the baseline moved exactly when
   * the rule says it may.
   */
  generation: number;
  /**
   * The last HEAD bytes git answered for this tab, so a tick can tell HEAD
   * moving from HEAD repeating. `headContents` on the tab cannot say this,
   * because every tick overwrites it. Null until git has answered once.
   */
  headSeen: string | null;
}

/** A tab that has read nothing and heard nothing from git. */
export const NO_BASELINE: BaselineState = Object.freeze({
  text: null,
  from: null,
  generation: 0,
  headSeen: null
});

/**
 * The two things that can happen to a baseline in this phase.
 *  - `read`: a successful read of the file. Seeds the baseline the FIRST time
 *    and never again, whatever the bytes.
 *  - `head`: git answered for the file's HEAD version. A version not seen
 *    before becomes the baseline outright; a repeated one changes nothing; an
 *    empty one is read as no HEAD version at all (see the header).
 */
export type BaselineEvent =
  | { kind: 'read'; contents: string }
  | { kind: 'head'; contents: string };

/**
 * The next baseline state. Answers the SAME object when nothing changed, so a
 * caller can patch the tab unconditionally and a store can compare by
 * identity.
 */
export function nextBaseline(
  state: BaselineState | undefined,
  event: BaselineEvent
): BaselineState {
  const current = state ?? NO_BASELINE;
  if (event.kind === 'read') {
    // The first successful read seeds; every later read is the file changing,
    // which never moves the baseline.
    if (current.text !== null) return current;
    return {
      text: event.contents,
      from: 'read',
      generation: current.generation + 1,
      headSeen: current.headSeen
    };
  }
  // A HEAD answer already seen moves nothing.
  if (event.contents === current.headSeen) return current;
  // An empty answer is "no HEAD version", never a version to draw against.
  if (event.contents === '') {
    return { ...current, headSeen: '' };
  }
  // A HEAD version not seen before wins outright.
  return {
    text: event.contents,
    from: 'commit',
    generation: current.generation + 1,
    headSeen: event.contents
  };
}

/**
 * The left side the redline composes against: the baseline when the tab holds
 * one, else the HEAD contents the diff already holds, else nothing. A tab with
 * no baseline therefore draws exactly what Phase 194 shipped.
 */
export function redlineBaseSide(
  state: BaselineState | undefined,
  headContents: string | null
): string {
  return state?.text ?? headContents ?? '';
}

/**
 * What the face calls the baseline, or null when the tab holds none and the
 * view is drawing what Phase 194 drew. Research 83 A4.2 ruling 1: the view
 * never says an agent did it, it says what changed since a NAMED baseline.
 */
export function baselineName(state: BaselineState | undefined): string | null {
  if (state === undefined || state.from === null) return null;
  return state.from === 'commit' ? 'the last commit' : 'you opened this file';
}

/**
 * The one sentence under the document, or null when there is no baseline to
 * name. It names the baseline and says how long the marking lasts, being as
 * long as this tab is open (research 83 F.2: the baseline dies with the tab,
 * on close, on eviction, on reload, quit or crash). It never says the old
 * text is kept anywhere, because a person who believes Tortie is holding
 * their history stops committing (A3.4), and that is the one place a copy
 * decision is a correctness decision.
 *
 * While the tab has unsaved edits it says one thing more. The watcher skips
 * a dirty tab on purpose (./tab-io refreshRepo), so "every agent edit shows
 * up" is false for exactly as long as the tab is dirty (research 83 A4.3),
 * and the face says so rather than a bug report discovering it.
 */
export function baselineSentence(
  state: BaselineState | undefined,
  dirty: boolean
): string | null {
  const name = baselineName(state);
  if (name === null) return null;
  const since = `Marked since ${name}, for as long as this tab is open.`;
  return dirty
    ? `${since} Not refreshed from disk while there are unsaved edits.`
    : since;
}
