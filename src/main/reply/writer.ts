/**
 * THE ONE MODULE OUTSIDE THE DOOR THAT TYPES INTO A SESSION (Phase 318,
 * build/p318/SPEC.md §5.6, D5, D8 to D10, D16, D17; §Revision R3, R7, R11, R12,
 * R15, R19; research 135 §2, §3).
 *
 * The phone's door declares what it may ask for (`PocketWrites.choose` and
 * `.say` in src/main/pocket/routes.ts) and cannot name this module
 * (`conformance:pocket` R3, Y11). `src/main/capabilities.ts` builds it once and
 * hands the two verbs to `createPocketWrites` and the offer to the door's facts.
 *
 * A PRESS (`choose`) types ONE DIGIT and never an Enter: a digit alone commits
 * the option on both measured shapes, and a separate Enter approved the next,
 * unseen dialog 8 of 8 once the gap passed about 200 ms (research 135 §2.3).
 * The order is the SPEC's: the gate; the question id; one fresh reading; then a
 * FINAL CHECK with nothing awaited from it to the keystroke: the door's last
 * check asked again (`still`), the id, the `$`-id, the row, the foreground, the
 * shape, the mark and the marker. Then the id moves, and the digit goes to the
 * pane the reading captured, as two one-command lines over the core's control
 * client (about 1 to 3 ms to land; a spawned list measured 10 to 61 ms under
 * load, §Revision R7), both written in one statement, or the one spawned list
 * when the control client is down. Its outcome is the `send-keys` line's
 * (§Revision R19 a). 300 ms later it reads the screen back: ANSWERED is decided
 * by the screen or the agent's own hook, never by a keystroke; a press is never
 * retried.
 *
 * A MESSAGE (`say`) is a bracketed paste, never `send-keys -l`, which eats a
 * trailing `;`, drops a newline under extended keys and resets the terminal on
 * `-R` (research 135 §3.1). The words go into a buffer on STANDARD INPUT
 * before the reading, so the one spawn after the final check is the paste list:
 * leave copy mode, paste bracketed and delete the buffer, press Enter. Offered
 * only at the agent's own empty prompt while its own reader says idle
 * (§Revision R15, his ruling "Only when idle at its prompt").
 *
 * WHAT IT NEVER DOES. It never derives an argv element from the words, whose
 * one sink is `stdin`; it never reads an error's text, because a failed tmux
 * command's text holds its argv (research 135 §4.8); it never logs (the one log
 * line a write gets is the door's); and it sets no status. The one call that
 * touches one is `noteUserInput`, the desk's own funnel, after a read-back that
 * saw the question answered, with no hook since the press and no choice on the
 * read-back screen (D16 as the fix round amended it, §Revision R11).
 */

import { randomBytes } from 'node:crypto';
import { POCKET_NO_REPLY, POCKET_WRITE_SENTENCES, type PocketReplyOffer } from '@shared/ipc/pocket';
import { LIFECYCLE_SESSION_CHANGED, SESSION_NOT_FOUND } from '@shared/lifecycle-words';
import {
  REPLY_ANSWER_IN_SESSION,
  REPLY_FAILED,
  REPLY_NOT_READY,
  REPLY_NOT_TAKEN,
  REPLY_TEXT_CHARACTER,
  REPLY_TEXT_EMPTY,
  REPLY_TEXT_LONG,
  REPLY_TYPED_UNREAD
} from '@shared/reply-copy';
import type { Session } from '@shared/types';
import type { ActivityVerdict } from '../activity/types';
import type { PaneFacts } from '../activity/panes';
import { readProcessCommand, readProcSnapshot, type ProcSnapshot } from '../activity/process';
import { detectDialogRows, normalizeCapture } from '../activity/screen';
import type { ManifestSessionRecord } from '../manifest';
import type {
  PocketChooseInput,
  PocketReplyDrawn,
  PocketReplyOutcome,
  PocketReplyRefusal,
  PocketSayInput,
  PocketStillAllowed,
  PocketWrites
} from '../pocket/routes';
import { execTmux, quoteTmuxArg } from '../tmux';
import { replyAgentOf, replyGate, type ReplyGateRefusal, type ReplyKind } from './gate';
import { promptIsEmpty } from './input-row';
import { pressableOf } from './press-shapes';
import type { QuestionIds } from './question-id';
import {
  choiceMarkOfRows,
  pressViewOf,
  readBackWindowOf,
  readReply,
  replyOffer,
  type ReplyReadDeps
} from './reader';
import { textRefusal } from './text-rules';

/** What the writer reads from and types through, structurally. `GmuxCore` satisfies it as it stands. */
export interface ReplyCore {
  listSessions(): readonly Session[];
  /** NEW public read on core: `liveIds.get(id) ?? null`. */
  tmuxIdOf(sessionId: string): string | null;
  readonly manifest: { getSession(id: string): Pick<ManifestSessionRecord, 'status'> | undefined };
  /**
   * The core's own control client (`core.control`), structurally. The press's
   * two lines go here while it is connected (D8); `TmuxControlClient`
   * satisfies it as it stands.
   */
  readonly control: { readonly connected: boolean; sendCommand(command: string): Promise<string[]> };
  readonly activity: {
    noteUserInput(sessionId: string): void;
    nativeReadingOf(
      sessionId: string,
      agent: string,
      cwd: string,
      pane: PaneFacts,
      proc: ProcSnapshot | null
    ): ActivityVerdict | null;
  };
}

/** What the writer is built with. */
export interface ReplyDeps {
  core(): ReplyCore | null;
  turns: QuestionIds;
  /** Production: execTmux. Tests and measure:p318 inject a runner on a scratch socket. */
  run?: (args: readonly string[], options?: { stdin?: Buffer; timeoutMs?: number }) => Promise<string>;
  readProc?: () => Promise<ProcSnapshot | null>;
  readCommand?: (pid: number) => Promise<string | null>;
  sleep?: (ms: number) => Promise<void>;
  /** measure:p318 only: called in the final check's statement list, immediately before the spawn. */
  onLastCheck?: (sessionId: string) => void;
}

/** How long after a press's keystroke the screen is read back (research 135 §2.7 step 6). */
export const REPLY_READ_BACK_MS = 300;

/** Every message buffer's name starts so; the rest is an id this module mints. */
const BUFFER_PREFIX = 'tortie-say-';

const DONE: PocketReplyOutcome = Object.freeze({ outcome: 'done' });

function refused(reason: PocketReplyRefusal, sentence: string): PocketReplyOutcome {
  return { outcome: 'refused', reason, sentence };
}

function failed(sentence: string): PocketReplyOutcome {
  return { outcome: 'failed', sentence };
}

/** One tmux command as ONE control-client line, quoted the way `runScrollCommand` quotes it. */
function line(args: readonly string[]): string {
  return args.map(quoteTmuxArg).join(' ');
}

/** The production sleep. */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** The press, the message and the offer, built once over one core and one counter. */
export function createReplyVerbs(
  deps: ReplyDeps
): Pick<PocketWrites, 'choose' | 'say'> & {
  offer(session: Session, drawn: PocketReplyDrawn): Promise<PocketReplyOffer>;
} {
  const run =
    deps.run ??
    ((args: readonly string[], options?: { stdin?: Buffer; timeoutMs?: number }): Promise<string> =>
      execTmux(args, options ?? {}));
  const readProc = deps.readProc ?? readProcSnapshot;
  const readCommand = deps.readCommand ?? readProcessCommand;
  const sleep = deps.sleep ?? wait;

  const readDepsOf = (core: ReplyCore): ReplyReadDeps => ({
    run: (args) => run(args),
    readProc,
    readCommand,
    nativeReadingOf: (sessionId, agent, cwd, pane, proc) =>
      core.activity.nativeReadingOf(sessionId, agent, cwd, pane, proc)
  });

  /** A gate's refusal, in the owner's words (§5.6.1 step 1). */
  const gateRefusal = (core: ReplyCore, sessionId: string, why: ReplyGateRefusal): PocketReplyOutcome => {
    if (why === 'gone') {
      let record: Pick<ManifestSessionRecord, 'status'> | undefined;
      try {
        record = core.manifest.getSession(sessionId);
      } catch {
        record = undefined;
      }
      return refused('gone', record === undefined ? SESSION_NOT_FOUND : LIFECYCLE_SESSION_CHANGED);
    }
    if (why === 'unpressable') return refused('unpressable', REPLY_ANSWER_IN_SESSION);
    if (why === 'unsayable') return refused('unsayable', REPLY_NOT_READY);
    return refused('changed', LIFECYCLE_SESSION_CHANGED);
  };

  /** The row as every surface draws it, re-read by id. */
  const rowOf = (core: ReplyCore, sessionId: string): Session | undefined =>
    core.listSessions().find((s) => s.id === sessionId);

  async function choose(input: PocketChooseInput, still: PocketStillAllowed): Promise<PocketReplyOutcome> {
    const core = deps.core();
    if (core === null) return failed(REPLY_FAILED);
    const id = input.sessionId;
    try {
      // 1. THE GATE, over the row and the `$`-id as they are now.
      const kind: ReplyKind = 'press';
      const tmuxId = core.tmuxIdOf(id);
      const row = rowOf(core, id);
      const gate = replyGate(row, kind, tmuxId);
      if (gate !== null) return gateRefusal(core, id, gate);
      if (row === undefined || tmuxId === null) return refused('changed', LIFECYCLE_SESSION_CHANGED);
      const agent = replyAgentOf(row);
      if (agent === null) return refused('unpressable', REPLY_ANSWER_IN_SESSION);
      // 2. THE ID the phone was shown, before anything is read.
      if (deps.turns.current(id).id !== input.question) return refused('changed', LIFECYCLE_SESSION_CHANGED);
      // 3. ONE FRESH READING, its capture last.
      const reading = await readReply(row, kind, tmuxId, readDepsOf(core));
      // 4. THE FINAL CHECK, synchronous: nothing is awaited from here to the act.
      if (!still()) return refused('stopped', POCKET_WRITE_SENTENCES.stopped);
      const turn = deps.turns.current(id);
      const now = rowOf(core, id);
      const view =
        reading === null || reading.screen === null ? null : pressViewOf(agent, reading.screen, turn);
      if (
        turn.n === 0 ||
        turn.id !== input.question ||
        core.tmuxIdOf(id) !== tmuxId ||
        now === undefined ||
        now.machine !== undefined ||
        now.status !== 'needs_input' ||
        reading === null ||
        reading.tmuxId !== tmuxId ||
        !reading.agentHolds ||
        view === null ||
        view.mark !== input.mark ||
        !view.press.markers.includes(input.marker) ||
        !pressableOf(view.press).includes(input.marker)
      ) {
        return refused('changed', LIFECYCLE_SESSION_CHANGED);
      }
      // 5. The id moves, then the act, in the very next statements.
      deps.turns.bump(id, 'phone');
      const at = deps.turns.current(id);
      deps.onLastCheck?.(id);
      const pane = reading.pane.paneId;
      const startedAt = performance.now();
      const typed: Promise<boolean> = core.control.connected
        ? Promise.allSettled([
            core.control.sendCommand(line(['copy-mode', '-q', '-t', pane])),
            core.control.sendCommand(line(['send-keys', '-t', pane, '-l', '--', input.marker]))
          ]).then((outcomes) => outcomes[1]?.status === 'fulfilled')
        : run(['copy-mode', '-q', '-t', pane, ';', 'send-keys', '-t', pane, '-l', '--', input.marker]).then(
            () => true,
            () => false
          );
      // 6. THE ACT'S OUTCOME is the `send-keys` line's (§Revision R19 a).
      if (!(await typed)) return failed(REPLY_FAILED);
      // 7. THE READ-BACK, at REPLY_READ_BACK_MS after the act started.
      await sleep(Math.max(0, REPLY_READ_BACK_MS - (performance.now() - startedAt)));
      let after: string;
      try {
        after = await run(['capture-pane', '-p', '-t', pane]);
      } catch {
        return failed(REPLY_TYPED_UNREAD);
      }
      const later = deps.turns.current(id);
      const rows = detectDialogRows(normalizeCapture(after));
      const answered =
        !rows.atChoice ||
        choiceMarkOfRows(rows) !== choiceMarkOfRows(view.rows) ||
        readBackWindowOf(after) !== readBackWindowOf(reading.screen ?? '') ||
        later.hooks > at.hooks;
      if (!answered) return failed(REPLY_NOT_TAKEN);
      // 8. The desk's own funnel, unless something since the press really
      // raised a question (the fix round of 2026-10-04, build/p318/SPEC.md
      // D16 as amended): a hook since the press spoke for the status itself
      // (Claude's `PermissionRequest` is the one hook that means waiting), and
      // a choice drawn on the read-back screen is a question the monitor's own
      // tick speaks for. A `choice-gone` or a `status` bump since the press
      // raised nothing: both real agents go from their question straight to
      // idle after a decline, with no hook (Claude Code 2.1.287's registry,
      // Codex 0.160.0's title), the state machine refuses `needs_input` to
      // `idle`, and so a release skipped there left the Mac at needs input
      // with nothing on the phone able to clear it. A desk keystroke since the
      // press released it already, and a second release is a no-op.
      if (later.hooks === at.hooks && !rows.atChoice) core.activity.noteUserInput(id);
      return DONE;
    } catch {
      return failed(REPLY_FAILED);
    }
  }

  async function say(input: PocketSayInput, still: PocketStillAllowed): Promise<PocketReplyOutcome> {
    // 1. THE TEXT'S OWN RULES, each with its own sentence. Nothing is stripped.
    const rule = textRefusal(input.text);
    if (rule === 'empty') return refused('empty', REPLY_TEXT_EMPTY);
    if (rule === 'long') return refused('long', REPLY_TEXT_LONG);
    if (rule === 'character') return refused('character', REPLY_TEXT_CHARACTER);
    const core = deps.core();
    if (core === null) return failed(REPLY_FAILED);
    const id = input.sessionId;
    // 2. THE GATE.
    const kind: ReplyKind = 'say';
    const tmuxId = core.tmuxIdOf(id);
    const row = rowOf(core, id);
    const gate = replyGate(row, kind, tmuxId);
    if (gate !== null) return gateRefusal(core, id, gate);
    if (row === undefined || tmuxId === null) return refused('unsayable', REPLY_NOT_READY);
    const agent = replyAgentOf(row);
    if (agent === null) return refused('unsayable', REPLY_NOT_READY);
    // 3. Where the count stands before anything is read.
    const n0 = deps.turns.current(id).n;
    // 4. THE BUFFER, before the reading (D10), named by an id minted here.
    const name = BUFFER_PREFIX + randomBytes(16).toString('hex');
    let pasted = false;
    try {
      await run(['load-buffer', '-b', name, '-'], { stdin: Buffer.from(input.text, 'utf8') });
      // 5. ONE FRESH READING, styled, its capture last.
      const reading = await readReply(row, kind, tmuxId, readDepsOf(core));
      // 6. THE FINAL CHECK, synchronous: nothing is awaited from here to the paste.
      if (!still()) return refused('stopped', POCKET_WRITE_SENTENCES.stopped);
      const now = rowOf(core, id);
      if (
        deps.turns.current(id).n !== n0 ||
        core.tmuxIdOf(id) !== tmuxId ||
        now === undefined ||
        now.machine !== undefined ||
        (now.status !== 'running' && now.status !== 'idle') ||
        reading === null ||
        reading.tmuxId !== tmuxId ||
        !reading.agentHolds ||
        reading.native === null ||
        reading.native.state !== 'idle' ||
        reading.screen === null ||
        !promptIsEmpty(agent, reading.screen, reading.cursor)
      ) {
        return refused('unsayable', REPLY_NOT_READY);
      }
      // 7. The id moves, then the one paste list, in the very next statements.
      deps.turns.bump(id, 'phone');
      deps.onLastCheck?.(id);
      const pane = reading.pane.paneId;
      await run([
        'copy-mode', '-q', '-t', pane, ';',
        'paste-buffer', '-p', '-d', '-b', name, '-t', pane, ';',
        'send-keys', '-t', pane, 'Enter'
      ]);
      pasted = true;
      // 8. It reached the session as a paste at the desk would (D17).
      return DONE;
    } catch {
      return failed(REPLY_FAILED);
    } finally {
      // The words leave the server on every path the paste did not take them.
      if (!pasted) await run(['delete-buffer', '-b', name]).catch(() => undefined);
    }
  }

  return {
    choose,
    say,
    offer(session: Session, drawn: PocketReplyDrawn): Promise<PocketReplyOffer> {
      const core = deps.core();
      if (core === null) return Promise.resolve(POCKET_NO_REPLY);
      return replyOffer(session, drawn, {
        ...readDepsOf(core),
        turns: deps.turns,
        tmuxIdOf: (sessionId) => core.tmuxIdOf(sessionId)
      });
    }
  };
}
