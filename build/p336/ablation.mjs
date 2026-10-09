#!/usr/bin/env node
/**
 * `npm run ablation:p336`. The attack on Phase 336's own gates: conditions 113
 * to 121 of `conformance:machines` and the p336 vitest suites that own the
 * clauses a plain probe cannot reach (build/p336/SPEC.md §8.2).
 *
 * A GREEN GATE IS ONLY EVIDENCE IF IT CAN GO RED. Phase 336 lets Tortie write
 * a person's files on another computer in every project open there, with
 * nothing asked, and what stands between that and a write landing in his home,
 * his `.ssh` or a folder swapped in after it was opened is a handful of
 * clauses in main and in six far texts. So this script breaks ONE CLAUSE AT A
 * TIME in the shipping source and proves it reddens THE CONDITION, OR THE
 * TEST, THAT OWNS IT. An ablation that leaves its owner green is a hole in the
 * gate; one that reddens only something else is printed as a finding about the
 * gate rather than about the build.
 *
 * ## The checks it runs
 *
 *   machines  `node build/conformance-machines.mjs`. Every failure of 113 to
 *             121 begins `condition 1NN:`, so the owner is read off the line.
 *   main      the main-side and shared p336 vitest suites (MAIN_TESTS), read
 *             through vitest's JSON reporter by the full name of each case.
 *   renderer  the renderer p336 suites (RENDERER_TESTS), the same way.
 *
 * ## It never writes into the working tree
 *
 * Four builders work in one worktree during this phase, and a harness that
 * wrote into `src/` even for the seconds a gate takes could lose another
 * builder's edit. So it is the `ablation:p320` shape (build/p3201/ablation.mjs):
 * a CLONE, `cp -Rc` (APFS clonefile) of `src/`, `build/` and `resources/`
 * under `/private/tmp/p336-ablation-<pid>-*`, every root config the checks read
 * copied, `node_modules` symlinked, every check run there with that directory
 * as its cwd. Each edited file is put back and CHECKED BY SHA256 against the
 * worktree's bytes in a `finally` before the next entry, the clone is removed
 * in a `finally` and on SIGINT, SIGTERM and SIGHUP, and the worktree's own
 * bytes for every file an entry names are read before and after: a change is
 * a finding. The spec says "edits the shipping source in place"; the shipping
 * source is what the clone holds, byte for byte, and the clone is the only
 * place it is edited, for the reason above.
 *
 * ## It starts nothing but node
 *
 * No Electron, no tmux, no ssh, no agent, no token and no network. The gate it
 * runs starts `/bin/sh`, `/bin/dash`, `git` and `shasum` over scratch trees it
 * removes itself (conditions 115 to 117), and vitest runs its own workers and
 * ends them. Every check runs under a scratch HOME and ZDOTDIR inside the clone
 * with no TERM_SESSION_ID, so nothing reads his rc files or writes his history.
 *
 * ## The delta rule
 *
 * The base's red lines are recorded first and each ablation must make its own
 * owner NEWLY red, which proves the ablation caused it and lets the harness run
 * while a sibling's half is not landed. A red base is reported and fails the
 * run unless `P336_ALLOW_RED_BASE=1` says the operator knows why.
 *
 * Usage:
 *   node build/p336/ablation.mjs                      every arm
 *   node build/p336/ablation.mjs --list               the arms, run nothing
 *   node build/p336/ablation.mjs --self-test          the readers, run nothing
 *   P336_ONLY=a113a,a117c node build/p336/ablation.mjs
 *   P336_ALLOW_RED_BASE=1 node build/p336/ablation.mjs
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p336-ablation]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const SHARED = 'src/shared/remote-write-folder.ts';
const WRITE_FOLDER = 'src/main/machines/write-folder.ts';
const RUN = 'src/main/machines/remote-run.ts';
const SCRIPTS = 'src/main/machines/remote-scripts.ts';
const FILE = 'src/main/machines/remote-file.ts';
const ENTRY = 'src/main/machines/remote-entry.ts';
const CORE = 'src/main/sessions/core.ts';
const ROOTS = 'src/main/fs/project-roots.ts';
const FS_IPC = 'src/main/fs/ipc.ts';
const OPEN_WITH = 'src/main/fs/open-with.ts';
const BASELINES = 'src/main/baselines/ipc.ts';
const PRELOAD = 'src/preload/machines.ts';
const CONFIRM = 'src/main/machines/confirm.ts';
const STATE = 'src/main/machines/machine-state.ts';
const EDITOR_COPY = 'src/renderer/machines/editor.ts';
const PROJECT_TAB_COPY = 'src/renderer/machines/project-tab.ts';
const REMOTE_COPY = 'src/main/machines/remote-copy.ts';
const TAB_IO = 'src/renderer/editor/tab-io.ts';
const SLICE = 'src/renderer/state/machines-slice.ts';
// His ruled round's plants: components and a menu the probe never calls, so
// only condition 120's literal scan can read what is typed into them.
const MODAL = 'src/renderer/app/RemoteProjectModal.tsx';
const MACHINE_ROW = 'src/renderer/settings/MachineRow.tsx';
const TREE_MENU = 'src/renderer/tree/tree-menu.ts';
const FILES_SECTION = 'src/renderer/tree/FilesSection.tsx';

/** The main-side and shared suites the `main` check runs. */
export const MAIN_TESTS = [
  'src/shared/__tests__/p336-remote-write-folder.test.ts',
  'src/main/machines/__tests__/p336-write-folder.test.ts',
  'src/main/machines/__tests__/p336-far-prelude.test.ts',
  'src/main/machines/__tests__/p336-saves-in-projects.test.ts',
  'src/main/manifest/__tests__/p336-folder-pins.test.ts',
  'src/main/fs/__tests__/p336-local-roots.test.ts'
];
/** The renderer suites the `renderer` check runs. */
export const RENDERER_TESTS = [
  'src/renderer/state/__tests__/p336-write-folder-in.test.ts',
  'src/renderer/editor/__tests__/p336-remote-tab-writable.test.ts',
  'src/renderer/machines/__tests__/p336-sentences.test.ts'
];

/** The parent's own reader of the project list, planted back into one reader at a time. */
const PARENT_ROOTS =
  "async () => { const { getGmuxCore } = await import('../sessions'); return (await getGmuxCore()).listProjects().map((p) => p.path); }";

/**
 * The ablations (build/p336/SPEC.md §8.1's table and §8.2). `check` must go
 * red; `owner` is what must be NEWLY red in its output: a condition tag
 * (`C113`) for the gate, a RegExp over the full case names for vitest. An
 * edit's `from` is an exact string (replaced once) or a RegExp; an entry whose
 * one clause spans two places carries `edits`.
 */
export const ABLATIONS = [
  // ---------------------------------------------------------------- 113 the folder
  {
    n: 'a113a', check: 'machines', owner: 'C113', file: WRITE_FOLDER,
    name: 'the confirm call removed from the folder door',
    why: 'opening a project would stand in for confirming the machine, and a machine whose file changed would write.',
    from: '  assertMachineMayConnect(row.id, machineFieldsOf(row));\n', to: '\n'
  },
  {
    n: 'a113b', check: 'machines', owner: 'C113', file: WRITE_FOLDER,
    name: "candidates taken from every machine's rows",
    why: 'a project open on ANOTHER machine at the same path would widen this one (D3).',
    from: '        .filter((project) => project.machineId === row.id)\n', to: ''
  },
  {
    n: 'a113c', check: 'machines', owner: 'C113', file: SHARED,
    name: 'the shallowest holder wins',
    why: 'nested projects must bind the deepest, or an outer never-listed folder decides a write inside an inner project.',
    from: '      depth > bestDepth ||', to: '      bestDepth === -1 || depth < bestDepth ||'
  },
  {
    n: 'a113d', check: 'machines', owner: 'C113', file: SHARED,
    name: 'the never-list skipped for projects',
    why: 'a project at a home, a folder holding one or a reserved folder would be a folder Tortie writes under.',
    from: '  const open = candidates.projects.filter((path) => !neverWriteFolder(path));', to: '  const open = candidates.projects;'
  },
  {
    n: 'a113e', check: 'machines', owner: 'C113', file: SHARED,
    name: 'a project inside a legacy root takes the write (legacy-first removed)',
    why: 'the project pin would then refuse an ordinary re-clone under a confirmed writeRoot, a scenario worse than today (§Attack G4).',
    from: '  if (legacy !== null && legacy.length > 0 && holds(legacy)) {',
    to: '  if (legacy !== null && legacy.length > 0 && holds(legacy) && !candidates.projects.some((p) => holds(p))) {'
  },
  // ---------------------------------------------------------------- 114 the door
  {
    n: 'a114a', check: 'machines', owner: 'C114', file: RUN,
    name: 'the folder-bound check removed from the machine door',
    why: 'a folder-bound write through runRemoteWrite would cross with no pin and no far folder check at all.',
    from: "  if (door === 'write' && script.bound !== 'machine') {", to: "  if (false && door === 'write' && script.bound !== 'machine') {"
  },
  {
    n: 'a114b', check: 'machines', owner: 'C114', file: RUN,
    name: 'the pin not appended',
    why: 'every folder-bound text reads the pin as its LAST positional; without it the count is wrong and the check compares nothing.',
    from: "  return runRemoteScript(ctx, scriptId, [...args, folder.pin], 'folder', options);",
    to: "  return runRemoteScript(ctx, scriptId, [...args], 'folder', options);"
  },
  {
    n: 'a114c', check: 'machines', owner: 'C114', file: RUN,
    name: "the folder argument's comparison removed",
    why: 'a caller could bind one folder and send another, and the pin would be checked against the wrong folder.',
    from: '    if (at < 0 || args[at] !== folder.path) {', to: '    if (at < 0) {'
  },
  {
    n: 'a114d', check: 'machines', owner: 'C114', file: SCRIPTS,
    name: "dir-new's bound flipped to machine",
    why: 'a folder-bound write marked machine-bound crosses the machine door with no folder check.',
    from: "    id: 'dir-new',\n    mode: 'write',\n    bound: 'folder',", to: "    id: 'dir-new',\n    mode: 'write',\n    bound: 'machine',"
  },
  // ---------------------------------------------------------------- 115 the identity
  {
    n: 'a115a', check: 'machines', owner: 'C115', file: SCRIPTS,
    name: "dir-new's folder check removed",
    why: 'a folder swapped for a link, a home or a .ssh folder would be written in by dir-new.',
    from: "  ...folderCheck('$1', '$3', 2, 'noparent'),", to: "  'cd -P -- \"$1\" 2>/dev/null || exit 0',"
  },
  {
    n: 'a115b', check: 'machines', owner: 'C115', file: SCRIPTS,
    name: 'folder-pin asks BSD stat first',
    why: 'on Linux a BSD-first stat prints a usage banner into the answer (M3).',
    from: String.raw`  "  i=$(stat -c '%d:%i' \"$d/.\" 2>/dev/null || true)",
  'else',
  "  i=$(stat -f '%d:%i' \"$d/.\" 2>/dev/null || true)",`,
    to: String.raw`  "  i=$(stat -f '%d:%i' \"$d/.\" 2>/dev/null || true)",
  'else',
  "  i=$(stat -c '%d:%i' \"$d/.\" 2>/dev/null || true)",`
  },
  {
    n: 'a115c', check: 'machines', owner: 'C115', file: SCRIPTS,
    name: 'a write line below the prelude re-reads the folder path rather than .',
    why: 'a link swapped in between the check and the write would take the payload (§Attack G2, M9).',
    from: `'f="./$2"',`, to: `'f="$1/$2"',`
  },
  {
    n: 'a115c-v', check: 'main', owner: /writes into the folder that was checked, never into the victim|never re-read the folder positional after the check/, file: SCRIPTS,
    name: 'the same re-read, against the far-prelude suite',
    why: 'the swap-in-the-window arm must see the payload land in the victim.',
    from: `'f="./$2"',`, to: `'f="$1/$2"',`
  },
  {
    n: 'a115d', check: 'machines', owner: 'C115', file: FILE,
    name: 'notsame mapped to outsideRoot',
    why: 'a swapped folder would be told "outside the folder", which re-opening could never clear (D11).',
    from: "    if (said.word === 'notsame') return refused('folderChanged', writeRoot);",
    to: "    if (said.word === 'notsame') return refused('outsideRoot', writeRoot);"
  },
  {
    n: 'a115e', check: 'machines', owner: 'C115', file: FILE,
    name: 'a pin stored on notsame',
    why: 'the second Save would quietly adopt the swapped folder (D6).',
    from: "    if (said.word === 'notsame') return refused('folderChanged', writeRoot);",
    to: "    if (said.word === 'notsame') { void (0 as number) && setRemoteFolderPin(row.id, writeRoot, '1:1'); return refused('folderChanged', writeRoot); }"
  },
  // ---------------------------------------------------------------- 116 the never-list
  {
    n: 'a116a', check: 'machines', owner: 'C116', file: SCRIPTS,
    name: 'the far home itself no longer refused by identity',
    why: 'a project at the far home would be written in.',
    from: 'if [ "$wx" = "$wh" ] && [ "$wn" = 0 ]', to: 'if [ "$wx" = "$wh" ] && [ "$wn" = -1 ]'
  },
  // Phase 336.1 turned this arm round. Phase 336 refused a folder directly
  // inside the far home and its arm proved that refusal could not be dropped;
  // his ruling of 2026-10-05 ("Yes, fix it now") made that folder writable, so
  // the arm now puts the Phase 336 depth BACK and proves the gate reads the
  // defect he reported (his ~/dev greyed out) as red.
  {
    n: 'a116b', check: 'machines', owner: 'C116', file: SCRIPTS,
    name: 'a far home child refused again (the Phase 336 depth)',
    why: 'a project directly inside the far home (his ~/dev) would be refused where his Mac writes, which is the defect Phase 336.1 fixes.',
    from: 'if [ "$wx" = "$wh" ] && [ "$wn" = 0 ]', to: 'if [ "$wx" = "$wh" ] && [ "$wn" -le 1 ]'
  },
  {
    n: 'a116b-v', check: 'main', owner: /writes in a folder directly inside the home, in any spelling, and directly under \//, file: SCRIPTS,
    name: 'the same Phase 336 depth, against the far-prelude suite',
    why: 'the suite drives the shipping texts under both shells over a home child and must see it refused.',
    from: 'if [ "$wx" = "$wh" ] && [ "$wn" = 0 ]', to: 'if [ "$wx" = "$wh" ] && [ "$wn" -le 1 ]'
  },
  {
    n: 'a116c', check: 'machines', owner: 'C116', file: SCRIPTS,
    name: 'a folder HOLDING the far home no longer refused',
    why: 'a project at /Users or / would hold every file the home rule protects.',
    from: 'if [ "$wx" = "${pin}" ]; then', to: 'if false; then'
  },
  {
    n: 'a116d', check: 'machines', owner: 'C116', file: SCRIPTS,
    name: 'an empty or relative far HOME no longer refused',
    why: 'dash stays in the working folder for cd -P "" and reads an empty home as passing (M1 row 17).',
    from: /\n\s*`\s*case "\$HOME" in \/\*\) ;; \*\) \$\{say\('nohome', fields\)\}; exit 0;; esac`,/, to: ''
  },
  {
    n: 'a116d-v', check: 'main', owner: /answers nohome for an empty, a relative or an unreadable home/, file: SCRIPTS,
    name: 'the same nohome branch, against the far-prelude suite',
    why: 'the suite drives the shipping texts under both shells and must see nohome go.',
    from: /\n\s*`\s*case "\$HOME" in \/\*\) ;; \*\) \$\{say\('nohome', fields\)\}; exit 0;; esac`,/, to: ''
  },
  {
    n: 'a116e', check: 'machines', owner: 'C116', file: SCRIPTS,
    name: 'the home rules applied to a legacy root (pin - no longer skipped)',
    why: "a legacy writeRoot keeps today's bound, and today a root at the home writes (D16).",
    from: '`if [ "${pin}" = - ]; then`,', to: '`if [ "${pin}" = -x ]; then`,'
  },
  {
    n: 'a116f', check: 'machines', owner: 'C116', file: SHARED,
    name: "main's never-list stops refusing a home",
    why: 'the renderer would draw a project at the home as an edit surface and main would compose a write the far side must catch alone.',
    from: "  if (top === 'Users' || top === 'home') return parts.length <= 2;", to: "  if (top === 'Users' || top === 'home') return parts.length <= 1;"
  },
  // Phase 336.1: the reverse of a116f, the Phase 336 depth put back in main.
  {
    n: 'a116f2', check: 'machines', owner: 'C116', file: SHARED,
    name: "main's never-list refuses a home child again (the Phase 336 depth)",
    why: 'his ~/dev would be drawn read only and refused before any round trip, which is the defect Phase 336.1 fixes.',
    from: "  if (top === 'Users' || top === 'home') return parts.length <= 2;", to: "  if (top === 'Users' || top === 'home') return parts.length <= 3;"
  },
  {
    n: 'a116f2-v', check: 'renderer', owner: /answers the project for a folder directly inside a home|is an edit surface in a project directly inside a home/, file: SHARED,
    name: "the same Phase 336 depth, against the renderer's tab rule",
    why: 'the renderer asks the shared rule, so a tab in ~/dev would be drawn read only with New File and New Folder greyed.',
    from: "  if (top === 'Users' || top === 'home') return parts.length <= 2;", to: "  if (top === 'Users' || top === 'home') return parts.length <= 3;"
  },
  {
    n: 'a116g', check: 'machines', owner: 'C116', file: SHARED,
    name: "main's never-list stops refusing /",
    why: 'a project at / would hold every file on the machine.',
    from: '  if (parts.length === 0) return true;\n', to: ''
  },
  {
    n: 'a116h', check: 'machines', owner: 'C116', file: SHARED,
    name: "main's never-list stops refusing /root",
    why: "root's home is a home like any other.",
    from: "  if (top === 'root') return parts.length === 1;\n", to: ''
  },
  // Phase 336.1. The far line that refuses / itself once the first walk
  // reaches the top. / also holds every home, so the walk up from the home
  // refuses it too and no driven row can isolate this line: its owner reads it
  // as TEXT (condition 116's "$wn" = 1 clause), which is the line it is.
  {
    n: 'a116i', check: 'machines', owner: 'C116', file: SCRIPTS,
    name: 'the far / backstop removed',
    why: 'a / whose home walk could not be read would be written in; the line is the backstop the holder walk leans on.',
    from: '`  if [ "$wn" = 1 ]; then', to: '`  if [ "$wn" = -1 ]; then'
  },
  // ---------------------------------------------------------------- 117 reserved names
  {
    n: 'a117a', check: 'machines', owner: 'C117', file: SHARED,
    name: 'the fold narrowed to ASCII lower case',
    why: '.ßh and .ſsh are the same folder as .ssh on an APFS volume (§Attack M5).',
    from: /return segment\s*\.normalize\('NFKC'\)\s*\.replace\(FORMAT_CHARS, ''\)\s*\.toLowerCase\(\)\s*\.replace\(\/ß\/g, 'ss'\);/,
    to: 'return segment.toLowerCase();'
  },
  {
    n: 'a117a-v', check: 'renderer', owner: /answers never for a project that is a \.ssh folder in any fold/, file: SHARED,
    name: "the same narrowed fold, against the renderer's tab rule",
    why: 'the renderer asks the shared rule, so a .ßh project would be drawn as an edit surface.',
    from: /return segment\s*\.normalize\('NFKC'\)\s*\.replace\(FORMAT_CHARS, ''\)\s*\.toLowerCase\(\)\s*\.replace\(\/ß\/g, 'ss'\);/,
    to: 'return segment.toLowerCase();'
  },
  {
    n: 'a117b', check: 'machines', owner: 'C117', file: SHARED,
    name: '.ssh dropped from the reserved names',
    why: 'a save into .SSH/authorized_keys would be composed.',
    from: "export const REMOTE_PROTECTED_SEGMENTS: readonly ['.git', '.ssh'] = ['.git', '.ssh'];",
    to: "export const REMOTE_PROTECTED_SEGMENTS: readonly ['.git', '.ssh'] = ['.git', '.git'] as never;"
  },
  {
    n: 'a117c', check: 'machines', owner: 'C117', file: SCRIPTS,
    name: "file-put's ASCII reserved-name backstop removed",
    why: 'file-put lacked it before this phase (fault 2), and a .GIT/config with main bypassed would be written.',
    from: "  ...relGuards('$2', 3),", to: "  `case \"$2\" in /*|*..*) ${say('badname', 3)}; exit 0;; esac`,"
  },
  {
    n: 'a117d', check: 'machines', owner: 'C117', file: SCRIPTS,
    name: 'one exit 1 restored',
    why: 'a refusal that prints nothing is read by main as "may have been made" (fault 3).',
    from: `'d="./$2"',`, to: `'[ -n "$2" ] || exit 1',\n  'd="./$2"',`
  },
  {
    n: 'a117e', check: 'machines', owner: 'C117', file: ENTRY,
    name: "main's check removed from the rename's second end",
    why: 'a rename INTO .SSH/ is a write into it.',
    from: '  if (namesProtected(pick, [relFrom, relTo])) return', to: '  if (namesProtected(pick, [relFrom])) return'
  },
  {
    n: 'a117f', check: 'machines', owner: 'C117', file: SCRIPTS,
    name: "the far folder's .ssh identity compare removed",
    why: 'a project opened at a link into .ssh, or at .ßh, would be written in (§Attack G3).',
    from: 'if [ "$wx" = "$wg" ] || [ "$wx" = "$ws" ]; then', to: 'if [ "$wx" = "$wg" ]; then'
  },
  // ---------------------------------------------------------------- 118 the open pins
  {
    n: 'a118a', check: 'machines', owner: 'C118', file: CORE,
    name: 'the hand open no longer pins',
    why: 'a folder swapped between the open and the first write would be pinned by that write as if it were the one opened.',
    from: '    await pinOpenedFolder(input.machineId, stored);\n', to: ''
  },
  {
    n: 'a118b', check: 'machines', owner: 'C118', file: WRITE_FOLDER,
    name: "the pin read's failure propagated to the open",
    why: 'a machine that cannot answer the pin read would fail the open (D6).',
    from: '  } catch (err) {\n    writeLog.warn(', to: '  } catch (err) {\n    throw err;\n    writeLog.warn('
  },
  {
    n: 'a118b-v', check: 'main', owner: /never throws and keeps the old pin when the read throws or answers none/, file: WRITE_FOLDER,
    name: 'the same propagation, against the write-folder suite',
    why: 'the suite drives pinOpenedFolder with a throwing read.',
    from: '  } catch (err) {\n    writeLog.warn(', to: '  } catch (err) {\n    throw err;\n    writeLog.warn('
  },
  {
    n: 'a118c', check: 'machines', owner: 'C118', file: WRITE_FOLDER,
    name: 'the write path re-pins over a stored pin',
    why: 'every write would read the folder afresh and adopt whatever is at the path (D6).',
    from: /  if \(stored !== undefined && FOLDER_PIN_SHAPE\.test\(stored\.identity\)\) \{\n    return brand\(choice\.machineId, choice\.row, held, stored\.identity\);\n  \}\n/,
    to: ''
  },
  {
    n: 'a118c-v', check: 'main', owner: /a stored pin makes no read and is never replaced by a write/, file: WRITE_FOLDER,
    name: 'the same re-pin, against the write-folder suite',
    why: 'the suite counts the folder-pin reads over a stored pin.',
    from: /  if \(stored !== undefined && FOLDER_PIN_SHAPE\.test\(stored\.identity\)\) \{\n    return brand\(choice\.machineId, choice\.row, held, stored\.identity\);\n  \}\n/,
    to: ''
  },
  {
    n: 'a118d-v', check: 'main', owner: /a row with no pin is pinned by ONE folder-pin read, stored, and carried by the write/, file: WRITE_FOLDER,
    name: "the first write's pin not stored",
    why: 'a folder swapped after the first write would be read afresh by the second (D6).',
    from: /  if \(remoteManifestInstalled\(\)\) \{\n    remoteManifest\(\)\.setRemoteFolderPin\(choice\.machineId, held\.path, identity\);\n  \}\n/,
    to: ''
  },
  {
    n: 'a121-v', check: 'main', owner: /a changed machine throws the gate own sentence and composes nothing, for every verb/, file: WRITE_FOLDER,
    name: 'the confirm call removed, against the write-folder suite',
    why: 'the suite drives all five verbs over a row whose hash moved.',
    from: '  assertMachineMayConnect(row.id, machineFieldsOf(row));\n', to: '\n'
  },
  // ---------------------------------------------------------------- 119 local readers
  {
    n: 'a119a', check: 'machines', owner: 'C119', file: FS_IPC,
    name: "the file operations' reader takes every row again",
    why: 'a remote project row naming a folder on this Mac would let the guarded save write there (fault 5).',
    from: '    listProjectRoots: () => localProjectRoots()\n', to: `    listProjectRoots: ${PARENT_ROOTS}\n`
  },
  {
    n: 'a119b', check: 'machines', owner: 'C119', file: FS_IPC,
    name: "the drag out's reader takes every row again",
    why: 'a remote row would widen what can be dragged out of this Mac.',
    from: '    listProjectRoots: () => localProjectRoots(),', to: `    listProjectRoots: ${PARENT_ROOTS},`
  },
  {
    n: 'a119c', check: 'machines', owner: 'C119', file: OPEN_WITH,
    name: "Open With's reader takes every row again",
    why: 'a remote row would widen what Open With hands to another program here.',
    from: '    listProjectRoots: () => localProjectRoots(),', to: `    listProjectRoots: ${PARENT_ROOTS},`
  },
  {
    n: 'a119d', check: 'machines', owner: 'C119', file: BASELINES,
    name: "the Redline baseline store's reader takes every row again",
    why: 'the fourth reader, which research 138 missed (M4).',
    from: '      listProjectRoots: () => localProjectRoots(),', to: `      listProjectRoots: ${PARENT_ROOTS},`
  },
  {
    n: 'a119e', check: 'machines', owner: 'C119', file: ROOTS,
    name: 'the local filter keeps remote rows',
    why: 'every reader would be widened at once.',
    from: "    if ((project.machineId ?? 'local') !== 'local') continue;\n", to: ''
  },
  // ---------------------------------------------------------------- 120 nothing moves, nothing asks
  {
    n: 'a120a', check: 'machines', owner: 'C120', file: PRELOAD,
    name: 'machines:writeSheet re-added to the preload',
    why: 'a dormant channel that writes a hashed field is surface a later round could re-wire (D17).',
    from: "  putFile: (input) => invoke('machines:putFile', input),",
    to: "  writeSheet: (input: never) => invoke('machines:writeSheet' as never, input),\n  putFile: (input) => invoke('machines:putFile', input),"
  },
  {
    n: 'a120b', check: 'machines', owner: 'C120', file: EDITOR_COPY,
    name: 'a write sentence sends him to Settings again',
    why: 'his ruling: nothing to turn on, and no remote surface explains itself just because it is remote.',
    from: '    `Tortie saves on ${label} only inside a project you opened there. ` +',
    to: '    `Tortie saves on ${label} only inside a project you opened there. Open Settings, then Machines. ` +'
  },
  // The fix round's two (Lens 2's major): a sentence that names a GRANT,
  // put back exactly as the parent drew it.
  {
    n: 'a120d', check: 'machines', owner: 'C120', file: PROJECT_TAB_COPY,
    name: "Home's open-on-machine row says Tortie writes only where he let it save again",
    why: 'the first surface he meets would send him looking for a grant Phase 336 removed.',
    from: "export const OPEN_ON_MACHINE_SUBTITLE = 'The folder stays on that machine.';",
    to: "export const OPEN_ON_MACHINE_SUBTITLE =\n  'The folder stays on that machine. Tortie writes there only where you have ' +\n  'let it save.';"
  },
  {
    n: 'a120e', check: 'machines', owner: 'C120', file: REMOTE_COPY,
    name: "the commit's outside sentence names the folder Tortie was given permission to write in again",
    why: 'nothing is given any more, so the sentence would be false of every project opened there.',
    from: '    `That folder on ${label} is outside the projects you opened there. ` +\n    `Nothing was changed.`',
    to: '    `That folder on ${label} is outside the folder Tortie was given ` +\n    `permission to write in. Nothing was changed.`'
  },
  // His ruled round (2026-10-05): a grant sentence TYPED INTO A COMPONENT
  // rather than composed in a copy module. The first is the reverify's own
  // plant, which left this condition green before the literal scan; the other
  // three are the fixer's, one per way text joins: JSX text broken across
  // lines, a `+` chain no piece of which matches alone, and a template.
  {
    n: 'a120f', check: 'machines', owner: 'C120', file: MODAL,
    name: "the open sheet's caption typed back as the parent's own JSX text (the reverify's plant)",
    why: 'a component that draws its sentence as a literal draws nothing the probe can call, so only a read of the text finds it.',
    from: '<p className="field-caption">{openRemoteHonesty(label)}</p>',
    to: '<p className="field-caption">\n                Tortie reads this folder on {label}. It writes there only where you have let it save.\n              </p>'
  },
  {
    n: 'a120g', check: 'machines', owner: 'C120', file: MACHINE_ROW,
    name: "the machine row's warning typed as JSX text whose grant is broken across three lines",
    why: 'no single line of the source names the grant, so only a read that folds white space as the page does finds it.',
    // Re-pointed by Phase 342 (anchors only): Phase 340 moved the line to
    // ten spaces of indent, so the fourteen-space shape matched nothing.
    from: '          {row.writeHonesty}\n',
    to: '          Saving on this machine is on because you\n          let it\n          save.\n'
  },
  {
    n: 'a120h', check: 'machines', owner: 'C120', file: TREE_MENU,
    name: "New File's label carrying a grant split over a + chain",
    why: 'no piece of the chain names the grant alone, so only a read that joins the chain finds it.',
    from: "      label: 'New File…',",
    to: "      label: 'New File… (Tortie was given ' + 'permission' + ' here)',"
  },
  {
    n: 'a120i', check: 'machines', owner: 'C120', file: FILES_SECTION,
    name: "the Explorer's Refresh tooltip carrying a grant in a template with a hole",
    why: "a template's parts are joined around the hole, or a sentence with a name in it is never read whole.",
    from: '          title="Refresh files"',
    to: "          title={`Refresh files in ${'this project'}, where you allowed Tortie to save`}"
  },
  {
    n: 'a120c', check: 'machines', owner: 'C120', file: CONFIRM,
    name: 'writeRoot dropped from APPENDED_KEYS',
    why: 'every row carrying a write root would hash differently and its machine would be asked again (D22).',
    from: /const APPENDED_KEYS: readonly \(keyof MachineExecutionFields\)\[\] = \[\n  'acceptedTmuxVersion',\n  'writeRoot'\n\];/,
    to: "const APPENDED_KEYS: readonly (keyof MachineExecutionFields)[] = [\n  'acceptedTmuxVersion'\n];"
  },
  // ---------------------------------------------------------------- 121 a changed machine
  {
    n: 'a121a', check: 'machines', owner: 'C121', file: STATE,
    name: 'savesInProjects read from the file rather than the confirmation',
    why: 'a row whose details changed would still draw its tabs as edit surfaces (D21).',
    from: '      savesInProjects: false', to: '      savesInProjects: row.writeRoot !== null'
  },
  // ---------------------------------------------------------------- the renderer's halves (D18, D19)
  {
    n: 'a-d19-v', check: 'renderer', owner: /opens read only with the save-cap mark, and a save sends nothing/, file: TAB_IO,
    name: 'a file over the save cap refused at open again',
    why: "a file is never refused for OPENING because of the save cap (research 138 §9); 177 tracked files sit between the caps.",
    from: /saveCapped:\s*pair\.bytes > REMOTE_FILE_MAX_BYTES\s*\?\s*\{ bytes: pair\.bytes, over: pair\.truncated \}\s*:\s*undefined/,
    to: "saveCapped: undefined, ...(pair.bytes > REMOTE_FILE_MAX_BYTES ? { error: 'That file is too large to save on that machine.' } : {})"
  },
  {
    n: 'a-d18a-v', check: 'renderer', owner: /is an edit surface, goes dirty, and saves with nothing asked|writes in a project open on that machine, with nothing asked/, file: SLICE,
    name: 'an open project no longer a candidate in the renderer',
    why: 'a tab in a project open on a confirmed machine would be drawn read only, which is the whole of what this phase removes.',
    from: "    .filter((one) => (one.machineId ?? 'local') === machineId)", to: '    .filter(() => false)'
  },
  {
    n: 'a-d18b-v', check: 'renderer', owner: /answers never, naming the folder, for a home itself and a folder holding one|is read only in a project Tortie never writes in/, file: SLICE,
    name: 'a never-listed project drawn as an edit surface',
    why: 'the renderer must draw the never-list read only before any round trip.',
    from: "  if (pick.refused === 'never') return { refused: 'never', folder: pick.path };",
    to: "  if (pick.refused === 'never') return { folder: pick.path, kind: 'project' };"
  }
];

/** The condition a gate failure line names, as `C<n>`, or null. */
export function ownerOfGateLine(line) {
  const m = /^\s*-\s*condition (\d{3})(?: to \d{3})?:/.exec(line);
  return m === null ? null : `C${m[1]}`;
}

/** The red owners of one gate run: every failure line, by condition. */
export function gateRed(text) {
  const red = new Set();
  for (const line of String(text).split('\n')) {
    if (!/^\s*-\s/.test(line)) continue;
    red.add(ownerOfGateLine(line) ?? `other:${line.trim().slice(2, 62)}`);
  }
  return red;
}

/** The failing case names of one vitest JSON report. */
export function vitestRed(report) {
  const red = new Set();
  for (const file of report?.testResults ?? []) {
    for (const t of file.assertionResults ?? []) {
      if (t.status === 'failed') red.add(t.fullName ?? [...(t.ancestorTitles ?? []), t.title].join(' '));
    }
  }
  return red;
}

/** Does `newlyRed` hold the owner? A tag is matched exactly, a RegExp against case names. */
export function ownerRed(owner, newlyRed) {
  if (owner instanceof RegExp) return [...newlyRed].some((name) => owner.test(name));
  return newlyRed.has(owner);
}

function selfTest() {
  const cases = [
    ['a numbered line is its condition', ownerOfGateLine('  - condition 115: ablate'), 'C115'],
    ['the load line is condition 113', ownerOfGateLine("  - condition 113 to 121: Phase 336's folder bound cannot"), 'C113'],
    ['a Phase 320.1 line is its own', ownerOfGateLine('  - condition 112: F5'), 'C112'],
    ['an unnumbered line has no owner', ownerOfGateLine('  - write script file-put does not carry'), null],
    ['gateRed reads only failure lines', [...gateRed('PASS\n  - condition 117: x\nnot a failure')].join(','), 'C117'],
    ['vitestRed reads failed cases by full name', [...vitestRed({ testResults: [{ assertionResults: [{ status: 'failed', fullName: 'a b' }, { status: 'passed', fullName: 'c' }] }] })].join(','), 'a b'],
    ['a RegExp owner matches a case name', ownerRed(/answers nohome/, new Set(['x answers nohome for an empty home'])), true],
    ['a tag owner is exact', ownerRed('C11', new Set(['C113'])), false],
    ['every arm names a check this file runs', ABLATIONS.every((a) => ['machines', 'main', 'renderer'].includes(a.check)), true],
    ['every arm id is unique', new Set(ABLATIONS.map((a) => a.n)).size === ABLATIONS.length, true],
    ['every condition 113 to 121 owns an arm', [113, 114, 115, 116, 117, 118, 119, 120, 121].every((n) => ABLATIONS.some((a) => a.owner === `C${String(n)}`)), true]
  ];
  let ok = true;
  for (const [label, got, want] of cases) {
    const good = JSON.stringify(got) === JSON.stringify(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${JSON.stringify(got)}${good ? '' : ` want ${JSON.stringify(want)}`}`);
  }
  say(ok ? `self-test PASS: ${String(cases.length)} fixtures` : 'self-test FAIL');
  return ok;
}

const runAsProgram = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (runAsProgram && process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
if (runAsProgram && process.argv.includes('--list')) {
  const byOwner = new Map();
  for (const a of ABLATIONS) {
    const key = a.owner instanceof RegExp ? `${a.check} case` : a.owner;
    byOwner.set(key, (byOwner.get(key) ?? 0) + 1);
    process.stdout.write(`${a.n.padEnd(9)} ${String(a.owner instanceof RegExp ? `${a.check}: /${a.owner.source.slice(0, 60)}/` : a.owner).padEnd(72)} ${a.file}\n            ${a.name}\n`);
  }
  process.stdout.write(`\n${String(ABLATIONS.length)} arms: ${[...byOwner].map(([k, v]) => `${k} ${String(v)}`).join(', ')}. Nothing was run.\n`);
  process.exit(0);
}
if (!runAsProgram) {
  // Imported for its table and readers: nothing below runs.
} else {
  await runAblations();
}

async function runAblations() {
  const scratch = mkdtempSync(join('/private/tmp', `p336-ablation-${String(process.pid)}-`));
  const CHECK_HOME = join(scratch, 'home');
  const CHECK_ENV = { ...process.env, HOME: CHECK_HOME, ZDOTDIR: CHECK_HOME, HISTFILE: '/dev/null', TERM_SESSION_ID: undefined };

  const buildClone = () => {
    for (const name of ['src', 'build', 'resources']) {
      const r = spawnSync('cp', ['-Rc', join(REPO, name), join(scratch, name)], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`cp -Rc ${name} failed: ${r.stderr}`);
    }
    for (const name of readdirSync(REPO)) {
      if (/^(?:package\.json|tsconfig(?:\.[a-z]+)?\.json|vitest\.config\.ts)$/.test(name)) {
        writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
      }
    }
    symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
    mkdirSync(CHECK_HOME, { mode: 0o700 });
  };

  const runMachines = () => {
    const r = spawnSync(process.execPath, [join(scratch, 'build', 'conformance-machines.mjs')], {
      cwd: scratch,
      encoding: 'utf8',
      env: CHECK_ENV,
      maxBuffer: 64 * 1024 * 1024,
      timeout: 600_000
    });
    const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    return { code: r.status ?? 1, red: gateRed(text), text };
  };

  const runVitest = (tests) => {
    const out = join(scratch, `vitest-${String(Date.now())}.json`);
    const present = tests.filter((t) => existsSync(join(scratch, t)));
    const r = spawnSync(
      process.execPath,
      [join('node_modules', 'vitest', 'vitest.mjs'), 'run', '--no-cache', '--reporter=json', `--outputFile=${out}`, ...present],
      { cwd: scratch, encoding: 'utf8', env: CHECK_ENV, maxBuffer: 64 * 1024 * 1024, timeout: 600_000 }
    );
    let report = null;
    try {
      report = JSON.parse(readFileSync(out, 'utf8'));
    } catch {
      report = null;
    }
    const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    const red = report === null ? new Set(['vitest printed no report']) : vitestRed(report);
    const missing = tests.filter((t) => !present.includes(t));
    return { code: r.status ?? 1, red, text, missing, total: report?.numTotalTests ?? 0 };
  };

  const CHECKS = { machines: runMachines, main: () => runVitest(MAIN_TESTS), renderer: () => runVitest(RENDERER_TESTS) };

  const restore = (rel) => {
    const want = readFileSync(join(REPO, rel));
    writeFileSync(join(scratch, rel), want);
    const got = readFileSync(join(scratch, rel));
    if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
  };

  /** One replacement inside the clone; a function replacer for a string, so `$&` stays literal. */
  const ablate = (rel, from, to) => {
    const path = join(scratch, rel);
    if (!existsSync(path)) return false;
    const text = readFileSync(path, 'utf8');
    if (from instanceof RegExp) {
      if (!from.test(text)) return false;
      writeFileSync(path, text.replace(from, () => to), 'utf8');
      return true;
    }
    if (!text.includes(from)) return false;
    writeFileSync(path, text.replace(from, () => to), 'utf8');
    return true;
  };

  let cleaned = false;
  const clean = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      rmSync(scratch, { recursive: true, force: true });
    } catch {
      /* under /private/tmp; not fatal */
    }
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(sig, () => {
      clean();
      process.exit(130);
    });
  }

  const editsOf = (entry) => entry.edits ?? [{ from: entry.from, to: entry.to }];
  const touchedFiles = [...new Set(ABLATIONS.map((a) => a.file))];
  const worktreeBefore = new Map(touchedFiles.map((f) => [f, existsSync(join(REPO, f)) ? sha(readFileSync(join(REPO, f))) : null]));

  const problems = [];
  const table = [];
  let ran = 0;
  const started = Date.now();

  try {
    buildClone();
    say(`clone at ${scratch}, node_modules symlinked, nothing under a home touched`);
    const only = (process.env['P336_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
    const wanted = ABLATIONS.filter((a) => only.length === 0 || only.includes(a.n));
    const bases = {};
    for (const check of [...new Set(wanted.map((a) => a.check))]) {
      const base = CHECKS[check]();
      bases[check] = base;
      if (check !== 'machines' && base.missing.length > 0) {
        problems.push(`the suite(s) ${base.missing.join(', ')} are not there, so those ablations have nothing to redden.`);
      }
      if (base.code === 0) say(`base ${check}: green${check !== 'machines' ? `, ${String(base.total)} cases` : ''}`);
      else {
        say(`base ${check}: ALREADY RED on ${[...base.red].slice(0, 8).join(', ') || 'nothing it could name, so it failed to run'}`);
        if (base.red.size === 0) {
          for (const line of base.text.split('\n').filter((l) => l.trim() !== '').slice(-6)) say(`  base: ${line.trim().slice(0, 240)}`);
        }
        if (process.env['P336_ALLOW_RED_BASE'] !== '1') {
          problems.push(`${check} was red before any ablation ran. Every reading below is still a DELTA against that base, but re-run with P336_ALLOW_RED_BASE=1 once you know why.`);
        }
      }
    }
    for (const entry of wanted) {
      const base = bases[entry.check];
      try {
        const unapplied = editsOf(entry).filter((edit) => !ablate(entry.file, edit.from, edit.to));
        if (unapplied.length > 0) {
          problems.push(
            `${entry.n} "${entry.name}": the shape to ablate is not in ${entry.file}. Either the clause moved, and this entry moves with it in the same commit, or it is gone and its owner is unproven. It looked for: ${String(unapplied[0].from).slice(0, 200)}`
          );
          table.push([entry.n, String(entry.owner), 'SHAPE MISSING', '']);
          continue;
        }
        ran += 1;
        const out = CHECKS[entry.check]();
        const newlyRed = new Set([...out.red].filter((r) => !base.red.has(r)));
        const own = ownerRed(entry.owner, newlyRed);
        const shown = [...newlyRed].map((r) => r.slice(0, 70));
        table.push([entry.n, String(entry.owner).slice(0, 40), out.code === 0 ? 'GREEN' : own ? 'red' : 'RED ELSEWHERE', shown.join(' | ').slice(0, 160)]);
        say(`${entry.n.padEnd(9)} ${entry.name}: exit ${String(out.code)}, newly red ${shown.join(' | ').slice(0, 240) || 'nothing'}`);
        if (out.code === 0 || newlyRed.size === 0) {
          problems.push(`${entry.n} "${entry.name}": ${entry.check} stayed GREEN. ${entry.why} Nothing notices, so ${String(entry.owner)} is decoration.`);
        } else if (!own) {
          problems.push(`${entry.n} "${entry.name}": ${entry.check} went red but ${String(entry.owner)} did not (red instead: ${shown.join(' | ') || 'nothing named'}).`);
        }
      } finally {
        restore(entry.file);
      }
    }
    for (const check of Object.keys(bases)) {
      const after = CHECKS[check]();
      if (after.code !== bases[check].code) {
        problems.push(`after every file was restored ${check} exited ${String(after.code)} where the base exited ${String(bases[check].code)}, so a restore did not land.`);
      } else {
        say(`restored: every touched clone file matches the worktree by sha256, and ${check} is back where it started (exit ${String(after.code)})`);
      }
    }
  } catch (err) {
    problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clean();
  }

  for (const [file, before] of worktreeBefore) {
    const now = existsSync(join(REPO, file)) ? sha(readFileSync(join(REPO, file))) : null;
    if (now !== before) {
      problems.push(`${file} in the WORKTREE changed during the run (${String(before).slice(0, 12)} to ${String(now).slice(0, 12)}); this harness writes only its clone, so another process wrote it`);
    }
  }

  process.stdout.write('\n');
  for (const [n, owner, verdict, red] of table) {
    process.stdout.write(`${TAG}   ${n.padEnd(9)} ${owner.padEnd(42)} ${verdict.padEnd(14)} ${red}\n`);
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (problems.length > 0) {
    process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
    for (const p of problems) process.stdout.write(`  - ${p}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `\n${TAG} PASS in ${seconds} s. ${String(ran)} ablations, one clause each, and every one reddened THE CONDITION OR CASE ` +
      'THAT OWNS IT, measured as a DELTA against the base. Every clone file was restored and proved by sha256, the ' +
      'worktree was never written, and the clone is gone. No Electron, no tmux, no ssh, no agent, no token.\n'
  );
}
