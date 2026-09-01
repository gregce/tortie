#!/usr/bin/env node
/**
 * assert-known-hosts-scoped.mjs. No run of this harness can put a line in the
 * person's ~/.ssh/known_hosts (Phase 193).
 *
 * IT SPAWNS NOTHING. IT STARTS NO ssh AND NO sshd. IT OPENS NO SOCKET. IT READS
 * NOTHING UNDER THE PERSON'S HOME. It reads the files under build/, imports
 * build/ssh-run.mjs and calls four of its functions with made up paths, writes
 * six fixtures into a scratch directory it removes in a `finally` block, and
 * exits. Measured on 2026-09-01 over three runs: 0.50, 0.55 and 0.54 seconds
 * wall, against 0.17 for build/assert-electron-teardown.mjs and a 0.02 second
 * floor for starting node at all. It is slower than that sibling because it
 * runs four scanners over the 181 files rather than one.
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
 *      ssh-keyscan to a spawn. Programs are recognised three ways, because all
 *      three are how this tree is written: a literal path, an identifier whose
 *      declaration in the same file is such a literal, and a property that was
 *      assigned one. Before Phase 193, four of the five real client scripts said
 *      `const sshBin = '/usr/bin/ssh';` at their line 160 or so and `sh(sshBin,
 *      ...)` three hundred lines later. A scanner reading only quoted literals in
 *      spawn position finds none of them. The first draft of this one did not,
 *      which is how the rule came to be written this way.
 *
 *      1b. No spawn hands `ssh-keygen` its `-R` or `-F` flag. Those two read and
 *      WRITE a known_hosts file and default to the person's own, so they are the
 *      one way a program outside the four could reach it. They are refused
 *      outright rather than routed, because nothing in this tree needs them.
 *
 *      1c. No file hands a shell a command line that names one of the four. That
 *      is not hypothetical: `build/capture-machine-goldens.mjs` read its client
 *      version with `/bin/sh -c "${sshBin} -V 2>&1"`, which puts an ssh where no
 *      scanner reading spawn positions would ever look. `sshVersion` in the
 *      helper is where that lives now.
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
 *   6. THE FIXTURES. The scanner is run over six files this script writes
 *      itself, five of which MUST make it fail. If any of those five passes, the
 *      gate exits non-zero saying its own scanner is broken, because a gate that
 *      cannot fail is not a gate.
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

import { callArguments, lineAt, stripComments } from './scan-source.mjs';
import { productKnownHosts, sshArgv, sshOptions, sshRun } from './ssh-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(repoRoot, 'build');
const HELPER = 'ssh-run.mjs';

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
 * The call names that start a program in this tree. `sh` and `run` are on it
 * because that is what almost every probe calls its own spawnSync wrapper, and a
 * set holding only the node built-ins would read past `sh(sshBin, argv)` in five
 * files. The cost is a false alarm if some unrelated `sh()` is ever handed an
 * ssh path as its first argument, and that has never happened here.
 */
const SPAWN_CALLS = ['spawn', 'spawnSync', 'execFile', 'execFileSync', 'exec', 'sh', 'run'];

/** The shells a command line can be handed to. */
const SHELLS = ['sh', 'bash', 'zsh', 'dash'];

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

// ---------------------------------------------------------------------------
// Rule 1. Which calls start an ssh
// ---------------------------------------------------------------------------

/** The basename of a path, or the whole string when it holds no slash. */
const baseOf = (value) => value.split('/').pop() ?? '';

/** The program a string literal names, or null when it is not one of ours. */
function literalProgram(text) {
  const m = /^\s*(['"])([^'"`\n]*)\1\s*$/.exec(text ?? '');
  if (m === null) return null;
  return SSH_PROGRAMS.includes(baseOf(m[2])) ? m[2] : null;
}

/** The program a string literal names when it is ssh-keygen, or null. */
function keygenLiteral(text) {
  const m = /^\s*(['"])([^'"`\n]*)\1\s*$/.exec(text ?? '');
  if (m === null) return null;
  return baseOf(m[2]) === 'ssh-keygen' ? m[2] : null;
}

/**
 * The identifiers and the property names in one file that were given an ssh
 * family path, and what path each was given.
 *
 * Both halves are needed. `const sshBin = '/usr/bin/ssh';` then `sh(sshBin, ...)`
 * is four of the five real client scripts, and `machine.sshBin` assigned in an
 * object literal then `sh(machine.sshBin, ...)` was build/real-machine.mjs.
 */
function sshNames(code) {
  const names = new Map();
  const keygens = new Map();
  const decl = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*)[;\n]/g;
  let m;
  while ((m = decl.exec(code)) !== null) {
    const program = literalProgram(m[2].trim());
    if (program !== null) names.set(m[1], program);
    const keygen = keygenLiteral(m[2].trim());
    if (keygen !== null) keygens.set(m[1], keygen);
  }
  const prop = /([A-Za-z_$][\w$]*)\s*:\s*(['"][^'"`\n]*['"])/g;
  while ((m = prop.exec(code)) !== null) {
    const program = literalProgram(m[2]);
    if (program !== null) names.set(m[1], program);
    const keygen = keygenLiteral(m[2]);
    if (keygen !== null) keygens.set(m[1], keygen);
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

/** Every spawn in one file whose program is an ssh family program (rule 1). */
export function sshSpawns(name, source) {
  const code = stripComments(source);
  const { names } = sshNames(code);
  const hits = [];
  const call = new RegExp(
    `(?:\\b[A-Za-z_$][\\w$]*\\s*\\.\\s*)?\\b(${SPAWN_CALLS.join('|')})\\s*\\(`,
    'g'
  );
  let m;
  while ((m = call.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    const args = callArguments(code, open);
    const program = programOf(args[0], names);
    if (program === null) continue;
    hits.push({
      file: name,
      line: lineAt(code, m.index),
      program,
      rule: 1,
      why: `${m[1]}(${(args[0] ?? '').split('\n')[0].trim()}, ...) starts ${program} itself`
    });
  }
  return hits;
}

/** Every spawn in one file that hands ssh-keygen a known_hosts flag (rule 1b). */
export function keygenKnownHostsSpawns(name, source) {
  const code = stripComments(source);
  const { keygens } = sshNames(code);
  const hits = [];
  const call = new RegExp(
    `(?:\\b[A-Za-z_$][\\w$]*\\s*\\.\\s*)?\\b(${SPAWN_CALLS.join('|')})\\s*\\(`,
    'g'
  );
  let m;
  while ((m = call.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    const args = callArguments(code, open);
    const first = (args[0] ?? '').trim();
    const isKeygen = keygenLiteral(first) !== null || keygens.has(first);
    if (!isKeygen) continue;
    const flag = KEYGEN_KNOWN_HOSTS_FLAGS.find((one) =>
      new RegExp(`(['"])${one}\\1`).test(args[1] ?? '')
    );
    if (flag === undefined) continue;
    hits.push({
      file: name,
      line: lineAt(code, m.index),
      program: 'ssh-keygen',
      rule: '1b',
      why:
        `${m[1]}(ssh-keygen, [... ${flag} ...]) reads and WRITES a known_hosts ` +
        "file, and with no file named it is the person's own"
    });
  }
  return hits;
}

/** Every shell command line in one file that names an ssh family program (rule 1c). */
export function shellSshLines(name, source) {
  const code = stripComments(source);
  const { names } = sshNames(code);
  const hits = [];
  // The argument right after a '-c' in an argv, which is the command line.
  const dashC = /(['"])-c\1\s*,\s*(`[^`]*`|'[^'\n]*'|"[^"\n]*")/g;
  const words = new RegExp(
    `\\b(${SSH_PROGRAMS.join('|')})\\b|\\$\\{\\s*(${[...names.keys()].join('|') || '\\u0000'})\\s*\\}`
  );
  let m;
  while ((m = dashC.exec(code)) !== null) {
    const line = m[2];
    if (!words.test(line)) continue;
    hits.push({
      file: name,
      line: lineAt(code, m.index),
      program: 'a shell',
      rule: '1c',
      why:
        `a command line handed to a shell names an ssh family program: ` +
        `${line.split('\n')[0].slice(0, 70)}`
    });
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

/**
 * The words that would make this file fail its own rule 1 are assembled at
 * write time, so the bytes on disk are what a real script looks like while this
 * file's own source names no ssh program in a spawn position.
 */
function fixture(text) {
  return text
    .replace(/LAUNCH/g, 'spawn' + 'Sync')
    .replace(/CLIENT/g, '/usr/bin/' + 'ssh')
    .replace(/OPTIONNAME/g, 'UserKnownHosts' + 'File')
    .replace(/HOMECALL/g, 'homedir' + '()')
    .replace(/DOTSSH/g, '.s' + 'sh/known_hosts');
}

/** A. A direct spawn of the client. MUST FAIL rule 1. */
const FIXTURE_A = fixture(`
import { LAUNCH } from 'node:child_process';
const out = LAUNCH('CLIENT', ['127.0.0.1', 'true'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`);

/**
 * B. The same launch behind a variable declared three hundred lines earlier,
 * which is how four of the five real client scripts were written before Phase
 * 193. Without this fixture the gate would read past every one of them.
 * MUST FAIL rule 1.
 */
const FIXTURE_B = fixture(`
import { LAUNCH } from 'node:child_process';
const sshBin = 'CLIENT';
function sh(file, args) {
  return LAUNCH(file, args, { encoding: 'utf8' });
}
${'// a long way down the file\n'.repeat(40)}
const out = sh(sshBin, ['-o', 'BatchMode=yes', '127.0.0.1', 'true']);
process.exit(out.status ?? 1);
`);

/** C. A helper copy whose composed argv omits the option. MUST FAIL rule 3. */
const FIXTURE_C = `
const OPTION = 'OPTIONNAME';
export function sshOptions({ strict = 'yes' }) {
  return ['-o', 'BatchMode=yes', '-o', \`StrictHostKeyChecking=\${strict}\`];
}
`.replace(/OPTIONNAME/g, 'UserKnownHosts' + 'File');

/**
 * D. A helper copy naming the person's file FIRST in the two file form. This is
 * the original defect written down as a test. MUST FAIL rule 4.
 */
const FIXTURE_D = fixture(`
import { homedir } from 'node:os';
const OPTION = 'OPTIONNAME';
export function sshOptions({ tortieRecord }) {
  return ['-o', \`\${OPTION}="\${HOMECALL}/DOTSSH" "\${tortieRecord}"\`];
}
`);

/** E. A compliant script. MUST PASS every rule. */
const FIXTURE_E = `
import { scratchKnownHosts, sshRun } from './ssh-run.mjs';
const record = scratchKnownHosts('/tmp/fixture-e');
const out = sshRun({
  knownHosts: record,
  caller: 'fixture-e.mjs',
  argv: ['-o', 'BatchMode=yes', '127.0.0.1', 'true']
});
process.exit(out.status ?? 1);
`;

/**
 * F. The client on a command line handed to a shell, which is the shape
 * build/capture-machine-goldens.mjs used to read its version with. MUST FAIL
 * rule 1c.
 */
const FIXTURE_F = fixture(`
import { LAUNCH } from 'node:child_process';
const out = LAUNCH('/bin/sh', ['-c', \`ssh -V 2>&1\`], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`);

/** Every finding the scanner produces for one fixture, over all four rules. */
function scanAll(name, source) {
  return [
    ...sshSpawns(name, source),
    ...keygenKnownHostsSpawns(name, source),
    ...shellSshLines(name, source),
    ...personFirstFindings(name, source)
  ];
}

/**
 * Run the scanner over six files this script writes, so a pass says the scanner
 * still separates the shapes. The directory is removed in a `finally` block.
 * Nothing is launched.
 */
function runFixtures(failures) {
  const dir = mkdtempSync(join(tmpdir(), 'p193-gate-'));
  try {
    const cases = [
      { name: 'fixture-a.mjs', text: FIXTURE_A, mustFail: 1, why: 'a direct spawn of the client' },
      { name: 'fixture-b.mjs', text: FIXTURE_B, mustFail: 1, why: 'the client behind a variable' },
      { name: 'fixture-c.mjs', text: FIXTURE_C, mustFail: 3, why: 'a helper that omits the option' },
      { name: 'fixture-d.mjs', text: FIXTURE_D, mustFail: 4, why: "the person's file named first" },
      { name: 'fixture-e.mjs', text: FIXTURE_E, mustFail: null, why: 'a compliant script' },
      { name: 'fixture-f.mjs', text: FIXTURE_F, mustFail: '1c', why: 'the client on a shell line' }
    ];
    const report = [];
    for (const one of cases) {
      const path = join(dir, one.name);
      writeFileSync(path, one.text);
      const text = readFileSync(path, 'utf8');
      const findings =
        one.mustFail === 3 ? helperShape(text).map((p) => ({ rule: 3, why: p })) : scanAll(one.name, text);
      const use = usesHelper(text);
      report.push({ name: one.name, count: findings.length, rules: findings.map((f) => f.rule) });

      if (one.mustFail === null) {
        if (findings.length !== 0) {
          failures.push({
            what: `the compliant fixture ${one.name} was reported as a finding`,
            detail:
              `It is ${one.why} and the scanner found ${String(findings.length)} ` +
              `finding(s): ${findings.map((f) => f.why).join('; ')}. A scanner ` +
              'that reports a false alarm makes every pass it prints worthless.'
          });
        }
        if (!use.imported || !use.called) {
          failures.push({
            what: `the compliant fixture ${one.name} was not seen to use the helper`,
            detail: `imported=${String(use.imported)} called=${String(use.called)}.`
          });
        }
        continue;
      }

      const matched = findings.filter((f) => String(f.rule) === String(one.mustFail));
      if (matched.length === 0) {
        failures.push({
          what: `the fixture ${one.name} was NOT caught`,
          detail:
            `It is ${one.why} and must break rule ${String(one.mustFail)}. The ` +
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

function main() {
  const failures = [];
  const files = readdirSync(buildDir).filter(
    (n) => n.endsWith('.mjs') || n.endsWith('.cjs') || n.endsWith('.mts')
  );

  // Rules 1, 1b, 1c and 4, forward over the real tree.
  let scanned = 0;
  for (const name of files) {
    const source = readFileSync(join(buildDir, name), 'utf8');
    scanned += 1;
    const hits = [
      ...(EXEMPT.has(name) ? [] : sshSpawns(name, source)),
      ...keygenKnownHostsSpawns(name, source),
      ...(EXEMPT.has(name) ? [] : shellSshLines(name, source)),
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

  console.log(
    `[known-hosts] ${String(scanned)} files under build/ were read and none ` +
      `starts ssh, scp, sftp or ssh-keyscan itself, hands ssh-keygen a ` +
      `known_hosts flag, or names one on a shell line. ` +
      `${String(HELPER_USERS.length)} reach build/${HELPER}, which emits ` +
      `-o UserKnownHostsFile= from one place, refuses an empty value, gives ` +
      `knownHosts no default, prepends it so nothing later can win, and puts ` +
      `Tortie's own file first. Fixtures: ` +
      fixtures.map((f) => `${f.name} ${String(f.count)}`).join(', ') +
      '.'
  );
}

main();
