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
 * PHASE 238 ADDED THE ACCEPT, which is research 83 A2.2's second advancing
 * gesture and the one the person makes deliberately. So the baseline is
 * seeded at the first successful read, re-seeded when HEAD moves, moved by an
 * accept, and otherwise immutable. What advances it is never the file changing
 * (research 83 policy Z: a baseline that follows the file always equals it and
 * draws nothing, ever), never the person typing or saving (Phase 237, and
 * `conformance:redline` rule 17 scans the typing files for it), never a look
 * at the view, never a tab switch.
 *
 * THE GENERATION MOVES ON AN ACCEPT exactly as it moves on a re-seed, and
 * that is the whole of research 83 B.8a: every drawn rewind identity is an
 * offset INTO the baseline, so a baseline that moved under a drawn picture
 * moved that picture's coordinate system. An accept is the first gesture in
 * this product that moves it often, which is why the guard is proved under
 * one rather than merely shipped beside it.
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

import { fileInRepo } from './tab-identity';
import type { EditorTab } from './tab-types';

/** Where the baseline's bytes came from, which is what the face names. */
export type BaselineOrigin = 'commit' | 'read' | 'accept';

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
  /**
   * PHASE 239. The wall clock moment the baseline was last seeded, in
   * milliseconds, or null when nothing has seeded it. It moves with
   * `generation` and never otherwise, so it is the same fact said in a unit a
   * person can read.
   *
   * IT EXISTS BECAUSE THE FACE COULD NOT SAY WHEN. Research 99 section 6.4
   * measured the two answers `baselineName` has, being `the last commit` and
   * `you opened this file`, and NEITHER CARRIES A TIME: a tab opened this
   * morning and a tab opened a minute ago drew the same 67 characters. This is
   * the one field that separates them, it is read by ./baseline alone, it
   * reaches no bridge and it is written nowhere.
   */
  takenAt: number | null;
  /**
   * PHASE 238. When the person accepted, so the face can say *"since you
   * accepted, 14:02"* (research 83 A4.2 ruling 1). Null for every other
   * origin, because only an accept is an act with a moment.
   *
   * IT IS NOT A SECOND CLOCK. Phases 238 and 239 landed a day apart and each
   * added a moment to this state; the accept branch below writes ONE number
   * into both fields, so `acceptedAt` is `takenAt` narrowed to the one origin
   * that is a person's act, and the two sentences the face can draw can never
   * name different times for the same seed.
   */
  acceptedAt: number | null;
}

/** A tab that has read nothing and heard nothing from git. */
export const NO_BASELINE: BaselineState = Object.freeze({
  text: null,
  from: null,
  generation: 0,
  headSeen: null,
  takenAt: null,
  acceptedAt: null
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
  | { kind: 'head'; contents: string }
  /**
   * PHASE 238. The person accepted: one change, in which case `contents` is
   * `mix(runs, {e})`, or all of them, in which case it is the bytes in front
   * of them. Either way the baseline becomes those bytes and the generation
   * moves EXACTLY as it moves on a re-seed, because a moved baseline is a
   * moved coordinate system whatever moved it (research 83 B.8a). Nothing is
   * written to disk on this path, which is what makes it the safe half.
   */
  | { kind: 'accept'; contents: string; at: number };

/**
 * The next baseline state. Answers the SAME object when nothing changed, so a
 * caller can patch the tab unconditionally and a store can compare by
 * identity.
 */
export function nextBaseline(
  state: BaselineState | undefined,
  event: BaselineEvent,
  // PHASE 239. The moment a seed happens, handed in so this module stays
  // pinnable to the millisecond; the default is the only impurity and every
  // test passes its own.
  now: number = Date.now()
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
      headSeen: current.headSeen,
      takenAt: now,
      acceptedAt: null
    };
  }
  if (event.kind === 'accept') {
    return {
      text: event.contents,
      from: 'accept',
      generation: current.generation + 1,
      headSeen: current.headSeen,
      // The accept's own moment is the seed's moment. One number, two fields,
      // so no face can name two times for one accept.
      takenAt: event.at,
      acceptedAt: event.at
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
    headSeen: event.contents,
    takenAt: now,
    acceptedAt: null
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
 * Can this tab draw the redline without a HEAD version?
 *
 * Yes for a worktree tab inside its repository that holds a shadow baseline,
 * which every such tab does from its first successful read. So an untracked
 * prose file that is open when an agent writes to it gets a redline where
 * before it got none. A file the agent created before the person opened it is
 * read for the first time after the agent's last write, so its baseline is
 * that version and its redline is empty, which is correct; this phase names
 * no second seeding moment for it (research 83 A1.2 property 2).
 *
 * Never for a history tab or a review tab, whose two sides come from the
 * commit or the machine and which hold no baseline, and never outside the
 * repository, where the store's setMode refuses the mode anyway. The mode
 * chip offers Redline on this answer and the panel falls back on its
 * negation, so the two cannot disagree.
 */
export function redlineWithoutHead(
  tab: Pick<EditorTab, 'baseline' | 'commit' | 'remote' | 'repoPath' | 'path'>
): boolean {
  return (
    tab.baseline?.text != null &&
    tab.commit === null &&
    tab.remote === undefined &&
    fileInRepo(tab.repoPath, tab.path)
  );
}

/**
 * What the face calls the baseline, or null when the tab holds none and the
 * view is drawing what Phase 194 drew. Research 83 A4.2 ruling 1: the view
 * never says an agent did it, it says what changed since a NAMED baseline.
 */
export function baselineName(state: BaselineState | undefined): string | null {
  if (state === undefined || state.from === null) return null;
  // PHASE 238. An accept names its own moment, because a person who accepted
  // twice this afternoon needs to know which one they are looking at, and
  // research 83 A4.2 ruling 1 already wrote the words: *"since you accepted,
  // 14:02"*. The other two origins have no moment to name — "the last commit"
  // is git's and "you opened this file" is the tab's.
  if (state.from === 'accept') {
    return state.acceptedAt === null
      ? 'you accepted'
      : `you accepted at ${clockTime(state.acceptedAt)}`;
  }
  return state.from === 'commit' ? 'the last commit' : 'you opened this file';
}

/**
 * The clock time of a moment, `HH:MM` on the twenty four hour clock.
 *
 * Written by hand rather than through `toLocaleTimeString` so the sentence can
 * be pinned character for character in a test that does not have to know the
 * runner's locale, and so it is the same four digits on every machine. It is
 * the shortest form that says WHEN, which is the whole reason `takenAt` exists.
 *
 * THERE IS ONE CLOCK IN THIS MODULE AND THAT IS THE POINT. Phase 238 wrote a
 * locale one for the accept sentence and Phase 239 wrote this one for the
 * opening sentence; two would put `2:02 PM` and `14:02` on the same face, so
 * the accept reads this one too.
 */
export function clockTime(ms: number): string {
  const at = new Date(ms);
  const hours = String(at.getHours()).padStart(2, '0');
  const minutes = String(at.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** What the face is being asked about: whether the picture holds any mark. */
export interface BaselineFace {
  /** True when the composed document draws no change at all. */
  empty?: boolean;
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
 *
 * ## PHASE 239: THE EMPTY FACE, WHICH IS THE ONE HE MET
 *
 * The operator asked on 2026-09-08 for *"clarity in the redline view about
 * what it is showing you if you open a new file"*. Research 99 section 6.2
 * read all three opening faces off the running app and measured what was
 * wrong: a file just opened draws a document with NO MARKS IN IT and says
 * `Marked since you opened this file, for as long as this tab is open.`,
 * which is a promise about the future rather than a statement about the
 * picture. A person cannot tell "nothing has changed" from "nothing is being
 * compared", and the untracked face and the agent-created face were **the
 * same 67 characters**, byte for byte.
 *
 * So an EMPTY picture gets its own sentence, and it says the two things a
 * person can act on: that nothing has changed, and WHEN the comparison starts
 * from. `takenAt` is what makes the second half possible.
 *
 * **THE UNTRACKED FILE AND THE AGENT-CREATED FILE GET THE SAME SENTENCE, ON
 * PURPOSE.** Research 99 section 6.4 finding 3 measured that Tortie holds no
 * fact that separates them: both are untracked, both seed `from: 'read'`, and
 * nothing in the tab records whether the bytes arrived before or after the
 * project was opened. The mtime heuristic reads identically for a file the
 * person edited in another editor a minute earlier. And the extra claim is the
 * one research 83 A4.2 ruling 1 already forbids this view from making, being
 * that an agent did it. What a person can ACT on is identical in both cases,
 * being that there is no commit to compare against and the marking starts from
 * the bytes that were on disk at the moment the tab opened — which is exactly
 * why the agent-created file draws nothing, because it was finished before
 * that moment. The TIME is what says so, and it is what both faces now carry.
 */
export function baselineSentence(
  state: BaselineState | undefined,
  dirty: boolean,
  face: BaselineFace = {}
): string | null {
  const name = baselineName(state);
  if (name === null) return null;
  // PHASE 239. `takenAt` is null only for a baseline seeded before this field
  // existed or by a caller that passed no clock; the sentence degrades to the
  // words without a time rather than printing a wrong one.
  const at = state?.takenAt ?? null;
  // PHASE 238. An accept's name ALREADY carries its moment, because that is
  // the one origin a person made themselves and the moment is half of what
  // they are being told. Appending the time again would read "since you
  // accepted at 14:02 at 14:02".
  const named =
    state?.from === 'commit' || state?.from === 'accept' || at === null
      ? name
      : `${name} at ${clockTime(at)}`;
  const since =
    face.empty === true
      ? `Nothing has changed since ${named}.`
      : `Marked since ${name}, for as long as this tab is open.`;
  return dirty
    ? `${since} Not refreshed from disk while there are unsaved edits.`
    : since;
}

/**
 * The longer explanation, for a hover or a disclosure and never for the
 * resting face (the operator's *just enough words* rule of 2026-08-28: "TONS
 * of words, bad"). Null exactly when `baselineSentence` is null.
 *
 * It is the place the lifetime claim goes when the visible line is the empty
 * one, and the place the untracked file is told WHY it has nothing to compare
 * against, which is the sentence a person who opened an agent-created file
 * needs and which no face said before.
 */
export function baselineDetail(
  state: BaselineState | undefined,
  face: BaselineFace = {}
): string | null {
  const name = baselineName(state);
  if (name === null) return null;
  const lasts = 'The marking lasts for as long as this tab is open.';
  // PHASE 238. An accepted baseline is neither the commit nor the bytes the
  // tab opened on, so it gets its own two sentences rather than being told it
  // has no committed version to compare against, which after an accept is
  // beside the point whether or not it is true.
  if (state?.from === 'accept') {
    return face.empty === true
      ? `Everything in this file has been accepted, so there is nothing left to mark. ${lasts}`
      : `Only what changed since you accepted is marked. ${lasts}`;
  }
  if (state?.from === 'commit') {
    return face.empty === true
      ? `This file is the same as its last committed version. ${lasts}`
      : `Every change since the last commit is marked. ${lasts}`;
  }
  return face.empty === true
    ? `There is no committed version to compare against, so the marking starts from the bytes that were on disk when this tab opened. Anything written before then is not marked. ${lasts}`
    : `There is no committed version, so every change since this tab opened is marked. ${lasts}`;
}
