/**
 * Whether an attach to a session on ANOTHER machine asks that machine's tmux
 * for links (Phase 368, build/p368/SPEC.md D18, research 145 section 5).
 *
 * ## Why both the server and the program
 *
 * `-T hyperlinks` is read by the far CLIENT, the program Tortie runs over ssh,
 * and the client hands the server its features as a bitmask by each feature's
 * index in the client's own table. Measured from tmux's source at the tags
 * (build/p368/SPEC.md section 0.1 item 9 and section 2.5):
 *
 *  - 3.1c's getopt has no `T`, so `-T` exits 1 through its usage line and the
 *    attach never happens;
 *  - 3.2a and 3.3a parse `-T` and ignore a name they do not know, so the flag is
 *    harmless there, but their tables have no `hyperlinks` and their index 4 is
 *    `cstyle`;
 *  - from 3.4, `hyperlinks` is index 4 (3.4, 3.5a, 3.6a and 3.7b were read).
 *
 * So a 3.4 or later PROGRAM speaking to a 3.2a or 3.3a SERVER would set the
 * server's `cstyle` instead of links, and an older program would refuse the
 * flag outright. The flag is therefore sent only when the version Tortie last
 * read of the machine's server AND the version of the program beside it are
 * both on {@link HYPERLINK_FAR_VERSIONS}. Anything older, unknown or unread
 * keeps the far call Tortie sent before this phase, byte for byte.
 *
 * ## What "known" means here, stated rather than hidden
 *
 * Both facts come from `../machines/far-tmux.ts`'s pair record, ONLY while it
 * was read against the server version this run last noted (`farPairOf`). The
 * program's version is in that record when Prepare read it beside a warm server
 * whose row lists `programs` (the rows before 3.6), or when the set-up started
 * the server itself, which records the program as the server it started. A warm
 * server from 3.6 on is recorded with no program (Phase 342 sends such a machine
 * nothing more), so its attach keeps today's argv until a set-up starts its
 * server. That is the conservative side of D18: no machine is ever handed a
 * flag nobody read it could take.
 *
 * Membership is byte equality, never version arithmetic, the rule
 * `decideRemotePair` keeps in `../tmux/version.ts`: a version nobody measured
 * here gets nothing, however close its number looks.
 *
 * This module reads one in-memory record and composes nothing. It never runs a
 * command and never reads a machine.
 */

import { farPairOf } from '../machines/far-tmux';

/**
 * The far tmux versions whose program parses `-T hyperlinks` AND whose server
 * reads `hyperlinks` at the index the program sends it (D18). Every one is a row
 * of `TESTED_REMOTE_TMUX_VERSIONS` from 3.4 on; `p368-hyperlinks.test.ts` holds
 * the two lists together, so a newly measured version is a decision here too.
 * No version before 3.4 may ever be added (`conformance:terminal` T7).
 */
export const HYPERLINK_FAR_VERSIONS: readonly string[] = Object.freeze([
  '3.4',
  '3.5a',
  '3.6',
  '3.6a',
  '3.6b',
  '3.7b',
  '3.7c'
]);

/** The two facts the decision reads, as `farPairOf` records them. */
export interface FarTmuxPair {
  readonly server: string;
  readonly program: string | null;
}

/**
 * True only when the pair is known, its program named a version, and both
 * versions are on {@link HYPERLINK_FAR_VERSIONS}. Pure.
 */
export function farAttachTakesHyperlinks(pair: FarTmuxPair | null): boolean {
  if (pair === null || pair.program === null) return false;
  return (
    HYPERLINK_FAR_VERSIONS.includes(pair.server) &&
    HYPERLINK_FAR_VERSIONS.includes(pair.program)
  );
}

/**
 * Whether the attach to a session on this machine adds `-T hyperlinks`. The one
 * decider: the attach host's `planFor` asks it and passes the answer to
 * `attachPlan` as `hyperlinks`.
 */
export function farAttachHyperlinks(machineId: string): boolean {
  return farAttachTakesHyperlinks(farPairOf(machineId));
}
