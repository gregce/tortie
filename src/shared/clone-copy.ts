/**
 * The sentence a user reads when a clone fails (Phase 18.6, research 35 §3.12).
 *
 * SHARED, and for the same reason `clone-url.ts` and `project-create.ts` are
 * shared: two processes have to produce the same words. Main fills the
 * `message` field of the terminal frame, because it is the only side that can
 * probe `gh` and the only side that has git's stderr. The renderer builds the
 * same sentence from the `kind` on the frame, because a failure that arrives
 * by a rejected preflight has no frame at all. Written twice, the two copies
 * drift, and the first thing that drifts is the pair below that must never be
 * collapsed.
 *
 * TWO PROPERTIES OF THIS COPY ARE LOAD BEARING.
 *
 *  - Not found and unauthenticated are different states with different fixes.
 *    The commonest private repository failure is that Tortie never signed in,
 *    and telling that user to check the address sends them the wrong way.
 *  - Not found and private are NOT separated, because they cannot be. GitHub
 *    returns the same two lines for a repository that does not exist and one
 *    you cannot read, and it does that deliberately. GitLab differs again. So
 *    the sentence names both possibilities rather than picking one.
 *
 * Every "nothing was left behind" claim is true only because a clone runs in a
 * temporary sibling directory that is removed on any failure. If that
 * mechanism goes, this copy goes with it.
 *
 * A message may contain a newline. The reader prints each line as its own.
 */

// The kind union is IMPORTED rather than mirrored. It was written out here a
// second time during the parallel build, which is exactly how a thirteenth
// kind gets added to the wire and never gets a sentence: the switch below is
// exhaustive over this type, so it stops compiling the moment ipc.ts grows a
// member. A type-only import, so no runtime edge is added between the two
// modules.
import type { CloneFailureKind } from './ipc';
import { CLONE_BAD_URL_MESSAGE } from './clone-url';

/**
 * Which failure happened. The name this module used before the two copies of
 * the table were merged; kept as an alias so neither caller has to rename.
 */
export type CloneFailureName = CloneFailureKind;

/** What the copy needs to name the thing that failed. */
export interface CloneFailureContext {
  /** e.g. "github.com". */
  host: string;
  owner?: string;
  repo?: string;
  /** The folder name the user asked for, for the collision message. */
  name?: string;
  /** git's stderr, used only by the 'unknown' case. */
  stderr?: string;
  /**
   * A second line for the unauthenticated case, added by the caller only when
   * `gh` is installed AND already signed in to this host. Research 35 §3.7 is
   * explicit that Tortie does not configure `gh` as a credential helper, so
   * this is a sentence and never an action.
   */
  ghHint?: string;
}

/** The second line for the unauthenticated case, when `gh` can help. */
export const CLONE_GH_HINT =
  'Running gh auth setup-git will let git use your GitHub login.';

/**
 * The heading over a failure nothing classified. It says the clone did not
 * finish and then hands over to git's own last line, because naming a cause we
 * did not identify would be a guess.
 */
export const CLONE_UNKNOWN_HEADING = 'The clone did not finish.';

/** The same sentence src/main/git/exec.ts shows, so a machine without the
 *  command line tools is told once, in one voice. */
export const CLONE_GIT_MISSING_MESSAGE =
  'Git is not installed (or not on PATH). Install the Xcode Command Line Tools: xcode-select --install';

/** The last line git wrote that carries any text. */
export function lastStderrLine(stderr: string): string {
  const lines = stderr
    .split(/\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines[lines.length - 1] ?? '';
}

/** The sentence the user reads. One row per kind, and no generic fallback. */
export function cloneFailureMessage(
  kind: CloneFailureName,
  ctx: CloneFailureContext
): string {
  const repoLabel =
    ctx.owner !== undefined && ctx.repo !== undefined
      ? `${ctx.owner}/${ctx.repo}`
      : (ctx.repo ?? ctx.name ?? 'that repository');

  switch (kind) {
    case 'badUrl':
      return CLONE_BAD_URL_MESSAGE;
    case 'network':
      return `Tortie could not reach ${ctx.host}. Check your internet connection and try again.`;
    case 'unreachable':
      return `Tortie could not connect to ${ctx.host}. The server may be down, or a VPN may be needed.`;
    case 'notFound':
      return `Tortie could not find ${repoLabel}. Check the address, and check that your account has access to it.`;
    case 'unauthenticated': {
      const first = `Tortie could not sign in to ${ctx.host}. Clone this repository once from your terminal so macOS saves the credential, then try again.`;
      return ctx.ghHint === undefined ? first : `${first}\n${ctx.ghHint}`;
    }
    case 'authRejected':
      return `The saved credential for ${ctx.host} was rejected. It may have expired. Sign in again from your terminal, then try again.`;
    case 'destinationExists':
      // The wording projects:create already ships, by name, so a clone and a
      // create refuse the same collision with the same sentence.
      return `'${ctx.name ?? repoLabel}' already exists in that folder.`;
    case 'permission':
      return 'Tortie cannot write to that folder. Choose another one.';
    case 'diskFull':
      return 'The disk filled up before the clone finished. Nothing was left behind. Free some space and try again.';
    case 'interrupted':
      return 'The download stopped before it finished. Nothing was left behind. Try again.';
    case 'gitMissing':
      return CLONE_GIT_MISSING_MESSAGE;
    case 'unknown': {
      const last = lastStderrLine(ctx.stderr ?? '');
      return last.length === 0
        ? CLONE_UNKNOWN_HEADING
        : `${CLONE_UNKNOWN_HEADING}\n${last}`;
    }
  }
}
