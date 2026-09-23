/**
 * PHASE 312 — the rows the dialog detector matched, instead of only its verdict.
 *
 * Two things are pinned here and the FIRST ONE IS THE FLOOR.
 *
 * `detectDialog` is the only screen-derived route to `needs_input` and the only
 * route at all for the fourteen registry rows with no hook. It was measured at
 * 57/57 recall and 0/386 false positives, so a widening that makes it miss one
 * dialog it catches today is a regression on the most important status in the
 * product. `parentVerdict` below is a LITERAL COPY of the function as it stood
 * at `a31999fc`, kept as a second spelling on purpose, and every capture in this
 * file — the eight committed fixtures, the hostile shapes and the ones this
 * phase composes — is asserted against it. The copy is the floor made
 * executable: it goes red if the shipping clause moves, whether the movement
 * looks like a widening or like a tidy-up.
 *
 * The second is what the rows say, which is new surface: the markers and the
 * text in the order the agent drew them, the question row, the two caps, the
 * wrap rule, and that nothing is collected on a screen the verdict is silent on.
 *
 * THE FIX ROUND ADDED FOUR ARMS AND EACH ONE IS A DEFECT THE VERIFIERS BUILT
 * RATHER THAN A RULE SOMEBODY LIKED: a numbered gutter drawn BELOW a real gate
 * taking the gate's options while the gate's own question stayed above them; a
 * stray "do you want" in the agent's prose becoming the question of a gate that
 * asks none; a three-digit marker glued onto the option above it; and an option
 * LOST where the verdict still fired, because the collector's regex carried a
 * line-terminator clause the verdict's does not. Every one of them is driven
 * against a control that differs by one character or one row, because a hostile
 * capture with no control proves nothing about which clause did the work.
 *
 * The captures composed here are written by hand rather than taken from an
 * agent. The per-agent matrix over REAL captures is the phase's own proof and
 * is the verifier's, not this file's.
 *
 * WHERE THE FIVE NEW FIXTURES CAME FROM, because a capture nobody can account
 * for is a capture nobody may commit. `antigravity-signin-choice`,
 * `claude-theme-picker`, `codex-signin-choice`, `gemini-trust-gate` and
 * `muse-trust-gate` are first-run gates taken from the agents installed on the
 * build machine, each started in its own tmux under a SCRATCH HOME with the
 * credential environment scrubbed and read with `capture-pane -p -t <paneId>`,
 * the same call `monitor.ts` makes. No agent had an account, so no turn was
 * taken and no capture can hold a line of anybody's conversation. They carry no
 * control bytes, because `capture-pane` without `-e` strips the escapes.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHOICE_MAX_OPTIONS,
  CHOICE_OPTION_MAX_CHARS,
  CHOICE_QUESTION_INK_ROWS,
  CHOICE_QUESTION_MAX_CHARS,
  detectDialog,
  detectDialogRows,
  normalizeCapture
} from '../screen';

const fixture = (name: string): string =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf8');

/**
 * DERIVED, not listed: every capture in the fixtures directory is held to the
 * floor, so a capture a later round commits is covered the moment it lands
 * rather than when somebody remembers to add it here. The floor below is the
 * count at this phase — thirteen — so a fixture deleted rather than added is
 * still a red test. Phase 321 raised it to twenty-two with its nine redacted
 * captures of the questions real agents draw; the verdict over every one of
 * them still equals the parent's.
 */
const FIXTURES = readdirSync(join(__dirname, 'fixtures'))
  .filter((name) => name.endsWith('.txt'))
  .sort();
const FIXTURE_FLOOR = 22;

// ---------------------------------------------------------------------------
// The floor: the verdict as it stood at the parent commit
// ---------------------------------------------------------------------------

/**
 * `detectDialog` at `a31999fc`, copied byte for byte except for the names.
 * Nothing in this block may be "shared" with the shipping module: an oracle
 * that imports the thing it judges proves nothing.
 */
function parentVerdict(capture: string): boolean {
  const BORDER = /^[\s│┃║▌▏|]+|[\s│┃║▕|]+$/g;
  const OPT1 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}1[.)]\s+\S/;
  const OPT2 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}2[.)]\s+\S/;
  const HINT =
    /(enter to (confirm|select|continue)|press enter|esc to cancel|esc to quit|use enter to select|to cancel)/i;
  const QUEST = /(do you (want|trust)|would you like|how would you like)/i;
  const DIALOG_ROWS = 24;
  const lines = capture.split('\n');
  while (lines.length > 0 && (lines[lines.length - 1] ?? '').trim() === '') {
    lines.pop();
  }
  const rows = lines.slice(-DIALOG_ROWS).map((l) => l.replace(BORDER, ''));
  let opt1 = false;
  let opt2 = false;
  let hint = false;
  for (const row of rows) {
    if (!opt1 && OPT1.test(row)) opt1 = true;
    if (!opt2 && OPT2.test(row)) opt2 = true;
    if (!hint && (HINT.test(row) || QUEST.test(row))) hint = true;
  }
  return opt1 && opt2 && hint;
}

/** Every capture this file builds, so the floor is asserted over all of them. */
const COMPOSED: Array<[string, string]> = [];
const capture = (name: string, text: string): string => {
  COMPOSED.push([name, text]);
  return text;
};

// ---------------------------------------------------------------------------
// The captures this phase composes
// ---------------------------------------------------------------------------

const WRAPPED = capture(
  'a wrapped option',
  [
    ' Do you want to run the command?',
    ' ❯ 1. Yes, but only if',
    '      the tests pass',
    '   2. No',
    '',
    ' Enter to confirm · Esc to cancel'
  ].join('\n')
);

const DEDENTED = capture(
  'a row that dedents out of the option block',
  [
    ' Do you want to run the command?',
    ' ❯ 1. Yes, but only if',
    'the tests pass',
    '   2. No',
    '',
    ' Enter to confirm · Esc to cancel'
  ].join('\n')
);

const HINT_UNDER_OPTIONS = capture(
  'a hint drawn under the options, indented like one',
  [
    ' Do you want to run it?',
    ' 1. Yes',
    ' 2. No',
    '   Enter to confirm · Esc to cancel'
  ].join('\n')
);

const THREE_WRAPS = capture(
  'an option wrapped over three rows',
  [
    ' Do you want to run it?',
    ' 1. Yes and',
    '    then one',
    '    then two',
    '    then three',
    ' 2. No',
    ' Enter to confirm'
  ].join('\n')
);

const PUNCTUATION = capture(
  'markers drawn with a bracket, and a two-digit one',
  [
    ' Do you want one?',
    ' 1) First',
    ' 2) Second',
    ' 10) Tenth',
    ' Press enter'
  ].join('\n')
);

const TWENTY_TWO = capture(
  'twenty-two options in a 24-row window',
  [
    ' Do you want to pick one?',
    ...Array.from({ length: 22 }, (_, i) => ` ${i + 1}. option ${i + 1}`),
    ' Enter to confirm'
  ].join('\n')
);

const LONG_OPTION = capture(
  'an option longer than the cap',
  [
    ' Do you want to run it?',
    ` 1. ${'x'.repeat(400)}`,
    ' 2. No',
    ' Enter to confirm'
  ].join('\n')
);

const SECRETS = capture(
  'a question and an option carrying secret shapes',
  [
    ' Do you want to mail greg@example.com?',
    ' 1. Yes, use sk_live_0123456789abcdef',
    ' 2. No',
    ' Enter to confirm'
  ].join('\n')
);

const PROSE_LIST = capture(
  'a numbered list in an agent ANSWER, with no hint anywhere',
  [
    '⏺ Three things to do next:',
    '',
    '  1. Read the entry',
    '  2. Write the test',
    '  3. Run the gate',
    ''
  ].join('\n')
);

const DIFF_HUNK = capture(
  'a unified diff whose lines start with a numeral',
  [
    '⏺ Update(notes.md)',
    '  ⎿  Added 2 lines',
    '      1. hello',
    '      2. HELLO',
    ''
  ].join('\n')
);

/** ESC built rather than typed, so no file in this tree holds a control byte. */
const ESC = String.fromCharCode(27);

const ANSI = capture(
  'a capture holding ANSI, which capture-pane without -e should never produce',
  [
    ' Do you want to run it?',
    ` ${ESC}[1m❯ 1. Yes${ESC}[0m`,
    ' 2. No',
    ' Enter to confirm'
  ].join('\n')
);

const LIST_ABOVE_A_DIALOG = capture(
  'a numbered list left in the window above the dialog',
  [
    'Tips for getting started:',
    '1. Create a file',
    '2. Ask a question',
    '3. Be specific',
    '4. Be specific for the best results',
    '',
    ' Do you trust the files in this folder?',
    '',
    ' ● 1. Trust folder',
    '   2. Trust parent folder',
    "   3. Don't trust",
    '',
    ' Press enter'
  ].join('\n')
);

const CRLF = capture(
  'the permission prompt with CRLF line endings',
  fixture('claude-permission-prompt.txt').replace(/\n/g, '\r\n')
);

/**
 * THE SHAPE THE FIX ROUND'S FIRST FINDING WAS BUILT FROM, and it is the only
 * shape in this file that made the rows WRONG rather than merely absent: a real
 * gate with a numbered block drawn BELOW it. The question came off the real gate
 * and the options off the stray block, so a person was asked the gate's question
 * over somebody else's rows.
 *
 * It is not invented. The bytes below the prompt are claude's OWN numbered code
 * gutter, taken verbatim from `claude-theme-picker.txt`, which draws a gutter
 * directly under numbered options on a real screen. The single character changed
 * is the gutter's separator, `1  ` to `1. `, which is what makes the rows
 * lexable as options at all — and the control beside it, with the real gutter
 * untouched, is what proves that one character is the whole trigger.
 */
const GUTTER_ROWS = fixture('claude-theme-picker.txt')
  .split('\n')
  .filter((l) => /^\s*\d+\s{1,2}[-+}f ]/.test(l));

const GUTTER_BELOW = capture(
  'a numbered code gutter drawn BELOW a real permission prompt',
  `${fixture('claude-permission-prompt.txt')}\n${GUTTER_ROWS.map((l) =>
    l.replace(/^(\s*)(\d+) /, '$1$2. ')
  ).join('\n')}`
);

const GUTTER_BELOW_CONTROL = capture(
  'the same screen with claude’s real gutter separator',
  `${fixture('claude-permission-prompt.txt')}\n${GUTTER_ROWS.join('\n')}`
);

const CLEAN_LIST_BELOW = capture(
  'a CLEAN numbered list drawn below a dialog — the stated limit',
  [
    ' Do you want to run it?',
    ' 1. Yes',
    ' 2. No',
    ' Press enter',
    '',
    'Next steps:',
    ' 1. a',
    ' 2. b'
  ].join('\n')
);

/**
 * A line of the agent's own prose above the committed trust gate, which asks NO
 * question of its own. Before the fix round that sentence became the gate's
 * question outright.
 */
const PROSE_QUESTION_ABOVE = capture(
  'a stray “do you want” in prose above a gate that asks nothing',
  ` Shall I keep going? Do you want me to also update the README first?\n${fixture(
    'claude-workspace-trust.txt'
  )}`
);

const THREE_DIGIT_MARKER = capture(
  'a numbered row whose marker has three digits',
  [
    ' Do you want one?',
    ' 1. Alpha',
    ' 2. Beta',
    ' 100. Hundred',
    ' Press enter'
  ].join('\n')
);

/** U+2028 built rather than typed, for the same reason `ESC` above is. */
const LSEP = String.fromCharCode(0x2028);

const TERMINATOR_MID_ROW = capture(
  'an option whose text holds a stray line separator',
  [
    ' Do you want one?',
    ` 1. Ye${LSEP}s`,
    ' 2. No',
    ' Press enter'
  ].join('\n')
);

const FAR_QUESTION = capture(
  'a question further above the options than the ink bound allows',
  [
    ' Do you want to run it?',
    ' one',
    ' two',
    ' three',
    ' four',
    ' five',
    ' 1. Yes',
    ' 2. No',
    ' Press enter'
  ].join('\n')
);

const ABOVE_THE_WINDOW = capture(
  'a dialog drawn above 40 rows of later output',
  `${fixture('claude-permission-prompt.txt')}\n${Array.from(
    { length: 40 },
    (_, i) => `line ${i}`
  ).join('\n')}`
);

// ---------------------------------------------------------------------------

describe('Phase 312 — the floor: the verdict did not move', () => {
  it('holds every committed capture to the floor, not a list of them', () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(FIXTURE_FLOOR);
  });

  it.each(FIXTURES)('answers the parent commit on %s', (name) => {
    const text = fixture(name);
    expect(detectDialog(text)).toBe(parentVerdict(text));
    // …and on the same capture with the padding a tall pane adds, which is the
    // case the window is measured from the last inked row for.
    const tall = `${text}${'\n'.repeat(18)}`;
    expect(detectDialog(tall)).toBe(parentVerdict(tall));
    expect(detectDialog(normalizeCapture(text))).toBe(
      parentVerdict(normalizeCapture(text))
    );
  });

  it('answers the parent commit on every capture this file composes', () => {
    for (const [name, text] of COMPOSED) {
      expect([name, detectDialog(text)]).toEqual([name, parentVerdict(text)]);
    }
    // The composed set is the hostile half of this file; if it ever shrinks the
    // floor above is being asserted over less than it was.
    expect(COMPOSED.length).toBeGreaterThanOrEqual(13);
  });

  it('pins the parent answers themselves, so the oracle cannot drift quietly', () => {
    expect(detectDialog(fixture('claude-permission-prompt.txt'))).toBe(true);
    expect(detectDialog(fixture('claude-workspace-trust.txt'))).toBe(true);
    expect(detectDialog(fixture('claude-post-answer.txt'))).toBe(false);
    for (const name of [
      'claude-idle.txt',
      'codex-idle.txt',
      'qwen-idle.txt',
      'pi-idle.txt',
      'shell-idle.txt'
    ]) {
      expect(detectDialog(fixture(name))).toBe(false);
    }
  });

  it('is ONE spelling of the predicate', () => {
    for (const name of FIXTURES) {
      const text = fixture(name);
      expect(detectDialog(text)).toBe(detectDialogRows(text).atChoice);
    }
  });
});

describe('Phase 312 — the rows off a REAL claude permission prompt', () => {
  const rows = detectDialogRows(fixture('claude-permission-prompt.txt'));

  it('carries all THREE options, which the verdict regexes never saw', () => {
    expect(rows.options).toEqual([
      { marker: '1', text: 'Yes' },
      {
        marker: '2',
        text: 'Yes, allow all edits during this session (shift+tab)'
      },
      { marker: '3', text: 'No' }
    ]);
  });

  it('carries the question row and not the hint row', () => {
    expect(rows.question).toBe('Do you want to make this edit to note.txt?');
  });

  it('drops the cursor glyph rather than carrying it on one row only', () => {
    expect(rows.options[0]?.text).toBe('Yes');
    expect(JSON.stringify(rows.options)).not.toContain('❯');
  });

  it('does not read the diff rows above it as options', () => {
    // Lines 15 and 16 of that fixture are ` 1  hello` and ` 2 +HELLO`.
    expect(rows.options.map((o) => o.text)).not.toContain('hello');
  });

  it('reads the same rows through a tall pane and through CRLF', () => {
    expect(detectDialogRows(ABOVE_THE_WINDOW).options).toEqual([]);
    expect(detectDialogRows(CRLF).options).toEqual(rows.options);
    expect(detectDialogRows(CRLF).question).toBe(rows.question);
  });

  it('is pure: the same capture answers the same rows twice', () => {
    const again = detectDialogRows(fixture('claude-permission-prompt.txt'));
    expect(again).toEqual(rows);
  });
});

describe('Phase 312 — the rows off a REAL claude workspace-trust gate', () => {
  const rows = detectDialogRows(fixture('claude-workspace-trust.txt'));

  it('carries both options', () => {
    expect(rows.options).toEqual([
      { marker: '1', text: 'Yes, I trust this folder' },
      { marker: '2', text: 'No, exit' }
    ]);
  });

  it('answers null for the question that gate never asks in those words', () => {
    // Its "Quick safety check: … one you trust?" matches no QUEST clause, and a
    // null question is the honest answer rather than an invented one.
    expect(rows.question).toBeNull();
    expect(rows.atChoice).toBe(true);
  });
});

describe('Phase 312 — the choice starts at its own 1', () => {
  it('leaves a numbered list drawn above the dialog out of the options', () => {
    const rows = detectDialogRows(LIST_ABOVE_A_DIALOG);
    expect(rows.options).toEqual([
      { marker: '1', text: 'Trust folder' },
      { marker: '2', text: 'Trust parent folder' },
      { marker: '3', text: "Don't trust" }
    ]);
  });

  it('leaves a numbered GUTTER drawn below the dialog out of the options', () => {
    // The fix round's first finding. The markers of the gutter block repeat —
    // 1, 2, 2, 3 — so the block is passed over and the gate above it is
    // collected instead, which is where the question that is already being
    // drawn belongs.
    const rows = detectDialogRows(GUTTER_BELOW);
    expect(rows.question).toBe('Do you want to make this edit to note.txt?');
    expect(rows.options).toEqual([
      { marker: '1', text: 'Yes' },
      {
        marker: '2',
        text: 'Yes, allow all edits during this session (shift+tab)'
      },
      { marker: '3', text: 'No' }
    ]);
  });

  it('reads the same rows with claude’s real gutter separator', () => {
    // The control: one character apart, and both answers must be the gate's.
    expect(detectDialogRows(GUTTER_BELOW_CONTROL).options).toEqual(
      detectDialogRows(GUTTER_BELOW).options
    );
  });

  it('closes the option block at the first marker that does not increase', () => {
    const rows = detectDialogRows(
      [
        ' Do you want one?',
        ' 1. a',
        ' 2. b',
        ' 2. b again',
        ' 3. c',
        ' Press enter'
      ].join('\n')
    );
    expect(rows.options).toEqual([
      { marker: '1', text: 'a' },
      { marker: '2', text: 'b' }
    ]);
  });

  it('still takes a CLEAN list drawn below the dialog, which is the limit', () => {
    // Stated rather than discovered, and unchanged from the parent: from that
    // row down the markers do increase, and nothing in a screen read tells a
    // tidy list from a menu. The verdict is what vouches for a menu, and it
    // answers about the whole window.
    expect(detectDialogRows(CLEAN_LIST_BELOW).options).toEqual([
      { marker: '1', text: 'a' },
      { marker: '2', text: 'b' }
    ]);
  });

  it('finds the question BELOW that list, which the stray row would hide', () => {
    // The question sits above the choice's own first option and below the
    // list's last row, so a collection that started at the first numbered row
    // anywhere in the window would answer null here.
    expect(detectDialogRows(LIST_ABOVE_A_DIALOG).question).toBe(
      'Do you trust the files in this folder?'
    );
  });
});

describe('Phase 312 — the rows off REAL captures of other agents', () => {
  it('reads gemini’s trust gate, question and all, out of its box', () => {
    // Gemini draws its dialog inside a `│ … │` box AND leaves four rows of
    // "Tips for getting started" inside the 24-row window above it.
    const rows = detectDialogRows(fixture('gemini-trust-gate.txt'));
    expect(rows.atChoice).toBe(true);
    expect(rows.question).toBe('Do you trust the files in this folder?');
    expect(rows.options).toEqual([
      { marker: '1', text: 'Trust folder (work)' },
      { marker: '2', text: 'Trust parent folder (p312-gemini-YbOqsD)' },
      { marker: '3', text: "Don't trust" }
    ]);
  });

  it('reads codex’s sign-in choice, subtitle rows and all', () => {
    // Codex draws an indented description under each option. It is indented
    // past the marker, so the wrap rule takes it as part of the option — which
    // is the deliberate trade: a subtitle joined onto its option reads long,
    // where a wrapped option cut at the row boundary reads as another choice.
    const rows = detectDialogRows(fixture('codex-signin-choice.txt'));
    expect(rows.atChoice).toBe(true);
    expect(rows.options.map((o) => o.marker)).toEqual(['1', '2', '3']);
    expect(rows.options[0]?.text).toBe(
      'Sign in with ChatGPT Usage included with Plus, Pro, Business, and Enterprise plans'
    );
    expect(rows.question).toBeNull();
  });

  it.each([
    ['antigravity-signin-choice.txt', '↑/↓ Navigate · enter Select'],
    ['muse-trust-gate.txt', '1  Trust and continue, with no . or ) after it'],
    ['claude-theme-picker.txt', 'no hint row in the window at all']
  ])(
    'is silent on %s at HEAD exactly as it is at the parent (%s)',
    (name, _why) => {
      // THESE ARE MISSES AND THEY ARE THE PARENT'S MISSES. The verdict's
      // clause is untouched by this phase, so a real dialog it could not see
      // yesterday it still cannot see. Widening HINT or the option regexes is
      // a measured change to the floor and belongs to a phase of its own.
      const text = fixture(name);
      expect(parentVerdict(text)).toBe(false);
      expect(detectDialogRows(text)).toEqual({
        atChoice: false,
        question: null,
        options: []
      });
    }
  );
});

describe('Phase 312 — nothing is collected where the verdict is silent', () => {
  it.each([
    ['claude-idle.txt'],
    ['codex-idle.txt'],
    ['qwen-idle.txt'],
    ['pi-idle.txt'],
    ['shell-idle.txt'],
    ['claude-post-answer.txt']
  ])('answers no rows at all on %s', (name) => {
    expect(detectDialogRows(fixture(name))).toEqual({
      atChoice: false,
      question: null,
      options: []
    });
  });

  it('answers no rows for a numbered list in an agent ANSWER', () => {
    expect(detectDialogRows(PROSE_LIST)).toEqual({
      atChoice: false,
      question: null,
      options: []
    });
  });

  it('answers no rows for a diff whose lines start with a numeral', () => {
    expect(detectDialogRows(DIFF_HUNK).options).toEqual([]);
  });
});

describe('Phase 312 — a wrapped option is one option', () => {
  it('joins the continuation row rather than truncating the sentence', () => {
    expect(detectDialogRows(WRAPPED).options).toEqual([
      { marker: '1', text: 'Yes, but only if the tests pass' },
      { marker: '2', text: 'No' }
    ]);
  });

  it('never makes two options out of one', () => {
    expect(detectDialogRows(WRAPPED).options).toHaveLength(2);
  });

  it('leaves a row that dedents to the margin out of the option', () => {
    expect(detectDialogRows(DEDENTED).options).toEqual([
      { marker: '1', text: 'Yes, but only if' },
      { marker: '2', text: 'No' }
    ]);
  });

  it('never absorbs the hint row, however it is indented', () => {
    expect(detectDialogRows(HINT_UNDER_OPTIONS).options).toEqual([
      { marker: '1', text: 'Yes' },
      { marker: '2', text: 'No' }
    ]);
  });

  it('absorbs two continuation rows and stops', () => {
    expect(detectDialogRows(THREE_WRAPS).options).toEqual([
      { marker: '1', text: 'Yes and then one then two' },
      { marker: '2', text: 'No' }
    ]);
  });
});

describe('Phase 312 — the question belongs to the options under it', () => {
  it('answers null rather than taking a sentence out of the agent’s prose', () => {
    // The fix round's second finding, on the committed gate that asks NO
    // question of its own: one line of prose above it became its question.
    expect(detectDialogRows(PROSE_QUESTION_ABOVE).question).toBeNull();
    // …and the options are still the gate's own, so the walk gave up on the
    // question alone.
    expect(detectDialogRows(PROSE_QUESTION_ABOVE).options).toEqual(
      detectDialogRows(fixture('claude-workspace-trust.txt')).options
    );
  });

  it('gives up past CHOICE_QUESTION_INK_ROWS inked rows', () => {
    expect(CHOICE_QUESTION_INK_ROWS).toBe(4);
    expect(detectDialogRows(FAR_QUESTION).question).toBeNull();
    // One inked row fewer and the same screen answers.
    const near = FAR_QUESTION.replace(' five\n', '');
    expect(detectDialogRows(near).question).toBe('Do you want to run it?');
  });

  it('keeps gemini’s question across its box’s own explanation', () => {
    // The measurement the bound is set from: three inked rows and four raw
    // blanks between the question and the first option.
    expect(detectDialogRows(fixture('gemini-trust-gate.txt')).question).toBe(
      'Do you trust the files in this folder?'
    );
  });

  it('takes the NEAREST question above the options, not the earliest', () => {
    const two = [
      ' Do you want the first thing?',
      ' Do you want the second thing?',
      ' 1. Yes',
      ' 2. No',
      ' Press enter'
    ].join('\n');
    expect(detectDialogRows(two).question).toBe(
      'Do you want the second thing?'
    );
  });
});

describe('Phase 312 — a numbered row is never a continuation', () => {
  it('never glues a row with a THREE-digit marker onto the option above', () => {
    // The fix round's third finding: `OPT_ANY` refuses a third digit, so
    // `100. Hundred` matched no option and fell through to the wrap rule, which
    // read it as the continuation of `2. Beta`.
    expect(detectDialogRows(THREE_DIGIT_MARKER).options).toEqual([
      { marker: '1', text: 'Alpha' },
      { marker: '2', text: 'Beta' }
    ]);
  });

  it('carries an option whose text holds a stray line terminator', () => {
    // The fix round's fourth finding, and it is the union's own promise: `OPT1`
    // has no line-terminator clause, so `OPT_ANY` may not have one either or the
    // verdict is true with an option MISSING from the list.
    const rows = detectDialogRows(TERMINATOR_MID_ROW);
    expect(rows.options).toHaveLength(2);
    expect(rows.options[1]).toEqual({ marker: '2', text: 'No' });
    expect(rows.options[0]?.marker).toBe('1');
    expect(rows.options[0]?.text).toContain('Ye');
    expect(rows.options[0]?.text).toContain('s');
  });
});

describe('Phase 312 — the markers are the agent’s own', () => {
  it('reads a bracket separator and a two-digit marker', () => {
    expect(detectDialogRows(PUNCTUATION).options).toEqual([
      { marker: '1', text: 'First' },
      { marker: '2', text: 'Second' },
      { marker: '10', text: 'Tenth' }
    ]);
  });

  it('keeps the drawn marker rather than the array index', () => {
    const rows = detectDialogRows(PUNCTUATION);
    expect(rows.options[2]?.marker).toBe('10');
  });

  it('loses a row to ANSI exactly where the verdict loses it, and no further', () => {
    // `captureScreens` runs capture-pane with no -e, so a coloured row should
    // never arrive. One that did is invisible to the MARKER CLASS — an escape
    // sits where the glyph would — and that is true of `OPT1` and `OPT2` in the
    // same breath, which is why the verdict is false here too. The collector
    // never sees a row the verdict could not, which is the whole of the claim.
    expect(parentVerdict(ANSI)).toBe(false);
    expect(detectDialogRows(ANSI)).toEqual({
      atChoice: false,
      question: null,
      options: []
    });
  });
});

describe('Phase 312 — the two caps', () => {
  it('carries at most CHOICE_MAX_OPTIONS options, from the top of the list', () => {
    const rows = detectDialogRows(TWENTY_TWO);
    expect(rows.options).toHaveLength(CHOICE_MAX_OPTIONS);
    expect(rows.options[0]).toEqual({ marker: '1', text: 'option 1' });
    expect(rows.options.at(-1)).toEqual({
      marker: String(CHOICE_MAX_OPTIONS),
      text: `option ${CHOICE_MAX_OPTIONS}`
    });
  });

  it('marks an option it had to cut, so it cannot read as another choice', () => {
    const text = detectDialogRows(LONG_OPTION).options[0]?.text ?? '';
    expect(text).toHaveLength(CHOICE_OPTION_MAX_CHARS);
    expect(text.endsWith('…')).toBe(true);
  });

  it('caps the question at the same 200 characters Phase 311 clips to', () => {
    expect(CHOICE_QUESTION_MAX_CHARS).toBe(200);
    const long = [
      ` Do you want to ${'y'.repeat(400)}?`,
      ' 1. Yes',
      ' 2. No',
      ' Enter to confirm'
    ].join('\n');
    const question = detectDialogRows(long).question ?? '';
    expect(question).toHaveLength(CHOICE_QUESTION_MAX_CHARS);
    expect(question.endsWith('…')).toBe(true);
  });
});

describe('Phase 312 — every carried string is redacted', () => {
  const rows = detectDialogRows(SECRETS);

  it('redacts a secret shape in an option', () => {
    expect(rows.options[0]?.text).toBe('Yes, use [REDACTED:stripe-key]');
  });

  it('redacts a secret shape in the question', () => {
    expect(rows.question).toBe('Do you want to mail [REDACTED:email]?');
  });

  it('leaves no unredacted token shape anywhere in the answer', () => {
    expect(JSON.stringify(rows)).not.toContain('sk_live_');
    expect(JSON.stringify(rows)).not.toContain('@example.com');
  });
});
