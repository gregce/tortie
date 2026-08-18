#!/usr/bin/env node
/**
 * probe-fullscreen-menu.mjs. The Phase 62.1 live probe for the full screen
 * question Phase 60 left open. Rewritten in the Phase 62.1 fix round, because
 * its first version printed a pass that was not true.
 *
 * WHAT THE OPERATOR REPORTED, AND HE WAS RIGHT. The packaged View menu showed
 * two rows named "Toggle Full Screen", one bound to the globe key plus F and
 * one to control-command-F. Phase 60 could not reproduce it and wrote the
 * opposite into src/main/menu.ts. Phase 62.1 reproduced it on four launches
 * across four fresh profiles and photographed it.
 *
 * WHY EVERY EARLIER COUNT WAS WRONG. Phase 60 and this probe's first version
 * both counted rows through the accessibility interface. That interface is
 * BLIND to one of the two rows. On the packaged build it reported 15 rows and
 * one full screen row while 16 rows and two full screen rows were on screen.
 * Every accessibility query was tried and all of them answer the same blind
 * number: `menu items`, `UI elements`, `AXChildren`, `AXVisibleChildren` and
 * `entire contents`, with the menu closed and with the menu open.
 *
 * WHAT THIS PROBE CAN AND CANNOT SEE, stated plainly so nobody trusts it
 * beyond its reach.
 *
 *  - It CANNOT count the rows on screen. There is no accessibility query on
 *    this machine that returns the true count for a packaged build. The open
 *    menu's height would give it, and that is how the mechanism below was
 *    measured, but System Events reports the packaged app's View menu as
 *    closed even while it is open on screen, so the height is not available
 *    here. It is available for a dev build, and a dev build never reproduces
 *    the defect, so it is useless for this question.
 *  - It CAN see WHICH full screen row is listed, and that is the signal it
 *    asserts on. macOS names its own row differently depending on what the
 *    app declared, and the name it uses is exactly what tells the two shapes
 *    apart.
 *
 * THE MECHANISM, measured on macOS 15.7.9 with Electron 43 on 2026-08-17,
 * four packaged builds, each read from a fresh isolated profile:
 *
 *   what the app declares    rows on screen   what accessibility lists
 *   role togglefullscreen          2          "Toggle Full Screen", globe+F
 *   a plain visible item           2          "Toggle Full Screen" control-
 *                                             command-F AND "Enter Full
 *                                             Screen" globe+F
 *   nothing at all                 1          "Enter Full Screen", globe+F
 *   a hidden item (shipped)        1          "Enter Full Screen", globe+F
 *
 * So the assertion is: exactly one listed row whose name contains "Full
 * Screen", that row is named "Enter Full Screen", and it carries the globe
 * key plus F. macOS adds that row only when the app declares no full screen
 * action of its own. Every one of the two-row shapes fails at least one of
 * those three, so this probe separates all four measured shapes correctly.
 *
 * THE OTHER HALF OF THE PROOF IS A UNIT TEST, not this probe.
 * src/main/__tests__/view-menu.test.ts forbids `{ role: 'togglefullscreen' }`
 * in the template. That role is the one shape that makes the accessibility
 * read blind, so a static test is the right place to forbid it and this probe
 * is the right place to read what macOS actually did. Neither alone is proof.
 * The photograph is attached for a person to check with their own eyes.
 *
 * SAFETY. The bundle's binary is launched DIRECTLY, never through `open`, so
 * LaunchServices never registers the rehearsal build against the operator's
 * installed app. The launch carries an isolated --user-data-dir, an isolated
 * HOME and the mock keychain. It runs under build/harness-socket.mjs on
 * socket gmux-p621-menu, and it sets GMUX_UPDATE_REHEARSAL=1 because that
 * flag is what makes the app honor GMUX_TMUX_SOCKET
 * (src/main/tmux/supervisor.ts). Without it the packaged app would boot
 * against the operator's live -L gmux server. The update feed is pointed at a
 * dead loopback port, honored because all three conditions of the feed
 * override gate hold, so the run can never contact the release feed or move
 * Squirrel state. System Events targets the process by unix pid, never by
 * name, because the operator's installed Tortie may be running. The only
 * process killed is the recorded pid. The operator's server is only ever
 * LISTED, read-only, and the count is printed before and after.
 *
 * KNOWN NOISE. A fresh isolated HOME has no login keychain, so macOS puts a
 * "Keychain Not Found" dialog on screen a few seconds after launch. It does
 * not affect the read this probe asserts on, which happens against the closed
 * menu. It can sit on top of the photograph.
 *
 * THE PHOTOGRAPH. It is a fixed screen region, the top left 1100 by 760
 * points, and not a window. A dropped menu is drawn outside every window, so
 * no window rectangle contains it and the helper in build/window-shot.mjs
 * cannot be used here. Phase 73.1 added the check that goes with it: the
 * capture runs only while the app under test is the frontmost process, so the
 * probe cannot photograph the operator's screen when the app lost focus.
 *
 * WHAT THE FRONTMOST CHECK DOES NOT DO. It proves the app under test is in
 * front. It does not make the region belong to that app. The rectangle is
 * still the screen's top left corner, so another process's window sitting in
 * that corner is in the frame even on a passing run. Read the photograph as a
 * picture of that corner rather than a picture of the app.
 *
 * Usage:
 *   node build/probe-fullscreen-menu.mjs [--keep]
 * or, equivalently:
 *   npm run probe:fullscreenmenu
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { frontmostPid } from './window-shot.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const keep = process.argv.includes('--keep');

const SOCKET = 'gmux-p621-menu';
const appBundle = join(repoRoot, 'release', 'mac-arm64', 'Tortie.app');
const appBinary = join(appBundle, 'Contents', 'MacOS', 'Tortie');
const scratch = join(process.env['TMPDIR'] ?? tmpdir(), 'p62.1-menu');
const profile = join(scratch, 'profile');
const home = join(scratch, 'home');
const holderLogPath = join(scratch, 'holder.log');
const shotPath = join(repoRoot, 'out', 'p62.1-view-menu.png');

/**
 * The row macOS adds by itself, and the chord it gives it. `AXMenuItemCmdChar`
 * answers the key and `AXMenuItemCmdModifiers` answers a bit set in which 8
 * means "no command key" and 16 means the globe key. So 24 is the globe key
 * with no command, which is what macOS binds full screen to since macOS 15.
 */
const MACOS_ROW_NAME = 'Enter Full Screen';
const MACOS_ROW_CHAR = 'F';
const MACOS_ROW_MODIFIERS = '24';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Operator sessions on the REAL socket, read-only. Never anything else. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  if (out.status !== 0) return 0;
  return out.stdout.split('\n').filter((l) => l.trim().length > 0).length;
}

// ---------------------------------------------------------------------------
// Outer mode: wrap this same script under harness-socket on its own socket
// ---------------------------------------------------------------------------

if ((process.env['GMUX_TMUX_SOCKET'] ?? '') !== SOCKET) {
  const inner = `node build/probe-fullscreen-menu.mjs${keep ? ' --keep' : ''}`;
  const run = spawnSync(
    process.execPath,
    [join(repoRoot, 'build', 'harness-socket.mjs'), SOCKET, inner],
    { cwd: repoRoot, stdio: 'inherit' }
  );
  process.exit(run.status ?? 1);
}

// ---------------------------------------------------------------------------
// Inner mode: runs under harness-socket, GMUX_TMUX_SOCKET already set
// ---------------------------------------------------------------------------

if (!existsSync(appBinary)) {
  console.error(
    `[probe:fullscreenmenu] FAIL ${appBundle} is missing. Run npm run package:dir first.`
  );
  process.exit(1);
}

const before = operatorSessionCount();
console.log(`[probe:fullscreenmenu] operator sessions before: ${before}`);

rmSync(scratch, { recursive: true, force: true });
mkdirSync(profile, { recursive: true });
mkdirSync(join(home, 'Library', 'Caches'), { recursive: true });
mkdirSync(join(home, 'Library', 'Application Support'), { recursive: true });
mkdirSync(join(repoRoot, 'out'), { recursive: true });
rmSync(shotPath, { force: true });

const failures = [];

/**
 * Run one osascript and return its stdout, or null when it did not answer.
 * Every call is bounded, because an AppleScript that reaches AppKit while a
 * menu is tracking can sit there until the menu closes, and a probe that
 * hangs is worse than a probe that reports nothing.
 */
function osaTry(script, timeoutMs = 20_000) {
  const r = spawnSync('osascript', ['-e', script], {
    encoding: 'utf8',
    timeout: timeoutMs,
    killSignal: 'SIGKILL'
  });
  return r.status === 0 ? (r.stdout ?? '').trim() : null;
}

// The launch. Direct binary, isolated profile and HOME, mock keychain, the
// rehearsal flag that makes GMUX_TMUX_SOCKET honored, and a dead loopback
// feed so the updater can never reach the release feed from this run.
const holderOut = openSync(holderLogPath, 'w');
const child = spawn(
  appBinary,
  [
    `--user-data-dir=${profile}`,
    '--use-mock-keychain',
    '-ApplePersistenceIgnoreState',
    'YES'
  ],
  {
    env: {
      ...process.env,
      HOME: home,
      GMUX_UPDATE_REHEARSAL: '1',
      TORTIE_UPDATE_FEED: 'http://127.0.0.1:9/feed'
    },
    stdio: ['ignore', holderOut, holderOut]
  }
);
const pid = child.pid;
let exited = false;
child.on('exit', () => {
  exited = true;
});
child.on('error', (err) => {
  exited = true;
  failures.push(`the app failed to launch: ${err.message}`);
});
console.log(`[probe:fullscreenmenu] launched ${appBinary}, pid ${pid} (recorded)`);

/**
 * Every View menu row the accessibility interface lists, one per line, as
 * "name<TAB>cmdChar<TAB>cmdModifiers". Separators come back as "(separator)".
 * Read with the menu CLOSED, which is the only read that answers reliably for
 * a packaged build.
 */
function readViewMenuRows() {
  return osaTry(
    `set out to ""
tell application "System Events"
  tell (first process whose unix id is ${pid})
    repeat with mi in menu items of menu 1 of menu bar item "View" of menu bar 1
      set n to name of mi
      if n is missing value then set n to "(separator)"
      set c to ""
      set md to ""
      try
        set c to (value of attribute "AXMenuItemCmdChar" of mi) as text
      end try
      try
        set md to (value of attribute "AXMenuItemCmdModifiers" of mi) as text
      end try
      set out to out & n & tab & c & tab & md & linefeed
    end repeat
  end tell
end tell
return out`
  );
}

try {
  // Raise the app BEFORE any read. An AppKit menu is populated when its owner
  // is the active application, so reading a background app's menu can answer
  // an empty list that says nothing about the real menu.
  const raiseDeadline = Date.now() + 60_000;
  while (!exited && Date.now() < raiseDeadline) {
    if (
      osaTry(
        `tell application "System Events" to set frontmost of (first process whose unix id is ${pid}) to true`
      ) !== null
    ) {
      break;
    }
    await sleep(1000);
  }

  const deadline = Date.now() + 90_000;
  let rowText = null;
  while (rowText === null || rowText.length === 0) {
    if (exited) {
      failures.push(
        `the app exited before its menu bar became readable. Log: ${holderLogPath}`
      );
      break;
    }
    rowText = readViewMenuRows();
    if (rowText !== null && rowText.length > 0) break;
    if (Date.now() > deadline) {
      failures.push('the View menu was not readable within 90 s');
      break;
    }
    await sleep(1000);
  }

  if (failures.length === 0 && rowText !== null) {
    const rows = rowText
      .split('\n')
      .map((line) => line.split('\t'))
      .filter((parts) => parts.length >= 1 && parts[0].trim().length > 0)
      .map(([name, char, mods]) => ({
        name: (name ?? '').trim(),
        char: (char ?? '').trim(),
        mods: (mods ?? '').trim()
      }));
    console.log(
      `[probe:fullscreenmenu] the accessibility interface lists ${rows.length} rows, read by unix pid ${pid}:`
    );
    for (const row of rows) {
      const chord =
        row.char === '' || row.char === 'missing value'
          ? 'no chord'
          : `char ${row.char}, modifiers ${row.mods}`;
      console.log(`[probe:fullscreenmenu]   ${row.name} (${chord})`);
    }

    const fullScreen = rows.filter((r) => r.name.includes('Full Screen'));
    console.log(
      `[probe:fullscreenmenu] listed rows naming full screen: ${fullScreen.length} (${fullScreen.map((r) => r.name).join(', ') || 'none'})`
    );

    if (fullScreen.length !== 1) {
      failures.push(
        `expected exactly 1 listed full screen row, read ${fullScreen.length}. ` +
          `A second listed row means the app declares its own visible row while macOS also adds one. ` +
          `The listed rows are: ${rows.map((r) => r.name).join(' | ')}`
      );
    } else {
      const row = fullScreen[0];
      if (row.name !== MACOS_ROW_NAME) {
        failures.push(
          `the one listed full screen row is named "${row.name}", not "${MACOS_ROW_NAME}". ` +
            `macOS names its own row "${MACOS_ROW_NAME}" and only uses "Toggle Full Screen" when it is sitting next to a row this app declared. ` +
            `That is the two-row shape, and the accessibility interface hides the second row, so this name is the only warning there is.`
        );
      } else if (row.char !== MACOS_ROW_CHAR || row.mods !== MACOS_ROW_MODIFIERS) {
        failures.push(
          `the one listed full screen row carries char "${row.char}" with modifiers "${row.mods}", ` +
            `not the globe key plus F (char ${MACOS_ROW_CHAR}, modifiers ${MACOS_ROW_MODIFIERS}) that macOS gives its own row. ` +
            `A different chord means this row came from the app, not from macOS.`
        );
      } else {
        console.log(
          `[probe:fullscreenmenu] the one full screen row is "${row.name}" on the globe key plus F, which is the row macOS adds when the app declares none. ` +
            'The app declares no visible row, so this is the only one.'
        );
      }
    }

    // The evidence photo. Nothing below may change the verdict. A machine
    // without Screen Recording permission must not turn a measured pass into
    // a red run, and neither must a menu that refuses to open.
    osaTry(
      `tell application "System Events" to set frontmost of (first process whose unix id is ${pid}) to true`
    );
    await sleep(600);
    // Clicking a menu bar item can leave AppleScript inside AppKit's menu
    // tracking loop until the menu closes, so this one call is bounded. A
    // timeout here usually means the menu IS open, which is what the capture
    // wants, so the run continues either way.
    spawnSync(
      'osascript',
      [
        '-e',
        `tell application "System Events" to tell (first process whose unix id is ${pid}) to click menu bar item "View" of menu bar 1`
      ],
      { encoding: 'utf8', timeout: 5000, killSignal: 'SIGKILL' }
    );
    await sleep(1200);
    // The menu's own rectangle is not readable for a packaged build, which is
    // recorded in the header, so the capture takes the top left corner of the
    // SCREEN rather than a window. A menu is drawn outside every window, so
    // no window rectangle would contain it. The frame is therefore bounded by
    // a fixed region and by the check below, and it is taken only while the
    // app under test is in front. The View menu always drops in that corner.
    const front = frontmostPid();
    if (front !== pid) {
      console.log(
        `[probe:fullscreenmenu] no photograph taken: the app under test is not in front, so the frame would be someone else's screen. ` +
          `The frontmost process is pid ${front === null ? 'unreadable' : String(front)} and the app under test is pid ${String(pid)}.`
      );
    } else {
      const shot = spawnSync(
        'screencapture',
        ['-x', '-R0,0,1100,760', shotPath],
        { encoding: 'utf8' }
      );
      if (shot.status === 0) {
        console.log(
          `[probe:fullscreenmenu] screenshot ${shotPath} (the top left 1100 by 760 points of the screen, where the View menu drops)`
        );
      } else {
        console.log(
          `[probe:fullscreenmenu] screencapture failed (${(shot.stderr ?? '').trim()}). The row read above is the evidence.`
        );
      }
    }
    osaTry('tell application "System Events" to key code 53', 5000);
  }
} catch (err) {
  failures.push(`the run stopped early: ${err.message}`);
} finally {
  // Kill ONLY the recorded pid. SIGTERM first; SIGKILL only if it wedged.
  if (!exited && pid !== undefined) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
    const quitDeadline = Date.now() + 15_000;
    while (!exited && Date.now() < quitDeadline) {
      await sleep(250);
    }
    if (!exited) {
      console.error(
        '[probe:fullscreenmenu] the app did not quit in 15 s; SIGKILL'
      );
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // Already gone.
      }
    }
  }
}

const after = operatorSessionCount();
console.log(
  `[probe:fullscreenmenu] operator sessions after: ${after} (before: ${before})`
);
if (after !== before) {
  failures.push('the operator session count changed during the run');
}

if (failures.length > 0) {
  console.error('');
  for (const failure of failures) {
    console.error(`[probe:fullscreenmenu] FAIL ${failure}`);
  }
  console.error(`[probe:fullscreenmenu] app log: ${holderLogPath}`);
  process.exit(1);
}
if (!keep) {
  rmSync(scratch, { recursive: true, force: true });
}
console.log(
  '[probe:fullscreenmenu] PASS: the packaged View menu carries one full screen row and it is the one macOS adds'
);
