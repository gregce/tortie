#!/usr/bin/env node
/**
 * `npm run conformance:semantic`. The gate on the bounded semantic pass
 * (Phase 259, research 118 §7.1, §7.3, §7.5, §7.6 and §7.8; the spec is
 * build/p259/SPEC.md §7.1).
 *
 * WHAT IT IS FOR. This is the first phase in which a MODEL'S OWN SENTENCES are
 * drawn on a face a person will believe, and the whole of the phase's claim is
 * that those sentences are BOUNDED: every claim cites, every citation is
 * graded by the deterministic half, the grade is drawn beside its chance
 * floor, a stale claim is drawn stale, and no chip reads as a truth mark. Each
 * one of those is a clause that moves silently — a refusal narrowed to keep a
 * row, a rate drawn with its floor dropped, a `has` put back to an `includes`,
 * a call site and a declaration drawn the same — and each one of them, moved,
 * makes the face say more than the arithmetic supports. So this gate runs the
 * SHIPPING modules under node over committed fixtures, pins what they answer
 * against values derived by hand from the spec, and then runs the same probe
 * over an ablated copy of the modules once per clause and fails unless every
 * copy turns a pin red, naming the clause.
 *
 * IT SPAWNS THE PINNED tsx ONCE FOR THE PROBE RUN and nothing else. No git, no
 * Electron, no tmux, NO AGENT, NO MODEL, NO TOKEN, no request, and it reads
 * nothing under the person's home. The fixtures are data; the file system
 * writes are the ablated copies, under a scratch directory at the repository
 * root removed in a finally block. That is why it is `pure` in
 * build/verification-checks.mjs.
 *
 * THE RULES, each printed as it is read.
 *
 *   1a  the three budget constants, and the seven admitted categories in the
 *       shared order with `test` ABSENT (D3: no claim may cite a test fact)
 *   1b  allocation over a crowded fact set: the floor of 4 a category with any
 *       rows keeps, the ceiling of half the budget one category may take, and
 *       the give back in the fixed order, so `effect` cannot eat `gate`
 *   1c  determinism: reversed facts, decls, files and parts compose a BYTE
 *       IDENTICAL block, so the same input hash means something
 *   1d  the cap: a crowded part composes UNDER ARCH_ENRICH_PROMPT_MAX_BYTES
 *   1e  a category with no rows prints `none found by this reader` (§7.6: a
 *       silently absent category is an invitation to invent one)
 *   1f  every fact line resolves in the tracked list, and no fact from another
 *       part's box is ever in a part's block
 *   2a  ARCH_SEMANTIC_SYSTEM_PROMPT is byte pinned, and it instructs the model
 *       to write no rung word (D4)
 *   2b  the composed prompt's byte size, against the cap and the budget
 *   2c  no field of a repository reaches any argv, over the composer and the
 *       recipe table (the conformance:arch scan, asked here of the new rows)
 *   3a  the citation grammar over 12 hostile strings and 4 real ones
 *   3b  resolution reads arch_tree_file alone: a file seam that THROWS is
 *       handed in and the grader still answers
 *   3c  the ladder, one arm per grade, and the precedence when several are in
 *       the span (a gate beats a call site beats a declaration beats a line)
 *   3d  ARCH_CITE_SLACK is ONE constant read by the grader AND by the floor
 *   4a  R1 refuses the ten words as a field VALUE and KEEPS the same word
 *       inside an honest sentence, which is the clause a substring search
 *       would break
 *   4b  R2 drops the ROW; an answer with no row left is refused whole
 *   4c  R3 as a TOKEN of the block, over research's own three planted numbers
 *       and its own three decoys, MEASURED against the substring form
 *   5a  the floor from the shipping function equals this gate's own
 *       independent re-derivation over the same fixture
 *   5b  no rate is stored or drawn without its floor: the schema carries no
 *       such column and no drawn fraction has a one-argument composer
 *   6a  no two rows of the cite table share both a glyph and a word, and a
 *       call site and a declaration differ in glyph, word AND tone
 *   6b  removing the fact and leaving the decl moves the same line's grade
 *   6c  no drawn string says anything stronger than a fact was found
 *   7   THE PLANTED BATTERY: the seven lies of build/p256/semantic/plant.mts
 *       ported into the shipped grammar and run against the SHIPPING
 *       validator, the CAUGHT number MEASURED and pinned in
 *       build/fixtures/semantic/caught.json, never assumed
 *   8e  the refresh spawns nothing: refreshSemantic and its caller name no
 *       spawn, no runner and no arch:enrich, read by matching braces
 *   9a  refusal 8, structural: every spawn reachable from a watcher event
 *       passes through the skip and the runner's confirm re-check
 *   9b  arch:enrich is the one channel that can spawn; arch:semantic names none
 *   9c  the part and journeys scopes take the same gate as whole
 *   9d  archAgentConfirmed answers true for a builtin launchable row and false
 *       when the row is not launchable, so the measurement goes THROUGH the
 *       shipped gate rather than around it
 *  10a  every row in the live semantic table has a measurement date AND a
 *       record under build/p259/measured/ whose fields agree with the row
 *  10b  a row with no record is absent from the table and Settings reads
 *       `not-measured`
 *  10c  the two model ids are exactly `opus` and `gpt-6-astra`
 *  10d  both recipes are handed byte identical system prompt bytes
 *  11   registration: package.json names the gate and the harness,
 *       verification-checks.mjs classifies them, HELPER_USER_FLOOR counts the
 *       new Electron starter, and the contract baseline moved by one line
 *  12   THE PINS CANNOT FAIL. Every ablation below must turn at least one pin
 *       red; an ablation whose text is not found is a failure naming the
 *       clause, never a throw, so a tree whose clauses moved reports every one
 *       at once.
 */

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockAt, functionBodyOf, stripComments } from './scan-source.mjs';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:semantic]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (message) => failures.push(message);
const say = (line) => process.stdout.write(`${line}\n`);
const writeCaught = process.argv.includes('--write-caught');

const fixturesDir = join(repoRoot, 'build', 'fixtures', 'semantic');
const fixture = (name) => JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), 'utf8'));

/** The seven categories a block may carry, in the shared order, `test` absent. D3. */
const ADMITTED = ['entrypoint', 'boundary', 'surface', 'store', 'effect', 'network', 'gate'];
/** The four grades, rarest first. D6. */
const GRADES = ['gate', 'call-site', 'declaration', 'resolves'];
/**
 * The ten words a model may never write as a field VALUE, being the five
 * computed rungs and the five research levels. R1.
 */
const LEVEL_WORDS = [
  'off-repo', 'declared', 'composed', 'reached', 'tested',
  'component-tested', 'accepted-live', 'implemented-not-shipped', 'outside-this-repo'
];

// ---------------------------------------------------------------------------
// The ablations, one per clause.
// ---------------------------------------------------------------------------

const ABLATIONS = [
  { name: 'rule 1a, test admitted to the block', clause: "ARCH_SEMANTIC_CATEGORIES dropping `test` (D3, §1.2)", file: 'main/arch/semantic/block.ts', from: "category !== 'test'", to: "category !== 'nothing-at-all'" },
  { name: 'rule 1b, the per category ceiling removed', clause: 'the ceiling of half the budget for one category (§1.2 item 3)', file: 'main/arch/semantic/block.ts', from: 'const cap = Math.max(1, Math.floor(budget / 2));', to: 'const cap = budget + 1;' },
  { name: 'rule 1b, the per category floor removed', clause: 'the floor of 4 lines a category with any rows keeps (§1.2 item 3)', file: 'main/arch/semantic/block.ts', from: 'const floor = Math.min(4, budget);', to: 'const floor = 0;' },
  { name: 'rule 1e, the honest zero dropped', clause: 'a category with no rows printed as none found by this reader (§1.2 item 4)', file: 'main/arch/semantic/block.ts', from: "lines.push('  none found by this reader');", to: '' },
  { name: 'rule 3a, the traversal clause removed', clause: 'the citation grammar refusing an empty, a . or a .. segment (§2.1)', file: 'main/arch/semantic/grade.ts', from: "if (segment === '' || segment === '.' || segment === '..') return null;", to: "if (segment === '') return null;" },
  { name: 'rule 3c, gate demoted below call-site', clause: 'the ladder answering the RAREST kind present (§2.3)', file: 'main/arch/semantic/grade.ts', from: "? { grade: 'gate', row: gate }", to: "? { grade: 'call-site', row: gate }" },
  { name: 'rule 3d, the grader given a slack of its own', clause: 'ARCH_CITE_SLACK read by the grader AND by the floor (§2.3)', file: 'main/arch/semantic/grade.ts', from: 'Math.abs(row.line - parsed.line) <= ARCH_CITE_SLACK', to: 'Math.abs(row.line - parsed.line) <= 0' },
  { name: 'rule 4a, the level test made a substring search', clause: 'R1 asked of a field VALUE and never inside a sentence (§2.4)', file: 'main/arch/enrich/validate.ts', from: 'if (REFUSED_LEVELS.has(word)) {', to: 'if ([...REFUSED_LEVELS].some((one) => word.includes(one))) {' },
  { name: 'rule 4a, the refused key set emptied', clause: 'R1 refusing a key named evidence, level, rung and the rest anywhere (§2.4)', file: 'main/arch/enrich/validate.ts', from: 'if (REFUSED_KEYS.has(key.trim().toLowerCase())) {', to: 'if (false && REFUSED_KEYS.has(key.trim().toLowerCase())) {' },
  { name: 'rule 4b, the broken row kept instead of dropped', clause: 'R2 dropping the ROW whole (§2.4)', file: 'main/arch/enrich/validate.ts', from: 'const note = (where: string, at: string): void => {\n    rowsDropped += 1;', to: 'const note = (where: string, at: string): void => {\n    rowsDropped += 0;' },
  { name: 'rule 4c, the token set put back to a substring', clause: 'R3 asking for a TOKEN of the block (§2.4)', file: 'main/arch/enrich/validate.ts', from: 'const tokens = new Set(digitRuns(context.factBlock));', to: 'const tokens = { has: (run: string): boolean => context.factBlock.includes(run) } as unknown as Set<string>;' },
  { name: 'rule 5a, the floor marking only forward of a row', clause: 'the floor marking the SAME span either side of a row that the grader does (§2.5)', file: 'main/arch/semantic/floor.ts', from: 'for (let at = line - ARCH_CITE_SLACK; at <= line + ARCH_CITE_SLACK; at += 1) {', to: 'for (let at = line; at <= line + ARCH_CITE_SLACK; at += 1) {' },
  { name: "rule 5a, the floor's precedence inverted", clause: "the floor splitting a line four ways under the GRADER's own precedence (§2.5)", file: 'main/arch/semantic/floor.ts', from: 'if (gate.has(line)) onGate += 1;\n      else if (call.has(line)) onCall += 1;', to: 'if (call.has(line)) onCall += 1;\n      else if (gate.has(line)) onGate += 1;' }
];

/**
 * A copy of src/main (less its tests) and src/shared/arch.ts under `<root>`,
 * with one edit applied. `@shared/*` inside the copied main tree resolves to
 * the shipping tree through tsconfig.node.json, which is fine because the
 * probe reads the shared constants out of the copy explicitly.
 */
function ablatedCopy(root, edit) {
  mkdirSync(join(root, 'shared'), { recursive: true });
  cpSync(join(repoRoot, 'src', 'main'), join(root, 'main'), { recursive: true, filter: (s) => !s.includes('__tests__') });
  cpSync(join(repoRoot, 'src', 'shared', 'arch.ts'), join(root, 'shared', 'arch.ts'));
  const target = join(root, edit.file);
  if (!existsSync(target)) return `${edit.file} is not in the copy`;
  const before = readFileSync(target, 'utf8');
  if (!before.includes(edit.from)) return `found nothing to edit in ${edit.file} for "${edit.from.slice(0, 60)}"`;
  writeFileSync(target, before.replace(edit.from, edit.to));
  return null;
}

function runProbe(roots) {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/semantic-conformance-probe.mts', JSON.stringify({ roots })],
    { encoding: 'utf8', cwd: repoRoot, maxBuffer: 256 * 1024 * 1024 }
  );
  if (probe.status !== 0) throw new Error(`the probe did not run: ${(probe.stderr || '(no output)').slice(0, 2000)}`);
  const line = probe.stdout.trim().split('\n').pop() ?? '';
  return JSON.parse(line);
}

// ---------------------------------------------------------------------------
// The gate's OWN re-derivation of the floor, by a different method from the
// shipping function's: a sorted sweep over merged intervals rather than a line
// set. Rule 5a compares the two, so a floor that agreed with itself proves
// nothing.
// ---------------------------------------------------------------------------

export function floorBySweep(files, facts, decls, linesOf, slack) {
  let within = 0;
  let lines = 0;
  const byGrade = { gate: 0, 'call-site': 0, declaration: 0, resolves: 0 };
  // Merged intervals per grade, swept in order, against the shipping
  // function's per line Set. The DEFINITION is the same — the same slack
  // either side, the same bound of n + 1, the grader's own precedence — and
  // the METHOD is the different half, which is what makes this a check.
  const spansOf = (rows, bound) => {
    const spans = rows
      .map((r) => [Math.max(1, r.line - slack), Math.min(bound, r.line + slack)])
      .filter(([from, to]) => to >= from)
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged = [];
    for (const [from, to] of spans) {
      const last = merged[merged.length - 1];
      if (last !== undefined && from <= last[1] + 1) last[1] = Math.max(last[1], to);
      else merged.push([from, to]);
    }
    return merged;
  };
  const covers = (merged, line) => merged.some(([from, to]) => line >= from && line <= to);
  for (const file of [...new Set(files)]) {
    const n = linesOf(file);
    if (n === null || n === undefined) continue;
    const bound = n + 1;
    lines += bound;
    const here = facts.filter((r) => r.file === file);
    const gate = spansOf(here.filter((r) => r.category === 'gate'), bound);
    const call = spansOf(here.filter((r) => r.category !== 'gate'), bound);
    const decl = spansOf(decls.filter((r) => r.file === file), bound);
    for (let line = 1; line <= bound; line += 1) {
      if (covers(gate, line)) byGrade.gate += 1;
      else if (covers(call, line)) byGrade['call-site'] += 1;
      else if (covers(decl, line)) byGrade.declaration += 1;
      else byGrade.resolves += 1;
    }
  }
  within = byGrade.gate + byGrade['call-site'] + byGrade.declaration;
  return { within, lines, byGrade };
}

// ---------------------------------------------------------------------------
// The scanners, each proved on planted texts of which some must fail.
// ---------------------------------------------------------------------------

/** Rule 6c: does this text say anything stronger than a fact was found here? */
const TRUTH_WORDS = [
  'verif(?:y|ies|ied|ication)',
  'prove[sdn]?|proven',
  'confirm(?:s|ed|ation)?',
  'check(?:s|ed)?',
  'guarantee[sd]?',
  'correct(?:ly)?',
  'accurate(?:ly)?',
  'valid(?:ates?|ated)?',
  'certain(?:ly)?',
  'true'
];
export function claimsTruth(text) {
  const hits = [];
  for (const word of TRUTH_WORDS) {
    const hit = new RegExp(`\\b(?:${word})\\b`, 'i').exec(text);
    if (hit !== null) hits.push(hit[0].toLowerCase());
  }
  return hits;
}
const TRUTH_PLANTS = [
  { name: 'the shipped gate hover', text: 'A gate was found at this line.', caught: false },
  { name: 'the shipped line hover', text: 'This line is here. Nothing was found at it.', caught: false },
  { name: 'the shipped stale hover', text: 'The line this cites no longer carries that fact.', caught: false },
  { name: 'a hover that verifies', text: 'This citation was verified against the repository.', caught: true },
  { name: 'a hover that calls it true', text: 'The claim is true at this line.', caught: true },
  { name: 'a hover that proves', text: 'A call here proves the claim.', caught: true },
  { name: 'a hover that confirms', text: 'Confirmed by a declaration.', caught: true }
];

/** Rule 9a/9b/8e: does this function body reach a spawn, a runner or the enrich channel? */
const SPAWN_NAMES = ['spawn', 'spawnSync', 'execFile', 'execFileSync', 'execSync', 'runFold', 'ArchPassRunner', "'arch:enrich'", 'arch:enrich'];
export function reachesASpawn(body) {
  const clean = stripComments(body);
  return SPAWN_NAMES.filter((name) => clean.includes(name));
}
const SPAWN_PLANTS = [
  { name: 'a pure refresh', text: 'function refreshSemantic(rows) { return rows.map((r) => ({ ...r, stale: true })); }', caught: false },
  { name: 'a refresh that explains the refusal in a comment', text: 'function refreshSemantic(rows) { /* it never calls runFold */ return rows; }', caught: false },
  { name: 'a refresh that starts a pass', text: 'function refreshSemantic(rows) { void runFold({}); return rows; }', caught: true },
  { name: 'a refresh that reaches the channel', text: "function refreshSemantic(rows) { void invoke('arch:enrich', {}); return rows; }", caught: true }
];

function walk(dir, out) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const read = (rel) => (existsSync(join(repoRoot, rel)) ? readFileSync(join(repoRoot, rel), 'utf8') : null);

// ---------------------------------------------------------------------------
// The pins, derived by hand from the spec and never from the code.
// ---------------------------------------------------------------------------

function pin(answer) {
  const out = [];
  if (answer === undefined) return ['the probe answered nothing for this root'];
  if ('error' in answer) return [`the root did not run: ${String(answer.error).slice(0, 200)}`];
  if (Array.isArray(answer.missing) && answer.missing.length > 0) {
    return answer.missing.map((m) => `the shipping surface is not there: ${m}`);
  }
  for (const t of answer.threw ?? []) out.push(`a rule threw rather than answering: ${t}`);

  const b = answer.budgets ?? {};
  // 1a, the constants.
  if (b.factLines !== 120) out.push(`rule 1a: ARCH_SEMANTIC_FACT_LINES reads ${String(b.factLines)} and §1.1 sizes it at 120`);
  if (b.fileSample !== 20) out.push(`rule 1a: ARCH_SEMANTIC_FILE_SAMPLE reads ${String(b.fileSample)} and §1.1 sizes it at 20`);
  if (b.journeyLines !== 160) out.push(`rule 1a: ARCH_SEMANTIC_JOURNEY_LINES reads ${String(b.journeyLines)} and §1.1 sizes it at 160`);
  if (b.cap !== 65536) out.push(`rule 1a: the prompt cap reads ${String(b.cap)} and it is 65,536 and does not move`);
  if (b.slack !== 3) out.push(`rule 1a: ARCH_CITE_SLACK reads ${String(b.slack)} and §2.3 sets it at 3`);
  if (JSON.stringify(b.grades) !== JSON.stringify(GRADES)) out.push(`rule 1a: ARCH_CITE_GRADES reads ${JSON.stringify(b.grades)} and §2.3 orders them ${JSON.stringify(GRADES)}, rarest first`);
  if (JSON.stringify(b.categories) !== JSON.stringify(ADMITTED)) out.push(`rule 1a: ARCH_SEMANTIC_CATEGORIES reads ${JSON.stringify(b.categories)} and §1.2 admits ${JSON.stringify(ADMITTED)}, with test absent because D3 keeps a computed rung out of the model's hands`);

  const block = answer.block ?? {};
  // 1a again, on the face of the block itself.
  if (JSON.stringify(block.categoryOrder) !== JSON.stringify(ADMITTED)) {
    out.push(`rule 1a: the block names ${JSON.stringify(block.categoryOrder)} and §1.2 fixes the order at ${JSON.stringify(ADMITTED)}`);
  }

  // 1b, asked of the allocator directly, in both of its two behaviours.
  const one = answer.allocated ?? [];
  const two = answer.allocatedTwo ?? [];
  const counts = [1, 2, 12, 3, 4000, 0, 5];
  const countsTwo = [1, 2, 12, 3, 3000, 0, 5000];
  const allocPins = (got, want, label) => {
    if (!Array.isArray(got) || got.length !== want.length) {
      out.push(`rule 1b: the allocator answered ${JSON.stringify(got)} for ${label}`);
      return;
    }
    const spent = got.reduce((a, n) => a + n, 0);
    if (spent !== 120) out.push(`rule 1b: ${label} spent ${String(spent)} of a 120 line budget, and a budget is never thrown away`);
    for (const [i, n] of got.entries()) {
      if (n > want[i]) out.push(`rule 1b: ${label} gave category ${String(i)} ${String(n)} lines and it holds ${String(want[i])}`);
      if (want[i] > 0 && n < Math.min(4, want[i])) {
        out.push(`rule 1b: ${label} gave category ${String(i)} ${String(n)} lines and a category with any rows keeps a floor of 4, so a greedy one ate it`);
      }
      if (want[i] === 0 && n !== 0) out.push(`rule 1b: ${label} gave category ${String(i)} ${String(n)} lines and it holds none`);
    }
  };
  allocPins(one, counts, 'the nowhere-to-spill vector');
  allocPins(two, countsTwo, 'the two-greedy-categories vector');
  // The ceiling, which binds only when there is somewhere to spill. Both
  // halves are pinned, because a gate that asked only the first would read a
  // removed ceiling as healthy.
  if ((two[4] ?? 0) > 60 || (two[6] ?? 0) > 60) {
    out.push(`rule 1b: with two greedy categories the allocator gave ${String(two[4])} and ${String(two[6])} lines against a ceiling of half of 120`);
  }
  if ((one[4] ?? 0) <= 60) {
    out.push(`rule 1b: with nowhere to spill the allocator held effect at ${String(one[4])}; the ceiling deliberately does not bind there, and a reading of 60 or less means the fixture stopped asking the question`);
  }

  // 1c, 1d, 1e, 1f.
  if (block.deterministic !== true) out.push('rule 1c: reversed facts, parts and crossings composed a DIFFERENT block, so the same input hash means nothing and the same-input refusal protects nothing');
  if (block.missingPartIsNull !== true) out.push('rule 1c: a box id the partition does not hold did not answer null; the runner must refuse rather than guess a neighbour');
  if ((answer.crowded?.promptBytes ?? Infinity) > 65536) out.push(`rule 1d: a crowded part composed ${String(answer.crowded?.promptBytes)} bytes against a 65,536 byte cap`);
  if ((answer.crowded?.factLines ?? 0) !== 120) out.push(`rule 1d: a part with 6,000 facts drew ${String(answer.crowded?.factLines)} fact lines and the budget is 120`);
  if (!(block.zeroes ?? []).includes('network')) out.push(`rule 1e: the fixture holds no network fact and the block does not print the honest zero; it printed ${JSON.stringify(block.zeroes)}`);
  if ((block.unresolvable ?? -1) !== 0) out.push(`rule 1f: ${String(block.unresolvable)} fact line(s) in the block do not resolve in the tracked list, so the model is handed a citation it cannot honestly copy`);
  if ((block.outOfBox ?? -1) !== 0) out.push(`rule 1f: ${String(block.outOfBox)} fact line(s) came from another part's box`);
  if ((block.factLines ?? 0) !== 64) out.push(`rule 1f: the block carries ${String(block.factLines)} fact lines and the fixture holds 64 in the seven admitted categories`);

  // 2a, 2b.
  const system = String(answer.systemPrompt?.text ?? '');
  if (system.length === 0) out.push('rule 2a: ARCH_SEMANTIC_SYSTEM_PROMPT is empty');
  for (const word of ['name', 'receives', 'does', 'returns', 'runsIn', 'keeps', 'limit']) {
    if (!system.includes(word)) out.push(`rule 2a: the instruction does not name the field ${word}, and the answer is seven claims in that order`);
  }
  if (!/not read this repository/i.test(system)) {
    out.push('rule 2a: the instruction does not tell the model it has not read the repository, which is D2 and is the whole of what bounds the answer');
  }
  for (const word of LEVEL_WORDS.slice(0, 5)) {
    if (!system.toLowerCase().includes(word.replace('-', ' '))) {
      out.push(`rule 2a: the instruction does not refuse the word "${word}" as an answer, and D4 keeps every rung word out of the model's hands`);
    }
  }
  if (answer.systemPrompt?.same === true) out.push("rule 2a: the journey instruction is the part instruction's own bytes; §1.4 gives it its own text for the reason Phase 159 wrote beside ARCH_DELTA_SYSTEM_PROMPT");
  if ((block.promptBytes ?? 0) > 65536) out.push(`rule 2b: the composed part prompt is ${String(block.promptBytes)} bytes against the cap`);
  if ((block.journeyPromptBytes ?? 0) > 65536) out.push(`rule 2b: the composed journey prompt is ${String(block.journeyPromptBytes)} bytes against the cap`);
  if ((block.bytes ?? 0) > (block.factLines ?? 0) * 200) {
    out.push(`rule 2b: the block is ${String(block.bytes)} bytes over ${String(block.factLines)} fact lines, and §7.8 sized a fact line at about 88`);
  }

  // 3a, both halves.
  for (const row of answer.grammar?.parsedRefused ?? []) {
    if (row.parsed) out.push(`rule 3a: the hostile citation "${row.at}" PARSED, and a grammar failure is treated exactly as an unresolvable citation`);
  }
  for (const row of answer.grammar?.parsedAccepted ?? []) {
    if (!row.parsed) out.push(`rule 3a: the real citation "${row.at}" did not parse`);
  }
  for (const row of answer.grammar?.refused ?? []) {
    if (row.grade !== null) out.push(`rule 3a: the hostile citation "${row.at}" graded ${String(row.grade)} rather than being refused`);
  }
  for (const row of answer.grammar?.accepted ?? []) {
    if (row.grade === null) out.push(`rule 3a: the real citation "${row.at}" was refused, and it is a line of a tracked file`);
  }

  // 3b.
  if (answer.resolvesWithoutOpening !== 'call-site') {
    out.push(`rule 3b: with every file reading seam throwing the grader answered ${String(answer.resolvesWithoutOpening)}; it resolves out of arch_tree_file alone and opens nothing`);
  }

  // 3c, 3d and 6b.
  const l = answer.ladder ?? {};
  if (l.gate?.grade !== 'gate') out.push(`rule 3c: a citation at a gate fact graded ${String(l.gate?.grade)}`);
  if (l.gateNear?.grade !== 'gate') out.push(`rule 3c: a citation three lines from a gate fact graded ${String(l.gateNear?.grade)} and the slack is 3`);
  if (l.gateJustPast?.grade !== 'resolves') out.push(`rule 3d: a citation FOUR lines from the only fact in the file graded ${String(l.gateJustPast?.grade)}; the slack is 3 and it is asked in one place`);
  if (l.callSite?.grade !== 'call-site') out.push(`rule 3c: a citation at an ipc-channel fact graded ${String(l.callSite?.grade)}`);
  if (l.declaration?.grade !== 'declaration') out.push(`rule 3c: a citation at a declaration with no fact graded ${String(l.declaration?.grade)}`);
  if (l.resolves?.grade !== 'resolves') out.push(`rule 3c: a citation at a tracked line with nothing near it graded ${String(l.resolves?.grade)}`);
  if (l.factBeatsDecl?.grade !== 'call-site') out.push(`rule 3c: a line carrying BOTH a fact and a declaration graded ${String(l.factBeatsDecl?.grade)}, and the ladder answers the RAREST kind present`);
  if (l.broken !== null) out.push(`rule 3a: a citation into a file nobody tracks graded ${JSON.stringify(l.broken)} rather than answering null`);
  if (l.declarationWithNoDecls !== 'resolves') out.push(`rule 6b: with the decl table empty the same line graded ${String(l.declarationWithNoDecls)} and it must fall to resolves, so the declaration half is really read`);
  if (l.callSite?.factSubject !== 'arch:map' || l.callSite?.factLine !== 20) {
    out.push(`rule 3c: the winning row is not stored beside the grade (${JSON.stringify(l.callSite)}), so the hover cannot say WHICH fact and the drift fingerprint has nothing to compare`);
  }

  // 5a, against this gate's own sweep by a different method.
  const floor = answer.floor ?? {};
  const want = floorBySweep(
    ['src/main/fs/guarded-write.ts', 'src/main/arch/ipc.ts', 'src/main/arch/enrich/run.ts', 'src/main/symbols/pool.ts'],
    fixture('facts').facts,
    fixture('decls').decls,
    (p) => (fixture('tracked').files.find((f) => f.path === p) ?? {}).lines ?? null,
    answer.budgets?.slack ?? 3
  );
  if (floor.lines !== want.lines) out.push(`rule 5a: the floor's denominator reads ${String(floor.lines)} and this gate's own sweep reads ${String(want.lines)}`);
  if (floor.within !== want.within) out.push(`rule 5a: the floor's numerator reads ${String(floor.within)} and this gate's own sweep reads ${String(want.within)}; the two were computed by different methods, a per line set and a merged interval sweep`);
  const byGrade = floor.byGrade ?? {};
  for (const grade of GRADES) {
    if ((byGrade[grade] ?? null) !== want.byGrade[grade]) {
      out.push(`rule 5a: the floor's ${grade} share reads ${String(byGrade[grade])} and this gate's own sweep reads ${String(want.byGrade[grade])}; the floor splits a line four ways under the GRADER's own precedence`);
    }
  }
  const summed = GRADES.reduce((a, g) => a + (byGrade[g] ?? 0), 0);
  if (summed !== floor.lines) out.push(`rule 5a: the per grade floor sums to ${String(summed)} and the denominator is ${String(floor.lines)}, so a line is counted twice or not at all`);
  if ((byGrade.gate ?? 0) + (byGrade['call-site'] ?? 0) + (byGrade.declaration ?? 0) !== floor.within) {
    out.push('rule 5a: within is not the denominator minus the resolves share, so the two halves of the floor disagree');
  }
  if ((answer.floorOverCited?.lines ?? 0) <= 0) out.push('rule 5a: the floor over the files an answer really cites is empty, and that is the number a rate is drawn beside');

  // 4a, 4b, 4c.
  const r = answer.refusals ?? {};
  if (r.good?.kept !== 'kept') out.push(`rule 4a: the honest answer was refused (${String(r.good?.refusal)}), so a refusal that refused everything would read as a pass`);
  if (r.good?.claims !== 7) out.push(`rule 4a: the honest answer kept ${String(r.good?.claims)} claims and §1.4 asks for seven`);
  if (r.good?.gates !== 2) out.push(`rule 4a: the honest answer kept ${String(r.good?.gates)} gates and the fixture writes two`);
  if (r.levelValue?.kept !== null || r.levelValue?.refusal !== 'level-written') out.push(`rule 4a: a field whose VALUE is a rung word answered kept=${String(r.levelValue?.kept)} refusal=${String(r.levelValue?.refusal)}, and R1 refuses the answer WHOLE under level-written`);
  if (r.levelProse?.kept !== 'kept') out.push(`rule 4a: "the app is composed of three parts" was refused (${String(r.levelProse?.refusal)}); R1 is never a search inside a sentence, because refusing that would refuse good writing`);
  if (r.levelKey?.kept !== null || r.levelKey?.refusal !== 'level-written') out.push(`rule 4a: an answer carrying a key named evidence answered refusal=${String(r.levelKey?.refusal)}, and R1 refuses that key anywhere in the answer`);
  if (r.brokenRow?.kept !== 'kept') out.push(`rule 4b: one unresolvable citation refused the whole answer (${String(r.brokenRow?.refusal)}), and R2 drops the ROW`);
  if (r.brokenRow?.claims !== 6) out.push(`rule 4b: the row was not dropped whole: ${String(r.brokenRow?.claims)} claims stood of seven, and a claim that keeps its sentence while losing the citation that justified it is worse than no claim`);
  if ((r.brokenRow?.rowsDropped ?? 0) !== 1) out.push(`rule 4b: rowsDropped reads ${String(r.brokenRow?.rowsDropped)} and one row was dropped`);
  if (typeof r.brokenRow?.dropped !== 'string' || !r.brokenRow.dropped.includes('src/main/nope.ts:1')) {
    out.push(`rule 4b: the dropped row's sentence does not name the citation that broke it: ${String(r.brokenRow?.dropped)}`);
  }
  if (r.allBroken?.kept !== null || r.allBroken?.refusal !== 'no-row-stood') out.push(`rule 4b: an answer with nothing left answered kept=${String(r.allBroken?.kept)} refusal=${String(r.allBroken?.refusal)}, and an answer with no row left is a failure rather than an empty reading`);
  if (r.invented?.kept !== null || r.invented?.refusal !== 'invented-number') out.push(`rule 4c: three numbers no line of the block carries answered refusal=${String(r.invented?.refusal)}`);
  if (r.keptNumbers?.kept !== 'kept') out.push(`rule 4c: numbers the block really carries as tokens were refused (${String(r.keptNumbers?.refusal)}), so the digit rule refuses honest prose`);
  const nr = answer.numberRule ?? {};
  // The pair is read through the SHIPPING validator, one answer per planted
  // number against a block carrying research 118's own two decoys, so an
  // ablation that puts the token set back to a substring MOVES it. Reading it
  // with a regex of this gate's own would have been a tautology.
  if (nr.shippingCaught !== 3) {
    out.push(`rule 4c: the SHIPPING validator caught ${String(nr.shippingCaught)} of research 118's three planted numbers over a block carrying its two decoys, and the token form catches three: ${JSON.stringify(nr.perNumber)}`);
  }
  if (nr.caughtAsSubstring !== 1) out.push(`rule 4c: the substring form caught ${String(nr.caughtAsSubstring)} of three and research 118 measured it at 1; the decoys are the fixture name p117-lost-9 and the address 192.0.2.1, and 4096 is the one BOTH forms catch`);

  return out;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join(repoRoot, '.p259-conformance-'));
let answers = {};
try {
  const roots = [{ name: 'shipping', root: join(repoRoot, 'src') }];
  const notFound = [];
  for (const [i, edit] of ABLATIONS.entries()) {
    const root = join(scratch, `ablation-${String(i)}`);
    const why = ablatedCopy(root, edit);
    if (why !== null) {
      notFound.push(`rule 12: the ablation "${edit.name}" ${why}; the clause it removes is ${edit.clause}`);
      continue;
    }
    roots.push({ name: `ablation-${String(i)}`, root });
  }
  for (const line of notFound) fail(line);
  const started = Date.now();
  answers = runProbe(roots);
  say(`${TAG} composed ${String(roots.length)} module trees over the committed fixtures in ${String(Date.now() - started)} ms`);

  const shipping = answers.shipping;
  const problems = pin(shipping);
  for (const p of problems) fail(p);
  if (problems.length === 0) {
    say(`${TAG} rule 1: ${String(shipping.block.factLines)} fact lines, ${String(shipping.block.bytes)} block bytes, ${String(shipping.block.promptBytes)} prompt bytes, honest zeroes ${JSON.stringify(shipping.block.zeroes)}, byte identical over reversed inputs`);
    say(`${TAG} rule 1b: the crowded part allocated ${JSON.stringify(shipping.crowded.byCategory)} inside ${String(shipping.crowded.factLines)} lines and ${String(shipping.crowded.promptBytes)} bytes`);
    say(`${TAG} rule 3: ${String(shipping.grammar.refused.length)} hostile citations refused, ${String(shipping.grammar.accepted.length)} real ones graded, the ladder ${GRADES.join(' > ')}`);
    say(`${TAG} rule 4c: the TOKEN form caught ${String(shipping.numberRule.caughtAsToken)} of 3 against the substring form's ${String(shipping.numberRule.caughtAsSubstring)} of 3`);
    say(`${TAG} rule 5a: the floor reads ${String(shipping.floor.within)} of ${String(shipping.floor.lines)} lines, and this gate's own sweep agrees`);
  }

  // Rule 7, the planted battery. The CAUGHT number is MEASURED and pinned.
  const caughtPin = fixture('caught');
  const plants = shipping?.plants ?? null;
  if (!Array.isArray(plants)) {
    fail('rule 7: the seven planted lies did not run against the shipping validator');
  } else {
    const caught = plants.filter((p) => p.caught).map((p) => p.id);
    if (writeCaught) {
      writeFileSync(
        join(fixturesDir, 'caught.json'),
        `${JSON.stringify({ _what: caughtPin._what, caught: caught.length, of: plants.length, measuredOn: new Date().toISOString().slice(0, 10), by: caught }, null, 1)}\n`
      );
      say(`${TAG} rule 7: --write-caught wrote ${String(caught.length)} of ${String(plants.length)}, being ${caught.join(', ') || '(none)'}`);
    } else if (caughtPin.caught === null) {
      fail(`rule 7: build/fixtures/semantic/caught.json has never been measured. The seven planted lies answered ${String(caught.length)} of ${String(plants.length)} here, being ${caught.join(', ') || '(none)'}; run this gate with --write-caught in the same commit and say the number in the commit body and on the face`);
    } else {
      if (caught.length !== caughtPin.caught) {
        fail(`rule 7: the seven planted lies were caught ${String(caught.length)} of ${String(plants.length)} and the pin reads ${String(caughtPin.caught)}. A build that moves that number moves caught.json in the same commit and says so on the face, because the checker is not a lie detector and the face admits it`);
      }
      if (JSON.stringify(caught) !== JSON.stringify(caughtPin.by ?? [])) {
        fail(`rule 7: the SHAPES caught moved from ${JSON.stringify(caughtPin.by)} to ${JSON.stringify(caught)}; the count alone would have hidden it`);
      }
      const missed = plants.filter((p) => !p.caught).map((p) => p.id);
      say(`${TAG} rule 7: ${String(caught.length)} of ${String(plants.length)} planted lies caught, being ${caught.join(', ') || '(none)'}; the ${String(missed.length)} a confident wrong reading looks like are ${missed.join(', ') || '(none)'}`);
    }
    // THE FACE HAS TO SAY THE SAME NUMBER, or the limit is documented and not
    // stated. It is asked as the PHRASE rather than as the digit, because a
    // file that happens to carry a 3 in a contrast ratio is not a file that
    // admits what the checker misses. Research 118 measured its OWN checker at
    // 2 of 7; this product's refusals are not that checker, so a face that
    // still says two is saying something that was never measured here.
    const phrase = `${String(caughtPin.caught)} of ${String(caughtPin.of)}`;
    const faceFiles = ['src/renderer/arch/copy.ts', 'src/renderer/arch/cite.ts', 'src/renderer/arch/ArchJourneys.tsx', 'src/renderer/arch/ArchClaim.tsx']
      .map((rel) => ({ rel, text: read(rel) }))
      .filter((f) => f.text !== null);
    if (caughtPin.caught !== null && faceFiles.length > 0 && !faceFiles.some((f) => f.text.includes(phrase))) {
      fail(
        `rule 7: none of ${faceFiles.map((f) => f.rel.split('/').pop()).join(', ')} says "${phrase}". §9 limit 1 is a ` +
          `STATED limit rather than a documented one, and the number these modules state has to be the one THIS ` +
          `product's refusals measure over build/fixtures/semantic/plants.json, rather than research 118's own ` +
          `checker's reading of its own pass. A header sentence satisfies this rule: the point is that a later round ` +
          `reading the chip's own module is told the measured figure and not a neighbouring one. Caught here: ` +
          `${(caughtPin.by ?? []).join(', ')}`
      );
    }
  }

  // Rule 12: every ablation red.
  for (const [i, edit] of ABLATIONS.entries()) {
    const answer = answers[`ablation-${String(i)}`];
    if (answer === undefined) continue;
    const red = pin(answer);
    if (red.length === 0) fail(`rule 12: with ${edit.name} ablated, every pin still passed, so the pins cannot fail`);
    else say(`${TAG} rule 12: with ${edit.name} ablated, ${String(red.length)} pin(s) went red, the first being: ${red[0].slice(0, 160)}`);
  }
} catch (err) {
  fail(`the probe run did not finish: ${String(err).slice(0, 600)}`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// The scans. These ask questions of the real source and need no probe.
// ---------------------------------------------------------------------------

// Rule 2c: no field of a repository reaches any argv, over the two new rows.
{
  const recipes = read('src/main/overview/fold/recipes.ts');
  if (recipes === null) fail('rule 2c: src/main/overview/fold/recipes.ts is not there');
  else {
    const clean = stripComments(recipes);
    for (const name of ['SEMANTIC_CLAUDE_DRAFT', 'SEMANTIC_CODEX_DRAFT']) {
      if (!clean.includes(name)) fail(`rule 2c: ${name} is not in the recipe table`);
    }
    // The two argvs are the arch and fold rows' own, by reference, so there is
    // ONE containment set rather than two that drift.
    if (!/argv:\s*ARCH_CLAUDE_RECIPE\.argv/.test(clean)) fail("rule 2c: the claude semantic row spells its own argv; §4.2 shares ARCH_CLAUDE_RECIPE's byte for byte so the containment set cannot drift");
    if (!/argv:\s*CODEX_RECIPE\.argv/.test(clean)) fail("rule 2c: the codex semantic row spells its own argv; §4.2 shares CODEX_RECIPE's byte for byte");
    say(`${TAG} rule 2c: both semantic rows share the measured containment argv by reference rather than re-spelling it`);
  }
}

// Rules 10a to 10d: measured or disabled, made mechanical.
{
  const recipes = read('src/main/overview/fold/recipes.ts');
  const clean = recipes === null ? '' : stripComments(recipes);
  const measuredDir = join(repoRoot, 'build', 'p259', 'measured');
  const drafts = [...clean.matchAll(/const (SEMANTIC_\w+_DRAFT): FoldRecipeDraft = \{([\s\S]*?)\n\};/g)].map((m) => ({ name: m[1], body: m[2] }));
  if (drafts.length !== 2) fail(`rule 10a: ${String(drafts.length)} semantic draft(s) found and §4.2 writes two`);
  let live = 0;
  for (const draft of drafts) {
    const agentId = /agentId:\s*'([^']+)'/.exec(draft.body)?.[1] ?? null;
    const measuredOn = /measuredOn:\s*(null|'([^']*)')/.exec(draft.body);
    const suggested = /suggestedModel:\s*'([^']+)'/.exec(draft.body)?.[1] ?? null;
    if (agentId === null) {
      fail(`rule 10a: ${draft.name} names no agentId`);
      continue;
    }
    if (measuredOn === null) {
      fail(`rule 10a: ${draft.name} carries no measuredOn field at all`);
      continue;
    }
    const date = measuredOn[2] ?? null;
    const recordPath = join(measuredDir, `${agentId}.json`);
    if (date === null) {
      // 10b: a row with no record is a DRAFT and cannot be in the live table.
      // A RECORD IS NOT A MEASUREMENT, and the difference is the record's own
      // totals rather than its existence. A run that spawned and KEPT nothing
      // measured nothing, and the honest thing is to keep its record and leave
      // the row disabled: on 2026-09-12 the claude row answered
      // `Not logged in · Please run /login` on every ask it started, because
      // Claude Code 2.1.269 only sees the person's login under their real home
      // and the harness runs Tortie under a scratch one. Deleting that record
      // to satisfy this rule would erase the only evidence of why the row is
      // off, so the rule reads the file instead.
      if (existsSync(recordPath)) {
        let kept = null;
        try {
          kept = JSON.parse(readFileSync(recordPath, 'utf8'))?.totals?.kept ?? null;
        } catch {
          kept = null;
        }
        if (kept === null) {
          fail(`rule 10b: build/p259/measured/${agentId}.json is there and unreadable, so it cannot say whether ${draft.name} was measured`);
        } else if (kept > 0) {
          fail(`rule 10b: build/p259/measured/${agentId}.json records ${String(kept)} kept answer(s) and ${draft.name} still reads measuredOn: null; a row that measured something carries its date`);
        } else {
          say(`${TAG} rule 10b: ${draft.name} has a record that kept NOTHING, so the row is correctly disabled and the record says why`);
        }
      }
      say(`${TAG} rule 10b: ${draft.name} is unmeasured, so it is not in the live table and Settings reads not-measured`);
      continue;
    }
    live += 1;
    if (!existsSync(recordPath)) {
      fail(`rule 10a: ${draft.name} reads measuredOn ${date} and there is no record at build/p259/measured/${agentId}.json; "measured the way the shipped one was, or it stays not-measured and disabled" is what this rule is`);
      continue;
    }
    const record = JSON.parse(readFileSync(recordPath, 'utf8'));
    if (record.agentId !== agentId) fail(`rule 10a: ${recordPath} records agentId ${String(record.agentId)} and the row reads ${agentId}`);
    if (record.measuredOn !== date) fail(`rule 10a: ${recordPath} records measuredOn ${String(record.measuredOn)} and the row reads ${date}`);
    if (record.dryRun === true) fail(`rule 10a: ${recordPath} is a DRY RUN record, and a dry run spends no token and measures no model`);
    if (record.model !== undefined && suggested !== null && record.model !== suggested) {
      fail(`rule 10a: ${recordPath} measured the model ${String(record.model)} and the row suggests ${suggested}`);
    }
    if (!Array.isArray(record.asks) || record.asks.length === 0) fail(`rule 10a: ${recordPath} records no asks, and the reading is the asks`);
  }
  // 10c
  if (!/suggestedModel:\s*'opus'/.test(clean)) fail("rule 10c: the claude semantic row does not suggest `opus`, which is the model the operator named and a name the installed claude CLI accepts");
  if (!/suggestedModel:\s*'gpt-6-astra'/.test(clean)) fail("rule 10c: the codex semantic row does not suggest `gpt-6-astra`, which is the slug the installed codex CLI's own model catalogue gives GPT-6-Astra");
  if (/suggestedModel:\s*'astra'/.test(clean)) fail("rule 10c: `astra` is not a name the codex CLI accepts; the slug is gpt-6-astra and an unconfirmed name is REPORTED rather than substituted");
  say(`${TAG} rule 10a-c: ${String(drafts.length)} semantic row(s) written down, ${String(live)} measured and in the live table, models opus and gpt-6-astra`);

  // 10d: one system prompt constant, so both recipes are handed the same bytes.
  const compose = read('src/main/arch/enrich/compose.ts');
  if (compose === null) fail('rule 10d: src/main/arch/enrich/compose.ts is not there');
  else {
    const n = [...stripComments(compose).matchAll(/ARCH_SEMANTIC_SYSTEM_PROMPT\s*=/g)].length;
    if (n !== 1) fail(`rule 10d: ARCH_SEMANTIC_SYSTEM_PROMPT is assigned ${String(n)} time(s); one constant is what makes both recipes' bytes identical`);
    const spawn = read('src/main/overview/fold/spawn.ts');
    if (spawn !== null && !stripComments(spawn).includes('systemPromptMode')) {
      fail('rule 10d: spawn.ts no longer decides the flag or the prepend from the recipe, so the two recipes can be handed different bytes');
    }
  }
}

// Rule 5b: no rate is stored or drawn without its floor.
{
  const db = read('src/main/arch/db.ts');
  if (db === null) fail('rule 5b: src/main/arch/db.ts is not there');
  else {
    const table = /CREATE TABLE[^;]*arch_claim_rate[^;]*;/.exec(stripComments(db));
    if (table === null) fail('rule 5b: there is no arch_claim_rate table, so no rate is stored with anything');
    else {
      for (const column of ['floor_within', 'floor_lines', 'floor_by_grade']) {
        if (!table[0].includes(column)) fail(`rule 5b: arch_claim_rate has no ${column} column; §7.3's ruling is made STRUCTURAL, so a rate cannot be stored without its floor`);
      }
    }
  }
  const cite = read('src/renderer/arch/cite.ts');
  if (cite !== null) {
    const body = functionBodyOf(stripComments(cite), 'citeRate');
    if (body === null) fail('rule 5b: src/renderer/arch/cite.ts declares no citeRate, and one formatter that takes BOTH halves is what keeps a rate from being drawn alone');
    else if (!/would be by chance/.test(body)) {
      fail('rule 5b: citeRate composes no chance half, so a rate can be drawn without saying what chance would give');
    }
    const chance = functionBodyOf(stripComments(cite), 'citeChance');
    if (chance === null) fail('rule 5b: cite.ts declares no citeChance, and the chance half is the floor over the files the answer cites');
    else if (!/floor/i.test(chance)) fail('rule 5b: citeChance reads no floor, so the number beside a rate is not the floor at all');
  }
}

// Rules 6a and 6c: the chips.
{
  const cite = read('src/renderer/arch/cite.ts');
  if (cite === null) fail('rule 6a: src/renderer/arch/cite.ts is not there');
  else {
    const clean = stripComments(cite);
    const rows = [...clean.matchAll(/(?:'([a-z-]+)'|([a-z-]+)):\s*\{\s*icon:\s*'([^']+)',\s*tone:\s*'([^']+)',\s*word:\s*'([^']*)',\s*sentence:\s*'([^']*)'/g)].map((m) => ({
      grade: m[1] ?? m[2],
      icon: m[3],
      tone: m[4],
      word: m[5],
      sentence: m[6]
    }));
    if (rows.length !== 5) fail(`rule 6a: the cite table holds ${String(rows.length)} rows and §6.4 writes five, being the four grades and stale`);
    for (const grade of [...GRADES, 'stale']) {
      if (!rows.some((r) => r.grade === grade)) fail(`rule 6a: the cite table has no row for ${grade}`);
    }
    const seen = new Map();
    for (const row of rows) {
      const key = `${String(row.icon)}|${String(row.word)}`;
      if (seen.has(key)) fail(`rule 6a: ${row.grade} and ${seen.get(key)} share both a glyph and a word, and four grades cannot wear five dresses`);
      seen.set(key, row.grade);
    }
    const call = rows.find((r) => r.grade === 'call-site');
    const decl = rows.find((r) => r.grade === 'declaration');
    if (call !== undefined && decl !== undefined) {
      if (call.icon === decl.icon) fail('rule 6a: a call site and a declaration share a glyph, and §7.3 measures them at 9.6x and 2.46x over chance');
      if (call.word === decl.word) fail('rule 6a: a call site and a declaration share a word');
      if (call.tone === decl.tone) fail('rule 6a: a call site and a declaration share a tone; the declaration is drawn quieter on purpose');
    }
    const tokens = [...new Set([...clean.matchAll(/--[a-z][a-z0-9-]*/g)].map((m) => m[0]))].sort();
    if (JSON.stringify(tokens) !== JSON.stringify(['--status-idle', '--success'])) {
      fail(`rule 6a: src/renderer/arch/cite.ts names ${JSON.stringify(tokens)}; the chip draws in --status-idle and --success and nothing else (D9), so tokens.css does not move and conformance:hue is untouched`);
    }
    say(`${TAG} rule 6a: ${String(rows.length)} chip rows in two tokens, no two sharing a glyph and a word, a call and a declaration differing in all three`);
  }
  // 6c, over the files THIS PHASE writes, derived by name with a floor of
  // four. It is deliberately not every file under src/renderer/arch: the
  // Phase 63 promise checker says "Not checked yet" about a DETERMINISTIC
  // check of its own, which is honest and is not a claim about a model's
  // sentence, and main's own refusal sentences have to be able to say "the
  // answer says how far something is proven" in order to REFUSE it. What this
  // rule owns is the chip and what the chip's own surfaces draw beside it.
  const named = walk(join(repoRoot, 'src', 'renderer', 'arch'), []).filter((f) =>
    /(^|\/)(cite|ArchJourneys|ArchClaim|arch-semantic)\b/.test(f.slice(repoRoot.length))
  );
  if (named.length < 4) fail(`rule 6c: only ${String(named.length)} semantic face file(s) were found, and the set is cite.ts, ArchJourneys, ArchClaim and arch-semantic.css`);
  for (const file of named) {
    const text = stripComments(readFileSync(file, 'utf8'));
    for (const m of text.matchAll(/'([^'\\\n]{12,})'|"([^"\\\n]{12,})"|`([^`\\$\n]{12,})`/g)) {
      const value = m[1] ?? m[2] ?? m[3];
      if (!/[a-z] [a-z]/.test(value)) continue;
      for (const word of claimsTruth(value)) {
        fail(`rule 6c: ${file.slice(repoRoot.length + 1)} can draw "${value.slice(0, 70)}", which says ${word}; attribution is not verification and the face says a fact was found here and nothing stronger`);
      }
    }
  }
  for (const plant of TRUTH_PLANTS) {
    if ((claimsTruth(plant.text).length > 0) !== plant.caught) {
      fail(`rule 6c: the scanner ${plant.caught ? 'missed' : 'caught'} the planted string "${plant.name}"`);
    }
  }
  say(`${TAG} rule 6c: ${String(named.length)} semantic face file(s) draw nothing stronger than a fact was found; the scanner behaved on ${String(TRUTH_PLANTS.length)} plants`);
}

// Rules 8e, 9a, 9b, 9c, 9d: refusal 8, asked structurally.
{
  for (const plant of SPAWN_PLANTS) {
    if ((reachesASpawn(plant.text).length > 0) !== plant.caught) {
      fail(`rule 8e: the scanner ${plant.caught ? 'missed' : 'caught'} the planted text "${plant.name}"`);
    }
  }
  const drift = read('src/main/arch/semantic/drift.ts');
  if (drift === null) fail('rule 8e: src/main/arch/semantic/drift.ts is not there');
  else {
    const body = functionBodyOf(stripComments(drift), 'refreshSemantic');
    if (body === null) fail('rule 8e: semantic/drift.ts declares no refreshSemantic');
    else {
      const hits = reachesASpawn(body);
      for (const h of hits) fail(`rule 8e: refreshSemantic names ${h}; NOTHING re-runs a model because a file changed, and the re-ask is a person's gesture`);
    }
    const clean = stripComments(drift);
    for (const bad of ['node:child_process', 'electron', 'require(']) {
      if (clean.includes(bad)) fail(`rule 8e: semantic/drift.ts names ${bad}, and the refresh is pure`);
    }
  }
  const run = read('src/main/arch/enrich/run.ts');
  if (run === null) fail('rule 9a: src/main/arch/enrich/run.ts is not there');
  else {
    const clean = stripComments(run);
    // The gate is a private method, so it is read by MATCHING BRACES from its
    // own declaration rather than by searching the file for a word.
    const declared = clean.indexOf('private gate(');
    const gate = declared < 0 ? null : blockAt(clean, clean.indexOf('{', clean.indexOf(')', declared)));
    if (gate === null) fail('rule 9c: the runner declares no private gate()');
    else {
      for (const word of ['no-choice', 'not-confirmed', 'no-recipe', 'in-flight', 'suspended']) {
        if (!gate.includes(word)) fail(`rule 9c: the gate no longer refuses on ${word}; the part and journeys scopes take the SAME gate as whole`);
      }
    }
    // 9c: the gate is taken BEFORE anything spawns. The scope may be read
    // above it, because since Phase 259 the scope decides which measured
    // recipe the gate then asks for; what may never move is the gate landing
    // after the spawn.
    const gateAt = clean.indexOf('this.gate(');
    const spawnAt = clean.indexOf('await spawnOne(');
    if (gateAt < 0) fail('rule 9c: the runner never calls this.gate()');
    else if (spawnAt >= 0 && spawnAt < gateAt) {
      fail('rule 9c: the spawn is reached before the gate is taken, so a scope could reach a child around the Phase 23 re-check');
    }
    if (gate !== null && !gate.includes('scope')) {
      fail('rule 9c: the gate no longer reads the scope, so a semantic scope would be gated against the wrong recipe table');
    }
    // 9b: one runner, one channel.
    const spawnSites = [...clean.matchAll(/runFold/g)].length;
    if (spawnSites > 2) fail(`rule 9b: runFold is named ${String(spawnSites)} times in the runner; one default and one import is all there is`);
    // 9d: the confirm re-check reads launchable.
    const confirmed = functionBodyOf(clean, 'archAgentConfirmed');
    if (confirmed === null) fail('rule 9d: the runner declares no archAgentConfirmed');
    else if (!confirmed.includes('harnessConfirmedNow')) fail('rule 9d: archAgentConfirmed no longer asks harnessConfirmedNow, which is the one reading of the Phase 23 gate both surfaces share');
  }
  const options = read('src/main/overview/fold/options.ts');
  if (options !== null) {
    const body = functionBodyOf(stripComments(options), 'harnessConfirmedNow');
    if (body === null) fail('rule 9d: fold/options.ts declares no harnessConfirmedNow');
    else {
      if (!body.includes('entry.launchable')) fail('rule 9d: harnessConfirmedNow no longer asks whether the row is launchable, so a row that cannot run would read as confirmed');
      if (!body.includes("'builtin'")) fail("rule 9d: harnessConfirmedNow no longer answers true for a builtin; refusal 8's gate exists for CONFIGURED agents and a builtin IS the compiled world, which is what lets the measurement go through the shipped gate rather than around it");
    }
  }
  const ipc = read('src/main/arch/ipc.ts');
  if (ipc !== null) {
    const clean = stripComments(ipc);
    if (!clean.includes("'arch:semantic'")) fail('rule 9b: arch:semantic is not registered, and it is the one new READ channel');
    const semanticBody = /'arch:semantic'[\s\S]{0,2000}?\n\s{2}\)/.exec(clean)?.[0] ?? '';
    for (const h of reachesASpawn(semanticBody)) fail(`rule 9b: the arch:semantic registration names ${h}, and it is a READ`);
  }
  say(`${TAG} rule 8e/9: the refresh is pure and spawns nothing, the gate is taken before any spawn and reads the scope, and the confirm re-check still asks launchable and builtin`);
}

// Rule 11: registration.
{
  const pkg = read('package.json') ?? '';
  const checks = read('build/verification-checks.mjs') ?? '';
  if (!pkg.includes('"conformance:semantic"')) fail('rule 11: package.json does not name conformance:semantic');
  if (!checks.includes("'conformance:semantic'")) fail('rule 11: build/verification-checks.mjs does not classify conformance:semantic');
  if (!checks.includes("'measure:semantic'")) fail('rule 11: build/verification-checks.mjs does not classify measure:semantic');
  const listed = spawnSync(process.execPath, [join(repoRoot, 'build', 'assert-electron-teardown.mjs'), '--list'], { encoding: 'utf8', cwd: repoRoot });
  const helperUsers = (listed.stdout ?? '').split('\n').filter(Boolean);
  if (!helperUsers.some((l) => l.includes('measure-semantic.mjs'))) {
    fail(`rule 11: build/p259/measure-semantic.mjs is not among the ${String(helperUsers.length)} scripts the Electron teardown gate derives, and it starts an Electron`);
  }
  const teardown = read('build/assert-electron-teardown.mjs') ?? '';
  const floor = teardown.match(/const HELPER_USER_FLOOR = (\d+);/);
  if (floor === null || Number(floor[1]) !== helperUsers.length) {
    fail(`rule 11: HELPER_USER_FLOOR reads ${floor === null ? 'nothing' : floor[1]} and ${String(helperUsers.length)} scripts reach the helper; a phase that adds an Electron starter raises the floor in the same commit`);
  }
  const baseline = read('docs/audits/contract-baseline.txt');
  if (baseline !== null && !baseline.includes('arch:semantic')) {
    fail('rule 11: docs/audits/contract-baseline.txt does not name arch:semantic; a deliberate contract change regenerates the baseline in the same commit');
  }
  say(`${TAG} rule 11: the gate and the harness are named and classified, and ${String(helperUsers.length)} scripts reach the Electron helper`);
}

if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${TAG} FAIL: ${f}\n`);
  process.exit(1);
}
say(
  `${TAG} OK: the block at its budget and its order, the grammar, the ladder, the floor beside every rate, ` +
    `the three refusals, the planted battery MEASURED, the refresh that spawns nothing, the two rows measured or disabled, ` +
    `${String(ABLATIONS.length)} ablations each red`
);
