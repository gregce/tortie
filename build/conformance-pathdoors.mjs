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
 *   7. THE PROVIDER IS REGISTERED AFTER `WebLinksAddon` AND REFUSES A REMOTE
 *      PANE. Registration order is what stops a path link ever taking a span
 *      from a URL, because `_removeIntersectingLinks` walks providers in that
 *      order. The machine question is read PER HOVER inside the provider — a
 *      closure, never a captured value — and it is asked BEFORE anything else
 *      runs, so a remote pane costs a comparison and not a round trip.
 *   8. THE PROVIDER'S OWN REFUSALS. `provideLinks` answers `undefined` for a
 *      remote pane, and a link is built only for a span whose door is not
 *      null. The click asks AGAIN, and it asks the machine question again
 *      too — the underline was drawn from a cached answer.
 *   9. THE ABLATIONS. One clause removed per copy of the sequence, and every
 *      copy must move a reading rule 1 or rule 2 pinned. A gate that cannot
 *      fail is not a gate.
 *  10. A gate nothing names is how a gate decays.
 *  11. THE UNDERLINE IS DRAWN IN CELLS AND NOT IN STRING INDICES. The
 *      shipping column map is driven against a REAL `@xterm/xterm` buffer and
 *      graded against xterm's OWN `outColumns` and against the cells
 *      themselves, over fourteen glyph rows nine of which really move the
 *      column. It is the Phase 247 fix round's confirmed defect: a range
 *      built from string indices underlines one cell to the left of a path an
 *      agent printed with a `⚠️ ` in front of it.
 *  14. THE BASE IS THE PANE'S OWN, READ PER HOVER, AND PART OF THE KEY
 *      (Phase 250 lift two). The join is main's and the two clauses that
 *      bound it are the pure decision's; this is the renderer half, where a
 *      captured base, a cache key without one, or an ask that drops it are
 *      each invisible to any test of the join.
 *  13. REFUSAL 8 IS ASKED ABOUT THE PANE'S WIDTH (Phase 250 lift one). The
 *      pure rule is driven exhaustively above; this is the one call site that
 *      supplies its facts, and the three things that can go wrong there —
 *      the row's length standing in for `Terminal.cols`, a predecessor read
 *      with its trailing padding, and a row above with no column map of its
 *      own — are invisible to any pure test.
 *  12. THE RENDERER'S CHEAP REFUSAL IS WIDER THAN MAIN'S ANSWER. Phase 250
 *      narrowed it: a relative spelling can reach a door once there is a
 *      base, so what is refused without a round trip is a spelling that can
 *      never reach one at all. It is still ONE predicate, composed from the
 *      two shipped ones, and the direction it may drift in is driven with a
 *      base and without rather than asserted.
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
import { blockAt, closeOf, functionBodyOf, stripComments } from './scan-source.mjs';

const TAG = '[conformance:pathdoors]';
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const fail = (message) => failures.push(`${TAG} ${message}`);
const say = (line) => console.log(`${TAG} ${line}`);

const DOORS = 'src/shared/path-doors.ts';
const SPANS = 'src/shared/path-spans.ts';
const DOOR = 'src/main/fs/path-door.ts';
const PREVIEW = 'src/shared/preview-types.ts';
const IMAGES = 'src/shared/image-types.ts';

const source = (rel) => readFileSync(join(repoRoot, rel), 'utf8');
const code = (rel) => stripComments(source(rel));

/**
 * The body of a CLASS METHOD, matched by braces.
 *
 * `namedFunctions` and `functionBodyOf` in build/scan-source.mjs read
 * declarations and assigned arrow functions and see no class method at all, so
 * a rule asking about one would read nothing and pass. The provider is a class
 * because it holds a cache, so this reader exists; it is proved on fixtures
 * beside rule 8, four of which must make it answer null.
 *
 * A DECLARATION IN AN INTERFACE IS NOT A METHOD. `open(path): Promise<string>;`
 * matches the same name at the same indentation, so a candidate whose
 * parameter list is followed by a `;` before its `{` is skipped rather than
 * read, and the search moves on to the next one.
 */
function methodBodyOf(code, name) {
  const re = new RegExp(
    `(?:^|\\n)[ \\t]*(?:private |public |protected |static |async |readonly )*${name}\\s*\\(`,
    'g'
  );
  let m;
  while ((m = re.exec(code)) !== null) {
    const openParen = code.indexOf('(', m.index + m[0].length - 1);
    const closeParen = closeOf(code, openParen);
    if (closeParen === -1) continue;
    const brace = code.indexOf('{', closeParen);
    if (brace === -1) continue;
    if (code.slice(closeParen, brace).includes(';')) continue;
    return blockAt(code, brace);
  }
  return null;
}

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
  // PHASE 247 widened NEVER_PREVIEW with the credential family. These are the
  // names research 111 section 2.4 measured in the operator's own transcripts,
  // three of the four INSIDE a project root — so the root rule would not have
  // caught them either, which is why this is the guard and not that one.
  ['credential-auth-json', 'refused:secret-name'],
  ['credential-npmrc', 'refused:secret-name'],
  ['credential-aws', 'refused:secret-name'],
  // ...and the control. A name-only rule that refused every .json would be
  // useless, and `config.json` is deliberately NOT in the family: see the
  // reason on CREDENTIAL_FILE_NAMES in src/shared/preview-types.ts.
  ['ordinary-json', 'door:editor'],
  ['ordinary-config-json', 'door:editor'],
  // The widening working as intended, stated rather than left to be found: a
  // system text file is a real file, is not a secret by name, carries no
  // executable bit, and IS underlined. Research 111 section 5.4's last row.
  ['system-text-file', 'door:editor'],
  // --- rule 2, the order ---------------------------------------------------
  ['order-mode-before-extension', 'refused:executable-bit'],
  ['order-name-before-mode', 'refused:secret-name'],
  ['order-bundle-before-regular-file', 'refused:bundle'],
  ['order-spelling-before-realpath', 'refused:not-absolute'],
  // The Phase 247 fix round's finding 3: the mount is asked of the REALPATH
  // as well as the spelling, because a symlink at an ordinary name is what
  // carries a path onto a mount without ever spelling one.
  ['order-mount-on-realpath', 'refused:mount'],
  ['order-mount-on-realpath-net', 'refused:mount'],
  // --- rule 12, the renderer's own cheap refusal ---------------------------
  ['could-be-absolute-refused', '11'],
  ['could-be-absolute-admitted', '4'],
  ['could-be-absolute-disagreed', '0'],
  // PHASE 250 narrowed it: a relative spelling can reach a door once there is
  // a base, so the cheap refusal is now about a pane with no base at all.
  ['could-be-asked-refused-with-no-base', '11'],
  ['could-be-asked-refused-with-a-base', '0'],
  ['could-be-asked-disagreed', '0'],
  // --- rule 14, PHASE 250 LIFT TWO: a relative spelling and its base -------
  ['rel-resolves', 'door:editor'],
  ['rel-no-base', 'refused:not-absolute'],
  ['rel-empty-base', 'refused:not-absolute'],
  ['rel-base-is-the-filesystem-root', 'refused:not-absolute'],
  ['rel-base-is-gone', 'refused:missing'],
  ['rel-base-through-a-link', 'door:editor'],
  ['rel-tilde-is-never-joined', 'refused:not-absolute'],
  ['absolute-ignores-the-base', 'door:editor'],
  // CONTAINMENT. A climb and an escaping link are one clause, asked of the
  // REALPATH — research 114 section 4.6 priced it at 7 of 1,224 links.
  ['rel-climbs-out', 'refused:outside-base'],
  ['rel-symlink-escapes', 'refused:outside-base'],
  // A BASE IS NOT A BYPASS: every refusal an absolute spelling meets, a
  // resolved one meets too, because the sequence asks them of the realpath.
  ['rel-executable-bit', 'refused:executable-bit'],
  ['rel-secret-name', 'refused:secret-name'],
  ['rel-directory', 'refused:not-a-regular-file'],
  ['rel-bundle', 'refused:bundle'],
  ['rel-control-character', 'refused:control-character'],
  ['rel-mount-through-the-base', 'refused:mount'],
  // THE MAC DOOR IS CLOSED TO A RESOLVED SPELLING, and the same file spelled
  // absolutely still takes it — which is what makes this a rule about the
  // spelling rather than a rule about the file.
  ['rel-mac-door-refused', 'refused:relative-external'],
  ['rel-mac-door-absolute-still-opens', 'door:mac'],
  ['rel-link-to-a-pdf-refused', 'refused:relative-external'],
  ['rel-image-still-opens', 'door:image'],
  // The two pure halves, read without a filesystem.
  ['inside-base', '111000'],
  ['usable-base', '1100000'],
  // --- HIS THREE SCREENSHOTS, grammar and door together --------------------
  // Each was refused at the parent commit, and each names which lift it needs:
  // one is lift one alone, two is lift two alone, and three needs BOTH because
  // refusal 8 fires first, so with only lift two in it never reaches the
  // relative rule at all.
  ['screenshot-one', 'door:editor'],
  ['screenshot-two', 'door:editor'],
  ['screenshot-three', 'door:editor:93'],
  // ...and the same two on a pane whose session carries no project.
  ['screenshot-two-without-a-base', 'refused:not-absolute'],
  ['screenshot-three-without-a-base', 'refused:not-absolute:93'],
  // ...and the third in a pane exactly as wide as its row, which is the
  // wrapped case and stays refused whatever else is lifted.
  ['screenshot-three-at-the-width', 'no-span'],
  // --- rule 3, the closed set ----------------------------------------------
  ['external-allow', '.pdf'],
  // --- refusal 8 and the span grammar --------------------------------------
  ['span-plain', '/a/b.md@6-13'],
  ['span-line-suffix', '/a/b.ts@4-16:42'],
  ['span-url-left-alone', '/a/b.md@27-34'],
  ['span-fraction', ''],
  // PHASE 250 LIFT ONE. A path at the end of an ordinary sentence, in a pane
  // far wider than the sentence, is OFFERED — that is the operator's own
  // first screenshot, and at the parent commit this row read ''.
  ['span-ends-the-row', '/a/b.md@6-13'],
  // ...and a wrapped path stays refused, which is what the lift is bounded
  // by: the span's last cell IS the pane's last column.
  ['span-ends-the-row-at-the-width', ''],
  ['span-past-the-width', ''],
  // The head half, and the three readings that tell its clauses apart.
  ['span-heads-a-row-below-a-full-one', ''],
  ['span-heads-a-row-below-a-short-one', '/b.md@0-5'],
  // THE PADDING. 32.2% of his rows run out to the width in spaces their drawn
  // text does not reach, and research 111 section 4.1's own spelling reads
  // every one of those as a wrap. This is the reading that refuses it.
  ['span-heads-a-row-below-a-padded-one', '/b.md@0-5'],
  ['span-heads-a-row-below-a-full-sentence', '/b.md@0-5'],
  ['span-heads-an-uncontinued-row', '/b.md@0-5'],
  ['span-behind-a-gutter', ''],
  ['span-behind-a-gutter-below-a-short-one', '/b.md@4-9'],
  // The one reading that fails CLOSED rather than by a column comparison.
  ['span-with-a-short-map', '']
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
  // PHASE 250. `answerPathDoor` takes an optional BASE and will join a
  // relative spelling to it. The door that leaves Tortie is given none, so a
  // spelling that is not absolute on its own never reaches macOS — and the
  // missing argument is the rule, which is why it is read rather than assumed.
  if (asked !== -1 && !/answerPathDoor\(raw\)/.test(body)) {
    out.push('the external door hands a base to the sequence, so a relative spelling could be resolved on its way to macOS');
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
    ['a base is handed to the sequence', SHIPPED.replace('answerPathDoor(raw)', 'answerPathDoor(raw, base)'), 1],
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
// Rules 7 and 8. The provider.
// ---------------------------------------------------------------------------

{
  const PANE = 'src/renderer/terminal/TerminalPane.tsx';
  const LINKS = 'src/renderer/terminal/path-links.ts';
  const paneCode = code(PANE);

  // 7a. Registered AFTER the web links addon, which is what stops a path link
  // taking a span from a URL. Read as two offsets in one file, because that is
  // exactly what xterm's own `_removeIntersectingLinks` reads.
  const web = paneCode.indexOf('new WebLinksAddon(');
  const ours = paneCode.indexOf('registerLinkProvider(');
  if (web === -1) {
    fail('7. TerminalPane no longer loads WebLinksAddon, so registration order says nothing');
  } else if (ours === -1) {
    fail('7. TerminalPane registers no link provider, so a path in a transcript opens nothing');
  } else if (ours < web) {
    fail('7. the path provider is registered BEFORE WebLinksAddon, so it can take a span from a URL');
  }

  // 7b. The machine question is a CLOSURE read per hover, never a value read
  // once at mount — the same one PHASE 96's Cmd-K asks one screen above — AND
  // IT FAILS CLOSED. The Phase 247 fix round's finding 4: it shipped as
  // `sessionRow()?.machine === undefined`, which answers TRUE when there is no
  // row at all, and "no row" is the state a session that has just gained a
  // machine passes through. Both neighbours fail the other way, `attachPaths`
  // on `session === null` and Phase 96's own list. So the predicate is a named
  // function and this rule asks for the clause by its own spelling.
  if (!/isLocal:\s*\(\)\s*=>\s*paneIsLocal\(sessionRow\(\)\)/.test(paneCode)) {
    fail('7. the provider’s local-only predicate is not `paneIsLocal(sessionRow())`, so it is either captured at mount or spelled somewhere this gate cannot read it');
  }
  const local = functionBodyOf(code(LINKS), 'paneIsLocal');
  if (local === null) {
    fail('7. src/renderer/terminal/path-links.ts declares no paneIsLocal, so refusal 5’s own predicate is unreadable');
  } else if (!/row !== undefined/.test(local)) {
    fail('7. paneIsLocal does not refuse a pane with NO session row, so the one guard that carries refusal 5 opens when it is asked a question it cannot answer');
  } else if (!/row\.machine === undefined/.test(local)) {
    fail('7. paneIsLocal does not ask whether the session runs on another machine');
  }

  // 7c. ...and the provider is disposed with the pane.
  if (!/pathLinks\.dispose\(\)/.test(paneCode)) {
    fail('7. the link provider is not disposed when the pane unmounts');
  }

  const linksCode = code(LINKS);

  // 8a. The machine question is the FIRST thing provideLinks asks, so a remote
  // pane costs a comparison rather than a buffer read and a round trip.
  const provide = methodBodyOf(linksCode, 'provideLinks');
  if (provide === null) {
    fail('8. src/renderer/terminal/path-links.ts declares no provideLinks');
  } else {
    const asked = provide.indexOf('isLocal()');
    const read = provide.indexOf('this.term.buffer');
    if (asked === -1) {
      fail('8. provideLinks never asks whether the session is on this Mac, and a remote path cannot be told from a local one by looking at it');
    } else if (read !== -1 && asked > read) {
      fail('8. provideLinks reads the buffer before it asks whether the session is on this Mac');
    }
  }

  // 8b. The CLICK asks again — the machine question and the door both.
  const open = methodBodyOf(linksCode, 'open');
  if (open === null) {
    fail('8. src/renderer/terminal/path-links.ts declares no open, so this rule read nothing');
  } else {
    if (!/isLocal\(\)/.test(open)) {
      fail('8. the click does not re-ask whether the session is on this Mac');
    }
    if (!/doorFor\(/.test(open)) {
      fail('8. the click does not re-ask the door, so it acts on the answer a hover cached');
    }
    if (!/cache\.delete\(/.test(open)) {
      fail('8. the click reads the cached answer rather than a fresh one');
    }
  }

  // 8c. A link is built only for a span whose door is a door. This is the
  // rule that keeps "a link that does nothing is worse than no link" true.
  const built = methodBodyOf(linksCode, 'linksFor');
  if (built === null) {
    fail('8. src/renderer/terminal/path-links.ts declares no linksFor');
  } else if (!/answer\.door === null\) continue/.test(built)) {
    fail('8. linksFor builds a link for a span no door accepts, so a person can press something that will not work');
  }

  // 8d. The provider never writes and never asks for bytes: the ONE ask it
  // makes is the classify one, and it names the option.
  if (!/classify: true/.test(linksCode)) {
    fail('8. the provider does not ask drop:prepare for the read-only classification, so a hover may write');
  }
  for (const word of ['persist(', 'writeFile', 'readFile', 'fs:reveal', 'openWith(']) {
    if (linksCode.includes(word)) {
      fail(`8. the provider names ${word}, and a hover asks for a classification and nothing else`);
    }
  }

  // The method reader, proved. Four of these five must answer null.
  const METHOD_PLANTS = [
    ['a real method', 'class A {\n  open(x) {\n    return 1;\n  }\n}', true],
    ['an interface declaration only', 'interface D {\n  open(x: string): Promise<string>;\n}', false],
    ['a modifier stack', 'class A {\n  private async open(x): Promise<void> {\n    return;\n  }\n}', true],
    ['no such name', 'class A {\n  shut(x) {\n    return 1;\n  }\n}', false],
    ['a declaration ABOVE the real method', 'interface D {\n  open(x: string): Promise<string>;\n}\nclass A {\n  open(x) {\n    return 2;\n  }\n}', true]
  ];
  let readers = 0;
  for (const [why, text, want] of METHOD_PLANTS) {
    const got = methodBodyOf(text, 'open');
    if ((got !== null) !== want) {
      fail(`8. the method reader read "${why}" as ${got === null ? 'nothing' : 'a body'}, and it must read the other way`);
    } else readers += 1;
  }
  if (readers === METHOD_PLANTS.length && methodBodyOf(METHOD_PLANTS[4][1], 'open')?.includes('return 2') !== true) {
    fail('8. the method reader returned the interface declaration rather than the method below it');
  }

  if (failures.every((f) => !f.includes(' 7. ') && !f.includes(' 8. '))) {
    say('7 and 8. the provider is registered after WebLinksAddon and disposed with the pane, refuses a remote pane before it reads a buffer, builds a link only where a door answered, and the click re-asks both questions');
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
    // The credential family alone, so removing it goes red on its own rather
    // than only under the ablation above. The dotenv reading must NOT move,
    // which is what tells the two rules apart.
    name: 'the credential family is taken back out of the name list',
    file: 'preview-types.ts',
    edits: [{ from: 'matches: (name) => CREDENTIAL_FILE_NAMES.has(name)', to: 'matches: () => false' }]
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
        from: "    return { door: 'mac', path: real };\n  }\n  return { door: 'editor', path: real };",
        to: "    return { door: 'editor', path: real };\n  }\n  return { door: 'mac', path: real };"
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
    // The Phase 247 fix round. The SPELLING clause stays, so this goes red on
    // the realpath readings alone — which is what tells the two apart.
    name: 'the mount is asked of the spelling only, so a symlink walks past it',
    file: 'path-doors.ts',
    edits: [{ from: 'if (real !== null && onRefusedMount(real)) {', to: 'if (false) {' }]
  },
  {
    name: 'the renderer’s cheap refusal is wider than main’s answer',
    file: 'path-doors.ts',
    edits: [
      {
        from: "  return spelling.startsWith('/') || spelling.startsWith('~');",
        to: "  return spelling.startsWith('/');"
      }
    ]
  },
  {
    // PHASE 250 LIFT TWO. Containment is what makes a wrong base fail closed
    // rather than open a file in a tree nobody named.
    name: 'a resolved relative path may leave its base',
    file: 'path-doors.ts',
    edits: [
      {
        from: "  if (facts.resolvedFrom !== null && !insideBase(real, facts.resolvedFrom)) {",
        to: '  if (false) {'
      }
    ]
  },
  {
    name: 'containment is a bare prefix, so /a/bc counts as inside /a/b',
    file: 'path-doors.ts',
    edits: [
      {
        from: '  return real === root || real.startsWith(`${root}/`);',
        to: '  return real.startsWith(root);'
      }
    ]
  },
  {
    name: 'the filesystem root is a base after all, and then containment says nothing',
    file: 'path-doors.ts',
    edits: [
      {
        from: "  return base.startsWith('/') && base.length > 1 && !hasControlCharacter(base);",
        to: "  return base.startsWith('/');"
      }
    ]
  },
  {
    name: 'a resolved relative path is handed to LaunchServices',
    file: 'path-doors.ts',
    edits: [
      {
        from: "    if (facts.resolvedFrom !== null) {\n      return { door: null, refusal: 'relative-external' };\n    }",
        to: ''
      }
    ]
  },
  {
    name: 'the base is not realpath’d, so a project reached through a link contains nothing',
    file: 'path-door.ts',
    edits: [{ from: '    root = await realpath(base);', to: '    root = base;' }]
  },
  {
    name: 'a `~` spelling is joined to the base like any other',
    file: 'path-door.ts',
    edits: [{ from: "  if (spelling.startsWith('~')) return null;", to: '' }]
  },
  {
    name: 'the join happens for an ABSOLUTE spelling too',
    file: 'path-door.ts',
    edits: [
      {
        from: "  if (!spelling.startsWith('/')) {\n    const joined = await resolveAgainstBase(spelling, base);",
        to: "  {\n    const joined = await resolveAgainstBase(spelling, base);"
      }
    ]
  },
  {
    name: 'the resolved spelling is handed on without saying it was relative',
    file: 'path-door.ts',
    edits: [{ from: '        resolvedFrom: joined.base', to: '        resolvedFrom: null' }]
  },
  {
    name: 'refusal 8 is lifted at the pane’s last column, so a wrapped path is offered',
    file: 'path-spans.ts',
    edits: [{ from: 'if (endColumn >= edges.width) return true;', to: '' }]
  },
  {
    // PHASE 250's lift, put back. This is the ablation that proves the lift is
    // really in the tree rather than only in a comment: with the shipped Phase
    // 247 clause restored, a path at the end of an ordinary sentence is
    // refused again and his first screenshot goes back to doing nothing.
    name: 'refusal 8 refuses a path that merely ENDS its row (the Phase 247 spelling)',
    file: 'path-spans.ts',
    edits: [
      {
        from: '  const endColumn = edges.columns[span.end];',
        to: '  if (span.end === row.length) return true;\n  const endColumn = edges.columns[span.end];'
      }
    ]
  },
  {
    name: 'a span whose end column the map does not reach is offered anyway',
    file: 'path-spans.ts',
    edits: [{ from: 'if (endColumn === undefined) return true;', to: 'if (endColumn === undefined) return false;' }]
  },
  {
    name: 'refusal 8 is lifted at the row’s head',
    file: 'path-spans.ts',
    edits: [{ from: 'if (span.start !== headAt) return false;', to: 'return false;' }]
  },
  {
    // The Phase 247 head half, which asked nothing about the predecessor's own
    // last column: every row above ending in a path character read as a wrap.
    name: 'the predecessor’s own last column is not asked',
    file: 'path-spans.ts',
    edits: [{ from: 'if (edges.aboveEnd < edges.width) return false;', to: '' }]
  },
  {
    name: 'the predecessor’s last character is not asked, so a sentence reads as a wrap',
    file: 'path-spans.ts',
    edits: [
      {
        from: "  return PATH_CHARACTER.test(above[above.length - 1] ?? '');",
        to: '  return true;'
      }
    ]
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
  // path-doors.ts's own './image-types' and './preview-types' resolve INSIDE
  // the staged directory, which is why both are copied: the credential family
  // ablation edits preview-types.ts, and an ablation that could only edit the
  // SHIPPING copy would be changing the tree under the live reading.
  cpSync(join(repoRoot, PREVIEW), join(dir, 'preview-types.ts'));
  cpSync(join(repoRoot, IMAGES), join(dir, 'image-types.ts'));
  const door = readFileSync(join(dir, 'path-door.ts'), 'utf8');
  writeFileSync(
    join(dir, 'path-door.ts'),
    door.replaceAll('@shared/path-doors', './path-doors')
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
// Rule 11. THE UNDERLINE IS DRAWN IN CELLS AND NOT IN STRING INDICES.
// ---------------------------------------------------------------------------

/**
 * The defect this rule exists for, so a later round does not undo it for
 * tidiness. The provider shipped building xterm's link range out of the STRING
 * indices `pathSpansInRow` returns, and xterm underlines and hit-tests in CELL
 * COLUMNS. `translateToString` advances the column by each cell's WIDTH while
 * appending however many UTF-16 units that cell holds, which is why the core
 * takes a fourth `outColumns` argument the public `IBufferLine` drops.
 *
 * Nine of the fourteen glyph rows below move the column, `⚠️ ` in front of a
 * path among them, and with the string index used as a column the underline
 * sits one cell to the left of the path: the first character is dead and the
 * cell past the end hands the file over. Nothing dangerous executes either
 * way, because the door sequence decides what opens — but a link on the wrong
 * text is worse than no link, which is refusal 2's own sentence.
 *
 * The probe is graded against xterm's OWN map and against the CELLS
 * themselves, and it is run live and then over one ablated copy.
 */
function runColumnsProbe(modules) {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/p247/cell-columns-probe.mts'],
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
    return { error: `the columns probe did not run: ${(probe.stderr || '').slice(-600) || '(no output)'}` };
  }
  const line = probe.stdout.trim().split('\n').pop() ?? '';
  try {
    return JSON.parse(line);
  } catch {
    return { error: `the columns probe printed no JSON: ${probe.stdout.slice(0, 400)}` };
  }
}

{
  const cols = runColumnsProbe(null);
  if (cols.error !== undefined) {
    fail(`11. ${cols.error}`);
  } else {
    const rows = 14;
    if (cols['columns-agree-with-xterm'] !== `${String(rows)}/${String(rows)}`) {
      fail(
        `11. the shipping cellColumns disagreed with xterm's own outColumns: ${String(cols['columns-agree-with-xterm'])} agreed (${String(cols.disagreements)})`
      );
    }
    if (cols['underline-sits-on-the-path'] !== `${String(rows)}/${String(rows)}`) {
      fail(
        `11. the columns the range names do not hold the path's own text: ${String(cols['underline-sits-on-the-path'])} (${String(cols.disagreements)})`
      );
    }
    // A rule whose fixtures all read zero would pass with the identity map.
    if (typeof cols['glyphs-that-move-the-column'] !== 'number' || cols['glyphs-that-move-the-column'] < 5) {
      fail(
        `11. only ${String(cols['glyphs-that-move-the-column'])} of the ${String(rows)} glyph rows move the column, so this rule could pass with the string index used as one`
      );
    }
    // The provider must really index through the map.
    const linksBody = code('src/renderer/terminal/path-links.ts');
    const provide = methodBodyOf(linksBody, 'provideLinks');
    const built = methodBodyOf(linksBody, 'linksFor');
    if (provide === null || !/cellColumns\(line\)/.test(provide)) {
      fail('11. provideLinks does not take the row’s column map, so the range is in string indices');
    }
    if (built === null || !/spanColumns\(span, columns\)/.test(built)) {
      fail('11. linksFor does not turn the span into columns, so the underline is drawn where the string says rather than where the cells are');
    }
    if (built !== null && /x: span\.start \+ 1|x: span\.end\b/.test(built)) {
      fail('11. linksFor still hands xterm a string index as a column');
    }

    // ...and the ablation. The identity map is exactly what shipped.
    sweepAblations();
    const dir = join(mainFs, `${ABLATION_PREFIX}cols`);
    try {
      stage(dir);
      const target = join(dir, 'path-spans.ts');
      const before = readFileSync(target, 'utf8');
      const from = '    const units = chars.length === 0 ? 1 : chars.length;';
      if (!before.includes(from)) {
        fail('11. the columns ablation found nothing to edit in path-spans.ts');
      } else {
        writeFileSync(
          target,
          before.replace(from, '    const units = 1;\n    void chars;')
        );
        const got = runColumnsProbe(dir);
        if (got.error !== undefined) {
          fail('11. the columns ablation stopped the probe running instead of moving a reading, so it proves nothing');
        } else if (
          got['columns-agree-with-xterm'] === cols['columns-agree-with-xterm'] &&
          got['underline-sits-on-the-path'] === cols['underline-sits-on-the-path']
        ) {
          fail('11. a cellColumns that counts every cell as one character read the same as the shipping one, so this rule cannot fail');
        }
      }
    } finally {
      sweepAblations();
    }
  }
  if (failures.every((f) => !f.includes(' 11. '))) {
    say(
      `11. the shipping column map is xterm's own over ${String(14)} glyph rows, ${String(runColumnsProbeMoved(cols))} of which really move the column, and the columns the range names hold the path's own text`
    );
  }
}

function runColumnsProbeMoved(cols) {
  return typeof cols['glyphs-that-move-the-column'] === 'number'
    ? cols['glyphs-that-move-the-column']
    : 0;
}

// ---------------------------------------------------------------------------
// Rule 12. THE RENDERER'S OWN CHEAP REFUSAL, and it is WIDER than main's.
// ---------------------------------------------------------------------------

/**
 * Three spans in four are relative — re-derived over the operator's own 25
 * live panes and 56,977 rows at 1,144 of 1,552 distinct targets — and until
 * Phase 250 main answered every one of them `not-absolute`, so the renderer
 * refused them itself without a round trip.
 *
 * WITH A BASE, MAIN CAN ANSWER A DOOR, so the cheap refusal narrowed to
 * `couldBeAsked`: a relative spelling on a pane with no usable base, and
 * nothing else. A rule duplicated on two sides of a channel is a rule that
 * drifts, so it is still ONE predicate and it is COMPOSED from the two shipped
 * ones rather than spelled a third time. The direction it may drift in is
 * asked rather than asserted, now with a base and without: everything it
 * refuses must really answer `not-absolute` from main, asked the same way.
 */
{
  const doorsCode = code(DOORS);
  const linksCode = code('src/renderer/terminal/path-links.ts');
  const body = functionBodyOf(doorsCode, 'couldBeAbsolute');
  if (body === null) {
    fail('12. src/shared/path-doors.ts declares no couldBeAbsolute');
  } else if (!/startsWith\('~'\)/.test(body)) {
    fail('12. couldBeAbsolute does not admit a `~` spelling, so it is narrower than main’s answer and drops links in silence');
  }
  const asksBody = functionBodyOf(doorsCode, 'couldBeAsked');
  if (asksBody === null) {
    fail('12. src/shared/path-doors.ts declares no couldBeAsked');
  } else if (!/couldBeAbsolute\(/.test(asksBody) || !/usableBase\(/.test(asksBody)) {
    fail('12. couldBeAsked does not compose the two shipped predicates, so the cheap refusal is a third spelling of a rule that already has one');
  }
  const doorFor = methodBodyOf(linksCode, 'doorFor');
  if (doorFor === null) {
    fail('12. src/renderer/terminal/path-links.ts declares no doorFor');
  } else {
    // PHASE 250 narrowed this from `couldBeAbsolute` to `couldBeAsked`: with a
    // base a relative spelling can reach a door, so what is refused here is a
    // spelling that can never reach one at all.
    if (!/couldBeAsked\(/.test(doorFor)) {
      fail('12. the renderer does not ask the shared cheap refusal, so a pane with no base makes a round trip for every relative span on it');
    }
    const asked = doorFor.indexOf('couldBeAsked(');
    const cached = doorFor.indexOf('this.cache.get(');
    if (asked !== -1 && cached !== -1 && asked > cached) {
      fail('12. the renderer caches a spelling it was always going to refuse');
    }
  }
  // ...and there is only ONE spelling of the rule in the renderer.
  if (/startsWith\('\/'\)/.test(linksCode)) {
    fail('12. the renderer spells the absolute rule itself rather than asking the shared predicate, so the two can drift');
  }
  if (failures.every((f) => !f.includes(' 12. '))) {
    say('12. one predicate decides what can never reach a door, composed from the two shipped ones, asked before the renderer caches or asks main, and everything it refuses really answers not-absolute — with a base and without');
  }
}

// ---------------------------------------------------------------------------
// Rule 13. REFUSAL 8 IS ASKED ABOUT THE PANE'S WIDTH, AND BOTH ROWS ARE DRAWN.
// ---------------------------------------------------------------------------

/**
 * PHASE 250 LIFT ONE, at the one call site that supplies its facts.
 *
 * `edgeRefusal` is pure and the gate above drives it exhaustively, but every
 * one of its answers is only as good as what the provider hands it. Three
 * things can go wrong there and none of them is visible to a pure test:
 *
 *   - THE WIDTH. It must be `Terminal.cols`. A row's own length is what the
 *     Phase 247 spelling used, and after a resize `IBufferLine.length` may
 *     exceed the width, so a rule that compares against the row is measuring
 *     yesterday's pane.
 *   - THE ROW ABOVE MUST BE READ AS DRAWN. 32.2% of the operator's rows carry
 *     trailing whitespace out to the pane width while their drawn content
 *     stops short. `translateToString(false)` hands back the padding, and
 *     research 111 section 4.1's own spelling reads every padded row as a
 *     wrap — which is why it refuses 41 of 272 spans where this one refuses 3.
 *   - THE ROW ABOVE NEEDS ITS OWN COLUMN MAP. Its drawn end column is a
 *     column and not a string index, for the same reason rule 11 exists.
 *
 * Written as a function so it can be PROVED ON FIXTURES: a scan that cannot
 * fail is never mistaken for a scan that passed.
 */
function refusalEightWiringFindings(text) {
  const out = [];
  const body = methodBodyOf(stripComments(text), 'provideLinks');
  if (body === null) {
    out.push('there is no provideLinks, so this rule read nothing');
    return out;
  }
  if (!/width:\s*this\.term\.cols\b/.test(body)) {
    out.push("refusal 8 is not asked about the pane's own width, so it is measuring the row rather than the edge");
  }
  if (/translateToString\(false\)/.test(body)) {
    out.push('a row is read with its trailing padding, and a padded predecessor reads as a wrap');
  }
  if (!/cellColumns\(lineAbove\)/.test(body)) {
    out.push("the row above has no column map of its own, so its drawn end is a string index rather than a column");
  }
  if (!/aboveEnd:/.test(body)) {
    out.push("the predecessor's own last column is never handed over, so the head half cannot ask it");
  }
  return out;
}

{
  const LINKS = 'src/renderer/terminal/path-links.ts';
  for (const finding of refusalEightWiringFindings(source(LINKS))) fail(`13. ${finding}`);

  const SHIPPED = `class P {
  provideLinks(bufferLineNumber, callback) {
    const line = buffer.getLine(y);
    const row = line.translateToString(true);
    const columns = cellColumns(line);
    const lineAbove = y > 0 ? buffer.getLine(y - 1) : undefined;
    const above = lineAbove?.translateToString(true) ?? null;
    const spans = pathSpansInRow(row, {
      width: this.term.cols,
      columns,
      above,
      aboveEnd: lineAbove === undefined || above === null ? 0 : (cellColumns(lineAbove)[above.length] ?? 0)
    });
    callback(spans);
  }
}`;
  const PLANTS = [
    ['the shipping shape', SHIPPED, 0],
    ["the row's own length stands in for the width", SHIPPED.replace('width: this.term.cols', 'width: row.length'), 1],
    ['the predecessor is read with its padding', SHIPPED.replace("lineAbove?.translateToString(true)", 'lineAbove?.translateToString(false)'), 1],
    ['the predecessor gets no column map', SHIPPED.replace('cellColumns(lineAbove)[above.length]', 'above.length'), 1],
    ['the predecessor\u2019s end is never handed over', SHIPPED.replace(/\n\s*aboveEnd:[^\n]*/, ''), 1],
    ['there is no provideLinks at all', 'export const nothing = 1;', 1]
  ];
  let caught = 0;
  for (const [why, text, want] of PLANTS) {
    const got = refusalEightWiringFindings(text).length;
    if ((got > 0 ? 1 : 0) !== want) {
      fail(`13. the scanner read "${why}" as ${got > 0 ? 'a finding' : 'clean'}, and it must read the other way`);
    } else if (want === 1) caught += 1;
  }
  if (failures.every((f) => !f.includes(' 13. '))) {
    say(
      `13. refusal 8 is asked about Terminal.cols, both rows are read as DRAWN and the row above carries its own column map; ${String(caught)} of ${String(PLANTS.length)} planted shapes were caught and the shipping one was not`
    );
  }
}

// ---------------------------------------------------------------------------
// Rule 14. THE BASE IS THE PANE'S OWN, READ PER HOVER, AND PART OF THE KEY.
// ---------------------------------------------------------------------------

/**
 * PHASE 250 LIFT TWO, at the renderer, where three things can go wrong that no
 * pure test of the join can see.
 *
 *   - THE BASE MUST BE READ PER HOVER AND PER CLICK. A session's project is a
 *     live fact and the provider outlives it; the whole of refusal 5 is built
 *     on closures for exactly this reason, and a captured base would answer
 *     for the project the pane had when it mounted.
 *   - THE BASE MUST BE PART OF THE CACHE KEY. The same relative spelling under
 *     two bases is two different files, and a cached answer keyed by the
 *     spelling alone would hand one pane's file to another. An ABSOLUTE
 *     spelling is keyed by itself, so Phase 247's entries are unchanged.
 *   - THE BASE MUST REACH MAIN. `classifyThroughBridge` is the only ask, and
 *     it carries the base on the options object `drop:prepare` already takes —
 *     no new channel, which is research 107 refusal 6.
 *
 * Written as a function so it can be PROVED ON FIXTURES.
 */
function relativeBaseWiringFindings(text) {
  const out = [];
  const code = stripComments(text);
  const doorFor = methodBodyOf(code, 'doorFor');
  const linksFor = methodBodyOf(code, 'linksFor');
  const open = methodBodyOf(code, 'open');
  const keyFor = methodBodyOf(code, 'keyFor');
  if (doorFor === null || linksFor === null || open === null) {
    out.push('the provider is missing one of doorFor, linksFor and open, so this rule read nothing');
    return out;
  }
  // ONE spelling of the key, and it carries the base for a relative spelling
  // and for nothing else.
  if (keyFor === null || !/couldBeAbsolute\(target\) \? target : `\$\{base\}/.test(keyFor)) {
    out.push('a relative answer is not keyed by its base, so one pane’s project can hand a file to another’s');
  }
  if (!/this\.keyFor\(target, base\)/.test(doorFor)) {
    out.push('doorFor does not compose its key from the base');
  }
  if (!/this\.keyFor\(span\.target, base\)/.test(open)) {
    out.push('the click drops a cache entry under a key of its own, which is a second spelling of the key');
  }
  if (/this\.cache\.get\(target\)|this\.cache\.set\(target\b/.test(doorFor)) {
    out.push('the cache is still addressed by the spelling alone');
  }
  if (!/const base = this\.deps\.repoPath\(\)/.test(linksFor)) {
    out.push('the row’s base is not read from the pane per hover');
  }
  if (!/const base = this\.deps\.repoPath\(\)/.test(open)) {
    out.push('the click does not read the base afresh, so it acts on the project the pane used to have');
  }
  const ask = methodBodyOf(code, 'ask');
  if (ask === null || !/this\.deps\.classify\(\[target\], base\)/.test(ask)) {
    out.push('the ask does not carry the base to main, so main has nothing to join a relative spelling to');
  }
  const bridge = functionBodyOf(code, 'classifyThroughBridge');
  if (bridge === null) {
    out.push('there is no classifyThroughBridge');
  } else if (!/classify: true, base/.test(bridge)) {
    out.push('the production ask does not put the base on drop:prepare’s own options object');
  }
  return out;
}

{
  const LINKS = 'src/renderer/terminal/path-links.ts';
  for (const finding of relativeBaseWiringFindings(source(LINKS))) fail(`14. ${finding}`);

  const SHIPPED = `class P {
  keyFor(target, base) {
    return couldBeAbsolute(target) ? target : \`\${base}\\u0000\${target}\`;
  }
  async doorFor(target, base) {
    if (!couldBeAsked(target, base)) return { door: null, refusal: 'not-absolute' };
    const key = this.keyFor(target, base);
    const held = this.cache.get(key);
    return held ?? this.ask(key, target, base);
  }
  async ask(key, target, base) {
    const [item] = await this.deps.classify([target], base);
    this.cache.set(key, { at: 0, answer: item.door });
    return item.door;
  }
  async linksFor(spans, columns, y) {
    const base = this.deps.repoPath();
    const answers = await Promise.all(spans.map((s) => this.doorFor(s.target, base)));
    return answers;
  }
  async open(span) {
    const base = this.deps.repoPath();
    this.cache.delete(this.keyFor(span.target, base));
    const answer = await this.doorFor(span.target, base);
    this.deps.openInTortie(answer.path, base, span.line);
  }
}
export async function classifyThroughBridge(paths, base) {
  const { items } = await drop.prepare(paths, { classify: true, base });
  return items;
}`;
  const PLANTS = [
    ['the shipping shape', SHIPPED, 0],
    [
      'the key is the spelling alone',
      SHIPPED.replace(/return couldBeAbsolute[^\n]*/, 'return target;'),
      1
    ],
    [
      'the click spells the key a second time',
      SHIPPED.replace('this.cache.delete(this.keyFor(span.target, base));', 'this.cache.delete(span.target);'),
      1
    ],
    ['the base is captured rather than read per hover', SHIPPED.replace('const base = this.deps.repoPath();\n    const answers', 'const base = this.base;\n    const answers'), 1],
    ['the click reuses a stale base', SHIPPED.replace('const base = this.deps.repoPath();\n    this.cache.delete', 'const base = this.lastBase;\n    this.cache.delete'), 1],
    ['the ask never carries the base', SHIPPED.replace('this.deps.classify([target], base)', 'this.deps.classify([target])'), 1],
    ['the production ask drops the base', SHIPPED.replace('{ classify: true, base }', '{ classify: true }'), 1],
    ['there is no provider at all', 'export const nothing = 1;', 1]
  ];
  let caught = 0;
  for (const [why, text, want] of PLANTS) {
    const got = relativeBaseWiringFindings(text).length;
    if ((got > 0 ? 1 : 0) !== want) {
      fail(`14. the scanner read "${why}" as ${got > 0 ? 'a finding' : 'clean'}, and it must read the other way`);
    } else if (want === 1) caught += 1;
  }

  // ...and the CONTRACT half: the base rides an options object that already
  // exists, which is research 107 refusal 6, and main validates it as a frame
  // rather than trusting the declared type.
  const dropIpc = code('src/main/drop/ipc.ts');
  if (!/typeof base === 'string'/.test(dropIpc)) {
    fail('14. src/main/drop/ipc.ts does not check that the base on the frame is a string, and a declared type is not a promise about a frame');
  }
  const channels = code('src/shared/ipc/terminal.ts');
  if (/'drop:classify'|'fs:resolveRelative'|'path:resolve'/.test(channels)) {
    fail('14. a new IPC channel was added for the base, and refusal 6 says the ask rides drop:prepare or it does not ship');
  }
  const prepare = code('src/main/drop/prepare.ts');
  const prepared = functionBodyOf(prepare, 'preparePaths');
  if (prepared === null || !/classify \? options\.base : undefined/.test(prepared)) {
    fail('14. the base is read outside the classify ask, and a DROP hands main a path webUtils already resolved with nothing to be relative to');
  }

  if (failures.every((f) => !f.includes(' 14. '))) {
    say(
      `14. the base is the pane's own project read per hover and per click, it is part of the key for a relative spelling and of nothing else, it rides drop:prepare's existing options and is validated there, and it is read only under classify; ${String(caught)} of ${String(PLANTS.length)} planted shapes were caught and the shipping one was not`
    );
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
