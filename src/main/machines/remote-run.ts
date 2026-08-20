/**
 * The second door. One command on another machine's own login shell, chosen
 * from a frozen catalogue (Phase 73, M6, research 51 sections 6 and 7).
 *
 * ## What it is for
 *
 * `./exec-plane.ts` carries tmux verbs. This rung needs four things that are
 * not tmux verbs, being a directory listing, a file read, a git read and one
 * file write. All four go through this module and through nothing else.
 *
 * This is the only module in the product that asks `execRemoteShell` to run one
 * of `./remote-scripts.ts`'s scripts. `./remote-path.ts` still uses that
 * function for the program search list capture, which came first and is not a
 * catalogue script.
 *
 * ## The eight steps, and the order is the design
 *
 *  1. Look the script up by id in the catalogue. A name that is not there is
 *     refused with the catalogue sentence. Nothing is composed first, so the
 *     refusal happens before a string that could be sent exists.
 *  2. Compare the script's mode with the door that was called. A `write` script
 *     reached through {@link runRemoteRead}, or a `read` script reached through
 *     {@link runRemoteWrite}, is refused. Nothing is sent.
 *  3. Count the arguments against `script.params`. A mismatch is a programming
 *     error rather than something a person did, so it throws with the two
 *     counts in the detail and carries no sentence for a person to read.
 *  4. Ask whether the machine is answering. A machine that is not is refused
 *     and nothing is sent. **This is where connected-only lives, for every
 *     caller at once.** Item 1's harvest, item 3's image upload and item 4's
 *     review all get it from here rather than each holding its own copy.
 *  5. Read the connection generation and keep it.
 *  6. Compose ONE quoted argument and send it.
 *  7. Read the payload between the marker pair. Markers that never arrived, and
 *     markers that arrived empty, are one answer to the caller, being a refusal
 *     rather than a guess. That is `./remote-path.ts`'s own rule, reused here
 *     rather than restated.
 *  8. Read the generation again. A generation that MOVED while the command was
 *     in flight means the answer belongs to a connection Tortie no longer has,
 *     so the answer is discarded and the call refuses. This is the second half
 *     of connected-only, and it is what stops a claim outliving the connection
 *     that produced it.
 *
 * ## What may import this, and what may not
 *
 * This module imports `machineLinkFacts` from `./control-plane.ts` and
 * `machineGeneration` from `./context.ts`. Neither of those imports this one,
 * so there is no cycle. `./carriage.ts`, `./context.ts`, `./exec-plane.ts` and
 * `./control-plane.ts` must never import this module, and
 * `build/conformance-machines.mjs` condition 40 fails when one of them does.
 *
 * ## What this door does NOT do
 *
 * It does not retry. A command that failed may or may not have run on the far
 * side, and every script in the catalogue is safe to run twice, so a retry
 * would be safe. It is still the caller's decision rather than this module's,
 * because only the caller knows whether the answer is still wanted.
 *
 * It does not cache. The one thing worth remembering across calls is the far
 * side's own home directory, and `./remote-harvest.ts` remembers that per
 * generation, because a value read under one connection must not be reused
 * under another.
 */

import { gmuxError } from '../errors';
import { shellQuoteArgv } from '../restore/command';
import { machineGeneration, type RemoteMachineContext } from './context';
import { machineLinkFacts } from './control-plane';
import { execRemoteShell } from './exec-plane';
import {
  MACHINE_NOT_CONNECTED,
  SCRIPT_NOT_IN_CATALOGUE,
  WRITE_THROUGH_READ_DOOR
} from './remote-copy';
import {
  REMOTE_SCRIPT_MARKER,
  REMOTE_SCRIPT_MAX_BYTES,
  remoteScript,
  type RemoteScript,
  type RemoteScriptMode
} from './remote-scripts';

/**
 * How long one script gets before it is killed. 15,000 ms.
 *
 * Chosen rather than measured. It is longer than the 10,000 ms the program
 * search list capture gets, because a listing of a store holding a year of
 * conversations reads more of a disk than `printf "$PATH"` does. A caller that
 * knows better passes its own.
 */
export const REMOTE_RUN_TIMEOUT_MS = 15_000;

/** What a caller may change about one run. */
export interface RemoteRunOptions {
  readonly timeoutMs?: number;
}

/** One answer from one machine, and the connection it belongs to. */
export interface RemoteRunResult {
  /** What the far side printed between the markers. Never empty. */
  readonly payload: string;
  /** The connection generation the answer belongs to. */
  readonly generation: number;
  /** How many bytes the far side printed in total, markers included. */
  readonly bytes: number;
}

/**
 * The two link states that mean the machine is answering.
 *
 * `connected` is a live connection and `polling` is a machine answering on the
 * timer feed. Both are a machine that answered recently. `connecting`, `quiet`
 * and `refused` are not, and a read under any of them would be a claim about a
 * machine Tortie cannot see.
 */
const ANSWERING = new Set(['connected', 'polling']);

/** True while this machine's link is `connected` or `polling`. */
export function machineIsConnected(machineId: string): boolean {
  return ANSWERING.has(machineLinkFacts(machineId).link);
}

/**
 * The one quoted argument, composed. Pure, so the gate can read it.
 *
 * The shape is `key-install.ts`'s shape and it is the same for every script:
 * the program, the flag, the script TEXT, the name the script runs under, and
 * then the caller's values. `$0` becomes `tortie-<id>`, so an error the far
 * side's shell prints names Tortie and the script rather than `sh`.
 *
 * Every value is quoted by the one `shellQuoteArgv` call. Nothing is added
 * after it and nothing is joined by hand, so there is exactly one place in this
 * module where a value becomes part of a command line.
 */
export function composeRemoteScriptCommand(
  script: RemoteScript,
  args: readonly string[]
): string {
  return shellQuoteArgv([
    '/bin/sh',
    '-c',
    script.text,
    remoteScriptName(script.id),
    ...args
  ]);
}

/** The name a script runs under on the far side, which is its `$0`. */
export function remoteScriptName(id: string): string {
  return `tortie-${id}`;
}

const MARKER_RE = new RegExp(
  `${REMOTE_SCRIPT_MARKER}(.*?)${REMOTE_SCRIPT_MARKER}`,
  's'
);

/**
 * Read the payload out of what the far side printed. Pure.
 *
 * Returns null for the three cases that are one answer to a caller: the markers
 * never arrived, they arrived the wrong way round, and they arrived with
 * nothing between them. A login file that prints a banner cannot fake an
 * answer, because the banner is outside the pair.
 */
export function parseRemoteScriptAnswer(text: string): string | null {
  const match = MARKER_RE.exec(text);
  if (match === null) return null;
  const value = match[1] ?? '';
  return value.length === 0 ? null : value;
}

/** Run a `read` script on one machine. A `write` script is refused by mode. */
export async function runRemoteRead(
  ctx: RemoteMachineContext,
  scriptId: string,
  args: readonly string[],
  options: RemoteRunOptions = {}
): Promise<RemoteRunResult> {
  return runRemoteScript(ctx, scriptId, args, 'read', options);
}

/**
 * Run the `write` script on one machine.
 *
 * It is the only door to a write on another computer in this product. The
 * catalogue holds exactly one script with `mode: 'write'`, so this function has
 * exactly one thing it can send, and a gate holds that at one.
 */
export async function runRemoteWrite(
  ctx: RemoteMachineContext,
  scriptId: string,
  args: readonly string[],
  options: RemoteRunOptions = {}
): Promise<RemoteRunResult> {
  return runRemoteScript(ctx, scriptId, args, 'write', options);
}

/**
 * The eight steps in the header, in that order.
 *
 * @throws GmuxError INVALID_INPUT for the three refusals, and whatever
 *   `execRemoteShell` classifies a failed connection as.
 */
async function runRemoteScript(
  ctx: RemoteMachineContext,
  scriptId: string,
  args: readonly string[],
  door: RemoteScriptMode,
  options: RemoteRunOptions
): Promise<RemoteRunResult> {
  // 1. The catalogue decides, before anything is composed.
  const script = remoteScript(scriptId);
  if (script === null) {
    throw gmuxError(
      'INVALID_INPUT',
      SCRIPT_NOT_IN_CATALOGUE,
      `refused "${scriptId}" for machine ${ctx.machineId}: it is not in the ` +
        `remote script catalogue`
    );
  }
  // 2. The door and the mode have to agree.
  if (script.mode !== door) {
    throw gmuxError(
      'INVALID_INPUT',
      WRITE_THROUGH_READ_DOOR,
      `refused "${scriptId}" for machine ${ctx.machineId}: it is a ` +
        `${script.mode} script and it came through the ${door} door`
    );
  }
  // 3. A count that does not match is a programming error, not a person's.
  if (args.length !== script.params) {
    throw new Error(
      `remote script "${scriptId}" reads ${String(script.params)} value(s) and ` +
        `was given ${String(args.length)}`
    );
  }
  // 4. Connected-only, for every caller of this door at once.
  assertMachineIsConnected(ctx.machineId, scriptId);
  // 5. The connection this answer will belong to.
  const before = machineGeneration(ctx.machineId).generation;
  // 6. One quoted argument, and a length the far side's shell can accept.
  //
  // PHASE 96. The count is UTF-8 BYTES. It was `command.length`, which is
  // UTF-16 code units, and the limit it is compared against is a count of
  // bytes: it is Linux's own `MAX_ARG_STRLEN`, which caps one argument of one
  // program. Every argument this door has ever sent is ASCII, where the two
  // counts agree, so nothing shipped was ever let through by the difference.
  // It was still the wrong count in the one guard that bounds every write, and
  // a value with characters outside ASCII in it would have been measured at
  // between a half and a third of its real size.
  const command = composeRemoteScriptCommand(script, args);
  const commandBytes = Buffer.byteLength(command, 'utf8');
  if (commandBytes > REMOTE_SCRIPT_MAX_BYTES) {
    throw new Error(
      `remote script "${scriptId}" composed ${String(commandBytes)} bytes and ` +
        `the limit is ${String(REMOTE_SCRIPT_MAX_BYTES)}. The whole command ` +
        `reaches the far side as one argument of its own login shell.`
    );
  }
  const out = await execRemoteShell(ctx, command, {
    timeoutMs: options.timeoutMs ?? REMOTE_RUN_TIMEOUT_MS
  });
  // 7. An answer with nothing between the markers is a refusal, not a guess.
  const payload = parseRemoteScriptAnswer(out);
  if (payload === null) {
    throw gmuxError(
      'INVALID_INPUT',
      MACHINE_NOT_CONNECTED,
      `${ctx.machineId} answered "${scriptId}" with ${String(out.length)} ` +
        `byte(s) and nothing usable between the markers`
    );
  }
  // 8. The answer has to belong to the connection Tortie has now.
  const after = machineGeneration(ctx.machineId).generation;
  if (after !== before) {
    throw gmuxError(
      'INVALID_INPUT',
      MACHINE_NOT_CONNECTED,
      `${ctx.machineId} moved from connection ${String(before)} to ` +
        `${String(after)} while "${scriptId}" was in flight, so its answer ` +
        `belongs to a connection Tortie no longer has`
    );
  }
  return { payload, generation: before, bytes: out.length };
}

/**
 * Refuse when the machine is not answering. Exported so a caller can ask the
 * same question before it does work it would then throw away.
 *
 * @throws GmuxError INVALID_INPUT
 */
export function assertMachineIsConnected(
  machineId: string,
  what: string
): void {
  if (machineIsConnected(machineId)) return;
  throw gmuxError(
    'INVALID_INPUT',
    MACHINE_NOT_CONNECTED,
    `refused "${what}" for machine ${machineId}: its link reads ` +
      `${machineLinkFacts(machineId).link}`
  );
}
