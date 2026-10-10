#!/usr/bin/env node
/**
 * `npm run ablation:p344`. THE ATTACK ON PHASE 344'S OWN CLAUSES
 * (build/p344/SPEC.md §7.4, the Phase 344 entry in docs/BACKLOG.md).
 *
 * About a minute. It launches no Electron, starts no tmux server, runs no ssh,
 * spawns no agent, makes no request and spends no token. It starts nothing but
 * `cp` and `node` (vitest), each run synchronously, and it reads nothing under
 * the person's home.
 *
 * ## Why it exists
 *
 * Phase 344 keeps a remote project tab a person closed from coming back by
 * itself whoever started the sessions in it (his report of 9 October 2026,
 * closing Phase 306's stated limit). A close of a folder on another machine is
 * now recorded for the folder itself, in `closed_remote_folders` (migration
 * 020), written by `markProjectTabClosed` in the same durable transaction as
 * the stamps, cleared by `clearProjectTabClosed` beside them, and read by
 * `projectTabClosedFor` before the stamps; `listSessions` carries that record
 * on the sessions this Mac did not start, and `removeProject` pushes the list
 * after any close of a tab on a machine. Every one of those clauses is a place
 * a later round could narrow the hold, which brings the defect back, or widen
 * it, which holds folders nobody closed (research 54 finding 15). So THIS
 * SCRIPT PROVES THE OWNERSHIP: it breaks one clause at a time in the SHIPPING
 * source and requires the vitest row that owns it to go NEWLY red BY TITLE
 * (the delta rule: red in the arm and not red in the control).
 *
 * ## It never writes into the working tree
 *
 * `build/p306/ablation.mjs`'s shape, whole: a CLONE, `cp -Rc` (APFS clonefile)
 * of `src/`, `resources/` and every entry of `build/` but `build/vendor`
 * (symlinked, never copied) under `/private/tmp/p344-ablation-<pid>-…`,
 * `package.json`, `vitest.config.ts` and every tsconfig copied,
 * `node_modules` symlinked, and vitest run there with that directory as its
 * cwd. Each edited clone file is put back and CHECKED BY SHA256 against the
 * worktree's bytes before the next entry; the clone is removed in a `finally`
 * and on SIGINT, SIGTERM and SIGHUP; and the run ends by asserting that the
 * worktree's own bytes never moved.
 *
 * ## The rules each entry is held to
 *
 *   - Each edit's needle matches the shipping source EXACTLY ONCE (the
 *     spellings fixed in build/p344/SPEC.md §4.1). Zero means the clause moved
 *     and this entry moves with it in the same commit; two means an edit could
 *     land on the wrong occurrence and prove nothing.
 *   - Every row it names as the OWNER goes newly red. Other rows going red too
 *     is printed, and is not a failure.
 *   - An UNEDITED CONTROL over the five files is green first, and again at the
 *     end, so a restore that did not land is caught.
 *
 * ## The five files it runs, every time
 *
 *   src/main/manifest/__tests__/p344-closed-remote-folders.test.ts   the table, the write, the clear, the read
 *   src/main/sessions/__tests__/p344-held-whoever-started.test.ts    the re-home and the pure carry rule
 *   src/main/sessions/__tests__/p344-core-closed-folders.test.ts     the borrowed core bodies
 *   src/main/manifest/__tests__/p306-tab-closed-reader.test.ts       Phase 306's reader (the stamp half)
 *   src/main/sessions/__tests__/p306-held-closed.test.ts             Phase 306's re-home and create
 *
 * Usage:
 *   node build/p344/ablation.mjs
 *   P344_ONLY=X1,X13 node build/p344/ablation.mjs        named entries only
 *   node build/p344/ablation.mjs --list                  print the entries, run nothing
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
const TAG = '[ablation:p344]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------------------
// The shipping files each entry breaks, and the files that own each clause
// ---------------------------------------------------------------------------

const FOLDERS = 'src/main/manifest/closed-remote-folders.ts';
const REPOSITORY = 'src/main/manifest/sessions-repository.ts';
const REHOME = 'src/main/machines/remote-rehome.ts';
const CORE = 'src/main/sessions/core.ts';

const TABLE_TEST = 'src/main/manifest/__tests__/p344-closed-remote-folders.test.ts';
const HELD_TEST = 'src/main/sessions/__tests__/p344-held-whoever-started.test.ts';
const CORE_TEST = 'src/main/sessions/__tests__/p344-core-closed-folders.test.ts';
const P306_READER_TEST = 'src/main/manifest/__tests__/p306-tab-closed-reader.test.ts';
const P306_HELD_TEST = 'src/main/sessions/__tests__/p306-held-closed.test.ts';
const TEST_FILES = [TABLE_TEST, HELD_TEST, CORE_TEST, P306_READER_TEST, P306_HELD_TEST];

/**
 * Every owner by its short name, and the `it` title it stands for (SPEC §7.1
 * to §7.3), with the file that holds it. A title renamed in its file reads
 * here as an owner that stayed green, never as a pass.
 */
const TITLES = {
  K1: [TABLE_TEST, 'K1 a close of a folder on a machine with no recorded session holds it'],
  K3: [TABLE_TEST, 'K3 a local close writes no folder record'],
  K4: [TABLE_TEST, 'K4 a close whose record would not name the folder it closes writes no folder record'],
  K5: [TABLE_TEST, 'K5 the folder record and the stamps are one durable transaction'],
  K6: [TABLE_TEST, 'K6 opening the folder again clears the record and the stamps, and the clear is not durable'],
  K7: [TABLE_TEST, 'K7 the same path on two machines is two records'],
  K8: [TABLE_TEST, 'K8 a planted row that is not in the one shape reads as no record'],
  K9: [TABLE_TEST, 'K9 a closed folder holds its exact folder and no folder under it'],
  K10: [TABLE_TEST, 'K10 a removed machine keeps its folder records'],
  B1: [HELD_TEST, 'B1 a folder whose only session this Mac holds no row for stays closed, pass after pass'],
  B3: [HELD_TEST, 'B3 a subfolder with its own project opens its own tab, and a session under the closed folder is held with it'],
  B7: [HELD_TEST, 'B7 a machine removed and added again under the same id keeps the folder closed'],
  P2: [HELD_TEST, "P2 a session's own stamp wins over its folder's record"],
  P3: [HELD_TEST, 'P3 a session on this Mac, and one in a folder with no record, carry nothing'],
  C1: [CORE_TEST, 'C1 closing a tab on a machine with no recorded session records the folder and pushes the list once'],
  C2: [CORE_TEST, 'C2 the list a window reads carries the record on a session this Mac did not start'],
  C3: [CORE_TEST, "C3 the list keeps a session's own stamp over its folder's record"],
  C4: [CORE_TEST, 'C4 opening the folder on that machine again clears the record and the list carries none']
};

// ---------------------------------------------------------------------------
// The entries, SPEC §7.4's table exactly, with the spellings of §4.1. A needle
// is a string or a RegExp; a RegExp is how an edit moves a block or reads one
// call whose arguments span lines.
// ---------------------------------------------------------------------------

/** The folder record's one read, inside its string literal (§4.1). */
const READ_SQL = "'SELECT project_name, closed_at FROM closed_remote_folders WHERE machine_id = ? AND path = ?'";
/** The mark's agreement test, whole (§4.1). */
const AGREEMENT =
  'if (machine !== LOCAL_MACHINE_ROW && kept !== undefined && kept.path === target.path && kept.machineId === machine) {';
/** The mark's write block, from the codec's answer to the end of its `if`, then the callback's close. */
const WRITE_BLOCK = /\n([ \t]*const kept = parseClosedProjectTab\(JSON\.stringify\(tab\)\);\n[\s\S]*?\n[ \t]*\}\);\n[ \t]*\}\n)([ \t]*\}\);\n)/;
/** The clear's one ordinary transaction, from its opening to its trailing call. */
const CLEAR_TRANSACTION = /this\.db\.transaction\(([\s\S]*?this\.closedFolders\.forgetClosedRemoteFolder\(machine, target\.path\);\n[ \t]*\}\))\(\);/;
/** `withClosedFolderRecords`' first three lines (§4.1). */
const CARRY_HEAD =
  'const machineId = session.machine?.id;\n    if (machineId === undefined) return session;\n    if (session.closedProject !== undefined) return session;';
/** `markMachinesForgotten`'s callback opening (§4.1): the pair, because the first line alone appears six times. */
const FORGET_OPEN = 'durableTransaction(this.db, () => {\n      written = 0;';

export const ENTRIES = [
  { n: 'X1', name: 'D4: the folder write removed from markProjectTabClosed', owners: ['K1', 'B1', 'C1'],
    edits: [{ file: REPOSITORY, find: 'this.closedFolders.recordClosedRemoteFolder(', to: 'void (' }] },
  { n: 'X2', name: 'D4: the agreement dropped (the row written from the target alone)', owners: ['K4'],
    edits: [{ file: REPOSITORY, find: 'kept.path === target.path && kept.machineId === machine', to: 'true' }] },
  { n: 'X3', name: 'D3: the remote-only clause dropped (a local close writes a row)', owners: ['K3'],
    edits: [{ file: REPOSITORY, find: 'machine !== LOCAL_MACHINE_ROW && ', to: '' }] },
  { n: 'X4', name: 'D4: the folder write moved after the durable transaction', owners: ['K5'],
    edits: [{ file: REPOSITORY, find: WRITE_BLOCK, to: '\n$2$1' }] },
  { n: 'X5', name: 'D5: the folder delete removed from clearProjectTabClosed', owners: ['K6', 'C4'],
    edits: [{ file: REPOSITORY, find: 'this.closedFolders.forgetClosedRemoteFolder(machine, target.path);', to: 'void 0;' }] },
  { n: 'X6', name: 'D6: the folder half removed from projectTabClosedFor', owners: ['K1', 'B1'],
    edits: [{ file: REPOSITORY, find: 'if (this.closedFolders.closedRemoteFolder(machine, target.path) !== undefined) return true;', to: '' }] },
  { n: 'X7', name: 'D1/D10: the read keyed on the path alone (`machine_id = ?` dropped)', owners: ['K7'],
    edits: [{ file: FOLDERS, find: READ_SQL, to: READ_SQL.replace('machine_id = ? AND ', '? IS NOT NULL AND ') }] },
  { n: 'X8', name: 'D10: the shape check removed (any row holds)', owners: ['K8'],
    edits: [
      { file: FOLDERS, find: "if (typeof row.project_name !== 'string' || row.project_name.length === 0) return undefined;", to: '' },
      { file: FOLDERS, find: "if (typeof row.closed_at !== 'number' || !Number.isFinite(row.closed_at)) return undefined;", to: '' }
    ] },
  { n: 'X9', name: 'D8: a prefix match (the folder record holds every folder under it)', owners: ['K9', 'B3'],
    edits: [{ file: FOLDERS, find: READ_SQL, to: READ_SQL.replace("AND path = ?'", "AND ? LIKE path || \\'%\\''") }] },
  { n: 'X10', name: "D7: a DELETE FROM closed_remote_folders planted in markMachinesForgotten's transaction", owners: ['K10', 'B7'],
    edits: [{ file: REPOSITORY, find: FORGET_OPEN,
      to: `${FORGET_OPEN}\n      this.db.prepare('DELETE FROM closed_remote_folders WHERE machine_id = ?').run(entries[0]?.tombstone.machineId);` }] },
  { n: 'X11', name: 'D9: the withClosedFolderRecords call removed from listSessions', owners: ['C2'],
    edits: [{ file: CORE,
      find: 'return stampRecordLocations(withClosedFolderRecords(out, (m, p) => this.manifest.closedRemoteFolder(m, p)));',
      to: 'return stampRecordLocations(out);' }] },
  { n: 'X12', name: 'D9: the record wins over an own stamp', owners: ['P2', 'C3'],
    edits: [{ file: REHOME, find: CARRY_HEAD, to: CARRY_HEAD.replace('\n    if (session.closedProject !== undefined) return session;', '') }] },
  { n: 'X13', name: 'D12: removeProject pushes only when it stamped', owners: ['C1'],
    edits: [{ file: CORE, find: 'if (stampedCount > 0 || closedOnMachine) this.broadcastSessions();', to: 'if (stampedCount > 0) this.broadcastSessions();' }] },
  { n: 'X14', name: 'D9: the record carried onto a session on this Mac', owners: ['P3'],
    edits: [{ file: REHOME, find: CARRY_HEAD, to: CARRY_HEAD.replace('session.machine?.id;', "session.machine?.id ?? 'local';") }] },
  { n: 'X15', name: 'D5: the clear made durable (the stamp UPDATE and the delete under durableTransaction)', owners: ['K6'],
    edits: [{ file: REPOSITORY, find: CLEAR_TRANSACTION, to: 'durableTransaction(this.db, $1;' }] },
  { n: 'X16', name: "D4: the folder written only when a session row was stamped (Phase 306's limit in another spelling)", owners: ['K1', 'B1', 'C1'],
    edits: [{ file: REPOSITORY, find: AGREEMENT, to: AGREEMENT.replace('kept !== undefined && ', 'kept !== undefined && changed > 0 && ') }] }
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
if (isMain) {
  if (process.argv.includes('--list')) {
    for (const entry of ENTRIES) process.stdout.write(`${TAG} ${entry.n.padEnd(4)} ${entry.name} (owners ${entry.owners.join(', ')})\n`);
    process.stdout.write(`${TAG} ${String(ENTRIES.length)} entries over ${String(TEST_FILES.length)} files; nothing was run\n`);
    process.exit(0);
  }
  run();
}

function run() {
  // -------------------------------------------------------------------------
  // The clone, and vitest inside it
  // -------------------------------------------------------------------------
  const scratch = mkdtempSync(join('/private/tmp', `p344-ablation-${String(process.pid)}-`));

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

  /** Run the five files in the clone, synchronously, and answer every failed row by file and title. */
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

  const WATCHED = [
    FOLDERS,
    REPOSITORY,
    REHOME,
    CORE,
    'src/main/manifest/store.ts',
    'src/main/manifest/schema.ts',
    'src/main/manifest/codecs.ts',
    ...TEST_FILES
  ];
  const before = new Map(WATCHED.filter((f) => existsSync(join(REPO, f))).map((f) => [f, sha(readFileSync(join(REPO, f)))]));

  try {
    for (const f of [...TEST_FILES, FOLDERS, REPOSITORY, REHOME, CORE]) {
      if (!existsSync(join(REPO, f))) problems.push(`${f} is not in the tree, so the entries that name it cannot run`);
    }
    if (problems.length > 0) throw new Error('control red');
    // Every title is written in its file, or it cannot be an owner.
    for (const [short, [file, title]] of Object.entries(TITLES)) {
      if (count(readFileSync(join(REPO, file), 'utf8'), title) === 0) problems.push(`${short}'s title is not written in ${file}: ${title}`);
    }
    // Every owner an entry names has a title.
    for (const entry of ENTRIES) {
      for (const owner of entry.owners) {
        if (TITLES[owner] === undefined) problems.push(`${entry.n} names the owner ${owner}, which has no title here`);
      }
    }

    const only = (process.env['P344_ONLY'] ?? '').split(',').map((s) => s.trim().toUpperCase()).filter((s) => s !== '');
    for (const name of only) {
      if (!ENTRIES.some((e) => e.n === name)) problems.push(`P344_ONLY names ${JSON.stringify(name)}, which is no entry; the entries are ${ENTRIES.map((e) => e.n).join(', ')}`);
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
    table.push(['CTRL', 'green', `${String(control.ran)} vitest rows over the five files, unedited`]);
    say(`control: ${String(control.ran)} rows green over the five files`);

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
        const next = applyEdit(text, edit);
        if (next === text) {
          needleBad = `its edit on ${edit.file} changed nothing, so the entry would run the shipping source`;
          break;
        }
        texts.set(edit.file, next);
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
