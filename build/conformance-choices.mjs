#!/usr/bin/env node
/**
 * `npm run conformance:choices`. PHASE 312 — THE CHOICES THE AGENT DREW.
 *
 * About 1 s. It launches no Electron, starts no tmux server, spawns NOTHING —
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
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  .filter((rel) => /\bupdate\.question\s*=/.test(code(read(rel))));
// ONE ASSIGNMENT IN MAIN'S OWN FILE TOO, and the reason is the defect the two
// phases landing together produced: each phase wrote `update.question` from its own
// half on the same tick, the later line won by position, and only one half was
// tracked on the wire — so a screen question was sent and never cleared.
const monitorWrites = (code(monitor).match(/\bupdate\.question\s*=/g) ?? []).length;

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

if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  process.stderr.write(
    `${TAG} FAILED: ${String(problems.length)} of ${String(asked)} clauses.\n`
  );
  process.exit(1);
}
say(
  `PASS: all ${String(asked)} clauses hold over ` +
    `${relative(repoRoot, join(repoRoot, SCREEN))} and the six files beside it. ` +
    'The behaviour is driven in six vitest files; ' +
    '`npm run ablation:p312` is what proves every clause here can go red.'
);
process.exit(0);
