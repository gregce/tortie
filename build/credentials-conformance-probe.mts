/**
 * credentials-conformance-probe.mts. The SHIPPING credential modules, run
 * under node, printed as JSON for build/conformance-credentials.mjs to judge
 * (Phase 204).
 *
 * It imports the shipping modules rather than a copy, so the gate is testing
 * what the app does. It launches no Electron, opens no window, starts no tmux
 * server, spawns no agent, OPENS NO KEYCHAIN and makes no request: the
 * keychain is a function that refuses, the file system is a bag of strings, and
 * the only real paths it touches are inside a scratch directory it makes and
 * removes.
 *
 * `P204_MODULES` points the domain somewhere else, which is how the gate runs
 * this same probe over an ABLATED copy and watches it go red.
 *
 * SINCE PHASE 304 TORTIE'S OWN STORE IS A SEALED FILE, and the seal is an
 * argument, so every arm that drives it hands in {@link injectedSeal}: base64
 * behind a marker, no cipher, and enough to tell a file that went through
 * `wrap` from one holding the payload as written. The keychain is read ONCE
 * for a legacy item on a miss, through the same measured `security` model,
 * and never written by any vault path; rule 17 drives that read-through and
 * rule 22 the size the sealed file has no limit on.
 */

import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { addLogin, chooseLogin, readLoginsFile } from '../src/main/logins/store';
import { loginDirIn, loginsFileIn } from '../src/main/logins/dirs';
import { securityPrintsRaw } from '../src/main/credentials/security-print';
import {
  CLAUDE_KEYCHAIN_SERVICE,
  claudeKeychainAccount,
  claudeScopedService
} from '../src/main/usage/credentials';
import type { LoginProviderId } from '../src/shared/logins';

const MODULES = process.env['P204_MODULES'] ?? 'src/main/credentials';

const keep = (await import(
  pathToFileURL(resolve(MODULES, 'keep.ts')).href
)) as typeof import('../src/main/credentials/keep');
const vault = (await import(
  pathToFileURL(resolve(MODULES, 'vault.ts')).href
)) as typeof import('../src/main/credentials/vault');
const swap = (await import(
  pathToFileURL(resolve(MODULES, 'swap.ts')).href
)) as typeof import('../src/main/credentials/swap');
const stores = (await import(
  pathToFileURL(resolve(MODULES, 'stores.ts')).href
)) as typeof import('../src/main/credentials/stores');
const payload = (await import(
  pathToFileURL(resolve(MODULES, 'payload.ts')).href
)) as typeof import('../src/main/credentials/payload');
const kept = (await import(
  pathToFileURL(resolve(MODULES, 'kept.ts')).href
)) as typeof import('../src/main/credentials/kept');
const nofollow = (await import(
  pathToFileURL(resolve(MODULES, 'nofollow.ts')).href
)) as typeof import('../src/main/credentials/nofollow');
/**
 * PHASE 287. The module that owns the cap, imported from the same place every
 * other module here is, so the `lineCap` arm drives the ABLATED copy's cap and
 * not the tree's.
 */
const security = (await import(
  pathToFileURL(resolve(MODULES, 'security.ts')).href
)) as typeof import('../src/main/credentials/security');
/**
 * THE ONE MODULE THAT MAY BE MISSING, and why it is loaded differently
 * (Phase 219).
 *
 * `migrate.ts` is Phase 208's own file, so a run of this probe over a copy of
 * the domain from BEFORE that phase does not have it. A bare top level import
 * of a file that is not there throws ERR_MODULE_NOT_FOUND, which killed the
 * whole probe: the gate then wrapped a raw node stack as "the probe did not
 * run" and named no rule at all. A gate that dies is not a gate that fails,
 * which is the third of the three Phase 208 findings this round closes. So the
 * absence is a READING now, and rule 17 says it in its own words.
 */
const migrate = existsSync(resolve(MODULES, 'migrate.ts'))
  ? ((await import(
      pathToFileURL(resolve(MODULES, 'migrate.ts')).href
    )) as typeof import('../src/main/credentials/migrate'))
  : null;

/**
 * PHASE 220's module, loaded the same defensive way `migrate.ts` is and for the
 * same reason: a copy of the domain from before this phase does not carry it,
 * and a bare import would kill the probe rather than name the rule.
 */
const locksMod = (await import(
  pathToFileURL(resolve(MODULES, 'locks.ts')).href
)) as typeof import('../src/main/credentials/locks');
const watchMod = (await import(
  pathToFileURL(resolve(MODULES, 'watch.ts')).href
)) as typeof import('../src/main/credentials/watch');
const lifecycle = existsSync(resolve(MODULES, 'lifecycle.ts'))
  ? ((await import(
      pathToFileURL(resolve(MODULES, 'lifecycle.ts')).href
    )) as typeof import('../src/main/credentials/lifecycle'))
  : null;

/** A value only this probe ever writes. If it appears anywhere, say where. */
const TOKEN = 'P204-SENTINEL-TOKEN-4c19be';

/**
 * The account Claude Code's own rule gives every arm built on `makeStores`
 * (Phase 281). That seam's environment names no `USER`, so the vendor's `Cv`
 * takes the user name, which the seam gives as `gate`. Every item an arm seeds
 * as the vendor's is seeded under it, because the shipping domain now asks by
 * service AND account and an item under any other account is not the one
 * Claude Code reads. The arms seeded the operator's own user name until this
 * phase, which the fake then ignored.
 */
const GATE_ACCOUNT = 'gate';

const out: Record<string, unknown> = {};
const roots: string[] = [];

function freshRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'p204-gate-'));
  roots.push(dir);
  return dir;
}

// ---------------------------------------------------------------------------
// The world. Nothing real is opened.
// ---------------------------------------------------------------------------

/** A codex credential whose id token names an address, and whose token is ours. */
function codexCredential(who: string, nonce: string): string {
  const claims = { sub: `u-${who}`, email: `${who}@example.com` };
  const claim = Buffer.from(JSON.stringify(claims), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return JSON.stringify({
    OPENAI_API_KEY: null,
    tokens: {
      access_token: `${TOKEN}-${who}-${nonce}`,
      account_id: `acct-${who}`,
      id_token: `h.${claim}.s`
    }
  });
}

/** A claude credential, plus the account file the address really lives in. */
function claudeCredential(who: string, nonce: string): string {
  return JSON.stringify({
    claudeAiOauth: {
      accessToken: `${TOKEN}-${who}-${nonce}`,
      subscriptionType: 'max'
    }
  });
}
function claudeAccountFile(who: string): string {
  return JSON.stringify({
    numStartups: 9,
    oauthAccount: { emailAddress: `${who}@example.com` }
  });
}

interface World {
  files: Map<string, string>;
  /** Reads that must throw, by path, counted down. */
  breakReads: Map<string, number>;
  /** A second answer for a path, so the two settle reads disagree. */
  shifting: Map<string, string>;
  /** Every argv the security seam was handed, so a payload on one is visible. */
  argvs: string[][];
  /** Every command sent over stdin, which is where a payload IS allowed. */
  stdins: string[];
  /** Every payload staged, so a corrupted read back can be arranged. */
  corruptStaged: boolean;
}

/**
 * One keychain item, in the order `security` meets it (Phase 281).
 *
 * `security` keeps items by service AND account, so two items may share a
 * service name, and a lookup answers the FIRST row matching everything it
 * named. Research 126 §2.4 measured exactly that on the operator's machine: a
 * stray under another account sat ahead of Claude Code's own item under the
 * same name, and a lookup by service alone landed on the stray.
 */
interface KeychainRow {
  service: string;
  account: string;
  payload: string;
  modified?: string;
}

/**
 * The rows, with the verbs the arms below seed and inspect them by.
 *
 * `set` is the `-U` add: it updates the row matching the service AND the
 * account, or appends one, so an arm that seeds the same name twice under one
 * account rewrites one item, as it always did. The updated row MOVES TO THE
 * BACK, because the Phase 281 keychain verifier measured the real program
 * moving an updated item behind every other item of the same service name. `get`, `has` and `delete` take
 * the account the way a lookup does, optionally, and answer the first match.
 * `first` puts a row AHEAD of everything, which is how a stray is planted.
 */
interface KeychainItems {
  rows: KeychainRow[];
  set(service: string, item: { account: string; payload: string; modified?: string }): void;
  get(service: string, account?: string): KeychainRow | undefined;
  has(service: string, account?: string): boolean;
  delete(service: string, account?: string): boolean;
  first(row: KeychainRow): void;
  /** Every row's service in row order, so a name held twice is listed twice. */
  keys(): string[];
  entries(): [string, KeychainRow][];
}

/**
 * A `security` that behaves the way the real one was MEASURED to behave on
 * 2026-09-02, on a scratch keychain that was never in the search list.
 *
 *  - a write arrives through `-i` on STDIN as `add-generic-password -U -a
 *    "<account>" -s "<service>" -X "<hex>"`, and `-U` replaces the item
 *    rather than adding a second one, moving it behind the other items of its
 *    name (measured 2026-09-17 by the Phase 281 keychain verifier);
 *  - `find-generic-password -s <service> -w` prints the payload plus exactly
 *    one newline, and prints it AS HEX when any byte of it is outside
 *    0x20-0x7E (a tab or a non-ASCII character included; Phase 281.1 measured
 *    the table and both fakes now print by the shipping `securityPrintsRaw`);
 *  - the same call without `-w` prints the item's attributes, `acct` included,
 *    and never the payload.
 *
 * PHASE 281 MADE IT THE FIRST-MATCH MODEL, the one both domains' Phase 281
 * unit tests run over (`src/main/credentials/__tests__/first-match-security.ts`)
 * and the one research 126 §8.10 drove the parent with. Items are ROWS keyed by
 * service and account, kept in order. `find-generic-password` and
 * `delete-generic-password` answer the first row whose service matches and,
 * when `-a` was given, whose account matches too. The `-i` add updates the
 * row matching service AND account and moves it to the back, or appends one. No match is exit
 * 44, errSecItemNotFound, and a flag it does not know or a call with no `-s`
 * is exit 1, so a malformed argv never reads as a miss. Until this phase the
 * items were keyed by service alone and `-a` was ignored, which is a keychain
 * where a stray and the vendor's item cannot both exist, so no arm could tell
 * a lookup that named the account from one that did not.
 *
 * It exists so the keychain half of the shipping code runs for real in this
 * gate, which is what makes the argv assertion below mean anything: a payload
 * that reached a command line would be visible in `w.argvs`.
 */
function fakeSecurity(w: World): {
  items: KeychainItems;
  runner: import('../src/main/credentials/security').SecurityRunner;
} {
  const rows: KeychainRow[] = [];
  let writes = 0;
  const find = (service: string, account: string | undefined): number =>
    rows.findIndex(
      (r) => r.service === service && (account === undefined || r.account === account)
    );
  const items: KeychainItems = {
    rows,
    set: (service, item) => {
      const at = find(service, item.account);
      // AN UPDATE MOVES THE ITEM TO THE BACK, as the real program was measured
      // to (Phase 281, after verification): one item, behind the others of its name.
      if (at >= 0) rows.splice(at, 1);
      rows.push({ service, ...item });
    },
    get: (service, account) => {
      const at = find(service, account);
      return at < 0 ? undefined : rows[at];
    },
    has: (service, account) => find(service, account) >= 0,
    delete: (service, account) => {
      const at = find(service, account);
      if (at < 0) return false;
      rows.splice(at, 1);
      return true;
    },
    first: (row) => {
      rows.unshift({ ...row });
    },
    keys: () => rows.map((r) => r.service),
    entries: () => rows.map((r): [string, KeychainRow] => [r.service, r])
  };
  return {
    items,
    runner: {
      run: async (argv, stdin) => {
        w.argvs.push([...argv]);
        if (stdin !== undefined) w.stdins.push(stdin);
        if (argv[0] === '-i') {
          const found =
            /^add-generic-password -U -a "([^"]*)" -s "([^"]*)" -X "([0-9a-f]*)"$/.exec(
              (stdin ?? '').trim()
            );
          if (found === null) return { code: 1, stdout: '' };
          writes += 1;
          items.set(found[2] ?? '', {
            account: found[1] ?? '',
            payload: Buffer.from(found[3] ?? '', 'hex').toString('utf8'),
            // A modification date that moves on every write, as the real one does.
            modified: `2026090300${String(writes).padStart(4, '0')}Z`
          });
          return { code: 0, stdout: '' };
        }
        let service: string | undefined;
        let account: string | undefined;
        let wantsPayload = false;
        for (let i = 1; i < argv.length; i += 1) {
          const flag = argv[i];
          if (flag === '-s') service = argv[(i += 1)];
          else if (flag === '-a') account = argv[(i += 1)];
          else if (flag === '-w') wantsPayload = true;
          else return { code: 1, stdout: '' };
        }
        if (service === undefined) return { code: 1, stdout: '' };
        const at = find(service, account);
        const item = at < 0 ? undefined : rows[at];
        if (argv[0] === 'find-generic-password') {
          if (item === undefined) return { code: 44, stdout: '' };
          if (wantsPayload) {
            // PHASE 281.1. The real program prints raw only when every byte
            // is 0x20-0x7E and lowercase hex otherwise, so a tab or any
            // non-ASCII character prints hex. The predicate is the shipping
            // decoder's own, and `p281-stores-address.test.ts` pins it
            // against measured rows so the two cannot be wrong together.
            const body = securityPrintsRaw(item.payload)
              ? item.payload
              : Buffer.from(item.payload, 'utf8').toString('hex');
            return { code: 0, stdout: `${body}\n` };
          }
          return {
            code: 0,
            stdout: `keychain: "login"\nattributes:\n    "acct"<blob>="${item.account}"\n    "mdat"<timedate>=0x3230  "${item.modified ?? '20260903000000Z'}"\n    "svce"<blob>="${item.service}"\n`
          };
        }
        if (argv[0] === 'delete-generic-password') {
          if (wantsPayload) return { code: 1, stdout: '' };
          if (item === undefined) return { code: 44, stdout: '' };
          rows.splice(at, 1);
          return { code: 0, stdout: '' };
        }
        return { code: 1, stdout: '' };
      }
    }
  };
}

function makeStores(w: World): import('../src/main/credentials/stores').StoreDeps {
  return {
    runner: {
      run: async (argv) => {
        w.argvs.push([...argv]);
        return { code: 1, stdout: '' };
      }
    },
    readText: async (path) => {
      const left = w.breakReads.get(path);
      if (left !== undefined && left > 0) {
        w.breakReads.set(path, left - 1);
        throw new Error('unreadable');
      }
      const shifted = w.shifting.get(path);
      if (shifted !== undefined) {
        // THE SECOND READ DISAGREES WITH THE FIRST, which is a store caught in
        // the middle of the vendor rewriting it. This read answers what is
        // there and the NEXT one answers the shifted value.
        w.shifting.delete(path);
        const now = w.files.get(path) ?? null;
        w.files.set(path, shifted);
        return now;
      }
      return w.files.get(path) ?? null;
    },
    writeText: async (path, text) => {
      w.files.set(path, w.corruptStaged ? `${text}-corrupted` : text);
    },
    renamePath: async (from, to) => {
      const value = w.files.get(from);
      if (value === undefined) throw new Error('nothing staged');
      w.files.set(to, value);
      w.files.delete(from);
    },
    removePath: async (path) => {
      w.files.delete(path);
    },
    env: {},
    home: '/home',
    keychainForClaude: false,
    userName: 'gate',
    wait: async () => undefined
  };
}

function makeVault(): import('../src/main/credentials/vault').VaultBackend & {
  slots: Map<string, string>;
  refuse: Set<string>;
} {
  const slots = new Map<string, string>();
  const refuse = new Set<string>();
  return {
    slots,
    refuse,
    get: async (slot) => slots.get(slot) ?? null,
    put: async (slot, value) => {
      if (refuse.has(slot)) throw new Error('refused');
      slots.set(slot, value);
    },
    del: async (slot) => {
      slots.delete(slot);
    }
  };
}

/**
 * PHASE 304. The seal every sealed-vault arm here hands the SHIPPING
 * `sealedVault`, standing in for Electron's `safeStorage`, which no plain node
 * process has. It is base64 behind a marker and it is NOT a cipher: what it is
 * for is telling a file that went through `seal.wrap` from one that holds the
 * payload as written, which is rule 22's clause (b) and the ablation "the
 * seal dropped". A blob it did not make opens as null, the way a file sealed
 * under somebody else's key does under the real one. The marker carries a
 * counter so two wraps of the same text are two DIFFERENT blobs, which is
 * what lets the read-back arm of rule 17 refuse exactly one of them.
 */
const SEAL_MARK = 'p304:';
function injectedSeal(): import('../src/main/credentials/vault').VaultSeal & {
  wraps: number;
  opens: number;
} {
  const seal = {
    wraps: 0,
    opens: 0,
    wrap: (text: string): string | null => {
      seal.wraps += 1;
      return `${SEAL_MARK}${String(seal.wraps)}:${Buffer.from(text, 'utf8').toString('base64')}`;
    },
    open: (blob: string): string | null => {
      seal.opens += 1;
      const found = /^p304:\d+:([A-Za-z0-9+/=]*)$/.exec(blob);
      return found === null ? null : Buffer.from(found[1] ?? '', 'base64').toString('utf8');
    }
  };
  return seal;
}

/** The legacy arm over the measured `security`, as `index.ts` composes it. */
function legacyOver(
  runner: import('../src/main/credentials/security').SecurityRunner,
  root: string
): import('../src/main/credentials/vault').LegacyVault {
  return vault.legacyKeychainVault(runner, root);
}

/** The sealed vault for one logins root, at the place `index.ts` puts it. */
function sealedFor(
  root: string,
  seal: import('../src/main/credentials/vault').VaultSeal,
  legacy: import('../src/main/credentials/vault').LegacyVault
): import('../src/main/credentials/vault').VaultBackend {
  return vault.sealedVault(join(root, 'kept'), seal, legacy);
}

/** The sealed file for one slot under one root: its text, or null. */
function sealedFileOf(root: string, slot: string): string | null {
  try {
    return readFileSync(join(root, 'kept', `${slot}.cred`), 'utf8');
  } catch {
    return null;
  }
}

/**
 * An in-memory set of the lock seams (Phase 211), so a claude write in this
 * gate takes NO real file-system lock. It records every directory it made, so
 * a claude write can be seen to hold the locks, and its clock is driven by the
 * lock's own sleep so a wait is deterministic.
 */
function inMemoryLockDeps() {
  const dirs = new Set<string>();
  const mtime = new Map<string, number>();
  const made: string[] = [];
  let clock = 1_000;
  const deps: import('../src/main/credentials/locks').LockDeps = {
    mkdir: (p) => {
      if (dirs.has(p)) return false;
      dirs.add(p);
      mtime.set(p, clock);
      made.push(p);
      return true;
    },
    mtimeMs: (p) => (dirs.has(p) ? (mtime.get(p) ?? clock) : null),
    rmdir: (p) => {
      dirs.delete(p);
      mtime.delete(p);
    },
    touch: (p) => mtime.set(p, clock),
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    setInterval: () => ({ clear: () => undefined })
  };
  return {
    deps,
    made,
    dirs,
    setClock: (v: number) => (clock = v),
    ageOf: (p: string) => clock - (mtime.get(p) ?? clock)
  };
}

function makeWorld(): World {
  return {
    files: new Map(),
    breakReads: new Map(),
    shifting: new Map(),
    argvs: [],
    stdins: [],
    corruptStaged: false
  };
}

function makeDeps(
  root: string,
  w: World,
  live: import('../src/main/credentials/keep').LiveSession[] = []
): import('../src/main/credentials/keep').KeepDeps & {
  vault: ReturnType<typeof makeVault>;
} {
  return {
    root,
    vault: makeVault(),
    stores: makeStores(w),
    liveSessions: async () => live,
    now: () => 1_700_000_000_000,
    // PHASE 211. In-memory locks, so a claude write takes no real lock.
    lockDeps: inMemoryLockDeps().deps
  };
}

const CODEX_DEFAULT = '/home/.codex/auth.json';
const CLAUDE_DEFAULT_CRED = '/home/.claude/.credentials.json';
const CLAUDE_DEFAULT_ACCOUNT = '/home/.claude.json';

const said: string[] = [];

/**
 * A file this probe reads for the leak scan, or the empty string.
 *
 * IT IS DEFENSIVE ON PURPOSE. An ABLATED domain may never write one of these
 * files at all, and a probe that threw would report "could not run" rather
 * than the reading the ablation actually moved, which is how a suite goes red
 * for the wrong reason.
 */
function textOf(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

try {
  // -------------------------------------------------------------------------
  // 1. THE CAPTURE. A store is kept, and the account it replaced is promoted
  //    into a login of Tortie's own named from its address.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    w.files.set(CODEX_DEFAULT, codexCredential('alice', '1'));
    const d = makeDeps(root, w);
    const first = await keep.observeProvider(d, 'codex');
    const defaultSlot = vault.slotFor('codex', null);
    const kept1 = d.vault.slots.get(defaultSlot) ?? null;

    // THE PERSON TYPES /login. Nothing in Tortie did this.
    w.files.set(CODEX_DEFAULT, codexCredential('bob', '2'));
    const second = await keep.observeProvider(d, 'codex');
    const rows = readLoginsFile(root).file.logins;
    const promotedRow = rows.find((r) => r.name === 'alice.example') ?? null;
    const promotedSlot =
      promotedRow === null ? null : vault.slotFor('codex', promotedRow.id);
    for (const event of [...first.events, ...second.events]) said.push(event.says);

    const promotedFacts =
      promotedRow === null ? null : (second.facts.get(promotedRow.id) ?? null);
    out['capture'] = {
      keptFirst: kept1 === codexCredential('alice', '1'),
      // THE PROMOTED LOGIN'S OWN ROW, IN THE SAME OBSERVATION. The app run of
      // this phase found it missing: the list of stores is read before the
      // promotion, so the new login had no facts for five seconds and drew
      // `Not signed in yet`, which is the Phase 203 defect in a new shape.
      promotedFactsKept: promotedFacts?.kept ?? false,
      promotedFactsRestores: promotedFacts?.restores ?? false,
      promotedFactsEmail: promotedFacts?.email ?? null,
      events: first.events.map((e) => e.kind),
      promotedName: promotedRow?.name ?? null,
      promotedKind: second.events.map((e) => e.kind),
      // THE OUTGOING BYTES ARE THE ONES THAT WERE IN THE STORE, byte for byte.
      promotedBytesExact:
        promotedSlot !== null &&
        d.vault.slots.get(promotedSlot) === codexCredential('alice', '1'),
      defaultNowHoldsIncoming:
        d.vault.slots.get(defaultSlot) === codexCredential('bob', '2'),
      // THE PERSON'S OWN STORE WAS NOT WRITTEN.
      ownStoreUntouched: w.files.get(CODEX_DEFAULT) === codexCredential('bob', '2'),
      recordHasNoToken: !textOf(kept.keptFileIn(root)).includes(TOKEN),
      loginsFileHasNoToken: !textOf(loginsFileIn(root)).includes(TOKEN)
    };
  }

  // -------------------------------------------------------------------------
  // 2. CLAUDE PARITY, with the address in the file beside the credential.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    w.files.set(CLAUDE_DEFAULT_CRED, claudeCredential('carol', '1'));
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('carol'));
    const d = makeDeps(root, w);
    await keep.observeProvider(d, 'claude');
    w.files.set(CLAUDE_DEFAULT_CRED, claudeCredential('dave', '2'));
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('dave'));
    const seen = await keep.observeProvider(d, 'claude');
    const row = readLoginsFile(root).file.logins.find((r) => r.name === 'carol.example');
    out['claude'] = {
      promoted: seen.events.some((e) => e.kind === 'promoted'),
      name: row?.name ?? null,
      bytesExact:
        row !== undefined &&
        d.vault.slots.get(vault.slotFor('claude', row.id)) ===
          claudeCredential('carol', '1')
    };
    for (const event of seen.events) said.push(event.says);
  }

  // -------------------------------------------------------------------------
  // 3. THE ROUND TRIP MATRIX. Every ordered pair, switched and switched back,
  //    and NOTHING is lost at any hop.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const who = ['alice', 'bob', 'carol'];
    const d = makeDeps(root, w);
    // Sign each account into the default store in turn, which is what a person
    // typing /login produces. Each one promotes the one before, so a FOURTH
    // sign in is what gives the third account a login of its own; the account
    // sitting in the default store is reachable as the default row and is not
    // promoted, which is the design rather than a gap.
    for (const [i, name] of [...who, 'dana'].entries()) {
      w.files.set(CODEX_DEFAULT, codexCredential(name, String(i)));
      await keep.observeProvider(d, 'codex');
    }
    const logins = readLoginsFile(root).file.logins;
    const bytesFor = new Map<string, string>();
    for (const [i, name] of who.entries()) {
      bytesFor.set(name, codexCredential(name, String(i)));
    }
    const pairs: Record<string, unknown>[] = [];
    for (const from of who) {
      for (const to of who) {
        if (from === to) continue;
        const fromRow = logins.find((l) => l.name === `${from}.example`);
        const toRow = logins.find((l) => l.name === `${to}.example`);
        if (fromRow === undefined || toRow === undefined) {
          pairs.push({ from, to, ok: false, why: 'a login is missing altogether' });
          continue;
        }
        const hop = async (
          name: string
        ): Promise<import('../src/main/credentials/keep').ActivateResult> =>
          keep.activateLogin(d, 'codex', name);
        const one = await hop(fromRow.name);
        const two = await hop(toRow.name);
        const back = await hop(fromRow.name);
        // EVERY ACCOUNT IS STILL THERE, byte for byte, after the round trip.
        const stillThere = who.every((name) => {
          const row = logins.find((l) => l.name === `${name}.example`);
          if (row === undefined) return name === who[who.length - 1];
          const bytes = d.vault.slots.get(vault.slotFor('codex', row.id));
          return bytes === bytesFor.get(name);
        });
        const dirOf = (id: string): string => loginDirIn(root, 'codex', id);
        pairs.push({
          from,
          to,
          ok: one.ok && two.ok && back.ok && stillThere,
          hops: [one.ok, two.ok, back.ok],
          stillThere,
          // AND THE STORE THE CHOSEN LOGIN RUNS UNDER REALLY HOLDS IT.
          storeHolds:
            w.files.get(join(dirOf(fromRow.id), 'auth.json')) ===
            bytesFor.get(from)
        });
      }
    }
    out['roundTrip'] = {
      accounts: logins.map((l) => l.name),
      pairs,
      allOk: pairs.every((p) => p['ok'] === true && p['storeHolds'] === true)
    };
  }

  // -------------------------------------------------------------------------
  // 4. THE INTERRUPTED WRITE. Stopped after each step, the store holds the old
  //    credential or the new one and never neither.
  //
  //    IT IS DRIVEN AT THE WRITE rather than through the choice, because the
  //    choice observes first and would reconcile the two values away before
  //    the write happened, which is correct behaviour and a useless fixture.
  //    The target is composed by the SHIPPING storeTarget over a real login
  //    directory, so what is interrupted is the write the product performs.
  // -------------------------------------------------------------------------
  {
    const arms: Record<string, unknown>[] = [];
    for (const step of ['stage', 'verify', 'commit', undefined] as const) {
      const root = freshRoot();
      const w = makeWorld();
      const d = makeDeps(root, w);
      const added = addLogin(root, 'codex', 'Spare');
      const row = readLoginsFile(root).file.logins[0];
      const dir = row === undefined ? '' : loginDirIn(root, 'codex', row.id);
      const path = join(dir, 'auth.json');
      const older = codexCredential('alice', 'older');
      const newer = codexCredential('alice', 'newer');
      w.files.set(path, older);
      const target = await stores.storeTarget(d.stores, 'codex', dir);
      const done =
        target === null
          ? { ok: false as const, reason: 'no target' }
          : await swap.safeSwap(target, newer, step);
      const after = w.files.get(path) ?? null;
      arms.push({
        step: step ?? 'none',
        added: added.ok,
        ok: done.ok,
        // ONE OR THE OTHER AND NEVER NEITHER.
        holdsOneOfThem: after === older || after === newer,
        holdsSomething: after !== null,
        stillACredential:
          after !== null && payload.isCredentialPayload('codex', after),
        // WHERE THE INTERRUPTION LEAVES IT, per step. Stopped before the
        // commit the store still holds the old credential; stopped after the
        // commit it holds the new one and the answer is still a refusal,
        // because the confirming read never happened. Both are "one or the
        // other", which is the property, and this pins WHICH one so a step
        // that silently stopped doing its work shows up.
        landedWhereExpected:
          step === 'stage' || step === 'verify'
            ? after === older
            : after === newer,
        // NO STAGED COPY IS LEFT BEHIND on the happy path.
        stagedLeft: [...w.files.keys()].some((k) => k.endsWith('tortie-pending'))
      });
    }
    out['interrupted'] = arms;
  }

  // -------------------------------------------------------------------------
  // 5. THE ROLLBACK. A staged copy that does not read back equal leaves the
  //    store exactly as it was.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const d = makeDeps(root, w);
    addLogin(root, 'codex', 'Spare');
    const row = readLoginsFile(root).file.logins[0];
    const dir = row === undefined ? '' : loginDirIn(root, 'codex', row.id);
    const path = join(dir, 'auth.json');
    const older = codexCredential('alice', 'older');
    w.files.set(path, older);
    w.corruptStaged = true;
    const target = await stores.storeTarget(d.stores, 'codex', dir);
    const done =
      target === null
        ? { ok: false as const, reason: 'no target' }
        : await swap.safeSwap(target, codexCredential('alice', 'newer'));
    out['rollback'] = {
      refused: !done.ok,
      reason: done.ok ? '' : done.reason,
      // THE STORE IS EXACTLY AS IT WAS.
      unchanged: w.files.get(path) === older,
      // AND THE REFUSAL NAMES NO PAYLOAD.
      reasonHasNoToken: done.ok ? true : !done.reason.includes(TOKEN)
    };
    // AND THE SAME PROPERTY ON TORTIE'S OWN STORE, through the one write.
    const bad: import('../src/main/credentials/swap').SwapTarget = {
      read: async () => 'old',
      stage: async () => undefined,
      readStaged: async () => 'not what was staged',
      commit: async () => {
        throw new Error('this must never be reached');
      },
      discard: async () => undefined
    };
    const wrote = await swap.safeSwap(bad, 'new');
    out['rollbackOwn'] = { refused: !wrote.ok, reason: wrote.ok ? '' : wrote.reason };
  }

  // -------------------------------------------------------------------------
  // 6. THE PERSON'S OWN LOCATION IS NEVER A WRITE TARGET.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const d = makeDeps(root, w);
    w.files.set(CODEX_DEFAULT, codexCredential('alice', '1'));
    await keep.observeProvider(d, 'codex');
    const before = w.files.get(CODEX_DEFAULT) ?? null;
    const target = await stores.storeTarget(d.stores, 'codex', null);
    const claudeTarget = await stores.storeTarget(d.stores, 'claude', null);
    const chose = await keep.activateLogin(d, 'codex', 'Default');
    out['defaultStore'] = {
      codexTargetIsNull: target === null,
      claudeTargetIsNull: claudeTarget === null,
      chooseOk: chose.ok,
      wrote: chose.ok ? chose.wrote : true,
      untouched: w.files.get(CODEX_DEFAULT) === before,
      // NOT ONE FILE OUTSIDE THE SCRATCH ROOT WAS WRITTEN in this whole arm.
      pathsWritten: [...w.files.keys()].filter((k) => k !== CODEX_DEFAULT).length
    };
  }

  // -------------------------------------------------------------------------
  // 7. A STORE UNDER A RUNNING SESSION IS WRITTEN, NOT REFUSED (Phase 211).
  //
  //    The operator asked for this: a switch should reach the running session.
  //    A session on a NON-default login writes only that login's own store; a
  //    session on the DEFAULT login also writes the vendor's own location, so
  //    the running default session follows.
  // -------------------------------------------------------------------------
  {
    // 7a. A session on the login itself: the write happens, the default store
    //     is left alone.
    const root = freshRoot();
    const w = makeWorld();
    w.files.set(CODEX_DEFAULT, codexCredential('alice', '1'));
    const idle = makeDeps(root, w);
    await keep.observeProvider(idle, 'codex');
    w.files.set(CODEX_DEFAULT, codexCredential('bob', '2'));
    await keep.observeProvider(idle, 'codex');
    const row = readLoginsFile(root).file.logins.find((l) => l.name === 'alice.example');
    const dir = row === undefined ? '' : loginDirIn(root, 'codex', row.id);
    const busy = {
      ...idle,
      liveSessions: async () => [
        { provider: 'codex' as LoginProviderId, login: 'alice.example' }
      ]
    };
    const done = await keep.activateLogin(busy, 'codex', 'alice.example');

    // 7b. A session on the DEFAULT login: the vendor's own location is written.
    const droot = freshRoot();
    const dw = makeWorld();
    dw.files.set(CODEX_DEFAULT, codexCredential('alice', '1'));
    const dd = makeDeps(droot, dw, [{ provider: 'codex' as LoginProviderId, login: null }]);
    await keep.observeProvider(dd, 'codex');
    dw.files.set(CODEX_DEFAULT, codexCredential('bob', '2'));
    await keep.observeProvider(dd, 'codex');
    const drow = readLoginsFile(droot).file.logins.find((l) => l.name === 'alice.example');
    const defLift = await keep.activateLogin(dd, 'codex', 'alice.example');

    out['running'] = {
      // THE WRITE HAPPENS rather than being refused.
      wrote: done.ok === true && done.ok && done.wrote === true,
      // The login's own store now holds the account.
      ownStoreWritten:
        w.files.get(join(dir, 'auth.json')) === codexCredential('alice', '1'),
      // A NON-default session leaves the person's own location untouched.
      defaultUntouchedForNonDefault:
        w.files.get(CODEX_DEFAULT) === codexCredential('bob', '2'),
      // THE DEFAULT LIFT: a session on the default login writes the vendor's own
      // location with the chosen account, so it follows.
      defaultLiftWrote: defLift.ok === true && defLift.ok && defLift.wrote === true,
      defaultStoreNowHolds:
        dw.files.get(CODEX_DEFAULT) === codexCredential('alice', '1'),
      defaultLoginExists: drow !== undefined
    };
  }

  // -------------------------------------------------------------------------
  // 7k. THE SESSION EVIDENCE, AND THE UNCLASSIFIED THROW (Phase 220).
  //
  //    Three answers to "which sessions are running" and two throws that no
  //    branch of the activation classifies. At the parent an UNAVAILABLE answer
  //    was read as an empty list, so a switch that never reached the running
  //    agent answered in the same bytes as one that had nothing to reach; and a
  //    throw left `activateLogin` uncaught for the registrar to swallow.
  // -------------------------------------------------------------------------
  {
    /**
     * One promoted codex login over a world of its own, so each arm below
     * starts from the same place a person is in after one `/login`.
     */
    const world = async (): Promise<{
      d: import('../src/main/credentials/keep').KeepDeps & {
        vault: ReturnType<typeof makeVault>;
      };
      w: World;
      root: string;
      dir: string;
      name: string;
    }> => {
      const root = freshRoot();
      const w = makeWorld();
      w.files.set(CODEX_DEFAULT, codexCredential('alice', '1'));
      const d = makeDeps(root, w);
      await keep.observeProvider(d, 'codex');
      w.files.set(CODEX_DEFAULT, codexCredential('bob', '2'));
      await keep.observeProvider(d, 'codex');
      const row = readLoginsFile(root).file.logins.find(
        (l) => l.name === 'alice.example'
      );
      return {
        d,
        w,
        root,
        dir: row === undefined ? '' : loginDirIn(root, 'codex', row.id),
        name: 'alice.example'
      };
    };

    const asked = (
      live: () => Promise<import('../src/main/credentials/keep').LiveSession[]>
    ) => live;

    // A. THE ANSWER CANNOT BE HAD, with a default session running.
    const a = await world();
    const aResult = await keep.activateLogin(
      {
        ...a.d,
        liveSessions: asked(async () => {
          throw new Error('the manifest is not open');
        })
      },
      'codex',
      a.name
    );
    // B. A KNOWN EMPTY ANSWER. Phase 211 untouched: the login's own store is
    //    written and the person's own location is not.
    const b = await world();
    const bResult = await keep.activateLogin(
      { ...b.d, liveSessions: asked(async () => []) },
      'codex',
      b.name
    );
    // C. A KNOWN DEFAULT SESSION. The default lift happens.
    const c = await world();
    const cResult = await keep.activateLogin(
      {
        ...c.d,
        liveSessions: asked(async () => [
          { provider: 'codex' as LoginProviderId, login: null }
        ])
      },
      'codex',
      c.name
    );

    // D. AN UNCLASSIFIED THROW WITH NOTHING WRITTEN YET. The record file stops
    //    being writable the instant the sessions are asked, which is after the
    //    activation's own observe and before its first lift. The login's own
    //    store already holds the chosen account, so lift 1 moves nothing, and
    //    the person's own location holds a third account, so lift 2 must keep
    //    it before it writes and that keep is the write that throws.
    const breakRecord = (root: string): void => {
      const path = join(root, 'kept.json');
      rmSync(path, { force: true, recursive: true });
      mkdirSync(path, { recursive: true });
    };
    const d1 = await world();
    d1.w.files.set(join(d1.dir, 'auth.json'), codexCredential('alice', '1'));
    d1.w.files.set(CODEX_DEFAULT, codexCredential('carol', '3'));
    let threw1 = false;
    let d1Result: import('../src/main/credentials/keep').ActivateResult | null = null;
    try {
      d1Result = await keep.activateLogin(
        {
          ...d1.d,
          liveSessions: asked(async () => {
            breakRecord(d1.root);
            return [{ provider: 'codex' as LoginProviderId, login: null }];
          })
        },
        'codex',
        d1.name
      );
    } catch {
      threw1 = true;
    }

    // E. THE SAME THROW, AFTER A CONFIRMED WRITE. The record file goes away the
    //    moment the person's own location is READ for the switch, which is
    //    inside the second lift and therefore after the first one has written
    //    the login's own store. That is the partial outcome, and it is the one
    //    the person must be told about rather than have hidden.
    const e1 = await world();
    let threw2 = false;
    let eResult: import('../src/main/credentials/keep').ActivateResult | null = null;
    try {
      eResult = await keep.activateLogin(
        {
          ...e1.d,
          liveSessions: asked(async () => [
            { provider: 'codex' as LoginProviderId, login: null }
          ]),
          stores: {
            ...e1.d.stores,
            readText: async (path: string) => {
              if (
                path.startsWith(CODEX_DEFAULT) &&
                e1.w.files.has(join(e1.dir, 'auth.json'))
              ) {
                breakRecord(e1.root);
              }
              return e1.d.stores.readText(path);
            }
          }
        },
        'codex',
        e1.name
      );
    } catch {
      threw2 = true;
    }

    out['evidence'] = {
      // A. REFUSED, in a sentence, with neither activation target written.
      unavailableRefused: aResult.ok === false,
      unavailableSays:
        aResult.ok === false && aResult.reason.includes('could not check which sessions are running'),
      unavailableWroteOwn: a.w.files.has(join(a.dir, 'auth.json')),
      unavailableWroteDefault: a.w.files.get(CODEX_DEFAULT) !== codexCredential('bob', '2'),
      // B and C. THE TWO KNOWN ANSWERS ARE UNCHANGED, and they differ from each
      // other, which is what the parent could not say about A and B.
      emptyOk: bResult.ok === true && bResult.ok && bResult.wrote === true,
      emptyWroteOwn: b.w.files.get(join(b.dir, 'auth.json')) === codexCredential('alice', '1'),
      emptyLeftDefault: b.w.files.get(CODEX_DEFAULT) === codexCredential('bob', '2'),
      runningOk: cResult.ok === true && cResult.ok && cResult.wrote === true,
      runningLiftedDefault:
        c.w.files.get(CODEX_DEFAULT) === codexCredential('alice', '1'),
      // D. THE UNCERTAIN OUTCOME: classified, refused, and it says which store.
      uncertainThrew: threw1,
      uncertainRefused: d1Result !== null && d1Result.ok === false,
      uncertainNamesTheStore:
        d1Result !== null &&
        d1Result.ok === false &&
        d1Result.reason.includes(d1.name) &&
        d1Result.reason.includes('every account Tortie keeps is still here'),
      // NOTHING WAS WRITTEN in that arm: the store it names still holds what it
      // held, and the person's own location was never reached.
      uncertainWroteNothing:
        d1.w.files.get(CODEX_DEFAULT) === codexCredential('carol', '3'),
      // E. THE PARTIAL OUTCOME: the confirmed write is reported, not hidden.
      partialThrew: threw2,
      partialReported: eResult !== null && eResult.ok === true && eResult.ok && eResult.wrote === true,
      partialSays:
        eResult !== null &&
        eResult.ok === true &&
        eResult.ok &&
        eResult.says.includes('did not finish'),
      partialKeptTheWrite:
        e1.w.files.get(join(e1.dir, 'auth.json')) === codexCredential('alice', '1'),
      // AND NOTHING WAS ROLLED BACK over the account that was there.
      partialRecoverable: readLoginsFile(e1.root)
        .file.logins.map((l) => l.name)
        .includes('bob.example')
    };
  }

  // -------------------------------------------------------------------------
  // 7c. THE LOCKS (Phase 211). Claude Code's own credential locks, cooperated
  //     with, driven over the SHIPPING lock module and in-memory seams.
  // -------------------------------------------------------------------------
  {
    const locks = (await import(
      pathToFileURL(resolve(MODULES, 'locks.ts')).href
    )) as typeof import('../src/main/credentials/locks');

    // RECLAIM a stale holder: a directory older than the staleness bound is
    // retaken and acquire succeeds.
    const reclaim = inMemoryLockDeps();
    reclaim.deps.mkdir('/scratch/.oauth_refresh.lock');
    reclaim.setClock(1_000 + locks.CREDENTIALS_STALENESS_MS + 10_000);
    let reclaimed = false;
    try {
      const h = await locks.acquireLock('/scratch/.oauth_refresh.lock', {
        lockName: 'x',
        deps: reclaim.deps
      });
      reclaimed = true;
      h.release();
    } catch {
      reclaimed = false;
    }

    // NEVER STEAL a live holder: a directory whose mtime always reads as now is
    // never taken, and acquire refuses when the wait runs out.
    const live = inMemoryLockDeps();
    live.deps.mkdir('/scratch/.oauth_refresh.lock');
    let neverStole = false;
    let refusalNamesLock = false;
    let refusalHasNoToken = true;
    try {
      await locks.acquireLock('/scratch/.oauth_refresh.lock', {
        lockName: '.oauth_refresh.lock',
        timeoutMs: 5_000,
        deps: { ...live.deps, mtimeMs: () => live.deps.now() }
      });
    } catch (err) {
      neverStole = live.dirs.has('/scratch/.oauth_refresh.lock');
      const message = (err as Error).message;
      refusalNamesLock = message.includes('.oauth_refresh.lock');
      refusalHasNoToken = !/accessToken|access_token|Bearer|eyJ/.test(message);
    }

    // THE TWO LOCKS, in the vendor's order, and never the .claude.json lock.
    const both = inMemoryLockDeps();
    await locks.withClaudeCredentialLocks(
      '/home/.claude',
      async () => undefined,
      both.deps
    );
    const lockDirs = both.made.filter(
      (p) => p.endsWith('.lock') || p.endsWith('.storage-write')
    );

    // THE LEGACY LOCK IS NAMED FROM THE REAL PATH (fix round): a config home
    // that is a symbolic link locks beside its target, as the vendor does.
    const linkRoot = freshRoot();
    const realHome = join(linkRoot, 'real-home');
    const linkHome = join(linkRoot, 'link-home');
    mkdirSync(realHome, { recursive: true });
    symlinkSync(realHome, linkHome);
    const legacyOfLink = locks.legacyClaudeLockDir(linkHome);
    const legacyOfReal = locks.legacyClaudeLockDir(realHome);

    // CODEX HOLDS NOTHING: withCodexNoLock makes no directory at all.
    const codex = inMemoryLockDeps();
    let codexRan = false;
    await locks.withCodexNoLock(async () => {
      codexRan = true;
    });

    // UNWRITABLE (fix round): the lock directory cannot be made at all, so the
    // refusal is immediate, names the lock, says why, and costs no wait.
    const unw = inMemoryLockDeps();
    let unwSleeps = 0;
    const unwDeps = {
      ...unw.deps,
      mkdir: (): boolean => {
        throw new Error('EACCES');
      },
      sleep: async (ms: number): Promise<void> => {
        unwSleeps += 1;
        await unw.deps.sleep(ms);
      }
    };
    const unwStart = unw.deps.now();
    let unwRefused = false;
    let unwMessage = '';
    try {
      await locks.acquireLock('/scratch/.oauth_refresh.lock', {
        lockName: '.oauth_refresh.lock',
        deps: unwDeps
      });
    } catch (err) {
      unwRefused = err instanceof locks.LockHeld && err.why === 'unwritable';
      unwMessage = (err as Error).message;
    }
    const unwWaited = unw.deps.now() - unwStart;

    // THE NULL BRANCH SLEEPS (fix round): a seam answering "not made" and "not
    // there" together for ever must not spin the loop. The clock here ticks
    // one ms per read, so a loop with no sleep runs to the timeout on reads
    // alone and is counted by its silence.
    let tick = 0;
    let nullSleeps = 0;
    const spin = {
      ...unw.deps,
      mkdir: (): boolean => false,
      mtimeMs: (): number | null => null,
      now: (): number => (tick += 1),
      sleep: async (ms: number): Promise<void> => {
        nullSleeps += 1;
        tick += ms;
      }
    };
    try {
      await locks.acquireLock('/scratch/x.lock', { lockName: 'x', timeoutMs: 2_000, deps: spin });
    } catch {
      // The refusal is the point; what is read is how it waited.
    }

    out['locks'] = {
      reclaimed,
      neverStole,
      refusalNamesLock,
      refusalHasNoToken,
      unwritableImmediate: unwRefused && unwWaited === 0 && unwSleeps === 0,
      unwritableSaysWhy: unwMessage.includes('.oauth_refresh.lock') && /not writable/.test(unwMessage),
      unwritableNoToken: !/accessToken|access_token|Bearer|eyJ/.test(unwMessage),
      nullBranchSleeps: nullSleeps > 0,
      locksInOrder:
        lockDirs.length === 3 &&
        lockDirs[0] === '/home/.claude/.oauth_refresh.lock' &&
        lockDirs[1] === '/home/.claude.lock' &&
        lockDirs[2] === '/home/.claude/.storage-write',
      // Every lock released, in the reverse order, whatever the run did.
      allReleased: !lockDirs.some((p) => both.dirs.has(p)),
      legacyNamedFromRealPath:
        legacyOfLink === `${realpathSync(realHome)}.lock` && legacyOfLink === legacyOfReal,
      neverTheJsonLock: !both.made.some((p) => p.includes('.claude.json.lock')),
      codexRan,
      codexMadeNoLock: codex.made.length === 0
    };
  }

  // -------------------------------------------------------------------------
  // 7d. A CLAUDE WRITE HOLDS THE LOCKS (Phase 211). Driven over the shipping
  //     activate with an in-memory lock set, so the lock directories it made
  //     are visible: a claude switch under a running session takes both.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const security = fakeSecurity(w);
    const lockMem = inMemoryLockDeps();
    const base = makeDeps(root, w);
    const d = {
      ...base,
      stores: { ...base.stores, runner: security.runner, keychainForClaude: true },
      lockDeps: lockMem.deps
    };
    security.items.set('Claude Code-credentials', {
      account: GATE_ACCOUNT,
      payload: claudeCredential('alice', '1')
    });
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('alice'));
    await keep.observeProvider(d, 'claude');
    security.items.set('Claude Code-credentials', {
      account: GATE_ACCOUNT,
      payload: claudeCredential('bob', '2')
    });
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('bob'));
    await keep.observeProvider(d, 'claude');
    const row = readLoginsFile(root).file.logins.find((l) => l.name === 'alice.example');
    lockMem.made.length = 0; // count only the activate's locks
    const put =
      row === undefined
        ? { ok: false as const }
        : await keep.activateLogin(d, 'claude', row.name);
    // A STABLE SHAPE, so this reading moves only when the locks change. The
    // paths carry a fresh temp directory every run, so they are reduced to a
    // count and to the two vendor BASENAMES, both of which are deterministic.
    const lockNames = lockMem.made
      .filter((p) => p.endsWith('.lock') || p.endsWith('.storage-write'))
      .map((p) =>
        p.endsWith('.oauth_refresh.lock')
          ? 'oauth'
          : p.endsWith('.storage-write')
            ? 'storage'
            : basename(p)
      )
      .sort();
    out['claudeLock'] = {
      wrote: put.ok === true,
      // ALL THREE LOCKS were taken during the claude write.
      lockCount: lockNames.length,
      heldAll: lockNames.length >= 3 && lockNames.includes('oauth') && lockNames.includes('storage')
    };
  }

  // -------------------------------------------------------------------------
  // 7g. A HELD LOCK IS A REFUSAL, NOT A THROW (Phase 211 fix round). The
  //     verifier held a lock past the wait and watched `LockHeld` leave
  //     activate uncaught; the registrar then recorded the choice and the face
  //     said the login was switched with nothing written. So a lock held for
  //     the whole wait must come back as `{ ok: false }` naming the lock.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const security = fakeSecurity(w);
    const lockMem = inMemoryLockDeps();
    const base = makeDeps(root, w);
    const d = {
      ...base,
      stores: { ...base.stores, runner: security.runner, keychainForClaude: true },
      // A LIVE HOLDER on every lock: whatever directory is asked about reads as
      // touched just now, and the primary is already there.
      lockDeps: { ...lockMem.deps, mtimeMs: () => lockMem.deps.now() }
    };
    security.items.set('Claude Code-credentials', {
      account: GATE_ACCOUNT,
      payload: claudeCredential('alice', '1')
    });
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('alice'));
    await keep.observeProvider(d, 'claude');
    security.items.set('Claude Code-credentials', {
      account: GATE_ACCOUNT,
      payload: claudeCredential('bob', '2')
    });
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('bob'));
    await keep.observeProvider(d, 'claude');
    const row = readLoginsFile(root).file.logins.find((l) => l.name === 'alice.example');
    const dir = row === undefined ? '' : loginDirIn(root, 'claude', row.id);
    // The holder: the primary lock of the login's own config home, made before
    // activate asks for it.
    lockMem.deps.mkdir(join(dir, '.oauth_refresh.lock'));
    let threw = false;
    let put: Awaited<ReturnType<typeof keep.activateLogin>> = { ok: false, reason: '' };
    try {
      put = row === undefined ? put : await keep.activateLogin(d, 'claude', row.name);
    } catch {
      threw = true;
    }
    out['lockRefusal'] = {
      threw,
      refused: put.ok === false,
      reasonNamesLock: put.ok === false && put.reason.includes('.oauth_refresh.lock'),
      reasonHasNoToken: put.ok === false && !/accessToken|access_token|Bearer|eyJ/.test(put.reason),
      // The holder's directory is still there: it was waited on, never stolen.
      holderKept: lockMem.dirs.has(join(dir, '.oauth_refresh.lock')),
      storeUntouched:
        security.items.get(claudeScopedService(dir)) === undefined
    };
  }

  // -------------------------------------------------------------------------
  // 7f. THE DEFAULT LIFT KEEPS THE ACCOUNT IT WRITES OVER (Phase 211 fix
  //     round). The verifier's finding, driven here over the shipping module:
  //     the default claude store holds alice in the keychain item AND in
  //     `~/.claude.json`, a login Tortie made holds bob, a session runs on the
  //     default login, and bob's login is chosen. The lift writes bob into the
  //     keychain item and never into `~/.claude.json`, which is the vendor's
  //     own file and says alice until bob takes a turn. The observe that
  //     `logins:list` runs right after the choose then reads bob's bytes under
  //     alice's identity. As shipped that proved "same account", promoted
  //     nothing, and overwrote the only copy of alice. The lift must promote
  //     alice BEFORE it writes, and move the default record on to bob after.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const security = fakeSecurity(w);
    const base = makeDeps(root, w, [{ provider: 'claude' as LoginProviderId, login: null }]);
    const d = {
      ...base,
      stores: { ...base.stores, runner: security.runner, keychainForClaude: true }
    };
    security.items.set('Claude Code-credentials', {
      account: GATE_ACCOUNT,
      payload: claudeCredential('alice', '1')
    });
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('alice'));
    await keep.observeProvider(d, 'claude');
    // A second login, signed into as bob inside a session under it.
    addLogin(root, 'claude', 'work');
    const work = readLoginsFile(root).file.logins.find((l) => l.name === 'work');
    const workDir = work === undefined ? '' : loginDirIn(root, 'claude', work.id);
    security.items.set(claudeScopedService(workDir), {
      account: GATE_ACCOUNT,
      payload: claudeCredential('bob', '1')
    });
    w.files.set(join(workDir, '.claude.json'), claudeAccountFile('bob'));
    await keep.observeProvider(d, 'claude');
    const aliceDigest = payload.credentialDigest(claudeCredential('alice', '1'));
    const bobDigest = payload.credentialDigest(claudeCredential('bob', '1'));
    // CHOOSE work while the default session runs. `~/.claude.json` is NOT
    // rewritten, which is the ordinary case: the vendor rewrites it on bob's
    // first turn, and the list's observe runs long before that.
    const put = await keep.activateLogin(d, 'claude', 'work');
    const itemAfterLift = security.items.get('Claude Code-credentials')?.payload ?? '';
    const obs = await keep.observeProvider(d, 'claude');
    const slotsAfter = [...d.vault.slots.entries()];
    const heldOutsideDefault = slotsAfter.some(
      ([slot, bytes]) => slot !== 'claude.default' && payload.credentialDigest(bytes) === aliceDigest
    );
    const logins = readLoginsFile(root).file.logins
      .filter((l) => l.provider === 'claude')
      .map((l) => l.name)
      .sort();
    const record = kept.readKeptFile(root).file.slots['claude.default'];
    out['defaultLift'] = {
      wrote: put.ok === true && put.ok && put.wrote === true,
      itemHoldsChosen: payload.credentialDigest(itemAfterLift) === bobDigest,
      // THE READING THE PHASE IS JUDGED ON: alice exists somewhere other than
      // the slot that was written over, after the observe that used to lose her.
      outgoingHeldAfterObserve: heldOutsideDefault,
      // Exactly one login for her, named from her address, and nothing minted twice.
      logins,
      // The default record moved on to the chosen account, so the next observe
      // reads unchanged bytes rather than a change it must judge.
      recordDigestIsChosen: record?.digest === bobDigest,
      recordEmailIsChosen: record?.email === 'bob@example.com',
      observeChangedNothing: obs.events.length === 0
    };
  }

  // -------------------------------------------------------------------------
  // 7i. THE LIFT READS UNDER THE LOCK (committer's round of Phase 211, the
  //     verifier's F1). The same world as 7f, and the vendor HOLDS the primary
  //     lock of the default config home the first time the lift asks for it,
  //     saving a refreshed credential for the same account while it holds it,
  //     which is what a token refresh is. Then it lets go. The refreshed bytes
  //     must be the ones kept, and the bytes whose refresh token that refresh
  //     consumed must be held nowhere. The fix round read the store, promoted
  //     and moved the record before it took the locks, so the refresh was
  //     written over after the release; the ablation is those lines swapped.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const security = fakeSecurity(w);
    const lockMem = inMemoryLockDeps();
    const base = makeDeps(root, w, [{ provider: 'claude' as LoginProviderId, login: null }]);
    let contested = 0;
    const d = {
      ...base,
      stores: { ...base.stores, runner: security.runner, keychainForClaude: true },
      lockDeps: {
        ...lockMem.deps,
        mkdir: (path: string) => {
          if (path === '/home/.claude/.oauth_refresh.lock' && contested === 0) {
            contested += 1;
            // THE VENDOR, holding its lock, saves alice's refreshed token.
            security.items.set('Claude Code-credentials', {
              account: GATE_ACCOUNT,
              payload: claudeCredential('alice', '2')
            });
            return false;
          }
          return lockMem.deps.mkdir(path);
        }
      }
    };
    security.items.set('Claude Code-credentials', {
      account: GATE_ACCOUNT,
      payload: claudeCredential('alice', '1')
    });
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('alice'));
    await keep.observeProvider(d, 'claude');
    addLogin(root, 'claude', 'work');
    const work = readLoginsFile(root).file.logins.find((l) => l.name === 'work');
    const workDir = work === undefined ? '' : loginDirIn(root, 'claude', work.id);
    security.items.set(claudeScopedService(workDir), {
      account: GATE_ACCOUNT,
      payload: claudeCredential('bob', '1')
    });
    w.files.set(join(workDir, '.claude.json'), claudeAccountFile('bob'));
    await keep.observeProvider(d, 'claude');
    const stale = payload.credentialDigest(claudeCredential('alice', '1'));
    const refreshed = payload.credentialDigest(claudeCredential('alice', '2'));
    const bobDigest = payload.credentialDigest(claudeCredential('bob', '1'));
    const put = await keep.activateLogin(d, 'claude', 'work');
    const item = security.items.get('Claude Code-credentials')?.payload ?? '';
    const obs = await keep.observeProvider(d, 'claude');
    const slots = [...d.vault.slots.entries()];
    out['liftRace'] = {
      wrote: put.ok === true && put.ok && put.wrote === true,
      contested: contested === 1,
      itemHoldsChosen: payload.credentialDigest(item) === bobDigest,
      // THE READING THE FINDING IS JUDGED ON: the bytes the vendor saved while
      // the lift waited are the ones that exist somewhere afterwards.
      refreshedHeldOutsideDefault: slots.some(
        ([slot, bytes]) => slot !== 'claude.default' && payload.credentialDigest(bytes) === refreshed
      ),
      staleHeldNowhere: !slots.some(([, bytes]) => payload.credentialDigest(bytes) === stale),
      observeChangedNothing: obs.events.length === 0
    };
  }

  // -------------------------------------------------------------------------
  // 7j. A HELD COPY IS BROUGHT UP TO THE NEWER BYTES (committer's round of
  //     Phase 211, the verifier's F2). The round trip: alice is the person's
  //     own, bob is kept under `work`, a session runs on the default. Choose
  //     work; the running session, now bob, refreshes its token; choose alice,
  //     which promotes bob out of the default slot and finds him held under
  //     work with the OLD bytes; choose work again. The session must get the
  //     refreshed token back, and the pre refresh bytes, whose refresh token
  //     is consumed, must be held nowhere. The control at the end: a held copy
  //     captured strictly LATER, being a session under `work` refreshing its
  //     own store, is not written over with older bytes.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const security = fakeSecurity(w);
    const base = makeDeps(root, w, [{ provider: 'claude' as LoginProviderId, login: null }]);
    let tick = 1_700_000_000_000;
    const d = {
      ...base,
      // A CLOCK THAT MOVES, so which copy is newer is a real question here.
      now: () => (tick += 1_000),
      stores: { ...base.stores, runner: security.runner, keychainForClaude: true }
    };
    const setDefault = (who: string, n: string): void => {
      security.items.set('Claude Code-credentials', { account: GATE_ACCOUNT, payload: claudeCredential(who, n) });
      w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile(who));
    };
    setDefault('alice', '1');
    await keep.observeProvider(d, 'claude');
    addLogin(root, 'claude', 'work');
    const work = readLoginsFile(root).file.logins.find((l) => l.name === 'work');
    const workDir = work === undefined ? '' : loginDirIn(root, 'claude', work.id);
    const workService = claudeScopedService(workDir);
    const workSlot = work === undefined ? '' : vault.slotFor('claude', work.id);
    security.items.set(workService, { account: GATE_ACCOUNT, payload: claudeCredential('bob', '1') });
    w.files.set(join(workDir, '.claude.json'), claudeAccountFile('bob'));
    await keep.observeProvider(d, 'claude');
    const bob1 = payload.credentialDigest(claudeCredential('bob', '1'));
    const bob2 = payload.credentialDigest(claudeCredential('bob', '2'));
    const bob3 = payload.credentialDigest(claudeCredential('bob', '3'));
    const digestOf = (bytes: string | undefined): string | null =>
      bytes === undefined ? null : payload.credentialDigest(bytes);
    const p1 = await keep.activateLogin(d, 'claude', 'work');
    // The running default session, now bob, refreshes: new bytes, same account.
    setDefault('bob', '2');
    await keep.observeProvider(d, 'claude');
    const p2 = await keep.activateLogin(d, 'claude', 'alice.example');
    const workSlotAfterAlice = digestOf(d.vault.slots.get(workSlot));
    const p3 = await keep.activateLogin(d, 'claude', 'work');
    const itemAfterWorkAgain = digestOf(security.items.get('Claude Code-credentials')?.payload);
    const workStoreAfterWorkAgain = digestOf(security.items.get(workService)?.payload);
    const staleAnywhere = [...d.vault.slots.values()].some((b) => payload.credentialDigest(b) === bob1);
    // THE CONTROL. A session under `work` refreshes its OWN store to bob 3,
    // captured later than the default slot's bob 2; choosing alice again must
    // leave that newer copy alone.
    security.items.set(workService, { account: GATE_ACCOUNT, payload: claudeCredential('bob', '3') });
    await keep.observeProvider(d, 'claude');
    const p4 = await keep.activateLogin(d, 'claude', 'alice.example');
    const workSlotAfterControl = digestOf(d.vault.slots.get(workSlot));
    const ok = (r: Awaited<ReturnType<typeof keep.activateLogin>>): boolean =>
      r.ok === true && r.ok && r.wrote === true;
    out['heldRefresh'] = {
      switched: ok(p1) && ok(p2) && ok(p3) && ok(p4),
      refreshedSurvivedRoundTrip: workSlotAfterAlice === bob2,
      sessionGetsRefreshed: itemAfterWorkAgain === bob2,
      staleGoneAfterRoundTrip: !staleAnywhere,
      ownStoreFreshened: workStoreAfterWorkAgain === bob2,
      newerHeldCopyKept: workSlotAfterControl === bob3
    };
  }

  // -------------------------------------------------------------------------
  // 7k. THE DEFAULT PROMOTION ASKS THE SLOT (committer's round of Phase 211,
  //     the verifier's F3). The world of 7f, and at the lift the default store
  //     reads as EMPTY (the vendor's own logout, or a keychain read that
  //     failed), as GARBAGE, or as HALF a credential. The rolling copy still
  //     holds alice, and it must not move on over her.
  // -------------------------------------------------------------------------
  {
    const shapes: Record<string, unknown> = {};
    for (const shape of ['empty', 'garbage', 'half'] as const) {
      const root = freshRoot();
      const w = makeWorld();
      const security = fakeSecurity(w);
      const base = makeDeps(root, w, [{ provider: 'claude' as LoginProviderId, login: null }]);
      const d = {
        ...base,
        stores: { ...base.stores, runner: security.runner, keychainForClaude: true }
      };
      security.items.set('Claude Code-credentials', {
        account: GATE_ACCOUNT,
        payload: claudeCredential('alice', '1')
      });
      w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('alice'));
      await keep.observeProvider(d, 'claude');
      addLogin(root, 'claude', 'work');
      const work = readLoginsFile(root).file.logins.find((l) => l.name === 'work');
      const workDir = work === undefined ? '' : loginDirIn(root, 'claude', work.id);
      security.items.set(claudeScopedService(workDir), {
        account: GATE_ACCOUNT,
        payload: claudeCredential('bob', '1')
      });
      w.files.set(join(workDir, '.claude.json'), claudeAccountFile('bob'));
      await keep.observeProvider(d, 'claude');
      if (shape === 'empty') security.items.delete('Claude Code-credentials');
      else if (shape === 'garbage') {
        security.items.set('Claude Code-credentials', { account: GATE_ACCOUNT, payload: 'not a credential at all' });
      } else {
        security.items.set('Claude Code-credentials', {
          account: GATE_ACCOUNT,
          payload: '{"claudeAiOauth":{"accessToken":"P204-half'
        });
      }
      // The watcher sees the change and observes; nothing is captured from it.
      await keep.observeProvider(d, 'claude');
      const aliceDigest = payload.credentialDigest(claudeCredential('alice', '1'));
      const bobDigest = payload.credentialDigest(claudeCredential('bob', '1'));
      const put = await keep.activateLogin(d, 'claude', 'work');
      const item = security.items.get('Claude Code-credentials')?.payload ?? '';
      const slots = [...d.vault.slots.entries()];
      shapes[shape] = {
        wrote: put.ok === true && put.ok && put.wrote === true,
        itemHoldsChosen: payload.credentialDigest(item) === bobDigest,
        outgoingHeld: slots.some(
          ([slot, bytes]) => slot !== 'claude.default' && payload.credentialDigest(bytes) === aliceDigest
        ),
        loginMade: readLoginsFile(root).file.logins.some(
          (l) => l.provider === 'claude' && l.name === 'alice.example'
        )
      };
    }
    out['liftEmpty'] = shapes;
  }

  // -------------------------------------------------------------------------
  // 7e. THE WATCHER (Phase 211): one observe per burst, only the file it
  //     watches, driven over the SHIPPING watch module and injected seams.
  // -------------------------------------------------------------------------
  {
    const watchMod = (await import(
      pathToFileURL(resolve(MODULES, 'watch.ts')).href
    )) as typeof import('../src/main/credentials/watch');
    const root = freshRoot();
    const w = makeWorld();
    const keepDeps = makeDeps(root, w);
    let clock = 0;
    const timers: { at: number; fn: () => void; live: boolean }[] = [];
    const fires: ((file: string | null) => void)[] = [];
    let emits = 0;
    const watcher = watchMod.startCredentialWatch({
      keep: keepDeps,
      emitChanged: () => {
        emits += 1;
      },
      watchDir: (_dir, onEvent) => {
        fires.push(onEvent);
        return { close: () => undefined };
      },
      setTimeout: (fn, ms) => {
        const t = { at: clock + ms, fn, live: true };
        timers.push(t);
        return { clear: () => (t.live = false) };
      },
      setInterval: () => ({ clear: () => undefined }),
      now: () => clock
    });
    const advance = async (ms: number): Promise<void> => {
      const target = clock + ms;
      for (;;) {
        const due = timers.filter((t) => t.live && t.at <= target).sort((a, b) => a.at - b.at)[0];
        if (due === undefined) break;
        clock = due.at;
        due.live = false;
        due.fn();
        for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r));
      }
      clock = target;
      for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r));
    };
    // A storm of events for the file that matters.
    const claudeFire = fires[0];
    for (let i = 0; i < 50; i++) claudeFire?.('.claude.json');
    const emitsBefore = emits;
    await advance(watchMod.WATCH_DEBOUNCE_MS + 20);
    const afterBurst = emits;
    // A file that is not watched triggers nothing.
    for (let i = 0; i < 10; i++) claudeFire?.('settings.json');
    await advance(watchMod.OBSERVE_MIN_INTERVAL_MS * 2);
    const afterIgnored = emits;
    watcher.stop();
    out['watcher'] = {
      // NOTHING before the debounce, ONE after a whole burst.
      quietBeforeDebounce: emitsBefore === 0,
      oneObservePerBurst: afterBurst === 1,
      ignoresOtherFiles: afterIgnored === afterBurst,
      watchesADirectory: fires.length > 0
    };
  }

  // -------------------------------------------------------------------------
  // 7h. A LOGIN MADE AFTER THE WATCH STARTED IS WATCHED (Phase 211 fix round).
  //     The first build derived the targets once, so a login added in
  //     Settings and then signed into inside a session was not seen until the
  //     next launch, which is the operator's second complaint in a new shape.
  // -------------------------------------------------------------------------
  {
    const watchMod = (await import(
      pathToFileURL(resolve(MODULES, 'watch.ts')).href
    )) as typeof import('../src/main/credentials/watch');
    const root = freshRoot();
    const w = makeWorld();
    const keepDeps = makeDeps(root, w);
    const opened: string[] = [];
    const closed: string[] = [];
    const watcher = watchMod.startCredentialWatch({
      keep: keepDeps,
      emitChanged: () => undefined,
      watchDir: (dir) => {
        opened.push(dir);
        return {
          close: () => {
            closed.push(dir);
          }
        };
      },
      setTimeout: () => ({ clear: () => undefined }),
      setInterval: () => ({ clear: () => undefined }),
      now: () => 0
    });
    const atStart = watcher.watching().length;
    addLogin(root, 'codex', 'later');
    const later = readLoginsFile(root).file.logins.find((l) => l.name === 'later');
    const laterDir = later === undefined ? '' : loginDirIn(root, 'codex', later.id);
    watcher.refresh();
    const afterAdd = watcher.watching();
    // A refresh with nothing new opens nothing twice.
    const openedBefore = opened.length;
    watcher.refresh();
    const reopened = opened.length - openedBefore;
    // The login removed: its watcher is closed.
    rmSync(laterDir, { recursive: true, force: true });
    watcher.refresh();
    const afterRemove = watcher.watching();
    watcher.stop();
    out['watchRefresh'] = {
      atStart,
      newDirWatched: laterDir !== '' && afterAdd.includes(laterDir),
      grewByOne: afterAdd.length === atStart + 1,
      reopened,
      goneDirClosed: laterDir !== '' && !afterRemove.includes(laterDir) && closed.includes(laterDir),
      stopClosedAll: closed.length === opened.length
    };
  }

  // -------------------------------------------------------------------------
  // 7i. THE KEYCHAIN BACKSTOP SEES A REWRITE (Phase 211 fix round). The
  //     vendor's `acct` attribute is the user name and never moves on a sign
  //     in; the modification date does. The fingerprint must move when the
  //     item is rewritten under the same account, and it asks for no `-w`.
  // -------------------------------------------------------------------------
  {
    const watchMod = (await import(
      pathToFileURL(resolve(MODULES, 'watch.ts')).href
    )) as typeof import('../src/main/credentials/watch');
    const root = freshRoot();
    const w = makeWorld();
    const security = fakeSecurity(w);
    const base = makeDeps(root, w);
    const d = {
      ...base,
      stores: { ...base.stores, runner: security.runner, keychainForClaude: true }
    };
    const argvsBefore = w.argvs.length;
    security.items.set('Claude Code-credentials', {
      account: GATE_ACCOUNT,
      payload: claudeCredential('alice', '1'),
      modified: '20260903100000Z'
    });
    const first = await watchMod.defaultKeychainFingerprint(d);
    // REWRITTEN UNDER THE SAME ACCOUNT, as a sign in does.
    security.items.set('Claude Code-credentials', {
      account: GATE_ACCOUNT,
      payload: claudeCredential('bob', '2'),
      modified: '20260903100100Z'
    });
    const second = await watchMod.defaultKeychainFingerprint(d);
    const asked = w.argvs.slice(argvsBefore);
    out['fingerprint'] = {
      readSomething: first !== null && first !== '',
      movesOnRewrite: first !== null && second !== null && first !== second,
      neverAsksForThePayload: asked.every((argv) => !argv.includes('-w') && !argv.includes('-g')),
      askedSomething: asked.length > 0
    };
  }

  // -------------------------------------------------------------------------
  // 8. A STORE CAUGHT MID CHANGE IS NOT CAPTURED, and nothing already kept is
  //    forgotten.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const d = makeDeps(root, w);
    w.files.set(CODEX_DEFAULT, codexCredential('alice', '1'));
    await keep.observeProvider(d, 'codex');
    const slot = vault.slotFor('codex', null);
    const before = d.vault.slots.get(slot) ?? null;
    // THE TWO READS DISAGREE, which is the vendor rewriting the store under us.
    w.files.set(CODEX_DEFAULT, codexCredential('bob', '2'));
    w.shifting.set(CODEX_DEFAULT, codexCredential('bob', '3'));
    const seen = await keep.observeProvider(d, 'codex');
    out['midChange'] = {
      kept: seen.events.filter((e) => e.kind === 'kept').length,
      promoted: seen.events.filter((e) => e.kind === 'promoted').length,
      copyUnchanged: d.vault.slots.get(slot) === before,
      loginsAdded: readLoginsFile(root).file.logins.length
    };
  }

  // -------------------------------------------------------------------------
  // 9. THE ATTACK SHAPES.
  // -------------------------------------------------------------------------
  {
    const shapes: Record<string, unknown>[] = [];
    const arm = async (
      name: string,
      body: (
        root: string,
        w: World,
        d: ReturnType<typeof makeDeps>
      ) => Promise<Record<string, unknown>>
    ): Promise<void> => {
      const root = freshRoot();
      const w = makeWorld();
      const d = makeDeps(root, w);
      shapes.push({ name, ...(await body(root, w, d)) });
    };

    await arm('a truncated credential', async (root, w, d) => {
      w.files.set(CODEX_DEFAULT, codexCredential('alice', '1').slice(0, 30));
      const seen = await keep.observeProvider(d, 'codex');
      return {
        kept: seen.events.filter((e) => e.kind === 'kept').length,
        slots: d.vault.slots.size,
        want: 'nothing kept'
      };
    });

    await arm('valid JSON that is not a credential', async (root, w, d) => {
      w.files.set(CODEX_DEFAULT, JSON.stringify({ hello: 'world' }));
      const seen = await keep.observeProvider(d, 'codex');
      return {
        kept: seen.events.filter((e) => e.kind === 'kept').length,
        slots: d.vault.slots.size,
        want: 'nothing kept'
      };
    });

    await arm('a store Tortie owns that refuses to be kept', async (root, w, d) => {
      w.files.set(CODEX_DEFAULT, codexCredential('alice', '1'));
      d.vault.refuse.add(vault.stagedSlotFor(vault.slotFor('codex', null)));
      const seen = await keep.observeProvider(d, 'codex');
      return {
        refused: seen.events.filter((e) => e.kind === 'refused').length,
        slots: d.vault.slots.size,
        want: 'refused with a sentence and nothing kept'
      };
    });

    await arm('a store that becomes unreadable', async (root, w, d) => {
      w.files.set(CODEX_DEFAULT, codexCredential('alice', '1'));
      await keep.observeProvider(d, 'codex');
      const before = d.vault.slots.get(vault.slotFor('codex', null)) ?? null;
      w.breakReads.set(CODEX_DEFAULT, 99);
      // THE THROW IS CAUGHT HERE and reported rather than left to end the run,
      // because a domain that lets it out is exactly what this arm is about
      // and the gate has to be told WHICH reading moved.
      let threw = false;
      let events = 0;
      try {
        events = (await keep.observeProvider(d, 'codex')).events.length;
      } catch {
        threw = true;
      }
      return {
        threw,
        events,
        copyUnchanged: d.vault.slots.get(vault.slotFor('codex', null)) === before,
        want: 'no crash and the copy stands'
      };
    });

    await arm('two switches at once', async (root, w, d) => {
      w.files.set(CODEX_DEFAULT, codexCredential('alice', '1'));
      await keep.observeProvider(d, 'codex');
      w.files.set(CODEX_DEFAULT, codexCredential('bob', '2'));
      await keep.observeProvider(d, 'codex');
      const both = await Promise.all([
        keep.activateLogin(d, 'codex', 'alice.example'),
        keep.activateLogin(d, 'codex', 'alice.example')
      ]);
      const row = readLoginsFile(root).file.logins.find(
        (l) => l.name === 'alice.example'
      );
      const path =
        row === undefined ? '' : join(loginDirIn(root, 'codex', row.id), 'auth.json');
      return {
        answers: both.map((b) => b.ok),
        reasons: both.map((b) => (b.ok ? '' : b.reason)),
        oneSucceeded: both.some((b) => b.ok),
        storeExact: w.files.get(path) === codexCredential('alice', '1'),
        stagedLeft: [...w.files.keys()].some((k) => k.endsWith('tortie-pending')),
        want: 'the store holds the account and no staged copy is left'
      };
    });

    await arm('an expired credential', async (root, w, d) => {
      // AN EXPIRED CREDENTIAL IS STILL A CREDENTIAL, and Tortie never inspects
      // an expiry: the vendor decides. What must not happen is a crash or a
      // silent drop, so this asserts it is kept and moved like any other.
      const expired = JSON.stringify({
        claudeAiOauth: {
          accessToken: `${TOKEN}-expired`,
          subscriptionType: 'max',
          expiresAt: 1
        }
      });
      w.files.set(CLAUDE_DEFAULT_CRED, expired);
      w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('erin'));
      const seen = await keep.observeProvider(d, 'claude');
      return {
        kept: seen.events.filter((e) => e.kind === 'kept').length,
        bytesExact: d.vault.slots.get(vault.slotFor('claude', null)) === expired,
        want: 'kept whole, never inspected'
      };
    });

    out['attack'] = shapes;
  }

  // -------------------------------------------------------------------------
  // 10. NO TOKEN BYTE ANYWHERE THIS DOMAIN ANSWERS.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const d = makeDeps(root, w);
    w.files.set(CODEX_DEFAULT, codexCredential('alice', '1'));
    await keep.observeProvider(d, 'codex');
    w.files.set(CODEX_DEFAULT, codexCredential('bob', '2'));
    const seen = await keep.observeProvider(d, 'codex');
    const facts = [...seen.facts.entries()];
    const row = readLoginsFile(root).file.logins[0];
    const activated = await keep.activateLogin(d, 'codex', row?.name ?? 'x');
    const everything = JSON.stringify({
      events: seen.events,
      facts,
      activated,
      said,
      keptFile: textOf(kept.keptFileIn(root)),
      loginsFile: textOf(loginsFileIn(root))
    });
    out['leak'] = {
      tokenInAnswers: everything.includes(TOKEN),
      // AND NO PAYLOAD REACHED AN ARGV, over every call the security seam saw.
      tokenInArgv: w.argvs.some((argv) => argv.join(' ').includes(TOKEN)),
      argvCount: w.argvs.length,
      // A DIGEST IS NOT A TOKEN, and it is the only thing about a credential
      // that is written down. Assert the record does hold one, so this check
      // is over a file that really carries something rather than an empty one.
      recordHasDigest: /"digest": "[0-9a-f]{64}"/.test(textOf(kept.keptFileIn(root)))
    };
  }

  // -------------------------------------------------------------------------
  // 11b. AN ACCOUNT IS PROMOTED ONCE, however many times a store returns to it.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const d = makeDeps(root, w);
    for (const [i, name] of ['alice', 'bob', 'alice', 'bob', 'alice'].entries()) {
      w.files.set(CODEX_DEFAULT, codexCredential(name, String(i)));
      await keep.observeProvider(d, 'codex');
    }
    out['noDuplicates'] = {
      names: readLoginsFile(root).file.logins.map((l) => l.name).sort()
    };
  }

  // -------------------------------------------------------------------------
  // 11c. TWO OVERLAPPING OBSERVES, which is what an ordinary mount produces.
  //
  //      THE DEFECT THIS ARM EXISTS FOR. The Agents page draws a block per
  //      provider and each loads on mount, and StrictMode doubles that again,
  //      so four lists can be in flight at once. Each observe read the record
  //      file at its start and wrote the WHOLE file back at its end, so the
  //      second one's write was composed from a copy taken before the first
  //      one's promotion and destroyed its row. The credential survived in
  //      Tortie's own store and the row said "Not signed in yet" for ever, so
  //      the rescued account was offered back to nobody. Thirteen ablations
  //      passed while that was live, which is why this arm is here.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const d = makeDeps(root, w);
    w.files.set(CODEX_DEFAULT, codexCredential('alice', '1'));
    await keep.observeProvider(d, 'codex');
    w.files.set(CODEX_DEFAULT, codexCredential('bob', '2'));
    const [a, b] = await Promise.all([
      keep.observeProvider(d, 'codex'),
      keep.observeProvider(d, 'codex')
    ]);
    const row = readLoginsFile(root).file.logins[0];
    const slot = vault.slotFor('codex', row?.id ?? 'x');
    const factsOf = (o: typeof a): unknown =>
      [...o.facts.entries()].find(([id]) => id === (row?.id ?? '')) ?? null;
    out['overlap'] = {
      // ONE LOGIN, not two, and not none.
      logins: readLoginsFile(root).file.logins.map((l) => l.name),
      // THE ROW SURVIVED IN THE RECORD FILE, which is the whole finding.
      recordKeeps: kept.readKeptFile(root).file.slots[slot] !== undefined,
      // AND THE BYTES ARE STILL THE ONES THAT WERE IN THE STORE.
      bytesExact: (await vault.vaultGet(d.vault, slot)) === codexCredential('alice', '1'),
      // BOTH ANSWERS AGREE. Two blocks drawing from one moment must not
      // disagree about whether an account can be put back.
      agree: JSON.stringify(factsOf(a)) === JSON.stringify(factsOf(b)),
      // AND A LIST ISSUED LATER STILL SAYS SO, which is what a person sees.
      laterKept: (await keep.keptFactsFor(d, 'codex', row?.id ?? 'x', null)).kept
    };
  }

  // -------------------------------------------------------------------------
  // 11d. A STORE THAT NAMES NO ACCOUNT ON EITHER SIDE still keeps what it
  //      replaced, and does not mint a login per token refresh.
  //
  //      THE DEFECT THIS ARM EXISTS FOR. The promotion asked whether the two
  //      ADDRESSES differed, which is only ever true when both are known, so a
  //      store naming neither was read as unchanged and the previous account
  //      was overwritten. That is not a rare shape: a login signed into a
  //      moment ago has no `oauthAccount` until the account takes a turn, so a
  //      person who signs in, sees the wrong account and types `/login`
  //      straight away lost the first one silently. The rule is now that the
  //      account is kept unless it is PROVED to be the same one.
  //
  //      The second half is the cost of that rule and it is bounded here: ten
  //      ordinary token refreshes of such a store minted NINE logins before
  //      the chain was bounded, and `nextKeptLoginName` stops at 99, past
  //      which the account really is lost again.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const d = makeDeps(root, w);
    const anonymous = (nonce: string): string =>
      JSON.stringify({ tokens: { access_token: `${TOKEN}-anon-${nonce}` } });
    w.files.set(CODEX_DEFAULT, anonymous('1'));
    await keep.observeProvider(d, 'codex');
    w.files.set(CODEX_DEFAULT, anonymous('2'));
    const seen = await keep.observeProvider(d, 'codex');
    const first = readLoginsFile(root).file.logins[0];
    const promotedSlot = vault.slotFor('codex', first?.id ?? 'x');
    const heldAfterOne = await vault.vaultGet(d.vault, promotedSlot);
    // EIGHT MORE REFRESHES of the same anonymous store.
    for (let n = 3; n <= 10; n++) {
      w.files.set(CODEX_DEFAULT, anonymous(String(n)));
      await keep.observeProvider(d, 'codex');
    }
    // AND A STORE THAT DOES NAME ITSELF is never dragged into the chain: ten
    // refreshes of one account mint nothing at all.
    const namedRoot = freshRoot();
    const namedWorld = makeWorld();
    const namedDeps = makeDeps(namedRoot, namedWorld);
    for (let n = 0; n < 10; n++) {
      namedWorld.files.set(CODEX_DEFAULT, codexCredential('alice', String(n)));
      await keep.observeProvider(namedDeps, 'codex');
    }
    out['unnamed'] = {
      promoted: seen.events.some((e) => e.kind === 'promoted'),
      // THE ACCOUNT THAT WAS THERE IS HELD, byte for byte.
      bytesExact: heldAfterOne === anonymous('1'),
      // ONE LOGIN AFTER TEN REFRESHES, rather than nine.
      loginsAfterTen: readLoginsFile(root).file.logins.length,
      // AND A NAMED ACCOUNT'S REFRESHES MINT NOTHING.
      namedLogins: readLoginsFile(namedRoot).file.logins.length
    };
  }

  // -------------------------------------------------------------------------
  // 11e. THE STAGED PLACE IS NOT LEFT HOLDING A CREDENTIAL.
  //
  //      A crash runs no `finally`, so a kill between staging and committing
  //      leaves a WHOLE credential beside the store. That was measured with
  //      three real kills: the store held the old credential or the new one
  //      every time, which is the property, but two of the three left that
  //      copy behind and the only thing that ever removed one was a later
  //      write to the same place finishing its own `finally`. A store never
  //      written again kept it for ever, and on the keychain path it is a
  //      second item holding a credential.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const d = makeDeps(root, w);
    addLogin(root, 'codex', 'Work');
    const row = readLoginsFile(root).file.logins[0];
    const dir = loginDirIn(root, 'codex', row?.id ?? 'x');
    const store = `${dir}/auth.json`;
    const stagedAt = `${store}.tortie-pending`;
    w.files.set(store, codexCredential('alice', '1'));
    const target = await stores.storeTarget(d.stores, 'codex', dir);
    // THE CRASH, at the step the interrupted arm already drives.
    await swap.safeSwap(target as NonNullable<typeof target>, codexCredential('bob', '2'), 'stage');
    const leftBehind = w.files.get(stagedAt) ?? null;
    // A SECOND WRITE CLEARS THE GROUND IT IS ABOUT TO USE.
    const second = await stores.storeTarget(d.stores, 'codex', dir);
    await swap.safeSwap(second as NonNullable<typeof second>, codexCredential('carol', '3'), 'stage');
    const afterSecond = w.files.get(stagedAt) ?? null;
    // PHASE 206. THE SAME CRASH INSIDE TORTIE'S OWN VAULT, which the sweep
    // did not reach until this phase.
    //
    // THE SLOT IS ONE THE OBSERVE WILL NOT WRITE, deliberately: a successful
    // write to a slot discards its staged place in its own `finally`, so a
    // slot the observe captures would come out clean whether the sweep ran or
    // not, and the arm would pass with the sweep taken away. `Idle` is a login
    // whose store holds nothing, so the observe reads it and writes nothing.
    addLogin(root, 'codex', 'Idle');
    const idle = readLoginsFile(root).file.logins.find((l) => l.name === 'Idle');
    const idleSlot = vault.slotFor('codex', idle?.id ?? 'x');
    const idleStaged = vault.stagedSlotFor(idleSlot);
    await vault.vaultPut(d.vault, idleSlot, codexCredential('erin', '5'), 'stage');
    const vaultLeftBehind = d.vault.slots.get(idleStaged) ?? null;
    // AND THE DEFAULT SLOT, which is Tortie's own rolling copy of the person's
    // own location and has a staged place like every other slot.
    const defaultStaged = vault.stagedSlotFor(vault.slotFor('codex', null));
    d.vault.slots.set(defaultStaged, codexCredential('frank', '6'));
    // AND A SLOT WHOSE DIRECTORY HAS GONE (Phase 206 fix round). `storesOf`
    // drops a login whose folder is not on disk, so a sweep that walks only
    // that list keeps this staged credential for ever. The row is still in
    // logins.json, so this is not a stray: it is a live login with no folder.
    addLogin(root, 'codex', 'Gone');
    const gone = readLoginsFile(root).file.logins.find((l) => l.name === 'Gone');
    const goneStaged = vault.stagedSlotFor(vault.slotFor('codex', gone?.id ?? 'x'));
    d.vault.slots.set(goneStaged, codexCredential('grace', '7'));
    rmSync(loginDirIn(root, 'codex', gone?.id ?? 'x'), { recursive: true, force: true });

    // AND THE NEXT RUN SWEEPS A STORE NOBODY WRITES AGAIN. A fresh module is
    // a fresh process as far as the once per run set is concerned.
    w.files.set(stagedAt, codexCredential('dave', '4'));
    const nextRun = (await import(
      `${pathToFileURL(resolve(MODULES, 'keep.ts')).href}?run=${String(Date.now())}`
    )) as typeof import('../src/main/credentials/keep');
    await nextRun.observeProvider(d, 'codex');
    out['residue'] = {
      // PHASE 206, TORTIE'S OWN VAULT.
      vaultCrashLeftACredential: vaultLeftBehind === codexCredential('erin', '5'),
      vaultSweptIt: !d.vault.slots.has(idleStaged),
      vaultDefaultSweptIt: !d.vault.slots.has(defaultStaged),
      // AND THE ONE WHOSE FOLDER HAS GONE, which is the fix round's addition.
      vaultNoDirSweptIt: !d.vault.slots.has(goneStaged),
      // AND THE SWEEP TOOK THE STAGED PLACE AND NEVER THE SLOT. The idle slot
      // never held anything, so the one to watch is a slot that did.
      vaultSlotsKept: [...d.vault.slots.keys()].every(
        (k) => !k.endsWith('.pending')
      ),
      // The crash really did leave a whole credential, so the rest is a check
      // over something that exists rather than over an empty world.
      crashLeftACredential: leftBehind === codexCredential('bob', '2'),
      storeUntouched: w.files.get(store) === codexCredential('alice', '1'),
      secondWriteLeftOnlyItsOwn: afterSecond === codexCredential('carol', '3'),
      nextRunSweptIt: !w.files.has(stagedAt),
      storeStillThere: w.files.get(store) === codexCredential('alice', '1')
    };
  }

  // -------------------------------------------------------------------------
  // 11f. A PLANTED LINK AT A STAGED NAME SENDS THE WRITE NOWHERE.
  //
  //      THE ONLY ARM IN THIS PROBE THAT USES REAL FILES, and it has to,
  //      because a bag of strings has no links in it and that is exactly how
  //      this defect survived thirteen ablations. Every write in this domain
  //      stages at a name nobody has opened yet, and `writeFile` follows a
  //      link. An entry planted at one of those names took the whole write:
  //      the read back check read through the SAME link and saw what it had
  //      just written, so it passed, the rename moved the link onto the store,
  //      and a file standing in for the person's own `~/.codex/auth.json`
  //      came back holding the kept credential byte for byte. That is the
  //      refusal this phase states in four places defeated by one entry, and
  //      `../src/main/logins/dirs.ts` already guards the DIRECTORY against
  //      the same shape because the Phase 202 verifier found one in the app.
  //
  //      Nothing under the person's home is opened. The victim is a file in
  //      this arm's own scratch directory that stands in for one.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const loginDir = join(root, 'codex', '0123456789abcdef');
    mkdirSync(loginDir, { recursive: true });
    const victimDir = join(root, 'not-tortie-own');
    mkdirSync(victimDir, { recursive: true });
    const OWN = 'THE-PERSON-OWN-BYTES';
    const victimFor = (name: string): string => {
      const at = join(victimDir, name);
      writeFileSync(at, OWN, 'utf8');
      return at;
    };
    const REAL: import('../src/main/credentials/stores').StoreDeps = {
      runner: { run: async () => ({ code: 1, stdout: '' }) },
      readText: async (path) => {
        try {
          return await readFile(path, 'utf8');
        } catch {
          return null;
        }
      },
      // THE SHIPPING HELPERS, taken from the ablatable copy, so an ablation
      // that puts the ordinary write back is what this arm measures.
      writeText: async (path, text) => {
        nofollow.writeNoFollowSync(path, text);
      },
      renamePath: async (from, to) => {
        nofollow.renameNoFollowSync(from, to);
      },
      removePath: async (path) => {
        try {
          await rm(path, { force: true });
        } catch {
          // A staged copy that will not go changes nothing about the store.
        }
      },
      env: {},
      home: victimDir,
      keychainForClaude: false,
      userName: 'nobody',
      wait: async () => {}
    };

    // 1. A VENDOR STORE, through the whole shipping write.
    const store = join(loginDir, 'auth.json');
    writeFileSync(store, codexCredential('alice', '1'), 'utf8');
    const storeVictim = victimFor('auth.json');
    symlinkSync(storeVictim, `${store}.tortie-pending`);
    const linkPlanted = lstatSync(`${store}.tortie-pending`).isSymbolicLink();
    const target = await stores.storeTarget(REAL, 'codex', loginDir);
    const put =
      target === null
        ? { ok: false as const, reason: 'no target' }
        : await swap.safeSwap(target, codexCredential('bob', '2'));

    // 2. TORTIE'S OWN SEALED VAULT, whose staged place is `<slot>.pending.cred`
    //    and whose write stages once more at `.writing` beside it. Since Phase
    //    304 this is the ONE backend, so the guard this plants a link against
    //    is load bearing on macOS and not only everywhere else.
    const vaultDir = join(root, 'kept');
    mkdirSync(vaultDir, { recursive: true, mode: 0o700 });
    const slot = vault.slotFor('codex', '0123456789abcdef');
    const vaultVictim = victimFor('vault');
    symlinkSync(
      vaultVictim,
      join(vaultDir, `${vault.stagedSlotFor(slot)}.cred.writing`)
    );
    const backend = vault.sealedVault(vaultDir, injectedSeal(), vault.NO_LEGACY);
    const kastPut = await vault.vaultPut(backend, slot, codexCredential('carol', '3'));

    // 3. THE RECORD FILE, whose temporary name is composed from this pid.
    const recordRoot = join(root, 'record');
    mkdirSync(recordRoot, { recursive: true });
    const recordVictim = victimFor('record');
    symlinkSync(
      recordVictim,
      join(recordRoot, `.kept.${process.pid.toString(36)}.tmp`)
    );
    let recordThrew = false;
    try {
      kept.writeKeptFile(recordRoot, { v: 1, slots: {} });
    } catch {
      recordThrew = true;
    }

    // 4. AND THE COMMIT IS ASKED THE SAME QUESTION, for a link planted after
    //    the write rather than before it.
    const lateVictim = victimFor('late');
    const lateLink = join(loginDir, 'late.pending');
    symlinkSync(lateVictim, lateLink);
    let renameRefusedALink = false;
    try {
      nofollow.renameNoFollowSync(lateLink, join(loginDir, 'late'));
    } catch {
      renameRefusedALink = true;
    }

    const untouched = (at: string): boolean => {
      try {
        return readFileSync(at, 'utf8') === OWN;
      } catch {
        return false;
      }
    };
    // THE READ SIDE (fix round): a link at a store's name is not read through.
    const readRoot = freshRoot();
    const readVictim = join(readRoot, 'victim.json');
    writeFileSync(readVictim, '{"claudeAiOauth":{"accessToken":"VICTIM"}}');
    const readLink = join(readRoot, '.credentials.json');
    symlinkSync(readVictim, readLink);
    const readPlain = join(readRoot, 'plain.json');
    writeFileSync(readPlain, 'plain bytes');
    const linkRead = nofollow.readTextNoFollowSync(readLink);
    const plainRead = nofollow.readTextNoFollowSync(readPlain);
    const missingRead = nofollow.readTextNoFollowSync(join(readRoot, 'missing'));
    out['nofollow'] = {
      readRefusesALink: linkRead === null,
      readReadsAFile: plainRead === 'plain bytes',
      readMissingIsNull: missingRead === null,
      // THE ARM REALLY PLANTED A LINK, so everything under it is a check over
      // something that exists rather than over an empty world.
      linkPlanted,
      storeWritten: put.ok,
      storeIsAFile: !lstatSync(store).isSymbolicLink(),
      storeHoldsTheNewAccount:
        readFileSync(store, 'utf8') === codexCredential('bob', '2'),
      storeVictimUntouched: untouched(storeVictim),
      vaultWritten: kastPut.ok,
      vaultVictimUntouched: untouched(vaultVictim),
      recordWritten: !recordThrew && readFileSync(join(recordRoot, 'kept.json'), 'utf8').includes('"v": 1'),
      recordVictimUntouched: untouched(recordVictim),
      renameRefusedALink,
      lateVictimUntouched: untouched(lateVictim)
    };
  }

  // -------------------------------------------------------------------------
  // 12. THE KEYCHAIN PATH, END TO END, over a `security` that behaves the way
  //     the real one was measured to. This is the arm that makes the argv
  //     assertion mean something: a payload on a command line would show up.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const security = fakeSecurity(w);
    const d = makeDeps(root, w);
    const keychainStores: import('../src/main/credentials/stores').StoreDeps = {
      ...d.stores,
      runner: security.runner,
      keychainForClaude: true
    };
    const withKeychain = { ...d, stores: keychainStores };
    // PHASE 281. A STRAY FIRST, under the plain name and another account, the
    // shape research 126 §2.4 measured on the operator's machine. It holds a
    // whole credential, so a read by service alone would come back with a
    // usable wrong answer rather than an obvious nothing.
    const strayBytes = claudeCredential('stray', '0');
    security.items.first({ service: CLAUDE_KEYCHAIN_SERVICE, account: 'p281-stray', payload: strayBytes });
    // The person's own claude item, as a default install has it.
    const own = claudeCredential('alice', '1');
    security.items.set('Claude Code-credentials', { account: GATE_ACCOUNT, payload: own });
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('alice'));
    await keep.observeProvider(withKeychain, 'claude');
    // /login, in his own terminal, in the vendor's own flow.
    security.items.set('Claude Code-credentials', {
      account: GATE_ACCOUNT,
      payload: claudeCredential('bob', '2')
    });
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('bob'));
    const seen = await keep.observeProvider(withKeychain, 'claude');
    const row = readLoginsFile(root).file.logins.find(
      (l) => l.name === 'alice.example'
    );
    const put =
      row === undefined
        ? { ok: false as const, reason: 'no login' }
        : await keep.activateLogin(withKeychain, 'claude', row.name);
    const dir = row === undefined ? '' : loginDirIn(root, 'claude', row.id);
    const wroteService = stores.claudeWriteService(dir);
    // EVERY ROW under the name the write used, so a write that landed under a
    // second account beside the vendor's is two rows here rather than one.
    const wroteRows = security.items.rows.filter((r) => r.service === wroteService);
    const wrote = wroteRows.length === 1 ? (wroteRows[0] ?? null) : null;
    // THE MODEL'S ORDER, pinned (Phase 281, after verification). The keychain
    // verifier measured the real `/usr/bin/security` on a scratch keychain: a
    // lookup by service alone answers in creation order, and `add -U` of an
    // existing item moves it behind every other item of its name. A model that
    // updated in place predicted the wrong first match after any write, so it
    // is asked here, on a world of its own, before any arm's reading is used.
    const order = fakeSecurity(makeWorld());
    const orderLine = (account: string, label: string): string =>
      `add-generic-password -U -a "${account}" -s "${CLAUDE_KEYCHAIN_SERVICE}" -X "${Buffer.from(claudeCredential(label, '0'), 'utf8').toString('hex')}"\n`;
    const firstUnderName = async (): Promise<string | undefined> => {
      const found = await order.runner.run(['find-generic-password', '-s', CLAUDE_KEYCHAIN_SERVICE]);
      return /"acct"<blob>="([^"]*)"/.exec(found.stdout)?.[1];
    };
    await order.runner.run(['-i'], orderLine('p281-stray', 'order-stray'));
    await order.runner.run(['-i'], orderLine(GATE_ACCOUNT, 'order-vendor'));
    const firstWhenCreated = await firstUnderName();
    await order.runner.run(['-i'], orderLine('p281-stray', 'order-stray-again'));
    const firstAfterUpdate = await firstUnderName();
    out['keychain'] = {
      // An update keeps one item and moves it BEHIND the other of its name.
      updateMovesBehind:
        firstWhenCreated === 'p281-stray' &&
        firstAfterUpdate === GATE_ACCOUNT &&
        order.items.rows.length === 2,
      promoted: seen.events.some((e) => e.kind === 'promoted'),
      activated: put.ok,
      // THE VENDOR'S OWN BYTES, PUT BACK EXACTLY, in the item the vendor itself
      // would write for a session launched with that config directory.
      bytesExact: wrote !== null && wrote.payload === own,
      // THE ACCOUNT IS THE VENDOR'S RULE (Phase 281), being Claude Code's `Cv`
      // over this arm's environment and user name, and never an account copied
      // off whatever item the name matched. It was "follows the person's own
      // item" until this phase, which on the operator's machine was the stray.
      accountIsVendorRule:
        wrote !== null &&
        wrote.account === GATE_ACCOUNT &&
        wrote.account ===
          claudeKeychainAccount(keychainStores.env, () => keychainStores.userName),
      // THE PERSON'S OWN ITEM WAS NEVER WRITTEN. It still holds what /login put
      // there, and there is still exactly one of it under the vendor account.
      ownItemUntouched:
        security.items.get('Claude Code-credentials', GATE_ACCOUNT)?.payload ===
          claudeCredential('bob', '2') &&
        security.items.rows.filter(
          (r) => r.service === CLAUDE_KEYCHAIN_SERVICE && r.account === GATE_ACCOUNT
        ).length === 1,
      // THE STRAY, still first, still its own bytes, and named by no call.
      strayUntouched:
        JSON.stringify(security.items.rows[0]) ===
          JSON.stringify({ service: CLAUDE_KEYCHAIN_SERVICE, account: 'p281-stray', payload: strayBytes }) &&
        !w.argvs.some((argv) => argv.includes('p281-stray')) &&
        !w.stdins.some((line) => line.includes('p281-stray')),
      itemsNamed: [...security.items.keys()].sort(),
      // NO PAYLOAD ON ANY COMMAND LINE, over every call this arm made.
      argvCount: w.argvs.length,
      tokenInArgv: w.argvs.some((argv) => argv.join(' ').includes(TOKEN)),
      // AND THE WRITE REALLY WENT OVER STDIN, so the check above is a
      // measurement rather than a call that never happened.
      stdinCount: w.stdins.length,
      payloadInStdin: w.stdins.some((line) =>
        line.includes(Buffer.from(own, 'utf8').toString('hex'))
      ),
      // NOTHING EVER PASSES -A, which would trust every program on the machine.
      everPassedA: w.argvs.some((argv) => argv.includes('-A')),
      // NO STAGED ITEM IS LEFT IN THE KEYCHAIN.
      stagedLeft: [...security.items.keys()].some((k) => k.endsWith('tortie-pending'))
    };
  }

  // -------------------------------------------------------------------------
  // 12c. THE ITEM CLAUDE CODE READS, AND NO OTHER (Phase 281).
  //
  //      THE DEFECT, research 126 §2.4: Claude Code names its keychain item by
  //      service AND account, and every call here named the service alone. On
  //      the operator's machine a stray under another account sat first under
  //      the same name, so the observe, the backstop and both write targets
  //      read and wrote the stray, and §8.10 drove the parent's `storeTarget`
  //      and `defaultStoreTarget` committing `add -U -a "unknown"` over this
  //      model.
  //
  //      Every world below plants a STRAY FIRST under every vendor name it
  //      drives, holding a whole credential of its own, so a call without the
  //      account comes back with a usable wrong answer. The account rule's
  //      inputs differ on purpose: `USER` is set and the user name is another
  //      string, so a domain that took the user name directly, or copied an
  //      account off an item, writes under a name this arm can tell apart.
  //      The scoped names are spelled here with `node:crypto` over the NFC
  //      form, not with the shipping composer.
  //
  //      THREE READINGS. `vendorAddress` is rule 20a: every argv and every
  //      `-i` line readStore, readSettledStore, both targets' five steps,
  //      forgetStore and the fingerprint send for a vendor name carries `-a`
  //      with the vendor account, and nothing reads, writes or deletes a stray.
  //      `vendorRefusal` is rule 20c: a vendor name with no account reaches the
  //      runner zero times, while Tortie's own names keep the argv they had.
  //      `vendorCommit` is rule 20d: a directory with no scoped item commits
  //      under the vendor rule's account, over three shapes of that rule.
  // -------------------------------------------------------------------------
  {
    const security = (await import(
      pathToFileURL(resolve(MODULES, 'security.ts')).href
    )) as typeof import('../src/main/credentials/security');
    const PLAIN = 'Claude Code-credentials';
    const STAGED = '.tortie-pending';
    const VENDOR = 'p281-vendor';
    const OS_USER = 'p281-os';
    const STRAY = 'p281-stray';
    const FALLBACK = 'claude-code-user';
    /** A login directory holding the vendor's scoped item and a stray before it. */
    const DIR_D = '/p281-logins/dddddddddddddddd';
    /** A login directory with no scoped item at all, only the plain pair. */
    const DIR_E = '/p281-logins/eeeeeeeeeeeeeeee';
    /** The directory a `CLAUDE_CONFIG_DIR` names, with no scoped item. */
    const DIR_C = '/p281-config/cccccccccccccccc';
    /** This probe's own spelling of a scoped name, over the NFC form. */
    const scopedOf = (dir: string): string =>
      `${PLAIN}-${createHash('sha256').update(dir.normalize('NFC'), 'utf8').digest('hex').slice(0, 8)}`;
    /** Claude Code's namespace, spelled a second time here. */
    const isVendorName = (name: string): boolean =>
      name === PLAIN || name.startsWith(`${PLAIN}-`) || name.startsWith(`${PLAIN}.`);

    const accountLabel = (account: string | null): string =>
      account === null
        ? 'none'
        : account === VENDOR
          ? 'vendor'
          : account === STRAY
            ? 'stray'
            : account === OS_USER
              ? 'os-user'
              : account === FALLBACK
                ? 'fallback'
                : 'other';
    const serviceLabel = (service: string | null): string => {
      if (service === null) return 'none';
      const staged = service.endsWith(STAGED);
      const bare = staged ? service.slice(0, -STAGED.length) : service;
      const name =
        bare === PLAIN
          ? 'plain'
          : bare === scopedOf(DIR_D)
            ? 'D'
            : bare === scopedOf(DIR_E)
              ? 'E'
              : bare === scopedOf(DIR_C)
                ? 'C'
                : 'other';
      return staged ? `${name}.staged` : name;
    };

    interface Sent {
      verb: string;
      service: string | null;
      account: string | null;
      payload: boolean;
    }
    /** Every call a world's runner was handed since a mark, `-i` lines included. */
    const sentSince = (w: World, mark: { argv: number; stdin: number }): Sent[] => {
      const out: Sent[] = [];
      let line = mark.stdin;
      for (const argv of w.argvs.slice(mark.argv)) {
        if (argv[0] === '-i') {
          const text = w.stdins[line] ?? '';
          line += 1;
          const add = /^add-generic-password -U -a "([^"]*)" -s "([^"]*)"/.exec(text);
          out.push({
            verb: add === null ? 'malformed' : 'add',
            service: add?.[2] ?? null,
            account: add?.[1] ?? null,
            payload: false
          });
          continue;
        }
        // DEFENSIVE ON PURPOSE, like `textOf`: an ablated domain may hand the
        // runner something that is not a string, and a probe that threw here
        // would report "could not run" rather than the reading that moved.
        const at = (flag: string): string | null => {
          const i = argv.indexOf(flag);
          const value: unknown = i < 0 ? null : argv[i + 1];
          return typeof value === 'string' ? value : null;
        };
        out.push({
          verb: (argv[0] ?? '').replace('-generic-password', ''),
          service: at('-s'),
          account: at('-a'),
          payload: argv.includes('-w') || argv.includes('-g')
        });
      }
      return out;
    };
    const markOf = (w: World) => ({ argv: w.argvs.length, stdin: w.stdins.length });
    const shown = (calls: Sent[]): string[] =>
      calls.map(
        (c) =>
          `${c.verb} -a ${accountLabel(c.account)} -s ${serviceLabel(c.service)}${c.payload ? ' -w' : ''}`
      );
    const storesOver = (
      w: World,
      runner: import('../src/main/credentials/security').SecurityRunner,
      env: Record<string, string | undefined>
    ): import('../src/main/credentials/stores').StoreDeps => ({
      ...makeStores(w),
      runner,
      env,
      keychainForClaude: true,
      userName: OS_USER
    });
    const strayOf = (service: string): KeychainRow => ({
      service,
      account: STRAY,
      payload: claudeCredential('stray', service.slice(-8)),
      modified: '20260910024431Z'
    });

    // ---- 20a. THE ADDRESS, over every function that names a vendor item ----
    {
      const w = makeWorld();
      const sec = fakeSecurity(w);
      const d = storesOver(w, sec.runner, { USER: VENDOR });
      // THE STRAYS FIRST, one under every name this world drives.
      for (const name of [
        PLAIN,
        `${PLAIN}${STAGED}`,
        scopedOf(DIR_D),
        `${scopedOf(DIR_D)}${STAGED}`
      ]) {
        sec.items.first(strayOf(name));
      }
      const plainBytes = claudeCredential('vendor', 'plain');
      const loginBytes = claudeCredential('vendor', 'login');
      sec.items.set(PLAIN, { account: VENDOR, payload: plainBytes });
      sec.items.set(scopedOf(DIR_D), { account: VENDOR, payload: loginBytes });
      const strays = JSON.stringify(sec.items.rows.filter((r) => r.account === STRAY));
      const strayBytes = new Set(
        sec.items.rows.filter((r) => r.account === STRAY).map((r) => r.payload)
      );

      let mark = markOf(w);
      const read = await stores.readStore(d, 'claude', null);
      const readCalls = shown(sentSince(w, mark));
      mark = markOf(w);
      const settled = await stores.readSettledStore(d, 'claude', null);
      const settledCalls = shown(sentSince(w, mark));
      mark = markOf(w);
      const readLogin = await stores.readStore(d, 'claude', DIR_D);
      const readLoginCalls = shown(sentSince(w, mark));

      const nextLogin = claudeCredential('vendor', 'login-next');
      mark = markOf(w);
      const target = await stores.storeTarget(d, 'claude', DIR_D);
      const targetPut = target === null ? null : await swap.safeSwap(target, nextLogin);
      const targetCalls = shown(sentSince(w, mark));

      const nextPlain = claudeCredential('vendor', 'plain-next');
      mark = markOf(w);
      const lift = await stores.defaultStoreTarget(d, 'claude');
      const liftPut = lift === null ? null : await swap.safeSwap(lift, nextPlain);
      const liftCalls = shown(sentSince(w, mark));

      const loginAfterWrite = sec.items.get(scopedOf(DIR_D), VENDOR)?.payload ?? null;
      const plainAfterWrite = sec.items.get(PLAIN, VENDOR)?.payload ?? null;

      mark = markOf(w);
      await stores.forgetStore(d, 'claude', DIR_D);
      const forgetCalls = shown(sentSince(w, mark));
      const loginGone = !sec.items.has(scopedOf(DIR_D), VENDOR);

      mark = markOf(w);
      const print = await watchMod.defaultKeychainFingerprint({
        stores: d
      } as unknown as import('../src/main/credentials/keep').KeepDeps);
      const printCalls = shown(sentSince(w, mark));

      const every = sentSince(w, { argv: 0, stdin: 0 });
      out['vendorAddress'] = {
        read: {
          calls: readCalls,
          where: read.where,
          account: accountLabel(read.account),
          vendorBytes: read.payload === plainBytes
        },
        settled: { calls: settledCalls, vendorBytes: settled?.payload === plainBytes },
        readLogin: {
          calls: readLoginCalls,
          account: accountLabel(readLogin.account),
          vendorBytes: readLogin.payload === loginBytes
        },
        target: {
          calls: targetCalls,
          ok: targetPut?.ok === true,
          vendorItemHoldsIt: loginAfterWrite === nextLogin
        },
        lift: {
          calls: liftCalls,
          ok: liftPut?.ok === true,
          vendorItemHoldsIt: plainAfterWrite === nextPlain
        },
        forget: { calls: forgetCalls, vendorItemGone: loginGone },
        fingerprint: {
          calls: printCalls,
          namesVendor: typeof print === 'string' && print.includes(`=${VENDOR}`),
          namesStray: typeof print === 'string' && print.includes(STRAY)
        },
        // THE WHOLE WORLD, every call above: a vendor name without the vendor
        // account, a call naming the stray, a stray row changed, and a stray's
        // bytes in anything a function answered.
        unaddressed: every.filter(
          (c) => c.service !== null && isVendorName(c.service) && c.account !== VENDOR
        ).length,
        vendorCalls: every.filter((c) => c.service !== null && isVendorName(c.service)).length,
        strayNamed: every.some((c) => c.account === STRAY),
        straysUntouched:
          JSON.stringify(sec.items.rows.filter((r) => r.account === STRAY)) === strays,
        strayBytesAnswered: [read.payload, settled?.payload, readLogin.payload].some(
          (bytes) => typeof bytes === 'string' && strayBytes.has(bytes)
        )
      };

      // D3, THE ONE NAME. `CLAUDE_CONFIG_DIR` set, no scoped item for it, and a
      // whole vendor credential under the plain name: a Claude Code session
      // under that directory finds nothing, and so must every reader here.
      const wc = makeWorld();
      const secC = fakeSecurity(wc);
      const dc = storesOver(wc, secC.runner, { USER: VENDOR, CLAUDE_CONFIG_DIR: DIR_C });
      secC.items.first(strayOf(PLAIN));
      secC.items.set(PLAIN, { account: VENDOR, payload: plainBytes });
      const cMark = markOf(wc);
      const cRead = await stores.readStore(dc, 'claude', null);
      await watchMod.defaultKeychainFingerprint({
        stores: dc
      } as unknown as import('../src/main/credentials/keep').KeepDeps);
      (out['vendorAddress'] as Record<string, unknown>)['configDir'] = {
        calls: shown(sentSince(wc, cMark)),
        readNothing: cRead.payload === null
      };
    }

    // ---- 20c. NO ACCOUNT, NO CALL ----
    {
      const w = makeWorld();
      const sec = fakeSecurity(w);
      const vendorNames = [
        PLAIN,
        `${PLAIN}${STAGED}`,
        scopedOf(DIR_D),
        `${scopedOf(DIR_D)}${STAGED}`
      ];
      for (const name of vendorNames) {
        sec.items.first(strayOf(name));
        sec.items.set(name, { account: VENDOR, payload: claudeCredential('vendor', name.slice(-8)) });
      }
      const rowsBefore = JSON.stringify(sec.items.rows);
      // `undefined` because an untyped caller can still leave the argument
      // off, and the quote because it is an account the domain will not name.
      const missing: unknown[] = [null, undefined, '', 'p281"stray'];
      const answers: unknown[] = [];
      for (const name of vendorNames) {
        for (const account of missing) {
          const a = account as string | null;
          answers.push(await security.keychainRead(sec.runner, name, a));
          answers.push(await security.keychainAccount(sec.runner, name, a));
          answers.push(await security.keychainModified(sec.runner, name, a));
          answers.push(await security.keychainHasItem(sec.runner, name, a));
          answers.push(await security.keychainDelete(sec.runner, name, a));
        }
      }
      const refusedReached = w.argvs.length;
      const rowsKept = JSON.stringify(sec.items.rows) === rowsBefore;

      // THE CONTROLS. The same five functions with the vendor account reach
      // the runner once each, aimed at the vendor row. A name outside the
      // namespace with no account sends the service-only argv it always sent,
      // which is what Tortie's own vault names still send.
      const mark = markOf(w);
      const name = PLAIN;
      await security.keychainRead(sec.runner, name, VENDOR);
      await security.keychainAccount(sec.runner, name, VENDOR);
      await security.keychainModified(sec.runner, name, VENDOR);
      await security.keychainHasItem(sec.runner, name, VENDOR);
      const addressed = w.argvs.slice(mark.argv).map((argv) => argv.join(' '));
      const outside = [
        'Tortie-credentials-claude.default-0123abcd',
        `${PLAIN}X`,
        'Claude Code'
      ];
      const outsideMark = markOf(w);
      for (const other of outside) {
        await security.keychainRead(sec.runner, other, null);
        await security.keychainHasItem(sec.runner, other, null);
      }
      const outsideArgv = w.argvs.slice(outsideMark.argv);
      out['vendorRefusal'] = {
        asked: missing.length * vendorNames.length * 5,
        refusedReached,
        refusedAnswers: answers.every((a) => a === null || a === false),
        rowsKept,
        addressed,
        outsideExact:
          JSON.stringify(outsideArgv) ===
          JSON.stringify(
            outside.flatMap((other) => [
              ['find-generic-password', '-s', other, '-w'],
              ['find-generic-password', '-s', other]
            ])
          )
      };
    }

    // ---- 20d. A DIRECTORY WITH NO SCOPED ITEM COMMITS UNDER THE VENDOR ACCOUNT ----
    {
      const shapes: [string, Record<string, string | undefined>, string][] = [
        ['USER', { USER: VENDOR }, 'vendor'],
        ['user name', {}, 'os-user'],
        ['fallback', { USER: 'p281 not a name' }, 'fallback']
      ];
      const commits: Record<string, unknown> = {};
      for (const [why, env, expected] of shapes) {
        const w = makeWorld();
        const sec = fakeSecurity(w);
        const d = storesOver(w, sec.runner, env);
        const ruleAccount = claudeKeychainAccount(env, () => OS_USER);
        sec.items.first(strayOf(PLAIN));
        sec.items.set(PLAIN, { account: ruleAccount, payload: claudeCredential('vendor', why) });
        const strays = JSON.stringify(sec.items.rows.filter((r) => r.account === STRAY));
        const bytes = claudeCredential('chosen', why);
        let mark = markOf(w);
        const target = await stores.storeTarget(d, 'claude', DIR_E);
        const put = target === null ? null : await swap.safeSwap(target, bytes);
        const targetAdds = shown(sentSince(w, mark).filter((c) => c.verb === 'add'));
        const eRows = sec.items.rows
          .filter((r) => r.service === scopedOf(DIR_E))
          .map((r) => `${accountLabel(r.account)}:${r.payload === bytes ? 'chosen' : 'other'}`);
        const liftBytes = claudeCredential('lifted', why);
        mark = markOf(w);
        const lift = await stores.defaultStoreTarget(d, 'claude');
        const lifted = lift === null ? null : await swap.safeSwap(lift, liftBytes);
        const liftAdds = shown(sentSince(w, mark).filter((c) => c.verb === 'add'));
        const plainRows = sec.items.rows
          .filter((r) => r.service === PLAIN)
          .map((r) => `${accountLabel(r.account)}:${r.payload === liftBytes ? 'lifted' : 'other'}`);
        commits[why] = {
          expected,
          ruleAgrees: accountLabel(ruleAccount) === expected,
          targetOk: put?.ok === true,
          targetAdds,
          eRows,
          liftOk: lifted?.ok === true,
          liftAdds,
          plainRows,
          straysUntouched:
            JSON.stringify(sec.items.rows.filter((r) => r.account === STRAY)) === strays
        };
      }
      out['vendorCommit'] = commits;
    }
  }

  // -------------------------------------------------------------------------
  // 10b. A LOGIN THE PERSON REMOVES LEAVES NOTHING BEHIND (Phase 206).
  //
  //      THE DEFECT, found by the Phase 203 verifier on the operator's own
  //      disk: `<userData>/gmux/logins/claude/` held two directories while
  //      `logins.json` held one row, and the second one's scoped keychain item
  //      was still there holding a whole credential of his. Remove deleted the
  //      row and not the rest.
  //
  //      Phase 206 chose to FINISH THE REMOVAL rather than adopt the stray
  //      back onto the menu. Five shapes are driven here, and every one of
  //      them was reproduced against the parent commit.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    const security = fakeSecurity(w);
    const d = {
      ...makeDeps(root, w),
      stores: {
        ...makeStores(w),
        runner: security.runner,
        keychainForClaude: true
      }
    };
    // The person's own item, which nothing in this arm may ever touch.
    const OWN = claudeCredential('person', 'own');
    security.items.set('Claude Code-credentials', { account: GATE_ACCOUNT, payload: OWN });

    /** Give one login everything a signed in login has. */
    const furnish = (id: string, who: string): string => {
      const dir = loginDirIn(root, 'claude', id);
      const service = stores.claudeWriteService(dir);
      security.items.set(service, {
        account: GATE_ACCOUNT,
        payload: claudeCredential(who, '1')
      });
      d.vault.slots.set(vault.slotFor('claude', id), claudeCredential(who, '1'));
      kept.updateKeptFile(
        root,
        {
          [vault.slotFor('claude', id)]: {
            email: `${who}@example.com`,
            subject: null,
            digest: payload.credentialDigest(claudeCredential(who, '1')),
            account: GATE_ACCOUNT,
            from: null,
            at: 1
          }
        },
        []
      );
      return service;
    };
    const holds = (id: string): { item: boolean; slot: boolean; row: boolean; dir: boolean } => {
      const dir = loginDirIn(root, 'claude', id);
      return {
        item: security.items.has(stores.claudeWriteService(dir)),
        slot: d.vault.slots.has(vault.slotFor('claude', id)),
        row: kept.readKeptFile(root).file.slots[vault.slotFor('claude', id)] !== undefined,
        dir: existsSync(dir)
      };
    };

    // SHAPE 1. A stray with a keychain item, being the operator's own case.
    // The row is taken out of the file the way the old remove took it out,
    // leaving the directory, the item, the slot and the record row behind.
    addLogin(root, 'claude', 'Itavero');
    const one = readLoginsFile(root).file.logins[0];
    const oneId = one?.id ?? '';
    furnish(oneId, 'itavero');
    writeFileSync(
      loginsFileIn(root),
      JSON.stringify({ v: 1, chosen: {}, logins: [] }),
      'utf8'
    );
    const strayBefore = holds(oneId);

    // SHAPE 2. A stray that was never signed into, beside it.
    const bareId = '00000000deadbeef';
    mkdirSync(loginDirIn(root, 'claude', bareId), { recursive: true });

    // SHAPE 3. A NAME COLLISION. Two rows share a name, so the reader drops
    // the second one WHOLE; both are still rows the person added, and neither
    // directory may be swept. The raw id read is the whole of that protection.
    const liveId = '1111111111111111';
    const shadowId = '2222222222222222';
    for (const id of [liveId, shadowId]) {
      mkdirSync(loginDirIn(root, 'claude', id), { recursive: true });
    }
    furnish(liveId, 'live');
    furnish(shadowId, 'shadow');
    writeFileSync(
      loginsFileIn(root),
      JSON.stringify({
        v: 1,
        chosen: {},
        logins: [
          { provider: 'claude', id: liveId, name: 'Work', createdAt: 1 },
          { provider: 'claude', id: shadowId, name: 'Work', createdAt: 2 }
        ]
      }),
      'utf8'
    );
    const droppedBySanitizer =
      readLoginsFile(root).file.logins.filter((l) => l.name === 'Work').length === 1;

    // SHAPE 4. A stray that is a SYMBOLIC LINK to a directory Tortie does not
    // own. Nothing may be read or written through it, and the entry itself
    // must still go.
    const victim = join(root, 'not-tortie-own');
    mkdirSync(victim, { recursive: true });
    writeFileSync(join(victim, 'auth.json'), 'THE-PERSON-OWN-BYTES', 'utf8');
    const linkId = '3333333333333333';
    symlinkSync(victim, loginDirIn(root, 'claude', linkId));

    // SHAPE 6. A STRAY WHOSE DIRECTORY IS NOT THERE (Phase 206 fix round).
    // Its keychain item, its vault slot and its record row are all still
    // holding a credential and no row names it, so it is a stray by every
    // measure except the one the sweep used to take, which was a `readdir` of
    // the provider root. It never gets a directory here at all.
    const noDirId = '5555555555555555';
    const noDirService = furnish(noDirId, 'nodir');
    const noDirBefore = holds(noDirId);

    const finished = await keep.finishStrayLogins(d, 'claude');

    // SHAPE 5. A REMOVE INTERRUPTED BETWEEN ITS TWO HALVES, in the order the
    // registrar now uses: the credentials first, then the row. The crash is
    // the second half never running.
    const halfId = '4444444444444444';
    mkdirSync(loginDirIn(root, 'claude', halfId), { recursive: true });
    furnish(halfId, 'half');
    await keep.forgetLogin(d, 'claude', halfId);
    const afterFirstHalf = holds(halfId);

    out['removal'] = {
      // The stray really did hold a credential before the sweep, so every
      // reading under it is a check over something that existed.
      strayHeldACredential:
        strayBefore.item && strayBefore.slot && strayBefore.row && strayBefore.dir,
      finishedCount: finished.length,
      strayCleared:
        !holds(oneId).item &&
        !holds(oneId).slot &&
        !holds(oneId).row &&
        !holds(oneId).dir,
      bareStrayCleared: !existsSync(loginDirIn(root, 'claude', bareId)),
      // THE COLLISION. Both rows name their id in the file, so neither is a
      // stray, even though the reader can only ever use one of them.
      droppedBySanitizer,
      liveKept: holds(liveId).dir && holds(liveId).item,
      shadowKept: holds(shadowId).dir && holds(shadowId).item,
      // THE LINK. The entry goes, and what it pointed at is untouched.
      linkGone: !existsSync(loginDirIn(root, 'claude', linkId)),
      victimUntouched:
        readFileSync(join(victim, 'auth.json'), 'utf8') === 'THE-PERSON-OWN-BYTES',
      // THE INTERRUPTED REMOVE strands no credential: what is left is a login
      // the person can still see and remove again.
      interruptedLeftNoCredential:
        !afterFirstHalf.item && !afterFirstHalf.slot && !afterFirstHalf.row,
      interruptedLeftTheFolder: afterFirstHalf.dir,
      // SHAPE 6. THE STRAY WITH NO DIRECTORY. It held a credential in all
      // three of the places that outlive a folder, and all three are cleared.
      noDirHeldACredential:
        noDirBefore.item && noDirBefore.slot && noDirBefore.row && !noDirBefore.dir,
      noDirCleared:
        !security.items.has(noDirService) &&
        !d.vault.slots.has(vault.slotFor('claude', noDirId)) &&
        kept.readKeptFile(root).file.slots[vault.slotFor('claude', noDirId)] ===
          undefined,
      // THE PERSON'S OWN ITEM, through all of it.
      ownItemUntouched:
        security.items.get('Claude Code-credentials')?.payload === OWN,
      // AND NO NAME THIS ARM COMPOSED IS THE PERSON'S OWN. Every service a
      // delete was asked for carries the directory digest.
      deleteNamedOwnItem: w.argvs.some(
        (argv) =>
          argv[0] === 'delete-generic-password' &&
          argv.includes('Claude Code-credentials')
      ),
      deletesAsked: w.argvs.filter((argv) => argv[0] === 'delete-generic-password')
        .length
    };
  }

  // -------------------------------------------------------------------------
  // 17. THE VAULT IS ONE SEALED FILE, AND THE KEYCHAIN IS READ ONCE (Phase
  //     208, rewritten by Phase 304). A scratch root and the person's root
  //     compose DIFFERENT legacy names, no name composed from any root equals
  //     the unscoped one, the digest is re-derived here by a sha256 of this
  //     file's own, the read-through asks exactly the scoped name and lands
  //     the answer in a sealed FILE, a profile is blind to another's item, and
  //     the migration reads or deletes the unscoped name only in the person's
  //     own profile. THE READ-THROUGH is driven step by step: a miss with a
  //     scoped item planted, the delete refused, the seal unavailable during
  //     the read-through, the read-back disagreeing, and the boot pass sweeping
  //     a duplicate the read-through left beside a sealed file.
  // -------------------------------------------------------------------------
  if (migrate === null) {
    // The domain has no migration at all. Say so as a reading rather than by
    // dying, so rule 17 can name itself.
    out['scope'] = { absent: true };
  } else {
    const ownRoot = '/Users/someone/Library/Application Support/Tortie/gmux/logins';
    const scratchRoot = '/private/tmp/gmux-p208-1234/profile/gmux/logins';
    const roots = [ownRoot, scratchRoot, '/', 'x', `${ownRoot}/`];
    const slots = [
      vault.slotFor('claude', null),
      vault.slotFor('codex', null),
      vault.slotFor('claude', 'a'.repeat(16)),
      vault.stagedSlotFor(vault.slotFor('claude', null))
    ];
    const unscopedOf = (slot: string): string => `Tortie-credentials-${slot}`;
    let differ = true;
    let neverUnscoped = true;
    let digestRederived = true;
    for (const slot of slots) {
      if (vault.vaultServiceFor(slot, ownRoot) === vault.vaultServiceFor(slot, scratchRoot)) {
        differ = false;
      }
      for (const root of roots) {
        const name = vault.vaultServiceFor(slot, root);
        for (const other of slots) if (name === unscopedOf(other)) neverUnscoped = false;
        const digest = createHash('sha256').update(root).digest('hex').slice(0, 8);
        if (name !== `Tortie-credentials-${slot}-${digest}`) digestRederived = false;
      }
    }
    let emptyScopeThrows = false;
    try {
      vault.vaultServiceFor('claude.default', '');
    } catch {
      emptyScopeThrows = true;
    }
    // THE ONLY COMPOSER OF THE UNSCOPED NAME agrees with this file's spelling.
    const composerAgrees = migrate.unscopedVaultServiceFor('claude.default') === unscopedOf('claude.default');

    // THE READ-THROUGH, over the measured security (Phase 304). One scoped item
    // is planted under the scratch root's name and a sealed vault for that
    // root is asked for the slot: the only names on any argv must be exactly
    // that scoped name, no `-i` line may be composed, the answer must be the
    // item's bytes, and the sealed file must now hold them behind the seal.
    // Then a vault for the PERSON'S root over the same keychain asks for the
    // same slot, and must answer nothing and write nothing.
    const w = makeWorld();
    const security = fakeSecurity(w);
    const scratchSeal = injectedSeal();
    const scratchDir = freshRoot();
    const scopedName = vault.vaultServiceFor('claude.default', scratchRoot);
    security.items.set(scopedName, { account: 'tortie', payload: claudeCredential('scoped', '1') });
    const scoped = sealedFor(scratchDir, scratchSeal, legacyOver(security.runner, scratchRoot));
    const readThroughAnswer = await scoped.get('claude.default');
    const namesAsked = w.argvs.map((argv) => argv[argv.indexOf('-s') + 1] ?? '');
    const backendNamesScoped =
      namesAsked.length > 0 &&
      namesAsked.every((n) => n === scopedName) &&
      w.stdins.length === 0 &&
      readThroughAnswer === claudeCredential('scoped', '1') &&
      scratchSeal.open(sealedFileOf(scratchDir, 'claude.default') ?? '') ===
        claudeCredential('scoped', '1');
    const ownDir = freshRoot();
    const crossProfileHidden =
      (await sealedFor(ownDir, injectedSeal(), legacyOver(security.runner, ownRoot)).get(
        'claude.default'
      )) === null && sealedFileOf(ownDir, 'claude.default') === null;

    /**
     * ONE READ-THROUGH, step by step, with one thing made to fail (Phase 304).
     * The answer is graded against `held` on every arm, because a caller is
     * never told "nothing" about a credential that exists; what differs is
     * which copies are left and which calls were made.
     */
    const readThrough = async (fault: 'none' | 'refuseDelete' | 'wrapNull' | 'openWrong') => {
      const root = freshRoot();
      const world = makeWorld();
      const sec = fakeSecurity(world);
      const name = vault.vaultServiceFor('claude.default', root);
      const held = claudeCredential('legacy', '1');
      sec.items.set(name, { account: 'tortie', payload: held });
      const runner: import('../src/main/credentials/security').SecurityRunner = {
        run: async (argv, stdin) => {
          if (fault === 'refuseDelete' && argv[0] === 'delete-generic-password') {
            // Recorded as asked, refused as `security` refuses: the item stays.
            world.argvs.push([...argv]);
            return { code: 1, stdout: '' };
          }
          return sec.runner.run(argv, stdin);
        }
      };
      const base = injectedSeal();
      const seal: import('../src/main/credentials/vault').VaultSeal = {
        wrap: (text) => (fault === 'wrapNull' ? null : base.wrap(text)),
        open: (blob) => (fault === 'openWrong' ? claudeCredential('other', '9') : base.open(blob))
      };
      const backend = sealedFor(root, seal, legacyOver(runner, root));
      const shape = (argv: readonly string[]): string =>
        `${(argv[0] ?? '').replace('-generic-password', '')} ${argv.slice(1).join(' ')}`.replace(name, '<scoped>');
      const first = await backend.get('claude.default');
      const firstArgvs = world.argvs.map(shape);
      const fileAfterFirst = sealedFileOf(root, 'claude.default');
      const itemAfterFirst = sec.items.has(name);
      const second = await backend.get('claude.default');
      const secondArgvs = world.argvs.slice(firstArgvs.length).map(shape);
      return {
        answered: first === held,
        argvs: firstArgvs,
        lines: world.stdins.length,
        filePresent: fileAfterFirst !== null,
        fileOpens: fileAfterFirst !== null && base.open(fileAfterFirst) === held,
        fileIsNotThePayload: fileAfterFirst !== held,
        itemPresent: itemAfterFirst,
        secondAnswered: second === held,
        secondArgvs
      };
    };
    const rtMiss = await readThrough('none');
    const rtRefusedDelete = await readThrough('refuseDelete');
    const rtWrapNull = await readThrough('wrapNull');
    const rtOpenWrong = await readThrough('openWrong');

    // The migration, both ways, over the measured security and the sealed
    // vault (Phase 304): `vaultPut` now writes the sealed file, and `legacy`
    // is the same program's scoped items, read and never written.
    const arm = async (
      plant: (items: KeychainItems, root: string) => void,
      ownProfile: boolean,
      record: string | null = null,
      vanishAfterConfirm = false
    ) => {
      const root = freshRoot();
      const world = makeWorld();
      const sec = fakeSecurity(world);
      plant(sec.items, root);
      const runner = sec.runner;
      // A SEAL WHOSE SECOND OPENING OF ANY BLOB ANSWERS NOTHING, for the arm
      // that proves the old item is deleted only once the new copy is read
      // back by the migration itself. The shipping write already opens every
      // blob it writes once, to confirm its own commit, so the one read that
      // can still disagree is the migration's own, and this is the seal that
      // makes it disagree. Until Phase 304 this was a keychain whose scoped
      // ITEM vanished after the write confirmed it.
      const base = injectedSeal();
      const opened = new Set<string>();
      const seal: import('../src/main/credentials/vault').VaultSeal = vanishAfterConfirm
        ? {
            wrap: (text) => base.wrap(text),
            open: (blob) => {
              if (opened.has(blob)) return null;
              opened.add(blob);
              return base.open(blob);
            }
          }
        : base;
      if (record !== null) {
        kept.writeKeptFile(root, {
          v: 1,
          slots: {
            'claude.default': {
              email: null,
              subject: null,
              digest: payload.credentialDigest(record),
              account: null,
              from: null,
              at: 1
            }
          }
        });
      }
      const result = await migrate.migrateUnscopedVault({
        runner,
        vault: sealedFor(root, seal, legacyOver(runner, root)),
        legacy: legacyOver(runner, root),
        root,
        slots: ['claude.default', vault.slotFor('claude', 'b'.repeat(16))],
        ownProfile: ownProfile ? 'own' : 'elsewhere'
      });
      const named = world.argvs
        .map((argv) => argv[argv.indexOf('-s') + 1] ?? '')
        .concat(world.stdins.map((line) => /-s "([^"]*)"/.exec(line)?.[1] ?? ''));
      // The sealed file, opened through the arm's own base seal, so a vanishing
      // seal's refusals do not colour what the file really holds.
      const fileText = sealedFileOf(root, 'claude.default');
      return {
        result,
        items: [...sec.items.entries()].map(([k, v]) => [k, v.payload]),
        namedUnscoped: named.some((n) => n === unscopedOf('claude.default') || n === unscopedOf(vault.slotFor('claude', 'b'.repeat(16)))),
        // PHASE 304. Not one `-i` line on any migration arm: the sealed file is
        // where the move lands, and the keychain is only ever read and deleted.
        lines: world.stdins.length,
        fileHolds: fileText === null ? null : base.open(fileText),
        root
      };
    };
    const old = claudeCredential('old', '1');
    const present = await arm((items) => {
      items.set(unscopedOf('claude.default'), { account: 'tortie', payload: old });
    }, true);
    const absent = await arm(() => undefined, true);
    const refused = await arm((items) => {
      items.set(unscopedOf('claude.default'), { account: 'tortie', payload: old });
    }, false);
    const recordedOld = await arm(
      (items, root) => {
        items.set(unscopedOf('claude.default'), { account: 'tortie', payload: old });
        items.set(vault.vaultServiceFor('claude.default', root), {
          account: 'tortie',
          payload: claudeCredential('stale', '2')
        });
      },
      true,
      old
    );
    const staged = await arm((items) => {
      items.set(unscopedOf(vault.stagedSlotFor('claude.default')), {
        account: 'tortie',
        payload: claudeCredential('residue', '3')
      });
    }, true);
    // PHASE 219, item 4b. A `security` that refuses EVERY delete with the 44
    // it uses for an item it could not find. Before this round `keychainDelete`
    // answered `void`, so this arm read `deleted: 2` with both items still on
    // the machine and the next launch finding them again.
    const refusedDelete = await (async () => {
      const root = freshRoot();
      const world = makeWorld();
      const sec = fakeSecurity(world);
      sec.items.set(unscopedOf('claude.default'), { account: 'tortie', payload: old });
      sec.items.set(unscopedOf(vault.stagedSlotFor('claude.default')), {
        account: 'tortie',
        payload: claudeCredential('residue', '4')
      });
      const runner = {
        run: async (argv: readonly string[], stdin?: string) =>
          argv[0] === 'delete-generic-password'
            ? { code: 44, stdout: '' }
            : sec.runner.run(argv, stdin)
      };
      const result = await migrate.migrateUnscopedVault({
        runner,
        vault: sealedFor(root, injectedSeal(), legacyOver(runner, root)),
        legacy: legacyOver(runner, root),
        root,
        slots: ['claude.default'],
        ownProfile: 'own' as const
      });
      return {
        result,
        stillThere:
          sec.items.has(unscopedOf('claude.default')) &&
          sec.items.has(unscopedOf(vault.stagedSlotFor('claude.default')))
      };
    })();
    const badReadback = await arm(
      (items) => {
        items.set(unscopedOf('claude.default'), { account: 'tortie', payload: old });
      },
      true,
      null,
      true
    );
    // PHASE 304 (e). THE BOOT PASS SWEEPS A DUPLICATE. A sealed file that
    // answers, with the SCOPED item still beside it, is the one shape the
    // read-through cannot reach, because a hit asks the keychain nothing. The
    // pass must delete the item, count it, and leave the file holding what it
    // held. Its sibling is the older-build rule applied to this pair: when the
    // record names the ITEM's bytes and not the file's, the file is rewritten
    // from the item first and the item then deleted. And the fourth shape,
    // from the fix round: the bytes DIFFER and the record names NEITHER, so
    // nothing proves which copy this profile can reach and the pass must
    // leave both, counted as kept, deleting nothing.
    const sweep = async (twin: string, recorded: string | null) => {
      const root = freshRoot();
      const world = makeWorld();
      const sec = fakeSecurity(world);
      const seal = injectedSeal();
      const backend = sealedFor(root, seal, legacyOver(sec.runner, root));
      const sealedBytes = claudeCredential('sealed', '5');
      await backend.put('claude.default', sealedBytes);
      sec.items.set(vault.vaultServiceFor('claude.default', root), {
        account: 'tortie',
        payload: twin
      });
      if (recorded !== null) {
        kept.writeKeptFile(root, {
          v: 1,
          slots: {
            'claude.default': {
              email: null,
              subject: null,
              digest: payload.credentialDigest(recorded),
              account: null,
              from: null,
              at: 1
            }
          }
        });
      }
      const result = await migrate.migrateUnscopedVault({
        runner: sec.runner,
        vault: backend,
        legacy: legacyOver(sec.runner, root),
        root,
        slots: ['claude.default'],
        ownProfile: 'own' as const
      });
      const fileText = sealedFileOf(root, 'claude.default');
      const fileHolds = fileText === null ? null : seal.open(fileText);
      return {
        result,
        itemGone: !sec.items.has(vault.vaultServiceFor('claude.default', root)),
        fileHoldsSealed: fileHolds === sealedBytes,
        fileHoldsTwin: fileHolds === twin,
        lines: world.stdins.length
      };
    };
    const sweepDuplicate = await sweep(claudeCredential('sealed', '5'), null);
    const sweepRecordedTwin = await sweep(claudeCredential('older-build', '6'), claudeCredential('older-build', '6'));
    const sweepUnprovenTwin = await sweep(claudeCredential('unproven', '7'), null);
    const holds = (a: { items: string[][]; root: string }, name: string): string | null =>
      a.items.find(([k]) => k === name)?.[1] ?? null;
    out['scope'] = {
      differ,
      neverUnscoped,
      digestRederived,
      emptyScopeThrows,
      composerAgrees,
      backendNamesScoped,
      crossProfileHidden,
      // PHASE 219, item 4a. Four REAL shapes on a REAL disk with a REAL link.
      // `resolve` follows nothing, so the two MIXED spellings read false and a
      // person whose home is behind a link was refused the migration for ever,
      // with `refused: true` in a log line as the only trace.
      linkedProfile: ((): Record<string, unknown> => {
        const home = freshRoot();
        const real = join(home, 'real');
        const support = join(real, 'Library', 'Application Support');
        mkdirSync(join(support, 'Tortie'), { recursive: true });
        symlinkSync(real, join(home, 'link'));
        const linkedSupport = join(home, 'link', 'Library', 'Application Support');
        const shapes: [string, string, string][] = [
          ['both real', join(support, 'Tortie'), support],
          ['both through the link', join(linkedSupport, 'Tortie'), linkedSupport],
          ['userData real, appData linked', join(support, 'Tortie'), linkedSupport],
          ['userData linked, appData real', join(linkedSupport, 'Tortie'), support]
        ];
        const elsewhere = join(home, 'profile');
        mkdirSync(elsewhere, { recursive: true });
        return {
          verdicts: shapes.map(([why, userData, appData]) => [
            why,
            migrate.ownProfileVerdict({ userData, appData, appName: 'Tortie', env: {} })
          ]),
          // AND THE SCRATCH PROFILE IS STILL REFUSED from either spelling, or
          // the realpath fallback has widened the predicate rather than fixed
          // it, and every probe on this machine would reach his own item.
          scratchStillRefused: [support, linkedSupport].map((appData) =>
            migrate.ownProfileVerdict({
              userData: elsewhere,
              appData,
              appName: 'Tortie',
              env: {}
            })
          )
        };
      })(),
      // The refusal now says WHICH refusal it is.
      reasons: [
        migrate.ownProfileVerdict({
          userData: '/Users/someone/Library/Application Support/Tortie',
          appData: '/Users/someone/Library/Application Support',
          appName: 'Tortie',
          env: { GMUX_PROBES: '1' }
        }),
        migrate.ownProfileVerdict({ userData: '', appData: '', appName: '', env: {} }),
        migrate.ownProfileVerdict({
          userData: scratchRoot,
          appData: '/Users/someone/Library/Application Support',
          appName: 'Tortie',
          env: {}
        }),
        migrate.ownProfileVerdict({
          userData: '/Users/someone/Library/Application Support/Tortie',
          appData: '/Users/someone/Library/Application Support',
          appName: 'Tortie',
          env: {}
        })
      ],
      ownProfile: {
        own: migrate.isOwnProfile({
          userData: '/Users/someone/Library/Application Support/Tortie',
          appData: '/Users/someone/Library/Application Support',
          appName: 'Tortie',
          env: {}
        }),
        scratch: migrate.isOwnProfile({
          userData: scratchRoot,
          appData: '/Users/someone/Library/Application Support',
          appName: 'Tortie',
          env: {}
        }),
        probes: migrate.isOwnProfile({
          userData: '/Users/someone/Library/Application Support/Tortie',
          appData: '/Users/someone/Library/Application Support',
          appName: 'Tortie',
          env: { GMUX_PROBES: '1' }
        }),
        smoke: migrate.isOwnProfile({
          userData: '/Users/someone/Library/Application Support/Tortie',
          appData: '/Users/someone/Library/Application Support',
          appName: 'Tortie',
          env: { GMUX_SMOKE: 'basic' }
        })
      },
      // PHASE 304. THE READ-THROUGH, step by step. (a) a miss with the scoped
      // item planted: the file written and read back, the item deleted, the
      // answer byte equal, and exactly one find and one delete on the argvs;
      // (b) the delete refused: answered, item AND file present, and the
      // second `get` a HIT that sends nothing; (c) no seal during the
      // read-through: answered from the item, no file, no delete; (d) the
      // read-back disagreeing: no delete. No arm composes an `-i` line.
      readThrough: {
        miss: rtMiss,
        refusedDelete: rtRefusedDelete,
        wrapNull: rtWrapNull,
        openWrong: rtOpenWrong
      },
      // PHASE 304 (e). The boot pass over a sealed file with its scoped twin.
      sweep: {
        duplicate: sweepDuplicate,
        recordedTwin: sweepRecordedTwin,
        unprovenTwin: sweepUnprovenTwin
      },
      migration: {
        // PHASE 304. The unscoped move lands in the SEALED FILE, not in a
        // scoped item, and not one `-i` line is composed on the way.
        presentMoved:
          present.result.moved === 1 &&
          present.result.deleted === 1 &&
          present.fileHolds === old &&
          holds(present, unscopedOf('claude.default')) === null &&
          present.items.length === 0 &&
          present.lines === 0,
        absentUntouched:
          absent.result.moved === 0 &&
          absent.result.deleted === 0 &&
          absent.items.length === 0 &&
          absent.fileHolds === null,
        refusedNamesNothing:
          refused.result.refused === true &&
          !refused.namedUnscoped &&
          holds(refused, unscopedOf('claude.default')) === old &&
          refused.items.length === 1 &&
          refused.fileHolds === null,
        recordedOldRewritten:
          recordedOld.result.moved === 1 &&
          recordedOld.fileHolds === old &&
          holds(recordedOld, vault.vaultServiceFor('claude.default', recordedOld.root)) === null &&
          holds(recordedOld, unscopedOf('claude.default')) === null,
        stagedResidueDeleted:
          staged.result.deleted === 1 &&
          staged.result.moved === 0 &&
          staged.items.length === 0 &&
          staged.fileHolds === null,
        presentNamedUnscoped: present.namedUnscoped,
        badReadbackKept:
          badReadback.result.kept === 1 &&
          badReadback.result.deleted === 0 &&
          holds(badReadback, unscopedOf('claude.default')) === old,
        // PHASE 219, item 4a's other half: the refusal carries its reason out.
        refusedReason: refused.result.reason,
        ranReason: present.result.reason,
        // PHASE 219, item 4b.
        failedDelete: {
          deleted: refusedDelete.result.deleted,
          failed: refusedDelete.result.failed,
          moved: refusedDelete.result.moved,
          stillThere: refusedDelete.stillThere
        },
        // The honest half: a delete that WORKS is still counted as one.
        succeededDelete: present.result.failed === 0 && present.result.deleted === 1
      }
    };
  }

  // -------------------------------------------------------------------------
  // 11. THE SHAPES A PAYLOAD MAY TAKE, and the slot names.
  // -------------------------------------------------------------------------
  {
    out['shapes'] = {
      claudeOk: payload.isCredentialPayload('claude', claudeCredential('a', '1')),
      codexOk: payload.isCredentialPayload('codex', codexCredential('a', '1')),
      truncated: payload.isCredentialPayload(
        'codex',
        codexCredential('a', '1').slice(0, 20)
      ),
      notCredential: payload.isCredentialPayload('claude', '{"a":1}'),
      apiKey: payload.isCredentialPayload(
        'codex',
        JSON.stringify({ OPENAI_API_KEY: 'sk-x', tokens: { access_token: 't' } })
      ),
      slotOk: vault.isSlotName(vault.slotFor('claude', 'a'.repeat(16))),
      slotEscape: vault.isSlotName('claude.../../etc'),
      slotOther: vault.isSlotName('other.default')
    };
  }

  // -------------------------------------------------------------------------
  // 13. A LINE `security` WOULD CUT IS REFUSED BY ITS BYTES, AND THE PERSON IS
  //     TOLD (Phase 287).
  //
  //     MEASURED on 2026-09-17, twice, and again by this phase's attacker on
  //     its own scratch keychain (build/p287/SPEC.md §1): `security -i` reads
  //     at most 4,095 BYTES of command per read, so the longest line that
  //     arrives whole is 4,096 bytes with its newline; at 4,097 the last byte
  //     before the newline is split off and read as a second command, and at
  //     4,098 and above the trailing keychain path loses its own last byte,
  //     nothing is written, and the program does not exit with stdin closed
  //     until it is killed. THE COUNT IS IN BYTES: a 4,106 byte line of
  //     exactly 4,096 characters hung while the 4,096 byte line of 4,096
  //     characters wrote, so a cap compared in UTF-16 units passes a line that
  //     overruns, which is what a non-ASCII harness keychain path is.
  //
  //     NOTHING IS SPAWNED HERE. The one call that reaches a program at all
  //     names `/nonexistent/p287-security`, which is the whole point: an
  //     over-cap line must be refused before the spawn, and the only way to
  //     see the spawn HAPPEN is a program that is not there answering a spawn
  //     error. Every reading is taken with admission still OPEN, because the
  //     runner refuses a closed domain first (Phase 220), which is why this arm
  //     sits above arm 12 rather than below it.
  //
  //     NARROWED TO THE VENDOR ARM BY PHASE 304. Tortie's own store is a sealed
  //     file with no ceiling, so the vault's own refusal, the observe that told
  //     the row, and the L2, L3 and L6 shapes, every one of which began in the
  //     VAULT write's refusal, are gone with the case. What is left is the one
  //     store that can still refuse for size, the vendor's own keychain item:
  //     L5, a login whose vendor stage cannot take a payload the vault keeps,
  //     and L5b, the default lift meeting the same ceiling while the login's
  //     own store already holds the account, which is the switch that stands.
  // -------------------------------------------------------------------------
  {
    const capBytes = (security as { SECURITY_LINE_MAX_BYTES?: number })
      .SECURITY_LINE_MAX_BYTES;
    const fits = (security as { securityLineFits?: (line: string) => boolean })
      .securityLineFits;
    const TooLarge = (swap as { CredentialTooLarge?: new () => Error })
      .CredentialTooLarge;
    if (capBytes === undefined || fits === undefined) {
      // A DOMAIN FROM BEFORE THIS PHASE, read the way `migrate.ts`'s absence is
      // read: one reading the gate can name, rather than a stack that takes
      // every other rule down with it.
      out['lineCap'] = { absent: true };
    } else {
      const CAP = capBytes;
      /** The one write's line, composed exactly as `keychainWrite` composes it. */
      const lineFor = (service: string, account: string, payload: string): string =>
        `add-generic-password -U -a "${account}" -s "${service}" -X "${Buffer.from(payload, 'utf8').toString('hex')}"\n`;
      /**
       * The payload SIZE that puts a line of this shape `over` payload bytes
       * past the biggest one that fits. Every payload byte costs two hex
       * characters, so `over: 0` is the largest that fits and `over: 1` is two
       * bytes more than that.
       */
      const sizedFor = (service: string, account: string, over: number): number =>
        Math.floor((CAP - Buffer.byteLength(lineFor(service, account, ''), 'utf8')) / 2) +
        over;
      const filler = (bytes: number): string => 'x'.repeat(bytes > 0 ? bytes : 0);
      /**
       * A claude credential of EXACTLY this many bytes, naming `who`, padded in
       * a field of its own. That is the real shape of the credential that grows
       * past the cap: a Claude sign in carrying many `mcpOAuth` entries saved by
       * the sessions running under it.
       */
      const bigClaude = (who: string, nonce: string, bytes: number): string => {
        const oauth = { accessToken: `${TOKEN}-${who}-${nonce}`, subscriptionType: 'max' };
        const empty = JSON.stringify({ claudeAiOauth: oauth, mcpOAuth: '' });
        return JSON.stringify({
          claudeAiOauth: oauth,
          mcpOAuth: filler(bytes - Buffer.byteLength(empty, 'utf8'))
        });
      };
      /**
       * One world whose VENDOR STORES ARE THE KEYCHAIN, which is what macOS is,
       * and whose vault is the sealed file over the same `security` as its
       * legacy arm (Phase 304), exactly as `index.ts` composes it.
       */
      const keychainWorld = (
        live: import('../src/main/credentials/keep').LiveSession[] = [],
        storeOver: Record<string, unknown> = {}
      ) => {
        const root = freshRoot();
        const w = makeWorld();
        const sec = fakeSecurity(w);
        const base = makeDeps(root, w, live);
        return {
          root,
          w,
          sec,
          d: {
            ...base,
            vault: sealedFor(root, injectedSeal(), legacyOver(sec.runner, root)),
            stores: {
              ...base.stores,
              runner: sec.runner,
              keychainForClaude: true,
              ...storeOver
            }
          }
        };
      };
      /**
       * One `-i` line reduced to its SHAPE, because a service name carries a
       * digest of a temporary directory and a login id minted on this run, and
       * neither is the same twice. The payload never appears, only how many
       * bytes of it went, which is what makes "the same lines as today" a
       * reading rather than an assurance.
       */
      const shapeOf = (line: string): string => {
        const found =
          /^add-generic-password -U -a "([^"]*)" -s "([^"]*)" -X "([0-9a-f]*)"\n?$/.exec(
            line
          );
        if (found === null) return 'NOT THE ONE WRITE SHAPE';
        const account = found[1] ?? '';
        const service = (found[2] ?? '')
          .replace(/(claude|codex)\.[0-9a-f]{16}/g, '$1.<id>')
          .replace(/[0-9a-f]{8}/g, '<digest>');
        return `add -a ${account} -s ${service} -X <${String(
          (found[3] ?? '').length / 2
        )} bytes>`;
      };
      /** A kept login whose own store is EMPTY, which is what a switch writes into. */
      const withKeptLogin = async (
        ww: ReturnType<typeof keychainWorld>,
        name: string,
        who: string,
        bytes: number | null,
        vendorAccount: string
      ): Promise<{ id: string; dir: string; scoped: string; slot: string }> => {
        addLogin(ww.root, 'claude', name);
        const row = readLoginsFile(ww.root).file.logins.find((l) => l.name === name);
        const id = row?.id ?? '';
        const dir = loginDirIn(ww.root, 'claude', id);
        const scoped = claudeScopedService(dir);
        const slot = vault.slotFor('claude', id);
        const cred =
          bytes === null ? claudeCredential(who, '1') : bigClaude(who, '1', bytes);
        ww.sec.items.set(scoped, { account: vendorAccount, payload: cred });
        ww.w.files.set(join(dir, '.claude.json'), claudeAccountFile(who));
        await keep.observeProvider(ww.d, 'claude');
        return { id, dir, scoped, slot };
      };

      // ---- (d) The cap is a count of BYTES, asked of the one comparison. ----
      const accented = 'é'.repeat(Math.floor(CAP / 2));

      // ---- (e) keychainWrite over a recording runner. -----------------------
      const SERVICE = 'p287-cap';
      const ACCOUNT = 'tortie';
      const sent: string[] = [];
      const recorder: import('../src/main/credentials/security').SecurityRunner = {
        run: async (argv, stdin) => {
          sent.push(stdin ?? argv.join(' '));
          return { code: 0, stdout: '' };
        }
      };
      const exactPayload = filler(sizedFor(SERVICE, ACCOUNT, 0));
      const atCapAnswer = await security.keychainWrite(
        recorder,
        SERVICE,
        ACCOUNT,
        exactPayload
      );
      const sentLine = sent[0] ?? '';
      const callsAfterExact = sent.length;
      let overAnswer: boolean | null = null;
      let overThrew: string | null = null;
      let overIsClass = false;
      let overNamesPayload = false;
      try {
        overAnswer = await security.keychainWrite(
          recorder,
          SERVICE,
          ACCOUNT,
          filler(sizedFor(SERVICE, ACCOUNT, 1))
        );
      } catch (err) {
        const e = err as Error;
        overThrew = e?.name ?? 'unknown';
        overIsClass = TooLarge !== undefined && err instanceof TooLarge;
        // NO PAYLOAD AND NO LENGTH IN THE REFUSAL, asked of the message itself.
        overNamesPayload = /x{8}|\b\d{3,}\b/.test(`${e?.name ?? ''} ${e?.message ?? ''}`);
      }

      // ---- (f) defaultSecurityRunner, over a MULTI-BYTE keychain path. ------
      // `isPlainKeychainPath` caps UTF-16 units and not bytes, so a path of
      // accented letters is a path the domain will name whose suffix alone can
      // take a line that passes a `.length` cap past the measured buffer. This
      // is finding 5, and at the parent the program IS spawned with 4,100 bytes.
      const accentedPath = `/tmp/p287-${'é'.repeat(100)}/k.keychain-db`;
      const suffixed = (bare: string): string =>
        `${bare.replace(/\n$/, '')} "${accentedPath}"\n`;
      const headText = 'add-generic-password ';
      const unitsCapLine = `${headText}${filler(
        CAP - accentedPath.length - 3 - headText.length - 1
      )}\n`;
      const underCapLine = `${headText}${filler(
        CAP - Buffer.byteLength(accentedPath, 'utf8') - 3 - headText.length - 1
      )}\n`;
      const runner = security.defaultSecurityRunner(
        accentedPath,
        '/nonexistent/p287-security'
      );
      const callsBefore = security.securityCallCount();
      const refusedRun = await runner.run(['-i'], unitsCapLine);
      const callsAfterRefused = security.securityCallCount();
      const spawnedRun = await runner.run(['-i'], underCapLine);
      const callsAfterSpawned = security.securityCallCount();

      // ---- (g) L5. THE VENDOR STAGE THAT DOES NOT FIT THOUGH THE VAULT DID. --
      // The vendor's staged name carries the account, so a long vendor account
      // makes the vendor's line the one that does not fit, and a payload the
      // sealed vault keeps without a ceiling (Phase 304) cannot be written back
      // into the store it came from. 1,940 bytes is under the ceiling for a
      // short account and over it for a 60 character one, so the ACCOUNT is
      // what decides, and the reading below says which line was refused.
      const longAccount = `p287-account-${'a'.repeat(47)}`;
      const L5_BYTES = 1_940;
      const l5World = keychainWorld([], { userName: longAccount });
      l5World.sec.items.set(CLAUDE_KEYCHAIN_SERVICE, {
        account: longAccount,
        payload: claudeCredential('alice', '1')
      });
      l5World.w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('alice'));
      await keep.observeProvider(l5World.d, 'claude');
      const l5Login = await withKeptLogin(l5World, 'long', 'bob', L5_BYTES, longAccount);
      const l5Cred = bigClaude('bob', '1', L5_BYTES);
      const l5Vendor = `${stores.claudeWriteService(l5Login.dir)}.tortie-pending`;
      const l5Held = await vault.vaultGet(l5World.d.vault, l5Login.slot);
      l5World.sec.items.delete(l5Login.scoped, longAccount);
      const l5LinesBefore = l5World.w.stdins.length;
      const l5Put = await keep.activateLogin(l5World.d, 'claude', 'long');
      const l5HeldAfter = await vault.vaultGet(l5World.d.vault, l5Login.slot);

      // ---- (g′) L5b. THE DEFAULT LIFT MEETS THE VENDOR'S CEILING WHILE THE
      // LOGIN'S OWN STORE ALREADY HOLDS THE ACCOUNT, which is the one switch
      // that stands with a named reason (Phase 287, kept by Phase 304 because
      // its reason begins in the VENDOR write and nowhere else). With a default
      // session live the lift is tried and refused before any spawn: the
      // answer is ok with nothing written and `why` carried, the default item
      // holds its own bytes, the outgoing default account was promoted into a
      // login of its own BEFORE the refusal, and the choice is recorded. With
      // no default session nothing is tried, so nothing failed and no `why`.
      const l5b = async (sessionLive: boolean): Promise<Record<string, unknown>> => {
        const ww = keychainWorld(
          sessionLive ? [{ provider: 'claude' as LoginProviderId, login: null }] : [],
          { userName: longAccount }
        );
        const small = claudeCredential('alice', '1');
        ww.sec.items.set(CLAUDE_KEYCHAIN_SERVICE, { account: longAccount, payload: small });
        ww.w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('alice'));
        await keep.observeProvider(ww.d, 'claude');
        const login = await withKeptLogin(ww, 'long', 'bob', L5_BYTES, longAccount);
        const linesBefore = ww.w.stdins.length;
        const put = await keep.activateLogin(ww.d, 'claude', 'long');
        if (put.ok) chooseLogin(ww.root, 'claude', 'long');
        const rows = readLoginsFile(ww.root).file;
        return {
          ok: put.ok,
          wrote: put.ok ? put.wrote : null,
          why: (put as { why?: string }).why ?? null,
          reason: put.ok ? null : put.reason,
          ownStoreHoldsItsBytes:
            ww.sec.items.get(login.scoped, longAccount)?.payload === bigClaude('bob', '1', L5_BYTES),
          defaultHoldsItsBytes:
            ww.sec.items.get(CLAUDE_KEYCHAIN_SERVICE, longAccount)?.payload === small,
          outgoingPromoted: rows.logins.some((l) => l.name === 'alice.example'),
          chosen: rows.chosen['claude'] ?? null,
          lines: ww.w.stdins.length - linesBefore
        };
      };
      const l5bRunning = await l5b(true);
      const l5bIdle = await l5b(false);

      // ---- (h) NO REGRESSION: an under-cap switch sends today's lines. -----
      const plainWorld = keychainWorld();
      plainWorld.sec.items.set(CLAUDE_KEYCHAIN_SERVICE, {
        account: GATE_ACCOUNT,
        payload: claudeCredential('alice', '1')
      });
      plainWorld.w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('alice'));
      await keep.observeProvider(plainWorld.d, 'claude');
      const plainLogin = await withKeptLogin(
        plainWorld,
        'plain',
        'bob',
        null,
        GATE_ACCOUNT
      );
      plainWorld.sec.items.delete(plainLogin.scoped, GATE_ACCOUNT);
      const plainAt = plainWorld.w.stdins.length;
      const plainPut = await keep.activateLogin(plainWorld.d, 'claude', 'plain');

      out['lineCap'] = {
        absent: false,
        cap: CAP,
        // (d) The same string is CAP bytes and half that many UTF-16 units, so
        // a cap compared in units would admit twice as many bytes as measured.
        unitsAtCap: accented.length,
        fitsAtCap: fits(accented),
        fitsOverCap: fits(`${accented}x`),
        // (e)
        write: {
          atCapAnswer,
          calls: callsAfterExact,
          sentBytes: Buffer.byteLength(sentLine, 'utf8'),
          sentExact: sentLine === lineFor(SERVICE, ACCOUNT, exactPayload),
          overAnswer,
          overThrew,
          overIsClass,
          overNamesPayload,
          callsAfterOver: sent.length
        },
        // (f)
        runner: {
          pathUnits: accentedPath.length,
          pathBytes: Buffer.byteLength(accentedPath, 'utf8'),
          overUnits: suffixed(unitsCapLine).length,
          overBytes: Buffer.byteLength(suffixed(unitsCapLine), 'utf8'),
          refusedCode: refusedRun.code,
          refusedTooLong:
            (refusedRun as { tooLong?: true }).tooLong ?? null,
          refusedCounted: callsAfterRefused - callsBefore,
          underBytes: Buffer.byteLength(suffixed(underCapLine), 'utf8'),
          spawnedCode: spawnedRun.code,
          spawnedTooLong: (spawnedRun as { tooLong?: true }).tooLong ?? null,
          spawnedCounted: callsAfterSpawned - callsAfterRefused
        },
        // (g) L5. The vendor stage that does not fit: the sealed vault holds
        // the payload before and after, the vendor's staged line is over the
        // cap, the answer is the refusal with its name, and NOT ONE `-i` line
        // was composed for it.
        l5: {
          vaultKeptIt: l5Held === l5Cred,
          sealedIntact: l5HeldAfter === l5Cred,
          vendorLineBytes: Buffer.byteLength(lineFor(l5Vendor, longAccount, l5Cred), 'utf8'),
          ok: l5Put.ok,
          reason: l5Put.ok ? null : l5Put.reason,
          why: (l5Put as { why?: string }).why ?? null,
          lines: l5World.w.stdins.length - l5LinesBefore,
          itemAdded: l5World.sec.items.has(l5Login.scoped, longAccount)
        },
        // (g′) L5b, and its control with no default session.
        l5bRunning,
        l5bIdle,
        // (h)
        plain: {
          ok: plainPut.ok,
          wrote: plainPut.ok ? plainPut.wrote : null,
          lines: plainWorld.w.stdins.slice(plainAt).map(shapeOf)
        }
      };
    }
  }

  // -------------------------------------------------------------------------
  // 14. TORTIE'S OWN VAULT HAS NO SIZE LIMIT (Phase 304, rule 22). The
  //     shipping `vaultPut` and `vaultGet` over the shipping `sealedVault`, an
  //     injected seal and the measured `security` as the legacy arm, at the
  //     size of his own `~/.codex/auth.json` (4,193 bytes, `stat` only), at
  //     64 KB and at 1 MB: the answer's sha256 equals the payload's, the file
  //     on disk is NOT the payload and holds no 64 byte window of it, its mode
  //     is 0600 in a 0700 directory, the runner saw no argv on any put or on
  //     any hit, and a seal that cannot be made keeps nothing and says so in
  //     the one write's own sentence. Every comparison here is by digest and
  //     by length; no payload byte leaves this arm.
  // -------------------------------------------------------------------------
  if (typeof (vault as { sealedVault?: unknown }).sealedVault !== 'function') {
    // A DOMAIN FROM BEFORE PHASE 304, read as one reading the gate can name.
    out['sealed'] = { absent: true };
  } else {
    const root = freshRoot();
    const w = makeWorld();
    const sec = fakeSecurity(w);
    const seal = injectedSeal();
    const backend = sealedFor(root, seal, legacyOver(sec.runner, root));
    const digestOf = (text: string): string =>
      createHash('sha256').update(text, 'utf8').digest('hex');
    /** Random hex of exactly `bytes` bytes, so the size asked for is the size written. */
    const randomHex = (bytes: number): string =>
      randomBytes(Math.ceil(bytes / 2)).toString('hex').slice(0, bytes);
    const SIZES = [4_193, 65_536, 1_048_576];
    const trips: Record<string, unknown>[] = [];
    for (const [i, bytes] of SIZES.entries()) {
      const slot = vault.slotFor('codex', `${String(i).padStart(3, '0')}${'d'.repeat(13)}`);
      const text = randomHex(bytes);
      const argvsBefore = w.argvs.length;
      const put = await vault.vaultPut(backend, slot, text);
      const argvsAfterPut = w.argvs.length;
      const back = await vault.vaultGet(backend, slot);
      const argvsAfterGet = w.argvs.length;
      const file = sealedFileOf(root, slot);
      let mode: number | null = null;
      try {
        mode = statSync(join(root, 'kept', `${slot}.cred`)).mode & 0o777;
      } catch {
        mode = null;
      }
      // NO 64 BYTE WINDOW of the payload in the file, asked at the start, the
      // middle and the end, so a seal that only prefixes something is caught.
      const windows = [0, Math.floor(bytes / 2) - 32, bytes - 64].map((at) =>
        text.slice(at, at + 64)
      );
      trips.push({
        bytes,
        putOk: put.ok,
        answerBytes: back === null ? null : Buffer.byteLength(back, 'utf8'),
        digestEqual: back !== null && digestOf(back) === digestOf(text),
        filePresent: file !== null,
        fileIsNotThePayload: file !== null && digestOf(file) !== digestOf(text),
        fileHoldsNoWindow: file !== null && windows.every((window) => !file.includes(window)),
        fileMode: mode,
        argvsOnPut: argvsAfterPut - argvsBefore,
        argvsOnGet: argvsAfterGet - argvsAfterPut,
        linesSent: w.stdins.length
      });
    }
    let dirMode: number | null = null;
    try {
      dirMode = statSync(join(root, 'kept')).mode & 0o777;
    } catch {
      dirMode = null;
    }
    // (e) NO SEAL, NOTHING KEPT: the one write's own sentence, no file at the
    // slot and none at the staged place, and nothing sent anywhere.
    const noSeal: import('../src/main/credentials/vault').VaultSeal = {
      wrap: () => null,
      open: () => null
    };
    const noSealRoot = freshRoot();
    const noSealWorld = makeWorld();
    const noSealSec = fakeSecurity(noSealWorld);
    const noSealSlot = vault.slotFor('codex', 'e'.repeat(16));
    const refused = await vault.vaultPut(
      sealedFor(noSealRoot, noSeal, legacyOver(noSealSec.runner, noSealRoot)),
      noSealSlot,
      randomHex(4_193)
    );
    out['sealed'] = {
      absent: false,
      trips,
      dirMode,
      noSeal: {
        ok: refused.ok,
        reason: refused.ok ? null : refused.reason,
        why: (refused as { why?: string }).why ?? null,
        filePresent: sealedFileOf(noSealRoot, noSealSlot) !== null,
        stagedPresent: sealedFileOf(noSealRoot, vault.stagedSlotFor(noSealSlot)) !== null,
        argvs: noSealWorld.argvs.length,
        lines: noSealWorld.stdins.length
      }
    };
  }

  // -------------------------------------------------------------------------
  // 12. THE SHUTDOWN OWNER (Phase 220, item 2). IT IS LAST ON PURPOSE, because
  //     it closes the domain's admission and every arm above reads it.
  //
  //     It spawns NOTHING. The child half is proved here as the cancel really
  //     reaching an owned controller; that the abort really ends a `/usr/bin/
  //     security` is proved by `src/main/credentials/__tests__/p220-shutdown.
  //     test.ts`, which spawns a stand in that never exits, and this gate must
  //     stay a gate that opens no process.
  // -------------------------------------------------------------------------
  if (lifecycle === null) {
    out['lifecycle'] = { absent: true };
  } else {
    lifecycle.resetCredentialLifecycle();
    const openAtStart = lifecycle.credentialsAreOpen();

    // ADMISSION, and it closes synchronously.
    lifecycle.beginCredentialShutdown();
    const begunClosesAdmission = !lifecycle.credentialsAreOpen();
    lifecycle.resetCredentialLifecycle();

    // OWNERSHIP. The same promise comes back, so a caller can still compare
    // identities, and a held one keeps the join pending.
    let release = (): void => undefined;
    const heldWork = new Promise<void>((r) => {
      release = r;
    });
    const returned = lifecycle.trackCredentialWork(heldWork);
    const trackedIdentity = returned === heldWork;
    const trackedCount = lifecycle.credentialWorkCount();

    // A CHILD, owned and then cancelled by the join.
    const child = lifecycle.ownCredentialChild();
    const childCounted = lifecycle.credentialChildCount() === 1;

    // A DEADLINE THAT EXPIRES SAYS SO rather than claiming it joined.
    // A REF'D TIMER, because the join's own deadline is unref'd on purpose: with
    // the tracked promise held and nothing else scheduled, node would exit
    // rather than wait, and the probe would report an unsettled await instead
    // of the reading.
    const keepAlive = setTimeout(() => undefined, 5_000);
    const short = await lifecycle.joinCredentialShutdown(20);
    clearTimeout(keepAlive);
    const joinReportsTracked = short.tracked === 1;
    const joinReportsNotJoined = short.joined === false;
    const childAborted = child.signal.aborted;
    const childCountCleared = lifecycle.credentialChildCount() === 0;
    const secondIsAlready = (await lifecycle.joinCredentialShutdown()).already;
    release();
    child.done();

    // THE IDLE QUIT. Nothing tracked, nothing ended, no wait at all.
    lifecycle.resetCredentialLifecycle();
    const idle = await lifecycle.joinCredentialShutdown();

    // THE LOCK BOUNDARY, which is interruption point 1. It is asked BEFORE the
    // mkdir, so a lock the vendor holds is never taken and never stolen.
    lifecycle.resetCredentialLifecycle();
    const lockMem = inMemoryLockDeps();
    let lockRefusal: unknown = null;
    try {
      const h = await locksMod.acquireLock('/scratch/.oauth_refresh.lock', {
        lockName: '.oauth_refresh.lock',
        deps: { ...lockMem.deps, cancelled: () => true }
      });
      h.release();
    } catch (err) {
      lockRefusal = err;
    }
    const refusedForStop =
      lockRefusal instanceof locksMod.LockHeld && lockRefusal.why === 'stopped';
    const lockNamedInRefusal =
      lockRefusal instanceof Error &&
      lockRefusal.message.includes('.oauth_refresh.lock') &&
      lockRefusal.message.includes('closing');
    // NOT ONE DIRECTORY WAS MADE, which is what "never steals a lock" means.
    const lockMadeNothing = lockMem.made.length === 0;

    // THE WATCHER'S OWN PASS, which starts nothing once admission has closed.
    lifecycle.resetCredentialLifecycle();
    const wroot = freshRoot();
    const ww = makeWorld();
    ww.files.set(CODEX_DEFAULT, codexCredential('alice', '1'));
    const wd = makeDeps(wroot, ww);
    let readsWhileClosed = 0;
    let fire: (() => void) | null = null;
    let told = 0;
    const watcher = watchMod.startCredentialWatch({
      keep: {
        ...wd,
        stores: {
          ...wd.stores,
          readText: async (path: string) => {
            readsWhileClosed += 1;
            return wd.stores.readText(path);
          }
        }
      },
      emitChanged: () => {
        told += 1;
      },
      watchDir: () => ({ close: () => undefined }),
      setTimeout: (fn: () => void) => {
        fire = fn;
        return { clear: () => undefined };
      },
      setInterval: () => ({ clear: () => undefined })
    });
    lifecycle.beginCredentialShutdown();
    watcher.poke();
    if (fire !== null) (fire as () => void)();
    await new Promise<void>((r) => setTimeout(r, 20));
    watcher.stop();
    lifecycle.resetCredentialLifecycle();

    out['lifecycle'] = {
      absent: false,
      openAtStart,
      begunClosesAdmission,
      trackedIdentity,
      trackedCount,
      joinReportsTracked,
      joinReportsNotJoined,
      childCounted,
      childAborted,
      childCountCleared,
      secondIsAlready,
      idle: JSON.stringify(idle),
      refusedForStop,
      lockNamedInRefusal,
      lockMadeNothing,
      watchReadNothing: readsWhileClosed === 0,
      watchToldNobody: told === 0
    };
  }
} finally {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify(out)}\n`);
