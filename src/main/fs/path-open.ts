/**
 * THE ONE DOOR THAT LEAVES TORTIE (Phase 247).
 *
 * A path an agent printed into a transcript, handed to macOS. This is the
 * whole of that capability and it is the riskiest twelve lines in the product,
 * so everything about it is written down here rather than inferred.
 *
 * ## What the operator lifted, and what he did not
 *
 * Research 107 refusal 1 read "a click never runs anything. No
 * `shell.openPath`, no `shell.openExternal` on a path, no Open With, no
 * LaunchServices, no `/usr/bin/open`. Opening is not executing." He lifted it
 * narrowly on 2026-09-09: Tortie first, Preview as the fallback. The REASON
 * the refusal existed did not go away with it. `shell.openPath` hands a string
 * to LaunchServices, which picks a program by extension and RUNS it, and the
 * text that named the path was written by an agent that may be running with
 * its safeguards off.
 *
 * So the lift is bounded twice over, and both bounds are asked HERE and not
 * only in the renderer:
 *
 *   - an ALLOWLIST of kinds, `EXTERNAL_ALLOW` in src/shared/path-doors.ts,
 *     which is one extension and is never a denylist of dangerous ones;
 *   - a MODE check, asked before the extension is read, so a `.pdf` carrying
 *     the executable bit is refused rather than opened.
 *
 * ## Why it re-asks everything, and why that is not belt and braces
 *
 * The renderer's answer is a HOVER answer and hover answers are cached: the
 * file at a spelling can be replaced between the underline being drawn and the
 * click landing, and replacing it is exactly what an attack would do. So
 * nothing the renderer sends is trusted here beyond the spelling, and
 * `answerPathDoor` runs again inside main on the way through. Phase 235 is the
 * precedent: `fs:reveal` is ungated in main, its rule lives at every call
 * site, and that shape needed six doors and three rounds inside one phase to
 * hold.
 *
 * ## THE WINDOW THAT CANNOT BE CLOSED, stated because it is the one that acts
 *
 * Between `answerPathDoor` answering and `shell.openPath` being called, the
 * file at that realpath can be replaced. `shell.openPath` takes a PATH and not
 * a descriptor, so there is nothing to hold open across the gap: the sequence
 * cannot hand macOS the bytes it inspected, only the name it inspected them
 * under. Every other write channel in this product carries the same paragraph
 * for the same reason — `src/main/fs/guarded-write.ts` measured its own window
 * at 23.6 ms and closed what it could with an `lstat`-to-`rename` comparison,
 * and this one has no equivalent, because the acting call is somebody else's.
 *
 * WHAT BOUNDS IT is that the window is two `await`s wide and holds no I/O of
 * its own, and that the thing on the far side of it picks a program by
 * EXTENSION: a replacement that changes what LaunchServices runs has to keep
 * the name, so it has to be a `.pdf` — `EXTERNAL_ALLOW` is one extension and a
 * `.pdf` handed to Preview is a document being decoded rather than a program
 * being started. A replacement that changes the name is a different path and
 * this channel was never asked about it. A replacement that puts an executable
 * bit on the same name changes nothing macOS reads, since LaunchServices is
 * given `.pdf` either way.
 *
 * It is a real window and it is not measured here, because measuring it means
 * really opening something and nothing in this phase ever does.
 *
 * ## Why this is a new channel when refusal 6 says not to add one
 *
 * `shell.openPath` exists only in main, so a click in the renderer reaches it
 * through a channel or not at all. The contract already holds exactly one
 * channel that hands a file to an application, `fs:openWith`, and its
 * `resolveTarget` requires an OPEN PROJECT ROOT and proves the file inside it.
 * Reusing it would mean deleting `resolveOpenProjectRoot` from the one call
 * site research 107 section 8 cites as the argument against this whole
 * capability. A new narrow channel that re-asks everything is strictly safer
 * than widening that one, which is research 111 section 5.3's measured
 * argument and is why refusal 6 could not hold literally for this half.
 */

import { shell } from 'electron';
import { appendFile } from 'node:fs/promises';
import type { PathOpenOutcome } from '@shared/ipc';
import { answerPathDoor } from './path-door';

/**
 * The harness seam, and the reason no probe ever opens anything.
 *
 * `GMUX_PATH_OPEN_RECORD` names a file; when it is set, an open appends one
 * JSON line naming the path and STARTS NOTHING. Unset in every real run and
 * every packaged build. It is the same shape as `GMUX_OPEN_WITH_RECORD` in
 * ./open-with.ts, which already exists for exactly this reason, and it is what
 * lets an app run read what LaunchServices would have been handed without
 * LaunchServices ever being handed it.
 */
export function openRecorder(): ((path: string) => Promise<void>) | null {
  const target = process.env['GMUX_PATH_OPEN_RECORD'];
  if (target === undefined || target.length === 0) return null;
  return async (path) => {
    await appendFile(target, `${JSON.stringify({ open: path })}\n`, 'utf8');
  };
}

/** What main needs to do this, injected so a test never reaches the real one. */
export interface PathOpenDeps {
  /** Resolves '' on success and a message otherwise, which is Electron's own. */
  open(path: string): Promise<string>;
  record: ((path: string) => Promise<void>) | null;
}

/** Production dependencies. This is the ONLY `shell.openPath` in the domain. */
export function defaultPathOpenDeps(): PathOpenDeps {
  return {
    open: (path) => shell.openPath(path),
    record: openRecorder()
  };
}

/**
 * Hand one path to macOS, or refuse it.
 *
 * The sequence runs FIRST and the answer decides. Only `door: 'mac'` opens,
 * and what is handed on is the REALPATH the sequence resolved — never the
 * spelling the renderer sent, which is what a link planted between the hover
 * and the click would have changed.
 */
export async function openPathExternally(
  raw: unknown,
  deps: PathOpenDeps
): Promise<PathOpenOutcome> {
  if (typeof raw !== 'string' || raw.length === 0) {
    return { status: 'refused', reason: 'not-absolute' };
  }
  const answer = await answerPathDoor(raw);
  if (answer.door === null) {
    return { status: 'refused', reason: answer.refusal };
  }
  if (answer.door !== 'mac') {
    // Tortie draws this kind, so it never leaves. The renderer routes it
    // itself and never calls this, and main says so rather than assuming it.
    return { status: 'refused', reason: 'tortie-draws-it' };
  }
  if (deps.record !== null) {
    await deps.record(answer.path);
    return { status: 'opened' };
  }
  const message = await deps.open(answer.path);
  if (message.length > 0) return { status: 'failed', message };
  return { status: 'opened' };
}
