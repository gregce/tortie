/**
 * A shell session launches as a login shell (Phase 74, GitHub issue 8).
 *
 * The reporter's shell is /bin/zsh and the Tortie pane also started /bin/zsh,
 * so the binary was never the difference. Tortie started it without `-l`, so
 * `~/.zprofile` never ran, the completion search path that file sets was never
 * set, and zsh printed "_eza: function definition file not found" while
 * completing a path and then found no matches for a directory that exists.
 *
 * Two things are asserted here and both are load bearing.
 *
 *  1. The flag sits at index 1, directly after the binary. `zsh -l -c 'cmd'`
 *     runs the command as a login shell, and `zsh -c 'cmd' -l` hands `-l` to
 *     the command as an argument instead. The smoke harnesses create shell
 *     sessions with `-c`, so an appended flag would change what those panes
 *     run.
 *  2. No agent gets the flag. Phase 33 rejected a login shell for agent
 *     launches because it re-runs agent writable rc code, and the shell branch
 *     is the only place this build adds it.
 */

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// buildLaunchSpec reaches the configuration store, which reaches Electron's
// userData. Nothing in these cases reads a configured row.
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp/tortie-login-shell-test' }
}));

const { buildLaunchSpec } = await import('../agents');
const { LOGIN_SHELL_FLAG, withLoginShellFlag } = await import('../login-shell');

describe('buildLaunchSpec gives a shell session the login flag', () => {
  it('a plain shell is [shell, -l]', () => {
    const spec = buildLaunchSpec('shell', [], '/bin/zsh');
    expect(spec.argv).toEqual(['/bin/zsh', LOGIN_SHELL_FLAG]);
  });

  it('the flag precedes -c, because zsh -c would swallow it', () => {
    const spec = buildLaunchSpec('shell', ['-c', 'echo hi'], '/bin/zsh');
    expect(spec.argv).toEqual(['/bin/zsh', '-l', '-c', 'echo hi']);
  });

  it('a person who typed -l themselves gets one flag, not two', () => {
    const spec = buildLaunchSpec('shell', ['-l'], '/bin/zsh');
    expect(spec.argv).toEqual(['/bin/zsh', '-l']);
  });

  it('a shell session still captures no conversation id', () => {
    expect(buildLaunchSpec('shell', [], '/bin/zsh').idCapture).toBe('none');
  });
});

describe('no agent gets the login flag, which is the Phase 33 gate', () => {
  it('claude launches with the argv it always launched with', () => {
    const spec = buildLaunchSpec('claude', [], '/usr/local/bin/claude');
    expect(spec.argv).not.toContain(LOGIN_SHELL_FLAG);
    expect(spec.argv[0]).toBe('/usr/local/bin/claude');
  });
});

describe('withLoginShellFlag', () => {
  it('an empty argv comes back empty rather than throwing', () => {
    expect(withLoginShellFlag([])).toEqual([]);
  });

  it('puts the flag at index 1 and moves nothing else', () => {
    expect(withLoginShellFlag(['/bin/bash', '--norc', '-c', 'date'])).toEqual([
      '/bin/bash',
      '-l',
      '--norc',
      '-c',
      'date'
    ]);
  });

  it('returns a copy, so the array it was given is not rewritten', () => {
    const input = ['/bin/zsh'];
    const out = withLoginShellFlag(input);
    expect(input).toEqual(['/bin/zsh']);
    expect(out).not.toBe(input);
  });

  // The whole reason ../login-shell.ts exists rather than living in ../agents.ts
  // is that src/main/restore/restore.ts imports it, and Phase 23's rule says the
  // restore path may never reach src/main/config/ by any route.
  // src/main/config/__tests__/boundary.test.ts walks restore.ts transitively and
  // would catch a breach. This says the same thing at the source, so a person
  // adding an import here reads why before the other file fails.
  it('the module it lives in imports nothing, which is what keeps restore clean', () => {
    const file = join(__dirname, '..', 'login-shell.ts');
    const text = readFileSync(file, 'utf8');
    expect(text).not.toMatch(/^\s*import\b/m);
    expect(text).not.toMatch(/^\s*export\s+.*\bfrom\b/m);
  });
});
