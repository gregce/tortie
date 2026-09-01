#!/usr/bin/env node
/**
 * assert-known-hosts-scoped.mjs. No run of this harness can put a line in the
 * person's ~/.ssh/known_hosts (Phase 193).
 *
 * IT SPAWNS NOTHING. IT STARTS NO ssh AND NO sshd. IT OPENS NO SOCKET. IT READS
 * NOTHING UNDER THE PERSON'S HOME. It reads the files under build/, imports
 * build/ssh-run.mjs and calls four of its functions with made up paths, writes
 * its fixtures into a scratch directory it removes in a `finally` block, and
 * exits. Measured on 2026-09-01 over three runs: 0.45, 0.40 and 0.42 seconds
 * wall, against 0.17 for build/assert-electron-teardown.mjs and a 0.02 second
 * floor for starting node at all. It is slower than that sibling because it
 * reads 182 files rather than one, and it reads each of them ONCE: everything
 * the four rules need is computed in a single pass by {@link contextOf}.
 *
 * ## Why this file exists
 *
 * `~/.ssh/known_hosts` on the operator's Mac holds three entries for 127.0.0.1.
 * CLAUDE.md records that same file at 932 bytes before a probe run during the
 * machines work and 1,229 after. A loopback entry measures 99 bytes, so that
 * growth of 297 is exactly three of them.
 *
 * The product's side of this was fixed and gated: `npm run conformance:machines`
 * fails if the connection test's argv stops naming Tortie's own record file
 * first. The harness had no equivalent. Eighteen scripts under build/ each
 * carried `-o UserKnownHostsFile=` by hand, and every one of them was correct on
 * 2026-09-01. That is the problem this gate exists for. Eighteen correct call
 * sites are a fact about today, and the nineteenth is the one nobody notices.
 *
 * Phase 193 moved every ssh onto `build/ssh-run.mjs`, which cannot run without a
 * record file. This gate is what keeps it there.
 *
 * ## What it asserts
 *
 *   1. FORWARD. No file under build/ except ssh-run.mjs hands ssh, scp, sftp or
 *      ssh-keyscan to a spawn.
 *
 *      WHICH CALLS ARE SPAWNS IS DISCOVERED, NOT LISTED. The node calls are
 *      known, being spawn, spawnSync, exec, execSync, execFile and
 *      execFileSync, and then every function this file gives a name to whose
 *      body reaches one of those joins them, and so does anything that reaches
 *      THAT. Almost every probe here declares its own
 *      `function sh(file, args, options = {})` around its line 100 and spawns
 *      through it, and a probe that called the same wrapper `connect` would be
 *      invisible to a hard coded list. The first version of this gate held such
 *      a list, and `connect(sshBin, argv)` walked past it.
 *
 *      WHICH NAMES HOLD A PROGRAM IS READ FOUR WAYS, because all four are
 *      ordinary: a constant string bound to a name anywhere, including by a
 *      plain assignment and by a default parameter; a name imported from the
 *      helper, being SSH_BIN and KEYSCAN_BIN, which have no declaration in the
 *      importing file at all; a choice between values, being `||`, `??` and
 *      `?:`, where a name that CAN hold the client is read as holding it; and a
 *      constant expression folded flat, so `join('/usr/bin', 'ss' + 'h')` is
 *      read the same as the path written out.
 *
 *      1b. No spawn hands `ssh-keygen` its `-R` or `-F` flag. Those two read and
 *      WRITE a known_hosts file and default to the person's own, so they are the
 *      one way a program outside the four could reach it. They are refused
 *      outright rather than routed, because nothing in this tree needs them. The
 *      flag is resolved through the names the file holds, so a flag kept in a
 *      variable is the same as one written in the argv.
 *
 *      1c. No file hands a shell a command line that names one of the four.
 *      THERE ARE THREE WAYS A COMMAND LINE REACHES A SHELL and the first version
 *      of this gate read one spelling of one of them, being a quoted literal
 *      directly after a `'-c'`. That was the spelling that happened to be in the
 *      tree: `build/capture-machine-goldens.mjs` read its client version with
 *      `/bin/sh -c "${sshBin} -V 2>&1"`. Its four nearest neighbours all sailed
 *      through, which is a fixture written to the bug rather than to the shape.
 *      The three ways are a shell option ending in `c`, being `-c`, `-lc`, `-ic`
 *      and `-lic`, whose next element is the command line whether it is written
 *      there or held in a name; `exec` and `execSync`, whose first argument IS
 *      one; and any spawn carrying `shell: true`, which makes its first argument
 *      one. `sshVersion` in the helper is where the tree's own case lives now.
 *
 *   2. REVERSE. Every file on the recorded list below still reaches the helper.
 *      Without this direction the gate goes on passing after somebody deletes
 *      every probe, which is the lesson build/assert-probe-containment.mjs
 *      records about itself at its line 27.
 *
 *   3. THE HELPER ITSELF. In ssh-run.mjs the `-o UserKnownHostsFile=` pair is
 *      emitted from exactly ONE place, that place refuses an empty value, and no
 *      function that reaches it gives `knownHosts` a default. The empty check is
 *      not theoretical: `-o UserKnownHostsFile=` with no value is a parse error
 *      that stops ssh, so an empty value is a broken run rather than a safe one.
 *      A default value is worse than a missing argument, because a default is
 *      silent.
 *
 *   4. THE ORDER. No `UserKnownHostsFile` value under build/ names the person's
 *      own file FIRST. `homedir()`, `os.homedir`, `~/.ssh` and a literal
 *      `/Users/` path may appear only inside `productKnownHosts({ tortie, user })`,
 *      which emits Tortie's file first and cannot be asked for the other order.
 *      This is the same rule `npm run conformance:machines` enforces for the
 *      product, and it is the rule that would have caught the 932 to 1,229 event.
 *
 *      Rule 4 is also checked by RUNNING the helper rather than only reading it,
 *      because the source direction and the behaviour are two different claims.
 *
 *   5. THE REFUSAL IS WHOLE AND NAMED. Every failure prints the file, the line,
 *      the program and which rule broke. Never a bare exit code.
 *
 *   6. THE FIXTURES. The scanner is run over the files in
 *      build/known-hosts-fixtures.mjs, which this script writes into a scratch
 *      directory and removes in a `finally` block. Most of them MUST make it
 *      fail. If any of those passes, the gate exits non-zero saying its own
 *      scanner is broken, because a gate that cannot fail is not a gate. Two
 *      controls must NOT be flagged, because a scanner that cries wolf makes
 *      every pass it prints worthless.
 *
 * ## WHERE IT STOPS, said plainly so a pass is not read for more than it says
 *
 * This gate reads source TEXT. It folds constants, so a name spelled
 * `'ss' + 'h'` or `join('/usr/bin', 'ssh')` is read, and it resolves names
 * through assignments, imports and choices. It does NOT execute anything, so a
 * program name that only exists at RUN time is not read: one taken from an
 * environment variable with no constant fallback, one read out of a JSON file,
 * one built with `String.fromCharCode`, or one arriving through a function
 * imported from another file. It also does not follow a wrapper across files,
 * because discovery reads one file at a time; `sh` and `run` are kept as seeds
 * for exactly that gap.
 *
 * NONE OF THAT IS THE THREAT THIS EXISTS FOR. The defect it exists for is the
 * twentieth script, written honestly by somebody who did not know the rule. A
 * deliberately hidden ssh is a code review question, and no scanner that reads
 * text can answer it.
 *
 * ## What it does not assert
 *
 * The nine `sshd` launches under build/. A server holds no known_hosts. It is
 * process teardown, which build/scratch-machine.mjs already owns, and folding it
 * in here is how a harness fix becomes a machines phase.
 *
 * It says nothing about the product. `src/main/machines/**` is not read by this
 * file at all. `npm run conformance:machines` is that gate and it is untouched.
 *
 * Run it with `npm run gate:knownhosts`. It also runs inside `npm run build`, so
 * nothing that builds can skip it.
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CASES } from './known-hosts-fixtures.mjs';
import { callArguments, lineAt, namedFunctions, stripComments } from './scan-source.mjs';
import { productKnownHosts, sshArgv, sshOptions, sshRun } from './ssh-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(repoRoot, 'build');
const HELPER = 'ssh-run.mjs';

/**
 * Every file that reached build/ssh-run.mjs when Phase 193 landed.
 *
 * When a probe is deleted on purpose, delete its row here in the same commit and
 * say so in the commit body. Do not delete a row to make a red gate green.
 */
const HELPER_USERS = [
  'capture-machine-goldens.mjs',
  'p118-remote-children.mjs',
  'probe-control-deadline.mjs',
  'probe-control-dialect.mjs',
  'probe-execplane.mjs',
  'probe-key-install.mjs',
  'probe-p102-shot.mjs',
  'probe-p103-shot.mjs',
  'probe-p104-shot.mjs',
  'probe-p107-history.mjs',
  'probe-p187-returning-tab.mjs',
  'probe-p193-known-hosts.mjs',
  'probe-p95-scroll.mjs',
  'probe-remote-arm.mjs',
  'probe-remote-attach.mjs',
  'probe-remote-harvest.mjs',
  'probe-remote-image.mjs',
  'real-machine.mjs',
  'scratch-machine.mjs'
];

/** The one file allowed to hand an ssh family program to a spawn. */
const EXEMPT = new Set([HELPER]);

/**
 * The four programs that can add a line to a known_hosts file, by basename.
 *
 * `ssh-keyscan` cannot, and it takes no `-o` at all. It is on the list anyway so
 * that this gate has ONE rule rather than one rule plus an exception list a
 * later round has to keep correct.
 */
const SSH_PROGRAMS = ['ssh', 'scp', 'sftp', 'ssh-keyscan'];

/**
 * The two ssh-keygen flags that read and WRITE a known_hosts file, and default
 * to the person's own when no file is named. Nothing in this tree uses either.
 */
const KEYGEN_KNOWN_HOSTS_FLAGS = ['-R', '-F'];

/**
 * The `node:child_process` calls that can start an arbitrary program.
 *
 * `execSync` is on this list and its absence was a hole. It takes a whole
 * command line, it is one ordinary line to write, and the first version of this
 * gate read past it while reading its sibling `exec`. `fork` is deliberately
 * NOT on it: it starts node and cannot start an ssh.
 */
const NODE_SPAWNS = ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync'];

/**
 * Two wrapper names kept as seeds, for a wrapper IMPORTED rather than declared.
 *
 * Almost every probe under build/ declares its own
 * `function sh(file, args, options = {})` around its line 100 and spawns
 * through that. {@link spawnCallNames} DISCOVERS those by reading the file
 * rather than by being told, so the list is not what gives rule 1 its reach.
 * These two remain only for the day a probe imports a wrapper instead of
 * declaring one, which reading a single file cannot see.
 */
const SEED_WRAPPERS = ['sh', 'run'];

/** The calls whose FIRST argument is a command line rather than a program. */
const COMMAND_LINE_CALLS = /^(?:exec|execSync)$/;

/**
 * The names `build/ssh-run.mjs` exports that HOLD a program path.
 *
 * Three files under build/ already import `SSH_BIN`. An imported name has no
 * declaration in the importing file, so a scanner reading declarations sees
 * nothing at all where `spawnSync(SSH_BIN, argv)` would be an ordinary line and
 * a real unrouted ssh.
 */
const HELPER_PROGRAMS = new Map([
  ['SSH_BIN', '/usr/bin/ssh'],
  ['KEYSCAN_BIN', '/usr/bin/ssh-keyscan']
]);

// ---------------------------------------------------------------------------
// Reading a program out of source text
// ---------------------------------------------------------------------------

/** The basename of a path, or the whole string when it holds no slash. */
const baseOf = (value) => value.split('/').pop() ?? '';

/**
 * A piece of source with its CONSTANT string expressions folded flat.
 *
 * This is what makes three otherwise unreadable spellings ordinary:
 * `join('/usr/bin', 'ss' + 'h')`, `'-' + 'R'`, and a template that spells the
 * client `ss${''}h`. Every one of them is a constant the compiler folds, and a
 * scanner that reads only whole literals is blind to all three.
 *
 * IT FOLDS CONSTANTS AND NOTHING ELSE. A program name read out of a file at run
 * time, taken from an environment variable alone, or built with
 * `String.fromCharCode`, is not folded and is not caught. That boundary is
 * stated in this file's header on purpose rather than left implied.
 */
function foldLiterals(text) {
  let out = text ?? '';
  for (let pass = 0; pass < 4; pass += 1) {
    const before = out;
    out = out.replace(/\$\{\s*(['"])([^'"`\n]*)\1\s*\}/g, '$2');
    out = out.replace(
      /(['"])([^'"`\n]*)\1\s*\+\s*(['"])([^'"`\n]*)\3/g,
      (_all, quote, left, _other, right) => `${quote}${left}${right}${quote}`
    );
    out = out.replace(
      /\b(?:join|resolve)\s*\(\s*(['"])([^'"`\n]*)\1\s*,\s*(['"])([^'"`\n]*)\3\s*\)/g,
      (_all, quote, left, _other, right) => `${quote}${left}/${right}${quote}`
    );
    if (out === before) break;
  }
  return out;
}

/** The program a string expression names, or null when it is not one of ours. */
function literalProgram(text) {
  const m = /^\s*(['"])([^'"`\n]*)\1\s*$/.exec(foldLiterals(text ?? ''));
  if (m === null) return null;
  return SSH_PROGRAMS.includes(baseOf(m[2])) ? m[2] : null;
}

/** The program a string expression names when it is ssh-keygen, or null. */
function keygenLiteral(text) {
  const m = /^\s*(['"])([^'"`\n]*)\1\s*$/.exec(foldLiterals(text ?? ''));
  if (m === null) return null;
  return baseOf(m[2]) === 'ssh-keygen' ? m[2] : null;
}

/**
 * The constant string a right hand side holds, or null.
 *
 * The right hand side is read to the end of the line and then folded, so what
 * arrives here can carry the punctuation that closed something around it:
 * `function go(bin = '/usr/bin/ssh')` gives `'/usr/bin/ssh') {`. A DEFAULT
 * PARAMETER is an ordinary way to name a program and it must not be lost to
 * that trailing bracket, so a value is accepted when the folded text begins
 * with one bare literal and everything after it is closing punctuation. A
 * remainder holding any name or operator is refused, which is what keeps
 * `x === '/usr/bin/ssh'` and `'a', y = 'b'` out.
 */
function constantAtFront(text) {
  const folded = foldLiterals((text ?? '').trim());
  const head = /^(['"])[^'"`\n]*\1/.exec(folded);
  if (head === null) return null;
  const rest = folded.slice(head[0].length);
  return /^[)\]},;\s{]*$/.test(rest) ? head[0] : null;
}

/**
 * Every name in one file that holds a constant string, with the text it holds.
 *
 * A DECLARATION IS NOT THE ONLY WAY A NAME GETS A VALUE, and reading only
 * `const` was a hole. `sshBin = '/usr/bin/ssh';` on its own line is a plain
 * assignment, `function go(bin = '/usr/bin/ssh')` is a default parameter, and
 * `{ sshBin: '/usr/bin/ssh' }` is a property. All three are ordinary and all
 * three are read here.
 *
 * The right hand side is taken WHOLE and then folded, rather than being
 * required to begin with a quote. That is what reaches
 * `join('/usr/bin', 'ss' + 'h')`, which is a constant with no quote at its
 * front. A right hand side that does not fold to one bare literal is dropped,
 * so `x === '/usr/bin/ssh'` and `join(root, 'known_hosts')` both leave nothing
 * behind: the first is a comparison rather than an assignment and the second
 * holds a name this file cannot resolve.
 */
function stringValues(code) {
  const values = new Map();
  const assigned = /\b([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*)/g;
  let m;
  while ((m = assigned.exec(code)) !== null) {
    if (values.has(m[1])) continue;
    const held = constantAtFront(m[2]);
    if (held !== null) values.set(m[1], held);
  }
  const prop = /([A-Za-z_$][\w$]*)\s*:\s*([^,\n}]*)/g;
  while ((m = prop.exec(code)) !== null) {
    if (values.has(m[1])) continue;
    const held = constantAtFront(m[2]);
    if (held !== null) values.set(m[1], held);
  }
  return values;
}

/**
 * Every name declared as a CHOICE between values, with the pieces it chooses
 * from.
 *
 * `const sshBin = process.env.TORTIE_SSH || '/usr/bin/ssh'` is one honest line,
 * and the first version of this gate read past it because its declaration
 * reader wanted the whole right hand side to be a single literal.
 * `const file = remote ? SSH_BIN : program` is the same shape written as a
 * question, and it is in this tree.
 *
 * A name that CAN hold the client is read as holding it. A scanner cannot know
 * which way the question goes at run time, and the safe reading is the one that
 * fails closed.
 */
function choicePieces(code) {
  const out = new Map();
  const decl = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*)[;\n]/g;
  let m;
  while ((m = decl.exec(code)) !== null) {
    const rhs = m[2].trim();
    if (!/\|\||\?\?|\?/.test(rhs)) continue;
    const pieces = rhs
      .split(/\|\||\?\?|\?|:/)
      .map((one) => one.trim())
      .filter((one) => one !== '');
    if (pieces.length > 1) out.set(m[1], pieces);
  }
  return out;
}

/** The names this file imported from the helper that hold a program path. */
function helperProgramImports(code) {
  const found = [];
  const re = /import\s*\{([^}]*)\}\s*from\s*['"]\.\/ssh-run\.mjs['"]/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    for (const piece of m[1].split(',')) {
      const parts = piece.trim().split(/\s+as\s+/);
      const exported = (parts[0] ?? '').trim();
      const local = (parts[parts.length - 1] ?? '').trim();
      if (HELPER_PROGRAMS.has(exported)) found.push([local, HELPER_PROGRAMS.get(exported)]);
    }
  }
  return found;
}

/**
 * The identifiers and the property names in one file that hold an ssh family
 * program, and what path each holds.
 *
 * Four sources, because all four are how this tree is written: a constant
 * string bound to a name, a name imported from the helper, a choice between
 * values where one of them is the client, and the same again one level deeper
 * so a chain of two resolves.
 */
function sshNames(code, values = stringValues(code)) {
  const names = new Map();
  const keygens = new Map();
  for (const [name, value] of values) {
    const program = literalProgram(value);
    if (program !== null) names.set(name, program);
    const keygen = keygenLiteral(value);
    if (keygen !== null) keygens.set(name, keygen);
  }
  for (const [name, path] of helperProgramImports(code)) names.set(name, path);
  const choices = choicePieces(code);
  for (let pass = 0; pass < 3; pass += 1) {
    let grew = false;
    for (const [name, pieces] of choices) {
      if (names.has(name)) continue;
      for (const piece of pieces) {
        const program = literalProgram(piece) ?? names.get(piece) ?? null;
        if (program === null) continue;
        names.set(name, program);
        grew = true;
        break;
      }
    }
    if (!grew) break;
  }
  return { names, keygens };
}

/** The program one argument in spawn position names, or null. */
function programOf(text, names) {
  const direct = literalProgram(text);
  if (direct !== null) return direct;
  const trimmed = (text ?? '').trim();
  if (names.has(trimmed)) return names.get(trimmed);
  const member = /^[A-Za-z_$][\w$]*\.([A-Za-z_$][\w$]*)$/.exec(trimmed);
  if (member !== null && names.has(member[1])) return names.get(member[1]);
  return null;
}

/** One argument's text with its constant names replaced by what they hold. */
function makeSubstituter(values) {
  if (values.size === 0) return (text) => foldLiterals(text ?? '');
  const re = new RegExp(`\\b(${[...values.keys()].join('|')})\\b`, 'g');
  return (text) =>
    foldLiterals(foldLiterals(text ?? '').replace(re, (all, name) => values.get(name) ?? all));
}

/**
 * The names that start a program in ONE file: the node calls, the two seeds,
 * and every local function whose body reaches one of them.
 *
 * DISCOVERY RATHER THAN A LIST, and that difference is the whole of rule 1's
 * reach. The first version of this gate held a hard coded list of call names,
 * so a probe that called its own wrapper `connect` rather than `sh` handed ssh
 * to a spawn in plain sight and the gate said nothing. Over the files here the
 * discovery finds `sh` in 35 of them and `run` in 11, which is exactly the two
 * the list held, plus the functions that call those.
 */
function spawnCallNames(code) {
  const names = new Set([...NODE_SPAWNS, ...SEED_WRAPPERS]);
  const bodies = namedFunctions(code);
  for (let pass = 0; pass < 6; pass += 1) {
    const reaches = new RegExp(
      `(?:\\b[A-Za-z_$][\\w$]*\\s*\\.\\s*)?\\b(?:${[...names].join('|')})\\s*\\(`
    );
    let grew = false;
    for (const [name, body] of bodies) {
      if (names.has(name)) continue;
      if (reaches.test(body)) {
        names.add(name);
        grew = true;
      }
    }
    if (!grew) break;
  }
  return names;
}

/** Every call of one of `names` in the file, with its arguments as text. */
function* calls(code, names) {
  const re = new RegExp(
    `(?:\\b[A-Za-z_$][\\w$]*\\s*\\.\\s*)?\\b(${[...names].join('|')})\\s*\\(`,
    'g'
  );
  let m;
  while ((m = re.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    yield { callee: m[1], index: m.index, args: callArguments(code, open) };
  }
}

/** Everything one file's source is read for, computed once. */
function contextOf(source) {
  const code = stripComments(source);
  const values = stringValues(code);
  const { names, keygens } = sshNames(code, values);
  return { code, values, names, keygens, spawns: spawnCallNames(code), sub: makeSubstituter(values) };
}

/** Every spawn in one file whose program is an ssh family program (rule 1). */
export function sshSpawns(name, source, ctx = contextOf(source)) {
  const hits = [];
  for (const { callee, index, args } of calls(ctx.code, ctx.spawns)) {
    const program = programOf(args[0], ctx.names);
    if (program === null) continue;
    hits.push({
      file: name,
      line: lineAt(ctx.code, index),
      program,
      rule: 1,
      why: `${callee}(${(args[0] ?? '').split('\n')[0].trim()}, ...) starts ${program} itself`
    });
  }
  return hits;
}

/** Every spawn in one file that hands ssh-keygen a known_hosts flag (rule 1b). */
export function keygenKnownHostsSpawns(name, source, ctx = contextOf(source)) {
  const hits = [];
  for (const { index, args } of calls(ctx.code, ctx.spawns)) {
    const first = (args[0] ?? '').trim();
    if (keygenLiteral(first) === null && !ctx.keygens.has(first)) continue;
    const argv = ctx.sub(args[1] ?? '');
    const flag = KEYGEN_KNOWN_HOSTS_FLAGS.find((one) =>
      new RegExp(`(['"])${one}\\1`).test(argv)
    );
    if (flag === undefined) continue;
    hits.push({
      file: name,
      line: lineAt(ctx.code, index),
      program: 'ssh-keygen',
      rule: '1b',
      why:
        `${'spawn'}(ssh-keygen, [... ${flag} ...]) reads and WRITES a known_hosts ` +
        "file, and with no file named it is the person's own"
    });
  }
  return hits;
}

/**
 * Every command line in one file that a shell will be given and that names an
 * ssh family program (rule 1c).
 *
 * THREE WAYS A COMMAND LINE REACHES A SHELL, and the first version of this gate
 * read only a quoted literal directly after a `'-c'`. That is one spelling of
 * one of the three, and it was the one that happened to be in the tree:
 * `build/capture-machine-goldens.mjs` read its client version with
 * `/bin/sh -c "${sshBin} -V 2>&1"`. Its four nearest neighbours all sailed
 * through, which is a fixture written to the bug rather than to the shape.
 *
 *   a. A shell option ending in `c`, being `-c`, `-lc`, `-ic`, `-lic`. The next
 *      element is the command line, whether it is written there or held in a
 *      name.
 *   b. `exec` and `execSync`, whose first argument IS a command line.
 *   c. Any spawn carrying `shell: true`, which makes its first argument one.
 */
export function shellSshLines(name, source, ctx = contextOf(source)) {
  const hits = [];
  const interpolated = [...ctx.names.keys()].join('|') || '\\u0000';
  const word = new RegExp(
    `\\b(${SSH_PROGRAMS.join('|')})\\b|\\$\\{\\s*(${interpolated})\\s*\\}`
  );
  const add = (index, line, how) =>
    hits.push({
      file: name,
      line: lineAt(ctx.code, index),
      program: 'a shell',
      rule: '1c',
      why: `${how} names an ssh family program: ${line.split('\n')[0].trim().slice(0, 70)}`
    });

  const dashC = /(['"])(-[a-z]*c)\1\s*,\s*(`[^`]*`|'[^'\n]*'|"[^"\n]*"|[A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = dashC.exec(ctx.code)) !== null) {
    const line = ctx.sub(m[3]);
    if (!word.test(line)) continue;
    add(m.index, line, `a command line handed to a shell after ${m[2]}`);
  }

  for (const { callee, index, args } of calls(ctx.code, ctx.spawns)) {
    const commandLineCall = COMMAND_LINE_CALLS.test(callee);
    const shelled = args.some((one) => /\bshell\s*:\s*(?!false\b)[A-Za-z_$'"`0-9]/.test(one ?? ''));
    if (!commandLineCall && !shelled) continue;
    const line = ctx.sub(args[0] ?? '');
    if (!word.test(line)) continue;
    add(
      index,
      line,
      commandLineCall
        ? `${callee}(), whose first argument is a whole command line,`
        : `${callee}(..., { shell: ... }), which makes its first argument a command line,`
    );
  }
  return hits;
}

/** Whether this file reaches the helper (rule 2). */
export function usesHelper(source) {
  const code = stripComments(source);
  const imported = /from\s+['"]\.\/ssh-run\.mjs['"]/.test(code);
  const called =
    /\b(sshRun|sshSpawn|sshArgv|sshOptions|keyscan|keyscanText|sshVersion|productKnownHosts|scratchKnownHosts)\s*\(/.test(
      code
    );
  return { imported, called };
}

// ---------------------------------------------------------------------------
// Rule 3. The helper's own shape
// ---------------------------------------------------------------------------

/**
 * The helper emits the option once, refuses an empty value, and gives
 * `knownHosts` no default anywhere.
 */
export function helperShape(source) {
  const code = stripComments(source);
  const problems = [];

  const emits = code.match(/(['"])-o\1\s*,\s*`\$\{OPTION\}=/g) ?? [];
  if (emits.length !== 1) {
    problems.push(
      `the -o UserKnownHostsFile= pair is emitted from ${String(emits.length)} ` +
        'place(s) rather than exactly 1. One place is what makes this gate a ' +
        'reading of the whole guarantee rather than of one branch of it.'
    );
  }

  if (!/typeof value !== 'string' \|\| value\.trim\(\) === ''/.test(code)) {
    problems.push(
      'the emitting function does not refuse an empty value. ' +
        '`-o UserKnownHostsFile=` with no value is a parse error that stops ' +
        'ssh, so an empty value is a broken run rather than a safe one.'
    );
  }

  const defaulted = code.match(/\bknownHosts\s*=/g) ?? [];
  if (defaulted.length !== 0) {
    problems.push(
      `knownHosts is given a default in ${String(defaulted.length)} place(s). ` +
        'It must have none. A missing argument throws and names the caller; a ' +
        'default is silent, and silence is how the line got into the file.'
    );
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Rule 4. The person's file is never named first
// ---------------------------------------------------------------------------

/** The ways a value can name the person's own home. */
const HOME_TOKEN = /homedir\s*\(\s*\)|os\.homedir|~\/\.ssh|\/Users\//;

/**
 * Every single line `const`, `let` and `var` in one file, by name.
 *
 * THE LIMIT, STATED SO NOBODY READS MORE INTO A PASS THAN IS THERE. A
 * declaration whose value runs over more than one line is not read. Every record
 * file value in this tree is written on one line, and a two line one would be
 * caught by the FIRST rule instead the moment it reached a spawn outside the
 * helper, which is the rule that actually blocks the write.
 */
function declarations(code) {
  const decls = new Map();
  const re = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*);/g;
  let m;
  while ((m = re.exec(code)) !== null) decls.set(m[1], m[2].trim());
  return decls;
}

/**
 * A value with its `${name}` interpolations replaced by what those names were
 * declared to be, three levels deep.
 *
 * THIS IS WHAT MAKES RULE 4 REAL, and it was added because the rule failed its
 * own proof without it. Reversing a real call site to
 * `const PLANE_RECORD = \`"${userRecord}" "${tortieRecord}"\`` and running the
 * gate produced NOTHING: the reversed value carries no `homedir()` of its own,
 * because `userRecord` is one, and the record file the option names is the
 * variable rather than the text. A rule that reads only the text at the option
 * is a rule that passes on the exact defect it was written for.
 */
function expand(value, decls, depth = 3) {
  if (depth === 0) return value;
  let out = value;
  for (const [name, text] of decls) {
    const token = `\${${name}}`;
    if (!out.includes(token) && out.trim() !== name) continue;
    out = out.trim() === name ? text : out.split(token).join(text);
  }
  return out === value ? out : expand(out, decls, depth - 1);
}

/**
 * Every host key record value in one file that names the person's own file.
 *
 * `productKnownHosts({ tortie, user })` is the ONE expression allowed to name
 * it, because it emits Tortie's file first by construction and there is no
 * argument order to get wrong. Anything else that reaches the person's file is a
 * finding, whether it puts it first or not, because a hand composed value is
 * exactly what the ordering rule cannot be checked through.
 */
export function personFirstFindings(name, source) {
  const code = stripComments(source);
  const decls = declarations(code);
  const hits = [];
  const seen = new Set();
  // The value runs to the end of the template or the line. It deliberately
  // reads PAST a quote, because the shape this rule exists to catch is the two
  // file form `UserKnownHostsFile="${a}" "${b}"`, and a pattern that stopped at
  // the first quote would read that value as empty and find nothing in it.
  const patterns = [
    /UserKnownHostsFile=([^`\n]*)/g,
    /\$\{\s*OPTION\s*\}=([^`\n]*)/g,
    /\bknownHosts\s*:\s*([^,\n}]+)/g,
    // The shorthand `sshRun({ knownHosts, ... })`, whose value is the name.
    /\bknownHosts\s*(,)/g
  ];
  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(code)) !== null) {
      const raw = m[1] === ',' ? 'knownHosts' : m[1];
      const value = expand(raw, decls);
      if (!HOME_TOKEN.test(value)) continue;
      if (/productKnownHosts\s*\(/.test(value)) continue;
      const key = `${String(lineAt(code, m.index))}:${raw.trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({
        file: name,
        line: lineAt(code, m.index),
        program: 'ssh',
        rule: 4,
        why:
          `the host key record value names the person's own file. It reads ` +
          `${raw.trim().slice(0, 50)} and resolves to ${value.trim().slice(0, 80)}. ` +
          'Only productKnownHosts({ tortie, user }) may name it, and it puts ' +
          "Tortie's own file first."
      });
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Rule 4, run rather than read
// ---------------------------------------------------------------------------

/**
 * The four claims the source cannot make, driven against the real helper with
 * made up paths. Nothing is spawned: every one of these throws or returns before
 * a program is reached.
 */
function helperBehaviour(failures) {
  const say = (what, detail) => failures.push({ what, detail });

  const both = productKnownHosts({ tortie: '/T/known-machines', user: '/U/known_hosts' });
  if (both !== '"/T/known-machines" "/U/known_hosts"') {
    say(
      "productKnownHosts does not put Tortie's own file first",
      `It answered ${JSON.stringify(both)}. That order is the whole point of it.`
    );
  }

  let refusedEmpty = false;
  try {
    productKnownHosts({ tortie: '', user: '/U/known_hosts' });
  } catch {
    refusedEmpty = true;
  }
  if (!refusedEmpty) {
    say(
      'productKnownHosts accepted an empty first file',
      "With an empty first value the person's file becomes the one ssh writes."
    );
  }

  const prepended = sshArgv({
    knownHosts: '/K/known-machines',
    argv: ['-o', 'StrictHostKeyChecking=no', '127.0.0.1'],
    caller: 'the gate'
  });
  if (prepended[0] !== '-o' || prepended[1] !== 'UserKnownHostsFile=/K/known-machines') {
    say(
      'sshArgv does not prepend the record file',
      `It composed ${JSON.stringify(prepended.slice(0, 2))}. ssh takes the ` +
        'FIRST value it is given for an option, so prepending is what makes ' +
        'the helper a guarantee rather than a convention.'
    );
  }

  let refusedConflict = false;
  try {
    sshArgv({
      knownHosts: '/K/ours',
      argv: ['-o', 'UserKnownHostsFile=/somewhere/else', 'h'],
      caller: 'the gate'
    });
  } catch {
    refusedConflict = true;
  }
  if (!refusedConflict) {
    say(
      'sshArgv accepted two different record files in one argv',
      'ssh takes the first, so one of the two would silently do nothing.'
    );
  }

  for (const [label, call] of [
    ['sshArgv', () => sshArgv({ argv: ['h'], caller: 'the gate' })],
    ['sshOptions', () => sshOptions({ caller: 'the gate' })],
    ['sshRun', () => sshRun({ argv: ['h'], caller: 'the gate' })]
  ]) {
    let threw = false;
    try {
      call();
    } catch {
      threw = true;
    }
    if (!threw) {
      say(
        `${label} ran without a record file`,
        'knownHosts is required and has no default. A caller that forgets it ' +
          'must be stopped before anything is spawned.'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// The fixtures
// ---------------------------------------------------------------------------

/** Every finding the scanner produces for one fixture, over all four rules. */
function scanAll(name, source) {
  const ctx = contextOf(source);
  return [
    ...sshSpawns(name, source, ctx),
    ...keygenKnownHostsSpawns(name, source, ctx),
    ...shellSshLines(name, source, ctx),
    ...personFirstFindings(name, source)
  ];
}

/**
 * Run the scanner over every case in build/known-hosts-fixtures.mjs, so a pass
 * says the scanner still separates the shapes. The directory is removed in a
 * `finally` block. Nothing is launched.
 *
 * The cases live in their own file because THIRTEEN of them walked past this
 * gate on the day it shipped, and the six it carried then were the whole
 * measure of its reach. A shape that is found to walk past it is added there in
 * the same commit as the fix, so the coverage cannot decay the way the reach
 * did.
 */
function runFixtures(failures) {
  const dir = mkdtempSync(join(tmpdir(), 'p193-gate-'));
  try {
    const report = [];
    for (const one of CASES) {
      const name = `fixture-${one.id.toLowerCase()}.mjs`;
      const path = join(dir, name);
      writeFileSync(path, one.text);
      const text = readFileSync(path, 'utf8');
      const findings =
        one.mustFail === 3
          ? helperShape(text).map((problem) => ({ rule: 3, why: problem }))
          : scanAll(name, text);
      report.push({ id: one.id, mustFail: one.mustFail, count: findings.length });

      if (one.mustFail === null) {
        if (findings.length !== 0) {
          failures.push({
            what: `the control fixture ${one.id} was reported as a finding`,
            detail:
              `It is ${one.name} and the scanner found ` +
              `${String(findings.length)} finding(s): ` +
              `${findings.map((f) => f.why).join('; ')}. A scanner that reports ` +
              'a false alarm makes every pass it prints worthless.'
          });
        }
        const use = usesHelper(text);
        if (one.id !== 'N1' && (!use.imported || !use.called)) {
          failures.push({
            what: `the control fixture ${one.id} was not seen to use the helper`,
            detail: `imported=${String(use.imported)} called=${String(use.called)}.`
          });
        }
        continue;
      }

      const matched = findings.filter((f) => String(f.rule) === String(one.mustFail));
      if (matched.length === 0) {
        failures.push({
          what: `the fixture ${one.id} was NOT caught`,
          detail:
            `It is ${one.name} and must break rule ${String(one.mustFail)}. The ` +
            `scanner found ${String(findings.length)} finding(s) and none of ` +
            'them on that rule. This gate cannot catch a real one either, so ' +
            'its own scanner is broken.'
        });
      }
    }
    return report;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/**
 * Every source file under build/ this gate reads, by path and by the name it is
 * reported under, which is relative to build/.
 *
 * IT WALKS, and the first version of this gate did not. `readdirSync(buildDir)`
 * reads one level, so a future `build/probes/foo.mjs` would have been invisible
 * to every rule in this file, and so would any `.js` or `.ts` placed beside the
 * scripts. Nothing is under build/ today except `fixtures`, which holds JSON,
 * and `vendor`, which is third party and is not ours to police. Costing nothing
 * today is exactly when a boundary is cheap to close.
 */
function sourceFiles(dir) {
  const found = [];
  const walk = (at, prefix) => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      if (entry.name === 'vendor' || entry.name === 'node_modules') continue;
      const path = join(at, entry.name);
      const name = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) walk(path, name);
      else if (/\.(mjs|cjs|js|mts|cts|ts|tsx|jsx)$/.test(entry.name)) found.push({ path, name });
    }
  };
  walk(dir, '');
  return found;
}

function main() {
  const failures = [];
  const files = sourceFiles(buildDir);

  // Rules 1, 1b, 1c and 4, forward over the real tree.
  let scanned = 0;
  for (const { path, name } of files) {
    const source = readFileSync(path, 'utf8');
    scanned += 1;
    const ctx = contextOf(source);
    const hits = [
      ...(EXEMPT.has(name) ? [] : sshSpawns(name, source, ctx)),
      ...keygenKnownHostsSpawns(name, source, ctx),
      ...(EXEMPT.has(name) ? [] : shellSshLines(name, source, ctx)),
      ...personFirstFindings(name, source)
    ];
    for (const hit of hits) {
      failures.push({
        what: `build/${hit.file}:${String(hit.line)} breaks rule ${String(hit.rule)}`,
        detail:
          `${hit.why}. Everything that runs ${hit.program} under build/ goes ` +
          `through build/${HELPER}, which cannot run without a host key record ` +
          "file, so a caller that forgets one is stopped rather than writing in " +
          "the person's ~/.ssh/known_hosts."
      });
    }
  }

  // Rule 2, reverse.
  for (const name of HELPER_USERS) {
    let source;
    try {
      source = readFileSync(join(buildDir, name), 'utf8');
    } catch {
      failures.push({
        what: `build/${name} is on the recorded list and is not on disk`,
        detail:
          'Either it was deleted and HELPER_USERS in this file went stale, or ' +
          'it was renamed. Edit the list on purpose rather than deleting the ' +
          'row to make this gate green.'
      });
      continue;
    }
    const use = usesHelper(source);
    if (!use.imported || !use.called) {
      failures.push({
        what: `build/${name} no longer reaches the helper`,
        detail:
          `It imports ./${HELPER}: ${String(use.imported)}. It calls one of its ` +
          `routed functions: ${String(use.called)}. Both must be true. Without ` +
          'this direction the gate goes on passing while checking nothing.'
      });
    }
  }

  // Rule 3, the helper's own shape.
  const helperSource = readFileSync(join(buildDir, HELPER), 'utf8');
  for (const problem of helperShape(helperSource)) {
    failures.push({
      what: `build/${HELPER} does not hold the guarantee`,
      detail: problem
    });
  }

  // Rule 4, run rather than read.
  helperBehaviour(failures);

  // Rule 6, the fixtures.
  const fixtures = runFixtures(failures);

  if (failures.length > 0) {
    console.error(
      "[known-hosts] a run of this harness could write in the person's " +
        '~/.ssh/known_hosts.'
    );
    for (const { what, detail } of failures) {
      console.error(`  ${what}`);
      console.error(`    ${detail}`);
    }
    process.exit(1);
  }

  const mustFail = fixtures.filter((one) => one.mustFail !== null).length;
  console.log(
    `[known-hosts] ${String(scanned)} files under build/ were read, walked ` +
      `rather than listed and with vendor left out. None outside ` +
      `build/${HELPER} hands ssh, scp, sftp or ssh-keyscan to a spawn or to a ` +
      `local wrapper of one, hands ssh-keygen its -R or -F, or puts one on a ` +
      `command line a shell is given, whether after a -c option, through exec ` +
      `or execSync, or under shell: true. A name assembled at RUN time is not ` +
      `read; see this file's header. ${String(HELPER_USERS.length)} scripts ` +
      `reach build/${HELPER}, which emits -o UserKnownHostsFile= from one ` +
      `place, refuses an empty value, gives knownHosts no default, prepends it ` +
      `so nothing later can win, and puts Tortie's own file first. ` +
      `${String(fixtures.length)} fixtures, ${String(mustFail)} of which must ` +
      `fail, and every one of them did.`
  );
}

main();
