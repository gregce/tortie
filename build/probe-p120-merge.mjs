/**
 * `node build/probe-p120-merge.mjs`. The live probe of Phase 120, being the
 * two query merge that lets a release run started from a tag appear in Runs.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT BELOW
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE OTHER MACHINE IS THIS MAC. So five rules, all of them here:
 *
 *  1. The target is 127.0.0.1 and the probe refuses to run against anything
 *     else. The operator's machines and every tailnet host are never contacted.
 *  2. `refuseRealSockets` refuses the socket names `gmux` and `default` before
 *     anything is started.
 *  3. Every pid is recorded as it is created and only recorded pids are killed.
 *     There is no `pkill` and no `kill-server` in this file.
 *  4. The only repositories this probe touches are ones it makes under /tmp. It
 *     never opens the repository this file lives in, and it runs no git verb
 *     that writes in any repository the operator has. The one real repository
 *     it reads is a public one on github.com, and it is read through gh verbs
 *     that write nothing.
 *  5. `tmux -L gmux list-sessions` is counted before and after and both numbers
 *     are printed. A difference is a failure.
 *
 * Every scratch file carries a `p120-` prefix.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES, AND HOW EACH ONE IS MEASURED RATHER THAN ASSERTED
 * ---------------------------------------------------------------------------
 * Five rows, printed one per line with the evidence beside each one.
 *
 *  1. The operator's session count before anything started.
 *  2. THE REAL REPOSITORY ROW. With the real gh, the recent runs of a public
 *     repository are listed and a completed run whose head branch matches
 *     `^v[0-9]` is found, being a run a tag push started. Its head sha stands
 *     as the branch tip. The two argvs Tortie composes are then run with the
 *     real gh: the branch query's answer OMITS that run, and the merged
 *     answer CONTAINS it. The run id is printed. When gh is missing or not
 *     signed in this row prints SKIPPED with the reason, and a skipped row is
 *     never a pass.
 *  3. THE DEDUPE ROW. A fake gh answers both queries with one overlapping run
 *     id. The merged list holds that id exactly once, holds the union
 *     otherwise, and the overlapping row is the COMMIT query's copy.
 *  4. THE REMOTE ROW, through `readRunsOnMachine` against the loopback scratch
 *     machine. A fake gh records every invocation: exactly two, the branch
 *     query first and the commit query second, both with `--repo` explicit,
 *     both standing in this Mac's home directory. The exact bytes the door
 *     composes for the far side are searched for the nine credential words,
 *     expecting zero hits. Then one end to end read with the REAL gh when it
 *     is signed in, with the scratch repository's head set to the tag run's
 *     own commit, so the run from row 2 comes back through the remote path
 *     too. SKIPPED otherwise, and a skipped read is never a pass.
 *  5. The operator's session count did not move.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE
 * ---------------------------------------------------------------------------
 * The far side is this Mac, so no Linux machine is measured. Row 2 stands a
 * found commit in for the branch tip rather than checking the repository out,
 * so it proves the two argvs and the merge, not the tip reading in
 * `service.ts`, which the unit tests in
 * `src/main/actions/__tests__/service.test.ts` hold. A tag cut on a commit
 * that is not the branch tip is out of the phase and is not probed. Rows 2
 * and 4 contact github.com when they run.
 *
 * Exit 0 when every row passes, 1 with every failing row named, 2 when it
 * refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  machineTmuxTmp,
  refuseRealSockets,
  scratchMachine,
  scratchYard
} from './scratch-machine.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The only address this probe may ever contact over ssh. */
const TARGET = '127.0.0.1';
const PORT = 45820;

/**
 * The public repositories row 2 asks GitHub about, first one first. The
 * operator's own report was measured on the first one.
 */
const REAL_REPOS = ['gregce/deadreckon', 'gregce/tortie'];

/** A head branch that is a release tag rather than a branch. */
const TAG_BRANCH_RE = /^v[0-9]/;

/**
 * The nine words a credential would have to travel in, composed from pieces so
 * this file's own text does not answer its own search.
 */
const CREDENTIAL_WORDS = [
  `g${'h'}`,
  `GH${'_'}TOKEN`,
  `GITHUB${'_'}TOKEN`,
  `GH${'_'}HOST`,
  `Author${'i'}zation`,
  `hosts${'.'}yml`,
  `.config/g${'h'}`,
  `net${'r'}c`,
  `cu${'r'}l`
];

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p120-merge-${String(process.pid)}`,
  'p120-merge'
);

const root = join('/tmp', `p120-merge-${String(process.pid)}`);
const recordedPids = [];
const failures = [];

const say = (text) => process.stdout.write(`[p120-merge] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p120-merge] FAIL: ${text}\n`);
};
const step = (n, what, evidence) =>
  process.stdout.write(`[p120-merge] ${String(n)}. ${what}: ${evidence}\n`);

function sh(file, args, options = {}) {
  const out = spawnSync(file, args, {
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
    ...options
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? '',
    stderr: out.stderr ?? '',
    both: `${out.stdout ?? ''}${out.stderr ?? ''}`
  };
}

/** How many sessions the operator's own tmux server holds. Read only. */
function operatorSessions() {
  const out = sh('/bin/sh', [
    '-c',
    'tmux -L gmux list-sessions 2>/dev/null | wc -l'
  ]);
  return out.stdout.trim();
}

const sessionsBefore = operatorSessions();
step(1, 'the operator’s sessions on -L gmux, before', sessionsBefore);

mkdirSync(root, { recursive: true, mode: 0o700 });

// ---------------------------------------------------------------------------
// The scratch repository the loopback machine answers for
// ---------------------------------------------------------------------------

const gitEnv = {
  GIT_AUTHOR_NAME: 'Probe',
  GIT_AUTHOR_EMAIL: 'probe@example.invalid',
  GIT_COMMITTER_NAME: 'Probe',
  GIT_COMMITTER_EMAIL: 'probe@example.invalid'
};

const gitIn = (dir, ...args) =>
  sh('/usr/bin/git', ['-C', dir, ...args], {
    env: { ...process.env, ...gitEnv }
  });

const work = join(root, 'p120-repo');
mkdirSync(work, { recursive: true, mode: 0o700 });
gitIn(work, 'init', '-q', '-b', 'main');
gitIn(work, 'remote', 'add', 'origin', 'git@github.com:owner/repo.git');
writeFileSync(join(work, 'p120-one.ts'), 'export const one = 1;\n', 'utf8');
gitIn(work, 'add', '-A');
gitIn(work, 'commit', '-q', '-m', 'the first commit');
const workSha = gitIn(work, 'rev-parse', 'HEAD').stdout.trim();

// ---------------------------------------------------------------------------
// The canned answers the two fake ghs give
// ---------------------------------------------------------------------------

/** One well formed run row of the shape `gh run list --json …` answers with. */
function cannedRun(over) {
  return {
    databaseId: 0,
    number: 1,
    workflowName: 'CI',
    displayTitle: 'a run',
    status: 'completed',
    conclusion: 'success',
    event: 'push',
    headBranch: 'main',
    headSha: '1'.repeat(40),
    createdAt: '2026-08-20T06:00:00Z',
    startedAt: '2026-08-20T06:00:05Z',
    updatedAt: '2026-08-20T06:03:00Z',
    url: 'https://github.com/owner/repo/actions/runs/0',
    ...over
  };
}

// Row 3, the dedupe row. Run 9002 is answered by BOTH queries, and the two
// copies differ in their title so the winner is visible. Run 9101 is the tag
// run only the commit query returns.
const dedupeBranchJson = join(root, 'p120-dedupe-branch.json');
const dedupeCommitJson = join(root, 'p120-dedupe-commit.json');
writeFileSync(
  dedupeBranchJson,
  JSON.stringify([
    cannedRun({
      databaseId: 9001,
      number: 11,
      createdAt: '2026-08-20T09:00:00Z',
      startedAt: '2026-08-20T09:00:05Z'
    }),
    cannedRun({
      databaseId: 9002,
      number: 12,
      displayTitle: 'the branch read of the same run',
      status: 'in_progress',
      conclusion: null,
      createdAt: '2026-08-20T08:00:00Z',
      startedAt: '2026-08-20T08:00:05Z'
    })
  ]),
  'utf8'
);
writeFileSync(
  dedupeCommitJson,
  JSON.stringify([
    cannedRun({
      databaseId: 9002,
      number: 12,
      displayTitle: 'the commit read of the same run',
      createdAt: '2026-08-20T08:00:00Z',
      startedAt: '2026-08-20T08:00:05Z'
    }),
    cannedRun({
      databaseId: 9101,
      number: 13,
      workflowName: 'Release',
      displayTitle: 'the tag run',
      status: 'in_progress',
      conclusion: null,
      headBranch: 'v9.9.9',
      createdAt: '2026-08-20T07:00:00Z',
      startedAt: '2026-08-20T07:00:05Z'
    })
  ]),
  'utf8'
);

// Row 4, the remote row. Run 7001 overlaps, run 7100 is the tag run and its
// head sha is the scratch repository's own head, which is the sha the far
// side reports and the commit query then asks about.
const remoteBranchJson = join(root, 'p120-remote-branch.json');
const remoteCommitJson = join(root, 'p120-remote-commit.json');
writeFileSync(
  remoteBranchJson,
  JSON.stringify([
    cannedRun({
      databaseId: 7001,
      number: 21,
      headSha: workSha,
      createdAt: '2026-08-20T09:00:00Z',
      startedAt: '2026-08-20T09:00:05Z'
    }),
    cannedRun({
      databaseId: 7002,
      number: 22,
      createdAt: '2026-08-20T08:00:00Z',
      startedAt: '2026-08-20T08:00:05Z'
    })
  ]),
  'utf8'
);
writeFileSync(
  remoteCommitJson,
  JSON.stringify([
    cannedRun({
      databaseId: 7001,
      number: 21,
      headSha: workSha,
      createdAt: '2026-08-20T09:00:00Z',
      startedAt: '2026-08-20T09:00:05Z'
    }),
    cannedRun({
      databaseId: 7100,
      number: 23,
      workflowName: 'Release',
      displayTitle: 'the tag run through the remote path',
      status: 'in_progress',
      conclusion: null,
      headBranch: 'v9.9.9',
      headSha: workSha,
      createdAt: '2026-08-20T07:00:00Z',
      startedAt: '2026-08-20T07:00:05Z'
    })
  ]),
  'utf8'
);

/**
 * A fake gh. It records where it stood and what it was asked, then answers
 * the branch query and the commit query from the two canned files.
 */
function writeFakeGh(dir, log, branchJson, commitJson) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = join(dir, 'gh');
  writeFileSync(
    path,
    [
      '#!/bin/sh',
      `printf '%s\\036%s\\n' "$PWD" "$*" >> '${log}'`,
      'case "$*" in',
      `  *--commit*) cat '${commitJson}' ;;`,
      `  *--branch*) cat '${branchJson}' ;;`,
      `  *) printf '[]' ;;`,
      'esac',
      ''
    ].join('\n'),
    'utf8'
  );
  chmodSync(path, 0o755);
  return path;
}

const dedupeLog = join(root, 'p120-gh-log-dedupe');
const remoteLog = join(root, 'p120-gh-log-remote');
const dedupeGh = writeFakeGh(
  join(root, 'p120-fake-dedupe'),
  dedupeLog,
  dedupeBranchJson,
  dedupeCommitJson
);
const remoteGh = writeFakeGh(
  join(root, 'p120-fake-remote'),
  remoteLog,
  remoteBranchJson,
  remoteCommitJson
);

/** The recorded invocations of one fake gh, in order. */
function ghLog(log) {
  if (!existsSync(log)) return [];
  return readFileSync(log, 'utf8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const [cwd, argv] = line.split('\u001e');
      return { cwd: cwd ?? '', argv: argv ?? '' };
    });
}

// ---------------------------------------------------------------------------
// The driver. Every read below is Tortie's own code
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p120-merge-driver.ts');
writeFileSync(
  driverPath,
  String.raw`
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { tsxCli } from './ts-runner.mjs';

// An async main rather than top level await: the driver is compiled to a
// CommonJS module and top level await is not available there.
async function main(): Promise<void> {

const REPO = '__REPO__';
const input = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8'));
const outPath = process.argv[3] ?? '';

const argvMod = await import(REPO + '/src/main/actions/argv');
const parseMod = await import(REPO + '/src/main/actions/parse');
const mergeMod = await import(REPO + '/src/main/actions/merge');
const spawnMod = await import(REPO + '/src/main/actions/spawn');

const answers: unknown[] = [];

/** The two Tortie composed queries, run one after the other, then merged. */
async function localOp(op: Record<string, unknown>): Promise<unknown> {
  const branchArgv = argvMod.buildRunListForBranchArgv({
    ownerRepo: String(op.ownerRepo),
    branch: String(op.branch),
    limit: Number(op.branchLimit)
  });
  const commitArgv = argvMod.buildRunListForCommitArgv({
    ownerRepo: String(op.ownerRepo),
    sha: String(op.sha),
    limit: Number(op.commitLimit)
  });
  // The belt, called here the way remote-runs.ts calls it. runGh calls it
  // again on its own first line, so a write shaped argv cannot run at all.
  argvMod.assertReadOnlyArgv(branchArgv);
  argvMod.assertReadOnlyArgv(commitArgv);
  const options = {
    cwd: homedir(),
    timeoutMs: spawnMod.READ_TIMEOUT_MS,
    bin: String(op.ghBin)
  };
  const branchOut = await spawnMod.runGh(branchArgv, options);
  if (branchOut.ok !== true) {
    return { ok: false, why: 'branch query: ' + JSON.stringify(branchOut) };
  }
  const commitOut = await spawnMod.runGh(commitArgv, options);
  if (commitOut.ok !== true) {
    return { ok: false, why: 'commit query: ' + JSON.stringify(commitOut) };
  }
  const branchParsed = parseMod.parseRunList(
    parseMod.parseJsonOrNull(branchOut.stdout)
  );
  const commitParsed = parseMod.parseRunList(
    parseMod.parseJsonOrNull(commitOut.stdout)
  );
  const merged = mergeMod.mergeRunQueries(branchParsed.runs, commitParsed.runs);
  return {
    ok: true,
    branchArgv,
    commitArgv,
    branchIds: branchParsed.runs.map((run: { id: number }) => run.id),
    commitIds: commitParsed.runs.map((run: { id: number }) => run.id),
    merged: merged.map(
      (run: {
        id: number;
        headBranch: string;
        displayTitle: string;
        statusRaw: string;
      }) => ({
        id: run.id,
        headBranch: run.headBranch,
        displayTitle: run.displayTitle,
        statusRaw: run.statusRaw
      })
    )
  };
}

let composed = '';

try {
  if (input.machine !== null) {
    const context = await import(REPO + '/src/main/machines/context');
    const remotePath = await import(REPO + '/src/main/machines/remote-path');
    const control = await import(REPO + '/src/main/machines/control-plane');
    const door = await import(REPO + '/src/main/machines/remote-run');
    const catalogue = await import(REPO + '/src/main/machines/remote-scripts');
    const m = input.machine as Record<string, unknown>;
    const ctx = {
      kind: 'remote' as const,
      machineId: String(m.machineId),
      sshBin: '/usr/bin/ssh',
      host: String(m.host),
      user: String(m.user),
      port: Number(m.port),
      remoteTmuxPath: String(m.remoteTmuxPath),
      socket: String(m.socket),
      controlPath: String(m.controlPath),
      hostKeys: { tortie: String(m.hostKeys), user: String(m.userHostKeys) }
    };
    context.registerRemoteMachineContext(ctx);
    await remotePath.captureRemotePath(ctx);
    // The link has to read as answering for the one door to open at all.
    control.noteMachineAnswered(String(m.machineId), Date.now());
    // The exact bytes the door composes for this read, so a reader can see
    // them rather than trust a search over them. PURE: nothing is sent here.
    const script = catalogue.remoteScript('repo-facts');
    composed =
      script === null
        ? ''
        : door.composeRemoteScriptCommand(script, [String(input.showCwd)]);
  }
  for (const op of input.ops as Record<string, unknown>[]) {
    try {
      if (op.kind === 'local') {
        answers.push({ name: op.name, ...(await localOp(op)) });
        continue;
      }
      const runs = await import(REPO + '/src/main/machines/remote-runs');
      const m = input.machine as Record<string, unknown>;
      const answer = await runs.readRunsOnMachine(
        { machineId: String(m.machineId), cwd: String(op.cwd) },
        typeof op.ghBin === 'string' ? { ghBin: op.ghBin } : {}
      );
      answers.push({ name: op.name, ok: true, answer });
    } catch (err) {
      answers.push({
        name: op.name,
        ok: false,
        why: String((err as Error).message)
      });
    }
  }
} catch (err) {
  answers.push({ name: 'setup', ok: false, why: String((err as Error).message) });
}

writeFileSync(outPath, JSON.stringify({ answers, composed }), 'utf8');
process.exit(0);
}

void main();
`.replace('__REPO__', repoRoot),
  'utf8'
);

let driverCalls = 0;
let yardForEnv = null;

function drive(input) {
  driverCalls += 1;
  const inPath = join(root, `p120-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p120-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const out = sh(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      timeout: 300_000,
      env: {
        ...process.env,
        // Without both of these `activeTmuxSocket` refuses to leave the real
        // socket, and the far side of this probe is the machine holding the
        // operator's live sessions.
        GMUX_SMOKE: 'probe-p120-merge',
        GMUX_TMUX_SOCKET: SOCKET,
        SSH_AUTH_SOCK: yardForEnv?.authSock ?? process.env['SSH_AUTH_SOCK'] ?? ''
      }
    }
  );
  if (!existsSync(outPath)) {
    fail(
      `the driver did not answer. It printed:\n` +
        `${out.both.trim().split('\n').slice(-12).join('\n')}`
    );
    return null;
  }
  return JSON.parse(readFileSync(outPath, 'utf8'));
}

// ---------------------------------------------------------------------------
// Is there a signed in gh on this Mac at all?
// ---------------------------------------------------------------------------

const ghHere = sh('/bin/sh', ['-c', 'command -v gh']).stdout.trim();
const signedIn =
  ghHere.length > 0 &&
  sh('/bin/sh', ['-c', 'gh auth status --hostname github.com']).code === 0;

// ---------------------------------------------------------------------------
// Row 2. The real repository, read only
// ---------------------------------------------------------------------------

/**
 * A completed run a tag push started, found in the first repository that has
 * one. Listing runs and viewing the default branch write nothing.
 */
function findTagRun() {
  for (const repo of REAL_REPOS) {
    const branchOut = sh(ghHere, [
      'repo',
      'view',
      repo,
      '--json',
      'defaultBranchRef',
      '--jq',
      '.defaultBranchRef.name'
    ]);
    if (branchOut.code !== 0) continue;
    const defaultBranch = branchOut.stdout.trim();
    if (defaultBranch.length === 0) continue;
    const listOut = sh(ghHere, [
      'run',
      'list',
      '--repo',
      repo,
      '--limit',
      '50',
      '--json',
      'databaseId,headBranch,headSha,status'
    ]);
    if (listOut.code !== 0) continue;
    let rows;
    try {
      rows = JSON.parse(listOut.stdout);
    } catch {
      continue;
    }
    const run = (Array.isArray(rows) ? rows : []).find(
      (row) =>
        row !== null &&
        typeof row === 'object' &&
        row.status === 'completed' &&
        typeof row.headBranch === 'string' &&
        TAG_BRANCH_RE.test(row.headBranch) &&
        typeof row.headSha === 'string'
    );
    if (run !== undefined) return { repo, defaultBranch, run };
  }
  return null;
}

let realRepo = null;
let realBranch = null;
let realTagRun = null;

if (!signedIn) {
  step(
    2,
    'the real repository row',
    `SKIPPED. ${
      ghHere.length === 0
        ? 'This Mac has no gh on its path.'
        : 'This Mac has gh and it is not signed in to github.com.'
    } A skipped row is not a pass.`
  );
} else {
  const found = findTagRun();
  if (found === null) {
    fail(
      `no completed run whose head branch matches ^v[0-9] was found in the ` +
        `newest 50 runs of ${REAL_REPOS.join(' or ')}. Add a repository that ` +
        `releases from tags to REAL_REPOS in this file and run the probe again.`
    );
    step(2, 'the real repository row', 'no tag run to measure against');
  } else {
    realRepo = found.repo;
    realBranch = found.defaultBranch;
    realTagRun = found.run;
    const driven = drive({
      machine: null,
      showCwd: '',
      ops: [
        {
          name: 'real',
          kind: 'local',
          ownerRepo: found.repo,
          branch: found.defaultBranch,
          sha: found.run.headSha,
          branchLimit: 50,
          commitLimit: 20,
          ghBin: ghHere
        }
      ]
    });
    const row = driven?.answers?.[0];
    if (row === undefined || row.ok !== true) {
      fail(`the real repository read did not answer. ${String(row?.why ?? '')}`);
    } else {
      const id = found.run.databaseId;
      const inBranch = row.branchIds.includes(id);
      const inMerged = row.merged.some((run) => run.id === id);
      step(
        2,
        'the real repository row',
        `run ${String(id)} on ${found.repo}, head branch ` +
          `${found.run.headBranch}, commit ${found.run.headSha.slice(0, 12)} ` +
          `standing as the tip of ${found.defaultBranch}. The branch query ` +
          `answered ${String(row.branchIds.length)} run(s) and ` +
          `${inBranch ? 'CONTAINS IT' : 'omits it'}; the merged answer holds ` +
          `${String(row.merged.length)} run(s) and ` +
          `${inMerged ? 'contains it' : 'OMITS IT'}.`
      );
      if (inBranch) {
        fail(
          `the branch query alone returned run ${String(id)}, so this row ` +
            `measured nothing. GitHub records a tag push run under the tag ` +
            `name, and this run's head branch is ` +
            `${String(found.run.headBranch)}.`
        );
      }
      if (!inMerged) {
        fail(
          `the merged answer omits run ${String(id)}. The whole phase exists ` +
            `to put that run in the list.`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Row 3. The dedupe, with a fake gh answering both queries
// ---------------------------------------------------------------------------

{
  const driven = drive({
    machine: null,
    showCwd: '',
    ops: [
      {
        name: 'dedupe',
        kind: 'local',
        ownerRepo: 'owner/repo',
        branch: 'main',
        sha: 'f'.repeat(40),
        branchLimit: 10,
        commitLimit: 20,
        ghBin: dedupeGh
      }
    ]
  });
  const row = driven?.answers?.[0];
  if (row === undefined || row.ok !== true) {
    fail(`the dedupe read did not answer. ${String(row?.why ?? '')}`);
  } else {
    const ids = row.merged.map((run) => run.id);
    const copies = ids.filter((id) => id === 9002).length;
    const shared = row.merged.find((run) => run.id === 9002);
    const wantIds = [9001, 9002, 9101];
    const union =
      ids.length === wantIds.length &&
      wantIds.every((id) => ids.includes(id));
    step(
      3,
      'the dedupe row',
      `both queries answered run 9002. The merged list is ` +
        `[${ids.join(', ')}]: run 9002 appears ${String(copies)} time(s), ` +
        `and the copy kept is titled "${String(shared?.displayTitle)}".`
    );
    if (copies !== 1) {
      fail(`run 9002 appears ${String(copies)} time(s) in the merged list.`);
    }
    if (!union) {
      fail(
        `the merged list is [${ids.join(', ')}] and the union of the two ` +
          `answers is [${wantIds.join(', ')}].`
      );
    }
    if (shared?.displayTitle !== 'the commit read of the same run') {
      fail(
        `the copy kept for run 9002 is the branch query's. The commit query ` +
          `ran second, so its copy is the newer read and it wins.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Row 4. The remote path, against the loopback scratch machine
// ---------------------------------------------------------------------------

const yard = scratchYard({
  root,
  prefix: 'p120',
  record: (pid) => {
    if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
  }
});
yardForEnv = yard;

const machine = scratchMachine(yard, { id: 'one', port: PORT });

function stopEverything() {
  try {
    machine.stop();
  } catch {
    /* already gone, which is the state we wanted */
  }
  for (const pid of [...recordedPids].reverse()) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  try {
    machine.cleanup();
  } catch {
    /* nothing to remove */
  }
  const tmuxTmp = machineTmuxTmp('p120', 'one');
  if (existsSync(tmuxTmp)) rmSync(tmuxTmp, { recursive: true, force: true });
  // Every scratch repository, key and driver file this run wrote. Nothing
  // outside this one directory is removed, and the directory name carries this
  // process id, so a run cannot reach another run's files.
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
}

if (!machine.start()) {
  fail('the scratch sign in server did not start, so nothing could be measured.');
  stopEverything();
  process.exit(2);
}
say(`scratch machine on ${TARGET}:${String(PORT)}, socket ${SOCKET}`);

const machineInput = {
  machineId: 'p120-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  remoteTmuxPath: yard.tmuxPath,
  socket: SOCKET,
  controlPath: join(root, 'p120-control'),
  hostKeys: join(root, 'p120-known-machines'),
  userHostKeys: join(root, 'p120-person-known-hosts')
};
writeFileSync(machineInput.userHostKeys, '', 'utf8');

// Tortie's own record file, seeded with the scratch machine's identity. In the
// product that line is written by the ONE visible connection test, where a
// person read the question and answered it. Nothing here writes to the
// person's own record file, which is why the second path above is an empty
// scratch file.
const hostKeyLine = readFileSync(`${yard.hostKey}.pub`, 'utf8')
  .trim()
  .split(' ')
  .slice(0, 2)
  .join(' ');
writeFileSync(
  machineInput.hostKeys,
  `[${TARGET}]:${String(PORT)} ${hostKeyLine}\n`,
  'utf8'
);

{
  const driven = drive({
    machine: machineInput,
    showCwd: work,
    ops: [{ name: 'remote', kind: 'remote', cwd: work, ghBin: remoteGh }]
  });
  const row = driven?.answers?.[0];
  const answer = row?.ok === true ? row.answer : null;
  if (answer === null) {
    fail(`the remote read did not answer. ${String(row?.why ?? '')}`);
  } else {
    const calls = ghLog(remoteLog);
    const first = calls[0]?.argv ?? '';
    const second = calls[1]?.argv ?? '';
    const orderRight =
      calls.length === 2 &&
      first.includes('--branch') &&
      !first.includes('--commit') &&
      second.includes('--commit') &&
      !second.includes('--branch');
    const repoExplicit = calls.every((call) =>
      call.argv.includes('--repo owner/repo')
    );
    const cwdRight = calls.every((call) => call.cwd === homedir());
    const composed = String(driven?.composed ?? '');
    const hits = CREDENTIAL_WORDS.filter((word) => composed.includes(word));
    const ids = (answer.runs ?? []).map((run) => run.id);
    const tagThere = ids.includes(7100);
    const overlapOnce = ids.filter((id) => id === 7001).length === 1;
    say(`the bytes this read composed for the far side, in full:\n${composed}`);
    step(
      4,
      'the remote row',
      `mode ${String(answer.mode)}, ${String(calls.length)} gh invocation(s) ` +
        `recorded, branch first then commit ${orderRight ? 'yes' : 'NO'}, ` +
        `--repo explicit on ${repoExplicit ? 'both' : 'NOT BOTH'}, both ` +
        `standing in ${homedir()} ${cwdRight ? 'yes' : 'NO'}; the merged ` +
        `rows are [${ids.join(', ')}]; ${String(composed.length)} far side ` +
        `bytes searched, ${String(hits.length)} credential hit(s)` +
        (hits.length === 0 ? '' : `: ${hits.join(', ')}`)
    );
    if (answer.mode !== 'ok') {
      fail(`the remote read answered mode ${String(answer.mode)}, not ok.`);
    }
    if (calls.length !== 2) {
      fail(
        `${String(calls.length)} gh invocation(s) were recorded. A read makes ` +
          `exactly two, the branch query and then the commit query.`
      );
    }
    if (!orderRight) {
      fail(
        `the two invocations are not the branch query first and the commit ` +
          `query second. Recorded: "${first}" then "${second}".`
      );
    }
    if (!repoExplicit) {
      fail('a recorded invocation does not carry --repo owner/repo.');
    }
    if (!cwdRight) {
      fail(
        `a gh process stood somewhere other than this Mac's home: ` +
          `${calls.map((call) => call.cwd).join(', ')}.`
      );
    }
    if (composed.length === 0) {
      fail('the door composed nothing, so there were no bytes to search.');
    }
    if (hits.length > 0) {
      fail(
        `the bytes that crossed name ${hits.join(', ')}. They may name none ` +
          `of them: the gh program runs on this Mac and never leaves it.`
      );
    }
    if (!tagThere) {
      fail('the merged remote answer omits the tag run 7100.');
    }
    if (!overlapOnce) {
      fail('run 7001, answered by both queries, does not appear exactly once.');
    }
  }
}

// The end to end read with the REAL gh, through the same remote path. The
// scratch repository is pointed at the row 2 repository and its head is set
// to the tag run's own commit, so the far side reports that sha and the
// commit query asks GitHub about it.
if (!signedIn || realRepo === null) {
  step(
    4,
    'the remote end to end read with the real gh',
    `SKIPPED. ${
      signedIn
        ? 'Row 2 found no tag run to stand the head on.'
        : 'gh is missing or not signed in.'
    } A skipped read is not a pass.`
  );
} else {
  gitIn(work, 'remote', 'set-url', 'origin', `https://github.com/${realRepo}.git`);
  if (realBranch !== 'main') gitIn(work, 'branch', '-q', '-m', realBranch);
  // The tag run's commit, fetched into the scratch repository only. GitHub
  // serves a reachable commit by its sha; a server that refuses that shape
  // still serves the tag ref, whose name is the run's own head branch.
  let fetched = gitIn(
    work,
    'fetch',
    '-q',
    '--depth',
    '1',
    'origin',
    realTagRun.headSha
  );
  if (fetched.code !== 0) {
    fetched = gitIn(
      work,
      'fetch',
      '-q',
      '--depth',
      '1',
      'origin',
      `refs/tags/${realTagRun.headBranch}`
    );
  }
  const reset =
    fetched.code === 0
      ? gitIn(work, 'reset', '-q', '--hard', realTagRun.headSha)
      : fetched;
  if (reset.code !== 0) {
    fail(
      `the scratch repository could not be set to ${realTagRun.headSha}: ` +
        `${reset.both.trim().split('\n').slice(-3).join(' ')}`
    );
  } else {
    const driven = drive({
      machine: machineInput,
      showCwd: work,
      ops: [{ name: 'real-remote', kind: 'remote', cwd: work }]
    });
    const row = driven?.answers?.[0];
    const answer = row?.ok === true ? row.answer : null;
    if (answer === null) {
      fail(`the end to end remote read did not answer. ${String(row?.why ?? '')}`);
    } else {
      const ids = (answer.runs ?? []).map((run) => run.id);
      const tagThere = ids.includes(realTagRun.databaseId);
      step(
        4,
        'the remote end to end read with the real gh',
        `mode ${String(answer.mode)}, health ${String(answer.health?.state)}, ` +
          `branch ${String(answer.branch)} and commit ` +
          `${String(answer.headSha).slice(0, 12)} from the loopback machine, ` +
          `${String(ids.length)} run(s) from github.com, and run ` +
          `${String(realTagRun.databaseId)} is ` +
          `${tagThere ? 'AMONG THEM' : 'MISSING'}.`
      );
      if (
        answer.mode !== 'ok' ||
        answer.health?.state !== 'ready' ||
        answer.headSha !== realTagRun.headSha
      ) {
        fail(
          `the end to end read answered mode ${String(answer.mode)}, health ` +
            `${String(answer.health?.state)} and commit ` +
            `${String(answer.headSha)}. It answers ok, ready and ` +
            `${realTagRun.headSha}.`
        );
      }
      if (!tagThere) {
        fail(
          `the tag run ${String(realTagRun.databaseId)} did not come back ` +
            `through the remote path, and its commit is the far side's head.`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Row 5. The operator's own server, counted and never touched
// ---------------------------------------------------------------------------

stopEverything();

const sessionsAfter = operatorSessions();
step(
  5,
  'the operator’s sessions on -L gmux, after',
  `${sessionsBefore} before, ${sessionsAfter} after`
);
if (sessionsBefore !== sessionsAfter) {
  fail(
    `the operator's session count moved from ${sessionsBefore} to ` +
      `${sessionsAfter}. This probe reads that server and never writes to it.`
  );
}

say(`pids recorded: ${recordedPids.join(', ') || 'none'}`);
say(
  'WHAT THIS DID NOT PROVE. The far side was this Mac, so no Linux machine ' +
    'was measured. Row 2 stood a found commit in for the branch tip, so the ' +
    'tip reading in service.ts is held by its unit tests rather than this ' +
    'probe. A tag cut on a commit that is not the branch tip is out of the ' +
    'phase and was not probed.'
);
if (failures.length > 0) {
  say(`FAILED with ${String(failures.length)} problem(s).`);
  process.exit(1);
}
say('PASS');
process.exit(0);
