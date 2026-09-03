/**
 * probe-p208-migrate.mts. The SHIPPING migration, run under node over the REAL
 * `security` against ONE scratch keychain file, printed as JSON for
 * build/probe-p208-vault.mjs to judge (Phase 208).
 *
 * It is the matrix the entry asks for, being the migration both ways over the
 * real backend: an unscoped item present, absent, present while the scoped one
 * already exists with the record naming either side, a staged leftover, and a
 * profile that is not the person's own. Every name it composes is asked of the
 * keychain file in `P208_KEYCHAIN` and of nothing else, because the runner it
 * hands the domain is `defaultSecurityRunner(<that file>)`, which appends the
 * file to every verb. The file was made by the probe under the harness
 * directory and is never in the search list, and the probe deletes it in a
 * `finally`.
 *
 * NOTHING HERE READS THE PERSON'S KEYCHAIN. `-w` is passed only to the scratch
 * file, and every payload is a sentinel this file wrote.
 */

import { mkdirSync, rmSync } from 'node:fs';
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
  keychainVault,
  slotFor,
  stagedSlotFor,
  VAULT_ACCOUNT,
  vaultServiceFor
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

/** Every name an arm could have left, so each arm starts from nothing. */
async function clear(root: string): Promise<void> {
  for (const slot of [DEFAULT, LOGIN, stagedSlotFor(DEFAULT), stagedSlotFor(LOGIN)]) {
    for (const name of [unscopedVaultServiceFor(slot), vaultServiceFor(slot, root)]) {
      if (await keychainHasItem(runner, name)) await keychainDelete(runner, name);
    }
  }
}

async function plant(name: string, payload: string): Promise<void> {
  const ok = await keychainWrite(runner, name, VAULT_ACCOUNT, payload);
  if (!ok) throw new Error(`the scratch keychain refused ${name}`);
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

const migrate = (root: string, ownProfile: boolean, slots: string[]) =>
  migrateUnscopedVault({
    runner,
    vault: keychainVault(runner, root),
    root,
    slots,
    ownProfile
  });

await arm('present', async (root) => {
  await plant(unscopedVaultServiceFor(DEFAULT), cred('present'));
  const result = await migrate(root, true, [DEFAULT, LOGIN]);
  return {
    result,
    scopedHolds: (await keychainRead(runner, vaultServiceFor(DEFAULT, root))) === cred('present'),
    unscopedGone: !(await keychainHasItem(runner, unscopedVaultServiceFor(DEFAULT))),
    stagedGone: !(await keychainHasItem(runner, vaultServiceFor(stagedSlotFor(DEFAULT), root)))
  };
});

await arm('absent', async (root) => {
  const result = await migrate(root, true, [DEFAULT, LOGIN]);
  return {
    result,
    scopedAbsent: !(await keychainHasItem(runner, vaultServiceFor(DEFAULT, root))),
    unscopedAbsent: !(await keychainHasItem(runner, unscopedVaultServiceFor(DEFAULT)))
  };
});

await arm('bothRecordNamesOld', async (root) => {
  await plant(unscopedVaultServiceFor(DEFAULT), cred('recorded'));
  await plant(vaultServiceFor(DEFAULT, root), cred('stale'));
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
    scopedHoldsRecorded:
      (await keychainRead(runner, vaultServiceFor(DEFAULT, root))) === cred('recorded'),
    unscopedGone: !(await keychainHasItem(runner, unscopedVaultServiceFor(DEFAULT)))
  };
});

await arm('bothRecordNamesScoped', async (root) => {
  await plant(unscopedVaultServiceFor(DEFAULT), cred('older'));
  await plant(vaultServiceFor(DEFAULT, root), cred('recorded'));
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
    scopedKept:
      (await keychainRead(runner, vaultServiceFor(DEFAULT, root))) === cred('recorded'),
    unscopedGone: !(await keychainHasItem(runner, unscopedVaultServiceFor(DEFAULT)))
  };
});

await arm('stagedLeftover', async (root) => {
  await plant(unscopedVaultServiceFor(stagedSlotFor(LOGIN)), cred('residue'));
  const result = await migrate(root, true, [LOGIN]);
  return {
    result,
    residueGone: !(await keychainHasItem(runner, unscopedVaultServiceFor(stagedSlotFor(LOGIN)))),
    nothingMovedIn: !(await keychainHasItem(runner, vaultServiceFor(LOGIN, root)))
  };
});

await arm('notOwnProfile', async (root) => {
  await plant(unscopedVaultServiceFor(DEFAULT), cred('untouchable'));
  const result = await migrate(root, false, [DEFAULT, LOGIN]);
  return {
    result,
    unscopedStill:
      (await keychainRead(runner, unscopedVaultServiceFor(DEFAULT))) === cred('untouchable'),
    scopedAbsent: !(await keychainHasItem(runner, vaultServiceFor(DEFAULT, root)))
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
