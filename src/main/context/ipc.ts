/**
 * The ONE `context:*` registrar (research 29 §12), called once from
 * main-process boot:
 *
 *     import { registerContextIpc } from './context/ipc';
 *     registerContextIpc(ipcMain, () => manifestStore());
 *
 * Six channels, and the split between them is the whole safety story of this
 * phase.
 *
 * ## Read and write are different channels, and only one of them spawns
 *
 * `context:scan`, `context:sessionSnapshot` and `context:hashSkill` read. They
 * walk files. They start no process, open no socket and return no credential,
 * and none of them can change anything on the machine. `context:skillsPlan`
 * builds a command and does not run it. `context:skillsRun` is the only channel
 * in Tortie that spawns the skills CLI, and it is the only one a person has to
 * confirm before it fires.
 *
 * ## The renderer never assembles a command
 *
 * The renderer sends a typed `SkillsOperation`, main turns it into argv, and the
 * confirm shows what main built. On the way back `executeSkillsPlan` rebuilds
 * the argv from `plan.operation` and refuses if the command line changed, so the
 * plan object is a thing to look at rather than a thing to trust. That also
 * re-runs the lock guard and the CLI resolution at the moment of execution,
 * because a confirm sits on screen for as long as a person takes to read it and
 * the lock file can move underneath it.
 *
 * ## Why the launch snapshot is registered here and not from `index.ts`
 *
 * It was registered separately during the parallel build. One registrar per
 * domain is growth guardrail 2, and two of them for one domain is how a later
 * round adds a seventh channel to whichever file it happened to open. It takes
 * its store as an argument, so folding it in cost one line.
 */

import type { IpcMain } from 'electron';
import { gmuxError } from '../errors';
import { handle } from '../typed-ipc';
import type {
  ContextSkillHash,
  ContextSkillPinCheck,
  ContextSkillPinInput,
  ContextSkillsRunInput
} from '@shared/ipc';
import type {
  SkillAuditResult,
  SkillPreviewResult,
  SkillSearchResult,
  SkillsPlanResult,
  SkillsRunResult
} from '@shared/skills';
import { skillsCapability } from '../skills';
import { executeSkillsPlan, planSkillsCommand } from '../skills/run';
import { auditSkills, previewSkill, searchSkills } from '../skills/sources';
import {
  canonicalSkillDir,
  checkSkillPins,
  forgetSkillPin,
  recordSkillPin
} from '../skills/pins';
import { HASH_ALGORITHM, hashDirectory } from './hash';
import { createNodeContextFs } from './port';
import { scanContext } from './scan';
import { registerContextSnapshotIpc, type ContextSnapshotReader } from './session-ipc';

/**
 * How long one scan may take before the caller is told it failed.
 *
 * Measured warm at 67 to 85 ms for ten agents and five categories, and 596 ms
 * on a cold page cache. This is not a performance budget. It is a leash for the
 * case the reader is walking a network mount that has gone away, where the walk
 * never settles at all and the panel would otherwise show a spinner forever.
 */
const SCAN_DEADLINE_MS = 20_000;

function deadline<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        gmuxError(
          'FS_FAILED',
          `Tortie stopped reading ${what} after ${Math.round(ms / 1000)} seconds. ` +
            `One of the configuration folders did not answer. Nothing was changed.`
        )
      );
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    );
  });
}

/**
 * Everything the write channels need from the caller.
 *
 * `projectRoot` is required for a project-scoped operation and `planSkillsCommand`
 * refuses without one rather than falling back to a directory. The app's own
 * inherited working directory under a GUI launch is `/`, and from a terminal it
 * is very plausibly a repository the user is working in, so a fallback here
 * would write skills into whatever directory the app happened to start in.
 */
function runContext(input: ContextSkillsRunInput): { projectRoot?: string } {
  const root = input.projectRoot;
  return typeof root === 'string' && root.length > 0 ? { projectRoot: root } : {};
}

export function registerContextIpc(
  ipc: IpcMain,
  getStore: () => Promise<ContextSnapshotReader | null>
): void {
  // The launch snapshot, folded in so there is one registrar for this domain.
  registerContextSnapshotIpc(ipc, getStore);

  handle(ipc, 'context:scan', async (_e, input) => {
    if (input === null || typeof input !== 'object') {
      throw gmuxError('INVALID_INPUT', 'Tortie was asked to read configuration with no project.');
    }
    return deadline(scanContext(input), SCAN_DEADLINE_MS, 'agent configuration');
  });

  handle(ipc, 'context:skillsCapability', async () => skillsCapability());

  handle(ipc, 'context:skillsPlan', async (_e, input): Promise<SkillsPlanResult> => {
    if (input === null || typeof input !== 'object' || typeof input.operation?.kind !== 'string') {
      throw gmuxError('INVALID_INPUT', 'Tortie was asked to plan a skills command with no operation.');
    }
    return planSkillsCommand(input.operation, runContext(input));
  });

  handle(ipc, 'context:skillsRun', async (_e, input): Promise<SkillsRunResult> => {
    if (input === null || typeof input !== 'object' || typeof input.operation?.kind !== 'string') {
      throw gmuxError('INVALID_INPUT', 'Tortie was asked to run a skills command with no operation.');
    }
    // The plan is rebuilt here rather than accepted from the renderer, which is
    // the same rule `executeSkillsPlan` applies to the argv one level down. The
    // renderer sends what it wants done, never how to do it.
    const planned = await planSkillsCommand(input.operation, runContext(input));
    if (planned.refused) {
      return {
        ok: false,
        commandLine: '',
        displayCommand: '',
        cwd: input.projectRoot ?? '',
        exitCode: null,
        timedOut: false,
        spawnError: null,
        stderrTail: '',
        stdout: '',
        durationMs: 0,
        failure: planned.message
      };
    }
    return executeSkillsPlan(planned.plan, runContext(input));
  });

  // -------------------------------------------------------------------------
  // The source layer. Three READS, none of which touches the CLI and none of
  // which changes anything on the machine. They exist because requirement 4
  // says the scan is shown BEFORE the install control, and a scan needs
  // something to scan.
  // -------------------------------------------------------------------------

  handle(ipc, 'context:skillsSearch', async (_e, input): Promise<SkillSearchResult> => {
    if (input === null || typeof input !== 'object' || typeof input.query !== 'string') {
      throw gmuxError('INVALID_INPUT', 'Tortie was asked to search for a skill with no query.');
    }
    return searchSkills(input.query, {
      ...(typeof input.limit === 'number' ? { limit: input.limit } : {}),
      ...(typeof input.owner === 'string' ? { owner: input.owner } : {})
    });
  });

  handle(ipc, 'context:skillsAudit', async (_e, input): Promise<SkillAuditResult> => {
    if (input === null || typeof input !== 'object' || typeof input.source !== 'string') {
      throw gmuxError('INVALID_INPUT', 'Tortie was asked for a safety scan with no source.');
    }
    return auditSkills(input.source, Array.isArray(input.skills) ? input.skills : []);
  });

  handle(ipc, 'context:skillsPreview', async (_e, input): Promise<SkillPreviewResult> => {
    if (
      input === null ||
      typeof input !== 'object' ||
      typeof input.source !== 'string' ||
      typeof input.skill !== 'string'
    ) {
      throw gmuxError('INVALID_INPUT', 'Tortie was asked to read a skill with no source.');
    }
    return previewSkill(input.source, input.skill);
  });

  // -------------------------------------------------------------------------
  // The pin. Requirement 2, and the reason installing can ship at all.
  //
  // `context:skillPinRecord` is called ONLY from the success path of an install
  // that exited 0, and it hashes the directory at that moment. `context:skillPins`
  // re-hashes on every refresh and hands back both hashes so the renderer's gate
  // can compare them. Both hashes are Tortie's own; neither is ever the CLI's
  // `skillFolderHash`, which is a git tree id for a GitHub source and could
  // never equal a sha256 of the same folder.
  // -------------------------------------------------------------------------

  handle(ipc, 'context:skillPins', async (_e, paths): Promise<ContextSkillPinCheck[]> => {
    if (!Array.isArray(paths)) {
      throw gmuxError('INVALID_INPUT', 'Tortie was asked to check pins with no paths.');
    }
    return checkSkillPins(paths.filter((p): p is string => typeof p === 'string'));
  });

  handle(
    ipc,
    'context:skillPinRecord',
    async (_e, input: ContextSkillPinInput): Promise<ContextSkillPinCheck | null> => {
      if (input === null || typeof input !== 'object' || typeof input.name !== 'string') {
        throw gmuxError('INVALID_INPUT', 'Tortie was asked to pin a skill with no name.');
      }
      // The path is resolved HERE when the caller does not have one, which is
      // the normal case right after an install: the renderer's list is a
      // filesystem read that has not run yet, so it has no row to read a path
      // off. `canonicalSkillDir` uses the reader's own home resolution.
      const path =
        typeof input.path === 'string' && input.path.length > 0
          ? input.path
          : canonicalSkillDir(input.name, input.scope ?? 'global', input.projectRoot);
      if (path === null) return null;
      const pin = await recordSkillPin({
        path,
        name: input.name,
        source: typeof input.source === 'string' ? input.source : '',
        agents: Array.isArray(input.agents) ? input.agents : []
      });
      if (pin === null) return null;
      return {
        path: pin.path,
        name: pin.name,
        source: pin.source,
        pinnedHash: pin.hash,
        currentHash: pin.hash,
        pinnedAt: pin.at,
        problem: null
      };
    }
  );

  handle(ipc, 'context:skillPinForget', async (_e, path): Promise<void> => {
    if (typeof path !== 'string' || path.length === 0) return;
    forgetSkillPin(path);
  });

  handle(ipc, 'context:hashSkill', async (_e, path): Promise<ContextSkillHash> => {
    if (typeof path !== 'string' || path.length === 0) {
      throw gmuxError('INVALID_INPUT', 'Tortie was asked to check a skill with no path.');
    }
    const fs = createNodeContextFs();
    try {
      const hash = await hashDirectory(fs, path);
      return {
        path,
        hash,
        algorithm: HASH_ALGORITHM.full,
        // A null hash is a directory that could not be read. The install gate
        // treats that as CHANGED and never as agreement, so this sentence is
        // what the user sees rather than a silent pass.
        problem: hash === null ? `Tortie could not read ${path} to check whether it changed.` : null
      };
    } catch (err) {
      return {
        path,
        hash: null,
        algorithm: HASH_ALGORITHM.full,
        problem: `Tortie could not read ${path} to check whether it changed. ${
          err instanceof Error ? err.message : String(err)
        }`
      };
    }
  });
}
