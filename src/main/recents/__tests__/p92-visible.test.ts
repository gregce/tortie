/**
 * Which recent rows a person may see, and what the native menu says about them
 * (Phase 92).
 *
 * Four properties are pinned here. A row naming a machine that is no longer in
 * the machines file is absent from BOTH surfaces, and the two surfaces are
 * proven to agree by reading them in the same test rather than by inspection. A
 * remote row's sublabel and tooltip never rewrite a path to `~`, because the
 * tilde here would be this Mac's home directory. A remote row's click carries
 * the machine as well as the path. A local row is byte for byte what it was.
 *
 * Nothing here starts a process, opens a socket or reads a machines file. The
 * machines module is replaced with a plain object, which is exactly the surface
 * ./visible.ts reads.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MenuItemConstructorOptions } from 'electron';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData }
}));

/** The machines file, as a plain array this test writes directly. */
let machineRows: { id: string; label?: string }[] = [];

vi.mock('../../machines/store', () => ({
  currentMachines: () => ({ rows: machineRows }),
  machineLabelOf: (row: { id: string; label?: string }) => row.label ?? row.id,
  onMachinesChanged: () => () => undefined
}));

const { rememberProject, resetRecentsCacheForTests } = await import('../store');
const { knownMachineIds, recentMachineLabel, visibleRecents } = await import(
  '../visible'
);
const { openRecentActionId, openRecentMenuItem } = await import(
  '../open-recent-menu'
);

/** The home directory of whoever is running the test, so `~` is real here. */
const HOME = homedir();

function remember(path: string, name: string, machineId?: string): void {
  rememberProject(
    machineId === undefined
      ? { id: path, path, name }
      : { id: `${machineId}:${path}`, path, name, machineId }
  );
}

/** The submenu rows, without the separator and without Clear Menu. */
function menuRows(): MenuItemConstructorOptions[] {
  const item = openRecentMenuItem({
    open: () => undefined,
    clear: () => undefined
  });
  const submenu = item.submenu as MenuItemConstructorOptions[];
  return submenu.filter(
    (row) => row.type !== 'separator' && row.label !== 'Clear Menu'
  );
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-p92-visible-'));
  machineRows = [{ id: 'mac-pro', label: 'Mac Pro' }];
  resetRecentsCacheForTests();
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

describe('a row whose machine has been forgotten', () => {
  it('is absent from the list and from the native menu, and both agree', () => {
    remember('/Users/gdc/here', 'here');
    remember('/srv/there', 'there', 'mac-pro');
    remember('/srv/nowhere', 'nowhere', 'gone');

    expect(visibleRecents().map((r) => r.path)).toEqual([
      '/srv/there',
      '/Users/gdc/here'
    ]);
    // The same set, read through the other surface, in the same order.
    expect(menuRows().map((row) => row.toolTip)).toEqual([
      '/srv/there on Mac Pro',
      '/Users/gdc/here'
    ]);
  });

  it('comes back when the machine is added again with the same id', () => {
    remember('/srv/nowhere', 'nowhere', 'gone');
    expect(visibleRecents()).toHaveLength(0);
    machineRows = [{ id: 'gone', label: 'The Other Mac' }];
    expect(visibleRecents().map((r) => r.path)).toEqual(['/srv/nowhere']);
  });

  it('reports the machine ids that are in the file, and a label only for those', () => {
    expect([...knownMachineIds()]).toEqual(['mac-pro']);
    expect(recentMachineLabel('mac-pro')).toBe('Mac Pro');
    expect(recentMachineLabel('gone')).toBeNull();
  });
});

describe('what the native menu says about a remote row', () => {
  it('never rewrites another machine\'s path to a tilde', () => {
    // A path under THIS Mac's home directory, on another machine. The parent is
    // the exact string that machine states, because `~` here would stand for
    // this Mac's account on this Mac.
    const path = join(HOME, 'dev', 'webapp');
    remember(path, 'webapp', 'mac-pro');
    const row = menuRows()[0];
    expect(row?.sublabel).toBe(`${join(HOME, 'dev')} on Mac Pro`);
    expect(row?.toolTip).toBe(`${path} on Mac Pro`);
    expect(String(row?.sublabel)).not.toContain('~');
    expect(String(row?.toolTip)).not.toContain('~');
  });

  it('still shortens a folder on this Mac', () => {
    const path = join(HOME, 'dev', 'webapp');
    remember(path, 'webapp');
    const row = menuRows()[0];
    expect(row?.sublabel).toBe('~/dev');
    expect(row?.toolTip).toBe(path);
  });
});

describe('what a click on a menu row sends', () => {
  it('carries the machine for a remote row and nothing extra for a local one', () => {
    remember('/Users/gdc/here', 'here');
    remember('/srv/there', 'there', 'mac-pro');
    const sent: string[] = [];
    const item = openRecentMenuItem({
      open: (path, machineId) => sent.push(openRecentActionId(path, machineId)),
      clear: () => undefined
    });
    const submenu = item.submenu as MenuItemConstructorOptions[];
    for (const row of submenu) {
      if (row.type === 'separator' || row.label === 'Clear Menu') continue;
      row.click?.(
        undefined as never,
        undefined as never,
        undefined as never
      );
    }
    expect(sent).toEqual([
      'open-recent-on:mac-pro:/srv/there',
      'open-recent:/Users/gdc/here'
    ]);
  });

  it('composes an id a person could not confuse with the other family', () => {
    const remote = openRecentActionId('/srv/there', 'mac-pro');
    expect(remote.startsWith('open-recent:')).toBe(false);
    expect(openRecentActionId('/srv/there').startsWith('open-recent-on:')).toBe(
      false
    );
  });
});
