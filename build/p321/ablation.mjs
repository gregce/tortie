#!/usr/bin/env node
/**
 * `npm run ablation:p321`. THE ATTACK ON PHASE 321'S OWN CLAUSES
 * (build/p321/SPEC.md §5.3, the Phase 321 entry in docs/BACKLOG.md).
 *
 * A few minutes. It launches no Electron, starts no tmux server, spawns no
 * agent, makes no request and spends no token. It starts nothing but `cp` and
 * `node` running vitest, and it reads nothing under the person's home.
 *
 * ## Why it exists
 *
 * Over the committed corpus no single clause of a shape is needed: every live
 * question carries all four of its properties and every other screen fails more
 * than one. So a shape could lose its focus clause, its tail clause or its hint
 * clause and every corpus row would stay green. What owns each clause is a
 * ONE-CLAUSE-OFF TWIN in `p321-shapes.test.ts`, a real question screen with
 * exactly that one property taken away. THIS SCRIPT PROVES THE OWNERSHIP: it
 * removes one clause at a time from the SHIPPING source and requires the row
 * that owns it to go red BY NAME. The same for the state machine's dialog
 * line, the FOREGROUND GATE the operator's ruling of 2026-09-23 added (a shape
 * is asked only while the session's agent holds the pane's terminal), the
 * monitor's one read behind it, and the registry rows that switch the shapes
 * on. The gate's owners are in `p321-foreground.test.ts`, which drives the
 * SHIPPING monitor over the reverify's hostile shells, and in
 * `p321-masking.test.ts`.
 *
 * THE GATE'S OWN RULE (the operator's ruling of 2026-09-23, "Tiny fix, then
 * land"): the reading counts a PROGRAM token only (`commandRunsAgent`), never
 * Phase 141's witness rule. F12 puts the witness rule back on the reading and
 * F13 inside the rule, and every hostile command line whose ARGUMENTS name the
 * agent must go red; F14 to F17 take the interpreter's script, the install
 * carrying its own runtime, a shell's `-c` and SpecStory's `-c` off one at a
 * time, and the install shape each one names must stop turning amber.
 *
 * ITS TWO NARROWINGS (the same ruling, after its reverify). F18 puts the
 * directory rule from before the narrowing back (any shared directory named
 * for the agent, for any row) and F19 keeps every `realpath-under` root the
 * registry names, so Claude Code reaches the rule with `versions`: the
 * project-directory rows go red. F20 counts a shell's `-c` whatever it holds
 * and F21 stops reading a newline as `ps` prints it: the compound `-c` rows
 * go red.
 *
 * THE FIX ROUND (build/p321/SPEC.md §12.9) removed four of the six shapes and
 * antigravity's repaint exemption whole, and the operator's ruling of
 * 2026-09-23 removed grok's resident-helper rule whole (§12.10), so their arms
 * went with them: an arm for a clause that no longer exists would be an arm
 * whose needle matches nothing, which this script already refuses.
 *
 * ## It never writes into the working tree
 *
 * Three builders work in one worktree during a phase, and a harness that
 * writes into `src/` even for the seconds a test takes can lose another
 * builder's edit. So it builds a CLONE, `build/ablation-p314.mjs`'s shape:
 * `cp -Rc` (APFS clonefile) of `src/` and of `build/fixtures/questions/` under
 * `/private/tmp/p321-ablation-<pid>-…`, `vitest.config.ts`, `package.json` and
 * every tsconfig copied, `node_modules` symlinked, and vitest run there with
 * that directory as its cwd. Each edited file is put back and CHECKED BY
 * SHA256 against the worktree's bytes before the next arm; the clone is removed
 * in a `finally` and on a signal; and the run ends by asserting that the
 * worktree's own bytes never moved.
 *
 * ## The rules each arm is held to
 *
 *   - Its needle matches the shipping source EXACTLY ONCE. Zero means the
 *     clause moved and this arm moves with it in the same commit; two means an
 *     edit could land on the wrong occurrence and prove nothing.
 *   - Every row it names as the OWNER goes red. Other rows going red too is
 *     printed, and is not a failure.
 *   - An UNEDITED CONTROL, both files, is green first, and again at the end.
 *
 * Usage:
 *   node build/p321/ablation.mjs
 *   P321_ONLY=S1,F1 node build/p321/ablation.mjs        named arms only
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[ablation:p321]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const SCREEN = 'src/main/activity/screen.ts';
const MACHINE = 'src/main/activity/state-machine.ts';
const MONITOR = 'src/main/activity/monitor.ts';
const REGISTRY = 'src/main/agents/registry.ts';

const SHAPES_TEST = 'src/main/activity/__tests__/p321-shapes.test.ts';
const MASKING_TEST = 'src/main/activity/__tests__/p321-masking.test.ts';
const FOREGROUND_TEST = 'src/main/activity/__tests__/p321-foreground.test.ts';

const TWINS = 'the one-clause-off twins, each refused by the full shape';
const OWN = 'each shape agent, over its own committed windows';
const ROWS = 'which rows name which shapes';
const QUIET = 'a drawn shape question reaches needs_input on a quiet screen';

// p321-foreground.test.ts, by describe.
const SHELLS = 'a program in the session’s shell that prints the agent’s question rows last never turns amber';
const RESTORED = 'a restored session before its resume never turns amber on the agent’s rows';
const HANDBACK = 'after a handback the agent’s question rows left on the screen never keep or raise amber';
const KEPT = 'the question the agent itself draws still turns amber';
const CLAUSES = 'the foreground reading, clause by clause';
const HOW = ['`tail -f` of a screen log', '`cat` of a screen log, then `sleep`', '`watch` over `tmux capture-pane`'];

/** Every hostile shell the reverify found, for both kept agents: the gate's owners. */
const HOSTILE = [
  ...['qwen', 'claude'].flatMap((agent) => HOW.map((how) => `${SHELLS} > ${agent}: ${how}, at 1 s and at 2 s`)),
  ...['qwen', 'claude'].map((agent) => `${RESTORED} > ${agent}: the login shell at its prompt holds the terminal, under the replayed rows`),
  `${HANDBACK} > qwen: raised while qwen held the terminal, released once it left, and never raised again`,
  `${HANDBACK} > claude: the gate rows left by a Claude Code that exited never raise amber`
];
const OWN_PROGRAM = ['qwen', 'claude'].map((agent) => `${KEPT} > ${agent}: as the pane's own program, the way Tortie creates a session`);

// The gate's own rule (the operator's ruling of 2026-09-23, "Tiny fix, then
// land"): the command lines p321-foreground.test.ts writes, spelled again here
// so a row renamed there reads as an owner that stayed green, never as a pass.
const ARGUMENTS = 'a program whose ARGUMENTS name the agent is not the agent, and never turns amber';
const INSTALL = 'every install shape of the two agents with a shape is the agent, and its question turns amber';
const RULE = 'commandRunsAgent, clause by clause';
const hostileArgv = (a) => [
  `tail -f /tmp/${a}-screen`,
  `tail -f ./${a}-2`,
  `less /Users/example/logs/${a}/screen`,
  `vim /Users/example/work/${a}-demo/Makefile`,
  `watch -n 60 tmux capture-pane -p -t ${a}`,
  `tail -f /private/tmp/${a}-501/-Users-example-work/0f1e2d3c/scratchpad/screen`,
  `/private/tmp/${a}-501/x/watch 60 tmux capture-pane -p -t %1`,
  `tail -f /Users/example/logs/${a}`,
  `sh -c tail -f /tmp/${a}-screen; sleep 600`,
  `node /private/tmp/${a}-501/x/replay.mjs`
];
/** Every hostile argv, both kept agents: the owners of the gate's own rule. */
const HOSTILE_ARGV = ['qwen', 'claude'].flatMap((agent) =>
  hostileArgv(agent).map((argv) => `${ARGUMENTS} > ${agent}: \`${argv}\`, as the shell’s job, at 1 s and at 2 s`)
);
const INSTALL_ROW = (agent, what) => `${INSTALL} > ${agent}: ${what}`;
const STANDALONE = [
  INSTALL_ROW('qwen', 'its standalone installer’s node exec (this Mac’s qwen 0.22.0)'),
  INSTALL_ROW('qwen', 'its standalone installer, resumed')
];
const UNDER_NODE = [
  INSTALL_ROW('qwen', 'npm’s bin script under node'),
  INSTALL_ROW('qwen', 'Homebrew’s formula under its node, the shebang rewritten to an absolute interpreter'),
  INSTALL_ROW('claude', 'npm’s bin script under node'),
  INSTALL_ROW('claude', 'the old `~/.claude/local` script under node')
];
const SHELL_JOB = ['qwen', 'claude'].map((agent) => `${KEPT} > ${agent}: as the login shell's job, a restored session he resumed`);

// The two narrowings, spelled again for the same reason.
const PROJECT = 'a directory named for the agent that is not its install root is not the agent, and never turns amber';
const COMPOUND = 'a shell whose `-c` string is more than one simple command is not the agent, and never turns amber';
const EXACT_ROOT = `${RULE} > a directory counts only for an install carrying its own runtime: an absolute interpreter and script whose DEEPEST shared directory is EXACTLY the row’s install root`;
const FROM_REGISTRY = `${RULE} > the install root is READ FROM THE REGISTRY, and only qwen’s row names one, so Claude Code never reaches it`;
const ONE_COMMAND = `${RULE} > a shell’s \`-c\` counts only when it is ONE simple command`;
const PROJECT_ROW = (agent, what) => `${PROJECT} > ${agent}: ${what}, as the shell’s job, at 1 s and at 2 s`;
/** Every project-directory row the rule before the narrowing accepted, both kept agents. */
const PROJECT_NAMED = ['qwen', 'claude'].flatMap((agent) => [
  PROJECT_ROW(agent, 'the reverify’s project directory named for the agent'),
  PROJECT_ROW(agent, 'a project directory named exactly for the agent'),
  PROJECT_ROW(agent, 'qwen’s install shape under a directory that only begins with its root’s name')
]).concat([PROJECT_ROW('claude', 'qwen’s install shape under a root named for Claude Code, which its row does not name')]);
/** The pair under Claude Code's own signature directory, which only a row filter taken off reaches. */
const UNDER_VERSIONS = PROJECT_ROW('claude', 'a pair under Claude Code’s own signature directory, which names versions and no install root');
const UUID = '1b2c3d4e-0000-4000-8000-000000000000';
const INVOKE = { qwen: `qwen --resume ${UUID}`, claude: `claude --session-id ${UUID}` };
const compoundC = (a) => {
  const inv = INVOKE[a];
  return [
    [`sh -c ${inv} && sleep 600`, '`&&`, the reverify’s'],
    [`bash -c ${inv} || sleep 600`, '`||`'],
    [`sh -c ${inv}; sleep 600`, '`;`'],
    [`sh -c ${inv} & sleep 600`, '`&`'],
    [`zsh -c ${inv} | tee /tmp/${a}.log`, '`|`'],
    [`sh -c ${inv}&&sleep 600`, '`&&` written against its words'],
    [`sh -c ${inv}\\012sleep 600`, 'a newline'],
    [`bash -c ${inv} $(cat /tmp/${a}-args)`, 'a substitution'],
    [`bash -c ${inv} \`cat /tmp/${a}-args\``, 'a backtick'],
    [`bash -c ${inv} <(sleep 600)`, 'a process substitution, a subshell']
  ];
};
const COMPOUND_ROW = (agent, argv, what) =>
  `${COMPOUND} > ${agent}: \`${argv}\` (${what}), the agent gone and \`sleep\` running, at 1 s and at 2 s`;
/** Every compound `-c` row, both kept agents. */
const COMPOUND_ROWS = ['qwen', 'claude'].flatMap((agent) => compoundC(agent).map(([argv, what]) => COMPOUND_ROW(agent, argv, what)));
/** The rows whose string holds a newline as `ps` prints one. */
const NEWLINE_ROWS = ['qwen', 'claude'].flatMap((agent) =>
  compoundC(agent).filter(([, what]) => what === 'a newline').map(([argv, what]) => COMPOUND_ROW(agent, argv, what))
);

// ---------------------------------------------------------------------------
// The shape arms, generated from the shipping table one clause at a time
// ---------------------------------------------------------------------------

/** Each shape's primary positive fixtures, whose twins own its clauses. */
const SHAPE_FIXTURES = {
  'qwen-confirmation': ['qwen-run-permission.txt', 'qwen-run-permission-scrollbar.txt'],
  'claude-trust-gate': ['claude-trust-2-1-280.txt']
};

/**
 * What removing each clause means, as source. The hint becomes "any inked
 * row", so the shape anchors on the question's own last row. The focus
 * becomes "any inked row" and the option "any row at all", and the tail
 * becomes unbounded.
 */
const CLAUSE = {
  hint: () => '    hint: /[^]/,',
  tail: () => '    tail: 99,',
  focus: () => '    focus: /[^]/,',
  // `(?:)` matches every row, a blank one included: "any row is an option".
  option: () => '    option: /(?:)/,'
};
const TWIN_OF = { hint: 'hint', tail: 'tail', focus: 'focus', option: 'options' };

/** The shape's own block in the shipping table, byte for byte. */
function shapeBlock(source, id) {
  const open = `  '${id}': {\n`;
  const at = source.indexOf(open);
  if (at < 0) return null;
  const end = source.indexOf('\n  }', at);
  if (end < 0) return null;
  return source.slice(at, end + 4);
}

function shapeArms(screen) {
  const arms = [];
  let n = 0;
  for (const [id, files] of Object.entries(SHAPE_FIXTURES)) {
    const block = shapeBlock(screen, id);
    for (const clause of ['hint', 'tail', 'focus', 'option']) {
      n += 1;
      const arm = {
        n: `S${String(n)}`,
        name: `${id}: its ${clause} clause removed`,
        file: SCREEN,
        tests: [SHAPES_TEST],
        owners: files.map((f) => `${TWINS} > ${f}: the ${TWIN_OF[clause]} twin reads false`)
      };
      if (block === null) {
        arms.push({ ...arm, find: `  '${id}': {\n`, to: null });
        continue;
      }
      const line = block.split('\n').find((l) => l.startsWith(`    ${clause}: `));
      if (line === undefined) {
        arms.push({ ...arm, find: `    ${clause}: `, to: null });
        continue;
      }
      arms.push({ ...arm, find: block, to: block.replace(line, CLAUSE[clause](id)), line });
    }
  }
  return arms;
}

// ---------------------------------------------------------------------------
// The rule arms, written by hand
// ---------------------------------------------------------------------------

const RULE_ARMS = [
  {
    n: 'D1',
    name: 'detectShapes answers for a non-empty list without its guard (the empty list is read)',
    file: SCREEN,
    tests: [SHAPES_TEST],
    find: '  if (shapes.length === 0) return false;\n',
    to: '',
    owners: [`${ROWS} > an empty list answers false before it reads the capture at all`]
  },
  {
    n: 'M1',
    name: 'the shapes dropped from the dialog line, so a shape is read and nothing is raised',
    file: MACHINE,
    tests: [FOREGROUND_TEST, MASKING_TEST],
    find: '  const dialog = numbered || shaped;',
    to: '  const dialog = numbered;',
    owners: [
      ...OWN_PROGRAM,
      `${QUIET} > qwen: qwen-run-permission.txt at 1 s and at 2 s, as the pane's own program, where the parent never raised it`,
      `${QUIET} > claude: claude-trust-2-1-280.txt at 1 s and at 2 s, as the pane's own program, where the parent never raised it`
    ]
  },
  {
    n: 'F1',
    name: 'THE GATE removed: a shape is asked whatever holds the terminal (the reverify’s finding, back)',
    file: MACHINE,
    tests: [FOREGROUND_TEST, MASKING_TEST],
    find: '    agentHoldsTerminal(pane, st, ctx.proc) &&\n',
    to: '',
    owners: [
      ...HOSTILE,
      `${CLAUSES} > the pane’s own program execs a shell under the same pid: the old reading no longer stands`,
      `${CLAUSES} > another program under the same tmux name takes the terminal: the table, not the name, says who holds it`,
      `${QUIET} > the same question with a process holding the terminal whose command line names no agent is never raised`
    ]
  },
  {
    n: 'F2',
    name: 'the gate ignores what the reading found: any process holding the terminal passes',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '  if (known === null || !known.agent) return false;',
    to: '  if (known === null) return false;',
    owners: HOSTILE
  },
  {
    n: 'F3',
    name: 'the gate ignores tmux renaming the foreground program, so a tick with no table carries a reading that ended',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '  if (known.name !== pane.currentCommand) return false;\n',
    to: '',
    owners: [`${CLAUSES} > on a tick with no table, tmux renaming the foreground program ends the reading`]
  },
  {
    n: 'F4',
    name: 'the gate ignores the table: a reading stands when no process holds the terminal',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '  return proc === null || foregroundProgram(proc, pane.panePid) === known.pid;',
    to: '  return true;',
    owners: [`${CLAUSES} > a table in which nothing holds the terminal ends the reading`]
  },
  {
    n: 'F5',
    name: 'the monitor never reads again when tmux renames the program under the same pid (an exec)',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '  if (known !== null && known.pid === pid && known.name === pane.currentCommand) {',
    to: '  if (known !== null && known.pid === pid) {',
    owners: [`${KEPT} > qwen: its launcher execs node, and the monitor reads the foreground again when tmux renames it`]
  },
  {
    n: 'F6',
    name: 'the monitor never reads again when a new pid holds the terminal under the same tmux name',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '  if (known !== null && known.pid === pid && known.name === pane.currentCommand) {',
    to: '  if (known !== null && known.name === pane.currentCommand) {',
    owners: [`${CLAUSES} > qwen relaunched in the same shell: a new pid under the same tmux name is read again, and its question turns amber`]
  },
  {
    n: 'F7',
    name: 'the foreground is always the pane’s own program, so an agent that is the login shell’s job is never read',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '  return own ? panePid : foregroundChildOf(proc, panePid);',
    to: '  return panePid;',
    owners: SHELL_JOB
  },
  {
    n: 'F8',
    name: 'the foreground is never the pane’s own program, so an agent Tortie created is never read',
    file: MACHINE,
    tests: [FOREGROUND_TEST, MASKING_TEST],
    find: '  return own ? panePid : foregroundChildOf(proc, panePid);',
    to: '  return foregroundChildOf(proc, panePid);',
    owners: [
      ...OWN_PROGRAM,
      `${QUIET} > qwen: qwen-run-permission.txt at 1 s and at 2 s, as the pane's own program, where the parent never raised it`
    ]
  },
  {
    n: 'F9',
    name: 'any command line counts as the agent (the program-token rule dropped from the reading)',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '    agent: command !== null && commandRunsAgent(command, binaryCandidatesFor(agent), bundledRootsFor(agent))',
    to: '    agent: command !== null',
    owners: [...HOSTILE, ...HOSTILE_ARGV]
  },
  {
    n: 'F12',
    name: 'the reading asks Phase 141’s witness rule again, so a program whose ARGUMENT names the agent passes (the reverify’s finding, back)',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '    agent: command !== null && commandRunsAgent(command, binaryCandidatesFor(agent), bundledRootsFor(agent))',
    to: '    agent: command !== null && commandNamesAgent(command, binaryCandidatesFor(agent))',
    owners: HOSTILE_ARGV
  },
  {
    n: 'F13',
    name: 'the gate’s rule answers as Phase 141’s witness rule does, every token examined',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '  const tokens = command.split(/\\s+/).filter((t) => t.length > 0);\n',
    to: '  return commandNamesAgent(command, candidates);\n  const tokens = command.split(/\\s+/).filter((t) => t.length > 0);\n',
    owners: [
      ...HOSTILE_ARGV,
      `${RULE} > an interpreter’s script is its first argument that is not an option, \`run\` skipped`,
      `${RULE} > a shell’s \`-c\` counts only among its leading options, and only its first word`,
      `${RULE} > SpecStory counts only as \`run\` with a \`-c\`, by the \`-c\` string’s first word`,
      EXACT_ROOT
    ]
  },
  {
    n: 'F14',
    name: 'an interpreter’s script no longer names the agent, so npm’s and Homebrew’s bin scripts are never the agent',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '  return names(script) || (script !== undefined && bundledRuntime(first, script, roots));',
    to: '  return script !== undefined && bundledRuntime(first, script, roots);',
    owners: [...UNDER_NODE, `${RULE} > an interpreter’s script is its first argument that is not an option, \`run\` skipped`]
  },
  {
    n: 'F15',
    name: 'an install carrying its own runtime no longer names the agent, so qwen’s standalone install is never the agent',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '  return names(script) || (script !== undefined && bundledRuntime(first, script, roots));',
    to: '  return names(script);',
    owners: [
      ...STANDALONE,
      OWN_PROGRAM[0],
      SHELL_JOB[0],
      `${KEPT} > qwen: its launcher execs node, and the monitor reads the foreground again when tmux renames it`,
      EXACT_ROOT
    ]
  },
  {
    n: 'F16',
    name: 'a shell’s `-c` no longer names the agent',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '  if (C_SHELLS.has(program)) return names(shellCommandWord(tokens));\n',
    to: '',
    owners: [
      INSTALL_ROW('qwen', 'a one-element argv tmux handed its shell, not yet exec’d'),
      `${RULE} > a shell’s \`-c\` counts only among its leading options, and only its first word`
    ]
  },
  {
    n: 'F17',
    name: 'SpecStory’s `-c` no longer names the agent, so a captured Claude Code is never the agent',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: "    return tokens[1] === 'run' && c > 0 && names(tokens[c + 1]);",
    to: '    return false;',
    owners: [INSTALL_ROW('claude', 'under SpecStory capture')]
  },
  {
    n: 'F18',
    name: 'the directory rule from before the narrowing: any shared directory named for the agent, for any row (the reverify’s `qwen-demo` and `claude-demo`, back)',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '  return names(script) || (script !== undefined && bundledRuntime(first, script, roots));',
    // The rule exactly as it read before this round, inlined at its one call site.
    to:
      '  return names(script) || (script !== undefined && ((i, s) => {\n' +
      "    if (!i.startsWith('/') || !s.startsWith('/')) return false;\n" +
      "    const a = i.split('/').slice(0, -1);\n" +
      "    const b = s.split('/').slice(0, -1);\n" +
      '    let n = 0;\n' +
      '    while (n < a.length && n < b.length && a[n] === b[n]) n += 1;\n' +
      "    const r = n > 1 ? a[n - 1] ?? '' : '';\n" +
      '    return r.length > 0 && candidates.some((c) => r === c || r.startsWith(`${c}-`));\n' +
      '  })(first, script));',
    owners: [...PROJECT_NAMED, EXACT_ROOT]
  },
  {
    n: 'F19',
    name: 'every `realpath-under` root the registry names is kept, named for the agent or not, so Claude Code reaches the rule with `versions`',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '    if (candidates.some((c) => root === c || root.startsWith(`${c}-`))) roots.push(root);',
    to: '    roots.push(root);',
    owners: [UNDER_VERSIONS, EXACT_ROOT, FROM_REGISTRY]
  },
  {
    n: 'F20',
    name: 'a shell’s `-c` counted whatever it holds, so `sh -c \'claude … && sleep 600\'` reads as the agent after it exits (the reverify’s finding, back)',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '      return string.some((t) => NOT_ONE_COMMAND.test(t)) ? undefined : string[0];',
    to: '      return string[0];',
    owners: [...COMPOUND_ROWS, ONE_COMMAND]
  },
  {
    n: 'F21',
    name: 'a newline as `ps` prints one (`\\012`) no longer ends a simple command',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: 'const NOT_ONE_COMMAND = /[;&|`()]|\\\\012/;',
    to: 'const NOT_ONE_COMMAND = /[;&|`()]/;',
    owners: [...NEWLINE_ROWS, ONE_COMMAND]
  },
  {
    n: 'F10',
    name: 'the monitor never reads the foreground, so no shape is ever asked',
    file: MONITOR,
    tests: [FOREGROUND_TEST],
    find: ',\n      this.readForegrounds(wantCapture, proc)\n    ]);',
    to: '\n    ]);',
    owners: [...OWN_PROGRAM, ...SHELL_JOB]
  },
  {
    n: 'F11',
    name: 'a row that lists no shape is read for its foreground too',
    file: MACHINE,
    tests: [FOREGROUND_TEST],
    find: '  if ((profile.dialogs ?? NO_SHAPES).length === 0 || proc === null) return null;',
    to: '  if (proc === null) return null;',
    owners: [`${CLAUSES} > the command line is read once for a steady foreground, and never for a row that lists no shape`]
  },
  ...[
    ['R3', 'claude', "      dialogs: ['claude-trust-gate']\n"],
    ['R4', 'qwen', "      dialogs: ['qwen-confirmation']\n"]
  ].map(([n, agent, find]) => ({
    n,
    name: `${agent}'s dialogs removed from its row`,
    file: REGISTRY,
    tests: [SHAPES_TEST],
    find,
    to: '',
    owners: [`${OWN} > ${agent}: every question window reads true with the row's shapes`]
  }))
];

// ---------------------------------------------------------------------------
// The clone, and vitest inside it
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join('/private/tmp', `p321-ablation-${String(process.pid)}-`));

function buildClone() {
  const r = spawnSync('cp', ['-Rc', join(REPO, 'src'), join(scratch, 'src')], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`cp -Rc src failed: ${r.stderr}`);
  mkdirSync(join(scratch, 'build', 'fixtures'), { recursive: true });
  const q = spawnSync(
    'cp',
    ['-Rc', join(REPO, 'build', 'fixtures', 'questions'), join(scratch, 'build', 'fixtures', 'questions')],
    { encoding: 'utf8' }
  );
  if (q.status !== 0) throw new Error(`cp -Rc build/fixtures/questions failed: ${q.stderr}`);
  const configs = ['package.json', 'vitest.config.ts', ...readdirSync(REPO).filter((f) => /^tsconfig(\.[a-z]+)?\.json$/.test(f))];
  for (const name of configs) writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
}

/** Run the named test files in the clone and answer the full name of every row that failed. */
function runTests(files) {
  const out = join(scratch, `vitest-${String(Date.now())}.json`);
  const r = spawnSync(
    process.execPath,
    [join('node_modules', 'vitest', 'vitest.mjs'), 'run', '--no-cache', '--reporter=json', `--outputFile=${out}`, ...files],
    { cwd: scratch, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300_000, env: { ...process.env, P321_CORPUS: '' } }
  );
  let report = null;
  try {
    report = JSON.parse(readFileSync(out, 'utf8'));
  } catch {
    report = null;
  }
  rmSync(out, { force: true });
  if (report === null) {
    return { code: r.status ?? 1, failed: null, ran: 0, tail: `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-12).join('\n') };
  }
  const failed = [];
  let ran = 0;
  for (const file of report.testResults ?? []) {
    for (const a of file.assertionResults ?? []) {
      ran += 1;
      if (a.status === 'failed') failed.push([...(a.ancestorTitles ?? []), a.title].join(' > '));
    }
    // A file that failed to load has no rows; name it so it is not read as green.
    if ((file.assertionResults ?? []).length === 0 && file.status === 'failed') failed.push(`${file.name} (did not load)`);
  }
  return { code: r.status ?? 1, failed, ran, tail: '' };
}

/** Put one clone file back and prove it by sha256 against the worktree. */
function restore(rel) {
  const want = readFileSync(join(REPO, rel));
  writeFileSync(join(scratch, rel), want);
  const got = readFileSync(join(scratch, rel));
  if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
}

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

const count = (text, needle) => (needle === '' ? 0 : text.split(needle).length - 1);

const problems = [];
const table = [];
const started = Date.now();
let ran = 0;
let owned = 0;

const WATCHED = [SCREEN, MACHINE, MONITOR, REGISTRY, SHAPES_TEST, MASKING_TEST, FOREGROUND_TEST];
const before = new Map(WATCHED.filter((f) => existsSync(join(REPO, f))).map((f) => [f, sha(readFileSync(join(REPO, f)))]));

try {
  buildClone();
  say(`clone at ${scratch}, node_modules symlinked, nothing under a home touched`);

  const screen = readFileSync(join(REPO, SCREEN), 'utf8');
  const arms = [...shapeArms(screen), ...RULE_ARMS];
  const only = (process.env['P321_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
  for (const name of only) {
    if (!arms.some((a) => a.n === name)) problems.push(`P321_ONLY names ${JSON.stringify(name)}, which is no arm`);
  }

  const control = runTests([SHAPES_TEST, MASKING_TEST, FOREGROUND_TEST]);
  if (control.failed === null || control.failed.length > 0 || control.ran === 0) {
    problems.push(
      `the UNEDITED control is not green (${control.failed === null ? 'no report' : `${String(control.failed.length)} red of ${String(control.ran)}`}), ` +
        `so every arm below would mean nothing. ${(control.failed ?? []).slice(0, 5).join(' | ')}${control.tail}`
    );
    throw new Error('control red');
  }
  say(`control: ${String(control.ran)} rows green over the three files`);

  for (const arm of arms) {
    if (only.length > 0 && !only.includes(arm.n)) continue;
    const shipping = readFileSync(join(REPO, arm.file), 'utf8');
    const hits = count(shipping, arm.find);
    if (arm.to === null || arm.to === undefined || hits !== 1) {
      problems.push(
        `${arm.n} "${arm.name}": its needle matches ${arm.to === null ? 'no clause' : `${String(hits)} times`} in ${arm.file}, ` +
          'not exactly once. A clause that moved moves its arm in the same commit.'
      );
      table.push([arm.n, 'NEEDLE', arm.name]);
      continue;
    }
    if (arm.line !== undefined && count(arm.find, arm.line) !== 1) {
      problems.push(`${arm.n} "${arm.name}": its clause line is not once in its block`);
      table.push([arm.n, 'NEEDLE', arm.name]);
      continue;
    }
    const path = join(scratch, arm.file);
    writeFileSync(path, shipping.replace(arm.find, () => arm.to), 'utf8');
    ran += 1;
    let got;
    try {
      got = runTests(arm.tests);
    } finally {
      restore(arm.file);
    }
    if (got.failed === null) {
      problems.push(`${arm.n} "${arm.name}": vitest produced no report. ${got.tail}`);
      table.push([arm.n, 'NO REPORT', arm.name]);
      continue;
    }
    const missing = arm.owners.filter((o) => !got.failed.includes(o));
    const others = got.failed.filter((f) => !arm.owners.includes(f));
    if (missing.length > 0) {
      problems.push(
        `${arm.n} "${arm.name}": its owner stayed GREEN: ${missing.join(' | ')}. ` +
          (others.length > 0 ? `Red instead: ${others.slice(0, 4).join(' | ')}` : 'Nothing went red, so the clause is decoration.')
      );
      table.push([arm.n, others.length > 0 ? 'RED ELSEWHERE' : 'NOTHING MOVED', arm.name]);
    } else {
      owned += 1;
      table.push([arm.n, 'owner red', `${arm.name}${others.length > 0 ? ` (and ${String(others.length)} other row${others.length === 1 ? '' : 's'})` : ''}`]);
    }
    say(`${arm.n.padEnd(4)} ${missing.length === 0 ? 'ok  ' : 'FAIL'} ${arm.name}: ${String(got.failed.length)} red of ${String(got.ran)}`);
  }

  const after = runTests([SHAPES_TEST, MASKING_TEST, FOREGROUND_TEST]);
  if (after.failed === null || after.failed.length > 0) {
    problems.push('after every file was restored the control is not green again, so a restore did not land');
  } else {
    say(`restored: every edited clone file matched the worktree by sha256, and the control is green again (${String(after.ran)} rows)`);
  }
} catch (err) {
  if (!(err instanceof Error && err.message === 'control red')) {
    problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
  }
} finally {
  clean();
}

for (const [file, was] of before) {
  const now = sha(readFileSync(join(REPO, file)));
  if (now !== was) {
    problems.push(`${file} in the WORKTREE changed during the run (${was.slice(0, 12)} to ${now.slice(0, 12)}); this harness writes only its clone`);
  }
}

process.stdout.write('\n');
for (const [n, verdict, name] of table) process.stdout.write(`${TAG}   ${n.padEnd(4)} ${verdict.padEnd(14)} ${name}\n`);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (problems.length > 0) {
  process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS in ${seconds} s. ${String(ran)} arms, one clause each, and every one turned THE ROW THAT OWNS IT red ` +
    `by name (${String(owned)} of ${String(ran)}). Every clone file was restored and proved by sha256, the worktree was ` +
    'never written, and the clone is gone. No Electron, no tmux, no agent, no token.\n'
);
