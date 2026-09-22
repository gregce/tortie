#!/usr/bin/env node
/**
 * `npm run ablation:p312`. THE ATTACK ON PHASE 312'S OWN RULES
 * (the Phase 312 entry in docs/BACKLOG.md, build/p312/SPEC.md).
 *
 * About 25 s. It launches no Electron, starts no tmux server, spawns no agent,
 * mounts nothing, makes no request and spends no token. It starts no process but
 * `node`, and it reads nothing under the person's home.
 *
 * ## Why a second script
 *
 * A rule that cannot be made to fail proves nothing, and a gate whose rules have
 * never been shown to fail is a gate that can quietly stop asking. CLAUDE.md
 * records one that was RED from 25 August 2026 until Phase 296 while nobody
 * noticed, because the table that would have named it had no row for it.
 *
 * So this script breaks the REAL file, runs the check that OWNS that clause,
 * reads whether it went red, and **puts the file back in a `finally`, byte for
 * byte, checked by sha256 after every single ablation and again at the end.** It
 * is the shape `build/p300/ablation.mjs` and `build/p274/ablation.mjs` use, for
 * the same reason.
 *
 * ## The two checks, and why there are two
 *
 * `conformance:choices` spawns nothing and reads source, so it holds the clauses
 * a green test cannot keep in place — a round can change a rule and its test in
 * one edit. The four p312 vitest files DRIVE the detector over thirteen committed
 * captures and the hostile shapes composed beside them. A clause belongs to one
 * or the other, and an ablation that reddens the wrong one is a finding about the
 * ablation rather than about the rule.
 *
 * THE ARM THE ENTRY NAMES IS FIRST: "the arm that makes the verdict read the
 * generalised collector, which must go red on the sentence that owns the floor."
 * That is arm 1, and the sentence it must redden is clause 1 of
 * `conformance:choices`.
 *
 * ## The safety, stated because this script edits the working tree
 *
 *   - Every file's original bytes are read ONCE, before anything is written, and
 *     held in memory. The `finally` writes all of them back whatever happened,
 *     including on an uncaught throw and on a signal.
 *   - After every ablation the file is restored and its sha256 compared with the
 *     original. A mismatch stops the run immediately rather than carrying on
 *     over a tree it has already damaged.
 *   - It asks git nothing and compares against nothing but the bytes it read at
 *     the start. A phase build's tree is dirty by definition, so "restore to what
 *     git has" would be the wrong target; the right one is "restore to what was
 *     here when this started", and that is what the map holds.
 *
 * ## What a finding means here
 *
 * Three different failures, and they are not the same:
 *
 *   - **the check stayed GREEN** — the rule cannot be made to fail and has
 *     stopped asking;
 *   - **nothing to edit** — the clause moved and its ablation did not move with
 *     it, so this script is asserting over a shape that is gone;
 *   - **the wrong check went red** — the ablation proved something else.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[ablation:p312]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const say = (l) => process.stdout.write(`${TAG} ${l}\n`);
const problems = [];
const sha = (text) => createHash('sha256').update(text).digest('hex');

const SCREEN = 'src/main/activity/screen.ts';
const MONITOR = 'src/main/activity/monitor.ts';
const CONTRACT = 'src/shared/ipc/sessions.ts';
const BLOCK = 'src/renderer/overview/ChoiceBlock.tsx';
const OVERLAY = 'src/renderer/app/AttentionOverlay.tsx';

const TESTS = [
  'src/main/activity/__tests__/p312-choices.test.ts',
  'src/main/activity/__tests__/p312-question.test.ts',
  'src/main/activity/__tests__/monitor.test.ts',
  // PHASE 311's own suite, added when the two phases landed together: the
  // question field is the one thing they both write, and every clause of the
  // precedence lives in that file's section 3.
  'src/main/activity/__tests__/p311-question.test.ts',
  'src/renderer/__tests__/p312-choice.test.ts',
  'src/renderer/overview/__tests__/p312-choices-drawn.test.tsx'
];

/** The checks, by the name an ablation names. */
const CHECKS = {
  choices: {
    what: 'node build/conformance-choices.mjs',
    run: () =>
      spawnSync(process.execPath, [join('build', 'conformance-choices.mjs')], {
        encoding: 'utf8',
        cwd: repoRoot,
        maxBuffer: 64 * 1024 * 1024
      })
  },
  vitest: {
    what: `vitest ${String(TESTS.length)} p312 files`,
    run: () =>
      spawnSync(
        process.execPath,
        [
          join('node_modules', 'vitest', 'vitest.mjs'),
          'run',
          '--no-cache',
          ...TESTS
        ],
        { encoding: 'utf8', cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 }
      )
  }
};

/**
 * ONE ABLATION PER CLAUSE. `check` names the check that MUST go red, and a run
 * that reddens some other check is a finding about the ablation rather than about
 * the rule.
 */
const ABLATIONS = [
  {
    n: 1,
    check: 'choices',
    name: 'THE ENTRY’S OWN ARM: the verdict reads the generalised collector',
    file: SCREEN,
    find:
      '    if (!opt1 && OPT1.test(row)) opt1 = true;\n' +
      '    if (!opt2 && OPT2.test(row)) opt2 = true;',
    to:
      "    const m = OPT_ANY.exec(row)?.[1];\n" +
      "    if (!opt1 && m === '1') opt1 = true;\n" +
      "    if (!opt2 && m === '2') opt2 = true;"
  },
  {
    n: 2,
    check: 'choices',
    name: 'detectDialog computing its own answer, so there are two predicates',
    file: SCREEN,
    find: '  return detectDialogRows(capture).atChoice;',
    to:
      '  const { rows } = dialogWindow(capture);\n' +
      '  return (\n' +
      '    rows.some((r) => OPT1.test(r)) &&\n' +
      '    rows.some((r) => OPT2.test(r)) &&\n' +
      '    rows.some((r) => HINT.test(r) || QUEST.test(r))\n' +
      '  );'
  },
  {
    n: 3,
    check: 'choices',
    name: 'OPT1’s measured literal loosened, which is the floor moving',
    file: SCREEN,
    find: 'const OPT1 = /^[❯›●▶◆*>▸○◇⏵\\s]{0,4}1[.)]\\s+\\S/;',
    to: 'const OPT1 = /^[❯›●▶◆*>▸○◇⏵\\s]{0,4}1[.):]\\s*\\S/;'
  },
  {
    n: 4,
    check: 'choices',
    name: 'an option carried with no redaction at all',
    file: SCREEN,
    find: 'text: clipRow(redactText(o.text), CHOICE_OPTION_MAX_CHARS)',
    to: 'text: clipRow(o.text, CHOICE_OPTION_MAX_CHARS)'
  },
  {
    n: 5,
    check: 'choices',
    name: 'the question clipped BEFORE it is redacted, so a cut halves a secret',
    file: SCREEN,
    find: 'return clipRow(redactText(found), CHOICE_QUESTION_MAX_CHARS);',
    to: 'return redactText(clipRow(found, CHOICE_QUESTION_MAX_CHARS));'
  },
  {
    n: 6,
    check: 'choices',
    name: 'a second call site for the option cap',
    file: SCREEN,
    find: '  let last = -1;\n  for (let i = start; i < rows.length; i++) {',
    to:
      '  let last = -1;\n' +
      '  const secondCap = CHOICE_OPTION_MAX_CHARS;\n' +
      '  void secondCap;\n' +
      '  for (let i = start; i < rows.length; i++) {'
  },
  {
    n: 7,
    check: 'choices',
    name: 'the channel’s choice field made required, so absence is a claim',
    file: CONTRACT,
    find: '  choice?: SessionChoiceInfo;',
    to: '  choice: SessionChoiceInfo;'
  },
  {
    n: 8,
    check: 'choices',
    name: 'the question written straight from the screen, past the composer',
    file: MONITOR,
    find: 'composeQuestion(e.st.question, e.st.screenQuestion)',
    to: 'e.st.screenQuestion'
  },
  {
    n: 9,
    check: 'choices',
    name: 'the block drawn as an ORDERED list, which renumbers the agent’s markers',
    file: BLOCK,
    find: '      <ul className="overview-line-options">',
    to: '      <ol className="overview-line-options">'
  },
  {
    n: 10,
    check: 'vitest',
    name: 'OPT_ANY without the `s` flag, so an option is LOST where the verdict fired',
    file: SCREEN,
    find: "[.)]\\s+(\\S.*)$/s;",
    to: "[.)]\\s+(\\S.*)$/;"
  },
  {
    n: 11,
    check: 'vitest',
    name: 'a three-digit numbered row glued onto the option above it',
    file: SCREEN,
    find: '      !NUMBERED.test(row) &&\n',
    to: ''
  },
  {
    n: 12,
    check: 'vitest',
    name: 'the option block running past a marker that does not increase',
    file: SCREEN,
    find: '      if (n <= last) break;\n',
    to: ''
  },
  {
    n: 13,
    check: 'vitest',
    name: 'choiceStart back to the LAST 1, so a gutter below the gate wins',
    file: SCREEN,
    find: '    if (onlyIncreasingFrom(rows, at)) return at;',
    to: '    return at;'
  },
  {
    n: 14,
    check: 'vitest',
    name: 'the question walk never giving up, so prose becomes a gate’s question',
    file: SCREEN,
    find: '    if (ink > CHOICE_QUESTION_INK_ROWS) break;',
    to: '    if (ink > CHOICE_QUESTION_INK_ROWS * 100) break;'
  },
  {
    n: 15,
    check: 'vitest',
    name: 'a session never at a choice told so once anyway',
    file: MONITOR,
    find:
      '    if (had === undefined && mark === NO_CHOICE_MARK) return null;\n',
    to: ''
  },
  {
    n: 16,
    check: 'choices',
    name: 'the composed question drawn by nothing, which is how a field rots',
    file: OVERLAY,
    // The `?? ''` is Phase 311's own prop default, kept when the two phases were
    // reconciled: the row's `data-question` attribute reads that same '' to decide
    // whether the cell is drawn as a question or as an excerpt.
    find: "                    question={questions[session.id] ?? ''}\n",
    to: ''
  },
  {
    n: 17,
    check: 'vitest',
    name: 'a clear overwriting the choice the same tick found on the screen',
    file: MONITOR,
    // The needle carries the comment above it because `forget` deletes from the
    // same set, four hundred lines higher, with the same indentation — an
    // ablation that edits the wrong occurrence proves nothing and reads green.
    find:
      '    // A state change earlier in this same tick may have queued a clear for a\n' +
      '    // session whose screen is answering right now. The screen wins.\n' +
      '    this.choiceClears.delete(sessionId);\n',
    to: ''
  },
  // -------------------------------------------------------------------------
  // THE RECONCILIATION'S OWN ARMS. Phases 311 and 312 landed together, and the
  // question field is the one thing they both write. These five are the clauses
  // that make it ONE field with ONE decision point, and each was run red before
  // it was written down here.
  // -------------------------------------------------------------------------
  {
    n: 18,
    check: 'choices',
    name: 'the hook argument back to null, so the agent’s own words never win',
    file: MONITOR,
    find: 'composeQuestion(e.st.question, e.st.screenQuestion)',
    to: 'composeQuestion(null, e.st.screenQuestion)'
  },
  {
    n: 19,
    check: 'vitest',
    name: 'the screen’s reading never stamped, so the fourteen agents lose theirs',
    file: MONITOR,
    find: "    e.st.screenQuestion = atChoice ? (rows.question ?? '') : '';\n",
    to: ''
  },
  {
    n: 20,
    check: 'vitest',
    name: 'the screen trusted only on a tick that captured, so the row flickers',
    file: MONITOR,
    find: 'const asked = composeQuestion(e.st.question, e.st.screenQuestion)',
    to:
      'const asked = composeQuestion(\n' +
      '      e.st.question,\n' +
      "      capture === undefined ? '' : e.st.screenQuestion\n" +
      '    )'
  },
  {
    n: 21,
    check: 'vitest',
    name: 'the screen’s half kept past the wait it was read in',
    file: MONITOR,
    find: "      e.st.question = '';\n      e.st.screenQuestion = '';",
    to: "      e.st.question = '';"
  },
  {
    n: 22,
    check: 'vitest',
    name: 'the hook’s sentence kept over a DIFFERENT gate the screen now draws',
    file: MONITOR,
    find:
      '    if (\n' +
      '      mark !== had &&\n' +
      '      mark !== NO_CHOICE_MARK &&\n' +
      '      had !== undefined &&\n' +
      '      had !== NO_CHOICE_MARK\n' +
      '    ) {\n' +
      "      e.st.question = '';\n" +
      '    }\n',
    to: ''
  },
  {
    n: 23,
    check: 'vitest',
    name: 'TWO writers of one field again, the defect the reconciliation removed',
    file: MONITOR,
    find: '      if (choice !== null) {\n        update.choice = choice;',
    to:
      '      if (choice !== null) {\n' +
      '        update.choice = choice;\n' +
      "        if (e.st.screenQuestion !== '') update.question = e.st.screenQuestion;"
  }
];

// ---------------------------------------------------------------------------
// Read every original ONCE, before anything is written
// ---------------------------------------------------------------------------

const targets = [...new Set(ABLATIONS.map((a) => a.file))];
const originals = new Map();
for (const rel of targets) {
  try {
    originals.set(rel, readFileSync(join(repoRoot, rel), 'utf8'));
  } catch (err) {
    process.stderr.write(`${TAG} ${rel} could not be read: ${String(err)}\n`);
    process.exit(2);
  }
}

function restore() {
  for (const [rel, text] of originals) writeFileSync(join(repoRoot, rel), text);
}

// A signal must not leave the tree edited.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    restore();
    process.stderr.write(`${TAG} ${sig}: the tree was put back.\n`);
    process.exit(130);
  });
}

let red = 0;
let ran = 0;

try {
  // THE CONTROL. Every check must be GREEN before anything is broken, or every
  // reading below is about a tree that was already failing.
  const controls = {};
  for (const [key, c] of Object.entries(CHECKS)) {
    const run = c.run();
    controls[key] = run.status === 0;
    say(
      `control: ${c.what} is ` +
        (run.status === 0 ? 'GREEN' : `RED (exit ${String(run.status)})`)
    );
    if (run.status !== 0) {
      problems.push(
        `the control for ${c.what} is RED before any ablation, so every clause ` +
          'it owns means nothing. Its tail:\n' +
          `${`${run.stdout ?? ''}${run.stderr ?? ''}`.split('\n').slice(-14).join('\n')}`
      );
    }
  }

  for (const a of ABLATIONS) {
    const check = CHECKS[a.check];
    if (controls[a.check] !== true) {
      say(`skip  ${String(a.n).padStart(2)}  ${a.name} — its control is red`);
      continue;
    }
    const full = join(repoRoot, a.file);
    const before = originals.get(a.file);

    if (!before.includes(a.find)) {
      problems.push(
        `${String(a.n)} "${a.name}": nothing to edit in ${a.file}. ` +
          'An ablation that cannot be applied proves nothing.'
      );
      continue;
    }

    writeFileSync(full, before.replace(a.find, a.to));
    ran += 1;
    const got = check.run();
    const wentRed = got.status !== 0;
    // The OTHER check, so an ablation that moves the wrong rule is named. Only
    // asked when this one went red, because an ablation that changed nothing has
    // already failed above.
    const alsoRed = [];
    if (wentRed) {
      for (const [key, c] of Object.entries(CHECKS)) {
        if (key === a.check) continue;
        if (controls[key] !== true) continue;
        if (c.run().status !== 0) alsoRed.push(c.what);
      }
    }
    restore();
    if (sha(readFileSync(full, 'utf8')) !== sha(before)) {
      problems.push(
        `${a.file} did NOT come back byte for byte after "${a.name}"; stopping`
      );
      break;
    }

    if (!wentRed) {
      problems.push(
        `${String(a.n)} "${a.name}": ${check.what} stayed GREEN. A rule that ` +
          'cannot be made to fail is a rule that has stopped asking.'
      );
      continue;
    }
    red += 1;
    say(
      `ok    ${String(a.n).padStart(2)}  ${a.name}\n` +
        `              ${check.what} went red` +
        (alsoRed.length > 0
          ? `, and so did ${alsoRed.join(', ')}`
          : ', and the other check did not move')
    );
  }
} finally {
  restore();
  const wrong = [...originals].filter(
    ([rel, text]) => sha(readFileSync(join(repoRoot, rel), 'utf8')) !== sha(text)
  );
  if (wrong.length > 0) {
    process.stderr.write(
      `${TAG} THESE FILES DID NOT COME BACK: ${wrong.map(([r]) => r).join(', ')}\n`
    );
    process.exitCode = 2;
  } else {
    say(
      `every one of the ${String(targets.length)} files came back byte for byte, ` +
        'checked by sha256'
    );
  }
}

if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(problems.length)} finding(s).\n`);
  process.exit(1);
}
say(
  `OK: ${String(red)} of ${String(ABLATIONS.length)} ablations reddened the check ` +
    `that owns them, one clause each, ${String(ran)} applied.`
);
process.exit(0);
