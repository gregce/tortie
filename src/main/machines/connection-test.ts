/**
 * The one visible connection test (Phase 68, research 51 section 4.2, the one
 * interactive moment).
 *
 * It runs ssh once, shows the person the bytes the program printed, and lets
 * them answer the program's own questions. Two things are taken out of what
 * reaches the screen and nothing else is: the ANSI control sequences, and the
 * markers Tortie asked the other machine to print around its answer (since
 * Phase 340 the check's own pair as well as the path pair inside it). The
 * answer itself is left exactly as the machine sent it. It is the first and
 * only place in Tortie where ssh vocabulary is on screen, and it is on screen
 * because the bytes belong to a real program rather than to Tortie.
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
 * identity record file named on the command. Since Phase 340's fix round Tortie
 * reads that one file itself as well, once per test, through `./host-record.ts`,
 * to know whether ssh could be asking about the machine for the first time. It
 * stores nothing a person types.
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
  MachineCheckView,
  MachineConfirmSheet,
  MachineKeySheet,
  MachineTestClass,
  MachineTestEvent,
  MachineTestOutcome
} from '@shared/ipc';
import { MACHINE_VERSION_PATTERN } from '@shared/machines';
import { stripAnsi } from '../ansi';
import { shellQuoteArgv } from '../restore/command';
import { decideRemoteVersionGate, parseTmuxVersion } from '../tmux/version';
// PHASE 340. The far check, composed and read purely. This file runs it.
import {
  CHECK_MARKER,
  composeCheckCommand,
  countMarker,
  parseCheckAnswer,
  type MachineCheckFacts
} from './check-script';
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
  MACHINE_VERSION_ACCEPT_OFFER,
  classifyMachineOutput,
  clientFailedReason,
  composeOutcomeCopy,
  lastPrintedLine
} from './errors';
import { describeMachine, type MachineExecutionFields } from './confirm';
// PHASE 340's fix round. Whether ssh could be asking about this machine for the
// first time, read from the two record files the command names.
import { hostKeyRecorded } from './host-record';
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

import { SSH_BATCH_MODE_INTERACTIVE } from './ssh-options';
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

// PHASE 123 MOVED `SSH_BATCH_MODE_INTERACTIVE` to `./ssh-options.ts`, and its
// value did not change. `./key-install.ts` read it back out of this file while
// this file imports eight names from that one, so the two loaded each other.
// The constant is imported below and re-exported here, so every caller of this
// module, including `build/machines-conformance-probe.mts`, is unchanged. It
// did not move to `./carriage.ts`, because the exec plane reads the carriage and
// the exec plane must never be able to read this value.
export { SSH_BATCH_MODE_INTERACTIVE } from './ssh-options';

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

// PHASE 340 REMOVED `remoteProbeCommand`, the `command -v` probe this test ran
// from Phase 68. It asked in the shell ssh hands a command to with `-c`, which
// is not a login shell (build/p340/SPEC.md M1), so a tmux in `/usr/local/bin` or
// `/opt/homebrew/bin` read as missing. The far command is now
// `composeCheckCommand` in `./check-script.ts`, and nothing else about the test
// moved (D1).

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
 *
 * PHASE 340 (D27). `identityFile` is the key Tortie made for this machine's id,
 * or null. Phase 84 item 7 named that key on every command the carriage sends
 * (`./ssh.ts`) and missed this one, so the test the key install restarts never
 * offered the key the install had just put there, and a machine that trusts
 * none of the person's own keys asked for the password again. It is named the
 * way the carriage names it: one `-o IdentityFile="<path>"`, quoted because
 * Tortie's data directory has a space in its name, after the record files and
 * before `-p`, and never with `IdentitiesOnly`, so the person's own keys are
 * still offered. It changes no hashed field.
 */
export function composeTestArgv(
  fields: MachineExecutionFields,
  hostKeys: MachineHostKeyFiles,
  identityFile: string | null = null
): string[] {
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
  if (identityFile !== null && identityFile.length > 0) {
    argv.push('-o', `IdentityFile="${identityFile}"`);
  }
  if (fields.port !== null) argv.push('-p', String(fields.port));
  if (fields.user !== null) argv.push('-l', fields.user);
  argv.push(fields.host);
  // ONE argument, carrying the whole remote command. There is no local shell
  // here: node-pty runs the client directly, so this element reaches ssh
  // verbatim, and ssh hands it to the account's shell with `-c`, which is not
  // a login shell (Phase 340, M1, corrected from "login shell"). The check
  // asks the login shell itself, inside the script.
  argv.push(composeCheckCommand(fields.remoteTmuxPath));
  return argv;
}

/**
 * The command line the transcript header shows. Pure.
 *
 * It carries the record files as well, so the exact path Tortie writes a
 * machine's identity to is on screen in the command a person can read, rather
 * than being something they have to take on trust. Since Phase 340 it carries
 * Tortie's key for the machine too, when one is named.
 */
export function composeTestCommandLine(
  sshPath: string,
  fields: MachineExecutionFields,
  hostKeys: MachineHostKeyFiles,
  identityFile: string | null = null
): string {
  return shellQuoteArgv([sshPath, ...composeTestArgv(fields, hostKeys, identityFile)]);
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

/**
 * The markers Tortie asks the other machine to print, which come out of what a
 * person reads (Phase 73.1, row 1; the check's own marker since Phase 340). Both
 * begin `__TORTIE_`, so the held tail rule below is the rule it always was.
 */
const DISPLAY_MARKERS: readonly string[] = [CHECK_MARKER, REMOTE_PATH_MARKER];

/**
 * The longest tail of `text` that could still be the start of a marker.
 *
 * The terminal hands over whatever bytes have arrived, so one marker can be cut
 * in two across a pair of reads. A tail that matches the start of the marker is
 * held back until the rest of it arrives. One byte less than the whole marker
 * is the most that can ever be held, because a whole one would have been found.
 */
function markerTailLength(text: string): number {
  let longest = 0;
  for (const marker of DISPLAY_MARKERS) {
    const most = Math.min(text.length, marker.length - 1);
    for (let len = most; len > longest; len -= 1) {
      if (marker.startsWith(text.slice(text.length - len))) {
        longest = len;
        break;
      }
    }
  }
  return longest;
}

/** The earliest whole marker at or after `from`, of any kind, or null. */
function firstMarkerAt(
  text: string,
  from: number
): { at: number; marker: string } | null {
  let best: { at: number; marker: string } | null = null;
  for (const marker of DISPLAY_MARKERS) {
    const at = text.indexOf(marker, from);
    if (at !== -1 && (best === null || at < best.at)) best = { at, marker };
  }
  return best;
}

/**
 * Split a run of transcript text into the part a person may read now and the
 * part that is held back.
 *
 * Tortie asks the other machine to print its answer between two copies of
 * {@link REMOTE_PATH_MARKER}. The markers are Tortie's and the answer between
 * them is the machine's, so the markers come out and the answer stays.
 *
 * A marker can arrive split across two reads from the terminal, so the tail is
 * held whenever it could still be the beginning of one. Held text is shown as
 * soon as the rest of it arrives, and it is flushed with any lone marker
 * removed when the run ends.
 *
 * Phase 73.1, row 1. Before this the handler pushed every byte it read, so a
 * person watching the test read `__TORTIE_PATH__/opt/homebrew/bin/tmux__TORTIE_PATH__`.
 * The path is the machine's and it stays. The markers are Tortie's own and a
 * person has no reason to read them.
 */
export function splitTranscriptForDisplay(pending: string): {
  show: string;
  hold: string;
} {
  let show = '';
  let at = 0;
  for (;;) {
    // PHASE 340. The earliest marker of EITHER kind opens a pair, and its pair
    // is the next copy of the same marker. The check's block holds the path
    // pair inside it, so what sits between a pair has every marker taken out.
    const first = firstMarkerAt(pending, at);
    if (first === null) {
      const rest = pending.slice(at);
      const held = markerTailLength(rest);
      return {
        show: show + rest.slice(0, rest.length - held),
        hold: rest.slice(rest.length - held)
      };
    }
    const width = first.marker.length;
    const open = first.at;
    const close = pending.indexOf(first.marker, open + width);
    if (close === -1) {
      return { show: show + pending.slice(at, open), hold: pending.slice(open) };
    }
    show += pending.slice(at, open) + stripPathMarkers(pending.slice(open + width, close));
    at = close + width;
  }
}

/**
 * Remove every marker from a whole transcript. For the paths that never stream.
 *
 * A key install resolves once with the whole text rather than pushing it out as
 * it arrives, so it has no held tail to carry and this is all it needs. Since
 * Phase 340 it takes out the check's marker as well as the path marker.
 */
export function stripPathMarkers(text: string): string {
  let out = text;
  for (const marker of DISPLAY_MARKERS) out = out.split(marker).join('');
  return out;
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
   * PHASE 340's ruled round. ssh's own global record files, which the command
   * line does not name and ssh reads all the same. Absent reads as
   * `SSH_GLOBAL_HOST_RECORD_FILES` in `./host-record.ts`, which is what Tortie
   * passes. Only a test, or a drive that cannot write `/etc` and names a
   * scratch global record through ssh's own `GlobalKnownHostsFile` option,
   * hands its own files here: the same ones ssh was told to read.
   */
  globalHostKeys?: readonly string[];
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
  /**
   * PHASE 340 (D27). Tortie's own key for this machine's id, when the pair is on
   * this Mac, else null. The caller decides, as it does for Prepare, because
   * only main knows where the key lives. Named on the argv, never required.
   */
  identityFile?: string | null;
  /**
   * PHASE 340 (D7, D8). Whether this is the Add form's check (`draft`) or a
   * saved row's (`saved`). Only a draft's sheet binds a version Tortie has not
   * measured as accepted, because only a draft's sheet is ever sent back to
   * `machines:add`; a saved row that reports such a version meets Phase 83's
   * own sheet at Prepare. Absent reads as `draft`.
   */
  mode?: 'draft' | 'saved';
  /** Called for every push, being output, asks and the one end event. */
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
  /**
   * Text read from the terminal that is not on screen yet, because it could
   * still turn out to be the front half of a marker. Phase 73.1, row 1. It is
   * always short: one byte less than a marker at the most, unless a first
   * marker arrived and its pair has not.
   */
  held: string;
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
  /**
   * PHASE 340 (D9). True once the first-seen question was raised. One test
   * raises it at most once, and only before the check's first marker.
   */
  hostKeyAsked: boolean;
  /** The buffer length when the first-seen question was raised, or -1. */
  hostKeyAskedAt: number;
  /**
   * PHASE 340's fix round. True when either record file already holds this
   * machine, read once before the test starts. ssh asks nothing about such a
   * machine, so Tortie's own first-seen question is never raised for it.
   */
  hostRecorded: boolean;
  /** PHASE 340 (D9). The quiet timer that raises a `prompt` ask, or null. */
  quiet: NodeJS.Timeout | null;
  /**
   * PHASE 340 (D14). Set when ssh was there and would not start: the path and
   * the reason in plain words. Null otherwise.
   */
  clientFailure: { sshPath: string; reason: string } | null;
  /** PHASE 340 (D8). True when this test's sheet may bind an accepted version. */
  bindsVersion: boolean;
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
  // PHASE 340 (D9). A finished test asks nothing more.
  if (test.quiet !== null) {
    clearTimeout(test.quiet);
    test.quiet = null;
  }
  if (live === test) live = null;
  // PHASE 79.1. An install has no window to push to and no outcome to compose.
  // It hands its class and its exit code to the one promise its caller is
  // waiting on, and everything below this line belongs to a test.
  if (test.settle !== null) {
    test.settle(cls, exitCode);
    return;
  }
  // Phase 73.1, row 1. Whatever is still held could not turn into a pair, so it
  // is shown now with any lone marker taken out. This runs before the outcome
  // is composed, so the last of the program's bytes reach the screen ahead of
  // Tortie's own sentence about them.
  if (test.held.length > 0) {
    const rest = stripPathMarkers(test.held);
    test.held = '';
    if (rest.length > 0) {
      test.emit({ testId: test.testId, kind: 'output', text: rest });
    }
  }
  // PHASE 340 (D15). The path and the sheet come ONLY from a well formed
  // block: exactly one, every line the script's own. A buffer holding anything
  // else carries no path and no sheet, whatever else it holds.
  const answer = parseCheckAnswer(test.buffer, test.fields.remoteTmuxPath);
  const facts: MachineCheckFacts | null =
    typeof answer === 'object' &&
    answer !== null &&
    (cls === 'ok' || cls === 'program-choice' || cls === 'no-program')
      ? answer
      : null;
  const check = facts === null ? null : checkViewOf(facts);
  const resolvedPath =
    cls === 'ok' && check !== null && check.program !== null ? check.program.path : null;
  const typedPath = test.fields.remoteTmuxPath;
  // PHASE 340's fix round. One of Tortie's own markers came back, so the far
  // side ran Tortie's command, which it does only after the sign in. An
  // `unknown` that carries a refused block is therefore a machine that WAS
  // reached and signed in to, and its copy says so rather than "could not
  // reach" (the verifiers' finding), and it quotes no marker.
  const markersBack = countMarker(test.buffer, CHECK_MARKER);
  const copy = composeOutcomeCopy(cls, {
    resolvedPath,
    lastLine: lastPrintedLine(test.buffer),
    // PHASE 340. A typed path that holds nothing that runs is named.
    typedPath: check !== null && check.typedMissing ? typedPath : null,
    // PHASE 340 (D14). ssh was there and would not start.
    sshPath: test.clientFailure?.sshPath ?? null,
    clientReason: test.clientFailure?.reason ?? null,
    // PHASE 340 (D9 as revised). The opening marker arrived and the closing
    // one did not: it signed in, and its login files did not finish.
    signedIn: cls === 'timed-out' && markersBack === 1,
    answerUnread: cls === 'unknown' && answer === 'malformed'
  });
  // The sheet is composed here, and only here, because this is the first moment
  // both halves of the hash exist: the id the person typed, and the program
  // path the machine itself reported.
  //
  // PHASE 340 (D8 as revised). For EVERY `ok`, whatever the version kind. A
  // version Tortie read and has not measured is bound as the accepted version
  // on a draft's sheet, so one Add press accepts it; every other kind binds
  // none, and Prepare decides as it always has.
  let sheet: MachineConfirmSheet | null = null;
  if (cls === 'ok' && resolvedPath !== null && check !== null && test.sheetId !== null) {
    const accepts =
      test.bindsVersion && check.versionKind === 'unmeasured' && check.version !== null
        ? check.version
        : null;
    const summary = describeMachine(test.sheetId, {
      ...test.fields,
      remoteTmuxPath: resolvedPath,
      ...(accepts !== null ? { acceptedTmuxVersion: accepts } : {})
    });
    sheet = {
      hash: summary.hash,
      lines: [...summary.lines],
      warning: summary.warning,
      // PHASE 101. Null for every row that carries no write root, which is
      // every row a connection test has ever produced a sheet for. It is
      // carried rather than omitted so that no sheet drawing site has to
      // remember the rule and none of them can forget it.
      writeHonesty: summary.writeHonesty,
      // PHASE 340 (D7, D8). The version this hash binds, echoed by the
      // renderer into `machines:add`, and the paragraph that says what
      // accepting it means. A draft carries no version of its own, so for a
      // draft this is the one accepted here or null; a saved row's sheet names
      // the row's own, which it already binds.
      acceptedTmuxVersion: accepts ?? test.fields.acceptedTmuxVersion ?? null,
      versionHonesty: accepts !== null ? MACHINE_VERSION_ACCEPT_OFFER : null
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
    keySheet,
    check,
    signedIn: markersBack >= 1
  };
  test.emit({ testId: test.testId, kind: 'end', outcome });
}

/**
 * Which of the four version answers one check's one program gave (Phase 340,
 * D8 as revised). Pure.
 *
 * Read with the parser Prepare uses and the gate Prepare asks, so the check and
 * Prepare cannot disagree about a version. A version that fails the schema's
 * own pattern is `unreadable`, because no row could carry it.
 */
export function checkVersionOf(facts: MachineCheckFacts): {
  version: string | null;
  versionKind: MachineCheckView['versionKind'];
} {
  if (facts.candidates.length !== 1) return { version: null, versionKind: null };
  if (facts.vskip === 'install') return { version: null, versionKind: 'not-read' };
  const parsed = facts.version === null ? null : parseTmuxVersion(facts.version);
  if (parsed === null || !new RegExp(MACHINE_VERSION_PATTERN).test(parsed)) {
    return { version: null, versionKind: 'unreadable' };
  }
  return {
    version: parsed,
    versionKind:
      decideRemoteVersionGate(parsed).kind === 'measured' ? 'measured' : 'unmeasured'
  };
}

/** One well formed block as the view the renderer draws. Pure. */
export function checkViewOf(facts: MachineCheckFacts): MachineCheckView {
  const { version, versionKind } = checkVersionOf(facts);
  const only = facts.candidates.length === 1 ? facts.candidates[0] : undefined;
  return {
    signedInAs: facts.user,
    os: facts.os,
    loginRead: facts.login === 'read',
    program: only === undefined ? null : { path: only.path, source: only.source },
    candidates: facts.candidates.map((c) => ({ path: c.path, source: c.source })),
    typedMissing: facts.typedMissing,
    version,
    versionKind
  };
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

// PHASE 340. `classifyProbeOutput` above is kept BYTE FOR BYTE: the goldens in
// `__tests__/golden/` and `build/probe-key-install.mjs` read the captures of
// the probe this phase retired through it. It no longer decides a live test.

/**
 * Decide the class of one finished CHECK (Phase 340, D15 as revised). Pure, and
 * it is what the test's exit handler calls.
 *
 *  1. A well formed block decides: one program is `ok`, more than one is
 *     `program-choice`, none is `no-program`.
 *  2. A malformed block, being any buffer with other than exactly two check
 *     markers or a block whose lines are not the script's own, is `unknown`,
 *     whatever else the buffer holds.
 *  3. With no block at all, today's order exactly, with one change: the legacy
 *     path pair can no longer answer `ok`, because the far side did not run
 *     Tortie's check. It answers `unknown`.
 *
 * `typed` (the fix round) is the path the check was run with, or null. With a
 * typed path, a buffer of more than one block is read for the one block that
 * names that path (see `parseCheckAnswer`), so a login file that prints
 * Tortie's marker no longer refuses a machine whose path the person typed.
 */
export function classifyCheckOutput(
  text: string,
  exitCode: number,
  typed: string | null = null
): MachineTestClass {
  const answer = parseCheckAnswer(text, typed);
  if (answer === 'malformed') return 'unknown';
  if (answer !== null) {
    if (answer.candidates.length === 1) return 'ok';
    if (answer.candidates.length > 1) return 'program-choice';
    return 'no-program';
  }
  if (parseResolvedPath(text) !== null) return 'unknown';
  const named = classifyMachineOutput(text);
  if (named !== 'unknown') return named;
  if (PASSWORD_PROMPT_SEEN_RE.test(text)) return 'password-required';
  if (exitCode === 0) return 'no-program';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// The questions a running check asks (Phase 340, D9 as revised)
// ---------------------------------------------------------------------------

/** How long the program must be quiet, mid line, before its line is a question. */
export const TEST_PROMPT_QUIET_MS = 700;

/** The longest question text carried on an ask. */
export const TEST_PROMPT_MAX_CHARS = 512;

/**
 * ssh's first-seen question, anchored on the bytes OpenSSH 9.9p2 printed over
 * the loopback machine (`scratchpad/p340/adversary/cap/capture.json`):
 *
 *   The authenticity of host '<…>' can't be established.\r\n
 *   <TYPE> key fingerprint is SHA256:<…>.\r\n
 *   <any lines>
 *   Are you sure you want to continue connecting (yes/no/[fingerprint])? <end>
 *
 * Anchored at the END of the buffer, so it is true only while ssh is waiting.
 */
const HOST_KEY_QUESTION_RE =
  /The authenticity of host '[^'\r\n]*' can't be established\.\r*\n([A-Za-z0-9-]+) key fingerprint is (SHA256:[A-Za-z0-9+/]+=*)\.\r*\n(?:[^\n]*\n){0,20}?Are you sure you want to continue connecting \(yes\/no\/\[fingerprint\]\)\? $/;

/**
 * The first-seen question the buffer ends on, or null. Pure, exported for the
 * tests that read it over the captured bytes.
 */
export function hostKeyQuestionOf(
  buffer: string
): { fingerprint: string; keyType: string } | null {
  const match = HOST_KEY_QUESTION_RE.exec(buffer);
  if (match === null) return null;
  return { keyType: match[1] ?? '', fingerprint: match[2] ?? '' };
}

/**
 * The unfinished last line a quiet program left, or null. Pure.
 *
 * ssh's prompts end without a line end and the check's own lines end with one,
 * so a last line that is not empty after its `\r` is removed is the program
 * waiting on an answer. The first chunk ssh sends is a lone `\r`, which is
 * empty after that and is never a question.
 */
export function unfinishedLineOf(buffer: string): string | null {
  const at = buffer.lastIndexOf('\n');
  const last = buffer.slice(at + 1).replace(/\r/g, '');
  if (last.trim().length === 0) return null;
  return last.length > TEST_PROMPT_MAX_CHARS ? last.slice(-TEST_PROMPT_MAX_CHARS) : last;
}

/**
 * Raise the first-seen question, once, and only before the check printed its
 * first marker: ssh always asks before the far side prints anything, and a
 * login file can print ssh's own words after it.
 */
function maybeAskHostKey(test: LiveTest): void {
  if (test.finished || test.hostKeyAsked) return;
  // PHASE 340's fix round (the verifiers' finding). The rule above holds only
  // when ssh DOES ask, which it does only about a machine no record file it
  // reads holds, its global ones included (the ruled round). On one already on
  // record the far side's login files are the first bytes, and one that prints
  // ssh's words would get Tortie's question over a fingerprint of its own
  // choosing. Such a machine's question, if it prints one, is quoted as the
  // program's own line by the quiet rule instead.
  if (test.hostRecorded) return;
  if (test.buffer.includes(CHECK_MARKER)) return;
  const question = hostKeyQuestionOf(test.buffer);
  if (question === null) return;
  test.hostKeyAsked = true;
  test.hostKeyAskedAt = test.buffer.length;
  test.emit({
    testId: test.testId,
    kind: 'ask',
    ask: { kind: 'host-key', fingerprint: question.fingerprint, keyType: question.keyType }
  });
}

/**
 * Arm the quiet timer again. When it fires with the program still mid line, the
 * line is raised as a `prompt` ask. Not after the check's first marker, because
 * nothing Tortie's own script prints is a question, and not over the first-seen
 * question, which has its own ask. Today's answer field stays under Details for
 * a question this rule misses.
 */
function armQuiet(test: LiveTest): void {
  if (test.quiet !== null) clearTimeout(test.quiet);
  test.quiet = setTimeout(() => {
    test.quiet = null;
    if (test.finished) return;
    if (test.buffer.includes(CHECK_MARKER)) return;
    if (test.hostKeyAskedAt === test.buffer.length) return;
    const text = unfinishedLineOf(test.buffer);
    if (text === null) return;
    test.emit({ testId: test.testId, kind: 'ask', ask: { kind: 'prompt', text } });
  }, TEST_PROMPT_QUIET_MS);
  test.quiet.unref?.();
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
  const identityFile = input.identityFile ?? null;
  const commandLine = composeTestCommandLine(
    sshPath,
    input.fields,
    input.hostKeys,
    identityFile
  );

  const test: LiveTest = {
    kind: 'test',
    testId,
    pty: null,
    pid: null,
    startedAt: Date.now(),
    buffer: '',
    held: '',
    bytes: 0,
    deadline: null,
    finished: false,
    fields: input.fields,
    sheetId: input.sheetId,
    keyPath: input.keyPath,
    promptCursor: 0,
    passwordSent: false,
    emit: input.emit,
    settle: null,
    hostKeyAsked: false,
    hostKeyAskedAt: -1,
    hostRecorded: hostKeyRecorded(
      input.hostKeys,
      input.fields.host,
      input.fields.port,
      input.globalHostKeys
    ),
    quiet: null,
    clientFailure: null,
    bindsVersion: (input.mode ?? 'draft') === 'draft'
  };
  live = test;

  if (resolution.path === null) {
    // Nothing was started, and the outcome says so. The end event is sent on a
    // later turn so the caller has its StartedTest back first, which is what
    // gives the renderer the test id before the outcome for it arrives.
    //
    // PHASE 340 (D14). This branch, and only this one, is `client-missing`:
    // no executable file was found where ssh lives. It is logged now, naming
    // the path, so the two classes are both in the log.
    machinesLog.warn(
      `the connection test found no ssh program it can run at ${PINNED_SSH_PATH}`
    );
    setTimeout(() => {
      finish(test, 'client-missing', null);
    }, 0);
    return { testId, commandLine, sshPath };
  }

  let pty: IPty;
  try {
    sshSpawnCount += 1;
    pty = nodePty.spawn(
      resolution.path,
      composeTestArgv(input.fields, input.hostKeys, identityFile),
      {
        name: 'xterm-256color',
        cols: 100,
        rows: 30,
        cwd: homedir(),
        env: plainEnv(input.env)
      }
    );
  } catch (err) {
    // PHASE 340 (D14). ssh IS there, because the branch above found an
    // executable file, and it would not start. Until this phase that was
    // reported as a missing ssh. The raw message and any code are in the log;
    // the person reads the reason in plain words.
    const code = (err as { code?: unknown }).code;
    machinesLog.warn(
      `the connection test could not start ${resolution.path}: ${(err as Error).message}` +
        (typeof code === 'string' ? ` (${code})` : '')
    );
    test.clientFailure = { sshPath: resolution.path, reason: clientFailedReason(err) };
    setTimeout(() => {
      finish(test, 'client-failed', null);
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
    // Phase 73.1, row 1. The buffer keeps the raw bytes, because the check's
    // reader needs the markers. Only the copy that reaches the screen has them
    // taken out.
    const split = splitTranscriptForDisplay(test.held + text);
    test.held = split.hold;
    if (split.show.length > 0) {
      test.emit({ testId, kind: 'output', text: split.show });
    }
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
    if (stopAtPasswordPrompt(test)) return;
    // PHASE 340 (D9). The questions, raised inline. The first-seen question
    // is read at once; any other unfinished line waits for the program to fall
    // quiet.
    maybeAskHostKey(test);
    armQuiet(test);
  });

  pty.onExit(({ exitCode }: { exitCode: number }) => {
    if (test.finished) return;
    // PHASE 340 (D15). The check's own reader decides a live test, with the
    // path the check carried, which the fix round reads past a refused block.
    finish(
      test,
      classifyCheckOutput(test.buffer, exitCode, test.fields.remoteTmuxPath),
      exitCode
    );
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
  /**
   * The bytes the program printed, with three things taken out: the ANSI
   * control sequences, every copy of the password, and the marker pair Tortie
   * asked the machine to print around its answer.
   */
  transcript: string;
  exitCode: number | null;
  durationMs: number;
  /**
   * PHASE 340 (D14). Set when ssh was there and would not start: the path and
   * the reason in plain words, for `client-failed`'s detail. Null otherwise.
   */
  clientFailure: { sshPath: string; reason: string } | null;
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
      held: '',
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
          // Phase 73.1, row 1. The same marker pair is taken out here, for the
          // same reason. Nothing streams on this path, so the whole string
          // form is enough and no tail is ever held.
          transcript: stripPathMarkers(
            redactPassword(test.buffer, input.password)
          ),
          exitCode,
          durationMs: Date.now() - startedAt,
          clientFailure: test.clientFailure
        });
      },
      hostKeyAsked: false,
      hostKeyAskedAt: -1,
      // An install asks nothing inline: it runs StrictHostKeyChecking=yes.
      hostRecorded: false,
      quiet: null,
      clientFailure: null,
      bindsVersion: false
    };
    live = test;

    if (resolution.path === null) {
      // PHASE 340 (D14). No executable ssh was found, and only this branch is
      // `client-missing`. Logged, naming the path.
      machinesLog.warn(
        `the key install found no ssh program it can run at ${PINNED_SSH_PATH}`
      );
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
      // PHASE 340 (D14). ssh is there and would not start, which is not a
      // missing ssh. The raw message and any code are in the log.
      const code = (err as { code?: unknown }).code;
      machinesLog.warn(
        `the key install could not start ${resolution.path}: ${(err as Error).message}` +
          (typeof code === 'string' ? ` (${code})` : '')
      );
      test.clientFailure = { sshPath: resolution.path, reason: clientFailedReason(err) };
      setTimeout(() => {
        finish(test, 'client-failed', null);
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
    if (test.quiet !== null) clearTimeout(test.quiet);
    killLive(test);
  }
  live = null;
  sshSpawnCount = 0;
  // The warning flag moved to ./carriage.ts with the resolver that sets it, so
  // this drops it through that module's own hook rather than a second copy.
  resetSshWarningsForTests();
}
