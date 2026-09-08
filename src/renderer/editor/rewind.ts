/**
 * Rewind, phrase by phrase: the pure half (Phase 227).
 *
 * Research 83 section B measured the rule and this module is that rule ported
 * as it was proved, from `.p222/fix/mix.ts` and the fix round scripts beside
 * it, keyed on the GROUP and nothing added. It takes strings and run lists and
 * answers strings and words. It names no bridge, opens no file, reads no tab
 * and writes nothing, so `npm run conformance:redline` can run every clause
 * under node over two strings and ablate it one clause at a time.
 *
 * ## The unit, research 83 B.2
 *
 * A CHANGE is a maximal stretch of consecutive non-`same` runs. A `same` run
 * can never be empty, because ./redline-document's `push` refuses `''`, so
 * consecutive non-`same` runs really are one place in the document, and the
 * eight things a person would point at in the B.1 fixture are exactly its
 * eight groups. The largest group seen over 3,999 fuzz pairs held three runs,
 * every one the whitespace repair's `del "\nclient" / ins " "` shape (B.4a).
 * A pure spacing change is a change with invisible bytes and it gets the same
 * control, because the control is keyed on the group and the face names
 * neither an author nor a kind (the operator's first ruling).
 *
 * ## The identity, research 83 B.4d
 *
 * A change is `(baseline offset, deleted text, inserted text)`, never a run
 * index and never the drawn bytes. The offset is into the BASELINE, advanced
 * by `same` and `del` text only, because the baseline is the one thing that
 * does not move while a person reads (B.8, with B.8a's generation guard in
 * front of it in ./RedlineDocument). Text alone is not an identity: two
 * identical phrases resolve to two edits by offset and to one by text. Offsets
 * are strictly increasing across one draw (2,998 draws, 0 non-increasing
 * pairs), so an offset names at most one change.
 */

import type { RedlineRun } from './redline';
import type { FsGuardedWriteResult } from '@shared/fs-ops';
import { composeRedlineDocument } from './redline-document';

/** One change: a maximal group of non-`same` runs, with its identity. */
export interface RedlineChange {
  /** Offset into the BASELINE where the group starts. */
  off: number;
  /** The deleted text, being every `del` run of the group in order. */
  del: string;
  /** The inserted text, being every `ins` run of the group in order. */
  ins: string;
  /** Indexes into the run list, consecutive, in order. */
  runs: number[];
}

/**
 * Group consecutive non-`same` runs into changes, each carrying the baseline
 * offset it starts at. `.p222/fix/mix.ts` `editsOf`, ported as it was proved.
 */
export function changesOf(runs: readonly RedlineRun[]): RedlineChange[] {
  const out: RedlineChange[] = [];
  let off = 0;
  let i = 0;
  while (i < runs.length) {
    const run = runs[i];
    if (run === undefined) break;
    if (run.kind === 'same') {
      off += run.text.length;
      i += 1;
      continue;
    }
    const start = off;
    let del = '';
    let ins = '';
    const indexes: number[] = [];
    while (i < runs.length) {
      const q = runs[i];
      if (q === undefined || q.kind === 'same') break;
      indexes.push(i);
      if (q.kind === 'del') {
        del += q.text;
        off += q.text.length;
      } else {
        ins += q.text;
      }
      i += 1;
    }
    out.push({ off: start, del, ins, runs: indexes });
  }
  return out;
}

/**
 * B.3's rule, ported from `.p222/fix/mix.ts` as it was proved.
 *
 * `mix(runs, changes, take)` concatenates: a `same` run always, an `ins` run
 * when its change is in `take` (the change is kept), a `del` run when its
 * change is NOT in `take` (the change is reverted). So a rewind of change `e`
 * is `mix(freshRuns, changes, everyIndexExcept(e))`: every other change keeps
 * its inserted side and `e` alone goes back to the baseline. `mix(∅)` is the
 * baseline and `mix(all)` is the file, which research 83 B.3 measured on the
 * B.1 fixture and this module's test re-derives over all 256 subsets.
 */
export function mix(
  runs: readonly RedlineRun[],
  changes: readonly RedlineChange[],
  take: ReadonlySet<number>
): string {
  const owner = new Map<number, number>();
  changes.forEach((change, n) => {
    for (const index of change.runs) owner.set(index, n);
  });
  let out = '';
  runs.forEach((run, i) => {
    if (run.kind === 'same') {
      out += run.text;
      return;
    }
    const n = owner.get(i);
    if (n === undefined) return;
    if (run.kind === 'ins') {
      if (take.has(n)) out += run.text;
    } else if (!take.has(n)) {
      out += run.text;
    }
  });
  return out;
}

/** A press's identity, carried off the focused wrapper: never a run index. */
export interface PressedIdentity {
  off: number;
  del: string;
  ins: string;
}

/** How the pressed identity resolved against the fresh compose. */
export type PressResolution =
  | { kind: 'one'; index: number }
  | { kind: 'none' }
  | { kind: 'many' };

/**
 * Resolve the pressed identity `(off, del, ins)` against the fresh changes.
 * Text alone is not an identity (two identical phrases resolve to two by
 * offset and to one by text), and offsets are strictly increasing across one
 * draw, so at most one change ever matches. `many` is a defensive branch that
 * cannot arise from `changesOf` of one compose; it is here because the rule
 * (research 83 E.7) names it and a caller that ever hands a hand built list
 * with two identical offsets must refuse rather than guess.
 */
export function resolvePress(
  changes: readonly RedlineChange[],
  pressed: PressedIdentity
): PressResolution {
  const hits: number[] = [];
  changes.forEach((change, n) => {
    if (change.off === pressed.off && change.del === pressed.del && change.ins === pressed.ins) {
      hits.push(n);
    }
  });
  if (hits.length === 1) return { kind: 'one', index: hits[0] as number };
  if (hits.length > 1) return { kind: 'many' };
  return { kind: 'none' };
}

/**
 * Why a rewind or an undo did not happen, each a word so the view can say the
 * right sentence (./redline-copy). The first six are this module's own, over
 * the baseline and the fresh bytes; the last five are the channel's own words,
 * mapped through {@link rewindRefusalKey} so the view surfaces them.
 */
export type RewindRefusal =
  | 'baselineMoved'
  | 'fileTooLarge'
  | 'decodeLoss'
  | 'phraseMoved'
  | 'alreadyBack'
  | 'ambiguous'
  | 'stale'
  | 'raced'
  | 'readOnly'
  | 'outsideRoot'
  | 'io';

/** Everything the pure decision needs, so a gate can drive it over two strings. */
export interface RewindInput {
  /** The shadow baseline the redline draws against, immutable during a press. */
  baseline: string;
  /** The baseline generation now, read fresh at the press. */
  baselineGeneration: number;
  /** The generation the picture the person pressed was drawn against. */
  drawnGeneration: number;
  /** The bytes read from disk at the moment of the press, never savedContents. */
  fresh: string;
  /** Whether that read was truncated by the read cap. */
  truncated: boolean;
  /** The change pressed, by its own bytes and its baseline offset. */
  pressed: PressedIdentity;
  /** A rewind reverts the change; an undo puts a rewound change back. */
  kind: 'rewind' | 'undo';
}

export type RewindPlan =
  | { outcome: 'write'; contents: string }
  | { outcome: 'refused'; why: RewindRefusal };

/**
 * The refusals that are decided before a byte is read, in press order
 * (research 83 B.8a, E.7a, E.7b). The generation guard is first, so a press
 * bound to a picture the baseline has moved out from under refuses before the
 * re-read rather than resolving to the wrong change with the write succeeding.
 */
function beforeReadRefusal(input: RewindInput): RewindRefusal | null {
  if (input.drawnGeneration !== input.baselineGeneration) return 'baselineMoved';
  if (input.truncated) return 'fileTooLarge';
  // E.7b, option (a): a read whose UTF-8 decode produced a replacement
  // character is a file a whole-file write would damage outside the pressed
  // span. It is a byte-cheap refusal and a stated limit: a file that
  // legitimately holds U+FFFD is refused too, and that is on the record.
  if (input.fresh.includes('�')) return 'decodeLoss';
  return null;
}

/**
 * Where the baseline span `[off, off+len)` maps into the fresh file, when it
 * lies entirely inside one unchanged run, else null. Used by undo, whose
 * inverse edit replaces exactly that span with the inserted text.
 */
function locateSameSpan(
  runs: readonly RedlineRun[],
  off: number,
  len: number
): number | null {
  let base = 0;
  let file = 0;
  for (const run of runs) {
    if (run.kind === 'ins') {
      file += run.text.length;
      continue;
    }
    if (run.kind === 'del') {
      base += run.text.length;
      continue;
    }
    const start = base;
    const end = base + run.text.length;
    if (off >= start && off + len <= end) return file + (off - start);
    base = end;
    file += run.text.length;
  }
  return null;
}

/**
 * Has the pressed change been put back to the baseline in the fresh file,
 * rather than moved to something else? True when nothing in the fresh compose
 * touches the pressed baseline span: the deleted text sits there unchanged
 * (research 83 E.7's "already back to what it was"). False when a different
 * change occupies the span (E.7's "no longer in the file").
 */
function pressedSpanReverted(
  runs: readonly RedlineRun[],
  off: number,
  len: number
): boolean {
  let base = 0;
  for (const run of runs) {
    if (run.kind === 'ins') {
      const at = base;
      if (len === 0 ? at === off : at >= off && at < off + len) return false;
      continue;
    }
    const start = base;
    const end = base + run.text.length;
    base = end;
    if (run.kind !== 'del') continue;
    const overlaps = len === 0 ? start <= off && off < end : start < off + len && end > off;
    if (overlaps) return false;
  }
  return true;
}

/**
 * THE DECISION, pure over the baseline and the fresh bytes (research 83 B.3
 * with B.8a, E.7, E.7a and E.7b in front of it). It composes the fresh file
 * against the same baseline, resolves the pressed identity, and answers the
 * bytes to write or the word to refuse with. The channel's own precondition
 * closes the window between this and the write; this never trusts a stale
 * draw.
 */
export function planRewind(input: RewindInput): RewindPlan {
  const before = beforeReadRefusal(input);
  if (before !== null) return { outcome: 'refused', why: before };
  const doc = composeRedlineDocument(input.baseline, input.fresh);
  const changes = changesOf(doc.runs);
  const { pressed } = input;
  if (input.kind === 'undo') {
    // Undo re-applies the inverse edit: the pressed change was reverted, so
    // its baseline span holds the deleted text unchanged. Locate that span
    // and replace it with the inserted text. If the span is no longer intact
    // — a later edit moved it — refuse rather than write over the change.
    const loc = locateSameSpan(doc.runs, pressed.off, pressed.del.length);
    if (loc === null || input.fresh.slice(loc, loc + pressed.del.length) !== pressed.del) {
      return { outcome: 'refused', why: 'phraseMoved' };
    }
    const contents = input.fresh.slice(0, loc) + pressed.ins + input.fresh.slice(loc + pressed.del.length);
    return { outcome: 'write', contents };
  }
  const resolution = resolvePress(changes, pressed);
  if (resolution.kind === 'many') return { outcome: 'refused', why: 'ambiguous' };
  if (resolution.kind === 'one') {
    const take = new Set(changes.map((_, i) => i));
    take.delete(resolution.index);
    return { outcome: 'write', contents: mix(doc.runs, changes, take) };
  }
  return {
    outcome: 'refused',
    why: pressedSpanReverted(doc.runs, pressed.off, pressed.del.length)
      ? 'alreadyBack'
      : 'phraseMoved'
  };
}

/**
 * The channel's own answer, mapped to a refusal word the view can say, or null
 * when the write happened. `stale` and every `refused` reason gets its own
 * word so ./redline-copy can hand a person the right sentence; a reason with
 * no dedicated word falls to `io`, which is the sentence for "the system
 * refused a step" (research 83 E.5).
 */
export function rewindRefusalKey(result: FsGuardedWriteResult): RewindRefusal | null {
  if (result.outcome === 'wrote') return null;
  if (result.outcome === 'stale') return 'stale';
  switch (result.why) {
    case 'outside':
      return 'outsideRoot';
    case 'notUtf8':
      return 'decodeLoss';
    case 'tooLarge':
      return 'fileTooLarge';
    case 'readOnly':
      return 'readOnly';
    case 'raced':
      return 'raced';
    default:
      return 'io';
  }
}
