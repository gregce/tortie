#!/usr/bin/env node
/**
 * probe:p364 — THE PHASE 364 APP RUN (build/p364/SPEC.md §8): the diagnostic
 * Tortie he will run as his everyday app, read the way research 143 §5 says to
 * read it, beside the normal app it must leave unchanged.
 *
 * ONE ELECTRON AT A TIME, each through build/electron-run.mjs's `withElectron`
 * inside build/harness-socket.mjs (`gmux-p364…`), each launch on its OWN
 * scratch profile, HOME and ZDOTDIR with HISTFILE=/dev/null, SHELL=/bin/sh and
 * every token a crash dump would carry taken out of its environment (a dump
 * holds the process's whole environment, research 42:164).
 *
 * WHAT IS REAL. His recorded shape, seeded by `build/p3167/seed-sessions.mts
 * --shape his` (counts only; no manifest of his is read). The PACKAGED
 * diagnostic app (`P364_DIAG_APP`, made by build/diagnostic/package.mjs in a
 * clone, unsigned) and the normal package beside it (`P364_NORMAL_APP`, and
 * `P364_PARENT_APP` for the parent), launched by their absolute binary path,
 * never opened through LaunchServices. The DAMAGE is the checker's own plants
 * (research 143 §2.3 and §5), made by the TEST variant (`P364_TEST_BS3`, built
 * by build/diagnostic/build-checker.mjs) loaded into the diagnostic build's
 * MAIN by build/diagnostic/hook-bs3.cjs (SPEC §4.5), so every plant runs under
 * the diagnostic build's own handshake, events and quit. The shipped
 * diagnostic .node cannot plant: the code is not in it.
 *
 * HOW A FILE GOES INTO MAIN. A development build takes it through
 * NODE_OPTIONS (`--require`). A PACKAGED app drops `--require` from
 * NODE_OPTIONS ("Most NODE_OPTIONs are not supported in packaged apps"), which
 * SPEC §4.5 had wrong and which left six arms UNREADABLE by construction (both
 * lenses, 2026-11-09); so a packaged launch starts with `--inspect-brk=0`, and
 * `inspectorBootstrap` loads the same files, in the same order, on main's first
 * paused line, then resumes it and disconnects (the fix round). C loads none.
 *
 * THE INSTRUMENTS, THREE SCRATCH FILES THIS FILE WRITES (never a file under
 * src/), each loaded into MAIN as above:
 *   the recorder   appends one JSON line per event with appendFileSync (on disk
 *                  before any SIGKILL): before-quit, will-quit and quit, the
 *                  About panel's options as main sets them (the version line,
 *                  read from main), and, when asked, every message box main
 *                  shows (recorded and answered OK, so none is drawn). It
 *                  presses the native menu's Quit row or "Check for Updates…"
 *                  (item.click() in MAIN, probe:p362's shape) when the probe
 *                  asks through its trigger file, and with P364_KILL_ON_LINE it
 *                  ends its own process by SIGKILL within 25 ms of the
 *                  checker's line, so a heap the plant damaged runs no longer
 *                  than the reading needs.
 *   the tracker    wraps better-sqlite3's Database through Module._load AT
 *                  ONCE (after the hook, so it wraps the checking build) and
 *                  records every connection opened (its file, read only or
 *                  not, the stack that opened it), every close() begun and
 *                  every close() finished: WHICH code opened the connection
 *                  the checker planted, and whether its close ever returned.
 *   the arm app    R's no-window Electron app (the spec step's `eapp`): the
 *                  hook, then research 143 §2.3's arm over a manifest-shaped
 *                  WAL database, ended by `db.close()`.
 *
 * NO AGENT RUNS, not even for a version: every launch hides every probed
 * registry row but its stand-ins (`writeHiddenAgents(profile, 'p364',
 * hiddenAgentsBesides(standIns))`) and reads `agents:list` back
 * (`standInsOnlyVerdict`). M2b's Codex and OpenCode readers are reached through
 * /bin/sh stand-ins this file writes (probe:p365's codex shape) over scratch
 * stores under the run's own HOME, never his.
 *
 * NO REAL TAILSCALE, DNS OR UPDATE HOST. A packaged Tortie IGNORES
 * GMUX_TAILSCALE_BIN (src/main/machines/tailscale.ts:158), so no packaged
 * launch here ever turns the phone's door on, and M2c, whose churn pairs the
 * phone, runs the two DEVELOPMENT builds instead (the diagnostic `out/` in the
 * clone the package was made from, with the diagnostic .node by the hook, and
 * this checkout's normal `out/`), over the Tailscale stand-in and the DNS
 * stand-in in this process. Every packaged launch runs with
 * GMUX_UPDATE_REHEARSAL=1 and TORTIE_UPDATE_FEED naming a loopback listener
 * this file holds and counts, and is ENDED within 20 s unless its app.log says
 * the loopback feed was accepted or that updates are off in this build, so no
 * update check ever resolves a real host (SPEC §0).
 *
 * DELIBERATE FAULTS, FIVE AT MOST: R's crash-state close, and M2b's integrity
 * check, the ring's two fresh connections and the OpenCode reader, each ended
 * by the test checker's own SIGSEGV handler (`P358ADV_SEGV_EXIT=1`), which
 * prints its line and exits 139 before any macOS report or Crashpad dump is
 * written (SPEC §0, measured). Every other plant is ended before it can fault:
 * by the will-quit SIGKILL (M1) or by the recorder's SIGKILL on the line (M2a,
 * M2b's held connections). His reports folder is read by NAME and mtime before
 * and after every launch and never opened; every Crashpad dump under a scratch
 * profile is counted and deleted.
 *
 * THREE VERDICTS, AND A MISSING READING IS NEVER A PASS. Each grader names the
 * fields it reads (`reads`), the preconditions without which nothing it says
 * can be trusted (`needs`) and its `clauses`. An absent field or an unmet need
 * is UNREADABLE (exit 2); only a clause is FAIL. Every reading the run takes
 * from raw text (the checker's stderr lines, app.log, the tracker's and the
 * recorder's lines, the arm app's output, the cost runs, the RSS samples) is
 * composed by ONE pure function, and `--grader-self-test` drives those same
 * functions over recorded raw fixtures (build/p364/fixtures/graders.json,
 * seeded from the spec step's own runs) as well as grading recorded readings:
 * every clause shown red alone, every need shown unreadable alone, every field
 * deleted alone answering UNREADABLE.
 *
 * THE ARMS (SPEC §8), in the order they run:
 *   R      the reproduction in a scratch no-window app in Electron 43.8.7's main
 *   M1n    Method 1's other side: the normal app (the parent's when given)
 *   M1     Method 1: the crash state in the session list, the menu's Quit, the relaunch
 *   M2a    foreign-free, zero-take and stray-write in the session list (M2a-<plant>)
 *   M2b    the crash state in each main-process connection of SPEC §3 (M2b-<target>;
 *          M2b-session-list is read from M1's launch)
 *   U      the update feed: the normal app asks the loopback feed, the diagnostic app never
 *   U-feed-file  U's two launches read for app-update.yml beside its control (the normal app
 *          holds one): asked by name with DMG-built apps, because electron-builder writes the
 *          file into neither app of a --dir pair, so there it reads UNREADABLE (the probe review)
 *   C      the cost, ABAB on his shape, the normal package and the diagnostic package
 *   P      the packaged diagnostic itself: its module, D8, About, the armed line at every launch
 *          (after C, so it counts every packaged diagnostic launch of the run)
 *   M2c    20 minutes of churn on each development build: no line, no fault, RSS within 5 %
 *   RUN    the census, every pid ended, the socket, his reports, the dumps, his history
 *
 * HOW LONG, measured by the fix round (2026-11-14, load averages up to 42):
 * every arm but M2c in 4 to 5 minutes (R, M1n, M1 and M2a 44 s; M2b 58 s; U
 * 105 s; C 74 s; P 5 s), and M2c two churns of P364_CHURN_MIN minutes (the
 * diagnostic build's and the normal one's, the same script, so the RSS can be
 * compared) plus about 20 s each: 614 to 620 s at 5 minutes. Its RSS clause is
 * noisy at 5 minutes: the normal build alone moved 27 % between three runs.
 *
 * VERIFIERS ONLY: it starts Electrons. Take the orchestrator's lock.
 *
 *   P364_DIAG_APP=<Tortie.app> P364_NORMAL_APP=<Tortie.app> P364_TEST_BS3=<dir> \
 *     P364_DIAG_NODE=<file> npm run -s probe:p364
 *   P364_DIAG_APP=<Tortie.app>     the packaged diagnostic app (`package.mjs --dir` in a clone)
 *   P364_NORMAL_APP=<Tortie.app>   this tree's normal package (`package:dir`): U, C and M1n's fallback
 *   P364_PARENT_APP=<Tortie.app>   the parent's normal package (M1n reads it when given)
 *   P364_TEST_BS3=<dir>            a built test variant (`build-checker.mjs --variant test --out <dir>`)
 *   P364_DIAG_NODE=<file>          the built diagnostic better_sqlite3.node (P holds the packed one to it)
 *   P364_DIAG_CHECKOUT=<dir>       M2c's diagnostic development build (default: the clone P364_DIAG_APP was made in)
 *   P364_DIAG_BS3=<dir>            M2c's diagnostic better-sqlite3 build (default: assembled from the packed module)
 *   P364_ARMS=R,M1,…               the arms (default R,M1n,M1,M2a,M2b,U,C,P,M2c; RUN is always read;
 *                                  a sub-arm such as M2b-arch or M2a-zero-take may be named alone;
 *                                  U-feed-file only when named, with DMG-built apps)
 *   P364_CHURN_MIN=<m>             M2c's minutes per build (default 20)
 *   P364_COST_RUNS=<n>             C's runs per build (default 5)
 *   P364_KEEP=1                    keep the run folder (dumps deleted, readings kept)
 *   P364_OUT_DIR=<dir>             where the report goes (default <GMUX_HARNESS_DIR>/p364-report, never out/)
 *   node build/p364/probe-p364.mjs --grader-self-test   every reader and grader on build/p364/fixtures/; starts nothing
 *   node build/p364/probe-p364.mjs --preflight          the inputs and the helpers, arm by arm; starts nothing
 *   node build/p364/probe-p364.mjs --list-graders       every grader's reads, needs and clauses by name; starts nothing
 *   node build/p364/probe-p364.mjs --instruments <dir>  writes every scratch file the run loads into an app; starts nothing
 *
 * His shell history and his reports folder are found through the passwd entry
 * (`userInfo().homedir`), because every launch, and this file, run with HOME in
 * scratch; both are read by size, name and time only.
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The build helpers this run USES, imported statically so gate:electron counts
// this probe among build/electron-run.mjs's users (obligation 1; usesHelper
// matches `from '../electron-run.mjs'`). Each module only DEFINES functions
// when imported: none starts a process, opens a socket or reads a home, so
// --grader-self-test, --preflight and --list-graders start nothing.
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsBesides, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { tsxCli } from '../ts-runner.mjs';
import { makePhone, pairThrough, readOffer, signedGet } from '../p316/node-phone.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin } from '../p332/dns-standin.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// What this run holds the build against, by value
// ---------------------------------------------------------------------------

/** The head this probe was written at (Phase 366 landed: Electron 43.8.7). */
export const SNAPSHOT = '3c0ac355';
/** "tortie-guard-364", the checker's 16-byte guard (D2), as app.log's hex. Neither zero nor a free-list entry. */
export const GUARD_PATTERN_HEX = '746f727469652d67756172642d333634';
/** The checker's one line and its armed line (D6, D7), and their `msg`s (SPEC §5). */
export const PCACHE_EVENT = 'diagnostic.pcache';
export const ARMED_EVENT = 'diagnostic.armed';
export const PAGE_LINE_MSG = 'A SQLite page line failed its check';
export const BLOCK_LINE_MSG = 'A SQLite allocation failed its check';
export const ARMED_MSG = 'The page-cache checker is on';
/** armChecker's one error line when the C side did not answer (SPEC §5). */
export const NO_CHECKER_LINE = 'this diagnostic build has no page-cache checker';
/** The updater's off line, and "Check for Updates…"'s words, in the diagnostic build (SPEC §5). */
export const UPDATES_OFF_LINE = 'updates are off in this diagnostic build';
export const UPDATES_OFF_TITLE = 'Updates are off in this build';
export const UPDATES_OFF_BODY = 'This diagnostic build does not update itself. Install the normal release to go back.';
/** The normal updater's two answers to the rehearsal override (src/main/updates/updater.ts). */
export const FEED_ACCEPTED_LINE = 'rehearsal feed override accepted';
export const FEED_REFUSED_LINE = 'TORTIE_UPDATE_FEED is set, but this launch is not a confirmed rehearsal';
/** About's mark (D3: the stamp carries it, `src/main/menu.ts` does not move). */
export const ABOUT_MARK = ' Diagnostic';
/** His app's bundle id, which the diagnostic build keeps (the entry's item 2). */
export const BUNDLE_ID = 'com.itavero.tortie';
/**
 * Research 143 §5's three readings, and the two the fix round added for the
 * allocator's fill for a freed slot (0xcd), which is what a free leaves in
 * Tortie's running main process: both lenses measured it, and research 143
 * §2.2's table, which has no fill, was measured in a bare app with no window.
 * The C's own words (D8).
 */
export const READINGS = Object.freeze({
  'free-list': 'a free-list entry in the guard: freed by code outside SQLite',
  fill: "the allocator's fill for freed memory (0xcd) in the guard and the header: freed by code outside SQLite",
  'fill-written': "the allocator's fill for freed memory (0xcd) in the header and other bytes in the guard: freed by code outside SQLite, then written over",
  zeros: 'zeros in the guard and the header: freed, then taken by a zero-filled block',
  stray: 'something else wrote here: a stray write'
});
/** The byte PartitionAlloc fills a freed slot with in Tortie's main process once its window is up (the fix round). */
export const FREED_FILL_HEX = 'cd';
/**
 * The readings each plant allows (SPEC §2.3, measured on PartitionAlloc). The
 * crash state and a zeroed header leave the guard WHOLE, so research 143 §5
 * reads them as "anything else"; only a zero-filled take zeros the guard and
 * the header both. A free reads as the allocator left the slot when the walk
 * came (the fix round): its fill while it holds the slot back, a free-list
 * entry once it lets it go, both research 143 §5's "freed by code outside
 * SQLite"; and a 4,096-byte owner that wrote over the start leaves the fill in
 * the header in the running app, where a bare app left the header whole.
 */
export const EXPECT_KIND = Object.freeze({
  'crash-state': Object.freeze(['stray']),
  'zero-header': Object.freeze(['stray']),
  'foreign-free': Object.freeze(['free-list', 'fill']),
  'zero-take': Object.freeze(['zeros']),
  'take-write': Object.freeze(['stray', 'fill-written']),
  'stray-write': Object.freeze(['stray'])
});
/** Every field of the one line (D6), the envelope included. */
export const D6_FIELDS = Object.freeze([
  'ts', 'level', 'scope', 'pid', 'proctype', 'event', 'msg',
  'check', 'detail', 'reading', 'line', 'header', 'guardBytes', 'headerBytes', 'pageBytes',
  'pageNumber', 'pagerPageNumber', 'bulk', 'words', 'database', 'schema', 'cache', 'entry',
  'walks', 'lines', 'sinceLoadMs', 'checker', 'guard'
]);
/** His report's frame and the address it read through (research 143 §2.1). */
export const CRASH_FRAME = 'pcache1EnforceMaxPage';
export const CRASH_ADDRESS = '0x34';
/** The checker's lines (build/diagnostic/sqlite-checker.c), read by prefix so a field added after them is not a miss. */
export const ARMED_LINE = /\[p358adv-ARMED\] checker (\S+) guard=(\d+) installed=(\d) plant=(\S+) at=(\d+) step=(\d+)/;
export const PLANT_LINE = /\[p358adv-PLANT\] (\S+) at check (\d+) op=(\S+) cache=(0x[0-9a-f]+) line=(0x[0-9a-f]+) page=(\d+) file=([^\n]*)/;
export const TAKE_LINE = /\[p358adv-TAKE\] (\S+) same-slot=(\d) taker=(0x[0-9a-f]+) slot=(0x[0-9a-f]+)(?: waited=(\d+) tries=(\d+))?/;
export const CRASH_SEGV_PARTS = /\[p358adv-SEGV\] signal (\d+) at address (0x[0-9a-f]+), pc 0x[0-9a-f]+ = ([^+\s]+)\+0x([0-9a-f]+) in /;
/** The Electron shim's line when the app it started ended by a signal (node_modules/electron/cli.js). */
export const SHIM_SIGNAL_LINE = /exited with signal (SIG[A-Z0-9]+)/;
/** Phase 36's wedged-watcher escape: a quit that printed it ended by THAT SIGKILL, not the will-quit one. */
export const WEDGED_QUIT_LINE = /still pending after 15 s more; ending the process hard because environment teardown would abort/;
/** The plants M2a reads back (SPEC §8): research 143 §5's three shapes. */
export const M2A_KINDS = Object.freeze(['foreign-free', 'zero-take', 'stray-write']);
/**
 * M2b's connections (SPEC §3, research 143 §6), each with the substring its
 * file name carries (P358ADV_PLANT_FILE), whether it is read only
 * (P358ADV_PLANT_READONLY), the opener the tracker must name for it, and
 * whether it is FRESH (opened and closed within one call, so the crash state
 * faults at its own close, SPEC §0.1 item 9) or held, and (the fix round)
 * whether its cache holds only lines of its bulk block (twenty or fewer), where
 * the plant may take a bulk line (P358ADV_PLANT_BULK). Only those three: given
 * to the integrity check, it planted in the schema probe's read-only connection
 * on the session list first (measured), whose cache is all bulk lines too.
 *
 * The ring's snapshot source and the integrity check both open the manifest
 * read only, and the integrity check comes first at every boot, so the
 * snapshot's plant waits for a walk count no boot reaches (`at`): the run
 * reads the session list `pump` times after its window comes, changes a row,
 * and presses Quit, whose ring generation opens the snapshot (src/main/
 * sessions/quit-generation.ts:204). Each `sessions.list()` is at least one
 * walk in the test variant (no floor, every entry), so `pump` walks bound
 * the count from below; the tracker then names the opener, so a plant that
 * landed anywhere else reads UNREADABLE, never a pass.
 */
export const RING_AT = 5_000;
export const RING_PUMP = 6_000;
export const M2B_TARGETS = Object.freeze({
  'session-list': Object.freeze({ file: 'gmux/manifest.db', readonly: 0, opener: 'session-list', fresh: false, at: 40, where: 'src/main/manifest/store.ts:553' }),
  integrity: Object.freeze({ file: 'gmux/manifest.db', readonly: 1, opener: 'integrity', fresh: true, at: 1, where: 'src/main/db/integrity.ts:211' }),
  'ring-snapshot': Object.freeze({ file: 'gmux/manifest.db', readonly: 1, opener: 'ring-snapshot', fresh: true, at: RING_AT, where: 'src/main/manifest/recovery.ts:257' }),
  'ring-evidence': Object.freeze({ file: '.vacuum.part', readonly: 1, opener: 'ring-evidence', fresh: true, at: 1, where: 'src/main/manifest/recovery.ts:163' }),
  'codex-state': Object.freeze({ file: '.codex/state_5.sqlite', readonly: 1, opener: 'codex-state', fresh: false, at: 1, where: 'src/main/manifest/harvest/codex-state.ts:133' }),
  overview: Object.freeze({ file: 'gmux/overview.db', readonly: 0, opener: 'overview', fresh: false, at: 1, bulk: true, where: 'src/main/overview/store/store.ts:883' }),
  arch: Object.freeze({ file: 'gmux/arch.db', readonly: 0, opener: 'arch', fresh: false, at: 1, where: 'src/main/arch/db.ts:1345' }),
  symbols: Object.freeze({ file: 'gmux/symbols.db', readonly: 0, opener: 'symbols', fresh: false, at: 1, bulk: true, where: 'src/main/symbols/persist.ts:122' }),
  opencode: Object.freeze({ file: 'opencode/opencode.db', readonly: 1, opener: 'opencode', fresh: true, at: 1, bulk: true, where: 'src/main/manifest/harvest/opencode-store.ts:92' })
});
export const M2B_TARGET_IDS = Object.freeze(Object.keys(M2B_TARGETS));
/**
 * The functions that open a connection, innermost first, each the opener
 * name the tracker's stack reads as (`openGmuxDatabase` is the shared opener
 * and is read past, to its caller). A name in the bundle may carry rollup's
 * `$<n>` suffix, which `\b` still bounds.
 */
export const OPENERS = Object.freeze([
  [/\bcheckDatabaseIntegrity\b/, 'integrity'],
  [/\breadDatabaseEvidence\b/, 'ring-evidence'],
  [/\bsnapshotDatabase\b/, 'ring-snapshot'],
  [/\breadSchemaStateAt\b/, 'schema-probe'],
  [/\bopenCodexState\b/, 'codex-state'],
  [/\breadOpencodeSessions\b/, 'opencode'],
  [/\bopenOverviewStore\b/, 'overview'],
  [/\bArchStore\b/, 'arch'],
  [/\bSymbolPersistence\b/, 'symbols'],
  [/\bManifestStore\b/, 'session-list'],
  [/\barmChecker\b/, 'handshake']
]);
/** M1 and M2a plant in the session list; M2a waits for a walk count only the pump reaches, so the line comes after the window. */
export const M1_AT = 40;
export const M2A_AT = 3_000;
export const M2A_PUMP = 3_500;
/** U waits this long past each launch before it presses "Check for Updates…" (the first check is at 30 s, updater.ts:125). */
export const U_WAIT_MS = 45_000;
/** A packaged launch whose app.log has not said the loopback feed was accepted, or that updates are off, is ended by then (SPEC §0: inside 25 s). */
export const FEED_GUARD_MS = 20_000;
/** M2c's RSS slack against the normal app's, and C's runs per build. */
export const RSS_SLACK = 0.05;
export const CHURN_MIN_DEFAULT = 20;
export const COST_RUNS_DEFAULT = 5;
/** The arms in the order they run (RUN is always read). */
export const DEFAULT_ARMS = Object.freeze(['R', 'M1n', 'M1', 'M2a', 'M2b', 'U', 'C', 'P', 'M2c']);
/** M2b's Codex store: threads and spawn edges, no index, so every lookup reads every page. */
export const CODEX_STORE_SQL = `
CREATE TABLE threads (id TEXT, rollout_path TEXT, cwd TEXT, created_at_ms INTEGER, thread_source TEXT);
CREATE TABLE thread_spawn_edges (child_thread_id TEXT, parent_thread_id TEXT);
WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c WHERE x < 3000)
INSERT INTO threads SELECT printf('p364-thread-%06d', x), printf('/nowhere/rollout-%06d.jsonl', x), '/nowhere', 1700000000000 + x, 'user' FROM c;
WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c WHERE x < 3000)
INSERT INTO thread_spawn_edges SELECT printf('p364-child-%06d', x), printf('p364-thread-%06d', x) FROM c;
`;
/** M2b's OpenCode store: one session table, wide enough that a read of 200 rows takes many pages. */
export const OPENCODE_STORE_SQL = `
CREATE TABLE session (id TEXT PRIMARY KEY, directory TEXT, time_created INTEGER, parent_id TEXT, time_archived INTEGER, title TEXT);
WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c WHERE x < 2000)
INSERT INTO session SELECT printf('ses_p364_%06d', x), '/nowhere/p364', 1700000000000 + x, NULL, NULL, printf('%0200d', x) FROM c;
`;
/** build/electron-run.mjs's census sentence, by its words: a launch that threw it put something on his own server. */
export const CENSUS_WORDS = "is the private server the operator's live";

// ---------------------------------------------------------------------------
// The readers: ONE pure function per reading the run takes from raw text. The
// live arms call these and nothing else; --grader-self-test drives them over
// recorded raw fixtures, so a reader that miscounts is shown to.
// ---------------------------------------------------------------------------

/** NDJSON lines as records. A line that does not parse is kept as `{ unparsed: true }`, so it cannot pass as an empty file. */
export function recordsOf(lines) {
  return (Array.isArray(lines) ? lines : [])
    .filter((l) => typeof l === 'string' && l.trim() !== '')
    .map((l) => {
      try {
        const o = JSON.parse(l);
        return o !== null && typeof o === 'object' && !Array.isArray(o) ? o : { unparsed: true };
      } catch {
        return { unparsed: true };
      }
    });
}

const isHex = (s, bytes) => typeof s === 'string' && s.length === bytes * 2 && /^[0-9a-f]+$/.test(s);
const allZero = (s) => typeof s === 'string' && s.length > 0 && /^0+$/.test(s);
const allFill = (s) => typeof s === 'string' && s.length > 0 && s.length % 2 === 0 && s === FREED_FILL_HEX.repeat(s.length / 2);

/** True when the 16 guard bytes are a PartitionAlloc free-list entry: an encoded pointer and its inverse (g0 ^ g1 == ~0). */
export function guardIsFreeList(guardHex) {
  if (!isHex(guardHex, 16) || guardHex === GUARD_PATTERN_HEX) return false;
  for (let i = 0; i < 8; i += 1) {
    const a = parseInt(guardHex.slice(i * 2, i * 2 + 2), 16);
    const b = parseInt(guardHex.slice(16 + i * 2, 16 + i * 2 + 2), 16);
    if ((a ^ b) !== 0xff) return false;
  }
  return true;
}

/** The kind research 143 §5 gives a reading's TEXT (the C's words, D8). */
export function kindOfReading(text) {
  if (typeof text !== 'string') return null;
  if (text.startsWith('a free-list entry in the guard')) return 'free-list';
  if (text.startsWith("the allocator's fill for freed memory (0xcd) in the guard and the header")) return 'fill';
  if (text.startsWith("the allocator's fill for freed memory (0xcd) in the header and other bytes in the guard")) return 'fill-written';
  if (text.startsWith('zeros in the guard and the header')) return 'zeros';
  if (text.startsWith('something else wrote here')) return 'stray';
  return 'other';
}

/**
 * The probe's OWN reading of the bytes the line carries (research 143 §5), from
 * the guard and the header alone and never from the C's text: a free-list
 * entry in the guard is a foreign free; the allocator's fill (0xcd) in both the
 * guard and the header a foreign free the allocator still holds; zeros in both
 * a zero-filled take; the fill in the header under other guard bytes a freed
 * slot written over; anything else a stray write. A bulk-block line has no
 * guard of its own.
 */
export function kindFromBytes(guardHex, headerHex, bulk) {
  if (bulk === true) return 'bulk';
  if (!isHex(guardHex, 16)) return 'unreadable';
  if (guardIsFreeList(guardHex)) return 'free-list';
  const header = isHex(headerHex, 56) ? headerHex : null;
  if (allFill(guardHex) && header !== null && allFill(header)) return 'fill';
  if (allZero(guardHex) && header !== null && allZero(header)) return 'zeros';
  if (guardHex !== GUARD_PATTERN_HEX && header !== null && allFill(header)) return 'fill-written';
  return 'stray';
}

/** A path with the line's `~` (the home folder D6 shortens) put back. */
export function expandHome(path, home) {
  if (typeof path !== 'string') return null;
  if ((path === '~' || path.startsWith('~/')) && typeof home === 'string' && home !== '') return `${home}${path.slice(1)}`;
  return path;
}
/** One spelling of a scratch path: macOS's /private/var and /var are one folder. */
export function canonFile(path) {
  if (typeof path !== 'string' || path === '') return null;
  return path.replace(/\/+/g, '/').replace(/\/$/, '').replace(/^\/private\/(var|tmp|etc)\//, '/$1/');
}
export const sameFile = (a, b) => canonFile(a) !== null && canonFile(a) === canonFile(b);

/**
 * One `diagnostic.pcache` record, read: which report it is, the D6 fields it
 * lacks, whether it sits in app.log's envelope with the byte fields' lengths
 * right, the C's reading and the probe's own reading of the bytes, and the
 * shapes research 143 §5 tells apart.
 */
export function pcacheLineOf(rec, { home = null } = {}) {
  if (rec === null || typeof rec !== 'object') return null;
  const missing = D6_FIELDS.filter((f) => rec[f] === undefined);
  const envelopeOk =
    typeof rec.ts === 'string' &&
    rec.level === 'error' &&
    rec.scope === 'diagnostic' &&
    Number.isInteger(rec.pid) &&
    rec.proctype === 'main' &&
    rec.event === PCACHE_EVENT;
  const shapeOk =
    envelopeOk &&
    (rec.guardBytes === null || isHex(rec.guardBytes, 16)) &&
    (rec.headerBytes === null || isHex(rec.headerBytes, 56)) &&
    (rec.pageBytes === null || isHex(rec.pageBytes, 64)) &&
    Array.isArray(rec.words) &&
    typeof rec.reading === 'string' &&
    typeof rec.checker === 'string' &&
    rec.guard === 16;
  const words = Array.isArray(rec.words) ? rec.words.map((w) => String(w)) : [];
  return {
    kind: rec.msg === PAGE_LINE_MSG ? 'page' : rec.msg === BLOCK_LINE_MSG ? 'block' : 'other',
    missing,
    shapeOk,
    check: typeof rec.check === 'string' ? rec.check : null,
    reading: typeof rec.reading === 'string' ? rec.reading : null,
    readingKind: kindOfReading(rec.reading),
    bytesKind: kindFromBytes(rec.guardBytes, rec.headerBytes, rec.bulk),
    guardWhole: rec.guardBytes === GUARD_PATTERN_HEX,
    guardZero: isHex(rec.guardBytes, 16) && allZero(rec.guardBytes),
    guardFreeList: guardIsFreeList(rec.guardBytes),
    guardFill: isHex(rec.guardBytes, 16) && allFill(rec.guardBytes),
    headerZero: isHex(rec.headerBytes, 56) && allZero(rec.headerBytes),
    headerFill: isHex(rec.headerBytes, 56) && allFill(rec.headerBytes),
    // The allocator's fill gives the two page numbers the same 0xcdcdcdcd, which is no intact header (the fix round).
    headerIntact:
      isHex(rec.headerBytes, 56) &&
      !allZero(rec.headerBytes) &&
      !allFill(rec.headerBytes) &&
      Number.isInteger(rec.pageNumber) &&
      rec.pageNumber > 0 &&
      rec.pageNumber === rec.pagerPageNumber,
    wordsMalloc: words.some((w) => w.includes('libsystem_malloc.dylib')),
    database: expandHome(rec.database, home),
    pageNumber: Number.isInteger(rec.pageNumber) ? rec.pageNumber : null,
    walks: Number.isInteger(rec.walks) ? rec.walks : null
  };
}

const countBy = (list) => {
  const out = {};
  for (const o of list) if (Number.isInteger(o.pid)) out[String(o.pid)] = (out[String(o.pid)] ?? 0) + 1;
  return out;
};
const msgOf = (o) => (typeof o.msg === 'string' ? o.msg : '');

/** app.log's lines (app.log.1 first, then app.log), read as records: the checker's lines, the updater's, the notices, by main pid. */
export function appLogOf(lines, { home = null } = {}) {
  const recs = recordsOf(lines);
  const pcache = recs.filter((o) => o.event === PCACHE_EVENT);
  const armed = recs.filter((o) => o.event === ARMED_EVENT);
  const noChecker = recs.filter((o) => o.scope === 'diagnostic' && msgOf(o).includes(NO_CHECKER_LINE));
  const notices = recs.filter((o) => o.event === 'notice.shown');
  const unclean = notices.filter((o) => o.notice === 'unclean-exit');
  const updatesOff = recs.filter((o) => o.scope === 'updates' && msgOf(o).includes(UPDATES_OFF_LINE));
  const kindCount = (k) => recs.filter((o) => o.event === `diagnostic.${k}`).length;
  return {
    lines: recs.length,
    unparsed: recs.filter((o) => o.unparsed === true).length,
    pcache: pcache.length,
    pcacheByPid: countBy(pcache),
    first: pcache.length === 0 ? null : pcacheLineOf(pcache[0], { home }),
    armed: armed.length,
    armedByPid: countBy(armed),
    armedOk: armed.every((o) => o.scope === 'diagnostic' && o.msg === ARMED_MSG && o.guard === 16 && o.installed === true && typeof o.checker === 'string'),
    noChecker: noChecker.length,
    noCheckerByPid: countBy(noChecker),
    diagnosticScope: recs.filter((o) => o.scope === 'diagnostic').length,
    diagnosticEvents: recs.filter((o) => typeof o.event === 'string' && o.event.startsWith('diagnostic.')).length,
    events: { watcher: kindCount('watcher'), terminal: kindCount('terminal'), door: kindCount('door') },
    stopped: recs.filter((o) => o.event === 'manifest.stopped').length,
    unclean: unclean.length,
    uncleanByPid: countBy(unclean),
    updatesOff: updatesOff.length,
    updatesOffByPid: countBy(updatesOff),
    feedAccepted: recs.filter((o) => o.scope === 'updates' && msgOf(o).startsWith(FEED_ACCEPTED_LINE)).length,
    feedAcceptedByPid: countBy(recs.filter((o) => o.scope === 'updates' && msgOf(o).startsWith(FEED_ACCEPTED_LINE))),
    feedRefused: recs.filter((o) => o.scope === 'updates' && msgOf(o).startsWith(FEED_REFUSED_LINE)).length,
    mainPids: [...new Set(recs.filter((o) => o.proctype === 'main' && Number.isInteger(o.pid)).map((o) => o.pid))]
  };
}

/** What the test checker said on stderr: its armed line, its plant, its take, its violations and its SIGSEGV report; and how the process ended, by the shim's line and Phase 36's. */
export function checkerTextOf(text) {
  const t = typeof text === 'string' ? text : '';
  const a = ARMED_LINE.exec(t);
  const p = PLANT_LINE.exec(t);
  const k = TAKE_LINE.exec(t);
  const s = CRASH_SEGV_PARTS.exec(t);
  const sig = SHIM_SIGNAL_LINE.exec(t);
  return {
    armed: a === null ? null : { version: a[1], guard: Number(a[2]), installed: a[3] === '1', plant: a[4], at: Number(a[5]), step: Number(a[6]) },
    plant: p === null ? null : { kind: p[1], check: Number(p[2]), op: p[3], cache: p[4], line: p[5], page: Number(p[6]), file: p[7].trim() },
    // waited and tries since the fix round: the take waits for the allocator to let the freed slot go (sqlite-checker.c tchkTake).
    take: k === null ? null : { kind: k[1], sameSlot: k[2] === '1', waited: k[5] === undefined ? null : Number(k[5]), tries: k[6] === undefined ? null : Number(k[6]) },
    violations: (t.match(/\[p358adv-VIOLATION\]/g) ?? []).length,
    segv:
      s === null
        ? { seen: /\[p358adv-SEGV\]/.test(t), signal: null, address: null, frame: null, offset: null }
        : { seen: true, signal: Number(s[1]), address: s[2], frame: s[3], offset: `0x${s[4]}` },
    shimSignal: sig === null ? null : sig[1],
    wedged: WEDGED_QUIT_LINE.test(t)
  };
}

/** Which code opened a connection, from the tracker's stack, innermost first, read past `openGmuxDatabase` to its caller. */
export function openerOf(stack) {
  for (const frame of Array.isArray(stack) ? stack : []) {
    const f = String(frame);
    for (const [re, name] of OPENERS) if (re.test(f)) return name;
  }
  return null;
}

/** The tracker's lines: every connection, who opened it, whether its close began and whether it returned. */
export function trackerOf(lines) {
  const recs = recordsOf(lines);
  const conns = new Map();
  for (const o of recs) {
    if (o.ev === 'open' && Number.isInteger(o.id)) {
      conns.set(o.id, { id: o.id, file: typeof o.file === 'string' ? o.file : '', readonly: o.readonly === true, opener: openerOf(o.stack), closeStarted: false, closed: false });
    } else if (o.ev === 'close' && conns.has(o.id)) conns.get(o.id).closeStarted = true;
    else if (o.ev === 'closed' && conns.has(o.id)) conns.get(o.id).closed = true;
  }
  return {
    installed: recs.some((o) => o.ev === 'installed'),
    unparsed: recs.filter((o) => o.unparsed === true).length,
    conns: [...conns.values()]
  };
}

/**
 * The connection the checker planted: the file its PLANT line names and the
 * target's read-only flag. A fresh connection dies inside its own life, so of
 * several the one that never finished closing is it; else the one still open;
 * else the last one opened. Null when nothing matches.
 */
export function plantedConnOf(tracker, plantFile, readonly) {
  if (tracker === null || typeof tracker !== 'object' || !Array.isArray(tracker.conns) || typeof plantFile !== 'string') return null;
  const want = readonly === 1 ? true : readonly === 0 ? false : null;
  const cands = tracker.conns.filter((c) => sameFile(c.file, plantFile) && (want === null || c.readonly === want));
  if (cands.length === 0) return null;
  return cands.find((c) => c.closeStarted && !c.closed) ?? cands.find((c) => !c.closeStarted) ?? cands[cands.length - 1];
}

/** The recorder's lines: whether it went in, About's options as main set them, the message boxes main showed, the presses, the quit's events. */
export function recorderOf(lines) {
  const recs = recordsOf(lines);
  const about = [...recs].reverse().find((o) => o.ev === 'about');
  const menu = (ev) => {
    const o = recs.find((x) => x.ev === ev);
    return o === undefined ? { asked: false, pressed: false, label: null } : { asked: true, pressed: o.ok === true, label: typeof o.label === 'string' ? o.label : null };
  };
  return {
    loaded: recs.some((o) => o.ev === 'loaded'),
    hooked: recs.some((o) => o.ev === 'hooked') && !recs.some((o) => o.ev === 'hook-failed'),
    about:
      about === undefined
        ? { read: false, version: null, applicationVersion: null }
        : { read: true, version: typeof about.version === 'string' ? about.version : null, applicationVersion: typeof about.applicationVersion === 'string' ? about.applicationVersion : null },
    dialogs: recs.filter((o) => o.ev === 'dialog').map((o) => ({ message: typeof o.message === 'string' ? o.message : null, detail: typeof o.detail === 'string' ? o.detail : null })),
    dialogsWrapped: recs.some((o) => o.ev === 'dialogs-wrapped' && o.ok === true),
    menuQuit: menu('menu-quit'),
    menuCheck: menu('menu-check'),
    willQuit: recs.some((o) => o.ev === 'will-quit'),
    killOnLine: recs.some((o) => o.ev === 'kill-on-line'),
    unparsed: recs.filter((o) => o.unparsed === true).length
  };
}

/**
 * R's one arm, from the arm app's whole output and its exit code: the
 * Electron it ran in, the armed and plant lines, the arm's own reading
 * (reads, the SQLITE_CORRUPT count, writes, the fresh integrity_check),
 * whether the close returned, and the handler's SIGSEGV report.
 */
export function rArmOf(text, code) {
  const t = typeof text === 'string' ? text : '';
  const c = checkerTextOf(t);
  const e = /P364-ELECTRON (\S+) node (\S+) pid (\d+)/.exec(t);
  const m = /P364-ARM (\{[^\n]*\})/.exec(t);
  let arm = null;
  if (m !== null) {
    try {
      const o = JSON.parse(m[1]);
      const codes = o?.reads?.codes ?? {};
      arm = {
        readsOk: Number.isInteger(o?.reads?.ok) ? o.reads.ok : null,
        corrupt: Number.isInteger(codes.SQLITE_CORRUPT) ? codes.SQLITE_CORRUPT : 0,
        readsFailed: Object.values(codes).reduce((n, v) => n + (Number.isInteger(v) ? v : 0), 0),
        writesOk: Number.isInteger(o?.writes?.ok) ? o.writes.ok : null,
        fresh: typeof o?.freshIntegrity === 'string' ? o.freshIntegrity : null
      };
    } catch {
      arm = null;
    }
  }
  return {
    electron: e === null ? null : e[1],
    armed: c.armed === null ? null : c.armed.plant,
    installed: c.armed?.installed === true,
    planted: c.plant !== null,
    arm,
    closed: t.includes('P364-ARM-CLOSED'),
    code: Number.isInteger(code) ? code : null,
    segv: { seen: c.segv.seen, frame: c.segv.frame, address: c.segv.address, offset: c.segv.offset }
  };
}

/** R's reading, composed from its two launches. */
export function composeR({ cs, pz, expected, dumps }) {
  const a = rArmOf(cs?.text, cs?.code);
  const b = rArmOf(pz?.text, pz?.code);
  const strip = (x) => ({ armed: x.armed, planted: x.planted, arm: x.arm, code: x.code, closed: x.closed, segv: x.segv });
  return {
    electron: { version: a.electron !== null && a.electron === b.electron ? a.electron : null, expected: typeof expected === 'string' ? expected : null },
    cs: strip(a),
    pz: strip(b),
    dumps: Number.isInteger(dumps) ? dumps : null
  };
}

/**
 * A planted launch's reading (M1, M2a, M2b), from what it left: the checker's
 * stderr (`text`), the process's end (`code`, `signal`), app.log, the tracker's
 * and the recorder's lines, the Crashpad dumps counted, and the agents' answer.
 * `target` is an M2B_TARGETS row; `manifest`, when given, is the arm's own
 * session list, which the plant's file must be.
 */
export function composePlanted({ kind, target, manifest = null, home = null, text = '', code = null, signal = null, appLogLines = [], trackerLines = null, recorderLines = [], dumps = null, agents = null }) {
  const c = checkerTextOf(text);
  const al = appLogOf(appLogLines, { home });
  const plantFile = c.plant === null ? null : expandHome(c.plant.file, home);
  const fileIsTarget = plantFile !== null && plantFile.includes(target.file) && (manifest === null || sameFile(plantFile, manifest));
  const tracker = trackerLines === null ? null : trackerOf(trackerLines);
  const conn = tracker === null ? null : plantedConnOf(tracker, plantFile, target.readonly);
  const line = al.first;
  const rec = recorderOf(recorderLines);
  return {
    agents: agents ?? { overlay: false, window: false, ok: null },
    hook: { armed: c.armed === null ? null : c.armed.plant, installed: c.armed?.installed === true },
    plant: { landed: c.plant !== null && c.plant.kind === kind, fileIsTarget },
    take: { seen: c.take !== null, sameSlot: c.take === null ? null : c.take.sameSlot, waited: c.take?.waited ?? null, tries: c.take?.tries ?? null },
    tracker: {
      installed: tracker !== null && tracker.installed === true,
      targetOpened: tracker !== null && tracker.conns.some((x) => x.opener === target.opener && x.file.includes(target.file)),
      plantedOpener: conn === null ? null : conn.opener,
      plantedCloseStarted: conn === null ? null : conn.closeStarted,
      plantedClosed: conn === null ? null : conn.closed
    },
    appLog: { pcache: al.pcache, stopped: al.stopped, armed: al.armed, noChecker: al.noChecker },
    line:
      line === null
        ? { kind: null, missing: [...D6_FIELDS], shapeOk: false, readingKind: null, bytesKind: null, databaseIsTarget: false, guardFreeList: false, guardFill: false, guardZero: false, headerZero: false, headerFill: false, headerIntact: false, wordsMalloc: false }
        : {
            kind: line.kind,
            missing: line.missing,
            shapeOk: line.shapeOk,
            readingKind: line.readingKind,
            bytesKind: line.bytesKind,
            databaseIsTarget: plantFile !== null && sameFile(line.database, plantFile) && String(line.database).includes(target.file),
            guardFreeList: line.guardFreeList,
            guardFill: line.guardFill,
            guardZero: line.guardZero,
            headerZero: line.headerZero,
            headerFill: line.headerFill,
            headerIntact: line.headerIntact,
            wordsMalloc: line.wordsMalloc
          },
    exit: {
      code: Number.isInteger(code) ? code : null,
      signal: typeof signal === 'string' ? signal : c.shimSignal,
      segv: c.segv.seen,
      segvFrame: c.segv.frame,
      segvAddress: c.segv.address,
      wedged: c.wedged
    },
    recorder: { hooked: rec.hooked, willQuit: rec.willQuit, quitPressed: rec.menuQuit.pressed, killOnLine: rec.killOnLine },
    dumps: Number.isInteger(dumps) ? dumps : null
  };
}

/** Two id lists as sets: every id of one is in the other and neither has one the other lacks. */
export function sameIdSet(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0) return false;
  const A = new Set(a);
  const B = new Set(b);
  return A.size === B.size && [...A].every((x) => B.has(x));
}

/** The median of the finite numbers in a list, or null. */
export function median(xs) {
  const s = (Array.isArray(xs) ? xs : []).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (s.length === 0) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * C's summary over its runs (SPEC §8: ABAB, the normal package first; no
 * median worse by more than the normal build's own spread, the spread being
 * its slowest run less its fastest).
 */
export function composeCost(runs, { want = COST_RUNS_DEFAULT } = {}) {
  const rs = Array.isArray(runs) ? runs : [];
  const normal = rs.filter((r) => r.app === 'normal');
  const diag = rs.filter((r) => r.app === 'diagnostic');
  const metric = (k) => {
    const n = normal.map((r) => r[k]).filter((x) => Number.isFinite(x));
    const d = diag.map((r) => r[k]).filter((x) => Number.isFinite(x));
    if (n.length === 0 || d.length === 0) return { normalMedian: null, diagMedian: null, spread: null, worseBy: null, within: false };
    const nm = median(n);
    const dm = median(d);
    // Both sides to a millionth, so a tie (1.8 - 1.7 against 1.8 - 1.7) is never read as worse.
    const r6 = (x) => Math.round(x * 1e6) / 1e6;
    const spread = r6(Math.max(...n) - Math.min(...n));
    const worseBy = r6(dm - nm);
    return { normalMedian: nm, diagMedian: dm, spread, worseBy, within: worseBy <= spread };
  };
  return {
    summary: {
      want,
      normal: normal.length,
      diag: diag.length,
      alternated: rs.length >= 2 && rs.every((r, i) => r.app === (i % 2 === 0 ? 'normal' : 'diagnostic')),
      rowsAll: rs.length > 0 && rs.every((r) => Number.isInteger(r.rows) && r.rows > 0 && r.rows === rs[0].rows),
      agentsAll: rs.length > 0 && rs.every((r) => r.agentsOk === true),
      metrics: { drawnMs: metric('drawnMs'), refreshMedianMs: metric('refreshMedianMs'), rssKB: metric('rssKB'), quitMs: metric('quitMs') },
      quitAllSigkill: rs.length > 0 && rs.every((r) => r.quitSignal === 'SIGKILL')
    }
  };
}

/** The steady RSS of one churn: the median of the samples in its second half (KB), or null. */
export function steadyRss(samples) {
  const kb = (Array.isArray(samples) ? samples : []).map((s) => (typeof s === 'object' && s !== null ? s.kb : s)).filter((x) => Number.isFinite(x) && x > 0);
  if (kb.length === 0) return null;
  return median(kb.slice(Math.floor(kb.length / 2)));
}
/** M2c's RSS verdict: the diagnostic build's steady RSS against the normal build's, under the same churn. */
export function composeRss(diagSamples, normalSamples, slack = RSS_SLACK) {
  const d = steadyRss(diagSamples);
  const n = steadyRss(normalSamples);
  const ratio = d === null || n === null ? null : Math.round((d / n) * 10_000) / 10_000;
  return { rss: { diagKB: d, normalKB: n, ratio, within: ratio !== null && ratio <= 1 + slack } };
}

/**
 * One side of U, from what its launch left: the recorder's press of "Check for
 * Updates…" and the last message box main showed (recorded, never drawn), and
 * app.log's updater lines (the off line; the rehearsal feed taken and never
 * refused). `fields` carries what the run measured itself (its time, the feed's
 * count, the bundle's app-update.yml).
 */
export function composeUSide({ side, fields = {}, recorderLines = [], appLogLines = [] }) {
  const rec = recorderOf(recorderLines);
  const al = appLogOf(appLogLines);
  return {
    [side]: {
      ...fields,
      pressed: rec.menuCheck.pressed,
      dialogsWrapped: rec.dialogsWrapped,
      dialog: rec.dialogs.length === 0 ? null : rec.dialogs[rec.dialogs.length - 1],
      updatesOff: al.updatesOff,
      overrideAccepted: al.feedAccepted > 0 && al.feedRefused === 0
    }
  };
}

/** Whether `nm -u`'s output names `_sigaction` among the module's imports (D8, D10). */
export function nmImportsSigaction(stdout) {
  return /(?:^|\s)_sigaction(?:\s|$)/m.test(typeof stdout === 'string' ? stdout : '');
}

/** How many times `needle` occurs in a module's bytes (D8: `P358ADV`, `[p358adv-`; the checker's own strings). */
export function occurrences(bytes, needle) {
  const b = Buffer.isBuffer(bytes) ? bytes : Buffer.from(typeof bytes === 'string' ? bytes : '', 'latin1');
  let n = 0;
  for (let at = b.indexOf(needle); at !== -1; at = b.indexOf(needle, at + 1)) n += 1;
  return n;
}

/** The reports a launch added to his folder, by name and mtime only, and which of them a Tortie or an Electron process wrote. */
export function reportsAddedOf(before, after) {
  if (!Array.isArray(before) || !Array.isArray(after)) return { read: false, added: [], ours: 0 };
  const was = new Set(before);
  const added = after.filter((x) => !was.has(x));
  const ours = added.filter((x) => /^(?:Retired\/)?(?:Tortie|Electron)[-_. ]/.test(String(x))).length;
  return { read: true, added, ours };
}

/**
 * RUN's socket reading (probe:p357's, by value): only THIS run's socket, and a
 * socket FILE is not a server (tmux 3.7b keeps the file after kill-server), so
 * a socket is LEFT only when a server still answers on it.
 */
export function socketsLeftOf(names, socket, answers) {
  if (!Array.isArray(names) || typeof socket !== 'string' || socket === '') return { read: false, left: null };
  return { read: true, left: names.filter((n) => n === socket).filter((n) => answers(n) === true).length };
}

/**
 * The feed guard's reading of app.log for ONE launch, by its main pid:
 * 'accepted' when that process's updater took the loopback feed, 'off' when it
 * said updates are off, else null. THE PROBE REVIEW (2026-11-09): the guard
 * read the whole file, so on a profile a launch reuses (M1's relaunch) an
 * earlier launch's answer counted as this one's.
 */
export function ownFeedAnswer(lines, pid) {
  const al = appLogOf(lines);
  const k = String(pid);
  if ((al.feedAcceptedByPid[k] ?? 0) > 0) return 'accepted';
  if ((al.updatesOffByPid[k] ?? 0) > 0) return 'off';
  return null;
}

/** A normal packaged app's first update check, this long after its updater starts (src/main/updates/updater.ts:132, FIRST_CHECK_DELAY_MS). */
export const FIRST_CHECK_MS = 30_000;
/**
 * RUN's feed reading, pure over the launches' bookkeeping: how many packaged
 * launches could have asked a real update host. A launch is guarded when its
 * app.log said the loopback feed was taken or that updates are off, when it
 * ended by itself before the guard's deadline, when it never started, or when
 * the guard ended it AND it was SEEN to end before the first check could run.
 * THE PROBE REVIEW (2026-11-09): 'ended' alone counted as guarded, and it is
 * the guard's attempt (the recorder's kill-self, then killOwn), not its
 * effect, so a kill that did not take read as guarded and this clause could
 * not fire in any live run.
 */
export function feedUnguardedOf(launches, firstCheckMs = FIRST_CHECK_MS) {
  const safe = (l) =>
    ['accepted', 'off', 'exited', 'never-started'].includes(l?.feedHeld) ||
    (l?.feedHeld === 'ended' && Number.isFinite(l?.feedEndedMs) && l.feedEndedMs < firstCheckMs);
  return (Array.isArray(launches) ? launches : []).filter((l) => l?.packaged === true && !safe(l)).length;
}

/** p349's history rule, by value: unmoved, held, his terminal, or unread. */
export function historyHeld(history) {
  if (history?.before === history?.after) return 'unmoved';
  if (history?.quiet === null || history?.quiet === undefined || typeof history.quiet.again !== 'string') return 'unread';
  return history.quiet.again !== history.after ? 'his terminal' : 'held';
}

/** The pure functions --grader-self-test asks directly (its `readerChecks`). */
export const READERS = Object.freeze({ kindFromBytes, kindOfReading, guardIsFreeList, openerOf, sameFile, expandHome, median, steadyRss, sameIdSet, historyHeld, nmImportsSigaction, occurrences, feedUnguardedOf, ownFeedAnswer, plantedConnOf: (lines, file, ro) => plantedConnOf(trackerOf(lines), file, ro) });
/** The composers --grader-self-test drives over raw fixtures, by name. */
export const COMPOSERS = Object.freeze({
  R: (i) => composeR(i),
  planted: (i) => composePlanted({ ...i, target: M2B_TARGETS[i.targetId] }),
  cost: (i) => composeCost(i.runs, i.options),
  rss: (i) => composeRss(i.diag, i.normal),
  uSide: (i) => composeUSide(i),
  appLog: (i) => ({ appLog: appLogOf(i.lines, { home: i.home ?? null }) }),
  reports: (i) => ({ reports: reportsAddedOf(i.before, i.after) })
});

// ---------------------------------------------------------------------------
// The graders (pure, over a reading): used live and in --grader-self-test
// ---------------------------------------------------------------------------

const AGENTS_WINDOW_NEED = ['the window came and agents:list resolved nothing but the run’s stand-ins', (r) => r.agents.overlay === true && r.agents.window === true && r.agents.ok === true];
const AGENTS_ANY_NEED = [
  'every probed agent row was hidden before the launch, and where the window came agents:list resolved nothing but the run’s stand-ins',
  (r) => r.agents.overlay === true && (r.agents.window === false || r.agents.ok === true)
];
const HOOK_NEED = (kind) => ['the hook loaded the test variant into main, armed with this arm’s plant (its own ARMED line)', (r) => r.hook.installed === true && r.hook.armed === kind];
const PLANTED_NEED = (target) => [
  'the checker planted in the target connection: its PLANT line names the target’s file, and the tracker names the target’s opener for that connection',
  (r) => r.plant.landed === true && r.plant.fileIsTarget === true && r.tracker.installed === true && r.tracker.plantedOpener === target.opener
];
const TARGET_OPENED_NEED = ['the target connection opened in this run: the tracker saw its own opener open it', (r) => r.tracker.targetOpened === true];
const TAKE_NEED = ['the take landed in the freed line’s own slot (its TAKE line says same-slot=1)', (r) => r.take.seen === true && r.take.sameSlot === true];
const NOT_WEDGED_NEED = ['the quit did not take Phase 36’s wedged-watcher escape, so its SIGKILL is the will-quit handler’s', (r) => r.quit.wedged === false];
const PRESSED_NEED = ['the recorder went in and pressed the menu’s Quit row', (r) => r.recorder.hooked === true && r.quit.pressed === true];

const ONE_LINE_CLAUSE = [
  'ONE diagnostic.pcache line in app.log: a page line with every D6 field, in app.log’s envelope',
  (r) => r.appLog.pcache === 1 && r.line.kind === 'page' && Array.isArray(r.line.missing) && r.line.missing.length === 0 && r.line.shapeOk === true
];
const LINE_TARGET_CLAUSE = ['the line names the planted connection’s own database', (r) => r.line.databaseIsTarget === true];
const READING_CLAUSE = (kind) => ['its reading is research 143 §5’s for this plant', (r) => EXPECT_KIND[kind].includes(r.line.readingKind)];
const BYTES_CLAUSE = (kind) => ['the probe’s own reading of the guard and header bytes says the same', (r) => EXPECT_KIND[kind].includes(r.line.bytesKind)];
/**
 * A plant that allows two readings (the fix round): the C's and the probe's own, each one the plant allows, must be
 * the SAME one. Asked only where both are allowed, so each of the three clauses can be shown red alone.
 */
const AGREE_CLAUSE = (kind) => [
  'the C’s reading and the probe’s own reading of the bytes, each one this plant allows, are the same one',
  (r) => !EXPECT_KIND[kind].includes(r.line.readingKind) || !EXPECT_KIND[kind].includes(r.line.bytesKind) || r.line.readingKind === r.line.bytesKind
];
const QUIT_CLAUSE = [
  'the quit, pressed on the menu’s Quit row, reached will-quit and ended by its SIGKILL, with no fault',
  (r) => r.quit.willQuit === true && r.quit.signal === 'SIGKILL' && r.quit.segv === false
];
const NO_DUMP_CLAUSE = ['no Crashpad dump under the scratch profile', (r) => r.dumps === 0];
const PLANTED_READS = ['agents.overlay', 'agents.window', 'agents.ok', 'hook.installed', 'hook.armed', 'plant.landed', 'plant.fileIsTarget', 'tracker.installed', 'tracker.plantedOpener'];
const LINE_READS = ['appLog.pcache', 'line.kind', 'line.missing', 'line.shapeOk', 'line.databaseIsTarget'];

/** M2a's grader for one plant (SPEC §8, §2.3's rows). */
function m2aGrader(kind) {
  const target = M2B_TARGETS['session-list'];
  const specific = {
    // The fix round: in Tortie's running main process a free leaves the allocator's fill (0xcd) over the guard and
    // the header while the allocator holds the slot back, and a free-list entry over the fill once it lets it go;
    // research 143 §2.2's "header intact" was a bare app's, with no window (both lenses measured the fill).
    'foreign-free': [
      ['line.guardFreeList', 'line.guardFill', 'line.headerFill', 'line.headerIntact'],
      [
        'the guard holds a free-list entry (its two words each other’s inverse) over a header that is intact or the allocator’s fill, or the guard and the header both hold the allocator’s fill for freed memory (0xcd)',
        (r) => (r.line.guardFreeList === true && (r.line.headerIntact === true || r.line.headerFill === true)) || (r.line.guardFill === true && r.line.headerFill === true)
      ]
    ],
    'zero-take': [['line.guardZero', 'line.headerZero'], ['the guard and the header are all zeros', (r) => r.line.guardZero === true && r.line.headerZero === true]],
    'stray-write': [['line.wordsMalloc'], ['words names libsystem_malloc.dylib, the pointer written over the guard', (r) => r.line.wordsMalloc === true]]
  }[kind];
  return {
    title: `Method 2: ${kind} in the session list’s own connection, read back as research 143 §5 says (${EXPECT_KIND[kind].map((k) => READINGS[k]).join('; or ')})`,
    family: 'M2a',
    reads: [...PLANTED_READS, ...(kind === 'zero-take' ? ['take.seen', 'take.sameSlot'] : []), ...LINE_READS, 'line.readingKind', 'line.bytesKind', ...specific[0], 'dumps'],
    needs: [AGENTS_ANY_NEED, HOOK_NEED(kind), PLANTED_NEED(target), ...(kind === 'zero-take' ? [TAKE_NEED] : [])],
    clauses: [ONE_LINE_CLAUSE, READING_CLAUSE(kind), BYTES_CLAUSE(kind), ...(EXPECT_KIND[kind].length > 1 ? [AGREE_CLAUSE(kind)] : []), LINE_TARGET_CLAUSE, specific[1], NO_DUMP_CLAUSE]
  };
}

/**
 * M2b's grader for one connection (SPEC §8): one line naming its database; a fresh one's close faults after it.
 * THE PROBE REVIEW (2026-11-09, docs/method/HOW-WE-BUILT-THIS.md rule 9): the fresh clause read only that the
 * planted connection never FINISHED closing and that the handler ended the process, so a fault anywhere else (a
 * close that never began, the walk itself, another connection) passed as "its close faults". It now reads that the
 * planted connection's close BEGAN and never returned, and that the handler's own line names his frame and address
 * (pcache1EnforceMaxPage through 0x34, research 143 §2.1), as R does.
 */
function m2bGrader(id) {
  const target = M2B_TARGETS[id];
  const ending = target.fresh
    ? [
        [
          'the connection faulted after its line, inside its own close (the tracker saw that close begin and never return), in pcache1EnforceMaxPage reading through 0x34, ended by the handler’s exit 139',
          (r) => r.tracker.plantedCloseStarted === true && r.tracker.plantedClosed === false && r.exit.code === 139 && r.exit.segv === true && r.exit.segvFrame === CRASH_FRAME && r.exit.segvAddress === CRASH_ADDRESS
        ],
        NO_DUMP_CLAUSE
      ]
    : [['no fault after the line: the process ended by a SIGKILL (the probe’s on the line, or the will-quit’s), never by the handler, and no Crashpad dump', (r) => r.exit.signal === 'SIGKILL' && r.exit.segv === false && r.dumps === 0]];
  return {
    title: `Method 2: the crash state in ${id} (${target.where}): one line naming its database${target.fresh ? ', written before its close faults' : ''}`,
    family: target.fresh ? 'M2b-fresh' : 'M2b-held',
    reads: [...PLANTED_READS, 'tracker.targetOpened', ...(target.fresh ? ['tracker.plantedCloseStarted', 'tracker.plantedClosed', 'exit.code', 'exit.segvFrame', 'exit.segvAddress'] : ['exit.signal']), 'exit.segv', ...LINE_READS, 'dumps'],
    needs: [AGENTS_ANY_NEED, HOOK_NEED('crash-state'), TARGET_OPENED_NEED, PLANTED_NEED(target)],
    clauses: [ONE_LINE_CLAUSE, LINE_TARGET_CLAUSE, ...ending]
  };
}

/** The families --grader-self-test expands a `family` fixture over. */
export const FAMILIES = Object.freeze({
  M2a: Object.freeze(M2A_KINDS.map((k) => `M2a-${k}`)),
  'M2b-held': Object.freeze(M2B_TARGET_IDS.filter((id) => !M2B_TARGETS[id].fresh).map((id) => `M2b-${id}`)),
  'M2b-fresh': Object.freeze(M2B_TARGET_IDS.filter((id) => M2B_TARGETS[id].fresh).map((id) => `M2b-${id}`)),
  M2b: Object.freeze(M2B_TARGET_IDS.map((id) => `M2b-${id}`))
});

export const GRADERS = {
  R: {
    title: 'the reproduction in Electron 43.8.7’s main process: crash-state faults at its close in pcache1EnforceMaxPage reading through 0x34, exit 139; page-zero raises 10 SQLITE_CORRUPT and closes clean, exit 0',
    reads: ['electron.version', 'electron.expected', 'cs.armed', 'cs.planted', 'cs.arm', 'cs.code', 'cs.closed', 'cs.segv.seen', 'cs.segv.frame', 'cs.segv.address', 'pz.armed', 'pz.planted', 'pz.arm', 'pz.code', 'pz.closed', 'pz.segv.seen', 'dumps'],
    needs: [
      ['both arms ran in this checkout’s Electron, read from the arm app’s own line', (r) => typeof r.electron.version === 'string' && r.electron.version === r.electron.expected],
      ['the test variant armed crash-state in one launch and page-zero in the other (each its own ARMED line)', (r) => r.cs.armed === 'crash-state' && r.pz.armed === 'page-zero'],
      ['the checker planted in each launch (its own PLANT line)', (r) => r.cs.planted === true && r.pz.planted === true],
      ['each arm printed its reading before its end', (r) => r.cs.arm !== null && typeof r.cs.arm === 'object' && r.pz.arm !== null && typeof r.pz.arm === 'object']
    ],
    clauses: [
      ['crash-state: 40 of 40 reads and 2 of 2 writes answered, and a fresh connection’s integrity_check read ok', (r) => r.cs.arm.readsOk === 40 && r.cs.arm.readsFailed === 0 && r.cs.arm.writesOk === 2 && r.cs.arm.fresh === 'ok'],
      ['crash-state: the close faulted in pcache1EnforceMaxPage reading through 0x34 (the handler’s own line)', (r) => r.cs.segv.seen === true && r.cs.segv.frame === CRASH_FRAME && r.cs.segv.address === CRASH_ADDRESS],
      ['crash-state: the process exited 139 and its close never returned', (r) => r.cs.code === 139 && r.cs.closed === false],
      ['page-zero: 10 reads raised SQLITE_CORRUPT and 30 answered, 2 of 2 writes, and a fresh connection’s integrity_check read ok', (r) => r.pz.arm.corrupt === 10 && r.pz.arm.readsFailed === 10 && r.pz.arm.readsOk === 30 && r.pz.arm.writesOk === 2 && r.pz.arm.fresh === 'ok'],
      ['page-zero: the close returned and the process exited 0, with no fault', (r) => r.pz.closed === true && r.pz.code === 0 && r.pz.segv.seen === false],
      ['no Crashpad dump under either scratch profile', (r) => r.dumps === 0]
    ]
  },
  M1n: {
    title: 'Method 1’s other side: the normal app (the parent’s when given), the same world and no checker: no diagnostic line of any kind, About says no Diagnostic, and the same quit',
    reads: ['agents.overlay', 'agents.window', 'agents.ok', 'recorder.hooked', 'seeded.listed', 'list.ok', 'list.count', 'appLog.lines', 'appLog.diagnosticScope', 'appLog.diagnosticEvents', 'about.read', 'about.version', 'quit.pressed', 'quit.willQuit', 'quit.signal', 'quit.segv', 'quit.wedged'],
    needs: [
      AGENTS_WINDOW_NEED,
      PRESSED_NEED,
      ['the window listed every row the seed wrote (his shape)', (r) => Number.isInteger(r.seeded.listed) && r.seeded.listed > 0 && r.list.ok === true && r.list.count === r.seeded.listed],
      ['app.log was written, so its silence can be read', (r) => Number.isInteger(r.appLog.lines) && r.appLog.lines > 0],
      ['About’s options were read from main', (r) => r.about.read === true],
      NOT_WEDGED_NEED
    ],
    clauses: [
      ['no diagnostic line of any kind: no record of scope diagnostic and no diagnostic.* event', (r) => r.appLog.diagnosticScope === 0 && r.appLog.diagnosticEvents === 0],
      ['About’s version line says no Diagnostic', (r) => typeof r.about.version === 'string' && !r.about.version.includes('Diagnostic')],
      QUIT_CLAUSE
    ]
  },
  M1: {
    title: 'Method 1: the diagnostic app with the test variant, his shape, the crash state in the session list’s own connection: one line with every field, no read failed, the menu’s Quit by the will-quit SIGKILL, and the relaunch keeps every row',
    reads: [...PLANTED_READS, 'recorder.hooked', 'seeded.listed', ...LINE_READS, 'line.readingKind', 'line.bytesKind', 'appLog.stopped', 'listAfterPlant.ok', 'listAfterPlant.count', 'quit.pressed', 'quit.willQuit', 'quit.signal', 'quit.segv', 'quit.wedged', 'relaunch.ran', 'relaunch.sameIds', 'relaunch.pcache', 'relaunch.unclean'],
    needs: [
      AGENTS_WINDOW_NEED,
      HOOK_NEED('crash-state'),
      PRESSED_NEED,
      PLANTED_NEED(M2B_TARGETS['session-list']),
      ['the seed wrote his shape', (r) => Number.isInteger(r.seeded.listed) && r.seeded.listed > 0],
      ['the relaunch on that profile ran: the diagnostic app with no plant', (r) => r.relaunch.ran === true],
      NOT_WEDGED_NEED
    ],
    clauses: [
      ONE_LINE_CLAUSE,
      ['its reading is the one the crash state dictates, and the probe’s own reading of its guard and header bytes says the same', (r) => EXPECT_KIND['crash-state'].includes(r.line.readingKind) && r.line.bytesKind === r.line.readingKind],
      LINE_TARGET_CLAUSE,
      ['no read failed: the session list never stopped, and the window listed every seeded row after the plant', (r) => r.appLog.stopped === 0 && r.listAfterPlant.ok === true && r.listAfterPlant.count === r.seeded.listed],
      QUIT_CLAUSE,
      ['the relaunch listed every row with the same ids, wrote no diagnostic.pcache line and posted no unclean-exit notice', (r) => r.relaunch.sameIds === true && r.relaunch.pcache === 0 && r.relaunch.unclean === 0]
    ]
  },
  ...Object.fromEntries(M2A_KINDS.map((k) => [`M2a-${k}`, m2aGrader(k)])),
  ...Object.fromEntries(M2B_TARGET_IDS.map((id) => [`M2b-${id}`, m2bGrader(id)])),
  U: {
    title: 'the update feed: the normal app asks the loopback feed, and the diagnostic app asks it 0 times and answers §5’s sentence',
    reads: ['normal.ranMs', 'normal.pressed', 'normal.overrideAccepted', 'normal.requests', 'diag.ranMs', 'diag.pressed', 'diag.dialogsWrapped', 'diag.requests', 'diag.dialog', 'diag.updatesOff'],
    needs: [
      ['both launches ran 45 s past their start and pressed "Check for Updates…" on its menu row', (r) => r.normal.ranMs >= U_WAIT_MS && r.diag.ranMs >= U_WAIT_MS && r.normal.pressed === true && r.diag.pressed === true],
      ['the recorder’s message-box wrap took in the diagnostic launch, so a box main shows is read and never drawn', (r) => r.diag.dialogsWrapped === true],
      ['the normal app took the loopback feed (its own line), so no launch here asked a real host', (r) => r.normal.overrideAccepted === true],
      ['the normal app asked the loopback feed at least once: the instrument works', (r) => Number.isInteger(r.normal.requests) && r.normal.requests >= 1]
    ],
    clauses: [
      ['the diagnostic app asked the feed 0 times, over 45 s and the press', (r) => r.diag.requests === 0],
      ['"Check for Updates…" answered §5’s sentence, its title and its body, read from main', (r) => r.diag.dialog !== null && typeof r.diag.dialog === 'object' && r.diag.dialog.message === UPDATES_OFF_TITLE && r.diag.dialog.detail === UPDATES_OFF_BODY],
      ['app.log says updates are off in this diagnostic build, once', (r) => r.diag.updatesOff === 1]
    ]
  },
  /**
   * THE PROBE REVIEW (2026-11-09): this was U's clause "the diagnostic app holds no app-update.yml", and over the
   * inputs SPEC §8 names (two `--dir` packages) it could not fire: electron-builder writes no app-update.yml into a
   * `--dir` build, normal or diagnostic (the integrator measured three such apps, SPEC §As built item 4), so the
   * diagnostic app's file was absent whatever its build did. It is graded only beside its control now, from U's own
   * launches, and asked by name (`P364_ARMS=U,U-feed-file`) with DMG-built apps; a `--dir` pair reads UNREADABLE.
   */
  'U-feed-file': {
    title: 'the update feed file: the diagnostic app holds no app-update.yml where the normal app beside it holds one',
    reads: ['normal.appUpdateYml', 'diag.appUpdateYml'],
    needs: [
      ['the normal app holds an app-update.yml, so its absence in the diagnostic app can be read (electron-builder writes none into a --dir build, normal or diagnostic)', (r) => r.normal.appUpdateYml === true]
    ],
    clauses: [['the diagnostic app holds no app-update.yml', (r) => r.diag.appUpdateYml === false]]
  },
  P: {
    title: 'the packaged diagnostic itself: its module is the built diagnostic .node with no plant in it, About says Diagnostic, the bundle id is his app’s, and every launch armed the checker',
    reads: ['node.found', 'node.sha256', 'node.expectedSha256', 'node.shippedSha256', 'node.plantStrings', 'node.plantLines', 'node.nm.ran', 'node.nm.sigaction', 'node.checkerStrings', 'about.read', 'about.version', 'about.applicationVersion', 'about.packageVersion', 'bundleId', 'launches.count', 'launches.armedOnce', 'launches.noChecker'],
    needs: [
      ['the packed better-sqlite3 module was found and read', (r) => r.node.found === true && typeof r.node.sha256 === 'string'],
      ['P364_DIAG_NODE named the built diagnostic .node to hold it to', (r) => typeof r.node.expectedSha256 === 'string' && r.node.expectedSha256 !== ''],
      ['nm -u ran on the packed module', (r) => r.node.nm.ran === true],
      ['About’s options were read from main in a diagnostic launch', (r) => r.about.read === true],
      ['at least one diagnostic launch’s app.log was read', (r) => Number.isInteger(r.launches.count) && r.launches.count >= 1]
    ],
    clauses: [
      ['the packed module is the built diagnostic .node byte for byte (sha256), not the shipped prebuild', (r) => r.node.sha256 === r.node.expectedSha256 && r.node.sha256 !== r.node.shippedSha256],
      ['D8: it holds no P358ADV and no [p358adv- string, and imports no sigaction', (r) => r.node.plantStrings === 0 && r.node.plantLines === 0 && r.node.nm.sigaction === false],
      ['it holds the checker: TORTIE_CHECKER, diagnostic.pcache and the guard pattern', (r) => r.node.checkerStrings === true],
      ['About reads the version then "<sha> Diagnostic": app.getVersion() is package.json’s version and the stamp ends with " Diagnostic"', (r) => r.about.applicationVersion === r.about.packageVersion && typeof r.about.version === 'string' && r.about.version.endsWith(ABOUT_MARK)],
      ['every diagnostic launch logged diagnostic.armed once, and none logged that it has no page-cache checker', (r) => r.launches.armedOnce === r.launches.count && r.launches.noChecker === 0],
      ['the bundle id is com.itavero.tortie, his app’s own', (r) => r.bundleId === BUNDLE_ID]
    ]
  },
  C: {
    title: 'the cost on his shape, ABAB: no diagnostic median worse by more than the normal build’s own spread, and every quit by the SIGKILL',
    reads: ['summary.want', 'summary.normal', 'summary.diag', 'summary.alternated', 'summary.rowsAll', 'summary.agentsAll', 'summary.metrics.drawnMs.within', 'summary.metrics.refreshMedianMs.within', 'summary.metrics.rssKB.within', 'summary.metrics.quitMs.within', 'summary.quitAllSigkill'],
    needs: [
      ['the asked runs of each build, alternated ABAB with the normal package first', (r) => r.summary.normal === r.summary.want && r.summary.diag === r.summary.want && r.summary.alternated === true],
      ['every run listed his shape’s rows, the same count, and held the agents', (r) => r.summary.rowsAll === true && r.summary.agentsAll === true]
    ],
    clauses: [
      ['the list drawn: the diagnostic median no worse than the normal median by more than the normal’s spread', (r) => r.summary.metrics.drawnMs.within === true],
      ['a refresh: the diagnostic median no worse than the normal median by more than the normal’s spread', (r) => r.summary.metrics.refreshMedianMs.within === true],
      ['main’s RSS: the diagnostic median no worse than the normal median by more than the normal’s spread', (r) => r.summary.metrics.rssKB.within === true],
      ['the quit: the diagnostic median no worse than the normal median by more than the normal’s spread', (r) => r.summary.metrics.quitMs.within === true],
      ['every quit, both builds, ended by the will-quit SIGKILL', (r) => r.summary.quitAllSigkill === true]
    ]
  },
  M2c: {
    title: 'load: P364_CHURN_MIN minutes of churn on each development build (20 unless asked; the run prints the minutes it ran), projects, shells, the phone and a watched folder: no line, no fault, and main’s RSS within 5 % of the normal build’s under the same churn',
    reads: ['minutes', 'diag.ran', 'diag.endedEarly', 'diag.minutes', 'diag.churn.projects', 'diag.churn.shells', 'diag.churn.phoneReads', 'diag.churn.fileOps', 'diag.agentsOk', 'diag.armed', 'diag.pcache', 'diag.segv', 'diag.signal', 'diag.dumps', 'normal.ran', 'normal.minutes', 'normal.churn.projects', 'normal.churn.shells', 'normal.churn.phoneReads', 'normal.churn.fileOps', 'normal.agentsOk', 'rss.ratio', 'rss.within'],
    needs: [
      [
        'both builds churned their full minutes (projects opened and closed, shells created and ended, the phone paired and read, files churned under a watch), or the diagnostic build ended under its churn, which the fault clause reads',
        (r) => {
          const full = (b) => b.ran === true && b.minutes >= r.minutes && b.churn.projects > 0 && b.churn.shells > 0 && b.churn.phoneReads > 0 && b.churn.fileOps > 0;
          return full(r.normal) && (full(r.diag) || r.diag.endedEarly === true);
        }
      ],
      ['agents:list resolved nothing but the stand-ins in both launches', (r) => r.diag.agentsOk === true && r.normal.agentsOk === true],
      ['the diagnostic build armed its checker (its own diagnostic.armed line)', (r) => r.diag.armed === 1],
      ['RSS was sampled in both, so the ratio can be read', (r) => typeof r.rss.ratio === 'number' && Number.isFinite(r.rss.ratio)]
    ],
    clauses: [
      ['no diagnostic.pcache line in the diagnostic build’s churn', (r) => r.diag.pcache === 0],
      ['no fault: it ran its whole churn to its quit, which ended by the will-quit SIGKILL, and no Crashpad dump was written', (r) => r.diag.endedEarly === false && r.diag.segv === false && r.diag.signal === 'SIGKILL' && r.diag.dumps === 0],
      ['main’s RSS within 5 % of the normal build’s under the same churn', (r) => r.rss.within === true]
    ]
  },
  RUN: {
    title: 'the census held, every pid ended, the socket gone, no report of ours in his folder, every dump deleted, no real Tailscale or update host, his history unmoved',
    reads: ['census', 'processTableRead', 'electronsLeft', 'serverRead', 'serverGone', 'socketsRead', 'socketsLeft', 'reports.read', 'reports.ours', 'dumpsLeft', 'realTailscale', 'feed.unguarded', 'launched', 'agentsHeld', 'history.before', 'history.after'],
    needs: [
      ['the process table and the scratch server were read at the end', (r) => r.processTableRead === true && r.serverRead === true],
      ['the socket directory tmux and the harness use was read', (r) => r.socketsRead === true],
      ['his reports folder was read by name before and after', (r) => r.reports.read === true],
      ['at least one Electron was launched', (r) => Number.isInteger(r.launched) && r.launched > 0 && Array.isArray(r.agentsHeld)]
    ],
    clauses: [
      ['no census finding: his own server held exactly what it held', (r) => Array.isArray(r.census) && r.census.length === 0],
      ['every Electron this run started is gone', (r) => r.electronsLeft === 0],
      ['the scratch tmux server is gone and no server answers on this run’s socket', (r) => r.serverGone === true && r.socketsLeft === 0],
      ['no crash report of a Tortie or an Electron process was added to his folder (names and times only, none opened)', (r) => r.reports.ours === 0],
      ['every Crashpad dump under a scratch profile was counted and deleted', (r) => r.dumpsLeft === 0],
      ['no real Tailscale was ever seen under this run’s apps', (r) => r.realTailscale === 0],
      ['every packaged launch held the loopback feed, or said updates are off, or was ended before its first check', (r) => r.feed.unguarded === 0],
      ['every launch that reached its window held the agents: nothing resolved but the stand-ins', (r) => r.agentsHeld.every((x) => x === true)],
      ['his shell history did not move across the run', (r) => historyHeld(r.history) === 'unmoved' || historyHeld(r.history) === 'his terminal']
    ]
  }
};

/** True when `path` (dots) names a value that is not undefined. */
function present(reading, path) {
  let o = reading;
  for (const k of String(path).split('.')) {
    if (o === null || o === undefined || typeof o !== 'object') return false;
    o = o[k];
  }
  return o !== undefined;
}
const holds = (predicate, reading) => {
  try {
    return predicate(reading) === true;
  } catch {
    return false;
  }
};
/** The words a missing field is named by in a verdict. */
export const missingField = (path) => `the reading has no ${path}`;

/**
 * One arm's verdict: `{ verdict: 'pass'|'fail'|'unreadable', ok, failed, missing }`.
 * A field the arm reads that is absent, or a need that does not hold, is
 * UNREADABLE and no clause is asked; a clause that throws is a failed clause.
 */
export function grade(id, reading) {
  const g = GRADERS[id];
  const missing = g.reads.filter((path) => !present(reading, path)).map(missingField);
  if (missing.length === 0) for (const [name, predicate] of g.needs) if (!holds(predicate, reading)) missing.push(name);
  if (missing.length > 0) return { verdict: 'unreadable', ok: null, failed: [], missing };
  const failed = g.clauses.filter(([, predicate]) => !holds(predicate, reading)).map(([name]) => name);
  return { verdict: failed.length === 0 ? 'pass' : 'fail', ok: failed.length === 0, failed, missing: [] };
}

// ---------------------------------------------------------------------------
// --list-graders and --grader-self-test: every grader and every reader on
// build/p364/fixtures/graders.json; neither starts anything
// ---------------------------------------------------------------------------

export const GRADER_FIXTURES = join(ROOT, 'build', 'p364', 'fixtures', 'graders.json');

if (process.argv.includes('--list-graders')) {
  for (const [id, g] of Object.entries(GRADERS)) {
    process.stdout.write(`${id}: ${g.title}\n`);
    for (const r of g.reads) process.stdout.write(`  reads  ${r}\n`);
    for (const [n] of g.needs) process.stdout.write(`  needs  ${n}\n`);
    for (const [n] of g.clauses) process.stdout.write(`  clause ${n}\n`);
  }
  process.exit(0);
}

function at(obj, path) {
  const keys = String(path).split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[/^\d+$/.test(k) ? Number(k) : k];
  const last = keys[keys.length - 1];
  return { o, k: /^\d+$/.test(last) ? Number(last) : last };
}
export function applyOps(reading, ops) {
  for (const op of ops ?? []) {
    if (op.set !== undefined) {
      const { o, k } = at(reading, op.set);
      o[k] = structuredClone(op.value);
    } else if (op.delete !== undefined) {
      const { o, k } = at(reading, op.delete);
      if (Array.isArray(o)) o.splice(k, 1);
      else delete o[k];
    } else if (op.push !== undefined) {
      const { o, k } = at(reading, op.push);
      o[k].push(structuredClone(op.value));
    } else throw new Error(`an op this reader does not know: ${J(op)}`);
  }
  return reading;
}
/** A fixture naming a family stands for one fixture per member grader. */
function expand(list) {
  const out = [];
  for (const c of Array.isArray(list) ? list : []) {
    if (c.family === undefined) out.push(c);
    else if (FAMILIES[c.family] === undefined) out.push({ ...c, arm: `family ${String(c.family)}` });
    else for (const arm of FAMILIES[c.family]) out.push({ ...c, arm, name: `${c.name} (${c.family})` });
  }
  return out;
}
/** A raw fixture's reading: the honest reading of its arm with what the named composer makes of the raw input laid over it. */
export function composeRaw(arm, base, c) {
  const reading = structuredClone(base);
  const composer = COMPOSERS[c.compose];
  if (composer === undefined) throw new Error(`no composer named ${J(c.compose)}`);
  const made = composer(c.input ?? {});
  for (const [k, v] of Object.entries(made)) reading[k] = v;
  return applyOps(reading, c.ops ?? []);
}

function graderSelfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  let fixtures = null;
  try {
    fixtures = JSON.parse(readFileSync(GRADER_FIXTURES, 'utf8'));
  } catch (err) {
    say(false, `${GRADER_FIXTURES.slice(ROOT.length + 1)} does not read: ${String(err?.message ?? err)}`);
    process.stdout.write('[p364] grader self-test FAIL.\n');
    return false;
  }
  const honest = fixtures.honest ?? {};
  const brokenRaw = Array.isArray(fixtures.broken) ? fixtures.broken : [];
  const unreadRaw = Array.isArray(fixtures.unreadable) ? fixtures.unreadable : [];
  const raw = Array.isArray(fixtures.raw) ? fixtures.raw : [];
  const readerChecks = Array.isArray(fixtures.readerChecks) ? fixtures.readerChecks : [];
  const count = Object.keys(honest).length + brokenRaw.length + unreadRaw.length + raw.length + readerChecks.length;
  say(count === fixtures.readings, `the fixtures hold ${String(count)} entries, as their own count says (${String(fixtures.readings)})`);
  // 0. The readers asked directly, each against what the fixture says it must answer.
  for (const rc of readerChecks) {
    const fn = READERS[rc.fn];
    if (typeof fn !== 'function') {
      say(false, `the reader check "${String(rc.name)}" names ${J(rc.fn)}, which is no reader`);
      continue;
    }
    let got;
    try {
      got = fn(...(rc.args ?? []));
    } catch (err) {
      got = `threw ${String(err?.message ?? err)}`;
    }
    say(J(got) === J(rc.want), `${rc.fn} answers ${J(rc.want)} for: ${rc.name}${J(got) === J(rc.want) ? '' : ` (answered ${J(got)})`}`);
  }
  const broken = expand(brokenRaw);
  const unread = expand(unreadRaw);
  const sole = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
  const soleMiss = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
  const known = (arm, names, kind) => {
    const list = kind === 'clause' ? GRADERS[arm].clauses.map(([n]) => n) : [...GRADERS[arm].needs.map(([n]) => n), ...GRADERS[arm].reads.map(missingField)];
    return (names ?? []).filter((n) => !list.includes(n));
  };
  const judge = (c, reading) => {
    if (GRADERS[c.arm] === undefined) {
      say(false, `the fixture "${String(c.name)}" names ${J(c.arm)}, which is no arm`);
      return;
    }
    const expect = c.expect ?? (c.mustMiss !== undefined ? 'unreadable' : c.mustFail !== undefined ? 'fail' : 'pass');
    const unknown = [...known(c.arm, c.mustFail, 'clause'), ...known(c.arm, c.mustMiss, 'need')];
    if (unknown.length > 0) {
      say(false, `${c.arm} "${c.name}" names ${J(unknown)}, which its grader does not`);
      return;
    }
    let g;
    try {
      g = grade(c.arm, reading());
    } catch (err) {
      say(false, `${c.arm} "${c.name}" could not be read: ${String(err?.message ?? err)}`);
      return;
    }
    if (expect === 'pass') {
      say(g.verdict === 'pass', `${c.arm} passes: ${c.name}${g.verdict === 'pass' ? '' : ` (${g.verdict}: ${J(g.verdict === 'fail' ? g.failed : g.missing)})`}`);
      return;
    }
    const want = J([...(expect === 'fail' ? c.mustFail : c.mustMiss)].sort());
    const got = J([...(expect === 'fail' ? g.failed : g.missing)].sort());
    const right = g.verdict === expect && want === got;
    say(right, `${c.arm} answers ${expect.toUpperCase()} on exactly ${want} for: ${c.name}${right ? '' : ` (answered ${g.verdict}: ${J(g.verdict === 'fail' ? g.failed : g.missing)})`}`);
    if (right && expect === 'fail' && c.mustFail.length === 1) sole.get(c.arm).add(c.mustFail[0]);
    if (right && expect === 'unreadable' && c.mustMiss.length === 1) soleMiss.get(c.arm).add(c.mustMiss[0]);
  };
  // 1. Every grader's honest reading passes.
  for (const id of Object.keys(GRADERS)) {
    if (honest[id] === undefined) say(false, `${id} has no honest reading`);
    else judge({ arm: id, name: 'its honest reading', expect: 'pass' }, () => structuredClone(honest[id]));
  }
  // 2. Every broken reading FAILS exactly the clauses it names (a family fixture, in every member).
  for (const c of broken) judge({ ...c, expect: 'fail' }, () => applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
  // 3. Every unreadable reading answers UNREADABLE on exactly the needs it names.
  for (const c of unread) judge({ ...c, expect: 'unreadable' }, () => applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
  // 4. Every raw fixture, through the live run's own composers.
  for (const c of raw) judge(c, () => composeRaw(c.arm, honest[c.arm], c));
  // 5. A MISSING READING IS NEVER A PASS: every field an arm reads, deleted alone, answers UNREADABLE naming it.
  let swept = 0;
  for (const [id, g] of Object.entries(GRADERS)) {
    if (honest[id] === undefined) continue;
    for (const path of g.reads) {
      swept += 1;
      const r = structuredClone(honest[id]);
      const parts = path.split('.');
      let o = r;
      for (const k of parts.slice(0, -1)) o = o?.[k];
      if (o !== null && typeof o === 'object') delete o[parts[parts.length - 1]];
      const v = grade(id, r);
      if (!(v.verdict === 'unreadable' && v.missing.includes(missingField(path)))) say(false, `${id} without ${path} answered ${v.verdict}${v.verdict === 'unreadable' ? ` without naming the field (${J(v.missing)})` : ', not UNREADABLE'}`);
    }
  }
  say(swept > 0, `a missing reading is never a pass: ${String(swept)} fields, each deleted alone, each answered UNREADABLE`);
  // 6. Every clause shown red alone, and every need shown unreadable alone.
  let clauses = 0;
  let needs = 0;
  for (const [id, g] of Object.entries(GRADERS)) {
    for (const [name] of g.clauses) {
      clauses += 1;
      say(sole.get(id).has(name), `${id} clause shown red alone: ${name}`);
    }
    for (const [name] of g.needs) {
      needs += 1;
      say(soleMiss.get(id).has(name), `${id} need shown unreadable alone: ${name}`);
    }
  }
  process.stdout.write(
    failures === 0
      ? `[p364] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses each shown red alone, ${String(needs)} needs each shown unreadable alone, ${String(swept)} fields that answer UNREADABLE when missing, ${String(raw.length)} raw fixtures through the run's own composers, ${String(readerChecks.length)} reader checks.\n`
      : `[p364] grader self-test FAIL: ${String(failures)}.\n`
  );
  return failures === 0;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The inputs, and --preflight (arm by arm; starts nothing)
// ---------------------------------------------------------------------------

const envOf = (name) => (process.env[name] ?? '').trim();
/** A packaged app given as its `.app` or as its binary: the binary's absolute path, or ''. */
export function appBinaryOf(given) {
  if (typeof given !== 'string' || given === '') return '';
  const abs = resolve(given);
  return abs.endsWith('.app') ? join(abs, 'Contents', 'MacOS', 'Tortie') : abs;
}
/** The `.app` folder a binary sits in, or null. */
export function appBundleOf(binary) {
  const m = /^(.*\.app)\/Contents\/MacOS\/[^/]+$/.exec(String(binary));
  return m === null ? null : m[1];
}
const DIAG_APP = appBinaryOf(envOf('P364_DIAG_APP'));
const NORMAL_APP = appBinaryOf(envOf('P364_NORMAL_APP'));
const PARENT_APP = appBinaryOf(envOf('P364_PARENT_APP'));
const TEST_BS3 = envOf('P364_TEST_BS3') === '' ? '' : resolve(envOf('P364_TEST_BS3'));
const DIAG_NODE = envOf('P364_DIAG_NODE') === '' ? '' : resolve(envOf('P364_DIAG_NODE'));
/** M2c's diagnostic development build: P364_DIAG_CHECKOUT, else the clone the diagnostic package was made in (`<clone>/release/mac-arm64/Tortie.app`). */
const DIAG_CHECKOUT = (() => {
  if (envOf('P364_DIAG_CHECKOUT') !== '') return resolve(envOf('P364_DIAG_CHECKOUT'));
  const bundle = appBundleOf(DIAG_APP);
  const m = bundle === null ? null : /^(.*)\/release\/[^/]+\/[^/]+\.app$/.exec(bundle);
  return m === null ? '' : m[1];
})();
const DIAG_BS3_GIVEN = envOf('P364_DIAG_BS3') === '' ? '' : resolve(envOf('P364_DIAG_BS3'));
const HOOK = join(ROOT, 'build', 'diagnostic', 'hook-bs3.cjs');
const PACKED_NODE_REL = join('Contents', 'Resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'prebuilds', 'darwin-arm64.node');
const SHIPPED_NODE = join(ROOT, 'node_modules', 'better-sqlite3', 'prebuilds', 'darwin-arm64.node');
const ELECTRON_APP = join(ROOT, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron');
const bs3Ok = (dir) => typeof dir === 'string' && dir !== '' && existsSync(join(dir, 'build', 'Release', 'better_sqlite3.node')) && existsSync(join(dir, 'lib', 'database.js'));
const outHolds = (checkout, needle) => {
  try {
    return readFileSync(join(checkout, 'out', 'main', 'index.js'), 'utf8').includes(needle);
  } catch {
    return null;
  }
};
const KEEP = envOf('P364_KEEP') === '1';
const CHURN_MIN = Number(envOf('P364_CHURN_MIN') || CHURN_MIN_DEFAULT);
const COST_RUNS = Number(envOf('P364_COST_RUNS') || COST_RUNS_DEFAULT);

/** Every grader id an arm name stands for. */
export function gradersOf(name) {
  if (name === 'M2a') return M2A_KINDS.map((k) => `M2a-${k}`);
  if (name === 'M2b') return M2B_TARGET_IDS.map((id) => `M2b-${id}`);
  return GRADERS[name] !== undefined && name !== 'RUN' ? [name] : [];
}
const ASKED = (envOf('P364_ARMS') || DEFAULT_ARMS.join(',')).split(',').map((x) => x.trim()).filter((x) => x !== '');
const SELECTED = new Set(ASKED.flatMap(gradersOf));
const on = (id) => SELECTED.has(id);

/** Why each selected arm cannot run, before anything starts. An arm with a reason reads UNREADABLE; nothing is refused whole for it. */
function armProblems() {
  const p = {};
  const add = (id, why) => (p[id] ??= []).push(why);
  const needDiag = (id) => {
    if (DIAG_APP === '' || !existsSync(DIAG_APP)) add(id, `P364_DIAG_APP does not name a packaged diagnostic app (${DIAG_APP || 'unset'})`);
  };
  const needTest = (id) => {
    if (!bs3Ok(TEST_BS3)) add(id, `P364_TEST_BS3 does not name a built test variant (build/Release/better_sqlite3.node and lib/database.js) (${TEST_BS3 || 'unset'})`);
    if (!existsSync(HOOK)) add(id, `${HOOK} is missing`);
  };
  const normalApp = PARENT_APP !== '' ? PARENT_APP : NORMAL_APP;
  for (const id of SELECTED) {
    if (id === 'R') {
      needTest(id);
      if (!existsSync(ELECTRON_APP)) add(id, `${ELECTRON_APP} is missing`);
    } else if (id === 'M1n') {
      if (normalApp === '' || !existsSync(normalApp)) add(id, `neither P364_PARENT_APP nor P364_NORMAL_APP names a packaged normal app`);
    } else if (id === 'M1' || id.startsWith('M2a-') || id.startsWith('M2b-')) {
      needDiag(id);
      needTest(id);
    } else if (id === 'U' || id === 'U-feed-file' || id === 'C') {
      needDiag(id);
      if (NORMAL_APP === '' || !existsSync(NORMAL_APP)) add(id, `P364_NORMAL_APP does not name this tree's normal package (${NORMAL_APP || 'unset'})`);
    } else if (id === 'P') {
      needDiag(id);
    } else if (id === 'M2c') {
      if (DIAG_CHECKOUT === '' || outHolds(DIAG_CHECKOUT, 'TORTIE_CHECKER') !== true) add(id, `no diagnostic development build: P364_DIAG_CHECKOUT (or the clone P364_DIAG_APP was made in) must hold a diagnostic out/ (one whose out/main/index.js names TORTIE_CHECKER) (${DIAG_CHECKOUT || 'unset'})`);
      if (outHolds(ROOT, 'TORTIE_CHECKER') !== false) add(id, `${ROOT}/out/main/index.js is missing or is not the normal build (it names TORTIE_CHECKER): npm run build first`);
      if (!bs3Ok(DIAG_BS3_GIVEN) && (DIAG_APP === '' || !existsSync(join(appBundleOf(DIAG_APP) ?? '/nonexistent', PACKED_NODE_REL)))) add(id, 'no diagnostic better-sqlite3 for the hook: P364_DIAG_BS3, or a P364_DIAG_APP to assemble one from');
      if (!existsSync(HOOK)) add(id, `${HOOK} is missing`);
    }
  }
  return p;
}
function runProblems() {
  const p = [];
  for (const f of ['build/p3167/seed-sessions.mts', 'build/p316/node-phone.mjs', 'build/p330/tailscale-standin.mjs', 'build/p332/dns-standin.mjs', 'build/hidden-agents.mjs']) if (!existsSync(join(ROOT, f))) p.push(`${f} is missing`);
  for (const tool of ['/usr/bin/sqlite3', '/usr/bin/plutil', '/usr/bin/git']) if (!existsSync(tool)) p.push(`${tool} is missing`);
  if (!Number.isFinite(CHURN_MIN) || CHURN_MIN <= 0) p.push(`P364_CHURN_MIN is not a positive number (${String(CHURN_MIN)})`);
  if (!Number.isInteger(COST_RUNS) || COST_RUNS < 2) p.push(`P364_COST_RUNS is not an integer of 2 or more (${String(COST_RUNS)})`);
  for (const a of ASKED) if (gradersOf(a).length === 0 && a !== 'RUN') p.push(`P364_ARMS names ${J(a)}, which is no arm`);
  return p;
}
// --instruments <dir>: every scratch file this run would load into an app or a
// pane, written to <dir> so a reader sees exactly what goes in; starts nothing.
if (process.argv.includes('--instruments')) {
  const dir = resolve(process.argv[process.argv.indexOf('--instruments') + 1] ?? '');
  if (dir === ROOT || dir.startsWith(`${ROOT}/`) || !existsSync(dirname(dir))) {
    process.stderr.write('[p364] --instruments wants a scratch folder outside this checkout whose parent exists\n');
    process.exit(2);
  }
  mkdirSync(join(dir, 'arm-app'), { recursive: true });
  const out = {
    'recorder.cjs': recorderText(),
    'tracker.cjs': trackerText(),
    'arm-app/main.js': armAppMainText(),
    'arm-app/arm.cjs': armAppArmText(),
    'codex': standinCodexText(join(dir, 'home', '.codex'), 'p364-codex-id'),
    'opencode': standinOpencodeText(),
    'codex-store.sql': CODEX_STORE_SQL,
    'opencode-store.sql': OPENCODE_STORE_SQL
  };
  for (const [name, text] of Object.entries(out)) writeFileSync(join(dir, name), text, { mode: name === 'codex' || name === 'opencode' ? 0o755 : 0o644 });
  process.stdout.write(`[p364] wrote ${String(Object.keys(out).length)} instruments to ${dir}\n`);
  process.exit(0);
}
if (process.argv.includes('--preflight')) {
  const run = runProblems();
  const arms = armProblems();
  for (const x of run) process.stderr.write(`[p364] REFUSED. ${x}\n`);
  for (const [id, xs] of Object.entries(arms)) for (const x of xs) process.stderr.write(`[p364] ${id} would read UNREADABLE: ${x}\n`);
  if (run.length === 0) process.stdout.write(`[p364] preflight: ${String([...SELECTED].length - Object.keys(arms).length)} of ${String([...SELECTED].length)} selected arms have their inputs\n`);
  process.exit(run.length > 0 ? 2 : Object.keys(arms).length > 0 ? 2 : 0);
}

// ---------------------------------------------------------------------------
// The run: the refusals, the scratch world
// ---------------------------------------------------------------------------

const TAG = '[p364]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(7)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '' || SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-p364')) {
  refuse(`"${SOCKET}" is not a gmux-p364 harness socket. Run \`npm run probe:p364\`, which wraps this file in build/harness-socket.mjs.`);
}
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
{
  const p = runProblems();
  if (p.length > 0) refuse(p.join('; '));
}
for (const v of ['TORTIE_CHECKER', 'TORTIE_DIAGNOSTIC', 'TORTIE_DIAGNOSTIC_NODE']) if ((process.env[v] ?? '') !== '') refuse(`${v} is set in this shell; a launch must never be handed it (the app's own handshake sets TORTIE_CHECKER).`);

mkdirSync(join(HARNESS_DIR, 'p364'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p364'));
const OUT = envOf('P364_OUT_DIR') !== '' ? resolve(envOf('P364_OUT_DIR')) : join(HARNESS_DIR, 'p364-report');
/** The vendored tmux the app runs, so its client and server agree. */
const TMUX = join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const ARM_PROBLEMS = armProblems();
const PACKAGE_VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const ELECTRON_VERSION = JSON.parse(readFileSync(join(ROOT, 'node_modules', 'electron', 'package.json'), 'utf8')).version;

const report = { checkout: ROOT, snapshot: SNAPSHOT, socket: SOCKET, inputs: { DIAG_APP, NORMAL_APP, PARENT_APP, TEST_BS3, DIAG_NODE, DIAG_CHECKOUT, DIAG_BS3_GIVEN }, arms: [], readings: {}, printed: {} };
let failures = 0;
let unreadable = 0;
function cannotRead(id, why) {
  unreadable += 1;
  report.arms.push({ id, ok: null, said: why });
  say(`UNREADABLE ${id}: ${why}`);
}
function arm(id, reading) {
  report.readings[id] = reading;
  const g = grade(id, reading);
  if (g.verdict === 'unreadable') {
    cannotRead(id, `${GRADERS[id].title}; could not read ${J(g.missing)}`);
    return;
  }
  report.arms.push({ id, ok: g.ok, failed: g.failed, title: GRADERS[id].title });
  if (!g.ok) failures += 1;
  // M2c's title cannot know the minutes asked (lens A: it said 20 whatever P364_CHURN_MIN was); the line does.
  const ran = id === 'M2c' && Number.isFinite(reading?.minutes) ? ` [ran ${String(reading.minutes)} minutes per build]` : '';
  say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${ran}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
}
/** Run one arm's body; an input it lacks, or a throw, is UNREADABLE with its sentence. */
async function guarded(id, body) {
  if (!on(id)) return;
  if (ARM_PROBLEMS[id] !== undefined) {
    cannotRead(id, ARM_PROBLEMS[id].join('; '));
    return;
  }
  try {
    arm(id, await body());
  } catch (err) {
    cannotRead(id, `the arm stopped: ${String(err?.message ?? err).slice(0, 600)}`);
  }
}

// ---------------------------------------------------------------------------
// The bookkeeping RUN reads: launches, pids, reports, dumps, the feed, history
// ---------------------------------------------------------------------------

let standin = null;
let dns = null;
let watch = null;
const shims = new Set();
const apps = new Set();
const agentsHeld = [];
const censusFindings = [];
const launches = [];
const diagLaunches = [];
let dumpsFound = 0;
let dumpsLeft = 0;

const HISTORY_FILES = ['.zsh_history', '.bash_history'];
const historyStat = () =>
  HISTORY_FILES.map((n) => {
    try {
      const s = statSync(join(userInfo().homedir, n));
      return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
    } catch {
      return 'none';
    }
  }).join('|');
const HISTORY_BEFORE = historyStat();
const HISTORY_QUIET_MS = 180_000;

/** His crash reports folder by NAME and mtime only (and its Retired/); never opened. Null when it cannot be read. */
function reportNames() {
  const dir = join(userInfo().homedir, 'Library', 'Logs', 'DiagnosticReports');
  const list = (d, prefix) => {
    try {
      return readdirSync(d).map((n) => {
        try {
          const s = statSync(join(d, n));
          return s.isDirectory() ? null : `${prefix}${n}@${String(Math.floor(s.mtimeMs))}`;
        } catch {
          return `${prefix}${n}`;
        }
      }).filter((x) => x !== null);
    } catch {
      return null;
    }
  };
  const top = list(dir, '');
  if (top === null) return null;
  return [...top, ...(list(join(dir, 'Retired'), 'Retired/') ?? [])];
}
const REPORTS_BEFORE = reportNames();

/** tmux on THIS run's scratch socket only, ever. */
function tmux(...args) {
  if (!SOCKET.startsWith('gmux-p364')) throw new Error('refusing a socket that is not this run');
  const r = spawnSync(TMUX, ['-L', SOCKET, ...args], { encoding: 'utf8', timeout: 20_000 });
  return { status: r.status, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}
function processTable() {
  const r = spawnSync('/bin/ps', ['-ww', '-ax', '-o', 'pid=,ppid=,command='], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  const rows = new Map();
  for (const line of String(r.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m !== null) rows.set(Number(m[1]), { pid: Number(m[1]), ppid: Number(m[2]), command: m[3] });
  }
  return rows;
}
const rssOf = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  const r = spawnSync('/bin/ps', ['-o', 'rss=', '-p', String(pid)], { encoding: 'utf8', timeout: 10_000 });
  const n = Number(String(r.stdout ?? '').trim());
  return Number.isFinite(n) && n > 0 ? n : null;
};
/** Every Crashpad dump under a scratch profile: counted, its name and size printed, then deleted (a dump holds the environment). */
function sweepDumps(label, profile) {
  const found = [];
  const walk = (d, depth) => {
    if (depth > 6) return;
    let ents = [];
    try {
      ents = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.name.endsWith('.dmp')) found.push(p);
    }
  };
  walk(profile, 0);
  for (const f of found) {
    let bytes = null;
    try {
      bytes = statSync(f).size;
    } catch {
      /* gone */
    }
    (report.printed.dumps ??= []).push({ label, name: basename(f), bytes });
    rmSync(f, { force: true });
    if (existsSync(f)) dumpsLeft += 1;
  }
  dumpsFound += found.length;
  return found.length;
}
const sha256Of = (path) => {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// The loopback update feed: every packaged launch's TORTIE_UPDATE_FEED
// ---------------------------------------------------------------------------

const feed = { url: null, server: null, current: null, requests: [] };
async function openFeed() {
  feed.server = createServer((req, res) => {
    feed.requests.push({ at: Date.now(), label: feed.current, method: req.method, path: String(req.url ?? '').slice(0, 200) });
    res.statusCode = 404;
    res.end();
  });
  await new Promise((r) => feed.server.listen(0, '127.0.0.1', r));
  feed.url = `http://127.0.0.1:${String(feed.server.address().port)}/p364-feed/`;
}
const feedCount = (label) => feed.requests.filter((r) => r.label === label).length;

// ---------------------------------------------------------------------------
// The three scratch instruments (never a file under src/)
// ---------------------------------------------------------------------------

/** The recorder, loaded by NODE_OPTIONS into MAIN of every app launch (a function so it is hoisted). */
function recorderText() {
  return String.raw`'use strict';
// Phase 364's recorder (probe:p364). SCRATCH ONLY: written by build/p364/probe-p364.mjs and loaded by
// NODE_OPTIONS into MAIN of a harness launch. It records with appendFileSync (on disk before any SIGKILL),
// presses what the probe asks through its trigger file, and changes nothing Tortie decides, except that
// with P364_DIALOGS=record a message box is recorded and answered OK instead of drawn, and with
// P364_KILL_ON_LINE=1 it ends its own process by SIGKILL once the checker's line is in app.log.
if (process.type !== 'browser') return;
const fs = require('node:fs');
const OUT = process.env.P364_EVENTS || '';
const TRIGGER = process.env.P364_TRIGGER || '';
const APPLOG = process.env.P364_APP_LOG || '';
const KILL_ON_LINE = process.env.P364_KILL_ON_LINE === '1';
const DIALOGS = process.env.P364_DIALOGS === 'record';
const write = (o) => { try { fs.appendFileSync(OUT, JSON.stringify(Object.assign({ t: Date.now() }, o)) + '\n'); } catch (e) { /* never break the app */ } };
process.on('exit', (code) => write({ ev: 'process-exit', code: code }));
write({ ev: 'loaded', pid: process.pid });
if (KILL_ON_LINE && APPLOG !== '') {
  let off = 0;
  let tail = '';
  const look = setInterval(() => {
    try {
      const size = fs.statSync(APPLOG).size;
      if (size <= off) return;
      const fd = fs.openSync(APPLOG, 'r');
      const b = Buffer.alloc(size - off);
      fs.readSync(fd, b, 0, b.length, off);
      fs.closeSync(fd);
      off = size;
      const text = tail + b.toString('utf8');
      tail = text.slice(-64);
      if (text.includes('"event":"diagnostic.pcache"')) { write({ ev: 'kill-on-line' }); process.kill(process.pid, 'SIGKILL'); }
    } catch (e) { /* not written yet */ }
  }, 25);
  look.unref();
}
setImmediate(() => {
  let electron;
  try { electron = require('electron'); } catch (err) { write({ ev: 'hook-failed', why: String(err && err.message).slice(0, 200) }); return; }
  const app = electron.app;
  const Menu = electron.Menu;
  const dialog = electron.dialog;
  try {
    const set = app.setAboutPanelOptions.bind(app);
    app.setAboutPanelOptions = function p364About(opts) {
      write({ ev: 'about', applicationVersion: opts && opts.applicationVersion, version: opts && opts.version });
      return set(opts);
    };
  } catch (err) { write({ ev: 'hook-failed', why: 'about: ' + String(err && err.message).slice(0, 200) }); }
  if (DIALOGS) {
    const optsOf = (a, b) => (b !== undefined && b !== null && typeof b === 'object' ? b : a) || {};
    try {
      dialog.showMessageBox = function p364Box(a, b) { const o = optsOf(a, b); write({ ev: 'dialog', type: o.type, message: o.message, detail: o.detail }); return Promise.resolve({ response: 0, checkboxChecked: false }); };
      dialog.showMessageBoxSync = function p364BoxSync(a, b) { const o = optsOf(a, b); write({ ev: 'dialog', type: o.type, message: o.message, detail: o.detail, sync: true }); return 0; };
    } catch (err) { write({ ev: 'hook-failed', why: 'dialogs: ' + String(err && err.message).slice(0, 200) }); }
    // Read back, so a wrap that did not take is a reading of its own and never a drawn box nobody answers.
    write({ ev: 'dialogs-wrapped', ok: dialog.showMessageBox.name === 'p364Box' && dialog.showMessageBoxSync.name === 'p364BoxSync' });
  }
  const findItem = (items, test) => { for (const item of items) { if (test(String(item.label))) return item; if (item.submenu) { const inner = findItem(item.submenu.items, test); if (inner) return inner; } } return null; };
  app.prependListener('before-quit', () => write({ ev: 'before-quit' }));
  app.prependListener('will-quit', () => write({ ev: 'will-quit' }));
  app.prependListener('quit', () => write({ ev: 'quit' }));
  let seen = 0;
  const poll = setInterval(() => {
    if (TRIGGER === '') return;
    let req = null;
    try { req = JSON.parse(fs.readFileSync(TRIGGER, 'utf8')); } catch (e) { return; }
    if (!req || typeof req.seq !== 'number' || req.seq <= seen) return;
    seen = req.seq;
    try {
      if (req.action === 'menu-quit' || req.action === 'menu-check') {
        const menu = Menu.getApplicationMenu();
        const want = req.action === 'menu-quit' ? (l) => l.startsWith('Quit ') : (l) => l.startsWith('Check for Updates');
        const item = menu ? findItem(menu.items, want) : null;
        write({ ev: req.action, ok: item !== null, label: item ? String(item.label) : null });
        if (item) item.click();
      } else if (req.action === 'kill-self') {
        write({ ev: 'kill-self' });
        process.kill(process.pid, 'SIGKILL');
      }
    } catch (err) { write({ ev: 'trigger-failed', action: String(req.action), why: String(err && err.message).slice(0, 200) }); }
  }, 50);
  poll.unref();
  write({ ev: 'hooked' });
});
`;
}

/** The tracker, loaded AFTER the hook so it wraps the checking build (a function so it is hoisted). */
function trackerText() {
  return String.raw`'use strict';
// Phase 364's connection tracker (probe:p364). SCRATCH ONLY: written by build/p364/probe-p364.mjs and
// loaded by NODE_OPTIONS into MAIN after build/diagnostic/hook-bs3.cjs. It records every better-sqlite3
// connection opened (its file, read only or not, the stack that opened it), every close() begun and every
// close() that returned. It changes nothing Tortie decides.
if (process.type !== 'browser') return;
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const OUT = process.env.P364_TRACKER || '';
const write = (o) => { try { fs.appendFileSync(OUT, JSON.stringify(Object.assign({ t: Date.now() }, o)) + '\n'); } catch (e) { /* never break the app */ } };
const frames = (stack) => String(stack).split('\n').slice(1).map((l) => l.trim().replace(/^at /, '').replace(/ \(.*\)$/, '')).slice(0, 30);
const conns = [];
const wrapped = new Map();
const wrap = (Database) => {
  if (typeof Database !== 'function') return Database;
  if (wrapped.has(Database)) return wrapped.get(Database);
  const origClose = Database.prototype.close;
  Database.prototype.close = function p364Close() {
    const c = conns.find((x) => x.db === this);
    if (c) write({ ev: 'close', id: c.id });
    const out = origClose.apply(this, arguments);
    if (c) write({ ev: 'closed', id: c.id });
    return out;
  };
  const note = (db, args) => {
    const given = typeof args[0] === 'string' ? args[0] : '';
    const file = given === '' || given === ':memory:' ? given : path.resolve(given);
    const opts = args[1] && typeof args[1] === 'object' ? args[1] : {};
    const id = conns.length + 1;
    conns.push({ id, db });
    const limit = Error.stackTraceLimit;
    Error.stackTraceLimit = 40;
    const stack = frames(new Error().stack);
    Error.stackTraceLimit = limit;
    write({ ev: 'open', id, file, readonly: opts.readonly === true, stack });
  };
  const P = new Proxy(Database, {
    construct(target, args) { const db = Reflect.construct(target, args); note(db, args); return db; },
    apply(target, _self, args) { const db = Reflect.construct(target, args); note(db, args); return db; }
  });
  wrapped.set(Database, P);
  return P;
};
const origLoad = Module._load;
Module._load = function p364Load(request, parent, isMain) {
  const out = origLoad.apply(this, arguments);
  return request === 'better-sqlite3' ? wrap(out) : out;
};
write({ ev: 'installed', pid: process.pid });
`;
}

/** R's arm app: main.js (the spec step's `eapp`, through the tree's hook). */
function armAppMainText() {
  return String.raw`'use strict';
// Phase 364's reproduction app (probe:p364 R). SCRATCH ONLY: written by build/p364/probe-p364.mjs.
// No window, no Dock icon, no crash reporter started. The checking better-sqlite3 is loaded by path
// through the tree's build/diagnostic/hook-bs3.cjs; nothing of Tortie runs.
const { app } = require('electron');
const path = require('node:path');
try { if (app.dock) app.dock.hide(); } catch (e) { /* no dock */ }
app.disableHardwareAcceleration();
app.on('window-all-closed', () => {});
app.whenReady().then(() => {
  process.stdout.write('P364-ELECTRON ' + process.versions.electron + ' node ' + process.versions.node + ' pid ' + process.pid + '\n');
  require(process.env.P364_HOOK);
  const { run } = require(path.join(__dirname, 'arm.cjs'));
  setTimeout(() => {
    try {
      run((db) => { db.close(); process.stdout.write('P364-ARM-CLOSED\n'); app.exit(0); });
    } catch (err) {
      process.stdout.write('P364-ARM-THREW ' + String(err && err.stack).slice(0, 600) + '\n');
      process.kill(process.pid, 'SIGKILL');
    }
  }, 300);
});
`;
}

/**
 * R's arm (the spec step's arms-child.cjs, by value): a manifest-shaped WAL
 * database, 354 rows of 12,000 to 17,000 bytes; 600 warm reads, the plant at
 * walk 200, then 40 reads shaped like the ring's digest and listSessions, two
 * writes, a FRESH read-only integrity_check, one JSON line, then `done(db)`.
 */
function armAppArmText() {
  return String.raw`'use strict';
// Phase 364's reproduction arm (probe:p364 R). SCRATCH ONLY: the spec step's arms-child.cjs, by value.
const fs = require('node:fs');
const path = require('node:path');
function run(done) {
  const Database = require('better-sqlite3');
  const dir = process.env.ARM_DIR;
  const out = { arm: process.env.ARM || 'control', pid: process.pid, versions: 'electron ' + process.versions.electron };
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'manifest.db');
  for (const f of [file, file + '-wal', file + '-shm']) fs.rmSync(f, { force: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.exec('CREATE TABLE sessions (id TEXT PRIMARY KEY, name TEXT, created_at INTEGER, last_seen INTEGER, status TEXT, payload TEXT)');
  db.exec('CREATE TABLE migrations (version INTEGER PRIMARY KEY, applied_at INTEGER)');
  const ins = db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?)');
  db.transaction(() => {
    for (let i = 0; i < 354; i += 1) ins.run('id-' + i, 'n' + i, 1e12 + i, 0, 'idle', 'p'.repeat(12000 + ((i * 37) % 5000)));
    for (let v = 1; v <= 20; v += 1) db.prepare('INSERT INTO migrations VALUES (?, ?)').run(v, v);
  })();
  out.pageCount = db.pragma('page_count', { simple: true });
  const list = db.prepare('SELECT * FROM sessions ORDER BY created_at ASC');
  const one = db.prepare('SELECT * FROM sessions WHERE id = ?');
  const digest = (table) => {
    let n = 0;
    for (const row of db.prepare('SELECT * FROM ' + table + ' ORDER BY 1').raw(true).iterate()) n += row.length;
    return n;
  };
  const warmReads = { ok: 0, codes: {} };
  for (let k = 0; k < 600; k += 1) {
    try {
      if (k % 3 === 0) list.all();
      else if (k % 3 === 1) one.get('id-' + (k % 354));
      else db.prepare('SELECT count(*) FROM migrations').get();
      warmReads.ok += 1;
    } catch (err) {
      const code = err && err.code ? err.code : 'unknown';
      warmReads.codes[code] = (warmReads.codes[code] || 0) + 1;
    }
  }
  out.warmReads = warmReads;
  const reads = { ok: 0, errors: [], codes: {} };
  const tryRead = (what, fn) => {
    try { fn(); reads.ok += 1; } catch (err) {
      const code = err && err.code ? err.code : String(err && err.message).slice(0, 60);
      reads.codes[code] = (reads.codes[code] || 0) + 1;
      if (reads.errors.length < 4) reads.errors.push(what + ': ' + code);
    }
  };
  for (let k = 0; k < 10; k += 1) {
    tryRead('digest sessions', () => digest('sessions'));
    tryRead('digest migrations', () => digest('migrations'));
    tryRead('listSessions', () => list.all());
    tryRead('getSession', () => one.get('id-' + ((k * 31) % 354)));
  }
  const writes = { ok: 0, codes: {} };
  for (let k = 0; k < 2; k += 1) {
    try { db.prepare('UPDATE sessions SET last_seen = ? WHERE id = ?').run(Date.now(), 'id-' + k); writes.ok += 1; } catch (err) {
      const code = err && err.code ? err.code : 'unknown';
      writes.codes[code] = (writes.codes[code] || 0) + 1;
    }
  }
  out.reads = reads;
  out.writes = writes;
  try {
    const fresh = new Database(file, { readonly: true, fileMustExist: true });
    out.freshIntegrity = fresh.pragma('integrity_check', { simple: true });
    fresh.close();
  } catch (err) {
    out.freshIntegrity = 'threw: ' + (err && err.code ? err.code : String(err && err.message));
  }
  globalThis.__p364Db = db;
  process.stdout.write('P364-ARM ' + JSON.stringify(out) + '\n');
  done(db);
}
module.exports = { run };
`;
}

/** M2b's stand-in codex (probe:p365's shape): writes ONE rollout record into the run's CODEX_HOME, then waits. */
function standinCodexText(codexHome, idFile) {
  return String.raw`#!/bin/sh
# Phase 364's stand-in codex (probe:p364 M2b). SCRATCH ONLY: written by build/p364/probe-p364.mjs.
# No model and no network. It answers --version; in a session it writes ONE rollout record the
# harvest's codex descriptor reads, with the id its folder names, into the run's own CODEX_HOME.
case "$1" in --version|-V|version) echo 'codex-cli 0.150.0'; exit 0;; esac
CH='@@CH@@'
here=$(pwd -P)
if [ -f "$here/@@ID@@" ]; then
  id=$(cat "$here/@@ID@@")
  sleep 1
  day=$(date +%Y/%m/%d)
  stamp=$(date +%Y-%m-%dT%H-%M-%S)
  iso=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
  mkdir -p "$CH/sessions/$day"
  printf '{"timestamp":"%s","type":"session_meta","payload":{"id":"%s","timestamp":"%s","cwd":"%s","originator":"codex_cli_rs","cli_version":"0.150.0","source":"cli"}}\n' "$iso" "$id" "$iso" "$here" > "$CH/sessions/$day/rollout-$stamp-$id.jsonl.part"
  mv "$CH/sessions/$day/rollout-$stamp-$id.jsonl.part" "$CH/sessions/$day/rollout-$stamp-$id.jsonl"
fi
exec sleep 3600
`.replace('@@CH@@', codexHome).replaceAll('@@ID@@', idFile);
}
/** M2b's stand-in opencode: answers --version, then waits; the harvest reads the scratch store this file made. */
function standinOpencodeText() {
  return String.raw`#!/bin/sh
# Phase 364's stand-in opencode (probe:p364 M2b). SCRATCH ONLY: written by build/p364/probe-p364.mjs.
case "$1" in --version|-v|version) echo '0.15.31'; exit 0;; esac
exec sleep 3600
`;
}

// ---------------------------------------------------------------------------
// The scratch world: paths, the seed, the stores, the repositories
// ---------------------------------------------------------------------------

function paths(label) {
  const base = join(RUN, label);
  return {
    base,
    label,
    profile: join(base, 'profile'),
    home: join(base, 'home'),
    bin: join(base, 'bin'),
    proj: join(base, 'proj'),
    repos: join(base, 'repos'),
    manifest: join(base, 'profile', 'gmux', 'manifest.db'),
    appLog: join(base, 'profile', 'logs', 'app.log'),
    appLogOld: join(base, 'profile', 'logs', 'app.log.1'),
    recorder: join(base, 'recorder.cjs'),
    trackerFile: join(base, 'tracker.cjs')
  };
}
/** One launch's own files: a relaunch on the same profile never reads, or obeys, an earlier launch's. */
const launchFiles = (p, label) => ({ events: join(p.base, `${label}.recorder.jsonl`), tracker: join(p.base, `${label}.tracker.jsonl`), trigger: join(p.base, `${label}.trigger.json`) });
const linesOf = (file) => {
  try {
    return readFileSync(file, 'utf8').split('\n');
  } catch {
    return [];
  }
};
/** app.log.1 then app.log, as lines (one rotation's pair). */
const appLogLines = (p) => [...linesOf(p.appLogOld), ...linesOf(p.appLog)];

/** His recorded shape into the profile's manifest (counts only), through the pinned tsx. */
function seed(p) {
  mkdirSync(join(p.profile, 'gmux'), { recursive: true });
  const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', join(ROOT, 'tsconfig.node.json'), join(ROOT, 'build', 'p3167', 'seed-sessions.mts'), '--manifest', p.manifest, '--shape', 'his', '--root', join(p.base, 'seed-folders')], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, HOME: p.home },
    timeout: 180_000
  });
  let counts = null;
  try {
    counts = JSON.parse(String(r.stdout ?? '').trim().split('\n').pop());
  } catch {
    counts = null;
  }
  if (r.status !== 0 || counts === null || !Number.isInteger(counts.listed)) throw new Error(`the seed failed (exit ${String(r.status)}): ${String(r.stderr ?? '').slice(0, 300)}`);
  return counts;
}
/** One SQL script through /usr/bin/sqlite3 into a fresh scratch database (no -wal, so the app's read-only open writes nothing beside it). */
function scratchStore(file, sql, home) {
  mkdirSync(dirname(file), { recursive: true });
  rmSync(file, { force: true });
  // -batch, input on stdin and HOME in scratch: the CLI keeps no history of its own anywhere.
  const r = spawnSync('/usr/bin/sqlite3', ['-batch', file], { input: sql, encoding: 'utf8', timeout: 60_000, env: { ...process.env, HOME: home, SQLITE_HISTORY: '/dev/null' } });
  if (r.status !== 0) throw new Error(`sqlite3 ${file}: ${String(r.stderr ?? '').slice(0, 300)}`);
}
const gitRun = (args, home, cwd) =>
  spawnSync('/usr/bin/git', ['-c', 'user.name=p364', '-c', 'user.email=p364@example.invalid', '-c', 'commit.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 30_000,
    env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' }
  });
/** A scratch git repository with a few TypeScript files (the arch, symbols and watch drives read it). */
function scratchRepo(dir, home) {
  mkdirSync(join(dir, 'src'), { recursive: true });
  for (let i = 0; i < 6; i += 1) writeFileSync(join(dir, 'src', `m${String(i)}.ts`), `export function p364f${String(i)}(x: number): number {\n  return x + ${String(i)};\n}\nexport class P364C${String(i)} {\n  m(): string { return 'p364'; }\n}\n`);
  writeFileSync(join(dir, 'README.md'), '# p364 scratch\n');
  const a = gitRun(['init', '-q'], home, dir);
  const b = gitRun(['add', '-A'], home, dir);
  const c = gitRun(['commit', '-q', '-m', 'p364 scratch'], home, dir);
  if (a.status !== 0 || b.status !== 0 || c.status !== 0) throw new Error(`git in ${dir}: ${String(c.stderr ?? b.stderr ?? a.stderr ?? '').slice(0, 200)}`);
  return realpathSync(dir);
}
/** The stand-ins' folder on the scratch login shell's PATH (probe:p365's shape), and its precondition: the bare name resolves there. */
function standInPath(p, names) {
  const line = `export PATH="${p.bin}:$PATH"\nexport HISTFILE=/dev/null\n`;
  for (const f of ['.profile', '.zprofile', '.zshrc', '.bashrc']) writeFileSync(join(p.home, f), line);
  writeFileSync(join(p.home, '.hushlogin'), '');
  const out = {};
  for (const name of names) {
    const r = spawnSync('/bin/sh', ['-lic', `command -v ${name}`], { encoding: 'utf8', timeout: 30_000, env: { ...process.env, HOME: p.home, ZDOTDIR: p.home, HISTFILE: '/dev/null', SHELL: '/bin/sh', TERM_SESSION_ID: undefined, TERM_PROGRAM: undefined } });
    out[name] = (String(r.stdout ?? '').trim().split('\n').pop() ?? '') === join(p.bin, name);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The app, over its renderer
// ---------------------------------------------------------------------------

const devtoolsPort = (p) => {
  try {
    return Number(readFileSync(join(p.profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
  } catch {
    return 0;
  }
};
/**
 * A promise raced against the launch's own end. build/cdp-client.mjs does not
 * reject a pending call when its socket closes (the call waits out its whole
 * timeout), and every launch here can end under a call: the recorder's SIGKILL
 * on the line, the handler's exit 139, the will-quit SIGKILL. The losing
 * call's later rejection is handled by the race, so it never reaches
 * build/electron-run.mjs's unhandledRejection net.
 */
const raceExit = (handle, promise) => Promise.race([promise, handle.exited.then(() => Promise.reject(new Error('the app ended under the call')))]);
/** One renderer evaluation, raced against the launch's end. */
const evalLive = (handle, win, expr, ms = 90_000) => raceExit(handle, cdpEval(win, expr, ms));
/** The main window's renderer over CDP once the bridge is up, or null when the process ended first. */
async function attachWindow(p, handle, timeoutMs = 120_000) {
  let ended = false;
  void handle.exited.then(() => {
    ended = true;
  });
  const started = Date.now();
  for (;;) {
    if (ended) return null;
    const port = devtoolsPort(p);
    if (port > 0) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) {
          const cdp = await raceExit(handle, wsConnect(picked.target.webSocketDebuggerUrl));
          await raceExit(handle, cdp.call('Runtime.enable'));
          for (let i = 0; i < 200 && !ended; i += 1) {
            if ((await evalLive(handle, cdp, "typeof window.gmux === 'object' && typeof window.gmux.sessions === 'object'", 30_000)) === true) return cdp;
            await sleep(150);
          }
        }
      } catch {
        /* not up yet, or the process ended under the call */
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(150);
  }
}
const listExpr = 'window.gmux.sessions.list().then((l) => JSON.stringify({ ok: true, ids: l.map((s) => s.id) }), (e) => JSON.stringify({ ok: false, error: String(e && e.message).slice(0, 200) }))';
async function listOf(handle, win) {
  try {
    const o = JSON.parse(await evalLive(handle, win, listExpr, 60_000));
    return { ok: o.ok === true, ids: Array.isArray(o.ids) ? o.ids : [], count: Array.isArray(o.ids) ? o.ids.length : 0 };
  } catch (err) {
    return { ok: false, ids: [], count: 0, why: String(err?.message ?? err).slice(0, 200) };
  }
}
/** `n` reads of the session list from the window, in one evaluation: at least one walk each in the test variant. */
const pump = (handle, win, n) => evalLive(handle, win, `(async () => { let k = 0; for (let i = 0; i < ${String(n)}; i += 1) { try { await window.gmux.sessions.list(); k += 1; } catch (e) { /* counted below */ } } return k; })()`, 600_000);
const ask = (trigger, action, state) => {
  state.seq = (state.seq ?? 0) + 1;
  writeFileSync(`${trigger}.tmp`, J({ seq: state.seq, action }));
  renameSync(`${trigger}.tmp`, trigger);
};
/**
 * SIGKILL one pid this run started, and only after `ps -p` reads its command
 * line again and finds this launch's own scratch profile in it (the hard
 * rules). Used by the feed guard alone, for a packaged app, whose pid IS the
 * app (never the shim's).
 */
function killOwn(pid, profile) {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  const r = spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8', timeout: 10_000 });
  if (!String(r.stdout ?? '').includes(`--user-data-dir=${profile}`)) return false;
  try {
    process.kill(pid, 'SIGKILL');
    return true;
  } catch {
    return false;
  }
}
/** The agents' reading of one launch: the overlay written before it, and the check's answer where the check could be read. */
const agentsOf = (entry) => ({ overlay: entry?.overlay === true, window: entry?.agentsOk === true || entry?.agentsOk === false, ok: entry?.agentsOk ?? null });
async function waitFor(test, ms, every = 100) {
  const until = Date.now() + ms;
  for (;;) {
    const v = test();
    if (v) return v;
    if (Date.now() >= until) return null;
    await sleep(every);
  }
}
/**
 * Every variable a crash dump would carry, and every one that would steer a
 * launch, taken out of its environment (p365's overlay, widened): tokens and
 * signing values, a tmux client's own TMUX and TMUX_PANE (never TMUX_TMPDIR,
 * which is where this run's -L socket lives, for the app and for this file
 * alike), a pane's GMUX_SESSION_ID and GMUX_MANAGED and every other inherited
 * GMUX_* (each launch sets its own after this), and the plant's and the
 * checker's variables (a launch sets the ones it means).
 */
function strippedOverlay() {
  const out = {};
  for (const k of Object.keys(process.env)) {
    if (/^(CLAUDE|CSC_|APPLE_|GMUX_|P358ADV_|P364_|P3571_|TORTIE_)/.test(k) || k === 'TMUX' || k === 'TMUX_PANE') out[k] = undefined;
  }
  for (const k of ['GH_TOKEN', 'GITHUB_TOKEN', 'SSH_AUTH_SOCK', 'SECURITYSESSIONID', 'TERM_SESSION_ID', 'TERM_PROGRAM', 'TERM_PROGRAM_VERSION', 'CODEX_HOME', 'ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS']) out[k] = undefined;
  return out;
}

/** main's inspector line, which Node prints on stderr when --inspect-brk=0 picks its port. */
export const INSPECTOR_LINE = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/;
/**
 * THE INSTRUMENTS IN A PACKAGED APP (the fix round; both lenses). A packaged
 * Electron drops `--require` from NODE_OPTIONS ("Most NODE_OPTIONs are not
 * supported in packaged apps"), so the hook, the tracker and the recorder never
 * went into a packaged launch, and M1n, M1, M2a, M2b, U and P read UNREADABLE
 * by construction. A packaged launch is started with `--inspect-brk=0` instead
 * (its EnableNodeCliInspectArguments fuse is on, build/p366/SPEC.md §2.4): main
 * waits at its first line for a debugger, and this function, the debugger,
 * loads each file in order through `createRequire` on the paused frame, so it
 * runs before Tortie's main exactly as `--require` does in a development
 * build, then resumes main and leaves. It evaluates nothing else. Measured
 * first on a scratch app in this checkout's Electron (the instrument ran, then
 * the app's main, with the instrument's global set).
 */
async function inspectorBootstrap(handle, files, timeoutMs = 30_000) {
  const until = Date.now() + timeoutMs;
  let url = null;
  while (url === null) {
    const m = INSPECTOR_LINE.exec(handle.text());
    if (m !== null) url = m[1];
    else if (handle.child.exitCode !== null || handle.child.signalCode !== null) throw new Error('the app ended before its inspector listened');
    else if (Date.now() > until) throw new Error(`main printed no inspector line in ${String(timeoutMs / 1000)} s`);
    else await sleep(25);
  }
  const cdp = await raceExit(handle, wsConnect(url, { collect: ['Debugger.paused'] }));
  try {
    await raceExit(handle, cdp.call('Runtime.enable', {}, 10_000));
    await raceExit(handle, cdp.call('Debugger.enable', {}, 10_000));
    await raceExit(handle, cdp.call('Runtime.runIfWaitingForDebugger', {}, 10_000));
    while (cdp.events().length === 0) {
      if (Date.now() > until) throw new Error('main never paused at its first line');
      await sleep(10);
    }
    const frame = cdp.events()[0].params?.callFrames?.[0]?.callFrameId;
    if (typeof frame !== 'string') throw new Error('main paused with no call frame');
    for (const f of files) {
      const r = await raceExit(handle, cdp.call('Debugger.evaluateOnCallFrame', { callFrameId: frame, expression: `void process.getBuiltinModule('node:module').createRequire(${J(f)})(${J(f)})`, returnByValue: true }, 10_000));
      const thrown = r?.result?.exceptionDetails;
      if (thrown) throw new Error(`${basename(f)} threw as it loaded: ${String(thrown.exception?.description ?? thrown.text).slice(0, 300)}`);
    }
    await raceExit(handle, cdp.call('Debugger.resume', {}, 10_000));
  } finally {
    cdp.close();
  }
  return { how: 'inspector', files: files.map((f) => basename(f)) };
}

/**
 * ONE app launch through withElectron. `app` is { role, packaged, program, cwd }:
 * a packaged app runs its binary by absolute path; a development build runs the
 * shim in its checkout. `opts`: `hook` (a built better-sqlite3 for the hook),
 * `plant` ({ kind, file, readonly, at }), `tracker`, `killOnLine`, `dialogs`,
 * `standIns`. `body(handle, ctx)` runs while it lives; ctx.window() attaches
 * the renderer (null when the process ended first), ctx.ask(action) presses
 * through the recorder. Everything the launch left is read after the teardown.
 */
async function launchApp(label, app, p, opts, body) {
  for (const d of [p.profile, p.home]) mkdirSync(d, { recursive: true });
  const files = launchFiles(p, label);
  for (const f of Object.values(files)) rmSync(f, { force: true });
  writeFileSync(p.recorder, recorderText(), { mode: 0o600 });
  // `instruments: false` (C alone): nothing loaded into main, as the cost was measured, and no inspector.
  const requires = [];
  if (opts.instruments !== false) {
    if (opts.hook) requires.push(HOOK);
    if (opts.tracker) {
      writeFileSync(p.trackerFile, trackerText(), { mode: 0o600 });
      requires.push(p.trackerFile);
    }
    requires.push(p.recorder);
  } else if (opts.hook || opts.tracker || opts.plant) {
    throw new Error(`${label}: a launch with no instruments takes no hook, tracker or plant`);
  }
  // A packaged app drops --require from NODE_OPTIONS; its instruments go in through main's inspector (inspectorBootstrap).
  const viaInspector = app.packaged === true && requires.length > 0;
  const standIns = opts.standIns ?? [];
  writeHiddenAgents(p.profile, 'p364', hiddenAgentsBesides(standIns));
  const dev = app.packaged !== true;
  if (dev) {
    const pre = preflightStandin(standin, standin.binPath);
    if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
    const dnsPre = await dns.preflight(dns.servers);
    if (!dnsPre.ok || !loopbackOnlyServers(dns.servers)) throw new Error(`the DNS preflight refused: ${(dnsPre.problems ?? []).join('; ')}`);
  }
  const refuser = join(RUN, 'no-tailscale.sh');
  if (!existsSync(refuser)) writeFileSync(refuser, '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const plant = opts.plant ?? null;
  const env = withoutDevRenderer({
    ...strippedOverlay(),
    HOME: p.home,
    ZDOTDIR: p.home,
    HISTFILE: '/dev/null',
    SHELL: '/bin/sh',
    SHELL_SESSION_HISTORY: '0',
    GMUX_TMUX_SOCKET: SOCKET,
    GMUX_PROBES: '1',
    GMUX_LOG_FILE: '1',
    GMUX_SPECSTORY_NO_CLOUD: '1',
    GMUX_HARNESS_DIR: HARNESS_DIR,
    GMUX_TAILSCALE_BIN: dev ? standin.binPath : refuser,
    ...(dev ? { [NAME_SERVERS_VAR]: dns.servers } : {}),
    ...(app.packaged === true ? { GMUX_UPDATE_REHEARSAL: '1', TORTIE_UPDATE_FEED: feed.url } : {}),
    NODE_OPTIONS: viaInspector || requires.length === 0 ? undefined : requires.map((f) => `--require=${f}`).join(' '),
    P364_EVENTS: files.events,
    P364_TRIGGER: files.trigger,
    P364_APP_LOG: p.appLog,
    P364_KILL_ON_LINE: opts.killOnLine === true ? '1' : undefined,
    P364_DIALOGS: opts.dialogs === true ? 'record' : undefined,
    P364_TRACKER: opts.tracker ? files.tracker : undefined,
    ...(opts.hook ? { P358ADV_BS3: opts.hook } : {}),
    // The plant's variables, and the test variant's own SIGSEGV report, only ever with the test variant.
    ...(opts.hook === TEST_BS3 ? { P358ADV_SEGV_EXIT: '1' } : {}),
    ...(plant !== null ? { P358ADV_PLANT: plant.kind, P358ADV_PLANT_AT: String(plant.at), P358ADV_PLANT_FILE: plant.file, P358ADV_PLANT_READONLY: String(plant.readonly) } : {}),
    // M2b alone (the fix round): a cache of twenty lines or fewer holds none SQLite allocated on its own, so the crash
    // state takes a line of its bulk block there (the overview store, the symbol index and OpenCode's reader, lens B).
    ...(plant !== null && plant.bulk === true ? { P358ADV_PLANT_BULK: '1' } : {})
  });
  if (plant !== null && opts.hook !== TEST_BS3) throw new Error(`${label}: a plant needs the test variant by the hook`);
  const before = reportNames();
  feed.current = label;
  // startedAt is taken before withElectron's own bookkeeping, so a life measured from it is never shorter than the app's.
  const entry = { label, role: app.role, packaged: app.packaged === true, overlay: true, files, feedHeld: null, agentsOk: null, appPid: 0, startedAt: Date.now() };
  launches.push(entry);
  const state = {};
  let handleRef = null;
  try {
    return await withElectron(
      {
        label: `p364-${label}`,
        userDataDir: p.profile,
        program: app.program,
        // A packaged app runs in its own run folder, never in this checkout; a development build in its checkout.
        cwd: app.cwd ?? p.base,
        tmuxSocket: opts.tmuxSocket === undefined ? SOCKET : opts.tmuxSocket,
        args: ['--remote-debugging-port=0', '--use-mock-keychain', ...(viaInspector ? ['--inspect-brk=0'] : [])],
        env,
        graceMs: 8_000
      },
      async (handle) => {
        handleRef = handle;
        shims.add(handle.pid);
        // Before anything else: main is waiting at its first line for exactly this.
        if (viaInspector) entry.instruments = await inspectorBootstrap(handle, requires);
        else entry.instruments = { how: requires.length === 0 ? 'none' : 'NODE_OPTIONS', files: requires.map((f) => basename(f)) };
        const appNow = () => {
          try {
            const a = handle.appPid();
            if (a > 0) {
              apps.add(a);
              entry.appPid = a;
            }
            return a;
          } catch {
            return 0;
          }
        };
        appNow();
        // THE FEED GUARD (SPEC §0): a packaged launch whose app.log has not said
        // the loopback feed was accepted, or that updates are off, by 20 s is
        // ended there, before its first check at 30 s could ask a real host.
        let guard = Promise.resolve();
        if (app.packaged === true) {
          guard = (async () => {
            const until = Date.now() + FEED_GUARD_MS;
            let ended = false;
            void handle.exited.then(() => {
              ended = true;
            });
            while (Date.now() < until && !ended) {
              const answer = ownFeedAnswer(appLogLines(p), entry.appPid);
              if (answer !== null) {
                entry.feedHeld = answer;
                return;
              }
              await sleep(250);
            }
            if (ended) {
              entry.feedHeld = 'exited';
              return;
            }
            entry.feedHeld = 'ended';
            say(`${label}: the update feed was not held by ${String(FEED_GUARD_MS / 1000)} s; ending the launch before its first check`);
            ask(files.trigger, 'kill-self', state);
            // The recorder may be the very thing that did not go in: this run's own pid, read again first.
            await Promise.race([handle.exited, sleep(2_000)]);
            if (!ended) entry.feedKilled = killOwn(handle.pid, resolve(p.profile));
            // The guard's effect, not its attempt (the probe review): when the process was seen to end, or null.
            const gone = await Promise.race([handle.exited.then(() => Date.now()), sleep(5_000).then(() => null)]);
            entry.feedEndedMs = gone === null ? null : gone - entry.startedAt;
          })();
        }
        const ctx = {
          entry,
          files,
          appPid: appNow,
          ask: (action) => ask(files.trigger, action, state),
          /**
           * The renderer, once the bridge is up, after agents:list answered
           * nothing but the stand-ins; null when the process ended before the
           * check could be read (a fresh connection that faults at boot).
           */
          window: async () => {
            const win = await attachWindow(p, handle);
            appNow();
            if (win === null) return null;
            let list;
            try {
              list = JSON.parse(await evalLive(handle, win, AGENTS_LIST_EXPR, 120_000));
            } catch (err) {
              if (handle.child.exitCode !== null || handle.child.signalCode !== null) return null;
              throw err;
            }
            const agents = standInsOnlyVerdict(list, { standIns, under: standIns.length > 0 ? p.bin : null });
            entry.agentsOk = agents.ok;
            agentsHeld.push(agents.ok);
            if (!agents.ok) throw new Error(`an agent resolved: ${agents.said}`);
            return win;
          }
        };
        try {
          return await body(handle, ctx);
        } finally {
          await guard.catch(() => undefined);
        }
      }
    );
  } catch (err) {
    const why = String(err?.message ?? err);
    if (why.includes(CENSUS_WORDS)) censusFindings.push(`${label}: ${why.slice(0, 300)}`);
    throw err;
  } finally {
    entry.started = handleRef !== null;
    // A launch withElectron refused before any spawn ran nothing, so it asked no feed and armed nothing.
    if (!entry.started && entry.feedHeld === null) entry.feedHeld = 'never-started';
    entry.exitCode = handleRef?.child?.exitCode ?? null;
    entry.signal = handleRef?.child?.signalCode ?? null;
    entry.dumps = sweepDumps(label, p.profile);
    const after = reportNames();
    const added = reportsAddedOf(before, after);
    if (added.added.length > 0) (report.printed.reportsAdded ??= []).push({ label, added: added.added });
    if (app.role === 'diagnostic' && entry.started) {
      const al = appLogOf(appLogLines(p));
      const pid = String(entry.appPid);
      diagLaunches.push({ label, appPid: entry.appPid, armed: al.armedByPid[pid] ?? 0, armedOk: al.armedOk, noChecker: al.noCheckerByPid[pid] ?? 0 });
    }
  }
}
/** How a launch ended, read after its teardown (a packaged app is its own pid; the shim's line says a dev build's signal). */
const endOf = (handle) => ({ code: handle?.child?.exitCode ?? null, signal: handle?.child?.signalCode ?? null });
/** Press the menu's Quit row in main and wait for the process to end; answers the press-to-end time, or null. */
async function quitByMenu(ctx, handle) {
  const at = Date.now();
  ctx.ask('menu-quit');
  const end = await Promise.race([handle.exited.then(() => Date.now()), sleep(90_000).then(() => null)]);
  await sleep(800);
  return end === null ? null : end - at;
}

// ---------------------------------------------------------------------------
// The apps the arms launch
// ---------------------------------------------------------------------------

const DIAG = { role: 'diagnostic', packaged: true, program: DIAG_APP };
const NORMAL = { role: 'normal', packaged: true, program: NORMAL_APP };
const PARENT = { role: 'parent', packaged: true, program: PARENT_APP };
const plantOf = (kind, target, at) => ({ kind, file: target.file, readonly: target.readonly, at: at ?? target.at });

// ---------------------------------------------------------------------------
// R: the reproduction, in a scratch no-window app in this checkout's Electron
// ---------------------------------------------------------------------------

async function armR() {
  const dir = join(RUN, 'R', 'app');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), `${J({ name: 'p364-arm', version: '0.0.0', private: true, main: 'main.js' })}\n`);
  writeFileSync(join(dir, 'main.js'), armAppMainText());
  writeFileSync(join(dir, 'arm.cjs'), armAppArmText());
  let dumps = 0;
  const one = async (kind) => {
    const base = join(RUN, 'R', kind);
    const profile = join(base, 'profile');
    const home = join(base, 'home');
    for (const d of [profile, home]) mkdirSync(d, { recursive: true });
    const before = reportNames();
    feed.current = `R-${kind}`;
    let out = { text: '', code: null };
    try {
      await withElectron(
        {
          label: `p364-R-${kind}`,
          userDataDir: profile,
          program: 'app',
          cwd: dir,
          tmuxSocket: SOCKET,
          env: {
            ...strippedOverlay(),
            HOME: home,
            ZDOTDIR: home,
            HISTFILE: '/dev/null',
            SHELL: '/bin/sh',
            GMUX_TMUX_SOCKET: SOCKET,
            // The harness term build/electron-run.mjs asks for beside a socket; the arm app reads neither.
            GMUX_PROBES: '0',
            GMUX_HARNESS_DIR: HARNESS_DIR,
            P364_HOOK: HOOK,
            P358ADV_BS3: TEST_BS3,
            P358ADV_PLANT: kind,
            P358ADV_PLANT_AT: '200',
            P358ADV_SEGV_EXIT: '1',
            ARM: kind,
            ARM_DIR: join(base, 'db')
          },
          graceMs: 5_000
        },
        async (handle) => {
          shims.add(handle.pid);
          apps.add(handle.pid);
          await Promise.race([handle.exited, sleep(120_000)]);
          await sleep(800);
          out = { text: handle.text(), code: handle.child.exitCode ?? null };
        }
      );
    } finally {
      dumps += sweepDumps(`R-${kind}`, profile);
      const added = reportsAddedOf(before, reportNames());
      if (added.added.length > 0) (report.printed.reportsAdded ??= []).push({ label: `R-${kind}`, added: added.added });
    }
    report.printed[`R-${kind}-tail`] = out.text.split('\n').filter((l) => /P364-|p358adv-(ARMED|PLANT|SEGV)/.test(l)).slice(0, 8);
    return out;
  };
  const cs = await one('crash-state');
  const pz = await one('page-zero');
  return composeR({ cs, pz, expected: ELECTRON_VERSION, dumps });
}

// ---------------------------------------------------------------------------
// M1n and M1: Method 1, the normal app first, then the diagnostic app planted
// ---------------------------------------------------------------------------

async function armM1n() {
  const app = PARENT_APP !== '' ? PARENT : NORMAL;
  const p = paths('M1n');
  const seeded = seed(p);
  const reading = { app: app.role, seeded: { listed: seeded.listed } };
  await launchApp('M1n', app, p, { tracker: false }, async (handle, ctx) => {
    const win = await ctx.window();
    if (win === null) throw new Error('the window never came');
    reading.list = await listOf(handle, win);
    for (let i = 0; i < 20; i += 1) await listOf(handle, win);
    reading.quitMs = await quitByMenu(ctx, handle);
    const e = endOf(handle);
    const c = checkerTextOf(handle.text());
    const rec = recorderOf(linesOf(ctx.files.events));
    reading.agents = agentsOf(ctx.entry);
    reading.recorder = { hooked: rec.hooked };
    reading.about = rec.about;
    reading.quit = { pressed: rec.menuQuit.pressed, willQuit: rec.willQuit, signal: e.signal ?? c.shimSignal, segv: c.segv.seen, wedged: c.wedged };
  });
  const al = appLogOf(appLogLines(p));
  reading.appLog = { lines: al.lines, diagnosticScope: al.diagnosticScope, diagnosticEvents: al.diagnosticEvents };
  return reading;
}

/** M1 and its relaunch. Answers M1's reading and M2b-session-list's, both from the planted launch. */
async function armM1() {
  const target = M2B_TARGETS['session-list'];
  const p = paths('M1');
  const seeded = seed(p);
  let text = '';
  let end = { code: null, signal: null };
  let listAfterPlant = { ok: false, count: 0, ids: [] };
  let quitMs = null;
  let first = null;
  await launchApp('M1', DIAG, p, { hook: TEST_BS3, tracker: true, plant: plantOf('crash-state', target, M1_AT) }, async (handle, ctx) => {
    first = ctx.entry;
    const win = await ctx.window();
    if (win === null) throw new Error('the window never came');
    // The plant lands at walk 40, during the boot; the line is in app.log before the window is up.
    await waitFor(() => appLogOf(appLogLines(p)).pcache > 0, 60_000, 200);
    listAfterPlant = await listOf(handle, win);
    for (let i = 0; i < 20; i += 1) await listOf(handle, win);
    quitMs = await quitByMenu(ctx, handle);
    text = handle.text();
    end = endOf(handle);
  });
  const planted = composePlanted({ kind: 'crash-state', target, manifest: p.manifest, home: p.home, text, code: end.code, signal: end.signal, appLogLines: appLogLines(p), trackerLines: linesOf(first.files.tracker), recorderLines: linesOf(first.files.events), dumps: first.dumps ?? null, agents: agentsOf(first) });
  const firstPcache = planted.appLog.pcache;
  const c = checkerTextOf(text);
  // THE RELAUNCH: the diagnostic app as he would run it, its own diagnostic .node, no hook and no plant.
  const relaunch = { ran: false };
  let second = null;
  try {
    await launchApp('M1-relaunch', DIAG, p, { tracker: false }, async (handle, ctx) => {
      second = ctx.entry;
      const win = await ctx.window();
      if (win === null) throw new Error('the relaunch’s window never came');
      const l = await listOf(handle, win);
      relaunch.sameIds = l.ok === true && sameIdSet(listAfterPlant.ids, l.ids);
      relaunch.listed = l.count;
      await quitByMenu(ctx, handle);
      relaunch.ran = true;
    });
  } catch (err) {
    relaunch.why = String(err?.message ?? err).slice(0, 300);
  }
  const al = appLogOf(appLogLines(p));
  relaunch.pcache = al.pcache - firstPcache;
  relaunch.unclean = al.unclean;
  report.printed['M1-relaunchArmed'] = al.armedByPid[String(second?.appPid ?? 0)] ?? 0;
  const rec = recorderOf(linesOf(first.files.events));
  const m1 = {
    ...planted,
    seeded: { listed: seeded.listed },
    recorder: { hooked: planted.recorder.hooked },
    listAfterPlant: { ok: listAfterPlant.ok, count: listAfterPlant.count },
    quit: { pressed: rec.menuQuit.pressed, willQuit: planted.recorder.willQuit, signal: end.signal ?? c.shimSignal, segv: c.segv.seen, wedged: c.wedged, ms: quitMs },
    relaunch
  };
  // M2b's session list is this same launch (SPEC §8, one launch per connection, and this one is M1's).
  return { m1, sessionList: planted };
}

// ---------------------------------------------------------------------------
// M2a: research 143 §5's three shapes in the session list's own connection
// ---------------------------------------------------------------------------

async function armM2a(kind) {
  const target = M2B_TARGETS['session-list'];
  const p = paths(`M2a-${kind}`);
  seed(p);
  let text = '';
  let end = { code: null, signal: null };
  let entry = null;
  await launchApp(`M2a-${kind}`, DIAG, p, { hook: TEST_BS3, tracker: true, killOnLine: true, plant: plantOf(kind, target, M2A_AT) }, async (handle, ctx) => {
    entry = ctx.entry;
    const win = await ctx.window();
    // The pump takes the walk count past the plant; the recorder ends the process on the line.
    if (win !== null) await pump(handle, win, M2A_PUMP).catch(() => null);
    await Promise.race([handle.exited, sleep(60_000)]);
    await sleep(800);
    text = handle.text();
    end = endOf(handle);
  });
  return composePlanted({ kind, target, manifest: p.manifest, home: p.home, text, code: end.code, signal: end.signal, appLogLines: appLogLines(p), trackerLines: linesOf(entry.files.tracker), recorderLines: linesOf(entry.files.events), dumps: entry.dumps ?? null, agents: agentsOf(entry) });
}

// ---------------------------------------------------------------------------
// M2b: the crash state in each main-process connection (SPEC §3)
// ---------------------------------------------------------------------------

async function armM2b(id) {
  const target = M2B_TARGETS[id];
  const p = paths(`M2b-${id}`);
  for (const d of [p.home, p.bin, p.proj]) mkdirSync(d, { recursive: true });
  seed(p);
  const standIns = id === 'codex-state' ? ['codex'] : id === 'opencode' ? ['opencode'] : [];
  if (id === 'codex-state') {
    scratchStore(join(p.home, '.codex', 'state_5.sqlite'), CODEX_STORE_SQL, p.home);
    mkdirSync(join(p.home, '.codex', 'sessions'), { recursive: true });
    writeFileSync(join(p.bin, 'codex'), standinCodexText(join(p.home, '.codex'), 'p364-codex-id'), { mode: 0o755 });
    writeFileSync(join(p.proj, 'p364-codex-id'), '0199a364-0000-7000-8000-000000000364');
  }
  if (id === 'opencode') {
    scratchStore(join(p.home, '.local', 'share', 'opencode', 'opencode.db'), OPENCODE_STORE_SQL, p.home);
    writeFileSync(join(p.bin, 'opencode'), standinOpencodeText(), { mode: 0o755 });
  }
  if (standIns.length > 0) {
    const resolved = standInPath(p, standIns);
    if (!standIns.every((n) => resolved[n] === true)) throw new Error(`the scratch login shell does not resolve ${standIns.join(', ')} to the stand-in`);
  }
  const repo = id === 'arch' || id === 'symbols' || id === 'overview' || id === 'ring-snapshot' ? scratchRepo(join(p.repos, 'r0'), p.home) : realpathSync(p.proj);
  let text = '';
  let end = { code: null, signal: null };
  let entry = null;
  const drive = { what: null, ok: null };
  await launchApp(`M2b-${id}`, DIAG, p, { hook: TEST_BS3, tracker: true, killOnLine: !target.fresh, plant: { ...plantOf('crash-state', target), bulk: target.bulk === true }, standIns }, async (handle, ctx) => {
    entry = ctx.entry;
    const win = await ctx.window();
    if (win !== null && !target.fresh) {
      drive.what = id;
      const call = {
        'codex-state': `window.gmux.projects.add(${J(repo)}).then(() => window.gmux.sessions.create({ name: 'p364-codex', projectPath: ${J(repo)}, agent: 'codex' })).then(() => true, (e) => String(e && e.message).slice(0, 200))`,
        overview: `window.gmux.projects.add(${J(repo)}).then(() => window.gmux.overview.project({ projectPath: ${J(repo)} })).then(() => true, (e) => String(e && e.message).slice(0, 200))`,
        arch: `window.gmux.projects.add(${J(repo)}).then(() => window.gmux.arch.load({ cwd: ${J(repo)} })).then(() => true, (e) => String(e && e.message).slice(0, 200))`,
        symbols: `window.gmux.projects.add(${J(repo)}).then(() => window.gmux.symbols.ensure(${J(repo)})).then(() => true, (e) => String(e && e.message).slice(0, 200))`
      }[id];
      if (call !== undefined) drive.ok = await evalLive(handle, win, call, 120_000).catch((err) => String(err?.message ?? err).slice(0, 200));
      // A held connection: walks go on at every later entry; a few reads of the list make them.
      const until = Date.now() + 60_000;
      while (Date.now() < until && appLogOf(appLogLines(p)).pcache === 0) {
        await listOf(handle, win);
        await sleep(250);
      }
    } else if (win !== null && id === 'ring-snapshot') {
      drive.what = 'the quit generation, past the pump';
      drive.pumped = await pump(handle, win, RING_PUMP).catch(() => null);
      drive.ok = await evalLive(handle, win, `window.gmux.projects.add(${J(repo)}).then(() => window.gmux.sessions.create({ name: 'p364-ring', projectPath: ${J(repo)}, agent: 'shell' })).then(() => true, (e) => String(e && e.message).slice(0, 200))`, 60_000).catch(() => null);
      await sleep(2_000);
      ctx.ask('menu-quit');
    } else if (win !== null && id === 'opencode') {
      drive.what = 'opencode';
      drive.ok = await evalLive(handle, win, `window.gmux.projects.add(${J(repo)}).then(() => window.gmux.sessions.create({ name: 'p364-opencode', projectPath: ${J(repo)}, agent: 'opencode' })).then(() => true, (e) => String(e && e.message).slice(0, 200))`, 60_000).catch(() => null);
    }
    // The boot's fresh connections (integrity, ring-evidence) fault before or as the window comes; the
    // driven ones (the quit generation, the OpenCode reader) after their drive. A held connection's line
    // ended the process already (the recorder's SIGKILL), or never came in its minute.
    await Promise.race([handle.exited, sleep(target.fresh ? 120_000 : 3_000)]);
    await sleep(1_000);
    text = handle.text();
    end = endOf(handle);
  });
  report.printed[`M2b-${id}-drive`] = drive;
  return composePlanted({ kind: 'crash-state', target, home: p.home, text, code: end.code, signal: end.signal, appLogLines: appLogLines(p), trackerLines: linesOf(entry.files.tracker), recorderLines: linesOf(entry.files.events), dumps: entry.dumps ?? null, agents: agentsOf(entry) });
}

// ---------------------------------------------------------------------------
// U: the update feed, the normal app and then the diagnostic app
// ---------------------------------------------------------------------------

async function armU() {
  const one = async (label, app) => {
    const p = paths(label);
    const out = { ranMs: 0, pressed: false, requests: null };
    const started = Date.now();
    let entry = null;
    await launchApp(label, app, p, { dialogs: true }, async (handle, ctx) => {
      entry = ctx.entry;
      const win = await ctx.window();
      if (win === null) throw new Error('the window never came');
      while (Date.now() - started < U_WAIT_MS) {
        if (handle.child.exitCode !== null || handle.child.signalCode !== null) break;
        await sleep(500);
      }
      out.ranMs = Date.now() - started;
      // Pressed only once the recorder said its message-box wrap took, so no box is ever drawn on his screen.
      const wrapped = recorderOf(linesOf(ctx.files.events)).dialogsWrapped;
      if (wrapped && handle.child.exitCode === null && handle.child.signalCode === null) {
        ctx.ask('menu-check');
        await sleep(6_000);
      }
      if (handle.child.exitCode === null && handle.child.signalCode === null) await quitByMenu(ctx, handle);
    });
    const fields = {
      ranMs: out.ranMs,
      requests: feedCount(label),
      appUpdateYml: existsSync(join(appBundleOf(app.program) ?? '/nonexistent', 'Contents', 'Resources', 'app-update.yml'))
    };
    return composeUSide({ side: 'x', fields, recorderLines: linesOf(entry.files.events), appLogLines: appLogLines(p) }).x;
  };
  const normal = await one('U-normal', NORMAL);
  const diag = await one('U-diagnostic', DIAG);
  return { normal, diag };
}

// ---------------------------------------------------------------------------
// P: the packaged diagnostic itself
// ---------------------------------------------------------------------------

async function armP() {
  const bundle = appBundleOf(DIAG_APP);
  const packed = join(bundle ?? '/nonexistent', PACKED_NODE_REL);
  const node = { found: existsSync(packed), sha256: sha256Of(packed), expectedSha256: DIAG_NODE === '' ? null : sha256Of(DIAG_NODE), shippedSha256: sha256Of(SHIPPED_NODE), plantStrings: null, plantLines: null, nm: { ran: false, sigaction: null }, checkerStrings: null };
  if (node.found) {
    const bytes = readFileSync(packed);
    node.plantStrings = occurrences(bytes, 'P358ADV');
    node.plantLines = occurrences(bytes, '[p358adv-');
    node.checkerStrings = occurrences(bytes, 'TORTIE_CHECKER') > 0 && occurrences(bytes, 'diagnostic.pcache') > 0 && occurrences(bytes, 'tortie-guard-364') > 0;
    const nm = spawnSync('/usr/bin/nm', ['-u', packed], { encoding: 'utf8', timeout: 60_000, maxBuffer: 32 * 1024 * 1024 });
    node.nm = { ran: nm.status === 0, sigaction: nm.status === 0 ? nmImportsSigaction(String(nm.stdout ?? '')) : null };
  }
  const plist = spawnSync('/usr/bin/plutil', ['-extract', 'CFBundleIdentifier', 'raw', '-o', '-', join(bundle ?? '/nonexistent', 'Contents', 'Info.plist')], { encoding: 'utf8', timeout: 20_000 });
  // P's own launch: the diagnostic app as he runs it, its armed line and About's options from main.
  const p = paths('P');
  seed(p);
  let entry = null;
  await launchApp('P', DIAG, p, {}, async (handle, ctx) => {
    entry = ctx.entry;
    const win = await ctx.window();
    if (win === null) throw new Error('the window never came');
    await quitByMenu(ctx, handle);
  });
  const rec = recorderOf(linesOf(entry.files.events));
  return {
    node,
    about: { ...rec.about, packageVersion: PACKAGE_VERSION },
    bundleId: plist.status === 0 ? String(plist.stdout ?? '').trim() : null,
    launches: { count: diagLaunches.length, armedOnce: diagLaunches.filter((l) => l.armed === 1 && l.armedOk === true).length, noChecker: diagLaunches.reduce((n, l) => n + l.noChecker, 0) }
  };
}

// ---------------------------------------------------------------------------
// C: the cost, ABAB, his shape (SPEC §2.4's harness, by value)
// ---------------------------------------------------------------------------

async function costRun(label, app, role) {
  const p = paths(label);
  const seeded = seed(p);
  const out = { app: role, label, rows: 0, agentsOk: false, seeded: seeded.listed };
  const started = Date.now();
  // No instruments: C reads over the window alone and quits through window.gmux.quit(), so nothing is loaded into
  // main and no inspector holds its start (the cost both lenses measured, a packaged app loading nothing extra).
  await launchApp(label, app, p, { instruments: false }, async (handle, ctx) => {
    const win = await ctx.window();
    if (win === null) throw new Error('the window never came');
    out.agentsOk = ctx.entry.agentsOk === true;
    out.windowMs = Date.now() - started;
    for (;;) {
      const l = await listOf(handle, win);
      if (l.ok && l.count > 0) {
        out.rows = l.count;
        break;
      }
      if (Date.now() - started > 120_000) break;
      await sleep(25);
    }
    out.listMs = Date.now() - started;
    await evalLive(handle, win, 'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
    out.drawnMs = Date.now() - started;
    await sleep(3_000);
    const ref = JSON.parse(await evalLive(handle, win, '(async () => { const xs = []; for (let i = 0; i < 20; i += 1) { const t = performance.now(); await window.gmux.sessions.list(); xs.push(performance.now() - t); } return JSON.stringify(xs); })()', 60_000));
    ref.sort((a, b) => a - b);
    out.refreshMedianMs = Number(ref[10].toFixed(2));
    out.refreshP90Ms = Number(ref[18].toFixed(2));
    out.rssKB = rssOf(ctx.appPid());
    const q0 = Date.now();
    await evalLive(handle, win, 'window.gmux.quit().then(() => true, () => false)').catch(() => null);
    await Promise.race([handle.exited, sleep(60_000)]);
    out.quitMs = Date.now() - q0;
    await sleep(600);
    out.quitSignal = endOf(handle).signal ?? checkerTextOf(handle.text()).shimSignal;
  });
  return out;
}
async function armC() {
  const runs = [];
  for (let i = 0; i < COST_RUNS; i += 1) {
    runs.push(await costRun(`C-normal-${String(i)}`, NORMAL, 'normal'));
    runs.push(await costRun(`C-diagnostic-${String(i)}`, DIAG, 'diagnostic'));
  }
  report.printed['C-runs'] = runs;
  return composeCost(runs, { want: COST_RUNS });
}

// ---------------------------------------------------------------------------
// M2c: 20 minutes of churn on each development build
// ---------------------------------------------------------------------------

async function pocket(handle, win, method, argStr) {
  const call = argStr === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${argStr})`;
  return JSON.parse(await evalLive(handle, win, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, 120_000));
}
const forwarderPort = () => standin?.readFunnel().at(-1)?.forwarderPort ?? 0;
async function waitStatus(handle, win, test, ms) {
  const started = Date.now();
  let last = null;
  for (;;) {
    const got = await pocket(handle, win, 'status');
    last = got.ok ? got.value : null;
    if (last !== null && test(last)) return { ok: true, status: last };
    if (Date.now() - started >= ms) return { ok: false, status: last };
    await sleep(300);
  }
}
/** The phone, paired the way probe:p357 pairs (the door turned on first). */
async function pairPhone(handle, win) {
  await pocket(handle, win, 'setDoor', J({ on: true }));
  const now = await waitStatus(handle, win, (s) => (s.state === 'listening' && s.confirmState === 'confirmed') || (s.confirmable === true && s.state !== 'opening' && (s.confirmLines ?? []).some((l) => l.includes(`https://${PUBLIC_NAME}:`))), 40_000);
  if (!now.ok) return { ok: false, why: `the lines never named ${PUBLIC_NAME}` };
  if (!(now.status.state === 'listening' && now.status.confirmState === 'confirmed')) {
    const c = await pocket(handle, win, 'confirmDoor', J({ linesRead: now.status.confirmLines, hashRead: now.status.confirmHash }));
    if (!c.ok || c.value.allowed !== true) return { ok: false, why: c.ok ? `confirm allowed=${String(c.value.allowed)}` : c.error };
  }
  const ready = await waitStatus(handle, win, (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening'), 70_000);
  if (!ready.ok) return { ok: false, why: 'never pairable' };
  const offered = await pocket(handle, win, 'beginPairing');
  if (!offered.ok) return { ok: false, why: offered.error.slice(0, 200) };
  const read = readOffer(offered.value.payload);
  if (!read.ok) return { ok: false, why: `the code does not read: ${read.why}` };
  const phone = makePhone('p364 phone', read.offer.dx);
  const door = { get port() { return forwarderPort(); }, name: read.offer.host, publicPort: read.offer.port, pin: read.offer.fp };
  const paired = await pairThrough(door, read.offer, phone, {
    tries: 20,
    everyMs: 500,
    between: async () => {
      const sheet = await pocket(handle, win, 'pairingState');
      if (sheet.ok && sheet.value.state === 'presented') await pocket(handle, win, 'allowPhone', J({ linesRead: sheet.value.lines, hashRead: sheet.value.hash }));
    }
  });
  await pocket(handle, win, 'cancelPairing');
  if (!paired.ok) return { ok: false, why: `pairing answered ${J(paired.words)} (${paired.why})` };
  const first = await signedGet(phone, door, '/v1/blocked');
  return first.status === 200 ? { ok: true, phone, door } : { ok: false, why: `the first read answered ${String(first.status)}` };
}
/** M2c's diagnostic better-sqlite3 for the hook: P364_DIAG_BS3, or this checkout's package with the PACKED diagnostic module in it. */
function diagBs3() {
  if (bs3Ok(DIAG_BS3_GIVEN)) return DIAG_BS3_GIVEN;
  const dir = join(RUN, 'diag-bs3');
  rmSync(dir, { recursive: true, force: true });
  const cp = spawnSync('/bin/cp', ['-Rc', join(ROOT, 'node_modules', 'better-sqlite3'), dir], { encoding: 'utf8', timeout: 120_000 });
  if (cp.status !== 0) throw new Error(`cp -Rc better-sqlite3: ${String(cp.stderr ?? '').slice(0, 200)}`);
  rmSync(join(dir, 'build'), { recursive: true, force: true });
  mkdirSync(join(dir, 'build', 'Release'), { recursive: true });
  const packed = join(appBundleOf(DIAG_APP) ?? '/nonexistent', PACKED_NODE_REL);
  writeFileSync(join(dir, 'build', 'Release', 'better_sqlite3.node'), readFileSync(packed));
  report.printed['M2c-diagBs3'] = { dir, sha256: sha256Of(join(dir, 'build', 'Release', 'better_sqlite3.node')) };
  return dir;
}
async function churnOne(label, app, hookDir) {
  const p = paths(label);
  seed(p);
  const repos = [];
  for (let i = 0; i < 6; i += 1) repos.push(scratchRepo(join(p.repos, `r${String(i)}`), p.home));
  const out = { ran: false, minutes: 0, churn: { projects: 0, projectsRemoved: 0, shells: 0, shellsEnded: 0, phoneReads: 0, fileOps: 0, errors: 0 }, paired: false, agentsOk: false, samples: [] };
  const started = Date.now();
  let text = '';
  let end = { code: null, signal: null };
  let entry = null;
  await launchApp(label, app, p, { hook: hookDir }, async (handle, ctx) => {
    entry = ctx.entry;
    const win = await ctx.window();
    if (win === null) throw new Error('the window never came');
    out.agentsOk = ctx.entry.agentsOk === true;
    const paired = await pairPhone(handle, win).catch((err) => ({ ok: false, why: String(err?.message ?? err) }));
    out.paired = paired.ok === true;
    if (!paired.ok) report.printed[`${label}-pair`] = paired.why;
    const watched = repos[0];
    await evalLive(handle, win, `window.gmux.projects.add(${J(watched)}).then(() => true, () => false)`, 60_000);
    const until = started + CHURN_MIN * 60_000;
    let next = Date.now();
    for (let i = 1; Date.now() < until; i += 1) {
      if (handle.child.exitCode !== null || handle.child.signalCode !== null) break;
      const repo = repos[1 + (i % (repos.length - 1))];
      try {
        const projectId = await evalLive(handle, win, `window.gmux.projects.add(${J(repo)}).then((x) => (x && x.id) || null, () => null)`, 60_000);
        if (typeof projectId === 'string') out.churn.projects += 1;
        const sid = await evalLive(handle, win, `window.gmux.sessions.create({ name: 'p364-churn-${String(i)}', projectPath: ${J(repo)}, agent: 'shell' }).then((s) => s.id, () => null)`, 60_000);
        if (typeof sid === 'string') out.churn.shells += 1;
        for (let k = 0; k < 20; k += 1) {
          writeFileSync(join(watched, `churn-${String(k)}.txt`), `${String(i)}-${String(k)}\n`);
          out.churn.fileOps += 1;
        }
        await sleep(1_000);
        for (let k = 0; k < 20; k += 1) {
          rmSync(join(watched, `churn-${String(k)}.txt`), { force: true });
          out.churn.fileOps += 1;
        }
        if (out.paired) {
          for (const route of ['/v1/sessions', '/v1/blocked']) {
            const a = await signedGet(paired.phone, paired.door, route);
            if (a.status === 200) out.churn.phoneReads += 1;
          }
        }
        if (typeof sid === 'string') {
          await evalLive(handle, win, `window.gmux.sessions.kill(${J(sid)}).then(() => true, () => false)`, 60_000);
          await sleep(500);
          await evalLive(handle, win, `window.gmux.sessions.discard(${J(sid)}).then(() => true, () => false)`, 60_000);
          out.churn.shellsEnded += 1;
        }
        if (typeof projectId === 'string') {
          await evalLive(handle, win, `window.gmux.projects.remove(${J(projectId)}).then(() => true, () => false)`, 60_000);
          out.churn.projectsRemoved += 1;
        }
      } catch (err) {
        out.churn.errors += 1;
        if (out.churn.errors <= 3) (report.printed[`${label}-errors`] ??= []).push(String(err?.message ?? err).slice(0, 200));
      }
      if (Date.now() >= next) {
        out.samples.push({ at: Date.now() - started, kb: rssOf(ctx.appPid()) });
        next += 30_000;
      }
      await sleep(2_000);
    }
    out.minutes = Math.floor((Date.now() - started) / 60_000);
    // A process that ended under the churn is a FAULT to read, never a churn that did not run.
    out.endedEarly = handle.child.exitCode !== null || handle.child.signalCode !== null;
    out.ran = !out.endedEarly;
    await quitByMenu(ctx, handle);
    text = handle.text();
    end = endOf(handle);
  });
  const al = appLogOf(appLogLines(p));
  const c = checkerTextOf(text);
  out.armed = al.armed;
  out.pcache = al.pcache;
  out.events = al.events;
  out.segv = c.segv.seen;
  out.signal = end.signal ?? c.shimSignal;
  out.dumps = entry?.dumps ?? null;
  return out;
}
async function armM2c() {
  const normal = await churnOne('M2c-normal', { role: 'normal-dev', packaged: false, program: 'shim', cwd: ROOT }, null);
  const diag = await churnOne('M2c-diagnostic', { role: 'diagnostic-dev', packaged: false, program: 'shim', cwd: DIAG_CHECKOUT }, diagBs3());
  report.printed['M2c-events'] = { diag: diag.events, normal: normal.events };
  report.printed['M2c-samples'] = { diag: diag.samples, normal: normal.samples };
  return { minutes: CHURN_MIN, diag, normal, ...composeRss(diag.samples, normal.samples) };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

await openFeed();
standin = makeStandin({ dir: join(RUN, 'tailscale'), scenario: { ...DEFAULT_SCENARIO } });
dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
watch = watchForRealTailscale({ roots: () => [...shims, ...apps].filter((x) => x > 0), everyMs: 1_000 });
say(`measuring ${ROOT}; socket ${SOCKET}; arms ${[...SELECTED].join(', ') || 'none'}`);

try {
  await guarded('R', armR);
  await guarded('M1n', armM1n);
  let m1 = null;
  if (on('M1') || on('M2b-session-list')) {
    const ids = ['M1', 'M2b-session-list'].filter(on);
    const problems = ids.flatMap((id) => ARM_PROBLEMS[id] ?? []);
    if (problems.length > 0) for (const id of ids) cannotRead(id, problems.join('; '));
    else {
      try {
        m1 = await armM1();
      } catch (err) {
        for (const id of ids) cannotRead(id, `M1's launch stopped: ${String(err?.message ?? err).slice(0, 600)}`);
      }
    }
  }
  if (m1 !== null) {
    if (on('M1')) arm('M1', m1.m1);
    if (on('M2b-session-list')) arm('M2b-session-list', m1.sessionList);
  }
  for (const kind of M2A_KINDS) await guarded(`M2a-${kind}`, () => armM2a(kind));
  for (const id of M2B_TARGET_IDS) if (id !== 'session-list') await guarded(`M2b-${id}`, () => armM2b(id));
  // U and U-feed-file grade the same two launches (the probe review split the feed file out of U).
  if (on('U') || on('U-feed-file')) {
    const ids = ['U', 'U-feed-file'].filter(on);
    const problems = ids.flatMap((id) => ARM_PROBLEMS[id] ?? []);
    if (problems.length > 0) for (const id of ids) cannotRead(id, problems.join('; '));
    else {
      let u = null;
      try {
        u = await armU();
      } catch (err) {
        for (const id of ids) cannotRead(id, `the arm stopped: ${String(err?.message ?? err).slice(0, 600)}`);
      }
      if (u !== null) for (const id of ids) arm(id, u);
    }
  }
  await guarded('C', armC);
  // P after C, so "every launch armed the checker" counts every packaged diagnostic launch of the run.
  await guarded('P', armP);
  await guarded('M2c', armM2c);
} catch (err) {
  report.error = String(err?.stack ?? err);
  say(`the run stopped: ${report.error.slice(0, 300)}`);
} finally {
  const safely = (label, fn, fallback = null) => {
    try {
      return fn();
    } catch (err) {
      (report.ending ??= []).push(`${label}: ${String(err?.message ?? err)}`);
      return fallback;
    }
  };
  const leaked = watch === null ? [] : safely('the Tailscale watcher', () => watch.stop(), []);
  if (standin !== null) safely('the Tailscale stand-in', () => endStandinProcesses(standin.dir, 1_500));
  if (dns !== null) await dns.close().catch((err) => (report.ending ??= []).push(`the DNS stand-in: ${String(err?.message ?? err)}`));
  if (feed.server !== null) await new Promise((r) => feed.server.close(() => r())).catch(() => undefined);
  tmux('kill-server');
  await sleep(500);
  const after = processTable();
  const ours = [...shims, ...apps];
  // A pid of ours that is still an Electron or a Tortie (a reused pid is someone else's process).
  const electronsLeft = [...after.values()].filter((r) => ours.includes(r.pid) && /[Ee]lectron|Tortie/.test(r.command)).length;
  const serverNow = tmux('list-sessions');
  const serverRead = serverNow.status !== null;
  const serverGone = serverRead && serverNow.status !== 0 && /no server running|error connecting|No such file or directory/i.test(serverNow.err);
  const socketDir = join(process.env['TMUX_TMPDIR'] ?? '/tmp', `tmux-${String(process.getuid())}`);
  let socketNames = null;
  try {
    socketNames = readdirSync(socketDir);
  } catch {
    socketNames = null;
  }
  const sockets = socketsLeftOf(socketNames, SOCKET, (n) => n === SOCKET && tmux('list-sessions').status === 0);
  const history = { before: HISTORY_BEFORE, after: historyStat(), quiet: null };
  if (history.after !== history.before) {
    say(`his shell history moved (${history.before} to ${history.after}); starting nothing for ${String(HISTORY_QUIET_MS / 1000)} s and reading it again`);
    await sleep(HISTORY_QUIET_MS);
    history.quiet = { again: historyStat(), waitedMs: HISTORY_QUIET_MS };
  }
  const reports = reportsAddedOf(REPORTS_BEFORE, reportNames());
  report.printed.launches = launches;
  report.printed.feedRequests = feed.requests;
  report.printed.dumpsFound = dumpsFound;
  report.printed.reportsAddedOverRun = reports.added;
  arm('RUN', {
    census: censusFindings,
    processTableRead: after.size > 0,
    electronsLeft,
    serverRead,
    serverGone,
    socketsRead: sockets.read,
    socketsLeft: sockets.left,
    reports: { read: reports.read, ours: reports.ours },
    dumpsLeft,
    realTailscale: leaked.length,
    // 'ended' is the guard working only when the launch was seen to end before
    // its first check (feedUnguardedOf); an arm it ended reads UNREADABLE on its
    // own, and a packaged launch the guard never concluded on could have asked
    // a real host.
    feed: { unguarded: feedUnguardedOf(launches) },
    launched: shims.size,
    agentsHeld,
    history
  });
  safely('the report', () => {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'probe-p364.json'), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  });
  if (!KEEP) safely('the scratch world', () => rmSync(RUN, { recursive: true, force: true }));
  else say(`kept ${RUN} (P364_KEEP=1)`);
  say(`the report is ${join(OUT, 'probe-p364.json')}`);
}

say(`${String(report.arms.filter((a) => a.ok === true).length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
