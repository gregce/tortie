/**
 * Phase 43 unit tests for the recovery verb's refusals.
 *
 * The refusal ORDER is the subject. A recovery that ran while a healthy
 * update sat staged on disk would delete that update, which is the exact
 * defect this phase exists to remove, so the healthy check is the first one
 * after the packaged check and it is proved here without a filesystem.
 *
 * The path shape guard is the other subject. GMUX_UPDATE_STATE_ROOT can move
 * where the verb looks, and even a gate failure must not turn the verb into
 * a general delete.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/unused-in-these-tests',
    getVersion: () => '0.19.1',
    isPackaged: false
  },
  BrowserWindow: class {}
}));

// recovery imports ./updater, which imports the library at module scope.
vi.mock('electron-updater', () => ({ autoUpdater: {} }));

vi.mock('../log', () => ({ logUpdateEvent: () => {} }));

import {
  FOREIGN_STATE_REFUSAL,
  INSTALLER_RUNNING_REFUSAL,
  pathsLookRight,
  READY_UPDATE_REFUSAL,
  recoveryPlan
} from '../recovery';
import type { UpdaterHealth, UpdaterPaths } from '../shipit-state';

function health(
  state: UpdaterHealth['state'],
  reason: UpdaterHealth['reason'] = null
): UpdaterHealth {
  return {
    state,
    reason,
    stagedBundlePath: '/Users/gdc/Library/Caches/x.ShipIt/update.A/Tortie.app',
    stagedBundleExists: state === 'healthy',
    stateFilePresent: true,
    targetsThisApp: true,
    attempts: 3,
    fingerprint: 'a terminal line'
  };
}

const WRECKED = health('wrecked', 'gave-up');

describe('recoveryPlan, the four refusals in order', () => {
  it('a dev build clears nothing and says nothing', () => {
    expect(recoveryPlan(false, WRECKED, false, true)).toEqual({
      proceed: false,
      refusal: null
    });
  });

  it('a ready update on disk is never cleared, and the sentence says why', () => {
    expect(recoveryPlan(true, health('healthy'), false, true)).toEqual({
      proceed: false,
      refusal: READY_UPDATE_REFUSAL
    });
    expect(READY_UPDATE_REFUSAL).toBe(
      'Tortie is not clearing the updater state, because the update it prepared is still on disk and ready to install. It installs when you quit.'
    );
  });

  it('the healthy check runs BEFORE the give up check', () => {
    // A machine that gave up on one update and has since staged another
    // reads as healthy, and healthy refuses. If the order were reversed
    // this call would proceed and delete the staged bundle.
    const healthyAfterAGiveUp: UpdaterHealth = {
      ...health('healthy'),
      attempts: 3
    };
    expect(recoveryPlan(true, healthyAfterAGiveUp, false, true).proceed).toBe(
      false
    );
  });

  it("a state file that names another copy of Tortie is left alone", () => {
    // The measured defect this line answers. When the bundle comparison was
    // a raw string compare, the app's own state file read as another
    // application's, the verdict fell to `unknown`, and `unknown` proceeds.
    // A live run then deleted a HEALTHY staged update. The comparison is
    // fixed in ./shipit-state.ts and this is the second guard on the same
    // defect.
    const foreign: UpdaterHealth = {
      ...health('unknown'),
      stateFilePresent: true,
      targetsThisApp: false,
      stagedBundleExists: true
    };
    expect(recoveryPlan(true, foreign, false, true)).toEqual({
      proceed: false,
      refusal: FOREIGN_STATE_REFUSAL
    });
  });

  it('an unknown verdict with no state file at all still proceeds', () => {
    const noFile: UpdaterHealth = {
      ...health('unknown'),
      stateFilePresent: false,
      targetsThisApp: false
    };
    expect(recoveryPlan(true, noFile, false, true).proceed).toBe(true);
  });

  it('a running installer keeps its own files', () => {
    expect(recoveryPlan(true, WRECKED, true, true)).toEqual({
      proceed: false,
      refusal: INSTALLER_RUNNING_REFUSAL
    });
  });

  it('a path shape we do not expect clears nothing and says nothing', () => {
    expect(recoveryPlan(true, WRECKED, false, false)).toEqual({
      proceed: false,
      refusal: null
    });
  });

  it('proceeds on a wreck with nothing else in the way', () => {
    expect(recoveryPlan(true, WRECKED, false, true)).toEqual({
      proceed: true,
      refusal: null
    });
  });

  it('proceeds when the health is unknown, because unknown is not healthy', () => {
    // The menu item is only drawn while a wreck was detected, and a wreck
    // can age into unknown between the launch and the click. Clearing
    // leftovers that prove nothing costs nothing.
    expect(recoveryPlan(true, health('unknown'), false, true).proceed).toBe(
      true
    );
  });
});

describe('pathsLookRight', () => {
  const HOME = '/Users/gdc';
  const real: UpdaterPaths = {
    shipItDir: '/Users/gdc/Library/Caches/com.itavero.tortie.ShipIt',
    updaterCacheDir: '/Users/gdc/Library/Caches/tortie-updater',
    defaultsDomain: 'com.itavero.tortie.ShipIt',
    isRehearsalRoot: false
  };

  it('accepts the real shape', () => {
    expect(pathsLookRight(real, HOME)).toBe(true);
  });

  it('accepts a rehearsal root anywhere, as long as it ends in .ShipIt', () => {
    expect(
      pathsLookRight(
        {
          shipItDir: '/tmp/p43-root/com.itavero.tortie.ShipIt',
          updaterCacheDir: '/tmp/p43-root/tortie-updater',
          defaultsDomain: 'com.itavero.tortie.ShipIt.rehearsal',
          isRehearsalRoot: true
        },
        HOME
      )
    ).toBe(true);
  });

  it('refuses a directory that does not end in .ShipIt', () => {
    expect(pathsLookRight({ ...real, shipItDir: '/Users/gdc' }, HOME)).toBe(
      false
    );
    expect(
      pathsLookRight(
        { ...real, shipItDir: '/tmp/root/anything', isRehearsalRoot: true },
        HOME
      )
    ).toBe(false);
  });

  it('refuses a directory outside the user Caches folder without a rehearsal root', () => {
    expect(
      pathsLookRight({ ...real, shipItDir: '/tmp/evil.ShipIt' }, HOME)
    ).toBe(false);
  });
});
