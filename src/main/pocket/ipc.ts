/**
 * pocket:* — Settings then Phone, and the owner that holds the door together
 * (Phase 313).
 *
 * ## Two doors, and it matters which is which
 *
 * The channels here are the RENDERER's door: a person pressing a button in
 * Tortie, on this Mac, inside a window Tortie created. They never leave the
 * machine and `../typed-ipc.ts` already refuses any sender Tortie did not make.
 * Three of them CHANGE something — allow a phone, remove one, withdraw the
 * agreement — and that is not a contradiction of "this phase has no write
 * route": the TAILNET door's route table is read only and holds none of them.
 * A phone can never reach anything in this file.
 *
 * ## What this module assembles, and what it refuses to own
 *
 * Four modules, one lifetime. `./bind.ts` binds and presents the certificate;
 * `./server.ts` decides what a request may be; `./routes.ts` composes the three
 * answers; `./pairing.ts` decides whose request it is. This file is the only
 * place they meet, because the door cannot bind without the confirmed fields,
 * the fields are the store's phones, the phones arrive through the pairing
 * window, and the verifier answers from the same phone set — so splitting them
 * would be four readers of one truth.
 *
 * IT OWNS NO SOCKET AND NO KEY. The listener is `./bind.ts`'s and the
 * certificate is `./tls.ts`'s, reached only through it.
 *
 * ## The order of a pairing, and the last step is the person's
 *
 *   1. `pocket:beginPairing` opens a window of a few minutes and answers the
 *      QR. The one-shot secret in it lives in memory and dies with the window.
 *   2. The phone scans it and presents itself on `POST /pair`, sealed under a
 *      key derived from that secret. Presenting allows nothing.
 *   3. `pocket:pairingState` draws the phone's label and the short fingerprint
 *      BOTH screens show, and the lines the person is being asked to agree to.
 *   4. `pocket:allowPhone` is the person's press, and it is LAST. The
 *      acknowledgement sentence is supplied HERE, in main, by the handler the
 *      click reaches. It is never sent from the renderer and never read from a
 *      file, so it means "a person pressed the button in Tortie" and cannot
 *      mean anything else.
 *
 * ## Nothing here starts on a configuration change
 *
 * `start()` is reached from a person's switch and from the launch arm when
 * `bindAtLaunch` is a CONFIRMED field, which is CLAUDE.md refusal 8's own
 * shape: binding a listener a person confirmed is not a process starting
 * because a file moved. A settings write that nobody confirmed moves the hash
 * and the gate refuses the bind with a sentence.
 *
 * ## The order a person switches it on in (Phase 316)
 *
 *   turn on → confirm → listening → pair
 *
 * `pocket:setDoor` writes `enabled` and `bindAtLaunch` TOGETHER, which moves a
 * confirmed field, so the sheet draws the lines {@link PocketHost.status}
 * carries and nothing listens until `pocket:confirmDoor`, which records the
 * agreement and then opens the door. A pairing window opens only on a door
 * that is listening, because the QR pins the key it is listening with.
 *
 * AND THE DOOR LISTENS ONLY WHILE ITS CURRENT FIELDS ARE THE CONFIRMED ONES.
 * Every press here that moves a hashed field — removing a phone, flipping the
 * alerts — closes a listening door until the person confirms again, so the
 * door running now and the door a relaunch would open are always the same
 * door. What moves a field from OUTSIDE (Tailscale re-addressing this Mac) is
 * not watched, by `./bind.ts`'s own rule; a relaunch refuses it with the
 * gate's sentence.
 *
 * ## The switch handles ONE PRESS AT A TIME (Phase 316.1, his ruling of
 * ## 2026-09-23)
 *
 * Every start and every stop of the door runs through ONE serial queue this
 * owner holds ({@link PocketHost.serially}), so no start is ever inside
 * `./bind.ts` while a stop runs, and no stop while a start does. And the LAST
 * press of the switch decides: each `setDoor` counts itself as it arrives, a
 * start that is superseded before it binds does not bind (a start waiting on
 * the sessions stops waiting at once), and a door that bound under a
 * superseded start is closed before the next press runs. Before this, on, off,
 * on, off inside one turn left the store and the sheet saying off and a door
 * LISTENING: the second on waited inside `./bind.ts` for the first on's
 * socket to let go, the second off found no door to stop, and the second on
 * then bound. A paired phone read it.
 *
 * ## What this module does not do
 *
 * It reads no credential and names neither `main/credentials/` nor
 * `main/logins/`. It spawns nothing. It sets no status. It writes no tailnet
 * policy and holds no Tailscale credential, by refusal (research 128 §3.2).
 */

import { app, type IpcMain } from 'electron';

import {
  EVT_POCKET_CHANGED,
  POCKET_ROUTE_IDS,
  pocketGrantText,
  type PocketAllowInput,
  type PocketAllowResult,
  type PocketPairingInput,
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
  HARNESS_LOOPBACK_ENV,
  chooseTailnetAddress,
  pocketDoorStatus,
  pocketShutdownStarted,
  startPocketDoor,
  stopPocketDoor
} from './bind';
import {
  EMPTY_POCKET_FIELDS,
  POCKET_CONFIRM_ACKNOWLEDGEMENT,
  PocketPairing,
  PocketRequestVerifier,
  assertPocketDoorMayBind,
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
  type PocketStore
} from './pairing';
import {
  createPocketRoutes,
  pocketRouteIds,
  type PocketFacts,
  type PocketRoute
} from './routes';
import { createPocketHandler } from './server';

const pocketLog = getLog('pocket');

/** The port a phone is told, until a person chooses another and confirms it. */
export const POCKET_DEFAULT_PORT = 8823;

/**
 * The address the door's CONFIRMED FIELD names when the owner is not told one.
 *
 * Under the harness loopback override `./bind.ts` binds `127.0.0.1`, so the
 * field says the same, or the field a person confirmed and the address that
 * bound would be two different things and the door would refuse itself.
 * Otherwise it is exactly what `./bind.ts` binds: the tailnet address, or
 * `''` when this Mac has none. The override's two conditions — the variable,
 * and never in a packaged build — are `./bind.ts`'s own, spelled again here
 * because that module keeps its reader private.
 */
export function pocketFieldAddress(): string {
  if (process.env[HARNESS_LOOPBACK_ENV] === '1' && !packaged()) return '127.0.0.1';
  return chooseTailnetAddress()?.address ?? '';
}

function packaged(): boolean {
  try {
    return app.isPackaged;
  } catch {
    return false; // not an Electron run
  }
}

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
   * The address the door will bind, used for the CONFIRMED FIELD.
   *
   * It defaults to `chooseTailnetAddress()`, which is exactly what `./bind.ts`
   * asks `os.networkInterfaces()`. UNDER THE HARNESS LOOPBACK OVERRIDE
   * `./bind.ts` binds `127.0.0.1` instead, so a harness that sets that variable
   * must pass `() => '127.0.0.1'` here too, or the field a person confirmed and
   * the address that bound would be two different things.
   */
  bindAddress?: () => string;
  /**
   * Awaited after the gate and before the bind, every time the door opens —
   * from the launch step and from a person's press alike (Phase 316). The
   * composer passes the session core's boot, because every route reads the
   * core and a door must not answer before there is anything to answer from.
   * A throw keeps the door shut and says so.
   */
  beforeOpen?(): Promise<unknown>;
  now?(): number;
}

/** What the sheet says when the door could not open because the sessions were not up. */
const SESSIONS_NOT_READY =
  'Tortie could not start its sessions, so the door did not open.';

/**
 * What the sheet says when the address in the confirmed field is not the one
 * `./bind.ts` would bind. Only a composition that overrides `bindAddress`
 * without the matching bind can reach it; see {@link PocketHost.start}.
 */
const ADDRESS_NOT_BOUND =
  'This door was confirmed for another address than the one it would answer on, so it did not open.';

/**
 * One press of the door's switch, as a start remembers it (Phase 316.1).
 *
 * `n` is its place in the order the presses arrived in. `superseded` settles
 * the moment a LATER press arrives, so a start waiting on the sessions for a
 * press that is no longer the last one stops waiting at once, rather than
 * holding every press queued behind it for as long as the sessions take.
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

/**
 * The owner: the store, the pairing window, the verifier and the handler.
 */
export class PocketHost {
  private store: PocketStore | null = null;
  private identity: PocketIdentity | null = null;
  private lastRefusal: string | null = null;
  private readonly addedAt = new Map<string, number>();
  /**
   * The LAST press of the switch (Phase 316.1). Every `setDoor` that changes
   * anything replaces it, synchronously, before its first await — even an off
   * that could not be saved — so a start of an earlier press can tell it is no
   * longer the one that decides.
   */
  private lastPress = pressNumbered(0);
  /**
   * THE SWITCH'S ONE QUEUE (Phase 316.1). The tail of every door job so far.
   * It never rejects, so a job that failed cannot stop the next press.
   */
  private doorJobs: Promise<void> = Promise.resolve();

  readonly pairing: PocketPairing;
  readonly verifier: PocketRequestVerifier;
  /** The request handler `./bind.ts` is started with. */
  readonly handler: ReturnType<typeof createPocketHandler>;

  constructor(private readonly deps: PocketHostDeps) {
    this.pairing = new PocketPairing({
      identity: () => this.identityNow(),
      fieldsNow: () => this.fields(),
      savePhones: (phones) => this.savePhones(phones),
      // THE PUBLIC KEY, NOT THE CERTIFICATE (QR v:2). And null unless the door
      // is listening, which is what makes the window refuse to open on a door
      // with nothing to pin.
      publicKeyPin: () => {
        const door = pocketDoorStatus();
        return door.listening ? spkiPinOf(door.publicKeyFingerprint) : null;
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
      boundAddress: () => pocketDoorStatus().address,
      boundPort: () => pocketDoorStatus().port,
      shuttingDown: () => pocketShutdownStarted(),
      pairingWindowOpen: () => this.pairing.windowOpen(),
      present: (body, from) => this.pairing.present(body, from),
      verify: (input) => {
        const verdict = this.verifier.verify(input);
        return verdict.ok
          ? { ok: true, phoneId: verdict.phone.id }
          : { ok: false, reason: verdict.reason };
      },
      // Asked again after the answer is composed and before it is sent (the
      // Phase 316.1 fix round): `removePhone` writes the store BEFORE its first
      // await, so a phone removed while its request was in flight is refused
      // `unpaired` here rather than answered from the store as it stood after
      // the press. A store that cannot be read answers no, which refuses.
      stillPaired: (phoneId) =>
        this.readStore()?.phones.some((p) => p.id === phoneId) === true,
      answer: async (route: PocketRoute, query) => {
        // The closed table, answered. There is no default arm: a route id this
        // switch does not name cannot exist, because `POCKET_ROUTES` is the
        // only producer of the type, so a route added there without an arm
        // here is a compile error rather than a route that answers nothing.
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
      this.identity = openIdentity(read.store.identity);
      for (const phone of read.store.phones) {
        if (!this.addedAt.has(phone.id)) this.addedAt.set(phone.id, 0);
      }
    }
    return this.store;
  }

  /**
   * The identity, minted on first use and sealed at once.
   *
   * Minting it starts nothing: no socket opens, nothing is sent and nothing
   * outside this Mac can be reached by it. The door still refuses to bind until
   * a person has confirmed it.
   */
  private identityNow(): PocketIdentity {
    const store = this.readStore();
    if (store !== null && this.identity !== null) return this.identity;
    const minted = newIdentity();
    const next: PocketStore = {
      identity: minted.sealed,
      phones: store?.phones ?? [],
      port: store?.port ?? POCKET_DEFAULT_PORT,
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
    const next: PocketStore = { ...store, phones: [...phones] };
    if (!writePocketStore(next)) return false;
    this.store = next;
    const now = this.deps.now?.() ?? Date.now();
    for (const phone of phones) {
      if (!this.addedAt.has(phone.id)) this.addedAt.set(phone.id, now);
    }
    return true;
  }

  private bindAddress(): string {
    if (this.deps.bindAddress !== undefined) return this.deps.bindAddress();
    return pocketFieldAddress();
  }

  /** The door's execution bearing fields, as they are right now. */
  fields(): PocketExecutionFields {
    const store = this.readStore();
    return {
      bindAddress: this.bindAddress(),
      port: store?.port ?? POCKET_DEFAULT_PORT,
      bindAtLaunch: store?.bindAtLaunch ?? false,
      routes: pocketRouteIds(),
      phones: store?.phones ?? EMPTY_POCKET_FIELDS.phones,
      pushAlerts: store?.pushAlerts ?? EMPTY_POCKET_FIELDS.pushAlerts
    };
  }

  // -------------------------------------------------------------------------
  // What the sheet draws
  // -------------------------------------------------------------------------

  status(): PocketStatus {
    const fields = this.fields();
    const gate = pocketConfirmStatus(fields);
    const door = pocketDoorStatus();
    const store = this.readStore();
    const address = fields.bindAddress.length === 0 ? null : fields.bindAddress;
    const state: PocketStatus['state'] =
      store?.enabled !== true
        ? 'off'
        : address === null
          ? 'no-address'
          : door.listening
            ? 'listening'
            : 'refused';
    return {
      state,
      address,
      port: fields.port,
      bindAtLaunch: fields.bindAtLaunch,
      certificateFingerprint: door.certificateFingerprint,
      refusal:
        state === 'listening'
          ? null
          : (gate.refusal ?? this.lastRefusal ?? door.sentence),
      phones: fields.phones.map((p) =>
        phoneView(p, this.addedAt.get(p.id) ?? 0, new Set(store?.deadPushTokens ?? []))
      ),
      confirmState: gate.state,
      confirmLines: gate.lines,
      confirmHash: gate.hash,
      routes: POCKET_ROUTE_IDS,
      pushAlerts: fields.pushAlerts,
      grant: address === null ? null : pocketGrantText(address, fields.port)
    };
  }

  /** The text a person pastes into their OWN Tailscale admin console. */
  grantText(): string {
    const fields = this.fields();
    return pocketGrantText(fields.bindAddress, fields.port);
  }

  // -------------------------------------------------------------------------
  // Binding
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // The switch's one queue (Phase 316.1, his ruling of 2026-09-23)
  // -------------------------------------------------------------------------

  /**
   * Run one door job after every door job before it has settled.
   *
   * THIS IS THE ONLY WAY THE DOOR IS STARTED OR STOPPED. {@link openNow} and
   * {@link closeNow} are reached from inside a job and nowhere else, so a start
   * is never inside `./bind.ts` while a stop runs, and a stop never finds the
   * module between two doors. A job that rejects rejects its own caller and
   * never the queue.
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
    await this.serially(() => this.openNow(press));
  }

  /**
   * The start itself, run only inside a door job.
   *
   * THE GATE IS ASKED FIRST, before `./bind.ts` is reached at all, so a door
   * nobody confirmed never gets as far as a socket. AND THE PRESS IS ASKED
   * BESIDE IT: a start whose press is no longer the last one binds nothing.
   */
  private async openNow(press: SwitchPress): Promise<void> {
    if (this.superseded(press)) return;
    if (!this.mayOpen()) return;
    if (this.deps.beforeOpen !== undefined) {
      try {
        // A LATER PRESS ENDS THE WAIT. The sessions keep coming up on their
        // own; this start stops waiting for them, so the press behind it in the
        // queue is not held for as long as they take.
        await Promise.race([this.deps.beforeOpen(), press.superseded]);
      } catch {
        if (this.superseded(press)) return;
        this.lastRefusal = SESSIONS_NOT_READY;
        pocketLog.warn('the tailnet door did not open: the sessions were not ready');
        this.changed();
        return;
      }
      // ASKED AGAIN AFTER THE AWAIT. The person may have switched the door off,
      // or a field may have moved, while the sessions were coming up, and a
      // bind on the answer from before the await would open a door nobody has
      // on now.
      if (this.superseded(press)) return;
      if (!this.mayOpen()) return;
    }
    const fields = this.fields();
    // THE FIELD AND THE BIND ARE ONE ADDRESS, OR NOTHING BINDS. `./bind.ts`
    // chooses its own address and is not told the field's, so an owner built
    // with a `bindAddress` override (the harness seams pass `127.0.0.1`)
    // without the loopback override that makes `./bind.ts` agree would confirm
    // loopback and then bind this Mac's REAL tailnet interface. Asked here,
    // before the socket, of the same chooser `./bind.ts` asks.
    if (fields.bindAddress !== pocketFieldAddress()) {
      this.lastRefusal = ADDRESS_NOT_BOUND;
      pocketLog.warn('the tailnet door did not open: its confirmed address is not the one it would bind');
      this.changed();
      return;
    }
    // THE LAST PRESS, ASKED ONE LAST TIME, with nothing awaited between this
    // and the bind. A press that arrived while this start waited has already
    // said what the door is; this start says nothing.
    if (this.superseded(press)) return;
    const result = await startPocketDoor({
      port: fields.port,
      handle: this.handler
    });
    // A PRESS ARRIVED WHILE THE SOCKET WAS OPENING. The door that opened under
    // it is closed here, inside this job, so it is closed before the next
    // press runs; and a refusal the listen answered is not the person's.
    if (this.superseded(press)) {
      if (result.ok) await this.closeNow();
      else this.changed();
      return;
    }
    this.lastRefusal = result.ok ? null : result.sentence;
    if (!result.ok) {
      pocketLog.warn(`the tailnet door did not open: ${result.reason}`);
    }
    // A press that withdrew the agreement while the socket was opening (a
    // Remove, the alerts flipped) found nothing listening to close, so the
    // door that just opened is asked again, by the same rule every such press
    // uses, and closes until the person confirms.
    if (result.ok) await this.closeNowUnlessConfirmed();
    this.changed();
  }

  /**
   * May the door open right now? Only when the person has it switched on AND
   * the gate says its fields are the confirmed ones. A refusal is remembered
   * as the sheet's sentence. Nothing here binds.
   */
  private mayOpen(): boolean {
    if (this.readStore()?.enabled !== true) return false;
    try {
      assertPocketDoorMayBind(this.fields());
    } catch (err) {
      this.lastRefusal = err instanceof Error ? sentenceOf(err) : String(err);
      this.changed();
      return false;
    }
    return true;
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
    await stopPocketDoor();
    this.verifier.clear();
    this.pairing.cancel();
    this.changed();
  }

  /**
   * Close a listening door whose current fields are no longer the confirmed
   * ones. Called after every press that moves a hashed field, so the door that
   * is answering is always a door a person agreed to. A closed door stays
   * closed, and nothing here ever OPENS one. It waits its turn in the queue.
   */
  private closeUnlessConfirmed(): Promise<void> {
    return this.serially(() => this.closeNowUnlessConfirmed());
  }

  /** The same question, run only inside a door job. */
  private async closeNowUnlessConfirmed(): Promise<void> {
    if (!pocketDoorStatus().listening) return;
    if (pocketConfirmStatus(this.fields()).state === 'confirmed') return;
    await this.closeNow();
  }

  /**
   * The launch step (Phase 316), called once from `installMainCapabilities`.
   *
   * IT BINDS ONLY ON CONFIRMED FIELDS. Nothing happens unless the sealed store
   * says the person turned the door on (`enabled`) AND asked for it at launch
   * (`bindAtLaunch`), and even then the door opens only when the fields as they
   * stand now hash to the agreement on record. A store written by anything but
   * the sheet — `bindAtLaunch: true` with no confirm — moves the hash, so the
   * door stays shut and the sheet says why in the gate's own sentence.
   *
   * The owner's `beforeOpen` (the session core's boot) is awaited only when
   * the door is going to open, so a person who never turned it on pays one
   * read of a file that is not there.
   */
  async openAtLaunch(): Promise<PocketLaunchOutcome> {
    const store = this.readStore();
    if (store === null || !store.enabled || !store.bindAtLaunch) return 'off';
    const gate = pocketConfirmStatus(this.fields());
    if (gate.state !== 'confirmed') {
      this.lastRefusal = gate.refusal;
      pocketLog.warn(`the tailnet door stayed shut at launch: its details are ${gate.state}`);
      this.changed();
      return 'refused';
    }
    await this.start();
    return pocketDoorStatus().listening ? 'opened' : 'refused';
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
  // The person's presses
  // -------------------------------------------------------------------------

  /**
   * Turn the door on or off. The person's switch, and the first step of the
   * order in this module's header.
   *
   * ON writes `enabled` and `bindAtLaunch` together, minting the door's keys on
   * the way if this is the first time. That moves a confirmed field, so the
   * answer draws the confirm lines and nothing listens until the person
   * confirms them — unless these exact fields were confirmed before (the door
   * was on, then off, and nothing else moved), in which case the person's
   * switch opens the agreed door at once. During a quit it refuses and writes
   * nothing, so the next launch does not open a door this press never saw
   * open.
   *
   * OFF IS RECORDED BEFORE ITS FIRST AWAIT, and then it stops the door (the
   * Phase 316.1 fix round). It used to stop first and write after, and a
   * switch-on already waiting on the sessions re-read the switch inside that
   * stop, found it still on, and bound a door the sheet then called off. So the
   * off counts itself as the last press and writes both fields false with
   * nothing awaited, and a start in flight reads either and binds nothing. The
   * stop still happens when the write cannot: stopping is the part that
   * narrows what anybody can reach, so the refusal is said only after it.
   *
   * ONE PRESS AT A TIME (his ruling of 2026-09-23). Both halves reach the door
   * only through {@link serially}, and each counts itself with
   * {@link pressed} before its first await, so the last press decides what the
   * door is however the presses interleave.
   */
  async setDoor(input: PocketSwitchInput): Promise<PocketStatus> {
    const on = switchOf(input);
    if (!on) {
      this.pressed();
      let saved = true;
      try {
        const store = this.readStore();
        if (store !== null && (store.enabled || store.bindAtLaunch)) {
          const next: PocketStore = { ...store, enabled: false, bindAtLaunch: false };
          saved = writePocketStore(next);
          if (saved) this.store = next;
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
    if (pocketShutdownStarted()) {
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
      const next: PocketStore = { ...store, enabled: true, bindAtLaunch: true };
      if (!writePocketStore(next)) {
        throw gmuxError(
          'INVALID_INPUT',
          'Tortie could not save the switch, so the door stays off. Nothing ' +
            'was changed.'
        );
      }
      this.store = next;
    }
    // Counted only now: a press refused above changed nothing, so it
    // supersedes nothing either.
    const press = this.pressed();
    await this.serially(async () => {
      if (pocketConfirmStatus(this.fields()).state === 'confirmed') {
        await this.openNow(press);
      } else {
        this.changed();
      }
    });
    return this.status();
  }

  /**
   * Open a pairing window and answer the QR. Refused unless the door is
   * listening, so the QR always carries a key to pin, and refused for a
   * tailnet key that is not one — each with a sentence that never repeats it.
   */
  beginPairing(input: PocketPairingInput): PocketPairingOffer {
    const offer = this.pairing.open(input);
    this.changed();
    return offer;
  }

  cancelPairing(): PocketPairingView {
    this.pairing.cancel();
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
    // leaves the door's fields unconfirmed, and a listening door closes.
    if (!outcome.allowed) void this.closeUnlessConfirmed();
    this.changed();
    return {
      allowed: outcome.allowed,
      refusal: outcome.refusal,
      status: this.status()
    };
  }

  /**
   * Confirm the door's fields as they stand, and then open it if the person
   * has it switched on. The second step of the order in this module's header.
   *
   * The record is written BEFORE the first await, so a caller that does not
   * wait for the door still reads `confirmed` straight after.
   */
  async confirmDoor(input: PocketAllowInput): Promise<PocketAllowResult> {
    const record = confirmPocketDoor(this.fields(), {
      acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT,
      linesRead: input.linesRead,
      hashRead: input.hashRead
    });
    // `start` opens only a door the person has switched on.
    if (record !== null) await this.start();
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
   * the door asks again before it answers anything: a removed phone is not a
   * phone whose approval is still on record. Its spent nonces are forgotten
   * too, because they are about a pairing that no longer exists.
   */
  async removePhone(phoneId: string): Promise<PocketStatus> {
    const store = this.readStore();
    if (store === null) return this.status();
    const kept = store.phones.filter((p) => p.id !== phoneId);
    if (kept.length === store.phones.length) return this.status();
    if (!writePocketStore({ ...store, phones: kept })) return this.status();
    this.store = { ...store, phones: kept };
    this.addedAt.delete(phoneId);
    this.verifier.forget(phoneId);
    forgetPocketDoor();
    // The agreement is withdrawn, so a listening door closes until the person
    // confirms again. The removed phone is refused `unpaired` from the write
    // above, whatever it sends next — AND a request of its that was already in
    // flight is refused at the handler's last check, after its answer was
    // composed and before a byte left (the Phase 316.1 fix round), rather than
    // answered inside the stop's join.
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

  // -------------------------------------------------------------------------
  // The push (Phase 314)
  // -------------------------------------------------------------------------

  /**
   * Turn the alerts through Apple on or off.
   *
   * THE SWITCH IS A HASHED FIELD, so either direction moves the door's hash and
   * the door asks again, exactly as any other field does under this module's
   * rule; the confirm that follows is the person's, through
   * {@link confirmDoor}. Turning it OFF stops the push at once without waiting
   * for that confirm, because {@link pushDestinations} reads the switch before
   * anything else.
   *
   * Phase 314 reached it from the harness seam and the tests alone. Since
   * Phase 316 a person reaches it from Settings then Phone, through
   * `pocket:setPushAlerts`.
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
    const next: PocketStore = { ...store, pushAlerts: on };
    if (!writePocketStore(next)) return this.status();
    this.store = next;
    // A hashed field moved (Phase 316): a listening door closes until the
    // person confirms, like every other such press. The store is written
    // BEFORE this first await, so a caller that does not wait reads the
    // switch at once.
    await this.closeUnlessConfirmed();
    this.changed();
    return this.status();
  }

  /**
   * Where an alert may go RIGHT NOW, and it is usually nowhere.
   *
   * `[]` unless the switch is on AND the door's current fields are the ones a
   * person confirmed, so a phone added, removed or re-tokened since the last
   * confirm stops every push until he confirms again. A phone with no token,
   * and a token Apple said is dead, are left out. It does not depend on the
   * door LISTENING: the push reads the confirmed fields, never the socket.
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
   * ever sent to it again, across restarts, and change nothing else.
   *
   * THE HASH DOES NOT MOVE. The dead list is not a hashed field: dropping a
   * destination only narrows where a person's words go, which needs no human,
   * and moving the hash here would switch the door off on every 410. Pairing
   * the phone again with a NEW token is a new digest and is live; with the SAME
   * token it stays dead.
   *
   * A SEAL THAT CANNOT BE WRITTEN STILL DROPS IT FOR THIS RUN (the fix round).
   * Every other change here is written before it is believed, because it WIDENS
   * where his words go and needs the confirm the write carries. This one only
   * narrows, so the host believes it even when the sealed write failed: the
   * token stops being answered now, and the next write that succeeds carries
   * the dead list with it. Only a restart before that write forgets it.
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

/** The sentence inside a structured main error, or the plain message. */
function sentenceOf(err: Error): string {
  try {
    const payload = JSON.parse(err.message) as { message?: unknown };
    if (typeof payload.message === 'string') return payload.message;
  } catch {
    // Not a structured error. Its own message is the sentence.
  }
  return err.message;
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
  handle(ipc, 'pocket:beginPairing', (_event, input) => host.beginPairing(input));
  handle(ipc, 'pocket:cancelPairing', () => host.cancelPairing());
  handle(ipc, 'pocket:pairingState', () => host.pairing.view());
  handle(ipc, 'pocket:allowPhone', (_event, input) => host.allowPhone(input));
  handle(ipc, 'pocket:removePhone', (_event, phoneId) => host.removePhone(phoneId));
  handle(ipc, 'pocket:confirmDoor', (_event, input) => host.confirmDoor(input));
  handle(ipc, 'pocket:forgetDoor', () => host.forgetDoor());
}
