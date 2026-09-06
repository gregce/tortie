/**
 * Unit tests for tmux BINARY resolution (Phase 41), in src/main/tmux/resolve.ts.
 *
 * The rule this file exists to hold is one sentence: a packaged Tortie runs the
 * tmux inside its own bundle and nothing else. Everything below is that rule
 * and its edges:
 *
 * - packaged, the bundled binary is there.
 * - packaged, the bundled binary is missing, so the install is broken.
 * - packaged with GMUX_TMUX_BIN set, which is refused rather than honoured.
 * - a development build with the override set, and with it pointing at
 *   something that is not an executable file.
 * - a development build with neither, which is the old PATH search.
 * - the two error sentences, which are different on purpose.
 *
 * PHASE 217 ADDED THE SECOND RULE THIS FILE HOLDS: a development build runs the
 * copy its own checkout carries, at build/vendor/tmux/bin/tmux, before anything
 * installed on the machine. The operator hit the alternative on 2026-09-06.
 * His installed Tortie had created the session server with the 3.7b it carries,
 * his development build resolved Homebrew's 3.6a, and the version gate refused
 * the pair. The gate was right; the two builds running two binaries was the
 * defect. The cases below pin the preference, that GMUX_TMUX_BIN still beats
 * it, that a fresh clone with no such file is not an error, and that a packaged
 * build never looks at it.
 *
 * They drive `planTmuxResolution`, which is the decision with `app.isPackaged`
 * and `process.resourcesPath` passed in. Neither of those two can be set
 * honestly from a plain node test, and the packaged branch is the one this
 * phase exists for, so the decision was written to take them as arguments.
 *
 * The general resolution tests (login-shell PATH capture, argv[0] resolution)
 * live in ./resolve.test.ts.
 *
 * Runner: vitest (`npm test`). Assertions on node:assert/strict.
 */

import { afterEach, beforeEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  isPackagedApp,
  planTmuxResolution,
  resetTmuxResolutionWarnings,
  tmuxUnavailableError
} from '../resolve';

let root: string;

function makeExecutable(path: string): string {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, '#!/bin/sh\necho "tmux 3.7b"\n');
  chmodSync(path, 0o755);
  return path;
}

/** A scratch Contents/Resources, with or without the binary inside it. */
function fakeResources(withBinary: boolean): { resourcesPath: string; bin: string } {
  const resourcesPath = join(root, 'Resources');
  const bin = join(resourcesPath, 'bin', 'tmux');
  mkdirSync(join(resourcesPath, 'bin'), { recursive: true });
  if (withBinary) makeExecutable(bin);
  return { resourcesPath, bin };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p41-resolve-'));
  resetTmuxResolutionWarnings();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  resetTmuxResolutionWarnings();
});

describe('packaged', () => {
  it('runs the copy inside the bundle', () => {
    const { resourcesPath, bin } = fakeResources(true);
    const res = planTmuxResolution({
      packaged: true,
      env: {},
      resourcesPath,
      appPath: root
    });
    assert.equal(res.path, bin);
    assert.equal(res.source, 'bundled');
    assert.equal(res.packaged, true);
    assert.equal(res.detail, bin);
  });

  it('never consults PATH, even when a tmux is sitting on it', () => {
    const { resourcesPath } = fakeResources(false);
    const elsewhere = join(root, 'elsewhere');
    makeExecutable(join(elsewhere, 'tmux'));
    const res = planTmuxResolution({
      packaged: true,
      env: { PATH: elsewhere },
      resourcesPath,
      appPath: root
    });
    assert.equal(res.path, null, 'a packaged build fell back to PATH');
    assert.match(res.detail, /bundled tmux is not at/);
  });

  it('refuses GMUX_TMUX_BIN and still uses its own copy', () => {
    const { resourcesPath, bin } = fakeResources(true);
    const other = makeExecutable(join(root, 'other-tmux'));
    const res = planTmuxResolution({
      packaged: true,
      env: { GMUX_TMUX_BIN: other },
      resourcesPath,
      appPath: root
    });
    assert.equal(res.path, bin);
    assert.equal(res.source, 'bundled');
  });

  it('a file that is not executable is not the bundled binary either', () => {
    const { resourcesPath, bin } = fakeResources(false);
    mkdirSync(dirname(bin), { recursive: true });
    writeFileSync(bin, 'not executable\n');
    chmodSync(bin, 0o644);
    const res = planTmuxResolution({
      packaged: true,
      env: {},
      resourcesPath,
      appPath: root
    });
    assert.equal(res.path, null);
  });

  it('a missing bundled binary is a broken install, not a missing prerequisite', () => {
    const { resourcesPath } = fakeResources(false);
    const err = tmuxUnavailableError(
      planTmuxResolution({ packaged: true, env: {}, resourcesPath, appPath: root })
    );
    assert.equal(err.payload.code, 'TMUX_BUNDLE_INCOMPLETE');
    assert.equal(
      err.payload.message,
      'Tortie is missing the program that keeps your sessions alive. It ' +
        'ships inside the application, and it is not there. Reinstalling ' +
        'Tortie will restore it.'
    );
    // Nobody is told to install anything, because nothing is missing from the
    // machine.
    assert.ok(!err.payload.message.includes('brew'));
  });
});

describe('development build', () => {
  /** No electron under vitest, so nothing here is ever a packaged build. */
  it('isPackagedApp is false outside Electron', () => {
    assert.equal(isPackagedApp(), false);
  });

  it('honours GMUX_TMUX_BIN when it names an executable file', () => {
    const chosen = makeExecutable(join(root, 'chosen', 'tmux'));
    const res = planTmuxResolution({
      packaged: false,
      env: { GMUX_TMUX_BIN: chosen, PATH: '' },
      resourcesPath: root,
      appPath: join(root, 'no-checkout')
    });
    assert.equal(res.path, chosen);
    assert.equal(res.source, 'dev-override');
    assert.match(res.detail, /GMUX_TMUX_BIN=/);
  });

  it('ignores an override that is not an executable file rather than failing', () => {
    const notExecutable = join(root, 'plain.txt');
    writeFileSync(notExecutable, 'not a binary\n');
    const res = planTmuxResolution({
      packaged: false,
      env: { GMUX_TMUX_BIN: notExecutable, PATH: join(root, 'onpath') },
      resourcesPath: root,
      appPath: join(root, 'no-checkout')
    });
    // A stale line in a shell profile must not make a dev build unusable, so
    // the search carries on rather than stopping.
    assert.notEqual(res.path, notExecutable);
    assert.equal(res.source, 'dev-path');
  });

  it('ignores an override that names nothing at all', () => {
    const res = planTmuxResolution({
      packaged: false,
      env: { GMUX_TMUX_BIN: join(root, 'nothing-here'), PATH: '' },
      resourcesPath: root,
      appPath: join(root, 'no-checkout')
    });
    assert.equal(res.source, 'dev-path');
  });

  /**
   * The known install locations are probed before PATH, because a GUI launched
   * Electron app inherits a PATH with no /opt/homebrew/bin in it. That is why
   * this case asserts the shape of the answer rather than a path: on a machine
   * with Homebrew's tmux installed, that is the one it finds.
   */
  it('falls back to the known locations and then PATH', () => {
    const res = planTmuxResolution({
      packaged: false,
      env: { PATH: join(root, 'empty') },
      resourcesPath: root,
      appPath: join(root, 'no-checkout')
    });
    assert.equal(res.source, 'dev-path');
    assert.equal(res.packaged, false);
    if (res.path === null) {
      assert.equal(
        res.detail,
        'probed build/vendor/tmux/bin, /opt/homebrew/bin, /usr/local/bin, ' +
          '/usr/bin and PATH'
      );
    } else {
      assert.equal(res.detail, res.path);
    }
  });

  it('the development sentence names the packaged answer, so nobody thinks it is required', () => {
    const err = tmuxUnavailableError({
      path: null,
      source: 'dev-path',
      packaged: false,
      detail: 'probed nothing'
    });
    assert.equal(err.payload.code, 'TMUX_NOT_FOUND');
    assert.equal(
      err.payload.message,
      'This is a development build, so Tortie uses the tmux on your PATH, ' +
        'and there is none. Install tmux with "brew install tmux". A ' +
        'packaged Tortie carries its own copy and needs nothing installed.'
    );
    assert.equal(err.payload.detail, 'probed nothing');
  });
});

/**
 * PHASE 217. The copy the checkout carries, and the four things about it that
 * matter.
 *
 * `appPath` is `app.getAppPath()`, which for `electron .` from the repository
 * root IS the repository root. `process.resourcesPath` cannot answer this in a
 * development launch: it points inside
 * node_modules/electron/dist/Electron.app/Contents/Resources, measured with a
 * one window Electron on 2026-09-06.
 */
describe('the copy this checkout carries (Phase 217)', () => {
  /** A scratch checkout, with or without build/vendor/tmux/bin/tmux in it. */
  function fakeCheckout(withBinary: boolean): { appPath: string; bin: string } {
    const appPath = join(root, 'checkout');
    const bin = join(appPath, 'build', 'vendor', 'tmux', 'bin', 'tmux');
    mkdirSync(dirname(bin), { recursive: true });
    if (withBinary) makeExecutable(bin);
    return { appPath, bin };
  }

  it('a development build runs it, ahead of anything on the machine', () => {
    const { appPath, bin } = fakeCheckout(true);
    const onPath = join(root, 'onpath');
    makeExecutable(join(onPath, 'tmux'));
    const res = planTmuxResolution({
      packaged: false,
      env: { PATH: onPath },
      resourcesPath: root,
      appPath
    });
    assert.equal(res.path, bin);
    assert.equal(res.source, 'dev-vendored');
    assert.equal(res.packaged, false);
    assert.equal(res.detail, bin);
  });

  it('GMUX_TMUX_BIN still wins, because the interop probes depend on it', () => {
    const { appPath } = fakeCheckout(true);
    const chosen = makeExecutable(join(root, 'chosen', 'tmux'));
    const res = planTmuxResolution({
      packaged: false,
      env: { GMUX_TMUX_BIN: chosen, PATH: '' },
      resourcesPath: root,
      appPath
    });
    assert.equal(res.path, chosen);
    assert.equal(res.source, 'dev-override');
  });

  it('a fresh clone has no such file, and that is not an error', () => {
    // build/vendor is gitignored, so this is what every first clone looks
    // like. The answer must be the probe order that shipped before Phase 217.
    const { appPath } = fakeCheckout(false);
    const res = planTmuxResolution({
      packaged: false,
      env: { PATH: '' },
      resourcesPath: root,
      appPath
    });
    assert.equal(res.source, 'dev-path');
    assert.notEqual(res.source, 'dev-vendored');
  });

  it('a file that is there and is not executable does not win', () => {
    // A half written or unfinished vendor build must not take precedence over
    // a working tmux on the machine.
    const { appPath, bin } = fakeCheckout(false);
    mkdirSync(dirname(bin), { recursive: true });
    writeFileSync(bin, 'not a binary\n');
    chmodSync(bin, 0o644);
    const onPath = join(root, 'onpath');
    makeExecutable(join(onPath, 'tmux'));
    const res = planTmuxResolution({
      packaged: false,
      env: { PATH: onPath },
      resourcesPath: root,
      appPath
    });
    // Which file it lands on depends on the machine, since the three known
    // locations are probed before PATH. What is asserted is that it is not the
    // unusable one in the checkout.
    assert.notEqual(res.path, bin);
    assert.equal(res.source, 'dev-path');
  });

  it('a packaged build never looks at it, whatever the checkout holds', () => {
    const { resourcesPath, bin } = fakeResources(true);
    const { appPath } = fakeCheckout(true);
    const res = planTmuxResolution({
      packaged: true,
      env: {},
      resourcesPath,
      appPath
    });
    assert.equal(res.path, bin);
    assert.equal(res.source, 'bundled');
  });

  it('an empty appPath, which is what plain node gets, finds nothing', () => {
    const res = planTmuxResolution({
      packaged: false,
      env: { PATH: '' },
      resourcesPath: root,
      appPath: ''
    });
    assert.notEqual(res.source, 'dev-vendored');
  });
});
