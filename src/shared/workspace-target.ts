/**
 * What a sidebar is showing, being one folder on one computer (Phase 90.1).
 *
 * WHY THIS FILE EXISTS. Four renderer stores decided whether to do any work by
 * comparing a path string. The file tree compared `rootPath`, the tree's git
 * decorations compared `repoPath`, search compared `repoPath` and Context
 * compared `cwd`. That comparison is correct on one computer and wrong on two.
 * A person with `/Users/gdc/gmux` on this Mac and `/Users/gdc/gmux` on another
 * machine has two tabs. Switching between them handed all four stores the same
 * string, all four returned early, the machine badge changed and every sidebar
 * kept showing this Mac. Nothing errored and nothing looked broken.
 *
 * THE RULE, AND IT IS THE PRIOR ART. VS Code puts the host inside the
 * identifier as `vscode-remote://ssh-remote+<host><path>`. Emacs TRAMP puts it
 * inside the file name as `/ssh:user@host:path`. Neither lets an operation be
 * built from a bare path. Research 56 records the second half of the same rule,
 * which is that the host and the path stay two typed fields rather than one
 * merged string, because the merged form leaked into a `cwd` argument and broke
 * VS Code's own search. So this type is two fields, and the one function that
 * produces a filesystem path from it refuses to produce one for another
 * machine.
 *
 * WHAT IT IS NOT. Nothing here reads a file, starts a process or makes a
 * request. It is a value and six pure functions over that value. No product
 * surface can create a project on another machine yet, so every target this
 * build composes at runtime is local.
 *
 * It imports nothing, exactly like the rest of src/shared.
 */

/**
 * The id this Mac is registered under. It is not a machine row.
 *
 * This is the ONE definition in the product. `src/main/machines/context.ts`
 * imports it from here and re-exports it under the same name, so main's twenty
 * or so callers are unchanged and no second copy of the string can drift.
 */
export const LOCAL_MACHINE_ID = 'local';

/**
 * One folder, on one computer.
 *
 * Two fields and never one merged string. A merged string is a path a caller
 * can pass to a local read by accident, which is the failure the prior art
 * above already found.
 */
export interface WorkspaceTarget {
  /** The machine the folder is on. {@link LOCAL_MACHINE_ID} means this Mac. */
  readonly machineId: string;
  /** The absolute path of the folder on that machine. */
  readonly path: string;
}

/** A folder on this Mac. */
export function localTarget(path: string): WorkspaceTarget {
  return { machineId: LOCAL_MACHINE_ID, path };
}

/**
 * A target from a path and an optional machine id.
 *
 * An omitted id, a null id and the string `local` all mean this Mac. That is
 * every project in every build so far, so a caller that knows nothing about
 * machines keeps working.
 */
export function workspaceTarget(
  path: string,
  machineId?: string | null
): WorkspaceTarget {
  return {
    machineId:
      machineId === undefined || machineId === null || machineId === ''
        ? LOCAL_MACHINE_ID
        : machineId,
    path
  };
}

/** True when the target is on this Mac. A null target is not a target. */
export function isLocalTarget(
  target: WorkspaceTarget | null | undefined
): boolean {
  return (
    target !== null &&
    target !== undefined &&
    target.machineId === LOCAL_MACHINE_ID
  );
}

/**
 * Equal by VALUE, so a freshly composed but equal target still counts as the
 * same target.
 *
 * This is what keeps the early return in each of the four stores. Every view
 * composes its target during render, so a comparison by reference would rebuild
 * the tree, refetch the git status, restart the search and rescan Context on
 * every frame. Two nulls are equal. A null and a target are not.
 */
export function sameTarget(
  a: WorkspaceTarget | null | undefined,
  b: WorkspaceTarget | null | undefined
): boolean {
  const left = a ?? null;
  const right = b ?? null;
  if (left === null || right === null) return left === right;
  return left.machineId === right.machineId && left.path === right.path;
}

/**
 * The path this Mac may act on, or null.
 *
 * It is the ONLY way to turn a target into a string that a local read, a local
 * git call or a local search may use. A target on another machine returns null,
 * so a caller that forgot about machines gets a null it already has a branch
 * for rather than a path that names the wrong computer.
 */
export function localPathOf(
  target: WorkspaceTarget | null | undefined
): string | null {
  return isLocalTarget(target) ? (target?.path ?? null) : null;
}

/**
 * The stable key for remembering something per target.
 *
 * A local target's key is the bare path, so every key a person already has in
 * storage keeps working byte for byte. Any other target's key is
 * `<machineId>:<path>`. The two forms cannot collide, because a machine id
 * matches `^[a-z][a-z0-9-]{0,31}$` and an absolute path starts with `/`.
 */
export function targetKey(target: WorkspaceTarget): string {
  return isLocalTarget(target)
    ? target.path
    : `${target.machineId}:${target.path}`;
}

/**
 * The target a project tab points at, or null when there is no project.
 *
 * A project with no `machineId` is on this Mac, which is every project main
 * writes today.
 */
export function targetOfProject(
  project: { path: string; machineId?: string } | null | undefined
): WorkspaceTarget | null {
  if (project === null || project === undefined) return null;
  return workspaceTarget(project.path, project.machineId);
}

/**
 * The target a SESSION belongs to, or null when there is no session.
 *
 * APPENDED (Phase 90.3). A session's folder and a project's folder were
 * compared as two bare strings in five renderer places, and that comparison is
 * wrong the moment two machines hold the same path. This is the second half of
 * the pair {@link targetOfProject} already produces, so the two sides of every
 * such comparison are now the same kind of value.
 *
 * `machine` is absent for a session on this Mac, which is every session in
 * every build before Phase 70, so an omitted machine reads as this Mac.
 *
 * It takes the two fields it reads rather than the whole `Session` type,
 * because src/shared/workspace-target.ts imports nothing, including from its
 * own directory.
 */
export function targetOfSession(
  session:
    | { projectPath: string; machine?: { id: string } }
    | null
    | undefined
): WorkspaceTarget | null {
  if (session === null || session === undefined) return null;
  return workspaceTarget(session.projectPath, session.machine?.id);
}

// ---------------------------------------------------------------------------
// Phase 99. The key one folder on one computer is remembered by, for the
// quick open palette
// ---------------------------------------------------------------------------
//
// WHY A SECOND KEY SHAPE EXISTS BESIDE {@link targetKey}. `targetKey` writes a
// machine's folder as `<machineId>:<path>`. That form has no word in front of
// the machine id, so a reader has to know the machine id list to take it apart
// again. Quick Open needs the inverse as well as the composer, because the
// ranking worker in main is handed a key and has to answer whether it may run
// ripgrep over it. `src/renderer/editor/store.ts` already composes
// `machine:<machineId>:<repoPath>:<relPath>` for a tab's identity, so this pair
// follows that spelling rather than inventing a third one. `targetKey` is left
// exactly as it is: its callers store settings per target and never read a key
// back apart.

/** The word that begins the key of a folder that is not on this Mac. */
const MACHINE_KEY_PREFIX = 'machine:';

/**
 * The string that names one folder on one computer, for a map key.
 *
 * A folder on this Mac is its own absolute path, unchanged, so every key a
 * build before Phase 99 wrote is still the key this build composes. A folder on
 * another machine is `machine:<machineId>:<path>`. The two shapes cannot be
 * confused, because an absolute path begins with `/` and this prefix never
 * does.
 *
 * THE COLLISION THIS EXISTS FOR. A file at `/Users/gdc/gmux/README.md` on this
 * Mac and a file at the same path on another machine are DIFFERENT files.
 * Before this pair the palette held one index for both, so a name typed on one
 * tab could open the other computer's file.
 */
export function rootKeyOf(target: WorkspaceTarget): string {
  return isLocalTarget(target)
    ? target.path
    : `${MACHINE_KEY_PREFIX}${target.machineId}:${target.path}`;
}

/**
 * The inverse of {@link rootKeyOf}. A key that does not begin with `machine:`
 * is a folder on this Mac.
 *
 * The machine id is the text up to the FIRST colon after the prefix, and the
 * path is ALL of the rest, so a path holding a colon round trips. A machine id
 * cannot hold a colon: `MACHINE_ID_PATTERN` in `src/shared/machines.ts` is
 * `^[a-z][a-z0-9-]{0,31}$`.
 *
 * A key that begins with the prefix and holds no second colon has no path in
 * it, so it is read as a folder on this Mac under its whole text. That is the
 * honest answer for a string nothing here composed, and it never hands a caller
 * a machine id with an empty path.
 */
export function targetOfRootKey(key: string): WorkspaceTarget {
  if (!key.startsWith(MACHINE_KEY_PREFIX)) return localTarget(key);
  const rest = key.slice(MACHINE_KEY_PREFIX.length);
  const at = rest.indexOf(':');
  if (at <= 0) return localTarget(key);
  return { machineId: rest.slice(0, at), path: rest.slice(at + 1) };
}
