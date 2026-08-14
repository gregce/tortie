/**
 * The end path saves before it kills, and the restore gate accepts an ended
 * row (Phase 26.3).
 *
 * These are SOURCE-SHAPE tests, the same instrument boot-refresh-guard.test.ts
 * already uses, and for the same reason: killSession and restoreSession need a
 * live tmux server, an attach host and a control client, so exercising them
 * functionally here would prove the mocks. The properties that matter are a
 * few lines of ordering and gating, and they are pinned cheaply. The
 * behavioural half is covered elsewhere:
 *  - that a capture's durable write returns only after the bytes and their
 *    record are on disk is pinned functionally in
 *    src/main/restore/__tests__/snapshots.test.ts;
 *  - that a real end followed by a real restore replays the scrollback and
 *    arms the resume is the phase's Tier 3 live-drive evidence, not a unit
 *    test.
 *
 * What is pinned:
 *  1. In killSession, the awaited capture comes BEFORE tmux.killSession. The
 *     confirm copy promises "saved first", and this order is that promise.
 *  2. The end-time capture failure is not swallowed: it posts through the
 *     notice channel with the session's name and the at-end marker.
 *  3. reapDeadSession keeps the same capture-then-kill order for natural
 *     deaths.
 *  4. restoreSession no longer refuses 'exited'; the gate lets 'restorable',
 *     'exited' and — since Phase 29 — 'discarded' through and no-ops every
 *     live status.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

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

describe('killSession (manual end)', () => {
  const kill = body('async killSession(', 'discardSession(');

  it('captures the snapshot before tmux.killSession, and awaits it', () => {
    const capture = kill.indexOf('await captureSessionSnapshot(');
    const killCall = kill.indexOf('await tmux.killSession(');
    expect(capture).toBeGreaterThan(-1);
    expect(killCall).toBeGreaterThan(-1);
    expect(capture).toBeLessThan(killCall);
  });

  it('reports a failed end-time capture instead of swallowing it', () => {
    expect(kill).not.toContain('.catch(() => undefined)');
    expect(kill).toContain('postDurabilityNotice');
    expect(kill).toContain('atSessionEnd: true');
    expect(kill).toContain('sessionName: rec.name');
  });

  it('preserves the row as exited rather than deleting it', () => {
    expect(kill).toContain("this.manifest.setStatus(sessionId, 'exited')");
    expect(kill).not.toContain('deleteSession');
  });
});

describe('reapDeadSession (natural death)', () => {
  it('keeps the same capture-then-kill order', () => {
    const reap = body('private async reapDeadSession(', 'queueCaptureSync(');
    const capture = reap.indexOf('await captureSessionSnapshot(');
    const killCall = reap.indexOf('await tmux.killSession(');
    expect(capture).toBeGreaterThan(-1);
    expect(killCall).toBeGreaterThan(-1);
    expect(capture).toBeLessThan(killCall);
  });
});

describe('restoreSession gate', () => {
  const restore = body('async restoreSession(', 'restoresInFlight.add(');

  it('lets restorable, exited and discarded rows into the one restore path', () => {
    expect(restore).toContain("rec.status !== 'restorable' &&");
    expect(restore).toContain("rec.status !== 'exited' &&");
    expect(restore).toContain("rec.status !== 'discarded'");
  });

  it('no longer refuses an ended session', () => {
    expect(restore).not.toContain('restart it instead');
    expect(restore).not.toContain('throw gmuxError');
  });
});
