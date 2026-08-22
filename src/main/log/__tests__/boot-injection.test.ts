/**
 * Phase 123. The boot sequence takes its environment collector as an
 * argument, and this module no longer imports the collector itself.
 *
 * The reason is the dependency graph rather than the behaviour. `./snapshot`
 * probes tmux with `tmux -V`, so it imports `../tmux/resolve` and
 * `../tmux/supervisor`. Every one of those files logs through this module.
 * That single import at the top of `./index.ts` therefore closed a runtime
 * cycle of eighteen main-process modules covering logging, tmux, machines,
 * config and the manifest's remote executions table. Injecting the collector
 * the way `postNotice` was already injected removes all eighteen from the
 * cycle and changes nothing a person can see.
 *
 * Two things are held here. The sequence calls the function it was handed,
 * and the fields that reach the boot.env record are that function's, so a
 * later round cannot quietly go back to a module import and keep the tests
 * green. The second test reads this module's own source, because an import
 * that is never called still creates the edge the cycle was made of.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readRunSentinel } from '../sentinel';

let userData = '';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: (name: string) =>
      name === 'userData' ? userData : join(userData, name),
    getVersion: () => '0.58.3',
    on: () => undefined
  },
  ipcMain: {
    removeAllListeners: () => undefined,
    removeHandler: () => undefined
  }
}));

/** The lines the wrapper hands to electron-log, in order. */
const written: string[] = [];

vi.mock('electron-log/main', () => {
  const push = (line: unknown) => {
    written.push(String(line));
  };
  return {
    default: {
      transports: {
        file: { level: 'info' as unknown },
        ipc: { level: 'silly' as unknown },
        remote: { level: 'silly' as unknown }
      },
      error: push,
      warn: push,
      info: push,
      debug: push
    }
  };
});

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'gmux-log-inject-'));
  mkdirSync(join(userData, 'logs'), { recursive: true });
  mkdirSync(join(userData, 'crashDumps'), { recursive: true });
  written.length = 0;
  process.env['GMUX_LOG_FILE'] = '1';
});

afterEach(() => {
  delete process.env['GMUX_LOG_FILE'];
  rmSync(userData, { recursive: true, force: true });
});

/**
 * Run the sequence with one collector and wait for its detached boot.env
 * write. The write is detached on purpose, so it needs one turn to land.
 */
async function bootWith(
  collectBootEnv: () => Promise<Record<string, unknown>>
): Promise<void> {
  const { initLogging, runLogBootSequence } = await import('../index');
  initLogging();
  runLogBootSequence({ postNotice: () => true, collectBootEnv });
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** The typed records the run wrote, parsed back the way a reader reads them. */
function records(): Record<string, unknown>[] {
  return written.map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe('runLogBootSequence takes its environment collector as an argument', () => {
  it('calls the injected collector exactly once', async () => {
    const collectBootEnv = vi.fn(async () => ({ appVersion: '0.58.3' }));

    await bootWith(collectBootEnv);

    expect(collectBootEnv).toHaveBeenCalledTimes(1);
  });

  it("writes the injected collector's own fields into boot.env", async () => {
    // A value no real collector produces, so a module import cannot fake it.
    await bootWith(async () => ({ tmuxVersion: 'tmux 9.9-injected' }));

    const bootEnv = records().find((r) => r['event'] === 'boot.env');
    expect(bootEnv).toBeDefined();
    expect(bootEnv?.['tmuxVersion']).toBe('tmux 9.9-injected');
  });

  it('still runs the rest of the sequence when the collector rejects', async () => {
    await bootWith(async () => {
      throw new Error('the tmux probe timed out');
    });

    // The sentinel is armed before the detached snapshot, so it is on disk
    // whatever the collector did. A missing snapshot is a missing line.
    expect(readRunSentinel(join(userData, 'logs'))).not.toBeNull();
    expect(records().map((r) => r['event'])).not.toContain('boot.env');
  });
});

describe('src/main/log/index.ts does not import ./snapshot at runtime', () => {
  it('has no value import, side-effect import or re-export of ./snapshot', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '..', 'index.ts'), 'utf8');
    // Every import or export statement that names ./snapshot. `[^;]` keeps
    // one match inside one statement, so a multi-line brace list is caught
    // whole and the statement above it is not swept in with it.
    const named =
      source.match(/^(?:import|export)[^;]*?from '\.\/snapshot';$/gm) ?? [];
    const sideEffect = source.match(/^import '\.\/snapshot';$/gm) ?? [];
    // A type-only line stays allowed, because TypeScript erases it and it
    // makes no edge. A value import, a side-effect import or a re-export is
    // the edge the cycle was made of, so none of those may come back.
    const runtime = [
      ...named.filter((line) => !/^(?:import|export) type /.test(line)),
      ...sideEffect
    ];
    expect(runtime).toEqual([]);
    expect(source.includes("import('./snapshot')")).toBe(false);
  });
});
