#!/usr/bin/env node
/**
 * `node build/p346/agent-marks.mjs [--check | --self-test]` — the phone's agent
 * marks, generated from the Mac's own (Phase 346, build/p346/SPEC.md D23, rule
 * (bb8) of conformance:ios).
 *
 * WHY IT EXISTS. New session on the phone draws a row of the marks of the
 * agents installed on the Mac (his answer 6, "you should see the installed
 * available icons for the provider harnesses"). The marks are the Mac's: the
 * thirteen compiled launchable rows of `src/main/agents/registry.ts` each name
 * an `iconKey`, and `src/renderer/assets/agents/<iconKey>.svg` is the mark the
 * Mac draws for it. This script writes each one into
 * `ios/Tortie/AgentMarks.xcassets/agent-<iconKey>.imageset/` as a TEMPLATE
 * vector image, so the phone tints it with a token and the marks cannot drift
 * from the Mac's: `--check` regenerates the catalog in memory and compares it
 * with the committed bytes, file for file.
 *
 * THE NORMALISATION (D23), the only thing it does to a mark:
 *   - every `currentColor` is written black (`#000000`): a template image is
 *     drawn by its alpha alone, and Xcode's vector reader does not know
 *     `currentColor`;
 *   - `width` and `height` are set to the view box's own size, because Xcode
 *     reads a mark's size from them and `1em` is no size;
 *   - droid's black plate (a disc as wide as its view box) is DROPPED and its
 *     glyph kept, written black, as the Mac drops omp's favicon plate
 *     (src/renderer/icons/AgentIcon.tsx), so every mark is one ink;
 *   - every path's data is written with ONE space between its parameters,
 *     the same commands and the same numbers, byte for byte, because Xcode's
 *     vector reader (CoreSVG) misreads an arc's two one-digit flags run into
 *     the number after them (`0 01.415-.287`, `0 000 .975`): measured on
 *     2026-10-16, it logged an error compiling the Mac's deepseek and gemini
 *     marks as written and none once their data was spaced.
 * Every image set says `preserves-vector-representation` and
 * `template-rendering-intent: template`; the catalog holds no colour set and
 * no other appearance. `Assets.xcassets` keeps the app icon alone (rule r).
 *
 * --check regenerates everything in memory and (1) compares every file with
 * the committed bytes, (2) refuses a missing image set and an extra one, and
 * (3) reads every committed mark for a colour other than black, `none` or a
 * gradient's own `url(#…)`, a `style` attribute, and droid's plate. Before
 * that, each clause is proved on copies it breaks itself (`--self-test` runs
 * only those proofs): a changed byte, a missing set, an extra set, a colour
 * left in and droid's plate kept must each read red, and the untouched copy
 * green, or the run is refused. Without a flag the catalog is written.
 *
 * WHAT IT DOES NOT DO. It opens no socket, reads nothing under anybody's home,
 * and starts nothing but the pinned tsx that runs it (`build/ts-runner.mjs`),
 * so it can read the compiled registry, as build/p316/vectors.mjs and
 * build/p3333/sample.mjs do. It imports no other build/ script.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const CATALOG_NAME = 'ios/Tortie/AgentMarks.xcassets';
const CATALOG = join(ROOT, ...CATALOG_NAME.split('/'));
const MARKS = join(ROOT, 'src', 'renderer', 'assets', 'agents');
const TAG = '[p346 marks]';
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

if (process.env.P346_MARKS_INNER !== '1') {
  // THE OUTER RUN: the same file again, under the repository's pinned tsx.
  const { tsxCli } = await import('../ts-runner.mjs');
  const run = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', HERE, ...process.argv.slice(2)],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, P346_MARKS_INNER: '1' }
    }
  );
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  if (run.error !== undefined) {
    process.stdout.write(`${TAG} FAIL: ${String(run.error.message)}\n`);
    process.exit(1);
  }
  process.exit(run.status ?? 1);
}

// ---------------------------------------------------------------------------
// THE INNER RUN, under tsx: the compiled registry.
// ---------------------------------------------------------------------------

const { LAUNCHABLE_AGENT_IDS, getRegistryEntry } = await import('../../src/main/agents/registry.ts');

/** The thirteen compiled launchable rows' mark keys, in registry order. */
const ICON_KEYS = [...new Set(LAUNCHABLE_AGENT_IDS.map((id) => getRegistryEntry(id).iconKey))];

/** The one ink every mark is written in. */
const INK = '#000000';

/** The catalog's own Contents.json, as Xcode writes one. */
const CATALOG_INFO = { info: { author: 'xcode', version: 1 } };

/** An image set's Contents.json: one universal vector, a template. */
function imageSetContents(file) {
  return {
    images: [{ filename: file, idiom: 'universal' }],
    info: { author: 'xcode', version: 1 },
    properties: { 'preserves-vector-representation': true, 'template-rendering-intent': 'template' }
  };
}

/** JSON as the catalog holds it: two-space indent, one newline at the end. */
const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** The view box's width and height, or null. */
function viewBoxOf(svg) {
  const m = /<svg\b[^>]*\bviewBox="([^"]+)"/.exec(svg);
  if (m === null) return null;
  const parts = m[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n)) || parts[2] <= 0 || parts[3] <= 0) return null;
  return { width: parts[2], height: parts[3] };
}

/** A disc as wide as the view box: a plate, not a mark. */
function plateOf(svg) {
  const box = viewBoxOf(svg);
  if (box === null) return null;
  for (const m of svg.matchAll(/<circle\b[^>]*>(?:\s*<\/circle>)?/g)) {
    const r = Number(/\br="([^"]+)"/.exec(m[0])?.[1]);
    if (Number.isFinite(r) && r * 2 >= Math.min(box.width, box.height)) return m[0];
  }
  return null;
}

/** Each command's parameters per repetition; an arc's fourth and fifth are one-character flags. */
const ARITY = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };
const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/;

/**
 * A path's data with one space between its parameters and the command letter
 * against the first, every number as it was written. Throws on data it
 * cannot read, so a mark that changed shape is a failure, never a guess.
 */
function spacedPath(d) {
  let i = 0;
  const out = [];
  const skip = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i += 1;
  };
  skip();
  while (i < d.length) {
    const letter = d[i];
    const arity = ARITY[letter.toUpperCase()];
    if (arity === undefined) throw new Error(`path data holds ${JSON.stringify(letter)} where a command is`);
    i += 1;
    const params = [];
    skip();
    if (arity === 0) {
      out.push(letter);
      continue;
    }
    // A command's parameters repeat until the next command letter.
    while (i < d.length && !/[A-Za-z]/.test(d[i])) {
      const at = params.length % arity;
      if (letter.toUpperCase() === 'A' && (at === 3 || at === 4)) {
        if (d[i] !== '0' && d[i] !== '1') throw new Error(`an arc's flag is ${JSON.stringify(d[i])}`);
        params.push(d[i]);
        i += 1;
      } else {
        const m = NUMBER.exec(d.slice(i));
        if (m === null) throw new Error(`path data holds ${JSON.stringify(d.slice(i, i + 8))} where a number is`);
        params.push(m[0]);
        i += m[0].length;
      }
      skip();
    }
    if (params.length === 0 || params.length % arity !== 0) throw new Error(`${letter} takes its parameters in ${String(arity)}s and has ${String(params.length)}`);
    out.push(`${letter}${params.join(' ')}`);
  }
  return out.join('');
}

/**
 * One mark, normalised (D23). Throws when the Mac's mark is not one this
 * script can read, so a mark that changed shape is a failure and never a
 * silent copy.
 */
function normalise(key, source) {
  const box = viewBoxOf(source);
  if (box === null) throw new Error(`${key}.svg has no view box this script reads`);
  let svg = source.trim();
  const plate = plateOf(svg);
  if (plate !== null) svg = svg.replace(plate, '');
  svg = svg.replace(/currentColor/g, INK);
  // What was drawn on the plate is the glyph: written in the one ink.
  if (plate !== null) svg = svg.replace(/\b(fill|stroke|stop-color)="#(?!000000")[0-9A-Fa-f]{3,8}"/g, `$1="${INK}"`);
  svg = svg.replace(/\sd="([^"]*)"/g, (_, d) => ` d="${spacedPath(d)}"`);
  svg = svg.replace(/(<svg\b[^>]*?)\swidth="[^"]*"/, `$1 width="${String(box.width)}"`);
  svg = svg.replace(/(<svg\b[^>]*?)\sheight="[^"]*"/, `$1 height="${String(box.height)}"`);
  return `${svg}\n`;
}

/** The whole catalog, as a map of path (relative to the catalog) to text. */
function generate() {
  const files = new Map();
  files.set('Contents.json', jsonText(CATALOG_INFO));
  for (const key of ICON_KEYS) {
    const sourcePath = join(MARKS, `${key}.svg`);
    if (!existsSync(sourcePath)) throw new Error(`the registry names the mark ${key}, and src/renderer/assets/agents/${key}.svg does not exist`);
    const set = `agent-${key}.imageset`;
    const file = `agent-${key}.svg`;
    files.set(`${set}/Contents.json`, jsonText(imageSetContents(file)));
    files.set(`${set}/${file}`, normalise(key, readFileSync(sourcePath, 'utf8')));
  }
  return files;
}

/** Every file under the committed catalog, by path relative to it. */
function readCatalog() {
  const files = new Map();
  if (!existsSync(CATALOG)) return files;
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else files.set(relative(CATALOG, path).split('\\').join('/'), readFileSync(path, 'utf8'));
    }
  };
  walk(CATALOG);
  return files;
}

// ---------------------------------------------------------------------------
// The clauses, each pure over its inputs and answering its problems
// ---------------------------------------------------------------------------

/** (1) and (2): the committed catalog is the generated one, file for file. */
function bytesClause(want, have) {
  const problems = [];
  const sets = (files) => new Set([...files.keys()].filter((p) => p.includes('/')).map((p) => p.split('/')[0]));
  const wantSets = sets(want);
  const haveSets = sets(have);
  for (const set of wantSets) if (!haveSets.has(set)) problems.push(`(2) ${CATALOG_NAME} has no ${set}, a mark the registry names`);
  for (const set of haveSets) if (!wantSets.has(set)) problems.push(`(2) ${CATALOG_NAME} holds ${set}, which no compiled launchable row names`);
  for (const [path, text] of want) {
    if (!have.has(path)) {
      if (haveSets.has(path.split('/')[0]) || !path.includes('/')) problems.push(`(1) ${CATALOG_NAME}/${path} is missing`);
      continue;
    }
    if (have.get(path) !== text) problems.push(`(1) ${CATALOG_NAME}/${path} is not what this script writes from the Mac's mark`);
  }
  for (const path of have.keys()) {
    if (!want.has(path) && wantSets.has(path.split('/')[0])) problems.push(`(1) ${CATALOG_NAME}/${path} is a file this script does not write`);
  }
  return problems;
}

/** (3): every mark is one ink, no style, and no plate; every set a template vector. */
function contentClause(files) {
  const problems = [];
  let marks = 0;
  for (const [path, text] of files) {
    if (path.endsWith('.svg')) {
      marks += 1;
      for (const m of text.matchAll(/\b(fill|stroke|stop-color|color|flood-color|lighting-color)="([^"]*)"/g)) {
        const value = m[2].trim();
        if (value !== INK && value !== 'none' && !/^url\(#[^)]+\)$/.test(value)) problems.push(`(3) ${path} draws ${m[1]}="${value}"; every mark is one ink (${INK}), tinted on the phone by a token`);
      }
      if (/\bstyle="/.test(text) || /<style\b/.test(text)) problems.push(`(3) ${path} carries a style, which could hold a colour`);
      if (/currentColor/.test(text)) problems.push(`(3) ${path} still says currentColor`);
      if (plateOf(text) !== null) problems.push(`(3) ${path} keeps a plate as wide as its view box, which a template draws as a solid disc`);
      if (/\b(?:width|height)="[^"]*em"/.test(text)) problems.push(`(3) ${path} is sized in em, which is no size to Xcode`);
      for (const m of text.matchAll(/\sd="([^"]*)"/g)) {
        let spaced = null;
        try {
          spaced = spacedPath(m[1]);
        } catch {
          spaced = null;
        }
        if (spaced !== m[1]) problems.push(`(3) ${path} holds path data that is not spaced one parameter at a time, which Xcode's vector reader misreads at an arc's flags`);
      }
    } else if (path !== 'Contents.json' && path.endsWith('Contents.json')) {
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        problems.push(`(3) ${path} is not JSON`);
        continue;
      }
      const props = parsed?.properties ?? {};
      if (props['preserves-vector-representation'] !== true || props['template-rendering-intent'] !== 'template') problems.push(`(3) ${path} is not a template vector image set`);
      if ((parsed?.images ?? []).length !== 1 || parsed.images.some((i) => 'appearances' in i)) problems.push(`(3) ${path} holds another image or another appearance`);
    }
    if (/\.colorset\//.test(path)) problems.push(`(3) ${path} is a colour set; the catalog holds marks alone`);
  }
  if (marks === 0) problems.push('(3) the catalog holds no mark');
  return problems;
}

/** Every clause over one pair: the problems, empty when the catalog holds. */
function verdict(want, have) {
  return [...bytesClause(want, have), ...contentClause(have)];
}

// ---------------------------------------------------------------------------
// The proofs: each clause red on a copy it breaks itself
// ---------------------------------------------------------------------------

function proofs(want) {
  const failures = [];
  const copy = () => new Map(want);
  const red = (what, broken, needle) => {
    const problems = verdict(want, broken);
    if (!problems.some((p) => p.includes(needle))) failures.push(`the proof "${what}" read green; that clause has stopped checking`);
  };
  if (verdict(want, copy()).length !== 0) failures.push('the untouched copy reads red, so every red below would prove nothing');
  const first = ICON_KEYS[0];
  const droid = ICON_KEYS.includes('droid') ? 'droid' : null;
  if (droid === null) failures.push('the registry names no droid, so the plate proof has nothing to break');
  red('a changed byte', (() => {
    const c = copy();
    const path = `agent-${first}.imageset/agent-${first}.svg`;
    c.set(path, c.get(path).replace('d="M', 'd="m'));
    return c;
  })(), 'is not what this script writes');
  red('a missing set', (() => {
    const c = copy();
    for (const path of [...c.keys()]) if (path.startsWith(`agent-${first}.imageset/`)) c.delete(path);
    return c;
  })(), `has no agent-${first}.imageset`);
  red('an extra set', (() => {
    const c = copy();
    c.set('agent-shell.imageset/Contents.json', jsonText(imageSetContents('agent-shell.svg')));
    c.set('agent-shell.imageset/agent-shell.svg', c.get(`agent-${first}.imageset/agent-${first}.svg`));
    return c;
  })(), 'agent-shell.imageset, which no compiled launchable row names');
  red('a colour left in', (() => {
    const c = copy();
    const path = `agent-${first}.imageset/agent-${first}.svg`;
    c.set(path, c.get(path).replace(INK, '#FAFAFA'));
    return c;
  })(), 'every mark is one ink');
  if (droid !== null) {
    red("droid's plate kept", (() => {
      const c = copy();
      const path = 'agent-droid.imageset/agent-droid.svg';
      const source = readFileSync(join(MARKS, 'droid.svg'), 'utf8');
      const plate = plateOf(source);
      if (plate === null) failures.push('droid.svg holds no plate, so the plate proof has nothing to keep');
      c.set(path, c.get(path).replace(/(<svg\b[^>]*>)(<g>)?/, `$1$2${(plate ?? '').replace(/fill="[^"]*"/, `fill="${INK}"`)}`));
      return c;
    })(), 'keeps a plate');
  }
  red('an arc flag run into its number', (() => {
    const c = copy();
    const path = 'agent-deepseek.imageset/agent-deepseek.svg';
    const source = readFileSync(join(MARKS, 'deepseek.svg'), 'utf8');
    const compact = /\sd="([^"]*)"/.exec(source)?.[1] ?? '';
    if (!/0 01\./.test(compact)) failures.push('deepseek.svg no longer holds a compact arc flag, so this proof has nothing to keep');
    c.set(path, c.get(path).replace(/\sd="[^"]*"/, ` d="${compact}"`));
    return c;
  })(), 'not spaced one parameter at a time');
  red('a set that is not a template', (() => {
    const c = copy();
    const path = `agent-${first}.imageset/Contents.json`;
    c.set(path, c.get(path).replace('"template"', '"original"'));
    return c;
  })(), 'not a template vector image set');
  return failures;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

let want;
try {
  want = generate();
} catch (err) {
  process.stdout.write(`${TAG} FAIL: ${String(err?.message ?? err)}\n`);
  process.exit(1);
}
if (ICON_KEYS.length !== 13) {
  process.stdout.write(`${TAG} FAIL: the registry names ${String(ICON_KEYS.length)} launchable marks; this phase was written over 13 (build/p346/SPEC.md M1), so read the change and say so here\n`);
  process.exit(1);
}

const proofFailures = proofs(want);
if (proofFailures.length > 0) {
  for (const f of proofFailures) process.stdout.write(`${TAG} FAIL: ${f}\n`);
  process.exit(1);
}
if (SELF_TEST) {
  process.stdout.write(`${TAG} PASS: self-test, every clause read red on its own break and green untouched (${String(ICON_KEYS.length)} marks)\n`);
  process.exit(0);
}

if (CHECK) {
  const problems = verdict(want, readCatalog());
  if (problems.length > 0) {
    for (const p of problems) process.stdout.write(`${TAG} FAIL: ${p}\n`);
    process.stdout.write(`${TAG} run node build/p346/agent-marks.mjs to write the catalog from the Mac's marks\n`);
    process.exit(1);
  }
  process.stdout.write(`${TAG} PASS: ${CATALOG_NAME} is the Mac's ${String(ICON_KEYS.length)} marks, template vectors in one ink, byte for byte (${ICON_KEYS.join(', ')})\n`);
  process.exit(0);
}

// Write: the catalog is made again whole, so a set no row names any more goes.
const contentProblems = contentClause(want);
if (contentProblems.length > 0) {
  for (const p of contentProblems) process.stdout.write(`${TAG} FAIL: ${p}\n`);
  process.exit(1);
}
rmSync(CATALOG, { recursive: true, force: true });
for (const [path, text] of want) {
  const out = join(CATALOG, ...path.split('/'));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
}
process.stdout.write(`${TAG} wrote ${CATALOG_NAME}: ${String(ICON_KEYS.length)} marks (${ICON_KEYS.join(', ')})\n`);
