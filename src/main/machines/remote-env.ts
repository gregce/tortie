/**
 * Which environment names Tortie may put on a session it starts on another
 * machine (Phase 73, M6, item 2).
 *
 * ## The question this module answers, and it came from research 51 section 7
 *
 * `./remote-sessions.ts` has carried an optional `env` record on
 * `remoteCreateArgs` since Phase 70. Nothing in production has ever passed one.
 * The question research 51 asked was where the bytes of such a value travel on
 * the way to the far side's `new-session -e`, and the answer decides whether the
 * field may ever be opened to a caller.
 *
 * ## The measured byte path, in one paragraph
 *
 * `build/probe-remote-env.mjs` planted a value that appears nowhere else and
 * then looked for those bytes at four points. The value is one element of the
 * argv of the sign in program running on this Mac, and the whole far side
 * command is one element of that same argv. On the far side the login shell
 * splits that one string and runs the machine's own tmux with `-e KEY=value` in
 * ITS argv. So the bytes stand in two process tables at once for as long as the
 * create takes. The numbers, the sample counts and what was not measured are in
 * docs/research/52-remote-env-and-review.md.
 *
 * ## Why this is a refusal rather than a feature
 *
 * On macOS one account cannot read another account's arguments, so on the two
 * Macs this was measured on the exposure is to this person alone. On Linux the
 * ordinary default is that `/proc/<pid>/cmdline` can be read by every account on
 * the machine, and NO LINUX MACHINE WAS MEASURED HERE. A machine row can name a
 * Linux host, and Tortie would then be putting a value on a command line whose
 * readers it has never counted.
 *
 * So Tortie sends the two names it already sends and refuses every other name.
 * Both allowed names are identifiers Tortie made for its own bookkeeping,
 * neither is a secret, and both are already readable in a pane's environment on
 * this Mac.
 *
 * ## PHASE 84 PROPOSED A THIRD NAME AND MEASUREMENT REFUSED IT
 *
 * `PATH` was going to join the set. A pane on the operator's Mac Pro gets four
 * directories, being `/usr/bin:/bin:/usr/sbin:/sbin`, its login shell's own
 * list holds ten, and `claude` is at `~/.local/bin/claude`, which is on
 * neither. So a bare name launch cannot work there, and one way out was to put
 * the right list on the `new-session` line.
 *
 * MEASURED 2026-08-18 by `build/probe-execplane.mjs` step 17c, on tmux 3.6a. A
 * session was created with `-e PATH=/p84-planted-85507:/usr/bin:/bin` and its
 * pane printed `/Users/gdc/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin`. A second
 * measurement on a scratch socket separated the two possible causes:
 * `-e FOO=bar-planted` DID reach the pane on the same line, and `-e PATH=` did
 * not, while `show-environment` read both back. So tmux takes a pane's PATH
 * from the server rather than from the session environment, and PATH is the one
 * name an `-e` pair cannot set.
 *
 * The set therefore stays at TWO. Phase 84 sends the absolute program path as
 * `argv[0]` instead, and `./remote-sessions.ts` records what that costs. An
 * allowance nothing uses would be a widening for nothing.
 *
 * The refusal sentence lives in `./remote-copy.ts` with every other sentence
 * main prints about a session on another machine, and is re-exported here so a
 * caller reads one module.
 */

import { gmuxError } from '../errors';
import { REMOTE_ENV_PASSTHROUGH_REFUSED } from './remote-copy';

export { REMOTE_ENV_PASSTHROUGH_REFUSED };

/**
 * The names Tortie's own create is allowed to put on a session on a machine.
 *
 * The first two are exactly the pair `managedPaneEnv` composes in
 * `../tmux/env.ts`. The list is written here rather than imported from that
 * module on purpose: this is the set a person's safety is argued from, and it
 * must not widen because a later phase adds a name to the pane environment for
 * some other reason. `src/main/machines/__tests__/remote-env.test.ts` compares
 * the two sets and fails when they drift, so a drift is a decision somebody
 * makes rather than a thing that happens.
 *
 * PHASE 84 TRIED TO ADD `PATH` AND MEASUREMENT REFUSED IT, which is written out
 * in this file's header. A pane takes its PATH from the server rather than from
 * the session environment, so the pair would have crossed to another computer
 * and changed nothing at all.
 */
export const REMOTE_ENV_ALLOWED: readonly string[] = [
  'GMUX_MANAGED',
  'GMUX_SESSION_ID'
];

/**
 * The one name Phase 84 measured and did not add.
 *
 * Exported so `build/conformance-machines.mjs` condition 47 can assert that it
 * is NOT in the set. A later round that adds it has to move this line too, and
 * moving it means reading the measurement in this file's header first.
 */
export const REMOTE_ENV_MEASURED_AND_REFUSED = 'PATH';

/** True when this name may cross to a machine on a create. Pure. */
export function remoteEnvNameAllowed(name: string): boolean {
  return REMOTE_ENV_ALLOWED.includes(name);
}

/**
 * Refuse a create carrying any environment name outside the allowed set.
 *
 * Called BEFORE anything is composed and therefore before anything is sent, so
 * a refusal here means no process was started and no byte left this Mac. The
 * detail names the FIRST offending name, because a person fixing this needs the
 * name rather than a count.
 *
 * @throws GmuxError INVALID_INPUT with {@link REMOTE_ENV_PASSTHROUGH_REFUSED}.
 */
export function assertRemoteEnvAllowed(
  env: Readonly<Record<string, string>>
): void {
  for (const name of Object.keys(env)) {
    if (remoteEnvNameAllowed(name)) continue;
    throw gmuxError(
      'INVALID_INPUT',
      REMOTE_ENV_PASSTHROUGH_REFUSED,
      `${name} is not one of the ${String(REMOTE_ENV_ALLOWED.length)} names ` +
        `Tortie puts on a session on another machine`
    );
  }
}
