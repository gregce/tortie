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
 */

import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { addLogin, readLoginsFile } from '../src/main/logins/store';
import { loginDirIn, loginsFileIn } from '../src/main/logins/dirs';
import { claudeScopedService } from '../src/main/usage/credentials';
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
const migrate = (await import(
  pathToFileURL(resolve(MODULES, 'migrate.ts')).href
)) as typeof import('../src/main/credentials/migrate');

/** A value only this probe ever writes. If it appears anywhere, say where. */
const TOKEN = 'P204-SENTINEL-TOKEN-4c19be';

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
 * A `security` that behaves the way the real one was MEASURED to behave on
 * 2026-09-02, on a scratch keychain that was never in the search list.
 *
 *  - a write arrives through `-i` on STDIN as `add-generic-password -U -a
 *    "<account>" -s "<service>" -X "<hex>"`, and `-U` replaces the item in
 *    place rather than adding a second one;
 *  - `find-generic-password -s <service> -w` prints the payload plus exactly
 *    one newline, and prints it AS HEX when it is not printable;
 *  - the same call without `-w` prints the item's attributes, `acct` included,
 *    and never the payload.
 *
 * It exists so the keychain half of the shipping code runs for real in this
 * gate, which is what makes the argv assertion below mean anything: a payload
 * that reached a command line would be visible in `w.argvs`.
 */
function fakeSecurity(w: World): {
  items: Map<string, { account: string; payload: string }>;
  runner: import('../src/main/credentials/security').SecurityRunner;
} {
  const items = new Map<string, { account: string; payload: string }>();
  return {
    items,
    runner: {
      run: async (argv, stdin) => {
        w.argvs.push([...argv]);
        if (stdin !== undefined) w.stdins.push(stdin);
        const at = (flag: string): string => {
          const i = argv.indexOf(flag);
          return i < 0 ? '' : (argv[i + 1] ?? '');
        };
        if (argv[0] === '-i') {
          const found =
            /^add-generic-password -U -a "([^"]*)" -s "([^"]*)" -X "([0-9a-f]*)"$/.exec(
              (stdin ?? '').trim()
            );
          if (found === null) return { code: 1, stdout: '' };
          items.set(found[2] ?? '', {
            account: found[1] ?? '',
            payload: Buffer.from(found[3] ?? '', 'hex').toString('utf8')
          });
          return { code: 0, stdout: '' };
        }
        if (argv[0] === 'find-generic-password') {
          const item = items.get(at('-s'));
          if (item === undefined) return { code: 1, stdout: '' };
          if (argv.includes('-w')) {
            // eslint-disable-next-line no-control-regex
            const printable = !/[\u0000-\u0008\u000a-\u001f\u007f]/.test(
              item.payload
            );
            const body = printable
              ? item.payload
              : Buffer.from(item.payload, 'utf8').toString('hex');
            return { code: 0, stdout: `${body}\n` };
          }
          return {
            code: 0,
            stdout: `keychain: "login"\nattributes:\n    "acct"<blob>="${item.account}"\n    "svce"<blob>="${at('-s')}"\n`
          };
        }
        if (argv[0] === 'delete-generic-password') {
          items.delete(at('-s'));
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
    kind: 'file',
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
      account: 'gdc',
      payload: claudeCredential('alice', '1')
    });
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('alice'));
    await keep.observeProvider(d, 'claude');
    security.items.set('Claude Code-credentials', {
      account: 'gdc',
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
      account: 'gdc',
      payload: claudeCredential('alice', '1')
    });
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('alice'));
    await keep.observeProvider(d, 'claude');
    security.items.set('Claude Code-credentials', {
      account: 'gdc',
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
      account: 'gdc',
      payload: claudeCredential('alice', '1')
    });
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('alice'));
    await keep.observeProvider(d, 'claude');
    // A second login, signed into as bob inside a session under it.
    addLogin(root, 'claude', 'work');
    const work = readLoginsFile(root).file.logins.find((l) => l.name === 'work');
    const workDir = work === undefined ? '' : loginDirIn(root, 'claude', work.id);
    security.items.set(claudeScopedService(workDir), {
      account: 'gdc',
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

    // 2. TORTIE'S OWN FILE VAULT, whose staged place is `<slot>.pending.cred`
    //    and whose write stages once more at `.writing` beside it.
    const vaultDir = join(root, 'kept');
    mkdirSync(vaultDir, { recursive: true, mode: 0o700 });
    const slot = vault.slotFor('codex', '0123456789abcdef');
    const vaultVictim = victimFor('vault');
    symlinkSync(
      vaultVictim,
      join(vaultDir, `${vault.stagedSlotFor(slot)}.cred.writing`)
    );
    const backend = vault.fileVault(vaultDir);
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
    out['nofollow'] = {
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
    // The person's own claude item, as a default install has it.
    const own = claudeCredential('alice', '1');
    security.items.set('Claude Code-credentials', { account: 'gdc', payload: own });
    w.files.set(CLAUDE_DEFAULT_ACCOUNT, claudeAccountFile('alice'));
    await keep.observeProvider(withKeychain, 'claude');
    // /login, in his own terminal, in the vendor's own flow.
    security.items.set('Claude Code-credentials', {
      account: 'gdc',
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
    const wrote = security.items.get(wroteService) ?? null;
    out['keychain'] = {
      promoted: seen.events.some((e) => e.kind === 'promoted'),
      activated: put.ok,
      // THE VENDOR'S OWN BYTES, PUT BACK EXACTLY, in the item the vendor itself
      // would write for a session launched with that config directory.
      bytesExact: wrote !== null && wrote.payload === own,
      // THE ACCOUNT ATTRIBUTE FOLLOWS THE PERSON'S OWN ITEM, because the vendor
      // finds its item by service and account on some of its paths.
      accountPreserved: wrote?.account === 'gdc',
      // THE PERSON'S OWN ITEM WAS NEVER WRITTEN. It still holds what /login put
      // there, and there is still exactly one of it.
      ownItemUntouched:
        security.items.get('Claude Code-credentials')?.payload ===
        claudeCredential('bob', '2'),
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
    const OWN = claudeCredential('gdc', 'own');
    security.items.set('Claude Code-credentials', { account: 'gdc', payload: OWN });

    /** Give one login everything a signed in login has. */
    const furnish = (id: string, who: string): string => {
      const dir = loginDirIn(root, 'claude', id);
      const service = stores.claudeWriteService(dir);
      security.items.set(service, {
        account: 'gdc',
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
            account: 'gdc',
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
  // 17. THE VAULT IS SCOPED TO ITS PROFILE (Phase 208). A scratch root and the
  //     person's root compose DIFFERENT names, no name composed from any root
  //     equals the unscoped one, the digest is re-derived here by a sha256 of
  //     this file's own, the keychain backend lands only on the scoped name,
  //     and the migration reads or deletes the unscoped name only in the
  //     person's own profile.
  // -------------------------------------------------------------------------
  {
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

    // The backend, over the measured security, lands on the scoped name only.
    const w = makeWorld();
    const security = fakeSecurity(w);
    const scoped = vault.keychainVault(security.runner, scratchRoot);
    try {
      await scoped.put('claude.default', claudeCredential('scoped', '1'));
    } catch {
      // A backend that refuses is read below as a name that never landed.
    }
    const backendNames = [...security.items.keys()];
    const backendNamesScoped =
      backendNames.length === 1 &&
      backendNames[0] === vault.vaultServiceFor('claude.default', scratchRoot);
    const crossProfileHidden =
      (await vault.keychainVault(security.runner, ownRoot).get('claude.default')) === null;

    // The migration, both ways, over the measured security.
    const arm = async (
      plant: (items: Map<string, { account: string; payload: string }>, root: string) => void,
      ownProfile: boolean,
      record: string | null = null,
      vanishAfterConfirm = false
    ) => {
      const root = freshRoot();
      const world = makeWorld();
      const sec = fakeSecurity(world);
      plant(sec.items, root);
      // A KEYCHAIN WHOSE SCOPED ITEM VANISHES right after the write confirmed
      // it, for the arm that proves the old item is deleted only once the new
      // one is read back by the migration itself. The shipping write already
      // confirms its own commit, so the one read that can still disagree is
      // the migration's, and this is the keychain that makes it disagree.
      const scopedService = vault.vaultServiceFor('claude.default', root);
      let scopedReadsLeft = -1;
      const runner: import('../src/main/credentials/security').SecurityRunner = {
        run: async (argv, stdin) => {
          if (vanishAfterConfirm) {
            if (argv[0] === '-i' && (stdin ?? '').includes(`-s "${scopedService}"`)) {
              scopedReadsLeft = 1;
            }
            if (
              argv[0] === 'find-generic-password' &&
              argv.includes(scopedService) &&
              scopedReadsLeft === 0
            ) {
              return { code: 1, stdout: '' };
            }
            if (argv[0] === 'find-generic-password' && argv.includes(scopedService) && scopedReadsLeft > 0) {
              scopedReadsLeft -= 1;
            }
          }
          return sec.runner.run(argv, stdin);
        }
      };
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
        vault: vault.keychainVault(runner, root),
        root,
        slots: ['claude.default', vault.slotFor('claude', 'b'.repeat(16))],
        ownProfile
      });
      const named = world.argvs
        .map((argv) => argv[argv.indexOf('-s') + 1] ?? '')
        .concat(world.stdins.map((line) => /-s "([^"]*)"/.exec(line)?.[1] ?? ''));
      return {
        result,
        items: [...sec.items.entries()].map(([k, v]) => [k, v.payload]),
        namedUnscoped: named.some((n) => n === unscopedOf('claude.default') || n === unscopedOf(vault.slotFor('claude', 'b'.repeat(16)))),
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
    const badReadback = await arm(
      (items) => {
        items.set(unscopedOf('claude.default'), { account: 'tortie', payload: old });
      },
      true,
      null,
      true
    );
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
      migration: {
        presentMoved:
          present.result.moved === 1 &&
          present.result.deleted === 1 &&
          holds(present, vault.vaultServiceFor('claude.default', present.root)) === old &&
          holds(present, unscopedOf('claude.default')) === null &&
          present.items.length === 1,
        absentUntouched:
          absent.result.moved === 0 && absent.result.deleted === 0 && absent.items.length === 0,
        refusedNamesNothing:
          refused.result.refused === true &&
          !refused.namedUnscoped &&
          holds(refused, unscopedOf('claude.default')) === old &&
          refused.items.length === 1,
        recordedOldRewritten:
          recordedOld.result.moved === 1 &&
          holds(recordedOld, vault.vaultServiceFor('claude.default', recordedOld.root)) === old &&
          holds(recordedOld, unscopedOf('claude.default')) === null,
        stagedResidueDeleted:
          staged.result.deleted === 1 && staged.result.moved === 0 && staged.items.length === 0,
        presentNamedUnscoped: present.namedUnscoped,
        badReadbackKept:
          badReadback.result.kept === 1 &&
          badReadback.result.deleted === 0 &&
          holds(badReadback, unscopedOf('claude.default')) === old
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
} finally {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify(out)}\n`);
