#!/usr/bin/env node
/**
 * `npm run conformance:pathdoors`, the gate on which door a path in a
 * transcript takes (Phase 247).
 *
 * About 15 to 20 s (14.4, 16.6 and 19.3 s measured on 2026-10-14 with his
 * absolute-only round's readings, at load averages between 27 and 200;
 * 15.9, 16.7 and 20.1 s on 2026-10-13 at load averages between 560 and 950,
 * the one tsx spawn rules 17 and 18 share included; 10.6 and 11.1 s before
 * rule 18, at a load average near 35, and 39 s on a cold first run). It
 * launches no Electron, opens no window, starts no tmux server, spawns no
 * agent, makes no request, reads nothing under the person's home, and
 * writes nothing outside scratch directories it removes in a `finally`.
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
 *  16. THE PORTED VS CODE ROWS RUN AGAINST OUR GRAMMAR (Phase 253). The
 *      suffix table narrowed to the delimited clauses, `[` `]` in a segment
 *      with the tokenizer balance rule, and the bare FILE-SHAPED name are
 *      each pinned in the matrix, each ablated red one clause at a time, and
 *      the upstream rows they were ported from are attributed by file and
 *      commit in the grammar and in the probe. The door half is asserted
 *      UNCHANGED: every new spelling still ends at decidePathDoor.
 *  17. A PATH BROKEN OVER ROWS OPENS WHOLE, AND ONLY BEHIND THE DOOR (Phase
 *      347, issue 40). `joinedPathAt` is DRIVEN over a fixture table (issue
 *      40's own rows, a soft wrap, both agents' continuation shapes, one
 *      fixture per clause J1 to J11 and per cap, a decorated row, and the
 *      fix round's word wrap below a path that ends short of the edge, whose
 *      joined name EXISTS, which must read exactly as today; J9 is Phase
 *      347.1's fix round as his ruled round made it: a join is refused WHOLE
 *      when a boundary it crosses or stops at reads a cell past the pane's
 *      width, which a narrowed pane leaves on xterm's alternate buffer, and
 *      never cut there into a shorter join, which the reverify's F1 measured
 *      opening the project's own file of a tail's name; J10 is his ruling of
 *      2026-10-14, "Join absolute paths only": a chain whose joined target
 *      starts with neither `/` nor `~/` is refused whole, because a relative
 *      chain the walk stopped short of the path's real start opened the
 *      project's own copy of a file printed in another worktree, which the
 *      reverify's census measured in 4,031 of 1,474,667 real layouts; J11
 *      refuses a chain a breaker of ANY limit the chain allows could have
 *      cut out of a longer token: a top piece alone on its row below a row
 *      that reaches the widest row the chain draws, or within the top
 *      piece's first fragment of it (a cut at the limit, or before a `/`),
 *      counting the cells a breaker may count past what xterm drew (an
 *      emoji Ink counts as two) and a wide glyph as one, or below a row that
 *      ends in a root a path goes on from (`~`, a `$` variable, a URL); and
 *      a bottom piece alone on its row at the widest row above it, unless
 *      the row below starts with a character no name goes on with or the
 *      piece ends in a line suffix (its fix round: the attack lens's Python
 *      and Rust textwrap, an emoji row, a breaker that breaks before `/`,
 *      a soft wrap ending in `]`, read one column for every row a breaker
 *      cut, which is wrap-ansi's hard mode alone; one ablation per clause);
 *      and J8 at the chain's top is GONE, measured redundant under J10, so
 *      its readings belong to J10's ablation, build/p3471/SPEC.md D14 to D16),
 *      and the provider is DRIVEN over a staged copy: one link from the
 *      first cell to the last when the door accepts the join, the row spans
 *      inside it dropped only then, and when the door refuses it the row's
 *      links equal today's, re-derived independently. Its wiring is READ:
 *      the join is asked about Terminal.cols, the buffer's end, drawn rows
 *      with their own column maps, and the same doorFor in the same round
 *      trip. It reads NO `isWrapped`, which research 115 §4 measured present
 *      and WRONG after the two repaints a row routinely passes through; the
 *      proof is the drawn rows, the width and the door. One ablation per
 *      clause, each red.
 *  18. A JOIN NEVER TAKES A CELL FROM A ROW SPAN THE DOOR ACCEPTS (Phase
 *      347.1, his ruling of 2026-10-13, build/p3471/SPEC.md D2 and §6.2).
 *      This is the guarantee; J1 to J11 in rule 17 are shape rules and
 *      refusals, and two rounds of shape rules still moved links that opened
 *      at the parent. A
 *      join is offered only when the door refuses every span that any row it
 *      covers draws today and that shares a cell with it, asked in the same
 *      round trip, so a cell that opens a file today opens the same file
 *      after. DRIVEN over fourteen fixtures, every row hovered: a piece of
 *      issue 40's path that is itself a file, the third reverify's list
 *      shapes, an indented item below a folder on the last column (and,
 *      since his absolute-only round, its absolute twin, the one a join can
 *      still reach), each reading exactly TODAY'S links re-derived without
 *      the provider; a fragment refusal 8 hid, and an accepted span beside
 *      the join, reading the join; a row that cannot be read twice, refusing
 *      it; and (the fix round, lens A's ablation A1b) a fragment the IMAGE
 *      door and one the MAC door accepts, each held exactly as an editor one
 *      is, because the door's kind does not matter to the rule. `rowSpansAt`
 *      is shown equal to the provider's own derivation on every row. Its
 *      wiring is READ and proved on plants: the SAME reader the join reads,
 *      `Terminal.cols`, the spans under the join in the one `Promise.all`, a
 *      missing answer read as accepted, and one cell test in `src/`. Nine
 *      ablations, one clause each, each red on every reading it owns. That
 *      the rule judges EVERY row the join covers rather than the hovered one
 *      is consistency (the chain answers alike from each row, and its
 *      underline never lies over another row's working link) and not what
 *      keeps a cell's link: xterm resolves a cell from its own row's links
 *      alone, so no per-cell corpus can see that clause, and this rule's
 *      two row-range ablations and the unit tests' GR10 are what own it. It
 *      reads no `isWrapped` either, for research 115 §4's reason.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tsxCli } from './ts-runner.mjs';
import { stageProvider, writeStage } from './p3471/stage.mjs';
import { blockAt, callArguments, closeOf, functionBodyOf, stripComments } from './scan-source.mjs';

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
  // The TWO readings that fail CLOSED rather than by a column comparison, and
  // the second is the fix round's: both halves of refusal 8 ask a column map a
  // question it may not be able to answer, and until then they fell in
  // opposite directions. Its control is the row under it.
  ['span-with-a-short-map', ''],
  ['span-heads-a-row-whose-end-cannot-be-read', ''],
  ['span-heads-a-row-whose-end-can-be-read', '/b.md@0-5'],
  // --- PHASE 253, the suffix table narrowed to the delimited clauses --------
  // The `end` in each reading is TRIMMED to the drawn suffix, so the grep
  // remainder (`:match`) is never underlined; at the parent every one of the
  // first six read '' or an untrimmed end.
  ['span-grep-remainder', '/a/b.ts@4-14:12'],
  ['span-grep-remainder-col', '/a/b.ts@4-16:12'],
  ['span-line-range', '/a/b.ts@4-17:12'],
  ['span-tsc-paren', '/a/b.ts@4-18:12'],
  ['span-tsc-colon', '/a/b.ts@4-18:12'],
  ['span-bracket-line', '/a/b.ts@4-15:12'],
  // --- PHASE 253, `[` and `]` in a segment, with the tokenizer balance rule -
  ['span-bracket-segment', '/foo/[bar].baz@5-19'],
  ['span-bracket-kept', '/foo/[bar]@5-15'],
  // --- PHASE 253, the bare FILE-SHAPED name --------------------------------
  ['span-bare-name', 'README.md@6-15'],
  ['span-bare-name-line', 'README.md@6-18:12'],
  ['span-bare-word-refused', ''],
  ['span-bare-version-refused', ''],
  ['span-bare-domain-admitted', 'github.com@4-14'],
  // ...and the SAME doors behind it: the join, containment, the secret name,
  // the mode and the closed Mac door all apply to a bare name, and a pane
  // with no base still refuses before a filesystem call.
  ['rel-bare-resolves', 'door:editor'],
  ['rel-bare-missing', 'refused:missing'],
  ['rel-bare-no-base', 'refused:not-absolute'],
  ['rel-bare-domain-missing', 'refused:missing'],
  ['rel-bare-secret', 'refused:secret-name'],
  ['rel-bare-mac-refused', 'refused:relative-external'],
  ['rel-bare-executable', 'refused:executable-bit'],
  // grammar and door together, one hover each
  ['screenshot-grep', 'door:editor:7'],
  ['screenshot-tsc', 'door:editor:9'],
  ['screenshot-bare', 'door:editor'],
  // rule 16's readings: VS Code's own test rows against OUR grammar, and the
  // bare-filename shape grammar over the measured families.
  ['vscode-rows', '111111111111'],
  ['bare-file-shaped', '111100001110']
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
   *
   * `src/main/pocket/ipc.ts` was added by Phase 333.1 (700f54ed) without its
   * row, so this rule read red from then until Phase 347 declared it: its
   * three calls open Tailscale's download page and app bundle, both compiled
   * constants, on a person's setup press that a harness launch never reaches,
   * and the approval URL Tailscale printed only after `approvalOpens` passes
   * it (https, exactly login.tailscale.com, no port, no credentials). None
   * takes a path it was handed, and none takes anything the renderer sent.
   */
  const DECLARED = new Map([
    ['src/main/config/guide.ts', 'the configuration folder Tortie made'],
    ['src/main/log/ipc.ts', 'the log directory Tortie made'],
    ['src/main/migrate/notice.ts', 'the migration notice’s own folder'],
    ['src/main/fs/path-open.ts', 'PHASE 247, and it re-asks the whole sequence'],
    ['src/main/security/trusted-window.ts', 'an https URL through setWindowOpenHandler, which is not a path'],
    ['src/main/pocket/ipc.ts', 'PHASE 333.1: Tailscale’s compiled download page and app bundle on a setup press, and the approval URL only after approvalOpens; never a path it was handed']
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
    // THE FIX ROUND's, and it is the other half of the same question. Removing
    // this line does not make the head clause skip its comparison: `null` on
    // the left of `<` is 0 in JavaScript, so an unreadable predecessor reads as
    // one that stopped short and the span is OFFERED. That is exactly what
    // `?? 0` did at the call site, and it is why this refusal is spelled and
    // ablated rather than left to the arithmetic.
    name: 'a predecessor whose own end column cannot be read is treated as a short one',
    file: 'path-spans.ts',
    edits: [{ from: 'if (edges.aboveEnd === null) return true;', to: '' }]
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
      { from: 'const SEGMENT = /^[A-Za-z0-9._@%+~$[\\]-]+$/;', to: 'const SEGMENT = /^[A-Za-z0-9._@%+~$[\\]:-]+$/;' }
    ]
  },
  {
    // PHASE 253 rewrote the suffix strip around GREP_SUFFIX, so this ablation
    // is the whole grep clause disabled: no :line survives, no grep remainder
    // is read, and Makefile:339 keeps its colon into the segment test.
    name: 'the :line suffix is not stripped (the grep clause disabled whole)',
    file: 'path-spans.ts',
    edits: [
      {
        from: "  if (grep !== null && suffixHead(grep[1] ?? '')) {",
        to: '  if (false) {'
      }
    ]
  },
  // --- PHASE 253, one clause per adopted mechanism --------------------------
  {
    // The widened regex put back to Phase 247's: no remainder, no ranges. The
    // group count is kept so the surrounding code still compiles.
    name: 'the grep remainder and the ranges are taken back out of GREP_SUFFIX',
    file: 'path-spans.ts',
    edits: [
      {
        from: 'const GREP_SUFFIX = /^(.*?):(\\d+)(?:-\\d+)?(?::(\\d+)(?:-\\d+)?)?(:.*)?$/;',
        to: 'const GREP_SUFFIX = /^(.*?):(\\d+)(?::(\\d+))?()?$/;'
      }
    ]
  },
  {
    name: 'the tsc clause is taken back out',
    file: 'path-spans.ts',
    edits: [
      {
        from: 'const TSC_SUFFIX = /^(.*?)[([](\\d+)(?:[,:] ?(\\d+))?[)\\]]$/;',
        to: 'const TSC_SUFFIX = /^(?!)(.*?)(\\d+)(\\d+)?$/;'
      }
    ]
  },
  {
    name: 'SEGMENT loses its brackets again',
    file: 'path-spans.ts',
    edits: [
      {
        from: 'const SEGMENT = /^[A-Za-z0-9._@%+~$[\\]-]+$/;',
        to: 'const SEGMENT = /^[A-Za-z0-9._@%+~$-]+$/;'
      }
    ]
  },
  {
    // Without the balance test the CLOSE strip eats the `)` off a tsc token
    // and the `]` off a bracketed leaf, so BOTH families this phase adopted
    // go dark at once — which is why the tokenizer rule is its own clause.
    name: 'the tokenizer balance rule is taken back out',
    file: 'path-spans.ts',
    edits: [
      { from: '      if (keepsTrailingCloser(text)) break;\n', to: '' }
    ]
  },
  {
    name: 'a bare file-shaped name is refused again',
    file: 'path-spans.ts',
    edits: [
      {
        from: "  if (!t.includes('/')) return bareFileShaped(t);",
        to: "  if (!t.includes('/')) return false;"
      }
    ]
  },
  {
    name: 'the underline covers the grep remainder again',
    file: 'path-spans.ts',
    edits: [
      {
        from: '      text: span.text.slice(0, visible),\n      end: span.start + visible,\n',
        to: ''
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
  if (/aboveEnd:[\s\S]*?\?\?\s*0\b/.test(body)) {
    out.push("a predecessor whose end column the map cannot answer arrives as 0, which is smaller than every width, so a row nothing could be read from reads as one that did not wrap");
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
      aboveEnd: lineAbove === undefined || above === null ? 0 : (cellColumns(lineAbove)[above.length] ?? null)
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
    ['an unreadable end column falls open as 0', SHIPPED.replace('above.length] ?? null', 'above.length] ?? 0'), 1],
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
// Rule 15. THE MEASURE STEP STILL RUNS, AND IT STILL MEASURES WHAT SHIPPED.
// ---------------------------------------------------------------------------

/**
 * WHAT RESEARCH 114 MEASURED AND WHAT PHASE 250 SHIPPED ARE ONE RULE.
 *
 * Every number in `docs/research/114-phase-250-the-paths-he-actually-clicks.md`
 * came out of `tightEdgeRefusal` in `build/p250/funnel.mts`, and that file was
 * in no gate at all. Two things followed and the fix round found both.
 *
 * THE DOCUMENT DESCRIBED THE WRONG RULE. Section 3.1 said the predecessor is
 * "read untrimmed with `translateToString(false)`" — which is research 111
 * section 4.1's clause, the one section 3.4 two pages later argues AGAINST and
 * prices at 41 refusals of 272 where the adopted spelling refuses 3 — and
 * section 8 line 1 said "take lift one, spelled as section 3.1". The helper
 * that produced the numbers trims the row on the first line of its body, and
 * its own comment carried the same wrong sentence. So a reader who believed
 * the prose would have reinstated the defect the phase was built to fix, and
 * nothing in the battery could have noticed.
 *
 * AND THE HELPER HAD STOPPED RUNNING. Phase 250 changed `edgeRefusal`'s third
 * parameter from a string to a `RowEdges`, and the funnel calls it in four
 * places: run at HEAD, `--self-test` died on its sixth check with
 * `Cannot read properties of null (reading 'columns')`. tsx strips the types
 * and `build/p250` is outside `tsc -b`, so nothing went red.
 *
 * So the self-test runs here, and it carries four rows that ask the SHIPPING
 * `edgeRefusal` the questions the measured spelling is asked — the last of
 * them over a PADDED predecessor, which is the only row the two spellings
 * disagree about. The ablation is section 3.1 as it was written: the trim
 * taken out of `tightEdgeRefusal`, over a copy of the file, which must turn
 * that row red.
 */
{
  const FUNNEL = join(repoRoot, 'build', 'p250', 'funnel.mts');
  const runFunnel = (text) => {
    // The copy lives outside the tree, so its `../../src/...` imports are
    // spelled absolutely; nothing under build/ is written by this rule.
    // REALPATH'd, because `/tmp` is a symlink to `/private/tmp` on macOS and
    // the funnel only runs its dispatch when `import.meta.url` equals
    // `process.argv[1]` — spelled through the link they differ, the guard is
    // false, and the copy prints nothing at all while exiting 0.
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'p250-funnel-')));
    try {
      const file = join(dir, 'funnel.mts');
      writeFileSync(file, text.replaceAll("from '../../src/", `from '${join(repoRoot, 'src')}/`));
      const out = spawnSync(
        process.execPath,
        [tsxCli(), '--tsconfig', join(repoRoot, 'build', 'p250', 'tsconfig.json'), file, '--self-test'],
        { encoding: 'utf8', cwd: repoRoot, maxBuffer: 16 * 1024 * 1024 }
      );
      return `${out.stdout ?? ''}${out.stderr ?? ''}`;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  const source15 = readFileSync(FUNNEL, 'utf8');
  const shipping = runFunnel(source15);
  const PIN = 'THE PADDED PREDECESSOR is where the two spellings part';
  if (!shipping.includes('every fixture behaved')) {
    fail(`15. the measure step's own self-test does not pass at HEAD: ${shipping.slice(-500)}`);
  } else if (!shipping.includes(`OK   ${PIN}`)) {
    fail('15. the measure step no longer asks whether the shipped rule and the measured one agree');
  }

  // THE ABLATION IS RESEARCH 111 SECTION 4.1's SPELLING PUT BACK, AND IT IS TWO
  // EDITS ON PURPOSE. The trim alone moves NOTHING, which the fix round
  // measured rather than assumed: over 32 of the operator's live panes and
  // 82,425 rows, the predecessor read RAW with the path-character clause KEPT
  // refuses exactly what the adopted spelling refuses — 310 grammar spans and
  // 2 of 280 door-reaching absolute spans — because a row padded out to the
  // width ends in a SPACE, and a space is not a character a path continues
  // with. It takes BOTH clauses to reach research 111's 638 and 39. So an
  // ablation of the trim alone would be a rule that cannot fail wearing the
  // name of one that can, which is this gate's own standing lesson.
  const TRIM = "  const drawn = rawAbove.replace(/\\s+$/, '');";
  const PATHCHAR = "  return /[A-Za-z0-9._@%+~$/-]/.test(drawn[drawn.length - 1] ?? '');";
  if (!source15.includes(TRIM) || !source15.includes(PATHCHAR)) {
    fail('15. a clause this rule ablates is not in tightEdgeRefusal, so the ablation would find nothing to remove');
  } else {
    const bothGone = source15
      .replace(TRIM, '  const drawn = rawAbove;')
      .replace(PATHCHAR, '  return true;');
    if (!runFunnel(bothGone).includes(`FAIL ${PIN}`)) {
      fail("15. with research 111's spelling put back the measure step still agreed with the shipped rule, so this rule cannot fail");
    }
    // ...and the trim ALONE must leave it green, or the sentence above is
    // wrong and the two-edit ablation is hiding a one-edit one.
    if (!runFunnel(source15.replace(TRIM, '  const drawn = rawAbove;')).includes(`OK   ${PIN}`)) {
      fail('15. the trim alone moved the reading, so the measured claim that the path-character clause absorbs the padding is wrong');
    }
  }

  // AND THE PROSE MUST NOT SAY THE OTHER THING. Four places describe the
  // adopted spelling; a paragraph in any of them that names
  // `translateToString(false)` has to be naming it as the REJECTED reading,
  // which is what section 3.1 did not do.
  const PROSE = [
    'src/shared/path-spans.ts',
    'src/renderer/terminal/path-links.ts',
    'build/p250/funnel.mts',
    'docs/research/114-phase-250-the-paths-he-actually-clicks.md'
  ];
  // The paragraphs are compared with their whitespace collapsed, because a
  // sentence wrapped at 100 columns puts a line break in the middle of every
  // phrase this looks for — "used\nto" is not "used to", and the first version
  // of this scanner read its own explanation as a finding for exactly that.
  const wrongProse = (text) =>
    text
      .split(/\n\s*(?:\*\s*)?\n/)
      .map((para) => para.replace(/^[ \t]*\*[ \t]?/gm, '').replace(/\s+/g, ' '))
      .filter((para) => /translateToString\(false\)|read untrimmed|reads? the row above untrimmed/.test(para))
      .filter((para) => !/research 111|section 4\.1|used to|REJECTED|rejected|raw length|RAW length|padding/i.test(para));
  let prosePlants = 0;
  for (const rel of PROSE) {
    for (const para of wrongProse(readFileSync(join(repoRoot, rel), 'utf8'))) {
      fail(`15. ${rel} attributes an untrimmed predecessor to the adopted spelling: ${para.trim().slice(0, 140)}`);
    }
  }
  const PROSE_PLANTS = [
    ['the sentence that shipped, wrapped the way it really was', 'the row above is read untrimmed with `translateToString(false)`. **Nothing here\nreads `isWrapped`**, which research 107 measured lying in both directions.', 1],
    ['the same sentence inside a block comment, where every line opens with a star', ' * the row above is read untrimmed with\n * `translateToString(false)`. Nothing here reads isWrapped.', 1],
    ['a block comment that refutes it, with the refutation on the next line', ' * the paragraph under it used\n * to say the row above is read untrimmed with `translateToString(false)`.', 0],
    ['the same sentence with its refutation a line away', 'the row above is read untrimmed with\n`translateToString(false)`, which is research 111 section 4.1\u2019s clause.', 0],
    ['the corrected sentence', 'the predecessor is measured by its DRAWN content and never by its raw length,\nwhich is why `translateToString(false)` is research 111 section 4.1\u2019s clause.', 0],
    ['prose about neither', 'the width is `Terminal.cols` and the span\u2019s last column comes from the map.', 0]
  ];
  for (const [why, text, want] of PROSE_PLANTS) {
    const got = wrongProse(text).length > 0 ? 1 : 0;
    if (got !== want) {
      fail(`15. the prose scanner read "${why}" as ${got === 1 ? 'a finding' : 'clean'}, and it must read the other way`);
    } else if (want === 1) prosePlants += 1;
  }

  if (failures.every((f) => !f.includes(' 15. '))) {
    say(
      `15. the measure step runs at HEAD and agrees with the shipping refusal 8 on all four rows including the padded one, research 111's two clauses put back turn that row red while the trim alone does not, and ${String(PROSE.length)} prose sites describe the adopted spelling without research 111's clause; ${String(prosePlants)} of ${String(PROSE_PLANTS.length)} planted sentences were caught`
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
// Rule 16. THE PORTED VS CODE ROWS RUN AGAINST OUR GRAMMAR (Phase 253).
// ---------------------------------------------------------------------------

/**
 * The operator asked for VS Code's reach on 2026-09-10, and research 115
 * measured which of its mechanisms survive tmux and the corpus: the delimited
 * suffix clauses (grep `path:12:text`, ranges, tsc `path(12,34)`, brackets),
 * `[` `]` in a segment, and the bare FILE-SHAPED name resolved by lift two's
 * own join. Three things hold here:
 *
 *   - THE PORT IS ATTRIBUTED. `src/shared/path-spans.ts` and the probe both
 *     name the upstream file and commit, so the provenance of a ported table
 *     survives the person who ported it.
 *   - THE UPSTREAM'S OWN TEST ROWS RUN AGAINST OUR GRAMMAR, adapted to token
 *     level and narrowed to the adopted clauses — the `vscode-rows` reading is
 *     rule 1's, and this rule states what it is so a later round knows the
 *     rows are theirs and not ours.
 *   - EVERY NEW SPELLING STILL ENDS AT decidePathDoor. The rel-bare-* rows in
 *     the matrix are the proof: a bare name meets the secret rule, the mode
 *     rule, containment and the closed Mac door exactly as `docs/x.md` does,
 *     because nothing in the door half changed at all.
 */
{
  const UPSTREAM = '770a9bced0e6eff10342b2d95d7cfd98c33b85ed';
  for (const [rel, what] of [
    [SPANS, 'the ported suffix clauses'],
    ['build/p247/path-door-probe.mts', 'the ported test rows']
  ]) {
    const text = source(rel);
    if (!text.includes(UPSTREAM)) {
      fail(`16. ${rel} carries no attribution naming the upstream commit for ${what}`);
    }
    if (!text.includes('terminalLinkParsing')) {
      fail(`16. ${rel} carries no attribution naming the upstream file for ${what}`);
    }
  }
  // The door half did NOT change: a bare name and a grep target reach main as
  // spellings, and the join, the sequence and the external door are Phase
  // 250's bytes. That is a property of THIS phase, so it is asserted here:
  // path-doors.ts and path-door.ts name none of the new grammar's exports.
  for (const rel of [DOORS, DOOR]) {
    const text = code(rel);
    for (const name of ['bareFileShaped', 'GREP_SUFFIX', 'TSC_SUFFIX', 'stripDecoration']) {
      if (text.includes(name)) {
        fail(`16. ${rel} names ${name} — the grammar decides what to ASK and the door what a click may reach, and Phase 253 widened only the first`);
      }
    }
  }
  if (live.error === undefined && failures.every((f) => !f.includes(' 16. '))) {
    say(
      `16. ${String(String(live['vscode-rows'] ?? '').length)} ported VS Code rows read as pinned against OUR grammar (${String(live['vscode-rows'])}), the port is attributed to ${'770a9bce'} in both files, and the door half names nothing the grammar exports`
    );
  }
}

// ---------------------------------------------------------------------------
// Rule 17. A PATH BROKEN OVER ROWS OPENS WHOLE, AND ONLY BEHIND THE DOOR.
// ---------------------------------------------------------------------------

/**
 * PHASE 347 (issue 40), build/p347/SPEC.md D5 to D10 and §6.2.
 *
 * Research 115 §4 is why nothing rejoined two rows until now: the pane is a
 * tmux client's visible screen, a line scrolled off it leaves no rows here
 * (arm 3), and `isWrapped` is present and WRONG after the resize reflow and
 * the copy-mode repaint (arms 4 and 5). Issue 40's path was broken by the
 * agent itself, which sets no flag at all. So this rule holds the join to the
 * proof that survives all three: the DRAWN rows, the pane's width and the
 * door. THE JOIN READS NO `isWrapped`, and this rule fails if either module
 * names one.
 *
 * Three halves, because none is the other's proof:
 *   - DRIVEN, the pure rule: `joinedPathAt` and `joinBoundary` over a fixture
 *     table whose every expected value was derived by hand from J1 to J11
 *     and the caps as the spec states them, not read off the code. J7 is the
 *     fix round's (build/p347/SPEC.md §As built, the second fix round): a row
 *     short of the last column joins only after a `/` or a `-`, because the
 *     app lens found a word wrap that left `…/README.md` two cells short of
 *     the edge above `.bak beside it` opening README.md.bak where the parent
 *     opened README.md.
 *   - DRIVEN, the provider, staged with its bridge and store stubbed: an
 *     accepted join is ONE range from `startColumn + 1` on `top + 1` to
 *     `endColumn` on `bottom + 1`, the row spans inside it are dropped, and a
 *     refused join leaves the row's links equal to TODAY'S, which the probe
 *     re-derives on its own from `pathSpansInRow` and `spanColumns`.
 *   - READ, the wiring a stub buffer cannot get wrong: `Terminal.cols`, the
 *     buffer's last row, drawn rows with their own column maps read through
 *     ONE named reader, the same `doorFor` in the same `Promise.all`. Proved
 *     on plants cut from the shipping text.
 *
 * PHASE 347.1 RE-POINTED IT FOR THE GOVERNING RULE (build/p3471/SPEC.md
 * §6.1, rule 18 below). A join is now offered only when the door refuses
 * every row span it covers, so the accepted fixtures accept the whole file
 * and `/a/other.md` and NO fragment, the door clause owns
 * `p-refused-bare-*` (nothing accepted but `/a/other.md`, so only that
 * clause refuses the join), and the fragment clause keeps the kept
 * `p-refused-*` (every fragment accepted, the whole file not). The read half
 * asks that `joinedPathAt` is handed ONE `const` arrow declared in
 * `provideLinks`, whose body reads rows as drawn with their own maps, because
 * the governing rule must judge the very rows the join read. The staging and
 * the cell helpers live in `build/p3471/stage.mjs`, shared with rule 18 and
 * `measure:p3471`, so one stage is proved and one stage is measured.
 *
 * HIS ABSOLUTE-ONLY ROUND (2026-10-14, "Join absolute paths only";
 * build/p3471/SPEC.md D14 to D16 and §6.3). J10 refuses every chain whose
 * joined target starts with neither `/` nor `~/`, so every reading that
 * pinned a RELATIVE join now pins '' and belongs to J10's ablation, and
 * each clause that owned one owns an ABSOLUTE twin instead: J9's three
 * ablations own `j9a-*`, rule 18's G off owns `g-indent-edge-abs`. J11's
 * two halves each own the rows of the breaker that cuts anywhere, one half
 * at a time (`j11-top`, `j11-bottom`), beside the nit's rows that both halves
 * refuse (`j11-both`), their controls and the price (`j11-price`, L9). ITS
 * FIX ROUND widened J11 to any breaker and any limit the chain allows, and
 * gave each clause of the widened rule a reading of its own and an ablation
 * that moves it: the first fragment (`j11-slash`), the cells a breaker may
 * count past what xterm drew (`j11-undrawn`) and the gutter they leave out
 * (`j11-gutter`), the roots (`j11-root-*`), the wide glyph (`j11-wide-*`),
 * the row that holds more than its piece (`j11-top-tokens`,
 * `j11-bottom-tokens`), the row below no name goes on into (`j11-name`) and
 * the line suffix (`j11-line`); the two that keep a join are gain, owned
 * here so a later round cannot drop them as measured safe. J11's top half
 * now also refuses a lone top piece below a row reaching past the pane's
 * width, so J9's row-above clause owns a top row holding more than its piece
 * (`j9a-row-above-tokens`), and J10 no longer alone owns the E1 rows and
 * `issue-50-bottom`, which J11 refuses too. J8 at the chain's top is gone with its ablation
 * (D16): every chain it still refused that J10 does not was absolute, and
 * over 1,898,668 hovered rows J10's build answered the same with it and
 * without it. J8 in `joinBoundary` stays and owns its boundary reading
 * (`b-j8-relative`); `b8-tilde-below`, the one absolute join it still
 * decided, is J11's too since that fix round. ITS REVERIFY found Python's own
 * textwrap breaking BEFORE a run of `--`, which J11 read as a cut at the
 * limit, one cell, and so opened `…/pi-sessions` for
 * `…/pi-sessions--Users-…`; the moved fragment there is now the run, and
 * `j11-dashes-*` are its readings, each with its ablation. ITS QUICK CHECK
 * found Python's textwrap with `break_long_words=False` overflowing a row
 * with the text before `--` and the terminal soft-wrapping it, so the
 * bottom row was a short remainder no arithmetic of widths reads as a cut;
 * his ruling ("Add that refusal") refuses a chain whose lone bottom piece
 * ends in a character Python breaks after, above a row starting with a run
 * of `--` and a word character, when a row of the chain fills the pane.
 * `j11-overflow-*` are its readings: the refused shapes owned by the clause
 * whole, and one control per conjunct, owned by that conjunct's ablation.
 *
 * Then one ablation per clause, each over a staged copy of the shipping
 * source and each required to move the reading that owns it. All variants
 * run in ONE tsx process, each from its own directory, so the rule costs one
 * spawn rather than twenty, and rule 18 rides the same spawn. Rule 13 reads
 * the same `provideLinks` and stays green as it was.
 */

/** `build/p3471/stage.mjs` by file URL, which the probe imports `fakeLine` from. */
const STAGE_URL = pathToFileURL(join(repoRoot, 'build', 'p3471', 'stage.mjs')).href;

const JOIN_PROBE = `import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
// The cells the way xterm draws them, and a buffer line over them: the SAME
// helpers measure:p3471 counts its corpora's cells with.
import { fakeLine } from ${JSON.stringify(STAGE_URL)};

const root = process.argv[2] ?? '';
const table = JSON.parse(readFileSync(join(root, 'fixtures.json'), 'utf8'));
const settle = () => new Promise((resolve) => { setTimeout(resolve, 20); });

const linkText = (ls) =>
  ls === undefined || ls.length === 0
    ? 'none'
    : ls.map((l) => \`\${l.text}@\${l.range.start.x}.\${l.range.start.y}-\${l.range.end.x}.\${l.range.end.y}\`).join(' | ');

// The stub door: a target is accepted when the fixture lists it, by its
// spelling exactly as the provider asked, through the door its \`kinds\` names
// (the editor when it names none), and the click records what opened, a
// press through the Mac door marked \`mac:\`.
function doorDeps(f, asked, opened) {
  const kinds = f.kinds ?? {};
  return {
    isLocal: () => f.local !== false,
    repoPath: () => f.base,
    classify: async (paths) => {
      asked.push(...paths);
      return paths.map((p) => ({
        sourcePath: p, kind: 'file', refPath: p, copied: false, isImage: false, bytes: 0,
        door: f.doors.includes(p) ? { door: kinds[p] ?? 'editor', path: p } : { door: null, refusal: 'missing' }
      }));
    },
    openInTortie: (p, _base, line) => { opened.push(\`\${p}:\${String(line)}\`); },
    openOnMac: async (p) => { opened.push(\`mac:\${p}\`); }
  };
}

// The spans a hovered row draws, re-derived WITHOUT the provider: the row as
// drawn, its own map, the width, and the row above with its own end column.
function derivedSpans(spans, rows, width, y) {
  const row = rows[y];
  if (row === undefined) return [];
  const columns = spans.cellColumns(fakeLine(row));
  const above = y > 0 ? (rows[y - 1] ?? null) : null;
  const aboveEnd = above === null ? 0 : (spans.cellColumns(fakeLine(above))[above.length] ?? null);
  const out = [];
  for (const s of spans.pathSpansInRow(row, { width, columns, above, aboveEnd })) {
    out.push({ target: s.target, text: s.text, range: spans.spanColumns(s, columns) });
  }
  return out;
}

// TODAY's links for one hovered row (1-based), re-derived without the provider.
function todayLinks(spans, f, line) {
  const today = [];
  for (const s of derivedSpans(spans, f.rows, f.width, line - 1)) {
    if (!f.doors.includes(s.target) || s.range === null) continue;
    today.push({ text: s.text, range: { start: { x: s.range.start, y: line }, end: { x: s.range.end, y: line } } });
  }
  return today;
}

const spanList = (ss) => (ss.length === 0 ? 'none' : ss.map((s) => \`\${s.target}@\${s.range === null ? 'x' : \`\${s.range.start}-\${s.range.end}\`}\`).join(' ; '));

async function readingsOf(dir, live) {
  const spans = await import(pathToFileURL(join(dir, 'path-spans.ts')).href);
  const links = await import(pathToFileURL(join(dir, 'path-links.ts')).href);
  const drawn = (text) => ({ text, columns: spans.cellColumns(fakeLine(text)) });
  const out = {};
  for (const f of table.joins) {
    const j = spans.joinedPathAt((i) => (f.rows[i] === undefined ? null : drawn(f.rows[i])), f.y, f.rows.length - 1, f.width);
    out[f.key] = j === null ? '' : \`\${j.target}\${j.line === undefined ? '' : ':' + String(j.line)}@\${j.top}.\${j.startColumn}-\${j.bottom}.\${j.endColumn}\`;
  }
  for (const f of table.boundaries) {
    out[f.key] = spans.joinBoundary(drawn(f.above), drawn(f.below), f.width) ? '1' : '0';
  }
  for (const f of table.providers) {
    const asked = [];
    const opened = [];
    const term = {
      cols: f.width,
      buffer: { active: { length: f.rows.length, getLine: (y) => (f.rows[y] === undefined ? undefined : fakeLine(f.rows[y])) } }
    };
    const provider = new links.PathLinkProvider(term, doorDeps(f, asked, opened), () => 0);
    const got = await new Promise((resolve) => { provider.provideLinks(f.line, resolve); });
    out[f.key] = linkText(got);
    out[\`\${f.key}:asked\`] = String(asked.length);
    if (f.click === true) {
      got?.[0]?.activate({}, got[0].text);
      await settle();
      out[\`\${f.key}:opened\`] = opened.length === 0 ? 'none' : opened.join(' | ');
    }
    // TODAY's links for the same row, re-derived without the provider.
    out[\`\${f.key}:today\`] = f.local === false ? 'none' : linkText(todayLinks(spans, f, f.line));
  }

  // RULE 18 (Phase 347.1). Every row of every fixture hovered on a FRESH
  // provider and buffer, beside today's links for that row re-derived without
  // the provider; a fixture's \`gone\` row answers \`after\` reads and then
  // nothing. Clicks are read in the live copy alone, which is the only one a
  // click is graded on. Then R18-E: \`rowSpansAt\` asked of every row beside the
  // same derivation, every span and not only the accepted ones.
  try {
    for (const f of table.governing) {
      for (let line = 1; line <= f.rows.length; line += 1) {
        const reads = new Map();
        const getLine = (y) => {
          if (f.rows[y] === undefined) return undefined;
          const n = (reads.get(y) ?? 0) + 1;
          reads.set(y, n);
          if (f.gone !== null && f.gone.row === y && n > f.gone.after) return undefined;
          return fakeLine(f.rows[y]);
        };
        const opened = [];
        const term = { cols: f.width, buffer: { active: { length: f.rows.length, getLine } } };
        const provider = new links.PathLinkProvider(term, doorDeps(f, [], opened), () => 0);
        const got = await new Promise((resolve) => { provider.provideLinks(line, resolve); });
        const k = \`\${f.key}@\${String(line)}\`;
        out[k] = linkText(got);
        out[\`\${k}:today\`] = linkText(todayLinks(spans, f, line));
        if (live && f.clicks[String(line)] !== undefined) {
          got?.[0]?.activate({}, got[0].text);
          await settle();
          out[\`\${k}:opened\`] = opened.length === 0 ? 'none' : opened.join(' | ');
        }
      }
    }
    const mismatched = [];
    for (const f of table.governing) {
      const reader = (i) => (f.rows[i] === undefined ? null : drawn(f.rows[i]));
      for (let i = 0; i < f.rows.length; i += 1) {
        const columns = spans.cellColumns(fakeLine(f.rows[i]));
        const asked = spanList(spans.rowSpansAt(reader, i, f.width).map((s) => ({ target: s.target, range: spans.spanColumns(s, columns) })));
        const derived = spanList(derivedSpans(spans, f.rows, f.width, i));
        if (asked !== derived) mismatched.push(\`\${f.key}@\${String(i + 1)}: rowSpansAt \${asked}, the provider's derivation \${derived}\`);
      }
    }
    out['R18-E'] = mismatched.length === 0 ? 'equal' : mismatched.join(' / ');
  } catch (error) {
    out['R18:error'] = String(error && error.message ? error.message : error).slice(0, 300);
  }
  return out;
}

const all = {};
for (const name of table.dirs) {
  try {
    all[name] = await readingsOf(join(root, name), name === 'live');
  } catch (error) {
    all[name] = { error: String(error && error.message ? error.message : error).slice(0, 300) };
  }
}
console.log(JSON.stringify(all));
`;

const J17_PATH =
  '/Users/johnberryman/projects/github/arcturus-labs/rook/.agents/skills/software-factory/.planning/brainstorming.md:134';
const J17_FILE = J17_PATH.replace(/:134$/, '');
const J17_BASE = '/Users/johnberryman/projects/github/arcturus-labs/rook';
const J17_ISSUE = [
  'The plan is written down at',
  '/Users/johnberryman/projects/github/arcturus-',
  'labs/rook/.agents/skills/software-factory/',
  '.planning/brainstorming.md:134',
  '',
  '> '
];
const j17Wrap = (path, width) => {
  const out = [];
  for (let i = 0; i < path.length; i += width) out.push(path.slice(i, i + width));
  return out;
};
const J17_CODEX = '  2. Yes, and open /Users/me/project/src/renderer/terminal/path-';
const J17_CLAUDE = '⏺ Wrote the notes to /Users/me/project/docs/a-very-long-';
const J17_J5 = 'the notes live in /Users/me/proj/docs/';
const J17_SOFT30 = j17Wrap(J17_PATH, 30);
const J17_SOFT80 = j17Wrap(J17_PATH, 80);
const J17_NINE = j17Wrap(`/u/${'abcdefghi/'.repeat(8)}z.md`, 10);
const J17_EIGHT = j17Wrap(`/u/${'abcdefghi/'.repeat(7)}z.md`, 10);
const j17PathOf = (n) => {
  const body = `/u/${'abcdefghi/'.repeat(Math.floor((n - 3) / 10))}`;
  return body + 'x'.repeat(n - body.length);
};
const J17_OVER = j17Wrap(j17PathOf(1025), 130);
const J17_AT = j17Wrap(j17PathOf(1024), 130);
const J17_ISSUE_JOIN = `${J17_FILE}:134@1.0-3.30`;
/** J7's word wrap (the fix round): README.md ends two cells short of the edge, and README.md.bak exists. */
const J17_J7 = 'I kept a copy of /r/projects/app/src/README.md';
const J17_J7_BELOW = '.bak beside it, just in case.';
const J17_J7_README = '/r/projects/app/src/README.md';
const J17_J7_ROWS = ['x', J17_J7, J17_J7_BELOW, 'y'];
/**
 * J9 (Phase 347.1's fix round, the app lens's narrowed pane): a 47-column
 * repaint's row ending on `src/deep/` (12 + 25 + 10 = 47 cells), and the same
 * row as a 49-column pane left it on xterm's alternate buffer, its stale `de`
 * in columns 48 and 49, which `translateToString(true)` still answers.
 */
const J17_J9_FRESH = `Please open ${'z'.repeat(25)} src/deep/`;
const J17_J9_STALE = `${J17_J9_FRESH}de`;
const J17_J9_BELOW = 'folder/one.ts:5 now open it';
/** A lower piece that fills a 47-column row (7 + 37 + 3 cells). */
const J17_J9_FILL = `folder/${'k'.repeat(37)}.md`;
/**
 * HIS RULED ROUND (2026-10-14), the reverify's F1: a path in ANOTHER folder
 * broken over three rows at 38 columns, its top row clean (X1), carrying a
 * leftover glued onto it (X2) or a blank cell past it (X3). The fix round's
 * J9 refused only the top boundary, and the two rows below joined on their
 * own as a RELATIVE path, which opened the project's own file of that name.
 */
const j17F1 = (top) => ['', top, 'build/fixtures/facts/manifests/package', '.json:134 and the rest follows.', '', '>'];
const J17_F1_X1 = j17F1('The plan is written down at /q/tortie/');
const J17_F1_X2 = j17F1('The plan is written down at /q/tortie/e/A');
const J17_F1_X3 = j17F1('The plan is written down at /q/tortie/ zz');
const J17_F1_JOIN = '/q/tortie/build/fixtures/facts/manifests/package.json:134@1.28-3.9';
/** Lens B's own failed item, G-stale-midwrap: the stale top row is the buffer's first. */
const J17_G_BELOW = 'folder/one.ts:5 now and check the import.';
/** A token left past 31 columns makes the bottom row two tokens, ending the chain at a prefix. */
const J17_PREFIX = ['', 'I updated /q/tortie/build/p336/', 'fixtures/parent-record-b-', 'first.json to fix the race.', '', '>'];
const J17_PREFIX_STALE = J17_PREFIX.map((r, k) => (k === 2 ? `${r}      ests_` : r));
/** The chain ends on its bottom row's first token; the row below's first piece runs past 22 columns. */
const J17_BELOW_REACH = ['x', 'see /q/tortie/aaa-', 'bbb.md to fix it', `${'c'.repeat(22)}zz`, 'y'];
/**
 * HIS ABSOLUTE-ONLY ROUND (2026-10-14). The rows between a leading '' and a
 * trailing '', '>', as the spec's prototype read them (build/p3471/SPEC.md
 * §6.3), so a reading's rows are 0-based from that ''.
 */
const j17Framed = (...rows) => ['', ...rows, '', '>'];
/**
 * J9's ABSOLUTE twins. J10 refuses every relative chain whatever J9 says, so
 * each J9 clause owns rows whose chain is absolute: `/p/deep/` drawn at the
 * end of a 47-column row (12 + 26 + 1 + 8 = 47 cells), the same row with a
 * 49-column pane's stale `de` in columns 48 and 49, and a lower piece that
 * fills the row with `de` left past it.
 */
const J17_J9A_FRESH = `Please open ${'z'.repeat(26)} /p/deep/`;
const J17_J9A_STALE = `${J17_J9A_FRESH}de`;
/** The row above the chain draws past 10 columns (5 + 5 + 3 = 13 cells); with nothing past the width, `Plan:` alone. */
const J17_J9A_ROW_ABOVE = ['x', `Plan:${' '.repeat(5)} zz`, '/r/aaa-', 'bbb.md now', 'y'];
/**
 * J10. The reverify's E1 rows, an agent's text drawn at 46 columns and read
 * in a pane of 46, 47 and 50: at 46 the whole absolute path joins; from 47
 * the first boundary fails J3 (43 + `src/` is not more than 47), the walk
 * stops, and the two lower rows are a RELATIVE chain that opened the
 * project's own `src/main/__tests__/menu-popup-template.test.ts`.
 */
const J17_E1 = j17Framed(
  '⏺ Updated /private/tmp/wt-p3471-parent-rv2/',
  '  src/main/__tests__/menu-popup-',
  '  template.test.ts:38 and ran the tests.'
);
/** The reverify's X40 at 38 columns: `r/` two cells long stops the walk, and the two rows below are relative. */
const J17_X40 = j17Framed(
  'Plan at /private/tmp/p3471rv2-app/othe',
  'r/',
  'build/fixtures/facts/manifests/package',
  '.json:134 and the rest follows.'
);
/** Issue 40's rows with the top row's leading `/` taken off: the same chain, relative. */
const J17_ISSUE_RELATIVE = J17_ISSUE.map((r, k) => (k === 1 ? r.slice(1) : r));
/**
 * U6's spellings, each the last token of its row after `see the ` (or glued
 * to a gutter at the row's head) and ON the last column, so J3, J7 and J11
 * have nothing to say and `bar.md now` (10 cells) fits the pane; read from
 * the top row. Every character here is one cell.
 */
const j17Spell = (key, top, reading) => [key, j17Framed(top, 'bar.md now'), 1, [...top].length, reading];
/**
 * J11. Rows a breaker that cuts anywhere (wrap-ansi's hard mode) left ending
 * at ONE column short of the edge: at the chain's top (28 and 28 at 32), at
 * its bottom (30 and 30 at 33), the reverify's nit at both ends (30, 30 and
 * 30 at 38), and L9's price, a whole `~/` path two of whose rows happen to
 * end at one column (28 and 28 at 31). Each control moves one row's end by
 * one cell, so the column decides and not the text.
 */
const J17_J11_TOP = j17Framed('I saved it to /Users/me/proj', '/tmp/run-logs/nightly-build-', 'output.log today.');
const J17_J11_TOP_CONTROL = j17Framed('I saved it to /Users/me', '/tmp/run-logs/nightly-build-', 'output.log today.');
const J17_J11_BOTTOM = j17Framed('I updated /Users/me/proj/dist/', 'assets/vendor-chunk-a/index.js', '.map today.');
const J17_J11_BOTTOM_CONTROL = j17Framed('I updated /Users/me/proj/dist/', 'assets/vendor-chunk/index.js', '.map today.');
/**
 * J11 AS THE FIX ROUND OF HIS ABSOLUTE-ONLY ROUND WIDENED IT (the attack
 * lens's breakers, build/p3471/SPEC.md §As built, absolute only: the fix
 * round). Each reads '' and owns the one clause that refuses it, or reads a
 * join and owns the one clause that keeps it.
 */
const J17_J11_HYPHEN = j17Framed('⏺ Updated /private/tmp/wt-p3471-parent-', '  attack/docs/research/assets/58/cmd.hard', '  13:62 and ran the tests.');
const J17_J11_WIDER = j17Framed('I updated /Users/me/proj/dist/', 'assets/vendor-chunk-ab/index.js', '.map today.');
const J17_J11_EMOJI = j17Framed(`⏺ ✅ Updated ~/h/${'b'.repeat(30)}`, '  /tmp/p3471atk/run-logs/nightly-build-output-f', '  or-the-release-candidate.log today.');
const J17_J11_SLASH = j17Framed('I saved it to /Users/me/pro', '/tmp/run-logs/nightly-build-', 'output.log today.');
const J17_J11_EDGE = j17Framed('I saved it to /Users/me/p', '/tmp/run-logs/nightly-build-', 'output.log today.');
const J17_J11_UNDRAWN = j17Framed('🚀 ✅ Shipped ~/h/abcdefghijk', '/tmp/p3471atk/run-logs/nightly-', 'build-output.log today.');
const J17_J11_GUTTER = j17Framed('⏺ Saved to /Users/me/pro', '/tmp/run-logs/nightly-build-', 'output.log today.');
const J17_J11_TILDE = j17Framed('I wrote the build log to ~', '/tmp/p3471atk/run-logs/nightly-', 'build-output.log today.');
const J17_J11_VAR = j17Framed('I copied it to $HOME', '/tmp/p3471atk/run-logs/nightly-', 'build-output.log today.');
const J17_J11_URL = j17Framed('See https://example.com', '/tmp/p3471atk/run-logs/nightly-', 'build-output.log for the log.');
const J17_J11_BRACKET = j17Framed('Edited ~/h/pages/[slug]', '/tmp/p3471atk/run-logs/', 'nightly-build-output.lo', 'g now');
const J17_J11_WIDE_TOP = j17Framed('I saved it to /Users/me/proj', '/tmp/p3471atk/run-logs/nightly-', 'build-output.log 中文中文中文中文');
const J17_J11_WIDE_BOTTOM = j17Framed('中文中文 /Users/me/proj/dist/', 'assets/vendor-chunk/index.js', '.map today.');
const J17_J11_TOP_TOKENS = j17Framed('(the note is in the docs folder)', 'at /tmp/run-logs/nightly-build-', 'output.log today.');
const J17_J11_BOTTOM_TOKENS = j17Framed('I updated /Users/me/proj/dist/', 'assets/vendor-chunk-a/index.js and', 'the map today.');
const J17_J11_NAME = j17Framed('• Edited /private/tmp/wt-p3471/', '  .github/actions/setup/action.yml', '  (+3 -1)');
const J17_J11_LINE = j17Framed('⏺ Updated /private/tmp/wt-p3471/', '  .claude/scheduled_tasks.lock:10', '  and ran the tests.');
const J17_J11_BREAK_SLASH = j17Framed('I updated /Users/me/proj/dist/', 'assets/MyApplication.app', '/Contents/Info.plist today.');
const J17_J11_BREAK_FOLDER = j17Framed('I updated /Users/me/proj/dist/', 'assets/MyApplication.app/', 'Contents/Info.plist today.');
const J17_J11_BREAK_DASH = j17Framed('I updated /Users/me/proj/dist/', 'assets/nightly-build-', 'output.log today.');
const J17_J11_BREAK_SHORT = j17Framed('I updated /Users/me/proj/dist/', 'assets/Foo.app', '/Contents/Info.plist today.');
const J17_J11_BREAK_DASH_TOKEN = j17Framed('I updated /Users/me/proj/dist/', 'assets/nightly-', 'build/output.log today.');
const J17_J11_BREAK_SLASH_EDGE = j17Framed('I updated /Users/me/proj/dist/', 'assets/MyApplicat.app/', 'Contents/Info.plist today.');
const J17_J11_BREAK_DIGIT = j17Framed('I updated /Users/me/proj/dist/', 'assets/fixtures/p342/', 'dollar-3.4.json:50 today.');
const J17_J11_TOP_AFTER_DASH = j17Framed('I saved to /Users/me/a-', '/tmp/run-logs/nightly-build-', 'output.log today.');
/**
 * J11 READS PYTHON'S BREAK BEFORE `--` (the reverify of 2026-10-15). Python's
 * own textwrap breaks before a run of two or more `-` that a word character
 * precedes and follows, the run its own chunk, so a bottom row ending
 * mid-name one cell short of the widest row above `--…` may be a cut with
 * room for one cell and not for the run. Each refused row is Python's own
 * `textwrap.wrap` output: 40 against 41 above `--Users-…` (the pi-sessions
 * shape) and 22 against 23 above `--old.md`; read as one cell, each joined the
 * name before `--`. Each of those cuts its path AT the pane's width, so since
 * his overflow round (below) the overflow refusal refuses it too and neither
 * clause alone owns it, as `j11-both` is owned by neither half. What the run
 * clause alone refuses is Python's own `textwrap.wrap` output a cell or more
 * NARROWER than the pane, where no row of the chain fills it: 32 against 33
 * above `--old.md:12` at 34 (`j11-dashes-alone`), and 27 against 29 above
 * `---final.txt:12` at 30 (`j11-dashes-alone-run`, three cells where two
 * would have fitted). Its control, 25 against 29 above the same `---`, has
 * room for the run and not for the whole token, so it joins
 * (`j11-dashes-room`); the old control, 21 against 23 at 23, is the
 * overflow refusal's now (`j11-overflow-room-filled`).
 */
const J17_J11_DASHES_PI = j17Framed(
  'I updated the test in /Users/me/proj/docs',
  '/research/assets/63-fixtures/pi-sessions',
  '--Users-example-rookery--/2026-06-12T04-5',
  '7-36-108Z.jsonl:10 today.'
);
const J17_J11_DASHES_PLAN = j17Framed('Wrote /Users/me/project', 's/tortie/notes/plan.md', '--old.md');
const J17_J11_DASHES_RUN = j17Framed('Wrote /Users/me/project', 's/tortie/notes/pla.md', '---old.md');
const J17_J11_DASHES_ALONE = j17Framed('xxx I updated the test in /Users/', 'me/projects/tortie/notes/plan.md', '--old.md:12 today.');
const J17_J11_DASHES_ALONE_RUN = j17Framed('I updated the test in /Users/', 'me/projects/tortie/c/report', '---final.txt:12 today.');
const J17_J11_DASHES_ROOM = j17Framed('I updated the test in /Users/', 'me/projects/tortie/c/repo', '---final.txt:12 today.');
/**
 * J11'S OVERFLOW REFUSAL (his ruling of 2026-10-15, "Add that refusal").
 * `textwrap.wrap(text, width, break_long_words=False)` puts a chunk longer
 * than its row on a line of its own and the terminal soft-wraps it at the
 * pane's edge, so the chain's bottom row is the remainder, of any length,
 * above a line starting with the run. Every row here is Python's own output
 * drawn at the pane's width (`/usr/bin/python3 -I`), but the last two and
 * the old room, which are the controls a conjunct of the refusal owns: the
 * planw and plan2s shapes (the re-checker's X-nolong-planw-19 and
 * X-nolong-plan2s-50 over `/Users/me`), the price (L9, a path a soft wrap
 * left above `--dry-run`, where the parent opens nothing), a run with a
 * Unicode word character after it (`--été`), and the old room, a hard cut AT
 * the pane, each refused, each joining the name before the run with the
 * refusal out; and the controls, each joining, each refused with one
 * conjunct out: the row below a word (an ordinary soft wrap of a long path),
 * a bare `--` and a name holding `--` inside a row (the row below starts no
 * run), a piece ending in `+` (no character Python breaks after), the
 * short-row room above (no row fills the pane) and a bottom row holding
 * more than its piece.
 */
const J17_J11_OVERFLOW_PLANW = j17Framed('Wrote', '/Users/me/projects/', 'tortie/notes/plan.m', 'd', '--old.md');
const J17_J11_OVERFLOW_PLAN2S = j17Framed(
  'Saved the report to',
  '"/Users/me/projects/tortie/docs/research/assets/63',
  '-fixtures/plan.md',
  '--old.md" for review.'
);
const J17_J11_OVERFLOW_FLAG = j17Framed('Run', '/Users/me/projects/tortie/bin/', 'deploy.sh', '--dry-run first.');
const J17_J11_OVERFLOW_UNICODE = j17Framed('Wrote', '/Users/me/projects/', 'tortie/notes/plan.m', 'd', '--été.md today.');
const J17_J11_OVERFLOW_ROOM_FILLED = j17Framed('Wrote /Users/me/project', 's/tortie/notes/pla.md', '--old.md');
const J17_J11_OVERFLOW_WORD = j17Framed('Wrote', '/Users/me/projects/', 'tortie/notes/plan.m', 'd', 'today.');
const J17_J11_OVERFLOW_BARE = j17Framed('Call', '/Users/me/projects/tortie/bin/', 'deploy.sh', '-- --help for usage.');
const J17_J11_OVERFLOW_NAME = j17Framed(
  'I updated the test in',
  '/Users/me/proj/docs/researc',
  'h/assets/63-fixtures/pi-',
  'sessions--Users-example-',
  'rookery--/2026-06-12T04-57-',
  '36-108Z.jsonl:12',
  'today.'
);
const J17_J11_OVERFLOW_PLUS = j17Framed('Build it with', '/Users/me/projects/tortie/bin/', 'g++', '--std=c++17 now.');
const J17_J11_OVERFLOW_TOKENS = j17Framed('I updated the tests in /Users/me', '/projects/tortie/c/report.md v2', '--final today.');
const J17_J11_BOTH = j17Framed(
  'I updated the test in /private',
  '/tmp/wt-p3471-parent-rv2/docs/',
  'research/assets/58/answer.hard',
  '13:60 today.'
);
const J17_J11_PRICE = j17Framed(
  'Two files changed: ~/tortie/',
  '.claude/scheduled_tasks.lock',
  'and ~/tortie/docs/audits/',
  'contract-baseline.txt.'
);

/**
 * [key, rows, hovered row (0-based), width, the reading]. A reading is
 * `target[:line]@top.startColumn-bottom.endColumn`, or '' for no join. Every
 * right-hand side below was derived by hand from the rule's own words.
 */
const J17_JOINS = [
  // PJ1, issue 40's own rows: the whole path from each row at 45 to 49 columns.
  ['issue-45-top', J17_ISSUE, 1, 45, J17_ISSUE_JOIN],
  ['issue-45-middle', J17_ISSUE, 2, 45, J17_ISSUE_JOIN],
  ['issue-45-bottom', J17_ISSUE, 3, 45, J17_ISSUE_JOIN],
  ['issue-49-middle', J17_ISSUE, 2, 49, J17_ISSUE_JOIN],
  // ...at 50 the first boundary fails J3 (45 + `labs/` is not more than 50)
  // and the last two rows join to a path that does not exist; at 52, nothing.
  ['issue-50-top', J17_ISSUE, 1, 50, ''],
  // ...and the last two rows' chain is RELATIVE (`labs/…/brainstorming.md`),
  // which J10, his ruling, refuses, so no fragment is offered. (J8 at the
  // chain's top refused it until his absolute-only round measured that
  // clause redundant under J10, D16; with J10 out it joins the fragment.)
  ['issue-50-bottom', J17_ISSUE, 3, 50, ''],
  ['issue-52-middle', J17_ISSUE, 2, 52, ''],
  // PJ2, a soft wrap of the same path: every row is full, so J3 holds.
  ['soft-30-top', ['wrote it:', ...J17_SOFT30, ''], 1, 30, `${J17_FILE}:134@1.0-${String(J17_SOFT30.length)}.${String(J17_SOFT30.at(-1).length)}`],
  ['soft-80-bottom', ['wrote it:', ...J17_SOFT80, ''], 2, 80, `${J17_FILE}:134@1.0-2.${String(J17_SOFT80.at(-1).length)}`],
  // PJ3, Codex's continuation indent and Claude Code's gutter.
  ['codex-break', ['› 1. Yes, proceed (y)', J17_CODEX, '     links.ts:12 for this session (p)', ''], 2, J17_CODEX.length, `/Users/me/project/src/renderer/terminal/path-links.ts:12@1.${String(J17_CODEX.indexOf('/'))}-2.16`],
  ['claude-gutter', ['', J17_CLAUDE, '  ⎿  name.md', ''], 2, J17_CLAUDE.length, `/Users/me/project/docs/a-very-long-name.md@1.${String(J17_CLAUDE.indexOf('/'))}-2.12`],
  // PJ4, one fixture per clause, each beside its control.
  ['j1-colon', ['x', 'see /Users/me/proj/aa:', '12', 'y'], 1, 22, ''],
  ['j1-control', ['x', 'see /Users/me/proj/aa', 'bb.md', 'y'], 1, 21, '/Users/me/proj/aabb.md@1.4-2.5'],
  ['j2-head-bracket', ['x', 'go /Users/me/proj/pages/', '[slug].tsx', 'y'], 1, 24, ''],
  // (His absolute-only round: the bottom chain `dddd/eeee.md` is RELATIVE,
  // so J10 refuses it; with J10 out it reads `dddd/eeee.md@2.15-3.7`, and
  // with J2's middle clause out the walk climbs to the absolute top and
  // glues `cccccc-` to `eeee.md`, so both ablations move it.)
  ['j2-middle-up', ['x', 'go /Users/me/aaaaaa-', 'bbbbbb/cccccc- dddd/', 'eeee.md', 'y'], 3, 20, ''],
  ['j2-middle-down', ['x', 'go /Users/me/aaaaaa-', 'bbbbbb/cccccc- dddd/', 'eeee.md', 'y'], 1, 20, '/Users/me/aaaaaa-bbbbbb/cccccc-@1.3-2.14'],
  // (Phase 347.1's fix round: both rows on the last column of a 19-column
  // pane. The first was 20 cells, wider than the pane, which J9 refuses.)
  ['j2-hovered', ['x', 'go /Users/me/aaaaa-', 'bb.md go /Users/cc-', 'dd.md', 'y'], 2, 19, '/Users/me/aaaaa-bb.md@1.3-2.5'],
  ['j2-hovered-below', ['x', 'go /Users/me/aaaaa-', 'bb.md go /Users/cc-', 'dd.md', 'y'], 3, 19, '/Users/cc-dd.md@2.9-3.5'],
  ['j3-fits', ['x', 'see /a/b-', 'cde/f.md', 'y'], 2, 40, ''],
  ['j3-forced', ['x', 'see /a/b-', 'cde/f.md', 'y'], 2, 12, '/a/b-cde/f.md@1.4-2.8'],
  ['j5-short', ['x', J17_J5, 'README.md is the index', 'y'], 2, J17_J5.length + 5, ''],
  ['j5-full', ['x', J17_J5, 'README.md is the index', 'y'], 2, J17_J5.length, `/Users/me/proj/docs/README.md@1.${String(J17_J5.indexOf('/'))}-2.9`],
  // J7, the fix round: a row short of the last column joins only after `/` or
  // `-`. Two cells short, from either row, nothing; on the last column it is
  // what a terminal wrap draws, and joins (SPEC L12).
  ['j7-short', J17_J7_ROWS, 1, J17_J7.length + 2, ''],
  ['j7-short-below', J17_J7_ROWS, 2, J17_J7.length + 2, ''],
  ['j7-full', J17_J7_ROWS, 1, J17_J7.length, `${J17_J7_README}.bak@1.17-2.4`],
  // J8, his rule (no scenario worse than today): a RELATIVE folder after other
  // words, short of the last column, starts no join, because the parent opened
  // the lower row's own path there. An absolute folder in the same place still
  // joins. On the last column it is a terminal wrap, and since his
  // absolute-only round the relative chain is refused there by J10 instead
  // (with J10 out, `src/lib/a.ts@1.6-2.8`).
  ['j8-short', ['x', 'moved src/', 'lib/util.ts today', 'y'], 1, 12, ''],
  ['j8-short-below', ['x', 'moved src/', 'lib/util.ts today', 'y'], 2, 12, ''],
  // (A lower piece a 10-column pane can draw: `lib/util.ts` is 11 cells, J9.)
  ['j8-full', ['x', 'moved src/', 'lib/a.ts', 'y'], 1, 10, ''],
  ['j8-absolute', ['x', 'moved /r/app/src/', 'lib/util.ts today', 'y'], 2, 19, '/r/app/src/lib/util.ts@1.6-2.11'],
  // J8 in joinBoundary decided one ABSOLUTE shape (D16): `src/` one cell
  // short of the edge after other words, above `~/proj/xxx-` on the last
  // column. Since the fix round of his absolute-only round J11's top half
  // refuses it too: the row above ends in `/`, a breaker that breaks after a
  // `/` may have cut `src/~/proj/xxx-y.md` there, and `~/proj/xxx-` would not
  // have fitted. With J8 out the walk glues `src/` on and J10 refuses it; so
  // J8 owns its boundary reading (`b-j8-relative`) and no join reading.
  ['b8-tilde-below', ['x', 'moved src/', '~/proj/xxx-', 'y.md now', 'z'], 2, 11, ''],
  // A relative folder heading a chain: J8 at the chain's top refused these
  // until his absolute-only round; J10 refuses them now (D16), and the
  // absolute control still joins.
  ['j8-top-bullet', ['x', '• docs/research/', '• notes/a.md', 'y'], 1, 18, ''],
  ['j8-top-alone', ['x', 'docs/research/', 'notes/a.md', 'y'], 2, 16, ''],
  ['j8-top-absolute', ['x', '/r/docs/research/', 'notes/a.md', 'y'], 1, 18, '/r/docs/research/notes/a.md@1.0-2.10'],
  ['j8-top-full', ['x', 'docs/research/', 'notes.md', 'y'], 1, 14, ''],
  ['j6-top', ['/Users/me/proj/aaa-', 'bbb.md', 'y'], 1, 19, ''],
  ['j6-top-control', ['x', '/Users/me/proj/aaa-', 'bbb.md', 'y'], 2, 19, '/Users/me/proj/aaa-bbb.md@1.0-2.6'],
  ['j6-bottom', ['x', 'see /Users/me/proj/aaa-', 'bbb.md'], 1, 23, ''],
  ['j6-bottom-control', ['x', 'see /Users/me/proj/aaa-', 'bbb.md', ''], 1, 23, '/Users/me/proj/aaa-bbb.md@1.4-2.6'],
  ['cap-rows-9', ['x', ...J17_NINE, ''], 1, 10, ''],
  ['cap-rows-9-middle', ['x', ...J17_NINE, ''], 5, 10, ''],
  ['cap-rows-8', ['x', ...J17_EIGHT, ''], 1, 10, `/u/${'abcdefghi/'.repeat(7)}z.md@1.0-8.${String(J17_EIGHT.at(-1).length)}`],
  ['cap-chars-1025', ['x', ...J17_OVER, ''], 1, 130, ''],
  ['cap-chars-1024', ['x', ...J17_AT, ''], 1, 130, `${j17PathOf(1024)}@1.0-${String(J17_AT.length)}.${String(J17_AT.at(-1).length)}`],
  // The SAME grammar a row span meets, and what the strip leaves on one row.
  ['grammar', ['x', 'see /Users/me/proj/aaa-', 'b:c d', 'y'], 1, 23, ''],
  ['one-row-left', ['x', 'see /Users/me/proj/aaa', '.', 'y'], 1, 22, ''],
  // PJ5, a decorated row: `⚠️` is one cell holding two units, so the path's
  // first cell is one column LEFT of its string index.
  ['decorated', ['x', '⚠️ see /Users/me/proj/aaa-', 'bbb.md', 'y'], 2, 25, '/Users/me/proj/aaa-bbb.md@1.6-2.6'],
  // J9, Phase 347.1's fix round as his ruled round made it: a join is
  // refused WHOLE when a boundary it crosses or stops at reads a cell past the
  // pane's width. The stale upper row, from either row, refuses (the app lens
  // pressed it and opened src/deep/defolder/one.ts), and so does lens B's own
  // layout, whose stale row is the buffer's first; the same rows as a
  // 47-column repaint draws them join, starting at column 47 - 9 = 38. A
  // lower piece that runs into the stale cells refuses, beside its control.
  // Stale cells AFTER the lower piece refuse too since his ruled round (the
  // fix round kept that join): a token left there ends a chain that went on,
  // which the prefix pair shows. These rows are RELATIVE (`src/deep/…`), so
  // since his absolute-only round J10 refuses the fresh twins too (with J10
  // out they read `src/deep/folder/one.ts:5@1.38-2.15`, `@0.38-1.15` and
  // `src/deep/folder/kkk….md@1.38-2.47`), and each J9 clause owns an
  // absolute twin under `/p/` below (`j9a-*`).
  ['j9-stale-upper', ['x', J17_J9_STALE, J17_J9_BELOW, 'y'], 2, 47, ''],
  ['j9-stale-upper-top', ['x', J17_J9_STALE, J17_J9_BELOW, 'y'], 1, 47, ''],
  ['j9-fresh-upper', ['x', J17_J9_FRESH, J17_J9_BELOW, 'y'], 2, 47, ''],
  ['j9-g-stale-midwrap', [J17_J9_STALE, J17_G_BELOW, 'P3471>'], 1, 47, ''],
  ['j9-g-clean-midwrap', [J17_J9_FRESH, J17_G_BELOW, 'P3471>'], 1, 47, ''],
  ['j9-stale-lower', ['x', J17_J9_FRESH, `${J17_J9_FILL}de`, '', 'y'], 1, 47, ''],
  ['j9-fresh-lower', ['x', J17_J9_FRESH, J17_J9_FILL, '', 'y'], 1, 47, ''],
  ['j9-stale-after-piece', ['x', J17_J9_FRESH, `folder/one.ts:5${' '.repeat(32)}zz`, 'y'], 1, 47, ''],
  ['j9-fresh-after-piece', ['x', J17_J9_FRESH, 'folder/one.ts:5', 'y'], 1, 47, ''],
  // ...and the absolute twins. The stale row above, from either row, refuses
  // (J9's upper half; with it out, `/p/deep/defolder/one.ts:5@1.39-2.15`,
  // the wrong file), beside the same rows as a 47-column repaint draws them.
  ['j9a-stale-upper', j17Framed(J17_J9A_STALE, J17_J9_BELOW), 2, 47, ''],
  ['j9a-stale-upper-top', j17Framed(J17_J9A_STALE, J17_J9_BELOW), 1, 47, ''],
  ['j9a-fresh-upper', j17Framed(J17_J9A_FRESH, J17_J9_BELOW), 2, 47, '/p/deep/folder/one.ts:5@1.39-2.15'],
  // A lower piece that fills the row with `de` left past it: the chain's
  // bottom row reads past the width (with that clause out,
  // `/p/deep/folder/kkk….mdde@1.39-2.49`).
  ['j9a-stale-lower', j17Framed(J17_J9A_FRESH, `${J17_J9_FILL}de`), 1, 47, ''],
  ['j9-prefix-clean', J17_PREFIX, 2, 31, '/q/tortie/build/p336/fixtures/parent-record-b-first.json@1.10-3.10'],
  ['j9-prefix-top', J17_PREFIX_STALE, 1, 31, ''],
  ['j9-prefix-bottom', J17_PREFIX_STALE, 2, 31, ''],
  // F1, his ruled round: X1 joins the whole path in the other folder from
  // every row; X2 and X3 refuse from the two rows below the leftover, which
  // the fix round's J9 joined as `build/…/package.json:134` (2.0-3.9). Since
  // his absolute-only round those two rows are refused by J10 too, from any
  // row and with nothing above them (`j9-f1-below-alone`, which joined before
  // it); the row-above clause owns the absolute twin `j9a-row-above` below.
  ['j9-f1-x1-top', J17_F1_X1, 1, 38, J17_F1_JOIN],
  ['j9-f1-x1-bottom', J17_F1_X1, 3, 38, J17_F1_JOIN],
  ['j9-f1-x2-middle', J17_F1_X2, 2, 38, ''],
  ['j9-f1-x2-bottom', J17_F1_X2, 3, 38, ''],
  ['j9-f1-x3-middle', J17_F1_X3, 2, 38, ''],
  ['j9-f1-x3-bottom', J17_F1_X3, 3, 38, ''],
  ['j9-f1-below-alone', ['x', ...J17_F1_X2.slice(2)], 1, 38, ''],
  // The row above the chain draws past 10 columns: refused whole from both
  // rows (with the clause out, `/r/aaa-bbb.md@2.0-3.6`), beside the same rows
  // with `Plan:` alone above them, which join.
  ['j9a-row-above', J17_J9A_ROW_ABOVE, 2, 10, ''],
  ['j9a-row-above-row3', J17_J9A_ROW_ABOVE, 3, 10, ''],
  ['j9a-row-above-control', J17_J9A_ROW_ABOVE.map((r, k) => (k === 1 ? 'Plan:' : r)), 2, 10, '/r/aaa-bbb.md@2.0-3.6'],
  // Since the fix round of his absolute-only round J11's top half refuses a
  // lone top piece below ANY row reaching past the widest row, so the two
  // readings above are J11's too; the row-above clause alone decides a top
  // row that holds more than its piece (with the clause out,
  // `/r/aaa-bbb.md@2.3-3.6`), beside its control.
  ['j9a-row-above-tokens', J17_J9A_ROW_ABOVE.map((r, k) => (k === 2 ? 'at /r/aaa-' : r)), 2, 10, ''],
  ['j9a-row-above-tokens-row3', J17_J9A_ROW_ABOVE.map((r, k) => (k === 2 ? 'at /r/aaa-' : r)), 3, 10, ''],
  ['j9a-row-above-tokens-control', J17_J9A_ROW_ABOVE.map((r, k) => (k === 1 ? 'Plan:' : k === 2 ? 'at /r/aaa-' : r)), 2, 10, '/r/aaa-bbb.md@2.3-3.6'],
  // The row below the chain: its first piece reaching past the width refuses
  // whatever stopped the walk, beside its control.
  ['j9-below-reach', J17_BELOW_REACH, 1, 22, ''],
  ['j9-below-reach-control', J17_BELOW_REACH.map((r, k) => (k === 3 ? 'c'.repeat(22) : r)), 1, 22, '/q/tortie/aaa-bbb.md@1.4-2.6'],
  // J10, HIS RULING OF 2026-10-14 ("Join absolute paths only"). The E1 rows
  // at 46 join the whole absolute path; at 47 and 50 the walk stops below
  // the top row and the two lower rows are RELATIVE, refused (with J10 out,
  // `src/main/__tests__/menu-popup-template.test.ts:38@2.2-3.21`, the
  // project's own file).
  ['j10-e1-46', J17_E1, 3, 46, '/private/tmp/wt-p3471-parent-rv2/src/main/__tests__/menu-popup-template.test.ts:38@1.10-3.21'],
  ['j10-e1-47', J17_E1, 3, 47, ''],
  ['j10-e1-50', J17_E1, 3, 50, ''],
  // X40: with J10 out, `build/fixtures/facts/manifests/package.json:134@3.0-4.9`.
  ['j10-x40', J17_X40, 4, 38, ''],
  // Issue 40's chain spelled relative joins from no row (with J10 out, the
  // whole relative path, `Users/…/brainstorming.md:134@1.0-3.30`).
  ['j10-relative-issue', J17_ISSUE_RELATIVE, 2, 45, ''],
  // U6's spellings. The target past the grammar's opening brackets and
  // `file://` decides: `(/`, `` `~/ ``, `file:///` and a gutter glued on join;
  // `~me/`, `./`, `../` and a bare name are relative and J10 refuses them (with
  // J10 out each joins); `x=/` is refused by the grammar first, because `=`
  // is no segment character (`looksLikePath`), so J10 never sees it.
  // The underline starts at the target's first cell past an opening bracket,
  // and at `f` for `file://`, which `stripDecoration` keeps visible.
  j17Spell('j10-spell-paren', 'see the (/abs/foo-', '/abs/foo-bar.md@1.9-2.6'),
  j17Spell('j10-spell-tick-tilde', 'see the `~/abs/foo-', '~/abs/foo-bar.md@1.9-2.6'),
  j17Spell('j10-spell-file', 'see the file:///abs/foo-', '/abs/foo-bar.md@1.8-2.6'),
  j17Spell('j10-spell-gutter', '•/abs/foo-', '/abs/foo-bar.md@1.1-2.6'),
  j17Spell('j10-spell-tilde-user', 'see the ~me/foo-', ''),
  j17Spell('j10-spell-dot', 'see the ./foo-', ''),
  j17Spell('j10-spell-dotdot', 'see the ../foo-', ''),
  j17Spell('j10-spell-bare', 'see the foo-', ''),
  j17Spell('j10-spell-glued', 'see the x=/abs/foo-', ''),
  // J11, A CUT BY A BREAKER THAT CUTS ANYWHERE (D15). The top half: the top
  // row holds only its piece below a row ending at the same column, 28, short
  // of 32 (with the half out, `/tmp/run-logs/nightly-build-output.log@2.0-3.10`,
  // which names `/tmp/…` where the screen names `/Users/me/proj/tmp/…`); its
  // control ends the row above one cell shorter and joins.
  ['j11-top', J17_J11_TOP, 2, 32, ''],
  ['j11-top-row3', J17_J11_TOP, 3, 32, ''],
  ['j11-top-control', J17_J11_TOP_CONTROL, 2, 32, '/tmp/run-logs/nightly-build-output.log@2.0-3.10'],
  // The bottom half: the bottom row holds only its piece, ending at 30 as the
  // row above does, short of 33, above `.map` (with the half out,
  // `/Users/me/proj/dist/assets/vendor-chunk-a/index.js@1.10-2.30`, which
  // names `index.js` where the screen names `index.js.map`); its control is
  // one cell longer and joins.
  ['j11-bottom', J17_J11_BOTTOM, 2, 33, ''],
  ['j11-bottom-row1', J17_J11_BOTTOM, 1, 33, ''],
  ['j11-bottom-control', J17_J11_BOTTOM_CONTROL, 2, 33, '/Users/me/proj/dist/assets/vendor-chunk/index.js@1.10-2.28'],
  // The reverify's nit at 38, cut at both ends: either half alone refuses it,
  // so it is owned by neither.
  ['j11-both', J17_J11_BOTH, 2, 38, ''],
  ['j11-both-row3', J17_J11_BOTH, 3, 38, ''],
  // L9, J11's price: a whole `~/` path whose two rows happen to end at one
  // column is refused too.
  ['j11-price', J17_J11_PRICE, 1, 31, ''],
  // J11 widened (the fix round of his absolute-only round). The bottom half:
  // a hyphen-aware cutter's mid-name cut, the row above ending short after
  // `-` (with the half out, `…/cmd.hard@1.10-2.41`, where the screen names
  // `cmd.hard13`), and the bottom row one cell WIDER than the row above.
  ['j11-hyphen', J17_J11_HYPHEN, 2, 45, ''],
  ['j11-wider', J17_J11_WIDER, 2, 33, ''],
  // The top half: Ink with one emoji, drawn a cell narrower than Ink counts.
  ['j11-emoji', J17_J11_EMOJI, 2, 47, ''],
  // A breaker that breaks before a `/`: the row above within `/tmp` (four
  // cells) of the widest row; with the fragment counted as one cell it joins.
  ['j11-slash', J17_J11_SLASH, 2, 32, ''],
  // The arithmetic's edge: the row above plus `/tmp` reaches ONE cell past
  // the widest row (25 + 4 = 29 against 28), so a breaker of limit 28 may
  // have cut there; asked one cell further, it joins.
  ['j11-edge', J17_J11_EDGE, 2, 32, ''],
  // Two emoji on the row above: three UTF-16 units a breaker may count past
  // what xterm drew; without them it joins.
  ['j11-undrawn', J17_J11_UNDRAWN, 2, 34, ''],
  // A gutter is not counted: `⏺ ` above a row a fragment short joins, and
  // with the gutter counted it would not.
  ['j11-gutter', J17_J11_GUTTER, 2, 32, '/tmp/run-logs/nightly-build-output.log@2.0-3.10'],
  // A root a path goes on from: a home, a variable, a URL's host.
  ['j11-root-tilde', J17_J11_TILDE, 2, 34, ''],
  ['j11-root-var', J17_J11_VAR, 2, 34, ''],
  ['j11-root-url', J17_J11_URL, 2, 34, ''],
  // A soft wrap whose row ends in `]` right before `/` (the lens's nit).
  ['j11-bracket', J17_J11_BRACKET, 2, 23, ''],
  // A wide glyph a code-point breaker counts as one cell: on the bottom
  // row's prose (the top half) and on the top row's (the bottom half).
  ['j11-wide-top', J17_J11_WIDE_TOP, 2, 36, ''],
  ['j11-wide-bottom', J17_J11_WIDE_BOTTOM, 1, 33, ''],
  // A row holding more than its piece has a space beside it, and joins.
  ['j11-top-tokens', J17_J11_TOP_TOKENS, 2, 32, '/tmp/run-logs/nightly-build-output.log@2.3-3.10'],
  ['j11-bottom-tokens', J17_J11_BOTTOM_TOKENS, 1, 36, '/Users/me/proj/dist/assets/vendor-chunk-a/index.js@1.10-2.30'],
  // The bottom row widest, but the row below starts with a character no name
  // goes on with, or the bottom piece ends in a line suffix: joins.
  ['j11-name', J17_J11_NAME, 1, 38, '/private/tmp/wt-p3471/.github/actions/setup/action.yml@1.9-2.34'],
  ['j11-line', J17_J11_LINE, 1, 38, '/private/tmp/wt-p3471/.claude/scheduled_tasks.lock:10@1.10-2.33'],
  // A cut at a break opportunity at the bottom: the bottom row plus the first
  // fragment of the row below reaches past the widest row above (24 + 9, 25
  // + 8 and 21 + 10 against 30): before a `/` (a bundle the Mac door would
  // open), after a `/` and after a `-`; with the fragment counted as one cell
  // each joins. Its control is short enough that `/Contents` would have fitted.
  ['j11-break-slash', J17_J11_BREAK_SLASH, 1, 33, ''],
  ['j11-break-folder', J17_J11_BREAK_FOLDER, 1, 36, ''],
  ['j11-break-dash', J17_J11_BREAK_DASH, 1, 36, ''],
  ['j11-break-short', J17_J11_BREAK_SHORT, 1, 33, '/Users/me/proj/dist/assets/Foo.app@1.10-2.14'],
  // Each break kind's fragment as its breaker measures it: after a `-` the
  // whole next token (Python's textwrap breaks again only between letters),
  // `build/output.log` (15 + 16 past 30) and, at the top, `/tmp/…` below a
  // row ending in `-` (23 + 28 past 28, where `/tmp`, 4, would not be); after
  // a `/` (UAX #14) through the next `/` or `-` no digit follows,
  // `Contents/` (22 + 9 past 30, where `Contents`, 8, would not be) and
  // `dollar-3.4.json:50` whole after `p342/` (21 + 18 past 30, where
  // `dollar-`, 7, would not be).
  ['j11-break-dash-token', J17_J11_BREAK_DASH_TOKEN, 1, 36, ''],
  ['j11-break-slash-edge', J17_J11_BREAK_SLASH_EDGE, 1, 36, ''],
  ['j11-break-digit', J17_J11_BREAK_DIGIT, 1, 36, ''],
  ['j11-top-after-dash', J17_J11_TOP_AFTER_DASH, 2, 32, ''],
  // Before a run of `--` (Python's textwrap): the run's cells, never one.
  ['j11-dashes-pi', J17_J11_DASHES_PI, 1, 41, ''],
  ['j11-dashes-pi-row2', J17_J11_DASHES_PI, 2, 41, ''],
  ['j11-dashes-plan', J17_J11_DASHES_PLAN, 1, 23, ''],
  ['j11-dashes-plan-row2', J17_J11_DASHES_PLAN, 2, 23, ''],
  ['j11-dashes-run', J17_J11_DASHES_RUN, 1, 23, ''],
  // The run clause alone: Python's rows narrower than the pane, no row full.
  ['j11-dashes-alone', J17_J11_DASHES_ALONE, 1, 34, ''],
  ['j11-dashes-alone-row2', J17_J11_DASHES_ALONE, 2, 34, ''],
  ['j11-dashes-alone-run', J17_J11_DASHES_ALONE_RUN, 1, 30, ''],
  ['j11-dashes-room', J17_J11_DASHES_ROOM, 2, 30, '/Users/me/projects/tortie/c/repo@1.22-2.25'],
  // The overflow refusal (his ruling of 2026-10-15): refused, then its controls.
  ['j11-overflow-planw', J17_J11_OVERFLOW_PLANW, 2, 19, ''],
  ['j11-overflow-planw-row4', J17_J11_OVERFLOW_PLANW, 4, 19, ''],
  ['j11-overflow-plan2s', J17_J11_OVERFLOW_PLAN2S, 2, 50, ''],
  ['j11-overflow-flag', J17_J11_OVERFLOW_FLAG, 2, 30, ''],
  ['j11-overflow-unicode', J17_J11_OVERFLOW_UNICODE, 2, 19, ''],
  ['j11-overflow-room-filled', J17_J11_OVERFLOW_ROOM_FILLED, 2, 23, ''],
  ['j11-overflow-word', J17_J11_OVERFLOW_WORD, 2, 19, '/Users/me/projects/tortie/notes/plan.md@2.0-4.1'],
  ['j11-overflow-bare', J17_J11_OVERFLOW_BARE, 2, 30, '/Users/me/projects/tortie/bin/deploy.sh@2.0-3.9'],
  ['j11-overflow-name', J17_J11_OVERFLOW_NAME, 2, 27, '/Users/me/proj/docs/research/assets/63-fixtures/pi-sessions--Users-example-rookery--/2026-06-12T04-57-36-108Z.jsonl:12@2.0-6.16'],
  ['j11-overflow-plus', J17_J11_OVERFLOW_PLUS, 2, 30, '/Users/me/projects/tortie/bin/g++@2.0-3.3'],
  ['j11-overflow-tokens', J17_J11_OVERFLOW_TOKENS, 1, 32, '/Users/me/projects/tortie/c/report.md@1.23-2.28']
];

/** [key, upper row, lower row, width, '1' joins or '0' refuses]. */
const J17_BOUNDARIES = [
  ['b-j1-comma', 'see /Users/me/a/b-c/d,', 'e.md', 22, '0'],
  ['b-j1-control', 'see /Users/me/a/b-c/d', 'e.md', 21, '1'],
  ['b-j2-head', 'see /Users/me/proj/notes-', '  — written at noon', 25, '0'],
  ['b-j2-gutter', 'see /Users/me/proj/notes-', '│ draft.md', 25, '1'],
  ['b-j3', 'see /a/b-', 'cde/f.md', 40, '0'],
  ['b-j5', J17_J5, 'README.md is the index', J17_J5.length + 5, '0'],
  ['b-j7-word', J17_J7, J17_J7_BELOW, J17_J7.length + 2, '0'],
  ['b-j7-dot', 'see /a/bbbbbbbbbbbb.', 'cde.md is', 22, '0'],
  ['b-j7-dash', 'see /a/bbbbbbbbbbbb-', 'cde.md is', 22, '1'],
  ['b-j7-slash', 'see /a/bbbbbbbbbbbb/', 'cde/f.md is', 22, '1'],
  ['b-j8-relative', 'moved src/', 'lib/util.ts today', 12, '0'],
  ['b-j8-tilde', 'moved ~/app/src/', 'lib/util.ts today', 18, '1'],
  ['b-j8-head', 'src/', 'lib/a.c', 7, '1'],
  // J9's upper half: an upper piece past the width, the control as a
  // 47-column repaint draws it, and the stale row at the 49 columns it was
  // drawn at, where it is a row like any other and joins. A lower piece past
  // the width is NOT the boundary's to refuse since his ruled round: the walk
  // crosses it, and `joinedPathAt` refuses the chain whole on its bottom row
  // (j9-stale-lower).
  ['b-j9-upper', J17_J9_STALE, J17_J9_BELOW, 47, '0'],
  ['b-j9-lower', J17_J9_FRESH, `${J17_J9_FILL}de`, 47, '1'],
  ['b-j9-control', J17_J9_FRESH, J17_J9_BELOW, 47, '1'],
  ['b-j9-drawn-at-49', J17_J9_STALE, J17_J9_BELOW, 49, '1']
];

const J17_ROWS = [
  'The plan is written down at',
  '/Users/johnberryman/projects/github/arcturus-',
  'labs/rook/.agents/skills/software-factory/',
  '.planning/brainstorming.md:134 and /a/other.md',
  '',
  '> '
];
const J17_EVERYTHING = [J17_FILE, '/Users/johnberryman/projects/github/arcturus-', '.planning/brainstorming.md', '/a/other.md'];
const J17_NOT_THE_FILE = J17_EVERYTHING.slice(1);
const J17_JOIN_LINK = `${J17_PATH}@1.2-30.4`;

/**
 * PHASE 347.1. The whole file and `/a/other.md` and NO fragment: the join is
 * accepted and no span it covers is, so the governing rule (rule 18) lets it
 * through. `/a/other.md` shares no cell with it.
 */
const J17_ACCEPTED = [J17_FILE, '/a/other.md'];
/** ...and `/a/other.md` alone: neither the join nor a fragment, so the DOOR CLAUSE is the only thing refusing the join. */
const J17_BARE = ['/a/other.md'];

/** [key, line (1-based), width, doors that accept, local, click, the reading, rows (J17_ROWS when absent)]. */
const J17_PROVIDERS = [
  ['p-accepted-top', 2, 47, J17_ACCEPTED, true, true, J17_JOIN_LINK],
  ['p-accepted-bottom', 4, 47, J17_ACCEPTED, true, false, `${J17_JOIN_LINK} | /a/other.md@36.4-46.4`],
  // (His ruled round: J17_ROWS' bottom row is 46 cells, which no 45-column
  // pane draws and J9 now refuses, so its second path, which this door does
  // not accept, is shortened to fit.)
  ['p-accepted-45', 2, 45, [J17_FILE], true, false, J17_JOIN_LINK, J17_ROWS.map((r) => r.replace(' and /a/other.md', ' and /a/o.md'))],
  ['p-refused-bare-top', 2, 47, J17_BARE, true, false, 'none'],
  ['p-refused-bare-bottom', 4, 47, J17_BARE, true, false, '/a/other.md@36.4-46.4'],
  // The kept fixtures: every fragment accepted, the whole file not. The
  // fragment clause owns these, and since Phase 347.1 rule 18 refuses the join
  // here too, so they read as today twice over.
  ['p-refused-top', 2, 47, J17_NOT_THE_FILE, true, false, '/Users/johnberryman/projects/github/arcturus-@1.2-45.2'],
  ['p-refused-bottom', 4, 47, J17_NOT_THE_FILE, true, false, '.planning/brainstorming.md:134@1.4-30.4 | /a/other.md@36.4-46.4'],
  ['p-remote', 3, 47, J17_EVERYTHING, false, false, 'none'],
  // J7: README.md and README.md.bak BOTH exist, so a join would be accepted;
  // the row must read as today, README.md's own link, and the row below none.
  ['p-j7-top', 2, J17_J7.length + 2, [J17_J7_README, `${J17_J7_README}.bak`], true, false, `${J17_J7_README}@18.2-46.2`, J17_J7_ROWS],
  ['p-j7-below', 3, J17_J7.length + 2, [J17_J7_README, `${J17_J7_README}.bak`], true, false, 'none', J17_J7_ROWS],
  // F1 (his ruled round): the door opens the project's own file of the
  // tail's name and nothing in the other folder, so the two rows below a
  // leftover row, cut into a join of their own, would draw it and open it.
  // Refused whole, they draw nothing, as today.
  ['p-j9-f1-x2', 3, 38, ['build/fixtures/facts/manifests/package.json'], true, false, 'none', J17_F1_X2],
  ['p-j9-f1-x3', 4, 38, ['build/fixtures/facts/manifests/package.json'], true, false, 'none', J17_F1_X3]
];

/**
 * The fixtures whose join is OFFERED, derived by hand: the door accepts the
 * whole file (J4) and refuses every span the join covers (rule 18). Every
 * other fixture must read exactly today's links, and these must not.
 */
const J17_OFFERED = new Set(['p-accepted-top', 'p-accepted-bottom', 'p-accepted-45']);

// ---------------------------------------------------------------------------
// Rule 18's tables (Phase 347.1, build/p3471/SPEC.md §6.2 and §5.2's GR1 to
// GR8). Every reading below was derived by hand from the governing rule and
// the provider's arithmetic, never read off the code.
// ---------------------------------------------------------------------------

const G18_TOP = '/Users/johnberryman/projects/github/arcturus-';
const G18_MIDDLE = 'labs/rook/.agents/skills/software-factory/';
const G18_BOTTOM = '.planning/brainstorming.md';
const G18_LIST_BASE = '/r/tortie';
/**
 * The door's KIND (the fix round, lens A's ablation A1b, which counted only
 * the editor door as taken and kept every committed test and corpus green):
 * issue 40's rows with the bottom piece an image the image door opens, and a
 * path broken after a folder whose lower piece is a `~/` PDF the Mac door
 * opens. A `~/` piece is the one absolute spelling that can start a lower row
 * below a row one cell short (J3 needs `~/`'s two cells), and the files door
 * gives a relative PDF no door at all (`relative-external`).
 */
const G18_IMAGE = '.planning/shot.png';
const G18_IMAGE_FILE = J17_FILE.replace(/brainstorming\.md$/, 'shot.png');
const G18_IMAGE_ROWS = ['The plan is written down at', J17_ISSUE[1], J17_ISSUE[2], G18_IMAGE, '', '> '];
const G18_MAC_FOLDER = '/Users/me/projects/app/docs/';
const G18_MAC_PIECE = '~/brief.pdf';
const G18_MAC_ROWS = ['The brief is at', G18_MAC_FOLDER, `${G18_MAC_PIECE} now`, '', '> '];
const g18List = (top, item) => ['Files:', `• ${top}`, `• ${item}`, '', '> '];
/** One cell short of the last column: the top row's cells plus one (every character here is one cell). */
const g18Short = (rows) => [...rows[1]].length + 1;
// The third reverify's live shapes, each with both spellings files.
const G18_ABS = g18List('/r/tortie/docs/', 'notes/a.md');
const G18_TILDE = g18List('~/tortie/docs/', 'notes/a.md');
const G18_DASH = g18List('/r/tortie/src/n8kk-', 'draft8.md');
// A relative folder ON the last column above an item indented by two spaces,
// and above one indented by `⎿` and two spaces: refusal 8's head clause
// strips only the gutter and ONE space, so the parent offered both items.
const G18_INDENT = ['x', 'docs/research/', '  notes.md', '', 'docs/research/', '⎿  notes.md', 'y'];
/**
 * ...and its ABSOLUTE twin (his absolute-only round, 2026-10-14): J10 refuses
 * the relative join above, so the governing rule decides nothing there, and
 * this is the shape G must still hold. `/r/tortie/docs/research/` is 24
 * cells, ON the last column; `notes.md` under the base `/r/tortie` is
 * `/r/tortie/notes.md`, which the door accepts beside the whole path.
 */
const G18_INDENT_ABS = G18_INDENT.map((r) => (r === 'docs/research/' ? '/r/tortie/docs/research/' : r));

/**
 * Rule 18's provider fixtures. Every row is hovered. `expect` 'today' means
 * every row reads exactly today's links; otherwise it maps a line (1-based) to
 * its reading and every other line reads today's. `held` maps a line to the
 * link it draws today, pinned by hand, so a fixture whose today is empty
 * cannot pass. `clicks` maps a line to what a press on its first link opens.
 * `gone` is a row that answers `after` reads and then nothing.
 */
const G18_FIXTURES = [
  // GR1 to GR3: one piece of issue 40's path is a file Tortie opens.
  { key: 'g-fragment-top', rows: J17_ISSUE, width: 47, doors: [J17_FILE, G18_TOP], base: J17_BASE, expect: 'today',
    held: { 2: `${G18_TOP}@1.2-45.2` }, clicks: { 2: `${G18_TOP}:undefined` } },
  { key: 'g-fragment-bottom', rows: J17_ISSUE, width: 47, doors: [J17_FILE, G18_BOTTOM], base: J17_BASE, expect: 'today',
    held: { 4: `${G18_BOTTOM}:134@1.4-30.4` }, clicks: { 4: `${G18_BOTTOM}:134` } },
  { key: 'g-fragment-middle', rows: J17_ISSUE, width: 47, doors: [J17_FILE, G18_MIDDLE], base: J17_BASE, expect: 'today',
    held: { 3: `${G18_MIDDLE}@1.3-42.3` } },
  // GR4, one cell short of the last column.
  { key: 'g-list-abs', rows: G18_ABS, width: g18Short(G18_ABS), doors: ['/r/tortie/docs/notes/a.md', 'notes/a.md'], base: G18_LIST_BASE,
    expect: 'today', held: { 3: 'notes/a.md@3.3-12.3' }, clicks: { 3: 'notes/a.md:undefined' } },
  { key: 'g-list-tilde', rows: G18_TILDE, width: g18Short(G18_TILDE), doors: ['~/tortie/docs/notes/a.md', 'notes/a.md'], base: G18_LIST_BASE,
    expect: 'today', held: { 3: 'notes/a.md@3.3-12.3' }, clicks: { 3: 'notes/a.md:undefined' } },
  { key: 'g-list-dash', rows: G18_DASH, width: g18Short(G18_DASH), doors: ['/r/tortie/src/n8kk-draft8.md', 'draft8.md'], base: G18_LIST_BASE,
    expect: 'today', held: { 3: 'draft8.md@3.3-11.3' }, clicks: { 3: 'draft8.md:undefined' } },
  // GR5, and its absolute twin (his absolute-only round): J10 refuses the
  // relative join, so G owns the twin, where the join `/r/tortie/docs/
  // research/notes.md` is accepted and must still yield to the indented item.
  { key: 'g-indent-edge', rows: G18_INDENT, width: 14, doors: ['docs/research/notes.md', 'notes.md'], base: G18_LIST_BASE,
    expect: 'today', held: { 3: 'notes.md@3.3-10.3', 6: 'notes.md@4.6-11.6' } },
  { key: 'g-indent-edge-abs', rows: G18_INDENT_ABS, width: 24, doors: ['/r/tortie/docs/research/notes.md', 'notes.md'],
    base: G18_LIST_BASE, expect: 'today', held: { 3: 'notes.md@3.3-10.3', 6: 'notes.md@4.6-11.6' },
    clicks: { 3: 'notes.md:undefined', 6: 'notes.md:undefined' } },
  // GR6: a fragment refusal 8 hid drew no link today, so the join IS offered.
  { key: 'g-edge-45', rows: J17_ISSUE, width: 45, doors: [J17_FILE, G18_TOP], base: J17_BASE,
    expect: { 2: J17_JOIN_LINK, 3: J17_JOIN_LINK, 4: J17_JOIN_LINK }, clicks: { 2: `${J17_FILE}:134` } },
  { key: 'g-edge-head-45', rows: J17_ISSUE, width: 45, doors: [J17_FILE, G18_MIDDLE], base: J17_BASE,
    expect: { 2: J17_JOIN_LINK, 3: J17_JOIN_LINK, 4: J17_JOIN_LINK } },
  // GR7: an accepted span beside the join, sharing no cell with it.
  { key: 'g-beside', rows: J17_ROWS, width: 47, doors: J17_ACCEPTED, base: J17_BASE,
    expect: { 2: J17_JOIN_LINK, 3: J17_JOIN_LINK, 4: `${J17_JOIN_LINK} | /a/other.md@36.4-46.4` } },
  // GR8: the bottom row of the chain answers once and then nothing, so the
  // rule cannot read every row it covers and the join is refused.
  { key: 'g-row-gone', rows: J17_ROWS, width: 47, doors: J17_ACCEPTED, base: J17_BASE, expect: 'today',
    held: { 4: '/a/other.md@36.4-46.4' }, gone: { row: 3, after: 1 } },
  // GR11 (the fix round): the door's kind does not matter. The image door's
  // fragment and the Mac door's are held exactly as an editor one is, and a
  // press opens the fragment through its own door.
  { key: 'g-fragment-image', rows: G18_IMAGE_ROWS, width: 47, doors: [G18_IMAGE_FILE, G18_IMAGE], base: J17_BASE,
    kinds: { [G18_IMAGE_FILE]: 'image', [G18_IMAGE]: 'image' }, expect: 'today',
    held: { 4: `${G18_IMAGE}@1.4-18.4` }, clicks: { 4: `${G18_IMAGE}:undefined` } },
  { key: 'g-fragment-mac', rows: G18_MAC_ROWS, width: G18_MAC_FOLDER.length + 1,
    doors: [`${G18_MAC_FOLDER}${G18_MAC_PIECE}`, G18_MAC_PIECE], base: '/Users/me/projects/app',
    kinds: { [`${G18_MAC_FOLDER}${G18_MAC_PIECE}`]: 'mac', [G18_MAC_PIECE]: 'mac' }, expect: 'today',
    held: { 3: `${G18_MAC_PIECE}@1.3-11.3` }, clicks: { 3: `mac:${G18_MAC_PIECE}` } }
];

/**
 * Rule 18's ablations, one clause each, anchored on SPEC §4.1's exact lines
 * (an anchor that matches nothing or more than once is a finding), each
 * required to move EVERY reading it owns. A fixture key owns all its rows.
 */
const G18_ABLATIONS = [
  { name: 'G off: a join is accepted without asking whether it takes a cell from a link that opens today', file: 'path-links.ts',
    owns: ['g-fragment-top', 'g-fragment-bottom', 'g-fragment-middle', 'g-list-abs', 'g-list-tilde', 'g-list-dash', 'g-indent-edge-abs',
      'g-fragment-image', 'g-fragment-mac'],
    from: '&& joinAnswer.door !== null && !taken', to: '&& joinAnswer.door !== null' },
  { name: 'only the editor door’s answer, or a missing one, counts as taken', file: 'path-links.ts',
    owns: ['g-fragment-image', 'g-fragment-mac'],
    from: 'const taken = under.some((_, k) => answers[underAt + k]?.door !== null);',
    to: "const taken = under.some((_, k) => answers[underAt + k] === undefined || answers[underAt + k]?.door === 'editor');" },
  { name: 'only the bottom row the join covers is judged', file: 'path-spans.ts', owns: ['g-fragment-top'],
    from: 'for (let r = join.top; r <= join.bottom; r += 1) {', to: 'for (let r = join.bottom; r <= join.bottom; r += 1) {' },
  { name: 'only the top row the join covers is judged', file: 'path-spans.ts', owns: ['g-fragment-bottom'],
    from: 'for (let r = join.top; r <= join.bottom; r += 1) {', to: 'for (let r = join.top; r <= join.top; r += 1) {' },
  { name: 'a row is judged without the pane’s width', file: 'path-spans.ts', owns: ['g-edge-45', 'R18-E'],
    from: '    width,\n    columns: here.columns,', to: '    width: Number.POSITIVE_INFINITY,\n    columns: here.columns,' },
  { name: 'a row is judged without the row above it', file: 'path-spans.ts', owns: ['g-edge-head-45', 'R18-E'],
    from: '    above: above === null ? null : above.text,\n    aboveEnd: above === null ? 0 : (above.columns[above.text.length] ?? null)',
    to: '    above: null,\n    aboveEnd: 0' },
  { name: 'a row the join covers that cannot be read keeps the join', file: 'path-spans.ts', owns: ['g-row-gone'],
    from: '    if (here === null) return null;\n    for (const span of rowSpansAt(', to: '    if (here === null) continue;\n    for (const span of rowSpansAt(' },
  { name: 'the cell test is widened to whole rows', file: 'path-spans.ts', owns: ['g-beside'],
    from: 'if (sharesCellWithJoin(range, r, join)) out.push(', to: 'if (true) out.push(' },
  { name: 'the spans under the join are never asked, so every one reads as accepted', file: 'path-links.ts',
    owns: ['p-accepted-top', 'p-accepted-bottom', 'p-accepted-45'],
    from: '    for (const u of under) targets.push(u.target);\n', to: '' }
];

/**
 * One clause each. `owns` are the readings it must move, EVERY one of them
 * since Phase 347.1, which measured two owns lists the kept rule could not
 * keep: J7's provider rows are now held by the governing rule too (README.md
 * draws a link today, so a join over it is refused even with J7 gone), and
 * J8's two join readings were held by J8 at the chain's top, which refused
 * the same relative folder wherever it sat on its row. Each moved to the
 * reading that still turns on its clause alone. His absolute-only round
 * (2026-10-14, D14 to D16) did the same again: J10 refuses every relative
 * chain, so the readings that pinned one belong to J10's ablation, J9's
 * three clauses and J8 in `joinBoundary` each own an absolute twin, J11's
 * two halves own one cut each, and J8 at the chain's top is gone with its
 * clause.
 */
const J17_ABLATIONS = [
  { name: 'J1, the upper row’s last character, is not asked', file: 'path-spans.ts', owns: ['j1-colon', 'b-j1-comma'],
    from: "  if (!PATH_CHARACTER.test(piece.text[piece.text.length - 1] ?? '')) return false;\n", to: '' },
  { name: 'J2’s head, the lower row’s first character, is not asked', file: 'path-spans.ts', owns: ['j2-head-bracket', 'b-j2-head'],
    from: "  if (!PATH_CHARACTER.test(next.text[0] ?? '')) return false;\n", to: '' },
  { name: 'J2’s middle row may hold two tokens going up', file: 'path-spans.ts', owns: ['j2-middle-up'],
    from: '    if (top !== y && current.shape.tokens.length !== 1) break;\n', to: '' },
  { name: 'J2’s middle row may hold two tokens going down', file: 'path-spans.ts', owns: ['j2-middle-down'],
    from: '    if (bottom !== y && current.shape.tokens.length !== 1) break;\n', to: '' },
  { name: 'the hovered row is put strictly inside whatever it holds', file: 'path-spans.ts', owns: ['j2-hovered'],
    from: '  if (top < y && bottom > y && here.shape.tokens.length !== 1) {\n    bottom = y;\n  } else if (downOver) {', to: '  if (downOver) {' },
  { name: 'J3, the forced break, is not asked', file: 'path-spans.ts', owns: ['j3-fits', 'b-j3', 'issue-50-top', 'issue-52-middle'],
    from: '  if (!(upperEnd + (unitPast - unitFrom) > width)) return false;\n', to: '' },
  { name: 'J5, a folder above a bare name short of the last column, is not asked', file: 'path-spans.ts', owns: ['j5-short', 'b-j5'],
    from: '    !(upperEnd >= width)\n  ) {', to: '    false\n  ) {' },
  { name: 'J7, a row short of the last column ending on anything but `/` or `-`, is not asked', file: 'path-spans.ts',
    owns: ['j7-short', 'j7-short-below', 'b-j7-word', 'b-j7-dot'],
    from: '  if (!(upperEnd >= width) && !/[/-]$/.test(piece.text)) return false;\n', to: '' },
  { name: 'J8, a relative folder after other words short of the last column, is not asked', file: 'path-spans.ts',
    owns: ['b-j8-relative'],
    from: '    piece.start !== upper.head &&\n', to: '    false &&\n' },
  { name: 'J9’s upper half, a boundary whose upper row reads past the pane’s width, is crossed', file: 'path-spans.ts',
    owns: ['j9a-stale-upper', 'j9a-stale-upper-top', 'b-j9-upper'],
    from: '  if (upperEnd > width) return false;\n', to: '' },
  { name: 'J9 refused whole: the row above the chain reading past the width is not asked (the fix round’s cut)', file: 'path-spans.ts',
    owns: ['j9a-row-above-tokens', 'j9a-row-above-tokens-row3'],
    from: '  if (pastWidth(top - 1) || pastWidth(bottom)) return null;\n', to: '  if (pastWidth(bottom)) return null;\n' },
  { name: 'J9 refused whole: the chain’s bottom row reading past the width is not asked', file: 'path-spans.ts',
    owns: ['j9a-stale-lower', 'j9-prefix-top', 'j9-prefix-bottom'],
    from: '  if (pastWidth(top - 1) || pastWidth(bottom)) return null;\n', to: '  if (pastWidth(top - 1)) return null;\n' },
  { name: 'J9 refused whole: the first piece of the row below the chain reaching past the width is not asked', file: 'path-spans.ts',
    owns: ['j9-below-reach'],
    from: '    if (reach === undefined || reach > width) return null;\n', to: '' },
  { name: 'J10, his ruling (join absolute paths only), is not asked', file: 'path-spans.ts',
    owns: ['j2-middle-up', 'j8-full', 'j8-top-full', 'j8-top-bullet', 'j8-top-alone', 'j9-fresh-upper',
      'j9-g-clean-midwrap', 'j9-fresh-lower', 'j9-fresh-after-piece', 'j9-f1-below-alone', 'j10-x40',
      'j10-relative-issue'],
    from: "  if (!target.startsWith('/') && !target.startsWith('~/')) return null;\n", to: '' },
  { name: 'J11’s top half, a lone top piece a breaker may have cut below the row above, is not asked', file: 'path-spans.ts',
    owns: ['j11-top', 'j11-top-row3', 'j11-emoji', 'j11-slash', 'j11-undrawn', 'j11-root-tilde', 'j11-root-var', 'j11-root-url', 'j11-bracket', 'j11-wide-top'],
    from: '    aboveTop !== null &&\n', to: '    false &&\n' },
  { name: 'J11’s bottom half, a lone bottom piece at the widest row a breaker drew, is not asked', file: 'path-spans.ts',
    owns: ['j11-bottom', 'j11-bottom-row1', 'j11-hyphen', 'j11-wider', 'j11-wide-bottom'],
    from: '    firstBelow !== undefined &&\n', to: '    false &&\n' },
  { name: 'J11’s top half counts the moved fragment as one cell (only a cut at the limit)', file: 'path-spans.ts',
    owns: ['j11-slash', 'j11-top-after-dash'],
    from: '(movedFragmentCells(topRow.row, topPiece, upperPiece(aboveTop.shape)) ?? Number.POSITIVE_INFINITY)', to: '1' },
  { name: 'J11’s top half asks one cell past the widest row rather than past it', file: 'path-spans.ts',
    owns: ['j11-edge'],
    from: '      widest ||\n', to: '      widest + 1 ||\n' },
  { name: 'J11’s bottom half asks past the widest row above rather than reaching it', file: 'path-spans.ts',
    owns: ['j11-bottom', 'j11-bottom-row1'],
    from: '      widestAbove\n  ) {', to: '      widestAbove + 1\n  ) {' },
  { name: 'a break opportunity’s fragment is counted as one cell, at both ends', file: 'path-spans.ts',
    owns: ['j11-break-slash', 'j11-break-folder', 'j11-break-dash', 'j11-break-dash-token', 'j11-break-slash-edge', 'j11-break-digit', 'j11-slash', 'j11-top-after-dash', 'j11-dashes-alone', 'j11-dashes-alone-run'],
    from: "  if (piece === undefined) return undefined;\n  const last = ended?.text.slice(-1);\n", to: '  if (piece === undefined) return undefined;\n  return 1;\n  const last = ended?.text.slice(-1);\n' },
  { name: 'a piece that starts with `/` is not counted as a break before it', file: 'path-spans.ts',
    owns: ['j11-break-slash', 'j11-slash', 'j11-edge'],
    from: "  if (piece.text.startsWith('/')) return firstFragmentCells(row, piece);\n", to: '' },
  { name: 'a piece ending in `-` is not counted as a break after it', file: 'path-spans.ts',
    owns: ['j11-break-dash', 'j11-break-dash-token', 'j11-top-after-dash'],
    from: "  if (last === '-') return tokenCells(row, piece);\n", to: '' },
  { name: 'a piece ending in `/` is not counted as a break after it', file: 'path-spans.ts',
    owns: ['j11-break-folder', 'j11-break-slash-edge', 'j11-break-digit', 'b8-tilde-below'],
    from: "  if (last === '/') {", to: '  if (false) {' },
  { name: 'after a `-`, the fragment is the first fragment rather than the whole token', file: 'path-spans.ts',
    owns: ['j11-break-dash-token', 'j11-top-after-dash'],
    from: "  if (last === '-') return tokenCells(row, piece);\n", to: "  if (last === '-') return firstFragmentCells(row, piece);\n" },
  { name: 'after a `/`, a `-` before a digit is read as a break', file: 'path-spans.ts',
    owns: ['j11-break-digit'],
    from: '    const at = piece.text.slice(1).search(/[/-](?!\\d)/);\n', to: '    const at = piece.text.slice(1).search(/[/-]/);\n' },
  { name: 'after a `/`, the fragment leaves its own `/` out', file: 'path-spans.ts',
    owns: ['j11-break-slash-edge'],
    from: '    return tokenCells(row, piece, at === -1 ? piece.text.length : at + 2);\n', to: '    return tokenCells(row, piece, at === -1 ? piece.text.length : at + 1);\n' },
  { name: 'a run of `--` starting the row below is not counted as a break before it (Python’s textwrap)', file: 'path-spans.ts',
    owns: ['j11-dashes-alone', 'j11-dashes-alone-row2', 'j11-dashes-alone-run'],
    from: '  if (run > 0) return tokenCells(row, piece, run);\n', to: '' },
  { name: 'a run of `-` is counted as two cells whatever its length', file: 'path-spans.ts',
    owns: ['j11-dashes-alone-run'],
    from: '  if (run > 0) return tokenCells(row, piece, run);\n', to: '  if (run > 0) return tokenCells(row, piece, 2);\n' },
  { name: 'before a run of `--`, the fragment is the whole token rather than the run', file: 'path-spans.ts',
    owns: ['j11-dashes-room'],
    from: '  if (run > 0) return tokenCells(row, piece, run);\n', to: '  if (run > 0) return tokenCells(row, piece);\n' },
  // THE OVERFLOW REFUSAL (his ruling of 2026-10-15): the clause whole, then
  // one ablation per conjunct, each a broader refusal that takes a control's
  // join away, and the Unicode word character after the run.
  { name: 'J11’s overflow refusal, an overflow soft-wrapped above a run of `--`, is not asked', file: 'path-spans.ts',
    owns: ['j11-overflow-planw', 'j11-overflow-planw-row4', 'j11-overflow-plan2s', 'j11-overflow-flag', 'j11-overflow-unicode', 'j11-overflow-room-filled'],
    from: '    chainFillsAbove\n  ) {', to: '    false\n  ) {' },
  { name: 'the overflow refusal reads a bottom piece ending in a character Python’s textwrap never breaks after', file: 'path-spans.ts',
    owns: ['j11-overflow-plus'],
    from: "    ENDS_BEFORE_A_RUN.test(bottomPiece?.text ?? '') &&\n", to: '' },
  { name: 'the overflow refusal reads a row below that starts with no run of `--` and a word character', file: 'path-spans.ts',
    owns: ['j11-overflow-word', 'j11-overflow-bare', 'j11-overflow-name'],
    from: "    STARTS_A_RUN.test(firstBelow?.text ?? '') &&\n", to: '' },
  { name: 'the overflow refusal reads a chain no row of which fills the pane', file: 'path-spans.ts',
    owns: ['j11-dashes-room'],
    from: '    chainFillsAbove\n  ) {', to: '    true\n  ) {' },
  { name: 'the overflow refusal reads a bottom row holding more than its piece', file: 'path-spans.ts',
    owns: ['j11-overflow-tokens'],
    from: '    bottomRow.shape.tokens.length === 1 &&\n    ENDS_BEFORE_A_RUN', to: '    ENDS_BEFORE_A_RUN' },
  { name: 'the overflow refusal reads the word character after the run as ASCII alone', file: 'path-spans.ts',
    owns: ['j11-overflow-unicode'],
    from: 'const STARTS_A_RUN = /^-{2,}[\\p{L}\\p{N}_]/u;', to: 'const STARTS_A_RUN = /^-{2,}\\w/;' },
  { name: 'J11’s top half counts no cell a breaker may count past what xterm drew', file: 'path-spans.ts',
    owns: ['j11-undrawn'],
    from: '      cellsUndrawn(aboveTop.shape) +\n', to: '      0 +\n' },
  { name: 'J11 counts the gutter among the cells a breaker may count', file: 'path-spans.ts',
    owns: ['j11-gutter'],
    from: '  for (let i = shape.head; i < shape.drawn.length; i += 1) {\n    if (shape.drawn.charCodeAt(i) > 0x7f) n += 1;', to: '  for (let i = 0; i < shape.drawn.length; i += 1) {\n    if (shape.drawn.charCodeAt(i) > 0x7f) n += 1;' },
  { name: 'J11’s top half never asks about a root a path goes on from', file: 'path-spans.ts',
    owns: ['j11-root-tilde', 'j11-root-var', 'j11-root-url'],
    from: '      continuesARoot(upperPiece(aboveTop.shape), topPiece))', to: '      false)' },
  { name: 'a home or a variable alone is not a root', file: 'path-spans.ts',
    owns: ['j11-root-tilde', 'j11-root-var'],
    from: '  return ROOT_ALONE.test(text) || URL_START.test(text + piece.text);', to: '  return URL_START.test(text + piece.text);' },
  { name: 'a URL’s host is not a root', file: 'path-spans.ts',
    owns: ['j11-root-url'],
    from: '  return ROOT_ALONE.test(text) || URL_START.test(text + piece.text);', to: '  return ROOT_ALONE.test(text);' },
  { name: 'J11 counts a wide glyph as xterm draws it', file: 'path-spans.ts',
    owns: ['j11-wide-top', 'j11-wide-bottom'],
    from: '    counted.push(got.shape.end - cellsWide(got.row, got.shape));', to: '    counted.push(got.shape.end);' },
  { name: 'J11’s top half reads a top row holding more than its piece', file: 'path-spans.ts',
    owns: ['j11-top-tokens'],
    from: '    topRow.shape.tokens.length === 1 &&\n    ((aboveTop', to: '    ((aboveTop' },
  { name: 'J11’s bottom half reads a bottom row holding more than its piece', file: 'path-spans.ts',
    owns: ['j11-bottom-tokens'],
    from: '    bottomRow.shape.tokens.length === 1 &&\n    NAME_CHARACTER', to: '    NAME_CHARACTER' },
  { name: 'J11’s bottom half reads a row below that starts with a character no name goes on with', file: 'path-spans.ts',
    owns: ['j11-name'],
    from: "    NAME_CHARACTER.test(firstBelow.text[0] ?? '') &&\n", to: '' },
  { name: 'J11’s bottom half reads a bottom piece that ends in a line suffix', file: 'path-spans.ts',
    owns: ['j11-line'],
    from: "    stripDecoration(bottomPiece?.text ?? '').line === undefined &&\n", to: '' },
  { name: 'J6 at the top edge is not asked', file: 'path-spans.ts', owns: ['j6-top'],
    from: '  if (top === 0 && topPiece !== undefined && topPiece.start === topRow.shape.head) {', to: '  if (false) {' },
  { name: 'J6 at the bottom edge is not asked', file: 'path-spans.ts', owns: ['j6-bottom'],
    from: '    bottom === last &&\n', to: '    false &&\n' },
  { name: 'the row cap is lifted', file: 'path-spans.ts', owns: ['cap-rows-9', 'cap-rows-9-middle'],
    from: 'export const MAX_JOIN_ROWS = 8;', to: 'export const MAX_JOIN_ROWS = 1_000_000;' },
  { name: 'the row cap is asked of each direction and not of the whole join', file: 'path-spans.ts', owns: ['cap-rows-9-middle'],
    from: '  if (bottom - top + 1 > MAX_JOIN_ROWS) return null;\n', to: '' },
  { name: 'the character cap is not asked', file: 'path-spans.ts', owns: ['cap-chars-1025'],
    from: '    if (joined.length > MAX_JOIN_CHARS) return null;\n', to: '' },
  { name: 'the joined token skips the grammar a row span meets', file: 'path-spans.ts', owns: ['grammar'],
    from: '  if (!looksLikePath(token.text)) return null;\n', to: '' },
  { name: 'a strip that leaves one row is still answered as a join', file: 'path-spans.ts', owns: ['one-row-left'],
    from: '  if (first.row === lastCell.row) return null;\n', to: '' },
  { name: 'the first cell is a string index rather than a column', file: 'path-spans.ts', owns: ['decorated'],
    from: '  const startColumn = read(first.row)?.row.columns[first.at];', to: '  const startColumn = first.at;' },
  { name: 'THE DOOR CLAUSE: a join is offered when the door refused it', file: 'path-links.ts', owns: ['p-refused-bare-top', 'p-refused-bare-bottom'],
    from: '      join !== null && joinAnswer !== undefined && joinAnswer.door !== null', to: '      join !== null' },
  { name: 'THE FRAGMENT CLAUSE: row spans are dropped when the join was refused', file: 'path-links.ts', owns: ['p-refused-top', 'p-refused-bottom'],
    from: '      if (accepted !== null && sharesCellWithJoin(range, y - 1, accepted)) continue;', to: '      if (join !== null && sharesCellWithJoin(range, y - 1, join)) continue;' },
  { name: 'THE RANGE CLAUSE: the range ends on the top row', file: 'path-links.ts', owns: ['p-accepted-top', 'p-accepted-bottom'],
    from: '          end: { x: accepted.endColumn, y: accepted.bottom + 1 }', to: '          end: { x: accepted.endColumn, y: accepted.top + 1 }' },
  { name: 'the joined target is never asked through doorFor', file: 'path-links.ts', owns: ['p-accepted-top'],
    from: '    if (join !== null) targets.push(join.target);\n', to: '' },
  { name: 'a row with no span of its own never offers a join', file: 'path-links.ts', owns: ['p-accepted-45'],
    from: '    if (spans.length === 0 && join === null) {', to: '    if (spans.length === 0) {' }
];

/**
 * The ONE reader `joinedPathAt` is handed, by name: a `const` arrow declared
 * exactly once in `provideLinks`, and its body. Null when the join is handed
 * anything else, because the governing rule must judge the very rows the join
 * read, through the same reader, and an inline reader is a second one.
 */
function oneReaderBody(provide, name) {
  if (!/^[A-Za-z_$][\w$]*$/.test(name ?? '')) return null;
  const re = new RegExp(`\\bconst ${name.replace(/\$/g, '\\$')}\\b\\s*(?::[^=]+)?=\\s*`, 'g');
  const found = [...provide.matchAll(re)];
  if (found.length !== 1) return null;
  let at = found[0].index + found[0][0].length;
  if (provide[at] !== '(') return null;
  const params = closeOf(provide, at);
  if (params === -1) return null;
  const arrow = provide.indexOf('=>', params);
  if (arrow === -1 || /[;{}]/.test(provide.slice(params + 1, arrow))) return null;
  at = arrow + 2;
  while (/\s/.test(provide[at] ?? '')) at += 1;
  if (provide[at] === '{') return blockAt(provide, at);
  const end = provide.indexOf(';', at);
  return end === -1 ? null : provide.slice(at, end);
}

/** Rule 17's READ half, written as a function so it is proved on plants. */
function joinWiringFindings(text) {
  const out = [];
  const code = stripComments(text);
  if (/\bisWrapped\b/.test(code)) {
    out.push('the provider reads isWrapped, which research 115 §4 measured present and wrong after the repaints a row passes through');
  }
  const provide = methodBodyOf(code, 'provideLinks');
  const built = methodBodyOf(code, 'linksFor');
  if (provide === null || built === null) {
    out.push('there is no provideLinks or no linksFor, so this rule read nothing');
    return out;
  }
  const call = provide.indexOf('joinedPathAt(');
  if (call === -1 || closeOf(provide, call + 'joinedPathAt'.length) === -1) {
    out.push('provideLinks never asks for a join, so a broken path opens nothing');
    return out;
  }
  const args = callArguments(provide, call + 'joinedPathAt'.length).map((a) => a.replace(/\s+/g, ' '));
  if (args.length !== 4) {
    out.push(`the join is asked with ${String(args.length)} facts rather than its reader, the hovered row, the buffer's end and the width`);
    return out;
  }
  const [reader, , end, width] = args;
  if (width !== 'this.term.cols') {
    out.push("the join is not asked about the pane's own width, Terminal.cols");
  }
  if (end !== 'buffer.length - 1') {
    out.push('the join is not told where the buffer ends, so J6 cannot see its bottom edge');
  }
  const body = oneReaderBody(provide, reader);
  if (body === null) {
    out.push('the join is not handed ONE named reader of drawn rows, a const arrow declared once in provideLinks');
  } else {
    if (!/translateToString\(true\)/.test(body)) {
      out.push('the join reads rows that are not as drawn');
    }
    if (!/columns: cellColumns\(/.test(body)) {
      out.push("the join's rows carry no column map of their own, so a column is a string index");
    }
  }
  if (!/targets\.push\(join\.target\)/.test(built) || !/this\.doorFor\(target, base\)/.test(built)) {
    out.push("the joined target is not asked through the same doorFor and cache as a span");
  }
  if ((built.match(/Promise\.all\(/g) ?? []).length !== 1) {
    out.push('the join is asked in a round trip of its own rather than beside the spans');
  }
  return out;
}

/**
 * Every production file under `src/` declaring `sharesCellWithJoin`, as
 * repository-relative paths: the one cell test the governing rule and the
 * fragment clause share, so it has one spelling. Tests are left out the way
 * `filesNaming` leaves them out, because a test that proves this scan can
 * see a declaration holds one as a string.
 */
function cellTestDeclarations(files) {
  const re = /\b(?:function\s*\*?\s*sharesCellWithJoin\s*[(<]|(?:const|let|var)\s+sharesCellWithJoin\b)/;
  return files.filter(({ text }) => re.test(stripComments(text))).map(({ rel }) => rel).sort();
}

/**
 * Rule 18's READ half (Phase 347.1, build/p3471/SPEC.md §6.2 R18-R), written
 * as a function so it is proved on plants cut from the shipping text.
 */
function governingWiringFindings(linksText, spansText, declarations) {
  const out = [];
  const links = stripComments(linksText);
  const spansCode = stripComments(spansText);
  const provide = methodBodyOf(links, 'provideLinks');
  const built = methodBodyOf(links, 'linksFor');
  if (provide === null || built === null) {
    out.push('there is no provideLinks or no linksFor, so this rule read nothing');
    return out;
  }
  const joinCall = provide.indexOf('joinedPathAt(');
  const reader = joinCall === -1 ? null : callArguments(provide, joinCall + 'joinedPathAt'.length)[0];
  const underCall = provide.indexOf('spansUnderJoin(');
  if (underCall === -1) {
    out.push('provideLinks never asks spansUnderJoin, so no row a join covers is judged before it is offered');
  } else {
    const args = callArguments(provide, underCall + 'spansUnderJoin'.length).map((a) => a.replace(/\s+/g, ' '));
    if (args.length !== 3 || reader === null || args[0] !== reader || !/^[A-Za-z_$][\w$]*$/.test(args[0])) {
      out.push('spansUnderJoin is not handed the SAME named reader joinedPathAt is, so the rule judges rows the join did not read');
    }
    if (args[2] !== 'this.term.cols') {
      out.push("spansUnderJoin is not asked about the pane's own width, Terminal.cols");
    }
  }
  if (!/\bunder === null \? null : candidate\b/.test(provide)) {
    out.push('a row the join covers that cannot be read does not refuse the join');
  }
  const pushed = built.search(/for \(const u of under\) targets\.push\(u\.target\);/);
  const round = built.indexOf('Promise.all(');
  if (pushed === -1 || round === -1 || pushed > round) {
    out.push('the spans under the join are not asked in the one Promise.all beside the join');
  }
  if (!/const taken = under\.some\(\(_, k\) => answers\[underAt \+ k\]\?\.door !== null\);/.test(built)) {
    out.push('taken does not read a span under the join as accepted unless the door refused it, a missing answer included');
  }
  const accepted = /const accepted =([\s\S]*?);/.exec(built);
  if (accepted === null || !/&& !taken\b/.test(accepted[1])) {
    out.push('the join is accepted without asking whether it takes a cell from a link that opens today');
  }
  const under = functionBodyOf(spansCode, 'spansUnderJoin');
  if (under === null || !under.includes('rowSpansAt(') || !under.includes('sharesCellWithJoin(')) {
    out.push('spansUnderJoin does not judge each row through rowSpansAt and the one cell test, sharesCellWithJoin');
  }
  const rows = functionBodyOf(spansCode, 'rowSpansAt');
  if (rows === null || !rows.includes('pathSpansInRow(')) {
    out.push("rowSpansAt is not pathSpansInRow, so what it calls a row's link is not what the row draws today");
  }
  if (declarations.length !== 1 || declarations[0] !== SPANS) {
    out.push(`sharesCellWithJoin is declared ${String(declarations.length)} times (${declarations.join(', ') || 'nowhere'}) where it must be declared once, in ${SPANS}`);
  }
  return out;
}

{
  const LINKS = 'src/renderer/terminal/path-links.ts';
  const shippingLinks = source(LINKS);
  const shippingSpans = source(SPANS);

  // THE READ HALF, and the scanner proved on plants cut from the shipping text.
  for (const finding of joinWiringFindings(shippingLinks)) fail(`17. ${finding}`);
  if (/\bisWrapped\b/.test(code(SPANS))) {
    fail('17. src/shared/path-spans.ts reads isWrapped, which research 115 §4 measured present and wrong after a repaint');
  }
  const READ_PLANTS = [
    ['the width is the row’s own length', ['joinedPathAt(drawnRow, y, buffer.length - 1, this.term.cols)', 'joinedPathAt(drawnRow, y, buffer.length - 1, row.length)']],
    ['the buffer’s end is not handed over', ['joinedPathAt(drawnRow, y, buffer.length - 1,', 'joinedPathAt(drawnRow, y, Number.POSITIVE_INFINITY,']],
    ['the rows are read with their padding', ['drawn.translateToString(true)', 'drawn.translateToString(false)']],
    ['the rows carry no map', ['columns: cellColumns(drawn)', 'columns: []']],
    ['the join is handed a reader of its own', ['joinedPathAt(drawnRow,', 'joinedPathAt((i: number) => drawnRow(i),']],
    ['the join is not asked through doorFor', ['    if (join !== null) targets.push(join.target);\n', '']],
    ['the join gets a round trip of its own', ['    const answers = await Promise.all(', '    await Promise.all([]);\n    const answers = await Promise.all(']],
    ['the flag is read', ['    const row = line.translateToString(true);', '    const row = line.translateToString(true);\n    void line.isWrapped;']]
  ];
  let readCaught = 0;
  for (const [why, [from, to]] of READ_PLANTS) {
    if (shippingLinks.split(from).length !== 2) {
      fail(`17. the read plant "${why}" did not find its anchor exactly once in ${LINKS}`);
      continue;
    }
    if (joinWiringFindings(shippingLinks.replace(from, to)).length === 0) {
      fail(`17. the scanner read "${why}" as clean, and it must read it as a finding`);
    } else readCaught += 1;
  }

  // RULE 18's READ half, and its scanner proved on plants the same way.
  const srcFiles = walk(join(repoRoot, 'src'))
    .filter((f) => !/__tests__|\.test\./.test(f))
    .map((f) => ({ rel: relative(repoRoot, f), text: readFileSync(f, 'utf8') }));
  const declarations = cellTestDeclarations(srcFiles);
  for (const finding of governingWiringFindings(shippingLinks, shippingSpans, declarations)) fail(`18. ${finding}`);
  const GOVERNING_PLANTS = [
    ['spansUnderJoin is handed a reader of its own', 'links', ['spansUnderJoin(drawnRow, candidate, this.term.cols)', 'spansUnderJoin((i: number) => drawnRow(i), candidate, this.term.cols)']],
    ['spansUnderJoin is asked about the row’s length', 'links', ['spansUnderJoin(drawnRow, candidate, this.term.cols)', 'spansUnderJoin(drawnRow, candidate, row.length)']],
    ['provideLinks never asks spansUnderJoin', 'links', [': spansUnderJoin(drawnRow, candidate, this.term.cols);', ': [];']],
    ['an unreadable row keeps the join', 'links', ['const join = under === null ? null : candidate;', 'const join = candidate;']],
    ['the spans under the join are asked after the round trip', 'links', [
      '    for (const u of under) targets.push(u.target);\n    const answers = await Promise.all(\n      targets.map((target) => this.doorFor(target, base))\n    );',
      '    const answers = await Promise.all(\n      targets.map((target) => this.doorFor(target, base))\n    );\n    for (const u of under) targets.push(u.target);'
    ]],
    ['a missing answer counts as refused', 'links', ['answers[underAt + k]?.door !== null', 'answers[underAt + k]?.door != null']],
    ['one refused span is enough', 'links', ['const taken = under.some(', 'const taken = under.every(']],
    ['accepted does not ask taken', 'links', ['joinAnswer.door !== null && !taken', 'joinAnswer.door !== null']],
    ['spansUnderJoin derives a row its own way', 'spans', ['    for (const span of rowSpansAt(rows, r, width)) {', '    for (const span of pathSpansInRow(here.text, { width, columns: here.columns, above: null, aboveEnd: 0 })) {']],
    ['spansUnderJoin widens the cell test', 'spans', ['if (sharesCellWithJoin(range, r, join)) out.push(', 'if (range.start > 0) out.push(']],
    ['rowSpansAt is not pathSpansInRow', 'spans', ['  return pathSpansInRow(here.text, {\n    width,', '  return tokensInRow(here.text, {\n    width,']],
    ['a second sharesCellWithJoin', 'declarations', [null, null]]
  ];
  let governingCaught = 0;
  for (const [why, where, [from, to]] of GOVERNING_PLANTS) {
    let linksText = shippingLinks;
    let spansText = shippingSpans;
    let decls = declarations;
    if (where === 'declarations') {
      const planted = srcFiles.map((f) =>
        f.rel === LINKS ? { rel: f.rel, text: `${f.text}\nexport function sharesCellWithJoin(): boolean {\n  return false;\n}\n` } : f
      );
      decls = cellTestDeclarations(planted);
    } else {
      const text = where === 'links' ? linksText : spansText;
      if (text.split(from).length !== 2) {
        fail(`18. the read plant "${why}" did not find its anchor exactly once in ${where === 'links' ? LINKS : SPANS}`);
        continue;
      }
      if (where === 'links') linksText = text.replace(from, to);
      else spansText = text.replace(from, to);
    }
    if (governingWiringFindings(linksText, spansText, decls).length === 0) {
      fail(`18. the scanner read "${why}" as clean, and it must read it as a finding`);
    } else governingCaught += 1;
  }

  // THE DRIVEN HALVES, live and under every ablation of both rules, in one
  // tsx process.
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'p347-join-')));
  let all = null;
  try {
    const staged = stageProvider(shippingLinks, join(repoRoot, 'src', 'shared', 'path-doors.ts'));
    if (staged.loose.length > 0) {
      fail(`17. the provider gained a runtime import this rule cannot stage: ${staged.loose.join('; ')}`);
    }
    // One edit to one file, its anchor required exactly once.
    const stage = (name, edit) => {
      let spansText = shippingSpans;
      let linksText = staged.text;
      if (edit !== null) {
        if (edit.file === 'path-spans.ts') {
          if (spansText.split(edit.from).length !== 2) return false;
          spansText = spansText.replace(edit.from, edit.to);
        } else {
          if (linksText.split(edit.from).length !== 2) return false;
          linksText = linksText.replace(edit.from, edit.to);
        }
      }
      writeStage(join(scratch, name), { spans: spansText, links: linksText });
      return true;
    };
    const dirs = ['live'];
    stage('live', null);
    for (const [i, ablation] of J17_ABLATIONS.entries()) {
      if (stage(`a${String(i)}`, ablation)) dirs.push(`a${String(i)}`);
      else fail(`17. the ablation "${ablation.name}" did not find its anchor exactly once in ${ablation.file}`);
    }
    for (const [i, ablation] of G18_ABLATIONS.entries()) {
      if (stage(`g${String(i)}`, ablation)) dirs.push(`g${String(i)}`);
      else fail(`18. the ablation "${ablation.name}" did not find its anchor exactly once in ${ablation.file}`);
    }
    writeFileSync(
      join(scratch, 'fixtures.json'),
      JSON.stringify({
        dirs,
        joins: J17_JOINS.map(([key, rows, y, width]) => ({ key, rows, y, width })),
        boundaries: J17_BOUNDARIES.map(([key, above, below, width]) => ({ key, above, below, width })),
        providers: J17_PROVIDERS.map(([key, line, width, doors, local, click, , rows]) => ({
          key, rows: rows ?? J17_ROWS, line, width, doors, local, click, base: J17_BASE
        })),
        governing: G18_FIXTURES.map((f) => ({
          key: f.key, rows: f.rows, width: f.width, doors: f.doors, base: f.base, local: true,
          kinds: f.kinds ?? {}, clicks: f.clicks ?? {}, gone: f.gone ?? null
        }))
      })
    );
    writeFileSync(join(scratch, 'probe.mts'), JOIN_PROBE);
    const probe = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', 'tsconfig.node.json', join(scratch, 'probe.mts'), scratch],
      { encoding: 'utf8', cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 }
    );
    if (probe.status !== 0) {
      fail(`17. the join probe did not run: ${(probe.stderr || '').slice(-600) || '(no output)'}`);
    } else {
      try {
        all = JSON.parse(probe.stdout.trim().split('\n').pop() ?? '');
      } catch {
        fail(`17. the join probe printed no JSON: ${probe.stdout.slice(0, 400)}`);
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  let red = 0;
  let red18 = 0;
  let rows18 = 0;
  if (all !== null) {
    const live17 = all.live ?? { error: 'no live reading' };
    if (live17.error !== undefined) {
      fail(`17. the shipping join did not load: ${live17.error}`);
    } else {
      const want = [
        ...J17_JOINS.map(([key, , , , w]) => [key, w]),
        ...J17_BOUNDARIES.map(([key, , , , w]) => [key, w]),
        ...J17_PROVIDERS.map(([key, , , , , , w]) => [key, w])
      ];
      for (const [key, w] of want) {
        if (live17[key] !== w) fail(`17. ${key} read ${JSON.stringify(live17[key])} and must read ${JSON.stringify(w)}`);
      }
      // A refused join leaves the row exactly as today; an offered one does not.
      for (const [key] of J17_PROVIDERS) {
        const same = live17[key] === live17[`${key}:today`];
        const offered = J17_OFFERED.has(key);
        if (offered && same) fail(`17. ${key} reads the same as today although its join is offered, so the comparison cannot fail`);
        if (!offered && !same) {
          fail(`17. ${key} reads ${JSON.stringify(live17[key])} where today reads ${JSON.stringify(live17[`${key}:today`])}, and a refused join must change nothing`);
        }
      }
      if (live17['p-remote:asked'] !== '0') fail('17. a pane on another machine asked the door about something');
      if (live17['p-accepted-top:opened'] !== `${J17_FILE}:134`) {
        fail(`17. the click on a join opened ${JSON.stringify(live17['p-accepted-top:opened'])} rather than the whole path at its line`);
      }
      for (const [i, ablation] of J17_ABLATIONS.entries()) {
        const got = all[`a${String(i)}`];
        if (got === undefined) continue;
        if (got.error !== undefined) {
          fail(`17. the ablation "${ablation.name}" stopped the module loading instead of moving a reading, so it proves nothing: ${got.error}`);
          continue;
        }
        const unmoved = ablation.owns.filter((key) => got[key] === live17[key]);
        if (unmoved.length === 0) red += 1;
        else fail(`17. the ablation "${ablation.name}" left ${unmoved.join(', ')} as they read live, and it owns them, so that clause cannot fail there`);
      }

      // RULE 18, R18-F: every row of every fixture against today's links,
      // re-derived without the provider, or against its hand-derived join.
      if (live17['R18:error'] !== undefined) {
        fail(`18. the governing rule's readings did not run: ${live17['R18:error']}`);
      } else {
        for (const f of G18_FIXTURES) {
          let drawsToday = false;
          for (let line = 1; line <= f.rows.length; line += 1) {
            const k = `${f.key}@${String(line)}`;
            const today = live17[`${k}:today`];
            if (today !== 'none') drawsToday = true;
            const joined = f.expect === 'today' ? undefined : f.expect[line];
            const w = joined ?? today;
            rows18 += 1;
            if (live17[k] !== w) {
              fail(`18. ${k} read ${JSON.stringify(live17[k])} and must read ${JSON.stringify(w)}${joined === undefined ? ', today’s links' : ''}`);
            }
            if (joined !== undefined && joined === today) {
              fail(`18. ${k} pins the join and today reads the same, so the comparison cannot fail`);
            }
            const held = f.held?.[line];
            if (held !== undefined && today !== held) {
              fail(`18. ${k} draws ${JSON.stringify(today)} today where the fixture pins ${JSON.stringify(held)}, so it does not hold the link it was written to hold`);
            }
            const click = f.clicks?.[line];
            if (click !== undefined && live17[`${k}:opened`] !== click) {
              fail(`18. a press on ${k} opened ${JSON.stringify(live17[`${k}:opened`])} and must open ${JSON.stringify(click)}`);
            }
          }
          if (f.expect === 'today' && !drawsToday) fail(`18. ${f.key} draws no link today on any row, so it cannot show one held`);
        }
        // R18-E: rowSpansAt is the provider's own derivation of every row.
        if (live17['R18-E'] !== 'equal') fail(`18. R18-E: rowSpansAt is not the provider's derivation: ${String(live17['R18-E']).slice(0, 600)}`);
        for (const [i, ablation] of G18_ABLATIONS.entries()) {
          const got = all[`g${String(i)}`];
          if (got === undefined) continue;
          if (got.error !== undefined || got['R18:error'] !== undefined) {
            fail(`18. the ablation "${ablation.name}" stopped the module loading instead of moving a reading, so it proves nothing: ${got.error ?? got['R18:error']}`);
            continue;
          }
          const still = ablation.owns.filter((own) => {
            const keys = Object.keys(live17).filter((k) => k === own || (k.startsWith(`${own}@`) && !k.includes(':')));
            return keys.length === 0 || keys.every((k) => got[k] === live17[k]);
          });
          if (still.length === 0) red18 += 1;
          else fail(`18. the ablation "${ablation.name}" left ${still.join(', ')} as they read live, and it owns them, so that clause cannot fail there`);
        }
      }
    }
  }

  if (failures.every((f) => !f.includes(' 17. '))) {
    say(
      `17. ${String(J17_JOINS.length + J17_BOUNDARIES.length)} join readings and ${String(J17_PROVIDERS.length)} provider readings as pinned, no isWrapped read, a refused join equal to today's links, ${String(readCaught)} of ${String(READ_PLANTS.length)} wiring plants caught, and ${String(red)} of ${String(J17_ABLATIONS.length)} ablations red on every reading each owns`
    );
  }
  if (failures.every((f) => !f.includes(' 18. '))) {
    say(
      `18. a join never takes a cell from a row span the door accepts: ${String(G18_FIXTURES.length)} fixtures, ${String(rows18)} hovered rows each as today or as its hand-derived join, rowSpansAt equal to the provider's derivation on every row, ${String(governingCaught)} of ${String(GOVERNING_PLANTS.length)} wiring plants caught, and ${String(red18)} of ${String(G18_ABLATIONS.length)} ablations red on every reading each owns`
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
