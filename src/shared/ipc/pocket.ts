/**
 * pocket:* — the door a paired phone reads, and the sheet that pairs a phone
 * with it (Phase 313; published through Tailscale Funnel since Phase 330).
 *
 * ## What this contract is for
 *
 * Phase 313 is the first time anything outside this Mac can ask Tortie a
 * question. The door itself speaks https, since Phase 330 at the Mac's own
 * public `*.ts.net` name through Tailscale Funnel, with TLS ending inside
 * Tortie under the key the pairing code pins, and it answers a CLOSED table of
 * four reads and, since Phase 317, narrow writes (End; since Phase 318, a
 * press on a numbered choice and one message), to a phone whose client key
 * completed the handshake. (The fourth read is Phase 316.7's `/v1/sessions`.)
 * This file
 * holds two separate things and it is worth saying which is which, because
 * they are easy to confuse:
 *
 *   - The `pocket:*` INVOKE CHANNELS below are the RENDERER's door, between
 *     Settings then Phone and main. They never leave this Mac.
 *   - {@link PocketBlockedRow}, {@link PocketSessionDetail} and
 *     {@link PocketTurn} are what the door ANSWERS. They are declared
 *     here, in the shared contract, because every client that ever reads this
 *     door reads the same shapes and none may invent a second spelling.
 *
 * ## The phone computes nothing
 *
 * Every field below that a person reads is a string main already drew. The
 * status word and its raised title, the agent's question, the option rows, the
 * Catch Me Up line, the ages and the turns all arrive composed.
 *
 * PHASE 316 CLOSED THE ONE EXCEPTION PHASE 313 NAMED. {@link
 * PocketBlockedRow.blockedSince} is still an epoch, and it stays on the shape
 * because the push alert and the re-derivations read it, but a client no longer
 * draws an age from it: main composes {@link PocketBlockedRow.ageText} with the
 * one age formatter the Mac draws ages with (`src/shared/age.ts`), at the
 * answer's own `at`. A client that wants a fresher age asks again; it does no
 * arithmetic on a clock of its own.
 *
 * ## What is NOT here
 *
 * No bearer token, in any field, on any channel, in any path. There is nothing
 * in a URL to leak. Research 127 section 7 is why: a token in a path leaks
 * through a `Referer` and through a log the first time a person taps an
 * outbound hand-off, and the answer was to remove the thing rather than to
 * guard it. Pairing establishes keys each way and every request is signed.
 *
 * THREE WRITE ROUTES, AND WHAT THEY CAN DO IS ALL THEY CAN DO (Phase 317,
 * build/p317/SPEC.md §5.3; Phase 318, build/p318/SPEC.md §5.1).
 * {@link POCKET_WRITE_ROUTE_IDS} is exactly `end`, `choose` and `say`:
 *
 *   - `end` asks main to end ONE session by id, through both gates the Mac's
 *     own End asks, and main's verb does the ending;
 *   - `choose` asks main to press ONE option of a numbered question main
 *     itself offered, naming the question id and the mark main minted: main
 *     reads the session afresh and types the option's own digit, never an
 *     Enter, only on a question shape measured and compiled in main;
 *   - `say` asks main to put ONE message into a Claude Code or Codex session
 *     on this Mac that sits idle at its own empty prompt, as a paste at the
 *     Mac would, then Return.
 *
 * Nothing here can set a status, start a process, or restore, remove, restart
 * or rename a session, and nothing reaches a session on another machine. The
 * route ids in {@link POCKET_ROUTE_IDS} are a confirmed field of the door's
 * own hash, so each phase that added one asked the person again, and a later
 * phase that adds one asks again too. (The fix round removed a fourth write,
 * `unpair`, because the phone waited on it before it could forget a Mac that
 * did not answer: build/p317/SPEC.md "§Fix round".)
 *
 * MAIN: src/main/pocket/ipc.ts, server.ts, routes.ts, pairing.ts.
 */

import type { OverviewSessionActivity } from '../overview';
import type { SessionChoiceOption } from './sessions';

// ---------------------------------------------------------------------------
// The closed route table, named once
// ---------------------------------------------------------------------------

/**
 * Every route the phone's door has, as ids. There is no default and no
 * wildcard: a method and path pair that is not one of these does not exist and
 * is refused before anything about the request is read beyond its line.
 *
 * IT IS A CONFIRMED FIELD. `pocketExecutionHash` in src/main/pocket/pairing.ts
 * hashes this list, so a phase that adds a fourth route moves the hash and the
 * door refuses to bind until a person has read the new list and agreed to it.
 * That is CLAUDE.md refusal 8 applied to the door's own shape rather than to a
 * configuration file.
 */
export const POCKET_ROUTE_IDS = [
  /** `POST /pair` — alive only inside a pairing window a person opened. */
  'pair',
  /** `GET /v1/blocked` — the sessions blocked on a human, newest first. */
  'blocked',
  /** `GET /v1/session` — one session, drawn. */
  'session',
  /** `GET /v1/turns` — that session's conversation, redacted and clipped. */
  'turns',
  /** `POST /v1/end` — end one session, after both gates (Phase 317). */
  'end',
  /** `POST /v1/choose` — press one option of a question main offered (Phase 318). */
  'choose',
  /** `POST /v1/say` — one message into a session idle at its own prompt (Phase 318). */
  'say',
  /**
   * `GET /v1/sessions` — every listed session, shown, grouped and sorted as
   * asked (Phase 316.7).
   */
  'sessions'
] as const;

export type PocketRouteId = (typeof POCKET_ROUTE_IDS)[number];

/**
 * The write routes, and there are exactly these (Phase 317; Phase 318 added
 * `choose` and `say` to the same door, the same write path and the same
 * ledger, and no second gate). A `reads: false` row of the door's table is one
 * of these, and `conformance:pocket` R2 holds the table and this list to each
 * other. The ORDER is the order the confirm line names them in.
 */
export const POCKET_WRITE_ROUTE_IDS = ['end', 'choose', 'say'] as const satisfies readonly PocketRouteId[];

export type PocketWriteRouteId = (typeof POCKET_WRITE_ROUTE_IDS)[number];

/**
 * The public ports the door may be published on through Tailscale Funnel
 * (Phase 330), in the order they are tried: 8443, then 10000. NEVER 443, which
 * is the port a person's own Serve most often holds. A confirmed port that is
 * later held refuses rather than moving, because a phone was told it.
 */
export const POCKET_PUBLIC_PORTS = [8443, 10000] as const;

// ---------------------------------------------------------------------------
// What the door answers
// ---------------------------------------------------------------------------

/**
 * Where a session runs, drawn. Null means this Mac.
 *
 * A remote row can never be blocked (src/main/machines/remote-sessions.ts), so
 * this is null on every row of the blocked list. It is here for the one session
 * read, which can be asked about any row a person can see.
 */
export type PocketMachineLabel = string | null;

/** One session that is waiting on a human, as a client draws it. */
export interface PocketBlockedRow {
  sessionId: string;
  /** The session's own name. The person's words. */
  name: string;
  /** The project's drawn name, or the folder's basename when no tab holds it. */
  project: string;
  machine: PocketMachineLabel;
  /** The registry id, e.g. `claude`. A client picks its icon from this. */
  agent: string;
  /** The agent's drawn name, e.g. `Claude Code`. */
  agentLabel: string;
  /** `needs input`, `working`, `idle`, … — main's own word, never derived. */
  statusLabel: string;
  /**
   * The same word raised to start a line, e.g. `Needs input`, `Working`,
   * `Failed (exit 1)` (Phase 316). Raised in main by `raisedLabel` in
   * src/shared/status-words.ts, the rule the session manager raises it with,
   * so a client never capitalises a word itself.
   */
  statusTitle: string;
  /** `attention`, `working`, `idle`, `ended`, `failed` — the dot's name. */
  statusDot: string;
  /**
   * What the agent is asking, redacted and clipped in main before it ever
   * reaches this shape. Null when the row carries no question.
   */
  question: string | null;
  /**
   * The numbered options the agent drew, when it drew any (Phase 312). Empty
   * when it drew none. THE MARKER IS THE AGENT'S OWN, never an index.
   */
  choices: SessionChoiceOption[];
  /**
   * Epoch ms of the first tick this session was seen blocked. The one raw fact
   * on this shape, and the file header says why.
   */
  blockedSince: number;
  /**
   * True when {@link blockedSince} fell inside the first seconds after this Mac
   * woke (Phase 314). The poll does not run while the Mac sleeps, so such a
   * wait was first SEEN at the wake and its stamp is the wake's, not the
   * moment it began. A client draws "since your Mac woke" for it instead of an
   * age, and an age from {@link blockedSince} otherwise. Computed in main by
   * `blockedAge` in src/main/tray/attention.ts and nowhere else; the push alert
   * reads it off the same row.
   *
   * PHASE 316: it is true only of a row that IS blocked. A row that is not
   * waiting carries its creation clock in {@link blockedSince} as a fallback,
   * and a session created in the seconds after a wake was never "first seen
   * waiting" then, so it reads false.
   */
  seenAtWake: boolean;
  /**
   * How long ago, drawn by main (Phase 316): `now`, `4m`, `2h`, `3d`, composed
   * at the answer's `at` by `formatAge` in src/shared/age.ts, the formatter
   * ⌘J and the session rail draw ages with.
   *
   * For a blocked row it is the age of {@link blockedSince}, the wait. For a
   * row that is not blocked it is the age of the last output Tortie saw in the
   * session, or of its creation when Tortie has seen none, which is what the
   * session rail draws beside the same row.
   */
  ageText: string;
  /**
   * Whether the phone may offer End on this row, decided in main by BOTH gates
   * the Mac's End asks (Phase 317, build/p317/SPEC.md §5.4). A client draws it
   * and decides nothing: the press asks main again by id, and main's answer is
   * the one that counts.
   *
   * The door's one composer (`rowOf` in src/main/pocket/routes.ts) puts it on
   * EVERY row it answers. It is optional in the type for the reason
   * `PocketFacts.endOffer` is (SPEC §14 finding 8): the push's and the alerts'
   * tests build rows by hand, read no End, and are no builder of this phase's
   * to edit. ABSENT READS `{ state: 'none' }`, here and on the phone, so a row
   * that does not carry it never draws an End.
   */
  end?: PocketEndOffer;
}

/**
 * End on one row, as main decided it at the answer's `at` (Phase 317).
 *
 * - `offered`: both gates say yes now. `batch` is false only for the Mac batch's
 *   one narrowing, a session on a machine Tortie holds no row for, which a
 *   single End may clear and a batch never touches (D14).
 * - `unreachable`: Tortie cannot see whether it runs. `title` is the Mac's own
 *   sentence for that, drawn under an End that is off.
 * - `none`: ended, removed, or a row End is not offered on. No End is drawn.
 */
export type PocketEndOffer =
  | { state: 'offered'; batch: boolean }
  | { state: 'unreachable'; title: string }
  | { state: 'none' };

/**
 * The Mac's own End confirmation for one session, word for word (Phase 317):
 * composed in main by `endSessionConfirm` (src/shared/lifecycle-words.ts) over
 * main's own row, so the phone draws the sentence the Mac would draw.
 */
export interface PocketEndConfirm {
  title: string;
  body: string;
  confirmLabel: string;
}

/**
 * What the phone may do with one session's question or prompt, decided in
 * main over ONE fresh reading at the answer's `at` (Phase 318,
 * build/p318/SPEC.md §5.2). A client draws it and decides nothing: a press and
 * a message are asked again, by id, and main's answer is the one that counts.
 *
 * It is served on `GET /v1/session` alone, beside {@link
 * PocketSessionDetail.endConfirm}; `/v1/blocked` and its rows carry none.
 *
 * Its invariants, held by the door's one composer (`src/main/pocket/routes.ts`)
 * and decoded the same way on the phone: {@link question} and {@link mark} are
 * null exactly when {@link pressable} is empty; every marker in it is one of
 * the same answer's `choices` markers, in drawn order.
 */
export interface PocketReplyOffer {
  /** The question id main minted, echoed by a press. Null exactly when `pressable` is empty. */
  question: string | null;
  /** The choice's mark when this was read, echoed by a press. Null exactly when `question` is. */
  mark: string | null;
  /** The markers of the options that may be pressed now, each one of `choices`' own markers, in drawn order. */
  pressable: string[];
  /** The command the agent asks to run, when the question does not say it (Codex's `$` line). Null otherwise. */
  command: string | null;
  /** Whether one message may be sent now. */
  canSay: boolean;
}

/**
 * The offer that offers nothing: no press, no command, no message box. What an
 * absent `reply` reads as, on both sides, and what every session reads when
 * main has no reader to ask (the push seam, the tests). Frozen, and its
 * `pressable` frozen with it, so no composer can push onto the one shared
 * value.
 */
export const POCKET_NO_REPLY: PocketReplyOffer = Object.freeze({
  question: null,
  mark: null,
  pressable: Object.freeze([]) as unknown as string[],
  command: null,
  canSay: false
});

/** The Catch Me Up line, built in main and never written by a model. */
export interface PocketCatchUp {
  /** The person's own ask, clipped to its first clause. Null when none. */
  ask: string | null;
  /** The outcome sentence, one of the built set. */
  outcome: string;
}

/**
 * Where a person carries on with this session by hand.
 *
 * Composed in main. A client opens the url and nothing else happens here.
 *
 * PHASE 316 REMOVED `'ssh'`. The phone's tailnet node is private to the app,
 * so no other app on the phone can dial through it, and the grant a person
 * pastes allows only the door's own port: an `ssh://` link could never have
 * reached anything. And NOTHING COMPOSES `'claude'` YET: the door answers
 * `handoff: null` for every session in Phase 316, because where the Remote
 * Control URL is recorded is unmeasured (research 127) and no module in `src/`
 * has one. The member stays so the later phase that measures it has a shape.
 */
export interface PocketHandoff {
  kind: 'claude';
  url: string;
  /**
   * What the row says about it, composed in main and never here.
   *
   * THE WORDS ARE DELIBERATELY NOT SPELLED IN THIS COMMENT. They are owed by
   * Phase 316 in `build/p311/copy-drift.mjs`'s ledger, and that gate asserts an
   * owed string is absent from every production module under `src/` — an
   * example in a doc comment is text like any other to it, and one here turned
   * it red.
   */
  label: string;
}

/** One session, drawn. The answer to "what is this". */
export interface PocketSessionDetail extends PocketBlockedRow {
  /** The Catch Me Up line for this session, or null when main has none. */
  catchUp: PocketCatchUp | null;
  /** The agent's last answer, already redacted and clipped. Null when none. */
  lastAnswer: string | null;
  /** How many turns are on record. */
  turnCount: number;
  /**
   * Where to carry on by hand, or null when nothing offers one. Null for every
   * session in Phase 316 (see {@link PocketHandoff}).
   */
  handoff: PocketHandoff | null;
  /**
   * The session's counts, exactly the session manager's own answer (Phase 316).
   *
   * It is what `overview:activity` answers for this one id, taken from the
   * SAME call that brought the session's stored conversation up to date before
   * this answer was read, so the counts and the turns on the answer are one
   * reading. Its two invariants are the session manager's: a null count is
   * never a zero, and coverage says why a count is missing. Null only when main
   * could not ask at all.
   */
  activity: OverviewSessionActivity | null;
  /**
   * The age of the last message, drawn by main: `now`, `2m`, `3h`, composed at
   * the answer's `at` by the one age formatter (Phase 316). NULL EXACTLY WHEN
   * {@link activity}'s `lastMessageAt` is null, and a client then draws the
   * dash and the word the session manager draws for a missing time, never a
   * zero.
   */
  lastMessageText: string | null;
  /**
   * The Mac's End confirmation for this session (Phase 317). NON-NULL EXACTLY
   * WHEN {@link PocketBlockedRow.end}'s state is `offered`, so a client never
   * draws an End whose words it would have to make up.
   */
  endConfirm: PocketEndConfirm | null;
  /**
   * What the phone may press or send on this session now (Phase 318,
   * build/p318/SPEC.md §5.2, D18). The door's one composer always sets it, field
   * by field, over one fresh reading in main. OPTIONAL for Phase 317's reason
   * (hand-built literals in files no builder of this phase owns), and ABSENT
   * READS {@link POCKET_NO_REPLY}, here and on the phone.
   */
  reply?: PocketReplyOffer;
}

/**
 * One turn of the conversation, the overview store's own turn shape with the
 * git mark left out and one sentence added.
 *
 * It is already redacted and already clipped to 4,000 characters by
 * src/main/overview/turn-view.ts, at one definition with one call site: every
 * turn the door answers passes through `toTurnView` ONCE. A client must not
 * clip it again: a second cap would be a second place the truth about what a
 * person sees lives.
 *
 * The git mark is not on it (Phase 316): the phone draws no mark, and the mark
 * is a judgement about a project the door is not asked about.
 */
export interface PocketTurn {
  index: number;
  askText: string;
  askClipped: boolean;
  askAt: string | null;
  answerText: string | null;
  answerClipped: boolean;
  answerAt: string | null;
  closed: boolean;
  interrupted: boolean;
  notice: string | null;
  /**
   * The honest sentence for a turn with no answer on record (Phase 316), or
   * null when {@link answerText} is not null. Chosen in main by `answerAbsence`
   * in src/shared/overview-copy.ts — the rule the desktop's turn block draws
   * with — from the turn's two flags and the session's status at the moment of
   * the answer, so a client never decides between the three sentences itself.
   */
  absence: string | null;
}

/**
 * The most sessions {@link PocketBlockedAnswer.others} carries (Phase 316).
 *
 * The list is every session Tortie lists that is not waiting, and a person with
 * more than this many is told how many were left out rather than handed an
 * answer of unbounded size. It is the same number as `MAX_TURN_LIMIT` and
 * `OVERVIEW_ACTIVITY_MAX_IDS`, by choice rather than by derivation.
 */
export const POCKET_OTHERS_MAX = 200;

/** The answer to `GET /v1/blocked`. */
export interface PocketBlockedAnswer {
  /** Every session waiting on a human, newest blocked first. */
  rows: PocketBlockedRow[];
  /**
   * EVERY OTHER SESSION TORTIE LISTS (Phase 316, his ruling of 2026-09-22: "Yes
   * it should be able to open anything"). Exactly the listed sessions that are
   * not in {@link rows}, at most {@link POCKET_OTHERS_MAX}: newest output first,
   * then the sessions main has seen no output from (a session on another
   * machine is one) newest created first, the id breaking a tie. Same row
   * shape, so a client draws both lists with one drawing.
   */
  others: PocketBlockedRow[];
  /** How many listed sessions were left out of {@link others} by the cap. */
  othersOmitted: number;
  /** Epoch ms this answer was composed, so a client can say how old it is. */
  at: number;
  /** Drawn when `rows` is empty. One spelling, main's. */
  emptyLine: string;
  /**
   * The sentence drawn under the ages: {@link POCKET_AGE_HONESTY}, Phase 314's
   * one spelling, handed over rather than spelled by a client.
   */
  ageNote: string;
}

// ---------------------------------------------------------------------------
// The Sessions tab's answer (Phase 316.7, build/p3167/SPEC.md §6.1)
// ---------------------------------------------------------------------------

/**
 * Which sessions `GET /v1/sessions` lists: the active ones, the ended ones, or
 * every one Tortie lists. The partition is the session manager's own
 * (`lifecycleKeeps` in src/shared/session-list.ts over `sessionActionGates`),
 * so the phone's Active and the sheet's Active are one set.
 */
export const POCKET_SESSIONS_SHOW = ['active', 'ended', 'all'] as const;
/** How the answer groups its rows: by project (a folder on a machine), or not at all. */
export const POCKET_SESSIONS_GROUP = ['project', 'none'] as const;
/**
 * The order of the rows inside each group: Recent activity (today's list's
 * order, waiting first), Name, or Oldest first. Groups never reorder.
 */
export const POCKET_SESSIONS_SORT = ['recent', 'name', 'oldest'] as const;
export type PocketSessionsShow = (typeof POCKET_SESSIONS_SHOW)[number];
export type PocketSessionsGroupBy = (typeof POCKET_SESSIONS_GROUP)[number];
export type PocketSessionsSortBy = (typeof POCKET_SESSIONS_SORT)[number];
/** What an absent word reads. */
export const POCKET_SESSIONS_DEFAULT = Object.freeze({ show: 'active', group: 'project', sort: 'recent' } as const);
/** The most rows one answer carries (build/p3167/SPEC.md D4). */
export const POCKET_SESSIONS_MAX = 2000;
/** The most bytes the rows and their groups take together (D4). */
export const POCKET_SESSIONS_BUDGET_BYTES = 1_048_576;
/** The one clip for a string main did not already cap (D5). */
export const POCKET_SESSIONS_CLIP_CHARS = 200;
/** The most agents, and the most machines, the menu is offered (D4). */
export const POCKET_SESSIONS_CHOICES_MAX = 64;

/** The words main read, echoed so a client can refuse an answer to another question. */
export interface PocketSessionsAsked {
  show: PocketSessionsShow;
  group: PocketSessionsGroupBy;
  sort: PocketSessionsSortBy;
  /** A registry id, or null for no filter. */
  agent: string | null;
  /** A machine id, `local` for this Mac, or null for no filter. */
  machine: string | null;
}

/** One session on the Sessions tab, as a client draws it. */
export interface PocketSessionsRow {
  sessionId: string;
  /** The session's own name, clipped at {@link POCKET_SESSIONS_CLIP_CHARS} (D5). */
  name: string;
  /** An index into {@link PocketSessionsAnswer.groups}. */
  group: number;
  /** Clipped; null on this Mac. */
  machine: PocketMachineLabel;
  /** `attention`, `working`, `idle`, `ended`, `failed` — the dot's name. */
  statusDot: string;
  /** Main's own status word, raised to start a line. */
  statusTitle: string;
  /**
   * How long ago, drawn by main, from the clock that placed the row (D11): a
   * waiting row's wait (`4m`), any other row's last output (`2h`), else its
   * creation said as one (`3d old`). Under Oldest first every row draws its
   * creation. NULL WHEN THE ROW HAS NO CLOCK, and a client draws the dash, never
   * a zero and never an age from the epoch.
   */
  ageText: string | null;
  /** The session is waiting on a human: `session.status === 'needs_input'`, `rowOf`'s own predicate. */
  waiting: boolean;
  /** What the agent is asking, only on a waiting row; capped in main already. */
  question: string | null;
  /**
   * Whether the phone may offer End on this row (Phase 317). REQUIRED here,
   * because only the door's one composer builds these rows.
   */
  end: PocketEndOffer;
}

/** One project on the Sessions tab: a folder on a machine (D7). */
export interface PocketSessionsGroup {
  /**
   * The first 16 base64url characters of sha256 of the group's key: the same
   * for one folder on one machine across answers and choices, so a client can
   * remember which groups a person opened. It is not the path.
   */
  id: string;
  /** The open tab's name, else the closed tab's, else the folder's own; clipped. */
  label: string;
  /** Clipped; null on this Mac. */
  machine: PocketMachineLabel;
  /**
   * Home-relative on this Mac, as the machine states it elsewhere; clipped.
   * ONLY when another group over the whole list shares the label and the
   * machine label, so a group reads the same under every choice (D7).
   */
  folder: string | null;
  /** The rows the words keep in this group, cut or not. */
  count: number;
  /**
   * Of {@link count}, the rows the caps left out (§15 F4), so
   * `count` = the rows drawn under this group + `omitted`.
   */
  omitted: number;
  /**
   * Some row the words keep in this group is waiting on a human (§15 F3). A
   * client draws the needs-input mark on the header open or closed, so a
   * project a person closed never hides a session that needs him.
   */
  waiting: boolean;
  /** Under All, true when none of this group's rows is active (D8). */
  collapsed: boolean;
}

/** One choice of the Agent or Machine menu. */
export interface PocketSessionsChoice {
  /** The id the query names: a registry id, a machine id, or `local`. */
  id: string;
  /** The drawn name, clipped; null only for machine `local`, which a client words itself. */
  label: string | null;
}

/** The answer to `GET /v1/sessions` (Phase 316.7). */
export interface PocketSessionsAnswer {
  asked: PocketSessionsAsked;
  /**
   * The rows, in the order asked: under Project, group by group in the groups'
   * order, each group's rows sorted inside it; under None, the sort itself.
   * WHICH rows are here when the caps cut is chosen by Recent activity, waiting
   * first, whatever the words (D4).
   */
  rows: PocketSessionsRow[];
  /**
   * Exactly the groups `rows` name, in the order their first row is emitted
   * (the groups' order under Project, the rows' order under None) (§15 F16).
   */
  groups: PocketSessionsGroup[];
  /**
   * The agents among the rows Show keeps, before the filters, ordered by
   * label; only ids the query can name (§15 F8). At most
   * {@link POCKET_SESSIONS_CHOICES_MAX}.
   */
  agents: PocketSessionsChoice[];
  /** The machines the same way, `local` first when this Mac has a row. */
  machines: PocketSessionsChoice[];
  /** Every listed session, before Show and the filters. */
  total: number;
  /**
   * Rows the words keep that the caps left out: the kept count minus
   * `rows.length`. It is the sum of the groups' {@link
   * PocketSessionsGroup.omitted} whenever every group the words keep has a row
   * drawn. A group whose EVERY row the caps left out is named by no row, so it
   * is not in `groups` and its rows are counted here alone.
   */
  omitted: number;
  /** Epoch ms this answer was composed. */
  at: number;
  /** {@link POCKET_AGE_HONESTY}, handed over rather than spelled by a client. */
  ageNote: string;
}

/** The answer to `GET /v1/session`. */
export interface PocketSessionAnswer {
  session: PocketSessionDetail;
  at: number;
}

/** The answer to `GET /v1/turns`. */
export interface PocketTurnsAnswer {
  sessionId: string;
  /** Ascending by index, newest LAST. */
  turns: PocketTurn[];
  /**
   * True when older turns exist before the first one here. ALWAYS FALSE ON AN
   * EMPTY PAGE, so a client paging back can never be told to go on by a page
   * that added nothing.
   */
  more: boolean;
  at: number;
  /**
   * Why there are no turns to read here, in main's words, or null (Phase 316).
   * A session on another machine answers no turns and this is main's own
   * sentence for it, `OUTCOME_REMOTE` from src/shared/overview-copy.ts: its
   * conversation is on that machine, and that is not an error.
   */
  note: string | null;
}

// ---------------------------------------------------------------------------
// What a write answers (Phase 317, build/p317/SPEC.md §5.3; Phase 318 §5.1.6)
// ---------------------------------------------------------------------------

/**
 * What became of a write. `done`: it happened. `refused`: a gate said no and
 * nothing was done. `failed`: it was asked for and is not known to have
 * happened; the sentence says what is known (since Phase 318 a press can be
 * typed and not known to be taken, and its sentence says exactly that).
 * `busy`: an earlier write from this phone, or on this session, is still being
 * done, so nothing was done for this one.
 */
export type PocketWriteOutcome = 'done' | 'refused' | 'failed' | 'busy';

/**
 * Why a write was refused. A word; the sentence beside it is what a person reads.
 *
 * End's (Phase 317): `removed`, `unreachable`, `ended`, `gone`; the door's own:
 * `malformed`. The reply's (Phase 318, build/p318/SPEC.md D19): `changed` (the
 * question moved under the press, or the session did), `unpressable` (not a
 * question the phone may press), `unsayable` (not ready for a message),
 * `stopped` (the door's last check failed while the verb read), `empty`,
 * `long` and `character` (the message's own three rules). `gone` is shared.
 */
export type PocketWriteReason =
  | 'removed'
  | 'unreachable'
  | 'ended'
  | 'gone'
  | 'malformed'
  | 'changed'
  | 'unpressable'
  | 'unsayable'
  | 'stopped'
  | 'empty'
  | 'long'
  | 'character';

/**
 * The answer to `POST /v1/end`, `/v1/choose` and `/v1/say`, composed field by
 * field in main, and these five fields are all of it.
 *
 * EVERY OUTCOME A WRITE'S VERB DECIDES IS A 200 WITH THIS BODY. A 404 with no
 * body is the door's own refusal and means nothing was done: the quit, the door
 * stopping, the signature, or the last check before the act. After the act
 * nothing replaces this answer.
 */
export interface PocketWriteAnswer {
  verb: PocketWriteRouteId;
  /**
   * The request's write id, echoed: 32 lowercase hex. `""` ONLY when the body
   * yielded no well-formed id, which is the one `refused` `malformed` answer
   * that cannot echo one.
   */
  write: string;
  outcome: PocketWriteOutcome;
  /** Non-null exactly when {@link outcome} is `refused`. */
  reason: PocketWriteReason | null;
  /** The owner's words. Null exactly when {@link outcome} is `done`. */
  sentence: string | null;
}

/**
 * The door's own sentences for a write. Every other sentence a write answers is
 * its gate's or its verb's, spelled where that owner spells it.
 *
 * `stopped` (Phase 318, D5): a press or a message reads the session before it
 * types, and the door's last check (the quit, this door stopping, the phone
 * still paired) is asked AGAIN by the verb immediately before it types. When
 * that answers no, nothing was typed, and this is what the phone reads.
 */
export const POCKET_WRITE_SENTENCES = {
  busy: 'Tortie is still doing the last thing you asked from this phone. Nothing was done.',
  unreadable: 'Your Mac could not read that request. Nothing was done.',
  stopped: 'Your Mac stopped answering this phone. Nothing was done.'
} as const;

// ---------------------------------------------------------------------------
// The sheet in Settings then Phone
// ---------------------------------------------------------------------------

/** What the door is doing right now. */
export type PocketDoorState =
  /** Nobody has turned it on. */
  | 'off'
  /**
   * On, and a start is queued or under way: Tailscale is being read, the door
   * is opening, Funnel is starting or waiting on Tailscale's approval, or
   * Tortie is starting it again after it stopped (Phase 330).
   */
  | 'opening'
  /** On, confirmed, published, and answering. */
  | 'listening'
  /** On, and refused. {@link PocketStatus.refusal} says why in one sentence. */
  | 'refused';

/**
 * What the Funnel child is doing, as the sheet draws it (Phase 330).
 *
 * NONE OF IT IS A SECRET, and none of it is a URL Tortie opens on its own:
 * {@link approvalText} is drawn as selectable text when Tortie will not open
 * it, and `pocket:openApproval` opens only the URL main holds, checked again.
 */
export interface PocketFunnelView {
  state: 'idle' | 'reading' | 'starting' | 'approval' | 'publishing' | 'restarting';
  /**
   * True when the last read found this Mac without Funnel's two capabilities,
   * so the first start will ask Tailscale for its approval. The sheet then
   * draws {@link POCKET_FUNNEL_RIGHT_WARNING} beside the lines.
   */
  asksApproval: boolean;
  /**
   * True only while an approval is waited on AND its URL is an `https:` page
   * on `login.tailscale.com` with no port and no credentials, so the sheet may
   * offer Open Tailscale.
   */
  approvalOpens: boolean;
  /** The approval URL as text, only when Tortie will NOT open it; else null. */
  approvalText: string | null;
}

/**
 * Whether the Mac's public name answers from the internet, as Tortie last read
 * it (Phase 332, build/p332/SPEC.md §4.11). `none`: nothing is being checked
 * and nothing is remembered for the door as it stands. `checking`: the name's
 * own servers are being asked. `confirmed`: they answered it for this tailnet,
 * name and port. `unreadable`: a round could not be read, or the name still
 * answered no after about 15 minutes of asking, so pairing opens anyway, as it
 * did before this phase.
 */
export type PocketNameCheck = 'none' | 'checking' | 'confirmed' | 'unreadable';

/** One kept server's answer in the last round of the Mac's name check, kinds only (Phase 332.1). */
export type PocketNameAnswer = 'record' | 'negative' | 'unreadable';

/**
 * The Mac's name check, as the sheet draws it (Phase 332.1, build/p3321/SPEC.md
 * §5.4). DURATIONS, NOT TIMES: main and the renderer are different processes,
 * and a duration crosses without a wall clock. NO FREE TEXT: no name, server,
 * address or reason word reaches the renderer. IT DECIDES NOTHING: Pair follows
 * {@link PocketStatus.pairable} alone (`conformance:pocket` D10).
 */
export interface PocketNameProgress {
  /** The last answered round, one per server in the order they were asked, at most four. Empty until a round answers. */
  answers: readonly PocketNameAnswer[];
  /** A round is being asked now. */
  asking: boolean;
  /** How long this check has run, on main's monotonic clock (the Mac's sleep included); frozen once it confirmed. */
  elapsedMs: number;
  /** Until the next round; null while a round is out, and once it confirmed. */
  nextInMs: number | null;
}

/** One phone a person allowed. Nothing here is a secret. */
export interface PocketPhoneView {
  id: string;
  /** What the phone called itself when it presented. */
  label: string;
  /**
   * The short fingerprint of the pair, which is what the person matched on
   * both screens when they allowed it. It is a hash of the phone's three
   * public keys (Phase 330: the client key joined the two).
   */
  fingerprint: string;
  /** Epoch ms of the allow. */
  addedAt: number;
  /**
   * Whether this phone can be told through Apple's push service (Phase 314).
   * `none` when it presented no device token; `stopped` when Apple said its
   * token is no longer good and Tortie dropped it, which pairing it again
   * undoes; `on` when it holds a live token. Whether anything is SENT is
   * {@link PocketStatus.pushAlerts}, which is a separate, confirmed switch.
   *
   * The token itself is never on this shape, or on any shape the renderer
   * sees: it decides where a person's words go, so it stays in main.
   */
  alerts: 'none' | 'on' | 'stopped';
}

/** Everything Settings then Phone draws, in one read. */
export interface PocketStatus {
  state: PocketDoorState;
  /**
   * The Mac's public name the door is published at, `<mac>.<tailnet>.ts.net`,
   * or null while Tailscale has not been read and nothing is stored (Phase
   * 330). Reading it takes a press: opening the sheet reads nothing.
   */
  publicName: string | null;
  /** The public port a phone is told, 8443 or 10000, or 0 when none is chosen. */
  publicPort: number;
  /** Whether the door comes up with the app. A confirmed field. */
  bindAtLaunch: boolean;
  /**
   * The sha256 of Tortie's own certificate. It is public by construction: it
   * is a hash of the thing the door presents. A paired client does NOT pin it
   * since Phase 316; it pins the public key's hash the QR carries as `fp`,
   * because the certificate is renewed and the key is not.
   */
  certificateFingerprint: string | null;
  /**
   * One sentence saying why the door is not answering. Null when it is. The
   * order when it is not (Phase 330): the last failed Tailscale read's
   * sentence, then the gate's, then the last start's, so Tailscale being off
   * is never drawn as "this door changed".
   */
  refusal: string | null;
  phones: PocketPhoneView[];
  /**
   * How many stored phones were dropped because they paired before Phase 330
   * and have no client key. They must pair again.
   */
  droppedPhones: number;
  /** What the Funnel child is doing. */
  funnel: PocketFunnelView;
  /** The confirm gate's own word for the door's current fields. */
  confirmState: 'confirmed' | 'never' | 'changed' | 'unknown';
  /**
   * The lines a person reads before confirming the door AS IT STANDS NOW,
   * exactly the hashed facts (Phase 316). The sheet draws them whenever
   * {@link confirmState} is not `confirmed`, and hands them back, unedited,
   * with {@link confirmHash} on `pocket:confirmDoor`.
   */
  confirmLines: readonly string[];
  /** The hash {@link confirmLines} were drawn from. */
  confirmHash: string;
  /**
   * Whether {@link confirmLines} may be agreed to NOW (the Phase 330 fix
   * round): a public name read from Tailscale, a public port Tortie chose, and
   * no Tailscale read or port choice that failed since. When false the lines
   * name no address, or one Tailscale just said it cannot publish, so
   * `pocket:confirmDoor` records nothing and the sheet draws {@link refusal}
   * with Try again instead of the lines and Allow. Main's one predicate: the
   * sheet never spells it again.
   */
  confirmable: boolean;
  /**
   * Whether the Mac's public name answers from the internet, as Tortie last
   * read it (Phase 332). The sheet reads it for one thing only: the line above
   * Pair when it is `unreadable`.
   */
  nameCheck: PocketNameCheck;
  /**
   * MAIN'S ONE PREDICATE (Phase 332): the door listening and the name
   * `confirmed` or `unreadable`. `pocket:beginPairing` refuses without it, and
   * the sheet draws Pair on it and never spells it again, as with
   * {@link confirmable}.
   */
  pairable: boolean;
  /**
   * The Mac's name check, drawn (Phase 332.1): its last round, whether one is
   * out, how long it has run and when it asks next. Null before a check, for
   * the one round that re-asks a remembered name, and while the door is not
   * published. The sheet draws it and decides nothing from it.
   */
  nameProgress: PocketNameProgress | null;
  /** The routes this build has, so the sheet can say what it answers. */
  routes: readonly PocketRouteId[];
  /**
   * Whether Tortie tells the paired phones through Apple when a session starts
   * waiting (Phase 314). A CONFIRMED field of the door's hash, off until a
   * person turns it on and confirms, so turning it on asks again.
   */
  pushAlerts: boolean;
  /**
   * The id of the Apple push key Tortie keeps for the phone app, ten capital
   * letters or digits, or null when none is kept or it has not been read yet
   * (Phase 316.5). PUBLIC: it is the `kid` of every provider token Apple is
   * sent, and the key itself never leaves main. Not a hashed field.
   */
  pushKeyId: string | null;
  /**
   * The push's standing sentence (`@shared/push-copy`), or null while alerts
   * are not armed or nothing went wrong (Phase 316.5). Drawn under the switch.
   */
  pushSentence: string | null;
}

/**
 * What choosing the Apple push key came to (Phase 316.5). A cancelled panel is
 * `{ kept: false, refusal: null }`; a file that could not be kept names why in
 * one sentence and nothing was changed.
 */
export interface PocketPushKeyResult {
  kept: boolean;
  refusal: string | null;
}

/**
 * The switch a person presses (Phase 316): `pocket:setDoor` and
 * `pocket:setPushAlerts` take it. Turning either one ON moves a confirmed
 * field, so the sheet draws the confirm lines and nothing opens or sends until
 * the person confirms them.
 */
export interface PocketSwitchInput {
  on: boolean;
}

/** The QR and the words beside it, handed to the sheet when a window opens. */
export interface PocketPairingOffer {
  /**
   * The bytes the QR encodes, `v: 3` since Phase 330. It carries the door's
   * public name and public port, the fingerprint of the door's PUBLIC KEY
   * (which survives the certificate's renewal), Tortie's two public keys, a
   * one-shot secret that dies with the window, and the deadline. There is no
   * tailnet key and no address: the phone never joins the tailnet.
   *
   * IT IS NOT A BEARER TOKEN FOR THIS DOOR. Nothing in it is accepted on any
   * route but `POST /pair`, nothing in it survives the window, and holding it
   * grants no read: a phone that uses it still has to be allowed by the
   * person, on the Mac, last, after both screens show the same six groups.
   */
  payload: string;
  /** Epoch ms the window shuts. A few minutes. */
  expiresAt: number;
}

/** What the pairing window is doing. */
export type PocketPairingState =
  /** No window is open. */
  | 'idle'
  /** A window is open and no phone has presented yet. */
  | 'waiting'
  /** A phone presented. The person is being asked to match and allow. */
  | 'presented'
  /** The person allowed it. */
  | 'allowed'
  /** The window shut with nothing allowed. */
  | 'expired';

/** The pairing window, as the sheet draws it. */
export interface PocketPairingView {
  state: PocketPairingState;
  expiresAt: number | null;
  /** The phone's own label, when one has presented. */
  label: string | null;
  /** The short fingerprint BOTH screens show, which the person matches. */
  fingerprint: string | null;
  /**
   * The lines the person is being asked to agree to, exactly the hashed facts.
   * Empty until a phone has presented.
   */
  lines: readonly string[];
  /** The hash the sheet was drawn from. Null until a phone has presented. */
  hash: string | null;
  /** The sentence the sheet must carry. */
  warning: string;
}

/** The person's press. The acknowledgement is supplied in main, never here. */
export interface PocketAllowInput {
  /** The lines the person actually read. */
  linesRead: readonly string[];
  /** The hash the sheet was drawn from. */
  hashRead: string;
}

/** What the allow did. */
export interface PocketAllowResult {
  allowed: boolean;
  /** One sentence when it was refused. Null when it was allowed. */
  refusal: string | null;
  status: PocketStatus;
}

// ---------------------------------------------------------------------------
// The sentences the surface must carry
// ---------------------------------------------------------------------------

/**
 * What this door is, said before a person turns it on.
 *
 * It is drawn beside the hashed facts rather than being one of them, exactly as
 * `MACHINE_CONFIRM_WARNING` is, so the words can be corrected without moving
 * any hash and without invalidating any record.
 */
export const POCKET_CONFIRM_WARNING =
  'This lets a phone you allow ask this Mac what your sessions are doing, ' +
  'over the internet. It reads your session names, your project names ' +
  'and what your agents are saying.';

/**
 * What the door can and cannot do, said on its own face (renamed from
 * `POCKET_READ_ONLY_HONESTY` by Phase 317, whose write route made the old
 * name false in code and its sentence false on screen; rewritten by Phase 318,
 * whose two writes made "Nothing on it can type into a session" false).
 *
 * IT NAMES NO FACE ID, TOUCH ID OR PASSCODE, on purpose (build/p317/SPEC.md
 * D13, D19): the Mac cannot verify any of them, and any holder of the phone's
 * keys can sign a write without one, so the Mac's own sheet does not say it.
 * The phone app says it where it is true, on the phone (End alone, his ruling
 * "Only for End"). It names the three writes in the words the confirm line
 * uses (build/p318/SPEC.md D28).
 */
export const POCKET_DOOR_HONESTY =
  'A phone you allow can end a session, answer a numbered question and send a session one message. ' +
  'It can change nothing else on this Mac.';

/**
 * How the phone reaches this Mac (rewritten in Phase 330, research 132 Route
 * 1). Settings then Phone draws it as its caption.
 *
 * The phone never joins the tailnet and needs no Tailscale app: the Mac's own
 * Tailscale publishes the door at its public name through Funnel, raw TCP, so
 * TLS still ends inside Tortie under the key the code pins, and the door
 * admits only a connection whose client key is a paired phone's.
 */
export const POCKET_REACH_HONESTY =
  'Your phone reaches this Mac through Tailscale Funnel. Only a phone you ' +
  'pair gets an answer.';

/**
 * The standing right his approval grants (research 132 §7; his measurement
 * M1). Approving Funnel adds the `funnel` attribute for his tailnet, not for
 * this Mac, and nothing Tortie does can take it back. Drawn beside the lines
 * only when the last read found this Mac without Funnel's capabilities.
 */
export const POCKET_FUNNEL_RIGHT_WARNING =
  'Approving Funnel lets any device signed in to your tailnet publish to the ' +
  'internet, not only this Mac.';

/** Drawn while the Funnel child waits on Tailscale's approval page. */
export const POCKET_FUNNEL_APPROVAL = 'Tailscale needs your OK to publish this door.';

/**
 * Drawn when the approval page is not one Tortie opens (not `https:` on
 * `login.tailscale.com`). The URL follows it as selectable text, never a link.
 */
export const POCKET_FUNNEL_APPROVAL_ELSEWHERE =
  'Tailscale asked for approval at a page Tortie does not open. Approve it ' +
  'there, then try again:';

/** Drawn while Tortie starts the Funnel child again after it stopped. */
export const POCKET_FUNNEL_RESTARTING =
  'Tailscale stopped publishing the door. Tortie is trying again.';

/**
 * Every way publishing the door through Tailscale can be refused (Phase 330,
 * build/p330/SPEC.md §4.2). A WORD, and the sentence below it is what a
 * person reads.
 */
export type PocketFunnelRefusal =
  | 'no-tailscale'
  | 'override-unusable'
  | 'not-running'
  | 'signed-out'
  | 'no-name'
  | 'unreadable'
  | 'ports-taken'
  | 'port-taken'
  | 'not-approved'
  | 'shields-up'
  | 'funnel-ports'
  | 'approval-timeout'
  | 'busy'
  | 'failed';

/**
 * One sentence per refusal. `PORT` in `port-taken` is replaced by
 * {@link pocketFunnelSentence}, the one composer, so no surface spells the
 * sentence twice. Just enough words: each says what is true and the one thing
 * a person can do.
 */
export const POCKET_FUNNEL_SENTENCES: Readonly<Record<PocketFunnelRefusal, string>> = {
  'no-tailscale':
    'Tortie found no Tailscale program on this Mac. Install Tailscale and sign in, then try again.',
  'override-unusable':
    'GMUX_TAILSCALE_BIN does not name a program Tortie can run, so Tortie published nothing.',
  'not-running': 'Tailscale is not running on this Mac. Open Tailscale, then try again.',
  'signed-out': 'Tailscale on this Mac is signed out. Sign in, then try again.',
  'no-name':
    'Tailscale has not given this Mac a name, so there is nothing for a phone to reach. Turn on MagicDNS for your tailnet, then try again.',
  unreadable: 'Tortie could not read what Tailscale answered, so it published nothing.',
  'ports-taken':
    'Tailscale on this Mac already uses ports 8443 and 10000, so Tortie has no port to publish on.',
  'port-taken':
    'Tailscale on this Mac already uses port PORT for something else. Tortie will not take it over.',
  'not-approved': 'Tailscale did not turn Funnel on. An admin of your tailnet must approve it.',
  'shields-up':
    'Tailscale is set to refuse incoming connections on this Mac. Allow incoming connections in Tailscale, then try again.',
  'funnel-ports':
    'Your tailnet’s policy does not allow Funnel on the ports Tortie needs. An admin can allow ports 443, 8443 and 10000.',
  'approval-timeout': 'Tailscale’s approval did not arrive, so Tortie published nothing.',
  busy: 'Tailscale was changing its settings at the same moment. Try again.',
  failed: 'Tailscale did not publish the door. Nothing was published.'
};

/** The one composer of a refusal's sentence. `port` fills `port-taken`'s PORT. */
export function pocketFunnelSentence(reason: PocketFunnelRefusal, port: number): string {
  const sentence = POCKET_FUNNEL_SENTENCES[reason];
  return reason === 'port-taken' ? sentence.replace('PORT', String(port)) : sentence;
}

/**
 * What the sheet says while pairing waits on the Mac's public name (Phase 332,
 * build/p332/SPEC.md §4.11). `checking` is drawn under Pair a phone in place of
 * the button, and is the first half of `pocket:beginPairing`'s refusal;
 * `unreadable` is drawn above Pair when pairing opened without the name
 * answering: a round that could not be read, or a no that lasted.
 */
export const POCKET_NAME_SENTENCES: Readonly<Record<'checking' | 'unreadable', string>> = {
  checking: 'Pair opens once your Mac’s name is on the internet, which can take a few minutes.',
  unreadable: 'Tortie could not confirm your Mac’s name, so a first scan may fail.'
};

/**
 * The round rule, said on the hover of the Pair card's quiet line while the
 * name is checked (Phase 332.1). Main's rule (`roundVerdictOf`,
 * src/main/pocket/public-name.ts): a round confirms when a server answered the
 * record and none said the name is missing.
 */
export const POCKET_NAME_ROUND_RULE = 'Pair opens when a round finds your Mac’s name and no server says it is missing.';

/**
 * How the ages a phone draws can be off, said where they are drawn (Phase 314).
 *
 * The poll that stamps a wait does not run while this Mac sleeps or while
 * Tortie is not running, so a wait that began then is timed from when it was
 * first seen. A wait seen before a sleep keeps its true age across it, which is
 * why the sentence names only the waits FIRST SEEN after. Drawn by the phone
 * app's settings (Phase 316) and by nothing in Phase 314.
 */
export const POCKET_AGE_HONESTY =
  'Waits first seen after your Mac wakes or Tortie restarts are timed from then.';

// ---------------------------------------------------------------------------
// The channels
// ---------------------------------------------------------------------------

/**
 * Settings then Phone, and nothing else, reaches these.
 *
 * `pocket:setDoor`, `pocket:setPushAlerts`, `pocket:removePhone`,
 * `pocket:confirmDoor`, `pocket:forgetDoor`, `pocket:choosePushKey` and
 * `pocket:forgetPushKey` DO change
 * state, and `pocket:openApproval` opens one page in the browser; that is not
 * a contradiction of the door's narrow writes: they are the RENDERER's
 * channels, reached by a person pressing a button in Tortie on this Mac. The
 * door's own route table holds none of them, and its one write (Phase 317) is
 * `end` and nothing else.
 */
export interface PocketInvokeChannelMap {
  /** Everything the sheet draws. Reads the record; binds nothing. */
  'pocket:status': { req: []; res: PocketStatus };
  /**
   * Turn the door on or off (Phase 316). On writes `enabled` and
   * `bindAtLaunch` together and queues ONE read of Tailscale (Phase 330),
   * which chooses the public port and draws the lines; nothing starts until
   * `pocket:confirmDoor`. It answers once the read is queued, with the door
   * `opening`, and the sheet follows `pocket:changed`. Off counts itself as
   * the last press, ends a start that is waiting on Tailscale's approval, and
   * closes the door: the Funnel child first, then the door process.
   */
  'pocket:setDoor': { req: [input: PocketSwitchInput]; res: PocketStatus };
  /**
   * Turn the alerts through Apple on or off (Phase 314's switch, reached from
   * the sheet in Phase 316). A hashed field: on asks again before anything is
   * sent, off stops at once.
   */
  'pocket:setPushAlerts': { req: [input: PocketSwitchInput]; res: PocketStatus };
  /**
   * Open a pairing window of a few minutes and answer the QR. Refused unless
   * the door is listening AND Tailscale still publishes it (read back before
   * the window opens, Phase 330), and the Mac's name answers (Phase 332), so
   * the QR always carries a key to pin and a name that reaches it. It takes
   * nothing: there is no key to paste.
   */
  'pocket:beginPairing': { req: []; res: PocketPairingOffer };
  /** Shut the window now. Whatever presented is dropped. */
  'pocket:cancelPairing': { req: []; res: PocketPairingView };
  /** What the window is doing, including the fingerprint to match. */
  'pocket:pairingState': { req: []; res: PocketPairingView };
  /** The person's last press. Main supplies the acknowledgement. */
  'pocket:allowPhone': { req: [input: PocketAllowInput]; res: PocketAllowResult };
  /** Drop one phone. The others stand. */
  'pocket:removePhone': { req: [phoneId: string]; res: PocketStatus };
  /**
   * Allow: confirm the door's fields as the sheet drew them, and queue the
   * start. It answers once the agreement is recorded and the start queued,
   * NEVER after Tailscale's approval (Phase 330).
   */
  'pocket:confirmDoor': { req: [input: PocketAllowInput]; res: PocketAllowResult };
  /** Withdraw the agreement. The door stops answering at once. */
  'pocket:forgetDoor': { req: []; res: PocketStatus };
  /**
   * Open Tailscale's approval page in the person's browser (Phase 330). Main
   * opens ONLY the URL it holds for the start waiting on approval, and checks
   * it again first: `https:` on `login.tailscale.com`, no port, no
   * credentials. False when there is nothing it will open.
   */
  'pocket:openApproval': { req: []; res: boolean };
  /**
   * Choose the Apple push key (Phase 316.5): main opens the file panel, reads
   * the `.p8` the person picked, takes the key id from Apple's own file name
   * and keeps it sealed. Nothing of the key comes back: only whether it was
   * kept, or the one sentence saying why not.
   */
  'pocket:choosePushKey': { req: []; res: PocketPushKeyResult };
  /** Forget the kept Apple push key (Phase 316.5). Nothing is sent until one is chosen again. */
  'pocket:forgetPushKey': { req: []; res: PocketStatus };
}

/**
 * The one name of the door's event channel.
 *
 * Main broadcasts it and the preload subscribes to it, both through this
 * constant and never through the literal, which is the rule
 * src/shared/__tests__/ipc-single-bridge.test.ts reads: a channel spelled twice
 * is a channel one end can stop listening to without the other noticing.
 */
export const EVT_POCKET_CHANGED = 'pocket:changed' as const;

/** Main pushes the whole status when anything about the door moves. */
export interface PocketEventPayloadMap {
  'pocket:changed': [status: PocketStatus];
}

/** The `pocket` member of the installed bridge. */
export interface GmuxPocketExtras {
  pocket: {
    status(): Promise<PocketStatus>;
    setDoor(input: PocketSwitchInput): Promise<PocketStatus>;
    setPushAlerts(input: PocketSwitchInput): Promise<PocketStatus>;
    beginPairing(): Promise<PocketPairingOffer>;
    cancelPairing(): Promise<PocketPairingView>;
    pairingState(): Promise<PocketPairingView>;
    allowPhone(input: PocketAllowInput): Promise<PocketAllowResult>;
    removePhone(phoneId: string): Promise<PocketStatus>;
    confirmDoor(input: PocketAllowInput): Promise<PocketAllowResult>;
    forgetDoor(): Promise<PocketStatus>;
    openApproval(): Promise<boolean>;
    choosePushKey(): Promise<PocketPushKeyResult>;
    forgetPushKey(): Promise<PocketStatus>;
    onChanged(cb: (status: PocketStatus) => void): () => void;
  };
}
