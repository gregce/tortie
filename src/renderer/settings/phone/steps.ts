/**
 * Settings then Phone's three steps, composed (Phase 333.1, build/p3331/SPEC.md
 * §5.4.2 to §5.4.5, D19).
 *
 * Tailscale on this Mac, Publish this Mac, Pair your phone: each step says
 * where it stands on the right, and the step that waits on the person has one
 * button. `checklistOf` turns main's status into the three faces, row by row,
 * FIRST MATCH WINS, exactly as the SPEC's tables read.
 *
 * IT SPELLS NO PREDICATE MAIN OWNS. Whether the lines may be agreed to
 * (`confirmable`), whether a code may show (`pairable`), whether a return
 * would check again (`rechecks`), which setup press main would act on
 * (`setupActions`), where Tortie stands with Tailscale (`tailscale`) and the
 * refusal's own word (`funnel.refused`) are main's answers, read here and
 * never worked out again. A setup button is drawn only when main lists it.
 *
 * PURE, AND NO IMPORT CYCLE (D19). Nothing here imports PhoneSection.tsx, and
 * nothing here is React. The sheet computes the pair card's stage and hands it
 * in, and fills each piece of a body with what it draws; the words the phone
 * quotes stay in PhoneSection.tsx. `doorNeedsConfirm`, `doorMayRetry` and the
 * `PairingStage` type moved here with unchanged bodies, and PhoneSection.tsx
 * re-exports them, so every reader of today keeps working. So did the three
 * door words the steps now say on the right or in a body (`DOOR_OPENING`,
 * `DOOR_NOT_LISTENING`, `doorListening`), re-exported the same way.
 */

import {
  POCKET_ASK_ADMIN,
  POCKET_FUNNEL_RESTARTING,
  POCKET_FUNNEL_RIGHT_WARNING,
  POCKET_REACH_HONESTY,
  POCKET_SIGN_IN,
  POCKET_SIGN_IN_LINE,
  POCKET_TURN_ON,
  POCKET_TURN_ON_LINE,
  type PocketFunnelRefusal,
  type PocketSetupAction,
  type PocketStatus
} from '@shared/ipc';

// ---------------------------------------------------------------------------
// The words the steps say. None of them is quoted by the phone.
// ---------------------------------------------------------------------------

export const STEP_TAILSCALE = 'Tailscale on this Mac';
export const STEP_PUBLISH = 'Publish this Mac';
export const STEP_PAIR = 'Pair your phone';

export const STATE_CHECKING = 'Checking…';
export const STATE_NOT_INSTALLED = 'Not installed';
export const STATE_NOT_RUNNING = 'Not running';
export const STATE_SIGNED_OUT = 'Signed out';
export const STATE_INSTALLED = 'Installed';
export const STATE_WAITING_TAILSCALE = 'Waiting for Tailscale';
export const STATE_PUBLISHED = 'Published';
export const STATE_READ_ALLOW = 'Read, then allow';
export const STATE_CHANGED = 'Changed since you allowed it';
export const STATE_WAITING_ADMIN = 'Waiting for your admin';
export const STATE_PAIRED = 'Paired';

/** Step 2's state while a start is under way. Re-exported by PhoneSection.tsx. */
export const DOOR_OPENING = 'Starting Tailscale Funnel…';
/** Step 2's line for a refusal main gave no sentence for. Re-exported by PhoneSection.tsx. */
export const DOOR_NOT_LISTENING = 'Not listening.';

export const BTN_GET_TAILSCALE = 'Get Tailscale';
/** Opens the Tailscale app. The approval page's button is PhoneSection.tsx's `BTN_OPEN_TAILSCALE`. */
export const BTN_OPEN_TAILSCALE_APP = 'Open Tailscale';
export const BTN_COPY_LINK = 'Copy link';

export const DISCLOSE_WHATS_THIS = 'What’s this?';
export const DISCLOSE_WHAT_ALLOWS = 'What this allows';

/**
 * `Answering at https://mac.tail0000.ts.net:8443`, what a phone is told: step
 * 2's hover once it is published. Re-exported by PhoneSection.tsx.
 */
export function doorListening(publicName: string, publicPort: number): string {
  return `Answering at https://${publicName}:${String(publicPort)}`;
}

/**
 * Step 1's words once Tailscale answered: `account · tailnet`, or the tailnet
 * alone when the read named no account or the account IS the tailnet, so one
 * value is never drawn twice (D4).
 */
export function tailscaleLine(account: string | null, tailnet: string | null): string {
  if (tailnet === null) return account ?? '';
  return account === null || account === tailnet ? tailnet : `${account} · ${tailnet}`;
}

// ---------------------------------------------------------------------------
// Moved from PhoneSection.tsx (D19), bodies unchanged
// ---------------------------------------------------------------------------

/**
 * True when the door is on, its lines may be agreed to, and they are not the
 * ones a person agreed to, so the lines and Allow are drawn.
 *
 * `confirmable` is MAIN'S answer and is never spelled here (the Phase 330 fix
 * round): with no public name, no public port, or a Tailscale read or port
 * choice that just failed, the lines name no address or one Tailscale said it
 * cannot publish, so main's refusal is drawn instead and nobody is asked to
 * agree to it.
 */
export function doorNeedsConfirm(status: PocketStatus): boolean {
  return (
    status.state !== 'off' &&
    status.confirmable &&
    status.publicName !== null &&
    status.confirmState !== 'confirmed'
  );
}

/**
 * True when the door is on and not answering, and either it was agreed to (a
 * start that was refused) or there is nothing to agree to yet (Tailscale's own
 * refusal, or lines never read). Try again is the switch's own press again: it
 * reads Tailscale and records no agreement.
 */
export function doorMayRetry(status: PocketStatus): boolean {
  return (
    status.state === 'refused' &&
    (status.confirmState === 'confirmed' || !status.confirmable)
  );
}

/**
 * Which of the six faces the pairing card wears. `naming`: the door answers
 * and main says a code may not show yet, because the Mac's name is not on the
 * internet (Phase 332). Worked out by PhoneSection.tsx's `pairingStage`.
 */
export type PairingStage = 'start' | 'waiting' | 'naming' | 'ready' | 'showing' | 'match';

// ---------------------------------------------------------------------------
// The faces
// ---------------------------------------------------------------------------

export type StepId = 'tailscale' | 'publish' | 'pair';

/** The state word's key, drawn as `data-phone-step-state` (SPEC §5.4.8). */
export type StepStateKey =
  | 'checking'
  | 'missing'
  | 'stopped'
  | 'signed-out'
  | 'installed'
  | 'ready'
  | 'starting'
  | 'approval'
  | 'confirm'
  | 'changed'
  | 'admin'
  | 'published'
  | 'paired';

/**
 * What a step's body draws, as kinds the sheet fills. CLOSED: a kind the sheet
 * does not know is a type error, never a guess.
 */
export type StepPiece =
  /** One line of words: main's sentence, or a step word above. */
  | { readonly kind: 'line'; readonly text: string }
  /** One setup press main LISTED (`setupActions`); the sheet asks main to act. */
  | { readonly kind: 'setup-button'; readonly action: PocketSetupAction }
  /** The quiet Try again beside a step's one button, while Tailscale is waited on (his ruling 3). */
  | { readonly kind: 'try-again-quiet' }
  /** Try again, as today: the switch's own press again. */
  | { readonly kind: 'try-again' }
  /** Today's `[data-phone-confirm]` block, whole, at rest (his ruling 2, D18). */
  | { readonly kind: 'confirm' }
  /** Today's `[data-phone-approval]` block. */
  | { readonly kind: 'approval' }
  /** A shut disclosure, the house `set-disclosure`. */
  | {
      readonly kind: 'disclosure';
      readonly which: 'whats-this' | 'what-allows';
      readonly summary: string;
      readonly text: string;
    }
  /**
   * The pair card, `[data-phone-stage]` with today's six values. `pair`:
   * whether its start or ready face draws Pair.
   */
  | { readonly kind: 'pair-card'; readonly pair: boolean };

export interface StepFace {
  readonly id: StepId;
  readonly title: string;
  readonly done: boolean;
  readonly current: boolean;
  /** The words on the right, or null. */
  readonly state: string | null;
  /** The state word's key, or null when there is no state word. */
  readonly stateKey: StepStateKey | null;
  /** The state's hover, or null. */
  readonly hover: string | null;
  /** What the body draws, as kinds the sheet fills (never words the phone quotes). */
  readonly body: readonly StepPiece[];
}

/** Step 1's refusals that are not a state of Tailscale itself: main's sentence and Try again (§5.4.2). */
const STEP_ONE_REFUSALS: ReadonlySet<PocketFunnelRefusal> = new Set([
  'no-name',
  'unreadable',
  'override-unusable',
  'ports-taken',
  'funnel-ports'
]);

/** The refusal word each of step 1's Tailscale states draws in main's place (§5.4.2). */
const STEP_ONE_STATES: Readonly<Partial<Record<StepStateKey, PocketFunnelRefusal>>> = {
  missing: 'no-tailscale',
  stopped: 'not-running',
  'signed-out': 'signed-out'
};

const WHATS_THIS: StepPiece = {
  kind: 'disclosure',
  which: 'whats-this',
  summary: DISCLOSE_WHATS_THIS,
  text: POCKET_REACH_HONESTY
};

const WHAT_ALLOWS: StepPiece = {
  kind: 'disclosure',
  which: 'what-allows',
  summary: DISCLOSE_WHAT_ALLOWS,
  text: POCKET_FUNNEL_RIGHT_WARNING
};

interface Row {
  readonly state: string | null;
  readonly stateKey: StepStateKey | null;
  readonly hover?: string;
  readonly body: readonly StepPiece[];
}

/**
 * Whether step 1 drew the door's refusal, so step 2 leaves it alone (§5.4.3's
 * "none of step 1's words or states"): its refusal row, or a Tailscale state
 * whose own word is the refusal. Asked by the word step 1 DREW rather than by
 * the word alone, because a start can refuse with one of step 1's words too
 * (Funnel's child exits `funnel-ports` over a read that answered, step 1 then
 * ready), and that refusal is step 2's to draw, or nobody draws it.
 */
function tailscaleDrew(status: PocketStatus, row: Row): boolean {
  const refused = status.funnel.refused;
  if (status.state !== 'refused' || refused === null) return false;
  if (row.stateKey === null) return STEP_ONE_REFUSALS.has(refused);
  const own = STEP_ONE_STATES[row.stateKey];
  return own !== undefined && own === refused;
}

/** A setup button, only when main lists the press. */
function offered(status: PocketStatus, action: PocketSetupAction): readonly StepPiece[] {
  return status.setupActions.includes(action) ? [{ kind: 'setup-button', action }] : [];
}

/** The quiet Try again, only while the door is on and refused. */
function quietRetry(status: PocketStatus): readonly StepPiece[] {
  return status.state === 'refused' ? [{ kind: 'try-again-quiet' }] : [];
}

/**
 * May step 1's line say "then come back"? (Phase 333.1's fix round.) Only
 * while coming back to the window would check again, which is main's
 * `rechecks`, never worked out here; and while a start of the person's own is
 * under way, so the words do not change under them for the moment it runs.
 * While a restart is armed it is the restart, not a return, that publishes
 * the door again (D7 (e)), so the line asks for the fix alone and step 2 says
 * Tortie is trying again; with a refusal a return does not check, Try again
 * is the press beside it.
 */
function returnChecks(status: PocketStatus): boolean {
  return status.rechecks || (status.state === 'opening' && status.funnel.state !== 'restarting');
}

/** Step 1, Tailscale on this Mac (§5.4.2). First match wins. */
function tailscaleRow(status: PocketStatus): Row {
  if (status.funnel.state === 'reading') return { state: STATE_CHECKING, stateKey: 'checking', body: [] };
  if (status.tailscale === 'missing') {
    return {
      state: STATE_NOT_INSTALLED,
      stateKey: 'missing',
      body: [...offered(status, 'get-tailscale'), ...quietRetry(status)]
    };
  }
  if (status.tailscale === 'stopped' || status.tailscale === 'signed-out') {
    const stopped = status.tailscale === 'stopped';
    const comesBack = returnChecks(status);
    return {
      state: stopped ? STATE_NOT_RUNNING : STATE_SIGNED_OUT,
      stateKey: stopped ? 'stopped' : 'signed-out',
      body: [
        {
          kind: 'line',
          text: stopped
            ? comesBack
              ? POCKET_TURN_ON_LINE
              : POCKET_TURN_ON
            : comesBack
              ? POCKET_SIGN_IN_LINE
              : POCKET_SIGN_IN
        },
        ...offered(status, 'open-tailscale'),
        ...quietRetry(status)
      ]
    };
  }
  if (status.tailscale === 'ready') {
    // One line, cut with an ellipsis where it is too long for the row (the fix
    // round): the whole of it is the state's hover.
    const line = tailscaleLine(status.account, status.tailnet);
    return line.length === 0
      ? { state: null, stateKey: 'ready', body: [] }
      : { state: line, stateKey: 'ready', hover: line, body: [] };
  }
  if (status.state === 'refused' && status.funnel.refused !== null && STEP_ONE_REFUSALS.has(status.funnel.refused)) {
    return {
      state: null,
      stateKey: null,
      body: [
        { kind: 'line', text: status.refusal ?? DOOR_NOT_LISTENING },
        ...(doorMayRetry(status) ? [{ kind: 'try-again' } as const] : [])
      ]
    };
  }
  return { state: STATE_INSTALLED, stateKey: 'installed', body: [] };
}

/**
 * Step 2, Publish this Mac (§5.4.3). Its body only while the door is on. First
 * match wins. `drawnAbove`: step 1 drew the refusal.
 */
function publishRow(status: PocketStatus, drawnAbove: boolean): Row {
  if (status.state === 'off') return { state: null, stateKey: null, body: [] };
  const funnel = status.funnel;
  if (funnel.state === 'restarting') {
    return { state: null, stateKey: null, body: [{ kind: 'line', text: POCKET_FUNNEL_RESTARTING }] };
  }
  if (funnel.state === 'starting') return { state: DOOR_OPENING, stateKey: 'starting', body: [] };
  if (funnel.state === 'approval') {
    // No Try again while Tailscale's page is waited on: the child moves on by
    // itself, and a press would supersede the wait and print a fresh URL.
    return {
      state: STATE_WAITING_TAILSCALE,
      stateKey: 'approval',
      body: funnel.approvalOpens ? [{ kind: 'approval' }, WHAT_ALLOWS] : [{ kind: 'approval' }]
    };
  }
  if (status.state === 'listening') {
    return {
      state: STATE_PUBLISHED,
      stateKey: 'published',
      hover: doorListening(status.publicName ?? '', status.publicPort),
      body: []
    };
  }
  if (doorNeedsConfirm(status)) {
    const changed = status.confirmState === 'changed';
    return {
      state: changed ? STATE_CHANGED : STATE_READ_ALLOW,
      stateKey: changed ? 'changed' : 'confirm',
      body: [{ kind: 'confirm' }]
    };
  }
  if (funnel.refused === 'not-approved') {
    // No address Tortie refuses to open is drawn here (D6): Copy link only
    // when main holds a link it would open.
    return {
      state: STATE_WAITING_ADMIN,
      stateKey: 'admin',
      body: [{ kind: 'line', text: POCKET_ASK_ADMIN }, ...offered(status, 'copy-admin-link'), { kind: 'try-again-quiet' }]
    };
  }
  if (funnel.refused === 'shields-up') {
    // A return does not check this again (D7): only a start can see it.
    return {
      state: null,
      stateKey: null,
      body: [
        { kind: 'line', text: status.refusal ?? DOOR_NOT_LISTENING },
        ...offered(status, 'open-tailscale'),
        { kind: 'try-again' }
      ]
    };
  }
  if (status.state === 'refused' && !drawnAbove && doorMayRetry(status)) {
    return {
      state: null,
      stateKey: null,
      body: [{ kind: 'line', text: status.refusal ?? DOOR_NOT_LISTENING }, { kind: 'try-again' }]
    };
  }
  return { state: null, stateKey: null, body: [] };
}

/**
 * Step 3, Pair your phone (§5.4.4): the pair card on every face. Pair is drawn
 * on the start face only once a phone is paired (with none, the switch is the
 * next press), and on the ready face unless no phone is paired and the code
 * was asked for (`wished`), because it is on its way (D17).
 */
function pairRow(status: PocketStatus, stage: PairingStage, wished: boolean): Row {
  const paired = status.phones.length > 0;
  const pair = stage === 'start' ? paired : stage === 'ready' ? paired || !wished : false;
  return {
    state: paired ? STATE_PAIRED : null,
    stateKey: paired ? 'paired' : null,
    body: [{ kind: 'pair-card', pair }]
  };
}

/** One step before it is a face: its id, its title, whether it is done, its row. */
type StepRow = readonly [StepId, string, boolean, Row];

/** Before main's first answer: the headers alone, and the pair card's block. */
const UNREAD: readonly StepRow[] = [
  ['tailscale', STEP_TAILSCALE, false, { state: null, stateKey: null, body: [] }],
  ['publish', STEP_PUBLISH, false, { state: null, stateKey: null, body: [] }],
  ['pair', STEP_PAIR, false, { state: null, stateKey: null, body: [{ kind: 'pair-card', pair: false }] }]
];

/**
 * The three rows for a status main sent. Done is step 1 `tailscale ===
 * 'ready'`, step 2 the door listening, step 3 a phone paired (§5.4.1).
 */
function rowsOf(status: PocketStatus, stage: PairingStage, wished: boolean): readonly StepRow[] {
  const first = tailscaleRow(status);
  return [
    ['tailscale', STEP_TAILSCALE, status.tailscale === 'ready', first],
    ['publish', STEP_PUBLISH, status.state === 'listening', publishRow(status, tailscaleDrew(status, first))],
    ['pair', STEP_PAIR, status.phones.length > 0, pairRow(status, stage, wished)]
  ];
}

/**
 * The three steps' faces for a status main sent, the pair card's stage the
 * sheet worked out, and whether the code was asked for in this section. The
 * current step is the first that is not done. Before main's first answer the
 * headers are drawn alone, with step 1's disclosure.
 */
export function checklistOf(status: PocketStatus | null, stage: PairingStage, wished: boolean): readonly StepFace[] {
  const rows = status === null ? UNREAD : rowsOf(status, stage, wished);
  const current = rows.findIndex(([, , done]) => !done);
  return rows.map(([id, title, done, row], i) => ({
    id,
    title,
    done,
    current: i === current,
    state: row.state,
    stateKey: row.stateKey,
    hover: row.hover ?? null,
    // What's this? is on step 1 in every state, shut (§5.4.2).
    body: id === 'tailscale' ? [...row.body, WHATS_THIS] : row.body
  }));
}
