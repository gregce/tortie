/**
 * Phase 35. The envelope and the three record schemas, field by field
 * against research 42 §9.
 *
 * These are the shapes every jq expression in the phase depends on. A field
 * that quietly renames turns `jq 'select(.event=="process.gone")'` into a
 * query that returns nothing and reads as "it never happened", which is the
 * exact failure the phase exists to end.
 */

import { describe, expect, it } from 'vitest';
import { buildLogLine } from '../format';
import { buildBootEnvFields } from '../snapshot';

const HOME = '/Users/gdc';

/** Parse the line back, which is what a reader does. */
function parse(line: string): Record<string, unknown> {
  return JSON.parse(line) as Record<string, unknown>;
}

describe('the envelope', () => {
  it('has the six fixed fields, in order, on every line', () => {
    const line = buildLogLine({
      ts: '2026-08-14T17:31:06.123Z',
      level: 'info',
      scope: 'boot',
      pid: 66979,
      proctype: 'main',
      msg: 'hello',
      homeDir: HOME
    });
    expect(line).toBe(
      '{"ts":"2026-08-14T17:31:06.123Z","level":"info","scope":"boot",' +
        '"pid":66979,"proctype":"main","msg":"hello"}'
    );
  });

  it('is exactly one line, with no newline of its own', () => {
    const line = buildLogLine({
      ts: '2026-08-14T17:31:06.123Z',
      level: 'warn',
      scope: 'proc',
      pid: 1,
      proctype: 'renderer',
      msg: 'first\nsecond',
      homeDir: HOME
    });
    expect(line.includes('\n')).toBe(false);
    expect(parse(line)['msg']).toBe('first\nsecond');
  });

  it('adds event only on a typed record, and nothing on free text', () => {
    const free = parse(
      buildLogLine({
        ts: 't',
        level: 'info',
        scope: 'updates',
        pid: 1,
        proctype: 'main',
        msg: 'staged',
        homeDir: HOME
      })
    );
    expect(Object.keys(free)).toEqual([
      'ts',
      'level',
      'scope',
      'pid',
      'proctype',
      'msg'
    ]);
  });

  it('redacts msg and every nested field before the line exists', () => {
    const record = parse(
      buildLogLine({
        ts: 't',
        level: 'error',
        scope: 'manifest',
        pid: 1,
        proctype: 'main',
        msg: 'the database at /Users/gdc/gmux/manifest.db is damaged',
        fields: {
          path: '/Users/gdc/gmux/manifest.db',
          recovery: { to: ['/Users/gdc/quarantine/manifest.db'] }
        },
        homeDir: HOME
      })
    );
    expect(record['msg']).toBe('the database at ~/gmux/manifest.db is damaged');
    expect(record['path']).toBe('~/gmux/manifest.db');
    expect(record['recovery']).toEqual({ to: ['~/quarantine/manifest.db'] });
  });

  it('never lets a field overwrite an envelope name', () => {
    const record = parse(
      buildLogLine({
        ts: 'real',
        level: 'info',
        scope: 'proc',
        pid: 1,
        proctype: 'main',
        msg: 'real message',
        fields: { ts: 'fake', level: 'fake', msg: 'fake', pid: 999 },
        homeDir: HOME
      })
    );
    expect(record['ts']).toBe('real');
    expect(record['level']).toBe('info');
    expect(record['msg']).toBe('real message');
    expect(record['pid']).toBe(1);
  });
});

describe('the boot.env record', () => {
  const fields = buildBootEnvFields({
    appVersion: '0.19.1',
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
  });

  it('is the research 42 §9 shape, field for field', () => {
    expect(fields).toEqual({
      app: { version: '0.19.1', electron: '43.3.0', packaged: true },
      os: {
        version: '15.7.9',
        arch: 'arm64',
        translated: false,
        cpus: 12,
        memTotalBytes: 51539607552
      },
      displays: [{ w: 1512, h: 982, scale: 2, internal: true }],
      locale: 'en-US',
      tmux: { version: 'tmux 3.6a', socket: 'gmux' },
      path: { entries: 37 }
    });
  });

  it('stores the PATH entry COUNT and never the values', () => {
    const json = JSON.stringify(fields);
    expect(json).toContain('"entries":37');
    expect(json).not.toContain('/usr/bin');
    expect(json).not.toContain('/Users/');
  });

  it('writes one line under 2 KB', () => {
    const line = buildLogLine({
      ts: '2026-08-14T17:31:06.123Z',
      level: 'info',
      scope: 'boot',
      pid: 66979,
      proctype: 'main',
      msg: 'boot',
      event: 'boot.env',
      fields,
      homeDir: HOME
    });
    expect(Buffer.byteLength(line, 'utf8')).toBeLessThan(2048);
    const record = parse(line);
    expect(record['event']).toBe('boot.env');
    expect(record['msg']).toBe('boot');
  });

  it('says tmux is missing with null rather than guessing a version', () => {
    const none = buildBootEnvFields({
      appVersion: '0.19.1',
      electronVersion: '43.3.0',
      packaged: false,
      osVersion: '15.7.9',
      arch: 'arm64',
      translated: false,
      cpuCount: 12,
      memTotalBytes: 1,
      displays: [],
      locale: 'en-US',
      tmuxVersion: null,
      tmuxSocket: null,
      pathEntries: 0
    });
    expect(none['tmux']).toEqual({ version: null, socket: null });
  });
});

describe('the process.gone record', () => {
  it('is the research 42 §9 shape for the 2026-08-14 GPU death', () => {
    const record = parse(
      buildLogLine({
        ts: '2026-08-14T17:31:06.123Z',
        level: 'warn',
        scope: 'proc',
        pid: 66979,
        proctype: 'main',
        msg: 'helper process gone',
        event: 'process.gone',
        fields: {
          kind: 'child',
          ptype: 'GPU',
          reason: 'crashed',
          exitCode: 8704,
          realCode: 34,
          name: 'GPU'
        },
        homeDir: HOME
      })
    );
    expect(record).toEqual({
      ts: '2026-08-14T17:31:06.123Z',
      level: 'warn',
      scope: 'proc',
      pid: 66979,
      proctype: 'main',
      event: 'process.gone',
      msg: 'helper process gone',
      kind: 'child',
      ptype: 'GPU',
      reason: 'crashed',
      exitCode: 8704,
      realCode: 34,
      name: 'GPU'
    });
  });
});

describe('the boot.unclean_exit record', () => {
  it('is the research 42 §9 shape, prev and dumps included', () => {
    const record = parse(
      buildLogLine({
        ts: '2026-08-14T18:00:00.000Z',
        level: 'warn',
        scope: 'boot',
        pid: 70001,
        proctype: 'main',
        msg: 'previous run did not exit cleanly',
        event: 'boot.unclean_exit',
        fields: {
          prev: {
            pid: 66979,
            version: '0.19.1',
            bootTs: '2026-08-14T13:40:02.000Z'
          },
          dumps: { newCount: 1, names: ['7f3a.dmp'], bytes: 1067472 }
        },
        homeDir: HOME
      })
    );
    expect(record['event']).toBe('boot.unclean_exit');
    expect(record['msg']).toBe('previous run did not exit cleanly');
    expect(record['prev']).toEqual({
      pid: 66979,
      version: '0.19.1',
      bootTs: '2026-08-14T13:40:02.000Z'
    });
    expect(record['dumps']).toEqual({
      newCount: 1,
      names: ['7f3a.dmp'],
      bytes: 1067472
    });
  });

  it('carries a zero count when the process died with no dump', () => {
    const record = parse(
      buildLogLine({
        ts: 't',
        level: 'warn',
        scope: 'boot',
        pid: 2,
        proctype: 'main',
        msg: 'previous run did not exit cleanly',
        event: 'boot.unclean_exit',
        fields: {
          prev: { pid: 1, version: '0.20.2', bootTs: 't0' },
          dumps: { newCount: 0, names: [], bytes: 0 }
        },
        homeDir: HOME
      })
    );
    expect(record['dumps']).toEqual({ newCount: 0, names: [], bytes: 0 });
  });
});
