#!/usr/bin/env node
/**
 * `npm run probe:p336`. Phase 336's app run (build/p336/SPEC.md §9): saving in
 * a project on another machine the way it is saved on this Mac, with nothing
 * asked, graded at HEAD with the parent's reading printed beside it.
 *
 * ## What it drives, one Electron at a time
 *
 * THE PARENT FIRST (`P336_PARENT_CHECKOUT`, a built checkout of `2867bc39`),
 * on the profile the HEAD run then reuses, so the HEAD run is also the proof
 * that a machine confirmed at the parent stays confirmed and that migration
 * 019 meets a real schema-18 manifest. At the parent it sets a `writeRoot`
 * through the parent's own `machines:writeSheet` and `machines:allowWrites`
 * (first at a folder under a linked ancestor for arm B, then at `<far>/legacy`
 * for arm L), drives every verb, and records what each answered. Between the
 * two launches, with the app down, `/usr/bin/sqlite3` plants three remote
 * project rows into the scratch profile's manifest (arm H5). Then HEAD, the
 * arms in §9's order:
 *
 *   L    the legacy root: confirmed with no press, its hash the parent's, and a
 *        save, a folder, a stage and a commit under it at both builds.
 *   A    a project opened by hand: every verb, the far bytes read back.
 *   A2   a second, unrelated tree, which one writeRoot could never hold.
 *   B    a project under a LINKED ANCESTOR; the parent's legacy root at the
 *        same linked spelling answers the same (no scenario worse).
 *   H1   A's folder swapped for a link: every verb folderChanged, the victim
 *        unmoved; a hand open re-pins and a save writes.
 *   H2   a folder swapped for a new folder at the same path: folderChanged.
 *   H3   projects opened at links into the far home's .ssh, and at .ßh.
 *   H4   reserved names in another case and in Unicode folds: protected.
 *   H5   the planted rows: / and the far home writesOff; an ordinary folder
 *        writes, which is THE RISK HE ACCEPTED (research 138 §9).
 *   H5L  `fs:writeGuarded` with a remote row naming a folder on this Mac.
 *   H6   the machines file's port moved while the app runs: every verb throws
 *        the gate's own sentence; put back, writes resume with no confirm.
 *   H8   a project at the far home writesOff, and so does a link named like a
 *        project (`<far>/dev`) that leads to it; its child and a grandchild
 *        write; and in `~/dev`, a repository directly inside the far home,
 *        every verb is done and the Explorer offers New File and New Folder
 *        (Phase 336.1, the project he reported greyed out on 2026-10-05).
 *   R    the renderer: the editor takes a keystroke, goes dirty and saves; the
 *        Explorer header buttons are enabled; the 150,000-byte file OPENS read
 *        only with its chip; no drawn write sentence names Settings; and the
 *        BUILT renderer names no saving sheet.
 *   RUN  the parent ran every arm it was asked for; his `-L gmux` session
 *        count and his three dotfiles did not move; nothing was left.
 *
 * ## What it refuses, and the bounds that bind it
 *
 *   - It runs only inside build/harness-socket.mjs (`GMUX_TMUX_SOCKET` a
 *     `gmux-p336…` harness socket) and, on the loopback row, inside
 *     build/with-scratch-machine.mjs with the quiet shell AND the scratch home
 *     (`SCRATCH_MACHINE_SCRATCH_HOME=1`, D23, measured: sshd's `SetEnv HOME=`
 *     overrides the account's home, so the far `$HOME` is the yard's own and
 *     never his real one). It refuses, exit 2, when the far home it would use
 *     is not inside the yard.
 *   - Every Electron through build/electron-run.mjs's `withElectron`, ended
 *     in its `finally`. A scratch profile, a scratch HOME, the scratch socket.
 *     A scratch agents.json renames the Gemini, Qwen, Antigravity, Grok and
 *     Droid binaries before every launch and is read back through agents:list
 *     (the `probe:p332` practice). No model turn and no token.
 *   - Every far folder is under `<harness dir>/p336/far` on the loopback row,
 *     or under the real machine's `/tmp/p3201-<pid>/far` with `P336_FAR=real`
 *     (verifiers only, through build/p3201/real-machine.mjs, which ends and
 *     removes everything it made there in its `close()`). On the real row arms
 *     H3, H5 and H8 are NOT run, because their far home is HIS home.
 *   - His `-L gmux` server is read once before and once after, count only,
 *     `list-sessions -F x` WITH ITS EXIT STATUS (`hisCountOf`, his ruled round:
 *     on this Mac for the loopback row, on the machine for the real row). A
 *     count that was refused or failed is null and RUN is then UNREADABLE,
 *     never a "0" graded against a "0". His three dotfiles are read for size
 *     and modified time only.
 *   - It EXITS on its PASS path, as it does on the others: every cdpEval leaves
 *     a timeout armed (180 s for the bridge), which held the process, and the
 *     scratch machine under it, up for three minutes after a PASS.
 *
 * ## The grader is pure and proved before it is trusted
 *
 * `--grader-self-test` grades the recorded fixtures in build/p336/fixtures/
 * (an honest HEAD record and an honest parent record) and, for EVERY clause,
 * the honest reading broken on that clause alone, which must fail on that
 * clause; it starts nothing. THE FIXTURES ARE HAND-WRITTEN to the shape an
 * honest run records, because no builder launches Electron in this phase:
 * `P336_KEEP=1` keeps a real run's records in the report directory, and a
 * verifier may replace the fixtures with them.
 *
 * Knobs: `P336_PARENT_CHECKOUT` (a built parent), `P336_ARMS` (comma list),
 * `P336_KEEP=1` (keep the scratch world and the records), `P336_FAR=real`
 * (verifiers only). Exit 0 when every arm passed, 1 when one failed, 2 when it
 * could not run or an arm could not be READ, which is never a pass.
 *
 *   npm run -s probe:p336
 *   node build/p336/probe-p336.mjs --grader-self-test
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { gradeFixtures } from '../probe-graders.mjs';
import { keyscanText } from '../ssh-run.mjs';
import { quietAgentsHeld, writeQuietAgents } from '../p332/dns-standin.mjs';
import { ATTACK_ARMS } from '../probe-p242-write-path.mjs';
import {
  DOTFILES,
  controlEntries,
  dotfilesMoved,
  localCensus,
  machineRow as realMachineRow,
  openRealMachine,
  quoteArg,
  realMachineFromEnv
} from '../p3201/real-machine.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const FIXTURES = join(dirname(HERE), 'fixtures');
const J = JSON.stringify;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// ===========================================================================
// THE GRADERS. Pure functions of a recorded reading; nothing here starts a
// process. A reading for an arm is the HEAD record's reading with the parent
// record's reading for the same arm beside it as `parent`, and `wantParent`
// saying whether a parent was asked for.
// ===========================================================================

const same = (a, b) => J(a) === J(b);
const all = (obj, word) => obj !== null && typeof obj === 'object' && Object.values(obj).length > 0 && Object.values(obj).every((v) => v === word);
const withParent = (r, test) => (r.wantParent ? r.parent !== null && test(r.parent) : true);

/** The outcomes a refused write may carry: none of them means anything was written. */
export const REFUSED_WORDS = ['writesOff', 'outsideRoot', 'folderChanged', 'protected', 'refused'];

/**
 * What the PARENT answers for a path verb in a project opened by hand. With no
 * writeRoot it is `writesOff`; once one is set it is `outsideRoot`, because the
 * parent answers that for any path outside its one folder (remote-file.ts
 * :321-322, remote-entry.ts :258 and :368, remote-stage.ts :561 at 2867bc39).
 * run() sets B's writeRoot BEFORE it drives A, so `outsideRoot` is the honest
 * parent answer in the default order and `writesOff` the one with B left out.
 * (Probe review, Phase 336: the first grader required `writesOff` and failed the
 * honest parent; build/p336/fixtures/parent-record-b-first.json is that reading.)
 */
export const PARENT_PATH_REFUSALS = ['writesOff', 'outsideRoot'];
const PATH_VERBS = ['put', 'makeDir', 'rename', 'stage', 'unstage'];
const parentRefusedAll = (o) =>
  o !== null && typeof o === 'object' && Object.keys(o).length === 6 && PATH_VERBS.every((v) => PARENT_PATH_REFUSALS.includes(o[v])) && o.commit === 'refused';

/**
 * A far listing (`ls -1A | sort | tr '\n' ','`) that names `name`. A "nothing
 * moved" clause asks this of its BEFORE reading first, because a far read that
 * failed twice reads equal twice and has measured nothing
 * (build/p336/fixtures/head-record-dead-far.json).
 */
const lists = (listing, name) => typeof listing === 'string' && listing.split(/[,|]/).includes(name);
/** POSIX `cksum` output: a checksum and a byte count. */
const isCksum = (text) => typeof text === 'string' && /^\d+ \d+$/.test(text);
/** The save-cap band's ceiling in any grouping a locale draws (`toLocaleString()`): 90,000, 90.000, 90 000. */
const CAP_IN_CHIP = /\b90[,.\u00a0\u202f' ]?000 bytes/;

export const GRADERS = {
  L: {
    title: "a legacy writeRoot keeps today's bound, its hash and its confirmation",
    clauses: [
      ['HEAD reads the row confirmed with no confirm pressed', (r) => !r.wantParent || r.confirmedWithoutPress === true],
      ["its hash is the parent's", (r) => withParent(r, (p) => typeof r.hash === 'string' && r.hash === p.hash)],
      ['HEAD wrote, made, done and committed under the legacy root', (r) => same(r.outcomes, { put: 'wrote', makeDir: 'made', stage: 'done', commit: 'committed' })],
      ['the parent did the same under it', (r) => withParent(r, (p) => same(p.outcomes, { put: 'wrote', makeDir: 'made', stage: 'done', commit: 'committed' }))],
      ['the far file holds the payload', (r) => typeof r.payloadSum === 'string' && r.farSum === r.payloadSum]
    ]
  },
  A: {
    title: 'a project opened by hand saves, makes, renames, stages and commits with nothing asked',
    clauses: [
      ['the parent refused every verb', (r) => withParent(r, (p) => parentRefusedAll(p.outcomes))],
      ['HEAD wrote, made, moved, done, done and committed', (r) => same(r.outcomes, { put: 'wrote', makeDir: 'made', rename: 'moved', stage: 'done', unstage: 'done', commit: 'committed' })],
      ["the far file's sha256 is the payload's", (r) => typeof r.payloadSum === 'string' && r.farSum === r.payloadSum],
      ['the folder, the rename and the commit are on that machine', (r) => r.madeOnFar === true && r.renamedOnFar === true && Number.isInteger(r.commitsBefore) && r.commitsAfter === r.commitsBefore + 1]
    ]
  },
  A2: {
    title: 'a second, unrelated tree saves too',
    clauses: [['the save wrote the payload', (r) => r.put === 'wrote' && typeof r.payloadSum === 'string' && r.farSum === r.payloadSum]]
  },
  B: {
    title: 'a project under a linked ancestor saves, as the parent did under its legacy root there',
    clauses: [
      ['HEAD wrote, made and done through a linked ancestor', (r) => same(r.outcomes, { put: 'wrote', makeDir: 'made', stage: 'done' })],
      // The parent's three verbs must all be there (an empty record is not a
      // reading), and a verb the parent THREW on (word null) wrote nothing, so
      // HEAD cannot be worse than it there.
      ['no scenario worse than the parent', (r) => withParent(r, (p) => Object.keys(p.outcomes ?? {}).length === 3 && Object.entries(p.outcomes).every(([verb, word]) => word === null || REFUSED_WORDS.includes(word) || (r.outcomes ?? {})[verb] === word))]
    ]
  },
  H1: {
    title: 'a folder swapped for a link after it was opened writes nothing',
    clauses: [
      ['each of the five verbs answered folderChanged', (r) => all(r.outcomes, 'folderChanged') && Object.keys(r.outcomes).length === 5],
      ["the victim's bytes and listing did not move", (r) => lists(r.victimBefore, 'v.txt') && r.victimBefore === r.victimAfter],
      ['a hand open re-pinned it and a save wrote', (r) => r.reopen?.put === 'wrote']
    ]
  },
  H2: {
    title: 'a folder swapped for a new folder writes nothing',
    clauses: [
      ['each verb answered folderChanged', (r) => all(r.outcomes, 'folderChanged') && Object.keys(r.outcomes).length >= 3],
      ['nothing was written in either folder', (r) => lists(r.oldBefore, 'before-swap.md') && r.oldBefore === r.oldAfter && typeof r.newBefore === 'string' && r.newBefore === r.newAfter]
    ]
  },
  H3: {
    title: 'a project opened at a link into .ssh, or .ßh, is refused by identity',
    clauses: [
      ['both answered protected', (r) => same(r.outcomes, { innocent: 'protected', inn2: 'protected' })],
      ['nothing appeared in .ssh', (r) => lists(r.sshBefore, 'authorized_keys') && r.sshBefore === r.sshAfter]
    ]
  },
  H4: {
    title: '.git and .ssh in another case and in a Unicode fold are protected',
    clauses: [
      ['every reserved spelling answered protected', (r) => all(r.outcomes, 'protected') && Object.keys(r.outcomes).length === 7],
      ['the real .git/config did not move', (r) => isCksum(r.gitConfigBefore) && r.gitConfigBefore === r.gitConfigAfter],
      ['the hooks and .ssh listings did not move', (r) => r.hooksBefore === r.hooksAfter && r.sshBefore === r.sshAfter]
    ]
  },
  H5: {
    title: 'planted rows: never at / or the far home; an ordinary folder behaves as ruled',
    clauses: [
      // A record whose plant did not land graded the three answers of three
      // rows that were never there (the accidental run: no parent launch, so no
      // manifest to plant into). run() declares that UNREADABLE; this clause
      // keeps a recorded fixture from passing it.
      ['the three rows were planted while the app was down', (r) => r.plant?.landed === true],
      ['/ and the far home answered writesOff naming the folder', (r) => r.root?.outcome === 'writesOff' && r.root?.folder === '/' && r.home?.outcome === 'writesOff' && typeof r.home?.folder === 'string'],
      ['nothing was written at / or the far home', (r) => r.rootWrote === false && r.homeWrote === false],
      ['the planted ordinary folder behaves as ruled (the risk he accepted)', (r) => r.planted?.outcome === 'wrote']
    ]
  },
  H5L: {
    title: 'a remote row no longer widens the local guarded save',
    clauses: [
      ['HEAD refused it projectClosed with the file unchanged', (r) => r.outcome === 'refused' && r.why === 'projectClosed' && typeof r.fileBefore === 'string' && r.fileBefore === r.fileAfter],
      ['the parent wrote (fault 5, measured)', (r) => withParent(r, (p) => p.outcome === 'wrote')]
    ]
  },
  H6: {
    title: 'a changed machine writes nothing until it is confirmed again',
    clauses: [
      ["each verb threw the gate's own sentence", (r) => Object.keys(r.verbs ?? {}).length === 5 && Object.values(r.verbs).every((v) => v.threw === true && /details changed/.test(v.message ?? ''))],
      ['nothing moved on that machine', (r) => lists(r.farBefore, 'o.txt') && r.farBefore === r.farAfter],
      ['savesInProjects read false', (r) => r.savesInProjects === false],
      ['once the edit was undone a save wrote with no confirm', (r) => r.afterUndo?.put === 'wrote' && r.confirmPressed === false]
    ]
  },
  // Phase 336.1 (his ruling of 2026-10-05, "Yes, fix it now"): only the home
  // itself, a folder holding it and / stay off limits. Phase 336 graded the
  // home's child as writesOff, which is the greyed-out ~/dev he reported.
  H8: {
    title: 'the far home is never written; a project directly inside it is, every verb and both Explorer buttons',
    clauses: [
      ['the far home answered writesOff naming the folder', (r) => r.home?.outcome === 'writesOff' && typeof r.home?.folder === 'string'],
      ['a link named like a project that leads to the far home answered writesOff', (r) => r.linkHome?.outcome === 'writesOff' && typeof r.linkHome?.folder === 'string'],
      ['a project directly inside the far home wrote', (r) => r.child?.outcome === 'wrote'],
      ['a grandchild wrote', (r) => r.grand?.outcome === 'wrote'],
      ['in ~/dev every verb wrote, made, moved, done, done and committed', (r) => same(r.dev?.outcomes, { put: 'wrote', makeDir: 'made', rename: 'moved', stage: 'done', unstage: 'done', commit: 'committed' })],
      ['in ~/dev the Explorer offered New File and New Folder', (r) => r.dev?.headerButtonsEnabled === true]
    ]
  },
  R: {
    title: 'the renderer draws an open project as an edit surface and asks nothing',
    clauses: [
      // `remote` is the drive's own reading of the tab: a local tab taking the
      // keystroke is not the remote edit surface this clause is about.
      // `mode` is the tab's own mode at the reading (Phase 336's fix round):
      // File, the editor a person types into, never a side of the review.
      ['the editor took a keystroke and went dirty', (r) => r.editor?.missing === false && r.editor?.mode === 'file' && r.editor?.remote === true && r.editor?.readOnly === false && r.editor?.accepted === true && r.editor?.dirtyAfter === true],
      ['the save wrote the typed bytes', (r) => r.save === 'wrote' && r.farHasTyped === true],
      ['the Explorer header buttons were enabled', (r) => r.headerButtonsEnabled === true],
      // A tab of its own (an open refused leaves a.txt in front), a remote
      // one, and the ceiling read in any grouping the locale draws.
      [
        'the 150 KB file opened read only with its chip',
        (r) =>
          r.bigFile?.opened === true &&
          r.bigFile?.mode === 'file' &&
          r.bigFile?.remote === true &&
          typeof r.bigFile?.tabId === 'string' &&
          r.bigFile.tabId !== r.editor?.tabId &&
          r.bigFile?.readOnly === true &&
          r.bigFile?.error === null &&
          CAP_IN_CHIP.test(r.bigFile?.chip ?? '')
      ],
      ['no drawn write string names Settings', (r) => Array.isArray(r.drawnSettings) && r.drawnSettings.length === 0],
      ['the built renderer names no saving sheet', (r) => r.bundleNamesBrowseWrites === false && r.bundleNamesLetTortie === false]
    ]
  },
  RUN: {
    title: 'the run left nothing and moved nothing of his',
    clauses: [
      ['the parent ran every arm it was asked for', (r) => !r.wantParent || (Array.isArray(r.parentArms) && r.parentWanted.every((id) => r.parentArms.includes(id)))],
      ['his -L gmux count did not move', (r) => r.gmuxBefore !== null && r.gmuxBefore === r.gmuxAfter],
      ['his dotfiles did not move', (r) => Array.isArray(r.dotfilesMoved) && r.dotfilesMoved.length === 0],
      ['no Electron, far folder or scratch process was left', (r) => r.electronsLeft === 0 && r.farLeft === false]
    ]
  }
};

/**
 * His `-L gmux` session count, read WITH ITS EXIT STATUS (his ruled round,
 * 2026-10-05). `build/real-machine.mjs`'s `countOperatorSessions` pipes the
 * listing through `2>/dev/null | wc -l`, so a refused read (the Phase 336
 * reverify ran under a tmux wrapper that refuses `-L gmux`), a missing server
 * or a timeout each read "0", and RUN graded that "0" against "0" as "his count
 * did not move". This is pure: it reads what ONE listing answered,
 * `tmux -L gmux list-sessions -F x`, which prints one `x` per session and no
 * name. Answers `{ count: '<n>', why: null }` only when tmux exited 0 and every
 * line is that `x`; otherwise `{ count: null, why }`, which run() declares
 * UNREADABLE and never grades as "0".
 */
export function hisCountOf({ status, stdout, stderr = '' }) {
  if (status !== 0) {
    const said = String(stderr ?? '').trim();
    return { count: null, why: `tmux -L gmux list-sessions exited ${String(status)}${said === '' ? '' : `: ${said.slice(0, 120)}`}` };
  }
  const lines = String(stdout ?? '').split('\n').filter((line) => line !== '');
  if (lines.some((line) => line !== 'x')) return { count: null, why: `the listing printed something other than one x per session: ${J(lines.slice(0, 3))}` };
  return { count: String(lines.length), why: null };
}

/** RUN's count clause, by name: the one an unreadable count stands in for. */
export const RUN_COUNT_CLAUSE = 'his -L gmux count did not move';

/**
 * Why RUN's count cannot be read, or null when both halves were read: a null
 * half is a count that was refused or failed, and RUN is then UNREADABLE (exit
 * 2), never graded, because a "0" nobody counted proves nothing about his server.
 */
export function runCountUnreadable(run) {
  for (const [half, key, why] of [['before', 'gmuxBefore', 'gmuxWhyBefore'], ['after', 'gmuxAfter', 'gmuxWhyAfter']]) {
    if (typeof run?.[key] !== 'string' || !/^\d+$/.test(run[key])) return `his -L gmux count could not be read ${half} the run: ${String(run?.[why] ?? 'no reading')}`;
  }
  return null;
}

/** The far side's line that carries the listing's own exit status, after the listing. */
export const FAR_COUNT_STATUS = 'p336-status=';

/**
 * The real row's count: the far shell prints the listing and then
 * `p336-status=<n>` on a line of its own, so the status crosses with the
 * lines (an ssh that failed prints neither, and reads as status null).
 */
export function hisCountOfFar(stdout) {
  const lines = String(stdout ?? '').split('\n');
  const at = lines.findLastIndex((line) => line.startsWith(FAR_COUNT_STATUS));
  if (at === -1) return { count: null, why: 'the far shell printed no status for the listing' };
  const status = Number(lines[at].slice(FAR_COUNT_STATUS.length).trim());
  return hisCountOf({ status: Number.isInteger(status) ? status : null, stdout: lines.slice(0, at).join('\n') });
}

/** Grade one arm's reading: `{ ok, failed }`, the names of the clauses that failed. */
export function grade(id, reading) {
  const failed = [];
  for (const [name, test] of GRADERS[id].clauses) {
    let ok = false;
    try {
      ok = test(reading) === true;
    } catch {
      ok = false;
    }
    if (!ok) failed.push(name);
  }
  return { ok: failed.length === 0, failed };
}

/** One arm's reading out of a HEAD record and a parent record. */
export function readingOf(id, head, parent) {
  if (id === 'RUN') return { ...(head.run ?? {}), wantParent: parent !== null, parentArms: parent === null ? [] : Object.keys(parent.arms ?? {}), parentWanted: head.run?.parentWanted ?? [] };
  return { ...(head.arms?.[id] ?? {}), parent: parent === null ? null : (parent.arms?.[id] ?? null), wantParent: parent !== null && (head.run?.parentWanted ?? []).includes(id) };
}

// ---------------------------------------------------------------------------
// The breaks: every clause broken alone, on a copy of the honest reading
// ---------------------------------------------------------------------------

const BREAKS = {
  L: {
    'HEAD reads the row confirmed with no confirm pressed': (r) => { r.confirmedWithoutPress = false; },
    "its hash is the parent's": (r) => { r.hash = '0'.repeat(64); },
    'HEAD wrote, made, done and committed under the legacy root': (r) => { r.outcomes.stage = 'writesOff'; },
    'the parent did the same under it': (r) => { r.parent.outcomes.put = 'stale'; },
    'the far file holds the payload': (r) => { r.farSum = 'f'.repeat(64); }
  },
  A: {
    'the parent refused every verb': (r) => { r.parent.outcomes.put = 'wrote'; },
    'HEAD wrote, made, moved, done, done and committed': (r) => { r.outcomes.commit = 'refused'; },
    "the far file's sha256 is the payload's": (r) => { r.farSum = null; },
    'the folder, the rename and the commit are on that machine': (r) => { r.commitsAfter = r.commitsBefore; }
  },
  A2: { 'the save wrote the payload': (r) => { r.put = 'writesOff'; } },
  B: {
    'HEAD wrote, made and done through a linked ancestor': (r) => { r.outcomes.makeDir = 'folderChanged'; },
    'no scenario worse than the parent': (r) => { r.outcomes.put = 'folderChanged'; r.parent.outcomes.put = 'wrote'; }
  },
  H1: {
    // A REFUSED ARM ANSWERING `wrote`, the first shape the spec names.
    'each of the five verbs answered folderChanged': (r) => { r.outcomes.put = 'wrote'; },
    // A VICTIM MD5 MOVED.
    "the victim's bytes and listing did not move": (r) => { r.victimAfter = 'moved'; },
    'a hand open re-pinned it and a save wrote': (r) => { r.reopen.put = 'folderChanged'; }
  },
  H2: {
    'each verb answered folderChanged': (r) => { r.outcomes.put = 'wrote'; },
    'nothing was written in either folder': (r) => { r.newAfter = `${r.newAfter},p336.txt`; }
  },
  H3: {
    'both answered protected': (r) => { r.outcomes.inn2 = 'wrote'; },
    'nothing appeared in .ssh': (r) => { r.sshAfter = `${r.sshAfter},x`; }
  },
  H4: {
    'every reserved spelling answered protected': (r) => { r.outcomes.ssfold = 'wrote'; },
    // THE REAL .git MD5 MOVED.
    'the real .git/config did not move': (r) => { r.gitConfigAfter = 'moved'; },
    'the hooks and .ssh listings did not move': (r) => { r.hooksAfter = `${r.hooksAfter},pre-commit`; }
  },
  H5: {
    'the three rows were planted while the app was down': (r) => { r.plant.landed = false; },
    '/ and the far home answered writesOff naming the folder': (r) => { r.home.outcome = 'wrote'; },
    'nothing was written at / or the far home': (r) => { r.homeWrote = true; },
    'the planted ordinary folder behaves as ruled (the risk he accepted)': (r) => { r.planted.outcome = 'writesOff'; }
  },
  H5L: {
    'HEAD refused it projectClosed with the file unchanged': (r) => { r.outcome = 'wrote'; },
    'the parent wrote (fault 5, measured)': (r) => { r.parent.outcome = 'refused'; }
  },
  H6: {
    "each verb threw the gate's own sentence": (r) => { r.verbs.put = { threw: false, message: '' }; },
    'nothing moved on that machine': (r) => { r.farAfter = 'moved'; },
    'savesInProjects read false': (r) => { r.savesInProjects = true; },
    'once the edit was undone a save wrote with no confirm': (r) => { r.confirmPressed = true; }
  },
  H8: {
    'the far home answered writesOff naming the folder': (r) => { r.home.outcome = 'wrote'; },
    'a link named like a project that leads to the far home answered writesOff': (r) => { r.linkHome.outcome = 'wrote'; },
    // THE DEFECT HE REPORTED: the home's direct child refused.
    'a project directly inside the far home wrote': (r) => { r.child.outcome = 'writesOff'; },
    'a grandchild wrote': (r) => { r.grand.outcome = 'writesOff'; },
    'in ~/dev every verb wrote, made, moved, done, done and committed': (r) => { r.dev.outcomes.makeDir = 'writesOff'; },
    // THE BUTTONS GREYED, as he saw them.
    'in ~/dev the Explorer offered New File and New Folder': (r) => { r.dev.headerButtonsEnabled = false; }
  },
  R: {
    'the editor took a keystroke and went dirty': (r) => { r.editor.readOnly = true; },
    'the save wrote the typed bytes': (r) => { r.farHasTyped = false; },
    'the Explorer header buttons were enabled': (r) => { r.headerButtonsEnabled = false; },
    // THE 150 KB FILE REFUSED.
    'the 150 KB file opened read only with its chip': (r) => { r.bigFile = { opened: false, readOnly: null, chip: null, error: 'That file is too large to save on that machine.' }; },
    // A "SETTINGS" STRING DRAWN.
    'no drawn write string names Settings': (r) => { r.drawnSettings = ['Turn saving on in Settings, then Machines.']; },
    'the built renderer names no saving sheet': (r) => { r.bundleNamesLetTortie = true; }
  },
  RUN: {
    // A PARENT ARM MISSING.
    'the parent ran every arm it was asked for': (r) => { r.parentArms = r.parentArms.filter((id) => id !== 'A'); },
    // A -L gmux COUNT MOVED.
    'his -L gmux count did not move': (r) => { r.gmuxAfter = String(Number(r.gmuxBefore) + 1); },
    // THE DOTFILES MOVED.
    'his dotfiles did not move': (r) => { r.dotfilesMoved = ['.zsh_history']; },
    'no Electron, far folder or scratch process was left': (r) => { r.electronsLeft = 1; }
  }
};

/** Read one recorded fixture record. */
function fixture(name) {
  return JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
}

/**
 * WHOLE RECORDS, graded as a run grades them, each with the verdict an honest
 * grader gives (probe review, Phase 336, docs/method/HOW-WE-BUILT-THIS.md rule
 * 9). `fail` names, per arm, clauses that MUST be among the failed ones; every
 * arm not named in `fail` must PASS. Each file's `_note` says what it is.
 *
 *  - the builder's honest pair, and an honest parent for run()'s own arm order
 *    (B's writeRoot set before A, so A's parent words are outsideRoot);
 *  - the ONE REAL RECORD Phase 336 has, the integrator's accidental HEAD run:
 *    every arm but H5 (nothing planted) and R (the Explorer never shown);
 *  - a hostile pair with one realistic wrong answer in every arm;
 *  - a dead far side: every outcome word right and every far read empty or
 *    unreadable, before and after, which must not read as "nothing moved".
 */
export const RECORDED_FIXTURES = [
  { head: 'head-record.json', parent: 'parent-record.json', fail: {} },
  { head: 'head-record.json', parent: 'parent-record-b-first.json', fail: {} },
  {
    head: 'head-record-accidental.json',
    parent: null,
    fail: {
      H5: ['the three rows were planted while the app was down'],
      // Recorded at Phase 336, which refused the home's child: the build Phase
      // 336.1 fixes, so its H8 fails the clauses 336.1 added, honestly.
      H8: [
        'a link named like a project that leads to the far home answered writesOff',
        'a project directly inside the far home wrote',
        'in ~/dev every verb wrote, made, moved, done, done and committed',
        'in ~/dev the Explorer offered New File and New Folder'
      ],
      R: ['the editor took a keystroke and went dirty', 'the Explorer header buttons were enabled', 'the 150 KB file opened read only with its chip']
    }
  },
  {
    head: 'head-record-hostile.json',
    parent: 'parent-record-hostile.json',
    fail: {
      L: ['HEAD reads the row confirmed with no confirm pressed', "its hash is the parent's"],
      A: ['the parent refused every verb', 'HEAD wrote, made, moved, done, done and committed', "the far file's sha256 is the payload's"],
      A2: ['the save wrote the payload'],
      B: ['HEAD wrote, made and done through a linked ancestor', 'no scenario worse than the parent'],
      H1: ['each of the five verbs answered folderChanged', "the victim's bytes and listing did not move"],
      H2: ['each verb answered folderChanged', 'nothing was written in either folder'],
      H3: ['both answered protected', 'nothing appeared in .ssh'],
      H4: ['every reserved spelling answered protected', 'the hooks and .ssh listings did not move'],
      H5: ['/ and the far home answered writesOff naming the folder', 'nothing was written at / or the far home', 'the planted ordinary folder behaves as ruled (the risk he accepted)'],
      H5L: ['HEAD refused it projectClosed with the file unchanged', 'the parent wrote (fault 5, measured)'],
      H6: ["each verb threw the gate's own sentence", 'nothing moved on that machine'],
      H8: ['a project directly inside the far home wrote'],
      R: ['the editor took a keystroke and went dirty', 'the save wrote the typed bytes', 'the 150 KB file opened read only with its chip', 'no drawn write string names Settings'],
      RUN: ['the parent ran every arm it was asked for', 'his -L gmux count did not move', 'no Electron, far folder or scratch process was left']
    }
  },
  {
    head: 'head-record-dead-far.json',
    parent: 'parent-record.json',
    fail: {
      H1: ["the victim's bytes and listing did not move"],
      H2: ['nothing was written in either folder'],
      H3: ['nothing appeared in .ssh'],
      H4: ['the real .git/config did not move'],
      H6: ['nothing moved on that machine']
    }
  }
];

/**
 * Edits of the honest reading that are STILL RIGHT, each of which must pass:
 * the shapes a grader could fail by being stricter than the product's truth.
 */
const HONEST_VARIANTS = {
  A: [['the parent with no writeRoot (B not asked for) answers writesOff', (r) => { r.parent.outcomes = { put: 'writesOff', makeDir: 'writesOff', rename: 'writesOff', stage: 'writesOff', unstage: 'writesOff', commit: 'refused' }; }]],
  B: [['a parent verb that THREW wrote nothing, so HEAD doing it is not worse', (r) => { r.parent.outcomes.stage = null; }]],
  R: [
    ['the cap grouped with a period (a German locale)', (r) => { r.bigFile.chip = r.bigFile.chip.replace('90,000', '90.000'); }],
    ['the cap grouped with a narrow space (a French locale)', (r) => { r.bigFile.chip = r.bigFile.chip.replace('90,000', '90 000'); }],
    ['a cut read says over', (r) => { r.bigFile.chip = 'That file is over 140,000 bytes and Tortie saves files up to 90,000 bytes on P336 Machine, so it is shown read only.'; }]
  ],
  H4: [['a repository made with no sample hooks lists none, before and after', (r) => { r.hooksBefore = ''; r.hooksAfter = ''; }]]
};

/** Hostile edits beyond BREAKS, each of which must turn the named clause red. */
const REFUSED_EDITS = {
  A: [{ what: 'a parent record holding five verbs, commit missing', clause: 'the parent refused every verb', edit: (r) => { delete r.parent.outcomes.commit; } }],
  B: [{ what: 'a parent B that recorded no verbs', clause: 'no scenario worse than the parent', edit: (r) => { r.parent.outcomes = {}; } }],
  H1: [{ what: 'a far read that failed twice', clause: "the victim's bytes and listing did not move", edit: (r) => { r.victimBefore = r.victimAfter = '|unreadable|unreadable|0'; } }],
  H3: [{ what: 'an empty .ssh listing twice', clause: 'nothing appeared in .ssh', edit: (r) => { r.sshBefore = r.sshAfter = ''; } }],
  H4: [{ what: 'an unreadable .git/config twice', clause: 'the real .git/config did not move', edit: (r) => { r.gitConfigBefore = r.gitConfigAfter = 'unreadable'; } }],
  H5: [{ what: 'a record that shows no plant', clause: 'the three rows were planted while the app was down', edit: (r) => { delete r.plant; } }],
  H6: [{ what: 'an empty far listing twice', clause: 'nothing moved on that machine', edit: (r) => { r.farBefore = r.farAfter = ''; } }],
  R: [
    { what: 'a LOCAL tab taking the keystroke', clause: 'the editor took a keystroke and went dirty', edit: (r) => { r.editor.remote = false; } },
    { what: 'a refused open that left a.txt in front', clause: 'the 150 KB file opened read only with its chip', edit: (r) => { r.bigFile.tabId = r.editor.tabId; } },
    { what: 'a reading of the review rather than the File editor', clause: 'the editor took a keystroke and went dirty', edit: (r) => { r.editor.mode = 'diff'; } },
    { what: "the big file read from a side of the review, whose read only says nothing about the save cap", clause: 'the 150 KB file opened read only with its chip', edit: (r) => { r.bigFile.mode = 'diff'; } },
    { what: 'a big file opened on this Mac rather than the machine', clause: 'the 150 KB file opened read only with its chip', edit: (r) => { r.bigFile.remote = false; } },
    { what: 'a chip naming another ceiling', clause: 'the 150 KB file opened read only with its chip', edit: (r) => { r.bigFile.chip = 'That file is 150,000 bytes and Tortie saves files up to 900,000 bytes on P336 Machine.'; } },
    { what: 'a line whose only 90,000 is inside 190,000', clause: 'the 150 KB file opened read only with its chip', edit: (r) => { r.bigFile.chip = 'That file is 190,000 bytes.'; } }
  ]
};

export function graderSelfTest(write = (line) => process.stdout.write(`${line}\n`)) {
  let head;
  let parent;
  try {
    head = fixture('head-record.json');
    parent = fixture('parent-record.json');
  } catch (err) {
    write(`[p336] grader self-test FAIL: the fixtures did not load: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
  let bad = 0;
  let checks = 0;
  const say = (ok, text) => {
    checks += 1;
    if (!ok) bad += 1;
    write(`[p336] ${ok ? 'ok  ' : 'BAD '} ${text}`);
  };
  const fixtures = Object.fromEntries(
    Object.keys(GRADERS).map((id) => [id, { pass: readingOf(id, head, parent), breaks: BREAKS[id] ?? {}, refused: REFUSED_EDITS[id] ?? [] }])
  );
  const clauses = gradeFixtures({ graders: GRADERS, fixtures, grade, clone: (v) => JSON.parse(J(v)), say, J });
  // The honest variants: still right, so each must pass.
  for (const [id, variants] of Object.entries(HONEST_VARIANTS)) {
    for (const [what, edit] of variants) {
      const reading = JSON.parse(J(fixtures[id].pass));
      edit(reading);
      const got = grade(id, reading);
      say(got.ok, `${id} passes an honest variant: ${what}${got.ok ? '' : ` (it failed ${J(got.failed)})`}`);
    }
  }
  // The whole records, each against the verdict an honest grader gives.
  for (const want of RECORDED_FIXTURES) {
    let h;
    let p;
    try {
      h = fixture(want.head);
      p = want.parent === null ? null : fixture(want.parent);
    } catch (err) {
      say(false, `${want.head} + ${String(want.parent)} did not load: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    for (const id of Object.keys(GRADERS)) {
      const mustFail = want.fail[id] ?? null;
      if (id !== 'RUN' && h.arms?.[id] === undefined) {
        say(false, `${want.head} records no ${id}, so it grades nothing there`);
        continue;
      }
      const got = grade(id, readingOf(id, h, p));
      if (mustFail === null) say(got.ok, `${want.head} + ${String(want.parent)}: ${id} passes${got.ok ? '' : ` (it failed ${J(got.failed)})`}`);
      else {
        const missed = mustFail.filter((c) => !got.failed.includes(c));
        say(!got.ok && missed.length === 0, `${want.head} + ${String(want.parent)}: ${id} fails on ${J(mustFail)}${missed.length === 0 ? '' : ` (it did not fail ${J(missed)}; failed ${J(got.failed)})`}`);
      }
    }
  }
  // Two whole-record shapes the spec names, each read through the arm it lands in.
  {
    const noParent = readingOf('RUN', head, null);
    say(grade('RUN', noParent).ok, 'RUN passes with no parent asked for');
    const short = JSON.parse(J(parent));
    delete short.arms.H5L;
    const missing = grade('RUN', readingOf('RUN', head, short));
    say(!missing.ok && missing.failed.includes('the parent ran every arm it was asked for'), 'a parent record missing an arm it was asked for fails RUN');
    const refusedWrote = JSON.parse(J(head));
    refusedWrote.arms.H4.outcomes.gitConfig = 'wrote';
    say(!grade('H4', readingOf('H4', refusedWrote, parent)).ok, 'a refused H4 shape answering wrote fails H4');
  }
  // His ruled round: a refused or failed -L gmux count is UNREADABLE, never "0".
  {
    const read = (got) => J(got.count);
    say(read(hisCountOf({ status: 1, stdout: '', stderr: '' })) === 'null', "a refused count (a verifier's wrapper: exit 1, nothing printed) reads null, not \"0\"");
    say(read(hisCountOf({ status: null, stdout: '' })) === 'null', 'a count that timed out or could not start reads null');
    say(read(hisCountOf({ status: 1, stdout: '', stderr: 'no server running on /private/tmp/tmux-501/gmux' })) === 'null', 'a count with no server reads null');
    say(read(hisCountOf({ status: 0, stdout: 'main\nwork\n' })) === 'null', 'a listing that is not one x per session reads null (no name is counted)');
    say(read(hisCountOf({ status: 0, stdout: 'x\nx\nx\n' })) === '"3"', 'three sessions listed read "3"');
    say(read(hisCountOfFar(`x\nx\n${FAR_COUNT_STATUS}0\n`)) === '"2"', 'the far form reads the listing above its status line');
    say(read(hisCountOfFar(`${FAR_COUNT_STATUS}1\n`)) === 'null', 'the far form with a refused listing reads null');
    say(read(hisCountOfFar('')) === 'null', 'the far form with no status line (an ssh that failed) reads null');
    say(runCountUnreadable({ gmuxBefore: null, gmuxAfter: '0', gmuxWhyBefore: 'exit 1' }) !== null, 'RUN with no count before is UNREADABLE');
    say(runCountUnreadable({ gmuxBefore: '7', gmuxAfter: null }) !== null, 'RUN with no count after is UNREADABLE');
    say(runCountUnreadable(head.run) === null, "the honest record's count is readable");
    say(GRADERS.RUN.clauses.some(([name]) => name === RUN_COUNT_CLAUSE), 'the clause an unreadable count stands in for is one of RUN\'s');
  }
  // ATTACK_ARMS is imported from probe:p242 so the containment family stays one list.
  say(Array.isArray(ATTACK_ARMS) && ATTACK_ARMS.length >= 15, `the 242 family's attack arms are read from probe:p242 (${String(ATTACK_ARMS?.length)})`);
  write(bad === 0 ? `[p336] grader self-test PASS: ${String(clauses)} clauses, ${String(checks)} checks, nothing was started.` : `[p336] grader self-test FAIL on ${String(bad)} of ${String(checks)}`);
  return bad === 0;
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === HERE;
if (isMain && process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);
if (isMain) await run();

// ===========================================================================
// THE RUN. Everything below starts processes; builders never reach it.
// ===========================================================================

async function run() {
  const TAG = '[p336]';
  const t0 = Date.now();
  const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
  const refuse = (why) => {
    console.error(`${TAG} REFUSED. ${why}`);
    process.exit(2);
  };

  // ---- the refusals, in the order they are asked -------------------------
  const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (SOCKET === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p336`, which wraps this file in build/harness-socket.mjs.');
  if (SOCKET === 'gmux' || SOCKET === 'default' || !/^gmux-p336[a-z0-9-]*-\d+$/.test(SOCKET)) refuse(`"${SOCKET}" is not a gmux-p336 harness socket ending in its pid.`);
  const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
  if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
  const CONFIG_ROOT = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
  const FAR_MODE = (process.env['P336_FAR'] ?? '').trim() || 'loopback';
  if (FAR_MODE !== 'loopback' && FAR_MODE !== 'real') refuse(`P336_FAR is ${J(FAR_MODE)}; it is loopback or real.`);
  if (process.env['SCRATCH_MACHINE_QUIET_SHELL'] !== '1' || process.env['SCRATCH_MACHINE_SCRATCH_HOME'] !== '1') {
    refuse('SCRATCH_MACHINE_QUIET_SHELL=1 and SCRATCH_MACHINE_SCRATCH_HOME=1 are both required: without them the loopback far home is his real home (D23).');
  }
  let carriage = null;
  let realFacts = null;
  if (FAR_MODE === 'loopback') {
    try {
      carriage = JSON.parse(readFileSync(join(CONFIG_ROOT, 'p69-carriage.json'), 'utf8'));
    } catch {
      carriage = null;
    }
    if (CONFIG_ROOT === '' || carriage === null) refuse('there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs.');
    if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
    if (!existsSync(String(carriage.remoteTmuxPath ?? ''))) refuse(`the carriage's tmux ${J(carriage.remoteTmuxPath)} does not exist.`);
  } else {
    let scratchAgent = null;
    try {
      scratchAgent = JSON.parse(readFileSync(join(CONFIG_ROOT, 'p69-carriage.json'), 'utf8')).authSock ?? null;
    } catch {
      scratchAgent = null;
    }
    realFacts = realMachineFromEnv(process.env, SOCKET, { app: true, scratchAgent });
    if (realFacts.refusal !== null) refuse(`the real machine: ${realFacts.refusal}`);
  }
  const PARENT = (process.env['P336_PARENT_CHECKOUT'] ?? '').trim();
  const KEEP = process.env['P336_KEEP'] === '1';
  const ARMS = (process.env['P336_ARMS'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const wants = (id) => ARMS.length === 0 || ARMS.includes(id);
  for (const checkout of [ROOT, ...(PARENT === '' ? [] : [resolve(PARENT)])]) {
    if (!existsSync(join(checkout, 'out', 'main', 'index.js'))) refuse(`${join(checkout, 'out', 'main', 'index.js')} is missing. Build that checkout first.`);
  }
  const SOURCES = ['src/main/machines/write-folder.ts', 'src/main/machines/remote-scripts.ts', 'src/shared/remote-write-folder.ts', 'src/renderer/state/machines-slice.ts'];
  const newer = SOURCES.filter((s) => existsSync(join(ROOT, s)) && statSync(join(ROOT, s)).mtimeMs > statSync(join(ROOT, 'out', 'main', 'index.js')).mtimeMs);
  if (newer.length > 0) refuse(`out/ is older than ${newer.join(', ')}; build first.`);

  // ---- the scratch world ---------------------------------------------------
  mkdirSync(join(HARNESS_DIR, 'p336'), { recursive: true });
  const RUN = realpathSync(join(HARNESS_DIR, 'p336'));
  const HOME = join(RUN, 'home');
  const PROFILE = join(RUN, 'profile');
  const MANIFEST = join(PROFILE, 'gmux', 'manifest.db');
  const MACHINES_JSON = join(PROFILE, 'gmux', 'config', 'machines.json');
  const OUT = resolve(ROOT, (process.env['P336_OUT_DIR'] ?? '').trim() || join('out', 'p336'));
  const MACHINE_ID = 'p336-machine';
  const MACHINE_LABEL = 'P336 Machine';
  const PAYLOAD = (tag) => `p336 ${tag} ${String(process.pid)}\n`;
  const sha256 = (text) => createHash('sha256').update(text).digest('hex');

  /**
   * The far side. `sh` runs one POSIX script there and answers its stdout;
   * `root` is the folder every far file of this run lives under; `home` is the
   * far `$HOME`, or null on the real row, where it is his and no arm goes near it.
   */
  let far = null;
  let real = null;
  if (FAR_MODE === 'loopback') {
    if (!existsSync(join(CONFIG_ROOT, 'home'))) refuse(`the yard has no scratch home at ${join(CONFIG_ROOT, 'home')}; build/with-scratch-machine.mjs makes it only with SCRATCH_MACHINE_SCRATCH_HOME=1 (D23).`);
    const farHome = realpathSync(join(CONFIG_ROOT, 'home'));
    if (!farHome.startsWith(`${realpathSync(CONFIG_ROOT)}/`)) refuse(`the far home ${farHome} is not inside the yard, so an arm would write toward his real home.`);
    const env = { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: farHome, ZDOTDIR: join(CONFIG_ROOT, 'zdot'), HISTFILE: '/dev/null', LC_ALL: 'C' };
    far = {
      kind: 'loopback',
      root: join(RUN, 'far'),
      home: farHome,
      sh: (script) => {
        const r = spawnSync('/bin/sh', ['-c', script], { encoding: 'utf8', env, timeout: 60_000 });
        return { code: r.status ?? -1, stdout: String(r.stdout ?? ''), stderr: String(r.stderr ?? '') };
      }
    };
  } else {
    try {
      real = openRealMachine(realFacts, { runDir: HARNESS_DIR, say });
    } catch (err) {
      refuse(`the real machine did not open: ${err instanceof Error ? err.message : String(err)}`);
    }
    process.on('exit', () => real?.close());
    far = {
      kind: 'real',
      root: `${realFacts.farDir}/far`,
      home: null,
      sh: (script) => real.run(`/bin/sh -c ${quoteArg(script)}`)
    };
  }
  const F = far.root;
  if (/['\s]/.test(F)) refuse(`${F} holds a quote or a space, and it is typed into a far shell as one word.`);
  /** A far file's checksum (POSIX cksum, on both systems), or `absent`. */
  const farSum = (path) => (far.sh(`if [ -f '${path}' ]; then cksum < '${path}'; else echo absent; fi`).stdout.trim() || 'unreadable');
  const farList = (path) => far.sh(`ls -1A '${path}' 2>/dev/null | sort | tr '\\n' ','`).stdout.trim();
  const farText = (path) => far.sh(`cat '${path}' 2>/dev/null`).stdout;
  const farCommits = (repo) => Number(far.sh(`git -C '${repo}' rev-list --count HEAD 2>/dev/null || echo -1`).stdout.trim());
  const shaOfFar = (path) => {
    const text = far.sh(`cat '${path}' 2>/dev/null`).stdout;
    return text === '' ? null : sha256(text);
  };

  const report = { checkout: ROOT, parent: PARENT === '' ? null : resolve(PARENT), far: FAR_MODE, arms: [], records: {} };
  let failures = 0;
  let unreadable = 0;
  // An arm declared unreadable is counted ONCE: H1, H2, H5 and R declare it
  // themselves and record nothing, and the grading loop below must not count
  // the same arm again as "recorded nothing".
  const unreadableArms = new Set();
  const cannotRead = (id, why) => {
    if (unreadableArms.has(id)) return;
    unreadableArms.add(id);
    unreadable += 1;
    report.arms.push({ id, ok: null, said: why });
    say(`UNREADABLE ${id}: ${why}`);
  };

  // ---- the far tree, one script, every folder under the run's root --------
  const BIG = 'x'.repeat(149_999).concat('\n');
  const setupFar = () => {
    const repo = (dir) => `mkdir -p '${dir}' && cd '${dir}' && git init -q && git config --local user.name p336 && git config --local user.email p336@example.invalid && printf '# p336\\n' > README.md && printf 'a\\n' > a.txt && printf 'notes\\n' > notes.md && git add -A && git commit -q -m 'p336 base' && cd - >/dev/null`;
    const script = [
      'set -e',
      `rm -rf '${F}'`,
      `mkdir -p '${F}'`,
      repo(`${F}/legacy`),
      repo(`${F}/p336-a/repo`),
      `mkdir -p '${F}/p336-b/other' && printf 'other\\n' > '${F}/p336-b/other/o.txt'`,
      repo(`${F}/real-above/repo`),
      `ln -s real-above '${F}/link-above'`,
      // THE VICTIM IS A REPOSITORY with one staged and one untracked file,
      // because stage and commit read the repository (and the staged set)
      // BEFORE they reach the pin: a victim that is not one would refuse for
      // that reason and prove nothing about the pin.
      repo(`${F}/victim-dir`),
      `printf 'victim\\n' > '${F}/victim-dir/v.txt' && printf 'staged\\n' > '${F}/victim-dir/staged.txt' && printf 'dirty\\n' > '${F}/victim-dir/dirty.txt' && git -C '${F}/victim-dir' add staged.txt`,
      repo(`${F}/p336-h4/repo`),
      `mkdir -p '${F}/p336-h4/repo/.git/hooks' '${F}/p336-h4/repo/.ssh'`,
      repo(`${F}/p336-r/repo`),
      `mkdir -p '${F}/planted' && printf 'planted\\n' > '${F}/planted/g.txt'`,
      // H5's ordinary planted folder is its OWN: `<far>/planted` is opened by
      // hand at the parent for H5L, and `INSERT OR IGNORE` against
      // UNIQUE(machine_id, path) would then leave a hand-opened row standing in
      // for the planted one, which is not the risk H5 grades.
      `mkdir -p '${F}/planted-h5'`,
      `mkdir -p '${F}/link-legacy-real/repo'`,
      'echo ready'
    ];
    const made = far.sh(script.join('\n'));
    if (!made.stdout.includes('ready')) throw new Error(`the far tree was not made: ${made.stderr.trim().slice(0, 300)}`);
    // The 150,000 byte file, written by node on the loopback row and by a far
    // printf on the real one, either way 150,000 bytes.
    if (far.kind === 'loopback') writeFileSync(join(F, 'p336-r', 'repo', 'big.txt'), BIG);
    else far.sh(`head -c 149999 /dev/zero | tr '\\0' x > '${F}/p336-r/repo/big.txt' && printf '\\n' >> '${F}/p336-r/repo/big.txt'`);
    if (far.home !== null) {
      const h = far.home;
      far.sh([`mkdir -p '${h}/.ssh' '${h}/child/grand'`, `printf 'p336 scratch, never a real key\\n' > '${h}/.ssh/authorized_keys'`, `ln -sfn '${h}/.ssh' '${F}/innocent'`, `ln -sfn '${h}/.ßh' '${F}/inn2'`].join('\n'));
      // Phase 336.1: `~/dev`, a repository directly inside the far home (the
      // project he reported greyed out), and a link NAMED like a project that
      // leads to the home itself.
      const devMade = far.sh(['set -e', repo(`${h}/dev`), `ln -sfn '${h}' '${F}/dev'`, 'echo ready'].join('\n'));
      if (!devMade.stdout.includes('ready')) throw new Error(`the far ~/dev was not made: ${devMade.stderr.trim().slice(0, 300)}`);
    }
  };

  // ---- the app -------------------------------------------------------------
  const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));
  const devtoolsPort = () => {
    try {
      return Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      return 0;
    }
  };
  const targets = async () => {
    const port = devtoolsPort();
    if (!(port > 0)) return [];
    try {
      return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
    } catch {
      return [];
    }
  };
  const attachMain = async (timeoutMs = 150_000) => {
    const started = Date.now();
    let why = 'no DevToolsActivePort yet';
    for (;;) {
      const picked = pickRendererTarget(await targets());
      if (picked.target !== null) {
        const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
        await cdp.call('Runtime.enable');
        for (let i = 0; i < 200; i += 1) {
          if ((await cdpEval(cdp, "window.gmux !== undefined && window.gmux.machines !== undefined && typeof window.__gmuxP95 === 'object'")) === true) return cdp;
          await sleep(300);
        }
        throw new Error('the app never armed window.gmux.machines and the drives');
      }
      why = picked.why;
      if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
      await sleep(300);
    }
  };
  /** One expression in the window: `{ ok, value }` or `{ ok: false, error }`. */
  const bridge = async (cdp, expr) =>
    JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, 180_000));
  /** A verb's outcome word, or `threw: <sentence>`. */
  const outcome = async (cdp, expr) => {
    const got = await bridge(cdp, expr);
    if (!got.ok) return { word: null, threw: true, message: got.error, value: null };
    const v = got.value ?? {};
    return { word: v.outcome ?? v.kind ?? null, threw: false, message: '', value: v };
  };
  const M = (method, input) => `window.gmux.machines.${method}(${J(input)})`;
  const openRemote = async (cdp, path) => {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const opened = await bridge(cdp, `window.__gmuxP95.openRemote(${J(MACHINE_ID)}, ${J(path)})`);
      if (opened.ok && opened.value?.result?.ok === true) return opened.value.result;
      await sleep(2_000);
    }
    return null;
  };
  const rowOf = async (cdp) => {
    const rows = await bridge(cdp, 'window.gmux.machines.rows()');
    return rows.ok ? (rows.value?.rows ?? []).find((r) => r.id === MACHINE_ID) ?? null : null;
  };
  const viewOf = async (cdp) => {
    const st = await bridge(cdp, 'window.gmux.machines.state()');
    if (!st.ok) return null;
    const list = Array.isArray(st.value) ? st.value : (st.value?.machines ?? st.value?.states ?? []);
    return list.find((v) => v.id === MACHINE_ID) ?? null;
  };
  const reviewHead = async (cdp, cwd) => {
    const rev = await bridge(cdp, M('reviewFiles', { machineId: MACHINE_ID, cwd }));
    // The staged set main's own read reports: a row whose index column is a
    // change (`indexState`, the porcelain pair's first character).
    return rev.ok
      ? { head: rev.value?.headSha ?? '', staged: (rev.value?.files ?? []).filter((f) => ['M', 'A', 'D', 'R', 'C'].includes(f.indexState)).map((f) => f.path) }
      : { head: '', staged: [] };
  };

  const writeMachines = (extra = {}) => {
    mkdirSync(dirname(MACHINES_JSON), { recursive: true, mode: 0o700 });
    const row =
      far.kind === 'loopback'
        ? { id: MACHINE_ID, label: MACHINE_LABEL, host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: carriage.remoteTmuxPath, ...extra }
        : { ...realMachineRow({ id: MACHINE_ID, host: realFacts.host, user: realFacts.user, farDir: realFacts.farDir }), label: MACHINE_LABEL, ...extra };
    writeFileSync(MACHINES_JSON, `${J({ schema: 1, machines: [row] })}\n`, 'utf8');
    return row;
  };

  const launchOptions = (label, checkout) => ({
    label,
    userDataDir: PROFILE,
    cwd: checkout,
    tmuxSocket: SOCKET,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({
      ...INHERITED_CLAUDE,
      HOME,
      ZDOTDIR: HOME,
      HISTFILE: '/dev/null',
      TERM_SESSION_ID: undefined,
      GMUX_TMUX_SOCKET: SOCKET,
      GMUX_PROBES: '1',
      GMUX_LOG_FILE: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_CONFIG_ROOT: CONFIG_ROOT,
      GMUX_HARNESS_DIR: HARNESS_DIR,
      ...(far.kind === 'loopback' && typeof carriage.authSock === 'string' ? { SSH_AUTH_SOCK: carriage.authSock } : {})
    }),
    graceMs: 8_000,
    ceilingMs: 3_000_000
  });
  const launch = async (label, checkout, body) => {
    writeQuietAgents(PROFILE);
    return withElectron(launchOptions(label, checkout), async () => {
      const cdp = await attachMain();
      try {
        const list = JSON.parse(await cdpEval(cdp, 'window.gmux.agentsList().then((r) => JSON.stringify(r))'));
        const held = quietAgentsHeld(list);
        if (!held.ok) throw new Error(`agents:list says the renamed agents are not all absent: ${held.problems.join('; ')}`);
        await body(cdp);
      } finally {
        cdp.close();
      }
    });
  };

  // ---- the verbs every arm drives -----------------------------------------
  /** put, makeDir, rename, stage, unstage, commit in one project; outcome words. */
  /**
   * `stagePath` is the path stage names (main stages only a path its own fresh
   * read reports, so a swap arm names one the folder it now leads to reports);
   * `git: false` drives the three path verbs alone, for a folder that is not a
   * repository, where stage and commit answer notRepo before any pin is read.
   */
  const verbsIn = async (cdp, project, { tag, rename = true, unstage = true, stagePath = null, git = true } = {}) => {
    const out = {};
    const payload = PAYLOAD(tag);
    const staged = stagePath ?? `p336-${tag}.md`;
    out.put = (await outcome(cdp, M('putFile', { machineId: MACHINE_ID, path: `${project}/p336-${tag}.md`, contents: payload, expect: 'new' }))).word;
    out.makeDir = (await outcome(cdp, M('makeDir', { machineId: MACHINE_ID, path: `${project}/p336-${tag}-dir` }))).word;
    if (rename) out.rename = (await outcome(cdp, M('renameEntry', { machineId: MACHINE_ID, from: `${project}/notes.md`, to: `${project}/notes-${tag}.md`, kind: 'file' }))).word;
    if (!git) return { outcomes: out, payloadSum: sha256(payload) };
    out.stage = (await outcome(cdp, M('stage', { machineId: MACHINE_ID, cwd: project, paths: [staged] }))).word;
    if (unstage) {
      out.unstage = (await outcome(cdp, M('unstage', { machineId: MACHINE_ID, cwd: project, paths: [staged] }))).word;
      await outcome(cdp, M('stage', { machineId: MACHINE_ID, cwd: project, paths: [staged] }));
    }
    const rev = await reviewHead(cdp, project);
    out.commit = (await outcome(cdp, M('commit', { machineId: MACHINE_ID, cwd: project, headSha: rev.head, staged: rev.staged.length > 0 ? rev.staged : [staged], message: `p336 ${tag}` }))).word;
    return { outcomes: out, payloadSum: sha256(payload) };
  };

  // ---- the records ---------------------------------------------------------
  const parentRecord = { build: 'parent', far: FAR_MODE, arms: {} };
  const headRecord = { build: 'head', far: FAR_MODE, arms: {}, run: {} };
  const PARENT_ARMS = ['L', 'A', 'B', 'H4', 'H5L'];
  // H5L reads a far folder as a folder on THIS Mac, which only the loopback row is.
  headRecord.run.parentWanted = PARENT === '' ? [] : PARENT_ARMS.filter(wants).filter((id) => id !== 'H5L' || FAR_MODE === 'loopback');
  const census = () => (far.kind === 'real' ? null : localCensus(homedir()));
  const dotBefore = census();
  // HIS RULED ROUND: the count is read WITH its exit status (hisCountOf), on
  // this Mac for the loopback row and on the machine for the real row, and a
  // count that was refused or failed is null, which RUN declares UNREADABLE.
  const readHisCount = () => {
    if (far.kind === 'real') return hisCountOfFar(real.run(`${quoteArg(realFacts.realTmux)} -L gmux list-sessions -F x 2>/dev/null; echo "${FAR_COUNT_STATUS}$?"`).stdout);
    const listed = spawnSync('/bin/sh', ['-c', 'tmux -L gmux list-sessions -F x'], { encoding: 'utf8', timeout: 30_000 });
    return hisCountOf({ status: listed.status, stdout: listed.stdout ?? '', stderr: listed.stderr ?? '' });
  };
  const gmuxBefore = readHisCount();
  let gmuxAfter = null;
  const controlBefore = far.kind === 'real' ? controlEntries() : [];

  try {
    for (const dir of [HOME, PROFILE, OUT]) mkdirSync(dir, { recursive: true });
    writeFileSync(join(HOME, '.hushlogin'), '');
    setupFar();
    writeMachines();
    if (far.kind === 'loopback') {
      const known = join(PROFILE, 'gmux', 'machines', 'known-machines');
      mkdirSync(dirname(known), { recursive: true });
      writeFileSync(known, keyscanText({ host: carriage.host, port: carriage.port, caller: 'build/p336/probe-p336.mjs' }), 'utf8');
    } else {
      const known = join(PROFILE, 'gmux', 'machines', 'known-machines');
      mkdirSync(dirname(known), { recursive: true });
      writeFileSync(known, readFileSync(real.knownHosts, 'utf8'), 'utf8');
    }
    say(`measuring ${ROOT}${PARENT === '' ? '' : ` after the parent ${PARENT}`}; socket ${SOCKET}; the ${far.kind} machine; far root ${F}`);

    // ======================================================================
    // THE PARENT, FIRST, on the profile HEAD reuses
    // ======================================================================
    if (PARENT !== '') {
      await launch('p336-parent', resolve(PARENT), async (cdp) => {
        const up = await bridge(cdp, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
        if (!(up.ok && (up.value?.rows ?? []).some((r) => r.id === MACHINE_ID && r.usable))) throw new Error(`the machine is not usable at the parent: ${J(up).slice(0, 300)}`);
        if (far.kind === 'real') real.adoptAppControl(controlBefore, PROFILE);
        /** Set the parent's writeRoot through its own sheet, as a person did. */
        const allow = async (root) => {
          const sheet = await bridge(cdp, M('writeSheet', { id: MACHINE_ID, writeRoot: root }));
          if (!sheet.ok) throw new Error(`the parent's write sheet refused ${root}: ${sheet.error}`);
          const allowed = await bridge(cdp, M('allowWrites', { id: MACHINE_ID, writeRoot: root, hashRead: sheet.value.hash, linesRead: sheet.value.lines }));
          if (!allowed.ok) throw new Error(`the parent did not allow writes under ${root}: ${allowed.error}`);
          await sleep(1_500);
        };
        if (wants('B')) {
          await allow(`${F}/link-above/repo`);
          const b = await verbsIn(cdp, `${F}/link-above/repo`, { tag: 'pb', rename: false, unstage: false });
          parentRecord.arms.B = { outcomes: { put: b.outcomes.put, makeDir: b.outcomes.makeDir, stage: b.outcomes.stage } };
        }
        if (wants('A')) {
          await openRemote(cdp, `${F}/p336-a/repo`);
          parentRecord.arms.A = { outcomes: (await verbsIn(cdp, `${F}/p336-a/repo`, { tag: 'pa' })).outcomes };
        }
        if (wants('H5L') && far.kind === 'loopback') {
          await openRemote(cdp, `${F}/planted`);
          const before = readFileSyncSafe(join(F, 'planted', 'g.txt'));
          const got = await outcome(cdp, `window.gmux.fs.writeGuarded(${J({ root: `${F}/planted`, path: 'g.txt', contents: 'PARENT WROTE\n', expect: sha256(before ?? '') })})`);
          parentRecord.arms.H5L = { outcome: got.word, why: got.value?.why ?? null, fileBefore: before, fileAfter: readFileSyncSafe(join(F, 'planted', 'g.txt')) };
          // Put the planted file back, so HEAD reads the same bytes.
          if (far.kind === 'loopback' && before !== null) writeFileSync(join(F, 'planted', 'g.txt'), before);
        }
        if (wants('H4')) {
          await openRemote(cdp, `${F}/p336-h4/repo`);
          parentRecord.arms.H4 = { outcomes: (await reservedShapes(cdp, `${F}/p336-h4/repo`)).outcomes };
        }
        if (wants('L')) {
          await allow(`${F}/legacy`);
          const l = await verbsIn(cdp, `${F}/legacy`, { tag: 'pl', rename: false, unstage: false });
          const row = await rowOf(cdp);
          parentRecord.arms.L = { outcomes: { put: l.outcomes.put, makeDir: l.outcomes.makeDir, stage: l.outcomes.stage, commit: l.outcomes.commit }, hash: row?.hash ?? null };
        }
        say(`the parent: ${J(parentRecord.arms).slice(0, 900)}`);
      });
    } else {
      // No parent: the legacy root is written into the row by hand, as a
      // machines.json carrying one from an earlier build does.
      writeMachines({ writeRoot: `${F}/legacy` });
    }

    // ======================================================================
    // H5's plant, with the app down: three remote rows into the manifest
    // ======================================================================
    // THE PLANT IS READ BACK, not assumed: sqlite3 exits 0 when INSERT OR
    // IGNORE skipped a row, so the three ids are asked for afterwards, and H5
    // is UNREADABLE (never a FAIL and never a pass) when any is missing: with no
    // parent there is no manifest before HEAD's first launch to plant into.
    const PLANTS = [
      ['p336-planted-home', far.home, 'home'],
      ['p336-planted-plain', `${F}/planted-h5`, 'planted'],
      ['p336-planted-root', '/', 'root']
    ];
    let plant = { landed: false, rows: [], why: 'not asked for' };
    if (wants('H5') && far.home !== null) {
      if (!existsSync(MANIFEST)) plant = { landed: false, rows: [], why: `there is no manifest at ${MANIFEST} before HEAD's launch; a parent launch makes it (P336_PARENT_CHECKOUT)` };
      else {
        const at = Date.now();
        const sql = PLANTS.map(([id, path, name]) => `INSERT OR IGNORE INTO remote_projects (id, machine_id, path, name, added_at) VALUES ('${id}', '${MACHINE_ID}', '${String(path).replace(/'/g, "''")}', '${name}', ${String(at)});`).join('\n');
        const planted = spawnSync('/usr/bin/sqlite3', [MANIFEST], { input: sql, encoding: 'utf8' });
        const back = spawnSync('/usr/bin/sqlite3', [MANIFEST], { input: `SELECT id FROM remote_projects WHERE id IN (${PLANTS.map(([id]) => `'${id}'`).join(', ')}) ORDER BY id;\n`, encoding: 'utf8' });
        const rows = String(back.stdout ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
        const landed = planted.status === 0 && back.status === 0 && PLANTS.every(([id]) => rows.includes(id));
        plant = { landed, rows, why: landed ? null : `sqlite3 exited ${String(planted.status)} and ${String(back.status)}, and read back ${J(rows)}: ${String(planted.stderr ?? '').trim().slice(0, 200)}` };
      }
      if (!plant.landed) say(`the plant did not land: ${plant.why}`);
    }

    // ======================================================================
    // HEAD
    // ======================================================================
    await launch('p336-head', ROOT, async (cdp) => {
      // ---- L: confirmed with no press ----------------------------------------
      // Read BEFORE anything is pressed: the parent confirmed this row, and
      // migration 019 and the new code must not have moved it.
      const rowAtStart = await rowOf(cdp);
      const confirmedWithoutPress = rowAtStart !== null && rowAtStart.state === 'confirmed';
      if (PARENT === '' || !confirmedWithoutPress) {
        // With no parent (or a row the parent left unconfirmed) the row is
        // confirmed the way Settings does it; L's first clause then reads false
        // when a parent was asked for, which is a FAIL rather than a skip.
        await bridge(cdp, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
      } else {
        // Prepared only: no confirm is pressed for a row already confirmed.
        await bridge(cdp, M('prepare', MACHINE_ID));
        await sleep(1_500);
      }
      if (far.kind === 'real') real.adoptAppControl(controlBefore, PROFILE);
      const rowNow = await rowOf(cdp);
      if (rowNow === null || rowNow.usable !== true) throw new Error(`the machine is not usable at HEAD: ${J(rowNow).slice(0, 300)}`);

      if (wants('L')) {
        const l = await verbsIn(cdp, `${F}/legacy`, { tag: 'hl', rename: false, unstage: false });
        headRecord.arms.L = {
          confirmedWithoutPress,
          hash: rowAtStart?.hash ?? null,
          outcomes: { put: l.outcomes.put, makeDir: l.outcomes.makeDir, stage: l.outcomes.stage, commit: l.outcomes.commit },
          payloadSum: l.payloadSum,
          farSum: shaOfFar(`${F}/legacy/p336-hl.md`)
        };
      }
      // ---- A, A2, B: the verbs in projects opened by hand --------------------
      if (wants('A')) {
        const A = `${F}/p336-a/repo`;
        await openRemote(cdp, A);
        const commitsBefore = farCommits(A);
        const a = await verbsIn(cdp, A, { tag: 'ha' });
        headRecord.arms.A = {
          outcomes: a.outcomes,
          payloadSum: a.payloadSum,
          farSum: shaOfFar(`${A}/p336-ha.md`),
          madeOnFar: far.sh(`[ -d '${A}/p336-ha-dir' ] && echo yes`).stdout.trim() === 'yes',
          renamedOnFar: far.sh(`[ -f '${A}/notes-ha.md' ] && [ ! -e '${A}/notes.md' ] && echo yes`).stdout.trim() === 'yes',
          commitsBefore,
          commitsAfter: farCommits(A)
        };
      }
      if (wants('A2')) {
        const B2 = `${F}/p336-b/other`;
        await openRemote(cdp, B2);
        const payload = PAYLOAD('ha2');
        const put = await outcome(cdp, M('putFile', { machineId: MACHINE_ID, path: `${B2}/p336-ha2.md`, contents: payload, expect: 'new' }));
        headRecord.arms.A2 = { put: put.word, payloadSum: sha256(payload), farSum: shaOfFar(`${B2}/p336-ha2.md`) };
      }
      if (wants('B')) {
        const LB = `${F}/link-above/repo`;
        await openRemote(cdp, LB);
        const b = await verbsIn(cdp, LB, { tag: 'hb', rename: false, unstage: false });
        headRecord.arms.B = { outcomes: { put: b.outcomes.put, makeDir: b.outcomes.makeDir, stage: b.outcomes.stage } };
      }
      // ---- H1: swapped for a link --------------------------------------------
      if (wants('H1')) {
        const A = `${F}/p336-h1`;
        far.sh(`mkdir -p '${A}' && cp -R '${F}/p336-a/repo' '${A}/repo'`);
        const P = `${A}/repo`;
        await openRemote(cdp, P);
        const first = await outcome(cdp, M('putFile', { machineId: MACHINE_ID, path: `${P}/before-swap.md`, contents: 'before\n', expect: 'new' }));
        if (first.word !== 'wrote') cannotRead('H1', `the save before the swap answered ${String(first.word)}, so the swap reads nothing`);
        else {
          const victim = () => `${farList(`${F}/victim-dir`)}|${farSum(`${F}/victim-dir/v.txt`)}|${farSum(`${F}/victim-dir/.git/index`)}|${String(farCommits(`${F}/victim-dir`))}`;
          const victimBefore = victim();
          far.sh(`mv '${P}' '${P}.away' && ln -s '${F}/victim-dir' '${P}'`);
          const v = await verbsIn(cdp, P, { tag: 'h1', unstage: false, stagePath: 'dirty.txt' });
          const victimAfter = victim();
          await openRemote(cdp, P);
          const again = await outcome(cdp, M('putFile', { machineId: MACHINE_ID, path: `${P}/reopened.md`, contents: 'reopened\n', expect: 'new' }));
          headRecord.arms.H1 = { outcomes: v.outcomes, victimBefore, victimAfter, reopen: { put: again.word } };
          far.sh(`rm -f '${P}' && mv '${P}.away' '${P}'`);
        }
      }
      // ---- H2: swapped for a new folder --------------------------------------
      if (wants('H2')) {
        const P = `${F}/p336-h2/repo`;
        far.sh(`mkdir -p '${F}/p336-h2' && cp -R '${F}/p336-a/repo' '${P}'`);
        await openRemote(cdp, P);
        const first = await outcome(cdp, M('putFile', { machineId: MACHINE_ID, path: `${P}/before-swap.md`, contents: 'before\n', expect: 'new' }));
        if (first.word !== 'wrote') cannotRead('H2', `the save before the swap answered ${String(first.word)}`);
        else {
          far.sh(`mv '${P}' '${P}.old' && mkdir '${P}'`);
          const oldBefore = farList(`${P}.old`);
          const newBefore = farList(P);
          // The new folder is not a repository, so stage and commit would
          // answer notRepo before the pin; the three path verbs reach it.
          const v = await verbsIn(cdp, P, { tag: 'h2', git: false });
          headRecord.arms.H2 = { outcomes: v.outcomes, oldBefore, oldAfter: farList(`${P}.old`), newBefore, newAfter: farList(P) };
        }
      }
      // ---- H3: links into .ssh and .ßh (loopback only) ------------------------
      if (wants('H3') && far.home !== null) {
        const sshBefore = farList(`${far.home}/.ssh`);
        const outcomes = {};
        for (const [key, link] of [['innocent', `${F}/innocent`], ['inn2', `${F}/inn2`]]) {
          await openRemote(cdp, link);
          outcomes[key] = (await outcome(cdp, M('putFile', { machineId: MACHINE_ID, path: `${link}/p336-h3.txt`, contents: 'H3\n', expect: 'new' }))).word;
        }
        headRecord.arms.H3 = { outcomes, sshBefore, sshAfter: farList(`${far.home}/.ssh`) };
      }
      // ---- H4: reserved names -------------------------------------------------
      if (wants('H4')) {
        const R4 = `${F}/p336-h4/repo`;
        await openRemote(cdp, R4);
        const gitConfigBefore = farSum(`${R4}/.git/config`);
        const hooksBefore = farList(`${R4}/.git/hooks`);
        const sshBefore = farList(`${R4}/.ssh`);
        const folds = far.sh(`[ -d '${R4}/.GIT' ] && echo folds || echo separates`).stdout.trim();
        // SPEC.md §9: whether the far volume folds case is PRINTED before H4 is graded.
        say(`H4: the far volume ${folds === 'folds' ? 'folds case (.GIT is .git there)' : folds === 'separates' ? 'separates case (.GIT is not .git there)' : `could not be read (${J(folds)})`}`);
        const h4 = await reservedShapes(cdp, R4);
        headRecord.arms.H4 = { outcomes: h4.outcomes, gitConfigBefore, gitConfigAfter: farSum(`${R4}/.git/config`), hooksBefore, hooksAfter: farList(`${R4}/.git/hooks`), sshBefore, sshAfter: farList(`${R4}/.ssh`), volume: folds };
      }
      // ---- H5: the planted rows ----------------------------------------------
      if (wants('H5') && far.home !== null && !plant.landed) cannotRead('H5', `nothing was planted, so the three answers would be of rows that are not there: ${String(plant.why)}`);
      else if (wants('H5') && far.home !== null) {
        const put = async (folder, name) => {
          const got = await outcome(cdp, M('putFile', { machineId: MACHINE_ID, path: `${folder === '/' ? '' : folder}/${name}`, contents: 'H5\n', expect: 'new' }));
          return { outcome: got.word, folder: got.value?.writeRoot ?? null };
        };
        const root = await put('/', 'p336-h5.txt');
        const home = await put(far.home, 'p336-h5.txt');
        const planted = await put(`${F}/planted-h5`, 'p336-h5.txt');
        headRecord.arms.H5 = {
          plant,
          root,
          home,
          planted,
          rootWrote: existsSync('/p336-h5.txt'),
          homeWrote: far.sh(`[ -e '${far.home}/p336-h5.txt' ] && echo yes`).stdout.trim() === 'yes'
        };
      }
      // ---- H5L: the local gate ------------------------------------------------
      if (wants('H5L') && far.kind === 'loopback') {
        await openRemote(cdp, `${F}/planted`);
        const before = readFileSyncSafe(join(F, 'planted', 'g.txt'));
        const got = await outcome(cdp, `window.gmux.fs.writeGuarded(${J({ root: `${F}/planted`, path: 'g.txt', contents: 'HEAD WROTE\n', expect: sha256(before ?? '') })})`);
        headRecord.arms.H5L = { outcome: got.word, why: got.value?.why ?? null, fileBefore: before, fileAfter: readFileSyncSafe(join(F, 'planted', 'g.txt')) };
      }
      // ---- H6: a changed machine ----------------------------------------------
      if (wants('H6')) {
        const P = `${F}/p336-b/other`;
        await openRemote(cdp, P);
        const farBefore = farList(P);
        const original = readFileSync(MACHINES_JSON, 'utf8');
        const moved = JSON.parse(original);
        moved.machines[0].port = Number(moved.machines[0].port ?? 22) + 1;
        writeFileSync(MACHINES_JSON, `${J(moved)}\n`, 'utf8');
        await sleep(2_000);
        const verbs = {};
        for (const [name, expr] of [
          ['put', M('putFile', { machineId: MACHINE_ID, path: `${P}/h6.md`, contents: 'H6\n', expect: 'new' })],
          ['makeDir', M('makeDir', { machineId: MACHINE_ID, path: `${P}/h6-dir` })],
          ['rename', M('renameEntry', { machineId: MACHINE_ID, from: `${P}/o.txt`, to: `${P}/o2.txt`, kind: 'file' })],
          ['stage', M('stage', { machineId: MACHINE_ID, cwd: P, paths: ['o.txt'] })],
          ['commit', M('commit', { machineId: MACHINE_ID, cwd: P, headSha: '', staged: ['o.txt'], message: 'h6' })]
        ]) {
          const got = await outcome(cdp, expr);
          verbs[name] = { threw: got.threw, message: got.message };
        }
        const view = await viewOf(cdp);
        const farAfter = farList(P);
        writeFileSync(MACHINES_JSON, original, 'utf8');
        // The row reads confirmed again with no press; the link may have been
        // dropped while it was changed, so it is PREPARED (never confirmed)
        // when it is not usable, and the save is asked again once.
        for (let i = 0; i < 40; i += 1) {
          const r = await rowOf(cdp);
          if (r?.state === 'confirmed') break;
          await sleep(500);
        }
        if ((await rowOf(cdp))?.usable !== true) await bridge(cdp, M('prepare', MACHINE_ID));
        let after = await outcome(cdp, M('putFile', { machineId: MACHINE_ID, path: `${P}/h6-after.md`, contents: 'H6 after\n', expect: 'new' }));
        if (after.word !== 'wrote') {
          await bridge(cdp, M('prepare', MACHINE_ID));
          await sleep(1_500);
          after = await outcome(cdp, M('putFile', { machineId: MACHINE_ID, path: `${P}/h6-after.md`, contents: 'H6 after\n', expect: 'new' }));
        }
        headRecord.arms.H6 = { verbs, farBefore, farAfter, savesInProjects: view?.savesInProjects ?? null, afterUndo: { put: after.word }, confirmPressed: false };
      }
      // ---- H8: the far home rules (loopback only) -----------------------------
      if (wants('H8') && far.home !== null) {
        const put = async (folder) => {
          await openRemote(cdp, folder);
          const got = await outcome(cdp, M('putFile', { machineId: MACHINE_ID, path: `${folder}/p336-h8.txt`, contents: 'H8\n', expect: 'new' }));
          return { outcome: got.word, folder: got.value?.writeRoot ?? null };
        };
        const home = await put(far.home);
        const linkHome = await put(`${F}/dev`);
        const child = await put(`${far.home}/child`);
        const grand = await put(`${far.home}/child/grand`);
        // ~/dev: every verb, then the Explorer header a person reads (his
        // screenshot of 2026-10-05 is these two buttons greyed).
        const devPath = `${far.home}/dev`;
        await openRemote(cdp, devPath);
        const devVerbs = await verbsIn(cdp, devPath, { tag: 'h8' });
        const devExplorer = await showExplorer(cdp);
        const dev = { outcomes: devVerbs.outcomes, explorer: devExplorer, headerButtonsEnabled: devExplorer?.shown === true ? await headerButtons(cdp) : null };
        headRecord.arms.H8 = { home, linkHome, child, grand, dev };
      }
      // ---- R: the renderer ----------------------------------------------------
      if (wants('R')) {
        const r = await rendererArm(cdp, `${F}/p336-r/repo`);
        if (typeof r.unreadable === 'string') cannotRead('R', r.unreadable);
        else headRecord.arms.R = r;
      }
    });

    if (PARENT !== '') report.records.parent = parentRecord;
  } catch (err) {
    say(`FAILED: ${String((err && err.stack) || err)}`);
    unreadable += 1;
  } finally {
    // The far tree and the far home's additions, whatever happened.
    if (!KEEP) {
      try {
        far.sh(`rm -rf '${F}'`);
        if (far.home !== null) far.sh(`rm -rf '${far.home}/.ssh' '${far.home}/child' '${far.home}/p336-h5.txt' '${far.home}/p336-h8.txt'`);
      } catch {
        /* reported below as left */
      }
    }
    // His count after, read while the real row's connection is still open.
    try {
      gmuxAfter = readHisCount();
    } catch (err) {
      gmuxAfter = { count: null, why: String((err && err.message) || err) };
    }
    if (real !== null) real.close();
  }

  // ---- RUN: what was left and what moved ----------------------------------
  const left = spawnSync('/bin/ps', ['-Ao', 'pid=,command='], { encoding: 'utf8' }).stdout.split('\n').filter((l) => l.includes(PROFILE)).length;
  headRecord.run.gmuxBefore = gmuxBefore.count;
  headRecord.run.gmuxWhyBefore = gmuxBefore.why;
  headRecord.run.gmuxAfter = gmuxAfter?.count ?? null;
  headRecord.run.gmuxWhyAfter = gmuxAfter?.why ?? 'never read';
  headRecord.run.dotfilesMoved = far.kind === 'real' ? (real?.dotfiles?.moved ?? [...DOTFILES]) : dotfilesMoved(dotBefore, census());
  headRecord.run.electronsLeft = left;
  headRecord.run.farLeft = KEEP ? false : far.kind === 'real' ? real?.teardown?.removed !== true : existsSync(F);
  report.records.head = headRecord;

  for (const id of Object.keys(GRADERS)) {
    if (id !== 'RUN' && headRecord.arms[id] === undefined) {
      if (wants(id) && !(far.home === null && ['H3', 'H5', 'H8'].includes(id)) && !(far.kind === 'real' && id === 'H5L')) cannotRead(id, 'the arm recorded nothing');
      continue;
    }
    const r = readingOf(id, headRecord, PARENT === '' ? null : parentRecord);
    const g = grade(id, r);
    // HIS RULED ROUND: a count that was refused or failed makes RUN UNREADABLE
    // (exit 2), never a "0" graded against a "0"; RUN's other clauses are still
    // graded, so a dotfile that moved or an Electron left is still a FAIL.
    const countUnread = id === 'RUN' ? runCountUnreadable(headRecord.run) : null;
    if (countUnread !== null) {
      cannotRead('RUN', countUnread);
      const rest = g.failed.filter((name) => name !== RUN_COUNT_CLAUSE);
      if (rest.length > 0) {
        failures += 1;
        report.arms.push({ id, ok: false, failed: rest, title: GRADERS[id].title });
        say(`FAIL ${id}: ${GRADERS[id].title}; FAILED ${J(rest)}`);
      }
      continue;
    }
    report.arms.push({ id, ok: g.ok, failed: g.failed, title: GRADERS[id].title });
    if (!g.ok) failures += 1;
    say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
    if (r.parent) say(`     the parent read ${J(r.parent).slice(0, 400)}`);
  }
  writeFileSync(join(OUT, 'p336-report.json'), `${J(report, null, 2)}\n`, 'utf8');
  if (KEEP) {
    writeFileSync(join(OUT, 'head-record.json'), `${J(headRecord, null, 2)}\n`, 'utf8');
    if (PARENT !== '') writeFileSync(join(OUT, 'parent-record.json'), `${J(parentRecord, null, 2)}\n`, 'utf8');
  }
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
  say(`report: ${join(OUT, 'p336-report.json')}`);
  if (unreadable > 0) {
    say(`UNREADABLE, ${String(unreadable)} arm(s) could not be read, which is never a pass`);
    process.exit(2);
  }
  if (failures > 0) {
    say(`FAIL, ${String(failures)} arm(s)`);
    process.exit(1);
  }
  say('PASS');
  // HIS RULED ROUND: exit HERE. Every cdpEval leaves its own timeout armed
  // (build/cdp-client.mjs's `call` never clears it), and the bridge's are
  // 180 s, so a run that returned instead kept node, the scratch machine and
  // harness-socket.mjs up for three more minutes after its PASS (the reverify:
  // PASS at 46.8 s, exit at 226 s). The FAIL and UNREADABLE paths above
  // already exit; the helpers below are hoisted declarations.
  process.exit(0);

  // -------------------------------------------------------------------------
  // The helpers the arms share, hoisted.
  // -------------------------------------------------------------------------

  function readFileSyncSafe(path) {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      return null;
    }
  }

  /** H4's seven shapes in one project: each outcome word. */
  async function reservedShapes(cdp, repo) {
    const cfg = far.sh(`cat '${repo}/.git/config' 2>/dev/null`).stdout;
    const outcomes = {
      gitConfig: (await outcome(cdp, M('putFile', { machineId: MACHINE_ID, path: `${repo}/.GIT/config`, contents: '[core]\n', expect: sha256(cfg) }))).word,
      hook: (await outcome(cdp, M('putFile', { machineId: MACHINE_ID, path: `${repo}/.Git/hooks/pre-commit`, contents: '#!/bin/sh\n', expect: 'new' }))).word,
      gitDir: (await outcome(cdp, M('makeDir', { machineId: MACHINE_ID, path: `${repo}/.gIT/x` }))).word,
      intoSsh: (await outcome(cdp, M('renameEntry', { machineId: MACHINE_ID, from: `${repo}/README.md`, to: `${repo}/.SSH/README.md`, kind: 'file' }))).word,
      stageCwd: (await outcome(cdp, M('stage', { machineId: MACHINE_ID, cwd: `${repo}/.GIT`, paths: ['config'] }))).word,
      ssfold: (await outcome(cdp, M('putFile', { machineId: MACHINE_ID, path: `${repo}/.ßh/x`, contents: 'x\n', expect: 'new' }))).word,
      longs: (await outcome(cdp, M('makeDir', { machineId: MACHINE_ID, path: `${repo}/.ſsh/x` }))).word
    };
    return { outcomes };
  }

  /**
   * Show the Explorer for the project in front, the way a person does: press
   * its item on the activity rail only when it is not active (pressing the
   * active one hides the sidebar), then wait for the first tree row. Answers
   * `{ shown, rows, why }`. R and, since Phase 336.1, H8 read it.
   */
  async function showExplorer(cdp) {
    const shown = await bridge(
      cdp,
      `(async () => {
        const rail = Array.from(document.querySelectorAll('button.ab-item')).find((b) => (b.getAttribute('title') || '').startsWith('Explorer ('));
        if (rail === undefined) return { shown: false, rows: 0, why: 'no Explorer item on the activity rail' };
        if (rail.className.indexOf('active') === -1) rail.click();
        const until = Date.now() + 60000;
        for (;;) {
          const host = document.querySelector('file-tree-container');
          const rows = host !== null && host.shadowRoot ? host.shadowRoot.querySelectorAll('[role="treeitem"]').length : 0;
          if (rows > 0) return { shown: true, rows, why: null };
          if (Date.now() > until) return { shown: false, rows: 0, why: 'no tree row within 60 s of the Explorer being shown' };
          await new Promise((r) => setTimeout(r, 250));
        }
      })()`
    );
    return shown.ok ? shown.value : { shown: false, rows: 0, why: `the page threw: ${shown.error}` };
  }

  /**
   * Whether the Explorer header's New File and New Folder buttons are both
   * enabled (true), any is greyed (false), or fewer than two were found (null).
   */
  async function headerButtons(cdp) {
    const header = await bridge(cdp, `Array.from(document.querySelectorAll('[data-slot="sidebar"] button')).filter((x) => /new file|new folder/i.test((x.getAttribute('title') || '') + ' ' + (x.getAttribute('aria-label') || ''))).map((x) => x.disabled === true || x.getAttribute('aria-disabled') === 'true')`);
    return header.ok && Array.isArray(header.value) && header.value.length >= 2 ? header.value.every((d) => d === false) : null;
  }

  /**
   * R: the renderer, one project opened by hand, read through the shipped
   * surfaces. A surface the probe could not REACH (the project would not open,
   * the Explorer never listed the file, the editor never drew it) answers
   * `{ unreadable }`, which the caller declares UNREADABLE: it says nothing
   * about the product either way, so it is never a FAIL and never a pass.
   *
   * PROBE REVIEW, Phase 336 (unrun: no Electron is launched in a review). The
   * first version read the editor as `missing` in the integrator's accidental
   * run, and the source says why: a newly opened project draws the sidebar's
   * DEFAULT view, which is Source control (`SIDEBAR_VIEW_DEFAULT`,
   * src/renderer/state/sidebar-views.ts), so `file-tree-container` was never
   * mounted and no row was there to click. This version presses the Explorer
   * item on the activity rail first, only when it is not active (pressing the
   * active one hides the sidebar), and waits for the first row as probe:p242
   * does; finds a row by Pierre's `data-item-path` before its text, because the
   * git lane can append a status letter to an untracked file's row (big.txt);
   * sends its dblclick `composed`, so it crosses the shadow root to the tree's
   * handler; and waits for the file's own text before typing, rather than a
   * fixed sleep that a slow link outlasts.
   *
   * PHASE 336'S FIX ROUND (both verifiers read R UNREADABLE, identically at the
   * parent and at HEAD). A file opened from the Explorer of a repository lands
   * in the review's DIFF mode, and an UNCHANGED committed file there draws "No
   * changes" with no Monaco editor at all, so `drawsText('notes')` waited out
   * its 30 s every time; a `.md` file is not drawn as plain text either. The
   * arm now opens `a.txt` (plain text) and presses the editor's own File radio
   * (`.ed-mode button[role="radio"][aria-label="File"]`, src/renderer/editor/
   * EditorPanel.tsx's ModeToggle) before it waits for text or reads the editor,
   * for `big.txt` too, and records what it pressed. The keystroke clause now
   * also requires the reading to be of File mode, so a diff editor's side can
   * never stand in for the editor a person types into.
   */
  async function rendererArm(cdp, repo) {
    const opened = await openRemote(cdp, repo);
    if (opened === null) return { unreadable: `the project ${repo} did not open (window.__gmuxP95.openRemote answered no ok result six times), so no remote surface was reached` };
    await sleep(1_000);
    const explorer = await showExplorer(cdp);
    if (explorer?.shown !== true) return { unreadable: `the Explorer for ${repo} drew no file row: ${String(explorer?.why)}` };
    // Open a file the way a person does: its row in the Explorer (a shadow root), found by its path.
    const clickRow = async (name) =>
      bridge(
        cdp,
        `(async () => {
          const host = document.querySelector('file-tree-container');
          if (host === null || !host.shadowRoot) return { clicked: false, names: [] };
          const leaf = (n) => (n.getAttribute('data-item-path') || '').replace(/\\/$/, '').split('/').pop();
          const all = () => Array.from(host.shadowRoot.querySelectorAll('[role="treeitem"]'));
          for (let i = 0; i < 120; i += 1) {
            const row = all().find((n) => leaf(n) === ${J(name)} || (n.textContent || '').trim() === ${J(name)});
            if (row) {
              row.click();
              row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
              return { clicked: true, names: [] };
            }
            await new Promise((r) => setTimeout(r, 250));
          }
          return { clicked: false, names: all().slice(0, 30).map((n) => n.getAttribute('data-item-path') || (n.textContent || '').trim()) };
        })()`
      );
    /** True once the editor draws text that begins with `prefix` (the file arrived over the link), within 30 s. */
    const drawsText = async (prefix) =>
      (
        await bridge(
          cdp,
          `(async () => {
            const until = Date.now() + 30000;
            for (;;) {
              const lines = document.querySelector('.monaco-editor .view-lines');
              const text = lines === null ? '' : (lines.innerText || lines.textContent || '');
              if (text.replace(/\\s+/g, '').startsWith(${J(prefix)})) return true;
              if (Date.now() > until) return false;
              await new Promise((r) => setTimeout(r, 250));
            }
          })()`
        )
      ).value === true;
    /**
     * Press the editor's File radio, the way a person leaves the review's Diff
     * mode, when the open tab offers it and it is not already on. Answers what
     * it saw: whether the radio was there, whether it pressed it, and the
     * labels the switch offered. A tab with one view draws no switch, which
     * is `present: false` and not a failure.
     */
    const fileMode = async () => {
      const r = await bridge(
        cdp,
        `(async () => {
          const until = Date.now() + 10000;
          for (;;) {
            const radios = Array.from(document.querySelectorAll('.ed-mode button[role="radio"]'));
            const file = radios.find((b) => b.getAttribute('aria-label') === 'File');
            if (file !== undefined) {
              const was = file.getAttribute('aria-checked') === 'true';
              if (!was) file.click();
              return { present: true, pressed: !was, offered: radios.map((b) => b.getAttribute('aria-label')) };
            }
            if (Date.now() > until) return { present: false, pressed: false, offered: radios.map((b) => b.getAttribute('aria-label')) };
            await new Promise((r) => setTimeout(r, 250));
          }
        })()`
      );
      await sleep(400);
      return r.ok ? r.value : { present: false, pressed: false, offered: [], error: r.error };
    };
    const clicked = await clickRow('a.txt');
    if (!(clicked.ok && clicked.value?.clicked === true)) {
      return { unreadable: `the Explorer for ${repo} never listed a.txt; it listed ${J(clicked.value?.names ?? null)}${clicked.ok ? '' : ` (the page threw: ${clicked.error})`}` };
    }
    const editorMode = await fileMode();
    if (!(await drawsText('a'))) return { unreadable: `the editor never drew a.txt's text within 30 s of its row being opened and File pressed (${J(editorMode)}), so a keystroke would land in nothing that was read` };
    const editor = (await bridge(cdp, 'window.__gmuxP96RemoteSurfaces.readEditor()')).value ?? { missing: true };
    // ⌘S, the way a person saves; then the far bytes, read until they arrive (15 s).
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 4, key: 's', code: 'KeyS', windowsVirtualKeyCode: 83 });
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 4, key: 's', code: 'KeyS', windowsVirtualKeyCode: 83 });
    let farHasTyped = false;
    for (let i = 0; i < 30 && !farHasTyped; i += 1) {
      await sleep(500);
      farHasTyped = farText(`${repo}/a.txt`).startsWith('X');
    }
    const headerButtonsEnabled = await headerButtons(cdp);
    const bigClicked = await clickRow('big.txt');
    // The verifier's own drive waited 2.5 s here: the tab it left still draws
    // its switch, File already on, until the new tab's panel replaces it.
    if (bigClicked.ok && bigClicked.value?.clicked === true) await sleep(2_500);
    const bigMode = bigClicked.ok && bigClicked.value?.clicked === true ? await fileMode() : null;
    const bigDrawn = bigClicked.ok && bigClicked.value?.clicked === true ? await drawsText('xxxxxxxxxx') : false;
    const bigEditor = bigClicked.ok && bigClicked.value?.clicked === true ? ((await bridge(cdp, 'window.__gmuxP96RemoteSurfaces.readEditor()')).value ?? null) : null;
    const chip = await bridge(cdp, `(document.body.innerText || '').split('\\n').find((l) => /\\b90[,.\\u00a0\\u202f' ]?000 bytes/.test(l)) || null`);
    const tabError = await bridge(cdp, `(document.body.innerText || '').split('\\n').find((l) => /too large|could not be read/i.test(l)) || null`);
    const drawn = await bridge(cdp, `(document.body.innerText || '').split('\\n').filter((l) => /Settings|then Machines/.test(l) && /save|writ|commit|stage|folder/i.test(l)).slice(0, 6)`);
    // The BUILT renderer, read from out/: what any window could draw.
    const rendererDir = join(ROOT, 'out', 'renderer');
    const bundleText = (() => {
      let text = '';
      const walk = (dir) => {
        for (const entry of readdirSync(dir)) {
          const path = join(dir, entry);
          if (statSync(path).isDirectory()) walk(path);
          else if (/\.(?:js|mjs|html)$/.test(entry)) text += readFileSync(path, 'utf8');
        }
      };
      try {
        walk(rendererDir);
      } catch {
        return null;
      }
      return text;
    })();
    return {
      explorer,
      file: 'a.txt',
      editorMode,
      bigMode,
      editor,
      save: farHasTyped ? 'wrote' : null,
      farHasTyped,
      headerButtonsEnabled,
      bigFile:
        bigEditor === null
          ? { opened: false, readOnly: null, remote: null, tabId: null, drawn: bigDrawn, listed: bigClicked.value?.names ?? null, chip: chip.value ?? null, error: tabError.value ?? null }
          : {
              opened: bigEditor.missing === false,
              mode: bigEditor.mode ?? null,
              readOnly: bigEditor.readOnly === true && bigEditor.accepted === false,
              remote: bigEditor.remote === true,
              tabId: bigEditor.tabId ?? null,
              drawn: bigDrawn,
              chip: chip.value ?? null,
              error: tabError.value ?? null
            },
      drawnSettings: drawn.ok ? drawn.value : null,
      bundleNamesBrowseWrites: bundleText === null ? null : bundleText.includes('browse-writes'),
      bundleNamesLetTortie: bundleText === null ? null : bundleText.includes('Let Tortie save files here')
    };
  }
}
