/**
 * Phase 125 — the four workflows that left `GmuxCore`, and the two rules that
 * keep the split safe.
 *
 * The phase moved 1,240 lines out of `../core.ts` and changed no behaviour.
 * Two things have to stay true afterwards, and neither is visible by calling a
 * function, so both are read as source text. That is the same instrument
 * `unreachable-boundary.test.ts` and `p94-remote-create-folder.test.ts`
 * already use for a rule that lives in source shape.
 *
 * 1. No extracted leaf imports the class it moved out of. A leaf that imported
 *    `./core` would be a two-node runtime cycle, and
 *    `build/assert-no-runtime-cycles.mjs` would reject it. This test names the
 *    file and the specifier, so a later round learns the rule from the failure
 *    rather than from a graph.
 * 2. Every public method `GmuxCore` had at `8ce91a0` is still declared with
 *    that name. `../ipc.ts` calls 20 of them and `../capabilities.ts` calls 3
 *    more, and neither file was edited by this phase.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name: string): string =>
  readFileSync(join(DIR, name), 'utf8');

/** The four files Phase 125 created. */
const LEAVES = [
  'create-local.ts',
  'id-harvest.ts',
  'mutation-ledger.ts',
  'quit-generation.ts'
];

describe('no extracted leaf imports its old owner', () => {
  for (const leaf of LEAVES) {
    it(`${leaf} imports neither ./core nor ./index`, () => {
      const source = read(leaf);
      for (const forbidden of [
        "from './core'",
        "from './core.ts'",
        "from './index'",
        "from '.'"
      ]) {
        expect(
          source.includes(forbidden),
          `${leaf} must not contain ${forbidden}. It reads the core ` +
            'through its own dependency interface, and importing the class ' +
            'back would be a runtime cycle.'
        ).toBe(false);
      }
      // The bare class name never appears either, in a type position or a
      // value one, because the leaf is not allowed to know it. The two module
      // functions `shutdownGmuxCore` and `getGmuxCore` may be named in prose,
      // so the match requires the identifier to start on its own.
      expect(
        /(?<![A-Za-z])GmuxCore\b/.test(source),
        `${leaf} names GmuxCore`
      ).toBe(false);
    });
  }
});

describe('every public method of GmuxCore kept its name', () => {
  /**
   * The list as it stood at `8ce91a0`, before the split. It is written out
   * here so a reviewer can read what the class promises rather than trusting a
   * regular expression over a moving file.
   */
  const PUBLIC_METHODS = [
    'takeManifestGenerationOnSuspend',
    'takeManifestGenerationOnQuit',
    'boot',
    'snapshotAllSessions',
    'restoreSession',
    'scheduleRefresh',
    'refresh',
    'startStatusWatcher',
    'setPollFocused',
    'captureSyncsIdle',
    'broadcastSessions',
    'scrollState',
    'scrollBy',
    'scrollTo',
    'scrollLive',
    'scrollbackStats',
    'sessionScrollback',
    'scrollbackReport',
    'listSessions',
    'listSessionRecords',
    'listRemovedSessions',
    'createSession',
    'renameSession',
    'killSession',
    'discardSession',
    'removeSession',
    'attachSession',
    'detachSession',
    'resizeSession',
    'addProject',
    'addRemoteProject',
    'listProjects',
    'removeProject',
    'beginShutdown',
    'joinAdmitted',
    'dispose'
  ];

  const core = read('core.ts');

  for (const name of PUBLIC_METHODS) {
    it(`declares ${name}`, () => {
      // A declaration, not a call: the name at the start of a line, inside the
      // class body, followed by an open paren or a type parameter list.
      const declared = new RegExp(
        `\\n  (?:static )?(?:async )?${name}[(<]`
      ).test(core);
      expect(
        declared,
        `GmuxCore must still declare ${name}. ../ipc.ts and ` +
          '../capabilities.ts call these by name and Phase 125 edited neither.'
      ).toBe(true);
    });
  }

  it('declares no method the list above does not name', () => {
    const declarations = /\n  (?:static )?(?:async )?([a-z][A-Za-z0-9]*)\(/g;
    const found = [...core.matchAll(declarations)]
      .map((m) => m[1] as string)
      .filter((name) => !PUBLIC_METHODS.includes(name));
    // `private` and `get` carry their keyword, so anything left here is a new
    // public method. A phase that adds one updates the list above on purpose.
    expect(found).toEqual([]);
  });
});
