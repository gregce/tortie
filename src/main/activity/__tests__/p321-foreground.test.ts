/**
 * PHASE 321 — a question shape is read only while the session's AGENT holds
 * the pane's terminal (the operator's ruling of 2026-09-23, "One narrow round,
 * then land"; build/p321/SPEC.md §12.10).
 *
 * WHY THIS FILE EXISTS. The reverify of the fix round found the kept shapes
 * reading a program in a qwen or Claude Code session's SHELL that prints that
 * agent's question rows last and then blocks: `tail -f` of a screen log, `cat`
 * then `sleep`, `watch` over `tmux capture-pane`. No amber at the parent, amber
 * in every cell and a push at HEAD, because the shapes were read with the
 * session's agent profile whatever the pane ran: a restored session before its
 * resume, an agent that had exited, a handback. A shape asks only the screen,
 * and the screen does not say who drew it.
 *
 * THE SHIPPING MONITOR, driven over fake tmux and a fake process table the way
 * monitor.test.ts drives it: `list-panes` lines carrying `#{pane_current_command}`,
 * the table's STAT column carrying `+` for the process group holding the
 * terminal, and `ps -o command=` answered per pid. Every read the monitor makes
 * is injected, so nothing here reaches the host's `ps` or its tmux.
 *
 * Each hostile case is paired with the question itself drawn by the agent, so
 * a row that stays green because nothing could ever raise it is impossible:
 * the positives go amber through the same harness. And each hostile screen is
 * first shown to be one the parent's numbered verdict does not read, so a
 * "never amber" here is the shapes' and nothing else's. `npm run ablation:p321`
 * removes the gate and each clause of it, and the rows below that own them go
 * red.
 *
 * THE GATE'S OWN RULE (the operator's ruling of 2026-09-23, "Tiny fix, then
 * land"). The reverify of the round before found the gate accepting a program
 * that is not the agent whenever an ARGUMENT named it, because the gate asked
 * Phase 141's witness rule, which examines every token. The gate now asks
 * `commandRunsAgent`, which counts a PROGRAM token only. Every hostile command
 * line below is first shown to be one the witness rule names, so each row is
 * the gate's own rule and nothing else; and the kept catches run under every
 * install shape the registry's rows for qwen and Claude Code give, as the
 * pane's own program and as the login shell's job.
 *
 * ITS TWO NARROWINGS (the same ruling, after its reverify). An absolute
 * interpreter and script count only when the directory they share is EXACTLY
 * an install root the registry's own signature names for the row, which is
 * qwen's `qwen-code` and nothing for Claude Code, so a project directory named
 * for the agent reads no shape; and a shell's `-c` counts only when it is ONE
 * simple command, so `sh -c 'claude … && sleep 600'` reads no shape once the
 * agent in it has exited. Each hostile row below is first shown to be one the
 * rule before the narrowing accepted, by its twin with the narrowed part
 * taken away reading the agent.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { SessionStatus } from '@shared/types';
import { SessionActivityMonitor, type ActivitySession } from '../monitor';
import { parseProcTable, type ProcSnapshot, type WitnessReading } from '../process';
import { detectDialog, detectShapes, normalizeCapture } from '../screen';
import { AGENT_IDS, getRegistryEntry } from '../../agents/registry';
import {
  binaryCandidatesFor,
  bundledRootsFor,
  commandNamesAgent,
  commandRunsAgent,
  foregroundProgram
} from '../state-machine';

const fixture = (name: string): string =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf8');

const T0 = 1_800_000_000_000;
const PANE = '%1';
const PANE_PID = 500;
const JOB_PID = 930;

/** Each kept agent's command line as `ps -o command=` prints it on this Mac. */
const AGENT_COMMAND = {
  // qwen 0.22.0's launcher ends in `exec "$ROOT/node/bin/node" "$ROOT/lib/cli-entry.js"`.
  qwen: '/Users/example/.local/lib/qwen-code/node/bin/node /Users/example/.local/lib/qwen-code/lib/cli-entry.js',
  // Tortie launches Claude Code by its bare name.
  claude: 'claude --session-id 1b2c3d4e-0000-4000-8000-000000000000'
} as const;
/** What `#{pane_current_command}` reads while each agent holds the terminal. */
const AGENT_NAME = { qwen: 'node', claude: '2.1.280' } as const;
const QUESTION = {
  qwen: 'qwen-run-permission.txt',
  claude: 'claude-trust-2-1-280.txt'
} as const;
type Kept = keyof typeof QUESTION;
const KEPT: readonly Kept[] = ['qwen', 'claude'];

/** One process under the pane, with its command line. */
interface Proc {
  pid: number;
  ppid: number;
  stat: string;
  command: string;
}

class Harness {
  now = T0;
  agent: string;
  /** `#{pane_current_command}`. */
  name = 'zsh';
  /** Epoch ms of the pane's last output. */
  outputAt = T0;
  screen = '';
  procs: Proc[] = [];
  readonly statuses: SessionStatus[] = [];
  readonly reads = { table: 0, command: [] as number[] };
  readonly claudeDir = mkdtempSync(join(tmpdir(), 'gmux-p321-fg-'));
  readonly monitor: SessionActivityMonitor;

  constructor(agent: string) {
    this.agent = agent;
    const sessions: ActivitySession[] = [{ id: 's1', tmuxId: '$1', agent, cwd: '/Users/example/work' }];
    this.monitor = new SessionActivityMonitor({
      sessions: () => sessions,
      exec: (async (args: readonly string[]) => {
        if (args[0] !== 'list-panes') throw new Error(`unexpected ${String(args[0])}`);
        return [
          '$1',
          PANE,
          String(PANE_PID),
          '1',
          '0',
          '',
          '',
          String(Math.floor(this.outputAt / 1000)),
          '0',
          '0',
          '0',
          '0',
          '25000',
          this.name,
          ''
        ].join('\t');
      }) as never,
      run: async () => this.screen,
      readProc: async (): Promise<ProcSnapshot | null> => {
        this.reads.table += 1;
        return parseProcTable(
          this.procs.map((p) => `${String(p.pid)} ${String(p.ppid)} 0:00.10 ${p.stat}`).join('\n'),
          this.now
        );
      },
      readWitness: async (pid): Promise<WitnessReading> => {
        const p = this.procs.find((x) => x.pid === pid);
        return p === undefined ? { found: false, stat: '', ppid: null } : { found: true, stat: p.stat, ppid: p.ppid };
      },
      readCommand: async (pid) => {
        this.reads.command.push(pid);
        return this.procs.find((x) => x.pid === pid)?.command ?? null;
      },
      readChildren: async (pid) => this.procs.filter((x) => x.ppid === pid).map((x) => x.pid),
      claudeSessionsDir: this.claudeDir,
      onStatus: (_id, status) => this.statuses.push(status),
      onActivity: () => undefined,
      onDead: () => undefined,
      now: () => this.now
    });
  }

  /** The pane printed something now. */
  print(screen: string): void {
    this.screen = screen;
    this.outputAt = this.now;
  }

  async ticks(n: number, cadence: number): Promise<void> {
    for (let i = 0; i < n; i++) {
      this.now += cadence * 1000;
      await this.monitor.tick();
    }
  }

  get state(): SessionStatus | undefined {
    return this.statuses.at(-1);
  }

  raised(): boolean {
    return this.statuses.includes('needs_input');
  }

  dispose(): void {
    this.monitor.dispose();
    rmSync(this.claudeDir, { recursive: true, force: true });
  }
}

let open: Harness[] = [];
afterEach(() => {
  for (const x of open) x.dispose();
  open = [];
});
const harness = (agent: string): Harness => {
  const x = new Harness(agent);
  open.push(x);
  return x;
};

const CADENCES = [1, 2] as const;
/** Where in its first second the first tick lands. */
const PHASES = [0, 0.3, 0.7] as const;

/** The pane runs the login shell, which has given the terminal to a job. */
const shellWithJob = (command: string, name: string): { procs: Proc[]; name: string } => ({
  procs: [
    { pid: PANE_PID, ppid: 1, stat: 'Ss', command: '-zsh' },
    { pid: JOB_PID, ppid: PANE_PID, stat: 'S+', command }
  ],
  name
});

// ---------------------------------------------------------------------------
// The hostile screens: the agent's own question rows, drawn LAST by something
// that is not the agent
// ---------------------------------------------------------------------------

/** `watch -n 60 tmux capture-pane -p -t %1`: watch's header, a blank, then the capture. */
const watched = (question: string): string =>
  `Every 60.0s: tmux capture-pane -p -t %1                    host: Tue Sep 23 12:00:00 2026\n\n${question}`;

describe('the hostile screens are ones the parent never read, and the kept shapes do', () => {
  it('each is not the numbered verdict, and each is the agent’s own shape', () => {
    for (const agent of KEPT) {
      const q = fixture(QUESTION[agent]);
      for (const screen of [q, watched(q)]) {
        const normalized = normalizeCapture(screen);
        expect(detectDialog(normalized), agent).toBe(false);
        expect(detectShapes(normalized, agent === 'qwen' ? ['qwen-confirmation'] : ['claude-trust-gate']), agent).toBe(true);
      }
    }
  });
});

describe('a program in the session’s shell that prints the agent’s question rows last never turns amber', () => {
  const cases: Array<[string, (q: string) => string, { procs: Proc[]; name: string }]> = [
    ['`tail -f` of a screen log', (q) => q, shellWithJob('tail -f /Users/example/screen.log', 'tail')],
    ['`cat` of a screen log, then `sleep`', (q) => q, shellWithJob('sleep 600', 'sleep')],
    ['`watch` over `tmux capture-pane`', watched, shellWithJob('watch -n 60 tmux capture-pane -p -t %1', 'watch')]
  ];
  for (const agent of KEPT) {
    for (const [what, draw, pane] of cases) {
      it(`${agent}: ${what}, at 1 s and at 2 s`, async () => {
        for (const cadence of CADENCES) {
          for (const phase of PHASES) {
            const h = harness(agent);
            h.procs = pane.procs;
            h.name = pane.name;
            h.now += phase * 1000;
            h.print(draw(fixture(QUESTION[agent])));
            await h.ticks(Math.ceil(40 / cadence), cadence);
            expect(h.raised(), `${agent} ${what} cadence ${String(cadence)} phase ${String(phase)}`).toBe(false);
          }
        }
      });
    }
  }
});

describe('a restored session before its resume never turns amber on the agent’s rows', () => {
  for (const agent of KEPT) {
    it(`${agent}: the login shell at its prompt holds the terminal, under the replayed rows`, async () => {
      for (const cadence of CADENCES) {
        const h = harness(agent);
        // What restore spawns: the login shell, holding the terminal, nothing
        // under it. The snapshot replay leaves the last life's question as the
        // last rows, and a prompt that draws nothing below them is the hostile
        // case: an ordinary prompt row below would refuse it by itself.
        h.procs = [{ pid: PANE_PID, ppid: 1, stat: 'Ss+', command: '-zsh' }];
        h.name = 'zsh';
        h.print(fixture(QUESTION[agent]));
        await h.ticks(Math.ceil(40 / cadence), cadence);
        expect(h.raised(), `${agent} cadence ${String(cadence)}`).toBe(false);
      }
    });
  }
});

describe('after a handback the agent’s question rows left on the screen never keep or raise amber', () => {
  it('qwen: raised while qwen held the terminal, released once it left, and never raised again', async () => {
    for (const cadence of CADENCES) {
      const h = harness('qwen');
      // Restored and resumed: the login shell's job is qwen.
      h.procs = shellWithJob(AGENT_COMMAND.qwen, AGENT_NAME.qwen).procs;
      h.name = AGENT_NAME.qwen;
      h.print(fixture(QUESTION.qwen));
      await h.ticks(Math.ceil(20 / cadence), cadence);
      expect(h.state, `the question while qwen held it, cadence ${String(cadence)}`).toBe('needs_input');
      // qwen exits. The shell takes the terminal back and its prompt draws
      // nothing below the rows qwen left.
      h.procs = [{ pid: PANE_PID, ppid: 1, stat: 'Ss+', command: '-zsh' }];
      h.name = 'zsh';
      h.outputAt = h.now;
      await h.ticks(Math.ceil(12 / cadence), cadence);
      expect(h.monitor.handbackFor('s1'), `cadence ${String(cadence)}`).toBe('left');
      const at = h.statuses.length;
      await h.ticks(Math.ceil(60 / cadence), cadence);
      expect(h.state, `cadence ${String(cadence)}`).not.toBe('needs_input');
      expect(h.statuses.slice(at).includes('needs_input'), `re-raised after the handback, cadence ${String(cadence)}`).toBe(false);
    }
  });

  it('claude: the gate rows left by a Claude Code that exited never raise amber', async () => {
    for (const cadence of CADENCES) {
      const h = harness('claude');
      h.procs = [{ pid: PANE_PID, ppid: 1, stat: 'Ss+', command: '-zsh' }];
      h.name = 'zsh';
      h.print(fixture(QUESTION.claude));
      await h.ticks(Math.ceil(40 / cadence), cadence);
      expect(h.raised(), `cadence ${String(cadence)}`).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// The kept catches, through the same harness
// ---------------------------------------------------------------------------

describe('the question the agent itself draws still turns amber', () => {
  for (const agent of KEPT) {
    it(`${agent}: as the pane's own program, the way Tortie creates a session`, async () => {
      for (const cadence of CADENCES) {
        for (const phase of PHASES) {
          const h = harness(agent);
          h.procs = [{ pid: PANE_PID, ppid: 1, stat: 'Ss+', command: AGENT_COMMAND[agent] }];
          h.name = AGENT_NAME[agent];
          h.now += phase * 1000;
          h.print(fixture(QUESTION[agent]));
          await h.ticks(Math.ceil(20 / cadence), cadence);
          expect(h.state, `${agent} cadence ${String(cadence)} phase ${String(phase)}`).toBe('needs_input');
        }
      }
    });
    it(`${agent}: as the login shell's job, a restored session he resumed`, async () => {
      for (const cadence of CADENCES) {
        const h = harness(agent);
        const pane = shellWithJob(AGENT_COMMAND[agent], AGENT_NAME[agent]);
        h.procs = pane.procs;
        h.name = pane.name;
        h.print(fixture(QUESTION[agent]));
        await h.ticks(Math.ceil(20 / cadence), cadence);
        expect(h.state, `${agent} cadence ${String(cadence)}`).toBe('needs_input');
      }
    });
  }

  it('qwen: its launcher execs node, and the monitor reads the foreground again when tmux renames it', async () => {
    for (const cadence of CADENCES) {
      const h = harness('qwen');
      // The first read lands while the pane's own program is still qwen's sh
      // launcher; then it execs node, the same pid under another name.
      h.procs = [{ pid: PANE_PID, ppid: 1, stat: 'Ss+', command: '/bin/sh /Users/example/.local/bin/qwen' }];
      h.name = 'sh';
      h.print('');
      await h.ticks(2, cadence);
      h.procs = [{ pid: PANE_PID, ppid: 1, stat: 'Ss+', command: AGENT_COMMAND.qwen }];
      h.name = 'node';
      h.print(fixture(QUESTION.qwen));
      await h.ticks(Math.ceil(20 / cadence), cadence);
      expect(h.state, `cadence ${String(cadence)}`).toBe('needs_input');
    }
  });
});

// ---------------------------------------------------------------------------
// The gate's own rule: only a PROGRAM token names the agent
// ---------------------------------------------------------------------------

/**
 * The reverify's hostile command lines, each a program that is NOT the agent
 * whose arguments name it, as `ps -o command=` prints them (the shell has
 * expanded `~`), with tmux's name for the program holding the terminal.
 */
const hostileArgv = (a: Kept): Array<[string, string]> => [
  [`tail -f /tmp/${a}-screen`, 'tail'],
  [`tail -f ./${a}-2`, 'tail'],
  [`less /Users/example/logs/${a}/screen`, 'less'],
  [`vim /Users/example/work/${a}-demo/Makefile`, 'vim'],
  [`watch -n 60 tmux capture-pane -p -t ${a}`, 'watch'],
  // An extensionless path under a directory named like Claude Code's own
  // scratch root, as an argument and as the program itself.
  [`tail -f /private/tmp/${a}-501/-Users-example-work/0f1e2d3c/scratchpad/screen`, 'tail'],
  [`/private/tmp/${a}-501/x/watch 60 tmux capture-pane -p -t %1`, 'watch'],
  // A path whose basename IS the agent's binary name.
  [`tail -f /Users/example/logs/${a}`, 'tail'],
  // A shell's `-c` whose first word is not the agent, and an interpreter
  // whose script lies under a directory named for it (the replay harness's
  // own shape), neither of them an install carrying its own runtime.
  [`sh -c tail -f /tmp/${a}-screen; sleep 600`, 'sh'],
  [`node /private/tmp/${a}-501/x/replay.mjs`, 'node']
];

describe('a program whose ARGUMENTS name the agent is not the agent, and never turns amber', () => {
  for (const agent of KEPT) {
    for (const [argv, name] of hostileArgv(agent)) {
      it(`${agent}: \`${argv}\`, as the shell’s job, at 1 s and at 2 s`, async () => {
        // Phase 141's witness rule names it, so this row is the gate's own rule.
        expect(commandNamesAgent(argv, binaryCandidatesFor(agent)), 'the witness rule refuses it, so this row tests nothing').toBe(true);
        for (const cadence of CADENCES) {
          const h = harness(agent);
          const pane = shellWithJob(argv, name);
          h.procs = pane.procs;
          h.name = pane.name;
          h.print(fixture(QUESTION[agent]));
          await h.ticks(Math.ceil(40 / cadence), cadence);
          expect(h.reads.command, `the gate never read ${argv}, so this row tests nothing`).toContain(JOB_PID);
          expect(h.raised(), `${agent} ${argv} cadence ${String(cadence)}`).toBe(false);
        }
      });
    }
  }
});

const UUID = '1b2c3d4e-0000-4000-8000-000000000000';
/**
 * Every install shape the registry's rows for the two agents with a shape
 * give, as `ps -o command=` prints the process holding the terminal, with
 * tmux's name for it. This Mac's are qwen 0.22.0's standalone install under
 * `~/.local/lib/qwen-code` and Claude Code's installer under
 * `~/.local/share/claude/versions` (the home written as /Users/example);
 * the npm and Homebrew formula shapes run a bin script under
 * `#!/usr/bin/env node`, and a captured session runs under Tortie's own
 * SpecStory.
 */
const INSTALLS: Array<{ agent: Kept; what: string; argv: string; name: string; as: ReadonlyArray<'own' | 'job'> }> = [
  { agent: 'qwen', what: 'its standalone installer’s node exec (this Mac’s qwen 0.22.0)', argv: AGENT_COMMAND.qwen, name: 'node', as: ['own', 'job'] },
  { agent: 'qwen', what: 'its standalone installer, resumed', argv: `${AGENT_COMMAND.qwen} --resume ${UUID}`, name: 'node', as: ['job'] },
  { agent: 'qwen', what: 'npm’s bin script under node', argv: `node /Users/example/.nvm/versions/node/v22.23.1/bin/qwen --resume ${UUID}`, name: 'node', as: ['own', 'job'] },
  { agent: 'qwen', what: 'Homebrew’s formula under its node, the shebang rewritten to an absolute interpreter', argv: '/opt/homebrew/opt/node/bin/node /opt/homebrew/bin/qwen', name: 'node', as: ['own', 'job'] },
  { agent: 'qwen', what: 'a one-element argv tmux handed its shell, not yet exec’d', argv: 'zsh -c qwen', name: 'zsh', as: ['own'] },
  { agent: 'claude', what: 'its installer’s native binary by its bare name (this Mac’s)', argv: AGENT_COMMAND.claude, name: '2.1.280', as: ['own', 'job'] },
  { agent: 'claude', what: 'its installer’s native binary, resumed', argv: `claude --resume ${UUID}`, name: '2.1.280', as: ['job'] },
  { agent: 'claude', what: 'npm’s bin script under node', argv: `node /Users/example/.nvm/versions/node/v22.23.1/bin/claude --session-id ${UUID}`, name: 'node', as: ['own', 'job'] },
  { agent: 'claude', what: 'the old `~/.claude/local` script under node', argv: `node /Users/example/.claude/local/node_modules/.bin/claude --session-id ${UUID}`, name: 'node', as: ['own', 'job'] },
  { agent: 'claude', what: 'under SpecStory capture', argv: `/Applications/Tortie.app/Contents/Resources/bin/specstory run claude --no-version-check --silent -c claude --session-id ${UUID}`, name: 'specstory', as: ['own', 'job'] }
];

describe('every install shape of the two agents with a shape is the agent, and its question turns amber', () => {
  for (const shape of INSTALLS) {
    it(`${shape.agent}: ${shape.what}`, async () => {
      for (const as of shape.as) {
        for (const cadence of CADENCES) {
          const h = harness(shape.agent);
          if (as === 'own') {
            h.procs = [{ pid: PANE_PID, ppid: 1, stat: 'Ss+', command: shape.argv }];
            h.name = shape.name;
          } else {
            const pane = shellWithJob(shape.argv, shape.name);
            h.procs = pane.procs;
            h.name = pane.name;
          }
          h.print(fixture(QUESTION[shape.agent]));
          await h.ticks(Math.ceil(20 / cadence), cadence);
          expect(h.state, `${shape.argv} as ${as}, cadence ${String(cadence)}`).toBe('needs_input');
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// The two narrowings ("Tiny fix, then land", after its reverify)
// ---------------------------------------------------------------------------

/** A pair under `dir`: an absolute node of its own and a script beside it. */
const pairUnder = (dir: string, runtime: string, script: string): string => `${dir}/${runtime} ${dir}/${script}`;

/**
 * An absolute interpreter and script whose deepest shared directory is named
 * for the agent but is not the row's install root: the reverify's project
 * directory, one named exactly for the agent, one that only BEGINS with the
 * install root's name, and, for Claude Code, qwen's own install shape under a
 * root named for it and a pair under its own signature's `versions`.
 */
const projectPairs = (a: Kept): Array<[string, string]> => [
  // The reverify's.
  [pairUnder(`/Users/example/work/${a}-demo`, 'rt/bin/node', 'tools/show.js'), 'the reverify’s project directory named for the agent'],
  [pairUnder(`/Users/example/work/${a}`, 'rt/bin/node', 'tools/show.js'), 'a project directory named exactly for the agent'],
  [pairUnder(`/Users/example/.local/lib/${a}-code-demo`, 'node/bin/node', 'lib/cli-entry.js'), 'qwen’s install shape under a directory that only begins with its root’s name'],
  ...(a === 'claude'
    ? ([
        [pairUnder('/Users/example/.local/lib/claude-code', 'node/bin/node', 'lib/cli-entry.js'), 'qwen’s install shape under a root named for Claude Code, which its row does not name'],
        [pairUnder('/Users/example/.local/share/claude/versions', 'rt/bin/node', 'tools/show.js'), 'a pair under Claude Code’s own signature directory, which names versions and no install root']
      ] as Array<[string, string]>)
    : [])
];

/** The same pair with its shared directory renamed to qwen's real install root. */
const underQwenRoot = (argv: string): string => {
  const [runtime = '', script = ''] = argv.split(' ');
  const a = runtime.split('/');
  const b = script.split('/');
  let n = 0;
  while (n < a.length - 1 && n < b.length - 1 && a[n] === b[n]) n += 1;
  const shared = a.slice(0, n).join('/');
  const root = `${a.slice(0, n - 1).join('/')}/qwen-code`;
  return argv.split(shared).join(root);
};

describe('a directory named for the agent that is not its install root is not the agent, and never turns amber', () => {
  for (const agent of KEPT) {
    for (const [argv, what] of projectPairs(agent)) {
      it(`${agent}: ${what}, as the shell’s job, at 1 s and at 2 s`, async () => {
        // It IS the bundled-runtime shape: the same pair under qwen's real
        // install root reads as qwen, and never as Claude Code, so the
        // directory, and only the directory, decides this row.
        const twin = underQwenRoot(argv);
        expect(twin, 'the twin moved nothing').not.toBe(argv);
        expect(commandRunsAgent(twin, binaryCandidatesFor('qwen'), bundledRootsFor('qwen')), twin).toBe(true);
        expect(commandRunsAgent(twin, binaryCandidatesFor('claude'), bundledRootsFor('claude')), twin).toBe(false);
        for (const cadence of CADENCES) {
          const h = harness(agent);
          const pane = shellWithJob(argv, 'node');
          h.procs = pane.procs;
          h.name = pane.name;
          h.print(fixture(QUESTION[agent]));
          await h.ticks(Math.ceil(40 / cadence), cadence);
          expect(h.reads.command, `the gate never read ${argv}, so this row tests nothing`).toContain(JOB_PID);
          expect(h.raised(), `${agent} ${argv} cadence ${String(cadence)}`).toBe(false);
        }
      });
    }
  }
});

/** Each kept agent as a `-c` string's first simple command, with an argument after its name. */
const INVOKE = { qwen: `qwen --resume ${UUID}`, claude: `claude --session-id ${UUID}` } as const;

/**
 * A shell's `-c` string that begins with the agent and is more than one simple
 * command, as `ps -o command=` prints it (the quoting gone), with the shell's
 * name. The first is the reverify's: the shell keeps the terminal after the
 * agent exits, and its line still begins with the agent.
 */
const compoundC = (a: Kept): Array<[string, string, string]> => {
  const inv = INVOKE[a];
  return [
    [`sh -c ${inv} && sleep 600`, 'sh', '`&&`, the reverify’s'],
    [`bash -c ${inv} || sleep 600`, 'bash', '`||`'],
    [`sh -c ${inv}; sleep 600`, 'sh', '`;`'],
    [`sh -c ${inv} & sleep 600`, 'sh', '`&`'],
    [`zsh -c ${inv} | tee /tmp/${a}.log`, 'zsh', '`|`'],
    [`sh -c ${inv}&&sleep 600`, 'sh', '`&&` written against its words'],
    // A newline, as macOS's `ps` prints one (measured on this Mac: `\012`).
    [`sh -c ${inv}\\012sleep 600`, 'sh', 'a newline'],
    [`bash -c ${inv} $(cat /tmp/${a}-args)`, 'bash', 'a substitution'],
    [`bash -c ${inv} \`cat /tmp/${a}-args\``, 'bash', 'a backtick'],
    [`bash -c ${inv} <(sleep 600)`, 'bash', 'a process substitution, a subshell']
  ];
};

describe('a shell whose `-c` string is more than one simple command is not the agent, and never turns amber', () => {
  for (const agent of KEPT) {
    for (const [argv, shell, what] of compoundC(agent)) {
      it(`${agent}: \`${argv}\` (${what}), the agent gone and \`sleep\` running, at 1 s and at 2 s`, async () => {
        // Its one-simple-command twin, the same shell and the same first word,
        // IS the agent, so the compound, and only the compound, decides.
        const twin = `${shell} -c ${INVOKE[agent]}`;
        expect(commandRunsAgent(twin, binaryCandidatesFor(agent), bundledRootsFor(agent)), twin).toBe(true);
        expect(argv.startsWith(twin), `${argv} does not begin with its twin`).toBe(true);
        expect(argv.split(' ')[2], 'the string’s first word is not the agent’s bare name').toBe(agent);
        for (const cadence of CADENCES) {
          const h = harness(agent);
          // The login shell's job is the shell running the string; the agent
          // in it has exited and the `sleep` after it holds the terminal with it.
          h.procs = [
            { pid: PANE_PID, ppid: 1, stat: 'Ss', command: '-zsh' },
            { pid: JOB_PID, ppid: PANE_PID, stat: 'S+', command: argv },
            { pid: JOB_PID + 1, ppid: JOB_PID, stat: 'S+', command: 'sleep 600' }
          ];
          h.name = shell;
          h.print(fixture(QUESTION[agent]));
          await h.ticks(Math.ceil(40 / cadence), cadence);
          expect(h.reads.command, `the gate never read ${argv}, so this row tests nothing`).toContain(JOB_PID);
          expect(h.raised(), `${agent} ${argv} cadence ${String(cadence)}`).toBe(false);
        }
      });
    }
  }
});

describe('commandRunsAgent, clause by clause', () => {
  const qwen = binaryCandidatesFor('qwen');
  const claude = binaryCandidatesFor('claude');
  const qwenRoots = bundledRootsFor('qwen');
  const claudeRoots = bundledRootsFor('claude');
  it('an interpreter’s script is its first argument that is not an option, `run` skipped', () => {
    expect(commandRunsAgent('node --no-warnings=DEP0040 /opt/homebrew/bin/qwen', qwen, qwenRoots)).toBe(true);
    expect(commandRunsAgent('bun run /Users/example/bin/claude', claude, claudeRoots)).toBe(true);
    expect(commandRunsAgent('node /Users/example/print-rows.js qwen', qwen, qwenRoots)).toBe(false);
  });
  it('a shell’s `-c` counts only among its leading options, and only its first word', () => {
    expect(commandRunsAgent('bash -lc claude --resume x', claude, claudeRoots)).toBe(true);
    expect(commandRunsAgent('bash /Users/example/run.sh -c claude', claude, claudeRoots)).toBe(false);
    expect(commandRunsAgent('zsh -f -i', claude, claudeRoots)).toBe(false);
    expect(commandRunsAgent('-zsh', claude, claudeRoots)).toBe(false);
  });
  it('a shell’s `-c` counts only when it is ONE simple command', () => {
    // The one-element shape the install table cites, and a redirection,
    // which is still one simple command.
    expect(commandRunsAgent('zsh -c qwen', qwen, qwenRoots)).toBe(true);
    expect(commandRunsAgent('sh -c qwen --resume x', qwen, qwenRoots)).toBe(true);
    expect(commandRunsAgent('sh -c claude > /tmp/claude.out', claude, claudeRoots)).toBe(true);
    for (const agent of KEPT) {
      for (const [argv] of compoundC(agent)) {
        expect(commandRunsAgent(argv, binaryCandidatesFor(agent), bundledRootsFor(agent)), argv).toBe(false);
      }
    }
    // An operand after the string is asked too, because `ps` cannot tell
    // where the string ended.
    expect(commandRunsAgent('sh -c qwen x;y', qwen, qwenRoots)).toBe(false);
  });
  it('SpecStory counts only as `run` with a `-c`, by the `-c` string’s first word', () => {
    expect(commandRunsAgent('/opt/homebrew/bin/specstory run claude -c tail -f /tmp/claude', claude, claudeRoots)).toBe(false);
    expect(commandRunsAgent('/opt/homebrew/bin/specstory sync claude -c claude', claude, claudeRoots)).toBe(false);
  });
  it('a directory counts only for an install carrying its own runtime: an absolute interpreter and script whose DEEPEST shared directory is EXACTLY the row’s install root', () => {
    expect(commandRunsAgent('node /Users/example/.local/lib/qwen-code/lib/cli-entry.js', qwen, qwenRoots)).toBe(false);
    expect(commandRunsAgent('/Users/example/.local/lib/qwen-code/node/bin/node /Users/example/work/x.js', qwen, qwenRoots)).toBe(false);
    expect(commandRunsAgent('/Users/example/.local/lib/qwen-code/node/bin/node /Users/example/.local/lib/qwen-code/lib/cli-entry.js', qwen, qwenRoots)).toBe(true);
    expect(commandRunsAgent('/Users/example/.local/lib/qwen-code/bin/tail /Users/example/.local/lib/qwen-code/lib/screen', qwen, qwenRoots)).toBe(false);
    // The same install shape with no root handed in is no one's.
    expect(commandRunsAgent('/Users/example/.local/lib/qwen-code/node/bin/node /Users/example/.local/lib/qwen-code/lib/cli-entry.js', qwen, [])).toBe(false);
    for (const agent of KEPT) {
      for (const [argv] of projectPairs(agent)) {
        expect(commandRunsAgent(argv, binaryCandidatesFor(agent), bundledRootsFor(agent)), argv).toBe(false);
      }
    }
  });
  it('the install root is READ FROM THE REGISTRY, and only qwen’s row names one, so Claude Code never reaches it', () => {
    // Re-derived from the row itself, not retyped: qwen's `realpath-under`.
    const dirs = (getRegistryEntry('qwen').install.signature ?? []).flatMap((s) => (s.kind === 'realpath-under' ? [s.dir] : []));
    expect(dirs.map((d) => d.split('/').at(-1))).toEqual(qwenRoots);
    expect(qwenRoots).toEqual(['qwen-code']);
    for (const id of AGENT_IDS) {
      if (id !== 'qwen') expect(bundledRootsFor(id), id).toEqual([]);
    }
    expect(bundledRootsFor('an-agent-he-configured')).toEqual([]);
  });
  it('nothing, and no candidate, is never the agent', () => {
    expect(commandRunsAgent('', qwen, qwenRoots)).toBe(false);
    expect(commandRunsAgent('qwen', [], qwenRoots)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The reading, clause by clause
// ---------------------------------------------------------------------------

describe('the foreground reading, clause by clause', () => {
  it('the pane’s own program execs a shell under the same pid: the old reading no longer stands', async () => {
    for (const cadence of CADENCES) {
      const h = harness('qwen');
      h.procs = [{ pid: PANE_PID, ppid: 1, stat: 'Ss+', command: AGENT_COMMAND.qwen }];
      h.name = AGENT_NAME.qwen;
      h.print('');
      await h.ticks(3, cadence);
      // The same pid is now a shell, holding the terminal at a prompt that
      // draws nothing below the rows.
      h.procs = [{ pid: PANE_PID, ppid: 1, stat: 'Ss+', command: '-zsh' }];
      h.name = 'zsh';
      h.print(fixture(QUESTION.qwen));
      await h.ticks(Math.ceil(30 / cadence), cadence);
      expect(h.raised(), `cadence ${String(cadence)}`).toBe(false);
    }
  });

  it('another program under the same tmux name takes the terminal: the table, not the name, says who holds it', async () => {
    for (const cadence of CADENCES) {
      const h = harness('qwen');
      const pane = shellWithJob(AGENT_COMMAND.qwen, 'node');
      h.procs = pane.procs;
      h.name = 'node';
      h.print('');
      await h.ticks(3, cadence);
      // qwen exits and he runs a node script that prints qwen's rows and
      // blocks: tmux still says `node`, a new pid holds the terminal.
      h.procs = [
        { pid: PANE_PID, ppid: 1, stat: 'Ss', command: '-zsh' },
        { pid: JOB_PID + 1, ppid: PANE_PID, stat: 'S+', command: 'node /Users/example/print-rows.js' }
      ];
      h.print(fixture(QUESTION.qwen));
      await h.ticks(Math.ceil(30 / cadence), cadence);
      expect(h.raised(), `cadence ${String(cadence)}`).toBe(false);
    }
  });

  it('a table in which nothing holds the terminal ends the reading', async () => {
    for (const cadence of CADENCES) {
      const h = harness('qwen');
      const pane = shellWithJob(AGENT_COMMAND.qwen, AGENT_NAME.qwen);
      h.procs = pane.procs;
      h.name = pane.name;
      h.print(fixture(QUESTION.qwen));
      await h.ticks(Math.ceil(20 / cadence), cadence);
      expect(h.state, `cadence ${String(cadence)}`).toBe('needs_input');
      // qwen is stopped and the shell has not taken the terminal back: no
      // process in the table carries `+`, and tmux still reads `node`.
      h.procs = [
        { pid: PANE_PID, ppid: 1, stat: 'Ss', command: '-zsh' },
        { pid: JOB_PID, ppid: PANE_PID, stat: 'T', command: AGENT_COMMAND.qwen }
      ];
      await h.ticks(3, cadence);
      expect(h.state, `cadence ${String(cadence)}`).toBe('running');
    }
  });

  it('qwen relaunched in the same shell: a new pid under the same tmux name is read again, and its question turns amber', async () => {
    for (const cadence of CADENCES) {
      const h = harness('qwen');
      h.procs = shellWithJob(AGENT_COMMAND.qwen, AGENT_NAME.qwen).procs;
      h.name = AGENT_NAME.qwen;
      h.print('');
      await h.ticks(3, cadence);
      // qwen exits and he starts it again at once: a new pid holds the
      // terminal, and tmux reads `node` throughout.
      h.procs = [
        { pid: PANE_PID, ppid: 1, stat: 'Ss', command: '-zsh' },
        { pid: JOB_PID + 5, ppid: PANE_PID, stat: 'S+', command: AGENT_COMMAND.qwen }
      ];
      h.print(fixture(QUESTION.qwen));
      await h.ticks(Math.ceil(20 / cadence), cadence);
      expect(h.state, `cadence ${String(cadence)}`).toBe('needs_input');
    }
  });

  it('a question held past its probe window stands on a tick with no table while tmux names the same program', async () => {
    const h = harness('qwen');
    h.procs = [{ pid: PANE_PID, ppid: 1, stat: 'Ss+', command: AGENT_COMMAND.qwen }];
    h.name = AGENT_NAME.qwen;
    h.print(fixture(QUESTION.qwen));
    await h.ticks(10, 2);
    expect(h.state).toBe('needs_input');
    // Past the 60 s window nothing asks for a table, and the capture still comes.
    await h.ticks(40, 2);
    const tables = h.reads.table;
    await h.ticks(20, 2);
    expect(h.reads.table, 'a table was read past the probe window, so this row tests nothing').toBe(tables);
    expect(h.state).toBe('needs_input');
    expect(h.statuses.filter((x) => x === 'needs_input')).toHaveLength(1);
  });

  it('on a tick with no table, tmux renaming the foreground program ends the reading', async () => {
    const h = harness('qwen');
    h.procs = [{ pid: PANE_PID, ppid: 1, stat: 'Ss+', command: AGENT_COMMAND.qwen }];
    h.name = AGENT_NAME.qwen;
    h.print(fixture(QUESTION.qwen));
    await h.ticks(50, 2);
    const tables = h.reads.table;
    expect(h.state).toBe('needs_input');
    // qwen hands the terminal to something else and nothing is printed: tmux
    // renames the pane's foreground program, and no table is taken.
    h.procs = [
      { pid: PANE_PID, ppid: 1, stat: 'Ss', command: AGENT_COMMAND.qwen },
      { pid: JOB_PID, ppid: PANE_PID, stat: 'S+', command: 'less /Users/example/screen.log' }
    ];
    h.name = 'less';
    await h.ticks(2, 2);
    expect(h.reads.table, 'a table was read, so this row tests nothing').toBe(tables);
    expect(h.state).toBe('running');
  });

  it('the command line is read once for a steady foreground, and never for a row that lists no shape', async () => {
    const q = harness('qwen');
    q.procs = [{ pid: PANE_PID, ppid: 1, stat: 'Ss+', command: AGENT_COMMAND.qwen }];
    q.name = AGENT_NAME.qwen;
    q.print(fixture('qwen-idle.txt'));
    for (let i = 0; i < 30; i++) {
      q.print(i % 2 === 0 ? fixture('qwen-idle.txt') : `${fixture('qwen-idle.txt')}\n.`);
      await q.ticks(1, 1);
    }
    expect(q.reads.command).toEqual([PANE_PID]);
    for (const agent of ['codex', 'gemini', 'grok', 'pi', 'cursor', 'opencode', 'antigravity', 'shell', 'not-an-agent']) {
      const h = harness(agent);
      h.procs = [{ pid: PANE_PID, ppid: 1, stat: 'Ss+', command: agent }];
      h.name = agent;
      for (let i = 0; i < 10; i++) {
        h.print(i % 2 === 0 ? 'a' : 'b');
        await h.ticks(1, 1);
      }
      expect(h.reads.table, agent).toBeGreaterThan(0);
      expect(h.reads.command, agent).toEqual([]);
    }
  });
});

describe('foregroundProgram', () => {
  const table = (rows: Array<[number, number, string]>): ProcSnapshot =>
    parseProcTable(rows.map(([pid, ppid, stat]) => `${String(pid)} ${String(ppid)} 0:00.10 ${stat}`).join('\n'), 0);
  it('is the pane’s own program while it holds the terminal, the job of it that does otherwise, and null when unknown', () => {
    expect(foregroundProgram(table([[500, 1, 'Ss+'], [510, 500, 'S+']]), 500)).toBe(500);
    expect(foregroundProgram(table([[500, 1, 'Ss'], [930, 500, 'S+'], [931, 930, 'S+']]), 500)).toBe(930);
    expect(foregroundProgram(table([[500, 1, 'Ss'], [930, 500, 'Ss']]), 500)).toBeNull();
    expect(foregroundProgram(table([[930, 1, 'S+']]), 500)).toBeNull();
  });
});
