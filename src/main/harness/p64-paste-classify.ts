/**
 * THE MULTI LINE PASTE READBACK, as pure functions (Phase 64, fix round).
 *
 * ## Why this is its own module
 *
 * `./p64-paste-matrix.ts` drives real agents and imports `electron`, so nothing
 * in it can be unit tested. The part that decides what a row MEANS has no
 * business needing an Electron, and the fix round found the deciding defect in
 * exactly that part, so it lives here where a test can call it with a string.
 *
 * ## The defect this file exists because of, stated plainly
 *
 * The first version of this matrix sent three lines whose markers were
 * `<nonce> ALPHA`, `<nonce> BRAVO` and `<nonce> CHARLIE`, and asked only
 * whether each substring was somewhere on the screen. Those substrings SURVIVE
 * CONCATENATION. An agent that took all three lines and threw every line break
 * away produced a screen the classifier called `whole`, and deepseek is that
 * agent: measured on 2026-08-27 on a scratch socket, a fourteen line block
 * arrived in its Draft box as one run on paragraph reading
 * `…composed scopeTZ3354-M02 line 2 of the composed scope…`. Every line was
 * there, once, in order, and every embedded return was gone. A real payload's
 * headings and its indented paths would have run together into one paragraph,
 * and structure is the whole reason a composed block beats a hand typed one.
 *
 * So the readback below asks four questions the first one did not:
 *
 *  1. **Did two markers land on ONE line of the screen?** That is the line
 *     breaks being dropped, and it is a verdict rather than a footnote.
 *  2. **Did any marker arrive TWICE?** A block delivered twice is a defect that
 *     a presence check cannot see.
 *  3. **Did they arrive IN ORDER?** A line editor free to reorder is the
 *     reason `insert.ts` sends one call rather than several.
 *  4. **Was it collapsed into a paste chip?** claude collapses a block of this
 *     size to `[Pasted text #1 +13 lines]` and puts NO line on the screen to
 *     count, so the first classifier would have called its most used agent
 *     `lost`. The chip carries its own count and that count IS the readback.
 *
 * ## The two readings, and why there are two
 *
 * Occurrences are counted over a SQUASHED capture, being the screen with every
 * space and every box drawing rune removed. A TUI that soft wraps inside a
 * bordered composer splits a marker across two rows, measured on deepseek where
 * `TZ3354-M06` arrived as `TZ3` at the end of one row and `354-M06` at the
 * start of the next. Counting on the raw rows loses those and reports a split
 * that did not happen.
 *
 * Run on detection and arrival order are read from the RAW rows, because both
 * questions are about which row a marker is on, and squashing destroys exactly
 * that.
 */

/** How many marked lines the probe block carries. */
export const P64_PROBE_LINES = 14;

/** One marked line's marker, being the first token on that line. */
export function probeMarker(nonce: string, index: number): string {
  return `${nonce}-M${String(index + 1).padStart(2, '0')}`;
}

/**
 * The probe block. Fourteen short lines, each starting with its own marker.
 *
 * It says what it is, in the pane, in plain words, because a person who walks
 * past this machine while it runs should be able to read what is happening.
 *
 * FOURTEEN RATHER THAN THREE, and the number is not arbitrary. Three lines sit
 * inline in every agent measured, which is precisely why three lines proved
 * nothing: claude's composer collapses a paste to a chip somewhere above that,
 * and the block this feature actually ships is about eighty lines. A probe
 * measured below the threshold its subject crosses in production has measured
 * the wrong thing.
 */
export function probeBlock(nonce: string): string {
  const lines: string[] = [];
  for (let i = 0; i < P64_PROBE_LINES; i += 1) {
    lines.push(`${probeMarker(nonce, i)} line ${String(i + 1)} of the composed scope`);
  }
  return lines.join('\n');
}

/**
 * A paste chip, being a composer that shows a summary instead of the text.
 *
 * The five spellings measured hands on, 2026-08-27, on this machine:
 *
 *   claude  `[Pasted text #1 +13 lines]`
 *   gemini  `[Pasted Text: 14 lines]`
 *   qwen    `[Pasted Content 578 chars]`
 *   pi      `[paste #1 +14 lines]`
 *   grok    `[Pasted: 14 lines]`
 *
 * The pattern is deliberately loose about everything except the bracket and the
 * word, because a vendor renaming its own chip is a thing that happens and a
 * chip nobody recognises reads as a lost block, which is the worse error.
 */
const PASTE_CHIP = /\[[^\][\n]{0,60}past(?:e|ed)[^\][\n]{0,60}\]/i;

/** The number a chip is claiming, and what it is counting. */
export interface PasteChip {
  text: string;
  count: number | null;
  unit: 'lines' | 'chars' | null;
}

/** Read the chip out of a capture, or null when there is none. */
export function readChip(capture: string): PasteChip | null {
  const hit = PASTE_CHIP.exec(capture);
  if (hit === null) return null;
  const text = hit[0];
  const num = /(\d+)\s*(lines?|chars?|characters?)/i.exec(text);
  if (num === null) return { text, count: null, unit: null };
  return {
    text,
    count: Number(num[1]),
    unit: /^char/i.test(num[2] ?? '') ? 'chars' : 'lines'
  };
}

/**
 * Does the chip's own number agree with the block that was sent?
 *
 * A chip counts lines or it counts bytes, and a chip that counts lines is free
 * to count the first one as the label rather than as a line, which is what
 * claude's `+13` means for a fourteen line block. Both readings are accepted
 * and anything else is a disagreement worth a verdict.
 */
export function chipAgrees(chip: PasteChip, lines: number, bytes: number): boolean {
  if (chip.count === null) return false;
  if (chip.unit === 'chars') return chip.count === bytes;
  if (chip.unit === 'lines') return chip.count === lines || chip.count === lines - 1;
  return false;
}

/** The screen with every space and box drawing rune removed. */
export function squash(capture: string): string {
  return capture.replace(/[\s─-╿▀-▟]/g, '');
}

/** What one row read off the screen, before anything is decided about it. */
export interface PasteReadback {
  /** Occurrences of each marked line, over the squashed capture. */
  markerCounts: number[];
  /** How many of the marked lines arrived at all. */
  seen: number;
  /** 1-based marked lines that arrived more than once. */
  duplicated: number[];
  /** Rows of the capture carrying two or more markers, which is a lost break. */
  runOn: { row: number; markers: string[] }[];
  /** Marked lines in the order they appear down the screen. */
  order: number[];
  /** True when that order is ascending, which is the order they were sent in. */
  inOrder: boolean;
  /**
   * True when what is on screen is a CONTIGUOUS TAIL of the block, being lines
   * k to the last one and nothing else.
   *
   * That is the exact signature of a composer showing a window on to text
   * taller than itself, measured on cursor 2026.08.25, whose composer drew
   * lines 9 to 14 with the head scrolled out of its own box and no chip. It is
   * NOT a proof the head arrived, and `classifyPaste` does not treat it as
   * one. It is what tells a lost block apart from a scrolled one.
   */
  contiguousTail: boolean;
  /** The composer's own summary, when it drew one instead of the text. */
  chip: PasteChip | null;
  /** How far above the bottom the first marked line sat, sampled twice. */
  depth: [number, number];
  /** True when the screen kept moving after the paste. Recorded, not decisive. */
  moved: boolean;
}

/** How many rows above the bottom of a capture the FIRST marked line sits. */
export function depthOf(capture: string, nonce: string): number {
  const first = probeMarker(nonce, 0);
  const lines = capture.replace(/\s+$/, '').split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if ((lines[i] ?? '').includes(first)) return lines.length - 1 - i;
  }
  return -1;
}

/** Read a row off two captures. It decides nothing; `classifyPaste` does that. */
export function readPasteback(
  nonce: string,
  before: string,
  first: string,
  second: string
): PasteReadback {
  const markers: string[] = [];
  for (let i = 0; i < P64_PROBE_LINES; i += 1) markers.push(probeMarker(nonce, i));

  const flat = squash(second);
  const markerCounts = markers.map((m) => flat.split(m).length - 1);
  const duplicated: number[] = [];
  markerCounts.forEach((n, i) => {
    if (n > 1) duplicated.push(i + 1);
  });

  const runOn: { row: number; markers: string[] }[] = [];
  const order: number[] = [];
  const rows = second.split('\n');
  for (const [row, line] of rows.entries()) {
    const here = markers
      .map((m, i) => ({ m, i, at: line.indexOf(m) }))
      .filter((h) => h.at >= 0)
      .sort((a, b) => a.at - b.at);
    if (here.length > 1) runOn.push({ row, markers: here.map((h) => h.m) });
    for (const h of here) if (!order.includes(h.i + 1)) order.push(h.i + 1);
  }

  const seen = markerCounts.filter((n) => n > 0).length;
  const contiguousTail =
    seen > 0 &&
    order.length === seen &&
    order[order.length - 1] === P64_PROBE_LINES &&
    order.every((v, i) => i === 0 || v === (order[i - 1] ?? 0) + 1);

  return {
    markerCounts,
    seen,
    duplicated,
    runOn,
    order,
    contiguousTail,
    inOrder: order.every((v, i) => i === 0 || v > (order[i - 1] ?? 0)),
    chip: readChip(second),
    depth: [depthOf(first, nonce), depthOf(second, nonce)],
    moved: first !== second && second !== before
  };
}

/** How a row was read: off the screen, or off the composer's own chip. */
export type PasteReadKind = 'screen' | 'chip' | 'none';

export interface PasteVerdict {
  verdict: string;
  note: string;
  readKind: PasteReadKind;
}

/**
 * THE VERDICT.
 *
 * The order of the questions is the order in which an answer stops mattering.
 * A block that never arrived cannot have arrived out of order, and a block that
 * arrived as one paragraph is already the finding whatever its depth did.
 *
 * DEPTH IS STILL THE EARLY SUBMIT SIGNAL and the reason has not changed: while
 * text sits in a composer it stays the same distance off the bottom of the
 * pane, and the moment a turn starts, output is appended UNDER it and it
 * climbs. A footer that repaints on a timer makes `moved` say busy about a
 * quiet agent, which is why `moved` is recorded beside the verdict and is
 * never what decides it.
 */
export function classifyPaste(
  rb: PasteReadback,
  bytes: number
): PasteVerdict {
  // The two hard defects first. Neither is a reading a chip could excuse: a
  // block that arrived twice arrived twice, and a block whose returns were
  // dropped is one paragraph whatever the composer says it is holding.
  if (rb.duplicated.length > 0) {
    return {
      readKind: 'screen',
      verdict: 'duplicated',
      note: `line ${rb.duplicated.join(', ')} of the block is on the screen more than once, so the block arrived twice`
    };
  }
  if (rb.runOn.length > 0) {
    return {
      readKind: 'screen',
      verdict: 'run-on',
      note:
        `${String(rb.runOn.length)} row(s) of the composer carry more than one of the block's lines, ` +
        'so the line breaks were dropped and a payload would arrive as one paragraph'
    };
  }

  // THE CHIP IS THE COMPOSER'S OWN STATEMENT OF WHAT IT IS HOLDING, and it
  // outranks a partial screen. grok draws BOTH: a chip reading
  // `[Pasted: 14 lines]` and a preview panel showing lines 1 to 3, then the
  // words `⋮ (8 more lines)`, then lines 12 to 14. Reading only the screen
  // there reports six of fourteen, which is a defect that is not happening.
  if (rb.chip !== null && chipAgrees(rb.chip, P64_PROBE_LINES, bytes)) {
    return {
      readKind: 'chip',
      verdict: 'whole',
      note: `the composer says it is holding ${rb.chip.text}, and that count is the block that was sent, so it arrived whole`
    };
  }

  if (rb.seen === 0) {
    if (rb.chip !== null) {
      return {
        readKind: 'chip',
        verdict: 'chip-mismatch',
        note: `the composer collapsed the block into ${rb.chip.text}, and that count is not the ${String(P64_PROBE_LINES)} lines or ${String(bytes)} bytes that were sent`
      };
    }
    return rb.moved
      ? {
          readKind: 'none',
          verdict: 'lost',
          note: 'the screen changed when the block was sent, no marked line is on it and no paste chip is either, so the bytes went somewhere this harness cannot read'
        }
      : {
          readKind: 'none',
          verdict: 'blocked',
          // IT NO LONGER SAYS THE PANE DREW NOTHING. On 2026-08-27 antigravity
          // produced this row with its first run wizard FULLY DRAWN on the
          // screen, so the old sentence was false about the one agent it was
          // written for. What is knowable is that the screen did not change,
          // and the screen itself is on the row for a reader to judge.
          note: 'the screen did not change when the block was sent and nothing of it is readable, so this is a row about a pane that was not taking input rather than a paste verdict; the screen it was showing is on this row'
        };
  }

  if (rb.seen < P64_PROBE_LINES) {
    if (rb.contiguousTail) {
      return {
        readKind: 'screen',
        verdict: 'windowed',
        note:
          `the composer is showing a window on to the block: lines ${String(rb.order[0])} to ` +
          `${String(P64_PROBE_LINES)} are on screen, in order, on a row each, and the lines above ` +
          'them are scrolled out of the composer own box with no chip naming them, so this ' +
          'harness can say the returns were kept and cannot say the head arrived'
      };
    }
    return {
      readKind: 'screen',
      verdict: 'split',
      note: `${String(rb.seen)} of the block's ${String(P64_PROBE_LINES)} lines reached the screen, and they are not a contiguous run`
    };
  }
  if (!rb.inOrder) {
    return {
      readKind: 'screen',
      verdict: 'out-of-order',
      note: `all ${String(P64_PROBE_LINES)} lines arrived and the composer holds them as ${rb.order.join(', ')}`
    };
  }
  const [early, late] = rb.depth;
  if ((late ?? -1) > (early ?? -1)) {
    return {
      readKind: 'screen',
      verdict: 'early-submit',
      note:
        `all ${String(P64_PROBE_LINES)} lines arrived and then the first one climbed from ${String(early)} to ${String(late)} lines off the bottom, ` +
        'which is output being appended under it, which is a turn the person did not ask for'
    };
  }
  return {
    readKind: 'screen',
    verdict: 'whole',
    note:
      `all ${String(P64_PROBE_LINES)} lines are in the prompt, once each, in order, on ${String(P64_PROBE_LINES)} rows, ` +
      `and the first one stayed ${String(late)} lines off the bottom, so the embedded returns neither submitted nor collapsed`
  };
}

/**
 * The key a screen has told the reader to press, or null.
 *
 * THE DOCTRINE IS UNCHANGED AND THIS DOES NOT WIDEN IT. The harness presses
 * only what the pane itself has spelled out. deepseek's first run box carries
 * the literal sentence `Press 1/Y to trust and continue, 2/N to quit`, measured
 * on 2026-08-27, and it has no highlighted row for the selection marker
 * answerer to read, which is why it was the one agent this matrix could never
 * measure and why it is also the agent that turned out to misbehave.
 *
 * It returns the key ONLY when the sentence names an accept verb and names the
 * key for it. A screen offering a choice it does not spell out gets nothing
 * pressed at it and the row says blocked, exactly as before.
 */
export function keyNamedByScreen(capture: string): string | null {
  const hit =
    /\bpress\s+([0-9])(?:\s*\/\s*[A-Za-z])?\s+to\s+(?:trust|continue|accept|proceed|allow)\b/i.exec(
      capture
    );
  return hit === null ? null : (hit[1] ?? null);
}
