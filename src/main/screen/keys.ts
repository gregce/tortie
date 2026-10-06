/**
 * THE KEYS VERB: every key the phone types into a session's own screen
 * (Phase 337, build/p337/SPEC.md §5.4, D17 to D23, D42; his ruling of
 * 2026-10-05, "Every key, including Ctrl-C", with no Face ID on any key).
 *
 * The phone's door declares the write (`PocketWrites.keys` in
 * src/main/pocket/routes.ts) and cannot name this module (`conformance:pocket`
 * R3). src/main/capabilities.ts builds it once, beside the reply's verbs, over
 * the same core and the same question id, and hands it to the door's writes.
 *
 * THE ORDER, each step named below where it happens:
 *
 *   1. the text rule: 318's `textRefusal` on every text item, a line feed
 *      refused too (a newline is `Enter`), the total at most
 *      `POCKET_KEYS_MAX_TEXT_BYTES`; nothing read;
 *   2. the gate: the row by id, typable, and on this Mac a live `$`-id;
 *   2a. the gap (D42): no act on a session sooner than `SCREEN_KEYS_GAP_MS`
 *      after its previous one, awaited HERE, before the fresh read, so the
 *      final check below stays synchronous;
 *   3. ONE fresh read, its capture the last thing awaited;
 *   4. the final check, with NOTHING awaited from its first statement to the
 *      act: the door's last check asked again (`still`), the row re-read by
 *      id, the same `$`-id or the same machine, then THE ONE REFUSAL: while the
 *      fresh screen is asking, or the picture the keys were sent against was
 *      (`dialog` not null), the question id now and the window's mark now must
 *      both be the ones the phone echoed, or nothing is typed (D21, D22);
 *   5. the question id moves, then the act in the very next statement;
 *   6. the outcome: every `send-keys` line fulfilled is `done`, any rejected
 *      is `failed` (some keys may have reached the session; the sentence does
 *      not claim otherwise);
 *   7. the desk's own status funnel when the act typed (D23), the watcher's
 *      nudge with the fresh read's window mark (D4), and the session's
 *      last-act time for 2a.
 *
 * THE ACT, on this Mac (D18, D19): `copy-mode -q -t <%pane>` (typing returns
 * the pane to live output first, as the desk does), then per item either
 * `send-keys -t <%pane> -H <hh>…` (a text's UTF-8 bytes, at most 256 a line, so
 * it arrives as exactly the bytes typed) or `send-keys -t <%pane> <Name>` (one
 * of the contract's 35 names, so tmux encodes the key for the program's
 * current mode exactly as it encodes the same key typed at the desk). Every
 * line is written in ONE statement over the core's control client, one command
 * a line; when that client is down, ONE spawned list. NEVER `-l`: over the
 * control client it expanded `$HOME`, and as an argv it dropped a trailing `;`
 * (§14 M4). No argv element is derived from a text item but its hex bytes.
 * On another machine the act is `typeRemote`, the carriage's one phone writer
 * (`typePhoneKeys`, src/main/machines/scroll-order.ts, D20).
 *
 * WHAT THE ONE REFUSAL CANNOT CLOSE (build/p337/SPEC.md §13 item 2, restated
 * by the fix round of 2026-10-06 with the attack lens's in-app numbers). The
 * check reads a fresh capture and the act follows in the next statement, but
 * tmux reads a program's output on its own schedule and main may be busy, so
 * a question drawn just before the act can be on the program's terminal and
 * not yet in tmux's screen. The attack measured a key sent against a picture
 * with no question landing in a question already drawn 0.2 to 0.6 ms after
 * the draw on a quiet Mac, and 1.4 to 27 ms after it at a load average near
 * 200; every key sent once the question was in tmux's screen was refused. On
 * another machine the window is the network's one-way time as well. It is the
 * class of a person typing at the desk, whose window is their reaction time:
 * stated, not closed.
 *
 * WHAT IT NEVER DOES. It logs nothing (the one log line a write gets is the
 * door's), reads no error's text (a failed tmux command's text holds its argv),
 * holds nothing on disk, and names no status setter but `noteUserInput`, the
 * desk's own funnel, which never raises `needs_input`. It retries nothing: a
 * write that could not be typed now is refused or failed, and never typed
 * later.
 */

import {
  POCKET_KEYS_MAX_ITEMS,
  POCKET_KEYS_MAX_TEXT_BYTES,
  POCKET_SCREEN_KEY_NAMES,
  POCKET_SCREEN_MAX_COLS,
  POCKET_SCREEN_MAX_ROWS,
  POCKET_WRITE_SENTENCES,
  type PocketKeyItem
} from '@shared/ipc/pocket';
import { LIFECYCLE_SESSION_CHANGED, SESSION_NOT_FOUND } from '@shared/lifecycle-words';
import { REPLY_FAILED, REPLY_TEXT_EMPTY, REPLY_TEXT_LONG } from '@shared/reply-copy';
import { SCREEN_KEY_CHARACTER, SCREEN_NOT_TYPABLE, SCREEN_QUESTION_MOVED } from '@shared/screen-copy';
import type { Session, SessionStatus } from '@shared/types';
import { TYPED_BYTES_PER_COMMAND } from '../machines/scroll-shapes';
import type {
  PocketKeysInput,
  PocketReplyOutcome,
  PocketReplyRefusal,
  PocketStillAllowed
} from '../pocket/routes';
import type { QuestionIds } from '../reply/question-id';
import { textRefusal } from '../reply/text-rules';
import { execTmux, quoteTmuxArg } from '../tmux';
import { askingOf, plainOf, windowMarkOf } from './compose';
import type { ScreenCore } from './read';
import type { ScreenWatch } from './watch';

/**
 * THE GAP (D42): no keys act on a session sooner than this many ms after that
 * session's previous one. MEASURED (§Attack AM2, tmux 3.7b): an idle reader
 * read two writes 1 ms apart as two reads, but a reader busy 25 ms after its
 * previous input, which is an agent drawing, read writes up to 10 ms apart as
 * ONE read 10 of 10 times, and 20 ms or more apart as two. A program parses one
 * read as one input, and `Escape` then a key in one read is Meta-key. The
 * phone paces its own writes at 100 ms; this is the Mac's floor for two
 * phones, a retry, or a phone that does not pace. Declared here and nowhere
 * else (`conformance:pocket` Z20).
 */
export const SCREEN_KEYS_GAP_MS = 50;

/** The statuses that take no key (D23, the desk's `paneRefusesInput` for `unknown`). */
const NOT_TYPABLE: readonly SessionStatus[] = Object.freeze([
  'unknown',
  'exited',
  'restorable',
  'discarded'
] satisfies SessionStatus[]);

/** A pane on this Mac's server, as `SCREEN_FORMAT`'s first field names it. */
const PANE_ID = /^%(0|[1-9][0-9]{0,8})$/;

/** What the keys verb reads from and types through, and nothing more. */
export interface ScreenKeysDeps {
  core(): ScreenCore | null;
  turns: QuestionIds;
  watch: Pick<ScreenWatch, 'readFresh' | 'nudge'>;
  /** The desk's own funnel: `core.activity.noteUserInput`. */
  noteUserInput(sessionId: string): void;
  /** The carriage's one phone writer for a session on another machine: `typePhoneKeys`. */
  typeRemote?: (sessionId: string, keys: readonly PocketKeyItem[]) => 'carriage' | 'unreachable';
  /** The spawned fallback when the control client is down. Production: `execTmux`. Tests inject. */
  run?: (args: readonly string[]) => Promise<string>;
  /** measure:p337 only: called in the final check's statement list, immediately before the act. */
  onLastCheck?: (sessionId: string) => void;
  /** The clock 2a reads and sleeps on. Production: `performance.now` and a timer. */
  now?(): number;
  sleep?(ms: number): Promise<void>;
}

const DONE: PocketReplyOutcome = Object.freeze({ outcome: 'done' });

function refused(reason: PocketReplyRefusal, sentence: string): PocketReplyOutcome {
  return { outcome: 'refused', reason, sentence };
}

function failed(sentence: string): PocketReplyOutcome {
  return { outcome: 'failed', sentence };
}

/** One tmux command as ONE control-client line, quoted as `runScrollCommand` and the press quote it. */
function line(args: readonly string[]): string {
  return args.map(quoteTmuxArg).join(' ');
}

/** The production sleep. */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** True for one of the contract's 35 names, compared with `===`. */
function isKeyName(name: unknown): boolean {
  return POCKET_SCREEN_KEY_NAMES.some((known) => known === name);
}

/**
 * Step 1, the text rule and the write's shape, or null when the keys may be
 * typed. A text item takes 318's rules (`textRefusal`) with a line feed refused
 * too, because a line break is the `Enter` key and a pasted block of lines
 * must never run line by line; the items' text is at most
 * `POCKET_KEYS_MAX_TEXT_BYTES` in all. The door's parse already holds the
 * shape; it is asked again here because a name that is not one of the 35
 * would otherwise reach a command line, and a named key that is not alone in
 * its write would be read by the program as part of one input (D17).
 */
function keysRefusal(keys: readonly PocketKeyItem[]): PocketReplyOutcome | null {
  if (!Array.isArray(keys) || keys.length < 1 || keys.length > POCKET_KEYS_MAX_ITEMS) {
    return refused('character', SCREEN_KEY_CHARACTER);
  }
  let bytes = 0;
  let namedOther = 0;
  for (const item of keys) {
    if (typeof item !== 'object' || item === null) return refused('character', SCREEN_KEY_CHARACTER);
    if ('k' in item) {
      if (!isKeyName(item.k)) return refused('character', SCREEN_KEY_CHARACTER);
      // `BSpace` is a single 7f, never the start of a sequence, so it alone
      // may share a write with text (a CJK composition rewrite stays one write).
      if (item.k !== 'BSpace') namedOther += 1;
      continue;
    }
    if (typeof item.t !== 'string') return refused('character', SCREEN_KEY_CHARACTER);
    const rule = textRefusal(item.t);
    if (rule === 'empty') return refused('empty', REPLY_TEXT_EMPTY);
    if (rule === 'character' || item.t.includes('\n')) return refused('character', SCREEN_KEY_CHARACTER);
    bytes += Buffer.byteLength(item.t, 'utf8');
  }
  if (bytes > POCKET_KEYS_MAX_TEXT_BYTES) return refused('long', REPLY_TEXT_LONG);
  if (namedOther > 0 && keys.length !== 1) return refused('character', SCREEN_KEY_CHARACTER);
  return null;
}

/**
 * The act's argvs on this Mac (D18, D19), composed BEFORE the final check so
 * the act is the very next statement after the id moves: `copy-mode -q` first,
 * then per item its `-H` bytes in lines of at most `TYPED_BYTES_PER_COMMAND`,
 * or its one name. Nothing but hex bytes and the 35 names: no argv element is
 * the text itself.
 */
function localArgvs(pane: string, keys: readonly PocketKeyItem[]): string[][] {
  const out: string[][] = [['copy-mode', '-q', '-t', pane]];
  for (const item of keys) {
    if ('k' in item) {
      out.push(['send-keys', '-t', pane, item.k]);
      continue;
    }
    const bytes = Buffer.from(item.t, 'utf8');
    for (let at = 0; at < bytes.length; at += TYPED_BYTES_PER_COMMAND) {
      const hex: string[] = [];
      for (const byte of bytes.subarray(at, at + TYPED_BYTES_PER_COMMAND)) {
        hex.push(byte.toString(16).padStart(2, '0'));
      }
      out.push(['send-keys', '-t', pane, '-H', ...hex]);
    }
  }
  return out;
}

/** What the act came to: every `send-keys` line taken, and whether any key is known to have been typed. */
interface ActResult {
  readonly all: boolean;
  readonly any: boolean;
}

/** The keys verb, built once over one core and one question id. */
export function createScreenKeys(deps: ScreenKeysDeps): {
  keys(input: PocketKeysInput, still: PocketStillAllowed): Promise<PocketReplyOutcome>;
} {
  const run = deps.run ?? ((args: readonly string[]): Promise<string> => execTmux(args));
  const now = deps.now ?? ((): number => performance.now());
  const sleep = deps.sleep ?? wait;
  /** Per session, when its last keys act was handed to tmux (2a). Memory only. */
  const lastAct = new Map<string, number>();

  /** The row as every surface draws it, re-read by id. */
  const rowOf = (core: ScreenCore, sessionId: string): Session | undefined =>
    core.listSessions().find((s) => s.id === sessionId);

  /** A row that is not listed, in the owner's words: never listed, or listed and since gone. */
  const goneOf = (core: ScreenCore, sessionId: string): PocketReplyOutcome => {
    let known: boolean;
    try {
      known = core.manifest.getSession(sessionId) !== undefined;
    } catch {
      known = false;
    }
    return refused('gone', known ? LIFECYCLE_SESSION_CHANGED : SESSION_NOT_FOUND);
  };

  async function keys(input: PocketKeysInput, still: PocketStillAllowed): Promise<PocketReplyOutcome> {
    const id = input.sessionId;
    // 1. THE TEXT RULE, and the write's shape. Nothing is read, nothing trimmed.
    const rule = keysRefusal(input.keys);
    if (rule !== null) return rule;
    const core = deps.core();
    if (core === null) return failed(REPLY_FAILED);
    try {
      // 2. THE GATE, over the row and the `$`-id as they are now.
      const row = rowOf(core, id);
      if (row === undefined) return goneOf(core, id);
      if (NOT_TYPABLE.includes(row.status)) return refused('unreachable', SCREEN_NOT_TYPABLE);
      const machine = row.machine?.id ?? null;
      const tmuxId = machine === null ? core.tmuxIdOf(id) : null;
      if (machine === null && tmuxId === null) return refused('unreachable', SCREEN_NOT_TYPABLE);
      if (machine !== null && deps.typeRemote === undefined) return refused('unreachable', SCREEN_NOT_TYPABLE);
      // 2a. THE GAP (D42), awaited before the fresh read. The loop asks the
      // last act again after every wait, so nothing after it is read from
      // before it.
      for (;;) {
        const last = lastAct.get(id);
        const left = last === undefined ? 0 : SCREEN_KEYS_GAP_MS - (now() - last);
        if (!(left > 0)) break;
        await sleep(left);
      }
      // 3. ONE FRESH READ, its capture the last thing awaited.
      const fresh = await deps.watch.readFresh(row);
      if (fresh === 'unreachable' || fresh === null) return refused('unreachable', SCREEN_NOT_TYPABLE);
      // The screen's plain rows through the SAME composer the screen answer
      // comes from (D9, D16), and its window's mark, the one spelling of it, so
      // what is compared below is what a picture of this screen carried to
      // the phone. A screen over the width or height cap was never drawn on
      // the phone and has no rows to read: it takes no key.
      if (fresh.display.cols > POCKET_SCREEN_MAX_COLS || fresh.display.rows > POCKET_SCREEN_MAX_ROWS) {
        return refused('unreachable', SCREEN_NOT_TYPABLE);
      }
      const plain = plainOf(fresh);
      const mark = windowMarkOf(plain);
      const pane = fresh.display.paneId;
      if (machine === null && !PANE_ID.test(pane)) return refused('unreachable', SCREEN_NOT_TYPABLE);
      const argvs = machine === null ? localArgvs(pane, input.keys) : [];
      // 4. THE FINAL CHECK, synchronous: nothing is awaited from here to the act.
      if (!still()) return refused('stopped', POCKET_WRITE_SENTENCES.stopped);
      const current = rowOf(core, id);
      if (current === undefined) return goneOf(core, id);
      if (NOT_TYPABLE.includes(current.status)) return refused('unreachable', SCREEN_NOT_TYPABLE);
      if ((current.machine?.id ?? null) !== machine) return refused('changed', LIFECYCLE_SESSION_CHANGED);
      if (machine === null && core.tmuxIdOf(id) !== tmuxId) return refused('changed', LIFECYCLE_SESSION_CHANGED);
      // THE ONE REFUSAL (D21, D22): keys meant for a question reach that
      // question or nothing. Asking is the row waiting on him now or a
      // numbered question drawn on the fresh screen (D16, the composer's own
      // `askingOf`), and while asking the picture's `dialog` is the window's
      // mark.
      const asking = askingOf(plain, current.status);
      const dialog = asking ? mark : null;
      if (
        (asking || input.dialog !== null) &&
        (input.turn !== deps.turns.current(id).id || input.dialog !== dialog)
      ) {
        return refused('changed', SCREEN_QUESTION_MOVED);
      }
      // 5. The id moves, then the act, in the very next statements.
      deps.turns.bump(id, 'phone');
      deps.onLastCheck?.(id);
      const act: Promise<ActResult> =
        machine !== null
          ? Promise.resolve(deps.typeRemote?.(id, input.keys) === 'carriage').then((took) => ({ all: took, any: took }))
          : core.control.connected
            ? Promise.allSettled(argvs.map((argv) => core.control.sendCommand(line(argv)))).then((outcomes) => {
                const keyLines = outcomes.slice(1);
                return {
                  all: keyLines.every((one) => one.status === 'fulfilled'),
                  any: keyLines.some((one) => one.status === 'fulfilled')
                };
              })
            : run(argvs.flatMap((argv, i) => (i === 0 ? argv : [';', ...argv]))).then(
                () => ({ all: true, any: true }),
                // A list that failed may have stopped part way; nothing is
                // claimed typed, so the status funnel is not asked.
                () => ({ all: false, any: false })
              );
      const actAt = now();
      // 6. THE OUTCOME: every `send-keys` line fulfilled, or the carriage took it.
      const result = await act;
      lastAct.set(id, actAt);
      // 7. The desk's own funnel when the act typed (D23), and the watcher's
      // nudge with the window mark of the read the act was checked against
      // (D4), so the next picture waits for the agent's redraw. Neither may
      // turn a write that typed into one that says it failed.
      if (result.any) {
        try {
          deps.noteUserInput(id);
        } catch {
          // The funnel is the desk's; a key typed stays typed.
        }
      }
      try {
        deps.watch.nudge(id, mark);
      } catch {
        // The next poll reads the screen on its own tick.
      }
      if (result.all) return DONE;
      return machine !== null && !result.any ? refused('unreachable', SCREEN_NOT_TYPABLE) : failed(REPLY_FAILED);
    } catch {
      return failed(REPLY_FAILED);
    }
  }

  return { keys };
}
