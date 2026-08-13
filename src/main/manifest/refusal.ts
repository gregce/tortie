/**
 * refusal.ts — what the person sees when this build must not touch their
 * session list (Phase 21 fix round, research 27 §4.4).
 *
 * ## The defect this closes
 *
 * Research 27 §4.4 states the refusal in three parts. Do not run migrations.
 * Do not open for writing. Show a blocking, plain language screen with Quit
 * and Reveal data folder. Phase 21 built the first two and proved them. It did
 * not build the third, and `isSchemaRefusal` had no caller anywhere in the
 * app, so the typed error fell through to the generic IPC path.
 *
 * A verifier drove the real app against a manifest stamped
 * `min_compatible_version` 9 and read the screenshot. The window opened on the
 * empty home screen, headed "Sessions you start keep running even when Tortie
 * is closed", offering Open project, New project and Clone repository. The
 * only sign of trouble was a toast in the corner reading "Error invoking
 * remote method 'projects:list': DatabaseTooNewError: This copy of Tortie
 * is…", cut off before the honest part of the sentence. A person in that state
 * sees every session gone and an invitation to start a new project.
 *
 * ## The shape
 *
 * Two halves, and the split is deliberate. THIS file is pure: it decides
 * whether there is a refusal and it holds the words. `../notice/refusal.ts`
 * shows the dialog and imports Electron. So the copy the user reads can be
 * unit tested without an Electron process, and the decision can be made before
 * a window exists.
 *
 * ## Why a dialog and not a renderer screen
 *
 * The renderer's first paint asks for the session list, which is the call that
 * cannot be answered. A window that opens and then apologises has already told
 * the user their sessions are gone. The check runs before the window is
 * created, so the window is never created at all.
 *
 * ## What the refusal costs the user
 *
 * Visibility, not work. The sessions are in the private tmux server, the
 * agents keep running and the conversations stay resumable. That is why
 * refusing is the right answer here and would be the wrong answer in an app
 * that owned its own processes.
 */

import {
  assertDatabaseUsable,
  isSchemaRefusal,
  readSchemaStateAt,
  DatabaseTooNewError,
  WrongDatabaseError
} from '../db/schema-version';
import { defaultManifestDbPath, MANIFEST_SCHEMA_IDENTITY } from './store';

/** Either refusal, with the file it is about. */
export type ManifestRefusal = DatabaseTooNewError | WrongDatabaseError;

/** The words for one refusal, ready for a dialog. */
export interface RefusalCopy {
  /** The one line heading. */
  message: string;
  /** The paragraph under it. */
  detail: string;
  /** Left to right, Quit first. */
  buttons: readonly string[];
  /** Index of the button that opens Finder on the data folder. */
  revealIndex: number;
}

/**
 * Is this build allowed to open this manifest?
 *
 * Returns the refusal, or null when there is nothing to refuse. It opens the
 * file READ ONLY through `readSchemaStateAt`, which is not a detail: the last
 * write connection to close checkpoints and truncates the write ahead log, so
 * a helper that opened it read write "just to check" would be a mutator of the
 * file this build has just decided it must not touch.
 *
 * A file that is missing, or that cannot be read at all, is not refused.
 * Nothing has been proved about it, and a damaged file is the integrity gate's
 * job.
 */
export function manifestRefusal(
  dbPath: string = defaultManifestDbPath()
): ManifestRefusal | null {
  try {
    assertDatabaseUsable(
      dbPath,
      readSchemaStateAt(dbPath),
      MANIFEST_SCHEMA_IDENTITY
    );
    return null;
  } catch (err) {
    if (isSchemaRefusal(err)) return err;
    // Anything else is not a refusal, and this function has no business
    // deciding what it is. The store's own constructor reports it.
    return null;
  }
}

/**
 * The words. Plain, and specific about what is still true.
 *
 * The first sentence after the heading is the one that matters, and it is the
 * only sentence in the app that can say it: the sessions are still running.
 * The numbers are included because a person can act on them. They are what
 * tells them which Tortie to look for.
 */
export function refusalCopy(err: ManifestRefusal): RefusalCopy {
  if (err instanceof WrongDatabaseError) {
    return {
      message: 'This is not a Tortie session list.',
      detail: [
        `The file at ${err.dbPath} belongs to another application. Tortie ` +
          'has not changed it and will not open it.',
        '',
        `It carries application id ${String(err.foundApplicationId)} and ` +
          `Tortie writes ${String(err.expectedApplicationId)}.`,
        '',
        'Move that file somewhere else and open Tortie again, and Tortie ' +
          'will start a new session list in its place.'
      ].join('\n'),
      buttons: ['Quit', 'Reveal Data Folder'],
      revealIndex: 1
    };
  }
  return {
    message: 'This copy of Tortie is older than your session list.',
    detail: [
      'Your sessions are safe and they are still running. Tortie keeps them ' +
        'in a private tmux server, not in the app, so nothing stops when the ' +
        'app does not open.',
      '',
      'A newer Tortie has already upgraded the session list, and this copy ' +
        'does not understand the new format. It has changed nothing.',
      '',
      `This copy understands format ${String(err.buildVersion)}. The file ` +
        `needs ${String(err.fileMinCompatible)} or newer.`,
      '',
      'Open the newer Tortie to see your sessions again.',
      '',
      err.dbPath
    ].join('\n'),
    buttons: ['Quit', 'Reveal Data Folder'],
    revealIndex: 1
  };
}
