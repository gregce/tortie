/**
 * A copy from the history of a session on another machine reads THAT machine
 * (Phase 320.1, build/p3201/SPEC.md D11 and §3.7).
 *
 * WHAT WAS WRONG. A drag-select that runs above the screen composes its copy
 * from `capture:pane` with an exact range of history lines (Phase 209). That
 * channel resolved the session's tmux NAME on THIS Mac's server, and the
 * renderer passes a remote session's far name, so a history selection on a
 * remote pane would have read a SAME-NAMED session on this Mac, or nothing.
 * Before Phase 320.1 no remote pane could be scrolled back, so the path could
 * not be reached; now it can, and this module is where it goes instead.
 *
 * WHAT CROSSES. Exactly two commands, both reads already on the exec plane's
 * ledger (`display-message` with `-p`, and `capture-pane` with `-p`), composed
 * by {@link remoteHistoryArgs} from a session's immutable `$N` and whole numbers
 * and nothing else. Neither scroll verb is named here: this is a read over the
 * exec plane, not the control connection's closed door in ./scroll-shapes.ts.
 * The machine is reached through `execOn` alone.
 *
 * THE TARGET is the same live address the scroll uses (`remoteScrollAddress`,
 * D4): a row listed on the machine's current connection, never a gone row, so a
 * `$N` a far restart handed to somebody else's session is never read.
 *
 * THE CLAMP is this Mac's own, `clampHistoryRange` in ../tmux/scroll.ts, which
 * src/main/capture/service.ts calls too, so a copy on a machine and a copy here
 * cut a range one way.
 *
 * THE NAME. build/p3201/SPEC.md §3.7 calls this module `remote-history.ts`, but
 * that name has belonged since Phase 107 to the commit graph of a folder on
 * another machine (./remote-history.ts, a git read over `runRemoteRead`). This
 * is a tmux pane's history, so it is named for the pane.
 */

import type { CapturePaneResult } from '@shared/ipc';
import { gmuxError } from '../errors';
import { clampHistoryRange } from '../tmux/scroll';
import { execOn } from './exec-plane';
// PHASE 342 (build/p342/SPEC.md D14). 3.2a pads every joined line with
// spaces; the joined copy takes them off behind that row's quirk.
import { farServerRow } from './far-tmux';
import { readyRemoteContext } from './ready-context';
import { stripJoinedPadding } from './remote-capsule';
import { isRemoteRecord, remoteRecordOf } from './remote-record';
import { remoteScrollAddress } from './remote-sessions';
import { SCROLL_TARGET } from './scroll-shapes';

/**
 * The extent read: history depth and screen height at one instant, the two
 * fields this Mac's `readPaneExtent` asks for, with ONE SPACE between them
 * rather than its tab (Phase 320.1's fix round).
 *
 * A machine's `tmux display-message -p` runs with whatever locale that
 * machine's sshd hands it, and tmux turns every byte below 0x20 in a format's
 * answer into `_` for a client it does not classify as UTF-8. MEASURED by the
 * Phase 320.1 attack verifier over the loopback machine's own sshd (no
 * `AcceptEnv`), 3.6a and 3.7b alike: the tab format answered `1971_30`, which
 * read as no history and no rows, and every drag-select copy on a parked
 * remote pane copied nothing. A space is printable ASCII and passes every
 * client, which is the choice `REMOTE_LIST_FORMAT` in ./remote-sessions.ts made
 * for the same measured reason. The exec plane cannot use tmux's `-u` instead,
 * because `-u` would stand where the verb ledger reads the verb.
 */
export const REMOTE_EXTENT_FORMAT = '#{history_size} #{pane_height}';

/**
 * How long a history capture may take on a machine: the 30,000 ms this Mac's
 * `capturePane` gives a big capture.
 */
export const REMOTE_HISTORY_TIMEOUT_MS = 30_000;

/** A number `capture-pane` may be handed: a whole number, sign allowed, never a fraction. */
function wholeNumber(n: number): string {
  if (!Number.isSafeInteger(n)) {
    throw gmuxError('INVALID_INPUT', "Couldn't read this session's history.", 'a range end is not a whole number');
  }
  return String(n);
}

/** A session's immutable id, or a refusal before anything is composed. */
function sessionTarget(target: string): string {
  if (!SCROLL_TARGET.test(target)) {
    throw gmuxError('INVALID_INPUT', "Couldn't read this session's history.", 'the target is not a session id');
  }
  return target;
}

/** The first of the two argvs: the extent read. */
function extentArgv(target: string): string[] {
  return ['display-message', '-p', '-t', sessionTarget(target), '-F', REMOTE_EXTENT_FORMAT];
}

/**
 * THE TWO ARGVS this module ever sends: the extent read, and the capture of
 * `paneRange` in `capture-pane`'s own numbering (0 is the top row of the live
 * screen, negative is history), with `-J` when the copy joins wrapped lines.
 *
 * Every value is `$N` or a whole number. Anything else throws before an argv
 * exists.
 */
export function remoteHistoryArgs(
  target: string,
  paneRange: { readonly start: number; readonly end: number },
  join: boolean
): readonly [extent: readonly string[], capture: readonly string[]] {
  const id = sessionTarget(target);
  return [
    extentArgv(id),
    [
      'capture-pane',
      '-p',
      '-e',
      ...(join ? ['-J'] : []),
      '-t',
      id,
      '-S',
      wholeNumber(paneRange.start),
      '-E',
      wholeNumber(paneRange.end)
    ]
  ];
}

/**
 * `display-message`'s answer: exactly one line of two whole numbers, or a
 * REFUSAL. It fails closed, where this Mac's `readPaneExtent` reads anything
 * it cannot read as zeros: an extent of zeros clamps every range to nothing,
 * which is a copy that silently comes back empty, so an answer this cannot
 * read is the channel's own refusal instead ("Couldn't read this session's
 * history."). The refusal names no byte of the answer, which is that
 * machine's text.
 */
function parseExtent(printed: string): { history: number; rows: number } {
  const lines = printed.split('\n').filter((line) => line.length > 0);
  const fields = lines.length === 1 ? (lines[0] ?? '').split(' ') : [];
  const [history, rows] = fields;
  if (
    fields.length !== 2 ||
    history === undefined ||
    rows === undefined ||
    !/^[0-9]+$/.test(history) ||
    !/^[0-9]+$/.test(rows) ||
    !Number.isSafeInteger(Number(history)) ||
    !Number.isSafeInteger(Number(rows))
  ) {
    throw gmuxError(
      'TMUX_UNREACHABLE',
      "Couldn't read this session's history.",
      'the machine answered the extent read in a shape Tortie does not read'
    );
  }
  return { history: Number(history), rows: Number(rows) };
}

/**
 * True when this id names a session on another machine, whether this run's
 * feed holds it or only the manifest does. A session on this Mac answers false
 * and its copy goes the way it always went.
 */
export function namesSessionOnMachine(sessionId: string): boolean {
  if (remoteScrollAddress(sessionId).kind !== 'unknown') return true;
  const record = remoteRecordOf(sessionId);
  return record !== null && isRemoteRecord(record);
}

/**
 * An exact range of history lines from a session on another machine, answered
 * exactly as this Mac's `captureHistoryRange` answers it: `firstLine` is the
 * history line the first row really is after the clamp, and a range that is
 * entirely gone answers nothing rather than the oldest line.
 *
 * It needs the session's LIVE address (D4). A session whose machine's live
 * connection is not up, or that has ended there, is refused, and the channel
 * says the refusal it already says for this Mac ("Couldn't read this session's
 * history."), which is not a sentence about machines.
 */
export async function readRemoteHistoryRange(
  sessionId: string,
  range: { readonly start: number; readonly end: number },
  join: boolean
): Promise<CapturePaneResult> {
  const address = remoteScrollAddress(sessionId);
  if (address.kind !== 'live') {
    throw gmuxError(
      'TMUX_UNREACHABLE',
      "Couldn't read this session's history.",
      `the session is ${address.kind} rather than listed on its machine's live connection`
    );
  }
  const ctx = readyRemoteContext(address.machineId);
  const extent = parseExtent(
    await execOn(ctx, extentArgv(address.tmuxId))
  );
  const cut = clampHistoryRange(range, extent);
  if (cut.paneRange === null) return { ansi: '', firstLine: cut.firstLine };
  const [, capture] = remoteHistoryArgs(address.tmuxId, cut.paneRange, join);
  const printed = await execOn(ctx, capture, { timeoutMs: REMOTE_HISTORY_TIMEOUT_MS });
  // PHASE 342. A copy that joins wrapped lines, from a machine whose server is
  // 3.2a, would otherwise carry every line padded with spaces past its end
  // (`stripJoinedPadding` in ./remote-capsule.ts has the measurement). An
  // unjoined copy is answered as tmux printed it, on every version.
  const ansi =
    join && farServerRow(address.machineId)?.quirks?.joinedCapturePads === true
      ? stripJoinedPadding(printed)
      : printed;
  return { ansi, firstLine: cut.firstLine };
}
