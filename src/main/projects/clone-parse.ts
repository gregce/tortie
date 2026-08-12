/**
 * Reading what git says while it clones (Phase 18.6, research 35 §3.10 and
 * §3.12). Pure string work, so it is testable without a network or a disk.
 *
 * Two jobs, both of them "read git's stderr", which is why they share a
 * module: turn a progress frame into a number, and decide WHICH failure this
 * was. The sentence the user then reads is not here. It is in
 * `@shared/clone-copy`, because the renderer has to build the same sentence
 * from a rejected preflight that carries no stderr at all, and the foot of
 * this file re-exports it so a main-side caller has one import.
 *
 * WHY THE PARSER IS OURS. `simple-git` is the obvious package and its
 * progress parser is wrong for this purpose in two ways that were measured
 * (research 35 §3.1). It keeps the first word of the label, so
 * `remote: Counting objects` and `remote: Compressing objects` both arrive
 * as a stage named `remote:` with two different totals under one name, and a
 * bar driven by it jumps backwards. Its regex is anchored with `^` and
 * carries no `m` flag, so it only matches a chunk that happens to begin on a
 * frame boundary: git emitted 207 frames across counting and compressing and
 * 21 arrived.
 *
 * THE FRAME SHAPE. `git clone --progress` writes everything to stderr and
 * separates frames with a CARRIAGE RETURN, not a newline. A phase ends with
 * a newline on a line ending in `, done.`. Five of the six phases carry a
 * real percentage with a numerator and a denominator; enumerating carries
 * only a count and appears once.
 */

import type { ClonePhase, CloneFailureKind } from '@shared/ipc';

/** One parsed progress frame, before the cloneId is attached. */
export interface CloneFrame {
  phase: ClonePhase;
  percent?: number;
  done?: number;
  total?: number;
  /** Receiving only, e.g. "18.25 MiB". Git's own figure in git's own unit. */
  bytes?: string;
}

/**
 * The five phases that print a percentage, in git's own order.
 *
 * `Checking out files` is git's older spelling of `Updating files`; both are
 * listed so the parser does not go silent on an older git.
 */
const PERCENT_PHASES: ReadonlyArray<readonly [ClonePhase, RegExp]> = [
  ['counting', /^remote: Counting objects:\s+(\d+)% \((\d+)\/(\d+)\)/],
  ['compressing', /^remote: Compressing objects:\s+(\d+)% \((\d+)\/(\d+)\)/],
  [
    'receiving',
    /^Receiving objects:\s+(\d+)% \((\d+)\/(\d+)\)(?:, ([\d.]+) ([KMGT]iB))?/
  ],
  ['resolving', /^Resolving deltas:\s+(\d+)% \((\d+)\/(\d+)\)/],
  ['checkingOut', /^(?:Updating|Checking out) files:\s+(\d+)% \((\d+)\/(\d+)\)/]
];

/** The one phase that prints a count and no percentage, once. */
const ENUMERATING = /^remote: Enumerating objects: (\d+)(?:, done\.)?/;

/**
 * Parse ONE stderr line. Returns null for anything that is not a progress
 * frame, which includes the `Cloning into '...'` line: research 35 §3.10
 * records that the first one is the top level clone and not a submodule, and
 * Tortie shows nothing for it because `starting` is already on screen.
 */
export function parseCloneFrame(line: string): CloneFrame | null {
  for (const [phase, pattern] of PERCENT_PHASES) {
    const m = pattern.exec(line);
    if (m === null) continue;
    const bytes = m[4] !== undefined ? `${m[4]} ${m[5] ?? ''}`.trim() : undefined;
    return {
      phase,
      percent: Number(m[1]),
      done: Number(m[2]),
      total: Number(m[3]),
      ...(bytes !== undefined ? { bytes } : {})
    };
  }
  const enumerating = ENUMERATING.exec(line);
  if (enumerating !== null) {
    return { phase: 'enumerating', total: Number(enumerating[1]) };
  }
  return null;
}

/**
 * Split a stderr chunk into complete lines, on either separator. Returns the
 * lines and whatever partial line is left over for the next chunk.
 */
export function splitFrames(buffered: string): {
  lines: string[];
  rest: string;
} {
  const parts = buffered.split(/\r|\n/);
  const rest = parts.pop() ?? '';
  return { lines: parts.filter((l) => l.trim().length > 0), rest };
}

// ---------------------------------------------------------------------------
// Failures
// ---------------------------------------------------------------------------

/**
 * Ordered substring matchers. Order is the whole design here, and two rows
 * depend on it.
 *
 *  - A disk that fills up prints BOTH `No space left on device` and
 *    `fatal: fetch-pack: invalid index-pack output`, so diskFull must be
 *    tested before interrupted or every full disk reads as a dropped
 *    connection.
 *  - `could not read Username` is tested before anything about a missing
 *    repository, because an unauthenticated request for a private repository
 *    is the commonest private repository failure and the generic network
 *    message is exactly the wrong diagnosis for it.
 *
 * Substrings, never whole lines, so a change in git's punctuation does not
 * silently drop a case (research 35 §3.12).
 */
const FAILURE_MATCHERS: ReadonlyArray<readonly [CloneFailureKind, string[]]> = [
  /**
   * Git prints a DIFFERENT sentence for this depending on which of the four
   * credential switches stopped it, and the one research 35 recorded is not
   * the one Tortie's own command produces. Measured on git 2.50.1 (Apple
   * Git-155) on 2026-08-12, against a GitHub address with no credential
   * helper able to answer:
   *
   *   Tortie's command, with a controlling terminal  →
   *     fatal: unable to get password from user      (120 ms to 1.4 s)
   *   Tortie's command, with no terminal             →
   *     fatal: unable to get password from user
   *   GIT_TERMINAL_PROMPT=0 alone, no core.askPass=  →
   *     fatal: could not read Username for '<host>': terminal prompts disabled
   *
   * The first is the one that ships, because `-c core.askPass=` sends git
   * down the askpass path rather than the terminal path. Matching only the
   * third would have classified every private repository failure as
   * 'unknown' and printed git's raw line instead of the sentence that tells
   * the user how to fix it. All three are matched, because the switches are
   * a set and a later change to one of them must not silently lose the copy.
   */
  [
    'unauthenticated',
    [
      'unable to get password from user',
      'unable to get username from user',
      'terminal prompts disabled',
      'could not read Username',
      'could not read Password'
    ]
  ],
  [
    'authRejected',
    [
      'Authentication failed',
      'Invalid username or token',
      'Invalid username or password'
    ]
  ],
  ['network', ['Could not resolve host', 'Could not resolve proxy']],
  [
    'unreachable',
    [
      'Failed to connect',
      "Couldn't connect to server",
      'Connection refused',
      'Connection timed out'
    ]
  ],
  ['destinationExists', ['already exists and is not an empty directory']],
  ['diskFull', ['No space left on device']],
  ['notFound', ['Repository not found', 'not found']],
  ['badUrl', ['does not exist', 'does not appear to be a git repository']],
  [
    'permission',
    [
      'Permission denied',
      'could not create work tree dir',
      'Read-only file system'
    ]
  ],
  [
    'interrupted',
    [
      'early EOF',
      'invalid index-pack output',
      'RPC failed',
      'The remote end hung up',
      'index-pack failed'
    ]
  ]
];

/**
 * Which failure this was, from git's stderr. `spawnErrorCode` is the errno
 * from the spawn itself, which is how a missing git is recognised: it never
 * reaches stderr because there is no process to write it.
 */
export function classifyCloneFailure(
  stderr: string,
  spawnErrorCode?: string
): CloneFailureKind {
  if (spawnErrorCode === 'ENOENT') return 'gitMissing';
  for (const [kind, needles] of FAILURE_MATCHERS) {
    if (needles.some((needle) => stderr.includes(needle))) return kind;
  }
  return 'unknown';
}

/**
 * The failure COPY lives in `@shared/clone-copy` and is re-exported here.
 *
 * It was written twice during the parallel build, once in this file and once
 * for the renderer, byte for byte the same fifty lines. Main needs it because
 * it fills the `message` on the terminal frame, and the renderer needs it
 * because a failure that arrives as a rejected preflight has no frame at all.
 * Two copies of a copy table drift, and the first thing to drift is the pair
 * research 35 §3.12 says must never be collapsed, which is not found and
 * unauthenticated. So there is one table, in the one place both processes can
 * import, and this file keeps the CLASSIFIER, which is main's alone because
 * only main has git's stderr.
 */
export {
  CLONE_GH_HINT,
  cloneFailureMessage,
  lastStderrLine,
  type CloneFailureContext
} from '@shared/clone-copy';
