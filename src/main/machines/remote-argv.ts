/**
 * Where one machine keeps one program (Phase 72, M5, research 51 section 4.3).
 *
 * Shaped exactly like `./remote-path.ts`, which reads the whole list of places a
 * machine looks for programs. This module asks the narrower question, being
 * where THAT machine keeps ONE named program, and it asks it the same way: over
 * the machine's own login shell, inside the same marker pair, with a refusal
 * rather than a guess when the answer is not an absolute path.
 *
 * ## Why the answer is recorded and never sent
 *
 * The manifest is the source of truth for restore, and CLAUDE.md's rule is that
 * `argv` and `resume_argv` always use absolute binary paths. A row for a session
 * on another machine has to obey that rule with THAT MACHINE'S path, because a
 * path read on this Mac names nothing over there. So the captured path goes into
 * the row's `argv[0]` and into the recovery contract's `bin`, both bound to the
 * row's `machine_id`.
 *
 * It does NOT go on any command line. The launch stays BY BARE NAME on both
 * sides, for two different reasons that happen to point the same way:
 *
 *  - Locally, an absolute `argv[0]` made every durable Tortie agent the one
 *    process on the machine that `pkill -f "$(command -v claude)"` matches
 *    (CLAUDE.md, Phase 12.7 F3).
 *  - Remotely, the machine's own program search list is what knows where that
 *    machine keeps its programs, and it is already written into that server's
 *    environment by `./remote-server.ts` (`./remote-sessions.ts`
 *    `remoteLaunchArgv` states the same rule at the create).
 *
 * So the recorded path is EVIDENCE about a machine, not an instruction. It is
 * what lets a person read a row and see which copy of a program a session
 * launched, and it is what
 * {@link assertArgvBelongsToMachine} compares before any restore composes
 * anything.
 *
 * ## What is refused rather than quoted
 *
 * A bare name that is not a plain program name. The command below puts the name
 * inside a single quoted shell word on another computer, and the honest way to
 * be safe about that is to refuse anything that could end the quote rather than
 * to escape it and hope. Every agent id Tortie can launch, compiled or
 * configured, is plain by construction, so nothing legitimate is refused here.
 */

import { gmuxError } from '../errors';
import { REMOTE_PATH_MARKER } from './carriage';
import type { RemoteMachineContext } from './context';
import { execRemoteShell } from './exec-plane';
import {
  RESTORE_WRONG_MACHINE,
  noRemoteProgramRefusal
} from './remote-copy';

/** The refusal sentence, re-exported so one import reaches the whole seam. */
export { noRemoteProgramRefusal };

const REMOTE_ARGV_RE = /__TORTIE_PATH__(.*?)__TORTIE_PATH__/s;

/**
 * The characters a bare program name may hold.
 *
 * Letters, digits, dot, underscore, plus and minus. No slash, because a bare
 * name is what the machine's own search list resolves and a path is not that. No
 * quote, no space and no shell metacharacter, because the name is placed inside
 * a single quoted word on the far side.
 */
const PLAIN_PROGRAM_NAME = /^[A-Za-z0-9._+-]+$/;

/**
 * How long the far side's login shell gets to answer.
 *
 * 10,000 ms, the same budget {@link REMOTE_PATH_TIMEOUT_MS} gives the same shell
 * on the same connection, and for the same reason: a login file that reads a
 * network mount is slow and still correct.
 */
export const REMOTE_ARGV_TIMEOUT_MS = 10_000;

/**
 * The command Tortie asks the machine's own login shell to run.
 *
 * `-lc` rather than `-lic`, matching `./remote-path.ts`: there is no terminal on
 * this connection, and an interactive shell reading from a pipe prints job
 * control noise for nothing. `"$SHELL"` is quoted so an account whose shell path
 * holds a space still works. The marker pair is printed around the value so a
 * chatty login file on that machine cannot be read as the answer.
 *
 * `command -v` is the POSIX spelling. `which` is not in POSIX and behaves
 * differently across the shells a machine might run.
 */
export function remoteWhichCommand(bare: string): string {
  return (
    `"$SHELL" -lc 'printf ${REMOTE_PATH_MARKER}%s${REMOTE_PATH_MARKER} ` +
    `"$(command -v ${bare} 2>/dev/null)"'`
  );
}

/**
 * Read the answer out of what the machine printed. Pure.
 *
 * Returns null for every case that is one answer to the caller: the markers
 * never arrived, they arrived empty, and they arrived carrying something that is
 * not an absolute path. A shell builtin or an alias prints a bare word rather
 * than a path, and a bare word is not an answer to the question that was asked.
 */
export function parseRemoteWhich(text: string): string | null {
  const match = REMOTE_ARGV_RE.exec(text);
  if (match === null) return null;
  const value = (match[1] ?? '').trim();
  if (value.length < 2) return null;
  if (!value.startsWith('/')) return null;
  // One line only. A printf of a multi line value means the shell answered
  // something other than one path and Tortie will not pick a line out of it.
  if (value.includes('\n')) return null;
  return value;
}

/**
 * Capture where ONE machine keeps ONE program.
 *
 * @throws GmuxError INVALID_INPUT when the name is not a plain program name, or
 *   when the machine gave no usable answer. Both are refusals rather than
 *   fallbacks: a guessed path is how the wrong copy of a program runs, and the
 *   operator would have no way to see that happening.
 */
export async function captureRemoteArgv(
  ctx: RemoteMachineContext,
  bare: string
): Promise<string> {
  if (!PLAIN_PROGRAM_NAME.test(bare)) {
    throw gmuxError(
      'INVALID_INPUT',
      noRemoteProgramRefusal(bare, ctx.machineId),
      `${JSON.stringify(bare)} is not a plain program name, so Tortie will ` +
        `not ask ${ctx.machineId} about it`
    );
  }
  const out = await execRemoteShell(ctx, remoteWhichCommand(bare), {
    timeoutMs: REMOTE_ARGV_TIMEOUT_MS
  });
  const path = parseRemoteWhich(out);
  if (path === null) {
    throw gmuxError(
      'INVALID_INPUT',
      noRemoteProgramRefusal(bare, ctx.machineId),
      `the login shell on ${ctx.host} printed ${String(out.length)} byte(s) ` +
        `with no absolute path between the markers`
    );
  }
  return path;
}

/**
 * Refuse to act on a row whose recorded machine is not the machine in hand.
 *
 * Called on every remote restore, and on every local restore of a row that
 * carries a machine other than this Mac. A path captured on one machine can
 * never be used to launch on another, and the sentence says exactly that.
 *
 * @throws GmuxError INVALID_INPUT with {@link RESTORE_WRONG_MACHINE}.
 */
export function assertArgvBelongsToMachine(
  recordedMachineId: string,
  targetMachineId: string
): void {
  if (recordedMachineId === targetMachineId) return;
  throw gmuxError(
    'INVALID_INPUT',
    RESTORE_WRONG_MACHINE,
    `the row records machine ${JSON.stringify(recordedMachineId)} and the ` +
      `restore would run on ${JSON.stringify(targetMachineId)}`
  );
}
