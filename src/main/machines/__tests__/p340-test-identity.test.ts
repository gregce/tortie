/**
 * Phase 340, D27: the check names Tortie's own key for that id.
 *
 * Phase 84 item 7 named Tortie's key on every command the carriage sends
 * (`./ssh.ts`, pinned by condition 48) and missed the visible test, which
 * composes its own argv. So after "Put Tortie's key on it" the store re-ran the
 * test, and the test, offering only the person's own keys, asked a machine that
 * trusts none of them for the password again: the key the button had just
 * installed was never tried (§Attack R2).
 *
 * The rule is the carriage's: exactly one `-o IdentityFile="<path>"`, quoted,
 * after the record files and before `-p`; nothing when there is no key pair;
 * never `IdentitiesOnly`, so the person's own keys are still offered.
 *
 * The second half drives `machines:test` through the real registrar, with the
 * key pair planted under a scratch data directory and node-pty replaced by a
 * stand-in that records the argv. Nothing is spawned.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';

let userData = '';

const spawned: { file: string; args: string[] }[] = [];

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  BrowserWindow: { getAllWindows: () => [] },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(text, 'utf8'),
    decryptString: (buf: Buffer) => buf.toString('utf8')
  }
}));

vi.mock('node-pty', () => ({
  spawn: (file: string, args: string[]) => {
    spawned.push({ file, args });
    return {
      pid: 434343,
      onData: () => undefined,
      onExit: () => undefined,
      write: () => undefined,
      kill: () => undefined
    };
  }
}));

// The menu helper is main's window plumbing; this file is about the argv.
vi.mock('../../menu', () => ({ openFolderOnMachine: () => true }));

const { composeTestArgv, composeTestCommandLine, resetMachineTestForTests, PINNED_SSH_PATH } =
  await import('../connection-test');
const { registerMachinesIpc } = await import('../ipc');
const { machineKeyPath, machinePublicKeyPath } = await import('../key-material');
const { resetMachinesStoreForTests } = await import('../store');
const { trustedInvokeEvent } = await import('../../security/__tests__/trusted-test-sender');

const KEYS = {
  tortie: '/Users/x/Library/Application Support/Tortie/gmux/machines/known-machines',
  user: '/Users/x/.ssh/known_hosts'
};
const FULL = { host: 'studio.local', user: 'greg', port: 2222, remoteTmuxPath: null };
const BARE = { host: '127.0.0.1', user: null, port: null, remoteTmuxPath: null };
const KEY = '/Users/x/Library/Application Support/Tortie/gmux/machines/keys/machine-abc';

const identityValues = (argv: string[]): string[] =>
  argv.filter((a, i) => argv[i - 1] === '-o' && a.startsWith('IdentityFile='));

describe('composeTestArgv names Tortie’s key exactly as the carriage does (D27)', () => {
  it('a key pair present: exactly one IdentityFile, the path quoted', () => {
    const argv = composeTestArgv(FULL, KEYS, KEY);
    expect(identityValues(argv)).toEqual([`IdentityFile="${KEY}"`]);
  });

  it('sits after the record files and before -p, -l and the address', () => {
    const argv = composeTestArgv(FULL, KEYS, KEY);
    const at = argv.indexOf(`IdentityFile="${KEY}"`);
    const records = argv.findIndex((a) => a.startsWith('UserKnownHostsFile='));
    expect(at).toBeGreaterThan(records);
    expect(at).toBeLessThan(argv.indexOf('-p'));
    expect(at).toBeLessThan(argv.indexOf('-l'));
    expect(at).toBeLessThan(argv.indexOf('studio.local'));
  });

  it('no key: no IdentityFile at all', () => {
    expect(identityValues(composeTestArgv(FULL, KEYS))).toEqual([]);
    expect(identityValues(composeTestArgv(FULL, KEYS, null))).toEqual([]);
    expect(identityValues(composeTestArgv(BARE, KEYS, ''))).toEqual([]);
  });

  it('never IdentitiesOnly, so the person’s own keys are still offered', () => {
    for (const argv of [composeTestArgv(FULL, KEYS, KEY), composeTestArgv(BARE, KEYS)]) {
      expect(argv.join(' ')).not.toContain('IdentitiesOnly');
    }
  });

  it('changes nothing else in the argv', () => {
    const without = composeTestArgv(FULL, KEYS);
    const withKey = composeTestArgv(FULL, KEYS, KEY);
    const at = withKey.indexOf(`IdentityFile="${KEY}"`);
    expect([...withKey.slice(0, at - 1), ...withKey.slice(at + 1)]).toEqual(without);
  });

  it('the command line a person reads names it once, quoted', () => {
    const line = composeTestCommandLine(PINNED_SSH_PATH, FULL, KEYS, KEY);
    expect(line.split(KEY)).toHaveLength(2);
    expect(line).toContain(`'IdentityFile="${KEY}"'`);
  });
});

// ---------------------------------------------------------------------------
// Through the registrar
// ---------------------------------------------------------------------------

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, Handler>();
const fakeIpc = {
  handle: (channel: string, fn: Handler) => {
    handlers.set(channel, fn);
  }
} as unknown as IpcMain;

function event(): IpcMainInvokeEvent {
  const base = trustedInvokeEvent();
  const sender = base.sender as unknown as Record<string, unknown>;
  sender['isDestroyed'] = () => false;
  sender['send'] = () => undefined;
  sender['once'] = () => undefined;
  return base;
}

function plantKeyPair(id: string): string {
  const path = machineKeyPath(id);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, 'PRIVATE\n', { mode: 0o600 });
  writeFileSync(
    machinePublicKeyPath(id),
    'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB1cVQpLqRvXn7z8mKdT4wYuHsE2fGjNaPo9rXsUvWxYz ' +
      'tortie-0123456789ab\n'
  );
  return path;
}

describe('machines:test hands the key over only when the pair is on this Mac', () => {
  beforeEach(() => {
    userData = mkdtempSync(join(tmpdir(), 'tortie-p340-identity-'));
    mkdirSync(join(userData, 'gmux'), { recursive: true });
    spawned.length = 0;
    handlers.clear();
    resetMachinesStoreForTests();
    resetMachineTestForTests();
    registerMachinesIpc(fakeIpc);
  });

  afterEach(() => {
    resetMachineTestForTests();
    resetMachinesStoreForTests();
    rmSync(userData, { recursive: true, force: true });
  });

  const test = (id: string | undefined): string[] => {
    const fn = handlers.get('machines:test');
    if (fn === undefined) throw new Error('machines:test was never registered');
    fn(event(), {
      mode: 'draft',
      draft: { host: '127.0.0.1', user: null, port: null, remoteTmuxPath: null, ...(id ? { id } : {}) }
    });
    return spawned[spawned.length - 1]?.args ?? [];
  };

  it('a draft whose id has a key pair names that key', () => {
    const key = plantKeyPair('studio');
    expect(identityValues(test('studio'))).toEqual([`IdentityFile="${key}"`]);
  });

  it('a draft whose id has no key names none', () => {
    plantKeyPair('other');
    expect(identityValues(test('studio'))).toEqual([]);
  });

  it('a draft with no id names none', () => {
    plantKeyPair('studio');
    expect(identityValues(test(undefined))).toEqual([]);
  });

  it('a private half with no public half names none', () => {
    const path = machineKeyPath('studio');
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, 'PRIVATE\n', { mode: 0o600 });
    expect(identityValues(test('studio'))).toEqual([]);
  });
});
