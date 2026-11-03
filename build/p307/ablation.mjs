#!/usr/bin/env node
/**
 * `npm run ablation:p307`. THE ATTACK ON PHASE 307'S TWO CLAUSES (the Phase 307
 * entry in docs/BACKLOG.md, built in Phase 352, build/p352/SPEC.md §4.5).
 *
 * ## Why it exists
 *
 * Phase 307 narrowed WHICH SITES two gates ask, and a narrowing is the change
 * that most needs proving, because a gate made permissive reads exactly like a
 * gate made right. Two clauses:
 *
 *   1. A CALL IS READ BY WHAT IT IS. build/scan-source.mjs's `receiverOf` says a
 *      method of a regular expression is not a start, in three measured
 *      shapes, and a declaration header is not a call.
 *      build/assert-background-teardown.mjs drops those two kinds of site and
 *      nothing else, and asks the same of the functions it promotes to
 *      starters; build/assert-known-hosts-scoped.mjs asks the regex arm alone.
 *   2. A ROW IS READ BY THE MENU IT SITS IN. build/conformance-handback.mjs
 *      requires End Session, the resume row and the per agent hotkeys inside
 *      the Session submenu, and the resume row the NEXT ELEMENT of that submenu
 *      after End Session's call, whatever it is.
 *
 * Every arm takes ONE clause away and requires the reading that clause owns to
 * move, and only that one. The controls are the shapes the narrowing must not
 * touch: a member-form `cp.spawn`, a spread of a starter, a regular expression
 * reached through a parameter and the 2026-09-02 six loop shape must stay
 * found under every arm, and the tree as it stands must stay green.
 *
 * ## It never writes into the working tree
 *
 * Four builders work in one worktree during a phase. So it makes a CLONE under
 * the system temporary directory: `src/` and `build/` copied by APFS clone
 * (`fs.cpSync` with COPYFILE_FICLONE, `build/vendor` left out), every root
 * tsconfig and package.json copied, `docs/audits/contract-baseline.txt` copied
 * because the handback gate's first section reads it, `node_modules` symlinked.
 * Every gate runs as the clone's own copy with the clone as its working
 * directory. Each file an arm edits is put back from the worktree's bytes and
 * CHECKED BY SHA256 in a `finally` before the next arm; the clone is removed in
 * a `finally` and on SIGINT, SIGTERM and SIGHUP; and the run ends by asserting
 * that the worktree's own bytes never moved, src/main/menu.ts among them.
 *
 * ## It starts nothing but node
 *
 * Each reading is one `spawnSync` of `node`: the clone's gate, or this file
 * with `--read-background <clone>`, which imports the clone's background gate in
 * a fresh process so an edited build/scan-source.mjs is the one it reads. No
 * Electron, no tmux, no ssh, no agent, no network, no token, and nothing under
 * the person's home.
 *
 * Usage:
 *   node build/p307/ablation.mjs
 *   P307_ONLY=R1,M1 node build/p307/ablation.mjs        named arms only
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  constants,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p307-ablation]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------------------
// The shapes. LAUNCH, LOOP, SLEEPER and SSHPROG are placeholders substituted
// only when a shape is written, for the reason build/background-fixtures.mjs
// gives: with the real words in place this file's own text would read, to the
// very gates it attacks, as a start nothing ends and an ssh nothing routes.
// ---------------------------------------------------------------------------

function shape(text) {
  return text
    .replace(/LAUNCH/g, 'spa' + 'wn')
    .replace(/LOOP/g, 'whi' + 'le :; do :; done')
    .replace(/SLEEPER/g, 'sle' + 'ep 900')
    .replace(/SSHPROG/g, 'ss' + 'h');
}

/**
 * The background gate's planted shapes, each with the number of starts nothing
 * ends that the tree as it stands must read. The first five are what Phase 307
 * moves; the last four are the controls no arm may move.
 */
const PLANTS = {
  literal: { want: 0, text: shape("const raw = 'SLEEPER';\nexport const m = /^x+$/.exec(raw);\n") },
  flags: { want: 0, text: shape("const raw = 'SLEEPER';\nexport const m = /^x+$/i.exec(raw);\n") },
  named: { want: 0, text: shape("const raw = 'SLEEPER';\nconst RE = /^x+$/i;\nexport const m = RE.exec(raw);\n") },
  declaration: {
    want: 1,
    text: shape(
      "import { LAUNCH } from 'node:child_process';\nconst cmd = 'LOOP';\n" +
        "export function other(cmd) { return LAUNCH('/bin/sh', ['-c', cmd]); }\n"
    )
  },
  promotion: {
    want: 0,
    text: shape(
      "const raw = 'SLEEPER';\nconst RE = /^x+$/;\nfunction parse(text) {\n  return RE.exec(text);\n}\n" +
        'export const m = parse(raw);\n'
    )
  },
  member: {
    want: 1,
    text: shape(
      "import * as cp from 'node:child_process';\nconst BURN = 'LOOP';\n" +
        "export const c = cp.LAUNCH('/bin/sh', ['-c', BURN], { detached: true });\n"
    )
  },
  spread: {
    want: 1,
    text: shape(
      "import { LAUNCH } from 'node:child_process';\nconst BURN = 'LOOP';\n" +
        "function start(cmd) {\n  return [LAUNCH('/bin/sh', ['-c', cmd])];\n}\n" +
        'export const kids = [...start(BURN)];\n'
    )
  },
  parameter: {
    want: 1,
    text: shape("const raw = 'SLEEPER';\nfunction channel(re) {\n  return re.exec(raw);\n}\nexport const m = channel(/x/);\n")
  },
  shadowed: {
    // A name the file assigns a regular expression, taken as a PARAMETER by
    // the function the call sits in: there it is the caller's value, so the
    // site stays read.
    want: 1,
    text: shape(
      "const re = /^x+$/;\nconst raw = 'SLEEPER';\nfunction channel(re) {\n  return re.exec(raw);\n}\n" +
        'export const m = channel(re);\n'
    )
  },
  sixLoops: {
    want: 1,
    text: shape(
      "import { LAUNCH } from 'node:child_process';\nconst loaders = [];\n" +
        "for (let i = 0; i < 6; i += 1) loaders.push(LAUNCH('/bin/sh', ['-c', 'LOOP'], { stdio: 'ignore' }));\n" +
        'await runTheProbe();\nfor (const child of loaders) child.kill();\n'
    )
  },
  rebound: {
    // The probe review of Phase 352: a name the file assigns nothing but a
    // regular expression by `=`, bound to the child process module by a
    // destructuring declaration where the start is made. It walked past the
    // receiver test as first built; it must stay found, and only R5 moves it.
    want: 1,
    text: shape(
      "import * as child from 'node:child_process';\nconst proc = /^x+$/i;\nexport const looks = (s) => proc.test(s);\n" +
        "export function go() {\n  const { proc } = { proc: child };\n  return proc.LAUNCH('/bin/sh', ['-c', 'LOOP'], { detached: true });\n}\n"
    )
  },
  // The fix round of Phase 352: the verify lens's three shapes the receiver
  // test walked past while the parent found them. Each must stay found, and
  // only the arm that takes its clause away moves it.
  assigned: {
    // A destructuring ASSIGNMENT, with no keyword in front of the bracket.
    want: 1,
    text: shape(
      "import * as child from 'node:child_process';\nlet proc = /^x+$/;\n[proc] = [child];\n" +
        "export const c = proc.LAUNCH('/bin/sh', ['-c', 'LOOP'], { detached: true });\n"
    )
  },
  twins: {
    // Two functions whose bodies are byte for byte the same, the second taking
    // the regular expression's name as a parameter.
    want: 1,
    text: shape(
      "import * as child from 'node:child_process';\nconst re = /^x+$/;\n" +
        'function a(cmd) { return re.exec(cmd); }\nfunction b(re, cmd) { return re.exec(cmd); }\n' +
        "const BURN = 'LOOP';\nexport const one = a('abc');\nb(child, BURN);\n"
    )
  },
  postfix: {
    // A division after a postfix ++, whose divisor is a namespace named with
    // flag letters.
    want: 1,
    text: shape(
      "import * as ms from 'node:child_process';\nlet i = 0;\n" +
        "export const n = i++ / 2 /ms.LAUNCH('/bin/sh', ['-c', 'LOOP'], { detached: true });\n"
    )
  }
};
const CONTROLS = ['member', 'spread', 'parameter', 'sixLoops'];

/** The known-hosts gate's planted shape: a regular expression's exec beside a name holding the client. */
const KNOWN_HOSTS_PLANT = shape("const prog = 'SSHPROG';\nexport const m = /x/.exec(prog);\n");
const KNOWN_HOSTS_PLANT_FILE = 'build/p307-plant-known-hosts.mjs';

// ---------------------------------------------------------------------------
// --read-background <clone>: the reading, in a process of its own
// ---------------------------------------------------------------------------

if (process.argv[2] === '--read-background') {
  const clone = process.argv[3];
  const gate = await import(pathToFileURL(join(clone, 'build', 'assert-background-teardown.mjs')).href);
  const { FIXTURES } = await import(pathToFileURL(join(clone, 'build', 'background-fixtures.mjs')).href);
  const leaks = (text) => gate.leaksIn('plant.mjs', text).length;
  const plants = {};
  for (const [key, plant] of Object.entries(PLANTS)) plants[key] = leaks(plant.text);
  const misread = FIXTURES.filter((f) => leaks(f.text) !== f.bad).map((f) => f.name);
  process.stdout.write(JSON.stringify({ plants, fixtures: FIXTURES.length, misread }));
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The menu shapes, written against src/main/menu.ts's own bytes. This phase
// EDITS NO MENU, so an arm that cannot find its anchor is a failure by name.
// ---------------------------------------------------------------------------

const MENU = 'src/main/menu.ts';
const END_ROW = "        item('End Session\u2026', 'end-session', undefined, 'close'),\n";
const RESUME_ROW =
  "        item('Resume Conversation', 'resume-conversation', undefined, 'terminal'),\n";
const HOTKEYS = '        ...agentHotkeyItems(),\n';
const PROJECT_LAST = "        item('Close Project\u2026', 'close-project', undefined, 'close')\n      ]";
const NEXT_ROW = "        item('Next Session', 'next-session', accel('session.next'), 'arrow-down'),\n";
const PREV_ROW = "        item('Previous Session', 'prev-session', accel('session.prev'), 'arrow-up'),\n";
const SEPARATOR = "        { type: 'separator' },\n";

/** The three rows moved whole, in their order, to the end of the Project submenu. */
const MOVED_TO_PROJECT = [
  { file: MENU, from: END_ROW, to: '' },
  { file: MENU, from: RESUME_ROW, to: '' },
  { file: MENU, from: HOTKEYS, to: '' },
  {
    file: MENU,
    from: PROJECT_LAST,
    to:
      "        item('Close Project\u2026', 'close-project', undefined, 'close'),\n" +
      END_ROW +
      RESUME_ROW +
      HOTKEYS +
      '      ]'
  }
];

/** Next Session, a separator and Previous Session moved between End Session and the resume row. */
const BETWEEN_END_AND_RESUME = [
  { file: MENU, from: NEXT_ROW + PREV_ROW, to: '' },
  { file: MENU, from: END_ROW, to: END_ROW + NEXT_ROW + SEPARATOR + PREV_ROW }
];

/**
 * ONE ROW THAT IS NOT AN `item(` CALL between End Session and the resume row
 * (the probe review of Phase 352): a role row, which the menu draws and which a
 * test of the next `item(` call walked past.
 */
const ROLE_ROW = "        { role: 'toggleDevTools' },\n";
const ROW_NOT_ITEM_BETWEEN = [{ file: MENU, from: END_ROW, to: END_ROW + ROLE_ROW }];

// ---------------------------------------------------------------------------
// The arms. `edits` are taken away from the clone's gates; `expect` reads the
// state that arm must leave.
// ---------------------------------------------------------------------------

const SCAN = 'build/scan-source.mjs';
const BACKGROUND = 'build/assert-background-teardown.mjs';
const KNOWN_HOSTS = 'build/assert-known-hosts-scoped.mjs';
const HANDBACK = 'build/conformance-handback.mjs';

const ARMS = [
  {
    n: 'R1',
    clause: 'the receiver test, removed whole',
    edits: [
      {
        file: SCAN,
        from: 'export function receiverOf(code, at, context = receiverContext(code)) {\n',
        to: "export function receiverOf(code, at, context = receiverContext(code)) {\n  if (code !== null) return 'plain';\n"
      }
    ],
    moves: { literal: 1, flags: 1, named: 1, declaration: 2, promotion: 1 },
    knownHosts: 'red'
  },
  {
    n: 'R2',
    clause: 'its first regex shape alone, a literal ending in a slash',
    edits: [{ file: SCAN, from: "  if (/\\/ +\\/\\s*$/.test(receiver)) return 'regex';\n", to: '' }],
    moves: { literal: 1 },
    knownHosts: 'red'
  },
  {
    n: 'R3',
    clause: "its second regex shape alone, a literal's flag run",
    edits: [{ file: SCAN, from: "  if (/\\/ +\\/[dgimsuyv]+\\s*$/.test(receiver)) return 'regex';\n", to: '' }],
    moves: { flags: 1 }
  },
  {
    n: 'R4',
    clause: 'its third regex shape alone, a name the file assigns only a regular expression',
    edits: [
      {
        file: SCAN,
        from:
          "  if (name !== null && context.regexNames.has(name[1]) && !shadowedAt(context.scopes, name[1], at)) {\n" +
          "    return 'regex';\n" +
          '  }\n',
        to: ''
      }
    ],
    // The promotion shape's one call is `RE.exec(text)`, a named regular
    // expression, so this shape owns its reading too.
    moves: { named: 1, promotion: 1 }
  },
  {
    n: 'S1',
    clause: 'the third shape asked only outside a function that takes the name as a parameter',
    edits: [
      {
        file: SCAN,
        from: "  if (name !== null && context.regexNames.has(name[1]) && !shadowedAt(context.scopes, name[1], at)) {\n",
        to: "  if (name !== null && context.regexNames.has(name[1])) {\n"
      }
    ],
    // The twins' second body takes the name as a parameter too, so it is read
    // as the file's regular expression once this clause is gone.
    moves: { shadowed: 0, twins: 0 }
  },
  {
    n: 'R5',
    clause: 'the third shape refused for a name the file binds another way (the probe review of Phase 352)',
    edits: [
      {
        file: SCAN,
        from: '    if (pieces.length > 0 && pieces.every(regexValue) && !boundOtherwise(code, name)) regexNames.add(name);\n',
        to: '    if (pieces.length > 0 && pieces.every(regexValue)) regexNames.add(name);\n'
      }
    ],
    // A destructuring assignment is a binding of the same question, so its
    // shape moves with it, and the known-hosts gate's own fixture of it.
    moves: { rebound: 0, assigned: 0 },
    knownHosts: 'fixture R2'
  },
  {
    n: 'R6',
    clause: 'the third shape refused for a name a destructuring ASSIGNMENT rebinds (the fix round of Phase 352)',
    edits: [
      {
        file: SCAN,
        from: '  return assignmentTargetsOf(code).some((target) => new RegExp(word).test(target));\n',
        to: '  return false;\n'
      }
    ],
    moves: { assigned: 0 },
    knownHosts: 'fixture R2'
  },
  {
    n: 'R7',
    clause: 'a slash after a postfix ++ or -- read as a division (the fix round of Phase 352)',
    edits: [
      {
        file: SCAN,
        from: "  if (/[\\w$)\\]]\\s*(?:\\+\\+|--)\\s*\\/ +\\/[dgimsuyv]*\\s*$/.test(receiver)) return 'member';\n",
        to: ''
      }
    ],
    moves: { postfix: 0 }
  },
  {
    n: 'D1',
    clause: 'the declaration guard',
    edits: [
      {
        file: SCAN,
        from: "  if (/\\bfunction\\s*\\*?\\s*$/.test(code.slice(Math.max(0, at - 24), at))) return 'declaration';\n",
        to: ''
      }
    ],
    moves: { declaration: 2 }
  },
  {
    n: 'B1',
    clause: "the background gate's own question at each site",
    edits: [
      { file: BACKGROUND, from: '    if (NOT_A_START.has(receiverOf(code, m.index, context))) continue;\n', to: '' }
    ],
    moves: { literal: 1, flags: 1, named: 1, declaration: 2 }
  },
  {
    n: 'B2',
    clause: 'the same question asked of the functions the background gate promotes',
    edits: [
      { file: BACKGROUND, from: '      if (NOT_A_START.has(receiverOf(where, offset + m.index, asked))) continue;\n', to: '' }
    ],
    moves: { promotion: 1 }
  },
  {
    n: 'B3',
    clause: 'that question asked at every place a body occurs, not only the first (the fix round of Phase 352)',
    edits: [
      {
        file: BACKGROUND,
        from: '    for (const at of places.length === 0 ? [-1] : places) asks.push([name, body, at]);\n',
        to: '    asks.push([name, body, places.length === 0 ? -1 : places[0]]);\n'
      }
    ],
    moves: { twins: 0 }
  },
  {
    n: 'K1',
    clause: "the known-hosts gate's regex arm",
    edits: [
      {
        file: KNOWN_HOSTS,
        from: "    if (receiverOf(code, m.index + m[1].length, receivers) === 'regex') continue;\n",
        to: ''
      }
    ],
    knownHosts: 'red'
  },
  {
    n: 'M1',
    clause: "the handback gate's membership clause",
    edits: [{ file: HANDBACK, from: '} else if (!inSessionMenu) {', to: '} else if (false) {' }],
    handback: { moved: 0 }
  },
  {
    n: 'M2',
    clause: "the handback gate's adjacency clause",
    edits: [
      {
        file: HANDBACK,
        from: '  menu.rowAt < menu.hotkeysAt &&\n  menu.adjacent === true;',
        to: '  menu.rowAt < menu.hotkeysAt;'
      }
    ],
    handback: { between: 0, oneRow: 0 }
  }
];

// ---------------------------------------------------------------------------
// The clone
// ---------------------------------------------------------------------------

const clone = mkdtempSync(join(tmpdir(), `p307-ablation-${String(process.pid)}-`));
let cleaned = false;
const clean = () => {
  if (cleaned) return;
  cleaned = true;
  rmSync(clone, { recursive: true, force: true });
};
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    clean();
    process.exit(130);
  });
}

function buildClone() {
  for (const name of ['src', 'build']) {
    cpSync(join(REPO, name), join(clone, name), {
      recursive: true,
      mode: constants.COPYFILE_FICLONE,
      filter: (from) => {
        const rel = from.slice(REPO.length + 1);
        return rel !== 'build/vendor' && !rel.startsWith('build/vendor/') && !rel.split('/').includes('node_modules');
      }
    });
  }
  for (const name of readdirSync(REPO).filter((f) => f === 'package.json' || /^tsconfig(\.[a-z]+)?\.json$/.test(f))) {
    copyFileSync(join(REPO, name), join(clone, name));
  }
  mkdirSync(join(clone, 'docs', 'audits'), { recursive: true });
  copyFileSync(join(REPO, 'docs/audits/contract-baseline.txt'), join(clone, 'docs/audits/contract-baseline.txt'));
  symlinkSync(join(REPO, 'node_modules'), join(clone, 'node_modules'));
}

/** One exact replacement in the clone; refused unless the text occurs exactly once. */
function edit(rel, from, to) {
  const path = join(clone, rel);
  const text = readFileSync(path, 'utf8');
  const count = text.split(from).length - 1;
  if (count !== 1) return `${rel} holds ${String(count)} copies of ${JSON.stringify(from.slice(0, 90))}`;
  writeFileSync(path, text.replace(from, () => to));
  return null;
}

/** Put one clone file back from the worktree's bytes and prove it by sha256. */
function restore(rel) {
  const want = readFileSync(join(REPO, rel));
  writeFileSync(join(clone, rel), want);
  const got = sha(readFileSync(join(clone, rel)));
  if (got !== sha(want)) throw new Error(`${rel} did not restore: ${got} against ${sha(want)}`);
}

/** Run one of the clone's gates in the clone. */
function runGate(rel) {
  const r = spawnSync(process.execPath, [join(clone, rel)], {
    cwd: clone,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 180_000
  });
  return { code: r.status ?? 1, text: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/** The background reading, taken by this file in a fresh process over the clone. */
function readBackground() {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--read-background', clone], {
    cwd: clone,
    encoding: 'utf8',
    timeout: 120_000
  });
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { error: `${r.stderr ?? ''}`.slice(0, 400) || `exit ${String(r.status)} and nothing printed` };
  }
}

/** The known-hosts gate over the clone with the plant in it: 'red' when it names the plant. */
function readKnownHosts() {
  writeFileSync(join(clone, KNOWN_HOSTS_PLANT_FILE), KNOWN_HOSTS_PLANT);
  try {
    const out = runGate(KNOWN_HOSTS);
    if (out.code !== 0 && out.text.includes('p307-plant-known-hosts.mjs')) return 'red';
    if (out.code === 0) return 'green';
    // The fix round of Phase 352: red on ONE of the gate's own fixtures and
    // nothing else, which is how an arm on a clause the gate's fixtures own
    // reads, named by the fixture's id.
    const missed = [...out.text.matchAll(/the fixture ([A-Za-z0-9]+) was NOT caught/g)].map((m) => m[1]);
    const findings = (out.text.match(/^ {2}\S/gm) ?? []).length;
    if (missed.length === 1 && findings === 1) return `fixture ${missed[0]}`;
    return `red elsewhere: ${out.text.slice(0, 300)}`;
  } finally {
    rmSync(join(clone, KNOWN_HOSTS_PLANT_FILE), { force: true });
  }
}

/** The handback gate over one menu shape, as its exit code and its failures. */
function readHandback(edits) {
  const touched = new Set();
  try {
    for (const e of edits) {
      const missing = edit(e.file, e.from, e.to);
      touched.add(e.file);
      if (missing !== null) return { code: -1, text: `SHAPE MISSING: ${missing}` };
    }
    return runGate(HANDBACK);
  } finally {
    for (const rel of touched) restore(rel);
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const touchedFiles = [...new Set([MENU, SCAN, BACKGROUND, KNOWN_HOSTS, HANDBACK, ...ARMS.flatMap((a) => a.edits.map((e) => e.file))])];
const worktreeBefore = new Map(touchedFiles.map((f) => [f, sha(readFileSync(join(REPO, f)))]));
const only = (process.env['P307_ONLY'] ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s !== '');
const problems = [];
const table = [];
const started = Date.now();

try {
  buildClone();
  say(`clone at ${clone}, node_modules symlinked, nothing under a home touched`);

  // The controls, over the tree as it stands.
  const base = readBackground();
  if (base.error !== undefined) throw new Error(`the background reading did not run: ${base.error}`);
  for (const [key, plant] of Object.entries(PLANTS)) {
    if (base.plants[key] !== plant.want) {
      problems.push(`the base reads the ${key} shape as ${String(base.plants[key])} starts nothing ends, where ${String(plant.want)} is due`);
    }
  }
  if (base.misread.length > 0) problems.push(`the base misreads fixtures: ${base.misread.join('; ')}`);
  const baseKnownHosts = readKnownHosts();
  if (baseKnownHosts !== 'green') problems.push(`the known-hosts gate reads the regular expression plant as ${baseKnownHosts}, where green is due`);
  const baseGates = {
    background: runGate(BACKGROUND),
    knownHosts: runGate(KNOWN_HOSTS),
    handback: runGate(HANDBACK)
  };
  for (const [name, out] of Object.entries(baseGates)) {
    if (out.code !== 0) problems.push(`the ${name} gate is red over the tree as it stands: ${out.text.slice(-400)}`);
  }
  const moved = readHandback(MOVED_TO_PROJECT);
  const between = readHandback(BETWEEN_END_AND_RESUME);
  const oneRow = readHandback(ROW_NOT_ITEM_BETWEEN);
  const movedSays = moved.code === 1 && /belong in the Session menu/.test(moved.text) && /the Project menu/.test(moved.text);
  const betweenSays = between.code === 1 && /belongs immediately after End Session/.test(between.text);
  if (!movedSays) problems.push(`the three rows moved whole into the Project submenu read exit ${String(moved.code)}, not the membership failure naming the Project menu`);
  if (!betweenSays) problems.push(`two rows and a separator between End Session and the resume row read exit ${String(between.code)}, not the order's own sentence`);
  if (!(oneRow.code === 1 && /belongs immediately after End Session/.test(oneRow.text))) {
    problems.push(`a role row between End Session and the resume row read exit ${String(oneRow.code)}, not the order's own sentence`);
  }
  say(
    `base: ${String(base.fixtures)} fixtures behave, the plants read ${JSON.stringify(base.plants)}, the known-hosts plant ${baseKnownHosts}, ` +
      `the rows moved into Project exit ${String(moved.code)}, two rows between End Session and the resume row exit ${String(between.code)}, a role row between them exit ${String(oneRow.code)}`
  );

  for (const arm of ARMS) {
    if (only.length > 0 && !only.includes(arm.n)) continue;
    const files = [...new Set(arm.edits.map((e) => e.file))];
    const missing = [];
    let verdict = 'red';
    const said = [];
    try {
      for (const e of arm.edits) {
        const why = edit(e.file, e.from, e.to);
        if (why !== null) missing.push(why);
      }
      if (missing.length > 0) {
        verdict = 'SHAPE MISSING';
        problems.push(`${arm.n} ${arm.clause}: the clause to take away is not in the clone. ${missing.join('; ')}`);
        continue;
      }
      if (arm.moves !== undefined || arm.knownHosts === undefined) {
        const after = readBackground();
        if (after.error !== undefined) {
          verdict = 'DID NOT LOAD';
          problems.push(`${arm.n} ${arm.clause}: the edited gate would not load, which proves nothing about the clause: ${after.error}`);
          continue;
        }
        for (const [key, plant] of Object.entries(PLANTS)) {
          const want = arm.moves?.[key] ?? plant.want;
          if (after.plants[key] !== want) {
            verdict = arm.moves?.[key] !== undefined ? 'GREEN' : 'MOVED ELSEWHERE';
            problems.push(`${arm.n} ${arm.clause}: the ${key} shape read ${String(after.plants[key])}, where ${String(want)} is due${CONTROLS.includes(key) ? ', and it is a control no arm may move' : ''}`);
          }
        }
        said.push(`plants ${JSON.stringify(after.plants)}`);
      }
      if (arm.knownHosts !== undefined || arm.edits.some((e) => e.file === SCAN || e.file === KNOWN_HOSTS)) {
        const got = readKnownHosts();
        const want = arm.knownHosts ?? 'green';
        if (got !== want) {
          verdict = want === 'red' ? 'GREEN' : 'MOVED ELSEWHERE';
          problems.push(`${arm.n} ${arm.clause}: the known-hosts plant read ${got}, where ${want} is due`);
        }
        said.push(`known-hosts plant ${got}`);
      }
      if (arm.handback !== undefined) {
        const m = readHandback(MOVED_TO_PROJECT);
        const b = readHandback(BETWEEN_END_AND_RESUME);
        const o = readHandback(ROW_NOT_ITEM_BETWEEN);
        const real = runGate(HANDBACK);
        const wantMoved = arm.handback.moved ?? 1;
        const wantBetween = arm.handback.between ?? 1;
        const wantOne = arm.handback.oneRow ?? 1;
        if (m.code !== wantMoved || b.code !== wantBetween || o.code !== wantOne) {
          verdict = 'GREEN';
          problems.push(`${arm.n} ${arm.clause}: the moved rows exit ${String(m.code)} (due ${String(wantMoved)}), the rows between exit ${String(b.code)} (due ${String(wantBetween)}) and the role row between exit ${String(o.code)} (due ${String(wantOne)})`);
        }
        if (real.code !== 0) {
          verdict = 'MOVED ELSEWHERE';
          problems.push(`${arm.n} ${arm.clause}: the edited gate is red over the menu as it stands`);
        }
        said.push(`moved rows exit ${String(m.code)}, rows between exit ${String(b.code)}, role row between exit ${String(o.code)}, the menu as it stands exit ${String(real.code)}`);
      }
    } finally {
      for (const rel of files) restore(rel);
    }
    table.push([arm.n, arm.clause, verdict, said.join('; ')]);
    say(`${arm.n.padEnd(3)} ${verdict.padEnd(15)} ${arm.clause}: ${said.join('; ')}`);
  }

  const after = readBackground();
  if (JSON.stringify(after.plants) !== JSON.stringify(base.plants)) {
    problems.push(`after every clone file was restored the plants read ${JSON.stringify(after.plants)} where the base read ${JSON.stringify(base.plants)}, so a restore did not land`);
  }
} catch (err) {
  problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  clean();
}

for (const [file, before] of worktreeBefore) {
  const now = sha(readFileSync(join(REPO, file)));
  if (now !== before) problems.push(`${file} in the WORKTREE changed during the run (${before.slice(0, 12)} to ${now.slice(0, 12)}); this harness writes only its clone`);
}
if (existsSync(clone)) problems.push(`the clone ${clone} is still there`);
say(`the worktree's own ${String(worktreeBefore.size)} files are byte for byte what they were, by sha256, ${MENU} among them (${(worktreeBefore.get(MENU) ?? '').slice(0, 12)})`);

const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (problems.length > 0) {
  process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  process.exit(1);
}
const reds = table.filter((r) => r[2] === 'red').map((r) => r[0]);
process.stdout.write(
  `\n${TAG} PASS in ${seconds} s. ${String(reds.length)} of ${String(table.length)} arms each took one clause away and moved ` +
    `the reading that clause owns and nothing else (${reds.join(', ') || 'none'}); the controls (a member-form start, ` +
    'a spread of a starter, a regular expression reached through a parameter, the six loop shape) stayed found under ' +
    'every arm, the three gates are green over the tree as it stands, every clone file was restored and proved by ' +
    'sha256, the worktree was never written, and the clone is gone. No Electron, no tmux, no ssh, no agent, no token.\n'
);
