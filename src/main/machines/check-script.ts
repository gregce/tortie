/**
 * The far check the visible connection test runs (Phase 340, build/p340/SPEC.md
 * D1, D2, D3 and D15 as revised by §Attack). PURE: it composes one command and
 * reads one answer, and it starts nothing.
 *
 * ## What it replaces, and the measurement that made the change
 *
 * Until this phase the test asked the other machine `command -v tmux`, in the
 * shell ssh hands a command to with `-c`. That shell is NOT a login shell
 * (measured, M1: `[[ -o login ]]` answered not-login), so its PATH was
 * `/usr/bin:/bin:/usr/sbin:/sbin`, and a tmux in `/usr/local/bin` or
 * `/opt/homebrew/bin` was reported missing. The operator re-adding his Mac Pro
 * read "no program" until he typed `/usr/local/bin/tmux` under Advanced.
 *
 * So the check looks in three places, in this order, and lists every DISTINCT
 * executable file named `tmux` it finds:
 *
 *  1. every folder of the PATH that machine's LOGIN shell gives (`login`), read
 *     with the Phase 69 recipe and its own marker, the login shell's output
 *     captured into a variable that is never printed;
 *  2. every folder of the PATH the command itself has (`path`), which is the
 *     answer the old probe gave, so no machine it found is lost;
 *  3. every folder of {@link REMOTE_TMUX_INSTALL_FOLDERS} (`install`).
 *
 * A typed path is checked alone (`typed`, or `typed=missing`). Distinct means a
 * different device and inode, so one program reached by two spellings is one.
 *
 * ## What it runs over there, and what it never runs
 *
 * `id`, `uname`, `stat`, `head`, the account's login shell, and, ONLY when
 * exactly one program was found AND it was typed or found on the login shell's
 * PATH or the command's own PATH, that one program's `-V`. A program found only
 * in an install folder is not run before the Add press (`vskip=install`), and
 * when more than one program is found NOTHING is run until the person picks one
 * (D4). `set -f` first, so a PATH entry holding a glob character is never
 * expanded into folders the login shell itself never searches (T3), and a path
 * holding a newline is skipped before it is counted or run (T2).
 *
 * THE FIX ROUND ADDED THE REST OF THE SCHEMA'S PATH RULE to that skip. A
 * candidate that is not absolute (a login PATH entry such as `bin` or `.`), that
 * holds any control character, or that holds a single quote is skipped before
 * it is counted or run, because {@link parseCheckAnswer} refuses a block naming
 * one, and before this the whole check then answered `unknown` with no sheet
 * even beside a real program in an install folder. The verifiers measured that
 * over real ssh as worse than the parent, which answered `ok` for the same
 * machine (`PATH=bin:$PATH`, a `.` entry, a folder named `o'brien`). Such a
 * program could never be a row's program anyway: the schema refuses its path.
 *
 * ## Why it is one line
 *
 * The far account's shell parses the quoted command before `/bin/sh` runs the
 * script, and csh and tcsh will not carry a newline inside a quoted word (M14).
 * So the script holds no newline, no `!` (csh history), no single quote (the one
 * quoting helper's own delimiter) and no backslash pair.
 *
 * ## The answer, read strictly
 *
 * {@link parseCheckAnswer} accepts EXACTLY one block. A login file that prints
 * Tortie's marker before the script, or after it through an EXIT trap (T1,
 * measured: the outer zsh ran a `.zshenv` trap after `/bin/sh` exited), makes
 * the buffer hold other than two markers and the answer is `malformed`, which
 * the test reports as `unknown` with no sheet. The stated cost: a login file
 * that prints Tortie's own marker refuses the check. Since the fix round that
 * cost is one typed path wide: a check whose path the person typed reads the
 * one block that names exactly that path, so such a machine is added the way
 * the parent added it, by typing the path.
 *
 * It names no identity record file and no ssh configuration file, and it
 * imports only the quoting helper and the legacy marker.
 */

import { shellQuoteArgv } from '../restore/command';
import { REMOTE_PATH_MARKER } from './carriage';

/** The marker around the one block the check prints. */
export const CHECK_MARKER = '__TORTIE_CHECK__';

/** The marker around the PATH the login shell gives. It never reaches the output. */
export const LOGIN_MARKER = '__TORTIE_LOGIN__';

/**
 * Where tmux is usually installed, in the order candidates are listed (D3).
 *
 * Homebrew on Apple silicon and on Intel, Linuxbrew (system and per person),
 * MacPorts, the distribution's own folders, snap, NixOS and Nix profiles, and a
 * person's own bin folders. An entry starting `~/` is composed against that
 * machine's own `$HOME` by the far shell, never on this Mac. No entry holds `$`,
 * `*`, `?`, `[` or `:`, because the list crosses as one `:` joined argument.
 *
 * It is NOT the agent folder list in `../tmux/resolve.ts`. The Linux and Nix
 * entries were read, not run: no Linux far side was measured (SPEC §13).
 */
export const REMOTE_TMUX_INSTALL_FOLDERS: readonly string[] = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/home/linuxbrew/.linuxbrew/bin',
  '~/.linuxbrew/bin',
  '/opt/local/bin',
  '/usr/bin',
  '/bin',
  '/snap/bin',
  '/run/current-system/sw/bin',
  '/nix/var/nix/profiles/default/bin',
  '~/.nix-profile/bin',
  '~/.local/bin',
  '~/bin'
];

/**
 * What the login shell is asked to print: its PATH, between two copies of
 * {@link LOGIN_MARKER}. The Phase 69 recipe (`remotePathCommand` in
 * `./remote-path.ts`) with this check's own marker.
 */
export const LOGIN_PATH_PROBE = `printf ${LOGIN_MARKER}%s${LOGIN_MARKER} "$PATH"`;

/**
 * The script, one line. Its positionals: `$1` a typed path or empty, `$2`
 * {@link LOGIN_PATH_PROBE}, `$3` the install folders joined with `:`.
 *
 * The starting text is the adversary's revised check
 * (`scratchpad/p340/adversary/check-script-r.mjs`, 1,379 bytes), measured under
 * `/bin/sh` (bash 3.2), dash, ksh, `zsh --emulate sh` and `bash --posix` as the
 * interpreter and under csh, tcsh, ksh, dash and bash as the outer shell. The
 * fix round added `sq` and the skips at the top of `add()` that finish the
 * schema's path rule (a relative path, a control character, a single quote),
 * 116 bytes, measured under the same five interpreters in the C and UTF-8
 * locales. `__tests__/p340-check-script.test.ts` pins its length and its
 * shape.
 */
export const CHECK_SCRIPT = [
  'umask 077',
  'set -f',
  't="$1"',
  'q="$2"',
  'x="$3"',
  'nl=$(printf "\\nx")',
  'nl=${nl%x}',
  'sq=$(printf "\\047")',
  `printf "%s\\n" ${CHECK_MARKER}`,
  'printf "user=%s\\n" "$(id -un 2>/dev/null)"',
  'printf "os=%s\\n" "$(uname -s 2>/dev/null)"',
  'lo=$("${SHELL:-/bin/sh}" -lc "$q" </dev/null 2>/dev/null)',
  `case "$lo" in *${LOGIN_MARKER}*${LOGIN_MARKER}*) lp=\${lo#*${LOGIN_MARKER}}; lp=\${lp%%${LOGIN_MARKER}*}; printf "login=read\\n" ;; *) lp= ; printf "login=none\\n" ;; esac`,
  'seen=',
  'n=0',
  'c=',
  'cs=',
  'add() { case "$2" in /*) ;; *) return 0 ;; esac; case "$2" in *[[:cntrl:]]*|*"$nl"*) return 0 ;; esac; case "$2" in *"$sq"*) return 0 ;; esac; [ -f "$2" ] && [ -x "$2" ] || return 0; k=$(stat -L -c %d:%i -- "$2" 2>/dev/null || stat -L -f %d:%i -- "$2" 2>/dev/null); [ -n "$k" ] || k="$2"; case " $seen " in *" $k "*) return 0 ;; esac; seen="$seen $k"; n=$((n+1)); c="$2"; cs="$1"; printf "cand=%s %s\\n" "$1" "$2"; }',
  `if [ -n "$t" ]; then add typed "$t"; [ "$n" -eq 1 ] || printf "typed=missing\\n"; else IFS=:; for d in $lp; do [ -n "$d" ] && add login "$d/tmux"; done; for d in $PATH; do [ -n "$d" ] && add path "$d/tmux"; done; for d in $x; do case "$d" in "~/"*) d="$HOME/\${d#??}" ;; esac; [ -n "$d" ] && add install "$d/tmux"; done; unset IFS; fi`,
  'printf "count=%s\\n" "$n"',
  `if [ "$n" -eq 1 ]; then if [ "$cs" = install ]; then printf "vskip=install\\n"; else v=$("$c" -V </dev/null 2>/dev/null | head -n 1); printf "version=%s\\n" "$v"; fi; printf "${REMOTE_PATH_MARKER}%s${REMOTE_PATH_MARKER}\\n" "$c"; fi`,
  `printf "%s\\n" ${CHECK_MARKER}`
].join('; ');

/**
 * The far command, one argument of the test's argv (D1).
 *
 * `/bin/sh -c <script> tortie-check <typed> <probe> <folders>`, composed by the
 * one quoting helper. The far account's shell parses it, and the script itself
 * always runs under that machine's `/bin/sh`.
 */
export function composeCheckCommand(typed: string | null): string {
  return shellQuoteArgv([
    '/bin/sh',
    '-c',
    CHECK_SCRIPT,
    'tortie-check',
    typed ?? '',
    LOGIN_PATH_PROBE,
    REMOTE_TMUX_INSTALL_FOLDERS.join(':')
  ]);
}

// ---------------------------------------------------------------------------
// The answer
// ---------------------------------------------------------------------------

/** How a candidate was found. */
export type CheckSource = 'login' | 'path' | 'install' | 'typed';

const SOURCES: readonly CheckSource[] = ['login', 'path', 'install', 'typed'];

/** One program the check found. */
export interface CheckCandidate {
  readonly source: CheckSource;
  readonly path: string;
}

/** What one well formed block said, exactly. */
export interface MachineCheckFacts {
  /** `id -un`, or null when it printed nothing. */
  readonly user: string | null;
  /** `uname -s`, or null when it printed nothing. */
  readonly os: string | null;
  /** Whether the login shell answered the PATH read. */
  readonly login: 'read' | 'none';
  /** Every distinct program, in the order the script found them. */
  readonly candidates: readonly CheckCandidate[];
  /** True when a typed path named nothing that runs. */
  readonly typedMissing: boolean;
  /**
   * The first line the one program printed for `-V`, raw. Null when the script
   * did not run it, which is every block with other than one candidate and
   * every block whose one candidate came from an install folder.
   */
  readonly version: string | null;
  /** `install` when the one program was deliberately not run. */
  readonly vskip: 'install' | null;
}

/**
 * The schema's rule for a program path, restated (`remotePathField` and
 * `plainString` in `./schema.ts`): absolute, no control character, no single
 * quote, at most 1,024 characters. It is restated rather than imported because
 * this module imports nothing but the quoting helper and the marker, and
 * `__tests__/p340-check-script.test.ts` holds the two rules equal over the
 * schema's own validator.
 */
export const CHECK_PATH_MAX = 1024;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

/** True when a reported path passes the schema's program path rule. */
export function checkPathPasses(path: string): boolean {
  return (
    path.length >= 1 &&
    path.length <= CHECK_PATH_MAX &&
    path.startsWith('/') &&
    !path.includes("'") &&
    !CONTROL_RE.test(path)
  );
}

/** How many times a marker occurs in a text. */
export function countMarker(text: string, marker: string): number {
  return text.split(marker).length - 1;
}

const PATH_PAIR_RE = new RegExp(`^${REMOTE_PATH_MARKER}(.*)${REMOTE_PATH_MARKER}$`);

/**
 * Read the check's answer, strictly (D15 as revised).
 *
 * Returns null when the text holds no check marker at all: the far side never
 * ran Tortie's check. Returns `'malformed'` for anything but EXACTLY one block
 * whose every line is one of the script's own: `key=value` from the closed set
 * (`user`, `os`, `login`, `cand`, `typed`, `count`, `version`, `vskip`), each at
 * most once except `cand`, or the one path pair. On top of that:
 *
 *  - every `cand` path passes the schema's program path rule;
 *  - `count` is present and equals the number of `cand` lines;
 *  - the path pair is present exactly when there is one candidate, and equals it;
 *  - `version` and `vskip` appear only with one candidate, exactly one of them,
 *    and `vskip=install` exactly when that candidate's source is `install`;
 *  - `typed=missing` appears only with no candidate.
 *
 * Line ends may be `\n`, `\r\n` or the `\r\r\n` a terminal sometimes adds.
 *
 * THE FIX ROUND ADDED ONE WAY PAST A REFUSED BUFFER, and only for a check
 * whose program path the person typed (`typed`, being the path the command
 * carried as `$1`). A login file that prints Tortie's marker, before the check
 * or after it through an exit trap, refused every check of that machine, and a
 * typed path was refused the same way, so a machine the parent reached by
 * typing the path could not be added at all (the verifiers' S10, worse than
 * the parent). When the path is typed, the program is no longer the far side's
 * to choose: so a buffer of whole blocks is read for the ONE block that names
 * exactly that path as its one `typed` candidate, by every rule above, and
 * anything else, being no such block or two of them, is still `'malformed'`.
 * What a hostile block can still claim there is a version, which Prepare reads
 * again before it starts anything.
 */
export function parseCheckAnswer(
  text: string,
  typed: string | null = null
): MachineCheckFacts | 'malformed' | null {
  const markers = countMarker(text, CHECK_MARKER);
  if (markers === 0) return null;
  if (markers !== 2) return typed === null ? 'malformed' : typedBlockOf(text, typed);
  const open = text.indexOf(CHECK_MARKER);
  const close = text.indexOf(CHECK_MARKER, open + CHECK_MARKER.length);
  return parseCheckBlock(text.slice(open + CHECK_MARKER.length, close));
}

/**
 * The one block, among whole blocks, that names the typed path as its one
 * candidate, or `'malformed'` (the fix round; see {@link parseCheckAnswer}).
 * An odd number of markers leaves a block with no end, which nothing can place.
 */
function typedBlockOf(text: string, typed: string): MachineCheckFacts | 'malformed' {
  const parts = text.split(CHECK_MARKER);
  if ((parts.length - 1) % 2 !== 0) return 'malformed';
  const naming: MachineCheckFacts[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const one = parseCheckBlock(parts[i] ?? '');
    if (one === 'malformed') continue;
    const only = one.candidates.length === 1 ? one.candidates[0] : undefined;
    if (only !== undefined && only.source === 'typed' && only.path === typed) naming.push(one);
  }
  return naming.length === 1 ? (naming[0] as MachineCheckFacts) : 'malformed';
}

/** One block's inside, between two markers, read by every rule above. */
function parseCheckBlock(inner: string): MachineCheckFacts | 'malformed' {
  // The script prints each marker on a line of its own, so what sits between
  // them starts with a line end and ends with one. Anything else shares a line
  // with a marker and is not the script's.
  const lines = inner.split('\n').map((line) => line.replace(/\r+$/, ''));
  if (lines.length < 2 || lines[0] !== '' || lines[lines.length - 1] !== '') {
    return 'malformed';
  }
  const body = lines.slice(1, -1);

  let user: string | null | undefined;
  let os: string | null | undefined;
  let login: 'read' | 'none' | undefined;
  let count: number | undefined;
  let typedMissing = false;
  let version: string | undefined;
  let vskip: 'install' | undefined;
  let pair: string | undefined;
  const candidates: CheckCandidate[] = [];

  for (const line of body) {
    const pm = PATH_PAIR_RE.exec(line);
    if (pm !== null) {
      if (pair !== undefined) return 'malformed';
      pair = pm[1] ?? '';
      continue;
    }
    const at = line.indexOf('=');
    if (at <= 0) return 'malformed';
    const key = line.slice(0, at);
    const value = line.slice(at + 1);
    switch (key) {
      case 'cand': {
        const sp = value.indexOf(' ');
        if (sp <= 0) return 'malformed';
        const source = value.slice(0, sp) as CheckSource;
        const path = value.slice(sp + 1);
        if (!SOURCES.includes(source) || !checkPathPasses(path)) return 'malformed';
        candidates.push({ source, path });
        break;
      }
      case 'user':
        if (user !== undefined) return 'malformed';
        user = value.length > 0 ? value : null;
        break;
      case 'os':
        if (os !== undefined) return 'malformed';
        os = value.length > 0 ? value : null;
        break;
      case 'login':
        if (login !== undefined) return 'malformed';
        if (value !== 'read' && value !== 'none') return 'malformed';
        login = value;
        break;
      case 'count':
        if (count !== undefined) return 'malformed';
        if (!/^[0-9]{1,4}$/.test(value)) return 'malformed';
        count = Number(value);
        break;
      case 'typed':
        if (typedMissing || value !== 'missing') return 'malformed';
        typedMissing = true;
        break;
      case 'version':
        if (version !== undefined) return 'malformed';
        version = value;
        break;
      case 'vskip':
        if (vskip !== undefined || value !== 'install') return 'malformed';
        vskip = 'install';
        break;
      default:
        return 'malformed';
    }
  }

  // The script prints all four of these on every run, so a block missing one
  // is not the script's.
  if (user === undefined || os === undefined || login === undefined) {
    return 'malformed';
  }
  if (count === undefined || count !== candidates.length) return 'malformed';
  if (typedMissing && candidates.length !== 0) return 'malformed';
  if (candidates.length === 1) {
    const only = candidates[0] as CheckCandidate;
    if (pair !== only.path) return 'malformed';
    const installOnly = only.source === 'install';
    if (installOnly && (vskip !== 'install' || version !== undefined)) return 'malformed';
    if (!installOnly && (vskip !== undefined || version === undefined)) return 'malformed';
  } else if (pair !== undefined || version !== undefined || vskip !== undefined) {
    return 'malformed';
  }

  return {
    user: user ?? null,
    os: os ?? null,
    login,
    candidates,
    typedMissing,
    version: version === undefined ? null : version,
    vskip: vskip ?? null
  };
}
