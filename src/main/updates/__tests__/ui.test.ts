/**
 * Unit tests for the dialog surfaces in ui.ts (Phase 31, extended in Phase
 * 43).
 *
 * Phase 31's subjects, unchanged:
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
 * Phase 43's subjects:
 *
 * - the two new refusal shapes. A staged copy that was gone at install time
 *   offers to clear, and the same case after the installer gave up says how
 *   many times it tried, using the number read out of the log.
 * - the standing wreck. A wreck on disk with no pending record gets its own
 *   dialog and its own title.
 * - offerUpdaterRepair. A refusal shows its sentence and runs NO check,
 *   because refusing and then checking would re-stage the very update the
 *   refusal exists to protect.
 *
 * Every collaborator is mocked at the module seam: electron's dialog, the
 * updater engine, the refusal check, the recovery verb and the log. ui.ts
 * holds the arm in module state, so each test imports a fresh copy through
 * resetModules.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

interface DialogCall {
  type?: string;
  message?: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

type Refused = {
  version: string;
  reason: 'another-copy' | 'staged-bundle-missing' | 'unknown';
  gaveUp: boolean;
  attempts: number | null;
} | null;

type Wreck = {
  reason: 'staged-bundle-missing' | 'gave-up';
  attempts: number | null;
} | null;

const seams = vi.hoisted(() => ({
  stagedVersion: null as string | null,
  outcome: { kind: 'downloading', version: '0.19.1' } as unknown,
  stateListeners: [] as Array<() => void>,
  refused: null as unknown,
  wreck: null as unknown,
  refusalCheckThrows: false,
  /** Which button the next showMessageBox answers with. */
  nextResponse: 0,
  recoveryOutcome: {
    kind: 'cleared',
    removed: [],
    failures: [],
    refusal: null
  } as unknown,
  repairCalls: 0,
  checkCalls: 0,
  repairNeeded: [] as boolean[],
  dialogCalls: [] as DialogCall[],
  installNowCalls: 0
}));

vi.mock('electron', () => ({
  dialog: {
    showMessageBox: (options: DialogCall) => {
      seams.dialogCalls.push(options);
      return Promise.resolve({
        response: seams.nextResponse,
        checkboxChecked: false
      });
    }
  }
}));

vi.mock('../updater', () => ({
  checkForUpdatesNow: () => {
    seams.checkCalls += 1;
    return Promise.resolve(seams.outcome);
  },
  getUpdateUiState: () => ({
    currentVersion: '0.19.0',
    stagedVersion: seams.stagedVersion,
    lastCheckedAt: null,
    needsUpdateRepair: false
  }),
  installStagedUpdateNow: () => {
    seams.installNowCalls += 1;
  },
  onUpdateStateChanged: (cb: () => void) => {
    seams.stateListeners.push(cb);
    return () => {};
  },
  setUpdaterRepairNeeded: (needed: boolean) => {
    seams.repairNeeded.push(needed);
  }
}));

vi.mock('../refusal-check', () => ({
  detectRefusedInstall: () => {
    if (seams.refusalCheckThrows) {
      throw new Error('the state file could not be read');
    }
    return seams.refused as Refused;
  },
  detectStandingWreck: () => seams.wreck as Wreck
}));

vi.mock('../recovery', () => ({
  repairUpdaterState: () => {
    seams.repairCalls += 1;
    return Promise.resolve(seams.recoveryOutcome);
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

const SAFE = 'Your sessions keep running and your settings are not touched.';

beforeEach(() => {
  seams.stagedVersion = null;
  seams.outcome = { kind: 'downloading', version: '0.19.1' };
  seams.stateListeners = [];
  seams.refused = null;
  seams.wreck = null;
  seams.refusalCheckThrows = false;
  seams.nextResponse = 0;
  seams.recoveryOutcome = {
    kind: 'cleared',
    removed: [],
    failures: [],
    refusal: null
  };
  seams.repairCalls = 0;
  seams.checkCalls = 0;
  seams.repairNeeded = [];
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

describe('the refusal surface, the Phase 31 shapes', () => {
  it('names the running copy when the reason is another-copy', async () => {
    const ui = await loadUi();
    seams.refused = {
      version: '0.19.1',
      reason: 'another-copy',
      gaveUp: false,
      attempts: null
    };
    await ui.announceRefusedInstallIfAny();

    expect(seams.dialogCalls).toHaveLength(1);
    expect(dialogAt(0).type).toBe('warning');
    expect(dialogAt(0).message).toBe('The update did not install');
    expect(dialogAt(0).detail).toBe(
      'The update to 0.19.1 did not install because another copy of Tortie was running. It installs the next time you quit.'
    );
    expect(dialogAt(0).buttons).toEqual(['OK']);
    // Phase 31's shape offers no repair, so the menu item is not armed.
    expect(seams.repairNeeded).toEqual([]);
  });

  it('says less, not more, when the reason is unknown', async () => {
    const ui = await loadUi();
    seams.refused = {
      version: '0.19.1',
      reason: 'unknown',
      gaveUp: false,
      attempts: null
    };
    await ui.announceRefusedInstallIfAny();

    expect(seams.dialogCalls).toHaveLength(1);
    expect(dialogAt(0).type).toBe('warning');
    expect(dialogAt(0).detail).toBe(
      'The update to 0.19.1 did not install. It installs the next time you quit.'
    );
  });

  it('shows nothing when there is no refusal and no wreck to report', async () => {
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

describe('the refusal surface, the Phase 43 shapes', () => {
  it('offers to clear when the prepared copy was gone and the installer has not given up', async () => {
    const ui = await loadUi();
    seams.refused = {
      version: '0.18.2',
      reason: 'staged-bundle-missing',
      gaveUp: false,
      attempts: null
    };
    await ui.announceRefusedInstallIfAny();

    expect(seams.dialogCalls).toHaveLength(1);
    expect(dialogAt(0).message).toBe('The update did not install');
    expect(dialogAt(0).detail).toBe(
      'The update to 0.18.2 did not install. Tortie had prepared a copy of the new version, and that copy was gone from disk when the installer ran. ' +
        "Tortie can clear the installer's leftover files and check again now. Clearing removes only those files. " +
        SAFE
    );
    expect(dialogAt(0).buttons).toEqual(['Not Now', 'Clear and Check Again']);
    expect(dialogAt(0).defaultId).toBe(1);
    expect(dialogAt(0).cancelId).toBe(0);
    expect(seams.repairNeeded).toEqual([true]);
    // Not Now was the answer, so nothing was cleared and no check ran.
    expect(seams.repairCalls).toBe(0);
    expect(seams.checkCalls).toBe(0);
  });

  it("states the attempt count the log carried, which is the operator's case", async () => {
    const ui = await loadUi();
    seams.refused = {
      version: '0.18.2',
      reason: 'staged-bundle-missing',
      gaveUp: true,
      attempts: 3
    };
    await ui.announceRefusedInstallIfAny();

    expect(dialogAt(0).detail).toBe(
      'The update to 0.18.2 did not install. Tortie had prepared a copy of the new version, and that copy was gone from disk when the installer ran. ' +
        'The installer tried 3 times and then saved that it had given up. It does not try again until Tortie clears what it saved. ' +
        "Clearing removes only the installer's own leftover files. " +
        SAFE
    );
  });

  it('drops the number when the log did not carry an attempt count', async () => {
    const ui = await loadUi();
    seams.refused = {
      version: '0.18.2',
      reason: 'staged-bundle-missing',
      gaveUp: true,
      attempts: null
    };
    await ui.announceRefusedInstallIfAny();

    expect(dialogAt(0).detail).toContain(
      'The installer then saved that it had given up.'
    );
    expect(dialogAt(0).detail).not.toContain('The installer tried');
  });

  // The fix round's subject. Phase 31's two sentences both end "It installs
  // the next time you quit", and that is false once the installer has saved
  // that it gave up. The first cut read gaveUp only on the
  // staged-bundle-missing branch, so these two shapes told the user to quit
  // and wait for an install that could never happen.
  it('says the installer gave up even when another copy was the cause, and offers the clear', async () => {
    const ui = await loadUi();
    seams.refused = {
      version: '0.18.2',
      reason: 'another-copy',
      gaveUp: true,
      attempts: 3
    };
    await ui.announceRefusedInstallIfAny();

    expect(dialogAt(0).detail).toBe(
      'The update to 0.18.2 did not install because another copy of Tortie was running. ' +
        'The installer tried 3 times and then saved that it had given up. It does not try again until Tortie clears what it saved. ' +
        "Clearing removes only the installer's own leftover files. " +
        SAFE
    );
    expect(dialogAt(0).detail).not.toContain('It installs the next time you quit');
    expect(dialogAt(0).buttons).toEqual(['Not Now', 'Clear and Check Again']);
    expect(seams.repairNeeded).toEqual([true]);
  });

  it('says the installer gave up even when the log did not say why, and offers the clear', async () => {
    const ui = await loadUi();
    seams.refused = {
      version: '0.18.2',
      reason: 'unknown',
      gaveUp: true,
      attempts: null
    };
    await ui.announceRefusedInstallIfAny();

    expect(dialogAt(0).detail).toBe(
      "The update to 0.18.2 did not install, and the installer's log does not say why. " +
        'The installer then saved that it had given up. It does not try again until Tortie clears what it saved. ' +
        "Clearing removes only the installer's own leftover files. " +
        SAFE
    );
    expect(dialogAt(0).buttons).toEqual(['Not Now', 'Clear and Check Again']);
  });

  it('runs the repair when the person chooses to clear', async () => {
    const ui = await loadUi();
    seams.nextResponse = 1;
    seams.refused = {
      version: '0.18.2',
      reason: 'staged-bundle-missing',
      gaveUp: true,
      attempts: 3
    };
    await ui.announceRefusedInstallIfAny();

    expect(seams.repairCalls).toBe(1);
    expect(seams.checkCalls).toBe(1);
    expect(dialogAt(1).message).toBe("Tortie cleared the installer's leftovers");
  });
});

describe('the standing wreck surface', () => {
  it('says the installer gave up and how many times it tried', async () => {
    const ui = await loadUi();
    seams.wreck = { reason: 'gave-up', attempts: 3 };
    await ui.announceRefusedInstallIfAny();

    expect(seams.dialogCalls).toHaveLength(1);
    expect(dialogAt(0).message).toBe('Tortie cannot install updates right now');
    expect(dialogAt(0).detail).toBe(
      'The installer tried 3 times to install an earlier update and then saved that it had given up, so it does not try again. ' +
        'Tortie can clear what the installer saved and check for the update again. ' +
        "Clearing removes only the installer's own leftover files. " +
        SAFE
    );
    expect(dialogAt(0).buttons).toEqual(['Not Now', 'Clear and Check Again']);
    expect(seams.repairNeeded).toEqual([true]);
  });

  it('says the prepared copy is gone when that is the reason', async () => {
    const ui = await loadUi();
    seams.wreck = { reason: 'staged-bundle-missing', attempts: null };
    await ui.announceRefusedInstallIfAny();

    expect(dialogAt(0).detail).toBe(
      'Tortie had prepared a copy of a new version and that copy is no longer on disk, so the installer cannot finish. ' +
        "Tortie can clear the installer's leftover files and check for the update again. Clearing removes only those files. " +
        SAFE
    );
  });

  it('is not asked at all when a pending record already explained the failure', async () => {
    const ui = await loadUi();
    seams.refused = {
      version: '0.19.1',
      reason: 'another-copy',
      gaveUp: false,
      attempts: null
    };
    seams.wreck = { reason: 'gave-up', attempts: 3 };
    await ui.announceRefusedInstallIfAny();
    // One dialog, and it is the pending one.
    expect(seams.dialogCalls).toHaveLength(1);
    expect(dialogAt(0).message).toBe('The update did not install');
  });
});

describe('offerUpdaterRepair', () => {
  it('says what it cleared and then runs the ordinary check', async () => {
    const ui = await loadUi();
    await ui.offerUpdaterRepair();

    expect(seams.repairCalls).toBe(1);
    expect(dialogAt(0).message).toBe("Tortie cleared the installer's leftovers");
    expect(dialogAt(0).detail).toBe(
      "Tortie removed the installer's saved state and the copies it had prepared, and it is checking for the update again. " +
        'A download runs in the background and another message appears when the update is ready.'
    );
    expect(dialogAt(0).buttons).toEqual(['OK']);
    expect(seams.checkCalls).toBe(1);
  });

  it('names a partial clear as partial and still checks', async () => {
    const ui = await loadUi();
    seams.recoveryOutcome = {
      kind: 'partial',
      removed: ['/a'],
      failures: [{ path: '/b', message: 'EPERM' }],
      refusal: null
    };
    await ui.offerUpdaterRepair();

    expect(dialogAt(0).type).toBe('warning');
    expect(dialogAt(0).message).toBe(
      "Tortie cleared some of the installer's leftovers"
    );
    expect(dialogAt(0).detail).toBe(
      "Tortie removed some of the installer's files and could not remove others. The log names each file it could not remove. " +
        'Tortie is checking for the update again, and the update may still fail to install.'
    );
    expect(seams.checkCalls).toBe(1);
  });

  it('shows the refusal and runs NO check, because a check would re-stage', async () => {
    const ui = await loadUi();
    seams.recoveryOutcome = {
      kind: 'refused',
      removed: [],
      failures: [],
      refusal:
        'Tortie is not clearing the updater state, because the update it prepared is still on disk and ready to install. It installs when you quit.'
    };
    await ui.offerUpdaterRepair();

    expect(seams.dialogCalls).toHaveLength(1);
    expect(dialogAt(0).message).toBe('Nothing needs clearing');
    expect(dialogAt(0).detail).toBe(
      'Tortie is not clearing the updater state, because the update it prepared is still on disk and ready to install. It installs when you quit.'
    );
    expect(dialogAt(0).buttons).toEqual(['OK']);
    expect(seams.checkCalls).toBe(0);
  });

  it('shows nothing and checks nothing on a silent refusal', async () => {
    const ui = await loadUi();
    seams.recoveryOutcome = {
      kind: 'refused',
      removed: [],
      failures: [],
      refusal: null
    };
    await ui.offerUpdaterRepair();

    expect(seams.dialogCalls).toHaveLength(0);
    expect(seams.checkCalls).toBe(0);
  });
});
