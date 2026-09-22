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
 * ## What this module does not do
 *
 * It reads no credential and names neither `main/credentials/` nor
 * `main/logins/`. It spawns nothing. It sets no status. It writes no tailnet
 * policy and holds no Tailscale credential, by refusal (research 128 §3.2).
 */

import { type IpcMain } from 'electron';

import {
  EVT_POCKET_CHANGED,
  POCKET_ROUTE_IDS,
  pocketGrantText,
  type PocketAllowInput,
  type PocketAllowResult,
  type PocketPairingOffer,
  type PocketPairingView,
  type PocketStatus
} from '@shared/ipc/pocket';
import { broadcastEvent } from '../typed-events';
import { gmuxError } from '../errors';
import { getLog } from '../log';
import { handle } from '../typed-ipc';
import {
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
  readPocketStore,
  writePocketStore,
  type PocketExecutionFields,
  type PocketIdentity,
  type PocketPhoneFields,
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
  now?(): number;
}

/**
 * The owner: the store, the pairing window, the verifier and the handler.
 */
export class PocketHost {
  private store: PocketStore | null = null;
  private identity: PocketIdentity | null = null;
  private lastRefusal: string | null = null;
  private readonly addedAt = new Map<string, number>();

  readonly pairing: PocketPairing;
  readonly verifier: PocketRequestVerifier;
  /** The request handler `./bind.ts` is started with. */
  readonly handler: ReturnType<typeof createPocketHandler>;

  constructor(private readonly deps: PocketHostDeps) {
    this.pairing = new PocketPairing({
      identity: () => this.identityNow(),
      fieldsNow: () => this.fields(),
      savePhones: (phones) => this.savePhones(phones),
      certificateFingerprint: () => pocketDoorStatus().certificateFingerprint,
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
        return verdict.ok ? { ok: true } : { ok: false, reason: verdict.reason };
      },
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
      enabled: store?.enabled ?? false
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
    return chooseTailnetAddress()?.address ?? '';
  }

  /** The door's execution bearing fields, as they are right now. */
  fields(): PocketExecutionFields {
    const store = this.readStore();
    return {
      bindAddress: this.bindAddress(),
      port: store?.port ?? POCKET_DEFAULT_PORT,
      bindAtLaunch: store?.bindAtLaunch ?? false,
      routes: pocketRouteIds(),
      phones: store?.phones ?? EMPTY_POCKET_FIELDS.phones
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
      phones: fields.phones.map((p) => phoneView(p, this.addedAt.get(p.id) ?? 0)),
      confirmState: gate.state,
      routes: POCKET_ROUTE_IDS
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

  /**
   * Open the door, or remember the sentence that says why not.
   *
   * THE GATE IS ASKED FIRST, before `./bind.ts` is reached at all, so a door
   * nobody confirmed never gets as far as a socket.
   */
  async start(): Promise<void> {
    const fields = this.fields();
    try {
      assertPocketDoorMayBind(fields);
    } catch (err) {
      this.lastRefusal = err instanceof Error ? sentenceOf(err) : String(err);
      this.changed();
      return;
    }
    const result = await startPocketDoor({
      port: fields.port,
      handle: this.handler
    });
    this.lastRefusal = result.ok ? null : result.sentence;
    if (!result.ok) {
      pocketLog.warn(`the tailnet door did not open: ${result.reason}`);
    }
    this.changed();
  }

  /** Stop answering. The nonce memory and the window go with it. */
  async stop(): Promise<void> {
    await stopPocketDoor();
    this.verifier.clear();
    this.pairing.cancel();
    this.changed();
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

  beginPairing(): PocketPairingOffer {
    const offer = this.pairing.open();
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
    this.changed();
    return {
      allowed: outcome.allowed,
      refusal: outcome.refusal,
      status: this.status()
    };
  }

  /** Re-confirm the door's fields after one of them moved. */
  confirmDoor(input: PocketAllowInput): PocketAllowResult {
    const record = confirmPocketDoor(this.fields(), {
      acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT,
      linesRead: input.linesRead,
      hashRead: input.hashRead
    });
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
  removePhone(phoneId: string): PocketStatus {
    const store = this.readStore();
    if (store === null) return this.status();
    const kept = store.phones.filter((p) => p.id !== phoneId);
    if (kept.length === store.phones.length) return this.status();
    if (!writePocketStore({ ...store, phones: kept })) return this.status();
    this.store = { ...store, phones: kept };
    this.addedAt.delete(phoneId);
    this.verifier.forget(phoneId);
    forgetPocketDoor();
    this.changed();
    return this.status();
  }

  /** Withdraw the agreement. The door stops answering at once. */
  async forgetDoor(): Promise<PocketStatus> {
    forgetPocketDoor();
    await this.stop();
    return this.status();
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
  handle(ipc, 'pocket:beginPairing', () => host.beginPairing());
  handle(ipc, 'pocket:cancelPairing', () => host.cancelPairing());
  handle(ipc, 'pocket:pairingState', () => host.pairing.view());
  handle(ipc, 'pocket:allowPhone', (_event, input) => host.allowPhone(input));
  handle(ipc, 'pocket:removePhone', (_event, phoneId) => host.removePhone(phoneId));
  handle(ipc, 'pocket:confirmDoor', (_event, input) => host.confirmDoor(input));
  handle(ipc, 'pocket:forgetDoor', () => host.forgetDoor());
}
