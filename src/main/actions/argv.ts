/**
 * Every gh command line Tortie can compose, and the check that keeps them
 * read only (Phase 46, spec section 3.1).
 *
 * This module is pure. It imports nothing, it spawns nothing, and it is the
 * only place a gh argv is built. `assertReadOnlyArgv` runs inside `runGh`
 * before a process exists, so a command line that would mutate GitHub is
 * refused rather than run.
 *
 * FOUR SHAPES, THREE VERBS, and no fifth may be added without editing
 * `GH_ALLOWED_VERBS` and its test:
 *
 *   gh auth status --hostname github.com
 *   gh run list --repo <owner/repo> --branch <branch> --limit <n> --json <f>
 *   gh run list --repo <owner/repo> --commit <sha>    --limit <n> --json <f>
 *   gh run view <runId> --repo <owner/repo> --json jobs,status,conclusion,url
 *
 * `--repo` is always explicit, so gh never guesses the repository from the
 * working directory and never asks which remote was meant.
 *
 * WHY A LEADING DASH IS REFUSED IN EVERY VALUE. A branch name is user data,
 * and git allows a name this process did not choose. A branch called
 * `--upload-pack=evil` handed to gh as a value would be read by gh as a flag.
 * Every value is therefore checked, and a value that starts with a dash is
 * refused rather than passed through. There is no shell anywhere in this
 * path, so a semicolon or a quote in a value is only ever bytes in one argv
 * slot, but a run id is still required to be a positive integer so that
 * `run view 1;rm` cannot be composed at all.
 */

/**
 * The three verbs, as the first two tokens of an argv. The length of this
 * array is asserted by the test, so a fourth verb cannot be added silently.
 */
export const GH_ALLOWED_VERBS: readonly string[] = [
  'auth status',
  'run list',
  'run view'
];

/** The flags the builders below write. No other flag may appear in an argv. */
const ALLOWED_FLAGS: ReadonlySet<string> = new Set([
  '--hostname',
  '--repo',
  '--branch',
  '--commit',
  '--limit',
  '--json'
]);

/** The `--json` field set for a run list. Written once, read by both lists. */
export const RUN_LIST_FIELDS =
  'databaseId,number,workflowName,displayTitle,status,conclusion,event,' +
  'headBranch,headSha,createdAt,startedAt,updatedAt,url';

/** The `--json` field set for a run view. */
export const RUN_VIEW_FIELDS = 'jobs,status,conclusion,url';

/** The only host Tortie asks gh about. */
export const GH_HOSTNAME = 'github.com';

const OWNER_REPO_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const HOSTNAME_RE = /^[A-Za-z0-9.-]+$/;
const POSITIVE_INT_RE = /^[1-9][0-9]*$/;
const SHA_RE = /^[0-9a-fA-F]{7,64}$/;
const JSON_FIELDS_RE = /^[A-Za-z][A-Za-z0-9,]*$/;
/** A branch name has no whitespace in it. git refuses one that does. */
const BRANCH_RE = /^\S+$/;

/** The highest `--limit` this module will compose. */
export const MAX_LIMIT = 50;

export interface RunListForBranchInput {
  ownerRepo: string;
  branch: string;
  limit: number;
}

export interface RunListForCommitInput {
  ownerRepo: string;
  sha: string;
  limit: number;
}

export interface RunViewInput {
  ownerRepo: string;
  runId: number;
}

/** `gh auth status --hostname github.com`. */
export function buildAuthStatusArgv(): string[] {
  return ['auth', 'status', '--hostname', GH_HOSTNAME];
}

/** The latest runs for one branch. */
export function buildRunListForBranchArgv(
  input: RunListForBranchInput
): string[] {
  return [
    'run',
    'list',
    '--repo',
    input.ownerRepo,
    '--branch',
    input.branch,
    '--limit',
    String(input.limit),
    '--json',
    RUN_LIST_FIELDS
  ];
}

/** The runs one pushed commit started. */
export function buildRunListForCommitArgv(
  input: RunListForCommitInput
): string[] {
  return [
    'run',
    'list',
    '--repo',
    input.ownerRepo,
    '--commit',
    input.sha,
    '--limit',
    String(input.limit),
    '--json',
    RUN_LIST_FIELDS
  ];
}

/** One run's jobs and steps. */
export function buildRunViewArgv(input: RunViewInput): string[] {
  return [
    'run',
    'view',
    String(input.runId),
    '--repo',
    input.ownerRepo,
    '--json',
    RUN_VIEW_FIELDS
  ];
}

/** The refusal. It carries the reason so a caller can log it. */
export class GhArgvRefused extends Error {
  constructor(reason: string) {
    super(`refused a gh argv: ${reason}`);
    this.name = 'GhArgvRefused';
  }
}

/** True for a string holding an ASCII control character. */
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Throw unless `argv` is one of the four read only shapes above.
 *
 * Called by `runGh` before a process is created, and called again by the
 * test on every builder's output. It reads the argv rather than trusting the
 * builder that produced it, so a future caller that hand writes a command
 * line gets the same answer.
 */
export function assertReadOnlyArgv(argv: readonly string[]): void {
  const refuse = (reason: string): never => {
    throw new GhArgvRefused(reason);
  };

  if (argv.length < 2) refuse('an argv needs at least a verb and a subverb');
  const verb = `${argv[0] ?? ''} ${argv[1] ?? ''}`;
  if (!GH_ALLOWED_VERBS.includes(verb)) refuse(`"${verb}" is not a read verb`);

  let rest = argv.slice(2);

  if (verb === 'run view') {
    const runId = rest[0];
    if (runId === undefined || !POSITIVE_INT_RE.test(runId)) {
      refuse('run view needs a positive integer run id');
    }
    rest = rest.slice(1);
  }

  const seen = new Set<string>();
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i];
    const value = rest[i + 1];
    if (flag === undefined || !ALLOWED_FLAGS.has(flag)) {
      refuse(`"${String(flag)}" is not a flag this module writes`);
      return;
    }
    if (seen.has(flag)) refuse(`${flag} appears twice`);
    seen.add(flag);
    if (value === undefined || value.length === 0) {
      refuse(`${flag} has no value`);
      return;
    }
    if (value.startsWith('-')) {
      refuse(`the value for ${flag} starts with a dash`);
    }
    if (hasControlChar(value)) {
      refuse(`the value for ${flag} holds a control character`);
    }
    assertFlagValue(flag, value, refuse);
  }

  if (verb === 'run list' && !seen.has('--repo')) {
    refuse('run list must name its repository');
  }
  if (verb === 'run list' && seen.has('--branch') && seen.has('--commit')) {
    refuse('run list takes a branch or a commit, never both');
  }
  if (verb === 'run view' && !seen.has('--repo')) {
    refuse('run view must name its repository');
  }
}

/** The per flag value rules. Split out so the walk above stays readable. */
function assertFlagValue(
  flag: string,
  value: string,
  refuse: (reason: string) => never
): void {
  switch (flag) {
    case '--repo':
      if (!OWNER_REPO_RE.test(value)) refuse('--repo is not owner/repo');
      return;
    case '--hostname':
      if (!HOSTNAME_RE.test(value)) refuse('--hostname is not a host name');
      return;
    case '--limit': {
      if (!POSITIVE_INT_RE.test(value)) {
        refuse('--limit is not a positive integer');
      }
      if (Number(value) > MAX_LIMIT) refuse(`--limit is above ${MAX_LIMIT}`);
      return;
    }
    case '--json':
      if (!JSON_FIELDS_RE.test(value)) refuse('--json is not a field list');
      return;
    case '--commit':
      if (!SHA_RE.test(value)) refuse('--commit is not a commit sha');
      return;
    case '--branch':
      if (!BRANCH_RE.test(value)) refuse('--branch has whitespace in it');
      return;
    default:
      refuse(`no value rule for ${flag}`);
  }
}
