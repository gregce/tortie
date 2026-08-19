/**
 * Read the list of places another machine looks for programs (Phase 69, M2).
 *
 * ## Why this is needed at all
 *
 * A pane takes its PATH from the tmux client that asked for the session. On this
 * Mac that client is the Electron process, which is why
 * the one PATH assignment in `../tmux/user-path.ts` is load bearing.
 * On a machine reached over a connection the client is the tmux process the far
 * side's sign in program spawns, and **that command runs a non-login shell**, so
 * the machine's own login files are never read and the PATH is short. An agent
 * installed in `~/.local/bin` on that machine would not be found.
 *
 * ## The command, and why it is `-lc` rather than `-lic`
 *
 * `../tmux/resolve.ts` uses `-lic` on this Mac, because a person's aliases and
 * interactive-only lines can put directories on PATH. There is no terminal on
 * this connection, and an interactive shell reading from a pipe prints job
 * control noise for nothing. So this one is `-lc`: a login shell, not an
 * interactive one.
 *
 * ## The markers, reused rather than reinvented
 *
 * {@link REMOTE_PATH_MARKER} is the pair `./carriage.ts` already defines,
 * and it exists for the reason it is reused here: a chatty login file on the
 * other machine must not be able to corrupt the answer. An answer with no
 * absolute directory in it is treated as no answer, and no answer is a refusal
 * rather than a guess.
 *
 * ## WHAT THIS DOES NOT PROVE, and it is owed to M3
 *
 * Writing the captured value into the remote server environment with
 * `set-environment -g PATH` is what a person reads with `show-environment -g`,
 * and it is what M3 will read to compose a create. It is NOT evidence that a
 * remote pane gets that PATH. Research 47 section 2 measured the local case
 * twice: the pane takes the CLIENT's PATH, and `-g PATH` is the one variable that
 * does not reach it. M2 creates no pane, so M2 cannot measure the remote case.
 * It is recorded as owed to M3, and `build/probe-execplane.mjs` step 17 runs the
 * cheap de-risking probe rather than claiming the answer.
 */

import { shellQuoteArgv } from '../restore/command';
import { gmuxError } from '../errors';
import {
  setMachineRemotePath,
  type RemoteMachineContext
} from './context';
import { execRemoteShell } from './exec-plane';
import { REMOTE_PATH_MARKER } from './carriage';

const REMOTE_PATH_RE = /__TORTIE_PATH__(.*?)__TORTIE_PATH__/s;

/**
 * How long the far side's login shell gets to answer.
 *
 * 10,000 ms, the same budget `PATH_CAPTURE_TIMEOUT_MS` gives the shell on this
 * Mac, for the same reason: a login file that reads a network mount is slow and
 * still correct. Phase 48 raised the local number to 10 s after measuring a real
 * profile at 3.4 s.
 */
export const REMOTE_PATH_TIMEOUT_MS = 10_000;

/**
 * The command Tortie asks the machine's own login shell to run.
 *
 * `"$SHELL"` is quoted so an account whose shell path holds a space still works,
 * and the marker pair is printed around the value so a chatty login file cannot
 * be mistaken for the answer.
 */
export function remotePathCommand(): string {
  return `"$SHELL" -lc 'printf ${REMOTE_PATH_MARKER}%s${REMOTE_PATH_MARKER} "$PATH"'`;
}

/**
 * The same read with a PATH put in front of the command, for the M3 de-risking
 * probe only.
 *
 * It answers one question cheaply that M3 will otherwise have to answer while
 * building a create: does a value passed in front of the remote command reach the
 * program that runs there. Nothing in production calls it.
 */
export function remotePathWithPrefixCommand(path: string): string {
  const quoted = shellQuoteArgv([path]);
  return `PATH=${quoted} "$SHELL" -c 'printf ${REMOTE_PATH_MARKER}%s${REMOTE_PATH_MARKER} "$PATH"'`;
}

/**
 * Read the answer out of what the machine printed. Pure.
 *
 * Returns null for the three cases that are one answer to the caller: the
 * markers never arrived, they arrived empty, and they arrived carrying something
 * with no absolute directory in it.
 */
export function parseRemotePath(text: string): string | null {
  const match = REMOTE_PATH_RE.exec(text);
  if (match === null) return null;
  const value = (match[1] ?? '').trim();
  if (value.length === 0) return null;
  const hasAbsolute = value
    .split(':')
    .some((dir) => dir.startsWith('/') && dir.length > 1);
  return hasAbsolute ? value : null;
}

/**
 * The refusal when the machine would not say where it looks for programs.
 *
 * It is a refusal rather than a fallback because a guessed PATH is how the wrong
 * copy of a program runs, and the operator would have no way to see that
 * happening.
 */
export function noRemotePathRefusal(machineId: string): string {
  return (
    `Tortie could not read the list of places ${machineId} looks for programs, ` +
    `so it will not start work there. Nothing was started.`
  );
}

/**
 * Capture the machine's own login shell PATH and record it for this connection.
 *
 * Called once per connect and once per server birth, and always BEFORE any verb
 * that changes something. `./exec-plane.ts` refuses a mutating verb while the
 * PATH for the current generation is null, so the ordering is enforced rather
 * than documented.
 *
 * @throws GmuxError INVALID_INPUT when the machine gave no usable answer.
 */
export async function captureRemotePath(
  ctx: RemoteMachineContext
): Promise<string> {
  const out = await execRemoteShell(ctx, remotePathCommand(), {
    timeoutMs: REMOTE_PATH_TIMEOUT_MS
  });
  const path = parseRemotePath(out);
  if (path === null) {
    throw gmuxError(
      'INVALID_INPUT',
      noRemotePathRefusal(ctx.machineId),
      `the login shell on ${ctx.host} printed ${String(out.length)} byte(s) ` +
        `with no usable answer between the markers`
    );
  }
  setMachineRemotePath(ctx.machineId, path);
  return path;
}
