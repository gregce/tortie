#!/usr/bin/env node
/**
 * `npm run ablation:p296`. THE ATTACK ON `conformance:handback`'s menu section
 * (Phase 296).
 *
 * A GREEN GATE IS ONLY EVIDENCE IF IT CAN GO RED, and this phase exists because
 * exactly the opposite happened. Phase 141 wrote the menu section on
 * 2026-08-24. Phase 156 gave every menu row a fourth argument the next day, the
 * needle `lineWith("'end-session')")` stopped matching any line, and for 25 days
 * and 1,156 commits the gate printed "the Session menu no longer holds End
 * Session, the resume row and the per agent hotkeys together" while the menu was
 * right and the READER was broken. Nobody noticed, because a gate outside every
 * battery that has been red since the day after it was written looks exactly
 * like a gate that is working.
 *
 * So the repair is not finished by a green gate. This script breaks ONE CLAUSE
 * AT A TIME of the menu section and proves each one goes RED ON ITS OWN
 * SENTENCE, and then runs the THREE SHAPES THAT TURNED IT RED ON 25 AUGUST and
 * proves each stays GREEN. Those three are the phase's own regression test.
 *
 * ## The clauses, and what each arm breaks
 *
 *   found     The End Session row is found by its ACTION ID and nothing after
 *             it (mechanism 1 and 2). `A1` deletes the row and KEEPS the
 *             comment at `src/main/menu.ts:876`, which is the single most
 *             important arm in this file: `'end-session'` appears in that
 *             comment, so a repair that only dropped the closing parenthesis
 *             from the old needle would find the COMMENT and call it the row.
 *             `A1n` is that repair, built here by removing the probe's own
 *             comment blanking, and it MUST GO GREEN over a menu with no End
 *             Session row in it. `Cx` removes the blanking alone and is RED,
 *             because on the real menu the comment is a SECOND occurrence of the
 *             id. A1 alone red, Cx alone red, the two together green: each is
 *             the other's control, and the green belongs to the blanking rather
 *             than to either edit.
 *   once      The id appears exactly once in code (mechanism 2). `A2`.
 *   order     End Session, then the resume row, then the per agent hotkeys.
 *             `A3` puts End Session below the resume row and `A4` puts the
 *             resume row below the hotkeys.
 *   hotkeys   The per agent hotkeys are found (mechanism 4). `A5`.
 *   accel     The accelerator clause reads the WHOLE `item(` call and not one
 *             line of it (mechanism 3). `A6` reflows the resume row with
 *             `accel(` on a line of its own. THIS ARM IS GREEN TODAY, and that
 *             is the second defect the phase repairs.
 *   table     `placed after End Session` reads NO whenever a row was not found
 *             or is out of order (mechanism 5), so the table and the FAIL can
 *             never disagree again. Every arm declares the reading it expects.
 *
 * ## The three controls, which are the phase's regression test
 *
 *   C1  End Session in its PRE-156 TWO-ARGUMENT shape, `item('End Session…',
 *       'end-session'),`. This is the shape the old needle was written for.
 *   C2  End Session REFLOWED across lines, so the id sits on a line of its own
 *       with no `item(` and no parenthesis near it.
 *   C3  End Session with AN ARGUMENT ADDED AFTER ITS MARK, which is what Phase
 *       156 did and what broke the gate. A fifth argument is text here and is
 *       never typechecked: the point is the SHAPE the reader sees, and the
 *       reader must not care how many arguments follow the id.
 *
 * ## It never writes into the working tree
 *
 * Three builders work in one worktree during a phase, and a harness that writes
 * into `src/` even for the second a gate takes can lose another builder's edit.
 * So it builds a CLONE, the shape of build/p293/ablation.mjs and
 * build/p276/ablation.mjs: `cp -Rc` (APFS clonefile) of `src/` and `build/`
 * under `/private/tmp/p296-ablation-<pid>`, every tsconfig and package.json
 * copied, `docs/audits/contract-baseline.txt` copied because section 1 reads it,
 * `node_modules` symlinked, and every gate run there with that directory as its
 * cwd. Each edited clone file is put back and CHECKED BY SHA256 against the
 * worktree's bytes before the next arm, the clone is removed in a `finally` and
 * on a signal, and the worktree's own bytes are compared at the end. Nothing
 * under the operator's home is touched and `src/main/menu.ts` in the tree is
 * never written.
 *
 * ## It starts nothing
 *
 * No Electron, no tmux, no ssh, no agent, no token and no network. Each gate run
 * spawns one plain `node`, which spawns the pinned `tsx` for the probe. About
 * 10 s for the whole list, measured at 9.5, 9.6 and 10.0 s over 13 gate runs. It
 * runs once per phase beside the gate it attacks and is not in the commit
 * battery.
 *
 * ## The delta rule
 *
 * The base's failures are recorded first and every reading below is a DELTA
 * against them. An arm expecting red must produce a failure the base did not
 * have, which proves the arm CAUSED it rather than inherited it; an arm
 * expecting green must add no failure at all. A red base is reported and fails
 * the run unless `P296_ALLOW_RED_BASE=1` says the operator knows why — and on
 * origin/main before this phase lands, the base IS red, with exactly the one
 * failure this phase is about.
 *
 * Usage:
 *   node build/p296/ablation.mjs
 *   P296_ONLY=A1,A1n,Cx node build/p296/ablation.mjs     named arms only
 *   P296_ALLOW_RED_BASE=1 node build/p296/ablation.mjs
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p296-ablation]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);

const MENU = 'src/main/menu.ts';
const PROBE = 'build/handback-conformance-probe.mts';
const GATE = 'build/conformance-handback.mjs';

// ---------------------------------------------------------------------------
// The four shapes in src/main/menu.ts every arm is written against. The phase
// EDITS NO MENU, so these are the tree's own bytes and an arm that cannot find
// its anchor is reported rather than skipped.
// ---------------------------------------------------------------------------

const END_ROW = "        item('End Session\u2026', 'end-session', undefined, 'close'),\n";
const RESUME_ROW =
  "        item('Resume Conversation', 'resume-conversation', undefined, 'terminal'),\n";
const HOTKEYS = '        ...agentHotkeyItems(),\n';
/**
 * The comment that makes A1 the arm that matters. It sits between where the End
 * Session row is and the resume row, and it holds the action id in prose.
 */
const COMMENT_876 = "'end-session' already does for a session that has exited.";

/** End Session reflowed across lines: the id alone on a line, no parenthesis after it. */
const END_ROW_REFLOWED =
  '        item(\n' +
  "          'End Session\u2026',\n" +
  "          'end-session',\n" +
  '          undefined,\n' +
  "          'close'\n" +
  '        ),\n';

/** The resume row reflowed with `accel(` on a line of its own (mechanism 3). */
const RESUME_ROW_ACCEL =
  '        item(\n' +
  "          'Resume Conversation',\n" +
  "          'resume-conversation',\n" +
  "          accel('session.aim'),\n" +
  "          'terminal'\n" +
  '        ),\n';

// ---------------------------------------------------------------------------
// The arms. `clause` is the clause of the menu section the arm breaks.
// `expect` is 'red' or 'green'. `sentence` is the list of patterns that must ALL
// match ONE newly-red failure, and `notSentence` the patterns that must not,
// because two clauses may both name the action id. `placedAfter` is the reading
// the table must give for `placed after End Session` (mechanism 5).
// ---------------------------------------------------------------------------

const ARMS = [
  {
    n: 'A1',
    clause: 'found',
    expect: 'red',
    name: 'the End Session row DELETED with the :876 comment KEPT',
    why:
      'THE ARM THAT MATTERS. The comment at src/main/menu.ts:876 holds the string ' +
      "'end-session' in prose, so a reader that searched the raw file would find the " +
      'COMMENT where the row used to be, in the right place and in the right order, ' +
      'and pass. A repair that only dropped the closing parenthesis from the old ' +
      'needle builds a clause that cannot fail. A1n below is that repair, and it is ' +
      'green.',
    edits: [{ file: MENU, from: END_ROW, to: '' }],
    requireInClone: [{ file: MENU, text: COMMENT_876 }],
    sentence: [
      /End Session row/i,
      /(has no line|did not find|not found|could not find|no line for|nowhere)/i
    ],
    notSentence: [/appears \d+ times/i],
    placedAfter: 'NO'
  },
  {
    n: 'A1n',
    clause: 'found',
    expect: 'green',
    name: "A1 again with the probe's comment blanking REMOVED: the naive needle",
    why:
      'This is the whole reason mechanism 1 blanks comments before it searches. With ' +
      'the blanking gone the id-only needle finds the :876 comment, alone and in the ' +
      'right place, and the gate passes over a Session menu with NO End Session row in ' +
      'it. A1 alone is red and Cx alone is red, and only the two TOGETHER are green, so ' +
      'this green is the blanking’s and neither edit’s. An arm that went red here ' +
      'would mean the blanking could be deleted by a later round with this gate still ' +
      'green.',
    edits: [{ file: MENU, from: END_ROW, to: '' }],
    unstripProbe: true
  },
  {
    n: 'Cx',
    clause: 'found',
    expect: 'red',
    name: "the probe's comment blanking removed ALONE, the menu untouched",
    why:
      'THE OTHER HALF OF A1n, and together the two are each other’s control. On the ' +
      'REAL menu the id appears once in code and once in the :876 comment, so with the ' +
      'blanking gone the count is two, there are two candidate rows and the gate can ' +
      'say nothing about placement. A1 alone is red and this is red, and only the two ' +
      'TOGETHER are green, which is what makes A1n’s green attributable to the ' +
      'blanking rather than to either edit.',
    edits: [],
    unstripProbe: true,
    sentence: [/End Session action id appears/i],
    placedAfter: 'NO'
  },
  {
    n: 'A2',
    clause: 'once',
    expect: 'red',
    name: "'end-session' appearing TWICE in code",
    why:
      'the id must appear exactly once, as the resume row already requires of its own. ' +
      'Two rows for one verb are two answers to one press, and the first match must ' +
      'never win by default, because a reader that takes the first match cannot tell ' +
      'a duplicated row from a moved one.',
    edits: [{ file: MENU, from: END_ROW, to: END_ROW + END_ROW }],
    sentence: [/End Session action id appears/i, /\b2\b/],
    notSentence: [/(has no line|did not find)/i],
    placedAfter: 'NO'
  },
  {
    n: 'A3',
    clause: 'order',
    expect: 'red',
    name: 'End Session moved BELOW the resume row',
    why:
      'Phase 141 put the resume row immediately after End Session because the two verbs ' +
      'act on the live session in front of the person and are read together. A resume ' +
      'row above End Session is a different menu.',
    edits: [
      { file: MENU, from: END_ROW, to: '' },
      { file: MENU, from: RESUME_ROW, to: RESUME_ROW + END_ROW }
    ],
    sentence: [/belongs immediately after End Session/i, /sits at line/i],
    placedAfter: 'NO'
  },
  {
    n: 'A4',
    clause: 'order',
    expect: 'red',
    name: 'the resume row moved BELOW the per agent hotkeys',
    why:
      'the per agent hotkey rows are rebuilt on every hotkey change and there may be ' +
      'none of them; a row after them moves under the person as they assign shortcuts. ' +
      'This is the one arm of the order clause that was still working on 25 August, ' +
      'because it needs all three rows FOUND to fail.',
    edits: [
      { file: MENU, from: RESUME_ROW, to: '' },
      { file: MENU, from: HOTKEYS, to: HOTKEYS + RESUME_ROW }
    ],
    sentence: [/belongs immediately after End Session/i, /sits at line/i],
    placedAfter: 'NO'
  },
  {
    n: 'A5',
    clause: 'hotkeys',
    expect: 'red',
    name: '...agentHotkeyItems() DELETED',
    why:
      'the hotkey rows are the lower bound of the resume row\u2019s place. With them gone ' +
      'there is nothing below the row to place it against, and the gate must say it did ' +
      'not find them rather than blame the menu for holding the wrong rows.',
    edits: [{ file: MENU, from: HOTKEYS, to: '' }],
    sentence: [
      /per agent hotkeys/i,
      /(has no line|did not find|not found|could not find|no line for|nowhere)/i
    ],
    placedAfter: 'NO'
  },
  {
    n: 'A6',
    clause: 'accel',
    expect: 'red',
    name: "the resume row REFLOWED with accel( on its own line",
    why:
      'THE SECOND DEFECT THIS PHASE REPAIRS, and this arm is GREEN TODAY. The row is ' +
      'unaccelerated on purpose, for the reason End Session beside it is: it types into ' +
      'the live session the person is looking at. The old reader read the ONE LINE the ' +
      'id sits on, so an accelerator on any other line of the same call was invisible ' +
      'to it, and the table read "accelerated NO" over an accelerated row.',
    edits: [{ file: MENU, from: RESUME_ROW, to: RESUME_ROW_ACCEL }],
    sentence: [/carries an accelerator/i],
    placedAfter: 'yes'
  },
  {
    n: 'C1',
    clause: 'control',
    expect: 'green',
    name: "End Session in its PRE-156 TWO-ARGUMENT shape",
    why:
      'THE SHAPE THE OLD NEEDLE WAS WRITTEN FOR. The row carried no mark until Phase ' +
      '156, and the gate must read the row by its action and never by what follows it, ' +
      'so the oldest spelling still answers.',
    edits: [{ file: MENU, from: END_ROW, to: "        item('End Session\u2026', 'end-session'),\n" }]
  },
  {
    n: 'C2',
    clause: 'control',
    expect: 'green',
    name: 'End Session REFLOWED across lines',
    why:
      'a formatter can put the id on a line of its own with no `item(` and no ' +
      'parenthesis anywhere near it. Nothing a person sees changes, so nothing the gate ' +
      'says may change either.',
    edits: [{ file: MENU, from: END_ROW, to: END_ROW_REFLOWED }]
  },
  {
    n: 'C3',
    clause: 'control',
    expect: 'green',
    name: 'End Session with AN ARGUMENT ADDED AFTER ITS MARK',
    why:
      'THIS IS WHAT PHASE 156 DID. It added a fourth argument and the gate went red for ' +
      '25 days. A fifth must not do it again, whatever a later round wants to hang on ' +
      'the end of a menu row.',
    edits: [
      {
        file: MENU,
        from: END_ROW,
        to: "        item('End Session\u2026', 'end-session', undefined, 'close', true),\n"
      }
    ]
  }
];

// ---------------------------------------------------------------------------
// The clone, and the gate run inside it
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join('/private/tmp', `p296-ablation-${String(process.pid)}-`));
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

function buildClone() {
  for (const name of ['src', 'build']) {
    const r = spawnSync('cp', ['-Rc', join(REPO, name), join(scratch, name)], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`cp -Rc ${name} failed: ${r.stderr}`);
  }
  // EVERY tsconfig: tsx resolves project references out of tsconfig.json, and a
  // clone holding one alone dies on a missing sibling (ablation:p275's lesson).
  for (const name of [
    'package.json',
    ...readdirSync(REPO).filter((f) => /^tsconfig(\.[a-z]+)?\.json$/.test(f))
  ]) {
    writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
  }
  // Section 1 reads the resolved channel map out of the contract baseline. One
  // file, not the whole of docs/.
  mkdirSync(join(scratch, 'docs/audits'), { recursive: true });
  copyFileSync(
    join(REPO, 'docs/audits/contract-baseline.txt'),
    join(scratch, 'docs/audits/contract-baseline.txt')
  );
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
}

/**
 * One gate run inside the clone. It answers the exit code, every FAIL entry as
 * one flattened string, and the table's own `placed after End Session` reading.
 */
function runGate() {
  const r = spawnSync(process.execPath, [join(scratch, GATE)], {
    cwd: scratch,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120_000
  });
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  // The checker writes `FAIL, N:` and then one `  - ` entry per failure, and a
  // failure may wrap over the lines under it. So an entry runs from its `  - `
  // to the next one, flattened, which makes a stable key for the delta.
  const failures = [];
  let inBlock = false;
  for (const line of text.split('\n')) {
    if (/^FAIL, \d+:/.test(line)) {
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;
    if (/^\s*-\s/.test(line)) failures.push(line.trim().replace(/^-\s*/, ''));
    else if (failures.length > 0 && line.trim() !== '') {
      failures[failures.length - 1] += ` ${line.trim()}`;
    }
  }
  const placed = /placed after End Session\s+(yes|NO)/.exec(text);
  return {
    code: r.status ?? 1,
    failures: failures.map((f) => f.replace(/\s+/g, ' ').trim()),
    placed: placed === null ? 'unreadable' : placed[1],
    text
  };
}

/** Put one clone file back and prove it by sha256 against the worktree. */
function restore(rel) {
  const want = readFileSync(join(REPO, rel));
  writeFileSync(join(scratch, rel), want);
  const got = readFileSync(join(scratch, rel));
  if (sha(got) !== sha(want)) {
    throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
  }
}

/** One exact replacement inside the clone; a function replacer, so `$&` stays literal. */
function ablate(rel, from, to) {
  const path = join(scratch, rel);
  const text = readFileSync(path, 'utf8');
  if (!text.includes(from)) return false;
  writeFileSync(path, text.replace(from, () => to), 'utf8');
  return true;
}

/**
 * Remove the probe's comment blanking, whatever it is called and whichever of
 * the two shapes it takes, so the menu needles search the RAW file the way the
 * needle Phase 296 replaced did.
 *
 * It is written by DISCOVERY rather than against a literal, because the blanking
 * is another builder's line and its name is not this file's business. Two
 * shapes:
 *   A  `const menuText = stripProse(readText('src/main/menu.ts'));`
 *   B  `const menuSource = readText('src/main/menu.ts');`
 *      `const menuText = stripProse(menuSource);`
 * Answers the description of what it removed, or null when it found nothing to
 * remove — which is itself a finding, because mechanism 1 says the blanking is
 * there.
 */
function unstripProbe() {
  const path = join(scratch, PROBE);
  const before = readFileSync(path, 'utf8');
  const READ = `readText('${MENU}')`;
  const at = before.indexOf(READ);
  if (at === -1) return null;

  // Shape A: the read is wrapped on its own statement. Cut the RHS back to the
  // bare read.
  const lineStart = before.lastIndexOf('\n', at) + 1;
  const lineEnd = before.indexOf('\n', at);
  const line = before.slice(lineStart, lineEnd === -1 ? before.length : lineEnd);
  const assign = /^(\s*(?:const|let|var)\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*)(.*)$/.exec(line);
  if (assign === null) return null;
  const [, head, variable, rhs] = assign;
  if (rhs.trim() !== `${READ};`) {
    const rebuilt = `${head}${READ};`;
    writeFileSync(
      path,
      before.slice(0, lineStart) + rebuilt + before.slice(lineStart + line.length),
      'utf8'
    );
    return `the wrapping call removed from ${variable} (${rhs.trim().slice(0, 80)})`;
  }

  // Shape B: a later statement blanks the variable the read produced. Any call
  // whose name says what it does, handed that variable and nothing else.
  const rest = before.slice(lineEnd === -1 ? before.length : lineEnd);
  const second = new RegExp(
    `((?:const|let|var)\\s+\\w+(?:\\s*:\\s*[^=]+)?\\s*=\\s*)((?:\\w+\\.)?\\w*(?:strip|blank|comment|prose|code|without)\\w*)\\(\\s*${variable}\\s*\\)`,
    'i'
  ).exec(rest);
  if (second === null) return null;
  const replaced = rest.replace(second[0], () => `${second[1]}${variable}`);
  writeFileSync(
    path,
    before.slice(0, lineEnd === -1 ? before.length : lineEnd) + replaced,
    'utf8'
  );
  return `${second[2]}(${variable}) replaced by ${variable}`;
}

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

// The worktree's bytes for every file an arm touches, read before anything runs,
// so the report can say the worktree was never written.
const touchedFiles = [...new Set([MENU, PROBE, ...ARMS.flatMap((a) => a.edits.map((e) => e.file))])];
const worktreeBefore = new Map(touchedFiles.map((f) => [f, sha(readFileSync(join(REPO, f)))]));

const problems = [];
const table = [];
let ran = 0;
const started = Date.now();

try {
  buildClone();
  say(`clone at ${scratch}, node_modules symlinked, nothing under a home touched`);

  const base = runGate();
  const baseFailures = new Set(base.failures);
  if (base.code === 0) {
    say(`base: the gate is GREEN, and the table reads placed after End Session ${base.placed}`);
  } else {
    say(`base: THE GATE IS ALREADY RED, ${String(base.failures.length)} failure(s)`);
    for (const f of base.failures) say(`  base failure: ${f.slice(0, 200)}`);
    if (process.env['P296_ALLOW_RED_BASE'] !== '1') {
      problems.push(
        'the gate was RED before any arm ran. Every reading below is still a DELTA ' +
          'against that base, but on origin/main before this phase lands the base holds ' +
          'exactly the failure the phase is about, so re-run with P296_ALLOW_RED_BASE=1 ' +
          'once you know why.'
      );
    }
  }

  const only = (process.env['P296_ONLY'] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');

  for (const arm of ARMS) {
    if (only.length > 0 && !only.includes(arm.n)) continue;
    const files = [...new Set(arm.edits.map((e) => e.file))];
    let unstripped = null;
    let shapeMissing = false;

    const missed = arm.edits.filter((e) => !ablate(e.file, e.from, e.to));
    for (const m of missed) {
      shapeMissing = true;
      problems.push(
        `${arm.n} "${arm.name}": the shape to ablate is not in ${m.file}. This phase ` +
          'EDITS NO MENU, so either the menu moved in a later round and this arm moves ' +
          `with it in the same commit, or the clause is unproven. It looked for: ${JSON.stringify(m.from).slice(0, 160)}`
      );
    }
    if (!shapeMissing && arm.unstripProbe === true) {
      unstripped = unstripProbe();
      if (unstripped === null) {
        shapeMissing = true;
        problems.push(
          `${arm.n} "${arm.name}": the probe's comment blanking could not be found in ` +
            `${PROBE}, so the naive needle was never built and mechanism 1 is unproven. ` +
            'Either the blanking is not there, which is the defect this phase repairs, or ' +
            'it is spelled in a third shape this discovery does not know.'
        );
      }
    }
    for (const r of arm.requireInClone ?? []) {
      if (!readFileSync(join(scratch, r.file), 'utf8').includes(r.text)) {
        shapeMissing = true;
        problems.push(
          `${arm.n} "${arm.name}": ${r.file} no longer holds ${JSON.stringify(r.text).slice(0, 120)}, ` +
            'which this arm needs PRESENT to mean anything.'
        );
      }
    }

    if (shapeMissing) {
      for (const f of [...files, ...(arm.unstripProbe === true ? [PROBE] : [])]) restore(f);
      table.push([arm.n, arm.clause, arm.expect, 'SHAPE MISSING', '', '']);
      continue;
    }

    ran += 1;
    const out = runGate();
    const newly = out.failures.filter((f) => !baseFailures.has(f));
    const placedOk = arm.placedAfter === undefined || out.placed === arm.placedAfter;
    let verdict;

    if (arm.expect === 'green') {
      verdict = newly.length === 0 && out.code === base.code ? 'green' : 'RED';
      if (verdict !== 'green') {
        problems.push(
          `${arm.n} "${arm.name}": the gate went RED on a shape that changes nothing a ` +
            `person sees. ${arm.why} Newly red: ${newly.map((f) => f.slice(0, 200)).join(' // ') || `exit ${String(out.code)} with no new failure`}`
        );
      }
    } else {
      const matched = newly.filter(
        (f) =>
          arm.sentence.every((re) => re.test(f)) &&
          (arm.notSentence ?? []).every((re) => !re.test(f))
      );
      if (out.code === 0) {
        verdict = 'GREEN';
        problems.push(
          `${arm.n} "${arm.name}": the gate stayed GREEN. ${arm.why} Nothing in the gate ` +
            `notices, so the ${arm.clause} clause is decoration.`
        );
      } else if (matched.length === 0) {
        verdict = 'RED ELSEWHERE';
        problems.push(
          `${arm.n} "${arm.name}": the gate went red but not on the ${arm.clause} clause's ` +
            `own sentence. It looked for ${arm.sentence.map(String).join(' and ')}` +
            `${(arm.notSentence ?? []).length > 0 ? ` without ${arm.notSentence.map(String).join(' or ')}` : ''}. ` +
            `Newly red instead: ${newly.map((f) => f.slice(0, 200)).join(' // ') || 'nothing new'}`
        );
      } else {
        verdict = 'red';
      }
      if (!placedOk) {
        problems.push(
          `${arm.n} "${arm.name}": the table reads "placed after End Session ${out.placed}" ` +
            `where the ${arm.clause} clause makes it ${arm.placedAfter}. Mechanism 5 is that ` +
            'the table asks the verdict\u2019s own question, so a table that disagrees with the ' +
            'FAIL beside it is the 25 August defect in the other direction.'
        );
      }
    }

    table.push([
      arm.n,
      arm.clause,
      arm.expect,
      verdict,
      `placed ${out.placed}${placedOk ? '' : ` (wanted ${arm.placedAfter})`}`,
      newly.length === 0 ? '' : newly[0].slice(0, 110)
    ]);
    say(
      `${arm.n.padEnd(4)} ${arm.clause.padEnd(8)} ${arm.name}: exit ${String(out.code)}, ` +
        `${String(newly.length)} newly red, placed ${out.placed}` +
        `${unstripped === null ? '' : `, probe: ${unstripped}`}`
    );
    if (newly.length > 0) say(`     ${newly[0].slice(0, 220)}`);

    for (const f of [...files, ...(arm.unstripProbe === true ? [PROBE] : [])]) restore(f);
  }

  const after = runGate();
  if (after.code !== base.code || after.failures.length !== base.failures.length) {
    problems.push(
      `after every file was restored the gate exited ${String(after.code)} with ` +
        `${String(after.failures.length)} failure(s) where the base exited ${String(base.code)} ` +
        `with ${String(base.failures.length)}, so a restore did not land.`
    );
  } else {
    say(
      'restored: every touched clone file matches the worktree by sha256, and the gate is ' +
        `back where it started (exit ${String(after.code)})`
    );
  }
} catch (err) {
  problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  clean();
}

// The worktree was never written: every file an arm names has the bytes it had.
for (const [file, before] of worktreeBefore) {
  const now = sha(readFileSync(join(REPO, file)));
  if (now !== before) {
    problems.push(
      `${file} in the WORKTREE changed during the run (${before.slice(0, 12)} to ` +
        `${now.slice(0, 12)}); this harness writes only its clone, so another process wrote it`
    );
  }
}
say(`the worktree's own ${String(worktreeBefore.size)} files are byte for byte what they were, by sha256`);

process.stdout.write('\n');
process.stdout.write(
  `${TAG}   ${'arm'.padEnd(5)} ${'clause'.padEnd(9)} ${'want'.padEnd(6)} ${'got'.padEnd(14)} ${'table'.padEnd(26)} first newly red\n`
);
for (const [n, clause, want, verdict, placed, first] of table) {
  process.stdout.write(
    `${TAG}   ${n.padEnd(5)} ${clause.padEnd(9)} ${want.padEnd(6)} ${verdict.padEnd(14)} ${placed.padEnd(26)} ${first}\n`
  );
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (problems.length > 0) {
  process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  process.exit(1);
}
// The names are read out of the table rather than told as a story, so a run
// under P296_ONLY cannot claim an arm that did not run.
const reds = table.filter((r) => r[3] === 'red').map((r) => r[0]);
const greens = table.filter((r) => r[3] === 'green').map((r) => r[0]);
process.stdout.write(
  `\n${TAG} PASS in ${seconds} s. ${String(ran)} arms. ${String(reds.length)} broke one clause ` +
    `each and went red ON THAT CLAUSE\u2019S OWN SENTENCE, measured as a DELTA against the base ` +
    `(${reds.join(', ') || 'none'}), and ${String(greens.length)} went green ` +
    `(${greens.join(', ') || 'none'}), which is where a green is the point: the shapes that ` +
    'turned this gate red on 25 August change nothing a person sees, and A1n is the naive ' +
    'needle finding the comment where the row used to be, which is the hole the comment ' +
    'blanking closes. Every clone file was restored and proved by sha256, src/main/menu.ts in ' +
    'the worktree was never written, and the clone is gone. No Electron, no tmux, no ssh, no ' +
    'agent, no token.\n'
);
