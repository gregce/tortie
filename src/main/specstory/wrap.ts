/**
 * Wrapping an agent launch in `specstory run` — the argv composer for Phase 15
 * capture (research docs/research/13-specstory-integration.md §1.1).
 *
 * THE CONSTRAINT THIS MODULE EXISTS TO HOLD. gmux composes two argvs per
 * session: the one that LAUNCHES the agent and the one that RESUMES its
 * conversation after a reboot. Capture must preserve BOTH. The wrapped form of
 *
 *     claude --resume <uuid> --dangerously-skip-permissions
 *
 * has to still resume that conversation and still carry that flag, or capture
 * costs the user the thing gmux is for.
 *
 * ---------------------------------------------------------------------------
 * TWO DECISIONS, BOTH MEASURED (2026-08-11, specstory 2.5.0 on this machine)
 * ---------------------------------------------------------------------------
 *
 * 1. **gmux composes the whole inner command into `-c`, and never delegates
 *    resume translation to specstory.** The research's resume template was
 *    `specstory run <provider> -c "<flags>" --resume <id>`, letting the
 *    provider append its own resume syntax. gmux's own Phase-13.5 audit
 *    (docs/research/22-resume-audit.md) found NINE of ten resume rows mined
 *    from specstory were wrong, and two produced a DEAD PANE — deepseek's
 *    resume is a subcommand whose options must PRECEDE it, antigravity's flag
 *    is `--conversation`. specstory's deepseek provider builds
 *    `deepseek --resume <id>`, which exits RC=2 with "unexpected argument".
 *    So the registry stays the single source of truth for resume syntax and
 *    the wrapper only ever carries an argv gmux already verified:
 *
 *        specstory run <provider> --no-version-check --silent -c "<full argv>"
 *
 *    Capture does not need `--resume`: specstory captures by fs-watching the
 *    agent's own session store, not by knowing the id up front.
 *
 * 2. **The `-c` string is quoted for specstory's grammar, not the shell's.**
 *    `spi.SplitCommandLine` (pkg/spi/cmdline.go) is NOT POSIX: a backslash
 *    escapes the next character *even inside single quotes*, so gmux's
 *    shellQuoteArg — correct for the restore pane — silently corrupts an argv
 *    element containing a backslash (`a\b\\c` arrived as `ab\c`). Measured
 *    round trip through a real `specstory run … -c` with the shell quoter:
 *    11/13 gnarly cases byte-exact. With the escape quoter below: 12/13.
 *
 *    The 13th is unfixable and therefore REFUSED rather than mangled: the
 *    splitter drops empty quoted strings (`if current.Len() > 0`), so an
 *    EMPTY argv element cannot survive `-c` in any encoding. {@link canWrapArgv}
 *    returns false for it and the session launches unwrapped, capture off,
 *    with the reason said out loud — never a silently different argv.
 *
 * Pure module: no Electron, no I/O, no process spawning. Everything that
 * touches the filesystem or the CLI lives in ./resolve.ts and ./sync.ts.
 */

import type { SpecstoryProviderId } from '../agents/registry';

// ---------------------------------------------------------------------------
// Quoting for spi.SplitCommandLine
// ---------------------------------------------------------------------------

/**
 * Characters that need no escaping in specstory's splitter: alphanumerics,
 * the punctuation gmux's own shell quoter treats as safe, and everything
 * non-ASCII (UTF-8 passes through the rune loop untouched — verified with
 * `héllo → ok`).
 */
const SPECSTORY_SAFE = /^[A-Za-z0-9_\-./=:@%+,\u0080-\u{10FFFF}]$/u;

/**
 * Quote ONE argv element for `specstory run -c`.
 *
 * The grammar (pkg/spi/cmdline.go): `\` escapes the next rune anywhere,
 * `'` and `"` toggle quoting, and unquoted space/tab/newline separate
 * arguments. Escaping every unsafe rune is therefore both sufficient and
 * lossless — and, unlike quoting, it has no interaction with the escape rule
 * that a reader has to hold in their head.
 */
export function specstoryQuoteArg(arg: string): string {
  let out = '';
  for (const ch of arg) {
    if (!SPECSTORY_SAFE.test(ch)) out += '\\';
    out += ch;
  }
  return out;
}

/** Quote a whole argv into one `-c` command string. */
export function specstoryQuoteArgv(argv: readonly string[]): string {
  return argv.map(specstoryQuoteArg).join(' ');
}

/**
 * Re-split a `-c` string exactly as `spi.SplitCommandLine` does. Ships so the
 * round trip is provable in a unit test rather than only in a probe script,
 * and so a future maintainer can see the grammar this module quotes for.
 */
export function specstorySplitCommandLine(line: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuote: string | null = null;
  let escaped = false;
  for (const ch of line) {
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (inQuote !== null) {
      if (ch === inQuote) inQuote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current.length > 0) args.push(current);
  return args;
}

/**
 * Can this argv survive the `-c` round trip byte-for-byte?
 *
 * False for an argv carrying an EMPTY element, which specstory's splitter
 * discards outright — there is no encoding that brings it back. The caller
 * launches unwrapped instead of launching a DIFFERENT command than the user
 * asked for.
 */
export function canWrapArgv(argv: readonly string[]): boolean {
  if (argv.length === 0) return false;
  return argv.every((a) => a.length > 0);
}

// ---------------------------------------------------------------------------
// The wrap
// ---------------------------------------------------------------------------

export interface WrapInput {
  /** Absolute path of the resolved specstory binary. */
  bin: string;
  /** specstory provider id for this agent (registry `specstory.provider`). */
  provider: SpecstoryProviderId;
  /** The agent argv gmux would have run unwrapped (argv[0] is the binary). */
  inner: readonly string[];
  /**
   * Capture locally but never upload (`--no-cloud-sync`).
   *
   * The dev/verification opt-out (`GMUX_SPECSTORY_NO_CLOUD=1`) rides here as
   * well as on the session-end sync, because a verifier driving the real app
   * creates real captured sessions — and a scratch session appearing in the
   * user's SpecStory Cloud is the one side effect this feature may not have.
   * It is recorded per session rather than re-read at restore, so a session
   * created cloud-free stays cloud-free when it comes back.
   */
  noCloud?: boolean;
}

/**
 * `--no-version-check` is NON-NEGOTIABLE: without it every invocation does a
 * blocking ~2.5 s GitHub HEAD and paints an "Update Available!" box into the
 * pane before the agent starts. `--silent` suppresses the rest of specstory's
 * startup chrome so a captured pane looks byte-identical to an uncaptured one
 * — gmux renders its own capture indicator; a foreign banner in the pane is
 * exactly the chrome DESIGN.md forbids.
 */
const WRAP_FLAGS = ['--no-version-check', '--silent'] as const;

/**
 * Compose the wrapped argv. Used for BOTH the launch argv and the resume
 * argv — the inner command is the only difference, which is precisely why
 * capture cannot break resume.
 *
 * Returns null when the inner argv cannot round-trip (see {@link canWrapArgv}).
 */
export function wrapArgv(input: WrapInput): string[] | null {
  if (!canWrapArgv(input.inner)) return null;
  if (input.bin.length === 0 || input.provider.length === 0) return null;
  return [
    input.bin,
    'run',
    input.provider,
    ...WRAP_FLAGS,
    ...(input.noCloud === true ? ['--no-cloud-sync'] : []),
    '-c',
    specstoryQuoteArgv(input.inner)
  ];
}

/**
 * Is this argv a specstory wrap? Cheap structural test used by the
 * lifecycle code that must not double-wrap an already-wrapped command.
 */
export function isWrappedArgv(argv: readonly string[]): boolean {
  return argv.length >= 5 && argv[1] === 'run' && argv.includes('-c');
}

/**
 * The inner agent argv recovered from a wrapped argv.
 *
 * ONLY a diagnostic / defence-in-depth path: the manifest records the inner
 * argv verbatim (`specstory.agentArgv`), because recovering it by re-splitting
 * is exactly the lossy direction this module refuses to depend on. Returns []
 * when the argv is not a wrap.
 */
export function unwrapArgv(argv: readonly string[]): string[] {
  const i = argv.indexOf('-c');
  if (!isWrappedArgv(argv) || i < 0) return [];
  const line = argv[i + 1];
  return line === undefined ? [] : specstorySplitCommandLine(line);
}
