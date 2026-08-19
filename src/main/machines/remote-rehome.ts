/**
 * Putting a session that runs on another machine in the right tab (Phase 90.3).
 *
 * ## The defect this closes
 *
 * Before this phase a session created on a machine from a local tab had this
 * Mac's project folder written into its `project_path`. The renderer groups
 * sessions into tabs by comparing that path with a project's path, so the
 * session appeared under a tab whose Explorer, Source Control and search were
 * all showing a folder on a DIFFERENT computer. That is finding 15 of research
 * 54, and it is the reason Phase 90.3 exists.
 *
 * From this phase a session on a machine belongs to a folder ON THAT MACHINE,
 * and that folder gets its own tab.
 *
 * ## Where the folder comes from, and it costs no extra round trip
 *
 * The machine's own list already reports `#{q:session_path}` for every session,
 * because `REMOTE_LIST_FORMAT` in `./remote-sessions.ts` has carried that field
 * since Phase 70. It is the folder that machine's own server says the session is
 * in, which is the most truthful answer available and the only one that survives
 * Tortie being restarted. So the re-home reads what the poll already fetched and
 * sends nothing.
 *
 * ## The rule, stated once and used three times
 *
 * {@link remoteProjectPathFor} decides one thing: given what a row records as
 * its project folder and what the machine reports as the session's folder, which
 * of the two is the folder on that machine. It is used by the manifest write
 * below, by the project upsert below, and by the session projection in
 * `../sessions/core.ts`, so all three agree by construction rather than by
 * three matching edits.
 *
 * A recorded path that CONTAINS the reported folder is kept. That is a session
 * started in a subfolder of its project on that machine, which is an ordinary
 * thing to do and not a row that needs correcting. Anything else is replaced by
 * the reported folder, which covers every row an earlier build wrote with this
 * Mac's path in it.
 *
 * ## What it does not do
 *
 * It sends nothing to any machine. It starts no timer. It touches no row for a
 * machine that has not answered, so there is no window in which a session is
 * invisible: until a machine answers, its rows appear exactly where they appear
 * today. It writes at most ONE manifest update per row, ever, because after the
 * write the recorded path and the reported folder agree and the rule says to
 * leave the row alone.
 *
 * ## The departure from research 56 section 4.4, and the reason
 *
 * That section says a session whose folder does not exist on the machine should
 * be rooted at that machine's home directory instead. This phase does not do
 * that. It creates the tab at the reported folder and lets the Explorer say the
 * folder is not there. Two reasons. Rooting a tab at a person's whole home
 * folder puts a large tree they did not choose under a project name they did not
 * choose. And the listing that says the folder is absent is a call that has to
 * happen anyway when the tab is opened, so the honest answer costs nothing
 * extra.
 */

import type { Session } from '@shared/types';
import { getLog } from '../log';
import { projectNameForPath } from '../projects/name';
import { remoteManifest, remoteManifestInstalled } from './remote-record';

const machinesLog = getLog('config');

/**
 * Which of the two paths is this session's folder ON THAT MACHINE. PURE.
 *
 * @param recorded what the row says its project folder is. It may be a path on
 *   this Mac, which is what every row written before Phase 90.3 carries.
 * @param reported what the machine's own list says the session's folder is.
 *   Empty when the machine has not answered, or when the answer had no path in
 *   it.
 */
export function remoteProjectPathFor(
  recorded: string,
  reported: string
): string {
  // Nothing was reported, so nothing is known and nothing is changed.
  if (!reported.startsWith('/')) return recorded;
  if (recorded === reported) return recorded;
  // The recorded folder CONTAINS the reported one, so the row already names a
  // folder on that machine and the session is simply in a subfolder of it.
  if (recorded.startsWith('/') && reported.startsWith(`${recorded}/`)) {
    return recorded;
  }
  return reported;
}

/** One row, as the pass below reads it. */
interface RehomeRow {
  readonly id: string;
  readonly machineId: string;
  /** What the row records as its project folder. */
  readonly recorded: string;
  /** What the machine reported as the session's folder. */
  readonly reported: string;
}

/** What one pass did, for the log line and for the test. */
export interface RehomeResult {
  /** How many manifest rows had their project folder corrected. */
  readonly rowsMoved: number;
  /** How many folders on machines were opened as project tabs. */
  readonly projectsAdded: number;
}

/**
 * Read one pass of live sessions and put every one of them in the right tab.
 *
 * Safe to call on every change the machines layer reports. It does one manifest
 * read per row and writes only when a row disagrees with its machine, so a
 * steady state costs reads and no writes.
 *
 * Silent when no manifest store is installed, which is a unit test, a probe, and
 * the window between quit and the next launch.
 */
export function rehomeRemoteSessions(
  sessions: readonly Session[]
): RehomeResult {
  if (!remoteManifestInstalled()) return { rowsMoved: 0, projectsAdded: 0 };
  const store = remoteManifest();
  const rows: RehomeRow[] = [];
  for (const session of sessions) {
    const machineId = session.machine?.id;
    if (machineId === undefined || machineId.length === 0) continue;
    rows.push({
      id: session.id,
      machineId,
      recorded: session.projectPath,
      reported: session.cwd
    });
  }
  let rowsMoved = 0;
  let projectsAdded = 0;
  // One upsert per folder rather than one per session, so ten sessions in one
  // folder are one statement.
  const folders = new Map<string, { machineId: string; path: string }>();
  for (const row of rows) {
    const home = remoteProjectPathFor(row.recorded, row.reported);
    if (!home.startsWith('/')) continue;
    folders.set(`${row.machineId}:${home}`, {
      machineId: row.machineId,
      path: home
    });
    if (home === row.recorded) continue;
    const record = store.getSession(row.id);
    // A feed row with no manifest row is every remote session an older build
    // created. There is no row to correct, and its tab still appears, because
    // the folder was recorded above.
    if (record === undefined) continue;
    if (record.projectPath === home) continue;
    try {
      store.updateSession(row.id, { projectPath: home });
      rowsMoved += 1;
    } catch (err) {
      machinesLog.warn(
        `could not record the folder of a session on ${row.machineId}: ` +
          `${(err as Error).message}`
      );
    }
  }
  for (const folder of folders.values()) {
    if (store.getRemoteProject(folder.machineId, folder.path) !== undefined) {
      continue;
    }
    try {
      store.upsertRemoteProject({
        machineId: folder.machineId,
        path: folder.path,
        name: projectNameForPath(folder.path)
      });
      projectsAdded += 1;
    } catch (err) {
      machinesLog.warn(
        `could not open a tab for a folder on ${folder.machineId}: ` +
          `${(err as Error).message}`
      );
    }
  }
  return { rowsMoved, projectsAdded };
}
