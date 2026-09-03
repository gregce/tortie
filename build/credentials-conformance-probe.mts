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

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { addLogin, readLoginsFile } from '../src/main/logins/store';
import { loginDirIn, loginsFileIn } from '../src/main/logins/dirs';
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
    now: () => 1_700_000_000_000
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
  // 7. A STORE UNDER A RUNNING SESSION IS NOT WRITTEN.
  // -------------------------------------------------------------------------
  {
    const root = freshRoot();
    const w = makeWorld();
    w.files.set(CODEX_DEFAULT, codexCredential('alice', '1'));
    const idle = makeDeps(root, w);
    await keep.observeProvider(idle, 'codex');
    w.files.set(CODEX_DEFAULT, codexCredential('bob', '2'));
    await keep.observeProvider(idle, 'codex');
    const busy = {
      ...idle,
      liveSessions: async () => [
        { provider: 'codex' as LoginProviderId, login: 'alice.example' }
      ]
    };
    const done = await keep.activateLogin(busy, 'codex', 'alice.example');
    out['running'] = {
      refused: !done.ok,
      reason: done.ok ? '' : done.reason,
      says: done.ok ? '' : done.reason.includes('session is running')
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
