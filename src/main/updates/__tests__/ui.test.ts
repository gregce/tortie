/**
 * Unit tests for the dialog surfaces in ui.ts (Phase 31, extended in Phase
 * 43, thinned in Phase 58).
 *
 * Phase 58's subjects:
 *
 * - the removed dialogs are GONE. A user check whose outcome is
 *   downloading, staged or failed shows no dialog at all; the ring carries
 *   those stages. ui.ts takes no onUpdateStateChanged subscription any
 *   more, so no staging event can ever produce a dialog from this module.
 * - explainRingFailure. The ring's "Why it failed" item shows one OK
 *   dialog with fixed copy per failed stage, shows nothing when the click
 *   raced a state change, and never rejects.
 *
 * Phase 31 and 43's surviving subjects, unchanged:
 *
 * - the refusal surface. announceRefusedInstallIfAny shows one warning
 *   dialog whose sentence matches the reason ./refusal-check decided, shows
 *   nothing when there is nothing to say, and never rejects.
 * - the two Phase 43 refusal shapes, the standing wreck, and
 *   offerUpdaterRepair, which refuses to check after a refused clear.
 * - "You are up to date" and the dev build dialog, the two answers the
 *   ring cannot carry.
 *
 * Every collaborator is mocked at the module seam: electron's dialog, the
 * updater engine, the refusal check, the recovery verb and the log. Each
 * test imports a fresh copy through resetModules.
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
  ring: 'hidden' as string,
  ringVersion: null as string | null,
  failedDuring: null as 'checking' | 'downloading' | 'staging' | null,
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
  installNowCalls: 0,
  dialogThrows: false
}));

vi.mock('electron', () => ({
  dialog: {
    showMessageBox: (options: DialogCall) => {
      if (seams.dialogThrows) {
        return Promise.reject(new Error('no window to attach to'));
      }
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
    needsUpdateRepair: false,
    ring: seams.ring,
    ringVersion: seams.ringVersion,
    ringPercent: null,
    failedDuring: seams.failedDuring
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

const SAFE = 'Your sessions keep running and your settings are not touched.';

beforeEach(() => {
  seams.stagedVersion = null;
  seams.outcome = { kind: 'downloading', version: '0.19.1' };
  seams.ring = 'hidden';
  seams.ringVersion = null;
  seams.failedDuring = null;
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
  seams.dialogThrows = false;
});

describe('the dialogs Phase 58 removed are gone', () => {
  it('shows NOTHING for a downloading outcome, before or after staging lands', async () => {
    const ui = await loadUi();
    await ui.runInteractiveUpdateCheck();

    // No "Update found" dialog. The ring carries downloading.
    expect(seams.dialogCalls).toHaveLength(0);

    // Staging completes: no ready dialog either. The ring shows ready.
    seams.stagedVersion = '0.19.1';
    await fireStateChanged();
    expect(seams.dialogCalls).toHaveLength(0);
    expect(seams.installNowCalls).toBe(0);
  });

  it('shows NOTHING for a staged outcome; the staged menu item still offers the prompt', async () => {
    const ui = await loadUi();
    seams.stagedVersion = '0.19.1';
    seams.outcome = { kind: 'staged', version: '0.19.1' };
    await ui.runInteractiveUpdateCheck();
    expect(seams.dialogCalls).toHaveLength(0);
    expect(seams.installNowCalls).toBe(0);
  });

  it('shows NOTHING for a failed outcome; the ring shows failed instead', async () => {
    const ui = await loadUi();
    seams.outcome = { kind: 'failed' };
    await ui.runInteractiveUpdateCheck();
    expect(seams.dialogCalls).toHaveLength(0);
  });

  it('takes no state subscription at all, so no staging event can ever raise a dialog here', async () => {
    const ui = await loadUi();
    await ui.runInteractiveUpdateCheck();
    expect(seams.stateListeners).toHaveLength(0);

    seams.stagedVersion = '0.19.1';
    await fireStateChanged();
    expect(seams.dialogCalls).toHaveLength(0);
  });
});

describe('the dialogs that survive the ring', () => {
  it('still answers "You are up to date" to the question the user just asked', async () => {
    const ui = await loadUi();
    seams.outcome = { kind: 'none', currentVersion: '0.19.0' };
    await ui.runInteractiveUpdateCheck();

    expect(seams.dialogCalls).toHaveLength(1);
    expect(dialogAt(0).type).toBe('info');
    expect(dialogAt(0).message).toBe('You are up to date');
    expect(dialogAt(0).detail).toBe('Tortie 0.19.0 is the newest version.');
    expect(dialogAt(0).buttons).toEqual(['OK']);
  });

  it('still explains that a dev build does not update', async () => {
    const ui = await loadUi();
    seams.outcome = { kind: 'unsupported' };
    await ui.runInteractiveUpdateCheck();

    expect(seams.dialogCalls).toHaveLength(1);
    expect(dialogAt(0).message).toBe('Updates are not available here');
    expect(dialogAt(0).detail).toBe(
      'This is a development build. It does not update itself.'
    );
  });

  it('still shows the install prompt from the staged menu item, wired to the one install call', async () => {
    const ui = await loadUi();
    seams.stagedVersion = '0.19.1';
    seams.nextResponse = 1;
    await ui.confirmInstallStagedUpdate();

    expect(seams.dialogCalls).toHaveLength(1);
    expect(dialogAt(0).message).toBe('Update to 0.19.1');
    expect(dialogAt(0).detail).toBe(
      'Tortie will close and reopen. Your sessions keep running. Nothing is interrupted.'
    );
    expect(dialogAt(0).buttons).toEqual(['Later', 'Update Now']);
    expect(seams.installNowCalls).toBe(1);
  });
});

describe('explainRingFailure, the words behind Why it failed', () => {
  it('uses the exact body the removed failed-check dialog had, for a failed check', async () => {
    const ui = await loadUi();
    seams.failedDuring = 'checking';
    await ui.explainRingFailure();

    expect(seams.dialogCalls).toHaveLength(1);
    expect(dialogAt(0).type).toBe('warning');
    expect(dialogAt(0).message).toBe('The update check failed');
    expect(dialogAt(0).detail).toBe(
      'Tortie could not reach the update feed. It will try again on its own.'
    );
    expect(dialogAt(0).buttons).toEqual(['OK']);
  });

  it('names the version whose download stopped', async () => {
    const ui = await loadUi();
    seams.failedDuring = 'downloading';
    seams.ringVersion = '0.26.0';
    await ui.explainRingFailure();

    expect(dialogAt(0).message).toBe('The download did not finish');
    expect(dialogAt(0).detail).toBe(
      'Tortie was downloading 0.26.0 and the download stopped. It will try again on its own.'
    );
  });

  it('points a staging failure at Repair updates', async () => {
    const ui = await loadUi();
    seams.failedDuring = 'staging';
    seams.ringVersion = '0.26.0';
    await ui.explainRingFailure();

    expect(dialogAt(0).message).toBe('The update could not be prepared');
    expect(dialogAt(0).detail).toBe(
      "Tortie downloaded 0.26.0 and the installer could not prepare it. Repair updates can clear the installer's files and check again."
    );
  });

  it('shows nothing when the click raced a state change and failedDuring is null', async () => {
    const ui = await loadUi();
    seams.failedDuring = null;
    await ui.explainRingFailure();
    expect(seams.dialogCalls).toHaveLength(0);
  });

  it('never rejects, even when the dialog throws', async () => {
    const ui = await loadUi();
    seams.failedDuring = 'checking';
    seams.dialogThrows = true;
    await expect(ui.explainRingFailure()).resolves.toBeUndefined();
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
