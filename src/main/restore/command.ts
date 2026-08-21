/**
 * Pure helpers for the restore flow (FINAL-REPORT §2.4 Steps 2–3):
 * shell quoting for the armed resume command, the snapshot-replay command
 * line, and snapshot text hygiene.
 *
 * Pure module — no electron/tmux imports — so it is unit-testable under any
 * runner (see __tests__/command.test.ts).
 */

import { stripAnsi } from '../ansi';

/**
 * Re-exported so restore's own import sites (and `restore/index.ts`) keep the
 * name they have always used; the implementation lives in `main/ansi.ts`,
 * which is now the only one in the process (research 25 §3 B1).
 */
export { stripAnsi };

/**
 * Argument characters that never need quoting in POSIX shells.
 *
 * A LEADING `=` IS NOT ONE OF THEM, and that is measured. zsh, which is the
 * login shell macOS ships, has EQUALS expansion: a word whose FIRST character is
 * `=` is replaced by the path of the program named after it. MEASURED 2026-08-20
 * with zsh 5.9:
 *
 *   zsh -c 'echo =p117-absent-1'     zsh:1: p117-absent-1 not found, exit 1
 *   zsh -c "echo '=p117-absent-1'"   =p117-absent-1, exit 0
 *
 * Tortie sends `=NAME` as an exact match target to tmux on another machine, and
 * such a word reaching a login shell bare never reaches tmux at all. The failure
 * looks like a machine that would not answer, which is the one thing Phase 117
 * has to tell apart from a machine that answered no.
 *
 * `=` INSIDE a word is still safe and still passes through, because EQUALS
 * expansion only ever looks at the first character. So `--model=opus` and
 * `KEY=value` are typed into a restored pane exactly as a person would type
 * them, which is what this quoter was written for.
 */
const SAFE_ARG = /^[A-Za-z0-9_\-./:@%+,][A-Za-z0-9_\-./=:@%+,]*$/;

/**
 * Quote ONE argv element for typing into an interactive POSIX shell
 * (zsh/bash). Safe args pass through; everything else is single-quoted with
 * embedded single quotes escaped as `'\''`.
 */
export function shellQuoteArg(arg: string): string {
  if (arg.length === 0) return "''";
  if (SAFE_ARG.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

/** Quote a whole argv into one shell command line. */
export function shellQuoteArgv(argv: readonly string[]): string {
  return argv.map(shellQuoteArg).join(' ');
}

/**
 * The ARMED resume command — exactly what gets typed into the restored pane
 * WITHOUT Enter (per product decision: one keypress to resume, never
 * auto-fired). Empty argv → nothing to arm.
 */
export function buildArmedCommand(resumeArgv: readonly string[]): string {
  if (resumeArgv.length === 0) return '';
  return shellQuoteArgv(resumeArgv);
}

/**
 * Dimmed separator between replayed snapshot text and the fresh prompt.
 * printf interprets the \n and \033 escapes — the string below is the
 * LITERAL text typed into the pane.
 */
const SEPARATOR =
  '\\n\\033[2m-- Tortie : scrollback above was restored from a snapshot --\\033[0m\\n\\n';

/**
 * The snapshot-replay command executed (WITH Enter) in the restored pane:
 * `cat <snapshot>` turns the prior scrollback into inert history, then a
 * dimmed separator line marks where the live session begins
 * (tmux-resurrect's `cat` trick — research 09 §B.3/B.4). The leading space
 * keeps the line out of shell history where HIST_IGNORE_SPACE is set.
 *
 * NOTE: deliberately no `clear` — ncurses clear(1) emits E3 (`\x1b[3J`) on
 * xterm-alikes, which tmux honors by ERASING pane history: it would destroy
 * the snapshot we just replayed.
 */
export function buildSnapshotReplayCommand(snapshotPath: string): string {
  return ` cat ${shellQuoteArg(snapshotPath)}; printf '${SEPARATOR}'`;
}


/**
 * Trim a capture-pane snapshot for storage: drop trailing blank lines (the
 * pane bottom is usually empty rows) and guarantee a final newline so the
 * `cat` replay never glues the separator onto the last output line.
 * Lines that render as whitespace-only after ANSI stripping count as blank.
 */
export function trimSnapshotText(text: string): string {
  const lines = text.split('\n');
  let end = lines.length;
  while (end > 0) {
    const rendered = stripAnsi(lines[end - 1] ?? '');
    if (rendered.trim().length > 0) break;
    end--;
  }
  if (end === 0) return '';
  return lines.slice(0, end).join('\n') + '\n';
}
