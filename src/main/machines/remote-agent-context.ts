/**
 * What the agents on another machine will actually read (Phase 108, research
 * 57 section 7 and research 57 i7).
 *
 * ## What it is for
 *
 * A tab whose project is a folder on another machine gets a working Context
 * panel: the skills, MCP servers, hooks, plugins and instruction files the
 * agents on THAT machine will load, with the same precedence ladders, the same
 * shadow marks and the same counts a local tab gets.
 *
 * ## This is a port swap, not a second reader
 *
 * `scanContext` in `../context/scan.ts` is a pure function over the
 * `ContextFs` port and an environment object. This module runs it UNCHANGED
 * against the miss-recording implementation in `../context/recording-fs.ts`
 * and feeds the misses to ONE catalogue script, `context-read`. It imports
 * nothing from `../context/agent-context.ts` and declares no location table of
 * its own, so no remote answer can draw a precedence ladder the local panel
 * would not draw, and `npm run conformance:context` keeps proving the one
 * matrix for both. Condition 58d of `build/conformance-machines.mjs` reads
 * this file's imports and holds that.
 *
 * ## The loop, drawn
 *
 * ```
 *   THIS MAC                                      THE MACHINE
 *   ────────                                      ───────────
 *   machines:readContext ──▶ this module
 *     1. refuse when not connected (mode word, nothing sent)
 *     2. ONE runRemoteRead('machine-facts') ────▶ home, codex_home,
 *        an empty home refuses with `noHome`     claude_config_dir,
 *                                                xdg_config_home,
 *                                                xdg_state_home, …
 *     3. loop, at most 8 passes:
 *        scanContext over the bundle             (pure, on this Mac)
 *        misses -> chunked context-read calls ──▶ find + stat + head + base64
 *        fold answers into the bundle       ◀──── E / R / F / X records
 *     4. answer MachineContextResult
 * ```
 *
 * The loop converges because the reader is deterministic, every limit in it is
 * a constant, and every asked path becomes an answer or a pinned absence. Pass
 * 1 asks for the static roots. Pass 2 asks for the `SKILL.md` files and plugin
 * manifests found under them. Pass 3 asks for the plugin install paths parsed
 * out of `installed_plugins.json`. Passes 4 to 8 cover `@import` chains, one
 * level each.
 *
 * ## Why an empty far side HOME refuses
 *
 * `resolveHomes` in `../context/env.ts` falls back to `homedir()` when the
 * environment carries no HOME, and `homedir()` is THIS Mac's home. A remote
 * scan built over that would draw this Mac's skills under the machine's name,
 * which is the one wrong answer this feature can produce, worse than no
 * answer. So a facts payload with an empty home answers mode `noHome` and
 * nothing is scanned and no `context-read` is sent.
 *
 * ## What the scan is asked for, and why
 *
 *  - `agent: null`, every registry agent, the same as the local panel.
 *  - `hash: 'none'`. Hashing pulls every byte of every skill over the link
 *    (research 57 i7 section 7.2), so the drift readout is absent rather than
 *    wrong, and pins are never computed for a remote row.
 *  - `includeNested: false`. The nested walk is up to three more passes;
 *    `installLaunchContextResolver` is the shipped precedent for turning it
 *    off on a cost budget, and the panel says so on screen.
 *  - `env` is EXACTLY the far side's facts. `process.env` never reaches this
 *    scan.
 *
 * ## The external programs one call runs, MEASURED and not estimated
 *
 * Research 57 priced Phase 105 at 4 and the truth was 8, and Phase 106 at 3
 * and the truth was 5, so this table was MEASURED on 2026-08-20 by putting
 * counting wrappers on PATH ahead of every program the script names and
 * running the SHIPPED text five times against each shape. Every shape ran the
 * same number on all five runs. Row 7 of `node build/probe-p108-context.mjs`
 * measures it again on every run, and the measurement wins over this table.
 *
 * | Far side shape | Programs | Which ones |
 * | --- | --- | --- |
 * | both lists empty | 0 | none |
 * | enumerate an empty directory | 6 | find x4, stat x2 |
 * | enumerate a directory holding one folder and one file | 9 | find x5, stat x4 |
 * | read one small file back | 5 | wc x1, tr x2, head x1, base64 x1 |
 * | one root and one file together | 14 | the two rows above added |
 * | every path absent | 0 | none |
 * | one file over the byte cap | 5 | wc x1, tr x2, head x1, base64 x1 |
 *
 * Two numbers in that table are BIGGER than a first reading of the script
 * suggests, and the reasons are mechanical. On this Mac the GNU `stat -c`
 * spelling is tried first and fails, so a `find` whose type matched anything
 * runs twice and its failed batch still counts one `stat`; a `find` whose
 * type matched nothing never runs `stat` at all, exits 0, and is not retried.
 * And `tr` is counted twice per file read because the size line and the
 * payload line each pipe through it. A symlink under an enumerated root adds
 * `stat` and `realpath` spawns per link; the fixed rows above are the shapes
 * the probe pins. `printf`, `cd`, `pwd`, `test` and the loops are shell
 * builtins, so a counting wrapper never sees them.
 *
 * ## What is not true after this phase, said plainly
 *
 *  - INSTALL, ENABLE AND PIN ARE REFUSED ON A REMOTE TAB, PERMANENTLY. Eleven
 *    of the twelve `context:*` channels run a binary under
 *    `process.resourcesPath`, reach the network, or write Tortie's own pin
 *    store. Remote Context is a READ and nothing else, and NOTHING here writes
 *    to any machine. The catalogue's write scripts stay exactly `image-put`
 *    then `git-clone`.
 *  - NOTHING REFRESHES ON A CLOCK. There is no timer, no watch and no arming
 *    path, in main or in the renderer. A read happens when the view opens on
 *    the tab, when the tab's project changes, and when a person presses
 *    Refresh. Main cannot see a file change on another computer, and the
 *    Refresh tooltip says so.
 *  - NESTED PROJECT SKILLS ARE NOT LISTED, and the panel says so in its own
 *    sentence rather than drawing a shorter list as a whole one.
 *  - HASHES AND PINS ARE ABSENT rather than wrong. No drift readout, no pin
 *    re-check, no launch snapshot for a remote session.
 *  - A CUT LIST SAYS SO. When the pass cap ends the read with paths still
 *    unread, the answer carries `cut: true` and the renderer draws the
 *    sentence.
 *
 * ## It never throws for anything a machine said
 *
 * A machine Tortie is not signed in to, a machine that did not say where its
 * home is, a machine that did not answer and a machine that answered something
 * unreadable are all ordinary states. Each comes back as a result carrying its
 * own mode word, and the renderer draws the sentence from
 * `src/renderer/machines/presentation.ts`. No prose crosses this boundary.
 */

import type { ContextScanResult } from '@shared/context';
import type { MachineContextInput, MachineContextResult } from '@shared/ipc';
import { scanContext } from '../context/scan';
import { CONTEXT_READ_LIMITS } from '../context/port';
import {
  createEmptyRemoteBundle,
  createRecordingContextFs,
  foldContextReadAnswer,
  parseContextReadPayload,
  resolveRemotePath,
  type RemoteFsBundle,
  type RemoteFsMiss
} from '../context/recording-fs';
import type { RemoteMachineContext } from './context';
import {
  parseMachineFacts,
  REMOTE_FACTS_TIMEOUT_MS
} from './remote-image';
import { machineIsConnected, runRemoteRead } from './remote-run';
import {
  CONTEXT_READ_FILE_MAX_BYTES,
  CONTEXT_READ_LIST_MAX_BYTES
} from './remote-scripts';
import { readyRemoteContext } from './remote-sessions';
import { machineLabelOf, machineRow } from './store';

/**
 * The most reader passes one read gets. 8.
 *
 * The reader's own dependency depth: roots, children, plugins, then `@import`
 * at `maxImportDepth` 5. Research 57 section 7.3 calls 8 the honest ceiling.
 * When the cap ends the read with misses still outstanding the answer is still
 * returned, with `cut: true`, and the renderer says so.
 */
export const CONTEXT_READ_MAX_PASSES = 8;

/**
 * The depth every enumerate list is walked to. Always 2.
 *
 * Depth 2 is what keeps pass 2 from becoming two passes (research 57 i7
 * section 3.3). Blind depth 7 on `~/.claude/plugins` costs 1.37 MB to find 149
 * files (i7 section 4.7), so plugin roots are asked by name in pass 3 after
 * the manifest parse instead of being walked blind.
 */
export const CONTEXT_ENUM_DEPTH = 2;

/**
 * The most far side bytes one call is asked to send back. 16,777,216.
 *
 * The read list is chunked so the sum of the sizes already known from `E`
 * lines stays under this per call. A file with no known size counts as
 * `CONTEXT_READ_LIMITS.defaultMaxBytes`. Base64 of 16 MB is about 22 MB, well
 * under the 67,108,864 byte `MAX_BUFFER_BYTES` the door buffers one answer in.
 * One file bigger than the whole budget still travels, alone in its own call,
 * because the reader's own per file cap is what bounds it.
 */
export const CONTEXT_ANSWER_BUDGET_BYTES = 16_777_216;

/**
 * The deadline on one `context-read` call, in ms. 20,000.
 *
 * The door's default is 15,000. One call here can carry megabytes on a slow
 * link, and 20,000 is the number `./remote-history.ts` already documents for
 * the same reason. It is a ceiling on a sleeping machine, not an expectation:
 * the loopback probe measures a call in well under a second.
 */
export const REMOTE_CONTEXT_TIMEOUT_MS = 20_000;

/**
 * How many of one pass's calls are in flight at once. 8.
 *
 * The calls of one pass are independent by construction: the fold is order
 * independent, and no call's list depends on another call's answer inside the
 * same pass. Research 56 section 1.4 measured that six calls issued at once
 * cost 44.0 ms where six in series cost the round trip six times, and every
 * call here rides the one already-open connection. The wave is bounded so a
 * pass with dozens of calls does not stand up dozens of ssh clients at once.
 */
export const CONTEXT_READ_CONCURRENCY = 8;

/**
 * One remote script call, replaced at the seam by the tests and the probe.
 * The production runner is composed inside {@link readContextOnMachine}.
 */
export type RemoteContextRunner = (
  scriptId: 'machine-facts' | 'context-read',
  args: readonly string[]
) => Promise<string>;

/** The label this machine's row carries, or its id when there is no row. */
function labelOf(machineId: string): string {
  const row = machineRow(machineId);
  return row === null ? machineId : machineLabelOf(row);
}

/** Everything but the scan, for the three answers that carry none. */
function answerWithout(
  input: MachineContextInput,
  mode: MachineContextResult['mode'],
  started: number,
  passes: number,
  calls: number
): MachineContextResult {
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: typeof input.cwd === 'string' ? input.cwd : '',
    mode,
    scan: null,
    passes,
    calls,
    cut: false,
    elapsedMs: Date.now() - started
  };
}

/** One planned `context-read` call: the two lists that ride as `$1` and `$3`. */
export interface ContextReadCall {
  readonly enumerate: readonly string[];
  readonly read: readonly string[];
}

/**
 * Split one pass's missed paths into calls that respect the two caps. PURE.
 *
 *  - The two LIST parameters together stay under
 *    {@link CONTEXT_READ_LIST_MAX_BYTES} per call, the per call cap on the
 *    read list the charter names. A longer list becomes more calls in the
 *    same pass, each paying the measured round trip and nothing else. The cap
 *    is on the pair rather than on each list alone, because the composed
 *    command carries both inside the one `REMOTE_SCRIPT_MAX_BYTES` argument,
 *    being 131,072 bytes, and two full lists would not fit it.
 *  - The read list is also chunked so the far side sizes already known stay
 *    under {@link CONTEXT_ANSWER_BUDGET_BYTES} per call. An unknown size
 *    counts as the reader's default per file cap, and a known size counts at
 *    most {@link CONTEXT_READ_FILE_MAX_BYTES} because `head -c` cuts there.
 *    One file bigger than the whole budget still travels, alone in its call.
 */
export function planContextReadCalls(
  enumerate: readonly string[],
  read: readonly string[],
  sizeOf: (path: string) => number | null
): ContextReadCall[] {
  const out: ContextReadCall[] = [];
  let enumerateNow: string[] = [];
  let readNow: string[] = [];
  let listBytes = 0;
  let answerBytes = 0;
  const flush = (): void => {
    if (enumerateNow.length === 0 && readNow.length === 0) return;
    out.push({ enumerate: enumerateNow, read: readNow });
    enumerateNow = [];
    readNow = [];
    listBytes = 0;
    answerBytes = 0;
  };
  const holding = (): boolean =>
    enumerateNow.length > 0 || readNow.length > 0;
  for (const path of enumerate) {
    const cost = Buffer.byteLength(path, 'utf8') + 1;
    if (holding() && listBytes + cost > CONTEXT_READ_LIST_MAX_BYTES) flush();
    enumerateNow.push(path);
    listBytes += cost;
  }
  for (const path of read) {
    const cost = Buffer.byteLength(path, 'utf8') + 1;
    const known = sizeOf(path);
    const expected = Math.min(
      known ?? CONTEXT_READ_LIMITS.defaultMaxBytes,
      CONTEXT_READ_FILE_MAX_BYTES
    );
    if (
      holding() &&
      (listBytes + cost > CONTEXT_READ_LIST_MAX_BYTES ||
        answerBytes + expected > CONTEXT_ANSWER_BUDGET_BYTES)
    ) {
      flush();
    }
    readNow.push(path);
    listBytes += cost;
    answerBytes += expected;
  }
  flush();
  return out;
}

/**
 * The misses one pass recorded, split into the two lists. PURE over the
 * bundle, except that a path no list can carry is pinned absent in it.
 *
 * A path holding a newline would split into two bogus list rows on the far
 * side, a path holding `*` is a pattern to a shell even under `set -f` on a
 * machine whose shell ignores it, and a relative path would resolve against
 * whatever folder the far side's shell starts in. None of the three is ever
 * sent: each is pinned absent, which is exactly what the parse does to a
 * record it cannot trust.
 */
export function splitMisses(
  bundle: RemoteFsBundle,
  misses: readonly RemoteFsMiss[]
): { enumerate: string[]; read: string[] } {
  const enumerate = new Set<string>();
  const read = new Set<string>();
  for (const one of misses) {
    const path = one.path;
    if (!path.startsWith('/') || path.includes('\n') || path.includes('*')) {
      bundle.absent.add(path);
      continue;
    }
    if (bundle.absent.has(path)) continue;
    if (one.method === 'readDir') enumerate.add(path);
    else read.add(path);
  }
  return { enumerate: [...enumerate].sort(), read: [...read].sort() };
}

/**
 * The whole read, over an injected runner. The tests and row 6 of the probe
 * drive this seam; production goes through {@link readContextOnMachine}.
 *
 * It NEVER THROWS for anything the machine said or failed to say.
 */
export async function readRemoteContextWithRunner(
  input: MachineContextInput,
  runRead: RemoteContextRunner,
  started = Date.now()
): Promise<MachineContextResult> {
  let calls = 0;
  const counted: RemoteContextRunner = async (scriptId, args) => {
    calls += 1;
    return runRead(scriptId, args);
  };
  let home = '';
  let env: Record<string, string> = {};
  try {
    const facts = parseMachineFacts(await counted('machine-facts', []));
    home = facts.home;
    env = { HOME: facts.home, ...facts.env };
  } catch {
    return answerWithout(input, 'unreachable', started, 0, calls);
  }
  if (home.length === 0) {
    // `resolveHomes` would fall back to THIS Mac's home, which is the one
    // wrong answer this feature can produce. Nothing is scanned.
    return answerWithout(input, 'noHome', started, 0, calls);
  }
  // A folder that is not absolute names nothing on that machine, so the scan
  // runs global-only rather than resolving it against a folder on this Mac.
  const cwd =
    typeof input.cwd === 'string' && input.cwd.startsWith('/')
      ? input.cwd
      : null;
  const bundle = createEmptyRemoteBundle();
  let passes = 0;
  let cut = false;
  let scan: ContextScanResult | null = null;
  try {
    for (;;) {
      passes += 1;
      const fs = createRecordingContextFs(bundle);
      scan = await scanContext(
        {
          cwd,
          agent: null,
          hash: 'none',
          includeNested: false,
          env
        },
        { fs }
      );
      const { enumerate, read } = splitMisses(bundle, fs.takeMisses());
      if (enumerate.length === 0 && read.length === 0) break;
      if (passes >= CONTEXT_READ_MAX_PASSES) {
        cut = true;
        break;
      }
      const plan = planContextReadCalls(
        enumerate,
        read,
        (path) => bundle.entries.get(resolveRemotePath(bundle, path))?.size ?? null
      );
      // The calls of one pass are independent, so they go out in bounded
      // waves rather than in series. The fold is order independent, and each
      // wave is folded whole before the next leaves.
      for (let at = 0; at < plan.length; at += CONTEXT_READ_CONCURRENCY) {
        const wave = plan.slice(at, at + CONTEXT_READ_CONCURRENCY);
        const payloads = await Promise.all(
          wave.map((call) =>
            counted('context-read', [
              call.enumerate.join('\n'),
              String(CONTEXT_ENUM_DEPTH),
              call.read.join('\n')
            ])
          )
        );
        for (let one = 0; one < wave.length; one += 1) {
          const call = wave[one];
          const payload = payloads[one];
          if (call === undefined || payload === undefined) continue;
          foldContextReadAnswer(
            bundle,
            {
              enumerate: call.enumerate,
              depth: CONTEXT_ENUM_DEPTH,
              read: call.read
            },
            parseContextReadPayload(payload)
          );
        }
      }
    }
  } catch {
    return answerWithout(input, 'unreachable', started, passes, calls);
  }
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: typeof input.cwd === 'string' ? input.cwd : '',
    mode: 'context',
    scan,
    passes,
    calls,
    cut,
    elapsedMs: Date.now() - started
  };
}

/**
 * Read what the agents on one machine will load. The production entry.
 *
 * @returns a result carrying mode `context` and the scan, or one of the three
 *   refusals. It NEVER THROWS for anything a machine state can cause.
 */
export async function readContextOnMachine(
  input: MachineContextInput
): Promise<MachineContextResult> {
  const started = Date.now();
  if (!machineIsConnected(input.machineId)) {
    return answerWithout(input, 'notConnected', started, 0, 0);
  }
  let ctx: RemoteMachineContext;
  try {
    ctx = readyRemoteContext(input.machineId);
  } catch {
    return answerWithout(input, 'notConnected', started, 0, 0);
  }
  const runner: RemoteContextRunner = async (scriptId, args) =>
    (
      await runRemoteRead(ctx, scriptId, args, {
        timeoutMs:
          scriptId === 'machine-facts'
            ? REMOTE_FACTS_TIMEOUT_MS
            : REMOTE_CONTEXT_TIMEOUT_MS
      })
    ).payload;
  return readRemoteContextWithRunner(input, runner, started);
}
