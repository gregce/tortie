#!/usr/bin/env node
/**
 * probe-p258-surface.mjs. The reading surface driven in the running app over
 * scratch copies of this repository and of stoa, at HEAD and at the parent
 * (Phase 258, spec §5.3).
 *
 * ## What it proves, and why the gate cannot
 *
 * `npm run conformance:evidence` pins the ladder, the units, the regions, the
 * transports, the counts and the worksheet over six fixture trees under node.
 * What it cannot hold is that the SHIPPED app draws those numbers on a real
 * repository and that a person's gestures reach them. So this probe launches
 * ONE Electron on a scratch profile with the Architecture switch pre-written
 * on and `agentId: null`, which IS the no-agent configuration, so every arm
 * below is research 118 §7.6's agnosticism floor made visible:
 *
 *   A regions    the map's region frames, subs, starts line and Outside band
 *                wires, read off the DOM, against the fact counts in arch.db
 *   B rungs      every box's `data-rung` against the gate's OWN computation,
 *                build/evidence-conformance-probe.mts run in process over the
 *                same clone's fact file and edge list
 *   C inspector  a single click selects; the seven rows against arch.db; the
 *                Exposes disclosure's rows; Open drills; Escape clears
 *   D surfaces   six kinds on every row, zeros present and muted, counts
 *                against arch.db, the denominator per region against the
 *                partition
 *   E worksheet  a part named in the select, the answer against arch.db, one
 *                kind unticked, the whole repository
 *   F words      innerText above the fold at 1440×900 against §4.5's caps
 *   G menus      show-arch-surfaces and show-arch-gates injected on the real
 *                channel land on the named inner tab of the ONE map tab
 *   H colour     every chip's computed colour is --status-idle or --success
 *   I draft      arch:seed on the tortie clone, then the overlay paints every
 *                non-fold box (F1 closed)
 *   P parent     with P258_PARENT_CHECKOUT naming a BUILT worktree at the
 *                parent, a SECOND Electron from that checkout on a profile of
 *                its own, one after the other and never at once: 0 region
 *                frames, 0 chips, no inspector, no inner tab row, and the
 *                drafted contract painting 0 boxes (F1 at the parent).
 *
 * Findings are counted per arm; expected 0 at HEAD and at least 4 at the
 * parent. `--self-test` proves every grader on planted DOM readings and
 * launches nothing.
 *
 * ## Safety
 *
 * Without GMUX_TMUX_SOCKET beginning `gmux-p258` it refuses; run outside the
 * harness it makes `gmux-p258-<pid>` itself and unlinks that socket file in
 * its finally block. Every clone lives under GMUX_HARNESS_DIR/p258/repos and
 * is removed by corpus.sh in the finally block; /Users/gdc/stoa is only ever
 * a clone source; /Users/gdc/runstory and /Users/gdc/specfactory are refused
 * by name in corpus.sh and never named here. HOME is inside the scratch
 * directory. Every Electron is ended by withElectron's finally block whatever
 * happened. No agent is spawned, no token spent, no keychain opened, no
 * request made, no machine reached. The operator's `-L gmux` server is
 * counted before and after and must be unchanged. `npm run shot` is never
 * run.
 *
 * Usage, from the worktree root:
 *   npm run probe:p258
 *   P258_PARENT_CHECKOUT=<built worktree at the parent> npm run probe:p258
 *   node build/p258/probe-p258-surface.mjs --self-test      (launches nothing)
 *
 * Exit 0 when every check passes, 1 otherwise, 2 when the probe refuses.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { withElectron } from '../electron-run.mjs';
import { seedArchSwitchOn } from '../probe-arch-switch.mjs';
import { tsxCli } from '../ts-runner.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => process.stdout.write(`${line}\n`);
const require = createRequire(import.meta.url);

/** §4.5's resting-face budgets, in words. */
export const WORD_CAPS = { map: 300, surfaces: 220, gates: 120 };

// ---------------------------------------------------------------------------
// The graders, pure, proved by --self-test. Each answers a list of findings.
// ---------------------------------------------------------------------------

const n = (s) => Number(String(s ?? '').replace(/,/g, ''));

/** Arm A over the tortie clone: one region, one thing, eight boxes, two workers, the outside wires. */
export function gradeTortieRegions(map, factCounts) {
  const out = [];
  const units = (map.regions ?? []).filter((r) => r.kind === 'unit');
  if (units.length !== 1) out.push(`A: ${units.length} unit region frame(s) drawn, and this repository builds one thing`);
  const one = units[0];
  if (one !== undefined) {
    if (one.label !== 'tortie') out.push(`A: the one region is labelled "${one.label}", not tortie`);
    if (one.sub !== 'the one thing this repository builds') out.push(`A: the one region's sub reads "${one.sub}"`);
    if (one.boxes !== 8) out.push(`A: the one region holds ${one.boxes} boxes, not 8`);
    // The starts line is graded against arch.db's boundary facts by kind
    // rather than against a literal: the spec's `starts 2 workers` was a
    // miscount (this repository's own test files and the Phase 257 fixtures
    // under build/fixtures/facts carry workers, threads, a process and
    // compose services, which Q5 counts on purpose as the noise a reader
    // should see), so the probe asks what the facts say and what the line
    // says and holds the two together.
    const line = String(one.starts ?? '');
    if (!line.startsWith('starts ')) out.push(`A: the starts line reads "${line}" and does not begin with starts`);
    const said = (word) => {
      const m = new RegExp(`(\\d[\\d,]*) ${word}`).exec(line);
      return m === null ? 0 : n(m[1]);
    };
    for (const [kind, word] of [['worker', 'workers?'], ['thread', 'threads?'], ['process', 'process(?:es)?\\b'], ['service', 'compose services?']]) {
      const want = factCounts.boundary?.[kind] ?? 0;
      if (said(word) !== want) out.push(`A: the starts line says ${said(word)} ${kind}(s) and arch.db holds ${want} boundary.${kind} fact(s)`);
    }
  }
  if ((map.regions ?? []).some((r) => r.kind === 'elsewhere')) out.push('A: an Elsewhere region is drawn on a one-unit repository');
  const outside = (map.regions ?? []).find((r) => r.kind === 'outside');
  if (outside === undefined) out.push('A: no Outside band, and this repository spawns and reaches');
  const wire = (kind) => (map.wires ?? []).find((w) => w.kind === kind);
  for (const [kind, want] of [['spawns', factCounts.spawn], ['reaches', factCounts.client]]) {
    const w = wire(kind);
    if (w === undefined) out.push(`A: no ${kind} wire to the Outside band`);
    else if (w.count !== want) out.push(`A: the ${kind} wire reads ${w.count} and arch.db holds ${want}`);
  }
  const listens = wire('listens');
  const wantListens = (factCounts.listen ?? 0) + (factCounts.port ?? 0);
  if (wantListens > 0 && (listens === undefined || listens.count !== wantListens)) out.push(`A: the listens wire reads ${listens?.count ?? 'nothing'} and arch.db holds ${wantListens}`);
  return out;
}

/** Arm A over the stoa clone: the shape the spec measured, read from the DOM regions. */
export function gradeStoaRegions(map) {
  const out = [];
  const regions = map.regions ?? [];
  if (regions.filter((r) => r.kind === 'unit').length < 6) out.push(`A/stoa: ${regions.filter((r) => r.kind === 'unit').length} unit regions, fewer than 6`);
  const web = regions.find((r) => r.id === 'unit:stoa-web');
  if (web === undefined) out.push('A/stoa: no unit:stoa-web region');
  else {
    // Q2 gives a box to the DEEPEST unit whose directory holds it, and
    // stoa-web/livekit-agent and stoa-web/livekit-teammate-agent are units
    // of their own (SPEC §2.3), so a stoa-web-* box sits in stoa-web or in a
    // unit under it, never anywhere else.
    const stray = (map.boxes ?? [])
      .filter((b) => b.id.startsWith('stoa-web') && b.region !== 'unit:stoa-web' && !String(b.region ?? '').startsWith('unit:stoa-web/'))
      .map((b) => b.id);
    if (stray.length > 0) out.push(`A/stoa: stoa-web-* boxes outside unit:stoa-web: ${stray.join(', ')}`);
  }
  for (const id of ['unit:packages/agent-sandbox', 'unit:packages/testing-core']) {
    const r = regions.find((x) => x.id === id);
    if (r === undefined) out.push(`A/stoa: no ${id} region`);
    else if (r.boxes !== 1) out.push(`A/stoa: ${id} holds ${r.boxes} boxes, not 1`);
  }
  const elsewhere = regions.find((r) => r.kind === 'elsewhere');
  if (elsewhere === undefined) out.push('A/stoa: no Elsewhere region');
  else {
    const held = new Set((map.boxes ?? []).filter((b) => b.region === 'elsewhere').map((b) => b.id));
    for (const id of ['docs', 'scripts', 'stoa-helpers-darwin', 'stoa-desktop-mac']) {
      if (!held.has(id)) out.push(`A/stoa: ${id} is not in Elsewhere`);
    }
  }
  return out;
}

/** Arm B: every box's data-rung against the gate's own computation, per group id. */
export function gradeRungs(name, domBoxes, computed) {
  const out = [];
  const byId = new Map(domBoxes.map((b) => [b.id, b]));
  for (const [id, reading] of Object.entries(computed.rungs ?? {})) {
    const box = byId.get(id);
    if (box === undefined) {
      out.push(`B/${name}: the map draws no box ${id}, which the computation has`);
      continue;
    }
    if (box.rung !== reading.rung) out.push(`B/${name}/${id}: the DOM reads ${box.rung ?? 'no rung'} and the computation reads ${reading.rung}`);
    if (typeof box.title !== 'string' || !box.title.includes(`reached ${reading.reached.toLocaleString('en-US')} of ${reading.parsed.toLocaleString('en-US')} parsed`)) {
      out.push(`B/${name}/${id}: the hover does not carry "reached ${reading.reached} of ${reading.parsed} parsed" (it reads "${String(box.title ?? '').slice(0, 80)}")`);
    }
  }
  for (const b of domBoxes) if (!(b.id in (computed.rungs ?? {}))) out.push(`B/${name}: the map draws ${b.id}, which the computation does not have`);
  if (name === 'tortie') {
    const r = byId.get('src-renderer');
    if (r === undefined) out.push('B/tortie: no src-renderer box');
    else {
      if (r.rung !== 'composed') out.push(`B/tortie: src-renderer reads ${r.rung}, and the closed table recognises no renderer root so it must read composed`);
      if (!/reached 0 of [\d,]+ parsed/.test(r.title ?? '')) out.push(`B/tortie: src-renderer's hover does not say 0 reached ("${String(r.title ?? '').slice(0, 80)}")`);
    }
  }
  return out;
}

/** Arm C: the inspector after one click on src-main, against arch.db's counts under its files. */
export function gradeInspector(read, want) {
  const out = [];
  if (read.pressed !== 'src-main') out.push(`C: aria-pressed sits on ${read.pressed ?? 'no box'} after one click on src-main`);
  if (read.crumbs !== 1) out.push(`C: a single click drilled (${read.crumbs} crumbs)`);
  if (read.inspector !== 'src-main') out.push(`C: the inspector follows ${read.inspector ?? 'nothing'}`);
  const nums = (s) => [...String(s ?? '').matchAll(/\d[\d,]*/g)].map((m) => n(m[0])).sort((a, b) => a - b);
  const wantSurface = Object.values(want.surface).filter((v) => v > 0).sort((a, b) => a - b);
  if (JSON.stringify(nums(read.fields.exposes)) !== JSON.stringify(wantSurface)) out.push(`C: Exposes reads "${read.fields.exposes}" and arch.db counts ${JSON.stringify(want.surface)}`);
  const wantStore = Object.values(want.store).filter((v) => v > 0).sort((a, b) => a - b);
  if (JSON.stringify(nums(read.fields.keeps)) !== JSON.stringify(wantStore)) out.push(`C: Keeps reads "${read.fields.keeps}" and arch.db counts ${JSON.stringify(want.store)}`);
  const wantReach = [...Object.values(want.effect), ...Object.values(want.network)].filter((v) => v > 0).sort((a, b) => a - b);
  if (JSON.stringify(nums(read.fields.reaches)) !== JSON.stringify(wantReach)) out.push(`C: Reaches reads "${read.fields.reaches}" and arch.db counts ${JSON.stringify({ ...want.effect, ...want.network })}`);
  const gates = Object.values(want.gate).reduce((a, b) => a + b, 0);
  if (nums(read.fields.guards)[0] !== gates) out.push(`C: Guards reads "${read.fields.guards}" and arch.db holds ${gates} gates`);
  const t = nums(read.fields.tests);
  if (t[0] !== Math.min(want.tested, want.parsed) || t[1] !== Math.max(want.tested, want.parsed)) out.push(`C: Tests reads "${read.fields.tests}" and the computation reads ${want.tested} of ${want.parsed}`);
  if (read.fields.runsIn !== `tortie · the one thing this repository builds`) out.push(`C: Runs in reads "${read.fields.runsIn}"`);
  if (read.word !== want.rung) out.push(`C: the inspector's word is "${read.word}" and the box's rung is ${want.rung}`);
  const surfaceRows = Object.values(want.surface).reduce((a, b) => a + b, 0);
  if (read.disclosedRows !== surfaceRows) out.push(`C: the Exposes disclosure listed ${read.disclosedRows} rows and arch.db holds ${surfaceRows} surface facts under src/main`);
  if (read.afterOpenCrumbs !== 2) out.push(`C: Open did not drill (${read.afterOpenCrumbs} crumbs)`);
  if (read.afterEscapePressed !== null) out.push(`C: Escape left ${read.afterEscapePressed} selected`);
  if (read.afterEscapeInspector !== 'Select a part.') out.push(`C: after Escape the inspector reads "${read.afterEscapeInspector}"`);
  return out;
}

/** Arm D: six kinds on every row, zeros muted, counts against arch.db, denominators against the partition. */
export function gradeSurfaces(read, wantByBox, regionsWant) {
  const out = [];
  const KINDS = ['ipc-channel', 'http-route', 'cli-command', 'cli-flag', 'job', 'port'];
  for (const row of read.rows ?? []) {
    const want = wantByBox[row.id];
    if (want === undefined) {
      out.push(`D: a surfaces row for ${row.id}, which arch.db has no box for`);
      continue;
    }
    const kinds = row.kinds.map((k) => k.kind);
    if (JSON.stringify(kinds) !== JSON.stringify(KINDS)) out.push(`D/${row.id}: the kinds read [${kinds.join(', ')}], not the six in order`);
    for (const k of row.kinds) {
      const w = want[k.kind] ?? 0;
      if (k.count !== w) out.push(`D/${row.id}: ${k.kind} reads ${k.count} and arch.db holds ${w}`);
      if ((k.count === 0) !== k.zero) out.push(`D/${row.id}: ${k.kind} at ${k.count} is ${k.zero ? '' : 'not '}drawn muted`);
    }
  }
  for (const id of Object.keys(wantByBox)) if (!(read.rows ?? []).some((r) => r.id === id)) out.push(`D: no surfaces row for ${id}`);
  for (const region of read.regions ?? []) {
    const want = regionsWant[region.id];
    if (want === undefined) continue;
    const m = /read ([\d,]+) of ([\d,]+) files/.exec(region.denominator ?? '');
    if (m === null) out.push(`D/${region.id}: the denominator reads "${region.denominator}"`);
    else if (n(m[1]) !== want.parsed || n(m[2]) !== want.files) out.push(`D/${region.id}: the denominator reads ${m[1]} of ${m[2]} and the partition holds ${want.parsed} of ${want.files}`);
  }
  return out;
}

/** Arm E: the worksheet's answer for src/main, one kind unticked, the whole repository. */
export function gradeGates(read, want) {
  const out = [];
  const total = Object.values(want.srcMain).reduce((a, b) => a + b, 0);
  if (read.named.count !== total) out.push(`E: src/main named reads ${read.named.count} gates and arch.db holds ${total}`);
  const breakdown = ['auth', 'flag', 'refusal', 'guard'].map((k) => `${k} ${want.srcMain[k] ?? 0}`).join(' · ');
  if (!(read.named.text ?? '').includes(breakdown)) out.push(`E: the breakdown reads "${read.named.text}" and arch.db counts "${breakdown}"`);
  if (read.named.rows !== total) out.push(`E: ${read.named.rows} rows drawn for ${total} gates`);
  if (read.unticked.count !== total - (want.srcMain.refusal ?? 0)) out.push(`E: with refusal unticked the count reads ${read.unticked.count}, and ${total} less ${want.srcMain.refusal ?? 0} refusals is ${total - (want.srcMain.refusal ?? 0)}`);
  if (read.whole.count !== want.whole) out.push(`E: the whole repository reads ${read.whole.count} gates and arch.db holds ${want.whole}`);
  return out;
}

/** Arm F: the resting-face word counts against §4.5. */
export function gradeWords(words) {
  const out = [];
  for (const [tab, cap] of Object.entries(WORD_CAPS)) {
    const got = words[tab];
    if (typeof got !== 'number') out.push(`F: no word count for the ${tab} tab`);
    else if (got > cap) out.push(`F: the ${tab} tab carries ${got} words above the fold, past the cap of ${cap}`);
  }
  return out;
}

/** Arm G: each injected menu action lands on its inner tab of the one map tab. */
export function gradeMenus(read) {
  const out = [];
  for (const [action, tab] of [['show-arch-surfaces', 'surfaces'], ['show-arch-gates', 'gates']]) {
    const r = read[action];
    if (r === undefined) {
      out.push(`G: ${action} was not driven`);
      continue;
    }
    if (r.selected !== tab) out.push(`G: ${action} landed on the ${r.selected ?? 'no'} tab, not ${tab}`);
    if (r.mapTabs !== 1) out.push(`G: after ${action} there are ${r.mapTabs} Architecture map tabs, not one`);
  }
  return out;
}

/** Arm H: every chip's computed colour is one of the two tokens' computed values. */
export function gradeColours(read) {
  const out = [];
  const allowed = new Set([read.idle, read.success].map((c) => String(c).replace(/\s+/g, '')));
  if (read.chips === 0) out.push('H: no chip on the map');
  for (const c of read.colours ?? []) {
    if (!allowed.has(String(c).replace(/\s+/g, ''))) out.push(`H: a chip draws in ${c}, which is neither --status-idle (${read.idle}) nor --success (${read.success})`);
  }
  return out;
}

/** Arm I and the parent's P: the draft overlay's painted count. */
export function gradeDraft(read, atParent) {
  const out = [];
  if (read.seeded !== true) out.push(`${atParent ? 'P' : 'I'}: arch:seed wrote nothing (${read.reason ?? 'no reason'})`);
  const nonFold = read.boxes - (read.hasFold ? 1 : 0);
  if (atParent) {
    // F1 at the parent: the draft's components come from `groupTree` and
    // `mergeToTarget`, a second partition, so the overlay paints FEWER than
    // every non-fold box. Research 118 F1 measured 0 of 8 over the reading
    // FIXTURE; the integrator's run over the live clone at 88165be1 read 3
    // of 8 against HEAD's 7 of 8, so the pin is "fewer than all", with the
    // number printed, rather than a zero the live tree does not read.
    if (read.painted >= nonFold) out.push(`P: the parent's draft painted ${read.painted} of ${read.boxes} boxes, every non-fold box, and F1 at the parent paints fewer`);
  } else if (read.painted < nonFold) out.push(`I: the draft painted ${read.painted} of ${read.boxes} boxes, and F1 closed paints every non-fold box (${nonFold})`);
  return out;
}

/** HEAD's four questions asked of a face: what the parent must FAIL and HEAD must pass. */
export function gradeHeadFace(read) {
  const out = [];
  if (read.regions === 0) out.push('face: no region frame');
  if (read.chips === 0) out.push('face: no rung chip');
  if (!read.inspector) out.push('face: no inspector');
  if (!read.tabs) out.push('face: no inner tab row');
  return out;
}

/** The parent's face: nothing of this phase drawn. */
export function gradeParentFace(read) {
  const out = [];
  if (read.regions !== 0) out.push(`P: the parent draws ${read.regions} region frames`);
  if (read.chips !== 0) out.push(`P: the parent draws ${read.chips} chips`);
  if (read.inspector) out.push('P: the parent draws an inspector');
  if (read.tabs) out.push('P: the parent draws an inner tab row');
  return out;
}

/** Per box, per kind counts from arch.db rows and a box → files map. */
export function countsUnder(rows, boxFiles) {
  const out = {};
  for (const [id, files] of Object.entries(boxFiles)) {
    const set = new Set(files);
    const counts = { surface: {}, store: {}, effect: {}, network: {}, gate: {} };
    for (const r of rows) {
      if (!set.has(r.rel_path) || !(r.category in counts)) continue;
      counts[r.category][r.kind] = (counts[r.category][r.kind] ?? 0) + 1;
    }
    out[id] = counts;
  }
  return out;
}

function selfTest() {
  const problems = [];
  const okMap = {
    regions: [{ id: 'unit:', kind: 'unit', label: 'tortie', sub: 'the one thing this repository builds', boxes: 8, starts: 'starts 7 workers, 2 threads, 1 process, 4 compose services, 1 cargo library' }, { id: 'outside', kind: 'outside' }],
    wires: [{ kind: 'spawns', count: 30 }, { kind: 'reaches', count: 5 }, { kind: 'listens', count: 2 }]
  };
  const counts = { spawn: 30, client: 5, listen: 1, port: 1, boundary: { worker: 7, thread: 2, process: 1, service: 4 } };
  if (gradeTortieRegions(okMap, counts).length !== 0) problems.push(`a good tortie map read ${JSON.stringify(gradeTortieRegions(okMap, counts))}`);
  const bad = gradeTortieRegions({ ...okMap, regions: [{ ...okMap.regions[0], starts: 'starts 3 workers, 2 threads, 1 process, 4 compose services', boxes: 7 }, okMap.regions[1]], wires: [{ kind: 'spawns', count: 29 }] }, counts);
  if (bad.length !== 5) problems.push(`a bad tortie map read ${bad.length} findings: ${JSON.stringify(bad)}`);
  const stoaOk = {
    regions: [{ id: 'unit:stoa-web', kind: 'unit' }, { id: 'unit:packages/agent-sandbox', kind: 'unit', boxes: 1 }, { id: 'unit:packages/testing-core', kind: 'unit', boxes: 1 }, { id: 'unit:a', kind: 'unit' }, { id: 'unit:b', kind: 'unit' }, { id: 'unit:c', kind: 'unit' }, { id: 'elsewhere', kind: 'elsewhere' }],
    boxes: [{ id: 'stoa-web-app', region: 'unit:stoa-web' }, { id: 'stoa-web-livekit-agent', region: 'unit:stoa-web/livekit-agent' }, { id: 'docs', region: 'elsewhere' }, { id: 'scripts', region: 'elsewhere' }, { id: 'stoa-helpers-darwin', region: 'elsewhere' }, { id: 'stoa-desktop-mac', region: 'elsewhere' }]
  };
  if (gradeStoaRegions(stoaOk).length !== 0) problems.push(`a good stoa map read ${JSON.stringify(gradeStoaRegions(stoaOk))}`);
  const stoaBad = gradeStoaRegions({ ...stoaOk, boxes: [{ id: 'stoa-web-app', region: 'elsewhere' }, { id: 'docs', region: 'elsewhere' }] });
  if (stoaBad.length !== 4) problems.push(`a bad stoa map read ${stoaBad.length}: ${JSON.stringify(stoaBad)}`);
  const computed = { rungs: { 'src-main': { rung: 'tested', reached: 583, parsed: 1068 }, 'src-renderer': { rung: 'composed', reached: 0, parsed: 968 } } };
  const dom = [{ id: 'src-main', rung: 'tested', title: 'x\nreached 583 of 1,068 parsed · 395 imported by a test · 3 seeds' }, { id: 'src-renderer', rung: 'composed', title: 'y\nreached 0 of 968 parsed · 336 imported by a test · 3 seeds' }];
  if (gradeRungs('tortie', dom, computed).length !== 0) problems.push(`good rungs read ${JSON.stringify(gradeRungs('tortie', dom, computed))}`);
  const rb = gradeRungs('tortie', [{ ...dom[0], rung: 'reached' }, { ...dom[1], rung: 'reached', title: 'reached 1 of 968 parsed' }, { id: 'ghost', rung: 'declared', title: '' }], computed);
  if (rb.length !== 6) problems.push(`bad rungs read ${rb.length}: ${JSON.stringify(rb)}`);
  const want = { surface: { 'ipc-channel': 229, job: 6, port: 0 }, store: { 'store-write': 12, migration: 3 }, effect: { spawn: 30 }, network: { client: 5, listen: 2 }, gate: { refusal: 9, flag: 3 }, tested: 395, parsed: 1068, rung: 'tested' };
  const insp = { pressed: 'src-main', crumbs: 1, inspector: 'src-main', word: 'tested', disclosedRows: 235, afterOpenCrumbs: 2, afterEscapePressed: null, afterEscapeInspector: 'Select a part.', fields: { exposes: '229 IPC channels, 6 jobs', keeps: '12 store writes, 3 migrations', reaches: '30 spawns, 5 network reaches, 2 listens', guards: '12 gates', tests: '395 of 1,068 parsed files imported by a test', runsIn: 'tortie · the one thing this repository builds' } };
  if (gradeInspector(insp, want).length !== 0) problems.push(`a good inspector read ${JSON.stringify(gradeInspector(insp, want))}`);
  const ib = gradeInspector({ ...insp, crumbs: 2, disclosedRows: 3, afterEscapePressed: 'src-main', fields: { ...insp.fields, guards: '11 gates' } }, want);
  if (ib.length !== 4) problems.push(`a bad inspector read ${ib.length}: ${JSON.stringify(ib)}`);
  const sWant = { a: { 'ipc-channel': 2 }, b: {} };
  const sRead = { rows: [{ id: 'a', kinds: [{ kind: 'ipc-channel', count: 2, zero: false }, { kind: 'http-route', count: 0, zero: true }, { kind: 'cli-command', count: 0, zero: true }, { kind: 'cli-flag', count: 0, zero: true }, { kind: 'job', count: 0, zero: true }, { kind: 'port', count: 0, zero: true }] }, { id: 'b', kinds: ['ipc-channel', 'http-route', 'cli-command', 'cli-flag', 'job', 'port'].map((kind) => ({ kind, count: 0, zero: true })) }], regions: [{ id: 'unit:', denominator: 'read 13 of 35 files' }] };
  if (gradeSurfaces(sRead, sWant, { 'unit:': { parsed: 13, files: 35 } }).length !== 0) problems.push(`good surfaces read ${JSON.stringify(gradeSurfaces(sRead, sWant, { 'unit:': { parsed: 13, files: 35 } }))}`);
  const sb = gradeSurfaces({ rows: [{ id: 'a', kinds: sRead.rows[0].kinds.slice(1) }], regions: [{ id: 'unit:', denominator: 'read 12 of 35 files' }] }, sWant, { 'unit:': { parsed: 13, files: 35 } });
  if (sb.length !== 3) problems.push(`bad surfaces read ${sb.length}: ${JSON.stringify(sb)}`);
  const gWant = { srcMain: { auth: 0, flag: 3, refusal: 9, guard: 2 }, whole: 820 };
  const gRead = { named: { count: 14, text: '14 gates in src/main over 1,068 parsed files · of 820 in the repositoryauth 0 · flag 3 · refusal 9 · guard 2', rows: 14 }, unticked: { count: 5 }, whole: { count: 820 } };
  if (gradeGates(gRead, gWant).length !== 0) problems.push(`good gates read ${JSON.stringify(gradeGates(gRead, gWant))}`);
  const gb = gradeGates({ ...gRead, unticked: { count: 14 }, whole: { count: 815 } }, gWant);
  if (gb.length !== 2) problems.push(`bad gates read ${gb.length}: ${JSON.stringify(gb)}`);
  if (gradeWords({ map: 281, surfaces: 200, gates: 40 }).length !== 0) problems.push('good words graded red');
  if (gradeWords({ map: 301, surfaces: 200 }).length !== 2) problems.push(`bad words read ${JSON.stringify(gradeWords({ map: 301, surfaces: 200 }))}`);
  const mOk = { 'show-arch-surfaces': { selected: 'surfaces', mapTabs: 1 }, 'show-arch-gates': { selected: 'gates', mapTabs: 1 } };
  if (gradeMenus(mOk).length !== 0) problems.push('good menus graded red');
  if (gradeMenus({ 'show-arch-surfaces': { selected: 'map', mapTabs: 2 } }).length !== 3) problems.push(`bad menus read ${JSON.stringify(gradeMenus({ 'show-arch-surfaces': { selected: 'map', mapTabs: 2 } }))}`);
  const cOk = { idle: 'rgb(139, 147, 161)', success: 'rgb(107, 196, 109)', chips: 8, colours: ['rgb(139, 147, 161)', 'rgb(107,196,109)'] };
  if (gradeColours(cOk).length !== 0) problems.push('good colours graded red');
  if (gradeColours({ ...cOk, colours: ['rgb(1, 2, 3)'] }).length !== 1) problems.push('a literal colour was not caught');
  if (gradeDraft({ seeded: true, painted: 7, boxes: 8, hasFold: true }, false).length !== 0) problems.push('a full paint graded red');
  if (gradeDraft({ seeded: true, painted: 0, boxes: 8, hasFold: true }, false).length !== 1) problems.push('an empty paint at HEAD was not caught');
  if (gradeDraft({ seeded: true, painted: 0, boxes: 8, hasFold: true }, true).length !== 0) problems.push('the parent painting none graded red');
  if (gradeDraft({ seeded: true, painted: 3, boxes: 8, hasFold: true }, true).length !== 0) problems.push('the parent painting fewer than every non-fold box graded red');
  if (gradeDraft({ seeded: true, painted: 7, boxes: 8, hasFold: true }, true).length !== 1) problems.push('the parent painting every non-fold box was not caught');
  if (gradeDraft({ seeded: true, painted: 8, boxes: 8, hasFold: true }, true).length !== 1) problems.push('the parent painting all was not caught');
  if (gradeHeadFace({ regions: 0, chips: 0, inspector: false, tabs: false }).length !== 4) problems.push('a bare face passed HEAD\'s four questions');
  if (gradeHeadFace({ regions: 1, chips: 8, inspector: true, tabs: true }).length !== 0) problems.push('a HEAD face failed HEAD\'s four questions');
  if (gradeParentFace({ regions: 0, chips: 0, inspector: false, tabs: false }).length !== 0) problems.push('a bare parent face graded red');
  if (gradeParentFace({ regions: 1, chips: 8, inspector: true, tabs: true }).length !== 4) problems.push('a HEAD face at the parent was not caught');
  const cu = countsUnder([{ rel_path: 'a/x.ts', category: 'surface', kind: 'port' }, { rel_path: 'b/y.ts', category: 'gate', kind: 'guard' }, { rel_path: 'a/x.ts', category: 'test', kind: 'test-case' }], { a: ['a/x.ts'], b: ['b/y.ts'] });
  if (cu.a.surface.port !== 1 || cu.b.gate.guard !== 1 || Object.keys(cu.a.gate).length !== 0) problems.push(`countsUnder reads ${JSON.stringify(cu)}`);
  return problems;
}

if (process.argv.includes('--self-test')) {
  const problems = selfTest();
  for (const p of problems) process.stderr.write(`probe-p258-surface self-test: ${p}\n`);
  say(problems.length === 0 ? 'probe-p258-surface self-test: OK, the ten graders behaved on planted readings; nothing was launched' : `probe-p258-surface self-test: ${problems.length} problem(s)`);
  process.exit(problems.length === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The refusals
// ---------------------------------------------------------------------------

function refuse(message) {
  process.stderr.write(`probe-p258-surface: ${message}\n`);
  process.exit(2);
}

let socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
let ownSocket = false;
if (socket === '') {
  // Run by hand outside the harness: a socket of this run's own, unlinked in
  // the finally block below. tmux is never started on it; the app is told
  // its name so nothing it does can land on the operator's server.
  socket = `gmux-p258-${String(process.pid)}`;
  ownSocket = true;
}
if (socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-p258')) {
  refuse(`GMUX_TMUX_SOCKET is "${socket}"; it must begin gmux-p258. Run through build/harness-socket.mjs.`);
}
let harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') harnessDir = join(tmpdir(), socket);
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) refuse('no build under out/. Run npm run build first.');
const parentCheckout = (process.env['P258_PARENT_CHECKOUT'] ?? '').trim();
if (parentCheckout !== '' && !existsSync(join(parentCheckout, 'out', 'main', 'index.js'))) {
  refuse(`P258_PARENT_CHECKOUT ${parentCheckout} holds no build under out/.`);
}
for (const forbidden of ['/Users/gdc/runstory', '/Users/gdc/specfactory']) {
  if (`${harnessDir}/`.startsWith(`${forbidden}/`) || `${parentCheckout}/`.startsWith(`${forbidden}/`)) refuse(`${forbidden} is never read or written`);
}

mkdirSync(join(harnessDir, 'p258'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p258'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const profileParent = join(root, 'profile-parent');
const factsDir = join(root, 'facts');
const reposDir = join(root, 'repos');
for (const d of [home, profile, profileParent, factsDir]) mkdirSync(d, { recursive: true });

const failures = [];
const arms = {};
const check = (arm, findings) => {
  arms[arm] = (arms[arm] ?? 0) + findings.length;
  for (const f of findings) {
    say(`  FAIL ${f}`);
    failures.push(f);
  }
  if (findings.length === 0) say(`  ok   arm ${arm}`);
};
const note = (ok, line) => {
  say(`  ${ok ? 'ok  ' : 'FAIL'} ${line}`);
  if (!ok) failures.push(line);
};

function operatorSessions() {
  const r = spawnSync('tmux', ['-L', 'gmux', 'list-sessions', '-F', '#{session_id}'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split('\n').filter(Boolean).length : 0;
}

function tsx(args, label) {
  const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', ...args], { cwd: REPO, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) {
    say(`  ${label} failed: ${(r.stderr || r.stdout).slice(0, 1500)}`);
    return null;
  }
  return r.stdout;
}

// ---------------------------------------------------------------------------
// The connection (the p257 shape) and the page-side reads
// ---------------------------------------------------------------------------

async function cdpForAppWindow(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const answer = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`, 5000);
          if (typeof answer === 'string') return { cdp, url: answer };
          cdp.close();
        } catch {
          if (cdp !== null) {
            try {
              cdp.close();
            } catch {
              /* already gone */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no page answered for the app window in time');
    await sleep(200);
  }
}

/** Attach to MAIN over the node inspector, whose url the app printed itself (the p175 shape). */
async function cdpForMain(handle, timeoutMs) {
  const started = Date.now();
  for (;;) {
    const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(handle.text());
    if (m !== null) {
      try {
        return await wsConnect(m[1]);
      } catch {
        /* the port is printed a beat before the listener is up */
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('the main process inspector never appeared');
    await sleep(300);
  }
}

async function mainEval(cdp, expression, ms = 15_000) {
  const res = await cdp.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true }, ms);
  if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails));
  return res.result?.result?.value ?? null;
}

/** Inject one menu action on the REAL channel, the way the View menu would. */
function injectAction(action) {
  return `(() => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { BrowserWindow } = load('electron');
  let sent = 0;
  for (const w of BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed())) {
    if (w.webContents.isDestroyed()) continue;
    w.webContents.send('ui:menuAction', ${JSON.stringify(action)});
    sent += 1;
  }
  return sent;
})()`;
}

async function press(cdp, { key, code, vk, modifiers }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const CHORD_ARCH = { key: 'A', code: 'KeyA', vk: 65, modifiers: 2 | 8 };

async function waitFor(cdp, expression, timeoutMs, everyMs = 300) {
  const started = Date.now();
  for (;;) {
    let answer = false;
    try {
      answer = await cdpEval(cdp, expression, 20_000);
    } catch {
      answer = false;
    }
    if (answer === true) return Date.now() - started;
    if (Date.now() - started > timeoutMs) return -1;
    await sleep(everyMs);
  }
}

const TAB = `document.querySelector('[data-slot="arch-map-tab"]')`;

const MAP_READ = `(() => {
  const tab = ${TAB};
  if (tab === null) return JSON.stringify({ tab: false });
  const text = (el) => (el === null ? '' : (el.textContent ?? '').trim());
  const regions = [...tab.querySelectorAll('.arch-map-region[data-region]')].map((r) => ({
    id: r.getAttribute('data-region'),
    kind: (r.getAttribute('class') ?? '').includes('arch-map-region-outside') ? 'outside' : (r.getAttribute('class') ?? '').includes('arch-map-region-elsewhere') ? 'elsewhere' : 'unit',
    label: text(r.querySelector('.arch-map-region-label')),
    sub: text(r.querySelector('.arch-map-region-sub')),
    starts: text(r.querySelector('.arch-map-starts')) || null,
    // A box carries its region on data-region (the frames and the boxes are
    // siblings in the SVG so the frames can sit under every band).
    boxes: tab.querySelectorAll('.arch-map-box[data-group][data-region="' + r.getAttribute('data-region') + '"]').length
  }));
  const regionOf = (el) => el.getAttribute('data-region') ?? el.closest('.arch-map-region[data-region]')?.getAttribute('data-region') ?? null;
  const boxes = [...tab.querySelectorAll('.arch-map-box[data-group]')].map((g) => ({
    id: g.getAttribute('data-group'),
    rung: g.getAttribute('data-rung'),
    title: g.querySelector('.arch-map-rung')?.getAttribute('title') ?? null,
    region: regionOf(g),
    pressed: g.getAttribute('aria-pressed')
  }));
  const wires = [...tab.querySelectorAll('.arch-map-wire[data-kind]')].map((w) => {
    const label = text(w.querySelector('.arch-map-wire-label'));
    const m = /([\\d,]+)/.exec(label);
    return { kind: w.getAttribute('data-kind'), from: w.getAttribute('data-from'), to: w.getAttribute('data-to'), count: m === null ? null : Number(m[1].replace(/,/g, '')), label };
  });
  return JSON.stringify({
    tab: true,
    regions, boxes, wires,
    chips: tab.querySelectorAll('.arch-map-rung').length,
    crumbs: tab.querySelectorAll('.arch-map-crumb, .arch-map-crumb-here').length,
    tabs: tab.querySelector('.arch-tabs') !== null,
    inspector: tab.querySelector('[data-slot="arch-inspector"]') !== null
  });
})()`;

const INSPECTOR_READ = `(() => {
  const tab = ${TAB};
  const text = (el) => (el === null ? null : (el.textContent ?? '').trim());
  const insp = tab === null ? null : tab.querySelector('[data-slot="arch-inspector"]');
  const field = (name) => text(insp?.querySelector('[data-field="' + name + '"] > .arch-inspector-value > span:first-child') ?? insp?.querySelector('[data-field="' + name + '"]') ?? null);
  return JSON.stringify({
    pressed: tab?.querySelector('.arch-map-box[aria-pressed="true"]')?.getAttribute('data-group') ?? null,
    crumbs: tab === null ? 0 : tab.querySelectorAll('.arch-map-crumb, .arch-map-crumb-here').length,
    inspector: insp?.getAttribute('data-group') ?? null,
    none: text(insp?.querySelector('.arch-inspector-none') ?? null),
    word: text(insp?.querySelector('.arch-inspector-word span:last-child') ?? null),
    fields: { runsIn: field('runs-in'), exposes: field('exposes'), keeps: field('keeps'), reaches: field('reaches'), guards: field('guards'), tests: field('tests'), rung: field('rung') },
    disclosedRows: insp === null ? 0 : insp.querySelectorAll('[data-field="exposes"] .arch-fact-row').length
  });
})()`;

const SURFACES_READ = `(() => {
  const tab = ${TAB};
  const text = (el) => (el === null ? '' : (el.textContent ?? '').trim());
  const s = tab?.querySelector('[data-slot="arch-surfaces"]') ?? null;
  if (s === null) return JSON.stringify({ present: false });
  return JSON.stringify({
    present: true,
    regions: [...s.querySelectorAll('.arch-surfaces-region[data-region]')].map((r) => ({ id: r.getAttribute('data-region'), denominator: text(r.querySelector('.arch-surfaces-denominator')) })),
    rows: [...s.querySelectorAll('.arch-surfaces-row[data-group]')].map((row) => ({
      id: row.getAttribute('data-group'),
      kinds: [...row.querySelectorAll('[data-kind][data-count]')].map((k) => ({ kind: k.getAttribute('data-kind'), count: Number(k.getAttribute('data-count')), zero: (k.getAttribute('class') ?? '').split(/\\s+/).includes('zero') }))
    }))
  });
})()`;

const GATES_READ = `(() => {
  const tab = ${TAB};
  const g = tab?.querySelector('[data-slot="arch-gates"]') ?? null;
  if (g === null) return JSON.stringify({ present: false });
  const answer = g.querySelector('.arch-gates-answer');
  return JSON.stringify({
    present: true,
    value: g.querySelector('.arch-gates-select')?.value ?? null,
    count: answer === null ? null : Number(answer.getAttribute('data-count')),
    text: answer === null ? null : (answer.textContent ?? '').trim(),
    rows: g.querySelectorAll('.arch-gates-rows .arch-fact-row').length,
    options: [...(g.querySelector('.arch-gates-select')?.options ?? [])].map((o) => o.value)
  });
})()`;

/** Set a React-controlled select's value the way a person's choice reaches it. */
const SELECT_GATES = (value) => `(() => {
  const el = ${TAB}.querySelector('.arch-gates-select');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return el.value;
})()`;

/** innerText above the fold at 1440×900: text nodes whose box starts above 900px. */
const WORDS_READ = `(() => {
  const tab = ${TAB};
  if (tab === null) return -1;
  const walker = document.createTreeWalker(tab, NodeFilter.SHOW_TEXT);
  let words = 0;
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const s = (node.textContent ?? '').trim();
    if (s === '') continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rect = range.getBoundingClientRect();
    if (rect.height === 0 || rect.top >= 900 || rect.left >= 1440) continue;
    words += s.split(/\\s+/).length;
  }
  return words;
})()`;

const COLOURS_READ = `(() => {
  const tab = ${TAB};
  const root = getComputedStyle(document.documentElement);
  const hexToRgb = (h) => { const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h.trim()); return m === null ? h.trim() : 'rgb(' + parseInt(m[1], 16) + ', ' + parseInt(m[2], 16) + ', ' + parseInt(m[3], 16) + ')'; };
  const chips = tab === null ? [] : [...tab.querySelectorAll('.arch-map-rung')];
  return JSON.stringify({
    idle: hexToRgb(root.getPropertyValue('--status-idle')),
    success: hexToRgb(root.getPropertyValue('--success')),
    chips: chips.length,
    colours: [...new Set(chips.map((c) => getComputedStyle(c).color))]
  });
})()`;

const CLICK_BOX = (id) => `(() => { const b = ${TAB}.querySelector('.arch-map-box[data-group="${id}"]'); b.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; })()`;
const KEY_BOX = (id, key) => `(() => { const b = ${TAB}.querySelector('.arch-map-box[data-group="${id}"]'); b.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true })); return true; })()`;
const CLICK = (selector) => `(() => { const el = ${TAB}.querySelector(${JSON.stringify(selector)}); if (el === null) return false; el.click(); return true; })()`;
const MAP_TABS = `[...document.querySelectorAll('.ed-tab-name')].filter((el) => (el.textContent ?? '').trim() === 'Architecture map').length`;
const SELECTED_TAB = `${TAB}?.querySelector('.arch-tabs [data-tab][aria-selected="true"]')?.getAttribute('data-tab') ?? null`;

/** arch.db, read only, the rows and links for one repository path. */
function readArchDb(profileDir, repoPath) {
  const Database = require('better-sqlite3');
  const path = join(profileDir, 'gmux', 'arch.db');
  if (!existsSync(path)) return null;
  const db = new Database(path, { readonly: true });
  try {
    const repo = db.prepare('SELECT repo_key FROM arch_repo WHERE repo_path = ? OR repo_path = ?').get(repoPath, realpathSync(repoPath));
    if (repo === undefined) return null;
    const rows = db
      .prepare(
        `SELECT a.category, a.kind, a.rel_path FROM arch_fact a
           JOIN arch_fact_file f ON f.oid = a.oid AND f.rel_path = a.rel_path
          WHERE f.repo_key = ?
         UNION ALL
         SELECT category, kind, rel_path FROM arch_fact_wrap WHERE repo_key = ?`
      )
      .all(repo.repo_key, repo.repo_key);
    return { rows };
  } finally {
    db.close();
  }
}

/** Open a project, run the check, wait for the fact pass, open the map, wait for regions. */
async function openMap(cdp, handle, project, label, expectRegions, main = null) {
  await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify({ projectPath: project })}).then(() => true)`, 120_000);
  await sleep(1000);
  const t0 = Date.now();
  const answer = JSON.parse(
    await cdpEval(cdp, `window.gmux.arch.check(${JSON.stringify({ cwd: project })}).then((r) => JSON.stringify({ ok: true, generation: r.generation })).catch((e) => JSON.stringify({ error: String(e) }))`, 20 * 60 * 1000)
  );
  if (expectRegions) {
    const re = new RegExp(`\\[gmux-arch\\] fact pass \\{[^\\n]*"repoPath":${JSON.stringify(project).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`);
    try {
      await handle.waitForLine(re, 20 * 60 * 1000);
    } catch {
      say(`  ${label}: the fact pass line never printed`);
    }
  }
  say(`  ${label}: the arch check answered in ${String(Date.now() - t0)} ms${answer.error ? ` (${answer.error})` : ''}`);
  // The view: the chord first, as p201 presses it. The integrator's run of
  // this probe found the chord landing on nothing once a terminal pane had
  // taken the keyboard during the eleven second wait above, so when the pane
  // is still absent the View menu's own action is sent on the real channel,
  // which needs no focus, and the click below refuses with a sentence rather
  // than a TypeError when the door is still not there.
  if (await cdpEval(cdp, `document.querySelector('[data-view="arch"]') === null`)) {
    await press(cdp, CHORD_ARCH);
    if ((await waitFor(cdp, `document.querySelector('[data-view="arch"]') !== null`, 5_000)) === -1 && main !== null) {
      say(`  ${label}: the view.arch chord opened nothing (focus elsewhere); sending show-arch on the menu channel`);
      await mainEval(main, injectAction('show-arch'));
      await waitFor(cdp, `document.querySelector('[data-view="arch"]') !== null`, 15_000);
    }
  }
  // The door, watched as a timeline rather than a single wait, so a pane
  // that came and went is reported as such with the page's own exceptions.
  const FACE = `JSON.stringify({ view: document.querySelector('.sidebar-view')?.dataset.view ?? null, open: document.querySelector('.arch-map-open') !== null, header: document.querySelector('[data-slot="view-header"]') !== null })`;
  const doorStarted = Date.now();
  let lastFace = '';
  let doorSeen = false;
  while (Date.now() - doorStarted < 60_000) {
    const face = String(await cdpEval(cdp, FACE, 20_000));
    if (face !== lastFace) {
      say(`  ${label}: face ${face} at ${String(Date.now() - doorStarted)} ms`);
      lastFace = face;
    }
    if (JSON.parse(face).open === true) {
      doorSeen = true;
      break;
    }
    await sleep(300);
  }
  if (!doorSeen) {
    const events = typeof cdp.events === 'function' ? cdp.events() : [];
    const thrown = events
      .filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error'))
      .slice(-8)
      .map((e) => JSON.stringify(e).slice(0, 700));
    throw new Error(`${label}: the map door .arch-map-open never appeared; the face reads ${lastFace}; page events: ${thrown.length === 0 ? 'none collected' : thrown.join(' | ')}`);
  }
  await cdpEval(cdp, `document.querySelector('.arch-map-open').click(); true`, 20_000);
  await waitFor(cdp, `${TAB} !== null && ${TAB}.querySelector('svg') !== null`, 90_000);
  if (expectRegions) {
    const ms = await waitFor(cdp, `${TAB}.querySelectorAll('.arch-map-region[data-region]').length > 0 && ${TAB}.querySelectorAll('.arch-map-box[data-rung]').length > 0`, 120_000, 500);
    say(`  ${label}: region frames and chips drawn after ${String(ms)} ms`);
  }
  await sleep(1200);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const sessionsBefore = operatorSessions();
say(`p258: the operator's -L gmux server holds ${String(sessionsBefore)} session(s) before`);
let corpusMade = false;
try {
  say('\nthe corpus (two local read-only clones under the harness directory)');
  const corpus = spawnSync('bash', [join(REPO, 'build', 'p258', 'corpus.sh'), root, REPO], { encoding: 'utf8', cwd: REPO, maxBuffer: 64 * 1024 * 1024 });
  corpusMade = true;
  for (const line of (corpus.stdout + corpus.stderr).trim().split('\n')) say(`  ${line}`);
  note(corpus.status === 0, 'corpus.sh made the clones');
  const tortieClone = join(reposDir, 'tortie');
  const stoaClone = join(reposDir, 'stoa');
  if (!existsSync(join(tortieClone, '.git'))) throw new Error('the tortie clone was not made');
  note(realpathSync(tortieClone) !== realpathSync(REPO), 'the tortie clone is not the checkout this probe runs from');
  const haveStoa = existsSync(join(stoaClone, '.git'));
  const projects = [['tortie', tortieClone]];
  if (haveStoa) projects.push(['stoa', stoaClone]);

  say("\nthe gate's own computation, in process, over the same clones");
  const table = tsx(['build/p257/facts-corpus.mts', reposDir, factsDir], 'facts-corpus');
  note(table !== null, 'facts-corpus.mts read every clone');
  const computed = {};
  for (const [name, clone] of projects) {
    const out = tsx(['build/evidence-conformance-probe.mts', JSON.stringify({ clone: { repo: clone, factsFile: join(factsDir, `${name}.json`) } })], `evidence probe over ${name}`);
    const parsed = out === null ? null : JSON.parse(out.trim().split('\n').pop() ?? '{}').clone;
    note(parsed !== null && parsed !== undefined && parsed.error === undefined, `${name}: the evidence probe composed the clone${parsed?.error ? ` (${String(parsed.error).slice(0, 200)})` : ''}`);
    computed[name] = parsed ?? {};
    if (parsed && !parsed.error) say(`  ${name}: ${String(parsed.tracked)} tracked, ${String(parsed.edges)} edges, regions ${(parsed.regions ?? []).map((r) => `${r.id}[${r.groupIds.length}]`).join(' ')}, rungs ${Object.entries(parsed.rungs ?? {}).map(([id, r]) => `${id} ${r.rung}`).join(', ')}`);
  }

  say('\nHEAD: one Electron on a scratch profile, the switch on, agentId null');
  seedArchSwitchOn(profile, { wrapperPass: true });
  const head = { map: {}, painted: null };
  await withElectron(
    {
      label: 'p258',
      userDataDir: profile,
      tmuxSocket: null,
      args: ['--remote-debugging-port=0', '--inspect=0', '--use-mock-keychain'],
      env: { HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' },
      ceilingMs: 30 * 60 * 1000
    },
    async (handle) => {
      const { cdp, url } = await cdpForAppWindow(profile, 90_000);
      say(`  app window at ${url}`);
      await cdp.call('Runtime.enable');
      for (;;) {
        if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
        await sleep(50);
      }
      await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      const main = await cdpForMain(handle, 60_000);

      // --- tortie ---------------------------------------------------------
      await openMap(cdp, handle, tortieClone, 'tortie', true, main);
      const map = JSON.parse(await cdpEval(cdp, MAP_READ, 30_000));
      head.map.tortie = map;
      say(`  tortie map: regions ${map.regions.map((r) => `${r.id}(${r.boxes})`).join(' ')}; wires ${map.wires.map((w) => `${w.kind}·${w.count}`).join(' ')}; ${map.chips} chips`);

      // B first, because it needs nothing but the resting map.
      check('B', gradeRungs('tortie', map.boxes, computed.tortie));

      // H
      check('H', gradeColours(JSON.parse(await cdpEval(cdp, COLOURS_READ, 20_000))));

      // F: the map's words at rest.
      const words = { map: await cdpEval(cdp, WORDS_READ, 20_000) };

      // C: the inspector.
      await cdpEval(cdp, CLICK_BOX('src-main'), 20_000);
      await sleep(600);
      const insp1 = JSON.parse(await cdpEval(cdp, INSPECTOR_READ, 20_000));
      await cdpEval(cdp, `(() => { const t = ${TAB}.querySelector('[data-field="exposes"] .arch-facts-toggle'); if (t) t.click(); return t !== null; })()`, 20_000);
      await waitFor(cdp, `${TAB}.querySelectorAll('[data-field="exposes"] .arch-fact-row').length > 0`, 30_000);
      const insp2 = JSON.parse(await cdpEval(cdp, INSPECTOR_READ, 20_000));
      await cdpEval(cdp, CLICK('.arch-inspector-open'), 20_000);
      await sleep(2500);
      const afterOpen = JSON.parse(await cdpEval(cdp, INSPECTOR_READ, 20_000));
      // Back up to level 1 through the root crumb, then Escape on the selected box.
      await cdpEval(cdp, `(() => { const c = ${TAB}.querySelector('.arch-map-crumb'); if (c) c.click(); return c !== null; })()`, 20_000);
      await sleep(2000);
      await cdpEval(cdp, CLICK_BOX('src-main'), 20_000);
      await sleep(400);
      await cdpEval(cdp, KEY_BOX('src-main', 'Escape'), 20_000);
      await sleep(400);
      const afterEscape = JSON.parse(await cdpEval(cdp, INSPECTOR_READ, 20_000));
      const srcMainFiles = computed.tortie.boxFiles?.['src-main'] ?? [];
      head.inspector = { ...insp1, disclosedRows: insp2.disclosedRows, afterOpenCrumbs: afterOpen.crumbs, afterEscapePressed: afterEscape.pressed, afterEscapeInspector: afterEscape.none, srcMainFiles: srcMainFiles.length };
      say(`  inspector: ${JSON.stringify(insp1.fields)}; disclosed ${String(insp2.disclosedRows)} rows; after Open ${String(afterOpen.crumbs)} crumbs; after Escape pressed=${String(afterEscape.pressed)} "${String(afterEscape.none)}"`);

      // D: the surfaces tab.
      await cdpEval(cdp, CLICK('.arch-tabs [data-tab="surfaces"]'), 20_000);
      await sleep(800);
      head.surfaces = JSON.parse(await cdpEval(cdp, SURFACES_READ, 30_000));
      words.surfaces = await cdpEval(cdp, WORDS_READ, 20_000);

      // E: the worksheet.
      await cdpEval(cdp, CLICK('.arch-tabs [data-tab="gates"]'), 20_000);
      await sleep(800);
      words.gates = await cdpEval(cdp, WORDS_READ, 20_000);
      await cdpEval(cdp, SELECT_GATES('src-main'), 20_000);
      await waitFor(cdp, `${TAB}.querySelector('.arch-gates-answer') !== null && ${TAB}.querySelectorAll('.arch-gates-rows .arch-fact-row').length > 0`, 30_000);
      await sleep(500);
      const named = JSON.parse(await cdpEval(cdp, GATES_READ, 20_000));
      await cdpEval(cdp, `(() => { const i = ${TAB}.querySelector('.arch-gates-kind[data-kind="refusal"] input'); i.click(); return i.checked; })()`, 20_000);
      await sleep(500);
      const unticked = JSON.parse(await cdpEval(cdp, GATES_READ, 20_000));
      await cdpEval(cdp, `(() => { const i = ${TAB}.querySelector('.arch-gates-kind[data-kind="refusal"] input'); i.click(); return i.checked; })()`, 20_000);
      await cdpEval(cdp, SELECT_GATES(''), 20_000);
      await waitFor(cdp, `(() => { const a = ${TAB}.querySelector('.arch-gates-answer'); return a !== null && !(a.textContent ?? '').includes('src/main'); })()`, 30_000);
      await sleep(800);
      const whole = JSON.parse(await cdpEval(cdp, GATES_READ, 20_000));
      head.gates = { named, unticked, whole };
      say(`  gates: named ${String(named.count)} (${String(named.rows)} rows) "${String(named.text).slice(0, 90)}"; refusal unticked ${String(unticked.count)}; whole ${String(whole.count)}`);
      head.words = words;
      check('F', gradeWords(words));
      say(`  words above the fold: map ${String(words.map)}, surfaces ${String(words.surfaces)}, gates ${String(words.gates)}`);

      // G: the two menu actions on the real channel.
      const menus = {};
      for (const [action, tab] of [['show-arch-surfaces', 'surfaces'], ['show-arch-gates', 'gates']]) {
        await cdpEval(cdp, CLICK('.arch-tabs [data-tab="map"]'), 20_000);
        await sleep(300);
        const sent = await mainEval(main, injectAction(action));
        await waitFor(cdp, `${SELECTED_TAB} === ${JSON.stringify(tab)}`, 10_000, 100);
        menus[action] = { sent, selected: await cdpEval(cdp, SELECTED_TAB, 10_000), mapTabs: await cdpEval(cdp, MAP_TABS, 10_000) };
      }
      head.menus = menus;
      check('G', gradeMenus(menus));

      // --- stoa -----------------------------------------------------------
      if (haveStoa) {
        await cdpEval(cdp, CLICK('.arch-tabs [data-tab="map"]'), 20_000);
        await openMap(cdp, handle, stoaClone, 'stoa', true, main);
        const smap = JSON.parse(await cdpEval(cdp, MAP_READ, 30_000));
        head.map.stoa = smap;
        say(`  stoa map: regions ${smap.regions.map((r) => `${r.id}(${r.boxes})`).join(' ')}; ${smap.chips} chips`);
        check('A/stoa', gradeStoaRegions(smap));
        check('B/stoa', gradeRungs('stoa', smap.boxes, computed.stoa));
      }

      // I: the draft on the tortie clone, LAST, because it writes docs/arch there.
      await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify({ projectPath: tortieClone })}).then(() => true)`, 120_000);
      await sleep(800);
      const seeded = JSON.parse(await cdpEval(cdp, `window.gmux.arch.seed(${JSON.stringify({ cwd: tortieClone })}).then((r) => JSON.stringify(r)).catch((e) => JSON.stringify({ ok: false, reason: String(e) }))`, 120_000));
      await sleep(4000);
      const model = JSON.parse(await cdpEval(cdp, `window.gmux.arch.map(${JSON.stringify({ cwd: tortieClone })}).then((m) => JSON.stringify({ groups: m.groups.map((g) => ({ id: g.id, componentId: g.componentId })) })).catch((e) => JSON.stringify({ error: String(e) }))`, 120_000));
      head.painted = { seeded: seeded.ok === true, reason: seeded.reason ?? null, painted: (model.groups ?? []).filter((g) => g.componentId !== null).length, boxes: (model.groups ?? []).length, hasFold: (model.groups ?? []).some((g) => g.id === 'other') };
      say(`  draft: seeded=${String(head.painted.seeded)} (${(seeded.wrote ?? []).length} files), painted ${String(head.painted.painted)} of ${String(head.painted.boxes)} boxes`);
      check('I', gradeDraft(head.painted, false));
      main.close();
      cdp.close();
    }
  );

  // arch.db, read only, after the quit: the counts the graders hold the DOM against.
  const db = readArchDb(profile, tortieClone);
  note(db !== null, 'the scratch profile holds arch.db rows for the tortie clone');
  if (db !== null && head.map.tortie !== undefined) {
    const byKind = { boundary: {} };
    for (const r of db.rows) {
      byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
      if (r.category === 'boundary') byKind.boundary[r.kind] = (byKind.boundary[r.kind] ?? 0) + 1;
    }
    check('A', gradeTortieRegions(head.map.tortie, byKind));
    const boxFiles = computed.tortie.boxFiles ?? {};
    const under = countsUnder(db.rows, boxFiles);
    const srcMain = under['src-main'] ?? { surface: {}, store: {}, effect: {}, network: {}, gate: {} };
    const srcMainRung = computed.tortie.rungs?.['src-main'] ?? { tested: -1, parsed: -1, rung: null };
    check('C', gradeInspector(head.inspector, { ...srcMain, tested: srcMainRung.tested, parsed: srcMainRung.parsed, rung: srcMainRung.rung }));
    const surfaceWant = Object.fromEntries(Object.entries(under).map(([id, c]) => [id, c.surface]));
    const regionsWant = Object.fromEntries((computed.tortie.regions ?? []).map((r) => [r.id, { files: r.files, parsed: r.parsed }]));
    check('D', gradeSurfaces(head.surfaces, surfaceWant, regionsWant));
    const wholeGates = db.rows.filter((r) => r.category === 'gate').length;
    check('E', gradeGates(head.gates, { srcMain: srcMain.gate, whole: wholeGates }));
  }

  // --- the parent ---------------------------------------------------------
  if (parentCheckout !== '') {
    say('\nthe PARENT build, one Electron after the first and never at once, on a profile of its own');
    rmSync(join(tortieClone, 'docs', 'arch'), { recursive: true, force: true });
    seedArchSwitchOn(profileParent, { wrapperPass: true });
    const parent = {};
    await withElectron(
      {
        label: 'p258-parent',
        userDataDir: profileParent,
        tmuxSocket: null,
        cwd: parentCheckout,
        // `--inspect=0` as HEAD's launch, so the View menu's action can be
        // sent on the real channel when the chord finds no focus (openMap).
        args: ['--remote-debugging-port=0', '--inspect=0', '--use-mock-keychain'],
        env: { HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' },
        ceilingMs: 30 * 60 * 1000
      },
      async (handle) => {
        const { cdp, url } = await cdpForAppWindow(profileParent, 90_000);
        say(`  parent app window at ${url}`);
        await cdp.call('Runtime.enable');
        for (;;) {
          if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
          await sleep(50);
        }
        const mainParent = await cdpForMain(handle, 60_000);
        await openMap(cdp, handle, tortieClone, 'parent/tortie', false, mainParent);
        await sleep(3000);
        const map = JSON.parse(await cdpEval(cdp, MAP_READ, 30_000));
        parent.face = { regions: map.regions.length, chips: map.chips, inspector: map.inspector, tabs: map.tabs };
        say(`  parent map: ${String(map.regions.length)} region frames, ${String(map.chips)} chips, inspector ${String(map.inspector)}, tabs ${String(map.tabs)}`);
        const seeded = JSON.parse(await cdpEval(cdp, `window.gmux.arch.seed(${JSON.stringify({ cwd: tortieClone })}).then((r) => JSON.stringify(r)).catch((e) => JSON.stringify({ ok: false, reason: String(e) }))`, 120_000));
        await sleep(4000);
        const model = JSON.parse(await cdpEval(cdp, `window.gmux.arch.map(${JSON.stringify({ cwd: tortieClone })}).then((m) => JSON.stringify({ groups: m.groups.map((g) => ({ id: g.id, componentId: g.componentId })) })).catch((e) => JSON.stringify({ error: String(e) }))`, 120_000));
        parent.painted = { seeded: seeded.ok === true, reason: seeded.reason ?? null, painted: (model.groups ?? []).filter((g) => g.componentId !== null).length, boxes: (model.groups ?? []).length, hasFold: (model.groups ?? []).some((g) => g.id === 'other') };
        say(`  parent draft: seeded=${String(parent.painted.seeded)}, painted ${String(parent.painted.painted)} of ${String(parent.painted.boxes)} boxes`);
        cdp.close();
      }
    );
    // The parent's findings are counted the HEAD way and must be at least 4.
    const parentFindings = [...gradeHeadFace(parent.face).map((f) => `P(${f})`), ...gradeDraft(parent.painted, false)];
    say(`  parent findings when graded as HEAD (expected 4 or more): ${String(parentFindings.length)}`);
    for (const f of parentFindings) say(`    - ${f}`);
    note(parentFindings.length >= 4, `the parent build reads ${String(parentFindings.length)} findings against HEAD's graders, at least 4`);
    check('P', [...gradeParentFace(parent.face), ...gradeDraft(parent.painted, true)]);
    note(parent.face.regions === 0 && parent.face.chips === 0 && !parent.face.inspector && !parent.face.tabs, 'the parent draws no region frame, no chip, no inspector and no inner tab row');
  } else {
    say('\n(P258_PARENT_CHECKOUT not set: the parent build was not measured)');
  }
} catch (e) {
  note(false, `the run stopped: ${e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e)}`);
} finally {
  if (corpusMade) {
    const clean = spawnSync('bash', [join(REPO, 'build', 'p258', 'corpus.sh'), root, 'clean'], { encoding: 'utf8', cwd: REPO });
    say(`  ${(clean.stdout + clean.stderr).trim().split('\n').join('\n  ')}`);
  }
  rmSync(reposDir, { recursive: true, force: true });
  if (ownSocket) {
    for (const p of [join(tmpdir(), `tmux-${String(process.getuid?.() ?? 0)}`, socket), join('/private/tmp', `tmux-${String(process.getuid?.() ?? 0)}`, socket)]) {
      try {
        unlinkSync(p);
      } catch {
        /* never made */
      }
    }
  }
}

const sessionsAfter = operatorSessions();
note(sessionsAfter === sessionsBefore, `the operator's -L gmux server holds ${String(sessionsAfter)} session(s) after, ${String(sessionsBefore)} before`);
const left = spawnSync('bash', ['-lc', 'ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct | wc -l'], { encoding: 'utf8' });
say(`  Electron processes left on the machine, counted once: ${(left.stdout ?? '').trim()} (the operator's own app included)`);

say('');
say(`findings per arm: ${Object.entries(arms).map(([a, c]) => `${a} ${String(c)}`).join(', ')}`);
if (failures.length > 0) {
  say(`probe-p258-surface: FAIL, ${String(failures.length)} check(s):`);
  for (const f of failures) say(`  - ${f}`);
  process.exit(1);
}
say('probe-p258-surface: PASS. The regions, every rung against the gate\'s own computation, the inspector, the surfaces list, the worksheet, the word budgets, the two menu actions, the chip colours and the F1 draft, read off the DOM of one app run on a profile with no agent configured.');
process.exit(0);
