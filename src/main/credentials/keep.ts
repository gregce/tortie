/**
 * The whole of what Phase 204 does, in three verbs (Phase 204).
 *
 * ## THE THREE VERBS
 *
 *  - OBSERVE. Read every store of one provider, and when what a store holds
 *    has changed, keep the new credential in that store's own slot. When the
 *    ACCOUNT changed rather than just the token, the account that was there is
 *    PROMOTED into a login of Tortie's own first, named from its address, so
 *    the account the person just left is still on the menu. This is the whole
 *    of what the operator asked for on 2026-09-02: `/login` inside a session
 *    is remembered, whether the store belongs to Tortie or is his own.
 *  - ACTIVATE. Choosing a login puts its kept account back into the store that
 *    login runs under, when that store does not already hold it.
 *  - FORGET. Removing a login drops its slot and its record.
 *
 * ## WHAT NEVER HAPPENS, and these are the phase's own refusals
 *
 *  - NOTHING SIGNS ANYBODY IN. The vendor's own command is still the only
 *    thing that authenticates, in one ordinary session the person starts.
 *  - THE PERSON'S OWN DEFAULT STORE IS NEVER WRITTEN. `../credentials/
 *    stores.ts` refuses it by name, so choosing the default login moves no
 *    bytes at all and the default row goes on meaning the vendor's own
 *    location holding whichever account is in it now.
 *  - NOTHING IS COMPOSED, EDITED OR RE-ENCODED. A credential is moved whole
 *    and compared by digest on both sides of every move.
 *  - NOTHING WRITES A VENDOR STORE DURING A TURN. Observe writes only Tortie's
 *    own store, so it can never log a running session out; activate writes a
 *    vendor store and REFUSES while a session is running under it, and it runs
 *    on an explicit choice and on nothing else. There is no timer in this file.
 *  - NO TOKEN BYTE LEAVES TORTIE'S OWN STORE. Nothing here returns a payload,
 *    logs one, puts one in an error message or hands one to a renderer. The
 *    answers are names, addresses and booleans.
 *
 * ## THE ORDER INSIDE A SWITCH, and it is what makes a switch reversible
 *
 * Activate observes FIRST. So whatever is in the store about to be written has
 * already been captured, and if it was a different account it already has a
 * login of its own. Only then is the kept credential written in. That is why
 * every ordered pair of accounts can be switched and switched back with
 * neither of them lost.
 */

import type { LoginProviderId } from '@shared/logins';
import {
  DEFAULT_LOGIN_NAME,
  loginNameFromEmail,
  nextKeptLoginName,
  sameLoginName
} from '@shared/logins';
import { loginDirIn, loginDirOnDisk } from '../logins/dirs';
import { addLogin, readLoginsFile, type StoredLogin } from '../logins/store';
import { credentialDigest } from './payload';
import { readKeptFile, writeKeptFile, type KeptRecord } from './kept';
import { readSettledStore, storeTarget, type StoreDeps } from './stores';
import { safeSwap, type SwapStep } from './swap';
import { slotFor, vaultDel, vaultGet, vaultPut, type VaultBackend } from './vault';

/** One running session, as this domain needs to see it. */
export interface LiveSession {
  provider: LoginProviderId;
  /** The login NAME the session launched under, or null for the default. */
  login: string | null;
}

/** The seams. The gate hands in all four and touches no keychain and no home. */
export interface KeepDeps {
  /** The logins root, being `<userData>/gmux/logins`. */
  root: string;
  vault: VaultBackend;
  stores: StoreDeps;
  /**
   * Which logins have a session running under them right now.
   *
   * It is asked ONLY by {@link activateLogin}, because a write into a store a
   * session is using is the one write that could sign a running agent out. An
   * answer that throws is read as "no sessions", which is the shape every
   * other seam in this tree takes, and the refusal that matters is still made
   * by the person's own choice rather than by this list.
   */
  liveSessions(): Promise<LiveSession[]>;
  now(): number;
}

/** What one login's row needs from this domain. Booleans and an address. */
export interface KeptFacts {
  kept: boolean;
  restores: boolean;
  /** The address Tortie recorded for this slot, when the vendor names none. */
  email: string | null;
}

export const NO_KEPT_FACTS: KeptFacts = {
  kept: false,
  restores: false,
  email: null
};

/** What an observe did, in words a person could read. Never a payload. */
export interface KeepEvent {
  kind: 'kept' | 'promoted' | 'refused';
  provider: LoginProviderId;
  /** The login the event is about, by NAME. */
  login: string;
  /** One sentence. It names no path, no digest and no token. */
  says: string;
}

function slotOf(provider: LoginProviderId, id: string | null): string {
  return slotFor(provider, id);
}

function takenNames(rows: readonly StoredLogin[], provider: LoginProviderId): string[] {
  return rows.filter((r) => r.provider === provider).map((r) => r.name);
}

/**
 * Every store of one provider, being the vendor's own location and every
 * login Tortie made whose folder is really there.
 */
function storesOf(
  root: string,
  provider: LoginProviderId
): { id: string | null; dir: string | null; name: string }[] {
  const { file } = readLoginsFile(root);
  const out: { id: string | null; dir: string | null; name: string }[] = [
    { id: null, dir: null, name: DEFAULT_LOGIN_NAME }
  ];
  for (const row of file.logins) {
    if (row.provider !== provider) continue;
    const dir = loginDirIn(root, provider, row.id);
    if (loginDirOnDisk(root, provider, dir) !== 'ok') continue;
    out.push({ id: row.id, dir, name: row.name });
  }
  return out;
}

/** What one observe learned: what it did, and what every row should draw. */
export interface Observation {
  events: KeepEvent[];
  /**
   * One row's facts, keyed by login id, with the empty string standing for the
   * person's own default location.
   *
   * IT IS ANSWERED HERE rather than by a second pass, because the observe has
   * just read every store and a second read would double the cost of drawing
   * the meter's card and could disagree with what was captured a moment ago.
   */
  facts: Map<string, KeptFacts>;
}

/**
 * Read every store of one provider and keep what has changed.
 *
 * IT WRITES NOTHING A VENDOR OWNS. Everything below writes Tortie's own store
 * and Tortie's own record file, and creates an empty directory for a promoted
 * login. A session running anywhere cannot be affected by any of it.
 */
export async function observeProvider(
  d: KeepDeps,
  provider: LoginProviderId
): Promise<Observation> {
  const events: KeepEvent[] = [];
  const facts = new Map<string, KeptFacts>();
  const { file: kept } = readKeptFile(d.root);
  let moved = false;
  for (const store of storesOf(d.root, provider)) {
    const slot = slotOf(provider, store.id);
    const key = store.id ?? '';
    const before: KeptRecord | undefined = kept.slots[slot];
    const reading = await readSettledStore(d.stores, provider, store.dir);
    // A STORE CAUGHT MID CHANGE IS NOT CAPTURED THIS TIME. The next surface
    // that asks reads it again, and nothing has been lost, because the bytes
    // that were there are still in the slot they were captured into.
    if (reading === null) {
      facts.set(key, await factsFromSlot(d, provider, store.id, null));
      continue;
    }
    if (reading.payload === null) {
      // A STORE WITH NOTHING IN IT DOES NOT CLEAR THE COPY. An account that
      // was signed out of is exactly the account this phase offers back, and
      // this is the row a promoted login draws until it is chosen.
      facts.set(key, await factsFromSlot(d, provider, store.id, null));
      continue;
    }
    const digest = credentialDigest(reading.payload);
    if (before !== undefined && before.digest === digest) {
      facts.set(key, await factsFromSlot(d, provider, store.id, digest));
      continue;
    }
    const accountChanged =
      before !== undefined &&
      before.email !== null &&
      reading.email !== null &&
      before.email !== reading.email;
    if (accountChanged && before !== undefined) {
      const promoted = await promoteOutgoing(d, provider, slot, before, kept);
      if (promoted !== null) {
        moved = true;
        events.push(promoted);
      }
    }
    const write = await vaultPut(d.vault, slot, reading.payload);
    if (!write.ok) {
      events.push({
        kind: 'refused',
        provider,
        login: store.name,
        says: write.reason
      });
      facts.set(key, await factsFromSlot(d, provider, store.id, digest));
      continue;
    }
    kept.slots[slot] = {
      email: reading.email,
      digest,
      account: reading.account,
      at: d.now()
    };
    moved = true;
    events.push({
      kind: 'kept',
      provider,
      login: store.name,
      says:
        reading.email === null
          ? 'Tortie kept this sign in so it can be put back.'
          : `Tortie kept ${reading.email} so it can be put back.`
    });
    facts.set(key, {
      kept: store.id !== null,
      // IT IS ALREADY IN PLACE, because Tortie just captured it FROM this
      // store. So choosing this login puts nothing back and the row says so.
      restores: false,
      email: reading.email
    });
  }
  // THE RECORD IS WRITTEN BEFORE THE ROWS ARE FILLED IN, and the order is not
  // a style. `factsFromSlot` reads the record FILE, so a login promoted a
  // moment ago would answer "no record" while its record sat only in the map
  // above, and would draw as never signed into. That is the Phase 203 defect
  // in a new shape and the gate has an ablation for it.
  if (moved) writeKeptFile(d.root, kept);
  // EVERY LOGIN OF THIS PROVIDER HAS A ROW, whatever happened above. The store
  // list at the top was read before any promotion, and a login can also be
  // added by a person or dropped from the list by its folder being gone, so a
  // key that is still missing is filled from Tortie's own store alone. The app
  // run of this phase is why: a promoted codex login drew `Not signed in yet`
  // while the claude one beside it drew correctly, because the two promotions
  // landed in different observations and only one of them was patched in. A
  // fast path for the promotion is not the same thing as an answer for every
  // row, and this is the answer for every row.
  for (const row of readLoginsFile(d.root).file.logins) {
    if (row.provider !== provider) continue;
    if (facts.has(row.id)) continue;
    facts.set(row.id, await factsFromSlot(d, provider, row.id, null));
  }
  return { events, facts };
}

/**
 * One row's facts out of Tortie's own store alone.
 *
 * `storeDigest` is what the store was just read to hold, or null when the
 * store was not read or holds nothing. A store that could not be read is not
 * a store that is known to already hold the account, so `restores` stays true
 * and the worst that happens is that the write turns out to be unnecessary.
 */
async function factsFromSlot(
  d: KeepDeps,
  provider: LoginProviderId,
  id: string | null,
  storeDigest: string | null
): Promise<KeptFacts> {
  // THE PERSON'S OWN LOCATION IS NEVER RESTORED INTO, so its row never offers
  // to put anything back. The rolling copy Tortie keeps of it belongs to the
  // login promoted from it.
  if (id === null) return NO_KEPT_FACTS;
  const slot = slotOf(provider, id);
  const { file } = readKeptFile(d.root);
  const record = file.slots[slot];
  if (record === undefined) return NO_KEPT_FACTS;
  const payload = await vaultGet(d.vault, slot);
  if (payload === null) return NO_KEPT_FACTS;
  if (credentialDigest(payload) !== record.digest) return NO_KEPT_FACTS;
  return {
    kept: true,
    restores: storeDigest !== record.digest,
    email: record.email
  };
}

/**
 * The account that was in a store, given a login of its own.
 *
 * THIS IS THE SUBTLE HALF OF THE PHASE. The bytes of the outgoing account
 * exist in exactly one place by the time Tortie notices, being the slot that
 * is about to be overwritten, so they are read out of it FIRST and checked
 * against the digest recorded for it. A copy that does not match the record is
 * not the outgoing account and nothing is promoted, which is honest rather
 * than convenient.
 *
 * A login is created for it through the ordinary add, so the id is minted the
 * ordinary way, the directory is created the ordinary way, and the ownership
 * rule stands in front of the mkdir exactly as it does for a login a person
 * added.
 */
async function promoteOutgoing(
  d: KeepDeps,
  provider: LoginProviderId,
  slot: string,
  before: KeptRecord,
  kept: { slots: Record<string, KeptRecord> }
): Promise<KeepEvent | null> {
  const payload = await vaultGet(d.vault, slot);
  if (payload === null) return null;
  if (credentialDigest(payload) !== before.digest) return null;
  // ALREADY OFFERED BACK? An account that already has a login of its own gets
  // no second one, however many times the store changes away from it.
  for (const [other, row] of Object.entries(kept.slots)) {
    if (other === slot) continue;
    if (row.email !== null && before.email !== null && row.email === before.email) {
      return null;
    }
  }
  const { file } = readLoginsFile(d.root);
  const taken = takenNames(file.logins, provider);
  const name =
    loginNameFromEmail(before.email, taken) ?? nextKeptLoginName(taken);
  if (name === null) return null;
  const added = addLogin(d.root, provider, name);
  if (!added.ok) return null;
  const fresh = readLoginsFile(d.root).file.logins.find(
    (l) => l.provider === provider && sameLoginName(l.name, added.name)
  );
  if (fresh === undefined) return null;
  const newSlot = slotOf(provider, fresh.id);
  const write = await vaultPut(d.vault, newSlot, payload);
  if (!write.ok) {
    return { kind: 'refused', provider, login: added.name, says: write.reason };
  }
  kept.slots[newSlot] = {
    email: before.email,
    digest: before.digest,
    account: before.account,
    at: d.now()
  };
  return {
    kind: 'promoted',
    provider,
    login: added.name,
    says:
      before.email === null
        ? 'The sign in that was there is kept, and you can go back to it.'
        : `${before.email} is kept, and you can go back to it.`
  };
}

/**
 * What one login's row draws, asked on its own.
 *
 * The list does NOT use this: an observe has just read every store and answers
 * every row from that one pass. This is for a caller with one login in hand,
 * and for the gate, which drives it beside the observe to prove the two agree.
 */
export async function keptFactsFor(
  d: KeepDeps,
  provider: LoginProviderId,
  id: string | null,
  dir: string | null
): Promise<KeptFacts> {
  if (id === null) return NO_KEPT_FACTS;
  const live = await readSettledStore(d.stores, provider, dir);
  const digest =
    live === null || live.payload === null ? null : credentialDigest(live.payload);
  return factsFromSlot(d, provider, id, digest);
}

/** What an activation answered. */
export type ActivateResult =
  | { ok: true; wrote: boolean; says: string }
  | { ok: false; reason: string };

/**
 * Put a login's kept account back into the store it runs under.
 *
 * THE ORDER IS THE POINT. An observe runs first, so whatever is in the target
 * store has already been captured and, if it is a different account, already
 * has a login of its own. Only then is anything written.
 *
 * `stopAfter` exists for the gate alone and the product never passes it.
 */
export async function activateLogin(
  d: KeepDeps,
  provider: LoginProviderId,
  /**
   * The login to put in place, or NULL for the person's own default location,
   * which is the value `logins:choose` carries for it. Treating null as a
   * login named the empty string is the defect the Phase 204 app run found:
   * choosing the default answered "Tortie has no codex login named ." and the
   * switch back could not be made at all.
   */
  name: string | null,
  stopAfter?: SwapStep
): Promise<ActivateResult> {
  if (name === null || name === '' || sameLoginName(name, DEFAULT_LOGIN_NAME)) {
    // THE PERSON'S OWN LOCATION IS NEVER WRITTEN. Choosing it moves no bytes.
    await observeProvider(d, provider);
    return { ok: true, wrote: false, says: 'Your own sign in is used as it is.' };
  }
  await observeProvider(d, provider);
  const { file } = readLoginsFile(d.root);
  const row = file.logins.find(
    (l) => l.provider === provider && sameLoginName(l.name, name)
  );
  if (row === undefined) {
    return { ok: false, reason: `Tortie has no ${provider} login named ${name}.` };
  }
  const dir = loginDirIn(d.root, provider, row.id);
  if (loginDirOnDisk(d.root, provider, dir) !== 'ok') {
    return {
      ok: false,
      reason: `The folder for ${row.name} is not there, so nothing was put back.`
    };
  }
  const slot = slotOf(provider, row.id);
  const payload = await vaultGet(d.vault, slot);
  if (payload === null) {
    // NOT A FAILURE. A login Tortie has no copy of is one the person signs
    // into themselves, which is every login before this phase.
    return {
      ok: true,
      wrote: false,
      says: 'Tortie has no kept sign in for this one.'
    };
  }
  const digest = credentialDigest(payload);
  const live = await readSettledStore(d.stores, provider, dir);
  if (live !== null && live.payload !== null && credentialDigest(live.payload) === digest) {
    return { ok: true, wrote: false, says: 'That account is already in place.' };
  }
  // THE ONE REFUSAL ON A WRITE. A session running under this login keeps the
  // sign in it started with, and writing a different account underneath it is
  // the one write that could sign a running agent out mid turn.
  const running = await d
    .liveSessions()
    .catch((): LiveSession[] => []);
  if (
    running.some(
      (s) => s.provider === provider && sameLoginName(s.login ?? null, row.name)
    )
  ) {
    return {
      ok: false,
      reason: `A session is running on ${row.name}. Close it first, then choose it again.`
    };
  }
  const target = await storeTarget(d.stores, provider, dir);
  if (target === null) {
    return { ok: false, reason: 'Tortie refused to write that sign in location.' };
  }
  const wrote = await safeSwap(target, payload, stopAfter);
  if (!wrote.ok) return { ok: false, reason: wrote.reason };
  return { ok: true, wrote: true, says: `${row.name} is signed in again.` };
}

/** Drop a login's kept account. Called when the login is removed. */
export async function forgetLogin(
  d: KeepDeps,
  provider: LoginProviderId,
  id: string
): Promise<void> {
  const slot = slotOf(provider, id);
  await vaultDel(d.vault, slot);
  const { file } = readKeptFile(d.root);
  if (file.slots[slot] === undefined) return;
  delete file.slots[slot];
  writeKeptFile(d.root, file);
}
