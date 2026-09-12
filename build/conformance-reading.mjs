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
 *
 * PHASE 258 ADDED THREE, and rule 8's twelve original ablations are untouched.
 *
 * 11. Rule Q's regions move on any of the five trees: the region set (id,
 *     kind, label, sub, box ids) is pinned in expected.json, derived by hand
 *     from SPEC §3.1. gmux reads one unit, one thing; cargo reads one region
 *     per member crate and Elsewhere for the rest; clients reads Elsewhere for
 *     the boxes no manifest names, the SwiftPM target's included, because its
 *     unit is `Sources/<name>` and rule P's box is the package directory.
 * 12. F1 (research 118 §4.4) opens again: `draftSkeleton` over each tree must
 *     write one component per rule P box with `id = box.id`, and the overlay
 *     over THAT draft must paint every non-fold box. At the parent it painted
 *     0 of 8 on gmux, because the draft grouped with `groupTree` while the map
 *     drew `readingPartition`.
 * 13. The eleventh hover line: the renderer's `hoverLines` appends the rung
 *     sentence and its counts AFTER the ten pinned facts, so the first ten
 *     stay byte identical to their pins; the line's bytes are re-derived here
 *     from the one rung table and the reading the copy under test answered,
 *     and `hoverLines`'s own body is read as text, proved on two plants.
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
  { name: 'the manifests at the box root', file: 'reading.ts', from: 'return at === dir || at === commonDir;', to: 'return true;' },
  { name: 'the declared name reader', file: 'tree-facts.ts', from: "name = typeof parsed.name === 'string' ? parsed.name : null;", to: 'name = null;' },
  // PHASE 258. Rule 11's clause is Q2's deepest-first ownership, in the one
  // function the regions and the seeds share; rule 12's is F1's anchors, one
  // directory per box, which a top-level anchor would spread over its
  // siblings and paint nothing.
  { name: 'rule Q2, the deepest unit owns the box', file: 'evidence.ts', from: '(a, b) => depth(b.dir) - depth(a.dir) ||', to: '(a, b) => depth(a.dir) - depth(b.dir) ||' },
  { name: "F1, the draft's anchors one directory per box", file: 'skeleton.ts', from: 'if (!nested) return [box.dir];', to: "if (!nested) return [box.dir.split('/')[0] ?? box.dir];" }
];

/**
 * A copy of src/main/arch and the two modules outside it the copy reaches by
 * value, being src/main/symbols/languages.ts and, since Phase 257,
 * src/main/symbols/calls.ts, which the fact base's limits table re-exports
 * its ceilings from. Both are pure: neither names a file, a process, a worker
 * or electron. Under `<root>/main`, with `edit` applied to one file.
 * `@shared/*` resolves through tsconfig.node.json to the real tree either way,
 * which is what keeps the copy small.
 */
function ablatedCopy(root, edit) {
  mkdirSync(join(root, 'main', 'symbols'), { recursive: true });
  cpSync(join(repoRoot, 'src', 'main', 'arch'), join(root, 'main', 'arch'), {
    recursive: true,
    filter: (source) => !source.includes('__tests__')
  });
  for (const pure of ['languages.ts', 'calls.ts']) {
    cpSync(join(repoRoot, 'src', 'main', 'symbols', pure), join(root, 'main', 'symbols', pure));
  }
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

/** SPEC §1.4's five hover sentences, held here so the eleventh line is re-derived rather than read back. */
const RUNG_SENTENCES = {
  'off-repo': 'No file this part names is tracked here.',
  declared: 'Here, and nothing imports it or names it.',
  composed: 'Imported or named; nothing that starts reaches it.',
  reached: 'On a path from something this unit starts.',
  tested: 'Reached, and a test imports it.'
};

/**
 * Rule 13's text half: `hoverLines` in src/renderer/arch/ArchDrill.tsx must
 * spread the ten facts FIRST and append the sentence, read from the
 * function's own body. True when the body is in that shape.
 */
function appendsAfterTheTen(source) {
  const at = source.indexOf('function hoverLines(');
  if (at < 0) return false;
  const body = source.slice(at, source.indexOf('\n}', at));
  const spread = body.indexOf('[...group.facts,');
  return spread >= 0 && !/\[`\$\{RUNG_FACES|\[[^\]]*sentence[^\]]*\.\.\.group\.facts/.test(body);
}

const HOVER_PLANTS = [
  { name: 'the ten first, then the sentence', text: 'export function hoverLines(group) {\n  return [...group.facts, `${RUNG_FACES[r.rung].sentence} x`];\n}\n', ok: true },
  { name: 'the sentence first', text: 'export function hoverLines(group) {\n  return [`${RUNG_FACES[r.rung].sentence} x`, ...group.facts];\n}\n', ok: false }
];

function pin(got) {
  const problems = [];
  if (got === undefined || 'error' in got) {
    return [`the probe answered ${got === undefined ? 'nothing' : got.error}`];
  }
  // PHASE 234. Every tree is composed TWICE: once from the fixture's own facts
  // and once from facts that crossed the machine arm. BOTH are held against
  // the SAME expectations, so a sentence that is right here and wrong on a
  // folder on another machine is a red pin naming the arm, and an ablation
  // must turn BOTH red or the second arm is proving nothing.
  const arms = [];
  for (const tree of TREES) {
    arms.push({ tree, key: tree, where: tree });
    arms.push({ tree, key: `${tree}@machine`, where: `${tree}, through the machine arm` });
  }
  for (const { tree, key, where } of arms) {
    const want = expected[tree];
    const have = got[key];
    if (have === undefined) {
      problems.push(`${where}: not composed`);
      continue;
    }
    if (key.endsWith('@machine')) {
      // A run that carried nothing would agree with an empty expectation and
      // read as a pass, so what really crossed is asserted before the bytes.
      const carried = have.carried ?? { trackedFiles: 0, treeFacts: 0 };
      if (carried.trackedFiles !== want.boxes.reduce((n, b) => n + b.fileCount, 0)) {
        problems.push(
          `${where}: the arm carried ${String(carried.trackedFiles)} tracked files and the ` +
            `fixture's boxes account for ${String(want.boxes.reduce((n, b) => n + b.fileCount, 0))}`
        );
      }
      if (carried.treeFacts === 0) {
        problems.push(`${where}: the arm carried no file bytes at all`);
      }
    }
    const wantIds = want.boxes.map((b) => `${b.id}:${b.label}:${b.fileCount}:${b.band}`);
    const haveIds = have.boxes.map((b) => `${b.id}:${b.label}:${b.fileCount}:${b.band}`);
    if (JSON.stringify(wantIds) !== JSON.stringify(haveIds)) {
      problems.push(`${where}: rule 1, the box set reads [${haveIds.join(', ')}] and the fixture pins [${wantIds.join(', ')}]`);
    }
    if (have.sentence !== want.sentence) {
      problems.push(`${where}: rule 2, rule R reads "${have.sentence}" and the fixture pins "${want.sentence}"`);
    }
    if (have.words !== want.words) {
      problems.push(`${where}: rule 2, rule R carries ${String(have.words)} words and the fixture pins ${String(want.words)}`);
    }
    for (const wantBox of want.boxes) {
      const haveBox = have.boxes.find((b) => b.id === wantBox.id);
      if (haveBox === undefined) continue;
      if (haveBox.sentence !== wantBox.sentence) {
        problems.push(`${where}/${wantBox.id}: rule 2, the sentence reads "${haveBox.sentence}" and the fixture pins "${wantBox.sentence}"`);
      }
      if (haveBox.words !== wantBox.words) {
        problems.push(`${where}/${wantBox.id}: rule 2, ${String(haveBox.words)} words against ${String(wantBox.words)} pinned`);
      }
      if (JSON.stringify(haveBox.facts) !== JSON.stringify(wantBox.facts)) {
        problems.push(`${where}/${wantBox.id}: rule 3, the hover facts read [${haveBox.facts.join(' | ')}] and the fixture pins [${wantBox.facts.join(' | ')}]`);
      }
      for (const field of ['languages', 'lines', 'entries']) {
        if (JSON.stringify(haveBox[field]) !== JSON.stringify(wantBox[field])) {
          problems.push(`${where}/${wantBox.id}: rule 3, ${field} reads ${JSON.stringify(haveBox[field])} and the fixture pins ${JSON.stringify(wantBox[field])}`);
        }
      }
    }
    if (JSON.stringify(have.edges) !== JSON.stringify(want.edges)) {
      problems.push(`${where}: rule 4, the edges read [${have.edges.join(', ')}] and the fixture pins [${want.edges.join(', ')}]`);
    }
    if (have.repeatable !== true) {
      problems.push(`${where}: rule 5, composed from reversed facts the bytes moved`);
    }
    if (
      !key.endsWith('@machine') &&
      JSON.stringify(have.drill) !== JSON.stringify(want.drill)
    ) {
      problems.push(`${where}: rule 6, the drill reads ${JSON.stringify(have.drill)} and the fixture pins ${JSON.stringify(want.drill)}`);
    }
    // PHASE 258, rules 11 to 13, on the fixture's own arm only: the machine
    // arm carries no facts and reads every box as Elsewhere by design.
    if (!key.endsWith('@machine')) {
      const wantRegions = [...(want.regions ?? [])].sort((a, b) => (a.id < b.id ? -1 : 1));
      if (JSON.stringify(have.regions) !== JSON.stringify(wantRegions)) {
        const show = (rs) => (rs ?? []).map((r) => `${r.id}:${r.kind}:${r.label}:${r.sub}:[${r.groupIds.join(',')}]`).join(' ; ');
        problems.push(`${where}: rule 11, the regions read [${show(have.regions)}] and the fixture pins [${show(wantRegions)}]`);
      }
      const draft = have.draft ?? { componentIds: [], boxIds: [], painted: [] };
      const nonFold = draft.boxIds.filter((id) => id !== 'other');
      for (const id of nonFold) {
        if (!draft.componentIds.includes(id)) problems.push(`${where}: rule 12, the draft writes no component for box ${id} (F1)`);
      }
      for (const id of draft.componentIds) {
        if (!draft.boxIds.includes(id)) problems.push(`${where}: rule 12, the draft writes a component ${id} that is no rule P box (F1)`);
      }
      if (JSON.stringify(draft.painted) !== JSON.stringify(nonFold)) {
        problems.push(`${where}: rule 12, the overlay over the draft paints [${draft.painted.join(', ')}] of the ${String(nonFold.length)} non-fold boxes [${nonFold.join(', ')}] (F1)`);
      }
      for (const wantBox of want.boxes) {
        const h = have.hover?.[wantBox.id];
        if (h === undefined) continue;
        if (JSON.stringify(h.first) !== JSON.stringify(wantBox.facts)) {
          problems.push(`${where}/${wantBox.id}: rule 13, the ten lines before the rung sentence read [${h.first.join(' | ')}] and the fixture pins [${wantBox.facts.join(' | ')}]`);
        }
        if (h.reading === null || h.eleventh === null) {
          problems.push(`${where}/${wantBox.id}: rule 13, the box carries no rung, so there is no eleventh line`);
        } else {
          const r = h.reading;
          const seeds = r.seeds === 0 ? 'nothing this reader recognises starts this unit' : `${r.seeds.toLocaleString('en-US')} ${r.seeds === 1 ? 'seed' : 'seeds'}`;
          const counts = `reached ${r.reached.toLocaleString('en-US')} of ${r.parsed.toLocaleString('en-US')} parsed · ${r.tested.toLocaleString('en-US')} imported by a test · ${seeds}`;
          const sentence = RUNG_SENTENCES[r.rung];
          if (sentence === undefined || h.eleventh !== `${sentence} ${counts}`) {
            problems.push(`${where}/${wantBox.id}: rule 13, the eleventh line reads "${h.eleventh}" and the reading ${JSON.stringify(r)} composes "${String(sentence)} ${counts}"`);
          }
        }
      }
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

  // Rule 9. PHASE 234 added the machine arm's two decoders, which the reading
  // now depends on for a folder on another machine. They may open a file and a
  // directory, because the mirror is theirs, but nothing in that module may
  // START anything: everything it sends goes through `runRemoteRead`, whose
  // step 4 is the one gate.
  const arm = readFileSync(join(repoRoot, 'src', 'main', 'machines', 'remote-arch.ts'), 'utf8');
  const armImports = [...arm.matchAll(/^import[^;]*?from '([^']+)';/gms)].map((hit) => hit[1]).sort();
  const armAllowed = [
    '../arch/argv-guard',
    // PHASE 244, finding F2. The mirror's freshness token is the far side's own
    // `cksum` re-derived over the mirrored bytes, and this is the arithmetic
    // that does it. It is allowed here only because it is PURE, which the loop
    // below asserts rather than assumes: a module on this list that grew a
    // process would be a door around `runRemoteRead`.
    './arch-cksum',
    './ready-context',
    './remote-run',
    './remote-scripts',
    '@shared/arch',
    'node:crypto',
    'node:fs',
    'node:fs/promises',
    'node:path'
  ];
  const armPure = ['./arch-cksum'];
  for (const one of armImports) {
    if (!armAllowed.includes(one)) {
      fail(
        `rule 9: src/main/machines/remote-arch.ts imports ${one}. Everything it ` +
          `sends goes through ./remote-run, whose step 4 is the one gate, and ` +
          `nothing in it may reach a process by any other door.`
      );
    }
  }
  for (const one of armPure) {
    const text = readFileSync(
      join(repoRoot, 'src', 'main', 'machines', `${one.slice(2)}.ts`),
      'utf8'
    );
    for (const word of ["from 'node:", "from 'electron'", 'child_process', 'require(']) {
      if (text.includes(word)) {
        fail(
          `rule 9: src/main/machines/${one.slice(2)}.ts names ${word}. It is on ` +
            `remote-arch's import allowlist only because it starts nothing, so a ` +
            `platform reach in it is a door around runRemoteRead's step 4.`
        );
      }
    }
  }
  for (const file of ['reading.ts', 'sentence.ts']) {
    const text = readFileSync(join(repoRoot, 'src', 'main', 'arch', file), 'utf8');
    for (const word of ["from 'node:", "from 'electron'", 'child_process', 'require(']) {
      if (text.includes(word)) fail(`rule 9: src/main/arch/${file} names ${word}, and the composer is pure`);
    }
  }

  // Rule 13, the text half (Phase 258).
  const drill = readFileSync(join(repoRoot, 'src', 'renderer', 'arch', 'ArchDrill.tsx'), 'utf8');
  if (!appendsAfterTheTen(drill)) fail('rule 13: hoverLines in src/renderer/arch/ArchDrill.tsx does not spread the ten facts first and append the rung sentence after them');
  for (const plant of HOVER_PLANTS) {
    if (appendsAfterTheTen(plant.text) !== plant.ok) fail(`rule 13: the hoverLines scanner ${plant.ok ? 'refused' : 'accepted'} the planted text "${plant.name}"`);
  }
  say(`${TAG} rule 13: the eleventh hover line is appended after the pinned ten, proved on ${String(HOVER_PLANTS.length)} plants`);

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
say(
  `${TAG} OK: the box set and every sentence byte for byte on five trees AND on ` +
    `the same five read through the machine arm, the rollup, the drill and the ` +
    `declared names, rule Q's regions, the F1 draft painting every box, the ` +
    `eleventh hover line after the ten, ${String(ABLATIONS.length)} ablations each red, the ` +
    `composer pure, the gate named`
);
