#!/usr/bin/env node
/**
 * probe:p349 — THE PHASE 349 APP RUN, the Mac side (build/p349/SPEC.md §8.1):
 * a session renamed from the phone through the door's one new write,
 * `POST /v1/rename`, the offers the rows and the Sessions answer carry
 * (`rename` and `renames`), the Allow it waits for (333.12), and the tmux name
 * that stops carrying what tmux reads (D7), graded against the name each arm
 * TYPED and never against the verb's report (Method 1).
 *
 * TWO ELECTRONS, ONE AFTER THE OTHER AND NEVER AT ONCE, both through
 * build/electron-run.mjs's `withElectron` on ONE scratch profile, a scratch
 * HOME (ZDOTDIR the same, HISTFILE=/dev/null, no TERM_SESSION_ID) and the
 * socket build/harness-socket.mjs hands this file (`gmux-p349…`), inside
 * build/with-scratch-machine.mjs's LOOPBACK machine with the quiet shell, its
 * own far HOME and none of the person's keys (`SCRATCH_MACHINE_QUIET_SHELL=1`,
 * `SCRATCH_MACHINE_SCRATCH_HOME=1`, `SCRATCH_MACHINE_NO_OWN_KEYS=1`, which the
 * npm script exports and this file refuses to run without). FIRST the parent,
 * `P349_PARENT_CHECKOUT` (a BUILT 40aebfcc, whose product code is 266d7d91's,
 * required: `--preflight` refuses without it), whose door is confirmed over its
 * fourteen routes and which pairs the phones, so HEAD starts on a
 * 0.113.0-shaped store whose agreement covers the fourteen and `rename` WAITS
 * for its Allow (D13, 333.12). Then HEAD.
 *
 * WHAT IS REAL. The door, switched on, confirmed and published through the
 * STAND-IN Tailscale (build/p330/tailscale-standin.mjs behind
 * GMUX_TAILSCALE_BIN, preflighted by sha256, the process table sampled every
 * second: a real Tailscale under the app, or run as a command, FAILS the run).
 * The name check asks build/p332/dns-standin.mjs IN THIS PROCESS on
 * 127.0.0.1. The phones are build/p316/node-phone.mjs, paired through the
 * stand-in's loopback forwarder with mutual TLS; a rename is composed here as
 * the phone composes it (`{ name, session, write }`, its keys sorted) and its
 * answer read the phone's way by this file's own `renameAnswerOf`. The
 * loopback machine's tmux is build/p326/far-tmux.sh, copied into this run
 * beside an env file of its own and named as the machine's `remoteTmuxPath`,
 * so EVERY far tmux invocation is written to this run's far log.
 *
 * THE AGENTS ARE STAND-INS. The scratch login shell resolves `claude` and
 * `codex` to build/p318/stand-in.mjs's wrappers (`writeWrappers`), and this
 * file REFUSES (exit 2) unless both resolve there and nothing else does.
 * build/hidden-agents.mjs renames EVERY probed registry row but those two
 * before EVERY launch (`hiddenAgentsBesides(['claude', 'codex'])`), its
 * precheck holds that list to the checkout's own registry, and the app's own
 * `agents:list` must say nothing resolved but the two stand-ins, under this
 * run (`standInsOnlyVerdict`). THE PROBE REVIEW (rule 9): Tortie's detection
 * runs `--version` on every SHADOWED copy of a name it resolves, in the
 * absolute folders it always searches too (src/main/agents/detection.ts,
 * src/main/tmux/resolve.ts `extraBinDirsFor`), which no `agents:list` verdict
 * sees; so before each launch this file refuses (exit 2) when a copy of
 * `claude` or `codex` sits in the checkout's absolute scan folders or the
 * system folders of the app's PATH (`absoluteScanDirsOf`, `shadowCopiesOf`),
 * or when one of those folders cannot be read. NO VENDOR PROCESS RUNS AND NO
 * MODEL TURN IS SPENT. After the run the manifest's argv[0] of every session is
 * read (a COPY beside its WAL), and one outside the run fails RUN.
 *
 * THE ARMS (SPEC §8.1)
 *   RNP    at the parent: `POST /v1/rename` answers 404 before its body and to
 *          a whole request, nothing reaches main (no write line, the row's name
 *          unchanged), and no row or answer carries `rename` or `renames`
 *   RN0    at HEAD over the parent's agreement: exactly `rename` waits; it
 *          answers 404 before its body and nothing reaches main; no row
 *          carries `rename` and no answer `renames`; Settings then Phone draws
 *          `New: rename sessions from your phone` with its sentence above an
 *          Allow, and the honesty sentence names its clause; ONE Allow, after
 *          which it waits for a body and the offers appear. The face's "Your
 *          phone can" row is not drawn over an agreement on record, and that is
 *          RECORDED, not graded (p333121-face.test.ts holds its composer)
 *   RN1    Method 1's matrix: from phone A, §2.1.1's corpus and the entry's
 *          Method 1 names (each refused character among them) over a local
 *          shell, the Claude Code stand-in, the Codex stand-in, a local ended
 *          session and a live shell on the loopback machine, each target's
 *          last name an RN6 canary. A taken name lands as typed (trimmed) in
 *          the manifest (its own copy, read here) and in the window's list;
 *          tmux holds D7's name by `$`-id (read by this file's own client);
 *          on the machine `@gmux-name` holds the typed name and the far tmux
 *          name D7's far rule, read by the far server's own client and in the
 *          far log, and the window's list reads either the name or its
 *          read-back of one `_` per CELL where the carriage forwards no UTF-8
 *          locale (`farReadBackOf`, `cellsOf`, §2.2); a refused name answers
 *          `refused` `name` in the rule's own sentence and nothing changes
 *   RN2    an ended session on the machine, two ways: the one the PARENT's
 *          launch ended (a record only at HEAD) and one ended in this run (its
 *          machine's `gone` map): each `refused` `changed`, its name unchanged,
 *          and the far log holds no command carrying the typed name, its far
 *          D7 form or its stamp form (`RN2_TYPED`, `rn2NamesOf`)
 *   RN3    a start, then a rename: on this Mac a real phone start of the Claude
 *          Code stand-in, then a rename to a typed name; on the machine a shell
 *          made THROUGH THE MAC (a far start could run a real agent from his
 *          install folders), renamed from the phone at once; each graded as
 *          RN1 grades it, and how long the default name lived PRINTED
 *   RN4    M2 in the app: a far rename, thirty rounds, each answered inside the
 *          door's 15,000 ms (`ANSWER_TIMEOUT_MS`), the times PRINTED
 *   RN5    a Mac window mid-rename: the session's own project tab focused
 *          (`__p293.addProject`), its own strip tab or row clicked, the
 *          window's inline rename draft open (F2) IN AN INPUT WHOSE SESSION
 *          IS THE ONE RENAMED (`owner`), while the phone's rename lands: the
 *          phone's name lands, the draft is dropped (the stated trade,
 *          session-actions.tsx), every other session unchanged; a missing read
 *          is UNREADABLE, and so is a draft F2 opened for another session
 *   RN6    where the name goes, after the app is gone: no canary in any file
 *          under the harness folder (walked by its REAL path) but the named
 *          stores (the manifest, its own backups, the snapshot capsules, the
 *          run's far log), none in app.log or its rotated file but on the
 *          Mac's own quit-time scrollback line, which names every session it
 *          could not write and is older than this phase (counted apart as
 *          `appLogKnown`, printed), one log line per rename that acted, and
 *          none in any argv the sampler saw but the rename's own
 *          `rename-session` and `@gmux-name` commands, which ARE the store
 *          (counted apart, printed)
 *   RN7    the Mac's own `sessions:rename` over the corpus at the parent and at
 *          HEAD, each name scored 2 when it landed as typed with tmux holding
 *          the name the Mac stored, 1 when it landed and tmux holds another, 0
 *          when it was refused, lost or rewritten (the echo copies what tmux
 *          made of it into the display name): no name scores lower at HEAD;
 *          HEAD stores D7's tmux name for every name; every name the parent
 *          lost HEAD lands whole. UNREADABLE when a parent op has no name read,
 *          or nothing landed at the parent
 *   RUN    the preflights, the hidden agents and the shadow refusal at every
 *          launch, the stand-ins resolved, every manifest argv[0] the run's, a
 *          manifest copy taken BEFORE the ends holding every agent session the
 *          run started with its argv[0] inside the run (`agentsStarted`; read
 *          as not run, and passed, when P349_ARMS left out RN1 and RN3, the
 *          two arms that start one), no
 *          real Tailscale, nothing forbidden at the stand-in, everything ended,
 *          and his shell history unmoved: a moved history is read again after
 *          `HISTORY_QUIET_MS` (180 s, starting nothing): moved again is his own
 *          terminal, held still FAILS, no re-read is UNREADABLE (`historyHeld`)
 *
 * WHAT IT REFUSES TO DO. It never names the person's tmux server or `-L
 * gmux` (it refuses any socket that is not a `gmux-p349` harness socket), and
 * nothing it starts lists that server, not even to count (his ruling, the
 * fix round of 2026-10-31): each launch hands build/electron-run.mjs its
 * socket through the app's env alone (`GMUX_TMUX_SOCKET`, `tmuxSocket:
 * null`), so the helper still refuses a socket that is not a scratch one and
 * judges the socket the app announces, and never runs its layer-4 census of
 * `-L gmux`; this file ends its own scratch server after every launch, in a
 * `finally` (`endScratchServer`), where the helper's teardown ended it. It
 * binds no real interface and dials nothing but 127.0.0.1, never runs a real
 * `tailscale` and never asks real DNS, reads no keychain and no credential
 * (the app runs `--use-mock-keychain`), and signals only the pids it started,
 * the stand-ins wrote in their records, or the scratch sshd's own, by pid,
 * never by pattern, re-reading a pid's command line first. It takes NO
 * screenshot. It reads his shell history's size and modified time, under the
 * ACCOUNT's home, and nothing else of it. NO NAME HOLDING `#(` IS EVER SENT:
 * every name it types is asserted free of it before anything starts.
 *
 * VERIFIERS ONLY: it starts an Electron. Take the orchestrator's lock.
 *
 *   npm run build && P349_PARENT_CHECKOUT=<a BUILT 40aebfcc> npm run -s probe:p349
 *   P349_ARMS=RN1,RN4,…      the arms to run (default all; RNP, RN0 and RUN are always read)
 *   P349_KEEP=1              keep the scratch world and every answer (out/p349) for a re-derivation
 *   node build/p349/probe-p349.mjs --grader-self-test   every grader on build/p349/fixtures/graders.json; starts nothing
 *   node build/p349/probe-p349.mjs --preflight          the parent, out/ and the stand-ins; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ. A launch refused because an agent other than the
 * stand-ins could run (the precondition, the shadow refusal, the precheck,
 * the scan's own verdict) is no run, exit 2.
 *
 * THE PROBE REVIEW of 2026-10-30 (rule 9). A missing reading is UNREADABLE,
 * never a pass and never the app's failure: a row never read before or after
 * a rename (RNP, RN0, RN2, RN5), app.log never read around one (RNP, RN0; it
 * is read with its one rotated file, and RN6 is no reading when the log
 * rotated past it), the status after the Allow or its face, the far server
 * before a refused name, no file read for RN6, a parent's or HEAD's tmux name
 * or row (RN7), and a launch whose own agents:list was never read (RUN). A
 * start the phone's Mac answered and refused is RN3's FAIL, never no reading.
 *
 * THE FIX ROUND of 2026-10-30 (build/p349/SPEC.md §As built), after the verify
 * lens ran this file live: RN5 renamed a session whose draft it never opened
 * (the far folder's tab was focused, its row was not drawn, and F2 opened the
 * active session's draft), so the session's own tab is focused first and a
 * draft whose session is another's is UNREADABLE; RN6 walked the harness
 * folder as `/var/…` while every store was built under `/private/var/…`, so no
 * store was ever named, and the manifest's own backup ring was named nowhere,
 * so paths are compared canonical (`canonicalOf`, `storeOfFile`) and the ring
 * is a store; and RUN no longer fails a run whose P349_ARMS start no agent.
 */

import { execFile, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { keyscanText } from '../ssh-run.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentBinaries, hiddenAgentsBesides, hiddenAgentsPrecheck, hiddenAgentsScanVerdict, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { endSession, freshWriteId, makePhone, pairThrough, rawExchange, readOffer, readSessions, signedGet, signedHeadersFor, signedPost, startAnswerOf, startSession, writeBodyOf } from '../p316/node-phone.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin } from '../p332/dns-standin.mjs';
import { STANDIN_PATH, hellos, writeWrappers } from '../p318/stand-in.mjs';
import { manifestSessions, within } from '../scratch-login.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hr = () => process.hrtime.bigint();

// ---------------------------------------------------------------------------
// What the run holds the app against, BY VALUE, or read from the checkout
// ---------------------------------------------------------------------------

/** The parent this phase is measured against (build/p349/SPEC.md: origin/main at the rebuild). */
export const SNAPSHOT = '40aebfcc';
export const MACHINE_ID = 'p349far';
export const MACHINE_LABEL = 'p349 loopback';
/** The one route this phase adds (§4.1). */
export const NEW_ROUTES = Object.freeze(['rename']);
/** The door's answer bound, src/main/pocket/door/limits.ts `ANSWER_TIMEOUT_MS` (RN4). */
export const ANSWER_TIMEOUT_MS = 15_000;
/** RN4's rounds, as M2's (§2.2). */
export const RN4_ROUNDS = 30;
/** How long a moved history is waited on, starting nothing, before it is read again (his rule of 2026-10-20). */
export const HISTORY_QUIET_MS = 180_000;
/** The phrase a rename is logged under (writes.ts `logWrite`, step 7). */
export const LOG_PHRASE = Object.freeze({ rename: "the phone's rename:" });
/** The names D7's dedupe treats as always taken (src/main/tmux/names.ts `RESERVED_TMUX_NAMES`), by value. */
export const RESERVED_TMUX = Object.freeze(['gmux-control']);

const ch = (unit) => String.fromCharCode(unit);
const BS = ch(92);
const FAMILY = [0x1f468, 0x1f469, 0x1f467, 0x1f466].map((c) => String.fromCodePoint(c)).join(String.fromCodePoint(0x200d));

/**
 * §2.1.1's 54 names, the reconstructed M1 corpus, as SPEC §2.1.1 spells them:
 * the 25 today's rule keeps exact on 3.5a to 3.6b, then the 29 it loses
 * everywhere. Not one holds `#(`.
 */
export const CORPUS = Object.freeze([
  'plain name', 'claude-3', 'fix--auth', "it's", 'PR #12', '#x', '#[fg=red]ok', '50% done', '%Y', 'a;b',
  'gmux-control', `caf${String.fromCodePoint(0xe9)} ${String.fromCodePoint(0x2615)}`,
  [0x645, 0x631, 0x62d, 0x628, 0x627, 0x20, 0x628, 0x627, 0x644, 0x639, 0x627, 0x644, 0x645].map((c) => String.fromCodePoint(c)).join(''),
  [0x65e5, 0x672c, 0x8a9e, 0x306e, 0x30bb, 0x30c3, 0x30b7, 0x30e7, 0x30f3].map((c) => String.fromCodePoint(c)).join(''),
  `${FAMILY} fam`, 'a'.repeat(120), 'b'.repeat(121), 'x'.repeat(250),
  '/review', '.env fix', '-x', '--', 'cost $HOME', 'fix #', 'C#',
  `a${BS}b`, `c${BS}`, BS, BS + BS, `path${BS}to${BS}file`, `x${BS}y z`,
  '$0', '$HOME x', 'x;', 'a;b;',
  '#{session_id}', '#H', '#S', '#D', '#W', '#h', '#F', '#I', '#P', '#T',
  '##', '#,', '#}', '#{x', 'PR #{session_name}', 'fix #H here', 'a##b', '#{?pane_dead,dead,live}', 'deploy #S now'
]);

/**
 * The entry's Method 1 names the corpus does not already hold: a name the
 * trim changes, and every name the rule refuses (empty, spaces only, and each
 * refused unit inside a name: TAB, LF, CR, a C0 control, DEL, a C1 control, a
 * bidi override and isolate, the two separators, half a surrogate pair each
 * way). 120 and 121 units, the family and Arabic are the corpus's.
 */
export const METHOD1_EXTRAS = Object.freeze([
  '  padded name  ', '', '   ',
  `a${ch(9)}b`, `a${ch(10)}b`, `a${ch(13)}b`, `a${ch(7)}b`, `a${ch(0x7f)}b`, `a${ch(0x85)}b`,
  `a${ch(0x202e)}b`, `a${ch(0x2066)}b`, `a${ch(0x2028)}b`, `a${ch(0x2029)}b`, `a${ch(0xd800)}b`, `a${ch(0xdc00)}b`
]);
/** Every name RN1 types at every target, in this order; each target's RN6 canary comes after. */
export const MATRIX = Object.freeze([...CORPUS, ...METHOD1_EXTRAS]);
/** RN2's typed name: its far D7 form and its stamp form both differ from it. */
export const RN2_TYPED = 'p349 rn2 #H x;';

// ---------------------------------------------------------------------------
// THIS FILE'S OWN READINGS OF THE RULES (Method 1): transcribed from SPEC
// §4.3 steps 1 and 5 and D15, never imported, so the app is held to the spec
// rather than to itself.
// ---------------------------------------------------------------------------

/** ECMAScript's own trim, which is how the Mac trims a name (D5). */
export const trimmedOf = (name) => String(name).trim();

/** D5, this file's reading: `empty`, `long`, `character` or null, in that order, over the trimmed name. */
export function ownRefusal(name) {
  const t = trimmedOf(name);
  if (t.length === 0) return 'empty';
  if (t.length > 120) return 'long';
  for (let i = 0; i < t.length; i += 1) {
    const u = t.charCodeAt(i);
    if (u >= 0xd800 && u <= 0xdbff) {
      const n = i + 1 < t.length ? t.charCodeAt(i + 1) : -1;
      if (n >= 0xdc00 && n <= 0xdfff) {
        i += 1;
        continue;
      }
      return 'character';
    }
    if (u >= 0xdc00 && u <= 0xdfff) return 'character';
    if (u <= 0x1f || u === 0x7f || (u >= 0x80 && u <= 0x9f) || (u >= 0x202a && u <= 0x202e) || (u >= 0x2066 && u <= 0x2069) || u === 0x2028 || u === 0x2029) return 'character';
  }
  return null;
}

/** The sentence each refusal is said in, by the constant that says it (§5.1). */
export const SENTENCE_OF = Object.freeze({ empty: 'SESSION_NAME_EMPTY', long: 'SESSION_NAME_TOO_LONG', character: 'SESSION_NAME_CHARACTER' });

/** The format letters and syntax every measured version reads after a `#` (M1's scan). */
const READS_AFTER_HASH = new Set(['{', '(', '#', ',', '}', 'D', 'F', 'H', 'I', 'P', 'S', 'T', 'W', 'h']);

/** D7's local rule without the dedupe, this file's reading: strip, fold, trim, `.:/` as `-`, cut at 200, hold back, fall back. */
export function d7Sanitize(display) {
  let cleaned = '';
  for (const c of String(display)) {
    const u = c.codePointAt(0) ?? 0;
    if ((u <= 0x08) || u === 0x0b || u === 0x0c || (u >= 0x0e && u <= 0x1f) || (u >= 0x7f && u <= 0x9f)) continue;
    cleaned += c;
  }
  cleaned = cleaned.replace(/\s+/g, ' ').trim().replace(/[.:/]/g, '-').slice(0, 200);
  const units = [...cleaned];
  const out = [...units];
  units.forEach((c, i) => {
    if (c === BS) out[i] = '_';
    if (c === '#' && (i === units.length - 1 || READS_AFTER_HASH.has(units[i + 1] ?? ''))) out[i] = '_';
  });
  if (out.length > 0 && out[out.length - 1] === ';') out[out.length - 1] = '_';
  if (out.length > 0 && (out[0] === '-' || out[0] === '$')) out[0] = '_';
  const held = out.join('');
  return held.length > 0 ? held : 'session';
}

/** D7's dedupe: the name, then `-2`, `-3`, … against what is taken and the reserved names. */
export function d7Dedupe(name, taken = new Set()) {
  const free = (n) => !taken.has(n) && !RESERVED_TMUX.includes(n);
  if (free(name)) return name;
  for (let i = 2; ; i += 1) if (free(`${name}-${String(i)}`)) return `${name}-${String(i)}`;
}

/** This Mac's tmux name for a display name, `taken` the other sessions' names on its server. */
export const d7Local = (display, taken = new Set()) => d7Dedupe(d7Sanitize(display), taken);
/** A far tmux name, `taken` the machine's other sessions' names: every `$` as `_` too (Phase 342). */
export const d7Far = (display, taken = new Set()) => d7Dedupe(d7Sanitize(display).replace(/\$/g, '_'), taken);
/** D15: a stamp's final `;` sent as a backslash then `;`, nothing else changed. */
export const stampFormOf = (value) => (String(value).endsWith(';') ? `${String(value).slice(0, -1)}${BS};` : String(value));

/**
 * The cells a code point takes on a terminal, as tmux counts them for a client
 * with no UTF-8 locale (§2.2, M2): 0 for a joiner, a variation selector or a
 * combining mark, 2 for an East Asian wide character or a pictograph, else 1.
 */
export function cellsOf(point) {
  const p = Number(point);
  if (p === 0x200b || p === 0x200c || p === 0x200d || (p >= 0xfe00 && p <= 0xfe0f) || (p >= 0x0300 && p <= 0x036f) || (p >= 0x20d0 && p <= 0x20ff) || (p >= 0xe0100 && p <= 0xe01ef)) return 0;
  if (
    (p >= 0x1100 && p <= 0x115f) ||
    (p >= 0x2e80 && p <= 0x303e) ||
    (p >= 0x3041 && p <= 0x33ff) ||
    (p >= 0x3400 && p <= 0x4dbf) ||
    (p >= 0x4e00 && p <= 0x9fff) ||
    (p >= 0xa000 && p <= 0xa4cf) ||
    (p >= 0xac00 && p <= 0xd7a3) ||
    (p >= 0xf900 && p <= 0xfaff) ||
    (p >= 0xfe30 && p <= 0xfe4f) ||
    (p >= 0xff00 && p <= 0xff60) ||
    (p >= 0xffe0 && p <= 0xffe6) ||
    p === 0x231a || p === 0x231b || p === 0x2614 || p === 0x2615 || (p >= 0x2648 && p <= 0x2653) || p === 0x267f || p === 0x2693 || p === 0x26a1 || p === 0x26aa || p === 0x26ab || p === 0x26bd || p === 0x26be || p === 0x26c4 || p === 0x26c5 || p === 0x26ce || p === 0x26d4 || p === 0x26ea || p === 0x26f2 || p === 0x26f3 || p === 0x26f5 || p === 0x26fa || p === 0x26fd || p === 0x2705 || p === 0x270a || p === 0x270b || p === 0x2728 || p === 0x274c || p === 0x274e || (p >= 0x2753 && p <= 0x2755) || p === 0x2757 || (p >= 0x2795 && p <= 0x2797) || p === 0x27b0 || p === 0x27bf || p === 0x2b1b || p === 0x2b1c || p === 0x2b50 || p === 0x2b55 ||
    (p >= 0x1f000 && p <= 0x1faff) ||
    (p >= 0x20000 && p <= 0x3fffd)
  ) {
    return 2;
  }
  return 1;
}

/**
 * What a name reads back as through a carriage that forwards no UTF-8 locale
 * (§2.2, M2): every printable ASCII character as it is, every other code point
 * one `_` per CELL it takes (THE PROBE REVIEW: per cell, not per code point;
 * M2 measured three pictographs and two joiners as `______ fam`).
 */
export function farReadBackOf(text) {
  let out = '';
  for (const c of String(text)) {
    const p = c.codePointAt(0) ?? 0;
    out += p >= 0x20 && p <= 0x7e ? c : '_'.repeat(cellsOf(p));
  }
  return out;
}

/** RN2's names to look for in the far log: the typed name, its far D7 form and its stamp form, each once. */
export const rn2NamesOf = (typed) => [...new Set([String(typed), d7Far(typed), stampFormOf(typed)])];

/**
 * THE PROBE REVIEW (rule 9), finding 2: the ABSOLUTE folders a checkout's
 * resolver always searches, read from `extraBinDirsFor` in its
 * src/main/tmux/resolve.ts as text (every string literal in the function that
 * begins with `/`); null when the function cannot be found, which refuses the
 * launch rather than searching nothing.
 */
export function absoluteScanDirsOf(resolveText) {
  const src = String(resolveText ?? '');
  const at = src.indexOf('export function extraBinDirsFor(');
  if (at === -1) return null;
  const end = src.indexOf('\n}\n', at);
  const body = src.slice(at, end === -1 ? src.length : end);
  return [...new Set([...body.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]))];
}

/**
 * Where a copy of `names` sits in `dirs`: `{ ok, copies, unreadable }`, ok
 * when no folder holds one and every folder that exists could be read. The
 * file system is handed in, so the self-test reads no folder of his.
 */
export function shadowCopiesOf(dirs, names, fs = { list: (d) => readdirSync(d) }) {
  const copies = [];
  const unreadable = [];
  for (const dir of dirs) {
    let entries = null;
    try {
      entries = fs.list(dir);
    } catch (err) {
      if (err?.code !== 'ENOENT') unreadable.push(dir);
      continue;
    }
    for (const name of names) if (entries.includes(name)) copies.push(join(dir, name));
  }
  return { ok: copies.length === 0 && unreadable.length === 0, copies, unreadable };
}

/**
 * Whether his shell history held across the run (his rule of 2026-10-20):
 * `unmoved`; `his terminal` when it moved and moved again over a quiet wait in
 * which this run started nothing; `held` when it moved and then held still,
 * which is this run's write; `unread` when it moved and was never read again.
 */
export function historyHeld(history) {
  if (history?.before === history?.after) return 'unmoved';
  if (history?.quiet === null || history?.quiet === undefined || typeof history.quiet.again !== 'string') return 'unread';
  return history.quiet.again !== history.after ? 'his terminal' : 'held';
}

/** A string literal's value: `NAME = '…'` (or with a type), joined across `+` pieces and a line break. */
export function constWord(src, name) {
  const at = new RegExp(`\\b${name}\\s*(?::[^=]*)?=\\s*`).exec(String(src ?? ''));
  if (at === null) return null;
  let rest = src.slice(at.index + at[0].length);
  const out = [];
  for (;;) {
    const m = /^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/.exec(rest);
    if (m === null) break;
    out.push((m[1] ?? m[2]).replace(/\\(.)/g, '$1'));
    rest = rest.slice(m[0].length);
    const plus = /^\s*\+/.exec(rest);
    if (plus === null) break;
    rest = rest.slice(plus[0].length);
  }
  return out.length === 0 ? null : out.join('');
}

/** A string literal reached by a path of names inside an object literal, or null when an anchor is missing. */
export function literalAt(src, anchors, key) {
  let rest = String(src ?? '');
  for (const a of anchors) {
    const at = new RegExp(`\\b${a}\\b\\s*[:=]`).exec(rest);
    if (at === null) return null;
    rest = rest.slice(at.index + at[0].length);
  }
  const m = new RegExp(`\\b${key}\\s*:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`).exec(rest);
  return m === null ? null : (m[1] ?? m[2]).replace(/\\(.)/g, '$1');
}

/** The words the Mac says, read from the checkout's own source (never typed here twice). */
export function wordsOf(checkout) {
  const src = (rel) => {
    try {
      return readFileSync(join(checkout, rel), 'utf8');
    } catch {
      return '';
    }
  };
  const pocket = src('src/shared/ipc/pocket.ts');
  const lifecycle = src('src/shared/lifecycle-words.ts');
  const names = src('src/shared/session-names.ts');
  return {
    renameTitle: literalAt(pocket, ['POCKET_NEW_ROUTE_WORDS', 'rename'], 'title'),
    renameSentence: literalAt(pocket, ['POCKET_NEW_ROUTE_WORDS', 'rename'], 'sentence'),
    renameClause: literalAt(pocket, ['POCKET_HONESTY_ADDED'], 'rename'),
    doorHonesty: constWord(pocket, 'POCKET_DOOR_HONESTY'),
    LIFECYCLE_SESSION_CHANGED: constWord(lifecycle, 'LIFECYCLE_SESSION_CHANGED'),
    SESSION_NOT_FOUND: constWord(lifecycle, 'SESSION_NOT_FOUND'),
    RENAME_UNREACHABLE: constWord(lifecycle, 'RENAME_UNREACHABLE'),
    SESSION_NAME_EMPTY: constWord(names, 'SESSION_NAME_EMPTY'),
    SESSION_NAME_TOO_LONG: constWord(names, 'SESSION_NAME_TOO_LONG'),
    SESSION_NAME_CHARACTER: constWord(names, 'SESSION_NAME_CHARACTER')
  };
}

/** The status code at the head of a raw HTTP answer, or 0 when nothing came. */
export function statusOfBytes(bytes) {
  const m = /^HTTP\/1\.1 (\d{3})/.exec(Buffer.from(bytes ?? Buffer.alloc(0)).toString('latin1'));
  return m === null ? 0 : Number(m[1]);
}

/**
 * A head-only exchange, read (probe:p346's rule): the status at the head of
 * what came back; `0` ONLY when the handshake held and nothing came back
 * before the idle timeout, which is a door waiting for the body; `-1` for
 * anything else that carried no status.
 */
export function headOnlyReading(got) {
  const status = statusOfBytes(got?.bytes);
  if (status !== 0) return status;
  return got?.handshook === true && got?.error === 'timed out' && Buffer.from(got?.bytes ?? Buffer.alloc(0)).length === 0 ? 0 : -1;
}

/**
 * The far log (build/p326/far-tmux.sh), read: one entry per invocation,
 * `{ at, pid, words, verb }`, or a note `{ at, pid, note }`. The verb is the
 * first word after tmux's leading global options.
 */
export function farLogEntries(text) {
  const out = [];
  for (const line of String(text ?? '').split('\n')) {
    const m = /^(\d+) (\d+) (.*)$/.exec(line);
    if (m === null) continue;
    const at = Number(m[1]);
    const pid = Number(m[2]);
    if (m[3].startsWith('# ')) {
      out.push({ at, pid, note: m[3].slice(2) });
      continue;
    }
    const words = [...m[3].matchAll(/'((?:[^']|'\\'')*)'|(\S+)/g)].map((w) => (w[1] ?? w[2]).replace(/'\\''/g, "'"));
    let i = 0;
    while (i < words.length) {
      const w = words[i];
      if (['-L', '-S', '-f', '-T', '-c'].includes(w)) i += 2;
      else if (w === '--') {
        i += 1;
        break;
      } else if (w.startsWith('-')) i += 1;
      else break;
    }
    out.push({ at, pid, words, verb: words[i] ?? '' });
  }
  return out;
}

/** The renames and the `@gmux-name` stamps of the far log inside `[from, to]`, as the value each carried. */
export function farRenamesIn(entries, from, to) {
  const inside = entries.filter((e) => e.words !== undefined && e.at >= from && e.at <= to);
  return {
    renamed: inside.filter((e) => e.verb === 'rename-session').map((e) => e.words[e.words.length - 1]),
    stamped: inside.filter((e) => e.verb === 'set-option' && e.words.includes('@gmux-name')).map((e) => e.words[e.words.length - 1])
  };
}

/** The far log's invocations inside `[from, to]` carrying any of `names` in any word. */
export function farNaming(entries, from, to, names) {
  return entries
    .filter((e) => e.words !== undefined && e.at >= from && e.at <= to)
    .filter((e) => names.some((n) => typeof n === 'string' && n !== '' && e.words.some((w) => w.includes(n))))
    .map((e) => e.words.join(' '));
}

/** The outcomes a rename answer may carry (§4.2 step 2). Its `reason` is read as an OPEN word. */
export const RENAME_OUTCOMES = Object.freeze(['done', 'refused', 'failed', 'busy']);

/**
 * A rename's answer, read the way the phone must (§4.1, `PocketRenameAnswer`):
 * exactly the six fields `verb, write, outcome, reason, sentence, name` in that
 * order, `verb` `rename`, a closed outcome, a `reason` that is a non-empty
 * string exactly when `refused` (an OPEN word), a sentence exactly when not
 * `done`, a `name` that is a non-empty string exactly when `done` (D21), and
 * the echo equal to the id sent, or `""` with `refused` and `malformed`.
 * Anything else is `{ ok: false }` with a reason, which the phone reads as no
 * answer.
 */
export function renameAnswerOf(answer, sentWrite) {
  if (answer?.status !== 200) return { ok: false, why: `status ${String(answer?.status)}${answer?.error ? ` (${answer.error})` : ''}` };
  let body;
  try {
    body = JSON.parse(answer.body);
  } catch {
    return { ok: false, why: 'the body is not JSON' };
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { ok: false, why: 'the body is not an object' };
  const keys = J(Object.keys(body));
  if (keys !== J(['verb', 'write', 'outcome', 'reason', 'sentence', 'name'])) return { ok: false, why: `the keys are ${keys}` };
  if (body.verb !== 'rename') return { ok: false, why: `verb ${J(body.verb)}` };
  if (typeof body.write !== 'string') return { ok: false, why: 'the write id is not a string' };
  if (!RENAME_OUTCOMES.includes(body.outcome)) return { ok: false, why: `outcome ${J(body.outcome)}` };
  if (body.reason !== null && (typeof body.reason !== 'string' || body.reason === '')) return { ok: false, why: `reason ${J(body.reason)}` };
  if ((body.outcome === 'refused') !== (body.reason !== null)) return { ok: false, why: 'a reason without a refusal, or a refusal without a reason' };
  if (body.sentence !== null && (typeof body.sentence !== 'string' || body.sentence === '')) return { ok: false, why: `sentence ${J(body.sentence)}` };
  if ((body.outcome === 'done') !== (body.sentence === null)) return { ok: false, why: 'a sentence on done, or none on anything else' };
  if ((body.outcome === 'done') !== (typeof body.name === 'string' && body.name !== '')) return { ok: false, why: 'a name on an answer that is not done, or none on done' };
  if (body.outcome !== 'done' && body.name !== null) return { ok: false, why: `a name ${J(body.name)} on ${J(body.outcome)}` };
  const echoed = body.write === sentWrite || (body.write === '' && body.outcome === 'refused' && body.reason === 'malformed');
  if (!echoed) return { ok: false, why: 'the echo is not the write id sent' };
  return { ok: true, why: '', answer: body };
}

/** Whether an answer acted, the way main logs it (writes.ts step 7): a 200 that is not busy, malformed or a ledger repeat. */
export function actedOf(a, { repeat = false } = {}) {
  if (a?.status !== 200 || a.ok !== true) return a?.status === 0 ? 'unknown' : 'no';
  if (repeat || a.outcome === 'busy') return 'no';
  if (a.outcome === 'refused' && a.reason === 'malformed') return 'no';
  return 'yes';
}

/**
 * A command line that IS a rename's own store: a `rename-session`, or a
 * `set-option` of `@gmux-name`, to this Mac's tmux or through the carriage.
 * A typed name in such an argv is where the name is meant to go (RN6 counts it
 * apart and prints it); in any other argv it is a leak.
 */
export const storeArgv = (command) => /\brename-session\b/.test(String(command)) || /\bset-option\b[\s\S]*@gmux-name\b/.test(String(command));

/**
 * A path as macOS names it once its `/var`, `/tmp` or `/etc` link into
 * `/private` is followed (THE FIX ROUND of 2026-10-30): the harness folder is
 * handed as `$TMPDIR/…`, which is `/var/folders/…`, while this run's stores
 * are built under its REAL path, `/private/var/folders/…`, so a walk of the
 * one compared with the other by string never named a store.
 */
export const canonicalOf = (p) => String(p ?? '').replace(/^\/(var|tmp|etc)(?=\/|$)/, '/private/$1');

/**
 * Which named store a file is, or null (RN6). `places` holds this run's
 * `manifest`, `copies` (the manifest copies RUN reads), `backups` (the
 * manifest's own backup ring, src/main/manifest/recovery.ts:
 * `manifest.db.<generation>` and a staged `.manifest.db.<stamp>.part`, which
 * hold every name the manifest holds and are older than this phase),
 * `snapshots` and `farLog`; every path is compared canonical (`canonicalOf`).
 */
export function storeOfFile(p, places) {
  const at = canonicalOf(p);
  const is = (x) => typeof x === 'string' && x !== '' && at === canonicalOf(x);
  const inside = (dir) => typeof dir === 'string' && dir !== '' && at.startsWith(`${canonicalOf(dir)}/`);
  if (is(places.manifest) || is(`${places.manifest}-wal`) || is(`${places.manifest}-shm`) || inside(places.copies)) return 'the manifest';
  if (inside(places.backups) && /^\.?manifest\.db\./.test(basename(at))) return "the manifest's own backups";
  if (inside(places.snapshots)) return 'the snapshot capsules';
  if (is(places.farLog)) return "the run's far log";
  return null;
}

/** The Mac's own quit-time scrollback line (`snapshotPassLine`, src/main/sessions/reconcile-plan.ts). */
const SCROLLBACK_PASS_LINE = /scrollback pass \([^)]*\) over \d+ sessions?: /;

/**
 * The canaries an app.log text holds, told apart by the line they are on
 * (THE FIX ROUND of 2026-10-30, the verify lens): `known` counts a canary
 * found ONLY on the Mac's own scrollback-pass line, which names every
 * session it could not write by its display name (`Not written: "<name>"
 * (nothing on screen)`), a name typed on the Mac as much as one typed on the
 * phone, and is older than this phase (SPEC §12.1); `hits` counts a canary on
 * any other line, which is a leak.
 */
export function appLogCanaryHits(text, canaries) {
  const lines = String(text ?? '').split('\n');
  let hits = 0;
  let known = 0;
  for (const c of canaries) {
    const on = lines.filter((l) => l.includes(c));
    if (on.length === 0) continue;
    if (on.every((l) => SCROLLBACK_PASS_LINE.test(l))) known += 1;
    else hits += 1;
  }
  return { hits, known };
}

/** The two arms that start an agent session (`agentSession` in RN1, the phone's start in RN3): RUN's agents clause reads as not run without them. */
export const AGENT_ARMS = Object.freeze(['RN1', 'RN3']);

// ---------------------------------------------------------------------------
// The graders: pure, over a recorded reading, each clause shown to fail
// ---------------------------------------------------------------------------

const deepEqual = (a, b) => J(a) === J(b);
const doneOf = (a) => a?.status === 200 && a.ok === true && a.outcome === 'done';
const refusedOf = (a, reason, sentence) => a?.status === 200 && a.ok === true && a.outcome === 'refused' && a.reason === reason && (sentence === undefined || a.sentence === sentence);
const unchanged = (c) => c?.before !== undefined && c?.before !== null && deepEqual(c.before, c.after);
const LOCAL_LIVE = Object.freeze(['shell', 'claude', 'codex']);
/** The five targets of RN1, in this order (§8.1). */
export const RN1_KINDS = Object.freeze(['shell', 'claude', 'codex', 'ended', 'far']);

/** The answer could be read the phone's way: a 200 whose six fields read (RN1's first clause; the rest read its fields). */
const answerRead = (e) => e.answer?.status === 200 && e.answer.ok === true;
/** One rename of RN1 (or RN3) the rule takes: it answered done with the name main stored. */
function answeredDone(e, kind) {
  const t = trimmedOf(e.typed);
  const names = kind === 'far' ? [t, farReadBackOf(t)] : [t];
  return e.answer?.outcome === 'done' && names.includes(e.answer.name);
}
/** It landed as typed, trimmed, in the manifest's own copy and in the window's list. */
function landsAsTyped(e, kind) {
  const t = trimmedOf(e.typed);
  const names = kind === 'far' ? [t, farReadBackOf(t)] : [t];
  return e.after?.list !== null && names.includes(e.after?.list?.name) && e.after?.manifest !== null && names.includes(e.after?.manifest?.name);
}
/** On this Mac: tmux holds D7's name by `$`-id, and the list and the manifest agree with it (an ended row: the manifest alone). */
function tmuxHoldsD7(e, kind) {
  const t = trimmedOf(e.typed);
  if (kind === 'ended') return e.after?.tmux === null && e.after?.manifest?.tmuxName === d7Sanitize(t) && e.after?.list?.tmuxName === e.after.manifest.tmuxName;
  const want = d7Local(t, new Set(e.takenTmux ?? []));
  return e.after?.tmux === want && e.after?.list?.tmuxName === want && e.after?.manifest?.tmuxName === want;
}
/** On the machine: `@gmux-name` holds the typed name and the tmux name D7's far rule, sent so and read back so. */
function farHoldsD7(e) {
  const t = trimmedOf(e.typed);
  const far = d7Far(t, new Set(e.takenFar ?? []));
  return (
    e.after?.far?.name === far &&
    e.after?.far?.gmuxName === t &&
    e.farLog?.read === true &&
    e.farLog.stamped.includes(stampFormOf(t)) &&
    (e.farLog.renamed.includes(far) || e.before?.far?.name === far) &&
    [far, farReadBackOf(far)].includes(e.after?.list?.tmuxName)
  );
}
/** A name the rule refuses: `refused` `name` in the rule's own sentence, and nothing changed anywhere. */
function refusedUnchanged(e, kind, words) {
  const why = ownRefusal(e.typed);
  const sentence = words?.[SENTENCE_OF[why]];
  if (e.answer?.outcome !== 'refused' || e.answer.reason !== 'name' || typeof sentence !== 'string' || e.answer.sentence !== sentence) return false;
  if (!deepEqual(e.before?.list, e.after?.list) || !deepEqual(e.before?.manifest, e.after?.manifest)) return false;
  if (kind === 'far') return deepEqual(e.before?.far, e.after?.far) && e.farLog?.read === true && e.farLog.renamed.length === 0 && e.farLog.stamped.length === 0;
  return e.before?.tmux === e.after?.tmux;
}
const takenEntries = (r) => r.targets.flatMap((tg) => tg.renames.filter((e) => ownRefusal(e.typed) === null).map((e) => ({ e, kind: tg.kind })));
const refusedEntries = (r) => r.targets.flatMap((tg) => tg.renames.filter((e) => ownRefusal(e.typed) !== null).map((e) => ({ e, kind: tg.kind })));
/** RN7's score of one rename op: 2 landed with tmux exact, 1 landed, 0 refused, lost or rewritten. */
export function rn7Score(op, typed) {
  if (op === null || op === undefined || op.ok !== true || op.name !== typed) return 0;
  return typeof op.tmux === 'string' && op.tmux === op.tmuxName ? 2 : 1;
}

export const GRADERS = {
  RNP: {
    title: 'the parent has no rename route, and offers none',
    clauses: [
      ['rename answers 404 before its body and to a whole request', (r) => r.renameHead === 404 && r.renameFull === 404],
      ["nothing reached the parent's main: no write line, the row's name unchanged", (r) => r.lines === 0 && unchanged(r.row)],
      ['no row or answer carries rename or renames', (r) => r.offers.detail === false && r.offers.sessionsRows === false && r.offers.renames === false && r.offers.blocked === false]
    ]
  },
  RN0: {
    title: 'rename waits for its own Allow, then is answered and offered',
    clauses: [
      ['an agreement is on record and exactly rename waits', (r) => r.before.confirmState === 'confirmed' && deepEqual(r.before.routesWaiting, NEW_ROUTES) && !r.before.routesAllowed.includes('rename')],
      ['rename answers 404 before its body, and nothing reaches main', (r) => r.renameHead === 404 && r.renameFull === 404 && r.linesBefore === 0 && unchanged(r.row)],
      ['no row carries rename and no answer renames while it waits', (r) => r.offersBefore.detail === false && r.offersBefore.sessionsRows === false && r.offersBefore.renames === false && r.offersBefore.blocked === false],
      ['the face says New: rename sessions from your phone and its sentence above Allow', (r) => r.face.length === 1 && r.face[0].id === 'rename' && r.face[0].title === `New: ${r.words.renameTitle}` && r.face[0].sentence === r.words.renameSentence && typeof r.drawn === 'string' && r.drawn.includes(r.face[0].title) && r.drawn.includes(r.words.renameSentence)],
      ['the honesty sentence names rename a session', (r) => Array.isArray(r.honesty) && typeof r.words.doorHonesty === 'string' && r.words.doorHonesty !== '' && r.honesty.some((p) => typeof p === 'string' && p.startsWith(r.words.doorHonesty) && p.includes(r.words.renameClause))],
      ['one Allow, and nothing waits', (r) => r.allowPresses === 1 && r.after.confirmState === 'confirmed' && r.after.routesWaiting.length === 0 && r.after.routesAllowed.includes('rename')],
      ['after Allow rename waits for a body, and the offers appear', (r) => r.renameControl === 0 && r.offersAfter.detail === true && r.offersAfter.sessionsRows === true && r.offersAfter.renames === true]
    ]
  },
  RN1: {
    title: "Method 1's matrix: every name graded against the name typed",
    clauses: [
      ["every answer is the six fields, read the phone's way", (r) => r.targets.every((tg) => tg.renames.every((e) => answerRead(e)))],
      ['each name the rule takes answers done with the name main stored', (r) => takenEntries(r).every(({ e, kind }) => answeredDone(e, kind))],
      ["it lands as typed, trimmed, in the manifest and in the window's list", (r) => takenEntries(r).every(({ e, kind }) => landsAsTyped(e, kind))],
      ["tmux holds D7's name by $-id on this Mac", (r) => takenEntries(r).filter(({ kind }) => kind !== 'far').every(({ e, kind }) => tmuxHoldsD7(e, kind))],
      ["the far @gmux-name holds the typed name and the far tmux name D7's far rule", (r) => takenEntries(r).filter(({ kind }) => kind === 'far').every(({ e }) => farHoldsD7(e))],
      ['every refused name answers refused name in its sentence and nothing changes', (r) => refusedEntries(r).every(({ e, kind }) => refusedUnchanged(e, kind, r.words))]
    ]
  },
  RN2: {
    title: 'an ended session on another machine offers and takes no rename',
    clauses: [
      ['the record the parent ended is refused changed, its name unchanged', (r) => refusedOf(r.record.answer, 'changed', r.words.LIFECYCLE_SESSION_CHANGED) && r.record.before.name === r.record.after.name],
      ['the one ended in this run is refused changed, its name unchanged', (r) => refusedOf(r.gone.answer, 'changed', r.words.LIFECYCLE_SESSION_CHANGED) && r.gone.before.name === r.gone.after.name],
      ['the far log holds no command carrying the typed name, its far D7 form or its stamp form', (r) => r.far.read === true && deepEqual(r.far.names, rn2NamesOf(RN2_TYPED)) && r.far.hits.length === 0]
    ]
  },
  RN3: {
    title: 'a start from the phone, then a rename, on this Mac and on the machine',
    clauses: [
      ["the phone's start of the Claude Code stand-in answered done", (r) => r.local.start.status === 200 && r.local.start.ok === true && r.local.start.outcome === 'done' && typeof r.local.start.id === 'string' && r.local.start.id !== ''],
      ['the rename after it lands as RN1 grades it, on this Mac', (r) => ownRefusal(r.local.rename.typed) === null && answerRead(r.local.rename) && answeredDone(r.local.rename, 'claude') && landsAsTyped(r.local.rename, 'claude') && tmuxHoldsD7(r.local.rename, 'claude')],
      ['the far shell made through the Mac and renamed at once lands as RN1 grades it', (r) => ownRefusal(r.far.rename.typed) === null && answerRead(r.far.rename) && answeredDone(r.far.rename, 'far') && landsAsTyped(r.far.rename, 'far') && farHoldsD7(r.far.rename)]
    ]
  },
  RN4: {
    title: "a far rename, thirty rounds, inside the door's bound",
    clauses: [
      ['every round answered done', (r) => r.rounds.length === RN4_ROUNDS && r.rounds.every((x) => doneOf(x))],
      ["every round answered inside the door's 15,000 ms", (r) => r.limitMs === ANSWER_TIMEOUT_MS && r.rounds.every((x) => Number.isFinite(x.ms) && x.ms >= 0 && x.ms < r.limitMs)]
    ]
  },
  RN5: {
    title: "a Mac window's rename draft open while the phone's rename lands",
    clauses: [
      ["the phone's name lands while the draft is open", (r) => doneOf(r.answer) && r.listName === trimmedOf(r.typed)],
      ["the window's draft is dropped, as stated", (r) => r.draft.after === null || r.draft.after === trimmedOf(r.typed)],
      ['every other session reads unchanged', (r) => Array.isArray(r.others.before) && r.others.before.length > 0 && deepEqual(r.others.before, r.others.after)]
    ]
  },
  RN6: {
    title: 'where a typed name goes: the named stores, and nowhere else',
    clauses: [
      ['no typed name in any file under the profile, HOME or the run but the named stores', (r) => r.canaries > 0 && r.filesScanned > 0 && r.fileHits.every((h) => typeof h.store === 'string' && h.store !== '')],
      ['no typed name in app.log', (r) => r.appLogRead === true && r.appLogHits === 0],
      ['one log line per rename that acted', (r) => r.lines.rename >= r.acted.rename && r.lines.rename <= r.acted.rename + r.unknown.rename],
      ["no typed name in any argv the sampler saw but the rename's own tmux commands", (r) => r.argvSamples > 0 && r.argvHits === 0]
    ]
  },
  RN7: {
    title: "the Mac's own rename over the corpus, no name worse than the parent",
    clauses: [
      ['no name reads worse at HEAD than at the parent', (r) => r.names.length === CORPUS.length && r.names.every((n) => rn7Score(n.head, n.typed) >= rn7Score(n.parent, n.typed))],
      ["HEAD stores D7's tmux name for every name", (r) => r.names.every((n) => n.head?.tmuxName === d7Local(n.typed, new Set(n.head?.takenTmux ?? [])))],
      ['every name the parent lost HEAD lands whole', (r) => r.names.filter((n) => rn7Score(n.parent, n.typed) < 2).length > 0 && r.names.filter((n) => rn7Score(n.parent, n.typed) < 2).every((n) => rn7Score(n.head, n.typed) === 2)]
    ]
  },
  RUN: {
    title: 'no real Tailscale, no real DNS, no vendor agent, nothing left',
    clauses: [
      ['the Tailscale preflight passed', (r) => r.tailscalePreflight === true],
      ['the DNS preflight passed at every launch', (r) => r.dnsPreflights.length > 0 && r.dnsPreflights.every(Boolean)],
      ['the hidden agents held at every launch, and no shadow copy of a stand-in sat where the scan looks', (r) => r.agentsHeld.length > 0 && r.agentsHeld.every(Boolean) && r.shadows.length > 0 && r.shadows.every((s) => s.ok === true)],
      ['claude and codex resolved to the stand-ins and no hidden one resolved', (r) => r.resolved === true && r.hiddenUnresolved === true],
      ['every session the manifest holds ran a program of this run', (r) => r.manifest?.read === true && Array.isArray(r.manifest.outside) && r.manifest.outside.length === 0],
      // THE FIX ROUND of 2026-10-30: with RN1 and RN3 both left out no agent session starts, and the clause is not run.
      ['every agent session the run started is in the copy taken before the ends, its argv[0] inside the run', (r) => r.manifest?.agents?.read === true && (r.manifest.agents.armsRan === false ? r.manifest.agents.started.length === 0 : r.manifest.agents.started.length > 0 && r.manifest.agents.started.every((id) => r.manifest.agents.inside.includes(id)))],
      ['no real Tailscale in any sample, and nothing forbidden at the stand-in', (r) => r.realTailscale === 0 && r.samples > 0 && r.forbidden === 0],
      ['every stand-in and Electron ended, and nothing of this run is left', (r) => r.standinLeft === 0 && r.agentsLeft === 0 && r.runLeft === 0 && r.electronsLeft === 0],
      ['his shell history did not move across the run, or moved again while the run started nothing', (r) => ['unmoved', 'his terminal'].includes(historyHeld(r.history))]
    ]
  }
};

/**
 * A reading missing what an arm's clauses need is UNREADABLE, never a pass and
 * never the product's failure (docs/method/HOW-WE-BUILT-THIS.md rule 9). Each
 * entry answers why, or null when the reading can be graded.
 */
export const UNREADABLE_WHEN = {
  RNP: (r) =>
    r.offers === null || r.offers === undefined
      ? "the parent's detail and Sessions answer were never read, so their keys were not"
      : typeof r.row?.before?.name !== 'string' || typeof r.row?.after?.name !== 'string'
        ? "the parent's row was never read before and after the rename, so an unchanged name would be two missing reads (THE PROBE REVIEW of 2026-10-30)"
        : r.lines === null || r.lines === undefined
          ? "app.log was not read around the parent's rename, so no write line could be counted (THE PROBE REVIEW of 2026-10-30)"
          : null,
  RN0: (r) =>
    r.statusRead === false
      ? "the door's status was never read at HEAD, so rename could not be seen waiting"
      : r.offersBefore === null
        ? 'the offers were never read while rename waited'
        : r.offersAfter === null
          ? 'the offers were never read after the Allow'
          : typeof r.row?.before?.name !== 'string' || typeof r.row?.after?.name !== 'string'
            ? 'the row was never read before and after the waiting rename, so an unchanged name would be two missing reads (THE PROBE REVIEW of 2026-10-30)'
            : r.linesBefore === null || r.linesBefore === undefined
              ? 'app.log was not read around the waiting rename, so no write line could be counted (THE PROBE REVIEW of 2026-10-30)'
              : r.after?.routesWaiting === null || r.after?.routesWaiting === undefined
                ? "the door's status was never read after the Allow (THE PROBE REVIEW of 2026-10-30)"
                : r.faceRead === false
                  ? "the door's status was never read while rename waited, so its face was not (THE PROBE REVIEW of 2026-10-30)"
                  : null,
  RN1: (r) => {
    const kinds = r.targets.map((tg) => tg.kind);
    if (!deepEqual(kinds, RN1_KINDS)) return `the matrix ran over ${J(kinds)}, not the five targets ${J(RN1_KINDS)}`;
    for (const tg of r.targets) {
      if (tg.renames.length !== MATRIX.length + 1 || tg.renames.slice(0, MATRIX.length).some((e, i) => e.typed !== MATRIX[i])) return `the ${tg.kind} target was not asked every name of the matrix in order, then its canary`;
      for (const e of tg.renames) {
        if (e.before?.list === null || e.after?.list === null || e.before?.manifest === null || e.after?.manifest === null) return `a read of the ${tg.kind} row around ${J(e.typed)} was missing`;
        if (LOCAL_LIVE.includes(tg.kind) && (typeof e.before?.tmux !== 'string' || typeof e.after?.tmux !== 'string')) return `tmux was not read by $-id for the ${tg.kind} row around ${J(e.typed)}`;
        if (tg.kind === 'far' && (e.after?.far === null || e.after?.far === undefined || e.farLog?.read !== true)) return `the far server or the far log was not read around ${J(e.typed)}`;
        // THE PROBE REVIEW of 2026-10-30: a refused far name compares the far server before and after.
        if (tg.kind === 'far' && (e.before?.far === null || e.before?.far === undefined)) return `the far server was not read before ${J(e.typed)}`;
      }
    }
    return null;
  },
  RN2: (r) =>
    r.record === null || r.record === undefined
      ? "no record of a far session the parent ended was there to rename (the parent's half did not run)"
      : r.gone === null || r.gone === undefined
        ? 'no far session was ended in this run to rename'
        : r.far?.read !== true
          ? 'the far log could not be read'
          : [r.record, r.gone].some((x) => typeof x.before?.name !== 'string' || typeof x.after?.name !== 'string')
            ? 'an ended far row was not listed before and after its rename, so its unchanged name would be two missing reads (THE PROBE REVIEW of 2026-10-30)'
            : null,
  // THE PROBE REVIEW of 2026-10-30: a start that ANSWERED and was not done is the first clause's FAIL; only a start
  // that never answered, or a done start with no rename read, is no reading.
  RN3: (r) =>
    r.far === null || r.far === undefined
      ? 'the machine was not usable, so no far shell was made'
      : r.local?.start === null || r.local?.start === undefined || !(r.local.start.status > 0)
        ? "the phone's start was never answered"
        : r.local.start.outcome === 'done' && (r.local.rename === null || r.local.rename === undefined)
          ? "the phone's start answered a session and its rename was never read"
          : null,
  RN4: (r) => (r.rounds.length === 0 ? 'the machine was not usable, so no far rename was timed' : null),
  // THE FIX ROUND of 2026-10-30 (the verify lens): a draft F2 opened for ANOTHER session never meets the phone's rename.
  RN5: (r) =>
    typeof r.id !== 'string' || r.id === ''
      ? 'the renamed session is not named in the reading, so whose draft opened cannot be told'
      : r.owner !== r.id
        ? r.owner === null || r.owner === undefined
          ? "no rename draft opened in the window, so nothing was mid-rename"
          : `the draft F2 opened is session ${String(r.owner)}'s, not the renamed session's, so the phone's rename could not meet it`
        : r.opened !== true
      ? "the window's rename draft never opened, so nothing was mid-rename"
      : r.others?.before === null || r.others?.before === undefined || r.others?.after === null || r.others?.after === undefined || r.others.before.length === 0
        ? 'the other sessions were not read before and after (THE PROBE REVIEW: a missing read is no reading)'
        : typeof r.listName !== 'string'
          ? "the session's row was not read after the rename (THE PROBE REVIEW of 2026-10-30)"
          : null,
  RN6: (r) =>
    r.appLogRead !== true
      ? 'app.log could not be read'
      : r.canaries === 0
        ? 'no canary name was ever typed, so nothing could be looked for'
        : !(r.filesScanned > 0)
          ? 'no file under the harness folder was read, so no store could be told from a leak (THE PROBE REVIEW of 2026-10-30)'
          : r.logLost !== false || r.lines?.rename === null || r.lines?.rename === undefined
            ? 'app.log rotated past its one kept file, or was not read, so its write lines cannot be counted (THE PROBE REVIEW of 2026-10-30)'
            : null,
  RN7: (r) =>
    r.names.some((n) => n.parent === null || n.parent === undefined || n.parent.name === null || n.parent.tmuxName === null)
      ? 'a parent rename op has no display or stored name read (THE PROBE REVIEW: its half is hollow)'
      : r.names.some((n) => typeof n.parent.tmux !== 'string')
        ? "a parent rename op has no tmux name read by $-id, so its score would be lowered by a missing read (THE PROBE REVIEW of 2026-10-30)"
        : r.names.some((n) => n.head === null || n.head === undefined || n.head.name === null || n.head.tmuxName === null || typeof n.head.tmux !== 'string')
          ? "a HEAD rename op has no display, stored or tmux name read, so its score would be a missing read's (THE PROBE REVIEW of 2026-10-30)"
          : !r.names.some((n) => n.parent?.ok === true)
            ? 'nothing landed at the parent, so its half read nothing'
            : null,
  RUN: (r) =>
    r.manifest?.read !== true
      ? `the manifest could not be read after the app was gone (${String(r.manifest?.why ?? 'no reading')})`
      : r.manifest?.agents?.read === true && r.manifest.agents.started.some((id) => !r.manifest.agents.found.includes(id))
        ? 'an agent session the run started is not in the copy taken before the ends, so its argv[0] was not read'
        : Array.isArray(r.agentsHeld) && Array.isArray(r.shadows) && r.agentsHeld.length < r.shadows.filter((s) => s?.ok === true).length
          ? "a launch past its shadow refusal never read its own agents:list, so whether an agent ran there for its version is not known (THE PROBE REVIEW of 2026-10-30)"
        : typeof r.history?.before !== 'string' || typeof r.history?.after !== 'string' || r.history.before.split('|').includes('none') || r.history.after.split('|').includes('none')
          ? `his shell history could not be read (${J(r.history ?? null)})`
          : historyHeld(r.history) === 'unread'
            ? 'his shell history moved and was not read again after the quiet wait'
            : null
};

/** One arm's verdict, UNREADABLE asked first: `{ state: 'pass' | 'fail' | 'unreadable', failed, why }`. */
export function verdictOf(id, reading) {
  if (reading === null || reading === undefined || typeof reading !== 'object') return { state: 'unreadable', failed: [], why: 'there is no reading' };
  let why = null;
  try {
    why = UNREADABLE_WHEN[id]?.(reading) ?? null;
  } catch (err) {
    why = `the reading could not be asked whether it is whole (${String(err?.message ?? err)})`;
  }
  if (why !== null) return { state: 'unreadable', failed: [], why };
  const g = grade(id, reading);
  return { state: g.ok ? 'pass' : 'fail', failed: g.failed, why: null };
}

/** One arm's verdict: `{ ok, failed }`. A clause that throws is a failed clause. */
export function grade(id, reading) {
  const failed = [];
  for (const [name, predicate] of GRADERS[id].clauses) {
    let ok = false;
    try {
      ok = predicate(reading) === true;
    } catch {
      ok = false;
    }
    if (!ok) failed.push(name);
  }
  return { ok: failed.length === 0, failed };
}

// ---------------------------------------------------------------------------
// --grader-self-test: every grader on build/p349/fixtures/graders.json, and
// the pure readers on texts of their own. Starts nothing.
// ---------------------------------------------------------------------------

/** The recorded fixtures every grader is held to. */
export const GRADER_FIXTURES = join(ROOT, 'build', 'p349', 'fixtures', 'graders.json');

/** A dotted path into a reading: its parent and the last key (a number for an array index). */
function at(obj, path) {
  const keys = String(path).split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[/^\d+$/.test(k) ? Number(k) : k];
  const last = keys[keys.length - 1];
  return { o, k: /^\d+$/.test(last) ? Number(last) : last };
}

/** Apply a broken fixture's ops to a copy of the honest reading: `set`, `push`, `delete`, `swap`. */
export function applyOps(reading, ops) {
  for (const op of ops) {
    if (op.set !== undefined) {
      const { o, k } = at(reading, op.set);
      o[k] = structuredClone(op.value);
    } else if (op.push !== undefined) {
      const { o, k } = at(reading, op.push);
      o[k].push(structuredClone(op.value));
    } else if (op.delete !== undefined) {
      const { o, k } = at(reading, op.delete);
      if (Array.isArray(o)) o.splice(k, 1);
      else delete o[k];
    } else if (op.swap !== undefined) {
      const a = at(reading, op.swap[0]);
      const b = at(reading, op.swap[1]);
      const t = a.o[a.k];
      a.o[a.k] = b.o[b.k];
      b.o[b.k] = t;
    } else throw new Error(`an op this reader does not know: ${J(op)}`);
  }
  return reading;
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
  }
  let clauses = 0;
  if (fixtures !== null) {
    const honest = fixtures.honest ?? {};
    const broken = Array.isArray(fixtures.broken) ? fixtures.broken : [];
    say(Object.keys(honest).length + broken.length === fixtures.readings, `the fixtures hold ${String(Object.keys(honest).length + broken.length)} readings, as their own count says (${String(fixtures.readings)})`);
    // 1. Every grader's honest reading passes.
    for (const id of Object.keys(GRADERS)) {
      const v = verdictOf(id, structuredClone(honest[id]));
      say(v.state === 'pass', `${id}'s honest reading passes${v.state === 'pass' ? '' : ` (it read ${v.state}: ${J(v.failed)} ${v.why ?? ''})`}`);
    }
    // 2. Every broken reading answers exactly what it names.
    const sole = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
    const unreadableSeen = new Set();
    for (const c of broken) {
      if (GRADERS[c.arm] === undefined) {
        say(false, `the broken reading "${String(c.name)}" names ${J(c.arm)}, which is no arm`);
        continue;
      }
      const unknown = (c.mustFail ?? []).filter((name) => !GRADERS[c.arm].clauses.some(([cl]) => cl === name));
      if (unknown.length > 0) {
        say(false, `${c.arm} "${c.name}" names ${J(unknown)}, which no clause of its grader is`);
        continue;
      }
      let v;
      try {
        v = verdictOf(c.arm, applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
      } catch (err) {
        say(false, `${c.arm} "${c.name}" could not be applied: ${String(err?.message ?? err)}`);
        continue;
      }
      const want = J([...(c.mustFail ?? [])].sort());
      const got = J([...v.failed].sort());
      const right = c.expect === 'fail' ? v.state === 'fail' && want === got : v.state === c.expect;
      say(right, `${c.arm} answers ${String(c.expect).toUpperCase()}${c.expect === 'fail' ? ` on exactly ${want}` : ''} for: ${c.name}${right ? '' : ` (it read ${v.state}: ${got} ${v.why ?? ''})`}`);
      if (right && c.expect === 'fail' && (c.mustFail ?? []).length === 1) sole.get(c.arm).add(c.mustFail[0]);
      if (right && c.expect === 'unreadable') unreadableSeen.add(c.arm);
    }
    // 3. Every clause that can say FAIL is shown red on a broken reading of its own.
    for (const [id, g] of Object.entries(GRADERS)) {
      for (const [name] of g.clauses) {
        clauses += 1;
        say(sole.get(id).has(name), `${id}: "${name}" goes red on a broken reading of its own`);
      }
    }
    // 4. Every UNREADABLE rule is shown on a reading of its own.
    for (const id of Object.keys(UNREADABLE_WHEN)) say(unreadableSeen.has(id), `${id}: a reading missing what its clauses need reads UNREADABLE, never a pass or a failure`);
    // 5. The fixtures' words are the tree's, byte for byte.
    const tree = wordsOf(ROOT);
    const missing = Object.entries(tree).filter(([, v]) => typeof v !== 'string' || v === '').map(([k]) => k);
    say(missing.length === 0, `every word the run grades on is in the tree${missing.length === 0 ? '' : ` (missing ${J(missing)}: the door builder's half or the verb's)`}`);
    const drift = [];
    for (const [id, reading] of Object.entries(honest)) {
      for (const [k, v] of Object.entries(reading?.words ?? {})) if (tree[k] !== v) drift.push(`${id}.${k}`);
    }
    say(drift.length === 0, `the fixtures' words are the tree's, byte for byte${drift.length === 0 ? '' : ` (differ: ${J(drift)})`}`);
  }
  // The names this run types: the corpus, the matrix, and no `#(` anywhere.
  say(CORPUS.length === 54 && new Set(CORPUS).size === 54, "the corpus holds §2.1.1's 54 names, each once");
  say(createHash('sha256').update(J(CORPUS)).digest('hex') === '126fbc2f8c052aa14867203c7ed3a45d37bca655a257262b40747a8ebfecb06d', "the corpus is §2.1.1's byte for byte (sha256 of its JSON, 126fbc2f…)");
  say([...MATRIX, RN2_TYPED].every((n) => !n.includes('#(')) && [...MATRIX, RN2_TYPED].every((n) => !d7Local(n).includes('#(') && !d7Far(n).includes('#(')), 'no name this run types, and no tmux name it composes, holds #(');
  say(MATRIX.length === CORPUS.length + METHOD1_EXTRAS.length && METHOD1_EXTRAS.every((n) => !CORPUS.includes(n)), "the matrix is the corpus and the entry's other Method 1 names, none twice");
  // This file's reading of D5.
  say(ownRefusal('') === 'empty' && ownRefusal('   ') === 'empty' && ownRefusal(`${ch(9)}${ch(0x2028)}`) === 'empty' && ownRefusal('a'.repeat(120)) === null && ownRefusal('b'.repeat(121)) === 'long' && ownRefusal(`${'a'.repeat(120)}${ch(7)}`) === 'long', 'ownRefusal: empty, then long over 120 units after the trim');
  say(METHOD1_EXTRAS.slice(3).every((n) => ownRefusal(n) === 'character') && ownRefusal(`a${ch(0xd83d)}${ch(0xde00)}b`) === null && ownRefusal(`${FAMILY} fam`) === null && ownRefusal('  padded name  ') === null, 'ownRefusal: every refused unit inside a name, and a whole pair and the family pass');
  say(CORPUS.filter((n) => ownRefusal(n) !== null).join('|') === `${'b'.repeat(121)}|${'x'.repeat(250)}`, 'ownRefusal: of the corpus only the 121 and the 250 are refused, both long');
  // This file's reading of D7, against §2.1.1's interesting names.
  {
    const want = [['gmux-control', 'gmux-control-2'], ['/review', '_review'], ['.env fix', '_env fix'], ['-x', '_x'], ['--', '_-'], ['fix #', 'fix _'], ['C#', 'C_'], [`a${BS}b`, 'a_b'], ['$0', '_0'], ['$HOME x', '_HOME x'], ['x;', 'x_'], ['a;b;', 'a;b_'], ['#{session_id}', '_{session_id}'], ['#H', '_H'], ['##', '__'], ['a##b', 'a_#b'], ['cost $HOME', 'cost $HOME'], ['PR #12', 'PR #12'], ['a;b', 'a;b'], ['#[fg=red]ok', '#[fg=red]ok']];
    const wrong = want.filter(([n, w]) => d7Local(n) !== w);
    say(wrong.length === 0, `d7Local reads §2.1.1's interesting names as it says${wrong.length === 0 ? '' : ` (wrong: ${J(wrong)})`}`);
    say(d7Far('cost $HOME') === 'cost _HOME' && d7Far('$HOME notes') === '_HOME notes' && d7Far('/review', new Set(['_review'])) === '_review-2' && d7Local('x'.repeat(250)) === 'x'.repeat(200), 'd7Far maps every $, both dedupe, and the cut comes first');
    say([...MATRIX, RN2_TYPED].every((n) => d7Sanitize(d7Sanitize(n)) === d7Sanitize(n)), 'd7Sanitize is idempotent over every name this run types');
  }
  say(stampFormOf('x;') === `x${BS};` && stampFormOf('a;b') === 'a;b' && stampFormOf(`a${BS};`) === `a${BS}${BS};` && stampFormOf('-x') === '-x', "stampFormOf sends a final ; as a backslash then ;, and nothing else changes (D15)");
  // The read-back per cell (THE PROBE REVIEW: one `_` per cell, as M2 measured it).
  {
    const three = [0x1f468, 0x1f469, 0x1f467].map((c) => String.fromCodePoint(c)).join(String.fromCodePoint(0x200d));
    say(farReadBackOf(`${three} fam`) === '______ fam', "farReadBackOf reads M2's three pictographs and two joiners as ______ fam");
    say(farReadBackOf(`${FAMILY} fam`) === '________ fam', "farReadBackOf reads the corpus's four-person family as eight underscores");
    say(farReadBackOf(CORPUS[11]) === 'caf_ __' && farReadBackOf('plain name') === 'plain name' && farReadBackOf(CORPUS[13]) === '_'.repeat(18), 'farReadBackOf: é one cell, ☕ and each kana or kanji two, ASCII as it is');
    say(cellsOf(0x200d) === 0 && cellsOf(0x41) === 1 && cellsOf(0x645) === 1 && cellsOf(0x65e5) === 2 && cellsOf(0x1f468) === 2, 'cellsOf: a joiner 0, ASCII and Arabic 1, CJK and a pictograph 2');
  }
  say(J(rn2NamesOf(RN2_TYPED)) === J(['p349 rn2 #H x;', 'p349 rn2 _H x_', `p349 rn2 #H x${BS};`]), "rn2NamesOf: the typed name, its far D7 form and its stamp form");
  // The shadow refusal's readers (THE PROBE REVIEW, finding 2).
  {
    const tree = (() => {
      try {
        return readFileSync(join(ROOT, 'src', 'main', 'tmux', 'resolve.ts'), 'utf8');
      } catch {
        return '';
      }
    })();
    say(J(absoluteScanDirsOf(tree)) === J(['/opt/homebrew/bin', '/usr/local/bin']), `absoluteScanDirsOf reads the tree's extraBinDirsFor as /opt/homebrew/bin and /usr/local/bin (${J(absoluteScanDirsOf(tree))})`);
    say(absoluteScanDirsOf('export function other() {}') === null, 'absoluteScanDirsOf answers null when the function is gone, which refuses the launch');
    const fake = { list: (d) => {
      if (d === '/x/has') return ['claude', 'other'];
      if (d === '/x/empty') return [];
      if (d === '/x/locked') throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    } };
    const s1 = shadowCopiesOf(['/x/has', '/x/empty', '/x/none'], ['claude', 'codex'], fake);
    const s2 = shadowCopiesOf(['/x/empty', '/x/locked'], ['claude', 'codex'], fake);
    const s3 = shadowCopiesOf(['/x/empty', '/x/none'], ['claude', 'codex'], fake);
    say(s1.ok === false && J(s1.copies) === J(['/x/has/claude']) && s2.ok === false && J(s2.unreadable) === J(['/x/locked']) && s3.ok === true, 'shadowCopiesOf finds a copy, refuses a folder it cannot read, and passes a missing one');
  }
  say(historyHeld({ before: 'a', after: 'a', quiet: null }) === 'unmoved' && historyHeld({ before: 'a', after: 'b', quiet: { again: 'c' } }) === 'his terminal' && historyHeld({ before: 'a', after: 'b', quiet: { again: 'b' } }) === 'held' && historyHeld({ before: 'a', after: 'b', quiet: null }) === 'unread', "historyHeld: unmoved, his terminal, held and unread (his rule of 2026-10-20)");
  // The pure readers, as probe:p348's.
  say(constWord("export const A = 'one';\nexport const B: string =\n  'two, ' +\n  \"three.\";\n", 'B') === 'two, three.', 'constWord reads a concatenation over a line break');
  say(literalAt("export const X = Object.freeze({ rename: { title: 'a b', sentence: 'c d.' } });", ['X', 'rename'], 'sentence') === 'c d.' && literalAt('const Y = {}', ['X'], 'k') === null, 'literalAt reads a nested literal and answers null for a missing anchor');
  say(statusOfBytes(Buffer.from('HTTP/1.1 404 Not Found\r\n\r\n')) === 404 && statusOfBytes(Buffer.alloc(0)) === 0, 'statusOfBytes reads a status line and 0 for nothing');
  say(headOnlyReading({ handshook: true, bytes: Buffer.alloc(0), error: 'timed out' }) === 0 && headOnlyReading({ handshook: false, bytes: Buffer.alloc(0), error: 'socket hang up' }) === -1 && headOnlyReading({ handshook: true, bytes: Buffer.from('HTTP/1.1 404 Not Found\r\n\r\n'), error: null }) === 404, 'headOnlyReading: a door waiting is 0, a dead connection -1, a 404 404');
  {
    // As build/p326/far-tmux.sh writes them: `<ms> <pid> ${(qq)@}`, the ARGUMENTS alone, each single-quoted, an
    // embedded quote as '\\'', and a note as `<ms> <pid> # <note>`.
    const q = (w) => `'${w.replace(/'/g, "'\\''")}'`;
    const log = [
      `1000 7 ${['-L', 'gmux-p349-1', 'list-sessions', '-F', '#{session_id}'].map(q).join(' ')}`,
      `1100 8 ${['-L', 'gmux-p349-1', 'rename-session', '-t', '$4', "it's x_"].map(q).join(' ')}`,
      '1150 8 # held stamp-delay-ms 15000',
      `1200 9 ${['-L', 'gmux-p349-1', 'set-option', '-t', '$4', '@gmux-name', `it's x${BS};`].map(q).join(' ')}`
    ].join('\n');
    const e = farLogEntries(log);
    say(e.length === 4 && e[1].verb === 'rename-session' && e[1].words[5] === "it's x_" && e[2].note === 'held stamp-delay-ms 15000' && e[3].verb === 'set-option', 'farLogEntries reads invocations past their global options, a quoted quote, and notes');
    const w = farRenamesIn(e, 1050, 1300);
    say(J(w.renamed) === J(["it's x_"]) && J(w.stamped) === J([`it's x${BS};`]) && farRenamesIn(e, 0, 1050).renamed.length === 0, 'farRenamesIn reads the rename and the stamp of a window as the values they carried');
    say(farNaming(e, 0, 2000, ["it's x_"]).length === 1 && farNaming(e, 0, 2000, ['nothing here']).length === 0, 'farNaming finds an invocation carrying a name');
  }
  {
    const w = 'a'.repeat(32);
    const body = (o) => ({ status: 200, body: J(o) });
    const ok = renameAnswerOf(body({ verb: 'rename', write: w, outcome: 'done', reason: null, sentence: null, name: 'x' }), w);
    const noName = renameAnswerOf(body({ verb: 'rename', write: w, outcome: 'done', reason: null, sentence: null, name: '' }), w);
    const nameOnRefusal = renameAnswerOf(body({ verb: 'rename', write: w, outcome: 'refused', reason: 'name', sentence: 's', name: 'x' }), w);
    const order = renameAnswerOf(body({ write: w, verb: 'rename', outcome: 'done', reason: null, sentence: null, name: 'x' }), w);
    const malformed = renameAnswerOf(body({ verb: 'rename', write: '', outcome: 'refused', reason: 'malformed', sentence: 's', name: null }), w);
    say(ok.ok && !noName.ok && !nameOnRefusal.ok && !order.ok && malformed.ok && !renameAnswerOf({ status: 404, body: '' }, w).ok, 'renameAnswerOf: the six fields in order, a name exactly when done, the malformed echo');
  }
  say(actedOf({ status: 200, ok: true, outcome: 'refused', reason: 'name' }) === 'yes' && actedOf({ status: 200, ok: true, outcome: 'refused', reason: 'malformed' }) === 'no' && actedOf({ status: 200, ok: true, outcome: 'busy' }) === 'no' && actedOf({ status: 0 }) === 'unknown' && actedOf({ status: 404 }) === 'no', "actedOf counts a verb's refusal, and no malformed, busy or 404");
  say(storeArgv(`/opt/t/tmux -L gmux-p349-1 rename-session -t $3 p349 rn6 x`) && storeArgv(`ssh -o x host tmux set-option -t $1 @gmux-name 'p349 rn6 x'`) && !storeArgv('tail -f /tmp/p349 rn6 x') && !storeArgv('tmux set-option -g status off'), "storeArgv: a rename's own rename-session and @gmux-name stamp, and nothing else");
  // THE FIX ROUND of 2026-10-30: RN6's stores by canonical path, the manifest's own backups, and app.log's one known line.
  {
    const real = '/private/var/folders/ab/T/gmux-p349-x/p349';
    const places = { manifest: `${real}/profile/gmux/manifest.db`, copies: `${real}/manifest-copies`, backups: `${real}/profile/gmux/backups`, snapshots: `${real}/profile/gmux/snapshots`, farLog: `${real}/far.log` };
    const asWalked = '/var/folders/ab/T/gmux-p349-x/p349';
    say(canonicalOf('/var/folders/x') === '/private/var/folders/x' && canonicalOf('/tmp/y') === '/private/tmp/y' && canonicalOf('/private/var/z') === '/private/var/z' && canonicalOf('/variable/z') === '/variable/z', 'canonicalOf follows /var, /tmp and /etc into /private and nothing else');
    say(storeOfFile(`${asWalked}/profile/gmux/manifest.db`, places) === 'the manifest' && storeOfFile(`${asWalked}/profile/gmux/manifest.db-wal`, places) === 'the manifest' && storeOfFile(`${asWalked}/far.log`, places) === "the run's far log" && storeOfFile(`${asWalked}/profile/gmux/snapshots/a.json`, places) === 'the snapshot capsules' && storeOfFile(`${asWalked}/manifest-copies/before.db`, places) === 'the manifest', 'storeOfFile names every store from a walk under /var/… against stores built under /private/var/… (the path the verify lens caught)');
    say(storeOfFile(`${real}/profile/gmux/manifest.db`, { ...places, manifest: `${asWalked}/profile/gmux/manifest.db` }) === 'the manifest', 'storeOfFile names the manifest the other way round too');
    say(storeOfFile(`${asWalked}/profile/gmux/backups/manifest.db.000004`, places) === "the manifest's own backups" && storeOfFile(`${real}/profile/gmux/backups/.manifest.db.20261030T190000.part`, places) === "the manifest's own backups", "storeOfFile names the manifest's backup ring, a generation and a staged copy");
    say(storeOfFile(`${real}/profile/gmux/backups/manifest.backups.json`, places) === null && storeOfFile(`${real}/profile/Local Storage/leveldb/000003.log`, places) === null && storeOfFile(`${real}/standin/hello-1.json`, places) === null && storeOfFile(`${real}/far.log.old`, places) === null, 'storeOfFile names nothing else: the ring\'s record, Local Storage, a stand-in\'s log, a far log\'s neighbour');
    const pass = '{"ts":"2026-10-30T23:00:00.000Z","level":"info","msg":"scrollback pass (app-quit) over 2 sessions: 0 written, 2 had nothing on screen, 0 were not running, 0 had no pane on this Mac, 0 could not be written. Not written: \\"p349 rn5 0123456789ab\\" (nothing on screen), \\"claude-1\\" (nothing on screen)."}';
    const other = '{"ts":"2026-10-30T23:00:01.000Z","level":"info","msg":"renamed p349 rn3 aaaaaaaaaaaa"}';
    const one = appLogCanaryHits(pass, ['p349 rn5 0123456789ab']);
    const two = appLogCanaryHits(`${pass}\n${other}`, ['p349 rn5 0123456789ab', 'p349 rn3 aaaaaaaaaaaa', 'p349 never typed']);
    const both = appLogCanaryHits(`${pass}\n{"msg":"p349 rn5 0123456789ab"}`, ['p349 rn5 0123456789ab']);
    say(one.hits === 0 && one.known === 1 && two.hits === 1 && two.known === 1 && both.hits === 1 && both.known === 0, 'appLogCanaryHits: a canary on the quit-time scrollback line alone is known, one on any other line is a hit, one on both is a hit');
    say(appLogCanaryHits('{"msg":"scrollback pass (app-quit) over 1 session: 1 written, 0 had nothing on screen."}', ['p349 x']).known === 0 && appLogCanaryHits('', ['p349 x']).hits === 0, 'appLogCanaryHits: nothing found is neither');
    say(J(AGENT_ARMS) === J(['RN1', 'RN3']), 'AGENT_ARMS: RN1 and RN3, the two arms that start an agent session');
  }
  {
    const tree = (() => {
      try {
        return readFileSync(join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts'), 'utf8');
      } catch {
        return '';
      }
    })();
    const ids = [...(/POCKET_ROUTE_IDS = \[([\s\S]*?)\] as const/.exec(tree)?.[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    say(ids.length === 15 && ids.slice(-4).join() === 'start,remove,paste,rename', `the tree's POCKET_ROUTE_IDS end start, remove, paste, rename, fifteen in all (${String(ids.length)}: the door builder's half)`);
  }
  process.stdout.write(failures === 0 ? `[p349] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown red on a broken reading of its own.\n` : `[p349] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// --preflight: what the run needs, asked before the harness socket is made.
// It starts nothing.
// ---------------------------------------------------------------------------

/** The sources a HEAD reading is made of; out/ older than any of them is refused. */
const SOURCES = [
  'src/main/pocket/writes.ts',
  'src/main/pocket/routes.ts',
  'src/main/pocket/facts.ts',
  'src/main/pocket/ipc.ts',
  'src/main/pocket/door/table.ts',
  'src/main/pocket/door/limits.ts',
  'src/main/pocket/door/wire.ts',
  'src/main/pocket/route-ledger.ts',
  'src/main/sessions/pocket-writes.ts',
  'src/main/tmux/names.ts',
  'src/main/machines/remote-sessions.ts',
  'src/main/machines/remote-stamps.ts',
  'src/main/machines/remote-restore.ts',
  'src/main/capabilities.ts',
  'src/shared/ipc/pocket.ts',
  'src/shared/session-names.ts',
  'src/shared/session-gates.ts',
  'src/shared/lifecycle-words.ts'
];
const PARENT = (process.env['P349_PARENT_CHECKOUT'] ?? '').trim();

/** What is missing for a run, as sentences; none means the run may start. */
function preflightProblems() {
  const p = [];
  if (PARENT === '') p.push(`P349_PARENT_CHECKOUT is not set. RN0, RNP, RN2 and RN7 need the parent (${SNAPSHOT}, built) to run FIRST on the same profile, so HEAD starts over a fourteen-route agreement`);
  else if (!existsSync(join(resolve(PARENT), 'out', 'main', 'index.js'))) p.push(`${resolve(PARENT)}/out/main/index.js is missing: build the parent checkout first`);
  const bundle = join(ROOT, 'out', 'main', 'index.js');
  if (!existsSync(bundle)) p.push(`${bundle} is missing: npm run build first`);
  else {
    const newer = SOURCES.filter((s) => existsSync(join(ROOT, s)) && statSync(join(ROOT, s)).mtimeMs > statSync(bundle).mtimeMs);
    if (newer.length > 0) p.push(`out/ is older than ${newer.join(', ')}: build first`);
  }
  for (const f of ['build/p318/stand-in.mjs', 'build/p326/far-tmux.sh']) if (!existsSync(join(ROOT, f))) p.push(`${f} is missing`);
  if (!existsSync('/bin/zsh')) p.push('/bin/zsh is missing, which the far tmux wrapper runs under');
  if (!existsSync('/usr/bin/sqlite3')) p.push('/usr/bin/sqlite3 is missing, which reads the manifest\'s own copy');
  return p;
}

if (process.argv.includes('--preflight')) {
  const p = preflightProblems();
  for (const x of p) process.stderr.write(`[p349] REFUSED. ${x}\n`);
  if (p.length === 0) process.stdout.write(`[p349] preflight PASS: the parent ${resolve(PARENT)} is built, out/ is current, the stand-ins and the far wrapper are here\n`);
  process.exit(p.length === 0 ? 0 : 2);
}

// ---------------------------------------------------------------------------
// The refusals, in the order they are asked
// ---------------------------------------------------------------------------

const TAG = '[p349]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
/** His shell history's size and modified time, under the ACCOUNT's home (never $HOME), and nothing else of it. */
const historyStat = () =>
  ['.zsh_history', '.bash_history']
    .map((n) => {
      try {
        const s = statSync(join(userInfo().homedir, n));
        return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
      } catch {
        return 'none';
      }
    })
    .join('|');
const HISTORY_BEFORE = historyStat();
const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p349`, which wraps this file in build/harness-socket.mjs and build/with-scratch-machine.mjs.');
if (SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-p349')) refuse(`"${SOCKET}" is not a gmux-p349 harness socket.`);
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
for (const v of ['SCRATCH_MACHINE_QUIET_SHELL', 'SCRATCH_MACHINE_SCRATCH_HOME', 'SCRATCH_MACHINE_NO_OWN_KEYS']) {
  if ((process.env[v] ?? '') !== '1') refuse(`${v} is not 1: the loopback machine would read his own rc files, home or keys. Run it through \`npm run probe:p349\`.`);
}
const CONFIG_ROOT = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
let carriage = null;
try {
  carriage = JSON.parse(readFileSync(join(CONFIG_ROOT, 'p69-carriage.json'), 'utf8'));
} catch {
  carriage = null;
}
if (CONFIG_ROOT === '' || carriage === null) refuse('there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs.');
if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
/** The far machine's REAL tmux, behind the wrapper the app is handed. */
const FAR_TMUX = String(carriage.remoteTmuxPath ?? '');
if (!existsSync(FAR_TMUX)) refuse(`the carriage's tmux ${J(FAR_TMUX)} does not exist.`);
/** The far HOME the yard lends its sessions (build/scratch-machine.mjs `scratchHomeFor`). */
const FAR_HOME = join(CONFIG_ROOT, 'home');
if (!existsSync(FAR_HOME)) refuse(`the machine's scratch home ${FAR_HOME} does not exist, so its far side would be his own home.`);
{
  const p = preflightProblems();
  if (p.length > 0) refuse(p.join('; '));
}
const KEEP = (process.env['P349_KEEP'] ?? '') === '1';
const ARMS = new Set(((process.env['P349_ARMS'] ?? '').trim() || 'RN1,RN2,RN3,RN4,RN5,RN6,RN7').split(',').map((x) => x.trim()));
const on = (id) => ARMS.has(id);

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------

mkdirSync(join(HARNESS_DIR, 'p349'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p349'));
const HOME = join(RUN, 'home');
const PROFILE = join(RUN, 'profile');
const PROJECTS = join(RUN, 'projects');
const FAR = join(RUN, 'far');
const BIN = join(HOME, '.local', 'bin');
/** OUTSIDE the profile, so the helper's profile sweep never takes the stand-ins for the app's. */
const STANDIN_DIR = join(RUN, 'standin');
const WRAP_DIR = join(RUN, 'farwrap');
const FAR_LOG = join(RUN, 'far.log');
const FAR_RULES = join(RUN, 'far.rules');
const COPIES = join(RUN, 'manifest-copies');
const APP_LOG = join(PROFILE, 'logs', 'app.log');
const MANIFEST = join(PROFILE, 'gmux', 'manifest.db');
const MACHINES_JSON = join(PROFILE, 'gmux', 'config', 'machines.json');
const SNAPSHOTS = join(PROFILE, 'gmux', 'snapshots');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const FAR_ENV = { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp };
const OUT = join(ROOT, 'out', 'p349');
/** The scratch login PATH: the stand-ins and the system folders, nothing of his. */
const LOGIN_PATH = `${BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
/** ONE `node`, a link to this node, for the Electron shim's `#!/usr/bin/env node` and nothing else. */
const NODE_BIN = join(RUN, 'nodebin');
/** THE APP'S OWN PATH: the stand-ins, that one `node`, and the system folders. */
const APP_PATH = `${BIN}:${NODE_BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
/** The system folders of the app's PATH, which the shadow refusal reads beside the scan's own absolute folders. */
const SYSTEM_DIRS = APP_PATH.split(':').filter((d) => d.startsWith('/') && !within(RUN, d));
const HIDDEN_PREFIX = 'p349';
const STAND_IN_IDS = Object.freeze(['claude', 'codex']);
const HIDDEN_IDS = hiddenAgentsBesides(STAND_IN_IDS);
const HIDDEN_BINS = hiddenAgentBinaries(HIDDEN_IDS);
const WORDS_HEAD = wordsOf(ROOT);

const report = { checkout: ROOT, parent: resolve(PARENT), arms: [], readings: {}, printed: {} };
let failures = 0;
let unreadable = 0;
function arm(id, reading) {
  const v = verdictOf(id, reading);
  if (v.state === 'unreadable') return cannotRead(id, v.why, reading);
  const ok = v.state === 'pass';
  report.arms.push({ id, ok, failed: v.failed, title: GRADERS[id].title });
  report.readings[id] = reading;
  if (!ok) failures += 1;
  say(`${ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${ok ? '' : `; FAILED ${J(v.failed)}`}`);
}
function cannotRead(id, why, reading) {
  unreadable += 1;
  report.arms.push({ id, ok: null, said: why });
  if (reading !== undefined) report.readings[id] = reading;
  say(`UNREADABLE ${id}: ${why}`);
}
/** Run one arm's body; a body that throws is that arm's UNREADABLE, and the run goes on. */
async function armSafely(id, body) {
  if (!on(id)) {
    report.arms.push({ id, ok: null, said: 'not run: P349_ARMS left it out' });
    return;
  }
  try {
    await body();
  } catch (err) {
    cannotRead(id, `the arm stopped: ${String(err?.message ?? err)}`);
  }
}

// ---------------------------------------------------------------------------
// Processes, read and never matched by pattern
// ---------------------------------------------------------------------------

/** The process table as pid → { ppid, command }, read with `ps -ww -ax` (never a pattern). */
function processTable() {
  const r = spawnSync('/bin/ps', ['-ww', '-ax', '-o', 'pid=,ppid=,command='], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  const rows = new Map();
  for (const line of String(r.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m !== null) rows.set(Number(m[1]), { pid: Number(m[1]), ppid: Number(m[2]), command: m[3] });
  }
  return rows;
}
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * THE ARGV SAMPLER (RN6): the process table read every 30 ms while names are
 * typed, every command line asked for every canary. A rename's own tmux
 * commands carry the name by design (they are the store) and are counted apart.
 */
function startArgvSampler(canaries) {
  let samples = 0;
  let hits = 0;
  let storeHits = 0;
  let stopped = false;
  let busy = false;
  const timer = setInterval(() => {
    if (stopped || busy) return;
    busy = true;
    execFile('/bin/ps', ['-ww', '-ax', '-o', 'command='], { encoding: 'utf8', timeout: 5_000, maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => {
      busy = false;
      if (err) return;
      samples += 1;
      for (const line of String(stdout).split('\n')) {
        if (![...canaries].some((c) => line.includes(c))) continue;
        if (storeArgv(line)) storeHits += 1;
        else hits += 1;
      }
    });
  }, 30);
  return {
    stop() {
      stopped = true;
      clearInterval(timer);
      return { samples, hits, storeHits };
    }
  };
}

// ---------------------------------------------------------------------------
// The app, over its renderer and its bridge
// ---------------------------------------------------------------------------

/** The variables a registry row names in its own install folders, and the agents' session variables: never handed on. */
const INHERITED = Object.fromEntries(
  [...Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_|CODEX_)/.test(n) || n === 'TERM_SESSION_ID'), 'NVM_BIN', 'BUN_INSTALL'].map((n) => [n, undefined])
);

const devtoolsPort = () => {
  try {
    return Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
  } catch {
    return 0;
  }
};
async function targets() {
  const port = devtoolsPort();
  if (!(port > 0)) return [];
  try {
    return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
  } catch {
    return [];
  }
}
/** The app window, once its bridge and the drives this run uses are armed. */
async function attachMain(timeoutMs = 150_000) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    const picked = pickRendererTarget(await targets());
    if (picked.target !== null) {
      const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
      await cdp.call('Runtime.enable');
      for (let i = 0; i < 200; i += 1) {
        if ((await cdpEval(cdp, "window.gmux !== undefined && window.gmux.pocket !== undefined && typeof window.__p293 === 'object' && typeof window.__gmuxP95 === 'object'")) === true) return cdp;
        await sleep(300);
      }
      throw new Error('the app never armed window.gmux.pocket and the drives');
    }
    why = picked.why;
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}
/** Settings then Phone, as a person opens it. */
async function attachSettings(main, timeoutMs = 30_000) {
  await cdpEval(main, 'window.gmux.openSettings().then(() => true)');
  const started = Date.now();
  for (;;) {
    const t = (await targets()).find((x) => x.type === 'page' && /\/renderer\/settings\/index\.html/.test(String(x.url)) && typeof x.webSocketDebuggerUrl === 'string');
    if (t !== undefined) {
      const cdp = await wsConnect(t.webSocketDebuggerUrl);
      await cdp.call('Runtime.enable');
      await cdpEval(cdp, "(() => { location.hash = 'phone'; return true; })()");
      for (let i = 0; i < 100; i += 1) {
        if ((await cdpEval(cdp, `document.querySelector('section[aria-label="Phone"]') !== null`)) === true) return cdp;
        await sleep(200);
      }
      throw new Error('Settings opened and never drew the Phone section');
    }
    if (Date.now() - started > timeoutMs) throw new Error('no Settings window');
    await sleep(300);
  }
}
async function pocket(cdp, method, arg) {
  const call = arg === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${J(arg)})`;
  return JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`));
}
async function bridge(cdp, expr) {
  return JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, 180_000));
}
async function status(cdp) {
  const got = await pocket(cdp, 'status');
  return got.ok ? got.value : null;
}
async function waitStatus(cdp, test, ms) {
  const started = Date.now();
  let last = null;
  for (;;) {
    last = await status(cdp);
    if (last !== null && test(last)) return { ok: true, status: last };
    if (Date.now() - started >= ms) return { ok: false, status: last };
    await sleep(300);
  }
}
async function waitFor(test, ms, every = 300) {
  const started = Date.now();
  for (;;) {
    const v = await test();
    if (v) return v;
    if (Date.now() - started >= ms) return null;
    await sleep(every);
  }
}
/** Main's sessions, with the facts the arms read. */
async function sessions(cdp) {
  const got = await bridge(cdp, 'window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, name: s.name, tmuxName: s.tmuxName, status: s.status, agent: s.agent, machine: s.machine ? { id: s.machine.id } : null })))');
  return got.ok ? got.value : [];
}

/** Confirm the door as it stands and wait until a code may show. Called only where no route waits. */
async function confirmDoor(cdp) {
  const now = await waitStatus(cdp, (s) => (s.state === 'listening' && s.confirmState === 'confirmed') || (s.confirmable === true && s.state !== 'opening' && s.confirmLines.some((l) => l.includes(`https://${PUBLIC_NAME}:`))), 40_000);
  if (!now.ok) return { ok: false, why: `the lines never named ${PUBLIC_NAME}: ${J({ state: now.status?.state, refusal: now.status?.refusal })}` };
  if (!(now.status.state === 'listening' && now.status.confirmState === 'confirmed')) {
    const c = await pocket(cdp, 'confirmDoor', { linesRead: now.status.confirmLines, hashRead: now.status.confirmHash });
    if (!c.ok || c.value.allowed !== true) return { ok: false, why: c.ok ? `confirm allowed=${String(c.value.allowed)}` : c.error };
  }
  const l = await waitStatus(cdp, (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening'), 70_000);
  return { ok: l.ok, why: l.ok ? '' : `never pairable: ${J({ state: l.status?.state, pairable: l.status?.pairable })}` };
}

/** The forwarder the stand-in's NEWEST live Funnel child listens on, or 0. */
const forwarderPort = () => standin?.readFunnel().at(-1)?.forwarderPort ?? 0;

/** A node phone, paired through the forwarder and allowed through the bridge. */
async function pairPhone(cdp, label) {
  const offered = await pocket(cdp, 'beginPairing');
  if (!offered.ok) return { ok: false, why: offered.error.slice(0, 200) };
  const read = readOffer(offered.value.payload);
  if (!read.ok) return { ok: false, why: `the code does not read the phone's way: ${read.why}` };
  const phone = makePhone(label, read.offer.dx);
  const door = { get port() { return forwarderPort(); }, name: read.offer.host, publicPort: read.offer.port, pin: read.offer.fp };
  const paired = await pairThrough(door, read.offer, phone, {
    tries: 20,
    everyMs: 500,
    between: async () => {
      const sheet = await pocket(cdp, 'pairingState');
      if (sheet.ok && sheet.value.state === 'presented') await pocket(cdp, 'allowPhone', { linesRead: sheet.value.lines, hashRead: sheet.value.hash });
    }
  });
  await pocket(cdp, 'cancelPairing');
  if (!paired.ok) return { ok: false, why: `pairing answered ${J(paired.words)} (${paired.why})` };
  const first = await signedGet(phone, door, '/v1/blocked');
  return { ok: first.status === 200, why: first.status === 200 ? '' : `the first read answered ${String(first.status)}`, label, phone, door };
}

const appLogText = () => {
  try {
    return readFileSync(APP_LOG, 'utf8');
  } catch {
    return null;
  }
};
/** app.log.1 (the transport keeps ONE rotated file, src/main/log/transport.ts) then app.log; null when app.log cannot be read. */
const appLogBoth = () => {
  const now = appLogText();
  if (now === null) return null;
  let older = '';
  try {
    older = readFileSync(`${APP_LOG}.1`, 'utf8');
  } catch {
    older = '';
  }
  return older === '' ? now : `${older}${older.endsWith('\n') ? '' : '\n'}${now}`;
};
/**
 * The write lines app.log and its rotated file hold for a verb, or null when
 * app.log cannot be read (THE PROBE REVIEW of 2026-10-30: an unread log read
 * as no line, so "no write line" passed over a log nobody read).
 */
const writeLines = (verb) => {
  const text = appLogBoth();
  return text === null ? null : text.split('\n').filter((l) => l.includes(LOG_PHRASE[verb]));
};
/** How many write lines came between two reads, or null when either read is missing. */
const linesBetween = (before, after) => (before === null || after === null ? null : after.length - before.length);
/** The `ts` of a log text's first NDJSON line, or null. */
const firstTsOf = (text) => {
  try {
    return JSON.parse(String(text ?? '').split('\n')[0])?.ts ?? null;
  } catch {
    return null;
  }
};
/** The ts of the first line this run's app.log ever held, read as the parent's window came up (the profile is fresh). */
let firstLogTs = null;
/**
 * Whether app.log rotated past its one kept file, so lines of this run are
 * gone: app.log.1 exists and does not begin with the run's first line. Null
 * when that first line was never read and a rotated file exists.
 */
const logLost = () => {
  let older = null;
  try {
    older = readFileSync(`${APP_LOG}.1`, 'utf8');
  } catch {
    return false;
  }
  return firstLogTs === null ? null : firstTsOf(older) !== firstLogTs;
};

// ---------------------------------------------------------------------------
// tmux, read by this file's own clients with -u (so a name outside ASCII reads
// as it is): this Mac's server by the binary it runs, the machine's by its
// REAL binary (never the wrapper, so this file's reads are not in the far log)
// ---------------------------------------------------------------------------

let localTmuxBin = null;
function tmuxBin() {
  if (localTmuxBin !== null) return localTmuxBin;
  const pid = Number(String(spawnSync('tmux', ['-L', SOCKET, 'display-message', '-p', '#{pid}'], { encoding: 'utf8', timeout: 10_000 }).stdout ?? '').trim());
  if (!(pid > 1)) return 'tmux';
  const command = String(spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8', timeout: 10_000 }).stdout ?? '').trim();
  const bin = command.split(/\s+/)[0] ?? '';
  if (bin.startsWith('/') && existsSync(bin)) localTmuxBin = bin;
  return localTmuxBin ?? 'tmux';
}
const tmuxOut = (...args) => {
  const r = spawnSync(tmuxBin(), ['-u', '-L', SOCKET, ...args], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
const farOut = (...args) => {
  const r = spawnSync(FAR_TMUX, ['-u', '-L', SOCKET, '-f', '/dev/null', ...args], { encoding: 'utf8', env: FAR_ENV, timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
const lineOf = (text) => (text === null ? null : String(text).replace(/\n$/, ''));
/** A server's sessions as `$`-id → `@gmux-id`, from its own list (both are space-free). */
function idsOn(read) {
  const out = new Map();
  for (const line of String(read('list-sessions', '-F', '#{session_id} #{@gmux-id}') ?? '').split('\n')) {
    const m = /^(\$\d+) (\S*)$/.exec(line.trim());
    if (m !== null) out.set(m[1], m[2]);
  }
  return out;
}
const tmuxIdOf = (read, sessionId) => [...idsOn(read).entries()].find(([, g]) => g === sessionId)?.[0] ?? null;
/** The other sessions' names on a server, for D7's dedupe: every session but `ownId`. */
function namesBesides(read, ownId) {
  const out = [];
  for (const [id] of idsOn(read)) if (id !== ownId) out.push(lineOf(read('display-message', '-p', '-t', id, '#{session_name}')) ?? '');
  return out.filter((n) => n !== '');
}

/** The far log's entries, read whole. */
const farEntries = () => {
  try {
    return farLogEntries(readFileSync(FAR_LOG, 'utf8'));
  } catch {
    return null;
  }
};

/**
 * The manifest, read from a COPY beside its WAL (never the app's own file):
 * every row's id, name, tmux name, agent and argv[0], or null.
 */
let copySeq = 0;
function manifestRows() {
  if (!existsSync(MANIFEST)) return null;
  copySeq += 1;
  const dir = join(COPIES, String(copySeq));
  mkdirSync(dir, { recursive: true });
  try {
    const copy = join(dir, 'manifest.db');
    copyFileSync(MANIFEST, copy);
    for (const side of ['-wal', '-shm']) if (existsSync(`${MANIFEST}${side}`)) copyFileSync(`${MANIFEST}${side}`, `${copy}${side}`);
    const r = spawnSync('/usr/bin/sqlite3', ['-json', copy, 'select id, name, tmux_name, agent, argv from sessions;'], { encoding: 'utf8', timeout: 20_000, maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) return null;
    const raw = JSON.parse(String(r.stdout ?? '').trim() || '[]');
    return new Map(raw.map((row) => {
      let argv0 = null;
      try {
        argv0 = JSON.parse(row.argv)?.[0] ?? null;
      } catch {
        argv0 = null;
      }
      return [row.id, { name: row.name, tmuxName: row.tmux_name, agent: row.agent, argv0 }];
    }));
  } catch {
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// The sessions, the stand-ins, and the phone's rename
// ---------------------------------------------------------------------------

/** Every session id this run made, for the ends, and every agent session it started, for RUN. */
const made = new Map();
const agentsStarted = new Set();

/** A shell, made through the session manager's drive, local or on the machine. */
async function shell(main, name, { far = false } = {}) {
  const path = far ? FAR : join(PROJECTS, 'main');
  const got = await bridge(main, `window.__p293.createSession(${J(far ? { path, name, machineId: MACHINE_ID } : { path, name })})`);
  if (!got.ok || typeof got.value !== 'string') throw new Error(`${name} was not created: ${J(got)}`);
  made.set(got.value, { far, name });
  const listed = await waitFor(async () => (await sessions(main)).find((s) => s.id === got.value && ['running', 'idle'].includes(s.status)) ?? null, 30_000, 300);
  if (listed === null) throw new Error(`${name} never read live`);
  return got.value;
}
/** The stand-in a session runs now: the newest hello naming its id. */
function standinOf(sessionId) {
  const mine = hellos(STANDIN_DIR).filter((h) => h.session === sessionId);
  mine.sort((a, b) => Number(a.at) - Number(b.at));
  return mine[mine.length - 1] ?? null;
}
/** An agent session made the way a person makes one, and its stand-in's hello. */
async function agentSession(main, name, agent) {
  const project = join(PROJECTS, 'main');
  const got = await bridge(main, `window.gmux.sessions.create(${J({ name, projectPath: project, cwd: project, agent })}).then((s) => s.id)`);
  if (!got.ok || typeof got.value !== 'string') throw new Error(`${name} was not created: ${J(got)}`);
  made.set(got.value, { far: false, name });
  agentsStarted.add(got.value);
  const hello = await waitFor(() => standinOf(got.value), 60_000, 250);
  if (hello === null) throw new Error(`${name}'s stand-in never said hello, so Tortie launched something else as ${agent}`);
  return got.value;
}
/** The status main reads a row at once it ended (exited or restorable), or null past `ms`. */
async function waitEnded(main, id, ms = 30_000) {
  const row = await waitFor(async () => (await sessions(main)).find((s) => s.id === id && (s.status === 'exited' || s.status === 'restorable')) ?? null, ms, 300);
  return row?.status ?? null;
}

/** Every write id this run sent, and every canary a typed name carried, for RN6. */
const canaries = new Set();
const canary = (label) => {
  const c = `p349 ${label} ${randomBytes(6).toString('hex')}`;
  canaries.add(c);
  return c;
};
/** The renames that acted (main's step 7 logged them), for RN6's one line per rename. */
const acted = { rename: 0 };
const actedUnknown = { rename: 0 };

/** One rename from a phone, composed as the phone composes it, read the phone's way. */
async function renameWrite(P, id, name, { write = freshWriteId(), ...options } = {}) {
  const started = hr();
  const reply = await signedPost(P.phone, P.door, '/v1/rename', { name, session: id, write }, options);
  const ms = Number(hr() - started) / 1e6;
  const read = renameAnswerOf(reply, write);
  const a = read.ok ? read.answer : null;
  const out = { status: reply.status, ok: read.ok, why: read.why, outcome: a?.outcome ?? null, reason: a?.reason ?? null, sentence: a?.sentence ?? null, name: a?.name ?? null, ms };
  const did = actedOf(out);
  if (did === 'yes') acted.rename += 1;
  else if (did === 'unknown') actedUnknown.rename += 1;
  return out;
}
/**
 * A rename's head alone: the request line, the Host, the signature over the
 * body it names and its Content-Length, and NO body (probe:p346's rule). A door
 * that refuses the route answers 404 before it reads a body; a door that serves
 * it waits for the body, so nothing comes inside the window (0).
 */
async function headOnly(P, fields) {
  const target = '/v1/rename';
  const body = writeBodyOf(fields);
  const headers = signedHeadersFor(P.phone, 'POST', target, body);
  const head = [`POST ${target} HTTP/1.1`, `host: ${P.door.name}:${String(P.door.publicPort)}`, ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), 'content-type: application/json', `content-length: ${String(body.length)}`, '', ''].join('\r\n');
  const got = await rawExchange({ door: P.door, bytes: Buffer.from(head, 'latin1'), identity: P.phone, timeoutMs: 4_000 });
  return headOnlyReading(got);
}
/** One `/v1/session` detail as the phone reads it, or null. */
async function sessionDetail(P, id) {
  const r = await signedGet(P.phone, P.door, `/v1/session?id=${encodeURIComponent(id)}`);
  try {
    return r.status === 200 ? JSON.parse(r.body).session : null;
  } catch {
    return null;
  }
}
/**
 * The offers as a phone reads them: whether the detail of `id` carries
 * `rename`, whether any Sessions row (every session shown) carries it, whether
 * the Sessions answer carries `renames`, and whether any blocked row carries
 * `rename`. `null` when a read did not answer.
 */
async function offersOf(P, id) {
  const detail = await sessionDetail(P, id);
  const list = await readSessions(P.phone, P.door, { show: 'all' });
  const blocked = await signedGet(P.phone, P.door, '/v1/blocked');
  let blockedRows = null;
  try {
    blockedRows = blocked.status === 200 ? JSON.parse(blocked.body).rows ?? [] : null;
  } catch {
    blockedRows = null;
  }
  if (detail === null || list.answer === null || blockedRows === null) return null;
  return {
    detail: detail.rename === true,
    sessionsRows: (list.answer.rows ?? []).some((row) => row?.rename === true),
    renames: list.answer.renames === true,
    blocked: blockedRows.some((row) => row?.rename === true)
  };
}

/** One row, as each place a name is kept reads it now. */
async function rowRead(main, target) {
  const list = (await sessions(main)).find((s) => s.id === target.id) ?? null;
  const rows = manifestRows();
  const m = rows?.get(target.id) ?? null;
  let tmux = null;
  let far = null;
  if (target.kind === 'far') {
    const fid = tmuxIdOf(farOut, target.id);
    far = fid === null ? null : { name: lineOf(farOut('display-message', '-p', '-t', fid, '#{session_name}')), gmuxName: lineOf(farOut('display-message', '-p', '-t', fid, '#{@gmux-name}')) };
  } else if (target.kind !== 'ended') {
    const tid = tmuxIdOf(tmuxOut, target.id);
    tmux = tid === null ? null : lineOf(tmuxOut('display-message', '-p', '-t', tid, '#{session_name}'));
  }
  return { list: list === null ? null : { name: list.name, tmuxName: list.tmuxName }, manifest: m === null ? null : { name: m.name, tmuxName: m.tmuxName }, tmux, far };
}

/** One name renamed onto one target from phone A, and every place it is kept read before and after (Method 1). */
async function renameAndRead(main, P, target, typed) {
  const before = await rowRead(main, target);
  const takenTmux = target.kind === 'far' || target.kind === 'ended' ? null : namesBesides(tmuxOut, tmuxIdOf(tmuxOut, target.id));
  const takenFar = target.kind === 'far' ? namesBesides(farOut, tmuxIdOf(farOut, target.id)) : null;
  const from = Date.now();
  const answer = await renameWrite(P, target.id, typed);
  const t = trimmedOf(typed);
  if (ownRefusal(typed) === null && answer.outcome === 'done') {
    await waitFor(async () => {
      const l = (await sessions(main)).find((s) => s.id === target.id);
      return l !== undefined && (l.name === t || l.name === farReadBackOf(t)) ? true : null;
    }, 5_000, 100);
  }
  await sleep(target.kind === 'far' ? 600 : 150);
  const after = await rowRead(main, target);
  const to = Date.now();
  const entries = target.kind === 'far' ? farEntries() : null;
  const farLog = target.kind !== 'far' ? null : entries === null ? { read: false, renamed: [], stamped: [] } : { read: true, ...farRenamesIn(entries, from, to) };
  return { typed, answer, ...(takenTmux === null ? {} : { takenTmux }), ...(takenFar === null ? {} : { takenFar }), before, after, farLog };
}

// ---------------------------------------------------------------------------
// The machine, the profile and the launch
// ---------------------------------------------------------------------------

/** The far wrapper (build/p326/far-tmux.sh) and its env file, in this run's own folder. */
function writeFarWrapper() {
  mkdirSync(WRAP_DIR, { recursive: true });
  const wrapper = join(WRAP_DIR, 'far-tmux.sh');
  copyFileSync(join(ROOT, 'build', 'p326', 'far-tmux.sh'), wrapper);
  chmodSync(wrapper, 0o755);
  const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  writeFileSync(join(WRAP_DIR, 'far-tmux.env'), `REAL=${shq(FAR_TMUX)}\nLOG=${shq(FAR_LOG)}\nRULES=${shq(FAR_RULES)}\nFARHOME=${shq(FAR_HOME)}\n`, 'utf8');
  writeFileSync(FAR_LOG, '', 'utf8');
  writeFileSync(FAR_RULES, '', 'utf8');
  return wrapper;
}
function writeMachines(wrapper) {
  mkdirSync(dirname(MACHINES_JSON), { recursive: true, mode: 0o700 });
  writeFileSync(MACHINES_JSON, `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: MACHINE_LABEL, host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: wrapper }] })}\n`, 'utf8');
  const known = join(PROFILE, 'gmux', 'machines', 'known-machines');
  mkdirSync(dirname(known), { recursive: true });
  writeFileSync(known, keyscanText({ host: carriage.host, port: carriage.port, caller: 'build/p349/probe-p349.mjs' }), 'utf8');
}

let standin = null;
let dns = null;
let watch = null;
let lastShim = 0;
let lastApp = 0;
const shims = new Set();
const apps = new Set();
let tailscalePreflight = false;
const dnsPreflights = [];
const agentsHeld = [];
const shadows = [];
let resolvedOk = false;
let hiddenUnresolved = false;
/**
 * THE PROBE REVIEW of 2026-10-30: set when a launch is refused because an
 * agent other than the stand-ins could run (the precondition, the shadow
 * refusal, the precheck or the scan's own verdict). That is no run, exit 2,
 * as the header says, and never RUN's failure, exit 1.
 */
let agentsRefused = false;

function launchOptions(label, checkout) {
  return {
    label,
    userDataDir: PROFILE,
    cwd: checkout,
    // THE FIX ROUND of 2026-10-31, his ruling on the Mac lens's `-L gmux` item: no run of ours lists his server,
    // not even to count. The socket reaches the helper through the app's env alone (GMUX_TMUX_SOCKET below), so
    // it still refuses a socket that is not a scratch one and judges the socket the app announces (its layer 3),
    // and its layer-4 census of `-L gmux`, which it reads only for a launch that names `tmuxSocket`, never runs.
    // `endScratchServer` ends this run's own server after every launch instead, where the helper's teardown did.
    tmuxSocket: null,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({
      ...INHERITED,
      HOME,
      ZDOTDIR: HOME,
      HISTFILE: '/dev/null',
      PATH: APP_PATH,
      GMUX_TMUX_SOCKET: SOCKET,
      GMUX_PROBES: '1',
      GMUX_LOG_FILE: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_CONFIG_ROOT: CONFIG_ROOT,
      GMUX_HARNESS_DIR: HARNESS_DIR,
      // THE STAND-INS. A development build honours both; a packaged one ignores them.
      GMUX_TAILSCALE_BIN: standin.binPath,
      [NAME_SERVERS_VAR]: dns.servers,
      ...(typeof carriage.authSock === 'string' ? { SSH_AUTH_SOCK: carriage.authSock } : {})
    }),
    graceMs: 8_000,
    ceilingMs: 3_600_000
  };
}

/**
 * This run's own scratch server ended, by its socket's name and nothing else (THE FIX ROUND of 2026-10-31): the
 * call build/electron-run.mjs's teardown made when this file named `tmuxSocket`, now made here because it names
 * none (`launchOptions`). It runs after every launch, in `launch`'s `finally`, so HEAD starts with no server of
 * the parent's alive, as before; build/harness-socket.mjs still ends whatever is left after the run.
 */
function endScratchServer(label) {
  const r = spawnSync('tmux', ['-L', SOCKET, 'kill-server'], { encoding: 'utf8', timeout: 10_000 });
  const said = r.status === 0 ? 'ended' : String(r.stderr ?? '').trim().split('\n')[0] || `exit ${String(r.status)}`;
  (report.readings.scratchServer ??= []).push({ label, socket: SOCKET, said });
  say(`${label}: this run's scratch server on -L ${SOCKET}: ${said}`);
}

/** One launch through the helper, after the preflights, the shadow refusal and the hidden agents. */
async function launch(label, checkout, body) {
  const pre = preflightStandin(standin, standin.binPath);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused the launch: ${pre.problems.join('; ')}`);
  const dnsPre = await dns.preflight(dns.servers);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
  if (!dnsPre.ok) throw new Error(`the DNS preflight refused the launch: ${dnsPre.problems.join('; ')}`);
  // THE PROBE REVIEW (rule 9), finding 2: no shadow copy of a stand-in's name where the scan looks.
  {
    const scan = absoluteScanDirsOf((() => {
      try {
        return readFileSync(join(checkout, 'src', 'main', 'tmux', 'resolve.ts'), 'utf8');
      } catch {
        return '';
      }
    })());
    const s = scan === null ? { ok: false, copies: [], unreadable: ['(extraBinDirsFor not found in the checkout)'] } : shadowCopiesOf([...scan, ...SYSTEM_DIRS], STAND_IN_IDS);
    shadows.push({ label, ...s });
    if (!s.ok) {
      agentsRefused = true;
      throw new Error(`a copy of a stand-in's name sits where the app's scan looks, or a folder it searches cannot be read (${J(s)}), so Tortie would run it for its version`);
    }
  }
  const hiddenPre = hiddenAgentsPrecheck({ checkout, prefix: HIDDEN_PREFIX, home: HOME, userPath: `${LOGIN_PATH}:${APP_PATH}`, standIns: STAND_IN_IDS });
  (report.readings.hiddenPrechecks ??= []).push({ label, ok: hiddenPre.ok, said: hiddenPre.said, wouldResolve: hiddenPre.wouldResolve });
  if (!hiddenPre.ok) {
    agentsHeld.push(false);
    agentsRefused = true;
    throw new Error(`the hidden agents' precheck refused the launch: ${hiddenPre.said}`);
  }
  writeHiddenAgents(PROFILE, HIDDEN_PREFIX, HIDDEN_IDS);
  try {
    return await launchOnce(label, checkout, body);
  } finally {
    endScratchServer(label);
  }
}

/** The launch itself, through the helper, with no `tmuxSocket` (see `launchOptions`). */
function launchOnce(label, checkout, body) {
  return withElectron(launchOptions(label, checkout), async (handle) => {
    lastShim = handle.pid;
    shims.add(handle.pid);
    const appNow = () => {
      try {
        lastApp = handle.appPid() || lastApp;
        if (lastApp > 0) apps.add(lastApp);
      } catch {
        /* not up yet */
      }
      return lastApp;
    };
    appNow();
    const main = await attachMain();
    appNow();
    try {
      const list = JSON.parse(await cdpEval(main, AGENTS_LIST_EXPR, 120_000));
      const held = hiddenAgentsScanVerdict(list, HIDDEN_IDS);
      const only = standInsOnlyVerdict(list, { standIns: STAND_IN_IDS, under: RUN });
      (report.readings.agentScans ??= []).push({ label, held: held.said, only: only.said });
      agentsHeld.push(held.ok && only.ok);
      if (!held.ok || !only.ok) agentsRefused = true;
      if (!held.ok) throw new Error(`agents:list says a hidden agent resolved: ${held.said}`);
      if (!only.ok) throw new Error(`agents:list says an agent other than the stand-ins resolved: ${only.said}`);
      localTmuxBin = null;
      await body(main, handle);
    } finally {
      main.close();
      appNow();
    }
  });
}

/** The machine made usable and its far folder opened, as probe:p348 does it. */
async function machineUp(main) {
  const up = await bridge(main, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
  const ok = up.ok && (up.value?.rows ?? []).some((row) => row.id === MACHINE_ID && row.usable);
  if (ok) {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const opened = await bridge(main, `window.__gmuxP95.openRemote(${J(MACHINE_ID)}, ${J(FAR)})`);
      if (opened.ok && opened.value?.result?.ok === true) break;
      await sleep(3_000);
    }
  }
  return ok;
}

/**
 * RN7's half at one build: the Mac's OWN `sessions:rename`, name by name over
 * the corpus, on one local shell, each read as the Mac reads it after its echo
 * (the display name and the tmux name main lists) and as tmux holds it by
 * `$`-id. Names are sent as typed: the Mac's own channel trims nothing.
 */
async function macRenames(main, id) {
  const out = [];
  for (const typed of CORPUS) {
    const tid = tmuxIdOf(tmuxOut, id);
    const takenTmux = tid === null ? [] : namesBesides(tmuxOut, tid);
    const got = await bridge(main, `window.gmux.sessions.rename(${J({ sessionId: id, name: typed })}).then(() => true)`);
    // The echo (core.ts handleExternalRename) arrives on the control client a moment later.
    await sleep(700);
    const row = (await sessions(main)).find((s) => s.id === id) ?? null;
    const now = tmuxIdOf(tmuxOut, id);
    out.push({ ok: got.ok && got.value === true, name: row?.name ?? null, tmuxName: row?.tmuxName ?? null, tmux: now === null ? null : lineOf(tmuxOut('display-message', '-p', '-t', now, '#{session_name}')), takenTmux });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

let A = null;
let B = null;
let rnp = null;
let rn7Parent = null;
let rn2RecordId = null;
let sampler = null;
let argvRead = { samples: 0, hits: 0, storeHits: 0 };
let ends = null;
let manifestBefore = null;
let machineOk = false;

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, PROFILE, PROJECTS, join(PROJECTS, 'main'), FAR, BIN, NODE_BIN, STANDIN_DIR, COPIES]) mkdirSync(dir, { recursive: true });
  symlinkSync(process.execPath, join(NODE_BIN, 'node'));
  writeFileSync(join(PROJECTS, 'main', 'README.md'), "# Phase 349, the probe's project\n");
  writeFileSync(join(FAR, 'README.md'), '# Phase 349, the far folder\n');
  // NO `#(` IS EVER SENT (SPEC §0.4 rule 14): every name this run types, refused before anything starts.
  if ([...MATRIX, RN2_TYPED].some((n) => n.includes('#('))) throw new Error('a name this run would type holds #(, and no such name is ever sent');

  // ---- the stand-ins on the scratch PATH ------------------------------------
  const p318 = writeWrappers({ dir: RUN, bin: BIN, standinDir: STANDIN_DIR });
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${LOGIN_PATH}"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${LOGIN_PATH}"\nexport HISTFILE=/dev/null\nPS1='p349 %# '\n`, 'utf8');
  writeFileSync(join(HOME, '.hushlogin'), '');
  const wrapper = writeFarWrapper();
  writeMachines(wrapper);
  // THE PRECONDITION: `claude` and `codex` are build/p318/stand-in.mjs and no hidden row's binary resolves, asked of the
  // login shell the app will ask, with the environment the app will be given. Anything else is no run (exit 2).
  {
    const shellEnv = { ...process.env, HOME, ZDOTDIR: HOME, HISTFILE: '/dev/null', PATH: APP_PATH };
    for (const name of Object.keys(INHERITED)) delete shellEnv[name];
    const loginShell = (process.env['SHELL'] ?? '').trim() || '/bin/zsh';
    const ask = (bare) => (String(spawnSync(loginShell, ['-lic', `command -v ${bare} || true`], { encoding: 'utf8', timeout: 30_000, env: shellEnv }).stdout ?? '').trim().split('\n').pop() ?? '');
    const resolved = { claude: ask('claude'), codex: ask('codex') };
    const hidden = Object.fromEntries(HIDDEN_BINS.map((b) => [b, ask(b)]));
    const runner = (() => {
      try {
        return readFileSync(p318.runner, 'utf8');
      } catch {
        return '';
      }
    })();
    const standIns = ['claude', 'codex'].every((b) => resolved[b] === join(BIN, b) && readFileSync(join(BIN, b), 'utf8').includes(p318.runner)) && runner.includes(STANDIN_PATH);
    report.readings.resolves = { resolved, hidden, standIns };
    resolvedOk = standIns;
    hiddenUnresolved = Object.values(hidden).every((where) => where === '');
    if (!resolvedOk || !hiddenUnresolved) {
      agentsRefused = true;
      throw new Error(`the scratch login shell resolves ${J(resolved)} and the hidden ${J(hidden)}: claude and codex are not build/p318/stand-in.mjs, or a hidden agent resolves, so nothing is launched`);
    }
  }
  standin = makeStandin({ dir: join(RUN, 'tailscale'), scenario: { ...DEFAULT_SCENARIO } });
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflight = pre.ok;
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
  watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });
  say(`measuring ${ROOT} after the parent ${resolve(PARENT)}; socket ${SOCKET}; the loopback machine on ${String(carriage.host)}:${String(carriage.port)}, its tmux behind ${wrapper}`);

  // ======================================================================
  // THE PARENT, first, on the same profile: its door confirmed over fourteen
  // routes, the phones paired, RNP, RN2's record and RN7's parent half
  // ======================================================================
  await launch('p349-parent', resolve(PARENT), async (main) => {
    firstLogTs = firstTsOf(appLogText());
    await pocket(main, 'setDoor', { on: true });
    const door = await confirmDoor(main);
    if (!door.ok) throw new Error(`the parent's door never listened: ${door.why}`);
    A = await pairPhone(main, 'p349 phone A');
    if (!A.ok) throw new Error(`phone A did not pair with the parent: ${A.why}`);
    B = await pairPhone(main, 'p349 phone B');
    if (!B.ok) throw new Error(`phone B did not pair with the parent: ${B.why}`);
    await bridge(main, `window.__p293.addProject(${J(join(PROJECTS, 'main'))})`);
    const rnpShell = await shell(main, 'p349-rnp');
    const nameOf = async (id) => ({ name: (await sessions(main)).find((s) => s.id === id)?.name ?? null });
    const rowBefore = await nameOf(rnpShell);
    const linesBefore = writeLines('rename');
    const typed = canary('rnp');
    const renameHead = await headOnly(A, { name: typed, session: rnpShell, write: freshWriteId() });
    const renameFull = (await signedPost(A.phone, A.door, '/v1/rename', { name: typed, session: rnpShell, write: freshWriteId() })).status;
    await sleep(800);
    rnp = { renameHead, renameFull, lines: linesBetween(linesBefore, writeLines('rename')), row: { before: rowBefore, after: await nameOf(rnpShell) }, offers: await offersOf(A, rnpShell) };
    // RN2's record: a far shell the PARENT ends, which HEAD finds as a record only.
    if (await machineUp(main)) {
      try {
        rn2RecordId = await shell(main, 'p349-rn2-record', { far: true });
        await bridge(main, `window.gmux.sessions.kill(${J(rn2RecordId)})`);
        if ((await waitEnded(main, rn2RecordId)) === null) rn2RecordId = null;
      } catch (err) {
        report.printed.rn2Record = `the parent could not make and end its far shell: ${String(err?.message ?? err)}`;
        rn2RecordId = null;
      }
    }
    // RN7's parent half: the Mac's own rename over the corpus.
    if (on('RN7')) {
      const id = await shell(main, 'p349-rn7');
      rn7Parent = await macRenames(main, id);
    }
    say(`parent: rename ${String(renameHead)}/${String(renameFull)}; RN2's record ${J(rn2RecordId)}; RN7 ${rn7Parent === null ? 'not run' : `${String(rn7Parent.length)} names`}`);
  });

  // ======================================================================
  // HEAD, over the parent's agreement
  // ======================================================================
  await launch('p349-head', ROOT, async (main) => {
    await bridge(main, `window.__p293.addProject(${J(join(PROJECTS, 'main'))})`);
    machineOk = await machineUp(main);
    say(`the loopback machine usable: ${String(machineOk)}`);
    const ids = {};
    ids.shell = await shell(main, 'p349-rn1-shell');

    // ---- RN0: rename waits for its own Allow -------------------------------------------------
    await pocket(main, 'setDoor', { on: true });
    const listening = await waitStatus(main, (s) => s.state === 'listening' && (s.confirmState === 'confirmed' || s.confirmable === true), 60_000);
    const before = listening.status;
    if (A === null || (await signedGet(A.phone, A.door, '/v1/blocked')).status !== 200) throw new Error('phone A, paired at the parent, cannot read at HEAD');
    let settings = null;
    try {
      settings = await attachSettings(main);
      const nameOf = async (id) => ({ name: (await sessions(main)).find((s) => s.id === id)?.name ?? null });
      const rowBefore = await nameOf(ids.shell);
      const lines0 = writeLines('rename');
      const typed = canary('rn0');
      const renameHead = await headOnly(A, { name: typed, session: ids.shell, write: freshWriteId() });
      const renameFull = (await renameWrite(A, ids.shell, typed)).status;
      await sleep(800);
      const linesBefore = linesBetween(lines0, writeLines('rename'));
      const rowAfter = await nameOf(ids.shell);
      const offersBefore = await offersOf(A, ids.shell);
      const sheet = await status(main);
      const face = (sheet?.confirmFace?.added ?? []).map((x) => ({ id: x.id, title: x.title, sentence: x.sentence }));
      const drawn = await waitFor(async () => {
        const t = await cdpEval(settings, `(() => { const b = document.querySelector('section[aria-label="Phone"] [data-phone-face-new="rename"]'); return b === null ? null : b.textContent; })()`);
        return typeof t === 'string' && t.length > 0 ? t : null;
      }, 10_000, 200);
      // RECORDED, NOT GRADED: over an agreement on record the face draws only the New line, never "Your phone can".
      const canRowDrawn = await cdpEval(settings, `(() => { const s = document.querySelector('section[aria-label="Phone"]'); return s !== null && s.textContent.includes('Your phone can'); })()`);
      const honesty = await cdpEval(settings, `(() => { const b = document.querySelector('section[aria-label="Phone"] [data-phone-confirm] [data-phone-confirm-details]'); return b === null ? null : [...b.querySelectorAll('p.set-config-warning')].map((p) => p.textContent); })()`);
      // ONE Allow, pressed where a person presses it, once it may be pressed, and never again.
      let allowPresses = 0;
      const pressed = await waitFor(async () => ((await cdpEval(settings, `(() => { const b = document.querySelector('section[aria-label="Phone"] [data-phone-action="confirm-door"]'); if (b === null || b.disabled) return false; b.click(); return true; })()`)) === true ? true : null), 15_000, 250);
      if (pressed === true) allowPresses += 1;
      const allowed = await waitStatus(main, (s) => s.confirmState === 'confirmed' && (s.routesWaiting ?? []).length === 0 && (s.routesAllowed ?? []).includes('rename'), 40_000);
      await waitStatus(main, (s) => s.state === 'listening', 40_000);
      const renameControl = await headOnly(A, { name: 'p349 rn0 control', session: ids.shell, write: freshWriteId() });
      const offersAfter = await waitFor(async () => {
        const o = await offersOf(A, ids.shell);
        return o !== null && o.detail && o.sessionsRows && o.renames ? o : null;
      }, 15_000, 500) ?? (await offersOf(A, ids.shell));
      report.printed.rn0 = { canRowDrawn };
      arm('RN0', {
        words: { renameTitle: WORDS_HEAD.renameTitle, renameSentence: WORDS_HEAD.renameSentence, renameClause: WORDS_HEAD.renameClause, doorHonesty: WORDS_HEAD.doorHonesty },
        statusRead: before !== null && before !== undefined,
        before: { confirmState: before?.confirmState ?? null, routesWaiting: before?.routesWaiting ?? [], routesAllowed: before?.routesAllowed ?? [] },
        renameHead,
        renameFull,
        linesBefore,
        row: { before: rowBefore, after: rowAfter },
        offersBefore,
        face,
        // THE PROBE REVIEW of 2026-10-30: the face is read from the status; a status never read is no face.
        faceRead: sheet !== null && sheet !== undefined,
        drawn,
        canRowDrawn,
        honesty,
        allowPresses,
        after: { confirmState: allowed.status?.confirmState ?? null, routesWaiting: allowed.status?.routesWaiting ?? null, routesAllowed: allowed.status?.routesAllowed ?? [] },
        renameControl,
        offersAfter
      });
    } finally {
      settings?.close();
      settings = null;
    }

    // ---- the argv sampler, over every arm that types a name ------------------------------------
    sampler = startArgvSampler(canaries);

    // ---- RN1: Method 1's matrix ----------------------------------------------------------------
    await armSafely('RN1', async () => {
      ids.claude = await agentSession(main, 'p349-rn1-claude', 'claude');
      ids.codex = await agentSession(main, 'p349-rn1-codex', 'codex');
      ids.ended = await shell(main, 'p349-rn1-ended');
      await endSession(A.phone, A.door, ids.ended);
      if ((await waitEnded(main, ids.ended)) === null) throw new Error('the local session to end never read ended');
      if (!machineOk) throw new Error('the loopback machine is not usable, so the matrix has no far target');
      ids.far = await shell(main, 'p349-rn1-far', { far: true });
      const out = { words: { SESSION_NAME_EMPTY: WORDS_HEAD.SESSION_NAME_EMPTY, SESSION_NAME_TOO_LONG: WORDS_HEAD.SESSION_NAME_TOO_LONG, SESSION_NAME_CHARACTER: WORDS_HEAD.SESSION_NAME_CHARACTER }, targets: [] };
      for (const kind of RN1_KINDS) {
        const target = { kind, id: ids[kind] };
        const renames = [];
        for (const typed of [...MATRIX, canary(`rn6-${kind}`)]) renames.push(await renameAndRead(main, A, target, typed));
        out.targets.push({ kind, id: target.id, renames });
        say(`RN1 ${kind}: ${String(renames.length)} names`);
      }
      arm('RN1', out);
    });

    // ---- RN2: an ended session on the machine, two ways ---------------------------------------
    await armSafely('RN2', async () => {
      if (!machineOk) throw new Error('the loopback machine is not usable');
      const one = async (id) => {
        if (id === null) return null;
        const row = (await sessions(main)).find((s) => s.id === id) ?? null;
        const answer = await renameWrite(A, id, RN2_TYPED);
        await sleep(1_000);
        const after = (await sessions(main)).find((s) => s.id === id) ?? null;
        return { id, statusAtSend: row?.status ?? null, remote: row?.machine?.id === MACHINE_ID, answer, before: { name: row?.name ?? null }, after: { name: after?.name ?? null } };
      };
      const goneId = await shell(main, 'p349-rn2-gone', { far: true });
      await endSession(A.phone, A.door, goneId);
      if ((await waitEnded(main, goneId)) === null) throw new Error('the far session ended in this run never read ended');
      const from = Date.now();
      const record = await one(rn2RecordId);
      const gone = await one(goneId);
      const to = Date.now();
      const entries = farEntries();
      arm('RN2', {
        words: { LIFECYCLE_SESSION_CHANGED: WORDS_HEAD.LIFECYCLE_SESSION_CHANGED },
        record,
        gone,
        far: entries === null ? { read: false, names: rn2NamesOf(RN2_TYPED), hits: [] } : { read: true, names: rn2NamesOf(RN2_TYPED), hits: farNaming(entries, from, to, rn2NamesOf(RN2_TYPED)) }
      });
    });

    // ---- RN3: a start, then a rename ------------------------------------------------------------
    await armSafely('RN3', async () => {
      const list = await readSessions(A.phone, A.door);
      const project = (list.answer?.start?.projects ?? []).find((p) => p.place === 'local')?.id ?? null;
      if (project === null) throw new Error(`the Sessions answer offers no local project to start in (${J(list.answer?.start ?? null)})`);
      const reply = await startSession(A.phone, A.door, { project, agent: 'claude' });
      const read = startAnswerOf(reply, reply.write);
      const startedAt = Date.now();
      const start = { status: reply.status, ok: read.ok, outcome: read.answer?.outcome ?? null, id: read.answer?.session?.id ?? null, name: read.answer?.session?.name ?? null };
      let local = { start, rename: null, livedMs: null };
      if (start.id !== null) {
        made.set(start.id, { far: false, name: start.name });
        agentsStarted.add(start.id);
        await waitFor(async () => (await sessions(main)).some((s) => s.id === start.id) ? true : null, 20_000, 200);
        const entry = await renameAndRead(main, A, { kind: 'claude', id: start.id }, canary('rn3'));
        local = { start, rename: entry, livedMs: Date.now() - startedAt };
      }
      let far = null;
      if (machineOk) {
        const madeAt = Date.now();
        const id = await shell(main, 'p349-rn3-far', { far: true });
        const entry = await renameAndRead(main, A, { kind: 'far', id }, canary('rn3f'));
        far = { id, rename: entry, livedMs: Date.now() - madeAt };
      }
      report.printed.rn3 = { localDefaultName: start.name, localDefaultLivedMs: local.livedMs, farDefaultLivedMs: far?.livedMs ?? null };
      arm('RN3', { local, far });
    });

    // ---- RN4: M2 in the app ------------------------------------------------------------------
    await armSafely('RN4', async () => {
      const rounds = [];
      if (machineOk) {
        const id = await shell(main, 'p349-rn4', { far: true });
        for (let i = 0; i < RN4_ROUNDS; i += 1) {
          const a = await renameWrite(A, id, `p349 rn4 ${i % 2 === 0 ? 'a' : 'b'}`);
          rounds.push({ status: a.status, ok: a.ok, outcome: a.outcome, ms: a.ms });
        }
        const sorted = rounds.map((x) => x.ms).sort((a, b) => a - b);
        report.printed.rn4 = { p50: sorted[Math.floor(sorted.length * 0.5)], p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))], max: sorted[sorted.length - 1] };
      }
      arm('RN4', { limitMs: ANSWER_TIMEOUT_MS, rounds });
    });

    // ---- RN5: a Mac window mid-rename ------------------------------------------------------------
    await armSafely('RN5', async () => {
      const id = await shell(main, 'p349-rn5');
      const others = async () => {
        const list = await sessions(main);
        return list.filter((s) => s.id !== id && made.has(s.id)).map((s) => ({ id: s.id, name: s.name, tmuxName: s.tmuxName })).sort((a, b) => a.id.localeCompare(b.id));
      };
      const DRAFT = 'p349 the window draft';
      const INPUT = '.srow-rename-input, .stab-rename-input, .strip-rename-input';
      // THE FIX ROUND of 2026-10-30 (the verify lens): machineUp focused the far folder's tab, so this session's row
      // was not drawn, the click found nothing, and F2 opened the ACTIVE session's draft while the phone renamed
      // this one. So its project's tab is focused first (addProject focuses a tab already open), its OWN strip tab
      // or row is clicked, and the draft is set only in an input whose session is this one (`owner`).
      const focused = await bridge(main, `window.__p293.addProject(${J(join(PROJECTS, 'main'))})`);
      await sleep(800);
      const clicked = await cdpEval(main, `(() => { const sel = '[data-session-id="' + CSS.escape(${J(id)}) + '"]'; const r = document.querySelector('.stab' + sel) ?? document.querySelector('.srow' + sel) ?? document.querySelector(sel); if (r === null) return null; r.click(); r.focus(); return r.className || r.tagName; })()`);
      await sleep(400);
      await cdpEval(main, "(() => { (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', code: 'F2', bubbles: true, cancelable: true })); return true; })()");
      // The session each open rename input belongs to, read before anything is set in one.
      const OWNERS = `JSON.stringify([...document.querySelectorAll(${J(INPUT)})].map((el) => el.closest('[data-session-id]')?.getAttribute('data-session-id') ?? null))`;
      let owner = null;
      const met = await waitFor(async () => {
        const all = JSON.parse(await cdpEval(main, OWNERS));
        if (all.length === 0) return null;
        if (!all.includes(id)) {
          owner = all[0];
          return 'another';
        }
        owner = id;
        const set = await cdpEval(main, `(() => { const el = [...document.querySelectorAll(${J(INPUT)})].find((x) => x.closest('[data-session-id]')?.getAttribute('data-session-id') === ${J(id)}) ?? null; if (el === null) return null; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${J(DRAFT)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
        return set === DRAFT ? 'own' : null;
      }, 8_000, 200);
      const opened = met === 'own';
      const ownInput = `[...document.querySelectorAll(${J(INPUT)})].find((x) => x.closest('[data-session-id]')?.getAttribute('data-session-id') === ${J(id)}) ?? null`;
      const othersBefore = await others();
      const typed = canary('rn5');
      const answer = opened ? await renameWrite(A, id, typed) : null;
      await sleep(1_000);
      const draftAfter = await cdpEval(main, `(() => { const el = ${ownInput}; return el === null ? null : el.value; })()`);
      const listName = (await sessions(main)).find((s) => s.id === id)?.name ?? null;
      const othersAfter = await others();
      // Close the draft without saving it: this session's own input, or whichever F2 opened.
      await cdpEval(main, `(() => { const el = ${ownInput} ?? document.querySelector(${J(INPUT)}); if (el !== null) el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return true; })()`);
      arm('RN5', { id, focused: focused.ok ? focused.value : null, clicked, owner, opened, typed, answer, listName, draft: { before: DRAFT, after: draftAfter }, others: { before: othersBefore, after: othersAfter } });
    });

    // ---- RN7's HEAD half ------------------------------------------------------------------------------
    let rn7Head = null;
    if (on('RN7')) {
      try {
        const id = await shell(main, 'p349-rn7-head');
        rn7Head = await macRenames(main, id);
      } catch (err) {
        report.printed.rn7 = `HEAD's half stopped: ${String(err?.message ?? err)}`;
      }
      if (rn7Parent === null) cannotRead('RN7', "the parent's half never ran");
      else if (rn7Head === null) cannotRead('RN7', "HEAD's half never ran");
      else arm('RN7', { names: CORPUS.map((typed, i) => ({ typed, parent: rn7Parent[i] ?? null, head: rn7Head[i] ?? null })) });
    } else report.arms.push({ id: 'RN7', ok: null, said: 'not run: P349_ARMS left it out' });

    // ---- the manifest copy RUN reads, BEFORE the ends --------------------------------------------
    {
      const rows = manifestRows();
      manifestBefore = rows === null ? null : [...rows.entries()].map(([id, row]) => ({ id, ...row }));
    }

    // ---- the ends: every session this run made, ended and removed by main's own verbs ------------
    {
      const all = [...made.keys()];
      let endedCount = 0;
      let removedCount = 0;
      for (const id of all) if ((await bridge(main, `window.gmux.sessions.kill(${J(id)})`)).ok) endedCount += 1;
      await waitFor(async () => ((await sessions(main)).filter((s) => made.has(s.id) && ['running', 'idle', 'needs_input'].includes(s.status)).length === 0 ? true : null), 60_000, 500);
      for (const id of all) if ((await bridge(main, `window.gmux.sessions.discard(${J(id)})`)).ok) removedCount += 1;
      await sleep(1_500);
      ends = { made: all.length, ended: endedCount, removed: removedCount, leftListed: (await sessions(main)).filter((s) => made.has(s.id)).length };
      say(`the ends: ${J(ends)}`);
    }
  });
} catch (err) {
  // A run that stopped left every arm after the stop unread, which is exit 2 ("could not run"), never 1.
  unreadable += 1;
  report.error = String(err?.message ?? err);
  say(`the run stopped, so every arm after this point is UNREADABLE: ${report.error}`);
} finally {
  /** One step of the ending: a step that throws is written down and the ending goes on. */
  const safely = (label, fn, fallback = null) => {
    try {
      return fn();
    } catch (err) {
      (report.ending ??= []).push(`${label}: ${String(err?.message ?? err)}`);
      return fallback;
    }
  };
  if (sampler !== null) argvRead = sampler.stop();
  const leaked = watch === null ? [] : safely('the Tailscale watcher', () => watch.stop(), []);
  const endedStandin = standin === null ? { ended: [], left: [] } : safely('the Tailscale stand-in', () => endStandinProcesses(standin.dir, 1_500), { ended: [], left: ['unknown'] });
  if (dns !== null) await dns.close().catch((err) => (report.ending ??= []).push(`the DNS stand-in: ${String(err?.message ?? err)}`));
  // Every agent stand-in this run started, each re-read before it is signalled (a pid can be handed out again): a pid a
  // stand-in of THIS run wrote in its hello whose command line is still the stand-in's or names this run's folder, and
  // any other process whose command line names this run's folder. Never a process by the stand-in's path alone.
  const helloPids = new Set(safely("the stand-ins' hellos", () => hellos(STANDIN_DIR), []).flatMap((h) => [Number(h.pid), Number(h.runnerPid)]).filter((p) => Number.isInteger(p) && p > 1));
  const ours = (rows, pid) => {
    const command = rows.get(pid)?.command ?? '';
    if (pid === process.pid || command === '') return false;
    return command.includes(RUN) || (helloPids.has(pid) && command.includes(STANDIN_PATH));
  };
  const table = processTable();
  const pids = [...new Set([...helloPids, ...table.keys()])].filter((p) => Number.isInteger(p) && p > 1 && ours(table, p));
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* gone with its pane */
    }
  }
  for (let i = 0; i < 20 && pids.some(alive); i += 1) await sleep(100);
  {
    const now = processTable();
    for (const pid of pids.filter((p) => alive(p) && ours(now, p))) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* gone */
      }
    }
  }
  await sleep(300);
  const after = processTable();
  const agentsLeft = pids.filter((p) => alive(p) && ours(after, p)).length;
  const runLeft = [...after.values()].filter((r) => r.pid !== process.pid && r.command.includes(RUN)).length;
  // Electrons, counted once at the end: anything carrying this run's profile, and the shims and apps this run started
  // still running an Electron or the app (the main process renames itself to the bare `Tortie`).
  const electronsLeft = [...after.values()].filter((r) => r.command.includes(PROFILE) || ((shims.has(r.pid) || apps.has(r.pid)) && /[Ee]lectron|Tortie/.test(r.command))).length;
  // RNP, graded now that every read of it is in.
  if (rnp !== null) arm('RNP', rnp);
  else cannotRead('RNP', 'the parent never ran its half');
  // RN6, after the app is gone: every file this run's world holds, app.log, the sampler.
  if (on('RN6')) {
    // THE FIX ROUND of 2026-10-30 (the verify lens): app.log AND its one rotated file, each canary told apart by
    // the line it is on; the harness folder walked by its REAL path; and every store compared canonical.
    const text = appLogBoth();
    const logRead = text === null ? { hits: 0, known: 0 } : appLogCanaryHits(text, canaries);
    const fileHits = [];
    let filesScanned = 0;
    const places = { manifest: MANIFEST, copies: COPIES, backups: join(PROFILE, 'gmux', 'backups'), snapshots: SNAPSHOTS, farLog: FAR_LOG };
    const logs = new Set([canonicalOf(APP_LOG), canonicalOf(`${APP_LOG}.1`)]);
    let walkRoot = HARNESS_DIR;
    try {
      walkRoot = realpathSync(HARNESS_DIR);
    } catch {
      /* as handed: storeOfFile compares canonical paths either way */
    }
    const walk = (dir) => {
      let names = [];
      try {
        names = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of names) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.isFile()) {
          filesScanned += 1;
          if (logs.has(canonicalOf(p))) continue;
          let s;
          try {
            s = readFileSync(p).toString('utf8');
          } catch {
            continue;
          }
          for (const c of canaries) if (s.includes(c)) fileHits.push({ file: p.slice(walkRoot.length + 1), store: storeOfFile(p, places) });
        }
      }
    };
    walk(walkRoot);
    arm('RN6', {
      canaries: canaries.size,
      filesScanned,
      fileHits,
      appLogRead: text !== null,
      appLogHits: logRead.hits,
      appLogKnown: logRead.known,
      lines: { rename: writeLines('rename')?.length ?? null },
      logLost: logLost(),
      acted: { ...acted },
      unknown: { ...actedUnknown },
      argvSamples: argvRead.samples,
      argvHits: argvRead.hits,
      storeHits: argvRead.storeHits
    });
  }
  // RUN: the manifest's programs, read from a COPY beside its WAL after the app is gone, and the copy taken before the ends.
  const m = manifestSessions(MANIFEST);
  const roots = [RUN, FAR_HOME];
  try {
    roots.push(realpathSync(FAR_HOME));
  } catch {
    /* as written */
  }
  // A SHELL row runs the login shell: `[$SHELL, -l]` on this Mac and an empty argv on a machine, so its argv[0] is a
  // shell /etc/shells lists, or none. Every other row ran an agent, and its argv[0] must be a program of this run.
  const SHELLS = safely('/etc/shells', () => readFileSync('/etc/shells', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l.startsWith('/')), ['/bin/zsh', '/bin/bash', '/bin/sh']);
  const outside = m.read ? m.rows.filter((row) => !(roots.some((root) => within(root, row.argv0)) || (row.agent === 'shell' && (row.argv0 === null || SHELLS.includes(row.argv0))))).map((row) => ({ id: row.id, name: row.name, agent: row.agent, argv0: row.argv0 })) : [];
  const started = [...agentsStarted];
  const armsRan = AGENT_ARMS.some((id) => on(id));
  if (!armsRan) say('RUN: P349_ARMS left out RN1 and RN3, so no agent session started and its manifest clause is not run');
  const agents = manifestBefore === null
    ? { read: false, armsRan, started, found: [], inside: [] }
    : { read: true, armsRan, started, found: started.filter((id) => manifestBefore.some((row) => row.id === id)), inside: started.filter((id) => manifestBefore.some((row) => row.id === id && within(RUN, row.argv0))) };
  // His history: read now, and when it moved, read again after a quiet wait in which this run starts nothing.
  const history = { before: HISTORY_BEFORE, after: historyStat(), quiet: null };
  if (history.after !== history.before) {
    say(`his shell history moved across the run (${history.before} to ${history.after}); starting nothing for ${String(HISTORY_QUIET_MS / 1000)} s and reading it again`);
    await sleep(HISTORY_QUIET_MS);
    history.quiet = { again: historyStat(), waitedMs: HISTORY_QUIET_MS };
  }
  arm('RUN', {
    tailscalePreflight,
    dnsPreflights,
    agentsHeld,
    shadows,
    resolved: resolvedOk,
    hiddenUnresolved,
    manifest: { read: m.read, rows: m.rows.length, outside, why: m.why, agents },
    realTailscale: leaked.length,
    samples: watch?.samples() ?? 0,
    forbidden: standin === null ? 0 : standin.forbidden().length,
    standinLeft: endedStandin.left.length,
    agentsLeft,
    runLeft,
    electronsLeft,
    history,
    ends
  });
  // Every graded arm says something: one the run never reached is named, and counted once more only when no stop
  // already counted it.
  for (const id of ['RNP', 'RN0', ...[...ARMS].filter((x) => GRADERS[x] !== undefined), 'RUN']) {
    if (report.arms.some((a) => a.id === id)) continue;
    if (report.error === undefined) cannotRead(id, 'the run never read it');
    else report.arms.push({ id, ok: null, said: 'not read: the run stopped before it' });
  }
  safely('the report', () => {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'probe-p349.json'), `${JSON.stringify(report, (_k, v) => (typeof v === 'bigint' ? String(v) : v), 2)}\n`, { mode: 0o600 });
  });
  if (!KEEP) safely('the scratch world', () => rmSync(RUN, { recursive: true, force: true }));
  else say(`kept ${RUN} (P349_KEEP=1): the stand-ins' logs under ${STANDIN_DIR}, the far log ${FAR_LOG}; every reading in ${OUT}`);
}

say(`${String(report.arms.filter((a) => a.ok === true).length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
// THE PROBE REVIEW of 2026-10-30: a launch refused because an agent other than the stand-ins could run is no run.
if (agentsRefused) say('a launch was refused because an agent other than the stand-ins could have run: no run, exit 2');
process.exit(agentsRefused ? 2 : failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
