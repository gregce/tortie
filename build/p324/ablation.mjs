#!/usr/bin/env node
/**
 * `npm run ablation:p324`. THE ATTACK ON CONDITION 100 (Phase 324, SPEC.md §5).
 *
 * About a minute and a half: thirty runs of `node build/conformance-machines.mjs`,
 * one control and twenty-nine arms, at about 3 to 11 s each (fifteen arms
 * took 48 s to 84 s whole, measured in clones on 2026-09-29 while other work
 * ran; the fix round of 2026-09-30 added arms 16 to 25, and the ruled round of
 * the same day arms 26 to 29). It launches no
 * Electron, starts no tmux server, runs no ssh, spawns no agent and makes no
 * request. It starts no process but `node`, and waits for each one to end.
 *
 * ## What it proves
 *
 * `conformance:machines` condition 100 pins the thing that makes admitting a
 * 3.6-family server safe: `remoteControlTransport`'s precheck is the first
 * thing `TmuxControlClient.start()` awaits, it is the version read through the
 * same program the control child runs, it is refused by the control gate and
 * never caught, it is that read and that refusal and nothing else, the
 * transport keeps no state between calls, one composer builds the far child,
 * the 3.6 and 3.6b rows name the pin's own tarball and no distribution, and
 * the one surface that draws the list draws nothing beside it. Each clause is read out of
 * the SHIPPING source at its real path, so there is no copy to break. This
 * script breaks the real file one clause at a time, runs the gate, and asks
 * whether the clause that OWNS the edit is the one that went red. A red on some
 * other condition alone is red for the wrong reason, and fails the arm: an
 * ablation that moves a different rule has proved something else.
 *
 * ## The safety, stated because this script edits the working tree
 *
 *   - Every target file's bytes are read ONCE, before anything is written, and
 *     held in memory. After every arm the file is written back and compared by
 *     sha256 with those bytes, and a mismatch stops the run. A `finally`, an
 *     `exit` handler and SIGINT, SIGTERM and SIGHUP write back whatever an arm
 *     left and compare every file again.
 *   - THREE BUILDERS SHARE ONE WORKTREE, so one guard more than
 *     `ablation:p274` has: before an arm is written, the file on disk must still
 *     be the bytes read at the start, and after it the file must still be the
 *     bytes the arm wrote. If either is not so, somebody else has edited the
 *     file while this ran, the run stops, and NOTHING is written over their
 *     work; the file is named and the exit is 2. The guard is not a lock: a
 *     save that lands between the read on the line before a write and that
 *     write is lost, and that window is one read and one write wide, which is
 *     why it runs in a clone while anybody else is editing.
 *   - It asks git nothing. A phase build's tree is dirty by definition, so the
 *     right target is "what was here when this started", which is the map.
 *   - While the builders are still editing, run it only in an APFS clone of the
 *     worktree (`cp -Rc`, then `node <clone>/build/p324/ablation.mjs`): it runs
 *     the gate with `cwd` at ITS OWN repository root, so a clone breaks and
 *     restores only the clone.
 *
 * THE CONDITION NUMBER IS WRITTEN ONCE, in the gate, as `P324_CONDITION`, and
 * this script reads it from there. Phases 320.1 and 327 also append conditions
 * to `build/conformance-machines.mjs`; whoever lands second moves that one
 * constant to the next free number, and every owner tag here follows it.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[ablation:p324]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// THE NUMBER IS READ FROM THE GATE, not written a second time here, so moving
// the gate's one constant moves every owner tag below with it. A gate that no
// longer carries the constant is a gate this attack cannot name, and it stops.
const GATE = 'build/conformance-machines.mjs';
const CONDITION = (() => {
  let text = '';
  try {
    text = readFileSync(join(repoRoot, GATE), 'utf8');
  } catch (err) {
    console.error(`${TAG} ${GATE} could not be read: ${String(err)}`);
    process.exit(2);
  }
  const found = [...text.matchAll(/\bconst P324_CONDITION = (\d+);/g)];
  if (found.length !== 1) {
    console.error(
      `${TAG} ${GATE} declares "const P324_CONDITION = <n>;" ${String(found.length)} times ` +
        'rather than once, so the clause that owns each arm cannot be named.'
    );
    process.exit(2);
  }
  return Number(found[0][1]);
})();
const owner = (clause) => `${CONDITION}${clause}`;
const say = (line) => console.log(`${TAG} ${line}`);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

const CLIENT = 'src/main/tmux/control-client.ts';
const PLANE = 'src/main/machines/control-plane.ts';
const VERSION = 'src/main/tmux/version.ts';
const ADD_MACHINE = 'src/renderer/settings/AddMachine.tsx';
const MACHINES_COPY = 'src/renderer/settings/machines-copy.ts';

// The precheck as it stands, used by the arms that must hit IT and not the
// same argv in openControlPlane (which is followed by a plain assignment, not
// by the refusal).
const PRECHECK_READ =
  "      const printed = await execOn(ctx, ['display-message', '-p', '#{version}'], {\n" +
  '        timeoutMs: CONTROL_PRECHECK_TIMEOUT_MS\n' +
  '      });\n' +
  '      assertControlDialectMeasured(machineId, parseTmuxVersion(printed));\n';

// The precheck's first two lines and its refusal, for the fix round's arms.
const PRECHECK_HEAD_OPEN = '    async precheck(): Promise<void> {\n';
const PRECHECK_HEAD_CTX = '      const ctx = remoteContextFor(machineId);\n';
const PRECHECK_HEAD = `${PRECHECK_HEAD_OPEN}${PRECHECK_HEAD_CTX}`;
const PRECHECK_ASSERT = '      assertControlDialectMeasured(machineId, parseTmuxVersion(printed));\n';

const SPAWN_STATEMENT =
  '      const plan = await this.transport.plan();\n' +
  '      const child = spawn(plan.file, [...plan.argv], {\n' +
  "        stdio: ['pipe', 'pipe', 'pipe'],\n" +
  '        env: this.transport.env()\n' +
  '      });\n';

/**
 * The fifteen arms of SPEC.md §5, in its order, then the fix round's ten,
 * then the ruled round's four.
 * `find` must occur EXACTLY ONCE in the file, or the arm is not applied and
 * fails: an ablation that cannot be placed proves nothing, and a clause that
 * moved needs its arm moved with it. `edits` applies several such finds in
 * order, each exactly once in the text the ones before it left. `append` adds
 * a line at the end of the file instead. `expect`, where given, is a piece of
 * the sentence the owning clause must print, so the arm proves the clause it
 * was written for rather than a sibling of it.
 */
const ARMS = [
  {
    n: 1,
    clause: 'a',
    file: CLIENT,
    name: 'the precheck moves after the spawn',
    find: `      await this.transport.precheck();\n${SPAWN_STATEMENT}`,
    to: `${SPAWN_STATEMENT}      await this.transport.precheck();\n`
  },
  {
    n: 2,
    clause: 'a',
    file: CLIENT,
    name: 'the precheck is deleted',
    find: '      await this.transport.precheck();\n',
    to: ''
  },
  {
    n: 3,
    clause: 'b',
    file: PLANE,
    name: "the precheck reads -V rather than the server's #{version}",
    find: PRECHECK_READ,
    to: PRECHECK_READ.replace("['display-message', '-p', '#{version}']", "['-V']")
  },
  {
    n: 4,
    clause: 'b',
    file: PLANE,
    name: 'the precheck runs through the login shell rather than the program the child runs',
    find: PRECHECK_READ,
    to: PRECHECK_READ.replace(
      "await execOn(ctx, ['display-message', '-p', '#{version}'], {",
      'await execRemoteShell(ctx, "display-message -p \'#{version}\'", {'
    )
  },
  {
    n: 5,
    clause: 'b',
    file: PLANE,
    name: 'the version is read and the control gate is never asked',
    find: '      assertControlDialectMeasured(machineId, parseTmuxVersion(printed));\n',
    to: '      void parseTmuxVersion(printed);\n'
  },
  {
    n: 6,
    clause: 'b',
    file: PLANE,
    name: "the precheck's refusal is caught, so the child is spawned anyway",
    find: PRECHECK_READ,
    to: `      try {\n${PRECHECK_READ}      } catch { /* p324 */ }\n`
  },
  {
    n: 7,
    clause: 'c',
    file: PLANE,
    name: 'a second composer for the far control child',
    append:
      'export function p324SecondPlan(machineId: string): SpawnPlan { return tmuxCommand(remoteContextFor(machineId), CONTROL_ATTACH_ARGS); }'
  },
  {
    n: 8,
    clause: 'd',
    file: VERSION,
    name: 'the 3.6b row stops claiming the live connection was measured',
    find: "    version: '3.6b',\n    measured: { exec: true, control: true },\n",
    to: "    version: '3.6b',\n    measured: { exec: true, control: false },\n"
  },
  {
    n: 9,
    clause: 'd',
    file: VERSION,
    name: "the 3.6 subject's sha256 is one digit off the pin",
    find: "'sha256 136db80cfbfba617a103401f52874e7c64927986b65b1b700350b6058ad69607, ' +",
    to: "'sha256 136db80cfbfba617a103401f52874e7c64927986b65b1b700350b6058ad69608, ' +"
  },
  {
    n: 10,
    clause: 'e',
    file: VERSION,
    name: 'the 3.6 note names a distribution',
    find: "      'Built here by \"node build/build-tmux-version.mjs 3.6\" and reached by ' +",
    to: "      'Built here for Ubuntu 26.04 by \"node build/build-tmux-version.mjs 3.6\" and reached by ' +"
  },
  {
    n: 11,
    clause: 'a',
    file: CLIENT,
    name: 'a reconnect spawns the child itself rather than going back through start()',
    find: '      this.start().catch(() => undefined);\n',
    to: '      void this.transport.plan().then((p) => spawn(p.file, [...p.argv]));\n'
  },
  {
    n: 12,
    clause: 'b',
    file: PLANE,
    name: "the plan resolves the machine without the precheck's own resolver",
    find: 'tmuxCommand(remoteContextFor(machineId), CONTROL_ATTACH_ARGS)',
    to: 'tmuxCommand(machineContext(machineId), CONTROL_ATTACH_ARGS)'
  },
  {
    n: 13,
    clause: 'b',
    file: PLANE,
    name: 'a second remote client over a transport with no read',
    append:
      "export const p324Stray = (): TmuxControlClient => new TmuxControlClient({ machineId: 'p324', precheck: () => Promise.resolve(), plan: () => Promise.resolve({ file: '/usr/bin/true', argv: [] }), env: () => process.env });"
  },
  {
    n: 14,
    clause: 'e',
    file: VERSION,
    name: 'a comment in the table names a distribution',
    find: "  {\n    version: '3.6b',\n",
    to: "  // measured for Debian's backport\n  {\n    version: '3.6b',\n"
  },
  {
    n: 15,
    clause: 'd',
    file: VERSION,
    name: "the 3.6 subject names another version's tarball",
    find: "'https://github.com/tmux/tmux/releases/download/3.6/tmux-3.6.tar.gz, ' +",
    to: "'https://github.com/tmux/tmux/releases/download/3.6a/tmux-3.6a.tar.gz, ' +"
  },
  // THE FIX ROUND'S ARMS (2026-09-30). Phase 324's attack verifier wrote the
  // shapes of 16, 17, 20, 21 and 24 as its own mutations; each passed this
  // gate (16 passed probe:p324 too), and 16 and 17, driven over real ssh
  // through a program downgraded in place, ended a 3.6 server and every
  // session in it. 18 and 19 were caught only by unit tests, and 22, 23 and 25
  // are the siblings of those holes. Every one of the ten was GREEN against
  // the gate as the builders left it. Each names the sentence of the clause
  // that must fire (`expect`), so a red on the right clause for another of its
  // reasons does not count.
  {
    n: 16,
    clause: 'b',
    file: PLANE,
    name: 'the transport reads the version once per client and skips it on every reconnect',
    expect: "the precheck's body is",
    edits: [
      {
        find: 'export function remoteControlTransport(machineId: string): ControlTransport {\n  return {\n',
        to:
          'export function remoteControlTransport(machineId: string): ControlTransport {\n' +
          "  // The version cannot change under one client's reconnect loop, so it is read once per client.\n" +
          '  let verified = false;\n' +
          '  return {\n'
      },
      { find: PRECHECK_HEAD, to: `${PRECHECK_HEAD_OPEN}      if (verified) return;\n${PRECHECK_HEAD_CTX}` },
      { find: PRECHECK_ASSERT, to: `${PRECHECK_ASSERT}      verified = true;\n` }
    ]
  },
  {
    n: 17,
    clause: 'b',
    file: PLANE,
    name: 'the version read is cached per machine and connection generation, cleared with the rest of the per-run state',
    expect: "the precheck's body is",
    edits: [
      { find: "const machinesLog = getLog('config');\n", to: "const machinesLog = getLog('config');\nconst prechecked = new Set<string>();\n" },
      {
        find: PRECHECK_HEAD,
        to:
          PRECHECK_HEAD_OPEN +
          '      const seen = `${machineId}:${String(machineGeneration(machineId).generation)}`;\n' +
          '      if (prechecked.has(seen)) return;\n' +
          PRECHECK_HEAD_CTX
      },
      {
        find: PRECHECK_ASSERT,
        to: `${PRECHECK_ASSERT}      prechecked.add(\`\${machineId}:\${String(machineGeneration(machineId).generation)}\`);\n`
      },
      { find: '  noControlThisRun.clear();\n  sink = null;\n}', to: '  noControlThisRun.clear();\n  prechecked.clear();\n  sink = null;\n}' }
    ]
  },
  {
    n: 18,
    clause: 'b',
    file: PLANE,
    name: 'a return stands between the read and the refusal',
    expect: "the precheck's body is",
    find: PRECHECK_ASSERT,
    to: `      if (printed.trim() !== '') return;\n${PRECHECK_ASSERT}`
  },
  {
    n: 19,
    clause: 'b',
    file: PLANE,
    name: 'the refusal is thrown in a detached .then, so the precheck resolves first',
    expect: "the precheck's body is",
    find: PRECHECK_ASSERT,
    to: '      void Promise.resolve().then(() => assertControlDialectMeasured(machineId, parseTmuxVersion(printed)));\n'
  },
  {
    n: 20,
    clause: 'e',
    file: VERSION,
    name: "the 3.6 subject names a distribution's package version",
    expect: 'says "ubuntu"',
    find: "      'the upstream tarball at ' +\n      'https://github.com/tmux/tmux/releases/download/3.6/tmux-3.6.tar.gz, ' +",
    to: "      'the upstream tarball at (the source of the 3.6a-2ubuntu0.1 package) ' +\n      'https://github.com/tmux/tmux/releases/download/3.6/tmux-3.6.tar.gz, ' +"
  },
  {
    n: 21,
    clause: 'e',
    file: VERSION,
    name: "the 3.6b note names a backport's package version",
    expect: 'says "~bpo1"',
    find: "      'Built here by \"node build/build-tmux-version.mjs 3.6b\" and reached by ' +",
    to: "      'Built here, as 3.6b-1~bpo13+1 installs it, by \"node build/build-tmux-version.mjs 3.6b\" and reached by ' +"
  },
  {
    n: 22,
    clause: 'a',
    file: CLIENT,
    name: 'the constructor wraps the transport in one that answers the precheck once per client',
    expect: 'constructor',
    find: '    private readonly transport: ControlTransport = localControlTransport()\n  ) {\n    super();\n',
    to:
      '    transport: ControlTransport = localControlTransport()\n  ) {\n    super();\n' +
      '    let read = false;\n' +
      '    this.transport = { ...transport, precheck: async (): Promise<void> => { if (read) return; await transport.precheck(); read = true; } };\n'
  },
  {
    n: 23,
    clause: 'b',
    file: PLANE,
    name: 'the transport holds state of its own between calls',
    expect: "remoteControlTransport's body is",
    find: 'export function remoteControlTransport(machineId: string): ControlTransport {\n  return {\n',
    to: 'export function remoteControlTransport(machineId: string): ControlTransport {\n  const reads = { count: 0 };\n  void reads;\n  return {\n'
  },
  {
    n: 24,
    clause: 'e',
    file: ADD_MACHINE,
    name: 'the Add Machine sheet draws a distribution label beside the measured versions',
    expect: 'measured-versions line draws',
    find: "              {MEASURED_VERSIONS.join(', ')}\n",
    to: "              {MEASURED_VERSIONS.join(', ')} (3.6 is Ubuntu 26.04 LTS, 3.6b is Debian 13 backports)\n"
  },
  {
    n: 25,
    clause: 'e',
    file: MACHINES_COPY,
    name: 'the label above the measured versions names a distribution',
    expect: "machines-copy.ts's PREPARE_SUPPORTED_LABEL says",
    find: "export const PREPARE_SUPPORTED_LABEL = 'Versions Tortie has measured:';",
    to: "export const PREPARE_SUPPORTED_LABEL = 'Versions Tortie has measured, as Debian and Ubuntu ship them:';"
  },
  // THE RULED ROUND'S ARMS (2026-09-30). The second reverify wrote each of
  // these as its own mutation and every one passed the gate the fix round
  // left: a write through a member of the handed transport, and a label made
  // of a release number, a vendor or the verb a label is built on rather than
  // a distribution's name. Each was GREEN against that gate, measured in a
  // clone before 100a and 100e were widened.
  {
    n: 26,
    clause: 'a',
    file: CLIENT,
    name: "start() replaces the handed transport's precheck in place, so it reads nothing",
    expect: 'assigns this.transport or one of its members',
    find: '    this.starting = true;\n    this.stopped = false;\n    try {\n      await this.transport.precheck();\n',
    to:
      '    this.starting = true;\n    this.stopped = false;\n' +
      '    this.transport.precheck = () => Promise.resolve();\n' +
      '    try {\n      await this.transport.precheck();\n'
  },
  {
    n: 27,
    clause: 'e',
    file: VERSION,
    name: "a comment in the table names a distribution's release",
    expect: 'says "26.04"',
    find: "  {\n    version: '3.6',\n",
    to: "  // the 26.04 LTS build\n  {\n    version: '3.6',\n"
  },
  {
    n: 28,
    clause: 'e',
    file: VERSION,
    name: 'the 3.6b subject names a vendor',
    expect: 'says "RHEL"',
    find: "      'built by \"node build/build-tmux-version.mjs 3.6b\" on this Mac with ' +",
    to: "      'built by \"node build/build-tmux-version.mjs 3.6b\" on this Mac, the copy RHEL 10 carries, with ' +"
  },
  {
    n: 29,
    clause: 'e',
    file: VERSION,
    name: 'the 3.6b note says what a distribution ships without naming one',
    expect: 'says "ships"',
    find: "      'Built here by \"node build/build-tmux-version.mjs 3.6b\" and reached by ' +",
    to: "      'Built here, as a distribution ships it, by \"node build/build-tmux-version.mjs 3.6b\" and reached by ' +"
  }
];

const occurrences = (text, needle) => {
  let count = 0;
  for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + 1)) count += 1;
  return count;
};

// ---------------------------------------------------------------------------
// The bytes, read once
// ---------------------------------------------------------------------------

const targets = [...new Set(ARMS.map((arm) => arm.file))];
const originals = new Map();
for (const rel of targets) {
  try {
    originals.set(rel, readFileSync(join(repoRoot, rel)));
  } catch (err) {
    console.error(`${TAG} ${rel} could not be read: ${String(err)}`);
    process.exit(2);
  }
}
/** What an arm last wrote to a file and has not yet taken back, or undefined. */
const written = new Map();
/** Files somebody else edited while this ran. Nothing is ever written over them. */
const foreign = new Set();

/**
 * Put back whatever an arm left, but ONLY over the bytes that arm wrote. A file
 * whose bytes are neither the arm's nor the original's was edited by somebody
 * else in the meantime, and is named rather than overwritten.
 */
function restoreGuarded() {
  for (const [rel, wrote] of [...written]) {
    const full = join(repoRoot, rel);
    let now;
    try {
      now = readFileSync(full);
    } catch {
      foreign.add(rel);
      written.delete(rel);
      continue;
    }
    if (now.equals(wrote)) writeFileSync(full, originals.get(rel));
    else if (!now.equals(originals.get(rel))) foreign.add(rel);
    written.delete(rel);
  }
}

/** Every file compared with the bytes read at the start, by sha256. */
function unrestored() {
  const out = [];
  for (const [rel, bytes] of originals) {
    let now;
    try {
      now = readFileSync(join(repoRoot, rel));
    } catch {
      out.push(rel);
      continue;
    }
    if (sha(now) !== sha(bytes)) out.push(rel);
  }
  return out;
}

let signalled = false;
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    signalled = true;
    restoreGuarded();
    const wrong = unrestored();
    process.stderr.write(
      `${TAG} stopped by ${sig}; ` +
        (wrong.length === 0
          ? `every one of the ${String(originals.size)} files is back byte for byte.\n`
          : `THESE FILES ARE NOT THE BYTES READ AT THE START: ${wrong.join(', ')}` +
            (foreign.size > 0 ? ` (edited by somebody else while this ran: ${[...foreign].join(', ')})` : '') +
            '\n')
    );
    process.exit(130);
  });
}
// The last resort for a throw that escapes everything below: `exit` runs
// synchronously, and the guarded restore is synchronous.
process.on('exit', () => restoreGuarded());

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

/** Run the gate at this repository's root; answer its exit and its failure lines. */
function runGate() {
  const started = Date.now();
  const run = spawnSync(process.execPath, ['build/conformance-machines.mjs'], {
    encoding: 'utf8',
    cwd: repoRoot,
    maxBuffer: 64 * 1024 * 1024,
    timeout: 180_000,
    killSignal: 'SIGKILL'
  });
  const out = `${run.stdout ?? ''}`;
  const failuresAt = out.indexOf('\nFAIL, ');
  const lines =
    failuresAt === -1
      ? []
      : out
          .slice(failuresAt)
          .split('\n')
          .filter((line) => line.startsWith('  - '))
          .map((line) => line.slice(4));
  return {
    status: run.status,
    signal: run.signal,
    ms: Date.now() - started,
    lines,
    stderr: `${run.stderr ?? ''}`.trim()
  };
}

const tick = () => new Promise((done) => setImmediate(done));
const problems = [];
const table = [];

async function main() {
  const control = runGate();
  if (control.status !== 0) {
    problems.push(
      `the CONTROL run is not green (exit ${String(control.status)}${control.signal ? `, ${control.signal}` : ''}), ` +
        'so every reading below would be about a tree that was already failing. Its failures: ' +
        (control.lines.map((line) => line.slice(0, 200)).join(' | ') || control.stderr.slice(0, 400) || 'none printed')
    );
    return;
  }
  say(`control: the gate is green on the unedited tree (${String(control.ms)} ms)`);

  for (const arm of ARMS) {
    if (signalled) return;
    const id = owner(arm.clause);
    const full = join(repoRoot, arm.file);
    const start = originals.get(arm.file);
    const row = { n: arm.n, owner: id, file: arm.file, name: arm.name, red: 'no', back: '-', collateral: [] };
    table.push(row);

    const text = start.toString('utf8');
    let edited;
    if (arm.append !== undefined) {
      edited = `${text}${text.endsWith('\n') ? '' : '\n'}${arm.append}\n`;
    } else {
      // One edit, or several in order (`edits`), each of whose text must occur
      // exactly once in the file as the edits before it left it.
      const steps = arm.edits ?? [{ find: arm.find, to: arm.to }];
      edited = text;
      let misplaced = null;
      for (const [k, step] of steps.entries()) {
        const count = occurrences(edited, step.find);
        if (count !== 1) {
          misplaced = `its ${steps.length > 1 ? `edit ${String(k + 1)} of ${String(steps.length)}` : 'text'} occurs ${String(count)} times`;
          break;
        }
        edited = edited.replace(step.find, () => step.to);
      }
      if (misplaced !== null) {
        problems.push(
          `arm ${String(arm.n)} (${id}) "${arm.name}": ${misplaced} in ` +
            `${arm.file} rather than once, so it was not applied. A clause that moved needs its arm moved with it.`
        );
        row.red = 'not applied';
        continue;
      }
    }

    const bytes = Buffer.from(edited, 'utf8');
    // The check stands on the line before the write, with the edit already
    // composed, so the window in which another editor's save could be lost is
    // one read and one write wide. Nothing short of a lock the other editor
    // also takes closes it, and nobody else takes one.
    if (!readFileSync(full).equals(start)) {
      foreign.add(arm.file);
      problems.push(
        `${arm.file} is no longer the bytes read at the start, so somebody else is editing it. ` +
          'The run stops here and writes nothing over their work.'
      );
      row.red = 'not run';
      return;
    }
    writeFileSync(full, bytes);
    written.set(arm.file, bytes);
    const got = runGate();
    restoreGuarded();
    const back = sha(readFileSync(full)) === sha(start);
    row.back = back ? 'yes' : 'NO';
    row.ms = got.ms;
    if (foreign.has(arm.file) || !back) {
      problems.push(
        `${arm.file} did NOT come back byte for byte after arm ${String(arm.n)}` +
          (foreign.has(arm.file) ? ', because somebody else edited it while the gate ran; it was left as they left it' : '') +
          '. Stopping.'
      );
      return;
    }

    const mine = got.lines.filter((line) => line.startsWith(`${id}:`));
    row.collateral = got.lines.filter((line) => !line.startsWith(`${id}:`));
    if (got.status === 0) {
      problems.push(
        `arm ${String(arm.n)} (${id}) "${arm.name}": the gate stayed GREEN. A clause that cannot be made to fail has stopped asking.`
      );
      row.red = 'GREEN';
    } else if (got.status === 1 && mine.length > 0 && arm.expect !== undefined && !mine.some((line) => line.includes(arm.expect))) {
      problems.push(
        `arm ${String(arm.n)} (${id}) "${arm.name}": the gate went red on ${id}, but no ${id} line says ` +
          `${JSON.stringify(arm.expect)}, so the sentence this arm exists to prove did not fire.`
      );
      row.red = 'wrong sentence';
    } else if (got.status !== 1 || mine.length === 0) {
      problems.push(
        `arm ${String(arm.n)} (${id}) "${arm.name}": the gate exited ${String(got.status)}` +
          `${got.signal ? ` (${got.signal})` : ''} and went red on ` +
          `${got.lines.map((line) => line.slice(0, 6)).join(', ') || got.stderr.slice(0, 200) || 'nothing it printed'} ` +
          `rather than on ${id}. That is red for the wrong reason.`
      );
      row.red = 'wrong reason';
    } else {
      row.red = 'yes';
    }
    say(
      `${row.red === 'yes' ? 'ok  ' : 'FAIL'} arm ${String(arm.n).padStart(2)}  ${id}  ${arm.file}  ` +
        `${arm.name}  (${String(got.ms)} ms, back by sha256: ${row.back})`
    );
    for (const line of mine.slice(0, 2)) say(`       owner:      ${line.slice(0, 220)}`);
    for (const line of row.collateral) say(`       collateral: ${line.slice(0, 220)}`);
    await tick();
  }
}

try {
  await main();
} finally {
  restoreGuarded();
  const wrong = unrestored();
  if (wrong.length > 0) {
    process.stderr.write(
      `${TAG} THESE FILES ARE NOT THE BYTES READ AT THE START: ${wrong.join(', ')}` +
        (foreign.size > 0
          ? `. Somebody else edited ${[...foreign].join(', ')} while this ran, and nothing was written over it.`
          : '') +
        '\n'
    );
    process.exitCode = 2;
  } else {
    say(`every one of the ${String(originals.size)} files came back byte for byte, checked by sha256`);
  }
}

const red = table.filter((row) => row.red === 'yes').length;
say('');
say(' #  owner  red on owner   back   arm');
for (const row of table) {
  say(
    `${String(row.n).padStart(2)}  ${row.owner.padEnd(5)}  ${row.red.padEnd(13)}  ${row.back.padEnd(5)}  ${row.name}` +
      (row.collateral.length > 0 ? `  [+${String(row.collateral.length)} collateral]` : '')
  );
}

if (problems.length > 0 || process.exitCode === 2) {
  for (const problem of problems) process.stderr.write(`${TAG} ${problem}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(problems.length)} finding(s).\n`);
  process.exit(process.exitCode === 2 ? 2 : 1);
}
say(
  `OK: the control is green, and ${String(red)} of ${String(ARMS.length)} arms went red on the ` +
    `clause of condition ${String(CONDITION)} that owns them, one clause each.`
);
process.exit(0);
