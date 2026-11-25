/**
 * Does the person already have an Antigravity status line of their own
 * (Phase 374)?
 *
 * HIS ANSWER OF 2026-11-24 BOUNDS THIS FILE: yes to reading the PRESENCE of one
 * key, `statusLine`, in agy's own settings file, and nothing else of it. It is
 * the only file under his home this phase's code ever reads. One boolean
 * leaves; no value, no other key and no byte of the file is kept, logged or
 * sent. It is asked at a create, with the switch on, and at no other time. A
 * workspace's own settings are not read: his word covers one file.
 *
 * WHY IT IS ASKED. `--settings` outranks the file, so Tortie's status line would
 * silently stand in for his inside sessions Tortie starts. Composing his inside
 * Tortie's would mean reading a command out of a configuration file and running
 * it, which the project refuses. So Tortie stands aside and the row says why.
 *
 * EVERYTHING THAT IS NOT A CLEAR NO IS A YES. A file that cannot be read, is
 * not a regular file, is too large or does not parse says nothing about his
 * status line, and standing aside costs a meter while the other answer could
 * cost him his own line.
 */

import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** The most of that file that is ever read. */
const MAX_BYTES = 256 * 1024;

/** agy's own settings file, from a home. The one path under a home in this domain. */
function settingsFile(home: string): string {
  return join(home, '.gemini', 'antigravity-cli', 'settings.json');
}

/** The text of a regular file no larger than the cap, or null. */
function textOf(path: string): string | null {
  let fd = -1;
  try {
    // Asked of the name BEFORE it is opened, so a pipe or a device standing
    // there is never opened, and asked again of what was opened.
    const named = statSync(path);
    if (!named.isFile() || named.size > MAX_BYTES) return null;
    fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
    const st = fstatSync(fd);
    if (!st.isFile() || st.size > MAX_BYTES) return null;
    const buf = Buffer.alloc(MAX_BYTES + 1);
    let held = 0;
    for (;;) {
      const read = readSync(fd, buf, held, buf.length - held, null);
      if (read === 0) break;
      held += read;
      if (held > MAX_BYTES) return null;
    }
    return buf.toString('utf8', 0, held);
  } catch {
    return null;
  } finally {
    if (fd >= 0) {
      try {
        closeSync(fd);
      } catch {
        /* nothing to say about a descriptor */
      }
    }
  }
}

/**
 * TRUE when Tortie must stand aside for `home`'s own Antigravity settings.
 * See the file header for what false means.
 */
export function agyOwnsStatusLine(home: string): boolean {
  if (!home.startsWith('/')) return true;
  const path = settingsFile(home);
  try {
    lstatSync(path);
  } catch (err) {
    // No such file is the one answer a missing file gives. A name in the way,
    // or a folder that may not be searched, is not a clear no.
    return (err as NodeJS.ErrnoException).code !== 'ENOENT';
  }
  const text = textOf(path);
  if (text === null) return true;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return true;
    const line = (parsed as Record<string, unknown>)['statusLine'];
    if (line === undefined || line === null) return false;
    // Switched off means an object saying so. A string, a number or `false`
    // itself says no such thing, so it is his.
    return (line as { enabled?: unknown }).enabled !== false;
  } catch {
    return true;
  }
}
