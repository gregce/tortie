#!/usr/bin/env node
/**
 * probe:p331 — Phase 331 inside the real app, at the parent and at HEAD.
 *
 * WHAT IT IS FOR. Phase 331 (build/p331/SPEC.md §2.11) launches and resumes
 * every Codex with `-c tui.fullscreen_transcript=false` and every Claude Code
 * on this Mac with `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1`, sets a row's fixed
 * launch tokens aside when a person's own flags are recovered, and brings rows
 * recorded before the phase across in one boot pass. He reported the defect
 * ("you can't scroll up in the window … it shows you prompt history"), so the
 * PARENT MEASUREMENT IS MANDATORY: this probe drives the parent build and then
 * HEAD, and an arm whose parent does not show the defect is UNREADABLE, never a
 * pass.
 *
 * TWO ELECTRONS, ONE AFTER THE OTHER, NEVER AT ONCE, on ONE scratch profile,
 * ONE scratch HOME and ONE tmux socket (`gmux-p331b-<pid>`), each through
 * `build/electron-run.mjs`:
 *   1. the PARENT (`P331_PARENT_CHECKOUT`, a BUILT checkout of the phase's
 *      parent), launched with NO `tmuxSocket` handed to `withElectron`, so its
 *      teardown leaves the scratch server running and HEAD meets the rows and
 *      the processes the parent made (the reboot is simulated by ending three
 *      of those tmux sessions out of band between the launches);
 *   2. HEAD (this checkout), launched WITH the socket, so its teardown ends the
 *      server; this probe's own `finally` ends it again and unlinks its file.
 * No third launch: the boot pass's idempotence is proven over the manifest
 * copy by the verifier (SPEC §9.2), not here.
 *
 * WHAT IT DRIVES, each arm graded from its parent and HEAD readings together:
 *   matrix  claude, cursor, codex, deepseek, muse, pi, omp and opencode, each
 *           created through the preload bridge's `sessions:create` in its own
 *           scratch folder (deepseek `--skip-onboarding`, cursor
 *           `--disable-auto-update`), and per build: the count of
 *           `ESC[?1049h` in a `pipe-pane -o` stream from the pane's first byte
 *           (a scratch-server `after-new-session` hook opens the pipe), the
 *           mouse modes asked for, and after the screen settles
 *           `#{alternate_on}`, `#{mouse_any_flag}` and `#{history_size}`.
 *           Claude and Codex must leave the alternate screen at HEAD; every
 *           other agent must read at HEAD exactly what it read at the parent.
 *   (a)     three real wheel notches (CDP `Input.dispatchMouseEvent`) over a
 *           fresh Codex after a local `!seq`: the parent's xterm sends Up and
 *           the composer recalls a prompt; HEAD's xterm sends nothing and tmux
 *           scrolls its own history.
 *   (b)     the same over an OPEN APPROVAL (the mock's escalated command):
 *           the parent's answer moves off `1. Yes, proceed` (recorded, never
 *           pressed, declined with Esc); HEAD's never moves.
 *   (c)     Ctrl+T, three notches, `q`: HEAD's pager on the alternate screen,
 *           tmux history equal before, during and after, the composer the same.
 *   (d)     a Codex the PARENT created with `--yolo` and harvested (one mock
 *           turn), its tmux session ended out of band before HEAD: the pass
 *           rewrote its resume argv once, restore arms the pair with `--yolo`,
 *           and it comes back inline with `permissions: YOLO mode`.
 *   (e)     Restart of that pre-phase row: the replacement's recorded argv is
 *           `[<abs codex>, '-c', 'tui.fullscreen_transcript=false', '--yolo']`.
 *   (f)     a Codex created with the person's own `-c tui.fullscreen_transcript=true`:
 *           the alternate screen, and the wheel is arrows again (the limit).
 *   (g)     a SpecStory-captured Codex, made at the parent and restored at
 *           HEAD, and one created at HEAD: the pair inside specstory's `-c`.
 *   (h)     controls: a plain shell, `vim` with no mouse, and
 *           `build/p331/stand-in-sgr.mjs` (1049 plus SGR mouse): what xterm
 *           sent over each is byte for byte the same at both builds.
 *   (i)     a new folder's Codex trust question: the parent on the alternate
 *           screen with no mouse, HEAD not. Nothing is pressed.
 *   (j)     a parent-made Claude row, its session ended out of band, a
 *           fabricated 120-line transcript planted at its own session file,
 *           restored: HEAD's pass merged the variable into the row, the pane is
 *           inline, and the last 1000 lines hold line 001.
 *   (k)     the wheel, the scrollbar thumb and the app's own capture of the
 *           last 1000 lines over the inline Claude and the inline Codex.
 *   (l)     a reader parked in copy mode across a window resize made at least
 *           33 s after the attach and across a return to the session (the
 *           method of `probe:p292`'s arms d and f).
 *   (m)     the parent's full-screen Claude line "tmux detected · …" recorded,
 *           and never on HEAD's screen.
 *   (n)     `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` set on the shared list and on
 *           Claude's own list through the Settings IPC is dropped at HEAD, and
 *           each scope's refusal is SPEC §2.6's sentence.
 *   (o)     a Claude the parent created and never ended still reads the
 *           alternate screen at HEAD (the stated limit, measured).
 *
 * THE SCRATCH WORLD. Everything is under `/private/tmp/p331-probe-<pid>`: the
 * profile, the HOME (its `.zprofile` and `.zshrc` put P331_AGENT_PATH first on
 * PATH and export the update guards), the projects and the pane streams.
 * Codex runs under that HOME's `.codex` with a dummy key written by `codex
 * login --with-api-key` AFTER a config naming the file store,
 * `daemon_auto_start = false`, `check_for_update_on_startup = false`, every
 * scratch folder but (i)'s trusted, and its model provider pointed at
 * `build/p331/mock-responses.mjs` IN THIS PROCESS on 127.0.0.1, so NO MODEL
 * TURN IS SPENT AND NO TOKEN IS USED. Codex fetches
 * `https://github.com/openai/plugins.git` at start into that HOME (research 133
 * §9); no measured config key turns that off, so it is left and recorded. Claude
 * runs with a FAKE `ANTHROPIC_API_KEY`, `CLAUDE_CONFIG_DIR` at the scratch
 * `~/.claude`, a `.claude.json` that has onboarded and approved the fake key
 * and trusts each scratch folder, and `settings.json` `{ "tui": "fullscreen" }`,
 * so the parent's Claude is full-screen whatever his own settings say.
 *
 * TORTIE'S CLAUDE HOOKS ARE OFF IN BOTH LAUNCHES (`GMUX_DISABLE_AGENT_HOOKS=1`),
 * and that is a measured necessity, not a convenience. The hook file Tortie
 * hands Claude lives under the PROFILE (`<userData>/gmux/hooks/claude/`), so
 * every Claude Tortie starts names the profile path on its command line, and
 * `withElectron`'s teardown ends every process whose command line names the
 * profile. With hooks on, the parent's teardown would end every Claude the
 * parent made and arm (o) could never be read. Off, the only change to Claude's
 * argv is the absent `--settings <hook file>` pair, whose file carries no `tui`
 * key (research 134). `P331_HOOKS=1` keeps them on and reads (o) UNREADABLE.
 *
 * WHAT IT REFUSES, exit 2 as UNREADABLE rather than pass a defect it never saw:
 * no `P331_PARENT_CHECKOUT`, or one with no `out/main/index.js`, or this
 * checkout unbuilt; no vendored tmux; a scratch login shell that does not
 * resolve every one of the eight bare names; `codex --version` below 0.158 or
 * `claude -v` below 2.1.132; and a parent Codex pane that reads
 * `mouse_any_flag` 1 (a Mac where Codex's tmux check cannot run) makes the
 * reproduction arms UNREADABLE. It records which of `/opt/homebrew/bin/tmux`,
 * `/usr/local/bin/tmux` and `/opt/local/bin/tmux` exist, and every agent
 * install's realpath and mtime before the first launch and after the last: a
 * moved install is reported UNREADABLE, never absorbed.
 *
 * IT NEVER starts gemini, qwen, agy or grok in any form, and that is a thing it
 * DOES rather than a thing it avoids: the app it launches version-probes every
 * agent its detection scan resolves (the boot warm on this empty profile, and
 * every `agents:list`), and a scan over this PATH resolves all four and runs
 * `--version` on each (measured by two Phase 331 verifiers). So before EACH
 * launch the probe writes a scratch `<profile>/gmux/config/agents.json` that
 * renames the binaries of gemini, qwen, antigravity, grok and droid to names
 * nothing on this Mac carries (`NEVER_OVERLAY`), proves through the pinned tsx,
 * with THAT build's own overlay parser and resolver and before anything starts,
 * that all five rows merge with the renamed binaries and resolve nowhere, and
 * reads `agents:list` back from the app before any arm: all five must answer
 * `binPath` null, or the run stops, exit 2. It never names `-L gmux`
 * or the default tmux server (every tmux command it runs names the scratch
 * socket), never runs `pkill`, never signals a process it did not see start
 * under one of its own panes, reads no credential, keychain, APNs key, agent
 * session store or conversation of his, installs nothing, takes no update, and
 * takes no photograph (`npm run shot` is not called): every visual claim is a
 * byte count, a tmux reading or a string off xterm's own buffer. Every agent
 * pid it saw is ended by pid in its `finally`, TERM then KILL, only while its
 * command line is still the one recorded; the scratch server is ended and its
 * socket file unlinked there too; the mock is closed there.
 *
 * VERIFIERS ONLY, UNDER THE ELECTRON LOCK. Builders write it and never run it.
 * BUILD FIRST, both checkouts: it carries no `npm run build &&` because a run
 * against another checkout must not rebuild this one.
 *
 *   P331_PARENT_CHECKOUT=/path/to/built/parent npm run -s probe:p331
 *   P331_ARMS=matrix,a,b ...        named arms only (the arms their readings need come along)
 *   P331_KEEP=1 ...                 keep the scratch world, the pane streams and the report
 *   P331_AGENT_PATH=/a:/b ...       the PATH head the scratch login shell gets
 *   P331_HOOKS=1 ...                Tortie's Claude hooks on (arm (o) then reads UNREADABLE)
 *   P331_REPORT=/private/tmp/x.json the report's copy, outside this checkout
 *   node build/p331/probe-p331.mjs --self-test    the graders over fixtures, launches nothing
 *
 * WHAT IT WRITES. `<harness>/probe-p331.json` (kept with P331_KEEP=1) and a copy
 * BESIDE the scratch directory, `/private/tmp/p331-probe-<pid>.json`
 * (`P331_REPORT` names another path outside this checkout), never under `out/`,
 * which electron-builder packs: per arm a verdict and a sentence, and per build
 * its readings. Never a key, an env value, a token or a request body.
 *
 * THE GUARD CHECK READS THE AGENT'S OWN PROCESS. A restored pane's own process
 * is the holder shell, whose starting environment lacks the guards its login
 * files export to the agent it starts, so the update guards are judged on the
 * processes under the pane whose command names the agent. pi rewrites its
 * process title, which leaves `ps -E` no environment to read for it at all;
 * such a process is recorded as HIDDEN and its guards are not judged (a stated
 * limit: its install is still compared before and after).
 *
 * Exit 0 when every arm read as required, 1 when an arm failed, 2 when it
 * could not run or an arm could not be READ, which is never a pass.
 */

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { tsxCli } from '../ts-runner.mjs';
import { APPROVAL_MARKER, REPLY, startMockResponses } from './mock-responses.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// ---------------------------------------------------------------------------
// The phase's own spellings, and what the arms look for
// ---------------------------------------------------------------------------

const PAIR = ['-c', 'tui.fullscreen_transcript=false'];
const OPT_BACK = ['-c', 'tui.fullscreen_transcript=true'];
const VARIABLE = 'CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN';
/** SPEC §2.6: the two sentences Settings composes for the variable. */
const SENTENCE_SHARED = `An agent Tortie launches already sets ${VARIABLE} itself. Pick one source for each name.`;
const SENTENCE_CLAUDE = `This agent already sets ${VARIABLE} itself. Pick one source for each name.`;
const GUARDS = Object.freeze({
  DISABLE_AUTOUPDATER: '1',
  MUSE_NO_AUTO_UPDATE: '1',
  OPENCODE_DISABLE_AUTOUPDATE: '1',
  AGENT_CLI_UPDATE_CHECK_URL: 'http://127.0.0.1:9/',
  OMP_SKIP_SETUP: '1'
});
/** The eight agents this phase may start, with the flags each needs to reach its main screen. */
const EIGHT = Object.freeze([
  { id: 'claude', names: ['claude'] },
  { id: 'cursor', names: ['cursor-agent'], extras: ['--disable-auto-update'] },
  { id: 'codex', names: ['codex'] },
  { id: 'deepseek', names: ['codewhale', 'codew', 'deepseek'], extras: ['--skip-onboarding'] },
  { id: 'muse', names: ['muse'] },
  { id: 'pi', names: ['pi'] },
  { id: 'omp', names: ['omp'] },
  { id: 'opencode', names: ['opencode'] }
]);
/** Never started, in any form (they update themselves; the operator's default of 2026-09-29). */
const NEVER = Object.freeze(['gemini', 'qwen', 'antigravity', 'agy', 'grok']);
/**
 * The rows the app's detection must resolve NOWHERE, by registry id: the four
 * above, and droid, which is not installed and is hidden the same way so a
 * later install cannot be probed either.
 */
const HIDDEN_IDS = Object.freeze(['gemini', 'qwen', 'antigravity', 'grok', 'droid']);
/**
 * The scratch `agents.json` that renames each hidden row's binaries, so the
 * app's detection scan finds nothing to version-probe. The launch argv is
 * renamed too, so nothing the app composes for these rows names a real file.
 */
export function neverOverlay() {
  return {
    schema: 1,
    agents: HIDDEN_IDS.map((id) => ({ id, binaries: [`p331-never-${id}`], launch: { argv: [`p331-never-${id}`] } }))
  };
}
/**
 * The pre-launch check's answer, from one build's own overlay parser, merge and
 * resolver run over `neverOverlay()`: no problem, every hidden row merged with
 * exactly its renamed binary, and no copy of it anywhere. `{ ok, said }`.
 */
export function neverPrecheckVerdict(out) {
  if (out === null || typeof out !== 'object') return { ok: false, said: 'the check printed nothing readable' };
  if (out.parseProblems !== 0 || out.mergeProblems !== 0) return { ok: false, said: `the overlay did not load whole (${String(out.parseProblems)} parse, ${String(out.mergeProblems)} merge problem(s)), so a hidden row would fall back to its real binary` };
  const bad = HIDDEN_IDS.filter((id) => {
    const r = out.rows?.[id];
    return r === null || r === undefined || J(r.binaries) !== J([`p331-never-${id}`]) || r.copies !== 0;
  });
  return bad.length === 0
    ? { ok: true, said: `${HIDDEN_IDS.join(', ')} merge with renamed binaries that resolve nowhere` }
    : { ok: false, said: `not hidden: ${bad.map((id) => `${id} ${J(out.rows?.[id] ?? null)}`).join('; ')}` };
}
/**
 * The app's own scan, read back through `agents:list`: every hidden row must
 * answer no binary and no version. A hidden row missing from the list is not
 * resolved either. `{ ok, said }`.
 */
export function neverScanVerdict(list) {
  if (!Array.isArray(list)) return { ok: false, said: 'agents:list answered no list' };
  const found = list.filter((a) => HIDDEN_IDS.includes(a?.id) && (a.binPath !== null && a.binPath !== undefined || a.version !== null && a.version !== undefined || a.installed === true));
  return found.length === 0
    ? { ok: true, said: `${HIDDEN_IDS.join(', ')} resolve nowhere in the app's own scan` }
    : { ok: false, said: `the app's scan resolved ${found.map((a) => `${a.id} at ${String(a.binPath)}`).join(', ')}` };
}
const TMUX_DIRS = ['/opt/homebrew/bin/tmux', '/usr/local/bin/tmux', '/opt/local/bin/tmux'];
const TRANSCRIPT_LINE = (n) => `P331 transcript line ${String(n).padStart(3, '0')}`;
const HINT = /tmux detected/i;

// ---------------------------------------------------------------------------
// The graders, pure, so --self-test can prove each one can say no
// ---------------------------------------------------------------------------

/** Every DEC private mode a stream SET, in order, one entry per parameter. */
export function modesSet(raw) {
  const out = [];
  for (const m of String(raw).matchAll(/\x1b\[\?([\d;]+)h/g)) {
    for (const p of m[1].split(';')) if (p !== '') out.push(Number(p));
  }
  return out;
}
/** How many times a stream asked for the alternate screen. */
export const altCount = (raw) => modesSet(raw).filter((m) => m === 1049).length;
const MOUSE_MODES = [1000, 1002, 1003, 1005, 1006, 1015];
/** The mouse modes a stream asked for, sorted, once each. */
export const mouseModes = (raw) => [...new Set(modesSet(raw).filter((m) => MOUSE_MODES.includes(m)))].sort((a, b) => a - b);

/** The tokens after the first whose basename is `bin`, or null when no token is. */
export function commandTail(command, bin) {
  const tokens = String(command).trim().split(/\s+/);
  const at = tokens.findIndex((t) => basename(t) === bin);
  return at < 0 ? null : tokens.slice(at + 1);
}

/** Codex's composer: the LAST line on the live screen that begins with `›`. */
export function composerOf(screen) {
  const lines = String(screen).split('\n').filter((l) => /^\s*›/.test(l));
  return lines.length === 0 ? null : lines[lines.length - 1].trim();
}

/** The highlighted answer of an open Codex approval: the digit on the `›` line. */
export function selectedOption(screen) {
  const hits = String(screen)
    .split('\n')
    .map((l) => /^\s*›\s*(\d)\.\s/.exec(l))
    .filter((m) => m !== null);
  return hits.length === 0 ? null : Number(hits[hits.length - 1][1]);
}

/**
 * Codex's composer is on screen: its placeholder, or a `›` line that is not a
 * numbered answer. A folder question (`› 1. Trust and continue`) is NOT a
 * composer, so a folder this probe meant to trust and did not is never
 * mistaken for a ready Codex.
 */
export function composerReady(screen) {
  return /Ask Codex to do anything/.test(screen) || (composerOf(screen) !== null && selectedOption(screen) === null && !/Trust this folder/i.test(screen));
}

/** Up arrows xterm typed, in either cursor mode. */
export const arrowsUp = (sent) => (String(sent).match(/\x1b(?:O|\[)A/g) ?? []).length;
/** SGR wheel-up reports xterm typed. */
export const sgrWheel = (sent) => (String(sent).match(/\x1b\[<64;\d+;\d+M/g) ?? []).length;

/** Does a process's `ps -E` text name this variable at all? Never its value. */
export const envNames = (text, name) => new RegExp(`(?:^|\\s)${name}=`).test(String(text));
/** A `ps -E` text that shows an environment at all. A process that rewrote its title (pi) shows none. */
export const envReadable = (text) => envNames(text, 'PATH') || envNames(text, 'HOME');
/**
 * Is this process the agent itself? Its first three command words, by
 * basename, name one of the agent's binaries (a `node` launcher's script
 * counts; `muse-bin-1.4.1`, `deepseek-tui` and `codex-aarch64-…` count by
 * their stem). SpecStory's wrapper names the agent as an argument and is not it.
 */
export function isAgentCommand(command, names) {
  const words = String(command).trim().split(/\s+/).slice(0, 3).map((w) => basename(w));
  if (words[0] === 'specstory') return false;
  return words.some((w) => names.some((n) => w === n || w.startsWith(`${n}-`)));
}
/**
 * The guard judgement over one pane's process rows `{ bin, agent, readable,
 * missing, kind }`: the guards are judged on the AGENT's processes whose
 * environment can be read, the session kind on every process that can be read.
 * Answers `{ problems, hidden }`; `hidden` names agent processes whose
 * environment `ps` could not show (a stated limit, never a problem).
 */
export function judgeEnvRows(rows) {
  const problems = [];
  const agents = rows.filter((r) => r.agent);
  if (agents.length === 0) problems.push('no process under the pane names the agent');
  const hidden = agents.filter((r) => !r.readable).map((r) => r.bin);
  for (const r of agents) if (r.readable) for (const m of r.missing) problems.push(`${m} did not reach the agent process ${r.bin}`);
  for (const r of rows) if (r.readable && r.kind) problems.push(`CLAUDE_CODE_SESSION_KIND reached ${r.bin}`);
  return { problems: [...new Set(problems)], hidden };
}
/**
 * The top of a parked reader's view: its first three non-blank rows, joined.
 * A view with none is no reading (arm (l) compared an empty row with an empty
 * row once, and called that a held reader).
 */
export function viewKey(rows) {
  if (!Array.isArray(rows)) return null;
  const lines = rows.map((r) => String(r).replace(/\s+$/, '')).filter((r) => r.trim() !== '').slice(0, 3);
  return lines.length === 0 ? null : lines.join('\n');
}
/** Every guard present, and no session-kind variable (research 134: `bg` beats the switch). */
export function envFindings(text) {
  const out = [];
  for (const name of Object.keys(GUARDS)) if (!envNames(text, name)) out.push(`${name} did not reach the pane`);
  if (envNames(text, 'CLAUDE_CODE_SESSION_KIND')) out.push('CLAUDE_CODE_SESSION_KIND reached the pane');
  return out;
}

/** How many times `seq` occurs in `argv` as a contiguous run. */
export function runCount(argv, seq) {
  if (!Array.isArray(argv)) return 0;
  let n = 0;
  for (let i = 0; i + seq.length <= argv.length; i += 1) if (seq.every((t, k) => argv[i + k] === t)) n += 1;
  return n;
}

/** `after` is `before` with the pair inserted exactly once and nothing else moved. */
export function pairInsertedOnce(before, after) {
  if (!Array.isArray(before) || !Array.isArray(after) || runCount(after, PAIR) !== 1) return false;
  for (let i = 0; i + 1 < after.length; i += 1) {
    if (after[i] === PAIR[0] && after[i + 1] === PAIR[1]) {
      const without = [...after.slice(0, i), ...after.slice(i + 2)];
      return J(without) === J(before) && runCount(before, PAIR) === 0;
    }
  }
  return false;
}

/** SpecStory's own `-c` string in a wrapped argv, or null. */
export function wrappedInner(argv) {
  if (!Array.isArray(argv) || argv[1] !== 'run') return null;
  const c = argv.indexOf('-c', 2);
  return c < 0 || typeof argv[c + 1] !== 'string' ? null : argv[c + 1];
}
/** The inner string carries the pair exactly once, as two words. */
export const innerCarriesPair = (inner) =>
  typeof inner === 'string' && (inner.match(/(?:^|\s)-c\s+'?tui\.fullscreen_transcript=false'?(?=\s|$)/g) ?? []).length === 1;

/**
 * One agent's matrix reading at both builds, against its class: the two
 * switched agents must leave the alternate screen at HEAD; every other agent
 * must read at HEAD what it read at the parent, whatever its class says.
 * `null` is UNREADABLE (the parent did not show the defect, or a reading is missing).
 */
export function matrixVerdict(agent, parent, head) {
  if (parent === undefined || parent === null || head === undefined || head === null) return { ok: null, said: 'a build has no reading' };
  if (parent.flags === null || head.flags === null) return { ok: null, said: 'tmux answered no flags for a pane' };
  const p = `${String(parent.alt1049)}×1049 alt ${String(parent.flags.alternate_on)} mouse ${String(parent.flags.mouse_any_flag)} modes [${parent.modes.join(',')}] history ${String(parent.flags.history_size)}`;
  const h = `${String(head.alt1049)}×1049 alt ${String(head.flags.alternate_on)} mouse ${String(head.flags.mouse_any_flag)} modes [${head.modes.join(',')}] history ${String(head.flags.history_size)}`;
  if (agent === 'claude') {
    if (!(parent.alt1049 > 0 && parent.flags.mouse_any_flag === 1)) return { ok: null, said: `the parent's Claude was not full-screen with the mouse (${p}), so there is no defect to fix` };
    return { ok: head.alt1049 === 0 && head.flags.alternate_on === 0 && head.flags.mouse_any_flag === 0, said: `parent ${p}; HEAD ${h} (HEAD must ask for no 1049 and no mouse)` };
  }
  if (agent === 'codex') {
    if (!(parent.alt1049 > 0 && parent.flags.mouse_any_flag === 0)) return { ok: null, said: `the parent's Codex was not full-screen with no mouse (${p})` };
    return { ok: head.alt1049 === 0 && head.flags.alternate_on === 0, said: `parent ${p}; HEAD ${h} (HEAD must ask for no 1049)` };
  }
  const same =
    (parent.alt1049 > 0) === (head.alt1049 > 0) &&
    parent.flags.alternate_on === head.flags.alternate_on &&
    parent.flags.mouse_any_flag === head.flags.mouse_any_flag &&
    J(parent.modes) === J(head.modes) &&
    (parent.flags.history_size > 0) === (head.flags.history_size > 0);
  return { ok: same, said: `parent ${p}; HEAD ${h} (identical required; history is compared as empty or not, and printed exactly)` };
}

/** Version text to a comparable triple, or null. */
export function versionOf(text) {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(String(text));
  return m === null ? null : [Number(m[1]), Number(m[2]), Number(m[3])];
}
export const atLeast = (v, floor) =>
  v !== null && (v[0] !== floor[0] ? v[0] > floor[0] : v[1] !== floor[1] ? v[1] > floor[1] : v[2] >= floor[2]);

function selfTest() {
  const bad = [];
  const expect = (name, got, want) => {
    if (J(got) !== J(want)) bad.push(`${name}: got ${J(got)}, want ${J(want)}`);
  };
  const codexFull = '\x1b[?2004h\x1b[>4;0m\x1b[>5u\x1b[?1004h\x1b[?2026h\x1b[?25l\x1b[?1049h\x1b[>5u\x1b[?1007h';
  expect('altCount full', altCount(codexFull), 1);
  expect('altCount inline', altCount('\x1b[?2004h\x1b[?2026h'), 0);
  expect('altCount combined', altCount('\x1b[?1049;1000;1006h'), 1);
  expect('mouseModes none', mouseModes(codexFull), []);
  expect('mouseModes deepseek', mouseModes('\x1b[?1049h\x1b[?1000h\x1b[?1002h\x1b[?1003h\x1b[?1015h\x1b[?1006h'), [1000, 1002, 1003, 1006, 1015]);
  expect('mouseModes combined', mouseModes('\x1b[?1000;1006h\x1b[?1000h'), [1000, 1006]);
  expect('commandTail node launcher', commandTail('node /Users/x/.local/bin/codex -c tui.fullscreen_transcript=false', 'codex'), PAIR);
  expect('commandTail resume', commandTail('/v/bin/codex resume 0199 -c tui.fullscreen_transcript=false --yolo', 'codex'), ['resume', '0199', ...PAIR, '--yolo']);
  expect('commandTail absent', commandTail('/bin/zsh -l', 'codex'), null);
  expect('composer', composerOf('header\n› P331-HISTORY-ONE\n\n› Ask Codex to do anything\n  ? for shortcuts'), '› Ask Codex to do anything');
  expect('composer none', composerOf('nothing here'), null);
  const approval = '  Would you like to run the following command?\n\n› 1. Yes, proceed (y)\n  2. Yes, and don\'t ask again (p)\n  3. No, and tell Codex (esc)\n';
  expect('selected 1', selectedOption(approval), 1);
  expect('selected 3', selectedOption(approval.replace('› 1.', '  1.').replace('  3. No', '› 3. No')), 3);
  expect('selected none', selectedOption('› Ask Codex to do anything'), null);
  expect('arrows', arrowsUp('\x1bOA\x1bOA\x1b[A'), 3);
  expect('arrows none', arrowsUp('\x1b[<64;10;5M'), 0);
  expect('sgr', sgrWheel('\x1b[<64;77;15M\x1b[<64;77;15M'), 2);
  expect('env all', envFindings('/bin/x a DISABLE_AUTOUPDATER=1 MUSE_NO_AUTO_UPDATE=1 OPENCODE_DISABLE_AUTOUPDATE=1 AGENT_CLI_UPDATE_CHECK_URL=http://127.0.0.1:9/ OMP_SKIP_SETUP=1'), []);
  expect('env missing and kind', envFindings('/bin/x DISABLE_AUTOUPDATER=1 CLAUDE_CODE_SESSION_KIND=bg').length, 5);
  expect('env no substring match', envNames('/bin/x XDISABLE_AUTOUPDATER=1', 'DISABLE_AUTOUPDATER'), false);
  expect('pair inserted', pairInsertedOnce(['/c', 'resume', 'id', '--yolo'], ['/c', 'resume', 'id', ...PAIR, '--yolo']), true);
  expect('pair inserted after another -c', pairInsertedOnce(['/c', '-c', 'x=1', 'resume', 'id'], ['/c', '-c', 'x=1', 'resume', 'id', ...PAIR]), true);
  expect('pair twice', pairInsertedOnce(['/c', 'resume', 'id'], ['/c', 'resume', 'id', ...PAIR, ...PAIR]), false);
  expect('pair and a flag lost', pairInsertedOnce(['/c', 'resume', 'id', '--yolo'], ['/c', 'resume', 'id', ...PAIR]), false);
  expect('pair already there', pairInsertedOnce(['/c', 'resume', 'id', ...PAIR], ['/c', 'resume', 'id', ...PAIR]), false);
  const wrapped = ['/s/specstory', 'run', 'codex', '--no-version-check', '--silent', '-c', "codex resume id -c tui.fullscreen_transcript=false --yolo"];
  expect('wrapped inner', innerCarriesPair(wrappedInner(wrapped)), true);
  expect('wrapped inner twice', innerCarriesPair('codex -c tui.fullscreen_transcript=false -c tui.fullscreen_transcript=false'), false);
  expect('wrapped inner true', innerCarriesPair('codex -c tui.fullscreen_transcript=true'), false);
  expect('not wrapped', wrappedInner(['/c', 'resume', 'id']), null);
  const full = { alt1049: 1, modes: [1000, 1002, 1003, 1006], flags: { alternate_on: 1, mouse_any_flag: 1, history_size: 0 } };
  const inline = { alt1049: 0, modes: [], flags: { alternate_on: 0, mouse_any_flag: 0, history_size: 40 } };
  expect('matrix claude fixed', matrixVerdict('claude', full, inline).ok, true);
  expect('matrix claude still full', matrixVerdict('claude', full, full).ok, false);
  expect('matrix claude parent not full', matrixVerdict('claude', inline, inline).ok, null);
  const codexParent = { alt1049: 1, modes: [], flags: { alternate_on: 1, mouse_any_flag: 0, history_size: 0 } };
  expect('matrix codex fixed', matrixVerdict('codex', codexParent, inline).ok, true);
  expect('matrix codex mouse at parent', matrixVerdict('codex', full, inline).ok, null);
  expect('matrix other same', matrixVerdict('deepseek', full, { ...full }).ok, true);
  expect('matrix other moved', matrixVerdict('pi', inline, { ...inline, modes: [1000] }).ok, false);
  expect('matrix other history class', matrixVerdict('pi', inline, { ...inline, flags: { ...inline.flags, history_size: 0 } }).ok, false);
  expect('composer ready', composerReady('header\n› Ask Codex to do anything'), true);
  expect('trust is not a composer', composerReady('Trust this folder?\n› 1. Trust and continue\n  2. Quit'), false);
  expect('version', versionOf('codex-cli 0.158.0'), [0, 158, 0]);
  expect('at least', atLeast([2, 1, 285], [2, 1, 132]), true);
  expect('below', atLeast([0, 147, 0], [0, 158, 0]), false);
  expect('never list', NEVER.includes('grok') && NEVER.includes('agy') && !EIGHT.some((a) => NEVER.includes(a.id)), true);
  // The guard that keeps the app's own detection off the four (Phase 331's fix round).
  const overlay = neverOverlay();
  expect('overlay hides five', overlay.agents.map((a) => a.id), ['gemini', 'qwen', 'antigravity', 'grok', 'droid']);
  expect('overlay renames every binary', overlay.agents.every((a) => a.binaries.length === 1 && a.binaries[0] === `p331-never-${a.id}` && a.launch.argv[0] === a.binaries[0]), true);
  expect('overlay names no real binary', overlay.agents.every((a) => ![...NEVER, 'droid'].includes(a.binaries[0]) && ![...NEVER, 'droid'].includes(a.launch.argv[0])), true);
  const scanOf = (over) => ['claude', 'codex', ...HIDDEN_IDS].map((id) => ({ id, installed: id === 'claude' || id === 'codex', binPath: id === 'claude' || id === 'codex' ? `/x/${id}` : null, version: null, ...(over[id] ?? {}) }));
  expect('scan: all five hidden', neverScanVerdict(scanOf({})).ok, true);
  expect('scan: gemini resolved', neverScanVerdict(scanOf({ gemini: { binPath: '/usr/local/bin/gemini' } })).ok, false);
  expect('scan: grok probed', neverScanVerdict(scanOf({ grok: { version: '1.0.41' } })).ok, false);
  expect('scan: no list', neverScanVerdict(null).ok, false);
  expect('scan: a hidden row absent', neverScanVerdict(scanOf({}).filter((a) => a.id !== 'droid')).ok, true);
  const pre = (over = {}) => ({ parseProblems: 0, mergeProblems: 0, rows: Object.fromEntries(HIDDEN_IDS.map((id) => [id, { binaries: [`p331-never-${id}`], copies: 0 }])), ...over });
  expect('precheck: clean', neverPrecheckVerdict(pre()).ok, true);
  expect('precheck: a parse problem', neverPrecheckVerdict(pre({ parseProblems: 1 })).ok, false);
  expect('precheck: qwen fell back', neverPrecheckVerdict(pre({ rows: { ...pre().rows, qwen: { binaries: ['qwen'], copies: 1 } } })).ok, false);
  expect('precheck: a copy found', neverPrecheckVerdict(pre({ rows: { ...pre().rows, grok: { binaries: ['p331-never-grok'], copies: 1 } } })).ok, false);
  expect('precheck: a row missing', neverPrecheckVerdict(pre({ rows: { ...pre().rows, gemini: null } })).ok, false);
  expect('precheck: nothing', neverPrecheckVerdict(null).ok, false);
  // The guard check on the agent's own process, not the holder shell.
  expect('agent: claude', isAgentCommand('/Users/x/.local/bin/claude --resume 1', ['claude']), true);
  expect('agent: node launcher', isAgentCommand('node /Users/x/.local/bin/codex -c tui.fullscreen_transcript=false', ['codex']), true);
  expect('agent: muse stem', isAgentCommand('/x/muse-bin-1.4.1-R4503.1', ['muse']), true);
  expect('agent: holder shell', isAgentCommand('-zsh', ['claude']), false);
  expect('agent: specstory wrapper', isAgentCommand('/s/specstory run codex -c codex', ['codex']), false);
  expect('agent: pip is not pi', isAgentCommand('/usr/bin/pip install x', ['pi']), false);
  const row = (bin, agent, readable, missing = [], kind = false) => ({ bin, agent, readable, missing, kind });
  expect('env: restored pane', judgeEnvRows([row('zsh', false, true, Object.keys(GUARDS)), row('claude', true, true)]), { problems: [], hidden: [] });
  expect('env: agent lacks a guard', judgeEnvRows([row('zsh', false, true), row('claude', true, true, ['DISABLE_AUTOUPDATER'])]).problems, ['DISABLE_AUTOUPDATER did not reach the agent process claude']);
  expect('env: pi hidden', judgeEnvRows([row('pi', true, false, Object.keys(GUARDS))]), { problems: [], hidden: ['pi'] });
  expect('env: no agent', judgeEnvRows([row('zsh', false, true)]).problems, ['no process under the pane names the agent']);
  expect('env: kind on the shell', judgeEnvRows([row('zsh', false, true, [], true), row('claude', true, true)]).problems, ['CLAUDE_CODE_SESSION_KIND reached zsh']);
  expect('env readable', [envReadable('pi --session-id x'), envReadable('/bin/zsh PATH=/bin HOME=/h')], [false, true]);
  // Arm (l)'s ruler: the first three non-blank rows, and no reading when there are none.
  expect('view: blank', viewKey(['', '   ', '']), null);
  expect('view: none', viewKey(null), null);
  expect('view: three', viewKey(['', '╭──╮', '│ a │', '', '│ b │', '│ c │']), '╭──╮\n│ a │\n│ b │');
  if (bad.length > 0) {
    process.stdout.write(`probe:p331 --self-test FAIL, ${String(bad.length)}:\n${bad.map((b) => `  - ${b}`).join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write('probe:p331 --self-test PASS: every grader answered its fixtures, including the ones it must refuse. Nothing was launched.\n');
  process.exit(0);
}

if (process.argv.includes('--self-test')) selfTest();

// ---------------------------------------------------------------------------
// The refusals, before anything is created
// ---------------------------------------------------------------------------

const TAG = '[p331]';
const say = (line) => console.log(`${TAG} ${line}`);
function refuse(why) {
  console.error(`${TAG} UNREADABLE: ${why}`);
  process.exit(2);
}

const PARENT = (process.env['P331_PARENT_CHECKOUT'] ?? '').trim();
if (PARENT === '') refuse('P331_PARENT_CHECKOUT names no checkout. Point it at a BUILT clone of the phase parent; the parent measurement is mandatory.');
const PARENT_DIR = resolve(PARENT);
if (PARENT_DIR === ROOT) refuse('P331_PARENT_CHECKOUT is this checkout. The parent must be a separate built checkout of the phase parent.');
for (const [label, dir] of [['the parent', PARENT_DIR], ['this checkout', ROOT]]) {
  if (!existsSync(join(dir, 'out', 'main', 'index.js'))) refuse(`${label} (${dir}) has no build at out/main/index.js. Run npm run build there first.`);
}
const TMUX = join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux');
if (!existsSync(TMUX)) refuse(`no vendored tmux at ${TMUX}.`);
const STAND_IN_SGR = join(ROOT, 'build', 'p331', 'stand-in-sgr.mjs');

const RUN = resolve((process.env['P331_RUN'] ?? '').trim() || `/private/tmp/p331-probe-${String(process.pid)}`);
if (!RUN.startsWith('/private/tmp/') || RUN.startsWith(`${ROOT}/`) || !/^[A-Za-z0-9/-]+$/.test(RUN)) {
  refuse(`the scratch directory ${RUN} must sit under /private/tmp, outside this checkout, and use only letters, digits, / and - (Claude's project folder encoding).`);
}
const REPORT_PATH = resolve((process.env['P331_REPORT'] ?? '').trim() || `${RUN}.json`);
if (REPORT_PATH === ROOT || REPORT_PATH.startsWith(`${ROOT}/`) || REPORT_PATH.startsWith(`${RUN}/`)) {
  refuse(`P331_REPORT (${REPORT_PATH}) must sit outside this checkout and outside the scratch directory, which is removed at the end.`);
}
const HOME = join(RUN, 'home');
const HARNESS = join(RUN, 'harness');
const PROFILE = join(HARNESS, 'profile');
const RAW = join(HARNESS, 'raw');
const PROJECT = join(RUN, 'projects');
const CODEX_HOME = join(HOME, '.codex');
const CLAUDE_DIR = join(HOME, '.claude');
const SOCKET = `gmux-p331b-${String(process.pid)}`;
const KEEP = (process.env['P331_KEEP'] ?? '') === '1';
const HOOKS = (process.env['P331_HOOKS'] ?? '') === '1';
const ALL_ARMS = ['matrix', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o'];
const ASKED = new Set(((process.env['P331_ARMS'] ?? '').trim() || ALL_ARMS.join(',')).split(',').map((s) => s.trim()).filter(Boolean));
for (const a of ASKED) if (!ALL_ARMS.includes(a)) refuse(`P331_ARMS names ${J(a)}, which is no arm (${ALL_ARMS.join(', ')}).`);
// The readings an arm stands on come along with it.
if (ASKED.has('e') || ASKED.has('k') || ASKED.has('l')) ASKED.add('d');
if (ASKED.has('k') || ASKED.has('l') || ASKED.has('m')) ASKED.add('j');
if (ASKED.has('c')) ASKED.add('a');
if (ASKED.has('o')) ASKED.add('matrix');
const want = (a) => ASKED.has(a);

/** Every Claude Code and ZDOTDIR name this process inherited, REMOVED from what the app is given (SPEC §1.2 item 8). */
const STRIPPED = Object.fromEntries(
  Object.keys(process.env)
    .filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n) || n === 'ZDOTDIR')
    .map((n) => [n, undefined])
);
const FAKE_CLAUDE_KEY = `sk-ant-api03-P331FAKE${randomBytes(24).toString('hex')}AA`;
const DUMMY_CODEX_KEY = `sk-p331-dummy-${randomBytes(16).toString('hex')}`;

const report = {
  checkouts: { parent: PARENT_DIR, head: ROOT },
  socket: SOCKET,
  hooks: HOOKS ? 'on (P331_HOOKS=1)' : 'off in both launches (GMUX_DISABLE_AGENT_HOOKS=1)',
  arms: [],
  readings: { parent: {}, head: {}, between: {} },
  preconditions: {},
  mock: {},
  turns: 0,
  tokens: 0
};
let failures = 0;
let unreadable = 0;
const arm = (id, ok, said) => {
  report.arms.push({ id, ok, said });
  if (ok === false) failures += 1;
  if (ok === null) unreadable += 1;
  say(`${ok === null ? 'UNREADABLE' : ok ? 'PASS' : 'FAIL'} ${id}: ${said}`);
};
class Unreadable extends Error {}

// ---------------------------------------------------------------------------
// tmux on the scratch socket, processes, and the manifest
// ---------------------------------------------------------------------------

function tm(args) {
  const r = spawnSync(TMUX, ['-L', SOCKET, ...args], { encoding: 'utf8', timeout: 15_000 });
  return { ok: r.status === 0, out: r.stdout ?? '', err: r.stderr ?? '' };
}
const FLAG_NAMES = ['alternate_on', 'mouse_any_flag', 'mouse_sgr_flag', 'pane_in_mode', 'scroll_position', 'history_size', 'pane_pid', 'pane_current_command'];
function flagsOf(target) {
  const r = tm(['display-message', '-p', '-t', target, FLAG_NAMES.map((f) => `#{${f}}`).join('\t')]);
  if (!r.ok) return null;
  const v = r.out.replace(/\n$/, '').split('\t');
  const out = {};
  FLAG_NAMES.forEach((f, i) => {
    const x = v[i] ?? '';
    out[f] = /^-?\d+$/.test(x) ? Number(x) : x;
  });
  return out;
}
function paneOf(tmuxName) {
  const r = tm(['list-panes', '-a', '-F', '#{session_name}\t#{session_id}\t#{pane_id}\t#{pane_pid}']);
  for (const line of r.out.split('\n')) {
    const [name, sid, pane, pid] = line.split('\t');
    if (name === tmuxName && pane !== undefined) return { sid, pane, panePid: Number(pid) };
  }
  return null;
}
const screenOf = (pane) => tm(['capture-pane', '-p', '-J', '-t', pane]).out;
const historyOf = (pane, lines = 1000) => tm(['capture-pane', '-p', '-J', '-S', `-${String(lines)}`, '-t', pane]).out;
const rawOf = (tmuxName) => {
  try {
    return readFileSync(join(RAW, `${tmuxName}.raw`)).toString('latin1');
  } catch {
    return '';
  }
};
async function settle(pane, quietMs = 2_500, maxMs = 25_000) {
  const until = Date.now() + maxMs;
  let last = null;
  let since = Date.now();
  for (;;) {
    const now = screenOf(pane);
    if (now !== last) {
      last = now;
      since = Date.now();
    } else if (Date.now() - since >= quietMs) return now;
    if (Date.now() >= until) return now;
    await sleep(400);
  }
}
async function waitScreen(pane, re, maxMs) {
  const until = Date.now() + maxMs;
  for (;;) {
    const s = screenOf(pane);
    if (re.test(s)) return s;
    if (Date.now() >= until) return null;
    await sleep(400);
  }
}

function psTable() {
  const r = spawnSync('ps', ['-Ao', 'pid=,ppid=,command='], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const rows = new Map();
  for (const line of (r.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m !== null) rows.set(Number(m[1]), { ppid: Number(m[2]), command: m[3] });
  }
  return rows;
}
function treeOf(root) {
  const rows = psTable();
  const kids = new Map();
  for (const [pid, row] of rows) {
    if (!kids.has(row.ppid)) kids.set(row.ppid, []);
    kids.get(row.ppid).push(pid);
  }
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const pid = stack.pop();
    if (!rows.has(pid) || out.some((p) => p.pid === pid)) continue;
    out.push({ pid, command: rows.get(pid).command });
    for (const k of kids.get(pid) ?? []) stack.push(k);
  }
  return out;
}
const commandOf = (pid) => (spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
/** A process's `ps -E` text. Read for NAMES only; never stored and never printed. */
const envTextOf = (pid) => (spawnSync('ps', ['-wwEp', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();

/** Every process seen under one of this run's panes, by pid, with its command line when first seen. */
const ours = new Map();
function noteTree(root) {
  if (!Number.isInteger(root) || root <= 1) return;
  for (const p of treeOf(root)) if (!ours.has(p.pid)) ours.set(p.pid, p.command);
}
async function endOurs() {
  const live = [...ours].filter(([pid, cmd]) => commandOf(pid) === cmd).map(([pid]) => pid);
  for (const pid of live) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
  }
  if (live.length > 0) await sleep(1_500);
  const still = live.filter((pid) => commandOf(pid) === ours.get(pid));
  for (const pid of still) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  if (still.length > 0) await sleep(500);
  return { asked: live.length, killed: still.length, left: [...ours].filter(([pid, cmd]) => commandOf(pid) === cmd).length };
}

/** One manifest row, read only, from the scratch profile the app wrote. */
function manifestRow(id) {
  if (!/^[A-Za-z0-9-]+$/.test(String(id))) return null;
  const db = join(PROFILE, 'gmux', 'manifest.db');
  const query = `select id, name, agent, argv, resume_argv, env, status, agent_session_id from sessions where id = '${id}'`;
  const r = spawnSync('sqlite3', ['-json', `file:${db}?mode=ro`, query], { encoding: 'utf8', timeout: 15_000 });
  let text = r.status === 0 ? r.stdout : null;
  if (text === null) {
    // BETWEEN THE LAUNCHES no app holds the database, so there is no `-shm`
    // and a read-only open cannot make one: SQLITE_CANTOPEN, and every
    // `before` read null in the verifier's run. `immutable=1` would ignore a
    // WAL the last app left, so the file and its WAL are COPIED to the harness
    // directory and the copy is opened, which replays the WAL there.
    const copy = join(HARNESS, `manifest-read-${String(Date.now())}`);
    try {
      mkdirSync(copy, { recursive: true });
      copyFileSync(db, join(copy, 'manifest.db'));
      if (existsSync(`${db}-wal`)) copyFileSync(`${db}-wal`, join(copy, 'manifest.db-wal'));
      const r2 = spawnSync('sqlite3', ['-json', join(copy, 'manifest.db'), query], { encoding: 'utf8', timeout: 15_000 });
      text = r2.status === 0 ? r2.stdout : null;
    } catch {
      text = null;
    } finally {
      rmSync(copy, { recursive: true, force: true });
    }
  }
  if (text === null) return null;
  try {
    const row = JSON.parse(text || '[]')[0];
    if (row === undefined) return null;
    const parse = (x) => {
      try {
        return x === null || x === undefined ? null : JSON.parse(x);
      } catch {
        return null;
      }
    };
    return { ...row, argv: parse(row.argv), resume_argv: parse(row.resume_argv), env: parse(row.env) };
  } catch {
    return null;
  }
}
/** The variable's presence and value in a row's env. The only env value this probe ever reads, and it is the phase's own constant. */
const rowVariable = (row) =>
  row === null || row.env === null || typeof row.env !== 'object' ? 'no env' : Object.prototype.hasOwnProperty.call(row.env, VARIABLE) ? `set to ${J(row.env[VARIABLE])}` : 'absent';

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------

/** P331_AGENT_PATH, or the directories on this probe's own PATH that hold one of the eight, plus node's. */
function agentPath() {
  const given = (process.env['P331_AGENT_PATH'] ?? '').trim();
  if (given !== '') return given.split(':').filter(Boolean);
  const names = EIGHT.flatMap((a) => a.names);
  const dirs = [];
  for (const dir of (process.env['PATH'] ?? '').split(':')) {
    if (dir === '' || dirs.includes(dir)) continue;
    if (names.some((n) => existsSync(join(dir, n)))) dirs.push(dir);
  }
  const node = dirname(process.execPath);
  if (!dirs.includes(node)) dirs.push(node);
  return dirs;
}
const AGENT_PATH = agentPath();
const guardExports = Object.entries(GUARDS).map(([k, v]) => `export ${k}='${v}'`).join('\n');
/** The env the probe's own precondition shell calls get: the app's, without the stripped names. */
function scratchEnv() {
  const env = { ...process.env, HOME, CODEX_HOME, CLAUDE_CONFIG_DIR: CLAUDE_DIR, ...GUARDS };
  for (const n of Object.keys(STRIPPED)) delete env[n];
  env.CLAUDE_CONFIG_DIR = CLAUDE_DIR;
  env.PATH = `${AGENT_PATH.join(':')}:/usr/bin:/bin:/usr/sbin:/sbin`;
  return env;
}
const loginShell = (process.env['SHELL'] ?? '').trim() || '/bin/zsh';
function resolveInScratch(name) {
  const r = spawnSync(loginShell, ['-lic', `command -v ${name}`], { encoding: 'utf8', timeout: 30_000, env: scratchEnv() });
  const got = (r.stdout ?? '').trim().split('\n').pop() ?? '';
  return got.startsWith('/') ? got : null;
}
function installOf(path) {
  try {
    const real = realpathSync(path);
    return { real, mtimeMs: statSync(real).mtimeMs };
  } catch {
    return null;
  }
}

function codexConfig(port, trusted) {
  return [
    'check_for_update_on_startup = false',
    'cli_auth_credentials_store = "file"',
    'mcp_oauth_credentials_store = "file"',
    'model = "gpt-5.4"',
    'model_provider = "p331_mock"',
    'approval_policy = "on-request"',
    'sandbox_mode = "workspace-write"',
    '',
    '[model_providers.p331_mock]',
    'name = "P331 mock"',
    `base_url = "http://127.0.0.1:${String(port)}/v1"`,
    'wire_api = "responses"',
    'request_max_retries = 0',
    'stream_max_retries = 0',
    '',
    '[features]',
    'daemon_auto_start = false',
    '',
    ...trusted.flatMap((dir) => [`[projects."${dir}"]`, 'trust_level = "trusted"', '']),
    '[tui]',
    'screen_reader_detection_done = true',
    ''
  ].join('\n');
}

/** The fabricated transcript of arm (j): two lines in research 134 A's shape, every word invented. */
function transcript(id, cwd) {
  const text = Array.from({ length: 120 }, (_v, i) => TRANSCRIPT_LINE(i + 1)).join('\n');
  const base = { isSidechain: false, userType: 'external', cwd, sessionId: id, version: '2.1.284', gitBranch: '' };
  return (
    `${J({ parentUuid: null, ...base, type: 'user', message: { role: 'user', content: 'print 120 numbered lines' }, uuid: '11111111-1111-4111-8111-111111111111', timestamp: '2026-09-29T12:00:00.000Z' })}\n` +
    `${J({ parentUuid: '11111111-1111-4111-8111-111111111111', ...base, type: 'assistant', message: { id: 'msg_p331fake', type: 'message', role: 'assistant', model: 'claude-sonnet-4-5', content: [{ type: 'text', text }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }, uuid: '22222222-2222-4222-8222-222222222222', timestamp: '2026-09-29T12:00:01.000Z' })}\n`
  );
}
const claudeProjectDir = (cwd) => join(CLAUDE_DIR, 'projects', realpathSync(cwd).replace(/[^A-Za-z0-9]/g, '-'));

// ---------------------------------------------------------------------------
// The renderer
// ---------------------------------------------------------------------------

/**
 * The page kit: xterm's own `onData`, reached through the React fiber of
 * `.gmux-terminal-mount` (research 133's probe-b and probe:p292's first ruler),
 * because no product file gains a hook for a probe. It records every chunk
 * xterm hands the app, and reads the rows of xterm's active buffer.
 */
const PAGE_KIT = String.raw`
(() => {
  if (window.__p331 !== undefined) return true;
  const findTerm = () => {
    const mounts = [...document.querySelectorAll('.gmux-terminal-mount')];
    for (const mount of mounts) {
      const key = Object.keys(mount).find((k) => k.startsWith('__reactFiber$'));
      if (!key) continue;
      let f = mount[key];
      for (let depth = 0; f && depth < 60; depth += 1, f = f.return) {
        let h = f.memoizedState; let n = 0;
        while (h && typeof h === 'object' && n < 300) {
          const ms = h.memoizedState;
          if (ms && typeof ms === 'object' && 'current' in ms) {
            const c = ms.current;
            if (c && typeof c === 'object' && c.buffer && typeof c.write === 'function' && typeof c.rows === 'number') return c;
          }
          h = h.next; n += 1;
        }
      }
    }
    return null;
  };
  const kit = { term: null, sent: [], heard: new WeakSet() };
  kit.ready = () => {
    const t = findTerm();
    if (t !== null) kit.term = t;
    if (kit.term !== null && !kit.heard.has(kit.term)) {
      kit.heard.add(kit.term);
      kit.term.onData((d) => { if (kit.sent.length < 20000) kit.sent.push({ t: Math.round(performance.now()), d }); });
    }
    return kit.term !== null;
  };
  kit.now = () => Math.round(performance.now());
  kit.sentSince = (t) => kit.sent.filter((e) => e.t >= t).map((e) => e.d).join('');
  kit.geometry = () => {
    const b = document.querySelector('.xterm-screen')?.getBoundingClientRect();
    return b === undefined ? null : { left: b.left, top: b.top, width: b.width, height: b.height, rows: kit.term?.rows ?? 0 };
  };
  kit.rows = () => {
    const term = kit.term; if (!term) return null;
    const b = term.buffer.active; const rows = [];
    for (let i = 0; i < term.rows; i += 1) { const l = b.getLine(b.viewportY + i); rows.push(l ? l.translateToString(true) : ''); }
    return rows;
  };
  window.__p331 = kit;
  return true;
})()
`;

async function attach(timeoutMs) {
  // Imported here rather than at the top: cdp-target.mjs runs ITS OWN fixture
  // proof and exits when the process was started with --self-test, which
  // would answer this probe's --self-test with that module's.
  const { pickRendererTarget } = await import('../cdp-target.mjs');
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    try {
      const port = Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) return await wsConnect(picked.target.webSocketDebuggerUrl);
        why = picked.why;
      }
    } catch (err) {
      why = String(err?.message ?? err);
    }
    if (Date.now() - started > timeoutMs) throw new Unreadable(`no app window: ${why}`);
    await sleep(300);
  }
}

// ---------------------------------------------------------------------------
// One build's session: everything an arm does through the app
// ---------------------------------------------------------------------------

function makeApp(cdp, build) {
  const page = (expr, ms = 60_000) => cdpEval(cdp, expr, ms);
  const B = build === 'parent' ? 'p' : 'h';
  const app = {
    page,
    async list() {
      return JSON.parse(
        await page(
          'window.gmux.sessions.list().then((l) => JSON.stringify(l.map((s) => ({ id: s.id, name: s.name, tmuxName: s.tmuxName, agent: s.agent, status: s.status, agentSessionId: s.agentSessionId ?? null, resumeArgv: s.resumeArgv ?? null, capture: s.capture === undefined ? null : { provider: s.capture.provider } }))))'
        )
      );
    },
    async find(id) {
      return (await app.list()).find((s) => s.id === id) ?? null;
    },
    /** Create through the preload bridge's `sessions:create`, which the renderer's own store calls. */
    async create(label, agent, dir, opts = {}) {
      if (NEVER.includes(agent)) throw new Error(`refused: ${agent} is never started by this probe`);
      mkdirSync(dir, { recursive: true });
      const input = {
        name: `p331${B}-${label}`,
        projectPath: PROJECT,
        cwd: dir,
        agent,
        ...(opts.extras !== undefined && opts.extras.length > 0 ? { extraArgs: opts.extras } : {}),
        ...(opts.capture === true ? { capture: true } : {})
      };
      const got = await page(
        `window.gmux.sessions.create(${J(input)}).then((s) => JSON.stringify({ id: s.id, name: s.name, tmuxName: s.tmuxName })).catch((e) => JSON.stringify({ error: String(e && e.message || e) }))`,
        90_000
      );
      const s = JSON.parse(got);
      if (s.error !== undefined) throw new Unreadable(`Tortie did not create ${input.name} (${agent}): ${s.error}`);
      let pane = null;
      for (let i = 0; i < 40 && pane === null; i += 1) {
        pane = paneOf(s.tmuxName);
        if (pane === null) await sleep(250);
      }
      if (pane === null) throw new Unreadable(`${input.name} has no pane on ${SOCKET}`);
      noteTree(pane.panePid);
      return { ...s, agent, dir, ...pane };
    },
    /** A live session's pane again, after a restore or a restart named it anew. */
    async rebind(id) {
      const s = await app.find(id);
      if (s === null) throw new Unreadable(`no session ${id} in main's list`);
      let pane = null;
      for (let i = 0; i < 40 && pane === null; i += 1) {
        pane = paneOf(s.tmuxName);
        if (pane === null) await sleep(250);
      }
      if (pane === null) throw new Unreadable(`${s.name} has no pane on ${SOCKET}`);
      noteTree(pane.panePid);
      return { id: s.id, name: s.name, tmuxName: s.tmuxName, agent: s.agent, ...pane };
    },
    async kill(one) {
      if (one === null || one === undefined) return;
      noteTree(one.panePid);
      await page(`window.gmux.sessions.kill(${J(one.id)}).then(() => true).catch(() => false)`);
      await sleep(800);
    },
    async select(one) {
      await page(`window.__gmuxP95.select(${J(one.id)}).then(() => true)`, 30_000);
      for (let i = 0; i < 40; i += 1) {
        if ((await page('window.__p331.ready() && document.querySelector(".xterm-screen") !== null')) === true) break;
        await sleep(150);
      }
      await sleep(600);
      await page('window.__p331.ready()');
      return Date.now();
    },
    /** `n` real wheel notches up over the pane, three lines each; what xterm typed while they turned. */
    async wheel(n, perNotch = null) {
      await page('window.__p331.ready()');
      const geo = await page('window.__p331.geometry()');
      if (geo === null || !(geo.rows > 0)) throw new Unreadable('no terminal is drawn to turn the wheel over');
      const x = Math.round(geo.left + geo.width / 2);
      const y = Math.round(geo.top + geo.height / 3);
      const cell = geo.height / geo.rows;
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await sleep(200);
      const from = await page('window.__p331.now()');
      const each = [];
      for (let k = 0; k < n; k += 1) {
        const mark = await page('window.__p331.now()');
        await cdp.call('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: -cell * 3 });
        await sleep(perNotch === null ? 250 : 700);
        if (perNotch !== null) each.push({ sent: await page(`window.__p331.sentSince(${String(mark)})`), after: perNotch() });
      }
      await sleep(1_200);
      return { sent: await page(`window.__p331.sentSince(${String(from)})`), each };
    },
    rows: () => page('window.__p331.rows()'),
    async thumb() {
      return page('window.__gmuxP95.state().then((s) => s.thumbHeight)');
    },
    async capture(one, lines = 1000) {
      return page(
        `window.gmux.capture.pane(${J({ tmuxName: one.tmuxName, historyLines: lines })}).then((r) => r.ansi).catch((e) => 'ERR ' + String(e && e.message || e))`
      );
    },
    type(one, text) {
      tm(['send-keys', '-t', one.pane, '-l', '--', text]);
    },
    async enter(one) {
      await sleep(400);
      tm(['send-keys', '-t', one.pane, 'Enter']);
    },
    key(one, key) {
      tm(['send-keys', '-t', one.pane, key]);
    },
    /** The window's width, through Emulation.setDeviceMetricsOverride, the seam probe:p292's arm d uses. */
    async resize(width) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    },
    leaveCopyMode(one) {
      const f = flagsOf(one.pane);
      if (f !== null && f.pane_in_mode === 1) tm(['send-keys', '-t', one.pane, '-X', 'cancel']);
    }
  };
  return app;
}

/**
 * The guards, judged on the AGENT's own processes under the pane (Phase 331's
 * fix round). A restored pane's own process is the holder shell, whose
 * STARTING environment lacks what its login files export to the agent it
 * starts, so reading it made every restored arm UNREADABLE on a correct build.
 * Names only: `envTextOf` is read for names and never kept.
 */
function envReading(one) {
  const tree = treeOf(one.panePid);
  if (tree.length === 0) return { problems: ['the pane has no process'], hidden: [] };
  const names = EIGHT.find((a) => a.id === one.agent)?.names ?? [String(one.agent)];
  const rows = tree.map((p) => {
    const text = envTextOf(p.pid);
    return {
      bin: basename(p.command.split(/\s+/)[0] ?? '?'),
      agent: isAgentCommand(p.command, names),
      readable: envReadable(text),
      missing: Object.keys(GUARDS).filter((n) => !envNames(text, n)),
      kind: envNames(text, 'CLAUDE_CODE_SESSION_KIND')
    };
  });
  return judgeEnvRows(rows);
}
/** The guard problems alone, for the arms that grade them. */
const envCheck = (one) => envReading(one).problems;
/** Does any process in the pane's tree carry the variable, and as what? Presence only, and the value is the phase's own `1`. */
function variableInPane(one) {
  for (const p of treeOf(one.panePid)) {
    const text = envTextOf(p.pid);
    const m = new RegExp(`(?:^|\\s)${VARIABLE}=(\\S*)`).exec(text);
    if (m !== null) return m[1] === '1' ? 'set to 1' : 'set, not 1';
  }
  return 'absent';
}
/** The codex process under a pane, and the tokens after its binary. */
function codexCommand(one) {
  for (const p of treeOf(one.panePid)) {
    const tail = commandTail(p.command, 'codex');
    if (tail !== null && !/specstory/.test(p.command.split(/\s+/)[0] ?? '')) return tail;
  }
  return null;
}

/**
 * After a restore's Enter, wait for the agent's own process under the pane, so
 * nothing is read off the REPLAYED scrollback before the resumed agent draws.
 */
async function resumedProcess(one, bin, maxMs = 30_000) {
  const until = Date.now() + maxMs;
  for (;;) {
    noteTree(one.panePid);
    const hit = treeOf(one.panePid).find((p) => commandTail(p.command, bin) !== null && !/specstory/.test(p.command.split(/\s+/)[0] ?? ''));
    if (hit !== undefined) return hit;
    if (Date.now() >= until) throw new Unreadable(`${one.name}: no ${bin} process appeared under the pane after the restore's Enter`);
    await sleep(400);
  }
}

// ---------------------------------------------------------------------------
// The arms that run the same way at both builds
// ---------------------------------------------------------------------------

async function codexReady(one) {
  const until = Date.now() + 45_000;
  for (;;) {
    const s = screenOf(one.pane);
    if (composerReady(s)) break;
    if (Date.now() >= until) {
      throw new Unreadable(`${one.name}: Codex's composer never appeared${/Trust this folder/i.test(s) ? ' (it asked whether to trust the folder)' : ''}`);
    }
    await sleep(400);
  }
  await sleep(1_500);
}
/** A local `!seq` into Codex (no model turn), then the wheel: arm (a)'s readings. */
async function wheelOverCodex(app, one) {
  await app.select(one);
  app.type(one, '!seq -f P331-SEQ-%g 1 150');
  await app.enter(one);
  await waitScreen(one.pane, /P331-SEQ-1\d\d|\+\d+ lines/, 20_000);
  await sleep(1_200);
  const before = { flags: flagsOf(one.pane), composer: composerOf(screenOf(one.pane)), top: ((await app.rows()) ?? [])[0] ?? null };
  const w = await app.wheel(3);
  const after = { flags: flagsOf(one.pane), composer: composerOf(screenOf(one.pane)), top: ((await app.rows()) ?? [])[0] ?? null };
  return { before, after, sent: J(w.sent), arrows: arrowsUp(w.sent), bytes: w.sent.length };
}

/**
 * Arm (c)'s readings, the same at both builds: Ctrl+T, three notches, `q`,
 * with tmux history and the composer read before, during and after.
 */
async function pagerOverCodex(app, one) {
  const before = { history: flagsOf(one.pane)?.history_size, composer: composerOf(screenOf(one.pane)) };
  app.key(one, 'C-t');
  await sleep(1_500);
  const during = flagsOf(one.pane);
  const w = await app.wheel(3);
  app.key(one, 'q');
  await sleep(1_500);
  const after = { flags: flagsOf(one.pane), composer: composerOf(screenOf(one.pane)) };
  return { before, during: { alternate_on: during?.alternate_on, history: during?.history_size }, sent: J(w.sent), after: { alternate_on: after.flags?.alternate_on, history: after.flags?.history_size, composer: after.composer } };
}

/**
 * Arm (b)'s readings, the same at both builds: the mock's escalated command
 * opens an approval, three notches go over it with the highlighted answer read
 * after each, and the approval is NEVER PRESSED: it is declined with Esc.
 */
async function approvalUnderWheel(app, folder) {
  const one = await app.create('b-codex', 'codex', folder);
  await codexReady(one);
  await app.select(one);
  app.type(one, `${APPROVAL_MARKER} please run the command`);
  await app.enter(one);
  const s = await waitScreen(one.pane, /Yes, proceed/, 30_000);
  if (s === null) throw new Unreadable('the mock approval never opened');
  await sleep(1_000);
  const opened = selectedOption(screenOf(one.pane));
  const w = await app.wheel(3, () => selectedOption(screenOf(one.pane)));
  const reading = { opened, perNotch: w.each.map((e) => ({ selected: e.after, sent: J(e.sent) })), sent: J(w.sent), flags: flagsOf(one.pane) };
  // NEVER PRESSED: declined with Esc.
  app.leaveCopyMode(one);
  app.key(one, 'Escape');
  await sleep(1_500);
  await app.kill(one);
  return reading;
}

async function matrixOne(app, agent, build) {
  const dir = join(PROJECT, `${build === 'parent' ? 'p' : 'h'}-m-${agent.id}`);
  const one = await app.create(`m-${agent.id}`, agent.id, dir, { extras: agent.extras ?? [] });
  const screen = await settle(one.pane, 3_000, 30_000);
  noteTree(one.panePid);
  const raw = rawOf(one.tmuxName);
  const reading = {
    tmuxName: one.tmuxName,
    alt1049: altCount(raw),
    modes: mouseModes(raw),
    streamBytes: raw.length,
    flags: flagsOf(one.pane),
    ...(() => {
      const e = envReading(one);
      return { env: e.problems, envHidden: e.hidden };
    })(),
    variable: agent.id === 'claude' ? variableInPane(one) : undefined,
    hint: agent.id === 'claude' ? HINT.test(screen) : undefined,
    loginScreen: agent.id === 'cursor' ? /log ?in|sign ?in/i.test(screen) : undefined
  };
  return { one, reading };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

let mock = null;
let shimPids = [];
let ranHead = false;
const installsBefore = {};
const kept = {};

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const d of [HOME, HARNESS, PROFILE, RAW, PROJECT, CODEX_HOME, CLAUDE_DIR, join(HOME, '.omp', 'agent')]) mkdirSync(d, { recursive: true });

  // ---- the scratch HOME ----------------------------------------------------
  const head = `export PATH="${AGENT_PATH.join(':')}:$PATH"\n${guardExports}\nexport CODEX_HOME='${CODEX_HOME}'\nexport CLAUDE_CONFIG_DIR='${CLAUDE_DIR}'\n`;
  writeFileSync(join(HOME, '.zprofile'), head);
  writeFileSync(join(HOME, '.zshrc'), `${head}PS1='p331 %# '\n`);
  writeFileSync(join(HOME, '.hushlogin'), '');
  // omp's own update check, off in its scratch config (research 134 b's HOME shape).
  writeFileSync(join(HOME, '.omp', 'agent', 'config.yml'), 'startup:\n  checkUpdate: false\n');
  report.preconditions.agentPath = AGENT_PATH;

  // ---- the eight bare names, resolved by the scratch login shell -----------
  const resolved = {};
  for (const a of EIGHT) {
    const hit = a.names.map((n) => [n, resolveInScratch(n)]).find(([, p]) => p !== null);
    resolved[a.id] = hit === undefined ? null : { name: hit[0], path: hit[1] };
  }
  report.preconditions.resolved = Object.fromEntries(Object.entries(resolved).map(([k, v]) => [k, v?.path ?? null]));
  const missing = Object.entries(resolved).filter(([, v]) => v === null).map(([k]) => k);
  if (missing.length > 0) {
    arm('precondition: the scratch login shell resolves the eight', null, `${missing.join(', ')} did not resolve under ${loginShell} -lic, so nothing is launched`);
    throw new Unreadable('a bare name did not resolve');
  }
  for (const [id, v] of Object.entries(resolved)) installsBefore[id] = installOf(v.path);
  report.preconditions.installsBefore = installsBefore;
  report.preconditions.tmuxInTrustedDirs = Object.fromEntries(TMUX_DIRS.map((p) => [p, existsSync(p)]));

  // ---- the mock provider, then Codex's config, then its dummy key ---------
  mock = await startMockResponses();
  const trustedDirs = [
    ...EIGHT.flatMap((a) => [`p-m-${a.id}`, `h-m-${a.id}`]),
    'p-a-codex', 'h-a-codex', 'p-b-codex', 'h-b-codex', 'p-d-codex', 'p-g-codex', 'h-g-codex', 'h-f-codex'
  ].map((d) => join(PROJECT, d));
  writeFileSync(join(CODEX_HOME, 'config.toml'), codexConfig(mock.port, trustedDirs));
  {
    const now = Math.floor(Date.now() / 1000);
    writeFileSync(
      join(CODEX_HOME, 'history.jsonl'),
      ['ONE', 'TWO', 'THREE'].map((w, i) => J({ session_id: '00000000-0000-4000-8000-000000000331', ts: now - 300 + i * 100, text: `P331-HISTORY-${w}` })).join('\n') + '\n'
    );
  }
  const login = spawnSync(resolved.codex.path, ['login', '--with-api-key'], { encoding: 'utf8', input: `${DUMMY_CODEX_KEY}\n`, timeout: 60_000, env: scratchEnv() });
  report.preconditions.codexLogin = { exit: login.status, authFile: existsSync(join(CODEX_HOME, 'auth.json')) };
  if (!existsSync(join(CODEX_HOME, 'auth.json'))) {
    arm('precondition: Codex holds its dummy key in the scratch home', null, `codex login --with-api-key exited ${String(login.status)} and wrote no auth.json under the scratch CODEX_HOME`);
    throw new Unreadable('no scratch Codex key');
  }

  // ---- the versions ---------------------------------------------------------
  const codexV = versionOf(spawnSync(resolved.codex.path, ['--version'], { encoding: 'utf8', timeout: 30_000, env: scratchEnv() }).stdout);
  const claudeV = versionOf(spawnSync(resolved.claude.path, ['-v'], { encoding: 'utf8', timeout: 30_000, env: scratchEnv() }).stdout);
  report.preconditions.versions = { codex: codexV?.join('.') ?? null, claude: claudeV?.join('.') ?? null };
  if (!atLeast(codexV, [0, 158, 0]) || !atLeast(claudeV, [2, 1, 132])) {
    arm('precondition: Codex 0.158 or later and Claude Code 2.1.132 or later', null, `codex ${J(report.preconditions.versions.codex)}, claude ${J(report.preconditions.versions.claude)}`);
    throw new Unreadable('an agent is older than the phase measured');
  }

  // ---- Claude's scratch configuration --------------------------------------
  const claudeDirs = ['p-m-claude', 'h-m-claude', 'p-j-claude', 'p-jh-claude'].map((d) => join(PROJECT, d));
  for (const d of claudeDirs) mkdirSync(d, { recursive: true });
  const claudeJson = {
    numStartups: 1,
    hasCompletedOnboarding: true,
    lastOnboardingVersion: claudeV.join('.'),
    lastReleaseNotesSeen: claudeV.join('.'),
    customApiKeyResponses: { approved: [FAKE_CLAUDE_KEY.slice(-20)], rejected: [] },
    hasSeenAutoDefaultNotice: true,
    officialMarketplaceAutoInstallAttempted: true,
    officialMarketplaceAutoInstalled: true,
    projects: Object.fromEntries(claudeDirs.map((d) => [realpathSync(d), { hasTrustDialogAccepted: true, allowedTools: [] }]))
  };
  writeFileSync(join(HOME, '.claude.json'), J(claudeJson, null, 1));
  writeFileSync(join(CLAUDE_DIR, '.claude.json'), J(claudeJson, null, 1));
  writeFileSync(join(CLAUDE_DIR, 'settings.json'), '{ "tui": "fullscreen" }\n');

  // ---- the four agents that must never start, hidden from the app's detection --
  // Checked with EACH build's own overlay parser, merge and resolver through the
  // pinned tsx, before either launch, so a build whose parser refused the file
  // (and so fell back to the real binaries) is found before anything starts.
  const loginPath = (spawnSync(loginShell, ['-lic', 'printf %s "$PATH"'], { encoding: 'utf8', timeout: 30_000, env: scratchEnv() }).stdout ?? '').trim().split('\n').pop() ?? '';
  const checkPath = [loginPath, ...AGENT_PATH, process.env['PATH'] ?? ''].filter(Boolean).join(':');
  report.preconditions.never = {};
  for (const [label, dir] of [['parent', PARENT_DIR], ['head', ROOT]]) {
    const script = [
      "import { join } from 'node:path';",
      "import { parseAgentOverlay, mergeAgentOverlay } from './src/main/config/overlay.ts';",
      "import { AGENT_REGISTRY } from './src/main/agents/registry.ts';",
      "import { resolveBinaryAllAgainst, extraBinDirsFor } from './src/main/tmux/resolve.ts';",
      `const home = ${J(HOME)};`,
      `const userPath = ${J(checkPath)};`,
      `const parsed = parseAgentOverlay(${J(J(neverOverlay()))});`,
      'const merged = mergeAgentOverlay(parsed.rows, AGENT_REGISTRY);',
      'const rows = {};',
      `for (const id of ${J(HIDDEN_IDS)}) {`,
      '  const e = merged.agents.find((a) => a.id === id);',
      '  if (e === undefined) { rows[id] = null; continue; }',
      "  const dirs = [...e.extraProbeDirs.map((p) => (p.startsWith('~/') ? join(home, p.slice(2)) : p)), ...extraBinDirsFor(home)];",
      '  rows[id] = { binaries: e.binaries, copies: e.binaries.flatMap((b) => resolveBinaryAllAgainst(b, userPath, dirs)).length };',
      '}',
      'process.stdout.write(JSON.stringify({ parseProblems: parsed.problems.length, mergeProblems: merged.problems.length, rows }));',
      ''
    ].join('\n');
    const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', '-'], { cwd: dir, input: script, encoding: 'utf8', timeout: 120_000 });
    let out = null;
    try {
      out = JSON.parse(r.stdout);
    } catch {
      out = null;
    }
    const v = neverPrecheckVerdict(out);
    report.preconditions.never[label] = { exit: r.status, ...v };
    if (!v.ok) {
      arm(`precondition: ${label}'s own detection resolves none of the four`, null, v.said);
      throw new Unreadable('the four agents could not be hidden from the app');
    }
  }
  const NEVER_JSON = `${J(neverOverlay(), null, 1)}\n`;
  const writeNeverOverlay = () => {
    mkdirSync(join(PROFILE, 'gmux', 'config'), { recursive: true });
    writeFileSync(join(PROFILE, 'gmux', 'config', 'agents.json'), NEVER_JSON);
  };

  // ---- one launch -------------------------------------------------------------
  const appEnv = withoutDevRenderer({
    ...STRIPPED,
    HOME,
    CODEX_HOME,
    CLAUDE_CONFIG_DIR: CLAUDE_DIR,
    ANTHROPIC_API_KEY: FAKE_CLAUDE_KEY,
    ...GUARDS,
    ...(HOOKS ? {} : { GMUX_DISABLE_AGENT_HOOKS: '1' }),
    GMUX_TMUX_SOCKET: SOCKET,
    GMUX_PROBES: '1',
    GMUX_LOG_FILE: '1',
    GMUX_SPECSTORY_NO_CLOUD: '1',
    GMUX_CONFIG_ROOT: join(PROFILE, 'gmux', 'config'),
    GMUX_HARNESS_DIR: HARNESS,
    GMUX_TMUX_BIN: TMUX
  });
  let neverBreached = false;
  const launch = (build, body) => {
    // Written before EACH launch: the app reads it once, at boot, before its
    // first scan, and a build must never meet the profile without it.
    writeNeverOverlay();
    return withElectron(
      {
        label: `p331-${build}`,
        userDataDir: PROFILE,
        cwd: build === 'parent' ? PARENT_DIR : ROOT,
        // THE PARENT HANDS NO SOCKET, so its teardown leaves the scratch server
        // (and the processes the parent made) for HEAD to meet. HEAD hands it.
        tmuxSocket: build === 'parent' ? null : SOCKET,
        args: ['--remote-debugging-port=0', '--use-mock-keychain', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
        env: appEnv,
        graceMs: 8_000,
        ceilingMs: 45 * 60_000
      },
      async (handle) => {
        try {
          shimPids.push(handle.pid);
          try {
            shimPids.push(handle.appPid());
          } catch {
            /* recorded at the end if it can be */
          }
          const cdp = await attach(150_000);
          try {
            await cdp.call('Runtime.enable');
            await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => undefined);
            for (let i = 0; i < 300; i += 1) {
              if ((await cdpEval(cdp, 'window.gmux !== undefined && window.__gmuxP95 !== undefined').catch(() => false)) === true) break;
              await sleep(300);
            }
            // THE GUARD, READ BACK from the app's own scan before any arm. A
            // hidden row that resolved means a version probe may already have
            // run it, so the run stops here and says so.
            let scan = null;
            try {
              scan = JSON.parse(await cdpEval(cdp, 'window.gmux.agentsList().then((r) => JSON.stringify(r.agents.map((a) => ({ id: a.id, installed: a.installed, binPath: a.binPath ?? null, version: a.version ?? null }))))', 90_000));
            } catch {
              scan = null;
            }
            const never = neverScanVerdict(scan);
            report.readings[`scan-${build}`] = { ...never, installed: Array.isArray(scan) ? scan.filter((a) => a.installed).map((a) => a.id) : null };
            if (!never.ok) {
              neverBreached = true;
              throw new Unreadable(`(${build}) the app's own detection was not kept off the four: ${never.said}`);
            }
            await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
            await sleep(600);
            await cdpEval(cdp, PAGE_KIT);
            // The server exists once the app has booted; the pipe opens at each
            // new session's first byte from here on.
            await cdpEval(cdp, `window.__gmuxP95.openLocal(${J(PROJECT)}).then(() => true)`, 30_000);
            const theApp = makeApp(cdp, build);
            // The pipe must open at each new session's FIRST byte (Codex asks
            // for 1049 at byte 69), so the hook goes on the scratch server
            // before any session is made. When the app has not started the
            // server yet, one shell session through the app starts it.
            const serverUp = () => tm(['show-options', '-gv', 'exit-empty']).ok;
            for (let i = 0; i < 20 && !serverUp(); i += 1) await sleep(300);
            if (!serverUp()) await theApp.kill(await theApp.create('boot', 'shell', join(PROJECT, `${build}-boot`)));
            if (!tm(['set-hook', '-g', 'after-new-session', `pipe-pane -o 'cat >> ${RAW}/#{session_name}.raw'`]).ok) {
              throw new Unreadable(`the pipe hook could not be set on ${SOCKET}, so no stream can be counted`);
            }
            await body(theApp, handle);
          } finally {
            cdp.close();
          }
        } catch (err) {
          if (err instanceof Unreadable) arm(`(${build}) the run`, null, err.message);
          else arm(`(${build}) the run`, false, `it threw: ${String(err?.stack ?? err).slice(0, 600)}`);
        }
      }
    );
  };

  const P = report.readings.parent;
  const H = report.readings.head;
  /** Run one arm's body; a thrown Unreadable is recorded, never a crash of the run. */
  const step = async (readings, key, fn) => {
    try {
      readings[key] = await fn();
    } catch (err) {
      readings[key] = { unreadable: err instanceof Unreadable ? err.message : `it threw: ${String(err?.message ?? err)}` };
    }
  };

  // ======================================================================
  // THE PARENT
  // ======================================================================
  say(`the parent, ${PARENT_DIR}`);
  await launch('parent', async (app) => {
    // ---- the matrix; its Claude is kept running for arm (o) ------------------
    if (want('matrix')) {
      P.matrix = {};
      for (const agent of EIGHT) {
        await step(P.matrix, agent.id, async () => {
          const { one, reading } = await matrixOne(app, agent, 'parent');
          if (agent.id === 'claude' && want('o')) kept.o = { id: one.id, tmuxName: one.tmuxName, sid: one.sid };
          else await app.kill(one);
          return reading;
        });
      }
    }
    const reproducible = !(P.matrix?.codex?.flags?.mouse_any_flag === 1);
    report.readings.reproducible = reproducible;

    // ---- (a) and (c) ---------------------------------------------------------
    if (want('a')) {
      await step(P, 'a', async () => {
        const one = await app.create('a-codex', 'codex', join(PROJECT, 'p-a-codex'));
        await codexReady(one);
        const a = await wheelOverCodex(app, one);
        let c;
        if (want('c')) c = await pagerOverCodex(app, one);
        await app.kill(one);
        return { ...a, c };
      });
    }

    // ---- (b) the open approval -----------------------------------------------
    if (want('b')) {
      await step(P, 'b', () => approvalUnderWheel(app, join(PROJECT, 'p-b-codex')));
    }

    // ---- (d) a pre-phase Codex with --yolo, harvested by one mock turn -------
    if (want('d')) {
      await step(P, 'd', async () => {
        const one = await app.create('d-codex', 'codex', join(PROJECT, 'p-d-codex'), { extras: ['--yolo'] });
        await codexReady(one);
        app.type(one, 'P331-HELLO answer with the reply');
        await app.enter(one);
        let s = null;
        for (let i = 0; i < 120; i += 1) {
          s = await app.find(one.id);
          if (s !== null && s.resumeArgv !== null) break;
          await sleep(500);
        }
        if (s === null || s.resumeArgv === null) throw new Unreadable('the parent never harvested the Codex id after the mock turn');
        kept.d = { id: one.id, sid: one.sid, dir: one.dir };
        return { id: one.id, resumeArgv: s.resumeArgv, repliedOnScreen: historyOf(one.pane).includes(REPLY) };
      });
    }

    // ---- (g) a captured Codex, harvested, and (a)'s readings over it ----------
    if (want('g')) {
      await step(P, 'g', async () => {
        const one = await app.create('g-codex', 'codex', join(PROJECT, 'p-g-codex'), { capture: true });
        const listed = await app.find(one.id);
        if (listed?.capture === null) throw new Unreadable('SpecStory capture was declined at the parent, so there is no captured row to bring across');
        await codexReady(one);
        app.type(one, 'P331-HELLO answer with the reply');
        await app.enter(one);
        let s = null;
        for (let i = 0; i < 120; i += 1) {
          s = await app.find(one.id);
          if (s !== null && s.resumeArgv !== null) break;
          await sleep(500);
        }
        if (s === null || s.resumeArgv === null) throw new Unreadable('the parent never harvested the captured Codex id');
        const a = await wheelOverCodex(app, one);
        kept.g = { id: one.id, sid: one.sid };
        return { id: one.id, resumeArgv: s.resumeArgv, ...a };
      });
    }

    // ---- (h) the controls ------------------------------------------------------
    if (want('h')) await step(P, 'h', () => controls(app, 'parent'));

    // ---- (i) a new folder's trust question ------------------------------------
    if (want('i')) await step(P, 'i', () => trustQuestion(app, 'parent'));

    // ---- (j) and (m): a Claude restored at the parent, and one for HEAD --------
    if (want('j')) {
      await step(P, 'j', async () => {
        const one = await app.create('j-claude', 'claude', join(PROJECT, 'p-j-claude'));
        const s = await settle(one.pane, 3_000, 30_000);
        const row = await app.find(one.id);
        if (row?.agentSessionId === null || row === null) throw new Unreadable('the parent Claude row has no pre-assigned id');
        const hintAtCreate = HINT.test(s);
        tm(['kill-session', '-t', one.sid]);
        const file = join(claudeProjectDir(one.dir), `${row.agentSessionId}.jsonl`);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, transcript(row.agentSessionId, realpathSync(one.dir)));
        const planted = statSync(file).size;
        for (let i = 0; i < 60 && (await app.find(one.id))?.status !== 'restorable'; i += 1) await sleep(500);
        await app.page(`window.gmux.sessions.restore(${J(one.id)}).then(() => true)`, 60_000);
        const back = await app.rebind(one.id);
        await waitScreen(back.pane, /--resume/, 20_000);
        tm(['send-keys', '-t', back.pane, 'Enter']);
        await resumedProcess(back, 'claude');
        const screen = await settle(back.pane, 3_000, 40_000);
        noteTree(back.panePid);
        const reading = {
          flags: flagsOf(back.pane),
          line001: historyOf(back.pane).includes(TRANSCRIPT_LINE(1)),
          planted,
          grewTo: statSync(file).size,
          hint: HINT.test(screen) || hintAtCreate,
          hintLine: (screen.split('\n').find((l) => HINT.test(l)) ?? '').trim() || null,
          variable: variableInPane(back),
          env: envCheck(back)
        };
        await app.kill(back);
        return reading;
      });
      await step(P, 'jHead', async () => {
        const one = await app.create('jh-claude', 'claude', join(PROJECT, 'p-jh-claude'));
        await settle(one.pane, 3_000, 30_000);
        const row = await app.find(one.id);
        if (row?.agentSessionId === null || row === null) throw new Unreadable('the Claude row for HEAD has no pre-assigned id');
        kept.j = { id: one.id, sid: one.sid, dir: one.dir, agentSessionId: row.agentSessionId };
        return { id: one.id, variable: variableInPane(one) };
      });
    }

    // ---- (n) what the parent does with the name: kept, then taken off again ----
    if (want('n')) await step(P, 'n', () => settingsArm(app, 'parent'));
  });

  // ======================================================================
  // BETWEEN THE LAUNCHES: the reboot, and the plant for (j)
  // ======================================================================
  {
    const between = report.readings.between;
    for (const key of ['d', 'g', 'j']) {
      const k = kept[key];
      if (k === undefined) continue;
      between[key] = { before: manifestRow(k.id) };
      // Every process under that session, noted before it is ended so the finally can find a straggler.
      const pane = tm(['list-panes', '-t', k.sid, '-F', '#{pane_pid}']).out.trim();
      if (/^\d+$/.test(pane)) noteTree(Number(pane));
      between[key].ended = tm(['kill-session', '-t', k.sid]).ok;
    }
    if (kept.j !== undefined) {
      const file = join(claudeProjectDir(kept.j.dir), `${kept.j.agentSessionId}.jsonl`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, transcript(kept.j.agentSessionId, realpathSync(kept.j.dir)));
      kept.j.file = file;
      kept.j.planted = statSync(file).size;
    }
    // Rows are summarised: agent ids, argv shape, and the variable's presence only.
    for (const v of Object.values(between)) {
      if (v.before !== null && v.before !== undefined) {
        v.before = { agent: v.before.agent, status: v.before.status, argv: v.before.argv, resume_argv: v.before.resume_argv, variable: rowVariable(v.before) };
      }
    }
  }

  // ======================================================================
  // HEAD
  // ======================================================================
  if (neverBreached) throw new Unreadable('the parent launch did not keep the four agents hidden, so HEAD is not launched');
  say(`HEAD, ${ROOT}`);
  await launch('head', async (app) => {
    ranHead = true;
    // ---- (o) before anything is restored: the parent's Claude, still running ----
    if (want('o') && kept.o !== undefined) {
      await step(H, 'o', async () => {
        const pane = paneOf(kept.o.tmuxName);
        const f = pane === null ? null : flagsOf(pane.pane);
        let row = null;
        for (let i = 0; i < 60; i += 1) {
          row = manifestRow(kept.o.id);
          if (rowVariable(row) !== 'absent') break;
          await sleep(500);
        }
        return { alive: pane !== null, flags: f, rowVariable: rowVariable(row) };
      });
    }

    // ---- the pass: the rows the parent wrote, brought across -----------------
    for (const key of ['d', 'g', 'j']) {
      const k = kept[key];
      if (k === undefined) continue;
      await step(H, `pass-${key}`, async () => {
        for (let i = 0; i < 60 && (await app.find(k.id))?.status !== 'restorable'; i += 1) await sleep(500);
        let row = null;
        for (let i = 0; i < 60; i += 1) {
          row = manifestRow(k.id);
          const moved = key === 'j' ? rowVariable(row) !== 'absent' && rowVariable(row) !== 'no env' : J(row?.resume_argv) !== J(report.readings.between[key]?.before?.resume_argv);
          if (moved) break;
          await sleep(500);
        }
        return { status: row?.status ?? null, argv: row?.argv ?? null, resume_argv: row?.resume_argv ?? null, variable: rowVariable(row) };
      });
    }

    // ---- the matrix at HEAD ------------------------------------------------------
    if (want('matrix')) {
      H.matrix = {};
      for (const agent of EIGHT) {
        await step(H.matrix, agent.id, async () => {
          const { one, reading } = await matrixOne(app, agent, 'head');
          if (agent.id === 'codex') reading.command = codexCommand(one);
          await app.kill(one);
          return reading;
        });
      }
    }

    // ---- (a), (c) and the create command line ---------------------------------
    if (want('a')) {
      await step(H, 'a', async () => {
        const one = await app.create('a-codex', 'codex', join(PROJECT, 'h-a-codex'));
        await codexReady(one);
        const command = codexCommand(one);
        const a = await wheelOverCodex(app, one);
        let c;
        if (want('c')) {
          app.leaveCopyMode(one);
          await sleep(600);
          c = await pagerOverCodex(app, one);
        }
        await app.kill(one);
        return { command, ...a, c };
      });
    }

    // ---- (b) ---------------------------------------------------------------------
    if (want('b')) {
      await step(H, 'b', () => approvalUnderWheel(app, join(PROJECT, 'h-b-codex')));
    }

    // ---- (d), (k) over Codex, (l) over Codex, then (e) ---------------------------
    let dLive = null;
    if (want('d') && kept.d !== undefined) {
      await step(H, 'd', async () => {
        await app.page(`window.gmux.sessions.restore(${J(kept.d.id)}).then(() => true)`, 60_000);
        const back = await app.rebind(kept.d.id);
        await waitScreen(back.pane, /resume/, 20_000);
        tm(['send-keys', '-t', back.pane, 'Enter']);
        await resumedProcess(back, 'codex');
        await settle(back.pane, 2_500, 30_000);
        await codexReady(back);
        noteTree(back.panePid);
        const command = codexCommand(back);
        const flags = flagsOf(back.pane);
        const yolo = /permissions:\s*YOLO mode/i.test(historyOf(back.pane, 400));
        const replied = historyOf(back.pane).includes(REPLY);
        const a = await wheelOverCodex(app, back);
        dLive = back;
        const thumb = await app.thumb();
        const captured = await app.capture(back);
        return { command, flags, yolo, replied, ...a, thumb, captureHoldsReply: String(captured).includes(REPLY), env: envCheck(back) };
      });
    }

    // ---- (j), (k) over Claude, (m) ------------------------------------------------
    let jLive = null;
    if (want('j') && kept.j !== undefined) {
      await step(H, 'j', async () => {
        await app.page(`window.gmux.sessions.restore(${J(kept.j.id)}).then(() => true)`, 60_000);
        const back = await app.rebind(kept.j.id);
        await waitScreen(back.pane, /--resume/, 20_000);
        tm(['send-keys', '-t', back.pane, 'Enter']);
        await resumedProcess(back, 'claude');
        const screen = await settle(back.pane, 3_000, 40_000);
        noteTree(back.panePid);
        const reading = {
          flags: flagsOf(back.pane),
          line001: historyOf(back.pane).includes(TRANSCRIPT_LINE(1)),
          planted: kept.j.planted,
          grewTo: existsSync(kept.j.file) ? statSync(kept.j.file).size : null,
          hint: HINT.test(screen) || HINT.test(historyOf(back.pane)),
          variable: variableInPane(back),
          env: envCheck(back)
        };
        jLive = back;
        await app.select(back);
        const w = await app.wheel(3);
        reading.k = {
          sent: J(w.sent),
          flags: flagsOf(back.pane),
          thumb: await app.thumb(),
          captureHoldsLine001: String(await app.capture(back)).includes(TRANSCRIPT_LINE(1))
        };
        app.leaveCopyMode(back);
        return reading;
      });
    }

    // ---- (l) a reader parked across a resize and a return ------------------------
    if (want('l')) {
      H.l = {};
      for (const [key, live] of [['codex', dLive], ['claude', jLive]]) {
        if (live === null) continue;
        await step(H.l, key, () => parkedReader(app, live));
      }
    }

    // ---- (e) Restart of the pre-phase row -----------------------------------------
    if (want('e') && kept.d !== undefined) {
      await step(H, 'e', async () => {
        const got = JSON.parse(
          await app.page(`window.gmux.sessions.restart(${J(kept.d.id)}).then((s) => JSON.stringify({ id: s.id })).catch((e) => JSON.stringify({ error: String(e && e.message || e) }))`, 90_000)
        );
        if (got.error !== undefined) throw new Unreadable(`Restart refused: ${got.error}`);
        const row = manifestRow(got.id);
        const one = await app.rebind(got.id);
        await settle(one.pane, 2_500, 30_000);
        noteTree(one.panePid);
        const reading = { argv: row?.argv ?? null, flags: flagsOf(one.pane), command: codexCommand(one) };
        await app.kill(one);
        return reading;
      });
    }

    // ---- (f) the person's own opt-back ----------------------------------------------
    if (want('f')) {
      await step(H, 'f', async () => {
        const one = await app.create('f-codex', 'codex', join(PROJECT, 'h-f-codex'), { extras: [...OPT_BACK] });
        await codexReady(one);
        const flags = flagsOf(one.pane);
        const a = await wheelOverCodex(app, one);
        await app.kill(one);
        return { flags, argv: manifestRow(one.id)?.argv ?? null, ...a };
      });
    }

    // ---- (g) the captured row brought across, and one made here ----------------------
    if (want('g')) {
      if (kept.g !== undefined) {
        await step(H, 'g', async () => {
          await app.page(`window.gmux.sessions.restore(${J(kept.g.id)}).then(() => true)`, 60_000);
          const back = await app.rebind(kept.g.id);
          await waitScreen(back.pane, /specstory|resume/, 20_000);
          tm(['send-keys', '-t', back.pane, 'Enter']);
          await resumedProcess(back, 'codex');
          await settle(back.pane, 2_500, 30_000);
          await codexReady(back);
          noteTree(back.panePid);
          const listed = await app.find(kept.g.id);
          const row = manifestRow(kept.g.id);
          const flags = flagsOf(back.pane);
          const a = await wheelOverCodex(app, back);
          await app.kill(back);
          return { resume_argv: row?.resume_argv ?? null, capture: listed?.capture ?? null, flags, ...a };
        });
      }
      await step(H, 'gCreate', async () => {
        const one = await app.create('g-codex', 'codex', join(PROJECT, 'h-g-codex'), { capture: true });
        await codexReady(one);
        const row = manifestRow(one.id);
        const flags = flagsOf(one.pane);
        await app.kill(one);
        return { argv: row?.argv ?? null, flags };
      });
    }

    // ---- (h), (i), (n) ---------------------------------------------------------------
    if (want('h')) await step(H, 'h', () => controls(app, 'head'));
    if (want('i')) await step(H, 'i', () => trustQuestion(app, 'head'));
    if (want('n')) await step(H, 'n', () => settingsArm(app, 'head'));

    // ---- (m) no hint on HEAD's Claude screens ---------------------------------------
    if (want('m')) {
      H.m = {
        matrixClaude: H.matrix?.claude?.hint ?? null,
        restoredClaude: H.j?.hint ?? null
      };
    }
    if (dLive !== null) await app.kill(dLive).catch(() => undefined);
    if (jLive !== null) await app.kill(jLive).catch(() => undefined);
  });
} catch (err) {
  if (!(err instanceof Unreadable)) arm('the run', false, `it threw: ${String(err?.stack ?? err).slice(0, 600)}`);
} finally {
  // Codex's fetch of openai/plugins.git (research 133 §9), stated rather than
  // turned off: no measured config key stops it on 0.158.
  report.readings.codexPluginsFetchSeen = [...ours.values()].some((c) => /openai\/plugins/.test(c));
  // Every agent, shell and helper seen under one of this run's panes, by pid.
  const ended = await endOurs().catch(() => ({ asked: 0, killed: 0, left: -1 }));
  report.readings.processes = { seen: ours.size, ...ended };
  if (mock !== null) {
    report.mock = { port: mock.port, requests: mock.requests.length, marked: mock.requests.filter((r) => r.marked).length };
    await mock.close().catch(() => undefined);
  }
  // THE SCRATCH SERVER AND ITS SOCKET FILE. withElectron (HEAD) ended the
  // server; this is the belt for a run that threw before HEAD launched, which
  // is the one path on which the parent's server would otherwise outlive us.
  tm(['kill-server']);
  if (SOCKET.startsWith('gmux-p331b-')) {
    const socketFile = join(process.env['TMUX_TMPDIR'] ?? '/tmp', `tmux-${String(process.getuid())}`, SOCKET);
    const existed = existsSync(socketFile);
    rmSync(socketFile, { force: true });
    report.readings.socket = { existedAfterTeardown: existed, left: existsSync(socketFile) };
  }
  // The installs after the last launch: a moved one is reported, never absorbed.
  const installsAfter = {};
  for (const [id, before] of Object.entries(installsBefore)) {
    installsAfter[id] = before === null ? null : installOf(before.real);
  }
  report.preconditions.installsAfter = installsAfter;
}

// ===========================================================================
// The arms both builds run the same way, as functions (hoisted)
// ===========================================================================

async function controls(app, build) {
  const B = build === 'parent' ? 'p' : 'h';
  const out = {};
  // A plain shell with history: Tortie scrolls, xterm sends nothing.
  const shell = await app.create('h-shell', 'shell', join(PROJECT, `${B}-h-shell`));
  await settle(shell.pane, 1_500, 15_000);
  app.type(shell, 'seq -f P331-SH-%g 1 200');
  await app.enter(shell);
  await waitScreen(shell.pane, /P331-SH-200/, 15_000);
  await sleep(800);
  await app.select(shell);
  let w = await app.wheel(3);
  out.shell = { sent: J(w.sent), inMode: flagsOf(shell.pane)?.pane_in_mode ?? null };
  app.leaveCopyMode(shell);
  await sleep(500);
  // vim with no mouse: the alternate screen and no mouse, so xterm sends arrows.
  app.type(shell, 'vim -u NONE -N -n');
  await app.enter(shell);
  await sleep(2_000);
  const vimFlags = flagsOf(shell.pane);
  w = await app.wheel(3);
  out.vim = { sent: J(w.sent), alt: vimFlags?.alternate_on ?? null, mouse: vimFlags?.mouse_any_flag ?? null };
  app.key(shell, 'Escape');
  app.type(shell, ':q!');
  await app.enter(shell);
  await sleep(1_000);
  // The stand-in: 1049 and SGR mouse, so xterm sends SGR reports.
  const log = join(HARNESS, `sgr-${build}.jsonl`);
  app.type(shell, `'${process.execPath}' '${STAND_IN_SGR}' '${log}'`);
  await app.enter(shell);
  await waitScreen(shell.pane, /P331 SGR STAND-IN READY/, 15_000);
  await sleep(800);
  noteTree(shell.panePid);
  const sgrFlags = flagsOf(shell.pane);
  w = await app.wheel(3);
  let arrived = [];
  try {
    arrived = readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    arrived = [];
  }
  out.standIn = { sent: J(w.sent), alt: sgrFlags?.alternate_on ?? null, mouse: sgrFlags?.mouse_any_flag ?? null, arrived: arrived.length };
  app.type(shell, 'q');
  await sleep(800);
  await app.kill(shell);
  return out;
}

async function trustQuestion(app, build) {
  const one = await app.create('i-codex', 'codex', join(PROJECT, `${build === 'parent' ? 'p' : 'h'}-i-untrusted`));
  const s = await waitScreen(one.pane, /Trust this folder|trust the contents/i, 40_000);
  if (s === null) throw new Unreadable("Codex's folder question never appeared in the untrusted folder");
  await sleep(1_500);
  const reading = { flags: flagsOf(one.pane), alt1049: altCount(rawOf(one.tmuxName)), question: (s.split('\n').find((l) => /Trust this folder|trust the contents/i.test(l)) ?? '').trim() };
  // NOTHING PRESSED.
  await app.kill(one);
  return reading;
}

/** (n): the variable through the Settings IPC, and each scope's sentence composed from the build's own source. */
async function settingsArm(app, build) {
  const before = JSON.parse(await app.page('window.gmux.settingsGet().then((s) => JSON.stringify({ shared: s.envPassthroughShared ?? [], claude: (s.envPassthrough ?? {}).claude ?? [] }))'));
  await app.page(`window.gmux.settingsSet(${J({ envPassthroughShared: [...before.shared, VARIABLE], envPassthrough: { claude: [...before.claude, VARIABLE] } })}).then(() => true)`);
  await sleep(600);
  const after = JSON.parse(await app.page('window.gmux.settingsGet().then((s) => JSON.stringify({ shared: s.envPassthroughShared ?? [], claude: (s.envPassthrough ?? {}).claude ?? [] }))'));
  const reading = { sharedKept: after.shared.includes(VARIABLE), claudeKept: after.claude.includes(VARIABLE) };
  // The parent keeps the name; take it off again so HEAD starts from nothing.
  await app.page(`window.gmux.settingsSet(${J({ envPassthroughShared: before.shared, envPassthrough: { claude: before.claude } })}).then(() => true)`);
  await sleep(400);
  if (build === 'head') {
    // The sentence each scope composes, from THIS build's own source, through
    // the pinned tsx: the refusal the Settings window draws is this function.
    const script = [
      "import { envPassthroughRefusal } from './src/shared/agent-overlay.ts';",
      "import { compiledLaunchEnvKeys } from './src/main/agents/registry.ts';",
      "const store = await import('./src/main/settings/store.ts');",
      `const name = ${J(VARIABLE)};`,
      "const shared = envPassthroughRefusal(name, { agentEnvKeys: store.sharedRefusedEnvKeys(), scope: 'shared' });",
      "const claude = envPassthroughRefusal(name, { agentEnvKeys: compiledLaunchEnvKeys('claude') });",
      'process.stdout.write(JSON.stringify({ shared, claude }));',
      ''
    ].join('\n');
    const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', '-'], { cwd: ROOT, input: script, encoding: 'utf8', timeout: 90_000 });
    try {
      reading.sentences = JSON.parse(r.stdout);
    } catch {
      reading.sentences = { error: `the composition exited ${String(r.status)}` };
    }
  }
  return reading;
}

/** (l): the method of probe:p292's arms d and f, over one inline session. */
async function parkedReader(app, one) {
  const attachedAt = await app.select(one);
  const w = await app.wheel(3);
  const parked = flagsOf(one.pane);
  if (parked?.pane_in_mode !== 1) throw new Unreadable(`${one.name}: three notches did not park the reader in copy mode`);
  // The first three non-blank rows, never the first row: an inline Codex's
  // first row is blank, and "" held against "" proved nothing (Phase 331's
  // fix round). A view with no non-blank row is no reading.
  const top0 = viewKey(await app.rows());
  if (top0 === null) throw new Unreadable(`${one.name}: the parked view holds no non-blank row to hold still`);
  const early = attachedAt + 33_000 - Date.now();
  if (early > 0) await sleep(early);
  const rawBefore = rawOf(one.tmuxName).length;
  const mark = await app.page('window.__p331.now()');
  const resized = Date.now();
  // The resize itself, through the seam probe:p292's arm d uses.
  await app.resize(1340);
  const samples = [];
  for (const at of [150, 450, 800, 1300, 2000]) {
    const waitMs = resized + at - Date.now();
    if (waitMs > 0) await sleep(waitMs);
    samples.push({ at, inMode: flagsOf(one.pane)?.pane_in_mode ?? null, top: viewKey(await app.rows()) });
  }
  const sentAtResize = await app.page(`window.__p331.sentSince(${String(mark)})`);
  const clears = (rawOf(one.tmuxName).slice(rawBefore).match(/\x1b\[3J/g) ?? []).length;
  await app.resize(1440);
  await sleep(1_000);
  // The return: another session shown for four seconds, and this one again.
  const other = await app.create(`l-other-${String(Date.now() % 100000)}`, 'shell', join(PROJECT, 'l-other'));
  await app.select(other);
  await sleep(4_000);
  const mark2 = await app.page('window.__p331.now()');
  await app.select(one);
  await sleep(1_500);
  const back = { inMode: flagsOf(one.pane)?.pane_in_mode ?? null, top: viewKey(await app.rows()), sent: J(await app.page(`window.__p331.sentSince(${String(mark2)})`)) };
  await app.kill(other);
  app.leaveCopyMode(one);
  return { sentWhileParking: J(w.sent), top0, samples, sentAtResize: J(sentAtResize), clearsAtResize: clears, back, secondsAfterAttach: Math.round((resized - attachedAt) / 1000) };
}

// ===========================================================================
// The grading, from both builds' readings together
// ===========================================================================

function grade() {
  const P = report.readings.parent;
  const H = report.readings.head;
  const ur = (r) => r === undefined || r === null || r.unreadable !== undefined;
  const why = (r) => (r === undefined || r === null ? 'no reading' : r.unreadable ?? 'no reading');
  const repro = report.readings.reproducible !== false;
  const needRepro = (id, fn) => (repro ? fn() : arm(id, null, "the parent's Codex pane read mouse_any_flag 1, so this Mac's Codex takes the mouse and the defect cannot be reproduced here"));

  if (want('matrix')) {
    for (const agent of EIGHT) {
      const p = P.matrix?.[agent.id];
      const h = H.matrix?.[agent.id];
      const id = `matrix ${agent.id}`;
      if (ur(p) || ur(h)) {
        arm(id, null, `parent: ${ur(p) ? why(p) : 'read'}; HEAD: ${ur(h) ? why(h) : 'read'}`);
        continue;
      }
      const envBad = [...(p.env ?? []), ...(h.env ?? [])];
      if (envBad.length > 0) {
        arm(id, null, `a guard or the session kind was wrong in a pane: ${[...new Set(envBad)].join('; ')}`);
        continue;
      }
      if (agent.id === 'codex') {
        needRepro(id, () => {
          const v = matrixVerdict('codex', p, h);
          const exact = J(h.command) === J(PAIR);
          arm(id, v.ok === null ? null : v.ok && exact, `${v.said}; HEAD's Codex process runs ${J(h.command)} after its binary (exactly ${J(PAIR)} required)`);
        });
        continue;
      }
      const v = matrixVerdict(agent.id, p, h);
      const hidden = [...new Set([...(p.envHidden ?? []), ...(h.envHidden ?? [])])];
      const hiddenNote =
        hidden.length === 0
          ? ''
          : `; ${hidden.join(', ')} rewrote its process title, so ps shows no environment for it and its guards were not judged (a stated limit; its install is compared before and after)`;
      const extra =
        hiddenNote +
        (agent.id === 'claude'
          ? `; the variable in HEAD's pane ${String(h.variable)}, at the parent ${String(p.variable)}`
          : agent.id === 'cursor'
            ? `; ${h.loginScreen ? 'cursor stopped at its login screen, so its main chat was not reached' : 'cursor did not show a login screen'}`
            : '');
      arm(id, v.ok, `${v.said}${extra}`);
    }
  }

  if (want('a')) {
    needRepro('(a) the wheel over a fresh Codex', () => {
      const p = P.a;
      const h = H.a;
      if (ur(p) || ur(h)) return arm('(a) the wheel over a fresh Codex', null, `parent: ${ur(p) ? why(p) : 'read'}; HEAD: ${ur(h) ? why(h) : 'read'}`);
      const parentShows = p.arrows >= 1 && p.before.composer !== p.after.composer && p.after.flags?.pane_in_mode === 0;
      if (!parentShows) return arm('(a) the wheel over a fresh Codex', null, `the parent did not show the defect: xterm sent ${String(p.arrows)} Up, composer ${J(p.before.composer)} to ${J(p.after.composer)}, in mode ${String(p.after.flags?.pane_in_mode)}`);
      const ok = h.bytes === 0 && h.after.flags?.pane_in_mode === 1 && Number(h.after.flags?.scroll_position) > 0 && h.after.top !== h.before.top && h.after.composer === h.before.composer;
      arm('(a) the wheel over a fresh Codex', ok,
        `parent: xterm sent ${String(p.arrows)} Up and the composer went from ${J(p.before.composer)} to ${J(p.after.composer)}; HEAD: xterm sent ${String(h.bytes)} bytes, in mode ${String(h.after.flags?.pane_in_mode)} at ${String(h.after.flags?.scroll_position)}, top row ${J(h.before.top)} to ${J(h.after.top)}, composer ${h.after.composer === h.before.composer ? 'unchanged' : 'CHANGED'}`);
      const command = h.command;
      return arm('(a) HEAD creates Codex with exactly the pair', J(command) === J(PAIR), `the Codex process runs ${J(command)} after its binary`);
    });
  }

  if (want('b')) {
    needRepro('(b) the wheel over an open approval', () => {
      const p = P.b;
      const h = H.b;
      if (ur(p) || ur(h)) return arm('(b) the wheel over an open approval', null, `parent: ${ur(p) ? why(p) : 'read'}; HEAD: ${ur(h) ? why(h) : 'read'}`);
      const moved = p.perNotch.some((n) => n.selected !== null && n.selected !== 1);
      if (p.opened !== 1 || !moved) return arm('(b) the wheel over an open approval', null, `the parent did not show the hazard: opened on ${String(p.opened)}, per notch ${J(p.perNotch.map((n) => n.selected))}`);
      const ok = h.opened === 1 && h.perNotch.every((n) => n.selected === 1) && h.sent === J('') && h.flags?.pane_in_mode === 1;
      return arm('(b) the wheel over an open approval', ok,
        `parent: the highlighted answer went ${J(p.perNotch.map((n) => n.selected))} from 1 (never pressed; declined with Esc); HEAD: ${J(h.perNotch.map((n) => n.selected))}, xterm sent ${h.sent}, in mode ${String(h.flags?.pane_in_mode)}`);
    });
  }

  if (want('c')) {
    const h = H.a?.c;
    if (h === undefined) arm('(c) Ctrl+T, the wheel and q', null, 'HEAD has no reading');
    else {
      const ok = h.during.alternate_on === 1 && h.before.history === h.during.history && h.during.history === h.after.history && h.after.composer === h.before.composer;
      arm('(c) Ctrl+T, the wheel and q', ok,
        `HEAD: the pager ${h.during.alternate_on === 1 ? 'on' : 'NOT on'} the alternate screen, history ${String(h.before.history)} / ${String(h.during.history)} / ${String(h.after.history)}, composer ${h.after.composer === h.before.composer ? 'unchanged' : 'CHANGED'}; parent recorded: ${J(P.a?.c ?? null)}`);
    }
  }

  if (want('d')) {
    const p = P.d;
    const pass = H['pass-d'];
    const h = H.d;
    if (ur(p) || ur(pass) || ur(h)) arm('(d) a pre-phase --yolo Codex brought across', null, `parent: ${ur(p) ? why(p) : 'read'}; pass: ${ur(pass) ? why(pass) : 'read'}; HEAD: ${ur(h) ? why(h) : 'read'}`);
    else if ((h.env ?? []).length > 0) arm('(d) a pre-phase --yolo Codex brought across', null, `the restored pane's environment: ${h.env.join('; ')}`);
    else {
      const before = report.readings.between.d?.before?.resume_argv ?? p.resumeArgv;
      const id = before?.[2];
      const expected = Array.isArray(before) ? [before[0], 'resume', id, ...PAIR, '--yolo'] : null;
      const rewrote = pairInsertedOnce(before, pass.resume_argv) && J(pass.resume_argv) === J(expected);
      const armedRight = J(h.command) === J(['resume', id, ...PAIR, '--yolo']);
      const inline = h.flags?.alternate_on === 0 && h.bytes === 0 && h.after.flags?.pane_in_mode === 1 && Number(h.after.flags?.scroll_position) > 0;
      arm('(d) a pre-phase --yolo Codex brought across', rewrote && armedRight && inline && h.yolo,
        `the parent recorded ${J(before)}; after HEAD's boot the row reads ${J(pass.resume_argv)} (the pair inserted once required); the restored process runs ${J(h.command)}; alternate_on ${String(h.flags?.alternate_on)}, YOLO mode ${h.yolo ? 'shown' : 'NOT shown'}, the wheel sent ${String(h.bytes)} bytes and parked at ${String(h.after.flags?.scroll_position)}`);
    }
  }

  if (want('e')) {
    const h = H.e;
    if (ur(h)) arm('(e) Restart keeps --yolo', null, why(h));
    else {
      const ok = Array.isArray(h.argv) && String(h.argv[0]).startsWith('/') && basename(String(h.argv[0])) === 'codex' && J(h.argv.slice(1)) === J([...PAIR, '--yolo']) && h.flags?.alternate_on === 0;
      arm('(e) Restart keeps --yolo', ok, `the replacement records ${J(h.argv)} (an absolute codex, then ${J([...PAIR, '--yolo'])} required) and reads alternate_on ${String(h.flags?.alternate_on)}`);
    }
  }

  if (want('f')) {
    const h = H.f;
    if (ur(h)) arm("(f) the person's own -c tui.fullscreen_transcript=true wins", null, why(h));
    else arm("(f) the person's own -c tui.fullscreen_transcript=true wins", h.flags?.alternate_on === 1 && h.arrows >= 1,
      `recorded ${J(h.argv)}; alternate_on ${String(h.flags?.alternate_on)}, and the wheel over it sent ${String(h.arrows)} Up (the stated limit behind the no-preset default)`);
  }

  if (want('g')) {
    needRepro('(g) a captured Codex brought across', () => {
      const p = P.g;
      const h = H.g;
      const pass = H['pass-g'];
      if (ur(p) || ur(h) || ur(pass)) return arm('(g) a captured Codex brought across', null, `parent: ${ur(p) ? why(p) : 'read'}; pass: ${ur(pass) ? why(pass) : 'read'}; HEAD: ${ur(h) ? why(h) : 'read'}`);
      if (!(p.arrows >= 1)) return arm('(g) a captured Codex brought across', null, `the parent's captured Codex did not show the defect (xterm sent ${String(p.arrows)} Up)`);
      const inner = wrappedInner(pass.resume_argv);
      const ok = innerCarriesPair(inner) && h.capture !== null && h.flags?.alternate_on === 0 && h.bytes === 0 && h.after.flags?.pane_in_mode === 1;
      return arm('(g) a captured Codex brought across', ok,
        `specstory's -c string after the pass: ${J(inner)} (the pair once required); the capture indicator ${h.capture === null ? 'GONE' : 'holds'}; alternate_on ${String(h.flags?.alternate_on)}; the wheel sent ${String(h.bytes)} bytes, in mode ${String(h.after.flags?.pane_in_mode)}`);
    });
    const c = H.gCreate;
    if (ur(c)) arm('(g) a captured Codex created at HEAD', null, why(c));
    else arm('(g) a captured Codex created at HEAD', innerCarriesPair(wrappedInner(c.argv)) && c.flags?.alternate_on === 0, `specstory's -c string ${J(wrappedInner(c.argv))}; alternate_on ${String(c.flags?.alternate_on)}`);
  }

  if (want('h')) {
    const p = P.h;
    const h = H.h;
    if (ur(p) || ur(h)) arm('(h) the controls', null, `parent: ${ur(p) ? why(p) : 'read'}; HEAD: ${ur(h) ? why(h) : 'read'}`);
    else {
      const parentRight = p.shell.sent === J('') && p.shell.inMode === 1 && arrowsUp(JSON.parse(p.vim.sent)) >= 1 && sgrWheel(JSON.parse(p.standIn.sent)) >= 1;
      if (!parentRight) arm('(h) the controls', null, `the parent's controls did not read as Tortie's router routes them: ${J({ shell: p.shell, vim: p.vim, standIn: p.standIn })}`);
      else {
        const same = p.shell.sent === h.shell.sent && p.vim.sent === h.vim.sent && p.standIn.sent === h.standIn.sent;
        arm('(h) the controls', same && h.shell.inMode === 1,
          `what xterm sent, parent then HEAD: shell ${p.shell.sent} / ${h.shell.sent}; vim ${p.vim.sent} / ${h.vim.sent}; the SGR stand-in ${p.standIn.sent} / ${h.standIn.sent} (byte for byte the same required)`);
      }
    }
  }

  if (want('i')) {
    needRepro('(i) a new folder\'s trust question', () => {
      const p = P.i;
      const h = H.i;
      if (ur(p) || ur(h)) return arm("(i) a new folder's trust question", null, `parent: ${ur(p) ? why(p) : 'read'}; HEAD: ${ur(h) ? why(h) : 'read'}`);
      if (!(p.flags?.alternate_on === 1 && p.flags?.mouse_any_flag === 0)) return arm("(i) a new folder's trust question", null, `the parent's question was not on the alternate screen with no mouse (${J(p.flags)})`);
      return arm("(i) a new folder's trust question", h.flags?.alternate_on === 0,
        `parent ${J(p.question)} alternate_on 1, mouse 0; HEAD ${J(h.question)} alternate_on ${String(h.flags?.alternate_on)} (0 required); nothing was pressed at either`);
    });
  }

  if (want('j')) {
    const p = P.j;
    const h = H.j;
    const pass = H['pass-j'];
    if (ur(p) || ur(h) || ur(pass)) arm('(j) a Claude resumed inline with its transcript', null, `parent: ${ur(p) ? why(p) : 'read'}; pass: ${ur(pass) ? why(pass) : 'read'}; HEAD: ${ur(h) ? why(h) : 'read'}`);
    else if ([...(p.env ?? []), ...(h.env ?? [])].length > 0) arm('(j) a Claude resumed inline with its transcript', null, `a resumed pane's environment: ${[...new Set([...(p.env ?? []), ...(h.env ?? [])])].join('; ')}`);
    else if (!(p.flags?.alternate_on === 1 && p.flags?.history_size === 0)) arm('(j) a Claude resumed inline with its transcript', null, `the parent's resumed Claude was not full-screen with no history (${J(p.flags)})`);
    else if (!h.line001 && !(h.grewTo > h.planted)) arm('(j) a Claude resumed inline with its transcript', null, 'line 001 is absent at HEAD and Claude never wrote to the planted file, so the plant did not take');
    else {
      const ok = pass.variable === 'set to "1"' && h.flags?.alternate_on === 0 && h.flags?.mouse_any_flag === 0 && h.line001;
      arm('(j) a Claude resumed inline with its transcript', ok,
        `the row's env after HEAD's boot: ${pass.variable}; the resumed pane ${h.variable}, alternate_on ${String(h.flags?.alternate_on)}, mouse ${String(h.flags?.mouse_any_flag)}, the last 1000 lines ${h.line001 ? 'hold' : 'do NOT hold'} line 001 (the parent: alternate_on 1, history 0)`);
    }
  }

  if (want('k')) {
    const hc = H.j?.k;
    const hd = H.d;
    if (hc === undefined || ur(hd)) arm('(k) the wheel and the history surfaces', null, `Claude: ${hc === undefined ? 'no reading' : 'read'}; Codex: ${ur(hd) ? why(hd) : 'read'}`);
    else {
      const claudeOk = hc.sent === J('') && hc.flags?.pane_in_mode === 1 && hc.thumb !== null && hc.captureHoldsLine001;
      const codexOk = hd.bytes === 0 && hd.after.flags?.pane_in_mode === 1 && hd.thumb !== null && hd.captureHoldsReply;
      arm('(k) the wheel and the history surfaces', claudeOk && codexOk,
        `Claude: xterm sent ${hc.sent}, in mode ${String(hc.flags?.pane_in_mode)}, thumb ${String(hc.thumb)} px, the app's capture of the last 1000 lines ${hc.captureHoldsLine001 ? 'holds' : 'does NOT hold'} line 001; Codex: ${String(hd.bytes)} bytes, in mode ${String(hd.after.flags?.pane_in_mode)}, thumb ${String(hd.thumb)} px, the capture ${hd.captureHoldsReply ? 'holds' : 'does NOT hold'} the reply from before the reboot`);
    }
  }

  if (want('l')) {
    for (const key of ['codex', 'claude']) {
      const r = H.l?.[key];
      const id = `(l) a parked reader across a resize and a return, ${key}`;
      if (ur(r)) {
        arm(id, null, why(r));
        continue;
      }
      const last = r.samples[r.samples.length - 1];
      const held = last?.inMode === 1 && last?.top === r.top0 && r.back.inMode === 1 && r.back.top === r.top0;
      arm(id, held,
        `the resize ${String(r.secondsAfterAttach)} s after the attach; top row ${J(r.top0)} to ${J(last?.top)} (in mode ${String(last?.inMode)}), ${String(r.clearsAtResize)} CSI 3J in the stream across it, xterm sent ${r.sentAtResize}; after the return ${J(r.back.top)} (in mode ${String(r.back.inMode)})${held ? '' : ': the reader MOVED, recorded as found'}`);
    }
  }

  if (want('m')) {
    const p = P.j;
    const hint = [H.m?.matrixClaude, H.m?.restoredClaude];
    if (hint.every((x) => x === null || x === undefined)) arm('(m) the tmux hint', null, 'HEAD read no Claude screen');
    else arm('(m) the tmux hint', hint.every((x) => x !== true),
      `the parent's full-screen Claude ${p?.hint === true ? `printed ${J(p.hintLine)}` : 'printed no tmux hint in this run'}; HEAD's Claude screens ${hint.some((x) => x === true) ? 'HOLD it' : 'do not hold it'}`);
  }

  if (want('n')) {
    const h = H.n;
    if (ur(h)) arm('(n) Settings refuses the variable on both lists', null, why(h));
    else {
      const ok = !h.sharedKept && !h.claudeKept && h.sentences?.shared === SENTENCE_SHARED && h.sentences?.claude === SENTENCE_CLAUDE;
      arm('(n) Settings refuses the variable on both lists', ok,
        `HEAD kept it on the shared list ${String(h.sharedKept)} and on Claude's ${String(h.claudeKept)} (the parent: ${String(P.n?.sharedKept)} and ${String(P.n?.claudeKept)}); shared says ${J(h.sentences?.shared)}; Claude's says ${J(h.sentences?.claude)}`);
    }
  }

  if (want('o')) {
    const h = H.o;
    if (HOOKS) arm('(o) a running Claude keeps its view', null, "Tortie's Claude hooks were on (P331_HOOKS=1), so the parent's teardown ended every Claude the parent made");
    else if (ur(h) || !h.alive) arm('(o) a running Claude keeps its view', null, ur(h) ? why(h) : "the parent's Claude was not running at HEAD");
    else arm('(o) a running Claude keeps its view', h.flags?.alternate_on === 1 && h.rowVariable === 'set to "1"',
      `the Claude the parent started still reads alternate_on ${String(h.flags?.alternate_on)} at HEAD while its row's env reads ${h.rowVariable}: its next restore is inline (the stated limit, measured)`);
  }

  // The installs: an agent that moved during the run makes the comparison unsound.
  const moved = Object.entries(report.preconditions.installsAfter ?? {}).filter(([id, after]) => {
    const before = installsBefore[id];
    return before !== null && before !== undefined && (after === null || after.real !== before.real || after.mtimeMs !== before.mtimeMs);
  }).map(([id]) => id);
  arm('every agent install is where it was', moved.length === 0 ? true : null,
    moved.length === 0 ? `${String(Object.keys(installsBefore).length)} installs, realpath and mtime unmoved` : `${moved.join(', ')} moved during the run, so a reading may come from another version`);
}

if (report.readings.processes !== undefined) {
  arm('no process of this run is left', report.readings.processes.left === 0,
    `${String(report.readings.processes.seen)} seen under this run's panes, ${String(report.readings.processes.asked)} still up at the end were ended by pid (${String(report.readings.processes.killed)} needed SIGKILL), ${String(report.readings.processes.left)} left`);
}
if (ranHead) grade();
else if (report.arms.every((a) => a.ok !== false)) arm('HEAD', null, 'the run did not reach HEAD');

// ---- Electrons, counted once, at the end -----------------------------------
{
  const ps = spawnSync('ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' });
  const lines = (ps.stdout ?? '').split('\n').filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l));
  const mine = lines.filter((l) => {
    const [pid, ppid] = l.trim().split(/\s+/).map(Number);
    if (shimPids.some((s) => s > 0 && (pid === s || ppid === s))) return true;
    return commandOf(pid).includes(PROFILE);
  });
  report.readings.electron = { lines: lines.length, ofThisRun: mine.length };
  arm('no Electron of this run is left', mine.length === 0, `${String(lines.length)} Electron line(s) on the machine (the operator's own Tortie included), ${String(mine.length)} of this run`);
  if (report.readings.socket !== undefined) {
    arm('the scratch socket file is gone', report.readings.socket.left === false, `the socket file ${report.readings.socket.existedAfterTeardown ? 'was still there after the teardown and was unlinked here' : 'was already gone'}`);
  }
}
say(`model turns spent: ${String(report.turns)}; tokens: ${String(report.tokens)} (Codex answered by the local mock, ${String(report.mock.requests ?? 0)} request(s); Claude's key is fake)`);

try {
  mkdirSync(HARNESS, { recursive: true });
  writeFileSync(join(HARNESS, 'probe-p331.json'), `${J(report, null, 1)}\n`);
  // BESIDE the scratch directory, never in this checkout: electron-builder
  // packs `out/**`, and the first build of this probe wrote there.
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  copyFileSync(join(HARNESS, 'probe-p331.json'), REPORT_PATH);
  say(`wrote ${REPORT_PATH}`);
} catch (err) {
  say(`could not write the report: ${String(err?.message ?? err)}`);
}
if (!KEEP) rmSync(RUN, { recursive: true, force: true });
else say(`KEPT ${RUN}: the pane streams under harness/raw and the report`);

if (failures > 0) {
  say(`probe:p331 FAILED ${String(failures)} arm(s)${unreadable > 0 ? ` and could not READ ${String(unreadable)}` : ''}`);
  process.exit(1);
}
if (unreadable > 0) {
  say(`probe:p331 could not READ ${String(unreadable)} arm(s); that is not a pass`);
  process.exit(2);
}
say('probe:p331 OK');
process.exit(0);
