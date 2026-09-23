#!/usr/bin/env node
/**
 * `npm run conformance:choices`. PHASE 312 — THE CHOICES THE AGENT DREW.
 *
 * About 1.5 s. It launches no Electron, starts no tmux server, spawns NOTHING —
 * not even the pinned tsx — makes no request, spends no token and reads nothing
 * under the person's home. It reads this repository's own source and asserts
 * over it.
 *
 * ## What this gate is for, and what it is deliberately not
 *
 * Phase 312 widened `detectDialog` so the rows it matched are carried instead of
 * discarded. THE VERDICT ITSELF DID NOT MOVE, and that is the whole reason the
 * phase could claim Tier 3 for one question only: the detector's measured 57/57
 * recall and 0/386 false positives (`src/main/activity/screen.ts`) are the ONLY
 * screen-derived route to `needs_input`, and for every registry row with no hook
 * they are the only route at all. A later round that "tidies" `OPT1` and `OPT2`
 * into the collector's generalised `OPT_ANY` would leave the most important
 * status in the product resting on a clause nobody has ever measured.
 *
 * THE BEHAVIOUR IS DRIVEN ELSEWHERE, ON PURPOSE. The rows, the caps, the
 * redaction, the wrap rule and the floor against the parent commit's own
 * detector are driven over thirteen committed captures in
 * `src/main/activity/__tests__/p312-choices.test.ts`,
 * `p312-question.test.ts`, `src/renderer/__tests__/p312-choice.test.ts` and
 * `src/renderer/overview/__tests__/p312-choices-drawn.test.tsx`. This gate is
 * the STRUCTURAL half: the clauses that no amount of green tests can keep in
 * place, because a round can change a rule and its test in one edit. It spawns
 * nothing so it can run in the commit battery beside `gate:contract`.
 *
 * `npm run ablation:p312` is what proves every clause below can go RED, one
 * clause at a time, over the shipping source, restored by sha256 in a `finally`.
 * A gate whose rules have never been shown to fail is a gate that has quietly
 * stopped asking — CLAUDE.md records one that was red for 1,156 commits because
 * its table had no row for it.
 *
 * ## The clauses
 *
 * The first eight are the entry's own list. Clauses 12 to 16 are the fix round's,
 * and every one of them is a defect a verifier DROVE rather than a rule somebody
 * liked.
 *
 *   1  the verdict's own loop, pinned — `OPT1`, `OPT2`, `HINT`, `QUEST`
 *   2  `detectDialog` is `detectDialogRows(...).atChoice` and computes nothing
 *   3  the verdict has exactly one production call site
 *   4  the five measured literals and the 24-row window, byte for byte
 *   5  every carried string redacted BEFORE it is clipped
 *   6  the three caps and the ink bound: one definition, one call site, and not
 *      a second cap anywhere in the renderer (asked once per constant)
 *   7  no new member on `SessionStatus`
 *   8  the channel's fields optional, and the option's halves required
 *   9  ONE composer for the question, and main is where it is composed
 *  10  ONE draw site for the block, and all three Catch Me Up levels use it
 *  11  the block is an unordered list with no control in it
 *  12  `OPT_ANY` carries the `s` flag, so the collector cannot be silent where
 *      the verdict fired
 *  13  a row a person reads as numbered is never a continuation
 *  14  the option block ends at the first marker that does not increase
 *  15  the question walk gives up rather than reaching into the agent's prose
 *  16  a session never at a choice is told so zero times
 *  17  the composed question is READ, because a field nothing consumes rots
 *
 * ## Phase 321: the named shapes beside the verdict
 *
 * Since Phase 321 the numbered verdict is no longer the only screen-derived
 * route to `needs_input`. Screen-watched agents draw questions it cannot read
 * (build/p321/SPEC.md §1, research 129 §2.2), so two NAMED SHAPES — compiled
 * registry data, never configuration — are read beside it for qwen and for
 * Claude Code 2.1.280, the agents whose recordings drew them. The build read
 * six; its fix round removed cursor's two, opencode's and antigravity's, each
 * of which turned amber on a screen that is not a question (SPEC §12.9). It is still the only route for every
 * agent whose compiled row names no shape, and clauses 1 to 17 above stand
 * byte for byte. The seven clauses below hold the new route to the shape the
 * verdict has:
 *
 *  18  `DIALOG_SHAPES` holds exactly the ids of `DialogShapeId`, each defined
 *      once, typed so the compiler refuses an id with no shape
 *  19  `detectShapes` has ONE production call site, in `inferredVerdict`, over
 *      the verdict's own `screen` and the compiled `profile.dialogs` with an
 *      empty fallback; the table is read nowhere else and the verdict never
 *      calls it
 *  20  `choiceUpdate` names neither `detectShapes` nor `DIALOG_SHAPES`, so no
 *      shape's rows reach the choice channel
 *  21  the numbered verdict keeps its line: `screen !== null &&
 *      detectDialog(screen)`, once
 *  22  the closed set is the two shapes the corpus measured and the fix round
 *      kept
 *  23  a shape is asked ONLY while the session's agent holds the pane's
 *      terminal (the operator's ruling of 2026-09-23): the call sits behind
 *      `agentHoldsTerminal` in one `&&` chain, the gate reads the reading's
 *      `agent`, tmux's name and the table's `foregroundProgram`, and the
 *      reading is made in ONE place, the monitor, by the gate's own
 *      program-token rule (`commandRunsAgent` over `binaryCandidatesFor`), for
 *      a row that lists a shape
 *  24  the gate never asks Phase 141's witness rule (the operator's ruling of
 *      2026-09-23, "Tiny fix, then land"): no function the gate's path reaches
 *      in state-machine.ts, and not the monitor's `readForegrounds`, names
 *      `commandNamesAgent` or its `isScriptToken`, and the reading reaches
 *      `commandRunsAgent`
 *
 * They are read with the TypeScript parser, which is a module and not a
 * process, and EACH CARRIES ITS OWN ATTACK: the clause is asked again over
 * in-memory copies of the tree with its rule broken one way at a time, and
 * every copy must read red. `npm run ablation:p321` is the attack on the
 * phase's BEHAVIOUR beside it.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const TAG = '[conformance:choices]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const say = (l) => process.stdout.write(`${TAG} ${l}\n`);
const problems = [];
let asked = 0;

const SCREEN = 'src/main/activity/screen.ts';
const MONITOR = 'src/main/activity/monitor.ts';
const QUESTION = 'src/main/activity/question.ts';
const CONTRACT = 'src/shared/ipc/sessions.ts';
const TYPES = 'src/shared/types.ts';
const CHOICE = 'src/renderer/choice.ts';
const BLOCK = 'src/renderer/overview/ChoiceBlock.tsx';
/** The level that both hands the block its question and is itself a reader. */
const BLOCK_LEVELS_OWNER = 'src/renderer/overview/ProjectLines.tsx';
const LEVELS = [
  'src/renderer/overview/ProjectLines.tsx',
  'src/renderer/overview/SessionConversation.tsx',
  'src/renderer/overview/SessionColumns.tsx'
];

function read(rel) {
  try {
    return readFileSync(join(repoRoot, rel), 'utf8');
  } catch (err) {
    problems.push(`${rel} could not be read: ${String(err)}. Has it moved?`);
    return '';
  }
}

/**
 * The file with its COMMENTS BLANKED, character for character, so a rule about
 * what the CODE says is never satisfied — or broken — by prose about it.
 *
 * It is not decoration. Every one of these files explains its own rules at
 * length, so `CHOICE_OPTION_MAX_CHARS` is named twice in code and twice in
 * docblocks, and `ChoiceBlock.tsx`'s own comment says the block is "never an
 * `<ol>`" — which is exactly the string the no-`<ol>` clause looks for. Three
 * clauses of this gate read FALSE on the shipping tree before this view existed.
 * CLAUDE.md records the opposite failure, a gate green for 1,156 commits because
 * a needle matched a comment where a deleted row used to be.
 *
 * Only a comment that OPENS its line is blanked, beside every `/* … *\/` block.
 * A `//` after code is left alone, because these files hold regex literals whose
 * character classes can carry a slash and a naive scanner would eat one.
 * Newlines are kept so every pinned snippet keeps its line structure.
 */
function code(text) {
  let out = '';
  let i = 0;
  let inBlock = false;
  while (i < text.length) {
    const ch = text[i];
    if (inBlock) {
      if (ch === '*' && text[i + 1] === '/') {
        out += '  ';
        i += 2;
        inBlock = false;
        continue;
      }
      out += ch === '\n' ? '\n' : ' ';
      i += 1;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      out += '  ';
      i += 2;
      inBlock = true;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      const before = out.slice(out.lastIndexOf('\n') + 1);
      if (before.trim() === '') {
        while (i < text.length && text[i] !== '\n') {
          out += ' ';
          i += 1;
        }
        continue;
      }
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * One clause, asked. `ok` false is a finding, and the sentence is what a person
 * reading a red gate has to be able to act on, so it names the rule rather than
 * the predicate.
 */
function clause(n, name, ok, why) {
  asked += 1;
  if (ok) {
    say(`ok    ${String(n).padStart(2)}  ${name}`);
    return;
  }
  problems.push(`${String(n)} "${name}": ${why}`);
  say(`RED   ${String(n).padStart(2)}  ${name}`);
}

/** Every production TypeScript file, tests and fixtures excluded. */
function productionFiles(under) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(join(repoRoot, dir)).sort()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      const rel = `${dir}/${entry}`;
      const st = statSync(join(repoRoot, rel));
      if (st.isDirectory()) {
        walk(rel);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      if (/\.test\.tsx?$/.test(entry)) continue;
      out.push(rel);
    }
  };
  walk(under);
  return out;
}

const count = (text, needle) => text.split(needle).length - 1;

const screen = read(SCREEN);
const monitor = read(MONITOR);
const question = read(QUESTION);
const contract = read(CONTRACT);
const types = read(TYPES);
const block = read(BLOCK);
/** The same files with their comments blanked; see `code` above. */
const screenCode = code(screen);
const blockCode = code(block);

// ---------------------------------------------------------------------------
// 1 — the verdict's own loop, pinned
// ---------------------------------------------------------------------------

/**
 * THE FLOOR, AS TEXT. This is the clause the measurement was taken with, and it
 * is pinned verbatim rather than described: a description can be satisfied by a
 * loop that reads something else. The ablation's FIRST arm replaces `OPT1` and
 * `OPT2` here with the collector's `OPT_ANY`, which is the tidy-up the entry
 * names, and it must redden this clause.
 */
const VERDICT_LOOP = `  for (const row of rows) {
    if (!opt1 && OPT1.test(row)) opt1 = true;
    if (!opt2 && OPT2.test(row)) opt2 = true;
    if (!hint && (HINT.test(row) || QUEST.test(row))) hint = true;
  }
  if (!(opt1 && opt2 && hint)) {`;

clause(
  1,
  'the verdict is still `opt1 && opt2 && hint` over OPT1/OPT2/HINT/QUEST',
  screen.includes(VERDICT_LOOP),
  `${SCREEN} no longer holds the verdict's own loop byte for byte. That loop is ` +
    'the clause the detector\'s 57/57 recall and 0/386 false positives were ' +
    'measured with, and it is the only screen-derived route to needs_input for ' +
    'every agent with no hook. A widening of it is a measured change to the ' +
    'floor and belongs to a phase of its own, with the measurement re-run.'
);

// ---------------------------------------------------------------------------
// 2 — one spelling of the predicate
// ---------------------------------------------------------------------------

const DETECT_BODY = `export function detectDialog(capture: string): boolean {
  return detectDialogRows(capture).atChoice;
}`;

clause(
  2,
  '`detectDialog` is `detectDialogRows(...).atChoice` and computes nothing',
  screen.includes(DETECT_BODY),
  `${SCREEN}'s detectDialog no longer reads its answer off detectDialogRows. Two ` +
    'spellings of the predicate can disagree, and then the status a person sees ' +
    'and the rows a surface draws are answers to different questions.'
);

const callers = productionFiles('src/main')
  .filter((rel) => rel !== SCREEN)
  .filter((rel) => count(code(read(rel)), 'detectDialog(') > 0);

clause(
  3,
  '`detectDialog` has exactly one production call site',
  callers.length === 1 && callers[0] === 'src/main/activity/state-machine.ts',
  'the verdict is called from ' +
    (callers.length === 0 ? 'nowhere' : callers.join(', ')) +
    ', and the state machine is the one caller it is allowed to have. Another ' +
    'caller is another place the dialog question is asked, and this phase exists ' +
    'because the answer was being thrown away once already.'
);

// ---------------------------------------------------------------------------
// 4 — the five measured literals, byte for byte
// ---------------------------------------------------------------------------

/**
 * The five literals as they stood at `a31999fc`, the commit the measurement was
 * taken at, held here as text so this gate does not have to ask git anything.
 * Moving one of them is moving the floor.
 */
const MEASURED = [
  'const BORDER = /^[\\s│┃║▌▏|]+|[\\s│┃║▕|]+$/g;',
  'const OPT1 = /^[❯›●▶◆*>▸○◇⏵\\s]{0,4}1[.)]\\s+\\S/;',
  'const OPT2 = /^[❯›●▶◆*>▸○◇⏵\\s]{0,4}2[.)]\\s+\\S/;',
  '  /(enter to (confirm|select|continue)|press enter|esc to cancel|esc to quit|use enter to select|to cancel)/i;',
  'const QUEST = /(do you (want|trust)|would you like|how would you like)/i;',
  'const DIALOG_ROWS = 24;'
];

const missing = MEASURED.filter((l) => !screen.includes(l));
clause(
  4,
  'the five measured literals and the 24-row window, byte for byte',
  missing.length === 0,
  `${SCREEN} no longer holds ${String(missing.length)} of the measured literals: ` +
    `${missing.join(' | ')}. Each one is part of the clause the recall and the ` +
    'false-positive rate were measured with.'
);

// ---------------------------------------------------------------------------
// 5 — every carried string redacted BEFORE it is clipped
// ---------------------------------------------------------------------------

const REDACT_OPTION = 'clipRow(redactText(o.text), CHOICE_OPTION_MAX_CHARS)';
const REDACT_QUESTION =
  'return clipRow(redactText(found), CHOICE_QUESTION_MAX_CHARS);';

clause(
  5,
  'every carried string is redacted BEFORE it is clipped',
  screen.includes(REDACT_OPTION) &&
    screen.includes(REDACT_QUESTION) &&
    count(screenCode, 'redactText(') === 2,
  'the option text and the question must each pass redactText and then clipRow, ' +
    'in that order and nowhere else. Clipping first can cut a secret in half and ' +
    'leave the half that is still a secret; a third carried string with no ' +
    'redaction is a token on a channel batched at 1 Hz. These are the AGENT\'s ' +
    'words about the person\'s work and they are treated as the person\'s own data.'
);

// ---------------------------------------------------------------------------
// 6 — the caps: one definition, one call site, no second cap downstream
// ---------------------------------------------------------------------------

const CAPS = [
  ['CHOICE_MAX_OPTIONS', 20],
  ['CHOICE_OPTION_MAX_CHARS', 200],
  ['CHOICE_QUESTION_MAX_CHARS', 200],
  ['CHOICE_QUESTION_INK_ROWS', 4]
];

for (const [name, value] of CAPS) {
  const declared = new RegExp(`export const ${name} = (\\d+);`).exec(screenCode);
  const uses = count(screenCode, name);
  const elsewhere = productionFiles('src')
    .filter((rel) => rel !== SCREEN)
    .filter((rel) => new RegExp(`\\b${name}\\b`).test(code(read(rel))));
  clause(
    6,
    `${name} = ${String(value)}: one definition, one call site, nowhere else`,
    declared !== null &&
      Number(declared[1]) === value &&
      uses === 2 &&
      elsewhere.length === 0,
    `${name} must be declared once in ${SCREEN} with the value this phase ` +
      `measured and read exactly once. It is named ${String(uses)} times there ` +
      (elsewhere.length > 0
        ? `and also in ${elsewhere.join(', ')}. `
        : '. ') +
      'A second cap is a second place the truth about what a person sees lives, ' +
      'and the renderer must hold none of them at all.'
  );
}

// ---------------------------------------------------------------------------
// 7 — no new member on SessionStatus
// ---------------------------------------------------------------------------

const STATUSES = [
  'running',
  'idle',
  'needs_input',
  'exited',
  'restorable',
  'unknown',
  'discarded'
];
const list = /SESSION_STATUSES[^=]*=\s*\[([^\]]*)\]/s.exec(types);
const members =
  list === null
    ? []
    : [...list[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);

clause(
  7,
  'SessionStatus gains no member for a choice',
  members.length === STATUSES.length &&
    STATUSES.every((s, i) => members[i] === s),
  'SESSION_STATUSES is ' +
    (members.length === 0 ? 'unreadable' : `[${members.join(', ')}]`) +
    `, and it must still be [${STATUSES.join(', ')}]. Being at a numbered ` +
    'choice IS NOT A STATUS AND NEVER BECOMES ONE: it rides the activity ' +
    'channel beside the excerpt, the dot is not drawn from it, and the moment it ' +
    'becomes a status the measured verdict is answering a question it was never ' +
    'measured for.'
);

// ---------------------------------------------------------------------------
// 8 — the channel's fields optional, the option's halves required
// ---------------------------------------------------------------------------

clause(
  8,
  "the channel's choice and question are OPTIONAL, and an option's halves are not",
  contract.includes('  choice?: SessionChoiceInfo;') &&
    contract.includes('  question?: string;') &&
    contract.includes('  marker: string;') &&
    contract.includes('  text: string;'),
  `${CONTRACT} must declare choice and question as optional — absent means this ` +
    'update carries no news and the renderer keeps what it had, which is the same ' +
    "sentence Phase 141's handback carries — and an option's marker and text as " +
    'required strings, because half an option is a choice nobody drew.'
);

// ---------------------------------------------------------------------------
// 9 — ONE composer for the question
// ---------------------------------------------------------------------------

// BOTH ARGUMENTS ARE WIRED, and the literal is what pins that. Phase 312 shipped
// this call with a hard `null` first argument because Phase 311 was being built
// beside it, and this clause is what stops a later round leaving it there: a null
// hook argument makes the precedence a sentence in a backlog entry and the screen's
// reading the only answer any Claude session can get, hook or no hook.
const COMPOSED =
  'composeQuestion(e.st.question, e.st.screenQuestion)';
const otherComposers = productionFiles('src/main')
  .filter((rel) => rel !== QUESTION && rel !== MONITOR)
  // `(?!=)`: an ASSIGNMENT, never a comparison. Phase 316.1's activity map
// (src/main/sessions/activity-now.ts) READS `typeof update.question === 'string'`,
// and the bare `\s*=` matched the first `=` of that `===` and called a reader
// a second writer, which kept this clause red on main from 8c7f0b2f.
.filter((rel) => /\bupdate\.question\s*=(?!=)/.test(code(read(rel))));
// ONE ASSIGNMENT IN MAIN'S OWN FILE TOO, and the reason is the defect the two
// phases landing together produced: each phase wrote `update.question` from its own
// half on the same tick, the later line won by position, and only one half was
// tracked on the wire — so a screen question was sent and never cleared.
const monitorWrites = (code(monitor).match(/\bupdate\.question\s*=(?!=)/g) ?? []).length;

clause(
  9,
  'the question is composed by `composeQuestion`, once, and written once',
  code(monitor).includes(COMPOSED) &&
    code(question).includes('export function composeQuestion(') &&
    otherComposers.length === 0 &&
    monitorWrites === 1,
  'main must fill the question field through composeQuestion, which is where the ' +
    "precedence lives: for a Claude session the hook's own words and the screen's " +
    "reading can both exist and THE HOOK'S WINS. Written at the call site instead, " +
    'the precedence is a sentence in a backlog entry and nothing in the tree, and ' +
    'the moment a second surface composes its own answer the two draw sites ' +
    'disagree about what a person is being asked. Both arguments must be the two ' +
    `sources, and the field must be assigned exactly once (it is assigned ${String(monitorWrites)} times)` +
    (otherComposers.length > 0
      ? `. A second writer is in ${otherComposers.join(', ')}`
      : '') +
    '.'
);

// ---------------------------------------------------------------------------
// 10 — ONE draw site, and it is not pressable
// ---------------------------------------------------------------------------

const drawSites = productionFiles('src/renderer')
  .filter((rel) => rel !== CHOICE)
  .filter((rel) => /CHOICE_NOT_PRESSABLE|choiceOptionsFor/.test(code(read(rel))));

clause(
  10,
  'ONE component draws the block, and all three Catch Me Up levels use it',
  drawSites.length === 1 &&
    drawSites[0] === BLOCK &&
    LEVELS.every((rel) => read(rel).includes('<ChoiceBlock')),
  'the block must be drawn by ' +
    `${BLOCK} alone and rendered by all three levels. It is drawn by ` +
    `${drawSites.length === 0 ? 'nothing' : drawSites.join(', ')}. The level a ` +
    "person lands on is decided by where their keyboard is, so a level that draws " +
    'nothing is a blocked session saying nothing — and three copies of the block ' +
    'are three places to forget that it may never be pressable.'
);

clause(
  11,
  'the block is an unordered list with no control in it',
  blockCode.includes('<ul className="overview-line-options">') &&
    !/<ol\b/.test(blockCode) &&
    !/<button|<a\s|<input|role=|tabIndex|onClick/.test(blockCode),
  `${BLOCK} must draw a <ul> and hold no button, anchor, input, role, tabIndex or ` +
    'handler. An <ol> generates its numerals from position and the marker here is ' +
    "the AGENT's own, so an agent that draws 1, 2, 4 would tell a person to press " +
    '3. And answering a choice needs a delivery door that does not exist in the ' +
    'tree: the rows are DRAWN AND NEVER PRESSED until a phase with its own ruling ' +
    'builds one.'
);

// ---------------------------------------------------------------------------
// 12 to 15 — the four clauses the fix round added, each from a driven defect
// ---------------------------------------------------------------------------

clause(
  12,
  '`OPT_ANY` carries the `s` flag, so no option is lost where the verdict fired',
  /const OPT_ANY = \/.*\/s;/.test(screenCode),
  "the collector's regex ends `(\\S.*)$` and `.` matches no line terminator " +
    "without the `s` flag, while the verdict's OPT1 has no `.*` and no `$` at all. " +
    'Without the flag a row holding a stray CR or U+2028 made the verdict TRUE ' +
    'with that option MISSING from the list — a person shown one choice where the ' +
    'agent drew two, which is the one failure mode this pair exists to make ' +
    'unbuildable.'
);

clause(
  13,
  'a row a person reads as NUMBERED is never a continuation',
  screenCode.includes('!NUMBERED.test(row) &&') &&
    /const NUMBERED = \/\^\[[^\]]*\]\{0,4\}\\d\+\[\.\)\]\\s\//.test(screenCode),
  'the wrap rule must refuse a numbered row whatever its digit count. OPT_ANY ' +
    'refuses a third digit on purpose, so `100. Hundred` matched no option and was ' +
    'GLUED onto the option above it: a screen drawing 1. Alpha, 2. Beta, ' +
    '100. Hundred came back as two options, the second reading "Beta 100. Hundred", ' +
    'and a person acts on the option they were shown.'
);

clause(
  14,
  'the option block ends at the first marker that does not increase',
  screenCode.includes('      if (n <= last) break;') &&
    screenCode.includes('if (onlyIncreasingFrom(rows, at)) return at;'),
  'a menu counts up; a numbered code gutter, a diff or a half-repainted list ' +
    'repeats or drops. Without both halves of that rule a gutter drawn BELOW a ' +
    "real gate took the gate's options while the gate's own question stayed drawn " +
    'above them — the one shape found in this phase that made the rows WRONG ' +
    'rather than merely absent, and claude draws such a gutter under numbered ' +
    'options on a real screen.'
);

clause(
  15,
  'the question walk gives up rather than reaching into the agent’s prose',
  screenCode.includes('if (ink > CHOICE_QUESTION_INK_ROWS) break;'),
  'the search for the question walks UP from the first option and must stop. A ' +
    'dialog that asks no question of its own — the committed workspace-trust gate ' +
    'is one — has nothing to beat the prose above it, so one stray "do you want" ' +
    "anywhere in the window became that gate's question and a person read a " +
    "sentence from the agent's last answer as the thing they were being asked."
);

clause(
  16,
  'a session that was never at a choice is told so zero times',
  code(monitor).includes(
    'if (had === undefined && mark === NO_CHOICE_MARK) return null;'
  ),
  'the mark starts absent and absent is not NO_CHOICE_MARK, so without this ' +
    'guard the first needs_input tick of every ordinary session puts one ' +
    '{ atChoice: false } on the channel about a choice it never had — a message ' +
    'that did not exist before this phase, and the opposite of the answer ' +
    'noteChoiceGone gives the same question two methods below.'
);

// ---------------------------------------------------------------------------
// 17 — the question has READERS, because a field nothing consumes rots
// ---------------------------------------------------------------------------

const OVERLAY = 'src/renderer/app/AttentionOverlay.tsx';
const SUBS = 'src/renderer/state/subscriptions.ts';
const readers = productionFiles('src/renderer').filter((rel) =>
  /\bs\.questions\b|\bquestions\[/.test(code(read(rel)))
);

clause(
  17,
  'the composed question is read, and read through one door',
  count(code(read(SUBS)), 'readQuestion(') === 1 &&
    // ONE DOOR MEANS ONE DOOR. The store held a raw `u.question` read beside
    // `readQuestion` — Phase 311's half and Phase 312's — and a delete keyed on
    // the CHOICE clearing, so three lines decided one record and which won
    // depended on the order they sat in. A hook fires for tool calls that draw no
    // numbered choice at all, so the question's life is the WAIT's and not the
    // choice's, and main's own clear is the one clear.
    !code(read(SUBS)).includes('u.question') &&
    // THE TWO LITERALS ARE THE ROW AS PHASES 311 AND 312 LEFT IT TOGETHER. Each
    // phase drew this cell its own way and the reconciliation kept ONE: the row
    // takes the composed answer with `?? ''`, because 311's prop defaults to the
    // empty string and its `data-question` attribute reads that same '' to decide
    // whether the cell is drawn as a question or as an excerpt; and the cell
    // chooses between the two in `line`, which is the one place the choice is made.
    code(read(OVERLAY)).includes("question={questions[session.id] ?? ''}") &&
    code(read(OVERLAY)).includes('? excerpt : question') &&
    code(read(BLOCK_LEVELS_OWNER)).includes(
      'question={questions[session.sessionId]}'
    ) &&
    code(read(BLOCK)).includes('props.question'),
  'main composes the question, redacts it, caps it and puts it on the channel, ' +
    'and the first build of this phase drew it NOWHERE — mechanism 3 exists to ' +
    'pick it up for the fourteen agents Phase 311 does not reach and mechanism 7 ' +
    "says the ⌘J row draws it. A redacted, capped string crossing an IPC " +
    'boundary that nothing consumes is a field that rots before anyone reads it. ' +
    'It must be read once in the subscription and drawn by both the attention row ' +
    `and the choice block; it is read by ${readers.length === 0 ? 'nothing' : readers.join(', ')}.`
);

// ---------------------------------------------------------------------------
// 18 to 22 — PHASE 321, the named shapes beside the verdict
// ---------------------------------------------------------------------------
//
// Phase 321 (build/p321/SPEC.md §3 and §4) reads two named question shapes
// BESIDE the numbered verdict for the agents whose recordings drew them. The
// clauses above do not move by a byte; these five hold the new route to
// needs_input to the one shape the spec gives it, which is the same shape the
// verdict has: one table, one door, one call site, fed only by a compiled row.
//
// THEY READ THE CODE WITH THE TYPESCRIPT PARSER, not with the text needles the
// clauses above use, because what they ask is structural (which keys an object
// literal holds, which function a call sits in, what its second argument is)
// and a shape table is full of regular expression literals whose `{0,4}` and
// `\(` would derail a hand scanner. The parser is a module, not a process, so
// this gate still spawns nothing. Comments are trivia to the parser, so a rule
// is never satisfied, or broken, by prose about it.
//
// EVERY CLAUSE CARRIES ITS OWN ATTACK. Each is a function of the source text,
// asked once over the tree and then over in-memory copies with the rule broken
// one way at a time, and each of those copies MUST read red. A clause whose
// function is gutted, or whose call is deleted, turns this gate red on the
// spot rather than green for 1,156 commits.

const STATE = 'src/main/activity/state-machine.ts';
const SHAPE_TYPE = 'DialogShapeId';
const SHAPE_TABLE = 'DIALOG_SHAPES';
const SHAPE_DOOR = 'detectShapes';
/** Clause 23's names: the gate, the reading, and the monitor's one read. */
const GATE = 'agentHoldsTerminal';
const NOTE_FG = 'noteForeground';
const TO_READ_FG = 'foregroundToRead';
const READ_FGS = 'readForegrounds';
/** The gate's own rule, and Phase 141's witness rule with its private clause. */
const GATE_RULE = 'commandRunsAgent';
const WITNESS_RULE = ['commandNamesAgent', 'isScriptToken'];
const FOREGROUND_NAMES = [GATE, NOTE_FG, TO_READ_FG];
/**
 * The two ids build/p321/SPEC.md §3.2 measured that its fix round kept (§12.9),
 * and the only two. The other four were removed because each turned amber on a
 * screen that is not a question; putting one back is a measured change with a
 * phase of its own, and this list is where that shows.
 */
const MEASURED_SHAPES = ['claude-trust-gate', 'qwen-confirmation'];

const parse = (rel, text) =>
  ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

/** Every node under `node`, depth first, the node itself included. */
function nodesOf(node) {
  const out = [];
  const visit = (n) => {
    out.push(n);
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}

/** `x as const`, `x satisfies T`, `(x)` and `Object.freeze(x)`, peeled to `x`. */
function peel(expr) {
  let e = expr;
  for (;;) {
    if (e === undefined) return e;
    if (ts.isAsExpression(e) || ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression(e)) {
      e = e.expression;
      continue;
    }
    if (
      ts.isCallExpression(e) &&
      e.expression.getText() === 'Object.freeze' &&
      e.arguments.length === 1
    ) {
      e = e.arguments[0];
      continue;
    }
    return e;
  }
}

/** The name of the function, method or arrow a node sits in, or null. */
function enclosingFunction(node) {
  for (let p = node.parent; p !== undefined; p = p.parent) {
    if (ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p)) return p;
  }
  return null;
}

/** Identifier `name` used as a value: not a declaration's own name, not an import. */
function valueUses(sf, name) {
  return nodesOf(sf).filter((n) => {
    if (!ts.isIdentifier(n) || n.text !== name) return false;
    const p = n.parent;
    if (p === undefined) return false;
    if ((ts.isFunctionDeclaration(p) || ts.isVariableDeclaration(p) || ts.isTypeAliasDeclaration(p)) && p.name === n) {
      return false;
    }
    if (ts.isImportSpecifier(p) || ts.isExportSpecifier(p)) return false;
    return true;
  });
}

/** Calls whose callee is `name`, bare or as a property (`mod.name(`). */
function callsOf(sf, name) {
  return nodesOf(sf).filter(
    (n) =>
      ts.isCallExpression(n) &&
      ((ts.isIdentifier(n.expression) && n.expression.text === name) ||
        (ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === name))
  );
}

/**
 * The tree these clauses read: the three files by name, and every OTHER
 * production file under src/ that names one of the new identifiers at all.
 * The text filter is only a filter; each file it keeps is parsed.
 */
function shapeTree() {
  const others = productionFiles('src')
    .filter((rel) => rel !== SCREEN && rel !== STATE && rel !== MONITOR)
    .map((rel) => ({ rel, text: read(rel) }))
    .filter(
      (f) =>
        f.text.includes(SHAPE_TYPE) ||
        f.text.includes(SHAPE_TABLE) ||
        f.text.includes(SHAPE_DOOR) ||
        FOREGROUND_NAMES.some((name) => f.text.includes(name))
    );
  return { screen, state: read(STATE), monitor, others };
}

/** Every production file of a tree as `[rel, text]`, the three named ones first. */
const filesOf = (tree) => [
  [SCREEN, tree.screen],
  [STATE, tree.state],
  [MONITOR, tree.monitor],
  ...tree.others.map((f) => [f.rel, f.text])
];

/** The union and the table as screen.ts declares them, or why they cannot be read. */
function shapeDecls(screenText) {
  const sf = parse(SCREEN, screenText);
  const unions = nodesOf(sf).filter((n) => ts.isTypeAliasDeclaration(n) && n.name.text === SHAPE_TYPE);
  const tables = nodesOf(sf).filter(
    (n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === SHAPE_TABLE
  );
  return { sf, unions, tables };
}

/** The union's members, or null when any member is not a string literal. */
function unionIds(alias) {
  const members = ts.isUnionTypeNode(alias.type) ? alias.type.types : [alias.type];
  const ids = [];
  for (const m of members) {
    if (!ts.isLiteralTypeNode(m) || !ts.isStringLiteral(m.literal)) return null;
    ids.push(m.literal.text);
  }
  return ids;
}

/** The table's keys in source order, plus any entry that cannot be read as one key. */
function tableKeys(decl) {
  const obj = peel(decl.initializer);
  if (obj === undefined || !ts.isObjectLiteralExpression(obj)) return null;
  const keys = [];
  const unreadable = [];
  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop) && (ts.isStringLiteral(prop.name) || ts.isIdentifier(prop.name))) {
      keys.push({ key: prop.name.text, node: prop });
    } else if (ts.isShorthandPropertyAssignment(prop)) {
      keys.push({ key: prop.name.text, node: prop });
    } else {
      unreadable.push(prop.getText().slice(0, 40));
    }
  }
  return { obj, keys, unreadable };
}

/**
 * 18. `DIALOG_SHAPES` holds exactly the ids of `DialogShapeId`, each defined
 * once, and both are declared once, in screen.ts, and nowhere else.
 */
function tableFindings(tree) {
  const out = [];
  const { unions, tables } = shapeDecls(tree.screen);
  for (const [rel, text] of filesOf(tree).slice(1)) {
    const sf = parse(rel, text);
    if (nodesOf(sf).some((n) => ts.isTypeAliasDeclaration(n) && n.name.text === SHAPE_TYPE)) {
      out.push(`${rel} declares a second ${SHAPE_TYPE}`);
    }
    if (nodesOf(sf).some((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === SHAPE_TABLE)) {
      out.push(`${rel} declares a second ${SHAPE_TABLE}`);
    }
  }
  if (unions.length !== 1) {
    out.push(`${SCREEN} declares ${SHAPE_TYPE} ${String(unions.length)} times, not once`);
    return out;
  }
  if (tables.length !== 1) {
    out.push(`${SCREEN} declares ${SHAPE_TABLE} ${String(tables.length)} times, not once`);
    return out;
  }
  const ids = unionIds(unions[0]);
  if (ids === null || ids.length === 0) {
    out.push(`${SHAPE_TYPE} is not a union of string literals, so its ids cannot be read`);
    return out;
  }
  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupIds.length > 0) out.push(`${SHAPE_TYPE} names ${dupIds.join(', ')} twice`);
  const typeText = tables[0].type === undefined ? '' : tables[0].type.getText();
  if (!/\bRecord<\s*DialogShapeId\s*,/.test(typeText)) {
    out.push(
      `${SHAPE_TABLE} is typed ${JSON.stringify(typeText || 'nothing')}, not a Record keyed by ${SHAPE_TYPE}, ` +
        'so the compiler no longer refuses an id with no shape'
    );
  }
  const table = tableKeys(tables[0]);
  if (table === null) {
    out.push(`${SHAPE_TABLE}'s value is not an object literal, so its entries cannot be counted`);
    return out;
  }
  if (table.unreadable.length > 0) {
    out.push(`${SHAPE_TABLE} holds entries that are not one plain key each: ${table.unreadable.join(' | ')}`);
  }
  const keys = table.keys.map((k) => k.key);
  const dupKeys = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (dupKeys.length > 0) out.push(`${SHAPE_TABLE} defines ${[...new Set(dupKeys)].join(', ')} more than once`);
  const missing = ids.filter((id) => !keys.includes(id));
  const extra = keys.filter((k) => !ids.includes(k));
  if (missing.length > 0) out.push(`${SHAPE_TABLE} has no entry for ${missing.join(', ')}`);
  if (extra.length > 0) out.push(`${SHAPE_TABLE} holds ${extra.join(', ')}, which ${SHAPE_TYPE} does not name`);
  return out;
}

/** 22. The closed set is the two shapes the corpus measured and the fix round kept, and no third. */
function closedSetFindings(tree) {
  const { unions } = shapeDecls(tree.screen);
  const ids = unions.length === 1 ? unionIds(unions[0]) : null;
  if (ids === null) return [`${SHAPE_TYPE} cannot be read`];
  const have = [...new Set(ids)].sort();
  const missing = MEASURED_SHAPES.filter((id) => !have.includes(id));
  const extra = have.filter((id) => !MEASURED_SHAPES.includes(id));
  return [
    ...(missing.length > 0 ? [`the measured ${missing.join(', ')} is gone`] : []),
    ...(extra.length > 0 ? [`${extra.join(', ')} was never measured by Phase 321`] : [])
  ];
}

/**
 * 19. `detectShapes` has ONE production call site, in `inferredVerdict` in
 * state-machine.ts; it reads the verdict's own `screen` and the COMPILED
 * profile's `dialogs` with an empty fallback; the table is read nowhere but
 * screen.ts; and screen.ts never calls the door itself, so the numbered
 * verdict cannot come to depend on a shape.
 */
function doorFindings(tree) {
  const out = [];
  const screenSf = parse(SCREEN, tree.screen);
  const decls = nodesOf(screenSf).filter(
    (n) => ts.isFunctionDeclaration(n) && n.name !== undefined && n.name.text === SHAPE_DOOR
  );
  if (decls.length !== 1) out.push(`${SCREEN} declares ${SHAPE_DOOR} ${String(decls.length)} times, not once`);
  const sites = [];
  for (const [rel, text] of filesOf(tree)) {
    const sf = parse(rel, text);
    const calls = callsOf(sf, SHAPE_DOOR);
    for (const c of calls) sites.push({ rel, sf, call: c });
    // A value use that is not a call (the door handed on as a callback, or
    // aliased) is a second route that no count of calls would see.
    const loose = valueUses(sf, SHAPE_DOOR).filter((n) => !(ts.isCallExpression(n.parent) && n.parent.expression === n) &&
      !(ts.isPropertyAccessExpression(n.parent) && ts.isCallExpression(n.parent.parent) && n.parent.parent.expression === n.parent));
    for (const n of loose) out.push(`${rel} names ${SHAPE_DOOR} without calling it (${n.parent.getText().slice(0, 40)})`);
    if (rel !== SCREEN && valueUses(sf, SHAPE_TABLE).length > 0) {
      out.push(`${rel} reads ${SHAPE_TABLE}; the table is reached only through ${SHAPE_DOOR}`);
    }
  }
  const inScreen = sites.filter((s) => s.rel === SCREEN);
  if (inScreen.length > 0) {
    out.push(`${SCREEN} calls ${SHAPE_DOOR} itself (${String(inScreen.length)} time(s)), so a shape sits inside the verdict`);
  }
  const outside = sites.filter((s) => s.rel !== SCREEN);
  if (outside.length !== 1 || outside[0].rel !== STATE) {
    out.push(
      `${SHAPE_DOOR} is called from ${outside.length === 0 ? 'nowhere' : outside.map((s) => s.rel).join(', ')}; ` +
        `the one production call site is ${STATE}`
    );
    return out;
  }
  const { sf, call } = outside[0];
  const fn = enclosingFunction(call);
  if (fn === null || fn.name === undefined || fn.name.getText() !== 'inferredVerdict') {
    out.push(`the call sits in ${fn?.name?.getText() ?? 'no named function'}, not in inferredVerdict`);
  } else {
    const param = fn.parameters.find((p) => p.name.getText() === 'profile');
    if (param === undefined || param.type === undefined || param.type.getText() !== 'AgentActivityProfile') {
      out.push('inferredVerdict has no `profile: AgentActivityProfile` parameter, so the shapes do not come from a compiled row');
    }
  }
  if (call.arguments.length !== 2) {
    out.push(`the call passes ${String(call.arguments.length)} arguments, not the screen and the row's shapes`);
    return out;
  }
  const [first, second] = call.arguments;
  if (!ts.isIdentifier(first) || first.text !== 'screen') {
    out.push(`the call reads ${first.getText()}, not the verdict's own normalized \`screen\``);
  }
  const isRowShapes = (e) =>
    ts.isPropertyAccessExpression(e) && e.expression.getText() === 'profile' && e.name.text === 'dialogs';
  const isEmptyList = (e) => {
    const x = peel(e);
    if (x === undefined) return false;
    if (ts.isArrayLiteralExpression(x)) return x.elements.length === 0;
    if (!ts.isIdentifier(x)) return false;
    const decl = nodesOf(sf).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === x.text);
    const init = decl === undefined ? undefined : peel(decl.initializer);
    return init !== undefined && ts.isArrayLiteralExpression(init) && init.elements.length === 0;
  };
  const arg = peel(second);
  const ok =
    arg !== undefined &&
    (isRowShapes(arg) ||
      (ts.isBinaryExpression(arg) &&
        arg.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken &&
        isRowShapes(arg.left) &&
        isEmptyList(arg.right)));
  if (!ok) {
    out.push(
      `its second argument is ${JSON.stringify(second.getText())}, not \`profile.dialogs\` with an EMPTY fallback, ` +
        'so a shape could reach an agent whose compiled row names none'
    );
  }
  return out;
}

/** 20. The choice channel asks the numbered collector alone, and never a shape. */
function channelFindings(tree) {
  const sf = parse(MONITOR, tree.monitor);
  const methods = nodesOf(sf).filter((n) => ts.isMethodDeclaration(n) && n.name.getText() === 'choiceUpdate');
  if (methods.length !== 1 || methods[0].body === undefined) {
    return [`${MONITOR} holds ${String(methods.length)} choiceUpdate methods with a body, not one`];
  }
  const body = methods[0].body;
  const out = [];
  for (const name of [SHAPE_DOOR, SHAPE_TABLE]) {
    if (nodesOf(body).some((n) => ts.isIdentifier(n) && n.text === name)) out.push(`choiceUpdate names ${name}`);
  }
  if (nodesOf(body).some((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'dialogs')) {
    out.push('choiceUpdate reads a `dialogs` field');
  }
  if (callsOf(body, 'detectDialogRows').length !== 1) {
    out.push('choiceUpdate no longer asks detectDialogRows exactly once');
  }
  return out;
}

/** 21. The numbered verdict keeps its line: `detectDialog(screen)`, once, over the same `screen`. */
function verdictLineFindings(tree) {
  const sf = parse(STATE, tree.state);
  const calls = callsOf(sf, 'detectDialog');
  if (calls.length !== 1) return [`${STATE} calls detectDialog ${String(calls.length)} times, not once`];
  const call = calls[0];
  const out = [];
  if (call.arguments.length !== 1 || call.arguments[0].getText() !== 'screen') {
    out.push(`the verdict reads ${call.arguments.map((a) => a.getText()).join(', ') || 'nothing'}, not \`screen\``);
  }
  const and = call.parent;
  const ok =
    ts.isBinaryExpression(and) &&
    and.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
    and.right === call &&
    and.left.getText().replace(/\s+/g, ' ') === 'screen !== null' &&
    ts.isVariableDeclaration(and.parent) &&
    ts.isVariableDeclarationList(and.parent.parent) &&
    (and.parent.parent.flags & ts.NodeFlags.Const) !== 0;
  if (!ok) {
    out.push(`the verdict's line is ${JSON.stringify(call.parent?.parent?.getText() ?? call.getText())}, not \`const … = screen !== null && detectDialog(screen)\``);
  }
  const fn = enclosingFunction(call);
  if (fn === null || fn.name?.getText() !== 'inferredVerdict') out.push('the verdict is no longer computed in inferredVerdict');
  return out;
}

/** A function declaration by name in one parsed file, or every one of them. */
const functionsNamed = (sf, name) =>
  nodesOf(sf).filter((n) => ts.isFunctionDeclaration(n) && n.name !== undefined && n.name.text === name);

/**
 * The `&&` chain `node` sits at the right end of: its other operands, and the
 * node at the chain's top, so a caller can ask what the whole chain is the
 * value of.
 */
function andChainOf(node) {
  const operands = [];
  let cur = node;
  while (
    cur.parent !== undefined &&
    ts.isBinaryExpression(cur.parent) &&
    cur.parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
    cur.parent.right === cur
  ) {
    cur = cur.parent;
    operands.push(cur.left);
  }
  const flat = [];
  const spread = (e) => {
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      spread(e.left);
      spread(e.right);
    } else flat.push(e);
  };
  for (const o of operands) spread(o);
  return { operands: flat, top: cur };
}

/**
 * 23. A shape is asked ONLY while the session's agent holds the pane's
 * terminal (the operator's ruling of 2026-09-23). The one `detectShapes` call
 * is the last operand of an `&&` chain holding `agentHoldsTerminal(pane, st,
 * ctx.proc)`; the gate is declared once and reads the reading's `agent`,
 * tmux's `currentCommand` and the table's `foregroundProgram`; the reading is
 * made by `noteForeground` through `commandRunsAgent` over
 * `binaryCandidatesFor`, and it and `foregroundToRead` are called from the
 * monitor's `readForegrounds` alone, which the tick calls; and
 * `foregroundToRead` refuses a row whose `dialogs` is empty.
 */
function foregroundFindings(tree) {
  const out = [];
  const state = parse(STATE, tree.state);
  const door = callsOf(state, SHAPE_DOOR)[0];
  if (door === undefined) return [`${STATE} never calls ${SHAPE_DOOR}`];
  const chain = andChainOf(door);
  const guard = chain.operands.filter(
    (e) => ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === GATE
  );
  // The whole chain is the value of one const, so nothing ORs around it.
  const holder = chain.top.parent;
  if (holder === undefined || !ts.isVariableDeclaration(holder) || holder.initializer !== chain.top ||
    (holder.parent.flags & ts.NodeFlags.Const) === 0) {
    out.push(`the && chain holding the ${SHAPE_DOOR} call is not the whole value of a const (it sits in ${JSON.stringify((holder ?? chain.top).getText().slice(0, 60))}), so something can widen it`);
  }
  if (!chain.operands.some((e) => e.getText().replace(/\s+/g, ' ') === 'screen !== null')) {
    out.push(`the ${SHAPE_DOOR} call is not behind \`screen !== null\` in its own chain`);
  }
  if (guard.length !== 1) {
    out.push(`the ${SHAPE_DOOR} call is behind ${String(guard.length)} \`${GATE}(\` operands of its && chain, not one, so a shape is asked whatever holds the terminal`);
  } else if (guard[0].arguments.map((a) => a.getText()).join(', ') !== 'pane, st, ctx.proc') {
    out.push(`the gate is asked of (${guard[0].arguments.map((a) => a.getText()).join(', ')}), not (pane, st, ctx.proc)`);
  }
  const gates = functionsNamed(state, GATE);
  if (gates.length !== 1 || gates[0].body === undefined) {
    out.push(`${STATE} declares ${GATE} ${String(gates.length)} times with a body, not once`);
  } else {
    const body = gates[0].body;
    if (!nodesOf(body).some((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'agent')) {
      out.push(`${GATE} never reads the reading's \`agent\`, so a process that is not the agent passes`);
    }
    if (!nodesOf(body).some((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'currentCommand')) {
      out.push(`${GATE} never reads tmux's \`currentCommand\`, so a reading outlives the program it named on a tick with no table`);
    }
    if (callsOf(body, 'foregroundProgram').length === 0) {
      out.push(`${GATE} never asks the table who holds the terminal (\`foregroundProgram\`)`);
    }
  }
  const notes = functionsNamed(state, NOTE_FG);
  if (notes.length !== 1 || notes[0].body === undefined) {
    out.push(`${STATE} declares ${NOTE_FG} ${String(notes.length)} times with a body, not once`);
  } else {
    const body = notes[0].body;
    if (callsOf(body, GATE_RULE).length !== 1 || callsOf(body, 'binaryCandidatesFor').length !== 1) {
      out.push(`${NOTE_FG} does not decide \`agent\` by ${GATE_RULE} over binaryCandidatesFor, the gate's own program-token rule`);
    }
  }
  const toRead = functionsNamed(state, TO_READ_FG);
  if (toRead.length !== 1 || toRead[0].body === undefined) {
    out.push(`${STATE} declares ${TO_READ_FG} ${String(toRead.length)} times with a body, not once`);
  } else if (!nodesOf(toRead[0].body).some((n) => ts.isPropertyAccessExpression(n) && n.expression.getText() === 'profile' && n.name.text === 'dialogs')) {
    out.push(`${TO_READ_FG} never reads \`profile.dialogs\`, so a row that lists no shape is read for its foreground too`);
  }
  for (const name of [NOTE_FG, TO_READ_FG]) {
    const sites = [];
    for (const [rel, text] of filesOf(tree)) {
      for (const c of callsOf(parse(rel, text), name)) {
        const fn = enclosingFunction(c);
        sites.push(`${rel}:${fn?.name?.getText() ?? '?'}`);
      }
    }
    if (sites.length !== 1 || sites[0] !== `${MONITOR}:${READ_FGS}`) {
      out.push(`${name} is called from ${sites.length === 0 ? 'nowhere' : sites.join(', ')}; its one call site is ${MONITOR}'s ${READ_FGS}`);
    }
  }
  const monitorSf = parse(MONITOR, tree.monitor);
  const reads = nodesOf(monitorSf).filter(
    (n) =>
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
      n.expression.name.text === READ_FGS
  );
  if (reads.length !== 1 || enclosingFunction(reads[0])?.name?.getText() !== 'runTick') {
    out.push(`${MONITOR} calls this.${READ_FGS} ${String(reads.length)} times${reads.length === 1 ? ` in ${enclosingFunction(reads[0])?.name?.getText() ?? '?'}` : ''}, not once in runTick, so the reading is never made`);
  }
  return out;
}

/**
 * 24. The gate never asks Phase 141's witness rule (the operator's ruling of
 * 2026-09-23, "Tiny fix, then land"). `commandNamesAgent` examines every token
 * of a command line, so a program whose ARGUMENT names the agent passed it
 * (`tail -f /tmp/qwen-screen`, `watch … capture-pane -t claude`) and turned the
 * session amber. The gate has its own rule, `commandRunsAgent`, which counts a
 * PROGRAM token only, and Phase 141's rule is left as it was for the witness.
 * So: `commandRunsAgent` is declared once; every function the gate's path
 * reaches through this file's own declarations, from `noteForeground`,
 * `agentHoldsTerminal` and `foregroundToRead`, names neither
 * `commandNamesAgent` nor its private `isScriptToken`, as a call or as a
 * value; that path reaches `commandRunsAgent`; and the monitor's
 * `readForegrounds` names neither.
 */
function programTokenFindings(tree) {
  const out = [];
  const state = parse(STATE, tree.state);
  const declared = new Map();
  for (const n of state.statements) {
    if (ts.isFunctionDeclaration(n) && n.name !== undefined && n.body !== undefined) {
      declared.set(n.name.text, [...(declared.get(n.name.text) ?? []), n]);
    }
  }
  if ((declared.get(GATE_RULE) ?? []).length !== 1) {
    out.push(`${STATE} declares ${GATE_RULE} ${String((declared.get(GATE_RULE) ?? []).length)} times with a body, not once`);
  }
  const reached = new Set();
  const queue = [NOTE_FG, GATE, TO_READ_FG];
  while (queue.length > 0) {
    const name = queue.shift();
    if (reached.has(name) || !declared.has(name)) continue;
    reached.add(name);
    for (const fn of declared.get(name)) {
      for (const n of nodesOf(fn.body)) {
        if (ts.isIdentifier(n) && declared.has(n.text) && !reached.has(n.text)) queue.push(n.text);
      }
    }
  }
  if (!reached.has(GATE_RULE)) {
    out.push(`the gate's path (${[...reached].join(', ') || 'nothing'}) never reaches ${GATE_RULE}, the gate's own rule`);
  }
  for (const name of reached) {
    for (const fn of declared.get(name)) {
      for (const w of WITNESS_RULE) {
        const uses = nodesOf(fn.body).filter((n) => ts.isIdentifier(n) && n.text === w).length;
        if (uses > 0) out.push(`${name}, on the gate's path, names ${w} (Phase 141's witness rule) ${String(uses)} time${uses === 1 ? '' : 's'}`);
      }
    }
  }
  const readers = nodesOf(parse(MONITOR, tree.monitor)).filter(
    (n) => ts.isMethodDeclaration(n) && n.name.getText() === READ_FGS && n.body !== undefined
  );
  if (readers.length !== 1) {
    out.push(`${MONITOR} declares ${READ_FGS} ${String(readers.length)} times with a body, not once`);
  } else {
    for (const w of WITNESS_RULE) {
      if (nodesOf(readers[0].body).some((n) => ts.isIdentifier(n) && n.text === w)) {
        out.push(`${MONITOR}'s ${READ_FGS} names ${w}, so the witness rule can stand over the gate's reading`);
      }
    }
  }
  return out;
}

// ---- the attacks: one in-memory copy of the tree per way to break a rule ----

/** Replace the text of `node` in `text`. */
const spliceNode = (text, node, to) => text.slice(0, node.getStart()) + to + text.slice(node.getEnd());

/** A copy of the tree with one file's text changed, or null when the change could not be built. */
function withFile(tree, which, change) {
  const text = tree[which];
  const next = text === undefined ? null : change(text);
  return next === null || next === text ? null : { ...tree, [which]: next };
}
const withOther = (tree, rel, text) => ({ ...tree, others: [...tree.others, { rel, text }] });

const firstCall = (rel, text, name) => callsOf(parse(rel, text), name)[0] ?? null;
const tableOf = (text) => {
  const { tables } = shapeDecls(text);
  return tables.length === 1 ? tableKeys(tables[0]) : null;
};
const unionOf = (text) => shapeDecls(text).unions[0] ?? null;

const ATTACKS = {
  18: [
    ['a table missing its last entry', (t) => withFile(t, 'screen', (s) => {
      const tb = tableOf(s);
      if (tb === null || tb.keys.length < 2) return null;
      const last = tb.keys[tb.keys.length - 1].node;
      const prev = tb.keys[tb.keys.length - 2].node;
      return s.slice(0, prev.getEnd()) + s.slice(last.getEnd());
    })],
    ['a shape defined twice', (t) => withFile(t, 'screen', (s) => {
      const tb = tableOf(s);
      if (tb === null || tb.keys.length === 0) return null;
      const first = tb.keys[0].node;
      return s.slice(0, first.getEnd()) + `,\n  ${first.getText()}` + s.slice(first.getEnd());
    })],
    ['an id with no shape', (t) => withFile(t, 'screen', (s) => {
      const u = unionOf(s);
      return u === null ? null : spliceNode(s, u.type, `${u.type.getText()} | 'self-test-no-shape'`);
    })],
    ['the table typed loosely, so the compiler stops counting', (t) => withFile(t, 'screen', (s) => {
      const { tables } = shapeDecls(s);
      return tables.length !== 1 || tables[0].type === undefined ? null : spliceNode(s, tables[0].type, 'Record<string, DialogShape>');
    })],
    ['a second union in another file', (t) => withOther(t, 'src/main/activity/self-test.ts', `export type ${SHAPE_TYPE} = 'qwen-confirmation';\n`)]
  ],
  19: [
    ['a second call site, in the monitor', (t) => withFile(t, 'monitor', (s) => `${s}\nexport const selfTest = ${SHAPE_DOOR}('', []);\n`)],
    ['the verdict itself calling the door', (t) => withFile(t, 'screen', (s) => `${s}\nexport const selfTest = ${SHAPE_DOOR}('', []);\n`)],
    ['a shape named at the call site, for every agent', (t) => withFile(t, 'state', (s) => {
      const c = firstCall(STATE, s, SHAPE_DOOR);
      return c === null || c.arguments.length < 2 ? null : spliceNode(s, c.arguments[1], "['qwen-confirmation']");
    })],
    ['a fallback that lists a shape', (t) => withFile(t, 'state', (s) => {
      const c = firstCall(STATE, s, SHAPE_DOOR);
      if (c === null || c.arguments.length < 2) return null;
      return spliceNode(s, c.arguments[1], 'profile.dialogs ?? SELF_TEST_EVERY_SHAPE') +
        "\nconst SELF_TEST_EVERY_SHAPE = ['qwen-confirmation'];\n";
    })],
    ['the door reading the raw capture', (t) => withFile(t, 'state', (s) => {
      const c = firstCall(STATE, s, SHAPE_DOOR);
      return c === null || c.arguments.length < 1 ? null : spliceNode(s, c.arguments[0], "ctx.capture ?? ''");
    })],
    ['the table read outside screen.ts', (t) => withOther(t, 'src/main/activity/self-test.ts', `import { ${SHAPE_TABLE} } from './screen';\nexport const n = Object.keys(${SHAPE_TABLE}).length;\n`)],
    ['the door handed on as a callback', (t) => withOther(t, 'src/main/activity/self-test.ts', `import { ${SHAPE_DOOR} } from './screen';\nexport const door = ${SHAPE_DOOR};\n`)]
  ],
  20: [
    ['choiceUpdate asking a shape', (t) => withFile(t, 'monitor', (s) => {
      const m = nodesOf(parse(MONITOR, s)).find((n) => ts.isMethodDeclaration(n) && n.name.getText() === 'choiceUpdate');
      if (m === undefined || m.body === undefined) return null;
      const at = m.body.getStart() + 1;
      return `${s.slice(0, at)}\n    void ${SHAPE_DOOR};${s.slice(at)}`;
    })],
    ['choiceUpdate reading the table', (t) => withFile(t, 'monitor', (s) => {
      const m = nodesOf(parse(MONITOR, s)).find((n) => ts.isMethodDeclaration(n) && n.name.getText() === 'choiceUpdate');
      if (m === undefined || m.body === undefined) return null;
      const at = m.body.getStart() + 1;
      return `${s.slice(0, at)}\n    void ${SHAPE_TABLE};${s.slice(at)}`;
    })],
    ['choiceUpdate reading a row’s shapes', (t) => withFile(t, 'monitor', (s) => {
      const m = nodesOf(parse(MONITOR, s)).find((n) => ts.isMethodDeclaration(n) && n.name.getText() === 'choiceUpdate');
      if (m === undefined || m.body === undefined) return null;
      const at = m.body.getStart() + 1;
      return `${s.slice(0, at)}\n    void e.profile.dialogs;${s.slice(at)}`;
    })]
  ],
  21: [
    ['the verdict reading the raw capture', (t) => withFile(t, 'state', (s) => {
      const c = firstCall(STATE, s, 'detectDialog');
      return c === null ? null : spliceNode(s, c.arguments[0], "ctx.capture ?? ''");
    })],
    ['a second verdict call', (t) => withFile(t, 'state', (s) => `${s}\nexport const selfTest = detectDialog('');\n`)],
    ['the verdict folded into another expression', (t) => withFile(t, 'state', (s) => {
      const c = firstCall(STATE, s, 'detectDialog');
      return c === null || c.parent === undefined ? null : spliceNode(s, c.parent, 'screen !== null && (detectDialog(screen) || true)');
    })]
  ],
  22: [
    ['a third shape, defined and typed', (t) => withFile(t, 'screen', (s) => {
      const u = unionOf(s);
      const tb = tableOf(s);
      if (u === null || tb === null || tb.keys.length === 0) return null;
      const first = tb.keys[0].node;
      // The table entry first, then the union: the union sits above the table,
      // so editing it first would move the table's offsets.
      const withEntry = s.slice(0, first.getEnd()) +
        `,\n  'self-test-third': ${ts.isPropertyAssignment(first) ? first.initializer.getText() : first.name.getText()}` +
        s.slice(first.getEnd());
      const u2 = unionOf(withEntry);
      return spliceNode(withEntry, u2.type, `${u2.type.getText()} | 'self-test-third'`);
    })]
  ],
  23: [
    ['the gate taken off the shape call', (t) => withFile(t, 'state', (s) => {
      const c = firstCall(STATE, s, GATE);
      if (c === null || !ts.isBinaryExpression(c.parent)) return null;
      const and = c.parent;
      return s.slice(0, and.getStart()) + and.left.getText() + s.slice(and.getEnd());
    })],
    ['the gate ORed with the shapes instead of ANDed', (t) => withFile(t, 'state', (s) => {
      const c = firstCall(STATE, s, GATE);
      if (c === null || !ts.isBinaryExpression(c.parent)) return null;
      const op = c.parent.operatorToken;
      return s.slice(0, op.getStart()) + '||' + s.slice(op.getEnd());
    })],
    ['the gate no longer reading what the reading found', (t) => withFile(t, 'state', (s) => {
      const g = functionsNamed(parse(STATE, s), GATE)[0];
      return g === undefined || g.body === undefined ? null : spliceNode(s, g.body, '{\n  return st.foreground !== null && pane.currentCommand !== \'\' && foregroundProgram(proc as never, 0) !== -1;\n}');
    })],
    ['the reading deciding `agent` without the named-process rule', (t) => withFile(t, 'state', (s) => {
      const n = functionsNamed(parse(STATE, s), NOTE_FG)[0];
      return n === undefined || n.body === undefined ? null : spliceNode(s, n.body, '{\n  st.foreground = { pid, name: pane.currentCommand, agent: command !== null && agent !== \'\' };\n}');
    })],
    ['a second call site for the reading, outside the monitor', (t) => withOther(t, 'src/main/activity/self-test.ts', `import { ${NOTE_FG} } from './state-machine';\nexport function selfTest(): void { ${NOTE_FG}(null as never, null as never, 1, null, 'qwen'); }\n`)],
    ['the tick never making the reading', (t) => withFile(t, 'monitor', (s) => s.replace(`this.${READ_FGS}(wantCapture, proc)`, 'Promise.resolve()'))],
    ['a row with no shape read for its foreground', (t) => withFile(t, 'state', (s) => {
      const f = functionsNamed(parse(STATE, s), TO_READ_FG)[0];
      if (f === undefined || f.body === undefined) return null;
      const hit = nodesOf(f.body).find((n) => ts.isPropertyAccessExpression(n) && n.expression.getText() === 'profile' && n.name.text === 'dialogs');
      return hit === undefined ? null : spliceNode(s, hit, 'NO_SHAPES');
    })]
  ],
  24: [
    ['the reading deciding `agent` by Phase 141’s witness rule again (the reverify’s finding)', (t) => withFile(t, 'state', (s) => {
      const n = functionsNamed(parse(STATE, s), NOTE_FG)[0];
      const c = n === undefined || n.body === undefined ? undefined : callsOf(n.body, GATE_RULE)[0];
      return c === undefined ? null : spliceNode(s, c.expression, WITNESS_RULE[0]);
    })],
    ['the gate’s rule delegating to the witness rule', (t) => withFile(t, 'state', (s) => {
      const r = functionsNamed(parse(STATE, s), GATE_RULE)[0];
      if (r === undefined || r.body === undefined) return null;
      const at = r.body.getStart() + 1;
      return `${s.slice(0, at)}\n  if (commandNamesAgent(command, candidates)) return true;${s.slice(at)}`;
    })],
    ['a helper of the gate’s rule, declared in the file, asking the witness rule', (t) => withFile(t, 'state', (s) => {
      const r = functionsNamed(parse(STATE, s), GATE_RULE)[0];
      if (r === undefined || r.body === undefined) return null;
      const at = r.body.getStart() + 1;
      return `${s.slice(0, at)}\n  if (selfTestHelper(command)) return true;${s.slice(at)}` +
        "\nfunction selfTestHelper(c: string): boolean {\n  return commandNamesAgent(c, ['qwen']);\n}\n";
    })],
    ['the witness rule handed to the reading as a value', (t) => withFile(t, 'state', (s) => {
      const n = functionsNamed(parse(STATE, s), NOTE_FG)[0];
      if (n === undefined || n.body === undefined) return null;
      const at = n.body.getStart() + 1;
      return `${s.slice(0, at)}\n  const rule = commandNamesAgent;\n  void rule;${s.slice(at)}`;
    })],
    ['the witness rule’s “an extensionless path is a script” clause asked by the gate’s rule', (t) => withFile(t, 'state', (s) => {
      const r = functionsNamed(parse(STATE, s), GATE_RULE)[0];
      if (r === undefined || r.body === undefined) return null;
      const at = r.body.getStart() + 1;
      return `${s.slice(0, at)}\n  if (command.split(' ').some(isScriptToken)) return true;${s.slice(at)}`;
    })],
    ['the monitor’s read overriding the reading with the witness rule', (t) => withFile(t, 'monitor', (s) => {
      const m = nodesOf(parse(MONITOR, s)).find((n) => ts.isMethodDeclaration(n) && n.name.getText() === READ_FGS);
      if (m === undefined || m.body === undefined) return null;
      const at = m.body.getStart() + 1;
      return `${s.slice(0, at)}\n    void commandNamesAgent('', []);${s.slice(at)}`;
    })],
    ['the reading never reaching the gate’s rule', (t) => withFile(t, 'state', (s) => {
      const n = functionsNamed(parse(STATE, s), NOTE_FG)[0];
      const c = n === undefined || n.body === undefined ? undefined : callsOf(n.body, GATE_RULE)[0];
      return c === undefined ? null : spliceNode(s, c, "agent !== ''");
    })]
  ]
};

const PHASE_321 = [
  [18, '`DIALOG_SHAPES` holds exactly the ids of `DialogShapeId`, each defined once', tableFindings,
    'the table and the union must agree key for key, each shape defined once, both declared once in screen.ts and ' +
      'the table typed as a Record keyed by the union, so the compiler itself refuses an id with no shape. A second ' +
      'table, or an entry the union does not name, is a question shape nobody measured.'],
  [19, '`detectShapes` has one production call site, in state-machine.ts, and it names `profile.dialogs`', doorFindings,
    'the shapes are a SECOND screen-derived route to needs_input and they may have exactly one door: the verdict ' +
      'function, over the same normalized screen the numbered verdict reads, with the shapes the agent’s COMPILED ' +
      'row lists and an empty list for every other agent. Another caller, a shape named at the call site, or a ' +
      'fallback that lists one widens the route to agents whose screens were never measured (SPEC §3.3, §4.2).'],
  [20, '`choiceUpdate` names neither `detectShapes` nor `DIALOG_SHAPES`', channelFindings,
    'a shape raises needs_input with { atChoice: false } and puts no rows on the choice channel, because `marker` ' +
      'is digits only and Claude Code’s trust gate draws no digits at all, so a shape’s rows cannot be expressed ' +
      'on it without a contract change (SPEC §10). The channel keeps asking detectDialogRows alone.'],
  [21, 'the verdict line keeps `detectDialog(`: once, over `screen`', verdictLineFindings,
    'the numbered verdict must keep its one call and its input byte for byte — `screen !== null && ' +
      'detectDialog(screen)`, in inferredVerdict — so that every agent with no shape reads exactly as it did ' +
      'before Phase 321, and clause 3 still means one call site rather than one file.'],
  [22, 'the closed set is the two shapes Phase 321 measured and kept', closedSetFindings,
    `DialogShapeId must be exactly ${MEASURED_SHAPES.join(', ')}. A third shape is a measured change with a ` +
      'corpus of its own and a phase of its own, and a missing one is a question that stops turning amber.'],
  [23, 'a shape is asked only while the session’s agent holds the pane’s terminal', foregroundFindings,
    'a shape reads only the screen, and the screen does not say who drew it: a shell, a pager, `tail`, `cat` or ' +
      '`watch` in a qwen or Claude Code session printing that agent’s rows last turned it amber at the fix round’s ' +
      'HEAD (the operator’s ruling of 2026-09-23). The call must sit behind the gate, the gate must ask what the ' +
      'reading found, tmux’s name and the table, and the reading must be made once, in the monitor, by the gate’s ' +
      'own program-token rule, for a row that lists a shape.'],
  [24, 'the gate never asks Phase 141’s witness rule', programTokenFindings,
    'the witness rule examines every token, so a program whose ARGUMENT names the agent passed it (`tail -f ' +
      '/tmp/qwen-screen`, `less ~/logs/claude/screen`, `watch … capture-pane -t claude`) and turned the session ' +
      'amber with a push (the operator’s ruling of 2026-09-23, "Tiny fix, then land"). The gate asks its own rule, ' +
      '`commandRunsAgent`, which counts a PROGRAM token only; nothing on its path, and not the monitor’s read, may ' +
      'name `commandNamesAgent` or its `isScriptToken`, and Phase 141’s rule is left as it was for the witness.']
];

const tree = shapeTree();
const askedNew = new Map();
let attacksRed = 0;
for (const [n, name, findingsOf, why] of PHASE_321) {
  askedNew.set(n, (askedNew.get(n) ?? 0) + 1);
  const found = findingsOf(tree);
  clause(n, name, found.length === 0, `${why} Found: ${found.join('; ')}.`);
  for (const [attack, build] of ATTACKS[n] ?? []) {
    const broken = build(tree);
    if (broken === null) {
      problems.push(`${String(n)} self-test "${attack}" could not be built over this tree, so the clause was not shown to fail`);
      say(`RED   ${String(n)}! self-test "${attack}" could not be built`);
      continue;
    }
    if (findingsOf(broken).length === 0) {
      problems.push(`${String(n)} self-test "${attack}": the clause read GREEN over a copy with its rule broken, so it has stopped asking`);
      say(`RED   ${String(n)}! self-test "${attack}" stayed green`);
      continue;
    }
    attacksRed += 1;
  }
}
// A clause whose call is deleted asks nothing and reddens nothing, so its
// absence is itself the finding; and one with no attack has never been shown
// to fail.
for (const [n] of PHASE_321) {
  if (askedNew.get(n) !== 1) problems.push(`${String(n)} was asked ${String(askedNew.get(n) ?? 0)} times, not once`);
  if ((ATTACKS[n] ?? []).length === 0) problems.push(`${String(n)} carries no self-test, so it has never been shown to fail`);
}
if (PHASE_321.length !== 7 || new Set(PHASE_321.map(([n]) => n)).size !== 7) {
  problems.push('Phase 321 asks seven clauses, 18 to 24, and this gate no longer does');
}
say(`Phase 321: ${String(attacksRed)} self-tests, each a copy of the tree with one rule broken, read red as they must`);

// ---------------------------------------------------------------------------

if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  process.stderr.write(
    `${TAG} FAILED: ${String(problems.length)} of ${String(asked)} clauses.\n`
  );
  process.exit(1);
}
say(
  `PASS: all ${String(asked)} clauses hold over ` +
    `${relative(repoRoot, join(repoRoot, SCREEN))} and the files beside it. ` +
    'The behaviour is driven in the p312 and p321 vitest files; ' +
    '`npm run ablation:p312` is what proves clauses 1 to 17 can go red, and ' +
    `clauses 18 to 24 proved it of themselves above, ${String(attacksRed)} times.`
);
process.exit(0);
