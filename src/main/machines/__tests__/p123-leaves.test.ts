/**
 * The four leaves Phase 123 cut out of `src/main/machines/`, and the properties
 * that keep them leaves.
 *
 * ## Why this is a test rather than a comment
 *
 * Two runtime cycles lived here. Six modules turned on three files importing
 * `../remote-sessions.ts`, which imports all three of them back. Three more
 * turned on `../key-install.ts` reading one constant out of `../connection-test.ts`
 * and `../key-material.ts` reading two sentences out of `../key-install.ts`.
 * Phase 123 moved four symbols into four files that import nothing from the
 * files that import them.
 *
 * `build/assert-no-runtime-cycles.mjs` fails the whole tree if any of that comes
 * back, so the graph is already guarded. What that gate cannot say is that the
 * VALUES did not change while the files moved, and three of them are durability
 * facts. This test reads them.
 *
 * It opens no manifest, starts no tmux server and spawns nothing. Every one of
 * the four modules under test imports at most the machine context.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MACHINE_KEY_KEYGEN_MISSING, MACHINE_KEY_NO_ID } from '../key-codes';
import { REMOTE_STAMPS, oneLine, remoteStampArgs } from '../remote-stamps';
import { SSH_BATCH_MODE_INTERACTIVE } from '../ssh-options';

function sourceOf(file: string): string {
  return readFileSync(join(__dirname, '..', file), 'utf8');
}

const readyContextSource = sourceOf('ready-context.ts');
const remoteStampsSource = sourceOf('remote-stamps.ts');
const sshOptionsSource = sourceOf('ssh-options.ts');
const keyCodesSource = sourceOf('key-codes.ts');
const remoteSessionsSource = sourceOf('remote-sessions.ts');

/** Every `from '...'` a file names, in the order it names them. */
function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/from\s+'([^']+)'/g)].map((hit) => hit[1] ?? '');
}

describe('the Phase 123 leaves import nothing that imports them', () => {
  it('holds the readiness check in a file that names only the context', () => {
    expect(importSpecifiers(readyContextSource)).toEqual([
      '../errors',
      './context',
      './remote-copy'
    ]);
  });

  it('holds the stamps, the ssh option and the two codes in files that import nothing', () => {
    expect(importSpecifiers(remoteStampsSource)).toEqual([]);
    expect(importSpecifiers(sshOptionsSource)).toEqual([]);
    expect(importSpecifiers(keyCodesSource)).toEqual([]);
  });

  it('keeps every old caller of the two remote leaves reading this module', () => {
    // Phase 123 rewrote two import lines and left the rest reading this
    // module through the re-export. Phase 145 stage 4 then pointed the sixteen
    // callers that name ONLY the readiness check at `./ready-context.ts`
    // itself, so a future import from `./remote-sessions.ts` into one of those
    // leaves cannot close a cycle. The re-export stays, because the callers
    // that read the readiness check beside session rows or the feed still
    // come through this module.
    expect(remoteSessionsSource).toContain("export { readyRemoteContext };");
    expect(remoteSessionsSource).toContain(
      "export { REMOTE_STAMPS, oneLine, remoteStampArgs };"
    );
  });
});

describe('nothing durability critical moved with them', () => {
  it('stamps the same four options in the same order', () => {
    // `remoteCreate` writes these in declaration order, and a session carrying
    // neither `@gmux-id` nor the `GMUX_SESSION_ID` pane stamp is not Tortie's.
    expect(REMOTE_STAMPS).toEqual([
      '@gmux-id',
      '@gmux-agent',
      '@gmux-name',
      '@gmux-project'
    ]);
  });

  it('composes a stamp against the immutable identifier and nothing else', () => {
    expect(remoteStampArgs('$7', '@gmux-name', 'a name')).toEqual([
      'set-option',
      '-t',
      '$7',
      '@gmux-name',
      'a name'
    ]);
  });

  it('flattens a tab and a newline to one space each, as before', () => {
    expect(oneLine('one\ttwo\nthree')).toBe('one two three');
    expect(oneLine('one\r\n\ttwo')).toBe('one two');
  });
});

describe('the two moved sentences are unchanged', () => {
  it('carries the one option that lets a machine ask a question', () => {
    expect(SSH_BATCH_MODE_INTERACTIVE).toBe('BatchMode=no');
  });

  it('carries both key refusals word for word', () => {
    expect(MACHINE_KEY_NO_ID).toBe(
      'Name this machine before Tortie makes a key for it. The name is part of ' +
        "what you are agreeing to, and it is what tells one machine's key from " +
        "another's."
    );
    expect(MACHINE_KEY_KEYGEN_MISSING).toBe(
      'Tortie could not find the program macOS uses to make a key, at ' +
        '/usr/bin/ssh-keygen. That program ships with macOS, so a missing one means ' +
        'something removed it or the disk is damaged. Nothing was sent to the ' +
        'machine.'
    );
  });
});
