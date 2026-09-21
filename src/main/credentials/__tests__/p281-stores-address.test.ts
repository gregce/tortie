/**
 * Phase 281. The credentials domain reads, writes and deletes the item Claude
 * Code reads, by service AND account, and never the stray beside it.
 *
 * Every test runs the SHIPPING modules over a `security` written here: no
 * keychain is opened, no process is spawned, no file is read, no environment of
 * the machine is read and no user name is asked of the operating system. The
 * accounts are synthetic (`p281-vendor`, `p281-stray`) and so is every payload.
 *
 * THE FAKE IS THE FIRST-MATCH MODEL research 126 §2.4 measured and §8.10 drove,
 * `./first-match-security.ts`, the one the usage domain's Phase 281 test runs
 * too. Rows are kept in order. A lookup without `-a` answers the FIRST row
 * whose service matches, which is what `security` did on the operator's
 * machine, and a lookup with `-a` answers the first row whose service AND
 * account match. The `-i` add line updates the row matching service and
 * account, moving it to the back as the real program was measured to, or
 * appends one. A delete removes the first row matching what it was
 * given. A miss is exit 44. The stray rows come FIRST under the plain name and
 * under a scoped name, and they hold a credential-shaped payload, so a read by
 * service alone would come back with a usable, wrong answer rather than an
 * obvious nothing.
 *
 * The scoped names are spelled here with `node:crypto`, not with the shipping
 * composer, so the addressing is checked against a second spelling.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CLAUDE_KEYCHAIN_FALLBACK_ACCOUNT,
  CLAUDE_KEYCHAIN_SERVICE,
  isClaudeVendorService
} from '../../usage/credentials';
import type { KeepDeps } from '../keep';
import {
  ADD_LINE,
  firstMatchSecurity,
  type KeychainRow,
  type SentCall
} from './first-match-security';
import {
  keychainAccount,
  keychainDelete,
  keychainHasItem,
  keychainModified,
  keychainRead,
  keychainWrite,
  type SecurityRunner
} from '../security';
import { decodeKeychainPayload, securityPrintsRaw } from '../security-print';
import {
  defaultStoreTarget,
  forgetStore,
  readSettledStore,
  readStore,
  storeTarget,
  type StoreDeps
} from '../stores';
import { safeSwap } from '../swap';
import { legacyKeychainVault, vaultServiceFor } from '../vault';
import { defaultKeychainFingerprint } from '../watch';

const VENDOR = 'p281-vendor';
const STRAY = 'p281-stray';
const PLAIN = 'Claude Code-credentials';
const STAGED = '.tortie-pending';

/** A login directory holding a stray item AND the vendor's item. */
const DIR_A = '/p281-logins/aaaaaaaaaaaaaaaa';
/** A login directory with no scoped item at all. */
const DIR_B = '/p281-logins/bbbbbbbbbbbbbbbb';
/** A login directory whose only scoped item is a stray. */
const DIR_C = '/p281-logins/cccccccccccccccc';

/** This file's own spelling of a scoped name, over the NFC form. */
function scoped(dir: string): string {
  const digest = createHash('sha256').update(dir.normalize('NFC'), 'utf8').digest('hex');
  return `${PLAIN}-${digest.slice(0, 8)}`;
}

/** A credential-shaped synthetic payload. It names no real token. */
function credential(label: string): string {
  return JSON.stringify({ claudeAiOauth: { accessToken: `p281-fixture-${label}` } });
}

/** The keychain on the operator's machine, in miniature: every stray FIRST. */
function seed(): KeychainRow[] {
  return [
    { service: PLAIN, account: STRAY, payload: credential('stray-plain'), mdat: '20260910024431Z' },
    { service: scoped(DIR_A), account: STRAY, payload: credential('stray-a'), mdat: '20260910024431Z' },
    { service: scoped(DIR_C), account: STRAY, payload: credential('stray-c'), mdat: '20260910024431Z' },
    { service: `${PLAIN}${STAGED}`, account: STRAY, payload: credential('stray-staged'), mdat: '20260910024431Z' },
    { service: `${scoped(DIR_A)}${STAGED}`, account: STRAY, payload: credential('stray-staged-a'), mdat: '20260910024431Z' },
    { service: PLAIN, account: VENDOR, payload: credential('vendor-plain'), mdat: '20260916000000Z' },
    { service: scoped(DIR_A), account: VENDOR, payload: credential('vendor-a'), mdat: '20260916000000Z' }
  ];
}

function strays(rows: KeychainRow[]): KeychainRow[] {
  return rows.filter((r) => r.account === STRAY).map((r) => ({ ...r }));
}

function storesOver(
  runner: SecurityRunner,
  env: Record<string, string | undefined> = { USER: VENDOR },
  userName = 'p281-os'
): StoreDeps {
  return {
    runner,
    readText: async () => null,
    writeText: async () => undefined,
    renamePath: async () => undefined,
    removePath: async () => undefined,
    env,
    home: '/p281-home',
    keychainForClaude: true,
    userName,
    wait: async () => undefined
  };
}

function keepOver(stores: StoreDeps): KeepDeps {
  return { stores } as Pick<KeepDeps, 'stores'> as KeepDeps;
}

/** Every call sent for a vendor name carries `-a VENDOR` before `-s`, and no `-g`. */
function expectEveryVendorCallAddressed(sent: readonly SentCall[]): void {
  expect(sent.length).toBeGreaterThan(0);
  let vendorCalls = 0;
  for (const call of sent) {
    expect(call.argv).not.toContain('-g');
    if (call.argv[0] === '-i') {
      const line = ADD_LINE.exec(call.stdin ?? '');
      expect(line).not.toBeNull();
      if (isClaudeVendorService(line?.[2] ?? '')) {
        vendorCalls += 1;
        expect(line?.[1]).toBe(VENDOR);
      }
      continue;
    }
    const s = call.argv.indexOf('-s');
    expect(s).toBeGreaterThan(0);
    if (!isClaudeVendorService(call.argv[s + 1] ?? '')) continue;
    vendorCalls += 1;
    const a = call.argv.indexOf('-a');
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(s);
    expect(call.argv[a + 1]).toBe(VENDOR);
  }
  expect(vendorCalls).toBe(sent.length);
}

describe('Phase 281: every vendor call the credentials domain sends carries the vendor account', () => {
  it('holds for the reads, both targets and their five steps, the forget and the fingerprint', async () => {
    const rows = seed();
    const runner = firstMatchSecurity(rows);
    const d = storesOver(runner);
    await readStore(d, 'claude', null);
    await readStore(d, 'claude', DIR_A);
    await readStore(d, 'claude', DIR_B);
    await readSettledStore(d, 'claude', null);
    await readSettledStore(d, 'claude', DIR_A);
    const own = await storeTarget(d, 'claude', DIR_B);
    expect(own).not.toBeNull();
    if (own !== null) expect((await safeSwap(own, credential('switch-b'))).ok).toBe(true);
    const lift = await defaultStoreTarget(d, 'claude');
    expect(lift).not.toBeNull();
    if (lift !== null) expect((await safeSwap(lift, credential('switch-default'))).ok).toBe(true);
    await forgetStore(d, 'claude', DIR_A);
    await defaultKeychainFingerprint(keepOver(d));
    expectEveryVendorCallAddressed(runner.sent);
    // Both kinds of write were seen, so the -i half of the rule was exercised.
    expect(runner.sent.filter((c) => c.argv[0] === '-i').length).toBe(4);
    expect(runner.sent.some((c) => c.argv[0] === 'delete-generic-password')).toBe(true);
  });
});

describe('Phase 281: the reads land on the vendor item, never the stray', () => {
  it('readStore reads the vendor-account item when a stray of the same name comes first', async () => {
    const runner = firstMatchSecurity(seed());
    const d = storesOver(runner);
    const own = await readStore(d, 'claude', null);
    expect(own.payload).toBe(credential('vendor-plain'));
    expect(own.where).toBe('keychain');
    expect(own.account).toBe(VENDOR);
    const login = await readStore(d, 'claude', DIR_A);
    expect(login.payload).toBe(credential('vendor-a'));
    expect(login.account).toBe(VENDOR);
    // ONE LOOKUP EACH, and no attribute read to learn an account afterwards.
    expect(runner.sent.map((c) => c.argv)).toEqual([
      ['find-generic-password', '-a', VENDOR, '-s', PLAIN, '-w'],
      ['find-generic-password', '-a', VENDOR, '-s', scoped(DIR_A), '-w']
    ]);
  });

  it('readSettledStore settles on the vendor item', async () => {
    const runner = firstMatchSecurity(seed());
    const settled = await readSettledStore(storesOver(runner), 'claude', null);
    expect(settled?.payload).toBe(credential('vendor-plain'));
    expect(settled?.account).toBe(VENDOR);
    expect(runner.sent.map((c) => c.argv)).toEqual([
      ['find-generic-password', '-a', VENDOR, '-s', PLAIN, '-w'],
      ['find-generic-password', '-a', VENDOR, '-s', PLAIN, '-w']
    ]);
  });

  it('a login whose only scoped item is a stray reads nothing, and never asks the plain name', async () => {
    const runner = firstMatchSecurity(seed());
    const d = storesOver(runner);
    const onlyStray = await readStore(d, 'claude', DIR_C);
    expect(onlyStray.payload).toBeNull();
    expect(onlyStray.where).toBe('none');
    expect(onlyStray.account).toBeNull();
    const nothing = await readStore(d, 'claude', DIR_B);
    expect(nothing.payload).toBeNull();
    expect(runner.sent.map((c) => c.argv)).toEqual([
      ['find-generic-password', '-a', VENDOR, '-s', scoped(DIR_C), '-w'],
      ['find-generic-password', '-a', VENDOR, '-s', scoped(DIR_B), '-w']
    ]);
  });

  it('with CLAUDE_CONFIG_DIR set and no scoped item, the default login does not fall back to the plain item', async () => {
    const runner = firstMatchSecurity(seed());
    const d = storesOver(runner, { USER: VENDOR, CLAUDE_CONFIG_DIR: DIR_B });
    const reading = await readStore(d, 'claude', null);
    // The plain item under the vendor account holds a credential, and it is
    // still not read: a Claude Code session under this directory would not
    // read it either (research 126 §5, the branch B row).
    expect(reading.payload).toBeNull();
    expect(runner.sent.map((c) => c.argv)).toEqual([
      ['find-generic-password', '-a', VENDOR, '-s', scoped(DIR_B), '-w']
    ]);
  });

  it('the account follows the vendor rule over the seam: USER, then the user name, then the fallback', async () => {
    const asked = async (env: Record<string, string | undefined>, userName: string) => {
      const runner = firstMatchSecurity(seed());
      await readStore(storesOver(runner, env, userName), 'claude', null);
      const argv = runner.sent[0]?.argv ?? [];
      return argv[argv.indexOf('-a') + 1];
    };
    expect(await asked({ USER: VENDOR }, 'p281-os')).toBe(VENDOR);
    expect(await asked({}, VENDOR)).toBe(VENDOR);
    expect(await asked({ USER: '' }, VENDOR)).toBe(VENDOR);
    expect(await asked({}, 'not a vendor name!')).toBe(CLAUDE_KEYCHAIN_FALLBACK_ACCOUNT);
    expect(await asked({}, '')).toBe(CLAUDE_KEYCHAIN_FALLBACK_ACCOUNT);
  });
});

describe('Phase 281: the writes land on the vendor item, never the stray', () => {
  it('storeTarget for a directory with no scoped item writes under the vendor account, never the stray one', async () => {
    const rows = seed();
    const before = strays(rows);
    const runner = firstMatchSecurity(rows);
    const target = await storeTarget(storesOver(runner), 'claude', DIR_B);
    // NOTHING IS ASKED to choose the account: it is the rule, not a copy. At
    // the parent this asked the scoped name, then the plain name, and copied
    // the stray's account (research 126 §8.10 measured that write).
    expect(runner.sent).toEqual([]);
    expect(target).not.toBeNull();
    if (target === null) return;
    const payload = credential('switch-b');
    const hex = Buffer.from(payload, 'utf8').toString('hex');
    expect((await safeSwap(target, payload)).ok).toBe(true);
    expect(runner.sent).toEqual([
      { argv: ['-i'], stdin: `add-generic-password -U -a "${VENDOR}" -s "${scoped(DIR_B)}${STAGED}" -X "${hex}"\n` },
      { argv: ['find-generic-password', '-a', VENDOR, '-s', `${scoped(DIR_B)}${STAGED}`, '-w'] },
      { argv: ['-i'], stdin: `add-generic-password -U -a "${VENDOR}" -s "${scoped(DIR_B)}" -X "${hex}"\n` },
      { argv: ['find-generic-password', '-a', VENDOR, '-s', scoped(DIR_B), '-w'] },
      { argv: ['delete-generic-password', '-a', VENDOR, '-s', `${scoped(DIR_B)}${STAGED}`] }
    ]);
    for (const call of runner.sent) expect(call.stdin ?? '').not.toContain(`-a "${STRAY}"`);
    expect(rows.filter((r) => r.service === scoped(DIR_B))).toEqual([
      expect.objectContaining({ account: VENDOR, payload })
    ]);
    expect(strays(rows)).toStrictEqual(before);
  });

  it('storeTarget over a directory whose only item is a stray adds the vendor item and leaves the stray byte identical', async () => {
    const rows = seed();
    const before = strays(rows);
    const runner = firstMatchSecurity(rows);
    const target = await storeTarget(storesOver(runner), 'claude', DIR_C);
    expect(target).not.toBeNull();
    if (target === null) return;
    expect((await safeSwap(target, credential('switch-c'))).ok).toBe(true);
    expect(rows.filter((r) => r.service === scoped(DIR_C)).map((r) => r.account)).toEqual([
      STRAY,
      VENDOR
    ]);
    expect(strays(rows)).toStrictEqual(before);
    expectEveryVendorCallAddressed(runner.sent);
  });

  it('defaultStoreTarget updates the vendor row and leaves the stray row byte identical', async () => {
    const rows = seed();
    const before = strays(rows);
    const count = rows.length;
    const runner = firstMatchSecurity(rows);
    const target = await defaultStoreTarget(storesOver(runner), 'claude');
    expect(runner.sent).toEqual([]);
    expect(target).not.toBeNull();
    if (target === null) return;
    const payload = credential('switch-default');
    // The staged place under the plain name already holds a stray, FIRST. A
    // staged read by service alone would read it back and refuse the swap.
    expect((await safeSwap(target, payload)).ok).toBe(true);
    const vendor = rows.find((r) => r.service === PLAIN && r.account === VENDOR);
    expect(vendor?.payload).toBe(payload);
    expect(vendor?.mdat).not.toBe('20260916000000Z');
    expect(strays(rows)).toStrictEqual(before);
    // The staged vendor item was made and then discarded; nothing else moved.
    expect(rows.length).toBe(count);
    expectEveryVendorCallAddressed(runner.sent);
  });

  it('forgetStore deletes only the vendor-account items and leaves the stray', async () => {
    const rows = seed();
    rows.push({
      service: `${scoped(DIR_A)}${STAGED}`,
      account: VENDOR,
      payload: credential('vendor-staged-a'),
      mdat: '20260916000000Z'
    });
    const before = strays(rows);
    const runner = firstMatchSecurity(rows);
    await forgetStore(storesOver(runner), 'claude', DIR_A);
    expect(runner.sent.map((c) => c.argv)).toEqual([
      ['delete-generic-password', '-a', VENDOR, '-s', scoped(DIR_A)],
      ['delete-generic-password', '-a', VENDOR, '-s', `${scoped(DIR_A)}${STAGED}`]
    ]);
    expect(
      rows.filter((r) => r.service.startsWith(scoped(DIR_A)) && r.account === VENDOR)
    ).toEqual([]);
    expect(strays(rows)).toStrictEqual(before);
    // The person's own vendor item is not a name forget can compose.
    expect(rows.some((r) => r.service === PLAIN && r.account === VENDOR)).toBe(true);
  });
});

describe('Phase 281.1: what security prints as hex, measured, and the model prints the same', () => {
  /**
   * MEASURED on a scratch keychain (2026-09-17, twice): `find-generic-password
   * -w` prints raw when every byte is 0x20-0x7E and lowercase hex otherwise.
   * These rows are literals, so the predicate is checked against the
   * measurement and not against itself; the Phase 281 table admitted only the
   * control characters and DEL, and both fakes printed by that same table.
   */
  const TABLE: { what: string; payload: string; raw: boolean }[] = [
    { what: 'plain JSON', payload: credential('plain'), raw: true },
    { what: 'a trailing space (0x20)', payload: `${credential('space')} `, raw: true },
    { what: 'a tilde (0x7E)', payload: '{"p281":"~"}', raw: true },
    { what: 'a tab (0x09)', payload: '{\t"p281":"tab"}', raw: false },
    { what: 'a newline', payload: '{\n"p281":"nl"}', raw: false },
    { what: 'U+0001', payload: '{"p281":"\u0001"}', raw: false },
    { what: 'DEL (0x7F)', payload: '{"p281":"\u007f"}', raw: false },
    { what: 'an accented letter', payload: '{"p281":"caf\u00e9"}', raw: false },
    { what: 'an emoji in an mcpOAuth key', payload: '{"mcpOAuth":{"p281-\u{1F422}":"x"}}', raw: false }
  ];

  for (const row of TABLE) {
    it(`${row.what} prints ${row.raw ? 'raw' : 'as hex'}, the model prints the same, and the decoder reads the payload back`, async () => {
      expect(securityPrintsRaw(row.payload)).toBe(row.raw);
      const hex = Buffer.from(row.payload, 'utf8').toString('hex');
      // The model, asked directly for the payload.
      const model = firstMatchSecurity([{ service: 'p281-print', account: VENDOR, payload: row.payload }]);
      const printed = model.answer(['find-generic-password', '-a', VENDOR, '-s', 'p281-print', '-w']);
      expect(printed).toEqual({ code: 0, stdout: `${row.raw ? row.payload : hex}\n` });
      // The decoder, over the printing computed here from the payload.
      expect(decodeKeychainPayload(`${row.raw ? row.payload : hex}\n`)).toBe(row.payload);
      // The shipping read over the model, which is the two together.
      await expect(keychainRead(model, 'p281-print', VENDOR)).resolves.toBe(row.payload);
    });
  }

  it('readStore captures a vendor credential holding a tab, an accented letter and an emoji, and a switch round trips each', async () => {
    const payloads = [
      JSON.stringify({ claudeAiOauth: { accessToken: 'p281-fixture-tab' } }, null, '\t').replace(/\n/g, ''),
      JSON.stringify({ claudeAiOauth: { accessToken: 'p281-fixture-accent' }, mcpOAuth: { 'caf\u00e9': 'x' } }),
      JSON.stringify({ claudeAiOauth: { accessToken: 'p281-fixture-emoji' }, mcpOAuth: { 'p281-\u{1F422}': 'x' } })
    ];
    for (const payload of payloads) {
      expect(securityPrintsRaw(payload)).toBe(false);
      const rows = seed();
      const runner = firstMatchSecurity(rows);
      const d = storesOver(runner);
      const target = await defaultStoreTarget(d, 'claude');
      expect(target).not.toBeNull();
      if (target === null) return;
      // The switch writes the payload and verifies it by reading it back
      // through the hex printing, so a decoder that hands the hex back
      // refuses the switch.
      expect((await safeSwap(target, payload)).ok).toBe(true);
      const read = await readStore(d, 'claude', null);
      expect(read.payload).toBe(payload);
      expect(read.account).toBe(VENDOR);
      expect(rows.find((r) => r.service === PLAIN && r.account === VENDOR)?.payload).toBe(payload);
    }
  });
});

describe('Phase 281: the model moves an updated item behind the others of its name, as security does', () => {
  // MEASURED by the Phase 281 keychain verifier on a scratch keychain with the
  // real `/usr/bin/security`: a lookup by service alone answered in creation
  // order, and `add-generic-password -U` of an existing item kept the item
  // count but moved that item BEHIND every other item of the same service
  // name. A model that updates in place predicts a different first match after
  // any write, which is what made the parent's default switch look confirmed
  // here while the real program refused its read back.
  const serviceOnly = ['find-generic-password', '-s', PLAIN];
  const addLine = (account: string, label: string): string =>
    `add-generic-password -U -a "${account}" -s "${PLAIN}" -X "${Buffer.from(credential(label), 'utf8').toString('hex')}"\n`;

  it('stray created first, then the vendor item: every -U moves its item to the back', async () => {
    const rows: KeychainRow[] = [];
    const runner = firstMatchSecurity(rows);
    const firstAccount = (): string | undefined =>
      /"acct"<blob>="([^"]*)"/.exec(runner.answer(serviceOnly).stdout)?.[1];

    expect((await runner.run(['-i'], addLine(STRAY, 'stray-1'))).code).toBe(0);
    expect((await runner.run(['-i'], addLine(VENDOR, 'vendor-1'))).code).toBe(0);
    expect(firstAccount()).toBe(STRAY);

    expect((await runner.run(['-i'], addLine(STRAY, 'stray-2'))).code).toBe(0);
    expect(rows.length).toBe(2);
    expect(firstAccount()).toBe(VENDOR);

    expect((await runner.run(['-i'], addLine(VENDOR, 'vendor-2'))).code).toBe(0);
    expect(rows.length).toBe(2);
    expect(firstAccount()).toBe(STRAY);

    expect((await runner.run(['-i'], addLine(STRAY, 'stray-3'))).code).toBe(0);
    expect(firstAccount()).toBe(VENDOR);
    expect(rows.map((r) => r.account)).toEqual([VENDOR, STRAY]);
  });

  it('the shipping default switch confirms twice in a row over it, and the stray keeps its bytes', async () => {
    const rows = seed();
    const before = strays(rows);
    const runner = firstMatchSecurity(rows);
    for (const label of ['switch-one', 'switch-two']) {
      const target = await defaultStoreTarget(storesOver(runner), 'claude');
      expect(target).not.toBeNull();
      if (target === null) return;
      expect(await safeSwap(target, credential(label))).toEqual({ ok: true });
      // The vendor row was written, so it now sits BEHIND the stray of its name.
      const named = rows.filter((r) => r.service === PLAIN).map((r) => r.account);
      expect(named).toEqual([STRAY, VENDOR]);
      expect(rows.find((r) => r.service === PLAIN && r.account === VENDOR)?.payload).toBe(
        credential(label)
      );
    }
    expect(strays(rows)).toStrictEqual(before);
    expectEveryVendorCallAddressed(runner.sent);
  });
});

describe('Phase 281: a vendor name with no account never reaches security', () => {
  const names = [
    PLAIN,
    scoped(DIR_A),
    `${PLAIN}${STAGED}`,
    `${scoped(DIR_A)}${STAGED}`
  ];
  // `undefined` is what an untyped probe calling with two arguments hands in.
  const refused: (string | null)[] = [null, '', 'a"b', 'p281\nvendor', undefined as unknown as null];

  it('refuses every read, attribute read, presence check and delete before the runner', async () => {
    const rows = seed();
    const snapshot = rows.map((r) => ({ ...r }));
    const runner = firstMatchSecurity(rows);
    for (const name of names) {
      expect(isClaudeVendorService(name)).toBe(true);
      for (const account of refused) {
        expect(await keychainRead(runner, name, account)).toBeNull();
        expect(await keychainAccount(runner, name, account)).toBeNull();
        expect(await keychainModified(runner, name, account)).toBeNull();
        expect(await keychainHasItem(runner, name, account)).toBe(false);
        expect(await keychainDelete(runner, name, account)).toBe(false);
      }
      expect(await keychainWrite(runner, name, '', credential('x'))).toBe(false);
      expect(await keychainWrite(runner, name, 'a"b', credential('x'))).toBe(false);
    }
    expect(runner.sent.length).toBe(0);
    expect(rows).toStrictEqual(snapshot);
  });

  it('with the vendor account, the same calls reach the vendor item and not the stray', async () => {
    const runner = firstMatchSecurity(seed());
    expect(await keychainRead(runner, PLAIN, VENDOR)).toBe(credential('vendor-plain'));
    expect(await keychainAccount(runner, PLAIN, VENDOR)).toBe(VENDOR);
    expect(await keychainModified(runner, PLAIN, VENDOR)).toBe('20260916000000Z\\000');
    expect(await keychainHasItem(runner, `${PLAIN}${STAGED}`, VENDOR)).toBe(false);
    expect(runner.sent.map((c) => c.argv)).toEqual([
      ['find-generic-password', '-a', VENDOR, '-s', PLAIN, '-w'],
      ['find-generic-password', '-a', VENDOR, '-s', PLAIN],
      ['find-generic-password', '-a', VENDOR, '-s', PLAIN],
      ['find-generic-password', '-a', VENDOR, '-s', `${PLAIN}${STAGED}`]
    ]);
  });
});

describe("Phase 281: Tortie's own names keep the command lines they always had", () => {
  it('a name outside the vendor namespace with no account sends the service-only argv, byte for byte', async () => {
    const name = 'Tortie-credentials-claude.default';
    expect(isClaudeVendorService(name)).toBe(false);
    const runner = firstMatchSecurity([
      { service: name, account: 'tortie', payload: credential('vault'), mdat: '20260916000000Z' }
    ]);
    await keychainRead(runner, name, null);
    await keychainAccount(runner, name, null);
    await keychainModified(runner, name, null);
    await keychainHasItem(runner, name, null);
    await keychainDelete(runner, name, null);
    expect(runner.sent.map((c) => c.argv)).toEqual([
      ['find-generic-password', '-s', name, '-w'],
      ['find-generic-password', '-s', name],
      ['find-generic-password', '-s', name],
      ['find-generic-password', '-s', name],
      ['delete-generic-password', '-s', name]
    ]);
  });

  it("the legacy arm of Tortie's own store sends the service-only argvs and never -i (Phase 304)", async () => {
    // Until Phase 304 this case pinned the vault's `-i` line. Tortie's own
    // store is a sealed file now and the keychain is READ ONLY for it: the
    // legacy arm reads and deletes the scoped name with the same two argvs the
    // parent sent for them, and there is no `put` on its type to send a third.
    const scope = '/p281-profile/gmux/logins';
    const slot = 'claude.default';
    const service = vaultServiceFor(slot, scope);
    const payload = credential('vault');
    const runner = firstMatchSecurity([
      { service, account: 'tortie', payload, mdat: '20260916000000Z' }
    ]);
    const legacy = legacyKeychainVault(runner, scope);
    expect(await legacy.get(slot)).toBe(payload);
    expect(await legacy.del(slot)).toBe(true);
    expect(await legacy.get(slot)).toBeNull();
    expect(runner.sent).toEqual([
      { argv: ['find-generic-password', '-s', service, '-w'] },
      { argv: ['delete-generic-password', '-s', service] },
      { argv: ['find-generic-password', '-s', service, '-w'] }
    ]);
    expect('put' in legacy).toBe(false);
  });
});

describe('Phase 281: the keychain backstop fingerprints the vendor item alone', () => {
  it('moves when the vendor row is rewritten and not when the stray is', async () => {
    const rows = seed();
    const runner = firstMatchSecurity(rows);
    const keep = keepOver(storesOver(runner));
    const first = await defaultKeychainFingerprint(keep);
    expect(first).not.toBeNull();
    expect(runner.sent.map((c) => c.argv)).toEqual([
      ['find-generic-password', '-a', VENDOR, '-s', PLAIN],
      ['find-generic-password', '-a', VENDOR, '-s', PLAIN]
    ]);

    const stray = rows.findIndex((r) => r.service === PLAIN && r.account === STRAY);
    const strayRow = rows[stray];
    if (strayRow === undefined) throw new Error('the fixture lost its stray');
    rows[stray] = { ...strayRow, payload: credential('stray-rewritten'), mdat: '20260917120000Z' };
    expect(await defaultKeychainFingerprint(keep)).toBe(first);

    const vendor = rows.findIndex((r) => r.service === PLAIN && r.account === VENDOR);
    const vendorRow = rows[vendor];
    if (vendorRow === undefined) throw new Error('the fixture lost its vendor row');
    rows[vendor] = { ...vendorRow, mdat: '20260917130000Z' };
    const moved = await defaultKeychainFingerprint(keep);
    expect(moved).not.toBe(first);

    rows.splice(vendor, 1);
    const gone = await defaultKeychainFingerprint(keep);
    expect(gone).not.toBe(moved);
    expect(gone).toBe(`${PLAIN}=@`);
    expectEveryVendorCallAddressed(runner.sent);
  });

  it('asks the one scoped name when CLAUDE_CONFIG_DIR is set, and never the plain name after it', async () => {
    const runner = firstMatchSecurity(seed());
    const keep = keepOver(storesOver(runner, { USER: VENDOR, CLAUDE_CONFIG_DIR: DIR_A }));
    expect(await defaultKeychainFingerprint(keep)).toMatch(
      new RegExp(`^${scoped(DIR_A)}=${VENDOR}@20260916000000Z`)
    );
    expect(runner.sent.map((c) => c.argv)).toEqual([
      ['find-generic-password', '-a', VENDOR, '-s', scoped(DIR_A)],
      ['find-generic-password', '-a', VENDOR, '-s', scoped(DIR_A)]
    ]);
    expect(CLAUDE_KEYCHAIN_SERVICE).toBe(PLAIN);
  });
});
