/**
 * What the fold sends, and what it never sends (Phase 138).
 *
 * The fold sends the PREVIOUS summary plus the NEW turns since the watermark.
 * It never sends the whole session. That is the property that keeps the cost
 * of one turn flat as a session grows, so a session on its two hundredth turn
 * costs what one on its second costs.
 *
 * Everything here reads from the overview store rather than from a log file,
 * so nothing that is sent has skipped Phase 137's redaction. Redaction runs
 * inside OverviewStore.replaceTurnsFrom, on the ask, the answer and the
 * notice, before the insert, and there is no other write path into the turn
 * table. Read ../store/store.ts if you want to see that for yourself.
 *
 * THE SYSTEM PROMPT CARRIES TWO RULES GATE TWO PROVED ARE FREE. Drift is a
 * property of the prompt rather than of folding. The same wrong fact, from
 * the same turn, was held for one fold by a recency prompt and for eleven
 * folds by a cumulative one. And 167 of 215 unguarded summaries contained a
 * digit, which the page's own rule forbids. Both rules cost nothing and each
 * one closes a measured defect.
 */

import { createHash } from 'node:crypto';
import type { StoredTurn } from '../store';

/** The ask clip inside one turn block. */
export const FOLD_ASK_MAX_CHARS = 600;
/** The answer clip inside one turn block. */
export const FOLD_ANSWER_MAX_CHARS = 1_200;
/** The whole composed prompt's ceiling, in bytes of UTF-8. */
export const FOLD_PROMPT_MAX_BYTES = 16_384;

/**
 * The instruction the model writes under. Every line is a refusal the entry
 * or a measurement asked for, and the validator enforces the mechanical ones
 * again after the model has answered, because gate one watched the model
 * break one of them in its first probe.
 */
export const FOLD_SYSTEM_PROMPT = [
  'You write one sentence that says where a coding session stands right now.',
  'Lead with the newest turn. Older work is mentioned only if the session is still about it.',
  'The person is always "you". The agent is always "the agent". Neither is ever "it".',
  'Write one or two complete sentences and no more than forty words.',
  'Never write a digit. Do not name a version, a count or an amount.',
  'Never quote the ask and never quote the answer. Write what happened in your own words.',
  'Never write a commit mark, a file path, a file name or a branch name.',
  'Never say whether the session is live, idle, waiting on you or needs input.',
  'Do not use a dash of any kind. Use a colon only to introduce a list.',
  'Answer with the sentence alone and nothing else.'
].join('\n');

/** The sentence that stands in for a previous summary when there is none. */
export const FOLD_NO_EARLIER_SUMMARY = 'There is no earlier summary.';

/** What the composer says when the provider recorded no answer for a turn. */
export const FOLD_NO_ANSWER_ON_RECORD = 'the agent recorded no answer';

export interface FoldComposition {
  /** The prompt text, ready to hand to the recipe. */
  prompt: string;
  /** The turns that actually fit, oldest first. */
  turns: StoredTurn[];
  /** The lowest turn index this fold covers. */
  fromTurn: number;
  /** The highest turn index this fold covers. */
  toTurn: number;
  /** How many of the new turns were dropped to fit the cap. */
  dropped: number;
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max);
}

/** One turn as the model reads it. */
function turnBlock(turn: StoredTurn): string {
  const ask = clip(turn.askText, FOLD_ASK_MAX_CHARS);
  const answer =
    turn.answerText === null
      ? FOLD_NO_ANSWER_ON_RECORD
      : clip(turn.answerText, FOLD_ANSWER_MAX_CHARS);
  return ['you asked', ask, '', 'the agent answered', answer, ''].join('\n');
}

function assemble(
  previous: string | null,
  turns: readonly StoredTurn[]
): string {
  const earlier =
    previous === null || previous === '' ? FOLD_NO_EARLIER_SUMMARY : previous;
  return [
    'Here is the summary you wrote last time.',
    earlier,
    '',
    'Here are the turns since then, oldest first.',
    '',
    turns.map(turnBlock).join('\n'),
    'Write the new summary.'
  ].join('\n');
}

/**
 * Build the prompt from the previous summary and the turns since the
 * watermark.
 *
 * When the composed text is over the cap, the OLDEST new turns are dropped
 * first, because gate two proved the newest turn is where nearly all the
 * value is. A dropped turn is never sent again, because the watermark still
 * advances. That is a stated limit and it costs almost nothing: gate two
 * showed a summary written from the newest turn alone was indistinguishable
 * from a two hundred fold chain at every one of eight checkpoints.
 *
 * Returns null when there is no new turn at all, because there is nothing to
 * ask about and a fold that spends on nothing is a defect.
 */
export function composeFoldPrompt(
  previousSummary: string | null,
  newTurns: readonly StoredTurn[]
): FoldComposition | null {
  const ordered = [...newTurns].sort((a, b) => a.index - b.index);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (first === undefined || last === undefined) return null;

  let kept = ordered;
  let prompt = assemble(previousSummary, kept);
  // The newest turn always goes, even alone and even when it is over the cap
  // by itself. The recipe's own budget and the model's own window are what
  // stop an enormous single turn, and sending nothing would spend the fold on
  // nothing.
  while (
    Buffer.byteLength(prompt, 'utf8') > FOLD_PROMPT_MAX_BYTES &&
    kept.length > 1
  ) {
    kept = kept.slice(1);
    prompt = assemble(previousSummary, kept);
  }

  return {
    prompt,
    turns: kept,
    fromTurn: first.index,
    toTurn: last.index,
    dropped: ordered.length - kept.length
  };
}

/**
 * The hash of everything that decided this sentence.
 *
 * It gives two things. A fold whose input hash equals the newest row's is
 * skipped, so a re-armed boundary with no new turn cannot spend anything. And
 * a verifier can recompute it from the stored range and prove which bytes
 * produced which sentence.
 */
export function foldInputHash(input: {
  recipeAgentId: string;
  recipeVersion: number;
  model: string;
  systemPrompt: string;
  prompt: string;
}): string {
  const hash = createHash('sha256');
  hash.update(input.recipeAgentId);
  hash.update(' ');
  hash.update(String(input.recipeVersion));
  hash.update(' ');
  hash.update(input.model);
  hash.update(' ');
  hash.update(input.systemPrompt);
  hash.update(' ');
  hash.update(input.prompt);
  return hash.digest('hex');
}
