/**
 * Phase 31 unit tests for the refusal check's pure pieces.
 *
 * `parseShipItAbort` is fed the VERBATIM lines from the operator's machine
 * (docs/research/42-shipit-instance-counting.md), because those lines are
 * the incident this module answers. The noise lines and the "Installation
 * cancelled" line that follow the abort line must not hide it, a stale
 * abort must read as unknown, and the NSLog timestamp must parse as local
 * time.
 */

import { describe, expect, it, vi } from 'vitest';

// refusal-check imports ./log and ./state, both of which import electron.
vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/unused-in-these-tests',
    getVersion: () => '0.19.0',
    isPackaged: false
  },
  BrowserWindow: class {}
}));

import { parseShipItAbort, shipItCacheDir } from '../refusal-check';

// The verbatim lines from the operator machine, 2026-08-14. The timestamps
// are local time as NSLog writes them, so the expected epoch value is
// computed the same way the parser computes it, keeping the test honest in
// any timezone.
const ABORT_LINE =
  '2026-08-14 15:16:49.024 ShipIt[86893:81560110] Aborting update attempt because there are 1 running instances of the target app';
const ABORT_AT = new Date('2026-08-14T15:16:49.024').getTime();

const OPERATOR_TAIL = [
  '2026-08-14 15:16:16.702 ShipIt[86893:81533290] Beginning installation',
  'ERROR: Unrecognized attribute string flag',
  'ERROR: Unrecognized attribute string flag',
  ABORT_LINE,
  '2026-08-14 15:16:49.029 ShipIt[86893:81560110] Installation cancelled: Error Domain=SQRLInstallerErrorDomain Code=-9 "App Still Running Error" UserInfo={NSLocalizedDescription=App Still Running Error}'
].join('\n');

describe('parseShipItAbort', () => {
  it('finds the operator abort behind the cancelled line and the noise', () => {
    // The pending record predates the abort, as it did in the incident.
    const decision = parseShipItAbort(OPERATOR_TAIL, ABORT_AT - 5 * 60_000);
    expect(decision.reason).toBe('another-copy');
    expect(decision.line).toBe(ABORT_LINE);
  });

  it('reads a stale abort as unknown', () => {
    // The pending record is 10 minutes NEWER than the abort, so the abort
    // belongs to some earlier incident and proves nothing about this one.
    const decision = parseShipItAbort(OPERATOR_TAIL, ABORT_AT + 10 * 60_000);
    expect(decision.reason).toBe('unknown');
    expect(decision.line).toBe(ABORT_LINE);
  });

  it('applies the 60 second slop in the recency comparison', () => {
    expect(parseShipItAbort(OPERATOR_TAIL, ABORT_AT + 59_000).reason).toBe(
      'another-copy'
    );
    expect(parseShipItAbort(OPERATOR_TAIL, ABORT_AT + 61_000).reason).toBe(
      'unknown'
    );
  });

  it('parses the NSLog timestamp as local time', () => {
    // Exactly at the recorded moment counts, which only holds when the
    // parser and this test agree the timestamp is local.
    expect(parseShipItAbort(OPERATOR_TAIL, ABORT_AT).reason).toBe(
      'another-copy'
    );
  });

  it('matches nothing in noise lines alone', () => {
    const tail = [
      'ERROR: Unrecognized attribute string flag',
      '2026-08-14 15:16:16.702 ShipIt[86893:81533290] Beginning installation'
    ].join('\n');
    const decision = parseShipItAbort(tail, ABORT_AT);
    expect(decision.reason).toBe('unknown');
    expect(decision.line).toBe(null);
  });

  it('matches nothing in an empty tail', () => {
    expect(parseShipItAbort('', Date.now())).toEqual({
      reason: 'unknown',
      line: null
    });
  });

  it('uses the NEWEST abort line when there are several', () => {
    const staleAbort =
      '2026-08-13 09:00:00.000 ShipIt[11111:2222] Aborting update attempt because there are 2 running instances of the target app';
    const tail = [staleAbort, ABORT_LINE].join('\n');
    const decision = parseShipItAbort(tail, ABORT_AT - 60_000);
    expect(decision.reason).toBe('another-copy');
    expect(decision.line).toBe(ABORT_LINE);
  });

  it('does not match a line whose shape merely resembles the abort', () => {
    const tail =
      'note: Aborting update attempt because there are 1 running instances of the target app maybe';
    expect(parseShipItAbort(tail, 0).line).toBe(null);
  });
});

describe('shipItCacheDir', () => {
  it('derives the directory the way Squirrel does, from the job label', () => {
    expect(shipItCacheDir('/Users/gdc', 'com.itavero.tortie')).toBe(
      '/Users/gdc/Library/Caches/com.itavero.tortie.ShipIt'
    );
  });
});
