#!/usr/bin/env node
/**
 * probe-p347.mjs. THE PHASE 347 APP RUN, at the parent and at HEAD
 * (build/p347/SPEC.md §7 and §9; issues 41, 40 and 33).
 *
 * ## What it proves, and why it has to be a run
 *
 * Issue 41 (Tier 2): ⌘C in a session with nothing selected sends no byte at
 * HEAD, where the parent sent the interrupt that clears a draft at an agent's
 * prompt; with a selection it copies at both; ⌃C is the interrupt at both;
 * and the keymap row says so in Settings then Keyboard and in the ⌘/ overlay.
 * Only a run reads what a real key event does to a real pane: the bytes are
 * read by `stand-in.sh prompt`, which logs every byte it receives.
 *
 * Issue 40 (Tier 2): a path drawn over several rows, in the agent's own break
 * shape and in the terminal's own wrap, is underlined on every row at HEAD
 * and a press opens the WHOLE file at its line, where the parent offered
 * nothing, or a fragment's own spelling when one exists (P3, the wrong-file
 * hazard). The rows are composed here at the pane's real width, read back
 * from tmux, and pressed where tmux says they are.
 *
 * Issue 33 (Tier 3): a file in a folder the repository ignores, open in a
 * tab, shows an outside writer's bytes at HEAD without any look, in Source
 * and in Redline, through in-place writes, rename-overs, Tortie's own auto
 * save and pairs of replaces; a dirty buffer is never replaced; no typed
 * character is lost; a closed tab, a closed project and a tracked file hold
 * no descriptor in main; a link swapped in for the file never puts a watch on
 * the outside file; 30 tabs hold exactly 30 descriptors; and the quit is no
 * slower than the parent's by more than 2 s. Every reading waits at least
 * 1,200 ms after the previous gesture in that repository with focus in the
 * terminal, so no Phase 334 door can be what a W arm measures.
 *
 * He reported all three, so THE PARENT MEASUREMENT IS MANDATORY: the same
 * script drives the parent build first and HEAD second, and every row is
 * graded at both. Nothing is added to the app for this phase: the probe uses
 * what the parent ships, being `window.__gmuxShotDrive`, `window.__gmuxP268`,
 * `window.gmux.openSettings`, the DOM, CDP input, main's inspector
 * (`--inspect=0`, for the clipboard recorder K2 reads instead of the person's
 * pasteboard) and the harness socket's tmux.
 *
 * ## The arms (SPEC §7's table, in the order they run)
 *
 *   K1  ⌘C with nothing selected over a draft: no byte and the draft kept at
 *       HEAD; 03 and the draft cleared at the parent.
 *   K2  a drag-selected row and ⌘C: the clipboard holds the row, no byte.
 *   K3  ⌃C: 03 at both.
 *   K4  Settings then Keyboard and the ⌘/ overlay: D3's words at HEAD.
 *   P1  the agent's break over three or more rows: a pointer on every row and
 *       the whole file at line 134 at HEAD; nothing at the parent.
 *   P2  one line the terminal wrapped: the same.
 *   P3  P1 with a file planted at the last row's fragment: HEAD opens the
 *       whole file, the parent opens the planted fragment.
 *   P4  a broken path whose join names no file: nothing at both.
 *   P5  `…/sub/` short of the last column above `README.md is …`: the
 *       project's README.md opens at both.
 *   P6  the fix round's word wrap (the app lens's hostile fixture): a path
 *       ending two cells short of the last column above `.bak beside it`,
 *       with README.md.bak REALLY present. At both builds the path's own row
 *       opens README.md and `.bak` is no link: J7 refuses the join, so HEAD
 *       reads as the parent did, never README.md.bak.
 *   W0  control: a tracked file updates by the bus at both.
 *   W1  notes/a.md in Source, five in-place writes: 5 of 5 within 1,500 ms at
 *       HEAD, 0 of 5 after 2,500 ms at the parent.
 *   W2  notes/b.md in Redline, three writes: savedContents and the drawn text.
 *   W3  three rename-over writes.
 *   W4  auto save on: a typed P lands by the guarded write (a rename-over),
 *       then the shell writes. HEAD shows the shell's bytes and Q then saves
 *       over them; the parent stops `stale` with one toast.
 *   W5  a dirty buffer is never reloaded, and ⌘S asks its three answers.
 *   W6  the attack: 20 shell writes 50 ms apart while 20 characters are typed
 *       60 ms apart with auto save on. No typed character is lost.
 *   W7  delete then recreate at +50 ms and at +3 s.
 *   W8  a closed tab: its file is not in main's descriptors.
 *   W10 a tracked file and an ignored FILE in a tracked folder: neither in
 *       main's descriptors, both update by the bus. At HEAD the same reads
 *       must name a watched notes/ file, or the 0 is unreadable.
 *   W13 the link swap: no descriptor ever names the outside file, and none of
 *       its three later writes is shown before a look.
 *   W14 thirty pairs of back-to-back replaces, 1,500 ms apart.
 *   W15 the reverify's D11 finding, in the app: an ignored folder stored
 *       DECOMPOSED (`cafe\u0301-nfd`, as Finder and Cocoa name it) whose
 *       `.gitignore` line is written COMPOSED, so git reports it composed and
 *       the disk answers decomposed. Three in-place writes to a file in it,
 *       open in its own project: 3 of 3 within 1,500 ms at HEAD, 0 of 3 at
 *       the parent. Nothing here normalises a string; the two spellings are
 *       written out as code points.
 *   W11 three projects of ten tabs in ignored folders: exactly 30 more
 *       descriptors at HEAD, none at the parent.
 *   W9  a closed project: none of its files in main's descriptors.
 *   W12 the quit, with watches armed: within the parent's quit plus 2 s, and
 *       app.log holds no watcher error.
 *   RUN his two history files unmoved across both launches, and nothing this
 *       run started still alive.
 *
 * ## What this run does NOT measure, stated rather than hidden
 *
 *   - The native Edit menu. A CDP key event reaches the page without passing
 *     through the menu's key equivalents, so `role: 'copy'` is never asked
 *     here; that the handler still calls `preventDefault` with nothing
 *     selected is the unit test's (p347-copy-only.test.ts, K1).
 *   - A session on another machine: no machine is started. Issue 41's
 *     handler is the same function for both, and refusal 5 for paths is the
 *     provider's first statement (p347-path-links-join.test.ts, PL4).
 *   - The cap of 64 itself: W11 holds 30 tabs, which is under it; the cap and
 *     its descriptor count are the native test's (N6) and the unit test's (O7).
 *
 * ## What it refuses, exit 2 as UNREADABLE rather than pass what it never saw
 *
 * `P347_PARENT_CHECKOUT` absent, equal to this checkout, without
 * `out/main/index.js`, or already holding this phase's new files; this
 * checkout unbuilt, missing them, or built before its sources last changed; a
 * scratch project whose notes/ git does not ignore; a build whose own overlay
 * parser does not hide gemini, qwen, antigravity, grok and droid; an
 * `agents:list` read back from the app that resolves any of them (checked
 * before any arm); a gesture that did not take; and either of his history
 * files moving across a launch. An unreadable arm is never a pass.
 *
 * ## SAFETY
 *
 * Two Electrons ONE AFTER THE OTHER, never at once, each through
 * build/electron-run.mjs inside build/harness-socket.mjs, whose `finally`
 * ends the tree it started, each on its own scratch profile, HOME and ZDOTDIR
 * with `HISTFILE=/dev/null` and no `TERM_SESSION_ID`, on this run's tmux
 * socket and never the operator's. Every other process it starts is
 * synchronous and has exited before the call returns: `git`, `/bin/sh` (the
 * outside writer and nothing else, with the same scratch HOME), `tmux` on the
 * harness socket, `lsof -p` of this run's own app, `stat` of the two history
 * files (size and time only), `ps` for the census, and the pinned tsx of
 * `hiddenAgentsPrecheck`. Every session is a plain shell that runs
 * build/p347/stand-in.sh: no agent starts and no token is spent. No
 * keychain is opened (`--use-mock-keychain`), no screenshot is taken, the
 * person's pasteboard is never read or written (main's `clipboard.write` is
 * replaced by a recorder from the first K arm to the end of the launch, and
 * put back), and nothing is handed to macOS (`GMUX_PATH_OPEN_RECORD`).
 *
 *   P347_PARENT_CHECKOUT=/path/to/built/parent npm run -s probe:p347
 *   P347_ARMS=K1,P3,W13 ...     named arms only (each sets its own preconditions)
 *   P347_KEEP=1 ...             keep the scratch projects, profiles and homes
 *   P347_REPORT=/tmp/x.json     the report's path, outside this checkout
 *   node build/p347/probe-p347.mjs --grader-self-test
 *                               the graders over build/p347/fixtures/, launches nothing
 *
 * Never `npm run probe:p347 -- --grader-self-test`: that hands the flag to
 * build/harness-socket.mjs, which ignores it and starts the whole app run.
 *
 * Exit 0 when every row grades at both builds, 1 when a row disagrees (each
 * named), 2 when a precondition or an arm could not be read.
 */

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { userInfo } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import * as hidden from '../hidden-agents.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TAG = '[p347]';
const J = JSON.stringify;
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The arms, in the order they run. RUN is graded once, after both launches. */
export const ALL_ARMS = Object.freeze([
  'K1', 'K2', 'K3', 'K4',
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6',
  'W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W10', 'W13', 'W14', 'W15', 'W11', 'W9', 'W12'
]);
/** Arms held for a later phase: left out of a default run, still runnable by name. */
export const HELD_ARMS = Object.freeze(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
/** How many writes each counting arm makes. */
export const LOOKS = Object.freeze({ W1: 5, W2: 3, W3: 3, W14: 30, W15: 3 });
/** W15's folder: the same name stored decomposed on disk and written composed in .gitignore (SPEC D11, the reverify's minor). */
export const NFD_FOLDER = 'cafe\u0301-nfd';
export const NFC_FOLDER = 'caf\u00e9-nfd';
/** HEAD must show a write within this; the parent is read after the longer wait. */
export const SEEN_WITHIN_MS = 1500;
export const STALE_AFTER_MS = 2500;
/** The two files this phase adds; a parent holds neither, HEAD holds both. */
export const PHASE_FILES = Object.freeze([
  'src/main/watcher/open-files.ts',
  'src/renderer/editor/open-file-watch.ts'
]);
/** The sources a HEAD build must be newer than (its own `out/` would otherwise be the parent's code). */
export const PHASE_SOURCES = Object.freeze([
  ...PHASE_FILES,
  'src/renderer/terminal/keys/index.ts',
  'src/shared/keymap.ts',
  'src/shared/path-spans.ts',
  'src/renderer/terminal/path-links.ts',
  'src/main/watcher/repo-watcher.ts',
  'src/main/git/ipc.ts',
  'src/renderer/editor/store.ts'
]);
/** What K1 types at the stand-in's prompt. */
export const DRAFT = 'p347 draft notes';
/** D3's words (HEAD) and the parent's, for K4. */
export const D3_ACTION = 'Copy';
export const D3_EXPLAIN =
  'Copies the selected text. With nothing selected it does nothing, so a draft at an agent’s prompt is never cleared; ⌃C is the interrupt.';
export const OLD_ACTION = 'Copy or interrupt';
export const OLD_EXPLAIN =
  'With text selected it copies. With nothing selected it sends the interrupt an agent reads as “stop” — the gesture you want when something runs away.';
/** The three answers ⌘S offers over a file that changed on disk, in drawn order. */
export const THREE_ANSWERS = Object.freeze(['Overwrite', 'Cancel', 'Compare']);
/** The sentence a tab whose file is gone draws (EditorPanel.tsx). */
export const DELETED_SENTENCE = 'This file was deleted on disk.';
/** W6's typed text: twenty characters no writer's bytes and no base text hold in a row. */
export const W6_TYPED = 'ABCDEFGHJKLMNPQRSTUV';
/** The line every composed path names (issue 40's `:134`). */
export const P_LINE = 134;
/**
 * P6 (the fix round, the app lens's hostile fixture): a relative path that a
 * word wrap leaves P6_SHORT_BY cells short of the last column, above a row
 * whose first word `.bak` is path-shaped, with README.md.bak REALLY present.
 */
export const P6_REL = 'hw6/README.md';
export const P6_BELOW = '.bak beside it, just in case.';
export const P6_SHORT_BY = 2;
/** How many rows of tabs W11 opens, per project, over three projects. */
export const W11_PER_PROJECT = 10;
export const W11_PROJECTS = Object.freeze(['proj3', 'proj4', 'proj5']);
/** The open-file watch cap (SPEC D18), printed beside W11's rest count. */
export const OPEN_FILE_WATCH_CAP = 64;
/** How long the helper gives the app to end on SIGTERM; W12 reads against it. */
export const GRACE_MS = 15_000;

// ---------------------------------------------------------------------------
// Pure helpers, each proved by the self-test.
// ---------------------------------------------------------------------------

/**
 * A character a path continues with: path-spans.ts's PATH_CHARACTER, written
 * out here so the probe's composer is its own arithmetic. J1 asks it of a
 * row's last character and J2 of the next row's first, so a wrap that lands
 * beside the `:` of `:134` is not the shape the join reads (measured by
 * running the composed rows through the shipping `joinedPathAt`).
 */
export const PATH_CHAR = /[A-Za-z0-9._@%+~$/-]/;

/** J3's units: each runs up to and including the next `/` or `-`; the rest is one unit. */
export function unitsOf(text) {
  const out = [];
  let cur = '';
  for (const ch of String(text)) {
    cur += ch;
    if (ch === '/' || ch === '-') {
      out.push(cur);
      cur = '';
    }
  }
  if (cur !== '') out.push(cur);
  return out;
}

/** The first unit J3 measures on a continuation row: its first token up to and including the first `/` or `-`. */
export function firstUnitOf(row) {
  const tok = String(row).trimStart().split(/\s+/)[0] ?? '';
  const m = /^[^/-]*[/-]/.exec(tok);
  return m === null ? tok : m[0];
}

/**
 * The agent's own break (issue 40's 45/42/30 rows, research 115 §4's other
 * shape): a unit stays on its row while it fits by the last column, and
 * otherwise opens the next row. Null when one unit is wider than the pane.
 */
export function agentBreak(prefix, text, width) {
  const rows = [];
  let row = String(prefix);
  for (const u of unitsOf(text)) {
    if (u.length > width) return null;
    if (row.length + u.length <= width) row += u;
    else {
      rows.push(row);
      row = u;
    }
  }
  rows.push(row);
  return rows;
}

/** One line the terminal wraps, as the physical rows `capture-pane -p` prints. */
export function softWrapRows(line, width) {
  const rows = [];
  for (let i = 0; i < line.length; i += width) rows.push(line.slice(i, i + width));
  return rows;
}

/**
 * P6's rows: `mkP6`, a filler word of `k`s, then `rel` ending exactly
 * `P6_SHORT_BY` cells short of the last column, and `P6_BELOW` under it, the
 * shape a word wrap draws. `pathCol` is the 0-based column `rel` starts at.
 * Null when the pane is too narrow for a filler of one letter.
 */
export function composeWordWrap({ width, rel }) {
  const head = 'mkP6 ';
  const fill = width - P6_SHORT_BY - head.length - 1 - String(rel).length;
  if (!(fill >= 1)) return null;
  const row = `${head}${'k'.repeat(fill)} ${rel}`;
  return { rows: [row, P6_BELOW], pathCol: row.length - String(rel).length };
}

/**
 * Why a composed agent-break layout would not be the shape SPEC D7 joins, by
 * this file's own arithmetic over J3 and J5 (never the product's code), or []
 * when it is: three to eight rows, none wider than the pane, every next unit
 * unable to fit (J3), no folder above a bare name short of the last column
 * (J5), and the tail on the last row.
 */
export function layoutProblems(rows, width) {
  const p = [];
  if (!Array.isArray(rows) || rows.length < 3) p.push(`${String(rows?.length ?? 0)} rows, fewer than 3`);
  if (Array.isArray(rows) && rows.length > 8) p.push(`${String(rows.length)} rows, more than 8`);
  for (const [i, r] of (rows ?? []).entries()) if (r.length > width) p.push(`row ${String(i)} is wider than the pane`);
  for (let k = 0; k + 1 < (rows ?? []).length; k += 1) {
    const next = rows[k + 1];
    if (!PATH_CHAR.test(rows[k].slice(-1)) || !PATH_CHAR.test(next.trimStart().slice(0, 1))) p.push(`boundary ${String(k)}: not a path character on both sides (J1, J2)`);
    if (!(rows[k].length + firstUnitOf(next).length > width)) p.push(`boundary ${String(k)}: the next unit would have fit (J3)`);
    const tok = next.trimStart().split(/\s+/)[0] ?? '';
    if (rows[k].endsWith('/') && !tok.includes('/') && rows[k].length !== width) {
      p.push(`boundary ${String(k)}: a folder above a bare name short of the last column (J5)`);
    }
    if (rows[k].length < width && !/[/-]$/.test(rows[k])) {
      p.push(`boundary ${String(k)}: a row short of the last column that does not end in / or - (J7)`);
    }
  }
  return p;
}

/** The deep folders a composed path runs through: `n` of them, each `pad` characters longer. */
function fillerDirs(n, pad) {
  return Array.from({ length: n }, (_, i) => `agent-workspace-${String(i + 1).padStart(2, '0')}${'x'.repeat(pad)}`);
}

/**
 * Every (prefix, path) the composers try: a word of `shift` letters after the
 * marker (none at 0) moves the root's own breaks, which no folder below the
 * root can, then a lead folder of `lead` characters moves the first break
 * after it, and the filler every later one. A path over 1,000 characters ends
 * that lead's search.
 */
function* candidates(root, second, leaf, marker) {
  for (let shift = 0; shift <= 10; shift += 1) {
    const prefix = shift === 0 ? `${marker} ` : `${marker} ${'q'.repeat(shift)} `;
    for (let lead = 0; lead <= 12; lead += 1) {
      const front = lead === 0 ? [] : [`w${'k'.repeat(lead - 1)}`];
      for (let n = 1; n <= 60; n += 1) {
        let any = false;
        for (let pad = 0; pad <= 14; pad += 1) {
          const path = [root, ...front, 'arcturus-labs', second, ...fillerDirs(n, pad), 'software-factory', '.planning', leaf].join('/');
          if (path.length > 1000) break;
          any = true;
          yield { prefix, path };
        }
        if (!any) break;
      }
    }
  }
}

/**
 * An agent-break layout of `<root>/arcturus-labs/<second>/…/software-factory/
 * .planning/<leaf>:134` that meets `layoutProblems`, every row but the last
 * short of the last column, with ` end` after the path on its last row; the
 * filler is searched until one does. Null when no
 * filler under 1,000 characters gives one.
 */
export function composeAgentBreak({ root, second, leaf, width, marker }) {
  for (const { prefix, path } of candidates(root, second, leaf, marker)) {
    const rows = agentBreak(prefix, `${path}:${String(P_LINE)}`, width);
    if (rows === null || rows.length < 3) continue;
    const last = `${rows[rows.length - 1]} end`;
    if (last.length > width) continue;
    const done = [...rows.slice(0, -1), last];
    // Issue 40's own rows stop BEFORE the last column, and so do these: a
    // row that filled it would let the parent's refusal 8 refuse the
    // fragment below it, and P3 could no longer show the parent's hazard.
    if (done.slice(0, -1).some((r) => r.length >= width)) continue;
    if (layoutProblems(done, width).length === 0) return { prefix, path, rows: done };
  }
  return null;
}

/**
 * One line of `<prefix><path>:134 end` the terminal wraps at `width`: at least
 * three rows, the path never ending on a row's last cell, and ` end` on the
 * path's own last row, so the join's bottom row is that row (SPEC D7 J6).
 */
export function composeSoftWrap({ root, second, leaf, width, marker }) {
  for (const { prefix, path } of candidates(root, second, leaf, marker)) {
    const head = `${prefix}${path}:${String(P_LINE)}`;
    const line = `${head} end`;
    const at = head.length % width;
    if (line.length <= 2 * width || at === 0 || at + 4 > width) continue;
    const rows = softWrapRows(line, width);
    if (rows.length > 8) continue;
    // J1 and J2 at every wrap: never beside the `:` of the line suffix.
    if (rows.slice(0, -1).some((r, k) => !PATH_CHAR.test(r.slice(-1)) || !PATH_CHAR.test(rows[k + 1].slice(0, 1)))) continue;
    return { prefix, path, line, rows };
  }
  return null;
}

/** The hex bytes `stand-in.sh prompt` logged, oldest first. */
export function logHexOf(text) {
  return String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[0-9a-f]{2}$/.test(l));
}

/** A string's UTF-8 bytes as the stand-in logs them. */
export const hexOf = (text) => [...Buffer.from(String(text), 'utf8')].map((b) => b.toString(16).padStart(2, '0'));

/** The stand-in's prompt row, the last row that starts with `>`, trimmed at its end; null when there is none. */
export function promptRowOf(rows) {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const r = String(rows[i] ?? '').trimEnd();
    if (r.startsWith('>')) return r;
  }
  return null;
}

/** Where a marked row's span sits in the rows tmux printed (probe:p247's reader). */
export function cellOf(rows, marker, span) {
  for (const [row, text] of rows.entries()) {
    if (!text.startsWith(`${marker} `)) continue;
    const col = text.indexOf(span);
    if (col === -1) continue;
    return { row, col, width: span.length, text };
  }
  return null;
}

/** The first index at which `want` appears as consecutive rows of `rows`, compared at their ends trimmed; -1 when it does not. */
export function rowsAt(rows, want) {
  const t = (s) => String(s ?? '').trimEnd();
  for (let i = 0; i + want.length <= rows.length; i += 1) {
    if (want.every((w, j) => t(rows[i + j]) === t(w))) return i;
  }
  return -1;
}

/** `lsof -F fn` output read: the numeric descriptors and every name. */
export function parseLsof(text) {
  const fds = [];
  let cur = null;
  for (const line of String(text ?? '').split('\n')) {
    if (line.startsWith('f')) {
      cur = { fd: line.slice(1), name: null };
      fds.push(cur);
    } else if (line.startsWith('n') && cur !== null) {
      cur.name = line.slice(1);
    }
  }
  const numeric = fds.filter((f) => /^\d+$/.test(f.fd));
  return { count: numeric.length, names: numeric.map((f) => f.name).filter((n) => typeof n === 'string') };
}

/** How many descriptors name each of `paths`: `{ named, perFileMax }`. */
export function namedIn(names, paths) {
  let named = 0;
  let perFileMax = 0;
  for (const p of paths) {
    const n = names.filter((x) => x === p).length;
    if (n > 0) named += 1;
    perFileMax = Math.max(perFileMax, n);
  }
  return { named, perFileMax };
}

/** The history files' `%z %m`, compared: the files whose reading moved. */
export function historyMoved(before, after) {
  const moved = [];
  for (const k of Object.keys(before ?? {})) if ((before ?? {})[k] !== (after ?? {})[k]) moved.push(k);
  for (const k of Object.keys(after ?? {})) if (!(k in (before ?? {}))) moved.push(k);
  return moved;
}

/**
 * app.log's lines a watch could have written at warn or error: scope
 * `watcher`, or text naming the open-file watch. Unparsable lines are skipped.
 */
export function watcherErrorsOf(text) {
  const out = [];
  for (const line of String(text ?? '').split('\n')) {
    if (line.trim() === '') continue;
    let rec = null;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (rec === null || typeof rec !== 'object') continue;
    if (rec.level !== 'warn' && rec.level !== 'error') continue;
    const words = `${String(rec.msg ?? '')} ${J(rec.fields ?? null)} ${String(rec.event ?? '')}`;
    if (rec.scope === 'watcher' || /open.?file|watchOpenFiles|openFileChanged|fs\.watch|EMFILE/i.test(words)) {
      out.push(`${String(rec.level)} ${String(rec.scope)}: ${String(rec.msg ?? '').slice(0, 200)}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The graders, pure, so --grader-self-test can prove each one can say no.
// ---------------------------------------------------------------------------

const unreadableOf = (reading) =>
  reading === undefined || reading === null
    ? 'it was not read'
    : typeof reading.unreadable === 'string'
      ? reading.unreadable
      : null;
const U = (said) => ({ ok: null, said });

/** One look at a Monaco tab: `seen` (the writer's bytes, clean), `stale` (the old), or `other`. */
export function outcomeOf(after, previous, written) {
  if (after === null || after === undefined || typeof after.value !== 'string') return 'unreadable';
  if (after.value === written && after.savedContents === written && after.dirty === false) return 'seen';
  if (after.value === previous && after.savedContents === previous) return 'stale';
  return 'other';
}

/** One look at a Redline tab, by `savedContents` and the drawn document's marker. */
export function redlineOutcomeOf(after, previous, written) {
  if (after === null || after === undefined || typeof after.savedContents !== 'string' || typeof after.drawnHasMarker !== 'boolean') {
    return 'unreadable';
  }
  if (after.savedContents === written && after.drawnHasMarker) return 'seen';
  if (after.savedContents === previous && !after.drawnHasMarker) return 'stale';
  return 'other';
}

/**
 * A counting arm (W1, W2, W3, W14, W15): HEAD must show every write within
 * SEEN_WITHIN_MS with no door in the air, the parent none after the arm's own
 * wait (`staleAfterMs`: STALE_AFTER_MS, or SEEN_WITHIN_MS for W14, whose pairs
 * are 1,500 ms apart), every parent look stale rather than something else.
 */
export function gradeLooks(build, reading, n, classify = outcomeOf, staleAfterMs = STALE_AFTER_MS) {
  const why = unreadableOf(reading);
  if (why !== null) return U(why);
  const its = Array.isArray(reading.iterations) ? reading.iterations : [];
  if (its.length !== n) return U(`${String(its.length)} of ${String(n)} writes were made`);
  const missed = its.findIndex((it) => it.doorFree !== true);
  if (missed >= 0) return U(`write ${String(missed + 1)}: a door could have carried it (${String(its[missed].why ?? 'focus was not in the terminal, or a gesture was too recent')})`);
  const outcomes = its.map((it) => {
    const o = classify(it.after, it.previous, it.written);
    if (o === 'seen' && build === 'head' && !(typeof it.seenAtMs === 'number' && it.seenAtMs <= SEEN_WITHIN_MS)) return 'late';
    return o;
  });
  const bad = outcomes.indexOf('unreadable');
  if (bad >= 0) return U(`write ${String(bad + 1)} could not be read`);
  const count = (o) => outcomes.filter((x) => x === o).length;
  const tally = `${String(count('seen'))} of ${String(n)} seen, ${String(count('late'))} late, ${String(count('stale'))} stale, ${String(count('other'))} neither`;
  if (build === 'head') return { ok: count('seen') === n, said: `${tally} (want ${String(n)} of ${String(n)} within ${String(SEEN_WITHIN_MS)} ms)` };
  return { ok: count('seen') === 0 && count('stale') === n, said: `${tally} (want 0 seen and ${String(n)} stale after ${String(staleAfterMs)} ms)` };
}

/** K1: ⌘C with nothing selected. */
export function gradeK1(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.focused !== true) return U('the terminal did not hold focus');
  if (r.drafted !== true) return U('the draft never reached the stand-in');
  if (!Array.isArray(r.newBytes) || typeof r.promptRow !== 'string') return U("the stand-in's log or prompt could not be read after ⌘C");
  const kept = r.promptRow.includes(String(r.draft));
  const bytes = r.newBytes.length === 0 ? 'no byte' : r.newBytes.join(' ');
  if (build === 'head') {
    if (typeof r.clipboardWrites !== 'number') return U("the clipboard could not be read without the person's pasteboard");
    return {
      ok: r.newBytes.length === 0 && kept && r.clipboardWrites === 0,
      said: `⌘C sent ${bytes}; the draft is ${kept ? 'kept' : 'GONE'}; ${String(r.clipboardWrites)} clipboard write(s) (want no byte, the draft kept, no write)`
    };
  }
  return { ok: r.newBytes.includes('03') && !kept, said: `⌘C sent ${bytes}; the draft is ${kept ? 'kept' : 'cleared'} (want 03 and the draft cleared)` };
}

/** K2: a selection and ⌘C, identical at both builds. */
export function gradeK2(_build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.patched !== true) return U("the clipboard could not be read without writing the person's pasteboard, so nothing was copied");
  if (typeof r.banner !== 'string' || r.banner === '') return U('the stand-in printed no row to select');
  if (!Array.isArray(r.newBytes)) return U("the stand-in's log could not be read");
  const lines = typeof r.copied === 'string' ? r.copied.split('\n').map((l) => l.trimEnd()) : null;
  const has = lines !== null && lines.includes(r.banner);
  const problems = [];
  if (!has) problems.push(`the clipboard holds ${J(r.copied ?? null)}, not the row`);
  if (r.newBytes.length !== 0) problems.push(`${r.newBytes.join(' ')} reached the session`);
  return { ok: problems.length === 0, said: problems.join('; ') || `the clipboard holds the row; no byte (${String(r.attempts)} drag(s))` };
}

/** K3: ⌃C is the interrupt at both builds. */
export function gradeK3(_build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.focused !== true) return U('the terminal did not hold focus');
  if (!Array.isArray(r.newBytes)) return U("the stand-in's log could not be read");
  return { ok: r.newBytes.includes('03'), said: `⌃C sent ${r.newBytes.length === 0 ? 'no byte' : r.newBytes.join(' ')} (want 03)` };
}

const chordRows = (rows) => (Array.isArray(rows) ? rows : []).filter((x) => String(x?.keys ?? '').replace(/\s+/g, '') === '⌘C');

/** K4: the words Settings then Keyboard and the ⌘/ overlay draw for ⌘C. */
export function gradeK4(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (!Array.isArray(r.settings) || r.settings.length === 0) return U('Settings then Keyboard drew no row');
  if (!Array.isArray(r.overlay) || r.overlay.length === 0) return U('the ⌘/ overlay drew no row');
  const s = chordRows(r.settings);
  const o = chordRows(r.overlay);
  const problems = [];
  if (s.length !== 1) problems.push(`${String(s.length)} Settings row(s) name ⌘C (want 1)`);
  if (o.length !== 1) problems.push(`${String(o.length)} overlay row(s) name ⌘C (want 1)`);
  const [action, explain] = build === 'head' ? [D3_ACTION, D3_EXPLAIN] : [OLD_ACTION, OLD_EXPLAIN];
  if (s.length === 1 && s[0].action !== action) problems.push(`Settings says ${J(s[0].action)} (want ${J(action)})`);
  if (s.length === 1 && s[0].explain !== explain) problems.push(`Settings explains ${J(s[0].explain)}`);
  if (o.length === 1 && o[0].action !== action) problems.push(`the overlay says ${J(o[0].action)} (want ${J(action)})`);
  if (build === 'head' && [...r.settings, ...r.overlay].some((x) => x?.action === OLD_ACTION)) problems.push(`a row still says ${J(OLD_ACTION)}`);
  return { ok: problems.length === 0, said: problems.join('; ') || `both surfaces say ${J(action)} for ⌘C` };
}

/** P1 to P4: a path drawn over rows. */
export function gradeJoin(arm, build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.found !== true) return U('the composed rows were not on the screen as drawn');
  if (r.calibrated !== true) return U('the control row carried no link, so a missed cell could not be told from a refused path');
  if (!Array.isArray(r.pointers) || r.pointers.length < 2) return U('the rows were not hovered');
  if (!Array.isArray(r.opened)) return U('what the press opened could not be read');
  if (arm === 'P3' && r.plantedExists !== true) return U('the fragment file was not planted');
  const on = r.pointers.filter((p) => p === true).length;
  const n = r.pointers.length;
  const opened = r.opened.length === 0 ? 'nothing' : r.opened.join(', ');
  const read = `a pointer on ${String(on)} of ${String(n)} rows; the press opened ${opened}${typeof r.line === 'number' ? ` at line ${String(r.line)}` : ''}`;
  const whole = r.opened.length === 1 && r.opened[0] === r.whole && r.line === P_LINE;
  if (arm === 'P4') return { ok: on === 0 && r.opened.length === 0, said: `${read} (want no pointer and nothing)` };
  if (build === 'head') {
    if (arm === 'P3') return { ok: whole, said: `${read} (want the whole file at line ${String(P_LINE)}, never the fragment)` };
    return { ok: on === n && whole, said: `${read} (want every row and the whole file at line ${String(P_LINE)})` };
  }
  if (arm === 'P3') return { ok: r.opened.length === 1 && r.opened[0] === r.planted, said: `${read} (want the planted fragment: the parent's wrong-file hazard)` };
  return { ok: on === 0 && r.opened.length === 0, said: `${read} (want no pointer and nothing)` };
}

/** P5: a folder above a bare name short of the last column opens the project's README.md at both. */
export function gradeP5(_build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.found !== true) return U('the composed rows were not on the screen as drawn');
  if (r.shortOfEdge !== true) return U('the folder row reached the last column, so J5 was not what decided it');
  if (!Array.isArray(r.opened)) return U('what the press opened could not be read');
  return {
    ok: r.opened.length === 1 && r.opened[0] === r.readme,
    said: `the press opened ${r.opened.length === 0 ? 'nothing' : r.opened.join(', ')} (want ${String(r.readme)})`
  };
}

/** P6: a word wrap below a path that ends short of the edge opens that path at both builds, never the joined `.bak`. */
export function gradeP6(_build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.found !== true) return U('the composed rows were not on the screen as drawn');
  if (r.calibrated !== true) return U('the control row carried no link, so a missed cell could not be told from a refused path');
  if (r.shortBy !== P6_SHORT_BY) return U(`the path's row stopped ${String(r.shortBy)} cells short of the last column (want ${String(P6_SHORT_BY)})`);
  if (r.bakExists !== true) return U('README.md.bak was not planted, so a join to it could not have opened');
  if (!Array.isArray(r.openedTop) || !Array.isArray(r.openedBelow)) return U('what the presses opened could not be read');
  const problems = [];
  if (r.pointerTop !== true) problems.push('no pointer on the path');
  if (r.pointerBelow !== false) problems.push('`.bak` drew a pointer');
  if (!(r.openedTop.length === 1 && r.openedTop[0] === r.readme)) problems.push(`the path's press opened ${r.openedTop.length === 0 ? 'nothing' : r.openedTop.join(', ')} (want ${String(r.readme)})`);
  if (r.openedBelow.length !== 0) problems.push(`the press on \`.bak\` opened ${r.openedBelow.join(', ')}`);
  return { ok: problems.length === 0, said: problems.join('; ') || `the path opened ${String(r.readme)} and \`.bak\` is no link` };
}

/** W0: the live bus, at both builds. */
export function gradeW0(_build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.doorFree !== true) return U('a door could have carried the write');
  const o = outcomeOf(r.after, r.previous, r.written);
  if (o === 'unreadable') return U('the buffer could not be read');
  return { ok: o === 'seen', said: `the tracked buffer read ${o} within ${String(STALE_AFTER_MS)} ms (want seen)` };
}

const toastsNaming = (toasts, text) => (Array.isArray(toasts) ? toasts : []).filter((t) => String(t).includes(text));

/** W4: Tortie's own save (a rename-over) and then an agent's write. */
export function gradeW4(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.landedP !== true) return U('the typed P never reached the disk, so no save was made before the write');
  if (r.doorFree !== true) return U('a door could have carried the write');
  const problems = [];
  const onDisk = toastsNaming(r.toasts, 'changed on disk');
  if (build === 'head') {
    if (r.seen !== true) problems.push(`the shell's bytes were not shown within ${String(SEEN_WITHIN_MS)} ms after the save`);
    if (r.disk !== `${String(r.written)}Q`) problems.push(`the disk is not the writer's bytes then Q (${J(String(r.disk).slice(-40))})`);
    if (r.stopped !== null) problems.push(`auto save stopped (${String(r.stopped)})`);
    if (onDisk.length !== 0) problems.push(`${String(onDisk.length)} toast(s) name a change on disk`);
    return { ok: problems.length === 0, said: problems.join('; ') || "the shell's bytes shown after the save; then Q saved over them; no stop; no toast" };
  }
  // Any time within the arm's wait, not only within SEEN_WITHIN_MS: `seen` is
  // HEAD's question, and a parent that showed them at 2,000 ms re-read them too.
  if (r.seen === true || typeof r.seenAtMs === 'number') problems.push(`the parent showed the shell's bytes${typeof r.seenAtMs === 'number' ? ` at ${String(r.seenAtMs)} ms` : ''}`);
  if (r.stopped !== 'stale') problems.push(`the stop record reads ${J(r.stopped)} (want "stale")`);
  const named = toastsNaming(r.toasts, `'${String(r.name)}' changed on disk`).length;
  if (named !== 1) problems.push(`${String(named)} toast(s) name '${String(r.name)}' changed on disk (want 1)`);
  if (r.disk !== r.written) problems.push("the disk is not the writer's bytes");
  return { ok: problems.length === 0, said: problems.join('; ') || "stopped stale with one toast; the writer's bytes kept" };
}

/** W5: a dirty tab is never reloaded, and ⌘S asks. Identical at both builds. */
export function gradeW5(_build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.typed !== true) return U('the D never reached the buffer');
  const problems = [];
  const a = r.after ?? {};
  if (a.value !== `${String(r.previous)}D`) problems.push('the buffer is not the old text plus D: the typing was replaced');
  if (a.dirty !== true) problems.push('the tab is not dirty');
  if (a.savedContents !== r.previous) problems.push('savedContents moved under a dirty tab');
  if (r.disk !== r.written) problems.push("the writer's bytes are not on disk");
  if (r.dialog?.open !== true) problems.push('⌘S did not ask');
  else if (J(r.dialog.buttons) !== J(THREE_ANSWERS)) problems.push(`⌘S offered ${J(r.dialog.buttons)}`);
  if (r.afterCancel?.open !== false) problems.push('the dialog stayed open after Cancel');
  if (r.afterCancel?.dirty !== true) problems.push('the tab went clean after Cancel');
  if (r.afterCancel?.disk !== r.written) problems.push('Cancel wrote the disk');
  return { ok: problems.length === 0, said: problems.join('; ') || 'buffer kept, dirty, the writer kept; ⌘S asked and Cancel wrote nothing' };
}

/** W6: no typed character lost while an agent writes. Identical at both builds. */
export function gradeW6(_build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.typedDone !== true) return U('the typing did not finish');
  if (r.writes !== 20) return U(`${String(r.writes)} of 20 writes were made`);
  if (typeof r.buffer !== 'string' || typeof r.disk !== 'string') return U('the buffer or the disk could not be read');
  const T = String(r.typedText);
  const inBuffer = r.buffer.includes(T);
  const onDisk = r.disk.includes(T);
  return {
    ok: inBuffer || onDisk,
    said: inBuffer || onDisk ? `all ${String(T.length)} typed characters are ${inBuffer ? 'in the buffer' : 'on disk'}` : 'a typed character is in neither the buffer nor the disk: typing was lost'
  };
}

/** W7: delete then recreate, at +50 ms (a) and at +3 s (b). */
export function gradeW7(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  const a = r.a ?? null;
  const b = r.b ?? null;
  if (a === null || b === null) return U('one of the two halves was not read');
  if (a.removed !== true || b.removed !== true) return U('a file was still on disk after rm');
  if (a.doorFree !== true || b.doorFree !== true) return U('a door could have carried a half');
  if (typeof b.recreatedAtMs !== 'number' || b.recreatedAtMs < 3000) return U(`the second recreate came at +${String(b.recreatedAtMs)} ms, not after 3 s`);
  const problems = [];
  const aNow = outcomeOf(a.after, a.previous, a.written);
  const aLook = outcomeOf(a.look?.after, a.previous, a.written);
  const bNow = outcomeOf(b.afterRecreate?.after, b.previous, b.written);
  const bLook = outcomeOf(b.look?.after, b.previous, b.written);
  if ([aNow, aLook, bNow, bLook].includes('unreadable')) return U('a buffer could not be read');
  if (aLook !== 'seen' || a.look?.banner === true) problems.push(`first: the look read ${aLook}${a.look?.banner === true ? ' with the deleted sentence' : ''} (want the new bytes)`);
  if (bLook !== 'seen' || b.look?.banner === true) problems.push(`second: the look read ${bLook}${b.look?.banner === true ? ' with the deleted sentence' : ''} (want the new bytes)`);
  if (build === 'head') {
    if (aNow !== 'seen' || !(typeof a.seenAtMs === 'number' && a.seenAtMs <= SEEN_WITHIN_MS)) problems.push(`first: read ${aNow} without a look (want the new bytes within ${String(SEEN_WITHIN_MS)} ms)`);
    if (a.banner === true) problems.push('first: the deleted sentence was left');
    if (b.bannerBeforeRecreate !== true) problems.push('second: the deleted sentence was not shown before the recreate');
    if (b.afterRecreate?.banner !== true) problems.push('second: the deleted sentence went before a look');
  } else {
    if (aNow !== 'stale') problems.push(`first: read ${aNow} without a look (want nothing until a look)`);
    if (a.banner === true || b.bannerBeforeRecreate === true || b.afterRecreate?.banner === true) problems.push('the deleted sentence was shown without a look');
    if (bNow !== 'stale') problems.push(`second: read ${bNow} without a look (want nothing until a look)`);
  }
  return { ok: problems.length === 0, said: problems.join('; ') || (build === 'head' ? 'first: the new bytes, no sentence; second: the sentence until a look, then the new bytes' : 'nothing until a look, both times; then the new bytes') };
}

/** W8: a closed tab's file is not in main's descriptors. */
export function gradeW8(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.lsofOk !== true) return U("main's descriptors could not be read");
  if (r.closed !== true) return U('the tab did not close');
  if (build === 'head' && r.armedBefore !== true) return U('the file was not watched before the close, so the close ended nothing');
  const ok = r.namedAfter === false && (build === 'head' || r.armedBefore === false);
  return { ok, said: `before the close the file was ${r.armedBefore ? '' : 'not '}in main's descriptors; after it ${r.namedAfter ? 'STILL' : 'not'}` };
}

/** W9: a closed project's files are not in main's descriptors. */
export function gradeW9(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.lsofOk !== true) return U("main's descriptors could not be read");
  if (r.closed !== true) return U('the project did not close');
  const want = build === 'head' ? r.files : 0;
  if (build === 'head' && r.namedBefore !== want) return U(`${String(r.namedBefore)} of ${String(r.files)} files were watched before the close`);
  return {
    ok: r.namedBefore === want && r.namedAfter === 0,
    said: `${String(r.namedBefore)} of its ${String(r.files)} files in main's descriptors before, ${String(r.namedAfter)} after (want ${String(want)}, then 0)`
  };
}

/** W10: a tracked file and an ignored FILE in a tracked folder: no descriptor, both by the bus. */
export function gradeW10(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.lsofOk !== true) return U("main's descriptors could not be read");
  // THE CONTROL (the probe review): at HEAD the same reads must name a file of
  // notes/ that IS watched, or "neither is named" could be a read that names
  // nothing at all, and W10 run alone would pass by looking at nothing.
  if (build === 'head' && !(typeof r.control === 'number' && r.control > 0)) {
    return U("the same descriptor reads named no watched notes/ file, so a 0 for the two could not be told from a read that names nothing");
  }
  const problems = [];
  if (r.named !== 0) problems.push(`${String(r.named)} of the two named in main's descriptors`);
  if (r.xSeen !== true) problems.push('the tracked file did not update');
  if (r.logSeen !== true) problems.push('the ignored file in a tracked folder did not update');
  return { ok: problems.length === 0, said: problems.join('; ') || 'neither in main\'s descriptors; both updated by the bus' };
}

/** W11: thirty tabs in ignored folders over three projects. */
export function gradeW11(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.lsofOk !== true) return U("main's descriptors could not be read");
  const want = W11_PER_PROJECT * W11_PROJECTS.length;
  if (r.opened !== want) return U(`${String(r.opened)} of ${String(want)} tabs were open`);
  const rise = r.after - r.before;
  const read = `main held ${String(r.before)} descriptors at rest and ${String(r.after)} with the tabs open (rise ${String(rise)}); ${String(r.named)} of the ${String(want)} files named, at most ${String(r.perFileMax)} each; the cap would put it at ${String(r.before + OPEN_FILE_WATCH_CAP)}`;
  if (build === 'head') return { ok: r.named === want && r.perFileMax === 1 && rise === want, said: `${read} (want ${String(want)} named once each and a rise of exactly ${String(want)})` };
  return { ok: r.named === 0 && rise === 0, said: `${read} (want none named and no rise)` };
}

/** W13: a link to an outside file renamed over the watched one. */
export function gradeW13(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.lsofOk !== true) return U("main's descriptors could not be read");
  if (r.swapped !== true) return U('the link was not renamed over the file');
  if (build === 'head' && r.armedBefore !== true) return U('the file was not watched before the swap');
  if (!Array.isArray(r.writes) || r.writes.length !== 3) return U('the three outside writes were not made');
  if (typeof r.afterWrites !== 'string' || typeof r.old !== 'string') return U('the tab could not be read before the look');
  const problems = [];
  if (r.secretNamed !== false) problems.push("main's descriptors named the outside file");
  if (r.afterLook !== r.writes[2]) problems.push('the look did not show the outside file\'s last bytes');
  // HEAD may show the swap itself (one notice, its walk reading through the
  // link, as a look would) and nothing after it; the parent shows nothing.
  const allowed = build === 'head' ? [r.old, r.v0] : [r.old];
  if (!allowed.includes(r.afterWrites)) {
    const shownWrite = r.writes.findIndex((v) => v === r.afterWrites);
    problems.push(shownWrite >= 0 ? `outside write ${String(shownWrite + 1)} was shown without a look` : 'the tab changed without a look, to something other than the swap itself');
  }
  return { ok: problems.length === 0, said: problems.join('; ') || `no descriptor named the outside file; ${r.afterWrites === r.v0 ? 'the swap itself was shown and nothing after it' : 'nothing was shown'} until the look, which showed the last bytes` };
}

/** W12: the quit with watches armed, and app.log. HEAD is read against the parent's quit. */
export function gradeW12(build, r, readings) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  if (r.appLog !== true) return U('app.log was not written, so it could not be read');
  if (typeof r.quitMs !== 'number') return U('the quit was not timed');
  if (build === 'head' && !(typeof r.armedAtQuit === 'number' && r.armedAtQuit > 0)) return U('no watch was armed at the quit');
  const problems = [];
  if (r.exited !== true) problems.push(`the app did not end on SIGTERM within ${String(GRACE_MS)} ms`);
  if (Array.isArray(r.watcherErrors) && r.watcherErrors.length > 0) problems.push(`app.log holds ${String(r.watcherErrors.length)} watcher error(s): ${r.watcherErrors.slice(0, 3).join(' | ')}`);
  if (build === 'head') {
    const parent = readings?.parent?.W12?.quitMs;
    if (typeof parent !== 'number') return U("the parent's quit was not timed, so HEAD's could not be compared");
    if (r.quitMs > parent + 2000) problems.push(`the quit took ${String(r.quitMs)} ms against the parent's ${String(parent)} ms plus 2,000`);
  }
  return { ok: problems.length === 0, said: problems.join('; ') || `the app ended in ${String(r.quitMs)} ms; app.log holds no watcher error` };
}

/** RUN, once: his history unmoved, and nothing this run started still alive. */
export function gradeRUN(r) {
  const why = unreadableOf(r);
  if (why !== null) return U(why);
  const problems = [];
  if (!Array.isArray(r.historyMoved) || !Array.isArray(r.leftPids) || !Array.isArray(r.leftByProfile)) return U('the census was not read');
  if (r.historyMoved.length > 0) problems.push(`his history moved: ${r.historyMoved.join(', ')}`);
  if (r.leftPids.length > 0) problems.push(`app pid(s) still alive: ${r.leftPids.join(', ')}`);
  if (r.leftByProfile.length > 0) problems.push(`${String(r.leftByProfile.length)} process(es) still name this run's scratch`);
  return { ok: problems.length === 0, said: problems.join('; ') || 'history unmoved; 0 left' };
}

const GRADERS = {
  K1: gradeK1,
  K2: gradeK2,
  K3: gradeK3,
  K4: gradeK4,
  P1: (b, r) => gradeJoin('P1', b, r),
  P2: (b, r) => gradeJoin('P2', b, r),
  P3: (b, r) => gradeJoin('P3', b, r),
  P4: (b, r) => gradeJoin('P4', b, r),
  P5: gradeP5,
  P6: gradeP6,
  W0: gradeW0,
  W1: (b, r) => gradeLooks(b, r, LOOKS.W1),
  W2: (b, r) => gradeLooks(b, r, LOOKS.W2, redlineOutcomeOf),
  W3: (b, r) => gradeLooks(b, r, LOOKS.W3),
  W4: gradeW4,
  W5: gradeW5,
  W6: gradeW6,
  W7: gradeW7,
  W8: gradeW8,
  W9: gradeW9,
  W10: gradeW10,
  W11: gradeW11,
  W12: gradeW12,
  W13: gradeW13,
  W14: (b, r) => gradeLooks(b, r, LOOKS.W14, outcomeOf, SEEN_WITHIN_MS),
  W15: (b, r) => gradeLooks(b, r, LOOKS.W15)
};

/** Every asked arm at both builds, graded, then RUN. A build never read grades null. */
export function rowsFor(arms, readings) {
  const rows = [];
  for (const build of ['parent', 'head']) {
    for (const arm of arms) {
      const g = GRADERS[arm];
      const graded = g === undefined ? U('no grader') : g(build, readings?.[build]?.[arm], readings);
      rows.push({ arm, build, ok: graded.ok, said: graded.said });
    }
  }
  const run = gradeRUN(readings?.run);
  rows.push({ arm: 'RUN', build: '-', ok: run.ok, said: run.said });
  return rows;
}

/** 1 when any row disagrees; 2 when nothing disagrees and something could not be read; 0 only when every row graded. */
export function exitCodeOf(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 2;
  if (rows.some((r) => r.ok === false)) return 1;
  if (rows.some((r) => r.ok !== true)) return 2;
  return 0;
}

export const formatRow = (r) =>
  `${r.ok === true ? 'ok  ' : r.ok === false ? 'FAIL' : 'UNREADABLE'} ${r.arm} (${r.build}): ${r.said}`;

/** Why this run may not start with these two checkouts, or null. */
export function parentRefusal({ parent, root, built, holds, same, fresh }) {
  if (typeof parent !== 'string' || parent.trim() === '') {
    return 'P347_PARENT_CHECKOUT names no checkout. Point it at a BUILT checkout of the phase parent (af2662e6); the parent measurement is mandatory.';
  }
  if (same(parent, root)) return 'P347_PARENT_CHECKOUT is this checkout. The parent must be a separate built checkout of the phase parent.';
  if (!built(parent)) return `the parent (${parent}) has no build at out/main/index.js. Run npm run build there first.`;
  if (!built(root)) return `this checkout (${root}) has no build at out/main/index.js. Run npm run build first.`;
  const inParent = PHASE_FILES.filter((f) => holds(parent, f));
  if (inParent.length > 0) return `the parent (${parent}) already holds ${inParent.join(' and ')}, so it is not this phase's parent.`;
  const missing = PHASE_FILES.filter((f) => !holds(root, f));
  if (missing.length > 0) return `this checkout lacks ${missing.join(' and ')}, so it is not this phase's HEAD.`;
  const stale = fresh(root);
  if (stale !== null) return `this checkout's out/ is older than ${stale}. Run npm run build first.`;
  return null;
}

/** P347_ARMS read: the canonical names asked, or the refusal. */
export function armsAsked(text) {
  const raw = String(text ?? '').trim();
  // P1 to P6 (issue 40) are held for Phase 347.1 (his ruling of 2026-10-13
  // took the wrapped-path join out of 347 after its second needs_work): a run
  // with no P347_ARMS leaves them out, and naming one still runs it.
  if (raw === '') return { arms: ALL_ARMS.filter((a) => !HELD_ARMS.includes(a)), bad: [] };
  const asked = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const bad = asked.filter((a) => !ALL_ARMS.some((x) => x.toLowerCase() === a.toLowerCase()));
  const arms = ALL_ARMS.filter((x) => asked.some((a) => a.toLowerCase() === x.toLowerCase()));
  return { arms, bad };
}

// ---------------------------------------------------------------------------
// The self-test: the graders over build/p347/fixtures/, and every pure helper.
// It launches nothing.
// ---------------------------------------------------------------------------

const FIXTURES = join(HERE, 'fixtures');
const clone = (v) => JSON.parse(J(v));

/** Walk a dotted path (array indices are numbers) to its parent and key. */
function parentOf(obj, path) {
  const parts = path.split('.');
  let at = obj;
  for (const p of parts.slice(0, -1)) {
    if (at === null || typeof at !== 'object') throw new Error(`fixture path ${path} runs off the reading`);
    at = at[p];
  }
  return { at, key: parts[parts.length - 1] };
}

/** Apply one break's mutation to one reading, in place. */
export function applyBreak(reading, brk) {
  if (brk.replace !== undefined) {
    for (const k of Object.keys(reading)) delete reading[k];
    Object.assign(reading, clone(brk.replace));
  }
  for (const [path, value] of Object.entries(brk.set ?? {})) {
    const { at, key } = parentOf(reading, path);
    at[key] = clone(value);
  }
  for (const path of brk.del ?? []) {
    const { at, key } = parentOf(reading, path);
    if (Array.isArray(at)) at.splice(Number(key), 1);
    else delete at[key];
  }
}

function selfTest() {
  const bad = [];
  const expect = (label, got, want) => {
    if (J(got) !== J(want)) bad.push(`${label}: got ${J(got)}, want ${J(want)}`);
  };

  const readings = JSON.parse(readFileSync(join(FIXTURES, 'readings.json'), 'utf8'));
  const breaks = JSON.parse(readFileSync(join(FIXTURES, 'breaks.json'), 'utf8'));

  // A clean row at both builds is every row ok, and exit 0.
  const cleanRows = rowsFor(ALL_ARMS, readings);
  expect('clean: every row ok', cleanRows.filter((r) => r.ok !== true).map(formatRow), []);
  expect('clean: exit 0', exitCodeOf(cleanRows), 0);
  expect('clean: two rows an arm and RUN', cleanRows.length, ALL_ARMS.length * 2 + 1);

  // Every arm and both builds are broken by at least one fixture.
  for (const arm of [...ALL_ARMS, 'RUN']) {
    if (!breaks.some((b) => b.arm === arm && b.want === false)) bad.push(`no break turns ${arm} red`);
  }

  // Each break turns exactly its own row, and names its arm.
  for (const brk of breaks) {
    const r = clone(readings);
    const target = brk.arm === 'RUN' ? r.run : r[brk.build]?.[brk.arm];
    if (target === undefined) {
      bad.push(`${brk.label}: no fixture reading for ${brk.arm} (${brk.build})`);
      continue;
    }
    try {
      applyBreak(target, brk);
    } catch (err) {
      bad.push(`${brk.label}: ${String(err?.message ?? err)}`);
      continue;
    }
    const rows = rowsFor(ALL_ARMS, r);
    const mine = rows.find((x) => x.arm === brk.arm && x.build === brk.build);
    const others = rows.filter((x) => !(x.arm === brk.arm && x.build === brk.build) && x.ok !== true);
    expect(`${brk.label}: its row`, mine === undefined ? 'missing' : mine.ok, brk.want);
    expect(`${brk.label}: no other row moved`, others.map(formatRow), []);
    expect(`${brk.label}: exit`, exitCodeOf(rows), brk.want === false ? 1 : 2);
    expect(`${brk.label}: the line names the arm`, mine !== undefined && formatRow(mine).includes(` ${brk.arm} (${brk.build}):`), true);
  }

  // A build never read is unreadable at every arm, so exit 2, never a pass.
  const noHead = rowsFor(ALL_ARMS, { parent: readings.parent, run: readings.run });
  expect('no HEAD readings: exit 2', exitCodeOf(noHead), 2);
  expect('no HEAD readings: every HEAD row null', noHead.filter((x) => x.build === 'head').every((x) => x.ok === null), true);
  const noRun = rowsFor(ALL_ARMS, { parent: readings.parent, head: readings.head });
  expect('no census: exit 2', exitCodeOf(noRun), 2);
  expect('nothing: exit 2', exitCodeOf([]), 2);
  expect('an ok that is undefined is not a pass', exitCodeOf([{ arm: 'K1', build: 'head', ok: undefined, said: '' }]), 2);
  expect('a failure beside an unreadable is exit 1', exitCodeOf([{ ok: false }, { ok: null }, { ok: true }]), 1);

  // The classifiers.
  expect('outcome: seen', outcomeOf({ value: 'w', savedContents: 'w', dirty: false }, 'p', 'w'), 'seen');
  expect('outcome: a dirty reload is not seen', outcomeOf({ value: 'w', savedContents: 'w', dirty: true }, 'p', 'w'), 'other');
  expect('outcome: stale', outcomeOf({ value: 'p', savedContents: 'p', dirty: false }, 'p', 'w'), 'stale');
  expect('outcome: no model', outcomeOf({ value: null, savedContents: 'p', dirty: false }, 'p', 'w'), 'unreadable');
  expect('redline: seen needs the drawn marker', redlineOutcomeOf({ savedContents: 'w', drawnHasMarker: false }, 'p', 'w'), 'other');

  // The composers, by this file's own arithmetic.
  expect('units', unitsOf('/a/b-c/d.md:1'), ['/', 'a/', 'b-', 'c/', 'd.md:1']);
  expect('first unit of a continuation', firstUnitOf('  labs/rook x'), 'labs/');
  expect('first unit of a bare token', firstUnitOf('end'), 'end');
  expect('agent break', agentBreak('mk ', '/aa/bb-cc/dd', 8), ['mk /aa/', 'bb-cc/dd']);
  expect('agent break: a unit wider than the pane', agentBreak('mk ', '/aaaaaaaaaaaa', 8), null);
  expect('soft wrap', softWrapRows('abcdefg', 3), ['abc', 'def', 'g']);
  expect('J3 caught: a unit that would have fit', layoutProblems(['mk /a/', 'b/', 'c/d.md'], 20).some((p) => p.includes('J3')), true);
  expect('J5 caught: a folder above a bare name short of the edge', layoutProblems(['mk /aaaaaa/bbbbbb/', 'cccccccccccccccc/', 'd.md end'], 20).some((p) => p.includes('J5')), true);
  expect('J1 caught: a row ending on a colon', layoutProblems(['mk /aaaaaa/bbbbbb/c.md:', '134/aaaaaaaaaaaaaaaaaaaaa', 'x/yyyyyyyyyyyyyy.md'], 23).some((p) => p.includes('J1')), true);
  expect('J5 not raised at the last column', layoutProblems(['mk /aaaaaa/bbbbbbb/', 'cccccccccccccccccc/', 'ddddddddddddddd.md'], 19).some((p) => p.includes('J5')), false);
  expect('J7 caught: a row short of the last column ending on a letter', layoutProblems(['mk /aaaaaa/bbbbbb', 'cccccccccccccccc/', 'dddddddd.md end'], 20).some((p) => p.includes('J7')), true);
  expect('J7 not raised after a - short of the last column', layoutProblems(['mk /aaaaaa/bbbbbb-', 'cccccccccccccccc/', 'dddddddd.md end'], 20).some((p) => p.includes('J7')), false);
  expect('J7 not raised at the last column', layoutProblems(['mk /aaaaaa/bbbbbbbb', 'ccccccccccccccccccc/', 'dddddddd.md end'], 19).some((p) => p.includes('J7')), false);
  for (const width of [40, 48, 60, 80, 120, 200]) {
    const w6 = composeWordWrap({ width, rel: P6_REL });
    expect(`P6 word wrap at ${String(width)}: two cells short of the last column`, w6 === null ? null : w6.rows[0].length, width - P6_SHORT_BY);
    expect(`P6 word wrap at ${String(width)}: the path ends the row`, w6 === null ? null : w6.rows[0].endsWith(` ${P6_REL}`), true);
    expect(`P6 word wrap at ${String(width)}: J7 alone refuses it`, w6 === null ? null : layoutProblems([w6.rows[0], w6.rows[1], 'x'], width).filter((p) => p.startsWith('boundary 0')), ['boundary 0: a row short of the last column that does not end in / or - (J7)']);
  }
  const ROOT_FIXTURE = '/private/var/folders/zz/abcdefgh1234567890_n/T/gmux-p347-wt-p347-12345/p347/head/proj';
  for (const width of [60, 70, 80, 90, 100, 110, 129, 144, 160, 187, 200, 233, 240]) {
    for (const [marker, leaf] of [['mkP1', 'brainstorming.md'], ['mkP3', 'brainstorm-p3.md'], ['mkP4', 'brainstorm-none.md']]) {
      const c = composeAgentBreak({ root: ROOT_FIXTURE, second: 'rook', leaf, width, marker });
      if (c === null) {
        bad.push(`agent break at ${String(width)} for ${leaf}: no layout`);
        continue;
      }
      expect(`agent break at ${String(width)} for ${leaf}: problems`, layoutProblems(c.rows, width), []);
      expect(`agent break at ${String(width)} for ${leaf}: every row but the last stops short of the last column`, c.rows.slice(0, -1).every((x) => x.length < width), true);
      expect(`agent break at ${String(width)} for ${leaf}: the rows hold the path`, c.rows.join(''), `${c.prefix}${c.path}:${String(P_LINE)} end`);
      expect(`agent break at ${String(width)} for ${leaf}: the prefix is the marker`, c.prefix.startsWith(`${marker} `), true);
      const tail = (c.rows[c.rows.length - 1].split(' ')[0] ?? '').replace(/:\d+$/, '');
      expect(`agent break at ${String(width)} for ${leaf}: the last row starts with the path's own tail`, tail !== '' && c.path.endsWith(tail), true);
    }
    const s = composeSoftWrap({ root: ROOT_FIXTURE, second: 'rook-wrap', leaf: 'brainstorm-wrap.md', width, marker: 'mkP2' });
    if (s === null) bad.push(`soft wrap at ${String(width)}: no layout`);
    else {
      expect(`soft wrap at ${String(width)}: rows`, s.rows.join(''), s.line);
      expect(`soft wrap at ${String(width)}: a path character on both sides of every wrap`, s.rows.slice(0, -1).every((x, k) => PATH_CHAR.test(x.slice(-1)) && PATH_CHAR.test(s.rows[k + 1].slice(0, 1))), true);
      expect(`soft wrap at ${String(width)}: at least three rows`, s.rows.length >= 3, true);
      expect(`soft wrap at ${String(width)}: every row but the last is full`, s.rows.slice(0, -1).every((x) => x.length === width), true);
      expect(`soft wrap at ${String(width)}: the path's end and its tail share the last row`, s.rows[s.rows.length - 1].endsWith(' end') && s.rows[s.rows.length - 1].length > 4 && s.rows[s.rows.length - 1].length < width, true);
    }
  }

  // The readers.
  expect('log hex', logHexOf('70\n33\nzz\n03\n'), ['70', '33', '03']);
  expect('hex of', hexOf('p3'), ['70', '33']);
  expect('prompt row', promptRowOf(['x', '> abc  ', '']), '> abc');
  expect('no prompt row', promptRowOf(['x', 'y']), null);
  expect('cell of', cellOf(['$ echo mkC /a', 'mkC /a/b.md end'], 'mkC', '/a/b.md'), { row: 1, col: 4, width: 7, text: 'mkC /a/b.md end' });
  expect('rows at', rowsAt(['a', 'b  ', 'c', 'd'], ['b', 'c']), 1);
  expect('rows at, out of order', rowsAt(['a', 'b', 'c'], ['c', 'b']), -1);
  const ls = parseLsof('p123\nfcwd\nn/\nftxt\nn/bin/x\nf3\nn/a/b\nf4\nn/a/c\nf5\nn/a/b\n');
  expect('lsof: numeric descriptors only', ls.count, 3);
  expect('lsof: names', ls.names, ['/a/b', '/a/c', '/a/b']);
  expect('named in', namedIn(ls.names, ['/a/b', '/a/c', '/x']), { named: 2, perFileMax: 2 });
  expect('history moved', historyMoved({ a: '1 2', b: '3 4' }, { a: '1 3', b: '3 4' }), ['a']);
  expect('history unmoved', historyMoved({ a: '1 2' }, { a: '1 2' }), []);
  expect('app.log: a watcher warning', watcherErrorsOf('{"level":"warn","scope":"watcher","msg":"x"}\n').length, 1);
  expect('app.log: a watcher info line', watcherErrorsOf('{"level":"info","scope":"watcher","msg":"x"}\n').length, 0);
  expect('app.log: an error naming the open-file watch', watcherErrorsOf('{"level":"error","scope":"git","msg":"open-file watch failed"}\n').length, 1);
  expect('app.log: an unrelated error', watcherErrorsOf('{"level":"error","scope":"pocket","msg":"nope"}\nnot json\n').length, 0);

  // The parent refusals.
  const fs = (builtSet, holdsSet, stale = null) => ({
    built: (d) => builtSet.includes(d),
    holds: (d, f) => holdsSet.includes(`${d}:${f}`),
    same: (a, b) => a === b,
    fresh: () => stale
  });
  const heads = PHASE_FILES.map((f) => `/head:${f}`);
  expect('refuse: absent', parentRefusal({ parent: '', root: '/head', ...fs(['/head'], heads) })?.startsWith('P347_PARENT_CHECKOUT names no checkout'), true);
  expect('refuse: this checkout', parentRefusal({ parent: '/head', root: '/head', ...fs(['/head'], heads) })?.includes('is this checkout'), true);
  expect('refuse: unbuilt parent', parentRefusal({ parent: '/p', root: '/head', ...fs(['/head'], heads) })?.includes('has no build'), true);
  expect('refuse: unbuilt HEAD', parentRefusal({ parent: '/p', root: '/head', ...fs(['/p'], heads) })?.includes('this checkout'), true);
  expect('refuse: a parent that is not one', parentRefusal({ parent: '/p', root: '/head', ...fs(['/p', '/head'], [...heads, `/p:${PHASE_FILES[0]}`]) })?.includes('not this phase'), true);
  expect('refuse: a HEAD without the phase', parentRefusal({ parent: '/p', root: '/head', ...fs(['/p', '/head'], []) })?.includes("not this phase's HEAD"), true);
  expect('refuse: a HEAD built before its sources', parentRefusal({ parent: '/p', root: '/head', ...fs(['/p', '/head'], heads, 'src/shared/keymap.ts') })?.includes('older than'), true);
  expect('accept: a built parent and HEAD', parentRefusal({ parent: '/p', root: '/head', ...fs(['/p', '/head'], heads) }), null);

  // The arm list.
  expect('arms: all but the held ones by default', armsAsked('').arms, ALL_ARMS.filter((a) => !HELD_ARMS.includes(a)));
  expect('arms: a held arm still runs by name', armsAsked('P3').arms, ['P3']);
  expect('arms: case and order', armsAsked('w13, k1,P3').arms, ['K1', 'P3', 'W13']);
  expect('arms: an unknown name is refused', armsAsked('K1,W99').bad, ['W99']);

  if (bad.length > 0) {
    process.stdout.write(`${TAG} --grader-self-test FAIL, ${String(bad.length)}:\n${bad.map((b) => `  - ${b}`).join('\n')}\n`);
    return false;
  }
  say(`--grader-self-test PASS: a clean row at both builds, ${String(breaks.length)} breaks each turning exactly its own row, the composers at thirteen widths, the readers, the refusals and the arm list. Nothing was launched.`);
  return true;
}

/**
 * Run only as the program, never on import (the self-test and a verifier's own
 * harness import the graders). Compared by REALPATH: Node names the main
 * module by its real path, so a checkout reached through a link (`/tmp` for
 * `/private/tmp`) would otherwise read as an import and do nothing, exit 0.
 */
const isMain = (() => {
  if (process.argv[1] === undefined) return false;
  try {
    return realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (isMain && process.argv.includes('--grader-self-test')) process.exit(selfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The run. Everything below runs only when this file is the program.
// ---------------------------------------------------------------------------

class Unreadable extends Error {}
class Fatal extends Error {}

const SESSION = 'p347-shell';
const HISTORY_FILES = Object.freeze(['.zsh_history', '.bash_history']);

/** `stat -f '%z %m'` of his two history files: size and time, never a byte of them. */
function historyStat(realHome) {
  const out = {};
  for (const name of HISTORY_FILES) {
    const p = join(realHome, name);
    const r = spawnSync('/usr/bin/stat', ['-f', '%z %m', p], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin' } });
    out[`~/${name}`] = r.status === 0 ? r.stdout.trim() : 'absent';
  }
  return out;
}

const disk = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
};
const alive = (pid) => {
  if (!(pid > 0)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Page expressions.
// ---------------------------------------------------------------------------

/** One tab as the Phase 268 drive reads it, plus what is drawn around it. */
const TAB = (path, marker) => `(() => {
  const p = window.__gmuxP268;
  if (p === undefined || p === null) return null;
  const r = p.read();
  const t = r.tabs.find((x) => x.path === ${J(path)}) ?? null;
  const doc = document.querySelector('.ed-redline-doc');
  return {
    activeId: r.activeId,
    editorFocused: r.editorFocused,
    toasts: r.toasts,
    tab: t === null ? null : { name: t.name, dirty: t.dirty, mode: t.mode, value: t.value, savedContents: t.savedContents, stopped: t.stopped },
    drawnHas: ${marker === undefined ? 'null' : `doc === null ? false : (doc.textContent ?? '').includes(${J(marker)})`},
    doc: doc !== null,
    skeleton: document.querySelector('.ed-skeleton') !== null,
    deletedBanner: Array.from(document.querySelectorAll('.banner-warning')).some((b) => (b.textContent ?? '').includes(${J(DELETED_SENTENCE)}))
  };
})()`;
const TAB_PATHS = `(() => { const p = window.__gmuxP268; return p ? p.read().tabs.map((t) => t.path) : null; })()`;
const DIRTY_PATHS = `(() => { const p = window.__gmuxP268; return p ? p.read().tabs.filter((t) => t.dirty).map((t) => t.path) : null; })()`;
const TAB_BOX = (name) => `(() => {
  const el = Array.from(document.querySelectorAll('.ed-tab')).find((t) => (t.querySelector('.ed-tab-name')?.textContent ?? '').trim() === ${J(name)});
  if (!el) return { found: false };
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const r = (el.querySelector('.ed-tab-name') ?? el).getBoundingClientRect();
  const x = Math.round(r.left + r.width / 2);
  const y = Math.round(r.top + r.height / 2);
  const hit = document.elementFromPoint(x, y);
  return { found: true, x, y, hit: hit !== null && hit.closest('.ed-tab') === el && hit.closest('.ed-tab-close') === null };
})()`;
const CLOSE_BOX = (name) => `(() => {
  const el = Array.from(document.querySelectorAll('.ed-tab')).find((t) => (t.querySelector('.ed-tab-name')?.textContent ?? '').trim() === ${J(name)});
  const b = el?.querySelector('.ed-tab-close') ?? null;
  if (!b) return { found: false };
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const r = b.getBoundingClientRect();
  const x = Math.round(r.left + r.width / 2);
  const y = Math.round(r.top + r.height / 2);
  const hit = document.elementFromPoint(x, y);
  return { found: true, x, y, hit: hit !== null && hit.closest('.ed-tab-close') === b };
})()`;
const ACTIVE_NAME = `(document.querySelector('.ed-tab.active .ed-tab-name')?.textContent ?? '').trim()`;
const PROJECT_NAMES = `Array.from(document.querySelectorAll('[data-project-id]')).map((el) => (el.querySelector('.prail-name, .ptab-name')?.textContent ?? '').trim())`;
const PROJECT_OPEN = (name) => `(() => {
  const el = Array.from(document.querySelectorAll('[data-project-id]')).find((e) => (e.querySelector('.prail-name, .ptab-name')?.textContent ?? '').trim() === ${J(name)});
  const b = el?.querySelector('button.prail-open, button.ptab') ?? null;
  if (!b) return false;
  b.click();
  return true;
})()`;
const PROJECT_CLOSE = (name) => `(() => {
  const el = Array.from(document.querySelectorAll('[data-project-id]')).find((e) => (e.querySelector('.prail-name, .ptab-name')?.textContent ?? '').trim() === ${J(name)});
  if (!el) return 'missing';
  const b = el.querySelector('.prail-close, .ptab-close');
  if (!b) return 'no close button';
  b.click();
  return 'clicked';
})()`;
const CLICK_DIALOG = (label) => `(() => {
  const b = Array.from(document.querySelectorAll('.modal[role="alertdialog"] .modal-actions button')).find((x) => (x.textContent ?? '').trim() === ${J(label)});
  if (!b) return false;
  b.click();
  return true;
})()`;
const NO_DIALOG = `document.querySelector('.modal[role="alertdialog"]') === null`;
const CHIP = (label) => `(() => {
  const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label=${J(label)}]');
  if (b === null || b.disabled) return false;
  b.click();
  return true;
})()`;
const DIALOG = `(() => {
  const modal = document.querySelector('.modal[role="alertdialog"]');
  if (!modal) return { open: false, buttons: [] };
  return {
    open: true,
    title: modal.querySelector('.modal-title')?.textContent ?? null,
    buttons: Array.from(modal.querySelectorAll('.modal-actions button')).map((b) => (b.textContent ?? '').trim())
  };
})()`;
const PRESS_CANCEL = CLICK_DIALOG('Cancel');
/** Focus out of the editor and into the session's terminal, which is what a click into a terminal does. */
const FOCUS_TERMINAL = `(() => {
  try { window.__gmuxP268?.blur(); } catch { /* the drive is optional here */ }
  const ta = Array.from(document.querySelectorAll('.gmux-terminal-pane textarea.xterm-helper-textarea')).find((x) => {
    const s = x.closest('.gmux-terminal-pane')?.querySelector('.xterm-screen');
    return s !== null && s !== undefined && s.getBoundingClientRect().width > 0;
  }) ?? null;
  if (ta !== null) ta.focus();
  const a = document.activeElement;
  return { focused: a !== null && a.classList.contains('xterm-helper-textarea'), editorFocused: a !== null && a.closest('.monaco-editor') !== null };
})()`;
const TERM_FOCUSED = `(() => { const a = document.activeElement; return a !== null && a.classList.contains('xterm-helper-textarea'); })()`;
/** The visible session's screen rectangle. The cell size comes from tmux's own width and height. */
const SCREEN = `(() => {
  for (const p of Array.from(document.querySelectorAll('.gmux-terminal-pane'))) {
    const s = p.querySelector('.xterm-screen');
    if (!s) continue;
    const r = s.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  return null;
})()`;
/** xterm's own answer to whether the pointer is over a link (probe:p247's second instrument). */
const ON_LINK = `document.querySelector('.xterm-cursor-pointer') !== null`;
/** The live Monaco editor's caret line, found the way probe:p241 finds the editor. */
const EDITOR_LINE = `(() => {
  const mount = document.querySelector('.ed-mount');
  if (!mount) return null;
  const key = Object.keys(mount).find((k) => k.startsWith('__reactFiber$'));
  if (!key) return null;
  const isEditor = (v) => v !== null && typeof v === 'object' && typeof v.getSupportedActions === 'function' && typeof v.getModel === 'function';
  let f = mount[key];
  while (f) {
    for (const fib of [f, f.alternate]) {
      let h = fib && fib.memoizedState;
      let n = 0;
      while (h && n < 200) {
        const s = h.memoizedState;
        if (s && typeof s === 'object' && 'current' in s && isEditor(s.current)) {
          const p = s.current.getPosition();
          return p ? p.lineNumber : null;
        }
        h = h.next;
        n += 1;
      }
    }
    f = f.return;
  }
  return null;
})()`;
const KB_ROWS = `Array.from(document.querySelectorAll('.kb-row')).map((r) => ({
  action: (r.querySelector('.kb-action')?.textContent ?? '').trim(),
  explain: (r.querySelector('.kb-explain')?.textContent ?? '').trim(),
  keys: (r.querySelector('.kb-keys')?.textContent ?? '').trim()
}))`;
const OVERLAY_ROWS = `Array.from(document.querySelectorAll('.shortcut-row')).map((r) => ({
  action: (r.querySelector('.shortcut-action')?.textContent ?? '').trim(),
  keys: Array.from(r.children).slice(1).map((c) => c.textContent ?? '').join('').trim()
}))`;

/** The key events K1 to K4 send. Code 67 is what probe:p320 sends for ⌘C. */
const KEYS = Object.freeze({
  cmdC: { key: 'c', code: 'KeyC', windowsVirtualKeyCode: 67, nativeVirtualKeyCode: 67, modifiers: 4 },
  ctrlC: { key: 'c', code: 'KeyC', windowsVirtualKeyCode: 67, nativeVirtualKeyCode: 67, modifiers: 2 },
  escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27, modifiers: 0 }
});

/**
 * K1 and K2 read the copy WITHOUT the person's pasteboard (probe:p320's C1):
 * main's `clipboard.write` is replaced by a recorder from the first K arm to
 * the end of the launch, and put back in its `finally`. When it cannot be
 * replaced the arm says so and copies nothing.
 */
const CLIP_PATCH = `(() => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { clipboard } = load('electron');
  if (globalThis.__p347Clip) return true;
  const original = clipboard.write;
  const rec = { original, writes: [] };
  const patched = (data) => { rec.writes.push(data); };
  try { clipboard.write = patched; } catch { return false; }
  if (clipboard.write !== patched) return false;
  globalThis.__p347Clip = rec;
  return true;
})()`;
const CLIP_READ = `JSON.stringify(globalThis.__p347Clip ? globalThis.__p347Clip.writes : null)`;
const CLIP_RESTORE = `(() => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { clipboard } = load('electron');
  if (globalThis.__p347Clip) { clipboard.write = globalThis.__p347Clip.original; delete globalThis.__p347Clip; }
  return true;
})()`;

// ---------------------------------------------------------------------------
// CDP targets.
// ---------------------------------------------------------------------------

/** A page target of this launch whose url passes `wantUrl` and whose `ready` expression answers a string. */
async function cdpForPage(profile, wantUrl, ready, timeoutMs, what) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl || !wantUrl(String(t.url ?? ''))) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl, { collect: ['Runtime.exceptionThrown'] });
          const a = await cdpEval(cdp, ready, 5000);
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch {
          if (cdp) {
            try {
              cdp.close();
            } catch {
              /* already closed */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Unreadable(`no ${what}`);
    await sleep(200);
  }
}

const appWindow = (profile) =>
  cdpForPage(
    profile,
    (url) => !url.includes('/settings/index.html'),
    `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' && typeof window.__gmuxP268 === 'object' ? location.href : null`,
    90000,
    'app window carrying the shot and Phase 268 drives'
  );
const settingsWindow = (profile) =>
  cdpForPage(profile, (url) => url.includes('/settings/index.html'), `typeof document === 'object' ? location.href : null`, 30000, 'Settings window');

/** The MAIN process, over the node inspector `--inspect=0` opened (probe:p320's reader). */
async function cdpForMain(handle, timeoutMs) {
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
    if (Date.now() - started > timeoutMs) throw new Unreadable('the main process inspector never appeared');
    await sleep(300);
  }
}
async function mainEval(cdp, expression, ms = 20_000) {
  const r = await cdp.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true }, ms);
  if (r.result?.exceptionDetails) throw new Error(`main threw: ${J(r.result.exceptionDetails).slice(0, 300)}`);
  return r.result?.result?.value;
}

// ---------------------------------------------------------------------------
// The scratch world: the folders a watcher must see as ignored exist BEFORE
// the app starts, because it reads ignored roots once at start (SPEC §1.3).
// ---------------------------------------------------------------------------

const NOTE = (name) => `# ${name}\n\nShort notes the probe wrote before the app started. An agent rewrites this file from outside the editor.\n`;
const LINES = (title, n) => `${[`# ${title}`, ...Array.from({ length: n - 1 }, (_, i) => `line ${String(i + 2)} of ${title}`)].join('\n')}\n`;
/** The ten tabs the W arms hold in the main project, in the order they open, and the view each needs. */
const W_TABS = Object.freeze([
  ['docs/tracked.md', 'tracked', 'Source'],
  ['notes/a.md', 'a', 'Source'],
  ['notes/b.md', 'b', 'Redline'],
  ['notes/c.md', 'c', 'Source'],
  ['notes/d.md', 'd', 'Source'],
  ['notes/e.md', 'e', 'Source'],
  ['notes/g.md', 'g', 'Source'],
  ['notes/h.md', 'h', 'Source'],
  ['src/x.md', 'x', 'Source'],
  ['debug.log', 'log', 'Source']
]);

function makeGit(home) {
  const run = (cwd, ...args) => {
    const r = spawnSync('git', args, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
    });
    return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
  };
  const ok = (cwd, ...args) => {
    const r = run(cwd, ...args);
    if (r.status !== 0) throw new Fatal(`git ${args.join(' ')} in ${cwd}: ${r.stderr.trim()}`);
    return r.stdout;
  };
  return { run, ok };
}

export function buildWorld(base, standInSource) {
  rmSync(base, { recursive: true, force: true });
  mkdirSync(base, { recursive: true });
  const root = realpathSync(base);
  if (/['\s\\]/.test(root)) throw new Fatal(`the scratch path ${J(root)} holds a quote, a space or a backslash, and the stand-in is typed into a shell`);
  const home = join(root, 'h');
  const profile = join(root, 'p');
  const bin = join(root, 'bin');
  const outside = join(root, 'outside');
  const proj = join(root, 'proj');
  const projw9 = join(root, 'projw9');
  const projnfd = join(root, 'projnfd');
  const w11 = W11_PROJECTS.map((n) => join(root, n));
  for (const d of [home, profile, bin, outside, join(proj, 'notes'), join(proj, 'docs'), join(proj, 'src'), join(proj, 'sub'), join(projw9, 'notes'), join(projnfd, NFD_FOLDER), ...w11.map((p) => join(p, 'notes'))]) {
    mkdirSync(d, { recursive: true });
  }
  const standIn = join(bin, 'stand-in.sh');
  copyFileSync(standInSource, standIn);
  const files = {
    control: join(proj, 'control.md'),
    readme: join(proj, 'README.md'),
    subReadme: join(proj, 'sub', 'README.md'),
    tracked: join(proj, 'docs', 'tracked.md'),
    x: join(proj, 'src', 'x.md'),
    log: join(proj, 'debug.log'),
    a: join(proj, 'notes', 'a.md'),
    b: join(proj, 'notes', 'b.md'),
    c: join(proj, 'notes', 'c.md'),
    d: join(proj, 'notes', 'd.md'),
    e: join(proj, 'notes', 'e.md'),
    g: join(proj, 'notes', 'g.md'),
    h: join(proj, 'notes', 'h.md'),
    secret: join(outside, 'secret.txt'),
    w9: [join(projw9, 'notes', 'p.md'), join(projw9, 'notes', 'q.md')],
    nfd: join(projnfd, NFD_FOLDER, 'n.md'),
    w11: w11.flatMap((p) => Array.from({ length: W11_PER_PROJECT }, (_, i) => join(p, 'notes', `t${String(i + 1).padStart(2, '0')}.txt`)))
  };
  writeFileSync(join(proj, '.gitignore'), 'notes/\n*.log\n');
  writeFileSync(files.control, '# control\n\nThe calibration row every P arm prints first.\n');
  writeFileSync(files.readme, '# the project readme\n');
  writeFileSync(files.subReadme, '# the sub folder readme\n');
  writeFileSync(files.tracked, '# Tracked\n\nA tracked file the repository watcher reports on.\n');
  writeFileSync(files.x, '# x\n\nA tracked markdown file.\n');
  writeFileSync(files.log, 'debug log line 1\n');
  for (const k of ['a', 'b', 'c', 'd', 'e', 'g', 'h']) writeFileSync(files[k], NOTE(`${k}.md`));
  writeFileSync(files.secret, 'secret v0 before the swap\n');
  writeFileSync(join(projw9, '.gitignore'), 'notes/\n');
  writeFileSync(join(projw9, 'README.md'), '# projw9\n');
  for (const f of files.w9) writeFileSync(f, NOTE(basename(f)));
  writeFileSync(join(projnfd, '.gitignore'), `${NFC_FOLDER}/\n`);
  writeFileSync(join(projnfd, 'README.md'), '# projnfd\n');
  writeFileSync(files.nfd, NOTE('n.md'));
  for (const p of w11) {
    writeFileSync(join(p, '.gitignore'), 'notes/\n');
    writeFileSync(join(p, 'README.md'), `# ${basename(p)}\n`);
  }
  for (const f of files.w11) writeFileSync(f, `${basename(f)}: a file in an ignored folder\n`);
  const git = makeGit(home);
  for (const dir of [proj, projw9, projnfd, ...w11]) {
    git.ok(dir, 'init', '-q', '-b', 'main');
    git.ok(dir, 'config', 'user.email', 'p347@example.invalid');
    git.ok(dir, 'config', 'user.name', 'p347');
  }
  git.ok(proj, 'add', '.gitignore', 'control.md', 'README.md', 'sub', 'docs', 'src');
  git.ok(proj, 'commit', '-q', '-m', 'first');
  for (const dir of [projw9, projnfd, ...w11]) {
    git.ok(dir, 'add', '.gitignore', 'README.md');
    git.ok(dir, 'commit', '-q', '-m', 'first');
  }
  // THE PRECONDITION, graded: git itself says these are ignored.
  const ignored = [
    [proj, 'notes/a.md'],
    [proj, 'debug.log'],
    [projw9, 'notes/p.md'],
    [projnfd, `${NFD_FOLDER}/n.md`],
    ...w11.map((p) => [p, 'notes/t01.txt'])
  ].filter(([dir, rel]) => git.run(dir, 'check-ignore', '-q', rel).status !== 0);
  return {
    root,
    home,
    profile,
    bin,
    standIn,
    record: join(root, 'opened.jsonl'),
    keysLog: join(root, 'keys.log'),
    proj,
    projw9,
    projnfd,
    w11,
    files,
    notIgnored: ignored.map(([dir, rel]) => `${basename(dir)}/${rel}`)
  };
}

// ---------------------------------------------------------------------------
// The kit: one build's page, terminal, writer and descriptors.
// ---------------------------------------------------------------------------

export function makeKit({ cdp, world, build, socket, tmuxBin, handle, shEnv }) {
  const { proj, files } = world;
  const NAMES = {};
  for (const [rel] of W_TABS) NAMES[join(proj, rel)] = basename(rel);
  const lastDoor = new Map();
  let seq = 0;
  const ev = (expr, ms = 20000) => cdpEval(cdp, expr, ms);
  const tmux = (...a) => (spawnSync(tmuxBin, ['-L', socket, ...a], { encoding: 'utf8', timeout: 20000 }).stdout ?? '').trimEnd();
  const sh = (script, ...args) => {
    const r = spawnSync('/bin/sh', ['-c', script, 'sh', ...args], { encoding: 'utf8', env: shEnv, timeout: 20000 });
    if (r.status !== 0) throw new Unreadable(`the outside writer failed: ${String(r.stderr).trim().slice(0, 200)}`);
  };

  const k = {
    build,
    cdp,
    notes: [],
    fullCols: null,
    pane: null,
    mainPid: 0,
    wReady: false,
    keys: { running: false, banner: null },
    clip: { main: null, patched: false },
    note(l) {
      k.notes.push(l);
      say(`(${build}) ${l}`);
    },

    // ----------------------------------------------------- the doors' clock
    doorAt(repo = proj) {
      lastDoor.set(repo, Date.now());
    },
    sinceDoor(repo = proj) {
      const t = lastDoor.get(repo);
      return t === undefined ? Number.POSITIVE_INFINITY : Date.now() - t;
    },
    async settle(repo, ms) {
      const t = lastDoor.get(repo);
      if (t === undefined) return;
      const left = t + ms - Date.now();
      if (left > 0) await sleep(left);
    },
    async waitUntil(fn, ms, every = 100) {
      const until = Date.now() + ms;
      for (;;) {
        let v = false;
        try {
          v = fn() === true;
        } catch {
          v = false;
        }
        if (v) return true;
        if (Date.now() > until) return false;
        await sleep(every);
      }
    },
    async waitFor(expr, ms, every = 100) {
      const until = Date.now() + ms;
      for (;;) {
        let v = null;
        try {
          v = await ev(expr, 10000);
        } catch {
          v = null;
        }
        if (v === true) return true;
        if (Date.now() > until) return false;
        await sleep(every);
      }
    },

    // ---------------------------------------------------------- the writer
    /** Fresh bytes from outside, in place, with a marker line of their own (an agent's write). */
    fresh(path, label) {
      seq += 1;
      const marker = `P347 MARKER ${label} ${String(seq)} ${randomBytes(4).toString('hex')}`;
      const bytes = `${NOTE(basename(path))}\n${marker}\n`;
      k.write(path, bytes);
      return { bytes, marker };
    },
    write(path, bytes) {
      sh('printf "%s" "$1" > "$2"', bytes, path);
      if (disk(path) !== bytes) throw new Unreadable(`the writer's bytes are not on disk for ${basename(path)}`);
    },
    /** A rename-over: temp then `mv`, which is every Tortie save (SPEC §1.3). */
    replace(path, bytes) {
      const tmp = join(dirname(path), `.${basename(path)}.p347tmp`);
      sh('printf "%s" "$1" > "$2" && mv -f "$2" "$3"', bytes, tmp, path);
      if (disk(path) !== bytes) throw new Unreadable(`the replaced bytes are not on disk for ${basename(path)}`);
    },
    /** Two replaces back to back in one /bin/sh line (W14). */
    pair(path, first, second) {
      const t1 = join(dirname(path), `.${basename(path)}.p347t1`);
      const t2 = join(dirname(path), `.${basename(path)}.p347t2`);
      sh('printf "%s" "$1" > "$3" && printf "%s" "$2" > "$4" && mv -f "$3" "$5"; mv -f "$4" "$5"', first, second, t1, t2, path);
      if (disk(path) !== second) throw new Unreadable(`the pair's second bytes are not on disk for ${basename(path)}`);
    },
    remove(path) {
      sh('rm -f "$1"', path);
    },
    /** A link to `target`, renamed over `path` (W13). */
    swapLink(target, path) {
      const tmp = join(dirname(path), `.${basename(path)}.p347link`);
      sh('ln -s "$1" "$2" && mv -f "$2" "$3"', target, tmp, path);
    },

    // --------------------------------------------------- main's descriptors
    lsof() {
      if (!(k.mainPid > 0)) return { ok: false, count: 0, names: [] };
      const r = spawnSync('/usr/sbin/lsof', ['-nP', '-w', '-p', String(k.mainPid), '-F', 'fn'], { encoding: 'utf8', timeout: 30000 });
      const parsed = parseLsof(r.stdout);
      return { ok: r.status === 0 && parsed.count > 0, ...parsed };
    },
    /** The fewest descriptors over three reads 300 ms apart, so a pipe a walk held for a moment is not counted. */
    async lsofSettled() {
      let best = null;
      for (let i = 0; i < 3; i += 1) {
        const l = k.lsof();
        if (!l.ok) return l;
        if (best === null || l.count < best.count) best = l;
        await sleep(300);
      }
      return best;
    },

    // --------------------------------------------------------- the editor
    async tab(path, marker) {
      const r = await ev(TAB(path, marker));
      if (r === null || r === undefined) throw new Unreadable('the Phase 268 drive is not on the page');
      return r;
    },
    async waitTab(path, pred, ms, marker) {
      const until = Date.now() + ms;
      let r = await k.tab(path, marker);
      while (!pred(r) && Date.now() < until) {
        await sleep(50);
        r = await k.tab(path, marker);
      }
      return r;
    },
    /** Poll until `pred` or `ms`; answer the last reading and when `pred` first held, or null. */
    async waitTabTimed(path, pred, ms, marker) {
      const t0 = Date.now();
      let r = await k.tab(path, marker);
      while (!pred(r) && Date.now() - t0 < ms) {
        await sleep(50);
        r = await k.tab(path, marker);
      }
      return { reading: r, atMs: pred(r) ? Date.now() - t0 : null };
    },
    async tabPaths() {
      const r = await ev(TAB_PATHS);
      if (!Array.isArray(r)) throw new Unreadable('the Phase 268 drive is not on the page');
      return r;
    },
    async mouseClick(x, y) {
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
    },
    async clickTab(name) {
      const box = await ev(TAB_BOX(name));
      if (box?.found !== true) throw new Unreadable(`no strip tab named ${name}`);
      if (box.hit !== true) throw new Unreadable(`a click at the strip tab ${name} would land on something else`);
      await k.mouseClick(box.x, box.y);
      k.doorAt(proj);
      if (!(await k.waitFor(`${ACTIVE_NAME} === ${J(name)}`, 3000, 25))) throw new Unreadable(`the strip click on ${name} did not make it the active tab`);
    },
    async closeTab(name) {
      const box = await ev(CLOSE_BOX(name));
      if (box?.found !== true || box.hit !== true) throw new Unreadable(`the close button of ${name} could not be clicked`);
      await k.mouseClick(box.x, box.y);
      k.doorAt(proj);
      const gone = await k.waitFor(`!Array.from(document.querySelectorAll('.ed-tab .ed-tab-name')).some((n) => (n.textContent ?? '').trim() === ${J(name)})`, 4000);
      if (!gone) throw new Unreadable(`${name} is still on the strip after its close button`);
    },
    async openProject(name) {
      if ((await ev(PROJECT_OPEN(name))) !== true) throw new Unreadable(`no project tab named ${name}`);
      k.doorAt(join(dirname(proj), name));
      await sleep(800);
    },
    async chip(label, path) {
      const modeOf = { Source: 'file', Redline: 'redline' }[label];
      const now = await k.tab(path);
      if (now.tab?.mode !== modeOf) {
        if ((await ev(CHIP(label))) !== true) throw new Unreadable(`the mode chip has no enabled ${label} for ${basename(path)}`);
        k.doorAt(proj);
        const r = await k.waitTab(path, (t) => t.tab?.mode === modeOf, 5000);
        if (r.tab?.mode !== modeOf) throw new Unreadable(`${basename(path)} did not go to ${label}`);
      }
      if (label === 'Source') {
        const m = await k.waitTab(path, (t) => typeof t.tab?.value === 'string', 15000);
        if (typeof m.tab?.value !== 'string') throw new Unreadable(`${basename(path)} has no Monaco model in Source`);
      }
      if (label === 'Redline') {
        const r = await k.waitTab(path, (t) => t.activeId === path && t.tab?.mode === 'redline' && t.doc && !t.skeleton, 20000);
        if (!(r.activeId === path && r.tab?.mode === 'redline' && r.doc && !r.skeleton)) throw new Unreadable(`the Redline document of ${basename(path)} never drew`);
      }
      await sleep(300);
    },
    async ensureActive(path) {
      const r = await k.tab(path);
      if (r.tab === null) throw new Unreadable(`${basename(path)} is not open`);
      if (r.activeId !== path) {
        await k.settle(proj, 1200);
        await k.clickTab(NAMES[path]);
      }
    },
    async ensureSource(path) {
      await k.ensureActive(path);
      await k.chip('Source', path);
    },
    async ensureRedline(path) {
      await k.ensureActive(path);
      await k.chip('Redline', path);
    },
    /**
     * Wait out every walk a setup step may have started (probe:p334's `quiet`),
     * then answer the tab's reading and whether it is clean and in step.
     */
    async quiet(path, repo = proj) {
      k.doorAt(repo);
      await k.settle(repo, 1200);
      const inStep = (t) => t.tab?.dirty === false && t.tab?.savedContents === disk(path) && t.tab?.value === disk(path);
      const r = await k.waitTab(path, inStep, 2000);
      return { ...r, inStep: inStep(r) };
    },
    async focusTerminal() {
      const r = await ev(FOCUS_TERMINAL);
      return { focused: r?.focused === true, editorFocused: r?.editorFocused === true };
    },
    /** Door-free at this instant: focus is out of the editor and no gesture into this repository for 1,200 ms. */
    async doorFree(repo = proj) {
      const r = await ev(`(() => { const a = document.activeElement; return a !== null && a.closest('.monaco-editor') === null && a.closest('.ed-redline-view') === null; })()`);
      return r === true && k.sinceDoor(repo) >= 1200;
    },
    async type(path, text) {
      const r = await ev(`window.__gmuxP268.type(${J(path)}, ${J(text)}, 0).then((x) => x.activeId)`, 60000);
      k.doorAt(proj);
      return r;
    },
    async setPolicy(mode, delayMs) {
      return ev(`window.__gmuxP268.setPolicy(${J(mode)}, ${String(delayMs)}).then((x) => x.mode)`, 30000);
    },
    async clearToasts() {
      await ev('window.__gmuxP268.clearToasts() && true');
    },
    async dialog() {
      return ev(DIALOG);
    },
    async explicitSave(path) {
      await ev(`window.__gmuxP268.explicitSave(${J(path)}).then(() => true)`, 60000);
      k.doorAt(proj);
    },
    /** Make a tab clean and its idea of the disk true, through the shipped doors only (probe:p334's). */
    async syncWithDisk(path) {
      let r = await k.tab(path);
      if (r.tab === null) throw new Unreadable(`${basename(path)} is not open`);
      if (r.tab.dirty) {
        await k.settle(proj, 1200);
        await k.explicitSave(path);
        await sleep(400);
        if ((await k.dialog()).open) {
          await ev('window.__gmuxP268.pressOverwrite() && true');
          await k.waitFor(NO_DIALOG, 5000);
        }
        r = await k.waitTab(path, (t) => t.tab?.dirty === false, 5000);
        if (r.tab?.dirty !== false) throw new Unreadable(`${basename(path)} could not be made clean`);
      }
      if (r.tab.savedContents !== disk(path)) {
        // The live bus re-reads a clean tab at BOTH builds: a tracked write walks the repository.
        k.fresh(files.tracked, 'sync');
        r = await k.waitTab(path, (t) => t.tab?.savedContents === disk(path), 5000);
        if (r.tab?.savedContents !== disk(path)) throw new Unreadable(`${basename(path)} could not be brought back in step with its disk`);
        await sleep(1500);
      }
      await k.clearToasts();
    },
    /** A look (Phase 334's return door): another tab, then this one, past the floor. */
    async look(path, pred) {
      await k.settle(proj, 1200);
      await k.clickTab('tracked.md');
      await sleep(1200);
      await k.settle(proj, 1200);
      await k.clickTab(NAMES[path]);
      return k.waitTab(path, pred, 2500);
    },
    async drive(spec) {
      await ev(`window.__gmuxShotDrive(${J(spec)}).then(() => true)`, 180000);
      k.doorAt(spec.projectPath);
    },
    async editorLine(ms) {
      const until = Date.now() + ms;
      let line = null;
      for (;;) {
        try {
          line = await ev(EDITOR_LINE, 5000);
        } catch {
          line = null;
        }
        if (typeof line === 'number' && line > 1) return line;
        if (Date.now() > until) return typeof line === 'number' ? line : null;
        await sleep(150);
      }
    },
    async recover() {
      try {
        if ((await k.dialog()).open) await ev(PRESS_CANCEL);
      } catch {
        /* best effort */
      }
      try {
        await k.setPolicy('off', 1000);
      } catch {
        /* best effort */
      }
      try {
        await k.clearToasts();
      } catch {
        /* best effort */
      }
    },

    // ------------------------------------------------------- the terminal
    paneId() {
      if (k.pane !== null) return k.pane;
      const rows = tmux('list-panes', '-a', '-F', '#{pane_id} #{session_name}').split('\n').filter((l) => l.trim() !== '');
      const mine = rows.find((l) => l.slice(l.indexOf(' ') + 1) === SESSION) ?? (rows.length === 1 ? rows[0] : undefined);
      k.pane = mine === undefined ? null : mine.split(' ')[0];
      return k.pane;
    },
    capture() {
      const pane = k.paneId();
      if (pane === null) return [];
      return (spawnSync(tmuxBin, ['-L', socket, 'capture-pane', '-p', '-t', pane], { encoding: 'utf8', timeout: 20000 }).stdout ?? '').split('\n');
    },
    paneSize() {
      const pane = k.paneId();
      const line = tmux('list-panes', '-a', '-F', '#{pane_id} #{pane_width} #{pane_height}').split('\n').find((l) => l.startsWith(`${String(pane)} `));
      const [, w, h] = (line ?? '').split(' ').map((n) => Number.parseInt(n, 10));
      return { cols: Number.isFinite(w) ? w : null, rows: Number.isFinite(h) ? h : null };
    },
    /** Rows read until two reads, with the pane's size, agree (probe:p247's `settledCapture`). */
    async settledCapture() {
      const read = () => `${J(k.paneSize())}\n${k.capture().join('\n')}`;
      let last = read();
      for (let i = 0; i < 8; i += 1) {
        await sleep(500);
        const now = read();
        if (now === last) return now.split('\n').slice(1);
        last = now;
      }
      return last.split('\n').slice(1);
    },
    async geometry() {
      const screen = await ev(SCREEN, 10000);
      const size = k.paneSize();
      if (screen === null || !(size.cols > 0) || !(size.rows > 0)) return null;
      return { left: screen.left, top: screen.top, cellW: screen.width / size.cols, cellH: screen.height / size.rows, cols: size.cols, rows: size.rows };
    },
    cellAt(geo, row, col) {
      return { x: geo.left + (col + 0.5) * geo.cellW, y: geo.top + (row + 0.5) * geo.cellH };
    },
    /** Out of the terminal, then back on its last row (probe:p247's `parkPointer`, both halves). */
    async park(geo) {
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 4, y: 4 });
      await sleep(250);
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo.left + geo.cellW / 2, y: geo.top + (geo.rows - 0.5) * geo.cellH });
      await sleep(400);
    },
    async waitOnLink(budgetMs = 4000) {
      const t0 = Date.now();
      for (;;) {
        if ((await ev(ON_LINK, 10000)) === true) return true;
        if (Date.now() - t0 >= budgetMs) return false;
        await sleep(100);
      }
    },
    async hover(geo, row, col) {
      await k.park(geo);
      const p = k.cellAt(geo, row, col);
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
      return k.waitOnLink();
    },
    /** The screen row a captured row is drawn on, asked of xterm by its own link (d = 0, then +1). */
    async rowOnScreen(geo, row, col, width) {
      for (const d of [0, 1]) {
        await k.park(geo);
        await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo.left + (col + width / 2) * geo.cellW, y: geo.top + (row + d + 0.5) * geo.cellH });
        if (await k.waitOnLink()) return row + d;
      }
      return null;
    },
    async press(geo, row, col) {
      await k.park(geo);
      const p = k.cellAt(geo, row, col);
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
      const onLink = await k.waitOnLink();
      await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: 1 });
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', buttons: 0, clickCount: 1 });
      await sleep(2200);
      return { onLink };
    },
    /**
     * Close every editor tab of the project and wait for the pane to be back
     * at its width with no tab open, read three times alike (probe:p247's
     * `closeAllTabs`): an open tab narrows the pane and tmux reflows it.
     */
    async closeAllTabs() {
      let agreed = 0;
      let lastCols = null;
      let last = 'nothing was read';
      for (let i = 0; i < 80; i += 1) {
        const n = await ev(`(() => { const b = document.querySelector('.ed-tab-close'); if (b) b.click(); return document.querySelectorAll('.ed-tab').length; })()`, 10000);
        if ((await k.dialog()).open) return { ok: false, why: `closing a tab asked a question (${J((await k.dialog()).title)})` };
        const { cols } = k.paneSize();
        last = `${String(n)} tab(s) and ${String(cols)} columns`;
        const target = k.fullCols ?? lastCols;
        if (n === 0 && cols !== null && cols === target) {
          agreed += 1;
          if (agreed === 2) {
            if (k.fullCols === null) k.fullCols = cols;
            await sleep(800);
            return { ok: true };
          }
        } else {
          agreed = 0;
        }
        lastCols = cols;
        await sleep(300);
      }
      return { ok: false, why: `the pane never came back to an empty strip at a steady width (last read ${last})` };
    },
    sendLine(text) {
      const pane = k.paneId();
      if (pane === null) throw new Unreadable('the session has no pane');
      tmux('send-keys', '-t', pane, '-l', text);
      tmux('send-keys', '-t', pane, 'Enter');
    },
    async printRows(name, lines) {
      const file = join(world.root, `rows-${name}.txt`);
      writeFileSync(file, `${lines.join('\n')}\n`);
      k.sendLine(`printf '\\033[H\\033[2J'; /bin/sh '${world.standIn}' print '${file}'`);
      await sleep(1500);
    },

    // ------------------------------------------------- the stand-in prompt
    logHex() {
      return logHexOf(disk(world.keysLog));
    },
    async ensurePrompt() {
      if (k.keys.running) return;
      const banner = `P347 COPY ROW ${randomBytes(4).toString('hex')}`;
      k.sendLine(`printf '\\033[H\\033[2J'; /bin/sh '${world.standIn}' prompt '${world.keysLog}' '${banner}'`);
      const up = await k.waitUntil(() => existsSync(world.keysLog) && promptRowOf(k.capture()) === '>', 10000, 200);
      if (!up) throw new Unreadable(`the stand-in prompt did not come up (the pane reads ${J(k.capture().filter((r) => r.trim() !== '').slice(-4))})`);
      k.keys = { running: true, banner };
    },
    async endPrompt() {
      if (!k.keys.running) return;
      const pane = k.paneId();
      tmux('send-keys', '-t', pane, 'C-d');
      const ended = await k.waitUntil(() => k.logHex().slice(-1)[0] === '04', 5000, 200);
      if (!ended) k.note('the stand-in prompt did not log its 04; the shell may still be inside it');
      await sleep(600);
      k.keys = { running: false, banner: null };
    },
    async clickBlank() {
      const geo = await k.geometry();
      if (geo === null) return false;
      const p = k.cellAt(geo, geo.rows - 1, 0);
      // A click on a blank row clears any selection, sends nothing (tmux's
      // mouse is off, gmux-tmux.conf) and puts focus in the terminal; when
      // xterm did not take focus from the click, it is given it.
      await k.mouseClick(p.x, p.y);
      await sleep(300);
      if ((await ev(TERM_FOCUSED)) !== true) await ev(FOCUS_TERMINAL);
      return (await ev(TERM_FOCUSED)) === true;
    },
    async chord(key) {
      await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...key });
      await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
    },
    async clipStart() {
      if (k.clip.patched) return true;
      try {
        k.clip.main = await cdpForMain(handle, 30_000);
        k.clip.patched = (await mainEval(k.clip.main, CLIP_PATCH)) === true;
      } catch (err) {
        k.note(`the main process could not be reached for the clipboard recorder (${String(err?.message ?? err)})`);
        k.clip.patched = false;
      }
      return k.clip.patched;
    },
    async clipWrites() {
      if (!k.clip.patched) return null;
      try {
        const w = JSON.parse((await mainEval(k.clip.main, CLIP_READ)) ?? 'null');
        return Array.isArray(w) ? w : null;
      } catch {
        return null;
      }
    },
    async clipStop() {
      if (k.clip.main !== null) {
        try {
          await mainEval(k.clip.main, CLIP_RESTORE);
        } catch {
          /* the app may be gone */
        }
        try {
          k.clip.main.close();
        } catch {
          /* closed */
        }
      }
      k.clip = { main: null, patched: false };
    }
  };
  return k;
}

const pick = (r) => (r?.tab === null || r?.tab === undefined ? null : { value: r.tab.value, savedContents: r.tab.savedContents, dirty: r.tab.dirty });
const seenAs = (bytes) => (r) => r.tab?.value === bytes && r.tab?.savedContents === bytes && r.tab?.dirty === false;

// ---------------------------------------------------------------------------
// The arms. Each sets its own preconditions, so P347_ARMS may pick any.
// ---------------------------------------------------------------------------

/** Every K arm starts at the stand-in's prompt with the terminal focused. */
async function keysReady(k) {
  await k.ensurePrompt();
  return k.clickBlank();
}

/** Every P arm starts from an empty strip, the pane at its full width, and the stand-in ended. */
async function pathsReady(k) {
  await k.endPrompt();
  const closed = await k.closeAllTabs();
  if (!closed.ok) throw new Unreadable(closed.why);
  return k.fullCols;
}

/** Print `lines` after the control row, find `want` on screen, calibrate the screen rows on the control row's link. */
async function stagePrint(k, w, name, lines, want) {
  await k.printRows(name, [`mkC ${w.files.control} end`, '', ...lines]);
  const rows = await k.settledCapture();
  const anchor = cellOf(rows, 'mkC', w.files.control);
  const at = rowsAt(rows, want);
  const shown = rows.filter((r) => r.trim() !== '').slice(0, 24);
  if (anchor === null || at < 0) return { found: false, shown };
  const geo = await k.geometry();
  if (geo === null) throw new Unreadable('the terminal geometry could not be read');
  const onScreen = await k.rowOnScreen(geo, anchor.row, anchor.col, anchor.width);
  if (onScreen === null) return { found: true, calibrated: false, shown };
  return { found: true, calibrated: true, geo, at, offset: onScreen - anchor.row };
}

/** P1 to P4: compose, print, hover every row's first path cell, press one row, read what opened and where. */
async function joinArm(k, w, { arm, kind, second, leaf, create, plant, press }) {
  const width = await pathsReady(k);
  const marker = `mk${arm}`;
  const c =
    kind === 'soft'
      ? composeSoftWrap({ root: w.proj, second, leaf, width, marker })
      : composeAgentBreak({ root: w.proj, second, leaf, width, marker });
  if (c === null) throw new Unreadable(`no layout of the path fits a pane ${String(width)} columns wide`);
  if (create) {
    mkdirSync(dirname(c.path), { recursive: true });
    writeFileSync(c.path, LINES(leaf, 200));
  }
  let planted = null;
  if (plant) {
    const tok = (c.rows[c.rows.length - 1].split(' ')[0] ?? '').replace(/:\d+$/, '');
    planted = join(w.proj, tok);
    mkdirSync(dirname(planted), { recursive: true });
    writeFileSync(planted, LINES(`the planted fragment ${tok}`, 200));
  }
  const base = { width, rows: c.rows, whole: c.path, planted, plantedExists: planted !== null && existsSync(planted) };
  const s = await stagePrint(k, w, arm, kind === 'soft' ? [c.line] : c.rows, c.rows);
  if (!s.found || !s.calibrated) return { ...base, found: s.found, calibrated: s.calibrated ?? false, shown: s.shown };
  const firstCol = (i) => (i === 0 ? c.prefix.length : 0);
  const pointers = [];
  for (let i = 0; i < c.rows.length; i += 1) pointers.push(await k.hover(s.geo, s.at + i + s.offset, firstCol(i)));
  const pressRow = press === 'last' ? c.rows.length - 1 : Math.floor(c.rows.length / 2);
  const before = await k.tabPaths();
  const p = await k.press(s.geo, s.at + pressRow + s.offset, firstCol(pressRow) + 1);
  const after = await k.tabPaths();
  const opened = after.filter((x) => !before.includes(x));
  const line = opened.length === 1 ? await k.editorLine(4000) : null;
  return { ...base, found: true, calibrated: true, offset: s.offset, pointers, pressRow, onLinkAtPress: p.onLink, opened, line };
}

const ARMS = {
  async K1(k) {
    const focused = await keysReady(k);
    const mark0 = k.logHex().length;
    await k.cdp.call('Input.insertText', { text: DRAFT });
    const want = hexOf(DRAFT).join('');
    const drafted = await k.waitUntil(() => k.logHex().slice(mark0).join('') === want && promptRowOf(k.capture()) === `> ${DRAFT}`, 8000, 150);
    const clipped = await k.clipStart();
    const before = await k.clipWrites();
    const stillFocused = await cdpEval(k.cdp, TERM_FOCUSED);
    const mark = k.logHex().length;
    await k.chord(KEYS.cmdC);
    await sleep(1200);
    const newBytes = k.logHex().slice(mark);
    const promptRow = promptRowOf(k.capture());
    const after = await k.clipWrites();
    return {
      focused: focused && stillFocused === true,
      drafted,
      draft: DRAFT,
      newBytes,
      promptRow,
      clipboardWrites: clipped && Array.isArray(before) && Array.isArray(after) ? after.length - before.length : null
    };
  },

  async K2(k) {
    await keysReady(k);
    const patched = await k.clipStart();
    if (!patched) return { patched: false };
    const banner = k.keys.banner;
    const rows = await k.settledCapture();
    const at = rows.findIndex((r) => r.trimEnd() === banner);
    if (at < 0) throw new Unreadable(`the stand-in's row ${J(banner)} is not on the screen`);
    const geo = await k.geometry();
    if (geo === null) throw new Unreadable('the terminal geometry could not be read');
    const mark = k.logHex().length;
    const before = (await k.clipWrites()) ?? [];
    let copied = null;
    let newWrites = 0;
    let attempts = 0;
    // The row tmux names and the row xterm draws agree on a fresh pane; one
    // row of forward drift has been measured after a reflow (probe:p247), so
    // a copy that missed is tried once on the row below.
    for (const d of [0, 1]) {
      attempts += 1;
      const y = geo.top + (at + d + 0.5) * geo.cellH;
      const x0 = geo.left + 0.25 * geo.cellW;
      const x1 = geo.left + (geo.cols - 0.5) * geo.cellW;
      await k.park(geo);
      await k.cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0, y });
      await k.cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: x0, y, button: 'left', buttons: 1, clickCount: 1 });
      for (let i = 1; i <= 6; i += 1) {
        await k.cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0 + ((x1 - x0) * i) / 6, y, button: 'left', buttons: 1 });
        await sleep(40);
      }
      await k.cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x1, y, button: 'left', buttons: 0, clickCount: 1 });
      await sleep(300);
      await k.chord(KEYS.cmdC);
      await sleep(1200);
      const writes = (await k.clipWrites()) ?? [];
      newWrites = writes.length - before.length;
      copied = newWrites > 0 ? String(writes[writes.length - 1]?.text ?? '') : null;
      if (copied !== null && copied.split('\n').map((l) => l.trimEnd()).includes(banner)) break;
    }
    const newBytes = k.logHex().slice(mark);
    // Clear the selection, so K3 and every later arm start without one.
    await k.clickBlank();
    return { patched: true, banner, copied, newWrites, attempts, newBytes };
  },

  async K3(k) {
    await keysReady(k);
    const focused = (await cdpEval(k.cdp, TERM_FOCUSED)) === true;
    const mark = k.logHex().length;
    await k.chord(KEYS.ctrlC);
    await sleep(1200);
    return { focused, newBytes: k.logHex().slice(mark), promptRow: promptRowOf(k.capture()) };
  },

  async K4(k, w) {
    await cdpEval(k.cdp, 'window.gmux.openSettings().then(() => true)', 30000);
    const set = await settingsWindow(w.profile);
    let settings = [];
    try {
      await cdpEval(set.cdp, `(() => { location.hash = '#keyboard'; return true; })()`);
      const until = Date.now() + 15000;
      while (Date.now() < until) {
        settings = (await cdpEval(set.cdp, KB_ROWS, 10000)) ?? [];
        if (settings.length > 0) break;
        await sleep(200);
      }
    } finally {
      try {
        await cdpEval(set.cdp, 'setTimeout(() => window.close(), 0) && true', 5000);
      } catch {
        /* closing ends the target */
      }
      set.cdp.close();
    }
    await cdpEval(k.cdp, `window.__gmuxP268.menuAction('shortcuts') && true`);
    await k.waitFor(`document.querySelectorAll('.shortcut-row').length > 0`, 8000);
    const overlay = (await cdpEval(k.cdp, OVERLAY_ROWS)) ?? [];
    for (let i = 0; i < 3 && (await cdpEval(k.cdp, `document.querySelectorAll('.shortcut-row').length`)) > 0; i += 1) {
      await k.chord(KEYS.escape);
      await sleep(300);
    }
    if ((await cdpEval(k.cdp, `document.querySelectorAll('.shortcut-row').length`)) > 0) {
      await cdpEval(k.cdp, `window.__gmuxP268.menuAction('shortcuts') && true`);
      await sleep(300);
    }
    return { settings, overlay };
  },

  P1: (k, w) => joinArm(k, w, { arm: 'P1', kind: 'agent', second: 'rook', leaf: 'brainstorming.md', create: true, plant: false, press: 'middle' }),
  P2: (k, w) => joinArm(k, w, { arm: 'P2', kind: 'soft', second: 'rook-wrap', leaf: 'brainstorm-wrap.md', create: true, plant: false, press: 'middle' }),
  P3: (k, w) => joinArm(k, w, { arm: 'P3', kind: 'agent', second: 'rook-p3', leaf: 'brainstorm-p3.md', create: true, plant: true, press: 'last' }),
  P4: (k, w) => joinArm(k, w, { arm: 'P4', kind: 'agent', second: 'rook-none', leaf: 'brainstorm-none.md', create: false, plant: false, press: 'middle' }),

  async P5(k, w) {
    const width = await pathsReady(k);
    const row1 = `mkP5 see ${w.proj}/sub/`;
    const row2 = 'README.md is the readme';
    const shortOfEdge = row1.length < width;
    const s = await stagePrint(k, w, 'P5', [row1, row2], [row1, row2]);
    if (!s.found || !s.calibrated) return { found: s.found, calibrated: s.calibrated ?? false, shortOfEdge, readme: w.files.readme, shown: s.shown };
    const before = await k.tabPaths();
    const p = await k.press(s.geo, s.at + 1 + s.offset, 4);
    const after = await k.tabPaths();
    return { found: true, calibrated: true, shortOfEdge, width, onLink: p.onLink, readme: w.files.readme, opened: after.filter((x) => !before.includes(x)) };
  },

  async P6(k, w) {
    const width = await pathsReady(k);
    const c = composeWordWrap({ width, rel: P6_REL });
    if (c === null) throw new Unreadable(`a pane ${String(width)} columns wide is too narrow for P6's row`);
    const readme = join(w.proj, P6_REL);
    const bak = `${readme}.bak`;
    mkdirSync(dirname(readme), { recursive: true });
    writeFileSync(readme, LINES('hw6 README.md', 20));
    writeFileSync(bak, LINES('hw6 README.md.bak, the file a join would open', 20));
    const base = { width, rows: c.rows, readme, bak, bakExists: existsSync(bak), shortBy: width - c.rows[0].length };
    const s = await stagePrint(k, w, 'P6', c.rows, c.rows);
    if (!s.found || !s.calibrated) return { ...base, found: s.found, calibrated: s.calibrated ?? false, shown: s.shown };
    const row = s.at + s.offset;
    const pointerTop = await k.hover(s.geo, row, c.pathCol + 1);
    const pointerBelow = await k.hover(s.geo, row + 1, 1);
    const beforeTop = await k.tabPaths();
    await k.press(s.geo, row, c.pathCol + 1);
    const afterTop = await k.tabPaths();
    const beforeBelow = await k.tabPaths();
    await k.press(s.geo, row + 1, 1);
    const afterBelow = await k.tabPaths();
    return {
      ...base,
      found: true,
      calibrated: true,
      offset: s.offset,
      pointerTop,
      pointerBelow,
      openedTop: afterTop.filter((x) => !beforeTop.includes(x)),
      openedBelow: afterBelow.filter((x) => !beforeBelow.includes(x))
    };
  },

  async W0(k, w) {
    await wSetup(k, w);
    const T = w.files.tracked;
    await k.ensureSource(T);
    await k.quiet(T);
    await k.focusTerminal();
    const doorFree = await k.doorFree();
    const previous = (await k.tab(T)).tab?.value;
    const { bytes } = k.fresh(T, 'W0');
    const after = await k.waitTab(T, seenAs(bytes), STALE_AFTER_MS);
    await sleep(1500);
    return { doorFree, previous, written: bytes, after: pick(after) };
  },

  W1: (k, w) => looksArm(k, w, { path: w.files.a, n: LOOKS.W1, label: 'W1', how: 'in place' }),
  W3: (k, w) => looksArm(k, w, { path: w.files.a, n: LOOKS.W3, label: 'W3', how: 'replace' }),
  W14: (k, w) => looksArm(k, w, { path: w.files.a, n: LOOKS.W14, label: 'W14', how: 'pair' }),

  async W15(k, w) {
    const N = w.files.nfd;
    // Its own project, so the main project's ten tabs are not evicted; the tab
    // path is the disk's own (decomposed) spelling, as the tree would hand it.
    await k.drive({ projectPath: w.projnfd, openRel: `${NFD_FOLDER}/n.md`, mode: 'file' });
    await sleep(300);
    await k.chip('Source', N);
    await k.quiet(N, w.projnfd);
    await k.focusTerminal();
    const iterations = [];
    for (let i = 1; i <= LOOKS.W15; i += 1) {
      const doorFree = await k.doorFree(w.projnfd);
      const previous = (await k.tab(N)).tab?.value;
      const bytes = `${NOTE('n.md')}\nW15 write ${String(i)} ${randomBytes(4).toString('hex')}\n`;
      k.write(N, bytes);
      const r = await k.waitTabTimed(N, seenAs(bytes), STALE_AFTER_MS);
      iterations.push({ doorFree, previous, written: bytes, seenAtMs: r.atMs, after: pick(r.reading) });
      await sleep(400);
    }
    try {
      await k.openProject(basename(w.proj));
    } catch {
      /* the next arm opens what it needs */
    }
    return { iterations };
  },

  async W2(k, w) {
    await wSetup(k, w);
    const B = w.files.b;
    await k.setPolicy('off', 1000);
    await k.syncWithDisk(B);
    await k.ensureRedline(B);
    await k.quiet(B);
    await k.focusTerminal();
    const iterations = [];
    for (let i = 1; i <= LOOKS.W2; i += 1) {
      const doorFree = await k.doorFree();
      const previous = (await k.tab(B)).tab?.savedContents;
      const { bytes, marker } = k.fresh(B, `W2-${String(i)}`);
      const r = await k.waitTabTimed(B, (t) => t.tab?.savedContents === bytes && t.drawnHas === true, STALE_AFTER_MS, marker);
      iterations.push({
        doorFree,
        previous,
        written: bytes,
        seenAtMs: r.atMs,
        after: r.reading.tab === null ? null : { savedContents: r.reading.tab.savedContents, drawnHasMarker: r.reading.drawnHas === true }
      });
      await sleep(400);
    }
    return { iterations };
  },

  async W4(k, w) {
    await wSetup(k, w);
    const D = w.files.d;
    await k.setPolicy('off', 1000);
    await k.syncWithDisk(D);
    await k.ensureSource(D);
    await k.clearToasts();
    await k.setPolicy('afterDelay', 500);
    try {
      await k.quiet(D);
      await k.type(D, 'P');
      const landedP = await k.waitUntil(() => (disk(D) ?? '').endsWith('P'), 3000, 50);
      await k.focusTerminal();
      await k.settle(w.proj, 1200);
      await sleep(400);
      const doorFree = await k.doorFree();
      const { bytes } = k.fresh(D, 'W4');
      const r = await k.waitTabTimed(D, seenAs(bytes), STALE_AFTER_MS);
      const seen = r.atMs !== null && r.atMs <= SEEN_WITHIN_MS;
      await k.type(D, 'Q');
      await sleep(2500);
      const after = await k.tab(D);
      return { landedP, doorFree, name: 'd.md', written: bytes, seen, seenAtMs: r.atMs, disk: disk(D), stopped: after.tab?.stopped ?? null, toasts: after.toasts, dirty: after.tab?.dirty ?? null };
    } finally {
      await k.setPolicy('off', 1000);
    }
  },

  async W5(k, w) {
    await wSetup(k, w);
    const E = w.files.e;
    await k.setPolicy('off', 1000);
    await k.syncWithDisk(E);
    await k.ensureSource(E);
    await k.quiet(E);
    const previous = (await k.tab(E)).tab?.value;
    await k.type(E, 'D');
    const typed = (await k.tab(E)).tab?.value === `${String(previous)}D`;
    await k.focusTerminal();
    await k.settle(w.proj, 1200);
    const { bytes } = k.fresh(E, 'W5');
    await sleep(STALE_AFTER_MS);
    const after = await k.tab(E);
    await k.explicitSave(E);
    await sleep(400);
    const dialog = await k.dialog();
    if (dialog.open) await cdpEval(k.cdp, PRESS_CANCEL);
    await k.waitFor(NO_DIALOG, 4000);
    await sleep(300);
    const cancelled = await k.tab(E);
    const open = (await k.dialog()).open;
    return {
      typed,
      previous,
      written: bytes,
      after: pick(after),
      disk: disk(E),
      dialog: { open: dialog.open, title: dialog.title ?? null, buttons: dialog.buttons },
      afterCancel: { open, dirty: cancelled.tab?.dirty ?? null, disk: disk(E) }
    };
  },

  async W6(k, w) {
    await wSetup(k, w);
    const E = w.files.e;
    await k.setPolicy('off', 1000);
    await k.syncWithDisk(E);
    await k.ensureSource(E);
    await k.setPolicy('afterDelay', 500);
    try {
      await k.quiet(E);
      await k.focusTerminal();
      // The typing runs in the page on its own timer while this process writes.
      const typing = cdpEval(k.cdp, `window.__gmuxP268.type(${J(E)}, ${J(W6_TYPED)}, 60).then(() => true)`, 60000).catch(() => false);
      k.doorAt(w.proj);
      let writes = 0;
      for (let i = 1; i <= 20; i += 1) {
        k.write(E, `w6 writer ${String(i).padStart(2, '0')} ${randomBytes(2).toString('hex')}\n`);
        writes += 1;
        await sleep(50);
      }
      const typedDone = (await typing) === true;
      await sleep(STALE_AFTER_MS);
      const after = await k.tab(E);
      return { typedText: W6_TYPED, typedDone, writes, buffer: after.tab?.value ?? null, disk: disk(E), stopped: after.tab?.stopped ?? null, toasts: after.toasts };
    } finally {
      await k.setPolicy('off', 1000);
    }
  },

  async W7(k, w) {
    await wSetup(k, w);
    const G = w.files.g;
    await k.setPolicy('off', 1000);
    await k.syncWithDisk(G);
    await k.ensureSource(G);
    // (a) delete, and the file back 50 ms later.
    await k.quiet(G);
    await k.focusTerminal();
    const freeA = await k.doorFree();
    const prevA = (await k.tab(G)).tab?.value;
    k.remove(G);
    const removedA = !existsSync(G);
    await sleep(50);
    const wA = k.fresh(G, 'W7a').bytes;
    const ra = await k.waitTabTimed(G, seenAs(wA), STALE_AFTER_MS);
    const a = { doorFree: freeA, removed: removedA, previous: prevA, written: wA, after: pick(ra.reading), seenAtMs: ra.atMs, banner: ra.reading.deletedBanner === true };
    const la = await k.look(G, seenAs(wA));
    a.look = { after: pick(la), banner: la.deletedBanner === true };
    // (b) delete, and the file back after 3 s, later than any window.
    await k.quiet(G);
    await k.focusTerminal();
    const freeB = await k.doorFree();
    const prevB = (await k.tab(G)).tab?.value;
    k.remove(G);
    const removedB = !existsSync(G);
    const t0 = Date.now();
    const rb = await k.waitTab(G, (t) => t.deletedBanner === true, STALE_AFTER_MS);
    const left = t0 + 3000 - Date.now();
    if (left > 0) await sleep(left);
    const wB = k.fresh(G, 'W7b').bytes;
    const recreatedAtMs = Date.now() - t0;
    await sleep(SEEN_WITHIN_MS);
    const rr = await k.tab(G);
    const lb = await k.look(G, seenAs(wB));
    const b = {
      doorFree: freeB,
      removed: removedB,
      previous: prevB,
      written: wB,
      bannerBeforeRecreate: rb.deletedBanner === true,
      recreatedAtMs,
      afterRecreate: { after: pick(rr), banner: rr.deletedBanner === true },
      look: { after: pick(lb), banner: lb.deletedBanner === true }
    };
    return { a, b };
  },

  async W8(k, w) {
    await wSetup(k, w);
    const H = w.files.h;
    await k.settle(w.proj, 1200);
    await sleep(500);
    const l0 = k.lsof();
    const armedBefore = l0.names.includes(H);
    await k.closeTab('h.md');
    await sleep(1000);
    k.fresh(H, 'W8');
    await sleep(1000);
    const l1 = k.lsof();
    return { lsofOk: l0.ok && l1.ok, closed: true, armedBefore, namedAfter: l1.names.includes(H) };
  },

  async W10(k, w) {
    await wSetup(k, w);
    const X = w.files.x;
    const L = w.files.log;
    await k.settle(w.proj, 1200);
    await k.focusTerminal();
    const l0 = k.lsof();
    const px = (await k.tab(X)).tab?.value;
    const pl = (await k.tab(L)).tab?.value;
    const bx = k.fresh(X, 'W10x').bytes;
    const bl = k.fresh(L, 'W10log').bytes;
    const rx = await k.waitTab(X, seenAs(bx), STALE_AFTER_MS);
    const rl = await k.waitTab(L, seenAs(bl), STALE_AFTER_MS);
    await sleep(1500);
    const l1 = k.lsof();
    const named = Math.max(namedIn(l0.names, [X, L]).named, namedIn(l1.names, [X, L]).named);
    // The control: the notes/ files every W arm before this one left open (W8 closed h.md; W13, after this, swaps c.md).
    const watched = [w.files.a, w.files.b, w.files.d, w.files.e, w.files.g];
    const control = Math.min(namedIn(l0.names, watched).named, namedIn(l1.names, watched).named);
    return {
      lsofOk: l0.ok && l1.ok,
      named,
      control,
      xSeen: outcomeOf(pick(rx), px, bx) === 'seen',
      logSeen: outcomeOf(pick(rl), pl, bl) === 'seen'
    };
  },

  async W13(k, w) {
    await wSetup(k, w);
    const C = w.files.c;
    const S = w.files.secret;
    await k.setPolicy('off', 1000);
    await k.syncWithDisk(C);
    await k.ensureSource(C);
    await k.quiet(C);
    await k.focusTerminal();
    const v0 = `secret v0 ${randomBytes(4).toString('hex')}\n`;
    k.write(S, v0);
    const old = (await k.tab(C)).tab?.value ?? null;
    const samples = [k.lsof()];
    const armedBefore = samples[0].names.includes(C);
    k.swapLink(S, C);
    let swapped = false;
    try {
      swapped = lstatSync(C).isSymbolicLink();
    } catch {
      swapped = false;
    }
    await sleep(1500);
    samples.push(k.lsof());
    const writes = [];
    for (let i = 1; i <= 3; i += 1) {
      const v = `secret v${String(i)} ${randomBytes(4).toString('hex')}\n`;
      k.write(S, v);
      writes.push(v);
      await sleep(400);
      samples.push(k.lsof());
    }
    await sleep(1200);
    samples.push(k.lsof());
    const afterWrites = (await k.tab(C)).tab?.value ?? null;
    const la = await k.look(C, (t) => t.tab?.value === writes[2]);
    return {
      lsofOk: samples.every((s) => s.ok),
      swapped,
      armedBefore,
      secretNamed: samples.some((s) => s.names.includes(S)),
      old,
      v0,
      writes,
      afterWrites,
      afterLook: la.tab?.value ?? null
    };
  },

  async W11(k, w) {
    for (const p of w.w11) {
      await k.drive({ projectPath: p });
      await sleep(300);
    }
    await sleep(2000);
    const before = await k.lsofSettled();
    const rels = Array.from({ length: W11_PER_PROJECT }, (_, i) => `notes/t${String(i + 1).padStart(2, '0')}.txt`);
    for (const p of w.w11) await k.drive({ projectPath: p, openRels: rels });
    await sleep(2500);
    const after = await k.lsofSettled();
    const tabs = await k.tabPaths();
    const { named, perFileMax } = namedIn(after.names, w.files.w11);
    return {
      lsofOk: before.ok && after.ok,
      opened: w.files.w11.filter((f) => tabs.includes(f)).length,
      before: before.count,
      after: after.count,
      named,
      perFileMax
    };
  },

  async W9(k, w) {
    await k.drive({ projectPath: w.projw9, openRels: ['notes/p.md', 'notes/q.md'] });
    await sleep(2000);
    const l0 = k.lsof();
    const namedBefore = namedIn(l0.names, w.files.w9).named;
    const clicked = await cdpEval(k.cdp, PROJECT_CLOSE(basename(w.projw9)));
    if (clicked !== 'clicked') throw new Unreadable(`the project's close button: ${String(clicked)}`);
    await k.waitFor(`document.querySelector('.modal[role="alertdialog"]') !== null`, 5000);
    await cdpEval(k.cdp, CLICK_DIALOG('Close project'));
    await k.waitFor(NO_DIALOG, 5000);
    const closed = await k.waitFor(`!${PROJECT_NAMES}.includes(${J(basename(w.projw9))})`, 5000);
    await sleep(1500);
    const l1 = k.lsof();
    return { lsofOk: l0.ok && l1.ok, closed, files: w.files.w9.length, namedBefore, namedAfter: namedIn(l1.names, w.files.w9).named };
  },

  /** W12's half inside the launch: every tab clean, and how many ignored files main holds at the quit. */
  async W12(k, w) {
    try {
      await k.openProject(basename(w.proj));
    } catch {
      /* the project tab may already be the open one */
    }
    await k.setPolicy('off', 1000);
    const dirty = (await cdpEval(k.cdp, DIRTY_PATHS)) ?? [];
    for (const path of dirty) await k.syncWithDisk(path);
    await sleep(1500);
    const l = k.lsof();
    const ignored = [w.files.a, w.files.b, w.files.c, w.files.d, w.files.e, w.files.g, w.files.h, w.files.nfd, ...w.files.w11];
    return { inside: true, lsofOk: l.ok, armedAtQuit: namedIn(l.names, ignored).named, cleaned: dirty.length };
  }
};

/** W1, W3 and W14 on notes/a.md: in place, rename-over, or a pair of replaces. */
async function looksArm(k, w, { path, n, label, how }) {
  await wSetup(k, w);
  await k.setPolicy('off', 1000);
  await k.syncWithDisk(path);
  await k.ensureSource(path);
  await k.quiet(path);
  await k.focusTerminal();
  const iterations = [];
  for (let i = 1; i <= n; i += 1) {
    const doorFree = await k.doorFree();
    const previous = (await k.tab(path)).tab?.value;
    const t0 = Date.now();
    let bytes = '';
    if (how === 'pair') {
      const first = `${label} pair ${String(i)} first ${randomBytes(4).toString('hex')}\n`;
      bytes = `${label} pair ${String(i)} second ${randomBytes(4).toString('hex')}\n`;
      k.pair(path, first, bytes);
    } else {
      bytes = `${NOTE(basename(path))}\n${label} write ${String(i)} ${randomBytes(4).toString('hex')}\n`;
      if (how === 'replace') k.replace(path, bytes);
      else k.write(path, bytes);
    }
    const r = await k.waitTabTimed(path, seenAs(bytes), how === 'pair' ? SEEN_WITHIN_MS : STALE_AFTER_MS);
    iterations.push({ doorFree, previous, written: bytes, seenAtMs: r.atMs, after: pick(r.reading) });
    // Pairs are 1,500 ms apart; every other write waits 400 ms past its reading.
    const gap = how === 'pair' ? t0 + 1500 - Date.now() : 400;
    if (gap > 0) await sleep(gap);
  }
  return { iterations };
}

/** The ten W tabs in the main project, opened once, each in its view. */
async function wSetup(k, w) {
  if (k.wReady) return;
  await k.endPrompt();
  const closed = await k.closeAllTabs();
  if (!closed.ok) throw new Unreadable(closed.why);
  for (const [rel, , view] of W_TABS) {
    await k.drive({ projectPath: w.proj, openRel: rel, mode: 'file' });
    await sleep(300);
    await k.chip(view, join(w.proj, rel));
  }
  const names = await cdpEval(k.cdp, `Array.from(document.querySelectorAll('.ed-tab .ed-tab-name')).map((n) => (n.textContent ?? '').trim())`);
  const missing = W_TABS.map(([rel]) => basename(rel)).filter((n) => !names.includes(n));
  if (missing.length > 0) throw new Unreadable(`the strip lacks ${missing.join(', ')} after setup (it holds ${J(names)})`);
  await sleep(2000);
  k.wReady = true;
}

// ---------------------------------------------------------------------------
// The run: the parent first, then HEAD, one Electron at a time.
// ---------------------------------------------------------------------------

function refuse(why) {
  console.error(`${TAG} UNREADABLE: ${why}`);
  process.exit(2);
}

const realOr = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};

const headOf = (dir) => {
  const r = spawnSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  });
  return r.status === 0 ? r.stdout.trim() : null;
};

/** The tmux a build's app runs, so the probe's client speaks to its own server. */
function tmuxFor(checkout) {
  const override = (process.env['GMUX_TMUX_BIN'] ?? '').trim();
  if (override !== '') return override;
  const vendored = join(checkout, 'build', 'vendor', 'tmux', 'bin', 'tmux');
  return existsSync(vendored) ? vendored : 'tmux';
}

/** The newest phase source this checkout's out/main/index.js is older than, or null. */
function staleBuild(checkout) {
  let built = 0;
  try {
    built = statSync(join(checkout, 'out', 'main', 'index.js')).mtimeMs;
  } catch {
    return 'out/main/index.js';
  }
  for (const rel of PHASE_SOURCES) {
    try {
      if (statSync(join(checkout, rel)).mtimeMs > built) return rel;
    } catch {
      /* a missing source is the phase-file refusal's to name */
    }
  }
  return null;
}

async function main() {
  const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (socket === '') {
    say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
    const wrapped = spawnSync(process.execPath, [join(ROOT, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p347', `node ${process.argv[1]}`], {
      cwd: ROOT,
      stdio: 'inherit'
    });
    process.exit(wrapped.status ?? 2);
  }
  if (socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) refuse(`refusing the socket ${J(socket)}: not a scratch socket.`);
  const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
  if (harnessDir === '') refuse('no GMUX_HARNESS_DIR. Run me through build/harness-socket.mjs.');

  const PARENT_RAW = (process.env['P347_PARENT_CHECKOUT'] ?? '').trim();
  const PARENT_DIR = PARENT_RAW === '' ? '' : realOr(PARENT_RAW);
  const parentWhy = parentRefusal({
    parent: PARENT_DIR,
    root: realOr(ROOT),
    built: (d) => existsSync(join(d, 'out', 'main', 'index.js')),
    holds: (d, f) => existsSync(join(d, f)),
    same: (a, b) => realOr(a) === realOr(b),
    fresh: staleBuild
  });
  if (parentWhy !== null) refuse(parentWhy);

  const { arms: ASKED, bad: BAD_ARMS } = armsAsked(process.env['P347_ARMS']);
  if (BAD_ARMS.length > 0) refuse(`P347_ARMS names ${BAD_ARMS.join(', ')}, which is no arm (${ALL_ARMS.join(', ')}).`);
  const want = (arm) => ASKED.includes(arm);
  const KEEP = (process.env['P347_KEEP'] ?? '') === '1';

  mkdirSync(harnessDir, { recursive: true });
  const HARNESS = realOr(harnessDir);
  const SCRATCH = join(HARNESS, 'p347');
  const REPORT_PATH = resolve((process.env['P347_REPORT'] ?? '').trim() || `${HARNESS}-probe-p347.json`);
  const insideOf = (p, dir) => p === dir || p.startsWith(`${dir}${sep}`);
  if (insideOf(REPORT_PATH, realOr(ROOT)) || insideOf(REPORT_PATH, ROOT)) {
    refuse(`P347_REPORT (${REPORT_PATH}) must sit outside this checkout: electron-builder packs out/, and the repository is not a report shelf.`);
  }
  if (!KEEP && insideOf(REPORT_PATH, SCRATCH)) refuse(`P347_REPORT (${REPORT_PATH}) sits inside the scratch directory, which is removed at the end.`);

  // HIS HISTORY. Read before anything starts, after each launch, and at the end; size and time only.
  // The passwd entry's home, which a HOME this process was handed cannot move.
  const REAL_HOME = (() => {
    try {
      return userInfo().homedir;
    } catch {
      return process.env['HOME'] ?? '';
    }
  })();
  if (REAL_HOME === '') refuse('his home could not be named, so his history could not be watched');
  const historyAtStart = historyStat(REAL_HOME);
  say(`his history at the start: ${J(historyAtStart)}`);

  const PREFIX = 'p347';
  /** Every Claude Code and shell-session variable this process inherited, REMOVED from the app's environment. */
  const STRIPPED = Object.fromEntries(
    Object.keys(process.env)
      .filter(
        (n) =>
          /^(?:CLAUDECODE|CLAUDE_)/.test(n) ||
          ['GMUX_CONFIG_ROOT', 'TERM_SESSION_ID', 'TERM_PROGRAM', 'TERM_PROGRAM_VERSION', 'GMUX_NO_OPEN_FILE_WATCH', 'HISTFILE', 'ZDOTDIR'].includes(n)
      )
      .map((n) => [n, undefined])
  );

  const report = {
    phase: 347,
    started: new Date().toISOString(),
    root: ROOT,
    parent: PARENT_DIR,
    parentSha: headOf(PARENT_DIR),
    headSha: headOf(ROOT),
    socket,
    arms: ASKED,
    builds: {},
    history: { start: historyAtStart },
    rows: [],
    exit: null
  };
  const readings = {};
  const appPids = [];
  let fatal = null;
  const runRows = [];

  say(`parent ${PARENT_DIR} at ${String(report.parentSha)}, HEAD ${ROOT} at ${String(report.headSha)}; arms ${ASKED.join(',')}`);
  mkdirSync(SCRATCH, { recursive: true });
  // The scratch is removed in a finally, whatever an arm or a launch did (P347_KEEP=1 keeps it).
  try {

    for (const build of ['parent', 'head']) {
      if (fatal !== null) break;
      const checkout = build === 'parent' ? PARENT_DIR : ROOT;
      const b = { checkout, sha: build === 'parent' ? report.parentSha : report.headSha, notes: [] };
      report.builds[build] = b;
      readings[build] = {};
      let world = null;
      try {
        world = buildWorld(join(SCRATCH, build), join(HERE, 'stand-in.sh'));
      } catch (err) {
        fatal = `(${build}) the scratch world could not be built: ${String(err?.message ?? err)}`;
        break;
      }
      b.world = { root: world.root, proj: world.proj, profile: world.profile, home: world.home };
      if (world.notIgnored.length > 0) {
        fatal = `(${build}) git does not ignore ${world.notIgnored.join(', ')} in the scratch projects`;
        break;
      }
      const pre = hidden.hiddenAgentsPrecheck({ checkout, prefix: PREFIX, home: world.home, userPath: process.env['PATH'] ?? '' });
      b.hiddenPrecheck = pre;
      if (!pre.ok) {
        fatal = `(${build}) ${checkout}'s own overlay parser does not hide the five agents: ${pre.said}`;
        break;
      }
      hidden.writeHiddenAgents(world.profile, PREFIX);
      const shEnv = { ...process.env, ...STRIPPED, HOME: world.home, ZDOTDIR: world.home, HISTFILE: '/dev/null' };
      const tmuxBin = tmuxFor(checkout);
      b.tmux = tmuxBin;
      const historyBefore = historyStat(REAL_HOME);
      let endAt = null;
      let exitedAt = null;
      let w12Inside = null;
      say(`(${build}) launching from ${checkout}`);
      try {
        await withElectron(
          {
            label: `p347-${build}`,
            userDataDir: world.profile,
            tmuxSocket: socket,
            cwd: checkout,
            args: [
              '--remote-debugging-port=0',
              '--inspect=0',
              '--use-mock-keychain',
              '--disable-backgrounding-occluded-windows',
              '--disable-renderer-backgrounding',
              '--disable-background-timer-throttling'
            ],
            env: withoutDevRenderer({
              ...STRIPPED,
              HOME: world.home,
              ZDOTDIR: world.home,
              HISTFILE: '/dev/null',
              GMUX_TMUX_SOCKET: socket,
              GMUX_PROBES: '1',
              GMUX_SPECSTORY_NO_CLOUD: '1',
              GMUX_PATH_OPEN_RECORD: world.record,
              GMUX_LOG_FILE: '1'
            }),
            graceMs: GRACE_MS,
            ceilingMs: 40 * 60 * 1000
          },
          async (handle) => {
            const { cdp, url } = await appWindow(world.profile);
            const mainPid = handle.appPid();
            appPids.push(mainPid);
            say(`(${build}) app window at ${url}, main pid ${String(mainPid)}`);
            const k = makeKit({ cdp, world, build, socket, tmuxBin, handle, shEnv });
            k.mainPid = mainPid;
            try {
              await cdp.call('Runtime.enable');
              // Monaco's focus tracker needs real focus EVENTS (probe:p268 arm H, probe:p334).
              try {
                await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true });
              } catch {
                b.notes.push('focus emulation is unavailable');
              }
              await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
              const loadBy = Date.now() + 30000;
              while ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0]?.loadEventEnd ?? 0`)) <= 0) {
                if (Date.now() > loadBy) throw new Unreadable('the page never finished loading');
                await sleep(50);
              }
              // THE GUARD, READ BACK before any arm: none of the five may resolve.
              let scan = null;
              try {
                scan = JSON.parse(await cdpEval(cdp, hidden.AGENTS_LIST_EXPR, 90000));
              } catch {
                scan = null;
              }
              const verdict = hidden.hiddenAgentsScanVerdict(scan);
              b.agentsScan = verdict;
              if (!verdict.ok) throw new Fatal(`(${build}) the app's own detection was not kept off the hidden agents: ${verdict.said}`);
              // The one session every K and P arm types into, and every W arm's focus.
              await k.drive({ projectPath: world.proj, editorWidth: 1100, session: { agent: 'shell', name: SESSION } });
              const paneUp = await k.waitUntil(() => k.paneId() !== null && k.capture().some((r) => r.trim() !== ''), 20000, 250);
              if (!paneUp) throw new Fatal(`(${build}) the session's shell never drew a prompt on the harness socket`);
              b.pane = k.pane;
              for (const arm of ALL_ARMS) {
                if (!want(arm)) continue;
                const t = Date.now();
                try {
                  readings[build][arm] = await ARMS[arm](k, world);
                } catch (err) {
                  if (err instanceof Fatal) throw err;
                  readings[build][arm] = { unreadable: err instanceof Unreadable ? err.message : `it threw: ${String(err?.stack ?? err).slice(0, 600)}` };
                  await k.recover();
                }
                if (arm === 'W12') {
                  w12Inside = readings[build][arm];
                  say(`(${build}) W12's half inside the launch in ${String(Date.now() - t)} ms: ${J(w12Inside)}`);
                  continue;
                }
                const g = GRADERS[arm](build, readings[build][arm], readings);
                say(`(${build}) ${arm} in ${String(Date.now() - t)} ms: ${g.ok === true ? 'ok' : g.ok === false ? 'DISAGREES' : 'UNREADABLE'}: ${g.said}`);
              }
              b.notes.push(...k.notes);
            } finally {
              await k.clipStop();
              try {
                await cdpEval(cdp, 'window.__gmuxShotCleanup ? window.__gmuxShotCleanup().then(() => true) : true', 30000);
              } catch {
                /* the helper ends the tree anyway */
              }
              cdp.close();
              // W12: the quit is the helper's SIGTERM, timed from here to the shim's exit.
              void handle.exited.then(() => {
                exitedAt = Date.now();
              });
              endAt = Date.now();
            }
          }
        );
      } catch (err) {
        if (err instanceof Fatal) fatal = err.message;
        else runRows.push({ arm: 'the run', build, ok: null, said: String(err?.message ?? err).slice(0, 800) });
      }
      if (want('W12')) {
        const logPath = join(world.profile, 'logs', 'app.log');
        const text = disk(logPath);
        const inside = w12Inside ?? { unreadable: 'the launch ended before W12 ran' };
        readings[build].W12 =
          typeof inside.unreadable === 'string'
            ? inside
            : {
                ...inside,
                appLog: text !== null,
                watcherErrors: watcherErrorsOf(text),
                quitMs: endAt !== null && exitedAt !== null ? exitedAt - endAt : null,
                exited: endAt !== null && exitedAt !== null && exitedAt - endAt < GRACE_MS - 250
              };
        const g = gradeW12(build, readings[build].W12, readings);
        say(`(${build}) W12: ${g.ok === true ? 'ok' : g.ok === false ? 'DISAGREES' : 'UNREADABLE'}: ${g.said}`);
      }
      const historyAfter = historyStat(REAL_HOME);
      b.history = { before: historyBefore, after: historyAfter };
      const moved = historyMoved(historyBefore, historyAfter);
      if (moved.length > 0) {
        fatal = `(${build}) his history moved across the launch: ${moved.join(', ')} (${J(historyBefore)} then ${J(historyAfter)}). Stopped.`;
        break;
      }
    }

    // RUN: his history at the end against the start, and the census, once.
    const historyAtEnd = historyStat(REAL_HOME);
    report.history.end = historyAtEnd;
    await sleep(1000);
    const ps = spawnSync('/bin/ps', ['-Ao', 'pid,ppid,rss,command'], { encoding: 'utf8' });
    const psLines = String(ps.stdout ?? '').split('\n').slice(1).filter((l) => l.trim() !== '');
    // No process of this run's own names SCRATCH on its command line (this one, harness-socket.mjs and ps do not).
    const leftByProfile = psLines.filter((l) => l.includes(SCRATCH)).map((l) => l.trim().slice(0, 200));
    readings.run =
      ps.status === 0
        ? { historyMoved: historyMoved(historyAtStart, historyAtEnd), leftPids: appPids.filter(alive), leftByProfile }
        : { unreadable: 'ps could not be read' };
    // CLAUDE.md's count line, printed for the record: it counts the operator's own Tortie too, so it is not the grade.
    const census = spawnSync('/bin/ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' });
    const electronLines = String(census.stdout ?? '')
      .split('\n')
      .filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !l.includes('defunct'));
    say(`Electron census at the end (every user's, for the record): ${String(electronLines.length)} line(s); this run's app pids ${J(appPids)}, alive ${J(appPids.filter(alive))}`);

    if (fatal !== null) runRows.push({ arm: 'the preconditions', build: '-', ok: null, said: fatal });
    report.readings = readings;
    report.rows = [...runRows, ...(fatal === null ? rowsFor(ASKED, readings) : [])];
    report.exit = exitCodeOf(report.rows);
    report.ended = new Date().toISOString();

    for (const r of report.rows) (r.ok === true ? process.stdout : process.stderr).write(`${TAG} ${formatRow(r)}\n`);
    try {
      mkdirSync(dirname(REPORT_PATH), { recursive: true });
      writeFileSync(REPORT_PATH, `${J(report, null, 1)}\n`);
      say(`wrote ${REPORT_PATH}`);
    } catch (err) {
      say(`could not write the report: ${String(err?.message ?? err)}`);
    }

    const fails = report.rows.filter((r) => r.ok === false).length;
    const unread = report.rows.filter((r) => r.ok !== true && r.ok !== false).length;
    if (report.exit === 1) say(`probe:p347 FAILED: ${String(fails)} row(s) disagree${unread > 0 ? `, and ${String(unread)} could not be read` : ''}.`);
    else if (report.exit === 2) say(`probe:p347 could not READ ${String(unread)} row(s); that is not a pass.`);
    else say(`probe:p347 PASS: ${String(report.rows.length)} rows graded at both builds.`);
    if (KEEP) say(`KEPT ${SCRATCH}: both builds' projects, profiles, homes and the stand-in's key log`);
    return report.exit;
  } finally {
    if (!KEEP) rmSync(SCRATCH, { recursive: true, force: true });
  }
}

if (isMain) {
  try {
    process.exit(await main());
  } catch (err) {
    console.error(`${TAG} UNREADABLE: the run threw: ${String(err?.stack ?? err)}`);
    process.exit(2);
  }
}
