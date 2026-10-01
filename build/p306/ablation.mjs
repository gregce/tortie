#!/usr/bin/env node
/**
 * `npm run ablation:p306`. THE ATTACK ON PHASE 306'S OWN CLAUSES
 * (build/p306/SPEC.md §7.3, the Phase 306 entry in docs/BACKLOG.md).
 *
 * Under a minute. It launches no Electron, starts no tmux server, runs no ssh,
 * spawns no agent, makes no request and spends no token. It starts nothing but
 * `cp` and `node` (vitest), each run synchronously, and it reads nothing under
 * the person's home.
 *
 * ## Why it exists
 *
 * Phase 306 keeps a remote project tab a person closed from coming back by
 * itself (GitHub issue 35). The re-home in `src/main/machines/remote-rehome.ts`
 * asks `projectTabClosedFor` before it opens a tab for a folder on a machine,
 * and that reader is a conjunction of the writers' WHERE clause and the
 * stamp's own fields. Every clause of it is a place a later round could widen
 * the gate, which would stop Phase 90.3 ever opening a tab for a folder on a
 * machine (research 54 finding 15), or narrow it, which would bring the defect
 * back. So THIS SCRIPT PROVES THE OWNERSHIP: it breaks one clause at a time in
 * the SHIPPING source and requires the vitest row that owns it to go NEWLY red
 * BY TITLE (the delta rule: red in the arm and not red in the control).
 *
 * ## It never writes into the working tree
 *
 * Builders work in one worktree during a phase, and a harness that writes into
 * `src/` even for the seconds a test takes can lose another builder's edit. So
 * it builds a CLONE, `build/p331/ablation.mjs`'s shape: `cp -Rc` (APFS
 * clonefile) of `src/`, `resources/` and every entry of `build/` but
 * `build/vendor` (symlinked, never copied) under
 * `/private/tmp/p306-ablation-<pid>-…`, `package.json`, `vitest.config.ts` and
 * every tsconfig copied, `node_modules` symlinked, and vitest run there with
 * that directory as its cwd. Each edited clone file is put back and CHECKED BY
 * SHA256 against the worktree's bytes before the next entry; the clone is
 * removed in a `finally` and on SIGINT, SIGTERM and SIGHUP; and the run ends by
 * asserting that the worktree's own bytes never moved.
 *
 * ## The rules each entry is held to
 *
 *   - Each edit's needle matches the shipping source EXACTLY ONCE. Zero means
 *     the clause moved and this entry moves with it in the same commit; two
 *     means an edit could land on the wrong occurrence and prove nothing.
 *   - Every row it names as the OWNER goes newly red. Other rows going red too
 *     is printed, and is not a failure.
 *   - An UNEDITED CONTROL over the four files is green first, and again at the
 *     end, so a restore that did not land is caught.
 *
 * ## The four files it runs, every time
 *
 *   src/main/sessions/__tests__/p903-a-rehome.test.ts     Phase 90.3's own proof
 *   src/main/sessions/__tests__/p306-held-closed.test.ts  the re-home and the create
 *   src/main/manifest/__tests__/p306-tab-closed-reader.test.ts   the reader
 *   src/renderer/state/__tests__/p306-remote-tab-memo.test.ts    the window's memo
 *
 * ## The fix round's entries, A15 to A23
 *
 * Two verifiers measured a create in a closed folder, from a tab on the same
 * machine, leaving the new session in no tab: main opened the folder and the
 * window, which had asked about it once after the close, never asked again.
 * The window's memo now remembers each folder beside whether a session in it
 * carried the closed-tab record, and asks again when that changes (A15 to A18).
 * A create that THREW now opens, and clears the record on, each folder it named
 * (the folder given and the Directory sent) that a person had closed, and only
 * those, so a session started with its answer lost is not held in no tab (A19
 * to A23).
 *
 * Usage:
 *   node build/p306/ablation.mjs
 *   P306_ONLY=A1,A13 node build/p306/ablation.mjs        named entries only
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[ablation:p306]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------------------
// The shipping files each entry breaks, and the files that own each clause
// ---------------------------------------------------------------------------

const READER = 'src/main/manifest/sessions-repository.ts';
const REHOME = 'src/main/machines/remote-rehome.ts';
const SLICE = 'src/renderer/state/sessions-slice.ts';
const CREATE = 'src/main/sessions/create-local.ts';

const P903_TEST = 'src/main/sessions/__tests__/p903-a-rehome.test.ts';
const HELD_TEST = 'src/main/sessions/__tests__/p306-held-closed.test.ts';
const READER_TEST = 'src/main/manifest/__tests__/p306-tab-closed-reader.test.ts';
const MEMO_TEST = 'src/renderer/state/__tests__/p306-remote-tab-memo.test.ts';
const TEST_FILES = [P903_TEST, HELD_TEST, READER_TEST, MEMO_TEST];

/**
 * Every owner by its short name, and the `it` title it stands for (SPEC §7.1
 * and §7.2), with the file that holds it. A title renamed in its file reads
 * here as an owner that stayed green, never as a pass.
 */
const TITLES = {
  R2a: [READER_TEST, 'R2a a stamp naming a machine on a row recorded on this Mac answers for neither'],
  R2b: [READER_TEST, 'R2b a stamp naming this Mac on a row recorded on a machine answers for neither'],
  R3: [READER_TEST, 'R3 a row moved out of a folder holds neither folder'],
  R4: [READER_TEST, "R4 a row moved into a folder carrying another folder's stamp does not hold it"],
  R5: [READER_TEST, "R5 a removed session's stamp holds nothing"],
  R7: [READER_TEST, 'R7 a stamp the codec drops whole holds nothing'],
  R8: [READER_TEST, 'R8 clearing a folder clears what the reader reads'],
  H1: [HELD_TEST, 'H1 a folder whose tab a person closed is not opened again, pass after pass'],
  H2: [HELD_TEST, 'H2 a folder that never had a tab still gets one on the first pass'],
  H3: [HELD_TEST, "H3 a held folder's rows are still moved to it"],
  H4: [HELD_TEST, 'H4 ten sessions in a held folder are one decision'],
  H5: [HELD_TEST, 'H5 the line is written when the count moves and only then'],
  C1: [HELD_TEST, 'C1 a create in a folder whose tab was closed opens it and clears the stamp'],
  C2: [HELD_TEST, 'C2 a create with no folder opens and clears the folder the machine put it in'],
  C3: [HELD_TEST, 'C3 a create placed outside its given folder opens both, once each'],
  C4: [HELD_TEST, 'C4 an upsert that fails still clears, so the next pass opens the folder'],
  C6: [HELD_TEST, 'C6 a create that threw opens the closed folders it named, and only those'],
  C7: [HELD_TEST, "C7 the create's failure path releases the folders it sent before it rethrows"],
  T2: [MEMO_TEST, 'T2 a create that clears the record is asked about once more, and the tab is drawn'],
  T4: [MEMO_TEST, 'T4 a second close and a second create in one run draw the tab again'],
  T6: [MEMO_TEST, 'T6 a record in another folder does not ask about this one']
};

// ---------------------------------------------------------------------------
// The entries, SPEC §7.3's table exactly for A1 to A14, and the fix round's
// A15 to A23 (SPEC "§As built", the fix round). A needle is a string or a
// RegExp; a RegExp is how an edit reads one statement among three that share a
// line (the COALESCE clause is written by the stamp, the clear and the reader).
// ---------------------------------------------------------------------------

/** The reader's own SELECT, up to and including a clause, inside its template literal. */
const inReader = (clause) => new RegExp(`(SELECT project_tombstone FROM sessions[^\`]*?)${clause}`);
/** The re-home's question, however its arguments are wrapped. */
const ASK = /if \(\s*store\.projectTabClosedFor\(\s*\{\s*path: folder\.path,\s*machineId: folder\.machineId\s*\}\s*\)\s*\)/;
/** The question and its branch, removed whole. */
const ASK_BRANCH = new RegExp(`${ASK.source}\\s*\\{\\s*tabsHeldClosed \\+= 1;\\s*continue;\\s*\\}`);
/** The first loop's last statement before the move, where a hold placed too early would sit. */
const BEFORE_MOVE = /(\n(\s*)if \(record\.projectPath === home\) continue;\n)/;
/** The first loop's first skip, before any record is read. */
const FIRST_LOOP = /(\n(\s*)if \(home === row\.recorded\) continue;\n)/;
/** The window's memo: asked again only when a folder's closed-tab answer changed. */
const MEMO_ASK = 'if (tabsAskedFor.get(key) === closed) continue;\n    tabsAskedFor.set(key, closed);';

export const ENTRIES = [
  { n: 'A1', name: "M1: the reader's `project_path = ?` dropped (the stamp-only form)", owners: ['R3', 'R8'],
    edits: [{ file: READER, find: inReader('WHERE project_path = \\?'), to: '$1WHERE ? IS NOT NULL' }] },
  { n: 'A2', name: "M1: the stamp's own `tab.path === target.path` dropped", owners: ['R4'],
    edits: [{ file: READER, find: 'tab.path === target.path && ', to: '' }] },
  { n: 'A3', name: "M1: the reader's `COALESCE(...) = ?` row-machine clause dropped", owners: ['R2a'],
    edits: [{ file: READER, find: inReader("COALESCE\\(NULLIF\\(machine_id, ''\\), '\\$\\{LOCAL_MACHINE_ROW\\}'\\) = \\?"), to: '$1? IS NOT NULL' }] },
  { n: 'A4', name: "M1: the stamp's own machineId comparison dropped", owners: ['R2b'],
    edits: [{ file: READER, find: ' && (tab.machineId ?? LOCAL_MACHINE_ROW) === machine', to: '' }] },
  { n: 'A5', name: "M1: the reader's `status <> 'discarded'` dropped", owners: ['R5'],
    edits: [{ file: READER, find: inReader("\\s+AND status <> 'discarded'"), to: '$1' }] },
  { n: 'A6', name: 'M1: parseClosedProjectTab replaced with a bare JSON.parse', owners: ['R7'],
    edits: [{ file: READER, find: 'const tab = parseClosedProjectTab(row.project_tombstone);', to: 'const tab = JSON.parse(row.project_tombstone);' }] },
  { n: 'A7', name: 'M2: the projectTabClosedFor branch removed (always upsert)', owners: ['H1'],
    edits: [{ file: REHOME, find: ASK_BRANCH, to: '' }] },
  { n: 'A8', name: 'M2: every absent folder held', owners: ['H2'],
    edits: [{ file: REHOME, find: ASK, to: 'if (true)' }] },
  { n: 'A9', name: 'the hold moved into the first loop, before updateSession', owners: ['H3'],
    edits: [
      { file: REHOME, find: ASK_BRANCH, to: '' },
      { file: REHOME, find: BEFORE_MOVE, to: '$1$2if (store.projectTabClosedFor({ path: home, machineId: row.machineId })) {\n$2  tabsHeldClosed += 1;\n$2  continue;\n$2}\n' }
    ] },
  { n: 'A10', name: 'M2: counted per session instead of per folder (incremented in the first loop)', owners: ['H4'],
    edits: [
      { file: REHOME, find: /tabsHeldClosed \+= 1;(\s*)continue;/, to: 'continue;' },
      { file: REHOME, find: FIRST_LOOP, to: '\n$2if (store.projectTabClosedFor({ path: home, machineId: row.machineId })) tabsHeldClosed += 1;$1' }
    ] },
  { n: 'A11', name: 'M3: the line written on every pass (the moved test dropped)', owners: ['H5'],
    edits: [{ file: REHOME, find: 'if (tabsHeldClosed !== before) {', to: 'if (before === before) {' }] },
  { n: 'A12', name: "M5: the create's clear dropped", owners: ['C1'],
    edits: [{ file: REHOME, find: 'manifest.clearProjectTabClosed({ path, machineId });', to: 'void 0;' }] },
  { n: 'A13', name: 'M5: the placed folder dropped (the given folder only)', owners: ['C2', 'C3'],
    edits: [{ file: REHOME, find: /\[given, remoteProjectPathFor\(created\.projectPath, created\.cwd\)\]/, to: '[given]' }] },
  { n: 'A14', name: "M5: the clear only when the upsert succeeded (moved into the upsert's try)", owners: ['C4'],
    edits: [{ file: REHOME, find: /(manifest\.upsertRemoteProject\(\{[^}]*\}\);)([\s\S]*?)manifest\.clearProjectTabClosed\(\{ path, machineId \}\);/, to: '$1\n      manifest.clearProjectTabClosed({ path, machineId });$2void 0;' }] },
  { n: 'A15', name: "the fix round: the window's memo keyed by folder alone (the shape Phase 306's build round shipped)", owners: ['T2'],
    edits: [{ file: SLICE, find: MEMO_ASK, to: 'if (tabsAskedFor.has(key)) continue;\n    tabsAskedFor.set(key, closed);' }] },
  { n: 'A16', name: "the fix round: the memo as a set of (folder, answer) pairs, never asked again on a second cycle", owners: ['T4'],
    edits: [{ file: SLICE, find: MEMO_ASK, to: 'if (tabsAskedFor.get(`${key}|${String(closed)}`) === true) continue;\n    tabsAskedFor.set(`${key}|${String(closed)}`, true);' }] },
  { n: 'A17', name: 'the fix round: the closed-tab answer read from no session (always open)', owners: ['T2'],
    edits: [{ file: SLICE, find: 'if (session.closedProject === undefined) continue;', to: 'continue;' }] },
  { n: 'A18', name: "the fix round: the closed-tab answer read across every folder, not this one's", owners: ['T6'],
    edits: [{ file: SLICE, find: 'const closed = closedIn.has(key);', to: 'const closed = closedIn.size > 0;' }] },
  { n: 'A19', name: "the fix round: the failed create's release dropped from the create", owners: ['C7'],
    edits: [{ file: CREATE, find: "releaseFoldersAfterFailedRemoteCreate(deps.manifest, machineId, farProjectPath, folders.cwd ?? '');", to: 'void 0;' }] },
  { n: 'A20', name: "the fix round: the release's clear dropped", owners: ['C6'],
    edits: [{ file: REHOME, find: 'manifest.clearProjectTabClosed({ path: folder, machineId });', to: 'void 0;' }] },
  { n: 'A21', name: 'the fix round: the release names the given folder only, not the Directory it sent', owners: ['C6'],
    edits: [{ file: REHOME, find: 'for (const folder of [given, remoteProjectPathFor(given, sentCwd)]) {', to: 'for (const folder of [given]) {' }] },
  { n: 'A22', name: 'the fix round: the release opens every folder it named, held or not', owners: ['C6'],
    edits: [{ file: REHOME, find: 'if (!held) continue;', to: 'void held;' }] },
  { n: 'A23', name: "the fix round: the release only clears and does not open (the window's race)", owners: ['C6'],
    edits: [{ file: REHOME, find: 'manifest.upsertRemoteProject({ machineId, path: folder, name: projectNameForPath(folder) });', to: 'void 0;' }] }
];

/** How many times a needle matches a text. A RegExp is counted globally. */
export function count(text, needle) {
  if (needle instanceof RegExp) {
    const flags = needle.flags.includes('g') ? needle.flags : `${needle.flags}g`;
    return [...text.matchAll(new RegExp(needle.source, flags))].length;
  }
  if (typeof needle !== 'string' || needle === '') return 0;
  return text.split(needle).length - 1;
}

/** Apply one edit whose needle matched exactly once. `$1` and `$2` are a RegExp's groups. */
export function applyEdit(text, edit) {
  if (edit.find instanceof RegExp) return text.replace(edit.find, edit.to);
  return text.replace(edit.find, () => edit.to);
}

/**
 * Run only when this file is the program, so a reader can import ENTRIES and
 * the two helpers without starting anything. Both sides are realpath'd,
 * because `/tmp` is a link to `/private/tmp` and a cwd under either spelling
 * would otherwise read as another file and run nothing, in silence.
 */
const isMain = (() => {
  try {
    return process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (isMain) run();

function run() {
  // -------------------------------------------------------------------------
  // The clone, and vitest inside it
  // -------------------------------------------------------------------------
  const scratch = mkdtempSync(join('/private/tmp', `p306-ablation-${String(process.pid)}-`));

  const cloneOne = (rel) => {
    const r = spawnSync('cp', ['-Rc', join(REPO, rel), join(scratch, rel)], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`cp -Rc ${rel} failed: ${r.stderr}`);
  };

  const buildClone = () => {
    cloneOne('src');
    if (existsSync(join(REPO, 'resources'))) cloneOne('resources');
    mkdirSync(join(scratch, 'build'), { recursive: true });
    for (const name of readdirSync(join(REPO, 'build'))) {
      if (name === 'vendor') continue;
      cloneOne(join('build', name));
    }
    // The vendored binaries are large and nothing here writes them: linked, never copied.
    if (existsSync(join(REPO, 'build', 'vendor'))) symlinkSync(join(REPO, 'build', 'vendor'), join(scratch, 'build', 'vendor'));
    const configs = [
      'package.json',
      'vitest.config.ts',
      '.nvmrc',
      ...readdirSync(REPO).filter((f) => /^tsconfig(\.[a-z]+)?\.json$/.test(f))
    ];
    for (const name of configs) {
      if (existsSync(join(REPO, name))) writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
    }
    symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
  };

  /** Run the four files in the clone, synchronously, and answer every failed row by file and title. */
  const runTests = () => {
    const out = join(scratch, `vitest-${String(Date.now())}.json`);
    const r = spawnSync(
      process.execPath,
      [join('node_modules', 'vitest', 'vitest.mjs'), 'run', '--no-cache', '--reporter=json', `--outputFile=${out}`, ...TEST_FILES],
      { cwd: scratch, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300_000 }
    );
    let report = null;
    try {
      report = JSON.parse(readFileSync(out, 'utf8'));
    } catch {
      report = null;
    }
    rmSync(out, { force: true });
    if (report === null) {
      return { red: null, ran: 0, tail: `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-12).join('\n') };
    }
    const red = new Set();
    let ran = 0;
    for (const file of report.testResults ?? []) {
      const rel = TEST_FILES.find((f) => String(file.name ?? '').endsWith(`/${f}`)) ?? String(file.name);
      for (const a of file.assertionResults ?? []) {
        ran += 1;
        if (a.status === 'failed') red.add(`${rel}::${a.title}`);
      }
      // A file that failed to load has no rows; name it so it is not read as green.
      if ((file.assertionResults ?? []).length === 0 && file.status === 'failed') red.add(`${rel}::(did not load)`);
    }
    return { red, ran, tail: '' };
  };

  const key = (owner) => {
    const [file, title] = TITLES[owner] ?? [null, null];
    return file === null ? null : `${file}::${title}`;
  };

  /** Put one clone file back and prove it by sha256 against the worktree. */
  const restore = (rel) => {
    const want = readFileSync(join(REPO, rel));
    writeFileSync(join(scratch, rel), want);
    const got = readFileSync(join(scratch, rel));
    if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
  };

  let cleaned = false;
  const clean = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      rmSync(scratch, { recursive: true, force: true });
    } catch {
      /* under /private/tmp; not fatal */
    }
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(sig, () => {
      clean();
      process.exit(130);
    });
  }

  const problems = [];
  const table = [];
  const started = Date.now();
  let ran = 0;
  let owned = 0;

  const WATCHED = [READER, REHOME, SLICE, CREATE, 'src/main/manifest/store.ts', 'src/main/manifest/codecs.ts', ...TEST_FILES];
  const before = new Map(WATCHED.filter((f) => existsSync(join(REPO, f))).map((f) => [f, sha(readFileSync(join(REPO, f)))]));

  try {
    for (const f of TEST_FILES) {
      if (!existsSync(join(REPO, f))) problems.push(`the owning test file ${f} is not in the tree, so its rows cannot own anything`);
    }
    if (problems.length > 0) throw new Error('control red');
    // Every title is written in its file, or it cannot be an owner.
    for (const [short, [file, title]] of Object.entries(TITLES)) {
      if (count(readFileSync(join(REPO, file), 'utf8'), title) === 0) problems.push(`${short}'s title is not written in ${file}: ${title}`);
    }

    const only = (process.env['P306_ONLY'] ?? '').split(',').map((s) => s.trim().toUpperCase()).filter((s) => s !== '');
    for (const name of only) {
      if (!ENTRIES.some((e) => e.n === name)) problems.push(`P306_ONLY names ${JSON.stringify(name)}, which is no entry; the entries are ${ENTRIES.map((e) => e.n).join(', ')}`);
    }
    if (problems.length > 0) throw new Error('control red');

    buildClone();
    say(`clone at ${scratch}, node_modules and build/vendor symlinked, nothing under a home touched`);

    // CTRL: every row green, over the unedited clone.
    const control = runTests();
    if (control.red === null || control.red.size > 0 || control.ran === 0) {
      problems.push(
        `the UNEDITED control is not green (vitest ${control.red === null ? 'produced no report' : `${String(control.red.size)} red of ${String(control.ran)}`}), ` +
          `so every entry below would mean nothing. ${[...(control.red ?? [])].slice(0, 5).join(' | ')}${control.tail}`
      );
      throw new Error('control red');
    }
    table.push(['CTRL', 'green', `${String(control.ran)} vitest rows over the four files, unedited`]);
    say(`control: ${String(control.ran)} rows green over the four files`);

    for (const entry of ENTRIES) {
      if (only.length > 0 && !only.includes(entry.n)) continue;
      // Every edit's needle against the SHIPPING source, exactly once, then
      // applied in order to the clone's copy.
      const files = [...new Set(entry.edits.map((e) => e.file))];
      const texts = new Map(files.map((f) => [f, readFileSync(join(REPO, f), 'utf8')]));
      let needleBad = null;
      for (const edit of entry.edits) {
        const text = texts.get(edit.file);
        const hits = count(text, edit.find);
        if (hits !== 1) {
          needleBad = `its needle ${String(edit.find).slice(0, 80)} matches ${String(hits)} times in ${edit.file}, not exactly once. A clause that moved moves its entry in the same commit.`;
          break;
        }
        texts.set(edit.file, applyEdit(text, edit));
      }
      if (needleBad !== null) {
        problems.push(`${entry.n} "${entry.name}": ${needleBad}`);
        table.push([entry.n, 'NEEDLE', entry.name]);
        continue;
      }
      for (const [f, text] of texts) writeFileSync(join(scratch, f), text, 'utf8');
      ran += 1;
      let tests;
      try {
        tests = runTests();
      } finally {
        for (const f of files) restore(f);
      }
      if (tests.red === null) {
        problems.push(`${entry.n} "${entry.name}": vitest produced no report. ${tests.tail}`);
        table.push([entry.n, 'NO REPORT', entry.name]);
        continue;
      }
      // THE DELTA RULE: an owner counts only when it is red here and was not
      // red in the control.
      const newly = new Set([...tests.red].filter((k) => !control.red.has(k)));
      const missing = entry.owners.filter((o) => !newly.has(key(o)));
      const ownerKeys = entry.owners.map(key);
      const others = [...newly].filter((k) => !ownerKeys.includes(k));
      if (missing.length > 0) {
        problems.push(
          `${entry.n} "${entry.name}": its owner stayed GREEN: ${missing.map((o) => `${o} "${TITLES[o]?.[1] ?? '?'}"`).join(' | ')}. ` +
            (others.length > 0 ? `Red instead: ${others.slice(0, 4).join(' | ')}` : 'Nothing went red, so the clause is decoration.')
        );
        table.push([entry.n, others.length > 0 ? 'RED ELSEWHERE' : 'NOTHING MOVED', entry.name]);
      } else {
        owned += 1;
        table.push([entry.n, 'owner red', `${entry.name} (${entry.owners.join(', ')})${others.length > 0 ? ` and ${String(others.length)} other row${others.length === 1 ? '' : 's'}` : ''}`]);
      }
      say(`${entry.n.padEnd(4)} ${missing.length === 0 ? 'ok  ' : 'FAIL'} ${entry.name}: ${String(newly.size)} newly red of ${String(tests.ran)}`);
    }

    const after = runTests();
    if (after.red === null || after.red.size > 0) {
      problems.push('after every file was restored the control is not green again, so a restore did not land');
    } else {
      say(`restored: every edited clone file matched the worktree by sha256, and the control is green again (${String(after.ran)} rows)`);
    }
  } catch (err) {
    if (!(err instanceof Error && err.message === 'control red')) {
      problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  } finally {
    clean();
  }

  for (const [file, was] of before) {
    const now = sha(readFileSync(join(REPO, file)));
    if (now !== was) {
      problems.push(`${file} in the WORKTREE changed during the run (${was.slice(0, 12)} to ${now.slice(0, 12)}); this harness writes only its clone`);
    }
  }

  process.stdout.write('\n');
  for (const [n, verdict, name] of table) process.stdout.write(`${TAG}   ${n.padEnd(4)} ${verdict.padEnd(14)} ${name}\n`);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (problems.length > 0) {
    process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
    for (const p of problems) process.stdout.write(`  - ${p}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `\n${TAG} PASS in ${seconds} s. ${String(ran)} entries, one clause each, and every one turned THE ROW THAT OWNS IT ` +
      `newly red by title (${String(owned)} of ${String(ran)}), with the unedited control green first and last. Every clone ` +
      'file was restored and proved by sha256, the worktree was never written, and the clone is gone. No Electron, no ' +
      'tmux, no ssh, no agent, no token.\n'
  );
  process.exit(0);
}
