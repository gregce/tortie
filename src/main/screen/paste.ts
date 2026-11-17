/**
 * THE PASTE VERB: one text the phone pastes into a session's own terminal, as
 * a paste at the desk lands (Phase 348, build/p348/SPEC.md §4.6 steps 8 to 14,
 * D19 to D22, D50 to D52, D57, D58; his ruling of 2026-10-18, "i'd like to be
 * able to paste natively as pasting will always be into a terminal of a
 * session, just like how the clipboard normally works on a phone or on a
 * computer").
 *
 * The phone's door declares the write (`PocketWrites.paste` in
 * src/main/pocket/routes.ts) and cannot name this module (`conformance:pocket`
 * R3). src/main/capabilities.ts builds it ONCE, beside the keys verb, over the
 * same core, the same question id, the same watcher and the same last-act
 * store (./keys.ts `createScreenLastActs`), and hands it to the door's writes.
 *
 * THE ORDER (D50), each step named below where it happens:
 *
 *   1. the text rule: `pasteRefusal` (../reply/text-rules.ts); nothing read;
 *   2. the gate, over the row by id: not listed is `gone`; a status that takes
 *      no key is `unreachable`; a session on another machine is `machine`
 *      (D22: no road there keeps his text out of every command line, so a far
 *      paste is refused before the buffer and before any read); no live
 *      `$`-id is `unreachable`;
 *   2a. the gap: no act on a session sooner than `SCREEN_KEYS_GAP_MS` after
 *      its previous one, keys or paste (ONE last-act store, D57), awaited
 *      HERE, so the final check below stays synchronous;
 *   3. the words loaded into a buffer the verb names itself (`tortie-paste-`
 *      and 16 random bytes), from standard input, BEFORE the read, through
 *      the one buffer helper (../reply/buffer.ts, D52), so the one spawn
 *      after the final check is the paste list;
 *   4. ONE fresh read, its capture the last thing awaited;
 *   5. the final check, with NOTHING awaited from its first statement to the
 *      act: the door's last check asked again (`still`), the row re-read by
 *      id, the same `$`-id, typable, the pane a `%`-id, then THE ONE REFUSAL,
 *      the keys verb's: while the fresh screen is asking, or the picture the
 *      paste was sent against was (`dialog` not null), the question id now
 *      and the window's mark now must both be the ones the phone echoed, or
 *      nothing is typed;
 *   6. the question id moves, the measuring seam, then the act in ONE
 *      statement: `copy-mode -q -t <%pane> ; display-message -p -t <%pane>
 *      #{bracket_paste_flag} ; paste-buffer -p -d -b <name> -t <%pane>`, a
 *      spawned list as say's and never over the control client, with NO
 *      Enter. `paste-buffer -p` brackets where the program asked for
 *      bracketed paste, decided by the server from the pane's own mode, and
 *      sends a line feed as a carriage return, as a paste at the desk does;
 *      no `-S` (3.6a has none, and the text rule refuses every byte the two
 *      builds send differently, D58). The display types nothing: it reads
 *      that mode for main's record (Phase 325.1, his second ruled round);
 *   7. `noteUserInput` once when the list succeeded, then (Phase 325.1,
 *      build/p3251/SPEC.md D3251-8, its fix round and his second ruled round)
 *      the text as the pane received it, every line break a carriage return,
 *      between the paste's two markers when the program asked for brackets,
 *      to main's record of what he typed (`noteOwnWords`), so his own words on
 *      the screen are never read as the agent's question and a line a program
 *      sent is never kept as unsent;
 *      the watcher's nudge with the fresh read's window mark, and the
 *      session's last-act time; and in a `finally`, the buffer deleted on
 *      every path the paste did not take it (MEASURED, §2.2: a list aimed at a
 *      pane whose program exited fails and LEAVES the buffer on the server).
 *
 * WHAT IT NEVER DOES. It logs nothing (the one log line a write gets is the
 * door's), reads no error's text (a failed tmux command's text holds its
 * argv), derives no argv element from the text (its one sink is the load's
 * standard input), trims, replaces or normalizes nothing it types, holds
 * nothing on disk, retries nothing, and names no status setter but
 * `noteUserInput`, the desk's own funnel, which never raises `needs_input`.
 */

import { POCKET_SCREEN_MAX_COLS, POCKET_SCREEN_MAX_ROWS, POCKET_WRITE_SENTENCES } from '@shared/ipc/pocket';
import { LIFECYCLE_SESSION_CHANGED, SESSION_NOT_FOUND } from '@shared/lifecycle-words';
import {
  PASTE_CHARACTER,
  PASTE_EMPTY,
  PASTE_FAILED,
  PASTE_THIS_MAC_ONLY,
  PASTE_TOO_LONG,
  SCREEN_NOT_TYPABLE,
  SCREEN_QUESTION_MOVED
} from '@shared/screen-copy';
import type { Session } from '@shared/types';
import type { PocketPasteInput, PocketPasteOutcome, PocketPasteRefusal, PocketStillAllowed } from '../pocket/routes';
import { dropWords, loadWords, PASTE_BUFFER_PREFIX, type WordsRun } from '../reply/buffer';
import type { QuestionIds } from '../reply/question-id';
import { pasteRefusal } from '../reply/text-rules';
import { execTmux } from '../tmux';
import { askingOf, plainOf, windowMarkOf } from './compose';
import { NOT_TYPABLE, PANE_ID, SCREEN_KEYS_GAP_MS, type ScreenLastActs } from './keys';
import type { ScreenCore } from './read';
import type { ScreenWatch } from './watch';

/** What the paste verb reads from and types through, and nothing more. */
export interface ScreenPasteDeps {
  core(): ScreenCore | null;
  turns: QuestionIds;
  watch: Pick<ScreenWatch, 'readFresh' | 'nudge'>;
  /** The desk's own funnel: `core.activity.noteUserInput`. */
  noteUserInput(sessionId: string): void;
  /**
   * MAIN'S RECORD OF WHAT HE TYPED (Phase 325.1, build/p3251/SPEC.md D3251-8):
   * `core.activity.noteOwnWords`, handed a paste that landed as the pane
   * received it: every line break a carriage return (`LINE_FEED`, the fix
   * round), between `ESC [ 200 ~` and `ESC [ 201 ~` when the act's own list
   * read `#{bracket_paste_flag}` as 1 (his second ruled round), with no
   * markers otherwise. Production hands it
   * (src/main/capabilities.ts); a verb built without it pastes the same and
   * hands nothing.
   */
  noteOwnWords?(sessionId: string, data: string): void;
  /** THE ONE LAST-ACT STORE the keys verb holds too (D57). */
  lastActs: ScreenLastActs;
  /** The spawned runner, the load's standard input its one sink for the text. Production: `execTmux`. */
  run?: WordsRun;
  /** The measuring seam: called in the final check's statement list, immediately before the act. */
  onLastCheck?: (sessionId: string) => void;
  /** The clock 2a reads and sleeps on. Production: `performance.now` and a timer. */
  now?(): number;
  sleep?(ms: number): Promise<void>;
}

const DONE: PocketPasteOutcome = Object.freeze({ outcome: 'done' });

function refused(reason: PocketPasteRefusal, sentence: string): PocketPasteOutcome {
  return { outcome: 'refused', reason, sentence };
}

const FAILED: PocketPasteOutcome = Object.freeze({ outcome: 'failed', sentence: PASTE_FAILED });

/**
 * WHAT A PASTE LEAVES UNSENT, as main's record must read it (Phase 325.1's fix
 * round and his second ruled round). `paste-buffer -p` brackets the text only
 * for a program that asked for bracketed paste, and types every line break as
 * a carriage return either way; to a program that did not ask, each of those
 * SENDS its line. So the record is handed the paste AS THE PANE RECEIVED IT:
 * the text with every line break a carriage return, between the two paste
 * markers when the program asked for brackets (`BRACKET_PASTE_FLAG`), where
 * it keeps every line unsent as the screen does; and with no markers when it
 * did not, or when the tmux in use cannot say, where the record reads each
 * carriage return as a submit, so no line a program sent is ever kept as his.
 * Only the record is handed this; the act types the buffer as it always has.
 */
const LINE_FEED = /\n/g;

/**
 * WHETHER THE PROGRAM ASKED FOR BRACKETED PASTE (Phase 325.1, his second ruled
 * round of 2026-11-16, "325.1 a": "It will also record a paste from the phone
 * in full"): tmux's own `#{bracket_paste_flag}`, read by the act's own list
 * just before its `paste-buffer -p`, so it is the mode that paste was typed
 * under. tmux 3.7 answers `1` when the pane asked and `0` when it did not; a
 * tmux older than 3.7 has no such flag and answers an empty line (Homebrew's
 * 3.6a, build/p348/SPEC.md §2.2), which reads as not asked. Read for main's
 * record alone: the bracket is still the server's to put on, never Tortie's.
 */
const BRACKET_PASTE_FLAG = '#{bracket_paste_flag}';
/** The line `BRACKET_PASTE_FLAG` prints for a pane that asked, alone on it; anything else is not asked. */
const ASKED_FOR_BRACKETS = /^1$/m;
/** The two markers `paste-buffer -p` puts around a paste for a program that asked, as xterm sends them for one at the desk. */
const PASTE_OPENS = '\u001b[200~';
const PASTE_CLOSES = '\u001b[201~';

/** The production sleep. */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Step 1, the text's own rules in their sentences, or null when it may be pasted. Nothing is read or trimmed. */
function textOutcome(text: string): PocketPasteOutcome | null {
  if (typeof text !== 'string') return refused('character', PASTE_CHARACTER);
  const rule = pasteRefusal(text);
  if (rule === 'empty') return refused('empty', PASTE_EMPTY);
  if (rule === 'long') return refused('long', PASTE_TOO_LONG);
  if (rule === 'character') return refused('character', PASTE_CHARACTER);
  return null;
}

/** The paste verb, built once over one core, one question id, one watcher and the one last-act store. */
export function createScreenPaste(deps: ScreenPasteDeps): {
  paste(input: PocketPasteInput, still: PocketStillAllowed): Promise<PocketPasteOutcome>;
} {
  const run: WordsRun =
    deps.run ??
    ((args: readonly string[], options?: { stdin?: Buffer; timeoutMs?: number }): Promise<string> =>
      execTmux(args, options ?? {}));
  const now = deps.now ?? ((): number => performance.now());
  const sleep = deps.sleep ?? wait;
  const lastAct = deps.lastActs;

  /** The row as every surface draws it, re-read by id. */
  const rowOf = (core: ScreenCore, sessionId: string): Session | undefined =>
    core.listSessions().find((s) => s.id === sessionId);

  /** A row that is not listed, in the owner's words: never listed, or listed and since gone. */
  const goneOf = (core: ScreenCore, sessionId: string): PocketPasteOutcome => {
    let known: boolean;
    try {
      known = core.manifest.getSession(sessionId) !== undefined;
    } catch {
      known = false;
    }
    return refused('gone', known ? LIFECYCLE_SESSION_CHANGED : SESSION_NOT_FOUND);
  };

  async function paste(input: PocketPasteInput, still: PocketStillAllowed): Promise<PocketPasteOutcome> {
    const id = input.sessionId;
    // 1. THE TEXT RULE. Nothing is read, nothing trimmed.
    const rule = textOutcome(input.text);
    if (rule !== null) return rule;
    const core = deps.core();
    if (core === null) return FAILED;
    let name: string | null = null;
    let pasted = false;
    // Whether the program asked for bracketed paste, read by the act's own
    // list (`BRACKET_PASTE_FLAG`), for main's record alone.
    let bracketed = false;
    try {
      // 2. THE GATE, over the row and the `$`-id as they are now.
      const row = rowOf(core, id);
      if (row === undefined) return goneOf(core, id);
      if (NOT_TYPABLE.includes(row.status)) return refused('unreachable', SCREEN_NOT_TYPABLE);
      // D22: another machine is refused here, before the buffer and any read.
      if (row.machine !== undefined) return refused('machine', PASTE_THIS_MAC_ONLY);
      const tmuxId = core.tmuxIdOf(id);
      if (tmuxId === null) return refused('unreachable', SCREEN_NOT_TYPABLE);
      // 2a. THE GAP (D57), awaited before the buffer and the fresh read. The
      // loop asks the last act again after every wait.
      for (;;) {
        const last = lastAct.get(id);
        const left = last === undefined ? 0 : SCREEN_KEYS_GAP_MS - (now() - last);
        if (!(left > 0)) break;
        await sleep(left);
      }
      // 3. THE WORDS, into a buffer the helper names, BEFORE the read (D52).
      name = await loadWords(run, PASTE_BUFFER_PREFIX, input.text);
      // 4. ONE FRESH READ, its capture the last thing awaited.
      const fresh = await deps.watch.readFresh(row);
      if (fresh === 'unreachable' || fresh === null) return refused('unreachable', SCREEN_NOT_TYPABLE);
      // The screen's plain rows through the SAME composer the screen answer
      // comes from, and its window's mark, the one spelling of it, so what is
      // compared below is what a picture of this screen carried to the phone.
      if (fresh.display.cols > POCKET_SCREEN_MAX_COLS || fresh.display.rows > POCKET_SCREEN_MAX_ROWS) {
        return refused('unreachable', SCREEN_NOT_TYPABLE);
      }
      const plain = plainOf(fresh);
      const mark = windowMarkOf(plain);
      const pane = fresh.display.paneId;
      if (!PANE_ID.test(pane)) return refused('unreachable', SCREEN_NOT_TYPABLE);
      // The act's one list: copy mode left, the pane's bracketed-paste flag
      // read for main's record (it types nothing), then the one paste.
      const list = ['copy-mode', '-q', '-t', pane, ';', 'display-message', '-p', '-t', pane, BRACKET_PASTE_FLAG, ';', 'paste-buffer', '-p', '-d', '-b', name, '-t', pane];
      // 5. THE FINAL CHECK, synchronous: nothing is awaited from here to the act.
      if (!still()) return refused('stopped', POCKET_WRITE_SENTENCES.stopped);
      const current = rowOf(core, id);
      if (current === undefined) return goneOf(core, id);
      if (NOT_TYPABLE.includes(current.status)) return refused('unreachable', SCREEN_NOT_TYPABLE);
      if (current.machine !== undefined) return refused('changed', LIFECYCLE_SESSION_CHANGED);
      if (core.tmuxIdOf(id) !== tmuxId) return refused('changed', LIFECYCLE_SESSION_CHANGED);
      // THE ONE REFUSAL, the keys verb's (D21, D22): a paste meant for a
      // question reaches that question or nothing.
      const asking = askingOf(plain, current.status);
      const dialog = asking ? mark : null;
      if (
        (asking || input.dialog !== null) &&
        (input.turn !== deps.turns.current(id).id || input.dialog !== dialog)
      ) {
        return refused('changed', SCREEN_QUESTION_MOVED);
      }
      // 6. The id moves, the seam, then the act in ONE statement.
      deps.turns.bump(id, 'phone');
      deps.onLastCheck?.(id);
      const act: Promise<boolean> = run(list).then(
        (answer) => {
          // The list's one line of output: the flag, read just before the paste.
          bracketed = ASKED_FOR_BRACKETS.test(answer);
          return true;
        },
        // A list that failed may have stopped part way; nothing is claimed
        // pasted, so the status funnel is not asked and the buffer is dropped.
        () => false
      );
      const actAt = now();
      pasted = await act;
      // 7. The last-act time, the desk's own funnel when the list succeeded,
      // and the watcher's nudge with the window mark of the read the act was
      // checked against, so the next picture waits for the program's redraw.
      // Neither may turn a paste that landed into one that says it failed.
      lastAct.set(id, actAt);
      if (pasted) {
        try {
          deps.noteUserInput(id);
        } catch {
          // The funnel is the desk's; a paste that landed stays landed.
        }
        // PHASE 325.1 (D3251-8): what landed, to main's record of what he
        // typed, after the funnel and in its own try, read as LINE_FEED says:
        // as the pane received it, bracketed when the program asked.
        const [opens, closes] = bracketed ? [PASTE_OPENS, PASTE_CLOSES] : ['', ''];
        try {
          deps.noteOwnWords?.(id, `${opens}${input.text.replace(LINE_FEED, '\r')}${closes}`);
        } catch {
          // The record is main's; a paste that landed stays landed.
        }
      }
      try {
        deps.watch.nudge(id, mark);
      } catch {
        // The next poll reads the screen on its own tick.
      }
      return pasted ? DONE : FAILED;
    } catch {
      return FAILED;
    } finally {
      // The words leave the server on every path the paste did not take them
      // (a load that failed was dropped by the helper, which named it).
      if (!pasted && name !== null) await dropWords(run, name);
    }
  }

  return { paste };
}
