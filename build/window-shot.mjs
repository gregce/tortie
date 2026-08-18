/**
 * window-shot.mjs. The one screenshot helper every probe photographs through,
 * so that no probe can photograph the whole screen.
 *
 * WHY THIS EXISTS. Three probes called `screencapture -x <path>` with no
 * region and no window target. That form photographs the whole active space.
 * When the app under test was not in front, the file held whatever the person
 * was looking at instead. It happened on 2026-08-17 during Phase 70's
 * verification and caught the operator's own desktop. The files were deleted
 * immediately and nothing from them was read further or reported.
 *
 * WHAT IT DOES. It reads which process is in front, refuses unless that is the
 * app under test, reads the position and size of window 1 of that process
 * through System Events, and photographs only that rectangle.
 *
 * WHAT IT IS NOT, and this matters. This is a RECTANGLE read from the app's
 * own window, not a window id. `screencapture -l` takes a CGWindowID and macOS
 * gives no scriptable way to get one, so a window that is sitting on top of the
 * app's own window inside that rectangle is still in the frame. Only a real
 * window id capture would avoid that, and there is no way to ask for one from
 * a script. The frontmost check is what keeps the frame the app's, and the
 * limit above is what it cannot do.
 *
 * "Window 1" is the process's own frontmost window. When a dialog is up, the
 * dialog is window 1 and the photograph is of the dialog. That is what the
 * dialog probes want.
 *
 * The helper takes NO photograph at all in four cases, and prints which one
 * stopped it:
 *   - no pid for the app under test was given;
 *   - the app under test is not the frontmost process;
 *   - window 1 has no readable rectangle;
 *   - `screencapture` itself failed.
 * It never falls back to the whole screen in any of them.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * The unix pid of the process that is in front right now, or null when
 * System Events would not answer.
 *
 * Probes that keep their own rectangle, e.g. a menu that is drawn outside
 * every window, call this directly and skip the capture when it is not theirs.
 */
export function frontmostPid() {
  const r = spawnSync(
    'osascript',
    [
      '-e',
      'tell application "System Events" to get unix id of (first application process whose frontmost is true)'
    ],
    { encoding: 'utf8', timeout: 10_000 }
  );
  if (r.status !== 0) return null;
  const n = Number((r.stdout ?? '').trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The rectangle of window 1 of the process, in points, or null. */
function windowRect(pid) {
  const r = spawnSync(
    'osascript',
    [
      '-e',
      `tell application "System Events"
  tell (first process whose unix id is ${pid})
    set p to position of window 1
    set s to size of window 1
    return ((item 1 of p) as text) & "," & ((item 2 of p) as text) & "," & ((item 1 of s) as text) & "," & ((item 2 of s) as text)
  end tell
end tell`
    ],
    { encoding: 'utf8', timeout: 10_000 }
  );
  if (r.status !== 0) return null;
  const parts = (r.stdout ?? '').trim().split(',').map((v) => Number(v.trim()));
  if (parts.length !== 4 || parts.some((v) => !Number.isFinite(v))) return null;
  const [x, y, w, h] = parts;
  if (w <= 0 || h <= 0) return null;
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

/**
 * Photograph the window of the app under test, or take no photograph at all.
 *
 * @param {{ pid: number | null | undefined, path: string, log?: (line: string) => void }} args
 * @returns {'saved' | 'not-frontmost' | 'no-window' | 'failed'}
 */
export function windowShot({ pid, path, log }) {
  const say = typeof log === 'function' ? log : () => {};
  if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) {
    say(
      'no photograph taken: the app under test has no readable window rectangle. No pid was given, so there is no window to read.'
    );
    return 'no-window';
  }
  const front = frontmostPid();
  if (front !== pid) {
    say(
      `no photograph taken: the app under test is not in front, so the frame would be someone else's screen. ` +
        `The frontmost process is pid ${front === null ? 'unreadable' : String(front)} and the app under test is pid ${String(pid)}.`
    );
    return 'not-frontmost';
  }
  const rect = windowRect(pid);
  if (rect === null) {
    say('no photograph taken: the app under test has no readable window rectangle.');
    return 'no-window';
  }
  mkdirSync(dirname(path), { recursive: true });
  const r = spawnSync(
    'screencapture',
    ['-x', `-R${rect.x},${rect.y},${rect.w},${rect.h}`, path],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) {
    say(
      `no photograph taken: screencapture failed (${(r.stderr ?? '').trim()}). The reads above are the evidence.`
    );
    return 'failed';
  }
  say(
    `photograph saved to ${path}. It is the app's own window rectangle, ${String(rect.w)} by ${String(rect.h)} points at ${String(rect.x)},${String(rect.y)}, and not the screen.`
  );
  return 'saved';
}
