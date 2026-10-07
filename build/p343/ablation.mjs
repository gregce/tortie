#!/usr/bin/env node
/**
 * `npm run ablation:p343`. The attack on Phase 343's own rules
 * (build/p343/SPEC.md §9.2): condition 51 of `conformance:machines` and the
 * p343 vitest suites that own every clause a plain gate cannot reach.
 *
 * A GREEN GATE IS ONLY EVIDENCE IF IT CAN GO RED. Phase 343 lets the Explorer
 * open a link to a folder, on this Mac and on another machine, and what keeps
 * that read only through the link, bounded in main and on the far side, and
 * honest about git, is a handful of clauses spread over main's one link lane,
 * the far walk's text and its reader, the tree's two questions and its second
 * doors, the ignored store, the far cut and count, and six places in the
 * editor. So this script breaks ONE CLAUSE AT A TIME in the shipping source and
 * proves it reddens THE CONDITION, OR THE TEST, THAT OWNS IT. An ablation that
 * leaves its owner green is a hole; one that reddens only something else is
 * printed as a finding about the gate rather than about the build. One CONTROL
 * arm edits a comment and must leave every check exactly as it found it.
 *
 * ## The checks it runs
 *
 *   machines  `node build/conformance-machines.mjs`. Condition 51's Phase 343
 *             line begins `condition 51:`, so the owner is read off the line.
 *   main      the main-side suites (MAIN_TESTS), read through vitest's JSON
 *             reporter by the full name of each case.
 *   tree      the renderer tree suites (TREE_TESTS), the same way.
 *   editor    the renderer editor suite (EDITOR_TESTS), the same way.
 *
 * ## It never writes into the working tree
 *
 * Builders work in one worktree during this phase, and a harness that wrote
 * into `src/` even for the seconds a check takes could lose another builder's
 * edit. So it is the `ablation:p340` shape: a CLONE, `cp -Rc` (APFS clonefile)
 * of `src/`, `build/` and `resources/` under `/private/tmp/p343-ablation-<pid>-*`,
 * every root config the checks read copied, `node_modules` symlinked, every
 * check run there with that directory as its cwd. Each edited file is put back
 * and CHECKED BY SHA256 against the worktree's bytes in a `finally` before the
 * next entry, the clone is removed in a `finally` and on SIGINT, SIGTERM and
 * SIGHUP, and the worktree's own bytes for every file an entry names are read
 * before and after: a change is a finding.
 *
 * ## It starts nothing but node
 *
 * No Electron, no tmux, no ssh, no agent, no token and no network. The gate it
 * runs starts its own `/bin/sh`, `/bin/dash`, `/bin/ksh`, `git` and `shasum`
 * arms over scratch trees it removes, and vitest runs its own workers (the
 * tree-list suite its `/bin/sh` and `/bin/dash` over a scratch tree, the link
 * lane suite `/usr/bin/mkfifo`) and ends them. Every check runs under a scratch
 * HOME and ZDOTDIR inside the clone with HISTFILE=/dev/null and no
 * TERM_SESSION_ID or SSH_AUTH_SOCK, so nothing reads his rc files or writes his
 * history.
 *
 * ## The delta rule
 *
 * The base's red lines are recorded first and each ablation must make its own
 * owner NEWLY red, which proves the ablation caused it. A red base is reported
 * and fails the run unless `P343_ALLOW_RED_BASE=1` says the operator knows why.
 *
 * Usage:
 *   node build/p343/ablation.mjs                      every arm
 *   node build/p343/ablation.mjs --list               the arms, run nothing
 *   node build/p343/ablation.mjs --self-test          the readers and every arm's
 *                                                     shape against the worktree,
 *                                                     run nothing
 *   P343_ONLY=a-lt1,a-c51a node build/p343/ablation.mjs
 *   P343_ALLOW_RED_BASE=1 node build/p343/ablation.mjs
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p343-ablation]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const LANE = 'src/main/fs/link-target.ts';
const SCRIPTS = 'src/main/machines/remote-scripts.ts';
const TREE_LIST = 'src/main/machines/tree-list.ts';
const PATHS = 'src/renderer/tree/tree-paths.ts';
const OPS = 'src/renderer/tree/tree-ops.ts';
const MENU = 'src/renderer/tree/tree-menu.ts';
const IGNORED = 'src/renderer/tree/ignored.ts';
const DECO = 'src/renderer/tree/decorations.ts';
const PLAN = 'src/renderer/tree/remote-plan.ts';
const STORE = 'src/renderer/tree/store.ts';
const READONLY = 'src/renderer/editor/tab-readonly.ts';
const ED_STORE = 'src/renderer/editor/store.ts';
const EDITS = 'src/renderer/editor/redline-edits.ts';
const REDLINE = 'src/renderer/editor/RedlineDocument.tsx';
const DURABLE = 'src/renderer/editor/baseline-durable.ts';
const TAB_IO = 'src/renderer/editor/tab-io.ts';
const RECENTS = 'src/renderer/quickopen/recents.ts';
const FILE_TREE = 'src/renderer/tree/FileTree.tsx';
const MODEL = 'src/renderer/tree/use-tree-model.ts';
const USE_MENU = 'src/renderer/tree/use-tree-menu.ts';
const DRAG = 'src/renderer/tree/use-tree-drag.ts';
const ROW_EVENTS = 'src/renderer/tree/row-events.ts';

/** The main-side suites the `main` check runs. */
export const MAIN_TESTS = [
  'src/main/fs/__tests__/p343-link-target.test.ts',
  'src/main/machines/__tests__/p343-tree-list-links.test.ts',
  'src/main/machines/__tests__/p903-b-tree-list.test.ts'
];
/** The renderer tree suites the `tree` check runs. */
export const TREE_TESTS = [
  'src/renderer/tree/__tests__/p343-links.test.ts',
  'src/renderer/tree/__tests__/p343-tree-ops-links.test.ts',
  'src/renderer/tree/__tests__/p343-ignored-links.test.ts',
  'src/renderer/tree/__tests__/p343-remote-links.test.ts',
  // THE FIX ROUND: the hooks themselves, driven, so a clause of the wiring
  // between a rule and the library has an owner (the attack's seven arms).
  'src/renderer/tree/__tests__/p343-link-hooks.test.ts'
];
/**
 * The renderer editor suites the `editor` check runs. The palette's recents
 * suite is here because the integrator's one product line (Quick Open's recents
 * never record a through-link open) is a door of the editor's read-only rule.
 */
export const EDITOR_TESTS = [
  'src/renderer/editor/__tests__/p343-through-link.test.ts',
  'src/renderer/quickopen/__tests__/p903-c-roots.test.ts'
];

/**
 * The ablations (build/p343/SPEC.md §9.2, in its order, and the control).
 * `check` is the check that must go red; `owner` is what must be NEWLY red in
 * its output: a condition tag (`C51`) for the gate, a RegExp over the full case
 * names for vitest. An edit's `from` is an exact string (present ONCE in the
 * worktree, which the self-test checks) or a RegExp; `to` is a string, or a
 * function given the match. An entry whose one clause spans two places carries
 * `edits`. The control's `check` is `all`.
 */
export const ABLATIONS = [
  // ---------------------------------------------------------------- the link lane (D3, D2)
  {
    n: 'a-lt1', check: 'main', owner: /never has more than one stat in flight/, file: LANE,
    name: 'every link statted at once (the lane widened)',
    why: 'four links into a dead mount would hold all four of main\'s file threads, and every file read and write in main would stop (S4).',
    from: 'export const LINK_STAT_LANES = 1;', to: 'export const LINK_STAT_LANES = 1_000;'
  },
  {
    n: 'a-lt2', check: 'main', owner: /a stat that never answers/, file: LANE,
    name: 'no wait: a listing waits for every link however long',
    why: 'one link into a mount that stopped answering would hang the listing of its folder, and the Explorer with it.',
    from: '    await Promise.race([Promise.all(mine.map(([, job]) => job.answer)), waited]);',
    to: '    await Promise.all(mine.map(([, job]) => job.answer));'
  },
  {
    n: 'a-lt3', check: 'main', owner: /closed gate answers at once and asks nothing/, file: LANE,
    name: 'the stranded gate removed',
    why: 'every listing would start a new stat behind a stranded one, until a fourth dead link took the last file thread.',
    from: '    if (stranded >= MAX_STRANDED) return out;\n', to: ''
  },
  {
    n: 'a-lt4', check: 'main', owner: /statted once/, file: LANE,
    name: 'a path in flight statted twice',
    why: 'two listings of one folder would each spend a thread on the same dead link.',
    from: '    const shared = jobs.get(path);\n    if (shared !== undefined) return shared;\n', to: ''
  },
  {
    n: 'a-lt5', check: 'main', owner: /gave up on before it started is never started/, file: LANE,
    name: 'a stat a listing gave up on is started anyway',
    why: 'a listing that has already answered would still spend a thread on a link nobody is waiting for.',
    from: '      } else if (job.waiters === 0) {', to: '      } else if (false) {'
  },
  {
    n: 'a-lt6', check: 'main', owner: /keeps every link a symlink/, file: LANE,
    name: "entriesOf writing kind: 'dir' for a link to a folder",
    why: 'every reader of a listing that asks kind would take a link for a folder, the copy and the trash among them (D2).',
    from: '    const entry: FsDirEntry = { name: d.name, path: `${abs}/${d.name}`, kind: d.kind };',
    to: "    const entry: FsDirEntry = { name: d.name, path: `${abs}/${d.name}`, kind: d.kind === 'symlink' && links.get(d.name) === 'dir' ? 'dir' : d.kind };"
  },
  // ---------------------------------------------------------------- the far walk's marks (D14, D15)
  {
    n: 'a-tl1', check: 'main', owner: /marks every link line/, file: SCRIPTS,
    name: 'the // mark printed as /',
    why: 'a far link to a folder would read as a real folder with a cached empty list, which is the defect the issue reported, and today\'s.',
    from: String.raw`then printf "%s//\\n" "$f"; else printf "%s///\\n" "$f"; fi',`,
    to: String.raw`then printf "%s/\\n" "$f"; else printf "%s///\\n" "$f"; fi',`
  },
  {
    n: 'a-tl2', check: 'main', owner: /reads \/\/ as a link to a folder|reads \/\/\/ as any other link/, file: TREE_LIST,
    name: 'entryOfLine reading / before //',
    why: 'a link to a folder would be read as a folder whose name ends in a slash, and a link to a file as a folder.',
    from: 'export function entryOfLine(line: string): RemoteTreeEntry {\n',
    to: "export function entryOfLine(line: string): RemoteTreeEntry {\n  if (line.endsWith('/')) return { path: line.slice(0, -1), kind: 'dir' };\n"
  },
  // ---------------------------------------------------------------- condition 51 (§9.1)
  {
    n: 'a-c51a', check: 'machines', owner: 'C51', file: SCRIPTS,
    name: 'h=-H made unconditional',
    why: 'every walk would follow the link it was asked about AND every link below it, so a loop is walked to the depth cap.',
    from: `  'if [ -L "$p" ]; then h=-H; fi',`, to: `  'h=-H',`
  },
  {
    n: 'a-c51b', check: 'machines', owner: 'C51', file: SCRIPTS,
    name: '-H written -L',
    why: 'find -L follows every link below the root too, so a link to a folder outside lists that folder\'s whole tree.',
    from: 'then h=-H; fi', to: 'then h=-L; fi'
  },
  {
    n: 'a-c51c', check: 'machines', owner: 'C51', file: SCRIPTS,
    name: '-follow added to the first walk',
    why: '-follow is -L by another name.',
    from: `'  o=$(find $h "$p" -maxdepth "$2" -mindepth 1 -name ".git" -prune -o -print' +`,
    to: `'  o=$(find $h "$p" -maxdepth "$2" -mindepth 1 -follow -name ".git" -prune -o -print' +`
  },
  {
    n: 'a-c51d', check: 'machines', owner: 'C51', file: SCRIPTS,
    name: 'the second walk losing $h',
    why: 'the count would be of the link, not of what it points at, so a link\'s answer would say it holds nothing.',
    from: `'  c=$(find $h "$p"`, to: `'  c=$(find "$p"`
  },
  {
    n: 'a-c51e', check: 'machines', owner: 'C51', file: SCRIPTS,
    name: 'the h= line removed',
    why: '$h is the one unquoted expansion, so with no h= a value the far environment set would reach find\'s argv.',
    from: "  'h=',\n", to: ''
  },
  // ---------------------------------------------------------------- the tree's questions (D6, D7)
  {
    n: 'a-tp1', check: 'tree', owner: /UNDER: a row strictly below a link is under it/, file: PATHS,
    name: 'isUnderLink answering false',
    why: 'every door a row under a link is refused at would open, and a write would go through the link.',
    from: '    if (links.folders.has(dir)) return true;', to: '    if (links.folders.has(dir)) return false;'
  },
  {
    n: 'a-tp2', check: 'tree', owner: /never counts a link ABOVE the root/, file: PATHS,
    name: 'a link above the root counted',
    why: "a project opened through a link (issue 25) would read every one of its rows as under a link and stop saving.",
    from: "    if (dirAbs !== rootPath && !dirAbs.startsWith(rootPath + '/')) continue;\n", to: ''
  },
  {
    n: 'a-tp3', check: 'tree', owner: /OUTERMOST link/, file: PATHS,
    name: 'outsideLinks taking the innermost link',
    why: 'a create aimed at a link under a link would land inside the outer link, through it.',
    from: '  for (const candidate of [...ancestorDirsOf(dir), dir]) {', to: '  for (const candidate of [...ancestorDirsOf(dir), dir].reverse()) {'
  },
  {
    n: 'a-tp4', check: 'tree', owner: /paints nothing over a row under a link|refuses a link row UNDER a link/, file: PATHS,
    name: 'importTargetFor aiming under a link',
    why: 'a Finder drop over a row under a link would copy into what the link points at.',
    from: '  if (isAtOrUnderLink(dir, links)) return null;\n', to: ''
  },
  // ---------------------------------------------------------------- the second doors (D8, D9, D10)
  {
    n: 'a-op1', check: 'tree', owner: /duplicate: nothing under a link/, file: OPS,
    name: "duplicate's second door removed",
    why: 'Duplicate of a file under a link writes a copy beside the TARGET (A3).',
    from: '      if (isUnderLink(canonical, atAsk)) return;\n', to: ''
  },
  {
    n: 'a-op2', check: 'tree', owner: /newEntry: no placeholder at or under a link/, file: OPS,
    name: "newEntry's second door removed",
    why: 'a create aimed into a link by a caller that skipped the menu would land through it.',
    from: /(newEntry\(destDirCanonical, kind\) \{[\s\S]*?)\n {6}if \(isAtOrUnderLink\(destDirCanonical, links\(\)\)\) return;/,
    to: (_m, head) => head
  },
  {
    n: 'a-op3', check: 'tree', owner: /trash: a row under a link is dropped from the targets/, file: OPS,
    name: "trash's filter removed",
    why: '⌫ on a row under a link would move the TARGET\'s file to the Trash.',
    from: '        (c) => !isProtectedFsPath(c) && !isUnderLink(c, atAsk)', to: '        (c) => !isProtectedFsPath(c)'
  },
  {
    n: 'a-op4', check: 'tree', owner: /drop: nothing INTO a link|drop: nothing FROM under a link/, file: OPS,
    name: "drop's second door removed",
    why: 'a drag would move a file into what a link points at, or out of it.',
    from: '        isAtOrUnderLink(destDirCanonical, atDrop) ||\n        draggedCanonical.some((path) => isUnderLink(path, atDrop))',
    to: '        false'
  },
  {
    n: 'a-op5', check: 'tree', owner: /importPaths: nothing copied into a link/, file: OPS,
    name: "importPaths' second door removed",
    why: 'a Finder drop would copy into what a link points at.',
    from: '      if (isProtectedFsPath(destDirCanonical)) return;\n      // PHASE 343. Nothing is copied into a link or a folder under one.\n      if (isAtOrUnderLink(destDirCanonical, links())) return;\n',
    to: '      if (isProtectedFsPath(destDirCanonical)) return;\n'
  },
  {
    n: 'a-op6', check: 'tree', owner: /startRename: nothing under a link/, file: OPS,
    name: "startRename's second door removed",
    why: 'F2 on a row under a link would open the inline editor, and the rename would move the target\'s file.',
    from: '      if (isUnderLink(canonical, links())) return;\n', to: ''
  },
  {
    n: 'a-op7', check: 'tree', owner: /onRenameCommitted: a rename under a link is put back and never sent/, file: OPS,
    name: "onRenameCommitted's second door removed",
    why: 'a rename committed in the model under a link would reach main and move the target\'s file.',
    from: '      if (isUnderLink(source, links()) || isUnderLink(dest, links())) {', to: '      if (false) {'
  },
  {
    n: 'a-op8', check: 'tree', owner: /trash of the link row removes the FOLDER row/, file: OPS,
    name: 'the kind taken from main in trash',
    why: "main answers `file` for a link (A3), so the folder row would stay drawn after the link went to the Trash.",
    from: "            entry.kind === 'dir' ||\n            linkFolders.has(toCanonical(entry.relPath, true));",
    to: "            entry.kind === 'dir';"
  },
  {
    n: 'a-op9', check: 'tree', owner: /a move of the link row moves the FOLDER row/, file: OPS,
    name: 'the kind taken from main in a move',
    why: 'a moved link drawn as a folder would be added back as a file row, and its tabs would not follow.',
    from: "      pair.from.kind === 'dir' ||\n      linkFolders.has(toCanonical(pair.from.relPath, true));",
    to: "      pair.from.kind === 'dir';"
  },
  {
    n: 'a-op10', check: 'tree', owner: /a duplicate of the link row adds a FOLDER row/, file: OPS,
    name: 'the kind taken from main in a duplicate',
    why: "the copy of a link to a folder would be drawn as a file, which is the issue's own defect again.",
    from: "            entry.kind === 'dir' || sourceIsLinkFolder", to: "            entry.kind === 'dir'"
  },
  {
    n: 'a-op11', check: 'tree', owner: /says only the link moves, once/, file: OPS,
    name: 'the D10 sentence missing',
    why: 'a person deleting a link would not be told the folder it points at stays.',
    from: '        body: trashBody(linkRows),', to: '        body: trashBody(0),'
  },
  {
    n: 'a-mn1', check: 'tree', owner: /offers no verb that writes, and no History/, file: MENU,
    name: 'History kept under a link',
    why: 'git log through a link prints nothing with exit 0, which reads as a file with no history (A8).',
    from: "    !remote && !underLink\n      ? {\n          label: 'History',", to: "    !remote\n      ? {\n          label: 'History',"
  },
  {
    n: 'a-mn2', check: 'tree', owner: /REPLACES the machine note/, file: MENU,
    name: 'the footnote beside the machine note',
    why: 'two disabled lines would say two reasons for one refusal.',
    from: "  if (footnote !== null && items.length > 0) {\n    items.push('sep', { label: footnote, disabled: true, run: () => undefined });\n  }",
    to: "  if (footnote !== null && items.length > 0) {\n    items.push('sep', { label: footnote, disabled: true, run: () => undefined });\n  }\n  if (underLink && remote && note !== null && items.length > 0) items.push({ label: note, disabled: true, run: () => undefined });"
  },
  {
    n: 'a-dc1', check: 'tree', owner: /is ⤷, titled Link|marks EVERY link row/, file: DECO,
    name: 'the row mark never drawn',
    why: 'a link would read as the folder or file it points at, with nothing saying it is a link (D5).',
    from: '  if (!isLink) return null;', to: '  return null;'
  },
  // ---------------------------------------------------------------- THE FIX ROUND: the hooks (owners in p343-link-hooks)
  //
  // The attack's own seven arms (x1 to x6 and x10), each of which left every
  // phase test green and two of which left the WHOLE suite green together, and
  // the four the fix round's own restorations need (the link row's Open With
  // and History, and a drop over it landing beside it, D9 and §0 as rewritten).
  {
    n: 'a-hk1', check: 'tree', owner: /opens a file under a link with throughLink/, file: FILE_TREE,
    name: "FileTree's open gesture sends no throughLink (the attack's x1)",
    why: 'every file under a link would open editable, so a save would write through an in-project link (ruling 2).',
    from: '        ...(throughLink ? { throughLink: true as const } : {}),\n', to: ''
  },
  {
    n: 'a-hk2', check: 'tree', owner: /canDrag refuses any row under a link/, file: MODEL,
    name: "canDrag lets a row under a link start a drag (the attack's x2)",
    why: 'a move, an attach or a drag out would start from a path through a link.',
    from: '      if (paths.some((path) => isUnderLink(path, links))) return false;\n', to: ''
  },
  {
    n: 'a-hk3', check: 'tree', owner: /canDrop refuses a folder at or under a link/, file: MODEL,
    name: "canDrop lets a drop land in a link (the attack's x3)",
    why: 'the library would move its rows into the link before the verb refused, and the tree would flicker a write that never happens.',
    from: '      if (isAtOrUnderLink(dir, linksRef.current)) return false;\n', to: ''
  },
  {
    n: 'a-hk4', check: 'tree', owner: /canRename refuses a row under a link/, file: MODEL,
    name: "canRename lets F2 open on a row under a link (the attack's x4)",
    why: 'the inline editor would open on a row the Explorer must never rename.',
    from: '          !isUnderLink(item.path, linksRef.current) &&\n', to: ''
  },
  {
    n: 'a-hk5', check: 'tree', owner: /inside a SELECTION holding a row under a link/, file: USE_MENU,
    name: "the menu asks only the clicked row, not the selection (the attack's x5)",
    why: 'Move to Trash over a selection holding a row under a link would be offered from a plain row.',
    from: '        (canonical !== null && isUnderLink(canonical, links)) ||\n        selection.some((path) => isUnderLink(path, links));\n',
    to: '        canonical !== null && isUnderLink(canonical, links);\n'
  },
  {
    n: 'a-hk6', check: 'tree', owner: /a drag of a row under a link starts nothing/, file: DRAG,
    name: "the drag start's third door removed (the attack's x6)",
    why: 'a row under a link would arm the attach to a terminal with a path through the link.',
    from: '      if (dragged.some((canonical) => isUnderLink(canonical, links))) {\n',
    to: '      if (false && dragged.some((canonical) => isUnderLink(canonical, links))) {\n'
  },
  {
    n: 'a-hk7', check: 'tree', owner: /New File… on the link row lands in the folder holding the link/, file: USE_MENU,
    name: "the link row's New File aims INTO the link (the attack's x10)",
    why: 'New File… on the link row, which lands beside the link today, would be refused by the verb and do nothing.',
    from: '          : outsideLinks(\n              isDirPath(canonical) ? canonical : parentOf(canonical),\n              links\n            );\n',
    to: '          : isDirPath(canonical) ? canonical : parentOf(canonical);\n'
  },
  {
    n: 'a-hk8', check: 'tree', owner: /the link row keeps Open With and History, both aimed at the link itself/, file: USE_MENU,
    name: 'the link row loses Open With and History',
    why: 'two gestures that worked on the link row before this phase would be gone, which is worse than today (D9).',
    from: '      const linkRow =\n        canonical !== null &&\n        links.folders.has(canonical) &&\n        selection.length <= 1;',
    to: '      const linkRow = false;'
  },
  {
    n: 'a-hk9', check: 'tree', owner: /keeps Open With and History, the link's own/, file: MENU,
    name: "the link row's History aimed at the folder spelling",
    why: "git log of `.claude/skills/` is not the link's history, and the tab History opens would not be the one it opened before.",
    from: '    const history = historyItem(leaf);', to: '    const history = historyItem(canonical);'
  },
  {
    n: 'a-dr1', check: 'tree', owner: /lands BESIDE a link row/, file: PATHS,
    name: 'a Finder drop over the link row refused',
    why: 'a drop that lands beside the link today would do nothing, which is worse than today (§0).',
    from: '  const linkRow = row.isFolder && links.folders.has(canonical);', to: '  const linkRow = false;'
  },
  {
    n: 'a-dr2', check: 'tree', owner: /a move dropped over the link row lands in the folder holding it/, file: DRAG,
    name: 'a move dropped over the link row carried nowhere',
    why: 'a move that lands beside the link today would do nothing, which is worse than today (§0).',
    from: '        opsRef.current?.drop(dragged, beside, false);\n', to: ''
  },
  {
    n: 'a-dr3', check: 'tree', owner: /over the link SEGMENT of a chain row/, file: ROW_EVENTS,
    name: "the drop's folder read without the chain row's segment",
    why: "over a chain row's outer segment the library moves the rows itself, and the host would carry the same move a second time.",
    from: "    if (segment !== null && segment.endsWith('/')) return segment;\n", to: ''
  },
  {
    n: 'a-dr4', check: 'tree', owner: /refuses a folder dropped beside a link inside it/, file: PATHS,
    name: "besideLinkDrop without the library's self or descendant rule",
    why: 'a folder dropped over a link it holds would be moved into itself.',
    from: '    if (isDirPath(path) && dest.startsWith(path)) return null;\n', to: ''
  },
  {
    n: 'a-dr5', check: 'tree', owner: /rings the CHAIN ROW that shows the folder holding the link/, file: DRAG,
    name: 'the folder folded into a chain row ringed as the whole box',
    why: "a drop beside `.claude/skills` would light the whole tree, which says the root, where the parent lit `.claude`'s own row.",
    from: "        const row = segment.closest('[data-type=\"item\"]');\n        if (row instanceof HTMLElement) return boxOf(row);\n", to: ''
  },
  // THE NARROW FIX (2026-10-07, his ruling on the second needs_work): a move
  // dropped over ANY row under a link is refused with no ring, and the root
  // ring over a link row at the project root (the reverify's r5) is owned.
  {
    n: 'a-dr6', check: 'tree', owner: /a move dropped over ANY row under a link is refused/, file: PATHS,
    name: 'besideLinkDrop not asking a FILE row under a link',
    why: 'a move over a file directly inside a linked folder would be carried beside the link, into the folder holding it, with that folder ringed (the reverify\'s finding).',
    from: "    rowUnderPointer.type === 'file' &&\n", to: '    false &&\n'
  },
  {
    n: 'a-dr7', check: 'tree', owner: /a move dropped over ANY row under a link is refused with no ring/, file: DRAG,
    name: 'the drop handing besideLinkDrop no row',
    why: 'the drop over a file under a link would move the dragged rows beside the link while the dragover had refused it.',
    from: '          dragged,\n          linkAimFromEvent(e.nativeEvent, linksRef.current),\n          linksRef.current,\n          overRow\n',
    to: '          dragged,\n          linkAimFromEvent(e.nativeEvent, linksRef.current),\n          linksRef.current,\n          null\n'
  },
  {
    n: 'a-dr8', check: 'tree', owner: /a move dropped over ANY row under a link is refused with no ring/, file: DRAG,
    name: 'the dragover handing besideLinkDrop no row',
    why: 'a file row under a link would light the folder holding the link as a drop target.',
    from: '          dragPathsRef.current,\n          linkAimFromEvent(e.nativeEvent, linksRef.current),\n          linksRef.current,\n          overRow\n',
    to: '          dragPathsRef.current,\n          linkAimFromEvent(e.nativeEvent, linksRef.current),\n          linksRef.current,\n          null\n'
  },
  {
    n: 'a-dr9', check: 'tree', owner: /lands at the root, under the root's ring/, file: DRAG,
    name: 'a link row at the project root drawing no ring (the reverify\'s r5)',
    why: 'a move over a link at the root would land at the root with nothing saying where it lands.',
    from: "        if (beside === '') {\n          armImport(null);\n          armRoot(true);\n",
    to: "        if (beside === '') {\n          armImport(null);\n          armRoot(false);\n"
  },
  // THE FOLDED-ROW FIX (2026-10-07, his ruling "Tiny fix + recheck that case"):
  // a row that folds a link with the one folder it holds lands a drop from
  // Finder and a move beside the link, on the link's segment and off every
  // segment; the outer segment is that folder; a segment under the link lands
  // nothing. And the reverify's rv-x3 and rv-x4, now owned.
  {
    n: 'a-fd1', check: 'tree', owner: /THE FOLDED ROW|aims off every segment at the OUTERMOST link/, file: PATHS,
    name: 'linkAimOf not reading the area off every segment as the link row',
    why: 'a move or a Finder drop on the icon of `.claude3 / skills / only` would land nothing, where today it landed beside the link.',
    from: '    if (links.folders.has(dir)) return dir;\n', to: ''
  },
  {
    n: 'a-fd2', check: 'tree', owner: /THE FOLDED ROW|a move lands beside the link on its segment/, file: PATHS,
    name: 'linkAimOf reading a point ON a segment as the link row',
    why: 'a segment under the link would land beside it, and over the outer segment the host would carry the move the library already carried.',
    from: '  if (dirUnderPointer === null || chain === null || chain.on !== null) {',
    to: '  if (dirUnderPointer === null || chain === null) {'
  },
  {
    n: 'a-fd3', check: 'tree', owner: /THE FOLDED ROW from Finder|a drop from Finder lands beside the link on its segment/, file: PATHS,
    name: 'importRowFor handing on the row (a Finder drop not aimed the way a move is)',
    why: 'a drop from Finder anywhere on `.claude3 / skills / only` would land nothing, where today it landed beside the link.',
    from: '  return { rel: toCanonical(toRel(aimed), true), isFolder: true };', to: '  return row;'
  },
  {
    n: 'a-fd4', check: 'tree', owner: /keeps every other Finder drop as it was|a drop from Finder over the link row lands BESIDE it; under it, nothing/, file: PATHS,
    name: 'importRowFor reading a FILE row as the folder it is aimed at',
    why: 'a drop from Finder over a file directly inside a link would land beside the link, where it is refused like every row under a link.',
    from: '  if (row === null || !row.isFolder || aimed === null || aimed.length === 0) {',
    to: '  if (row === null || aimed === null || aimed.length === 0) {'
  },
  {
    n: 'a-fd5', check: 'tree', owner: /keeps every other Finder drop as it was/, file: PATHS,
    name: 'importRowFor aiming a row no link touches by its segment',
    why: "a drop from Finder on an ordinary chain row's outer segment would land in another folder than it does today.",
    from: '  if (!isAtOrUnderLink(toCanonical(toRel(row.rel), true), links)) return row;\n', to: ''
  },
  {
    n: 'a-fd6', check: 'tree', owner: /THE FOLDED ROW/, file: ROW_EVENTS,
    name: "chainFromEvent reading no row's segments",
    why: 'off every segment of a row that folds a link, a move and a Finder drop would land nothing.',
    from: '    return segments.length === 0 ? null : { segments, on };', to: '    return null;'
  },
  {
    n: 'a-fd7', check: 'tree', owner: /THE FOLDED ROW moved in the tree/, file: DRAG,
    name: "the move's drop reading the library's folder alone",
    why: 'the ring would say beside the link on the icon of a folded row and the drop would land nothing.',
    from: '          dragged,\n          linkAimFromEvent(e.nativeEvent, linksRef.current),\n',
    to: '          dragged,\n          dropDirFromEvent(e.nativeEvent),\n'
  },
  {
    n: 'a-fd8', check: 'tree', owner: /THE FOLDED ROW moved in the tree/, file: DRAG,
    name: "the move's dragover reading the library's folder alone",
    why: 'on the icon of a folded row the drop would land beside the link with no ring saying so.',
    from: '          dragPathsRef.current,\n          linkAimFromEvent(e.nativeEvent, linksRef.current),\n',
    to: '          dragPathsRef.current,\n          dropDirFromEvent(e.nativeEvent),\n'
  },
  {
    n: 'a-fd9', check: 'tree', owner: /THE FOLDED ROW from Finder/, file: DRAG,
    name: 'the Finder dragover reading the row alone',
    why: 'a drop from Finder anywhere on `.claude3 / skills / only` would land nothing, where today it landed beside the link.',
    from: "          importRowFor(\n            hit === null ? null : { rel: hit.rel, isFolder: hit.type === 'folder' },\n            linkAimFromEvent(e.nativeEvent, links),\n            links\n          ),\n",
    to: "          hit === null ? null : { rel: hit.rel, isFolder: hit.type === 'folder' },\n"
  },
  {
    n: 'a-dr10', check: 'tree', owner: /a move dropped over ANY row under a link is refused with no ring/, file: DRAG,
    name: "a refused dragover leaving the root's ring lit (the reverify's rv-x3)",
    why: 'a move over a link at the root, then over a row under a link, would still say it lands at the root.',
    from: '        if (beside === null) {\n          armImport(null);\n          armRoot(false);\n          return;\n        }\n',
    to: '        if (beside === null) {\n          armImport(null);\n          return;\n        }\n'
  },
  {
    n: 'a-dr11', check: 'tree', owner: /a move dropped over ANY row under a link is refused with no ring/, file: DRAG,
    name: "a refused dragover leaving the row's ring lit (the reverify's rv-x4)",
    why: 'a move over the link row, then over a row under it, would still ring the folder holding the link.',
    from: '        if (beside === null) {\n          armImport(null);\n          armRoot(false);\n          return;\n        }\n',
    to: '        if (beside === null) {\n          armRoot(false);\n          return;\n        }\n'
  },
  {
    n: 'a-fr1', check: 'main', owner: /keeps a root whose name ENDS in a space|a folder and a link whose names end in a space/, file: TREE_LIST,
    name: 'the far root trimmed again',
    why: 'a folder or a link whose name ends in a space would open empty on another machine while it lists on this Mac.',
    from: '  const root = rootOf(rest.slice(secondSpace + 1));', to: '  const root = rest.slice(secondSpace + 1).trim();'
  },
  // ---------------------------------------------------------------- git (D13)
  {
    n: 'a-ig1', check: 'tree', owner: /sends a link row in its LEAF spelling/, file: IGNORED,
    name: 'a link asked in folder spelling',
    why: "git answers `.venv/` with exit 128 ('beyond a symbolic link') and the WHOLE dimmed set is replaced by nothing (A4, A8).",
    from: '    ask.push(linkFolders.has(path) ? path.slice(0, -1) : path);', to: '    ask.push(path);'
  },
  {
    n: 'a-ig2', check: 'tree', owner: /sends nothing under a link/, file: IGNORED,
    name: 'a path under a link asked',
    why: 'git refuses any path past a link with exit 128, so one such path undims the whole tree (A8).',
    from: '    if (isUnderLinkFolder(path, linkFolders)) continue;\n', to: ''
  },
  {
    n: 'a-ig3', check: 'tree', owner: /KEEPS all eight across a revalidation/, file: IGNORED,
    name: 'the revalidation arm asked without the links',
    why: "the revalidation REPLACES the set, so a watcher tick past the 10 s floor would undim node_modules and every ignored folder (A4).",
    from: '        ? pathsToAsk(paths, NONE, NONE, linkFolders)', to: '        ? pathsToAsk(paths, NONE, NONE, new Set())'
  },
  {
    n: 'a-ig4', check: 'tree', owner: /dims all eight on the ordinary sync/, file: IGNORED,
    name: 'a hit left in leaf spelling',
    why: 'an ignored link drawn as a folder would not dim the rows under it.',
    from: '        ).map((path) => canonicalAnswer(path, linkFolders));', to: '        );'
  },
  {
    n: 'a-gl1', check: 'tree', owner: /keys git's file row for a link onto the folder row/, file: DECO,
    name: 'treeGitLane not keying a link',
    why: '`?? newLink` would mark no row, because the row is spelled `newLink/`.',
    from: "    const path = linkFolders.has(file.path + '/') ? file.path + '/' : file.path;", to: '    const path = file.path;'
  },
  // ---------------------------------------------------------------- the far plan and the store (D16 to D20, D4)
  {
    n: 'a-rp1', check: 'tree', owner: /gives a far link to a folder NO key/, file: PLAN,
    name: 'a far link given []',
    why: 'expanding a far link would show the cached empty list and ask nothing, which is the defect.',
    from: "    if (entry.kind !== 'dir' || entry.link !== undefined) continue;", to: "    if (entry.kind !== 'dir') continue;"
  },
  {
    n: 'a-rp2', check: 'tree', owner: /7\.7: a folder at the walk's last level gets no key/, file: PLAN,
    name: '7.7 removed',
    why: 'a folder three levels down on another machine would open empty and ask nothing (A6).',
    from: '    if (depthUnder(root, entry.path) === depth) continue;\n', to: ''
  },
  {
    n: 'a-rp3', check: 'tree', owner: /keeps an opened link's rows across a root answer/, file: PLAN,
    name: "mergeRemoteGroups not keeping a link's keys",
    why: "Refresh would empty an opened link, because the root's walk never descends it (M11).",
    from: '    if (under === null || under > depth - 1 || atOrUnderLink(dir)) {', to: '    if (under === null || under > depth - 1) {'
  },
  {
    n: 'a-st1', check: 'tree', owner: /a denied link leaves the tab exactly as it was/, file: STORE,
    name: "a non-root refusal setting the tab's status",
    why: 'a far link to a folder the account cannot read would replace the whole Explorer with a refusal (A1).',
    from: '      if (!isRoot) {\n        // PHASE 343. That one folder stays unlisted, as a failed child read on',
    to: '      if (false) {\n        // PHASE 343. That one folder stays unlisted, as a failed child read on'
  },
  {
    n: 'a-st2', check: 'tree', owner: /holds the tenth until one of nine ends/, file: STORE,
    name: 'the count raised to 99',
    why: 'Refresh or a reopen with many links open would pass the far machine\'s ceiling (research 56: eleven at once, 258.8 ms; failures from thirty).',
    from: 'export const REMOTE_EXTRA_READS = 9;', to: 'export const REMOTE_EXTRA_READS = 99;'
  },
  {
    n: 'a-st3', check: 'tree', owner: /costs the root plus one with one link open/, file: STORE,
    name: 'Refresh not walking the opened links',
    why: 'a linked folder outside the project would never show what changed in it, Refresh or not.',
    from: '          rootWalk,\n          ...[...walked].map((dir) => treeInto(machineId, dir, seq))\n',
    to: '          rootWalk\n'
  },
  {
    n: 'a-st4', check: 'tree', owner: /walks a real folder replaced by a link once the root has landed/, file: STORE,
    name: 'the after-root walk removed',
    why: 'a real folder replaced by a link would keep its stale rows, because D16 keeps keys at a link.',
    from: '          await Promise.all(since.map((dir) => treeInto(machineId, dir, seq)));', to: '          void since;'
  },
  {
    n: 'a-st5', check: 'tree', owner: /keeps the kind its folder last had/, file: STORE,
    name: "D4's carry removed",
    why: 'a listing whose link stat was gated would turn an OPEN linked folder into a leaf, and the diff would remove its subtree.',
    from: '            carryLinkTargets(result.entries, s.entriesByDir[dirPath])', to: '            result.entries'
  },
  {
    n: 'a-st6', check: 'tree', owner: /sorts a link to a folder with the folders/, file: STORE,
    name: 'a link to a folder sorted with the files',
    why: 'a folder row would sit among the files, which no Explorer does.',
    edits: [
      { from: '    const aDir = drawsAsFolder(a) ? 0 : 1;', to: "    const aDir = a.kind === 'dir' ? 0 : 1;" },
      { from: '    const bDir = drawsAsFolder(b) ? 0 : 1;', to: "    const bDir = b.kind === 'dir' ? 0 : 1;" }
    ]
  },
  // ---------------------------------------------------------------- the editor's six places (D11)
  {
    n: 'a-ed1', check: 'editor', owner: /is true with the flag on this Mac, where the same tab without it is an edit surface/, file: READONLY,
    name: 'the flag removed from tabIsReadOnly',
    why: 'Monaco, auto save, the strip and the editor menu would all treat the tab as editable.',
    from: '    tab.compare !== undefined ||\n    tab.throughLink === true\n', to: '    tab.compare !== undefined\n'
  },
  {
    n: 'a-ed2', check: 'editor', owner: /leaves a flagged tab clean, local and far/, file: ED_STORE,
    name: "the flag removed from markDirty's refusals",
    why: 'a keystroke that reached the model would make the tab dirty, and a save would follow.',
    from: '        tab.compare !== undefined ||\n        tab.throughLink === true', to: '        tab.compare !== undefined'
  },
  {
    n: 'a-ed3', check: 'editor', owner: /offers a flagged tab no caret/, file: EDITS,
    name: 'the flag removed from redlineTypable',
    why: 'Redline would take typing in a file opened through a link.',
    from: '    tab.throughLink !== true &&\n', to: ''
  },
  {
    n: 'a-ed4', check: 'editor', owner: /⌥⌫ on a flagged tab says the read-only sentence|the press asks the helper/, file: REDLINE,
    name: 'the Redline press not refused up front',
    why: '⌥⌫ would rewind the change, writing the TARGET through the guarded door.',
    from: '      if (upFront !== null) {\n        refuse(upFront);\n        return;\n      }\n', to: ''
  },
  {
    n: 'a-ed5', check: 'editor', owner: /is false for a prose file lexically inside its repository/, file: DURABLE,
    name: 'the flag removed from keepsBaseline',
    why: "Tortie's durable store would keep a baseline under a link's spelling of a file it does not own.",
    from: '    tab.throughLink !== true &&\n', to: ''
  },
  {
    n: 'a-ed6', check: 'editor', owner: /a CLEAN flagged tab on this Mac sends nothing/, file: TAB_IO,
    name: "the flag removed from saveOnce (the sixth place)",
    why: '⌘S on a CLEAN tab writes, so it would replace the target file through the link (S2).',
    from: '    if (tab.throughLink === true) return false;\n', to: ''
  },
  {
    n: 'a-ed7', check: 'editor', owner: /an unflagged open then a flagged open stays editable/, file: ED_STORE,
    name: 'the flag applied on landing on an open tab',
    why: 'a dirty tab would be turned read only under a person\'s edits.',
    from: '      const existing = tabById(id);\n      if (existing !== undefined) {\n',
    to: '      const existing = tabById(id);\n      if (existing !== undefined) {\n        if (req.throughLink === true) set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, throughLink: true } : t)) }));\n'
  },
  {
    n: 'a-ed8', check: 'editor', owner: /never records a file the Explorer opened through a link/, file: RECENTS,
    name: "Quick Open's recents recording a through-link open",
    why: 'the palette would reopen the file as a plain open, editable and saving through the link, one step past the Explorer.',
    from: '    if (req.throughLink === true) return;\n', to: ''
  },
  // ---------------------------------------------------------------- the control
  {
    n: 'a-ctrl', check: 'all', owner: null, file: LANE,
    name: 'CONTROL: a comment changed',
    why: 'a check that reads comments would turn red on prose, and every arm above would prove nothing.',
    from: '/** How long one listing waits for its links. `health.ts`\'s 250 ms. */',
    to: '/** How long one listing waits for its links. `health.ts`\'s 250 ms (the ablation control). */'
  }
];

/** The condition a gate failure line names, as `C<n>`, or null. */
export function ownerOfGateLine(line) {
  const m = /^\s*-\s*condition (\d{1,3})(?: to \d{1,3})?:/.exec(line);
  return m === null ? null : `C${String(Number(m[1]))}`;
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
    // A suite that failed to load has no cases to fail: it is named as itself.
    if ((file.assertionResults ?? []).length === 0 && file.status === 'failed') red.add(`suite failed to run: ${String(file.name ?? '?')}`);
  }
  return red;
}

/** Does `newlyRed` hold the owner? A tag is matched exactly, a RegExp against case names. */
export function ownerRed(owner, newlyRed) {
  if (owner instanceof RegExp) return [...newlyRed].some((name) => owner.test(name));
  return newlyRed.has(owner);
}

const editsOf = (entry) => entry.edits ?? [{ from: entry.from, to: entry.to }];

/** The arms whose shape is not present exactly once in the worktree's file. */
export function shapeProblems(read = (rel) => (existsSync(join(REPO, rel)) ? readFileSync(join(REPO, rel), 'utf8') : null)) {
  const out = [];
  for (const entry of ABLATIONS) {
    const text = read(entry.file);
    if (text === null) {
      out.push(`${entry.n}: ${entry.file} is not there`);
      continue;
    }
    for (const edit of editsOf(entry)) {
      const hits = edit.from instanceof RegExp ? (text.match(new RegExp(edit.from.source, `${edit.from.flags.replace('g', '')}g`)) ?? []).length : text.split(edit.from).length - 1;
      if (hits !== 1) out.push(`${entry.n}: the shape is in ${entry.file} ${String(hits)} time(s), not once: ${String(edit.from).slice(0, 120)}`);
    }
  }
  return out;
}

/** The test files an arm's owner must name a case in: every owner RegExp must match some case title there. */
export function ownerProblems(read = (rel) => (existsSync(join(REPO, rel)) ? readFileSync(join(REPO, rel), 'utf8') : null)) {
  const suites = { main: MAIN_TESTS, tree: TREE_TESTS, editor: EDITOR_TESTS };
  const out = [];
  for (const entry of ABLATIONS) {
    if (!(entry.owner instanceof RegExp)) continue;
    const text = (suites[entry.check] ?? []).map((f) => read(f) ?? '').join('\n');
    const titles = [...text.matchAll(/\b(?:it|test|describe)\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2].replace(/\\'/g, "'"));
    if (!titles.some((t) => entry.owner.test(t))) out.push(`${entry.n}: no case title in the ${entry.check} suites matches ${String(entry.owner)}`);
  }
  return out;
}

function selfTest() {
  const shapes = shapeProblems();
  const owners = ownerProblems();
  const cases = [
    ['condition 51 reads as C51', ownerOfGateLine('  - condition 51: tree-list does not hand find -H'), 'C51'],
    ['a three-digit condition is its own', ownerOfGateLine('  - condition 115: ablate'), 'C115'],
    ['an unnumbered line has no owner', ownerOfGateLine('  - tree-list does not prune .git'), null],
    ['gateRed reads only failure lines', [...gateRed('PASS\n  - condition 51: x\nnot a failure')].join(','), 'C51'],
    ['vitestRed reads failed cases by full name', [...vitestRed({ testResults: [{ assertionResults: [{ status: 'failed', fullName: 'a b' }, { status: 'passed', fullName: 'c' }] }] })].join(','), 'a b'],
    ['vitestRed names a suite that failed to load', [...vitestRed({ testResults: [{ name: 'x.test.ts', status: 'failed', assertionResults: [] }] })].join(','), 'suite failed to run: x.test.ts'],
    ['a RegExp owner matches a case name', ownerRed(/statted once/, new Set(['the bound the same link asked by two listings at once is statted once'])), true],
    ['a tag owner is exact', ownerRed('C5', new Set(['C51'])), false],
    ['every arm names a check this file runs', ABLATIONS.every((a) => ['machines', 'main', 'tree', 'editor', 'all'].includes(a.check)), true],
    ['every arm id is unique', new Set(ABLATIONS.map((a) => a.n)).size === ABLATIONS.length, true],
    ['condition 51 owns the four arms of §9.1 and the h= line', ABLATIONS.filter((a) => a.owner === 'C51').length, 5],
    ['the editor owns one arm per place, one for the landing and one for the palette', ABLATIONS.filter((a) => a.check === 'editor').length, 8],
    ['exactly one control', ABLATIONS.filter((a) => a.owner === null).length, 1],
    ['every arm names a file under src/', ABLATIONS.every((a) => a.file.startsWith('src/')), true],
    ['every arm shape is present once in the worktree', shapes, []],
    ["every owner names a case in its check's suites", owners, []]
  ];
  let ok = true;
  for (const [label, got, want] of cases) {
    const good = JSON.stringify(got) === JSON.stringify(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${JSON.stringify(got)}${good ? '' : ` want ${JSON.stringify(want)}`}`);
  }
  say(ok ? `self-test PASS: ${String(cases.length)} fixtures, nothing was run` : 'self-test FAIL');
  return ok;
}

const runAsProgram = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (runAsProgram && process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
if (runAsProgram && process.argv.includes('--list')) {
  const byCheck = new Map();
  for (const a of ABLATIONS) {
    const key = a.owner === null ? 'control' : a.check;
    byCheck.set(key, (byCheck.get(key) ?? 0) + 1);
    const owner = a.owner === null ? 'control (every check stays as found)' : a.owner instanceof RegExp ? `${a.check}: /${a.owner.source.slice(0, 64)}/` : `${a.check}: ${a.owner}`;
    process.stdout.write(`${a.n.padEnd(8)} ${owner.padEnd(76)} ${a.file}\n         ${a.name}\n`);
  }
  process.stdout.write(`\n${String(ABLATIONS.length)} arms: ${[...byCheck].map(([k, v]) => `${k} ${String(v)}`).join(', ')}. Nothing was run.\n`);
  process.exit(0);
}
if (runAsProgram) await runAblations();

async function runAblations() {
  const scratch = mkdtempSync(join('/private/tmp', `p343-ablation-${String(process.pid)}-`));
  const CHECK_HOME = join(scratch, 'home');
  const CHECK_ENV = { ...process.env, HOME: CHECK_HOME, ZDOTDIR: CHECK_HOME, HISTFILE: '/dev/null' };
  delete CHECK_ENV['TERM_SESSION_ID'];
  delete CHECK_ENV['SSH_AUTH_SOCK'];

  const buildClone = () => {
    for (const name of ['src', 'build', 'resources']) {
      const r = spawnSync('cp', ['-Rc', join(REPO, name), join(scratch, name)], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`cp -Rc ${name} failed: ${r.stderr}`);
    }
    for (const name of readdirSync(REPO)) {
      if (/^(?:package\.json|tsconfig(?:\.[a-z]+)?\.json|vitest\.config\.ts|vitest\.[a-z]+\.config\.ts)$/.test(name)) {
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
    return { code: r.status ?? 1, red: gateRed(text), text, missing: [], total: 0 };
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
    return { code: r.status ?? 1, red, text, missing: tests.filter((t) => !present.includes(t)), total: report?.numTotalTests ?? 0 };
  };

  const CHECKS = {
    machines: runMachines,
    main: () => runVitest(MAIN_TESTS),
    tree: () => runVitest(TREE_TESTS),
    editor: () => runVitest(EDITOR_TESTS)
  };

  const restore = (rel) => {
    const want = readFileSync(join(REPO, rel));
    writeFileSync(join(scratch, rel), want);
    const got = readFileSync(join(scratch, rel));
    if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
  };

  /** One replacement inside the clone. A string `to` is placed literally, so `$&` and `$1` stay as written. */
  const ablate = (rel, from, to) => {
    const path = join(scratch, rel);
    if (!existsSync(path)) return false;
    const text = readFileSync(path, 'utf8');
    if (from instanceof RegExp ? !from.test(text) : !text.includes(from)) return false;
    writeFileSync(path, text.replace(from, typeof to === 'function' ? to : () => to), 'utf8');
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

  const touchedFiles = [...new Set(ABLATIONS.map((a) => a.file))];
  const worktreeBefore = new Map(touchedFiles.map((f) => [f, existsSync(join(REPO, f)) ? sha(readFileSync(join(REPO, f))) : null]));

  const problems = [];
  const table = [];
  let ran = 0;
  const started = Date.now();

  try {
    buildClone();
    say(`clone at ${scratch}, node_modules symlinked, nothing under a home touched`);
    const only = (process.env['P343_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
    const wanted = ABLATIONS.filter((a) => only.length === 0 || only.includes(a.n));
    const checksWanted = [...new Set(wanted.flatMap((a) => (a.check === 'all' ? Object.keys(CHECKS) : [a.check])))];
    const bases = {};
    for (const check of checksWanted) {
      const base = CHECKS[check]();
      bases[check] = base;
      if (base.missing.length > 0) problems.push(`the suite(s) ${base.missing.join(', ')} are not there, so those ablations have nothing to redden.`);
      if (base.code === 0) say(`base ${check}: green${check !== 'machines' ? `, ${String(base.total)} cases` : ''}`);
      else {
        say(`base ${check}: ALREADY RED on ${[...base.red].slice(0, 8).join(', ') || 'nothing it could name, so it failed to run'}`);
        if (base.red.size === 0) {
          for (const line of base.text.split('\n').filter((l) => l.trim() !== '').slice(-6)) say(`  base: ${line.trim().slice(0, 240)}`);
        }
        if (process.env['P343_ALLOW_RED_BASE'] !== '1') {
          problems.push(`${check} was red before any ablation ran. Every reading below is still a DELTA against that base, but re-run with P343_ALLOW_RED_BASE=1 once you know why.`);
        }
      }
    }
    for (const entry of wanted) {
      try {
        const unapplied = editsOf(entry).filter((edit) => !ablate(entry.file, edit.from, edit.to));
        if (unapplied.length > 0) {
          problems.push(
            `${entry.n} "${entry.name}": the shape to ablate is not in ${entry.file}. Either the clause moved, and this entry moves with it in the same commit, or it is gone and its owner is unproven. It looked for: ${String(unapplied[0].from).slice(0, 200)}`
          );
          table.push([entry.n, String(entry.owner ?? 'control'), 'SHAPE MISSING', '']);
          continue;
        }
        ran += 1;
        if (entry.owner === null) {
          // THE CONTROL: every check, each left exactly as its base.
          const moved = [];
          for (const check of Object.keys(CHECKS)) {
            const out = CHECKS[check]();
            const newly = [...out.red].filter((r) => !bases[check].red.has(r));
            if (out.code !== bases[check].code || newly.length > 0) moved.push(`${check}: exit ${String(out.code)}, newly red ${newly.join(' | ') || 'nothing'}`);
          }
          table.push([entry.n, 'control', moved.length === 0 ? 'green' : 'CONTROL RED', moved.join(' ; ').slice(0, 160)]);
          say(`${entry.n.padEnd(8)} ${entry.name}: ${moved.length === 0 ? 'every check as it was' : moved.join(' ; ')}`);
          if (moved.length > 0) problems.push(`${entry.n} "${entry.name}": a check moved on a comment (${moved.join(' ; ')}). ${entry.why}`);
          continue;
        }
        const base = bases[entry.check];
        const out = CHECKS[entry.check]();
        const newlyRed = new Set([...out.red].filter((r) => !base.red.has(r)));
        const own = ownerRed(entry.owner, newlyRed);
        const shown = [...newlyRed].map((r) => r.slice(0, 80));
        table.push([entry.n, String(entry.owner).slice(0, 48), out.code === 0 ? 'GREEN' : own ? 'red' : 'RED ELSEWHERE', shown.join(' | ').slice(0, 160)]);
        say(`${entry.n.padEnd(8)} ${entry.name}: exit ${String(out.code)}, newly red ${shown.join(' | ').slice(0, 240) || 'nothing'}`);
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
      if (after.code !== bases[check].code || [...after.red].some((r) => !bases[check].red.has(r))) {
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
  if (existsSync(scratch)) problems.push(`the clone ${scratch} is still there after its finally`);

  process.stdout.write('\n');
  for (const [n, owner, verdict, red] of table) {
    process.stdout.write(`${TAG}   ${n.padEnd(8)} ${owner.padEnd(50)} ${verdict.padEnd(14)} ${red}\n`);
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (problems.length > 0) {
    process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
    for (const p of problems) process.stdout.write(`  - ${p}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `\n${TAG} PASS in ${seconds} s. ${String(ran)} arms, one clause each: every ablation reddened THE CONDITION OR CASE ` +
      'THAT OWNS IT, measured as a DELTA against the base, and the control left every check as it found it. Every ' +
      'clone file was restored and proved by sha256, the worktree was never written, and the clone is gone. No ' +
      'Electron, no tmux, no ssh, no agent, no token.\n'
  );
}
