/**
 * The login flag a shell session carries (Phase 74, GitHub issue 8).
 *
 * WHY THIS IS ITS OWN FILE, and it is not a style choice. Three modules need
 * the same answer: the create path in ./agents.ts, the restore path in
 * ../restore/restore.ts, and the flag recovery in ../restart/extras.ts. The
 * obvious home was ./agents.ts, beside the shell branch that adds the flag.
 * That home is closed. `src/main/config/__tests__/boundary.test.ts` walks every
 * value import out of `src/main/restore/restore.ts` and fails on the first one
 * that lands under `src/main/config/`, which is Phase 23's rule that the
 * restore path can never reach the configuration modules. ./agents.ts reaches
 * them on purpose, because that is how a configured agent launches, so a value
 * import from restore into ./agents.ts would undo Phase 21 quietly.
 *
 * So the two names live here, in a module that imports nothing at all, and all
 * three callers read the same definition.
 */

/** The flag that makes a shell a login shell. */
export const LOGIN_SHELL_FLAG = '-l';

/**
 * `argv` with the login flag directly after the binary.
 *
 * POSITION IS LOAD BEARING. `zsh -l -c 'cmd'` runs the command as a login
 * shell, and `zsh -c 'cmd' -l` hands `-l` to the command as an argument. The
 * smoke harnesses create shell sessions with `-c`, so an appended flag would
 * change what those panes run.
 *
 * An argv that already carries the flag is returned unchanged, so a person who
 * typed `-l` themselves gets one flag rather than two, and a restore of a row
 * written after this phase adds nothing.
 */
export function withLoginShellFlag(argv: readonly string[]): string[] {
  const bin = argv[0];
  if (bin === undefined) return [...argv];
  if (argv.includes(LOGIN_SHELL_FLAG)) return [...argv];
  return [bin, LOGIN_SHELL_FLAG, ...argv.slice(1)];
}
