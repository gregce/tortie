/**
 * THE CARRIAGE DOOR: the eight commands that may cross a machine's control
 * connection to scroll a session or type into one, and nothing else (Phase
 * 320.1; the eighth, Phase 337).
 *
 * WHY THIS EXISTS. Issue 31 (Jake Levirne): "Expect it to scroll just like a
 * local session does. Instead, nothing scrolls." A session on this Mac scrolls
 * through tmux copy mode over the long-lived control client
 * (src/main/tmux/scroll.ts). A session on another machine could not, because
 * research 57 §3.1 refused any interactive write over that machine's control
 * connection: it was the one carriage with no gate. Research 130 §4 answered
 * that refusal by giving it a gate, and the operator approved the narrowing on
 * 2026-09-23 for the control connection ONLY. The exec plane's ledger
 * (`REMOTE_VERB_LEDGER` in ./exec-plane.ts) gains no row, Phase 89's typing
 * door is untouched, and no open `-X` family exists anywhere.
 *
 * THE GATE IS THIS TABLE. Every argv a machine's scroll runner is handed is
 * checked against it BEFORE a byte is written, element for element, and an
 * argv that matches no row is refused with no call to the connection at all.
 * Every row targets a session by its immutable `$N` and carries whole numbers,
 * fixed words or single bytes written as two lowercase hex digits; no caller's
 * string reaches the far side. In particular:
 *
 *  - the read's `-F` value must be `REMOTE_STATE_FORMAT` itself, compared with
 *    `===`. A caller supplied format on this long-lived connection RUNS PROGRAMS
 *    on the far machine: research 130 investigator B sent `#(touch …)` over an
 *    emulated control carriage and the file was created on 3.6a and 3.7b. So
 *    this module names no format of its own; it imports the one `scroll.ts`
 *    reads a machine with. That is not this Mac's tab-separated
 *    `STATE_FORMAT`, which the table REFUSES: a machine's control client may
 *    have no UTF-8 locale, tmux then answers every tab as `_`, and a read that
 *    cannot be read is a pane parked where Tortie believes it is live (Phase
 *    320.1's fix round, the reason is at `REMOTE_STATE_FORMAT`).
 *  - no `-l`, no key name but the eighth row's closed list, no `-K`, `-M` or
 *    `-R`, no `copy-pipe*` (which investigator B measured running a program
 *    from copy mode), no `;`, no `%` or `=` or name target, no `-c`, no `-e` on
 *    the scroll verbs, no `-u` on copy mode, and no other flag order. `-H`
 *    exists in exactly one row, the seventh, and nowhere else.
 *  - none of the five `-X` shapes can put a byte in front of the program: with
 *    no mode active each answers "not in a mode" and a raw-mode recorder took 0
 *    bytes, on both measured builds (research 130 §4).
 *
 * THE SEVENTH ROW, `type-bytes`, ON HIS WORD OF 2026-09-30 ("Yes, allow it",
 * build/p3201/SPEC.md D7). `send-keys -t $N -H hh …`: one to
 * {@link TYPED_BYTES_PER_COMMAND} elements, each exactly two lowercase hex
 * digits, carrying the UTF-8 bytes of a keystroke the person typed over a
 * session that may be scrolled back. It is written only behind a `cancel` on
 * the same connection, by {@link typedSequence}, whose one production caller
 * is `routeKey` in ./scroll-order.ts. Research 130 §4's line above stops being
 * the whole truth of the door: THIS row does put bytes in front of the
 * program, and they are exactly the bytes the same renderer's attach would
 * have carried for the same keystroke. `-H` names no key, binding or command:
 * in `cmd-send-keys.c` each of its arguments is one byte, sent as
 * `KEYC_LITERAL`, and once the `cancel` ahead of it has run on the same
 * connection no mode is active to read it as a copy-mode command. Measured for
 * the spec (§4 M3 i): `cancel` then `-H` on ONE control connection delivered
 * 600 of 600, on 3.6a and 3.7b, at every load.
 *
 * THE EIGHTH ROW, `type-key`, ON HIS WORD OF 2026-10-05 ("Every key,
 * including Ctrl-C", build/p337/SPEC.md D20). `send-keys -t $N <Name>`: exactly
 * four elements, the last ONE of the 35 names in `POCKET_SCREEN_KEY_NAMES`
 * (src/shared/ipc/pocket.ts), imported and never re-spelled, compared with
 * `===`. tmux encodes a NAME for the program's current mode exactly as it
 * encodes the same key typed at the desk (`Up` is `ESC O A` in application
 * cursor mode, `C-c` is `03`), which no byte row can do, because the bytes
 * depend on a mode only the far tmux knows (§14 M4, M9). No modifier word
 * (`M-`, `C-Up`), no function key, no second name and no flag is on the list,
 * so a name can bind nothing and run nothing; it is a key the phone's own key
 * bar sends. Four elements, so it cannot be read as any other `send-keys`
 * row (`scroll-lines` 7, `goto-line` 6, `top-line` and `cancel` 5,
 * `type-bytes` 5 to 260). It is written only behind a `cancel` on the same
 * connection, by {@link namedKeySequence}, whose one production caller is
 * `typePhoneKeys` in ./scroll-order.ts.
 *
 * The table fits the code that already ships: every argv the unmodified
 * `scroll.ts` emitted in research 130's runs, 2,224 on 3.7b and 1,144 on 3.6a,
 * matched one row, and `__tests__/p3201-scroll-shapes.test.ts` records the four
 * entry points again through this module's own check, and every sequence
 * `typedSequence` composes.
 *
 * WHAT A HOSTILE CALLER COULD STILL DO through this door is park, cancel, or
 * type into a `$N` pane its own live rows name. That is what the same
 * renderer's attach can already do to that session, and what Phase 89's door
 * does; nothing here runs a program.
 *
 * PURE. No I/O and no module state; `guardedScrollRunner` is handed the send
 * and the currency test by ./control-plane.ts, the one production caller, so the
 * rig (build/p3201) can drive the shipping check against its own client.
 * build/p3201/SPEC.md §6.3 is the spec; conformance:machines conditions 66,
 * 101 to 106 and 109 pin it.
 */

import { POCKET_SCREEN_KEY_NAMES, type PocketScreenKeyName } from '@shared/ipc/pocket';
import { gmuxError } from '../errors';
import { quoteTmuxArg } from '../tmux/control-client';
import {
  REMOTE_STATE_FORMAT,
  SCROLL_CHUNK_LINES,
  type TmuxScrollRunner
} from '../tmux/scroll';

/** The eight rows, by the name each one is known by in the spec and the gates. */
export type ScrollShapeId =
  | 'read-state'
  | 'enter-copy-mode'
  | 'scroll-lines'
  | 'goto-line'
  | 'top-line'
  | 'cancel'
  | 'type-bytes'
  | 'type-key';

/** The row that reads a pane, by id. ./scroll-order.ts orders answers by the writes of it. */
export const READING_SHAPE: ScrollShapeId = 'read-state';

/**
 * The row that puts a live pane into copy mode, by id. ./scroll-order.ts marks
 * a pane parked the moment it is written, and names no tmux verb of its own.
 */
export const PARKING_SHAPE: ScrollShapeId = 'enter-copy-mode';

/**
 * The row that takes a pane out of copy mode, by id. ./scroll-order.ts marks a
 * pane live the moment it is written: on one connection, everything written
 * after it reaches a live pane until the next {@link PARKING_SHAPE}.
 */
export const LEAVING_SHAPE: ScrollShapeId = 'cancel';

/** One element of a row. */
type ShapeSlot =
  /** Exactly this word. */
  | { readonly kind: 'word'; readonly word: string }
  /** One of these words. */
  | { readonly kind: 'one-of'; readonly words: readonly string[] }
  /** A session's immutable `$N`. */
  | { readonly kind: 'target' }
  /** A whole number, written plainly, inside the range. */
  | { readonly kind: 'int'; readonly min: number; readonly max: number }
  /** `REMOTE_STATE_FORMAT`, compared with `===`. */
  | { readonly kind: 'state-format' }
  /**
   * THE REST OF THE ARGV, and only as a row's LAST slot (the seventh row):
   * between `min` and `max` elements, each one byte written as exactly two
   * lowercase hex digits, `^[0-9a-f]{2}$`. One spelling: `6A`, `0x61`, `6` and
   * `061` are refused.
   */
  | { readonly kind: 'hex-bytes'; readonly min: number; readonly max: number };

/** One command that may cross, and why it is safe to send again. */
export interface ScrollShape {
  readonly id: ScrollShapeId;
  readonly argv: readonly ShapeSlot[];
  /** True when sending it twice leaves the pane where sending it once does. */
  readonly idempotent: boolean;
  /**
   * What a repeat does, MEASURED (research 130 §4), because research 57's
   * at-least-once principle still governs: Tortie can never know whether a
   * command whose answer was lost ran or not.
   */
  readonly repeat: string;
}

/** The largest line a `goto-line` may name: tmux reads it as a C int. */
export const GOTO_LINE_MAX = 2_147_483_647;

/**
 * The most bytes one typed command carries (build/p3201/SPEC.md D7). A chunk
 * longer than this is split across several commands, each written in the same
 * tick and kept in order by the one connection. 256 bytes is about 790
 * characters of control-mode line, far under any line tmux reads, and a
 * 16 KB paste is 64 commands.
 */
export const TYPED_BYTES_PER_COMMAND = 256;

const word = (w: string): ShapeSlot => ({ kind: 'word', word: w });
const TARGET: ShapeSlot = { kind: 'target' };

/**
 * THE TABLE. Eight rows, exactly three of them not idempotent (`scroll-lines`,
 * `type-bytes` and `type-key`). A ninth row is a new door and is refused by
 * conformance:machines condition 102 until the table, the gate and its
 * ablation move together, and the operator has said yes to it, as he did to
 * the seventh on 2026-09-30 and to the eighth on 2026-10-05.
 */
export const SCROLL_SHAPES: readonly ScrollShape[] = [
  {
    id: 'read-state',
    argv: [word('display-message'), word('-p'), word('-t'), TARGET, word('-F'), { kind: 'state-format' }],
    idempotent: true,
    repeat: 'A read: it prints the pinned format and changes nothing, so a repeat is simply the newer answer.'
  },
  {
    id: 'enter-copy-mode',
    argv: [word('copy-mode'), word('-e'), word('-t'), TARGET],
    idempotent: true,
    repeat: 'Idempotent, measured: entering copy mode twice kept the view at position 100.'
  },
  {
    id: 'scroll-lines',
    argv: [
      word('send-keys'),
      word('-t'),
      TARGET,
      word('-X'),
      word('-N'),
      { kind: 'int', min: 1, max: SCROLL_CHUNK_LINES },
      { kind: 'one-of', words: ['scroll-up', 'scroll-down'] }
    ],
    idempotent: false,
    repeat:
      'NOT idempotent: a repeat moves the view again. Its only effect is where the view sits, so it is ' +
      'never retried; with no mode active it answers "not in a mode" and types 0 bytes.'
  },
  {
    id: 'goto-line',
    argv: [word('send-keys'), word('-t'), TARGET, word('-X'), word('goto-line'), { kind: 'int', min: 0, max: GOTO_LINE_MAX }],
    idempotent: true,
    repeat: 'Idempotent, measured: an absolute seek to line 100 twice read 100 and 100.'
  },
  {
    id: 'top-line',
    argv: [word('send-keys'), word('-t'), TARGET, word('-X'), word('top-line')],
    idempotent: true,
    repeat: 'Idempotent: the copy cursor is already on the top row after the first; with no mode it answers "not in a mode" and types 0 bytes.'
  },
  {
    id: 'cancel',
    argv: [word('send-keys'), word('-t'), TARGET, word('-X'), word('cancel')],
    idempotent: true,
    repeat: 'Idempotent, measured: a second cancel answers "not in a mode" and the pane stays live.'
  },
  {
    id: 'type-bytes',
    argv: [
      word('send-keys'),
      word('-t'),
      TARGET,
      word('-H'),
      { kind: 'hex-bytes', min: 1, max: TYPED_BYTES_PER_COMMAND }
    ],
    idempotent: false,
    repeat:
      'NOT idempotent: it TYPES, and a repeat types the same keys twice. It is never retried: a typed ' +
      'command that was written and got no answer is left as it is (research 57\'s at-most-once), and ' +
      'the session core leaves the next key on this connection, behind a cancel.'
  },
  {
    id: 'type-key',
    argv: [word('send-keys'), word('-t'), TARGET, { kind: 'one-of', words: POCKET_SCREEN_KEY_NAMES }],
    idempotent: false,
    repeat:
      'NOT idempotent: it TYPES a key, and a repeat types it twice. It is never retried; a key whose ' +
      'answer was lost is left as it is.'
  }
];

/**
 * A session's immutable id on its own server: `$` then a whole number with no
 * leading zero, at most nine digits. Never a `%` pane, an `=` exact name or a
 * name, each of which could name a different session than the row read.
 */
export const SCROLL_TARGET = /^\$(0|[1-9][0-9]{0,8})$/;

/** A whole number written plainly: no sign, space, `0x`, exponent, leading zero or non-ASCII digit. */
const PLAIN_INTEGER = /^(0|[1-9][0-9]*)$/;

/** One byte, one spelling: exactly two lowercase hex digits. */
const HEX_BYTE = /^[0-9a-f]{2}$/;

/** Why one element does not fit its slot, or null when it does. The argv itself is never named. */
function slotRefusal(slot: ShapeSlot, value: unknown): string | null {
  if (typeof value !== 'string') return 'is not a string';
  switch (slot.kind) {
    case 'word':
      return value === slot.word ? null : 'is not the word this shape names';
    case 'one-of':
      return slot.words.includes(value) ? null : 'is not one of the words this shape names';
    case 'target':
      return SCROLL_TARGET.test(value) ? null : 'is not a session id';
    case 'int': {
      if (!PLAIN_INTEGER.test(value)) return 'is not a whole number written plainly';
      const n = Number(value);
      return Number.isSafeInteger(n) && n >= slot.min && n <= slot.max
        ? null
        : 'is outside the range this shape allows';
    }
    case 'state-format':
      return value === REMOTE_STATE_FORMAT ? null : 'is not the pinned read format';
    case 'hex-bytes':
      return HEX_BYTE.test(value) ? null : 'is not one byte written as two lowercase hex digits';
  }
}

/**
 * How many elements a row takes: exactly its slot count, or, for a row whose
 * last slot is `hex-bytes`, the slots before it plus between that slot's `min`
 * and `max` elements.
 */
function arityOf(shape: ScrollShape): { readonly min: number; readonly max: number } {
  const last = shape.argv[shape.argv.length - 1];
  if (last !== undefined && last.kind === 'hex-bytes') {
    const fixed = shape.argv.length - 1;
    return { min: fixed + last.min, max: fixed + last.max };
  }
  return { min: shape.argv.length, max: shape.argv.length };
}

/** The slot element `index` of an argv of this row must fit. A trailing `hex-bytes` slot covers every element from it on. */
function slotAt(shape: ScrollShape, index: number): ShapeSlot | undefined {
  const last = shape.argv[shape.argv.length - 1];
  if (last !== undefined && last.kind === 'hex-bytes' && index >= shape.argv.length - 1) return last;
  return shape.argv[index];
}

/** The verdict on one argv. `reason` is a short clause and never repeats the argv. */
export type ScrollArgvVerdict =
  | { readonly ok: true; readonly shape: ScrollShapeId }
  | { readonly ok: false; readonly reason: string };

/**
 * Check one argv against the table. Admitted only when EVERY element of one
 * row matches and the element count is that row's exactly (for the seventh
 * row, its four fixed elements and then 1 to {@link TYPED_BYTES_PER_COMMAND}
 * bytes).
 */
export function admitScrollArgv(args: readonly unknown[]): ScrollArgvVerdict {
  if (!Array.isArray(args)) return { ok: false, reason: 'the command is not a list' };
  const verb = args[0];
  const sameVerb = SCROLL_SHAPES.filter((shape) => {
    const first = shape.argv[0];
    return first !== undefined && first.kind === 'word' && first.word === verb;
  });
  if (sameVerb.length === 0) return { ok: false, reason: 'no shape has this verb' };
  const sameLength = sameVerb.filter((shape) => {
    const arity = arityOf(shape);
    return args.length >= arity.min && args.length <= arity.max;
  });
  if (sameLength.length === 0) {
    return { ok: false, reason: 'no shape of this verb has this many elements' };
  }
  let reason = 'no shape matches';
  for (const shape of sameLength) {
    let refused = -1;
    for (let i = 0; i < args.length; i += 1) {
      const slot = slotAt(shape, i);
      if (slot === undefined || slotRefusal(slot, args[i]) !== null) {
        refused = i;
        break;
      }
    }
    if (refused === -1) return { ok: true, shape: shape.id };
    const slot = slotAt(shape, refused);
    if (slot !== undefined) {
      reason = `element ${String(refused)} ${slotRefusal(slot, args[refused]) ?? ''}`;
    }
  }
  return { ok: false, reason };
}

/**
 * THE ONE COMPOSER OF THE SEVENTH SHAPE (build/p3201/SPEC.md D7): the
 * `cancel` that leaves copy mode, then the keystroke's bytes as `-H` commands
 * of at most {@link TYPED_BYTES_PER_COMMAND} bytes each, in order. The caller
 * writes every one of them, and a read after them, in the same tick, on one
 * connection, which is what keeps them in order (§4 M3 i).
 *
 * The `cancel` is always first, even over a pane believed live: it answers
 * "not in a mode" there and types nothing, and it is what makes sure no copy
 * mode is active to read a byte as one of its own commands. An empty `bytes`
 * composes the `cancel` alone. Every argv it composes is one the table admits,
 * for a target the table admits.
 */
export function typedSequence(target: string, bytes: Uint8Array): string[][] {
  const out: string[][] = [['send-keys', '-t', target, '-X', 'cancel']];
  for (let at = 0; at < bytes.length; at += TYPED_BYTES_PER_COMMAND) {
    const chunk = bytes.subarray(at, at + TYPED_BYTES_PER_COMMAND);
    const hex: string[] = [];
    for (const byte of chunk) hex.push(byte.toString(16).padStart(2, '0'));
    out.push(['send-keys', '-t', target, '-H', ...hex]);
  }
  return out;
}

/**
 * THE ONE COMPOSER OF THE EIGHTH SHAPE (build/p337/SPEC.md D20): the `cancel`
 * that leaves copy mode, then the one named key. Every argv it composes is one
 * the table admits, for a target the table admits. The caller writes the
 * `cancel` once ahead of a whole write and each key's own argv after it, in
 * one tick, on one connection ({@link namedKeySequence}'s second argv is the
 * key; `typePhoneKeys` in ./scroll-order.ts is its one production caller).
 *
 * `name` is typed as one of the 35, and is checked again here with `===`
 * against the contract's frozen list, because a caller's string reaching the
 * far side is exactly what this door exists to refuse.
 */
export function namedKeySequence(target: string, name: PocketScreenKeyName): string[][] {
  if (!POCKET_SCREEN_KEY_NAMES.some((known) => known === name)) {
    throw gmuxError('INVALID_INPUT', 'That key is not one Tortie sends to a machine.');
  }
  return [
    ['send-keys', '-t', target, '-X', 'cancel'],
    ['send-keys', '-t', target, name]
  ];
}

/**
 * How long one command over a machine's connection gets before its caller is
 * answered "not reachable now" (D10): 5,000 ms, the value of
 * `CONTROL_PRECHECK_TIMEOUT_MS` in ./control-plane.ts, which passes that
 * constant here itself. It is the precedent for "a one-line read that does not
 * answer".
 */
export const REMOTE_SCROLL_DEADLINE_MS = 5_000;

/**
 * A machine's carriage, as the session core asks for it (D2).
 *
 *  - `live`: the connection is up. `run` writes through the table, and
 *    `generation` names the connection it was made on, so a caller can say a
 *    thing once per connection.
 *  - `waiting`: no connected client right now (not opened yet, prechecking,
 *    reconnecting, dropped). Ask again.
 *  - `none`: this machine will not have a carriage in this run, because its
 *    tmux has no control measurement or it missed the greeting. Phase 320's
 *    pass-through is the whole of what it gets, which is today exactly.
 */
export type RemoteScrollCarriage =
  | { readonly kind: 'live'; readonly run: TmuxScrollRunner; readonly generation: number }
  | { readonly kind: 'waiting' }
  | { readonly kind: 'none' };

/** What a guarded runner is built from. */
export interface GuardedScrollRunnerInput {
  /** Write one control-mode line and resolve with its block's lines. */
  readonly send: (line: string) => Promise<readonly string[]>;
  /** True while the connection the runner was made on is still the machine's current one (D6). */
  readonly isCurrent: () => boolean;
  /** Which server the runner reaches, e.g. `machine:<id>` (D8). */
  readonly server: string;
  /** The caller-side deadline, {@link REMOTE_SCROLL_DEADLINE_MS} when not given. */
  readonly deadlineMs?: number;
}

/**
 * THE ONE COMPOSER. A runner that writes only what the table admits, only on
 * the connection it was made on, and in the order it is handed commands.
 *
 * Every call checks, in this order, and a refusal at any step calls `send`
 * zero times:
 *
 *  1. `admitScrollArgv`: an argv matching no row rejects `INVALID_INPUT`.
 *  2. `isCurrent()`: a connection that moved rejects `TMUX_UNREACHABLE`.
 *  3. only then `send`, every element through `quoteTmuxArg`.
 *
 * The write happens in the call itself, never after an await, which is what
 * lets `scroll.ts` pipeline a sequence (`ordered: true`).
 *
 * THE DEADLINE (D10) is the caller's alone. A call that does not answer in time
 * rejects its caller and LEAVES THE CLIENT'S PENDING SLOT IN PLACE: the late
 * block is still handed to its own slot, where nobody is listening, so no later
 * command is handed an answer that is not its own. That is the whole reason it
 * is not a cancel.
 */
export function guardedScrollRunner(input: GuardedScrollRunnerInput): TmuxScrollRunner {
  const deadlineMs = input.deadlineMs ?? REMOTE_SCROLL_DEADLINE_MS;
  const run = (given: readonly string[]): Promise<string> => {
    // ONE READ of the caller's list. The copy is what is checked AND what is
    // written, so a list whose elements read differently the second time (a
    // getter, a Proxy) cannot pass the table as one command and cross as
    // another. Found by the integrator's re-derivation: without the copy, an
    // argv that read `cancel` at the check wrote `copy-pipe-and-cancel`.
    const args: readonly unknown[] = Array.isArray(given) ? Array.from(given as readonly unknown[]) : given;
    const verdict = admitScrollArgv(args);
    if (!verdict.ok) {
      return Promise.reject(
        gmuxError('INVALID_INPUT', 'That scroll command is not one Tortie sends to a machine.', verdict.reason)
      );
    }
    if (!input.isCurrent()) {
      return Promise.reject(
        gmuxError('TMUX_UNREACHABLE', 'That live connection is not the one this scroll was made on.')
      );
    }
    let sent: Promise<readonly string[]>;
    try {
      // Every element is a string: the table admitted this very copy.
      sent = input.send((args as readonly string[]).map(quoteTmuxArg).join(' '));
    } catch (err) {
      return Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(gmuxError('TMUX_UNREACHABLE', 'That machine did not answer a scroll in time.'));
      }, deadlineMs);
      timer.unref?.();
      sent.then(
        (lines) => {
          clearTimeout(timer);
          resolve(lines.join('\n'));
        },
        (err: unknown) => {
          clearTimeout(timer);
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      );
    });
  };
  return Object.assign(run, { ordered: true as const, server: input.server });
}
