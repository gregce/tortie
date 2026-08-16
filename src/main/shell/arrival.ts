/**
 * What a path arriving from Finder becomes (Phase 61).
 *
 * The open-file Apple event hands main one path per event. This module turns
 * that path into exactly one of three answers:
 *
 *  - a folder to open as a project tab;
 *  - a file, plus the project folder it opens inside;
 *  - a refusal, with the reason for the one log line.
 *
 * A file's project is the nearest enclosing git repository root above it,
 * or its parent folder when no repository exists. The walk checks for a
 * `.git` entry with existsSync only, directory or file, so ordinary clones,
 * worktrees and submodules all resolve. No git process is spawned.
 *
 * THE CAP (research 48 section 9.3): nothing here can start an agent,
 * select an agent or run a command. This module imports the filesystem and
 * the two shared extension lists, and nothing else.
 */

import { existsSync, realpathSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isImagePath } from '@shared/image-types';
import { isOpenablePath } from '@shared/openable';

export type ShellArrival =
  | { kind: 'folder'; folder: string }
  | {
      kind: 'file';
      /** The project folder the file opens inside. */
      folder: string;
      /** The file itself, real path. */
      file: string;
      /** True when a `.git` entry above the file chose the folder. */
      repository: boolean;
      /**
       * True when Tortie has a viewer for this file type. It gates NOTHING.
       * It only decides which log line main writes. A non-displayable file
       * still opens its project and its tab, and the editor's existing
       * refusal sentence is the tab's no-viewer state.
       */
      displayable: boolean;
    }
  | { kind: 'refused'; reason: string };

/**
 * The reason for both root and home refusals. A project's watcher and
 * indexes walk the whole project tree, and the home directory is not a
 * project.
 */
export const WHOLE_DISK_REASON =
  'Tortie does not open the whole disk or the whole home folder as a project';

/** True for the filesystem root, the one path that is its own parent. */
function isRootPath(path: string): boolean {
  return dirname(path) === path;
}

/**
 * Resolve one arriving path. Pure except for filesystem stats: realpath,
 * one stat, and an existsSync walk toward the root.
 */
export function resolveShellArrival(
  rawPath: string,
  home: string
): ShellArrival {
  let real: string;
  let isDirectory: boolean;
  try {
    real = realpathSync(rawPath);
    isDirectory = statSync(real).isDirectory();
  } catch {
    return { kind: 'refused', reason: 'does not exist' };
  }

  // The home directory compared by real path, so a symlinked home still
  // matches. When home itself cannot resolve, compare the raw spelling.
  let realHome: string;
  try {
    realHome = realpathSync(home);
  } catch {
    realHome = home;
  }

  if (isDirectory) {
    if (isRootPath(real) || real === realHome) {
      return { kind: 'refused', reason: WHOLE_DISK_REASON };
    }
    return { kind: 'folder', folder: real };
  }

  // A file: walk up from its containing directory looking for a `.git`
  // entry. The walk stops at the filesystem root.
  let repoRoot: string | null = null;
  for (let at = dirname(real); ; at = dirname(at)) {
    if (existsSync(join(at, '.git'))) {
      repoRoot = at;
      break;
    }
    if (isRootPath(at)) break;
  }
  const folder = repoRoot ?? dirname(real);
  if (isRootPath(folder) || folder === realHome) {
    return { kind: 'refused', reason: WHOLE_DISK_REASON };
  }
  return {
    kind: 'file',
    folder,
    file: real,
    repository: repoRoot !== null,
    displayable: isOpenablePath(real) || isImagePath(real)
  };
}
