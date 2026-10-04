/**
 * THE QUESTION ID MAIN MINTS (Phase 318, build/p318/SPEC.md §5.3, D6, D7;
 * research 135 §2.6, §2.7).
 *
 * WHY IT EXISTS. No reading of a screen can say "the same question": one Claude
 * choice mark covered six different commands, two identical Codex approvals
 * share a mark, and a resize moves one (research 135 §2.6). So the phone is
 * shown an id main counts, and a press echoes it. Main moves the id, in main's
 * own event loop, on everything that can mean the question it was shown is no
 * longer the one on the screen, and a press whose id no longer matches types
 * nothing.
 *
 * ONE PROCESS-WIDE COUNTER (§Revision R2). Every bump of any session takes the
 * next value of ONE counter, so no two sessions ever hold the same non-zero
 * id, and a press naming session B with session A's id is refused whatever the
 * two screens show. A counter per session gave every session `<prefix>-1` at
 * its first dialog.
 *
 * The id is `<prefix>-<n>`: a STRING on the wire, never a number, so the
 * phone's rule on door numbers never reaches it. The prefix is 64 random bits
 * chosen once per process, so an id from before a restart never matches one
 * after it. A session never bumped reads `n = 0`, which is never offered and
 * never matched.
 *
 * D7, THE ONE EXCEPTION. Claude's `PermissionRequest` hook arrives 10 to 25 ms
 * BEFORE its dialog is drawn, so the monitor's first sight of that dialog is
 * the hook's own question appearing, not a new one. A `choice-appeared` bump
 * whose previous event for the session was a hook therefore takes no count and
 * keeps the hook's words; every other bump takes a count and clears them. It
 * is the rule `choiceUpdate` already keeps for the question it shows
 * (src/main/activity/monitor.ts).
 *
 * WHO BUMPS, AND NOWHERE ELSE (`conformance:pocket` Y13): core's hook
 * `onEvent` and `onSessionEnd`; core's `onInput` (a keystroke from the Mac's own
 * attach client that is not a pane report); core's `onChoiceMoved`; core's
 * `onStatus` for every status that is not `needs_input`; and the reply's
 * writer, immediately before each act.
 *
 * IT IS NOT A STATUS AND IT SETS NONE. It imports `node:crypto` and nothing
 * else, it logs nothing, and it holds one small entry per session id ever seen,
 * which is never wrong because session ids are never reused.
 */

import { randomBytes } from 'node:crypto';

/** Why a session's id moved. */
export type TurnCause =
  | 'hook'
  | 'desk'
  | 'phone'
  | 'choice-appeared'
  | 'choice-moved'
  | 'choice-gone'
  | 'status';

/** What a Bash `PermissionRequest` said: its command whole (`'whole'`), or not whole (`'partial'`). */
export type HookBash = 'whole' | 'partial';

/** One session's place in the count, as one read of it. */
export interface QuestionTurn {
  /** `<prefix>-<n>`. A string on the wire, never a number. */
  readonly id: string;
  /** The process-wide count this session last took. 0 for a session never bumped: never offered, never matched. */
  readonly n: number;
  /** Hook events this session has had, ever (the read-back's "a hook since the press", D16). */
  readonly hooks: number;
  /** The hook's composed question that belongs to this n, or null. */
  readonly hookAsk: string | null;
  /** Null unless the hook that belongs to this n was a `Bash` `PermissionRequest` (D11, D12). */
  readonly hookBash: HookBash | null;
}

/** The one counter's three verbs. */
export interface QuestionIds {
  current(sessionId: string): QuestionTurn;
  /** A hook event. `ask` and `bash` are a `PermissionRequest`'s, else null. */
  hook(sessionId: string, ask: string | null, bash: HookBash | null): void;
  bump(sessionId: string, cause: Exclude<TurnCause, 'hook'>): void;
}

/** The prefix's own shape: 64 bits as 16 lowercase hex. */
const PREFIX_SHAPE = /^[0-9a-f]{16}$/;

/** One session's entry. Mutable here and nowhere else; a read hands out a frozen copy. */
interface Entry {
  n: number;
  hooks: number;
  hookAsk: string | null;
  hookBash: HookBash | null;
  /** The last event this session had, for D7's one exemption; null before its first. */
  last: TurnCause | null;
}

/**
 * A counter with its own prefix. Production holds ONE, {@link replyTurns}; the
 * tests make their own with a prefix they choose.
 *
 * @throws when the prefix is not 16 lowercase hex, which is a programming error
 *   and never a person's input.
 */
export function createQuestionIds(prefix: string): QuestionIds {
  if (!PREFIX_SHAPE.test(prefix)) {
    throw new Error('a question id prefix is 16 lowercase hex');
  }
  const entries = new Map<string, Entry>();
  let next = 0;

  const turnOf = (entry: Entry | undefined): QuestionTurn =>
    Object.freeze({
      id: `${prefix}-${String(entry?.n ?? 0)}`,
      n: entry?.n ?? 0,
      hooks: entry?.hooks ?? 0,
      hookAsk: entry?.hookAsk ?? null,
      hookBash: entry?.hookBash ?? null
    });

  const entryOf = (sessionId: string): Entry => {
    let entry = entries.get(sessionId);
    if (entry === undefined) {
      entry = { n: 0, hooks: 0, hookAsk: null, hookBash: null, last: null };
      entries.set(sessionId, entry);
    }
    return entry;
  };

  return {
    current(sessionId: string): QuestionTurn {
      return turnOf(entries.get(sessionId));
    },

    hook(sessionId: string, ask: string | null, bash: HookBash | null): void {
      const entry = entryOf(sessionId);
      next += 1;
      entry.n = next;
      entry.hooks += 1;
      // An empty question is no question, and a Bash flag belongs to a question.
      entry.hookAsk = typeof ask === 'string' && ask.length > 0 ? ask : null;
      entry.hookBash = entry.hookAsk === null ? null : bash;
      entry.last = 'hook';
    },

    bump(sessionId: string, cause: Exclude<TurnCause, 'hook'>): void {
      const entry = entryOf(sessionId);
      // D7: the dialog the hook announced, appearing. No count, and the hook's
      // words are kept, exactly once.
      if (cause === 'choice-appeared' && entry.last === 'hook') {
        entry.last = cause;
        return;
      }
      next += 1;
      entry.n = next;
      entry.hookAsk = null;
      entry.hookBash = null;
      entry.last = cause;
    }
  };
}

/** THE one process-wide counter. Its prefix is 64 random bits, chosen once. */
export const replyTurns: QuestionIds = createQuestionIds(randomBytes(8).toString('hex'));
