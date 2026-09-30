/**
 * pocket:* — Settings then Phone, and the owner that holds the door together
 * (Phase 313; published through Tailscale Funnel since Phase 330).
 *
 * ## Two doors, and it matters which is which
 *
 * The channels here are the RENDERER's door: a person pressing a button in
 * Tortie, on this Mac, inside a window Tortie created. They never leave the
 * machine and `../typed-ipc.ts` already refuses any sender Tortie did not make.
 * Some of them CHANGE something — allow a phone, remove one, withdraw the
 * agreement — and that is not a contradiction of "this phase has no write
 * route": the door's own route table is read only and holds none of them. A
 * phone can never reach anything in this file.
 *
 * ## What this module assembles, and what it refuses to own
 *
 * Five modules, one lifetime. `./bind.ts` starts the door process, which
 * listens on loopback and holds the certificate; `./funnel.ts` publishes that
 * listener to the internet through the Mac's own Tailscale; `./server.ts`
 * decides what a forwarded request may be; `./routes.ts` composes the three
 * answers; `./pairing.ts` decides whose request it is. This file is the only
 * place they meet, because the door cannot start without the confirmed fields,
 * the fields are Tailscale's facts and the store's phones, the phones arrive
 * through the pairing window, and the verifier answers from the same phone set
 * — so splitting them would be five readers of one truth.
 *
 * IT OWNS NO SOCKET AND NO KEY. The listener is the door process's and the
 * certificate is `./tls.ts`'s, reached only to sign an allowed phone's client
 * certificate. It spawns nothing itself: the one child is `./funnel.ts`'s and
 * the one process is `./bind.ts`'s, and both are reached from {@link
 * PocketHost.openNow} alone, behind the gate, inside the queue.
 *
 * ## The order a person switches it on in (Phase 330, build/p330/SPEC.md §1)
 *
 *   Pair (the switch on) → Tailscale is read once → the lines → Allow → the
 *   door process listens on loopback → Funnel publishes it → listening → the
 *   code shows
 *
 * `pocket:setDoor` writes `enabled` and `bindAtLaunch` TOGETHER and queues a
 * read of Tailscale, which chooses the public port and draws the lines. Those
 * lines name the internet, the tailnet, the port and the program, and nothing
 * starts until `pocket:confirmDoor` records the agreement (CLAUDE.md refusal
 * 8). NEITHER CALL WAITS ON TAILSCALE: each returns once its job is queued and
 * the sheet follows `pocket:changed`, so the switch stays pressable while
 * Tailscale's approval page is open and an off press ends the child at once.
 *
 * AND THE DOOR IS PUBLISHED ONLY WHILE ITS CURRENT FIELDS ARE THE CONFIRMED
 * ONES. Every press here that moves a hashed field — removing a phone,
 * flipping the alerts — closes the door until the person confirms again. What
 * moves a field from OUTSIDE (a different tailnet, a new name, a different
 * program) is found by the read every start makes, and the door stays shut
 * with the gate's sentence; a restart after an unexpected exit never restarts
 * onto a moved field.
 *
 * ## The switch handles ONE PRESS AT A TIME (Phase 316.1, his ruling of
 * ## 2026-09-23)
 *
 * Every start and every stop of the door and of its Funnel child runs through
 * ONE serial queue this owner holds ({@link PocketHost.serially}), and the LAST
 * press of the switch decides: each `setDoor` counts itself as it arrives, a
 * start that is superseded before it forks or spawns does not, and a start
 * that is superseded after closes what it opened before the next press runs.
 *
 * ## What this module does not do
 *
 * It reads no credential and names neither `main/credentials/` nor
 * `main/logins/`. It sets no status. It writes no tailnet policy, holds no
 * Tailscale credential and calls no LocalAPI, by refusal (research 128 §3.2).
 * It opens one URL, Tailscale's approval page, only on a person's press and
 * only after `./funnel.ts`'s check says it is Tailscale's own login host.
 */

import { shell, type IpcMain } from 'electron';

import {
  EVT_POCKET_CHANGED,
  POCKET_FUNNEL_RESTARTING,
  POCKET_ROUTE_IDS,
  pocketFunnelSentence,
  type PocketAllowInput,
  type PocketAllowResult,
  type PocketFunnelRefusal,
  type PocketFunnelView,
  type PocketPairingOffer,
  type PocketPairingView,
  type PocketStatus,
  type PocketSwitchInput
} from '@shared/ipc/pocket';
import { broadcastEvent } from '../typed-events';
import { gmuxError } from '../errors';
import { getLog } from '../log';
import { handle } from '../typed-ipc';
import {
  DOOR_SENTENCES,
  onPocketDoorExit,
  pocketDoorStatus,
  pocketShutdownStarted,
  startPocketDoor,
  stopPocketDoor,
  updatePocketDoor
} from './bind';
import type { DoorPin, DoorSpawner } from './door/wire';
import {
  FUNNEL_PORTS,
  approvalOpens,
  armFunnelRestart,
  choosePublicPort,
  defaultFunnelDeps,
  funnelProgramOf,
  funnelShutdownStarted,
  nextRestartDelay,
  portsHeld,
  readServe,
  readTailnet,
  servesThisDoor,
  startFunnel,
  sweepFunnelOrphan,
  type FunnelDeps,
  type FunnelRun,
  type TailnetRead
} from './funnel';
import {
  EMPTY_POCKET_FIELDS,
  POCKET_CONFIRM_ACKNOWLEDGEMENT,
  PocketPairing,
  PocketRequestVerifier,
  assertPocketDoorMayBind,
  clientKeyPinOf,
  confirmPocketDoor,
  forgetPocketDoor,
  newIdentity,
  openIdentity,
  phoneView,
  pocketConfirmStatus,
  isPushTokenDigest,
  pushTokenDigest,
  readPocketStore,
  spkiPinOf,
  writePocketStore,
  POCKET_DEAD_TOKEN_MEMORY,
  type PocketExecutionFields,
  type PocketIdentity,
  type PocketPhoneFields,
  type PocketPushDestination,
  type PocketStore,
  type PocketTailnetFacts
} from './pairing';
import {
  createPocketRoutes,
  pocketRouteIds,
  type PocketFacts,
  type PocketRoute
} from './routes';
import { createPocketHandler } from './server';
import { issueClientCertificate, pocketTlsMaterial } from './tls';

const pocketLog = getLog('pocket');

/** What the launch step did, as one word a test and a log line can read. */
export type PocketLaunchOutcome = 'off' | 'refused' | 'opened';

/** A switch press, or one sentence saying it was not one. */
function switchOf(input: unknown): boolean {
  if (input === null || typeof input !== 'object') throw notASwitch();
  const on = (input as { on?: unknown }).on;
  if (typeof on !== 'boolean') throw notASwitch();
  return on;
}

function notASwitch(): Error {
  return gmuxError(
    'INVALID_INPUT',
    'Tortie could not read that switch, so it changed nothing.'
  );
}

/** What the owner needs from outside `src/main/pocket/`. */
export interface PocketHostDeps {
  /**
   * Everything the three reads may ask main. Every member is a read, and that
   * type IS the refusal: there is no member a route could set a status with.
   */
  facts: PocketFacts;
  /**
   * Awaited after the gate and before anything starts, every time the door
   * opens — from the launch step and from a person's press alike (Phase 316).
   * The composer passes the session core's boot, because every route reads the
   * core and a door must not answer before there is anything to answer from.
   * A throw keeps the door shut and says so.
   */
  beforeOpen?(): Promise<unknown>;
  now?(): number;
  /**
   * The Funnel child's seams (Phase 330). TESTS AND `../harness/push-seam.ts`
   * ONLY (`conformance:pocket` U4); production takes `./funnel.ts`'s own.
   */
  tailscale?: FunnelDeps;
  /**
   * How the door process is started (Phase 330). TESTS AND
   * `../harness/push-seam.ts` ONLY (`conformance:pocket` U4); production forks
   * the real `utilityProcess` in `./bind.ts`.
   */
  door?: DoorSpawner;
  /**
   * The wake (Phase 330, SPEC §4.3): while the door is published, a resume
   * queues one check that Tailscale still publishes it. The composer hands
   * `WakeMark.onResume`. Returns the unsubscribe.
   */
  onResume?(cb: () => void): () => void;
}

/** What the sheet says when the door could not open because the sessions were not up. */
const SESSIONS_NOT_READY =
  'Tortie could not start its sessions, so the door did not open.';

/**
 * What the sheet says, and `pocket:confirmDoor` answers, while the door's
 * lines name no public name or no public port and no Tailscale read has
 * failed to say why (the Phase 330 fix round): the lines were never read, so
 * there is nothing to agree to. Try again is the press that reads them.
 */
const NOTHING_TO_ALLOW =
  'Tortie has not read Tailscale for this door yet, so there is nothing to ' +
  'allow. Press Try again. Nothing was changed.';

/** What `beginPairing` says when the door is not published. */
const NOT_PUBLISHED =
  'The door is not answering, so there is no code to show. Turn it on and ' +
  'allow it first. Nothing was opened.';

/**
 * Refusals that a restart after an unexpected exit tries again, because they
 * can pass on their own: Tailscale restarting under an update (research 132
 * O6), a busy serve config, the door process dying once. The rest need a
 * person and are left on the sheet with their sentence.
 */
const RETRIED: ReadonlySet<PocketFunnelRefusal> = new Set([
  'not-running',
  'unreadable',
  'busy',
  'failed',
  'no-tailscale'
]);

/**
 * One press of the door's switch, as a start remembers it (Phase 316.1).
 *
 * `n` is its place in the order the presses arrived in. `superseded` settles
 * the moment a LATER press arrives, so a start waiting on the sessions or on
 * Tailscale's approval for a press that is no longer the last one stops
 * waiting at once.
 */
interface SwitchPress {
  readonly n: number;
  readonly superseded: Promise<void>;
}

/** A press, and the one function that says a later press arrived. */
function pressNumbered(n: number): { press: SwitchPress; supersede: () => void } {
  let supersede = (): void => undefined;
  const superseded = new Promise<void>((resolve) => {
    supersede = resolve;
  });
  return { press: { n, superseded }, supersede };
}

/** What one start came to. `retry` is a refusal a restart may try again. */
type OpenOutcome = 'published' | 'stopped' | 'retry';

type GoodRead = Extract<TailnetRead, { ok: true }>;

/**
 * The owner: the store, the pairing window, the verifier, the handler, the
 * door process and the Funnel child.
 */
export class PocketHost {
  private store: PocketStore | null = null;
  private identity: PocketIdentity | null = null;
  /** Rows the last store read dropped for having no client key. */
  private droppedPhones = 0;
  private readonly addedAt = new Map<string, number>();
  /**
   * The LAST press of the switch (Phase 316.1). Every `setDoor` that changes
   * anything replaces it, synchronously, before its first await.
   */
  private lastPress = pressNumbered(0);
  /**
   * THE SWITCH'S ONE QUEUE (Phase 316.1). The tail of every door job so far.
   * It never rejects, so a job that failed cannot stop the next press.
   */
  private doorJobs: Promise<void> = Promise.resolve();
  /** Door jobs queued or running that may start the door. */
  private opening = 0;

  private readonly funnel: FunnelDeps;
  /** This run's last successful Tailscale read, or null before the first. */
  private read: GoodRead | null = null;
  /** The last Tailscale read's refusal, cleared by a read that succeeds. */
  private readRefusal: PocketFunnelRefusal | null = null;
  /** The last start's sentence: the listener's, Funnel's, or the sessions'. */
  private startRefusal: string | null = null;
  /** The Funnel child while the door is published. */
  private run: FunnelRun | null = null;
  private funnelState: PocketFunnelView['state'] = 'idle';
  /** The approval URL the start is waiting on, held only for that wait. */
  private approvalUrl: string | null = null;
  /** Epoch ms of this run's last counted start. */
  private publishedAt: number | null = null;
  /** The restart's pending timer, and the spacing it was armed with. */
  private restartCancel: (() => void) | null = null;
  private restartDelay = 0;
  /** The timer that tells the door process the window shut. */
  private windowTimer: ReturnType<typeof setTimeout> | null = null;

  readonly pairing: PocketPairing;
  readonly verifier: PocketRequestVerifier;
  /** The request handler the door process forwards to. */
  readonly handler: ReturnType<typeof createPocketHandler>;

  constructor(private readonly deps: PocketHostDeps) {
    this.funnel = deps.tailscale ?? defaultFunnelDeps();
    this.pairing = new PocketPairing({
      identity: () => this.identityNow(),
      fieldsNow: () => this.fields(),
      savePhones: (phones) => this.savePhones(phones),
      // THE PUBLIC KEY, NOT THE CERTIFICATE. And null unless the door is
      // published, which is what makes the window refuse to open on a door
      // with nothing to pin or nothing a phone can reach.
      publicKeyPin: () => {
        const door = pocketDoorStatus();
        return door.listening && this.published() ? spkiPinOf(door.publicKeyFingerprint) : null;
      },
      // The door's own key signs the allowed phone's client certificate. Only
      // while it is listening: that is when main holds the material.
      issueCertificate: (clientKey) => {
        const material = pocketTlsMaterial();
        if (material === null || !pocketDoorStatus().listening) return null;
        try {
          return issueClientCertificate(material.key, clientKey, this.now()).toString('base64url');
        } catch {
          return null;
        }
      },
      ...(deps.now !== undefined ? { now: deps.now } : {})
    });
    this.verifier = new PocketRequestVerifier({
      identity: () => this.identityNow(),
      phones: () => this.fields().phones,
      ...(deps.now !== undefined ? { now: deps.now } : {})
    });
    const routes = createPocketRoutes(deps.facts);
    this.handler = createPocketHandler({
      shuttingDown: () => pocketShutdownStarted(),
      pairingWindowOpen: () => this.pairing.windowOpen(),
      present: (presentation) => this.pairing.present(presentation),
      verify: (input) => {
        const verdict = this.verifier.verify({
          method: input.method,
          target: input.target,
          body: input.body,
          channel: input.channel,
          headers: input.headers
        });
        return verdict.ok
          ? { ok: true, phoneId: verdict.phone.id }
          : { ok: false, reason: verdict.reason };
      },
      // Asked again after the answer is composed and before it is sent (the
      // Phase 316.1 fix round): `removePhone` writes the store BEFORE its first
      // await, so a phone removed while its request was in flight is refused
      // `unpaired` here rather than answered. A store that cannot be read
      // answers no, which refuses.
      stillPaired: (phoneId) =>
        this.readStore()?.phones.some((p) => p.id === phoneId) === true,
      answer: async (route: PocketRoute, query) => {
        // The closed table, answered. There is no default arm: a route id this
        // switch does not name cannot exist, because `POCKET_ROUTES` is the
        // only producer of the type.
        switch (route.id) {
          case 'blocked':
            return routes.blocked();
          case 'session': {
            const id = query.get('id');
            return id === null ? null : await routes.session(id);
          }
          case 'turns': {
            const id = query.get('id');
            return id === null
              ? null
              : await routes.turns(id, {
                  limit: query.get('limit'),
                  from: query.get('from'),
                  to: query.get('to')
                });
          }
          case 'pair':
            // Answered in `./server.ts`, because presenting reads nothing of
            // main's state and must not reach this composer at all.
            return null;
        }
      }
    });
    // THE DOOR PROCESS DIED UNASKED. The same path as the child exiting: the
    // child is stopped first, then the whole door starts again.
    onPocketDoorExit(() => {
      if (this.run === null) return;
      pocketLog.warn('the door process stopped unexpectedly');
      this.unexpectedlyDown();
    });
    deps.onResume?.(() => this.wakeCheck());
  }

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  // -------------------------------------------------------------------------
  // The store
  // -------------------------------------------------------------------------

  /**
   * The store, read fresh whenever it is not held.
   *
   * It is NOT cached across a failed seal read. `sealKnown` false means the app
   * is not ready or the keystore is unavailable, so the answer is not known YET
   * and remembering the safe answer would drop a real agreement for the whole
   * run. `../config/confirm-record.ts` states the rule and this follows it.
   */
  private readStore(): PocketStore | null {
    if (this.store !== null) return this.store;
    const read = readPocketStore();
    if (!read.sealKnown) return null;
    if (read.store !== null) {
      this.store = read.store;
      this.droppedPhones = read.droppedPhones;
      this.identity = openIdentity(read.store.identity);
      for (const phone of read.store.phones) {
        if (!this.addedAt.has(phone.id)) this.addedAt.set(phone.id, 0);
      }
    }
    return this.store;
  }

  /** Write the store and hold it, or answer false and hold what was. */
  private writeStore(next: PocketStore): boolean {
    if (!writePocketStore(next)) return false;
    this.store = next;
    return true;
  }

  /**
   * The identity, minted on first use and sealed at once.
   *
   * Minting it starts nothing: no socket opens, nothing is sent and nothing
   * outside this Mac can be reached by it. The door still refuses to start
   * until a person has confirmed it.
   */
  private identityNow(): PocketIdentity {
    const store = this.readStore();
    if (store !== null && this.identity !== null) return this.identity;
    const minted = newIdentity();
    const next: PocketStore = {
      identity: minted.sealed,
      phones: store?.phones ?? [],
      publicPort: store?.publicPort ?? 0,
      tailnetFacts: store?.tailnetFacts ?? null,
      bindAtLaunch: store?.bindAtLaunch ?? false,
      enabled: store?.enabled ?? false,
      pushAlerts: store?.pushAlerts ?? false,
      deadPushTokens: store?.deadPushTokens ?? []
    };
    if (!writePocketStore(next)) {
      throw gmuxError(
        'INVALID_INPUT',
        'Tortie could not save the key this door answers with, so it set ' +
          'nothing up. Nothing was changed.'
      );
    }
    this.store = next;
    this.identity = minted.identity;
    return minted.identity;
  }

  private savePhones(phones: readonly PocketPhoneFields[]): boolean {
    const store = this.readStore();
    if (store === null) return false;
    if (!this.writeStore({ ...store, phones: [...phones] })) return false;
    const now = this.now();
    for (const phone of phones) {
      if (!this.addedAt.has(phone.id)) this.addedAt.set(phone.id, now);
    }
    // The door process admits the new phone's handshake from this line.
    this.postPins();
    return true;
  }

  /** The paired phones' client-key pins, as the door process checks them. */
  private pins(): DoorPin[] {
    return this.fields().phones.map((p) => ({
      phoneId: p.id,
      spkiSha256: clientKeyPinOf(p.clientKey)
    }));
  }

  /**
   * Hand the door process the pins as they stand now. A phone no longer in
   * them has every open socket cut by the door process at once, before any
   * queued close runs.
   */
  private postPins(): void {
    if (!pocketDoorStatus().listening) return;
    updatePocketDoor({ pins: this.pins() });
  }

  /**
   * The facts the hash is computed from: this run's read when there is one,
   * and otherwise the stored facts (SPEC §4.4).
   */
  private facts(): PocketTailnetFacts | null {
    if (this.read !== null) {
      return {
        funnelProgram: this.read.funnelProgram,
        tailnet: this.read.tailnet,
        publicName: this.read.publicName
      };
    }
    return this.readStore()?.tailnetFacts ?? null;
  }

  /** The door's execution bearing fields, as they are right now. */
  fields(): PocketExecutionFields {
    const store = this.readStore();
    const facts = this.facts();
    return {
      funnelProgram: facts?.funnelProgram ?? EMPTY_POCKET_FIELDS.funnelProgram,
      tailnet: facts?.tailnet ?? EMPTY_POCKET_FIELDS.tailnet,
      publicName: facts?.publicName ?? EMPTY_POCKET_FIELDS.publicName,
      publicPort: store?.publicPort ?? EMPTY_POCKET_FIELDS.publicPort,
      bindAtLaunch: store?.bindAtLaunch ?? false,
      routes: pocketRouteIds(),
      phones: store?.phones ?? EMPTY_POCKET_FIELDS.phones,
      pushAlerts: store?.pushAlerts ?? EMPTY_POCKET_FIELDS.pushAlerts
    };
  }

  // -------------------------------------------------------------------------
  // What the sheet draws
  // -------------------------------------------------------------------------

  /**
   * MAY THESE LINES BE AGREED TO NOW? (The Phase 330 fix round.) Only over a
   * public name Tailscale gave and a public port Tortie chose, and never while
   * the last Tailscale read or port choice failed: those lines name no
   * address, or an address Tailscale just said it cannot publish, and a person
   * is never asked to agree to them. ONE PREDICATE: `status().confirmable` is
   * this, the sheet draws the lines and Allow only on it, and
   * {@link confirmDoor} records nothing without it.
   */
  private confirmable(fields: PocketExecutionFields): boolean {
    return (
      fields.publicName.length > 0 &&
      FUNNEL_PORTS.includes(fields.publicPort) &&
      this.readRefusal === null
    );
  }

  /** Why {@link confirmable} said no, as the one sentence the sheet draws. */
  private unconfirmableSentence(fields: PocketExecutionFields): string {
    return this.readRefusal !== null
      ? pocketFunnelSentence(this.readRefusal, fields.publicPort)
      : NOTHING_TO_ALLOW;
  }

  /** True while a counted start's child is alive. */
  private published(): boolean {
    return this.run !== null && this.run.alive && this.funnelState === 'publishing';
  }

  status(): PocketStatus {
    const fields = this.fields();
    const gate = pocketConfirmStatus(fields);
    const door = pocketDoorStatus();
    const store = this.readStore();
    const listening = door.listening && this.published();
    const state: PocketStatus['state'] =
      store?.enabled !== true
        ? 'off'
        : listening
          ? 'listening'
          : this.opening > 0 || this.funnelState === 'restarting'
            ? 'opening'
            : 'refused';
    // THE ORDER (SPEC §4.11): Tailscale's own refusal, then the gate's, then
    // the last start's. Tailscale being off is never drawn as "this door
    // changed", and lines that name nothing are never drawn as a door waiting
    // to be allowed (the fix round). A door that is OFF composes no read
    // sentence: the last read belongs to a press the person has since undone.
    const confirmable = this.confirmable(fields);
    const readSentence = state === 'off' || confirmable ? null : this.unconfirmableSentence(fields);
    const waiting = this.funnelState === 'approval' ? this.approvalUrl : null;
    const opens = approvalOpens(waiting);
    return {
      state,
      publicName: fields.publicName.length === 0 ? null : fields.publicName,
      publicPort: fields.publicPort,
      bindAtLaunch: fields.bindAtLaunch,
      certificateFingerprint: door.certificateFingerprint,
      refusal:
        state === 'listening'
          ? null
          : (readSentence ?? gate.refusal ?? this.startRefusal ?? door.sentence),
      phones: fields.phones.map((p) =>
        phoneView(p, this.addedAt.get(p.id) ?? 0, new Set(store?.deadPushTokens ?? []))
      ),
      droppedPhones: this.droppedPhones,
      funnel: {
        state: this.funnelState,
        asksApproval: this.read?.asksApproval ?? false,
        approvalOpens: opens,
        approvalText: waiting !== null && !opens ? waiting : null,
        publishedAt: this.publishedAt
      },
      confirmState: gate.state,
      confirmLines: gate.lines,
      confirmHash: gate.hash,
      confirmable,
      routes: POCKET_ROUTE_IDS,
      pushAlerts: fields.pushAlerts
    };
  }

  // -------------------------------------------------------------------------
  // The switch's one queue (Phase 316.1, his ruling of 2026-09-23)
  // -------------------------------------------------------------------------

  /**
   * Run one door job after every door job before it has settled.
   *
   * THIS IS THE ONLY WAY THE DOOR OR ITS FUNNEL CHILD IS STARTED OR STOPPED.
   * {@link openNow}, {@link recoverNow} and {@link closeNow} are reached from
   * inside a job and nowhere else. A job that rejects rejects its own caller
   * and never the queue.
   */
  private serially<T>(job: () => Promise<T>): Promise<T> {
    const run = this.doorJobs.then(job);
    this.doorJobs = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  /**
   * Resolves once the queue is empty, including any job a job queued. A TEST
   * HELPER: no IPC answer waits on it, because a start may wait on Tailscale's
   * approval for minutes.
   */
  async idle(): Promise<void> {
    let tail: Promise<void> | null = null;
    while (tail !== this.doorJobs) {
      tail = this.doorJobs;
      await tail;
    }
  }

  /**
   * A press of the switch arrived: it is now the LAST press, and every start
   * of an earlier one is superseded. Synchronous, and called before the
   * press's first await.
   */
  private pressed(): SwitchPress {
    this.lastPress.supersede();
    this.lastPress = pressNumbered(this.lastPress.press.n + 1);
    return this.lastPress.press;
  }

  /** Has a press arrived since `press`? Then `press` no longer decides. */
  private superseded(press: SwitchPress): boolean {
    return press.n !== this.lastPress.press.n;
  }

  /**
   * Open the door, or remember the sentence that says why not. It opens for
   * the LAST press as it stands now, and waits its turn in the queue.
   */
  async start(): Promise<void> {
    const press = this.lastPress.press;
    this.opening += 1;
    try {
      await this.serially(async () => {
        const outcome = await this.openNow(press);
        if (outcome !== 'published' && this.funnelState !== 'restarting') this.funnelState = 'idle';
      });
    } finally {
      this.opening -= 1;
      this.changed();
    }
  }

  /** The same start, queued and not awaited: the IPC answer never waits on it. */
  private queueStart(): void {
    void this.start();
  }

  /** The funnel's state, drawn at once. */
  private setFunnel(state: PocketFunnelView['state']): void {
    this.funnelState = state;
    this.changed();
  }

  /**
   * THE ORPHAN SWEEP, then THE READ, the order every job that may spawn asks
   * them in (SPEC §4.3 steps 5 and 6): an orphan of a crashed run still holds
   * its port, and the read must not mistake it for somebody else's.
   *
   * A successful read replaces this run's facts, and the stored ones when they
   * differ (observations: writing them confirms nothing).
   */
  private async sweepAndRead(): Promise<GoodRead | null> {
    if ((await sweepFunnelOrphan(this.funnel)) === 'still-running') {
      this.orphanWouldNotEnd();
      return null;
    }
    this.setFunnel('reading');
    const read = await readTailnet(this.funnel);
    if (!read.ok) {
      this.readRefusal = read.reason;
      pocketLog.warn(`Tailscale could not be read: ${read.reason}`);
      return null;
    }
    this.readRefusal = null;
    this.read = read;
    const store = this.readStore();
    const stored = store?.tailnetFacts ?? null;
    if (
      store !== null &&
      (stored === null ||
        stored.funnelProgram !== read.funnelProgram ||
        stored.tailnet !== read.tailnet ||
        stored.publicName !== read.publicName)
    ) {
      this.writeStore({
        ...store,
        tailnetFacts: {
          funnelProgram: read.funnelProgram,
          tailnet: read.tailnet,
          publicName: read.publicName
        }
      });
    }
    return read;
  }

  /**
   * A Funnel child a crashed run left publishing was proved ours by `ps` and
   * would not end: its record is kept, and the start refuses `port-taken`.
   */
  private orphanWouldNotEnd(): void {
    this.startRefusal = pocketFunnelSentence('port-taken', this.fields().publicPort);
  }

  /**
   * The start itself, run only inside a door job (SPEC §4.3).
   *
   * THE GATE IS ASKED FIRST, before Tailscale is read at all, so a door nobody
   * confirmed never gets as far as a program. AND THE PRESS IS ASKED BESIDE
   * IT: a start whose press is no longer the last one forks and spawns
   * nothing, and the statement IMMEDIATELY before the fork and before the spawn
   * is that question (`conformance:pocket` L5).
   */
  private async openNow(press: SwitchPress): Promise<OpenOutcome> {
    // 1, 2.
    if (this.superseded(press)) return 'stopped';
    if (!this.mayOpen()) return 'stopped';
    // 3, 4.
    if (this.deps.beforeOpen !== undefined) {
      try {
        // A LATER PRESS ENDS THE WAIT.
        await Promise.race([this.deps.beforeOpen(), press.superseded]);
      } catch {
        if (this.superseded(press)) return 'stopped';
        this.startRefusal = SESSIONS_NOT_READY;
        pocketLog.warn('the phone door did not open: the sessions were not ready');
        this.changed();
        return 'retry';
      }
      if (this.superseded(press)) return 'stopped';
      if (!this.mayOpen()) return 'stopped';
    }
    // 5, 6. A read that moved a field moves the hash, and the gate refuses.
    const read = await this.sweepAndRead();
    if (this.superseded(press)) {
      this.setFunnel('idle');
      return 'stopped';
    }
    if (read === null) {
      this.setFunnel('idle');
      return this.readRefusal !== null && !RETRIED.has(this.readRefusal) ? 'stopped' : 'retry';
    }
    if (!this.mayOpen()) {
      this.setFunnel('idle');
      return 'stopped';
    }
    const fields = this.fields();
    // NOTHING OPENS ONTO A NAME OR A PORT THAT IS NOT ONE (the fix round): a
    // door process given port 0 is refused by the wire and was reported,
    // fourteen seconds later, as a door that could not open. `confirmDoor`
    // records no agreement over such fields; this is the same rule asked again
    // by the one path that forks.
    if (!this.confirmable(fields)) {
      this.startRefusal = this.unconfirmableSentence(fields);
      pocketLog.warn('the phone door did not open: it has no public name or port');
      this.setFunnel('idle');
      return 'stopped';
    }
    // A CONFIRMED PORT THAT IS HELD REFUSES AND NEVER MOVES: a phone was told
    // it. Only a person's switch chooses again.
    if (portsHeld(read.serve).has(fields.publicPort)) {
      this.startRefusal = pocketFunnelSentence('port-taken', fields.publicPort);
      pocketLog.warn('the phone door did not open: port-taken');
      this.setFunnel('idle');
      return 'stopped';
    }
    // 7, 8. The door process listens on 127.0.0.1:0.
    this.setFunnel('starting');
    if (this.superseded(press)) {
      this.setFunnel('idle');
      return 'stopped';
    }
    const door = await startPocketDoor({
      handle: this.handler,
      publicHost: { name: fields.publicName, port: fields.publicPort },
      pins: this.pins(),
      windowOpen: this.pairing.windowOpen(),
      ...(this.deps.door !== undefined ? { spawn: this.deps.door } : {})
    });
    // 9.
    if (this.superseded(press)) {
      if (door.ok) await stopPocketDoor();
      this.setFunnel('idle');
      return 'stopped';
    }
    if (!door.ok) {
      this.startRefusal = door.sentence;
      pocketLog.warn(`the phone door did not open: ${door.reason}`);
      this.setFunnel('idle');
      return door.reason === 'quitting' ? 'stopped' : 'retry';
    }
    // 10, 11. The approval wait lives here, raced against the press. Every
    // way out but a counted start stops the child (inside `startFunnel`) and
    // the door process (the `finally` below).
    let outcome: OpenOutcome = 'retry';
    try {
      if (this.superseded(press)) {
        outcome = 'stopped';
        return outcome;
      }
      const started = await startFunnel(
        this.funnel,
        {
          program: fields.funnelProgram,
          publicName: fields.publicName,
          publicPort: fields.publicPort,
          localPort: door.localPort
        },
        press.superseded,
        {
          onApproval: (url) => {
            this.approvalUrl = url;
            this.setFunnel('approval');
          },
          onApproved: () => {
            this.approvalUrl = null;
            this.setFunnel('starting');
          }
        }
      );
      this.approvalUrl = null;
      if (started.kind === 'superseded') {
        outcome = 'stopped';
        return outcome;
      }
      if (started.kind === 'refused') {
        this.startRefusal = pocketFunnelSentence(started.reason, fields.publicPort);
        outcome = RETRIED.has(started.reason) ? 'retry' : 'stopped';
        return outcome;
      }
      if (this.superseded(press)) {
        await started.run.stop();
        outcome = 'stopped';
        return outcome;
      }
      // 12. THE COUNTED START. The restart's spacing starts again at its floor.
      this.adopt(started.run);
      this.publishedAt = this.now();
      this.startRefusal = null;
      this.cancelRestart();
      this.restartDelay = 0;
      this.funnelState = 'publishing';
      outcome = 'published';
    } finally {
      if (outcome !== 'published') {
        this.funnelState = 'idle';
        await stopPocketDoor();
        this.changed();
      }
    }
    pocketLog.info('the phone door is published');
    // 13. A press that withdrew the agreement while this start was running (a
    // Remove, the alerts flipped) found nothing published to close, so the
    // door that just opened is asked again by the same rule and closes until
    // the person confirms.
    await this.closeNowUnlessConfirmed();
    this.changed();
    return this.published() ? 'published' : 'stopped';
  }

  /** Hold the published child, and hear if it exits unasked. */
  private adopt(run: FunnelRun): void {
    this.run = run;
    run.onExit((unexpected) => {
      if (!unexpected || this.run !== run) return;
      this.run = null;
      pocketLog.warn('the Funnel child stopped unexpectedly');
      this.unexpectedlyDown();
    });
  }

  /**
   * The child, or the door process, went away unasked (SPEC §4.2.7). Nothing
   * restarts during a quit or with the door switched off; otherwise the sheet
   * says Tortie is trying again, and a restart is armed at the floor, doubling.
   */
  private unexpectedlyDown(): void {
    if (funnelShutdownStarted() || pocketShutdownStarted()) return;
    if (this.readStore()?.enabled !== true) return;
    this.setFunnel('restarting');
    this.armRestart();
  }

  private armRestart(): void {
    if (this.restartCancel !== null) return;
    const delay = nextRestartDelay(this.restartDelay);
    this.restartDelay = delay;
    const press = this.lastPress.press;
    this.restartCancel = armFunnelRestart(this.funnel, delay, () => {
      this.restartCancel = null;
      void this.serially(() => this.recoverNow(press));
    });
  }

  private cancelRestart(): void {
    this.restartCancel?.();
    this.restartCancel = null;
  }

  /**
   * THE RESTART, run only inside a door job, and only while the press that
   * armed it is still the last press (SPEC §4.2.7). The child is stopped first
   * and then the door process, and the start is the ordinary {@link openNow},
   * whose fresh read must return exactly the confirmed program, tailnet and
   * name. A MOVED FIELD NEVER RESTARTS: the gate reads `changed`, the door
   * stays closed and the sheet draws the new lines.
   */
  private async recoverNow(press: SwitchPress): Promise<void> {
    if (this.superseded(press) || this.readStore()?.enabled !== true) {
      if (this.funnelState === 'restarting') this.setFunnel('idle');
      return;
    }
    await this.unpublish();
    this.funnelState = 'restarting';
    this.opening += 1;
    let outcome: OpenOutcome = 'stopped';
    try {
      outcome = await this.openNow(press);
    } finally {
      this.opening -= 1;
    }
    if (outcome === 'retry' && !this.superseded(press) && !funnelShutdownStarted()) {
      this.setFunnel('restarting');
      this.armRestart();
    } else if (outcome !== 'published') {
      this.setFunnel('idle');
    }
    this.changed();
  }

  /**
   * On a wake, while the door is published: Tailscale must still publish it.
   * One check job, and it spawns only when the door is on.
   */
  private wakeCheck(): void {
    if (this.run === null || this.readStore()?.enabled !== true) return;
    const press = this.lastPress.press;
    void this.serially(async () => {
      if (this.superseded(press) || this.run === null) return;
      if (await this.stillPublished()) return;
      await this.recoverNow(press);
    });
  }

  /** Does Tailscale's own serve config still publish this door? */
  private async stillPublished(): Promise<boolean> {
    const run = this.run;
    if (run === null || !run.alive) return false;
    const program = funnelProgramOf(this.funnel.resolve());
    if (!program.ok) return false;
    const fields = this.fields();
    const served = await readServe(this.funnel, program.path);
    return (
      served !== undefined &&
      this.run === run &&
      run.alive &&
      servesThisDoor(served, {
        publicName: fields.publicName,
        publicPort: fields.publicPort,
        localPort: pocketDoorStatus().localPort
      })
    );
  }

  /**
   * May the door open right now? Only when the person has it switched on AND
   * the gate says its fields are the confirmed ones. A refusal is remembered
   * as the sheet's sentence. Nothing here starts anything.
   */
  private mayOpen(): boolean {
    if (this.readStore()?.enabled !== true) return false;
    try {
      assertPocketDoorMayBind(this.fields());
    } catch {
      // The gate's sentence is drawn from the gate itself (`status()`), so it
      // is not kept here: a kept copy would outlive the agreement it was about.
      pocketLog.warn('the phone door did not open: its details are not the confirmed ones');
      this.changed();
      return false;
    }
    return true;
  }

  /**
   * Stop publishing: the CHILD FIRST, so nothing on the internet reaches a
   * door that is going, then the door process. The window stays: a restart
   * serves the same key at the same name.
   */
  private async unpublish(): Promise<void> {
    const run = this.run;
    this.run = null;
    try {
      if (run !== null) await run.stop();
    } finally {
      await stopPocketDoor();
    }
  }

  /**
   * Stop answering. The nonce memory and the window go with it. It waits its
   * turn in the queue, so it never lands inside a start.
   */
  async stop(): Promise<void> {
    await this.serially(() => this.closeNow());
  }

  /** The stop itself, run only inside a door job. */
  private async closeNow(): Promise<void> {
    this.cancelRestart();
    this.restartDelay = 0;
    await this.unpublish();
    this.funnelState = 'idle';
    this.approvalUrl = null;
    this.verifier.clear();
    this.cancelWindow();
    this.changed();
  }

  /**
   * Close a published door whose current fields are no longer the confirmed
   * ones. Called after every press that moves a hashed field. A closed door
   * stays closed, and nothing here ever OPENS one. It waits its turn.
   */
  private closeUnlessConfirmed(): Promise<void> {
    return this.serially(() => this.closeNowUnlessConfirmed());
  }

  /** The same question, run only inside a door job. */
  private async closeNowUnlessConfirmed(): Promise<void> {
    if (!pocketDoorStatus().listening && this.run === null) return;
    if (pocketConfirmStatus(this.fields()).state === 'confirmed') return;
    await this.closeNow();
  }

  /**
   * The launch step (Phase 316), called once from `installMainCapabilities`.
   *
   * IT STARTS ONLY ON CONFIRMED FIELDS. Nothing happens unless the sealed store
   * says the person turned the door on (`enabled`) AND asked for it at launch
   * (`bindAtLaunch`); a person who never turned it on pays one read of a file
   * that is not there. Then the orphan sweep, whatever the gate says, and the
   * start's own order: the gate on the stored facts, the sessions, the sweep
   * again (no record reads nothing), the read, the gate again.
   */
  async openAtLaunch(): Promise<PocketLaunchOutcome> {
    const store = this.readStore();
    if (store === null || !store.enabled || !store.bindAtLaunch) return 'off';
    // THE ORPHAN FIRST, WHATEVER THE GATE SAYS (SPEC §4.13): a child a crashed
    // run left publishing is ended even when this launch will not open the
    // door, because nothing else would ever end it. With no record this reads
    // one missing file and runs nothing.
    await this.serially(async () => {
      if ((await sweepFunnelOrphan(this.funnel)) === 'still-running') this.orphanWouldNotEnd();
    });
    await this.start();
    if (this.published()) return 'opened';
    pocketLog.warn('the phone door stayed shut at launch');
    return 'refused';
  }

  private changed(): void {
    try {
      broadcastEvent(EVT_POCKET_CHANGED, this.status());
    } catch (err) {
      pocketLog.warn(
        `could not push the pocket status: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  // -------------------------------------------------------------------------
  // The pairing window's edge, told to the door process
  // -------------------------------------------------------------------------

  private cancelWindow(): void {
    this.pairing.cancel();
    if (this.windowTimer !== null) clearTimeout(this.windowTimer);
    this.windowTimer = null;
    if (pocketDoorStatus().listening) updatePocketDoor({ windowOpen: false });
  }

  /** At the deadline, the door process stops admitting a certificate-less socket. */
  private armWindowTimer(expiresAt: number): void {
    if (this.windowTimer !== null) clearTimeout(this.windowTimer);
    this.windowTimer = setTimeout(
      () => {
        this.windowTimer = null;
        if (this.pairing.windowOpen()) return;
        if (pocketDoorStatus().listening) updatePocketDoor({ windowOpen: false });
        this.changed();
      },
      Math.max(0, expiresAt - this.now()) + 50
    );
    this.windowTimer.unref?.();
  }

  // -------------------------------------------------------------------------
  // The person's presses
  // -------------------------------------------------------------------------

  /**
   * Turn the door on or off. The person's switch, and the first step of the
   * order in this module's header.
   *
   * ON writes `enabled` and `bindAtLaunch` together, minting the door's keys
   * on the way if this is the first time, and QUEUES the press's job: the
   * orphan sweep, one read of Tailscale, the public port chosen and written
   * (this press confirms its port), and then, only when these exact fields
   * were confirmed before, the start. It returns once the job is queued.
   *
   * OFF IS RECORDED BEFORE ITS FIRST AWAIT, counts itself as the last press —
   * which ends a start that is waiting on Tailscale's approval at once — and
   * then closes the door: the child first, then the door process.
   */
  async setDoor(input: PocketSwitchInput): Promise<PocketStatus> {
    const on = switchOf(input);
    if (!on) {
      this.pressed();
      let saved = true;
      try {
        const store = this.readStore();
        if (store !== null && (store.enabled || store.bindAtLaunch)) {
          saved = this.writeStore({ ...store, enabled: false, bindAtLaunch: false });
        }
      } catch {
        saved = false;
      }
      await this.serially(() => this.closeNow());
      if (!saved) {
        throw gmuxError(
          'INVALID_INPUT',
          'The door is closed, but Tortie could not save the switch, so it ' +
            'will ask again when Tortie next starts.'
        );
      }
      this.changed();
      return this.status();
    }
    if (pocketShutdownStarted() || funnelShutdownStarted()) {
      throw gmuxError('INVALID_INPUT', `${DOOR_SENTENCES.quitting} Nothing was changed.`);
    }
    this.identityNow();
    const store = this.readStore();
    if (store === null) {
      throw gmuxError(
        'INVALID_INPUT',
        'Tortie could not read what it saved about this door, so it turned ' +
          'nothing on. Nothing was changed.'
      );
    }
    if (!store.enabled || !store.bindAtLaunch) {
      if (!this.writeStore({ ...store, enabled: true, bindAtLaunch: true })) {
        throw gmuxError(
          'INVALID_INPUT',
          'Tortie could not save the switch, so the door stays off. Nothing ' +
            'was changed.'
        );
      }
    }
    // Counted only now: a press refused above changed nothing, so it
    // supersedes nothing either.
    const press = this.pressed();
    this.opening += 1;
    void this.serially(async () => {
      try {
        if (this.superseded(press)) return;
        if (this.published() && pocketConfirmStatus(this.fields()).state === 'confirmed') return;
        // A person's press replaces a restart that was waiting its turn.
        this.cancelRestart();
        if (!(await this.readAtPress(press))) return;
        if (this.superseded(press)) return;
        if (pocketConfirmStatus(this.fields()).state === 'confirmed') {
          const outcome = await this.openNow(press);
          if (outcome !== 'published') this.setFunnel('idle');
        } else {
          this.setFunnel('idle');
        }
      } finally {
        this.opening -= 1;
        this.changed();
      }
    });
    this.changed();
    return this.status();
  }

  /**
   * THE PRESS'S READ: the orphan sweep, Tailscale read once, and the public
   * port chosen — the stored one while it is free, else 8443, else 10000 — and
   * written, because this press confirms it. Never 443.
   */
  private async readAtPress(press: SwitchPress): Promise<boolean> {
    const read = await this.sweepAndRead();
    if (read === null || this.superseded(press)) {
      this.setFunnel('idle');
      return false;
    }
    const store = this.readStore();
    if (store === null) return false;
    const chosen = choosePublicPort(store.publicPort, portsHeld(read.serve), read.funnelPorts);
    if (!chosen.ok) {
      this.readRefusal = chosen.reason;
      pocketLog.warn(`no public port: ${chosen.reason}`);
      this.setFunnel('idle');
      return false;
    }
    if (chosen.port !== store.publicPort && !this.writeStore({ ...store, publicPort: chosen.port })) {
      this.startRefusal =
        'Tortie could not save the port it chose, so the door stays shut. Nothing was changed.';
      this.setFunnel('idle');
      return false;
    }
    this.startRefusal = null;
    return true;
  }

  /**
   * Open a pairing window and answer the QR. Refused unless the door is
   * published, and Tailscale's serve config is read back first (SPEC §4.3): a
   * code is never drawn for a door Tailscale stopped publishing. When it has,
   * the restart runs and the refusal says so.
   */
  async beginPairing(): Promise<PocketPairingOffer> {
    if (!pocketDoorStatus().listening || !this.published()) {
      throw gmuxError('INVALID_INPUT', NOT_PUBLISHED);
    }
    if (!(await this.stillPublished())) {
      if (this.run !== null) {
        const press = this.lastPress.press;
        this.setFunnel('restarting');
        void this.serially(() => this.recoverNow(press));
      }
      throw gmuxError('INVALID_INPUT', `${POCKET_FUNNEL_RESTARTING} No code was shown.`);
    }
    const offer = this.pairing.open();
    if (pocketDoorStatus().listening) updatePocketDoor({ windowOpen: true });
    this.armWindowTimer(offer.expiresAt);
    this.changed();
    return offer;
  }

  cancelPairing(): PocketPairingView {
    this.cancelWindow();
    this.changed();
    return this.pairing.view();
  }

  /**
   * The person allowed the phone in front of them, and this is the LAST step.
   *
   * The acknowledgement is supplied here and nowhere else.
   */
  allowPhone(input: PocketAllowInput): PocketAllowResult {
    const outcome = this.pairing.allow({
      acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT,
      linesRead: input.linesRead,
      hashRead: input.hashRead
    });
    // An allow that recorded the agreement and then could not save the phone
    // leaves the door's fields unconfirmed, and a published door closes.
    if (!outcome.allowed) void this.closeUnlessConfirmed();
    this.changed();
    return {
      allowed: outcome.allowed,
      refusal: outcome.refusal,
      status: this.status()
    };
  }

  /**
   * Confirm the door's fields as they stand — the lines the person read — and
   * queue the start. The second step of the order in this module's header.
   *
   * The record is written BEFORE anything is queued, so a caller that does not
   * wait reads `confirmed` straight after. THE ANSWER DOES NOT WAIT ON
   * TAILSCALE: the start's own read, the approval and the read-back follow
   * through `pocket:changed`.
   */
  async confirmDoor(input: PocketAllowInput): Promise<PocketAllowResult> {
    const fields = this.fields();
    // NO AGREEMENT TO LINES THAT NAME NOTHING (the fix round): before the read
    // lands they read `https://:0`, and after a failed read or port choice they
    // name what Tailscale just refused. Asked before the record, synchronously,
    // so nothing is written and nothing is queued.
    if (!this.confirmable(fields)) {
      this.changed();
      return { allowed: false, refusal: this.unconfirmableSentence(fields), status: this.status() };
    }
    const record = confirmPocketDoor(fields, {
      acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT,
      linesRead: input.linesRead,
      hashRead: input.hashRead
    });
    // `start` opens only a door the person has switched on.
    if (record !== null && this.readStore()?.enabled === true && !this.published()) {
      this.queueStart();
    }
    this.changed();
    return {
      allowed: record !== null,
      refusal:
        record === null
          ? 'Tortie could not record what you agreed to, so it confirmed ' +
            'nothing. Nothing was changed.'
          : null,
      status: this.status()
    };
  }

  /**
   * Drop one phone. The others stand.
   *
   * The phone leaves the store AND the confirmation is withdrawn with it, so
   * the door asks again before it answers anything. The door process is handed
   * the pins at once, so the removed phone's open sockets are cut before any
   * queued close runs, and its next handshake is refused before a byte of
   * HTTP. Its spent nonces are forgotten too.
   */
  async removePhone(phoneId: string): Promise<PocketStatus> {
    const store = this.readStore();
    if (store === null) return this.status();
    const kept = store.phones.filter((p) => p.id !== phoneId);
    if (kept.length === store.phones.length) return this.status();
    if (!this.writeStore({ ...store, phones: kept })) return this.status();
    this.postPins();
    this.addedAt.delete(phoneId);
    this.verifier.forget(phoneId);
    forgetPocketDoor();
    await this.closeUnlessConfirmed();
    this.changed();
    return this.status();
  }

  /** Withdraw the agreement. The door stops answering at once. */
  async forgetDoor(): Promise<PocketStatus> {
    forgetPocketDoor();
    await this.stop();
    return this.status();
  }

  /**
   * Open Tailscale's approval page, on a person's press. ONLY the URL the
   * start holds, and only after it is checked again: `https:` on exactly
   * `login.tailscale.com`, no port, no credentials. False when there is
   * nothing it will open.
   */
  async openApproval(): Promise<boolean> {
    const url = this.approvalUrl;
    if (this.funnelState !== 'approval' || url === null || !approvalOpens(url)) return false;
    await shell.openExternal(url);
    return true;
  }

  // -------------------------------------------------------------------------
  // The push (Phase 314)
  // -------------------------------------------------------------------------

  /**
   * Turn the alerts through Apple on or off.
   *
   * THE SWITCH IS A HASHED FIELD, so either direction moves the door's hash and
   * the door asks again; the confirm that follows is the person's, through
   * {@link confirmDoor}. Turning it OFF stops the push at once without waiting
   * for that confirm, because {@link pushDestinations} reads the switch first.
   */
  async setPushAlerts(on: boolean): Promise<PocketStatus> {
    let store: PocketStore | null;
    try {
      // A store to hold the switch, minted the way the pairing mints one. It
      // opens nothing and sends nothing.
      this.identityNow();
      store = this.readStore();
    } catch {
      store = null;
    }
    if (store === null || store.pushAlerts === on) return this.status();
    if (!this.writeStore({ ...store, pushAlerts: on })) return this.status();
    // A hashed field moved: a published door closes until the person confirms.
    // The store is written BEFORE this first await.
    await this.closeUnlessConfirmed();
    this.changed();
    return this.status();
  }

  /**
   * Where an alert may go RIGHT NOW, and it is usually nowhere.
   *
   * `[]` unless the switch is on AND the door's current fields are the ones a
   * person confirmed. It does not depend on the door being PUBLISHED: the push
   * reads the confirmed fields — the stored Tailscale facts when this run has
   * not read Tailscale — and never the socket.
   *
   * The answer carries the token and it is main's alone: it is never logged,
   * never broadcast and never in any answer to the renderer.
   */
  pushDestinations(): readonly PocketPushDestination[] {
    const store = this.readStore();
    if (store === null || !store.pushAlerts) return [];
    const fields = this.fields();
    if (pocketConfirmStatus(fields).state !== 'confirmed') return [];
    const dead = new Set(store.deadPushTokens);
    const out: PocketPushDestination[] = [];
    for (const phone of fields.phones) {
      if (phone.pushToken.length === 0 || phone.pushEnvironment === '') continue;
      const tokenDigest = pushTokenDigest(phone.pushToken);
      if (dead.has(tokenDigest)) continue;
      out.push({
        phoneId: phone.id,
        token: phone.pushToken,
        environment: phone.pushEnvironment,
        tokenDigest
      });
    }
    return out;
  }

  /**
   * Apple said this token is no longer good. Remember its digest so nothing is
   * ever sent to it again, across restarts, and change nothing else. THE HASH
   * DOES NOT MOVE, and a seal that cannot be written still drops it for this
   * run (Phase 314).
   */
  dropPushToken(tokenDigest: string): void {
    if (!isPushTokenDigest(tokenDigest)) return;
    const store = this.readStore();
    if (store === null || store.deadPushTokens.includes(tokenDigest)) return;
    const next: PocketStore = {
      ...store,
      deadPushTokens: [...store.deadPushTokens, tokenDigest].slice(-POCKET_DEAD_TOKEN_MEMORY)
    };
    writePocketStore(next);
    this.store = next;
    this.changed();
  }
}

/**
 * Register the sheet's channels.
 *
 * `handle` is THE typed invoke registrar and it already refuses any sender
 * Tortie did not create, so no check is repeated here.
 */
export function registerPocketIpc(ipc: IpcMain, host: PocketHost): void {
  handle(ipc, 'pocket:status', () => host.status());
  handle(ipc, 'pocket:setDoor', (_event, input) => host.setDoor(input));
  handle(ipc, 'pocket:setPushAlerts', (_event, input) =>
    host.setPushAlerts(switchOf(input))
  );
  handle(ipc, 'pocket:beginPairing', () => host.beginPairing());
  handle(ipc, 'pocket:cancelPairing', () => host.cancelPairing());
  handle(ipc, 'pocket:pairingState', () => host.pairing.view());
  handle(ipc, 'pocket:allowPhone', (_event, input) => host.allowPhone(input));
  handle(ipc, 'pocket:removePhone', (_event, phoneId) => host.removePhone(phoneId));
  handle(ipc, 'pocket:confirmDoor', (_event, input) => host.confirmDoor(input));
  handle(ipc, 'pocket:forgetDoor', () => host.forgetDoor());
  handle(ipc, 'pocket:openApproval', () => host.openApproval());
}
