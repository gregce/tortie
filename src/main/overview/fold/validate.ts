/**
 * The ten refusals (Phase 138).
 *
 * The entry's strongest refusal is that the model writes exactly one thing.
 * It never writes the verbatim ask, never the verbatim answer, never the git
 * mark, never the path list, never freshness and never a status.
 *
 * THIS IS MECHANICAL RATHER THAN A LINE IN A PROMPT, and the reason is a
 * measurement. Gate one watched the model write a commit mark into its very
 * first sentence, because the previous summary contained one. Gate two found
 * 167 of 215 unguarded summaries carrying a digit, which the page's own rule
 * forbids. A prompt asks. This decides.
 *
 * A candidate that fails is refused WHOLE rather than trimmed. Trimming would
 * produce a sentence no model wrote and nobody could account for, and the
 * page has a correct fallback already, being Phase 137's built line.
 *
 * A refused candidate still gets a row, with the verdict `refused` and the
 * reason set to the refusal's name. A silently discarded refusal is invisible,
 * and a refusal rate that climbs after a model upgrade is exactly the thing
 * somebody needs to be able to read.
 *
 * WHAT THE FIX ROUND CHANGED, AND WHY. The first cut of this file tested for
 * the WORD commit and for five status WORDS. Over sixty folds of real turns
 * from three of the operator's own projects that refused nineteen sentences,
 * being 31.7 percent, and only five of the nineteen broke a refusal the entry
 * actually names. Ten were refused for using the word commit about work that
 * was committed, with no hash anywhere in the sentence, and one of those was
 * about a person promising to return rather than about git at all. Four were
 * refused for the word live inside the name of the person's own product. The
 * same word rule fired on 92 of a second corpus of 570 saved summaries, which
 * is 16.1 percent against the 16.7 percent measured here, so two corpora
 * agree.
 *
 * The entry's refusal is that the model never writes THE GIT MARK and never
 * says WHAT STATE THE SESSION IS IN. A hash is the mark, and naming the mark
 * without pasting one is still the mark. Saying the session is idle is a
 * state. Saying that you asked for a commit and got one is neither. So the
 * two tests below name the mark and the state rather than the vocabulary
 * around them, and the sentences that prompted the change are held as keepers
 * in ./__tests__/measured-sentences.test.ts.
 *
 * THE NARROWING WAS THEN CHECKED ON TURNS THAT DID NOT INFORM IT. Thirty more
 * real turns, from parts of the same three conversations the sixty never
 * touched, were folded under the narrowed rules on 2026-08-23. Twenty seven
 * were kept, being 90 percent, and the three refusals are all correct: that
 * stretch of the conversation is about pinning a commit hash, so the model
 * wrote the words "SHA" and "commit hash", which is the mark named.
 */

import type { StoredTurn } from '../store';

/** The forty word rule, expressed as characters. */
export const FOLD_TEXT_MAX_CHARS = 320;

/**
 * A run of this many characters that also appears verbatim in something that
 * was sent counts as a quote. Short shared phrases are ordinary English and a
 * shorter window would refuse every honest sentence.
 */
export const FOLD_QUOTE_WINDOW = 40;

export type FoldRefusal =
  | 'empty'
  | 'too-long'
  | 'digit'
  | 'git-mark'
  | 'path'
  | 'dash'
  | 'newline'
  | 'quoted-ask'
  | 'quoted-answer'
  | 'status-word';

/** Every refusal, in the order the validator applies them. */
export const FOLD_REFUSALS: readonly FoldRefusal[] = [
  'empty',
  'newline',
  'too-long',
  'git-mark',
  'path',
  'digit',
  'dash',
  'status-word',
  'quoted-ask',
  'quoted-answer'
];

/** One sentence per refusal, for a diagnostic a person may end up reading. */
export const FOLD_REFUSAL_REASONS: Readonly<Record<FoldRefusal, string>> = {
  empty: 'The model answered with nothing.',
  'too-long': 'The sentence is longer than the line has room for.',
  digit: 'The sentence contains a digit, and this view carries no integers.',
  'git-mark': 'The sentence names the git mark, and the model never writes it.',
  path: 'The sentence names a file or a folder, and the model never writes the path list.',
  dash: 'The sentence uses a dash, which house style does not allow.',
  newline: 'The model answered with more than one line.',
  'quoted-ask': 'The sentence quotes your ask instead of saying what happened.',
  'quoted-answer': 'The sentence quotes the answer instead of saying what happened.',
  'status-word': 'The sentence says what state the session is in, and nothing here may.'
};

/** A digit anywhere. The page's integer rule has no exception a sentence can earn. */
const DIGIT_RE = /[0-9]/;

/** An em dash, an en dash, and the two other long dashes a model reaches for. */
const DASH_RE = /[–—‒―]/;

/**
 * A run of 7 to 40 hexadecimal characters. Seven is where a short git hash
 * starts and forty is a full one. The phrase test beside it catches the
 * sentence that names the mark without pasting one.
 */
const HEX_RUN_RE = /\b[0-9a-fA-F]{7,40}\b/;

/**
 * The mark named rather than pasted, e.g. "the commit hash" or "the sha".
 *
 * The bare word commit is NOT here, and that is the fix round's measurement
 * rather than a preference. A sentence that says you asked for a commit and
 * got one names no mark, and it is the honest sentence for that turn.
 */
const GIT_MARK_PHRASE_RE =
  /\b(sha|commit (hash|id|sha|ref|reference)|hash of the commit|short hash)\b/i;

/** A slash between word characters, which is what a path looks like. */
const PATH_SLASH_RE = /\w\/\w/;
/** A bare file name with a dot, e.g. one that ends in a known source extension. */
const FILE_NAME_RE =
  /\b[\w-]+\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|html|py|rs|go|sh|yml|yaml|sql|toml)\b/i;
/** A dot between word characters, which is the general bare filename shape. */
const DOTTED_NAME_RE = /\b[\w-]{2,}\.[\w-]{2,}\b/;

/**
 * Saying that you are being waited on. That is a status whatever surrounds it.
 */
const STATUS_WAIT_RE = /\b(needs (your )?input|waiting (on|for) you)\b/i;

/**
 * Saying what state the session or the agent is in.
 *
 * The subject is required, which is the whole narrowing. "The session is
 * idle" is a status. "The live build room" is the name of the thing the
 * person is building, and four of sixty real folds were refused for it.
 */
const STATUS_STATE_RE =
  /\b(session|agent)\s+(is|was|remains|stays)\s+(now\s+|still\s+)?(idle|running|live|busy|active|working|blocked|stuck)\b/i;

/**
 * Does `text` contain any run of `window` characters that also appears in
 * `source`? This is the quote test, and it runs over normalized whitespace so
 * a reflowed quote is still a quote.
 */
function quotesFrom(text: string, source: string, window: number): boolean {
  const a = text.replace(/\s+/g, ' ').trim().toLowerCase();
  const b = source.replace(/\s+/g, ' ').trim().toLowerCase();
  if (a.length < window || b.length < window) return false;
  for (let i = 0; i + window <= a.length; i++) {
    if (b.includes(a.slice(i, i + window))) return true;
  }
  return false;
}

export interface FoldValidation {
  /** The sentence when every refusal passed, trimmed. Null when one fired. */
  kept: string | null;
  /** The first refusal that fired, or null. */
  refusal: FoldRefusal | null;
}

/**
 * Rule on one candidate sentence against the turns that were sent with it.
 *
 * The order is deliberate in two ways. The cheap structural tests run before
 * the two quote scans, which are the only ones whose cost grows with the
 * prompt. And the git mark and the path run BEFORE the digit, so a sentence
 * carrying a commit hash is refused for carrying a commit hash rather than
 * for carrying the digits inside it. The refusal name is written into the
 * row, and a refusal rate somebody reads later is only worth reading if each
 * name says what actually went wrong.
 */
export function validateFoldText(
  text: string,
  turns: readonly StoredTurn[]
): FoldValidation {
  const trimmed = text.trim();
  const refuse = (refusal: FoldRefusal): FoldValidation => ({
    kept: null,
    refusal
  });

  if (trimmed === '') return refuse('empty');
  if (trimmed.includes('\n') || trimmed.includes('\r')) return refuse('newline');
  if (trimmed.length > FOLD_TEXT_MAX_CHARS) return refuse('too-long');
  if (HEX_RUN_RE.test(trimmed) || GIT_MARK_PHRASE_RE.test(trimmed)) {
    return refuse('git-mark');
  }
  if (
    PATH_SLASH_RE.test(trimmed) ||
    FILE_NAME_RE.test(trimmed) ||
    DOTTED_NAME_RE.test(trimmed)
  ) {
    return refuse('path');
  }
  if (DIGIT_RE.test(trimmed)) return refuse('digit');
  if (DASH_RE.test(trimmed)) return refuse('dash');
  if (STATUS_WAIT_RE.test(trimmed) || STATUS_STATE_RE.test(trimmed)) {
    return refuse('status-word');
  }
  for (const turn of turns) {
    if (quotesFrom(trimmed, turn.askText, FOLD_QUOTE_WINDOW)) {
      return refuse('quoted-ask');
    }
  }
  for (const turn of turns) {
    if (
      turn.answerText !== null &&
      quotesFrom(trimmed, turn.answerText, FOLD_QUOTE_WINDOW)
    ) {
      return refuse('quoted-answer');
    }
  }
  return { kept: trimmed, refusal: null };
}
