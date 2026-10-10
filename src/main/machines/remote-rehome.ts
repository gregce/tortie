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
 * ## The rule, stated once and used five times
 *
 * {@link remoteProjectPathFor} decides one thing: given what a row records as
 * its project folder and what the machine reports as the session's folder, which
 * of the two is the folder on that machine. It is used by the manifest write
 * below, by the project upsert below, by the session projection in
 * `../sessions/core.ts`, by {@link openTabsForRemoteCreate} below, which opens
 * the tab a create on a machine places its session in (Phase 306), and by
 * {@link releaseFoldersAfterFailedRemoteCreate} below, which reads the same
 * folders for a create that threw (Phase 306, fix round), so all five agree by
 * construction rather than by five matching edits.
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
 * It does not open a tab again for a folder a person closed (Phase 306, GitHub
 * issue 35, "Tortie remote project always comes back"). Closing a tab records
 * the close for the folder itself on that machine (Phase 344,
 * `closed_remote_folders`) and stamps every recorded session in it (Phase 93),
 * in ONE durable write (`markProjectTabClosed`), so a folder none of whose
 * sessions has a record on this Mac, being one a Tortie on that machine or on
 * another Mac started, is held like any other; a close made by a build before
 * Phase 344 is still read from its stamps. A pass that finds the folder's row
 * absent and the record of a close present leaves the row absent, and counts
 * it. The way back is the person's, and it is the same as before: Go to
 * session, opening the folder on that machine, or a session created there,
 * and each of those clears the record. A create there that threw opens it
 * again too, because the session can be running over there with its answer
 * lost ({@link releaseFoldersAfterFailedRemoteCreate}). The sessions
 * themselves are not touched: a session in a held folder is still moved to
 * that folder, so the session manager lists it under the folder's own name
 * with the tab shut, and nothing here ends anything. A session Tortie on that
 * machine starts in a folder he closed here is listed the same way, under the
 * folder's name with the tab shut, until he opens the folder, and
 * {@link withClosedFolderRecords} carries the folder's record on it so the
 * window knows the folder's tab was closed rather than never there.
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
// PHASE 306. A type import compiles to nothing, which is how
// `./remote-record.ts` already names the store.
import type { ClosedRemoteFolder, ManifestStore } from '../manifest/store';
import { projectNameForPath } from '../projects/name';
import { remoteManifest, remoteManifestInstalled } from './remote-record';

const machinesLog = getLog('config');

/**
 * PHASE 306. Scope "sessions", for the two warnings
 * {@link openTabsForRemoteCreate} writes and the one
 * {@link releaseFoldersAfterFailedRemoteCreate} writes. The first moved here from
 * `../sessions/create-local.ts` word for word, and the create path writes under
 * that scope, so the line reads exactly as it did before it moved.
 */
const createLog = getLog('sessions');

/** PHASE 306. The held count last written, beside the store it was counted against. */
let lastHeld: { readonly store: ManifestStore; readonly held: number } | null = null;

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
  /**
   * PHASE 306. How many folders on machines were left without a tab because a
   * person closed theirs. One per folder, however many sessions are in it.
   */
  readonly tabsHeldClosed: number;
}

/**
 * PHASE 344. Carry the record of a closed folder on every session listed in it
 * that has no record of its own. PURE: it reads through `closedFolder` and
 * writes nothing.
 *
 * Since Phase 344 a close of a tab for a folder on another machine is recorded
 * for the folder itself, so a session in that folder this Mac holds no row for
 * (Tortie on that machine or on another Mac started it) has no stamp to carry,
 * and without this the window could not tell its folder had a tab a person
 * closed. The window's memo (`reconcileRemoteTabs`) re-reads the project list
 * when that record appears or goes, which is how a tab a create on the machine
 * opened in main reaches the strip; and Go to session reads it to decide
 * whether a tab coming back needs a sentence.
 *
 * Only a session on another machine, and only one with no `closedProject` of
 * its own: its own stamp is what Tortie knew about that session's own tab and
 * wins. A session on this Mac is never touched. `projectPath` is already the
 * folder on that machine (`atHomeOnItsMachine` in `../sessions/core.ts`), and
 * the record is keyed by that path byte for byte, so a folder holds itself and
 * no folder under it. A session it does not change is returned as the same
 * object.
 *
 * @param closedFolder the store's read of one folder's record
 *   (`ManifestStore.closedRemoteFolder`).
 */
export function withClosedFolderRecords(
  sessions: readonly Session[],
  closedFolder: (
    machineId: string,
    path: string
  ) => Pick<ClosedRemoteFolder, 'projectName' | 'closedAt'> | undefined
): Session[] {
  return sessions.map((session) => {
    const machineId = session.machine?.id;
    if (machineId === undefined) return session;
    if (session.closedProject !== undefined) return session;
    const record = closedFolder(machineId, session.projectPath);
    if (record === undefined) return session;
    return {
      ...session,
      closedProject: {
        name: record.projectName,
        path: session.projectPath,
        closedAt: record.closedAt
      }
    };
  });
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
  if (!remoteManifestInstalled()) {
    return { rowsMoved: 0, projectsAdded: 0, tabsHeldClosed: 0 };
  }
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
  let tabsHeldClosed = 0;
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
      // PHASE 306. An absent row is not always a folder that never had a tab.
      // A person who closed the tab deleted the row and stamped every recorded
      // session in the folder, and before this question every pass put the row
      // back with a new id. The window drew it again at once after a first
      // close, and after a later one at the next relaunch, reload or sheet
      // refresh (issue 35). The stamp is the person's word, so
      // the folder stays without a tab until they open it again or create a
      // session in it, both of which clear the stamp. The question is asked
      // per FOLDER and here, after the first loop, so a session in a held
      // folder is still moved to it and is listed under its name. It is inside
      // the `try` so a manifest that cannot answer is said once below and the
      // next folder is still visited.
      if (store.projectTabClosedFor({ path: folder.path, machineId: folder.machineId })) {
        tabsHeldClosed += 1;
        continue;
      }
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
  // PHASE 306. Written when the COUNT MOVES, never on every pass, which is the
  // rule Phase 70's foreign count in `./remote-sessions.ts` follows: a pass runs
  // on every event a machine reports, and the same number each time would bury
  // everything else in the log. A move to zero is written too, because it
  // means a person opened the folder again or created a session in it. The line
  // names no folder and no machine. A new store, being a new run or a test's
  // fresh store, starts again from zero.
  const before = lastHeld !== null && lastHeld.store === store ? lastHeld.held : 0;
  if (tabsHeldClosed !== before) {
    machinesLog.info('folders on machines whose tab a person closed are kept closed', {
      held: tabsHeldClosed
    });
  }
  lastHeld = { store, held: tabsHeldClosed };
  return { rowsMoved, projectsAdded, tabsHeldClosed };
}

/**
 * PHASE 306. The tabs a create on another machine opens, and the record of a
 * close it clears: the folder it was given, and the folder the re-home's own
 * rule places the new session in, once each. Returns the folders it opened.
 *
 * A folder whose upsert failed is still returned, because its record was still
 * cleared and the next completed pass opens it.
 *
 * ## Why the create must open and clear, and not only clear
 *
 * A person creating a session in a folder is the one legitimate re-open of a
 * tab they closed, as legitimate as opening the folder again, so the stamp
 * goes. But the re-home has ALREADY run by the time the create reaches this:
 * `remoteCreate` starts the machine's feed before it returns, and that pass's
 * announcement runs {@link rehomeRemoteSessions} over the new session while the
 * stamp still holds the folder. Clearing alone would leave the folder without a
 * tab until the next pass, so this opens it as well.
 *
 * ## Why the placed folder, and not only the given one
 *
 * A create with no folder named sends none, and the machine puts the session
 * where its own server chooses, usually its home directory. A machine can also
 * report a session outside the folder it was given, and the re-home moves the
 * row there. If a person once closed THAT folder's tab, the given folder alone
 * would leave the session they just created in no tab at all, which is the
 * Phase 94 defect. {@link remoteProjectPathFor} is the re-home's own rule, so
 * the folder opened here is the folder the re-home groups the session under.
 *
 * Each write is in its own `try`, and the clear runs even when the upsert
 * failed: a tab that could not be recorded is not a reason to fail a session
 * already running over there, and with the stamp gone the next completed pass
 * opens the folder. Nothing is sent to any machine by this function.
 */
export function openTabsForRemoteCreate(
  manifest: Pick<ManifestStore, 'upsertRemoteProject' | 'clearProjectTabClosed'>,
  machineId: string,
  given: string,
  created: Pick<Session, 'projectPath' | 'cwd'>
): string[] {
  const folders: string[] = [];
  for (const path of [given, remoteProjectPathFor(created.projectPath, created.cwd)]) {
    if (!path.startsWith('/') || folders.includes(path)) continue;
    folders.push(path);
  }
  for (const path of folders) {
    try {
      manifest.upsertRemoteProject({
        machineId,
        path,
        name: projectNameForPath(path)
      });
    } catch (err) {
      createLog.warn(
        `the session started on ${machineId} and its folder could ` +
          `not be opened as a tab: ${(err as Error).message}`
      );
    }
    try {
      manifest.clearProjectTabClosed({ path, machineId });
    } catch (err) {
      createLog.warn(
        `the session started on ${machineId} and the record of a tab ` +
          `closed in its folder could not be cleared: ${(err as Error).message}`
      );
    }
  }
  return folders;
}

/**
 * PHASE 306, FIX ROUND. A create on another machine that THREW, and the
 * folders it named that a person had closed.
 *
 * {@link openTabsForRemoteCreate} runs only when the create returns. A create
 * can throw after the session already started over there: its answer can be
 * lost (`CREATE_ANSWER_LOST`, the row kept as unknown) or the machine can make
 * it and not list it back. Before Phase 306 such a folder was back in the
 * strip already, because every pass re-added it. Since it, the folder a person
 * closed would hold the session they had just asked for in no tab, which is
 * worse than the build before (the first verifier). So each such folder is
 * opened and its record cleared here, exactly as a create that worked does it.
 *
 * ONLY a folder that is HELD, being one the person closed and this phase keeps
 * closed. A folder that never had a tab gets none from a failed create, as
 * before this phase: a create that started nothing must not draw a tab, and a
 * session that did start is opened by the next pass's re-home, which is what
 * Phase 90.3 has always done. Opening rather than only clearing, because the
 * window learns of a tab main opened when a folder's closed-tab record changes
 * (`reconcileRemoteTabs`), and a broadcast between a bare clear and the next
 * pass would have it ask before the row existed and never ask again.
 *
 * The folders are the ones {@link openTabsForRemoteCreate} would open, read
 * from what was SENT, because a create that threw has no report: the folder
 * given, and the folder the re-home's own rule places a session recorded there
 * and started in `sentCwd` in. That second folder is the Directory a person
 * typed in a tab on the machine. A create with no folder named sends none, and
 * where the machine put a session it never listed is not known here; that is
 * a stated limit. Nothing is sent to any machine by this function, and it
 * never throws: a write that failed is said, and the create's own failure is
 * what the person reads. Returns the held folders it opened.
 */
export function releaseFoldersAfterFailedRemoteCreate(
  manifest: Pick<ManifestStore, 'projectTabClosedFor' | 'upsertRemoteProject' | 'clearProjectTabClosed'>,
  machineId: string,
  given: string,
  sentCwd: string
): string[] {
  const released: string[] = [];
  const said = (err: unknown): void => {
    createLog.warn(
      `the create on ${machineId} did not finish and a folder whose tab ` +
        `was closed could not be opened again: ${(err as Error).message}`
    );
  };
  const seen: string[] = [];
  for (const folder of [given, remoteProjectPathFor(given, sentCwd)]) {
    if (!folder.startsWith('/') || seen.includes(folder)) continue;
    seen.push(folder);
    let held = false;
    try {
      held = manifest.projectTabClosedFor({ path: folder, machineId });
    } catch (err) {
      said(err);
    }
    if (!held) continue;
    released.push(folder);
    // Each write in its own try, and the clear even when the open failed, as
    // in the create that worked: with the record gone the next pass opens it.
    try {
      manifest.upsertRemoteProject({ machineId, path: folder, name: projectNameForPath(folder) });
    } catch (err) {
      said(err);
    }
    try {
      manifest.clearProjectTabClosed({ path: folder, machineId });
    } catch (err) {
      said(err);
    }
  }
  return released;
}
