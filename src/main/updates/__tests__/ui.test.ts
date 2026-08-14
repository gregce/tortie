/**
 * Phase 31 unit tests for the two new dialog surfaces in ui.ts:
 *
 * - the ready moment. A check the user started ends in one ready dialog when
 *   the OS updater finishes staging that exact version, whether the staging
 *   lands while the downloading dialog is still open or after it. A later
 *   staging of a different version shows nothing, and a staging no user
 *   checked for shows nothing at all.
 * - the refusal surface. announceRefusedInstallIfAny shows one warning
 *   dialog whose sentence matches the reason ./refusal-check decided, shows
 *   nothing when there is nothing to say, and never rejects.
 *
 * Every collaborator is mocked at the module seam: electron's dialog, the
 * updater engine, the refusal check and the log. ui.ts holds the arm in
 * module state, so each test imports a fresh copy through resetModules.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

interface DialogCall {
  type?: string;
  message?: string;
  detail?: string;
  buttons?: string[];
}

const seams = vi.hoisted(() => ({
  stagedVersion: null as string | null,
  outcome: { kind: 'downloading', version: '0.19.1' } as unknown,
  stateListeners: [] as Array<() => void>,
  refused: null as {
    version: string;
    reason: 'another-copy' | 'unknown';
  } | null,
  refusalCheckThrows: false,
  dialogCalls: [] as Array<{
    type?: string;
    message?: string;
    detail?: string;
    buttons?: string[];
  }>,
  installNowCalls: 0
}));

vi.mock('electron', () => ({
  dialog: {
    showMessageBox: (options: DialogCall) => {
      seams.dialogCalls.push(options);
      return Promise.resolve({ response: 0, checkboxChecked: false });
    }
  }
}));

vi.mock('../updater', () => ({
  checkForUpdatesNow: () => Promise.resolve(seams.outcome),
  getUpdateUiState: () => ({
    currentVersion: '0.19.0',
    stagedVersion: seams.stagedVersion,
    lastCheckedAt: null
  }),
  installStagedUpdateNow: () => {
    seams.installNowCalls += 1;
  },
  onUpdateStateChanged: (cb: () => void) => {
    seams.stateListeners.push(cb);
    return () => {};
  }
}));

vi.mock('../refusal-check', () => ({
  detectRefusedInstall: () => {
    if (seams.refusalCheckThrows) {
      throw new Error('the state file could not be read');
    }
    return seams.refused;
  }
}));

vi.mock('../log', () => ({
  logUpdateEvent: () => {}
}));

/** Fresh module state per test: the arm and its subscription reset. */
async function loadUi(): Promise<typeof import('../ui')> {
  vi.resetModules();
  return import('../ui');
}

/** Fire every captured state listener, then drain the microtask queue. */
async function fireStateChanged(): Promise<void> {
  for (const cb of seams.stateListeners) cb();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** The dialog call at an index, asserted present for the checks below. */
function dialogAt(index: number): DialogCall {
  const call = seams.dialogCalls[index];
  if (call === undefined) {
    throw new Error(`no dialog was shown at index ${String(index)}`);
  }
  return call;
}

const READY_DETAIL =
  'It installs when you quit. To install it now, use the Tortie menu.';

beforeEach(() => {
  seams.stagedVersion = null;
  seams.outcome = { kind: 'downloading', version: '0.19.1' };
  seams.stateListeners = [];
  seams.refused = null;
  seams.refusalCheckThrows = false;
  seams.dialogCalls = [];
  seams.installNowCalls = 0;
});

describe('the ready moment', () => {
  it('shows one ready dialog when the checked version stages after the downloading dialog', async () => {
    const ui = await loadUi();
    await ui.runInteractiveUpdateCheck();

    expect(seams.dialogCalls).toHaveLength(1);
    expect(dialogAt(0).message).toBe('Update found');
    expect(dialogAt(0).detail).toBe(
      'Tortie 0.19.1 is downloading. Another message appears when it is ready.'
    );

    seams.stagedVersion = '0.19.1';
    await fireStateChanged();

    expect(seams.dialogCalls).toHaveLength(2);
    expect(dialogAt(1).type).toBe('info');
    expect(dialogAt(1).message).toBe('Tortie 0.19.1 is ready');
    expect(dialogAt(1).detail).toBe(READY_DETAIL);
    expect(dialogAt(1).buttons).toEqual(['OK']);
    // The ready dialog installs nothing.
    expect(seams.installNowCalls).toBe(0);

    // A second staging, of any version, shows nothing more.
    await fireStateChanged();
    seams.stagedVersion = '0.20.0';
    await fireStateChanged();
    expect(seams.dialogCalls).toHaveLength(2);
  });

  it('shows the ready dialog immediately when staging finished while the downloading dialog was open', async () => {
    const ui = await loadUi();
    // The check answered downloading, but by the time the dialog is
    // dismissed the staged state already reads the same version.
    seams.stagedVersion = '0.19.1';
    await ui.runInteractiveUpdateCheck();

    expect(seams.dialogCalls).toHaveLength(2);
    expect(dialogAt(1).message).toBe('Tortie 0.19.1 is ready');
    expect(dialogAt(1).detail).toBe(READY_DETAIL);

    // Nothing was armed, so later state changes show nothing.
    await fireStateChanged();
    expect(seams.dialogCalls).toHaveLength(2);
  });

  it('stays silent when a different version stages than the one the user checked', async () => {
    const ui = await loadUi();
    await ui.runInteractiveUpdateCheck();
    expect(seams.dialogCalls).toHaveLength(1);

    seams.stagedVersion = '0.20.0';
    await fireStateChanged();
    expect(seams.dialogCalls).toHaveLength(1);
  });

  it('replaces the arm on a second check of the same version and still shows one dialog', async () => {
    const ui = await loadUi();
    await ui.runInteractiveUpdateCheck();
    await ui.runInteractiveUpdateCheck();
    expect(seams.dialogCalls).toHaveLength(2);

    seams.stagedVersion = '0.19.1';
    await fireStateChanged();
    expect(seams.dialogCalls).toHaveLength(3);
    expect(dialogAt(2).message).toBe('Tortie 0.19.1 is ready');

    await fireStateChanged();
    expect(seams.dialogCalls).toHaveLength(3);
  });

  it('subscribes to nothing until a user check arms it, so background staging is silent', async () => {
    await loadUi();
    expect(seams.stateListeners).toHaveLength(0);

    seams.stagedVersion = '0.19.1';
    await fireStateChanged();
    expect(seams.dialogCalls).toHaveLength(0);
  });
});

describe('the refusal surface', () => {
  it('names the running copy when the reason is another-copy', async () => {
    const ui = await loadUi();
    seams.refused = { version: '0.19.1', reason: 'another-copy' };
    await ui.announceRefusedInstallIfAny();

    expect(seams.dialogCalls).toHaveLength(1);
    expect(dialogAt(0).type).toBe('warning');
    expect(dialogAt(0).message).toBe('The update did not install');
    expect(dialogAt(0).detail).toBe(
      'The update to 0.19.1 did not install because another copy of Tortie was running. It installs the next time you quit.'
    );
    expect(dialogAt(0).buttons).toEqual(['OK']);
  });

  it('says less, not more, when the reason is unknown', async () => {
    const ui = await loadUi();
    seams.refused = { version: '0.19.1', reason: 'unknown' };
    await ui.announceRefusedInstallIfAny();

    expect(seams.dialogCalls).toHaveLength(1);
    expect(dialogAt(0).type).toBe('warning');
    expect(dialogAt(0).detail).toBe(
      'The update to 0.19.1 did not install. It installs the next time you quit.'
    );
  });

  it('shows nothing when there is no refusal to report', async () => {
    const ui = await loadUi();
    await ui.announceRefusedInstallIfAny();
    expect(seams.dialogCalls).toHaveLength(0);
  });

  it('never rejects, even when the refusal check throws', async () => {
    const ui = await loadUi();
    seams.refusalCheckThrows = true;
    await expect(ui.announceRefusedInstallIfAny()).resolves.toBeUndefined();
    expect(seams.dialogCalls).toHaveLength(0);
  });
});
