#!/usr/bin/env node
/**
 * probe:p365 — THE PHASE 365 APP RUN (build/p365/SPEC.md §8): Tortie's file
 * watches, measured at the parent (`ce4c77f6`) and at HEAD.
 *
 * At the parent every subscribe and unsubscribe runs in MAIN, overlapping, and
 * research 143's storm (about 17 subscribes and 17 unsubscribes a second over
 * folders created and removed beneath them) damages main's heap within a
 * minute. At HEAD `@parcel/watcher` runs only in a utilityProcess main forks,
 * one call at a time behind an existence check, and main never loads
 * watcher.node. This file drives both builds' OWN five subscribe sites and
 * reads what happened from outside.
 *
 * ONE ELECTRON AT A TIME, THE PARENT FIRST IN EVERY PAIR, each through
 * build/electron-run.mjs's `withElectron` inside build/harness-socket.mjs
 * (`gmux-p365…`), each run on its own scratch profile, HOME and ZDOTDIR with
 * HISTFILE=/dev/null and SHELL=/bin/sh. The parent is `P365_PARENT_CHECKOUT`, a
 * `git clone --shared` checkout of ce4c77f6 with node_modules and build/vendor
 * cloned by `cp -Rc` (and `out/` built for RA and RH); without it the
 * preflight refuses and the run exits 2. Before anything is launched the
 * tokens and sockets a crash dump would carry are taken out of this process's
 * environment and every launch's (a dump holds the process's whole
 * environment, research 42:164).
 *
 * THE STORM ARMS (SP, SA, SQ, SK, SO) launch a STORM APP this file writes into
 * the run folder (never a file under src/): `main.js`, ported from the spec
 * step's storm app, hides its Dock icon and opens no window, points
 * `crashDumps` into its own profile and starts Crashpad with
 * `ignoreSystemCrashHandler: true` before anything else, then loads
 * `product.js`, the BUILD'S OWN five sites bundled by THAT build's esbuild
 * from THAT build's src/main (a product entry this file writes, ported from
 * the spec step's product-entry.ts). At HEAD `src/main/watcher/watcher-process.ts`
 * is bundled beside it as `watcher-process.js`, which is where host.ts's
 * `join(__dirname, 'watcher-process.js')` looks. The app runs as
 * `program: 'app'`, so the exit signal read is the app's own. Two recorders
 * go in BEFORE the bundle loads: a `Module._load` wrapper that counts every
 * native subscribe and unsubscribe main makes (the parent's are counted; at
 * HEAD there must be none), and a wrapper of `utilityProcess.fork` that reads
 * the wire of SPEC §4.1 from main's side (every request posted, every answer,
 * each process's spawn, ready and exit, and the re-bind after an exit).
 * Every `[gmux-*]` console line the bundle writes is re-said with its time, so
 * the host's lines can be counted in a window; the WORDS those lines are
 * matched against are read from HEAD's own host.ts at the preflight, never
 * copied here.
 *
 * Every crash is graded by the app's exit signal and by the dumps Crashpad
 * wrote under the run's own profile, read by the minidump reader below
 * (exception, the crashing thread's frame-pointer walk, every other thread
 * inside watcher.node, names from `nm` of the build's watcher.node and, with
 * `P365_EF_SYMBOLS`, Electron 43.3.0's public breakpad records). Every dump is
 * DELETED after its reading; no dump is kept, copied or committed.
 *
 * THE REAL-APP ARMS (RA, RH) launch each build's `out/` with remote
 * debugging: RA opens 20 scratch git repositories as projects through the
 * window, times one edit in each to its git:changed event, closes 10 tabs,
 * switches a branch in 5 and presses the native menu's Quit row in MAIN (a
 * scratch recorder preload, probe:p362's shape); RH creates two sessions of a
 * stand-in `codex` (a /bin/sh script this file writes, which writes one
 * rollout record into a scratch CODEX_HOME), quits, writes the second
 * session's record, relaunches and reads both resume ids. RA needs a QUIET
 * machine: while another process holds fseventsd busy (a storm of anyone's,
 * 141% CPU measured by a verifier) the parent itself misses edits, its need is
 * unmet and RA reads UNREADABLE, never a pass; run it alone. NO REAL AGENT RUNS,
 * not even for a version: every probed registry row but the stand-in is
 * hidden (`writeHiddenAgents`) and `agents:list` is read back
 * (`standInsOnlyVerdict`). Tailscale and DNS are probe:p357's stand-ins.
 *
 * THREE VERDICTS, AND A MISSING READING IS NEVER A PASS. Each grader names the
 * fields it reads (`reads`), the preconditions without which nothing it says
 * can be trusted (`needs`) and its `clauses`. An absent field or an unmet need
 * is UNREADABLE (exit 2); only a clause is FAIL. Every reading taken from raw
 * text (the storm's P365 lines, the dump reader's JSON, lsof, app.log, the
 * recorder's events) comes out of ONE pure function, `derive`, which
 * `--grader-self-test` drives over recorded raw fixtures seeded from the spec
 * step's runs (build/p365/fixtures/raw/, their stdout and their dump
 * readings, no dumps), and the binary dump reader is driven over a minidump
 * the self-test builds in memory.
 *
 * THE ARMS (parent first in each): SP (the product storm, `P365_RUNS` runs of
 * `P365_STORM_MIN` minutes at HEAD, the parent's runs at most 5 minutes each),
 * SA (SP with each folder removed as its watch is already being dropped), SQ
 * (20 s of storm, then a quit with every watch dropped and main's pool held by
 * 8 pbkdf2 jobs, after the build's own markAppQuitting(); at HEAD, since the
 * fix round, no dump of the watcher process from the quit either, told from the
 * storm's own by the dump header's second), SK (HEAD only: the
 * watcher process SIGKILLed at 30 s with the storm paused, SIGSTOPped at 90 s
 * and SIGCONTed 15 s later if the host has not ended it), SO (ordinary use:
 * 20 projects, the two configuration watches, 5 rescues, edits, closes, a
 * branch switch, the quit's closes), RA, RH, and RUN (the preflights, the
 * hidden agents, the census, every pid ended, his history, his reports
 * folder, every dump deleted).
 *
 * VERIFIERS ONLY for the long arms: it starts Electrons. Take the lock.
 *
 *   P365_PARENT_CHECKOUT=<a clone of ce4c77f6> npm run -s probe:p365
 *   P365_ARMS=SP,SA,…    the arms (default SP,SA,SQ,SK,SO,RA,RH; RUN is always read)
 *   P365_RUNS=<n>        SP's and SA's runs per build (default 2)
 *   P365_STORM_MIN=<m>   minutes of each HEAD storm (default 20); the parent's stop at 5
 *   P365_KEEP=1          keep every run folder (dumps deleted, readings kept)
 *   P365_EF_SYMBOLS=<f>  a breakpad FUNC file for Electron Framework names (optional)
 *   P365_OUT_DIR=<dir>   where the report goes (default out/p365)
 *   node build/p365/probe-p365.mjs --grader-self-test   every reader and grader on build/p365/fixtures/; starts nothing
 *   node build/p365/probe-p365.mjs --preflight          the builds, the host's words and the helpers; starts nothing
 *   node build/p365/probe-p365.mjs --list-graders       every grader's reads, needs and clauses by name; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { loadavg, userInfo } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The build helpers this run USES, imported statically so gate:electron counts
// this probe among build/electron-run.mjs's users (obligation 1). Each only
// DEFINES functions when imported, so --grader-self-test and --preflight below
// still start nothing.
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsBesides, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin } from '../p332/dns-standin.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (x) => typeof x === 'number' && Number.isFinite(x);

// ---------------------------------------------------------------------------
// What this run holds the builds against, by value
// ---------------------------------------------------------------------------

/** The parent this phase measures against. */
export const PARENT_SNAPSHOT = 'ce4c77f6';
/** The product storm's shape (SPEC §2): every 180 ms one project opened, one closed, one rescue armed or cancelled; 12 slots; churn every 10 ms. */
export const STORM = Object.freeze({ tickMs: 180, slots: 12, failPct: 10, delPct: 30, churnMs: 10 });
/** Research 143's rate, as asks a second the storm must reach: about 17 (one open, one close, one rescue a tick); the floor is three quarters of it. */
export const RATE_FLOOR = 12;
/**
 * The probe review's floor on the NATIVE side at HEAD: the watcher process must
 * have answered at least this many real subscriptions a second (research 143's
 * "about 17 subscribes a second", halved), or the storm never reached the native
 * module and "main never faulted" says nothing. Main's asks can run at the rate
 * while every watch answers "nothing to watch".
 */
export const PROCESS_RATE_FLOOR = 8;
export const DEFAULT_RUNS = 2;
export const DEFAULT_HEAD_MIN = 20;
/** The parent's storm runs stop at their first fault, and at most at this many minutes. */
export const PARENT_MAX_MIN = 5;
/** SQ: 20 s of storm, then the quit with main's pool held by this many pbkdf2 jobs (SPEC §2.1 mq1). */
export const SQ_STORM_MS = 20_000;
export const SQ_POOL_JOBS = 8;
/** SK: the storm's length, the SIGKILL, the SIGSTOP and how long the stop is left before the probe's own SIGCONT. */
export const SK_STORM_MS = 150_000;
export const SK_KILL_AT_MS = 30_000;
export const SK_STOP_AT_MS = 90_000;
export const SK_CONT_AFTER_MS = 15_000;
/** SO: 20 projects (worktree and dotgit each), the two configuration watches, 5 rescues (two codex roots each). */
export const SO_EXPECTED_WATCHES = 20 * 2 + 2 + 5 * 2;
/** RA's world and bounds (SPEC §8). */
export const RA_PROJECTS = 20;
export const RA_CLOSE = 10;
export const RA_BRANCH = 5;
export const RA_LATENCY_SLACK_MS = 100;
export const RA_QUIT_SLACK_MS = 250;
/** SO: the quit's closes settle within this (SPEC §8). */
export const SO_QUIT_DRAIN_MS = 2_000;
/** A re-bind is late when it lands more than this after the host's backoff for that exit. */
export const REBIND_SLACK_MS = 1_000;
/** The replacement of a stopped process is late when it lands more than this after the first unanswered request's bound. */
export const REPLY_SLACK_MS = 1_000;
/**
 * The restart backoff SPEC D6 names, used ONLY to grade the spec step's own
 * recorded runs, which carry no host constants; a live HEAD run is graded on
 * the bounds its own bundle exported (the storm's `loaded` line).
 */
export const SPEC_BACKOFF_MS = Object.freeze([250, 1_000, 5_000, 30_000]);
/** RH: the two resume ids the stand-in writes, the same at both builds so "the same ids" can be asked. */
export const RH_IDS = Object.freeze({ a: '0365a000-0000-4000-8000-00000000000a', b: '0365b000-0000-4000-8000-00000000000b' });
/** The scratch session names RH creates. */
export const RH_NAMES = Object.freeze({ a: 'p365-rh-a', b: 'p365-rh-b' });
/** The stand-in codex's version answer (it answers --version and exits; nothing else of codex is imitated). */
export const RH_STANDIN_VERSION = 'codex-cli 0.150.0';
/** The file names RH's stand-in reads in its session's folder: the id to write, and whether to hold it back. */
export const RH_ID_FILE = '.p365-rh-id';
export const RH_DEFER_FILE = '.p365-rh-defer';
/** The variables a crash dump would carry out of this shell (SPEC §0), stripped before any launch. */
export const STRIPPED_ENV = Object.freeze([/^CLAUDE_CODE_/, /^SSH_AUTH_SOCK$/, /^TMUX$/, /^TMUX_PANE$/, /^GMUX_SESSION_ID$/, /^GMUX_MANAGED$/, /^SECURITYSESSIONID$/, /^CSC_/, /^APPLE_/, /^GH_TOKEN$/, /^GITHUB_TOKEN$/]);
/** build/electron-run.mjs's census sentence, by its own words. */
export const CENSUS_WORDS = "is the private server the operator's live";
/** Every arm, its builds and its kind. */
export const ARM_SPECS = Object.freeze({
  SP: { builds: ['parent', 'head'], kind: 'storm', order: 'before' },
  SA: { builds: ['parent', 'head'], kind: 'storm', order: 'after' },
  SQ: { builds: ['parent', 'head'], kind: 'quit' },
  SK: { builds: ['head'], kind: 'kill' },
  SO: { builds: ['parent', 'head'], kind: 'ordinary' },
  RA: { builds: ['parent', 'head'], kind: 'app' },
  RH: { builds: ['parent', 'head'], kind: 'rescue' }
});
export const DEFAULT_ARMS = Object.freeze(['SP', 'SA', 'SQ', 'SK', 'SO', 'RA', 'RH']);
/** The wire of SPEC §4.1, the kinds the fork recorder reads from main's side. */
export const WIRE_KINDS = Object.freeze(['watch', 'close', 'ready', 'watching', 'refused', 'closed', 'events', 'note']);

// ---------------------------------------------------------------------------
// THE ONE READER. Every reading this run takes from raw text comes out of
// `derive` and the small pure helpers it calls, and nothing else. The live arms
// hand it what they read off the pipe and the disk; --grader-self-test hands it
// the recorded raw fixtures, so a reader that miscounts is shown to.
// ---------------------------------------------------------------------------

/**
 * The storm app's lines: `P365 <json>` with a numeric `t` and a string `kind`; a
 * line that does not parse is kept as `{ unparsed: true }`. The app's stdout and
 * stderr reach the probe through two pipes appended into one text, so a chunk of
 * the other stream can land inside a line: a `P365 {` that does not START its
 * line is a torn line too, and is kept as `{ unparsed: true }` rather than
 * dropped in silence (the probe review: a torn exit line hid a crash).
 */
export function p365Lines(text) {
  const out = [];
  for (const line of String(text ?? '').split('\n')) {
    if (!line.startsWith('P365 ')) {
      if (line.includes('P365 {')) out.push({ unparsed: true });
      continue;
    }
    try {
      const o = JSON.parse(line.slice(5));
      out.push(o !== null && typeof o === 'object' && num(o.t) && typeof o.kind === 'string' ? o : { unparsed: true });
    } catch {
      out.push({ unparsed: true });
    }
  }
  return out;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const unescapeJs = (s) => s.replace(/\\(.)/g, '$1');

/**
 * The string constants a source declares, so a line written as
 * `${WATCHER_LINES.exited} (code …)` is read with its words rather than as a
 * wildcard: `const NAME = 'text'` and `const NAME = Object.freeze({ key:
 * 'text', … })` (or the same without Object.freeze), as `NAME` and `NAME.key`.
 */
export function hostConstants(source) {
  const src = String(source ?? '');
  const map = new Map();
  for (const m of src.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])((?:\\.|(?!\2)[^\\\n])*)\2\s*;/g)) map.set(m[1], unescapeJs(m[3]));
  for (const m of src.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:Object\.freeze\(\s*)?\{([^{}]*)\}/g)) {
    for (const kv of m[2].matchAll(/([A-Za-z_$][\w$]*)\s*:\s*(['"])((?:\\.|(?!\2)[^\\\n])*)\2/g)) map.set(`${m[1]}.${kv[1]}`, unescapeJs(kv[3]));
  }
  return map;
}

/**
 * The host's log lines, read from host.ts's own source: every call
 * `<x>.(error|warn|info|debug)(` whose first argument is a string or template
 * literal, a constant of the same source, or a `+` chain of them. Each becomes
 * a matcher for the console line getLog writes (`[gmux-watcher] <msg>` and,
 * with fields, ` <json>`): a constant is read as its words, every other
 * `${…}` and non-literal part is a wildcard, and a category is read from the
 * words. Pure: it takes the source text.
 */
export function hostLineTemplates(source) {
  const src = String(source ?? '');
  const constants = hostConstants(src);
  const out = [];
  const callRe = /\.(error|warn|info|debug)\(\s*/g;
  let m;
  while ((m = callRe.exec(src)) !== null) {
    let i = callRe.lastIndex;
    const parts = [];
    let ok = false;
    for (;;) {
      const c = src[i];
      if (c === "'" || c === '"') {
        let j = i + 1;
        let text = '';
        while (j < src.length && src[j] !== c) {
          if (src[j] === '\\') {
            text += src[j + 1] ?? '';
            j += 2;
            continue;
          }
          text += src[j];
          j += 1;
        }
        parts.push({ lit: text });
        i = j + 1;
        ok = true;
      } else if (c === '`') {
        let j = i + 1;
        let text = '';
        while (j < src.length && src[j] !== '`') {
          if (src[j] === '\\') {
            text += src[j + 1] ?? '';
            j += 2;
            continue;
          }
          if (src[j] === '$' && src[j + 1] === '{') {
            let depth = 1;
            const from = j + 2;
            j += 2;
            while (j < src.length && depth > 0) {
              if (src[j] === '{') depth += 1;
              else if (src[j] === '}') depth -= 1;
              j += 1;
            }
            const expr = src.slice(from, j - 1).trim();
            if (constants.has(expr)) {
              text += constants.get(expr);
              continue;
            }
            if (text !== '') parts.push({ lit: text });
            text = '';
            parts.push({ wild: true });
            continue;
          }
          text += src[j];
          j += 1;
        }
        if (text !== '') parts.push({ lit: text });
        i = j + 1;
        ok = true;
      } else if (/[A-Za-z_$(]/.test(c ?? '')) {
        // A non-literal operand (a name, a call) up to the next `+`, `,` or `)` at depth 0: a
        // constant of this source is its words, anything else is a wildcard after a literal.
        let depth = 0;
        let j = i;
        while (j < src.length) {
          const d = src[j];
          if (d === '(' || d === '[' || d === '{') depth += 1;
          else if (d === ')' || d === ']' || d === '}') {
            if (depth === 0) break;
            depth -= 1;
          } else if ((d === '+' || d === ',') && depth === 0) break;
          j += 1;
        }
        const operand = src.slice(i, j).trim();
        if (constants.has(operand)) {
          parts.push({ lit: constants.get(operand) });
          ok = true;
        } else if (ok) parts.push({ wild: true });
        else break;
        i = j;
      } else break;
      while (/\s/.test(src[i] ?? '')) i += 1;
      if (src[i] === '+') {
        i += 1;
        while (/\s/.test(src[i] ?? '')) i += 1;
        continue;
      }
      break;
    }
    if (!ok || !parts.some((p) => p.lit !== undefined && p.lit.trim() !== '')) continue;
    const words = parts.filter((p) => p.lit !== undefined).map((p) => p.lit).join(' … ');
    const body = parts.map((p) => (p.wild ? '.*?' : escapeRe(p.lit))).join('');
    out.push({ level: m[1], words, re: `^\\[gmux-watcher\\] ${body}(?: \\{.*\\})?$`, category: hostLineCategory(words) });
  }
  return out;
}

/** A host line's category from its own words; where two families both appear, the one named first wins. */
export function hostLineCategory(words) {
  const w = String(words).toLowerCase();
  if (/gave up|giving up|give up|no longer restart|stop(s|ped)? (re)?start|will not (be )?restart|not restart|kept exiting/.test(w)) return 'gaveUp';
  if (/did not answer|didn't answer|no answer|not answer|stopped answering|unanswered|did not reply|no reply|timed out|without an answer/.test(w)) return 'bound';
  const exitAt = w.search(/exit|crash|died|ended unexpectedly/);
  const restartAt = w.search(/restart|re-?bound|started again/);
  if (exitAt !== -1 && (restartAt === -1 || exitAt < restartAt)) return 'exit';
  if (restartAt !== -1) return 'restart';
  if (/\bturn\b|waited/.test(w)) return 'turn';
  return 'other';
}

/** One console line's category under the host's templates, or null when no host template matches it. */
export function hostLineOf(line, templates) {
  for (const t of templates ?? []) {
    try {
      if (new RegExp(t.re).test(line)) return t.category;
    } catch {
      /* a template that does not compile matches nothing */
    }
  }
  return null;
}

/** lsof's `-F n` answer lists watcher.node. Null when it was not read. */
export function lsofHolds(text) {
  if (typeof text !== 'string') return null;
  return /(^|\n)n[^\n]*\/watcher\.node(?=\n|$)/.test(text);
}

/** Which process a dump is: main (CrBrowserMain), the watcher process (a helper with watcher.node), another helper, or unknown. */
export function dumpKind(d) {
  if (typeof d?.kind === 'string') return d.kind;
  const names = [...(Array.isArray(d?.threadNames) ? d.threadNames : []), ...(typeof d?.thread?.name === 'string' ? [d.thread.name] : [])];
  const first = String(d?.firstModule ?? '');
  if (names.includes('CrBrowserMain') || /^(Electron|Tortie)$/.test(first)) return 'main';
  if (names.includes('CrUtilityMain') || /Helper/.test(first)) return d?.watcherLoaded === true ? 'watcher' : 'helper';
  return 'unknown';
}

/**
 * The fault a dump names, with where it was named. The names are the families
 * research 143 and the spec step saw: PartitionAlloc's freelist check, #271's
 * CoreFoundation trap in a stream stop, napi_fatal_error at a quit,
 * DirTree::remove, a call through a null pointer, else the first watcher.node
 * frame on the crashing thread. Without Electron's symbols the framework's
 * frames are offsets, so napi_fatal_error is also read from the native stack
 * trace Node itself writes to the same process's stderr (`text`), and only for
 * a dump of main whose crashing thread is CrBrowserMain inside a watcher
 * completion.
 */
export function faultOf(d, text = '') {
  const frames = (Array.isArray(d?.frames) ? d.frames : []).map(String);
  const has = (s) => frames.some((f) => f.includes(s));
  const watcherFrames = frames.filter((f) => /^(lr )?watcher\.node /.test(f));
  if (has('FreelistCorruptionDetected')) return { name: 'freelist check', from: 'dump' };
  if (has('napi_fatal_error')) return { name: 'napi_fatal_error', from: 'dump' };
  const main = dumpKind(d) === 'main' && d?.thread?.name === 'CrBrowserMain';
  if (main && watcherFrames.some((f) => f.includes('PromiseRunner::onWorkComplete')) && /(^|\n)\s*\d+: 0x[0-9a-f]+ napi_fatal_error /.test(String(text))) return { name: 'napi_fatal_error', from: 'dump and its stderr trace' };
  if (has('stopStream') || (frames.some((f) => /^(lr )?CoreFoundation\+/.test(f)) && (has('FSEventsCallback') || has('FSEventsBackend::unsubscribe')) && frames.findIndex((f) => /CoreFoundation\+/.test(f)) < frames.findIndex((f) => /FSEventsCallback|FSEventsBackend::unsubscribe/.test(f)))) return { name: '#271 stream stop', from: 'dump' };
  if (has('DirTree::remove')) return { name: 'DirTree::remove', from: 'dump' };
  if (frames[0] === '0x0 (null)') return { name: 'a call through a null pointer', from: 'dump' };
  if (watcherFrames.length > 0) return { name: `in watcher.node: ${watcherFrames[0].replace(/^(lr )?watcher\.node /, '').replace(/\(.*$/, '').replace(/\+0x[0-9a-f]+$/, '')}`, from: 'dump' };
  return { name: null, from: null };
}

/** The ops a storm run asked a second: the product storm's site counters, or the spec step's raw-mode counters. */
function opsOf(s) {
  if (s === null || s === undefined) return null;
  if (num(s.watchIssued)) return (s.watchIssued ?? 0) + (s.disposeIssued ?? 0) + (s.harvestArmed ?? 0) + (s.harvestCancelled ?? 0);
  if (num(s.subIssued)) return (s.subIssued ?? 0) + (s.unsubIssued ?? 0);
  return null;
}

/** The host's backoff for the k-th unexpected exit of a run (1-based), an upper bound whatever "consecutive" resets. */
export function backoffFor(k, backoff) {
  const b = Array.isArray(backoff) && backoff.length > 0 ? backoff : SPEC_BACKOFF_MS;
  return b[Math.min(Math.max(k, 1), b.length) - 1];
}

/**
 * One storm run's reading. `raw` is `{ text, exit: { code, signal }, dumps:
 * [dump reader JSON], dumpsFound, reportsAdded, env, ceilingHit }`; `env` is the
 * run's P365_* variables (the spec step's runs carry them as report.json's
 * `extra`). `ceilingHit` is true when the probe's own ceiling ended the run: the
 * teardown's SIGTERM runs Electron's graceful quit, which exits 0 (research 21
 * E4, research 34), so a run that hung to the ceiling would otherwise read as a
 * clean exit (the probe review). A recorded run without the field ended by
 * itself.
 */
export function stormRunOf(raw) {
  const text = String(raw?.text ?? '');
  const lines = p365Lines(text);
  // Lines lost (the probe review): every torn line, and, when the app numbered its lines (this
  // probe's storm app does; the spec step's recorded runs did not), every number that never
  // arrived below the highest that did, which a tear in a line's first bytes leaves as no line at all.
  const unparsed = lines.filter((l) => l.unparsed === true).length;
  const numbers = lines.filter((l) => num(l.n)).map((l) => l.n);
  const gaps = numbers.length === 0 ? 0 : Math.max(...numbers) - new Set(numbers).size;
  const torn = Math.max(unparsed, gaps);
  const loaded = lines.find((l) => l.kind === 'loaded') ?? null;
  const start = lines.find((l) => l.kind === 'start') ?? null;
  const stats = lines.filter((l) => l.kind === 'stats');
  const lastStats = stats.at(-1) ?? null;
  const quitting = lines.find((l) => l.kind === 'quitting') ?? null;
  const env = raw?.env ?? {};
  const final = quitting ?? lastStats;
  const elapsedMs = num(final?.elapsed) ? final.elapsed : null;
  const ops = opsOf(final);
  const rate = num(ops) && num(elapsedMs) && elapsedMs > 0 ? (ops * 1_000) / elapsedMs : null;
  // The native side at HEAD: real subscriptions the watcher process answered (the fork
  // recorder's `ipc.watching`), or the spec step's prototype's own count (`subOk`).
  const ipcOf = (o) => (o?.ipc !== undefined && o?.ipc !== null && typeof o.ipc === 'object' ? o.ipc : null);
  const ipc = ipcOf(final) ?? ipcOf(lastStats);
  const processSubs = num(ipc?.watching) ? ipc.watching : start?.mode === 'utility' && num(final?.subOk) ? final.subOk : null;
  const processRate = num(processSubs) && num(elapsedMs) && elapsedMs > 0 ? (processSubs * 1_000) / elapsedMs : null;
  // A run that ran its whole length reached its own drain-and-quit after its full duration (a
  // second's slack, as SQ's shape allows, for a wall clock that moved while the run waited).
  const ranWhole = quitting !== null && quitting.how === 'drain' && num(quitting.elapsed) && num(start?.durationMs) && quitting.elapsed >= start.durationMs - 1_000;
  const ceiling = raw?.ceilingHit === true;
  const exit = { code: raw?.exit?.code ?? null, signal: raw?.exit?.signal ?? null };
  const child = lines.filter((l) => l.kind === 'child');
  const spawns = child.filter((c) => c.event === 'spawn');
  const readies = child.filter((c) => c.event === 'ready');
  const exits = child.filter((c) => c.event === 'exit');
  const rebounds = child.filter((c) => c.event === 'rebound');
  const quitAt = quitting?.t ?? null;
  const backoff = loaded?.bounds?.backoff ?? null;
  // Every generation the host lost while the app ran: an unexpected exit of the process it was
  // using, or a process it replaced while that one was still alive (a reply bound passed). Each
  // must be followed by a re-bind of every watch live on it.
  const losses = [];
  for (const e of exits) {
    const unexpected = e.unexpected === undefined ? e.code !== 0 && (quitAt === null || e.t < quitAt) : e.unexpected === true;
    if (unexpected && e.replaced !== true) losses.push({ gen: e.gen, code: e.code, at: e.t, live: e.live ?? null, how: 'exit' });
  }
  for (const f of child.filter((c) => c.event === 'fork' && c.prevAlive === true && num(c.prevGen))) {
    if (quitAt === null || f.t < quitAt) losses.push({ gen: f.prevGen, code: null, at: f.t, live: null, how: 'replaced while alive' });
  }
  losses.sort((a, b) => a.at - b.at);
  const crashes = losses.map((e, i) => {
    const rb = rebounds.find((r) => (num(r.fromGen) ? r.fromGen === e.gen : num(r.gen) && r.gen > e.gen) && r.t >= e.at) ?? null;
    const asked = rb === null ? null : num(rb.asked) ? rb.asked : rb.ok;
    const answered = rb === null ? null : rb.ok;
    const sinceExit = rb === null ? null : num(rb.sinceExit) ? rb.sinceExit : rb.t - e.at;
    const bound = backoffFor(i + 1, backoff) + REBIND_SLACK_MS;
    const full = rb !== null && rb.timedOut !== true && num(rb.watches) && asked >= rb.watches && answered >= asked;
    return { gen: e.gen, code: e.code, how: e.how, at: e.at, live: e.live, rebind: rb === null ? null : { watches: rb.watches ?? null, asked, answered, sinceExit, bound }, ok: full && num(sinceExit) && sinceExit <= bound };
  });
  const dumps = (Array.isArray(raw?.dumps) ? raw.dumps : []).map((d) => ({ kind: dumpKind(d), fault: d?.error ? { name: null, from: null } : faultOf(d, text), error: d?.error ?? null, exception: d?.exception ?? null, frames: (d?.frames ?? []).slice(0, 8), thread: d?.thread ?? null, stamp: num(d?.stamp) ? d.stamp : null }));
  const mainDumps = dumps.filter((d) => d.kind === 'main');
  const watcherDumps = dumps.filter((d) => d.kind === 'watcher');
  const signal = typeof exit.signal === 'string' && exit.signal !== '' ? exit.signal : null;
  const nativeOf = (o) => (o?.native !== undefined && o?.native !== null && typeof o.native === 'object' ? o.native : null);
  const native = nativeOf(final) ?? nativeOf(lastStats);
  const obsAll = stats.map((s) => s.obs).filter((o) => o !== null && typeof o === 'object');
  const logs = lines.filter((l) => l.kind === 'log' && typeof l.line === 'string');
  return {
    started: start !== null,
    loaded,
    start,
    order: start?.order ?? env.P365_DEL_ORDER ?? 'before',
    scenario: start?.mode === 'product' ? (loaded?.scenario ?? env.P365_SCENARIO ?? 'storm') : (start?.mode ?? null),
    elapsedMs,
    rate,
    // A run the probe's ceiling ended is never clean, whatever its exit code said.
    exit: { code: exit.code, signal, clean: exit.code === 0 && signal === null && !ceiling, ceiling },
    endedBySignal: signal !== null,
    ranWhole,
    torn,
    processRate,
    ipc: ipc === null ? null : { watching: ipc.watching ?? null, nothingToWatch: ipc.watchingNull ?? null, refused: ipc.refused ?? null },
    quitting,
    lastStats,
    native: native === null ? null : { loaded: native.loaded === true || num(native.subscribe) && native.subscribe > 0, subscribe: native.subscribe ?? 0, unsubscribe: native.unsubscribe ?? 0, maxInFlight: native.maxInFlight ?? 0 },
    forks: spawns.length,
    ready: readies.length,
    crashes,
    gaveUp: obsAll.some((o) => o.gaveUp === true),
    dumps,
    mainDumps,
    watcherDumps,
    namedMainFault: mainDumps.map((d) => d.fault.name).find((n) => n !== null) ?? null,
    dumpsFound: num(raw?.dumpsFound) ? raw.dumpsFound : dumps.length,
    // A dump whose process cannot be named (main, the watcher process or another helper) was not read.
    dumpsRead: dumps.filter((d) => d.error === null && d.kind !== 'unknown').length,
    reportsAdded: Array.isArray(raw?.reportsAdded) ? raw.reportsAdded.length : null,
    logs
  };
}

/** SP and SA: the runs of one build, aggregated. */
function stormReading(raw) {
  const runs = (Array.isArray(raw.runs) ? raw.runs : []).map(stormRunOf);
  const read = runs.filter((r) => r.started);
  const wanted = num(raw.runsWanted) ? raw.runsWanted : runs.length;
  const loadedRuns = runs.filter((r) => r.loaded !== null);
  const r = {
    storm: {
      runsWanted: wanted,
      runsRead: read.length,
      rateOk: read.length > 0 && read.every((x) => num(x.rate) && x.rate >= RATE_FLOOR),
      minRate: read.length === 0 ? null : Math.min(...read.map((x) => (num(x.rate) ? x.rate : 0))),
      orderAfter: read.length > 0 && read.every((x) => x.order === 'after'),
      orderBefore: read.length > 0 && read.every((x) => x.order === 'before'),
      // The probe review: a run that exited 0 before its storm's whole length was cut short by
      // something other than itself, and its "exit 0" says nothing about the storm it never ran.
      cutShort: read.filter((x) => x.exit.clean && !x.ranWhole).length,
      // The probe review: main's asks can run at the rate while the watcher process answers
      // "nothing to watch" to all of them; the native side has a floor of its own at HEAD.
      // A run whose host gave up DID reach the native module (it crashed it, again and again), and
      // its missing re-bind is a clause's FAIL; the floor must not mask that as UNREADABLE.
      processRateOk: read.length > 0 && read.every((x) => x.gaveUp || (num(x.processRate) && x.processRate >= PROCESS_RATE_FLOOR)),
      minProcessRate: read.length === 0 ? null : Math.min(...read.map((x) => (num(x.processRate) ? x.processRate : 0)))
    },
    lines: { torn: runs.reduce((n, x) => n + x.torn, 0) },
    main: {
      exit0Runs: read.filter((x) => x.exit.clean).length,
      signalRuns: read.filter((x) => x.endedBySignal).length,
      namedSignalRuns: read.filter((x) => x.endedBySignal && x.namedMainFault !== null).length,
      dumps: runs.reduce((n, x) => n + x.mainDumps.length, 0),
      faults: read.map((x) => x.namedMainFault).filter((x) => x !== null)
    },
    watcherProcess: {
      forks: runs.reduce((n, x) => n + x.forks, 0),
      ready: runs.reduce((n, x) => n + x.ready, 0),
      crashes: runs.reduce((n, x) => n + x.crashes.length, 0),
      rebound: runs.reduce((n, x) => n + x.crashes.filter((c) => c.ok).length, 0),
      gaveUp: runs.some((x) => x.gaveUp)
    },
    dumps: { found: runs.reduce((n, x) => n + x.dumpsFound, 0), read: runs.reduce((n, x) => n + x.dumpsRead, 0) },
    printed: {
      runs: runs.map((x) => ({
        exit: x.exit,
        afterMs: x.elapsedMs,
        rate: num(x.rate) ? Math.round(x.rate * 10) / 10 : null,
        processRate: num(x.processRate) ? Math.round(x.processRate * 10) / 10 : null,
        ranWhole: x.ranWhole,
        torn: x.torn,
        watcherAnswers: x.ipc,
        fault: x.namedMainFault,
        native: x.native,
        crashes: x.crashes.map((c) => ({ gen: c.gen, how: c.how, code: c.code, rebind: c.rebind, ok: c.ok })),
        watcherDumps: x.watcherDumps.map((d) => ({ fault: d.fault.name, frames: d.frames.slice(0, 5) })),
        mainDumps: x.mainDumps.map((d) => ({ fault: d.fault.name, frames: d.frames.slice(0, 5) }))
      }))
    }
  };
  // Unread is said as unread (the key present, its value undefined), so a reading laid over
  // another one keeps the hole rather than the other one's number (the probe review).
  r.reportsAdded = runs.every((x) => x.reportsAdded !== null) ? runs.reduce((n, x) => n + x.reportsAdded, 0) : undefined;
  if (loadedRuns.length > 0) {
    r.bundle = { head: loadedRuns.every((x) => x.loaded.host === true) };
    r.recorder = { nativeWrapped: loadedRuns.every((x) => x.loaded.nativeWrapped === true), forkWrapped: loadedRuns.every((x) => x.loaded.forkWrapped === true) };
  }
  if (runs.length > 0 && runs.every((x) => x.native !== null)) {
    r.main.nativeCalls = runs.reduce((n, x) => n + x.native.subscribe + x.native.unsubscribe, 0);
    // The probe review: loaded at all, by any path (the storm app's process.dlopen hook).
    r.main.nativeLoaded = runs.some((x) => x.native.loaded);
  }
  return r;
}

/**
 * How many of a run's watcher-process dumps were written at or after its quit:
 * a dump's header second at or after the quit line's second. Undefined (unread)
 * when there is no quit line, or a watcher dump carries no readable time. A
 * storm crash in the very second of the quit counts as the quit's, which can
 * only make SQ stricter.
 */
export function quitDumpsOf(watcherDumps, quitting) {
  if (quitting === null || quitting === undefined || !num(quitting.t)) return undefined;
  if (watcherDumps.some((d) => !num(d.stamp))) return undefined;
  const second = Math.floor(quitting.t / 1_000);
  return watcherDumps.filter((d) => d.stamp >= second).length;
}

/** SQ: one run, its quit and the lsof reads taken during its storm. */
function quitReading(raw) {
  const run = stormRunOf(raw.run ?? {});
  const q = run.quitting;
  const reads = Array.isArray(raw.lsof) ? raw.lsof : [];
  const r = {
    sq: {
      stormMs: num(q?.elapsed) ? q.elapsed : run.elapsedMs,
      // The spec step's raw-mode quit line carries no `saturated`; its run's env says whether the pool was held.
      quit: { asked: q !== null && q.how === 'mid', saturated: q?.saturated === true || (q !== null && q.saturated === undefined && raw.run?.env?.P365_SATURATE === '1'), marked: q?.marked === true },
      lsof: {
        mainReads: reads.filter((x) => lsofHolds(x.main) !== null).length,
        mainHolds: reads.some((x) => lsofHolds(x.main) === true),
        watcherReads: reads.filter((x) => lsofHolds(x.watcher) !== null).length,
        watcherHolds: reads.some((x) => lsofHolds(x.watcher) === true)
      }
    },
    exit: run.exit,
    main: { dumps: run.mainDumps.length, faults: run.mainDumps.map((d) => d.fault.name).filter((x) => x !== null) },
    // The fix round (the attack lens): a dump of the WATCHER process from the quit, by its
    // header's second against the quit line's. The storm's own crashes before the quit are
    // not the quit's. A watcher dump with no readable time leaves the count unread.
    watcher: { quitDumps: quitDumpsOf(run.watcherDumps, q) },
    dumps: { found: run.dumpsFound, read: run.dumpsRead },
    printed: { exit: run.exit, fault: run.namedMainFault, mainDumps: run.mainDumps.map((d) => ({ fault: d.fault, frames: d.frames.slice(0, 6) })), watcherDumps: run.watcherDumps.map((d) => ({ stamp: d.stamp, fault: d.fault, frames: d.frames.slice(0, 6) })) }
  };
  if (run.loaded !== null) {
    r.bundle = { head: run.loaded.host === true };
    r.recorder = { nativeWrapped: run.loaded.nativeWrapped === true, forkWrapped: run.loaded.forkWrapped === true };
  }
  return r;
}

/** SK: one run, the probe's signals and the host's lines in their windows. */
function killReading(raw) {
  const run = stormRunOf(raw.run ?? {});
  const text = String(raw.run?.text ?? '');
  const lines = p365Lines(text);
  const sig = raw.signals ?? {};
  const templates = Array.isArray(raw.hostTemplates) ? raw.hostTemplates : typeof raw.hostSource === 'string' ? hostLineTemplates(raw.hostSource) : [];
  const child = lines.filter((l) => l.kind === 'child');
  const genOfPid = (pid) => child.find((c) => c.event === 'spawn' && c.pid === pid)?.gen ?? null;
  const logsIn = (category, from, to) => run.logs.filter((l) => num(from) && num(to) && l.t >= from && l.t <= to && hostLineOf(l.line, templates) === category).length;
  const paused = lines.find((l) => l.kind === 'paused' && l.seq === sig.pause?.seq) ?? null;
  const rescan = lines.find((l) => l.kind === 'rescan' && l.seq === sig.resume?.seq) ?? null;
  const killGen = num(sig.kill?.pid) ? genOfPid(sig.kill.pid) : null;
  const rebound = killGen === null ? null : child.find((c) => c.event === 'rebound' && (num(c.fromGen) ? c.fromGen === killGen : c.gen > killGen)) ?? null;
  // Each open project's re-scan errors between the pause and the resume, against its live watches at the pause.
  const before = new Map((Array.isArray(paused?.projects) ? paused.projects : []).map((p) => [p.slot, p]));
  const after = new Map((Array.isArray(rescan?.projects) ? rescan.projects : []).map((p) => [p.slot, p]));
  const pairs = [...before.values()].map((p) => ({ slot: p.slot, subs: p.subs, handed: after.has(p.slot) && num(after.get(p.slot).restartErrors) && num(p.restartErrors) ? after.get(p.slot).restartErrors - p.restartErrors : null }));
  const known = before.size > 0 && [...before.values()].every((p) => p.known === true && num(p.subs));
  const stopGen = num(sig.stop?.pid) ? genOfPid(sig.stop.pid) : null;
  const stopExit = stopGen === null ? null : child.find((c) => c.event === 'exit' && c.gen === stopGen) ?? null;
  const nextFork = stopGen === null ? null : child.find((c) => c.event === 'fork' && c.gen > stopGen) ?? null;
  // The host's own act on the stopped process: its reply-bound line, or the process's exit if that came
  // first. A host that SIGTERMs a stopped process sees no exit until the probe's SIGCONT, so the line is
  // what dates its decision; the replacement itself is the next fork, within the backoff of that act.
  const boundLine = num(sig.stop?.at) ? run.logs.find((l) => l.t >= sig.stop.at && hostLineOf(l.line, templates) === 'bound') ?? null : null;
  const acts = [boundLine?.t, stopExit?.t].filter((t) => num(t) && num(sig.stop?.at) && t >= sig.stop.at);
  const actedAt = acts.length === 0 ? null : Math.min(...acts);
  const pend = (nextFork !== null && nextFork.prevGen === stopGen ? nextFork.prevPending : null) ?? stopExit?.pending ?? null;
  const deadlineAt = num(pend?.deadlineAt) ? pend.deadlineAt : null;
  const lossAt = run.crashes.findIndex((c) => c.gen === stopGen);
  const restartBound = backoffFor(lossAt === -1 ? run.crashes.length + 1 : lossAt + 1, run.loaded?.bounds?.backoff ?? null) + REBIND_SLACK_MS;
  const replacedAt = actedAt;
  return {
    sk: {
      paused: paused !== null && paused.quiet === true,
      kill: { sent: sig.kill?.sent === true, verified: sig.kill?.verified === true, gen: killGen },
      rebind: { watches: rebound?.watches ?? null, asked: rebound === null ? null : num(rebound.asked) ? rebound.asked : rebound.ok, answered: rebound?.ok ?? null, sinceExit: rebound?.sinceExit ?? null },
      restartLines: num(sig.kill?.at) && rebound !== null ? logsIn('restart', sig.kill.at, rebound.t + 1_000) : null,
      rescan: { projects: before.size, known, pairs, exact: known && rescan !== null && pairs.every((x) => x.subs > 0 && x.handed === x.subs) },
      stop: { sent: sig.stop?.sent === true, verified: sig.stop?.verified === true, gen: stopGen },
      replacement: { at: replacedAt, deadlineAt, oldestKind: pend?.oldestKind ?? null, forkAt: nextFork?.t ?? null, restartBound, ok: num(replacedAt) && num(deadlineAt) && replacedAt <= deadlineAt + REPLY_SLACK_MS && num(nextFork?.t) && nextFork.t >= replacedAt && nextFork.t - replacedAt <= restartBound },
      boundLines: num(sig.stop?.at) && num(replacedAt) ? logsIn('bound', sig.stop.at, Math.max(replacedAt, num(nextFork?.t) ? nextFork.t : replacedAt) + 2_000) : null,
      stoppedGone: { goneAt: sig.stoppedGone?.goneAt ?? null, beforeCont: num(sig.stoppedGone?.goneAt) && sig.cont?.sent !== true },
      // The probe review: an exit 0 before the storm's whole length was not the run's own.
      cutShort: run.exit.clean && !run.ranWhole ? 1 : 0
    },
    lines: { torn: run.torn },
    exit: run.exit,
    main: { dumps: run.mainDumps.length },
    dumps: { found: run.dumpsFound, read: run.dumpsRead },
    host: { linesRead: templates.some((t) => t.category === 'restart') && templates.some((t) => t.category === 'bound') },
    ...(run.loaded === null ? {} : { bundle: { head: run.loaded.host === true }, recorder: { nativeWrapped: run.loaded.nativeWrapped === true, forkWrapped: run.loaded.forkWrapped === true } }),
    printed: { exit: run.exit, crashes: run.crashes, rebound, paused: paused === null ? null : { waitedMs: paused.waitedMs, live: paused.live }, pairs, stopExit, nextFork, watcherDumps: run.watcherDumps.map((d) => ({ fault: d.fault.name, frames: d.frames.slice(0, 5) })) }
  };
}

/** SO: the ordinary phases. */
function ordinaryReading(raw) {
  const run = stormRunOf(raw.run ?? {});
  const lines = p365Lines(String(raw.run?.text ?? ''));
  const phase = (name) => lines.find((l) => l.kind === 'ordinary' && l.phase === name) ?? null;
  const boot = phase('boot');
  const quiet = phase('quiet');
  const branch = phase('branch5');
  const quit = phase('quit');
  const so = { native: {}, boot: {}, quiet: {}, branch: {}, quit: {} };
  if (boot !== null) {
    so.boot.ms = boot.bootMs;
    // The spec step's boot line counts started watches as main's native subscribes that did not fail.
    if (num(boot.started)) so.boot.started = boot.started;
    else if (num(boot.subscribe)) so.boot.started = boot.subscribe - (boot.failed ?? 0);
    so.boot.expected = num(boot.expected) ? boot.expected : SO_EXPECTED_WATCHES;
    if (num(boot.forkMs) || boot.forkMs === null) so.boot.forkMs = boot.forkMs;
    so.native.maxInFlight = boot.maxInFlight;
  }
  if (quit !== null) {
    so.native.subscribe = quit.subscribe;
    so.native.unsubscribe = quit.unsubscribe;
    so.native.loaded = typeof quit.nativeLoaded === 'boolean' ? quit.nativeLoaded : num(quit.subscribe) && quit.subscribe > 0;
    so.quit.drainMs = quit.quitDrainMs;
    so.quit.left = quit.left;
  }
  if (quiet !== null) so.quiet.changes = quiet.onChange;
  if (branch !== null) so.branch.changes = branch.onChange;
  const r = { so, exit: run.exit, printed: { boot, quiet, branch, quit } };
  if (run.loaded !== null) {
    r.bundle = { head: run.loaded.host === true };
    r.recorder = { nativeWrapped: run.loaded.nativeWrapped === true, forkWrapped: run.loaded.forkWrapped === true };
  }
  return r;
}

/** The median of a list of numbers, or null. */
export function median(xs) {
  const s = (Array.isArray(xs) ? xs : []).filter(num).sort((a, b) => a - b);
  if (s.length === 0) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * The first change event for a repository at or after a write: the renderer's
 * `{ p, t }` rows, `p` the event's payload as JSON. Null when none came.
 */
export function heardAfter(changes, repo, at) {
  const name = basename(String(repo));
  const hit = (Array.isArray(changes) ? changes : []).filter((c) => num(c?.t) && c.t >= at && String(c.p ?? '').includes(name)).sort((a, b) => a.t - b.t)[0];
  return hit === undefined ? null : hit.t - at;
}

/** RA: the real app's world, latencies, lsof reads, quit and what was left. */
function appReading(raw) {
  const changes = Array.isArray(raw.changes) ? raw.changes : [];
  const edits = (Array.isArray(raw.edits) ? raw.edits : []).map((e) => heardAfter(changes, e.repo, e.at));
  const branches = (Array.isArray(raw.branches) ? raw.branches : []).map((e) => heardAfter(changes, e.repo, e.at));
  const children = Array.isArray(raw.lsof?.children) ? raw.lsof.children : [];
  const holders = children.filter((c) => lsofHolds(c.text) === true);
  const events = (Array.isArray(raw.events) ? raw.events : []).filter((e) => num(e?.t) && typeof e.ev === 'string');
  const press = events.find((e) => e.ev === 'menu-quit') ?? null;
  return {
    agents: raw.agents ?? { ok: false, said: 'not read' },
    ra: {
      world: { opened: raw.world?.opened ?? 0, watched: raw.world?.watched ?? 0, closed: raw.world?.closed ?? 0 },
      edits: { n: edits.length, heard: edits.filter(num).length, latencies: edits.filter(num), median: median(edits) },
      branches: { n: branches.length, heard: branches.filter(num).length, latencies: branches.filter(num), median: median(branches) },
      quit: { pressed: press !== null && press.ok === true, wallMs: press !== null && num(raw.exitAt) ? raw.exitAt - press.t : null },
      // A child whose lsof answered nothing was not read (the probe review: children listed with
      // no lsof text read as "the process does not hold watcher.node").
      lsof: { mainRead: lsofHolds(raw.lsof?.main) !== null, mainHolds: lsofHolds(raw.lsof?.main) === true, processRead: children.some((c) => lsofHolds(c.text) !== null), processHolds: holders.length >= 1, holders: holders.map((h) => h.pid) },
      processGone: raw.watcherAfter === undefined ? undefined : Array.isArray(raw.watcherAfter) && raw.watcherAfter.length === 0,
      // Never invented: a run that did not count its dumps has no dump reading (the probe review).
      dumps: num(raw.dumpsFound) ? raw.dumpsFound : undefined
    },
    census: { clean: Array.isArray(raw.census) ? raw.census.length === 0 : undefined },
    printed: { edits, branches, quitMs: press !== null && num(raw.exitAt) ? raw.exitAt - press.t : null, holders: holders.map((h) => h.command?.slice(0, 160) ?? h.pid) }
  };
}

/** RH: the ids armed after the create and after the relaunch. */
function rescueReading(raw) {
  const idOf = (list, name) => {
    if (!Array.isArray(list)) return undefined;
    const row = list.find((x) => x?.name === name);
    return row === undefined ? undefined : typeof row.agentSessionId === 'string' && row.agentSessionId !== '' ? row.agentSessionId : null;
  };
  return {
    agents: raw.agents ?? { ok: false, said: 'not read' },
    rh: {
      resolved: raw.resolved === true,
      created: (Array.isArray(raw.created) ? raw.created : []).filter((x) => x?.ok === true).length,
      first: { a: idOf(raw.first, RH_NAMES.a), b: idOf(raw.first, RH_NAMES.b) },
      second: { a: idOf(raw.second, RH_NAMES.a), b: idOf(raw.second, RH_NAMES.b) },
      chosen: { a: RH_IDS.a, b: RH_IDS.b },
      bWritten: raw.bWritten === true
    },
    printed: { firstAt: raw.firstAt ?? null, secondAt: raw.secondAt ?? null }
  };
}

/**
 * THE ONE READER: one arm's raw input at one build, read into the reading its
 * grader asks. `raw.arm` names the arm; the rest is that arm's raw input.
 * A field the raw does not carry is left out, never invented, so the grader
 * names it missing.
 */
export function derive(raw) {
  switch (raw?.arm) {
    case 'SP':
    case 'SA':
      return stormReading(raw);
    case 'SQ':
      return quitReading(raw);
    case 'SK':
      return killReading(raw);
    case 'SO':
      return ordinaryReading(raw);
    case 'RA':
      return appReading(raw);
    case 'RH':
      return rescueReading(raw);
    default:
      throw new Error(`derive: no arm ${J(raw?.arm)}`);
  }
}

/** A derived reading laid over a recorded one, part by part: each derived part replaces the recorded part's fields it names. */
export function overlay(base, derived) {
  const out = structuredClone(base ?? {});
  for (const [k, v] of Object.entries(derived ?? {})) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && out[k] !== null && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = { ...out[k], ...v };
    else out[k] = structuredClone(v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE DUMP READER (binary). One Crashpad minidump of an Electron 43.3.0 arm64
// process: its modules, threads and their names, the exception and its signal,
// the crashing thread's frame-pointer walk, and every other thread inside
// watcher.node. Ported from the spec step's reader; `parseMinidump` takes a
// buffer and the symbol tables, so the self-test drives it over a dump it
// builds in memory, and `readMinidump` reads a file under this run only.
// ---------------------------------------------------------------------------

const SIGNAL_NAMES = Object.freeze({ 1: 'SIGHUP', 2: 'SIGINT', 3: 'SIGQUIT', 4: 'SIGILL', 5: 'SIGTRAP', 6: 'SIGABRT', 7: 'SIGEMT', 8: 'SIGFPE', 9: 'SIGKILL', 10: 'SIGBUS', 11: 'SIGSEGV', 12: 'SIGSYS', 13: 'SIGPIPE', 15: 'SIGTERM' });

/** The symbol whose start is the greatest at or below `off`, as `name+0x…`, or null. */
function nameIn(symbols, off) {
  let lo = 0;
  let hi = symbols.length - 1;
  let best = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (symbols[mid].addr <= off) {
      best = symbols[mid];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return best === null ? null : `${best.name}+0x${(off - best.addr).toString(16)}`;
}

/** `nm -n` text of watcher.node into a sorted table (demangled when `demangled` is given in the same order). */
export function watcherSymbolsOf(nmText, demangled = null) {
  const rows = [];
  for (const line of String(nmText).split('\n')) {
    const m = /^([0-9a-f]{16}) [tT] (.+)$/.exec(line);
    if (m) rows.push({ addr: BigInt(`0x${m[1]}`), name: m[2] });
  }
  return rows.map((r, i) => ({ addr: r.addr, name: String((demangled ?? [])[i] ?? r.name).replace(/std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>/g, 'string').slice(0, 140) }));
}

/** Breakpad FUNC and PUBLIC records into a sorted table. */
export function breakpadSymbolsOf(text) {
  const rows = [];
  for (const line of String(text).split('\n')) {
    let m = /^FUNC (?:m )?([0-9a-f]+) ([0-9a-f]+) [0-9a-f]+ (.*)$/.exec(line);
    if (m) {
      rows.push({ addr: BigInt(`0x${m[1]}`), name: m[3].slice(0, 160) });
      continue;
    }
    m = /^PUBLIC (?:m )?([0-9a-f]+) [0-9a-f]+ (.*)$/.exec(line);
    if (m) rows.push({ addr: BigInt(`0x${m[1]}`), name: m[2].slice(0, 160) });
  }
  rows.sort((a, b) => (a.addr < b.addr ? -1 : a.addr > b.addr ? 1 : 0));
  return rows;
}

/** Parse one minidump buffer. Pure: the symbol tables are handed in. */
export function parseMinidump(b, { watcherSymbols = [], efSymbols = [] } = {}) {
  const u32 = (o) => b.readUInt32LE(o);
  const u64 = (o) => b.readBigUInt64LE(o);
  const mdString = (rva) => b.subarray(rva + 4, rva + 4 + u32(rva)).toString('utf16le');
  if (b.length < 32 || b.toString('latin1', 0, 4) !== 'MDMP') throw new Error('not a minidump');
  const nStreams = u32(8);
  const dirRva = u32(12);
  const streams = {};
  for (let i = 0; i < nStreams; i += 1) {
    const o = dirRva + i * 12;
    streams[u32(o)] = { size: u32(o + 4), rva: u32(o + 8) };
  }
  const modules = [];
  if (streams[4]) {
    const r = streams[4].rva;
    const n = u32(r);
    for (let i = 0; i < n; i += 1) {
      const m = r + 4 + i * 108;
      modules.push({ base: u64(m), size: BigInt(u32(m + 8)), name: mdString(u32(m + 20)) });
    }
  }
  const moduleOf = (addr) => modules.find((m) => addr >= m.base && addr < m.base + m.size) ?? null;
  const watcherMod = modules.find((m) => basename(m.name) === 'watcher.node') ?? null;
  const describe = (addr) => {
    if (addr === 0n) return '0x0 (null)';
    const m = moduleOf(addr);
    if (m === null) return `0x${addr.toString(16)} (no module)`;
    const off = addr - m.base;
    if (m === watcherMod && watcherSymbols.length > 0) return `watcher.node ${nameIn(watcherSymbols, off) ?? '?'}`;
    if (efSymbols.length > 0 && basename(m.name) === 'Electron Framework') {
      const n = nameIn(efSymbols, off);
      if (n !== null) return `EF ${n}`;
    }
    return `${basename(m.name)}+0x${off.toString(16)}`;
  };
  const threads = new Map();
  if (streams[3]) {
    const r = streams[3].rva;
    const n = u32(r);
    for (let i = 0; i < n; i += 1) {
      const t = r + 4 + i * 48;
      threads.set(u32(t), { id: u32(t), stackStart: u64(t + 24), stackSize: u32(t + 32), stackRva: u32(t + 36), ctxSize: u32(t + 40), ctxRva: u32(t + 44) });
    }
  }
  const names = new Map();
  if (streams[24]) {
    const r = streams[24].rva;
    const n = u32(r);
    for (let i = 0; i < n; i += 1) {
      const t = r + 4 + i * 12;
      try {
        names.set(u32(t), mdString(Number(u64(t + 4))));
      } catch {
        /* unnamed */
      }
    }
  }
  const firstModule = modules.length > 0 ? basename(modules[0].name) : null;
  const threadNames = [...new Set([...names.values()].filter((x) => x !== ''))];
  // The fix round: MINIDUMP_HEADER's TimeDateStamp (offset 20, seconds), so SQ can tell a
  // dump written at the quit from one the storm before it wrote.
  const common = { modules: modules.length, firstModule, threadNames, threadCount: threads.size, watcherLoaded: watcherMod !== null, stamp: u32(20) };
  if (!streams[6]) return { ...common, exception: null, thread: null, frames: [], inWatcher: [], kind: dumpKind({ ...common }) };
  const e = streams[6].rva;
  const threadId = u32(e);
  const code = u32(e + 8);
  const flags = u32(e + 12);
  const address = u64(e + 24);
  const nParams = u32(e + 32);
  const params = [];
  for (let i = 0; i < Math.min(nParams, 15); i += 1) params.push(u64(e + 40 + i * 8));
  const ctxRva = u32(e + 164);
  const reg = (i) => u64(ctxRva + 8 + i * 8);
  const pc = u64(ctxRva + 264);
  const lr = reg(30);
  const fp = reg(29);
  const th = threads.get(threadId);
  const frames = [describe(pc), `lr ${describe(lr)}`];
  if (th && th.stackSize > 0) {
    const lo = th.stackStart;
    const hi = th.stackStart + BigInt(th.stackSize);
    let f = fp;
    for (let i = 0; i < 40; i += 1) {
      if (!(f >= lo && f + 16n <= hi)) break;
      const next = u64(th.stackRva + Number(f - lo));
      const ret = u64(th.stackRva + Number(f - lo) + 8);
      if (next <= f) break;
      frames.push(describe(ret));
      f = next;
    }
  }
  const walk = (t) => {
    if (!t || t.ctxRva === 0) return [];
    const tpc = u64(t.ctxRva + 264);
    const tlr = u64(t.ctxRva + 8 + 30 * 8);
    let f = u64(t.ctxRva + 8 + 29 * 8);
    const chain = [describe(tpc), describe(tlr)];
    const lo = t.stackStart;
    const hi = t.stackStart + BigInt(t.stackSize);
    for (let i = 0; i < 24 && t.stackSize > 0; i += 1) {
      if (!(f >= lo && f + 16n <= hi)) break;
      const nextF = u64(t.stackRva + Number(f - lo));
      chain.push(describe(u64(t.stackRva + Number(f - lo) + 8)));
      if (nextF <= f) break;
      f = nextF;
    }
    return chain;
  };
  const inWatcher = [];
  for (const t of threads.values()) {
    if (t.id === threadId) continue;
    const chain = walk(t);
    if (chain.some((c) => c.startsWith('watcher.node'))) inWatcher.push({ id: t.id, name: names.get(t.id) ?? null, chain: chain.slice(0, 10) });
  }
  // A signal Crashpad recorded as EXC_CRASH (0xa) carries its number in bits 24 to 31 of the second parameter.
  const sigNo = params.length >= 2 && params[0] === 0xan ? Number((params[1] >> 24n) & 0xffn) : null;
  const out = {
    ...common,
    exception: { code: `0x${code.toString(16)}`, flags: `0x${flags.toString(16)}`, address: `0x${address.toString(16)}`, params: params.map((p) => `0x${p.toString(16)}`), signal: sigNo === null ? null : (SIGNAL_NAMES[sigNo] ?? `signal ${String(sigNo)}`) },
    thread: { id: threadId, name: names.get(threadId) ?? null },
    frames,
    inWatcher
  };
  out.kind = dumpKind(out);
  return out;
}

// ---------------------------------------------------------------------------
// The graders (pure, over a reading): used live and in --grader-self-test
// ---------------------------------------------------------------------------

const N_PARENT_BUNDLE = ['the parent’s own five sites were bundled, with no host in the bundle', (r) => r.bundle.head === false];
const N_HEAD_BUNDLE = ['HEAD’s five sites were bundled with the host (watcher/host.ts)', (r) => r.bundle.head === true];
const N_NATIVE_WRAP = ['the native counter was installed in main before the bundle loaded', (r) => r.recorder.nativeWrapped === true];
const N_FORK_WRAP = ['the fork recorder was installed in main before the bundle loaded', (r) => r.recorder.forkWrapped === true];
const N_RUNS = ['every run asked for started its storm', (r) => r.storm.runsWanted > 0 && r.storm.runsRead === r.storm.runsWanted];
const N_RATE = [`every storm ran at research 143’s rate, at least ${String(RATE_FLOOR)} asks a second`, (r) => r.storm.rateOk === true];
const N_BEFORE = ['every run removed a folder before its watch was dropped (the order before)', (r) => r.storm.orderBefore === true];
const N_AFTER = ['every run removed a folder as its watch was already being dropped (the order after)', (r) => r.storm.orderAfter === true];
const N_DUMPS = ['every dump Crashpad wrote under the run’s profile was read', (r) => r.dumps.read === r.dumps.found];
const N_FORKED = ['the watcher process was forked and answered ready', (r) => r.watcherProcess.forks >= 1 && r.watcherProcess.ready >= 1];
const N_AGENTS = ['the agents:list answer resolved nothing but the stand-ins', (r) => r.agents.ok === true];
// The probe review's three needs on HEAD's storms. A run the probe's ceiling ended is read as
// no clean exit (stormRunOf); a run that exited 0 on its own before its storm's whole length is
// cut short and cannot be graded whole; a torn P365 line is a reading lost (a torn exit line hid a
// crash and its missing re-bind); and a storm whose watcher process answered almost nothing never
// reached the native module, so "main never faulted" would say nothing.
const N_FULL = ['every run that exited 0 ran its whole storm and reached its own quit (none cut short)', (r) => r.storm.cutShort === 0];
const N_LINES = ['every P365 line the run wrote was read whole (none torn by the other stream)', (r) => r.lines.torn === 0];
const N_PROCESS_RATE = [`the watcher process answered at least ${String(PROCESS_RATE_FLOOR)} subscriptions a second in every run (the storm reached the native module)`, (r) => r.storm.processRateOk === true];

const STORM_BASE_READS = ['bundle.head', 'recorder.nativeWrapped', 'storm.runsWanted', 'storm.runsRead', 'storm.rateOk', 'dumps.found', 'dumps.read'];

function stormParent(orderNeed) {
  return {
    reads: [...STORM_BASE_READS, orderNeed === N_AFTER ? 'storm.orderAfter' : 'storm.orderBefore', 'main.signalRuns', 'main.namedSignalRuns'],
    needs: [N_PARENT_BUNDLE, N_NATIVE_WRAP, N_RUNS, N_RATE, orderNeed, N_DUMPS],
    clauses: [['main ended by a signal in at least one run, its fault named from its dump', (r) => r.main.namedSignalRuns >= 1]]
  };
}
function stormHead(orderNeed) {
  return {
    reads: [...STORM_BASE_READS, orderNeed === N_AFTER ? 'storm.orderAfter' : 'storm.orderBefore', 'recorder.forkWrapped', 'main.exit0Runs', 'main.dumps', 'main.nativeCalls', 'main.nativeLoaded', 'watcherProcess.forks', 'watcherProcess.ready', 'watcherProcess.crashes', 'watcherProcess.rebound', 'reportsAdded', 'storm.cutShort', 'storm.processRateOk', 'lines.torn'],
    needs: [N_HEAD_BUNDLE, N_NATIVE_WRAP, N_FORK_WRAP, N_RUNS, N_RATE, orderNeed, N_DUMPS, N_FORKED, N_FULL, N_LINES, N_PROCESS_RATE],
    clauses: [
      ['main exited 0 in every run', (r) => r.main.exit0Runs === r.storm.runsRead],
      ['no dump of main', (r) => r.main.dumps === 0],
      // The probe review: loaded is read too, because a dynamic import() of the package (HEAD's
      // in-process branch) loads and runs it in main without one call the require counter can see.
      ['main made no native call and never loaded the module', (r) => r.main.nativeCalls === 0 && r.main.nativeLoaded === false],
      ['every watcher process crash was followed by a re-bind of every live watch within the backoff plus 1 s', (r) => r.watcherProcess.rebound === r.watcherProcess.crashes],
      ['no report in his folder', (r) => r.reportsAdded === 0]
    ]
  };
}

const SQ_SHAPE_NEED = ['the storm ran 20 s, then the quit was marked first, main’s pool held by 8 jobs and every watch dropped', (r) => r.sq.quit.asked === true && r.sq.quit.saturated === true && r.sq.quit.marked === true && r.sq.stormMs >= SQ_STORM_MS - 1_000];
const SQ_READS = ['bundle.head', 'recorder.nativeWrapped', 'sq.stormMs', 'sq.quit.asked', 'sq.quit.saturated', 'sq.quit.marked', 'exit.code', 'exit.signal', 'dumps.found', 'dumps.read'];

const SO_READS = ['bundle.head', 'recorder.nativeWrapped', 'exit.code', 'exit.clean', 'so.boot.ms', 'so.boot.started', 'so.boot.expected', 'so.native.subscribe', 'so.native.maxInFlight', 'so.quiet.changes', 'so.branch.changes', 'so.quit.drainMs', 'so.quit.left'];
const SO_WORLD_NEED = [`the ordinary world was built: 20 projects, the two configuration watches and 5 rescues, ${String(SO_EXPECTED_WATCHES)} watches started`, (r) => r.so.boot.started === r.so.boot.expected];
// `clean` (the probe review): a run the probe's ceiling ended exits 0 by the teardown's SIGTERM, which is not its own quit.
const SO_EXIT_NEED = ['the ordinary run ended by its own quit, exit 0', (r) => r.exit.code === 0 && r.exit.clean === true];

const RA_READS = ['agents.ok', 'ra.world.opened', 'ra.world.watched', 'ra.edits.n', 'ra.edits.heard', 'ra.edits.latencies', 'ra.branches.n', 'ra.branches.heard', 'ra.branches.latencies', 'ra.quit.pressed', 'ra.quit.wallMs', 'ra.lsof.mainRead', 'ra.lsof.mainHolds'];
const RA_NEEDS = [
  N_AGENTS,
  [`${String(RA_PROJECTS)} projects opened through the window and each watched (git status asked)`, (r) => r.ra.world.opened === RA_PROJECTS && r.ra.world.watched === RA_PROJECTS],
  [`every edit (${String(RA_PROJECTS)}) and every branch switch (${String(RA_BRANCH)}) was heard`, (r) => r.ra.edits.n === RA_PROJECTS && r.ra.edits.heard === RA_PROJECTS && r.ra.branches.n === RA_BRANCH && r.ra.branches.heard === RA_BRANCH],
  ['the menu’s Quit row was pressed in main and the quit’s end read', (r) => r.ra.quit.pressed === true && num(r.ra.quit.wallMs)],
  ['lsof read main', (r) => r.ra.lsof.mainRead === true]
];

const RH_READS = ['agents.ok', 'rh.resolved', 'rh.created', 'rh.first.a', 'rh.first.b', 'rh.second.a', 'rh.second.b', 'rh.chosen.a', 'rh.chosen.b', 'rh.bWritten'];
const RH_NEEDS = [
  N_AGENTS,
  ['the scratch login shell resolves codex to the stand-in', (r) => r.rh.resolved === true],
  ['both sessions were created', (r) => r.rh.created === 2],
  ['the second row was unarmed at the quit and its record written before the relaunch', (r) => r.rh.first.b === null && r.rh.bWritten === true]
];

export const GRADERS = {
  'SP-parent': { title: 'the parent, the product storm through its own five sites: main ends by a signal, the fault named from its dump', ...stormParent(N_BEFORE) },
  'SP-head': { title: 'HEAD, the product storm: main exits 0 in every run with no dump and no native call, every process crash re-bound', ...stormHead(N_BEFORE) },
  'SA-parent': { title: 'the parent, the storm with each folder removed as its watch is already being dropped: main ends by a signal, named', ...stormParent(N_AFTER) },
  'SA-head': { title: 'HEAD, the same: main exits 0 in every run, the process may crash and is re-bound', ...stormHead(N_AFTER) },
  'SQ-parent': {
    title: 'the parent, a quit mid-storm with main’s pool held: SIGABRT, napi_fatal_error on main named from its dump',
    reads: [...SQ_READS, 'main.faults'],
    needs: [N_PARENT_BUNDLE, N_NATIVE_WRAP, SQ_SHAPE_NEED, N_DUMPS],
    clauses: [['main ended by SIGABRT with napi_fatal_error named on main', (r) => r.exit.signal === 'SIGABRT' && r.main.faults.includes('napi_fatal_error')]]
  },
  'SQ-head': {
    title: 'HEAD, the same quit: exit 0 with no dump of main or of the watcher process from the quit, and lsof never lists watcher.node in main while the process holds it',
    reads: [...SQ_READS, 'exit.clean', 'recorder.forkWrapped', 'main.dumps', 'watcher.quitDumps', 'sq.lsof.mainReads', 'sq.lsof.mainHolds', 'sq.lsof.watcherReads', 'sq.lsof.watcherHolds'],
    needs: [N_HEAD_BUNDLE, N_NATIVE_WRAP, N_FORK_WRAP, SQ_SHAPE_NEED, N_DUMPS, ['lsof read main and the watcher process during the storm', (r) => r.sq.lsof.mainReads >= 1 && r.sq.lsof.watcherReads >= 1]],
    clauses: [
      // `clean` is false when the probe's ceiling ended the run: its SIGTERM quits Electron with 0.
      ['main exited 0', (r) => r.exit.code === 0 && r.exit.signal === null && r.exit.clean === true],
      ['no dump of main', (r) => r.main.dumps === 0],
      // The fix round (the attack lens): a quit that left a close in the watcher process's queue
      // aborted it in its own teardown, Phase 36's crash moved into the helper, and its dump reads
      // as an unclean exit at the next launch. The host now ends the process at the quit instead.
      ['no dump of the watcher process from the quit', (r) => r.watcher.quitDumps === 0],
      ['lsof never listed watcher.node in main during the storm', (r) => r.sq.lsof.mainHolds === false],
      ['the watcher process held watcher.node', (r) => r.sq.lsof.watcherHolds === true]
    ]
  },
  'SK-head': {
    title: 'HEAD, the watcher process SIGKILLed at 30 s and SIGSTOPped at 90 s: main never faults, one restart line, every watch re-bound with one re-scan error each, the stopped process replaced within its bound with one line and ended by the host',
    reads: ['bundle.head', 'recorder.forkWrapped', 'host.linesRead', 'sk.paused', 'sk.kill.sent', 'sk.kill.verified', 'sk.rebind.watches', 'sk.rebind.asked', 'sk.rebind.answered', 'sk.restartLines', 'sk.rescan.projects', 'sk.rescan.known', 'sk.rescan.exact', 'sk.stop.sent', 'sk.stop.verified', 'sk.replacement.ok', 'sk.boundLines', 'sk.stoppedGone.beforeCont', 'exit.code', 'exit.signal', 'exit.clean', 'main.dumps', 'dumps.found', 'dumps.read', 'sk.cutShort', 'lines.torn'],
    needs: [
      N_HEAD_BUNDLE,
      N_FORK_WRAP,
      ['the host’s restart and reply-bound lines were read from host.ts', (r) => r.host.linesRead === true],
      N_DUMPS,
      ['the storm paused and its watches settled before the kill', (r) => r.sk.paused === true],
      ['SIGKILL went to the run’s own watcher process, read by ps first', (r) => r.sk.kill.sent === true && r.sk.kill.verified === true],
      ['SIGSTOP went to the run’s own watcher process, read by ps first', (r) => r.sk.stop.sent === true && r.sk.stop.verified === true],
      ['each open project’s two watches were read at the pause', (r) => r.sk.rescan.known === true && r.sk.rescan.projects > 0],
      ['the storm ran its whole length and reached its own quit (not cut short)', (r) => r.sk.cutShort === 0],
      N_LINES
    ],
    clauses: [
      ['main never faulted: exit 0 and no dump of main', (r) => r.exit.code === 0 && r.exit.signal === null && r.exit.clean === true && r.main.dumps === 0],
      ['one restart line after the kill', (r) => r.sk.restartLines === 1],
      ['every live watch re-bound after the kill', (r) => r.sk.rebind.watches > 0 && r.sk.rebind.asked === r.sk.rebind.watches && r.sk.rebind.answered === r.sk.rebind.asked],
      ['each open project’s live watches were handed one re-scan error each', (r) => r.sk.rescan.exact === true],
      ['after SIGSTOP the process was replaced within the reply bound of the first unanswered request', (r) => r.sk.replacement.ok === true],
      ['with one reply-bound line', (r) => r.sk.boundLines === 1],
      ['the stopped process was ended by the host before the probe’s SIGCONT', (r) => r.sk.stoppedGone.beforeCont === true]
    ]
  },
  'SO-parent': {
    title: 'the parent, ordinary use through its own sites: main makes the native calls itself (printed: how many, how many in flight)',
    reads: SO_READS,
    needs: [N_PARENT_BUNDLE, N_NATIVE_WRAP, SO_WORLD_NEED, SO_EXIT_NEED],
    clauses: [['main made the native calls itself', (r) => r.so.native.subscribe > 0]]
  },
  'SO-head': {
    title: 'HEAD, ordinary use: no native call in main, every watch started, the boot within twice the parent’s plus the fork, the edits and switches heard as at the parent, the quit’s closes settled within 2 s',
    reads: [...SO_READS, 'recorder.forkWrapped', 'so.native.loaded', 'so.native.unsubscribe', 'so.boot.forkMs', 'parent.bootMs', 'parent.quietChanges', 'parent.branchChanges', 'parent.verdict'],
    // The probe review: a parent whose own verdict was UNREADABLE is no baseline (its boot that
    // never reached its watches reads as 20 s, and any HEAD boot is "within twice" of that).
    needs: [N_HEAD_BUNDLE, N_NATIVE_WRAP, N_FORK_WRAP, ['the parent’s ordinary run was read (its own verdict not UNREADABLE), the parent having run first', (r) => num(r.parent.bootMs) && num(r.parent.quietChanges) && num(r.parent.branchChanges) && (r.parent.verdict === 'pass' || r.parent.verdict === 'fail')], SO_EXIT_NEED],
    clauses: [
      ['no native call in main, the module never loaded there', (r) => r.so.native.loaded === false && r.so.native.subscribe === 0 && r.so.native.unsubscribe === 0],
      [`every watch started (${String(SO_EXPECTED_WATCHES)} of ${String(SO_EXPECTED_WATCHES)})`, (r) => r.so.boot.started === r.so.boot.expected],
      ['the boot within twice the parent’s time plus the fork', (r) => num(r.so.boot.forkMs) && r.so.boot.ms <= 2 * r.parent.bootMs + r.so.boot.forkMs],
      ['the 20 edits and the 5 branch switches reached their projects as at the parent', (r) => r.so.quiet.changes >= r.parent.quietChanges && r.so.branch.changes - r.so.quiet.changes >= r.parent.branchChanges - r.parent.quietChanges],
      ['the quit’s closes settled within 2 s, none left', (r) => r.so.quit.drainMs <= SO_QUIT_DRAIN_MS && r.so.quit.left === 0]
    ]
  },
  'RA-parent': {
    title: 'the parent, the real app with 20 projects: main holds watcher.node (printed: each latency and the quit’s wall time)',
    reads: RA_READS,
    needs: RA_NEEDS,
    clauses: [['main holds watcher.node (lsof)', (r) => r.ra.lsof.mainHolds === true]]
  },
  'RA-head': {
    title: 'HEAD, the real app with 20 projects: latencies and the quit as the parent’s, watcher.node in the watcher process and not in main, the process gone after the quit, no dump, the census clean',
    reads: [...RA_READS, 'ra.lsof.processRead', 'ra.lsof.processHolds', 'ra.processGone', 'ra.dumps', 'census.clean', 'parent.editMedian', 'parent.branchMedian', 'parent.quitMs', 'parent.verdict'],
    needs: [...RA_NEEDS, ['the parent’s RA was read (its own verdict not UNREADABLE), the parent having run first', (r) => num(r.parent.editMedian) && num(r.parent.branchMedian) && num(r.parent.quitMs) && (r.parent.verdict === 'pass' || r.parent.verdict === 'fail')], ['lsof read main’s child processes', (r) => r.ra.lsof.processRead === true]],
    clauses: [
      [`each edit heard within ${String(RA_LATENCY_SLACK_MS)} ms of the parent’s median`, (r) => r.ra.edits.latencies.every((l) => l <= r.parent.editMedian + RA_LATENCY_SLACK_MS)],
      [`each branch switch heard within ${String(RA_LATENCY_SLACK_MS)} ms of the parent’s median`, (r) => r.ra.branches.latencies.every((l) => l <= r.parent.branchMedian + RA_LATENCY_SLACK_MS)],
      [`the quit’s wall time within ${String(RA_QUIT_SLACK_MS)} ms of the parent’s`, (r) => r.ra.quit.wallMs <= r.parent.quitMs + RA_QUIT_SLACK_MS],
      ['watcher.node in the watcher process and not in main (lsof)', (r) => r.ra.lsof.mainHolds === false && r.ra.lsof.processHolds === true],
      ['the watcher process gone after the quit', (r) => r.ra.processGone === true],
      ['no dump', (r) => r.ra.dumps === 0],
      ['the census clean', (r) => r.census.clean === true]
    ]
  },
  'RH-parent': {
    title: 'the parent, the harvest’s rescue with a stand-in codex: the id armed at the create and by the boot rescue (printed)',
    reads: RH_READS,
    needs: RH_NEEDS,
    clauses: [['the id armed both times: at the create, and by the boot rescue', (r) => r.rh.first.a === r.rh.chosen.a && r.rh.second.a === r.rh.chosen.a && r.rh.second.b === r.rh.chosen.b]]
  },
  'RH-head': {
    title: 'HEAD, the same: the same ids as the parent’s run, both times',
    reads: [...RH_READS, 'parent.firstA', 'parent.secondA', 'parent.secondB', 'parent.verdict'],
    // The probe review: "the same ids as the parent's" is no rescue at all when the parent armed
    // none (both null read the same), so the parent must have PASSED, its three ids armed.
    needs: [...RH_NEEDS, ['the parent’s RH was read and passed, all three ids armed, the parent having run first', (r) => r.parent.verdict === 'pass' && typeof r.parent.firstA === 'string' && typeof r.parent.secondA === 'string' && typeof r.parent.secondB === 'string']],
    clauses: [['the same ids as the parent’s run, both times', (r) => r.rh.first.a === r.parent.firstA && r.rh.second.a === r.parent.secondA && r.rh.second.b === r.parent.secondB]]
  },
  RUN: {
    title: 'the run: the preflights, the hidden agents, the census, every pid ended, his history, his reports folder, every dump deleted',
    reads: ['preflight.ok', 'agentsHeld', 'censusFailures', 'tailscale.real', 'processTableRead', 'electronsLeft', 'watchersLeft', 'reportsRead', 'newReports', 'dumpsLeft', 'history'],
    needs: [['the process table and his reports folder were read', (r) => r.processTableRead === true && r.reportsRead === true]],
    clauses: [
      ['every preflight held', (r) => r.preflight.ok === true],
      ['every launch’s agents:list resolved nothing but the stand-ins', (r) => r.agentsHeld.every((x) => x === true)],
      ['the census found nothing of the run on his server', (r) => r.censusFailures.length === 0],
      ['no real Tailscale was seen under the run', (r) => r.tailscale.real === 0],
      ['no Electron of the run left', (r) => r.electronsLeft === 0],
      ['no watcher process of the run left', (r) => r.watchersLeft === 0],
      ['no report in his folder since the run began', (r) => r.newReports.length === 0],
      ['every dump deleted after its reading', (r) => r.dumpsLeft === 0],
      ['his shell history unmoved, or moved by his own terminal', (r) => historyHeld(r.history) === 'unmoved' || historyHeld(r.history) === 'his terminal']
    ]
  }
};

/** p349's history rule, by value: unmoved, held, his terminal, or unread. */
export function historyHeld(history) {
  if (history?.before === history?.after) return 'unmoved';
  if (history?.quiet === null || history?.quiet === undefined || typeof history.quiet.again !== 'string') return 'unread';
  return history.quiet.again !== history.after ? 'his terminal' : 'held';
}

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
 * One grader's verdict: `{ verdict: 'pass'|'fail'|'unreadable', ok, failed, missing }`.
 * A field the grader reads that is absent, or a need that does not hold, is
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
// --grader-self-test: every grader, the one reader and the dump reader on
// build/p365/fixtures/ and on a minidump built in memory. Starts nothing.
// ---------------------------------------------------------------------------

export const FIXTURES_DIR = join(ROOT, 'build', 'p365', 'fixtures');
export const GRADER_FIXTURES = join(FIXTURES_DIR, 'graders.json');

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

/**
 * One raw fixture's raw input. A storm-kind run folder under raw/ holds the
 * spec step's `stdout.txt` and a `bundle.json` naming its exit, its dump
 * readings (the spec reader's JSON, no dump), its P365 env and anything
 * constructed (each marked so in that file). `parts` lists the run folders an
 * arm's raw is made of, in order; `extra` is laid on the raw as given.
 */
export function rawOf(fixture) {
  const runOf = (dir) => {
    const base = join(FIXTURES_DIR, 'raw', dir);
    const bundle = JSON.parse(readFileSync(join(base, 'bundle.json'), 'utf8'));
    let text = '';
    try {
      text = readFileSync(join(base, 'stdout.txt'), 'utf8');
    } catch {
      text = '';
    }
    const addLines = (bundle.addLines ?? []).map((o) => `P365 ${J(o)}`).join('\n');
    // A recorded `reportsAdded: null` (the folder unread) stays null, and `ceilingHit` travels.
    const has = (k) => Object.prototype.hasOwnProperty.call(bundle, k);
    return { text: addLines === '' ? text : `${text}\n${addLines}\n`, exit: bundle.exit, dumps: bundle.dumps ?? [], dumpsFound: bundle.dumpsFound ?? (bundle.dumps ?? []).length, reportsAdded: has('reportsAdded') ? bundle.reportsAdded : [], env: bundle.env ?? {}, ...(has('ceilingHit') ? { ceilingHit: bundle.ceilingHit } : {}) };
  };
  const runs = (fixture.runs ?? []).map(runOf);
  const raw = { arm: fixture.arm.split('-')[0], ...(fixture.extra ?? {}) };
  if (raw.arm === 'SP' || raw.arm === 'SA') {
    raw.runs = runs;
    raw.runsWanted = fixture.runsWanted ?? runs.length;
  } else raw.run = runs[0];
  return raw;
}

/**
 * A minidump built in memory: three modules (the app, Electron Framework and
 * watcher.node), two threads (an unnamed one that faults, CrBrowserMain in
 * watcher.node's Debounce), their names, an EXC_CRASH exception carrying
 * SIGTRAP, a context and a two-frame stack. Answers the buffer, the symbol
 * tables and what the reader must read from it.
 */
export function syntheticMinidump() {
  const APP = 0x100000000n;
  const EF = 0x110000000n;
  const WN = 0x120000000n;
  const STACK = 0x16f000000n;
  const parts = [];
  let offset = 0;
  const reserve = (n) => {
    const at0 = offset;
    const buf = Buffer.alloc(n);
    parts.push(buf);
    offset += n;
    return { at: at0, buf };
  };
  const header = reserve(32);
  const dir = reserve(4 * 12);
  const str = (s) => {
    const body = Buffer.from(s, 'utf16le');
    const r = reserve(4 + body.length);
    r.buf.writeUInt32LE(body.length, 0);
    body.copy(r.buf, 4);
    return r.at;
  };
  const names = [str('/x/Electron.app/Contents/MacOS/Electron'), str('/x/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework'), str('/x/node_modules/@parcel/watcher-darwin-arm64/watcher.node')];
  const tn = [str(''), str('CrBrowserMain')];
  const mods = reserve(4 + 3 * 108);
  mods.buf.writeUInt32LE(3, 0);
  [[APP, names[0]], [EF, names[1]], [WN, names[2]]].forEach(([base, rva], i) => {
    const o = 4 + i * 108;
    mods.buf.writeBigUInt64LE(base, o);
    mods.buf.writeUInt32LE(0x10000, o + 8);
    mods.buf.writeUInt32LE(rva, o + 20);
  });
  const context = (pc, lr, fp) => {
    const r = reserve(8 + 33 * 8);
    r.buf.writeBigUInt64LE(fp, 8 + 29 * 8);
    r.buf.writeBigUInt64LE(lr, 8 + 30 * 8);
    r.buf.writeBigUInt64LE(pc, 8 + 32 * 8);
    return r.at;
  };
  // Thread 101 faults in EF's freelist check, called from watcher.node's isIgnored, called from FSEventsCallback.
  const stack1 = reserve(64);
  stack1.buf.writeBigUInt64LE(STACK + 0x20n, 0x10);
  stack1.buf.writeBigUInt64LE(WN + 0x1040n, 0x18);
  stack1.buf.writeBigUInt64LE(STACK + 0x30n, 0x20);
  stack1.buf.writeBigUInt64LE(WN + 0x2050n, 0x28);
  stack1.buf.writeBigUInt64LE(0n, 0x30);
  const ctx1 = context(EF + 0x302cn, EF + 0x302cn, STACK + 0x10n);
  const stack2 = reserve(32);
  stack2.buf.writeBigUInt64LE(0n, 0x0);
  const ctx2 = context(APP + 0x10n, WN + 0x3010n, 0x170000000n);
  const threads = reserve(4 + 2 * 48);
  threads.buf.writeUInt32LE(2, 0);
  [[101, STACK, 64, stack1.at, ctx1], [102, 0x170000000n, 32, stack2.at, ctx2]].forEach(([id, start, size, rva, ctx], i) => {
    const o = 4 + i * 48;
    threads.buf.writeUInt32LE(id, o);
    threads.buf.writeBigUInt64LE(start, o + 24);
    threads.buf.writeUInt32LE(size, o + 32);
    threads.buf.writeUInt32LE(rva, o + 36);
    threads.buf.writeUInt32LE(8 + 33 * 8, o + 40);
    threads.buf.writeUInt32LE(ctx, o + 44);
  });
  const tnames = reserve(4 + 2 * 12);
  tnames.buf.writeUInt32LE(2, 0);
  [[101, tn[0]], [102, tn[1]]].forEach(([id, rva], i) => {
    tnames.buf.writeUInt32LE(id, 4 + i * 12);
    tnames.buf.writeBigUInt64LE(BigInt(rva), 4 + i * 12 + 4);
  });
  const exc = reserve(168);
  exc.buf.writeUInt32LE(101, 0);
  exc.buf.writeUInt32LE(0x6, 8);
  exc.buf.writeUInt32LE(0x1, 12);
  exc.buf.writeBigUInt64LE(EF + 0x302cn, 24);
  exc.buf.writeUInt32LE(3, 32);
  exc.buf.writeBigUInt64LE(0xan, 40);
  exc.buf.writeBigUInt64LE(0x5600001n, 48);
  exc.buf.writeBigUInt64LE(EF + 0x302cn, 56);
  exc.buf.writeUInt32LE(8 + 33 * 8, 160);
  exc.buf.writeUInt32LE(ctx1, 164);
  header.buf.write('MDMP', 0, 'latin1');
  header.buf.writeUInt32LE(0xa793, 4);
  header.buf.writeUInt32LE(4, 8);
  header.buf.writeUInt32LE(dir.at, 12);
  [[4, mods], [3, threads], [24, tnames], [6, exc]].forEach(([type, s], i) => {
    dir.buf.writeUInt32LE(type, i * 12);
    dir.buf.writeUInt32LE(s.buf.length, i * 12 + 4);
    dir.buf.writeUInt32LE(s.at, i * 12 + 8);
  });
  const watcherSymbols = [
    { addr: 0x1000n, name: 'Watcher::isIgnored(string)' },
    { addr: 0x2000n, name: 'FSEventsCallback(__FSEventStream const*, void*, unsigned long, void*, unsigned int const*, unsigned long long const*)' },
    { addr: 0x3000n, name: 'Debounce::wait()' }
  ];
  const efSymbols = [{ addr: 0x3000n, name: 'partition_alloc::internal::FreelistCorruptionDetected(unsigned long)' }];
  return {
    buf: Buffer.concat(parts),
    watcherSymbols,
    efSymbols,
    expect: {
      kind: 'main',
      firstModule: 'Electron',
      signal: 'SIGTRAP',
      threadName: '',
      frames: ['EF partition_alloc::internal::FreelistCorruptionDetected(unsigned long)+0x2c', 'lr EF partition_alloc::internal::FreelistCorruptionDetected(unsigned long)+0x2c', 'watcher.node Watcher::isIgnored(string)+0x40', 'watcher.node FSEventsCallback(__FSEventStream const*, void*, unsigned long, void*, unsigned int const*, unsigned long long const*)+0x50'],
      inWatcher: [102],
      fault: 'freelist check',
      framesWithoutEf: ['Electron Framework+0x302c', 'lr Electron Framework+0x302c', 'watcher.node Watcher::isIgnored(string)+0x40', 'watcher.node FSEventsCallback(__FSEventStream const*, void*, unsigned long, void*, unsigned int const*, unsigned long long const*)+0x50'],
      faultWithoutEf: 'in watcher.node: Watcher::isIgnored'
    }
  };
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
    process.stdout.write('[p365] grader self-test FAIL.\n');
    return false;
  }
  const honest = fixtures.honest ?? {};
  const broken = Array.isArray(fixtures.broken) ? fixtures.broken : [];
  const unread = Array.isArray(fixtures.unreadable) ? fixtures.unreadable : [];
  const raw = Array.isArray(fixtures.raw) ? fixtures.raw : [];
  const reads = Array.isArray(fixtures.rawReads) ? fixtures.rawReads : [];
  const variants = Array.isArray(fixtures.variants) ? fixtures.variants : [];
  const hostCases = Array.isArray(fixtures.hostLines) ? fixtures.hostLines : [];
  const count = Object.keys(honest).length + broken.length + unread.length + raw.length + reads.length + variants.length + hostCases.length;
  say(count === fixtures.readings, `the fixtures hold ${String(count)} readings, as their own count says (${String(fixtures.readings)})`);
  const sole = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
  const soleMiss = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
  const known = (arm, names, kind) => {
    const list = kind === 'clause' ? GRADERS[arm].clauses.map(([n]) => n) : [...GRADERS[arm].needs.map(([n]) => n), ...GRADERS[arm].reads.map(missingField)];
    return (names ?? []).filter((n) => !list.includes(n));
  };
  const judge = (c, reading) => {
    if (GRADERS[c.arm] === undefined) {
      say(false, `the fixture "${String(c.name)}" names ${J(c.arm)}, which is no grader`);
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
  // 2. Every broken reading FAILS exactly the clauses it names.
  for (const c of broken) judge({ ...c, expect: 'fail' }, () => applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
  // 3. Every unreadable reading answers UNREADABLE on exactly the needs it names.
  for (const c of unread) judge({ ...c, expect: 'unreadable' }, () => applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
  // 3b. Every variant of an honest reading that must still pass.
  for (const c of variants) judge({ ...c, expect: c.expect ?? 'pass' }, () => applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
  // 4. Every raw fixture, through THE ONE READER, laid over its grader's honest reading.
  for (const c of raw) judge(c, () => applyOps(overlay(honest[c.arm], derive(rawOf(c))), c.ops ?? []));
  // 5. The one reader's own numbers over the recorded raw, against what the spec step's tables say.
  for (const c of reads) {
    let got;
    try {
      got = derive(rawOf(c));
    } catch (err) {
      say(false, `the reader over ${J(c.runs ?? c.arm)} threw: ${String(err?.message ?? err)}`);
      continue;
    }
    const wrong = Object.entries(c.expect ?? {}).filter(([path, want]) => {
      try {
        const { o, k } = at(got, path);
        return J(o?.[k]) !== J(want);
      } catch {
        return true;
      }
    });
    say(wrong.length === 0, `the reader over ${J(c.runs ?? c.arm)} (${c.name}) reads ${String(Object.keys(c.expect ?? {}).length)} values as recorded${wrong.length === 0 ? '' : `: wrong ${J(wrong.map(([p, w]) => ({ path: p, want: w, got: (() => { try { const { o, k } = at(got, p); return o?.[k]; } catch { return undefined; } })() })))}`}`);
  }
  // 6. The host's words: templates read from a host-shaped source, each category as written down, and lines classified.
  for (const c of hostCases) {
    const templates = hostLineTemplates(c.source);
    const cats = templates.map((t) => t.category);
    say(J(cats) === J(c.categories), `host.ts's lines (${c.name}) read as ${J(cats)}${J(cats) === J(c.categories) ? '' : `, not ${J(c.categories)}`}`);
    for (const [line, want] of c.lines ?? []) {
      const got = hostLineOf(line, templates);
      say(got === want, `the line ${J(line.slice(0, 80))} is ${J(want)}${got === want ? '' : `, read as ${J(got)}`}`);
    }
  }
  // 7. The dump reader, over a minidump built in memory (no dump is ever kept).
  {
    const s = syntheticMinidump();
    const d = parseMinidump(s.buf, { watcherSymbols: s.watcherSymbols, efSymbols: s.efSymbols });
    say(d.kind === s.expect.kind && d.firstModule === s.expect.firstModule, `the dump reader names the process ${J(d.kind)} from its first module ${J(d.firstModule)} and its threads`);
    say(d.exception?.signal === s.expect.signal, `the dump reader reads the signal ${J(d.exception?.signal)} out of EXC_CRASH's parameter`);
    say(d.thread?.name === s.expect.threadName, `the dump reader names the faulting thread ${J(d.thread?.name)}`);
    say(J(d.frames) === J(s.expect.frames), `the dump reader walks the faulting thread's frames ${J(d.frames)}`);
    say(J(d.inWatcher.map((t) => t.id)) === J(s.expect.inWatcher), `the dump reader finds the threads inside watcher.node ${J(d.inWatcher.map((t) => t.id))}`);
    say(faultOf(d).name === s.expect.fault, `the fault is named ${J(faultOf(d).name)}`);
    const plain = parseMinidump(s.buf, { watcherSymbols: s.watcherSymbols });
    say(J(plain.frames) === J(s.expect.framesWithoutEf) && faultOf(plain).name === s.expect.faultWithoutEf, `without Electron's symbols the frames read ${J(plain.frames)} and the fault ${J(faultOf(plain).name)}`);
    let refused = false;
    try {
      parseMinidump(Buffer.from('not a dump at all, not even close'));
    } catch {
      refused = true;
    }
    say(refused, 'the dump reader refuses a buffer that is not a minidump');
  }
  // 8. A MISSING READING IS NEVER A PASS: every field a grader reads, deleted alone, answers UNREADABLE naming it.
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
  // 9. Every clause shown red alone, and every need shown unreadable alone.
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
  // 9a. The probe review: the storm app sees watcher.node loaded in main by any path, not only require().
  say(/process\.dlopen = function p365Dlopen/.test(stormAppText()) && /nativeWrapped: nativeWrapped && dlopenWrapped/.test(stormAppText()), 'the storm app hooks process.dlopen, so watcher.node loaded in main by a dynamic import() reads as loaded');
  // 9b. The probe review: the storm app numbers every line, or a lost line with no torn trace reads as none.
  say(/outSeq \+= 1;/.test(stormAppText()) && /\{ n: outSeq \}/.test(stormAppText()), 'the storm app numbers every P365 line it writes, so the reader can count a line lost');
  // 10. The constants the gates and the integrator read are named as the spec says.
  for (const [name, value] of Object.entries({ PARENT_SNAPSHOT, SO_EXPECTED_WATCHES })) say(value === { PARENT_SNAPSHOT: 'ce4c77f6', SO_EXPECTED_WATCHES: 52 }[name], `${name} is ${J(value)}`);
  process.stdout.write(
    failures === 0
      ? `[p365] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses each shown red alone, ${String(needs)} needs each shown unreadable alone, ${String(swept)} fields that answer UNREADABLE when missing, ${String(variants.length)} variants, ${String(raw.length)} raw fixtures graded and ${String(reads.length)} read through the one reader, ${String(hostCases.length)} host sources, and the dump reader over a minidump built in memory.\n`
      : `[p365] grader self-test FAIL: ${String(failures)}.\n`
  );
  return failures === 0;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);
// Every grader's reads, needs and clauses by name, as JSON: what a fixture may name. Starts nothing.
if (process.argv.includes('--list-graders')) {
  process.stdout.write(`${J(Object.fromEntries(Object.entries(GRADERS).map(([id, g]) => [id, { title: g.title, reads: g.reads, needs: g.needs.map(([n]) => n), clauses: g.clauses.map(([n]) => n) }])), null, 1)}\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// --preflight
// ---------------------------------------------------------------------------

const PARENT = (process.env['P365_PARENT_CHECKOUT'] ?? '').trim();
const ARMS = (process.env['P365_ARMS'] ?? '').trim() === '' ? [...DEFAULT_ARMS] : String(process.env['P365_ARMS']).split(',').map((x) => x.trim()).filter((x) => x !== '');
const EF_SYMBOLS = (process.env['P365_EF_SYMBOLS'] ?? '').trim();
const HOST_TS = (checkout) => join(checkout, 'src', 'main', 'watcher', 'host.ts');
const WATCHER_NODE = (checkout) => join(checkout, 'node_modules', '@parcel', 'watcher-darwin-arm64', 'watcher.node');
const ESBUILD = (checkout) => join(checkout, 'node_modules', '.bin', 'esbuild');

/** The newest modification time under `dir` of a file `test` accepts, or 0. */
function newestUnder(dir, test) {
  let newest = 0;
  const walk = (here) => {
    let entries = [];
    try {
      entries = readdirSync(here, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(here, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && e.name !== '__tests__') walk(p);
      } else if (test(e.name)) {
        try {
          newest = Math.max(newest, statSync(p).mtimeMs);
        } catch {
          /* gone */
        }
      }
    }
  };
  walk(dir);
  return newest;
}
const textOf = (f) => {
  try {
    return readFileSync(f, 'utf8');
  } catch {
    return '';
  }
};

/**
 * A checkout's commit, read from its own `.git` files (no git process): a
 * detached HEAD's sha, or the sha its ref names (loose or packed). A `.git`
 * file (a linked worktree) is followed to its gitdir and common dir. Null
 * when it cannot be read.
 */
export function checkoutRevision(checkout) {
  try {
    let gitDir = join(checkout, '.git');
    if (statSync(gitDir).isFile()) {
      const m = /^gitdir: (.+)$/m.exec(readFileSync(gitDir, 'utf8'));
      if (m === null) return null;
      gitDir = resolve(checkout, m[1].trim());
    }
    let commonDir = gitDir;
    try {
      commonDir = resolve(gitDir, readFileSync(join(gitDir, 'commondir'), 'utf8').trim());
    } catch {
      /* not a linked worktree */
    }
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
    if (/^[0-9a-f]{40}$/.test(head)) return head;
    const ref = /^ref: (.+)$/.exec(head)?.[1];
    if (ref === undefined) return null;
    for (const dir of [gitDir, commonDir]) {
      try {
        const sha = readFileSync(join(dir, ref), 'utf8').trim();
        if (/^[0-9a-f]{40}$/.test(sha)) return sha;
      } catch {
        /* not loose here */
      }
    }
    const packed = readFileSync(join(commonDir, 'packed-refs'), 'utf8');
    return new RegExp(`^([0-9a-f]{40}) ${escapeRe(ref)}$`, 'm').exec(packed)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** The host's line templates, read from HEAD's own host.ts. */
export function headHostTemplates() {
  return hostLineTemplates(textOf(HOST_TS(ROOT)));
}

/**
 * Each check the run makes before it starts anything, as `{ ok, said, info }`:
 * `said` is the check's own words when it holds and what is wrong when it does
 * not. An `info` check is printed and never refuses the run.
 */
function preflightChecks() {
  const out = [];
  const check = (ok, yes, no, info = false) => out.push({ ok, said: ok ? yes : no, info });
  const unknownArms = ARMS.filter((a) => ARM_SPECS[a] === undefined);
  check(unknownArms.length === 0, `the arms are ${ARMS.join(', ')}`, `P365_ARMS names ${J(unknownArms)}, which are no arms (${Object.keys(ARM_SPECS).join(', ')})`);
  const needsParent = ARMS.some((a) => ARM_SPECS[a]?.builds.includes('parent'));
  const needsApp = ARMS.some((a) => ARM_SPECS[a]?.kind === 'app' || ARM_SPECS[a]?.kind === 'rescue');
  const needsStorm = ARMS.some((a) => ['storm', 'quit', 'kill', 'ordinary'].includes(ARM_SPECS[a]?.kind));
  const storm = (who, checkout) => {
    check(existsSync(ESBUILD(checkout)), `${who} carries its own esbuild`, `${who} has no node_modules/.bin/esbuild, so its sites cannot be bundled by its own esbuild`);
    check(existsSync(WATCHER_NODE(checkout)), `${who} carries the shipped watcher.node`, `${who} has no node_modules/@parcel/watcher-darwin-arm64/watcher.node`);
    check(existsSync(join(checkout, 'node_modules', 'better-sqlite3', 'package.json')), `${who} carries better-sqlite3`, `${who} has no node_modules/better-sqlite3`);
    for (const f of ['src/main/watcher/repo-watcher.ts', 'src/main/config/store.ts', 'src/main/machines/store.ts', 'src/main/manifest/harvest/watch.ts', 'src/main/watcher/teardown.ts', 'src/main/lifecycle.ts']) check(existsSync(join(checkout, f)), `${who}'s ${f} is here`, `${who} has no ${f}`);
  };
  const built = (who, checkout) => {
    const bundle = join(checkout, 'out', 'main', 'index.js');
    check(existsSync(bundle), `${who} is built (RA, RH)`, `${bundle} is missing: build ${who} first (RA and RH launch out/)`);
    if (existsSync(bundle)) {
      const src = Math.max(newestUnder(join(checkout, 'src', 'main'), (n) => n.endsWith('.ts')), newestUnder(join(checkout, 'src', 'shared'), (n) => n.endsWith('.ts')), newestUnder(join(checkout, 'src', 'preload'), (n) => n.endsWith('.ts')));
      check(statSync(bundle).mtimeMs >= src, `${who}'s out/main/index.js is newer than every file under src/main, src/shared and src/preload`, `${who}'s out/main/index.js is older than a file under src/: build it again, or the run measures a tree that is gone`);
    }
    check(existsSync(join(checkout, 'build', 'vendor', 'tmux', 'bin', 'tmux')), `${who} carries its vendored tmux (RA, RH)`, `${who} has no build/vendor/tmux/bin/tmux: copy build/vendor into it with cp -Rc`);
  };
  if (needsParent) {
    if (PARENT === '') check(false, '', `P365_PARENT_CHECKOUT is not set. Every arm but SK runs at the parent first (${PARENT_SNAPSHOT}, a clone with node_modules cloned by cp -Rc)`);
    else {
      const parent = resolve(PARENT);
      const rev = checkoutRevision(parent);
      check(rev !== null && rev.startsWith(PARENT_SNAPSHOT), `the parent ${parent} is ${PARENT_SNAPSHOT}`, `the parent ${parent} is ${rev === null ? 'not a git checkout this reader can read' : rev.slice(0, 12)}, not ${PARENT_SNAPSHOT}`);
      check(!existsSync(HOST_TS(parent)), 'the parent has no watcher host (its sites call @parcel/watcher in main)', 'the parent has src/main/watcher/host.ts, so it is not the parent');
      if (needsStorm) storm('the parent', parent);
      if (needsApp) built('the parent', parent);
    }
  }
  if (needsStorm) storm('HEAD', ROOT);
  const host = textOf(HOST_TS(ROOT));
  check(host !== '', 'HEAD has src/main/watcher/host.ts', 'HEAD has no src/main/watcher/host.ts, so HEAD is not this phase yet');
  for (const name of ['watchFolder', 'watcherProcessObservation', 'WATCHER_RESTART_ERROR', 'WATCH_START_REPLY_MS', 'WATCH_CLOSE_REPLY_MS', 'WATCHER_RESTART_BACKOFF_MS']) check(new RegExp(`export\\s+(async\\s+)?(function|const)\\s+${name}\\b`).test(host), `host.ts exports ${name}`, `host.ts exports no ${name} (SPEC §4.1), so the storm's reading of it will be missing`, !ARMS.includes('SK') && name !== 'watchFolder');
  check(existsSync(join(ROOT, 'src', 'main', 'watcher', 'watcher-process.ts')), 'HEAD has src/main/watcher/watcher-process.ts (bundled beside the storm’s product.js)', 'HEAD has no src/main/watcher/watcher-process.ts');
  const wire = textOf(join(ROOT, 'src', 'main', 'watcher', 'process', 'wire.ts'));
  const absentKinds = WIRE_KINDS.filter((k) => !wire.includes(`'${k}'`) && !wire.includes(`"${k}"`));
  check(wire !== '' && absentKinds.length === 0, `wire.ts names the eight kinds the fork recorder reads (${WIRE_KINDS.join(', ')})`, `wire.ts ${wire === '' ? 'is not there' : `does not name ${J(absentKinds)}`}, so the fork recorder reads a wire HEAD does not speak`);
  const templates = hostLineTemplates(host);
  for (const t of templates) out.push({ ok: true, info: true, said: `host line [${t.category}] ${t.words.slice(0, 120)}` });
  const cats = new Set(templates.map((t) => t.category));
  check(cats.has('restart') && cats.has('bound'), "host.ts's restart line and reply-bound line were read and told apart", `host.ts's lines read as ${J([...cats])}: SK needs one 'restart' and one 'bound' line, so SK will read UNREADABLE`, !ARMS.includes('SK'));
  if (needsApp) built('HEAD', ROOT);
  if (needsApp) check(existsSync(join(ROOT, 'out', 'main', 'watcher-process.js')), 'HEAD built out/main/watcher-process.js', 'HEAD has no out/main/watcher-process.js: npm run build');
  check(existsSync(join(ROOT, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron')), 'the development Electron is here (the storm app runs on it)', 'node_modules/electron/dist/Electron.app is missing');
  for (const f of ['build/electron-run.mjs', 'build/hidden-agents.mjs', 'build/p330/tailscale-standin.mjs', 'build/p332/dns-standin.mjs', 'build/harness-socket.mjs']) check(existsSync(join(ROOT, f)), `${f} is here`, `${f} is missing`);
  for (const f of ['/usr/sbin/lsof', '/usr/bin/nm', '/usr/bin/c++filt', '/usr/bin/git', '/bin/ps']) check(existsSync(f), `${f} is here`, `${f} is missing`);
  if (EF_SYMBOLS !== '') check(existsSync(EF_SYMBOLS), `P365_EF_SYMBOLS names ${EF_SYMBOLS}`, `P365_EF_SYMBOLS names ${EF_SYMBOLS}, which is not there; frames inside the framework will read as offsets`, true);
  else out.push({ ok: true, info: true, said: 'P365_EF_SYMBOLS is not set: frames inside Electron Framework read as offsets, and every clause grades on the watcher.node frames and the exit signal' });
  return out;
}

if (process.argv.includes('--preflight')) {
  const checks = preflightChecks();
  for (const c of checks) process.stdout.write(`[p365] ${c.ok ? (c.info ? 'note   ' : 'ok     ') : c.info ? 'NOTE   ' : 'REFUSED'} ${c.said}\n`);
  const bad = checks.filter((c) => !c.ok && !c.info).length;
  process.stdout.write(bad === 0 ? `[p365] preflight PASS: ${String(checks.filter((c) => !c.info).length)} checks\n` : `[p365] preflight REFUSED: ${String(bad)} of ${String(checks.filter((c) => !c.info).length)} checks\n`);
  process.exit(bad === 0 ? 0 : 2);
}

// `--bundle-check <dir>`: each build's own five sites bundled by its own esbuild into <dir>, as
// the storm arms bundle them (and HEAD's watcher-process.ts beside them). It starts no app and no
// Electron, only each build's esbuild; <dir> must be a scratch folder outside the checkout and the home.
if (process.argv.includes('--bundle-check')) {
  const dir = resolve(String(process.argv[process.argv.indexOf('--bundle-check') + 1] ?? ''));
  const home = userInfo().homedir;
  if (!process.argv[process.argv.indexOf('--bundle-check') + 1] || dir.startsWith(`${ROOT}/`) || dir === ROOT || dir.startsWith(`${home}/`)) {
    process.stdout.write(`[p365] bundle check REFUSED: give a scratch folder outside ${ROOT} and outside the home\n`);
    process.exit(2);
  }
  let bad = 0;
  for (const [build, checkout] of [...(PARENT === '' ? [] : [['parent', resolve(PARENT)]]), ['head', ROOT]]) {
    const base = join(dir, build);
    rmSync(base, { recursive: true, force: true });
    mkdirSync(join(base, 'entry'), { recursive: true });
    const hasHost = existsSync(HOST_TS(checkout));
    const entry = join(base, 'entry', 'product-entry.ts');
    writeFileSync(entry, productEntryFor(checkout, hasHost));
    const product = esbuild(checkout, entry, join(base, 'product.js'), ['electron', '@parcel/watcher', 'better-sqlite3', 'node-pty']);
    const wp = hasHost ? esbuild(checkout, join(checkout, 'src', 'main', 'watcher', 'watcher-process.ts'), join(base, 'watcher-process.js'), ['electron', '@parcel/watcher']) : null;
    const requires = product.ok ? (readFileSync(join(base, 'product.js'), 'utf8').match(/require\("@parcel\/watcher"\)/g) ?? []).length : null;
    const ok = product.ok && (wp === null || wp.ok);
    if (!ok) bad += 1;
    process.stdout.write(`[p365] ${ok ? 'ok     ' : 'FAILED '} ${build}: ${hasHost ? 'its sites with the host' : 'its sites (no host)'}, product.js ${String(product.bytes)} bytes (${String(requires)} require of @parcel/watcher in it)${wp === null ? '' : `, watcher-process.js ${String(wp.bytes)} bytes`}${ok ? '' : `: ${product.said} ${wp?.said ?? ''}`}\n`);
  }
  // The three scratch files the run writes, each read by its own parser before any run needs it.
  const files = join(dir, 'written');
  mkdirSync(files, { recursive: true });
  for (const [name, text] of [
    ['main.js', stormAppText()],
    ['quit-recorder.cjs', recorderText()],
    ['codex', standinCodexFor(join(dir, 'codex-home'))]
  ]) {
    const f = join(files, name);
    writeFileSync(f, text);
    const r = name === 'codex' ? spawnSync('/bin/sh', ['-n', f], { encoding: 'utf8', timeout: 30_000 }) : spawnSync(process.execPath, ['--check', f], { encoding: 'utf8', timeout: 30_000 });
    if (r.status !== 0) bad += 1;
    process.stdout.write(`[p365] ${r.status === 0 ? 'ok     ' : 'FAILED '} ${name} parses${r.status === 0 ? '' : `: ${String(r.stderr ?? '').trim().slice(0, 400)}`}\n`);
  }
  process.exit(bad === 0 ? 0 : 2);
}

// ---------------------------------------------------------------------------
// The run: the refusals, the scratch world
// ---------------------------------------------------------------------------

const TAG = '[p365]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(7)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

// The tokens and sockets a crash dump would carry leave THIS process's environment first, so
// nothing this run starts (an Electron, esbuild, git, lsof) can inherit them (SPEC §0).
const strippedNames = Object.keys(process.env).filter((k) => STRIPPED_ENV.some((re) => re.test(k)));
for (const k of strippedNames) delete process.env[k];
/** The same names as a launch's overlay of `undefined`, so a launch's env cannot put one back. */
const strippedOverlay = () => Object.fromEntries(strippedNames.map((k) => [k, undefined]));

const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '' || !SOCKET.startsWith('gmux-p365')) refuse(`"${SOCKET}" is not a gmux-p365 harness socket. Run \`npm run probe:p365\`, which wraps this file in build/harness-socket.mjs.`);
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profiles.');
const PREFLIGHT = preflightChecks();
{
  const bad = PREFLIGHT.filter((c) => !c.ok && !c.info);
  if (bad.length > 0) refuse(bad.map((c) => c.said).join('; '));
}

const KEEP = (process.env['P365_KEEP'] ?? '') === '1';
const RUNS = Number.parseInt(process.env['P365_RUNS'] ?? '', 10) > 0 ? Number.parseInt(process.env['P365_RUNS'], 10) : DEFAULT_RUNS;
const HEAD_MIN = Number(process.env['P365_STORM_MIN'] ?? '') > 0 ? Number(process.env['P365_STORM_MIN']) : DEFAULT_HEAD_MIN;
const PARENT_MIN = Math.min(HEAD_MIN, PARENT_MAX_MIN);
const PARENT_DIR = PARENT === '' ? null : resolve(PARENT);
const HOST_TEMPLATES = headHostTemplates();

mkdirSync(join(HARNESS_DIR, 'p365'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p365'));
const OUT = (process.env['P365_OUT_DIR'] ?? '').trim() || join(ROOT, 'out', 'p365');
/** The vendored tmux the development app runs, so its client and server agree. */
const TMUX = join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');

const report = { checkout: ROOT, parent: PARENT_DIR, socket: SOCKET, arms: [], readings: {}, printed: { strippedEnv: strippedNames, hostLines: HOST_TEMPLATES.map((t) => ({ category: t.category, words: t.words })) } };
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
    return g;
  }
  report.arms.push({ id, ok: g.ok, failed: g.failed, title: GRADERS[id].title });
  if (!g.ok) failures += 1;
  say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
  return g;
}

// ---------------------------------------------------------------------------
// The bookkeeping: his history, his reports folder, the process table
// ---------------------------------------------------------------------------

let standin = null;
let dns = null;
let watch = null;
const tailscalePreflights = [];
const dnsPreflights = [];
const agentsHeld = [];
const censusFailures = [];
const shims = new Set();
const apps = new Set();
const stormMains = new Map();
const watcherPids = new Map();
const stopped = new Map();

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
/** How long a moved history is waited on, starting nothing, before it is read again (his rule). */
const HISTORY_QUIET_MS = 180_000;
let historyDuring = 'the run starting';
let historySeen = HISTORY_BEFORE;
const historyMoves = [];
function noteHistory() {
  const now = historyStat();
  if (now === historySeen) return;
  historyMoves.push({ at: new Date().toISOString(), from: historySeen, to: now, during: historyDuring });
  historySeen = now;
}

/** His crash reports, by NAME and modification time only, through the account's own home (HOME is scratch here). Null when unread. */
function reportNames() {
  const dir = join(userInfo().homedir, 'Library', 'Logs', 'DiagnosticReports');
  try {
    return readdirSync(dir).map((n) => {
      try {
        return `${n}@${String(Math.floor(statSync(join(dir, n)).mtimeMs))}`;
      } catch {
        return n;
      }
    });
  } catch {
    return null;
  }
}
const REPORTS_BEFORE = reportNames();
/**
 * The reports one launch added: every new name is printed, and the ones a run
 * of this probe could have written (an Electron or a Tortie process, its
 * helpers included) are answered, so another app of his that crashes during a
 * long storm is said and not charged to the build.
 */
function noteReports(label, before) {
  const after = reportNames();
  // Unread is null, never an empty list: [] read as "no report in his folder" (the probe review).
  if (before === null || after === null) return null;
  const fresh = after.filter((n) => !before.includes(n));
  if (fresh.length > 0) (report.printed.reports ??= []).push({ launch: label, names: fresh });
  return fresh.filter((n) => /^(Electron|Tortie)/.test(n));
}

function processTable() {
  const r = spawnSync('/bin/ps', ['-ww', '-ax', '-o', 'pid=,ppid=,command='], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  const rows = new Map();
  for (const line of String(r.stdout ?? '').split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
    if (m !== null) rows.set(Number(m[1]), { pid: Number(m[1]), ppid: Number(m[2]), command: m[3] });
  }
  return rows;
}
/** One pid's command line, read again right before a signal; '' when it is gone. */
const commandOf = (pid) => (Number.isInteger(pid) && pid > 0 ? String(spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim() : '');
const ppidOf = (pid) => (Number.isInteger(pid) && pid > 0 ? Number(String(spawnSync('/bin/ps', ['-p', String(pid), '-o', 'ppid='], { encoding: 'utf8' }).stdout ?? '').trim()) || null : null);
const childrenOf = (pid) => [...processTable().values()].filter((r) => r.ppid === pid);
const rssOf = (pid) => (Number.isInteger(pid) && pid > 0 ? Number(String(spawnSync('/bin/ps', ['-p', String(pid), '-o', 'rss='], { encoding: 'utf8' }).stdout ?? '').trim()) || null : null);
/** lsof's names for one pid (`-F n`); null when it answered nothing. */
function lsofText(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  const r = spawnSync('/usr/sbin/lsof', ['-n', '-P', '-p', String(pid), '-F', 'n'], { encoding: 'utf8', timeout: 30_000, maxBuffer: 64 * 1024 * 1024 });
  const text = String(r.stdout ?? '');
  return text.trim() === '' ? null : text;
}
/**
 * A pid this run may signal: the run's own watcher process, read by ps right
 * before the signal. Its parent is the storm app's main (which this run
 * started) and its command line is a utility process.
 */
function ownWatcher(pid, mainPid) {
  const command = commandOf(pid);
  const ppid = ppidOf(pid);
  return { ok: command !== '' && ppid === mainPid && command.includes('--type=utility'), command, ppid };
}

/** tmux on THIS run's scratch socket only, ever. */
function tmux(...args) {
  if (!SOCKET.startsWith('gmux-p365')) throw new Error('refusing a socket that is not this run');
  const r = spawnSync(TMUX, ['-L', SOCKET, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 20_000 });
  return { status: r.status, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}
function endServer() {
  try {
    tmux('kill-server');
  } catch {
    /* no server, or this run's socket refused: nothing of ours to end */
  }
}

const readText = (f) => {
  try {
    return readFileSync(f, 'utf8');
  } catch {
    return null;
  }
};
const readLines = (f) => (readText(f) ?? '').split('\n').filter((l) => l !== '');
const eventsOf = (f) =>
  readLines(f)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter((o) => o !== null && typeof o === 'object');

// ---------------------------------------------------------------------------
// The storm app and the product entry (scratch files, never under src/)
// ---------------------------------------------------------------------------

/** The storm app's main.js (a function so it is hoisted). String.raw keeps its `\n` escapes; it carries no backtick and no template hole. */
function stormAppText() {
  return String.raw`'use strict';
// Phase 365's storm app (probe:p365, build/p365/SPEC.md §8). SCRATCH ONLY: written by
// build/p365/probe-p365.mjs into one run folder and launched through build/electron-run.mjs with
// program 'app', so its exit signal is the app's own. Ported from the spec step's storm app
// (product mode). It hides its Dock icon and opens no window; Crashpad writes any dump under THIS
// profile, with the system's handler off. Two recorders go in before the bundle loads: the native
// counter (every subscribe and unsubscribe MAIN makes) and the fork recorder (the wire of SPEC
// §4.1 read from main's side). Every [gmux-*] console line is re-said with its time.
const electron = require('electron');
const app = electron.app;
try { if (app.dock) app.dock.hide(); } catch (e) { /* no dock */ }
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const env = process.env;
// Every line carries its number n (1, 2, 3, ...), so a line lost anywhere between here and the
// probe (a write that failed, a chunk of stderr torn into it) is a gap the probe's reader counts.
let outSeq = 0;
function out(kind, data) {
  outSeq += 1;
  try { process.stdout.write('P365 ' + JSON.stringify(Object.assign({ kind: kind, t: Date.now() }, data || {}, { n: outSeq })) + '\n'); } catch (e) { /* closed */ }
}
const profile = app.getPath('userData');
try { app.setPath('crashDumps', path.join(profile, 'Crashpad')); } catch (e) { out('note', { crashDumps: String(e && e.message) }); }
try { electron.crashReporter.start({ uploadToServer: false, ignoreSystemCrashHandler: true }); } catch (e) { out('note', { crashReporter: String(e && e.message) }); }

const SCRATCH = env.P365_SCRATCH || '';
const ROOT = env.P365_ROOT || '';
if (SCRATCH === '' || ROOT.indexOf(SCRATCH + '/') !== 0) { out('refused', { why: 'P365_ROOT is not under this run folder' }); app.exit(2); }
const CFG = {
  scenario: env.P365_SCENARIO || 'storm',
  durationMs: Number(env.P365_DURATION_MS || 60000),
  tickMs: Number(env.P365_TICK_MS || 180),
  slots: Number(env.P365_SLOTS || 12),
  failPct: Number(env.P365_FAIL_PCT || 10),
  delPct: Number(env.P365_DEL_PCT || 30),
  order: env.P365_DEL_ORDER === 'after' ? 'after' : 'before',
  churnMs: Number(env.P365_CHURN_MS || 10),
  quit: env.P365_QUIT || 'drain',
  saturate: env.P365_SATURATE === '1',
  poolJobs: Number(env.P365_POOL_JOBS || 8),
  seed: Number(env.P365_SEED || 1),
  build: env.P365_BUILD || null
};
const TRIGGER = env.P365_TRIGGER || '';
const BUNDLE = path.join(__dirname, 'product.js');

let s32 = CFG.seed >>> 0;
function rand() { s32 = (s32 + 0x6d2b79f5) >>> 0; let t = s32; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function pick(n) { return Math.floor(rand() * n); }
function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch (e) { return false; } }

for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  const real = console[level].bind(console);
  console[level] = function p365Console(first) {
    try { if (typeof first === 'string' && first.indexOf('[gmux-') === 0) out('log', { level: level, line: first.slice(0, 400) }); } catch (e) { /* never break the app */ }
    return real.apply(null, arguments);
  };
}

// THE NATIVE COUNTER.
const native = { loaded: false, dlopened: 0, subscribe: 0, subscribeOk: 0, unsubscribe: 0, inFlight: 0, maxInFlight: 0, failed: 0, peakPerSecond: 0, thisSecond: 0 };
setInterval(function () { native.peakPerSecond = Math.max(native.peakPerSecond, native.thisSecond); native.thisSecond = 0; }, 1000).unref();
function track(p, onOk) {
  native.inFlight += 1; native.maxInFlight = Math.max(native.maxInFlight, native.inFlight); native.thisSecond += 1;
  return Promise.resolve(p).then(function (v) { native.inFlight -= 1; if (onOk) onOk(); return v; }, function (e) { native.inFlight -= 1; native.failed += 1; throw e; });
}
const realLoad = Module._load;
let wrappedWatcher = null;
let forkSubstitute = null;
Module._load = function p365Load(request, parent) {
  const mod = realLoad.apply(this, arguments);
  if (request === 'electron' && forkSubstitute !== null && parent && parent.filename === BUNDLE) return forkSubstitute(mod);
  if (request !== '@parcel/watcher') return mod;
  native.loaded = true;
  if (wrappedWatcher === null) {
    wrappedWatcher = Object.assign({}, mod, {
      subscribe: function (dir, fn, opts) {
        native.subscribe += 1;
        return track(mod.subscribe(dir, fn, opts), function () { native.subscribeOk += 1; }).then(function (sub) {
          return { unsubscribe: function () { native.unsubscribe += 1; return track(sub.unsubscribe()); } };
        });
      }
    });
    wrappedWatcher.default = wrappedWatcher;
  }
  return wrappedWatcher;
};
const nativeWrapped = Module._load !== realLoad;
// Any load of watcher.node into MAIN, by any path: HEAD's in-process branch reaches the package by a
// dynamic import(), which the ESM loader resolves without asking Module._load for '@parcel/watcher',
// so the counter above would read 0 for a main that loaded and ran it. Every .node file is opened
// through process.dlopen, whatever asked for it.
const realDlopen = process.dlopen;
process.dlopen = function p365Dlopen(mod, filename) {
  try { if (typeof filename === 'string' && /(^|[\/\\])watcher\.node$/.test(filename)) { native.loaded = true; native.dlopened += 1; } } catch (e) { /* never break the app */ }
  return realDlopen.apply(this, arguments);
};
const dlopenWrapped = process.dlopen !== realDlopen;

// THE FORK RECORDER.
const ledger = { gens: [], current: null, posted: { watch: 0, close: 0, other: 0 }, received: { ready: 0, watching: 0, watchingNull: 0, refused: 0, closed: 0, events: 0, eventErrors: 0, note: 0, other: 0 }, startedWatches: 0, exits: 0, crashes: 0, quitting: false };
const hostInfo = { bounds: null, observe: null };
function observe() { try { return hostInfo.observe ? hostInfo.observe() : null; } catch (e) { return { error: String(e && e.message) }; } }
function obsLive() { const o = observe(); return o && typeof o.live === 'number' ? o.live : null; }
function boundOf(kind) { const b = hostInfo.bounds; if (!b) return null; const v = kind === 'close' ? b.close : b.start; return typeof v === 'number' ? v : null; }
function pendingInfo(g) {
  let count = 0; let oldestAt = null; let oldestKind = null; let deadlineAt = null;
  g.pending.forEach(function (p) {
    count += 1;
    if (oldestAt === null || p.at < oldestAt) { oldestAt = p.at; oldestKind = p.kind; }
    const b = boundOf(p.kind);
    if (b !== null && (deadlineAt === null || p.at + b < deadlineAt)) deadlineAt = p.at + b;
  });
  return { count: count, oldestAt: oldestAt, oldestKind: oldestKind, deadlineAt: deadlineAt };
}
const pausedBy = new Set();
const control = { paused: function () { return pausedBy.size > 0; }, snapshot: null, busy: null, restartError: null };
let rebind = null;
function finishRebind(timedOut) {
  if (rebind === null) return;
  const r = rebind; rebind = null; clearTimeout(r.timer);
  const g = r.gen === null ? null : ledger.gens[r.gen - 1];
  const end = r.lastAt === null ? Date.now() : r.lastAt;
  out('child', { event: 'rebound', gen: r.gen, fromGen: r.fromGen, watches: r.watches, obsLive: r.obsLive, asked: r.asked, ok: r.answered, nulls: r.nulls, timedOut: timedOut, sinceExit: end - r.exitAt, sinceFork: g ? end - g.forkedAt : null, sinceReady: g && g.readyAt ? end - g.readyAt : null });
  pausedBy.delete('rebind');
}
function armRebind(g, liveDirs, live) {
  if (rebind !== null) finishRebind(true);
  const need = new Map();
  liveDirs.forEach(function (d) { need.set(d, (need.get(d) || 0) + 1); });
  rebind = { fromGen: g.gen, exitAt: Date.now(), watches: liveDirs.length, obsLive: live, need: need, asked: 0, answered: 0, nulls: 0, reqs: new Set(), gen: null, lastAt: null, timer: null };
  rebind.timer = setTimeout(function () { finishRebind(true); }, 35000);
  pausedBy.add('rebind');
}
function maybeFinish() { if (rebind !== null && rebind.gen !== null && rebind.asked >= rebind.watches && rebind.answered >= rebind.asked) finishRebind(false); }
function notePosted(g, msg) {
  const now = Date.now();
  if (msg && msg.kind === 'watch') {
    ledger.posted.watch += 1;
    g.reqDir.set(msg.req, msg.dir);
    g.pending.set(msg.req, { kind: 'watch', at: now });
    if (rebind !== null && g.gen > rebind.fromGen) {
      rebind.gen = g.gen;
      const c = rebind.need.get(msg.dir) || 0;
      if (c > 0) { rebind.need.set(msg.dir, c - 1); rebind.asked += 1; rebind.reqs.add(msg.req); }
    }
  } else if (msg && msg.kind === 'close') {
    ledger.posted.close += 1;
    g.pending.set(msg.req, { kind: 'close', at: now });
    g.live.delete(msg.sub);
  } else ledger.posted.other += 1;
}
function noteReceived(g, m) {
  const kind = m && m.kind;
  if (kind === 'ready') {
    g.readyAt = Date.now(); ledger.received.ready += 1;
    out('child', { event: 'ready', gen: g.gen, ms: g.readyAt - g.forkedAt, pid: g.pid });
    if (rebind !== null && g.gen > rebind.fromGen) { rebind.gen = g.gen; if (rebind.watches === 0) finishRebind(false); }
    return;
  }
  if (kind === 'watching' || kind === 'refused') {
    g.pending.delete(m.req);
    if (kind === 'refused') ledger.received.refused += 1;
    else if (m.sub === null) ledger.received.watchingNull += 1;
    else { ledger.received.watching += 1; ledger.startedWatches += 1; g.live.set(m.sub, g.reqDir.get(m.req)); }
    if (rebind !== null && rebind.gen === g.gen && rebind.reqs.has(m.req)) { rebind.reqs.delete(m.req); rebind.answered += 1; if (kind !== 'watching' || m.sub === null) rebind.nulls += 1; rebind.lastAt = Date.now(); maybeFinish(); }
    g.reqDir.delete(m.req);
    return;
  }
  if (kind === 'closed') { g.pending.delete(m.req); ledger.received.closed += 1; return; }
  if (kind === 'events') { ledger.received.events += 1; if (m.error) ledger.received.eventErrors += 1; return; }
  if (kind === 'note') { ledger.received.note += 1; out('child', { event: 'note', gen: g.gen, what: m.what, op: m.op, waitedMs: m.waitedMs, behind: m.behind }); return; }
  ledger.received.other += 1;
}
function noteExit(g, code) {
  g.exited = true; g.exitAt = Date.now(); ledger.exits += 1;
  const replaced = ledger.current !== g;
  const unexpected = code !== 0 && !ledger.quitting;
  if (unexpected && !replaced) ledger.crashes += 1;
  const liveDirs = Array.from(g.live.values());
  const live = obsLive();
  out('child', { event: 'exit', gen: g.gen, code: code, after: g.exitAt - g.forkedAt, live: liveDirs.length, obsLive: live, pending: pendingInfo(g), unexpected: unexpected, replaced: replaced, quitting: ledger.quitting });
  if (unexpected && !replaced) armRebind(g, liveDirs, live);
}
function wrapFork(realFork, owner) {
  return function p365Fork(modulePath, args, options) {
    const prev = ledger.current;
    const forkedAt = Date.now();
    const child = realFork.call(owner, modulePath, args, options);
    const g = { gen: ledger.gens.length + 1, forkedAt: forkedAt, pid: null, readyAt: null, exited: false, exitAt: null, pending: new Map(), live: new Map(), reqDir: new Map() };
    ledger.gens.push(g); ledger.current = g;
    const prevAlive = prev !== null && !prev.exited;
    const o = options || {};
    out('child', { event: 'fork', gen: g.gen, script: path.basename(String(modulePath)), stdio: typeof o.stdio === 'string' ? o.stdio : JSON.stringify(o.stdio === undefined ? null : o.stdio), envKeys: Object.keys(o.env || {}).sort(), serviceName: o.serviceName === undefined ? null : o.serviceName, prevGen: prev ? prev.gen : null, prevAlive: prevAlive, prevPending: prev ? pendingInfo(prev) : null });
    if (prevAlive && !ledger.quitting) armRebind(prev, Array.from(prev.live.values()), obsLive());
    try {
      const realPost = child.postMessage.bind(child);
      child.postMessage = function p365Post(msg) { try { notePosted(g, msg); } catch (e) { /* never break the host */ } return realPost.apply(null, arguments); };
    } catch (e) { out('note', { postWrap: String(e && e.message) }); }
    child.on('spawn', function () { g.pid = child.pid; out('child', { event: 'spawn', gen: g.gen, ms: Date.now() - forkedAt, pid: child.pid }); });
    child.on('message', function (m) { try { noteReceived(g, m); } catch (e) { /* never break the host */ } });
    child.on('exit', function (code) { try { noteExit(g, code); } catch (e) { /* never break the host */ } });
    return child;
  };
}
let forkWrap = false;
try {
  const up = electron.utilityProcess;
  const wrapped = wrapFork(up.fork, up);
  try { up.fork = wrapped; } catch (e) { /* not writable */ }
  if (up.fork === wrapped) forkWrap = 'direct';
  else {
    try { Object.defineProperty(up, 'fork', { value: wrapped, writable: true, configurable: true }); } catch (e) { /* not configurable */ }
    if (up.fork === wrapped) forkWrap = 'define';
    else {
      forkSubstitute = function (mod) { return Object.create(mod, { utilityProcess: { value: Object.assign({}, up, { fork: wrapped }), enumerable: true } }); };
      forkWrap = 'module';
    }
  }
} catch (e) { out('note', { forkWrap: String(e && e.message) }); }

// THE PROBE'S TRIGGER: pause the storm (its asks settle first) and resume it.
let seen = 0;
function quiesce(seq) {
  const startedAt = Date.now(); let quietSince = null;
  const timer = setInterval(function () {
    const g = ledger.current;
    const busy = (g !== null && !g.exited && g.pending.size > 0) || native.inFlight > 0 || (control.busy ? control.busy() : 0) > 0 || rebind !== null;
    const now = Date.now();
    if (!busy) { if (quietSince === null) quietSince = now; } else quietSince = null;
    const quiet = quietSince !== null && now - quietSince >= 300;
    if (quiet || now - startedAt > 8000) {
      clearInterval(timer);
      out('paused', { seq: seq, quiet: quiet, waitedMs: now - startedAt, gen: g ? g.gen : null, pid: g ? g.pid : null, live: g ? g.live.size : null, pending: g ? g.pending.size : null, projects: control.snapshot ? control.snapshot() : null, obs: observe() });
    }
  }, 20);
}
if (TRIGGER !== '') {
  setInterval(function () {
    let req = null;
    try { req = JSON.parse(fs.readFileSync(TRIGGER, 'utf8')); } catch (e) { return; }
    if (!req || typeof req.seq !== 'number' || req.seq <= seen) return;
    seen = req.seq;
    if (req.action === 'pause') { pausedBy.add('trigger'); quiesce(req.seq); return; }
    if (req.action === 'resume') { out('rescan', { seq: req.seq, projects: control.snapshot ? control.snapshot() : null, obs: observe() }); pausedBy.delete('trigger'); out('resumed', { seq: req.seq }); }
  }, 50);
}

app.on('window-all-closed', function () { /* no windows, ever */ });
app.on('before-quit', function () { ledger.quitting = true; });
process.on('exit', function (code) { out('exit', { code: code }); });
app.whenReady().then(async function () {
  try { if (app.dock) app.dock.hide(); } catch (e) { /* no dock */ }
  const t0 = Date.now();
  let product = null;
  try { product = require(BUNDLE); } catch (e) { out('refused', { why: 'the bundle did not load: ' + String((e && e.stack) || e).slice(0, 600) }); app.exit(3); return; }
  const host = product.host || null;
  hostInfo.bounds = host ? host.bounds : null;
  hostInfo.observe = host && typeof host.observe === 'function' ? host.observe : null;
  control.restartError = host ? host.restartError : null;
  out('loaded', { ms: Date.now() - t0, build: CFG.build, host: host !== null, observation: hostInfo.observe !== null, nativeWrapped: nativeWrapped && dlopenWrapped, nativeLoadedAtLoad: native.loaded, forkWrapped: forkWrap !== false, forkWrap: forkWrap, bounds: hostInfo.bounds, restartError: control.restartError, scenario: CFG.scenario, order: CFG.order, electron: process.versions.electron, pid: process.pid });
  try {
    await product.run({ out: out, pick: pick, isDir: isDir, ROOT: ROOT, cfg: CFG, app: app, control: control, native: native, ledger: ledger, observe: observe, quitting: function () { ledger.quitting = true; }, started: function () { return host !== null ? ledger.startedWatches : native.subscribeOk; }, forkReadyMs: function () { const g = ledger.gens[0]; return g && g.readyAt ? g.readyAt - g.forkedAt : null; } });
  } catch (e) { out('refused', { why: 'the scenario threw: ' + String((e && e.stack) || e).slice(0, 600) }); app.exit(4); }
});
`;
}

/**
 * The product entry, bundled per build by that build's esbuild (a function so
 * it is hoisted). Each quoted `@@NAME@@` becomes the absolute path of that
 * build's own module, and `@@HOST_IMPORT@@` imports HEAD's host (or says there
 * is none at the parent).
 */
function productEntryTemplate() {
  return String.raw`// Phase 365's product entry (probe:p365, build/p365/SPEC.md §8). SCRATCH ONLY: written per build
// into a run folder by build/p365/probe-p365.mjs and bundled by THAT build's esbuild from THAT
// build's src/main. Nothing here is a copy of product logic: the five sites are the build's own
// modules (RepoWatcher's worktree and dotgit watches, the agents.json and machines.json watches,
// the harvest's rescue watch). Ported from the spec step's product-entry.ts.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pbkdf2 } from 'node:crypto';
import { join } from 'node:path';
import { RepoWatcher } from "@@REPO_WATCHER@@";
import { watchForSessionId } from "@@HARVEST_WATCH@@";
import { initAgentOverlay, stopAgentOverlayWatch } from "@@CONFIG_STORE@@";
import { initMachines, stopMachinesWatch } from "@@MACHINES_STORE@@";
import { drainWatcherCloses, pendingWatcherCloseCount } from "@@TEARDOWN@@";
import { markAppQuitting } from "@@LIFECYCLE@@";
@@HOST_IMPORT@@

const EXPECTED = @@EXPECTED@@;
const GIT = '/usr/bin/git';

export const host: any = HOST === null ? null : {
  observe: typeof HOST.watcherProcessObservation === 'function' ? HOST.watcherProcessObservation : null,
  restartError: typeof HOST.WATCHER_RESTART_ERROR === 'string' ? HOST.WATCHER_RESTART_ERROR : null,
  bounds: {
    start: typeof HOST.WATCH_START_REPLY_MS === 'number' ? HOST.WATCH_START_REPLY_MS : null,
    close: typeof HOST.WATCH_CLOSE_REPLY_MS === 'number' ? HOST.WATCH_CLOSE_REPLY_MS : null,
    backoff: Array.isArray(HOST.WATCHER_RESTART_BACKOFF_MS) ? HOST.WATCHER_RESTART_BACKOFF_MS.slice() : null,
    giveUpExits: typeof HOST.WATCHER_GIVE_UP_EXITS === 'number' ? HOST.WATCHER_GIVE_UP_EXITS : null,
    giveUpWindowMs: typeof HOST.WATCHER_GIVE_UP_WINDOW_MS === 'number' ? HOST.WATCHER_GIVE_UP_WINDOW_MS : null
  }
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const gitEnv = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' };
function git(args: string[]): void { execFileSync(GIT, args, { env: gitEnv, stdio: 'ignore' }); }

function counters(ctx: any): any {
  const n = ctx.native;
  const L = ctx.ledger;
  const g = L.current;
  return {
    native: { loaded: n.loaded, dlopened: n.dlopened, subscribe: n.subscribe, subscribeOk: n.subscribeOk, unsubscribe: n.unsubscribe, inFlight: n.inFlight, maxInFlight: n.maxInFlight, failed: n.failed },
    ipc: { watch: L.posted.watch, close: L.posted.close, watching: L.received.watching, watchingNull: L.received.watchingNull, refused: L.received.refused, closed: L.received.closed, events: L.received.events, eventErrors: L.received.eventErrors, notes: L.received.note, gens: L.gens.length, pid: g ? g.pid : null, pending: g ? g.pending.size : 0, started: L.startedWatches, crashes: L.crashes },
    obs: ctx.observe()
  };
}

/**
 * ORDINARY USE through the build's sites, counted (SPEC §2.3, ord1): a boot with 20 projects, the
 * two configuration watches and 5 rescue watches; 20 s of edits; 10 projects closed; a branch
 * switched in 5; the rescues settled; then the quit in Tortie's order (marked quitting first, then
 * the disposer's closes and its 2 s drain).
 */
async function ordinary(ctx: any): Promise<void> {
  const { out, ROOT, app } = ctx;
  const template = join(ROOT, 'template');
  mkdirSync(template, { recursive: true });
  git(['init', '-q', template]);
  writeFileSync(join(template, 'README.md'), 'ordinary\n');
  const repos: string[] = [];
  for (let i = 0; i < 20; i++) {
    const dir = join(ROOT, 'project-' + String(i).padStart(2, '0'));
    cpSync(template, dir, { recursive: true });
    git(['-C', dir, '-c', 'user.email=p@x', '-c', 'user.name=p', 'commit', '-q', '--allow-empty', '-m', 'one']);
    repos.push(dir);
  }
  const codexHome = join(ROOT, 'codex-home');
  mkdirSync(join(codexHome, 'sessions'), { recursive: true });
  mkdirSync(join(codexHome, 'archived_sessions'), { recursive: true });
  const phase = (name: string, extra: Record<string, unknown> = {}): void => {
    const c = counters(ctx);
    out('ordinary', { phase: name, subscribe: c.native.subscribe, unsubscribe: c.native.unsubscribe, maxInFlight: c.native.maxInFlight, failed: c.native.failed, nativeLoaded: c.native.loaded, ipc: c.ipc, obs: c.obs, ...extra });
  };
  out('start', { mode: 'product', scenario: 'ordinary', pid: process.pid });
  let changes = 0;
  const t0 = Date.now();
  await initAgentOverlay();
  await initMachines();
  const watchers = await Promise.all(repos.map((d) => RepoWatcher.watch(d, { onChange: () => { changes += 1; } })));
  const harvests: any[] = [];
  for (let i = 0; i < 5; i++) {
    const w: any = (watchForSessionId as any)('codex', { cwd: repos[i], sinceTs: Date.now() }, { home: join(ROOT, 'home'), env: { CODEX_HOME: codexHome }, timeoutMs: 600000, claimant: 'ordinary-' + String(i) });
    w.promise.catch(() => undefined);
    harvests.push(w);
  }
  let reachedAt: number | null = null;
  const until = Date.now() + 20000;
  while (Date.now() < until) {
    if (ctx.started() >= EXPECTED && ctx.native.inFlight === 0) { reachedAt = Date.now(); break; }
    await sleep(2);
  }
  phase('boot', { bootMs: (reachedAt === null ? Date.now() : reachedAt) - t0, started: ctx.started(), expected: EXPECTED, reached: reachedAt !== null, forkMs: ctx.forkReadyMs() });
  for (let s = 0; s < 20; s++) {
    writeFileSync(join(repos[s % 20], 'edit-' + String(s) + '.txt'), String(s));
    await sleep(1000);
  }
  phase('quiet', { onChange: changes });
  const t1 = Date.now();
  await Promise.all(watchers.slice(0, 10).map((w: any) => w.dispose()));
  phase('close10', { closeMs: Date.now() - t1 });
  for (let i = 10; i < 15; i++) git(['-C', repos[i], 'checkout', '-q', '-b', 'b' + String(i)]);
  await sleep(2000);
  phase('branch5', { onChange: changes });
  for (const h of harvests) h.cancel();
  await sleep(500);
  phase('rescues-settled');
  ctx.quitting();
  markAppQuitting();
  const tq = Date.now();
  await Promise.allSettled([(async () => { for (const w of watchers.slice(10)) await (w as any).dispose(); })(), stopAgentOverlayWatch(), stopMachinesWatch()]);
  const left = await drainWatcherCloses(2000);
  phase('quit', { quitDrainMs: Date.now() - tq, left, peakPerSecond: ctx.native.peakPerSecond });
  app.quit();
}

/**
 * THE PRODUCT STORM (SPEC §2): every tick a project watch started (10% with its folder removed while
 * it reads its ignored roots), one closed (30% with its folder removed, before the drop or after it
 * in the same turn), and a codex rescue armed or cancelled, beside the two configuration watches
 * held for the run; churn every 10 ms. SQ's quit (cfg.quit 'mid') marks the app quitting, holds
 * main's pool with pbkdf2 jobs, drops every watch without waiting and quits at once.
 */
async function storm(ctx: any): Promise<void> {
  const { out, pick, ROOT, cfg, app, isDir, control } = ctx;
  const stats: any = { watchIssued: 0, watchOk: 0, watchFail: 0, disposeIssued: 0, disposeOk: 0, harvestArmed: 0, harvestCancelled: 0, onChange: 0, repoRemoved: 0, churnOps: 0, errors: 0, restartErrors: 0 };
  const template = join(ROOT, 'template');
  mkdirSync(template, { recursive: true });
  git(['init', '-q', template]);
  writeFileSync(join(template, 'README.md'), 'storm\n');
  writeFileSync(join(template, '.gitignore'), 'build/\nnode_modules/\n');
  const restore = (dir: string): void => { try { cpSync(template, dir, { recursive: true }); } catch { /* raced */ } };
  const slots: any[] = [];
  for (let i = 0; i < cfg.slots; i++) {
    const dir = join(ROOT, 'repo-' + String(i));
    restore(dir);
    slots.push({ i, dir, rw: null, starting: false, rec: null });
  }
  const codexHome = join(ROOT, 'codex-home');
  mkdirSync(join(codexHome, 'sessions'), { recursive: true });
  mkdirSync(join(codexHome, 'archived_sessions'), { recursive: true });
  const harvests: any[] = [];
  let claimant = 0;
  let disposing = 0;
  await initAgentOverlay();
  await initMachines();
  out('product-start', { pending: pendingWatcherCloseCount() });
  control.snapshot = () => slots.filter((s) => s.rw !== null).map((s) => {
    const rw: any = s.rw;
    const known = rw !== null && 'worktreeSub' in rw && 'dotgitSub' in rw;
    return { slot: s.i, known, subs: known ? (rw.worktreeSub ? 1 : 0) + (rw.dotgitSub ? 1 : 0) : null, restartErrors: s.rec ? s.rec.restartErrors : null, otherErrors: s.rec ? s.rec.otherErrors : null };
  });
  control.busy = () => slots.filter((s) => s.starting).length + disposing;
  const onChange = (): void => { stats.onChange += 1; };
  const openOp = (): void => {
    const free = slots.filter((s) => s.rw === null && !s.starting);
    if (free.length === 0) return;
    const s = free[pick(free.length)];
    if (!isDir(s.dir)) restore(s.dir);
    s.starting = true;
    stats.watchIssued += 1;
    const rec = { restartErrors: 0, otherErrors: 0 };
    const p = RepoWatcher.watch(s.dir, {
      onChange,
      onError: (err: Error) => {
        stats.errors += 1;
        if (control.restartError !== null && err && err.message === control.restartError) { rec.restartErrors += 1; stats.restartErrors += 1; }
        else rec.otherErrors += 1;
      }
    });
    if (pick(100) < cfg.failPct) { try { rmSync(s.dir, { recursive: true, force: true }); stats.repoRemoved += 1; } catch { /* gone */ } }
    p.then((rw: any) => { s.starting = false; stats.watchOk += 1; s.rw = rw; s.rec = rec; }, () => { s.starting = false; stats.watchFail += 1; });
  };
  const closeOp = (): void => {
    const open = slots.filter((s) => s.rw !== null);
    if (open.length === 0) return;
    const s = open[pick(open.length)];
    const rw: any = s.rw;
    s.rw = null;
    s.rec = null;
    const del = pick(100) < cfg.delPct;
    const rm = (): void => { try { rmSync(s.dir, { recursive: true, force: true }); stats.repoRemoved += 1; } catch { /* gone */ } };
    if (del && cfg.order === 'before') rm();
    stats.disposeIssued += 1;
    disposing += 1;
    void rw.dispose().then(() => { stats.disposeOk += 1; }, () => undefined).finally(() => { disposing -= 1; });
    if (del && cfg.order === 'after') rm();
  };
  const harvestOp = (): void => {
    if (harvests.length > 0 && pick(2) === 0) {
      const h = harvests.splice(pick(harvests.length), 1)[0];
      h.cancel();
      stats.harvestCancelled += 1;
      return;
    }
    claimant += 1;
    const w: any = (watchForSessionId as any)('codex', { cwd: ROOT, sinceTs: Date.now() }, { home: join(ROOT, 'home'), env: { CODEX_HOME: codexHome }, timeoutMs: 120000, pollIntervalMs: 2000, claimant: 'storm-' + String(claimant) });
    w.promise.catch(() => undefined);
    harvests.push(w);
    stats.harvestArmed += 1;
  };
  const churnOp = (): void => {
    const s = slots[pick(slots.length)];
    if (!isDir(s.dir)) return;
    stats.churnOps += 1;
    const r = pick(100);
    try {
      if (r < 40) writeFileSync(join(s.dir, 'f' + String(pick(50)) + '.txt'), String(Date.now()));
      else if (r < 65) { const d = join(s.dir, 'd' + String(pick(8)), 'e' + String(pick(4))); mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'g.txt'), 'x'); }
      else if (r < 85) rmSync(join(s.dir, 'd' + String(pick(8))), { recursive: true, force: true });
      else writeFileSync(join(codexHome, 'sessions', 'r' + String(pick(20)) + '.jsonl'), '{}\n');
    } catch { /* raced */ }
  };
  const started = Date.now();
  out('start', { mode: 'product', scenario: cfg.scenario, durationMs: cfg.durationMs, tickMs: cfg.tickMs, slots: cfg.slots, failPct: cfg.failPct, delPct: cfg.delPct, order: cfg.order, churnMs: cfg.churnMs, quit: cfg.quit, pid: process.pid });
  const tick = setInterval(() => { if (control.paused()) return; openOp(); closeOp(); harvestOp(); }, cfg.tickMs);
  const churn = setInterval(churnOp, cfg.churnMs);
  const report = setInterval(() => { out('stats', { elapsed: Date.now() - started, open: slots.filter((s) => s.rw !== null).length, harvests: harvests.length, pending: pendingWatcherCloseCount(), paused: control.paused(), ...stats, ...counters(ctx) }); }, 1000);
  await sleep(cfg.durationMs);
  clearInterval(tick);
  clearInterval(churn);
  const dropAll = (): void => {
    for (const s of slots) if (s.rw !== null) { const rw: any = s.rw; s.rw = null; void rw.dispose(); }
    for (const h of harvests.splice(0)) h.cancel();
    void stopAgentOverlayWatch();
    void stopMachinesWatch();
  };
  if (cfg.quit === 'mid') {
    ctx.quitting();
    markAppQuitting();
    if (cfg.saturate) for (let i = 0; i < cfg.poolJobs; i++) pbkdf2('x', 'y', 2000000, 64, 'sha512', () => undefined);
    dropAll();
    clearInterval(report);
    out('quitting', { how: 'mid', marked: true, saturated: cfg.saturate, elapsed: Date.now() - started, pending: pendingWatcherCloseCount(), ...stats, ...counters(ctx) });
    app.quit();
    return;
  }
  dropAll();
  const tq = Date.now();
  const left = await drainWatcherCloses(15000);
  clearInterval(report);
  out('quitting', { how: 'drain', drainMs: Date.now() - tq, left, elapsed: Date.now() - started, ...stats, ...counters(ctx) });
  ctx.quitting();
  app.quit();
}

export async function run(ctx: any): Promise<void> {
  if (ctx.cfg.scenario === 'ordinary') {
    await ordinary(ctx);
    return;
  }
  await storm(ctx);
}
`;
}

/** The product entry for one build, its imports pointed at that build's own src/main. */
export function productEntryFor(checkout, hasHost) {
  const at = (rel) => J(join(checkout, 'src', 'main', rel));
  const host = hasHost ? `import * as HOST_MODULE from ${at('watcher/host.ts')};\nconst HOST: any = HOST_MODULE;` : 'const HOST: any = null;';
  return productEntryTemplate()
    .replace('"@@REPO_WATCHER@@"', at('watcher/repo-watcher.ts'))
    .replace('"@@HARVEST_WATCH@@"', at('manifest/harvest/watch.ts'))
    .replace('"@@CONFIG_STORE@@"', at('config/store.ts'))
    .replace('"@@MACHINES_STORE@@"', at('machines/store.ts'))
    .replace('"@@TEARDOWN@@"', at('watcher/teardown.ts'))
    .replace('"@@LIFECYCLE@@"', at('lifecycle.ts'))
    .replace('@@HOST_IMPORT@@', host)
    .replace('@@EXPECTED@@', String(SO_EXPECTED_WATCHES));
}

/** One storm run's folders. */
function stormPaths(label) {
  const base = join(RUN, label);
  return { base, app: join(base, 'app'), entry: join(base, 'entry', 'product-entry.ts'), root: join(base, 'root'), profile: join(base, 'profile'), home: join(base, 'home'), trigger: join(base, 'trigger.json'), crashpad: join(base, 'profile', 'Crashpad') };
}

/**
 * esbuild of `checkout`, synchronously; `{ ok, said, bytes }`. The build's own
 * tsconfig.node.json is handed over because it is where main's `@shared/*`
 * alias is declared (the root tsconfig.json only references the others, and
 * esbuild does not follow references).
 */
function esbuild(checkout, entry, outfile, externals) {
  const tsconfig = join(checkout, 'tsconfig.node.json');
  const r = spawnSync(ESBUILD(checkout), [entry, '--bundle', '--platform=node', '--format=cjs', '--target=node22', '--log-level=error', `--outfile=${outfile}`, ...(existsSync(tsconfig) ? [`--tsconfig=${tsconfig}`] : []), ...externals.map((x) => `--external:${x}`)], { cwd: checkout, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  let bytes = null;
  try {
    bytes = statSync(outfile).size;
  } catch {
    bytes = null;
  }
  return { ok: r.status === 0 && bytes !== null, said: `${String(r.stderr ?? '').trim().slice(0, 600)}${r.error ? ` ${r.error.message}` : ''}`, bytes };
}

/**
 * The storm app for one build: main.js and package.json, the build's own
 * sites bundled as product.js, at HEAD watcher-process.js beside it, and a
 * node_modules link to the build's own, so the bundle's externals (and the
 * watcher process's `@parcel/watcher`) are the build's shipped binaries.
 */
function prepareStormApp(p, checkout) {
  rmSync(p.base, { recursive: true, force: true });
  for (const d of [p.app, dirname(p.entry), p.root, p.profile, p.home]) mkdirSync(d, { recursive: true });
  const hasHost = existsSync(HOST_TS(checkout));
  writeFileSync(join(p.app, 'package.json'), `${J({ name: 'p365-storm', private: true, version: '0.0.0', main: 'main.js' }, null, 1)}\n`);
  writeFileSync(join(p.app, 'main.js'), stormAppText());
  writeFileSync(p.entry, productEntryFor(checkout, hasHost));
  symlinkSync(join(checkout, 'node_modules'), join(p.app, 'node_modules'));
  const product = esbuild(checkout, p.entry, join(p.app, 'product.js'), ['electron', '@parcel/watcher', 'better-sqlite3', 'node-pty']);
  if (!product.ok) throw new Error(`the build's own esbuild could not bundle its sites: ${product.said}`);
  const built = { hasHost, product: product.bytes, watcherProcess: null };
  if (hasHost) {
    const wp = esbuild(checkout, join(checkout, 'src', 'main', 'watcher', 'watcher-process.ts'), join(p.app, 'watcher-process.js'), ['electron', '@parcel/watcher']);
    if (!wp.ok) throw new Error(`the build's own esbuild could not bundle watcher-process.ts: ${wp.said}`);
    built.watcherProcess = wp.bytes;
  }
  return built;
}

// ---------------------------------------------------------------------------
// The dumps: found under the run's own profile, read, then deleted
// ---------------------------------------------------------------------------

const symbolCache = new Map();
function watcherSymbolsFor(checkout) {
  const file = WATCHER_NODE(checkout);
  if (symbolCache.has(file)) return symbolCache.get(file);
  let table = [];
  try {
    const nm = spawnSync('/usr/bin/nm', ['-n', file], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 60_000 });
    const mangled = [];
    for (const line of String(nm.stdout ?? '').split('\n')) {
      const m = /^([0-9a-f]{16}) [tT] (.+)$/.exec(line);
      if (m) mangled.push(m[2]);
    }
    const filt = spawnSync('/usr/bin/c++filt', [], { input: mangled.join('\n'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 60_000 });
    table = watcherSymbolsOf(nm.stdout ?? '', filt.status === 0 ? String(filt.stdout ?? '').split('\n') : null);
  } catch {
    table = [];
  }
  symbolCache.set(file, table);
  return table;
}
let efCache = null;
function efSymbols() {
  if (efCache !== null) return efCache;
  efCache = EF_SYMBOLS !== '' && existsSync(EF_SYMBOLS) ? breakpadSymbolsOf(readFileSync(EF_SYMBOLS, 'utf8')) : [];
  return efCache;
}
/** Read one dump under this run, and only under this run. */
function readDumpFile(path, checkout) {
  if (!resolve(path).startsWith(`${RUN}/`)) throw new Error(`refused: ${path} is not under ${RUN}`);
  const d = parseMinidump(readFileSync(path), { watcherSymbols: watcherSymbolsFor(checkout), efSymbols: efSymbols() });
  return { file: basename(path), ...d };
}
function dumpFiles(crashpad) {
  const out = [];
  for (const sub of ['pending', 'completed', 'new']) {
    try {
      for (const n of readdirSync(join(crashpad, sub))) if (n.endsWith('.dmp')) out.push(join(crashpad, sub, n));
    } catch {
      /* no such folder */
    }
  }
  return out;
}
/** Wait until Crashpad has finished: the same dumps at the same sizes for 700 ms, or `ms`. */
async function dumpsSettled(crashpad, ms) {
  const until = Date.now() + ms;
  let last = '';
  let since = Date.now();
  while (Date.now() < until) {
    const now = J(dumpFiles(crashpad).map((f) => `${f}:${String(statSync(f, { throwIfNoEntry: false })?.size ?? 0)}`));
    if (now !== last) {
      last = now;
      since = Date.now();
    } else if (Date.now() - since >= 700) return;
    await sleep(100);
  }
}
/** Every report Crashpad keeps under the profile, removed after its reading (dumps, their metadata, attachments). */
function deleteCrashReports(crashpad) {
  for (const sub of ['pending', 'completed', 'new', 'attachments']) rmSync(join(crashpad, sub), { recursive: true, force: true });
}
/** Every `.dmp` left anywhere under `dir`. */
function dumpsUnder(dir) {
  let n = 0;
  const walk = (here) => {
    let entries = [];
    try {
      entries = readdirSync(here, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) walk(join(here, e.name));
      else if (e.name.endsWith('.dmp')) n += 1;
    }
  };
  walk(dir);
  return n;
}

// ---------------------------------------------------------------------------
// The storm launches (SP, SA, SQ, SK, SO)
// ---------------------------------------------------------------------------

/** The storm app's lines as they arrive, read incrementally. */
function lineReader(handle) {
  let at = 0;
  const seen = [];
  return () => {
    const text = handle.text();
    const end = text.lastIndexOf('\n') + 1;
    if (end > at) {
      for (const o of p365Lines(text.slice(at, end))) seen.push(o);
      at = end;
    }
    return seen;
  };
}
async function waitLine(read, pred, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const hit = read().find(pred);
    if (hit !== undefined) return hit;
    await sleep(100);
  }
  return read().find(pred) ?? null;
}
const sleepUntil = (when) => sleep(Math.max(0, when - Date.now()));
/** The watcher process the storm app runs now: the newest spawn whose generation has not exited. */
function currentWatcher(lines) {
  const child = lines.filter((l) => l.kind === 'child');
  const exited = new Set(child.filter((c) => c.event === 'exit').map((c) => c.gen));
  const spawns = child.filter((c) => c.event === 'spawn' && !exited.has(c.gen));
  return spawns.at(-1) ?? null;
}

/**
 * One storm run of one build. `env` is the run's P365_* variables; `during`
 * runs beside the storm (SK's signals, SQ's lsof). Returns the raw input the
 * one reader takes, after every dump was read and deleted.
 */
async function stormLaunch(label, checkout, build, env, { during = null, ceilingMs = 600_000 } = {}) {
  const p = stormPaths(label);
  const built = prepareStormApp(p, checkout);
  const raw = { text: '', exit: { code: null, signal: null }, env: { ...env }, dumps: [], dumpsFound: 0, reportsAdded: [], built, loadAtStart: loadavg(), rss: [], watchers: [] };
  const before = reportNames();
  try {
    await withElectron(
      {
        label: `p365-${label}`,
        userDataDir: p.profile,
        program: 'app',
        cwd: p.app,
        tmuxSocket: null,
        env: withoutDevRenderer({
          ...strippedOverlay(),
          HOME: p.home,
          ZDOTDIR: p.home,
          HISTFILE: '/dev/null',
          SHELL: '/bin/sh',
          TERM_SESSION_ID: undefined,
          TERM_PROGRAM: undefined,
          GMUX_TMUX_SOCKET: SOCKET,
          GMUX_PROBES: '0',
          P365_SCRATCH: p.base,
          P365_ROOT: p.root,
          P365_BUILD: build,
          P365_TRIGGER: p.trigger,
          ...env
        }),
        graceMs: 5_000,
        ceilingMs
      },
      async (handle) => {
        const mainPid = handle.child.pid;
        stormMains.set(mainPid, label);
        const exited = new Promise((r) => {
          handle.child.once('exit', (code, signal) => {
            raw.exit = { code, signal };
            r();
          });
        });
        const read = lineReader(handle);
        const sampler = setInterval(() => {
          const cur = currentWatcher(read());
          if (cur !== null && !watcherPids.has(cur.pid)) {
            const command = commandOf(cur.pid);
            watcherPids.set(cur.pid, { label, command });
            // The executable Activity Monitor names the process by (the plain helper in a development build).
            raw.watchers.push({ pid: cur.pid, executable: basename(command.split(' --')[0] ?? ''), utility: command.includes('--type=utility') });
          }
          raw.rss.push({ at: Date.now(), main: rssOf(mainPid), watcher: cur === null ? null : rssOf(cur.pid) });
        }, 5_000);
        try {
          const duringDone = during === null ? Promise.resolve() : during({ handle, read, mainPid, p, raw }).catch((err) => {
            raw.duringError = String(err?.message ?? err).slice(0, 400);
          });
          // Which ended the wait is recorded: the teardown's SIGTERM after the ceiling runs
          // Electron's graceful quit and exits 0, which must never read as the run's own exit.
          let ceilingTimer = null;
          const ended = await Promise.race([
            exited.then(() => 'exit'),
            new Promise((r) => {
              ceilingTimer = setTimeout(() => r('ceiling'), ceilingMs);
            })
          ]);
          clearTimeout(ceilingTimer);
          raw.ceilingHit = ended === 'ceiling';
          await duringDone;
          if (raw.exit.signal !== null || dumpFiles(p.crashpad).length > 0 || /"event":"exit"[^\n]*"unexpected":true/.test(handle.text())) await dumpsSettled(p.crashpad, 8_000);
        } finally {
          clearInterval(sampler);
          raw.text = handle.text();
          for (const m of raw.text.matchAll(/"event":"spawn"[^\n]*"pid":(\d+)/g)) if (!watcherPids.has(Number(m[1]))) watcherPids.set(Number(m[1]), { label, command: null });
        }
      }
    );
  } catch (err) {
    raw.launchError = String(err?.message ?? err).slice(0, 600);
  }
  raw.reportsAdded = noteReports(label, before);
  const found = dumpFiles(p.crashpad);
  raw.dumpsFound = found.length;
  raw.dumps = found.map((f) => {
    try {
      return readDumpFile(f, checkout);
    } catch (err) {
      return { file: basename(f), error: String(err?.message ?? err) };
    }
  });
  deleteCrashReports(p.crashpad);
  return raw;
}

const stormEnv = (o) => ({
  P365_TICK_MS: String(STORM.tickMs),
  P365_SLOTS: String(STORM.slots),
  P365_FAIL_PCT: String(STORM.failPct),
  P365_DEL_PCT: String(STORM.delPct),
  P365_CHURN_MS: String(STORM.churnMs),
  ...o
});

/** SP and SA: `RUNS` runs of the product storm at one build. */
async function stormArm(id, build) {
  const checkout = build === 'parent' ? PARENT_DIR : ROOT;
  const minutes = build === 'parent' ? PARENT_MIN : HEAD_MIN;
  const runs = [];
  for (let i = 1; i <= RUNS; i += 1) {
    const durationMs = Math.round(minutes * 60_000);
    say(`${id} at the ${build}: run ${String(i)} of ${String(RUNS)}, ${String(minutes)} min, order ${ARM_SPECS[id].order}`);
    const raw = await stormLaunch(`${id}-${build}-${String(i)}`, checkout, build, stormEnv({ P365_SCENARIO: 'storm', P365_DURATION_MS: String(durationMs), P365_DEL_ORDER: ARM_SPECS[id].order, P365_QUIT: 'drain', P365_SEED: String(36_500 + i * 7 + (id === 'SA' ? 3 : 0)) }), { ceilingMs: durationMs + 180_000 });
    runs.push(raw);
    const r = stormRunOf(raw);
    say(`${id} at the ${build}, run ${String(i)}: ${r.exit.signal ?? `exit ${String(r.exit.code)}`} after ${String(r.elapsedMs)} ms; ${String(r.rate === null ? '—' : Math.round(r.rate))} asks/s; main's fault ${J(r.namedMainFault)}; process crashes ${String(r.crashes.length)} (${String(r.crashes.filter((c) => c.ok).length)} re-bound); dumps ${String(raw.dumpsFound)}`);
  }
  return { arm: id, runs, runsWanted: RUNS };
}

/** SQ: 20 s of storm, then the quit with every watch dropped and main's pool held. lsof reads main and the process during the storm. */
async function quitArm(build) {
  const checkout = build === 'parent' ? PARENT_DIR : ROOT;
  const run = await stormLaunch(
    `SQ-${build}`,
    checkout,
    build,
    stormEnv({ P365_SCENARIO: 'quit', P365_DURATION_MS: String(SQ_STORM_MS), P365_DEL_ORDER: 'before', P365_QUIT: 'mid', P365_SATURATE: '1', P365_POOL_JOBS: String(SQ_POOL_JOBS), P365_SEED: '36571' }),
    {
      ceilingMs: SQ_STORM_MS + 120_000,
      during: async ({ read, mainPid, raw }) => {
        raw.lsofReads = [];
        const start = await waitLine(read, (l) => l.kind === 'start', 120_000);
        if (start === null) return;
        const began = Date.now();
        for (const atMs of [6_000, 14_000]) {
          await sleepUntil(began + atMs);
          const cur = currentWatcher(read());
          raw.lsofReads.push({ at: Date.now() - began, main: lsofText(mainPid), watcherPid: cur?.pid ?? null, watcher: cur === null ? null : lsofText(cur.pid) });
        }
      }
    }
  );
  return { arm: 'SQ', run, lsof: run.lsofReads ?? [] };
}

/** SK (HEAD): the storm, its watcher process SIGKILLed at 30 s with the storm paused, then SIGSTOPped at 90 s. */
async function killArm() {
  let stoppedPid = null;
  let stoppedCommand = '';
  const signals = {};
  const run = await stormLaunch('SK-head', ROOT, 'head', stormEnv({ P365_SCENARIO: 'storm', P365_DURATION_MS: String(SK_STORM_MS), P365_DEL_ORDER: 'before', P365_QUIT: 'drain', P365_SEED: '36581' }), {
    ceilingMs: SK_STORM_MS + 180_000,
    during: async ({ read, mainPid, p }) => {
      let seq = 0;
      const ask = (action) => {
        seq += 1;
        writeFileSync(`${p.trigger}.tmp`, J({ seq, action }));
        renameSync(`${p.trigger}.tmp`, p.trigger);
        return seq;
      };
      try {
        const start = await waitLine(read, (l) => l.kind === 'start', 120_000);
        if (start === null) return;
        const began = Date.now();
        await sleepUntil(began + SK_KILL_AT_MS - 2_000);
        signals.pause = { seq: ask('pause'), at: Date.now() };
        const paused = await waitLine(read, (l) => l.kind === 'paused' && l.seq === signals.pause.seq, 20_000);
        const v = ownWatcher(paused?.pid ?? null, mainPid);
        signals.kill = { pid: paused?.pid ?? null, verified: v.ok, sent: false, at: null, ppid: v.ppid };
        if (v.ok && commandOf(paused.pid) === v.command) {
          process.kill(paused.pid, 'SIGKILL');
          signals.kill.sent = true;
          signals.kill.at = Date.now();
        }
        await waitLine(read, (l) => l.kind === 'child' && l.event === 'rebound' && l.fromGen === paused?.gen, 45_000);
        await sleep(2_000);
        signals.resume = { seq: ask('resume'), at: Date.now() };
        await waitLine(read, (l) => l.kind === 'resumed' && l.seq === signals.resume.seq, 10_000);
        await sleepUntil(began + SK_STOP_AT_MS);
        const cur = currentWatcher(read());
        const v2 = ownWatcher(cur?.pid ?? null, mainPid);
        signals.stop = { pid: cur?.pid ?? null, verified: v2.ok, sent: false, at: null, ppid: v2.ppid };
        signals.stoppedGone = { goneAt: null };
        signals.cont = { sent: false, at: null };
        if (v2.ok && commandOf(cur.pid) === v2.command) {
          process.kill(cur.pid, 'SIGSTOP');
          stoppedPid = cur.pid;
          stoppedCommand = v2.command;
          stopped.set(cur.pid, v2.command);
          signals.stop.sent = true;
          signals.stop.at = Date.now();
          const until = signals.stop.at + SK_CONT_AFTER_MS;
          while (Date.now() < until) {
            if (commandOf(cur.pid) !== v2.command) {
              signals.stoppedGone.goneAt = Date.now();
              break;
            }
            await sleep(200);
          }
          if (signals.stoppedGone.goneAt === null && commandOf(cur.pid) === v2.command) {
            process.kill(cur.pid, 'SIGCONT');
            signals.cont = { sent: true, at: Date.now() };
          }
          stopped.delete(cur.pid);
        }
      } finally {
        // A process this run stopped is never left stopped: continued if it is still the same process.
        if (stoppedPid !== null && stopped.has(stoppedPid) && commandOf(stoppedPid) === stoppedCommand) {
          try {
            process.kill(stoppedPid, 'SIGCONT');
          } catch {
            /* gone */
          }
          stopped.delete(stoppedPid);
        }
      }
    }
  });
  return { arm: 'SK', run, signals, hostTemplates: HOST_TEMPLATES };
}

/** SO: ordinary use through the build's own sites. */
async function ordinaryArm(build) {
  const checkout = build === 'parent' ? PARENT_DIR : ROOT;
  const run = await stormLaunch(`SO-${build}`, checkout, build, { P365_SCENARIO: 'ordinary', P365_SEED: '36591' }, { ceilingMs: 180_000 });
  return { arm: 'SO', run };
}

// ---------------------------------------------------------------------------
// The real-app launches (RA, RH)
// ---------------------------------------------------------------------------

/** The quit recorder for RA and RH (a function so it is hoisted), loaded by NODE_OPTIONS into MAIN: it records the quit and presses the menu's Quit row when asked. */
function recorderText() {
  return String.raw`'use strict';
// Phase 365's quit recorder (probe:p365 RA, RH). SCRATCH ONLY: written by build/p365/probe-p365.mjs
// and loaded by NODE_OPTIONS into MAIN of a harness launch. It records the quit with appendFileSync
// (on disk before any SIGKILL) and presses the native menu's Quit row when the probe asks through
// its trigger file (probe:p362's shape); it changes nothing Tortie decides.
if (process.type !== 'browser') return;
const fs = require('node:fs');
const OUT = process.env.P365_EVENTS || '';
const TRIGGER = process.env.P365_TRIGGER || '';
const write = (o) => { try { fs.appendFileSync(OUT, JSON.stringify(Object.assign({ t: Date.now() }, o)) + '\n'); } catch (e) { /* never break the app */ } };
process.on('exit', (code) => write({ ev: 'process-exit', code: code }));
write({ ev: 'loaded', pid: process.pid });
setImmediate(() => {
  let electron;
  try { electron = require('electron'); } catch (err) { write({ ev: 'hook-failed', why: String(err && err.message).slice(0, 200) }); return; }
  const app = electron.app;
  const Menu = electron.Menu;
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
      if (req.action === 'menu-quit') {
        const menu = Menu.getApplicationMenu();
        const item = menu ? findItem(menu.items, (l) => l.startsWith('Quit ')) : null;
        write({ ev: 'menu-quit', ok: item !== null, label: item ? String(item.label) : null });
        if (item) item.click();
      }
    } catch (err) { write({ ev: 'trigger-failed', action: String(req.action), why: String(err && err.message).slice(0, 200) }); }
  }, 50);
  poll.unref();
  write({ ev: 'hooked' });
});
`;
}

/** RH's stand-in codex (a function so it is hoisted). `@@CODEX_HOME@@` becomes the run's own scratch CODEX_HOME. */
function standinCodexText() {
  return String.raw`#!/bin/sh
# Phase 365's stand-in codex (probe:p365 RH). SCRATCH ONLY: written by build/p365/probe-p365.mjs.
# No model and no network. It answers --version; in a session it writes ONE rollout record the
# harvest's codex descriptor accepts into the run's own CODEX_HOME (unless its folder says to hold
# it back), with the id its folder names, and then waits.
case "$1" in --version|-V|version) echo '@@VERSION@@'; exit 0;; esac
CH='@@CODEX_HOME@@'
here=$(pwd -P)
if [ -f "$here/@@ID_FILE@@" ] && [ ! -f "$here/@@DEFER_FILE@@" ]; then
  id=$(cat "$here/@@ID_FILE@@")
  sleep 1
  day=$(date +%Y/%m/%d)
  stamp=$(date +%Y-%m-%dT%H-%M-%S)
  iso=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
  mkdir -p "$CH/sessions/$day"
  printf '{"timestamp":"%s","type":"session_meta","payload":{"id":"%s","timestamp":"%s","cwd":"%s","originator":"codex_cli_rs","cli_version":"0.150.0","source":"cli"}}\n' "$iso" "$id" "$iso" "$here" > "$CH/sessions/$day/rollout-$stamp-$id.jsonl.part"
  mv "$CH/sessions/$day/rollout-$stamp-$id.jsonl.part" "$CH/sessions/$day/rollout-$stamp-$id.jsonl"
fi
exec sleep 3600
`;
}

/** The stand-in as written for one run: its version, its CODEX_HOME and its two file names filled in. */
export function standinCodexFor(codexHome) {
  return standinCodexText().replace('@@VERSION@@', RH_STANDIN_VERSION).replace('@@CODEX_HOME@@', codexHome).replaceAll('@@ID_FILE@@', RH_ID_FILE).replaceAll('@@DEFER_FILE@@', RH_DEFER_FILE);
}

/** One rollout record, as the stand-in writes it, written by this file for RH's held-back row before the relaunch. */
function writeRollout(codexHome, id, cwd) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const day = join(String(now.getFullYear()), pad(now.getMonth() + 1), pad(now.getDate()));
  const stamp = `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const dir = join(codexHome, 'sessions', day);
  mkdirSync(dir, { recursive: true });
  const iso = now.toISOString();
  const file = join(dir, `rollout-${stamp}-${id}.jsonl`);
  writeFileSync(`${file}.part`, `${J({ timestamp: iso, type: 'session_meta', payload: { id, timestamp: iso, cwd, originator: 'codex_cli_rs', cli_version: '0.150.0', source: 'cli' } })}\n`);
  renameSync(`${file}.part`, file);
  return file;
}

function appPaths(label) {
  const base = join(RUN, label);
  return {
    base,
    profile: join(base, 'profile'),
    home: join(base, 'home'),
    bin: join(base, 'bin'),
    repos: join(base, 'repos'),
    codexHome: join(base, 'home', '.codex'),
    events: join(base, 'events.jsonl'),
    trigger: join(base, 'trigger.json'),
    recorder: join(base, 'quit-recorder.cjs'),
    crashpad: join(base, 'profile', 'Crashpad')
  };
}
const devtoolsPort = (p) => {
  try {
    return Number(readFileSync(join(p.profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
  } catch {
    return 0;
  }
};
/** The main window's renderer over CDP, once the bridge is up. */
async function attachWindow(p, timeoutMs = 120_000) {
  const started = Date.now();
  for (;;) {
    const port = devtoolsPort(p);
    if (port > 0) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) {
          const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
          await cdp.call('Runtime.enable');
          for (let i = 0; i < 200; i += 1) {
            if ((await cdpEval(cdp, "typeof window.gmux === 'object' && typeof window.gmux.projects === 'object'")) === true) return cdp;
            await sleep(300);
          }
        }
      } catch {
        /* not up yet */
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(300);
  }
}
const ask = (p, action, state) => {
  state.seq = (state.seq ?? 0) + 1;
  writeFileSync(`${p.trigger}.tmp`, J({ seq: state.seq, action }));
  renameSync(`${p.trigger}.tmp`, p.trigger);
};
async function waitEvent(p, pred, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const e = eventsOf(p.events).find(pred);
    if (e !== undefined) return e;
    await sleep(100);
  }
  return null;
}
const gitRun = (args, home) => spawnSync('/usr/bin/git', args, { encoding: 'utf8', timeout: 30_000, env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' } });

/** One launch of a build's out/ with a window, after the stand-ins' preflights and the hidden agents. */
async function launchApp(label, checkout, p, { tmuxSocket, standIns = [] }, body) {
  mkdirSync(p.home, { recursive: true });
  writeFileSync(p.recorder, recorderText(), { mode: 0o600 });
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflights.push(pre.ok);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  const dnsPre = await dns.preflight(dns.servers);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
  if (!dnsPre.ok) throw new Error(`the DNS preflight refused: ${dnsPre.problems.join('; ')}`);
  writeHiddenAgents(p.profile, 'p365', hiddenAgentsBesides(standIns));
  const before = reportNames();
  try {
    return await withElectron(
      {
        label: `p365-${label}`,
        userDataDir: p.profile,
        cwd: checkout,
        tmuxSocket,
        args: ['--remote-debugging-port=0', '--use-mock-keychain'],
        env: withoutDevRenderer({
          ...strippedOverlay(),
          HOME: p.home,
          ZDOTDIR: p.home,
          HISTFILE: '/dev/null',
          SHELL: '/bin/sh',
          TERM_SESSION_ID: undefined,
          TERM_PROGRAM: undefined,
          CODEX_HOME: undefined,
          GMUX_TMUX_SOCKET: SOCKET,
          GMUX_PROBES: '1',
          GMUX_LOG_FILE: '1',
          GMUX_SPECSTORY_NO_CLOUD: '1',
          GMUX_HARNESS_DIR: HARNESS_DIR,
          GMUX_TAILSCALE_BIN: standin.binPath,
          [NAME_SERVERS_VAR]: dns.servers,
          NODE_OPTIONS: `--require=${p.recorder}`,
          P365_EVENTS: p.events,
          P365_TRIGGER: p.trigger
        }),
        graceMs: 8_000,
        ceilingMs: 900_000
      },
      async (handle) => {
        shims.add(handle.pid);
        const appNow = () => {
          try {
            const a = handle.appPid();
            if (a > 0) apps.add(a);
            return a;
          } catch {
            return 0;
          }
        };
        const win = await attachWindow(p);
        appNow();
        await sleep(2_000);
        const mainPid = appNow();
        const agents = standInsOnlyVerdict(JSON.parse(await cdpEval(win, AGENTS_LIST_EXPR, 120_000)), { standIns, under: standIns.length > 0 ? p.bin : null });
        agentsHeld.push(agents.ok);
        if (!agents.ok) throw new Error(`an agent resolved: ${agents.said}`);
        try {
          return await body(win, handle, { agents, mainPid });
        } finally {
          try {
            win.close();
          } catch {
            /* closed with the window */
          }
        }
      }
    );
  } catch (err) {
    const why = String(err?.message ?? err);
    if (why.includes(CENSUS_WORDS)) censusFailures.push(`${label}: ${why.slice(0, 300)}`);
    throw err;
  } finally {
    noteReports(label, before);
  }
}

/** Press the menu's Quit row in main and wait for the process to end; answers the probe's clock at the end, or null. */
async function quitByMenu(p, handle, state) {
  ask(p, 'menu-quit', state);
  const end = await Promise.race([handle.exited.then(() => Date.now()), sleep(90_000).then(() => null)]);
  return end;
}

/** RA: 20 projects through the window, an edit in each, 10 closed, a branch switched in 5, the menu's Quit. */
async function appArm(build) {
  const checkout = build === 'parent' ? PARENT_DIR : ROOT;
  const label = `RA-${build}`;
  const p = appPaths(label);
  rmSync(p.base, { recursive: true, force: true });
  for (const d of [p.profile, p.home, p.repos]) mkdirSync(d, { recursive: true });
  const repos = [];
  for (let i = 0; i < RA_PROJECTS; i += 1) {
    const dir = join(p.repos, `repo-${String(i).padStart(2, '0')}`);
    mkdirSync(dir, { recursive: true });
    gitRun(['init', '-q', dir], p.home);
    writeFileSync(join(dir, 'README.md'), `project ${String(i)}\n`);
    gitRun(['-C', dir, 'add', 'README.md'], p.home);
    gitRun(['-C', dir, '-c', 'user.email=p@x', '-c', 'user.name=p', 'commit', '-q', '-m', 'one'], p.home);
    repos.push(realpathSync(dir));
  }
  const raw = { arm: 'RA', world: { opened: 0, watched: 0, closed: 0 }, edits: [], branches: [], census: [], loadAtStart: loadavg() };
  const censusBefore = censusFailures.length;
  const state = {};
  try {
    await launchApp(label, checkout, p, { tmuxSocket: SOCKET, standIns: [] }, async (win, handle, pre) => {
      raw.agents = pre.agents;
      await waitEvent(p, (e) => e.ev === 'hooked', 15_000);
      await cdpEval(win, '(() => { window.__p365 = { changes: [] }; window.gmux.git.onChanged((x) => { try { window.__p365.changes.push({ p: typeof x === "string" ? x : JSON.stringify(x), t: Date.now() }); } catch (e) { /* page */ } }); return true; })()');
      for (const repo of repos) if ((await cdpEval(win, `window.gmux.projects.add(${J(repo)}).then((x) => !!x, () => false)`, 60_000)) === true) raw.world.opened += 1;
      for (const repo of repos) if ((await cdpEval(win, `window.gmux.git.status(${J(repo)}).then(() => true, () => false)`, 60_000)) === true) raw.world.watched += 1;
      await sleep(3_000);
      raw.lsof = { mainPid: pre.mainPid, main: lsofText(pre.mainPid), children: childrenOf(pre.mainPid).map((c) => ({ pid: c.pid, command: c.command, text: lsofText(c.pid) })) };
      raw.watcherPids = raw.lsof.children.filter((c) => lsofHolds(c.text) === true).map((c) => ({ pid: c.pid, command: commandOf(c.pid) }));
      for (const w of raw.watcherPids) watcherPids.set(w.pid, { label, command: w.command });
      const changes = async () => JSON.parse(await cdpEval(win, 'JSON.stringify(window.__p365.changes)'));
      const waitHeard = async (repo, at) => {
        const until = Date.now() + 5_000;
        while (Date.now() < until) {
          if (heardAfter(await changes(), repo, at) !== null) return;
          await sleep(50);
        }
      };
      for (let i = 0; i < repos.length; i += 1) {
        const at = Date.now();
        writeFileSync(join(repos[i], `edit-${String(i)}.txt`), String(at));
        raw.edits.push({ repo: repos[i], at });
        await waitHeard(repos[i], at);
        await sleep(300);
      }
      const listed = JSON.parse(await cdpEval(win, 'window.gmux.projects.list().then((l) => JSON.stringify(l), () => "null")', 60_000));
      const rows = Array.isArray(listed) ? listed : Array.isArray(listed?.projects) ? listed.projects : [];
      for (const repo of repos.slice(0, RA_CLOSE)) {
        const row = rows.find((x) => typeof x?.path === 'string' && realOrSelf(x.path) === repo);
        if (row !== undefined && (await cdpEval(win, `window.gmux.projects.remove(${J(row.id)}).then(() => true, () => false)`, 60_000)) === true) raw.world.closed += 1;
      }
      await sleep(2_000);
      for (const repo of repos.slice(RA_CLOSE, RA_CLOSE + RA_BRANCH)) {
        const at = Date.now();
        gitRun(['-C', repo, 'checkout', '-q', '-b', `p365-${basename(repo)}`], p.home);
        raw.branches.push({ repo, at });
        await waitHeard(repo, at);
        await sleep(300);
      }
      raw.changes = await changes();
      raw.exitAt = await quitByMenu(p, handle, state);
      raw.events = eventsOf(p.events);
      await sleep(1_500);
      raw.watcherAfter = (raw.watcherPids ?? []).filter((w) => commandOf(w.pid) !== '' && commandOf(w.pid) === w.command).map((w) => w.pid);
    });
  } catch (err) {
    raw.error = String(err?.message ?? err).slice(0, 600);
  }
  raw.census = censusFailures.slice(censusBefore);
  const found = dumpFiles(p.crashpad);
  raw.dumpsFound = found.length;
  raw.dumpReadings = found.map((f) => {
    try {
      return readDumpFile(f, checkout);
    } catch (err) {
      return { file: basename(f), error: String(err?.message ?? err) };
    }
  });
  deleteCrashReports(p.crashpad);
  return raw;
}
const realOrSelf = (f) => {
  try {
    return realpathSync(f);
  } catch {
    return f;
  }
};

/** RH: a stand-in codex session armed at its create; a second held back, its record written before the relaunch (the boot rescue). */
async function rescueArm(build) {
  const checkout = build === 'parent' ? PARENT_DIR : ROOT;
  const label = `RH-${build}`;
  const p = appPaths(label);
  rmSync(p.base, { recursive: true, force: true });
  for (const d of [p.profile, p.home, p.bin, p.codexHome]) mkdirSync(d, { recursive: true });
  const projA = join(p.base, 'proj-a');
  const projB = join(p.base, 'proj-b');
  for (const d of [projA, projB]) mkdirSync(d, { recursive: true });
  writeFileSync(join(projA, RH_ID_FILE), RH_IDS.a);
  writeFileSync(join(projB, RH_ID_FILE), RH_IDS.b);
  writeFileSync(join(projB, RH_DEFER_FILE), 'held back until the relaunch\n');
  const standinPath = join(p.bin, 'codex');
  writeFileSync(standinPath, standinCodexFor(p.codexHome), { mode: 0o755 });
  const profileLine = `export PATH="${p.bin}:$PATH"\nexport HISTFILE=/dev/null\n`;
  for (const f of ['.profile', '.zprofile', '.zshrc', '.bashrc']) writeFileSync(join(p.home, f), profileLine);
  writeFileSync(join(p.home, '.hushlogin'), '');
  const raw = { arm: 'RH', created: [], bWritten: false, loadAtStart: loadavg() };
  // THE PRECONDITION: the bare name resolves to the stand-in in the login shell the app will ask.
  {
    const r = spawnSync('/bin/sh', ['-lic', 'command -v codex'], { encoding: 'utf8', timeout: 30_000, env: { ...process.env, HOME: p.home, ZDOTDIR: p.home, HISTFILE: '/dev/null', SHELL: '/bin/sh', TERM_SESSION_ID: undefined, TERM_PROGRAM: undefined } });
    raw.resolved = (String(r.stdout ?? '').trim().split('\n').pop() ?? '') === standinPath;
    raw.resolvedAs = String(r.stdout ?? '').trim().split('\n').pop() ?? '';
  }
  if (!raw.resolved) return raw;
  const realA = realpathSync(projA);
  const realB = realpathSync(projB);
  const listIds = (win) => cdpEval(win, 'window.gmux.sessions.list().then((l) => JSON.stringify(l.map((s) => ({ id: s.id, name: s.name, status: s.status, agentSessionId: s.agentSessionId ?? null }))), () => "null")', 60_000).then((t) => JSON.parse(t));
  const waitArmed = async (win, name, ms) => {
    const until = Date.now() + ms;
    let rows = null;
    while (Date.now() < until) {
      rows = await listIds(win);
      const row = Array.isArray(rows) ? rows.find((x) => x.name === name) : undefined;
      if (row !== undefined && typeof row.agentSessionId === 'string' && row.agentSessionId !== '') return rows;
      await sleep(500);
    }
    return rows;
  };
  const state1 = {};
  try {
    await launchApp(`${label}-1`, checkout, p, { tmuxSocket: null, standIns: ['codex'] }, async (win, handle, pre) => {
      raw.agents = pre.agents;
      await waitEvent(p, (e) => e.ev === 'hooked', 15_000);
      for (const d of [realA, realB]) await cdpEval(win, `window.gmux.projects.add(${J(d)}).then((x) => !!x, () => false)`, 60_000);
      for (const [name, dir] of [[RH_NAMES.a, realA], [RH_NAMES.b, realB]]) {
        const made = await cdpEval(win, `window.gmux.sessions.create({ name: ${J(name)}, projectPath: ${J(dir)}, agent: 'codex' }).then((s) => ({ ok: true, id: s.id }), (e) => ({ ok: false, error: String(e && e.message).slice(0, 300) }))`, 60_000);
        raw.created.push({ name, ...(made ?? { ok: false }) });
      }
      const t = Date.now();
      raw.first = await waitArmed(win, RH_NAMES.a, 60_000);
      raw.firstAt = Date.now() - t;
      await sleep(3_000);
      raw.first = await listIds(win);
      raw.exitAt1 = await quitByMenu(p, handle, state1);
    });
  } catch (err) {
    raw.error1 = String(err?.message ?? err).slice(0, 600);
  }
  // The held-back row's record, written while the app is down, as codex would write it on its first turn.
  if (Array.isArray(raw.first)) {
    try {
      raw.bRecord = writeRollout(p.codexHome, RH_IDS.b, realB);
      raw.bWritten = true;
    } catch (err) {
      raw.bWriteError = String(err?.message ?? err);
    }
  }
  rmSync(p.events, { force: true });
  rmSync(p.trigger, { force: true });
  const state2 = {};
  try {
    await launchApp(`${label}-2`, checkout, p, { tmuxSocket: SOCKET, standIns: ['codex'] }, async (win, handle, pre) => {
      raw.agents2 = pre.agents;
      await waitEvent(p, (e) => e.ev === 'hooked', 15_000);
      const t = Date.now();
      raw.second = await waitArmed(win, RH_NAMES.b, 60_000);
      raw.secondAt = Date.now() - t;
      raw.second = await listIds(win);
      raw.exitAt2 = await quitByMenu(p, handle, state2);
    });
  } catch (err) {
    raw.error2 = String(err?.message ?? err).slice(0, 600);
  }
  endServer();
  if (raw.agents !== undefined && raw.agents2 !== undefined) raw.agents = { ok: raw.agents.ok === true && raw.agents2.ok === true, said: `${raw.agents.said}; ${raw.agents2.said}` };
  const found = dumpFiles(p.crashpad);
  raw.dumpsFound = found.length;
  deleteCrashReports(p.crashpad);
  return raw;
}

// ---------------------------------------------------------------------------
// One arm at one build: its raw input, its reading, its verdict
// ---------------------------------------------------------------------------

/**
 * The parent's reading, linked into HEAD's where HEAD's grader compares with it,
 * with the parent's OWN verdict beside its numbers (the probe review): a parent
 * reading its grader could not read is no baseline, and HEAD's needs say so.
 */
function linkParent(id, reading, parentReading) {
  const verdict = parentReading === null || parentReading === undefined || GRADERS[`${id}-parent`] === undefined ? null : grade(`${id}-parent`, parentReading).verdict;
  if (id === 'SO') reading.parent = { verdict, bootMs: parentReading?.so?.boot?.ms ?? null, quietChanges: parentReading?.so?.quiet?.changes ?? null, branchChanges: parentReading?.so?.branch?.changes ?? null };
  if (id === 'RA') reading.parent = { verdict, editMedian: parentReading?.ra?.edits?.median ?? null, branchMedian: parentReading?.ra?.branches?.median ?? null, quitMs: parentReading?.ra?.quit?.wallMs ?? null };
  if (id === 'RH') reading.parent = { verdict, firstA: parentReading?.rh?.first?.a ?? null, secondA: parentReading?.rh?.second?.a ?? null, secondB: parentReading?.rh?.second?.b ?? null };
  return reading;
}

async function rawFor(id, build) {
  const kind = ARM_SPECS[id].kind;
  if (kind === 'storm') return stormArm(id, build);
  if (kind === 'quit') return quitArm(build);
  if (kind === 'kill') return killArm();
  if (kind === 'ordinary') return ordinaryArm(build);
  if (kind === 'app') return appArm(build);
  return rescueArm(build);
}

/** What a person reads beside each verdict. */
function printArm(key, reading, raw) {
  const p = { load: raw?.loadAtStart ?? raw?.runs?.[0]?.loadAtStart ?? raw?.run?.loadAtStart ?? null, ...(reading.printed ?? {}) };
  if (Array.isArray(raw?.runs)) p.rss = raw.runs.map((r) => r.rss?.filter((x) => x.main !== null).map((x) => ({ main: x.main, watcher: x.watcher })).slice(0, 400));
  else if (raw?.run?.rss !== undefined) p.rss = raw.run.rss.map((x) => ({ main: x.main, watcher: x.watcher }));
  if (raw?.run?.built !== undefined) p.built = raw.run.built;
  if (raw?.runs?.[0]?.built !== undefined) p.built = raw.runs[0].built;
  if (raw?.run?.watchers !== undefined) p.watchers = raw.run.watchers;
  if (Array.isArray(raw?.runs)) p.watchers = raw.runs.flatMap((r) => r.watchers ?? []);
  for (const k of ['error', 'error1', 'error2', 'launchError', 'duringError', 'resolvedAs', 'firstAt', 'secondAt']) if (raw?.[k] !== undefined) p[k] = raw[k];
  if (raw?.run?.launchError !== undefined) p.launchError = raw.run.launchError;
  if (raw?.run?.duringError !== undefined) p.duringError = raw.run.duringError;
  report.printed[key] = p;
  const brief = { ...p };
  delete brief.rss;
  say(`${key}, printed: ${J(brief).slice(0, 1_500)}`);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const needsApp = ARMS.some((a) => ARM_SPECS[a].kind === 'app' || ARM_SPECS[a].kind === 'rescue');
if (needsApp) {
  standin = makeStandin({ dir: join(RUN, 'tailscale'), scenario: { ...DEFAULT_SCENARIO } });
  dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
  watch = watchForRealTailscale({ roots: () => [...shims, ...apps].filter((x) => x > 0), everyMs: 1_000 });
}
const historyPoll = setInterval(noteHistory, 1_000);
historyPoll.unref();
say(`measuring ${ROOT} against the parent ${String(PARENT_DIR)}; arms ${J(ARMS)}; ${String(RUNS)} run(s) of ${String(HEAD_MIN)} min at HEAD and ${String(PARENT_MIN)} at the parent; socket ${SOCKET}; stripped from the environment ${J(strippedNames)}`);

try {
  for (const id of ARMS) {
    const spec = ARM_SPECS[id];
    const readings = {};
    for (const build of spec.builds) {
      const key = `${id}-${build}`;
      say(`ARM ${id} at the ${build} (load ${loadavg().map((x) => x.toFixed(2)).join(' ')})`);
      noteHistory();
      historyDuring = `arm ${id} at the ${build}`;
      try {
        const raw = await rawFor(id, build);
        const reading = derive(raw);
        if (build === 'head') linkParent(id, reading, readings.parent ?? null);
        readings[build] = reading;
        printArm(key, reading, raw);
        arm(key, reading);
      } catch (err) {
        cannotRead(key, `the arm stopped: ${String(err?.message ?? err).slice(0, 400)}`);
      }
      endServer();
      noteHistory();
      historyDuring = `between arms, after ${id} at the ${build}`;
      await sleep(1_000);
    }
  }
} catch (err) {
  report.error = String(err?.stack ?? err);
  say(`the run stopped: ${report.error.slice(0, 300)}`);
} finally {
  noteHistory();
  historyDuring = 'ending the run';
  const safely = (label, fn, fallback = null) => {
    try {
      return fn();
    } catch (err) {
      (report.ending ??= []).push(`${label}: ${String(err?.message ?? err)}`);
      return fallback;
    }
  };
  // A process this run stopped is never left stopped.
  for (const [pid, command] of stopped) {
    if (commandOf(pid) === command) safely('a stopped process', () => process.kill(pid, 'SIGCONT'));
  }
  const leaked = watch === null ? [] : safely('the Tailscale watcher', () => watch.stop(), []);
  if (standin !== null) safely('the Tailscale stand-in', () => endStandinProcesses(standin.dir, 1_500));
  if (dns !== null) await dns.close().catch((err) => (report.ending ??= []).push(`the DNS stand-in: ${String(err?.message ?? err)}`));
  endServer();
  await sleep(1_000);
  const table = processTable();
  const alive = (pid, test) => table.has(pid) && test(table.get(pid).command);
  const electronsLeft = [...shims, ...apps, ...stormMains.keys()].filter((pid) => alive(pid, (c) => /[Ee]lectron|Tortie/.test(c))).length;
  const watchersLeft = [...watcherPids.keys()].filter((pid) => alive(pid, (c) => c.includes('--type=utility'))).length;
  const dumpsLeft = dumpsUnder(RUN);
  const reportsAfter = reportNames();
  const reportsRead = REPORTS_BEFORE !== null && reportsAfter !== null;
  const newReports = reportsRead ? reportsAfter.filter((n) => !REPORTS_BEFORE.includes(n)).filter((n) => /^(Electron|Tortie)/.test(n)) : null;
  report.printed['RUN-reports'] = { before: REPORTS_BEFORE?.length ?? null, after: reportsAfter?.length ?? null, newAll: reportsRead ? reportsAfter.filter((n) => !REPORTS_BEFORE.includes(n)) : null };
  noteHistory();
  const history = { before: HISTORY_BEFORE, after: historyStat(), quiet: null, moves: historyMoves };
  if (history.after !== history.before) {
    say(`his shell history moved (${history.before} to ${history.after}); starting nothing for ${String(HISTORY_QUIET_MS / 1000)} s and reading it again`);
    historyDuring = `the ${String(HISTORY_QUIET_MS / 1000)} s quiet wait, nothing of the run running`;
    await sleep(HISTORY_QUIET_MS);
    history.quiet = { again: historyStat(), waitedMs: HISTORY_QUIET_MS };
  }
  noteHistory();
  clearInterval(historyPoll);
  for (const m of historyMoves) say(`his shell history moved at ${m.at} (${m.from} to ${m.to}), during ${m.during}`);
  arm('RUN', {
    preflight: { ok: PREFLIGHT.every((c) => c.ok || c.info) && tailscalePreflights.every(Boolean) && dnsPreflights.every(Boolean) },
    agentsHeld,
    censusFailures,
    tailscale: { real: leaked.length },
    processTableRead: table.size > 0,
    electronsLeft,
    watchersLeft,
    reportsRead,
    newReports: newReports ?? [],
    dumpsLeft,
    history
  });
  safely('the report', () => {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'probe-p365.json'), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  });
  if (!KEEP) safely('the scratch world', () => rmSync(RUN, { recursive: true, force: true }));
  else say(`kept ${RUN} (P365_KEEP=1; every dump was deleted after its reading); every reading in ${OUT}`);
}

say(`${String(report.arms.filter((a) => a.ok === true).length)} verdict(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
// Every launch, stand-in and server above has ended; a CDP call's long timer must not hold the run (or its lock slot) open.
process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
