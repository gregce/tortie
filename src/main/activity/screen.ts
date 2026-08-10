/**
 * Tier 3 — the screen (Phase 13, research 18 §5).
 *
 * Two things come off a `capture-pane` of the VISIBLE screen: whether it
 * changed recently (weak evidence of working) and whether a dialog is on it
 * (the ONLY screen-derived route to `needs_input`).
 *
 * MASKING IS BANNED HERE, and that is a measured decision, not taste. Over
 * 337 scored transitions a plain rstrip-trimmed hash missed 25.3 % of working
 * ticks; masking the spinner glyph, elapsed timer and token counts — the
 * BACKLOG's original instruction — missed 69.5 %. During claude's thinking
 * phase the spinner line is the ONLY changing line on the screen, so masking
 * it erases the single piece of evidence that the agent is alive. What fixes
 * the misses is MEMORY, not normalization: "changed within the last K ticks"
 * with K = 5 at 1 Hz scored 0 % false negatives and 0 % false positives.
 *
 * The rstrip earns its place cheaply — gemini pads its rows, and some TUIs
 * pad to the pane width, which would otherwise churn the hash.
 */

/** Ticks of memory at a 1 s cadence (0 % FN / 0 % FP over 337 transitions). */
export const SCREEN_MEMORY_TICKS = 5;

/** Trim trailing whitespace per line and drop trailing blank lines. */
export function normalizeCapture(text: string): string {
  const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''));
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

/** FNV-1a, 12 hex chars — cheap, and only ever compared to itself. */
export function hashScreen(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(4, '0').slice(0, 4);
}

// ---------------------------------------------------------------------------
// The generic needs-input dialog detector
// ---------------------------------------------------------------------------

/**
 * ONE detector, not a regex per agent: every agent's prompt has the same
 * shape — numbered options plus a confirm hint in the bottom rows. Measured
 * 57/57 recall and 0/386 false positives across claude/codex/qwen/gemini idle
 * and working screens, and it also catches both workspace-trust gates, which
 * is exactly the startup window where claude has no pid file yet.
 *
 * Because it requires a RENDERED dialog, the Phase 9.2 self-inflicted-input
 * rule is preserved by construction: an answered dialog leaves the screen.
 */
const BORDER = /^[\s│┃║▌▏|]+|[\s│┃║▕|]+$/g;
const OPT1 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}1[.)]\s+\S/;
const OPT2 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}2[.)]\s+\S/;
const HINT =
  /(enter to (confirm|select|continue)|press enter|esc to cancel|esc to quit|use enter to select|to cancel)/i;
const QUEST = /(do you (want|trust)|would you like|how would you like)/i;

/** Rows from the bottom of the screen the dialog must live in. */
const DIALOG_ROWS = 24;

export function detectDialog(capture: string): boolean {
  const rows = capture
    .split('\n')
    .slice(-DIALOG_ROWS)
    .map((l) => l.replace(BORDER, ''));
  let opt1 = false;
  let opt2 = false;
  let hint = false;
  for (const row of rows) {
    if (!opt1 && OPT1.test(row)) opt1 = true;
    if (!opt2 && OPT2.test(row)) opt2 = true;
    if (!hint && (HINT.test(row) || QUEST.test(row))) hint = true;
  }
  return opt1 && opt2 && hint;
}

// ---------------------------------------------------------------------------
// The ⌘J excerpt
// ---------------------------------------------------------------------------

const EXCERPT_MAX = 120;

/**
 * Last non-empty line of the visible screen — the ⌘J excerpt, which used to
 * come off the renderer's byte stream and therefore only existed for the
 * VISIBLE pane. Sourced from main it works for hidden sessions too, which is
 * a capability the old path never had.
 */
export function excerptFromCapture(capture: string): string {
  const lines = capture.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = (lines[i] ?? '').trim();
    if (line.length > 0) return line.slice(0, EXCERPT_MAX);
  }
  return '';
}

/**
 * Rolling memory of one pane's screen hash.
 *
 * The predicate is "the screen CHANGED within the last K observations", which
 * is what scored 0 % FN / 0 % FP (K = 5 at 1 Hz; K = 3 gave 4.5 % FN). It is
 * not "this hash differs from the previous one" — that misses codex, which
 * repaints only when a paragraph completes and produces runs of five
 * identical captures mid-stream.
 */
export class ScreenMemory {
  private last: string | null = null;
  /** Observations since the hash last changed; starts "long ago". */
  private quiet: number;

  constructor(private readonly depth = SCREEN_MEMORY_TICKS) {
    this.quiet = depth;
  }

  note(hash: string): boolean {
    if (this.last === null) {
      // First sight of the screen is not evidence of anything.
      this.last = hash;
      this.quiet = this.depth;
    } else if (hash !== this.last) {
      this.last = hash;
      this.quiet = 0;
    } else {
      this.quiet++;
    }
    return this.quiet < this.depth;
  }

  reset(): void {
    this.last = null;
    this.quiet = this.depth;
  }
}
