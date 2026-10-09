/**
 * Start what Tortie needs on another machine, and prove it stuck (Phase 69, M2,
 * research 51 sections 4.1 and 4.6).
 *
 * ## The order, and why every step is where it is
 *
 *  1. `list-sessions -F '#{session_id}'`. An answer means the server is warm and
 *     nothing is asserted on it beyond the option re-assert below. A failure the
 *     classifier calls "no server" means there is nothing there yet. ANY OTHER
 *     failure throws, because nothing is asserted on a machine Tortie cannot
 *     read.
 *  2. `start-server ; set-option -s exit-empty off`, in ONE invocation. The
 *     measurement that makes the chain necessary is in `./exec-plane.ts` beside
 *     `remoteVerbsOf`, and it is short: tmux's own default for `exit-empty` is
 *     `on`, so a server created with `-f /dev/null` and no sessions ends itself
 *     immediately. On this Mac the configuration file prevents that. On another
 *     machine nothing does, unless the option is set in the same invocation that
 *     creates the server. PHASE 342'S FIX ROUND: a refusal of `exit-empty` on
 *     this line, in tmux's own words, is that row's refusal like any other
 *     (step 5), and never a failure the taxonomy cannot place, which a person
 *     read as "could not reach" with the raw error under it.
 *  2a. PHASE 342 (build/p342/SPEC.md D9). On a server this call just started,
 *     `display-message -p '#{version}'`, once, after the boot and before
 *     anything else. It is remembered for the machine (`./far-tmux.ts`), so
 *     the feed's first pass reads that version's quirks, and its pair is
 *     recorded as itself, which is what clears a refusal recorded against a
 *     server that is gone. When the caller says which version the program
 *     reported (Prepare, on a machine with no server), the two must agree:
 *     a server that runs as another version than its program said is not
 *     used, and nothing more is sent to it.
 *  3. The PATH capture, BEFORE step 4 and before any option is written. The
 *     ordering is enforced by the exec plane rather than by this list.
 *  4. `set-environment -g PATH <captured>`.
 *  5. Every row of `remoteBootOptions()`, in that list's order, which since
 *     Phase 342 writes `history-limit` FIRST. A row the server REFUSES, in
 *     tmux's own words (`isOptionRefusal`), is handled by the row's own
 *     `without`: a fallback is sent once, an optional row is skipped and
 *     recorded, and a row durability or scroll-back rests on stops the call
 *     with {@link RemoteTmuxRefused}, sending nothing after it. Any other
 *     failure throws exactly as it always did, with one exception (PHASE
 *     342'S SECOND FIX ROUND): a row durability or scroll-back rests on whose
 *     write failed in words no class places is read back once, and a server
 *     that answers another value is that row's refusal, sentence (1)
 *     (`refuseIfNotHeld`).
 *  6. Read every option back and compare, walking `SERVER_OPTIONS` in its own
 *     order so the row's settings list reads as it always did, a skipped row
 *     left out and a fallback compared with its fallback. A mismatch is
 *     REPORTED, not written again, because a value that will not stick is a
 *     fact about the machine and repeating the write hides it. PHASE 342'S
 *     FIX ROUND: a row durability or scroll-back rests on that the server
 *     took and READ BACK AS ANOTHER VALUE is that row's refusal, said as
 *     sentence (1): the verifier measured a tmux that took `history-limit`
 *     and kept 2,000, answered prepared and said nowhere. Only a read that
 *     answered one line with something on it counts. A read that FAILED does
 *     not, because a dropped link proves nothing about the option, and
 *     neither does an empty answer or one of several lines, which is not a
 *     value tmux said it holds.
 *
 * Every refusal of a row Tortie cannot do without, at step 2, 5 or 6, is
 * recorded in `./far-tmux.ts` for the create that asks it before its create
 * line, because the PATH capture at step 3 already made the machine read as
 * signed in. A set-up that ends with every such row held clears it.
 *
 * ## Steps 2 to 6 run on every no-server detection, not only the first
 *
 * That is the research requirement, and the reason is a machine that rebooted. A
 * machine whose server went away and came back must not come back on tmux's own
 * `history-limit 2000`, which is 8 % of the depth the product promises.
 * `build/probe-execplane.mjs` step 9 ends the scratch remote server between two
 * calls and re-reads every option, so this is proven rather than asserted.
 *
 * ## What this module never does
 *
 * It creates no session, kills nothing, renames nothing and attaches to nothing.
 * The verb ledger in `./exec-plane.ts` refuses all four, so that is enforced and
 * not merely intended.
 */

import { getSettings } from '../settings/store';
import { getLog } from '../log';
import {
  isOptionRefusal,
  localReassertOptions,
  remoteBootOptions,
  runtimeValueOf,
  SERVER_OPTIONS,
  setOptionArgs,
  showOptionArgs,
  type RequiredPurpose,
  type ServerOption
} from '../tmux/server-options';
import { serverProbeVerdict } from '../tmux/errors';
import { parseTmuxVersion } from '../tmux/version';
import { GmuxError, gmuxError, gmuxErrorPayloadOf } from '../errors';
import {
  classifyMachineOutput,
  composeTmuxRefusal,
  machineClassOf,
  type MachineTmuxRefusal
} from './errors';
import { bumpMachineGeneration, type RemoteMachineContext } from './context';
import { execOn } from './exec-plane';
import {
  farServerRow,
  farServerVersion,
  noteFarDisagreement,
  noteFarPair,
  noteFarServerVersion,
  noteFarSettingsHeld,
  noteFarSettingsRefused
} from './far-tmux';
import { captureRemotePath } from './remote-path';

const machinesLog = getLog('config');

/** The list the local boot re-asserts. Re-exported so one name reaches both. */
export { localReassertOptions };

/**
 * The boot verb, as one invocation.
 *
 * `-f /dev/null` is already on the argv by construction, in
 * `./context.ts`'s `tmuxCommand`, so it is not repeated here. `exit-empty` is set
 * with the row's own scope flag, which for this option is `-s`.
 */
export function remoteBootArgs(): string[] {
  return ['start-server', ';', 'set-option', '-s', 'exit-empty', 'off'];
}

/** One option, what Tortie asked for and what the machine answered. */
export interface RemoteOptionReadback {
  readonly name: string;
  readonly wanted: string;
  readonly observed: string;
  readonly agrees: boolean;
}

/**
 * One optional row the server refused (Phase 342, D6, D7). `expected` is true
 * when the measured row for the server's version lists it in `lacks` (and,
 * for a fallback row, the fallback then took, as it did on every measured
 * version), which is a refusal that changes nothing a person sees and is
 * said nowhere. Every other refusal adds one sentence to Prepare's answer.
 */
export interface RemoteOptionRefusal {
  readonly name: string;
  readonly expected: boolean;
  readonly outcome: 'fallback' | 'skipped';
}

/** What one call to {@link ensureRemoteServer} did and found. */
export interface RemoteServerResult {
  /** True when this call created the server rather than finding it. */
  readonly born: boolean;
  /** The PATH the machine reported for this connection. */
  readonly remotePath: string;
  /**
   * Every option, wanted against observed, in `SERVER_OPTIONS`' order. A row
   * the server refused and Tortie skipped is not here; a row that took its
   * fallback is, compared with the fallback.
   */
  readonly options: readonly RemoteOptionReadback[];
  /** The rows whose value did not stick. Empty when every one agreed. */
  readonly disagreed: readonly RemoteOptionReadback[];
  /** PHASE 342. Every optional row the server refused, in the order sent. */
  readonly refused: readonly RemoteOptionRefusal[];
}

/**
 * The two refusals that stop {@link ensureRemoteServer} (Phase 342, D6, D9),
 * as the facts `./errors.ts` composes their sentences from, so the two shapes
 * can never drift apart from the sentences that describe them.
 *
 *  - `required`: a row Tortie cannot do without was refused, in tmux's own
 *    words. `name` is that row; `lines` is the Settings value `history-limit`
 *    was sent, for the sentence; `version` is the server's, or null when no
 *    read named one.
 *  - `disagrees`: a server this call started runs as another version than its
 *    program said.
 */
export type RemoteTmuxRefusal =
  | (Extract<MachineTmuxRefusal, { kind: 'required' }> & { readonly name: string })
  | Extract<MachineTmuxRefusal, { kind: 'disagrees' }>;

/**
 * Why {@link ensureRemoteServer} would not use a machine's tmux (Phase 342).
 *
 * Its `message` is sentence (1) or (4)'s detail from `./errors.ts`, so a
 * restore and a create, which draw an error's message, say what is true and
 * never "could not reach". Prepare maps it to the class `program-refused` with
 * the headline as well, before it asks the taxonomy anything. `born` is
 * whether this call had started the server when it stopped; that server stays,
 * empty, because this module kills nothing.
 */
export class RemoteTmuxRefused extends Error {
  readonly headline: string;
  readonly detail: string;
  constructor(
    readonly refusal: RemoteTmuxRefusal,
    readonly born: boolean = false
  ) {
    const copy = composeTmuxRefusal(refusal);
    super(copy.detail);
    this.name = 'RemoteTmuxRefused';
    this.headline = copy.headline;
    this.detail = copy.detail;
  }
}

/**
 * Whether the machine has a server on Tortie's socket.
 *
 * TWO SENTENCES MEAN NO SERVER HERE, AND THE LOCAL RULE ONLY ACCEPTS ONE. That
 * difference is deliberate and it is worth the paragraph, because a later round
 * that "unified" the two would break one of them.
 *
 * `serverProbeVerdict` in `../tmux/errors.ts` answers a different question. It
 * decides whether a failed list PROVED the local server is dead, and its answer
 * drives whether Tortie offers Restore over a row. Phase 67 measured that a live
 * server whose socket file was deleted keeps every session running, so
 * "error connecting to <path> (No such file or directory)" cannot be treated as
 * death there: doing so offers Restore over an agent that is still working.
 *
 * The question here is whether to START a server on a machine that appears to
 * have none. In this release Tortie creates no session on any machine, so there
 * is no work on the far side for a second server to hide. So both sentences are
 * accepted, `serverProbeVerdict` is still asked first because a refused connect is
 * the stronger of the two answers, and the second pattern is read from the
 * machine taxonomy so there is one place that owns it.
 *
 * **This is owed to M3.** Once a machine can hold sessions, a missing socket file
 * on it stops being harmless and this function has to be revisited with a
 * measurement of what a far side's deleted socket file does to its live sessions.
 */
export async function remoteServerVerdict(
  ctx: RemoteMachineContext
): Promise<'running' | 'no-server' | 'unknown'> {
  try {
    await execOn(ctx, ['list-sessions', '-F', '#{session_id}']);
    return 'running';
  } catch (err) {
    if (serverProbeVerdict(err) === 'no-server') return 'no-server';
    const detail =
      err instanceof GmuxError ? String(err.payload.detail ?? '') : '';
    return classifyMachineOutput(detail) === 'no-server' ? 'no-server' : 'unknown';
  }
}

/**
 * Why {@link ensureRemoteServer} stopped part way (Phase 340.1's fix round):
 * its caller's `stillRouted` answered false. `born` is whether this call had
 * already started the server when it stopped.
 */
export class RemoteServerSetUpStopped extends Error {
  constructor(readonly born: boolean) {
    super(
      'the machine’s details changed while its server was being set up, so ' +
        'nothing more was sent to it'
    );
    this.name = 'RemoteServerSetUpStopped';
  }
}

/** What a caller may hand {@link ensureRemoteServer} (Phase 340.1's fix round). */
export interface RemoteServerSetUpOptions {
  /**
   * Asked after every command this call sends. False stops the call there,
   * before the next command, with {@link RemoteServerSetUpStopped}.
   *
   * Prepare alone passes it, as "the route this Prepare signed in over is
   * still the confirmed one" (`machineRouteEpoch`, `./context.ts`). Without it
   * a confirm of changed details that landed inside this call let the rest of
   * the set-up go to the old details: the reverify's arm B counted 24 commands
   * after the confirm. A restore and a create pass nothing and are unchanged.
   */
  readonly stillRouted?: () => boolean;
  /**
   * PHASE 342 (D9). The version the program reported, when Prepare read it
   * with its own `-V` because no server answered. A server this call starts
   * must report the same, or it is not used. A restore and a create pass
   * none: the server they start is still asked its version, which is noted,
   * and compared with nothing.
   */
  readonly version?: string | null;
}

/**
 * Make sure the machine is running what Tortie needs, and say what it found.
 *
 * @throws GmuxError when the machine cannot be read at all, when it would not
 *   report its program search list, or when a command over the connection failed.
 * @throws RemoteServerSetUpStopped when `how.stillRouted` answered false.
 * @throws RemoteTmuxRefused when the server refused a row Tortie cannot do
 *   without, or a server this call started reports another version than
 *   `how.version` (Phase 342).
 */
export async function ensureRemoteServer(
  ctx: RemoteMachineContext,
  how: RemoteServerSetUpOptions = {}
): Promise<RemoteServerResult> {
  let born = false;
  const stillRouted = (): void => {
    if (how.stillRouted !== undefined && !how.stillRouted()) {
      throw new RemoteServerSetUpStopped(born);
    }
  };
  const verdict = await remoteServerVerdict(ctx);
  stillRouted();
  if (verdict === 'unknown') {
    // Nothing is asserted on a machine Tortie cannot read. Rethrowing the
    // classifier's own error would lose the reason, so the read runs again and
    // its error travels up with its own sentence.
    await execOn(ctx, ['list-sessions', '-F', '#{session_id}']);
    stillRouted();
  }

  born = verdict === 'no-server';
  // The version the options are judged against: the server's own. A warm
  // server's is the one the caller's gate read and this run noted; a server
  // this call starts is asked below.
  let serverVersion = how.version ?? farServerVersion(ctx.machineId);
  const scrollback = getSettings().scrollbackLines;
  if (born) {
    // A new server is a new connection's worth of state, so the generation moves
    // and the PATH captured for the previous one is dropped rather than carried.
    bumpMachineGeneration(ctx.machineId);
    try {
      await execOn(ctx, remoteBootArgs());
    } catch (err) {
      // PHASE 342'S FIX ROUND. The boot line carries the `exit-empty` row, so
      // a refusal of it in tmux's own words is that row's refusal, said as
      // sentence (1). Anything else is thrown as it always was. The route is
      // asked first, as after every other command, so a refusal met over
      // details a person has since replaced records nothing about the machine
      // they describe now.
      stillRouted();
      const stays = SERVER_OPTIONS.find((row) => row.name === 'exit-empty');
      const said = gmuxErrorPayloadOf(err)?.detail ?? '';
      if (stays !== undefined && stays.without.kind === 'required' && isOptionRefusal(said, stays.name, stays.value)) {
        refuseRequired(
          ctx,
          {
            kind: 'required',
            name: stays.name,
            purpose: stays.without.purpose,
            version: serverVersion,
            lines: scrollback
          },
          born,
          'refused'
        );
      }
      throw err;
    }
    stillRouted();
    // Step 2a. PHASE 342 (D9). After the boot's own question, so a route
    // retired during the boot sends nothing more, this read included.
    const printed = await execOn(ctx, ['display-message', '-p', '#{version}']);
    stillRouted();
    const ran = parseTmuxVersion(printed);
    if (ran === null) {
      machinesLog.warn(
        `${ctx.machineId}'s new server did not name its version, so nothing ` +
          `was compared with it.`
      );
    } else {
      serverVersion = ran;
      noteFarServerVersion(ctx.machineId, ran);
      noteFarPair(ctx.machineId, ran, ran);
      const said = how.version ?? null;
      // PHASE 342'S SECOND FIX ROUND. Remembered, keyed by the version it ran
      // as, so the next Prepare of this warm server says sentence (4) about
      // the same program again rather than that it was updated; a server that
      // agrees with its program clears it.
      if (said !== null) noteFarDisagreement(ctx.machineId, said, ran);
      if (said !== null && said !== ran) {
        machinesLog.warn(
          `${ctx.machineId}'s program said tmux ${said} and the server it ` +
            `started runs as ${ran}, so Tortie will not use it. The server stays.`
        );
        throw new RemoteTmuxRefused({ kind: 'disagrees', said, ran }, true);
      }
    }
  }

  // Step 3. Before any option is written, and before any environment is set.
  const remotePath = await captureRemotePath(ctx);
  stillRouted();
  await execOn(ctx, ['set-environment', '-g', 'PATH', remotePath]);
  stillRouted();

  // Step 5. PHASE 342: `history-limit` first, and a refusal is the row's to
  // handle, by what the row says Tortie does without it.
  const lacks = farServerRow(ctx.machineId)?.lacks ?? [];
  const refused: RemoteOptionRefusal[] = [];
  /** The value each row ended up holding, when it is not the row's own. */
  const fellBack = new Map<string, string>();
  const skipped = new Set<string>();
  for (const row of remoteBootOptions()) {
    const value = runtimeValueOf(row, scrollback);
    let took: boolean;
    try {
      took = await setOrRefused(ctx, row, value);
    } catch (err) {
      // PHASE 342'S SECOND FIX ROUND. A row Tortie cannot do without that the
      // server would not take, in words tmux never uses, is asked once more:
      // the row is read back, and a server that HOLDS another value is that
      // row's refusal, sentence (1), recorded for the create. Every other
      // failure is thrown exactly as it came.
      if (row.without.kind === 'required') {
        await refuseIfNotHeld(ctx, row, value, err, {
          purpose: row.without.purpose,
          version: serverVersion,
          lines: scrollback,
          born,
          stillRouted
        });
      }
      throw err;
    }
    stillRouted();
    if (took) continue;
    const expected = lacks.includes(row.name);
    if (row.without.kind === 'required') {
      refuseRequired(
        ctx,
        {
          kind: 'required',
          name: row.name,
          purpose: row.without.purpose,
          version: serverVersion,
          lines: scrollback
        },
        born,
        'refused'
      );
    }
    if (row.without.kind === 'fallback') {
      const fallback = row.without.value;
      const tookFallback = await setOrRefused(ctx, row, fallback);
      stillRouted();
      if (tookFallback) {
        fellBack.set(row.name, fallback);
        refused.push({ name: row.name, expected, outcome: 'fallback' });
        continue;
      }
      // A fallback the server refused too is a skip, and NOT an expected one
      // whatever the row lacks: every measured version that lacks this row
      // took its fallback, so a refusal of the fallback is something the
      // measurement did not predict, which is what the sentence is for.
      skipped.add(row.name);
      refused.push({ name: row.name, expected: false, outcome: 'skipped' });
      continue;
    }
    skipped.add(row.name);
    refused.push({ name: row.name, expected, outcome: 'skipped' });
  }
  if (refused.length > 0) {
    const said = refused
      .map((one) => `${one.name} (${one.outcome}${one.expected ? '' : ', not expected'})`)
      .join(', ');
    const line =
      `${ctx.machineId}'s tmux ${serverVersion ?? '(version unknown)'} refused ` +
      `${String(refused.length)} optional setting(s): ${said}`;
    if (refused.every((one) => one.expected)) machinesLog.info(line);
    else machinesLog.warn(line);
  }

  // Step 6. In `SERVER_OPTIONS`' own order, so the row's settings list reads as
  // it always did. A skipped row has nothing to read back.
  const options: RemoteOptionReadback[] = [];
  /**
   * PHASE 342'S FIX ROUND. The first row Tortie cannot do without that the
   * server took and READ BACK AS ANOTHER VALUE. Only a read that answered ONE
   * line with something on it counts: a read that failed is null, and an
   * empty answer or one with more than one line (a shell start-up file that
   * prints on every command, say) is not a value tmux said it holds, so it is
   * reported with the others as it always was and stops nothing.
   */
  let notKept: { readonly row: ServerOption; readonly purpose: RequiredPurpose } | null = null;
  for (const row of SERVER_OPTIONS) {
    if (skipped.has(row.name)) continue;
    const wanted = fellBack.get(row.name) ?? runtimeValueOf(row, scrollback);
    const answered = await readOption(ctx, row);
    stillRouted();
    const observed = answered ?? '';
    options.push({
      name: row.name,
      wanted,
      observed,
      agrees: observed === wanted
    });
    if (
      notKept === null &&
      row.without.kind === 'required' &&
      answered !== null &&
      answered.trim() !== '' &&
      !answered.includes('\n') &&
      answered !== wanted
    ) {
      notKept = { row, purpose: row.without.purpose };
    }
  }
  const disagreed = options.filter((row) => !row.agrees);
  if (disagreed.length > 0) {
    machinesLog.warn(
      `${ctx.machineId} did not keep ${String(disagreed.length)} setting(s): ` +
        disagreed
          .map((row) => `${row.name} asked ${row.wanted} got ${row.observed}`)
          .join(', ')
    );
  }
  if (notKept !== null) {
    refuseRequired(
      ctx,
      {
        kind: 'required',
        name: notKept.row.name,
        purpose: notKept.purpose,
        version: serverVersion,
        lines: scrollback
      },
      born,
      'not kept'
    );
  }
  // Every row Tortie cannot do without is held: a refusal an earlier set-up
  // of this machine recorded is cleared, so the next create may start one.
  noteFarSettingsHeld(ctx.machineId);
  return { born, remotePath, options, disagreed, refused };
}

/**
 * Stop the set-up on a row Tortie cannot do without (Phase 342, D6, and its
 * fix round). The refusal is RECORDED for the machine, keyed by the server
 * version it was met on, before it is thrown, so a create that carries no
 * names, which never runs this set-up again, still asks it before its create
 * line (`./far-tmux.ts`). Nothing is sent after it. `how` is only the log's.
 */
function refuseRequired(
  ctx: RemoteMachineContext,
  refusal: Extract<RemoteTmuxRefusal, { kind: 'required' }>,
  born: boolean,
  how: 'refused' | 'not kept' | 'would not take and does not hold'
): never {
  const err = new RemoteTmuxRefused(refusal, born);
  noteFarSettingsRefused(ctx.machineId, {
    server: refusal.version,
    name: refusal.name,
    sentence: err.message
  });
  machinesLog.warn(
    `${ctx.machineId}'s tmux ${refusal.version ?? '(version unknown)'} ` +
      `${how === 'not kept' ? 'took and did not keep' : how} ${refusal.name}, ` +
      `which Tortie cannot do without, so nothing more was sent to it and no ` +
      `session is started there.`
  );
  throw err;
}

/**
 * PHASE 342'S SECOND FIX ROUND. A row Tortie cannot do without whose write
 * FAILED in words that are not tmux's refusal (`isOptionRefusal` reads only
 * tmux's own seven shapes, D6).
 *
 * The verifier measured the gap this closes: a tmux that refused
 * `remain-on-exit` in other words stopped the set-up with the taxonomy's
 * "could not reach" while the PATH capture had already made the machine read
 * as signed in, so the chip read Ready and a create started a session on a
 * server whose `remain-on-exit` read `off`. The words alone prove nothing
 * about the option, which is why D6 does not read them, so the SERVER is asked
 * instead: the row is read back once, and a server that answers ONE line
 * holding ANOTHER value does not hold what Tortie needs. That is the row's
 * refusal, sentence (1), recorded for the create and thrown, exactly as a row
 * taken and read back as another value is. Asked only of a failure the far
 * side answered in words that no class of the taxonomy places (a link that
 * dropped, a server that is gone and every sign-in failure are classed and
 * proved nothing about the option), and the route is asked before the read as
 * after every other command.
 *
 * It returns, and the caller throws the original failure exactly as before,
 * when the read answered the value Tortie wanted (the server holds it, so no
 * session is at risk), and when it failed, answered nothing or answered more
 * than one line (nothing is known about the option; the stated residual).
 */
async function refuseIfNotHeld(
  ctx: RemoteMachineContext,
  row: ServerOption,
  wanted: string,
  err: unknown,
  facts: {
    readonly purpose: RequiredPurpose;
    readonly version: string | null;
    readonly lines: number;
    readonly born: boolean;
    readonly stillRouted: () => void;
  }
): Promise<void> {
  if (machineClassOf(err) !== null) return;
  const payload = gmuxErrorPayloadOf(err);
  if (payload === null || payload.code !== 'UNKNOWN') return;
  if ((payload.detail ?? '').trim() === '') return;
  facts.stillRouted();
  const answered = await readOption(ctx, row);
  facts.stillRouted();
  if (
    answered === null ||
    answered.trim() === '' ||
    answered.includes('\n') ||
    answered === wanted
  ) {
    return;
  }
  refuseRequired(
    ctx,
    {
      kind: 'required',
      name: row.name,
      purpose: facts.purpose,
      version: facts.version,
      lines: facts.lines
    },
    facts.born,
    'would not take and does not hold'
  );
}

/**
 * Answer a refusal of the set-up the way a CREATE or a RESTORE answers every
 * other refusal (Phase 342's fix round): the structured error, whose message
 * is the refusal's own sentence, which every session surface unwraps and
 * draws. A {@link RemoteTmuxRefused} is a plain error, so it crossed the
 * invoke boundary as "Error invoking remote method …: RemoteTmuxRefused: …",
 * Electron's prefix and the class's name drawn in front of the sentence.
 * Prepare maps the class itself and does not call this. Every other failure
 * is thrown exactly as it came.
 *
 * Handed to the create's and the restore's `ensureRemoteServer(ctx).catch(…)`.
 */
export function throwAsSessionError(err: unknown): never {
  if (err instanceof RemoteTmuxRefused) {
    throw gmuxError(
      'INVALID_INPUT',
      err.message,
      `${err.headline} (${err.refusal.kind === 'required' ? err.refusal.name : 'the version it says'})`
    );
  }
  throw err;
}

/**
 * Send one row's value. True when it took, false when the server REFUSED it in
 * tmux's own words (Phase 342, D6). Every other failure is thrown exactly as
 * before, because only a recognised refusal is a fact about the option.
 */
async function setOrRefused(
  ctx: RemoteMachineContext,
  row: ServerOption,
  value: string
): Promise<boolean> {
  try {
    await execOn(ctx, setOptionArgs(row, value));
    return true;
  } catch (err) {
    const said = gmuxErrorPayloadOf(err)?.detail ?? '';
    if (isOptionRefusal(said, row.name, value)) return false;
    throw err;
  }
}

/**
 * One option read back, as the string the machine printed, or null when the
 * read failed.
 *
 * A read that fails does not throw, because a value that cannot be read belongs
 * in the table beside the others, as an empty string the caller writes there,
 * rather than ending the whole call. PHASE 342'S FIX ROUND made the failure
 * null rather than that empty string, because the caller now tells the two
 * apart: a required row the server read back as ANOTHER value stops the
 * set-up, and a read that failed proves nothing about the option.
 *
 * MEASURED on tmux 3.6a, 2026-08-17, which is why the row's own scope flag is
 * used for the read: `show-options -sv <a session option>` fails with
 * "no current session" on a server holding zero sessions, while
 * `show-options -gv <a server option>` answers correctly. So `-g` reads both and
 * `-s` reads only server options, and using the row's own flag is right for every
 * row.
 */
async function readOption(
  ctx: RemoteMachineContext,
  row: ServerOption
): Promise<string | null> {
  try {
    // `copy-mode-position-format` is the empty string on purpose, so the trailing
    // newline is the only thing trimmed.
    return (await execOn(ctx, showOptionArgs(row))).replace(/\n$/, '');
  } catch {
    return null;
  }
}
