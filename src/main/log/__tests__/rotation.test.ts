/**
 * Phase 35. The rotation, proved against the SHIPPING configuration.
 *
 * The spike in the phase's first hour established that electron-log 5.4.4's
 * format function can emit our prebuilt JSON line byte for byte and that the
 * archive function can replace the default `.old` rename with the Phase 31
 * `.1` convention. This test is that spike made permanent: it hands
 * `configureFileTransport` (the exact function src/main/log/index.ts calls)
 * an electron-log transport, fills the file past the cap, and reads the pair
 * back off disk.
 *
 * electron-log/node is used rather than electron-log/main, so the test needs
 * no Electron process. It is the same file transport either way.
 */

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import log from 'electron-log/node';
import {
  archiveAppLog,
  configureFileTransport,
  LOG_FILE_NAME,
  LOG_MAX_BYTES,
  makeWriteFailureShim,
  type FileTransportLike
} from '../transport';

let dir = '';

/** Give the file transport its (synchronous) write queue a moment to drain. */
async function settle(): Promise<void> {
  await new Promise((r) => setTimeout(r, 60));
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-log-rotation-'));
});

afterEach(() => {
  log.transports.file.level = false;
  rmSync(dir, { recursive: true, force: true });
});

const appLog = (): string => join(dir, LOG_FILE_NAME);
const archived = (): string => join(dir, `${LOG_FILE_NAME}.1`);

describe('the shipping file transport configuration', () => {
  it('pins the 2 MiB cap the footprint budget is built on', () => {
    // 2 MiB plus a 2 MiB app.log.1 is 4 MiB of the 13 MB ceiling.
    expect(LOG_MAX_BYTES).toBe(2_097_152);
    expect(LOG_FILE_NAME).toBe('app.log');
  });

  it('writes the prebuilt JSON line byte for byte, one line per message', async () => {
    configureFileTransport(
      log.transports.file as unknown as FileTransportLike,
      dir,
      'info'
    );
    const line = JSON.stringify({
      ts: '2026-08-14T17:31:06.123Z',
      level: 'info',
      scope: 'boot',
      pid: 66979,
      proctype: 'main',
      msg: 'boot'
    });
    // A message with printf shapes in it, because the transform chain ends in
    // util.formatWithOptions and a naive format function would eat them.
    const tricky = JSON.stringify({
      ts: 't',
      level: 'warn',
      scope: 'proc',
      pid: 1,
      proctype: 'main',
      msg: '100%s done %d %j'
    });
    log.info(line);
    log.warn(tricky);
    await settle();

    const raw = readFileSync(appLog(), 'utf8');
    expect(raw).toBe(`${line}\n${tricky}\n`);
  });

  it('rotates over the cap and keeps the pair bounded', async () => {
    configureFileTransport(
      log.transports.file as unknown as FileTransportLike,
      dir,
      'info'
    );
    // A small cap, so the test writes kilobytes rather than megabytes. The
    // rotation MECHANISM is what is under test; LOG_MAX_BYTES is pinned above.
    (log.transports.file as unknown as FileTransportLike).maxSize = 4096;

    const fill = (tag: string, n: number): string =>
      JSON.stringify({
        ts: 't',
        level: 'info',
        scope: tag,
        pid: 1,
        proctype: 'main',
        msg: 'x'.repeat(200),
        n
      });

    for (let i = 0; i < 60; i += 1) log.info(fill('first', i));
    await settle();
    expect(existsSync(archived())).toBe(true);
    expect(statSync(archived()).size).toBeLessThanOrEqual(4096 + 400);
    expect(readFileSync(archived(), 'utf8')).toContain('"scope":"first"');

    // A second overflow REPLACES the archive. The pair is the whole retention
    // policy, so no app.log.2 may ever appear.
    for (let i = 0; i < 60; i += 1) log.info(fill('second', i));
    await settle();
    expect(existsSync(join(dir, `${LOG_FILE_NAME}.2`))).toBe(false);
    expect(readFileSync(archived(), 'utf8')).toContain('"scope":"second"');
    expect(statSync(appLog()).size).toBeLessThanOrEqual(4096 + 400);
  });

  it('keeps the file closed when the level is false (dev with no GMUX_LOG_FILE)', async () => {
    configureFileTransport(
      log.transports.file as unknown as FileTransportLike,
      dir,
      false
    );
    log.info(JSON.stringify({ msg: 'nothing should reach disk' }));
    await settle();
    expect(existsSync(appLog())).toBe(false);
  });
});

describe('archiveAppLog', () => {
  it('renames app.log to app.log.1, replacing any previous one', () => {
    writeFileSync(archived(), 'old archive', 'utf8');
    writeFileSync(appLog(), 'fresh content', 'utf8');
    archiveAppLog(appLog());
    expect(existsSync(appLog())).toBe(false);
    expect(readFileSync(archived(), 'utf8')).toBe('fresh content');
  });
});

/**
 * Phase 35. The one console warning per run on a failed write.
 *
 * This is the exact updates/log.ts rule, and it is load bearing in both
 * directions. A broken disk must not stop the app, and it must not turn one
 * broken disk into a screen of noise either. electron-log's file transport
 * reports a write failure by calling `logger.transports.console(...)`
 * directly, bypassing the level filter, which is why the shim sits there
 * with `level: false`.
 */
describe('makeWriteFailureShim', () => {
  it('calls its handler exactly once, however many writes fail', () => {
    let calls = 0;
    const shim = makeWriteFailureShim(() => {
      calls += 1;
    });
    shim({ data: ['first failure'] });
    shim({ data: ['second failure'] });
    shim({ data: ['third failure'] });
    expect(calls).toBe(1);
  });

  it('is level false, so no ordinary message reaches it', () => {
    // Logger.js checks `transFn.level === false` before anything else, so
    // every normal line goes to the wrapper's own console writers instead.
    expect(makeWriteFailureShim(() => undefined).level).toBe(false);
  });

  it('fires when the real file transport cannot write', async () => {
    let warned = 0;
    (log.transports as unknown as Record<string, unknown>)['console'] =
      makeWriteFailureShim(() => {
        warned += 1;
      });
    // A path whose parent is a FILE, so mkdir and the write both refuse.
    const blocker = join(dir, 'blocked');
    writeFileSync(blocker, 'i am a file, not a directory', 'utf8');
    configureFileTransport(
      log.transports.file as unknown as FileTransportLike,
      join(blocker, 'nested'),
      'info'
    );
    log.info(JSON.stringify({ msg: 'this write cannot land' }));
    log.info(JSON.stringify({ msg: 'and neither can this one' }));
    await settle();
    expect(warned).toBe(1);
  });
});
