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
 * three reads to a phone whose client key completed the handshake. This file
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
 * No write route. No verb. Nothing in this file can end a session, type into
 * one, set a status or start a process, and the route ids in
 * {@link POCKET_ROUTE_IDS} are a confirmed field of the door's own hash, so a
 * later phase that adds one asks the person again.
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
  'turns'
] as const;

export type PocketRouteId = (typeof POCKET_ROUTE_IDS)[number];

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
}

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
  /** The routes this build has, so the sheet can say what it answers. */
  routes: readonly PocketRouteId[];
  /**
   * Whether Tortie tells the paired phones through Apple when a session starts
   * waiting (Phase 314). A CONFIRMED field of the door's hash, off until a
   * person turns it on and confirms, so turning it on asks again.
   */
  pushAlerts: boolean;
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
 * What the door cannot do, said on its own face.
 *
 * Phase 313 has no write route at all, and this sentence is how a person knows
 * that without reading the code.
 */
export const POCKET_READ_ONLY_HONESTY =
  'This door only answers questions. Nothing on your phone can end a session, ' +
  'type into one, or change anything on this Mac.';

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
 * `pocket:confirmDoor` and `pocket:forgetDoor` DO change
 * state, and `pocket:openApproval` opens one page in the browser; that is not
 * a contradiction of "no write route": they are the RENDERER's channels,
 * reached by a person pressing a button in Tortie on this Mac. The door's own
 * route table is read only and holds none of them.
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
    onChanged(cb: (status: PocketStatus) => void): () => void;
  };
}
