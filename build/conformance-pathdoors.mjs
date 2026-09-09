#!/usr/bin/env node
/**
 * `npm run conformance:pathdoors`, the gate on which door a path in a
 * transcript takes (Phase 247).
 *
 * About 6 s. It launches no Electron, opens no window, starts no tmux server,
 * spawns no agent, makes no request, reads nothing under the person's home,
 * and writes nothing outside scratch directories it removes in a `finally`.
 *
 * **`shell.openPath` AND `shell.openExternal` ARE NEVER CALLED BY ANYTHING
 * THIS GATE RUNS.** The probe runs under plain node with electron nowhere in
 * its module graph, so no LaunchServices open is possible from here, and rule
 * 4 asks structurally what the one live call site does.
 *
 * ## Why it exists
 *
 * Until Phase 247 no click on text an agent wrote had ever reached outside
 * Tortie. The operator lifted research 107's refusal 1 narrowly on 2026-09-09
 * — Tortie first, Preview as the fallback — and the whole risk of that lift is
 * one sentence: OPENING IS NOT EXECUTING, and the two are one keystroke apart.
 * A `.command`, a `.app`, a `.scpt`, anything carrying an executable bit, or a
 * bundle directory wearing a `.png` suffix, handed to LaunchServices, RUNS.
 *
 * So the lift is bounded by an ALLOWLIST OF KINDS and by a mode check, and
 * both are asked. A denylist of dangerous extensions is refused outright by
 * the charter, and rule 3 is what keeps that checkable rather than asserted.
 *
 * ## The rules
 *
 *   1. THE SEQUENCE, RUN RATHER THAN READ. The shipping door sequence is
 *      driven over hostile shapes built on a real disk — a `.png` that is
 *      really a shell script, a `.pdf` with the executable bit, a symlink
 *      whose leaf is a bundle, a `.command`, a bundle directory spelled
 *      `.png`, a newline in the spelling — and every answer is pinned.
 *   2. THE ORDER, which is the thing to get right. Mode is asked BEFORE
 *      extension or a `.pdf` with the executable bit walks the allowlist; the
 *      NAME is asked before the mode so a secret is refused as a secret; the
 *      bundle before the regular-file test so the refusal word is true; and
 *      the spelling before any filesystem call at all.
 *   3. THE EXTERNAL SET IS AN ALLOWLIST AND IT IS CLOSED. It is a literal set
 *      of extensions, membership is asked with `.has(`, and no file in the
 *      domain spells a denylist. Its size is pinned, so widening it is a
 *      deliberate edit to this gate and never a quiet one.
 *   4. THE ONE DOOR THAT LEAVES RE-ASKS EVERYTHING. `openPathExternally` asks
 *      the sequence BEFORE it reaches its `open` seam, opens on `'mac'`
 *      alone, and hands over the path the SEQUENCE resolved rather than the
 *      spelling the renderer sent — which is what a link planted between the
 *      underline and the click would have changed. Read by matching braces.
 *   5. THE POPULATION OF DOORS TO LaunchServices IS THE DECLARED ONE. Every
 *      `shell.openPath` and `shell.openExternal` under src/main is named
 *      here, and a new one is a finding rather than a thing this gate says
 *      nothing about.
 *   6. A HOVER NEVER WRITES AND NEVER READS A BYTE. The classify arm of
 *      `drop:prepare` is a function of its own, read by matching braces, and
 *      it names no `copyFile`, no `open`, no `readHead`, no `writeFile` and
 *      no rescue. It is the trap research 107 section 7.4 found: `preparePaths`
 *      COPIES a file whose name carries a newline into the drop store, and a
 *      link provider is driven by a pointer moving over a pane.
 *   9. THE ABLATIONS. One clause removed per copy of the sequence, and every
 *      copy must move a reading rule 1 or rule 2 pinned. A gate that cannot
 *      fail is not a gate.
 *  10. A gate nothing names is how a gate decays.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from './ts-runner.mjs';
import { functionBodyOf, stripComments } from './scan-source.mjs';

const TAG = '[conformance:pathdoors]';
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const fail = (message) => failures.push(`${TAG} ${message}`);
const say = (line) => console.log(`${TAG} ${line}`);

const DOORS = 'src/shared/path-doors.ts';
const SPANS = 'src/shared/path-spans.ts';
const DOOR = 'src/main/fs/path-door.ts';

const source = (rel) => readFileSync(join(repoRoot, rel), 'utf8');
const code = (rel) => stripComments(source(rel));

/** Every production TypeScript file under `dir`, tests left out. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      out.push(...walk(full));
    } else if (/\.[cm]?tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** ...and the ones whose code, comments stripped, names `needle`. */
function filesNaming(dir, needle) {
  return walk(dir)
    .filter((f) => !/__tests__|\.test\./.test(f))
    .filter((f) => stripComments(readFileSync(f, 'utf8')).includes(needle))
    .map((f) => relative(repoRoot, f))
    .sort();
}

// ---------------------------------------------------------------------------
// The probe. One line of JSON, the shipping sequence or an ablated copy.
// ---------------------------------------------------------------------------

function runProbe(modules) {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/p247/path-door-probe.mts'],
    {
      encoding: 'utf8',
      cwd: repoRoot,
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        ...(modules === null ? {} : { P247_MODULES: modules })
      }
    }
  );
  if (probe.status !== 0) {
    return {
      error: `the probe did not run: ${(probe.stderr || '').slice(-600) || '(no output)'}`
    };
  }
  const line = probe.stdout.trim().split('\n').pop() ?? '';
  try {
    return JSON.parse(line);
  } catch {
    return { error: `the probe printed no JSON: ${probe.stdout.slice(0, 400)}` };
  }
}

/**
 * WHAT EVERY READING MUST SAY.
 *
 * The left column is the shape and the right is the answer. These are the
 * fixture table of research 111 section 5.4 turned into a gate, plus the
 * shapes this phase added.
 */
const MATRIX = [
  // --- rule 1, the sequence over real files -------------------------------
  ['prose', 'door:editor'],
  ['code', 'door:editor'],
  ['picture', 'door:image'],
  ['no-extension', 'door:editor'],
  ['pdf', 'door:mac'],
  ['png-executable', 'refused:executable-bit'],
  ['pdf-executable', 'refused:executable-bit'],
  ['command-executable', 'refused:executable-bit'],
  ['command-plain', 'door:editor'],
  ['dylib', 'refused:executable-bit'],
  ['group-execute-only', 'refused:executable-bit'],
  ['other-execute-only', 'refused:executable-bit'],
  ['shebang-family', 'refused:executable-bit'],
  ['png-that-is-a-script', 'door:image'],
  ['bundle-wearing-png', 'refused:bundle'],
  ['app-bundle', 'refused:bundle'],
  ['link-png-to-bundle', 'refused:bundle'],
  ['link-md-to-key-material', 'refused:secret-name'],
  ['link-md-to-pdf', 'door:mac'],
  ['link-md-to-executable', 'refused:executable-bit'],
  ['newline-in-spelling', 'refused:control-character'],
  ['relative', 'refused:not-absolute'],
  ['missing', 'refused:missing'],
  ['directory', 'refused:not-a-regular-file'],
  ['network-mount', 'refused:mount'],
  ['volume-mount', 'refused:mount'],
  ['dotenv', 'refused:secret-name'],
  // The widening working as intended, stated rather than left to be found: a
  // system text file is a real file, is not a secret by name, carries no
  // executable bit, and IS underlined. Research 111 section 5.4's last row.
  ['system-text-file', 'door:editor'],
  // --- rule 2, the order ---------------------------------------------------
  ['order-mode-before-extension', 'refused:executable-bit'],
  ['order-name-before-mode', 'refused:secret-name'],
  ['order-bundle-before-regular-file', 'refused:bundle'],
  ['order-spelling-before-realpath', 'refused:not-absolute'],
  // --- rule 3, the closed set ----------------------------------------------
  ['external-allow', '.pdf'],
  // --- refusal 8 and the span grammar --------------------------------------
  ['span-plain', '/a/b.md@6-13'],
  ['span-line-suffix', '/a/b.ts@4-16:42'],
  ['span-url-left-alone', '/a/b.md@27-34'],
  ['span-ends-the-row', ''],
  ['span-heads-a-continued-row', ''],
  ['span-heads-an-uncontinued-row', '/b.md@0-5'],
  ['span-behind-a-gutter', ''],
  ['span-fraction', '']
];

const live = runProbe(null);
if (live.error !== undefined) {
  fail(`1. ${live.error}`);
} else {
  const wrong = MATRIX.filter(([key, want]) => live[key] !== want);
  for (const [key, want] of wrong) {
    fail(`1. ${key} answered ${JSON.stringify(live[key])} and must answer ${JSON.stringify(want)}`);
  }
  if (wrong.length === 0) {
    const doors = MATRIX.filter(([, w]) => w.startsWith('door:')).length;
    const refused = MATRIX.filter(([, w]) => w.startsWith('refused:')).length;
    say(
      `1 and 2. ${String(MATRIX.length)} readings, ${String(doors)} of them a door and ${String(refused)} a refusal, every one as pinned — and exactly ${String(MATRIX.filter(([, w]) => w === 'door:mac').length)} of them reach macOS`
    );
  }
}

// ---------------------------------------------------------------------------
// Rule 3. The external set is an ALLOWLIST, closed, and asked by membership.
// ---------------------------------------------------------------------------

{
  const doorsCode = code(DOORS);
  const literal = /EXTERNAL_ALLOW[^=]*=\s*new Set\(\[([^\]]*)\]\)/.exec(doorsCode);
  if (literal === null) {
    fail('3. EXTERNAL_ALLOW is not a literal `new Set([...])`, so the set it holds cannot be read here');
  } else {
    const members = [...literal[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    if (members.length !== 1 || members[0] !== '.pdf') {
      fail(
        `3. EXTERNAL_ALLOW holds ${JSON.stringify(members)}. Widening the one kind that may leave Tortie is a deliberate change: argue it in the commit body and move this pin in the same commit`
      );
    }
    if (/\.\.\./.test(literal[1])) {
      fail('3. EXTERNAL_ALLOW spreads another set into itself, so what may leave Tortie is not readable here');
    }
  }
  const decide = functionBodyOf(doorsCode, 'decidePathDoor');
  if (decide === null) {
    fail('3. src/shared/path-doors.ts declares no decidePathDoor');
  } else if (!/EXTERNAL_ALLOW\.has\(/.test(decide)) {
    fail('3. the decision does not ask EXTERNAL_ALLOW by membership, so the set may have been inverted into a denylist');
  } else if (/!\s*EXTERNAL_ALLOW\.has\(/.test(decide)) {
    fail('3. the decision asks whether an extension is NOT in the set, which is a denylist wearing an allowlist name');
  }
  // A denylist by any other spelling. The names a later round would reach for.
  for (const rel of [DOORS, DOOR]) {
    const text = code(rel);
    for (const word of ['DANGEROUS', 'DENY', 'BLOCKED', 'FORBIDDEN_EXT']) {
      if (text.includes(word)) {
        fail(`3. ${rel} names ${word}, and the external door is an allowlist or it does not ship`);
      }
    }
  }
  if (failures.every((f) => !f.includes(' 3. '))) {
    say('3. one extension may leave Tortie, spelled as a literal set and asked by membership; no denylist anywhere in the domain');
  }
}

// ---------------------------------------------------------------------------
// Rule 4. The one door that leaves re-asks everything.
// ---------------------------------------------------------------------------

/**
 * What is wrong with the external door, as a list of sentences. Written as a
 * function so it can be PROVED ON FIXTURES below: a scan that cannot fail is
 * never mistaken for a scan that passed.
 */
function externalDoorFindings(text) {
  const out = [];
  const body = functionBodyOf(stripComments(text), 'openPathExternally');
  if (body === null) {
    out.push('there is no openPathExternally, so this rule read nothing');
    return out;
  }
  const asked = body.indexOf('answerPathDoor(');
  const opened = body.indexOf('deps.open(');
  if (asked === -1) {
    out.push('the external door never asks the sequence, so nothing bounds what reaches macOS');
  } else if (opened === -1) {
    out.push('the external door never reaches its open seam, so this rule cannot see the order');
  } else if (asked > opened) {
    out.push('the external door opens BEFORE it asks the sequence, which is the whole capability unguarded');
  }
  if (!/answer\.door !== 'mac'/.test(body)) {
    out.push("the external door does not refuse every door but 'mac', so a kind Tortie draws could leave");
  }
  if (opened !== -1 && !/deps\.open\(answer\.path\)/.test(body)) {
    out.push('the external door hands over something other than the path the sequence resolved');
  }
  return out;
}

{
  const OPEN = 'src/main/fs/path-open.ts';
  const openCode = source(OPEN);
  for (const finding of externalDoorFindings(openCode)) fail(`4. ${finding}`);

  // The seam that lets a probe read what macOS would have been handed without
  // macOS being handed it. Without it, an app run has to really open something.
  if (!/GMUX_PATH_OPEN_RECORD/.test(code(OPEN))) {
    fail('4. src/main/fs/path-open.ts carries no record seam, so an app run would have to really open something');
  }

  // The scanner, proved. Five of these six must be caught.
  const SHIPPED = `async function openPathExternally(raw, deps) {
  const answer = await answerPathDoor(raw);
  if (answer.door === null) return { status: 'refused', reason: answer.refusal };
  if (answer.door !== 'mac') return { status: 'refused', reason: 'tortie-draws-it' };
  const message = await deps.open(answer.path);
  return message.length > 0 ? { status: 'failed', message } : { status: 'opened' };
}`;
  const PLANTS = [
    ['the shipping shape', SHIPPED, 0],
    ['the sequence is never asked', SHIPPED.replace('await answerPathDoor(raw)', '{ door: "mac", path: raw }'), 1],
    [
      'it opens before it asks',
      `async function openPathExternally(raw, deps) {
  const message = await deps.open(answer.path);
  const answer = await answerPathDoor(raw);
  if (answer.door !== 'mac') return { status: 'refused', reason: 'tortie-draws-it' };
  return { status: 'opened' };
}`,
      1
    ],
    ['every door leaves', SHIPPED.replace("if (answer.door !== 'mac') return { status: 'refused', reason: 'tortie-draws-it' };", ''), 1],
    ['the SPELLING is handed over, not the realpath', SHIPPED.replace('deps.open(answer.path)', 'deps.open(raw)'), 1],
    ['there is no such function at all', 'export const nothing = 1;', 1]
  ];
  let caught = 0;
  for (const [why, text, want] of PLANTS) {
    const got = externalDoorFindings(text).length;
    if ((got > 0 ? 1 : 0) !== want) {
      fail(`4. the scanner read "${why}" as ${got > 0 ? 'a finding' : 'clean'}, and it must read the other way`);
    } else if (want === 1) caught += 1;
  }
  if (failures.every((f) => !f.includes(' 4. '))) {
    say(
      `4. the external door asks the sequence first, opens on 'mac' alone, and hands over the realpath the sequence resolved; ${String(caught)} of ${String(PLANTS.length)} planted shapes were caught and the shipping one was not`
    );
  }
}

// ---------------------------------------------------------------------------
// Rule 5. The population of doors to LaunchServices is the declared one.
// ---------------------------------------------------------------------------

{
  /**
   * Every file under src/main that names `shell.openPath` or
   * `shell.openExternal`, with the reason each is allowed to.
   *
   * The three research 107 section 8 counted open DIRECTORIES TORTIE ITSELF
   * MADE, which is why they were never a precedent for this phase. The fourth
   * is this phase's, and it is the only one that takes a path a person did not
   * pick out of a surface Tortie drew.
   */
  const DECLARED = new Map([
    ['src/main/config/guide.ts', 'the configuration folder Tortie made'],
    ['src/main/log/ipc.ts', 'the log directory Tortie made'],
    ['src/main/migrate/notice.ts', 'the migration notice’s own folder'],
    ['src/main/fs/path-open.ts', 'PHASE 247, and it re-asks the whole sequence'],
    ['src/main/security/trusted-window.ts', 'an https URL through setWindowOpenHandler, which is not a path']
  ]);
  const found = filesNaming(join(repoRoot, 'src/main'), 'shell.open').sort();
  const undeclared = found.filter((f) => !DECLARED.has(f));
  const gone = [...DECLARED.keys()].filter((f) => !found.includes(f));
  for (const f of undeclared) {
    fail(`5. ${f} names shell.open* and is not declared here. A new door to LaunchServices is a finding`);
  }
  for (const f of gone) {
    fail(`5. ${f} is declared as a shell.open* site and no longer names one; a deliberate deletion removes the row in the same commit`);
  }
  if (undeclared.length === 0 && gone.length === 0) {
    say(
      `5. ${String(found.length)} files under src/main reach shell.open*, every one of them declared, and exactly one takes a path an agent wrote`
    );
  }
}

// ---------------------------------------------------------------------------
// Rule 6. A hover never writes and never reads a byte.
// ---------------------------------------------------------------------------

/**
 * What is wrong with a module's read-only ask, as a list of sentences.
 *
 * Written as a function so it can be PROVED ON FIXTURES below. A scan that
 * cannot fail is never mistaken for a scan that passed, and that is this
 * tree's own standing rule for a source-reading gate.
 */
const HOVER_FORBIDDEN = [
  'copyFile',
  'open(',
  'readHead',
  'writeFile',
  'ensureDropStore',
  'rescueCopyPath',
  'sniffImage'
];

function hoverWriteFindings(text) {
  const out = [];
  const body = stripComments(text);
  const classify = functionBodyOf(body, 'classifyOne');
  if (classify === null) {
    out.push('there is no classifyOne, so the read-only ask is not where this rule reads it');
    return out;
  }
  const named = HOVER_FORBIDDEN.filter((w) => classify.includes(w));
  if (named.length > 0) {
    out.push(`the classify ask names ${named.join(', ')}, and a hover never writes and never reads a byte`);
  }
  if (!classify.includes('answerPathDoor(')) {
    out.push('the classify ask does not reach the door sequence, so what it answers is not what this gate measured');
  }
  const one = functionBodyOf(body, 'prepareOne');
  if (one === null) {
    out.push('there is no prepareOne');
    return out;
  }
  const at = one.indexOf('classifyOne(');
  const firstAwait = one.indexOf('await');
  if (at === -1) {
    out.push('prepareOne never reaches classifyOne, so the option is not wired');
  } else if (firstAwait !== -1 && firstAwait < at) {
    out.push('prepareOne awaits something before it branches to classifyOne, so a hover does work a hover must not do');
  }
  return out;
}

{
  const PREPARE = 'src/main/drop/prepare.ts';
  for (const finding of hoverWriteFindings(source(PREPARE))) fail(`6. ${finding}`);

  // The scanner, proved. Four of these five must be caught.
  const OK_TEXT = [
    'async function classifyOne(raw) { const d = await answerPathDoor(raw); return d; }',
    'async function prepareOne(raw, classify) { if (classify) return classifyOne(raw); const st = await stat(raw); return st; }'
  ].join('\n');
  const PLANTS = [
    ['the shipping shape', OK_TEXT, 0],
    [
      'the classify ask copies a file',
      OK_TEXT.replace('return d; }', 'await copyFile(raw, raw); return d; }'),
      1
    ],
    [
      'the classify ask reads the head',
      OK_TEXT.replace('return d; }', 'await readHead(raw); return d; }'),
      1
    ],
    [
      'prepareOne stats before it branches',
      OK_TEXT.replace(
        'if (classify) return classifyOne(raw);',
        'const st0 = await stat(raw); if (classify) return classifyOne(raw);'
      ),
      1
    ],
    [
      'the classify ask answers without the door sequence',
      OK_TEXT.replace('await answerPathDoor(raw)', 'guessTheDoor(raw)'),
      1
    ]
  ];
  let caught = 0;
  for (const [why, text, want] of PLANTS) {
    const got = hoverWriteFindings(text).length;
    if ((got > 0 ? 1 : 0) !== want) {
      fail(`6. the scanner read "${why}" as ${got > 0 ? 'a finding' : 'clean'}, and it must read the other way`);
    } else if (want === 1) caught += 1;
  }
  if (failures.every((f) => !f.includes(' 6. '))) {
    say(
      `6. the classify ask is prepareOne’s first act, reaches the door sequence, and names no copy, no open and no sniff; ${String(caught)} of ${String(PLANTS.length)} planted shapes were caught and the shipping one was not`
    );
  }
}

// ---------------------------------------------------------------------------
// Rule 9. The ablations. One clause each, and every one must move a reading.
// ---------------------------------------------------------------------------

/**
 * `from` is an exact substring of a shipping module and `to` is that clause
 * removed. Every ablation is a clause a later round could take out for
 * convenience, and the reading it moves is the reason it may not.
 */
const ABLATIONS = [
  {
    name: 'the executable bit is not asked',
    file: 'path-doors.ts',
    edits: [
      { from: "if (facts.executable) return { door: null, refusal: 'executable-bit' };", to: '' }
    ]
  },
  {
    name: 'the extension is read BEFORE the mode',
    file: 'path-doors.ts',
    edits: [
      {
        from: "  if (facts.executable) return { door: null, refusal: 'executable-bit' };\n  // 7. the extension, and only now\n  if (isImagePath(real)) return { door: 'image', path: real };",
        to: "  if (isImagePath(real)) return { door: 'image', path: real };\n  if (facts.executable) return { door: null, refusal: 'executable-bit' };"
      }
    ]
  },
  {
    name: 'the name is not asked',
    file: 'path-doors.ts',
    edits: [{ from: 'if (looksLikeSecretPath(real)) {', to: 'if (false) {' }]
  },
  {
    name: 'the bundle is not asked',
    file: 'path-doors.ts',
    edits: [{ from: "if (facts.bundle) return { door: null, refusal: 'bundle' };", to: '' }]
  },
  {
    name: 'a directory is a link after all',
    file: 'path-doors.ts',
    edits: [{ from: "if (facts.kind !== 'file') {", to: 'if (false) {' }]
  },
  {
    name: 'a control character reaches a door',
    file: 'path-doors.ts',
    edits: [{ from: 'if (hasControlCharacter(facts.spelling)) {', to: 'if (false) {' }]
  },
  {
    name: 'a relative spelling reaches a door',
    file: 'path-doors.ts',
    edits: [{ from: "if (!facts.spelling.startsWith('/')) {", to: 'if (false) {' }]
  },
  {
    name: 'the allowlist becomes a denylist',
    file: 'path-doors.ts',
    edits: [
      {
        from: "  if (EXTERNAL_ALLOW.has(extensionOf(real))) return { door: 'mac', path: real };\n  return { door: 'editor', path: real };",
        to: "  if (EXTERNAL_ALLOW.has(extensionOf(real))) return { door: 'editor', path: real };\n  return { door: 'mac', path: real };"
      }
    ]
  },
  {
    name: 'the questions are asked of the SPELLING rather than the realpath',
    file: 'path-door.ts',
    edits: [{ from: 'const real = await realpath(spelling);', to: 'const real = spelling;' }]
  },
  {
    name: 'the bundle probe never looks for Contents/Info.plist',
    file: 'path-door.ts',
    edits: [{ from: 'if (dot > 0) return true;', to: 'return false;' }]
  },
  {
    name: 'a network mount is asked about after all',
    file: 'path-doors.ts',
    edits: [{ from: 'const MOUNT_REFUSED = [/^\\/Volumes\\//, /^\\/net\\//];', to: 'const MOUNT_REFUSED = [];' }]
  },
  {
    name: 'refusal 8 is lifted at the row’s right edge',
    file: 'path-spans.ts',
    edits: [{ from: 'if (span.end === row.length) return true;', to: '' }]
  },
  {
    name: 'refusal 8 is lifted at the row’s head',
    file: 'path-spans.ts',
    edits: [{ from: 'if (span.start !== headAt) return false;', to: 'return false;' }]
  },
  {
    name: 'the gutter is not read, so a row’s head is the wrong cell',
    file: 'path-spans.ts',
    edits: [{ from: 'const head = row.replace(GUTTER, ' + "''" + ');', to: 'const head = row;' }]
  },
  {
    // TWO EDITS ON PURPOSE. A URL is refused TWICE by this grammar: by the
    // scheme clause, and by the segment grammar, which has no colon in it. So
    // removing either one alone moves no reading, and an ablation of one alone
    // would be a rule that cannot fail wearing the name of one that can.
    name: 'a URL is claimed by the path grammar (the scheme clause AND the segment grammar)',
    file: 'path-spans.ts',
    edits: [
      { from: "  if (/^[a-z][a-z0-9+.-]*:\\/\\//i.test(t)) return false;", to: '' },
      { from: 'const SEGMENT = /^[A-Za-z0-9._@%+~$-]+$/;', to: 'const SEGMENT = /^[A-Za-z0-9._@%+~$:-]+$/;' }
    ]
  },
  {
    name: 'the :line suffix is not stripped',
    file: 'path-spans.ts',
    edits: [
      {
        from: "  if (lc !== null && (lc[1] ?? '').includes('/')) {\n    p = lc[1] ?? '';",
        to: "  if (false && lc !== null) {\n    p = lc[1] ?? '';"
      }
    ]
  }
];

const ABLATION_PREFIX = `.p247-ablation-${process.pid.toString(36)}-`;
const mainFs = join(repoRoot, 'src/main/fs');

function sweepAblations() {
  for (const name of readdirSync(mainFs)) {
    if (name.startsWith('.p247-ablation-')) {
      rmSync(join(mainFs, name), { recursive: true, force: true });
    }
  }
}

/**
 * Stage a copy of the three modules the sequence is made of.
 *
 * The copy sits under src/main/fs so `@shared/image-types` and
 * `@shared/preview-types` still resolve to the SHIPPING ones — neither is
 * ablated here, and re-copying them would let an ablation move a reading for
 * a reason that is not the clause it removed. `path-door.ts`'s own import of
 * `@shared/path-doors` is rewritten to the local copy, which is the whole
 * point of staging.
 */
function stage(dir) {
  mkdirSync(dir, { recursive: true });
  cpSync(join(repoRoot, DOORS), join(dir, 'path-doors.ts'));
  cpSync(join(repoRoot, SPANS), join(dir, 'path-spans.ts'));
  cpSync(join(repoRoot, DOOR), join(dir, 'path-door.ts'));
  const door = readFileSync(join(dir, 'path-door.ts'), 'utf8');
  writeFileSync(
    join(dir, 'path-door.ts'),
    door.replaceAll('@shared/path-doors', './path-doors')
  );
  const doors = readFileSync(join(dir, 'path-doors.ts'), 'utf8');
  writeFileSync(
    join(dir, 'path-doors.ts'),
    doors
      .replace("from './image-types'", "from '@shared/image-types'")
      .replace("from './preview-types'", "from '@shared/preview-types'")
  );
}

if (live.error === undefined) {
  let red = 0;
  const moves = [];
  try {
    sweepAblations();
    for (const [i, ablation] of ABLATIONS.entries()) {
      const dir = join(mainFs, `${ABLATION_PREFIX}${String(i)}`);
      stage(dir);
      const target = join(dir, ablation.file);
      let applied = true;
      for (const edit of ablation.edits) {
        if (!existsSync(target)) {
          fail(`9. there is no ${ablation.file} to ablate for "${ablation.name}"`);
          applied = false;
          break;
        }
        const before = readFileSync(target, 'utf8');
        if (!before.includes(edit.from)) {
          fail(`9. the ablation "${ablation.name}" found nothing to edit in ${ablation.file}`);
          applied = false;
          break;
        }
        writeFileSync(target, before.replace(edit.from, edit.to));
      }
      if (!applied) continue;
      const got = runProbe(dir);
      if (got.error !== undefined) {
        // A PROBE THAT CANNOT RUN IS NOT AN ABLATION THAT WENT RED.
        fail(
          `9. the ablation "${ablation.name}" stopped the probe running instead of moving a reading, so it proves nothing`
        );
        continue;
      }
      const moved = MATRIX.filter(([key]) => got[key] !== live[key]).map(([key]) => key);
      if (moved.length > 0) {
        red += 1;
        moves.push(`${ablation.name} -> ${moved.join(', ')}`);
      } else {
        fail(`9. the ablation "${ablation.name}" changed nothing this gate checks, so that clause cannot fail`);
      }
    }
    say(`9. ${String(red)} of ${String(ABLATIONS.length)} ablations went red, one clause each`);
    if (process.env['P247_ABLATION_DETAIL'] === '1') {
      for (const line of moves) say(`   ablation ${line}`);
    }
  } finally {
    sweepAblations();
  }
}

// ---------------------------------------------------------------------------
// Rule 10. A gate nothing names is how a gate decays.
// ---------------------------------------------------------------------------

{
  const pkg = readFileSync(join(repoRoot, 'package.json'), 'utf8');
  if (!pkg.includes('"conformance:pathdoors"')) {
    fail('10. package.json does not name conformance:pathdoors');
  }
  const checks = readFileSync(join(repoRoot, 'build/verification-checks.mjs'), 'utf8');
  if (!checks.includes("'conformance:pathdoors'")) {
    fail('10. build/verification-checks.mjs does not classify conformance:pathdoors');
  }
  say('10. the gate is named in package.json and classified in build/verification-checks.mjs');
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${f}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(failures.length)} finding(s).\n`);
  process.exit(1);
}
say('OK: every rule passed.');
process.exit(0);
