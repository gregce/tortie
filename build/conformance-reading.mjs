#!/usr/bin/env node
/**
 * `npm run conformance:reading`. The cheap gate on the reading partition and
 * the sentence (Phase 201, research 77 sections 4 and 10).
 *
 * WHAT IT IS FOR. Every part of the map says what it is, from the code alone,
 * and the claim is that the sentence is true on any repository. Research 77
 * measured it at nine useful in ten over gmux, rookery and ripgrep. That
 * fraction decays the day a clause moves, and a clause moves silently: a
 * threshold nudged, a plural dropped, a partner order flipped. So this gate
 * runs the SHIPPING partition, facts and composer under node over three
 * committed fixtures, a gmux shaped tree, a Cargo workspace with a member
 * declared inside a member, and a multi
 * client tree with Swift and Kotlin targets, plus two trees the probe builds
 * itself to reach P3's floor and P4's cap, and pins the box set and every
 * sentence byte for byte against build/fixtures/reading/expected.json.
 *
 * IT SPAWNS ONE PLAIN NODE and nothing else. No git, no Electron, no tmux, no
 * agent, no request, and it reads nothing under the person's home. The
 * fixtures are data; the one file system write is the ablated copies under a
 * temp directory it removes in a finally block. That is why it is `pure` in
 * build/verification-checks.mjs.
 *
 * WHAT IT FAILS ON.
 *
 *  1. A box set moves: an id, a label, a file count or a band, on any of the
 *     five trees.
 *  2. A sentence moves by one byte: rule R on each tree and rule S on every
 *     box, with the word count beside it.
 *  3. The ten hover facts move, or their order does, or the languages, lines
 *     and entries fields behind them.
 *  4. The rollup moves: an edge appears, vanishes or changes weight, which is
 *     P6's edge on the clients tree included.
 *  5. The composer stops being pure: composed from reversed facts it must give
 *     the same bytes.
 *  6. The drill moves: the part's label, its modules with their sentences, or
 *     the frame's crossings with the outside labels, on three parts.
 *  7. The declared name reader moves on seven manifest texts.
 *  8. THE PINS CANNOT FAIL. The same probe is run over an ablated copy of the
 *     shipping modules once per clause, being P1 through P6, the floor, rules
 *     L, N, M, W, E and R, the hover and the declared name, and every copy
 *     must turn at least one pin red. A pin that passes under ablation is a
 *     pin that proves nothing, and the gate names the clause.
 *  9. The two pure modules reach for a file, a process or electron.
 * 10. package.json or build/verification-checks.mjs stops naming this gate.
 */

import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:reading]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (message) => failures.push(message);
const say = (line) => process.stdout.write(`${line}\n`);

const TREES = ['gmux', 'cargo', 'clients', 'tiny', 'cap'];

// ---------------------------------------------------------------------------
// The ablations, one per clause. Each edit must find its text, or the copy
// is the shipping tree and the gate would be proving the wrong thing.
// ---------------------------------------------------------------------------

const ABLATIONS = [
  { name: 'P1, the seeds', file: 'skeleton.ts', from: 'if (seeds.length >= 2) {', to: 'if (seeds.length >= 999) {' },
  { name: 'P1, a nested seed placed once', file: 'skeleton.ts', from: '(p) => !placed.has(p) && ', to: '(p) => ' },
  { name: 'P2, the split', file: 'skeleton.ts', from: 'if (parsed * 2 <= totalParsed) continue;', to: 'if (parsed * 2 <= totalParsed * 1000) continue;' },
  { name: 'P3, the fold of a box with no source', file: 'skeleton.ts', from: 'if (parsed === 0) return box.files.length < smallLimit;', to: 'if (parsed === 0) return false;' },
  { name: 'P3, the fold of a box with fewer than three parsed files', file: 'skeleton.ts', from: 'return keepSource ? false : parsed < 3;', to: 'return false;' },
  { name: 'P3, the floor', file: 'skeleton.ts', from: 'const keepSource = survivors < SKELETON_TARGET.min;', to: 'const keepSource = false;' },
  { name: 'P4, the cap', file: 'skeleton.ts', from: 'if (!overCap()) break;', to: 'break;' },
  { name: 'P5, the label', file: 'skeleton.ts', from: "if (common !== '' && common !== box.dir && common.startsWith(box.dir)) {", to: 'if (common === null) {' },
  { name: 'P6, the owner fallback', file: 'skeleton.ts', from: 'const hit = dirs.find((g) => path === g.dir || path.startsWith(`${g.dir}/`));', to: 'const hit = undefined;' },
  { name: 'rule L, the language', file: 'sentence.ts', from: 'if (share >= 0.95) return lead.name;', to: 'if (share >= 0) return lead.name;' },
  { name: 'rule N, the declared name in brackets', file: 'sentence.ts', from: 'return `${dir} (${root.name})`;', to: 'return dir;' },
  { name: 'rule M, made of', file: 'sentence.ts', from: 'const named = kids.slice(0, 5).map((c) => bareName(c[0]));', to: 'const named = kids.slice(0, 2).map((c) => bareName(c[0]));' },
  { name: 'rule W, the wiring', file: 'sentence.ts', from: 'const outs = qOut.slice(0, 2).map((p) => name(p.id));', to: 'const outs = qOut.slice(0, 1).map((p) => name(p.id));' },
  { name: 'rule E, the entry', file: 'sentence.ts', from: "return e === undefined ? '' : `entry ${e}`;", to: "return '';" },
  { name: 'rule R, the repository line', file: 'sentence.ts', from: "`${plural(boxes.length, 'part')}${biggest}; `", to: "`${plural(boxes.length + 1, 'part')}${biggest}; `" },
  { name: 'the hover, its size line', file: 'sentence.ts', from: "`Size: ${plural(box.files, 'file')}, ${plural(box.lines, 'line')}`,", to: "`Size: ${plural(box.files, 'file')}`," },
  { name: 'the definitions on the hover', file: 'reading.ts', from: 'kinds.set(kind, (kinds.get(kind) ?? 0) + c);', to: 'kinds.set(kind, 0);' },
  { name: 'the declared name reader', file: 'tree-facts.ts', from: "name = typeof parsed.name === 'string' ? parsed.name : null;", to: 'name = null;' }
];

/**
 * A copy of src/main/arch and the one module outside it the map reads,
 * being src/main/symbols/languages.ts, under `<root>/main`, with `edit`
 * applied to one file. `@shared/*` resolves through tsconfig.node.json to the
 * real tree either way, which is what keeps the copy small.
 */
function ablatedCopy(root, edit) {
  mkdirSync(join(root, 'main', 'symbols'), { recursive: true });
  cpSync(join(repoRoot, 'src', 'main', 'arch'), join(root, 'main', 'arch'), {
    recursive: true,
    filter: (source) => !source.includes('__tests__')
  });
  cpSync(join(repoRoot, 'src', 'main', 'symbols', 'languages.ts'), join(root, 'main', 'symbols', 'languages.ts'));
  const target = join(root, 'main', 'arch', edit.file);
  const before = readFileSync(target, 'utf8');
  if (!before.includes(edit.from)) {
    throw new Error(`ablation "${edit.name}" found nothing to edit in ${edit.file}`);
  }
  writeFileSync(target, before.replace(edit.from, edit.to));
  return root;
}

function runProbe(roots) {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/reading-conformance-probe.mts', JSON.stringify({ roots })],
    { encoding: 'utf8', cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 }
  );
  if (probe.status !== 0) {
    throw new Error(`the probe did not run: ${probe.stderr || '(no output)'}`);
  }
  const line = probe.stdout.trim().split('\n').pop() ?? '';
  return JSON.parse(line);
}

// ---------------------------------------------------------------------------
// The pins: rules 1 to 7 over one composed answer, as a list of problems.
// ---------------------------------------------------------------------------

const expected = JSON.parse(readFileSync(join(repoRoot, 'build', 'fixtures', 'reading', 'expected.json'), 'utf8'));

function pin(got) {
  const problems = [];
  if (got === undefined || 'error' in got) {
    return [`the probe answered ${got === undefined ? 'nothing' : got.error}`];
  }
  for (const tree of TREES) {
    const want = expected[tree];
    const have = got[tree];
    if (have === undefined) {
      problems.push(`${tree}: not composed`);
      continue;
    }
    const wantIds = want.boxes.map((b) => `${b.id}:${b.label}:${b.fileCount}:${b.band}`);
    const haveIds = have.boxes.map((b) => `${b.id}:${b.label}:${b.fileCount}:${b.band}`);
    if (JSON.stringify(wantIds) !== JSON.stringify(haveIds)) {
      problems.push(`${tree}: rule 1, the box set reads [${haveIds.join(', ')}] and the fixture pins [${wantIds.join(', ')}]`);
    }
    if (have.sentence !== want.sentence) {
      problems.push(`${tree}: rule 2, rule R reads "${have.sentence}" and the fixture pins "${want.sentence}"`);
    }
    if (have.words !== want.words) {
      problems.push(`${tree}: rule 2, rule R carries ${String(have.words)} words and the fixture pins ${String(want.words)}`);
    }
    for (const wantBox of want.boxes) {
      const haveBox = have.boxes.find((b) => b.id === wantBox.id);
      if (haveBox === undefined) continue;
      if (haveBox.sentence !== wantBox.sentence) {
        problems.push(`${tree}/${wantBox.id}: rule 2, the sentence reads "${haveBox.sentence}" and the fixture pins "${wantBox.sentence}"`);
      }
      if (haveBox.words !== wantBox.words) {
        problems.push(`${tree}/${wantBox.id}: rule 2, ${String(haveBox.words)} words against ${String(wantBox.words)} pinned`);
      }
      if (JSON.stringify(haveBox.facts) !== JSON.stringify(wantBox.facts)) {
        problems.push(`${tree}/${wantBox.id}: rule 3, the hover facts read [${haveBox.facts.join(' | ')}] and the fixture pins [${wantBox.facts.join(' | ')}]`);
      }
      for (const field of ['languages', 'lines', 'entries']) {
        if (JSON.stringify(haveBox[field]) !== JSON.stringify(wantBox[field])) {
          problems.push(`${tree}/${wantBox.id}: rule 3, ${field} reads ${JSON.stringify(haveBox[field])} and the fixture pins ${JSON.stringify(wantBox[field])}`);
        }
      }
    }
    if (JSON.stringify(have.edges) !== JSON.stringify(want.edges)) {
      problems.push(`${tree}: rule 4, the edges read [${have.edges.join(', ')}] and the fixture pins [${want.edges.join(', ')}]`);
    }
    if (have.repeatable !== true) {
      problems.push(`${tree}: rule 5, composed from reversed facts the bytes moved`);
    }
    if (JSON.stringify(have.drill) !== JSON.stringify(want.drill)) {
      problems.push(`${tree}: rule 6, the drill reads ${JSON.stringify(have.drill)} and the fixture pins ${JSON.stringify(want.drill)}`);
    }
  }
  if (JSON.stringify(got.declared) !== JSON.stringify(expected.declared)) {
    problems.push(`rule 7, the declared names read [${(got.declared ?? []).join(', ')}] and the fixture pins [${expected.declared.join(', ')}]`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join(tmpdir(), 'gmux-p201-conformance-'));
try {
  const roots = [{ name: 'shipping', root: join(repoRoot, 'src') }];
  for (const [i, edit] of ABLATIONS.entries()) {
    roots.push({ name: `ablation-${String(i)}`, root: ablatedCopy(join(scratch, `ablation-${String(i)}`), edit) });
  }
  const started = Date.now();
  const answers = runProbe(roots);
  say(`${TAG} composed ${String(roots.length)} module trees over ${String(TREES.length)} fixtures in ${String(Date.now() - started)} ms`);

  // Rules 1 to 7 over the shipping tree.
  const shipping = answers.shipping;
  const problems = pin(shipping);
  for (const p of problems) fail(p);
  if (problems.length === 0) {
    for (const tree of TREES) {
      const c = shipping[tree];
      const words = c.boxes.map((b) => b.words);
      say(
        `${TAG} ${tree}: ${String(c.boxes.length)} boxes, ${String(c.edges.length)} edges, ` +
          `rule R ${String(c.words)} words, rule S ${String(Math.min(...words))} to ${String(Math.max(...words))} words, ` +
          `byte for byte`
      );
    }
  }
  // The research's own numbers, kept as a floor on the three real shaped
  // trees: the repository line 19 to 25 words without its subject, and no
  // box's sentence past 31.
  for (const tree of ['gmux', 'cargo', 'clients']) {
    const c = shipping[tree];
    if (c === undefined) continue;
    if (c.words < 19 || c.words > 25) fail(`${tree}: rule R carries ${String(c.words)} words, outside 19 to 25`);
    for (const b of c.boxes) {
      if (b.words > 31) fail(`${tree}/${b.id}: the sentence carries ${String(b.words)} words, past the cap of 31`);
    }
  }

  // Rule 8. A copy that did not run is not a red pin, it is a gate that
  // proved nothing, so it fails by name.
  for (const [i, edit] of ABLATIONS.entries()) {
    const answer = answers[`ablation-${String(i)}`];
    if (answer === undefined || 'error' in answer) {
      fail(`rule 8: with ${edit.name} ablated, the copy did not run: ${answer?.error ?? 'no answer'}`);
      continue;
    }
    const red = pin(answer);
    if (red.length === 0) {
      fail(`rule 8: with ${edit.name} ablated, every pin still passed, so the pins cannot fail`);
    } else {
      say(`${TAG} rule 8: with ${edit.name} ablated, ${String(red.length)} pin(s) went red, the first being: ${red[0].slice(0, 160)}`);
    }
  }

  // Rule 9.
  for (const file of ['reading.ts', 'sentence.ts']) {
    const text = readFileSync(join(repoRoot, 'src', 'main', 'arch', file), 'utf8');
    for (const word of ["from 'node:", "from 'electron'", 'child_process', 'require(']) {
      if (text.includes(word)) fail(`rule 9: src/main/arch/${file} names ${word}, and the composer is pure`);
    }
  }

  // Rule 10.
  const pkg = readFileSync(join(repoRoot, 'package.json'), 'utf8');
  const checks = readFileSync(join(repoRoot, 'build/verification-checks.mjs'), 'utf8');
  if (!pkg.includes('"conformance:reading"')) fail('rule 10: package.json does not name conformance:reading');
  if (!checks.includes("'conformance:reading'")) fail('rule 10: build/verification-checks.mjs does not name conformance:reading');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${TAG} FAIL: ${f}\n`);
  process.exit(1);
}
say(`${TAG} OK: the box set and every sentence byte for byte on five trees, the rollup, the drill and the declared names, ${String(ABLATIONS.length)} ablations each red, the composer pure, the gate named`);
