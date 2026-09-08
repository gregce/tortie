/**
 * WHERE ONE REPOSITORY'S BYTES COME FROM (Phase 234).
 *
 * Until this phase there was one answer and it was never written down: the
 * repository is a folder on this Mac, `createArchFileSystem` reads its
 * `docs/arch/`, `createArchGitRunner` runs the five fixed argv in it, the
 * scanner and the tree read open its files with `node:fs`, and the store is
 * keyed by its inode. A tab whose folder lives on another machine had none of
 * that, so `src/renderer/arch/state/document-actions.ts` answered `elsewhere`
 * and the pane drew its header and nothing under it.
 *
 * This module is that answer made explicit, so there can be TWO of them. It
 * hands the coordinator a source, and the coordinator asks the source for the
 * three things a run needs rather than composing them itself. Everything below
 * the coordinator, being `./run.ts`, `./checkers/`, `./scan.ts`,
 * `./tree-facts.ts`, `./reading.ts`, `./sentence.ts` and `./map.ts`, is
 * untouched and cannot tell the two apart.
 *
 * ## The two sources
 *
 * **Local.** `repoPath` is the folder. The file system, the git runner and the
 * manifests are the ones that have always been there, the watch is armed, and
 * `syncTree` does nothing because the bytes are already here.
 *
 * **Machine.** `farPath` is the folder over there and `repoPath` is a MIRROR of
 * it under `<userData>/gmux/arch-machines/<digest>`. `docs/arch/` and the five
 * git calls are read from the machine through the two seams
 * `src/main/machines/remote-arch.ts` implements, so the contract is that
 * machine's own contract and the tracked list, the history and the working tree
 * status are that machine's own git. The mirror exists for one reason: the
 * import scan hands file paths to parser workers and the tree read counts lines
 * with `node:fs`, so the BYTES have to be on this Mac for the same scanner to
 * run over them, and parsing over there would be a process on that machine,
 * which CLAUDE.md refuses. The watch is NEVER armed on a mirror, because the
 * only thing that writes to it is Tortie, and an FSEvents stream on it would
 * re-check the repository every time the mirror was brought up to date.
 *
 * ## What is keyed on what, and why the mirror is the key
 *
 * `archRepoKey` is `dev:ino` of `repoPath`, and both of the operator's machines
 * put his home at `/Users/gdc`. A remote folder keyed by its own path string
 * would therefore share a fact base, a set of verdicts and a `lastValid`
 * document with a same-named folder on this Mac. Keying on the mirror closes
 * that by construction: the mirror is a real directory of Tortie's own with its
 * own inode, and a folder on a machine can never collide with a folder here.
 *
 * ## What this module never does
 *
 * It starts nothing on the machine, it writes nothing on the machine, and it
 * never lets a value from a contract file reach an argv on either computer:
 * every git call is chosen by KIND out of the script's own text, which is
 * `./argv-guard.ts`'s claim carried across the link and proved by condition 87
 * of `npm run conformance:machines`.
 */

import { createRequire } from 'node:module';
import { join } from 'node:path';

import {
  archMirrorPath,
  createRemoteArchFileSystem,
  createRemoteArchGitRunner,
  createRemoteArchRunner,
  syncRemoteArchMirror,
  type RemoteArchRunner
} from '../machines/remote-arch';
import type { ArchGitRunner } from './git-facts';
import { createArchGitRunner } from './git-facts';
import { createArchFileSystem, type ArchFileSystem } from './load';

/** What one repository's bytes are reached through. */
export interface ArchSource {
  /**
   * The path everything BELOW the coordinator uses: the store key, the import
   * scan, the tree read, the manifests and the progress messages. For a folder
   * on this Mac it is the folder; for a folder on a machine it is the mirror.
   */
  readonly repoPath: string;
  /** The machine the folder lives on, or null when it is on this Mac. */
  readonly machineId: string | null;
  /** The folder itself, which for a machine is a path over there. */
  readonly farPath: string;
  /**
   * True when a file change under {@link repoPath} can ever reach the arch
   * watch's bus.
   *
   * It is FALSE for a mirror, and the reason is `src/main/watcher/bus.ts`:
   * `emitRepoChanged` is called by the one RepoWatcher per PROJECT ROOT, and a
   * mirror is a directory of Tortie's own under `<userData>/gmux`, which is
   * never a project root. So nothing will ever fire for it, which is exactly
   * what we want, because Tortie is the only thing that writes to it.
   *
   * It does NOT decide whether the repository is registered with the watch
   * module. Both kinds are, because `requestArchCheck` refuses a repository
   * that is not, and a folder on a machine still needs its one catch up run.
   */
  readonly watchable: boolean;
  /** The seam that reads `docs/arch/`, ready to be handed to `loadArchDocument`. */
  fileSystem(): Promise<ArchFileSystem>;
  /** The seam that runs the five fixed argv. */
  git(): ArchGitRunner;
  /**
   * Make sure the bytes the scanner and the tree read will open are the bytes
   * the folder holds. A no-op for a folder on this Mac.
   */
  syncTree(input: {
    trackedFiles: readonly string[];
    signal?: AbortSignal;
  }): Promise<{ overBudget: string | null }>;
}

/**
 * THE ONE PLACE A CHANNEL'S INPUT BECOMES A SOURCE.
 *
 * Every arch channel is asked about one folder and, since Phase 234, about the
 * machine it is on. This turns that pair into the source, so `check-coordinator.ts`,
 * `modules.ts` and the four canvas handlers all read the same answer and a
 * folder cannot be keyed one way by one channel and another way by the next.
 *
 * A missing, null or empty `machineId` is a folder on this Mac, which is every
 * input every build before this phase composed.
 */
export function archSourceOf(input: {
  cwd: string;
  machineId?: string | null;
}): ArchSource {
  const machineId =
    typeof input.machineId === 'string' && input.machineId.length > 0
      ? input.machineId
      : null;
  return machineId === null
    ? localArchSource(input.cwd)
    : machineArchSource({ machineId, farPath: input.cwd });
}

/**
 * The path the STORE is keyed by for one channel's input: the folder itself
 * here, and the mirror for a folder on a machine.
 *
 * It is deterministic, so a handler that keeps no source of its own, being the
 * four canvas channels, still keys the same rows the coordinator does.
 */
export function archRepoPathOf(input: {
  cwd: string;
  machineId?: string | null;
}): string {
  return archSourceOf(input).repoPath;
}

/** The folder on this Mac, which is what every source was until Phase 234. */
export function localArchSource(repoPath: string): ArchSource {
  return {
    repoPath,
    machineId: null,
    farPath: repoPath,
    watchable: true,
    fileSystem: () => Promise.resolve(createArchFileSystem(repoPath)),
    git: () => createArchGitRunner(repoPath),
    syncTree: () => Promise.resolve({ overBudget: null })
  };
}

/**
 * The folder on one machine, read through the exec plane and mirrored here.
 *
 * `runner` is injected so a test and a gate can drive the whole coordinator
 * over a fake link with no ssh at all. Production passes nothing and gets
 * `createRemoteArchRunner`, which refuses at once for a machine with no
 * registered connection.
 */
export function machineArchSource(input: {
  machineId: string;
  farPath: string;
  /** Where mirrors live. Defaults to `<userData>/gmux`. */
  mirrorRoot?: string;
  runner?: RemoteArchRunner;
}): ArchSource {
  const root = input.mirrorRoot ?? defaultArchMirrorRoot();
  const mirrorPath = archMirrorPath(root, input.machineId, input.farPath);
  // The runner is made ONCE per source, so one load asks
  // `readyRemoteContext` once and every call after it rides the same context.
  let held: RemoteArchRunner | null = input.runner ?? null;
  const runner = (): RemoteArchRunner => {
    held ??= createRemoteArchRunner(input.machineId);
    return held;
  };
  return {
    repoPath: mirrorPath,
    machineId: input.machineId,
    farPath: input.farPath,
    watchable: false,
    async fileSystem(): Promise<ArchFileSystem> {
      const fs = createRemoteArchFileSystem(runner(), input.farPath);
      // TWO calls for the whole of `docs/arch/` rather than one per file. A
      // read the prime did not cover still costs one call, so this is a cost
      // decision and never a correctness one.
      await fs.prime();
      return fs;
    },
    git: () => createRemoteArchGitRunner(runner(), input.farPath),
    async syncTree({ trackedFiles, signal }) {
      const pass = await syncRemoteArchMirror({
        run: runner(),
        farPath: input.farPath,
        mirrorPath,
        trackedFiles,
        ...(signal === undefined ? {} : { signal })
      });
      return { overBudget: pass.overBudget };
    }
  };
}

/**
 * `<userData>/gmux`, the protected inner directory the manifest, the symbol
 * index and `arch.db` already live in.
 *
 * electron is required LAZILY, the way `./db.ts` does it, so this module stays
 * loadable in a plain node unit test and in the conformance gates.
 */
export function defaultArchMirrorRoot(): string {
  const { app } = createRequire(import.meta.url)(
    'electron'
  ) as typeof import('electron');
  return join(app.getPath('userData'), 'gmux');
}
