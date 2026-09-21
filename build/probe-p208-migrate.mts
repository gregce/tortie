/**
 * probe-p208-migrate.mts. The SHIPPING migration, run under node over the REAL
 * `security` against ONE scratch keychain file, printed as JSON for
 * build/probe-p208-vault.mjs to judge (Phase 208, rewritten by Phase 304).
 *
 * It is the matrix the Phase 208 entry asks for, being the migration both
 * ways over the real program: an unscoped item present, absent, present while
 * a copy already exists with the record naming either side, a staged
 * leftover, and a profile that is not the person's own. SINCE PHASE 304 THE
 * COPY IS A SEALED FILE and not a scoped item: Tortie's own store is
 * `sealedVault(dir, seal, legacy)`, driven here over an injected seal (base64
 * behind a marker, because plain node has no `safeStorage`) and the REAL
 * legacy arm, `legacyKeychainVault(runner, root)`, over the scratch file. So
 * every arm now reads that the unscoped item landed in the file and that NOT
 * ONE `Tortie-credentials-*` item was written, which is the reading the
 * parent could never give. Two arms are Phase 304's own: the read-through of
 * a scoped item the older build kept, and the boot pass sweeping the scoped
 * duplicate a kill leaves beside a sealed file, both over the real program.
 *
 * Every name it composes is asked of the keychain file in `P208_KEYCHAIN` and
 * of nothing else, because the runner it hands the domain is
 * `defaultSecurityRunner(<that file>)`, which appends the file to every verb.
 * The file was made by the probe under the harness directory and is never in
 * the search list, and the probe deletes it in a `finally`.
 *
 * NOTHING HERE READS THE PERSON'S KEYCHAIN. `-w` is passed only to the scratch
 * file, every payload is a sentinel this file wrote, and no payload byte is
 * printed: every reading is a boolean or a count.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { writeKeptFile } from '../src/main/credentials/kept';
import {
  isOwnProfile,
  migrateUnscopedVault,
  unscopedVaultServiceFor
} from '../src/main/credentials/migrate';
import { credentialDigest } from '../src/main/credentials/payload';
import {
  defaultSecurityRunner,
  keychainDelete,
  keychainHasItem,
  keychainRead,
  keychainWrite
} from '../src/main/credentials/security';
import {
  legacyKeychainVault,
  sealedVault,
  slotFor,
  stagedSlotFor,
  vaultGet,
  vaultServiceFor,
  type VaultSeal
} from '../src/main/credentials/vault';

const keychainFile = process.env['P208_KEYCHAIN'] ?? '';
const base = process.env['P208_ROOT'] ?? '';
if (keychainFile === '' || base === '') {
  process.stdout.write(`${JSON.stringify({ error: 'P208_KEYCHAIN and P208_ROOT are required' })}\n`);
  process.exit(2);
}

const runner = defaultSecurityRunner(keychainFile);
const cred = (who: string): string =>
  JSON.stringify({ claudeAiOauth: { accessToken: `P208-MIGRATE-${who}` } });
const DEFAULT = slotFor('claude', null);
const LOGIN = slotFor('claude', 'c'.repeat(16));
/** The account the older build wrote its items under (`VAULT_ACCOUNT`, gone since Phase 304). */
const LEGACY_ACCOUNT = 'tortie';

/**
 * PHASE 304. The seal, standing in for `safeStorage`: base64 behind a marker,
 * no cipher, and enough to tell a file that went through `wrap` from one
 * holding the payload as written.
 */
const MARK = 'p208-migrate-seal:';
const seal: VaultSeal = {
  wrap: (text) => `${MARK}${Buffer.from(text, 'utf8').toString('base64')}`,
  open: (blob) =>
    blob.startsWith(MARK) ? Buffer.from(blob.slice(MARK.length), 'base64').toString('utf8') : null
};

/** Every name an arm could have left, so each arm starts from nothing. */
async function clear(root: string): Promise<void> {
  for (const slot of [DEFAULT, LOGIN, stagedSlotFor(DEFAULT), stagedSlotFor(LOGIN)]) {
    for (const name of [unscopedVaultServiceFor(slot), vaultServiceFor(slot, root)]) {
      if (await keychainHasItem(runner, name, null)) await keychainDelete(runner, name, null);
    }
  }
}

/** Plant an item the way the OLDER build wrote it, which is the only `-i` line in this file. */
async function plant(name: string, payload: string): Promise<void> {
  const ok = await keychainWrite(runner, name, LEGACY_ACCOUNT, payload);
  if (!ok) throw new Error(`the scratch keychain refused ${name}`);
}

/** Every `Tortie-credentials-*` item in the scratch file, by attributes. */
function tortieItems(): string[] {
  const run = spawnSync('/usr/bin/security', ['dump-keychain', keychainFile], { encoding: 'utf8', timeout: 15_000 });
  return [...(run.stdout ?? '').matchAll(/"svce"<blob>="([^"\n]*)"/g)]
    .map((m) => m[1] ?? '')
    .filter((s) => s.startsWith('Tortie-credentials-'))
    .sort();
}

/** The sealed file for one slot under one root, opened through the seal, or null. */
function fileHolds(root: string, slot: string): string | null {
  try {
    return seal.open(readFileSync(join(root, 'kept', `${slot}.cred`), 'utf8'));
  } catch {
    return null;
  }
}

/** How many sealed files a root holds. */
function filesUnder(root: string): number {
  try {
    return readdirSync(join(root, 'kept')).filter((n) => n.endsWith('.cred')).length;
  } catch {
    return 0;
  }
}

const out: Record<string, unknown> = {};
let n = 0;
async function arm(
  name: string,
  run: (root: string) => Promise<Record<string, unknown>>
): Promise<void> {
  n += 1;
  const root = join(base, `arm-${String(n)}`, 'gmux', 'logins');
  mkdirSync(root, { recursive: true });
  await clear(root);
  try {
    out[name] = await run(root);
  } catch (err) {
    out[name] = { error: (err as Error).message };
  } finally {
    await clear(root);
    rmSync(join(base, `arm-${String(n)}`), { recursive: true, force: true });
  }
}

/** The one backend, as `index.ts` composes it: the sealed file over the real legacy arm. */
const vaultFor = (root: string) =>
  sealedVault(join(root, 'kept'), seal, legacyKeychainVault(runner, root));

const migrate = (root: string, ownProfile: boolean, slots: string[]) =>
  migrateUnscopedVault({
    runner,
    vault: vaultFor(root),
    legacy: legacyKeychainVault(runner, root),
    root,
    slots,
    // Phase 219 made the proof a VERDICT rather than a boolean, so the refusal
    // can say which refusal it is. This probe only ever asks the two ends.
    ownProfile: ownProfile ? 'own' : 'elsewhere'
  });

await arm('present', async (root) => {
  await plant(unscopedVaultServiceFor(DEFAULT), cred('present'));
  const result = await migrate(root, true, [DEFAULT, LOGIN]);
  return {
    result,
    // PHASE 304. The move lands in the sealed FILE, and no scoped item exists.
    fileHolds: fileHolds(root, DEFAULT) === cred('present'),
    unscopedGone: !(await keychainHasItem(runner, unscopedVaultServiceFor(DEFAULT), null)),
    stagedGone: !(await keychainHasItem(runner, vaultServiceFor(stagedSlotFor(DEFAULT), root), null)),
    tortieItemsLeft: tortieItems().length
  };
});

await arm('absent', async (root) => {
  const result = await migrate(root, true, [DEFAULT, LOGIN]);
  return {
    result,
    filesWritten: filesUnder(root),
    unscopedAbsent: !(await keychainHasItem(runner, unscopedVaultServiceFor(DEFAULT), null)),
    tortieItemsLeft: tortieItems().length
  };
});

await arm('bothRecordNamesOld', async (root) => {
  await plant(unscopedVaultServiceFor(DEFAULT), cred('recorded'));
  await vaultFor(root).put(DEFAULT, cred('stale'));
  writeKeptFile(root, {
    v: 1,
    slots: {
      [DEFAULT]: {
        email: null,
        subject: null,
        digest: credentialDigest(cred('recorded')),
        account: null,
        from: null,
        at: 1
      }
    }
  });
  const result = await migrate(root, true, [DEFAULT]);
  return {
    result,
    fileHoldsRecorded: fileHolds(root, DEFAULT) === cred('recorded'),
    unscopedGone: !(await keychainHasItem(runner, unscopedVaultServiceFor(DEFAULT), null)),
    tortieItemsLeft: tortieItems().length
  };
});

await arm('bothRecordNamesScoped', async (root) => {
  await plant(unscopedVaultServiceFor(DEFAULT), cred('older'));
  await vaultFor(root).put(DEFAULT, cred('recorded'));
  writeKeptFile(root, {
    v: 1,
    slots: {
      [DEFAULT]: {
        email: null,
        subject: null,
        digest: credentialDigest(cred('recorded')),
        account: null,
        from: null,
        at: 1
      }
    }
  });
  const result = await migrate(root, true, [DEFAULT]);
  return {
    result,
    fileKept: fileHolds(root, DEFAULT) === cred('recorded'),
    unscopedGone: !(await keychainHasItem(runner, unscopedVaultServiceFor(DEFAULT), null)),
    tortieItemsLeft: tortieItems().length
  };
});

await arm('stagedLeftover', async (root) => {
  await plant(unscopedVaultServiceFor(stagedSlotFor(LOGIN)), cred('residue'));
  const result = await migrate(root, true, [LOGIN]);
  return {
    result,
    residueGone: !(await keychainHasItem(runner, unscopedVaultServiceFor(stagedSlotFor(LOGIN)), null)),
    nothingMovedIn: fileHolds(root, LOGIN) === null && filesUnder(root) === 0,
    tortieItemsLeft: tortieItems().length
  };
});

await arm('notOwnProfile', async (root) => {
  await plant(unscopedVaultServiceFor(DEFAULT), cred('untouchable'));
  const result = await migrate(root, false, [DEFAULT, LOGIN]);
  return {
    result,
    unscopedStill:
      (await keychainRead(runner, unscopedVaultServiceFor(DEFAULT), null)) === cred('untouchable'),
    filesWritten: filesUnder(root)
  };
});

// PHASE 304. THE READ-THROUGH over the real program: a SCOPED item the older
// build kept is read on a miss, sealed into the file, read back, and only then
// deleted, and the second read is a hit that asks the keychain nothing.
await arm('readThrough', async (root) => {
  await plant(vaultServiceFor(LOGIN, root), cred('scoped'));
  const vault = vaultFor(root);
  const first = await vaultGet(vault, LOGIN);
  const itemGone = !(await keychainHasItem(runner, vaultServiceFor(LOGIN, root), null));
  const second = await vaultGet(vault, LOGIN);
  return {
    answered: first === cred('scoped'),
    fileHolds: fileHolds(root, LOGIN) === cred('scoped'),
    itemGone,
    secondAnswered: second === cred('scoped'),
    tortieItemsLeft: tortieItems().length
  };
});

// PHASE 304. THE DUPLICATE SWEEP over the real program: a sealed file with the
// scoped item still beside it, which is what a kill between the read-through's
// read-back and its delete leaves, and which only the boot pass can reach.
await arm('duplicateSwept', async (root) => {
  await vaultFor(root).put(LOGIN, cred('sealed'));
  await plant(vaultServiceFor(LOGIN, root), cred('sealed'));
  const result = await migrate(root, true, [LOGIN]);
  return {
    result,
    itemGone: !(await keychainHasItem(runner, vaultServiceFor(LOGIN, root), null)),
    fileHolds: fileHolds(root, LOGIN) === cred('sealed'),
    tortieItemsLeft: tortieItems().length
  };
});

out['ownProfile'] = {
  own: isOwnProfile({
    userData: '/Users/x/Library/Application Support/Tortie',
    appData: '/Users/x/Library/Application Support',
    appName: 'Tortie',
    env: {}
  }),
  scratch: isOwnProfile({
    userData: base,
    appData: '/Users/x/Library/Application Support',
    appName: 'Tortie',
    env: {}
  }),
  probes: isOwnProfile({
    userData: '/Users/x/Library/Application Support/Tortie',
    appData: '/Users/x/Library/Application Support',
    appName: 'Tortie',
    env: { GMUX_PROBES: '1' }
  })
};

process.stdout.write(`${JSON.stringify(out)}\n`);
