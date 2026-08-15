/**
 * Phase 43 unit tests for what Squirrel left on disk and what it means.
 *
 * The tails below are the VERBATIM lines from the operator's two incidents,
 * 2026-08-14 and 2026-08-15, because those lines are what this module
 * exists to read. The noise lines that begin "ERROR: Unrecognized attribute
 * string flag" are kept in the fixtures, because they sit between the real
 * lines on the operator's machine and must never hide one.
 *
 * The health matrix is the part worth reading twice. The rule order is the
 * design: healthy is decided before gave up, so a machine that gave up once
 * and has since staged another update is never cleared, and a successful
 * install is decided before both, so every launch after an update does not
 * look wrecked.
 */

import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// shipit-state imports ./log and ../tmux/supervisor, both of which reach
// electron. Only the surfaces those two name are needed here.
vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/unused-in-these-tests',
    getVersion: () => '0.19.1',
    isPackaged: false
  },
  BrowserWindow: class {}
}));

const logged: Array<{ level: string; message: string }> = [];
vi.mock('../log', () => ({
  logUpdateEvent: (level: string, message: string) => {
    logged.push({ level, message });
  }
}));

import {
  bundlePathFromUrl,
  classifyShipItOutcome,
  decideUpdaterHealth,
  parseShipItState,
  parseUpdaterCacheDirName,
  readRepairMarkAt,
  resolveUpdaterPaths,
  sameBundleOnDisk,
  sameBundlePath,
  shipItCacheDir,
  type ShipItOutcome,
  type ShipItState
} from '../shipit-state';

// ---------------------------------------------------------------------------
// The operator's own lines
// ---------------------------------------------------------------------------

const NOISE = 'ERROR: Unrecognized attribute string flag';

const COPY_FAILED_LINE =
  '2026-08-15 00:29:38.125 ShipIt[70665:92089787] Installation error: Error Domain=SQRLInstallerErrorDomain Code=-1 ' +
  '"Failed to copy bundle file:///Users/gdc/Library/Caches/com.itavero.tortie.ShipIt/update.KZlg2R9/Tortie.app/ ' +
  'to directory file:///var/folders/xx/com.itavero.tortie.ShipIt.fFsI228X/Tortie.app" ' +
  'UserInfo={NSUnderlyingError=0x600001 {Error Domain=NSCocoaErrorDomain Code=260 ' +
  '"The file “Tortie.app” couldn’t be opened because there is no such file." ' +
  'UserInfo={NSUnderlyingError=0x600002 {Error Domain=NSPOSIXErrorDomain Code=2 "No such file or directory"}}}}';

const GAVE_UP_LINE =
  '2026-08-15 00:29:42.389 ShipIt[72120:92090255] Too many attempts to install, aborting update';

/** The 2026-08-15 tail, in the order NSLog wrote it. */
const WRECK_TAIL = [
  '2026-08-15 00:29:19.152 ShipIt[69989:92086352] Detected this as an install request',
  '2026-08-15 00:29:24.761 ShipIt[70665:92087700] Detected this as an install request',
  '2026-08-15 00:29:38.105 ShipIt[70665:92087710] Beginning installation',
  NOISE,
  COPY_FAILED_LINE,
  '2026-08-15 00:29:38.189 ShipIt[71832:92089801] Resuming installation attempt 2',
  COPY_FAILED_LINE.replace('00:29:38.125', '00:29:38.200'),
  '2026-08-15 00:29:40.268 ShipIt[71966:92090057] Resuming installation attempt 3',
  COPY_FAILED_LINE.replace('00:29:38.125', '00:29:40.276'),
  NOISE,
  GAVE_UP_LINE,
  '2026-08-15 00:29:42.394 ShipIt[72120:92090255] ShipIt quitting'
].join('\n');

/** The 2026-08-14 tail, from research 42 section 4. */
const ANOTHER_COPY_LINE =
  '2026-08-14 15:16:49.024 ShipIt[86893:81560110] Aborting update attempt because there are 1 running instances of the target app';

const ANOTHER_COPY_TAIL = [
  '2026-08-14 15:16:16.702 ShipIt[86893:81533290] Beginning installation',
  NOISE,
  ANOTHER_COPY_LINE,
  '2026-08-14 15:16:49.029 ShipIt[86893:81560110] Installation cancelled: Error Domain=SQRLInstallerErrorDomain Code=-9 "App Still Running Error" UserInfo={NSLocalizedDescription=App Still Running Error}'
].join('\n');

const INSTALLED_TAIL = [
  '2026-08-15 00:34:33.001 ShipIt[80001:1] Detected this as an install request',
  '2026-08-15 00:34:48.100 ShipIt[80001:2] Beginning installation',
  '2026-08-15 00:34:48.994 ShipIt[80001:2] Installation completed successfully',
  '2026-08-15 00:34:48.996 ShipIt[80001:2] ShipIt quitting'
].join('\n');

describe('classifyShipItOutcome', () => {
  it("reads the operator's 2026-08-15 tail as gave up, after 3 attempts", () => {
    const outcome = classifyShipItOutcome(WRECK_TAIL);
    expect(outcome.terminal).toBe('gave-up');
    expect(outcome.line).toBe(GAVE_UP_LINE);
    expect(outcome.attempts).toBe(3);
    expect(outcome.at).toBe(new Date('2026-08-15T00:29:42.389').getTime());
  });

  it('reads the same tail without the give up line as a missing staged bundle', () => {
    const tail = WRECK_TAIL.split('\n')
      .filter((l) => l !== GAVE_UP_LINE)
      .join('\n');
    const outcome = classifyShipItOutcome(tail);
    expect(outcome.terminal).toBe('staged-bundle-missing');
    expect(outcome.attempts).toBe(3);
  });

  it("reads the 2026-08-14 tail as another copy running", () => {
    const outcome = classifyShipItOutcome(ANOTHER_COPY_TAIL);
    expect(outcome.terminal).toBe('another-copy');
    expect(outcome.line).toBe(ANOTHER_COPY_LINE);
    expect(outcome.attempts).toBe(null);
  });

  it('reads a successful install as installed', () => {
    expect(classifyShipItOutcome(INSTALLED_TAIL).terminal).toBe('installed');
  });

  it('lets the newest terminal line win, so a later success beats an earlier wreck', () => {
    const outcome = classifyShipItOutcome(`${WRECK_TAIL}\n${INSTALLED_TAIL}`);
    expect(outcome.terminal).toBe('installed');
    // The attempt count is still read out of the whole tail.
    expect(outcome.attempts).toBe(3);
  });

  it('reads an empty tail as none', () => {
    expect(classifyShipItOutcome('')).toEqual({
      terminal: 'none',
      line: null,
      at: null,
      attempts: null
    });
  });

  it('never lets quitting, beginning or the noise lines hide a terminal line', () => {
    const tail = [
      GAVE_UP_LINE,
      '2026-08-15 00:29:42.394 ShipIt[72120:92090255] ShipIt quitting',
      NOISE,
      NOISE,
      '2026-08-15 00:29:43.000 ShipIt[72120:92090255] Beginning installation'
    ].join('\n');
    expect(classifyShipItOutcome(tail).terminal).toBe('gave-up');
  });

  it('does not match a line whose shape merely resembles a terminal line', () => {
    expect(
      classifyShipItOutcome(
        'note: Too many attempts to install, aborting update maybe'
      ).terminal
    ).toBe('none');
  });

  // The repair keeps ShipIt_stderr.log on purpose, so the give up line in it
  // outlives the wreck it describes. Without this window the launch after a
  // SUCCESSFUL repair reads the machine as wrecked and offers the same
  // repair again, which was measured live before the mark existed.
  it('ignores every line stamped at or before the repair mark', () => {
    const markAt = new Date('2026-08-15T00:30:00.000').getTime();
    const outcome = classifyShipItOutcome(WRECK_TAIL, markAt);
    expect(outcome.terminal).toBe('none');
    expect(outcome.attempts).toBe(null);
  });

  it('still reads a wreck that happened after the repair mark', () => {
    const markAt = new Date('2026-08-15T00:29:00.000').getTime();
    const outcome = classifyShipItOutcome(WRECK_TAIL, markAt);
    expect(outcome.terminal).toBe('gave-up');
    expect(outcome.attempts).toBe(3);
  });

  it('ignores a line stamped in the same millisecond as the mark, and keeps the ones after it', () => {
    // The mark lands exactly on the third copy failure. That line and every
    // line before it drop out, including the attempt counts, and the give
    // up 2.113 s later still decides the verdict.
    const markAt = new Date('2026-08-15T00:29:40.276').getTime();
    const outcome = classifyShipItOutcome(WRECK_TAIL, markAt);
    expect(outcome.terminal).toBe('gave-up');
    expect(outcome.attempts).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// The health matrix
// ---------------------------------------------------------------------------

const THIS_APP = '/Users/gdc/scratch/Tortie.app';

function outcomeOf(
  terminal: ShipItOutcome['terminal'],
  attempts: number | null = null
): ShipItOutcome {
  // A `none` outcome carries no line, exactly as classifyShipItOutcome
  // returns it, so the fingerprint assertions below stay honest.
  if (terminal === 'none') {
    return { terminal, line: null, at: null, attempts };
  }
  return { terminal, line: `${terminal} line`, at: 1, attempts };
}

function stateNaming(target: string, update: string): ShipItState {
  return {
    bundleIdentifier: 'com.itavero.tortie',
    targetBundleURL: `file://${target}/`,
    updateBundleURL: `file://${update}/`
  };
}

describe('decideUpdaterHealth, the seven rules in order', () => {
  const staged = '/Users/gdc/Library/Caches/com.itavero.tortie.ShipIt/update.KZlg2R9/Tortie.app';
  const state = stateNaming(THIS_APP, staged);

  it('rule 1. no state file and no give up line says nothing', () => {
    const health = decideUpdaterHealth(null, outcomeOf('none'), false, false);
    expect(health.state).toBe('unknown');
    expect(health.reason).toBe(null);
    expect(health.fingerprint).toBe(null);
  });

  it("rule 2. another application's install is not Tortie's business", () => {
    const other = stateNaming('/Applications/Something.app', staged);
    const health = decideUpdaterHealth(other, outcomeOf('gave-up', 3), false, false);
    expect(health.state).toBe('unknown');
    expect(health.reason).toBe(null);
    expect(health.fingerprint).toBe('gave-up line');
  });

  it('rule 3. a staged bundle that is on disk is healthy', () => {
    const health = decideUpdaterHealth(state, outcomeOf('none'), true, true);
    expect(health.state).toBe('healthy');
    expect(health.reason).toBe(null);
    // Squirrel writes the URL with a trailing slash and this module keeps
    // the path exactly as the URL gave it.
    expect(health.stagedBundlePath).toBe(`${staged}/`);
  });

  it('rule 3 beats rule 5. a gave up log with a staged bundle on disk is healthy', () => {
    const health = decideUpdaterHealth(state, outcomeOf('gave-up', 3), true, true);
    expect(health.state).toBe('healthy');
    expect(health.reason).toBe(null);
  });

  it('rule 4. a successful install leaves the plist behind and is not a wreck', () => {
    const health = decideUpdaterHealth(state, outcomeOf('installed'), false, true);
    expect(health.state).toBe('unknown');
    expect(health.reason).toBe(null);
    expect(health.fingerprint).toBe('installed line');
  });

  it("rule 5. the operator's case. gave up is wrecked", () => {
    const health = decideUpdaterHealth(state, outcomeOf('gave-up', 3), false, true);
    expect(health.state).toBe('wrecked');
    expect(health.reason).toBe('gave-up');
    expect(health.attempts).toBe(3);
    expect(health.fingerprint).toBe('gave-up line');
  });

  it('rule 5 also fires with no state file at all', () => {
    const health = decideUpdaterHealth(null, outcomeOf('gave-up', 3), false, false);
    expect(health.state).toBe('wrecked');
    expect(health.reason).toBe('gave-up');
  });

  it('rule 6. a missing staged bundle is wrecked', () => {
    const health = decideUpdaterHealth(
      state,
      outcomeOf('staged-bundle-missing', 3),
      false,
      true
    );
    expect(health.state).toBe('wrecked');
    expect(health.reason).toBe('staged-bundle-missing');
    expect(health.fingerprint).toBe('staged-bundle-missing line');
  });

  it('rule 7. another copy running says nothing, because nothing needs clearing', () => {
    const health = decideUpdaterHealth(state, outcomeOf('another-copy'), false, true);
    expect(health.state).toBe('unknown');
    expect(health.reason).toBe(null);
  });
});

describe('stateFilePresent, which is what the recovery refuses on', () => {
  const staged = '/Users/gdc/Library/Caches/com.itavero.tortie.ShipIt/update.A/Tortie.app';

  it('is true whenever a state file parsed, whatever the verdict is', () => {
    const foreign = decideUpdaterHealth(
      stateNaming('/Applications/Some Other.app', staged),
      outcomeOf('gave-up', 3),
      true,
      false
    );
    expect(foreign.state).toBe('unknown');
    expect(foreign.stateFilePresent).toBe(true);
    expect(foreign.targetsThisApp).toBe(false);
  });

  it('is false when there is no state file to read', () => {
    const none = decideUpdaterHealth(null, outcomeOf('gave-up', 3), false, false);
    expect(none.state).toBe('wrecked');
    expect(none.stateFilePresent).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The small pure pieces
// ---------------------------------------------------------------------------

describe('sameBundlePath', () => {
  it('ignores a trailing slash on either side', () => {
    expect(sameBundlePath('/a/Tortie.app', '/a/Tortie.app/')).toBe(true);
    expect(sameBundlePath('/a/Tortie.app/', '/a/Tortie.app')).toBe(true);
    expect(sameBundlePath('/a/Tortie.app//', '/a/Tortie.app')).toBe(true);
  });

  it('says no for a different path', () => {
    expect(sameBundlePath('/a/Tortie.app', '/b/Tortie.app')).toBe(false);
  });

  it('says no when either side is null', () => {
    expect(sameBundlePath(null, '/a/Tortie.app')).toBe(false);
    expect(sameBundlePath('/a/Tortie.app', null)).toBe(false);
    expect(sameBundlePath(null, null)).toBe(false);
  });
});

describe('sameBundleOnDisk', () => {
  // The measured defect. `process.execPath` comes back symlink resolved and
  // Squirrel's state file does not have to, so an app under /var/folders
  // read as /private/var/folders on one side only. The two strings
  // disagreed, the state file read as another application's, and the
  // recovery deleted a healthy staged update on a live run.
  const real = mkdtempSync(join(tmpdir(), 'p43-same-'));
  const bundle = join(real, 'Tortie.app');
  mkdirSync(join(bundle, 'Contents'), { recursive: true });
  const resolved = join(realpathSync(real), 'Tortie.app');

  it('answers yes when only the symlinks differ', () => {
    expect(sameBundlePath(bundle, resolved)).toBe(
      realpathSync(real) === real
    );
    expect(sameBundleOnDisk(bundle, resolved)).toBe(true);
    expect(sameBundleOnDisk(`${bundle}/`, resolved)).toBe(true);
  });

  it('still says no for two different bundles', () => {
    expect(sameBundleOnDisk(bundle, join(real, 'Other.app'))).toBe(false);
    expect(sameBundleOnDisk(null, resolved)).toBe(false);
  });

  it('falls back to the strings when neither path is on disk', () => {
    expect(sameBundleOnDisk('/nope/Tortie.app', '/nope/Tortie.app/')).toBe(
      true
    );
    expect(sameBundleOnDisk('/nope/Tortie.app', '/other/Tortie.app')).toBe(
      false
    );
  });
});

describe('readRepairMarkAt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'p43-mark-'));

  it('reads null when no repair has ever run here', () => {
    expect(readRepairMarkAt(dir)).toBe(null);
  });

  it('reads the moment a repair recorded', () => {
    writeFileSync(
      join(dir, 'tortie-repair.json'),
      JSON.stringify({ repairedAt: 1_755_000_000_000 })
    );
    expect(readRepairMarkAt(dir)).toBe(1_755_000_000_000);
  });

  it('reads a malformed mark as no mark, so the wreck is still surfaced', () => {
    writeFileSync(join(dir, 'tortie-repair.json'), 'not json at all');
    expect(readRepairMarkAt(dir)).toBe(null);
    writeFileSync(
      join(dir, 'tortie-repair.json'),
      JSON.stringify({ repairedAt: 'yesterday' })
    );
    expect(readRepairMarkAt(dir)).toBe(null);
  });
});

describe('parseShipItState', () => {
  it('reads the three fields out of the JSON the plist really holds', () => {
    const state = parseShipItState(
      JSON.stringify({
        bundleIdentifier: 'com.itavero.tortie',
        targetBundleURL: 'file:///Applications/Tortie.app/',
        updateBundleURL: 'file:///Users/gdc/Library/Caches/x.ShipIt/update.A/Tortie.app/',
        launchAfterInstallation: true
      })
    );
    expect(state).toEqual({
      bundleIdentifier: 'com.itavero.tortie',
      targetBundleURL: 'file:///Applications/Tortie.app/',
      updateBundleURL:
        'file:///Users/gdc/Library/Caches/x.ShipIt/update.A/Tortie.app/'
    });
  });

  it('reads a field that is not a non empty string as null', () => {
    expect(parseShipItState(JSON.stringify({ targetBundleURL: '  ' }))).toEqual({
      bundleIdentifier: null,
      targetBundleURL: null,
      updateBundleURL: null
    });
  });

  it('returns null for anything that is not a JSON object', () => {
    expect(parseShipItState('not json')).toBe(null);
    expect(parseShipItState('[]')).toBe(null);
    expect(parseShipItState('null')).toBe(null);
    expect(parseShipItState('')).toBe(null);
  });
});

describe('bundlePathFromUrl', () => {
  it('reads a file URL as a path and anything else as null', () => {
    expect(bundlePathFromUrl('file:///Applications/Tortie.app/')).toBe(
      '/Applications/Tortie.app/'
    );
    expect(bundlePathFromUrl('/Applications/Tortie.app')).toBe(null);
    expect(bundlePathFromUrl(null)).toBe(null);
  });
});

describe('parseUpdaterCacheDirName', () => {
  // The real file, copied out of release/mac-arm64/Tortie.app/Contents/Resources.
  const REAL = [
    'owner: gregce',
    'repo: tortie',
    'provider: github',
    'releaseType: draft',
    'updaterCacheDirName: tortie-updater',
    ''
  ].join('\n');

  it('reads the name out of the real file', () => {
    expect(parseUpdaterCacheDirName(REAL)).toBe('tortie-updater');
  });

  it('returns null when the key is absent', () => {
    expect(parseUpdaterCacheDirName('owner: gregce\nrepo: tortie\n')).toBe(null);
  });

  it('returns null for an empty file', () => {
    expect(parseUpdaterCacheDirName('')).toBe(null);
  });
});

describe('shipItCacheDir', () => {
  it('derives the directory the way Squirrel does, from the job label', () => {
    expect(shipItCacheDir('/Users/gdc', 'com.itavero.tortie')).toBe(
      '/Users/gdc/Library/Caches/com.itavero.tortie.ShipIt'
    );
  });
});

// ---------------------------------------------------------------------------
// The state root override, all eight combinations of the gate
// ---------------------------------------------------------------------------

const HOME = '/Users/gdc';
const ROOT = '/tmp/p43-state-root';
const ISOLATED_PROFILE = '/tmp/tortie-rehearsal/profile';
const OPERATOR_PROFILE = '/Users/gdc/Library/Application Support/Tortie';
const REAL_SHIPIT = '/Users/gdc/Library/Caches/com.itavero.tortie.ShipIt';
const REAL_CACHE = '/Users/gdc/Library/Caches/tortie-updater';

describe('resolveUpdaterPaths', () => {
  it('uses the real paths when the variable is not set', () => {
    expect(resolveUpdaterPaths({}, HOME, 'gmux', OPERATOR_PROFILE)).toEqual({
      shipItDir: REAL_SHIPIT,
      updaterCacheDir: REAL_CACHE,
      defaultsDomain: 'com.itavero.tortie.ShipIt',
      isRehearsalRoot: false
    });
  });

  it.each([
    // [rehearsalFlag, socketName, userDataPath, honoured]
    ['1', 'gmux-update-rehearsal', ISOLATED_PROFILE, true],
    ['1', 'gmux-update-rehearsal', OPERATOR_PROFILE, false],
    ['1', 'gmux', ISOLATED_PROFILE, false],
    ['1', 'gmux', OPERATOR_PROFILE, false],
    ['', 'gmux-update-rehearsal', ISOLATED_PROFILE, false],
    ['', 'gmux-update-rehearsal', OPERATOR_PROFILE, false],
    ['', 'gmux', ISOLATED_PROFILE, false],
    ['', 'gmux', OPERATOR_PROFILE, false]
  ] as const)(
    'rehearsal=%j socket=%j profile=%j honours the root=%j',
    (flag, socket, profile, honoured) => {
      logged.length = 0;
      const env: NodeJS.ProcessEnv = { GMUX_UPDATE_STATE_ROOT: ROOT };
      if (flag !== '') env['GMUX_UPDATE_REHEARSAL'] = flag;
      const paths = resolveUpdaterPaths(env, HOME, socket, profile);
      if (honoured) {
        expect(paths).toEqual({
          shipItDir: `${ROOT}/com.itavero.tortie.ShipIt`,
          updaterCacheDir: `${ROOT}/tortie-updater`,
          // The suffix is what keeps a probe away from the domain the
          // installed app shares, because rehearsal builds carry the
          // production bundle id.
          defaultsDomain: 'com.itavero.tortie.ShipIt.rehearsal',
          isRehearsalRoot: true
        });
        expect(logged).toHaveLength(0);
      } else {
        expect(paths.shipItDir).toBe(REAL_SHIPIT);
        expect(paths.defaultsDomain).toBe('com.itavero.tortie.ShipIt');
        expect(paths.isRehearsalRoot).toBe(false);
        expect(logged.map((l) => l.message).join('\n')).toContain(
          'GMUX_UPDATE_STATE_ROOT is set, but this launch is not a confirmed rehearsal'
        );
      }
    }
  );

  it('refuses a rehearsal flag that is not exactly "1"', () => {
    const paths = resolveUpdaterPaths(
      { GMUX_UPDATE_STATE_ROOT: ROOT, GMUX_UPDATE_REHEARSAL: 'yes' },
      HOME,
      'gmux-update-rehearsal',
      ISOLATED_PROFILE
    );
    expect(paths.isRehearsalRoot).toBe(false);
    expect(paths.shipItDir).toBe(REAL_SHIPIT);
  });
});
