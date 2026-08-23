/**
 * The workflow runs for the branch checked out in one folder on another
 * machine (Phase 105, research 57 section 5).
 *
 * ## What it is for
 *
 * A project can be a folder on another machine. Until this phase the Source
 * Control view on that tab drew the changed files and nothing else, and a person
 * who wanted to know whether the branch over there was green had to open a
 * browser. Now they expand Runs and read the rows.
 *
 * ## The property the whole feature rests on
 *
 * NO CREDENTIAL AND NO `gh` CROSSES. The gh program runs on this Mac and never
 * leaves it. No token, no `gh` invocation and no GitHub host name is sent to the
 * machine. Four short strings travel back, being a mode word, the origin
 * address, the branch name and the commit HEAD points at.
 *
 * That sentence is checkable rather than promised, in three places.
 *
 *  - Condition 55d of `build/conformance-machines.mjs` reads the `repo-facts`
 *    text and fails when it names `gh`, `GH_TOKEN`, `GITHUB_TOKEN`, `GH_HOST`,
 *    `Authorization`, `hosts.yml`, `.config/gh`, `netrc` or `curl`. Condition
 *    55e searches the same nine words in the exact bytes the door composes for a
 *    hostile folder value, which is what actually crosses. Condition 55g fails
 *    when this file makes more than one remote read or names a script other than
 *    `repo-facts`.
 *  - Row 12 of `npm run probe:p105` prints those bytes in full and searches
 *    them, and zero hits is the pass.
 *  - Row 13 of the same probe puts a program called `gh` in every folder the far
 *    side's script changes into, and asserts the file that program would write
 *    never appears. It also asserts every gh process Tortie made stood in this
 *    Mac's own home directory.
 *
 * ## What crosses, drawn
 *
 * ```
 *   THIS MAC                                THE MACHINE
 *   ────────                                ───────────
 *   machines:readRuns ──▶ this module
 *                           │ one read of 'repo-facts', one value
 *                           └──────────▶ git rev-parse x3, awk, base64 x2, tr x2
 *                           ◀──────── repo <url> <branch> <sha>
 *                           │
 *                           │ normalizeGitHubRemote  →  owner/repo
 *                           ▼
 *                         runGh(run list --repo … --branch …)
 *                         runGh(run list --repo … --commit …)   (Phase 120)
 *                           │
 *                           ▼
 *                       github.com     NOTHING ON THIS LINE TOUCHES THE MACHINE
 * ```
 *
 * TWO gh READS SINCE PHASE 120, still both on this Mac's side of the line.
 * GitHub records a tag push run's head branch as the TAG NAME, so the branch
 * query alone can never return a release run. After a good branch read the
 * same gh is asked for the runs the head commit started, one after the
 * other, never in parallel, and the two answers are folded into one list. The
 * ONE REMOTE READ property is untouched: still exactly one `repo-facts` read
 * per call, which is what condition 55g of `build/conformance-machines.mjs`
 * counts. The worst case time grows to the facts deadline plus two read
 * timeouts, being 15 s plus 20 s.
 *
 * ## ONE module from `src/main/actions` is imported since Phase 126
 *
 * Both gh reads, the fold and the cap live in `../actions/runs-read.ts`, and
 * the local Runs section calls the same function. This file imports that one
 * module and nothing else from that directory.
 *
 * Before Phase 126 this file imported five private files of that directory for
 * 11 values and 1 type, being `../actions/argv`, `../actions/merge`,
 * `../actions/parse`, `../actions/spawn` and `../actions/watch`. None of the
 * five was named in that directory's barrel, and the barrel's own header said
 * everything except the two IPC functions was an implementation detail. That
 * was the layering violation the audit ranked as the third P2 of its phase 6,
 * and it is closed. `../actions/index.ts` now names `readMergedRuns` as public,
 * and `src/main/actions/__tests__/p126-boundary.test.ts` fails when any file
 * under this directory imports anything else from there.
 *
 * The import is the leaf and not the `../actions` barrel, on purpose. The
 * barrel pulls `./ipc` and `./service` into the graph, and `./service` pulls
 * `../watcher` and `../typed-events` after it. `../actions/runs-read.ts`
 * imports four pure files and the gh spawn, and nothing else in the repository.
 *
 * ## Two differences from the local Runs path, both deliberate
 *
 * NO `gh auth status` PROBE. The local service runs one at most once per process
 * on the way to the first read. This path does not run one at all.
 * `classifyGhFailure` reads gh's own words and returns the `logged-out` rung from
 * the read itself, which is what the local service's own comment says catches a
 * person signing out. One process fewer on every read, and the panel says the
 * same sentence.
 *
 * gh IS GIVEN THIS MAC'S HOME DIRECTORY AS ITS WORKING DIRECTORY. `--repo
 * owner/repo` is explicit in every argv the allowlist permits, and
 * `assertReadOnlyArgv` refuses a `run list` without it. So no folder on either
 * computer can change the answer, and there is no local repository to point gh
 * at for a project that lives somewhere else.
 *
 * ## What it does not do
 *
 *  - IT WRITES NOTHING, on either computer and on GitHub. No write script, and
 *    every gh shape the allowlist permits is a read.
 *  - IT ADDS NO GIT VERB. `repo-facts` names `rev-parse` and nothing else.
 *  - IT DOES NOT SHOW A RUN'S JOBS OR STEPS. That is a second channel and a
 *    second gh process per row, and research 57 section 5 priced one channel. A
 *    row opens on GitHub instead.
 *  - IT DOES NOT WATCH. Main cannot see a push made on another computer, so
 *    there is no arming path and no poll. The panel says the list does not
 *    refresh.
 *  - IT SETS NO SESSION'S STATUS. Nothing here imports the sessions domain.
 *
 * ## It never throws for anything a machine said
 *
 * A folder that is not there, a folder git does not track, a repository with no
 * GitHub address, a detached head, a machine that did not answer and a machine
 * Tortie is not signed in to are all ordinary states. Each comes back as a
 * result carrying its own mode word, and the renderer draws the sentence from
 * `src/renderer/machines/presentation.ts`. No prose crosses this boundary.
 */

import { homedir } from 'node:os';

import type {
  MachineRunsInput,
  MachineRunsMode,
  MachineRunsResult
} from '@shared/ipc';
import {
  RUNS_READ_LIMITS,
  readMergedRuns,
  type GhSpawner
} from '../actions/runs-read';
import { normalizeGitHubRemote } from '../git/parsers';
import type { RemoteMachineContext } from './context';
import { machineIsConnected, runRemoteRead } from './remote-run';
import { readyRemoteContext } from './remote-sessions';
import { machineLabelOf, machineRow } from './store';

/**
 * The deadline on the facts read, in ms. 15,000.
 *
 * It is the door's own default in `./remote-run.ts`, named here so this file
 * says what it asks for rather than inheriting it silently.
 *
 * ON THE `repo` PATH THE SCRIPT RUNS EIGHT EXTERNAL PROGRAMS, being `git`
 * three times, `awk` once, `base64` twice and `tr` twice. An earlier draft of
 * this header said four, and so does the "4 spawns" price in the Phase 105
 * backlog entry. Both counted the git and awk calls and missed the two encode
 * pairs that carry the origin address and the branch name across as base64.
 * The number was measured on 2026-08-20 by putting counting wrappers on PATH
 * ahead of the real programs and running the shipped script text. Five runs
 * counted eight programs each and no run counted anything else. Without the
 * wrappers the same five runs took 48.5 to 50.5 ms against this repository on
 * this Mac, which is inside the 52.4 ms research 57 priced, so the cost claim
 * holds and only the process count was wrong. The other four branches of the
 * script, being `missing`, `denied`, `notrepo` and a machine that says nothing,
 * run fewer.
 *
 * The deadline is therefore a ceiling on a machine that went to sleep rather
 * than an expectation.
 */
export const REMOTE_RUNS_FACTS_TIMEOUT_MS = 15_000;

/** The four words `repo-facts` may print first. `none` is not one of them. */
const MODE_WORDS: Readonly<
  Record<string, 'repo' | 'notrepo' | 'missing' | 'denied'>
> = {
  repo: 'repo',
  notrepo: 'notrepo',
  missing: 'missing',
  denied: 'denied'
};

const BASE64_ONLY = /^[A-Za-z0-9+/=]*$/;

/** What `git rev-parse --verify --quiet HEAD` prints. Anything else is noise. */
const SHA_ONLY = /^[0-9a-f]{7,64}$/i;

/** What one machine said about one folder. */
export interface RepoFacts {
  readonly mode: 'repo' | 'notrepo' | 'missing' | 'denied';
  /** The first `url` under `[remote "origin"]`, or null. */
  readonly originUrl: string | null;
  /** The branch checked out there, or null on a detached head. */
  readonly branch: string | null;
  /** The commit HEAD points at, or null in a repository with no commits. */
  readonly headSha: string | null;
}

/**
 * The four fields of one `repo-facts` answer, or null when nothing parsed.
 * PURE.
 *
 * The answer is `<word> <base64 or none> <base64 or none> <sha or none>`. Each
 * base64 word is checked before it is decoded, for the reason
 * `./remote-review.ts` states about its own answers: `Buffer.from` DROPS a
 * character it does not know and hands back plausible nonsense, and a person
 * reading a branch name cannot tell nonsense from a branch.
 *
 * A word this module does not know, a field that is not there and a sha that is
 * not hex all make the whole answer unreadable, which the caller reads as the
 * machine not having answered. That is the same treatment `./remote-files.ts`
 * gives a malformed field, and it is louder than a half read answer.
 */
export function parseRepoFactsAnswer(payload: string): RepoFacts | null {
  const words = payload.trim().split(/[ \t\n]+/);
  if (words.length !== 4) return null;
  const mode = MODE_WORDS[words[0] ?? ''];
  if (mode === undefined) return null;
  if (mode !== 'repo') {
    // The far side prints three `none` words on all three refusal branches, and
    // an answer that carries anything else there is a shape this module does not
    // recognise.
    if (words[1] !== 'none' || words[2] !== 'none' || words[3] !== 'none') {
      return null;
    }
    return { mode, originUrl: null, branch: null, headSha: null };
  }
  const originUrl = decodeWord(words[1] ?? '');
  if (originUrl === undefined) return null;
  const branch = decodeWord(words[2] ?? '');
  if (branch === undefined) return null;
  const shaWord = words[3] ?? '';
  const headSha =
    shaWord === 'none' ? null : SHA_ONLY.test(shaWord) ? shaWord : undefined;
  if (headSha === undefined) return null;
  return { mode, originUrl, branch, headSha };
}

/** The decoded word, null for `none`, or undefined when it is not base64. */
function decodeWord(word: string): string | null | undefined {
  if (word === 'none') return null;
  if (word.length === 0 || !BASE64_ONLY.test(word)) return undefined;
  const value = Buffer.from(word, 'base64').toString('utf8');
  return value.length === 0 ? null : value;
}

/**
 * What `normalizeGitHubRemote` answers with for a repository on github.com.
 *
 * The function returns the https PAGE address rather than `owner/repo`, and gh
 * is asked for `owner/repo`, so the two steps below are what turn one into the
 * other.
 */
const GITHUB_PAGE_PREFIX = 'https://github.com/';

/**
 * `owner/repo` for an origin address on github.com, or null. PURE.
 *
 * It is the same two steps `readOwnerRepo` in `../actions/repo.ts` takes, being
 * `normalizeGitHubRemote` and then the prefix. THAT FUNCTION IS NOT REUSED
 * because it spawns git in a folder on THIS Mac to read the address first, and
 * the address here came back from another computer.
 */
export function ownerRepoFrom(originUrl: string): string | null {
  const normalized = normalizeGitHubRemote(originUrl);
  if (normalized === null) return null;
  return normalized.slice(GITHUB_PAGE_PREFIX.length);
}

/** The label this machine's row carries, or its id when there is no row. */
function labelOf(machineId: string): string {
  const row = machineRow(machineId);
  return row === null ? machineId : machineLabelOf(row);
}

/** How many rows gh is asked for, after the clamp. Pure. */
export function runLimitOf(limit: number | undefined): number {
  const asked =
    limit === undefined ? RUNS_READ_LIMITS.RUN_LIMIT : Math.trunc(limit);
  if (!Number.isFinite(asked)) return RUNS_READ_LIMITS.RUN_LIMIT;
  return Math.max(1, Math.min(asked, RUNS_READ_LIMITS.MAX_LIMIT));
}

/** The test seam. Both fields are undefined in the product. */
export interface RemoteRunsSeam {
  /** Test seam: skip the real gh spawn. Passed straight to `runGh`. */
  readonly ghSpawner?: GhSpawner;
  /** Test seam: skip gh binary resolution and the login shell PATH capture. */
  readonly ghBin?: string;
}

/**
 * Everything but the rows, for the seven answers that carry none.
 *
 * THE LADDER READS `ready` ON ALL SEVEN AND NOTHING DRAWS IT. gh was not asked
 * on any of them, and `ActionsHealth` has no word for "not asked". The panel
 * draws the ladder only in the `ok` mode and draws the mode's own sentence
 * otherwise, so this value is never on screen. A rung invented here would be a
 * statement about gh that nothing measured.
 */
function answerWithout(
  input: MachineRunsInput,
  mode: MachineRunsMode,
  started: number,
  facts: RepoFacts | null,
  ownerRepo: string | null
): MachineRunsResult {
  const now = Date.now();
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: typeof input.cwd === 'string' ? input.cwd : '',
    mode,
    ownerRepo,
    branch: facts?.branch ?? null,
    headSha: facts?.headSha ?? null,
    limit: runLimitOf(input.limit),
    runs: [],
    issues: [],
    health: { state: 'ready' },
    readAt: now,
    elapsedMs: now - started
  };
}

/**
 * Ask one machine which branch is checked out in one folder, then ask GitHub
 * about that branch from this Mac.
 *
 * @returns a result carrying `ok` and its rows, or one of the seven refusals. It
 *   NEVER THROWS for anything the machine said, and it never throws at all: the
 *   one value it takes beside the machine is a folder, and a folder that is not
 *   absolute is answered rather than refused.
 */
export async function readRunsOnMachine(
  input: MachineRunsInput,
  seam: RemoteRunsSeam = {}
): Promise<MachineRunsResult> {
  const started = Date.now();
  // A path that is not absolute names nothing on that machine. It is reported
  // rather than sent, because the far side's shell would resolve it against
  // whatever folder it started in. That is `./remote-files.ts`'s rule.
  if (typeof input.cwd !== 'string' || !input.cwd.startsWith('/')) {
    return answerWithout(input, 'missing', started, null, null);
  }
  if (!machineIsConnected(input.machineId)) {
    return answerWithout(input, 'notConnected', started, null, null);
  }
  let ctx: RemoteMachineContext;
  try {
    ctx = readyRemoteContext(input.machineId);
  } catch {
    return answerWithout(input, 'notConnected', started, null, null);
  }
  let facts: RepoFacts | null;
  try {
    const out = await runRemoteRead(ctx, 'repo-facts', [input.cwd], {
      timeoutMs: REMOTE_RUNS_FACTS_TIMEOUT_MS
    });
    facts = parseRepoFactsAnswer(out.payload);
  } catch {
    return answerWithout(input, 'unreachable', started, null, null);
  }
  // A payload nothing could read is a machine that did not answer, rather than
  // a guess about a folder. The shape this expected is in
  // `parseRepoFactsAnswer`.
  if (facts === null) {
    return answerWithout(input, 'unreachable', started, null, null);
  }
  if (facts.mode === 'missing') {
    return answerWithout(input, 'missing', started, facts, null);
  }
  if (facts.mode === 'denied') {
    return answerWithout(input, 'denied', started, facts, null);
  }
  if (facts.mode === 'notrepo') {
    return answerWithout(input, 'notRepo', started, facts, null);
  }
  const ownerRepo =
    facts.originUrl === null ? null : ownerRepoFrom(facts.originUrl);
  // The branch and the head sha are still reported here, because they are facts
  // about that folder and the panel names the branch either way.
  if (ownerRepo === null) {
    return answerWithout(input, 'notGitHub', started, facts, null);
  }
  if (facts.branch === null) {
    // A detached head and a repository with no commits both land here, and the
    // sentence on screen names both. NO gh PROCESS IS CREATED.
    return answerWithout(input, 'noBranch', started, facts, ownerRepo);
  }
  const limit = runLimitOf(input.limit);
  // BOTH gh READS AND THE FOLD LIVE IN `../actions/runs-read.ts` SINCE PHASE
  // 126, and the local Runs section calls the same function with the same
  // rules, so the two panels cannot disagree about what a merged list is.
  //
  // THIS MAC'S HOME DIRECTORY, for BOTH gh reads. `--repo` is explicit in every
  // argv the allowlist permits, so no folder on either computer can change the
  // answer, and there is no local repository to point gh at for a project that
  // lives somewhere else. The seam fields are the same for both reads, so a
  // test that captures one captures the other.
  //
  // The cap is left at its default of true. This path has no rows on screen to
  // fold into and no watched commit, so this is the only place it caps. The
  // local service passes `cap: false` and caps in its own fold instead.
  const read = await readMergedRuns(
    {
      ownerRepo,
      branch: facts.branch,
      tipSha: facts.headSha,
      limit,
      cwd: homedir()
    },
    {
      ...(seam.ghSpawner === undefined ? {} : { spawner: seam.ghSpawner }),
      ...(seam.ghBin === undefined ? {} : { bin: seam.ghBin })
    }
  );
  if (read.refused) {
    // A branch name gh would read as a flag is refused before a process is
    // made, and git cannot make such a name, so this is a guard on a case
    // nobody has rather than a case anybody has hit.
    return answerWithout(input, 'noBranch', started, facts, ownerRepo);
  }
  // The machine answered fine and GitHub is a separate question, so the mode
  // stays `ok` either way and the rung says what went wrong with gh. A branch
  // read that failed carries its own rung and no rows. A commit read that
  // failed carries its rung and the branch rows stand.
  const runs = read.runs;
  const issues = read.issues;
  const health = read.health;
  const now = Date.now();
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: input.cwd,
    mode: 'ok',
    ownerRepo,
    branch: facts.branch,
    headSha: facts.headSha,
    limit,
    runs,
    issues,
    health,
    readAt: now,
    elapsedMs: now - started
  };
}
