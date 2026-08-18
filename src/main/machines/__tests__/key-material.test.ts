/**
 * The key Tortie makes for one machine (Phase 79.1).
 *
 * The tests are written as the adversary rather than as the happy path, because
 * the machine id these functions are given comes from a file an agent process
 * can write. So the cases that matter are: an id that tries to leave the
 * directory, an id carrying shell characters, an id carrying a newline, and a
 * public key line that is not one Tortie made.
 *
 * Everything here runs against real files in a temporary directory, and the key
 * is made by the real key maker on this Mac. The only thing mocked is
 * Electron's userData path, which `../store.ts` reads for the record directory.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: () => Buffer.from(''),
    decryptString: () => ''
  }
}));

const {
  KEY_COMMENT_PREFIX,
  MACHINE_KEY_DIR_MODE,
  MACHINE_KEY_FILE_MODE,
  MACHINE_KEY_TYPE,
  PINNED_SSH_KEYGEN_PATH,
  PUBLIC_KEY_LINE_RE,
  ensureMachineKey,
  isPublicKeyLine,
  machineKeyComment,
  machineKeyDir,
  machineKeyLeaf,
  machineKeyPath,
  machinePublicKeyPath,
  publicKeyFingerprint
} = await import('../key-material');
const { machineRecordDir } = await import('../store');

/**
 * Twelve ids nobody would type on purpose. Every one of them is a value the
 * machines file is allowed to carry, and that file is one an agent process can
 * write, so every one of them reaches these functions in a build that does not
 * stop it.
 */
const HOSTILE_IDS = [
  '../../../../etc/ssh/ssh_host_ed25519_key',
  '..',
  '.',
  '/etc/shadow',
  'a/b/c',
  '   x   ',
  'id\0null',
  "'; rm -rf / #",
  '$(id)',
  '`id`',
  'two\nlines',
  'unicode-horse-abcdefghij'.repeat(40)
];

let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p791-keymat-'));
  userData = root;
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('where the key file goes', () => {
  it('sits inside the machine record directory, under keys', () => {
    expect(machineKeyDir()).toBe(join(machineRecordDir(), 'keys'));
    expect(machineKeyDir('/tmp/other')).toBe(
      join('/tmp', 'other', 'gmux', 'machines', 'keys')
    );
  });

  it('names the file with a hash and never with the id', () => {
    expect(machineKeyLeaf('pop-os')).toMatch(/^machine-[0-9a-f]{12}$/);
    expect(machineKeyLeaf('pop-os')).toBe(machineKeyLeaf('pop-os'));
    expect(machineKeyLeaf('pop-os')).not.toBe(machineKeyLeaf('attic'));
    expect(machineKeyLeaf('pop-os')).not.toContain('pop');
  });

  it('puts the public half beside the private one', () => {
    expect(machinePublicKeyPath('pop-os')).toBe(`${machineKeyPath('pop-os')}.pub`);
  });

  it('keeps every hostile id inside the record directory', () => {
    const dir = machineKeyDir();
    for (const id of HOSTILE_IDS) {
      const path = machineKeyPath(id);
      expect(path.startsWith(`${dir}/`)).toBe(true);
      expect(path.slice(dir.length + 1)).toMatch(/^machine-[0-9a-f]{12}$/);
      expect(path).not.toContain('..');
    }
  });

  it('gives every hostile id a comment of twelve hex digits', () => {
    for (const id of HOSTILE_IDS) {
      expect(machineKeyComment(id)).toMatch(/^tortie-[0-9a-f]{12}$/);
      expect(machineKeyComment(id).startsWith(KEY_COMMENT_PREFIX)).toBe(true);
    }
  });

  it('gives two ids two file names', () => {
    const leaves = new Set(HOSTILE_IDS.map((id) => machineKeyLeaf(id)));
    expect(leaves.size).toBe(HOSTILE_IDS.length);
  });
});

describe('what counts as a public key line', () => {
  const GOOD =
    'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB6f4Iu2vQeJcuqZ0h1sK2n2u9C6VvVdV9wF1B2Q3R4S tortie-0123456789ab';

  it('accepts the line the key maker writes with the comment Tortie composed', () => {
    expect(isPublicKeyLine(GOOD)).toBe(true);
    expect(PUBLIC_KEY_LINE_RE.test(GOOD)).toBe(true);
  });

  it('refuses a line carrying anything a shell would read', () => {
    const bad = [
      `${GOOD}\nssh-ed25519 AAAA other`,
      `${GOOD};id`,
      `${GOOD}\`id\``,
      `${GOOD}$(id)`,
      `${GOOD}'`,
      `${GOOD} `,
      ` ${GOOD}`,
      GOOD.replace('tortie-', 'tortie '),
      GOOD.replace('ssh-ed25519', 'ssh-rsa'),
      'ssh-ed25519 AAAA tortie-0123456789ab',
      ''
    ];
    for (const line of bad) expect(isPublicKeyLine(line)).toBe(false);
  });

  it('answers null with a fingerprint for anything it refuses', () => {
    expect(publicKeyFingerprint(`${GOOD};id`)).toBeNull();
  });
});

describe('making the key', () => {
  it('makes one key, and uses it again on the next call', () => {
    const first = ensureMachineKey({ id: 'pop-os', userDataOverride: root });
    expect(first.made).toBe(true);
    expect(first.path).toBe(machineKeyPath('pop-os', root));
    expect(isPublicKeyLine(first.publicKeyLine)).toBe(true);
    expect(first.publicKeyLine.endsWith(machineKeyComment('pop-os'))).toBe(true);
    expect(first.fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]{43}$/);

    const second = ensureMachineKey({ id: 'pop-os', userDataOverride: root });
    expect(second.made).toBe(false);
    expect(second.publicKeyLine).toBe(first.publicKeyLine);
    expect(second.fingerprint).toBe(first.fingerprint);
  });

  it('sets 0600 on both halves and 0700 on the folder', () => {
    const key = ensureMachineKey({ id: 'pop-os', userDataOverride: root });
    expect(statSync(key.path).mode & 0o777).toBe(MACHINE_KEY_FILE_MODE);
    expect(statSync(key.publicPath).mode & 0o777).toBe(MACHINE_KEY_FILE_MODE);
    expect(statSync(machineKeyDir(root)).mode & 0o777).toBe(MACHINE_KEY_DIR_MODE);
  });

  it('makes an ed25519 key, which is what the public half says', () => {
    const key = ensureMachineKey({ id: 'pop-os', userDataOverride: root });
    expect(key.publicKeyLine.startsWith(`ssh-${MACHINE_KEY_TYPE} `)).toBe(true);
  });

  it('agrees with the key maker about the fingerprint', () => {
    const key = ensureMachineKey({ id: 'pop-os', userDataOverride: root });
    const printed = execFileSync(PINNED_SSH_KEYGEN_PATH, ['-l', '-f', key.publicPath], {
      encoding: 'utf8'
    });
    expect(printed.split(/\s+/)[1]).toBe(key.fingerprint);
  });

  it('makes a different key for a different machine', () => {
    const one = ensureMachineKey({ id: 'pop-os', userDataOverride: root });
    const two = ensureMachineKey({ id: 'attic', userDataOverride: root });
    expect(two.path).not.toBe(one.path);
    expect(two.publicKeyLine).not.toBe(one.publicKeyLine);
  });

  it('makes a key again when the public half was damaged', () => {
    const first = ensureMachineKey({ id: 'pop-os', userDataOverride: root });
    writeFileSync(first.publicPath, 'ssh-ed25519 not-a-key someone-else\n', 'utf8');
    const second = ensureMachineKey({ id: 'pop-os', userDataOverride: root });
    expect(second.made).toBe(true);
    expect(second.publicKeyLine).not.toBe(first.publicKeyLine);
    expect(isPublicKeyLine(second.publicKeyLine)).toBe(true);
  });

  it('refuses an empty id rather than sharing one file between machines', () => {
    expect(() => ensureMachineKey({ id: '   ', userDataOverride: root })).toThrow();
  });

  it('refuses when the key maker is not there, and says so', () => {
    let message = '';
    try {
      ensureMachineKey({
        id: 'pop-os',
        keygenPath: join(root, 'no-such-program'),
        userDataOverride: root
      });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain(PINNED_SSH_KEYGEN_PATH);
    expect(message).toContain('Nothing was sent to the machine.');
  });

  it('keeps a hostile id out of the file name and out of the comment', () => {
    for (const id of HOSTILE_IDS.slice(0, 5)) {
      const key = ensureMachineKey({ id, userDataOverride: root });
      expect(key.path.startsWith(`${machineKeyDir(root)}/`)).toBe(true);
      expect(key.publicKeyLine).toMatch(PUBLIC_KEY_LINE_RE);
      expect(key.publicKeyLine).not.toContain('etc');
      expect(key.publicKeyLine).not.toContain('..');
    }
  });
});

describe('what this module may never name', () => {
  it('names no part of the folder the person keeps their own keys in', () => {
    const source = readFileSync(join(__dirname, '..', 'key-material.ts'), 'utf8');
    const offending = source
      .split('\n')
      .map((text, index) => ({ line: index + 1, text: text.trim() }))
      .filter((row) => /homedir|\.ssh|~/.test(row.text))
      .filter((row) => !/^(\*|\/\/|\/\*)/.test(row.text));
    expect(offending).toEqual([]);
  });
});
