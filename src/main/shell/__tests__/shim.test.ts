/**
 * The `tortie` shim (Phase 51): content, target choice, status, install,
 * remove — all against temp directories, never a real PATH directory.
 *
 * The shim's own refusal paths are driven for real: the script is written
 * to disk and run with /bin/sh. Neither refusal reaches the `exec
 * /usr/bin/open` line, so nothing is ever launched from these tests.
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { ShimDeps } from '../shim';
import {
  chooseInstallDir,
  composeShimContent,
  installShim,
  removeShim,
  SHIM_MARKER,
  SHIM_NAME,
  shimStatus
} from '../shim';

const root = mkdtempSync(join(tmpdir(), 'p51-shim-'));

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function deps(
  candidates: readonly string[],
  pathDirs: readonly string[]
): ShimDeps {
  return {
    candidates,
    userPath: () => Promise.resolve(pathDirs.join(delimiter)),
    bundleId: 'com.itavero.tortie'
  };
}

describe('composeShimContent', () => {
  const content = composeShimContent('com.itavero.tortie');

  it('starts with the sh shebang and carries the ownership marker', () => {
    expect(content.startsWith('#!/bin/sh\n')).toBe(true);
    expect(content).toContain(SHIM_MARKER);
  });

  it('execs open -n -b with the bundle id, never a hardcoded app path', () => {
    expect(content).toContain(
      'exec /usr/bin/open -n -b com.itavero.tortie --args "$abs"'
    );
    expect(content).not.toContain('/Applications/');
  });

  it('refuses every dash argument before anything else runs', () => {
    // The case arm sits above the exec line, and the shim run below proves
    // it exits 64 without reaching open.
    expect(content.indexOf('-*)')).toBeLessThan(content.indexOf('exec '));
  });
});

describe('the shim script, run with /bin/sh', () => {
  const dir = join(root, 'run');
  mkdirSync(dir);
  const shim = join(dir, SHIM_NAME);
  writeFileSync(shim, composeShimContent('com.itavero.tortie'), 'utf8');
  chmodSync(shim, 0o755);

  it('exits 64 with the usage pair for a dash argument', () => {
    const run = spawnSync('/bin/sh', [shim, '--agent'], { encoding: 'utf8' });
    expect(run.status).toBe(64);
    expect(run.stderr).toContain('usage: tortie [folder]');
    expect(run.stderr).toContain(
      'tortie opens one folder as a project tab in Tortie. It accepts no flags.'
    );
  });

  it('exits 1 naming a folder that does not exist', () => {
    const run = spawnSync('/bin/sh', [shim, join(dir, 'gone')], {
      encoding: 'utf8'
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('is not a folder that exists');
  });

  it('says out loud when extra arguments are ignored', () => {
    // The first argument does not exist, so the run still exits 1 before
    // the exec line — but the extra-arguments warning has already printed.
    const run = spawnSync('/bin/sh', [shim, join(dir, 'gone'), 'x', 'y'], {
      encoding: 'utf8'
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('tortie: extra arguments were ignored: x y');
  });
});

describe('chooseInstallDir', () => {
  it('picks the first candidate that is on PATH and writable', async () => {
    const a = join(root, 'cand-a');
    const b = join(root, 'cand-b');
    mkdirSync(a);
    mkdirSync(b);
    expect(await chooseInstallDir(deps([a, b], [a, b]))).toBe(a);
  });

  it('skips a candidate that is not on PATH', async () => {
    const a = join(root, 'off-path');
    const b = join(root, 'on-path');
    mkdirSync(a);
    mkdirSync(b);
    expect(await chooseInstallDir(deps([a, b], [b]))).toBe(b);
  });

  it('skips a candidate that is not writable', async () => {
    const locked = join(root, 'locked');
    const open = join(root, 'open');
    mkdirSync(locked);
    mkdirSync(open);
    chmodSync(locked, 0o500);
    try {
      expect(await chooseInstallDir(deps([locked, open], [locked, open]))).toBe(
        open
      );
    } finally {
      chmodSync(locked, 0o755);
    }
  });

  it('returns null when no candidate qualifies', async () => {
    expect(await chooseInstallDir(deps([join(root, 'never')], []))).toBeNull();
  });

  it('compares PATH entries with a trailing slash stripped', async () => {
    const c = join(root, 'slashed');
    mkdirSync(c);
    expect(await chooseInstallDir(deps([c], [`${c}/`]))).toBe(c);
  });
});

describe('shimStatus, installShim, removeShim', () => {
  it('walks not-installed, installed (0755, byte-equal), then removed', async () => {
    const dir = join(root, 'life');
    mkdirSync(dir);
    const d = deps([dir], [dir]);
    const target = join(dir, SHIM_NAME);

    expect(await shimStatus(d)).toEqual({ state: 'not-installed', target });

    const installed = await installShim(d);
    expect(installed.state).toBe('installed');
    expect(installed.target).toBe(target);
    expect(readFileSync(target, 'utf8')).toBe(
      composeShimContent('com.itavero.tortie')
    );
    expect(statSync(target).mode & 0o777).toBe(0o755);

    const removed = await removeShim(d);
    expect(removed.state).toBe('not-installed');
    expect(() => statSync(target)).toThrow();
  });

  it('reinstalling over our own shim is allowed and stays 0755', async () => {
    const dir = join(root, 'reinstall');
    mkdirSync(dir);
    const d = deps([dir], [dir]);
    await installShim(d);
    chmodSync(join(dir, SHIM_NAME), 0o644);
    const again = await installShim(d);
    expect(again.state).toBe('installed');
    expect(statSync(join(dir, SHIM_NAME)).mode & 0o777).toBe(0o755);
  });

  it('reports a marker-less file as foreign and refuses to remove it', async () => {
    const dir = join(root, 'foreign');
    mkdirSync(dir);
    const d = deps([dir], [dir]);
    const target = join(dir, SHIM_NAME);
    writeFileSync(target, '#!/bin/sh\necho not ours\n', 'utf8');

    const status = await shimStatus(d);
    expect(status.state).toBe('foreign');

    await expect(removeShim(d)).rejects.toThrow(
      `The file at ${target} was not installed by Tortie, so it was left alone.`
    );
    expect(readFileSync(target, 'utf8')).toContain('not ours');
  });

  it('refuses to install over a foreign file', async () => {
    const dir = join(root, 'foreign-install');
    mkdirSync(dir);
    const d = deps([dir], [dir]);
    writeFileSync(join(dir, SHIM_NAME), 'echo taken\n', 'utf8');
    await expect(installShim(d)).rejects.toThrow(
      'Tortie will not replace it or remove it'
    );
  });

  it('reports unavailable (null target) when no directory qualifies', async () => {
    const d = deps([join(root, 'absent')], []);
    expect(await shimStatus(d)).toEqual({ state: 'unavailable', target: null });
    await expect(installShim(d)).rejects.toThrow(
      'The command cannot be installed.'
    );
    expect(await removeShim(d)).toEqual({ state: 'unavailable', target: null });
  });

  it('rejects a failed write with the drafted sentence', async () => {
    const dir = join(root, 'write-fail');
    mkdirSync(dir);
    const d = deps([dir], [dir]);
    // The target name is taken by a DIRECTORY, which carries no marker, so
    // install refuses it as foreign — the earlier, safer refusal.
    mkdirSync(join(dir, SHIM_NAME));
    await expect(installShim(d)).rejects.toThrow(
      'Tortie will not replace it or remove it'
    );
  });
});
