#!/usr/bin/env node
/**
 * assert-docker-teardown.mjs, `npm run gate:docker`. Every throwaway Linux
 * machine a script under build/ makes in the operator's Docker is made, used
 * and removed by build/docker-run.mjs, and nowhere else (Phase 342,
 * build/p342/SPEC.md D27, §6.2).
 *
 * ## Why this file exists
 *
 * His ruling of 2026-10-05 is the whole licence for a container: "you can do
 * the docker tests but make sure to clean them up". His Docker holds his own
 * work, so a leaked container, a prune, an image removed under one of his
 * tags, or a re-tag of one of his images by a pull for another platform is
 * damage to his machine. A container is also not a child process: `docker
 * run -d` returns at once and the daemon runs it, so nothing that ends a child
 * ends it, and `gate:background` cannot see it. That is the Simulator's shape,
 * and it gets the Simulator's answer: build/docker-run.mjs owns a container's
 * whole life, and this gate keeps it there, built the way
 * build/assert-simulator-teardown.mjs keeps a device in
 * build/simulator-run.mjs.
 *
 * ## What it asserts
 *
 *   1. FORWARD. No file under build/ but the helper names the program on a
 *      spawn. FAIL CLOSED: in a JavaScript or TypeScript file, a string that
 *      IS the program (the bare name, or a path ending in it) is a finding
 *      wherever it stands, because the shape that walks past a call-reading
 *      rule is the program held in a variable; a whole command line in one
 *      string (the program first, or after `&&`, `||`, `;`, `|`, `$(`, `then`,
 *      `do`, `xargs` or `sudo`) is a finding too. In a shell script under
 *      build/, the program as a command word outside a comment is a finding.
 *      A sentence that mentions the word, a Dockerfile's name and a credential
 *      file's name are prose, and taking prose for a launch is the false alarm
 *      that makes every pass worthless.
 *   2. REVERSE. The files that reach the helper (import it AND call
 *      `withContainers`) do not fall below {@link DOCKER_USER_FLOOR}.
 *   3. THE HELPER'S FINALLY. `withContainers` calls `teardown(` inside a
 *      `finally`, read by matching braces.
 *   4. THE HELPER'S NET. `installNet` registers `exit`, SIGINT, SIGTERM and
 *      SIGHUP, each reaching the blocking teardown, and `withContainers`
 *      installs it BEFORE its first pull and its first run.
 *   5. THE NAMES. `NAME_PREFIX` is `tortie-p342-`, the prefix rule admits only
 *      `tortie-<phase>-` (driven over hostile prefixes), every container name
 *      is composed from the prefix, and the removal refuses a name without it.
 *   6. THE VERBS. Every argv the helper hands the program begins with a verb of
 *      a closed list (`run`, `exec`, `rm`, `restart`, `port`, `pull`, `images`,
 *      `ps`, `version`, `image rm|inspect`, `container inspect`, `volume ls`,
 *      `network ls`, `context inspect`), and no such argv carries a prune,
 *      `system`, `login`, `build`, `builder`, `commit`, `push`, a mount, a
 *      volume, a network, `--privileged`, `--filter`, the Docker socket or a
 *      `$(`. No string the helper holds is a command line naming the program
 *      with a `$(` in it.
 *   7. THE RUN. `runArgv`, LIFTED OUT OF THE SOURCE AND DRIVEN, composes
 *      `--rm`, `--pull never`, ONE fixed `-p 127.0.0.1:<port>:22`, the name it
 *      was handed, and a main process of `sleep` for at most two hours, and
 *      nothing that mounts, shares a network or runs privileged; it carries
 *      `--platform` only when it was handed one.
 *   8. THE IMAGES. An image is removed only by `['image', 'rm', ref]`, never
 *      with `-f`, after a refusal of a reference the before list holds and a
 *      refusal of an id that is not the one recorded at the pull; a pull is
 *      skipped for a reference the before list holds; `--platform` is handed
 *      to a run only for a reference the before list lacks.
 *   9. THE LEDGER. Every container name and every pull is written to the
 *      ledger BEFORE the command that makes it, and `--sweep <ledger>` exists
 *      and reaches `sweepLedger`.
 *  10. THE LOCK. The lock is taken with `wx` (exclusive), by `withContainers`,
 *      before its first pull and its first run.
 *  11. THE DISK. `DOCKER_MIN_FREE_KB` is at least ten gigabytes (his ruling),
 *      and `withContainers` asks `dockerPreflight` before it pulls or makes
 *      anything.
 *  12. THE PROOF. The blocking teardown compares the after lists with the
 *      before lists and the run is clean only when they agree.
 *  13. THE FIXTURES. Every scanner above is run over build/docker-fixtures.mjs
 *      first: bad shapes caught, controls left alone, the floor driven one
 *      below itself and at itself, and every one-clause ablation of the REAL
 *      helper red, each of which must still find its anchor.
 *
 * ## What it does not assert
 *
 * It does not read package.json, and it does not follow a command line handed
 * to a far machine or a tmux pane. It does not see a container a program
 * outside build/ makes, which is every container he makes himself; those are
 * his.
 *
 * It spawns nothing, starts no container and needs no Docker. It runs inside
 * `npm run build`, so nothing that builds can skip it.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { walkScripts } from './build-scripts.mjs';
import { blockAt, callArguments, closeOf, functionBodyOf, lineAt, stripComments } from './scan-source.mjs';
import { FILE_FIXTURES, HELPER_ABLATIONS } from './docker-fixtures.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(repoRoot, 'build');
const HELPER = 'docker-run.mjs';
const SELF = 'assert-docker-teardown.mjs';
const FIXTURES_FILE = 'docker-fixtures.mjs';

/**
 * The fewest files that may reach the helper.
 *
 * PHASE 342 SET IT AT 2: build/p342/measure-p342.mjs (`measure:p342`, the
 * re-derivation outside Electron) and build/p342/probe-p342.mjs (`probe:p342`,
 * the Linux matrix in the app). RAISE IT WHEN YOU ADD ONE, in the same commit:
 * adding a script cannot turn this gate red, so a floor left where it was
 * would let the new one be deleted again in silence.
 */
export const DOCKER_USER_FLOOR = 2;

/** The program, spelled from parts so this file carries no literal of it. */
const TOOL = ['dock', 'er'].join('');

/** The verbs the helper may hand the program, with the sub-verbs a group allows. */
const VERBS = Object.freeze({
  run: null,
  exec: null,
  rm: null,
  restart: null,
  port: null,
  pull: null,
  images: null,
  ps: null,
  version: null,
  image: ['rm', 'inspect'],
  container: ['inspect'],
  volume: ['ls'],
  network: ['ls'],
  context: ['inspect']
});

/** Words no argv the helper hands the program may carry. */
const FORBIDDEN_WORDS = [
  'prune',
  'system',
  'login',
  'logout',
  'build',
  'builder',
  'buildx',
  'commit',
  'push',
  'save',
  'load',
  'import',
  'export',
  'tag',
  '-v',
  '--volume',
  '--mount',
  '--volumes-from',
  '--network',
  '--net',
  '--privileged',
  '--filter',
  '--all',
  '-a',
  '-aq',
  '-qa',
  '--cap-add',
  '--device',
  '--pid',
  '--ipc',
  '--userns'
];

/** Separators after which a word is a command. */
const COMMAND_SEPARATOR = String.raw`(?:&&|\|\||;|\||\$\(|\bthen\b|\bdo\b|\bxargs\b|\bsudo\b)`;

// ---------------------------------------------------------------------------
// Reading source
// ---------------------------------------------------------------------------

/**
 * Every string literal in comment-stripped code, as `{ text, at }`, its
 * escapes left as written. stripComments has already blanked comments and
 * regular expression bodies and left strings alone, so one pattern reads them.
 */
export function stringsOf(code) {
  const out = [];
  const re = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\[\s\S])*`/g;
  let m;
  while ((m = re.exec(code)) !== null) out.push({ text: m[0].slice(1, -1), at: m.index });
  return out;
}

/** Whether one string IS the program: its bare name, or a path that ends in it. */
function isTheTool(text) {
  return new RegExp(`^(?:\\S*/)?${TOOL}$`).test(text.trim());
}

/** Whether one string is a whole command line that runs the program. */
function isCommandLine(text) {
  const word = `(?:\\S*/)?${TOOL}\\s+[a-z]`;
  return new RegExp(`^\\s*${word}`).test(text) || new RegExp(`${COMMAND_SEPARATOR}\\s*${word}`).test(text);
}

/** A shell script's text with its comments blanked: `#` at a line's start or after a space. */
function stripShellComments(text) {
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*#/.test(line)) return '';
      const at = line.search(/\s#/);
      return at === -1 ? line : line.slice(0, at);
    })
    .join('\n');
}

/**
 * Every place in one file that names the program on a spawn, outside the
 * helper. The real scan and the fixtures both read this, so the fixtures prove
 * the code the gate runs.
 */
export function dockerStarts(name, source, isShell = /\.sh$/.test(name)) {
  if (!new RegExp(TOOL, 'i').test(source)) return [];
  const hits = [];
  if (isShell) {
    const code = stripShellComments(source);
    const re = new RegExp(`(?:^|[\\s;&|(\`]|\\bthen\\b|\\bdo\\b)(?:\\S*/)?${TOOL}(?=\\s|$)`, 'gm');
    let m;
    while ((m = re.exec(code)) !== null) {
      hits.push({ file: name, line: lineAt(code, m.index), what: `the program run as a command word in a shell script` });
    }
    return hits;
  }
  const code = stripComments(source);
  for (const s of stringsOf(code)) {
    if (isTheTool(s.text)) hits.push({ file: name, line: lineAt(code, s.at), what: `the program named as a string ('${s.text.trim()}'), which only build/${HELPER} may hand a spawn` });
    else if (isCommandLine(s.text)) hits.push({ file: name, line: lineAt(code, s.at), what: 'a whole command line that runs the program' });
  }
  return hits;
}

/** Whether this file reaches the helper: imports it at any depth and calls it. */
export function usesHelper(source) {
  if (!source.includes(HELPER)) return { imported: false, called: false };
  const code = stripComments(source);
  const imported = /from\s+['"](?:\.\.?\/)+docker-run\.mjs['"]/.test(code);
  const called = /\bwithContainers\s*\(/.test(code);
  return { imported, called };
}

/** Every file that reaches the helper. `read` is injected for the fixtures. */
export function helperUsers(names, read) {
  return names.filter((name) => {
    if (name === SELF || name === HELPER || name === FIXTURES_FILE) return false;
    const use = usesHelper(read(name));
    return use.imported && use.called;
  });
}

/** Rule 2, as a function, so the fixtures can watch it refuse. */
export function floorFinding(count, floor) {
  if (count >= floor) return null;
  return (
    `only ${String(count)} file(s) under build/ reach build/${HELPER}, and the floor is ${String(floor)}. ` +
    'A script that made a container left the tree or left the helper, and the second one is a ' +
    'container in his Docker with nothing to remove it. If the deletion was deliberate, lower ' +
    'DOCKER_USER_FLOOR in the same commit and name the file.'
  );
}

/** The array literal that opens at `open`, as the string literals it holds, or null. */
function arrayWords(code, open) {
  if (code[open] !== '[') return null;
  const inner = blockAtBracket(code, open);
  if (inner === null) return null;
  return { words: stringsOf(inner).map((s) => s.text), text: inner };
}

/** The text between the bracket that opens at `open` and its match. */
function blockAtBracket(code, open) {
  let depth = 0;
  let quote = '';
  for (let i = open; i < code.length; i += 1) {
    const c = code[i];
    if (quote !== '') {
      if (c === '\\') {
        i += 1;
        continue;
      }
      if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      continue;
    }
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) return code.slice(open + 1, i);
    }
  }
  return null;
}

/** The first position in `body` of a regular expression, or Infinity. */
function at(body, re) {
  const i = body.search(re);
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}

/** Evaluate a product of integer literals (`10 * 1024 * 1024`), or null. */
function product(text) {
  if (!/^[\d_\s*]+$/.test(text)) return null;
  return text
    .split('*')
    .map((p) => Number(p.replace(/_/g, '').trim()))
    .reduce((a, b) => (Number.isSafeInteger(a) && Number.isSafeInteger(b) ? a * b : NaN), 1);
}

/**
 * Lift `runArgv` and the constants it reads out of the helper's own text and
 * return it as a function, so rule 7 drives the code the helper runs.
 */
function liftRunArgv(code) {
  const body = functionBodyOf(code, 'runArgv');
  if (body === null) return { fn: null, why: 'the helper declares no runArgv' };
  const seconds = /\bconst\s+MAIN_PROCESS_SECONDS\s*=\s*([^;]+);/.exec(code);
  if (seconds === null) return { fn: null, why: 'the helper declares no MAIN_PROCESS_SECONDS' };
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`const MAIN_PROCESS_SECONDS = (${seconds[1]});\nreturn function runArgv(spec) ${body};`)();
    return { fn, why: null };
  } catch (err) {
    return { fn: null, why: `runArgv could not be lifted out: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Lift one function out of the helper's RAW text (its regular expression
 * literals intact; `code` is the comment-blanked copy, the same length, read
 * for the braces) and return it with `deps` (resolve, sep) and `preamble` in
 * scope, so a rule DRIVES the code the helper runs and every helper ablation
 * of that function is read by the drive.
 */
function liftFunction(source, code, name, preamble) {
  const m = new RegExp(`\\bfunction\\s+${name}\\s*\\(`).exec(code);
  if (m === null) return { fn: null, why: `the helper declares no ${name}` };
  const paramsOpen = m.index + m[0].length - 1;
  const paramsClose = closeOf(code, paramsOpen);
  if (paramsClose === -1) return { fn: null, why: `${name}'s parameters could not be read` };
  const open = code.indexOf('{', paramsClose);
  const close = open === -1 ? -1 : closeOf(code, open);
  if (close === -1) return { fn: null, why: `${name}'s body could not be read` };
  const params = source.slice(paramsOpen + 1, paramsClose);
  const fnBody = source.slice(open, close + 1);
  try {
    // eslint-disable-next-line no-new-func
    const make = new Function('deps', `${preamble}\nreturn function ${name}(${params}) ${fnBody};`);
    return { fn: make({ resolve, sep }), why: null };
  } catch (err) {
    return { fn: null, why: `${name} could not be lifted out: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Rule 7's own reading of one composed run argv: every way it breaks the run's rules. */
export function runProblems(argv, spec) {
  const out = [];
  if (!Array.isArray(argv) || argv[0] !== 'run') return ['runArgv does not compose a run.'];
  if (!argv.includes('--rm')) out.push('runArgv composes a run without --rm, so a container whose harness died is left behind.');
  const pull = argv.indexOf('--pull');
  if (pull === -1 || argv[pull + 1] !== 'never') out.push('runArgv composes a run without --pull never, so a pull could happen with nothing ledgering it.');
  const ports = argv.map((a, i) => (a === '-p' || a === '--publish' ? argv[i + 1] : null)).filter((a) => a !== null);
  if (ports.length !== 1 || !new RegExp(`^127\\.0\\.0\\.1:${String(spec.port)}:22$`).test(String(ports[0]))) {
    out.push(`runArgv publishes ${JSON.stringify(ports)}; exactly one fixed 127.0.0.1:${String(spec.port)}:22, never an ephemeral ::22 and never every address.`);
  }
  if (argv.some((a) => typeof a === 'string' && /^-p127|^--publish=|^-P$|^--publish-all$/.test(a))) out.push('runArgv publishes a port in a second spelling.');
  for (const word of argv) {
    if (FORBIDDEN_WORDS.includes(word) || /^--(?:volume|mount|network|net|privileged)=/.test(String(word))) out.push(`runArgv carries ${String(word)}, which mounts, shares a network, or runs privileged.`);
    if (String(word).includes(`${TOOL}.sock`)) out.push('runArgv names the Docker socket.');
  }
  const name = argv[argv.indexOf('--name') + 1];
  if (name !== spec.name) out.push(`runArgv names the container ${JSON.stringify(name)}, not the name it was handed.`);
  const tail = argv.slice(-2);
  const seconds = Number(tail[1]);
  if (tail[0] !== 'sleep' || !Number.isSafeInteger(seconds) || seconds <= 0 || seconds > 7200) {
    out.push(`runArgv's main process is ${JSON.stringify(tail)}; it is sleep for at most 7200 seconds, so a container whose harness was killed ends itself.`);
  }
  if (argv.indexOf(spec.ref) !== argv.length - 3) out.push('runArgv does not run the image it was handed, right before its main process.');
  const platform = argv.indexOf('--platform');
  if ((spec.platform ?? null) === null && platform !== -1) out.push('runArgv passes --platform when it was handed none, which re-tags an image of his.');
  if ((spec.platform ?? null) !== null && argv[platform + 1] !== spec.platform) out.push('runArgv drops the platform it was handed.');
  return out;
}

/**
 * Rules 3 to 12 over the helper's source. Returns findings, empty when it
 * holds. `source` is the raw text: rule 5's pattern is a regular expression
 * literal, which stripComments blanks.
 */
export function helperShape(source) {
  const out = [];
  const code = stripComments(source);

  // Rule 3, the finally.
  const body = functionBodyOf(code, 'withContainers');
  if (body === null) return ['withContainers is not declared in the helper.'];
  const fin = body.lastIndexOf('finally');
  const finBody = fin === -1 ? null : blockAt(body, body.indexOf('{', fin));
  if (finBody === null) out.push('withContainers has no finally block.');
  else if (!/\bawait\s+teardown\s*\(\s*entry\s*\)/.test(finBody)) out.push('the finally block of withContainers does not await teardown(entry).');
  // The last try BLOCK before the finally (an identifier such as `entry` holds the letters).
  const tryAt = (() => {
    let last = -1;
    for (const m of body.slice(0, fin).matchAll(/\btry\s*\{/g)) last = m.index;
    return last;
  })();
  const firstPull = at(body, /\bawait\s+docker\s*\(\s*pullArgs\b/);
  const firstRun = at(body, /\bawait\s+docker\s*\(\s*argv\b/);
  if (tryAt === -1 || firstPull < tryAt || firstRun < tryAt) out.push('a pull or a run in withContainers stands outside the try whose finally removes it.');

  // Rule 4, the net, and that it is installed before anything is made.
  const net = functionBodyOf(code, 'installNet');
  if (net === null) out.push('the helper declares no installNet().');
  else {
    if (!/process\.on\(\s*['"]exit['"]/.test(net)) out.push("the net registers no 'exit' handler, so a process.exit skips the teardown.");
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
      if (!new RegExp(`['"]${signal}['"]`).test(net)) out.push(`the net does not handle ${signal}, so ${signal} leaves a container running in his Docker.`);
    }
    if ((net.match(/\bendEverythingSync\s*\(/g) ?? []).length < 2) out.push('the net handlers do not reach the blocking teardown.');
  }
  const every = functionBodyOf(code, 'endEverythingSync');
  if (every === null || !/\bteardownSync\s*\(/.test(every)) out.push('endEverythingSync does not call teardownSync.');
  const netAt = at(body, /\binstallNet\s*\(\s*\)/);
  if (netAt === Number.POSITIVE_INFINITY) out.push('withContainers never installs the signal net.');
  else if (netAt > firstPull || netAt > firstRun) out.push('withContainers installs the signal net AFTER its first pull or run, so a signal then leaves a container or a pull behind.');
  const liveAt = at(body, /\blive\.set\s*\(\s*id\s*,\s*entry\s*\)/);
  if (liveAt > firstPull || liveAt > firstRun) out.push('withContainers registers its run with the net AFTER its first pull or run, so the net would find nothing to remove.');

  // Rule 5, the names.
  const prefix = /\bexport\s+const\s+NAME_PREFIX\s*=\s*'([^']*)'\s*;/.exec(code);
  if (prefix === null || prefix[1] !== 'tortie-p342-') out.push(`NAME_PREFIX is ${JSON.stringify(prefix?.[1] ?? null)}; every name this phase makes begins tortie-p342-.`);
  const pattern = /\bconst\s+PREFIX_RE\s*=\s*\/(.+)\/([a-z]*)\s*;/.exec(source);
  if (pattern === null) out.push('the helper declares no PREFIX_RE, so a prefix a caller hands it is never checked.');
  else {
    let re = null;
    try {
      re = new RegExp(pattern[1], pattern[2]);
    } catch {
      re = null;
    }
    const admits = ['tortie-p342-', 'tortie-p343-', 'tortie-p3401-'];
    const refuses = ['p342-', 'tortie-', 'tortie-p342', 'tortie-p342x-', 'supabase_', 'tortie-p34-', '', 'tortie-p342-x-'];
    if (re === null || admits.some((p) => !re.test(p)) || refuses.some((p) => re.test(p))) {
      out.push('PREFIX_RE does not admit exactly tortie-<phase>-, so a caller could name a container something his own could be called.');
    }
  }
  if (!/\bconst\s+name\s*=\s*`\$\{prefix\}\$\{row\}-\$\{runId\}`\s*;/.test(code)) out.push('a container name in withContainers is not composed as `${prefix}${row}-${runId}`.');
  if (!/\bconst\s+prefix\s*=\s*options\?\.namePrefix\s*\?\?\s*NAME_PREFIX\s*;/.test(body)) out.push('withContainers does not take its prefix from NAME_PREFIX.');
  if (!/if\s*\(\s*!\s*PREFIX_RE\.test\(\s*prefix\s*\)\s*\)\s*throw\b/.test(body)) out.push('withContainers does not refuse a prefix PREFIX_RE refuses.');
  const removal = functionBodyOf(code, 'removeContainerSync');
  if (removal === null) out.push('the helper declares no removeContainerSync().');
  else {
    const check = at(removal, /if\s*\(\s*!\s*name\.startsWith\(\s*'tortie-'\s*\)\s*\)\s*\{[^}]*return\s*;/);
    const rm = at(removal, /\bdockerSync\s*\(\s*\[\s*'rm'/);
    if (check === Number.POSITIVE_INFINITY || check > rm) out.push('removeContainerSync removes a container before it refuses a name without the tortie- prefix.');
    if (!/\bdockerSync\s*\(\s*\[\s*'rm'\s*,\s*'-f'\s*,\s*name\s*\]/.test(removal)) out.push('removeContainerSync does not remove exactly the one container it was named.');
  }

  // Rule 6, the verbs and the words, over every argv handed to the program.
  let sites = 0;
  for (const m of code.matchAll(/\b(?:docker|dockerSync)\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const args = callArguments(code, open);
    const first = args[0] ?? '';
    // A function's own declaration is not a call.
    if (/function\s+(?:docker|dockerSync)\s*\($/.test(code.slice(Math.max(0, m.index - 10), m.index + m[0].length))) continue;
    sites += 1;
    const lit = first.trim().startsWith('[') ? arrayWords(first.trim(), 0) : null;
    let words = lit?.words ?? null;
    if (words === null) {
      // A named array: argv (runArgv's), pullArgs, args (a handle's exec).
      const named = /^([A-Za-z_$][\w$]*)$/.exec(first.trim());
      if (named === null) {
        out.push(`the helper hands the program ${JSON.stringify(first.slice(0, 60))} at line ${String(lineAt(code, m.index))}, which is neither an array of words nor a named one.`);
        continue;
      }
      words = null;
    }
    if (words !== null) {
      const verb = words[0];
      if (!Object.hasOwn(VERBS, verb)) out.push(`the helper hands the program the verb ${JSON.stringify(verb)} at line ${String(lineAt(code, m.index))}, which is not one of its closed list.`);
      else if (VERBS[verb] !== null && !VERBS[verb].includes(words[1])) out.push(`the helper hands the program ${verb} ${JSON.stringify(words[1])} at line ${String(lineAt(code, m.index))}; ${verb} takes only ${VERBS[verb].join(' or ')}.`);
      for (const w of words) {
        if (FORBIDDEN_WORDS.includes(w) && !(verb === 'ps' && w === '-a') && !(verb === 'rm' && w === '-f')) out.push(`the helper hands the program ${JSON.stringify(w)} at line ${String(lineAt(code, m.index))}.`);
        if (w.includes('$(')) out.push(`the helper hands the program a $( at line ${String(lineAt(code, m.index))}, which selects by a command's answer rather than by name.`);
      }
      if (verb === 'image' && words.some((w) => w === '-f' || w === '--force')) out.push('the helper removes an image with -f, which removes it from under a container that still uses it.');
      if (verb === 'ps' && words.includes('-q')) out.push('the helper lists only container ids, the first half of a removal by pattern.');
    }
  }
  if (sites < 8) out.push(`the helper hands the program only ${String(sites)} argv(s); the reading of rule 6 found too few to trust.`);
  // The words a named argv is built from: runArgv's, the pull's, a handle's exec.
  for (const m of code.matchAll(/\b(?:argv|pullArgs|args)\s*(?:\.push\s*\(|=\s*\[)/g)) {
    const open = code.indexOf(m[0].endsWith('(') ? '(' : '[', m.index);
    const text = m[0].endsWith('(') ? (callArguments(code, open) ?? []).join(',') : (blockAtBracket(code, open) ?? '');
    for (const w of stringsOf(text).map((s) => s.text)) {
      if (FORBIDDEN_WORDS.includes(w) && !['-a', '-aq', '-qa'].includes(w)) out.push(`an argv the helper builds carries ${JSON.stringify(w)} at line ${String(lineAt(code, m.index))}.`);
      if (w.includes(`${TOOL}.sock`)) out.push('an argv the helper builds names the Docker socket.');
    }
  }
  for (const s of stringsOf(code)) {
    if (new RegExp(`\\b${TOOL}\\b[^\\n]*\\$\\(`).test(s.text) && isCommandLine(s.text)) out.push('the helper holds a command line naming the program with a $(, a removal by pattern.');
    if (s.text.includes('/var/run/') && s.text.includes('.sock')) out.push('the helper names a daemon socket path.');
  }

  // Rule 7, the run, driven.
  const lifted = liftRunArgv(code);
  if (lifted.fn === null) out.push(lifted.why);
  else {
    for (const spec of [
      { name: 'tortie-p342-u2404-g1', ref: 'ubuntu:24.04', port: 52062, hostname: 'p342-u2404', platform: null },
      { name: 'tortie-p342-arch-g1', ref: 'archlinux:latest', port: 52063, hostname: 'p342-arch', platform: 'linux/amd64' }
    ]) {
      let argv;
      try {
        argv = lifted.fn(spec);
      } catch (err) {
        out.push(`runArgv threw when driven: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      out.push(...runProblems(argv, spec));
    }
  }
  const seconds = /\bexport\s+const\s+MAIN_PROCESS_SECONDS\s*=\s*([^;]+);/.exec(code);
  const s = seconds === null ? null : product(seconds[1]);
  if (s === null || !(s > 0 && s <= 7200)) out.push(`MAIN_PROCESS_SECONDS is ${String(seconds?.[1] ?? 'missing')}; a container's main process ends itself within two hours.`);
  if (!/\bconst\s+argv\s*=\s*runArgv\s*\(/.test(body) || !/\brunArgvRefusal\s*\(\s*argv\s*,\s*prefix\s*\)/.test(body)) out.push('withContainers does not compose its run with runArgv and ask runArgvRefusal of it, with its own prefix, before it runs.');

  // Rule 8, the images, the pulls and the platform.
  const image = functionBodyOf(code, 'removePulledImage');
  if (image === null) out.push('the helper declares no removePulledImage().');
  else {
    const rm = at(image, /\bdockerSync\s*\(\s*\[\s*'image'\s*,\s*'rm'/);
    const listed = at(image, /if\s*\(\s*before\.has\(\s*ref\s*\)\s*\)\s*\{[^}]*return\s*;/);
    const idCheck = at(image, /if\s*\(\s*now\s*!==\s*recordedId\s*\)\s*\{[^}]*return\s*;/);
    const recorded = at(image, /!\s*IMAGE_ID_RE\.test\(/);
    if (rm === Number.POSITIVE_INFINITY) out.push('removePulledImage never removes an image.');
    if (listed > rm) out.push('removePulledImage removes an image before it refuses a reference the before list holds, one of his.');
    if (idCheck > rm) out.push('removePulledImage removes an image before it refuses an id that is not the one recorded at the pull.');
    if (recorded > rm) out.push('removePulledImage removes an image whose pull recorded no id.');
    if (!/\bdockerSync\s*\(\s*\[\s*'image'\s*,\s*'rm'\s*,\s*ref\s*\]/.test(image)) out.push('removePulledImage does not remove exactly [image, rm, ref], with no -f.');
  }
  for (const m of code.matchAll(/\[\s*'image'\s*,\s*'rm'([^\]]*)\]/g)) {
    if (/'-f'|'--force'/.test(m[1])) out.push('the helper removes an image with -f.');
  }
  const pullAt = at(body, /\bledger\(\s*entry\s*,\s*`pull /);
  const skipAt = at(body, /if\s*\(\s*haveRefs\.has\(\s*spec\.ref\s*\)[^)]*\)\s*continue\s*;/);
  if (skipAt > pullAt) out.push('withContainers pulls a reference the before list holds, which can re-tag or move one of his images.');
  if (!/\bconst\s+platform\s*=\s*spec\.platform\s*!==\s*undefined\s*&&\s*!\s*haveRefs\.has\(\s*spec\.ref\s*\)\s*\?\s*spec\.platform\s*:\s*null\s*;/.test(body)) {
    out.push('withContainers hands --platform to a run without asking that the before list lacks the reference.');
  }
  const teardownBody = functionBodyOf(code, 'teardownSync');
  if (teardownBody === null || !/\bremovePulledImage\s*\(\s*ref\s*,\s*entry\.pulled\.get\(\s*ref\s*\)\s*,\s*before\s*,\s*report\s*\)/.test(teardownBody)) {
    out.push('teardownSync does not remove each pull through removePulledImage with the id recorded at its pull and the before list.');
  }

  // Rule 9, the ledger and the sweep.
  const ledgerContainer = at(body, /\bledger\(\s*entry\s*,\s*`container \$\{name\}`\s*\)/);
  if (ledgerContainer === Number.POSITIVE_INFINITY || ledgerContainer > firstRun) out.push('withContainers makes a container before it writes its name to the ledger.');
  if (pullAt === Number.POSITIVE_INFINITY || pullAt > firstPull) out.push('withContainers pulls an image before it writes the reference to the ledger.');
  if (functionBodyOf(code, 'sweepLedger') === null || !/\bexport\s+function\s+sweepLedger\s*\(/.test(code)) out.push('the helper exports no sweepLedger, so a leaked run cannot be removed by its ledger.');
  if (!/process\.argv\.indexOf\(\s*'--sweep'\s*\)/.test(code) || !/\bsweepLedger\s*\(\s*process\.argv\[/.test(code)) out.push('the helper has no --sweep <ledger> command line.');

  // Rule 10, the lock.
  const lock = functionBodyOf(code, 'takeLock');
  if (lock === null || !/\bopenSync\s*\(\s*LOCK_PATH\s*,\s*'wx'/.test(lock)) out.push('the lock is not taken with wx, so two runs at once could remove each other\'s pulls.');
  const lockAt = at(body, /\bconst\s+lockWhy\s*=\s*takeLock\s*\(/);
  if (lockAt > firstPull || lockAt > firstRun) out.push('withContainers does not take the lock before its first pull and run.');
  if (!/if\s*\(\s*lockWhy\s*!==\s*null\s*\)\s*throw\b/.test(body)) out.push('withContainers goes on when the lock was not taken.');

  // Rule 11, the disk.
  const floor = /\bexport\s+const\s+DOCKER_MIN_FREE_KB\s*=\s*([^;]+);/.exec(code);
  const kb = floor === null ? null : product(floor[1]);
  if (kb === null || kb < 10 * 1024 * 1024) out.push(`DOCKER_MIN_FREE_KB is ${String(floor?.[1] ?? 'missing')}; under ten gigabytes free nothing is pulled or made (his ruling).`);
  const preflightAt = at(body, /\bconst\s+why\s*=\s*dockerPreflight\s*\(/);
  if (preflightAt > firstPull || preflightAt > firstRun || !/if\s*\(\s*why\s*!==\s*null\s*\)\s*throw\b/.test(body)) out.push('withContainers does not ask dockerPreflight, and stop on its sentence, before it pulls or makes anything.');

  // Rule 13, the scratch folder, DRIVEN (the proof builder's hardening). The
  // helper's own refuseScratchReason, lifted out of its text, over a made-up
  // repository, home and temporary root, so the reading does not depend on
  // where the gate runs (in his checkout the repository sits under his home,
  // which would hide an ablation of the repository clause). The default world
  // reads the home TWICE, HOME and the account record, because a probe points
  // HOME at scratch first; and the CLI's config folder is made fresh with
  // mkdtemp and removed by the path it was handed, never by a fixed name.
  const scratchRule = liftFunction(source, code, 'refuseScratchReason', 'const { resolve, sep } = deps;');
  if (scratchRule.fn === null) out.push(scratchRule.why);
  else {
    const world = { repo: '/w/repo', homes: ['/h/me', '/Users/me'], temps: ['/', '/tmp', '/private/tmp', '/var/folders/x/T'] };
    const refused = ['/w/repo', '/w/repo/build/p342', '/h/me/scratch', '/Users/me', '/tmp', '/private/tmp', '/var/folders/x/T', 'rel/scratch', '', '/a'];
    const admitted = ['/private/tmp/p342-measure-abc', '/var/folders/x/T/p342-run-1', '/tmp/p342-probe-x'];
    for (const dir of refused) {
      let got;
      try {
        got = scratchRule.fn(dir, world);
      } catch (err) {
        got = `threw ${err instanceof Error ? err.message : String(err)}`;
      }
      if (typeof got !== 'string') out.push(`refuseScratchReason admits ${JSON.stringify(dir)}, which is the repository, a home, a shared temporary root itself, or not a path.`);
    }
    for (const dir of admitted) {
      let got;
      try {
        got = scratchRule.fn(dir, world);
      } catch (err) {
        got = `threw ${err instanceof Error ? err.message : String(err)}`;
      }
      if (got !== null) out.push(`refuseScratchReason refuses ${JSON.stringify(dir)} (${String(got)}), a folder of the run's own inside a temporary root.`);
    }
  }
  // The default world, DRIVEN with a made-up HOME, account record and
  // temporary folder: both homes and every temporary root must be in it.
  const worldRule = liftFunction(
    source,
    code,
    'scratchWorld',
    "const { resolve } = deps; const repoRoot = '/w/repo'; const homedir = () => '/h/env'; const userInfo = () => ({ homedir: '/h/acct' }); const tmpdir = () => '/var/folders/x/T'; const realpathSync = (p) => p;"
  );
  if (worldRule.fn === null) out.push(worldRule.why);
  else {
    let w = null;
    try {
      w = worldRule.fn();
    } catch (err) {
      out.push(`scratchWorld threw when driven: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (w !== null) {
      if (!w.homes.includes('/h/env') || !w.homes.includes('/h/acct')) out.push(`scratchWorld reads the homes ${JSON.stringify(w.homes)}; it reads HOME AND the account record, so a probe that pointed HOME at scratch cannot let a scratch folder under his real home through.`);
      for (const root of ['/', '/tmp', '/private/tmp', '/var/tmp', '/var/folders/x/T']) {
        if (!w.temps.includes(root)) out.push(`scratchWorld's temporary roots ${JSON.stringify(w.temps)} leave out ${root}, which could be taken whole as one run's scratch.`);
      }
      if (w.repo !== '/w/repo') out.push('scratchWorld does not measure against the repository.');
    }
  }
  if (!/\bconst\s+configDir\s*=\s*mkdtempSync\s*\(\s*join\s*\(\s*scratch\s*,\s*'config-'\s*\)\s*\)/.test(body)) out.push("withContainers does not make the CLI's config folder fresh with mkdtemp, so the teardown could remove a folder this run did not make.");
  const tearBody = functionBodyOf(code, 'teardownSync') ?? '';
  if (/rmSync\s*\(\s*join\s*\(\s*entry\.scratch\s*,\s*f\s*\)/.test(tearBody) || /\['config'\]/.test(tearBody) || !/rmSync\s*\(\s*entry\.configDir\b/.test(tearBody)) out.push("teardownSync removes a config folder by a fixed name rather than the one mkdtemp handed this run.");

  // Rule 14, the run argv refusal, DRIVEN over every spelling (the proof
  // builder's hardening): the helper's own runArgvRefusal, lifted, must admit
  // the argv its runArgv composes and refuse each hostile one.
  const prefixDecl = /\bexport\s+const\s+NAME_PREFIX\s*=\s*'([^']*)'\s*;/.exec(code);
  const prefixRe = /\bconst\s+PREFIX_RE\s*=\s*(\/.+\/[a-z]*)\s*;/.exec(source);
  const secondsDecl = /\bexport\s+const\s+MAIN_PROCESS_SECONDS\s*=\s*([^;]+);/.exec(code);
  const refusal = liftFunction(
    source,
    code,
    'runArgvRefusal',
    `const NAME_PREFIX = ${JSON.stringify(prefixDecl?.[1] ?? '')}; const PREFIX_RE = ${prefixRe?.[1] ?? '/^$/'}; const MAIN_PROCESS_SECONDS = (${secondsDecl?.[1] ?? '0'});`
  );
  if (refusal.fn === null) out.push(refusal.why);
  else if (lifted.fn !== null) {
    const spec = { name: 'tortie-p342-u2404-g2', ref: 'ubuntu:24.04', port: 52064, hostname: 'p342-u2404', platform: null };
    const honest = lifted.fn(spec);
    const ask = (argv, p = 'tortie-p342-') => {
      try {
        return refusal.fn(argv, p);
      } catch (err) {
        return `threw ${err instanceof Error ? err.message : String(err)}`;
      }
    };
    if (ask(honest) !== null) out.push(`runArgvRefusal refuses the argv runArgv composes: ${String(ask(honest))}.`);
    const before = (extra) => {
      const at = honest.indexOf(spec.ref);
      return [...honest.slice(0, at), ...extra, ...honest.slice(at)];
    };
    const hostile = [
      ['a second -p', before(['-p', '127.0.0.1:52065:22'])],
      ['--publish', before(['--publish', '0.0.0.0:22:22'])],
      ['--publish=', before(['--publish=22'])],
      ['-P', before(['-P'])],
      ['an attached -p', before(['-p0.0.0.0:2222:22'])],
      ['-v', before(['-v', '/Users:/u'])],
      ['an attached -v', before(['-v/Users:/u'])],
      ['--volume=', before(['--volume=/Users:/u'])],
      ['--mount', before(['--mount', 'type=bind,src=/Users,dst=/u'])],
      ['--mount=', before(['--mount=type=bind,src=/,dst=/h'])],
      ['--volumes-from', before(['--volumes-from', 'supabase_db'])],
      ['--device', before(['--device', '/dev/disk0'])],
      ['--device=', before(['--device=/dev/disk0'])],
      ['--privileged', before(['--privileged'])],
      ['--pid=host', before(['--pid=host'])],
      ['--network host', before(['--network', 'host'])],
      ['--net=host', before(['--net=host'])],
      ['--ipc=host', before(['--ipc=host'])],
      ['--userns=host', before(['--userns=host'])],
      ['--cap-add', before(['--cap-add', 'ALL'])],
      ['--security-opt', before(['--security-opt', 'seccomp=unconfined'])],
      ['the Docker socket', before(['-e', 'X=/var/run/docker.sock'])],
      ['no --rm', honest.filter((w) => w !== '--rm')],
      ['no --pull never', honest.filter((w, i) => w !== '--pull' && honest[i - 1] !== '--pull')],
      ['every address', honest.map((w) => (/^127\.0\.0\.1:/.test(w) ? w.replace('127.0.0.1', '0.0.0.0') : w))],
      ['an unbounded main process', [...honest.slice(0, -2), 'sleep', 'infinity']],
      ['another run\'s prefix', honest.map((w) => (w === spec.name ? 'tortie-p343-u2404-g2' : w))],
      ['one of his own names', honest.map((w) => (w === spec.name ? 'supabase_db_x' : w))]
    ];
    for (const [what, argv] of hostile) {
      if (ask(argv) === null) out.push(`runArgvRefusal admits a run with ${what}, which reaches past the one fixed port or the run's own name.`);
    }
    if (ask(honest, 'p342-') === null) out.push('runArgvRefusal admits a prefix that is not tortie-<phase>-.');
  }

  // Rule 12, the proof.
  if (teardownBody === null || !/\breport\.differences\s*=\s*compareDockerLists\(\s*entry\.before\s*,\s*after\s*\)/.test(teardownBody)) out.push('teardownSync does not compare the after lists with the before lists.');
  if (teardownBody === null || !/report\.clean\s*=\s*report\.problems\.length\s*===\s*0\s*&&\s*report\.differences\.length\s*===\s*0/.test(teardownBody)) out.push('teardownSync calls a run clean without its lists agreeing.');
  return out;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const failures = [];
const fail = (what, detail) => failures.push({ what, detail });

// Rule 13 first, so a scanner that stopped working is said before its verdict.
let caughtFixtures = 0;
for (const f of FILE_FIXTURES) {
  const hits = dockerStarts(`fixture: ${f.name}`, f.text, f.sh === true);
  if (f.caught && hits.length === 0) fail(`the fixture "${f.name}" was not caught`, 'The forward rule cannot catch that shape in the tree either.');
  if (!f.caught && hits.length > 0) fail(`the fixture "${f.name}" was reported`, `${hits.map((h) => h.what).join('; ')}. A false alarm makes every pass worthless.`);
  if (f.caught && hits.length > 0) caughtFixtures += 1;
}
const fixtureUsers = helperUsers(
  FILE_FIXTURES.map((f) => f.name),
  (name) => FILE_FIXTURES.find((f) => f.name === name).text
);
const wantUsers = FILE_FIXTURES.filter((f) => f.user === true).map((f) => f.name);
if (fixtureUsers.join('\n') !== wantUsers.join('\n')) {
  fail('the derivation did not pick out exactly the fixtures that reach the helper', `It answered [${fixtureUsers.join(', ')}] where [${wantUsers.join(', ')}] reach it.`);
}
if (floorFinding(DOCKER_USER_FLOOR - 1, DOCKER_USER_FLOOR) === null) fail('the floor accepted a population one short of itself', 'Rule 2 cannot notice a script leaving the helper.');
if (floorFinding(DOCKER_USER_FLOOR, DOCKER_USER_FLOOR) !== null) fail('the floor refused a population that meets it', 'The floor is a minimum, so adding a script must never turn this red.');

const helperSource = readFileSync(join(buildDir, HELPER), 'utf8');
for (const why of helperShape(helperSource)) fail(`build/${HELPER}: ${why}`, 'A container this helper makes could outlive the script that made it, or touch something of his.');
let ablationsRed = 0;
for (const a of HELPER_ABLATIONS) {
  const edited = a.edit(helperSource);
  if (edited === helperSource) {
    fail(`the helper ablation "${a.what}" found nothing to edit`, 'Its anchor is gone from the helper, so this gate no longer proves that clause. Re-point it.');
    continue;
  }
  if (helperShape(edited).length === 0) fail(`the helper ablation "${a.what}" left the helper rules green`, 'That clause is not asserted by anything.');
  else ablationsRed += 1;
}

// Rules 1 and 2 over the tree: the scripts, and the shell scripts too.
const files = walkScripts(buildDir, (n) => /\.(mjs|cjs|mts|sh)$/.test(n)).map((f) => f.name);
const read = (name) => readFileSync(join(buildDir, name), 'utf8');
let scanned = 0;
for (const name of files) {
  if (name === HELPER || name === SELF || name === FIXTURES_FILE) continue;
  scanned += 1;
  for (const h of dockerStarts(name, read(name))) {
    fail(
      `build/${h.file}:${String(h.line)} ${h.what}`,
      `Only build/${HELPER} makes, runs into or removes a container, and only inside withContainers, whose finally and signal handlers remove it and compare his lists. Call withContainers instead.`
    );
  }
}
const users = helperUsers(
  files.filter((n) => !n.endsWith('.sh')),
  read
);
const floorWhy = floorFinding(users.length, DOCKER_USER_FLOOR);
if (floorWhy !== null) fail('the population reaching the helper shrank', floorWhy);

if (process.argv.includes('--list')) {
  for (const u of users) process.stdout.write(`${u}\n`);
}

if (failures.length > 0) {
  process.stderr.write('gate:docker FAIL\n');
  for (const f of failures) process.stderr.write(`  - ${f.what}. ${f.detail}\n`);
  process.exit(1);
}
process.stdout.write(
  `gate:docker PASS. ${String(scanned)} scripts under build/ read, none hands the program a spawn ` +
    `outside build/${HELPER}; ${String(users.length)} reach it against a floor of ${String(DOCKER_USER_FLOOR)}; ` +
    `its teardown is inside a finally and its net covers exit, SIGINT, SIGTERM and SIGHUP, installed before its first pull and run; ` +
    `every run is --rm, --pull never, on one fixed 127.0.0.1 port with a bounded main process (driven); ` +
    `its run argv refusal refuses every second publish, mount, device, host namespace and foreign name it was shown, ` +
    `and its scratch rule refuses the repository, both readings of the home and every temporary root itself (driven); ` +
    `no image of his list is pulled, re-tagged or removed, and none is removed with -f; ` +
    `${String(caughtFixtures)} of ${String(FILE_FIXTURES.filter((f) => f.caught).length)} bad fixtures caught, ` +
    `${String(FILE_FIXTURES.filter((f) => !f.caught).length)} controls left alone, ` +
    `${String(ablationsRed)} of ${String(HELPER_ABLATIONS.length)} helper ablations red.\n`
);
