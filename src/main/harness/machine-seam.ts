/**
 * The liveness seam: a harness launch takes the two machine facts from a FILE,
 * and a wake from the same file (Phase 231).
 *
 * ## What it is for
 *
 * The charter's independent method is an attack: make the LINK fact and the
 * FEED fact DISAGREE in every combination and read what each of the twenty-one
 * far-side channels does. A real machine cannot be asked to disagree with
 * itself on demand, and a wake cannot be driven by a harness launch at all,
 * because `installPowerHandlers` runs only after `dispatchHarness` returns
 * false (src/main/index.ts), so nothing a probe could reach fired
 * `fireMachineWake`. This module is both knobs, one env name.
 *
 * ## The shape
 *
 * `GMUX_SHOT_MACHINE_SEAM=<path>` names a JSON file. The file holds
 *
 *     { "seq": 3, "commands": [
 *         { "op": "link", "machineId": "studio", "link": "quiet" },
 *         { "op": "feed", "machineId": "studio", "feed": "missed" },
 *         { "op": "wake" } ] }
 *
 * The seam reads the file every 100 ms and applies the commands once per
 * `seq` it has not seen, in order, printing one line per applied sequence so a
 * probe can wait on it. A file that is not that shape is dropped whole, with
 * the reason printed, and nothing is applied from it.
 *
 * ## Which path each command takes, because it matters for what is read
 *
 *  - `link: quiet` goes through the FEED's own `markMachineQuiet`, the way a
 *    failed sign-in and an ended live connection do, so the session rows read
 *    `unknown` as they would for a real link failure.
 *  - `feed: missed` goes through `markMachineFeedMissed`, the poll's own arm.
 *  - `feed: unknown` goes through `noteMachineFeedUnknown`, the wake's arm.
 *  - every other value is written straight onto the record through
 *    `setMachineFactsForHarness`, because there is no real event that writes
 *    it on its own (a link of `polling` with a feed of `missed`, say) and that
 *    is exactly the disagreement the attack needs.
 *  - `wake` calls `fireMachineWake`, which is what the resume handler calls.
 *
 * ## The refusals, in `usageFixturePath`'s three terms
 *
 * Installed only on an isolated launch (GMUX_SMOKE or GMUX_SHOT) or an armed
 * probe run, only when GMUX_HARNESS_DIR is set, and only when the profile sits
 * inside that directory. A variable left in a shell profile never reaches a
 * person's real app. In every ordinary launch this module does nothing at all.
 *
 * ## What it does NOT do
 *
 * It sends nothing to any machine. It starts nothing. It opens no file but
 * the one it is named. It writes nothing.
 */

import { readFileSync, statSync } from 'node:fs';
import { app } from 'electron';
import { getLog } from '../log';
import { setMachineFactsForHarness, noteMachineFeedUnknown } from '../machines/control-plane';
import type { MachineFeedKind, MachineLinkKind } from '../machines/liveness';
import { markMachineFeedMissed, markMachineQuiet } from '../machines/remote-sessions';
import { fireMachineWake } from '../power';
import { isInside } from './fold-stub';
import { isIsolatedLaunch } from './launch-gate';

const seamLog = getLog('config');

/** The knob's own path, or null when this launch may not use it. */
export function machineSeamPath(
  env: NodeJS.ProcessEnv,
  userDataDir: string
): string | null {
  const path = env['GMUX_SHOT_MACHINE_SEAM'] ?? '';
  if (path === '') return null;
  if (!isIsolatedLaunch(env) && env['GMUX_PROBES'] !== '1') return null;
  const harnessDir = env['GMUX_HARNESS_DIR'] ?? '';
  if (harnessDir === '') return null;
  if (!isInside(userDataDir, harnessDir)) return null;
  return path;
}

const LINK_KINDS: ReadonlySet<string> = new Set([
  'connected',
  'polling',
  'connecting',
  'quiet',
  'refused'
]);
const FEED_KINDS: ReadonlySet<string> = new Set(['listed', 'unknown', 'missed']);

export type SeamCommand =
  | {
      readonly op: 'link';
      readonly machineId: string;
      readonly link: MachineLinkKind;
      readonly reason?: string;
    }
  | { readonly op: 'feed'; readonly machineId: string; readonly feed: MachineFeedKind }
  | { readonly op: 'wake' };

export interface SeamFile {
  readonly seq: number;
  readonly commands: readonly SeamCommand[];
}

/**
 * Read one file's text as a seam file, or answer the reason it is not one.
 *
 * DROPPED WHOLE. One bad command drops the file, because a half applied
 * sequence is a matrix cell the verifier cannot name.
 */
export function parseSeamFile(
  text: string
): { readonly file: SeamFile; readonly reason: null } | { readonly file: null; readonly reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { file: null, reason: `not JSON: ${(err as Error).message}` };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { file: null, reason: 'the top level is not an object' };
  }
  const { seq, commands } = parsed as Record<string, unknown>;
  if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0) {
    return { file: null, reason: 'seq is not a non-negative integer' };
  }
  if (!Array.isArray(commands)) {
    return { file: null, reason: 'commands is not an array' };
  }
  const out: SeamCommand[] = [];
  for (const [index, one] of commands.entries()) {
    const where = `commands[${String(index)}]`;
    if (one === null || typeof one !== 'object' || Array.isArray(one)) {
      return { file: null, reason: `${where} is not an object` };
    }
    const cmd = one as Record<string, unknown>;
    if (cmd['op'] === 'wake') {
      out.push({ op: 'wake' });
      continue;
    }
    if (typeof cmd['machineId'] !== 'string' || cmd['machineId'].length === 0) {
      return { file: null, reason: `${where}.machineId is not a name` };
    }
    if (cmd['op'] === 'link') {
      if (typeof cmd['link'] !== 'string' || !LINK_KINDS.has(cmd['link'])) {
        return { file: null, reason: `${where}.link is not a link kind` };
      }
      if (cmd['reason'] !== undefined && typeof cmd['reason'] !== 'string') {
        return { file: null, reason: `${where}.reason is not a string` };
      }
      out.push({
        op: 'link',
        machineId: cmd['machineId'],
        link: cmd['link'] as MachineLinkKind,
        ...(typeof cmd['reason'] === 'string' ? { reason: cmd['reason'] } : {})
      });
      continue;
    }
    if (cmd['op'] === 'feed') {
      if (typeof cmd['feed'] !== 'string' || !FEED_KINDS.has(cmd['feed'])) {
        return { file: null, reason: `${where}.feed is not a feed kind` };
      }
      out.push({
        op: 'feed',
        machineId: cmd['machineId'],
        feed: cmd['feed'] as MachineFeedKind
      });
      continue;
    }
    return { file: null, reason: `${where}.op is not link, feed or wake` };
  }
  return { file: { seq, commands: out }, reason: null };
}

/** What applying a command reaches. Injected so a test can count. */
export interface SeamDeps {
  readonly setFacts: typeof setMachineFactsForHarness;
  readonly linkQuiet: (machineId: string, reason: string) => void;
  readonly feedMissed: (machineId: string, errorClass: string) => void;
  readonly feedUnknown: (machineId: string) => void;
  readonly wake: () => void;
}

/** The production deps: the same arms the real events take. */
export function productionSeamDeps(): SeamDeps {
  return {
    setFacts: setMachineFactsForHarness,
    linkQuiet: (machineId, reason) => markMachineQuiet(machineId, reason),
    feedMissed: (machineId, errorClass) => markMachineFeedMissed(machineId, errorClass),
    feedUnknown: noteMachineFeedUnknown,
    wake: fireMachineWake
  };
}

/** Apply one command through the arm its value takes. Pure over `deps`. */
export function applySeamCommand(cmd: SeamCommand, deps: SeamDeps): void {
  switch (cmd.op) {
    case 'wake':
      deps.wake();
      return;
    case 'link':
      if (cmd.link === 'quiet') {
        deps.linkQuiet(cmd.machineId, cmd.reason ?? 'the harness seam cut it');
        return;
      }
      deps.setFacts(cmd.machineId, {
        link: cmd.link,
        reason: cmd.reason ?? null
      });
      return;
    case 'feed':
      if (cmd.feed === 'missed') {
        deps.feedMissed(cmd.machineId, 'the harness seam');
        return;
      }
      if (cmd.feed === 'unknown') {
        deps.feedUnknown(cmd.machineId);
        return;
      }
      deps.setFacts(cmd.machineId, { feed: cmd.feed });
      return;
  }
}

/** How often the file is read. 100 ms, so a probe waits on a line, not a clock. */
export const SEAM_POLL_MS = 100;

/**
 * Watch one file and apply each new sequence once. Returns the stop.
 *
 * Exported for the test; production calls {@link installMachineSeam}.
 */
export function watchSeamFile(
  path: string,
  deps: SeamDeps,
  say: (line: string) => void
): () => void {
  let lastSeq = -1;
  let lastMtimeMs = -1;
  let lastRefused = '';
  const tick = (): void => {
    let mtimeMs: number;
    try {
      mtimeMs = statSync(path).mtimeMs;
    } catch {
      return;
    }
    if (mtimeMs === lastMtimeMs) return;
    lastMtimeMs = mtimeMs;
    let text: string;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      return;
    }
    const read = parseSeamFile(text);
    if (read.file === null) {
      if (read.reason !== lastRefused) {
        lastRefused = read.reason;
        say(`[gmux-seam] refused the file whole: ${read.reason}`);
      }
      return;
    }
    if (read.file.seq <= lastSeq) return;
    lastSeq = read.file.seq;
    for (const cmd of read.file.commands) {
      try {
        applySeamCommand(cmd, deps);
      } catch (err) {
        say(`[gmux-seam] ${JSON.stringify(cmd)} threw: ${(err as Error).message}`);
      }
    }
    say(`[gmux-seam] applied seq=${String(read.file.seq)} ${JSON.stringify(read.file.commands)}`);
  };
  const timer = setInterval(tick, SEAM_POLL_MS);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}

/** Install the seam. Called once from the boot, beside the usage fixture. */
export function installMachineSeam(): void {
  const path = machineSeamPath(process.env, app.getPath('userData'));
  if (path === null) return;
  // SAID OUT LOUD, so a probe can wait for it before it writes a sequence.
  console.log('[gmux-seam] installed, the two machine facts and the wake come from a file');
  watchSeamFile(path, productionSeamDeps(), (line) => {
    console.log(line);
    seamLog.info(line);
  });
}
