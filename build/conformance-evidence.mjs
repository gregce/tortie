#!/usr/bin/env node
/**
 * `npm run conformance:evidence`. The cheap gate on the computed ladder, the
 * units, the regions, the transports, the counts and the worksheet (Phase 258,
 * research 118 §7.2 and §10 Phase 2; the spec is build/p258/SPEC.md §5.1).
 *
 * WHAT IT IS FOR. Every part of the map now carries a RUNG, one of five words
 * a reader will believe — `reached` and `tested` say something about a
 * person's code — and there is no sixth. The rung is a function of the
 * anchors, the first-party import graph, the entrypoint and test facts and
 * the seeds a unit gives the walk, and of NOTHING a person wrote. Regions
 * come from what a manifest declares and what a program starts, never from
 * `boundary.path.module-root`. Every one of those claims decays the day a
 * clause moves, and a clause moves silently: a manifest file admitted as a
 * seed, `tested` asked before `reached`, a zero dropped from a count. So this
 * gate runs the SHIPPING modules under node over six committed fixture
 * trees and the eight planted graphs of build/fixtures/evidence/rungs.json,
 * pins what they answer against build/fixtures/evidence/expected.json, WHOSE
 * EVERY VALUE WAS DERIVED BY HAND FROM THE SPEC and never from the code, and
 * then runs the same probe over an ablated copy of the modules once per clause
 * and fails unless every copy turns a pin red, naming the clause.
 *
 * IT SPAWNS THE PINNED tsx ONCE FOR THE PROBE RUN and nothing else. No git, no
 * Electron, no tmux, no agent, no request, and it reads nothing under the
 * person's home. The fixtures are data; the file system writes are the ablated
 * copies and rule 7's scratch arch.db, both under a scratch directory at the repository
 * root removed in a finally block. That is why it is `pure` in build/verification-checks.mjs.
 *
 * THE RULES, each printed as it is read.
 *
 *   1a  `ARCH_EVIDENCE_RUNGS` is exactly the five words in order, and a rung
 *       reading carries exactly the six keys of `ArchRungReading`.
 *   1b  the eight planted graphs fire the rung named, 8 of 8, and every one of
 *       the five fires at least once, so a rung that CANNOT fire is told from
 *       one that never did over a corpus where `off-repo` is 0 everywhere.
 *   1c  `accepted-live` and `accepted_live` appear in no source under
 *       src/main/arch, src/shared, src/renderer/arch or src/preload with
 *       comments blanked. Strings are SCANNED, because the word can only ever
 *       reach a rung as a string; a comment may explain the refusal. The
 *       scanner is proved on four planted texts of which two must fail.
 *   2a  the seed rule G: over two-unit, b/src/x.ts reads `composed` because it
 *       is reached only across a unit, and b/src/index.ts reads `reached`
 *       because b's manifest declares it; the box readings say the same.
 *   2b  a manifest file is never a seed: manifest-seed's fold reads `composed`
 *       with 0 seeds, never `reached`.
 *   2c  a CI job, an npm script, a compose service and a worker start never
 *       seed: the same tree carries one of each and nothing reads `reached`.
 *   2d  a seed nobody tracks starts nothing: the eighth planted graph.
 *   3a  rule Q over one-unit: one region, `oneThing`, the Q4 sub, and the
 *       starts line's two workers.
 *   3b  over two-unit: two unit regions and no Elsewhere; over elsewhere: the
 *       docs box and the fold in Elsewhere, which holds no start.
 *   3c  module-root: two-unit with 75 planted `boundary.path.module-root`
 *       facts composes BYTE IDENTICAL regions, transports and rungs.
 *   3d  the family rule: family's python main makes a unit at its own
 *       directory, a start of the root region, never a seed of the root unit.
 *   3e  the Outside band is present exactly when a spawn, network or port
 *       fact exists; a unit owning no box is a start of its owner.
 *   4   contract independence: the rung of every box, the regions and the
 *       transports are byte identical with a contract loaded whose prose
 *       names every rung word, and with `document: null`.
 *   5   transports re-derived: this gate aggregates the fixture's own edge list
 *       and facts by region itself and compares.
 *   6   counts re-derived from the fixture's facts, and every kind of the five
 *       categories present at zero on every box.
 *   7   the worksheet's answer for a named scope equals the gate rows under
 *       that scope's files, denominators included, through the store's own
 *       `factsOf` and `linkCountsUnder`.
 *   8   determinism: reversed facts, imports and files compose the same bytes.
 *   9   purity: evidence.ts names no `node:`, `electron`, `child_process`,
 *       `fs` or `require(`; the scanner is proved on five planted texts.
 *  10   the floor, structural half: `chromaticPinsFor` on both bases carries
 *       `--success` on `--bg-active` at 3, read by running presets.ts, and
 *       src/renderer/arch/rung.ts names only `--status-idle` and `--success`.
 *  11   registration: package.json names the gate and the probe,
 *       verification-checks.mjs classifies both, and the p258 probe is among
 *       the scripts the Electron teardown gate derives.
 *  12   THE PINS CANNOT FAIL. Every ablation below must turn at least one pin
 *       red; an ablation whose text is not found is a failure naming the
 *       clause, never a throw, so a tree whose clauses moved reports every
 *       one at once.
 */

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments } from './scan-source.mjs';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:evidence]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (message) => failures.push(message);
const say = (line) => process.stdout.write(`${line}\n`);

const TREES = ['one-unit', 'two-unit', 'nested', 'elsewhere', 'manifest-seed', 'family'];
const RUNGS = ['off-repo', 'declared', 'composed', 'reached', 'tested'];
const READING_KEYS = ['anchors', 'parsed', 'reached', 'rung', 'seeds', 'tested'];
const fixturesDir = join(repoRoot, 'build', 'fixtures', 'evidence');
const expected = JSON.parse(readFileSync(join(fixturesDir, 'expected.json'), 'utf8'));
const fixture = (name) => JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), 'utf8'));

// ---------------------------------------------------------------------------
// The ablations, one per clause. `file` is relative to the copy's root, which
// holds `main/**`, `shared/arch.ts` and `renderer/theme/**`. `clause` says
// what the edit removes in the spec's words, so a copy whose text moved can
// be re-targeted without re-reading the spec.
// ---------------------------------------------------------------------------

const ABLATIONS = [
  { name: 'rule 1a, a sixth word appended', clause: 'the five member const array in src/shared/arch.ts (§1.1)', file: 'shared/arch.ts', from: "'reached', 'tested'] as const", to: "'reached', 'tested', 'accepted-live'] as const" },
  { name: 'rule 1b, tested asked before reached', clause: "decide()'s first clause, `reached && tested` (§1.3)", file: 'main/arch/evidence.ts', from: "if (reached && tested) return 'tested';", to: "if (tested) return 'tested';" },
  { name: 'rule 2a, seeds unrestricted by unit', clause: "seedsFor handing a start to its own unit alone (§2.4 rule E)", file: 'main/arch/evidence.ts', from: 'out.get(owner.id)?.add(file);', to: 'for (const every of out.values()) every.add(file);' },
  { name: 'rule 2a, the declared entry dropped', clause: 'seedsFor admitting the file a manifest declares (§2.4 rule D)', file: 'main/arch/evidence.ts', from: 'for (const file of declared) candidates.add(file);', to: 'for (const file of declared) void file;' },
  { name: 'rule 2b, a manifest file admitted as a seed', clause: 'SOURCE_START_KINDS, composition-root and main alone (§2.2 rule B)', file: 'main/arch/evidence.ts', from: "new Set(['composition-root', 'main'])", to: "new Set(['composition-root', 'main', 'package-main'])" },
  { name: 'rule 2c, a CI job admitted as a seed', clause: 'the same set (§2.4 item 2)', file: 'main/arch/evidence.ts', from: "new Set(['composition-root', 'main'])", to: "new Set(['composition-root', 'main', 'ci-job'])" },
  { name: 'rule 2c, an npm script admitted as a seed', clause: 'the same set (§2.4 item 2)', file: 'main/arch/evidence.ts', from: "new Set(['composition-root', 'main'])", to: "new Set(['composition-root', 'main', 'script'])" },
  { name: 'rule 2d, an untracked seed kept', clause: 'reachFrom dropping a seed nobody tracks before the walk (§1.3)', file: 'main/arch/evidence.ts', from: 'if (!tracked.has(s) || seen.has(s)) continue;', to: 'if (seen.has(s)) continue;' },
  { name: 'rule 3a, Q4 removed', clause: 'the one-thing sub (§3.1 Q4)', file: 'main/arch/skeleton.ts', from: "READING_ONE_THING_SUB = 'the one thing this repository builds'", to: "READING_ONE_THING_SUB = 'the one thing'" },
  { name: 'rule 3b, Q2 ownership by the shallowest unit', clause: 'deepestUnitOf sorting deepest first (§3.1 Q2)', file: 'main/arch/evidence.ts', from: '(a, b) => depth(b.dir) - depth(a.dir) ||', to: '(a, b) => depth(a.dir) - depth(b.dir) ||' },
  { name: 'rule 3c, module-root admitted to Q1', clause: 'the library kind test in Q1 (§3.1 Q1)', file: 'main/arch/skeleton.ts', from: "if (f.category !== 'boundary' || f.kind !== 'library') continue;", to: "if (f.category !== 'boundary' || (f.kind !== 'library' && f.kind !== 'module-root')) continue;" },
  { name: 'rule 3d, the family rule dropped', clause: "the python family's manifest list (§3.1 Q1)", file: 'main/arch/skeleton.ts', from: "manifests: ['pyproject.toml', 'setup.py', 'setup.cfg']", to: "manifests: ['package.json', 'pyproject.toml', 'setup.py', 'setup.cfg']" },
  { name: 'rule 3e, the Outside band always drawn', clause: 'Q6, the band drawn only when a spawn, network or port fact exists', file: 'main/arch/skeleton.ts', from: 'if (outsideOwed) {', to: 'if (outsideOwed || true) {' },
  { name: 'rule 4, the rung read from the contract', clause: 'D1, the rung a function of nothing a person wrote', file: 'main/arch/map.ts', from: 'rung: evidence.rungOfFiles(group.files),', to: "rung: input.document !== null ? { ...evidence.rungOfFiles(group.files), rung: 'tested' as const } : evidence.rungOfFiles(group.files)," },
  { name: 'rule 5, imports counted from unresolved edges too', clause: 'the resolved slice, first-party with a toPath (§3.2)', file: 'main/arch/map.ts', from: "if (fact.toPath !== null && fact.resolution === 'first-party') {", to: 'if (fact.toPath !== null) {' },
  { name: 'rule 6, zeros dropped from the counts', clause: 'every kind of the five categories present at zero (§4.1)', file: 'main/arch/map.ts', from: 'for (const kind of ARCH_FACT_KINDS[category]) kinds[kind] = 0;', to: 'for (const kind of ARCH_FACT_KINDS[category].slice(0, 1)) kinds[kind] = 0;' },
  { name: "rule 7, factsOf's category filter widened", clause: 'the store reader answering only the categories asked (§6 A)', file: 'main/arch/db.ts', from: 'WHERE f.repo_key = ? AND a.category IN (${marks})', to: 'WHERE f.repo_key = ? AND (1 = 1 OR a.category IN (${marks}))' },
  { name: 'rule 8, the transports left in fact order', clause: 'every transport sorted (from, to, kind) so the bytes are stable (§3.2)', file: 'main/arch/map.ts', from: "(a.from < b.from ? -1 : a.from > b.from ? 1 : 0) ||\n        (a.to < b.to ? -1 : a.to > b.to ? 1 : 0) ||\n        (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0)", to: '0' },
  { name: 'rule 9, a platform reach planted in evidence.ts', clause: 'D1, evidence.ts pure', file: 'main/arch/evidence.ts', prepend: "import { readFileSync as __p258 } from 'node:fs';\nvoid __p258;\n" },
  { name: 'rule 10, the pin removed', clause: 'RUNG_PINS on both bases (§4.7)', file: 'renderer/theme/presets.ts', from: "{ token: '--success', ground: '--bg-active', floor: 3 }", to: '' }
];

/**
 * A copy of src/main (less its tests), src/shared/arch.ts and
 * src/renderer/theme, under `<root>`, with one edit applied. The probe reads
 * `shared/arch.ts` and `renderer/theme/presets.ts` from the copy when the
 * copy carries them, so an ablation of either can bite; `@shared/*` inside
 * the copied main tree still resolves to the shipping tree through
 * tsconfig.node.json, which is fine because the pins on those two modules
 * read their exports directly.
 */
function ablatedCopy(root, edit) {
  mkdirSync(join(root, 'shared'), { recursive: true });
  mkdirSync(join(root, 'renderer'), { recursive: true });
  cpSync(join(repoRoot, 'src', 'main'), join(root, 'main'), { recursive: true, filter: (source) => !source.includes('__tests__') });
  cpSync(join(repoRoot, 'src', 'shared', 'arch.ts'), join(root, 'shared', 'arch.ts'));
  cpSync(join(repoRoot, 'src', 'renderer', 'theme'), join(root, 'renderer', 'theme'), { recursive: true, filter: (source) => !source.includes('__tests__') });
  const target = join(root, edit.file);
  if (!existsSync(target)) return `${edit.file} is not in the copy`;
  const before = readFileSync(target, 'utf8');
  if (edit.prepend !== undefined) {
    writeFileSync(target, edit.prepend + before);
    return null;
  }
  if (!before.includes(edit.from)) return `found nothing to edit in ${edit.file} for "${edit.from.slice(0, 60)}"`;
  writeFileSync(target, before.replace(edit.from, edit.to));
  return null;
}

function runProbe(roots, scratch) {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/evidence-conformance-probe.mts', JSON.stringify({ roots, scratch })],
    { encoding: 'utf8', cwd: repoRoot, maxBuffer: 256 * 1024 * 1024 }
  );
  if (probe.status !== 0) throw new Error(`the probe did not run: ${(probe.stderr || '(no output)').slice(0, 2000)}`);
  const line = probe.stdout.trim().split('\n').pop() ?? '';
  return JSON.parse(line);
}

// ---------------------------------------------------------------------------
// The re-derivations rules 5 and 6 make from the fixture alone
// ---------------------------------------------------------------------------

/** The region each tracked file sits in, from the pinned regions and rule P's box files. */
function regionOfFile(tree, boxFiles) {
  const byFile = new Map();
  for (const region of tree.regions) {
    for (const groupId of region.groupIds) for (const f of boxFiles[groupId] ?? []) byFile.set(f, region.id);
  }
  return (file) => byFile.get(file) ?? null;
}

/** Rule 5 from the fixture: what the transports must read, with no help from the code. */
function deriveTransports(name, boxFiles) {
  const fx = fixture(name);
  const want = expected[name];
  const where = regionOfFile(want, boxFiles);
  const counts = new Map();
  const bump = (from, to, kind) => {
    const key = `${from}|${to}|${kind}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (const edge of fx.imports) {
    if (edge.toPath === null || edge.resolution !== 'first-party') continue;
    const a = where(edge.fromPath);
    const b = where(edge.toPath);
    if (a !== null && b !== null && a !== b) bump(a, b, 'imports');
  }
  for (const f of fx.facts) {
    const r = where(f.file);
    if (r === null) continue;
    if (f.category === 'effect' && f.kind === 'spawn') bump(r, 'outside', 'spawns');
    if (f.category === 'network' && f.kind === 'client') bump(r, 'outside', 'reaches');
    if ((f.category === 'network' && f.kind === 'listen') || (f.category === 'surface' && f.kind === 'port')) bump('outside', r, 'listens');
  }
  return [...counts].map(([k, n]) => `${k}|${String(n)}`).sort();
}

/** Rule 6 from the fixture: the non-zero counts per box. */
function deriveCounts(name, boxFiles) {
  const fx = fixture(name);
  const out = {};
  for (const [groupId, files] of Object.entries(boxFiles)) {
    const set = new Set(files);
    const table = {};
    for (const f of fx.facts) {
      if (!set.has(f.file) || !['surface', 'store', 'effect', 'network', 'gate'].includes(f.category)) continue;
      table[`${f.category}.${f.kind}`] = (table[`${f.category}.${f.kind}`] ?? 0) + 1;
    }
    out[groupId] = table;
  }
  return out;
}

const sortedJson = (o) => JSON.stringify(o, Object.keys(o).sort());

// ---------------------------------------------------------------------------
// The pins over one probe answer, as a list of problems
// ---------------------------------------------------------------------------

function pin(got) {
  const problems = [];
  if (got === undefined || 'error' in got) return [`the probe answered ${got === undefined ? 'nothing' : got.error}`];
  // 1a
  if (JSON.stringify(got.rungList) !== JSON.stringify(RUNGS)) problems.push(`rule 1a, ARCH_EVIDENCE_RUNGS reads [${(got.rungList ?? []).join(', ')}] and the spec pins [${RUNGS.join(', ')}]`);
  // 1b and 2d
  const fired = new Set();
  for (const c of got.planted ?? []) {
    if (c.got !== c.want) problems.push(`rule 1b, the planted graph "${c.name}" reads ${String(c.got)} and must read ${c.want}`);
    fired.add(c.got);
  }
  for (const r of RUNGS) if (!fired.has(r)) problems.push(`rule 1b, the rung ${r} fires on no planted graph, so it cannot be told from one that never did`);
  const untracked = (got.planted ?? []).find((c) => c.name.includes('rule 2d'));
  if (untracked !== undefined && untracked.seeds !== 0) problems.push(`rule 2d, a seed nobody tracks was counted (${String(untracked.seeds)} seeds)`);
  // Rules 2 to 8 per tree.
  const kindTable = got.kindTable ?? {};
  const allKinds = ['surface', 'store', 'effect', 'network', 'gate'].flatMap((c) => (kindTable[c] ?? []).map((k) => `${c}.${k}`)).sort();
  for (const name of TREES) {
    const want = expected[name];
    const have = got.trees?.[name];
    if (have === undefined) {
      problems.push(`${name}: not composed`);
      continue;
    }
    if (JSON.stringify(have.readingKeys) !== JSON.stringify(READING_KEYS)) problems.push(`${name}: rule 1a, a rung reading carries the keys [${(have.readingKeys ?? []).join(', ')}] and the spec pins [${READING_KEYS.join(', ')}]`);
    // 3a to 3e: regions, oneThing, outside.
    if (have.oneThing !== want.oneThing) problems.push(`${name}: rule 3a, oneThing reads ${String(have.oneThing)} and the fixture pins ${String(want.oneThing)}`);
    if (have.outside !== want.outside) problems.push(`${name}: rule 3e, the Outside band is ${have.outside ? 'drawn' : 'absent'} and the fixture pins it ${want.outside ? 'drawn' : 'absent'}`);
    const wantRegions = [...want.regions].sort((a, b) => (a.id < b.id ? -1 : 1));
    if (JSON.stringify(have.regions) !== JSON.stringify(wantRegions)) {
      const haveIds = (have.regions ?? []).map((r) => `${r.id}:${r.label}:${r.sub}:[${r.groupIds.join(',')}]:${r.starts.map((s) => `${s.kind}@${s.file}:${String(s.line)}`).join(',')}:${String(r.files)}/${String(r.parsed)}`);
      const wantIds = wantRegions.map((r) => `${r.id}:${r.label}:${r.sub}:[${r.groupIds.join(',')}]:${r.starts.map((s) => `${s.kind}@${s.file}:${String(s.line)}`).join(',')}:${String(r.files)}/${String(r.parsed)}`);
      problems.push(`${name}: rule 3 (Q1 to Q7), the regions read [${haveIds.join(' ; ')}] and the fixture pins [${wantIds.join(' ; ')}]`);
    }
    // The rungs, 1b through 3d.
    for (const [groupId, wantRung] of Object.entries(want.rungs)) {
      const haveRung = have.rungs?.[groupId];
      if (JSON.stringify(haveRung) !== JSON.stringify(wantRung)) problems.push(`${name}/${groupId}: rule 2, the rung reads ${JSON.stringify(haveRung)} and the fixture pins ${JSON.stringify(wantRung)}`);
    }
    for (const groupId of Object.keys(have.rungs ?? {})) {
      if (!(groupId in want.rungs)) problems.push(`${name}/${groupId}: a box the fixture does not pin`);
    }
    // 2a per file.
    for (const pf of have.perFile ?? []) {
      if (pf.got !== pf.want) problems.push(`${name}/${pf.file}: rule 2a, over unit ${pf.unitDir}'s own seeds it reads ${String(pf.got)} and must read ${pf.want}`);
    }
    // 4 contract independence.
    const wc = have.withContract ?? {};
    if (JSON.stringify(wc.rungs) !== JSON.stringify(have.rungs)) problems.push(`${name}: rule 4, with a contract loaded the rungs moved: ${JSON.stringify(wc.rungs)} against ${JSON.stringify(have.rungs)}`);
    if (JSON.stringify(wc.regions) !== JSON.stringify(have.regions)) problems.push(`${name}: rule 4, with a contract loaded the regions moved`);
    if (JSON.stringify(wc.transports) !== JSON.stringify(have.transports)) problems.push(`${name}: rule 4, with a contract loaded the transports moved`);
    const paintable = Object.keys(want.rungs).filter((id) => id !== 'other').sort();
    if (JSON.stringify(wc.painted) !== JSON.stringify(paintable)) problems.push(`${name}: rule 4, a contract with one component per box painted [${(wc.painted ?? []).join(', ')}] and every non-fold box should be painted [${paintable.join(', ')}] (F1)`);
    if (JSON.stringify(wc.componentRungs) !== JSON.stringify(paintable)) problems.push(`${name}: rule 4, componentRungs carries [${(wc.componentRungs ?? []).join(', ')}] and the contract's components are [${paintable.join(', ')}]`);
    if (JSON.stringify(have.componentRungs) !== '[]') problems.push(`${name}: rule 4, with no contract componentRungs carries [${(have.componentRungs ?? []).join(', ')}]`);
    // 5 transports, pinned AND re-derived.
    if (JSON.stringify(have.transports) !== JSON.stringify(want.transports)) problems.push(`${name}: rule 5, the transports read [${(have.transports ?? []).join(', ')}] and the fixture pins [${want.transports.join(', ')}]`);
    const derived = deriveTransports(name, have.boxFiles ?? {});
    if (JSON.stringify(derived) !== JSON.stringify(want.transports)) problems.push(`${name}: rule 5, the gate's own aggregation reads [${derived.join(', ')}] and the fixture pins [${want.transports.join(', ')}]; the fixture or the derivation is wrong`);
    // 6 counts, pinned, re-derived, and every kind present.
    const derivedCounts = deriveCounts(name, have.boxFiles ?? {});
    for (const groupId of Object.keys(want.rungs)) {
      const h = have.counts?.[groupId] ?? {};
      const w = want.counts?.[groupId] ?? {};
      const d = derivedCounts[groupId] ?? {};
      if (sortedJson(h) !== sortedJson(w)) problems.push(`${name}/${groupId}: rule 6, the counts read ${sortedJson(h)} and the fixture pins ${sortedJson(w)}`);
      if (sortedJson(d) !== sortedJson(w)) problems.push(`${name}/${groupId}: rule 6, the gate's own count reads ${sortedJson(d)} and the fixture pins ${sortedJson(w)}`);
      if (JSON.stringify(have.kindKeys?.[groupId]) !== JSON.stringify(allKinds)) problems.push(`${name}/${groupId}: rule 6, the box carries the kinds [${(have.kindKeys?.[groupId] ?? []).join(', ')}] and every kind of the five categories must be present at zero: [${allKinds.join(', ')}]`);
    }
    // 7 the worksheet.
    for (const w of want.worksheet ?? []) {
      const h = (have.worksheet ?? []).find((x) => x.scope === w.scope);
      const key = w.scope === null ? 'the whole repository' : w.scope;
      if (h === undefined) {
        problems.push(`${name}: rule 7, no worksheet answer for ${key}`);
        continue;
      }
      if (h.gates !== w.gates || sortedJson(h.byKind) !== sortedJson(w.byKind) || JSON.stringify(h.rows) !== JSON.stringify(w.rows)) problems.push(`${name}: rule 7, the worksheet for ${key} reads ${String(h.gates)} gates ${sortedJson(h.byKind)} [${h.rows.join(', ')}] and the fixture pins ${String(w.gates)} ${sortedJson(w.byKind)} [${w.rows.join(', ')}]`);
      if (h.files !== w.files || h.parsed !== w.parsed) problems.push(`${name}: rule 7, the denominators for ${key} read ${String(h.files)} files, ${String(h.parsed)} parsed and the fixture pins ${String(w.files)}, ${String(w.parsed)}`);
    }
    // 8
    if (have.repeatable !== true) problems.push(`${name}: rule 8, composed from reversed facts the bytes moved`);
  }
  // 3c: module-root planted. The probe composes it as its own tree when asked;
  // here the gate asks for it by comparing the two answers it carries.
  const plant = got.trees?.['module-root-plant'];
  const base = got.trees?.['two-unit'];
  if (plant !== undefined && base !== undefined) {
    for (const k of ['regions', 'transports', 'rungs']) {
      if (JSON.stringify(plant[k]) !== JSON.stringify(base[k])) problems.push(`rule 3c, with 75 module-root facts planted the ${k} moved`);
    }
  }
  // 10, structural half.
  for (const base of ['dark', 'light']) {
    const pins = got.pins?.[base] ?? [];
    if (!pins.includes('--success on --bg-active at 3')) problems.push(`rule 10, chromaticPinsFor('${base}') does not carry --success on --bg-active at 3 (it carries ${String(pins.length)} pins)`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// The scanners, rules 1c and 9, proved on planted texts
// ---------------------------------------------------------------------------

/** Rule 1c. Comments blanked, strings scanned. */
function namesTheSixthRung(source) {
  return /accepted[-_]live/i.test(stripComments(source));
}

const RUNG_PLANTS = [
  { name: 'the word in a comment', text: "// the sixth rung, accepted-live, is refused\nexport const x = 1;\n", caught: false },
  { name: 'an unrelated word', text: "export const accepted = 'live';\n", caught: false },
  { name: 'the word as a string literal', text: "export const y = 'accepted-live';\n", caught: true },
  { name: 'the word as an identifier', text: 'export const accepted_live = 1;\n', caught: true }
];

/** Rule 9. */
function reachesThePlatform(source) {
  const code = stripComments(source);
  const words = ["from 'node:", "from 'electron'", 'child_process', "from 'fs'", 'require('];
  return words.filter((w) => code.includes(w));
}

const PURITY_PLANTS = [
  { name: 'a pure module', text: "import type { X } from '@shared/arch';\nexport const a = 1;\n", caught: false },
  { name: 'a comment naming fs', text: "// never from 'node:fs'\nexport const a = 1;\n", caught: false },
  { name: 'a node import', text: "import { readFileSync } from 'node:fs';\n", caught: true },
  { name: 'electron', text: "import { app } from 'electron';\n", caught: true },
  { name: 'a require', text: "const fs = require('fs');\n", caught: true }
];

function walk(dir, out) {
  for (const entry of readdirSyncSafe(dir)) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') walk(p, out);
    } else if (/\.(ts|tsx|mts)$/.test(entry.name)) out.push(p);
  }
  return out;
}
function readdirSyncSafe(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

// Under the repository root, never the system temp directory, because a copy
// of src/main reaches `better-sqlite3` by a bare specifier and node resolves
// that upward from the copy; `.p[0-9]*/` is in .gitignore and the directory is
// removed in the finally below whatever happened.
const scratch = mkdtempSync(join(repoRoot, '.p258-conformance-'));
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
  const answers = runProbe(roots, scratch);
  say(`${TAG} composed ${String(roots.length)} module trees over ${String(TREES.length)} fixtures and ${String(fixture('rungs').cases.length)} planted graphs in ${String(Date.now() - started)} ms`);

  const shipping = answers.shipping;
  const problems = pin(shipping);
  for (const p of problems) fail(p);
  if (problems.length === 0 && shipping !== undefined && !('error' in shipping)) {
    say(`${TAG} rule 1a: the five rungs [${shipping.rungList.join(', ')}] and the six keys of a reading`);
    say(`${TAG} rule 1b: ${String(shipping.planted.length)} planted graphs fired the rung named, every one of the five at least once`);
    for (const name of TREES) {
      const t = shipping.trees[name];
      const rungs = Object.entries(t.rungs).map(([id, r]) => `${id} ${r.rung}`).join(', ');
      say(`${TAG} ${name}: ${String(t.regions.length)} region(s)${t.oneThing ? ', one thing' : ''}, ${String(t.transports.length)} transport(s), rungs ${rungs}, byte for byte`);
    }
    say(`${TAG} rule 7: the worksheet answered ${String(shipping.trees['one-unit'].worksheet.length)} scopes through the store's own readers`);
    say(`${TAG} rule 10: --success on --bg-active at 3 on both bases`);
  }

  // Rule 12: every ablation red.
  for (const [i, edit] of ABLATIONS.entries()) {
    const answer = answers[`ablation-${String(i)}`];
    if (answer === undefined) continue; // reported above as not found
    if ('error' in answer) {
      fail(`rule 12: with ${edit.name} ablated, the copy did not run: ${String(answer.error).slice(0, 200)}`);
      continue;
    }
    let red = pin(answer);
    // Rule 9's ablation is caught by the scanner, not by a composed pin.
    if (edit.name.startsWith('rule 9')) {
      const copyText = readFileSync(join(scratch, `ablation-${String(i)}`, edit.file), 'utf8');
      const hits = reachesThePlatform(copyText);
      red = hits.length > 0 ? [`rule 9 names ${hits.join(', ')}`] : [];
    }
    if (red.length === 0) fail(`rule 12: with ${edit.name} ablated, every pin still passed, so the pins cannot fail`);
    else say(`${TAG} rule 12: with ${edit.name} ablated, ${String(red.length)} pin(s) went red, the first being: ${red[0].slice(0, 160)}`);
  }

  // Rule 1c over the four directories.
  const dirs = ['src/main/arch', 'src/shared', 'src/renderer/arch', 'src/preload'].map((d) => join(repoRoot, d));
  let scanned = 0;
  for (const dir of dirs) {
    for (const file of walk(dir, [])) {
      scanned += 1;
      if (namesTheSixthRung(readFileSync(file, 'utf8'))) fail(`rule 1c: ${file.slice(repoRoot.length + 1)} names the sixth rung; there is no accepted-live, anywhere, ever`);
    }
  }
  for (const plant of RUNG_PLANTS) {
    if (namesTheSixthRung(plant.text) !== plant.caught) fail(`rule 1c: the scanner ${plant.caught ? 'missed' : 'caught'} the planted text "${plant.name}"`);
  }
  say(`${TAG} rule 1c: ${String(scanned)} source files under the four directories name no sixth rung; the scanner behaved on ${String(RUNG_PLANTS.length)} plants`);

  // Rule 9 over the shipping evidence.ts.
  const evidencePath = join(repoRoot, 'src', 'main', 'arch', 'evidence.ts');
  if (!existsSync(evidencePath)) fail('rule 9: src/main/arch/evidence.ts is not there');
  else {
    const hits = reachesThePlatform(readFileSync(evidencePath, 'utf8'));
    for (const h of hits) fail(`rule 9: src/main/arch/evidence.ts names ${h}, and the ladder is pure`);
  }
  for (const plant of PURITY_PLANTS) {
    if ((reachesThePlatform(plant.text).length > 0) !== plant.caught) fail(`rule 9: the scanner ${plant.caught ? 'missed' : 'caught'} the planted text "${plant.name}"`);
  }
  say(`${TAG} rule 9: evidence.ts is pure; the scanner behaved on ${String(PURITY_PLANTS.length)} plants`);

  // Rule 10, the table half.
  const rungTablePath = join(repoRoot, 'src', 'renderer', 'arch', 'rung.ts');
  if (!existsSync(rungTablePath)) fail('rule 10: src/renderer/arch/rung.ts is not there');
  else {
    const tokens = new Set([...stripComments(readFileSync(rungTablePath, 'utf8')).matchAll(/--[a-z][a-z0-9-]*/g)].map((m) => m[0]));
    for (const t of tokens) {
      if (t !== '--status-idle' && t !== '--success') fail(`rule 10: src/renderer/arch/rung.ts names ${t}; the chip draws in --status-idle or --success and nothing else (D6)`);
    }
    if (!tokens.has('--status-idle') || !tokens.has('--success')) fail(`rule 10: src/renderer/arch/rung.ts names [${[...tokens].join(', ')}] and must name both --status-idle and --success`);
  }

  // Rule 11.
  const pkg = readFileSync(join(repoRoot, 'package.json'), 'utf8');
  const checks = readFileSync(join(repoRoot, 'build/verification-checks.mjs'), 'utf8');
  if (!pkg.includes('"conformance:evidence"')) fail('rule 11: package.json does not name conformance:evidence');
  if (!pkg.includes('"probe:p258"')) fail('rule 11: package.json does not name probe:p258');
  if (!checks.includes("'conformance:evidence'")) fail('rule 11: build/verification-checks.mjs does not classify conformance:evidence');
  if (!checks.includes("'probe:p258'")) fail('rule 11: build/verification-checks.mjs does not classify probe:p258');
  const listed = spawnSync(process.execPath, [join(repoRoot, 'build', 'assert-electron-teardown.mjs'), '--list'], { encoding: 'utf8', cwd: repoRoot });
  const helperUsers = (listed.stdout ?? '').split('\n').filter(Boolean);
  if (!helperUsers.some((l) => l.includes('probe-p258-surface.mjs'))) fail(`rule 11: build/p258/probe-p258-surface.mjs is not among the ${String(helperUsers.length)} scripts the Electron teardown gate derives`);
  const teardownText = readFileSync(join(repoRoot, 'build', 'assert-electron-teardown.mjs'), 'utf8');
  const floor = teardownText.match(/const HELPER_USER_FLOOR = (\d+);/);
  if (floor === null || Number(floor[1]) !== helperUsers.length) fail(`rule 11: HELPER_USER_FLOOR reads ${floor === null ? 'nothing' : floor[1]} and ${String(helperUsers.length)} scripts reach the helper; a phase that adds a probe raises the floor in the same commit`);
  say(`${TAG} rule 11: the gate and the probe are named, classified, and the probe is one of the ${String(helperUsers.length)} scripts the teardown gate derives`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${TAG} FAIL: ${f}\n`);
  process.exit(1);
}
say(
  `${TAG} OK: the five rungs and no sixth, ${String(fixture('rungs').cases.length)} planted graphs, the seed rule G, ` +
    `rule Q's regions, transports and counts re-derived, the worksheet through the store, ` +
    `${String(ABLATIONS.length)} ablations each red, the ladder pure, the floor pinned on both bases, the gate named`
);
