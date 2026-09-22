/**
 * pocket:* — the door on the tailnet, and the sheet that pairs a phone with it
 * (Phase 313).
 *
 * ## What this contract is for
 *
 * Phase 313 is the first time anything outside this Mac can ask Tortie a
 * question. The door itself speaks https on the Mac's own tailnet address and
 * answers a CLOSED table of three reads. This file holds two separate things
 * and it is worth saying which is which, because they are easy to confuse:
 *
 *   - The `pocket:*` INVOKE CHANNELS below are the RENDERER's door, between
 *     Settings then Phone and main. They never leave this Mac.
 *   - {@link PocketBlockedRow}, {@link PocketSessionDetail} and
 *     {@link PocketTurn} are what the tailnet door ANSWERS. They are declared
 *     here, in the shared contract, because every client that ever reads this
 *     door reads the same shapes and none may invent a second spelling.
 *
 * ## The phone computes nothing
 *
 * Every field below that a person reads is a string main already drew. The
 * status word, the agent's question, the option rows, the Catch Me Up line and
 * the turns all arrive composed. THE ONE EXCEPTION IS NAMED RATHER THAN HIDDEN:
 * {@link PocketBlockedRow.blockedSince} is an epoch, because "how long has this
 * been waiting" changes while the screen is open and no module in this
 * repository owns a drawn string for it — the ⌘J sheet computes it in the
 * renderer from its own `attentionSince` map. A client redraws that one number
 * and nothing else.
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

import type { SessionChoiceOption } from './sessions';

// ---------------------------------------------------------------------------
// The closed route table, named once
// ---------------------------------------------------------------------------

/**
 * Every route the tailnet door has, as ids. There is no default and no
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
 * Composed in main. A client opens the url and nothing else happens here: this
 * phase's door starts no process, and an `ssh://` url is a link a terminal app
 * the person already owns decides what to do with.
 */
export interface PocketHandoff {
  kind: 'ssh' | 'claude';
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
  /** Where to carry on by hand, or null when nothing offers one. */
  handoff: PocketHandoff | null;
}

/**
 * One turn of the conversation, exactly the overview store's own shape with
 * nothing added.
 *
 * It is already redacted and already clipped to 4,000 characters by
 * src/main/overview/turn-view.ts, at one definition with one call site. A
 * client must not clip it again: a second cap would be a second place the truth
 * about what a person sees lives.
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
}

/** The answer to `GET /v1/blocked`. */
export interface PocketBlockedAnswer {
  rows: PocketBlockedRow[];
  /** Epoch ms this answer was composed, so a client can say how old it is. */
  at: number;
  /** Drawn when `rows` is empty. One spelling, main's. */
  emptyLine: string;
}

/** The answer to `GET /v1/session`. */
export interface PocketSessionAnswer {
  session: PocketSessionDetail;
  at: number;
}

/** The answer to `GET /v1/turns`. */
export interface PocketTurnsAnswer {
  sessionId: string;
  turns: PocketTurn[];
  /** True when older turns exist before the first one here. */
  more: boolean;
  at: number;
}

// ---------------------------------------------------------------------------
// The sheet in Settings then Phone
// ---------------------------------------------------------------------------

/** What the door is doing right now. */
export type PocketDoorState =
  /** Nobody has turned it on. */
  | 'off'
  /** On, but this Mac has no tailnet address, so nothing is listening. */
  | 'no-address'
  /** On, confirmed, and answering. */
  | 'listening'
  /** On, and refused. {@link PocketStatus.refusal} says why in one sentence. */
  | 'refused';

/** One phone a person allowed. Nothing here is a secret. */
export interface PocketPhoneView {
  id: string;
  /** What the phone called itself when it presented. */
  label: string;
  /**
   * The short fingerprint of the pair, which is what the person matched on
   * both screens when they allowed it. It is a hash of two public keys.
   */
  fingerprint: string;
  /** Epoch ms of the allow. */
  addedAt: number;
  /** The tailnet address it presented from, and the only one it may ask from. */
  address: string;
}

/** Everything Settings then Phone draws, in one read. */
export interface PocketStatus {
  state: PocketDoorState;
  /** The tailnet address the door binds, or null when this Mac has none. */
  address: string | null;
  port: number;
  /** Whether the door comes up with the app. A confirmed field. */
  bindAtLaunch: boolean;
  /**
   * The sha256 of Tortie's own certificate, which a paired client pins. It is
   * public by construction: it is a hash of the thing the door presents.
   */
  certificateFingerprint: string | null;
  /** One sentence saying why the door is not answering. Null when it is. */
  refusal: string | null;
  phones: PocketPhoneView[];
  /** The confirm gate's own word for the door's current fields. */
  confirmState: 'confirmed' | 'never' | 'changed' | 'unknown';
  /** The routes this build has, so the sheet can say what it answers. */
  routes: readonly PocketRouteId[];
}

/** The QR and the words beside it, handed to the sheet when a window opens. */
export interface PocketPairingOffer {
  /**
   * The bytes the QR encodes. It carries the door's address, its port, the
   * certificate fingerprint, Tortie's two public keys and a one-shot secret
   * that dies with the window.
   *
   * IT IS NOT A BEARER TOKEN. Nothing in it is accepted on any route but
   * `POST /pair`, nothing in it survives the window, and holding it grants no
   * read: a phone that uses it still has to be allowed by the person, on the
   * Mac, last.
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
  'over your own tailnet. It reads your session names, your project names ' +
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
 * How the phone reaches the Mac today.
 *
 * The operator ruled on 2026-09-21 that the tailnet node is EMBEDDED in the
 * phone app — "download Tortie phone app and it works" — and that node arrives
 * in a later phase. Until it does, the phone reaches this door through the
 * Tailscale app. The sheet says so rather than reading as progress towards a
 * product he has already ruled against.
 */
export const POCKET_REACH_HONESTY =
  'Your phone reaches this Mac through the Tailscale app. Tortie does not ' +
  'carry a tailnet of its own yet.';

/**
 * The residual the pairing panel names, and the stated reason the writes wait.
 *
 * Because the door serves https, a browser reaching it has `crypto.subtle` and
 * can register a service worker. Both stay refused in every phase, because the
 * certificate a browser reaches is one a browser cannot pin, and because a
 * program signed in as the same person can hold this port while Tortie is down
 * and own the origin.
 */
export const POCKET_ORIGIN_HONESTY =
  'While Tortie is not running, another program signed in as you can hold ' +
  'this port and answer in its place. That is why this door only answers, and ' +
  'why anything that changes a session waits for the app.';

/**
 * What is true about his tailnet until he pastes the grant, in plain words.
 *
 * Research 128 section 3.1: Tailscale's shipped default is
 * `src: ["*"], dst: ["*:*"]`, so a phone joined to a tailnet reaches every
 * device on it, and a one-way grant is additive and buys nothing until that
 * default is narrowed. TORTIE NEVER WRITES HIS POLICY FILE and never holds a
 * credential that could: the sheet shows him the text and he pastes it.
 */
export const POCKET_TAILNET_GRANT_HONESTY =
  'Until you paste this into your own Tailscale admin console, a phone on ' +
  'your tailnet can reach every device on it, not just this door. Tortie ' +
  'never edits your tailnet policy and holds no credential that could.';

/**
 * The policy text a person pastes into their own admin console.
 *
 * `MAC` and `PORT` are replaced by the sheet with the door's own address and
 * port before it is drawn. It is TEXT and it is never sent anywhere: nothing in
 * this repository has a Tailscale API credential, by refusal.
 */
export const POCKET_TAILNET_GRANT_TEMPLATE = [
  '"tagOwners": {',
  '  "tag:tortie-phone": ["autogroup:admin"]',
  '},',
  '"grants": [',
  '  { "src": ["tag:tortie-phone"], "dst": ["MAC"], "ip": ["tcp:PORT"] }',
  ']'
].join('\n');

/** The one composer for the pasted text, so no surface spells it twice. */
export function pocketGrantText(address: string, port: number): string {
  return POCKET_TAILNET_GRANT_TEMPLATE.replace('MAC', address).replace(
    'PORT',
    String(port)
  );
}

// ---------------------------------------------------------------------------
// The channels
// ---------------------------------------------------------------------------

/**
 * Settings then Phone, and nothing else, reaches these.
 *
 * `pocket:removePhone`, `pocket:confirmDoor` and `pocket:forgetDoor` DO change
 * state, and that is not a contradiction of "no write route": they are the
 * RENDERER's channels, reached by a person pressing a button in Tortie on this
 * Mac. The tailnet door's own route table is read only and holds none of them.
 */
export interface PocketInvokeChannelMap {
  /** Everything the sheet draws. Reads the record; binds nothing. */
  'pocket:status': { req: []; res: PocketStatus };
  /** Open a pairing window of a few minutes and answer the QR. */
  'pocket:beginPairing': { req: []; res: PocketPairingOffer };
  /** Shut the window now. Whatever presented is dropped. */
  'pocket:cancelPairing': { req: []; res: PocketPairingView };
  /** What the window is doing, including the fingerprint to match. */
  'pocket:pairingState': { req: []; res: PocketPairingView };
  /** The person's last press. Main supplies the acknowledgement. */
  'pocket:allowPhone': { req: [input: PocketAllowInput]; res: PocketAllowResult };
  /** Drop one phone. The others stand. */
  'pocket:removePhone': { req: [phoneId: string]; res: PocketStatus };
  /** Re-confirm the door's fields after one of them moved. */
  'pocket:confirmDoor': { req: [input: PocketAllowInput]; res: PocketAllowResult };
  /** Withdraw the agreement. The door stops answering at once. */
  'pocket:forgetDoor': { req: []; res: PocketStatus };
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
    beginPairing(): Promise<PocketPairingOffer>;
    cancelPairing(): Promise<PocketPairingView>;
    pairingState(): Promise<PocketPairingView>;
    allowPhone(input: PocketAllowInput): Promise<PocketAllowResult>;
    removePhone(phoneId: string): Promise<PocketStatus>;
    confirmDoor(input: PocketAllowInput): Promise<PocketAllowResult>;
    forgetDoor(): Promise<PocketStatus>;
    onChanged(cb: (status: PocketStatus) => void): () => void;
  };
}
