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
    const res = planTmuxResolution({ packaged: true, env: {}, resourcesPath });
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
      resourcesPath
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
      resourcesPath
    });
    assert.equal(res.path, bin);
    assert.equal(res.source, 'bundled');
  });

  it('a file that is not executable is not the bundled binary either', () => {
    const { resourcesPath, bin } = fakeResources(false);
    mkdirSync(dirname(bin), { recursive: true });
    writeFileSync(bin, 'not executable\n');
    chmodSync(bin, 0o644);
    const res = planTmuxResolution({ packaged: true, env: {}, resourcesPath });
    assert.equal(res.path, null);
  });

  it('a missing bundled binary is a broken install, not a missing prerequisite', () => {
    const { resourcesPath } = fakeResources(false);
    const err = tmuxUnavailableError(
      planTmuxResolution({ packaged: true, env: {}, resourcesPath })
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
      resourcesPath: root
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
      resourcesPath: root
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
      resourcesPath: root
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
      resourcesPath: root
    });
    assert.equal(res.source, 'dev-path');
    assert.equal(res.packaged, false);
    if (res.path === null) {
      assert.equal(
        res.detail,
        'probed /opt/homebrew/bin, /usr/local/bin, /usr/bin and PATH'
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
