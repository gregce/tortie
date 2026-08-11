/**
 * Scrollback facts and the cost model behind them (Phase 13.7).
 *
 * NEW FILE appended to src/shared — nothing existing was edited.
 *
 * Two numbers govern scrollback and they are INDEPENDENT, which is the single
 * thing the UI built on this module has to get across:
 *
 *   scrollbackLines       what a session KEEPS. tmux's `history-limit`, set
 *                         when the session starts. This is the number that
 *                         decides how far scrolling and capture can REACH.
 *   savedScrollbackLines  what COMES BACK after a restart. The lines written
 *                         into the session's reboot snapshot at quit.
 *
 * Measured (docs/research/23-scrollback-limits.md, tmux 3.6a, 2026-08-10),
 * confirmed against tmux's own `#{history_bytes}` across twelve content
 * shapes with a residual of at most one byte:
 *
 *     bytes_per_line = 40 + 5 × stored_cells + 23 × extended_cells
 *
 * The consequences that shape every estimate here:
 *  - a blank line costs 40 B — `sizeof(struct grid_line)`, the floor;
 *  - plain ASCII at 162 columns costs 850 B;
 *  - TRUECOLOUR at 162 columns costs 4,576 B — 5.4× plain, and it is the
 *    COMMON case, because claude, codex and most modern agents emit 24-bit
 *    colour by default;
 *  - 256-palette colour, bold, dim, italic and reverse are all FREE;
 *  - one truecolour escape per line costs exactly what twenty do. The cost is
 *    per-CELL state, not per-escape.
 *
 * That 114× span is why nothing here ever prints a bare figure. The estimate
 * is computed from the user's OWN sessions and always reads "about X".
 */

// ---------------------------------------------------------------------------
// The estimator
// ---------------------------------------------------------------------------

/** A typical agent at ~62 columns in 16-colour — used until there is data. */
export const BYTES_PER_LINE_FALLBACK = 463;
/** Dense truecolour at 162 columns. Nothing measured has ever exceeded it. */
export const BYTES_PER_LINE_CEILING = 4_576;
/** `sizeof(struct grid_line)`: what a blank line costs. */
export const BYTES_PER_LINE_FLOOR = 40;

/** A pane with enough depth to say something about the user's output rate. */
const MIN_DEPTH_FOR_RATE = 200;
/** Below two deep panes the sample is one session's habits, not the user's. */
const MIN_PANES_FOR_RATE = 2;

/** What one live session is holding, as tmux reports it. */
export interface PaneScrollbackFacts {
  /** Lines of scrollback above the screen (`#{history_size}`). */
  lines: number;
  /** The depth this pane was BORN with (`#{history_limit}`). */
  limit: number;
  /** Exact bytes tmux holds for it, screen included (`#{history_bytes}`). */
  bytes: number;
  /** Visible rows (`#{pane_height}`) — part of what `bytes` covers. */
  rows: number;
}

export interface BytesPerLine {
  bytes: number;
  /**
   * True when this is the fallback rather than the user's own output, so the
   * UI can say "based on typical agent output" instead of claiming to have
   * measured something it has not.
   */
  estimated: boolean;
}

/**
 * Bytes per scrollback line, from the user's OWN sessions.
 *
 * Divides by `lines + rows`, NOT by `lines`: `#{history_bytes}` includes the
 * live screen grid, so on a shallow pane a full-width truecolour TUI screen
 * dominates the ratio by 10× (measured: one 128-line session read 1,764 B/line
 * where 190 KB of that was its 42-row screen). Panes without real depth are
 * dropped for the same reason.
 *
 * Against the user's live fleet this returns ~371 B/line.
 */
export function bytesPerLine(
  panes: readonly PaneScrollbackFacts[]
): BytesPerLine {
  const deep = panes.filter((p) => p.lines >= MIN_DEPTH_FOR_RATE);
  if (deep.length < MIN_PANES_FOR_RATE) {
    return { bytes: BYTES_PER_LINE_FALLBACK, estimated: true };
  }
  let bytes = 0;
  let lines = 0;
  for (const p of deep) {
    bytes += p.bytes;
    lines += p.lines + p.rows;
  }
  if (lines <= 0) return { bytes: BYTES_PER_LINE_FALLBACK, estimated: true };
  return {
    bytes: Math.min(
      BYTES_PER_LINE_CEILING,
      Math.max(BYTES_PER_LINE_FLOOR, bytes / lines)
    ),
    estimated: false
  };
}

// ---------------------------------------------------------------------------
// Wire shapes
// ---------------------------------------------------------------------------

/** What one session is holding — read on demand, never pushed. */
export interface SessionScrollbackFacts {
  sessionId: string;
  lines: number;
  limit: number;
  bytes: number;
}

/** Saved scrollback on disk, in userData. */
export interface SavedScrollbackFacts {
  files: number;
  bytes: number;
  largestBytes: number;
}

/**
 * The evidence the Settings card shows. Assembled ON DEMAND — one
 * `list-panes`, one directory stat, one `statfs` — and never broadcast, so
 * nothing in this shape can become an ambient number.
 */
export interface ScrollbackStats {
  /** Live sessions counted. */
  sessions: number;
  /** Lines they are holding between them. */
  lines: number;
  /** Bytes they are holding between them (`Σ #{history_bytes}`). */
  bytes: number;
  /** The live cost rate, from the user's own output. */
  perLine: BytesPerLine;
  /** The deepest session right now — the report's one named session. */
  deepest: { name: string; lines: number; limit: number } | null;
  saved: SavedScrollbackFacts;
  /** Free bytes on the volume holding userData. */
  diskFreeBytes: number;
}

/**
 * A size figure with no more precision than the estimate behind it has.
 *
 * The rate this multiplies carries roughly ±4× of real uncertainty (160
 * B/line for a settled transcript against 1,451 for an active agent, same
 * machine, same day), so "8.7 MB" would be a lie told to three significant
 * figures. Tens of megabytes round to whole numbers; single digits keep one
 * decimal because 0.9 and 1.4 are meaningfully different at that end.
 */
export function formatScrollbackBytes(bytes: number): string {
  const mb = bytes / 1024 ** 2;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 10) return `${Math.round(mb)} MB`;
  if (mb >= 0.1) return `${mb.toFixed(1)} MB`;
  return 'less than 0.1 MB';
}

/**
 * The per-session line, as it reads in the session context menu:
 *
 *     Scrollback — 4,210 of 25,000 lines · about 1.5 MB
 *
 * "about" is doing real work even though `bytes` is exact: `#{history_bytes}`
 * includes the live screen grid, which on a full-width truecolour TUI is
 * ~190 KB that is not scrollback at all.
 */
export function formatScrollbackSummary(facts: {
  lines: number;
  limit: number;
  bytes: number;
}): string {
  return (
    `Scrollback — ${facts.lines.toLocaleString()} of ` +
    `${facts.limit.toLocaleString()} lines · about ` +
    formatScrollbackBytes(facts.bytes)
  );
}

/**
 * The only things scrollback is allowed to say without being asked.
 *
 * Each is a durability EVENT with an irreversible consequence, not a reading:
 * output is being thrown away, saved sessions have grown past a gigabyte, or
 * the disk is too full to save them at all. Each speaks once, names what it
 * is about, and offers the action. Copy lives in the renderer — main sends
 * the fact, not the sentence.
 */
export interface ScrollbackNotice {
  kind: 'discarding' | 'saved-large' | 'disk-low';
  /** The session that started discarding — `discarding` only. */
  sessionName?: string;
  /** The depth it reached — `discarding` only. */
  limit?: number;
  /** Saved-scrollback bytes on disk — `saved-large` only. */
  bytes?: number;
}

/**
 * Estimated bytes ONE busy session would hold at `depth`, at the observed
 * rate. Deliberately not clamped to anything: the honest answer at 100,000
 * lines is a big number, and that number IS the guard rail.
 */
export function estimateSessionBytes(
  depth: number,
  perLine: BytesPerLine
): number {
  return Math.max(0, depth) * perLine.bytes;
}
