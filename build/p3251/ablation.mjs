#!/usr/bin/env node
/**
 * `npm run ablation:p3251`. THE ATTACK ON PHASE 325.1'S OWN CLAUSES
 * (build/p3251/SPEC.md §4.7, D3251-13; the Phase 325.1 entry in
 * docs/BACKLOG.md, mechanism 5).
 *
 * Minutes. It launches no Electron, starts no tmux server, spawns no agent,
 * makes no request and spends no token. It starts nothing but `cp` and `node`
 * (running vitest, `conformance:ownwords` and `conformance:phonecopy` over a
 * clone), and it reads nothing under the person's home.
 *
 * ## Why it exists
 *
 * Phase 325.1 keeps CLAUDE.md's UI rule (needs input only from the session's
 * behaviour, never from his own input to it) with a record of what he typed
 * (src/main/activity/own-words.ts), its writers, and a rule beside the dialog
 * line in src/main/activity/state-machine.ts. Every clause of them has a row in
 * a vitest file, or a clause of a gate, that it exists for. A clause whose
 * removal turns nothing red is decoration. THIS SCRIPT PROVES THE OWNERSHIP: it
 * takes each clause out of the SHIPPING source one at a time and requires every
 * owner it names to go red, a vitest row BY NAME or a gate clause BY ID. Its
 * first arms are the four the brief names: a time window put back (A1, A2), the
 * record logged (A3), the record not cleared on submit (A4), and the match
 * loosened to a substring of one row (A5). ITS FIX ROUND added A22 to A37, the
 * verify lenses' attacks among their owners: the erasing keys (Ctrl-U, Ctrl-W,
 * Up and Down, Esc Esc), a real clock read through `process.uptime()` that no
 * virtual-clock row could see (A23), the agent's rows below his and the
 * numbered rows among them, the two-class exception that keeps his own words
 * his under an agent's footer, the prompt mark a hint of his must sit behind
 * (A36, A37), a line run on into a numbered row, the one budget for the whole
 * screen, a carriage return inside a message (A34), core's arrow handing his
 * chunk on (A35), the message's Enter and the phone's paste read as a program
 * that asked for no brackets takes it. HIS RULED ROUND (2026-11-14) added A38
 * to A51: the one block his counted rows must form and the input's start it
 * must begin at (pi's and opencode's edge, A41, among them), the replay's
 * exemption, two of a question's rows, the bound on the lines placed, the
 * budget counted by the step, and his first line always placed. HIS SECOND
 * RULED ROUND (2026-11-16) added A52 to A59: a blank line of his counted as
 * a blank row of his block only when his record holds exactly those blank
 * lines (nothing but whitespace on them, never a copied box's marks) between
 * the lines drawn above and below it, and only among the lines the rule
 * places; and the phone's paste recorded whole, between its markers,
 * when tmux's #{bracket_paste_flag}, read by the act's own list, says the
 * program asked, and as before when it did not or cannot say. A33 moved with
 * it: the paste bracketed whatever the program asked.
 * THE LANDING (2026-11-17) added A60, from the round's gate review and
 * reverify: the line ending above his blank rows and the line beginning below
 * them swapped, which only a line the input row wraps can tell apart.
 *
 * ## It never writes into the working tree
 *
 * Builders share one worktree, and a harness that writes into `src/` even for
 * the seconds a test takes can lose another's edit. So it builds a CLONE under
 * `P3251_SCRATCH` (REQUIRED, and refused under `/private/tmp` or `/tmp`, which
 * macOS cleans): `cp -Rc` (APFS clonefile) of `src/`, `build/fixtures/`, and the
 * phone's mock and copy that `conformance:phonecopy` reads (`docs/design/phone`,
 * `ios/Tortie`); `vitest.config.ts`, `package.json`, every tsconfig and the two
 * gates copied; `node_modules` symlinked. Each edited file is put back and
 * CHECKED BY SHA256 against the worktree's bytes before the next arm; the clone
 * is removed in a `finally` and on a signal; and the run ends by asserting that
 * the worktree's own bytes never moved.
 *
 * ## The rules each arm is held to
 *
 *   - Its needle matches the shipping source EXACTLY ONCE. Zero means the
 *     clause moved and this arm moves with it in the same commit; two means an
 *     edit could land on the wrong occurrence and prove nothing.
 *   - Every owner it names goes red. Other rows of the files it runs going red
 *     is printed, and is not a failure. Only the owners' rows are run, by name.
 *   - An UNEDITED CONTROL is green for every owner first, and again at the end:
 *     an owner red before the arm touched anything proves nothing.
 *
 * ## The arms the tree must hold
 *
 * A14 (S2 removed) and A15 (a fifth writer) are owned by `conformance:ownwords`
 * O1, which reads the integrator's seams in src/main/sessions/core.ts and
 * src/main/capabilities.ts: until those land, O1 is red in the control and the
 * arms are reported as waiting on the integrated tree, never as passing.
 *
 * Usage:
 *   P3251_SCRATCH=/private/var/tmp/… node build/p3251/ablation.mjs
 *   P3251_ONLY=A1,A4 P3251_SCRATCH=… node build/p3251/ablation.mjs   named arms only
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[ablation:p3251]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const MACHINE = 'src/main/activity/state-machine.ts';
const MONITOR = 'src/main/activity/monitor.ts';
const OWN = 'src/main/activity/own-words.ts';
const CORE = 'src/main/sessions/core.ts';
const KEYS = 'src/main/screen/keys.ts';
const PASTE = 'src/main/screen/paste.ts';
const RESTORE = 'src/main/restore/restore.ts';
const WRITER = 'src/main/reply/writer.ts';

const OWN_TEST = 'src/main/activity/__tests__/own-words.test.ts';
const P3251_TEST = 'src/main/activity/__tests__/p3251-own-words.test.ts';
const KEYS_TEST = 'src/main/screen/__tests__/keys.test.ts';
const PASTE_TEST = 'src/main/screen/__tests__/p348-paste.test.ts';
const REPLAY_TEST = 'src/main/restore/__tests__/p3251-replay-tail.test.ts';
const WRITER_TEST = 'src/main/reply/__tests__/writer.test.ts';
/** The fix round's row over the erasing keys, which several arms own. */
const ERASED =
  'a line erased with Ctrl-U, Ctrl-W, Ctrl-A and Ctrl-K, Up, Down or Esc Esc, then a real question with that line its lowest row: raised as the parent raises it';
/** The corpus boundary's row, which several arms own. */
const CORPUS = 'over every committed numbered question, no one line of his holds it, and only a question’s own lowest needed row ever could';
/** His ruled round's rows, which several arms own. */
const LAST_OPTION =
  'the fix round’s residual (Q1), a line of his word for word a question’s last option with nothing of it below, holds nothing since his ruled round: no input starts under the option above it';
const INPUT_START =
  'his block starts where his input starts: behind the agent’s prompt mark, or at the row’s start under the input’s edge (pi’s rule, the blank line above opencode’s box)';
const REPLAY_PAGE = 'a restore’s replayed screen is not asked for a block: its blank rows are the page the shell printed';
const REPLAY_MARK = 'a replay marks the record replayed until it is cleared (his ruled round); a fresh record and his own typing are not';
const BUDGET_STEPS =
  'the budget counts every step of every line together: long runs of one mark below his input leave his later lines unplaced, read as the parent reads them';
const COPY_AFTER_HIS_LINE = 'his ruled round: a copy of a real question in his unsent draft after a line of his own, then that question: raised';
const C3C = 'C3c the same, not sent: raised since his ruled round, the gate’s own blank row breaking his copy of its rows in two';
/** His second ruled round's rows (2026-11-16): his blank rows, and the phone's paste recorded whole. */
const BLANK_HIS = 'a blank line of his between his lines is a blank row of his block: typed, pasted and with Alt-Enter, behind a prompt mark and under the input’s edge';
const BLANK_NOT_HELD = 'a blank row his record does not hold still breaks the block: the agent’s own between his lines reads as the parent reads it';
const BLANK_COUNT =
  'one more or fewer blank rows than the blank lines he typed between two of his lines break the block, and so does a blank line before a line not drawn below it';
const BLANK_PLACED = 'only the lines the rule places hold his blank rows: the same words long before them, with a blank line between, hold none';
const BLANK_BOX =
  'a line of his holding only a box’s marks is no blank line of his: a copy of gemini’s boxed question, its box rows carried as lines, holds nothing';
const BLANK_SET_A = 'his words with a blank line between them over every committed idle window never read needs input';
const BLANK_WRAPPED = 'his blank line beside a line of his the input row wraps, above or below it, typed and pasted, is his';
const PASTE_WHOLE = 'a paste into a program that asked for bracketed paste is recorded whole, exactly as the same words pasted at the desk';
const PASTE_NOT_ASKED = 'a program that did not ask, and a tmux that cannot say (3.6a’s empty answer), keep the record of before: every line break a submit';
const PASTE_FLAG_READ = 'the flag is read by the act’s own list, just before the paste, and types nothing';

const GATE = 'build/conformance-ownwords.mjs';
const PHONECOPY = 'build/p311/copy-drift.mjs';

/** An owner: a vitest row, named by the tail of its full name, in one test file. */
const row = (file, title) => ({ kind: 'row', file, title });
/** An owner: a clause of conformance:ownwords, by id. */
const clause = (id) => ({ kind: 'clause', id });
/** An owner: conformance:phonecopy, red as a whole. */
const PHONECOPY_RED = { kind: 'phonecopy' };

const SET_A = row(P3251_TEST, 'his words over every committed idle window never read needs input');
const SET_B = row(P3251_TEST, 'every recorded question drawn 0.2, 0.5 and 1 s after his last key is raised as with no record');
const TRADE = row(P3251_TEST, 'the trade scene: a real numbered question 0.1 to 5 s after his last key, the pane silent or writing, raised in every cell');

const ARMS = [
  {
    n: 'A1',
    name: 'A TIME WINDOW PUT BACK: own also asks that the pane wrote within QUIET_MS',
    file: MACHINE,
    find: 'dialogIsHisWords(screen, st.ownWords);',
    to: 'dialogIsHisWords(screen, st.ownWords) && ctx.now - pane.activityAt <= QUIET_MS;',
    owners: [SET_A, clause('O3')]
  },
  {
    // The spec's words are "the pane wrote within QUIET_MS". The dialog arm is
    // reached only once the pane has been quiet for QUIET_MS, so that window
    // alone could never act; the window that can is the next QUIET_MS, which is
    // where Phase 325's burst read a question as his.
    n: 'A2',
    name: 'TIME INSTEAD OF CONTENT: own is the record holding a line and the pane quiet less than twice QUIET_MS',
    file: MACHINE,
    find: 'dialogIsHisWords(screen, st.ownWords);',
    to: 'st.ownWords.size > 0 && ctx.now - pane.activityAt <= 2 * QUIET_MS;',
    owners: [SET_B, TRADE, clause('O3')]
  },
  {
    n: 'A3',
    name: 'THE RECORD LOGGED: a log call naming it in noteOwnWords',
    file: MONITOR,
    find: '    noteOwnWordsOn(this.ensureState(sessionId).ownWords, data);',
    to: "    const { ownWords } = this.ensureState(sessionId);\n    getLog('activity').info('own', { ownWords });\n    noteOwnWordsOn(ownWords, data);",
    owners: [PHONECOPY_RED, clause('O4')]
  },
  {
    n: 'A3b',
    name: 'A LOG CALL IN own-words.ts, naming nothing',
    file: OWN,
    find: 'export function dialogIsHisWords(screen: string, words: OwnWords): boolean {\n',
    to: "export function dialogIsHisWords(screen: string, words: OwnWords): boolean {\n  console.log('rule');\n",
    owners: [PHONECOPY_RED, clause('O4')]
  },
  {
    n: 'A4',
    name: 'NOT CLEARED ON SUBMIT: a carriage return outside a paste no longer clears',
    file: OWN,
    find: '      // Enter: he sent it, so it is no longer a draft of his on the screen.\n      clear(words);\n',
    to: '      // Enter: he sent it, so it is no longer a draft of his on the screen.\n',
    owners: [
      row(OWN_TEST, 'a carriage return outside a paste clears: he sent it'),
      row(P3251_TEST, 'his words sent, then the agent draws the same rows: raised'),
      clause('O5')
    ]
  },
  {
    n: 'A5',
    name: 'LOOSENED TO A SUBSTRING OF ONE ROW: a row, past its mark, inside his line or his line inside it',
    file: OWN,
    find: '  const key = r * (line.length + 1) + pos;\n',
    to:
      '  const loose = rows[r];\n' +
      '  if (loose === undefined || loose.form.length === 0) return null;\n' +
      '  const past = loose.form.slice(loose.unit[loose.markMax] ?? 0);\n' +
      '  return past.includes(line) || line.includes(past) ? [[r, loose.at[loose.markMax] ?? loose.end]] : null;\n' +
      '  const key = r * (line.length + 1) + pos;\n',
    owners: [
      row(OWN_TEST, 'a line holding a question’s row inside it holds nothing'),
      row(OWN_TEST, 'a substring of a row holds nothing'),
      clause('O6')
    ]
  },
  {
    n: 'A6',
    name: 'THE COUNTERFACTUAL DROPPED: any tile makes the dialog his',
    file: OWN,
    find: '  return !detectDialogRows(counterfactual).atChoice;\n',
    to: '  return counterfactual.length >= 0 || !detectDialogRows(counterfactual).atChoice;\n',
    owners: [row(P3251_TEST, 'his words in the row, a real question drawn above them: raised')]
  },
  {
    n: 'A7',
    name: 'THE MARK LOOSENED: letters and digits allowed in a mark',
    file: OWN,
    find: "    if (LETTER_OR_DIGIT.test(form[k] ?? '')) return k;\n",
    to: '',
    owners: [row(OWN_TEST, 'the agent’s own words before his line are no mark')]
  },
  {
    n: 'A8',
    name: 'ASKED WHILE BLOCKED: the needs_input clause dropped from own',
    file: MACHINE,
    find: " && st.state !== 'needs_input' && screen !== null && dialogIsHisWords(",
    to: ' && screen !== null && dialogIsHisWords(',
    owners: [
      row(P3251_TEST, 'a question a hook raised over his words is never released by them'),
      row(P3251_TEST, 'the hook’s question over his words, through the shipping monitor: held to the end, never released by them')
    ]
  },
  {
    n: 'A9',
    name: 'A SHAPE WITHHELD: the !shaped clause dropped from own',
    file: MACHINE,
    find: 'const own = numbered && !shaped && ',
    to: 'const own = numbered && ',
    owners: [row(P3251_TEST, 'a screen both numbered and shaped, its rows his, is raised')]
  },
  {
    n: 'A10',
    name: 'THE CAP REMOVED',
    file: OWN,
    find: '  return words.size + 1 > OWN_WORDS_MAX;\n',
    to: '  return false;\n',
    owners: [
      row(OWN_TEST, 'one character past the cap clears the record first'),
      row(OWN_TEST, 'a paste longer than the cap keeps its tail'),
      clause('O5')
    ]
  },
  {
    n: 'A11',
    name: 'CTRL-C NO LONGER CLEARS',
    file: OWN,
    find: "      // Ctrl-C: every agent's input row clears on it.\n      clear(words);\n",
    to: "      // Ctrl-C: every agent's input row clears on it.\n",
    owners: [row(OWN_TEST, 'Ctrl-C clears'), row(P3251_TEST, 'C3b the same, cleared with Ctrl-C: raised')]
  },
  {
    n: 'A12',
    name: 'THE PASTE STATE RESET EACH CHUNK',
    file: OWN,
    find: '  const cps = codePointsOf(data);\n',
    to: '  words.inPaste = false;\n  const cps = codePointsOf(data);\n',
    owners: [
      row(OWN_TEST, 'a paste split over two chunks keeps its state'),
      row(P3251_TEST, 'C6b a paste of three lines split over two messages, its last no part of the question: never needs input')
    ]
  },
  {
    n: 'A13',
    name: 'THE BORDER STRIP ON RECORD LINES DROPPED',
    file: OWN,
    find: "  return stripBorder(line.join('')).text.replace(WHITESPACE, '');\n",
    to: "  return line.join('').replace(WHITESPACE, '');\n",
    owners: [row(P3251_TEST, 'a restore replaying gemini’s boxed trust gate reads no needs input')]
  },
  {
    n: 'A14',
    name: 'S2 REMOVED: the restore no longer hands the record what it replayed',
    file: CORE,
    find: 'this.activity.noteReplayedScreen(',
    to: 'void (',
    owners: [clause('O1')],
    integrated: true
  },
  {
    n: 'A15',
    name: 'A FIFTH WRITER: noteOwnWords called from another production file',
    file: WRITER,
    find: '      if (later.hooks === at.hooks && !rows.atChoice) core.activity.noteUserInput(id);\n',
    to: "      if (later.hooks === at.hooks && !rows.atChoice) core.activity.noteUserInput(id);\n      (core.activity as unknown as { noteOwnWords(a: string, b: string): void }).noteOwnWords(id, '');\n",
    owners: [clause('O1')],
    integrated: true
  },
  {
    n: 'A16',
    name: 'THE CURSOR KEYS IGNORED',
    file: OWN,
    find: 'function moveOrDelete(words: OwnWords, key: EditKey): void {\n',
    to: 'function moveOrDelete(words: OwnWords, key: EditKey): void {\n  if (words !== null) return;\n',
    owners: [
      row(OWN_TEST, 'the cursor keys in their CSI form move the cursor: Left, Right, Home, End, and Delete erases at it'),
      row(OWN_TEST, 'the cursor keys in their SS3 form (application mode) move it the same way'),
      row(P3251_TEST, 'C8c a mid-line fix with Left in each line, one line at a time: never needs input')
    ]
  },
  {
    n: 'A17',
    name: 'BACKSPACE NO LONGER ERASES',
    file: OWN,
    find: '      eraseBack(words);\n',
    to: '',
    owners: [
      row(OWN_TEST, 'Backspace and DEL erase the character before the cursor, and at a line’s start join the line above'),
      row(P3251_TEST, 'C7b a typo erased with Backspace in each line: never needs input')
    ]
  },
  {
    n: 'A18',
    name: 'ALT-ENTER NO LONGER A LINE BREAK',
    file: OWN,
    find: '      if (next === CR || next === LF) breakLine(words);\n',
    to: '',
    owners: [row(OWN_TEST, 'Alt-Enter (ESC then CR or LF) breaks the line at the cursor, never a submit')]
  },
  {
    n: 'A19',
    name: 'THE KEYS WRITER REMOVED',
    file: KEYS,
    find: '          deps.noteOwnWords?.(id, ownBytesOf(input.keys));\n',
    to: '',
    owners: [clause('O9'), row(KEYS_TEST, 'the record is handed what was typed')]
  },
  {
    n: 'A20',
    name: 'THE PASTE WRITER REMOVED',
    file: PASTE,
    find: "          deps.noteOwnWords?.(id, `${opens}${input.text.replace(LINE_FEED, '\\r')}${closes}`);\n",
    to: '',
    owners: [clause('O9'), row(PASTE_TEST, 'the record is handed the paste')]
  },
  {
    n: 'A21',
    name: 'THE REPLAY TAIL NOT SET',
    file: RESTORE,
    find: '      replayedTail = replayTailOf(snapshot);\n',
    to: '',
    owners: [row(REPLAY_TEST, 'a replay hands its last 24 rows'), clause('O8')]
  },
  // THE FIX ROUND (build/p3251/SPEC.md §As built): each of its clauses taken out
  // once, the verify lenses' attacks among the owners.
  {
    n: 'A22',
    name: 'CTRL-U NO LONGER FORGETS: a line erased with it stays his',
    file: OWN,
    find: '      // record keeps none of it.\n      clear(words);\n',
    to: '      // record keeps none of it.\n',
    owners: [
      row(OWN_TEST, 'Ctrl-U forgets the record, every line of it, wherever the cursor is'),
      row(P3251_TEST, ERASED),
      clause('O5')
    ]
  },
  {
    // The attack lens's X1b: a real clock, stamped the first time the rule
    // reads the record and read again after, which no virtual-clock row sees.
    n: 'A23',
    name: 'A REAL CLOCK PUT BACK through process.uptime(): the record his for two seconds of the process',
    file: OWN,
    find: '  if (lines.length === 0) return false;\n',
    to:
      '  if (lines.length === 0) return false;\n' +
      '  const seenAt = ((words as unknown as { seenAt?: number }).seenAt ??= process.uptime());\n' +
      '  if (process.uptime() - seenAt > 2) return false;\n',
    owners: [row(OWN_TEST, 'his words noted, then every clock moved on an hour: the rule answers exactly as it did'), clause('O3')]
  },
  {
    n: 'A24',
    name: "THE AGENT'S ROWS BELOW HIS IGNORED: a line equal to one of a question's rows holds it again",
    file: OWN,
    find: '    if (agentBottom > hisTop) return false;\n',
    to: '',
    // RQ1 is no owner here: its question sentence is a hint the prompt-mark
    // rule keeps the agent's too (A36), so neither arm alone reddens it.
    owners: [
      row(OWN_TEST, 'a line of his that is one of a real question’s rows, with its other rows below, holds nothing'),
      row(OWN_TEST, CORPUS),
      row(P3251_TEST, 'C1b his unsent line equal to the only OPT1 row of Claude’s numbered trust gate: raised, its other rows below it (the fix round)')
    ]
  },
  {
    n: 'A25',
    name: "A NUMBERED ROW BELOW HIS NOT THE AGENT'S: gemini's last counted option holds its gate",
    file: OWN,
    find: '    if (classes !== 0 || row.numbered) agentBottom = Math.max(agentBottom, n);\n',
    to: '    if (classes !== 0) agentBottom = Math.max(agentBottom, n);\n',
    // His ruled round: over the committed one-line corpus no copied row starts an
    // input whose only fault is a numbered row below it, so CORPUS is no owner.
    owners: [row(OWN_TEST, 'a line of his that is one of a real question’s rows, with its other rows below, holds nothing')]
  },
  {
    n: 'A26',
    name: "THE TWO-CLASS EXCEPTION DROPPED: his own words amber under an agent's footer",
    file: OWN,
    find: '  if (agentLacks < 2 || (hisLacks > 0 && hisLacks < 3)) {\n',
    to: '  if (agentLacks < 4 || (hisLacks > 0 && hisLacks < 3)) {\n',
    owners: [row(OWN_TEST, 'his own dialog-shaped words stay his whatever the agent draws below his input row (antigravity’s esc to cancel while it works)'), SET_A]
  },
  {
    n: 'A36',
    name: "A HINT OF HIS ASKED FOR NO PROMPT MARK: a question's own hint line, typed word for word, holds it",
    file: OWN,
    find: '    if ((hisClasses & (EVIDENCE_OPT1 | EVIDENCE_OPT2)) === 0 && !behindAMark) return false;\n',
    to: '',
    owners: [
      row(OWN_TEST, 'a question’s own hint line, at its bottom and led by no prompt, holds nothing though he typed it word for word'),
      row(OWN_TEST, CORPUS),
      row(P3251_TEST, 'C1c his unsent line equal to the gate’s own hint line, at its bottom and led by no prompt: raised (the fix round)')
    ]
  },
  {
    n: 'A37',
    name: 'EVERY ROW READ AS BEHIND A PROMPT MARK',
    file: OWN,
    find: '    const behindAMark = top !== undefined && (from[hisTop] ?? top.end) > (top.at[0] ?? top.end);\n',
    to: '    const behindAMark = top !== undefined;\n',
    owners: [
      row(OWN_TEST, 'a question’s own hint line, at its bottom and led by no prompt, holds nothing though he typed it word for word'),
      row(P3251_TEST, 'C1c his unsent line equal to the gate’s own hint line, at its bottom and led by no prompt: raised (the fix round)')
    ]
  },
  {
    n: 'A27',
    name: "A LINE RUNS ON INTO A NUMBERED ROW: a question's rows joined spell one line of his",
    file: OWN,
    find: '  if (row !== undefined && row.form.length > 0 && !(pos > 0 && row.numbered)) {\n',
    to: '  if (row !== undefined && row.form.length > 0) {\n',
    owners: [
      row(OWN_TEST, 'a line of his never runs on into a numbered row, so a question’s rows joined spell no line of his'),
      row(P3251_TEST, 'one unsent line spelling a question’s sentence and both its options joined, then that question: raised (the attack’s Q7)')
    ]
  },
  {
    n: 'A28',
    name: 'UP AND DOWN NO LONGER FORGET',
    file: OWN,
    find: "  if (final === 0x41 || final === 0x42) return 'forget';\n  if (params === '' || params === '1') {\n",
    to: "  if (params === '' || params === '1') {\n",
    owners: [
      row(OWN_TEST, 'Up and Down, in CSI and SS3 form and with a modifier, Ctrl-P, Ctrl-N, Ctrl-R, Ctrl-G, Ctrl-Z and Ctrl-\\ forget the record'),
      row(P3251_TEST, ERASED)
    ]
  },
  {
    n: 'A29',
    name: 'ESC ESC NO LONGER FORGETS',
    file: OWN,
    find: '        else if (next === ESC || (next === undefined && escBefore)) clear(words);\n',
    to: '',
    owners: [row(OWN_TEST, 'Escape twice forgets, in one message or in two; once, or with any key between, forgets nothing'), row(P3251_TEST, ERASED)]
  },
  {
    n: 'A30',
    name: 'CTRL-W NO LONGER ERASES A WORD',
    file: OWN,
    find: '      // Ctrl-W: a word back.\n      eraseWordBack(words);\n',
    to: '      // Ctrl-W: a word back.\n',
    owners: [row(OWN_TEST, 'Ctrl-W and Alt-Backspace erase a word back, its whitespace first, and at a line’s start the break above'), row(P3251_TEST, ERASED)]
  },
  {
    // The attack lens's cost finding: a budget for each line, which hundreds of
    // contrived lines spend hundreds of times over.
    n: 'A31',
    name: 'ONE BUDGET A LINE AGAIN',
    file: OWN,
    find: '    const search: Search = { memo: new Map(), budget };\n',
    to: '    const search: Search = { memo: new Map(), budget: { left: TILE_BUDGET } };\n',
    // His ruled round: the lines placed are bounded by the screen's rows, so the
    // cost row no longer tells one budget from one a line; the row where his
    // later lines are left unplaced once the first spent the screen's budget does.
    owners: [row(OWN_TEST, BUDGET_STEPS)]
  },
  {
    n: 'A32',
    name: "THE MESSAGE'S ENTER NOT HANDED: a line the phone's message sent stays his",
    file: WRITER,
    find: "        core.activity.noteOwnWords?.(id, '\\r');\n",
    to: '',
    owners: [clause('O1'), row(WRITER_TEST, 'a message that landed hands the record its closing Enter alone, never his words, after the paste')]
  },
  {
    // The attack lens's X3: every carriage return in the rows had arrived alone.
    n: 'A34',
    name: 'A CARRIAGE RETURN CLEARS ONLY ALONE IN ITS MESSAGE',
    file: OWN,
    find: '      // Enter: he sent it, so it is no longer a draft of his on the screen.\n      clear(words);\n',
    to: '      // Enter: he sent it, so it is no longer a draft of his on the screen.\n      if (cps.length === 1) clear(words);\n',
    owners: [
      row(OWN_TEST, 'a carriage return in the same message as his text is a submit too'),
      row(OWN_TEST, 'the phone’s keys as ownBytesOf spells them: text and Enter in one write submit, Ctrl-U and Up forget')
    ]
  },
  {
    // The attack lens's X2: his chunk handed on from core's arrow to a third place.
    n: 'A35',
    name: "THE DESK'S CHUNK HANDED ON AS WELL from core's onInput arrow",
    file: CORE,
    find: '        this.activity.noteOwnWords(sessionId, data);\n',
    to: "        this.activity.noteOwnWords(sessionId, data);\n        broadcast('activity:typed', data);\n",
    owners: [clause('O1')],
    integrated: true
  },
  {
    n: 'A33',
    name: "THE PHONE'S PASTE READ AS BRACKETED WHATEVER THE PROGRAM ASKED: a line it sent to a program that did not ask stays his",
    file: PASTE,
    find: "        const [opens, closes] = bracketed ? [PASTE_OPENS, PASTE_CLOSES] : ['', ''];\n",
    to: "        const [opens, closes] = [PASTE_OPENS, PASTE_CLOSES];\n",
    owners: [
      row(PASTE_TEST, 'a line the paste sent is never kept as his: what is handed leaves the record only its unsent tail'),
      row(PASTE_TEST, PASTE_NOT_ASKED)
    ]
  },
  // HIS RULED ROUND (2026-11-14, "325.1 a"; build/p3251/SPEC.md §As built):
  // his lines count as his only when they form one block that starts at the
  // input's prompt mark. Each clause of it taken out once, the reverify's
  // copies of a question among its owners.
  {
    n: 'A38',
    name: 'THE BLOCK DROPPED: his rows need not form one block that starts where his input starts',
    file: OWN,
    find: '  if (!words.replayed && hisBottom >= 0 && !oneBlockFromHisStart(inBlock, starts, hisTop, hisBottom)) return false;\n',
    to: '',
    owners: [
      row(OWN_TEST, 'a copy of a question in his draft after a line of his own holds nothing: his first line is on none of its rows'),
      row(OWN_TEST, 'his rows that make the question are one block: a copy the question’s own blank row breaks holds nothing, the same lines in his input row are his'),
      row(P3251_TEST, COPY_AFTER_HIS_LINE),
      row(P3251_TEST, C3C)
    ]
  },
  {
    n: 'A39',
    name: 'ONE BLOCK FROM ANY ROW: the run need not begin where his first line starts an input',
    file: OWN,
    find: '  return starts.has(start);\n',
    to: '  return start >= 0;\n',
    owners: [
      row(OWN_TEST, LAST_OPTION),
      row(OWN_TEST, INPUT_START),
      row(OWN_TEST, 'his first line not drawn whole starts no block: behind a prompt that holds letters (a shell’s), his dialog-shaped words read as the parent reads them'),
      row(P3251_TEST, 'the fix round’s residual (Q1), his unsent line word for word a question’s last option with nothing of it below: raised since his ruled round')
    ]
  },
  {
    n: 'A40',
    name: "EVERY ROW AN INPUT'S START: a copied option or hint row starts his block",
    file: OWN,
    find: '  if (at > (row.at[0] ?? row.end)) return true;\n',
    to: '  if (at >= 0) return true;\n',
    owners: [row(OWN_TEST, LAST_OPTION), row(OWN_TEST, INPUT_START)]
  },
  {
    n: 'A51',
    name: "NO PROMPT MARK STARTS AN INPUT: only the input's edge above it does",
    file: OWN,
    find: '  if (at > (row.at[0] ?? row.end)) return true;\n',
    to: '',
    owners: [row(OWN_TEST, INPUT_START)]
  },
  {
    n: 'A41',
    name: "THE LITERAL MARK: only a visible prompt mark starts an input, so pi's and opencode's own words read as the agent's question again",
    file: OWN,
    find: "  return !LETTER_OR_DIGIT.test(rows[r - 1]?.form ?? '');\n",
    to: '  return false;\n',
    owners: [SET_A, row(OWN_TEST, INPUT_START), row(OWN_TEST, 'every agent’s input row: his lines behind its mark, read off its committed windows, are his')]
  },
  {
    n: 'A42',
    name: "THE REPLAY ASKED FOR A BLOCK: a restore's printed page breaks it, and the old screen's question is read as the agent asking",
    file: OWN,
    find: '  if (!words.replayed && hisBottom >= 0 && ',
    to: '  if (hisBottom >= 0 && ',
    owners: [
      row(OWN_TEST, REPLAY_PAGE),
      row(P3251_TEST, 'a restore replaying gemini’s boxed trust gate reads no needs input')
    ]
  },
  {
    n: 'A43',
    name: 'THE REPLAY NEVER MARKED',
    file: OWN,
    find: '  breakLine(words);\n  words.replayed = true;\n',
    to: '  breakLine(words);\n',
    owners: [row(OWN_TEST, REPLAY_MARK), row(OWN_TEST, REPLAY_PAGE), row(P3251_TEST, 'a restore replaying gemini’s boxed trust gate reads no needs input')]
  },
  {
    n: 'A44',
    name: "THE REPLAY'S MARK KEPT PAST A CLEAR: his typing after his Enter is never asked for a block",
    file: OWN,
    find: '  words.size = 0;\n  words.replayed = false;\n',
    to: '  words.size = 0;\n',
    owners: [row(OWN_TEST, REPLAY_MARK)]
  },
  {
    n: 'A45',
    name: "TWO OF A QUESTION'S ROWS HIS AGAIN: the agent's rows below asked only when the agent gives two of the three",
    file: OWN,
    find: '  if (agentLacks < 2 || (hisLacks > 0 && hisLacks < 3)) {\n',
    to: '  if (agentLacks < 2) {\n',
    owners: [
      row(OWN_TEST, 'two of a question’s rows typed word for word hold nothing: the agent’s hint, or its next option, lies below them'),
      row(P3251_TEST, 'his ruled round: two rows of a real question typed into his unsent draft, then that question: raised')
    ]
  },
  {
    n: 'A46',
    name: 'EVERY LINE OF HIS PLACED: no bound by the screen’s rows',
    file: OWN,
    find: '  for (let n = words.lines.length - 1; n >= Math.max(0, words.lines.length - room); n -= 1) {\n',
    to: '  for (let n = words.lines.length - 1; n >= 0; n -= 1) {\n',
    owners: [row(OWN_TEST, 'a line more than a screen’s rows before his newest is not placed: it reads as the parent reads it')]
  },
  {
    n: 'A47',
    name: 'THE BUDGET CHARGED ONLY FOR COMPARISONS: a step skipped for its length is free again',
    file: OWN,
    find:
      '      search.budget.left -= 1;\n      const rest = row.form.slice(row.unit[k] ?? row.form.length);\n      if (rest.length === 0 || rest.length > line.length - pos) continue;\n',
    to:
      '      const rest = row.form.slice(row.unit[k] ?? row.form.length);\n      if (rest.length === 0 || rest.length > line.length - pos) continue;\n      search.budget.left -= 1;\n',
    owners: [row(OWN_TEST, BUDGET_STEPS)]
  },
  {
    n: 'A48',
    name: 'HIS FIRST LINE PLACED ONLY WHEN IT IS AMONG HIS NEWEST',
    file: OWN,
    find: '  const lines: string[] = first === null ? [] : [first];\n',
    to: '  const lines: string[] = [];\n',
    owners: [row(OWN_TEST, 'his first line is placed whatever its age, since the block starts there')]
  },
  {
    n: 'A49',
    name: 'ANY START, NO RUN: his counted rows need not be one run of his',
    file: OWN,
    find: '  for (let n = top; n <= bottom; n += 1) if (his[n] !== true) return false;\n',
    to: '',
    owners: [
      row(OWN_TEST, 'his rows that make the question are one block: a copy the question’s own blank row breaks holds nothing, the same lines in his input row are his'),
      row(P3251_TEST, C3C)
    ]
  },
  {
    n: 'A50',
    name: "THE AGENT'S ROWS ASKED WHEN HIS GIVE NOTHING: a screen that is no question reads as his words nowhere",
    file: OWN,
    find: '  if (agentLacks < 2 || (hisLacks > 0 && hisLacks < 3)) {\n',
    to: '  if (agentLacks < 2 || hisLacks > 0) {\n',
    owners: [
      row(OWN_TEST, 'boxes: his line inside a box drawn with │ ┃ ║ | is his, the box stripped as the verdict strips it'),
      row(OWN_TEST, 'a line that wraps, at a word or mid-word, is his across the rows it takes')
    ]
  },
  // HIS SECOND RULED ROUND (2026-11-16, "325.1 a"; build/p3251/SPEC.md §As
  // built): a blank line of his is a blank row of his block when his record
  // holds it, and the phone's paste is recorded whole when the program asked
  // for bracketed paste. Each clause taken out once.
  {
    n: 'A52',
    name: 'HIS BLANK ROWS NOT COUNTED: a blank line of his breaks his block, and his own words with one read as a question again',
    file: OWN,
    find: '  const inBlock = words.replayed || hisBottom < 0 ? his : withHisBlankRows(rows, his, endsOn, beginsOn, words);\n',
    to: '  const inBlock = his;\n',
    owners: [
      row(OWN_TEST, BLANK_HIS),
      row(OWN_TEST, 'his rows that make the question are one block: a copy the question’s own blank row breaks holds nothing, the same lines in his input row are his'),
      row(P3251_TEST, BLANK_SET_A)
    ]
  },
  {
    n: 'A53',
    name: 'ANY BLANK RUN BETWEEN TWO ROWS OF HIS COUNTED: his record not asked whether he typed it',
    file: OWN,
    find: '      recordHoldsBlankLines(words, above, below, last - n + 1, rows.length, formAt)\n',
    to: '      true\n',
    owners: [row(OWN_TEST, BLANK_NOT_HELD), row(OWN_TEST, BLANK_COUNT), row(P3251_TEST, C3C)]
  },
  {
    n: 'A54',
    name: 'THE BLANK LINES NOT COUNTED: one blank line of his after a line drawn above holds any blank run below it',
    file: OWN,
    find: '    if (blank && below.has(formAt(n + count + 1))) return true;\n',
    to: '    if (formAt(n + 1).length === 0) return true;\n',
    owners: [row(OWN_TEST, BLANK_COUNT)]
  },
  {
    n: 'A55',
    name: 'EVERY LINE OF HIS RECORD ASKED FOR HIS BLANK ROWS: an old, unplaced copy of his lines holds them',
    file: OWN,
    find: '    if (n === reach && total - reach > n) n = total - reach;\n',
    to: '',
    owners: [row(OWN_TEST, BLANK_PLACED)]
  },
  {
    n: 'A59',
    name: "A LINE OF BOX MARKS READ AS A BLANK LINE: a copy of a boxed question, its box rows carried as lines, holds it",
    file: OWN,
    find: '    for (let k = n + 1; k <= n + count && blank; k += 1) blank = isBlankLine(words.lines[k] ?? []);\n',
    to: '    for (let k = n + 1; k <= n + count && blank; k += 1) blank = formAt(k).length === 0;\n',
    owners: [row(OWN_TEST, BLANK_BOX)]
  },
  {
    n: 'A60',
    name: 'THE LINES THAT BOUND HIS BLANK ROWS SWAPPED: a line of his the input row wraps, beside his blank line, breaks his block',
    file: OWN,
    find: '  const inBlock = words.replayed || hisBottom < 0 ? his : withHisBlankRows(rows, his, endsOn, beginsOn, words);\n',
    to: '  const inBlock = words.replayed || hisBottom < 0 ? his : withHisBlankRows(rows, his, beginsOn, endsOn, words);\n',
    owners: [row(OWN_TEST, BLANK_WRAPPED)]
  },
  {
    n: 'A56',
    name: "THE PHONE'S PASTE NEVER BRACKETED: a paste into an agent's input row keeps only its last line",
    file: PASTE,
    find: "        const [opens, closes] = bracketed ? [PASTE_OPENS, PASTE_CLOSES] : ['', ''];\n",
    to: "        const [opens, closes] = ['', ''];\n",
    owners: [row(PASTE_TEST, 'the record is handed the paste'), row(PASTE_TEST, PASTE_WHOLE)]
  },
  {
    n: 'A57',
    name: 'THE FLAG READ LOOSELY: any line tmux prints is a pane that asked for bracketed paste',
    file: PASTE,
    find: '          bracketed = ASKED_FOR_BRACKETS.test(answer);\n',
    to: '          bracketed = answer.length > 0;\n',
    owners: [row(PASTE_TEST, PASTE_NOT_ASKED)]
  },
  {
    n: 'A58',
    name: "THE FLAG NOT READ: the act's list without its display, so no paste is recorded whole",
    file: PASTE,
    find: "'display-message', '-p', '-t', pane, BRACKET_PASTE_FLAG, ';', ",
    to: '',
    owners: [
      row(PASTE_TEST, 'loads the words from standard input BEFORE the read, then ONE spawned list: copy-mode -q, the bracketed-paste flag read, then paste-buffer -p -d, no Enter'),
      row(PASTE_TEST, PASTE_FLAG_READ),
      row(PASTE_TEST, 'the record is handed the paste')
    ]
  }
];

// ---------------------------------------------------------------------------
// The scratch root and the clone
// ---------------------------------------------------------------------------

const PARENT = process.env['P3251_SCRATCH'] ?? '';
if (PARENT === '') {
  process.stderr.write(`${TAG} P3251_SCRATCH is required: a directory for the clone, never under /private/tmp or /tmp\n`);
  process.exit(2);
}
if (!existsSync(PARENT)) {
  process.stderr.write(`${TAG} P3251_SCRATCH names ${PARENT}, which does not exist\n`);
  process.exit(2);
}
const parentReal = realpathSync(PARENT);
if (/^\/(?:private\/)?tmp(?:\/|$)/.test(parentReal)) {
  process.stderr.write(`${TAG} P3251_SCRATCH resolves to ${parentReal}, under /tmp, which macOS cleans while a run waits; name a directory elsewhere\n`);
  process.exit(2);
}
const only = (process.env['P3251_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
for (const name of only) {
  if (!ARMS.some((a) => a.n === name)) {
    process.stderr.write(`${TAG} P3251_ONLY names ${JSON.stringify(name)}, which is no arm\n`);
    process.exit(2);
  }
}
const chosen = ARMS.filter((a) => only.length === 0 || only.includes(a.n));
const scratch = mkdtempSync(join(parentReal, `p3251-ablation-${String(process.pid)}-`));

function cloneDir(rel) {
  const from = join(REPO, rel);
  if (!existsSync(from)) return;
  mkdirSync(dirname(join(scratch, rel)), { recursive: true });
  const r = spawnSync('cp', ['-Rc', from, join(scratch, rel)], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`cp -Rc ${rel} failed: ${r.stderr}`);
}

function buildClone() {
  for (const rel of ['src', 'build/fixtures', 'docs/design/phone', 'ios/Tortie']) cloneDir(rel);
  const configs = ['package.json', 'vitest.config.ts', ...readdirSync(REPO).filter((f) => /^tsconfig(\.[a-z]+)?\.json$/.test(f))];
  for (const name of [...configs, GATE, PHONECOPY]) {
    mkdirSync(dirname(join(scratch, name)), { recursive: true });
    writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
  }
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Run the named rows of these files in the clone: the full name of every row that ran and of every one that failed. */
function runRows(owners) {
  const files = [...new Set(owners.map((o) => o.file))];
  if (files.length === 0) return { failed: [], names: [], tail: '' };
  const out = join(scratch, `vitest-${String(Date.now())}-${String(Math.random()).slice(2, 8)}.json`);
  const pattern = owners.map((o) => escapeRe(o.title)).join('|');
  const r = spawnSync(
    process.execPath,
    [join('node_modules', 'vitest', 'vitest.mjs'), 'run', '--no-cache', '--reporter=json', `--outputFile=${out}`, '-t', pattern, ...files],
    { cwd: scratch, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 1_800_000, env: { ...process.env } }
  );
  let report = null;
  try {
    report = JSON.parse(readFileSync(out, 'utf8'));
  } catch {
    report = null;
  }
  rmSync(out, { force: true });
  if (report === null) return { failed: null, names: [], tail: `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-12).join('\n') };
  const failed = [];
  const names = [];
  for (const file of report.testResults ?? []) {
    for (const a of file.assertionResults ?? []) {
      if (a.status === 'skipped' || a.status === 'pending' || a.status === 'todo') continue;
      const name = [...(a.ancestorTitles ?? []), a.title].join(' > ');
      names.push(name);
      if (a.status === 'failed') failed.push(name);
    }
    if ((file.assertionResults ?? []).length === 0 && file.status === 'failed') failed.push(`${file.name} (did not load)`);
  }
  return { failed, names, tail: '' };
}

/** The clauses conformance:ownwords reads red over the clone (its live verdicts, never its self-tests). */
function runGate() {
  const r = spawnSync(process.execPath, [GATE], { cwd: scratch, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 300_000 });
  const red = new Set();
  const ok = new Set();
  for (const line of (r.stdout ?? '').split('\n')) {
    const m = /^\[conformance:ownwords\] (RED|ok)\s+(O\d+)\s{2}/.exec(line);
    if (m !== null) (m[1] === 'RED' ? red : ok).add(m[2]);
  }
  return { red, ok, status: r.status };
}

/** Whether conformance:phonecopy reads red over the clone. */
function runPhonecopy() {
  const r = spawnSync(process.execPath, [PHONECOPY, '--quiet'], { cwd: scratch, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 300_000 });
  return { red: r.status !== 0, status: r.status, tail: `${r.stderr ?? ''}`.split('\n').slice(0, 3).join(' | ') };
}

/** Every owner's reading over the clone as it stands: which are red. */
function readOwners(owners) {
  const rows = owners.filter((o) => o.kind === 'row');
  const clauses = owners.filter((o) => o.kind === 'clause');
  const vitest = runRows(rows);
  const gate = clauses.length > 0 ? runGate() : null;
  const phone = owners.some((o) => o.kind === 'phonecopy') ? runPhonecopy() : null;
  const label = (o) => (o.kind === 'row' ? `${o.title} (${o.file.split('/').pop()})` : o.kind === 'clause' ? `conformance:ownwords ${o.id}` : 'conformance:phonecopy');
  const reading = owners.map((o) => {
    if (o.kind === 'row') {
      if (vitest.failed === null) return { o, label: label(o), red: null, why: `vitest produced no report: ${vitest.tail}` };
      const ran = vitest.names.some((n) => n.endsWith(o.title));
      if (!ran) return { o, label: label(o), red: null, why: 'no row of that name ran' };
      return { o, label: label(o), red: vitest.failed.some((n) => n.endsWith(o.title)) };
    }
    if (o.kind === 'clause') {
      if (!gate.red.has(o.id) && !gate.ok.has(o.id)) return { o, label: label(o), red: null, why: `the gate printed no verdict for ${o.id} (exit ${String(gate.status)})` };
      return { o, label: label(o), red: gate.red.has(o.id) };
    }
    return { o, label: label(o), red: phone.red };
  });
  const others = vitest.failed === null ? [] : vitest.failed.filter((n) => !rows.some((o) => n.endsWith(o.title)));
  return { reading, others };
}

/** Put one clone file back and prove it by sha256 against the worktree. */
function restore(rel) {
  const want = readFileSync(join(REPO, rel));
  writeFileSync(join(scratch, rel), want);
  const got = readFileSync(join(scratch, rel));
  if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
}

let cleaned = false;
const clean = () => {
  if (cleaned) return;
  cleaned = true;
  try {
    rmSync(scratch, { recursive: true, force: true });
  } catch {
    /* a scratch directory; not fatal */
  }
};
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    clean();
    process.exit(130);
  });
}

const count = (text, needle) => (needle === '' ? 0 : text.split(needle).length - 1);
const key = (o) => (o.kind === 'row' ? `row\u0000${o.file}\u0000${o.title}` : o.kind === 'clause' ? `clause\u0000${o.id}` : 'phonecopy');

const problems = [];
const waiting = [];
const table = [];
const started = Date.now();
let ran = 0;
let owned = 0;

const WATCHED = [...new Set([...ARMS.map((a) => a.file), OWN_TEST, P3251_TEST, KEYS_TEST, PASTE_TEST, REPLAY_TEST, WRITER_TEST, GATE, PHONECOPY])];
const before = new Map(WATCHED.filter((f) => existsSync(join(REPO, f))).map((f) => [f, sha(readFileSync(join(REPO, f)))]));

try {
  buildClone();
  say(`clone at ${scratch}, node_modules symlinked, nothing under a home touched`);
  // THE CONTROL: every owner of every chosen arm, over the unedited clone.
  const allOwners = [...new Map(chosen.flatMap((a) => a.owners).map((o) => [key(o), o])).values()];
  const control = readOwners(allOwners);
  const redBefore = new Set(control.reading.filter((x) => x.red !== false).map((x) => key(x.o)));
  for (const x of control.reading) {
    if (x.red === null) problems.push(`the control could not read ${x.label}: ${x.why}`);
  }
  const greenOwners = control.reading.filter((x) => x.red === false).length;
  say(`control: ${String(greenOwners)} of ${String(control.reading.length)} owners green over the unedited clone`);
  for (const x of control.reading.filter((y) => y.red === true)) say(`control: RED before any arm: ${x.label}`);

  for (const arm of chosen) {
    const blocked = arm.owners.filter((o) => redBefore.has(key(o)));
    if (blocked.length > 0) {
      const why = `its owner is red in the unedited control (${blocked.map((o) => (o.kind === 'clause' ? o.id : o.kind === 'row' ? o.title : 'phonecopy')).join(', ')})`;
      if (arm.integrated === true) {
        waiting.push(`${arm.n} "${arm.name}": ${why}; it needs the integrated tree (build/p3251/SPEC.md §4.5, S1 to S3)`);
        table.push([arm.n, 'WAITS', arm.name]);
      } else {
        problems.push(`${arm.n} "${arm.name}": ${why}, so the arm proves nothing`);
        table.push([arm.n, 'CONTROL RED', arm.name]);
      }
      continue;
    }
    const shipping = readFileSync(join(REPO, arm.file), 'utf8');
    const hits = count(shipping, arm.find);
    if (hits !== 1) {
      problems.push(`${arm.n} "${arm.name}": its needle matches ${String(hits)} times in ${arm.file}, not exactly once. A clause that moved moves its arm in the same commit.`);
      table.push([arm.n, 'NEEDLE', arm.name]);
      continue;
    }
    writeFileSync(join(scratch, arm.file), shipping.replace(arm.find, () => arm.to), 'utf8');
    ran += 1;
    let got;
    try {
      got = readOwners(arm.owners);
    } finally {
      restore(arm.file);
    }
    const unread = got.reading.filter((x) => x.red === null);
    const green = got.reading.filter((x) => x.red === false);
    if (unread.length > 0 || green.length > 0) {
      problems.push(
        `${arm.n} "${arm.name}": ` +
          (green.length > 0 ? `its owner stayed GREEN: ${green.map((x) => x.label).join(' | ')}. ` : '') +
          (unread.length > 0 ? `unread: ${unread.map((x) => `${x.label} (${x.why})`).join(' | ')}. ` : '') +
          (got.others.length > 0 ? `Red instead: ${got.others.slice(0, 4).join(' | ')}` : '')
      );
      table.push([arm.n, green.length > 0 ? 'OWNER GREEN' : 'UNREAD', arm.name]);
    } else {
      owned += 1;
      table.push([arm.n, 'owners red', `${arm.name}${got.others.length > 0 ? ` (and ${String(got.others.length)} other row${got.others.length === 1 ? '' : 's'})` : ''}`]);
    }
    say(`${arm.n.padEnd(4)} ${green.length === 0 && unread.length === 0 ? 'ok  ' : 'FAIL'} ${arm.name}: ${got.reading.map((x) => `${x.red === true ? 'red' : x.red === false ? 'GREEN' : '?'} ${x.label}`).join('; ')}`);
  }

  // THE CONTROL AGAIN, after every file was put back.
  const after = readOwners(allOwners);
  const changed = after.reading.filter((x) => (x.red !== false) !== redBefore.has(key(x.o)));
  if (changed.length > 0) problems.push(`after every file was restored the control reads differently for ${changed.map((x) => x.label).join(', ')}, so a restore did not land`);
  else say(`restored: every edited clone file matched the worktree by sha256, and the control reads as it did (${String(after.reading.filter((x) => x.red === false).length)} owners green)`);
} catch (err) {
  problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  clean();
}

for (const [file, was] of before) {
  const now = sha(readFileSync(join(REPO, file)));
  if (now !== was) problems.push(`${file} in the WORKTREE changed during the run (${was.slice(0, 12)} to ${now.slice(0, 12)}); this harness writes only its clone`);
}

process.stdout.write('\n');
for (const [n, verdict, name] of table) process.stdout.write(`${TAG}   ${n.padEnd(4)} ${verdict.padEnd(12)} ${name}\n`);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
for (const w of waiting) process.stdout.write(`${TAG} WAITS: ${w}\n`);
if (problems.length > 0 || (waiting.length > 0 && only.length === 0)) {
  process.stdout.write(`\n${TAG} FAIL, ${String(problems.length + (only.length === 0 ? waiting.length : 0))} in ${seconds} s:\n`);
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  if (only.length === 0) for (const w of waiting) process.stdout.write(`  - ${w}\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS in ${seconds} s. ${String(ran)} arms, one clause each, and every one turned EVERY OWNER it names red ` +
    `(${String(owned)} of ${String(ran)})${waiting.length > 0 ? `; ${String(waiting.length)} named arm(s) wait on the integrated tree` : ''}. Every clone file was restored and proved by sha256, ` +
    'the worktree was never written, and the clone is gone. No Electron, no tmux, no agent, no token.\n'
);
process.exit(0);
