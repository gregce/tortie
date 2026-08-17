/**
 * The one visible connection test (Phase 68, research 51 section 4.2, the one
 * interactive moment).
 *
 * It runs ssh once, shows the person every byte the program prints, and lets
 * them answer the program's own questions. It is the first and only place in
 * Tortie where ssh vocabulary is on screen, and it is on screen because the
 * bytes belong to a real program rather than to Tortie.
 *
 * ## Why it needs a controlling terminal
 *
 * ssh reads its host key question from the controlling terminal. A plain
 * `execFile` has none, so the question either never appears or is answered by
 * nobody. `node-pty` gives the client a controlling terminal, which is the same
 * mechanism `../attach/attach-host.ts` already uses for a different reason.
 * This is the only place in this phase that spawns a pty, and the only place
 * in this phase that spawns anything at all except the tailnet picker.
 *
 * ## What the transcript is, stated plainly
 *
 * It is a plain text view of the bytes the program printed, with ANSI control
 * sequences removed. It is NOT a terminal emulator. It does not redraw, it does
 * not handle cursor movement, and a program that paints a full screen will look
 * wrong in it. ssh's own prompts are plain lines, which is why this is enough.
 * The screen says which lines are Tortie's and which are not.
 *
 * ## BatchMode
 *
 * This command carries `BatchMode=no`, and it is the ONE place in the whole
 * tree that does. Everything else that will ever speak ssh carries
 * `BatchMode=yes` so broken authentication fails fast instead of waiting for a
 * person who is not there. {@link SSH_BATCH_MODE_STEADY} is that constant, and
 * it lives here so Phase 69 has one place to read it from.
 * `build/conformance-machines.mjs` counts the `BatchMode=no` call sites and
 * fails at anything other than one.
 *
 * ## Where the machine's identity is recorded, and why Tortie owns that file
 *
 * MEASURED, because the first build of this phase got it wrong. It passed
 * `StrictHostKeyChecking=ask` and named no host key file, so the client used
 * its own default, which is the file in the person's home folder. Answering the
 * question in Tortie then wrote three lines into that file. Measured on the
 * operator's Mac at 932 bytes before a probe run and 1229 bytes after, three
 * lines added. Research 51 section 4.2 promises the opposite in as many words.
 *
 * So the command names the files itself, in this order.
 *
 *  1. {@link MachineHostKeyFiles.tortie}, a file inside Tortie's own data
 *     directory. It is FIRST, and first is the whole of the fix: the client
 *     adds a new key to the first file in the list and to no other. Measured
 *     against a scratch server, 99 bytes written here and zero to the second.
 *  2. {@link MachineHostKeyFiles.user}, the person's own file, read and never
 *     written. It is second so that a machine they already know, whose identity
 *     has since changed, still raises the alarm on Tortie's very first contact
 *     rather than looking like a machine nobody has met. Measured: a wrong key
 *     in the second file produced REMOTE HOST IDENTIFICATION HAS CHANGED and
 *     left that file byte for byte as it was.
 *
 * Both paths are quoted, because Tortie's own directory has a space in its name
 * on every Mac.
 *
 * ## What this module never does
 *
 * It writes no key, no passphrase and no configuration file into the person's
 * home folder, on either machine. It stores nothing a person types. It kills
 * only the pid it started, and there is no `pkill` anywhere in this phase.
 */

import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import * as nodePty from 'node-pty';
import type { IPty } from 'node-pty';
import type {
  MachineConfirmSheet,
  MachineTestClass,
  MachineTestEvent,
  MachineTestOutcome
} from '@shared/ipc';
import { stripAnsi } from '../ansi';
import { shellQuoteArgv } from '../restore/command';
import {
  PINNED_SSH_PATH,
  REMOTE_PATH_MARKER,
  SSH_CONNECT_TIMEOUT_SECONDS,
  composeKnownHostsOption,
  resetSshWarningsForTests,
  resolveSsh,
  type MachineHostKeyFiles
} from './carriage';
import {
  classifyMachineOutput,
  composeOutcomeCopy,
  lastPrintedLine
} from './errors';
import { describeMachine, type MachineExecutionFields } from './confirm';

import { getLog } from '../log';

const machinesLog = getLog('config');

// ---------------------------------------------------------------------------
// The client
// ---------------------------------------------------------------------------

/**
 * Every declaration about the carriage now lives in `./carriage.ts`, and this
 * file re-exports it so no caller of this module changed.
 *
 * The move happened in Phase 69 for a measured reason. The exec plane needed
 * four of these names, the exec plane sits under `execTmux`, and importing this
 * file for a constant put `node-pty` into the import graph of every module that
 * reaches the local tmux door, including `src/main/manifest/store.ts`. The
 * header of `./carriage.ts` records what that broke.
 */
export {
  PINNED_SSH_PATH,
  SSH_BATCH_MODE_STEADY,
  SSH_CONNECT_TIMEOUT_SECONDS,
  REMOTE_PATH_MARKER,
  KNOWN_HOSTS_OPTION,
  resolveSsh,
  resetSshWarningsForTests,
  userHostKeysPath,
  composeKnownHostsOption,
  type SshResolution,
  type MachineHostKeyFiles
} from './carriage';

/**
 * What the ONE visible test carries, and nothing else in the tree may.
 *
 * The whole point of this test is that a person is watching and can answer. It
 * stays in this file rather than moving to `./carriage.ts`, because the exec
 * plane must never be able to read it.
 */
export const SSH_BATCH_MODE_INTERACTIVE = 'BatchMode=no';

/** How long the whole test may run. Generous, because a person may be reading. */
export const TEST_DEADLINE_MS = 60_000;

/** The most output Tortie will show from one test. */
export const TEST_MAX_OUTPUT_BYTES = 256 * 1024;

// ---------------------------------------------------------------------------
// The command, composed purely
// ---------------------------------------------------------------------------

const REMOTE_PATH_RE = /__TORTIE_PATH__(.*?)__TORTIE_PATH__/s;

/**
 * The command Tortie asks the other machine to run.
 *
 * `command -v` answers with a full path when the program is there, and with
 * nothing when it is not. `|| true` keeps a missing program from turning into a
 * non zero exit that says less than the empty answer does.
 *
 * The program name is quoted with `shellQuoteArgv`, which is the one quoting
 * helper in this process, so a path holding a space is safe on the other
 * machine's shell. A path holding a single quote is refused by the schema, so
 * no quoting question is left open at all.
 */
export function remoteProbeCommand(program: string): string {
  const quoted = shellQuoteArgv([program]);
  return `printf '${REMOTE_PATH_MARKER}%s${REMOTE_PATH_MARKER}\\n' "$(command -v ${quoted} || true)"`;
}

/**
 * The whole argv, composed from the fields and the two record files. Pure, and
 * tested as such.
 *
 * `-p` appears only when a port is set, and `-l` only when an account name is.
 * Passing a default would put a value in the command line that the person never
 * chose and the hash never covered.
 *
 * The record files are a required argument rather than a default, so a caller
 * that forgets them is a compile error rather than a run that writes into the
 * person's home folder.
 */
export function composeTestArgv(
  fields: MachineExecutionFields,
  hostKeys: MachineHostKeyFiles
): string[] {
  const program = fields.remoteTmuxPath ?? 'tmux';
  const argv: string[] = [
    '-o',
    SSH_BATCH_MODE_INTERACTIVE,
    '-o',
    `ConnectTimeout=${String(SSH_CONNECT_TIMEOUT_SECONDS)}`,
    '-o',
    'StrictHostKeyChecking=ask',
    '-o',
    composeKnownHostsOption(hostKeys)
  ];
  if (fields.port !== null) argv.push('-p', String(fields.port));
  if (fields.user !== null) argv.push('-l', fields.user);
  argv.push(fields.host);
  // ONE argument, carrying the whole remote command. There is no local shell
  // here: node-pty runs the client directly, so this element reaches ssh
  // verbatim and ssh hands it to the other machine's login shell.
  argv.push(remoteProbeCommand(program));
  return argv;
}

/**
 * The command line the transcript header shows. Pure.
 *
 * It carries the record files as well, so the exact path Tortie writes a
 * machine's identity to is on screen in the command a person can read, rather
 * than being something they have to take on trust.
 */
export function composeTestCommandLine(
  sshPath: string,
  fields: MachineExecutionFields,
  hostKeys: MachineHostKeyFiles
): string {
  return shellQuoteArgv([sshPath, ...composeTestArgv(fields, hostKeys)]);
}

/**
 * Read the machine's answer out of the transcript.
 *
 * Returns null for no answer at all, which covers three cases that are all the
 * same answer to the caller: the markers never arrived, they arrived empty, and
 * they arrived carrying something that is not a full path.
 */
export function parseResolvedPath(text: string): string | null {
  const match = REMOTE_PATH_RE.exec(text);
  if (match === null) return null;
  const value = (match[1] ?? '').trim();
  if (value.length === 0 || !value.startsWith('/')) return null;
  return value;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/** What the caller hands over to start one test. */
export interface StartTestInput {
  fields: MachineExecutionFields;
  packaged: boolean;
  env: NodeJS.ProcessEnv;
  /**
   * The two files this run checks the machine's identity against, Tortie's own
   * first. The caller supplies them because only main knows where Tortie's data
   * directory is, and this module stays free of any import that would reach it.
   */
  hostKeys: MachineHostKeyFiles;
  /**
   * The machine id this test is about, when there is one.
   *
   * Null for a test the person ran before naming the machine. When it is set
   * and the test succeeds, the outcome carries the confirm sheet for that id
   * with the resolved program path in it. That is the only moment main can
   * produce the sheet, because the hash covers the id and the program path and
   * the path is not known until the machine answers.
   */
  sheetId: string | null;
  /** Called for every push, being output and the one end event. */
  emit(event: MachineTestEvent): void;
}

/** What the caller gets back at once, before any byte has arrived. */
export interface StartedTest {
  testId: string;
  commandLine: string;
  sshPath: string;
}

interface LiveTest {
  testId: string;
  pty: IPty | null;
  pid: number | null;
  startedAt: number;
  buffer: string;
  bytes: number;
  deadline: NodeJS.Timeout | null;
  finished: boolean;
  fields: MachineExecutionFields;
  sheetId: string | null;
  emit(event: MachineTestEvent): void;
}

/**
 * The environment the client runs in, with every undefined value dropped.
 *
 * It is the process environment and nothing added. Tortie sets no ssh variable
 * of its own, because the person's own ssh agent and their own ssh settings are
 * what decide authentication, and adding a variable here would quietly change
 * what those settings mean.
 */
function plainEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

/** One test at a time in the whole process. */
let live: LiveTest | null = null;

/**
 * How many ssh processes this module has started since the process began.
 *
 * The Electron smoke reads it to assert that booting with confirmed machines in
 * the file starts zero of them, which is the sentence the whole phase turns on.
 */
let sshSpawnCount = 0;

/** How many ssh processes this module has started. */
export function machineSshSpawnCount(): number {
  return sshSpawnCount;
}

/** The id of the running test, or null. For the tests and the smoke. */
export function liveMachineTestId(): string | null {
  return live?.testId ?? null;
}

/**
 * The pid of the running test's client, or null.
 *
 * The live probe reads it before it quits the app, then checks the process
 * table afterwards, so "the child is gone" is proven by pid rather than
 * asserted.
 */
export function liveMachineTestPid(): number | null {
  return live?.pid ?? null;
}

function finish(
  test: LiveTest,
  cls: MachineTestClass,
  exitCode: number | null
): void {
  if (test.finished) return;
  test.finished = true;
  if (test.deadline !== null) {
    clearTimeout(test.deadline);
    test.deadline = null;
  }
  const resolvedPath = cls === 'ok' ? parseResolvedPath(test.buffer) : null;
  const copy = composeOutcomeCopy(cls, {
    resolvedPath,
    lastLine: lastPrintedLine(test.buffer)
  });
  // The sheet is composed here, and only here, because this is the first moment
  // both halves of the hash exist: the id the person typed, and the program
  // path the machine itself reported.
  let sheet: MachineConfirmSheet | null = null;
  if (cls === 'ok' && resolvedPath !== null && test.sheetId !== null) {
    const summary = describeMachine(test.sheetId, {
      ...test.fields,
      remoteTmuxPath: resolvedPath
    });
    sheet = {
      hash: summary.hash,
      lines: [...summary.lines],
      warning: summary.warning
    };
  }
  const outcome: MachineTestOutcome = {
    testId: test.testId,
    class: copy.class,
    alarm: copy.alarm,
    headline: copy.headline,
    detail: copy.detail,
    resolvedPath,
    exitCode,
    durationMs: Date.now() - test.startedAt,
    sheet
  };
  if (live === test) live = null;
  test.emit({ testId: test.testId, kind: 'end', outcome });
}

/** Kill the pty this module started, and only that one. */
function killLive(test: LiveTest): void {
  const pty = test.pty;
  if (pty === null) return;
  try {
    pty.kill();
  } catch {
    // A process that is already gone is the state we wanted.
  }
}

/**
 * Decide the class from what came back.
 *
 * The order matters. A recognised message wins over the exit code, because the
 * text says what happened and the code only says that something did. An exit of
 * zero with a full path in the markers is the one success. An exit of zero with
 * no path is a machine that answered and has no such program on it.
 *
 * EXPORTED IN PHASE 69, and pure, so `__tests__/golden.test.ts` can read the
 * captured bytes through the SAME decision the product makes. Two of the eight
 * captured classes, being `ok` and `no-program`, are not decided by the phrase
 * table at all: they are decided here, from the markers plus the exit code. A
 * golden test that asked `classifyMachineOutput` about them would have checked a
 * function that is not the one deciding, and it would have answered `unknown`.
 */
export function classifyProbeOutput(
  text: string,
  exitCode: number
): MachineTestClass {
  const resolved = parseResolvedPath(text);
  if (resolved !== null) return 'ok';
  const named = classifyMachineOutput(text);
  if (named !== 'unknown') return named;
  if (exitCode === 0) return 'no-program';
  return 'unknown';
}

/**
 * Start one test.
 *
 * Starting a second cancels the first and says so in the new transcript, so a
 * person who presses the button twice sees one live test rather than two
 * fighting over one view.
 */
export function startMachineTest(input: StartTestInput): StartedTest {
  if (live !== null) {
    const previous = live;
    killLive(previous);
    finish(previous, 'cancelled', null);
  }

  const testId = randomUUID();
  const resolution = resolveSsh({ packaged: input.packaged, env: input.env });
  const sshPath = resolution.path ?? PINNED_SSH_PATH;
  const commandLine = composeTestCommandLine(sshPath, input.fields, input.hostKeys);

  const test: LiveTest = {
    testId,
    pty: null,
    pid: null,
    startedAt: Date.now(),
    buffer: '',
    bytes: 0,
    deadline: null,
    finished: false,
    fields: input.fields,
    sheetId: input.sheetId,
    emit: input.emit
  };
  live = test;

  if (resolution.path === null) {
    // Nothing was started, and the outcome says so. The end event is sent on a
    // later turn so the caller has its StartedTest back first, which is what
    // gives the renderer the test id before the outcome for it arrives.
    setTimeout(() => {
      finish(test, 'client-missing', null);
    }, 0);
    return { testId, commandLine, sshPath };
  }

  let pty: IPty;
  try {
    sshSpawnCount += 1;
    pty = nodePty.spawn(resolution.path, composeTestArgv(input.fields, input.hostKeys), {
      name: 'xterm-256color',
      cols: 100,
      rows: 30,
      cwd: homedir(),
      env: plainEnv(input.env)
    });
  } catch (err) {
    machinesLog.warn(
      `the connection test could not start ${resolution.path}: ${(err as Error).message}`
    );
    setTimeout(() => {
      finish(test, 'client-missing', null);
    }, 0);
    return { testId, commandLine, sshPath };
  }
  test.pty = pty;
  test.pid = pty.pid;

  pty.onData((chunk: string) => {
    if (test.finished) return;
    const text = stripAnsi(chunk);
    test.bytes += Buffer.byteLength(chunk, 'utf8');
    test.buffer += text;
    test.emit({ testId, kind: 'output', text });
    if (test.bytes > TEST_MAX_OUTPUT_BYTES) {
      test.emit({
        testId,
        kind: 'output',
        text:
          '\nThe program printed more than Tortie will show, so Tortie ' +
          'stopped the test.\n'
      });
      killLive(test);
      finish(test, 'unknown', null);
    }
  });

  pty.onExit(({ exitCode }: { exitCode: number }) => {
    if (test.finished) return;
    finish(test, classifyProbeOutput(test.buffer, exitCode), exitCode);
  });

  test.deadline = setTimeout(() => {
    if (test.finished) return;
    killLive(test);
    finish(test, 'timed-out', null);
  }, TEST_DEADLINE_MS);
  test.deadline.unref?.();

  return { testId, commandLine, sshPath };
}

/**
 * Send what a person typed straight to the program.
 *
 * Nothing typed here is stored anywhere. It is written to the pty and that is
 * the whole of it.
 */
export function sendMachineTestInput(testId: string, data: string): void {
  const test = live;
  if (test === null || test.testId !== testId || test.finished) return;
  try {
    test.pty?.write(data);
  } catch {
    // A pty that has gone takes the keystroke with it, and the exit handler is
    // about to say so.
  }
}

/** The person pressed Cancel. */
export function cancelMachineTest(testId: string): void {
  const test = live;
  if (test === null || test.testId !== testId || test.finished) return;
  killLive(test);
  finish(test, 'cancelled', null);
}

/**
 * Stop whatever is running, for the ordered disposer at quit and for a window
 * that went away.
 *
 * It kills only the pid this module started.
 */
export function cancelLiveMachineTest(): void {
  const test = live;
  if (test === null || test.finished) return;
  killLive(test);
  finish(test, 'cancelled', null);
}

/** Drop every piece of module state. Tests only. */
export function resetMachineTestForTests(): void {
  const test = live;
  if (test !== null) {
    if (test.deadline !== null) clearTimeout(test.deadline);
    killLive(test);
  }
  live = null;
  sshSpawnCount = 0;
  // The warning flag moved to ./carriage.ts with the resolver that sets it, so
  // this drops it through that module's own hook rather than a second copy.
  resetSshWarningsForTests();
}
