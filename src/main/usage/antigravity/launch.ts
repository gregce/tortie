/**
 * Whether a new Antigravity session carries Tortie's status line (Phase 374),
 * and what Tortie heard when one that did ended at once.
 *
 * ONE ANSWER, TWO TOKENS OR NONE. {@link antigravityMeterArgs} answers
 * `['--settings', <json>]` or `[]`, and its one caller puts them straight after
 * the program on the argv of a NEW session that is about to start, after the
 * session's row is written (../../sessions/create-local.ts). So:
 *
 *  - NOTHING IS RECORDED. The row, the armed resume and everything composed from
 *    them are the ones a Tortie without this phase writes. An older Tortie, a
 *    Restart and a restore never meet the flag.
 *  - NEVER ON A LINE THAT IS TYPED. A restore and a resume in place type the
 *    agent's command at a shell. With the flag that line grows from one row to
 *    four and stays in the person's shell history, where a later agy meets it.
 *    So neither path asks this module.
 *
 * A PLAIN CREATE IS STARTED BY THE PERSON'S OWN SHELL, as it was before this
 * phase (./script.ts, `antigravityShellLine`), and a shell that reads a file of
 * theirs first may put another folder ahead on the PATH. So for that road every
 * other agy the scan found must be at the floor too.
 *
 * EVERY DOUBT IS `[]`. An unknown flag stops a Go program, and an unknown key
 * in the value ends agy at once, so a mistake here stops every Antigravity
 * session from starting. The flag needs a reading of at least
 * {@link AGY_SETTINGS_FLOOR} taken of the very file the session will run, a
 * native file named `agy`, no settings of the person's own, and no bad start
 * seen from that file. Anything else, a failure of any kind included, starts
 * the session exactly as it starts today.
 *
 * THE SWITCH DECIDES NOTHING ABOUT WHAT RUNS. It selects a script compiled into
 * this build. No setting names a command, a path or a program.
 *
 * THE GUARD IS THE LAST LINE. A session started with the flag that ends within
 * {@link BAD_START_MS} with an error is heard from the reaper's own facts, and
 * that agy file carries no flag again until the file changes, across a restart
 * of Tortie too. It ends nothing, starts nothing and sets no status.
 */

import { basename } from 'node:path';
import type { UsageWaitingFor } from '@shared/usage';
import { compareSpecStoryVersions, parseSpecStoryVersionOutput } from '@shared/specstory-status';
import { sameFile, type FileIdentity, type ProbedVersion } from '../../agents/detection';
import { getLog } from '../../log';
import {
  antigravityMeterOn,
  openAntigravitySlot,
  readAntigravityGuard,
  removeAntigravityGuard,
  writeAntigravityGuard
} from './folder';
import { agyOwnsStatusLine } from './own-status-line';
import { antigravitySettingsJson } from './script';

const log = getLog('usage');

/** The first agy with `--settings` (docs/research/146 section 6.2). */
export const AGY_SETTINGS_FLOOR = '1.4.10';

/** The name the program itself must carry, every link followed. */
const AGY_PROGRAM = 'agy';

/** A session that ends with an error inside this long did not start. */
export const BAD_START_MS = 10_000;

/** The person's own settings file, or the folder their settings live in, in any spelling a Go flag takes. */
const OWN_SETTINGS_FLAG = /^--?(settings|gemini[-_]dir)(=|$)/;

/** What the create hands over. Nothing here is read again later. */
export interface AntigravityMeterInput {
  readonly sessionId: string;
  /** What the last reading of THE FILE THIS SESSION RUNS answered, or null when there is none. */
  readonly probed: ProbedVersion | null;
  /** The argv about to be started, the person's own flags among it. */
  readonly argv: readonly string[];
  /** A session SpecStory captures runs agy inside a command of its own. */
  readonly captured: boolean;
  /** The home agy's settings live under. */
  readonly home: string;
}

/** The last launch decision of this process, in the meter's own word for it. */
let waiting: UsageWaitingFor = 'session';

/** The agy file this process saw a bad start from, held even when it could not be written. */
let heldGuard: FileIdentity | null = null;
let guardRead = false;

/** Sessions started with the flag in the last {@link BAD_START_MS}, and from which file. */
const launched = new Map<string, { readonly at: number; readonly identity: FileIdentity }>();

/** One line per process for a folder that cannot be written. */
let unwritableLogged = false;

/** Test seam: a process that has launched nothing. */
export function resetAntigravityLaunchForTests(): void {
  waiting = 'session';
  heldGuard = null;
  guardRead = false;
  launched.clear();
  unwritableLogged = false;
}

/** Why the row has nothing to draw yet. Before any launch it is `session`. */
export function antigravityWaiting(): UsageWaitingFor {
  return waiting;
}

/** TRUE when `version` is AT the floor or past it, read whole or not at all. */
function floorHolds(version: string): boolean {
  const read = parseSpecStoryVersionOutput(version);
  if (read === null || read !== version) return false;
  // A prerelease of the floor itself is below it, as semver orders it.
  return compareSpecStoryVersions(read, AGY_SETTINGS_FLOOR) > 0 || read === AGY_SETTINGS_FLOOR;
}

/**
 * The switch went off, so a bad start is forgotten with everything else and
 * turning it on again tries again (the fix round: the guard's file went with
 * the folder and the one held here stood until Tortie restarted).
 */
export function clearAntigravityGuard(): void {
  heldGuard = null;
  guardRead = true;
  waiting = 'session';
}

/** TRUE while a bad start was seen from exactly this file. A changed file clears it. */
function guardHolds(identity: FileIdentity): boolean {
  if (!guardRead) {
    heldGuard = readAntigravityGuard();
    guardRead = true;
  }
  if (heldGuard === null) return false;
  if (sameFile(heldGuard, identity)) return true;
  heldGuard = null;
  removeAntigravityGuard();
  return false;
}

/**
 * The two tokens, or none, and the decision kept as the row's word for why.
 * It never throws and it starts nothing. Off is the first question and reads
 * nothing but the switch.
 *
 * The order is the order of least reading: what the argv already says, what the
 * scan already read, and only then one file under the person's home.
 */
export function antigravityMeterArgs(input: AntigravityMeterInput): readonly string[] {
  try {
    if (!antigravityMeterOn()) return [];
    if (input.captured) return none('captured');
    if (input.argv.some((token) => OWN_SETTINGS_FLAG.test(token))) return none('own-status-line');
    // No reading of this file is not a version too old: agy replaced itself, or
    // nothing has been scanned yet. It is read again after this create and the
    // next session carries the flag, so the row goes on saying it waits for one.
    if (input.probed === null) return none('session');
    const { version, identity, native, copies } = input.probed;
    if (!native || basename(identity.real) !== AGY_PROGRAM || !floorHolds(version)) return none('version');
    const byShellAndName = input.argv.length === 1 && input.argv[0]?.includes('/') !== true;
    if (byShellAndName && !copies.every((copy) => copy !== null && floorHolds(copy))) return none('version');
    if (guardHolds(identity)) return none('start-failed');
    if (agyOwnsStatusLine(input.home)) return none('own-status-line');
    const script = openAntigravitySlot(input.sessionId);
    if (script === null) {
      if (!unwritableLogged) {
        unwritableLogged = true;
        log.warn('usage.antigravity.unwritable');
      }
      return none('unwritable');
    }
    waiting = 'session';
    const now = Date.now();
    for (const [id, one] of launched) if (now - one.at > BAD_START_MS) launched.delete(id);
    launched.set(input.sessionId, { at: now, identity });
    return ['--settings', antigravitySettingsJson(script)];
  } catch {
    return [];
  }
}

function none(why: UsageWaitingFor): readonly string[] {
  waiting = why;
  return [];
}

/**
 * A session died, with the reaper's own two facts. An exit code of 1 to 127 and
 * no signal, soon after a start with the flag, holds that agy file. 130 is a
 * person's Ctrl-C and is not it. It never throws.
 */
export function noteAntigravityDeath(
  sessionId: string,
  exitCode: number | undefined,
  signal: string | undefined
): void {
  try {
    const one = launched.get(sessionId);
    if (one === undefined) return;
    launched.delete(sessionId);
    if (Date.now() - one.at > BAD_START_MS) return;
    if (signal !== undefined && signal.length > 0) return;
    if (exitCode === undefined || exitCode < 1 || exitCode > 127) return;
    heldGuard = one.identity;
    guardRead = true;
    waiting = 'start-failed';
    writeAntigravityGuard(one.identity);
    log.warn('usage.antigravity.start-failed', { exitCode });
  } catch {
    /* the guard is a convenience; a reap is not */
  }
}
