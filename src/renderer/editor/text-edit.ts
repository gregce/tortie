/**
 * One text replaced by another, as the smallest single edit that does it
 * (Phase 237).
 *
 * Two places in the editor stream need exactly this and for the same reason:
 * ./monaco-loader's `resetWorkingModel`, which applies a file that changed
 * on disk to a live buffer, and ./redline-edits, which folds a keystroke
 * into the buffer the redline is drawn from. Both used to hand the model a
 * whole new string, and research 97 §5 measured what that costs in the
 * installed monaco-editor 0.56.0: `setValue` reaches
 * `textModel.js:342-343`'s `this._commandManager.clear()`, so the person's
 * undo stack is destroyed and the caret goes from 5:7 to 1:1. Pushing the
 * SAME bytes as one range replacement keeps both.
 *
 * The module is pure, takes and answers strings and numbers, names no model,
 * no bridge and no file, and is the reason the same arithmetic is not written
 * twice.
 *
 * THE SHAPE IS THE COMMON PREFIX AND THE COMMON SUFFIX, which is what
 * research 97 §2.1 drove for the caret and what a single range replacement
 * needs anyway. It is not a minimal diff and does not pretend to be: two
 * separated edits in one write become one range spanning both, which is
 * still one undo step and still exactly the new bytes.
 */

/** A replacement of `[start, end)` of the old text by `text`. */
export interface RangeEdit {
  start: number;
  end: number;
  text: string;
}

/**
 * How many characters the two strings share at their start, and how many at
 * their end, the two never overlapping. Code units rather than code points on
 * purpose: both callers hand the result straight to an offset based API, and
 * a surrogate pair split by the affix is put back whole by the replacement
 * text on the other side of it.
 */
export function commonAffix(
  oldText: string,
  newText: string
): { prefix: number; suffix: number } {
  const shortest = Math.min(oldText.length, newText.length);
  let prefix = 0;
  while (prefix < shortest && oldText.charCodeAt(prefix) === newText.charCodeAt(prefix)) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < shortest - prefix &&
    oldText.charCodeAt(oldText.length - 1 - suffix) ===
      newText.charCodeAt(newText.length - 1 - suffix)
  ) {
    suffix += 1;
  }
  return { prefix, suffix };
}

/**
 * The one range replacement that turns `oldText` into `newText`, or null when
 * they are already equal. `start` and `end` are offsets into the OLD text.
 */
export function rangeEditFor(oldText: string, newText: string): RangeEdit | null {
  if (oldText === newText) return null;
  const { prefix, suffix } = commonAffix(oldText, newText);
  return {
    start: prefix,
    end: oldText.length - suffix,
    text: newText.slice(prefix, newText.length - suffix)
  };
}

/**
 * Where an offset into `oldText` lands in `newText`, through the same common
 * prefix and suffix. An offset in text both sides keep moves with that text;
 * an offset inside what the write replaced lands where the replacement
 * begins, which research 97 §2.2 measured as 0 characters of error over four
 * outside-write shapes and which is a stated rule rather than a surprise.
 */
export function mapOffset(oldText: string, newText: string, offset: number): number {
  const clamped = Math.max(0, Math.min(offset, oldText.length));
  if (oldText === newText) return clamped;
  const { prefix, suffix } = commonAffix(oldText, newText);
  const oldEnd = oldText.length - suffix;
  if (clamped <= prefix) return clamped;
  if (clamped >= oldEnd) return newText.length - (oldText.length - clamped);
  return prefix;
}
