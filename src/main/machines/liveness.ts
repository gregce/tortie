/**
 * The two liveness facts, and the two questions a verb may ask of them
 * (Phase 231, research 85 section 6 items 1 and 19).
 *
 * ## Why there are two and not one
 *
 * Until this phase one boolean stood in front of every far-side channel, and
 * it was set by ONE question, being whether that machine's `tmux list-sessions`
 * answered inside ten seconds. Research 90 section 3.2 measured what that cost:
 * one slow answer to a question about tmux sessions, with ssh and every other
 * verb answering on the same link 38 ms later, took Explorer, Search, Source
 * control, Context, Quick Open, History, Branch, Runs, the agent scan and every
 * write verb dark in the same frame, fourteen of seventeen channels refused in
 * 0 ms with nothing sent, for about fifteen seconds of waiting and five more of
 * dark. None of those needed the session list.
 *
 * So the one fact is two:
 *
 *  - **The LINK.** Did the last ssh to that machine answer at all. This is what
 *    a file verb, a git verb, a search, quick open and a context read ask,
 *    because every one of them is one ssh that runs one script and reads what
 *    it printed. The session list has nothing to do with whether that works.
 *  - **The FEED.** Did the last session poll, the `list-sessions` beside the
 *    live connection or on the timer, complete. This is what the session list
 *    and the agent board ask, because both are statements about what is
 *    running on that machine, and a machine whose list did not come back is a
 *    machine whose sessions Tortie cannot see.
 *
 * A missed session poll moves the FEED and leaves the LINK where it was. A
 * verb that fails on the link moves the LINK, and a link that is down takes the
 * feed with it, because the feed runs over the link. A wake marks the FEED
 * unknown and leaves the LINK until an ssh actually fails. Which failures are
 * the link's own is {@link LINK_FAILURE_CLASSES}, and the poll's own ssh
 * failing is one of them.
 *
 * ## The rule, in one table
 *
 * | link      | feed      | read verb | session verb |
 * | --------- | --------- | --------- | ------------ |
 * | answering | listed    | proceeds  | proceeds     |
 * | answering | missed    | proceeds  | refuses      |
 * | answering | unknown   | proceeds  | refuses      |
 * | not       | anything  | refuses   | refuses      |
 *
 * `answering` is `connected` or `polling`. `connecting`, `quiet` and `refused`
 * are not, and a read under any of them would be a claim about a machine
 * Tortie cannot see.
 *
 * ## What this module is
 *
 * Pure. It holds the two types, the two predicates and the classification of
 * every far-side channel. It imports nothing, so a test can ask it the whole
 * table without a machine, and `./control-plane.ts` is the one writer of the
 * record the predicates read.
 */

export type MachineLinkKind =
  /** A live control connection. */
  | 'connected'
  /** Answering, on the timer feed. */
  | 'polling'
  /** Signing in right now. */
  | 'connecting'
  /** Confirmed, and the last ssh to it got no answer. */
  | 'quiet'
  /** The gate or the version list said no. */
  | 'refused';

export type MachineFeedKind =
  /** The last session poll completed, with rows or with tmux's own no-server. */
  | 'listed'
  /** No poll has completed since Tortie started, or since this Mac woke. */
  | 'unknown'
  /** The last session poll did not answer. */
  | 'missed';

export interface MachineLinkFacts {
  readonly machineId: string;
  readonly link: MachineLinkKind;
  /** PHASE 231. The session feed's own fact, recorded beside the link's. */
  readonly feed: MachineFeedKind;
  /** True once any list completed for this machine in this run. */
  readonly everAnswered: boolean;
  /** Local epoch ms of the last completed list, or null. */
  readonly lastAnsweredAt: number | null;
  /** Why the link is not connected. One clause, no transport words. */
  readonly reason: string | null;
}

/**
 * The two link states that mean the last ssh answered.
 *
 * `connected` is a live connection and `polling` is a machine answering on the
 * timer feed. Both are a machine that answered recently.
 */
const ANSWERING: ReadonlySet<MachineLinkKind> = new Set<MachineLinkKind>([
  'connected',
  'polling'
]);

/** THE LINK QUESTION. True while the link is `connected` or `polling`. */
export function linkAnswering(facts: Pick<MachineLinkFacts, 'link'>): boolean {
  return ANSWERING.has(facts.link);
}

/**
 * THE FEED QUESTION. True while the link answers AND the last session poll
 * completed. The link is asked first because the feed runs over it: a feed
 * that read `listed` a minute ago says nothing about a link that has since
 * gone.
 */
export function feedAnswering(
  facts: Pick<MachineLinkFacts, 'link' | 'feed'>
): boolean {
  return linkAnswering(facts) && facts.feed === 'listed';
}

/** Which of the two facts a verb asks. */
export type LivenessFact = 'link' | 'feed';

/**
 * The failures that are the LINK's own (Phase 231, item 4).
 *
 * These are the three classes of `classifyMachineOutput` where ssh never got
 * a session at all: no route, a refused port, a name that did not resolve.
 * A verb that fails with one of them marks the link, so a real outage still
 * takes the surface dark, because an attempt failed rather than because a
 * different question went unanswered.
 *
 * NOT here, on purpose. `auth-refused` and `host-key-changed` are a machine
 * that answered and said no, which the prepare path reports in its own words.
 * A timeout with nothing printed is a verb that was slow, and reading it as
 * the link is what took every view dark on one slow `list-sessions`. tmux's
 * own `no-server` is an answer. Every one of those leaves the link where it
 * was and fails its own verb alone.
 */
export const LINK_FAILURE_CLASSES: readonly string[] = Object.freeze([
  'unreachable',
  'refused',
  'not-resolved'
]);

/** True when this class means the last ssh did not answer at all. */
export function isLinkFailure(cls: string | null): boolean {
  return cls !== null && LINK_FAILURE_CLASSES.includes(cls);
}

/**
 * Every far-side machines channel, and the fact its verb asks.
 *
 * Twenty-one channels reach the far side (research 90 section 1). This table
 * is the classification the charter asks to be printed, and
 * `src/main/machines/__tests__/p231-liveness.test.ts` holds it against the
 * source: a module listed as `link` must ask the link question and never the
 * feed one, and the other way round.
 *
 * `feed` is the session list's own family: the lines of one session, and the
 * agent board a machine tab draws, which is a statement about what that machine
 * can run and is read once the machine is ready. Everything else is one ssh
 * running one script over a folder or a repository, and the session list has
 * nothing to do with whether that answers.
 */
export const CHANNEL_FACT: Readonly<Record<string, LivenessFact>> = Object.freeze({
  'machines:listTree': 'link',
  'machines:listDir': 'link',
  'machines:listFiles': 'link',
  'machines:findProject': 'link',
  'machines:searchContent': 'link',
  'machines:readContext': 'link',
  'machines:readHistory': 'link',
  'machines:readBranch': 'link',
  'machines:readRuns': 'link',
  'machines:reviewFiles': 'link',
  'machines:reviewFile': 'link',
  'machines:putFile': 'link',
  'machines:putImage': 'link',
  'machines:makeDir': 'link',
  'machines:renameEntry': 'link',
  'machines:stage': 'link',
  'machines:unstage': 'link',
  'machines:commit': 'link',
  'machines:cloneProject': 'link',
  'machines:readSessionLines': 'feed',
  'machines:agents': 'feed'
});

/**
 * The modules that ask a question at the top of their handler or inside their
 * loop, and which question each asks. `remote-run.ts` is not here because its
 * step 4 asks the LINK for every script at once, which is the door's own gate
 * and not a caller's.
 */
export const MODULE_FACT: Readonly<Record<string, LivenessFact>> = Object.freeze({
  'tree-list.ts': 'link',
  'remote-files.ts': 'link',
  'remote-agent-context.ts': 'link',
  'remote-history.ts': 'link',
  'remote-branch.ts': 'link',
  'remote-runs.ts': 'link',
  'remote-search.ts': 'link',
  'remote-clone.ts': 'link',
  'remote-commit.ts': 'link',
  // The lines of one session. A session verb.
  'remote-lines.ts': 'feed',
  // The agent board. What that machine can run, read once it is ready.
  'machine-agents.ts': 'feed',
  // The two passes that walk the SESSION rows the feed listed and write what
  // they read into the manifest against those rows. A stale feed is a stale
  // target list, so they ask the feed at the top and again before every row.
  'remote-store-sync.ts': 'feed',
  'remote-harvest.ts': 'feed'
});
