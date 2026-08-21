/**
 * The program and the argv for one attach, for both kinds of machine
 * (Phase 70, M3, research 51 section 4.1, the ATTACH row).
 *
 * ## Why this is its own module
 *
 * Until this rung the attach host spawned one shape and wrote it inline. It now
 * has two, and the file that holds the terminal binding should not also be the
 * file a reviewer has to read to learn what Tortie sends to another machine. So
 * the composition is here, it is pure, and it starts nothing.
 *
 * This module reads no file, opens no terminal, loads no native module and
 * spawns no process. `src/main/attach/__tests__/attach-plan.test.ts` reads its
 * import lines and fails on anything outside a short allowed list, the same way
 * `src/main/machines/__tests__/carriage.test.ts` guards the carriage. That test
 * is the mechanism, and this paragraph is only the reason for it.
 *
 * ## The two shapes
 *
 * The local shape is what `./attach-host.ts` composed inline at `b660df9`, byte
 * for byte:
 *
 *     <tmux bin> -u -L <socket> -f <conf path> attach-session -t =<name>
 *
 * The remote shape is one ssh client on this Mac carrying one tmux client on the
 * other machine:
 *
 *     <ssh> -t <the carriage options> <host> '<program> -L <socket> \
 *           -f /dev/null -u attach-session -t =<name>'
 *
 * ## Four notes on the remote argv, because a reviewer will ask about each
 *
 * - `-t` is ssh's first argument and it forces a terminal. Without it ssh gives
 *   the remote command no terminal at all and tmux refuses to attach.
 * - `-u` says this client is UTF-8. It is the same flag and the same reason as
 *   the local shape, which is Bug C from Phase 9.2. tmux takes its global flags
 *   in any order, so `-u` after `-f` is the same client as `-u` first.
 * - `-f /dev/null` is one flag more than the ATTACH row in research 51 section
 *   4.1 shows, and it is kept on purpose. Any verb can create a server
 *   implicitly, and a server created without this flag reads that machine's own
 *   configuration file. It is inert on a server that is already up, which is the
 *   only state an attach ever meets. This is the single deviation from the table
 *   and the phase report names it.
 * - `=` before the name is an exact match. A bare name matches on a prefix, and a
 *   prefix match on another machine would stream a stranger's session into the
 *   person's tab. THE TARGET IS ALWAYS QUOTED, and the measurement that forced
 *   that is in the header of {@link quoteTarget}.
 *
 * ## Nothing here is composed twice
 *
 * The ssh options come from `../machines/ssh`, the tmux part of the remote line
 * comes from `remoteTmuxArgv` in `../machines/context`, and the quoting comes
 * from the one quoting helper in this process. A second option list would be a
 * second place a keepalive could be dropped, and a dropped keepalive is a link
 * that hangs instead of ending.
 *
 * The socket name is read from the machine context and never written here. A
 * literal socket name in this file is a conformance failure, because the far
 * side of the live probe is this Mac and the operator's own sessions are on the
 * real socket.
 */

import {
  remoteTmuxArgv,
  type RemoteMachineContext,
  type SpawnPlan
} from '../machines/context';
import { sshOptions } from '../machines/ssh';
import { shellQuoteArgv } from '../restore/command';

/** An attach to a session on this Mac. */
export interface AttachTargetLocal {
  readonly kind: 'local';
  /** Absolute path to the tmux binary this process runs. */
  readonly bin: string;
  /** The private socket name. Never the person's own default server. */
  readonly socket: string;
  /** Absolute path to the configuration file Tortie ships. */
  readonly confPath: string;
  /** The sanitized session name on that server. */
  readonly tmuxName: string;
}

/** An attach to a session on another machine. */
export interface AttachTargetRemote {
  readonly kind: 'remote';
  /** The machine, already through the confirm gate. */
  readonly ctx: RemoteMachineContext;
  /** The sanitized session name on that machine's server. */
  readonly tmuxName: string;
}

export type AttachTarget = AttachTargetLocal | AttachTargetRemote;

/**
 * How a session name is addressed on either kind of machine.
 *
 * The `=` is added unconditionally, which is what the host did at `b660df9`. A
 * caller that already prefixed one gets two, and that is the golden behaviour
 * rather than a defect to tidy away: the one production caller passes an
 * immutable `$`-id, and tmux reads `=$3` as that id.
 */
export function exactTarget(tmuxName: string): string {
  return `=${tmuxName}`;
}

/**
 * Quote the session target so the other machine's shell cannot rewrite it.
 *
 * MEASURED 2026-08-17 by `build/probe-remote-attach.mjs` against a scratch sshd,
 * with the target left to the general quoter:
 *
 *     /opt/homebrew/bin/tmux -L <socket> -f /dev/null -u attach-session \
 *       -t =p70-attach-77211
 *
 *       exit 1, and what came back on the terminal was
 *       "zsh:1: p70-attach-77211 not found". The attach never reached tmux.
 *
 * The reason is that zsh has an EQUALS expansion which is on by default. A word
 * that BEGINS with `=` is replaced by the path of the command named after it, so
 * the far side's shell rewrote the exact-match target into a program lookup and
 * then failed the lookup.
 *
 * PHASE 117 UPDATED THIS PARAGRAPH. The general quoter in `../restore/command`
 * used to pass a leading `=` through unquoted, so this file quoted the one
 * argument itself. Phase 117 found the same defect on the create confirmation
 * read, which sends `=NAME` through that quoter, and narrowed the quoter's safe
 * set so that a LEADING `=` is quoted while a `=` inside a word is not. A resume
 * command typed into a pane is therefore unchanged, and `--model=opus` still
 * reads as a person would type it.
 *
 * This function stays, and it stays unconditional. It is the one argument that
 * must be quoted whatever it looks like, the attach argv is composed by
 * appending rather than by running the whole list through the quoter, and
 * `conformance:machines` condition 20 reads what this returns.
 *
 * Two notes on the blast radius, because a reviewer will ask.
 *
 * - A target of the form `=$3`, which is the immutable id the one production
 *   caller passes, was never affected. It carries a `$`, the general quoter
 *   already quotes anything with a `$` in it, and a quoted word gets no
 *   expansion. So this defect could only ever have bitten a target composed from
 *   a NAME, which is what the probe drove and what a later rung would have hit.
 * - bash has no EQUALS expansion, so a Linux machine would have worked while a
 *   Mac would not. Quoting is correct on both and costs two characters.
 */
export function quoteTarget(target: string): string {
  return `'${target.replace(/'/g, `'\\''`)}'`;
}

/**
 * The program and the argv for one attach. Pure.
 *
 * It starts nothing. The caller spawns what it returns.
 */
export function attachPlan(target: AttachTarget): SpawnPlan {
  const wanted = exactTarget(target.tmuxName);
  if (target.kind === 'local') {
    return {
      file: target.bin,
      argv: [
        '-u',
        '-L',
        target.socket,
        '-f',
        target.confPath,
        'attach-session',
        '-t',
        wanted
      ]
    };
  }
  const ctx = target.ctx;
  // The target is appended rather than passed through the general quoter,
  // because it is the one argument that must be quoted whatever it looks like.
  // See the header of quoteTarget for the measurement.
  const call = remoteTmuxArgv(ctx, ['-u', 'attach-session', '-t']);
  return {
    file: ctx.sshBin,
    argv: [
      '-t',
      ...sshOptions(ctx),
      ctx.host,
      `${shellQuoteArgv(call)} ${quoteTarget(wanted)}`
    ]
  };
}
