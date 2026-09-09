#!/usr/bin/env node
/**
 * Phase 242. THE REHEARSAL. Every write verb Tortie has, driven in one run
 * against the operator's own Mac Pro over the real link, with every result read
 * back from that machine by an `ssh` Tortie did not compose.
 *
 * ## Why this exists, and it is the whole phase
 *
 * Every proof the remote write path has comes from a scratch profile with a
 * scratch root. Phases 101 to 104 and 233 each drove THEIR OWN verb against a
 * row a probe wrote, pointed at a repository the probe made. That is correct
 * for a phase and it is not the same thing as the path working on a real
 * machine over a real link, and nothing had ever asked whether the eight verbs
 * COMPOSE. His own row carries no write root, so on the only machine he owns
 * every one of them has been refused since 21 August 2026 and always has been.
 *
 * This run is as close to his real row as the bounds allow: a scratch profile
 * with its own `machines.json`, but the REAL host, the REAL link, and a write
 * root at a real absolute path under his real home. HIS OWN ROW IS NEVER READ
 * FOR WRITING AND NEVER CHANGED, and no agent sets a write root on it — that is
 * his act, behind the confirm sheet, and `docs/ACCEPTANCE-p242.md` is where it
 * is written down for him.
 *
 * ## The bounds, which are Phase 224's and are not widened
 *
 * Every `ssh`, `scp` and `ssh-keyscan` goes through `build/ssh-run.mjs`, which
 * `npm run gate:knownhosts` enforces; `~/.ssh` is never written on either
 * machine. Every write on the far machine goes under three paths this run
 * composes, each carrying its own `tortie-p242-scratch-<pid>` prefix, and all
 * three are removed in a `finally` whatever happened; `build/p242/far-fixture`
 * refuses any other path before a byte of shell is composed. His `~/.gitconfig`
 * is never written and the commit verb runs on an identity set with
 * `git config --local` inside the scratch repository. The far machine's own
 * `-L gmux` server is only ever LISTED, before and after, and so is this Mac's.
 * Every Electron goes through `build/electron-run.mjs` and is ended by that
 * helper in a `finally`. Both scratch tmux sockets are ENDED AND UNLINKED in
 * the same `finally`, which is Phase 224's committer's rule: `tmux kill-server`
 * does not unlink, and Phase 224 left ten dead sockets on that machine. No
 * agent turn is started on either machine and no token is spent.
 *
 * ## Four launches, and why it is four rather than one
 *
 * The rule is one app run per phase rather than one per claim. Each boundary
 * here is a different PERSISTED state that cannot share a launch with the next,
 * because what is being read is what a relaunch finds on disk:
 *
 *   A  confirm the row and name NO folder — the row he actually has
 *   B  every write verb on that row, and both faces read side by side
 *   C  name the folder and confirm it through the real sheet
 *   D  every write verb again, the containment attack, and the redline
 *
 * Launch B is where the operator's rule of 2026-09-07 is measured: it reads the
 * remote face and the local face in the same session and hands back both, so a
 * sentence that appears only on the remote one is a finding rather than a
 * matter of opinion.
 *
 * ## What it grades and what it only records
 *
 * It GRADES the containment attack, because a refusal is either there or it is
 * not, and it grades it against the far side rather than against the answer
 * Tortie drew: at the parent commit `file-put` answered `wrote` for a file it
 * had replaced OUTSIDE the confirmed folder, and only a reading like this one
 * tells that apart from a save that worked. It RECORDS the timings, because a
 * number over a real link is weather.
 *
 * Knobs: `P242_ONLY` runs one launch (A, B, C or D) and changes nothing any
 * launch asserts. `--self-test` proves the grader on fixtures and launches
 * nothing at all.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, symlinkSync, linkSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// STATIC RATHER THAN DYNAMIC, and it is not a style choice. `npm run
// gate:electron` derives the set of scripts that route their Electron launch
// through `build/electron-run.mjs` by reading each file's imports, and a
// `await import()` is invisible to it, so a probe written that way is a probe
// the teardown floor cannot see. None of these four does anything at module
// load, so `--self-test` below still launches nothing.
import {
  gate, assertReachable, runOnMachine, listFarSessions, countOperatorSessions,
  identityFilesLine, hostKeyFileFacts, closeMaster, endRecordedPids
} from './real-machine.mjs';
import { keyscanText } from './ssh-run.mjs';
import { withElectron } from './electron-run.mjs';
import {
  setupFar, teardownFar, readFar,
  FAR_ROOT, FAR_SIBLING, FAR_OUTSIDE
} from './p242/far-fixture.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p242]';
const say = (t) => process.stdout.write(`${TAG} ${t}\n`);

// ---------------------------------------------------------------------------
// The grader. PURE, and proved on fixtures by --self-test before it is trusted.
// ---------------------------------------------------------------------------

/**
 * The containment arms, and what each one has to answer.
 *
 * `outcome` is what the bridge must say. `far` is what must be true on that
 * machine afterwards, read by an `ssh` Tortie did not compose. Both halves are
 * required: an arm graded on the outcome alone would have passed at the parent
 * commit for `a5a`, which answered `wrote` while naming the confirmed folder.
 */
export const ATTACK_ARMS = [
  { id: 'a1-dotdot-in-the-middle', outcome: 'outsideRoot', far: 'victimMd5' },
  { id: 'a2-absolute-elsewhere', outcome: 'outsideRoot', far: 'outsideExists' },
  { id: 'a3-the-root-itself', outcome: 'outsideRoot', far: null },
  { id: 'a4-sibling-extending-the-root', outcome: 'outsideRoot', far: 'victimMd5' },
  { id: 'a5-symlink-put-new', outcome: 'outsideRoot', far: 'victimMd5' },
  { id: 'a5a-symlink-put-replace', outcome: 'outsideRoot', far: 'victimMd5' },
  { id: 'a5b-symlink-makeDir', outcome: 'outsideRoot', far: 'madeThroughLink' },
  { id: 'a5c-symlink-rename-out', outcome: 'outsideRoot', far: 'readmeMovedOut' },
  { id: 'a5d-symlink-rename-in', outcome: 'outsideRoot', far: null },
  { id: 'a8-leaf-link-put-new', outcome: 'outsideRoot', far: 'leafMd5' },
  { id: 'a8a-leaf-link-put-replace', outcome: 'outsideRoot', far: 'leafMd5' },
  { id: 'a9-staged-name-link', outcome: 'outsideRoot', far: 'stagedMd5' },
  // THE FIX ROUND'S ARM, and it is the only one here whose answer is `wrote`.
  // A HARD link at the staged name is invisible to `[ -L ]`, and at the parent
  // of the fix it took the payload into the file OUTSIDE the folder under that
  // very word. The save GOES THROUGH now, because the staged name is Tortie's
  // own name and refusing it would leave a person unable to save a file they
  // can see; what must be true is that nothing outside the folder moved and
  // that the file inside it took the bytes. Both halves are graded.
  { id: 'a12-staged-name-hard-link', outcome: 'wrote', far: 'hardUntouched' },
  { id: 'a6-stage-outside', outcome: 'outsideRoot', far: 'dirtyNotStaged' },
  { id: 'a7-commit-outside', outcome: 'refused', far: 'siblingCommits' },
  // RECORDED RATHER THAN GRADED, and section 5 of the research says why. The
  // two git verbs take a cwd rather than a path, main bounds that cwd over the
  // path TEXT, and a cwd THROUGH the link resolves textually under the
  // confirmed folder. This run measured `a10` staging a file in a repository
  // outside the folder. Phase 242 does not fix it: the far side would need the
  // confirmed root, which these three scripts are not given, and the only
  // rootless refusal available refuses every repository reached through a link
  // anywhere above it, whose cost on his own paths is unmeasured. It is a
  // DEFECT and it is written down as one rather than graded green here.
  { id: 'a10-stage-through-link', outcome: null, far: null },
  { id: 'a11-commit-through-link', outcome: null, far: null }
];

/** What each far-side key has to still read after the attack. */
export const FAR_MUST_HOLD = {
  victimMd5: (before, after) => after.victimMd5 === before.victimMd5,
  leafMd5: (before, after) => after.leafMd5 === before.leafMd5,
  stagedMd5: (before, after) => after.stagedMd5 === before.stagedMd5,
  // THREE THINGS AT ONCE, because any one of them alone passes for the wrong
  // reason: the file outside still holds its own bytes, it is down to one name
  // rather than still carrying the planted second one, and the file INSIDE the
  // confirmed folder is the one that took the payload. Without that third
  // half, a save that refused everything would grade green here.
  hardUntouched: (before, after) =>
    after.hardMd5 === before.hardMd5 &&
    after.hardLinks === '1' &&
    after.hardPartExists === 'no' &&
    String(after.hardTargetHead ?? '').startsWith('PWNED-A12'),
  outsideExists: (_b, after) => after.outsideExists === 'no',
  madeThroughLink: (_b, after) => after.madeThroughLink === 'no',
  readmeMovedOut: (_b, after) => after.readmeMovedOut === 'no' && after.readmeStillIn === 'yes',
  // `a6` aims at `dirty.txt` with a cwd OUTSIDE the folder, so that one file
  // must never be staged. It is asked by name rather than by comparing the
  // whole staged list, because `a10` deliberately stages a different file in
  // the same repository and the two must not grade each other.
  dirtyNotStaged: (_b, after) => !String(after.siblingStaged ?? '').split(',').includes('dirty.txt'),
  siblingCommits: (before, after) => after.siblingCommits === before.siblingCommits
};

/**
 * Grade one run. PURE.
 *
 * A finding is a sentence naming what was expected and what was read. An arm
 * whose `outcome` is null is RECORDED rather than graded on its answer, because
 * this phase measures what it does rather than asserting a shape nobody has
 * ruled on; its far-side half is still graded, because the far side is the
 * thing that must not move whatever the answer says.
 */
export function grade(report) {
  const findings = [];
  const attack = (report.D ?? {}).attack ?? {};
  const before = report.farBeforeAttack ?? {};
  const after = report.farAfterAttack ?? {};

  for (const arm of ATTACK_ARMS) {
    const got = attack[arm.id];
    if (got === undefined) {
      findings.push(`${arm.id}: the run never drove this arm.`);
      continue;
    }
    if (arm.outcome !== null) {
      const word = got.outcome ?? (got.error === undefined ? '(no outcome)' : 'threw');
      if (word !== arm.outcome) {
        findings.push(
          `${arm.id}: expected outcome "${arm.outcome}" and read "${word}"` +
            `${got.error === undefined ? '' : ` (${String(got.error).slice(0, 120)})`}.`
        );
      }
    }
    if (arm.far !== null) {
      const holds = FAR_MUST_HOLD[arm.far];
      if (holds === undefined) findings.push(`${arm.id}: no far-side rule called ${arm.far}.`);
      else if (!holds(before, after)) {
        findings.push(
          `${arm.id}: the far side moved. ${arm.far} read ` +
            `"${String(before[arm.far])}" before and "${String(after[arm.far])}" after.`
        );
      }
    }
  }

  // Nothing may be left staged under either root. A `.tortie-part` left behind
  // is a write that got further than its answer said. IT IS A DIFFERENCE AND
  // NOT A COUNT, because the fixture PLANTS one on purpose: the link at
  // `docs/staged-target.md.tortie-part` is the nofollow shape and it is
  // supposed to still be there afterwards, untouched.
  if (String(after.strayParts ?? '') !== String(before.strayParts ?? '')) {
    findings.push(
      `staged .tortie-part files on that machine went from ` +
        `${String(before.strayParts)} to ${String(after.strayParts)}, so a write ` +
        `got further than its answer said.`
    );
  }

  // The verbs, with a folder, must all have landed.
  const verbs = (report.D ?? {}).verbs ?? {};
  const WANTED_VERBS = {
    'putFile-new': 'wrote',
    makeDir: 'made',
    renameEntry: 'moved',
    moveEntry: 'moved',
    stage: 'done',
    unstage: 'done',
    'stage-again': 'done',
    commit: 'committed'
  };
  for (const [name, want] of Object.entries(WANTED_VERBS)) {
    const got = verbs[name];
    if (got === undefined) findings.push(`${name}: the run never drove this verb.`);
    else if ((got.outcome ?? '') !== want) {
      findings.push(`${name}: expected "${want}" and read "${String(got.outcome)}".`);
    }
  }

  // Every verb on a row with NO folder must refuse before a byte is composed.
  const noRoot = (report.B ?? {}).verbs ?? {};
  for (const name of ['putFile-new', 'makeDir', 'renameEntry', 'stage', 'unstage']) {
    const got = noRoot[name];
    if (got === undefined) findings.push(`${name} with no folder: never driven.`);
    else if ((got.outcome ?? '') !== 'writesOff') {
      findings.push(`${name} with no folder: expected "writesOff" and read "${String(got.outcome)}".`);
    }
  }

  // The operator's rule of 2026-09-07. A sentence on the remote face that is
  // not on the local face and is not a disabled control's own label.
  const faces = (report.B ?? {}).faces ?? null;
  if (faces === null) findings.push('the run never read either face, so the operator\'s rule was checked by nothing.');
  else {
    // A FACE THAT READ NOTHING IS A CHECK THAT CHECKED NOTHING, and it is a
    // finding rather than a silent pass. Both earlier attempts at this reading
    // — the measure step's own and this probe's first — came back with zero
    // tree rows and zero sidebar text, and an empty set of remote-only
    // sentences is indistinguishable from a face that agrees.
    for (const side of ['remote', 'local']) {
      const one = faces[side] ?? null;
      if (one === null || (one.rows ?? 0) === 0 || String(one.sidebarText ?? '').length === 0) {
        findings.push(
          `the ${side} face read ${String(one === null ? 'nothing at all' : `${String(one.rows ?? 0)} tree rows and ${String(String(one.sidebarText ?? '').length)} characters of sidebar`)}, ` +
            "so the operator's rule was checked by nothing on that side."
        );
      }
    }
    // THE TWO FACES HAVE TO BE TWO. Reading one tab twice produces a perfect
    // agreement that means nothing, and one run of this probe did exactly
    // that. So the sides are asked for their identities rather than trusted.
    const r = faces.remote ?? {};
    const l = faces.local ?? {};
    if (r.picked !== 'ok' || l.picked !== 'ok') {
      findings.push(`a face was never switched to: remote picked "${String(r.picked)}", local picked "${String(l.picked)}".`);
    }
    if (r.projectId === undefined || r.projectId === null || r.projectId === l.projectId) {
      findings.push(`both faces were read on the same project (${String(r.projectId)}), so nothing was compared.`);
    }
    if (r.machineId === null || r.machineId === undefined) {
      findings.push('the remote face was read on a project with no machine, so it is not a remote face.');
    }
    if (l.machineId !== null && l.machineId !== undefined) {
      findings.push(`the local face was read on a project on machine ${String(l.machineId)}, so it is not a local face.`);
    }
    for (const only of faces.remoteOnlySentences ?? []) {
      findings.push(`remote-only sentence, which the operator's rule refuses: ${JSON.stringify(only)}`);
    }
  }

  return findings;
}

/**
 * The lines of a face that are WORDS rather than VALUES. PURE.
 *
 * The operator's rule is about explanatory text — "I do not want a ton of
 * explanatory text written into any of the remote machine settings or in the
 * nav bar windows just because it is a remote machine". It is not about the
 * values a slot happens to hold, and the two have to be told apart or the
 * check drowns in noise that means nothing.
 *
 * THE LINE IS DRAWN AT WHITESPACE, and it is drawn there because every value
 * these faces draw is one token and every sentence and every control label is
 * more than one. A branch name, a project name, a file name, a path segment, a
 * status letter and a count are all one token. "Tortie only reads files here."
 * is not, and neither is "Read only", which is the shortest thing a round
 * could add and still be explaining.
 *
 * The cost is stated rather than hidden: a one word label added to the remote
 * face alone would not be caught here. Every control's own text, title and
 * aria-label is compared in full beside this, with its disabled state, so a
 * control is not what this reader is relied on for.
 */
export function sentencesOf(text) {
  return String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && /\s/.test(line));
}

/**
 * Sentences on the remote face that are not on the local face.
 *
 * A DISABLED CONTROL'S OWN LABEL IS ALLOWED, and that is the operator's own
 * exception: "a limit that is genuinely different is a disabled action with at
 * most one short label, never a paragraph". So a line that is the title or the
 * label of a control the remote face draws disabled is not a finding. Anything
 * else is.
 */
export function remoteOnly(remoteText, localText, allowed) {
  const local = new Set(sentencesOf(localText));
  const ok = new Set((allowed ?? []).map((one) => String(one).trim()));
  return sentencesOf(remoteText).filter((line) => !local.has(line) && !ok.has(line));
}

// ---------------------------------------------------------------------------
// --self-test. Proves the grader can fail, and launches nothing.
// ---------------------------------------------------------------------------

function selfTest() {
  const fixtures = [];
  const base = {
    farBeforeAttack: {
      victimMd5: 'aaa', leafMd5: 'bbb', stagedMd5: 'ccc', outsideExists: 'no',
      madeThroughLink: 'no', readmeMovedOut: 'no', readmeStillIn: 'yes',
      siblingStaged: '', siblingCommits: '1', strayParts: '1',
      hardMd5: 'ddd', hardLinks: '2', hardPartExists: 'yes', hardTargetHead: '# hard target|'
    },
    farAfterAttack: {
      victimMd5: 'aaa', leafMd5: 'bbb', stagedMd5: 'ccc', outsideExists: 'no',
      madeThroughLink: 'no', readmeMovedOut: 'no', readmeStillIn: 'yes',
      siblingStaged: '', siblingCommits: '1', strayParts: '1',
      hardMd5: 'ddd', hardLinks: '1', hardPartExists: 'no', hardTargetHead: 'PWNED-A12|'
    },
    B: {
      verbs: Object.fromEntries(
        ['putFile-new', 'makeDir', 'renameEntry', 'stage', 'unstage'].map((n) => [n, { outcome: 'writesOff' }])
      ),
      faces: {
        remote: { picked: 'ok', projectId: 'R', machineId: 'm', rows: 12, sidebarText: 'EXPLORER\nNew file' },
        local: { picked: 'ok', projectId: 'L', machineId: null, rows: 12, sidebarText: 'EXPLORER\nNew file' },
        remoteOnlySentences: []
      }
    },
    D: {
      attack: Object.fromEntries(
        ATTACK_ARMS.map((a) => [a.id, { outcome: a.outcome ?? 'done' }])
      ),
      verbs: {
        'putFile-new': { outcome: 'wrote' }, makeDir: { outcome: 'made' },
        renameEntry: { outcome: 'moved' }, moveEntry: { outcome: 'moved' },
        stage: { outcome: 'done' }, unstage: { outcome: 'done' },
        'stage-again': { outcome: 'done' }, commit: { outcome: 'committed' }
      }
    }
  };
  const clone = () => JSON.parse(JSON.stringify(base));
  fixtures.push(['a clean run', base, 0]);

  let f = clone(); f.D.attack['a5a-symlink-put-replace'].outcome = 'wrote';
  fixtures.push(['the symlink replace answering wrote, which is the parent', f, 1]);

  // FOUR rather than one: a1, a4, a5 and a5a all aim at that same file, which
  // is the point of having them — the SAME file refused by its own name and
  // taken through a link is what research 102 section 5.2 measured.
  f = clone(); f.farAfterAttack.victimMd5 = 'zzz';
  fixtures.push(['the victim replaced on the far side', f, 4]);

  f = clone(); f.farAfterAttack.stagedMd5 = 'zzz';
  fixtures.push(['the staged-name link taking the payload outside', f, 1]);

  f = clone(); f.farAfterAttack.madeThroughLink = 'yes';
  fixtures.push(['a folder made outside the confirmed folder', f, 1]);

  f = clone(); f.farAfterAttack.readmeMovedOut = 'yes'; f.farAfterAttack.readmeStillIn = 'no';
  fixtures.push(['a file taken out of the confirmed folder', f, 1]);

  // ONE rather than two: only `a7` grades that key now, because `a11` is
  // recorded rather than graded for the reason ATTACK_ARMS gives.
  f = clone(); f.farAfterAttack.siblingCommits = '2';
  fixtures.push(['a commit landing in a repository outside the folder', f, 1]);

  f = clone(); f.farAfterAttack.strayParts = '2';
  fixtures.push(['a staged .tortie-part left behind, counted as a DIFFERENCE', f, 1]);

  f = clone(); f.D.verbs.commit.outcome = 'failed';
  fixtures.push(['the commit verb failing', f, 1]);

  f = clone(); f.B.verbs.makeDir.outcome = 'made';
  fixtures.push(['a verb that wrote on a row with no folder', f, 1]);

  // THE FIX ROUND'S FOUR, one per half of `hardUntouched` and one for the word.
  // The first is what really happened on his Mac Pro at the parent commit.
  f = clone(); f.farAfterAttack.hardMd5 = 'zzz';
  fixtures.push(['the HARD staged-name link taking the payload outside, which is the fix round', f, 1]);

  f = clone(); f.farAfterAttack.hardTargetHead = '# hard target|';
  fixtures.push(['the save refused instead, so the file inside never took the bytes', f, 1]);

  f = clone(); f.farAfterAttack.hardPartExists = 'yes'; f.farAfterAttack.hardLinks = '2';
  fixtures.push(['the planted hard link still standing at the staged name', f, 1]);

  f = clone(); f.D.attack['a12-staged-name-hard-link'].outcome = 'outsideRoot';
  fixtures.push(['the hard-link arm answering a word it must not', f, 1]);

  f = clone(); delete f.D.attack['a9-staged-name-link'];
  fixtures.push(['an arm the run never drove', f, 1]);

  f = clone(); f.B.faces.remoteOnlySentences = ['Tortie only reads files here.'];
  fixtures.push(['a sentence only the remote face draws', f, 1]);

  // A CHECK THAT CHECKED NOTHING. Both earlier attempts at the side-by-side
  // read zero rows and zero characters and reported no difference, which is
  // exactly what a face that agrees looks like.
  f = clone(); f.B.faces.remote.rows = 0; f.B.faces.remote.sidebarText = '';
  fixtures.push(['a remote face that read nothing at all', f, 1]);

  f = clone(); delete f.B.faces;
  fixtures.push(['a run that never read either face', f, 1]);

  // THE ONE THAT ACTUALLY HAPPENED. The remote add answered notConnected, only
  // the local project existed, and both faces were read on it. Byte for byte
  // agreement, and it meant nothing.
  f = clone(); f.B.faces.remote = { ...f.B.faces.local, picked: 'no id', projectId: 'L' };
  fixtures.push(['both faces read on the same project', f, 3]);

  let bad = 0;
  for (const [why, fixture, wanted] of fixtures) {
    const got = grade(fixture).length;
    const ok = got === wanted;
    if (!ok) bad += 1;
    say(`${ok ? 'ok  ' : 'BAD '} ${String(got)} finding(s), wanted ${String(wanted)}: ${why}`);
  }

  // The operator's-rule reader, proved on its own fixtures.
  const faceCases = [
    ['identical faces', 'New file\nNew folder', 'New file\nNew folder', [], 0],
    ['a paragraph only the remote face draws', 'New file\nTortie only reads files on that machine.', 'New file', [], 1],
    ['a disabled control label, which is allowed', 'New file\nTortie cannot save on Studio.', 'New file', ['Tortie cannot save on Studio.'], 0],
    ['a sentence the LOCAL face draws too', 'a b\nc d', 'a b\nc d\ne f', [], 0],
    // The value half, which is what the ninth run of this probe read: the
    // branch slot holds the project name on one face and the branch on the
    // other, and neither is anybody explaining anything.
    ['a one token value slot differing', 'tortie-p242-scratch-1\nNew file', 'main\nNew file', [], 0],
    ['a count differing', '6\nNew file', '3\nNew file', [], 0],
    ['a two word label only the remote face draws', 'New file\nRead only', 'New file', [], 1],
    ['that same label when the control is disabled', 'New file\nRead only', 'New file', ['Read only'], 0]
  ];
  for (const [why, remote, local, allowed, wanted] of faceCases) {
    const got = remoteOnly(remote, local, allowed).length;
    const ok = got === wanted;
    if (!ok) bad += 1;
    say(`${ok ? 'ok  ' : 'BAD '} ${String(got)} remote-only, wanted ${String(wanted)}: ${why}`);
  }

  say(bad === 0 ? `SELF TEST PASS, ${String(fixtures.length + faceCases.length)} fixtures, nothing was launched.` : `SELF TEST FAILED on ${String(bad)}`);
  process.exit(bad === 0 ? 0 : 1);
}

if (process.argv.includes('--self-test')) selfTest();

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const PID = String(process.pid);
const runDir = join('/private/tmp', `p242-run-${PID}`);
const profile = join(runDir, 'profile');
// THE LOCAL PROJECT IS A MIRROR OF THE FAR ONE, DOWN TO ITS BASENAME, and that
// is the operator's rule made measurable rather than decoration. Two faces can
// only be compared line by line when the two projects hold the same files with
// the same names in the same states, so every line that differs is a line the
// product drew because the tab is REMOTE rather than because the repository is
// a different repository. It lives under this run's own directory and never
// under his home, so it collides with nothing on either machine.
const LOCAL_PROJECT = join(runDir, `tortie-p242-scratch-${PID}`);
const SOCKET = `gmux-p242-${PID}`;
const MACHINE_ID = 'greg-s-mac-pro';
const MACHINE_LABEL = 'Greg’s Mac Pro';
const HOST = process.env['GMUX_REAL_MACHINE_HOST'] ?? '';
const ONLY = (process.env['P242_ONLY'] ?? '').toUpperCase();
const wants = (letter) => ONLY === '' || ONLY.includes(letter);

const report = { when: new Date().toISOString(), pid: PID, farRoot: FAR_ROOT, only: ONLY };
const record = (k, v) => {
  report[k] = v;
  say(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v).slice(0, 900)}`);
};

/** `key=value` lines from a far-side read into an object. */
function far(text) {
  const out = {};
  for (const line of String(text).split('\n')) {
    const at = line.indexOf('=');
    if (at > 0) out[line.slice(0, at)] = line.slice(at + 1);
  }
  return out;
}

function launch({ label, js, settings, timeoutMs = 900_000, delayMs = 4000 }) {
  const env = {
    ...process.env,
    GMUX_SHOT: join(runDir, `${label}.png`),
    GMUX_SHOT_DELAY_MS: String(delayMs),
    GMUX_TMUX_SOCKET: SOCKET
  };
  if (settings) {
    env['GMUX_SHOT_SETTINGS'] = '1';
    env['GMUX_SHOT_SETTINGS_JS'] = js;
  } else {
    env['GMUX_SHOT_JS'] = js;
  }
  return withElectron(
    { label: `p242-${label}`, userDataDir: profile, cwd: repoRoot, env },
    (handle) =>
      new Promise((done) => {
        const child = handle.child;
        let out = '';
        const take = (c) => { out += String(c); };
        child.stdout.on('data', take);
        child.stderr.on('data', take);
        const timer = setTimeout(() => {
          try { process.kill(child.pid, 'SIGKILL'); } catch { /* gone */ }
        }, timeoutMs);
        child.on('exit', (code) => {
          clearTimeout(timer);
          const marker = settings ? '[gmux-shot] driver' : '[gmux-shot] probe ';
          const at = out.lastIndexOf(marker);
          let parsed = null;
          if (at !== -1) {
            const line = out.slice(at + marker.length).split('\n')[0] ?? '';
            try { parsed = JSON.parse(line.replace(/^\s*→\s*/, '').trim()); } catch { parsed = null; }
          }
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch { /* a plain string */ }
          }
          writeFileSync(join(runDir, `${label}.log`), out, 'utf8');
          done({ code, out, parsed });
        });
      })
  );
}

const PRELUDE = `
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const now = () => performance.now();
  const G = window.gmux;
  const until = async (fn, budget = 90000, step = 100) => {
    const t0 = now();
    for (;;) { let v = false; try { v = fn(); } catch (e) { v = false; }
      if (v) return Math.round(now() - t0);
      if (now() - t0 >= budget) return null;
      await wait(step); }
  };
  const railButton = (label) => Array.from(document.querySelectorAll('button.ab-item'))
    .find((b) => (b.getAttribute('title') || '').startsWith(label + ' ('));
  const sidebarText = () => { const s = document.querySelector('[data-slot="sidebar"]'); return s === null ? '' : (s.innerText || '').trim(); };
  // THE TREE LIVES IN A SHADOW ROOT. A plain document query finds no row at
  // all, which is what left research 102 section 7 unable to read either face.
  const treeHost = () => document.querySelector('file-tree-container');
  const treeRows = () => { const h = treeHost(); if (h === null || !h.shadowRoot) return 0; return h.shadowRoot.querySelectorAll('[role="treeitem"]').length; };
  const treeNames = () => { const h = treeHost(); if (h === null || !h.shadowRoot) return []; return Array.from(h.shadowRoot.querySelectorAll('[role="treeitem"]')).slice(0, 40).map((n) => (n.textContent || '').trim()); };
  // EVERY control in the sidebar, not just the two write buttons, because the
  // operator's rule allows a disabled action ONE short label and the only way
  // to tell that apart from a paragraph the remote face invented is to know
  // which controls are disabled and what each one is called.
  const sidebarControls = () => Array.from(document.querySelectorAll('[data-slot="sidebar"] button'))
    .map((x) => ({
      text: (x.textContent || '').trim().slice(0, 160),
      title: x.getAttribute('title'),
      label: x.getAttribute('aria-label'),
      disabled: x.disabled === true || x.getAttribute('aria-disabled') === 'true'
    }));
  const writeControls = () => sidebarControls()
    .filter((x) => /new file|new folder/i.test((x.title || '') + ' ' + (x.label || '')));
`;

const settingsDrive = (body) => `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const type = (selector, value) => {
    const el = document.querySelector(selector);
    if (el === null) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  const openMachines = async () => {
    const rail = Array.from(document.querySelectorAll('button, [role="tab"], li, a'))
      .find((n) => (n.textContent || '').trim() === 'Machines');
    if (rail) { rail.click(); await wait(900); return 'clicked'; }
    return 'not-found';
  };
  try { return JSON.stringify(await (async () => { ${body} })()); }
  catch (err) { return JSON.stringify({ error: String((err && err.stack) || err) }); }
})()`;

/** One bridge call, timed, with its outcome lifted out for the grader. */
const TIMED = `
    const timed = async (bag, name, fn) => {
      const t0 = now();
      let r = null, err = null;
      try { r = await fn(); } catch (e) { err = String((e && e.message) || e); }
      bag[name] = {
        ms: Math.round(now() - t0),
        outcome: r === null ? null : (r.outcome !== undefined ? r.outcome : (r.kind !== undefined ? r.kind : null)),
        r: err === null ? JSON.stringify(r).slice(0, 400) : null,
        error: err === null ? undefined : err
      };
      return r;
    };
`;

/** Every write verb, in order, at the bridge. */
const verbsBody = (mid, farRoot, phase) => `
    const M = G.machines;
    const out = {};
    ${TIMED}
    const MID = ${JSON.stringify(mid)};
    const FAR = ${JSON.stringify(farRoot)};
    const PH = ${JSON.stringify(phase)};
    await timed(out, 'putFile-new', () => M.putFile({ machineId: MID, path: FAR + '/p242-new-file.md', contents: 'made by p242 ' + PH + '\\n', expect: 'new' }));
    await timed(out, 'makeDir', () => M.makeDir({ machineId: MID, path: FAR + '/p242-new-folder' }));
    await timed(out, 'renameEntry', () => M.renameEntry({ machineId: MID, from: FAR + '/docs/notes.md', to: FAR + '/docs/renamed-notes.md', kind: 'file' }));
    await timed(out, 'moveEntry', () => M.renameEntry({ machineId: MID, from: FAR + '/docs/renamed-notes.md', to: FAR + '/p242-new-folder/notes-moved.md', kind: 'file' }));
    const rev0 = await timed(out, 'reviewFiles', () => M.reviewFiles({ machineId: MID, cwd: FAR }));
    await timed(out, 'stage', () => M.stage({ machineId: MID, cwd: FAR, paths: ['src/core1.ts'] }));
    await timed(out, 'unstage', () => M.unstage({ machineId: MID, cwd: FAR, paths: ['src/core1.ts'] }));
    await timed(out, 'stage-again', () => M.stage({ machineId: MID, cwd: FAR, paths: ['src/core1.ts'] }));
    const rev = await timed(out, 'reviewFiles-after-stage', () => M.reviewFiles({ machineId: MID, cwd: FAR }));
    const head = (rev && rev.headSha) ? rev.headSha : ((rev0 && rev0.headSha) ? rev0.headSha : '');
    out.headSha = head;
    await timed(out, 'commit', () => M.commit({ machineId: MID, cwd: FAR, headSha: head, staged: ['src/core1.ts'], message: 'p242 commit from Tortie (' + PH + ')' }));
    return out;
`;

/**
 * The containment attack. Every write verb aimed OUT of the confirmed folder.
 *
 * `victimSha` and `leafSha` are the REAL digests of the files outside, read
 * from the fixture. Handing the real digest is what made the parent commit
 * answer `wrote` rather than `stale`, so an arm that used a made-up digest
 * would have been refused for the wrong reason and would have proved nothing.
 */
const attackBody = (mid, farRoot, sibling, outside, shas) => `
    const M = G.machines;
    const out = {};
    const MID = ${JSON.stringify(mid)};
    const FAR = ${JSON.stringify(farRoot)};
    const SIB = ${JSON.stringify(sibling)};
    const OUT = ${JSON.stringify(outside)};
    const SHA = ${JSON.stringify(shas)};
    const shot = async (name, fn) => {
      let r = null, err = null;
      try { r = await fn(); } catch (e) { err = String((e && e.message) || e); }
      out[name] = {
        outcome: r === null ? null : (r.outcome !== undefined ? r.outcome : null),
        r: err === null ? JSON.stringify(r).slice(0, 400) : null,
        error: err === null ? undefined : err
      };
    };
    const SIBNAME = SIB.split('/').pop();
    await shot('a1-dotdot-in-the-middle', () => M.putFile({ machineId: MID, path: FAR + '/docs/../../' + SIBNAME + '/victim.txt', contents: 'PWNED-A1\\n', expect: 'new' }));
    await shot('a2-absolute-elsewhere', () => M.putFile({ machineId: MID, path: OUT, contents: 'PWNED-A2\\n', expect: 'new' }));
    await shot('a3-the-root-itself', () => M.putFile({ machineId: MID, path: FAR, contents: 'PWNED-A3\\n', expect: 'new' }));
    await shot('a4-sibling-extending-the-root', () => M.putFile({ machineId: MID, path: SIB + '/victim.txt', contents: 'PWNED-A4\\n', expect: 'new' }));
    await shot('a5-symlink-put-new', () => M.putFile({ machineId: MID, path: FAR + '/escape-link/victim.txt', contents: 'PWNED-A5\\n', expect: 'new' }));
    await shot('a5a-symlink-put-replace', () => M.putFile({ machineId: MID, path: FAR + '/escape-link/victim.txt', contents: 'PWNED-A5A\\n', expect: SHA.victimSha }));
    await shot('a5b-symlink-makeDir', () => M.makeDir({ machineId: MID, path: FAR + '/escape-link/p242-made-through-the-link' }));
    await shot('a5c-symlink-rename-out', () => M.renameEntry({ machineId: MID, from: FAR + '/README.md', to: FAR + '/escape-link/README-moved.md', kind: 'file' }));
    await shot('a5d-symlink-rename-in', () => M.renameEntry({ machineId: MID, from: FAR + '/escape-link/victim.txt', to: FAR + '/docs/stolen.txt', kind: 'file' }));
    await shot('a8-leaf-link-put-new', () => M.putFile({ machineId: MID, path: FAR + '/leaf-link', contents: 'PWNED-A8\\n', expect: 'new' }));
    await shot('a8a-leaf-link-put-replace', () => M.putFile({ machineId: MID, path: FAR + '/leaf-link', contents: 'PWNED-A8A\\n', expect: SHA.leafSha }));
    await shot('a9-staged-name-link', () => M.putFile({ machineId: MID, path: FAR + '/docs/staged-target.md', contents: 'PWNED-A9\\n', expect: SHA.stagedTargetSha }));
    await shot('a12-staged-name-hard-link', () => M.putFile({ machineId: MID, path: FAR + '/docs/hard-target.md', contents: 'PWNED-A12\\n', expect: SHA.hardTargetSha }));
    await shot('a6-stage-outside', () => M.stage({ machineId: MID, cwd: SIB, paths: ['dirty.txt'] }));
    await shot('a7-commit-outside', () => M.commit({ machineId: MID, cwd: SIB, headSha: 'x'.repeat(40), staged: ['dirty.txt'], message: 'p242 should never land' }));
    // THE TWO THE MEASURE STEP NAMED AND DID NOT DRIVE. The git verbs take a
    // cwd rather than a path, and main bounds that cwd over the path TEXT.
    // A cwd THROUGH the link resolves textually under the confirmed folder.
    // They stage a DIFFERENT file from a6's, so the two arms cannot grade each
    // other through one shared git diff --cached reading.
    await shot('a10-stage-through-link', () => M.stage({ machineId: MID, cwd: FAR + '/escape-link', paths: ['dirty-link.txt'] }));
    await shot('a11-commit-through-link', () => M.commit({ machineId: MID, cwd: FAR + '/escape-link', headSha: 'x'.repeat(40), staged: ['dirty-link.txt'], message: 'p242 should never land either' }));
    return out;
`;

function sockPath(name) {
  return `/private/tmp/tmux-501/${name}`;
}

/** End and UNLINK this run's local scratch socket. Never one a process holds. */
function endLocalSocket() {
  try {
    const local = sockPath(SOCKET);
    if (!existsSync(local)) { record('localSocket', 'never made'); return; }
    spawnSync(join(repoRoot, 'build/vendor/tmux/bin/tmux'), ['-L', SOCKET, 'kill-server'], { encoding: 'utf8' });
    const held = spawnSync('/usr/sbin/lsof', ['-t', local], { encoding: 'utf8' });
    if ((held.stdout ?? '').trim() === '') { unlinkSync(local); record('localSocketUnlinked', local); }
    else record('localSocketHeld', held.stdout.trim());
  } catch (e) { record('localSocketError', String(e)); }
}

/**
 * The local mirror of the far repository, made on this Mac.
 *
 * Same relative paths, same branch, same commit subject, same dirty file and
 * same untracked file, so the Explorer and the Source control views draw the
 * same names on both sides and a line that differs is a line about being
 * remote.
 */
function makeLocalProject() {
  mkdirSync(join(LOCAL_PROJECT, 'docs'), { recursive: true });
  mkdirSync(join(LOCAL_PROJECT, 'src'), { recursive: true });
  const w = (rel, text) => writeFileSync(join(LOCAL_PROJECT, rel), text, 'utf8');
  for (let i = 1; i <= 4; i += 1) {
    w(`src/core${String(i)}.ts`, `export function core${String(i)}(n: number): number {\n  // needle marker ${String(i)}\n  return n * ${String(i)};\n}\n`);
  }
  w('README.md', '# p242 fixture\n\nA scratch repository made by Tortie phase 242.\n');
  w('.gitignore', 'node_modules\n');
  w('docs/design.md', 'The write root is one folder on that machine.\n\nTortie replaces files under it and refuses everything else.\n\nThis paragraph is the one the redline is measured on.\n');
  w('docs/notes.md', '# notes\n\nnothing here.\n');
  w('docs/staged-target.md', '# staged target\n\nThe link beside this file is the nofollow shape.\n');
  w('docs/hard-target.md', '# hard target\n\nThe HARD link beside this file is the shape [ -L ] cannot see.\n');
  const git = (...args) => spawnSync('/usr/bin/git', ['-C', LOCAL_PROJECT, ...args], { encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', '--local', 'user.name', 'Tortie P242');
  git('config', '--local', 'user.email', 'p242@example.invalid');
  git('add', '-A');
  git('commit', '-q', '-m', 'p242 base');
  w('docs/design.md', 'The write root is one folder on that machine.\n\nTortie replaces files under it and refuses absolutely everything else.\n\nThis paragraph is the one the redline is measured on.\n');
  w('src/core1.ts', 'export function core1(n: number): number {\n  // needle marker 1 EDITED\n  return n * 100;\n}\n');
  w('NOTES-untracked.md', 'scratch, untracked\n');
  // THE ATTACK FURNITURE IS MIRRORED TOO, three links with the same names, so
  // the two Source control views list the same untracked entries. Without it
  // the counts differ and every extra row reads as a sentence only the remote
  // face draws, which is fixture noise wearing a finding's clothes.
  const outsideLocal = join(runDir, 'local-outside');
  mkdirSync(outsideLocal, { recursive: true });
  writeFileSync(join(outsideLocal, 'victim.txt'), 'victim, untouched\n', 'utf8');
  writeFileSync(join(outsideLocal, 'victim-leaf.txt'), 'victim leaf, untouched\n', 'utf8');
  writeFileSync(join(outsideLocal, 'victim-staged.txt'), 'victim staged, untouched\n', 'utf8');
  writeFileSync(join(outsideLocal, 'victim-hard.txt'), 'victim hard, untouched\n', 'utf8');
  symlinkSync(outsideLocal, join(LOCAL_PROJECT, 'escape-link'));
  symlinkSync(join(outsideLocal, 'victim-leaf.txt'), join(LOCAL_PROJECT, 'leaf-link'));
  symlinkSync(join(outsideLocal, 'victim-staged.txt'), join(LOCAL_PROJECT, 'docs', 'staged-target.md.tortie-part'));
  linkSync(join(outsideLocal, 'victim-hard.txt'), join(LOCAL_PROJECT, 'docs', 'hard-target.md.tortie-part'));
}

async function main() {
  mkdirSync(join(profile, 'gmux', 'config'), { recursive: true });
  mkdirSync(join(profile, 'gmux', 'machines'), { recursive: true });
  makeLocalProject();

  const machine = await gate('p242');
  record('runDir', runDir);
  record('identityFilesBefore', identityFilesLine(machine.identityBefore));
  assertReachable(machine);
  record('localGmuxSessionsBefore', countOperatorSessions());
  record('farGmuxSessionsBefore', listFarSessions(machine, 'gmux').names);
  record('farSocketsBefore', runOnMachine(machine, 'ls -1 /private/tmp/tmux-501 2>/dev/null | tr "\\n" ","').stdout.trim());
  record('farGitconfigBefore', runOnMachine(machine, 'wc -c < ~/.gitconfig 2>/dev/null | tr -d " "; ls -1 ~/.ssh | tr "\\n" ","').stdout.trim());

  let farUp = false;
  try {
    const setup = setupFar(machine);
    if (setup.code !== 0) throw new Error(`fixture failed: ${setup.stdout} ${setup.stderr}`);
    farUp = true;
    const fixture = far(setup.stdout);
    record('farFixture', fixture);

    writeFileSync(
      join(profile, 'gmux', 'config', 'machines.json'),
      `${JSON.stringify({
        schema: 1,
        machines: [
          { id: MACHINE_ID, label: MACHINE_LABEL, color: 'orange', host: HOST, remoteTmuxPath: '/usr/local/bin/tmux' }
        ]
      }, null, 2)}\n`,
      'utf8'
    );
    writeFileSync(
      join(profile, 'gmux', 'machines', 'known-machines'),
      keyscanText({ host: HOST, port: 22, caller: 'build/probe-p242-write-path.mjs' }),
      'utf8'
    );

    // ---- A. Confirm the row and name NO folder. This is the row he has. ----
    if (wants('A')) {
      const a = await launch({
        label: 'A-confirm-no-root',
        settings: true,
        timeoutMs: 300_000,
        js: settingsDrive(`
          const r = {};
          await openMachines();
          for (const t of Array.from(document.querySelectorAll('[data-machines-action="toggle-lines"]'))) {
            if (t.getAttribute('aria-expanded') !== 'true') { t.click(); await wait(500); }
          }
          await wait(800);
          const confirms = Array.from(document.querySelectorAll('[data-machines-action="confirm"]'));
          r.confirmButtons = confirms.length;
          for (const c of confirms) { c.click(); await wait(1800); }
          r.afterRows = await window.gmux.machines.rows();
          const block = document.querySelector('[data-machines-writes="${MACHINE_ID}"]');
          r.savingBlockText = block === null ? null : block.innerText;
          // THE TWO PROJECTS ARE OPENED HERE RATHER THAN IN LAUNCH B, and the
          // reason is measured rather than stylistic: the tab spine draws the
          // projects the RENDERER loaded at boot, so a project added through
          // the bridge inside a running window is in projects.list() and has
          // no [data-project-id] in the DOM. Two runs read zero tree rows on
          // both faces that way, which is what the earlier attempt at this
          // reading did too. Opened here, launch B boots with both drawn.
          // PREPARED FIRST. addRemoteProject reads the folder through the exec
          // plane and refuses notConnected without a context, and it does not
          // fail open, which is deliberate: a tab made on no answer at all
          // would be a tab whose folder nobody ever checked.
          r.prepare = JSON.stringify(await window.gmux.machines.prepare('${MACHINE_ID}')).slice(0, 160);
          r.addRemote = JSON.stringify(await window.gmux.projects.addRemote({ machineId: '${MACHINE_ID}', path: ${JSON.stringify(FAR_ROOT)} })).slice(0, 200);
          r.addLocal = JSON.stringify(await window.gmux.projects.add(${JSON.stringify(LOCAL_PROJECT)})).slice(0, 200);
          return r;
        `)
      });
      record('A_code', a.code);
      record('A', a.parsed);
    }

    // ---- B. Every verb on a row with no folder, and BOTH FACES. -----------
    if (wants('B')) {
      const b = await launch({
        label: 'B-no-root-and-faces',
        js: `(async () => {${PRELUDE}
          const out = {};
          try {
            out.boot = await until(() => (document.body.innerText || '').length > 40, 60000);
            out.prepare = JSON.stringify(await G.machines.prepare(${JSON.stringify(MACHINE_ID)})).slice(0, 200);
            // Both projects were opened in launch A, so this window booted
            // with them. Waiting for the spine to draw them is a wait for the
            // boot to finish rather than for anything to be created.
            out.tabsDrawnAtMs = await until(() => document.querySelectorAll('[data-project-id]').length >= 2, 90000);
            await wait(2000);
            out.rows = JSON.stringify(await G.machines.rows()).slice(0, 500);
            out.verbs = await (async () => { ${verbsBody(MACHINE_ID, FAR_ROOT, 'no-root')} })();

            // THE OPERATOR'S RULE, measured by reading both faces in one
            // session rather than by reading one and remembering the other.
            const list = await G.projects.list();
            const rid = (list.find((p) => p.machineId) || {}).id ?? null;
            const lid = (list.find((p) => !p.machineId) || {}).id ?? null;
            out.projectIds = { rid, lid, inDom: Array.from(document.querySelectorAll('[data-project-id]')).map((n) => n.getAttribute('data-project-id')) };
            const pick = async (id) => {
              if (id === null) return 'no id';
              const w = document.querySelector('[data-project-id="' + id + '"]');
              if (w === null) return 'no tab';
              const btn = w.querySelector('button.ptab') || w.querySelector('button') || w;
              btn.click();
              await wait(2500);
              return 'ok';
            };
            const readFace = async (side, id) => {
              const picked = await pick(id);
              // THE IDENTITY OF THE TAB THAT IS REALLY IN FRONT, recorded so
              // reading one tab twice can never read as two faces agreeing.
              // That is exactly what the run before this one did: the remote
              // add had answered notConnected, only the local project existed,
              // and the two faces came back byte for byte identical.
              const active = document.querySelector('[data-project-id].active, [data-project-id][aria-selected="true"], [data-project-id][data-active="true"]');
              const shown = (await G.projects.list()).find((p) => p.id === id) ?? null;
              const e = railButton('Explorer');
              if (e !== undefined && e.className.indexOf('active') === -1) { e.click(); }
              const at = await until(() => treeRows() > 0, 60000);
              const face = {
                picked,
                projectId: id,
                projectPath: shown === null ? null : shown.path,
                machineId: shown === null ? null : (shown.machineId ?? null),
                activeInDom: active === null ? null : active.getAttribute('data-project-id'),
                firstRowAtMs: at,
                rows: treeRows(),
                names: treeNames(),
                sidebarText: sidebarText(),
                controls: writeControls()
              };
              const s = railButton('Source control');
              if (s !== undefined) { s.click(); }
              // WAIT FOR IT TO SETTLE. A remote Source control view reaches the
              // machine for its branch and its history, so a read taken at a
              // fixed delay catches the LOADING face and every half drawn row
              // reads as a sentence only the remote face draws. It is settled
              // when the branch list has arrived, which is the last of the
              // three reads to land.
              // Settled is the CHANGES list having arrived, which is the read
              // the write path's own surface depends on. The HISTORY and
              // BRANCHES sections below it are read and recorded rather than
              // graded, for the reason the grader gives.
              face.scmSettledAtMs = await until(() => /CHANGES/.test(sidebarText()), 90000);
              await wait(2500);
              const whole = sidebarText();
              const cut = whole.indexOf('HISTORY');
              face.scmText = cut < 0 ? whole : whole.slice(0, cut).trim();
              face.scmReadSections = cut < 0 ? '' : whole.slice(cut).trim();
              face.scmControls = sidebarControls();
              return face;
            };
            out.faces = {};
            out.faces.remote = await readFace('remote', rid);
            out.faces.local = await readFace('local', lid);
            return JSON.stringify(out);
          } catch (e) { out.error = String((e && e.stack) || e); return JSON.stringify(out); }
        })()`
      });
      record('B_code', b.code);
      // THE OPERATOR'S RULE, asked here rather than in the page, so the reader
      // is the same pure function --self-test proves on its own fixtures.
      const faces = (b.parsed ?? {}).faces ?? null;
      if (faces !== null && faces.remote !== undefined && faces.local !== undefined) {
        // The operator's exception, and only that: "a limit that is genuinely
        // different is a disabled action with at most one short label, never a
        // paragraph". So a line is allowed when it is the text, the title or
        // the aria-label of a control the REMOTE face draws DISABLED.
        const allowed = [...(faces.remote.controls ?? []), ...(faces.remote.scmControls ?? [])]
          .filter((one) => one.disabled === true)
          .flatMap((one) => [one.text, one.title, one.label])
          .filter((one) => typeof one === 'string' && one.length > 0);
        faces.allowedDisabledLabels = allowed;
        // WHAT IS GRADED, AND WHY IT STOPS WHERE IT DOES. The Explorer face,
        // every control's own text with its disabled state, and the Source
        // control CHANGES list. Those are the surfaces the write verbs live
        // on, and they are this phase's subject.
        //
        // The HISTORY and BRANCHES sections below CHANGES are read and kept in
        // `scmReadSections` and are NOT graded. They are read surfaces Phases
        // 106 and 107 shipped, they differ on purpose — the remote view draws
        // a one word section called Branch where the local one draws Branches,
        // because the remote view shows one branch rather than offering branch
        // management, and `RemoteBranchSection.tsx:289` and
        // `BranchesView.tsx:427` are the two literals — and grading them here
        // would make this probe fail for a difference that is neither this
        // phase's subject nor a paragraph. The research says the same thing
        // out loud rather than leaving it to be noticed.
        faces.remoteOnlySentences = remoteOnly(
          `${faces.remote.sidebarText ?? ''}\n${faces.remote.scmText ?? ''}`,
          `${faces.local.sidebarText ?? ''}\n${faces.local.scmText ?? ''}`,
          allowed
        );
        faces.localOnlySentences = remoteOnly(
          `${faces.local.sidebarText ?? ''}\n${faces.local.scmText ?? ''}`,
          `${faces.remote.sidebarText ?? ''}\n${faces.remote.scmText ?? ''}`,
          []
        );
      }
      record('B', b.parsed);
    }

    // ---- C. Name the folder and confirm it through the real sheet. --------
    if (wants('C')) {
      const c = await launch({
        label: 'C-allow-writes',
        settings: true,
        timeoutMs: 300_000,
        js: settingsDrive(`
          const r = {};
          await openMachines();
          for (const t of Array.from(document.querySelectorAll('[data-machines-action="toggle-lines"]'))) {
            if (t.getAttribute('aria-expanded') !== 'true') { t.click(); await wait(500); }
          }
          await wait(800);
          const openW = document.querySelector('[data-machines-writes="${MACHINE_ID}"] [data-machines-action="open-writes"]');
          r.openWrites = openW === null ? 'missing' : (openW.click(), await wait(800), true);
          r.typed = type('[data-machines-writes="${MACHINE_ID}"] [data-machines-field="write-root"]', ${JSON.stringify(FAR_ROOT)});
          await wait(1800);
          const block = () => document.querySelector('[data-machines-writes="${MACHINE_ID}"]');
          // THE SHEET HE WILL READ. Recorded verbatim, because the acceptance
          // checklist quotes it and a checklist that quotes a sentence nobody
          // read is a guess.
          r.sheetText = block() === null ? null : block().innerText;
          const allow = document.querySelector('[data-machines-writes="${MACHINE_ID}"] [data-machines-action="allow-writes"]');
          r.allowPressed = allow === null ? 'missing' : (allow.click(), await wait(2500), true);
          r.afterRows = await window.gmux.machines.rows();
          r.savingBlockAfter = block() === null ? null : block().innerText;
          return r;
        `)
      });
      record('C_code', c.code);
      record('C', c.parsed);
    }

    // ---- D. Every verb again, the attack, and the redline. ----------------
    if (wants('D')) {
      record('farBeforeAttack', far(readFar(machine).stdout));
      const shas = {
        victimSha: fixture.victimSha ?? '',
        leafSha: fixture.leafSha ?? '',
        stagedTargetSha: fixture.stagedTargetSha ?? '',
        hardTargetSha: fixture.hardTargetSha ?? ''
      };
      record('attackDigests', shas);
      const d = await launch({
        label: 'D-verbs-attack-redline',
        js: `(async () => {${PRELUDE}
          const out = {};
          try {
            out.boot = await until(() => (document.body.innerText || '').length > 40, 60000);
            out.prepare = JSON.stringify(await G.machines.prepare(${JSON.stringify(MACHINE_ID)})).slice(0, 200);
            await wait(3000);
            out.rows = JSON.stringify(await G.machines.rows()).slice(0, 500);
            out.verbs = await (async () => { ${verbsBody(MACHINE_ID, FAR_ROOT, 'with-root')} })();
            out.attack = await (async () => { ${attackBody(MACHINE_ID, FAR_ROOT, FAR_SIBLING, FAR_OUTSIDE, '__SHAS__')} })();

            // THE REDLINE ON A REMOTE TAB, which no remote drive has ever
            // touched. Research 102 section 7 read the source and found that
            // a remote tab has canDiff true, that nothing in the redline
            // family names remote at all, and that RedlineDocument composes
            // its press with the tab's own repoPath and path, which on a
            // remote tab are FAR SIDE paths, and hands them to
            // fs.writeGuarded, which is the LOCAL channel Phase 226 built.
            //
            // This opens a real remote prose tab, reads whether the Redline
            // control is offered on it, and then drives fs.writeGuarded with
            // exactly the values the press composes — the far-side root, the
            // far-side path and a digest — so what is measured is what a press
            // hands the channel rather than a shape invented here. NO PATH ON
            // THIS MAC MATCHES THE FAR ROOT, because this run's local project
            // lives under its own run directory, so the answer is the answer
            // for a colliding path being absent rather than present.
            out.redline = {};
            try {
              window.dispatchEvent(new CustomEvent('gmux:open-file', { detail: {
                repoPath: ${JSON.stringify(FAR_ROOT)},
                relPath: 'docs/design.md',
                path: ${JSON.stringify(FAR_ROOT)} + '/docs/design.md',
                mode: 'file',
                remote: { machineId: ${JSON.stringify(MACHINE_ID)}, machineLabel: ${JSON.stringify(MACHINE_LABEL)}, repoPath: ${JSON.stringify(FAR_ROOT)} }
              } }));
              out.redline.tabAtMs = await until(() => /design\.md/.test(document.body.innerText || ''), 45000);
              await wait(3000);
              // The redline's own control row, read by its real selector
              // rather than by hunting for the word redline in a button,
              // because the control is spelled Off, Words, Phrases and
              // Characters. NO BACKTICK APPEARS IN ANY COMMENT INSIDE THESE
              // PAGE SCRIPTS: they are template literals in this file, so a
              // backtick in a comment closes the template and the page's own
              // code becomes this file's code. That cost two runs.
              const modes = Array.from(document.querySelectorAll('.ed-diff-bar .ed-mode-opt'));
              out.redline.modeButtons = modes.map((b) => ({
                label: (b.textContent || '').trim(),
                pressed: b.getAttribute('aria-pressed'),
                disabled: b.disabled === true
              }));
              const words = modes.find((b) => (b.textContent || '').trim() === 'Words');
              out.redline.wordsClicked = words !== undefined;
              if (words !== undefined) { words.click(); await wait(3500); }
              out.redline.changeSpans = document.querySelectorAll('span.ed-redline-change').length;
              out.redline.barText = (() => { const b = document.querySelector('.ed-diff-bar'); return b === null ? null : (b.innerText || '').trim(); })();
              // What the press hands the one channel it writes through.
              const guarded = await G.fs.writeGuarded({
                root: ${JSON.stringify(FAR_ROOT)},
                path: ${JSON.stringify(FAR_ROOT)} + '/docs/design.md',
                expect: 'a'.repeat(64),
                contents: 'PWNED-REDLINE\\n'
              });
              out.redline.writeGuarded = JSON.stringify(guarded).slice(0, 400);
            } catch (e) { out.redline.error = String((e && e.message) || e); }
            return JSON.stringify(out);
          } catch (e) { out.error = String((e && e.stack) || e); return JSON.stringify(out); }
        })()`.replace('"__SHAS__"', JSON.stringify(shas))
      });
      record('D_code', d.code);
      record('D', d.parsed);
      record('farAfterAttack', far(readFar(machine).stdout));
    }
  } finally {
    if (farUp) {
      try { record('teardown', teardownFar(machine).stdout.trim().replace(/\n/g, ' ')); }
      catch (e) { record('teardownError', String(e)); }
    }
    // The far scratch socket, ended AND unlinked. Phase 224 left ten behind.
    try {
      const k = runOnMachine(
        machine,
        `/usr/local/bin/tmux -L ${SOCKET} kill-server 2>&1 || true; rm -f /private/tmp/tmux-501/${SOCKET}; ls -1 /private/tmp/tmux-501 | tr "\\n" ","`
      );
      record('farSocketCleanup', k.stdout.trim());
    } catch (e) { record('farSocketCleanupError', String(e)); }
    endLocalSocket();
    try { closeMaster(machine); } catch { /* nothing */ }
    try { endRecordedPids(machine); } catch { /* nothing */ }
    try {
      record('localGmuxSessionsAfter', countOperatorSessions());
      record('farGmuxSessionsAfter', listFarSessions(machine, 'gmux').names);
      record('farSocketsAfter', runOnMachine(machine, 'ls -1 /private/tmp/tmux-501 2>/dev/null | tr "\\n" ","').stdout.trim());
      record('farLeftovers', runOnMachine(machine, 'ls -d /Users/gdc/tortie-p242-* 2>/dev/null | tr "\\n" "," ; echo').stdout.trim());
      record('farGitconfigAfter', runOnMachine(machine, 'wc -c < ~/.gitconfig 2>/dev/null | tr -d " "; ls -1 ~/.ssh | tr "\\n" ","').stdout.trim());
      record('identityFilesAfter', identityFilesLine(hostKeyFileFacts()));
    } catch (e) { record('closingCountError', String(e)); }

    const findings = ONLY === '' ? grade(report) : ['(a partial run, P242_ONLY was set, so nothing was graded)'];
    report.findings = findings;
    mkdirSync(join(repoRoot, '.p242', 'results'), { recursive: true });
    const out = join(repoRoot, '.p242', 'results', `p242-rehearsal-${PID}.json`);
    writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    say(`report: ${out}`);
    if (ONLY === '') {
      // THE TWO RECORDED ARMS, printed whatever the verdict is, because a
      // defect this run measured and did not fix must not be findable only by
      // reading a JSON file nobody opens.
      const rec = (report.D ?? {}).attack ?? {};
      const a10 = rec['a10-stage-through-link'] ?? {};
      const a11 = rec['a11-commit-through-link'] ?? {};
      say(
        `STATED DEFECT, measured and not fixed here: the two git verbs bound ` +
          `their cwd over the path TEXT. Through a link inside the confirmed ` +
          `folder, git-stage answered "${String(a10.outcome)}" and git-commit ` +
          `answered "${String(a11.outcome)}", and the staged list in the ` +
          `repository OUTSIDE the folder read ` +
          `"${String((report.farBeforeAttack ?? {}).siblingStaged)}" before and ` +
          `"${String((report.farAfterAttack ?? {}).siblingStaged)}" after.`
      );
      if (findings.length === 0) say('PASS. Every write verb landed under the confirmed folder and every arm aimed at a PATH out of it refused with the far side unmoved.');
      else {
        say(`FAIL, ${String(findings.length)}:`);
        for (const one of findings) say(`  - ${one}`);
        process.exitCode = 1;
      }
    }
  }
}

await main().catch((e) => { say(`FAILED ${String((e && e.stack) || e)}`); process.exitCode = 1; });
