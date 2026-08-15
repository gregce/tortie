/**
 * Phase 35. The Copy diagnostics text (research 42 §14).
 *
 * The bundle goes on the clipboard, so the user reads every byte before it
 * goes anywhere. Two things must hold for that to be true: the dump inventory
 * is names, sizes and dates and NEVER dump bytes, and the freshly built half
 * is redacted the same way the file on disk already is.
 */

import { describe, expect, it } from 'vitest';
import { buildDiagnosticsText, DIAGNOSTICS_TAIL_LINES } from '../diagnostics';
import type { BootEnvRaw } from '../snapshot';

const HOME = '/Users/gdc';

const ENV: BootEnvRaw = {
  appVersion: '0.20.2',
  electronVersion: '43.3.0',
  packaged: true,
  osVersion: '15.7.9',
  arch: 'arm64',
  translated: false,
  cpuCount: 12,
  memTotalBytes: 51539607552,
  displays: [{ w: 1512, h: 982, scale: 2, internal: true }],
  locale: 'en-US',
  tmuxVersion: 'tmux 3.6a',
  tmuxSocket: 'gmux',
  pathEntries: 37
};

describe('buildDiagnosticsText', () => {
  it('carries the three sections in order', () => {
    const text = buildDiagnosticsText({
      generatedAt: '2026-08-15T17:31:06.123Z',
      env: ENV,
      logTail: [],
      dumps: [],
      level: 'info',
      fileLoggingOn: true,
      homeDir: HOME
    });
    expect(text.indexOf('[boot]')).toBeGreaterThan(-1);
    expect(text.indexOf('[boot]')).toBeLessThan(text.indexOf('[log tail'));
    expect(text.indexOf('[log tail')).toBeLessThan(text.indexOf('[crash dumps]'));
  });

  it('writes the boot section exactly as the spec drafts it', () => {
    const text = buildDiagnosticsText({
      generatedAt: '2026-08-15T17:31:06.123Z',
      env: ENV,
      logTail: [],
      dumps: [],
      level: 'info',
      fileLoggingOn: true,
      homeDir: HOME
    });
    expect(text).toContain(
      'Tortie diagnostics, generated 2026-08-15T17:31:06.123Z'
    );
    expect(text).toContain('Tortie 0.20.2, Electron 43.3.0, packaged true');
    expect(text).toContain('macOS 15.7.9, arm64, 12 cores, 48.0 GiB');
    expect(text).toContain('display 1512x982 at 2x, internal');
    expect(text).toContain('tmux 3.6a, socket gmux');
    expect(text).toContain('PATH entries 37');
    expect(text).toContain('log level info, file logging on');
  });

  it('says tmux is missing rather than printing a blank version', () => {
    const text = buildDiagnosticsText({
      generatedAt: 't',
      env: { ...ENV, tmuxVersion: null },
      logTail: [],
      dumps: [],
      level: 'debug',
      fileLoggingOn: false,
      homeDir: HOME
    });
    expect(text).toContain('tmux not found, socket gmux');
    expect(text).toContain('log level debug, file logging off');
  });

  it('lists dumps as names, sizes and dates, and never a byte of a dump', () => {
    const text = buildDiagnosticsText({
      generatedAt: 't',
      env: ENV,
      logTail: [],
      dumps: [
        {
          name: '7f3a.dmp',
          bytes: 1067472,
          mtimeMs: new Date('2026-08-14T15:02:00').getTime(),
          path: '/Users/gdc/Library/Application Support/Tortie/Crashpad/pending/7f3a.dmp'
        }
      ],
      level: 'info',
      fileLoggingOn: true,
      homeDir: HOME
    });
    expect(text).toContain('7f3a.dmp  1067472 bytes  2026-08-14 15:02');
    // The absolute path is a field of the inventory, not of the report.
    expect(text).not.toContain('Crashpad/pending');
  });

  it('says "none" rather than showing an empty section', () => {
    const text = buildDiagnosticsText({
      generatedAt: 't',
      env: ENV,
      logTail: [],
      dumps: [],
      level: 'info',
      fileLoggingOn: true,
      homeDir: HOME
    });
    expect(text).toContain('[crash dumps]\nnone');
  });

  it('carries the log tail as written, because it is already redacted on disk', () => {
    const tail = ['{"ts":"t","level":"info","scope":"boot","msg":"boot"}'];
    const text = buildDiagnosticsText({
      generatedAt: 't',
      env: ENV,
      logTail: tail,
      dumps: [],
      level: 'info',
      fileLoggingOn: true,
      homeDir: HOME
    });
    expect(text).toContain(tail[0] as string);
    expect(text).toContain(`[log tail, last ${DIAGNOSTICS_TAIL_LINES} lines of app.log]`);
    expect(DIAGNOSTICS_TAIL_LINES).toBe(200);
  });

  it('redacts the home directory out of the freshly built half', () => {
    const text = buildDiagnosticsText({
      generatedAt: 't',
      env: ENV,
      logTail: [],
      dumps: [
        {
          name: '/Users/gdc/odd-name.dmp',
          bytes: 1,
          mtimeMs: Date.now(),
          path: '/Users/gdc/x'
        }
      ],
      level: 'info',
      fileLoggingOn: true,
      homeDir: HOME
    });
    expect(text).not.toContain('/Users/gdc');
    expect(text).toContain('~/odd-name.dmp');
  });
});
