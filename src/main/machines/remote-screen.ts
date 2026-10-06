/**
 * ONE READ OF A SESSION'S SCREEN ON ANOTHER MACHINE (Phase 337,
 * build/p337/SPEC.md §5.3.3, D5, D7; in ./remote-pane-history.ts's shape).
 *
 * WHAT CROSSES. Exactly two commands in ONE exec, both reads already on the
 * exec plane's ledger (`capture-pane` with `-p`, and `display-message` with
 * `-p`), composed by {@link remoteScreenArgv} from the session's immutable `$N`
 * and the one format, `SCREEN_FORMAT` (../screen/read.ts), and nothing else: no
 * caller string reaches the argv. The machine is reached through `execOn`
 * alone, and no scroll verb or carriage row is named here: this is a read over
 * the exec plane, not the control connection's closed door in
 * ./scroll-shapes.ts. MEASURED on a loopback machine (§14 M9): 8.97 and 10.33
 * ms p50 an exec.
 *
 * THE TARGET is the session's LIVE address (`remoteScrollAddress`, the scroll's
 * own rule, D4 of Phase 320.1): a row listed on the machine's current
 * connection, never a gone row, so a `$N` a far restart handed to somebody
 * else's session is never read. Anything else is `'unreachable'`.
 *
 * THE ANSWER is the capture, then the display, so its LAST line is the
 * display and the rest the capture. A display a far tmux printed with `_`
 * where the format has tabs (a client it does not call UTF-8, as Phase 320.1
 * measured over a machine's own sshd) reads the same (`parseScreenDisplay`).
 * A capture whose row count is not the display's is still served, framed by
 * the display, because the composer fits a capture to the display's rows.
 *
 * NOTHING SIZES ANYTHING (D7), it logs nothing and it reads no error's text.
 */

import { parseScreenDisplay, SCREEN_FORMAT, type ScreenReading } from '../screen/read';
import { execOn } from './exec-plane';
import { readyRemoteContext } from './ready-context';
import { remoteScrollAddress } from './remote-sessions';
import { SCROLL_TARGET } from './scroll-shapes';

/**
 * The one argv a remote screen read sends: the styled capture, then the
 * display, aimed at a `$N`. Throws for any other target, which is a
 * programming error and never a person's input.
 */
export function remoteScreenArgv(tmuxId: string): string[] {
  if (!SCROLL_TARGET.test(tmuxId)) throw new Error('a remote screen read is aimed at a $N session id');
  return ['capture-pane', '-p', '-e', '-t', tmuxId, ';', 'display-message', '-p', '-t', tmuxId, SCREEN_FORMAT];
}

/** One exec's output as a reading: the last line the display, the rest the capture. Null when it is not one. */
export function splitRemoteRead(stdout: string): ScreenReading | null {
  const lines = stdout.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const displayLine = lines.pop();
  if (displayLine === undefined) return null;
  const display = parseScreenDisplay(displayLine);
  if (display === null) return null;
  return { styled: lines.join('\n'), display, displayLine };
}

/**
 * One read of a session on another machine, in ONE exec under `timeoutMs`
 * (the watcher's `SCREEN_REMOTE_READ_DEADLINE_MS`). `'unreachable'` when the
 * session has no live address, the machine has no ready connection, the exec
 * fails, or its answer is not a reading.
 */
export async function readScreenRemote(sessionId: string, timeoutMs: number): Promise<ScreenReading | 'unreachable'> {
  const address = remoteScrollAddress(sessionId);
  if (address.kind !== 'live') return 'unreachable';
  let stdout: string;
  try {
    const ctx = readyRemoteContext(address.machineId);
    stdout = await execOn(ctx, remoteScreenArgv(address.tmuxId), { timeoutMs });
  } catch {
    return 'unreachable';
  }
  return splitRemoteRead(stdout) ?? 'unreachable';
}
