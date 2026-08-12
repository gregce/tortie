/**
 * Re-arming a captured session whose SpecStory binary is gone
 * (Phase 15.1 fix 2, src/main/restore/restore.ts).
 *
 * A captured session's `resume_argv` starts with the ABSOLUTE path of the
 * specstory binary it launched under. That path is a promise gmux cannot
 * keep: renaming the app (Phase 16.5) invalidates it for every captured row
 * at once, and a `git clean` removes the dev copy under build/vendor.
 * Measured, the armed line then answers "No such file or directory" and exits
 * 127 — the user presses Enter on their restored session and the conversation
 * does not come back.
 *
 * These tests pin the ladder: recorded argv when the bin is there, a re-wrap
 * under today's binary when it is not, and the bare agent resume when there is
 * no SpecStory at all — never a command that cannot run.
 *
 * tmux and snapshots are mocked (this is about the decision), and only
 * `resolveSpecstory` is stubbed inside the specstory module: the wrap composer
 * under test is the real one.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ManifestSessionRecord } from '../../manifest';

/** Every `send-keys` the restore issues, so the armed text is readable. */
const sent: string[][] = [];

vi.mock('../../tmux', async () => {
  const errors =
    await vi.importActual<typeof import('../../tmux/errors')>('../../tmux/errors');
  return {
    ...errors,
    createSession: () =>
      Promise.resolve({
        sessionId: '$77',
        tmuxName: 'zz-rearm-test',
        cwd: '/tmp',
        panePid: 1234
      }),
    execTmux: (args: string[]) => {
      sent.push([...args]);
      return Promise.resolve('');
    },
    managedPaneEnv: () => ({})
  };
});

vi.mock('../snapshots', () => ({ existingSnapshotPath: () => null }));

/** What `resolveSpecstory()` answers for the case under test. */
let resolved: string | null = null;

vi.mock('../../specstory', async (importActual) => {
  const actual = await importActual<typeof import('../../specstory')>();
  return {
    ...actual,
    resolveSpecstory: () =>
      Promise.resolve({
        active:
          resolved === null
            ? null
            : { path: resolved, version: '2.8.0', source: 'installed' as const },
        bundled: null,
        installed: null
      })
  };
});

const { restoreSessionInTmux } = await import('../restore');
const { specstoryQuoteArgv } = await import('../../specstory/wrap');

let root = '';
/** A file that exists and is executable — a plausible specstory. */
function fakeBin(name: string): string {
  const p = join(root, name);
  writeFileSync(p, '#!/bin/sh\nexit 0\n');
  chmodSync(p, 0o755);
  return p;
}

const RESUME_INNER = ['claude', '--resume', 'abc-123'];

function rec(bin: string): ManifestSessionRecord {
  return {
    id: 'sess-1',
    name: 'captured-1',
    tmuxName: 'captured-1',
    projectPath: root,
    cwd: root,
    agent: 'claude',
    status: 'restorable',
    createdAt: 1,
    lastSeen: 2,
    argv: [bin, 'run', 'claude', '--no-version-check', '--silent', '-c', 'claude'],
    resumeArgv: [
      bin,
      'run',
      'claude',
      '--no-version-check',
      '--silent',
      '-c',
      specstoryQuoteArgv(RESUME_INNER)
    ],
    specstory: {
      enabled: true,
      bin,
      binVersion: '2.8.0',
      provider: 'claude',
      exitCodeFidelity: 'exact',
      agentArgv: ['claude']
    }
  };
}

/** The text typed into the pane WITHOUT Enter — the armed resume command. */
function armedText(): string {
  const typed = sent.filter((a) => a[0] === 'send-keys' && a.includes('-l'));
  return typed[typed.length - 1]?.at(-1) ?? '';
}

beforeEach(() => {
  sent.length = 0;
  resolved = null;
  root = mkdtempSync(join(tmpdir(), 'gmux-rearm-'));
});

describe('restore of a captured session', () => {
  it('arms the recorded argv verbatim while its binary is still there', async () => {
    const bin = fakeBin('specstory');
    const out = await restoreSessionInTmux(rec(bin));
    expect(out.armedCommand).toContain(bin);
    expect(armedText()).toContain(`${bin} run claude`);
  });

  it('re-wraps under today’s binary when the recorded one is gone', async () => {
    const dead = join(root, 'Applications', 'gmux.app', 'specstory');
    resolved = fakeBin('specstory-new');
    const out = await restoreSessionInTmux(rec(dead));
    expect(out.armedCommand).not.toContain(dead);
    expect(out.armedCommand).toContain(`${resolved} run claude`);
    // The conversation id still rides inside the -c string: a re-wrap that
    // lost it would restore a session that resumes nothing.
    expect(out.armedCommand).toContain('abc-123');
  });

  // ---------------------------------------------------------------------
  // Phase 16.5 hazard 4, stated as its own case rather than inferred from
  // the one above. The RENAME is not "a missing binary" in general: it is the
  // exact shape old-bundle-gone / new-bundle-present, it hits EVERY captured
  // row on the same launch, and the new path differs from the old one only in
  // the app-name component — which is precisely the substring a careless
  // re-resolution could match and keep.
  // ---------------------------------------------------------------------
  it('heals the RENAME: /Applications/gmux.app is gone, Tortie.app is there', async () => {
    const oldBundleBin = join(
      root,
      'Applications',
      'gmux.app',
      'Contents',
      'Resources',
      'bin',
      'specstory'
    );
    // The same binary, at the path the renamed bundle resolves to.
    resolved = fakeBin('specstory'); // stands in for Tortie.app/…/bin/specstory

    const out = await restoreSessionInTmux(rec(oldBundleBin));

    // No trace of the dead bundle anywhere in the armed line…
    expect(out.armedCommand).not.toContain('gmux.app');
    expect(out.armedCommand).not.toContain(oldBundleBin);
    // …it runs the resolvable copy…
    expect(out.armedCommand).toContain(`${resolved} run claude`);
    // …capture is still on (still a `run … -c` wrap, not a bare agent)…
    expect(out.armedCommand).toContain(' -c ');
    // …and the conversation id survived the re-wrap, which is the only thing
    // the user actually cares about.
    expect(out.armedCommand).toContain('abc-123');
    expect(armedText()).toContain('abc-123');
  });

  it('falls back to the bare agent resume when there is no SpecStory at all', async () => {
    const dead = join(root, 'Applications', 'gmux.app', 'specstory');
    resolved = null;
    const out = await restoreSessionInTmux(rec(dead));
    expect(out.armedCommand).toBe('claude --resume abc-123');
    expect(out.armedCommand).not.toContain('specstory');
  });
});
