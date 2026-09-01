/**
 * known-hosts-fixtures.mjs. The scripts `npm run gate:knownhosts` proves itself
 * on (Phase 193).
 *
 * ## Why this is a file rather than six constants in the gate
 *
 * The gate shipped with six fixtures and a verifier attacked it with
 * twenty-one. NINE of the twenty-one passed, and `ssh -G`, which resolves
 * options and connects to nothing, resolves every one of those nine to
 * `/Users/gdc/.ssh/known_hosts`. So the gate's own fixtures were the measure of
 * its reach, and its reach was smaller than the sentence it printed.
 *
 * Run against the gate as it shipped, THIRTEEN of the cases here pass, being
 * the verifier's nine and four more found while closing them. Each of those
 * carries `passed: true`, which was measured by driving the shipped gate over
 * this same list rather than assumed: the first draft of this file marked
 * twelve, and the thirteenth was a plain reassignment.
 *
 * Every shape that has ever been thrown at this gate lives here now, so the
 * coverage cannot quietly decay the way the reach did. When a later round finds
 * a shape that walks past the gate, the shape is added HERE in the same commit
 * as the fix, and it stays.
 *
 * ## The one thing to know before editing this file
 *
 * IT IS SCANNED BY THE GATE LIKE EVERY OTHER FILE UNDER build/. So the hostile
 * words are assembled at write time by {@link assemble}: the bytes on disk say
 * `LAUNCH('CLIENT', ...)`, and only the fixture TEXT handed to the scanner says
 * what a real script would. Write a new case the same way. A case written out
 * plainly would make this file fail the gate, and the fix for that is never an
 * exemption, because an exempt file is a hole shaped like a file.
 *
 * `mustFail` is the rule the case must break, or null when it must pass every
 * rule. The two cases with null are controls, and they matter as much as the
 * rest: a scanner that flags a commented out spawn, or a script that does
 * everything right, makes every pass it prints worthless.
 *
 * It spawns nothing and reads no file. It exports text.
 */

/**
 * The hostile words, put together here so this file's own bytes carry none of
 * them in a position any rule reads.
 *
 * Longest marker first, because `LAUNCHASYNC` contains `LAUNCH`. Getting that
 * order wrong is silent: the fixture still compiles, it just stops being the
 * shape it was written to be, and the case then passes for the wrong reason.
 */
function assemble(text) {
  return text
    .replace(/LAUNCHASYNC/g, 'spa' + 'wn')
    .replace(/LAUNCH/g, 'spawn' + 'Sync')
    .replace(/EXECSYNC/g, 'exec' + 'Sync')
    .replace(/BARECLIENT/g, 'ss' + 'h')
    .replace(/SPLITCLIENT/g, "ss${''}h")
    .replace(/JOINCLIENT/g, "join('/usr/bin', 'ss' + 'h')")
    .replace(/KEYGEN/g, '/usr/bin/' + 'ssh-' + 'keygen')
    .replace(/CLIENT/g, '/usr/bin/' + 'ssh')
    .replace(/DASHR/g, "'-' + 'R'")
    .replace(/OPTNAME/g, 'UserKnownHosts' + 'File')
    .replace(/HOMECALL/g, 'homedir' + '()')
    .replace(/DOTSSH/g, '.s' + 'sh/known_hosts');
}

const A = assemble;

/**
 * Every script the gate proves itself on.
 *
 * The first six are the gate's own from the day it shipped. The fifteen marked
 * `verifier` are the ones a Phase 193 verifier attacked it with, nine of which
 * it passed. The four marked `fix round` are shapes tried while closing those
 * nine.
 */
export const CASES = [
  {
    id: 'A',
    name: 'a direct spawn of the client',
    mustFail: 1,
    text: A(`
import { LAUNCH } from 'node:child_process';
const out = LAUNCH('CLIENT', ['127.0.0.1', 'true'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'B',
    name: 'the client behind a variable declared three hundred lines earlier',
    mustFail: 1,
    why: 'how four of the five real client scripts were written before Phase 193',
    text: A(`
import { LAUNCH } from 'node:child_process';
const sshBin = 'CLIENT';
function sh(file, args) {
  return LAUNCH(file, args, { encoding: 'utf8' });
}
${'// a long way down the file\n'.repeat(40)}
const out = sh(sshBin, ['-o', 'BatchMode=yes', '127.0.0.1', 'true']);
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'C',
    name: 'a copy of the helper whose composed argv omits the option',
    mustFail: 3,
    text: `
const OPTION = 'OPTNAME';
export function sshOptions({ strict = 'yes' }) {
  return ['-o', 'BatchMode=yes', '-o', \`StrictHostKeyChecking=\${strict}\`];
}
`.replace(/OPTNAME/g, 'UserKnownHosts' + 'File')
  },
  {
    id: 'D',
    name: "a copy of the helper naming the person's file FIRST in the two file form",
    mustFail: 4,
    why: 'the original defect written down as a test',
    text: A(`
import { homedir } from 'node:os';
const OPTION = 'OPTNAME';
export function sshOptions({ tortieRecord }) {
  return ['-o', \`\${OPTION}="\${HOMECALL}/DOTSSH" "\${tortieRecord}"\`];
}
`)
  },
  {
    id: 'E',
    name: 'a compliant script',
    mustFail: null,
    text: `
import { scratchKnownHosts, sshRun } from './ssh-run.mjs';
const record = scratchKnownHosts('/tmp/fixture-e');
const out = sshRun({
  knownHosts: record,
  caller: 'fixture-e.mjs',
  argv: ['-o', 'BatchMode=yes', '127.0.0.1', 'true']
});
process.exit(out.status ?? 1);
`
  },
  {
    id: 'F',
    name: 'the client as a bare word on a command line handed to a shell',
    mustFail: '1c',
    why: 'the shape build/capture-machine-goldens.mjs read its version with',
    text: A(`
import { LAUNCH } from 'node:child_process';
const out = LAUNCH('/bin/sh', ['-c', \`BARECLIENT -V 2>&1\`], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },

  // ---- the verifier's twenty-one -----------------------------------------

  {
    id: 'V1',
    from: 'verifier',
    passed: true,
    name: 'the program from a variable with an environment fallback',
    mustFail: 1,
    text: A(`
import { LAUNCH } from 'node:child_process';
const sshBin = process.env.TORTIE_SSH || 'CLIENT';
const out = LAUNCH(sshBin, ['127.0.0.1', 'true'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'V2',
    from: 'verifier',
    name: 'the program from a variable declared over two lines',
    mustFail: 1,
    text: A(`
import { LAUNCH } from 'node:child_process';
const sshBin =
  'CLIENT';
const out = LAUNCH(sshBin, ['127.0.0.1', 'true'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'V3',
    from: 'verifier',
    passed: true,
    name: 'the program built by a path join over folded fragments',
    mustFail: 1,
    text: A(`
import { LAUNCH } from 'node:child_process';
import { join } from 'node:path';
const sshBin = JOINCLIENT;
const out = LAUNCH(sshBin, ['127.0.0.1', 'true'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'C1',
    from: 'verifier',
    name: 'the argv built by concat, with no record file in it',
    mustFail: 1,
    text: A(`
import { LAUNCH } from 'node:child_process';
const base = ['-o', 'BatchMode=yes'];
const out = LAUNCH('CLIENT', base.concat(['127.0.0.1', 'true']), { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'C2',
    from: 'verifier',
    name: 'the argv built by a spread, with no record file in it',
    mustFail: 1,
    text: A(`
import { LAUNCH } from 'node:child_process';
const base = ['-o', 'BatchMode=yes'];
const out = LAUNCH('CLIENT', [...base, '127.0.0.1', 'true'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'O1',
    from: 'verifier',
    name: 'the option composed from two array elements rather than written',
    mustFail: 1,
    text: A(`
import { LAUNCH } from 'node:child_process';
const p = '/tmp/mine/known_hosts';
const out = LAUNCH('CLIENT', ['-o', 'OPTNAME' + '=' + p, '127.0.0.1', 'true'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'H1',
    from: 'verifier',
    name: "the option scoped to a path under the person's REAL home",
    mustFail: 1,
    text: A(`
import { LAUNCH } from 'node:child_process';
import { homedir } from 'node:os';
const record = \`\${HOMECALL}/DOTSSH\`;
const out = LAUNCH('CLIENT', ['-o', \`OPTNAME=\${record}\`, '127.0.0.1', 'true'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'H2',
    from: 'verifier',
    name: "the person's file FIRST in the two file form, hand composed past the helper",
    mustFail: 4,
    text: A(`
import { homedir } from 'node:os';
import { sshRun } from './ssh-run.mjs';
const userRecord = \`\${HOMECALL}/DOTSSH\`;
const tortieRecord = '/tmp/mine/known-machines';
const RECORD = \`"\${userRecord}" "\${tortieRecord}"\`;
const out = sshRun({ knownHosts: RECORD, argv: ['127.0.0.1', 'true'], caller: 'h2' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'S1',
    from: 'verifier',
    name: 'the client on a shell command line written as a literal',
    mustFail: '1c',
    text: A(`
import { LAUNCH } from 'node:child_process';
const out = LAUNCH('/bin/sh', ['-c', 'CLIENT -o StrictHostKeyChecking=no 127.0.0.1 true'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'S1b',
    from: 'verifier',
    passed: true,
    name: 'the client on a shell command line, respelled through an interpolation',
    mustFail: '1c',
    text: A(`
import { LAUNCH } from 'node:child_process';
const host = '127.0.0.1';
const out = LAUNCH('/bin/sh', ['-c', \`SPLITCLIENT -o StrictHostKeyChecking=no \${host} true\`], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'S2',
    from: 'verifier',
    passed: true,
    name: 'the shell command line held in a name rather than written',
    mustFail: '1c',
    text: A(`
import { LAUNCH } from 'node:child_process';
const cmd = 'CLIENT -o StrictHostKeyChecking=no 127.0.0.1 true';
const out = LAUNCH('/bin/sh', ['-c', cmd], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'S3',
    from: 'verifier',
    passed: true,
    name: 'the shell command line after a login shell option rather than a plain one',
    mustFail: '1c',
    text: A(`
import { LAUNCH } from 'node:child_process';
const out = LAUNCH('/bin/bash', ['-lc', 'CLIENT -o StrictHostKeyChecking=no 127.0.0.1 true'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'S4',
    from: 'verifier',
    passed: true,
    name: 'the client through execSync, which takes a whole command line',
    mustFail: '1c',
    text: A(`
import { EXECSYNC } from 'node:child_process';
const out = EXECSYNC('CLIENT -o StrictHostKeyChecking=no 127.0.0.1 true', { encoding: 'utf8' });
process.stdout.write(String(out));
`)
  },
  {
    id: 'S5',
    from: 'verifier',
    passed: true,
    name: 'the client through a spawn carrying shell true, so argument 0 is a command line',
    mustFail: '1c',
    text: A(`
import { LAUNCH } from 'node:child_process';
const out = LAUNCH('CLIENT -o StrictHostKeyChecking=no 127.0.0.1 true', { shell: true, encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'W1',
    from: 'verifier',
    passed: true,
    name: 'the client through a local wrapper whose name is on no list',
    mustFail: 1,
    text: A(`
import { LAUNCH } from 'node:child_process';
const sshBin = 'CLIENT';
function connect(file, args) { return LAUNCH(file, args, { encoding: 'utf8' }); }
const out = connect(sshBin, ['127.0.0.1', 'true']);
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'W2',
    from: 'verifier',
    name: 'a second private helper that DOES scope the option',
    mustFail: 1,
    why: 'still a finding, because the guarantee lives in one file and this is a second one',
    text: A(`
import { LAUNCH } from 'node:child_process';
function mySsh(argv, record) {
  return LAUNCH('CLIENT', ['-o', \`OPTNAME=\${record}\`, ...argv], { encoding: 'utf8' });
}
const out = mySsh(['127.0.0.1', 'true'], '/tmp/mine/known_hosts');
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'X1',
    from: 'verifier',
    name: 'a scoped option followed by a second one naming the person',
    mustFail: 1,
    why: 'ssh takes the FIRST value, so the later one loses, and the spawn is a finding anyway',
    text: A(`
import { LAUNCH } from 'node:child_process';
import { homedir } from 'node:os';
const out = LAUNCH('CLIENT', [
  '-o', 'OPTNAME=/tmp/mine/known_hosts',
  '-o', \`OPTNAME=\${HOMECALL}/DOTSSH\`,
  '127.0.0.1', 'true'
], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'K1',
    from: 'verifier',
    name: 'ssh-keygen with its removal flag, which rewrites the record file',
    mustFail: '1b',
    text: A(`
import { LAUNCH } from 'node:child_process';
const out = LAUNCH('KEYGEN', ['-R', '[127.0.0.1]:2222'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'K2',
    from: 'verifier',
    passed: true,
    name: 'the same removal flag folded out of two fragments',
    mustFail: '1b',
    text: A(`
import { LAUNCH } from 'node:child_process';
const flag = DASHR;
const out = LAUNCH('KEYGEN', [flag, '[127.0.0.1]:2222'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'N1',
    from: 'verifier',
    name: 'a COMMENTED OUT spawn, which must not be flagged',
    mustFail: null,
    why: 'the control: a gate that flags a comment is a gate nobody keeps',
    text: A(`
import { LAUNCH } from 'node:child_process';
// const out = LAUNCH('CLIENT', ['127.0.0.1', 'true'], { encoding: 'utf8' });
/* LAUNCH('CLIENT', ['-o', 'OPTNAME=/x'], {}); */
const message = "we used to run CLIENT here with OPTNAME under the home";
process.stdout.write(message);
`)
  },
  {
    id: 'N2',
    from: 'verifier',
    name: 'a compliant script through the helper',
    mustFail: null,
    why: 'the second control: it must pass every rule',
    text: `
import { scratchKnownHosts, sshRun } from './ssh-run.mjs';
const record = scratchKnownHosts('/tmp/fixture-n2');
const out = sshRun({ knownHosts: record, caller: 'n2', argv: ['127.0.0.1', 'true'] });
process.exit(out.status ?? 1);
`
  },

  // ---- the fix round's four ----------------------------------------------

  {
    id: 'I1',
    from: 'fix round',
    passed: true,
    name: "the helper's own exported program name, imported and spawned directly",
    mustFail: 1,
    why: 'three files under build/ already import it, and it has no declaration in them',
    text: A(`
import { LAUNCH } from 'node:child_process';
import { SSH_BIN } from './ssh-run.mjs';
const out = LAUNCH(SSH_BIN, ['127.0.0.1', 'true'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'R1',
    from: 'fix round',
    passed: true,
    name: 'the program given by a plain reassignment rather than a declaration',
    mustFail: 1,
    text: A(`
import { LAUNCH } from 'node:child_process';
let sshBin = null;
sshBin = 'CLIENT';
const out = LAUNCH(sshBin, ['127.0.0.1', 'true'], { encoding: 'utf8' });
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'D1',
    from: 'fix round',
    passed: true,
    name: 'the program as a DEFAULT PARAMETER of a local wrapper',
    mustFail: 1,
    text: A(`
import { LAUNCH } from 'node:child_process';
function connect(host, bin = 'CLIENT') {
  return LAUNCH(bin, [host, 'true'], { encoding: 'utf8' });
}
const out = connect('127.0.0.1');
process.exit(out.status ?? 1);
`)
  },
  {
    id: 'T1',
    from: 'fix round',
    passed: true,
    name: 'a name that CAN hold the client, through a question with two answers',
    mustFail: 1,
    why: 'nothing reading the file can tell which way the question goes, so it fails closed',
    text: A(`
import { LAUNCHASYNC } from 'node:child_process';
import { SSH_BIN } from './ssh-run.mjs';
const remote = process.argv.includes('--remote');
const program = '/opt/homebrew/bin/tmux';
const chosen = remote ? SSH_BIN : program;
const child = LAUNCHASYNC(chosen, ['-V'], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
`)
  }
];
