#!/usr/bin/env node
/**
 * build/p33312/plant.mjs — plant ONE signed read route, `probe`
 * (`GET /v1/probe`, answering `{ "planted": true }`), into a COPY of Tortie's
 * tree, so `probe:p33312` can measure what a Mac update that adds a door route
 * does to every phone already paired (Phase 333.12, build/p33312/SPEC.md §7.2).
 *
 * WHY A PLANT AND NOT A REAL ROUTE. This phase adds no route (SU5, R4): it
 * changes what happens WHEN one is added. The parent (`v0.111.1`) and this
 * phase's head are each measured twice, once as they are and once with a
 * twelfth route planted, which is the shape Phase 346's update will have. The
 * planted copy is built with the bundler alone, because its gates refuse a
 * planted route, which is the point of them.
 *
 * THE EDITS, every one an exact string that must match EXACTLY ONCE, or
 * NOTHING is written (exit 1, naming the anchor):
 *
 *   1. `src/shared/ipc/pocket.ts`: `'probe'` appended to `POCKET_ROUTE_IDS`;
 *   2. `src/main/pocket/door/table.ts`: the row appended to `POCKET_ROUTES`
 *      (`GET /v1/probe`, a read, signed, alive outside any window);
 *   3. `src/main/pocket/door/wire.ts`: `'probe'` in `DoorSignedRoute`;
 *   4. `src/main/pocket/door/wire.ts`: `'probe'` in `SIGNED_ROUTES`;
 *   5. `src/main/pocket/ipc.ts`: `case 'probe': return { planted: true };`
 *      before `case 'pair':` in the read switch;
 *   6. THE HEAD SHAPE ONLY, where `src/main/pocket/route-ledger.ts` exists: the
 *      ledger row `{ id: 'probe', method: 'GET', path: '/v1/probe', reads: true,
 *      signed: true, windowOnly: false, bodyCap: 1024, clause: null }`, so the
 *      head's reader (`allowedRoutesOf`) keeps a stored allowed set that names
 *      it, as Phase 346's own ledger row will.
 *
 * The two shapes are told apart by that file alone: without it the checkout is
 * the parent's shape (five edits in four files), with it the head's (six in
 * five). A checkout in which any anchor of its shape is missing or doubled is
 * in neither shape and is refused whole.
 *
 * WHAT IT REFUSES, before it reads a file: no argument; a path whose real path
 * is not under `/private/tmp/`; the operator's checkout `/Users/gdc/gmux` or
 * anything under his home; THIS script's own checkout (planting there would
 * put a route into the phase's own delta); a checkout with no
 * `src/shared/ipc/pocket.ts`; and a checkout already planted (the marker, or a
 * `probe` route already in any file it would edit).
 *
 * WHAT IT WRITES. The edited files, then the marker `.p33312-planted` at the
 * checkout's root, LAST: one JSON object naming the phase, the shape, the
 * route, every edit and the sha256 of every file it wrote. `probe:p33312`
 * refuses a planted checkout whose marker is missing, of the wrong shape, or
 * whose planted files no longer read what the plant wrote.
 *
 * It starts nothing: no shell, no git, no build. `--dry-run` plans and prints
 * and writes nothing.
 *
 *   node build/p33312/plant.mjs <checkout>             plant
 *   node build/p33312/plant.mjs --dry-run <checkout>   say what it would do
 *
 * Exit 0 planted (or planned), 1 an anchor did not match exactly once, 2 a
 * refusal of the path or the checkout.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
/** This script's own checkout, which is never planted. */
export const OWN_ROOT = resolve(dirname(HERE), '..', '..');
/** The operator's own checkout, named by the phase's hard rules. Never planted. */
export const OPERATOR_CHECKOUT = '/Users/gdc/gmux';
/** The only place a planted copy may live. */
export const SCRATCH_ROOT = '/private/tmp/';

/** The marker at the checkout's root, written last. */
export const MARKER = '.p33312-planted';
/** The file whose presence makes a checkout the head's shape. */
export const LEDGER_FILE = 'src/main/pocket/route-ledger.ts';
/** The route the plant adds, and what main answers on it. */
export const PLANTED_ROUTE = Object.freeze({ id: 'probe', method: 'GET', path: '/v1/probe' });
export const PLANTED_ANSWER = Object.freeze({ planted: true });

/**
 * The edits both shapes carry, in order. `from` must occur exactly once in its
 * file; `to` replaces it. Spelled to the tree's own lines (SPEC §8 seam 7:
 * the `case 'pair':` line, the `SIGNED_ROUTES` line and the `DoorSignedRoute`
 * line keep today's spelling).
 */
export const EDITS = Object.freeze([
  Object.freeze({
    name: "POCKET_ROUTE_IDS gains 'probe'",
    file: 'src/shared/ipc/pocket.ts',
    from: "  'scrollback'\n] as const;",
    to: "  'scrollback',\n  'probe'\n] as const;"
  }),
  Object.freeze({
    name: 'the door table gains the probe row',
    file: 'src/main/pocket/door/table.ts',
    from: 'signed: true }\n]);',
    to: "signed: true },\n  { id: 'probe', method: 'GET', path: '/v1/probe', reads: true, windowOnly: false, signed: true }\n]);"
  }),
  Object.freeze({
    name: "DoorSignedRoute names 'probe'",
    file: 'src/main/pocket/door/wire.ts',
    from: "'screen' | 'scrollback'>;",
    to: "'screen' | 'scrollback' | 'probe'>;"
  }),
  Object.freeze({
    name: "SIGNED_ROUTES names 'probe'",
    file: 'src/main/pocket/door/wire.ts',
    from: "'sessions', 'screen', 'scrollback'];",
    to: "'sessions', 'screen', 'scrollback', 'probe'];"
  }),
  Object.freeze({
    name: "main's read switch answers 'probe'",
    file: 'src/main/pocket/ipc.ts',
    from: "          case 'pair':\n",
    to: "          case 'probe':\n            return { planted: true };\n          case 'pair':\n"
  })
]);

/** The head shape's sixth edit: the ledger row, appended after the last row. */
export const LEDGER_EDIT = Object.freeze({
  name: 'the route ledger gains the probe row',
  file: LEDGER_FILE,
  from: ' }\n]);',
  to: " },\n  { id: 'probe', method: 'GET', path: '/v1/probe', reads: true, signed: true, windowOnly: false, bodyCap: 1024, clause: null }\n]);"
});

/** What says a file already carries the planted route. */
const ALREADY = [/'probe'/, /\/v1\/probe/];

const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const countOf = (text, needle) => text.split(needle).length - 1;

/** The edits of one shape, in order. */
export function editsFor(shape) {
  return shape === 'head' ? [...EDITS, LEDGER_EDIT] : [...EDITS];
}

/**
 * THE PLAN, pure. `texts` maps a repository-relative path to its text, or to
 * null (or no entry) when the file is absent. Answers `{ ok, shape, edits,
 * out, problems }`: `out` maps every file the plant would write to its new
 * text, and is empty unless `ok`. Nothing is written by this function, so a
 * refusal anywhere leaves every file as it was.
 */
export function planPlant(texts) {
  const read = (file) => (texts instanceof Map ? texts.get(file) : texts[file]) ?? null;
  const problems = [];
  const shape = typeof read(LEDGER_FILE) === 'string' ? 'head' : 'parent';
  const edits = editsFor(shape);
  const files = [...new Set(edits.map((e) => e.file))];
  for (const file of files) {
    const text = read(file);
    if (typeof text !== 'string') {
      problems.push(`${file} is missing, so the checkout is in neither shape`);
      continue;
    }
    if (ALREADY.some((re) => re.test(text))) problems.push(`${file} already names the probe route; this checkout was planted before`);
  }
  // Every anchor is counted against the file as it stands BEFORE any edit, so
  // a later edit can never be satisfied by an earlier one's text.
  for (const edit of edits) {
    const text = read(edit.file);
    if (typeof text !== 'string') continue;
    const n = countOf(text, edit.from);
    if (n !== 1) problems.push(`the anchor for "${edit.name}" in ${edit.file} matched ${String(n)} time(s), not once`);
  }
  if (problems.length > 0) return { ok: false, shape, edits, out: new Map(), problems };
  const out = new Map();
  for (const edit of edits) {
    const text = out.get(edit.file) ?? read(edit.file);
    out.set(edit.file, text.replace(edit.from, () => edit.to));
  }
  return { ok: true, shape, edits, out, problems };
}

/**
 * Why this path may not be planted, or null. Pure over the path as given, its
 * real path, this script's own checkout and the person's home.
 */
export function pathRefusal(given, real, { ownRoot = OWN_ROOT, home = userInfo().homedir } = {}) {
  if (typeof given !== 'string' || given.trim() === '') return 'no checkout was named';
  if (typeof real !== 'string' || real === '') return `${given} does not exist`;
  const under = (path, root) => path === root || path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`);
  if (under(real, OPERATOR_CHECKOUT) || under(resolve(given), OPERATOR_CHECKOUT)) return `${real} is the operator's own checkout, which is never planted`;
  if (typeof home === 'string' && home !== '' && (under(real, home) || under(resolve(given), home))) return `${real} is under the person's home, which is never planted`;
  if (!real.startsWith(SCRATCH_ROOT)) return `${real} is not under ${SCRATCH_ROOT}; a planted copy lives in scratch only`;
  if (under(real, ownRoot) || under(ownRoot, real)) return `${real} is this plant's own checkout (${ownRoot}); planting there would put a route into the phase's own delta`;
  return null;
}

/** The marker a plant wrote, parsed, or null. */
export function readMarker(checkout) {
  try {
    const parsed = JSON.parse(readFileSync(join(checkout, MARKER), 'utf8'));
    return parsed !== null && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * What is wrong with a planted checkout, for the probe: no marker, another
 * shape than `wantShape`, or a planted file that no longer reads what the
 * plant wrote. An empty list is a checkout the probe may launch.
 */
export function markerProblems(checkout, wantShape) {
  const marker = readMarker(checkout);
  if (marker === null) return [`${checkout} carries no ${MARKER}; run node build/p33312/plant.mjs on it first`];
  const problems = [];
  if (marker.phase !== '333.12' || marker.route !== PLANTED_ROUTE.id) problems.push(`${MARKER} is not this plant's (${JSON.stringify({ phase: marker.phase, route: marker.route })})`);
  if (marker.shape !== wantShape) problems.push(`${checkout} was planted in the ${String(marker.shape)} shape, and the ${wantShape} shape is wanted here`);
  const shas = marker.sha256 !== null && typeof marker.sha256 === 'object' ? marker.sha256 : {};
  const files = Object.keys(shas);
  if (files.length === 0) problems.push(`${MARKER} names no planted file`);
  for (const file of files) {
    let text = null;
    try {
      text = readFileSync(join(checkout, file), 'utf8');
    } catch {
      text = null;
    }
    if (text === null) problems.push(`${file} is gone from the planted checkout`);
    else if (sha256(text) !== shas[file]) problems.push(`${file} no longer reads what the plant wrote`);
  }
  return problems;
}

/** Every file a plan of either shape reads, relative to the checkout. */
export const PLANT_FILES = Object.freeze([...new Set([...EDITS.map((e) => e.file), LEDGER_FILE])]);

/** Read a checkout's files the plan needs. Absent files read as null. */
export function textsOf(checkout) {
  const texts = new Map();
  for (const file of PLANT_FILES) {
    const path = join(checkout, file);
    texts.set(file, existsSync(path) ? readFileSync(path, 'utf8') : null);
  }
  return texts;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const given = args.filter((a) => a !== '--dry-run')[0];
  const refuse = (why, code = 2) => {
    console.error(`[p33312 plant] REFUSED. ${why}`);
    process.exit(code);
  };
  if (given === undefined) refuse('usage: node build/p33312/plant.mjs [--dry-run] <checkout under /private/tmp>');
  let real = '';
  try {
    real = realpathSync(given);
  } catch {
    real = '';
  }
  const why = pathRefusal(given, real);
  if (why !== null) refuse(why);
  if (!statSync(real).isDirectory()) refuse(`${real} is not a directory`);
  if (!existsSync(join(real, 'src', 'shared', 'ipc', 'pocket.ts'))) refuse(`${real} holds no src/shared/ipc/pocket.ts, so it is not a Tortie checkout`);
  if (existsSync(join(real, MARKER))) refuse(`${real} already carries ${MARKER}; it was planted before`);
  const plan = planPlant(textsOf(real));
  if (!plan.ok) {
    for (const p of plan.problems) console.error(`[p33312 plant] ${p}`);
    refuse(`nothing was written to ${real}`, 1);
  }
  if (dryRun) {
    console.log(`[p33312 plant] would plant probe into ${real}: ${String(plan.edits.length)} edits in ${String(plan.out.size)} files (shape ${plan.shape}); nothing was written`);
    return;
  }
  const shas = {};
  for (const [file, text] of plan.out) {
    writeFileSync(join(real, file), text, 'utf8');
    shas[file] = sha256(text);
  }
  const marker = {
    phase: '333.12',
    route: PLANTED_ROUTE.id,
    method: PLANTED_ROUTE.method,
    path: PLANTED_ROUTE.path,
    shape: plan.shape,
    edits: plan.edits.map((e) => ({ file: e.file, name: e.name })),
    sha256: shas,
    at: new Date().toISOString()
  };
  writeFileSync(join(real, MARKER), `${JSON.stringify(marker, null, 1)}\n`, 'utf8');
  console.log(`[p33312 plant] planted probe into ${real}: ${String(plan.edits.length)} edits in ${String(plan.out.size)} files (shape ${plan.shape}); marker ${MARKER} written`);
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === HERE;
if (isMain) main();
