/**
 * Reading a session's lines from a machine (Phase 125, from Phase 100).
 *
 * Seven members and one invoke channel. It reads the last lines one session on
 * one machine printed, so a person can read back what an agent over there said.
 * It writes nothing on either computer and it sends no program.
 *
 * IT IS NOT A SCROLLBAR, and research 57 section 3.1 refused one twice over. No
 * file behind this channel may name `copy-mode` or `send-keys`.
 *
 * ONE DOOR. Nothing outside src/shared/ipc/ imports this file. The barrel is
 * src/shared/ipc/machines.ts and src/shared/ipc/index.ts re-exports that. The
 * FACADE_ONLY rule in build/assert-import-boundaries.mjs fails a second door.
 *
 * MAIN: src/main/machines/ipc.ts, the one `machines:*` registrar.
 */


// ---------------------------------------------------------------------------
// The last lines one session on one machine printed (Phase 100, research 57
// section 3)
// ---------------------------------------------------------------------------
//
// ONE READ, ONE ANSWER. Nothing is written on either computer. The command that
// crosses is `capture-pane -p -e -J -t <id> -S -<n>`, which is row 5 of the verb
// ledger in src/main/machines/exec-plane.ts with `kind: 'read'` and
// `repeat: 'safe'`. No script is added to the frozen catalogue and no verb is
// added to the ledger.
//
// A REAL REMOTE SCROLLBAR IS REFUSED, and this channel is the smaller
// affordance research 57 section 3.1 adopted in its place. A scrollbar over the
// exec plane needs `copy-mode`, which is on no ledger row, and an open family of
// `send-keys -X` commands through the door Phase 89 narrowed to one fixed five
// element argv. A scrollbar over the control connection would be the first
// interactive write on the one carriage with no gate. Pulling 25,000 lines was
// measured at about 0.51 s, which is fine for a menu item and 32 times too slow
// for a wheel notch against the 16 ms budget in `WHEEL_COALESCE_MS`.
//
// NOTHING CALLS IT ON A CLOCK. A person opens the panel or presses a depth
// button, and each of those is one read.
//
// NO PROSE CROSSES THIS CHANNEL. Every sentence a person reads about a read is
// drawn by the renderer from src/renderer/machines/presentation.ts, where the
// vocabulary audit reads it. This answer carries a mode word, the body and
// counts.
//
// IT IS NOT THE SAVED OUTPUT PANEL. `machines:*` saved output is a background
// copy this Mac keeps through `storeCapsuleText`. This read goes to the machine
// when a person asks, it is not stored anywhere, and it makes no snapshot
// generation.

/** Why a read of one session's last lines answered the way it did. */
export type MachineSessionLinesMode =
  /** The lines came back. */
  | 'read'
  /** Tortie holds no row for this session on any machine right now. */
  | 'noSession'
  /** Tortie is not signed in to that machine at this moment. */
  | 'notConnected'
  /** The machine did not answer inside the deadline. */
  | 'unreachable';

/** One read of the last lines of one session on one machine. */
export interface MachineSessionLinesInput {
  /** Tortie's own id for the session. Never a name. */
  readonly sessionId: string;
  /** How far back to read. 0 is the screen alone. Clamped in main. */
  readonly lines: number;
}

/** What one machine answered about one session's last lines. */
export interface MachineSessionLinesResult {
  readonly sessionId: string;
  /** Null for every mode but 'read' when Tortie has no row to name one. */
  readonly machineId: string | null;
  readonly machineLabel: string | null;
  readonly mode: MachineSessionLinesMode;
  /** The body. Empty for every mode but 'read'. Drawn verbatim, never parsed. */
  readonly text: string;
  /** The depth asked for, after the clamp. */
  readonly asked: number;
  /** Lines in `text`. A final line with no newline after it counts as one. */
  readonly lines: number;
  /** Byte length of `text` in utf8. */
  readonly bytes: number;
  /** True when this Mac dropped the oldest bytes to fit the ceiling. */
  readonly truncated: boolean;
  /**
   * Epoch ms on THIS MAC when the answer was made.
   *
   * For a `read` it is the instant the bytes finished arriving, taken before
   * anything was stripped. For the three refusals nothing arrived, so it is the
   * instant the refusal was decided.
   */
  readonly readAt: number;
  /** Wall time from the call to the answer, in ms. The round trip is in it. */
  readonly elapsedMs: number;
}

/**
 * The deepest read the panel offers, and the hard clamp in main. 25,000.
 *
 * Research 57 section 3.2 measured this depth against the operator's Mac Pro
 * over a Tailscale path with a 6 ms ping. tmux produced 4,200,243 bytes in
 * 0.13 s and the payload crossed in 1.22 s, composed at about 0.51 s for the
 * whole read on the shorter measurement. Nothing deeper has been measured, so
 * nothing deeper is offered.
 */
export const REMOTE_SESSION_LINES_MAX = 25_000;

/**
 * What the panel reads when it opens. 1,000.
 *
 * CHOSEN rather than measured. It is deep enough to hold an agent's last answer
 * and small enough that the panel paints without a wait: research 57 section 3.2
 * measured 10,000 lines at 1,688,241 bytes and about 0.25 s composed, and 1,000
 * lines is a tenth of that.
 */
export const REMOTE_SESSION_LINES_DEFAULT = 1_000;

/**
 * The most bytes one answer may hold on this Mac. 8,388,608.
 *
 * CHOSEN at about twice the measured worst case above, so an ordinary read is
 * never cut and a runaway one is bounded. `MAX_BUFFER_BYTES` in the exec plane
 * is 64 MB, so this ceiling bites first and reports itself in
 * {@link MachineSessionLinesResult.truncated} rather than failing the call.
 */
export const REMOTE_SESSION_LINES_BYTES_MAX = 8_388_608;

/**
 * The four depths the panel offers, shallowest first.
 *
 * 0 is the screen alone, which `capture-pane -S -0` composes.
 */
export const REMOTE_SESSION_LINE_DEPTHS = [0, 1_000, 10_000, 25_000] as const;

// ---------------------------------------------------------------------------
// The channels this family declares
// ---------------------------------------------------------------------------

export interface MachinesSessionsInvokeChannelMap {
  // PHASE 100. One READ of the LAST LINES one session on one machine printed,
  // for a person who wants to read back what an agent over there said. It
  // writes nothing on either computer, it sends no program, and main refuses it
  // while it is not connected to that machine.
  //
  // THE COMMAND IS ALREADY ON THE LEDGER. `capture-pane -p -e -J -t <id> -S
  // -<n>` is row 5, with `kind: 'read'` and `repeat: 'safe'`, and
  // `remoteCaptureArgs` in src/main/machines/remote-capsule.ts already composes
  // it. Nothing about what Tortie may run on another computer moves.
  //
  // IT IS NOT A SCROLLBAR, and research 57 section 3.1 refused one twice over.
  // No file behind this channel may name `copy-mode` or `send-keys`.
  //
  // NOTHING CALLS IT ON A CLOCK. A person opens the panel or presses a depth
  // button, and each of those is one read.
  //
  // A session Tortie holds no row for, a machine that did not answer and a
  // machine Tortie is not signed in to all come back as a mode word. No prose
  // crosses this channel: the renderer draws every sentence from
  // src/renderer/machines/presentation.ts, where the vocabulary audit reads it.
  'machines:readSessionLines': {
    req: [input: MachineSessionLinesInput];
    res: MachineSessionLinesResult;
  };
}

// ---------------------------------------------------------------------------
// The bridge methods this family declares
// ---------------------------------------------------------------------------

export interface MachinesSessionsApi {
  // Phase 100. Reads the last lines one session on one machine printed, so a
  // person can read back what an agent over there said. It reads and never
  // writes, and it is not a scrollbar.
  readSessionLines(
    input: MachineSessionLinesInput
  ): Promise<MachineSessionLinesResult>;
}
