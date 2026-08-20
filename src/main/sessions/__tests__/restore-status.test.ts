/**
 * The two decisions Phase 19 moved out of `restoreSession` and
 * `snapshotAllSessions` so they could be pinned (items 6 and 4).
 *
 * Both were previously inline in methods that need a booted core, a live tmux
 * server and a manifest, which is why neither had ever been tested and why
 * both were wrong. The rest of each path is behaviour the fault harness and
 * the smoke runs already drive.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SESSION_STATUSES } from '@shared/types';
import type { RestoreResultKind, SessionRestore } from '@shared/types';
import { restoreRecordOf, type RestoreOutcome } from '../../restore/restore';
import type { TmuxSessionInfo } from '../../tmux';
import {
  restoredStatus,
  snapshotFailureNotice,
  type UnwrittenSnapshot
} from '../core';

/** Every kind a restore can end in. Kept as a list so the loops below are total. */
const ALL_KINDS: readonly RestoreResultKind[] = [
  'failed',
  'interrupted',
  'shell_only',
  'transcript',
  'armed'
];

function result(
  kind: RestoreResultKind,
  extra: Partial<SessionRestore> = {}
): SessionRestore {
  return { kind, at: 1_700_000_000_000, ...extra };
}

describe('restoredStatus — item 6', () => {
  it('never returns running, for any restore result', () => {
    for (const kind of ALL_KINDS) {
      expect(restoredStatus(result(kind))).not.toBe('running');
    }
  });

  it('never returns running when both stages failed', () => {
    const both = result('shell_only', {
      replayFailure: 'send-keys: no such pane',
      armFailure: 'send-keys: no such pane'
    });
    expect(restoredStatus(both)).toBe('idle');
  });

  it('leaves a restore that created nothing on restorable', () => {
    expect(restoredStatus(result('failed', { stage: 'create' }))).toBe(
      'restorable'
    );
    expect(restoredStatus(result('interrupted'))).toBe('restorable');
  });

  it('gives a live pane the honest liveness, which is idle', () => {
    expect(restoredStatus(result('shell_only'))).toBe('idle');
    expect(restoredStatus(result('transcript'))).toBe('idle');
    expect(restoredStatus(result('armed'))).toBe('idle');
  });

  it('only ever answers with a real member of the status alphabet', () => {
    for (const kind of ALL_KINDS) {
      expect(SESSION_STATUSES).toContain(restoredStatus(result(kind)));
    }
  });
});

describe('the two halves of item 6, joined', () => {
  const info: TmuxSessionInfo = {
    sessionId: '$7',
    tmuxName: 'zz-probe',
    createdAt: 1_700_000_000_000,
    attached: false,
    windows: 1
  };

  /** One outcome per arm of the union restoreSessionInTmux really returns. */
  const outcomes: RestoreOutcome[] = [
    {
      kind: 'failed',
      stage: 'preflight',
      reason: 'that folder is gone',
      error: new Error('that folder is gone')
    },
    {
      kind: 'failed',
      stage: 'create',
      reason: 'tmux new-session failed',
      error: new Error('tmux new-session failed')
    },
    { kind: 'shell_only', info },
    {
      kind: 'shell_only',
      info,
      replayFailure: 'send-keys: no such pane',
      armFailure: 'send-keys: no such pane'
    },
    { kind: 'transcript', info },
    { kind: 'transcript', info, armFailure: 'send-keys: no such pane' },
    { kind: 'armed', info, armedCommand: 'claude --resume abc' }
  ];

  it('never stores running, for any outcome restore.ts can return', () => {
    for (const outcome of outcomes) {
      const stored = restoredStatus(restoreRecordOf(outcome));
      expect({ kind: outcome.kind, stored }).toEqual({
        kind: outcome.kind,
        stored: outcome.kind === 'failed' ? 'restorable' : 'idle'
      });
    }
  });
});

describe('restoreSession, read as source', () => {
  const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', 'core.ts');

  function restoreSessionBody(): string {
    const src = readFileSync(CORE, 'utf8');
    // Phase 116 moved the body behind the admission gate.
    const start = src.indexOf('async restoreSessionAdmitted(');
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('\n  private reportRestoreStages', start);
    expect(end).toBeGreaterThan(start);
    return src.slice(start, end);
  }

  it('has no status literal left in it at all', () => {
    // The defect was one line: `status: 'running'`. Pinning the absence of
    // every literal, rather than that one word, is what stops the next edit
    // reintroducing it under a different name.
    expect(restoreSessionBody()).not.toMatch(/status: '[a-z_]+'/);
  });

  it('takes the status it stores from restoredStatus', () => {
    const body = restoreSessionBody();
    expect(body).toMatch(/const status = restoredStatus\(/);
    expect(body).toMatch(/status,/);
  });
});

describe('snapshotFailureNotice — item 4', () => {
  const full = (name: string): UnwrittenSnapshot => ({
    name,
    outOfSpace: true
  });
  const other = (name: string): UnwrittenSnapshot => ({
    name,
    outOfSpace: false
  });

  it('says nothing when the pass wrote everything', () => {
    expect(snapshotFailureNotice([])).toBeNull();
  });

  it('sends ONE notice for a pass that failed for forty three sessions', () => {
    const pass = Array.from({ length: 43 }, (_, i) => full(`session-${i}`));
    const notice = snapshotFailureNotice(pass);
    expect(notice).toEqual({
      kind: 'snapshot-failed',
      sessions: 43,
      outOfSpace: true
    });
  });

  it('claims a full volume only when a failure said so', () => {
    expect(snapshotFailureNotice([other('a')])?.outOfSpace).toBe(false);
    expect(snapshotFailureNotice([full('a')])?.outOfSpace).toBe(true);
    // One out-of-space failure in the pass is enough: the disk is full even
    // if another session failed for its own reason.
    expect(snapshotFailureNotice([other('a'), full('b')])?.outOfSpace).toBe(
      true
    );
  });

  it('carries a count and no names, because the renderer shows neither', () => {
    const notice = snapshotFailureNotice([full('secret-project'), full('b')]);
    expect(JSON.stringify(notice)).not.toContain('secret-project');
    expect(notice?.sessions).toBe(2);
  });
});
