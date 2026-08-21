/**
 * The durable capture flip is written once, and only for a decline that was
 * honoured (Phase 119, src/main/sessions/core.ts).
 *
 * WHAT THE FLIP IS. A restore asked for with `{ withoutCapture: true }` arms
 * the bare agent command, and the core then writes `specstory.enabled = false`
 * and the bare resume argv onto the row. It has to be durable rather than one
 * shot: the harvest re-wraps the resume argv from `rec.specstory` on every id
 * it lands, so a one shot decline would be undone by the next harvest and the
 * person would have to decline again on every restore.
 *
 * WHAT COULD GO WRONG, and it is why this file exists. A flip written on a
 * restore that failed would turn a person's history saving off for something
 * that never happened. A flip written on a decline that could not be honoured
 * would do the same while the wrapper was still in the recorded command.
 *
 * TWO INSTRUMENTS, because the property has two halves.
 *
 * The first half is the FIELD, and it is measured functionally against the
 * real composer: `captureDeclined` is the only thing the flip is written on,
 * so no arm may set it except the honoured decline. tmux and snapshots are
 * mocked, which is the same instrument capture-rearm.test.ts uses and for the
 * same reason.
 *
 * The second half is the PLACEMENT, and it is a source-shape test, the
 * instrument end-restore-order.test.ts already uses for this file.
 * `restoreSession` needs a live tmux server, an attach host and a control
 * client, so driving it here would prove the mocks rather than the ordering.
 * The behavioural proof is the phase's Tier 3 evidence,
 * `npm run smoke:restore:bare`, which measures the row after a real declined
 * restore of a real captured session.
 */

import { readFileSync } from 'node:fs';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManifestSessionRecord } from '../../manifest';

// --- the functional half ----------------------------------------------------

vi.mock('../../tmux', async () => {
  const errors =
    await vi.importActual<typeof import('../../tmux/errors')>('../../tmux/errors');
  return {
    ...errors,
    installUserPath: () => Promise.resolve(process.env['PATH'] ?? ''),
    createSession: () =>
      Promise.resolve({
        sessionId: '$91',
        tmuxName: 'zz-p119-flip',
        cwd: '/tmp',
        panePid: 4321
      }),
    execTmux: () => Promise.resolve(''),
    managedPaneEnv: () => ({})
  };
});

vi.mock('../../restore/snapshots', () => ({ resolveSnapshot: () => null }));

vi.mock('../../specstory', async (importActual) => {
  const actual = await importActual<typeof import('../../specstory')>();
  return {
    ...actual,
    // A resolvable copy is always available here. Every case below that ends
    // with no flip must end that way for its own reason, not because the
    // machine happened to have no SpecStory on it.
    resolveSpecstory: () =>
      Promise.resolve({
        active: { path: '/opt/specstory-new', version: '2.10.0', source: 'installed' as const },
        bundled: null,
        installed: null
      })
  };
});

const { restoreSessionInTmux } = await import('../../restore/restore');
const { specstoryQuoteArgv } = await import('../../specstory/wrap');

let root = '';

/** A file that exists and is executable, which is a plausible specstory. */
function fakeBin(name: string): string {
  const p = join(root, name);
  writeFileSync(p, '#!/bin/sh\nexit 0\n');
  chmodSync(p, 0o755);
  return p;
}

const INNER = ['claude', '--resume', 'flip-1'];

function captured(bin: string, resumeArgv?: string[]): ManifestSessionRecord {
  return {
    id: 'flip-session',
    name: 'flip',
    tmuxName: 'flip',
    projectPath: root,
    cwd: root,
    agent: 'claude',
    status: 'restorable',
    createdAt: 1,
    lastSeen: 2,
    argv: [bin, 'run', 'claude', '-c', 'claude'],
    resumeArgv: resumeArgv ?? [
      bin,
      'run',
      'claude',
      '--no-version-check',
      '--silent',
      '-c',
      specstoryQuoteArgv(INNER)
    ],
    specstory: {
      enabled: true,
      bin,
      binVersion: '2.10.0',
      provider: 'claude',
      exitCodeFidelity: 'exact',
      agentArgv: ['claude']
    }
  };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-p119-flip-'));
});

describe('the field the flip is written on', () => {
  it('is set when the decline was honoured', async () => {
    const out = await restoreSessionInTmux(captured(fakeBin('specstory')), {
      withoutCapture: true
    });
    expect(out.kind).toBe('armed');
    expect(out.kind !== 'failed' && out.captureDeclined).toBe(true);
  });

  it('is absent on the ordinary restore of the same row', async () => {
    const out = await restoreSessionInTmux(captured(fakeBin('specstory')));
    expect(out.kind !== 'failed' && out.captureDeclined).toBeUndefined();
  });

  it('is absent when the recorded binary is gone and Tortie re-wraps', async () => {
    const out = await restoreSessionInTmux(captured(join(root, 'gone', 'specstory')));
    // A heal is Tortie's own repair. Turning the person's capture setting off
    // for it would take a decision nobody made.
    expect(out.kind !== 'failed' && out.captureDeclined).toBeUndefined();
  });

  it('is absent when the decline could not be honoured', async () => {
    const bin = fakeBin('specstory');
    // `-c` is the last word, so there is no command string after it to split.
    const out = await restoreSessionInTmux(
      captured(bin, [bin, 'run', 'claude', '--silent', '-c']),
      { withoutCapture: true }
    );
    if (out.kind === 'failed' || out.kind === 'armed') {
      throw new Error(`expected an unarmed restore, got ${out.kind}`);
    }
    expect(out.captureDeclined).toBeUndefined();
    expect(out.armFailure).toContain('could not separate');
  });
});

// --- the placement half -----------------------------------------------------

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', 'core.ts');
const src = readFileSync(CORE, 'utf8');

/** The body of one method, from its declaration to `end`. */
function body(decl: string, end: string): string {
  const start = src.indexOf(decl);
  expect(start, `found ${decl}`).toBeGreaterThan(-1);
  const stop = src.indexOf(end, start);
  expect(stop, `found ${end} after ${decl}`).toBeGreaterThan(start);
  return src.slice(start, stop);
}

describe('where the flip is written', () => {
  const restore = body(
    'private async restoreSessionAdmitted(',
    'private reportRestoreStages('
  );

  it('is written exactly once in the whole method', () => {
    const writes = restore.split('outcome.captureDeclined === true').length - 1;
    expect(writes).toBe(1);
  });

  it('reads the outcome field and nothing else as its condition', () => {
    expect(restore).toContain(
      'if (outcome.captureDeclined === true && rec.specstory !== undefined)'
    );
    expect(restore).toContain('enabled: false');
    expect(restore).toContain("resumeArgv: unwrapArgv(rec.resumeArgv ?? [])");
  });

  it('sits after the failed arm throws, so a failed restore cannot reach it', () => {
    const failedThrow = restore.indexOf('throw outcome.error;');
    const flip = restore.indexOf('outcome.captureDeclined === true');
    expect(failedThrow).toBeGreaterThan(-1);
    expect(flip).toBeGreaterThan(failedThrow);
  });

  it('sits before the one durable restore commit', () => {
    const flip = restore.indexOf('outcome.captureDeclined === true');
    const commit = restore.indexOf('this.manifest.setRestoreResult(');
    expect(commit).toBeGreaterThan(-1);
    expect(flip).toBeLessThan(commit);
  });

  it('leaves the remote branch with no capture choice to make', () => {
    const remote = restore.slice(0, restore.indexOf('refuseRemoteRestore(sessionId);\n    const rec'));
    expect(remote).not.toContain('withoutCapture');
    expect(remote).not.toContain('captureDeclined');
  });
});
