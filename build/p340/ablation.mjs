#!/usr/bin/env node
/**
 * `npm run ablation:p340`. The attack on Phase 340's own gate: conditions 125
 * to 139 of `conformance:machines` and the two classes condition 10 gained
 * (build/p340/SPEC.md §9.2).
 *
 * A GREEN GATE IS ONLY EVIDENCE IF IT CAN GO RED. Phase 340 lets Tortie sign
 * in to a machine he picked and run something there before he has agreed to
 * anything, and what keeps that to "his login files and one `-V` of the one
 * program his own shell would run" is a handful of clauses in one line of sh,
 * one strict reader, the runners, the add handler and the renderer's starters.
 * So this script breaks ONE CLAUSE AT A TIME in the shipping source and proves
 * it reddens THE CONDITION THAT OWNS IT. An ablation that leaves its owner
 * green is a hole in the gate; one that reddens only something else is printed
 * as a finding about the gate rather than about the build. One CONTROL arm
 * edits a comment and must leave the gate exactly as green as it found it.
 *
 * ## It never writes into the working tree
 *
 * Four builders work in one worktree during this phase, and a harness that
 * wrote into `src/` even for the seconds a gate takes could lose another
 * builder's edit. So it is the `ablation:p336` shape: a CLONE, `cp -Rc`
 * (APFS clonefile) of `src/`, `build/` and `resources/` under
 * `/private/tmp/p340-ablation-<pid>-*`, every root config the gate reads
 * copied, `node_modules` symlinked, the gate run there with that directory as
 * its cwd. Each edited file is put back and CHECKED BY SHA256 against the
 * worktree's bytes in a `finally` before the next entry, the clone is removed
 * in a `finally` and on SIGINT, SIGTERM and SIGHUP, and the worktree's own
 * bytes for every file an entry names are read before and after: a change is
 * a finding.
 *
 * ## It starts nothing but node and the gate's own shells
 *
 * No Electron, no tmux, no ssh, no agent, no token and no network. The gate it
 * runs starts `/bin/sh`, `/bin/dash`, `/bin/ksh`, `/bin/zsh`, `git` and
 * `shasum` over scratch trees it removes itself (conditions 88g, 115 to 117 and
 * 127), and a fake ssh under node-pty (conditions 130 and 138), which is a
 * `/bin/sh` script the shipping `resolveSsh` must name before it starts. Every
 * gate run here has a scratch HOME and ZDOTDIR inside the clone,
 * HISTFILE=/dev/null and no TERM_SESSION_ID or SSH_AUTH_SOCK, so nothing reads
 * his rc files or writes his history.
 *
 * ## The delta rule
 *
 * The base's red lines are recorded first and each ablation must make its own
 * owner NEWLY red, which proves the ablation caused it and lets the harness run
 * while a sibling builder's half is not landed. A red base is reported and
 * fails the run unless `P340_ALLOW_RED_BASE=1` says the operator knows why.
 *
 * Usage:
 *   node build/p340/ablation.mjs                      every arm
 *   node build/p340/ablation.mjs --list               the arms, run nothing
 *   node build/p340/ablation.mjs --self-test          the readers and every arm's
 *                                                     shape against the worktree,
 *                                                     run nothing
 *   P340_ONLY=a127a,a137a node build/p340/ablation.mjs
 *   P340_ALLOW_RED_BASE=1 node build/p340/ablation.mjs
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p340-ablation]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const CHECK = 'src/main/machines/check-script.ts';
const CT = 'src/main/machines/connection-test.ts';
const ERRORS = 'src/main/machines/errors.ts';
const IPC = 'src/main/machines/ipc.ts';
const CONFIRM = 'src/main/machines/confirm.ts';
const REMOVAL = 'src/main/machines/removal.ts';
const STORE = 'src/renderer/settings/machines-store.ts';
const SECTION = 'src/renderer/settings/MachinesSection.tsx';
const ROW = 'src/renderer/settings/MachineRow.tsx';
const STATUS = 'src/renderer/settings/machine-status.ts';

/**
 * The ablations (build/p340/SPEC.md §9.2, in its order, plus one arm for each
 * condition §9.2 names none for and the control). `owners` must ALL be newly
 * red; an empty list is the control, which must leave the gate as it found
 * it. An edit's `from` is an exact string (replaced once, and present once in
 * the worktree, which the self-test checks) or a RegExp; an entry whose one
 * clause spans two places carries `edits`.
 */
export const ABLATIONS = [
  // ---------------------------------------------------------------- 10 the two classes
  {
    n: 'a010a', owners: ['C10'], file: ERRORS,
    name: "client-failed given client-missing's headline",
    why: 'an ssh that would not start would be told as a missing one again, which is the sentence he read with /usr/bin/ssh in place (D14).',
    from: "    headline: 'Tortie could not start ssh on this Mac.',",
    to: "    headline: 'This Mac has no ssh program at /usr/bin/ssh.',"
  },
  // ---------------------------------------------------------------- 125 the text
  {
    n: 'a125a', owners: ['C125'], file: CHECK,
    name: 'a newline in the script',
    why: 'csh and tcsh, as the far account\'s shell, will not carry a newline inside a quoted word, so the check would never run there (M14).',
    from: "].join('; ');", to: "].join(';\\n');"
  },
  {
    n: 'a125b', owners: ['C125'], file: CHECK,
    name: 'the install folders inlined into the text',
    why: 'two lists of folders, one of which the compiled list no longer decides (D3).',
    from: `  'x="$3"',`, to: `  'x="/opt/homebrew/bin:/usr/local/bin:$3"',`
  },
  {
    n: 'a125c', owners: ['C125'], file: CT,
    name: "a saved row's test argv ends in the draft's check",
    why: "the path he confirmed would not be the one the check looks at (D1).",
    from: '  argv.push(composeCheckCommand(fields.remoteTmuxPath));', to: '  argv.push(composeCheckCommand(null));'
  },
  // ---------------------------------------------------------------- 126 the login read
  {
    n: 'a126a', owners: ['C126'], file: CHECK,
    name: '$lo, what the login shell printed, printed into the answer',
    why: 'a login file could then write the answer Tortie reads (D2).',
    from: `  'lo=$("\${SHELL:-/bin/sh}" -lc "$q" </dev/null 2>/dev/null)',`,
    to: `  'lo=$("\${SHELL:-/bin/sh}" -lc "$q" </dev/null 2>/dev/null)',\n  'printf "%s" "$lo"',`
  },
  // ---------------------------------------------------------------- 127 the check, driven
  {
    n: 'a127a', owners: ['C127'], file: CHECK,
    name: 'the one-program guard on -V removed, so a two-candidate fixture runs a stand-in',
    why: 'a program planted earlier on the PATH would run before he picks (D4).',
    from: '`if [ "$n" -eq 1 ]; then if [ "$cs" = install ]; then ',
    to: '`if [ "$n" -ge 1 ]; then if [ "$cs" = install ] && [ "$n" -eq 1 ]; then '
  },
  {
    n: 'a127b', owners: ['C127'], file: CHECK,
    name: 'identity by path, so the link fixture yields two',
    why: 'one program reached by two spellings would be asked as a choice, and a choice runs nothing (M9).',
    from: 'k=$(stat -L -c %d:%i -- "$2" 2>/dev/null || stat -L -f %d:%i -- "$2" 2>/dev/null); [ -n "$k" ] || k="$2";',
    to: 'k="$2";'
  },
  {
    n: 'a127c', owners: ['C127'], file: CHECK,
    name: 'set -f removed, so the glob fixture yields two',
    why: 'a login PATH entry holding * would be expanded into folders the login shell never searches (§Attack T3).',
    from: "  'set -f',\n", to: ''
  },
  {
    n: 'a127d', owners: ['C127', 'C137'], file: CHECK,
    name: 'the control-character guard (the newline with it) removed',
    why: 'a folder whose name holds a newline would forge a line of the answer (§Attack T2), and one holding a tab would refuse the whole check.',
    from: 'case "$2" in *[[:cntrl:]]*|*"$nl"*) return 0 ;; esac; ', to: ''
  },
  {
    n: 'a127f', owners: ['C127', 'C137'], file: CHECK,
    name: 'the relative-path skip removed (the fix round)',
    why: 'a login PATH entry such as `bin` or `.` holding a program would make the strict reader refuse the whole check, beside a real program the parent found.',
    from: 'case "$2" in /*) ;; *) return 0 ;; esac; ', to: ''
  },
  {
    n: 'a127g', owners: ['C127', 'C137'], file: CHECK,
    name: 'the single-quote skip removed (the fix round)',
    why: "a folder named o'brien holding a program would make the strict reader refuse the whole check.",
    from: 'case "$2" in *"$sq"*) return 0 ;; esac; ', to: ''
  },
  {
    n: 'a127h', owners: ['C127', 'C137'], file: CHECK,
    name: 'the control-character alternative removed, the newline guard kept (the fix round)',
    why: 'a folder whose name holds a tab would make the strict reader refuse the whole check.',
    from: '*[[:cntrl:]]*|*"$nl"*', to: '*"$nl"*'
  },
  {
    n: 'a127e', owners: ['C127'], file: CHECK,
    name: 'the install-only vskip arm removed, so F1 runs its stand-in',
    why: 'a lone program in a folder his shell does not search would run before the Add press (§Attack T6).',
    from: String.raw`then if [ "$cs" = install ]; then printf "vskip=install\\n"; else `,
    to: 'then if false; then :; else '
  },
  // ---------------------------------------------------------------- 128 two spawn sites
  {
    n: 'a128a', owners: ['C128'], file: CT,
    name: 'a third node-pty spawn site',
    why: 'a second visible client would be a second interactive moment nobody reviewed.',
    from: 'export function sendMachineTestInput(',
    to: "export function p340AblationSpawn(): void {\n  nodePty.spawn('/usr/bin/true', [], {});\n}\n\nexport function sendMachineTestInput("
  },
  // ---------------------------------------------------------------- 129 missing and failing
  {
    n: 'a129a', owners: ['C129'], file: CT,
    // Anchored at six spaces: the key install's own line is indented eight,
    // so this is the visible test's branch, the first runner.
    name: 'the no-path branch finishing client-failed',
    why: 'a missing ssh would be told as one that would not start.',
    from: /^      finish\(test, 'client-missing', null\);$/m, to: "      finish(test, 'client-failed', null);"
  },
  {
    n: 'a129b', owners: ['C129'], file: CT,
    name: 'the spawn catch finishing client-missing',
    why: 'the defect he met: an ssh that is there and would not start, told as a missing one (D14).',
    from: /^      finish\(test, 'client-failed', null\);$/m, to: "      finish(test, 'client-missing', null);"
  },
  {
    n: 'a129c', owners: ['C129'], file: CT,
    name: "the no-path branch's log line removed",
    why: 'a missing ssh would leave nothing in the log, and the two classes would no longer both be logged.',
    from: '    machinesLog.warn(\n      `the connection test found no ssh program it can run at ${PINNED_SSH_PATH}`\n    );\n',
    to: ''
  },
  // ---------------------------------------------------------------- 130 the version the add binds
  {
    n: 'a130a', owners: ['C130'], file: IPC,
    name: 'rowFromAdd dropping the accepted version',
    why: 'the add would refuse its own sheet, or a row would be written without the version he accepted (D7).',
    from: '  if (accepted !== null) row.acceptedTmuxVersion = accepted;\n', to: '  void accepted;\n'
  },
  {
    n: 'a130b', owners: ['C130'], file: IPC,
    name: 'the version pattern check removed',
    why: 'any string would be written as an accepted version (D7).',
    from: " ||\n    !new RegExp(MACHINE_VERSION_PATTERN).test(version)\n", to: '\n'
  },
  {
    n: 'a130c', owners: ['C130'], file: IPC,
    name: 'the measured-version refusal removed',
    why: 'he would agree to a line he never sees: a measured acceptance is dropped from the lines and kept in the hash (§Attack R9).',
    from: /  if \(decideRemoteVersionGate\(version\)\.kind === 'measured'\) \{[\s\S]*?\n  \}\n/, to: ''
  },
  // ---------------------------------------------------------------- 131 nothing moves
  {
    n: 'a131a', owners: ['C131'], file: CONFIRM,
    name: 'the hash algorithm renamed',
    why: 'every confirmed machine would read changed and be asked again (D16).',
    from: "export const MACHINE_EXECUTION_HASH_ALGORITHM = 'sha256-machine-exec-v1';",
    to: "export const MACHINE_EXECUTION_HASH_ALGORITHM = 'sha256-machine-exec-v2';"
  },
  // ---------------------------------------------------------------- 132 refusal 8 in the renderer
  {
    n: 'a132a', owners: ['C132'], file: SECTION,
    name: 'a startDraftTest inside a useEffect',
    why: 'opening Settings would sign in to a machine nobody pressed for (refusal 8, D5).',
    from: '  useEffect(() => init(), [init]);',
    to: '  useEffect(() => {\n    init();\n    void useMachinesStore.getState().startDraftTest();\n  }, [init]);'
  },
  // ---------------------------------------------------------------- 133 one chain into a prepare
  {
    n: 'a133a', owners: ['C133'], file: STORE,
    name: 'b.prepare( before the awaited b.add(',
    why: 'a prepare would run before the agreement it rests on was recorded (D7).',
    from: '        const added = await b.add(input);', to: '        await b.prepare(input.id);\n        const added = await b.add(input);'
  },
  {
    n: 'a133b', owners: ['C133'], file: STORE,
    name: 'confirmMachine chaining b.prepare(',
    why: 'Confirm on Review… would start a far server in launches that do not expect one (§Attack R4, D12).',
    from: '        await b.confirm({ id, hashRead: row.hash, linesRead: row.lines });',
    to: '        await b.confirm({ id, hashRead: row.hash, linesRead: row.lines });\n        await b.prepare(id);'
  },
  // ---------------------------------------------------------------- 134 the native menu
  {
    n: 'a134a', owners: ['C134'], file: ROW,
    name: 'a role="menu" element',
    why: 'a DOM-drawn menu, which the UI rule forbids (D20).',
    from: '          aria-haspopup="true"', to: '          aria-haspopup="true"\n          role="menu"'
  },
  {
    n: 'a134b', owners: ['C134'], file: ROW,
    name: 'the ⋯ press no longer returns when the bridge has no popupMenu',
    why: 'a build without the native menu would do something other than nothing (D20).',
    from: "  if (host === undefined || typeof host.popupMenu !== 'function') return;", to: '  if (host === undefined) return;'
  },
  // ---------------------------------------------------------------- 135 open a folder
  {
    n: 'a135a', owners: ['C135'], file: IPC,
    name: 'the confirmed check removed from machines:openFolder',
    why: "a row nobody agreed to would raise the main window's folder sheet on it (D13).",
    from: '    if (!isMachineConfirmed(row.id, machineFieldsOf(row))) return false;\n', to: ''
  },
  // ---------------------------------------------------------------- 136 the facts go with the machine
  {
    n: 'a136a', owners: ['C136'], file: REMOVAL,
    name: 'forgetRowFacts removed from Remove',
    why: "a machine added again under the same id would wear the removed one's last sign-in and system (D24).",
    from: '  forgetRowFacts(machineId);\n', to: ''
  },
  // ---------------------------------------------------------------- 137 the strict reader
  {
    n: 'a137a', owners: ['C137'], file: CHECK,
    name: 'the LAST block read instead of exactly one',
    why: "an EXIT trap in his .zshenv would choose the program Tortie runs (§Attack T1, the F9 trap fixture).",
    from: "  if (markers !== 2) return typed === null ? 'malformed' : typedBlockOf(text, typed);\n  const open = text.indexOf(CHECK_MARKER);\n  const close = text.indexOf(CHECK_MARKER, open + CHECK_MARKER.length);",
    to: "  if (markers % 2 !== 0) return 'malformed';\n  const close = text.lastIndexOf(CHECK_MARKER);\n  const open = text.lastIndexOf(CHECK_MARKER, close - 1);"
  },
  {
    n: 'a137c', owners: ['C137'], file: CHECK,
    name: 'the typed reading takes a block when TWO name the typed path (the fix round)',
    why: 'a login file that knows the typed path could print a block naming it with a version of its choosing, and Tortie would take whichever came first.',
    from: "  return naming.length === 1 ? (naming[0] as MachineCheckFacts) : 'malformed';",
    to: "  return naming.length >= 1 ? (naming[0] as MachineCheckFacts) : 'malformed';"
  },
  {
    n: 'a137d', owners: ['C137'], file: CHECK,
    name: 'the typed reading takes a block naming ANY typed path (the fix round)',
    why: 'a block naming another program than the one the person typed would choose the program Tortie binds.',
    from: "only.source === 'typed' && only.path === typed", to: "only.source === 'typed'"
  },
  {
    n: 'a137e', owners: ['C137'], file: CHECK,
    name: 'the typed reading reads past an odd number of markers (the fix round)',
    why: 'a block with no end would be placed by a guess about which marker opened it.',
    from: "  if ((parts.length - 1) % 2 !== 0) return 'malformed';\n", to: ''
  },
  {
    n: 'a137b', owners: ['C137'], file: CHECK,
    name: 'the count comparison removed',
    why: 'a block whose count disagrees with its candidates would be believed (D15).',
    from: "  if (count === undefined || count !== candidates.length) return 'malformed';", to: "  if (count === undefined) return 'malformed';"
  },
  // ---------------------------------------------------------------- 138 Tortie's key on the check
  {
    n: 'a138a', owners: ['C138'], file: CT,
    name: "the test argv dropping Tortie's IdentityFile",
    why: "the check after Put Tortie's key on it would ask for the password again (§Attack R2, D27).",
    from: "    argv.push('-o', `IdentityFile=\"${identityFile}\"`);\n", to: ''
  },
  {
    n: 'a138b', owners: ['C138'], file: CT,
    name: 'IdentitiesOnly added to the test argv',
    why: "his own keys would no longer be offered (condition 48's reason).",
    from: "    argv.push('-o', `IdentityFile=\"${identityFile}\"`);\n",
    to: "    argv.push('-o', `IdentityFile=\"${identityFile}\"`);\n    argv.push('-o', 'IdentitiesOnly=yes');\n"
  },
  // ---------------------------------------------------------------- 139 Ready means answering
  {
    n: 'a139a', owners: ['C139'], file: STATUS,
    name: 'the Ready arm reading ready alone',
    why: 'a machine that went to sleep would read Ready (§Attack R1).',
    from: "  if (row.ready === true && (link === 'connected' || link === 'polling')) {", to: '  if (row.ready === true) {'
  },
  // ---------------------------------------------------------------- the control
  {
    n: 'a-ctrl', owners: [], file: CHECK,
    name: 'CONTROL: a comment changed',
    why: 'a gate that reads comments would turn red on prose, and every arm above would prove nothing.',
    from: '/** The marker around the one block the check prints. */',
    to: '/** The marker around the one block the check prints (the ablation control). */'
  }
];

/** The condition a gate failure line names, as `C<n>`, or null. */
export function ownerOfGateLine(line) {
  const m = /^\s*-\s*condition (\d{1,3})(?: to \d{1,3})?:/.exec(line);
  return m === null ? null : `C${String(Number(m[1]))}`;
}

/** The red owners of one gate run: every failure line, by condition. */
export function gateRed(text) {
  const red = new Set();
  for (const line of String(text).split('\n')) {
    if (!/^\s*-\s/.test(line)) continue;
    red.add(ownerOfGateLine(line) ?? `other:${line.trim().slice(2, 62)}`);
  }
  return red;
}

/** The arms whose `from` is not present exactly once in the worktree's file (a string) or not at all (a RegExp). */
export function shapeProblems(read = (rel) => (existsSync(join(REPO, rel)) ? readFileSync(join(REPO, rel), 'utf8') : null)) {
  const out = [];
  for (const entry of ABLATIONS) {
    const text = read(entry.file);
    if (text === null) {
      out.push(`${entry.n}: ${entry.file} is not there`);
      continue;
    }
    for (const edit of entry.edits ?? [{ from: entry.from, to: entry.to }]) {
      const hits = edit.from instanceof RegExp ? (text.match(new RegExp(edit.from.source, `${edit.from.flags.replace('g', '')}g`)) ?? []).length : text.split(edit.from).length - 1;
      if (hits !== 1) out.push(`${entry.n}: the shape is in ${entry.file} ${String(hits)} time(s), not once: ${String(edit.from).slice(0, 120)}`);
    }
  }
  return out;
}

function selfTest() {
  const shapes = shapeProblems();
  const conditions = [10, ...Array.from({ length: 15 }, (_, i) => 125 + i)];
  const cases = [
    ['a numbered line is its condition', ownerOfGateLine('  - condition 127: F3 ran'), 'C127'],
    ['condition 10 reads as C10', ownerOfGateLine('  - condition 10: client-failed and client-missing share'), 'C10'],
    ['the load line is condition 125', ownerOfGateLine('  - condition 125 to 139: Phase 340 cannot be judged'), 'C125'],
    ['an unnumbered line has no owner', ownerOfGateLine('  - the failure taxonomy is a different set'), null],
    ['gateRed reads only failure lines', [...gateRed('PASS\n  - condition 137: x\nnot a failure')].join(','), 'C137'],
    ['every arm id is unique', new Set(ABLATIONS.map((a) => a.n)).size === ABLATIONS.length, true],
    ['every condition 125 to 139 and 10 owns an arm', conditions.every((n) => ABLATIONS.some((a) => a.owners.includes(`C${String(n)}`))), true],
    ['exactly one control', ABLATIONS.filter((a) => a.owners.length === 0).length, 1],
    ['every arm names a file under src/', ABLATIONS.every((a) => a.file.startsWith('src/')), true],
    ['every arm shape is present once in the worktree', shapes, []]
  ];
  let ok = true;
  for (const [label, got, want] of cases) {
    const good = JSON.stringify(got) === JSON.stringify(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${JSON.stringify(got)}${good ? '' : ` want ${JSON.stringify(want)}`}`);
  }
  say(ok ? `self-test PASS: ${String(cases.length)} fixtures` : 'self-test FAIL');
  return ok;
}

const runAsProgram = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (runAsProgram && process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
if (runAsProgram && process.argv.includes('--list')) {
  const byOwner = new Map();
  for (const a of ABLATIONS) {
    const key = a.owners.length === 0 ? 'control' : a.owners.join('+');
    byOwner.set(key, (byOwner.get(key) ?? 0) + 1);
    process.stdout.write(`${a.n.padEnd(8)} ${(a.owners.join(' ') || 'control (stays green)').padEnd(22)} ${a.file}\n         ${a.name}\n`);
  }
  process.stdout.write(`\n${String(ABLATIONS.length)} arms: ${[...byOwner].map(([k, v]) => `${k} ${String(v)}`).join(', ')}. Nothing was run.\n`);
  process.exit(0);
}
if (runAsProgram) await runAblations();

async function runAblations() {
  const scratch = mkdtempSync(join('/private/tmp', `p340-ablation-${String(process.pid)}-`));
  const CHECK_HOME = join(scratch, 'home');
  const CHECK_ENV = { ...process.env, HOME: CHECK_HOME, ZDOTDIR: CHECK_HOME, HISTFILE: '/dev/null' };
  delete CHECK_ENV['TERM_SESSION_ID'];
  delete CHECK_ENV['SSH_AUTH_SOCK'];

  const buildClone = () => {
    for (const name of ['src', 'build', 'resources']) {
      const r = spawnSync('cp', ['-Rc', join(REPO, name), join(scratch, name)], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`cp -Rc ${name} failed: ${r.stderr}`);
    }
    for (const name of readdirSync(REPO)) {
      if (/^(?:package\.json|tsconfig(?:\.[a-z]+)?\.json|vitest\.config\.ts)$/.test(name)) {
        writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
      }
    }
    symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
    mkdirSync(CHECK_HOME, { mode: 0o700 });
  };

  const runGate = () => {
    const r = spawnSync(process.execPath, [join(scratch, 'build', 'conformance-machines.mjs')], {
      cwd: scratch,
      encoding: 'utf8',
      env: CHECK_ENV,
      maxBuffer: 64 * 1024 * 1024,
      timeout: 600_000
    });
    const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    return { code: r.status ?? 1, red: gateRed(text), text };
  };

  const restore = (rel) => {
    const want = readFileSync(join(REPO, rel));
    writeFileSync(join(scratch, rel), want);
    const got = readFileSync(join(scratch, rel));
    if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
  };

  /** One replacement inside the clone; a function replacer, so `$&` and `$1` stay literal. */
  const ablate = (rel, from, to) => {
    const path = join(scratch, rel);
    if (!existsSync(path)) return false;
    const text = readFileSync(path, 'utf8');
    if (from instanceof RegExp ? !from.test(text) : !text.includes(from)) return false;
    writeFileSync(path, text.replace(from, () => to), 'utf8');
    return true;
  };

  let cleaned = false;
  const clean = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      rmSync(scratch, { recursive: true, force: true });
    } catch {
      /* under /private/tmp; not fatal */
    }
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(sig, () => {
      clean();
      process.exit(130);
    });
  }

  const editsOf = (entry) => entry.edits ?? [{ from: entry.from, to: entry.to }];
  const touchedFiles = [...new Set(ABLATIONS.map((a) => a.file))];
  const worktreeBefore = new Map(touchedFiles.map((f) => [f, existsSync(join(REPO, f)) ? sha(readFileSync(join(REPO, f))) : null]));

  const problems = [];
  const table = [];
  let ran = 0;
  const started = Date.now();

  try {
    buildClone();
    say(`clone at ${scratch}, node_modules symlinked, nothing under a home touched`);
    const only = (process.env['P340_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
    const wanted = ABLATIONS.filter((a) => only.length === 0 || only.includes(a.n));
    const base = runGate();
    if (base.code === 0) say('base: green');
    else {
      say(`base: ALREADY RED on ${[...base.red].slice(0, 8).join(', ') || 'nothing it could name, so it failed to run'}`);
      if (base.red.size === 0) {
        for (const line of base.text.split('\n').filter((l) => l.trim() !== '').slice(-6)) say(`  base: ${line.trim().slice(0, 240)}`);
      }
      if (process.env['P340_ALLOW_RED_BASE'] !== '1') {
        problems.push('conformance:machines was red before any ablation ran. Every reading below is still a DELTA against that base, but re-run with P340_ALLOW_RED_BASE=1 once you know why.');
      }
    }
    for (const entry of wanted) {
      try {
        const unapplied = editsOf(entry).filter((edit) => !ablate(entry.file, edit.from, edit.to));
        if (unapplied.length > 0) {
          problems.push(
            `${entry.n} "${entry.name}": the shape to ablate is not in ${entry.file}. Either the clause moved, and this entry moves with it in the same commit, or it is gone and its owner is unproven. It looked for: ${String(unapplied[0].from).slice(0, 200)}`
          );
          table.push([entry.n, entry.owners.join(' ') || 'control', 'SHAPE MISSING', '']);
          continue;
        }
        ran += 1;
        const out = runGate();
        const newlyRed = new Set([...out.red].filter((r) => !base.red.has(r)));
        const shown = [...newlyRed].map((r) => r.slice(0, 70));
        const control = entry.owners.length === 0;
        const missingOwners = entry.owners.filter((o) => !newlyRed.has(o));
        const verdict = control
          ? newlyRed.size === 0 && out.code === base.code
            ? 'green'
            : 'CONTROL RED'
          : out.code === 0
            ? 'GREEN'
            : missingOwners.length === 0
              ? 'red'
              : 'RED ELSEWHERE';
        table.push([entry.n, entry.owners.join(' ') || 'control', verdict, shown.join(' | ').slice(0, 160)]);
        say(`${entry.n.padEnd(8)} ${entry.name}: exit ${String(out.code)}, newly red ${shown.join(' | ').slice(0, 240) || 'nothing'}`);
        if (control) {
          if (verdict !== 'green') problems.push(`${entry.n} "${entry.name}": the gate moved on a comment (newly red ${shown.join(' | ') || 'nothing'}, exit ${String(out.code)}). ${entry.why}`);
        } else if (out.code === 0 || newlyRed.size === 0) {
          problems.push(`${entry.n} "${entry.name}": the gate stayed GREEN. ${entry.why} Nothing notices, so ${entry.owners.join(' and ')} is decoration.`);
        } else if (missingOwners.length > 0) {
          problems.push(`${entry.n} "${entry.name}": the gate went red but ${missingOwners.join(' and ')} did not (red instead: ${shown.join(' | ') || 'nothing named'}).`);
        }
      } finally {
        restore(entry.file);
      }
    }
    const after = runGate();
    if (after.code !== base.code || [...after.red].some((r) => !base.red.has(r))) {
      problems.push(`after every file was restored the gate exited ${String(after.code)} (red ${[...after.red].join(', ') || 'nothing'}) where the base exited ${String(base.code)}, so a restore did not land.`);
    } else {
      say(`restored: every touched clone file matches the worktree by sha256, and the gate is back where it started (exit ${String(after.code)})`);
    }
  } catch (err) {
    problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clean();
  }

  for (const [file, before] of worktreeBefore) {
    const now = existsSync(join(REPO, file)) ? sha(readFileSync(join(REPO, file))) : null;
    if (now !== before) {
      problems.push(`${file} in the WORKTREE changed during the run (${String(before).slice(0, 12)} to ${String(now).slice(0, 12)}); this harness writes only its clone, so another process wrote it`);
    }
  }

  process.stdout.write('\n');
  for (const [n, owner, verdict, red] of table) {
    process.stdout.write(`${TAG}   ${n.padEnd(8)} ${owner.padEnd(12)} ${verdict.padEnd(14)} ${red}\n`);
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (problems.length > 0) {
    process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
    for (const p of problems) process.stdout.write(`  - ${p}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `\n${TAG} PASS in ${seconds} s. ${String(ran)} arms, one clause each: every ablation reddened THE CONDITION THAT ` +
      'OWNS IT, measured as a DELTA against the base, and the control left the gate as it found it. Every clone ' +
      'file was restored and proved by sha256, the worktree was never written, and the clone is gone. No ' +
      'Electron, no tmux, no ssh, no agent, no token.\n'
  );
}
