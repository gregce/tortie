#!/usr/bin/env node
/**
 * `npm run conformance:harnessprobes`. The cheap gate that keeps Phase 335's
 * promise executable rather than asserted (build/p335/SPEC.md §8, the Phase
 * 335 entry in docs/BACKLOG.md).
 *
 * ## The defect it exists for
 *
 * The operator's rule of 2026-09-29 is that Gemini, Qwen, Antigravity and Grok
 * are never started by any run, not even `--version`, because each updates
 * itself on start, and Droid is hidden the same way (build/hidden-agents.mjs).
 * Phase 316.6's reverify sampled the process table under `smoke:t1` and caught
 * `agy --version`: a `GMUX_SMOKE` launch returns at `dispatchHarness` before
 * the configuration overlay is installed, so the boot warm's detection scan
 * walked the compiled registry and version-probed every agent it resolved. The
 * fix is in the app, not in the runners: in a harness launch
 * (`isIsolatedLaunch`, being `GMUX_SMOKE` or `GMUX_SHOT`) detection still
 * resolves every binary and starts no version probe unless the running mode
 * named the agent first. This gate holds that, in `npm run build`, so no smoke
 * can run on a tree where a harness mode slipped past it.
 *
 * ## The six clauses
 *
 *   HP1  THE PREDICATE. detection.ts imports `isIsolatedLaunch` by value,
 *        unrenamed, from '../harness/launch-gate', declares no binding of that
 *        name, and names neither `isHarnessLaunch` nor `probesRequested`. The
 *        FIRST statement of `versionProbeHeld` is
 *        `if (!isIsolatedLaunch(env)) return false;` and its `env` defaults to
 *        `process.env`. launch-gate.ts's `isIsolatedLaunch` reads exactly two
 *        terms, `set(env, 'GMUX_SMOKE')` and `set(env, 'GMUX_SHOT')`.
 *   HP2  ONE SPAWN, ALWAYS BEHIND THE HOLD. In detection.ts `runGuarded(` is
 *        called once, inside `execProbe`; `execProbe(` three times, twice in
 *        `runVersionProbe` and once in `detectOne`; `runVersionProbe(` once, in
 *        `detectOne`; and none of the three is named any other way. In
 *        `detectOne` the statement declaring `versionP` asks
 *        `versionProbeHeld(entry.id, binPath)` and answers `Promise.resolve`
 *        before `: runVersionProbe(`, and the callback handed to
 *        `shadowPaths.map(` returns on `versionProbeHeld(entry.id, <its path>)`
 *        before its `execProbe(`, which is the only `execProbe(` in
 *        `detectOne`. And `versionProbeHeld` is named exactly three times, its
 *        one declaration and those two holds, so no local binding, parameter
 *        or import of that name can shadow the hold (the integrator's arm,
 *        A16).
 *   HP3  THE DEFAULT NAMES NOTHING. The naming binding (the module-level `let`
 *        that `nameHarnessVersionProbes` assigns) is initialised with
 *        `agents: []` and no string at all, is assigned nowhere else, is never
 *        mutated through a property, and `resetDetectionCache` does not name
 *        it.
 *   HP4  WHO MAY NAME, AND WHAT. Over every non-test `.ts` under src/main
 *        (discovered, floor 600 files), `nameHarnessVersionProbes(` is called
 *        exactly twice: in src/main/harness/shadow.ts with an object literal
 *        whose `agents` is `['droid']` and which carries a `within:` key, and
 *        in src/main/conformance/resume.ts with `{ agents: cfg.agents }`. It is
 *        declared once, in detection.ts; an import or export that renames it,
 *        or any reference that is not a call or an import, fails; and a call
 *        without `within:` naming a literal id from `HIDDEN_AGENT_IDS` fails.
 *   HP5  THE ORDER. In `runResumeConformance` the naming sits after
 *        `setAgentTableSource(() => conformanceDetectionTable(cfg.agents));`
 *        and before `const core = await getGmuxCore();`; in `runSmokeShadow`
 *        after both `writeShim(` calls and before `getGmuxCore(`. Each is a
 *        statement of its own in the same block as the boot it precedes, and
 *        shadow's `within:` is `userData`, the one binding assigned from
 *        `app.getPath('userData')`.
 *   HP6  NO HARNESS SPAWNS A VERSION OF ITS OWN. No non-test `.ts` under
 *        src/main/harness (floor 40) or src/main/conformance (floor 6) reads a
 *        `versionProbe` property, names `runVersionProbe` or `execProbe`, or
 *        hands `'--version'`, `'-V'` or `'-v'` (as a literal argument or
 *        through a name assigned one) to `runGuarded(`, `execFile(`,
 *        `execFileSync(`, `spawn(` or `spawnSync(`.
 *
 * ## The ablations, run on every invocation
 *
 * The unedited tree must be green. Then sixteen in-memory copies of it, each
 * with one clause broken (A1 to A15 below, SPEC §8, and A16, the integrator's
 * shadowed hold), are judged by the same
 * rules, and each must be red on exactly the clause that owns it and on no
 * other. A copy whose edit no longer finds its text in the tree fails the gate
 * too, because an ablation that cannot be made proves nothing. Nothing is
 * written to disk.
 *
 * ## How it reads
 *
 * Every file is read with its comments blanked first (`stripComments` from
 * build/scan-source.mjs, which keeps every offset and leaves strings alone),
 * so a clause left only in prose never passes, and a function's body is read
 * by matching brackets (`closeOf`). It spawns nothing, opens no socket, writes
 * nothing, and reads nothing outside the tree it is pointed at.
 *
 * Usage:
 *   node build/conformance-harnessprobes.mjs                 this worktree
 *   node build/conformance-harnessprobes.mjs --root <dir>    another tree
 *   node build/conformance-harnessprobes.mjs --json          one JSON line
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assignedValues, callArguments, closeOf, statementEnd, stripComments } from './scan-source.mjs';

const TAG = '[conformance:harnessprobes]';

function argValue(flag) {
  const at = process.argv.indexOf(flag);
  return at === -1 ? null : (process.argv[at + 1] ?? null);
}
const ROOT = resolve(argValue('--root') ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const AS_JSON = process.argv.includes('--json');

export const FILES = Object.freeze({
  detection: 'src/main/agents/detection.ts',
  launchGate: 'src/main/harness/launch-gate.ts',
  shadow: 'src/main/harness/shadow.ts',
  resume: 'src/main/conformance/resume.ts'
});

export const CLAUSES = ['HP1', 'HP2', 'HP3', 'HP4', 'HP5', 'HP6'];

/** The fewest files each walk may find before it is not trusted (651, 42 and 8 at this phase's head). */
export const FLOORS = Object.freeze({ main: 600, harness: 40, conformance: 6 });

const NAMING = 'nameHarnessVersionProbes';
const VERSION_FLAGS = ['--version', '-V', '-v'];
const SPAWNS = ['runGuarded', 'execFile', 'execFileSync', 'spawn', 'spawnSync'];
/** The primary probe's statement in detectOne, spaces removed (SPEC §6 M2). */
const PRIMARY_HOLD =
  'constversionP=probe===null||versionProbeHeld(entry.id,binPath)?Promise.resolve<VersionProbeResult>({version:null,identityFailed:false}):runVersionProbe(binPath,probe,userPath);';
/** The shadowed copies' guard in the shadowPaths.map( callback, spaces removed, for the callback's own parameter. */
const shadowHold = (param) => `if(probe===null||versionProbeHeld(entry.id,${param}))return{${param},version:null};`;
const THIRD_CALLER =
  "a harness mode that needs an agent's version is added to this gate's table, with its reason, in the same commit";

// ---------------------------------------------------------------------------
// The tree, read once
// ---------------------------------------------------------------------------

/** Every non-test `.ts` under src/main, as a Map of repository-relative path to raw text. */
function readTree(root) {
  const tree = new Map();
  const walk = (rel) => {
    for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== 'node_modules') walk(child);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        tree.set(child, readFileSync(join(root, child), 'utf8'));
      }
    }
  };
  walk('src/main');
  return tree;
}

/** Stripped text, cached by path and kept while the raw text is the same string. */
const strippedCache = new Map();
function code(tree, rel) {
  const raw = tree.get(rel);
  if (raw === undefined) return null;
  const hit = strippedCache.get(rel);
  if (hit !== undefined && hit.raw === raw) return hit.code;
  const stripped = stripComments(raw);
  strippedCache.set(rel, { raw, code: stripped });
  return stripped;
}

// ---------------------------------------------------------------------------
// The readers
// ---------------------------------------------------------------------------

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const squash = (s) => s.replace(/\s+/g, '');
const ident = (name) => new RegExp(`(?<![\\w$])${escapeRe(name)}(?![\\w$])`, 'g');

/** Every declaration `function NAME(` in `code`, as `{ start, open, close }` of its body. */
function functionSpans(code, name) {
  const out = [];
  const re = new RegExp(`\\bfunction\\s*\\*?\\s*${escapeRe(name)}\\s*\\(`, 'g');
  let m;
  while ((m = re.exec(code)) !== null) {
    const params = closeOf(code, m.index + m[0].length - 1);
    if (params === -1) continue;
    const open = code.indexOf('{', params);
    if (open === -1) continue;
    const close = closeOf(code, open);
    if (close === -1) continue;
    out.push({ start: m.index, paramsOpen: m.index + m[0].length - 1, paramsClose: params, open, close });
  }
  return out;
}

/** The one declaration of NAME, or null with a problem pushed. */
function oneFunction(code, name, file, problems) {
  const spans = functionSpans(code, name);
  if (spans.length !== 1) {
    problems.push(`${file} declares function ${name} ${String(spans.length)} times, not once; the rules below read that one function`);
    return null;
  }
  return spans[0];
}

const inside = (span, at) => span !== null && at > span.open && at < span.close;

/** `{ at, open }` of every call `NAME(` that is not a `function NAME(` declaration. */
function callSites(code, name) {
  const out = [];
  const re = new RegExp(`(?<![\\w$])${escapeRe(name)}\\s*\\(`, 'g');
  let m;
  while ((m = re.exec(code)) !== null) {
    if (/\bfunction\s*\*?\s*$/.test(code.slice(Math.max(0, m.index - 20), m.index))) continue;
    out.push({ at: m.index, open: m.index + m[0].length - 1 });
  }
  return out;
}

/** The spans of every `import … {…} from '…'` and `export {…} from '…'` clause, with its module and specifiers. */
function importClauses(code) {
  const out = [];
  const re = /\b(import|export)\s+(type\s+)?\{([^}]*)\}\s*from\s*(['"])([^'"]+)\4/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const specifiers = m[3]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => {
        const one = /^(type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?$/.exec(s);
        return one === null ? { name: s, alias: null, typeOnly: false } : { name: one[2], alias: one[3] ?? null, typeOnly: one[1] !== undefined };
      });
    out.push({ start: m.index, end: m.index + m[0].length, typeOnly: m[2] !== undefined, from: m[5], specifiers });
  }
  return out;
}

/** The text of the first statement in a block's inner text. */
function firstStatement(inner) {
  let i = 0;
  while (i < inner.length && /\s/.test(inner[i])) i += 1;
  const end = statementEnd(inner, i);
  return end === -1 ? inner.slice(i) : inner.slice(i, end);
}

/** Every complete string literal in `text`, as its contents. */
function stringLiterals(text) {
  const out = [];
  for (let i = 0; i < text.length; i += 1) {
    const q = text[i];
    if (q !== "'" && q !== '"' && q !== '`') continue;
    let j = i + 1;
    let body = '';
    while (j < text.length && text[j] !== q) {
      if (text[j] === '\\') {
        body += text[j + 1] ?? '';
        j += 2;
        continue;
      }
      body += text[j];
      j += 1;
    }
    out.push(body);
    i = j;
  }
  return out;
}

/** Every index where `needle` occurs in `text`, whitespace ignored on both sides. */
function findLoose(text, needle) {
  const re = new RegExp(squash(needle).split('').map(escapeRe).join('\\s*'), 'g');
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) out.push(m.index);
  return out;
}

/** The brace depth at `to`, counted from `from`, strings skipped. */
function braceDepth(code, from, to) {
  let depth = 0;
  let quote = '';
  for (let i = from; i < to; i += 1) {
    const c = code[i];
    if (quote !== '') {
      if (c === '\\') i += 1;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
  }
  return depth;
}

/** Whether the call at `at` starts a statement of its own. */
function startsStatement(code, at) {
  let i = at - 1;
  while (i >= 0 && /\s/.test(code[i])) i -= 1;
  return i < 0 || ';{}'.includes(code[i]);
}

/** The first `=` of a declaration statement that sits outside every bracket, or -1. */
function initialiserAt(stmt) {
  let depth = 0;
  let quote = '';
  for (let i = 0; i < stmt.length; i += 1) {
    const c = stmt[i];
    if (quote !== '') {
      if (c === '\\') i += 1;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if ('([{'.includes(c)) depth += 1;
    else if (')]}'.includes(c)) depth -= 1;
    else if (c === '=' && depth === 0 && !'=>'.includes(stmt[i + 1] ?? '') && !'=!<>'.includes(stmt[i - 1] ?? '')) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// The clauses
// ---------------------------------------------------------------------------

function ruleHP1(tree) {
  const p = [];
  const d = code(tree, FILES.detection);
  const lg = code(tree, FILES.launchGate);
  if (d === null || lg === null) return [`the tree has no ${d === null ? FILES.detection : FILES.launchGate}`];

  const byValue = importClauses(d).some(
    (clause) =>
      clause.from === '../harness/launch-gate' &&
      !clause.typeOnly &&
      clause.specifiers.some((s) => s.name === 'isIsolatedLaunch' && s.alias === null && !s.typeOnly)
  );
  if (!byValue) p.push(`${FILES.detection} must import isIsolatedLaunch by value, unrenamed, from '../harness/launch-gate': the hold is the existing two-term predicate and no copy of it`);
  if (/\b(?:function|const|let|var|class)\s+isIsolatedLaunch\b/.test(d)) p.push(`${FILES.detection} declares its own isIsolatedLaunch; delete it and import launch-gate.ts's`);
  for (const wider of ['isHarnessLaunch', 'probesRequested']) {
    if (ident(wider).test(d)) p.push(`${FILES.detection} names ${wider}; the hold is isIsolatedLaunch alone (GMUX_SMOKE and GMUX_SHOT), SPEC §5`);
  }

  const held = oneFunction(d, 'versionProbeHeld', FILES.detection, p);
  if (held !== null) {
    const params = squash(d.slice(held.paramsOpen + 1, held.paramsClose));
    if (!params.endsWith('env:NodeJS.ProcessEnv=process.env')) p.push(`versionProbeHeld's last parameter must be \`env: NodeJS.ProcessEnv = process.env\`, so every caller is judged on the running launch`);
    const first = squash(firstStatement(d.slice(held.open + 1, held.close)));
    if (first !== 'if(!isIsolatedLaunch(env))returnfalse;') {
      p.push(`the first statement of versionProbeHeld must be \`if (!isIsolatedLaunch(env)) return false;\` so an ordinary launch reads nothing else; it is \`${first.slice(0, 80)}\``);
    }
  }

  const gate = oneFunction(lg, 'isIsolatedLaunch', FILES.launchGate, p);
  if (gate !== null) {
    const body = lg.slice(gate.open + 1, gate.close);
    const terms = [...body.matchAll(/\bset\(\s*env\s*,\s*'([^']*)'\s*\)/g)].map((m) => m[1]).sort();
    const envReads = (body.match(ident('env')) ?? []).length;
    if (JSON.stringify(terms) !== JSON.stringify(['GMUX_SHOT', 'GMUX_SMOKE']) || envReads !== 2) {
      p.push(`isIsolatedLaunch must read exactly set(env, 'GMUX_SMOKE') and set(env, 'GMUX_SHOT'); it reads ${JSON.stringify(terms)} with ${String(envReads)} use(s) of env. Its two terms are the harness launches this hold covers`);
    }
  }
  return p;
}

function ruleHP2(tree) {
  const p = [];
  const d = code(tree, FILES.detection);
  if (d === null) return [`the tree has no ${FILES.detection}`];
  const exec = oneFunction(d, 'execProbe', FILES.detection, p);
  const probe = oneFunction(d, 'runVersionProbe', FILES.detection, p);
  const one = oneFunction(d, 'detectOne', FILES.detection, p);
  if (exec === null || probe === null || one === null) return p;
  const imports = importClauses(d);
  const inImport = (at) => imports.some((c) => at > c.start && at < c.end);

  // Every reference to the three is a declaration, an import or a counted call.
  for (const name of ['runGuarded', 'execProbe', 'runVersionProbe']) {
    const calls = new Set(callSites(d, name).map((c) => c.at));
    for (const m of d.matchAll(ident(name))) {
      const at = m.index;
      if (calls.has(at) || inImport(at)) continue;
      if (/\bfunction\s*\*?\s*$/.test(d.slice(Math.max(0, at - 20), at))) continue;
      p.push(`${FILES.detection} names ${name} other than to declare, import or call it (line ${String(d.slice(0, at).split('\n').length)}); a spawn handed on by name escapes the hold`);
    }
  }

  // The hold is the module's own function and nothing that shares its name:
  // the one declaration and the two holds in detectOne. A local binding, a
  // parameter or an import of that name would leave both pinned statements
  // below reading exactly right while asking something else.
  const heldRefs = [...d.matchAll(ident('versionProbeHeld'))].map((m) => m.index);
  const heldInOne = heldRefs.filter((at) => inside(one, at)).length;
  if (heldRefs.length !== 3 || functionSpans(d, 'versionProbeHeld').length !== 1 || heldInOne !== 2) {
    p.push(
      `${FILES.detection} must name versionProbeHeld exactly three times, its one declaration and the two holds in detectOne; ` +
        `it names it ${String(heldRefs.length)} time(s), ${String(heldInOne)} in detectOne's body. A binding of that name anywhere else shadows the hold`
    );
  }

  const guarded = callSites(d, 'runGuarded');
  if (guarded.length !== 1 || !inside(exec, guarded[0].at)) {
    p.push(`runGuarded( must be called exactly once in ${FILES.detection}, inside execProbe; it is called ${String(guarded.length)} time(s). execProbe is the one spawn this module makes, and the hold stands in front of it`);
  }
  const execs = callSites(d, 'execProbe');
  const inProbe = execs.filter((c) => inside(probe, c.at)).length;
  const inOne = execs.filter((c) => inside(one, c.at));
  if (execs.length !== 3 || inProbe !== 2 || inOne.length !== 1) {
    p.push(`execProbe( must be called exactly three times, twice in runVersionProbe and once in detectOne; it is called ${String(execs.length)} time(s) (${String(inProbe)} in runVersionProbe, ${String(inOne.length)} in detectOne)`);
  }
  const probes = callSites(d, 'runVersionProbe');
  if (probes.length !== 1 || !inside(one, probes[0].at)) {
    p.push(`runVersionProbe( must be called exactly once, inside detectOne; it is called ${String(probes.length)} time(s)`);
  }

  // The primary probe: held answers today's no-probe answer, else the probe.
  const decl = /\bconst\s+versionP\b/.exec(d.slice(one.open, one.close));
  if (decl === null) {
    p.push('detectOne declares no `const versionP`; the primary probe is the statement the hold guards');
  } else {
    const at = one.open + decl.index;
    const end = statementEnd(d, at);
    const stmt = d.slice(at, end);
    const s = squash(stmt);
    if (s !== PRIMARY_HOLD) {
      p.push(
        'the statement declaring versionP must read `const versionP = probe === null || versionProbeHeld(entry.id, binPath) ? ' +
          'Promise.resolve<VersionProbeResult>({ version: null, identityFailed: false }) : runVersionProbe(binPath, probe, userPath);`, ' +
          `so a held probe answers what a row with no probe answers and never runs; it reads \`${s.slice(0, 160)}\``
      );
    }
    if (probes.length === 1 && !(probes[0].at > at && probes[0].at < end)) {
      p.push('the one runVersionProbe( call must be the one inside the statement declaring versionP');
    }
  }

  // Every shadowed copy: the callback returns on the hold before its execProbe.
  const mapAt = d.slice(one.open, one.close).search(/\bshadowPaths\s*\.\s*map\s*\(/);
  if (mapAt === -1) {
    p.push('detectOne hands no callback to shadowPaths.map(; every shadowed copy is probed there, behind the hold');
  } else {
    const open = d.indexOf('(', one.open + mapAt);
    const close = closeOf(d, open);
    const cb = d.slice(open + 1, close);
    const param = /^\s*(?:async\s+)?\(?\s*([A-Za-z_$][\w$]*)/.exec(cb)?.[1] ?? '';
    const execAt = cb.search(/(?<![\w$])execProbe\s*\(/);
    const guard = shadowHold(param);
    const guardAt = [...cb.matchAll(/\bif\s*\(/g)]
      .map((m) => m.index)
      .find((at) => squash(cb.slice(at, statementEnd(cb, at))) === guard);
    if (execAt === -1 || guardAt === undefined || guardAt > execAt) {
      p.push(`the callback handed to shadowPaths.map( must hold \`${guard}\` (spaces aside) before its execProbe(, so a shadowed copy is held exactly as the primary is`);
    }
    if (inOne.length === 1 && !(inOne[0].at > open && inOne[0].at < close)) {
      p.push("detectOne's one execProbe( call must be the one inside the shadowPaths.map( callback");
    }
  }
  return p;
}

function ruleHP3(tree) {
  const p = [];
  const d = code(tree, FILES.detection);
  if (d === null) return [`the tree has no ${FILES.detection}`];
  const naming = oneFunction(d, NAMING, FILES.detection, p);
  const reset = oneFunction(d, 'resetDetectionCache', FILES.detection, p);
  if (naming === null || reset === null) return p;
  const body = d.slice(naming.open + 1, naming.close);
  const declared = [...body.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*=(?![=>])/g)]
    .map((m) => m[1])
    .filter((name) => new RegExp(`^let\\s+${escapeRe(name)}\\b`, 'm').test(d));
  const names = [...new Set(declared)];
  if (names.length !== 1) {
    return [`${NAMING} must assign exactly one module-level \`let\` binding, the naming; it assigns ${JSON.stringify(names)}`];
  }
  const binding = names[0];
  const declAt = new RegExp(`^let\\s+${escapeRe(binding)}\\b`, 'm').exec(d).index;
  const declEnd = statementEnd(d, declAt);
  const stmt = d.slice(declAt, declEnd);
  const eq = initialiserAt(stmt);
  const init = eq === -1 ? '' : stmt.slice(eq + 1);
  if (!squash(init).includes('agents:[]') || stringLiterals(init).length > 0) {
    p.push(`the naming \`${binding}\` must be initialised with \`agents: []\` and no string, so a harness mode that names nothing probes nothing; it is initialised with \`${squash(init).slice(0, 80)}\``);
  }
  for (const m of d.matchAll(new RegExp(`(?<![\\w$.])${escapeRe(binding)}\\s*=(?![=>])`, 'g'))) {
    if (m.index >= declAt && m.index < declEnd) continue;
    if (!inside(naming, m.index)) p.push(`\`${binding}\` is assigned outside ${NAMING} (line ${String(d.slice(0, m.index).split('\n').length)}); that function is the one place a naming is made`);
  }
  // Outside its declaration and the one assignment, the naming is only READ:
  // `.agents.includes(` and `.withinReal`, never handed on, cast or mutated.
  for (const m of d.matchAll(ident(binding))) {
    if ((m.index >= declAt && m.index < declEnd) || inside(naming, m.index)) continue;
    const after = d.slice(m.index + binding.length);
    if (/^\s*\.\s*agents\s*\.\s*includes\s*\(/.test(after) || /^\s*\.\s*withinReal(?![\w$])(?!\s*=[^=])/.test(after)) continue;
    p.push(`\`${binding}\` is used other than by reading \`.agents.includes(\` or \`.withinReal\` (line ${String(d.slice(0, m.index).split('\n').length)}); ${NAMING} replaces it whole, and nothing else changes or hands it on`);
  }
  if (ident(binding).test(d.slice(reset.open + 1, reset.close))) {
    p.push(`resetDetectionCache names \`${binding}\`; a reset must neither widen nor clear a naming (narrowing back is ${NAMING}({ agents: [] }))`);
  }
  return p;
}

function ruleHP4(tree, hidden) {
  const p = [];
  const files = [...tree.keys()];
  if (files.length < FLOORS.main) p.push(`the walk found ${String(files.length)} non-test .ts files under src/main, below the floor of ${String(FLOORS.main)}; the reader is broken, not the tree`);
  const calls = [];
  let declarations = 0;
  for (const rel of files) {
    if (!tree.get(rel).includes(NAMING)) continue;
    const c = code(tree, rel);
    const imports = importClauses(c);
    const callAt = new Set(callSites(c, NAMING).map((x) => x.at));
    for (const m of c.matchAll(ident(NAMING))) {
      const at = m.index;
      if (/\bfunction\s*\*?\s*$/.test(c.slice(Math.max(0, at - 20), at))) {
        declarations += 1;
        if (rel !== FILES.detection) p.push(`${rel} declares its own ${NAMING}; the one declaration is in ${FILES.detection}`);
        continue;
      }
      if (imports.some((x) => at > x.start && at < x.end)) {
        if (/^\s+as\b/.test(c.slice(at + NAMING.length))) p.push(`${rel} renames ${NAMING} in an import or export; a renamed caller is invisible to this gate, so import it by its own name`);
        continue;
      }
      if (callAt.has(at)) {
        const open = c.indexOf('(', at);
        calls.push({ rel, arg: callArguments(c, open)[0] ?? '' });
        continue;
      }
      p.push(`${rel} names ${NAMING} other than to call or import it (line ${String(c.slice(0, at).split('\n').length)}); call it directly, and ${THIRD_CALLER}`);
    }
  }
  if (declarations !== 1) p.push(`${NAMING} is declared ${String(declarations)} times under src/main, not once`);
  const perFile = (rel) => calls.filter((c) => c.rel === rel).length;
  for (const call of calls) {
    const s = squash(call.arg);
    const named = stringLiterals(call.arg).filter((lit) => hidden.includes(lit));
    if (!/within:/.test(s) && named.length > 0) {
      p.push(`${call.rel} names the hidden agent(s) ${JSON.stringify(named)} with no within:; a hidden agent may be probed only for a copy the run planted inside its own profile`);
    }
    if (call.rel === FILES.shadow) {
      const agents = /agents:(\[[^\]]*\])/.exec(s)?.[1] ?? null;
      if (!s.startsWith('{') || !s.endsWith('}') || agents !== "['droid']" || !/within:/.test(s)) {
        p.push(`${FILES.shadow} must name exactly { agents: ['droid'], within: … }, its own two planted copies; it names ${s}`);
      }
    } else if (call.rel === FILES.resume) {
      if (s !== '{agents:cfg.agents}') p.push(`${FILES.resume} must name exactly { agents: cfg.agents }, the agents the run was asked for; it names ${s}`);
    } else {
      p.push(`${call.rel} calls ${NAMING}: ${THIRD_CALLER}`);
    }
  }
  if (perFile(FILES.shadow) !== 1 || perFile(FILES.resume) !== 1 || calls.length !== 2) {
    p.push(`${NAMING}( must be called exactly twice, once in ${FILES.shadow} and once in ${FILES.resume}; it is called ${String(calls.length)} time(s). If a third mode needs a version, ${THIRD_CALLER}`);
  }
  return p;
}

/**
 * HP5's question of one entry point: the naming after `afterAt`, before
 * `bootAt`, a statement of its own in the boot's block. `{ problems, at }`,
 * with `at` the naming call's offset, or null when there is not exactly one.
 */
function orderOf(c, fn, afterAt, bootAt, file, after, boot) {
  const calls = callSites(c, NAMING).filter((x) => inside(fn, x.at));
  if (calls.length !== 1) {
    return { problems: [`${file}'s entry point must call ${NAMING}( exactly once; it calls it ${String(calls.length)} time(s)`], at: null };
  }
  const at = calls[0].at;
  const problems = [];
  if (!(at > afterAt && at < bootAt)) {
    problems.push(`${file} must name its agents after ${after} and before ${boot}, because the boot's warm is the first scan and its memo is what the run reads`);
  }
  if (!startsStatement(c, at) || braceDepth(c, fn.open, at) !== braceDepth(c, fn.open, bootAt)) {
    problems.push(`${file}'s ${NAMING}( must be a statement of its own in the same block as ${boot}, never behind a condition`);
  }
  return { problems, at };
}

function ruleHP5(tree) {
  const p = [];
  const rs = code(tree, FILES.resume);
  const sh = code(tree, FILES.shadow);
  if (rs === null || sh === null) return [`the tree has no ${rs === null ? FILES.resume : FILES.shadow}`];

  const run = oneFunction(rs, 'runResumeConformance', FILES.resume, p);
  if (run !== null) {
    const body = (needle) => findLoose(rs, needle).filter((at) => inside(run, at));
    const sets = body('setAgentTableSource(() => conformanceDetectionTable(cfg.agents));');
    const boots = body('const core = await getGmuxCore();');
    if (sets.length !== 1 || boots.length !== 1) {
      p.push(`runResumeConformance must hold \`setAgentTableSource(() => conformanceDetectionTable(cfg.agents));\` and \`const core = await getGmuxCore();\` once each; it holds ${String(sets.length)} and ${String(boots.length)}`);
    } else {
      p.push(...orderOf(rs, run, sets[0], boots[0], FILES.resume, 'the restricted table is set', '`const core = await getGmuxCore();`').problems);
    }
  }

  const smoke = oneFunction(sh, 'runSmokeShadow', FILES.shadow, p);
  if (smoke !== null) {
    const shims = callSites(sh, 'writeShim').filter((x) => inside(smoke, x.at));
    const boots = callSites(sh, 'getGmuxCore').filter((x) => inside(smoke, x.at));
    if (shims.length < 2 || boots.length < 1) {
      p.push(`runSmokeShadow must plant its two copies with writeShim( and boot with getGmuxCore(; it calls them ${String(shims.length)} and ${String(boots.length)} time(s)`);
    } else {
      const r = orderOf(sh, smoke, shims[shims.length - 1].at, boots[0].at, FILES.shadow, 'both writeShim( calls', 'getGmuxCore(');
      p.push(...r.problems);
      if (r.at !== null) {
        const arg = squash(callArguments(sh, sh.indexOf('(', r.at))[0] ?? '');
        const within = /within:([^,}]*)/.exec(arg)?.[1] ?? null;
        if (within !== null) {
          const userData = findLoose(sh, "const userData = app.getPath('userData');").filter((at) => inside(smoke, at) && at < r.at);
          const assigned = [...sh.slice(smoke.open, smoke.close).matchAll(/(?<![\w$.])userData\s*=(?![=>])/g)].length;
          if (within !== 'userData' || userData.length !== 1 || assigned !== 1) {
            p.push(`${FILES.shadow}'s within: must be \`userData\`, the one binding assigned from app.getPath('userData') before the naming, so only the copies in its own profile are probed; it is \`${within}\``);
          }
        }
      }
    }
  }
  return p;
}

function ruleHP6(tree) {
  const p = [];
  const under = (dir) => [...tree.keys()].filter((rel) => rel.startsWith(`${dir}/`));
  const harness = under('src/main/harness');
  const conformance = under('src/main/conformance');
  if (harness.length < FLOORS.harness) p.push(`the walk found ${String(harness.length)} files under src/main/harness, below the floor of ${String(FLOORS.harness)}`);
  if (conformance.length < FLOORS.conformance) p.push(`the walk found ${String(conformance.length)} files under src/main/conformance, below the floor of ${String(FLOORS.conformance)}`);
  const fix = 'a harness reads a version only through detection, behind the hold, and names its agent in this gate';
  for (const rel of [...harness, ...conformance]) {
    const c = code(tree, rel);
    if (/\.\s*versionProbe(?![\w$])|\[\s*(['"`])versionProbe\1\s*\]|\{[^{}]*(?<![\w$])versionProbe(?![\w$])[^{}]*\}\s*=(?![=>])/.test(c)) {
      p.push(`${rel} reads an agent's versionProbe; ${fix}`);
    }
    for (const name of ['runVersionProbe', 'execProbe']) {
      if (ident(name).test(c)) p.push(`${rel} names ${name}; ${fix}`);
    }
    const assigned = assignedValues(c);
    for (const spawn of SPAWNS) {
      for (const call of callSites(c, spawn)) {
        const literals = [];
        for (const arg of callArguments(c, call.open)) {
          literals.push(...stringLiterals(arg));
          if (/^[A-Za-z_$][\w$]*$/.test(arg)) for (const value of assigned.get(arg) ?? []) literals.push(...stringLiterals(value));
        }
        const flag = literals.find((lit) => VERSION_FLAGS.includes(lit));
        if (flag !== undefined) p.push(`${rel} hands '${flag}' to ${spawn}( (line ${String(c.slice(0, call.at).split('\n').length)}); ${fix}`);
      }
    }
  }
  return p;
}

export function judge(tree, hidden) {
  const table = { HP1: ruleHP1, HP2: ruleHP2, HP3: ruleHP3, HP4: ruleHP4, HP5: ruleHP5, HP6: ruleHP6 };
  const out = {};
  for (const clause of CLAUSES) {
    try {
      out[clause] = table[clause](tree, hidden);
    } catch (err) {
      out[clause] = [`the clause threw: ${err instanceof Error ? err.message : String(err)}`];
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The ablations (SPEC §8), one clause each
// ---------------------------------------------------------------------------

const D = FILES.detection;
const RESUME_NAMING = '    nameHarnessVersionProbes({ agents: cfg.agents });\n';
const SHADOW_NAMING = "    nameHarnessVersionProbes({ agents: ['droid'], within: userData });\n";
const BOOT = '    const core = await getGmuxCore();\n';

export const ABLATIONS = Object.freeze([
  { id: 'A1', owner: 'HP1', name: "versionProbeHeld's first statement deleted",
    edits: [{ file: D, find: '  if (!isIsolatedLaunch(env)) return false;\n', to: '' }] },
  { id: 'A2', owner: 'HP1', name: 'isIsolatedLaunch replaced by isHarnessLaunch, import and call',
    edits: [{ file: D, find: 'isIsolatedLaunch', to: 'isHarnessLaunch', all: true }] },
  { id: 'A3', owner: 'HP1', name: "set(env, 'GMUX_SHOT') removed from isIsolatedLaunch",
    edits: [{ file: FILES.launchGate, find: "  return set(env, 'GMUX_SMOKE') || set(env, 'GMUX_SHOT');", to: "  return set(env, 'GMUX_SMOKE');" }] },
  { id: 'A4', owner: 'HP2', name: "the primary's hold removed",
    edits: [{ file: D, find: 'probe === null || versionProbeHeld(entry.id, binPath)', to: 'probe === null' }] },
  { id: 'A5', owner: 'HP2', name: "the shadow callback's hold removed",
    edits: [{ file: D, find: 'if (probe === null || versionProbeHeld(entry.id, path)) return', to: 'if (probe === null) return' }] },
  { id: 'A6', owner: 'HP2', name: 'a second runGuarded( added to detection.ts',
    edits: [{ file: D, find: '  const healthP = checkAgentBinary(binPath);\n', to: "  void runGuarded(binPath, ['--help'], { timeoutMs: 1000 });\n  const healthP = checkAgentBinary(binPath);\n" }] },
  { id: 'A7', owner: 'HP3', name: "the default naming given agents: ['gemini']",
    edits: [{ file: D, find: '  agents: [],\n  withinReal: null\n};', to: "  agents: ['gemini'],\n  withinReal: null\n};" }] },
  { id: 'A8', owner: 'HP3', name: 'resetDetectionCache assigns the naming',
    edits: [{ file: D, find: '  scanStarts = 0;\n}', to: '  scanStarts = 0;\n  harnessNaming = { agents: [], withinReal: null };\n}' }] },
  { id: 'A9', owner: 'HP4', name: "a third caller planted in src/main/harness/p999.ts naming ['claude']",
    add: { file: 'src/main/harness/p999.ts', text: "import { nameHarnessVersionProbes } from '../agents';\n\nexport function runP999(): void {\n  nameHarnessVersionProbes({ agents: ['claude'] });\n}\n" } },
  { id: 'A10', owner: 'HP4', name: "shadow's call loses within",
    edits: [{ file: FILES.shadow, find: SHADOW_NAMING, to: "    nameHarnessVersionProbes({ agents: ['droid'] });\n" }] },
  { id: 'A11', owner: 'HP4', name: "shadow names ['droid', 'grok']",
    edits: [{ file: FILES.shadow, find: SHADOW_NAMING, to: "    nameHarnessVersionProbes({ agents: ['droid', 'grok'], within: userData });\n" }] },
  { id: 'A12', owner: 'HP5', name: "resume's naming moved below getGmuxCore()",
    edits: [{ file: FILES.resume, find: RESUME_NAMING, to: '' }, { file: FILES.resume, find: BOOT, to: BOOT + RESUME_NAMING }] },
  { id: 'A13', owner: 'HP5', name: "shadow's naming moved below getGmuxCore(",
    edits: [{ file: FILES.shadow, find: SHADOW_NAMING, to: '' }, { file: FILES.shadow, find: BOOT, to: BOOT + SHADOW_NAMING }] },
  { id: 'A14', owner: 'HP6', name: "a planted harness file calling runGuarded(bin, ['--version'])",
    add: { file: 'src/main/harness/p998.ts', text: "import { runGuarded } from '../proc/guarded';\n\nexport async function p998(bin: string): Promise<void> {\n  await runGuarded(bin, ['--version'], { timeoutMs: 1000 });\n}\n" } },
  { id: 'A15', owner: 'HP6', name: 'a planted harness file reading entry.versionProbe',
    add: { file: 'src/main/harness/p997.ts', text: "import { AGENT_REGISTRY } from '../agents';\n\nexport const p997 = AGENT_REGISTRY.map((entry) => entry.versionProbe);\n" } },
  // The integrator's arm: both pinned holds still read exactly right, and ask
  // a local that always answers no.
  { id: 'A16', owner: 'HP2', name: 'a local binding named versionProbeHeld shadows the hold inside detectOne',
    edits: [{ file: D, find: '  const probe = entry.versionProbe;\n', to: '  const versionProbeHeld = (): boolean => false;\n  const probe = entry.versionProbe;\n' }] }
]);

/** The tree with one arm applied, or a string saying why the arm could not be made. */
function ablated(tree, arm) {
  const copy = new Map(tree);
  for (const edit of arm.edits ?? []) {
    const text = copy.get(edit.file);
    if (text === undefined) return `${edit.file} is not in the tree`;
    const count = text.split(edit.find).length - 1;
    if (count === 0 || (!edit.all && count !== 1)) {
      return `its text is found ${String(count)} time(s) in ${edit.file}, not once; update the arm beside the source it breaks`;
    }
    copy.set(edit.file, edit.all ? text.split(edit.find).join(edit.to) : text.replace(edit.find, () => edit.to));
  }
  if (arm.add !== undefined) {
    if (copy.has(arm.add.file)) return `${arm.add.file} already exists in the tree`;
    copy.set(arm.add.file, arm.add.text);
  }
  return copy;
}

/** Each arm's verdict: `{ id, owner, name, red: [clauses], ok, said }`. */
export function runAblations(tree, hidden) {
  return ABLATIONS.map((arm) => {
    const copy = ablated(tree, arm);
    if (typeof copy === 'string') return { ...arm, red: [], ok: false, said: `the arm could not be made: ${copy}` };
    const verdict = judge(copy, hidden);
    const red = CLAUSES.filter((c) => verdict[c].length > 0);
    const ok = red.length === 1 && red[0] === arm.owner;
    return {
      ...arm,
      red,
      ok,
      said: ok
        ? `red on ${arm.owner}`
        : red.length === 0
          ? `stayed GREEN; ${arm.owner} cannot see the break it owns`
          : `red on ${red.join(', ')}, not on ${arm.owner} alone`
    };
  });
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const started = Date.now();
  const { HIDDEN_AGENT_IDS } = await import(pathToFileURL(join(ROOT, 'build', 'hidden-agents.mjs')).href);
  const tree = readTree(ROOT);
  const results = judge(tree, HIDDEN_AGENT_IDS);
  const arms = runAblations(tree, HIDDEN_AGENT_IDS);
  const greenTree = CLAUSES.every((c) => results[c].length === 0);
  const armsOk = arms.every((a) => a.ok);
  const ms = Date.now() - started;
  if (AS_JSON) {
    process.stdout.write(`${JSON.stringify({ clauses: results, ablations: arms.map(({ id, owner, red, ok, said }) => ({ id, owner, red, ok, said })) })}\n`);
    process.exit(greenTree && armsOk ? 0 : 1);
  }
  for (const clause of CLAUSES) {
    const problems = results[clause];
    process.stdout.write(`${TAG} ${clause.padEnd(4)} ${problems.length === 0 ? 'ok' : 'RED'}\n`);
    for (const problem of problems) process.stdout.write(`${TAG}        - ${problem}\n`);
  }
  for (const arm of arms) {
    process.stdout.write(`${TAG} ${arm.id.padEnd(4)} ${arm.ok ? 'ok ' : 'BAD'} ${arm.said} (${arm.name})\n`);
  }
  if (!greenTree || !armsOk) {
    const redClauses = CLAUSES.filter((c) => results[c].length > 0);
    const badArms = arms.filter((a) => !a.ok).map((a) => a.id);
    process.stdout.write(
      `${TAG} FAIL in ${String(ms)} ms over ${ROOT}: ` +
        `${redClauses.length > 0 ? `clause(s) ${redClauses.join(', ')} red on the tree` : 'the tree is green'}` +
        `${badArms.length > 0 ? `; ablation(s) ${badArms.join(', ')} did not redden their own clause alone` : ''}.\n`
    );
    process.exit(1);
  }
  process.stdout.write(
    `${TAG} PASS: ${String(CLAUSES.length)} clauses green and ${String(arms.length)} ablations red on their owners in ${String(ms)} ms ` +
      `over ${String(tree.size)} files. A harness launch version-probes no agent its mode did not name; exactly two modes name agents, ` +
      'the shadow smoke its own droid copies and the resume conformance the agents it was asked for, before the core boots. Spawned nothing.\n'
  );
  process.exit(0);
}
