/**
 * The row you drag OUT of Tortie, and everything it refuses (Phase 154).
 *
 * ── WHY THIS IS IN MAIN AT ALL ────────────────────────────────────────────
 * A renderer can start an HTML drag and nothing else. An HTML drag carries
 * strings between pages; it cannot hand a file to Finder. Only
 * `webContents.startDrag` begins a NATIVE drag, and it needs a real path and
 * a non empty icon or macOS throws. So this module is not main doing the
 * renderer a favour, it is the capability living where it exists.
 *
 * ── WHAT IT REFUSES, AND WHY EACH REFUSAL IS HERE ─────────────────────────
 * The renderer already refuses most of these at the source. Every one is
 * checked again here, because the renderer's checks are about drawing the
 * right affordance and these are about what leaves the machine.
 *
 *  1. A `root` that is not a folder Tortie has open as a project. Without it,
 *     one bad argument turns this channel into "hand me any file on the
 *     disk", the person's ssh keys included. `resolveOpenProjectRoot` is the
 *     existing gate and it is one line.
 *  2. A path that leaves the root, through '..', through an absolute
 *     stranger, or through a directory symlink. `resolveInsideRoot`.
 *  3. Anything under `.git`, at any depth. Also `resolveInsideRoot`, through
 *     the one shared predicate.
 *  4. A path that is not on disk. A native drag that produces nothing is
 *     worse than no drag at all, because the person watches it land.
 *  5. An empty list, and a list longer than MAX_DRAG_OUT_PATHS.
 *  6. A project on ANOTHER MACHINE. There is no local file to hand over. The
 *     tree refuses at the source; the second door here is refusal 1, because
 *     a remote project's root is a path on that machine and resolving it on
 *     this one fails.
 *
 * A sender that is not one of Tortie's own windows is refused for free by
 * `assertTrustedIpcSender` inside the one typed `handle` wrapper.
 *
 * ── THE IN DIRECTION IS NOT THIS DIRECTION'S MIRROR ───────────────────────
 * `fs:importPaths` is the other half of this phase and it is deliberately
 * NOT bounded the way refusal 1 above bounds this one. It can read any file
 * on the disk, because that is what a drop from outside MEANS: the person
 * picked the file in Finder and the source is not Tortie's to choose. Only
 * the DESTINATION is guarded there. The two channels look like a pair and
 * they are not one, so this is written down rather than left to be inferred:
 * do not loosen this side to match that one, and do not tighten that side to
 * match this one. What makes the asymmetry safe is that nothing outside
 * Tortie can call either. No third party code runs in any Tortie process
 * (CLAUDE.md refusal 1) and an agent inside a pane cannot reach IPC at all.
 *
 * ── WHAT IS NOT PROVED ABOUT THIS MODULE, STATED PLAINLY ──────────────────
 * Everything up to the `startDrag` call is measured. Nothing past it is.
 * Once macOS owns the drag loop no test here can follow the file to where
 * the person let go of it, so the charter's byte for byte comparison against
 * a real Finder destination is an operator step and not an automated one.
 * See the same note in build/probe-p154-drop.mjs.
 *
 * ── THE ICON, AND THE DEADLINE ON IT ──────────────────────────────────────
 * macOS throws on `startDrag` with an empty icon, so the icon is not
 * decoration. `app.getFileIcon` reads the system icon for the file and it is
 * asynchronous, which puts it inside the window where the mouse button is
 * still down. It is raced against a deadline and a one pixel transparent
 * image is used when the deadline wins, because a plain looking drag is a
 * far better outcome than no drag.
 *
 * The Electron surface is injected so every refusal above is unit testable
 * without an Electron.
 */

import { basename } from 'node:path';
import { lstat } from 'node:fs/promises';
import type { FsStartDragInput } from '@shared/fs-ops';
import { MAX_DRAG_OUT_PATHS } from '@shared/fs-ops';
import { gmuxError } from '../errors';
import { fsOpError } from './errors';
import { resolveInsideRoot, resolveOpenProjectRoot } from './paths';

/** What `webContents.startDrag` is handed. */
export interface DragOutItem {
  file: string;
  files: string[];
  icon: unknown;
}

export interface DragOutDeps {
  /** The folders Tortie has open, same authority the file verbs use. */
  listProjectRoots(): Promise<readonly string[]>;
  /** `app.getFileIcon` — the system icon for one file. */
  fileIcon(path: string): Promise<unknown>;
  /** A non empty image to fall back on. `nativeImage.createEmpty()` is not. */
  placeholderIcon(): unknown;
  /** `event.sender.startDrag`. */
  startDrag(item: DragOutItem): void;
}

/**
 * How long the system icon lookup may take before the drag goes without it.
 *
 * The whole call has to finish while the mouse button is still down. 250 ms
 * is long enough for a cold LaunchServices answer and short enough that a
 * person cannot let go inside it.
 */
export const ICON_DEADLINE_MS = 250;

export interface DragOutService {
  begin(input: FsStartDragInput): Promise<void>;
}

/** Race the system icon against the deadline; never reject. */
async function iconFor(
  deps: DragOutDeps,
  path: string,
  deadlineMs: number
): Promise<unknown> {
  let timer: NodeJS.Timeout | undefined;
  const placeholder = deps.placeholderIcon();
  try {
    const icon = await Promise.race([
      deps.fileIcon(path).catch(() => placeholder),
      new Promise<unknown>((resolve) => {
        timer = setTimeout(() => {
          resolve(placeholder);
        }, deadlineMs);
      })
    ]);
    // An icon that came back empty is the one shape macOS throws on, and
    // `isEmpty` is the only thing this module asks a NativeImage.
    const empty = (icon as { isEmpty?: () => boolean } | null)?.isEmpty;
    if (icon === null || icon === undefined) return placeholder;
    if (typeof empty === 'function' && empty.call(icon)) return placeholder;
    return icon;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export function createDragOut(
  deps: DragOutDeps,
  options: { iconDeadlineMs?: number } = {}
): DragOutService {
  const deadlineMs = options.iconDeadlineMs ?? ICON_DEADLINE_MS;
  return {
    async begin(input: FsStartDragInput): Promise<void> {
      if (!Array.isArray(input.paths) || input.paths.length === 0) {
        throw gmuxError('INVALID_INPUT', 'Nothing was dragged.');
      }
      if (input.paths.length > MAX_DRAG_OUT_PATHS) {
        throw gmuxError(
          'INVALID_INPUT',
          `One drag can carry ${String(MAX_DRAG_OUT_PATHS)} items at most.`,
          String(input.paths.length)
        );
      }
      const realRoot = await resolveOpenProjectRoot(input.root, () =>
        deps.listProjectRoots()
      );

      const files: string[] = [];
      for (const raw of input.paths) {
        const resolved = await resolveInsideRoot(realRoot, raw);
        try {
          await lstat(resolved.abs);
        } catch {
          throw fsOpError(
            Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
            'copy',
            basename(resolved.abs)
          );
        }
        files.push(resolved.abs);
      }

      const first = files[0];
      if (first === undefined) {
        throw gmuxError('INVALID_INPUT', 'Nothing was dragged.');
      }
      const icon = await iconFor(deps, first, deadlineMs);
      // `file` is what a single item drag reads; `files` is what a multi item
      // drag reads. Electron wants both, and the first entry must agree.
      deps.startDrag({ file: first, files, icon });
    }
  };
}
