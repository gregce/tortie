/**
 * Phase 115 — what a captured session's death may say, and what its sync
 * outcome handler may never do.
 *
 * THIS TEST READS THE SOURCE AS TEXT, the shape capture-refusal-wiring.test.ts
 * already uses for a rule that lives in source order. The two rules here are
 * about what one statement contains, and a mock that proved either one would
 * be proving the mock.
 *
 * Pin 1. The reapDeadSession warn names the process the death describes.
 * tmux execs argv[0], and wrapArgv puts the specstory binary there, so for a
 * captured session the reaped process was specstory and the agent ran inside
 * it. The warn line must say so, read from rec.specstory, and only when the
 * capture was enabled.
 *
 * Pin 2. The closure passed to new SyncQueue writes no manifest field on any
 * arm. The death report (status, exitCode, exitSignal, exitDetail) is written
 * by reapDeadSession, and the sync flush that follows it can fail. A failed
 * flush that wrote to the manifest could overwrite the primary death reason
 * with a secondary one. The pin asserts the ABSENCE of updateSession in the
 * handler, not the presence of the toast, because the toast is a courtesy and
 * the absence is the safety property.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(import.meta.dirname, '../core.ts'),
  'utf8'
);

describe('the session death warn names the wrapper (Phase 115)', () => {
  // The whole warn statement: from its marker string to the line that
  // follows the call in reapDeadSession.
  const start = source.indexOf('session death:');
  const end = source.indexOf('this.activity.forget', start);
  const warn = source.slice(start, end);

  it('the warn statement exists where reapDeadSession writes it', () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
  });

  it('carries the wrapper field, read from rec.specstory', () => {
    expect(warn).toContain('wrapper=specstory@');
    expect(warn).toContain('rec.specstory');
  });

  it('adds the field only when the capture was enabled', () => {
    // An uncaptured session's line must not gain an empty or false field.
    expect(warn).toContain("rec.specstory?.enabled === true");
  });

  it('states the version, with ? standing in when it is unknown', () => {
    expect(warn).toContain("rec.specstory.binVersion ?? '?'");
  });
});

describe('the sync outcome handler writes no manifest field (Phase 115)', () => {
  // The closure runs from the constructor call to the class-property close
  // at two-space indent. The broadcast inside it closes at four spaces, so
  // the two-space form is the closure's own.
  const start = source.indexOf('new SyncQueue(');
  const end = source.indexOf('\n  });', start);
  const handler = source.slice(start, end);

  it('the handler exists and the slice covers all of it', () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    // The failure broadcast is the LAST statement of the handler, so a slice
    // that holds it held everything before it too. Without this anchor an
    // accidental short slice would pass the absence check below vacuously.
    expect(handler).toContain('broadcast(EVT_CAPTURE_NOTICE');
    expect(handler).toContain("kind: 'sync-failed'");
  });

  it('has exactly one SyncQueue construction to pin', () => {
    expect(source.split('new SyncQueue(').length - 1).toBe(1);
  });

  it('never calls updateSession on any arm', () => {
    // The death report is written by reapDeadSession. A sync outcome that
    // wrote to the manifest could overwrite that report when the flush
    // fails, so no arm of the handler may write any manifest field.
    expect(handler).not.toContain('updateSession');
  });
});
