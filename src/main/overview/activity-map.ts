/**
 * What one session's counts ARE, decided from facts (Phase 293).
 *
 * The session manager draws two activity columns, being how many messages a
 * session's current conversation holds and when the last one was. This file
 * is the whole of the judgement behind them: which rows can be answered with
 * a number, which can only be answered with a reason, and which clock a time
 * was read from.
 *
 * IT IS PURE. It opens no file, holds no store and imports nothing that does,
 * so the truth table can be driven row by row from a test, from the
 * conformance gate and from a verifier without standing anything up. The
 * orchestration that reads the manifest, refreshes the store and hands the
 * facts in is ./activity.ts.
 *
 * THE TWO RULES THIS FILE EXISTS TO KEEP.
 *
 *  1. NULL IS PRESERVED AND NEVER BECOMES ZERO. A zero is made in exactly two
 *     places, rows 8 and 9 of the table below, and only when the last read of
 *     the record ended `ok`. There a session with no stored turn comes out of
 *     the store's LEFT JOIN as NULL, and the NULL means "a record was read and
 *     it held nothing", which is what zero says. Everywhere else a missing
 *     number stays null, because a dash and a zero are different claims: a
 *     shell has no conversation, a session on another machine has one this Mac
 *     cannot see, and neither has "0 messages".
 *  2. ONE CLOCK IS NEVER DRAWN AS ANOTHER. Agents differ in what they record.
 *     Most stamp each message. One stamps the prompt and not the reply. One
 *     stamps nothing per message and keeps a single updated time for the whole
 *     record. The time is taken from the best clock there is and the answer
 *     says WHICH, so the sheet can write "Agent reply" over a reply's own time
 *     and say something else over a prompt's. The rule names no agent: it
 *     asks what the stored turn holds, so the next agent with the same shape
 *     is already right.
 */

import type {
  OverviewActivityClock,
  OverviewActivityReason,
  OverviewSessionActivity
} from '@shared/overview';
import { LOCAL_MACHINE_ID } from '@shared/workspace-target';
import type { StoredActivity } from './store';

/**
 * What the orchestration knows about one asked id before anything is read.
 * Every field comes from this Mac's manifest row, or says there is none.
 */
export interface ActivityRowFacts {
  id: string;
  /** The registry id, or 'shell'. Empty when the id is not known. */
  agent: string;
  /** 'local' for this Mac, which is what every row written before machines existed reads as. */
  machineId: string;
  /** The conversation the agent says is its own. Null until it has said. */
  agentSessionId: string | null;
  /** False when the id is not in this Mac's manifest, which is a feed-only row from another machine. */
  known: boolean;
}

/**
 * Is this manifest row a session on another machine?
 *
 * ONE SPELLING, read by the two guards in ./service.ts and by the classifier
 * below. A manifest record carries `machineId` and never `machine`: the
 * decoder always sets the first and nothing sets the second. The guards in
 * ./service.ts used to ask about `machine`, so they were dead for every real
 * row, and a session on another machine was resolved against THIS Mac's home
 * (finding F3). An absent id reads as this Mac, which is true of a record
 * built by hand in a test and of nothing the decoder returns.
 *
 * The constant is the product's one definition of this Mac's id. The
 * manifest's own copy, LOCAL_MACHINE_ROW, is pinned equal to it by
 * manifest/__tests__/machine-id-migration.test.ts, and importing that one
 * here would pull the manifest store into a file that must stay pure.
 */
export function isOnAnotherMachine(machineId: string | undefined): boolean {
  return machineId !== undefined && machineId !== LOCAL_MACHINE_ID;
}

/**
 * The one ISO time parser in this directory. It lives here because this file
 * is pure and ./service.ts is not, and ./service.ts re-exports it under the
 * same name, so there is still one parser and every caller that reached it
 * through the service still does.
 *
 * It is `Date.parse`, so it also reads the text clock one agent writes on a
 * prompt, of the shape `Thursday, Aug 20, 2026, 9:14 AM (UTC-4)`. That one
 * is read in this Mac's zone, which is the zone the agent wrote it in on
 * this Mac, at minute resolution.
 */
export function parseIsoMs(iso: string | null): number | null {
  if (iso === null) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** An answer that carries a reason and no value. Invariant 1 is this function. */
function withoutValues(
  sessionId: string,
  coverage: 'unavailable' | 'not-applicable',
  reason: OverviewActivityReason,
  readAt: number | null
): OverviewSessionActivity {
  return {
    sessionId,
    coverage,
    reason,
    userMessages: null,
    agentMessages: null,
    lastMessageAt: null,
    lastMessageBy: null,
    lastMessageClock: null,
    readAt
  };
}

/**
 * Rows 1 to 4: the rows that are decided WITHOUT touching disk or the store.
 * Null means the row has a record worth reading, and the orchestration then
 * refreshes it and asks the store.
 *
 * The order is the table's and it matters. An id this Mac has never heard of
 * is asked first, because nothing else about it is known. A session on
 * another machine is asked before the shell question, because its record is
 * not here whatever it runs. A shell is `not-applicable` rather than
 * `unavailable`, because there is no record that could ever be read.
 */
export function classifyActivityRow(
  facts: ActivityRowFacts
): OverviewSessionActivity | null {
  if (!facts.known) {
    return withoutValues(facts.id, 'unavailable', 'unknown-session', null);
  }
  if (isOnAnotherMachine(facts.machineId)) {
    return withoutValues(facts.id, 'unavailable', 'remote', null);
  }
  if (facts.agent === 'shell') {
    return withoutValues(facts.id, 'not-applicable', 'shell', null);
  }
  // The resolver reads an empty id as no id, so this does too.
  if (facts.agentSessionId === null || facts.agentSessionId === '') {
    return withoutValues(facts.id, 'unavailable', 'no-id', null);
  }
  return null;
}

/** The three read states that mean "the record is not readable right now". */
const RECORD_MISSING: Partial<
  Record<StoredActivity['readState'], OverviewActivityReason>
> = {
  // `no-file` is ALSO what a resolver miss looks like, which is why it is a
  // dash and never a zero: Tortie cannot tell "nothing asked yet" from "the
  // record is somewhere this build does not look".
  'no-file': 'not-yet',
  unreadable: 'unreadable',
  'wrong-conversation': 'wrong-conversation'
};

/** The last message's author, time and clock, from the last stored turn. */
interface LastMessage {
  at: number | null;
  by: 'you' | 'agent' | null;
  clock: OverviewActivityClock | null;
}

const NO_LAST_MESSAGE: LastMessage = { at: null, by: null, clock: null };

/**
 * The time of the last message, first clock that parses.
 *
 * The last turn is the one the store read BY INDEX, never the newest time,
 * because clock shapes differ per agent and position is the safe order.
 *
 *  1. The last message's own time: the reply's when the turn holds a reply,
 *     else the prompt's. Clock `message`.
 *  2. The turn holds a reply and the reply has no clock: the PROMPT's time,
 *     under clock `ask`, so the sheet can say that is what it drew. Drawing it
 *     as the reply's time would put "Agent reply, 3h ago" over the moment the
 *     person typed.
 *  3. The record's own updated time. Clock `session`.
 *  4. Nothing parses: no time and no clock, and the author still stands,
 *     because who spoke last is known from the turn whatever the clocks say.
 */
function lastMessageOf(stored: StoredActivity): LastMessage {
  if (stored.lastHasAnswer === null) return NO_LAST_MESSAGE;
  const by = stored.lastHasAnswer ? 'agent' : 'you';
  const own = parseIsoMs(
    stored.lastHasAnswer ? stored.lastAnswerAt : stored.lastAskAt
  );
  if (own !== null) return { at: own, by, clock: 'message' };
  if (stored.lastHasAnswer) {
    const ask = parseIsoMs(stored.lastAskAt);
    if (ask !== null) return { at: ask, by, clock: 'ask' };
  }
  const session = parseIsoMs(stored.lastTouchedAt);
  if (session !== null) return { at: session, by, clock: 'session' };
  return { at: null, by, clock: null };
}

/**
 * One asked id to one answer. The order below IS the truth table of the
 * phase's spec, section 3.4, and each arm carries its row number.
 *
 * `stored` is what the store holds for the id AFTER the refresh, or
 * `undefined` when it holds nothing.
 */
export function toActivity(
  facts: ActivityRowFacts,
  stored: StoredActivity | undefined
): OverviewSessionActivity {
  // Rows 1 to 4. Asked again here rather than trusted from the caller, so
  // the two functions cannot disagree and a stored row left over from an
  // earlier read can never outvote what the manifest says today.
  const classified = classifyActivityRow(facts);
  if (classified !== null) return classified;

  // Row 0. The refresh threw, or wrote nothing. Asked AFTER rows 1 to 4, and
  // it has to be an answer: without it the cell would wait forever.
  if (stored === undefined) {
    return withoutValues(facts.id, 'unavailable', 'unreadable', null);
  }

  // Row 5. The agent keeps no record on this Mac, or Tortie has no reader for
  // it, which the read path stores the same way.
  if (stored.readState === 'no-store') {
    return withoutValues(facts.id, 'unavailable', 'no-store', stored.lastReadAt);
  }

  const missing = RECORD_MISSING[stored.readState];
  if (missing !== undefined) {
    // The asks the store still holds, or null when it holds no turn. The sum
    // is never null beside a turn count above zero, and reading it through
    // the count keeps invariant 2 a fact of this file rather than a fact
    // about SQLite: a null here can only fall to row 6, never into a number.
    const storedAsks =
      stored.turns !== null && stored.turns > 0 ? stored.userMessages : null;
    // Row 6. Nothing was ever read, so there is nothing to count.
    if (storedAsks === null) {
      return withoutValues(facts.id, 'unavailable', missing, stored.lastReadAt);
    }
    // Row 7. The record has gone, or stopped being readable, and the store
    // still holds what an earlier read kept. Those counts are real and they
    // are all there is, so they are drawn as partial.
    const last = lastMessageOf(stored);
    return {
      sessionId: facts.id,
      coverage: 'partial',
      reason: 'record-gone',
      userMessages: storedAsks,
      agentMessages: stored.agentReplies,
      lastMessageAt: last.at,
      lastMessageBy: last.by,
      lastMessageClock: last.clock,
      readAt: stored.lastReadAt
    };
  }

  if (stored.readState === 'ok') {
    // Rows 8 and 9, the ONLY places a zero is made. A record WAS read, so a
    // NULL out of the LEFT JOIN means it held no turn Tortie keeps.
    const userMessages = stored.userMessages === null ? 0 : stored.userMessages;
    const agentReplies = stored.agentReplies === null ? 0 : stored.agentReplies;
    // With no stored turn there is no last turn, and lastMessageOf answers
    // three nulls for it.
    const last = lastMessageOf(stored);
    // Row 8. This agent's record keeps the asks and, in real files, almost
    // never a reply. A zero replies there is a fact about the record and not
    // about the conversation, so it is null and the sheet draws words.
    if (stored.provider === 'gemini') {
      return {
        sessionId: facts.id,
        coverage: 'partial',
        reason: 'ask-only',
        userMessages,
        agentMessages: agentReplies > 0 ? agentReplies : null,
        lastMessageAt: last.at,
        lastMessageBy: last.by,
        lastMessageClock: last.clock,
        readAt: stored.lastReadAt
      };
    }
    // Row 9.
    return {
      sessionId: facts.id,
      coverage: 'complete',
      reason: null,
      userMessages,
      agentMessages: agentReplies,
      lastMessageAt: last.at,
      lastMessageBy: last.by,
      lastMessageClock: last.clock,
      readAt: stored.lastReadAt
    };
  }

  // Row 10. A stored `shell` or `remote` state the classifier did not catch,
  // which is a row whose manifest facts changed since it was stored, or a
  // state a later build writes and this one does not know.
  return withoutValues(facts.id, 'unavailable', 'unreadable', stored.lastReadAt);
}
