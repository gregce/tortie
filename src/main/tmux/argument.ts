/**
 * What tmux READS in an argument a create hands it, held back (Phase 353, entry
 * Phase 354; build/p353/SPEC.md D354-1 to D354-3, §2.6).
 *
 * A session's folder, its `-e NAME=value` pairs and its argv are handed to
 * tmux as separate elements of one argument vector, with no shell between.
 * tmux still reads two things in them, and both were measured (M354, 45 names,
 * the vendored 3.7b and Homebrew's 3.6a, each under `-f /dev/null` and under a
 * copy of resources/gmux-tmux.conf, 180 cells a rule, graded by the pane's own
 * `pwd -P` and `#{pane_current_path}`):
 *
 *  1. ITS ARGUMENT READER, for every element. `cmd_parse_from_arguments`
 *     (cmd-parse.y:1097-1103 in the vendored 3.7b) strips an element's final
 *     `;` and ENDS the command there, unless the character before it is a
 *     backslash, which then becomes the `;`. So a folder ending in `;` could not
 *     be created at all ("unknown command: -e"), one ending in `\;` or `\\;`
 *     started in HOME or in its `;` twin, `-e NAME=val;` failed the create, and
 *     a launch flag `flag;` followed by `display-message -p X` RAN that command
 *     on the server while the pane received `flag` alone. {@link tmuxArgument}
 *     sends a final `;` as a backslash then `;`, which every version reads back
 *     as the value sent (Phase 349 measured it on nine versions, 3.2a to 3.7c,
 *     for the far stamp, build/p349/SPEC.md D15), and changes nothing else.
 *  2. ITS FORMAT EXPANDER, for `-c` alone. `new-session` expands `-c` as a
 *     format for the session (cmd-new-session.c:177-178) and hands the RAW `-c`
 *     to the pane, which expands it once more on its own (spawn.c:229-230); a
 *     folder the expansion names that is not there falls back to HOME, then `/`
 *     (spawn.c:381-387). The expander (format.c:5658-5772) reads a `#` before
 *     `{ ( # , }`, before a one-letter alias (`D F H I P S T W h`), and last
 *     (3.7b drops a final `#`); `#(` RUNS a job; and a run of `#` immediately
 *     followed by `[` is copied VERBATIM, as a style. So `C#Tools`, `#Sales`,
 *     `a#{b}`, `x##y` and a final `#` named another folder and started in HOME,
 *     and `j#(echo …)` started a job whenever the asking client lived long
 *     enough. {@link tmuxFolderArgument} doubles every `#` EXCEPT the `#`s of a
 *     run immediately followed by `[`, which the expander already copies as
 *     written (doubling those turned `x#[y`, `x##[y` and `a#[b#Sc]d` from
 *     starting in their folder into starting in HOME, 20 of 180 cells), and then
 *     applies (1). A `#` in an `-e` value or an argv element is not expanded
 *     (measured), so those take (1) alone.
 *
 * The raw folder put 118 of 180 cells somewhere else (30 of 45 names); (1)
 * alone 94; every `#` doubled 20; this rule 0. Nothing else in any argument is
 * read: `%`, `~`, a `;` that is not last, a backslash, quotes, `$` and non-ASCII
 * all started where they name, at the parent and here. The other seven versions
 * in `TESTED_REMOTE_TMUX_VERSIONS` were not measured for `-c` (they need a
 * network fetch); Phase 349's M1 measured the same expander and the same
 * argument reader on all nine for session NAMES, every version reading the same
 * `#` set and only 3.7b and 3.7c dropping a final `#`, which this rule holds
 * back either way.
 *
 * NOTHING IS NORMALISED, CASE-FOLDED OR RESOLVED, and neither function is
 * idempotent: each is applied exactly once, at the point an argument is handed
 * to tmux, and never to a value that is stored. The folder a row records stays
 * the folder the person chose.
 *
 * WHERE THE FINAL-`;` RULE IS SPELLED. Phase 349 wrote it for the far stamp in
 * `../machines/remote-stamps.ts`, a leaf Phase 123 cut out so that it imports
 * nothing, which two tests pin (p123-leaves.test.ts, p349-far-names.test.ts).
 * So the one spelling stays there, moved out of `remoteStampArgs` into
 * `tmuxArgument`, which `remoteStampArgs` now calls, and this leaf re-exports it
 * beside the folder rule rather than the stamp's leaf importing this one. Every
 * create imports both from here. Pure: no tmux, no process, no file.
 */

import { tmuxArgument } from '../machines/remote-stamps';

export { tmuxArgument };

/**
 * A session's folder as `new-session -c` must be handed it, so the pane starts
 * in exactly that folder: every `#` doubled except the `#`s of a run that is
 * immediately followed by `[`, then {@link tmuxArgument}. See the module header
 * for the measurement and the tmux source it rests on.
 */
export function tmuxFolderArgument(path: string): string {
  const held = path.replace(/#+/g, (run: string, at: number) =>
    path.charAt(at + run.length) === '[' ? run : `${run}${run}`
  );
  return tmuxArgument(held);
}
