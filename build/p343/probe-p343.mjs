#!/usr/bin/env node
/**
 * `npm run probe:p343`. Phase 343's app run (build/p343/SPEC.md §10): a link to
 * a folder opens in the Explorer like a folder, read only through the link, on
 * this Mac and on another machine, graded at HEAD with the parent's reading
 * printed beside it.
 *
 * ## What it drives, one Electron at a time
 *
 * THE PARENT FIRST (`P343_PARENT_CHECKOUT`, a BUILT checkout of `ae8767c2`),
 * then HEAD (this checkout, built). Each build gets its own scratch profile,
 * its own scratch HOME and ZDOTDIR, and a FRESH pair of fixtures made by
 * build/p343/fixture.mjs: `<harness>/p343/<build>/local` opened as a project on
 * this Mac and `<harness>/p343/<build>/far` opened on the loopback machine. A
 * fresh pair per build, because the arms write (creates, a duplicate, a
 * watcher witness) and the HEAD run must not meet the parent's leftovers. In
 * one launch, this Mac's arms first and then the machine's:
 *
 *   L1  the issue's shape: `.claude` holds only the link, so one chain row
 *       `.claude/skills` marked ⤷; it opens to `a-skill/` and `notes.md`, and
 *       `notes.md` opens with the band.
 *   L2  every fixture link row's drawn kind and mark against the probe's OWN
 *       `lstat`/`stat` of the disk (fixture.mjs `linkStatOf`).
 *   L5  dimming after a REVALIDATION, waited for past `INVALIDATE_MIN_MS` and
 *       proved by a `fresh.log` witness dimming; `newLink`'s untracked mark.
 *   L6  a `/bin/sh` write into `.agent/skills` shows under `.claude/skills` with
 *       no Refresh; one into `outside/` shows under `linkOut` after Refresh.
 *   L3  the doors, on a row under `.claude/skills`, a row under `linkOut` and
 *       the link row: each menu as main built it (the link row keeping every
 *       row it had but Open and Open in New Tab, the fix round); F2, ⌫ and
 *       Delete; a drag in the tree, toward a terminal and toward Finder; a
 *       Finder drop under the link (nothing lands) and onto the link row (it
 *       lands in `.claude/`, beside the link, at both builds); header New File and New Folder with a row
 *       under the link selected and with the link row selected; New File… from
 *       the link row's own menu; Duplicate on the link row; typing in Monaco
 *       and in Redline (after a `/bin/sh` appended a line underneath), ⌥⌫ on
 *       the change, a wait past auto save's delay with auto save on, and a
 *       CLEAN ⌘S on two files opened through links.
 *   L4  Move to Trash on the link row: the confirm's body read, CANCEL pressed
 *       (D21: nothing is ever emptied into his Trash).
 *   C1  `.claude/skills/a-skill/SKILL.md` opened from CONTEXT, one character
 *       typed, ⌘S: it saves through the link at both builds (D1's control).
 *   L7  a click on `linkPipe`, a link to a FIFO: no tab. The probe then opens
 *       the FIFO for writing once, so a read the parent left blocked in main
 *       returns.
 *   R0  far `deep/a/b`, a folder at the walk's last level, expanded. The parent
 *       must show it empty and ask the machine nothing, or 7.7 is REFUTED.
 *   R1  the far fixture: L1's and L2's rows and marks, `.claude/skills` across
 *       Refresh, the menu under the link, the band, a clean ⌘S that writes
 *       nothing there.
 *   R2  far `linkFsRoot` opened once: rows inside 20 s, the line the root's.
 *   R3  far `linkVarRoot`, `linkLocked` and `linkGone` (after its target is
 *       removed), each expanded, then the tab closed and reopened: the Explorer
 *       keeps its rows every time and never draws a refusal.
 *   R4  the ten `ten/l*` links expanded, then Refresh, then the tab closed and
 *       reopened: the far side's own count (D22) never above ten in flight,
 *       and each of the three passes (the clicks, Refresh, the reopen) walks
 *       all ten, each read in its own window of the far log.
 *       THE CLOSE IS MADE FOR REAL (the fix round): closing a project asks
 *       `Close 'proj'?`, and the first app run never answered it, so the tab
 *       never closed and the confirm left up ate R4's first click. The one
 *       button pressed is that confirm's own `Close project`, the tab count
 *       must drop, and a close that did not happen reads UNREADABLE.
 *   RUN the sha256 of every file under both fixtures and both stand-in homes
 *       equal before and after but for the paths the probe wrote, listed by
 *       name; no durable baseline record under a link row; his dotfiles; no
 *       Electron left.
 *
 * ## How it reads and presses, all of it techniques this repository ships
 *
 * Rows, kinds, marks, dimming and git marks from the tree's shadow DOM
 * (`data-item-path`, `data-item-type`, the decoration section,
 * `data-item-git-status`), the virtualised list scrolled to mount a row. Clicks,
 * keys and text through CDP `Input.dispatchMouseEvent`, `dispatchKeyEvent` and
 * `insertText`. Drags through `Input.setInterceptDrags` and
 * `Input.dispatchDragEvent` (build/probe-p237-attack.mjs), a Finder drop with
 * `data.files`, never a drag the window server would own. The native menu AS
 * MAIN BUILT IT over `--inspect=0`: `Menu.prototype.popup` replaced by a
 * recorder that keeps the rows, presses the one item asked for by calling its
 * own `click`, and opens nothing (build/p320/probe-p320.mjs, arm R5); main's
 * `startDrag` replaced by a recorder for the Finder drag, so no native drag ever
 * starts. Tabs, auto save's setting and the menu's existing drives are the
 * shipped Phase 95 and Phase 268 drives; this file adds NO product harness
 * drive. Toasts by a MutationObserver of the page's own.
 *
 * ## What it refuses, and the bounds that bind it
 *
 *   - It runs only inside build/harness-socket.mjs (`GMUX_TMUX_SOCKET` a
 *     `gmux-p343…-<pid>` socket) and build/with-scratch-machine.mjs with
 *     `SCRATCH_MACHINE_QUIET_SHELL=1` AND `SCRATCH_MACHINE_SCRATCH_HOME=1`, so
 *     the far `$HOME` and `ZDOTDIR` are the yard's own. It refuses, exit 2, when
 *     either is outside the yard. It never names `-L gmux`.
 *   - D22: the far count is a `find` wrapper in the yard, named ONLY by a
 *     `.zshenv` the probe writes into the yard's own ZDOTDIR (never his; it
 *     refuses when one is there already) and removes in its `finally`. It
 *     holds each counted `find` `FIND_HOLD_S` before running it, because a
 *     small walk spends milliseconds in `find`, and without the hold eleven
 *     walks in flight together read as six (the review's measurement).
 *   - Every Electron through build/electron-run.mjs's `withElectron`, ended in
 *     its `finally`, one at a time, with a scratch HOME and ZDOTDIR,
 *     `HISTFILE=/dev/null` and no `TERM_SESSION_ID`. build/hidden-agents.mjs's
 *     overlay is written before each launch, the checkout's own parser asked
 *     first, and `agents:list` read back before any arm. No model turn, no
 *     agent, no token.
 *   - D21: Move to Trash is read and CANCELLED. `shell.trashItem` moves into the
 *     account's real Trash whatever HOME says.
 *   - His `~/.zsh_history`, `~/.bash_history` and `~/.zshrc`: size and modified
 *     time only, before and after; a move fails the run. Electrons counted
 *     once, at the end.
 *   - Every fixture is removed in the `finally` unless `P343_KEEP=1`.
 *
 * ## The grader is pure and proved before it is trusted
 *
 * `--grader-self-test` grades build/p343/fixtures/ (an honest HEAD record and
 * an honest parent record, HAND-WRITTEN to the shape an honest run records,
 * because no builder launches Electron) and, for EVERY clause, the honest
 * reading broken on that clause alone, which must fail on that clause. It
 * also grades build/p343/fixtures/reviewer/, recorded by the probe's review
 * (docs/method/HOW-WE-BUILT-THIS.md rule 9): an honest pair whose values came
 * out of the SHIPPING code over a real fixture.mjs tree (each record's
 * `derivedBy` and `handWritten` say which), and 25 broken readings across all
 * fourteen graders, several of them the shipping code's own output with one
 * rule taken out and real far logs of this file's wrapper. And it reads this
 * file's own `run()` for a binding declared below its exit, which the builds
 * would meet uninitialised (`lateBindings`). It
 * starts NOTHING. Run it as `node build/p343/probe-p343.mjs --grader-self-test`
 * and NEVER through `npm run probe:p343 -- …`, which hands the flag to
 * build/harness-socket.mjs and starts the app (Phase 336's lesson).
 *
 * Knobs: `P343_PARENT_CHECKOUT` (a built parent, run first), `P343_ARMS` (comma
 * list), `P343_KEEP=1` (keep the scratch world and the far log),
 * `P343_OUT_DIR`. Exit 0 when every arm passed, 1 when one failed, 2 when it
 * could not run or an arm could not be READ, which is never a pass.
 *
 *   npm run -s probe:p343
 *   node build/p343/probe-p343.mjs --grader-self-test
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  closeSync,
  constants as FS,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { keyscanText } from '../ssh-run.mjs';
import * as hidden from '../hidden-agents.mjs';
import { dotfilesMoved, dotfilesSentence, localCensus } from '../p3201/real-machine.mjs';
import { censusDiff, censusOf, linkStatOf, makeLinkFixture } from './fixture.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const FIXTURES = join(dirname(HERE), 'fixtures');
const J = JSON.stringify;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// ===========================================================================
// THE WORDS AND SHAPES THE GRADERS HOLD (build/p343/SPEC.md §8, D9, D10)
// ===========================================================================

export const MARK = '⤷';
export const MARK_TITLE = 'Link';
export const LINK_NOTE = 'Read only through a link';
export const BAND = 'Read only · opened through a link';
export const TRASH_ONE = 'Only the link moves, and what it points to stays.';
export const REDLINE_REFUSED = 'notes.md is read-only, so it cannot be rewound.';
/** The six verbs D9 takes off a row under a link. */
export const UNDER_LINK_ABSENT = ['New File…', 'New Folder…', 'Rename…', 'Duplicate', 'Move to Trash', 'History'];
/** The rows D9 keeps on a row under a link, on this Mac. */
export const UNDER_LINK_KEPT = ['Open', 'Open in New Tab', 'Reveal in Finder', 'Copy Path', 'Copy Relative Path'];
/**
 * Every row the link row keeps (D7, D9 as the fix round rewrote it): every row
 * the PARENT's link row offered, as main built it, but Open and Open in New
 * Tab, which opened a tab that could not be read. The self-test holds this list
 * against the review's parent record, so it cannot drift from what today does.
 */
export const LINK_ROW_KEPT = ['Open With', 'History', 'New File…', 'New Folder…', 'Rename…', 'Duplicate', 'Move to Trash', 'Reveal in Finder', 'Copy Path', 'Copy Relative Path'];
/** The two rows a link row drawn as a folder no longer offers (D9). */
export const LINK_ROW_GONE = ['Open', 'Open in New Tab'];
/** Where a drop from Finder over the link row lands at both builds: beside the link (§0). */
export const LINK_ROW_DROP = 'local:proj/.claude/p343-dropped-link.txt';
/** The names L3's creates type, and where each is aimed. */
export const CREATES = [
  { id: 'hdrFileUnder', kind: 'file', from: 'under', name: 'p343-hdr-file-under.txt' },
  { id: 'hdrDirUnder', kind: 'dir', from: 'under', name: 'p343-hdr-dir-under' },
  { id: 'hdrFileLink', kind: 'file', from: 'link', name: 'p343-hdr-file-link.txt' },
  { id: 'hdrDirLink', kind: 'dir', from: 'link', name: 'p343-hdr-dir-link' },
  { id: 'menuFileLink', kind: 'file', from: 'menu', name: 'p343-menu-file.txt' }
];
/** The link rows a durable baseline record may never name a path at or under (§10 RUN). */
export const LINK_FOLDERS = [
  '.claude/skills', 'linkIn', 'linkInAbs', 'linkOut', 'linkOutAbs', 'loopRoot', 'up', 'linkFsRoot', 'linkHome', 'linkSsh',
  'linkDotGit', 'linkOther', 'chainA', 'chainB', 'src/linkIgnored', '.venv', 'bazel-out', 'node_modules/pkgb', 'linkVarRoot',
  'linkLocked', 'linkGone', 'newLink', ...Array.from({ length: 10 }, (_, i) => `ten/l${String(i)}`)
];
/** The local fixture link count (fixture.mjs: 19 + 7 + 10 + newLink). */
export const LINK_COUNT = 37;
/** The arms, in the order one launch runs them. */
export const ARMS = ['L1', 'L2', 'L5', 'L6', 'L3', 'L4', 'C1', 'L7', 'R0', 'R1', 'R2', 'R3', 'R4'];
/**
 * `find` runs one far walk makes: TREE_LIST runs the walk once for the list
 * (`o=`) and once more for the count (`c=`), one after the other, with the
 * same arguments, so the wrapper logs two `S` lines a walk. Measured by the
 * probe's review over the shipping text under /bin/sh: a walk of `deep/a/b`
 * and of `ten/l0` each logged 2.
 */
export const FINDS_PER_WALK = 2;
/**
 * Seconds the wrapper holds each counted `find` before running it. A walk of a
 * small folder spends a few milliseconds in `find` and the rest in the shell
 * and the connection, so without a hold the log sees only the walks whose
 * `find` happens to overlap: measured over the shipping text, eleven walks
 * started together read 6, 6 and 9 in flight, and started 5 ms apart 2 of a
 * true 4. With 0.3 s every one of nine runs read the true number. It makes a
 * far walk at most 0.6 s longer, far inside `REMOTE_TREE_TIMEOUT_MS`.
 */
export const FIND_HOLD_S = '0.3';
/** The arms whose grade reads the PARENT's reading, not only HEAD's. */
const PARENT_GRADED = new Set(['C1', 'R0', 'RUN']);

// ===========================================================================
// THE GRADERS. Pure functions of a recorded reading; nothing here starts a
// process. A reading is the HEAD record's arm with the parent's beside it as
// `parent`, and `wantParent` saying whether a parent was asked for.
// ===========================================================================

const same = (a, b) => J(a) === J(b);
/** The ten R4 links, as a walk names them. */
const TEN = Array.from({ length: 10 }, (_, i) => `ten/l${String(i)}`);
const withParent = (r, test) => (r.wantParent ? r.parent !== null && r.parent !== undefined && test(r.parent) : true);
const marked = (row) => row !== null && row !== undefined && String(row.deco ?? '').includes(MARK) && row.decoTitle === MARK_TITLE;
const off = (label) => `${label} [off]`;
const rowsOfMenu = (menu) => (Array.isArray(menu) ? menu.filter((r) => r !== '—') : []);
const lastRow = (menu) => {
  const rows = rowsOfMenu(menu);
  return rows.length === 0 ? null : rows[rows.length - 1];
};
const underLinkMenuClean = (menu) => Array.isArray(menu) && menu.length > 0 && UNDER_LINK_ABSENT.every((v) => !rowsOfMenu(menu).some((r) => r === v || r === off(v)));
const oneFootnoteLast = (menu) =>
  Array.isArray(menu) && rowsOfMenu(menu).filter((r) => r === off(LINK_NOTE) || r === LINK_NOTE).length === 1 && lastRow(menu) === off(LINK_NOTE);
const disabledRows = (menu) => rowsOfMenu(menu).filter((r) => r.endsWith(' [off]'));
/** Two `ino mtimeMs` readings, both present and equal. */
const unmoved = (f) => f !== null && f !== undefined && typeof f.before === 'string' && f.before !== '' && f.before === f.after;
/** A row reading drawn as its stat says: a folder exactly when stat said 'dir'. */
const drawnAsStat = (l) => l.drawn !== null && l.drawn !== undefined && (l.drawn.type === 'folder') === (l.stat === 'dir');

export const GRADERS = {
  L1: {
    title: "the issue's shape: one chain row .claude/skills, a folder marked as a link, opening to what is inside",
    clauses: [
      ['one chain row .claude/skills, a folder', (r) => r.chain !== null && r.chain?.path === '.claude/skills/' && r.chain?.type === 'folder' && r.chain?.label === '.claude / skills'],
      ['the chain row is marked ⤷ and titled Link', (r) => marked(r.chain)],
      ['it opens to a-skill/ and notes.md', (r) => same(r.children, ['.claude/skills/a-skill/', '.claude/skills/notes.md'])],
      ['notes.md opens with the band', (r) => r.band === BAND]
    ]
  },
  L2: {
    title: "every link row is drawn as the probe's own stat reads the disk, and marked",
    clauses: [
      ['every fixture link was found as a row', (r) => Array.isArray(r.links) && r.links.length === LINK_COUNT && r.links.every((l) => l.drawn !== null && l.drawn !== undefined)],
      ['a link is a folder exactly when stat says folder', (r) => Array.isArray(r.links) && r.links.length > 0 && r.links.every(drawnAsStat)],
      ['every link row is marked ⤷ and titled Link', (r) => Array.isArray(r.links) && r.links.length > 0 && r.links.every((l) => marked(l.drawn))]
    ]
  },
  L3: {
    title: 'every door on a row under a link refuses; the link row keeps its verbs; nothing reaches a disk through a link',
    clauses: [
      ['a row under a link offers none of the six verbs', (r) => underLinkMenuClean(r.menus?.underSkills) && underLinkMenuClean(r.menus?.underLinkOut)],
      ['a row under a link ends with one footnote, Read only through a link', (r) => oneFootnoteLast(r.menus?.underSkills) && oneFootnoteLast(r.menus?.underLinkOut)],
      ['a row under a link keeps Open, Reveal and the two Copy rows', (r) => [r.menus?.underSkills, r.menus?.underLinkOut].every((m) => UNDER_LINK_KEPT.every((v) => rowsOfMenu(m).includes(v)))],
      // FIX ROUND: every row the parent's link row offered but Open and Open in
      // New Tab, Open With and History among them (both worked there).
      ['the link row keeps every row it had but Open and Open in New Tab, and has no footnote', (r) => LINK_ROW_KEPT.every((v) => rowsOfMenu(r.menus?.linkRow).includes(v)) && !LINK_ROW_GONE.some((v) => rowsOfMenu(r.menus?.linkRow).includes(v)) && !rowsOfMenu(r.menus?.linkRow).some((x) => x.startsWith(LINK_NOTE))],
      ['F2, ⌫ and Delete start nothing under a link', (r) => ['underSkills', 'underLinkOut'].every((k) => r.keys?.[k] !== undefined && r.keys[k].f2Box === false && r.keys[k].backspaceDialog === false && r.keys[k].deleteDialog === false)],
      ['no drag starts from a row under a link', (r) => r.drags?.treeMove?.intercepted === false && r.drags?.toTerminal?.intercepted === false && r.drags?.toFinder?.intercepted === false && r.drags?.toFinder?.startDrag === 0],
      // FIX ROUND: a drop over the link row lands BESIDE it, where it landed at
      // the parent; nothing lands under a link.
      ['nothing is dropped under a link; a drop over the link row lands beside it', (r) => r.drops?.underLink?.landed === false && same(r.drops?.linkRow?.where, [LINK_ROW_DROP])],
      ['every create lands in .claude/, none in .agent/skills/', (r) => Array.isArray(r.creates?.claude) && Array.isArray(r.creates?.agentSkills) && CREATES.every((c) => r.creates.claude.includes(c.name) && !r.creates.agentSkills.includes(c.name))],
      ['the duplicate of the link row is a folder marked ⤷', (r) => r.duplicate?.path === '.claude/skills copy/' && r.duplicate?.type === 'folder' && marked(r.duplicate)],
      // REVIEW (rule 9): `before` must be the buffer's TEXT. Two nulls (no
      // Monaco model at either read) were equal, so a Monaco that was never
      // there passed as one that refused the typing.
      ['no tab went dirty after typing in Monaco and Redline past auto save', (r) => Array.isArray(r.editor?.dirtyTabs) && r.editor.dirtyTabs.length === 0 && r.editor?.monaco?.typedInto === true && typeof r.editor.monaco.before === 'string' && r.editor.monaco.before === r.editor.monaco.after && r.editor?.autoSaveWaited === true],
      ['Redline refuses the rewind with the read-only sentence', (r) => r.editor?.redlineShown === true && Array.isArray(r.editor?.redlineToasts) && r.editor.redlineToasts.includes(REDLINE_REFUSED)],
      // REVIEW (rule 9): a ⌘S on a tab with no editor text writes nothing
      // whatever the flag says (`saveOnce` and `saveOnMachine` return false on
      // a null model, tab-io.ts), and a markdown tab opens RENDERED with none,
      // so `notes.md` is put in Source first and every save must have had text.
      ['no toast on either clean ⌘S', (r) => Array.isArray(r.editor?.saveToasts) && r.editor.saveToasts.length === 0 && r.editor?.savesPressed === 3 && r.editor?.savedWithText === 3],
      ["no ⌘S moved a real file's inode or modified time", (r) => ['notes', 'index', 'secret'].every((k) => unmoved(r.editor?.files?.[k]))],
      // REVIEW (rule 9): the census ALLOWS `.agent/skills/notes.md` because the
      // probe appends to it, so a write through the link landing there (Redline
      // typing saved by auto save, a rewind not refused) was invisible. Its
      // bytes are known exactly: what the fixture wrote plus the probe's line.
      ['notes.md holds exactly what the fixture and the probe wrote', (r) => typeof r.editor?.notes?.bytes === 'string' && r.editor.notes.bytes === r.editor.notes.expected]
    ]
  },
  L4: {
    title: 'Move to Trash on the link row says only the link moves, and is cancelled',
    clauses: [
      ["the confirm's body ends with the link sentence", (r) => typeof r.body === 'string' && r.body.endsWith(TRASH_ONE)],
      ['Cancel was pressed and the dialog closed', (r) => r.cancelled === true && r.dialogAfter === false],
      ['the link and its target are unchanged', (r) => r.linkBefore === 'link ../.agent/skills' && r.linkAfter === r.linkBefore && typeof r.targetBefore === 'string' && r.targetAfter === r.targetBefore]
    ]
  },
  L5: {
    title: 'dimming survives a revalidation with a linked folder open',
    clauses: [
      ['a revalidation ran: the fresh.log witness dimmed', (r) => r.freshDimmed === true],
      ['every ignored row is dimmed after it', (r) => ['node_modules/', 'ignored.log', '.venv', 'bazel-out', 'node_modules/pkgb', 'node_modules/pkgb/b.js', 'fresh.log'].every((p) => r.dimmed?.[p] === true)],
      ['newLink carries the untracked mark', (r) => r.newLinkGit === 'untracked'],
      // REVIEW (rule 9): a row the drive did not find reads 'absent', which is
      // not 'ignored', so two rows that were never drawn passed as undimmed.
      ['rows under .claude/skills are not dimmed', (r) => r.underSkills !== undefined && Object.keys(r.underSkills).length === 2 && Object.values(r.underSkills).every((g) => g !== 'ignored' && g !== 'absent')]
    ]
  },
  L6: {
    title: "a linked folder in the project follows the watcher; one outside it follows Refresh",
    clauses: [
      ['a write into .agent/skills shows under .claude/skills with no Refresh', (r) => r.inProject?.shown === true],
      ['a write into outside/ shows under linkOut after Refresh', (r) => r.outside?.afterRefresh === true]
    ]
  },
  L7: {
    title: 'a link to a FIFO is inert',
    // REVIEW (rule 9): the tab list itself must not move. A tab opened under
    // another spelling (the FIFO's own path), or a preview tab replaced, was
    // invisible to a search for a tab named `linkPipe`.
    clauses: [['a click on linkPipe opens no tab', (r) => r.clicked === true && r.tabOpened === false && Array.isArray(r.idsBefore) && same(r.idsBefore, r.idsAfter)]]
  },
  C1: {
    title: "Context opens a file by a link's spelling and saves through it, at both builds",
    clauses: [
      ['Context opened SKILL.md', (r) => typeof r.opened === 'string' && r.opened.endsWith('/SKILL.md')],
      ['one character typed and ⌘S wrote it', (r) => r.fileHasTyped === true],
      ['the parent saved it too', (r) => withParent(r, (p) => p.fileHasTyped === true)]
    ]
  },
  R0: {
    title: 'a far folder at the walk\'s last level opens to its files (7.7)',
    clauses: [
      ['the parent opened deep/a/b empty and asked nothing (7.7 stands)', (r) => withParent(r, (p) => Array.isArray(p.rowsUnder) && p.rowsUnder.length === 0 && p.walks === 0)],
      ['c/ is shown under deep/a/b', (r) => Array.isArray(r.rowsUnder) && r.rowsUnder.some((p) => p.startsWith('deep/a/b/c'))],
      // REVIEW (rule 9): ONE far walk runs `find` TWICE, the list and then the
      // count (TREE_LIST's `o=` and `c=`), so the log holds two `S` lines a
      // walk (measured over the shipping text under /bin/sh). One walk is 2;
      // 1 is not a whole walk and 4 is two.
      ['deep/a/b was walked once', (r) => r.walks === FINDS_PER_WALK]
    ]
  },
  R1: {
    title: 'a linked folder on another machine opens, read only, and keeps its rows',
    clauses: [
      ['every far link row is drawn as stat reads it, and marked', (r) => Array.isArray(r.links) && r.links.length === LINK_COUNT && r.links.every((l) => drawnAsStat(l) && marked(l.drawn))],
      ['.claude/skills opens to a-skill/ and notes.md and keeps them across Refresh', (r) => same(r.skills?.children, ['.claude/skills/a-skill/', '.claude/skills/notes.md']) && same(r.skills?.afterRefresh, r.skills?.children)],
      ['the menu under the link ends with the link footnote and no machine note', (r) => oneFootnoteLast(r.menu) && disabledRows(r.menu).length === 1 && underLinkMenuClean(r.menu)],
      ['notes.md opens read only with the band', (r) => r.band === BAND],
      // REVIEW (rule 9): `saveWithText` for the reason L3's saves carry it.
      ['a clean ⌘S sends no far write', (r) => unmoved(r.farFile) && Array.isArray(r.saveToasts) && r.saveToasts.length === 0 && r.savePressed === true && r.saveWithText === true]
    ]
  },
  R2: {
    title: 'a far link to / opens once, inside the deadline, unannounced',
    clauses: [
      ['rows under linkFsRoot inside 20 s', (r) => Number.isInteger(r.rowsUnder) && r.rowsUnder > 0 && typeof r.ms === 'number' && r.ms <= 20_000],
      ["the Explorer's line is still the root's", (r) => r.note === null]
    ]
  },
  R3: {
    title: 'a far link that is denied or gone opens to nothing and the Explorer keeps every row',
    clauses: [
      ['the Explorer keeps its rows and draws no refusal at every step', (r) => Array.isArray(r.steps) && same(r.steps.map((s) => s.what), ['linkVarRoot', 'linkLocked', 'linkGone', 'reopened']) && r.steps.every((s) => s.rows > 0 && s.stub === null)],
      // REVIEW (rule 9): a link row the drive never opened (not a folder, or
      // not found) kept the Explorer's rows trivially.
      ['each of the three links was opened', (r) => Array.isArray(r.steps) && r.steps.filter((s) => s.what !== 'reopened').length === 3 && r.steps.filter((s) => s.what !== 'reopened').every((s) => s.opened === true)],
      // FIX ROUND: the close asks first, and an unanswered confirm left the
      // tab open, so "reopened" read a tab that never closed.
      ['the far tab was really closed before it reopened', (r) => Array.isArray(r.steps) && r.steps.find((s) => s.what === 'reopened')?.closed === true]
    ]
  },
  R4: {
    title: 'never more than ten far walks in flight',
    clauses: [
      // REVIEW (rule 9): `linkWalks` counts `find` runs, two a walk, so `>= 10`
      // passed with FIVE links walked. The ten link paths themselves, each one.
      ['the ten links were walked', (r) => same(r.linkPaths, TEN)],
      // FIX ROUND: the two passes that walk them all at once, each in its own
      // window of the far log (D18, D19), and the close made for real first.
      ['Refresh walked the ten links again', (r) => same(r.refreshPaths, TEN)],
      ['the far tab was really closed before it reopened', (r) => r.closed === true],
      ['the reopened tab walked the ten links again', (r) => same(r.reopenPaths, TEN)],
      ['never more than ten walks in flight', (r) => Number.isInteger(r.maxInFlight) && r.maxInFlight >= 1 && r.maxInFlight <= 10]
    ]
  },
  RUN: {
    title: 'nothing landed but what the probe wrote, nothing was kept through a link, and nothing was left',
    clauses: [
      ["no write landed but the probe's own", (r) => Array.isArray(r.census?.changed) && r.census.measured === true && r.census.changed.every((k) => allowedChange(k, r.census.allowed ?? []))],
      ['no baseline record names a path under a link', (r) => r.baselines?.read === true && Array.isArray(r.baselines?.underLink) && r.baselines.underLink.length === 0],
      ['his dotfiles did not move', (r) => Array.isArray(r.dotfiles?.moved) && r.dotfiles.moved.length === 0 && r.dotfiles?.before?.done === true],
      ['no Electron was left', (r) => r.electronsLeft === 0],
      ['the parent ran every arm it was asked for', (r) => withParent(r, (p) => Array.isArray(p.ran) && Array.isArray(r.ran) && r.ran.every((a) => p.ran.includes(a)))]
    ]
  }
};

/**
 * A census key the probe may have moved: EXACTLY an allowed key, or under an
 * allowed `…/**` prefix. A folder's own key (`proj/.claude/`) is its LISTING,
 * so allowing it allows a name to appear there and nothing under it; only a
 * key the probe names with `/**` allows a whole subtree, and the probe uses
 * that for one folder it removes (R3's `gone/`).
 */
export function allowedChange(key, allowed) {
  return allowed.some((a) => key === a || (a.endsWith('/**') && key.startsWith(a.slice(0, -2))));
}

/** Grade one arm: `{ ok, failed, unreadable }`. A reading that says it could not be read is never a pass. */
export function grade(id, reading) {
  if (reading === null || reading === undefined) return { ok: false, failed: [], unreadable: 'no reading was recorded' };
  if (typeof reading.unreadable === 'string' && reading.unreadable !== '') return { ok: false, failed: [], unreadable: reading.unreadable };
  // REVIEW (rule 9): an arm graded on the parent's reading cannot be read when
  // that reading could not be. It was a FAIL, and for R0 it printed
  // "7.7 REFUTED", which is the line that tells a fix round to remove 7.7.
  if (PARENT_GRADED.has(id) && reading.wantParent === true) {
    const p = reading.parent;
    if (p === null || p === undefined) return { ok: false, failed: [], unreadable: 'a parent was asked for and recorded no reading for this arm' };
    if (typeof p.unreadable === 'string' && p.unreadable !== '') return { ok: false, failed: [], unreadable: `the parent's reading could not be read: ${p.unreadable}` };
  }
  const failed = [];
  for (const [name, test] of GRADERS[id].clauses) {
    let ok = false;
    try {
      ok = test(reading) === true;
    } catch {
      ok = false;
    }
    if (!ok) failed.push(name);
  }
  return { ok: failed.length === 0, failed, unreadable: null };
}

/**
 * REVIEW (rule 9). The names `run()` binds with `const`, `let` or `var` BELOW
 * its `process.exit(0)`. Every helper the builds call lives down there, and the
 * builds run ABOVE that line, so such a binding is still uninitialised when it
 * is first used (the temporal dead zone): the first draft of this file lost
 * every arm of every build that way. Function declarations are hoisted with
 * their value; only they may live below the exit. Read as text, over this
 * file's own source.
 */
export function lateBindings(source) {
  const lines = String(source).split('\n');
  const start = lines.findIndex((l) => l.startsWith('async function run()'));
  if (start === -1) return ['(no run() found)'];
  const end = lines.findIndex((l, i) => i > start && l === '}');
  const exit = lines.findIndex((l, i) => i > start && i < end && l === '  process.exit(0);');
  if (exit === -1 || end === -1) return ['(no process.exit(0) at the top level of run())'];
  const late = [];
  for (let i = exit + 1; i < end; i += 1) {
    const m = /^ {2}(?:const|let|var) +([A-Za-z_$][\w$]*|\{|\[)/.exec(lines[i]);
    if (m !== null) late.push(m[1]);
  }
  return late;
}

/**
 * THE NARROW FIX (2026-10-07). Every file name a Finder drop hands the app (a
 * code line `await finderDrop(ctx, …, join(ctx.drops, NAME))`) that no code
 * line writes into the build's drops folder before the launch (a line starting
 * `    writeFileSync(join(drops, NAME), `). The reverify's L3 failed at both
 * builds on a correct product because the link row's drop handed a name
 * nothing wrote, so the drop carried no file. Read by LINE START, so a string
 * or a comment that only names the shape is never counted.
 */
export function unwrittenDrops(source) {
  const text = String(source);
  const written = new Set([...text.matchAll(/^ {4}writeFileSync\(join\(drops, '([^']+)'\), /gm)].map((m) => m[1]));
  const handed = [...new Set([...text.matchAll(/^ +await finderDrop\(ctx, [^\n]*?join\(ctx\.drops, '([^']+)'\)\);$/gm)].map((m) => m[1]))];
  if (handed.length === 0) return ['(no drop handed a file)'];
  return handed.filter((name) => !written.has(name)).sort();
}

/** HEAD's arm with the parent's beside it. */
export function readingOf(id, head, parent) {
  const h = id === 'RUN' ? head?.run : head?.arms?.[id];
  const p = parent === null || parent === undefined ? null : id === 'RUN' ? parent.run ?? null : parent.arms?.[id] ?? null;
  if (h === undefined || h === null) return null;
  return { ...h, parent: p, wantParent: parent !== null && parent !== undefined };
}

/** The row paths DIRECTLY in `folder` (with its slash), sorted: a folder's own slash is not a level. */
export function directUnder(paths, folder) {
  return paths.filter((p) => p !== folder && p.startsWith(folder) && !p.slice(folder.length).replace(/\/$/, '').includes('/')).sort();
}

/**
 * The one line R0 prints about the parent (ruling 5, SPEC §10 R0): `7.7
 * REFUTED` ONLY when the parent SHOWS `c/` under `deep/a/b`, `7.7 STANDS` when
 * it opened empty and asked nothing, and `7.7 NOT DECIDED` for any other
 * parent reading, an unreadable one above all.
 *
 * REVIEW (rule 9): it answered REFUTED for every parent reading that was not
 * exactly empty and unasked, so a parent whose far log could not be read (or
 * whose folder was never drawn) printed the line that removes 7.7.
 */
export function r0Verdict(r) {
  if (r === null || r === undefined || !r.wantParent) return null;
  const p = r.parent;
  if (p === null || p === undefined || (typeof p.unreadable === 'string' && p.unreadable !== '')) return '7.7 NOT DECIDED';
  if (!Array.isArray(p.rowsUnder) || !Number.isInteger(p.walks)) return '7.7 NOT DECIDED';
  if (p.rowsUnder.some((x) => typeof x === 'string' && x.startsWith('deep/a/b/c'))) return '7.7 REFUTED';
  if (p.rowsUnder.length === 0 && p.walks === 0) return '7.7 STANDS';
  return '7.7 NOT DECIDED';
}

// ===========================================================================
// THE FAR COUNT (D22). The wrapper and the .zshenv are TEXT the probe writes
// into the yard; the log is read by a pure parser.
// ===========================================================================

/**
 * The find wrapper: logs `S <pid> <path>` and `E <pid>` around a tree-list
 * walk's `find`, HOLDS it `FIND_HOLD_S` first so walks in flight together are
 * seen together (see `FIND_HOLD_S`), and runs the real find. Every other
 * `find` is handed straight to the real one.
 */
export function findWrapperText(log) {
  if (/['\n]/.test(log)) throw new Error(`the far log path ${J(log)} holds a quote or a newline`);
  return [
    '#!/bin/sh',
    '# Written by build/p343/probe-p343.mjs (SPEC D22) into the yard; removed in its finally.',
    'case " $* " in',
    '  *" -mindepth 1 -name .git -prune -o -print "*)',
    '    if [ "$1" = -H ]; then p=$2; else p=$1; fi',
    `    printf 'S %s %s\\n' "$$" "$p" >> '${log}'`,
    `    /bin/sleep ${FIND_HOLD_S}`,
    '    /usr/bin/find "$@"',
    '    s=$?',
    `    printf 'E %s\\n' "$$" >> '${log}'`,
    '    exit "$s" ;;',
    'esac',
    'exec /usr/bin/find "$@"',
    ''
  ].join('\n');
}

/** The .zshenv that puts the wrapper first on PATH for the far shells of the yard alone. */
export function zshenvText(binDir) {
  if (/['\s]/.test(binDir)) throw new Error(`the wrapper folder ${J(binDir)} holds a quote or a space`);
  return `# Written by build/p343/probe-p343.mjs into this yard's own ZDOTDIR (SPEC D22); removed in its finally.\nexport PATH='${binDir}':"$PATH"\n`;
}

/**
 * Read the wrapper's log: every walk's path in order, the most in flight at
 * once (an `S` opens a pid, its `E` closes it), and what was still open.
 * `fromLine` starts the count of walks there while the in-flight set is carried
 * from the start, so a window's maximum includes walks begun before it.
 */
export function parseFindLog(text, fromLine = 0, toLine = Number.POSITIVE_INFINITY) {
  const open = new Set();
  let maxInFlight = 0;
  const walks = [];
  const lines = String(text ?? '').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let m = /^S (\d+) (.*)$/.exec(line);
    if (m !== null) {
      open.add(m[1]);
      if (i >= fromLine && i < toLine) {
        // A folder handed to the walk with a trailing slash is the same folder.
        walks.push(m[2].length > 1 ? m[2].replace(/\/+$/, '') : m[2]);
        if (open.size > maxInFlight) maxInFlight = open.size;
      }
      continue;
    }
    m = /^E (\d+)$/.exec(line);
    if (m !== null) open.delete(m[1]);
  }
  return { maxInFlight, walks, stillOpen: open.size, lines: lines.length };
}

// ===========================================================================
// THE SELF-TEST. Nothing below starts a process.
// ===========================================================================

function fixture(name) {
  return JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
}

/** One break per clause: each must fail exactly that clause. */
export const BREAKS = {
  L1: {
    'one chain row .claude/skills, a folder': (r) => { r.chain.type = 'file'; },
    'the chain row is marked ⤷ and titled Link': (r) => { r.chain.deco = ''; },
    'it opens to a-skill/ and notes.md': (r) => { r.children = []; },
    'notes.md opens with the band': (r) => { r.band = null; }
  },
  L2: {
    'every fixture link was found as a row': (r) => { r.links[3].drawn = null; },
    'a link is a folder exactly when stat says folder': (r) => { r.links.find((l) => l.rel === 'dangling').drawn.type = 'folder'; },
    'every link row is marked ⤷ and titled Link': (r) => { r.links.find((l) => l.rel === 'linkFile').drawn.deco = ''; }
  },
  L3: {
    'a row under a link offers none of the six verbs': (r) => { r.menus.underSkills.splice(3, 0, 'Rename…'); },
    'a row under a link ends with one footnote, Read only through a link': (r) => { r.menus.underLinkOut = r.menus.underLinkOut.filter((x) => !x.startsWith(LINK_NOTE)); },
    'a row under a link keeps Open, Reveal and the two Copy rows': (r) => { r.menus.underSkills = r.menus.underSkills.filter((x) => x !== 'Reveal in Finder'); },
    'the link row keeps every row it had but Open and Open in New Tab, and has no footnote': (r) => { r.menus.linkRow.push('—', off(LINK_NOTE)); },
    'F2, ⌫ and Delete start nothing under a link': (r) => { r.keys.underSkills.f2Box = true; },
    'no drag starts from a row under a link': (r) => { r.drags.toFinder.startDrag = 1; },
    'nothing is dropped under a link; a drop over the link row lands beside it': (r) => { r.drops.linkRow = { landed: false, where: [] }; },
    'every create lands in .claude/, none in .agent/skills/': (r) => { r.creates.agentSkills.push('p343-hdr-file-under.txt'); },
    'the duplicate of the link row is a folder marked ⤷': (r) => { r.duplicate.type = 'file'; },
    'no tab went dirty after typing in Monaco and Redline past auto save': (r) => { r.editor.dirtyTabs = ['index.ts']; },
    'Redline refuses the rewind with the read-only sentence': (r) => { r.editor.redlineToasts = []; },
    'no toast on either clean ⌘S': (r) => { r.editor.saveToasts = ['That path is outside the project.']; },
    "no ⌘S moved a real file's inode or modified time": (r) => { r.editor.files.notes.after = '774965478 1791400000000'; },
    'notes.md holds exactly what the fixture and the probe wrote': (r) => { r.editor.notes.bytes = `${r.editor.notes.expected}z`; }
  },
  L4: {
    "the confirm's body ends with the link sentence": (r) => { r.body = 'skills will be moved to the Trash.'; },
    'Cancel was pressed and the dialog closed': (r) => { r.dialogAfter = true; },
    'the link and its target are unchanged': (r) => { r.linkAfter = null; }
  },
  L5: {
    'a revalidation ran: the fresh.log witness dimmed': (r) => { r.freshDimmed = false; },
    'every ignored row is dimmed after it': (r) => { r.dimmed['.venv'] = false; },
    'newLink carries the untracked mark': (r) => { r.newLinkGit = null; },
    'rows under .claude/skills are not dimmed': (r) => { r.underSkills['.claude/skills/notes.md'] = 'ignored'; }
  },
  L6: {
    'a write into .agent/skills shows under .claude/skills with no Refresh': (r) => { r.inProject.shown = false; },
    'a write into outside/ shows under linkOut after Refresh': (r) => { r.outside.afterRefresh = false; }
  },
  L7: { 'a click on linkPipe opens no tab': (r) => { r.tabOpened = true; } },
  C1: {
    'Context opened SKILL.md': (r) => { r.opened = null; },
    'one character typed and ⌘S wrote it': (r) => { r.fileHasTyped = false; },
    'the parent saved it too': (r) => { r.parent.fileHasTyped = false; }
  },
  R0: {
    'the parent opened deep/a/b empty and asked nothing (7.7 stands)': (r) => { r.parent.rowsUnder = ['deep/a/b/c/']; },
    'c/ is shown under deep/a/b': (r) => { r.rowsUnder = []; },
    'deep/a/b was walked once': (r) => { r.walks = 0; }
  },
  R1: {
    'every far link row is drawn as stat reads it, and marked': (r) => { r.links[0].drawn.type = 'file'; },
    '.claude/skills opens to a-skill/ and notes.md and keeps them across Refresh': (r) => { r.skills.afterRefresh = []; },
    'the menu under the link ends with the link footnote and no machine note': (r) => { r.menu.push('—', off('Tortie does not save files on P343 Machine.')); },
    'notes.md opens read only with the band': (r) => { r.band = null; },
    'a clean ⌘S sends no far write': (r) => { r.farFile.after = '1 2'; }
  },
  R2: {
    'rows under linkFsRoot inside 20 s': (r) => { r.ms = 25_000; },
    "the Explorer's line is still the root's": (r) => { r.note = 'Showing 4,000 of 6,710 entries.'; }
  },
  R3: {
    'the Explorer keeps its rows and draws no refusal at every step': (r) => { r.steps[1].stub = 'Tortie cannot read that folder on P343 Machine.'; },
    'each of the three links was opened': (r) => { r.steps[0].opened = false; },
    'the far tab was really closed before it reopened': (r) => { r.steps[3].closed = false; }
  },
  R4: {
    'the ten links were walked': (r) => { r.linkPaths = r.linkPaths.slice(0, 5); },
    'Refresh walked the ten links again': (r) => { r.refreshPaths = []; },
    'the far tab was really closed before it reopened': (r) => { r.closed = false; },
    'the reopened tab walked the ten links again': (r) => { r.reopenPaths = r.reopenPaths.slice(1); },
    'never more than ten walks in flight': (r) => { r.maxInFlight = 11; }
  },
  RUN: {
    "no write landed but the probe's own": (r) => { r.census.changed.push('local:outside/secret.txt'); },
    'no baseline record names a path under a link': (r) => { r.baselines.underLink.push('.claude/skills/notes.md'); },
    'his dotfiles did not move': (r) => { r.dotfiles.moved = ['.zsh_history']; },
    'no Electron was left': (r) => { r.electronsLeft = 1; },
    'the parent ran every arm it was asked for': (r) => { r.parent.ran = r.parent.ran.filter((a) => a !== 'R4'); }
  }
};

/** Hostile edits beyond BREAKS, each of which must turn the named clause red. */
const REFUSED_EDITS = {
  L3: [
    { what: 'a footnote DOUBLED under the link', clause: 'a row under a link ends with one footnote, Read only through a link', edit: (r) => { r.menus.underSkills.push('—', off(LINK_NOTE)); } },
    { what: 'the footnote beside the machine note', clause: 'a row under a link ends with one footnote, Read only through a link', edit: (r) => { r.menus.underLinkOut.push('—', off('Tortie does not save files on P343 Machine.')); } },
    { what: 'History kept under the link', clause: 'a row under a link offers none of the six verbs', edit: (r) => { r.menus.underLinkOut.unshift('History'); } },
    { what: "a real file's inode moved by a ⌘S", clause: "no ⌘S moved a real file's inode or modified time", edit: (r) => { r.editor.files.secret.after = '1 1'; } },
    { what: 'a stat that was never read', clause: "no ⌘S moved a real file's inode or modified time", edit: (r) => { r.editor.files.index = { before: '', after: '' }; } },
    { what: 'a Monaco that was never typed into', clause: 'no tab went dirty after typing in Monaco and Redline past auto save', edit: (r) => { r.editor.monaco.typedInto = false; } },
    { what: 'a create that landed in .agent/skills alone', clause: 'every create lands in .claude/, none in .agent/skills/', edit: (r) => { r.creates.claude = r.creates.claude.filter((n) => n !== 'p343-menu-file.txt'); } },
    { what: 'a drag toward a terminal that started', clause: 'no drag starts from a row under a link', edit: (r) => { r.drags.toTerminal.intercepted = true; } },
    { what: 'a drop under the link that landed', clause: 'nothing is dropped under a link; a drop over the link row lands beside it', edit: (r) => { r.drops.underLink.landed = true; } },
    // FIX ROUND: the three ways the link row could be worse than the parent's.
    { what: 'a drop over the link row that landed INSIDE the link', clause: 'nothing is dropped under a link; a drop over the link row lands beside it', edit: (r) => { r.drops.linkRow.where = ['local:proj/.agent/skills/p343-dropped-link.txt']; } },
    { what: 'Open With gone from the link row', clause: 'the link row keeps every row it had but Open and Open in New Tab, and has no footnote', edit: (r) => { r.menus.linkRow = r.menus.linkRow.filter((x) => x !== 'Open With'); } },
    { what: 'History gone from the link row', clause: 'the link row keeps every row it had but Open and Open in New Tab, and has no footnote', edit: (r) => { r.menus.linkRow = r.menus.linkRow.filter((x) => x !== 'History'); } },
    { what: 'Open on the link row, which opens a tab that cannot be read', clause: 'the link row keeps every row it had but Open and Open in New Tab, and has no footnote', edit: (r) => { r.menus.linkRow.unshift('Open'); } },
    { what: 'a ⌘S pressed fewer than three times', clause: 'no toast on either clean ⌘S', edit: (r) => { r.editor.savesPressed = 2; } },
    // The review's own (rule 9): each of these PASSED before the review.
    { what: 'a Monaco with no text at either read', clause: 'no tab went dirty after typing in Monaco and Redline past auto save', edit: (r) => { r.editor.monaco.before = null; r.editor.monaco.after = null; } },
    { what: 'a clean ⌘S on a tab with no text in the editor', clause: 'no toast on either clean ⌘S', edit: (r) => { r.editor.savedWithText = 2; } },
    { what: 'a Redline keystroke saved through the link by auto save', clause: 'notes.md holds exactly what the fixture and the probe wrote', edit: (r) => { r.editor.notes.bytes = 'notes\nzappended by p343\n'; } },
    { what: 'a rewind that was not refused', clause: 'notes.md holds exactly what the fixture and the probe wrote', edit: (r) => { r.editor.notes.bytes = 'notes\n'; } }
  ],
  L5: [
    { what: 'dimming lost after the revalidation', clause: 'every ignored row is dimmed after it', edit: (r) => { for (const k of Object.keys(r.dimmed)) if (k !== 'fresh.log') r.dimmed[k] = false; } },
    { what: 'the rows under the link never drawn', clause: 'rows under .claude/skills are not dimmed', edit: (r) => { for (const k of Object.keys(r.underSkills)) r.underSkills[k] = 'absent'; } }
  ],
  L7: [{ what: 'a tab opened under the FIFO\'s own spelling', clause: 'a click on linkPipe opens no tab', edit: (r) => { r.idsAfter = [...r.idsAfter, 'tree:/h/p343/head/local/proj/pipe']; } }],
  R0: [
    { what: 'deep/a/b walked twice', clause: 'deep/a/b was walked once', edit: (r) => { r.walks = 4; } },
    { what: 'one find run, not a whole walk', clause: 'deep/a/b was walked once', edit: (r) => { r.walks = 1; } }
  ],
  R1: [
    { what: 'two disabled rows under the link', clause: 'the menu under the link ends with the link footnote and no machine note', edit: (r) => { r.menu.splice(r.menu.length - 2, 0, '—', off('Tortie does not save files on P343 Machine.')); } },
    { what: 'a far ⌘S on a tab with no text in the editor', clause: 'a clean ⌘S sends no far write', edit: (r) => { r.saveWithText = false; } }
  ],
  R3: [
    { what: 'the Explorer replaced by a refusal', clause: 'the Explorer keeps its rows and draws no refusal at every step', edit: (r) => { r.steps[2].rows = 0; r.steps[2].stub = 'That folder is not on P343 Machine any more.'; } },
    { what: 'linkGone never opened (drawn as a file)', clause: 'each of the three links was opened', edit: (r) => { r.steps[2].opened = false; } },
    { what: 'a reopen with no close (the confirm never answered)', clause: 'the far tab was really closed before it reopened', edit: (r) => { delete r.steps[3].closed; } }
  ],
  R4: [
    { what: 'eleven far walks in flight', clause: 'never more than ten walks in flight', edit: (r) => { r.maxInFlight = 11; } },
    { what: 'five links walked twice each (ten find runs)', clause: 'the ten links were walked', edit: (r) => { r.linkWalks = 10; r.linkPaths = ['ten/l0', 'ten/l1', 'ten/l2', 'ten/l3', 'ten/l4']; } },
    // FIX ROUND: the first app run's own shape, ten/l0 never walked because a
    // confirm left up by R3 ate the first click.
    { what: 'ten/l0 never walked (a click eaten by a confirm left up)', clause: 'the ten links were walked', edit: (r) => { r.linkPaths = r.linkPaths.slice(1); } },
    { what: 'a reopen that walked nothing because the tab never closed', clause: 'the reopened tab walked the ten links again', edit: (r) => { r.reopenPaths = []; } }
  ],
  RUN: [
    { what: 'a write landing: a census sha256 moved', clause: "no write landed but the probe's own", edit: (r) => { r.census.changed.push('local:proj/.agent/skills/notes.md.p343'); } },
    { what: 'a census that was never measured', clause: "no write landed but the probe's own", edit: (r) => { r.census.measured = false; } },
    { what: 'a baseline store that could not be read', clause: 'no baseline record names a path under a link', edit: (r) => { r.baselines.read = false; } },
    { what: 'a dotfile census that did not finish', clause: 'his dotfiles did not move', edit: (r) => { r.dotfiles.before.done = false; } }
  ]
};

export function graderSelfTest(write = (line) => process.stdout.write(`${line}\n`)) {
  let head;
  let parent;
  try {
    head = fixture('head-record.json');
    parent = fixture('parent-record.json');
  } catch (err) {
    write(`[p343] grader self-test FAIL: the fixtures did not load: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
  let bad = 0;
  let checks = 0;
  let clauses = 0;
  const say = (ok, text) => {
    checks += 1;
    if (!ok) bad += 1;
    write(`[p343] ${ok ? 'ok  ' : 'BAD '} ${text}`);
  };
  const clone = (v) => JSON.parse(J(v));
  for (const id of Object.keys(GRADERS)) {
    const honest = readingOf(id, head, parent);
    if (honest === null) {
      say(false, `${id}: the HEAD fixture records no reading`);
      continue;
    }
    const pass = grade(id, clone(honest));
    say(pass.ok, `${id} passes its honest reading${pass.ok ? '' : `, failing ${J(pass.failed)} ${pass.unreadable ?? ''}`}`);
    for (const [name] of GRADERS[id].clauses) {
      clauses += 1;
      const breakIt = BREAKS[id]?.[name];
      if (breakIt === undefined) {
        say(false, `${id} has no break for "${name}", so nothing shows that clause can fail`);
        continue;
      }
      const reading = clone(honest);
      breakIt(reading);
      const got = grade(id, reading);
      say(!got.ok && got.failed.includes(name), `${id} goes red on "${name}" when only that is broken${got.failed.includes(name) ? '' : ` (it failed ${J(got.failed)})`}`);
    }
    for (const name of Object.keys(BREAKS[id] ?? {})) {
      if (!GRADERS[id].clauses.some(([c]) => c === name)) say(false, `${id} has a break for "${name}", which is no clause of its grader`);
    }
    for (const { what, clause, edit } of REFUSED_EDITS[id] ?? []) {
      const reading = clone(honest);
      edit(reading);
      const got = grade(id, reading);
      say(!got.ok && got.failed.includes(clause), `${id} refuses ${what} on "${clause}"${got.failed.includes(clause) ? '' : ` (it failed ${J(got.failed)})`}`);
    }
  }
  // The parent record itself, graded as HEAD, must FAIL every arm whose
  // behaviour this phase changes: a grader that passes today's build measures
  // nothing about the phase. C1 and RUN are the controls that hold at both.
  // R3 is left out on purpose: at the parent a link is a leaf, nothing expands,
  // and the Explorer keeps its rows trivially, which is "no scenario worse".
  for (const id of ['L1', 'L2', 'L3', 'L4', 'L5', 'R0', 'R1', 'R4']) {
    const got = grade(id, readingOf(id, parent, null));
    say(!got.ok, `the parent's own ${id} reading, graded as HEAD, fails${got.ok ? ' (it PASSED, so the grader cannot tell the phase from today)' : ''}`);
  }
  // R0's verdict line, both ways.
  {
    const honest = readingOf('R0', head, parent);
    say(r0Verdict(honest) === '7.7 STANDS', `R0 at the honest parent reads 7.7 STANDS (${String(r0Verdict(honest))})`);
    const refuted = clone(honest);
    refuted.parent.rowsUnder = ['deep/a/b/c/'];
    refuted.parent.walks = 2;
    say(r0Verdict(refuted) === '7.7 REFUTED' && !grade('R0', refuted).ok, 'R0 with the parent showing c/ reads 7.7 REFUTED and fails');
    say(r0Verdict(readingOf('R0', head, null)) === null, 'R0 with no parent asked for prints no verdict');
    // The review's own (rule 9): each of these printed 7.7 REFUTED before it.
    const blind = clone(honest);
    blind.parent = { rowsUnder: null, walks: null, row: null, clicked: false, unreadable: 'the find wrapper logged no root walk, so whether deep/a/b was asked cannot be read' };
    const blindGrade = grade('R0', blind);
    say(r0Verdict(blind) === '7.7 NOT DECIDED' && !blindGrade.ok && blindGrade.unreadable !== null, `R0 with the parent's reading unreadable is UNREADABLE and reads 7.7 NOT DECIDED (${String(r0Verdict(blind))}, ${J(blindGrade)})`);
    const missing = clone(honest);
    missing.parent = null;
    say(r0Verdict(missing) === '7.7 NOT DECIDED' && grade('R0', missing).unreadable !== null, 'R0 with a parent asked for and no parent reading is UNREADABLE and decides nothing');
    const askedEmpty = clone(honest);
    askedEmpty.parent.walks = 2;
    say(r0Verdict(askedEmpty) === '7.7 NOT DECIDED' && !grade('R0', askedEmpty).ok, 'R0 with the parent asking the machine and still showing nothing fails and decides nothing (neither the defect nor its fix)');
    const c1 = clone(readingOf('C1', head, parent));
    c1.parent = { opened: null, relPath: null, typed: 'Q', fileHasTyped: false, toasts: [], unreadable: 'Context listed no a-skill row within 30 s' };
    say(grade('C1', c1).unreadable !== null, "C1 with the parent's reading unreadable is UNREADABLE, never a FAIL of today's build");
  }
  // The far count's instrument (review, rule 9): the wrapper holds a counted
  // find and only a counted one.
  {
    const wrap = findWrapperText('/y/p343-far/finds.log').split('\n');
    const hold = wrap.indexOf(`    /bin/sleep ${FIND_HOLD_S}`);
    const counted = wrap.indexOf('    /usr/bin/find "$@"');
    const logged = wrap.findIndex((l) => l.startsWith("    printf 'S "));
    const other = wrap.indexOf('exec /usr/bin/find "$@"');
    say(logged !== -1 && hold === logged + 1 && counted === hold + 1 && other > counted && !wrap.slice(counted + 1).some((l) => l.includes('sleep')), 'the wrapper logs S, holds, then runs the counted find; any other find runs at once');
  }
  // An unreadable reading is never a pass, and a missing one is unreadable.
  {
    const u = clone(readingOf('L3', head, parent));
    u.unreadable = 'the drag control was never intercepted';
    const got = grade('L3', u);
    say(!got.ok && got.unreadable !== null, 'a reading marked unreadable is UNREADABLE, never a pass');
    say(grade('L3', null).unreadable !== null, 'an arm with no reading is UNREADABLE');
  }
  // The far log parser and the texts it reads.
  {
    const log = ['S 10 /f/proj', 'S 11 /f/proj/deep/a/b', 'E 10', 'S 12 /f/proj/ten/l0', 'S 13 /f/proj/ten/l1', 'E 11', 'E 12', 'E 13', ''].join('\n');
    const p = parseFindLog(log);
    say(p.maxInFlight === 3 && p.walks.length === 4 && p.stillOpen === 0, `the far log reads 4 walks, 3 at most in flight, none open (${J(p)})`);
    const w = parseFindLog(log, 3);
    say(w.walks.length === 2 && w.maxInFlight === 3, `a window from line 3 counts its 2 walks and carries the open one in (${J(w)})`);
    const both = parseFindLog(log, 1, 4);
    say(J(both.walks) === J(['/f/proj/deep/a/b', '/f/proj/ten/l0']), `a window from line 1 to line 4 counts only the walks begun inside it (${J(both.walks)})`);
    const eleven = [...Array.from({ length: 11 }, (_, i) => `S ${String(100 + i)} /f/proj/ten/l${String(i)}`), ...Array.from({ length: 11 }, (_, i) => `E ${String(100 + i)}`)].join('\n');
    say(parseFindLog(eleven).maxInFlight === 11, 'eleven walks begun before any ends read 11 in flight');
    say(parseFindLog('S 1 /a b/c d\nE 1\n').walks[0] === '/a b/c d', 'a path holding spaces is read whole');
    say(parseFindLog('S 1 /f/proj/deep/a/b/\nE 1\nS 2 /\nE 2\n').walks.join('|') === '/f/proj/deep/a/b|/', 'a trailing slash is dropped, and / stays /');
    const wrap = findWrapperText('/y/p343-far/finds.log');
    say(wrap.includes('/usr/bin/find "$@"') && wrap.includes("-mindepth 1 -name .git -prune -o -print") && wrap.startsWith('#!/bin/sh\n'), 'the wrapper runs the real find and counts only the tree-list shape');
    let threw = false;
    try {
      findWrapperText("/y/it's/finds.log");
    } catch {
      threw = true;
    }
    say(threw, 'a log path holding a quote is refused');
    say(zshenvText('/y/p343-far/bin') === "# Written by build/p343/probe-p343.mjs into this yard's own ZDOTDIR (SPEC D22); removed in its finally.\nexport PATH='/y/p343-far/bin':\"$PATH\"\n", 'the .zshenv puts only the wrapper folder first on PATH');
  }
  // The run itself can reach its helpers (review, rule 9): no binding below
  // run()'s exit, and the reader finds a planted one.
  {
    const own = readFileSync(HERE, 'utf8');
    const late = lateBindings(own);
    say(late.length === 0, `run() binds nothing below its process.exit(0), where the builds would meet it uninitialised (${J(late)})`);
    const planted = own.replace('\n  process.exit(0);\n', "\n  process.exit(0);\n  const kit = (cdp) => cdp;\n");
    say(J(lateBindings(planted)) === J(['kit']), `a const planted below the exit is found (${J(lateBindings(planted))})`);
    // THE NARROW FIX: every file a Finder drop hands the app is written first.
    const unwritten = unwrittenDrops(own);
    say(unwritten.length === 0, `every file a Finder drop hands the app is written into the drops folder first (${J(unwritten)})`);
    const dropped = own.replace("    writeFileSync(join(drops, 'p343-dropped-link.txt'), 'link\\n');\n", '');
    say(dropped !== own && J(unwrittenDrops(dropped)) === J(['p343-dropped-link.txt']), `the link row's drop file left unwritten is found (${J(unwrittenDrops(dropped))})`);
  }
  // THE REVIEW'S OWN RECORDED FIXTURES (docs/method/HOW-WE-BUILT-THIS.md rule
  // 9), in fixtures/reviewer/: an honest HEAD and parent pair whose every
  // value not listed in `handWritten` came out of the SHIPPING code over a real
  // fixture.mjs tree (their `derivedBy` says how), and broken readings, each
  // the honest one with ONE thing wrong, several of them the shipping code's
  // own output with a rule taken out and real far logs of this file's wrapper.
  {
    let rHead;
    let rParent;
    let cases;
    try {
      rHead = fixture('reviewer/head-record.json');
      rParent = fixture('reviewer/parent-record.json');
      cases = fixture('reviewer/broken.json');
    } catch (err) {
      say(false, `the review's fixtures did not load: ${err instanceof Error ? err.message : String(err)}`);
      rHead = null;
    }
    if (rHead !== null) {
      for (const id of Object.keys(GRADERS)) {
        const got = grade(id, clone(readingOf(id, rHead, rParent)));
        say(got.ok, `the review's honest ${id} passes${got.ok ? '' : `, failing ${J(got.failed)} ${got.unreadable ?? ''}`}`);
      }
      say(r0Verdict(readingOf('R0', rHead, rParent)) === '7.7 STANDS', "the review's honest parent reads 7.7 STANDS");
      // FIX ROUND: the kept list IS the parent's link row less the two rows a
      // folder row cannot carry, so no row of today's can be dropped silently.
      const parentRow = rowsOfMenu(rParent.arms?.L3?.menus?.linkRow).filter((x) => !LINK_ROW_GONE.includes(x));
      say(J(parentRow) === J(LINK_ROW_KEPT), `LINK_ROW_KEPT is the parent's link row as main built it, less Open and Open in New Tab (${J(parentRow)})`);
      for (const id of ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'R0', 'R1', 'R2', 'R4']) {
        const got = grade(id, readingOf(id, rParent, null));
        say(!got.ok, `the review's parent ${id}, graded as HEAD, fails`);
      }
      const arms = new Set();
      for (const c of cases) {
        arms.add(c.arm);
        const got = grade(c.arm, clone(c.reading));
        const right = c.expect === 'unreadable' ? got.unreadable !== null : !got.ok && got.unreadable === null && got.failed.includes(c.clause);
        say(right, `${c.arm} answers ${c.expect.toUpperCase()} for the review's broken reading: ${c.name}${right ? '' : ` (it answered ${J(got)})`}`);
      }
      say(Object.keys(GRADERS).every((id) => arms.has(id)), `the review's broken readings reach every grader (${String(arms.size)} of ${String(Object.keys(GRADERS).length)})`);
    }
  }
  // The direct-children reading L1 and R1 grade.
  say(J(directUnder(['.claude/skills/a-skill/', '.claude/skills/a-skill/SKILL.md', '.claude/skills/notes.md', '.claude/skills/'], '.claude/skills/')) === J(['.claude/skills/a-skill/', '.claude/skills/notes.md']), 'directUnder keeps a-skill/ and notes.md and drops what is inside a-skill');
  // The census rule: a folder's key is its listing, never its subtree.
  {
    say(allowedChange('local:proj/.claude/p343-hdr-dir-under/', ['local:proj/.claude/p343-hdr-dir-under/']), "a created folder's own key is allowed");
    say(!allowedChange('local:proj/.claude/skills', ['local:proj/.claude/']), "allowing .claude/'s LISTING does not allow the link inside it to move");
    say(!allowedChange('local:outside/secret.txt', ['local:outside/l6-out.txt', 'local:outside/']), "allowing outside/'s listing and one new file there does not allow secret.txt to move");
    say(!allowedChange('local:proj/.agent/skills/notes.md', ['local:proj/.agent/skills/l6-new.md']), 'a file next to an allowed one is not allowed');
    say(allowedChange('far:gone/g.txt', ['far:gone/**']) && allowedChange('far:gone/', ['far:gone/**']), 'a /** key allows the folder it names and everything under it');
    say(!allowedChange('far:goner/x', ['far:gone/**']), 'a /** key does not allow a sibling sharing its prefix');
  }
  write(bad === 0 ? `[p343] grader self-test PASS: ${String(clauses)} clauses, ${String(checks)} checks, nothing was started.` : `[p343] grader self-test FAIL on ${String(bad)} of ${String(checks)}`);
  return bad === 0;
}

// ===========================================================================
// WHAT IS INSTALLED IN THE PAGE AND IN MAIN (text; nothing here runs locally)
// ===========================================================================

/** The page kit: reads only, plus the toast and dragstart recorders. */
const PAGE_KIT = `(() => {
  if (window.__p343) return true;
  const k = { toasts: [], drags: [] };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const sr = () => { const h = document.querySelector('file-tree-container'); return h && h.shadowRoot ? h.shadowRoot : null; };
  const rowEls = () => { const r = sr(); if (!r) return []; return Array.from(r.querySelectorAll('[data-item-path]')).filter((n) => !n.hasAttribute('data-file-tree-sticky-row') && n.getAttribute('data-item-parked') !== 'true'); };
  const rowOf = (n) => {
    const deco = n.querySelector('[data-item-section="decoration"]');
    const titled = deco ? deco.querySelector('[title]') : null;
    return { path: n.getAttribute('data-item-path'), type: n.getAttribute('data-item-type'), expanded: n.getAttribute('aria-expanded'), label: n.getAttribute('aria-label'), deco: deco ? (deco.textContent || '').trim() : '', decoTitle: titled ? titled.getAttribute('title') : (deco ? deco.getAttribute('title') : null), git: n.getAttribute('data-item-git-status'), selected: n.getAttribute('aria-selected') === 'true' };
  };
  const scroller = () => { const r = sr(); return r ? r.querySelector('[data-file-tree-virtualized-scroll]') : null; };
  k.rows = () => rowEls().map(rowOf);
  k.allRows = async () => {
    const seen = new Map();
    const s = scroller();
    if (s === null) { for (const r of k.rows()) seen.set(r.path, r); return Array.from(seen.values()); }
    const keep = s.scrollTop;
    s.scrollTop = 0; await wait(120);
    for (let i = 0; i < 400; i += 1) {
      for (const r of k.rows()) seen.set(r.path, r);
      if (s.scrollTop + s.clientHeight >= s.scrollHeight - 1) break;
      s.scrollTop = s.scrollTop + Math.max(40, s.clientHeight - 48); await wait(120);
    }
    s.scrollTop = keep; await wait(60);
    return Array.from(seen.values());
  };
  k.mount = async (path) => {
    const find = () => rowEls().find((n) => n.getAttribute('data-item-path') === path) || null;
    let el = find();
    const s = scroller();
    if (el === null && s !== null) {
      s.scrollTop = 0; await wait(120);
      for (let i = 0; i < 400 && el === null; i += 1) { el = find(); if (el !== null) break; if (s.scrollTop + s.clientHeight >= s.scrollHeight - 1) break; s.scrollTop = s.scrollTop + Math.max(40, s.clientHeight - 48); await wait(120); }
    }
    if (el === null) return null;
    el.scrollIntoView({ block: 'center' }); await wait(160);
    el = find();
    if (el === null) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return { x: Math.round(r.left + Math.min(r.width * 0.4, 140)), y: Math.round(r.top + r.height / 2), row: rowOf(el) };
  };
  k.focusRow = (path) => { const el = rowEls().find((n) => n.getAttribute('data-item-path') === path); if (!el) return false; el.focus(); const r = sr(); return r !== null && r.activeElement === el; };
  k.box = () => { const r = sr(); const i = r ? r.querySelector('[data-item-rename-input]') : null; return i ? { open: true, value: i.value, focused: r.activeElement === i } : { open: false }; };
  k.modal = () => { const m = document.querySelector('.modal[role="alertdialog"]'); if (!m) return { open: false }; return { open: true, title: (m.querySelector('.modal-title') || {}).textContent || null, body: (m.querySelector('.modal-body') || {}).textContent || null }; };
  k.confirmClose = () => { const m = document.querySelector('.modal[role="alertdialog"]'); if (!m) return false; const title = ((m.querySelector('.modal-title') || {}).textContent || '').trim(); if (!title.startsWith("Close '") || !title.endsWith("'?")) return false; const b = Array.from(m.querySelectorAll('.modal-actions button')).find((x) => (x.textContent || '').trim() === 'Close project'); if (!b) return false; b.click(); return true; };
  k.tabCount = () => document.querySelectorAll('.ptab-wrap').length;
  k.cancelModal = () => { const m = document.querySelector('.modal[role="alertdialog"]'); if (!m) return false; const b = Array.from(m.querySelectorAll('.modal-actions button')).find((x) => (x.textContent || '').trim() === 'Cancel'); if (!b) return false; b.click(); return true; };
  k.band = () => Array.from(document.querySelectorAll('.banner.ed-banner-readonly .banner-text')).map((n) => (n.textContent || '').trim());
  k.stub = () => { const n = document.querySelector('.section-files .section-stub'); return n ? (n.textContent || '').trim() : null; };
  k.remoteNote = () => { const n = document.querySelector('.files-remote-note'); return n ? (n.textContent || '').trim() : null; };
  k.dirtyTabs = () => Array.from(document.querySelectorAll('.ed-tab')).filter((t) => t.querySelector('.ed-tab-close.dirty') !== null).map((t) => ((t.querySelector('.ed-tab-name') || {}).textContent || '').trim());
  k.tabRect = (name) => { const t = Array.from(document.querySelectorAll('.ed-tab')).find((x) => ((x.querySelector('.ed-tab-name') || {}).textContent || '').trim() === name); if (!t) return null; const r = t.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; };
  k.rectOf = (selector) => { const n = Array.from(document.querySelectorAll(selector)).find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; }); if (!n) return null; const r = n.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + Math.min(r.height / 2, 30)) }; };
  k.blur = () => { const a = document.activeElement; if (a && typeof a.blur === 'function') a.blur(); return true; };
  k.focus = (selector) => { const n = document.querySelector(selector); if (!n) return false; n.focus(); return document.activeElement === n; };
  new MutationObserver((records) => {
    for (const rec of records) for (const node of Array.from(rec.addedNodes)) {
      if (!(node instanceof HTMLElement)) continue;
      const toasts = node.matches('.toast') ? [node] : Array.from(node.querySelectorAll('.toast'));
      for (const t of toasts) k.toasts.push({ t: Date.now(), text: ((t.querySelector('.toast-text') || {}).textContent || '').trim() });
    }
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('dragstart', (e) => { k.drags.push({ t: Date.now(), prevented: e.defaultPrevented, alt: e.altKey }); }, false);
  window.__p343 = k;
  return true;
})()`;

/** The keys the drive presses. CDP modifier bits: Alt 1, Ctrl 2, Meta 4, Shift 8. */
const KEYS = {
  f2: { key: 'F2', code: 'F2', vk: 113 },
  backspace: { key: 'Backspace', code: 'Backspace', vk: 8 },
  del: { key: 'Delete', code: 'Delete', vk: 46 },
  enter: { key: 'Enter', code: 'Enter', vk: 13, text: '\r' },
  escape: { key: 'Escape', code: 'Escape', vk: 27 },
  save: { key: 's', code: 'KeyS', vk: 83, modifiers: 4 },
  next: { key: 'ArrowDown', code: 'ArrowDown', vk: 40, modifiers: 1 },
  rewind: { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 1 }
};

const LOAD = "const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);";

/** Main: `Menu.prototype.popup` recorded; the one item `pick` names is pressed by its own `click`; nothing opens. */
const MENU_PATCH = `(() => {
  ${LOAD}
  const { Menu } = load('electron');
  if (globalThis.__p343Menu) return Menu.prototype.popup === globalThis.__p343Menu.patched;
  const original = Menu.prototype.popup;
  const rec = { original, patched: null, menus: [], pressed: [], pick: null };
  const rowOf = (item) => item.type === 'separator' ? '—' : String(item.label ?? '') + (item.enabled === false ? ' [off]' : '');
  rec.patched = function (options) {
    rec.menus.push(this.items.map(rowOf));
    const done = options && typeof options.callback === 'function' ? options.callback : null;
    const want = rec.pick;
    rec.pick = null;
    let pressed = null;
    if (want !== null) {
      const item = this.items.find((i) => i.type !== 'separator' && String(i.label ?? '') === want && i.enabled !== false && !i.submenu);
      if (item) { try { item.click(); pressed = want; } catch (e) { pressed = 'threw ' + String(e && e.message); } }
    }
    rec.pressed.push(pressed);
    if (done !== null) setImmediate(() => done());
  };
  Menu.prototype.popup = rec.patched;
  globalThis.__p343Menu = rec;
  return Menu.buildFromTemplate([{ label: 'x' }]).popup === rec.patched;
})()`;
const MENU_RESTORE = `(() => { ${LOAD} const { Menu } = load('electron'); if (globalThis.__p343Menu) { Menu.prototype.popup = globalThis.__p343Menu.original; delete globalThis.__p343Menu; } return true; })()`;

/** Main: `startDrag` recorded on the prototype that owns it, so a Finder drag never reaches the window server. */
const DRAG_PATCH = `(() => {
  ${LOAD}
  const { webContents } = load('electron');
  if (globalThis.__p343Drag) return true;
  const all = webContents.getAllWebContents();
  if (all.length === 0) return false;
  let owner = Object.getPrototypeOf(all[0]);
  while (owner !== null && !Object.prototype.hasOwnProperty.call(owner, 'startDrag')) owner = Object.getPrototypeOf(owner);
  if (owner === null) return false;
  const rec = { owner, original: owner.startDrag, calls: [] };
  owner.startDrag = function (item) { rec.calls.push({ files: item && (item.files || [item.file]) }); };
  globalThis.__p343Drag = rec;
  return all[0].startDrag === owner.startDrag;
})()`;
const DRAG_RESTORE = `(() => { if (globalThis.__p343Drag) { globalThis.__p343Drag.owner.startDrag = globalThis.__p343Drag.original; delete globalThis.__p343Drag; } return true; })()`;

// ===========================================================================
// THE RUN. Everything below starts processes; builders never reach it.
// ===========================================================================

async function run() {
  const TAG = '[p343]';
  const t0 = Date.now();
  const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
  const refuse = (why) => {
    console.error(`${TAG} REFUSED. ${why}`);
    process.exit(2);
  };
  // ---- the refusals, in the order they are asked -------------------------
  const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (SOCKET === 'gmux' || SOCKET === 'default' || !/^gmux-p343[a-z0-9-]*-\d+$/.test(SOCKET)) refuse(`GMUX_TMUX_SOCKET ${J(SOCKET)} is not a gmux-p343 harness socket ending in its pid. Run \`npm run probe:p343\`.`);
  const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
  if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME, the profiles and the fixtures.');
  const CONFIG_ROOT = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
  if (process.env['SCRATCH_MACHINE_QUIET_SHELL'] !== '1' || process.env['SCRATCH_MACHINE_SCRATCH_HOME'] !== '1') {
    refuse('SCRATCH_MACHINE_QUIET_SHELL=1 and SCRATCH_MACHINE_SCRATCH_HOME=1 are both required: without them the loopback far home and ZDOTDIR are his.');
  }
  let carriage = null;
  try {
    carriage = JSON.parse(readFileSync(join(CONFIG_ROOT, 'p69-carriage.json'), 'utf8'));
  } catch {
    carriage = null;
  }
  if (CONFIG_ROOT === '' || carriage === null) refuse('there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs.');
  if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
  const yard = realpathSync(CONFIG_ROOT);
  const farHome = existsSync(join(yard, 'home')) ? realpathSync(join(yard, 'home')) : '';
  if (!farHome.startsWith(`${yard}/`)) refuse(`the far home ${J(farHome)} is not inside the yard ${yard}.`);
  const zdot = existsSync(join(yard, 'zdot')) ? realpathSync(join(yard, 'zdot')) : '';
  if (!zdot.startsWith(`${yard}/`)) refuse(`the yard's ZDOTDIR ${J(zdot)} is not inside the yard ${yard}.`);
  const zshenv = join(zdot, '.zshenv');
  if (existsSync(zshenv)) refuse(`${zshenv} is there already; this probe writes that file and will not overwrite one it did not write.`);

  const HEAD_CHECKOUT = ROOT;
  const PARENT_CHECKOUT = (process.env['P343_PARENT_CHECKOUT'] ?? '').trim();
  for (const c of [HEAD_CHECKOUT, ...(PARENT_CHECKOUT === '' ? [] : [resolve(PARENT_CHECKOUT)])]) {
    if (!existsSync(join(c, 'out', 'main', 'index.js'))) refuse(`${join(c, 'out', 'main', 'index.js')} is missing. Build that checkout first.`);
  }
  const KEEP = process.env['P343_KEEP'] === '1';
  const WANT = (process.env['P343_ARMS'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const a of WANT) if (!ARMS.includes(a)) refuse(`P343_ARMS names ${J(a)}, which is not one of ${ARMS.join(', ')}.`);
  const on = (arm) => WANT.length === 0 || WANT.includes(arm);

  mkdirSync(join(HARNESS_DIR, 'p343'), { recursive: true });
  const RUN = realpathSync(join(HARNESS_DIR, 'p343'));
  const OUT = resolve((process.env['P343_OUT_DIR'] ?? '').trim() || join(RUN, 'out'));
  if (/['\s]/.test(RUN)) refuse(`${RUN} holds a quote or a space, and paths under it are typed into the far shell.`);
  const MACHINE_ID = 'p343-machine';
  const MACHINE_LABEL = 'P343 Machine';
  const FARBIN = join(yard, 'p343-far', 'bin');
  const FARLOG = join(yard, 'p343-far', 'finds.log');

  // REVIEW (rule 9): HIS home, from the passwd entry, size and modified time
  // only. `localCensus()` reads `homedir()`, which honours HOME, so a probe
  // started under a scratch HOME censused the scratch home and "his dotfiles
  // did not move" was a reading of nothing of his.
  const HIS_HOME = userInfo().homedir;
  const dotBefore = localCensus(HIS_HOME);
  const records = {};
  let unreadableRun = null;
  /** Every shim and app pid a launch started, with its start time: `{ pid, started }`. */
  const launched = [];
  /** A pid's start time, or '' when nothing runs under it. With the pid it names ONE process. */
  const startedAt = (pid) => (Number.isInteger(pid) && pid > 1 ? spawnSync('/bin/ps', ['-o', 'lstart=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim() : '');
  /** True when that same process (pid AND start time) still runs and is not a zombie, which holds no memory. */
  const stillUp = ({ pid, started }) => {
    if (started === '') return false;
    const now = spawnSync('/bin/ps', ['-o', 'stat=,lstart=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim();
    return now !== '' && !now.startsWith('Z') && now.endsWith(started);
  };

  // ---- the far count's wrapper, in the yard (D22) --------------------------
  try {
    mkdirSync(FARBIN, { recursive: true, mode: 0o700 });
    writeFileSync(join(FARBIN, 'find'), findWrapperText(FARLOG), { mode: 0o700 });
    writeFileSync(FARLOG, '');
    writeFileSync(zshenv, zshenvText(FARBIN), { mode: 0o600 });

    const builds = [
      ...(PARENT_CHECKOUT === '' ? [] : [{ name: 'parent', checkout: resolve(PARENT_CHECKOUT) }]),
      { name: 'head', checkout: HEAD_CHECKOUT }
    ];
    for (const b of builds) {
      try {
        records[b.name] = await runBuild(b);
      } catch (err) {
        say(`${b.name}: the launch could not run: ${String((err && err.stack) || err)}`);
        unreadableRun = `${b.name}: ${String((err && err.message) || err)}`;
      }
    }
  } finally {
    rmSync(zshenv, { force: true });
    if (!KEEP) rmSync(join(yard, 'p343-far'), { recursive: true, force: true });
    spawnSync('tmux', ['-L', SOCKET, 'kill-server'], { encoding: 'utf8', timeout: 15_000 });
  }

  // ---- the grade -----------------------------------------------------------
  const dotAfter = localCensus(HIS_HOME);
  const moved = dotfilesMoved(dotBefore, dotAfter);
  const head = records.head ?? null;
  const parent = records.parent ?? null;
  if (head !== null) head.run.dotfiles = { before: dotBefore, after: dotAfter, moved };
  // Electrons, once, at the end: by CLAUDE.md's census (printed) and by profile
  // and by the pids this run started (graded).
  //
  // REVIEW (rule 9): Electron's main process renames itself `Tortie` with NO
  // arguments (CLAUDE.md), so a search for this run's folders never finds it,
  // and it is the largest process a leak leaves. Every launch's shim and app
  // pid is recorded with its start time and asked about here, one pid at a
  // time; a pid now naming another process (another start time) is not ours.
  const census = spawnSync('/bin/ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' }).stdout.split('\n').filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !l.includes('defunct'));
  const byProfile = spawnSync('/bin/ps', ['-Ao', 'pid=,command='], { encoding: 'utf8' }).stdout.split('\n').filter((l) => l.includes(`${RUN}/`));
  const launchedUp = launched.filter(stillUp);
  if (head !== null) head.run.electronsLeft = byProfile.length + launchedUp.length;
  if (head !== null) head.run.launched = { recorded: launched.length, stillUp: launchedUp.map((l) => l.pid) };
  say(`Electron census (CLAUDE.md's command), printed: ${String(census.length)} line(s); naming this run's folders: ${String(byProfile.length)}; of the ${String(launched.length)} pid(s) this run launched, still up: ${J(launchedUp.map((l) => l.pid))}`);
  const sentence = dotfilesSentence('this Mac', moved, dotBefore, dotAfter);
  if (sentence !== null) say(sentence);

  let failed = 0;
  let unreadable = unreadableRun === null ? 0 : 1;
  const verdicts = {};
  for (const id of Object.keys(GRADERS)) {
    if (id !== 'RUN' && !on(id)) {
      say(`${id} not run (P343_ARMS)`);
      continue;
    }
    const reading = readingOf(id, head, parent);
    const got = grade(id, reading);
    verdicts[id] = got;
    const p = id === 'RUN' ? parent?.run ?? null : parent?.arms?.[id] ?? null;
    if (got.unreadable !== null) {
      unreadable += 1;
      say(`UNREADABLE ${id}: ${got.unreadable}`);
    } else if (!got.ok) {
      failed += 1;
      say(`FAIL ${id} ${GRADERS[id].title}: ${J(got.failed)}`);
    } else say(`PASS ${id} ${GRADERS[id].title}`);
    say(`     HEAD   ${J(id === 'RUN' ? head?.run ?? null : head?.arms?.[id] ?? null).slice(0, 1600)}`);
    if (parent !== null) say(`     parent ${J(p).slice(0, 1600)}`);
    if (id === 'R0') {
      const v = r0Verdict(reading);
      const why =
        v === '7.7 REFUTED'
          ? " — the parent shows the folder at the walk's last level opening with its files, so ruling 5 drops mechanism 7.7"
          : v === '7.7 NOT DECIDED'
            ? " — the parent's reading neither showed c/ nor opened empty and unasked (or could not be read), so it decides nothing about 7.7"
            : '';
      if (v !== null) say(`R0: ${v}${why}`);
    }
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'p343-report.json'), `${J({ head, parent, verdicts }, null, 2)}\n`, 'utf8');
  if (KEEP) {
    if (head !== null) writeFileSync(join(OUT, 'head-record.json'), `${J(head, null, 2)}\n`, 'utf8');
    if (parent !== null) writeFileSync(join(OUT, 'parent-record.json'), `${J(parent, null, 2)}\n`, 'utf8');
  }
  say(`report: ${join(OUT, 'p343-report.json')}`);
  if (unreadable > 0) {
    say(`UNREADABLE, ${String(unreadable)} arm(s) or the run could not be read, which is never a pass`);
    process.exit(2);
  }
  if (failed > 0) {
    say(`FAIL, ${String(failed)}`);
    process.exit(1);
  }
  say('PASS');
  // Every cdpEval leaves its own timeout armed, so the process ends here.
  process.exit(0);

  // =========================================================================
  // One build: fixtures, one Electron, every arm, the census after.
  // =========================================================================

  /** A build folder removed whole, its two 0300 `locked` folders opened first so the walk can enter them. */
  function removeBuildDir(dir) {
    for (const side of ['local', 'far']) {
      try {
        chmodSync(join(dir, side, 'locked'), 0o700);
      } catch {
        /* not there */
      }
    }
    rmSync(dir, { recursive: true, force: true });
  }

  async function runBuild({ name, checkout }) {
    const dir = join(RUN, name);
    removeBuildDir(dir);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    try {
      return await buildIn(dir, name, checkout);
    } finally {
      if (!KEEP) removeBuildDir(dir);
    }
  }

  async function buildIn(dir, name, checkout) {
    const HOME = join(dir, 'home');
    const PROFILE = join(dir, 'profile');
    mkdirSync(HOME, { recursive: true, mode: 0o700 });
    mkdirSync(PROFILE, { recursive: true, mode: 0o700 });
    writeFileSync(join(HOME, '.hushlogin'), '');
    const local = makeLinkFixture(join(dir, 'local'), { home: join(HOME, 'standin') });
    const far = makeLinkFixture(join(dir, 'far'), { home: join(HOME, 'standin-far') });
    const drops = join(dir, 'drops');
    mkdirSync(drops, { recursive: true });
    writeFileSync(join(drops, 'p343-dropped.txt'), 'dropped\n');
    writeFileSync(join(drops, 'p343-dropped-control.txt'), 'control\n');
    // THE NARROW FIX: L3's link-row drop hands its own name (the fix round's),
    // and a Finder drop of a file that is not there lands nothing at either
    // build, which read as a refusal of a correct product.
    writeFileSync(join(drops, 'p343-dropped-link.txt'), 'link\n');
    const roots = { local: local.root, far: far.root, home: local.home, farhome: far.home };
    const takeCensus = () => Object.fromEntries(Object.entries(roots).flatMap(([k, root]) => Object.entries(censusOf(root)).map(([p, v]) => [`${k}:${p}`, v])));
    const censusBefore = takeCensus();
    const record = { build: name, checkout, arms: {}, run: { ran: [], census: null, baselines: null, dotfiles: null, electronsLeft: null } };
    const allowed = [];
    const allow = (...keys) => allowed.push(...keys);

    // The machine row, its host key, and the five hidden agents (asked of THIS checkout's parser first).
    const MACHINES_JSON = join(PROFILE, 'gmux', 'config', 'machines.json');
    mkdirSync(dirname(MACHINES_JSON), { recursive: true, mode: 0o700 });
    writeFileSync(MACHINES_JSON, `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: MACHINE_LABEL, host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: carriage.remoteTmuxPath }] })}\n`, 'utf8');
    const known = join(PROFILE, 'gmux', 'machines', 'known-machines');
    mkdirSync(dirname(known), { recursive: true });
    writeFileSync(known, keyscanText({ host: carriage.host, port: carriage.port, caller: 'build/p343/probe-p343.mjs' }), 'utf8');
    const pre = hidden.hiddenAgentsPrecheck({ checkout, prefix: 'p343', home: HOME, userPath: process.env['PATH'] ?? '' });
    if (!pre.ok) throw new Error(`the hidden agents would not stay hidden at ${name}: ${pre.said}`);
    hidden.writeHiddenAgents(PROFILE, 'p343');
    writeFileSync(FARLOG, '');
    say(`${name}: launching ${checkout}; local ${local.proj}; far ${far.proj}`);

    const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));
    try {
      await withElectron(
        {
          label: `p343-${name}`,
          userDataDir: PROFILE,
          cwd: checkout,
          args: ['--remote-debugging-port=0', '--inspect=0', '--use-mock-keychain', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'],
          env: withoutDevRenderer({
            ...INHERITED_CLAUDE,
            HOME,
            ZDOTDIR: HOME,
            HISTFILE: '/dev/null',
            TERM_SESSION_ID: undefined,
            GMUX_TMUX_SOCKET: SOCKET,
            GMUX_PROBES: '1',
            GMUX_LOG_FILE: '1',
            GMUX_SPECSTORY_NO_CLOUD: '1',
            GMUX_CONFIG_ROOT: CONFIG_ROOT,
            GMUX_HARNESS_DIR: HARNESS_DIR,
            ...(typeof carriage.authSock === 'string' ? { SSH_AUTH_SOCK: carriage.authSock } : {})
          }),
          graceMs: 8_000,
          ceilingMs: 3_600_000
        },
        async (handle) => {
          // The shim's pid at once, so even a launch whose window never came
          // is asked about at the end; the app's once its window is up.
          launched.push({ pid: handle.pid, started: startedAt(handle.pid) });
          const cdp = await attachRenderer(PROFILE);
          const appPid = handle.appPid();
          launched.push({ pid: appPid, started: startedAt(appPid) });
          let main = null;
          try {
            const list = JSON.parse(await cdpEval(cdp, hidden.AGENTS_LIST_EXPR, 120_000));
            const v = hidden.hiddenAgentsScanVerdict(list);
            if (!v.ok) throw new Error(`agents:list: ${v.said}`);
            say(`${name}: ${v.said}`);
            await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true });
            // Every drag the probe starts is intercepted, so the window server
            // never owns one; when interception cannot be had, no drag is pressed.
            const interceptOk = await cdp.call('Input.setInterceptDrags', { enabled: true }).then(
              (r) => r?.error === undefined,
              () => false
            );
            await cdpEval(cdp, PAGE_KIT);
            main = await attachMain(handle);
            const menuTook = (await mainEval(main, MENU_PATCH)) === true;
            const dragTook = (await mainEval(main, DRAG_PATCH)) === true;
            say(`${name}: menu recorder ${menuTook ? 'in' : 'NOT in'}, startDrag recorder ${dragTook ? 'in' : 'NOT in'}`);
            const up = await bridge(cdp, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
            if (!(up.ok && (up.value?.rows ?? []).some((r) => r.id === MACHINE_ID && r.usable))) throw new Error(`the machine is not usable: ${J(up).slice(0, 400)}`);
            const ctx = { name, cdp, main, menuTook, dragTook, interceptOk, local, far, drops, record, allow };
            await localArms(ctx);
            await remoteArms(ctx);
          } finally {
            if (main !== null) {
              await mainEval(main, MENU_RESTORE).catch(() => undefined);
              await mainEval(main, DRAG_RESTORE).catch(() => undefined);
              try {
                main.close();
              } catch {
                /* closed */
              }
            }
            cdp.close();
          }
        }
      );
    } finally {
      spawnSync('tmux', ['-L', SOCKET, 'kill-server'], { encoding: 'utf8', timeout: 15_000 });
      // A read the parent left blocked on the FIFO is long gone with its app; nothing to unblock here.
    }

    // ---- the census after, the baselines, and the cleanup ------------------
    let censusAfter = null;
    try {
      censusAfter = takeCensus();
    } catch {
      censusAfter = null;
    }
    record.run.census = censusAfter === null ? { measured: false, changed: [], allowed } : { measured: true, changed: censusDiff(censusBefore, censusAfter), allowed };
    record.run.baselines = readBaselines(PROFILE, local.proj, record.arms.C1?.relPath ?? null);
    record.run.ran = Object.keys(record.arms);
    return record;
  }

  // =========================================================================
  // Attaching, and the small doors every arm uses.
  // =========================================================================

  async function attachRenderer(profile) {
    const started = Date.now();
    let why = 'no DevToolsActivePort yet';
    for (;;) {
      let port = 0;
      try {
        port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
      } catch {
        port = 0;
      }
      let list = [];
      if (port > 0) {
        try {
          list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        } catch {
          list = [];
        }
      }
      const picked = pickRendererTarget(list);
      if (picked.target !== null) {
        const cdp = await wsConnect(picked.target.webSocketDebuggerUrl, { collect: ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown', 'Input.dragIntercepted'] });
        await cdp.call('Runtime.enable');
        for (let i = 0; i < 300; i += 1) {
          if ((await cdpEval(cdp, "window.gmux !== undefined && typeof window.__gmuxP95 === 'object' && typeof window.__gmuxP268 === 'object'")) === true) return cdp;
          await sleep(300);
        }
        throw new Error('the app never armed window.gmux and the Phase 95 and 268 drives');
      }
      why = picked.why;
      if (Date.now() - started > 150_000) throw new Error(`no app window: ${why}`);
      await sleep(300);
    }
  }

  async function attachMain(handle) {
    const started = Date.now();
    for (;;) {
      const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(handle.text());
      if (m !== null) {
        try {
          return await wsConnect(m[1]);
        } catch {
          /* not up yet */
        }
      }
      if (Date.now() - started > 60_000) throw new Error('the main process inspector never appeared');
      await sleep(300);
    }
  }

  async function mainEval(cdp, expression, ms = 20_000) {
    const r = await cdp.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true }, ms);
    if (r.result?.exceptionDetails) throw new Error(`main threw: ${J(r.result.exceptionDetails).slice(0, 300)}`);
    return r.result?.result?.value;
  }

  async function bridge(cdp, expr, timeoutMs = 120_000) {
    return JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, timeoutMs));
  }

  /** One arm, run when asked; an arm that throws is recorded UNREADABLE with the reason, and the next arm runs. */
  async function guard(record, id, fn) {
    if (!on(id)) return;
    try {
      await fn();
    } catch (err) {
      const why = `the arm threw: ${String((err && err.message) || err).slice(0, 300)}`;
      record.arms[id] = { ...(record.arms[id] ?? {}), unreadable: why };
      say(`${record.build} ${id}: ${why}`);
    }
  }

  // REVIEW (rule 9): every helper below is a FUNCTION DECLARATION, never a
  // `const`. They sit below `process.exit(0)` in run(), so a `const` there is
  // still uninitialised when the builds above call it: `kit` threw
  // "Cannot access 'kit' before initialization" inside `waitFor`'s catch, the
  // Explorer read as drawing no row for 60 s, and EVERY build was UNREADABLE
  // before its first arm. The self-test now refuses any binding declared there.
  function kit(cdp, call, ms = 60_000) {
    return cdpEval(cdp, `Promise.resolve(window.__p343.${call})`, ms);
  }

  async function mouse(cdp, x, y, { button = 'left', modifiers = 0, clickCount = 1 } = {}) {
    await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, modifiers });
    await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, buttons: button === 'right' ? 2 : 1, clickCount, modifiers });
    await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, buttons: 0, clickCount, modifiers });
  }

  async function press(cdp, { key, code, vk, modifiers = 0, text }) {
    const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers, ...(text !== undefined ? { text, unmodifiedText: text } : {}) };
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  }

  async function waitFor(fn, ms, every = 250) {
    const until = Date.now() + ms;
    for (;;) {
      let v = null;
      try {
        v = await fn();
      } catch {
        v = null;
      }
      if (v !== null && v !== false && v !== undefined) return v;
      if (Date.now() > until) return null;
      await sleep(every);
    }
  }

  /** Every row of the tree, the virtualised list scrolled through. */
  async function allRows(cdp) {
    return (await kit(cdp, 'allRows()')) ?? [];
  }

  /** Click one row by its path; answers its reading or null when it could not be mounted. */
  async function clickRow(cdp, path, opts = {}) {
    const at = await kit(cdp, `mount(${J(path)})`);
    if (at === null) return null;
    await mouse(cdp, at.x, at.y, opts);
    return at.row;
  }

  /**
   * Make a row exist: open the deepest folder above it until it is drawn.
   * Folders are opened only when they read collapsed, so nothing is toggled
   * shut. Answers the row, or null.
   */
  async function reveal(cdp, target, ms = 30_000) {
    const until = Date.now() + ms;
    const want = [target, target.endsWith('/') ? target.slice(0, -1) : `${target}/`];
    for (;;) {
      const rows = await allRows(cdp);
      const hit = rows.find((r) => want.includes(r.path));
      if (hit !== undefined) return hit;
      const above = rows
        .filter((r) => r.type === 'folder' && target.startsWith(r.path) && !want.includes(r.path))
        .sort((a, b) => b.path.length - a.path.length)[0];
      if (above !== undefined && above.expanded === 'false') {
        await clickRow(cdp, above.path);
        await sleep(700);
      } else await sleep(350);
      if (Date.now() > until) return null;
    }
  }

  /** Reveal a folder row and open it when it reads collapsed. */
  async function expand(cdp, target, ms = 30_000) {
    const row = await reveal(cdp, target, ms);
    if (row === null) return null;
    if (row.type === 'folder' && row.expanded === 'false') {
      await clickRow(cdp, row.path);
      await sleep(900);
    }
    return row;
  }

  /** The rows directly or deeply under a folder path (with its slash). */
  async function rowsUnder(cdp, folder) {
    const f = folder.endsWith('/') ? folder : `${folder}/`;
    return (await allRows(cdp)).map((r) => r.path).filter((p) => p !== f && p.startsWith(f)).sort();
  }

  /** A real right click on a row; the menu as main built it, and the item `pick` names pressed. */
  async function menuOf(ctx, path, pick = null) {
    if (!ctx.menuTook) return null;
    const before = Number(await mainEval(ctx.main, 'globalThis.__p343Menu.menus.length'));
    await mainEval(ctx.main, `(globalThis.__p343Menu.pick = ${J(pick)}, true)`);
    const at = await kit(ctx.cdp, `mount(${J(path)})`);
    if (at === null) {
      await mainEval(ctx.main, '(globalThis.__p343Menu.pick = null, true)');
      return null;
    }
    await mouse(ctx.cdp, at.x, at.y, { button: 'right' });
    const got = await waitFor(async () => Number(await mainEval(ctx.main, 'globalThis.__p343Menu.menus.length')) > before || null, 4000, 100);
    await mainEval(ctx.main, '(globalThis.__p343Menu.pick = null, true)');
    if (got === null) return null;
    const menus = await mainEval(ctx.main, 'JSON.stringify(globalThis.__p343Menu.menus)');
    const all = JSON.parse(menus);
    await sleep(400);
    return all[all.length - 1];
  }

  async function showView(cdp, label) {
    const shown = await bridge(
      cdp,
      `(async () => {
        const rail = Array.from(document.querySelectorAll('button.ab-item')).find((b) => (b.getAttribute('title') || '').startsWith(${J(`${label} (`)}));
        if (rail === undefined) return { shown: false, why: 'no ${label} item on the activity rail' };
        if (rail.className.indexOf('active') === -1) rail.click();
        return { shown: true };
      })()`
    );
    if (!(shown.ok && shown.value?.shown === true)) throw new Error(`the ${label} view did not show: ${J(shown)}`);
    await sleep(800);
  }

  async function showExplorer(cdp) {
    await showView(cdp, 'Explorer');
    const rows = await waitFor(async () => ((await kit(cdp, 'rows()')) ?? []).length > 0 || null, 60_000);
    if (rows === null) throw new Error('the Explorer drew no row within 60 s');
    await sleep(600);
  }

  async function tabs(cdp) {
    return (await cdpEval(cdp, 'window.__gmuxP268.read().tabs.map((t) => ({ id: t.id, name: t.name, path: t.path, dirty: t.dirty, mode: t.mode, value: t.value }))')) ?? [];
  }

  /** The bytes `ino mtimeMs` of a real file, or '' when it cannot be read. */
  function fileStamp(abs) {
    try {
      const s = statSync(abs);
      return `${String(s.ino)} ${String(s.mtimeMs)}`;
    } catch {
      return '';
    }
  }
  function listing(abs) {
    try {
      return readdirSync(abs).sort();
    } catch {
      return null;
    }
  }
  /** A real file's text, or null when it cannot be read. */
  function readText(abs) {
    try {
      return readFileSync(abs, 'utf8');
    } catch {
      return null;
    }
  }
  /** A /bin/sh the probe starts, with no rc file and no history, ended before it returns. */
  function sh(script) {
    const r = spawnSync('/bin/sh', ['-c', script], { encoding: 'utf8', timeout: 30_000, env: { PATH: '/usr/bin:/bin', HOME: join(RUN, 'sh-home'), ZDOTDIR: join(RUN, 'sh-home'), HISTFILE: '/dev/null', LC_ALL: 'C' } });
    return r.status === 0;
  }
  async function toastsSince(cdp, t) {
    return (await kit(cdp, `toasts.filter((x) => x.t >= ${String(t)}).map((x) => x.text)`)) ?? [];
  }
  async function dragsSince(cdp, t) {
    return (await kit(cdp, `drags.filter((x) => x.t >= ${String(t)})`)) ?? [];
  }
  function intercepts(cdp) {
    return cdp.events().filter((e) => e.method === 'Input.dragIntercepted').length;
  }
  async function startDrags(ctx) {
    return ctx.dragTook ? Number(await mainEval(ctx.main, 'globalThis.__p343Drag.calls.length')) : -1;
  }

  /**
   * One drag gesture from a row toward a point: press, move in steps with the
   * button down, and read whether Chromium began a drag (intercepted, so the
   * window server never owns one). An intercepted drag is CANCELLED, never
   * dropped.
   */
  async function dragGesture(ctx, fromPath, to, { modifiers = 0 } = {}) {
    const at = await kit(ctx.cdp, `mount(${J(fromPath)})`);
    if (at === null) return null;
    const before = intercepts(ctx.cdp);
    const t = Date.now();
    await ctx.cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y, modifiers });
    await ctx.cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', buttons: 1, clickCount: 1, modifiers });
    for (let i = 1; i <= 8; i += 1) {
      const x = Math.round(at.x + ((to.x - at.x) * i) / 8);
      const y = Math.round(at.y + ((to.y - at.y) * i) / 8);
      await ctx.cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1, modifiers });
      await sleep(40);
    }
    await sleep(500);
    const intercepted = intercepts(ctx.cdp) > before;
    if (intercepted) await ctx.cdp.call('Input.dispatchDragEvent', { type: 'dragCancel', x: to.x, y: to.y, data: { items: [], dragOperationsMask: 1 } }).catch(() => undefined);
    await ctx.cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1, modifiers });
    await sleep(300);
    return { intercepted, dragstarts: await dragsSince(ctx.cdp, t) };
  }

  /** A Finder drop of one file onto a row: dragEnter, dragOver, drop, carrying the file's path. */
  async function finderDrop(ctx, ontoPath, file) {
    const at = await kit(ctx.cdp, `mount(${J(ontoPath)})`);
    if (at === null) return null;
    const data = { items: [], files: [file], dragOperationsMask: 1 };
    for (const type of ['dragEnter', 'dragOver', 'dragOver', 'drop']) {
      await ctx.cdp.call('Input.dispatchDragEvent', { type, x: at.x, y: at.y, data });
      await sleep(150);
    }
    await sleep(2500);
    // A confirm (a name already there) is cancelled, never accepted.
    await dismissModal(ctx.cdp);
    return true;
  }

  /** Every place a dropped name could land in the fixture, found by lstat walk (links never followed). */
  function landedAnywhere(fx, fileName) {
    return landedWhere(fx, fileName).length > 0;
  }

  /** The census keys a dropped name landed at, sorted (`local:proj/.claude/x`). */
  function landedWhere(fx, fileName) {
    return Object.keys(censusOf(fx.root))
      .filter((k) => k.endsWith(`/${fileName}`) || k === fileName)
      .map((k) => (k.startsWith('local:') ? k : `local:${k}`))
      .sort();
  }

  /**
   * Close a confirm WITHOUT confirming it: Cancel, then Escape if it is still
   * up. Nothing here ever presses a confirm's own button (D21).
   */
  async function dismissModal(cdp) {
    if ((await kit(cdp, 'modal()'))?.open !== true) return true;
    await kit(cdp, 'cancelModal()');
    await sleep(400);
    if ((await kit(cdp, 'modal()'))?.open === true) {
      await press(cdp, KEYS.escape);
      await sleep(400);
    }
    return (await kit(cdp, 'modal()'))?.open !== true;
  }

  /**
   * Type a name into the inline box the tree just opened, then Return. Return
   * is pressed ONLY while that box holds the keyboard and no confirm is up, so
   * a Return can never answer a confirm (a Move to Trash among them).
   */
  async function typeInBox(cdp, text) {
    const open = await waitFor(async () => (await kit(cdp, 'box()'))?.open === true || null, 5000, 125);
    if (open === null) return false;
    await cdp.call('Input.insertText', { text });
    await sleep(150);
    if (!(await dismissModal(cdp))) return false;
    const box = await kit(cdp, 'box()');
    if (box?.open !== true || box.focused !== true) return false;
    await press(cdp, KEYS.enter);
    await sleep(1500);
    return true;
  }

  async function headerPress(cdp, label) {
    const r = await bridge(cdp, `(() => { const b = Array.from(document.querySelectorAll('[data-slot="view-header"] button')).find((x) => x.getAttribute('aria-label') === ${J(label)}); if (!b) return { pressed: false, why: 'no button' }; if (b.disabled) return { pressed: false, why: 'disabled' }; b.click(); return { pressed: true }; })()`);
    return r.ok && r.value?.pressed === true;
  }

  async function refreshFiles(cdp) {
    const r = await bridge(cdp, `(() => { const b = document.querySelector('button.files-refresh'); if (!b || b.disabled) return false; b.click(); return true; })()`);
    return r.ok && r.value === true;
  }

  /** Open a file from the Explorer with a real click; answers the tab, waited for. */
  async function openFromTree(cdp, rel, absPath) {
    const row = await reveal(cdp, rel, 15_000);
    if (row === null) return null;
    await clickRow(cdp, row.path);
    return waitFor(async () => (await tabs(cdp)).find((t) => t.path === absPath) ?? null, 8000);
  }

  /** A clean ⌘S with the focus off the tree; answers the toasts said within 3 s. */
  async function cleanSave(cdp) {
    await kit(cdp, 'blur()');
    const t = Date.now();
    await press(cdp, KEYS.save);
    await sleep(3000);
    return toastsSince(cdp, t);
  }

  // =========================================================================
  // THIS MAC
  // =========================================================================

  async function localArms(ctx) {
    const { cdp, local, record, allow, name } = ctx;
    const P = local.proj;
    const opened = await bridge(cdp, `window.__gmuxP95.openLocal(${J(P)})`);
    if (!opened.ok) throw new Error(`the local project did not open: ${opened.error}`);
    await showExplorer(cdp);

    // ------------------------------------------------------------------ L1
    await guard(record, 'L1', async () => {
      const r = { chain: null, claudeRow: null, children: [], band: null };
      record.arms.L1 = r;
      const rows = await allRows(cdp);
      r.claudeRow = rows.find((x) => x.path === '.claude/') ?? null;
      // Open `.claude` once when it is drawn unlisted; a chain appears only once it is listed.
      if (r.claudeRow !== null && r.claudeRow.expanded === 'false') {
        await clickRow(cdp, '.claude/');
        await sleep(1200);
      }
      r.chain = (await allRows(cdp)).find((x) => x.path === '.claude/skills/') ?? null;
      if (r.chain !== null) {
        if (r.chain.expanded === 'false') {
          await clickRow(cdp, '.claude/skills/');
          await sleep(1200);
        }
        r.children = directUnder(await rowsUnder(cdp, '.claude/skills/'), '.claude/skills/');
        const tab = await openFromTree(cdp, '.claude/skills/notes.md', join(P, '.claude/skills/notes.md'));
        if (tab !== null) {
          await sleep(800);
          const bands = (await kit(cdp, 'band()')) ?? [];
          r.band = bands.find((b) => b === BAND) ?? bands[0] ?? null;
        }
      } else {
        // The parent: what `.claude` draws instead, printed beside HEAD's.
        r.parentRows = (await allRows(cdp)).filter((x) => x.path.startsWith('.claude'));
      }
      say(`${name} L1: chain ${J(r.chain)}; children ${J(r.children)}; band ${J(r.band)}`);
    });

    // ------------------------------------------------------------------ L2
    await guard(record, 'L2', async () => {
      const r = { links: [] };
      record.arms.L2 = r;
      for (const l of local.links) {
        const drawn = await reveal(cdp, l.rel, 20_000);
        r.links.push({ rel: l.rel, stat: linkStatOf(join(P, l.rel)), drawn: drawn === null ? null : { path: drawn.path, type: drawn.type, deco: drawn.deco, decoTitle: drawn.decoTitle } });
      }
      say(`${name} L2: ${String(r.links.filter((l) => l.drawn !== null).length)} of ${String(r.links.length)} link rows found; folders ${J(r.links.filter((l) => l.drawn?.type === 'folder').map((l) => l.rel))}`);
    });

    // ------------------------------------------------------------------ L5
    await guard(record, 'L5', async () => {
      const r = { freshDimmed: false, dimmed: {}, newLinkGit: null, underSkills: {} };
      record.arms.L5 = r;
      for (const f of ['.claude/skills/', 'src/linkIgnored/', 'node_modules/', 'node_modules/pkgb/']) await expand(cdp, f, 20_000);
      writeFileSync(join(P, 'p343-l5-touch.txt'), 'touch\n');
      allow('local:proj/p343-l5-touch.txt', 'local:proj/fresh.log', 'local:proj/');
      await sleep(14_000);
      writeFileSync(join(P, 'fresh.log'), 'fresh\n');
      r.freshDimmed = (await waitFor(async () => (await allRows(cdp)).some((x) => x.path === 'fresh.log' && x.git === 'ignored') || null, 30_000, 500)) === true;
      await expand(cdp, 'node_modules/pkgb/', 10_000);
      const rows = await allRows(cdp);
      const gitOf = (p) => (rows.find((x) => x.path === p || x.path === `${p}/`) ?? null)?.git ?? null;
      for (const p of ['node_modules/', 'ignored.log', '.venv', 'bazel-out', 'node_modules/pkgb', 'node_modules/pkgb/b.js', 'fresh.log']) r.dimmed[p] = gitOf(p) === 'ignored';
      r.newLinkGit = gitOf('newLink');
      for (const p of ['.claude/skills/a-skill/', '.claude/skills/notes.md']) r.underSkills[p] = rows.some((x) => x.path === p) ? gitOf(p) : 'absent';
      say(`${name} L5: fresh dimmed ${String(r.freshDimmed)}; dimmed ${J(r.dimmed)}; newLink ${J(r.newLinkGit)}; under skills ${J(r.underSkills)}`);
    });

    // ------------------------------------------------------------------ L6
    await guard(record, 'L6', async () => {
      const r = { inProject: { shown: false, ms: null }, outside: { before: false, afterRefresh: false } };
      record.arms.L6 = r;
      allow('local:proj/.agent/skills/l6-new.md', 'local:proj/.agent/skills/', 'local:outside/l6-out.txt', 'local:outside/');
      const skills = await expand(cdp, '.claude/skills/', 20_000);
      if (skills !== null) {
        const t = Date.now();
        sh(`printf 'l6\\n' > '${join(P, '.agent/skills/l6-new.md')}'`);
        const shown = await waitFor(async () => (await allRows(cdp)).some((x) => x.path === '.claude/skills/l6-new.md') || null, 12_000, 400);
        r.inProject = { shown: shown === true, ms: shown === true ? Date.now() - t : null };
      }
      const out = await expand(cdp, 'linkOut/', 20_000);
      if (out !== null) {
        sh(`printf 'l6\\n' > '${join(local.outside, 'l6-out.txt')}'`);
        await sleep(4000);
        r.outside.before = (await allRows(cdp)).some((x) => x.path === 'linkOut/l6-out.txt');
        await refreshFiles(cdp);
        r.outside.afterRefresh = (await waitFor(async () => (await allRows(cdp)).some((x) => x.path === 'linkOut/l6-out.txt') || null, 12_000, 400)) === true;
      }
      say(`${name} L6: ${J(r)}`);
    });

    // ------------------------------------------------------------------ L3
    await guard(record, 'L3', () => armL3(ctx));

    // ------------------------------------------------------------------ L4
    await guard(record, 'L4', async () => {
      const r = { body: null, cancelled: false, dialogAfter: null, linkBefore: null, linkAfter: null, targetBefore: null, targetAfter: null };
      record.arms.L4 = r;
      const census = () => censusOf(local.root);
      const before = census();
      r.linkBefore = before['proj/.claude/skills'] ?? null;
      r.targetBefore = J(Object.entries(before).filter(([k]) => k.startsWith('proj/.agent/skills/')));
      await clickRow(cdp, 'README.md');
      await sleep(500);
      const linkRow = (await reveal(cdp, '.claude/skills/')) ?? (await reveal(cdp, '.claude/skills'));
      if (linkRow === null || !ctx.menuTook) r.unreadable = linkRow === null ? 'the link row was not drawn' : 'the menu recorder did not take';
      else {
        await menuOf(ctx, linkRow.path, 'Move to Trash');
        const modal = await waitFor(async () => {
          const m = await kit(cdp, 'modal()');
          return m?.open === true ? m : null;
        }, 5000);
        r.body = modal?.body ?? null;
        if (modal !== null) {
          r.cancelled = (await kit(cdp, 'cancelModal()')) === true;
          await sleep(800);
          r.dialogAfter = (await kit(cdp, 'modal()'))?.open === true;
          if (r.dialogAfter && !(await dismissModal(cdp))) throw new Error('the Move to Trash confirm would not close without being answered');
        }
        const after = census();
        r.linkAfter = after['proj/.claude/skills'] ?? null;
        r.targetAfter = J(Object.entries(after).filter(([k]) => k.startsWith('proj/.agent/skills/')));
      }
      say(`${name} L4: body ${J(r.body)}; cancelled ${String(r.cancelled)}; link ${J(r.linkAfter)}`);
    });

    // ------------------------------------------------------------------ C1
    await guard(record, 'C1', async () => {
      const r = { opened: null, relPath: null, typed: 'Q', fileHasTyped: false, toasts: [] };
      record.arms.C1 = r;
      const real = join(P, '.agent/skills/a-skill/SKILL.md');
      allow('local:proj/.agent/skills/a-skill/SKILL.md');
      const bytesBefore = readFileSync(real, 'utf8');
      await showView(cdp, 'Context');
      const row = await waitFor(
        async () => (await bridge(cdp, `(() => { const n = Array.from(document.querySelectorAll('.ctx-row')).find((x) => ((x.querySelector('.ctx-name') || {}).textContent || '').trim() === 'a-skill'); if (!n) return null; n.scrollIntoView({ block: 'center' }); const b = n.getBoundingClientRect(); return { x: Math.round(b.left + Math.min(b.width / 2, 120)), y: Math.round(b.top + b.height / 2) }; })()`)).value ?? null,
        30_000,
        500
      );
      if (row === null || !ctx.menuTook) r.unreadable = row === null ? 'Context listed no a-skill row within 30 s' : 'the menu recorder did not take';
      else {
        const before = Number(await mainEval(ctx.main, 'globalThis.__p343Menu.menus.length'));
        await mainEval(ctx.main, "(globalThis.__p343Menu.pick = 'Open SKILL.md', true)");
        await mouse(cdp, row.x, row.y, { button: 'right' });
        await waitFor(async () => Number(await mainEval(ctx.main, 'globalThis.__p343Menu.menus.length')) > before || null, 4000, 100);
        await mainEval(ctx.main, '(globalThis.__p343Menu.pick = null, true)');
        const tab = await waitFor(async () => (await tabs(cdp)).find((x) => x.path.endsWith('/SKILL.md')) ?? null, 8000);
        r.opened = tab?.path ?? null;
        r.relPath = tab === null ? null : relative(P, tab.path);
        if (tab !== null) {
          const source = await bridge(cdp, `(() => { const b = document.querySelector('.ed-mode button[aria-label="Source"]'); if (b && b.getAttribute('aria-checked') !== 'true') b.click(); return true; })()`);
          void source;
          await sleep(1200);
          const at = await kit(cdp, `rectOf('.monaco-editor .view-lines')`);
          if (at !== null) {
            await mouse(cdp, at.x, at.y);
            await sleep(300);
            await cdp.call('Input.insertText', { text: r.typed });
            await sleep(500);
            const t = Date.now();
            await press(cdp, KEYS.save);
            await sleep(2500);
            r.toasts = await toastsSince(cdp, t);
            const now = readFileSync(real, 'utf8');
            r.fileHasTyped = now !== bytesBefore && now.includes(r.typed);
          }
        }
      }
      await showExplorer(cdp);
      say(`${name} C1: ${J(r)}`);
    });

    // ------------------------------------------------------------------ L7
    await guard(record, 'L7', async () => {
      const r = { clicked: false, tabOpened: false, idsBefore: null, idsAfter: null };
      record.arms.L7 = r;
      const row = await reveal(cdp, 'linkPipe');
      if (row !== null) {
        // REVIEW (rule 9): the whole tab list, before and after, so a tab under
        // another spelling, or a preview tab replaced, is seen too.
        r.idsBefore = (await tabs(cdp)).map((t) => t.id);
        await clickRow(cdp, row.path);
        r.clicked = true;
        await sleep(2500);
        const after = await tabs(cdp);
        r.idsAfter = after.map((t) => t.id);
        r.tabOpened = after.some((t) => t.path === join(P, 'linkPipe'));
      }
      // A read left blocked on the FIFO (the parent's A5) is released: one open
      // for writing meets the blocked reader, and closing it ends that read.
      try {
        closeSync(openSync(local.pipe, FS.O_WRONLY | FS.O_NONBLOCK));
      } catch {
        /* no reader was waiting */
      }
      say(`${name} L7: ${J(r)}`);
    });
  }

  // ------------------------------------------------------------------ L3, the doors
  async function armL3(ctx) {
    const { cdp, local, record, allow, name } = ctx;
    const P = local.proj;
    const r = {
      menus: { underSkills: null, underLinkOut: null, linkRow: null },
      keys: {},
      drags: {},
      drops: {},
      creates: { claude: null, agentSkills: null, made: {} },
      duplicate: null,
      editor: { dirtyTabs: null, monaco: null, saveToasts: null, savesPressed: 0, redlineShown: false, redlineToasts: null, autoSaveWaited: false, files: {} },
      reachable: { underSkills: false, underLinkOut: false }
    };
    record.arms.L3 = r;
    /** Every reason a control failed, kept: the first does not hide the second. */
    const cannot = (why) => {
      r.unreadable = typeof r.unreadable === 'string' ? `${r.unreadable}; ${why}` : why;
    };
    if (!ctx.menuTook) {
      cannot('the menu recorder did not take in main, so no menu could be read');
      return;
    }
    const UNDER = '.claude/skills/notes.md';
    const OUTSIDE = 'linkOut/secret.txt';
    const underRow = await reveal(cdp, UNDER, 20_000);
    const outRow = await reveal(cdp, OUTSIDE, 20_000);
    r.reachable = { underSkills: underRow !== null, underLinkOut: outRow !== null };

    // The menus.
    if (underRow !== null) r.menus.underSkills = await menuOf(ctx, UNDER);
    if (outRow !== null) r.menus.underLinkOut = await menuOf(ctx, OUTSIDE);
    const linkRow = (await reveal(cdp, '.claude/skills/')) ?? null;
    if (linkRow !== null) r.menus.linkRow = await menuOf(ctx, linkRow.path);

    // F2, ⌫, Delete: first on README.md, the CONTROL that must open the box
    // and the confirm (each cancelled), then on each row under a link. A key
    // pressed while the row did not hold the keyboard proves nothing, so each
    // press is made with the row focused and that is recorded.
    for (const [key, rel] of [['control', 'README.md'], ['underSkills', UNDER], ['underLinkOut', OUTSIDE]]) {
      if ((await reveal(cdp, rel, 10_000)) === null) continue;
      const k = { f2Box: null, backspaceDialog: null, deleteDialog: null, focused: true };
      const take = async () => {
        await clickRow(cdp, rel);
        await sleep(400);
        const held = (await kit(cdp, `focusRow(${J(rel)})`)) === true;
        if (!held) k.focused = false;
      };
      await take();
      await press(cdp, KEYS.f2);
      await sleep(700);
      k.f2Box = (await kit(cdp, 'box()'))?.open === true;
      if (k.f2Box) {
        await press(cdp, KEYS.escape);
        await sleep(400);
      }
      for (const [field, keyDef] of [['backspaceDialog', KEYS.backspace], ['deleteDialog', KEYS.del]]) {
        await take();
        await press(cdp, keyDef);
        await sleep(900);
        k[field] = (await kit(cdp, 'modal()'))?.open === true;
        if (k[field] && !(await dismissModal(cdp))) throw new Error('a confirm would not close without being answered');
      }
      r.keys[key] = k;
    }
    const kc = r.keys.control;
    // REVIEW (rule 9): Delete is controlled as well as ⌫. Both reach the same
    // handler today (FileTree.tsx `onKeyDown`), so a Delete that opens nothing
    // under a link said nothing until the control showed Delete opens one.
    if (kc === undefined || kc.focused !== true || kc.f2Box !== true || kc.backspaceDialog !== true || kc.deleteDialog !== true) {
      cannot(`the key control on README.md did not open the rename box and the confirm with the row focused (${J(kc ?? null)}), so a key that opens nothing under a link says nothing`);
    } else if (['underSkills', 'underLinkOut'].some((k) => r.keys[k] !== undefined && r.keys[k].focused !== true)) {
      cannot('a row under a link did not hold the keyboard when its keys were pressed');
    }

    // The drags: a control that must start, then the three from under the link.
    const srcRow = await reveal(cdp, 'src/');
    const srcAt = srcRow === null ? null : await kit(cdp, `mount('src/')`);
    const away = srcAt === null ? { x: 40, y: 40 } : { x: srcAt.x, y: srcAt.y };
    const control = ctx.interceptOk ? await dragGesture(ctx, 'README.md', away) : null;
    r.drags.control = control;
    if (!ctx.interceptOk) cannot('Input.setInterceptDrags was refused, so no drag was pressed: one the window server owned could not be ended by this probe');
    else if (control === null || control.intercepted !== true) {
      cannot(`the drag control (README.md) never started a drag Chromium could intercept (${J(control)}), so a drag that did not start says nothing`);
    } else if (underRow !== null) {
      r.drags.treeMove = await dragGesture(ctx, UNDER, away);
      r.drags.toTerminal = await dragGesture(ctx, UNDER, { x: away.x + 600, y: away.y });
      if (ctx.dragTook) {
        const before = await startDrags(ctx);
        const finderControl = await dragGesture(ctx, 'README.md', { x: away.x + 600, y: away.y }, { modifiers: 1 });
        const controlCalls = (await startDrags(ctx)) - before;
        r.drags.finderControl = { ...finderControl, startDrag: controlCalls };
        if (controlCalls < 1) cannot('the Finder drag control (⌥ on README.md) never reached startDrag, so a refusal there says nothing');
        else {
          const mid = await startDrags(ctx);
          const g = await dragGesture(ctx, UNDER, { x: away.x + 600, y: away.y }, { modifiers: 1 });
          r.drags.toFinder = { ...g, startDrag: (await startDrags(ctx)) - mid };
        }
      } else cannot("main's startDrag could not be replaced, so the Finder drag was not pressed");
    }

    // The Finder drops: a control onto src/, then under the link and onto the link row.
    allow('local:proj/src/p343-dropped-control.txt', 'local:proj/src/');
    await finderDrop(ctx, 'src/', join(ctx.drops, 'p343-dropped-control.txt'));
    r.drops.control = { landed: existsSync(join(P, 'src/p343-dropped-control.txt')) };
    if (r.drops.control.landed !== true) cannot('the Finder drop control onto src/ landed nothing, so a drop that lands nothing says nothing');
    else {
      if (underRow !== null) {
        await reveal(cdp, UNDER);
        await finderDrop(ctx, UNDER, join(ctx.drops, 'p343-dropped.txt'));
        r.drops.underLink = { landed: landedAnywhere(local, 'p343-dropped.txt') };
      }
      // FIX ROUND: its own name, so a drop under the link that landed cannot
      // be mistaken for this one. At the parent the link row is a leaf and the
      // drop lands in .claude/, beside it; at HEAD it must land in the same
      // place and nowhere else (§0, "no scenario worse than today").
      const lr = (await reveal(cdp, '.claude/skills/')) ?? (await reveal(cdp, '.claude/skills'));
      if (lr !== null) {
        allow(LINK_ROW_DROP, 'local:proj/.claude/');
        await finderDrop(ctx, lr.path, join(ctx.drops, 'p343-dropped-link.txt'));
        r.drops.linkRow = { landed: landedAnywhere(local, 'p343-dropped-link.txt'), where: landedWhere(local, 'p343-dropped-link.txt') };
      }
    }

    // The editor half: auto save on, Monaco typed into, clean ⌘S on two files, then Redline.
    await cdpEval(cdp, "window.__gmuxP268.setPolicy('afterDelay', 1000).then(() => true)");
    const files = { notes: join(P, '.agent/skills/notes.md'), index: join(P, 'src/index.ts'), secret: join(local.outside, 'secret.txt') };
    for (const [k, abs] of Object.entries(files)) r.editor.files[k] = { before: fileStamp(abs), after: '' };
    const indexTab = await openFromTree(cdp, 'linkIn/index.ts', join(P, 'linkIn/index.ts'));
    if (indexTab !== null) {
      const at = await waitFor(async () => kit(cdp, `rectOf('.monaco-editor .view-lines')`), 8000);
      const before = (await tabs(cdp)).find((t) => t.id === indexTab.id)?.value ?? null;
      let focused = false;
      if (at !== null) {
        await mouse(cdp, at.x, at.y);
        await sleep(300);
        // REVIEW (rule 9): typing that changed nothing proves nothing unless
        // the editor held the keyboard when it was typed. The Phase 268 drive's
        // own reading of where the focus is.
        focused = (await cdpEval(cdp, 'window.__gmuxP268.read().editorFocused')) === true;
        await cdp.call('Input.insertText', { text: 'p343' });
        await sleep(3500);
        r.editor.autoSaveWaited = true;
      }
      const after = (await tabs(cdp)).find((t) => t.id === indexTab.id)?.value ?? null;
      r.editor.monaco = { typedInto: at !== null, focused, before, after };
      if (at !== null && !focused) cannot('the click into Monaco on linkIn/index.ts did not give it the keyboard, so typing that changed nothing says nothing');
    }
    r.editor.saveToasts = [];
    r.editor.savedWithText = 0;
    for (const [rel, abs] of [['linkIn/index.ts', join(P, 'linkIn/index.ts')], [UNDER, join(P, UNDER)], [OUTSIDE, join(P, OUTSIDE)]]) {
      const tab = await openFromTree(cdp, rel, abs);
      if (tab === null) continue;
      await sleep(800);
      // REVIEW (rule 9): a ⌘S writes the EDITOR's text and nothing at all when
      // the tab has none (`saveOnce`'s null-model return, tab-io.ts), and a
      // markdown tab opens RENDERED with none. So every tab is put in Source
      // first, by the Phase 268 drive's own chip action, and counted only when
      // it then holds text; otherwise the clean ⌘S on notes.md, S2's own
      // shape, could not write whatever the flag said.
      await cdpEval(cdp, `window.__gmuxP268.sourceMode(${J(tab.id)}).then(() => true)`, 30_000);
      const held = (await tabs(cdp)).find((t) => t.id === tab.id) ?? null;
      if (held !== null && typeof held.value === 'string') r.editor.savedWithText += 1;
      r.editor.saveToasts.push(...(await cleanSave(cdp)));
      r.editor.savesPressed += 1;
    }
    if (r.editor.savesPressed !== r.editor.savedWithText) cannot('a clean ⌘S was pressed on a tab with no text in the editor, so a save that wrote nothing says nothing');
    for (const [k, abs] of Object.entries(files)) r.editor.files[k].after = fileStamp(abs);

    // Redline: a /bin/sh appends underneath, the strip tab is pressed (a look
    // re-reads, Phase 334), Redline is chosen, typed into, then ⌥↓ and ⌥⌫.
    allow('local:proj/.agent/skills/notes.md');
    const notesTab = await openFromTree(cdp, UNDER, join(P, UNDER));
    let appended = false;
    if (notesTab !== null) {
      appended = sh(`printf 'appended by p343\\n' >> '${files.notes}'`);
      await sleep(600);
      const strip = await kit(cdp, `tabRect('notes.md')`);
      if (strip !== null) await mouse(cdp, strip.x, strip.y);
      await sleep(1500);
      const chip = await waitFor(async () => (await bridge(cdp, `(() => { const b = document.querySelector('.ed-mode button[aria-label="Redline"]'); if (!b) return null; b.click(); return true; })()`)).value ?? null, 8000, 400);
      if (chip === true) {
        await sleep(1500);
        r.editor.redlineShown = (await cdpEval(cdp, "document.querySelector('.ed-redline-scroll') !== null")) === true;
        const doc = await kit(cdp, `rectOf('.ed-redline-doc')`);
        if (doc !== null) {
          await mouse(cdp, doc.x, doc.y);
          await sleep(300);
          await cdp.call('Input.insertText', { text: 'z' });
          await sleep(600);
        }
        await kit(cdp, `focus('.ed-redline-scroll')`);
        const t = Date.now();
        await press(cdp, KEYS.next);
        await sleep(400);
        await press(cdp, KEYS.rewind);
        await sleep(1500);
        r.editor.redlineToasts = await toastsSince(cdp, t);
      }
    }
    await sleep(2500);
    r.editor.dirtyTabs = (await kit(cdp, 'dirtyTabs()')) ?? [];
    // REVIEW (rule 9): the census allows notes.md because the probe appends to
    // it, so its bytes are held to exactly what was written: the fixture's
    // line and, when the /bin/sh ran, the probe's. A Redline keystroke that
    // auto save wrote through the link, or a rewind that was not refused,
    // moves them.
    r.editor.notes = { bytes: readText(files.notes), expected: `notes\n${appended ? 'appended by p343\n' : ''}`, appended };
    await cdpEval(cdp, "window.__gmuxP268.setPolicy('off', 1000).then(() => true)");

    // The creates: header New File and New Folder from a row under the link,
    // then from the link row, then New File… from the link row's own menu,
    // then Duplicate on the link row. Each name is the probe's, listed after.
    for (const c of CREATES) allow(`local:proj/.claude/${c.name}${c.kind === 'dir' ? '/' : ''}`);
    allow('local:proj/.claude/', 'local:proj/.claude/skills copy');
    for (const c of CREATES) {
      if (c.from === 'under') {
        if ((await reveal(cdp, UNDER, 10_000)) === null) continue;
        await clickRow(cdp, UNDER);
      } else {
        const lr = (await reveal(cdp, '.claude/skills/', 10_000)) ?? (await reveal(cdp, '.claude/skills', 5000));
        if (lr === null) continue;
        if (c.from === 'link') await clickRow(cdp, lr.path);
        else {
          await menuOf(ctx, lr.path, 'New File…');
          r.creates.made[c.id] = await typeInBox(cdp, c.name);
          continue;
        }
      }
      await sleep(500);
      if (!(await headerPress(cdp, c.kind === 'dir' ? 'New folder' : 'New file'))) continue;
      r.creates.made[c.id] = await typeInBox(cdp, c.name);
    }
    r.creates.claude = listing(join(P, '.claude'));
    r.creates.agentSkills = listing(join(P, '.agent/skills'));
    {
      const lr = (await reveal(cdp, '.claude/skills/', 10_000)) ?? (await reveal(cdp, '.claude/skills', 5000));
      if (lr !== null) {
        await menuOf(ctx, lr.path, 'Duplicate');
        await sleep(2500);
        const dup = await reveal(cdp, '.claude/skills copy/', 10_000);
        r.duplicate = dup === null ? null : { path: dup.path, type: dup.type, deco: dup.deco, decoTitle: dup.decoTitle };
      }
    }
    say(`${name} L3: menus ${J(r.menus)}`);
    say(`${name} L3: keys ${J(r.keys)}; drags ${J(r.drags)}; drops ${J(r.drops)}`);
    say(`${name} L3: creates ${J(r.creates)}; duplicate ${J(r.duplicate)}; editor ${J(r.editor)}`);
  }

  // =========================================================================
  // THE MACHINE
  // =========================================================================

  async function remoteArms(ctx) {
    const { cdp, far, record, allow, name } = ctx;
    if (!['R0', 'R1', 'R2', 'R3', 'R4'].some(on)) return;
    const F = far.proj;
    const logText = () => {
      try {
        return readFileSync(FARLOG, 'utf8');
      } catch {
        return '';
      }
    };
    const logLines = () => logText().split('\n').length - 1;
    const openFar = async () => {
      for (let attempt = 1; attempt <= 6; attempt += 1) {
        const o = await bridge(cdp, `window.__gmuxP95.openRemote(${J(MACHINE_ID)}, ${J(F)})`);
        if (o.ok && o.value?.result?.ok === true) return true;
        await sleep(2000);
      }
      return false;
    };
    const mark0 = logLines();
    if (!(await openFar())) {
      for (const id of ['R0', 'R1', 'R2', 'R3', 'R4']) if (on(id)) record.arms[id] = { unreadable: `the far project ${F} did not open` };
      return;
    }
    await showExplorer(cdp);
    // THE COUNT'S CONTROL: the root's own walk must be in the log, or the far
    // shell never read the yard's .zshenv and no count below means anything.
    const rootWalked = await waitFor(async () => parseFindLog(logText(), mark0).walks.includes(F) || null, 20_000, 500);
    const countable = rootWalked === true;
    if (!countable) say(`${name}: the far log names no walk of ${F}, so the far count cannot be read`);

    // ------------------------------------------------------------------ R0
    await guard(record, 'R0', async () => {
      const r = { rowsUnder: null, walks: null, row: null, clicked: false };
      record.arms.R0 = r;
      if (!countable) r.unreadable = 'the find wrapper logged no root walk, so whether deep/a/b was asked cannot be read';
      else {
        const from = logLines();
        const row = await reveal(cdp, 'deep/a/b/', 20_000);
        r.row = row;
        // REVIEW (rule 9): a folder that was never drawn was never opened, and
        // its empty, unasked reading read as "7.7 STANDS" at the parent.
        if (row === null) r.unreadable = 'deep/a/b/ was never drawn as a row, so whether it opens cannot be read';
        else {
          if (row.expanded === 'false') {
            await clickRow(cdp, row.path);
            r.clicked = true;
          }
          await sleep(6000);
          r.rowsUnder = await rowsUnder(cdp, 'deep/a/b/');
          r.walks = parseFindLog(logText(), from).walks.filter((p) => p === join(F, 'deep/a/b')).length;
        }
      }
      say(`${name} R0: ${J(r)}`);
    });

    // ------------------------------------------------------------------ R1
    await guard(record, 'R1', async () => {
      const r = { links: [], skills: { children: null, afterRefresh: null }, menu: null, band: null, farFile: null, saveToasts: null, savePressed: false, saveWithText: false };
      record.arms.R1 = r;
      for (const l of far.links) {
        const drawn = await reveal(cdp, l.rel, 15_000);
        r.links.push({ rel: l.rel, stat: linkStatOf(join(F, l.rel)), drawn: drawn === null ? null : { path: drawn.path, type: drawn.type, deco: drawn.deco, decoTitle: drawn.decoTitle } });
      }
      const skills = await expand(cdp, '.claude/skills/', 20_000);
      if (skills !== null) {
        await waitFor(async () => (await rowsUnder(cdp, '.claude/skills/')).length > 0 || null, 15_000, 500);
        r.skills.children = directUnder(await rowsUnder(cdp, '.claude/skills/'), '.claude/skills/');
        await refreshFiles(cdp);
        await sleep(6000);
        r.skills.afterRefresh = directUnder(await rowsUnder(cdp, '.claude/skills/'), '.claude/skills/');
        if (ctx.menuTook && (await reveal(cdp, '.claude/skills/notes.md', 10_000)) !== null) r.menu = await menuOf(ctx, '.claude/skills/notes.md');
        const abs = join(F, '.agent/skills/notes.md');
        const tab = await openFromTree(cdp, '.claude/skills/notes.md', join(F, '.claude/skills/notes.md'));
        if (tab !== null) {
          await sleep(1500);
          const bands = (await kit(cdp, 'band()')) ?? [];
          r.band = bands.find((b) => b === BAND) ?? bands[0] ?? null;
          // REVIEW (rule 9): Source first, as in L3, because a far save also
          // writes nothing from a tab with no editor text (`saveOnMachine`).
          await cdpEval(cdp, `window.__gmuxP268.sourceMode(${J(tab.id)}).then(() => true)`, 30_000);
          r.saveWithText = typeof ((await tabs(cdp)).find((t) => t.id === tab.id)?.value ?? null) === 'string';
          const before = fileStamp(abs);
          r.saveToasts = await cleanSave(cdp);
          r.savePressed = true;
          r.farFile = { before, after: fileStamp(abs) };
        }
      }
      say(`${name} R1: ${String(r.links.filter((l) => l.drawn !== null).length)} rows; skills ${J(r.skills)}; menu ${J(r.menu)}; band ${J(r.band)}; far file ${J(r.farFile)}; toasts ${J(r.saveToasts)}`);
    });

    // ------------------------------------------------------------------ R2
    await guard(record, 'R2', async () => {
      const r = { rowsUnder: null, ms: null, note: null };
      record.arms.R2 = r;
      const row = await reveal(cdp, 'linkFsRoot', 15_000);
      if (row !== null && row.type === 'folder') {
        const t = Date.now();
        if (row.expanded === 'false') await clickRow(cdp, row.path);
        const got = await waitFor(async () => {
          const under = await rowsUnder(cdp, 'linkFsRoot/');
          return under.length > 0 ? under.length : null;
        }, 22_000, 500);
        r.ms = got === null ? null : Date.now() - t;
        r.rowsUnder = got ?? 0;
        r.note = await kit(cdp, 'remoteNote()');
      } else r.rowsUnder = 0;
      say(`${name} R2: ${J(r)}`);
    });

    // ------------------------------------------------------------------ R3
    await guard(record, 'R3', async () => {
      const r = { steps: [] };
      record.arms.R3 = r;
      // REVIEW (rule 9): each step says whether its link was OPENED (pressed
      // open, or already open), because a row that was not a folder, or not
      // found, kept the Explorer's rows without asking the machine anything.
      const step = async (what, opened) => {
        await sleep(5000);
        r.steps.push({ what, opened, rows: ((await kit(cdp, 'rows()')) ?? []).length, stub: await kit(cdp, 'stub()') });
      };
      const openLink = async (rel) => {
        const row = await reveal(cdp, rel, 15_000);
        if (row === null || row.type !== 'folder') return false;
        if (row.expanded === 'false') await clickRow(cdp, row.path);
        return true;
      };
      for (const rel of ['linkVarRoot', 'linkLocked']) await step(rel, await openLink(rel));
      rmSync(far.gone, { recursive: true, force: true });
      allow('far:gone/**', 'far:./');
      await step('linkGone', await openLink('linkGone'));
      const c = await closeAndReopen();
      if (!c.closed) r.unreadable = `the far tab was not closed and reopened: ${c.why}`;
      else {
        await step('reopened', null);
        r.steps[r.steps.length - 1].closed = true;
      }
      say(`${name} R3: ${J(r)}`);
    });

    // ------------------------------------------------------------------ R4
    await guard(record, 'R4', async () => {
      const r = { maxInFlight: null, linkWalks: null, linkPaths: null, refreshPaths: null, reopenPaths: null, closed: null };
      record.arms.R4 = r;
      // FIX ROUND: a confirm left up by an earlier step eats the first click
      // below (the first app run read ten/l0 never walked), so none may be up.
      if ((await kit(cdp, 'modal()'))?.open === true && !(await dismissModal(cdp))) r.unreadable = 'a confirm was up before the ten links were opened and would not close';
      else if (!countable) r.unreadable = 'the find wrapper logged no root walk, so the far count cannot be read';
      else {
        const from = logLines();
        await reveal(cdp, 'ten/l0', 15_000);
        for (let i = 0; i < 10; i += 1) {
          const at = await kit(cdp, `mount(${J(`ten/l${String(i)}/`)})`);
          if (at !== null && at.row.expanded === 'false') await mouse(cdp, at.x, at.y);
          await sleep(60);
        }
        await sleep(8000);
        const refreshFrom = logLines();
        await refreshFiles(cdp);
        await sleep(8000);
        const closeFrom = logLines();
        const c = await closeAndReopen();
        r.closed = c.closed;
        if (!c.closed) r.unreadable = `the far tab was not closed and reopened: ${c.why}`;
        await sleep(15_000);
        const text = logText();
        const tenOf = (walks) => [...new Set(walks.filter((p) => p.startsWith(join(F, 'ten/l'))).map((p) => relative(F, p)))].sort();
        // Three windows of the far log: the clicks, Refresh, and the reopen.
        const opened = parseFindLog(text, from, refreshFrom);
        r.maxInFlight = parseFindLog(text, 0).maxInFlight;
        // `find` runs, FINDS_PER_WALK a walk; the clauses read the paths.
        r.linkWalks = parseFindLog(text, from).walks.filter((p) => p.startsWith(join(F, 'ten/l'))).length;
        r.linkPaths = tenOf(opened.walks);
        r.refreshPaths = tenOf(parseFindLog(text, refreshFrom, closeFrom).walks);
        r.reopenPaths = tenOf(parseFindLog(text, c.closed ? c.fromLine : closeFrom).walks);
        r.windowMax = parseFindLog(text, from).maxInFlight;
      }
      say(`${name} R4: ${J(r)}`);
    });

    /**
     * Close the far project's tab FOR REAL, then open it again.
     *
     * FIX ROUND. Closing a project asks first (`Close 'proj'?`,
     * src/renderer/state/projects-slice.ts `closeProject`), and the first app
     * run never answered it: the tab never closed, the reopen tested nothing,
     * and the confirm left up ate R4's first click (ten/l0 never walked). So
     * the ONE button this presses is that confirm's own `Close project`, and
     * only under a `Close '…'?` title; any other confirm is cancelled and the
     * step reads not closed. The tab count must then drop before the reopen,
     * and the reopen's walks are read from the line it began at.
     */
    async function closeAndReopen() {
      const before = Number(await kit(cdp, 'tabCount()'));
      const clicked = await bridge(cdp, `(() => { const b = document.querySelector('.ptab-wrap.selected .ptab-close'); if (!b) return false; b.click(); return true; })()`);
      if (!(clicked.ok && clicked.value === true)) return { closed: false, why: 'the far tab drew no close button' };
      const asked = await waitFor(async () => { const m = await kit(cdp, 'modal()'); return m?.open === true ? m : null; }, 5000);
      if (asked === null) return { closed: false, why: 'closing the far tab asked nothing, where it always asks' };
      if ((await kit(cdp, 'confirmClose()')) !== true) {
        await dismissModal(cdp);
        return { closed: false, why: `the confirm up was not the project close (${J(asked.title)})` };
      }
      const dropped = await waitFor(async () => Number(await kit(cdp, 'tabCount()')) < before || null, 10_000, 250);
      if (dropped === null) {
        // An editor tab's own Save prompt (Phase 260) would be up now; it is
        // CANCELLED, which stops the close, and never answered otherwise.
        const left = await kit(cdp, 'modal()');
        await dismissModal(cdp);
        return { closed: false, why: `the tab count stayed ${String(before)} after Close project${left?.open === true ? ` (${J(left.title)} was up, and was cancelled)` : ''}` };
      }
      await sleep(1000);
      const fromLine = logLines();
      if (!(await openFar())) throw new Error('the far project did not open again');
      await showExplorer(cdp);
      await sleep(3000);
      return { closed: true, fromLine };
    }
  }

  /**
   * Every durable baseline record under the profile, read as JSON: how many,
   * and which name a path at or under a link row. C1's own path is set aside
   * BY NAME, because Context keeps today's behaviour (D1) and may record it.
   */
  function readBaselines(profile, proj, c1RelPath) {
    const dir = join(profile, 'gmux', 'baselines');
    if (!existsSync(dir)) return { read: true, records: 0, underLink: [], excluded: [] };
    let names;
    try {
      names = readdirSync(dir).filter((n) => n.endsWith('.json'));
    } catch {
      return { read: false, records: 0, underLink: [], excluded: [] };
    }
    const underLink = [];
    const excluded = [];
    for (const n of names) {
      let rec = null;
      try {
        rec = JSON.parse(readFileSync(join(dir, n), 'utf8'));
      } catch {
        continue;
      }
      const rel = typeof rec?.relPath === 'string' ? rec.relPath : null;
      if (rel === null || rec?.repoPath !== proj) continue;
      if (!LINK_FOLDERS.some((l) => rel === l || rel.startsWith(`${l}/`))) continue;
      if (c1RelPath !== null && rel === c1RelPath) excluded.push(rel);
      else underLink.push(rel);
    }
    return { read: true, records: names.length, underLink, excluded };
  }
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === HERE;
if (isMain && process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);
if (isMain) await run();
