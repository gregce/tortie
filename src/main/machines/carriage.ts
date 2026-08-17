/**
 * The declarations about the carriage that BOTH the one visible connection test
 * and the exec plane read. Phase 68 measured every one of them and Phase 69
 * moved them here.
 *
 * ## Why this module exists, and it is not tidiness
 *
 * Phase 68 put these next to the visible test, because the visible test was the
 * only caller. Phase 69 gave them a second caller, and that second caller sits
 * under `execTmux`, which every local session already reaches. So importing
 * `./connection-test.ts` for a constant pulled that whole module into the graph
 * of the local tmux door, and `./connection-test.ts` loads `node-pty` and spawns
 * a terminal. The measured effect was that `src/main/manifest/store.ts`, the
 * durable record every session restores from, ended up with a native terminal
 * binding in its import graph, and `node build/contract-inventory.mjs --check`
 * failed because its scratch bundle could not load `pty.node`.
 *
 * So the rule this module makes true: a declaration about the carriage is not a
 * declaration about the visible test. Anything the exec plane needs lives here,
 * this file starts nothing, and `./connection-test.ts` re-exports every name
 * below so no existing caller changed.
 *
 * ## What this module may import, and it is a short list
 *
 * `node:fs`, `node:os`, `node:path` and the log. Nothing that spawns a process,
 * opens a terminal or loads a native module may be imported here, now or later.
 * `src/main/machines/__tests__/carriage.test.ts` reads this file's import lines
 * and fails on anything else, so the rule is checked rather than asked for.
 *
 * ## Where the machine's identity is recorded, and why Tortie owns that file
 *
 * The order of the two record files is the safeguard. Tortie's own file is
 * first, so it is the only file a client Tortie runs can add a key to. The
 * person's own file is second and is read only, so a machine they already know
 * still raises the alarm when its identity changes. See the header of
 * `./connection-test.ts` for the measurements behind that order.
 */

import { accessSync, constants, statSync } from 'node:fs';
import { join } from 'node:path';
import { getLog } from '../log';

// ---------------------------------------------------------------------------
// The client
// ---------------------------------------------------------------------------

/** The ssh every Mac has. Pinned, never a bare name served by PATH. */
export const PINNED_SSH_PATH = '/usr/bin/ssh';

/**
 * What every future ssh command in Tortie carries.
 *
 * Steady state must fail fast when authentication is broken, because a client
 * waiting on a password prompt nobody can see is a session that never opens and
 * never says why. Phase 69 reads this constant rather than writing the string
 * again.
 */
export const SSH_BATCH_MODE_STEADY = 'BatchMode=yes';

/** How long the sign in program gets to answer before it is refused. */
export const SSH_CONNECT_TIMEOUT_SECONDS = 10;

/** Where the ssh client came from. */
export interface SshResolution {
  path: string | null;
  source: 'pinned' | 'dev-override' | 'missing';
}

function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

let saidPackagedOverrideIgnored = false;

/**
 * Resolve the ssh client.
 *
 * `GMUX_SSH_BIN` is a development only override, identical in shape and rules
 * to `GMUX_TAILSCALE_BIN`. A packaged Tortie ignores it with one warning and
 * runs {@link PINNED_SSH_PATH}. In a development build it must name an absolute
 * executable file, and the resolved path is printed as the first line of the
 * transcript, so a substituted client is visible to the person watching.
 *
 * The log is asked for inside the function rather than at the top of this file.
 * The reason is the import cycle this module now sits inside: the log reaches
 * the local tmux door, and the local tmux door reaches the exec plane, and the
 * exec plane reaches this file. Asking at the point of use means nothing here
 * runs while the log is still being built.
 */
export function resolveSsh(input: {
  packaged: boolean;
  env: NodeJS.ProcessEnv;
}): SshResolution {
  const override = (input.env['GMUX_SSH_BIN'] ?? '').trim();
  if (input.packaged) {
    if (override !== '' && !saidPackagedOverrideIgnored) {
      saidPackagedOverrideIgnored = true;
      getLog('config').warn(
        'GMUX_SSH_BIN is ignored in a packaged Tortie. The application always ' +
          `runs ${PINNED_SSH_PATH}.`
      );
    }
  } else if (override !== '') {
    if (override.startsWith('/') && isExecutableFile(override)) {
      return { path: override, source: 'dev-override' };
    }
    getLog('config').warn(
      `GMUX_SSH_BIN does not name an absolute executable file, so it is ` +
        `ignored. The value was ${override}.`
    );
  }
  if (isExecutableFile(PINNED_SSH_PATH)) {
    return { path: PINNED_SSH_PATH, source: 'pinned' };
  }
  return { path: null, source: 'missing' };
}

/** Test hook, so one process can exercise more than one resolution path. */
export function resetSshWarningsForTests(): void {
  saidPackagedOverrideIgnored = false;
}

// ---------------------------------------------------------------------------
// The marker around a remote answer
// ---------------------------------------------------------------------------

/**
 * The marker pair around the answer.
 *
 * It is the recipe `PATH_MARKER` in `../tmux/resolve.ts` already uses, and it
 * exists for the same reason: a chatty login file on the other machine must not
 * be able to corrupt the answer. A captured value that does not begin with `/`
 * is treated as no answer at all.
 */
export const REMOTE_PATH_MARKER = '__TORTIE_PATH__';

// ---------------------------------------------------------------------------
// Where the machine's identity is recorded
// ---------------------------------------------------------------------------

/**
 * The two files the client checks a machine's identity against.
 *
 * The order is the safeguard and it is not cosmetic. See the header of this
 * file for the measurements behind it.
 */
export interface MachineHostKeyFiles {
  /**
   * The file Tortie owns, inside Tortie's own data directory. It is the ONLY
   * file this command may add a key to, and it is first for that reason.
   */
  readonly tortie: string;
  /**
   * The person's own file. It is read so that a machine they already know
   * still raises the alarm when its identity changes. It is second, so nothing
   * Tortie runs can ever add a line to it.
   */
  readonly user: string;
}

/** The name of the option this command sets. Exported so the gate can find it. */
export const KNOWN_HOSTS_OPTION = 'UserKnownHostsFile';

/**
 * The person's own record of machine identities.
 *
 * Named here so it can be READ. Nothing in Tortie writes to it, and the file
 * order in {@link composeKnownHostsOption} is what makes that true rather than
 * a promise.
 */
export function userHostKeysPath(home: string): string {
  return join(home, '.ssh', 'known_hosts');
}

/**
 * The one option value, with Tortie's file first.
 *
 * Both paths are quoted because the client reads this value as a whitespace
 * separated list, and Tortie's own directory has a space in its name on every
 * Mac. Quoting is the client's own syntax for that, and it was measured
 * working against a scratch server before it was written here.
 */
export function composeKnownHostsOption(files: MachineHostKeyFiles): string {
  return `${KNOWN_HOSTS_OPTION}="${files.tortie}" "${files.user}"`;
}
