/**
 * Phase 19 item 12 — Tortie must not claim protection it has not observed.
 *
 * Every case here injects the preference reads, so no test touches the real
 * `/Library/Preferences/com.apple.TimeMachine.plist` and no test can be made
 * to pass or fail by the state of the machine it runs on.
 *
 * The headline case is `exit 0 is not evidence`. On the operator's machine
 * `tmutil latestbackup` returned 0, printed nothing to stdout and put
 * "Failed to mount backup destination … Code=19" on stderr. Code that reads
 * the exit code concludes a backup exists. Nothing in this module reads an
 * exit code as evidence, and the tests below hold that line.
 */

import { describe, expect, it } from 'vitest';
import {
  offDeviceReportLines,
  readOffDeviceProtection,
  type OffDeviceProtection
} from '../off-device';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 7, 12, 12, 0, 0); // 2026-08-12T12:00:00Z

/** A plutil xml1 array of dates, exactly the shape `-extract` prints. */
function datesXml(...iso: string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0">',
    '<array>',
    ...iso.map((d) => `\t<date>${d}</date>`),
    '</array>',
    '</plist>',
    ''
  ].join('\n');
}

interface Prefs {
  AutoBackup?: string;
  'Destinations.0.LastKnownVolumeName'?: string;
  'Destinations.0.SnapshotDates'?: string;
}

function run(
  prefs: Prefs,
  dataChanged: Date | null,
  overrides: { platform?: string } = {}
): Promise<OffDeviceProtection> {
  return readOffDeviceProtection({
    platform: overrides.platform ?? 'darwin',
    dataRoot: '/fixture/userData',
    now: () => NOW,
    readPref: async (keyPath) =>
      (prefs as Record<string, string | undefined>)[keyPath] ?? null,
    newestDataChange: async () => dataChanged
  });
}

/** The operator's machine, as measured on 2026-08-12. */
const OPERATOR_PREFS: Prefs = {
  AutoBackup: '0\n',
  'Destinations.0.LastKnownVolumeName': 'time_machine_backups\n',
  'Destinations.0.SnapshotDates': datesXml(
    '2026-04-06T23:05:33Z',
    '2026-04-07T10:55:34Z'
  )
};

describe('readOffDeviceProtection', () => {
  it('reproduces the operator machine: a configured destination and no copy', async () => {
    const r = await run(OPERATOR_PREFS, new Date(Date.UTC(2026, 7, 12, 2, 0)));

    expect(r.state).toBe('none');
    expect(r.latestBackupAt).toBe('2026-04-07T10:55:34.000Z');
    expect(r.automaticBackups).toBe(false);
    expect(r.destinationName).toBe('time_machine_backups');
    // 2026-04-07 to 2026-08-12 is 127 days, the figure research 33 measured.
    expect(r.summary).toContain('127 days old');
    expect(r.summary).toContain('Automatic backups are off.');
    expect(r.summary).toContain('Nothing outside this machine holds a copy');
  });

  it('never says "protected", even when a backup is newer than the data', async () => {
    const r = await run(
      {
        ...OPERATOR_PREFS,
        AutoBackup: '1\n',
        'Destinations.0.SnapshotDates': datesXml('2026-08-12T06:00:00Z')
      },
      new Date(NOW - DAY)
    );

    expect(r.state).toBe('possible');
    expect(r.automaticBackups).toBe(true);
    expect(r.summary).toContain('has not opened that backup');
    expect(r.summary).toContain('cannot');
    // The whole point of the item: no wording anywhere asserts a verified copy.
    expect(r.summary).not.toMatch(/is backed up|is protected|are safe/i);
  });

  it('a configured destination on its own is never read as a backup', async () => {
    // destinationinfo naming a destination is what the earlier premise rested
    // on. With no completed backup it means nothing.
    const r = await run(
      {
        AutoBackup: '1\n',
        'Destinations.0.LastKnownVolumeName': 'time_machine_backups\n'
      },
      new Date(NOW - DAY)
    );

    expect(r.state).toBe('none');
    expect(r.latestBackupAt).toBeNull();
    expect(r.summary).toContain('no backup has ever completed');
  });

  it('an empty snapshot list is "none", not "unknown"', async () => {
    const r = await run(
      { ...OPERATOR_PREFS, 'Destinations.0.SnapshotDates': datesXml() },
      new Date(NOW - DAY)
    );

    expect(r.state).toBe('none');
    expect(r.latestBackupAt).toBeNull();
  });

  it('a backup exactly as old as the newest change does not count as a copy', async () => {
    const at = new Date(NOW - DAY);
    const r = await run(
      {
        ...OPERATOR_PREFS,
        'Destinations.0.SnapshotDates': datesXml(at.toISOString())
      },
      at
    );

    // The boundary goes to "none" on purpose. A backup that started at the
    // same instant as a write has no claim on the bytes that write produced.
    expect(r.state).toBe('none');
  });

  it('degrades to unknown when no preference key answers', async () => {
    const r = await run({}, new Date(NOW - DAY));

    expect(r.state).toBe('unknown');
    expect(r.summary).toContain('does not know');
    expect(r.automaticBackups).toBeNull();
  });

  it('degrades to unknown when the data age cannot be read', async () => {
    const r = await run(OPERATOR_PREFS, null);

    expect(r.state).toBe('unknown');
    expect(r.summary).toContain('did not check');
  });

  it('degrades to unknown off macOS', async () => {
    const r = await run(OPERATOR_PREFS, new Date(NOW - DAY), {
      platform: 'linux'
    });

    expect(r.state).toBe('unknown');
    expect(r.summary).toContain('only knows how to check this on macOS');
    expect(r.evidence).toContain('platform linux');
  });

  it('picks the newest date out of an unordered list', async () => {
    const r = await run(
      {
        ...OPERATOR_PREFS,
        'Destinations.0.SnapshotDates': datesXml(
          '2026-04-07T10:55:34Z',
          '2026-08-11T09:00:00Z',
          '2026-03-01T00:00:00Z'
        )
      },
      new Date(NOW - 3 * DAY)
    );

    expect(r.latestBackupAt).toBe('2026-08-11T09:00:00.000Z');
    expect(r.state).toBe('possible');
  });

  it('ignores a date the plist cannot parse rather than throwing', async () => {
    const r = await run(
      {
        ...OPERATOR_PREFS,
        'Destinations.0.SnapshotDates':
          '<array>\n\t<date>not-a-date</date>\n\t<date>2026-04-07T10:55:34Z</date>\n</array>'
      },
      new Date(NOW - DAY)
    );

    expect(r.latestBackupAt).toBe('2026-04-07T10:55:34.000Z');
  });

  it('records the evidence it read, so the claim can be checked', async () => {
    const r = await run(OPERATOR_PREFS, new Date(Date.UTC(2026, 7, 12, 2, 0)));

    expect(r.evidence).toContain('AutoBackup: 0');
    expect(
      r.evidence.some((e) => e.startsWith('newest recorded backup: 2026-04-07'))
    ).toBe(true);
    expect(
      r.evidence.some((e) => e.includes('configured, not verified'))
    ).toBe(true);
  });
});

describe('offDeviceReportLines', () => {
  it('leads with the state and carries the evidence underneath', async () => {
    const r = await run(OPERATOR_PREFS, new Date(Date.UTC(2026, 7, 12, 2, 0)));
    const lines = offDeviceReportLines(r);

    expect(lines[0]).toMatch(/^off-device: none\./);
    expect(lines.slice(1).every((l) => l.startsWith('  '))).toBe(true);
    expect(lines.join('\n')).toContain('AutoBackup: 0');
  });
});
