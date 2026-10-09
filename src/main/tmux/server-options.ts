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
 *
 * ## Each row says the oldest tmux that took it, and what Tortie does without it
 *
 * PHASE 342 (build/p342/SPEC.md D4 to D8). Before this phase Prepare set every
 * row one at a time and stopped at the first one a machine refused, which
 * left that machine's server at tmux's own `history-limit 2000` and told the
 * person Tortie could not reach a machine it had reached. MEASURED on the
 * package manager's own copies of 3.2a, 3.3a, 3.4, 3.5a, 3.6 and 3.7c, set
 * then read back: nine rows took on every one of them, `allow-passthrough`
 * from 3.3a, and `copy-mode-position-format` and the `noattr` in `mode-style`
 * only from 3.6. So each row carries `oldest`, the first measured version
 * that took it, and `without`, what Tortie does on a server that refuses it:
 *
 *  - `required` for the four rows durability or scroll-back rests on. A server
 *    that refuses one is not used, and the person is told the version is too
 *    old for it rather than that the machine could not be reached.
 *  - `fallback` for `mode-style`, whose value without `noattr` took on every
 *    measured version. Tortie never draws a tmux selection, so the style is
 *    never seen either way.
 *  - `skip` for the other seven, each measured to change nothing a person sees
 *    on the versions that refuse it (the spec's D8 says why, row by row).
 *
 * `history-limit` is WRITTEN first on another machine ({@link remoteBootOptions}),
 * so a refusal of anything can never leave that machine's server at 2,000
 * lines. The list's own order is unchanged, because this Mac's conf, its boot
 * and the read-back all walk it as it is.
 */

/** Why a row Tortie cannot do without matters, one word per row. */
export type RequiredPurpose = 'history' | 'stays-up' | 'failed-screen' | 'scrolling';

/** What Tortie does on a server that refuses a row (Phase 342, D5). */
export type OptionWithout =
  | { readonly kind: 'required'; readonly purpose: RequiredPurpose }
  | { readonly kind: 'fallback'; readonly value: string }
  | { readonly kind: 'skip' };

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
  /**
   * PHASE 342 (D5). The oldest measured tmux that took this row's value, as
   * the whole version string that tmux prints. A fact, never a comparison:
   * nothing compares a version with it, because there is no version
   * arithmetic anywhere in Tortie (`./version.ts`).
   */
  readonly oldest: string;
  /** PHASE 342 (D5). What Tortie does on a server that refuses this row. */
  readonly without: OptionWithout;
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
  { name: 'status', scope: '-g', value: 'off', oldest: '3.2a', without: { kind: 'skip' } },
  // No ESC delay: agents and TUIs need instant escape sequences.
  { name: 'escape-time', scope: '-s', value: '0', oldest: '3.2a', without: { kind: 'skip' } },
  // CSI-u style extended key reporting for modern TUIs.
  { name: 'extended-keys', scope: '-s', value: 'on', oldest: '3.2a', without: { kind: 'skip' } },
  // Let applications pass escape sequences through untouched. MEASURED: 3.2a
  // has no such option because it passes every wrapped sequence through
  // always, so a server that refuses it loses nothing Tortie draws.
  {
    name: 'allow-passthrough',
    scope: '-g',
    value: 'on',
    oldest: '3.3a',
    without: { kind: 'skip' }
  },
  // Forward focus in and out to applications.
  { name: 'focus-events', scope: '-s', value: 'on', oldest: '3.2a', without: { kind: 'skip' } },
  // Correct terminfo inside panes.
  {
    name: 'default-terminal',
    scope: '-g',
    value: 'tmux-256color',
    oldest: '3.2a',
    without: { kind: 'skip' }
  },
  // The five the local boot re-asserts, in the order it asserts them.
  //
  // `failed` is the exit code truth main reads before it reaps a session, so a
  // server that will not keep a failed program's screen is not used.
  {
    name: 'remain-on-exit',
    scope: '-g',
    value: 'failed',
    localReassert: true,
    oldest: '3.2a',
    without: { kind: 'required', purpose: 'failed-screen' }
  },
  // The server staying up with no session open is durability itself.
  {
    name: 'exit-empty',
    scope: '-s',
    value: 'off',
    localReassert: true,
    oldest: '3.2a',
    without: { kind: 'required', purpose: 'stays-up' }
  },
  // The wheel stays in Tortie's hands, which scroll-back rests on.
  {
    name: 'mouse',
    scope: '-g',
    value: 'off',
    localReassert: true,
    oldest: '3.2a',
    without: { kind: 'required', purpose: 'scrolling' }
  },
  // Copy mode on another machine is entered with `-H`, which hides the same
  // position indicator on a tmux that has no such option.
  {
    name: 'copy-mode-position-format',
    scope: '-g',
    value: '',
    localReassert: true,
    oldest: '3.6',
    without: { kind: 'skip' }
  },
  // `noattr` is what older versions refuse; the colours alone took on all of
  // them, and Tortie never makes a tmux selection, so the style is never drawn.
  {
    name: 'mode-style',
    scope: '-g',
    value: 'noattr,bg=default,fg=default',
    localReassert: true,
    oldest: '3.6',
    without: { kind: 'fallback', value: 'bg=default,fg=default' }
  },
  // The one whose runtime value is the person's Settings value. The number in the
  // conf is the first boot default and it has already moved once, from 50,000 to
  // 25,000 in Phase 13.7. It is the scroll-back depth, so it is required.
  {
    name: 'history-limit',
    scope: '-g',
    value: '25000',
    fromSettings: true,
    oldest: '3.2a',
    without: { kind: 'required', purpose: 'history' }
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
 *
 * PHASE 342 (D4). `history-limit` comes FIRST, then the other eleven in the
 * list's own order. A server that refuses any later row can then never be left
 * at tmux's own 2,000 lines, which is 8 % of the depth the product promises.
 * Only the order of the writes moves: the read-back walks
 * {@link SERVER_OPTIONS} as it is, so the row's settings list reads as before.
 */
export function remoteBootOptions(): readonly ServerOption[] {
  const first = SERVER_OPTIONS.filter((row) => row.name === 'history-limit');
  const rest = SERVER_OPTIONS.filter((row) => row.name !== 'history-limit');
  return [...first, ...rest];
}

/** The six refusals of a value, each followed by the value tmux was sent. */
const REFUSED_VALUE_SHAPES: readonly string[] = [
  'invalid style:',
  'unknown value:',
  'bad value:',
  'value is invalid:',
  'value is too small:',
  'value is too large:'
];

/**
 * Whether one `set-option` that exited non zero was REFUSED, in tmux's own
 * words, rather than failing for any other reason (Phase 342, D6).
 *
 * The seven shapes were MEASURED identical on 3.2a, 3.6 and 3.7c (spec §14 M5):
 * `invalid option: <the row's name>`, and `invalid style:`, `unknown value:`,
 * `bad value:`, `value is invalid:`, `value is too small:` and
 * `value is too large:`, each followed by the value that was sent. The LAST
 * line with anything on it is compared WHOLE, and the name or the value byte
 * for byte, so a dropped link, a server that is not there, a refusal naming
 * another row and a value one byte different are all NOT a refusal, and the
 * caller throws them exactly as before. Pure.
 *
 * tmux's quiet flag on `set-option` is never the answer. It hides a missing
 * NAME and not a bad value, and it would hide a fact about the machine either
 * way.
 */
export function isOptionRefusal(text: string, name: string, value: string): boolean {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim().length > 0);
  const last = lines[lines.length - 1];
  if (last === undefined) return false;
  if (last === `invalid option: ${name}`) return true;
  return REFUSED_VALUE_SHAPES.some((shape) => last === `${shape} ${value}`);
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
