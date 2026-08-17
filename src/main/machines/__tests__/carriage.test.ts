/**
 * The carriage declarations, and the one import rule that keeps a terminal
 * binding out of the local tmux door's import graph (Phase 69, M2).
 *
 * ## Why the import rule is a test rather than a comment
 *
 * The exec plane needs four declarations that Phase 68 wrote beside the one
 * visible connection test. That test module loads `node-pty` and spawns a
 * terminal. Reading a constant from it put `node-pty` into the import graph of
 * every module that reaches `execTmux`, which includes
 * `src/main/manifest/store.ts`, the durable record every session restores from.
 * The measured failure was `node build/contract-inventory.mjs --check`, whose
 * scratch bundle could not load `pty.node`. A comment asking the next author not
 * to do that again would not have caught it, so this test reads the import lines
 * of `../carriage.ts` and fails on anything outside a short allowed list.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  KNOWN_HOSTS_OPTION,
  PINNED_SSH_PATH,
  REMOTE_PATH_MARKER,
  SSH_BATCH_MODE_STEADY,
  SSH_CONNECT_TIMEOUT_SECONDS,
  composeKnownHostsOption,
  userHostKeysPath
} from '../carriage';
import * as connectionTest from '../connection-test';

/**
 * Every module `../carriage.ts` may import. Nothing that spawns a process, opens
 * a terminal or loads a native module belongs on this list, now or later.
 */
const ALLOWED_IMPORTS = ['node:fs', 'node:os', 'node:path', '../log'];

const carriageSource = readFileSync(
  join(__dirname, '..', 'carriage.ts'),
  'utf8'
);

describe('the carriage module imports nothing that could start something', () => {
  it('imports only from the allowed list', () => {
    const specifiers = [...carriageSource.matchAll(/from '([^']+)'/g)].map(
      (match) => match[1]
    );
    expect(specifiers.length).toBeGreaterThan(0);
    for (const specifier of specifiers) {
      expect(ALLOWED_IMPORTS).toContain(specifier);
    }
  });

  it('imports neither node-pty nor child_process, in any form', () => {
    // The prose in the module header names both, because it explains why this
    // module exists. So this reads the import and require sites rather than the
    // whole text.
    const sites = [
      ...carriageSource.matchAll(/(?:from|require\()\s*'([^']+)'/g)
    ].map((match) => match[1]);
    expect(sites).not.toContain('node-pty');
    expect(sites).not.toContain('child_process');
    expect(sites).not.toContain('node:child_process');
  });

  it('asks for the log inside the function rather than at module scope', () => {
    // A module scope `getLog(...)` would run while the log is still being built,
    // because this file sits inside the cycle its own header describes.
    expect(carriageSource).not.toMatch(/^const \w+ = getLog\(/m);
  });
});

describe('the values every carriage caller reads', () => {
  it('pins the client rather than trusting PATH', () => {
    expect(PINNED_SSH_PATH).toBe('/usr/bin/ssh');
  });

  it('carries the steady state batch mode and the connect timeout', () => {
    expect(SSH_BATCH_MODE_STEADY).toBe('BatchMode=yes');
    expect(SSH_CONNECT_TIMEOUT_SECONDS).toBe(10);
  });

  it('names the file Tortie owns first, and quotes both', () => {
    const value = composeKnownHostsOption({
      tortie: '/a b/tortie_known_machines',
      user: '/home/p/.ssh/known_hosts'
    });
    expect(value).toBe(
      `${KNOWN_HOSTS_OPTION}="/a b/tortie_known_machines" "/home/p/.ssh/known_hosts"`
    );
    expect(value.indexOf('tortie_known_machines')).toBeLessThan(
      value.indexOf('known_hosts')
    );
  });

  it('reads the file the person owns from their home folder', () => {
    expect(userHostKeysPath('/home/p')).toBe('/home/p/.ssh/known_hosts');
  });

  it('keeps the marker pair the remote answer is wrapped in', () => {
    expect(REMOTE_PATH_MARKER).toBe('__TORTIE_PATH__');
  });
});

describe('no caller of the connection test module changed', () => {
  it('re-exports every moved name with the same value', () => {
    expect(connectionTest.PINNED_SSH_PATH).toBe(PINNED_SSH_PATH);
    expect(connectionTest.SSH_BATCH_MODE_STEADY).toBe(SSH_BATCH_MODE_STEADY);
    expect(connectionTest.SSH_CONNECT_TIMEOUT_SECONDS).toBe(
      SSH_CONNECT_TIMEOUT_SECONDS
    );
    expect(connectionTest.REMOTE_PATH_MARKER).toBe(REMOTE_PATH_MARKER);
    expect(connectionTest.KNOWN_HOSTS_OPTION).toBe(KNOWN_HOSTS_OPTION);
    expect(connectionTest.composeKnownHostsOption).toBe(composeKnownHostsOption);
    expect(connectionTest.userHostKeysPath).toBe(userHostKeysPath);
    expect(typeof connectionTest.resolveSsh).toBe('function');
    expect(typeof connectionTest.resetSshWarningsForTests).toBe('function');
  });

  it('keeps the interactive batch mode out of the carriage', () => {
    // The exec plane must never be able to read this one. It stays in the
    // connection test module, and it is the only site in the tree.
    expect(connectionTest.SSH_BATCH_MODE_INTERACTIVE).toBe('BatchMode=no');
    expect(carriageSource).not.toContain('BatchMode=no');
  });
});
