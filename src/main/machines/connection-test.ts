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
 * ## Phase 79.1 put a second runner in this file, and it is the only new thing
 * in the tree that starts a terminal
 *
 * {@link startKeyInstall} makes the one connection that puts Tortie's own key
 * on a machine. It lives here rather than beside the composition in
 * `./key-install.ts` for one reason: this file already owns the one terminal
 * Tortie opens for a person, and a second module that spawned one would be a
 * second place to reason about killing it. It shares the one live slot, so
 * starting an install cancels a running test, and
 * {@link cancelLiveMachineTest} at quit kills whichever of the two is there.
 *
 * Nothing streams from an install. It resolves once with its whole transcript,
 * so no event channel was added for it.
 *
 * ## What this module never does
 *
 * It writes no passphrase and no configuration file into the person's home
 * folder, on either machine, and it reads nothing from `~/.ssh` except the
 * identity record file named on the command. It stores nothing a person types.
 * It kills only the pid it started, and there is no `pkill` anywhere in this
 * phase.
 *
 * PHASE 79.1 CHANGED ONE HALF OF THAT SENTENCE, and says so rather than
 * quietly. Tortie now writes a key, into its OWN data directory, and puts the
 * public half of it on another machine after a person read a sheet and pressed
 * a button. It still writes nothing into the person's own `~/.ssh` on this Mac.
 */

import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import * as nodePty from 'node-pty';
import type { IPty } from 'node-pty';
import type {
  MachineConfirmSheet,
  MachineKeySheet,
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
// Phase 79.1. Every sentence, every hash and every composed string about
// putting a key on a machine lives in ./key-install.ts, which starts nothing.
// This file holds the one runner that does.
import {
  PASSWORD_PROMPT_RE,
  PASSWORD_PROMPT_SEEN_RE,
  classifyKeyInstallOutput,
  composeKeyInstallArgv,
  composeKeyInstallCommandLine,
  describeKeyInstall,
  parseKeyInstallAnswer,
  redactPassword
} from './key-install';

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

/**
 * How long one key install may run.
 *
 * Half the visible test's deadline, and the reason is that nobody is reading
 * during it. The password was typed before the call started and Tortie writes
 * it on the one prompt, so there is no person to wait for. Thirty seconds is
 * three times the connect budget {@link SSH_CONNECT_TIMEOUT_SECONDS} allows,
 * which leaves room for a slow link plus the few lines the other machine runs.
 */
export const KEY_INSTALL_DEADLINE_MS = 30_000;

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
  /**
   * PHASE 79.1. Where the private half of this machine's key would live, or
   * null when there is no id to make one for.
   *
   * The caller supplies it for the reason it supplies {@link hostKeys}: only
   * main knows where Tortie's data directory is, and this module stays free of
   * any import that would reach it. It is a path, not a key. NOTHING is made
   * here, and a failed test makes no key: the path is only what the sheet says
   * the key WOULD be kept at, so a person reads the file name before they agree
   * to anything.
   */
  keyPath: string | null;
  /** Called for every push, being output and the one end event. */
  emit(event: MachineTestEvent): void;
}

/** What the caller gets back at once, before any byte has arrived. */
export interface StartedTest {
  testId: string;
  commandLine: string;
  sshPath: string;
}

/**
 * The one client this module has running, whichever of the two it is.
 *
 * `kind` is what tells them apart. A test pushes every byte to a window and
 * ends on an event. An install pushes nothing and ends by resolving one
 * promise, which is what {@link LiveTest.settle} is. Everything else about
 * them is the same, which is why they share one slot: one process to kill, one
 * deadline to clear, one pid the probe can read.
 */
interface LiveTest {
  kind: 'test' | 'key-install';
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
  keyPath: string | null;
  /** How far into the buffer the prompt matcher has already looked. */
  promptCursor: number;
  /** True once the password was written. It is never written twice. */
  passwordSent: boolean;
  emit(event: MachineTestEvent): void;
  /** Set for an install, null for a test. Resolves the one promise. */
  settle: ((cls: MachineTestClass, exitCode: number | null) => void) | null;
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
  if (live === test) live = null;
  // PHASE 79.1. An install has no window to push to and no outcome to compose.
  // It hands its class and its exit code to the one promise its caller is
  // waiting on, and everything below this line belongs to a test.
  if (test.settle !== null) {
    test.settle(cls, exitCode);
    return;
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
  // PHASE 79.1. The block that offers to make a key, composed HERE for the same
  // reason the confirm sheet above is: this is the moment both halves of its
  // hash exist, being the id the person typed and the facts of the row. It is
  // offered for exactly three answers. `password-required` is a machine that
  // answered and asked for a password, `auth-refused` is a machine that
  // answered and would not let Tortie in, and `refused` is a machine that
  // answered and declined the connection, which is what Remote Login being off
  // looks like. Every other answer gets nothing, because a key would not help.
  //
  // THE FIRST OF THE THREE IS THE ONE THE PHASE IS FOR, and it was missing from
  // the first build. A Mac with Remote Login on that has no key for Tortie is
  // the stock machine the operator lands on, and it is the one state where
  // pressing the button can actually succeed. `refused` is the opposite case:
  // nothing is listening there, so the key cannot be delivered until Remote
  // Login is on. It stays in the set because the person is one step away from
  // needing it and the first note on the sheet says Remote Login comes first.
  let keySheet: MachineKeySheet | null = null;
  const offersKey =
    cls === 'password-required' || cls === 'auth-refused' || cls === 'refused';
  if (offersKey && test.sheetId !== null && test.keyPath !== null) {
    const summary = describeKeyInstall(test.sheetId, {
      host: test.fields.host,
      user: test.fields.user,
      port: test.fields.port,
      localKeyPath: test.keyPath
    });
    keySheet = {
      hash: summary.hash,
      lines: [...summary.lines],
      warning: summary.warning,
      notes: [...summary.notes]
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
    sheet,
    keySheet
  };
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
 * What Tortie writes into the transcript when it stops at a password question.
 *
 * The transcript is the program's bytes, so a line Tortie adds to it has to
 * say plainly that the run ended and why. Exported so the tests and the live
 * probe read the same sentence the person does.
 */
export const TEST_PASSWORD_STOP_NOTE =
  '\nThat machine asked for a password. Tortie signs in with a key, so it ' +
  'stopped here without answering.\n';

/**
 * Stop the visible test when the machine asks for a password (Phase 79.1 fix
 * round).
 *
 * ## The defect this exists for, measured in the real app
 *
 * A Mac with Remote Login on offers a key and a password. With no key for
 * Tortie on it, the client tries the key, gets nowhere, and prints its own
 * password question. Nothing then happens. The client waits for a person, the
 * person waits for the app, and 60 s later the test ended as `timed-out` and
 * the screen said the machine was answering too slowly to use. The machine had
 * answered in milliseconds. That is the stock macOS machine, and it is the one
 * this whole phase is for.
 *
 * ## Why Tortie stops rather than letting the person type the password
 *
 * Every other connection in the product carries `BatchMode=yes` and signs in
 * with a key, because no person is watching those. A password typed into this
 * one transcript would produce a green `ok` for a machine that no other part
 * of Tortie can reach, and the person would meet the real failure later, in a
 * session that will not open. Stopping here is the honest answer, and the
 * block underneath the result is the way forward.
 *
 * ## What it does not stop
 *
 * The host key question and a passphrase question for a person's own key are
 * different text and neither matches. Both stay answerable, which is the
 * reason this one test carries `BatchMode=no` at all.
 */
function stopAtPasswordPrompt(test: LiveTest): boolean {
  if (test.finished) return false;
  // The whole buffer, and the matcher is anchored at its end, so this is true
  // only while the client is waiting for an answer right now.
  if (!PASSWORD_PROMPT_RE.test(test.buffer)) return false;
  test.emit({
    testId: test.testId,
    kind: 'output',
    text: TEST_PASSWORD_STOP_NOTE
  });
  killLive(test);
  finish(test, 'password-required', null);
  return true;
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
  // PHASE 79.1 FIX ROUND. A password question, AFTER the phrase table has had
  // its say. The order is the point: a transcript holding both the question and
  // `Permission denied` is a machine that asked and then turned the answer
  // down, and `auth-refused` is the truer of the two answers for it.
  if (PASSWORD_PROMPT_SEEN_RE.test(text)) return 'password-required';
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
    kind: 'test',
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
    keyPath: input.keyPath,
    promptCursor: 0,
    passwordSent: false,
    emit: input.emit,
    settle: null
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
      return;
    }
    stopAtPasswordPrompt(test);
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

// ---------------------------------------------------------------------------
// Putting Tortie's key on one machine (Phase 79.1)
// ---------------------------------------------------------------------------

/** What the caller hands over to put one key on one machine. */
export interface StartKeyInstallInput {
  /** The machine this is for. It is on the hash the caller already checked. */
  machineId: string;
  fields: MachineExecutionFields;
  /** The public half, one line. A string that is not one throws before anything starts. */
  publicKeyLine: string;
  /**
   * That machine's password, for this one call.
   *
   * It is a local variable from here to the terminal and back. It is written
   * once, on the one prompt, and every occurrence of it is replaced in the
   * transcript before any text leaves main. Nothing writes it to a file.
   */
  password: string;
  packaged: boolean;
  env: NodeJS.ProcessEnv;
  hostKeys: MachineHostKeyFiles;
}

/** What one install concluded. It arrives all at once, at the end. */
export interface KeyInstallRun {
  cls: MachineTestClass;
  /** 'added', 'present', or null when the machine reported nothing. */
  wrote: 'added' | 'present' | null;
  /** The bytes the program printed, ANSI stripped and the password replaced. */
  transcript: string;
  exitCode: number | null;
  durationMs: number;
}

/**
 * Answer the client's password question, once.
 *
 * The matcher looks only at output that arrived after the last thing Tortie
 * answered, so one question is answered one time. A SECOND question means the
 * machine refused the first answer, and Tortie kills the client there instead
 * of typing the password again. `NumberOfPasswordPrompts=1` makes the client
 * give up on its own as well, so this is the second of two brakes rather than
 * the only one.
 */
function answerOnePrompt(test: LiveTest, password: string): void {
  const fresh = test.buffer.slice(test.promptCursor);
  if (!PASSWORD_PROMPT_RE.test(fresh)) return;
  test.promptCursor = test.buffer.length;
  if (test.passwordSent) {
    killLive(test);
    finish(test, 'auth-refused', null);
    return;
  }
  test.passwordSent = true;
  try {
    test.pty?.write(`${password}\r`);
  } catch {
    // A pty that has gone takes the answer with it, and the exit handler is
    // about to say so.
  }
}

/**
 * Put the public half of Tortie's key for one machine on that machine.
 *
 * It shares the one live slot with the visible test, so starting an install
 * cancels a running test the same way a second test cancels the first. Nothing
 * streams: the promise resolves once, carrying the whole transcript.
 *
 * The argv is composed BEFORE anything is started, so a public key line that is
 * not one throws out of this call with no process, no promise and no terminal.
 */
export function startKeyInstall(
  input: StartKeyInstallInput
): Promise<KeyInstallRun> {
  const resolution = resolveSsh({ packaged: input.packaged, env: input.env });
  const sshPath = resolution.path ?? PINNED_SSH_PATH;
  // Composed first, and outside the promise. A line that is not a public key
  // refuses here, before there is anything to cancel or kill.
  const argv = composeKeyInstallArgv(
    input.fields,
    input.hostKeys,
    input.publicKeyLine
  );
  // Written to the log rather than to the screen. The block a person read says
  // what Tortie will do in plain words, and the result carries no command line
  // field, so this is where somebody helping them can read the exact command.
  // There is no secret in it: the password is never on a command line, and the
  // half of the key that is here is the public half.
  machinesLog.debug(
    `putting a key on ${input.machineId}: ` +
      composeKeyInstallCommandLine(
        sshPath,
        input.fields,
        input.hostKeys,
        input.publicKeyLine
      )
  );

  if (live !== null) {
    const previous = live;
    killLive(previous);
    finish(previous, 'cancelled', null);
  }

  const testId = randomUUID();
  const startedAt = Date.now();

  return new Promise<KeyInstallRun>((resolve) => {
    const test: LiveTest = {
      kind: 'key-install',
      testId,
      pty: null,
      pid: null,
      startedAt,
      buffer: '',
      bytes: 0,
      deadline: null,
      finished: false,
      fields: input.fields,
      sheetId: input.machineId,
      keyPath: null,
      promptCursor: 0,
      passwordSent: false,
      emit: () => undefined,
      settle: (cls, exitCode) => {
        resolve({
          cls,
          // Read from the raw bytes rather than the redacted ones, so a
          // password that happened to be the word `added` cannot change the
          // answer the machine gave.
          wrote: parseKeyInstallAnswer(test.buffer),
          transcript: redactPassword(test.buffer, input.password),
          exitCode,
          durationMs: Date.now() - startedAt
        });
      }
    };
    live = test;

    if (resolution.path === null) {
      setTimeout(() => {
        finish(test, 'client-missing', null);
      }, 0);
      return;
    }

    let pty: IPty;
    try {
      sshSpawnCount += 1;
      pty = nodePty.spawn(resolution.path, argv, {
        name: 'xterm-256color',
        cols: 100,
        rows: 30,
        cwd: homedir(),
        env: plainEnv(input.env)
      });
    } catch (err) {
      machinesLog.warn(
        `the key install could not start ${resolution.path}: ${(err as Error).message}`
      );
      setTimeout(() => {
        finish(test, 'client-missing', null);
      }, 0);
      return;
    }
    test.pty = pty;
    test.pid = pty.pid;

    pty.onData((chunk: string) => {
      if (test.finished) return;
      const text = stripAnsi(chunk);
      test.bytes += Buffer.byteLength(chunk, 'utf8');
      test.buffer += text;
      if (test.bytes > TEST_MAX_OUTPUT_BYTES) {
        killLive(test);
        finish(test, 'unknown', null);
        return;
      }
      answerOnePrompt(test, input.password);
    });

    pty.onExit(({ exitCode }: { exitCode: number }) => {
      if (test.finished) return;
      finish(test, classifyKeyInstallOutput(test.buffer, exitCode), exitCode);
    });

    test.deadline = setTimeout(() => {
      if (test.finished) return;
      killLive(test);
      finish(test, 'timed-out', null);
    }, KEY_INSTALL_DEADLINE_MS);
    test.deadline.unref?.();
  });
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
