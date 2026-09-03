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
import {
  addLogin,
  namedLoginIds,
  readLoginsFile,
  removeStrayLoginDir,
  strayLoginIds,
  type StoredLogin
} from '../logins/store';
import { credentialDigest } from './payload';
import { readKeptFile, updateKeptFile, type KeptRecord } from './kept';
import {
  forgetStore,
  readSettledStore,
  storeTarget,
  type StoreDeps
} from './stores';
import { safeSwap, type SwapStep } from './swap';
import {
  DEFAULT_SLOT_ID,
  isSlotName,
  slotFor,
  vaultDel,
  vaultDiscardStaged,
  vaultGet,
  vaultPut,
  type VaultBackend
} from './vault';

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
 * ONE OBSERVE AT A TIME PER LOGINS ROOT, and this is not a performance knob.
 *
 * ## THE DEFECT IT ANSWERS
 *
 * The Phase 204 verification drove two overlapping `logins:list` calls, which
 * is what an ordinary mount produces: `../../renderer/settings/UsageGroup.tsx`
 * draws a block per provider and each one loads on mount, and StrictMode
 * doubles that again. Both observes ran in full, each read the record file at
 * its start, and the second one's write was composed from a copy taken before
 * the first one's promotion. The promoted login's row was destroyed and the
 * rescued account drew as never signed into for ever after, on every list.
 *
 * ## WHY A LOCK RATHER THAN A HELD ANSWER
 *
 * The five second hold in `../logins/ipc.ts` is a cost saver and it was never
 * a guard: it stamps its clock AFTER its awaits, so two calls that overlap
 * both miss it. A hold cannot make a read modify write atomic. This can, and
 * it holds for the observe `activateLogin` runs too, which no hold in the
 * registrar could ever cover.
 *
 * ## THE KEY IS THE ROOT AND NOT THE PROVIDER
 *
 * Both providers write the SAME `kept.json`, so serialising per provider would
 * leave the claude observe and the codex observe racing over one file. One
 * queue per root is the whole of the exclusion.
 *
 * A throw does not wedge the queue: every waiter chains on a promise that has
 * already been made to settle.
 */
const observing = new Map<string, Promise<unknown>>();

async function underRootLock<T>(root: string, run: () => Promise<T>): Promise<T> {
  const before = observing.get(root) ?? Promise.resolve();
  const mine = before.then(run, run);
  // The tail a later caller waits on never rejects, so one refusal cannot stop
  // every observe after it. The caller of THIS call still sees the throw.
  const tail = mine.then(
    () => undefined,
    () => undefined
  );
  observing.set(root, tail);
  try {
    return await mine;
  } finally {
    // The LAST one out drops the entry, which is why the tail is compared by
    // identity: a caller that has already been queued behind is still holding
    // the map and its entry must stay. Without this the map grows one entry
    // per root and never shrinks, which is a leak rather than a defect, and
    // with a wrong test it would drop a queue somebody is waiting on.
    if (observing.get(root) === tail) observing.delete(root);
  }
}

/**
 * Read every store of one provider and keep what has changed.
 *
 * IT WRITES NOTHING A VENDOR OWNS. Everything below writes Tortie's own store
 * and Tortie's own record file, and creates an empty directory for a promoted
 * login. A session running anywhere cannot be affected by any of it.
 *
 * IT RUNS ONE AT A TIME PER ROOT. See {@link underRootLock}.
 */
export function observeProvider(
  d: KeepDeps,
  provider: LoginProviderId
): Promise<Observation> {
  return underRootLock(d.root, () => observeOnce(d, provider));
}

/**
 * The roots whose leftover staging has been swept in this run.
 *
 * ## WHY A SWEEP EXISTS AT ALL
 *
 * `./swap.ts` discards the staged place in a `finally` and again before it
 * stages, but a crash runs no `finally`, and the pre-discard only helps a
 * store that is written AGAIN. The verification killed the process at each of
 * the three steps and measured what was left: the store held the old
 * credential or the new one every time, and two of the three left a whole
 * credential beside it that nothing in the product would ever remove. On the
 * keychain path that residue is a second keychain item holding a credential.
 *
 * ## ONCE PER RUN, AND NOT ON EVERY OBSERVE
 *
 * Residue can only appear while this process was not running, so the first
 * observe after a start is the moment to clear it, and a sweep on every
 * observe would spawn `security` per claude login every five seconds for
 * nothing. It runs inside the same lock as the observe it rides on.
 *
 * IT REMOVES ONLY TORTIE'S OWN LEFTOVERS. `storeTarget` answers null for the
 * person's own location, so the sweep cannot reach it, and `discard` deletes
 * the staged place and never the store.
 */
const swept = new Set<string>();

async function sweepStaged(d: KeepDeps, provider: LoginProviderId): Promise<void> {
  // PHASE 206. TORTIE'S OWN VAULT IS SWEPT TOO, and it is swept FIRST.
  // Until this line the sweep reached the vendor's stores and never the
  // store Tortie owns, so a crash between a slot's stage and its discard
  // left the whole credential at `<slot>.pending` and only a later
  // SUCCESSFUL write to that same slot ever removed it. A slot nobody writes
  // again kept it, which on macOS is a second keychain item holding a
  // credential. The DEFAULT slot is swept as well, because it is Tortie's
  // own rolling copy and it has a staged place like every other slot; the
  // vendor half below still refuses the person's own location by name.
  //
  // THE SLOTS ARE READ FROM THE RECORD FILE AS WELL AS FROM THE DIRECTORIES,
  // which the fix round added. `storesOf` drops a login whose folder is not on
  // disk, so a staged place beside a slot whose directory has already gone was
  // kept for ever by a sweep that only walked `storesOf`. The record file is
  // the durable index of every slot Tortie's own vault has written, so it is
  // the list that answers this question. A slot named by neither is one no
  // writer in this domain has ever made.
  for (const slot of sweepableSlots(d.root, provider)) {
    await vaultDiscardStaged(d.vault, slot);
  }
  for (const store of storesOf(d.root, provider)) {
    if (store.dir === null) continue;
    try {
      const target = await storeTarget(d.stores, provider, store.dir);
      if (target === null) continue;
      await target.discard();
    } catch {
      // A leftover that will not go changes nothing about what any store
      // holds, and failing an observe for it would be worse.
    }
  }
}

/**
 * Every slot of one provider whose staged place is worth asking about.
 *
 * THREE INDEXES AND NOT ONE, because a slot outlives its folder. The default
 * slot, which every provider has and no folder holds; every ROW in the logins
 * file, whether or not its folder is on disk, which is the half `storesOf`
 * drops; and every slot the RECORD FILE names, which is the durable index of
 * what Tortie's own vault has written and the only one that survives a row
 * being taken out. Deduplicated, and every one is checked against
 * {@link isSlotName} before it is used, because half of a slot name is half of
 * a keychain service name and both files are ones an agent with write access
 * to the home directory could edit.
 *
 * EXPORTED FOR THE PHASE 208 MIGRATION, which needs the same answer to the
 * same question, being every slot this profile could name, so the two can
 * never disagree about what is worth asking the keychain for.
 */
export function sweepableSlots(root: string, provider: LoginProviderId): string[] {
  const out = new Set<string>([slotOf(provider, null)]);
  for (const row of readLoginsFile(root).file.logins) {
    if (row.provider !== provider) continue;
    const slot = slotOf(provider, row.id);
    if (isSlotName(slot)) out.add(slot);
  }
  for (const slot of recordedSlots(root, provider)) out.add(slot);
  return [...out];
}

/** The slots one provider's record file names, refused unless well formed. */
function recordedSlots(root: string, provider: LoginProviderId): string[] {
  const { file } = readKeptFile(root);
  const out: string[] = [];
  for (const slot of Object.keys(file.slots)) {
    if (!isSlotName(slot)) continue;
    if (slot.slice(0, slot.indexOf('.')) !== provider) continue;
    out.push(slot);
  }
  return out;
}

async function observeOnce(
  d: KeepDeps,
  provider: LoginProviderId
): Promise<Observation> {
  if (!swept.has(`${d.root}\u0000${provider}`)) {
    swept.add(`${d.root}\u0000${provider}`);
    await sweepStaged(d, provider);
    // PHASE 206. AND THE SAME MOMENT FINISHES A REMOVAL AN EARLIER RUN LEFT
    // HALF DONE, for the same reason: it can only have happened while this
    // process was not running, so once per run is when to look for it.
    await finishStraysOnce(d, provider);
  }
  const events: KeepEvent[] = [];
  const facts = new Map<string, KeptFacts>();
  const { file: kept } = readKeptFile(d.root);
  // ONLY THE ROWS THIS OBSERVE CHANGED are written back, so a row another
  // writer added while this one ran is carried through rather than dropped.
  const changed: Record<string, KeptRecord> = {};
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
    // THE STORE HOLDS DIFFERENT BYTES THAN TORTIE LAST SAW. Either the vendor
    // refreshed the token of the account that was already there, or a person
    // typed `/login` and a DIFFERENT account is in it now. Only the second
    // loses an account, and the account that was there is kept unless Tortie
    // can PROVE it is looking at the first. See {@link sameAccountProven}.
    if (before !== undefined && !sameAccountProven(before, reading)) {
      const promoted = await promoteOutgoing(d, provider, slot, before, kept, changed);
      if (promoted !== null) events.push(promoted);
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
      subject: reading.subject,
      digest,
      account: reading.account,
      // CAPTURED IN PLACE, so it came out of no other slot.
      from: null,
      at: d.now()
    };
    changed[slot] = kept.slots[slot];
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
  updateKeptFile(d.root, changed);
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
 * Is the account in this store PROVABLY the one Tortie last recorded for it?
 *
 * ## THE RULE, AND WHICH WAY IT FAILS
 *
 * It answers true only when the vendor named the same account on both sides.
 * Anything else is false, INCLUDING not knowing, and that asymmetry is the
 * whole of the ruling: a false negative mints one extra login holding an
 * account the person still has, which they can remove in one click; a false
 * positive overwrites the only copy of an account that exists anywhere on the
 * machine, and it is gone. The backlog states the property with no qualifier,
 * being that no switch loses an account, so the doubt is spent on keeping.
 *
 * ## WHY THIS IS NOT WHERE IT STARTED
 *
 * As first built it asked whether the two ADDRESSES differed, which is true
 * only when both are known, so a store that named no address on either side
 * was read as unchanged and the previous account was overwritten. The
 * verification drove three real shapes through it and all three lost the
 * account: a login signed into but not yet used, whose `.claude.json` has no
 * `oauthAccount` until the account takes a turn; the person's own claude store
 * in that same shape; and a codex `auth.json` with no `id_token`. The first of
 * those is exactly the sentence this phase exists to answer, because a person
 * signs in, sees it is the wrong account, and types `/login` before ever
 * taking a turn.
 *
 * ## THE SUBJECT IS WHAT MAKES THE RULE CHEAP
 *
 * Without a second identifier, "promote unless proven same" would mint a login
 * on every hourly token refresh of any store with no address. Both vendors
 * write a stable account identifier the moment they sign in, being
 * `oauthAccount.accountUuid` and `tokens.account_id`, so a refresh is proved
 * to be a refresh in every case where the vendor has written one and the rule
 * costs nothing there. What remains is the narrow window where the vendor has
 * named neither, and in that window Tortie keeps rather than guesses.
 *
 * ## NEITHER IDENTIFIER OUTRANKS THE OTHER, and a disagreement always wins
 *
 * The answer is true only when at least one identifier agrees AND no known
 * identifier disagrees. An earlier draft let the subject decide alone whenever
 * it was known on both sides, and this domain's own tests refused it: their
 * codex fixture gives every account the same `account_id`, so two plainly
 * different addresses were read as one account and the promotion stopped
 * happening. A field that DISAGREES is positive evidence of a different
 * account and there is no reading under which the other field overturns it, so
 * a disagreement anywhere is enough on its own.
 */
/** The two things either side of the question names itself by. */
interface AccountNames {
  subject: string | null;
  email: string | null;
}

/**
 * The one comparison, used by the promotion gate and by the dedupe below, so
 * the two can never drift into disagreeing about what one account is.
 */
function sameAccountProven(before: AccountNames, now: AccountNames): boolean {
  let agreed = false;
  for (const [was, is] of [
    [before.subject, now.subject],
    [before.email, now.email]
  ] as const) {
    if (was === null || is === null) continue;
    if (was !== is) return false;
    agreed = true;
  }
  return agreed;
}

/**
 * The login an EARLIER identifier-less change at this same store was promoted
 * into, when reusing it would lose nothing.
 *
 * ## WHY THIS EXISTS, and the number that forced it
 *
 * A store that names no account at all promotes on every change, because
 * {@link sameAccountProven} cannot tell a refresh from a switch there. Driven
 * over ten ordinary token refreshes of such a store, that minted NINE logins
 * called `Kept 1` to `Kept 9`. Worse than the noise, `nextKeptLoginName` stops
 * at 99, and past that a promotion answers null and the account really is
 * lost, so an unbounded chain brings back the very defect the rule prevents.
 *
 * ## WHAT IS REUSED, AND WHAT IS NEVER TOUCHED
 *
 * Only a login this same store's earlier promotion created, which is what
 * `from` records, and only while the person has shown no interest in it: it is
 * not the chosen login, and its own directory holds no credential, meaning
 * nobody has ever run a session under it or put an account into it. A login
 * that fails either test is left exactly as it is and a new one is minted, so
 * nothing a person has engaged with is ever written over.
 *
 * ## THE RESIDUE, STATED PLAINLY
 *
 * Two consecutive sign ins to DIFFERENT accounts at one store, with neither
 * account ever naming itself and no session run in between, keep only the
 * second. That is the one shape this bound gives up, and it is bought with the
 * 99 login chain that ends in real loss. The account a person just left is
 * still offered back, which is the sentence the phase exists to answer.
 */
async function reusableChainLogin(
  d: KeepDeps,
  provider: LoginProviderId,
  slot: string,
  kept: { slots: Record<string, KeptRecord> }
): Promise<{ slot: string; name: string } | null> {
  const { file } = readLoginsFile(d.root);
  // THE CHOSEN LOGIN IS A NAME ON THE FILE, not a field on a row.
  const chosen = file.chosen[provider] ?? null;
  for (const [other, row] of Object.entries(kept.slots)) {
    if (other === slot) continue;
    if (row.from !== slot) continue;
    // ONLY A CHAIN OF UNNAMED ACCOUNTS. A promotion that named itself is an
    // account Tortie can tell apart, and it keeps its own login for ever.
    if (row.subject !== null || row.email !== null) continue;
    const login = file.logins.find(
      (l) => l.provider === provider && slotOf(provider, l.id) === other
    );
    if (login === undefined) continue;
    // THE TWO TESTS FOR "NOBODY HAS SHOWN ANY INTEREST IN THIS ONE".
    if (sameLoginName(chosen, login.name)) continue;
    const dir = loginDirIn(d.root, provider, login.id);
    const holds = await readSettledStore(d.stores, provider, dir);
    if (holds !== null && holds.payload !== null) continue;
    return { slot: other, name: login.name };
  }
  return null;
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
  kept: { slots: Record<string, KeptRecord> },
  changed: Record<string, KeptRecord>
): Promise<KeepEvent | null> {
  const payload = await vaultGet(d.vault, slot);
  if (payload === null) return null;
  if (credentialDigest(payload) !== before.digest) return null;
  // ALREADY OFFERED BACK? An account that already has a login of its own gets
  // no second one, however many times the store changes away from it.
  //
  // THREE WAYS OF BEING THE SAME, and the third is what bounds the rule above.
  // Now that a store with no identifier at all promotes rather than guesses,
  // the same bytes could otherwise be handed a fresh login every time a person
  // switched back and forth, so a slot already holding this exact credential
  // ends the matter whatever anybody is called.
  for (const [other, row] of Object.entries(kept.slots)) {
    if (other === slot) continue;
    if (row.digest === before.digest) return null;
    if (sameAccountProven(row, before)) return null;
  }
  // AN UNNAMED CHAIN REUSES ITS OWN EARLIER LOGIN rather than minting one per
  // token refresh. See {@link reusableChainLogin} for what it refuses to reuse.
  const reuse =
    before.subject === null && before.email === null
      ? await reusableChainLogin(d, provider, slot, kept)
      : null;
  if (reuse === null) {
    return mintPromotion(d, provider, slot, before, kept, changed, payload);
  }
  const write = await vaultPut(d.vault, reuse.slot, payload);
  if (!write.ok) {
    return { kind: 'refused', provider, login: reuse.name, says: write.reason };
  }
  const record: KeptRecord = {
    email: before.email,
    subject: before.subject,
    digest: before.digest,
    account: before.account,
    from: slot,
    at: d.now()
  };
  kept.slots[reuse.slot] = record;
  changed[reuse.slot] = record;
  return promotedEvent(provider, reuse.name, before.email);
}

/** One promotion into a login of its own, minted the ordinary way. */
async function mintPromotion(
  d: KeepDeps,
  provider: LoginProviderId,
  slot: string,
  before: KeptRecord,
  kept: { slots: Record<string, KeptRecord> },
  changed: Record<string, KeptRecord>,
  payload: string
): Promise<KeepEvent | null> {
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
    subject: before.subject,
    digest: before.digest,
    account: before.account,
    // WHERE IT CAME FROM, which is what lets a later unnamed change at the
    // same store find this login instead of minting another beside it.
    from: slot,
    at: d.now()
  };
  changed[newSlot] = kept.slots[newSlot];
  return promotedEvent(provider, added.name, before.email);
}

function promotedEvent(
  provider: LoginProviderId,
  login: string,
  email: string | null
): KeepEvent {
  return {
    kind: 'promoted',
    provider,
    login,
    says:
      email === null
        ? 'The sign in that was there is kept, and you can go back to it.'
        : `${email} is kept, and you can go back to it.`
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

/**
 * EVERY STORE ONE LOGIN HAD, CLEARED (Phase 206).
 *
 * It is written once and called from both places a removal can happen, being
 * the person pressing Remove and {@link finishStrayLogins} finishing a removal
 * an earlier run did not, so the two can never clear different sets. The four
 * are the whole of what a login owns:
 *
 *  1. the VENDOR'S OWN STORE, which on macOS for claude is a keychain item
 *     whose name is derived from the directory and which survived every remove
 *     before this phase, being the credential the Phase 203 verifier found on
 *     the operator's disk;
 *  2. TORTIE'S OWN SLOT, and the staged place beside it;
 *  3. the RECORD ROW in `kept.json`;
 *  4. and the DIRECTORY, which the caller removes, because it is the one of
 *     the four that lives in the logins domain rather than this one.
 *
 * IT HOLDS NO LOCK. Both callers are already inside one, and taking it twice
 * would wait on itself for ever.
 */
async function forgetStores(
  d: KeepDeps,
  provider: LoginProviderId,
  id: string
): Promise<void> {
  await forgetStore(d.stores, provider, loginDirIn(d.root, provider, id));
  const slot = slotOf(provider, id);
  await vaultDel(d.vault, slot);
  updateKeptFile(d.root, {}, [slot]);
}

/** Drop a login's kept account. Called when the login is removed. */
export async function forgetLogin(
  d: KeepDeps,
  provider: LoginProviderId,
  id: string
): Promise<void> {
  // UNDER THE SAME LOCK AS AN OBSERVE, because it mutates the same record file
  // and a drop that raced an observe would come back on the observe's write.
  await underRootLock(d.root, () => forgetStores(d, provider, id));
}

/**
 * Finish every removal that did not finish (Phase 206).
 *
 * ## THE SHAPES IT ANSWERS, and all five were reproduced at the parent
 *
 *  - a login removed before Phase 206, whose directory and whose scoped
 *    keychain item were both left behind;
 *  - the same with no credential ever written into it;
 *  - a stray whose id no row names while another row shares its NAME, which
 *    the raw id read in `../logins/store.ts` is what keeps safe;
 *  - a stray that is a symbolic link, which is unlinked without a single read
 *    or write through it;
 *  - and a remove interrupted between its two halves, which is now the ONLY
 *    shape that can strand anything for a moment, because the credential is
 *    cleared before the row is.
 *
 * IT ANSWERS THE IDS IT FINISHED, so a caller can say so and a probe can read
 * it. It never throws: a stray that will not go is finished on the next run.
 */
async function finishStraysOnce(
  d: KeepDeps,
  provider: LoginProviderId
): Promise<string[]> {
  const done: string[] = [];
  for (const id of strayIds(d.root, provider)) {
    try {
      await forgetStores(d, provider, id);
    } catch {
      // A store that will not answer is not a reason to leave the directory.
    }
    if (removeStrayLoginDir(d.root, provider, id)) done.push(id);
  }
  return done;
}

/**
 * Every id of one provider that no row names, from BOTH places one can show.
 *
 * ## A DIRECTORY IS NOT THE ONLY THING A REMOVED LOGIN LEAVES
 *
 * The fix round added the second half. `strayLoginIds` is a `readdir` of the
 * provider root, so a stray whose FOLDER has gone while its vault slot, its
 * record row and its scoped vendor item are all still there answered nothing
 * at all, and the sweep walked past a credential nobody can reach, which is
 * the exact thing this phase exists to stop. The record file names every slot
 * Tortie's own vault has written, so it is the second place to look, and an id
 * it names that no row names is a stray whatever is on disk.
 *
 * ## THE REFUSAL IS THE SAME REFUSAL, and it is asked once
 *
 * {@link namedLoginIds} answers null when the record of what the person owns
 * cannot be read, and null authorises NOTHING here rather than authorising
 * everything. Both halves ask that one function, so the two lists can never
 * disagree about what is owned. The ids are read raw for the reason
 * `../logins/store.ts` gives: a row dropped by the sanitizer is still a row
 * the person added.
 *
 * `removeStrayLoginDir` answers false for an id whose directory was never
 * there, so a stray found only in the record file clears its stores and its
 * row and is not counted as a directory removed.
 */
function strayIds(root: string, provider: LoginProviderId): string[] {
  const out = new Set<string>(strayLoginIds(root, provider));
  const known = namedLoginIds(root);
  if (known === null) return [...out];
  for (const slot of recordedSlots(root, provider)) {
    const id = slot.slice(slot.indexOf('.') + 1);
    if (id === DEFAULT_SLOT_ID || known.has(id)) continue;
    out.add(id);
  }
  return [...out];
}

/** {@link finishStraysOnce}, under the lock, for a caller that holds none. */
export function finishStrayLogins(
  d: KeepDeps,
  provider: LoginProviderId
): Promise<string[]> {
  return underRootLock(d.root, () => finishStraysOnce(d, provider));
}
