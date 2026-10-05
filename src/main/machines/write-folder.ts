/**
 * The folder a write on another machine is bound by (Phase 336).
 *
 * ## What this module owns, and it is the whole decision
 *
 * Every write Tortie makes inside a folder on another machine (a save, a new
 * folder, a rename, a stage, an unstage, a commit) asks this module before it
 * composes anything, and crosses through `runFolderWrite` in `./remote-run.ts`
 * with the {@link WriteFolder} this module made. Nothing else can make one: the
 * type carries a brand declared here and nowhere else, so the compiler refuses
 * a caller that did not come through the steps below.
 *
 * His ruling, research 138 section 9: "Zero presses ... I don't want any
 * grants. I want it to act like i'm operating it locally." So a project open on
 * a CONFIRMED machine, however it was opened, is a folder Tortie may write
 * under, as a project open on this Mac is. There is no grant, no sheet and no
 * Settings field.
 *
 * ## The order, and it is the design (build/p336/SPEC.md D14)
 *
 *  1. The row has to be in the machines file, or {@link writeFolderFor}
 *     throws the sentence that says so and names nothing was started.
 *  2. `assertMachineMayConnect`, FIRST, so opening a project never stands in
 *     for confirming a machine, and a machine whose file changed writes
 *     nothing until it is confirmed again. It reads the in-memory snapshot of
 *     the machines file, which the store's watcher refreshes about 300 ms after
 *     the file changes (`./store.ts`), not the row on disk at call time.
 *  3. The folder: `pickWriteFolder` in src/shared/remote-write-folder.ts over
 *     THAT machine's open project rows and its legacy `writeRoot`. A legacy
 *     root that holds the target first, then the deepest open project that is
 *     not on the never-list. The renderer asks the same function, so the two
 *     cannot disagree about a path.
 *  4. (in the verb) the reserved names, the verb's own pre-checks, the
 *     connection.
 *  5. {@link readyWriteFolder}: the folder's pin. A project row pinned when it
 *     was opened by hand carries its pin; a row with none (every row from
 *     before this phase, and every row a rehome or a remote create made) is
 *     pinned by ONE `folder-pin` read, stored, and carried by the write. A
 *     legacy root carries `-`, and the far side skips its folder check for it,
 *     which is today's behaviour byte for byte (SPEC D16).
 *
 * ## The pin, and what it can and cannot do
 *
 * The pin is the far side's `<dev>:<ino>` of the folder, read through the
 * folder. Every folder-bound write carries it last, and the far side's
 * `folderCheck` compares it against the live folder IN THE SAME CALL AS THE
 * WRITE, after entering the folder with `cd -P` and naming it `.` from then on.
 * So a folder swapped for a link, or for another folder, after it was pinned
 * answers `notsame`, which main reads as `folderChanged`, and NO answer ever
 * stores a pin: only {@link pinOpenedFolder}, at a hand open, re-pins. A pin
 * read that answers `none` answers `folderChanged` too and stores nothing,
 * because Tortie cannot tell that it is the folder that was opened.
 *
 * A planted pin can make a write go where the far side's home and reserved
 * rules still allow, which is no more than the planted project row research
 * 138 section 9 accepted. It can never widen those rules: they are judged on
 * the far side by identity in the same call, never from the stored pin.
 *
 * No log line here names a file's contents or a payload.
 */

import type { MachineRowV1 } from '@shared/machines';
import {
  isProtectedRemotePath,
  pickWriteFolder,
  pickWriteFolderForPair,
  type WriteFolderCandidates,
  type WriteFolderMode,
  type WriteFolderPick
} from '@shared/remote-write-folder';
import { gmuxError } from '../errors';
import { getLog } from '../log';
import { assertMachineMayConnect } from './confirm';
import type { RemoteMachineContext } from './context';
import { readyRemoteContext } from './ready-context';
import { remoteManifest, remoteManifestInstalled } from './remote-record';
import { runRemoteRead } from './remote-run';
import { machineFieldsOf, machineRow } from './store';

const writeLog = getLog('config');

/**
 * THE BRAND. Declared here and nowhere else, and never exported, so no module
 * but this one can name the property a {@link WriteFolder} requires.
 * `build/conformance-machines.mjs` condition 114 reads that.
 */
declare const writeFolderBrand: unique symbol;

/**
 * A folder Tortie may write under on one machine, with the pin the far side
 * checks. Only this module makes one; `runFolderWrite` takes nothing else.
 */
export interface WriteFolder {
  readonly [writeFolderBrand]: true;
  readonly machineId: string;
  readonly row: MachineRowV1;
  /** The project row's STORED path, or the legacy `writeRoot`, byte for byte. */
  readonly path: string;
  readonly kind: 'project' | 'legacy';
  /** `<dev>:<ino>` of the folder, or `-` for a legacy root. */
  readonly pin: string;
}

/** A pick that names a folder, before its pin is known. */
export type HeldWriteFolder = Exclude<
  WriteFolderPick,
  { readonly refused: unknown }
>;

/** Which folder one write would be bound by, and the row it was chosen for. */
export interface WriteFolderChoice {
  readonly machineId: string;
  readonly row: MachineRowV1;
  readonly pick: WriteFolderPick;
}

/** A rename's choice, with the pick for its source end alone. */
export interface WriteFolderPairChoice extends WriteFolderChoice {
  /**
   * The folder the SOURCE end alone is in, in `file` mode. A rename whose two
   * ends no one folder holds answers `outsideRoot` when this names a folder,
   * and `writesOff` when it does not, which is what each meant before.
   */
  readonly source: WriteFolderPick;
}

/** A pin the far side can compare: decimal device, a colon, decimal inode. */
export const FOLDER_PIN_SHAPE = /^[0-9]{1,20}:[0-9]{1,20}$/;

/**
 * One `folder-pin` payload into its identity, or null. PURE.
 *
 * The script prints ONE value between the markers: `<dev>:<ino>`, or the word
 * `none` for a folder that is not absolute, not there or not readable. Anything
 * else is a machine that printed something else, and it is null too.
 */
export function parseFolderPinAnswer(payload: string): string | null {
  const value = payload.trim();
  return FOLDER_PIN_SHAPE.test(value) ? value : null;
}

/** True for a pick that names a folder. */
export function heldFolder(pick: WriteFolderPick): pick is HeldWriteFolder {
  return !('refused' in pick);
}

/**
 * Steps 1 and 2: the row, then the confirm gate. Contacts nothing.
 *
 * @throws GmuxError INVALID_INPUT when the row is not in the file, and whatever
 *   the confirm gate throws for a machine nobody confirmed or whose file
 *   changed since.
 */
function confirmedRow(machineId: string): MachineRowV1 {
  const row = machineRow(machineId);
  if (row === null) {
    throw gmuxError(
      'INVALID_INPUT',
      `There is no machine called ${machineId} in the machines file. ` +
        `Nothing was started.`
    );
  }
  assertMachineMayConnect(row.id, machineFieldsOf(row));
  return row;
}

/**
 * Step 3's inputs: THAT machine's open project rows and its legacy root.
 *
 * Only open rows are candidates, so a closed tab is not a folder Tortie writes
 * under, and a row on another machine never widens this one. With no manifest
 * installed there are no project rows to read, and the answer is the legacy
 * root alone, which fails closed.
 */
function candidatesFor(row: MachineRowV1): WriteFolderCandidates {
  const fields = machineFieldsOf(row);
  const legacyRoot =
    typeof fields.writeRoot === 'string' && fields.writeRoot.length > 0
      ? fields.writeRoot
      : null;
  const projects = remoteManifestInstalled()
    ? remoteManifest()
        .listRemoteProjects()
        .filter((project) => project.machineId === row.id)
        .map((project) => project.path)
    : [];
  return { projects, legacyRoot };
}

/**
 * Steps 1 to 3 for one target. Sync, and it contacts no machine.
 *
 * @throws as {@link confirmedRow} does.
 */
export function writeFolderFor(
  machineId: string,
  target: string,
  mode: WriteFolderMode
): WriteFolderChoice {
  const row = confirmedRow(machineId);
  return {
    machineId: row.id,
    row,
    pick: pickWriteFolder(target, candidatesFor(row), mode)
  };
}

/**
 * Steps 1 to 3 for a rename: the deepest folder holding BOTH ends. Sync, and
 * it contacts no machine.
 *
 * @throws as {@link confirmedRow} does.
 */
export function writeFolderForPair(
  machineId: string,
  from: string,
  to: string
): WriteFolderPairChoice {
  const row = confirmedRow(machineId);
  const candidates = candidatesFor(row);
  return {
    machineId: row.id,
    row,
    pick: pickWriteFolderForPair(from, to, candidates),
    source: pickWriteFolder(from, candidates, 'file')
  };
}

/**
 * True when a write under this folder names a `.git` or `.ssh` folder: any of
 * the relative parts, or, for a legacy root, the root itself (a project folder
 * holding such a segment is never a candidate at all). PURE.
 */
export function namesProtected(
  held: HeldWriteFolder,
  rels: readonly string[]
): boolean {
  if (held.kind === 'legacy' && isProtectedRemotePath(held.path)) return true;
  return rels.some((rel) => isProtectedRemotePath(rel));
}

/** Build the branded value. The ONE place a `WriteFolder` is made. */
function brand(
  machineId: string,
  row: MachineRowV1,
  held: HeldWriteFolder,
  pin: string
): WriteFolder {
  return {
    machineId,
    row,
    path: held.path,
    kind: held.kind,
    pin
  } as WriteFolder;
}

/**
 * Step 5: the folder's pin, and the branded folder that carries it.
 *
 * A legacy root carries `-`. A project carries its stored pin, or, when it has
 * none, the answer of ONE `folder-pin` read, which is stored before the write
 * runs so that a swap between that read and the write leaves the ORIGINAL
 * folder's pin in place and every later write keeps answering `folderChanged`
 * until the folder is opened again. A read that answers `none` stores nothing
 * and answers `folderChanged`.
 *
 * A stored pin is never re-read and never replaced here (SPEC D6). A read that
 * throws throws on: it sent nothing that writes, and the caller says so.
 */
export async function readyWriteFolder(
  ctx: RemoteMachineContext,
  choice: Pick<WriteFolderChoice, 'machineId' | 'row'>,
  held: HeldWriteFolder
): Promise<WriteFolder | 'folderChanged'> {
  if (held.kind === 'legacy') {
    return brand(choice.machineId, choice.row, held, '-');
  }
  const stored = remoteManifestInstalled()
    ? remoteManifest().remoteFolderPin(choice.machineId, held.path)
    : undefined;
  if (stored !== undefined && FOLDER_PIN_SHAPE.test(stored.identity)) {
    return brand(choice.machineId, choice.row, held, stored.identity);
  }
  const out = await runRemoteRead(ctx, 'folder-pin', [held.path]);
  const identity = parseFolderPinAnswer(out.payload);
  if (identity === null) return 'folderChanged';
  if (remoteManifestInstalled()) {
    remoteManifest().setRemoteFolderPin(choice.machineId, held.path, identity);
  }
  return brand(choice.machineId, choice.row, held, identity);
}

/**
 * Pin a folder a person just opened by hand (SPEC D6). NEVER THROWS.
 *
 * Called by `addRemoteProjectAdmitted` in `../sessions/core.ts` after the row
 * is stored, for a new row AND for a row already open, so opening a folder
 * again is how a person re-pins it after a `folderChanged`. A read that fails,
 * or answers `none`, keeps whatever pin was there and never fails the open.
 */
export async function pinOpenedFolder(
  machineId: string,
  path: string
): Promise<void> {
  try {
    const ctx = readyRemoteContext(machineId);
    const out = await runRemoteRead(ctx, 'folder-pin', [path]);
    const identity = parseFolderPinAnswer(out.payload);
    if (identity === null) {
      writeLog.info(
        `the folder opened on ${machineId} answered no identity, so its pin ` +
          `was left as it was`
      );
      return;
    }
    if (!remoteManifestInstalled()) return;
    remoteManifest().setRemoteFolderPin(machineId, path, identity);
  } catch (err) {
    writeLog.warn(
      `the folder opened on ${machineId} could not be pinned, so its pin was ` +
        `left as it was: ${String((err as Error).message ?? err).slice(0, 160)}`
    );
  }
}
