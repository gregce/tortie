/**
 * What Tortie knows about one machine's tmux in this run (Phase 342,
 * build/p342/SPEC.md D3, D24).
 *
 * ## Why this is a leaf of its own
 *
 * Two facts are learnt in Prepare and asked everywhere else: which version the
 * machine's SERVER runs, and whether the program beside that server is one
 * Tortie measured talking to it. `./row-facts.ts` is written only at Prepare's
 * end, after the feed's first pass, and the feed needs the version's quirks on
 * that very pass; the live connection, the attach, a create and a restore need
 * the pair verdict before they spawn anything. So both facts live here, in
 * memory, written the moment they are read and forgotten with the row's other
 * memory (a confirm of changed details, a remove). The module imports only the
 * version table and the error door, so anything may ask it without a cycle,
 * as `./ready-context.ts` may be asked. That is why the ONE line it hands out,
 * the pair sentence's headline, is written here rather than in `./errors.ts`:
 * `./errors.ts` composes the pair sentence from it and re-exports it, so the
 * four sentences of build/p342/SPEC.md D10 still stand together by name there.
 *
 * ## The pair verdict is KEYED BY THE SERVER VERSION it was read against
 *
 * A program updated beside a running 3.5a server cannot talk to it (measured:
 * a 3.6b program never greeted a 3.5a server over a live connection, and an
 * attach through it exited at once, while the server and its sessions ran
 * on). Prepare reads the program once, beside the server version it read, and
 * records the verdict here with that server version. Every other asker only
 * CONSULTS: a verdict counts while the server version this run last noted for
 * the machine is the one it was read against. The moment any read notes a
 * different server version, which is what the first read after the machine
 * restarts does, the old verdict stops counting and nothing has to clear it.
 *
 * ## The four verdicts
 *
 *  - `server-only`: the server's row carries no `programs` (every row from
 *    3.6, and any version without a row). Nothing is refused here.
 *  - `measured`: the program is on the server's row's `programs`.
 *  - `refused`: it is not. The live connection, an attach, a create and a
 *    restore are refused with the pair sentence; the Explorer, saving and
 *    every read work across the pair and are not asked.
 *  - `unreadable`: the server's row carries `programs` and the program named
 *    no version. Only the live connection is refused, logged, with no
 *    sentence, because nothing is known to be wrong with the attach.
 *
 * It can only refuse. Nothing here admits a version a gate refused, and
 * nothing here reads a machine.
 *
 * ## A setting Tortie cannot do without, refused (the fix round)
 *
 * The third fact, learnt by the set-up (`./remote-server.ts`) and asked by a
 * create. When a server refuses one of the four rows durability or scroll-back
 * rests on, or takes it and reads back another value, the set-up stops and
 * Prepare says sentence (1), "so Tortie will not start sessions there". The
 * verifier measured that promise broken: the set-up captures the machine's
 * PATH BEFORE it writes the options, so the machine reads as signed in, and a
 * create that carries no names never runs the set-up again, so a session
 * started on a server whose `remain-on-exit` read `off` and whose
 * `history-limit` read 2,000. So the set-up records the refusal here, KEYED BY
 * THE SERVER VERSION it was met on, as the pair is, and a create asks it
 * synchronously before its create line. A set-up that ends with every row it
 * needs held clears it, and so does any read that notes another server
 * version, which is what the first read after the machine restarts on another
 * tmux does. A refusal met while no read had named the server's version counts
 * until a set-up clears it, because nothing then says the server changed.
 *
 * An ATTACH does not ask it, deliberately. An attach opens a session that is
 * already running there, and refusing it would hide a person's running work,
 * which is worse than today (at the parent the same machine took a create
 * and an attach). The sentence promises only that Tortie will not START one.
 * A restore always runs the set-up first, which asks the server again.
 */

import { gmuxError } from '../errors';
import {
  decideRemotePair,
  TESTED_REMOTE_TMUX_VERSIONS,
  type TestedRemoteTmux
} from '../tmux/version';

/**
 * PHASE 342 (D3, D10, sentence 3), its first line. A program updated beside a
 * server that kept running, a pair nobody measured (his ruling 3 on research
 * 131: "Only say so"). It ends nothing and names no command. The link's
 * reason, an attach's, a create's and a restore's refusal, and the precheck's
 * all say exactly this. Pinned by `build/assert-bundle-refusals.mjs` as
 * `machine.tmux-updated-under-sessions`, and re-exported by `./errors.ts`,
 * which composes the detail under it.
 */
export const MACHINE_TMUX_UPDATED_HEADLINE =
  "This machine's tmux was updated while its sessions kept running.";

/**
 * PHASE 342 (D9, D10, sentence 4), its first line: a server Tortie started
 * that runs as another version than its program said. Written here for the
 * same reason as {@link MACHINE_TMUX_UPDATED_HEADLINE} (the second fix round
 * moved it): the pair refusal says THIS line instead, about a program that
 * this run saw say one version and start a server that runs as another, so a
 * program that lies is never said to have been updated. Pinned by
 * `build/assert-bundle-refusals.mjs` as `machine.tmux-version-disagrees` and
 * re-exported by `./errors.ts`.
 */
export const MACHINE_TMUX_DISAGREES_HEADLINE = "This machine's tmux is not the version it says.";

/** One of the four verdicts above. */
export type FarPairKind = 'server-only' | 'measured' | 'refused' | 'unreadable';

/** One recorded pair, and the server version it was read against. */
export interface FarPairRecord {
  readonly server: string;
  readonly program: string | null;
  readonly kind: FarPairKind;
}

/** The server version each machine's last read reported, in this run. */
const serverVersions = new Map<string, string>();

/** The last pair verdict recorded for each machine, keyed by its server. */
const pairs = new Map<string, FarPairRecord>();

/**
 * A row Tortie cannot do without that one machine's server would not keep,
 * and the server version it was met on (the fix round, see the header).
 */
export interface FarSettingsRefusal {
  /** The server version the set-up judged, or null when no read had named one. */
  readonly server: string | null;
  /** The row the server refused, or took and read back as another value. */
  readonly name: string;
  /**
   * Sentence (1)'s detail, composed by the set-up that met the refusal, so
   * this leaf composes nothing and imports nothing of `./errors.ts`.
   */
  readonly sentence: string;
}

/** The last such refusal recorded for each machine, keyed by its server. */
const settingsRefusals = new Map<string, FarSettingsRefusal>();

/**
 * PHASE 342'S SECOND FIX ROUND. A program this run saw say one version and
 * start a server that runs as another (sentence 4), keyed by the server
 * version it RAN as. The second verifier found the next Prepare of that warm
 * server reading the same program beside it, a pair nobody measured, and
 * saying "This machine's tmux was updated while its sessions kept running …
 * After that machine restarts, Tortie can restore them", which is false of a
 * program that lies about its version: nothing was updated and a restart
 * changes nothing. While this is recorded, that pair is said as sentence (4).
 */
export interface FarDisagreement {
  readonly said: string;
  readonly ran: string;
}

/** The last disagreement a server this run started showed, per machine. */
const disagreements = new Map<string, FarDisagreement>();

/**
 * Remember the version a read of this machine's SERVER reported. A read that
 * named no version changes nothing, so an unreadable answer never makes an
 * old verdict stop counting.
 */
export function noteFarServerVersion(machineId: string, version: string | null): void {
  if (version === null || version.length === 0) return;
  serverVersions.set(machineId, version);
}

/** The server version this run last noted for the machine, or null. */
export function farServerVersion(machineId: string): string | null {
  return serverVersions.get(machineId) ?? null;
}

/**
 * The measured row for the server version this run last noted, or null when
 * none was noted or that version has no row (an accepted one, say).
 */
export function farServerRow(machineId: string): TestedRemoteTmux | null {
  const version = serverVersions.get(machineId);
  if (version === undefined) return null;
  return TESTED_REMOTE_TMUX_VERSIONS.find((row) => row.version === version) ?? null;
}

/**
 * Record what one server and the program beside it add up to, keyed by that
 * server version. `program` null is a program that named no version: on a
 * row carrying `programs` that is `unreadable`, which refuses the live
 * connection only.
 */
export function noteFarPair(machineId: string, server: string, program: string | null): void {
  const verdict = decideRemotePair(server, program);
  const kind: FarPairKind =
    verdict.kind === 'refused' && program === null ? 'unreadable' : verdict.kind;
  pairs.set(machineId, { server, program, kind });
}

/**
 * The recorded pair, ONLY while it was read against the server version this
 * run last noted for the machine. A verdict about a server that has since
 * restarted at another version is null here, so it refuses nothing.
 */
export function farPairOf(machineId: string): FarPairRecord | null {
  const record = pairs.get(machineId);
  if (record === undefined) return null;
  return serverVersions.get(machineId) === record.server ? record : null;
}

/**
 * Record what a server this run STARTED ran as, beside the version its
 * program said (Phase 342's second fix round). A disagreement is kept; a
 * server that agrees with its program clears one recorded before.
 */
export function noteFarDisagreement(machineId: string, said: string, ran: string): void {
  if (said === ran) disagreements.delete(machineId);
  else disagreements.set(machineId, { said, ran });
}

/**
 * The recorded disagreement, ONLY while the server version this run last
 * noted is the one it ran as, so a server that has since restarted at another
 * version is no longer said to disagree.
 */
export function farDisagreementOf(machineId: string): FarDisagreement | null {
  const record = disagreements.get(machineId);
  if (record === undefined) return null;
  return serverVersions.get(machineId) === record.ran ? record : null;
}

/**
 * The refused pair's program is the one this run saw lie about its version
 * beside this very server (Phase 342's second fix round), and not a program
 * updated beside a server that kept running.
 */
export function farPairIsDisagreement(machineId: string): boolean {
  const pair = farPairOf(machineId);
  const said = farDisagreementOf(machineId);
  return (
    pair !== null &&
    pair.kind === 'refused' &&
    said !== null &&
    said.ran === pair.server &&
    said.said === pair.program
  );
}

/**
 * Refuse a create or a restore on a machine whose server, started by this
 * run, runs as another version than its program said (Phase 342's second fix
 * round). Asked ONLY where the machine's context was refused as not signed
 * in, which is what such a set-up leaves: it stops after its boot and before
 * the PATH capture. Synchronous.
 *
 * @throws GmuxError INVALID_INPUT with sentence (4)'s first line.
 */
export function assertFarVersionAgrees(machineId: string): void {
  const record = farDisagreementOf(machineId);
  if (record === null) return;
  throw gmuxError(
    'INVALID_INPUT',
    MACHINE_TMUX_DISAGREES_HEADLINE,
    `${machineId}'s program said tmux ${record.said} and the server it started runs as ${record.ran}`
  );
}

/**
 * The pair sentence's first line when the current pair is `refused`, else
 * null. `unreadable` is null here: it refuses the live connection alone,
 * through {@link farPairBlocksLive}. A refused pair whose program this run saw
 * say another version than the server it started runs as is said as sentence
 * (4)'s first line, never as an update (the second fix round).
 */
export function farPairRefusal(machineId: string): string | null {
  if (farPairOf(machineId)?.kind !== 'refused') return null;
  return farPairIsDisagreement(machineId)
    ? MACHINE_TMUX_DISAGREES_HEADLINE
    : MACHINE_TMUX_UPDATED_HEADLINE;
}

/** True when no NEW live connection may be opened to the machine. */
export function farPairBlocksLive(machineId: string): boolean {
  const kind = farPairOf(machineId)?.kind;
  return kind === 'refused' || kind === 'unreadable';
}

/**
 * Refuse an attach, a create or a restore on a machine whose current pair is
 * refused, before anything spawns. Synchronous, so a caller that has checked
 * everything else can ask it last with nothing awaited before its spawn.
 *
 * @throws GmuxError INVALID_INPUT with the pair sentence's first line.
 */
export function assertFarPairUsable(machineId: string): void {
  const refusal = farPairRefusal(machineId);
  if (refusal === null) return;
  const record = farPairOf(machineId);
  throw gmuxError(
    'INVALID_INPUT',
    refusal,
    `${machineId} runs a tmux ${record?.server ?? 'server'} server beside a ` +
      `${record?.program ?? 'unreadable'} program, a pair Tortie has not measured`
  );
}

/**
 * Record that this machine's server would not keep a row Tortie cannot do
 * without. Written by the set-up alone, the moment it stops on it.
 */
export function noteFarSettingsRefused(machineId: string, refusal: FarSettingsRefusal): void {
  settingsRefusals.set(machineId, refusal);
}

/**
 * Record that a set-up of this machine ended with every row it needs held,
 * which is what clears a refusal an earlier set-up recorded.
 */
export function noteFarSettingsHeld(machineId: string): void {
  settingsRefusals.delete(machineId);
}

/**
 * The recorded refusal, while it still describes the server: while the
 * server version this run last noted is the one it was met on, or always when
 * it was met with no version named. Null otherwise.
 */
export function farSettingsRefusal(machineId: string): FarSettingsRefusal | null {
  const record = settingsRefusals.get(machineId);
  if (record === undefined) return null;
  if (record.server === null) return record;
  return serverVersions.get(machineId) === record.server ? record : null;
}

/**
 * Refuse a CREATE on a machine whose server would not keep a row Tortie cannot
 * do without, before anything spawns. Synchronous, so the create asks it
 * immediately before its create line, beside {@link assertFarPairUsable}. An
 * attach never asks it (see the header).
 *
 * @throws GmuxError INVALID_INPUT with sentence (1)'s detail.
 */
export function assertFarSettingsHeld(machineId: string): void {
  const record = farSettingsRefusal(machineId);
  if (record === null) return;
  throw gmuxError(
    'INVALID_INPUT',
    record.sentence,
    `${machineId}'s tmux ${record.server ?? '(version unknown)'} would not keep ` +
      `${record.name}, which Tortie cannot do without, so no session is started there`
  );
}

/** Forget every fact about one machine: a confirm of changed details, a remove. */
export function forgetFarTmux(machineId: string): void {
  serverVersions.delete(machineId);
  pairs.delete(machineId);
  settingsRefusals.delete(machineId);
  disagreements.delete(machineId);
}

/** Forget everything. Tests only. */
export function resetFarTmuxForTests(): void {
  serverVersions.clear();
  pairs.clear();
  settingsRefusals.clear();
  disagreements.clear();
}
