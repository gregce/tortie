/**
 * Unit tests for the refusal check's pure reader (Phase 31, widened in
 * Phase 43).
 *
 * `readShipItEvidence` is fed the VERBATIM lines from both of the
 * operator's incidents. 2026-08-14 is the code -9 abort with another copy
 * of the app running (docs/research/42-shipit-instance-counting.md).
 * 2026-08-15 is the code -1 failure with the staged bundle gone, followed by
 * "Too many attempts to install, aborting update"
 * (docs/research/46-updater-wreckage.md).
 *
 * The rules under test:
 *
 * - the noise lines and the "Installation cancelled" line that follow a
 *   cause line must not hide it;
 * - a cause line older than the window reads as unknown, which fails toward
 *   saying less;
 * - the 60 second slop from Phase 31 does not move;
 * - giving up is a consequence, not a cause, so it never becomes the reason
 *   on its own;
 * - the attempt count is read out of the log, never assumed.
 */

import { describe, expect, it, vi } from 'vitest';

// refusal-check imports ./log, ./state, ./shipit-state and ./updater, all
// of which reach electron, and the last of which imports the library.
vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/unused-in-these-tests',
    getVersion: () => '0.19.0',
    isPackaged: false
  },
  BrowserWindow: class {}
}));

vi.mock('electron-updater', () => ({ autoUpdater: {} }));

import { readShipItEvidence } from '../refusal-check';

const NOISE = 'ERROR: Unrecognized attribute string flag';

// ---------------------------------------------------------------------------
// 2026-08-14, another copy of the app was running
// ---------------------------------------------------------------------------

const ABORT_LINE =
  '2026-08-14 15:16:49.024 ShipIt[86893:81560110] Aborting update attempt because there are 1 running instances of the target app';
const ABORT_AT = new Date('2026-08-14T15:16:49.024').getTime();

const ANOTHER_COPY_TAIL = [
  '2026-08-14 15:16:16.702 ShipIt[86893:81533290] Beginning installation',
  NOISE,
  NOISE,
  ABORT_LINE,
  '2026-08-14 15:16:49.029 ShipIt[86893:81560110] Installation cancelled: Error Domain=SQRLInstallerErrorDomain Code=-9 "App Still Running Error" UserInfo={NSLocalizedDescription=App Still Running Error}'
].join('\n');

// ---------------------------------------------------------------------------
// 2026-08-15, the staged copy was gone and the installer gave up
// ---------------------------------------------------------------------------

const COPY_FAILED_LINE =
  '2026-08-15 00:29:38.125 ShipIt[70665:92089787] Installation error: Error Domain=SQRLInstallerErrorDomain Code=-1 ' +
  '"Failed to copy bundle file:///Users/gdc/Library/Caches/com.itavero.tortie.ShipIt/update.KZlg2R9/Tortie.app/ ' +
  'to directory file:///var/folders/xx/com.itavero.tortie.ShipIt.fFsI228X/Tortie.app" ' +
  'UserInfo={NSUnderlyingError=0x600001 {Error Domain=NSCocoaErrorDomain Code=260 ' +
  '"The file “Tortie.app” couldn’t be opened because there is no such file." ' +
  'UserInfo={NSUnderlyingError=0x600002 {Error Domain=NSPOSIXErrorDomain Code=2 "No such file or directory"}}}}';

const GAVE_UP_LINE =
  '2026-08-15 00:29:42.389 ShipIt[72120:92090255] Too many attempts to install, aborting update';
const GAVE_UP_AT = new Date('2026-08-15T00:29:42.389').getTime();

const WRECK_TAIL = [
  '2026-08-15 00:29:19.152 ShipIt[69989:92086352] Detected this as an install request',
  '2026-08-15 00:29:24.761 ShipIt[70665:92087700] Detected this as an install request',
  '2026-08-15 00:29:38.105 ShipIt[70665:92087710] Beginning installation',
  NOISE,
  COPY_FAILED_LINE,
  '2026-08-15 00:29:38.189 ShipIt[71832:92089801] Resuming installation attempt 2',
  COPY_FAILED_LINE.replace('00:29:38.125', '00:29:38.200'),
  '2026-08-15 00:29:40.268 ShipIt[71966:92090057] Resuming installation attempt 3',
  COPY_FAILED_LINE.replace('00:29:38.125', '00:29:40.276'),
  NOISE,
  GAVE_UP_LINE,
  '2026-08-15 00:29:42.394 ShipIt[72120:92090255] ShipIt quitting'
].join('\n');

describe('readShipItEvidence, the 2026-08-14 incident', () => {
  it('finds the abort behind the cancelled line and the noise', () => {
    const evidence = readShipItEvidence(ANOTHER_COPY_TAIL, ABORT_AT - 5 * 60_000);
    expect(evidence.reason).toBe('another-copy');
    expect(evidence.gaveUp).toBe(false);
    expect(evidence.attempts).toBe(null);
    expect(evidence.line).toBe(ABORT_LINE);
  });

  it('reads a stale abort as unknown', () => {
    const evidence = readShipItEvidence(ANOTHER_COPY_TAIL, ABORT_AT + 10 * 60_000);
    expect(evidence.reason).toBe('unknown');
    expect(evidence.line).toBe(null);
  });

  it('applies the 60 second slop in the recency comparison', () => {
    expect(readShipItEvidence(ANOTHER_COPY_TAIL, ABORT_AT + 59_000).reason).toBe(
      'another-copy'
    );
    expect(readShipItEvidence(ANOTHER_COPY_TAIL, ABORT_AT + 61_000).reason).toBe(
      'unknown'
    );
  });

  it('parses the NSLog timestamp as local time', () => {
    expect(readShipItEvidence(ANOTHER_COPY_TAIL, ABORT_AT).reason).toBe(
      'another-copy'
    );
  });

  it('uses the NEWEST cause line when there are several', () => {
    const staleAbort =
      '2026-08-14 15:16:40.000 ShipIt[11111:2222] Aborting update attempt because there are 2 running instances of the target app';
    const tail = [staleAbort, ABORT_LINE].join('\n');
    const evidence = readShipItEvidence(tail, ABORT_AT - 60_000);
    expect(evidence.line).toBe(ABORT_LINE);
  });
});

describe('readShipItEvidence, the 2026-08-15 incident', () => {
  it('names the missing staged copy, the give up and the attempt count', () => {
    const evidence = readShipItEvidence(WRECK_TAIL, GAVE_UP_AT - 5 * 60_000);
    expect(evidence.reason).toBe('staged-bundle-missing');
    expect(evidence.gaveUp).toBe(true);
    expect(evidence.attempts).toBe(3);
    expect(evidence.line).toBe(
      COPY_FAILED_LINE.replace('00:29:38.125', '00:29:40.276')
    );
  });

  it('says nothing at all when the whole incident is older than the window', () => {
    const evidence = readShipItEvidence(WRECK_TAIL, GAVE_UP_AT + 10 * 60_000);
    expect(evidence).toEqual({
      reason: 'unknown',
      gaveUp: false,
      attempts: null,
      line: null
    });
  });

  // The repair keeps the log, and the window reaches 60 seconds back from
  // the pending record. A repair followed at once by a download therefore
  // has the cleared wreck's own lines inside the new promise's window. The
  // mark is what keeps them out.
  it('ignores lines from before the repair mark, even inside the 60 second slop', () => {
    const evidence = readShipItEvidence(
      WRECK_TAIL,
      GAVE_UP_AT + 30_000,
      GAVE_UP_AT + 1_000
    );
    expect(evidence).toEqual({
      reason: 'unknown',
      gaveUp: false,
      attempts: null,
      line: null
    });
  });

  it('still reads a failure that happened after the repair mark', () => {
    const evidence = readShipItEvidence(
      WRECK_TAIL,
      GAVE_UP_AT - 5 * 60_000,
      GAVE_UP_AT - 60_000
    );
    expect(evidence.reason).toBe('staged-bundle-missing');
    expect(evidence.gaveUp).toBe(true);
  });

  it('never makes the give up line the reason on its own', () => {
    const tail = [
      '2026-08-15 00:29:38.105 ShipIt[70665:92087710] Beginning installation',
      GAVE_UP_LINE
    ].join('\n');
    const evidence = readShipItEvidence(tail, GAVE_UP_AT - 60_000);
    expect(evidence.reason).toBe('unknown');
    expect(evidence.gaveUp).toBe(true);
    expect(evidence.line).toBe(null);
  });
});

describe('readShipItEvidence, the empty cases', () => {
  it('matches nothing in noise lines alone', () => {
    const tail = [
      NOISE,
      '2026-08-14 15:16:16.702 ShipIt[86893:81533290] Beginning installation'
    ].join('\n');
    expect(readShipItEvidence(tail, ABORT_AT)).toEqual({
      reason: 'unknown',
      gaveUp: false,
      attempts: null,
      line: null
    });
  });

  it('matches nothing in an empty tail', () => {
    expect(readShipItEvidence('', Date.now())).toEqual({
      reason: 'unknown',
      gaveUp: false,
      attempts: null,
      line: null
    });
  });

  it('does not match a line whose shape merely resembles the abort', () => {
    const tail =
      'note: Aborting update attempt because there are 1 running instances of the target app maybe';
    expect(readShipItEvidence(tail, 0).line).toBe(null);
  });
});
