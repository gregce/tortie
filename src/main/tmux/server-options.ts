/**
 * Every option the private server runs with, as one list (Phase 69, M2).
 *
 * ## Why one list, and why it grew
 *
 * On this Mac the options come from `resources/gmux-tmux.conf`, which tmux reads
 * when it creates the server. Five of them are re-asserted at every boot, because
 * a server left running from an OLDER conf never re-reads the file. That list was
 * `BOOT_SERVER_OPTIONS` in `../sessions/core.ts` and it is now
 * {@link localReassertOptions}, with the same five rows in the same order and no
 * change in behaviour at all.
 *
 * A server on ANOTHER machine is booted with `-f /dev/null`, which is what stops
 * that machine's own `~/.tmux.conf` from being read. So it comes up with none of
 * these options, and every one of them has to be set over the connection. That is
 * {@link remoteBootOptions}, and it is why this list had to hold the full set
 * rather than the five.
 *
 * ## The scope flag is part of the row, and it is not decoration
 *
 * `-s` is a server option and `-g` is a global session option. They reach
 * different places, and a wrong flag is an option that silently never applies.
 * MEASURED on the operator's own server, 2026-08-17, read only:
 *
 *   tmux -L gmux show-options -gv exit-empty   prints nothing
 *   tmux -L gmux show-options -sv exit-empty   prints "off"
 *
 * So `exit-empty` is `-s`, and reading it back with `-g` would report a machine
 * as misconfigured while it was configured correctly.
 *
 * ## The drift test is what makes "these cannot disagree" a fact
 *
 * `__tests__/server-options.test.ts` parses `resources/gmux-tmux.conf` and
 * asserts in BOTH directions: every row here appears in the file with the same
 * value and the same scope flag, and every `set` line in the file appears here.
 * `build/conformance-machines.mjs` runs the same comparison, so the gate is
 * executable outside the test suite too.
 */

export interface ServerOption {
  readonly name: string;
  /** '-g' for a global session option, '-s' for a server option. */
  readonly scope: '-g' | '-s';
  /** The value the conf declares. */
  readonly value: string;
  /**
   * True for the one entry whose runtime value is the person's Settings value
   * rather than the conf's literal. `history-limit` and nothing else.
   */
  readonly fromSettings?: true;
  /** True when the local boot re-asserts it on a warm server. */
  readonly localReassert?: true;
}

/**
 * Every option `resources/gmux-tmux.conf` sets, in the file's own order.
 *
 * The order matters for one of the two derived lists. `localReassertOptions`
 * must answer in the order `../sessions/core.ts` has always asserted them, so
 * that the local sequence is byte for byte what it was at `ab94847`. Those five
 * rows carry `localReassert` and they appear here in that order relative to each
 * other.
 */
export const SERVER_OPTIONS: readonly ServerOption[] = [
  // gmux renders everything itself. No tmux chrome, ever.
  { name: 'status', scope: '-g', value: 'off' },
  // No ESC delay: agents and TUIs need instant escape sequences.
  { name: 'escape-time', scope: '-s', value: '0' },
  // CSI-u style extended key reporting for modern TUIs.
  { name: 'extended-keys', scope: '-s', value: 'on' },
  // Let applications pass escape sequences through untouched.
  { name: 'allow-passthrough', scope: '-g', value: 'on' },
  // Forward focus in and out to applications.
  { name: 'focus-events', scope: '-s', value: 'on' },
  // Correct terminfo inside panes.
  { name: 'default-terminal', scope: '-g', value: 'tmux-256color' },
  // The five the local boot re-asserts, in the order it asserts them.
  {
    name: 'remain-on-exit',
    scope: '-g',
    value: 'failed',
    localReassert: true
  },
  { name: 'exit-empty', scope: '-s', value: 'off', localReassert: true },
  { name: 'mouse', scope: '-g', value: 'off', localReassert: true },
  {
    name: 'copy-mode-position-format',
    scope: '-g',
    value: '',
    localReassert: true
  },
  {
    name: 'mode-style',
    scope: '-g',
    value: 'noattr,bg=default,fg=default',
    localReassert: true
  },
  // The one whose runtime value is the person's Settings value. The number in the
  // conf is the first boot default and it has already moved once, from 50,000 to
  // 25,000 in Phase 13.7.
  {
    name: 'history-limit',
    scope: '-g',
    value: '25000',
    fromSettings: true
  }
];

/**
 * The five rows the local boot re-asserts on a warm server, in order.
 *
 * Selected by field rather than copied, so a row can never be in one list and
 * not the other. `../sessions/core.ts` asserts exactly these, in exactly this
 * order, and then applies `history-limit` from Settings. That is today's
 * behaviour with no change.
 */
export function localReassertOptions(): readonly ServerOption[] {
  return SERVER_OPTIONS.filter((row) => row.localReassert === true);
}

/**
 * Every row, because a server booted with `-f /dev/null` has none of them.
 *
 * `history-limit` is in this list and its value is replaced with the person's
 * Settings value by the caller, exactly as the local path does.
 */
export function remoteBootOptions(): readonly ServerOption[] {
  return SERVER_OPTIONS;
}

/** The `set-option` argv for one row, with the value the caller decided. */
export function setOptionArgs(row: ServerOption, value: string): string[] {
  return ['set-option', row.scope, row.name, value];
}

/** The `show-options` argv that reads one row back. */
export function showOptionArgs(row: ServerOption): string[] {
  return ['show-options', `${row.scope}v`, row.name];
}

/**
 * The value a row should carry at runtime.
 *
 * One row takes the person's Settings value. Every other row takes the conf's
 * literal, and passing the settings value for them would be inventing a
 * preference.
 */
export function runtimeValueOf(
  row: ServerOption,
  scrollbackLines: number
): string {
  return row.fromSettings === true ? String(scrollbackLines) : row.value;
}
