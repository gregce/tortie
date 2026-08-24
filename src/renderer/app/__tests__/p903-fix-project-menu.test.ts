/**
 * The + at the end of the tab strip offers the SAME verbs the File menu does
 * (Phase 90.3 fix round).
 *
 * Phase 90.3 put Open Folder on a Machine… in the File menu and not in the +
 * menu, so File offered four verbs and the + offered three, and the menu bar
 * was the only route to a folder on another machine. The two lists are a
 * contract between two surfaces and nothing but a test holds them together:
 * File is built in main from ids, because main owns the accelerators and the
 * renderer is not running when the menu is first installed.
 *
 * The two conditions are the ones the File menu already applies. The preload
 * has to carry `projects:addRemote`, and at least one machine has to be
 * confirmed, because a row that opens a sheet with an empty list spends a
 * person a click to learn nothing.
 */

import { describe, expect, it, vi } from 'vitest';
import type { MachineLink, MachineStateView } from '@shared/ipc';
import type { MenuItemSpec } from '../../state/store';

// The environment is node and nothing here renders. The module graph reaches
// the app store, which reads `window` while zustand builds its initial state,
// so the three globals are installed before the imports.
vi.stubGlobal('window', {
  innerWidth: 1440,
  addEventListener() {},
  removeEventListener() {}
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

vi.mock('../../state/clone', () => ({ cloneAction: () => undefined }));

const { projectMenuItems } = await import('../project-menu');

/** The labels of a menu, with any separator dropped. */
function labelsOf(items: readonly (MenuItemSpec | 'sep')[]): string[] {
  return items
    .filter((one): one is MenuItemSpec => one !== 'sep')
    .map((one) => one.label);
}
const { OPEN_REMOTE_FOLDER_MENU_ITEM } = await import('../../machines/project-tab');
const { useApp } = await import('../../state/store');

function machine(link: MachineLink): MachineStateView {
  return {
    id: 'studio',
    label: 'Studio',
    color: 'orange',
    link,
    everAnswered: link === 'connected',
    lastAnsweredAt: null,
    detail: null
  };
}

/** The store as the two conditions read it. */
function set(over: {
  bridge: boolean;
  machines: MachineStateView[];
}): void {
  useApp.setState({
    machineStates: over.machines,
    canAddRemoteProject: () => over.bridge,
    setRemoteProjectOpen: () => {}
  } as never);
}

describe('the + menu and the File menu offer the same verbs', () => {
  it('offers the fourth verb when the bridge is there and a machine is confirmed', () => {
    set({ bridge: true, machines: [machine('quiet')] });
    const labels = labelsOf(projectMenuItems(true));
    expect(labels).toContain(OPEN_REMOTE_FOLDER_MENU_ITEM);
  });

  it('offers it for a machine that is quiet, because quiet is confirmed', () => {
    // A confirmed machine that is asleep is still a machine a person can open a
    // folder on. Only `refused` means nobody confirmed it.
    for (const link of ['connected', 'polling', 'connecting', 'quiet'] as const) {
      set({ bridge: true, machines: [machine(link)] });
      expect(labelsOf(projectMenuItems(true))).toContain(
        OPEN_REMOTE_FOLDER_MENU_ITEM
      );
    }
  });

  it('hides it when no machine is confirmed', () => {
    set({ bridge: true, machines: [machine('refused')] });
    expect(labelsOf(projectMenuItems(true))).not.toContain(
      OPEN_REMOTE_FOLDER_MENU_ITEM
    );
    set({ bridge: true, machines: [] });
    expect(labelsOf(projectMenuItems(true))).not.toContain(
      OPEN_REMOTE_FOLDER_MENU_ITEM
    );
  });

  it('hides it on a preload with no projects:addRemote', () => {
    set({ bridge: false, machines: [machine('connected')] });
    expect(labelsOf(projectMenuItems(true))).not.toContain(
      OPEN_REMOTE_FOLDER_MENU_ITEM
    );
  });

  it('puts it after the two verbs that reach this Mac', () => {
    set({ bridge: true, machines: [machine('connected')] });
    const labels = labelsOf(projectMenuItems(true));
    expect(labels).toEqual([
      'Open Project…',
      'New Project…',
      OPEN_REMOTE_FOLDER_MENU_ITEM
    ]);
  });
});
